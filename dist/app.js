let scenarioProposals = [];
let scenarioReviewRequest = null;
const JOURNEYS = [
  "SANED",
  "Benefit Payments",
  "Employer Registration",
  "Retirement",
  "Maternity Benefit",
  "Contribution & Wage",
];

const REGIONS = [
  "Riyadh",
  "Makkah",
  "Eastern Province",
  "Madinah",
  "Qassim",
  "Asir",
  "Jazan",
  "Tabuk",
  "Hail",
  "Northern Borders",
  "Al Jawf",
  "Najran",
  "Al Baha",
];

const REGION_GEO = {
  Riyadh: [46.6753, 24.7136],
  Makkah: [39.8579, 21.3891],
  "Eastern Province": [50.0888, 26.4207],
  Madinah: [39.5692, 24.5247],
  Qassim: [43.975, 26.3592],
  Asir: [42.5053, 18.2164],
  Jazan: [42.551, 16.8892],
  Tabuk: [36.566, 28.3998],
  Hail: [41.69, 27.51],
  "Northern Borders": [41.038, 30.975],
  "Al Jawf": [40.206, 29.97],
  Najran: [44.13, 17.49],
  "Al Baha": [41.47, 20.01],
};

// Natural Earth country boundary coordinates (WGS84), projected into the SVG at render time.
const SAUDI_BOUNDARY = [
  [42.779332, 16.347891],
  [42.649573, 16.774635],
  [42.347989, 17.075806],
  [42.270888, 17.474722],
  [41.754382, 17.833046],
  [41.221391, 18.6716],
  [40.939341, 19.486485],
  [40.247652, 20.174635],
  [39.801685, 20.338862],
  [39.139399, 21.291905],
  [39.023696, 21.986875],
  [39.066329, 22.579656],
  [38.492772, 23.688451],
  [38.02386, 24.078686],
  [37.483635, 24.285495],
  [37.154818, 24.858483],
  [37.209491, 25.084542],
  [36.931627, 25.602959],
  [36.639604, 25.826228],
  [36.249137, 26.570136],
  [35.640182, 27.37652],
  [35.130187, 28.063352],
  [34.632336, 28.058546],
  [34.787779, 28.607427],
  [34.83222, 28.957483],
  [34.956037, 29.356555],
  [36.068941, 29.197495],
  [36.501214, 29.505254],
  [36.740528, 29.865283],
  [37.503582, 30.003776],
  [37.66812, 30.338665],
  [37.998849, 30.5085],
  [37.002166, 31.508413],
  [39.004886, 32.010217],
  [39.195468, 32.161009],
  [40.399994, 31.889992],
  [41.889981, 31.190009],
  [44.709499, 29.178891],
  [46.568713, 29.099025],
  [47.459822, 29.002519],
  [47.708851, 28.526063],
  [48.416094, 28.552004],
  [48.807595, 27.689628],
  [49.299554, 27.461218],
  [49.470914, 27.109999],
  [50.152422, 26.689663],
  [50.212935, 26.277027],
  [50.113303, 25.943972],
  [50.239859, 25.60805],
  [50.527387, 25.327808],
  [50.660557, 24.999896],
  [50.810108, 24.754743],
  [51.112415, 24.556331],
  [51.389608, 24.627386],
  [51.579519, 24.245497],
  [51.617708, 24.014219],
  [52.000733, 23.001154],
  [55.006803, 22.496948],
  [55.208341, 22.70833],
  [55.666659, 22.000001],
  [54.999982, 19.999994],
  [52.00001, 19.000003],
  [49.116672, 18.616668],
  [48.183344, 18.166669],
  [47.466695, 17.116682],
  [47.000005, 16.949999],
  [46.749994, 17.283338],
  [46.366659, 17.233315],
  [45.399999, 17.333335],
  [45.216651, 17.433329],
  [44.062613, 17.410359],
  [43.791519, 17.319977],
  [43.380794, 17.579987],
  [43.115798, 17.08844],
  [43.218375, 16.66689],
  [42.779332, 16.347891],
];

const DEFAULT_MODEL_CONFIG = {
  controlWeight: 55,
  anomalyWeight: 45,
  interactionMultiplier: 100,
  lowMax: 34,
  highMin: 75,
  criticalControlFloor: 80,
  featureWeights: {
    velocity: 18,
    retroDays: 12,
    linkedEntities: 14,
    priorRisk: 12,
    overrides: 8,
    identityReuse: 12,
    amountChangePct: 12,
    crossSourceConflict: 12,
  },
};

function copyModelConfig(config) {
  return {
    controlWeight: config.controlWeight,
    anomalyWeight: config.anomalyWeight,
    interactionMultiplier: config.interactionMultiplier,
    lowMax: config.lowMax,
    highMin: config.highMin,
    criticalControlFloor: config.criticalControlFloor,
    featureWeights: Object.assign({}, config.featureWeights),
  };
}

let modelConfig = copyModelConfig(DEFAULT_MODEL_CONFIG);
let draftModelConfig = copyModelConfig(DEFAULT_MODEL_CONFIG);
let simulationActive = false;
let modelReviewStatus = "Draft";

const seedDefinitions = [
  {
    journey: "SANED",
    scenario: "Repeated retroactive exclusion changes before a SANED request",
    subject: "CTR-4101",
    entity: "EMP-341",
    region: "Riyadh",
    city: "Riyadh",
    rule: 70,
    v: 8,
    l: 4,
    p: 65,
    r: 14,
    i: 2,
    a: 0,
    o: 1,
    c: 1,
    m: 0,
    u: 0,
    code: "RETRO_EXCLUSION_SEQUENCE",
    reason:
      "Repeated retroactive exclusion changes were followed by a SANED request within a short period.",
  },
  {
    journey: "SANED",
    scenario: "Employer-wide SANED request cluster",
    subject: "CTR-4188",
    entity: "EMP-778",
    region: "Eastern Province",
    city: "Dammam",
    rule: 66,
    v: 12,
    l: 15,
    p: 72,
    r: 2,
    i: 3,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "EMPLOYER_REQUEST_CLUSTER",
    reason:
      "Multiple exclusions and SANED requests are concentrated around one employer.",
  },
  {
    journey: "SANED",
    scenario: "Recent exclusion-date change before request",
    subject: "CTR-4215",
    entity: "EMP-284",
    region: "Makkah",
    city: "Jeddah",
    rule: 50,
    v: 4,
    l: 3,
    p: 30,
    r: 5,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "RECENT_EXCLUSION_CHANGE",
    reason:
      "An exclusion-date change occurred shortly before the benefit request.",
  },
  {
    journey: "SANED",
    scenario: "Stable employment history and normal request",
    subject: "CTR-4292",
    entity: "EMP-114",
    region: "Madinah",
    city: "Madinah",
    rule: 10,
    v: 1,
    l: 1,
    p: 5,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason:
      "The request sequence remains within the contributor and employer baseline.",
  },
  {
    journey: "SANED",
    scenario: "Rapid request after a conflicting external login sequence",
    subject: "CTR-4317",
    entity: "EMP-509",
    country: "Bahrain",
    region: "Outside KSA",
    city: "Manama",
    rule: 38,
    v: 4,
    l: 2,
    p: 28,
    r: 0,
    i: 2,
    a: 0,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "CROSS_BORDER_SEQUENCE_CONFLICT",
    reason:
      "A rapid login and request sequence conflicts with recent trusted activity; location alone is not treated as risk.",
  },

  {
    journey: "Benefit Payments",
    scenario: "IBAN ownership mismatch across beneficiary profiles",
    subject: "BEN-1048",
    entity: "IBAN-4421",
    region: "Riyadh",
    city: "Riyadh",
    rule: 88,
    v: 3,
    l: 3,
    p: 20,
    r: 0,
    i: 4,
    a: 0,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "IBAN_OWNER_MISMATCH",
    reason:
      "The payment IBAN is associated with a different beneficiary profile and is reused across records.",
  },
  {
    journey: "Benefit Payments",
    scenario: "Shared mobile followed by an IBAN change",
    subject: "BEN-1154",
    entity: "MOB-7782",
    region: "Makkah",
    city: "Jeddah",
    rule: 45,
    v: 2,
    l: 2,
    p: 18,
    r: 0,
    i: 3,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "SHARED_IDENTIFIER_SEQUENCE",
    reason:
      "A mobile number shared across profiles was followed by an IBAN change within 24 hours.",
  },
  {
    journey: "Benefit Payments",
    scenario: "Verified beneficiary payment",
    subject: "BEN-1231",
    entity: "IBAN-8012",
    region: "Eastern Province",
    city: "Khobar",
    rule: 8,
    v: 1,
    l: 1,
    p: 4,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason: "IBAN ownership, profile, and recent behavior are consistent.",
  },
  {
    journey: "Benefit Payments",
    scenario: "Impossible session sequence before IBAN update",
    subject: "BEN-1318",
    entity: "IBAN-2051",
    country: "United Arab Emirates",
    region: "Outside KSA",
    city: "Dubai",
    rule: 72,
    v: 5,
    l: 4,
    p: 52,
    r: 0,
    i: 2,
    a: 0,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "IMPOSSIBLE_SESSION_SEQUENCE",
    reason:
      "Two verified sessions occurred too far apart geographically within an implausibly short time before an IBAN change.",
  },
  {
    journey: "Benefit Payments",
    scenario: "Recent IBAN change before scheduled payment",
    subject: "BEN-1392",
    entity: "IBAN-9370",
    region: "Asir",
    city: "Abha",
    rule: 52,
    v: 3,
    l: 2,
    p: 24,
    r: 0,
    i: 2,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "RECENT_IBAN_CHANGE",
    reason:
      "A material payment-account change occurred shortly before disbursement.",
  },

  {
    journey: "Employer Registration",
    scenario: "Rapid registration and exclusion cluster",
    subject: "EMP-880",
    entity: "SUP-308",
    region: "Riyadh",
    city: "Riyadh",
    rule: 80,
    v: 12,
    l: 18,
    p: 78,
    r: 2,
    i: 4,
    a: 0,
    o: 1,
    c: 0,
    m: 0,
    u: 0,
    code: "RAPID_REGISTRATION_EXCLUSION",
    reason:
      "Repeated registration and exclusion activity affects many linked contributors in a short period.",
  },
  {
    journey: "Employer Registration",
    scenario: "Elevated employment churn",
    subject: "EMP-512",
    entity: "SUP-196",
    region: "Eastern Province",
    city: "Dammam",
    rule: 50,
    v: 6,
    l: 7,
    p: 35,
    r: 0,
    i: 2,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "EMPLOYMENT_CHURN",
    reason: "Registration and exclusion volume exceeds the employer baseline.",
  },
  {
    journey: "Employer Registration",
    scenario: "Normal employer activity",
    subject: "EMP-220",
    entity: "SUP-041",
    region: "Qassim",
    city: "Buraidah",
    rule: 10,
    v: 2,
    l: 3,
    p: 8,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason: "Employer events remain within the recent operating baseline.",
  },
  {
    journey: "Employer Registration",
    scenario: "Repeated exclusion changes across linked contributors",
    subject: "EMP-642",
    entity: "SUP-244",
    region: "Makkah",
    city: "Makkah",
    rule: 75,
    v: 10,
    l: 12,
    p: 60,
    r: 7,
    i: 3,
    a: 0,
    o: 2,
    c: 0,
    m: 0,
    u: 0,
    code: "COORDINATED_EXCLUSION_CHANGES",
    reason:
      "Multiple linked contributors show repeated exclusion changes and overrides within the same window.",
  },
  {
    journey: "Employer Registration",
    scenario: "Supervisor contact reused across establishments",
    subject: "EMP-719",
    entity: "SUP-775",
    region: "Madinah",
    city: "Madinah",
    rule: 42,
    v: 4,
    l: 8,
    p: 30,
    r: 0,
    i: 5,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "SHARED_SUPERVISOR_IDENTITY",
    reason:
      "The same supervisor contact is reused across several establishments with similar event patterns.",
  },

  {
    journey: "Retirement",
    scenario: "Re-employment detected through WPS",
    subject: "RET-1711",
    entity: "EMP-644",
    region: "Eastern Province",
    city: "Dhahran",
    rule: 75,
    v: 3,
    l: 2,
    p: 65,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "WPS_REEMPLOYMENT_SIGNAL",
    reason:
      "WPS payroll evidence conflicts with the current retirement payment status.",
  },
  {
    journey: "Retirement",
    scenario: "Unconfirmed WPS employment signal",
    subject: "RET-1850",
    entity: "EMP-302",
    region: "Riyadh",
    city: "Riyadh",
    rule: 50,
    v: 2,
    l: 1,
    p: 25,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 1,
    m: 1,
    u: 0,
    code: "WPS_STATUS_UNCONFIRMED",
    reason:
      "A WPS record requires verification, but the employment start date is missing.",
  },
  {
    journey: "Retirement",
    scenario: "No re-employment evidence",
    subject: "RET-1924",
    entity: "—",
    region: "Hail",
    city: "Hail",
    rule: 7,
    v: 1,
    l: 1,
    p: 5,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason: "No conflicting employment or payroll evidence was identified.",
  },
  {
    journey: "Retirement",
    scenario: "External payroll activity conflicts with retirement status",
    subject: "RET-2017",
    entity: "EMP-811",
    country: "Qatar",
    region: "Outside KSA",
    city: "Doha",
    rule: 68,
    v: 4,
    l: 3,
    p: 55,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "EXTERNAL_PAYROLL_CONFLICT",
    reason:
      "Approved payroll evidence conflicts with the retirement record; location alone is not treated as risk.",
  },
  {
    journey: "Retirement",
    scenario: "Salary event after retirement",
    subject: "RET-2099",
    entity: "EMP-432",
    region: "Tabuk",
    city: "Tabuk",
    rule: 46,
    v: 2,
    l: 2,
    p: 35,
    r: 0,
    i: 1,
    a: 0,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "POST_RETIREMENT_SALARY_EVENT",
    reason:
      "A salary event was reported after the recorded retirement date and requires eligibility verification.",
  },

  {
    journey: "Maternity Benefit",
    scenario: "Salary spike before maternity benefit request",
    subject: "BEN-2056",
    entity: "EMP-933",
    region: "Riyadh",
    city: "Riyadh",
    rule: 72,
    v: 4,
    l: 3,
    p: 40,
    r: 0,
    i: 2,
    a: 180,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "SALARY_SPIKE_BEFORE_BENEFIT",
    reason:
      "Registered salary increased materially shortly before the request.",
  },
  {
    journey: "Maternity Benefit",
    scenario: "Shared device and salary change",
    subject: "BEN-2188",
    entity: "EMP-775",
    region: "Makkah",
    city: "Jeddah",
    rule: 48,
    v: 2,
    l: 2,
    p: 22,
    r: 0,
    i: 3,
    a: 70,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "SHARED_DEVICE_SALARY_SEQUENCE",
    reason:
      "A shared device and a material salary increase occurred before the request.",
  },
  {
    journey: "Maternity Benefit",
    scenario: "Stable employment relationship",
    subject: "BEN-2291",
    entity: "EMP-119",
    region: "Eastern Province",
    city: "Dammam",
    rule: 11,
    v: 1,
    l: 1,
    p: 5,
    r: 0,
    i: 1,
    a: 5,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason:
      "Employment duration and salary history remain within the baseline.",
  },
  {
    journey: "Maternity Benefit",
    scenario: "Short employment relationship and sharp salary increase",
    subject: "BEN-2366",
    entity: "EMP-887",
    region: "Jazan",
    city: "Jazan",
    rule: 70,
    v: 7,
    l: 6,
    p: 58,
    r: 0,
    i: 2,
    a: 220,
    o: 1,
    c: 1,
    m: 0,
    u: 1,
    code: "EMPLOYMENT_RELATIONSHIP_ANOMALY",
    reason:
      "A short employment sequence, sharp salary increase, and conflicting evidence occurred before the request.",
  },
  {
    journey: "Maternity Benefit",
    scenario: "Late registration and retroactive wage update",
    subject: "BEN-2419",
    entity: "EMP-553",
    region: "Asir",
    city: "Abha",
    rule: 44,
    v: 3,
    l: 2,
    p: 30,
    r: 10,
    i: 1,
    a: 45,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "LATE_REGISTRATION_SEQUENCE",
    reason:
      "A retroactive employment update and salary change occurred shortly before the request.",
  },

  {
    journey: "Contribution & Wage",
    scenario: "Repeated salary changes across linked employees",
    subject: "EMP-330",
    entity: "PAY-118",
    region: "Riyadh",
    city: "Riyadh",
    rule: 76,
    v: 9,
    l: 10,
    p: 68,
    r: 0,
    i: 2,
    a: 250,
    o: 2,
    c: 0,
    m: 0,
    u: 0,
    code: "COORDINATED_WAGE_CHANGES",
    reason:
      "Repeated salary increases and overrides affect several linked employees in the same period.",
  },
  {
    journey: "Contribution & Wage",
    scenario: "Retroactive wage update",
    subject: "CTR-5581",
    entity: "EMP-406",
    region: "Qassim",
    city: "Buraidah",
    rule: 52,
    v: 4,
    l: 3,
    p: 40,
    r: 30,
    i: 1,
    a: 60,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "RETROACTIVE_WAGE_UPDATE",
    reason:
      "A material wage update was applied retroactively and requires verification.",
  },
  {
    journey: "Contribution & Wage",
    scenario: "Routine payroll submission",
    subject: "EMP-164",
    entity: "PAY-804",
    region: "Northern Borders",
    city: "Arar",
    rule: 9,
    v: 2,
    l: 2,
    p: 6,
    r: 0,
    i: 1,
    a: 3,
    o: 0,
    c: 0,
    m: 0,
    u: 0,
    code: "NO_MATERIAL_ANOMALY",
    reason:
      "Payroll volume and wage changes remain within the employer baseline.",
  },
  {
    journey: "Contribution & Wage",
    scenario: "External payroll submission conflicts with employer history",
    subject: "EMP-472",
    entity: "PAY-990",
    country: "Egypt",
    region: "Outside KSA",
    city: "Cairo",
    rule: 64,
    v: 5,
    l: 4,
    p: 50,
    r: 0,
    i: 3,
    a: 95,
    o: 0,
    c: 1,
    m: 0,
    u: 0,
    code: "PAYROLL_SOURCE_CONFLICT",
    reason:
      "The payroll submission conflicts with employer history and identifier relationships; location alone is not treated as risk.",
  },
  {
    journey: "Contribution & Wage",
    scenario: "Cross-source wage discrepancy",
    subject: "CTR-5904",
    entity: "EMP-287",
    region: "Al Baha",
    city: "Al Baha",
    rule: 48,
    v: 3,
    l: 3,
    p: 38,
    r: 0,
    i: 1,
    a: 55,
    o: 0,
    c: 1,
    m: 1,
    u: 0,
    code: "WAGE_SOURCE_DISCREPANCY",
    reason:
      "Wage values differ across approved sources and one supporting field is missing.",
  },
];

function shiftTrailingNumber(value, increment) {
  return String(value || "").replace(/(\d+)$/, function (number) {
    return String(Number(number) + increment);
  });
}

const enterpriseSeedDefinitions = seedDefinitions.concat(
  seedDefinitions.map(function (item, index) {
    const adjustment = [-4, 2, 5][index % 3];
    return Object.assign({}, item, {
      subject: shiftTrailingNumber(item.subject, 6000),
      entity:
        item.entity === "—" ? "—" : shiftTrailingNumber(item.entity, 4000),
      rule: Math.max(4, Math.min(96, item.rule + adjustment)),
      v: Math.max(1, item.v + (index % 2)),
      p: Math.max(0, Math.min(100, item.p + adjustment)),
      a: Math.max(0, item.a + (index % 4 === 0 ? 12 : 0)),
    });
  }),
);

const indicators = [
  {
    code: "EVENT_VELOCITY",
    name: "Rapid event velocity",
    source: "Behavioral events",
    weight: 18,
    status: "Approved",
    detail: "Unusual number of relevant events within an approved time window.",
  },
  {
    code: "RETROACTIVE_CHANGE",
    name: "Retroactive material change",
    source: "Service events",
    weight: 12,
    status: "Approved",
    detail:
      "A date, wage, or eligibility change is applied to an earlier period.",
  },
  {
    code: "ENTITY_CLUSTER",
    name: "Linked-entity concentration",
    source: "Relationship graph",
    weight: 14,
    status: "Approved",
    detail:
      "Many related subjects or entities share a concentrated event pattern.",
  },
  {
    code: "PRIOR_OUTCOME",
    name: "Prior confirmed outcome",
    source: "Outcome history",
    weight: 12,
    status: "Approved",
    detail: "Validated previous outcomes contribute to the current context.",
  },
  {
    code: "RULE_OVERRIDE",
    name: "Repeated control override",
    source: "Operational controls",
    weight: 8,
    status: "Approved",
    detail: "Multiple overrides occur within the assessment window.",
  },
  {
    code: "IDENTIFIER_REUSE",
    name: "Identifier reuse",
    source: "Profile and device",
    weight: 12,
    status: "Approved",
    detail:
      "A mobile, device, IBAN, or contact point is reused across entities.",
  },
  {
    code: "MATERIAL_CHANGE",
    name: "Material amount or salary change",
    source: "Contribution and payment",
    weight: 12,
    status: "Approved",
    detail: "A change materially exceeds the behavioral baseline.",
  },
  {
    code: "SOURCE_CONFLICT",
    name: "Conflicting information across sources",
    source: "Cross-check",
    weight: 12,
    status: "Approved",
    detail: "Approved sources provide materially inconsistent evidence.",
  },
  {
    code: "SEQUENCE_DENSITY",
    name: "Dense high-risk event sequence",
    source: "AI suggestion",
    weight: null,
    status: "Proposed",
    detail:
      "Several individually moderate events occur in an unusually compressed sequence.",
  },
  {
    code: "CROSS_JOURNEY_REUSE",
    name: "Cross-journey identifier reuse",
    source: "AI suggestion",
    weight: null,
    status: "Proposed",
    detail:
      "The same identifier appears across unrelated journeys and entities.",
  },
  {
    code: "EMPLOYER_CLUSTER_ACCELERATION",
    name: "Employer cluster acceleration",
    source: "AI suggestion",
    weight: null,
    status: "Proposed",
    detail:
      "Linked employer activity accelerates beyond its historical pattern.",
  },
  {
    code: "CONTROL_ANOMALY_DIVERGENCE",
    name: "Control and anomaly divergence",
    source: "Monitoring",
    weight: null,
    status: "Monitoring",
    detail:
      "Existing control and behavioral anomaly scores materially disagree.",
  },
];

