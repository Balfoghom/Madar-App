// Journey models are fitted offline by ml/train-journey-models.mjs and loaded as saved artifacts.
import modelArtifact from "../data/journey-models.json" with { type: "json" };

const MODELS = modelArtifact;
export const modeledJourneys = Object.keys(MODELS);
export const journeyModelMetadata = modeledJourneys.map((journey) => {
  const model = MODELS[journey];
  return {
    journey,
    version: model.version,
    algorithm: model.algorithm,
    syntheticOnly: model.syntheticOnly,
    trainingCases: model.trainCount,
    calibrationCases: model.calibrationCount,
    treeCount: model.trees.length,
    threshold: model.threshold,
    evaluation: model.evaluation,
  };
});

function pathCorrection(size) {
  if (size <= 1) return 0;
  if (size === 2) return 1;
  return 2 * (Math.log(size - 1) + 0.5772156649015329) - (2 * (size - 1)) / size;
}

function pathLength(tree, vector, depth = 0) {
  if (tree.size !== undefined) return depth + pathCorrection(tree.size);
  return pathLength(
    vector[tree.feature] < tree.threshold ? tree.left : tree.right,
    vector,
    depth + 1,
  );
}

export function assessJourney(item) {
  const model = MODELS[item?.journey];
  if (!model) throw new Error("No synthetic journey model is configured.");
  const f = item.features || {};
  const isBenefit = item.journey === "Benefit Payments";
  const isEmployerRegistration = item.journey === "Employer Registration";
  const isRetirement = item.journey === "Retirement";
  const isMaternity = item.journey === "Maternity Benefit";
  const isContribution = item.journey === "Contribution & Wage";
  const jf = item.journeyFeatures || {};
  const values = isBenefit
    ? [
        jf.requests30d,
        jf.amountDeviationPct,
        jf.payoutAccountChangeDays,
        jf.duplicatePayments,
        jf.sharedBeneficiaries,
      ]
    : isEmployerRegistration
      ? [
          jf.amendments30d,
          jf.companyAgeAtChangeDays,
          jf.linkedContactEmployers,
          jf.workforceChangePct,
          jf.backdatedChanges90d,
          jf.sourceConflicts,
        ]
      : isRetirement
        ? [jf.contributionMonths, jf.gapMonths, jf.wageChangePct, jf.retroCorrections12m, jf.overlapPeriods, jf.overlapMonths]
        : isMaternity
          ? [jf.contributionMonthsInWindow, jf.daysEventToRequest, jf.wageChangePct, jf.employerTenureDays, jf.concurrentClaims, jf.retroCorrections12m]
          : isContribution
            ? [jf.materialWageChangeWorkersPct, jf.medianWageChangePct, jf.payrollDelayDays, jf.resubmissions30d, jf.retroCorrections90d, jf.workersAcrossEmployers, jf.reconciliationDeviationPct]
      : [
        f.velocity,
        f.linkedEntities,
        f.priorRisk,
        f.retroDays,
        f.identityReuse,
        f.amountChangePct,
        f.overrides,
        f.crossSourceConflict ? 1 : 0,
      ];
  const invalidBenefitValues = isBenefit && (
    !Number.isInteger(jf.requests30d) || jf.requests30d < 0 || jf.requests30d > 100 ||
    jf.amountDeviationPct < -100 || jf.amountDeviationPct > 1000 ||
    !Number.isInteger(jf.payoutAccountChangeDays) || jf.payoutAccountChangeDays < 0 || jf.payoutAccountChangeDays > 3650 ||
    !Number.isInteger(jf.duplicatePayments) || jf.duplicatePayments < 0 || jf.duplicatePayments > 100 ||
    !Number.isInteger(jf.sharedBeneficiaries) || jf.sharedBeneficiaries < 1 || jf.sharedBeneficiaries > 100
  );
  const invalidEmployerValues = isEmployerRegistration && (
    !Number.isInteger(jf.amendments30d) || jf.amendments30d < 0 || jf.amendments30d > 100 ||
    !Number.isInteger(jf.companyAgeAtChangeDays) || jf.companyAgeAtChangeDays < 0 || jf.companyAgeAtChangeDays > 36500 ||
    !Number.isInteger(jf.linkedContactEmployers) || jf.linkedContactEmployers < 1 || jf.linkedContactEmployers > 100 ||
    jf.workforceChangePct < -100 || jf.workforceChangePct > 1000 ||
    !Number.isInteger(jf.backdatedChanges90d) || jf.backdatedChanges90d < 0 || jf.backdatedChanges90d > 100 ||
    !Number.isInteger(jf.sourceConflicts) || jf.sourceConflicts < 0 || jf.sourceConflicts > 100
  );
  const invalidRetirementValues = isRetirement && (
    !Number.isInteger(jf.contributionMonths) || jf.contributionMonths < 0 || jf.contributionMonths > 720 ||
    !Number.isInteger(jf.gapMonths) || jf.gapMonths < 0 || jf.gapMonths > 120 ||
    jf.wageChangePct < -100 || jf.wageChangePct > 1000 ||
    !Number.isInteger(jf.retroCorrections12m) || jf.retroCorrections12m < 0 || jf.retroCorrections12m > 100 ||
    !Number.isInteger(jf.overlapPeriods) || jf.overlapPeriods < 0 || jf.overlapPeriods > 100 ||
    !Number.isInteger(jf.overlapMonths) || jf.overlapMonths < 0 || jf.overlapMonths > 120
  );
  const invalidMaternityValues = isMaternity && (
    !Number.isInteger(jf.contributionMonthsInWindow) || jf.contributionMonthsInWindow < 0 || jf.contributionMonthsInWindow > 36 ||
    !Number.isInteger(jf.daysEventToRequest) || jf.daysEventToRequest < 0 || jf.daysEventToRequest > 365 ||
    jf.wageChangePct < -100 || jf.wageChangePct > 1000 ||
    !Number.isInteger(jf.employerTenureDays) || jf.employerTenureDays < 0 || jf.employerTenureDays > 36500 ||
    !Number.isInteger(jf.concurrentClaims) || jf.concurrentClaims < 0 || jf.concurrentClaims > 100 ||
    !Number.isInteger(jf.retroCorrections12m) || jf.retroCorrections12m < 0 || jf.retroCorrections12m > 100
  );
  const invalidContributionValues = isContribution && (
    jf.materialWageChangeWorkersPct < 0 || jf.materialWageChangeWorkersPct > 100 ||
    jf.medianWageChangePct < -100 || jf.medianWageChangePct > 1000 ||
    !Number.isInteger(jf.payrollDelayDays) || jf.payrollDelayDays < 0 || jf.payrollDelayDays > 365 ||
    !Number.isInteger(jf.resubmissions30d) || jf.resubmissions30d < 0 || jf.resubmissions30d > 100 ||
    !Number.isInteger(jf.retroCorrections90d) || jf.retroCorrections90d < 0 || jf.retroCorrections90d > 100 ||
    !Number.isInteger(jf.workersAcrossEmployers) || jf.workersAcrossEmployers < 0 || jf.workersAcrossEmployers > 100000 ||
    jf.reconciliationDeviationPct < -100 || jf.reconciliationDeviationPct > 1000
  );
  if (f.missingData || invalidBenefitValues || invalidEmployerValues || invalidRetirementValues || invalidMaternityValues || invalidContributionValues || values.some((value) => !Number.isFinite(value))) {
    return {
      complete: false,
      journey: item.journey,
      modelVersion: model.version,
      syntheticOnly: true,
      route: "Complete evidence",
      reasons: ["Required evidence is missing. No model score was produced."],
      features: [],
    };
  }
  const score =
    2 **
    (-model.trees.reduce(
      (sum, tree) => sum + pathLength(tree, values),
      0,
    ) /
      model.trees.length /
      model.normalizer);
  const percentile =
    (100 * model.calibrationScores.filter((value) => value <= score).length) /
    model.calibrationScores.length;
  const modelFlagged = score >= model.threshold;
  const features = values.map((value, index) => ({
    name: model.featureNames[index],
    value,
    ...model.reference[index],
    unusual: value < model.reference[index].low || value > model.reference[index].high,
  }));
  const unusual = features.filter((feature) => feature.unusual);
  return {
    complete: true,
    journey: item.journey,
    modelVersion: model.version,
    algorithm: model.algorithm,
    syntheticOnly: true,
    validation: model.validation,
    score,
    percentile,
    anomalyScore: Math.round(percentile),
    modelFlagged,
    threshold: model.threshold,
    route: modelFlagged ? "Specialist review" : "Standard review",
    reasons: [
      modelFlagged
        ? "The synthetic reference model finds this combination unusual; specialist review is suggested."
        : "The synthetic reference model did not flag this combination at its provisional threshold.",
      ...unusual.slice(0, 3).map((feature) => `${feature.name} is outside the synthetic reference range.`),
    ],
    explanationBoundary:
      "This experimental model uses generated reference data. It does not estimate fraud probability or provide causal explanations.",
    features,
  };
}
