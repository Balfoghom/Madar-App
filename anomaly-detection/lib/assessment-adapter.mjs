// Application adapter only. Imports fitted artifacts; never trains or changes models.
import { assess as assessSaned, model as sanedModel } from './detector.mjs';
import { assessJourney, modeledJourneys } from './journey-detector.mjs';
import suppliedCases from '../data/cases.json' with { type: 'json' };

export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const journeys = ['SANED', ...modeledJourneys];
export function validateContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.synthetic !== true ||
      typeof input.id !== 'string' || !/^(NEW-|UPL-|SYN-)[A-Za-z0-9_-]{1,100}$/.test(input.id) ||
      typeof input.transactionId !== 'string' || !input.transactionId.trim() || input.transactionId.length > 160 ||
      !journeys.includes(input.journey) || typeof input.scenario !== 'string' || !input.scenario.trim() || input.scenario.length > 2000 ||
      !Number.isFinite(input.ruleScore) || input.ruleScore < 0 || input.ruleScore > 100) {
    throw new InputError('Expected a synthetic case ID, transaction, supported journey, scenario, and existing control score between 0 and 100.');
  }
  if (Number.isFinite(input.transactionAmount) && Number.isFinite(input.amountAtRisk) && input.amountAtRisk > input.transactionAmount) throw new InputError('Amount at risk cannot exceed the transaction amount.');
  if (input.features != null && (typeof input.features !== 'object' || Array.isArray(input.features))) throw new InputError('Invalid contextual features.');
  for (const field of ['transactionAmount', 'amountAtRisk']) if (input[field] != null && (!Number.isFinite(input[field]) || input[field] < 0)) throw new InputError('Financial values must be finite and nonnegative.');
}
function mediumRoute(journey) {
  return { 'Benefit Payments': 'Payment & IBAN Verification', Retirement: 'Eligibility Verification', 'Maternity Benefit': 'Benefit Operations Review' }[journey] || 'Insurance Operations Audit';
}
export function separatedPolicy(context, result, config = {}) {
  const lowMax = Number.isFinite(config.lowMax) ? config.lowMax : 34;
  const highMin = Number.isFinite(config.highMin) ? config.highMin : 75;
  if (result.complete !== true) return { score: null, risk: 'Incomplete', route: 'Complete evidence', status: 'Complete evidence', controlScore: context.ruleScore, reviewRequired: true, scoreMeaning: 'No model score: evidence incomplete', policy: 'separate-controls-and-model-v1' };
  // No anomaly percentile or model score enters the existing operational score.
  let risk = context.ruleScore >= highMin ? 'High' : context.ruleScore > lowMax ? 'Medium' : 'Low';
  const componentReview = result.modelFlagged === true || result.ruleFlagged === true;
  if ((componentReview || context.features?.crossSourceConflict) && risk === 'Low') risk = 'Medium';
  return { score: context.ruleScore, controlScore: context.ruleScore, risk, route: risk === 'High' ? 'Fraud Prevention & Inspection Review' : risk === 'Medium' ? (context.features?.crossSourceConflict ? 'Additional verification' : mediumRoute(context.journey)) : 'Straight-through processing', status: risk === 'Low' ? 'Ready to proceed' : 'Awaiting specialist', reviewRequired: risk !== 'Low', scoreMeaning: 'Existing control score; model output is separate', policy: 'separate-controls-and-model-v1' };
}
function explain(result, context) {
  if (!result.complete) return [{ code: 'EVIDENCE_INCOMPLETE', description: result.reasons?.join(' ') || 'Required model evidence is incomplete.' }];
  const reasons = [{ code: result.modelFlagged ? 'MODEL_UNUSUAL_COMBINATION' : 'MODEL_NOT_FLAGGED', description: result.reasons?.[0] || 'Synthetic model result.' }];
  (result.ruleReasons || []).forEach(description => reasons.push({ code: 'SANED_RULE_' + description.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/_$/,''), description }));
  const evidenceKey = value => value.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/_$/,'');
  (result.features || []).forEach(feature => { if (feature.unusual) reasons.push({ code: 'MODEL_FEATURE_' + evidenceKey(context.journey) + '_' + evidenceKey(feature.name), description: `${feature.name} is outside its synthetic reference range (context, not causal attribution).` }); });
  if (context.ruleScore >= 35) reasons.push({ code: 'EXISTING_CONTROL_RESULT', description: `Existing operational control score: ${context.ruleScore}/100. These are separate from the model's provisional comparator rules.` });
  if (context.features?.crossSourceConflict) reasons.push({ code: 'SOURCE_CONFLICT', description: 'Reported source conflict requires additional verification; the model result remains separate.' });
  return reasons;
}
export function createApplicationAssessment(context, options = {}) {
  validateContext(context);
  let evidence = options.sanedCase || context.modelInput?.sanedCase;
  const suppliedId = options.caseId || context.modelInput?.case_id;
  if (context.journey === 'SANED' && suppliedId) {
    evidence = suppliedCases.find(entry => entry.id === suppliedId);
    if (!evidence) throw new InputError('Unknown bundled synthetic SANED case ID.', 404);
  }
  if (context.journey === 'SANED' && evidence && (evidence.synthetic !== true || typeof evidence.id !== 'string' || !evidence.id.startsWith('SYN-'))) throw new InputError('SANED evidence must be explicitly synthetic with a SYN- ID.');
  const inference = context.journey === 'SANED'
    ? assessSaned(context.features?.missingData ? null : evidence)
    : assessJourney(context);
  const modelResult = { ...inference, algorithm: context.journey === 'SANED' ? sanedModel.algorithm : inference.algorithm, syntheticOnly: true };
  if (!modelResult.complete) modelResult.percentile = null;
  if (modelResult.complete && context.journey !== 'SANED') {
    // No provisional comparator rule engine is defined for these artifacts.
    modelResult.ruleFlagged = null;
    modelResult.ruleReasons = [];
    modelResult.comparatorRulesAvailable = false;
  }
  const assessmentId = crypto.randomUUID();
  const assessedAt = new Date().toISOString();
  const policy = separatedPolicy(context, modelResult, options.config);
  const reasonCodes = explain(modelResult, context);
  const modelSnapshot = { ...modelResult, assessmentId, assessedAt };
  const clean = { ...context };
  // Review decisions are written through /outcome or /decision, never imported as model evidence.
  for (const key of ['outcome', 'financialOutcome', 'decisionDate', 'decisionOwner', 'confirmedFraudAmount', 'preventedAmount', 'aiModel', 'modelAssessment', 'reviewHistory', 'humanDecision', 'workflow', 'audit', 'score', 'risk']) delete clean[key];
  const caseData = {
    ...clean, ...policy, assessmentId, assessedAt, synthetic: true, assessmentMode: 'model-separated', assessmentSource: options.source || 'journey-prototype',
    recommendedRoute:policy.route,
    features: { velocity: 0, retroDays: 0, linkedEntities: 0, priorRisk: 0, overrides: 0, identityReuse: 0, amountChangePct: 0, crossSourceConflict: 0, missingData: 0, urgentPriority: 0, ...context.features },
    anomalyScore: modelResult.complete ? modelResult.percentile : null,
    interaction: 0, confidence: 'Not calibrated', confidenceScore: null,
    comparison: 'Existing controls and model evidence are separate; no calibrated combined score is defined.',
    primaryCode: reasonCodes[0].code, primaryReason: reasonCodes[0].description,
    reasonCodes, signals: reasonCodes.map(entry => [entry.code, entry.description]),
    modelAssessment: modelSnapshot,
    modelInput: evidence ? { sanedCase: structuredClone(evidence) } : context.modelInput || null,
    aiModel: { version: modelResult.modelVersion, rawScore: modelResult.complete ? modelResult.score : null, percentile: modelResult.percentile ?? null, flagged: modelResult.modelFlagged ?? null, complete: modelResult.complete, ruleFlagged: modelResult.ruleFlagged ?? null, features: modelResult.features, algorithm: modelResult.algorithm },
    events: [['Assessment', assessedAt], ['Evidence source', suppliedId ? 'Bundled synthetic SANED history: ' + suppliedId : context.journey === 'SANED' ? 'Explicit synthetic SANED event history' : 'Provided synthetic journey features']],
    audit: [`Model ${modelResult.modelVersion} assessed at ${assessedAt}; existing control score kept separate.`],
    outcome: null, financialOutcome: null, confirmedFraudAmount: 0, preventedAmount: 0,
  };
  return {
    assessmentId, assessedAt, caseId: context.id, transactionId: context.transactionId,
    journey: context.journey, scenario: context.scenario, synthetic: true,
    assessmentSource: options.source || 'journey-prototype', validation: 'Synthetic evidence only; not business validated.',
    ...modelResult, mainReason: reasonCodes[0].description, reasonCodes,
    risk: policy.risk, applicationAssessment: policy, businessAssessment: policy,
    caseData, modelResult: modelSnapshot,
  };
}
