import { createHash, randomUUID } from 'node:crypto';
import { assess, model } from '../cross-journey/inference/detector.mjs';
import demoCases from '../cross-journey/data/demo-cases.json' with { type: 'json' };
import { InputError } from './assessment-adapter.mjs';
export { demoCases, model as crossJourneyModel };
const titles = {
  routine: 'Routine linked activity', coordinated_claim_sequence: 'Connected activity before a SANED request',
  legitimate_restructuring: 'Legitimate restructuring', identifier_reuse_network: 'Shared identifiers across contributors',
  retroactive_source_conflict: 'Retroactive changes and conflicting evidence', missing: 'Missing employer evidence',
};
export function parseEventCSV(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new InputError('Supply a cross-journey event CSV under 1 MB.');
  const matrix = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(v => v.trim())) matrix.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new InputError('CSV has an unclosed quoted field.');
  row.push(field); if (row.some(v => v.trim())) matrix.push(row);
  const header = (matrix.shift() || []).map(v => v.replace(/^\uFEFF/, '').trim().toLowerCase());
  const required = ['case_id','assessment_time','event_id','recorded_at','journey','event_type','subject_id','employer_id','synthetic'];
  if (new Set(header).size !== header.length || required.some(k => !header.includes(k))) throw new InputError('Use the cross-journey event template, including assessment_time and synthetic.');
  if (!matrix.length || matrix.length > 1000) throw new InputError('Supply between 1 and 1,000 events.');
  const grouped = new Map();
  const number = (v, name, optional = false) => {
    if (optional && !v) return undefined;
    if (!v || !Number.isFinite(Number(v))) throw new InputError(`${name} must be a finite number.`);
    return Number(v);
  };
  const boolean = (v, name) => {
    if (!['','0','1','true','false'].includes(v.toLowerCase())) throw new InputError(`${name} must be true/false or 1/0.`);
    return v === '1' || v.toLowerCase() === 'true';
  };
  for (const [index, cells] of matrix.entries()) {
    if (cells.length !== header.length) throw new InputError(`Row ${index + 2}: column count does not match the header.`);
    const r = Object.fromEntries(header.map((k,i) => [k, cells[i].trim()]));
    if (!boolean(r.synthetic,'synthetic') || !/^CJ-SYN-[\w-]+$/.test(r.case_id)) throw new InputError(`Row ${index + 2}: only explicitly synthetic CJ-SYN cases are accepted.`);
    if (!r.event_id) throw new InputError(`Row ${index + 2}: event_id is required.`);
    const asOf = number(r.assessment_time, 'assessment_time');
    if (!Number.isFinite(new Date(asOf).getTime())) throw new InputError('assessment_time must be a valid timestamp in milliseconds.');
    if (!grouped.has(r.case_id)) grouped.set(r.case_id,{id:r.case_id,synthetic:true,employerId:r.employer_id,asOf,events:[]});
    const c = grouped.get(r.case_id);
    if (c.asOf !== asOf || c.employerId !== r.employer_id) throw new InputError(`Case ${c.id} has inconsistent assessment time or employer IDs.`);
    if (c.events.some(e => e.eventId === r.event_id)) throw new InputError(`Duplicate event ${r.event_id} in ${c.id}.`);
    const recordedAt = number(r.recorded_at,'recorded_at');
    if (!Number.isFinite(new Date(recordedAt).getTime())) throw new InputError('recorded_at must be a valid timestamp in milliseconds.');
    c.events.push({eventId:r.event_id,recordedAt,effectiveAt:number(r.effective_at || '', 'effective_at', true),journey:r.journey,type:r.event_type,subjectId:r.subject_id,employerId:r.employer_id,identifierId:r.identifier_id || undefined,amount:number(r.amount || '', 'amount', true),previousAmount:number(r.previous_amount || '', 'previous_amount', true),sourceConflict:boolean(r.source_conflict || '', 'source_conflict'),ruleOverride:boolean(r.rule_override || '', 'rule_override')});
  }
  if (grouped.size > 200) throw new InputError('Import at most 200 grouped cases.');
  return [...grouped.values()];
}
export function createCrossJourneyAssessment(evidence) {
  const result = assess(evidence);
  const assessmentId = randomUUID(), assessedAt = new Date().toISOString();
  const known = demoCases.find(c => c.id === evidence.id);
  const scenario = titles[known?.family] || 'Connected synthetic event history';
  const review = result.modelFlagged || result.ruleFlagged;
  const risk = !result.complete ? 'Incomplete' : review ? 'Medium' : 'Low';
  const events = evidence.events.filter(e => e.recordedAt <= evidence.asOf && e.recordedAt >= evidence.asOf - 30 * 86400000).sort((a,b) => a.recordedAt - b.recordedAt);
  const subjects = [...new Set(events.map(e => e.subjectId))];
  const reasonCodes = [{code: !result.complete ? 'EVIDENCE_INCOMPLETE' : result.modelFlagged ? 'CROSS_JOURNEY_PATTERN' : 'MODEL_NOT_FLAGGED', description:result.reasons[0]}];
  if (result.completedContributorChains >= 2) reasonCodes.push({code:'CJ_COMPLETED_CONTRIBUTOR_SEQUENCE',description:result.reasons[1]});
  reasonCodes.push(...(result.ruleFindings || []));
  const caseData = {
    id:evidence.id,transactionId:evidence.id,synthetic:true,journey:'SANED',scenario,
    assessmentId,assessedAt,assessmentSource:'cross-journey',assessmentMode:'model-separated',
    subject:subjects.join(', '),entity:evidence.employerId || 'Missing employer',customerName:subjects.length + ' linked contributor' + (subjects.length === 1 ? '' : 's'),employerName:evidence.employerId || 'Missing employer',
    requested:assessedAt,country:'Saudi Arabia',region:'Not supplied',city:'Not supplied',source:'Synthetic linked event history',
    score:null,ruleScore:null,risk,route:result.route,status:!result.complete?'Complete evidence':review?'Awaiting specialist':'Standard review',
    comparison:!result.complete?'Evidence incomplete':result.modelFlagged && !result.ruleFlagged?'Model recommends review; included comparator rules remain quiet':result.modelFlagged?'Rules and AI recommend review':'No review threshold crossed',
    confidence:'Not calibrated',confidenceScore:null,anomalyScore:result.percentile ?? null,interaction:0,
    features:{velocity:events.length,linkedEntities:subjects.length,retroDays:0,priorRisk:0,overrides:0,identityReuse:0,amountChangePct:0,crossSourceConflict:events.some(e=>e.sourceConflict),missingData:!result.complete,urgentPriority:0},
    primaryCode:reasonCodes[0].code,primaryReason:result.reasons.join(' '),reasonCodes,signals:reasonCodes.map(r=>[r.code,r.description]),
    modelAssessment:{...result,assessmentId,assessedAt,algorithm:model.algorithm || 'Random Forest'},
    aiModel:{version:result.modelVersion,rawScore:result.score ?? null,percentile:result.percentile ?? null,flagged:result.modelFlagged ?? null,complete:result.complete,ruleFlagged:result.ruleFlagged ?? null,features:result.features,algorithm:'Random Forest'},
    crossJourneyEvidence:structuredClone(evidence),sourceTimeline:events,
    events:events.map(e=>[`${e.journey} · ${e.subjectId} · ${e.type}`,new Date(e.recordedAt).toISOString()]),
    audit:[`Cross-journey model ${result.modelVersion} assessed at ${assessedAt}.`],
    paymentStatus:'Pending · simulation',detectionStage:'Before payment',transactionAmount:null,amountAtRisk:null,confirmedFraudAmount:0,preventedAmount:0,currency:'SAR',outcome:null,financialOutcome:null,
  };
  const keys=['eventId','recordedAt','effectiveAt','journey','type','subjectId','employerId','identifierId','amount','previousAmount','sourceConflict','ruleOverride'];
  const canonical={id:evidence.id,employerId:evidence.employerId || '',asOf:evidence.asOf,events:[...evidence.events].sort((a,b)=>a.eventId.localeCompare(b.eventId)).map(e=>Object.fromEntries(keys.map(key=>[key,e[key] === "" ? null : e[key] ?? null])))};
  return {assessmentId,assessedAt,caseId:evidence.id,transactionId:evidence.id,synthetic:true,assessmentSource:'cross-journey',journey:'SANED',scenario,...result,risk,modelResult:caseData.modelAssessment,caseData,evidenceFingerprint:createHash('sha256').update(JSON.stringify(canonical)).digest('hex')};
}