const featureConfig = [
  { key: "velocity", weight: 18, label: "Event velocity" },
  { key: "retroDays", weight: 12, label: "Retroactive days" },
  { key: "linkedEntities", weight: 14, label: "Linked entities" },
  { key: "priorRisk", weight: 12, label: "Prior outcome risk" },
  { key: "overrides", weight: 8, label: "Rule overrides" },
  { key: "identityReuse", weight: 12, label: "Identifier reuse" },
  { key: "amountChangePct", weight: 12, label: "Amount or salary change" },
];

const SYNTHETIC_CUSTOMERS = [
  "Mohammed Alotaibi",
  "Noura Alqahtani",
  "Fahad Almutairi",
  "Sara Alharbi",
  "Abdullah Alshammari",
  "Reem Aldosari",
  "Khalid Alenezi",
  "Maha Alzahrani",
  "Saad Alghamdi",
  "Lama Alsubaie",
  "Turki Alrasheed",
  "Hessa Albalawi",
  "Omar Aljuhani",
  "Abeer Alasmari",
  "Yousef Almarri",
  "Dania Alotaibi",
  "Nasser Alqahtani",
  "Rana Alharbi",
  "Majed Alshammari",
  "Alanoud Aldosari",
  "Bader Alenezi",
  "Shahad Alzahrani",
  "Faisal Alghamdi",
  "Mona Alsubaie",
  "Sultan Alrasheed",
  "Jawaher Albalawi",
  "Ahmed Aljuhani",
  "Nouf Alasmari",
  "Saleh Almarri",
  "Ghada Almutairi",
];

const SYNTHETIC_EMPLOYERS = [
  "Al Manar Services Co.",
  "Riyadh Horizon Trading",
  "Najd Technical Solutions",
  "Eastern Gate Contracting",
  "Al Waha Logistics",
  "Arabian Field Services",
  "Mada Operations Co.",
  "Rowad Business Support",
  "Takamul Industrial Services",
  "Bunyan Facilities Management",
];

const SYNTHETIC_SUPERVISORS = [
  "Faisal Alqahtani",
  "Reem Alharbi",
  "Khalid Aldosari",
  "Maha Alenezi",
  "Saad Alzahrani",
  "Noura Alghamdi",
  "Turki Alsubaie",
  "Hessa Alrasheed",
  "Omar Albalawi",
  "Abeer Aljuhani",
];

function syntheticIdentity(index) {
  const idPrefixes = ["10", "11", "20"];
  const idSuffix = String(31 + index * 17)
    .padStart(2, "0")
    .slice(-2);
  const mobileSuffix = String(1427 + index * 193)
    .padStart(4, "0")
    .slice(-4);
  const supervisorSuffix = String(5703 + index * 127)
    .padStart(4, "0")
    .slice(-4);
  return {
    customerName: SYNTHETIC_CUSTOMERS[index % SYNTHETIC_CUSTOMERS.length],
    nationalIdMasked:
      idPrefixes[index % idPrefixes.length] + "******" + idSuffix,
    mobileMasked: "050***" + mobileSuffix,
    employerName: SYNTHETIC_EMPLOYERS[index % SYNTHETIC_EMPLOYERS.length],
    employerNumber:
      "700" +
      String(118204 + index * 97)
        .padStart(6, "0")
        .slice(-6),
    supervisorName: SYNTHETIC_SUPERVISORS[index % SYNTHETIC_SUPERVISORS.length],
    supervisorUserId: "USR-" + String(210 + index).padStart(3, "0"),
    supervisorMobileMasked: "050***" + supervisorSuffix,
  };
}

function seedToRaw(definition, index) {
  const baseAmountByJourney = {
    SANED: 18000,
    "Benefit Payments": 26000,
    "Employer Registration": 42000,
    Retirement: 32000,
    "Maternity Benefit": 24000,
    "Contribution & Wage": 68000,
  };
  const transactionAmount =
    (baseAmountByJourney[definition.journey] || 20000) +
    (index % 10) * 3750 +
    Math.floor(index / 10) * 2250;
  const amountAtRisk =
    definition.rule >= 40
      ? Math.round(transactionAmount * (0.62 + (index % 4) * 0.09))
      : Math.round(transactionAmount * 0.12);
  return Object.assign(
    {
      id: "BRI-" + String(index + 1).padStart(3, "0"),
      transactionId: "TX-2026-" + String(1001 + index),
      journey: definition.journey,
      scenario: definition.scenario,
      subject: definition.subject,
      entity: definition.entity,
      requested:
        "03 Oct · " +
        String(8 + Math.floor(index / 4)).padStart(2, "0") +
        ":" +
        String((index * 11) % 60).padStart(2, "0"),
      country: definition.country || "Saudi Arabia",
      region: definition.region,
      city: definition.city,
      ruleScore: definition.rule,
      features: {
        velocity: definition.v,
        retroDays: definition.r,
        linkedEntities: definition.l,
        priorRisk: definition.p,
        overrides: definition.o,
        identityReuse: definition.i,
        crossSourceConflict: definition.c,
        amountChangePct: definition.a,
        missingData: definition.m,
        urgentPriority: definition.u,
      },
      primaryCode: definition.code,
      primaryReason: definition.reason,
      source: "Synthetic seed",
      transactionAmount: transactionAmount,
      currency: "SAR",
      detectionStage: index % 7 === 0 ? "After payment" : "Before payment",
      paymentStatus: index % 7 === 0 ? "Paid" : "Pending",
      amountAtRisk: Math.min(transactionAmount, amountAtRisk),
      confirmedFraudAmount: 0,
      preventedAmount: 0,
      financialOutcome: null,
      decisionDate: null,
      decisionOwner: null,
    },
    syntheticIdentity(index),
  );
}

const baselineRaw = enterpriseSeedDefinitions.map(seedToRaw);

