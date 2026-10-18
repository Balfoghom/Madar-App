// Synthetic-only journey anomaly models. These are demo reference models,
// trained on generated normal-like inputs and are not business validated.
const PROFILES = {
  "Benefit Payments": [
    [0, 2], [-15, 15], [30, 730], [0, 1], [1, 2],
  ],
  "Employer Registration": [
    [0, 3], [90, 3650], [1, 2], [-10, 10], [0, 1], [0, 1],
  ],
  Retirement: [
    [60, 360], [0, 6], [-10, 10], [0, 1], [0, 1], [0, 2],
  ],
  "Maternity Benefit": [
    [3, 12], [0, 15], [-10, 10], [90, 3650], [0, 1], [0, 1],
  ],
  "Contribution & Wage": [
    [0, 10], [-10, 10], [0, 5], [0, 1], [0, 2], [0, 1], [-1, 1],
  ],
};

const FEATURE_NAMES = [
  "Events in assessment window",
  "Linked entities",
  "Prior risk score",
  "Retroactive days",
  "Identifier reuse count",
  "Amount / salary change (%)",
  "Rule overrides",
  "Cross-source conflict",
];
const BENEFIT_FEATURE_NAMES = [
  "Benefit requests/payments in 30 days",
  "Benefit amount deviation from recent history (%)",
  "Days since payout account change",
  "Duplicate or similar payments",
  "Beneficiaries sharing payout account",
];
const EMPLOYER_FEATURE_NAMES = [
  "Material registry amendments in 30 days",
  "Company age at material change (days)",
  "Employers linked through a contact reference",
  "Workforce change (%)",
  "Backdated changes in 90 days",
  "Conflicting source fields",
];
const RETIREMENT_FEATURE_NAMES = [
  "Verified contribution months",
  "Contribution gap months",
  "Wage change before retirement request (%)",
  "Retroactive contribution corrections in 12 months",
  "Overlapping employment periods",
  "Overlapping months across employment records",
];
const MATERNITY_FEATURE_NAMES = [
  "Contribution months in eligibility window",
  "Days from eligible event to request",
  "Wage change before eligible event (%)",
  "Employer tenure at eligible event (days)",
  "Concurrent similar benefit claims",
  "Retroactive contribution corrections in 12 months",
];
const CONTRIBUTION_FEATURE_NAMES = [
  "Workers with material wage changes (%)",
  "Median wage change (%)",
  "Payroll file delay (days)",
  "Payroll resubmissions in 30 days",
  "Retroactive corrections in 90 days",
  "Workers linked across employers",
  "Source total reconciliation deviation (%)",
];
const TRAIN_SIZE = 1024;
const CALIBRATION_SIZE = 1000;
const TREE_COUNT = 80;
const SAMPLE_SIZE = 128;

