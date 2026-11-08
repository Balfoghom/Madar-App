import {appendixScoring} from './appendix-scoring.mjs';
import approvedPatterns from '../data/approved-behavioral-patterns.json' with {type:'json'};
export const HYBRID_POLICY_VERSION=appendixScoring.version;
const allowed=new Set(['amendments30d','backdatingDays','amendmentRecencyHours','wageChangePct','employerExclusionsPer100','supervisorChangesPer100']);
export function approvedPatternAdjustments(result,catalog=approvedPatterns,context={}){
 const facts=Object.fromEntries((result.features||[]).filter(f=>typeof f.name==='string').map(f=>[f.name,f.value]));
 if(context.journey==='SANED'&&context.assessmentSource!=='cross-journey')for(const [i,key] of [...allowed].entries())facts[key]=result.features?.[i]?.value;
 return catalog.filter(p=>p&&p.status==='Approved'&&p.journey===context.journey&&p.modelVersion===result.modelVersion&&typeof p.approvedBy==='string'&&p.approvedBy.trim()&&Number.isFinite(Date.parse(p.approvedAt))&&typeof p.code==='string'&&/^[A-Z][A-Z0-9_]+$/.test(p.code)&&typeof p.description==='string'&&Number.isFinite(p.points)&&Math.abs(p.points)<=20&&Array.isArray(p.conditions)&&p.conditions.length>0&&p.conditions.every(c=>c&&Object.hasOwn(facts,c.feature)&&Number.isFinite(c.value)&&Number.isFinite(facts[c.feature])&&(['gte','lte'].includes(c.operator))&&(c.operator==='gte'?facts[c.feature]>=c.value:facts[c.feature]<=c.value))).map(p=>({code:p.code,description:p.description,points:p.points,approvedBy:p.approvedBy,approvedAt:p.approvedAt}));
}
export function hybridPolicy(context,result){
 return appendixScoring.calculate({...context,requiredEvidenceMissing:context.requiredEvidenceMissing??(!result.complete||!!context.features?.missingData)});
}

export function hybridReasons(policy){
 if(!policy.decisionComplete)return [{code:policy.decisionIssue?.startsWith('Existing control')?'CONTROL_SCORE_MISSING':'EVIDENCE_INCOMPLETE',description:policy.decisionIssue}];
 return [{code:'HYBRID_SCORE_COMPONENTS',description:`Appendix assessment score ${policy.score}/100 combines existing control ${policy.controlScore}/100, feature-based behavioral score ${policy.scoringComponents.anomalyScore.toFixed(1)}/100 and pattern adjustment ${policy.scoringComponents.patternAdjustment}.`},...policy.scoringComponents.approvedPatterns.map(p=>({code:p.code,description:`${p.description} (${p.points} configured adjustment points).`}))];
}