function median(values) {
  const sorted = values.slice().sort(function (a, b) {
    return a - b;
  });
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function robustDeviation(value, key) {
  const values = baselineRaw.map(function (item) {
    return Number(item.features[key]) || 0;
  });
  const med = median(values);
  const deviations = values.map(function (item) {
    return Math.abs(item - med);
  });
  const mad = median(deviations) || Math.max(1, med * 0.25);
  return Math.max(0, (Number(value || 0) - med) / (1.4826 * mad));
}

function isSaudi(country) {
  const value = String(country || "").toLowerCase();
  return (
    value === "" ||
    value.indexOf("saudi") >= 0 ||
    value === "ksa" ||
    value.indexOf("المملكة") >= 0
  );
}

function recommendedRoute(journey, risk) {
  if (risk === "Low") return "Straight-through processing";
  if (risk === "High") return "Fraud Prevention & Inspection Review";
  if (journey === "Benefit Payments") return "Payment & IBAN Verification";
  if (journey === "Retirement") return "Eligibility Verification";
  if (journey === "Maternity Benefit") return "Benefit Operations Review";
  return "Insurance Operations Audit";
}

function routeOwnership(item) {
  if (item.features.missingData || item.route === "Data Verification Review")
    return {
      owner: "Data Owner / Data Quality",
      next: "Verify missing or conflicting source data, then return the case for reassessment.",
    };
  if (item.route === "Straight-through processing")
    return {
      owner: "Service Operations",
      next: "Continue the normal journey while retaining the assessment audit trail.",
    };
  if (item.route === "Payment & IBAN Verification")
    return {
      owner: "Payment Operations",
      next: "Verify beneficiary ownership and payment-account evidence before proceeding.",
    };
  if (item.route === "Eligibility Verification")
    return {
      owner: "Eligibility Operations",
      next: "Validate eligibility evidence and employment status before proceeding.",
    };
  if (
    item.route === "Benefit Operations Review" ||
    item.route === "Insurance Operations Audit"
  )
    return {
      owner: "Insurance Operations Audit",
      next: "Complete targeted verification and record the reviewed outcome.",
    };
  return {
    owner: "Fraud Prevention, Detection & Inspection",
    next: "Prioritize specialist review, determine the required investigation route, and record the outcome.",
  };
}

function businessOwnerForJourney(journey) {
  const owners = {
    SANED: "SANED Service Owner",
    "Benefit Payments": "Payment Operations Owner",
    "Employer Registration": "Registration & Contribution Owner",
    Retirement: "Retirement Service Owner",
    "Maternity Benefit": "Benefit Service Owner",
    "Contribution & Wage": "Contribution & Wage Owner",
  };
  return owners[journey] || "Service Journey Owner";
}

function generateSignals(raw, anomaly, interaction) {
  const f = raw.features;
  const result = [
    [
      raw.primaryCode || "BEHAVIORAL_PATTERN",
      raw.primaryReason || raw.scenario,
    ],
  ];
  if (f.crossSourceConflict)
    result.push([
      "SOURCE_CONFLICT",
      "Approved sources provide conflicting information that requires verification.",
    ]);
  if (f.missingData)
    result.push([
      "REQUIRED_INFORMATION_MISSING",
      "Required information is missing; confidence is reduced and human review is required.",
    ]);
  if (f.identityReuse >= 3)
    result.push([
      "IDENTIFIER_REUSE",
      "An identifier is reused across " + f.identityReuse + " related records.",
    ]);
  if (f.amountChangePct >= 80)
    result.push([
      "MATERIAL_CHANGE",
      "The amount or salary changed by " +
        f.amountChangePct +
        "% within the observed period.",
    ]);
  if (f.retroDays >= 7)
    result.push([
      "RETROACTIVE_CHANGE",
      "A material change was applied " + f.retroDays + " days retroactively.",
    ]);
  if (f.velocity >= 6 && f.linkedEntities >= 7)
    result.push([
      "EVENT_CLUSTER",
      f.velocity +
        " events affect " +
        f.linkedEntities +
        " linked entities in the assessment window.",
    ]);
  if (f.overrides >= 2)
    result.push([
      "REPEATED_OVERRIDE",
      f.overrides + " control overrides occurred in the assessment window.",
    ]);
  if (!isSaudi(raw.country) && f.crossSourceConflict)
    result.push([
      "CROSS_BORDER_CONFLICT",
      "Cross-border activity conflicts with a verified sequence; the country itself does not increase risk.",
    ]);
  if (interaction > 0)
    result.push([
      "COMBINED_PATTERN",
      "The approved interaction logic added " +
        interaction +
        " points because multiple indicators occurred together.",
    ]);
  if (anomaly < raw.ruleScore - 20)
    result.push([
      "LOWER_BEHAVIORAL_DEVIATION",
      "Behavioral evidence is less unusual than the existing control score; both remain visible to the specialist.",
    ]);
  return result.slice(0, 5);
}

function buildEvents(raw) {
  return [
    [
      "Historical window",
      "Behavioral profile and validated prior outcomes loaded",
    ],
    ["Recent event sequence", raw.primaryReason || raw.scenario],
    [
      "Assessment time",
      "Existing controls and behavioral anomaly signals evaluated before action",
    ],
  ];
}

async function backendJSON(path, body, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(backendBaseUrl + path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal, cache: "no-store" });
    let result;
    try { result = await response.json(); } catch { throw new Error("The local backend returned an invalid response."); }
    if (!response.ok) throw new Error(result.error || "Local backend request failed");
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI service timed out. Retry or retain specialist review; no substitute model score was generated.");
    if (error instanceof TypeError) throw new Error("AI service unavailable. Check the local backend; no substitute model score was generated.");
    throw error;
  } finally { clearTimeout(timeout); }
}
function renderModelEvidence(item) {
  const model = item.modelAssessment;
  if (!model) return '<section class="detail-section model-evidence"><h3 class="detail-title">Legacy simulation</h3><p>No complete trained-model response is attached to this case. Its statistical simulation score is not a model percentile or model assessment.</p></section>';
  const value = (v) => v === null || v === undefined ? "—" : typeof v === "boolean" ? String(v) : String(v);
  const rows = [["modelVersion", model.modelVersion], [item.assessmentSource === "cross-journey" ? "score (synthetic review-pattern similarity)" : "score (raw anomaly score)", model.complete ? model.score : undefined], ["calibration percentile (technical reference rank, not risk %)", model.complete ? model.percentile : null], ["modelFlagged", model.modelFlagged], ["ruleFlagged", model.ruleFlagged], ["complete", model.complete]];
  const features = (model.features || []).map((feature) => `<tr><td>${escapeHtml(feature.name)}</td><td>${escapeHtml(value(feature.value))}</td><td>${escapeHtml(value(feature.median))}</td><td>${escapeHtml(value(feature.low))} – ${escapeHtml(value(feature.high))}</td><td>${escapeHtml(String(feature.unusual ?? feature.outsideReferenceRange ?? false))}</td></tr>`).join("");
  return `<section class="detail-section model-evidence"><h3 class="detail-title">Trained model result</h3><p>${model.complete ? "Unusualness percentile is relative to synthetic reference data, not fraud probability." : "Complete evidence · استكمال الأدلة. No model score or low-risk classification was produced."}</p><table class="model-contract-table"><tbody>${rows.map(([field, v]) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(value(v))}</td></tr>`).join("")}</tbody></table>${model.comparatorRulesAvailable === false ? '<p>ruleFlagged is not applicable: this journey has no configured provisional comparator rule engine.</p>' : ""}<h4>Model features</h4><div class="model-feature-scroll"><table class="model-contract-table"><thead><tr><th>Feature</th><th>Value</th><th>Median</th><th>Reference range</th><th>Unusual</th></tr></thead><tbody>${features || '<tr><td colspan="5">No complete model features.</td></tr>'}</tbody></table></div><h4>Model reasons</h4><ul>${(model.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul><p class="session-note">${escapeHtml(model.explanationBoundary || "Reference ranges provide context, not exact causal attribution.")}</p><small>${escapeHtml(model.assessmentId || item.assessmentId || "")} · ${escapeHtml(model.assessedAt || item.assessedAt || "")}</small></section>`;
}
function renderReviewHistory(item) {
  if (!(item.reviewHistory || []).length) return "";
  return `<section class="detail-section"><h3 class="detail-title">Human review history</h3><ol class="scenario-review-history">${item.reviewHistory.map((review) => `<li><strong>${escapeHtml(review.outcome || review.action || review.workflowStage || review.type)}</strong><span>${escapeHtml(review.actorName)} · ${escapeHtml(review.recordedAt)}</span><p>${escapeHtml(review.note)}</p><small>Assessment: ${escapeHtml(review.assessmentId)}</small></li>`).join("")}</ol></section>`;
}
let routeDecisionAction = null;
function openRouteDecision(item, action) {
  routeDecisionAction = { caseId: item.id, assessmentId: item.assessmentId, action };
  document.querySelector("#route-decision-title").textContent = action === "approve" ? "Approve recommended route" : "Reject recommendation";
  document.querySelector("#route-decision-note").value = "";
  document.querySelector('#route-decision-context').textContent = action === 'approve' ? 'Approve the original recommended route: ' + (item.recommendedRoute || item.modelAssessment?.route || item.route) : 'Return this recommendation for specialist review.';
  document.querySelector("#route-decision-error").textContent = "";
  document.querySelector("#route-decision-dialog").showModal();
}
document.querySelector("#route-decision-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#save-route-decision");
  button.disabled = true;
  try {
    const saved = await backendJSON("/decision", { ...routeDecisionAction, actorName: document.querySelector("#route-decision-name").value.trim(), note: document.querySelector("#route-decision-note").value.trim() });
    const item = cases.find((entry) => entry.id === routeDecisionAction.caseId);
    if (item) Object.assign(item, saved.caseData);
    document.querySelector("#route-decision-dialog").close();renderAll();showToast("Human decision saved separately from the model result.");
  } catch (error) { document.querySelector("#route-decision-error").textContent = error.message; }
  finally { button.disabled = false; }
});
document.querySelector("#close-route-decision").addEventListener("click", () => document.querySelector("#route-decision-dialog").close());

function generateCaseSummary(item) {
  if (item.assessmentSource === "cross-journey") return item.modelAssessment.reasons.join(" ") + " Recommended route: " + item.route + ". Assessment uses connected synthetic event evidence; no operational control score was supplied.";
  if (item.modelAssessment) {
    const m = item.modelAssessment;
    if (!m.complete) return "Model evidence is incomplete. Complete the requested evidence before relying on a model recommendation. Existing control score: " + item.ruleScore + "/100. Specialist review is required.";
    return "Existing control score: " + item.ruleScore + "/100. The model returned an unusualness percentile of " + Number(m.percentile).toFixed(1) + "% against synthetic reference data. " + (m.modelFlagged ? "The model suggests review. " : "The model did not flag the combination at its threshold. ") + "These outputs are separate, not a calibrated fraud probability. Proposed route: " + item.route + ". The specialist retains the final decision.";
  }

  const subject = item.customerName || item.subject;
  const employer = item.employerName || item.entity;
  const firstReason =
    item.signals && item.signals.length
      ? item.signals[0][1]
      : item.primaryReason;
  const direction =
    item.anomalyScore > item.ruleScore + 8
      ? "The behavioral pattern raised the level indicated by existing controls"
      : item.anomalyScore < item.ruleScore - 8
        ? "The legacy statistical simulation produced a lower anomaly value than the existing control score"
        : "The behavioral analysis broadly supports the existing control result";
  const decision =
    item.risk === "Low"
      ? "The request can proceed with normal controls"
      : item.risk === "Medium"
        ? "The case should be referred for targeted operational verification"
        : "The case should be prioritized for fraud-prevention and inspection review";
  return (
    subject +
    " is linked to " +
    employer +
    ". " +
    firstReason +
    " " +
    direction +
    ", resulting in a " +
    item.risk.toLowerCase() +
    " behavioral risk score of " +
    item.score +
    ". " +
    decision +
    ". The specialist retains the final decision."
  );
}

function generateArabicCaseSummary(item) {
  if (item.modelAssessment) {
    const m = item.modelAssessment;
    if (!m.complete) return "لم يصدر النموذج درجة بسبب نقص الأدلة. درجة الضوابط القائمة: " + item.ruleScore + "/100. يلزم استكمال الأدلة والمراجعة البشرية.";
    return "درجة الضوابط القائمة: " + item.ruleScore + "/100. مئين غرابة النمط: " + Number(m.percentile).toFixed(1) + "% مقارنة بمرجع اصطناعي. " + (m.modelFlagged ? "النموذج يقترح المراجعة. " : "لم ينبّه النموذج عند عتبته الحالية. ") + "النتيجتان منفصلتان ولا تمثلان احتمال احتيال. المسار المقترح: " + item.route + ". القرار النهائي للمختص.";
  }

  const subject = item.customerName || item.subject;
  const employer = item.employerName || item.entity;
  const f = item.features;
  const reasons = [];
  if (f.velocity >= 6 && f.linkedEntities >= 7)
    reasons.push(
      "رُصد تجمع متسارع للأحداث يشمل " +
        f.linkedEntities +
        " كيانات مرتبطة خلال فترة قصيرة",
    );
  if (f.amountChangePct >= 80)
    reasons.push(
      "ظهر تغير جوهري في الأجر أو المبلغ بنسبة " + f.amountChangePct + "%",
    );
  if (f.retroDays >= 7)
    reasons.push(
      "تم تنفيذ تعديل جوهري بأثر رجعي لمدة " + f.retroDays + " يومًا",
    );
  if (f.identityReuse >= 3)
    reasons.push(
      "تكرر استخدام معرّف واحد عبر " + f.identityReuse + " سجلات مرتبطة",
    );
  if (f.overrides >= 2)
    reasons.push("تكرر تجاوز الضوابط التشغيلية " + f.overrides + " مرات");
  if (f.crossSourceConflict)
    reasons.push("توجد معلومات متعارضة بين المصادر المعتمدة وتتطلب التحقق");
  if (!reasons.length)
    reasons.push(
      item.primaryCode === "NO_MATERIAL_ANOMALY"
        ? "لم يظهر انحراف جوهري عن السلوك المعتاد"
        : "رُصد نمط سلوكي يستحق المراجعة وفق مؤشرات الحالة",
    );
  const direction =
    item.anomalyScore > item.ruleScore + 8
      ? "ورفع التحليل السلوكي مستوى المخاطر مقارنة بنتيجة الضوابط القائمة"
      : item.anomalyScore < item.ruleScore - 8
        ? "وكان تقييم المحاكاة الإحصائية أقل من درجة الضوابط القائمة"
        : "وتوافقت نتيجة التحليل السلوكي عمومًا مع نتيجة الضوابط القائمة";
  const riskArabic =
    item.risk === "High"
      ? "مرتفعة"
      : item.risk === "Medium"
        ? "متوسطة"
        : "منخفضة";
  const decision =
    item.risk === "Low"
      ? "يمكن أن يستمر الطلب وفق الضوابط الاعتيادية"
      : item.risk === "Medium"
        ? "يوصى بإحالة الحالة إلى التحقق التشغيلي المستهدف"
        : "يوصى بإعطاء الحالة أولوية لمراجعة مكافحة الاحتيال والتفتيش";
  return (
    "ترتبط حالة " +
    subject +
    " بالمنشأة " +
    employer +
    ". " +
    reasons.slice(0, 3).join("، و") +
    ". " +
    direction +
    "، لتصبح درجة المخاطر السلوكية " +
    item.score +
    " وتصنيفها " +
    riskArabic +
    ". " +
    decision +
    "، ويبقى القرار النهائي بيد المختص."
  );
}

function assess(raw, config, anomalyOverride) {
  const activeConfig = config || modelConfig;
  let anomaly = 0;
  featureConfig.forEach(function (config) {
    const z = robustDeviation(raw.features[config.key], config.key);
    const weight =
      activeConfig.featureWeights[config.key] == null
        ? config.weight
        : activeConfig.featureWeights[config.key];
    anomaly += weight * Math.min(z / 3, 1);
  });
  if (raw.features.crossSourceConflict)
    anomaly += activeConfig.featureWeights.crossSourceConflict;
  anomaly = Math.max(0, Math.min(100, Math.round(anomaly)));
  if (Number.isFinite(anomalyOverride)) {
    anomaly = Math.max(0, Math.min(100, Math.round(anomalyOverride)));
  }

  let interaction = 0;
  const f = raw.features;
  if (f.identityReuse >= 3 && f.crossSourceConflict) interaction += 10;
  if (f.velocity >= 6 && f.linkedEntities >= 7) interaction += 10;
  if (f.amountChangePct >= 80 && f.velocity >= 2) interaction += 8;
  if (f.crossSourceConflict && f.priorRisk >= 50) interaction += 8;
  if (f.retroDays >= 7 && f.velocity >= 2) interaction += 8;
  if (f.overrides >= 2) interaction += 5;
  if (!isSaudi(raw.country) && f.crossSourceConflict) interaction += 4;
  interaction = Math.round(
    (interaction * activeConfig.interactionMultiplier) / 100,
  );

  const totalWeight = Math.max(
    1,
    activeConfig.controlWeight + activeConfig.anomalyWeight,
  );
  const formulaScore = Math.round(
    (raw.ruleScore * activeConfig.controlWeight) / totalWeight +
      (anomaly * activeConfig.anomalyWeight) / totalWeight +
      interaction,
  );
  const criticalControlFloor =
    raw.ruleScore >= activeConfig.criticalControlFloor
      ? activeConfig.highMin
      : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.max(formulaScore, criticalControlFloor)),
  );
  const risk =
    score >= activeConfig.highMin
      ? "High"
      : score > activeConfig.lowMax
        ? "Medium"
        : "Low";
  let confidenceScore = 94;
  if (f.missingData) confidenceScore -= 32;
  if (f.crossSourceConflict) confidenceScore -= 8;
  if (f.velocity === 0) confidenceScore -= 12;
  if (!raw.entity || raw.entity === "—") confidenceScore -= 5;
  const confidence =
    confidenceScore >= 80 ? "High" : confidenceScore >= 60 ? "Medium" : "Low";
  const comparison =
    anomaly > raw.ruleScore + 8
      ? "Legacy statistical simulation is above the existing control score"
      : anomaly < raw.ruleScore - 8
        ? "Legacy statistical simulation is below the existing control score"
        : "Legacy statistical simulation and existing controls are broadly aligned";
  const route = f.missingData
    ? "Data Verification Review"
    : recommendedRoute(raw.journey, risk);
  const recordedOutcome = raw.outcome || null;
  const recordedStatus = recordedOutcome
    ? String(recordedOutcome).indexOf("Suspected") === 0
      ? "Under investigation"
      : "Outcome recorded"
    : risk === "Low" && !f.missingData
      ? "Ready to proceed"
      : "Awaiting specialist";
  return Object.assign({}, raw, {
    assessmentMode: "legacy-simulation",
    anomalyScore: anomaly,
    interaction: interaction,
    score: score,
    risk: risk,
    confidenceScore: confidenceScore,
    confidence: confidence,
    comparison: comparison,
    route: route,
    status: recordedStatus,
    signals: generateSignals(raw, anomaly, interaction),
    events: buildEvents(raw),
    outcome: recordedOutcome,
    transactionAmount: Number(raw.transactionAmount || 0),
    currency: raw.currency || "SAR",
    detectionStage: raw.detectionStage || "Before payment",
    paymentStatus: raw.paymentStatus || "Pending",
    amountAtRisk: Number(raw.amountAtRisk || 0),
    confirmedFraudAmount: Number(raw.confirmedFraudAmount || 0),
    preventedAmount: Number(raw.preventedAmount || 0),
    financialOutcome: raw.financialOutcome || null,
    decisionDate: raw.decisionDate || null,
    decisionOwner: raw.decisionOwner || null,
    audit: ["Assessment calculated using prototype model v1.4"],
  });
}

function applySyntheticOutcome(item, index) {
  const syntheticDecisionDate = "08 Oct 2026";
  const confirmedAmount = Math.min(
    item.transactionAmount,
    Math.round(item.amountAtRisk * 0.86),
  );
  if (item.risk === "High") {
    if (index % 5 === 0) {
      item.outcome = "Confirmed fraud — formally established";
      item.financialOutcome = "Prevented before payment";
      item.paymentStatus = "Prevented";
      item.detectionStage = "Before payment";
      item.confirmedFraudAmount = confirmedAmount;
      item.preventedAmount = confirmedAmount;
      item.status = "Outcome recorded";
    } else if (index % 5 === 1) {
      item.outcome = "Suspected fraud — further investigation";
      item.paymentStatus = "On hold";
      item.status = "Under investigation";
    } else if (index % 5 === 2) {
      item.outcome = "Confirmed fraud — formally established";
      item.financialOutcome = "Paid — post-payment detection";
      item.paymentStatus = "Paid";
      item.detectionStage = "After payment";
      item.confirmedFraudAmount = confirmedAmount;
      item.status = "Outcome recorded";
    } else if (index % 5 === 3) {
      item.outcome = "Confirmed violation";
      item.financialOutcome = "Partially prevented";
      item.paymentStatus = "Prevented";
      item.preventedAmount = Math.round(item.amountAtRisk * 0.55);
      item.status = "Outcome recorded";
    }
  } else if (item.risk === "Medium") {
    if (index % 6 === 0) {
      item.outcome = "Suspected fraud — further investigation";
      item.paymentStatus = "On hold";
      item.status = "Under investigation";
    } else if (index % 6 === 1) {
      item.outcome = "Legitimate activity";
      item.financialOutcome = "Proceeded";
      item.paymentStatus = "Released";
      item.confirmedFraudAmount = 0;
      item.preventedAmount = 0;
      item.status = "Outcome recorded";
    } else if (index % 6 === 2) {
      item.outcome = "Process or data error";
      item.financialOutcome = "No financial impact";
      item.status = "Outcome recorded";
    }
  } else if (index % 4 === 0) {
    item.outcome = "Legitimate activity";
    item.financialOutcome = "Proceeded";
    item.paymentStatus = "Released";
    item.status = "Outcome recorded";
  }
  if (item.outcome) {
    item.decisionDate = syntheticDecisionDate;
    item.decisionOwner =
      item.risk === "High"
        ? "Fraud Prevention & Inspection Specialist"
        : "Insurance Operations Specialist";
    item.audit.push(
      "Synthetic specialist outcome recorded for prototype reporting",
    );
  }
  return item;
}

let cases = baselineRaw.map(function (item, index) {
  return applySyntheticOutcome(assess(item), index);
});
let portfolioScope = 'assessed';
function portfolioCases() { return cases.filter(item => portfolioScope === 'assessed' ? !!item.modelAssessment : !item.modelAssessment); }
function useAssessedPortfolio() { portfolioScope='assessed'; document.querySelector('#portfolio-scope').value='assessed'; }
let activeFilter = "All";
let activeJourney = "All";
let activeRegion = "All";
let searchQuery = "";
let selectedId = cases.slice().sort(function (a, b) {
  return b.score - a.score;
})[0].id;
let newAssessmentCount = 0;
let pendingFile = null;
let importedCount = 0;
let caseSummaryLanguage = "en";

const INDICATOR_FEATURE_MAP = {
  EVENT_VELOCITY: "velocity",
  RETROACTIVE_CHANGE: "retroDays",
  ENTITY_CLUSTER: "linkedEntities",
  PRIOR_OUTCOME: "priorRisk",
  RULE_OVERRIDE: "overrides",
  IDENTIFIER_REUSE: "identityReuse",
  MATERIAL_CHANGE: "amountChangePct",
  SOURCE_CONFLICT: "crossSourceConflict",
};

function rawFromCase(item) {
  return {
    id: item.id,
    synthetic: item.synthetic === true,
    scenarioProposal: item.scenarioProposal,
    journeyFeatures: item.journeyFeatures,
    aiModel: item.aiModel,
    modelAssessment: item.modelAssessment,
    assessmentId: item.assessmentId,
    assessmentMode: item.assessmentMode,
    reviewHistory: item.reviewHistory,
    transactionId: item.transactionId,
    journey: item.journey,
    scenario: item.scenario,
    subject: item.subject,
    entity: item.entity,
    requested: item.requested,
    country: item.country,
    region: item.region,
    city: item.city,
    ruleScore: item.ruleScore,
    features: Object.assign({}, item.features),
    primaryCode: item.primaryCode,
    primaryReason: item.primaryReason,
    reasonCodes: item.reasonCodes,
    source: item.source,
    customerName: item.customerName,
    nationalIdMasked: item.nationalIdMasked,
    mobileMasked: item.mobileMasked,
    employerName: item.employerName,
    employerNumber: item.employerNumber,
    supervisorName: item.supervisorName,
    supervisorUserId: item.supervisorUserId,
    supervisorMobileMasked: item.supervisorMobileMasked,
    transactionAmount: item.transactionAmount,
    currency: item.currency,
    detectionStage: item.detectionStage,
    paymentStatus: item.paymentStatus,
    amountAtRisk: item.amountAtRisk,
    confirmedFraudAmount: item.confirmedFraudAmount,
    preventedAmount: item.preventedAmount,
    financialOutcome: item.financialOutcome,
    decisionDate: item.decisionDate,
    decisionOwner: item.decisionOwner,
    outcome: item.outcome,
  };
}

function distributionFor(items) {
  return {
    High: items.filter(function (item) {
      return item.risk === "High";
    }).length,
    Medium: items.filter(function (item) {
      return item.risk === "Medium";
    }).length,
    Low: items.filter(function (item) {
      return item.risk === "Low";
    }).length,
  };
}

function configIsDefault(config) {
  return JSON.stringify(config) === JSON.stringify(DEFAULT_MODEL_CONFIG);
}

function reassessCases() {
  cases = cases.map(function (oldItem) {
    if (oldItem.modelAssessment || oldItem.assessmentMode === "model-separated") return oldItem;
    const refreshed = assess(rawFromCase(oldItem), modelConfig);
    refreshed.audit = (oldItem.audit || []).concat([
      "Reassessed using sandbox scoring simulation",
    ]);
    return refreshed;
  });
  if (
    !cases.some(function (item) {
      return item.id === selectedId;
    }) &&
    cases.length
  )
    selectedId = cases[0].id;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function riskColor(risk) {
  if (risk === "Incomplete") return "#a87519";
  return risk === "High"
    ? "#d94b51"
    : risk === "Medium"
      ? "#df9118"
      : "#21ad72";
}

function riskOrder(risk) {
  return risk === "High" ? 4 : risk === "Medium" ? 3 : risk === "Incomplete" ? 2 : 1;
}

function formatSar(value) {
  if (value == null || !Number.isFinite(Number(value))) return "Not supplied";
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function isSuspected(item) {
  return String(item.outcome || "").indexOf("Suspected fraud") === 0;
}

function isConfirmedFraud(item) {
  return String(item.outcome || "").indexOf("Confirmed fraud") === 0;
}

function isPrevented(item) {
  return (
    Number(item.preventedAmount || 0) > 0 &&
    (item.financialOutcome === "Prevented before payment" ||
      item.financialOutcome === "Partially prevented")
  );
}

function financialPortfolio(list) {
  const detected = list.filter(function (item) {
    return item.risk === "Medium" || item.risk === "High";
  });
  const suspected = list.filter(isSuspected);
  const confirmed = list.filter(isConfirmedFraud);
  const prevented = list.filter(isPrevented);
  return {
    detected: detected,
    suspected: suspected,
    confirmed: confirmed,
    prevented: prevented,
    assessedAmount: list.every(item=>Number.isFinite(item.transactionAmount)) ? list.reduce((sum,item)=>sum+item.transactionAmount,0) : null,
    missingTransactionAmounts:list.filter(item=>!Number.isFinite(item.transactionAmount)).length,
    amountAtRisk: detected.every(item=>Number.isFinite(item.amountAtRisk)) ? detected.reduce((sum,item)=>sum+item.amountAtRisk,0) : null,
    confirmedAmount: confirmed.reduce(function (sum, item) {
      return sum + Number(item.confirmedFraudAmount || 0);
    }, 0),
    preventedAmount: prevented.reduce(function (sum, item) {
      return sum + Number(item.preventedAmount || 0);
    }, 0),
  };
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 3200);
}

function switchView(name) {
  document.querySelector('.portfolio-bar').hidden = !['dashboard','executive','queue','business-report'].includes(name);
  if (['operations','connected'].includes(name) && portfolioScope !== 'assessed') { useAssessedPortfolio(); renderAll(); }
  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.classList.toggle("active", item.dataset.view === name);
  });
  document.querySelectorAll(".view").forEach(function (view) {
    view.classList.remove("active-view");
  });
  const target = document.querySelector("#" + name + "-view");
  if (target) target.classList.add("active-view");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filteredCases() {
  const cases = portfolioCases();
  const query = searchQuery.trim().toLowerCase();
  return cases
    .filter(function (item) {
      const riskMatch = activeFilter === "All" || item.risk === activeFilter;
      const journeyMatch =
        activeJourney === "All" || item.journey === activeJourney;
      const regionValue = isSaudi(item.country) ? item.region : "Outside KSA";
      const regionMatch =
        activeRegion === "All" || regionValue === activeRegion;
      const signalText = item.signals
        .map(function (signal) {
          return signal.join(" ");
        })
        .join(" ");
      const queryMatch =
        !query ||
        [
          item.id,
          item.transactionId,
          item.journey,
          item.subject,
          item.entity,
          item.scenario,
          item.city,
          item.country,
          item.customerName,
          item.nationalIdMasked,
          item.mobileMasked,
          item.employerName,
          item.employerNumber,
          item.supervisorName,
          item.supervisorUserId,
          signalText,
        ]
          .join(" ")
          .toLowerCase()
          .indexOf(query) >= 0;
      return riskMatch && journeyMatch && regionMatch && queryMatch;
    })
    .sort(function (a, b) {
      return riskOrder(b.risk) - riskOrder(a.risk) || b.score - a.score;
    });
}

function populateSelects() {
  const journeySelect = document.querySelector("#journey-filter");
  const manualJourney = document.querySelector("#assessment-journey");
  const journeys = Array.from(
    new Set(
      JOURNEYS.concat(
        cases.map(function (item) {
          return item.journey;
        }),
      ),
    ),
  ).sort();
  journeySelect.innerHTML =
    '<option value="All">All journeys</option>' +
    journeys
      .map(function (value) {
        return (
          '<option value="' +
          escapeHtml(value) +
          '">' +
          escapeHtml(value) +
          "</option>"
        );
      })
      .join("");
  journeySelect.value =
    journeys.indexOf(activeJourney) >= 0 ? activeJourney : "All";
  manualJourney.innerHTML = journeys
    .map(function (value) {
      return "<option>" + escapeHtml(value) + "</option>";
    })
    .join("");

  const regionSelect = document.querySelector("#region-filter");
  const available = Array.from(
    new Set(
      cases.map(function (item) {
        return isSaudi(item.country) ? item.region : "Outside KSA";
      }),
    ),
  )
    .filter(Boolean)
    .sort();
  regionSelect.innerHTML =
    '<option value="All">All locations</option>' +
    available
      .map(function (value) {
        return (
          '<option value="' +
          escapeHtml(value) +
          '">' +
          escapeHtml(value) +
          "</option>"
        );
      })
      .join("");
  regionSelect.value =
    available.indexOf(activeRegion) >= 0 ? activeRegion : "All";

  document.querySelector("#assessment-region").innerHTML = REGIONS.map(
    function (value) {
      return "<option>" + escapeHtml(value) + "</option>";
    },
  ).join("");

  const reportJourney = document.querySelector("#report-journey");
  if (reportJourney) {
    const currentReportJourney = reportJourney.value || "All";
    reportJourney.innerHTML =
      '<option value="All">All service journeys</option>' +
      journeys
        .map(function (value) {
          return (
            '<option value="' +
            escapeHtml(value) +
            '">' +
            escapeHtml(value) +
            "</option>"
          );
        })
        .join("");
    reportJourney.value =
      journeys.indexOf(currentReportJourney) >= 0
        ? currentReportJourney
        : "All";
  }
  const reportOwner = document.querySelector("#report-owner");
  if (reportOwner) {
    const currentOwner = reportOwner.value || "Enterprise";
    const owners = Array.from(
      new Set(journeys.map(businessOwnerForJourney)),
    ).sort();
    reportOwner.innerHTML =
      '<option value="Enterprise">Enterprise Risk &amp; Fraud Management</option>' +
      owners
        .map(function (value) {
          return (
            '<option value="' +
            escapeHtml(value) +
            '">' +
            escapeHtml(value) +
            "</option>"
          );
        })
        .join("");
    reportOwner.value =
      owners.indexOf(currentOwner) >= 0 ? currentOwner : "Enterprise";
  }
}

function renderDashboardMetrics() {
  const cases = portfolioCases();
  const high = cases.filter(function (item) {
    return item.risk === "High";
  }).length;
  const medium = cases.filter(function (item) {
    return item.risk === "Medium";
  }).length;
  const low = cases.filter(function (item) {
    return item.risk === "Low";
  }).length;
  const awaiting = cases.filter(function (item) {
    return item.status === "Awaiting specialist";
  }).length;
  const outside = cases.filter(function (item) {
    return !isSaudi(item.country);
  }).length;
  const metrics = [
    [
      "Cases assessed",
      cases.length,
      "Across " +
        new Set(
          cases.map(function (item) {
            return item.journey;
          }),
        ).size +
        " service journeys",
      "total-stat",
    ],
    ["High risk", high, "Specialist escalation required", "high-stat"],
    ["Medium risk", medium, "Targeted verification", "medium-stat"],
    ["Low risk", low, "Eligible for accelerated processing", "low-stat"],
    [
      "Awaiting human decision",
      awaiting,
      "AI has recommended; specialist decides",
      "review-stat",
    ],
    [
      "Outside Saudi Arabia",
      outside,
      "Open as one contextual category",
      "outside-stat",
    ],
  ];
  document.querySelector("#dashboard-metrics").innerHTML = metrics
    .map(function (item) {
      return (
        '<article class="metric-card ' +
        item[3] +
        '"><span class="label">' +
        item[0] +
        "</span><strong>" +
        item[1] +
        "</strong><small>" +
        item[2] +
        "</small></article>"
      );
    })
    .join("");
  document.querySelector("#dataset-badge").textContent =
    cases.length +
    (newAssessmentCount
      ? " cases · " + newAssessmentCount + " new assessments"
      : " synthetic cases");
}

function renderRiskDistribution() {
  const cases = portfolioCases();
  const total = Math.max(1, cases.length);
  const counts = {
    High: cases.filter(function (item) {
      return item.risk === "High";
    }).length,
    Medium: cases.filter(function (item) {
      return item.risk === "Medium";
    }).length,
    Low: cases.filter(function (item) {
      return item.risk === "Low";
    }).length,
  };
  const highPct = Math.round((counts.High / total) * 100);
  const mediumPct = Math.round((counts.Medium / total) * 100);
  const lowPct = Math.round(counts.Low / total * 100);
  const incomplete = cases.filter(item => item.risk === "Incomplete").length;
  const incompletePct = Math.round(incomplete / total * 100);
  document.querySelector("#risk-distribution").innerHTML = [
    '<div class="risk-visual">',
    '<div class="donut" style="--high:' +
      highPct +
      "%;--medium:" +
      (highPct + mediumPct) +
      '%;background:conic-gradient(var(--red) 0 ' + highPct + '%,var(--amber) ' + highPct + '% ' + (highPct + mediumPct) + '%,var(--green) ' + (highPct + mediumPct) + '% ' + (100 * (counts.High + counts.Medium + counts.Low) / total) + '%,var(--muted) 0)"><div><strong>' +
      cases.length +
      "</strong><span>Total cases</span></div></div>",
    '<div class="risk-legend">',
    '<button data-risk-link="High"><i class="high-dot"></i><span><strong>' +
      counts.High +
      "</strong> High risk</span><b>" +
      highPct +
      "%</b></button>",
    '<button data-risk-link="Medium"><i class="medium-dot"></i><span><strong>' +
      counts.Medium +
      "</strong> Medium risk</span><b>" +
      mediumPct +
      "%</b></button>",
    '<button data-risk-link="Low"><i class="low-dot"></i><span><strong>' +
      counts.Low +
      "</strong> Low risk</span><b>" +
      lowPct +
      "%</b></button>",
    `<button data-risk-link="Incomplete"><i class="incomplete-dot"></i><span><strong>${incomplete}</strong> Incomplete</span><b>${incompletePct}%</b></button>`,
    "</div>",
    "</div>",
    '<div class="risk-stack" aria-label="Risk distribution"><span class="high-segment" style="width:' +
      highPct +
      '%"></span><span class="medium-segment" style="width:' +
      mediumPct +
      '%"></span><span class="low-segment" style="width:' +
      lowPct +
      '%"></span><span style="background:var(--muted);width:' + incompletePct + '%"></span></div>',
  ].join("");
  document.querySelectorAll("[data-risk-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.riskLink;
      document.querySelectorAll(".filter").forEach(function (item) {
        item.classList.toggle("active", item.dataset.filter === activeFilter);
      });
      switchView("queue");
      resetVisibleSelection();
    });
  });
}

function renderJourneyChart() {
  const cases = portfolioCases();
  const counts = {};
  cases.forEach(function (item) {
    counts[item.journey] = (counts[item.journey] || 0) + 1;
  });
  const maximum = Math.max.apply(null, Object.values(counts).concat([1]));
  document.querySelector("#journey-chart").innerHTML = Object.keys(counts)
    .sort(function (a, b) {
      return counts[b] - counts[a];
    })
    .map(function (name) {
      const high = cases.filter(function (item) {
        return item.journey === name && item.risk === "High";
      }).length;
      return (
        '<button class="journey-bar" data-journey-link="' +
        escapeHtml(name) +
        '"><span class="journey-label"><strong>' +
        escapeHtml(name) +
        "</strong><small>" +
        high +
        ' high-risk</small></span><span class="bar-track"><i style="width:' +
        Math.round((counts[name] / maximum) * 100) +
        '%"></i></span><b>' +
        counts[name] +
        "</b></button>"
      );
    })
    .join("");
  document.querySelectorAll("[data-journey-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      activeJourney = button.dataset.journeyLink;
      switchView("queue");
      populateSelects();
      resetVisibleSelection();
    });
  });
}

function regionStats() {
  const cases = portfolioCases();
  const stats = {};
  cases
    .filter(function (item) {
      return isSaudi(item.country);
    })
    .forEach(function (item) {
      const region = item.region || "Unknown";
      if (!stats[region])
        stats[region] = {
          count: 0,
          high: 0,
          medium: 0,
          low: 0,
          maxRisk: "Low",
        };
      stats[region].count += 1;
      stats[region][item.risk.toLowerCase()] += 1;
      if (riskOrder(item.risk) > riskOrder(stats[region].maxRisk))
        stats[region].maxRisk = item.risk;
    });
  return stats;
}

function projectSaudi(point) {
  const minLon = 34.2;
  const maxLon = 56.0;
  const minLat = 15.7;
  const maxLat = 32.7;
  const x = 38 + ((point[0] - minLon) / (maxLon - minLon)) * 535;
  const y = 28 + ((maxLat - point[1]) / (maxLat - minLat)) * 405;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function renderMap() {
  const stats = regionStats();
  const boundaryPath =
    SAUDI_BOUNDARY.map(function (point, index) {
      const projected = projectSaudi(point);
      return (index === 0 ? "M" : "L") + projected[0] + " " + projected[1];
    }).join(" ") + " Z";
  const markers = Object.keys(stats)
    .filter(function (name) {
      return REGION_GEO[name];
    })
    .map(function (name) {
      const value = stats[name];
      const coords = projectSaudi(REGION_GEO[name]);
      const radius = 7 + Math.min(14, value.count * 3);
      return [
        '<g class="map-marker" data-region-link="' +
          escapeHtml(name) +
          '" tabindex="0" role="button" aria-label="' +
          escapeHtml(
            name + ": " + value.count + " cases, highest risk " + value.maxRisk,
          ) +
          '">',
        '<circle class="marker-halo" cx="' +
          coords[0] +
          '" cy="' +
          coords[1] +
          '" r="' +
          (radius + 7) +
          '" fill="' +
          riskColor(value.maxRisk) +
          '"></circle>',
        '<circle cx="' +
          coords[0] +
          '" cy="' +
          coords[1] +
          '" r="' +
          radius +
          '" fill="' +
          riskColor(value.maxRisk) +
          '"><title>' +
          escapeHtml(name + " · " + value.count + " cases · " + value.maxRisk) +
          "</title></circle>",
        '<text x="' +
          coords[0] +
          '" y="' +
          (coords[1] + 4) +
          '" text-anchor="middle">' +
          value.count +
          "</text>",
        "</g>",
      ].join("");
    })
    .join("");
  document.querySelector("#saudi-map").innerHTML = [
    '<svg viewBox="0 0 620 470" role="img" aria-label="Saudi Arabia boundary map showing synthetic case concentrations">',
    '<path class="map-grid" d="M35 110 H580 M35 220 H580 M35 330 H580 M165 25 V435 M310 25 V435 M455 25 V435"></path>',
    '<text class="map-water-label" x="38" y="306" transform="rotate(-66 38 306)">RED SEA</text>',
    '<text class="map-water-label" x="521" y="137" transform="rotate(-22 521 137)">ARABIAN GULF</text>',
    '<path class="saudi-outline" d="' + boundaryPath + '"></path>',
    '<text class="map-country-label" x="320" y="287" text-anchor="middle">SAUDI ARABIA</text>',
    markers,
    '<text class="map-label" x="38" y="453">Synthetic case distribution — click a marker to filter the queue</text>',
    '<text class="map-attribution" x="582" y="453" text-anchor="end">Boundary: Natural Earth (public domain)</text>',
    "</svg>",
  ].join("");
  const ordered = Object.keys(stats)
    .sort(function (a, b) {
      return stats[b].count - stats[a].count;
    })
    .slice(0, 6);
  document.querySelector("#region-ranking").innerHTML =
    '<div class="ranking-title">Highest case volume</div>' +
    ordered
      .map(function (name, index) {
        const value = stats[name];
        return (
          '<button data-region-link="' +
          escapeHtml(name) +
          '"><span>' +
          (index + 1) +
          "</span><div><strong>" +
          escapeHtml(name) +
          "</strong><small>" +
          value.high +
          " high · " +
          value.medium +
          " medium · " +
          value.low +
          " low</small></div><b>" +
          value.count +
          "</b></button>"
        );
      })
      .join("");
  document.querySelectorAll("[data-region-link]").forEach(function (element) {
    function openRegion() {
      activeRegion = element.dataset.regionLink;
      populateSelects();
      switchView("queue");
      resetVisibleSelection();
    }
    element.addEventListener("click", openRegion);
    element.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") openRegion();
    });
  });
}

function renderOutsideList() {
  const cases = portfolioCases();
  const outside = cases
    .filter(function (item) {
      return !isSaudi(item.country);
    })
    .sort(function (a, b) {
      return b.score - a.score;
    });
  document.querySelector("#outside-count").textContent = outside.length;
  const highest = outside.reduce(function (result, item) {
    return riskOrder(item.risk) > riskOrder(result) ? item.risk : result;
  }, "Low");
  document.querySelector("#outside-list").innerHTML = outside.length
    ? [
        '<button id="open-outside-cases">',
        '<div class="outside-location"><span>◎</span><div><strong>Outside Saudi Arabia</strong><small>' +
          outside.length +
          " contextual case" +
          (outside.length === 1 ? "" : "s") +
          "</small></div></div>",
        '<span class="risk-chip ' +
          highest +
          '">Highest ' +
          highest +
          "</span>",
        "<p>Country and city are intentionally not displayed here. Open the category to review the explainable cases and verified evidence.</p>",
        '<span class="outside-open">Open cases →</span>',
        "</button>",
      ].join("")
    : '<div class="empty-state"><strong>No outside-Saudi-Arabia cases in the current dataset.</strong><p>Location is contextual evidence and is never treated as a risk signal by itself.</p></div>';
  const openButton = document.querySelector("#open-outside-cases");
  if (openButton)
    openButton.addEventListener("click", function () {
      activeRegion = "Outside KSA";
      populateSelects();
      switchView("queue");
      resetVisibleSelection();
    });
}

function renderLatestActivity() {
  const cases = portfolioCases();
  const latest = cases
    .slice()
    .sort(function (a, b) {
      return (Date.parse(b.assessedAt || b.requested) || 0) - (Date.parse(a.assessedAt || a.requested) || 0);
    })
    .slice(0, 5);
  document.querySelector("#latest-activity").innerHTML = latest
    .map(function (item) {
      return (
        '<button data-case-link="' +
        escapeHtml(item.id) +
        '"><span class="activity-icon ' +
        item.risk.toLowerCase() +
        '">' +
        (item.score == null ? "—" : item.score) +
        "</span><div><strong>" +
        escapeHtml(item.transactionId + " · " + item.journey) +
        "</strong><p>" +
        escapeHtml(item.comparison + ". " + item.route + ".") +
        '</p></div><span class="activity-time">' +
        escapeHtml(item.requested) +
        "</span></button>"
      );
    })
    .join("");
  wireCaseLinks();
}

function wireCaseLinks() {
  document.querySelectorAll("[data-case-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedId = button.dataset.caseLink;
      activeFilter = "All";
      activeJourney = "All";
      activeRegion = "All";
      searchQuery = "";
      document.querySelector("#case-search").value = "";
      document.querySelectorAll(".filter").forEach(function (item) {
        item.classList.toggle("active", item.dataset.filter === "All");
      });
      populateSelects();
      switchView("queue");
      renderQueue();
    });
  });
}

function renderDashboard() {
  renderDashboardMetrics();
  renderRiskDistribution();
  renderJourneyChart();
  renderMap();
  renderOutsideList();
  renderLatestActivity();
}

function renderQueue() {
  const cases = portfolioCases();
  const visible = filteredCases();
  if (!visible.length) selectedId = null;
  if (
    visible.length &&
    !visible.some(function (item) {
      return item.id === selectedId;
    })
  )
    selectedId = visible[0].id;
  document.querySelector("#queue-summary").textContent =
    "Showing " + visible.length + " of " + cases.length + " cases";
  document.querySelector("#case-table").innerHTML = visible.length
    ? visible
        .map(function (item) {
          const location = isSaudi(item.country)
            ? item.city + " · " + item.region
            : "Outside Saudi Arabia";
          const urgent = item.features.urgentPriority
            ? '<span class="urgent-mini">Urgent</span>'
            : "";
          return [
            '<tr data-case="' +
              escapeHtml(item.id) +
              '" class="' +
              (item.id === selectedId ? "selected" : "") +
              '">',
            '<td><span class="case-id">' +
              escapeHtml(item.transactionId) +
              '</span><span class="subtext">' +
              escapeHtml(item.id) +
              " · " +
              formatSar(item.transactionAmount) +
              urgent +
              "</span></td>",
            '<td><span class="journey-tag">' +
              escapeHtml(item.journey) +
              "</span></td>",
            "<td><strong>" +
              escapeHtml(item.customerName || item.subject) +
              '</strong><span class="subtext">' +
              escapeHtml(
                (item.nationalIdMasked || item.subject) +
                  " · " +
                  (item.employerName || item.entity),
              ) +
              "</span></td>",
            "<td><strong>" +
              escapeHtml(location) +
              '</strong><span class="subtext">' +
              (isSaudi(item.country)
                ? "Saudi Arabia"
                : "Context only — not a risk by itself") +
              "</span></td>",
            '<td><span class="risk-chip ' +
              item.risk +
              '">' +
              item.risk +
              " " +
              (item.score == null ? " —" : " · " + item.score) +
              '</span><span class="subtext">' +
              (item.assessmentSource === "cross-journey" ? "Pattern model: " + (!item.modelAssessment.complete ? "Incomplete evidence" : item.modelAssessment.modelFlagged ? "Review suggested" : "No model flag") : item.modelAssessment ? "Existing control " + item.ruleScore + " · Reference percentile " + (item.modelAssessment.complete ? Number(item.modelAssessment.percentile).toFixed(1) + "%" : "unavailable") : "Legacy simulation · statistical score " + item.anomalyScore) +
              "</span></td>",
            '<td><span class="confidence-chip ' +
              item.confidence +
              '">' +
              item.confidence +
              '</span><span class="subtext">' +
              (item.modelAssessment ? "Input evidence " + (item.modelAssessment.complete ? "complete" : "incomplete") : item.confidenceScore + "% heuristic data completeness") +
              "</span></td>",
            '<td class="reason">' + escapeHtml(item.signals[0][1]) + "</td>",
            '<td class="route">' + escapeHtml(item.route) + "</td>",
            '<td><span class="status-chip">' +
              escapeHtml(item.status) +
              "</span></td>",
            "</tr>",
          ].join("");
        })
        .join("")
    : '<tr><td colspan="9"><div class="empty-state"><strong>No cases match these filters.</strong><p>Clear one or more filters to view other assessments.</p></div></td></tr>';
  document.querySelectorAll("[data-case]").forEach(function (row) {
    row.addEventListener("click", function () {
      selectedId = row.dataset.case;
      renderQueue();
    });
  });
  renderCase();
}

function renderCase() {
  const cases = portfolioCases();
  const item = cases.find(function (entry) {
    return entry.id === selectedId;
  });
  const panel = document.querySelector("#case-panel");
  if (!item) {
    panel.innerHTML =
      '<div class="empty-state"><strong>Select a case to view its explanation.</strong></div>';
    return;
  }
  const scoreColor = riskColor(item.risk);
  const dataQuality = item.modelAssessment ? (item.modelAssessment.complete ? "Model evidence structurally complete; source reliability not independently validated" : "Model evidence incomplete; no model score produced") : item.features.missingData
    ? "Required information missing"
    : item.features.crossSourceConflict
      ? "Conflicting information — verification required"
      : "Data complete for this simulation";
  const outcome = item.outcome
    ? '<div class="outcome-box"><strong>Recorded specialist outcome</strong><span>' +
      escapeHtml(item.outcome) +
      "</span><small>" +
      escapeHtml(
        (item.financialOutcome || "Financial outcome pending") +
          (item.decisionDate ? " · " + item.decisionDate : ""),
      ) +
      "</small></div>"
    : "";
  const caseLocation = isSaudi(item.country)
    ? item.city
    : "Outside Saudi Arabia";
  const summaryArabic = caseSummaryLanguage === "ar";
  const caseSummary = summaryArabic
    ? generateArabicCaseSummary(item)
    : generateCaseSummary(item);
  const actionOwnership = routeOwnership(item);
  panel.innerHTML = [
    '<div class="case-hero">',
    '<div class="case-hero-top"><div><p>' +
      escapeHtml(item.transactionId) +
      " · " +
      escapeHtml(item.journey) +
      "</p><h2>" +
      escapeHtml(item.scenario) +
      "</h2><p>" +
      escapeHtml(
        (item.customerName || item.subject) +
          " · " +
          (item.employerName || item.entity) +
          " · " +
          caseLocation,
      ) +
      "</p></div>",
    '<div class="score-ring" style="--score:' +
      (item.score == null ? 0 : item.score) +
      "%;--score-color:" +
      scoreColor +
      '"><div><strong>' +
      (item.score == null ? "—" : item.score) +
      "</strong><small>" +
      (item.modelAssessment ? "Existing control" : "Legacy simulation") +
      "</small></div></div></div>",
    item.features.urgentPriority
      ? '<span class="urgent-banner">Urgent operational priority — urgency does not change risk</span>'
      : "",
    "</div>",
    '<section class="detail-section identity-section"><h3 class="detail-title">Customer, employer &amp; operator context</h3><div class="identity-grid">',
    "<div><span>Customer / beneficiary</span><strong>" +
      escapeHtml(item.customerName || "Not supplied") +
      "</strong><small>" +
      escapeHtml(
        (item.nationalIdMasked || item.subject) +
          " · " +
          (item.mobileMasked || "Not supplied"),
      ) +
      "</small></div>",
    "<div><span>Employer</span><strong>" +
      escapeHtml(item.employerName || item.entity) +
      "</strong><small>" +
      escapeHtml((item.employerNumber || item.entity) + " · " + item.entity) +
      "</small></div>",
    "<div><span>Employer supervisor / operator</span><strong>" +
      escapeHtml(item.supervisorName || "Not supplied") +
      "</strong><small>" +
      escapeHtml(
        (item.supervisorUserId || "Not supplied") +
          " · " +
          (item.supervisorMobileMasked || "Not supplied"),
      ) +
      "</small></div>",
    "<div><span>Privacy status</span><strong>Masked synthetic data</strong><small>No real personal data is used in this prototype.</small></div>",
    "</div></section>",
    '<section class="detail-section financial-context-section"><h3 class="detail-title">Financial and intervention context</h3><div class="financial-context-grid">',
    "<div><span>Transaction amount</span><strong>" +
      formatSar(item.transactionAmount) +
      "</strong></div>",
    "<div><span>Potential amount at risk</span><strong>" +
      formatSar(item.amountAtRisk) +
      "</strong></div>",
    "<div><span>Detection stage</span><strong>" +
      escapeHtml(item.detectionStage) +
      "</strong></div>",
    "<div><span>Payment status</span><strong>" +
      escapeHtml(item.paymentStatus) +
      "</strong></div>",
    "<div><span>Confirmed fraud amount</span><strong>" +
      formatSar(item.confirmedFraudAmount) +
      "</strong></div>",
    "<div><span>Prevented amount</span><strong>" +
      formatSar(item.preventedAmount) +
      "</strong></div>",
    '</div><small class="financial-boundary">Synthetic prototype values. Prevention is counted only when the specialist outcome and payment status support it.</small></section>',
    '<section class="detail-section ai-summary-section ' +
      (summaryArabic ? "rtl-summary" : "") +
      '" dir="' +
      (summaryArabic ? "rtl" : "ltr") +
      '"><div class="summary-heading"><h3 class="detail-title">' +
      (summaryArabic ? "ملخص الأدلة" : "Evidence summary") +
      '</h3><div class="summary-actions"><span>' +
      (summaryArabic ? "مولّد في النموذج الأولي" : "Prototype-generated") +
      '</span><button id="summary-language-toggle" type="button">' +
      (summaryArabic ? "English" : "العربية") +
      "</button></div></div><p>" +
      escapeHtml(caseSummary) +
      "</p><small>" +
      (summaryArabic
        ? "يلخص هذا النص الأدلة المتاحة للمراجعة، ولا يثبت وجود احتيال ولا يستبدل قرار المختص."
        : "This summary organizes available evidence for review. It does not confirm fraud or replace the specialist decision.") +
      "</small></section>",
    '<section class="detail-section"><h3 class="detail-title">Assessment components</h3><div class="score-split four">',
    '<div class="mini-score"><span>Existing control</span><strong>' +
      (item.ruleScore == null ? "Not supplied" : item.ruleScore) +
      "</strong></div>",
    '<div class="mini-score"><span>' + (item.assessmentSource === 'cross-journey' ? 'Pattern assessment' : item.modelAssessment ? 'Reference percentile' : 'Legacy statistical score') + '</span><strong>' +
      (item.assessmentSource === 'cross-journey' ? (!item.modelAssessment.complete ? 'Incomplete' : item.modelAssessment.modelFlagged ? 'Review' : 'Not flagged') : item.anomalyScore == null ? '—' : Number(item.anomalyScore).toFixed(1)) +
      "</strong></div>",
    '<div class="mini-score"><span>Pattern adjustment</span><strong>' +
      (item.modelAssessment ? 'Not applied' : '+' + item.interaction) +
      "</strong></div>",
    '<div class="mini-score"><span>Input completeness</span><strong>' +
      (item.modelAssessment ? (item.modelAssessment.complete ? 'Complete' : 'Incomplete') : item.confidenceScore + '% heuristic') +
      "</strong></div>",
    '</div><div class="comparison-note">' +
      escapeHtml(item.comparison) +
      "</div></section>",
    '<section class="detail-section"><h3 class="detail-title">Explainable reason codes</h3><ul class="reason-list">' +
      item.signals
        .map(function (signal) {
          return (
            "<li><strong>" +
            escapeHtml(signal[0]) +
            "</strong><span>" +
            escapeHtml(signal[1]) +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></section>",
    '<section class="detail-section"><h3 class="detail-title">Data quality & confidence</h3><div class="quality-row"><span class="confidence-chip ' +
      item.confidence +
      '">' +
      item.confidence +
      "</span><div><strong>" +
      escapeHtml(dataQuality) +
      "</strong><small>Assessment confidence is separate from behavioral risk.</small></div></div></section>",
    '<section class="detail-section"><h3 class="detail-title">Behavioral timeline</h3><ul class="timeline">' +
      item.events
        .map(function (event) {
          return (
            "<li>" +
            escapeHtml(event[1]) +
            "<time>" +
            escapeHtml(event[0]) +
            "</time></li>"
          );
        })
        .join("") +
      "</ul></section>",
    '<section class="detail-section"><h3 class="detail-title">Assessment processing steps</h3><ol class="agent-trace"><li><span>1</span><div><strong>Context assembled</strong><small>Supplied synthetic evidence loaded for assessment.</small></div></li><li><span>2</span><div><strong>Anomaly assessed</strong><small>Behavior compared with the prototype baseline.</small></div></li><li><span>3</span><div><strong>Reasons generated</strong><small>Contributing evidence retained for specialist review.</small></div></li><li><span>4</span><div><strong>Route recommended</strong><small>No adverse action executed automatically.</small></div></li></ol></section>',
    '<section class="detail-section"><h3 class="detail-title">Recommended proportionate action</h3><div class="recommendation">' +
      escapeHtml(item.route) +
      '</div><div class="ownership-card"><div><span>Action owner</span><strong>' +
      escapeHtml(actionOwnership.owner) +
      "</strong></div><div><span>Next step</span><strong>" +
      escapeHtml(actionOwnership.next) +
      "</strong></div><div><span>Business owner</span><strong>" +
      escapeHtml(businessOwnerForJourney(item.journey)) +
      "</strong></div></div>" +
      (item.confidence === "Low"
        ? '<div class="warning-note">Low confidence: complete or verify the missing information before relying on this recommendation.</div>'
        : "") +
      outcome +
      '<div class="action-row"><button class="approve-btn" id="approve-route">Approve recommended route</button><button class="override-btn" id="override-route-btn">Select different route</button><button class="override-btn" id="reject-route">Reject recommendation</button><button class="outcome-btn" id="record-outcome-btn">Record outcome</button></div></section>',
  ].join("");
  panel.insertAdjacentHTML("beforeend", renderModelEvidence(item) + renderReviewHistory(item) + renderScenarioGovernance(item));
  panel.querySelectorAll("[data-scenario-action]").forEach((button) => {
    button.addEventListener("click", () => openScenarioReview(item, button.dataset.scenarioAction));
  });
  document
    .querySelector("#summary-language-toggle")
    .addEventListener("click", function () {
      caseSummaryLanguage = caseSummaryLanguage === "ar" ? "en" : "ar";
      renderCase();
    });
  if (!item.assessmentId) {
    panel.querySelectorAll("#approve-route, #override-route-btn, #reject-route, #record-outcome-btn").forEach((button) => { button.disabled = true; });
    panel.insertAdjacentHTML("beforeend", '<p class="session-note">This is an unsaved legacy simulation. Use New Assessment or import synthetic model evidence to record a persistent specialist review.</p>');
  }
  document.querySelector("#approve-route").addEventListener("click", () => openRouteDecision(item, "approve"));
  document.querySelector("#reject-route").addEventListener("click", () => openRouteDecision(item, "reject"));
  document
    .querySelector("#override-route-btn")
    .addEventListener("click", function () {
      document.querySelector("#override-route").value = item.route;
      document.querySelector("#override-reason").value = "";
      document.querySelector("#override-dialog").showModal();
    });
  document
    .querySelector("#record-outcome-btn")
    .addEventListener("click", function () {
      document.querySelector("#outcome-value").value = item.outcome || "";
      document.querySelector("#financial-outcome-value").value =
        item.financialOutcome || "";
      document.querySelector("#outcome-amount-at-risk").value =
        item.amountAtRisk || 0;
      document.querySelector("#outcome-confirmed-amount").value =
        item.confirmedFraudAmount || 0;
      document.querySelector("#outcome-prevented-amount").value =
        item.preventedAmount || 0;
      document.querySelector("#outcome-note").value = "";
      document.querySelector("#outcome-dialog").showModal();
    });
}

function previewCasesFor(config) {
  return cases.map(function (item) {
    return item.modelAssessment || item.assessmentMode === "model-separated" ? item : assess(rawFromCase(item), config);
  });
}

function renderSimulationResults() {
  const formula = document.querySelector("#simulation-formula");
  const results = document.querySelector("#simulation-results");
  if (!formula || !results) return;
  document.querySelector("#control-weight-value").textContent =
    draftModelConfig.controlWeight + "%";
  document.querySelector("#anomaly-weight-value").textContent =
    draftModelConfig.anomalyWeight + "%";
  document.querySelector("#interaction-weight-value").textContent =
    draftModelConfig.interactionMultiplier + "%";
  document.querySelector("#low-threshold-value").textContent =
    draftModelConfig.lowMax;
  document.querySelector("#high-threshold-value").textContent =
    draftModelConfig.highMin;
  formula.innerHTML =
    "<strong>" +
    draftModelConfig.controlWeight +
    "% existing controls</strong> + <strong>" +
    draftModelConfig.anomalyWeight +
    "% legacy statistical anomaly</strong> + " +
    draftModelConfig.interactionMultiplier +
    "% of approved pattern adjustments. Risk bands: Low 0–" +
    draftModelConfig.lowMax +
    ", Medium " +
    (draftModelConfig.lowMax + 1) +
    "–" +
    (draftModelConfig.highMin - 1) +
    ", High " +
    draftModelConfig.highMin +
    "–100.";

  const appliedDistribution = distributionFor(cases);
  const previewItems = previewCasesFor(draftModelConfig);
  const previewDistribution = distributionFor(previewItems);
  let increased = 0;
  let decreased = 0;
  previewItems.forEach(function (item, index) {
    const before = cases[index];
    if (riskOrder(item.risk) > riskOrder(before.risk)) increased += 1;
    if (riskOrder(item.risk) < riskOrder(before.risk)) decreased += 1;
  });
  const unchanged = Math.max(0, previewItems.length - increased - decreased);
  function snapshot(title, values) {
    return (
      '<div class="simulation-snapshot"><h4>' +
      title +
      '</h4><div><span class="sim-high"><b>' +
      values.High +
      '</b>High</span><span class="sim-medium"><b>' +
      values.Medium +
      '</b>Medium</span><span class="sim-low"><b>' +
      values.Low +
      "</b>Low</span></div></div>"
    );
  }
  results.innerHTML = [
    '<div class="simulation-compare">',
    snapshot("Currently applied", appliedDistribution),
    '<span class="compare-arrow">→</span>',
    snapshot("Draft preview", previewDistribution),
    "</div>",
    '<div class="movement-list"><div><span>Moved to a higher band</span><b>' +
      increased +
      " cases</b></div><div><span>Moved to a lower band</span><b>" +
      decreased +
      " cases</b></div><div><span>Band unchanged</span><b>" +
      unchanged +
      " cases</b></div></div>",
  ].join("");
}

function renderFeatureWeightControls() {
  const target = document.querySelector("#feature-weight-controls");
  if (!target) return;
  const featureLabels = {
    velocity: [
      "Rapid event velocity",
      "Unusual event frequency within the assessment window",
    ],
    retroDays: [
      "Retroactive material change",
      "Backdated wage, eligibility, or profile changes",
    ],
    linkedEntities: [
      "Linked-entity concentration",
      "Related subjects or employers moving together",
    ],
    priorRisk: [
      "Prior validated outcome",
      "Confirmed historical outcomes used as context",
    ],
    overrides: [
      "Repeated control override",
      "Multiple source-system overrides in the same window",
    ],
    identityReuse: [
      "Identifier reuse",
      "Shared mobile, device, IBAN, or contact point",
    ],
    amountChangePct: [
      "Material amount or wage change",
      "Change relative to the historical baseline",
    ],
    crossSourceConflict: [
      "Cross-source conflict",
      "Material inconsistency across approved sources",
    ],
  };
  target.innerHTML = Object.keys(featureLabels)
    .map(function (key) {
      const value = draftModelConfig.featureWeights[key];
      return (
        '<div class="feature-control"><label class="model-slider"><span><strong>' +
        featureLabels[key][0] +
        "</strong><output>" +
        value +
        ' pts</output></span><input type="range" min="0" max="30" value="' +
        value +
        '" data-feature-weight="' +
        key +
        '" /></label><small>' +
        featureLabels[key][1] +
        "</small></div>"
      );
    })
    .join("");
  document.querySelectorAll("[data-feature-weight]").forEach(function (input) {
    input.addEventListener("input", function () {
      draftModelConfig.featureWeights[input.dataset.featureWeight] = Number(
        input.value,
      );
      input.parentElement.querySelector("output").textContent =
        input.value + " pts";
      modelReviewStatus = "Draft";
      renderSimulationResults();
      renderSimulationGovernance();
    });
  });
}

function renderSimulationGovernance() {
  const flow = document.querySelector("#approval-flow");
  const badge = document.querySelector("#simulation-status");
  if (!flow || !badge) return;
  const stages = [
    ["Draft", "Sandbox configuration only"],
    ["Specialist Review", "Purpose, indicators, and impact"],
    ["Data & AI Validation", "Performance, bias, and robustness"],
    ["GM Approval", "Final activation gate within authority"],
    ["Activation", "Controlled release and monitoring"],
  ];
  const currentIndex = Math.max(
    0,
    stages.findIndex(function (stage) {
      return stage[0] === modelReviewStatus;
    }),
  );
  flow.innerHTML = stages
    .map(function (stage, index) {
      const state =
        index < currentIndex
          ? "complete"
          : index === currentIndex
            ? "active"
            : "";
      const gate = stage[0] === "GM Approval" ? " gate" : "";
      return (
        '<div class="approval-step ' +
        state +
        gate +
        '"><span>' +
        (index + 1) +
        "</span><strong>" +
        stage[0] +
        "</strong><small>" +
        stage[1] +
        "</small></div>"
      );
    })
    .join("");
  badge.textContent =
    modelReviewStatus === "Draft"
      ? "Draft simulation"
      : "Submitted · " + modelReviewStatus;
  badge.className =
    modelReviewStatus === "Draft"
      ? "status-chip neutral"
      : "status-chip testing";
}

function renderSimulation() {
  const control = document.querySelector("#control-weight");
  if (!control) return;
  control.value = draftModelConfig.controlWeight;
  document.querySelector("#anomaly-weight").value =
    draftModelConfig.anomalyWeight;
  document.querySelector("#interaction-weight").value =
    draftModelConfig.interactionMultiplier;
  document.querySelector("#low-threshold").value = draftModelConfig.lowMax;
  document.querySelector("#high-threshold").value = draftModelConfig.highMin;
  renderFeatureWeightControls();
  renderSimulationResults();
  renderSimulationGovernance();
}

function renderModelState() {
  const pill = document.querySelector("#model-state-pill");
  const formula = document.querySelector("#method-formula");
  const thresholds = document.querySelector("#method-thresholds");
  const appendixFormula = document.querySelector("#appendix-formula");
  if (pill)
    pill.textContent = simulationActive
      ? "Sandbox simulation active"
      : "Madar demo · v2";
  if (formula)
    formula.innerHTML =
      "<b>" +
      modelConfig.controlWeight +
      "%</b> Existing control score <span>+</span><b>" +
      modelConfig.anomalyWeight +
      "%</b> Legacy Statistical Score <span>+</span> " +
      modelConfig.interactionMultiplier +
      "% of legacy pattern adjustment. Trained model outputs are never blended into this simulation.";
  if (thresholds)
    thresholds.innerHTML =
      '<span><i class="low-dot"></i>Low 0–' +
      modelConfig.lowMax +
      '</span><span><i class="medium-dot"></i>Medium ' +
      (modelConfig.lowMax + 1) +
      "–" +
      (modelConfig.highMin - 1) +
      '</span><span><i class="high-dot"></i>High ' +
      modelConfig.highMin +
      "–100</span>";
  if (appendixFormula)
    appendixFormula.innerHTML =
      "<b>" +
      modelConfig.controlWeight +
      "%</b> Existing Control Score <span>+</span><b>" +
      modelConfig.anomalyWeight +
      "%</b> Legacy Statistical Score <span>+</span> " +
      modelConfig.interactionMultiplier +
      "% of legacy Pattern Adjustment. This formula applies only to the legacy statistical demo.";
}

const scenarioReviewStages = ["Specialist Review", "Testing", "GM Approval", "Approved", "Active"];
const scenarioReviewActions = {
  submit: ["Submit scenario for approval", "Specialist"],
  review: ["Accept for testing", "Specialist"],
  "pass-test": ["Record test passed", "Data & AI"],
  approve: ["Approve scenario", "GM"],
  activate: ["Activate approved example", "GM"],
  reject: ["Reject scenario", null],
};
function renderScenarioGovernance(item) {
  if (item.source !== "Manual sandbox input" && !item.scenarioProposal) return "";
  const proposal = scenarioProposals.find((entry) => entry.caseId === item.id);
  const stage = proposal?.status || item.scenarioProposal?.status || "Not submitted";
  const nextAction = { "Not submitted": "submit", "Specialist Review": "review", Testing: "pass-test", "GM Approval": "approve", Approved: "activate" }[stage];
  const stageIndex = scenarioReviewStages.indexOf(stage);
  const timeline = (proposal?.history || []).map((entry) => `<li><strong>${escapeHtml(entry.status)}</strong><span>${escapeHtml(entry.actorName)} · ${escapeHtml(entry.role)} · ${escapeHtml(new Date(entry.at).toLocaleString())}</span><p>${escapeHtml(entry.note)}</p></li>`).join("");
  return `<section class="detail-section scenario-governance"><div class="summary-heading"><h3 class="detail-title">SCENARIO APPROVAL</h3><span class="scenario-status">${escapeHtml(stage)}</span></div>
    <p class="scenario-description">Submit a reviewed New Assessment scenario as a reusable example for its journey.</p>
    <ol class="scenario-stage-list">${scenarioReviewStages.map((label, index) => `<li class="${stage !== "Rejected" && index <= stageIndex ? "reached" : ""}">${escapeHtml(label)}</li>`).join("")}</ol>
    ${!item.outcome ? '<p class="warning-note">Record the specialist outcome first, then submit this scenario for approval.</p>' : ""}
    <div class="action-row">${nextAction ? `<button type="button" class="secondary-btn" data-scenario-action="${nextAction}" ${!item.outcome ? "disabled" : ""}>${scenarioReviewActions[nextAction][0]}</button>` : ""}${stageIndex >= 0 && stage !== "Active" ? '<button type="button" class="secondary-btn" data-scenario-action="reject">Reject</button>' : ""}</div>
    ${timeline ? `<ol class="scenario-review-history">${timeline}</ol>` : ""}
    <p class="session-note">Activation adds an approved example to New Assessment. Model training and scoring weights are unchanged by this approval.</p></section>`;
}
function openScenarioReview(item, action) {
  const proposal = scenarioProposals.find((entry) => entry.caseId === item.id);
  const info = scenarioReviewActions[action];
  scenarioReviewRequest = { caseId: item.id, action, expectedStatus: proposal?.status };
  document.querySelector("#scenario-review-title").textContent = info[0];
  document.querySelector("#scenario-review-context").textContent = item.transactionId + " · " + item.journey + " · " + item.scenario;
  const role = info[1] || { "Specialist Review": "Specialist", Testing: "Data & AI", "GM Approval": "GM", Approved: "GM" }[proposal?.status] || "Specialist";
  document.querySelector("#scenario-review-role").value = role;
  document.querySelector("#scenario-review-role").disabled = true;
  document.querySelector("#scenario-review-note").value = "";
  document.querySelector("#scenario-review-error").textContent = "";
  document.querySelector("#scenario-review-dialog").showModal();
}
async function loadScenarioProposals() {
  const response = await fetch(backendBaseUrl + "/scenario-proposals", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok || !Array.isArray(result.proposals)) throw new Error(result.error || "Could not load scenario approvals");
  scenarioProposals = result.proposals;
  const select = document.querySelector("#assessment-approved-scenario");
  select.innerHTML = '<option value="">Create a new scenario</option>' + scenarioProposals.filter((entry) => entry.status === "Active").map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.journey + " · " + entry.scenario)}</option>`).join("");
  renderCase();
}
document.querySelector("#scenario-review-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!scenarioReviewRequest) return;
  const button = document.querySelector("#save-scenario-review");
  button.disabled = true;
  try {
    const response = await fetch(backendBaseUrl + "/scenario-proposals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scenarioReviewRequest, role: document.querySelector("#scenario-review-role").value, actorName: document.querySelector("#scenario-review-name").value.trim(), note: document.querySelector("#scenario-review-note").value.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Review could not be saved");
    const item = cases.find((entry) => entry.id === scenarioReviewRequest.caseId);
    if (item) item.scenarioProposal = { id: result.proposal.id, status: result.proposal.status, updatedAt: result.proposal.updatedAt };
    await loadScenarioProposals();
    document.querySelector("#scenario-review-dialog").close();
    showToast("Scenario review saved: " + result.proposal.status);
  } catch (error) { document.querySelector("#scenario-review-error").textContent = error.message; }
  finally { button.disabled = false; }
});
["#close-scenario-review", "#cancel-scenario-review"].forEach((selector) => document.querySelector(selector).addEventListener("click", () => document.querySelector("#scenario-review-dialog").close()));
document.querySelector("#assessment-approved-scenario").addEventListener("change", (event) => {
  const proposal = scenarioProposals.find((entry) => entry.id === event.target.value && entry.status === "Active");
  if (!proposal) return;
  document.querySelector("#assessment-journey").value = proposal.journey;
  document.querySelector("#assessment-scenario").value = proposal.scenario;
  syncJourneyFeatureFields();
});