function rng(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function syntheticRow(profile, random, discreteIndices = []) {
  return profile.map(([min, max], index) => {
    if (max === min) return min;
    if (index === 7) return random() < max ? 1 : 0;
    if (discreteIndices.includes(index)) {
      return Math.floor(min + random() * (max - min + 1));
    }
    return min + random() * (max - min);
  });
}

function pathCorrection(size) {
  if (size <= 1) return 0;
  if (size === 2) return 1;
  return 2 * (Math.log(size - 1) + 0.5772156649015329) - (2 * (size - 1)) / size;
}

function buildTree(rows, random, depth = 0) {
  if (rows.length <= 1 || depth >= 12) return { size: rows.length };
  const dimensions = rows[0].length;
  const candidates = Array.from({ length: dimensions }, (_, index) => index).filter(
    (index) => {
      let min = Infinity;
      let max = -Infinity;
      for (const row of rows) {
        min = Math.min(min, row[index]);
        max = Math.max(max, row[index]);
      }
      return max > min;
    },
  );
  if (!candidates.length) return { size: rows.length };

  const feature = candidates[Math.floor(random() * candidates.length)];
  const values = rows.map((row) => row[feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const threshold = min + random() * (max - min);
  const leftRows = [];
  const rightRows = [];
  for (const row of rows) (row[feature] < threshold ? leftRows : rightRows).push(row);
  if (!leftRows.length || !rightRows.length) return { size: rows.length };
  return {
    feature,
    threshold,
    left: buildTree(leftRows, random, depth + 1),
    right: buildTree(rightRows, random, depth + 1),
  };
}

function pathLength(tree, vector, depth = 0) {
  if (tree.size !== undefined) return depth + pathCorrection(tree.size);
  return pathLength(
    vector[tree.feature] < tree.threshold ? tree.left : tree.right,
    vector,
    depth + 1,
  );
}

function scoreVector(model, vector) {
  return 2 **
    (-model.trees.reduce((sum, tree) => sum + pathLength(tree, vector), 0) /
      model.trees.length /
      model.normalizer);
}

function evaluateModel(model, profile, seed, discreteIndices) {
  const random = rng(seed ^ 0x5f3759df);
  const normalCount = 400;
  const unusualCount = 400;
  const rows = [];
  for (let i = 0; i < normalCount; i += 1) {
    rows.push({ vector: syntheticRow(profile, random, discreteIndices), expectedUnusual: false });
  }
  for (let i = 0; i < unusualCount; i += 1) {
    const vector = syntheticRow(profile, random, discreteIndices);
    const changes = 1 + Math.floor(random() * Math.min(3, profile.length));
    const selected = new Set();
    while (selected.size < changes) selected.add(Math.floor(random() * profile.length));
    for (const index of selected) {
      const [min, max] = profile[index];
      vector[index] = random() < 0.5 ? min : max;
      if (discreteIndices.includes(index)) vector[index] = Math.round(vector[index]);
    }
    rows.push({ vector, expectedUnusual: true });
  }
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;
  for (const row of rows) {
    const flagged = scoreVector(model, row.vector) >= model.threshold;
    if (row.expectedUnusual && flagged) truePositive += 1;
    else if (row.expectedUnusual) falseNegative += 1;
    else if (flagged) falsePositive += 1;
    else trueNegative += 1;
  }
  return {
    source: "Generated synthetic holdout scenarios; not business-validated",
    testCount: rows.length,
    expectedUnusualCount: unusualCount,
    truePositive,
    falsePositive,
    falseNegative,
    trueNegative,
    precision: truePositive / Math.max(1, truePositive + falsePositive),
    recall: truePositive / Math.max(1, truePositive + falseNegative),
    falsePositiveRate: falsePositive / Math.max(1, falsePositive + trueNegative),
  };
}

function buildModel(journey, profile, seed, featureNames = FEATURE_NAMES, discreteIndices = []) {
  const random = rng(seed);
  const training = Array.from({ length: TRAIN_SIZE }, () => syntheticRow(profile, random, discreteIndices));
  const calibration = Array.from({ length: CALIBRATION_SIZE }, () => syntheticRow(profile, random, discreteIndices));
  const trees = Array.from({ length: TREE_COUNT }, () => {
    const sample = [];
    for (let index = 0; index < SAMPLE_SIZE; index += 1) {
      sample.push(training[Math.floor(random() * training.length)]);
    }
    return buildTree(sample, random);
  });
  const normalizer = pathCorrection(SAMPLE_SIZE);
  const score = (vector) =>
    2 **
    (-trees.reduce((sum, tree) => sum + pathLength(tree, vector), 0) /
      trees.length /
      normalizer);
  const calibrationScores = calibration.map(score).sort((a, b) => a - b);
  const quantile = (values, q) => values[Math.floor((values.length - 1) * q)];
  const threshold = quantile(calibrationScores, 0.97);
  const columns = featureNames.map((_, index) =>
    training.map((row) => row[index]).sort((a, b) => a - b),
  );
  const model = {
    journey,
    featureNames,
    version: "synthetic-if-20261017-v4",
    algorithm: "Isolation Forest",
    syntheticOnly: true,
    trainingSource: "Fixed-seed generated normal-like feature vectors",
    thresholdMethod: "97th percentile of a separate generated synthetic calibration set",
    seed,
    validation: "Generated reference data only; business validation pending",
    trainCount: TRAIN_SIZE,
    calibrationCount: CALIBRATION_SIZE,
    trees,
    normalizer,
    calibrationScores,
    threshold,
    reference: columns.map((values) => ({
      median: quantile(values, 0.5),
      low: quantile(values, 0.05),
      high: quantile(values, 0.95),
    })),
  };
  model.evaluation = evaluateModel(model, profile, seed, discreteIndices);
  return model;
}

export const MODELS = Object.fromEntries(
  Object.entries(PROFILES).map(([journey, profile], index) => [
    journey,
    journey === "Benefit Payments"
      ? buildModel(journey, profile, 20261017 + index * 997, BENEFIT_FEATURE_NAMES, [0, 2, 3, 4])
      : journey === "Employer Registration"
        ? buildModel(journey, profile, 20261017 + index * 997, EMPLOYER_FEATURE_NAMES, [0, 1, 2, 4, 5])
        : journey === "Retirement"
          ? buildModel(journey, profile, 20261017 + index * 997, RETIREMENT_FEATURE_NAMES, [0, 1, 3, 4, 5])
          : journey === "Maternity Benefit"
            ? buildModel(journey, profile, 20261017 + index * 997, MATERNITY_FEATURE_NAMES, [0, 1, 3, 4, 5])
            : journey === "Contribution & Wage"
              ? buildModel(journey, profile, 20261017 + index * 997, CONTRIBUTION_FEATURE_NAMES, [2, 3, 4, 5])
              : buildModel(journey, profile, 20261017 + index * 997),
  ]),
);

export const modeledJourneys = Object.keys(MODELS);

