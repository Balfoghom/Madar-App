import approvedPatterns from '../data/approved-behavioral-patterns.json' with {type:'json'};
export const HYBRID_POLICY_VERSION='saned-hybrid-55-45-v1';
const allowed=new Set(['amendments30d','backdatingDays','amendmentRecencyHours','wageChangePct','employerExclusionsPer100','supervisorChangesPer100']);
export function approvedPatternAdjustments(result,catalog=approvedPatterns){
 const facts=Object.fromEntries([...allowed].map((key,i)=>[key,result.features?.[i]?.value]));
 return catalog.filter(p=>p&&p.status==='Approved'&&typeof p.approvedBy==='string'&&p.approvedBy.trim()&&Number.isFinite(Date.parse(p.approvedAt))&&typeof p.code==='string'&&/^[A-Z][A-Z0-9_]+$/.test(p.code)&&typeof p.description==='string'&&Number.isFinite(p.points)&&Math.abs(p.points)<=20&&Array.isArray(p.conditions)&&p.conditions.length>0&&p.conditions.every(c=>c&&allowed.has(c.feature)&&Number.isFinite(c.value)&&Number.isFinite(facts[c.feature])&&(['gte','lte'].includes(c.operator))&&(c.operator==='gte'?facts[c.feature]>=c.value:facts[c.feature]<=c.value))).map(p=>({code:p.code,description:p.description,points:p.points,approvedBy:p.approvedBy,approvedAt:p.approvedAt}));
}
export function hybridPolicy(context,result){
 const policy={policy:HYBRID_POLICY_VERSION,controlScore:context.ruleScore,scoreMeaning:'Hybrid review-priority score: 55% existing control + 45% custom Isolation Forest anomaly score + approved pattern adjustments. Not a fraud probability.'};
 if(!result.complete||!Number.isFinite(result.score))return {...policy,score:null,risk:'Incomplete',route:'Data Verification Review',status:'Complete evidence',reviewRequired:true,scoringComponents:null};
 const anomalyScore=Math.max(0,Math.min(100,result.score*100)),patterns=approvedPatternAdjustments(result),patternAdjustment=patterns.reduce((sum,p)=>sum+p.points,0);
 const base=context.ruleScore*.55+anomalyScore*.45,controlFloor=context.ruleScore>=80?75:0,score=Math.max(0,Math.min(100,Math.max(Math.round(base+patternAdjustment),controlFloor)));
 let risk=score>=75?'High':score>34?'Medium':'Low';
 if(risk==='Low'&&(result.modelFlagged||result.ruleFlagged||context.features?.crossSourceConflict))risk='Medium';
 const route=risk==='High'?'Fraud Prevention & Inspection Review':context.features?.crossSourceConflict?'Data Verification Review':risk==='Medium'?'Eligibility Verification':'Straight-through processing';
 return {...policy,score,risk,route,status:risk==='Low'?'Ready to proceed':'Awaiting specialist',reviewRequired:risk!=='Low',scoringComponents:{controlScore:context.ruleScore,anomalyScore,controlWeight:55,anomalyWeight:45,controlContribution:context.ruleScore*.55,anomalyContribution:anomalyScore*.45,patternAdjustment,approvedPatterns:patterns,controlFloor,formula:'round(0.55 × control score + 0.45 × anomaly score + approved adjustments), capped 0–100 with critical-control floor'}};
}