async function loadIndicatorSuggestions() {
  const status = document.querySelector("#indicator-suggestion-status");
  if (!status) return;
  try {
    const response = await fetch(backendBaseUrl + "/indicator-suggestions", { cache: "no-store" });
    const saved = await response.json();
    if (!response.ok || !Array.isArray(saved)) throw new Error("Could not load suggestions");
    for (let index = indicators.length - 1; index >= 0; index -= 1) {
      if (indicators[index].backendId) indicators.splice(index, 1);
    }
    saved.forEach((proposal) => indicators.push({
      backendId: proposal.id,
      code: proposal.code,
      name: proposal.name,
      source: "Confirmed synthetic outcomes",
      weight: null,
      status: proposal.status,
      detail: proposal.detail + " Evidence cases: " + (proposal.evidenceCount || proposal.confirmedCases || 0),
    }));
    status.textContent = saved.length
      ? saved.length + " saved suggestion(s), generated from repeated confirmed synthetic outcomes."
      : "No repeated confirmed synthetic pattern yet. Record at least two relevant confirmed synthetic outcomes, then analyze again.";
    renderIndicators();
  } catch (error) {
    status.textContent = "Suggestions unavailable: " + error.message;
  }
}

async function renderIndicators() {
  try { const states = JSON.parse(localStorage.getItem("madar-indicator-demo-states") || "{}"); indicators.forEach(item => { if (!item.backendId && states[item.code] === "Testing" && item.status === "Proposed") item.status = "Testing"; }); } catch {}
  const approved = indicators.filter(function (item) {
    return item.status === "Approved";
  }).length;
  const proposed = indicators.filter(function (item) {
    return item.status === "Proposed" || item.status === "Testing";
  }).length;
  document.querySelector("#indicator-summary").textContent =
    approved + " approved · " + proposed + " proposed/testing";
  document.querySelector("#indicator-table").innerHTML = [
    '<div class="indicator-row header"><div>Indicator</div><div>Source</div><div>Prototype contribution</div><div>Status</div><div>Governed action</div></div>',
    indicators
      .map(function (item, index) {
        const stateClass =
          item.status === "Approved"
            ? "approved"
            : item.status === "Testing"
              ? "testing"
              : item.status === "Monitoring"
                ? "neutral"
                : "proposed";
        const featureKey = INDICATOR_FEATURE_MAP[item.code];
        const activeWeight = featureKey
          ? modelConfig.featureWeights[featureKey]
          : item.weight;
        const action =
          item.status === "Approved"
            ? '<button class="indicator-action" data-open-simulation>Simulate change</button>'
            : item.status === "Proposed" && item.backendId
              ? '<button class="indicator-action" data-send-backend-test="' + escapeHtml(item.backendId) + '">Submit for testing</button>'
              : item.status === "Proposed"
                ? '<button class="indicator-action" data-send-test="' + index + '">Submit for testing</button>'
                : item.status === "Testing"
                ? '<span class="muted-action">Controlled test requested</span>'
                : '<span class="muted-action">Observation only</span>';
        return (
          '<div class="indicator-row"><div class="indicator-name"><strong>' +
          escapeHtml(item.name) +
          "</strong><small>" +
          escapeHtml(item.code + " · " + item.detail) +
          "</small></div><div>" +
          escapeHtml(item.source) +
          "</div><div>" +
          (activeWeight == null ? "Not active" : activeWeight + " points") +
          '</div><div><span class="' +
          stateClass +
          '">' +
          escapeHtml(item.status) +
          "</span></div><div>" +
          action +
          "</div></div>"
        );
      })
      .join(""),
  ].join("");
  document.querySelectorAll("[data-send-test]").forEach(function (button) {
    button.addEventListener("click", function () {
      const item = indicators[Number(button.dataset.sendTest)];
      item.status = "Testing";
      try { const states = JSON.parse(localStorage.getItem("madar-indicator-demo-states") || "{}"); states[item.code] = "Testing"; localStorage.setItem("madar-indicator-demo-states", JSON.stringify(states)); } catch {}
      showToast(
        item.code + " demo testing request saved in this browser — not activated",
      );
      renderIndicators();
    });
  });
  document.querySelectorAll("[data-send-backend-test]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch(backendBaseUrl + "/indicator-suggestions/" + encodeURIComponent(button.dataset.sendBackendTest), {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Testing" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not submit suggestion");
        await loadIndicatorSuggestions();
        showToast("Suggestion submitted for testing. It is not active.");
      } catch (error) { showToast(error.message); }
    });
  });
  document
    .querySelectorAll("[data-open-simulation]")
    .forEach(function (button) {
      button.addEventListener("click", function () {
        switchView("simulation");
      });
    });
}

document.querySelector("#generate-indicator-suggestions").addEventListener("click", async function () {
  const status = document.querySelector("#indicator-suggestion-status");
  status.textContent = "Reviewing saved synthetic specialist outcomes…";
  try {
    const response = await fetch(backendBaseUrl + "/indicator-suggestions/generate", { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Suggestion analysis failed");
    await loadIndicatorSuggestions();
    if (!result.proposals.length) status.textContent = "No repeated pattern was strong enough to propose. At least two confirmed synthetic cases with the same reason are required.";
  } catch (error) { status.textContent = "Suggestion analysis failed: " + error.message; }
});

function countCasesBy(list, getter) {
  return list.reduce(function (result, item) {
    const key = getter(item) || "Not recorded";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function topEntry(counts) {
  return (
    Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    })[0] || "No data"
  );
}

function renderExecutiveDashboard() {
  const cases = portfolioCases();
  const total = cases.length;
  const high = cases.filter(function (item) {
    return item.risk === "High";
  });
  const medium = cases.filter(function (item) {
    return item.risk === "Medium";
  });
  const low = cases.filter(function (item) {
    return item.risk === "Low";
  });
  const awaiting = cases.filter(function (item) {
    return item.status === "Awaiting specialist";
  });
  const outcomes = cases.filter(function (item) {
    return item.outcome;
  });
  const dq = cases.filter(function (item) {
    return item.features.missingData || item.features.crossSourceConflict;
  });
  const decisions = cases.filter(function (item) {
    return (
      item.status !== "Awaiting specialist" &&
      item.status !== "Ready to proceed"
    );
  });
  const financial = financialPortfolio(cases);
  const postPayment = cases.filter(function (item) {
    return (
      item.detectionStage === "After payment" &&
      (isSuspected(item) || isConfirmedFraud(item))
    );
  });
  const metrics = [
    [
      "Risk cases detected",
      financial.detected.length,
      "Medium and high-risk activity identified",
      "high-stat",
    ],
    [
      "Potential amount at risk",
      formatSar(financial.amountAtRisk),
      "Supplied exposure; unavailable if evidence is missing",
      "medium-stat",
    ],
    [
      "Cases prevented",
      financial.prevented.length,
      "Recorded synthetic interventions",
      "low-stat",
    ],
    [
      "Amount prevented",
      formatSar(financial.preventedAmount),
      "Recorded synthetic value; not realised savings",
      "low-stat",
    ],
    [
      "Suspected fraud",
      financial.suspected.length,
      "Recorded specialist classification",
      "review-stat",
    ],
    [
      "Confirmed fraud",
      financial.confirmed.length,
      formatSar(financial.confirmedAmount) + " confirmed amount",
      "outside-stat",
    ],
  ];
  document.querySelector("#executive-metrics").innerHTML = metrics
    .map(function (item) {
      return (
        '<article class="metric-card ' +
        item[3] +
        '"><span class="label">' +
        item[0] +
        "</span><strong>" +
        item[1] +
        "</strong><small>" +
        item[2] +
        "</small></article>"
      );
    })
    .join("");

  const funnel = [
    ["Assessed", total, "All activity"],
    ["Risk detected", financial.detected.length, "Medium or high assessment"],
    [
      "Specialist suspected",
      financial.suspected.length,
      "Further investigation",
    ],
    [
      "Fraud confirmed",
      financial.confirmed.length,
      "Formally established outcome",
    ],
    [
      "Prevented before payment",
      financial.prevented.length,
      "Recorded synthetic intervention",
    ],
  ];
  document.querySelector("#executive-funnel").innerHTML = funnel
    .map(function (item, index) {
      const width = total
        ? Math.max(18, Math.round((item[1] / total) * 100))
        : 18;
      return (
        '<div class="funnel-row"><div><span>' +
        (index + 1) +
        "</span><strong>" +
        item[0] +
        "</strong><small>" +
        item[2] +
        '</small></div><div class="funnel-bar"><i style="width:' +
        width +
        '%"></i></div><b>' +
        item[1] +
        "</b></div>"
      );
    })
    .join("");

  const journeyCounts = countCasesBy(cases, function (item) {
    return item.journey;
  });
  const maxJourney = Math.max.apply(
    null,
    Object.values(journeyCounts).concat([1]),
  );
  document.querySelector("#executive-journeys").innerHTML = Object.keys(
    journeyCounts,
  )
    .sort(function (a, b) {
      return journeyCounts[b] - journeyCounts[a];
    })
    .map(function (name) {
      const journeyHigh = cases.filter(function (item) {
        return item.journey === name && item.risk === "High";
      }).length;
      const journeyFinancial = financialPortfolio(
        cases.filter(function (item) {
          return item.journey === name;
        }),
      );
      return (
        '<button data-executive-journey="' +
        escapeHtml(name) +
        '"><div><strong>' +
        escapeHtml(name) +
        "</strong><small>" +
        journeyFinancial.detected.length +
        " detected · " +
        journeyFinancial.prevented.length +
        " prevented · " +
        formatSar(journeyFinancial.preventedAmount) +
        '</small></div><span><i style="width:' +
        Math.round((journeyCounts[name] / maxJourney) * 100) +
        '%"></i></span><b>' +
        journeyCounts[name] +
        "</b></button>"
      );
    })
    .join("");

  const topSignals = {};
  cases.forEach(function (item) {
    item.signals.forEach(function (signal) {
      if (!["MODEL_NOT_FLAGGED","LOWER_BEHAVIORAL_DEVIATION","NO_MATERIAL_ANOMALY","EVIDENCE_INCOMPLETE","COMBINED_PATTERN"].includes(signal[0])) topSignals[signal[0]] = (topSignals[signal[0]] || 0) + 1;
    });
  });
  const leadingSignal = topEntry(topSignals);
  const attention = [
    {
      label: "Unresolved high-risk activity",
      value: high.filter(function (item) {
        return !item.outcome;
      }).length,
      detail: "Requires prioritized specialist decision",
      caseItem: high.find(function (item) {
        return !item.outcome;
      }),
    },
    {
      label: "Low-confidence assessments",
      value: cases.filter(function (item) {
        return item.confidence === "Low";
      }).length,
      detail: "Evidence must be completed before reliance",
      caseItem: cases.find(function (item) {
        return item.confidence === "Low";
      }),
    },
    {
      label: "Data-quality exceptions",
      value: dq.length,
      detail: "Route issues to the accountable data owner",
      caseItem: dq[0],
    },
    {
      label: "Most recurring signal",
      value: topSignals[leadingSignal] || 0,
      detail: leadingSignal.replace(/_/g, " "),
      caseItem: cases.find(function (item) {
        return item.signals.some(function (signal) {
          return signal[0] === leadingSignal;
        });
      }),
    },
  ];
  document.querySelector("#executive-attention-count").textContent =
    attention.reduce(function (sum, item) {
      return sum + (item.value ? 1 : 0);
    }, 0);
  document.querySelector("#executive-attention-list").innerHTML = attention
    .map(function (item) {
      return (
        "<button " +
        (item.caseItem
          ? 'data-case-link="' + escapeHtml(item.caseItem.id) + '"'
          : "disabled") +
        "><span>" +
        item.value +
        "</span><div><strong>" +
        escapeHtml(item.label) +
        "</strong><small>" +
        escapeHtml(item.detail) +
        "</small></div><b>Review →</b></button>"
      );
    })
    .join("");
  wireCaseLinks();

  const realization = [
    [
      formatSar(financial.assessedAmount),
      "Total synthetic transaction value assessed",
    ],
    [
      formatSar(financial.amountAtRisk),
      "Potential exposure detected for review",
    ],
    [
      formatSar(financial.confirmedAmount),
      "Amount linked to confirmed fraud outcomes",
    ],
    [
      formatSar(financial.preventedAmount),
      "Amount prevented before or during payment",
    ],
    [postPayment.length, "Suspected or confirmed cases detected after payment"],
  ];
  document.querySelector("#benefit-realization").innerHTML = realization
    .map(function (item) {
      return (
        "<div><strong>" +
        item[0] +
        "</strong><span>" +
        item[1] +
        "</span></div>"
      );
    })
    .join("");
  document
    .querySelectorAll("[data-executive-journey]")
    .forEach(function (button) {
      button.addEventListener("click", function () {
        activeJourney = button.dataset.executiveJourney;
        populateSelects();
        switchView("queue");
        resetVisibleSelection();
      });
    });
}

function reportCases() {
  const cases = portfolioCases();
  const journey = document.querySelector("#report-journey")
    ? document.querySelector("#report-journey").value
    : "All";
  const owner = document.querySelector("#report-owner")
    ? document.querySelector("#report-owner").value
    : "Enterprise";
  return cases.filter(function (item) {
    const journeyMatch = journey === "All" || item.journey === journey;
    const ownerMatch =
      owner === "Enterprise" || businessOwnerForJourney(item.journey) === owner;
    const month = document.querySelector("#report-month")?.value;
    const date = item.assessedAt || item.requested || item.decisionDate || "";
    return journeyMatch && ownerMatch && (!month || String(date).slice(0, 7) === month);
  });
}

function renderBusinessReport() {
  const list = reportCases();
  const total = list.length;
  const high = list.filter(function (item) {
    return item.risk === "High";
  });
  const medium = list.filter(function (item) {
    return item.risk === "Medium";
  });
  const low = list.filter(function (item) {
    return item.risk === "Low";
  });
  const outcomes = list.filter(function (item) {
    return item.outcome;
  });
  const overrides = list.filter(function (item) {
    return item.status === "Route overridden";
  });
  const dq = list.filter(function (item) {
    return item.features.missingData || item.features.crossSourceConflict;
  });
  const financial = financialPortfolio(list);
  const metrics = [
    [
      "Risk cases detected",
      financial.detected.length,
      "Medium and high-risk activity",
      "high-stat",
    ],
    [
      "Potential amount at risk",
      formatSar(financial.amountAtRisk),
      "Supplied exposure; unavailable if evidence is missing",
      "medium-stat",
    ],
    [
      "Suspected fraud",
      financial.suspected.length,
      "Specialist classification",
      "review-stat",
    ],
    [
      "Confirmed fraud",
      financial.confirmed.length,
      formatSar(financial.confirmedAmount) + " confirmed",
      "outside-stat",
    ],
    [
      "Cases prevented",
      financial.prevented.length,
      "Recorded synthetic intervention",
      "low-stat",
    ],
    [
      "Amount prevented",
      formatSar(financial.preventedAmount),
      "Before or during payment",
      "low-stat",
    ],
  ];
  document.querySelector("#report-metrics").innerHTML = metrics
    .map(function (item) {
      return (
        '<article class="metric-card ' +
        item[3] +
        '"><span class="label">' +
        item[0] +
        "</span><strong>" +
        item[1] +
        "</strong><small>" +
        item[2] +
        "</small></article>"
      );
    })
    .join("");

  const signalCounts = {};
  list.forEach(function (item) {
    item.signals.forEach(function (signal) {
      if (!["COMBINED_PATTERN", "MODEL_NOT_FLAGGED", "LOWER_BEHAVIORAL_DEVIATION", "NO_MATERIAL_ANOMALY", "EVIDENCE_INCOMPLETE", "REQUIRED_INFORMATION_MISSING"].includes(signal[0]))
        signalCounts[signal[0]] = (signalCounts[signal[0]] || 0) + 1;
    });
  });
  const leadSignal = topEntry(signalCounts);
  const journeyCounts = countCasesBy(list, function (item) {
    return item.journey;
  });
  const leadJourney = topEntry(journeyCounts);
  const pendingHigh = list.filter(function (item) {
    return !item.outcome && ["High", "Medium"].includes(item.risk);
  }).length;
  const summary = total
    ? "<p><strong>" +
      total +
      " cases</strong> were assessed. Total supplied transaction value: <strong>" +
      formatSar(financial.assessedAmount) +
      "</strong>. The model or control policy flagged <strong>" +
      financial.detected.length +
      " cases for review</strong>. Supplied potential exposure: <strong>" +
      formatSar(financial.amountAtRisk) +
      "</strong>. Specialists classified <strong>" +
      financial.suspected.length +
      "</strong> as suspected fraud and <strong>" +
      financial.confirmed.length +
      "</strong> as confirmed fraud, with a confirmed amount of <strong>" +
      formatSar(financial.confirmedAmount) +
      "</strong>. <strong>" +
      financial.prevented.length +
      " cases</strong> were recorded as prevented, representing <strong>" +
      formatSar(financial.preventedAmount) +
      "</strong>. The highest-volume journey was <strong>" +
      escapeHtml(leadJourney) +
      "</strong>; the business owner should prioritize the <strong>" +
      pendingHigh +
      "</strong> unresolved medium- and high-risk cases and address the leading signal, <strong>" +
      escapeHtml(leadSignal.replace(/_/g, " ")) +
      "</strong>.</p>"
    : '<div class="empty-state"><strong>No cases match the selected report scope.</strong><p>Choose another journey or owner to generate the report.</p></div>';
  document.querySelector("#monthly-ai-summary").innerHTML = summary + (list.some(item => item.assessmentSource === "cross-journey") ? '<p class="session-note"><strong>Financial evidence:</strong> connected-journey examples do not supply transaction amounts. They contribute case counts, but no quantified exposure or savings. Financial totals only reflect supplied amounts.</p>' : "");

  const journeyRows = Object.keys(journeyCounts)
    .sort(function (a, b) {
      return journeyCounts[b] - journeyCounts[a];
    })
    .map(function (journey) {
      const journeyList = list.filter(function (item) {
        return item.journey === journey;
      });
      const values = financialPortfolio(journeyList);
      return (
        "<tr><td><strong>" +
        escapeHtml(journey) +
        "</strong><small>" +
        escapeHtml(businessOwnerForJourney(journey)) +
        "</small></td><td>" +
        journeyList.length +
        "</td><td>" +
        values.detected.length +
        "</td><td>" +
        formatSar(values.amountAtRisk) +
        "</td><td>" +
        values.suspected.length +
        "</td><td>" +
        values.confirmed.length +
        "</td><td>" +
        values.prevented.length +
        "</td><td><strong>" +
        formatSar(values.preventedAmount) +
        "</strong></td></tr>"
      );
    })
    .join("");
  document.querySelector("#report-financial-journeys").innerHTML =
    journeyRows ||
    '<tr><td colspan="8"><div class="empty-state">No financial data in this report scope.</div></td></tr>';

  const outcomeCounts = countCasesBy(outcomes, function (item) {
    return item.outcome;
  });
  const distributionGroups = [
    ["Risk", { High: high.length, Medium: medium.length, Low: low.length }],
    [
      "Review feedback",
      Object.keys(outcomeCounts).length
        ? outcomeCounts
        : { "Not yet recorded": Math.max(0, total - outcomes.length) },
    ],
  ];
  document.querySelector("#report-distributions").innerHTML = distributionGroups
    .map(function (group) {
      const groupTotal = Math.max(
        1,
        Object.values(group[1]).reduce(function (sum, value) {
          return sum + value;
        }, 0),
      );
      return (
        '<div class="distribution-group"><strong>' +
        group[0] +
        "</strong>" +
        Object.keys(group[1])
          .sort(function (a, b) {
            return group[1][b] - group[1][a];
          })
          .map(function (key) {
            return (
              "<div><span>" +
              escapeHtml(key) +
              '</span><i><b style="width:' +
              Math.round((group[1][key] / groupTotal) * 100) +
              '%"></b></i><em>' +
              group[1][key] +
              "</em></div>"
            );
          })
          .join("") +
        "</div>"
      );
    })
    .join("");

  const orderedSignals = Object.keys(signalCounts)
    .sort(function (a, b) {
      return signalCounts[b] - signalCounts[a];
    })
    .slice(0, 5);
  document.querySelector("#report-signals").innerHTML = orderedSignals.length
    ? orderedSignals
        .map(function (code, index) {
          return (
            '<button data-signal-code="' +
            escapeHtml(code) +
            '"><span>' +
            (index + 1) +
            "</span><div><strong>" +
            escapeHtml(code.replace(/_/g, " ")) +
            "</strong><small>Observed across " +
            signalCounts[code] +
            " assessed case" +
            (signalCounts[code] === 1 ? "" : "s") +
            "</small></div><b>" +
            signalCounts[code] +
            "</b></button>"
          );
        })
        .join("")
    : '<div class="empty-state"><strong>No recurring signals in this scope.</strong></div>';

  const actionRows = [
    [
      pendingHigh + " high-risk cases without recorded outcomes",
      "Complete specialist review and capture the validated outcome",
      "Fraud Prevention, Detection & Inspection",
      pendingHigh ? "High" : "Low",
      pendingHigh ? "Open" : "Monitored",
    ],
    [
      dq.length + " data-quality exceptions",
      "Correct the source issue and resubmit affected cases for assessment",
      "Data Owner / Data Quality",
      dq.length ? "High" : "Low",
      dq.length ? "Open" : "Monitored",
    ],
    [
      (signalCounts[leadSignal] || 0) +
        " occurrences of " +
        leadSignal.replace(/_/g, " "),
      "Review root cause and assess a governed control or indicator improvement",
      "Service Owner + Fraud Detection",
      signalCounts[leadSignal] ? "Medium" : "Low",
      "For review",
    ],
    [
      overrides.length + " specialist route overrides",
      "Review override evidence for model or threshold calibration",
      "Data & AI + Domain Owner",
      overrides.length ? "Medium" : "Low",
      overrides.length ? "For review" : "Monitored",
    ],
  ];
  document.querySelector("#report-actions").innerHTML = actionRows
    .map(function (row) {
      return (
        "<tr><td>" +
        escapeHtml(row[0]) +
        "</td><td>" +
        escapeHtml(row[1]) +
        "</td><td>" +
        escapeHtml(row[2]) +
        '</td><td><span class="priority-chip ' +
        row[3].toLowerCase() +
        '">' +
        row[3] +
        '</span></td><td><span class="status-chip">' +
        row[4] +
        "</span></td></tr>"
      );
    })
    .join("");
  document.querySelectorAll("[data-signal-code]").forEach(function (button) {
    button.addEventListener("click", function () {
      searchQuery = button.dataset.signalCode;
      activeFilter = "All"; activeJourney = "All"; activeRegion = "All"; populateSelects();
      document.querySelector("#case-search").value = searchQuery;
      switchView("queue");
      resetVisibleSelection();
    });
  });
}

function renderAll() {
  document.querySelectorAll(".filter").forEach(function (item) {
    item.classList.toggle("active", item.dataset.filter === activeFilter);
  });
  populateSelects();
  renderDashboard();
  renderQueue();
  renderSimulation();
  renderIndicators();
  renderExecutiveDashboard();
  renderBusinessReport();
  renderModelState();
  document.querySelector('#portfolio-scope-note').textContent = portfolioScope === 'assessed' ? 'Saved synthetic assessments only · no live enterprise connections' : 'Illustrative portfolio only · seeded outcomes and amounts, not model results';
  document.querySelector("#last-updated").textContent =
    "Synthetic feed · updated " +
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resetVisibleSelection() {
  const visible = filteredCases();
  if (!visible.length) selectedId = null;
  if (
    visible.length &&
    !visible.some(function (item) {
      return item.id === selectedId;
    })
  )
    selectedId = visible[0].id;
  renderQueue();
}

function buildBackendCaseFromForm(suffix, raw) {
  const asOf = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const id = "SYN-ui-" + suffix;
  const events = [];

  const workforce = Number(document.querySelector("#model-workforce").value);

  const previousWage = Number(
    document.querySelector("#model-previous-wage").value,
  );

  const currentWage = Number(
    document.querySelector("#model-current-wage").value,
  );

  const amendmentCount = Number(
    document.querySelector("#model-amendments").value,
  );

  const exclusionCount = Number(
    document.querySelector("#model-exclusions").value,
  );

  const supervisorCount = Number(
    document.querySelector("#model-supervisor-changes").value,
  );

  // سجل أجرين كي يستطيع النموذج حساب نسبة التغيير.
  events.push({
    type: "wage",
    recordedAt: asOf - 60 * day,
    amount: previousWage,
    subject: id,
  });

  events.push({
    type: "wage",
    recordedAt: asOf - 7 * day,
    amount: currentWage,
    subject: id,
  });

  // حوّلي عدد التعديلات والأيام بأثر رجعي إلى أحداث اصطناعية.
  for (let index = 0; index < amendmentCount; index += 1) {
    const recordedAt = asOf - (index + 1) * day;

    events.push({
      type: "amendment",
      recordedAt,
      effectiveAt: recordedAt - Number(raw.features.retroDays) * day,
      subject: id,
    });
  }

  // أنشئي أحداث الاستبعاد خلال آخر 7 أيام.
  for (let index = 0; index < exclusionCount; index += 1) {
    events.push({
      type: "employer_exclusion",
      recordedAt: asOf - ((index % 7) + 1) * day,
      subject: "SYN-PEER-" + index,
    });
  }

  // أنشئي تغييرات المشرف خلال آخر 24 ساعة.
  for (let index = 0; index < supervisorCount; index += 1) {
    events.push({
      type: "supervisor_change",
      recordedAt: asOf - ((index % 24) + 1) * hour,
      subject: "SYN-PEER-" + index,
    });
  }

  events.push({
    type: "claim",
    recordedAt: asOf,
    subject: id,
  });

  return {
    id,
    transactionId: raw.transactionId,
    synthetic: true,
    asOf,
    workforce,
    events,
  };
}
function parseBoolean(value) {
  const normalized = String(value == null ? "" : value).trim().toLowerCase();
  return ["1","true","yes","y"].indexOf(normalized) >= 0 ? 1 : 0;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some(function(value){ return value.trim() !== ""; })) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some(function(value){ return value.trim() !== ""; })) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function csvEscape(value) {
  const string = String(value == null ? "" : value);
  return /[",\n]/.test(string) ? '"' + string.replace(/"/g, '""') + '"' : string;
}

async function importCSVText(text, mode, label) {
  const started = performance.now();
  useAssessedPortfolio();
  const controls = [document.querySelector("#import-file-btn"), document.querySelector("#import-paste-btn")];
  controls.forEach((button) => button.disabled = true);
  try {
    const matrix = parseCSV(text.trim());
    if (matrix.length < 2) throw new Error("CSV needs a header and at least one evidence row.");

    const headers = matrix[0].map(normalizeHeader);
    if (headers.includes("case_id") && headers.includes("event_id")) {
      await window.madarImportEvents(text); return;
    }
    if (matrix.length - 1 > 200) throw new Error("Import at most 200 synthetic cases per batch.");
    const required = ["synthetic", "journey", "scenario", "subject_id", "existing_control_score"];
    const missing = required.filter((key) => !headers.includes(key));
    if (missing.length) throw new Error("Missing columns: " + missing.join(", ") + ". Download the current evidence template.");
    const rows = [], errors = [];
    const finite = (value, name) => { if (value === "" || !Number.isFinite(Number(value))) throw new Error(name + " must be a finite number."); return Number(value); };
    matrix.slice(1).forEach((values, index) => {
      try {
        const row = Object.fromEntries(headers.map((key, col) => [key, String(values[col] ?? "").trim()]));
        if (!parseBoolean(row.synthetic)) throw new Error("Only explicitly synthetic rows are permitted.");
        if (!row.scenario || !row.subject_id) throw new Error("Scenario and subject are required.");
        const controlScore = finite(row.existing_control_score, "existing_control_score");
        if (controlScore < 0 || controlScore > 100) throw new Error("Existing control score must be 0–100.");
        if (row.transaction_id && rows.some(item => item.transactionId === row.transaction_id)) throw new Error("Duplicate transaction in this file.");
        const existing = row.transaction_id && cases.find(item => item.assessmentSource === "csv-upload" && item.transactionId === row.transaction_id);
        const id = existing?.id || "UPL-" + crypto.randomUUID().slice(0, 8).toUpperCase();
        const raw = { customerName: row.subject_id, employerName: row.related_entity || "Not supplied", nationalIdMasked: "Not supplied", mobileMasked: "Not supplied", employerNumber: row.related_entity || "Not supplied", supervisorName: "Not supplied", supervisorUserId: "Not supplied", supervisorMobileMasked: "Not supplied", id, synthetic: true, transactionId: row.transaction_id || "TX-" + id, journey: row.journey, scenario: row.scenario, subject: row.subject_id, entity: row.related_entity || "—", source: "Imported · " + label, requested: row.requested_at || new Date().toISOString(), country: row.country || "Saudi Arabia", region: row.region || "Riyadh", city: row.city || "Riyadh", ruleScore: controlScore, transactionAmount: row.transaction_amount === "" || row.transaction_amount == null ? null : finite(row.transaction_amount, "transaction_amount"), amountAtRisk: row.amount_at_risk === "" || row.amount_at_risk == null ? null : finite(row.amount_at_risk, "amount_at_risk"), currency: "SAR", paymentStatus: row.payment_status || "Pending", detectionStage: row.detection_stage || "Before payment", features: { missingData: parseBoolean(row.required_information_missing), crossSourceConflict: parseBoolean(row.cross_source_conflict) } };
        if (row.journey === "SANED") {
          if (row.saned_case_id) raw.modelInput = { case_id: row.saned_case_id };
          else if (row.events_json) {
            const asOf = /^\d+$/.test(row.as_of || "") ? Number(row.as_of) : Date.parse(row.as_of || "");
            raw.modelInput = { sanedCase: { id: row.subject_id, synthetic: true, workforce: row.workforce ? finite(row.workforce, "workforce") : null, asOf: Number.isFinite(asOf) ? asOf : null, events: JSON.parse(row.events_json) } };
          }
        } else raw.journeyFeatures = row.journey_features_json ? JSON.parse(row.journey_features_json) : {};
        rows.push(raw);
      } catch (error) { errors.push("Row " + (index + 2) + ": " + error.message); }
    });
    if (!rows.length) throw new Error("No valid rows. " + errors.join(" "));
    const result = await backendJSON("/upload", { csv: text, mode, rows }, 30000);
    useAssessedPortfolio();
    const accepted = result.saved.map((entry) => entry.caseData);
    if (mode === "replace") cases = cases.filter((item) => item.assessmentSource !== "csv-upload" && !String(item.source || "").startsWith("Imported · ")).concat(accepted); else cases = cases.filter(item => !accepted.some(next => next.id === item.id)).concat(accepted);
    importedCount = mode === "replace" ? accepted.length : importedCount + accepted.length;
    selectedId = accepted[0].id; activeFilter = "All"; activeJourney = "All"; activeRegion = "All"; searchQuery = "";
    const rejected = errors.concat((result.rejected || []).map((entry) => "Backend row " + entry.row + ": " + entry.error));
    document.querySelector("#import-status").textContent = result.incomplete ? "Saved · evidence incomplete" : "Model assessment saved";
    document.querySelector("#import-status").className = "status-chip " + (result.incomplete ? "testing" : "approved");
    document.querySelector("#import-result").className = "import-result";
    document.querySelector("#import-result").innerHTML = `<div class="import-summary-grid"><div><span>Saved cases</span><strong>${accepted.length}</strong></div><div><span>Model complete</span><strong>${result.complete}</strong></div><div><span>Complete evidence</span><strong>${result.incomplete}</strong></div><div><span>Rejected</span><strong>${rejected.length}</strong></div></div><p>${Math.round(performance.now() - started)} ms · Synthetic evidence assessed by the backend, with model version and original model fields retained.</p>${rejected.length ? '<p class="import-warning">' + escapeHtml(rejected.join(" ")) + '</p>' : ""}<p class="session-note">Operational control score is separate from the unusualness percentile. Incomplete evidence is not low risk. Select a row to inspect all model fields.</p>`;
    renderAll(); loadBackendHistory();
    showToast(accepted.length + " cases saved with actual model responses.");
  } catch (error) { showImportError(error.message); }
  finally { document.querySelector("#import-paste-btn").disabled = false; document.querySelector("#import-file-btn").disabled = !pendingFile; }
}

function showImportError(message) {
  document.querySelector("#import-status").textContent = "Needs correction";
  document.querySelector("#import-status").className = "status-chip error";
  document.querySelector("#import-result").className = "import-result";
  document.querySelector("#import-result").innerHTML = '<div class="import-warning"><strong>Import could not be completed</strong><p>' + escapeHtml(message) + '</p><small>Correct the file and run validation again. Existing session data has not changed.</small></div>';
  showToast("Import needs correction");
}

function downloadTemplate() {
  const headers = ["synthetic", "transaction_id", "journey", "scenario", "subject_id", "related_entity", "existing_control_score", "transaction_amount", "amount_at_risk", "saned_case_id", "workforce", "as_of", "events_json", "journey_features_json"];
  const rows = [
    [true,"SANED-DEMO-ROUTINE","SANED","Routine synthetic history","SYN-demo-00000","SYN-EMP-01",10,12000,0,"SYN-demo-00000","","","",""],
    [true,"SANED-DEMO-UNUSUAL","SANED","Coordinated synthetic history","SYN-demo-00002","SYN-EMP-02",45,12000,12000,"SYN-demo-00002","","","",""],
    [true,"SANED-DEMO-MISSING","SANED","Incomplete synthetic evidence","SYN-demo-00005","SYN-EMP-03",10,12000,0,"SYN-demo-00005","","","",""],
  ];
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");link.href=url;link.download="synthetic_model_evidence_template.csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  showToast("Synthetic SANED evidence template downloaded; no training is performed.");
}

async function runNewAssessment(event) {
  event.preventDefault();
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  const transaction =
    document.querySelector("#assessment-transaction").value.trim() ||
    "TX-LIVE-" + suffix;
  const locationCategory = document.querySelector("#assessment-country").value;
  const outsideSaudi = !isSaudi(locationCategory);
  const selectedJourney = document.querySelector("#assessment-journey").value;
  const journeyFeatures =
    selectedJourney === "Benefit Payments"
      ? {
          requests30d: Number(document.querySelector("#benefit-requests-30d").value),
          amountDeviationPct: Number(document.querySelector("#benefit-amount-deviation").value),
          payoutAccountChangeDays: Number(document.querySelector("#benefit-payout-change-days").value),
          duplicatePayments: Number(document.querySelector("#benefit-duplicate-payments").value),
          sharedBeneficiaries: Number(document.querySelector("#benefit-shared-beneficiaries").value),
        }
      : selectedJourney === "Employer Registration"
        ? {
            amendments30d: Number(document.querySelector("#employer-amendments-30d").value),
            companyAgeAtChangeDays: Number(document.querySelector("#employer-age-at-change").value),
            linkedContactEmployers: Number(document.querySelector("#employer-linked-contacts").value),
            workforceChangePct: Number(document.querySelector("#employer-workforce-change").value),
            backdatedChanges90d: Number(document.querySelector("#employer-backdated-90d").value),
            sourceConflicts: Number(document.querySelector("#employer-source-conflicts").value),
          }
        : selectedJourney === "Retirement"
          ? {
              contributionMonths: Number(document.querySelector("#retirement-contribution-months").value),
              gapMonths: Number(document.querySelector("#retirement-gap-months").value),
              wageChangePct: Number(document.querySelector("#retirement-wage-change").value),
              retroCorrections12m: Number(document.querySelector("#retirement-retro-corrections").value),
              overlapPeriods: Number(document.querySelector("#retirement-overlap-periods").value),
              overlapMonths: Number(document.querySelector("#retirement-overlap-months").value),
            }
          : selectedJourney === "Maternity Benefit"
            ? {
                contributionMonthsInWindow: Number(document.querySelector("#maternity-contribution-months").value),
                daysEventToRequest: Number(document.querySelector("#maternity-event-request-days").value),
                wageChangePct: Number(document.querySelector("#maternity-wage-change").value),
                employerTenureDays: Number(document.querySelector("#maternity-employer-tenure").value),
                concurrentClaims: Number(document.querySelector("#maternity-concurrent-claims").value),
                retroCorrections12m: Number(document.querySelector("#maternity-retro-corrections").value),
              }
            : selectedJourney === "Contribution & Wage"
              ? {
                  materialWageChangeWorkersPct: Number(document.querySelector("#contribution-material-change-workers").value),
                  medianWageChangePct: Number(document.querySelector("#contribution-median-wage-change").value),
                  payrollDelayDays: Number(document.querySelector("#contribution-payroll-delay").value),
                  resubmissions30d: Number(document.querySelector("#contribution-resubmissions").value),
                  retroCorrections90d: Number(document.querySelector("#contribution-retro-corrections").value),
                  workersAcrossEmployers: Number(document.querySelector("#contribution-cross-employer-workers").value),
                  reconciliationDeviationPct: Number(document.querySelector("#contribution-reconciliation-deviation").value),
                }
        : undefined;
  const raw = Object.assign(
    {
      id: "NEW-" + suffix,
      synthetic: true,
      transactionId: transaction,
      journey: selectedJourney,
      scenario: document.querySelector("#assessment-scenario").value.trim(),
      subject: document.querySelector("#assessment-subject").value.trim(),
      entity: document.querySelector("#assessment-entity").value.trim() || "—",
      requested:
        "Live input · " +
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      country: locationCategory,
      region: outsideSaudi
        ? "Outside KSA"
        : document.querySelector("#assessment-region").value,
      city: outsideSaudi
        ? "Outside Saudi Arabia"
        : document.querySelector("#assessment-city").value.trim(),
      ruleScore: Number(document.querySelector("#assessment-rule-score").value),
      features: {
        velocity: Number(document.querySelector("#assessment-velocity").value),
        linkedEntities: Number(
          document.querySelector("#assessment-linked").value,
        ),
        priorRisk: Number(
          document.querySelector("#assessment-prior-risk").value,
        ),
        retroDays: Number(
          document.querySelector("#assessment-retro-days").value,
        ),
        identityReuse: Number(
          document.querySelector("#assessment-identity-reuse").value,
        ),
        amountChangePct: Number(
          document.querySelector("#assessment-amount-change").value,
        ),
        overrides: Number(
          document.querySelector("#assessment-overrides").value,
        ),
        crossSourceConflict: document.querySelector("#assessment-conflict")
          .checked
          ? 1
          : 0,
        missingData: document.querySelector("#assessment-missing").checked
          ? 1
          : 0,
        urgentPriority: document.querySelector("#assessment-urgent").checked
          ? 1
          : 0,
      },
      primaryCode: "MANUAL_BEHAVIORAL_ASSESSMENT",
      primaryReason: document
        .querySelector("#assessment-scenario")
        .value.trim(),
      source: "Manual sandbox input",
      transactionAmount: Number(
        document.querySelector("#assessment-transaction-amount").value,
      ),
      currency: "SAR",
      detectionStage: document.querySelector("#assessment-detection-stage")
        .value,
      paymentStatus: document.querySelector("#assessment-payment-status").value,
      amountAtRisk: Number(
        document.querySelector("#assessment-amount-at-risk").value,
      ),
      journeyFeatures,
      confirmedFraudAmount: 0,
      preventedAmount: 0,
      financialOutcome: null,
      outcome: null,
    },
    {customerName:document.querySelector('#assessment-subject').value.trim(),employerName:document.querySelector('#assessment-entity').value.trim() || 'Not supplied',nationalIdMasked:document.querySelector('#assessment-subject').value.trim(),mobileMasked:'Not supplied',employerNumber:document.querySelector('#assessment-entity').value.trim() || 'Not supplied',supervisorName:'Not supplied',supervisorUserId:'Not supplied',supervisorMobileMasked:'Not supplied'},
  );
  const submit = document.querySelector("#new-assessment-form button[type=submit]");
  submit.disabled = true;
  document.querySelector("#new-assessment-error").textContent = "";
  let backendResult;
  try {
    if (raw.journey === "SANED") {
      const modelCase = buildBackendCaseFromForm(suffix, raw);
      raw.id = modelCase.id;
      backendResult = await backendJSON("/assess-case", { case: modelCase, context: raw });
    } else backendResult = await backendJSON("/assess", { assessment: raw });
    if (!backendResult.caseData?.modelAssessment) throw new Error("The backend is running an older integration. Restart it before assessing this case.");
  } catch (error) {
    document.querySelector("#new-assessment-error").textContent = error.message + " No local substitute assessment was created.";
    return;
  } finally { submit.disabled = false; }
  useAssessedPortfolio();
  const item = backendResult.caseData;
  cases.push(item);
  newAssessmentCount += 1;
  selectedId = item.id;
  activeFilter = "All";
  activeJourney = "All";
  activeRegion = "All";
  searchQuery = "";
  document.querySelector("#new-assessment-dialog").close();
  document.querySelector("#new-assessment-form").reset();
  document.querySelector("#assessment-subject").value = "CTR-NEW";
  document.querySelector("#assessment-entity").value = "EMP-NEW";
  document.querySelector("#assessment-country").value = "Saudi Arabia";
  document.querySelector("#assessment-city").value = "Riyadh";
  document.querySelector("#assessment-transaction-amount").value = "12000";
  document.querySelector("#assessment-amount-at-risk").value = "12000";
  document.querySelector("#assessment-detection-stage").value =
    "Before payment";
  document.querySelector("#assessment-payment-status").value = "Pending";
  document.querySelector("#benefit-requests-30d").value = "1";
  document.querySelector("#benefit-amount-deviation").value = "0";
  document.querySelector("#benefit-payout-change-days").value = "365";
  document.querySelector("#benefit-duplicate-payments").value = "0";
  document.querySelector("#benefit-shared-beneficiaries").value = "1";
  document.querySelector("#employer-amendments-30d").value = "0";
  document.querySelector("#employer-age-at-change").value = "365";
  document.querySelector("#employer-linked-contacts").value = "1";
  document.querySelector("#employer-workforce-change").value = "0";
  document.querySelector("#employer-backdated-90d").value = "0";
  document.querySelector("#employer-source-conflicts").value = "0";
  document.querySelector("#retirement-contribution-months").value = "240";
  document.querySelector("#retirement-gap-months").value = "0";
  document.querySelector("#retirement-wage-change").value = "0";
  document.querySelector("#retirement-retro-corrections").value = "0";
  document.querySelector("#retirement-overlap-periods").value = "0";
  document.querySelector("#retirement-overlap-months").value = "0";
  document.querySelector("#maternity-contribution-months").value = "12";
  document.querySelector("#maternity-event-request-days").value = "5";
  document.querySelector("#maternity-wage-change").value = "0";
  document.querySelector("#maternity-employer-tenure").value = "365";
  document.querySelector("#maternity-concurrent-claims").value = "0";
  document.querySelector("#maternity-retro-corrections").value = "0";
  document.querySelector("#contribution-material-change-workers").value = "0";
  document.querySelector("#contribution-median-wage-change").value = "0";
  document.querySelector("#contribution-payroll-delay").value = "0";
  document.querySelector("#contribution-resubmissions").value = "0";
  document.querySelector("#contribution-retro-corrections").value = "0";
  document.querySelector("#contribution-cross-employer-workers").value = "0";
  document.querySelector("#contribution-reconciliation-deviation").value = "0";
  document.querySelector("#model-workforce").value = "100";
  document.querySelector("#model-amendments").value = "1";
  document.querySelector("#model-previous-wage").value = "6000";
  document.querySelector("#model-current-wage").value = "6500";
  document.querySelector("#model-exclusions").value = "3";
  document.querySelector("#model-supervisor-changes").value = "1";
  syncJourneyFeatureFields();
  syncAssessmentLocationFields();
  switchView("queue");
  renderAll();
  if (backendResult) {
    if (backendResult.assessmentSource === "journey-prototype") {
      showToast("تم حفظ تقييم " + raw.journey + " في سجل تقييمات الباكند.");
    } else {
      renderBackendAssessment(backendResult);
      switchView("ai-demo");
    }
    loadBackendHistory();
  }
  showToast(backendResult.complete ? transaction + " saved with " + backendResult.modelVersion + "; controls and model result shown separately." : transaction + " saved as incomplete. Complete evidence; no model score was produced.");
}

document.querySelectorAll(".nav-item").forEach(function (button) {
  button.addEventListener("click", function () {
    switchView(button.dataset.view);
  });
});
document.querySelectorAll("[data-go-view]").forEach(function (button) {
  button.addEventListener("click", function () {
    switchView(button.dataset.goView);
  });
});
document.querySelectorAll(".filter").forEach(function (button) {
  button.addEventListener("click", function () {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(function (item) {
      item.classList.toggle("active", item === button);
    });
    resetVisibleSelection();
  });
});
document
  .querySelector("#journey-filter")
  .addEventListener("change", function (event) {
    activeJourney = event.target.value;
    resetVisibleSelection();
  });
document
  .querySelector("#region-filter")
  .addEventListener("change", function (event) {
    activeRegion = event.target.value;
    resetVisibleSelection();
  });
document
  .querySelector("#case-search")
  .addEventListener("input", function (event) {
    searchQuery = event.target.value;
    resetVisibleSelection();
  });
document
  .querySelector("#clear-region-filter")
  .addEventListener("click", function () {
    activeRegion = "All";
    populateSelects();
    renderQueue();
  });

function openAssessmentDialog() {
  syncJourneyFeatureFields();
  document.querySelector("#new-assessment-dialog").showModal();
}
function syncJourneyFeatureFields() {
  const journey = document.querySelector("#assessment-journey").value;
  [
    ["#benefit-feature-fields", journey === "Benefit Payments"],
    ["#employer-feature-fields", journey === "Employer Registration"],
    ["#retirement-feature-fields", journey === "Retirement"],
    ["#maternity-feature-fields", journey === "Maternity Benefit"],
    ["#contribution-feature-fields", journey === "Contribution & Wage"],
    ["#saned-feature-fields", journey === "SANED"],
  ].forEach(function ([selector, enabled]) {
    const panel = document.querySelector(selector);
    panel.hidden = !enabled;
    panel.querySelectorAll("input").forEach(function (input) {
      input.required = enabled;
    });
  });
}
document
  .querySelector("#assessment-journey")
  .addEventListener("change", syncJourneyFeatureFields);
document
  .querySelector("#new-assessment-btn")
  .addEventListener("click", openAssessmentDialog);
document
  .querySelector("#dashboard-assessment-btn")
  .addEventListener("click", openAssessmentDialog);
document
  .querySelector("#dashboard-upload-btn")
  .addEventListener("click", function () {
    switchView("intake");
  });
document
  .querySelector("#close-assessment")
  .addEventListener("click", function () {
    document.querySelector("#new-assessment-dialog").close();
  });
document
  .querySelector("#cancel-assessment")
  .addEventListener("click", function () {
    document.querySelector("#new-assessment-dialog").close();
  });
document
  .querySelector("#new-assessment-form")
  .addEventListener("submit", runNewAssessment);

function syncAssessmentLocationFields() {
  const outside = !isSaudi(document.querySelector("#assessment-country").value);
  const region = document.querySelector("#assessment-region");
  const city = document.querySelector("#assessment-city");
  region.disabled = outside;
  city.disabled = outside;
  if (outside) city.value = "Outside Saudi Arabia";
  else if (city.value === "Outside Saudi Arabia" || !city.value)
    city.value = "Riyadh";
}
document
  .querySelector("#assessment-country")
  .addEventListener("change", syncAssessmentLocationFields);

function markSimulationDraft() {
  modelReviewStatus = "Draft";
  renderSimulationResults();
  renderSimulationGovernance();
}

document
  .querySelector("#control-weight")
  .addEventListener("input", function (event) {
    draftModelConfig.controlWeight = Number(event.target.value);
    draftModelConfig.anomalyWeight = 100 - draftModelConfig.controlWeight;
    document.querySelector("#anomaly-weight").value =
      draftModelConfig.anomalyWeight;
    markSimulationDraft();
  });
document
  .querySelector("#anomaly-weight")
  .addEventListener("input", function (event) {
    draftModelConfig.anomalyWeight = Number(event.target.value);
    draftModelConfig.controlWeight = 100 - draftModelConfig.anomalyWeight;
    document.querySelector("#control-weight").value =
      draftModelConfig.controlWeight;
    markSimulationDraft();
  });
document
  .querySelector("#interaction-weight")
  .addEventListener("input", function (event) {
    draftModelConfig.interactionMultiplier = Number(event.target.value);
    markSimulationDraft();
  });
document
  .querySelector("#low-threshold")
  .addEventListener("input", function (event) {
    draftModelConfig.lowMax = Math.min(
      Number(event.target.value),
      draftModelConfig.highMin - 5,
    );
    event.target.value = draftModelConfig.lowMax;
    markSimulationDraft();
  });
document
  .querySelector("#high-threshold")
  .addEventListener("input", function (event) {
    draftModelConfig.highMin = Math.max(
      Number(event.target.value),
      draftModelConfig.lowMax + 5,
    );
    event.target.value = draftModelConfig.highMin;
    markSimulationDraft();
  });
document
  .querySelector("#apply-simulation-btn")
  .addEventListener("click", async function () {
    modelConfig = copyModelConfig(draftModelConfig);
    try { await saveRiskConfig(modelConfig); }
    catch (error) { showToast("Settings applied for this session; local save failed: " + error.message); }
    simulationActive = !configIsDefault(modelConfig);
    modelReviewStatus = "Draft";
    reassessCases();
    renderAll();
    showToast(
      "Sandbox scoring configuration applied. No production rule or model was changed.",
    );
  });
document
  .querySelector("#reset-model-btn")
  .addEventListener("click", async function () {
    modelConfig = copyModelConfig(DEFAULT_MODEL_CONFIG);
    draftModelConfig = copyModelConfig(DEFAULT_MODEL_CONFIG);
    try { await saveRiskConfig(modelConfig); } catch { /* Keep local defaults available offline. */ }
    simulationActive = false;
    modelReviewStatus = "Draft";
    reassessCases();
    renderAll();
    showToast("Scoring simulation reset to the approved prototype defaults.");
  });
document
  .querySelector("#submit-model-review-btn")
  .addEventListener("click", function () {
    modelReviewStatus = "Specialist Review";
    try { localStorage.setItem("madar-config-review", JSON.stringify({status:modelReviewStatus,config:draftModelConfig})); } catch {}
    renderSimulationGovernance();
    showToast(
      "Demo review request saved in this browser. Validation and approval remain required.",
    );
  });

document.querySelector("#confirm-override").addEventListener("click", async (event) => {
  event.preventDefault();
  const item = cases.find((entry) => entry.id === selectedId);
  const reason = document.querySelector("#override-reason").value.trim();
  if (!item?.assessmentId || !reason) { showToast("A saved assessment and evidence note are required."); return; }
  event.currentTarget.disabled = true;
  try {
    const saved = await backendJSON("/decision", { caseId: item.id, assessmentId: item.assessmentId, action: "override", route: document.querySelector("#override-route").value, actorName:document.querySelector("#override-reviewer").value.trim(), note: reason });
    Object.assign(item, saved.caseData);document.querySelector("#override-dialog").close();renderAll();showToast("Human override saved; original model output preserved.");
  } catch (error) { showToast(error.message); }
  finally { document.querySelector("#confirm-override").disabled = false; }
});
document.querySelector("#confirm-outcome").addEventListener("click", async (event) => {
  event.preventDefault();
  const item = cases.find((entry) => entry.id === selectedId);
  const button = document.querySelector("#confirm-outcome");
  document.querySelector("#outcome-save-error").textContent = "";
  if (!item?.assessmentId) { document.querySelector("#outcome-save-error").textContent = "Assess and save the case first."; return; }
  button.disabled = true;
  try {
    const saved = await backendJSON("/outcome", { caseId: item.id, assessmentId: item.assessmentId, actorName:document.querySelector("#outcome-reviewer").value.trim(), outcome: document.querySelector("#outcome-value").value, financialOutcome: document.querySelector("#financial-outcome-value").value, amountAtRisk: Number(document.querySelector("#outcome-amount-at-risk").value), confirmedFraudAmount: Number(document.querySelector("#outcome-confirmed-amount").value), preventedAmount: Number(document.querySelector("#outcome-prevented-amount").value), note: document.querySelector("#outcome-note").value.trim() });
    Object.assign(item, saved.caseData);document.querySelector("#outcome-dialog").close();renderAll();showToast("Specialist outcome saved separately from model inference.");
  } catch (error) { document.querySelector("#outcome-save-error").textContent = error.message; }
  finally { button.disabled = false; }
});

const fileInput = document.querySelector("#csv-file-input");
fileInput.addEventListener("change", function(){
  pendingFile = fileInput.files[0] || null;
  const label = document.querySelector("#selected-file");
  const button = document.querySelector("#import-file-btn");
  if (pendingFile) {
    label.className = "selected-file";
    label.innerHTML = '<strong>' + escapeHtml(pendingFile.name) + '</strong><span>' + Math.round(pendingFile.size / 1024) + ' KB · ready for validation</span>';
    button.disabled = false;
  } else {
    label.className = "selected-file empty";
    label.textContent = "No file selected";
    button.disabled = true;
  }
});

const dropZone = document.querySelector("#drop-zone");
["dragenter","dragover"].forEach(function(type){ dropZone.addEventListener(type, function(event){ event.preventDefault(); dropZone.classList.add("dragging"); }); });
["dragleave","drop"].forEach(function(type){ dropZone.addEventListener(type, function(event){ event.preventDefault(); dropZone.classList.remove("dragging"); }); });
dropZone.addEventListener("drop", function(event){
  const file = event.dataTransfer.files[0];
  if (!file) return;
  pendingFile = file;
  document.querySelector("#selected-file").className = "selected-file";
  document.querySelector("#selected-file").innerHTML = '<strong>' + escapeHtml(file.name) + '</strong><span>' + Math.round(file.size / 1024) + ' KB · ready for validation</span>';
  document.querySelector("#import-file-btn").disabled = false;
});

document.querySelector("#import-file-btn").addEventListener("click", async function(){
  if (!pendingFile) return;
  try {
    const text = await pendingFile.text();
    await importCSVText(text, document.querySelector("#file-import-mode").value, pendingFile.name);
  } catch (error) {
    showImportError("The selected file could not be read. Choose a valid UTF-8 CSV file.");
  }
});
document.querySelector("#import-paste-btn").addEventListener("click", function(){
  const text = document.querySelector("#csv-paste").value.trim();
  if (!text) { showImportError("Paste a header row and at least one data row before running the assessment."); return; }
  importCSVText(text, document.querySelector("#paste-import-mode").value, "pasted CSV");
});
document.querySelector("#download-template-btn").addEventListener("click", downloadTemplate);

document.querySelector("#demo-reset-btn").addEventListener("click", async function () {
  const button = this;
  button.disabled = true;
  try {
    const response = await fetch(backendBaseUrl + "/demo-reset", { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Demo reset failed");
    cases = baselineRaw.map((item, index) => applySyntheticOutcome(assess(item), index));
    importedCount = 0;
    newAssessmentCount = 0;
    selectedId = cases[0]?.id || "";
    activeFilter = "All";
    activeJourney = "All";
    activeRegion = "All";
    searchQuery = "";
    document.querySelector("#import-result").innerHTML = "<strong>Demo data reset.</strong><p>Only the original synthetic sample cases remain.</p>";
    document.querySelector("#import-status").textContent = "Reset complete";
    document.querySelector("#import-status").className = "status-chip approved";
    await loadRiskConfig();
    await loadIndicatorSuggestions();
    await loadScenarioProposals();
    window.dispatchEvent(new Event("madar-reset"));
    renderAll();
    showToast("Demo reset complete. Synthetic sample data restored.");
  } catch (error) {
    showToast("Demo reset failed: " + error.message);
  } finally {
    button.disabled = false;
  }
});


document
  .querySelector("#report-journey")
  .addEventListener("change", renderBusinessReport);
document
  .querySelector("#report-owner")
  .addEventListener("change", renderBusinessReport);
document
  .querySelector("#generate-business-report")
  .addEventListener("click", function () {
    renderBusinessReport();
    document.querySelector("#report-generated-at").textContent =
      "Generated " +
      new Date().toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    showToast(
      "Monthly business owner report generated from the current session dataset",
    );
  });
document
  .querySelector("#print-business-report")
  .addEventListener("click", function () {
    switchView("business-report");
    window.print();
  });
const backendBaseUrl = window.MADAR_API_BASE || (["localhost", "127.0.0.1"].includes(location.hostname) ? "http://127.0.0.1:8787" : "/api");
let backendSavedAssessments = [];
async function saveRiskConfig(config) {
  const response = await fetch(backendBaseUrl + "/risk-config", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save weights and thresholds");
  return result;
}
async function loadRiskConfig() {
  try {
    const response = await fetch(backendBaseUrl + "/risk-config", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.config) return;
    modelConfig = copyModelConfig(result.config);
    draftModelConfig = copyModelConfig(result.config);
    simulationActive = !configIsDefault(modelConfig);
    try { const review=JSON.parse(localStorage.getItem("madar-config-review") || "null"); if(review && JSON.stringify(review.config) === JSON.stringify(modelConfig)) modelReviewStatus=review.status; } catch {}
    reassessCases();
    renderAll();
  } catch {
    // The synthetic demo keeps its bundled defaults if the local backend is offline.
  }
}
async function loadJourneyModelRegistry() {
  const status = document.querySelector("#journey-model-registry-status");
  const panel = document.querySelector("#journey-model-registry-list");
  if (!status || !panel) return;
  status.textContent = "Loading models";
  status.className = "status-chip neutral";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(backendBaseUrl + "/journey-models", {
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.models)) {
      throw new Error(data.error || "Could not load model metadata");
    }
    const count = (value) =>
      Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
    const pct = (value) =>
      Number.isFinite(Number(value)) ? (Number(value) * 100).toFixed(1) + "%" : "—";
    panel.innerHTML = data.models
      .map((model) => {
        const evaluation = model.evaluation || {};
        const facts = [
          ["Training cases", model.trainingCases],
          ["Calibration cases", model.calibrationCases],
          ["Holdout cases", evaluation.testCount],
          ["Saved trees", model.treeCount],
        ];
        return `<article class="journey-model-card">
          <h4>${escapeHtml(model.journey || "Unknown journey")}</h4>
          <div class="journey-model-version">${escapeHtml(model.algorithm || "Model")} · ${escapeHtml(model.version || "—")}</div>
          <div class="journey-model-facts">${facts
            .map(([label, value]) => `<div><span>${label}</span><strong>${count(value)}</strong></div>`)
            .join("")}</div>
          <div class="journey-model-evaluation"><strong>Synthetic holdout:</strong> precision ${pct(evaluation.precision)} · recall ${pct(evaluation.recall)} · false alarms ${pct(evaluation.falsePositiveRate)}<br>${escapeHtml(evaluation.source || "Generated test cases")}</div>
        </article>`;
      })
      .join("");
    status.textContent = `${data.models.length} models loaded`;
    status.className = "status-chip approved";
  } catch (error) {
    status.textContent = error.name === "AbortError" ? "Loading timed out" : "Backend unavailable";
    status.className = "status-chip error";
    panel.innerHTML = `<div class="empty-state">Could not load model details: ${escapeHtml(error.message || "Request timed out")}. Check that the local backend is running, then select Refresh.</div>`;
  } finally {
    window.clearTimeout(timeout);
  }
}
document
  .querySelector("#refresh-journey-model-registry")
  .addEventListener("click", loadJourneyModelRegistry);
async function restoreSavedJourneyAssessments() {
  try {
    const response = await fetch(backendBaseUrl + "/assessments");
    if (!response.ok) return;
    const saved = await response.json();
    let changed = false;
    const restoredIds = new Set();
    saved
      .filter(
        (entry) =>
          ["journey-prototype", "csv-upload", "cross-journey"].includes(entry.assessmentSource) &&
          entry.caseData &&
          entry.caseData.synthetic === true,
      )
      .forEach(function (entry) {
        if (restoredIds.has(entry.caseId)) return;
        restoredIds.add(entry.caseId);
        entry.caseData.assessmentId = entry.assessmentId;
        const index = cases.findIndex((item) => item.id === entry.caseId);
        if (index < 0) {
          cases.push(entry.caseData);
        } else {
          cases[index] = { ...cases[index], ...entry.caseData };
        }
        changed = true;
      });
    if (changed) renderAll();
  } catch {
    // Keep the seeded prototype usable if the optional local backend is offline.
  }
}
function renderBackendAssessment(result) {
  document.querySelector('#backend-result').innerHTML = '<h3>'+escapeHtml(result.caseId || result.transactionId || 'Saved assessment')+'</h3>' + renderModelEvidence({modelAssessment:result.modelResult || result,assessmentSource:result.assessmentSource});
}

function renderPrototypeSavedAssessment(result) {
  const reasons = (result.reasons || [])
    .map((reason) => "<li>" + escapeHtml(reason) + "</li>")
    .join("");
  document.querySelector("#backend-result").innerHTML = `
    <article class="backend-result-card standard">
      <span class="backend-status-badge">Saved journey assessment</span>
      <h3>${escapeHtml(result.journey || "—")} · ${escapeHtml(result.risk || "—")}</h3>
      <p class="backend-assessment-id">Transaction / case: ${escapeHtml(result.transactionId || result.caseId || "—")} · Assessment: ${escapeHtml(result.assessmentId || "—")}</p>
      <p>Legacy score: ${escapeHtml(result.score ?? "—")}/100</p>
      ${result.modelVersion ? `<p>Journey model: ${escapeHtml(result.modelVersion)} · Synthetic reference percentile: ${escapeHtml(result.modelPercentile ?? "—")}%</p>` : ""}
      <p>Recommended route: ${escapeHtml(result.route || "—")}</p>
      <p>${escapeHtml(result.validation || "Prototype result; business validation is required.")}</p>
      <ul>${reasons || "<li>No additional reasons.</li>"}</ul>
    </article>`;
}

function renderBackendHistory(assessments) {
  const list = document.querySelector("#backend-history-list");
  if (!assessments.length) {
    list.innerHTML =
      '<p class="backend-placeholder">No saved assessments yet.</p>';
    return;
  }

  list.innerHTML = assessments
    .map(function (item) {
      const label = item.transactionId || item.caseId || "Case without identifier";
      const isJourneyAssessment = item.assessmentSource === "journey-prototype" && !item.modelResult;
      const state = isJourneyAssessment
        ? item.risk + " · " + (item.journey || "Journey assessment")
        : item.complete !== true
          ? "Complete evidence"
          : item.modelFlagged || item.ruleFlagged
            ? "Specialist review"
            : "Standard review";
      const date = item.assessedAt
        ? new Date(item.assessedAt).toLocaleString()
        : "Time unavailable";
      const score =
        Number.isFinite(Number(item.score))
          ? isJourneyAssessment
            ? Number(item.score).toFixed(0) + "/100"
            : item.complete === true
          ? Number(item.score).toFixed(3)
              : "No score"
          : "No score";

      return `
        <article class="backend-history-item">
          <div>
            <strong>${escapeHtml(label)}</strong>
            <small>${escapeHtml(date)} · ${escapeHtml(item.caseId || "")}</small>
          </div>
          <span>${escapeHtml(state)} · ${escapeHtml(score)}</span>
          <button class="secondary-btn" data-assessment-id="${escapeHtml(item.assessmentId || "")}">
            View assessment
          </button>
        </article>
      `;
    })
    .join("");
}

async function loadBackendHistory() {
  const status = document.querySelector("#backend-history-status");
  status.textContent = "Loading saved assessments…";

  try {
    const response = await fetch(backendBaseUrl + "/assessments");
    const assessments = await response.json();
    if (!response.ok) {
      throw new Error(assessments.error || "Could not load history");
    }

    backendSavedAssessments = assessments;
    renderBackendHistory(assessments);
    status.textContent = "Saved assessments: " + assessments.length;
  } catch (error) {
    status.textContent = "Could not load history: " + error.message;
  }
}

document
  .querySelector("#backend-history-list")
  .addEventListener("click", function (event) {
    const button = event.target.closest("[data-assessment-id]");
    if (!button) return;

    const assessment = backendSavedAssessments.find(
      (item) => item.assessmentId === button.dataset.assessmentId,
    );
    if (!assessment) return;

    if (assessment.assessmentSource === "journey-prototype" && !assessment.modelResult) {
      renderPrototypeSavedAssessment(assessment);
    } else {
      renderBackendAssessment(assessment);
    }
    document
      .querySelector("#backend-result")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });

document
  .querySelector("#backend-load-history")
  .addEventListener("click", loadBackendHistory);

document
  .querySelector("#backend-load-cases")
  .addEventListener("click", async function () {
    const status = document.querySelector("#backend-status");
    const select = document.querySelector("#backend-case-select");

    status.textContent = "Loading cases…";

    try {
      const response = await fetch(backendBaseUrl + "/cases");
      if (!response.ok) throw new Error("Could not load model cases");

      const backendCases = await response.json();

      select.innerHTML = backendCases
        .map(function (item) {
          return (
            '<option value="' +
            escapeHtml(item.id) +
            '">' +
            escapeHtml(item.id + " — " + item.scenario) +
            "</option>"
          );
        })
        .join("");

      status.textContent =
        "Loaded " + backendCases.length + " synthetic cases.";
    } catch (error) {
      status.textContent =
        "Connection failed: " +
        error.message +
        ". Check that the backend is running and the connection is configured.";
    }
  });

document
  .querySelector("#backend-assess-btn")
  .addEventListener("click", async function () {
    const status = document.querySelector("#backend-status");
    const resultBox = document.querySelector("#backend-result");
    const caseId = document.querySelector("#backend-case-select").value;

    if (!caseId) {
      status.textContent = "Load cases and select one first.";
      return;
    }

    status.textContent = "Assessing " + caseId + "...";
    resultBox.textContent = "";

    try {
      const response = await fetch(backendBaseUrl + "/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Assessment failed");

      status.textContent = "Assessment complete. Version: " + result.modelVersion;
      renderBackendAssessment(result);
    } catch (error) {
      status.textContent = "Assessment failed: " + error.message;
    }
  });
const reportMonth = document.querySelector("#report-month");
if (reportMonth) {
  reportMonth.addEventListener("change", renderBusinessReport);
  const now = new Date();
  reportMonth.value =
    now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

document.querySelector('#portfolio-scope').addEventListener('change', event=>{portfolioScope=event.target.value;selectedId=null;resetVisibleSelection();renderAll();});
populateSelects();
syncAssessmentLocationFields();
renderAll();
loadJourneyModelRegistry();
loadRiskConfig();
loadIndicatorSuggestions();
restoreSavedJourneyAssessments();

loadScenarioProposals().catch(() => { /* The review form reports backend errors when used. */ });

backendJSON("/health").then((health) => { document.querySelector("#engine-status").textContent = health.contractVersion === "integration-v0.2-separated" ? "Model services ready" : "Restart backend · older integration running"; }).catch(() => { document.querySelector("#engine-status").textContent = "AI service unavailable · legacy demo only"; });
