import approvedPatterns from '../data/approved-behavioral-patterns.json' with {type:'json'};
export const HYBRID_POLICY_VERSION='hybrid-review-55-45-v2';
const allowed=new Set(['amendments30d','backdatingDays','amendmentRecencyHours','wageChangePct','employerExclusionsPer100','supervisorChangesPer100']);
export function approvedPatternAdjustments(result,catalog=approvedPatterns,context={}){
 const facts=Object.fromEntries((result.features||[]).filter(f=>typeof f.name==='string').map(f=>[f.name,f.value]));
 if(context.journey==='SANED'&&context.assessmentSource!=='cross-journey')for(const [i,key] of [...allowed].entries())facts[key]=result.features?.[i]?.value;
 return catalog.filter(p=>p&&p.status==='Approved'&&p.journey===context.journey&&p.modelVersion===result.modelVersion&&typeof p.approvedBy==='string'&&p.approvedBy.trim()&&Number.isFinite(Date.parse(p.approvedAt))&&typeof p.code==='string'&&/^[A-Z][A-Z0-9_]+$/.test(p.code)&&typeof p.description==='string'&&Number.isFinite(p.points)&&Math.abs(p.points)<=20&&Array.isArray(p.conditions)&&p.conditions.length>0&&p.conditions.every(c=>c&&Object.hasOwn(facts,c.feature)&&Number.isFinite(c.value)&&Number.isFinite(facts[c.feature])&&(['gte','lte'].includes(c.operator))&&(c.operator==='gte'?facts[c.feature]>=c.value:facts[c.feature]<=c.value))).map(p=>({code:p.code,description:p.description,points:p.points,approvedBy:p.approvedBy,approvedAt:p.approvedAt}));
}
export function hybridPolicy(context,result){
 const policy={policy:HYBRID_POLICY_VERSION,controlScore:context.ruleScore,scoreMeaning:'Hybrid review-priority score: 55% existing control + 45% existing model AI score + approved pattern adjustments. Not a fraud probability.'};
 const validControl=Number.isFinite(context.ruleScore)&&context.ruleScore>=0&&context.ruleScore<=100;
 if(!result.complete||!Number.isFinite(result.score)||!validControl)return {...policy,score:null,risk:'Incomplete',route:'Data Verification Review',status:'Complete evidence',reviewRequired:true,scoringComponents:null,decisionComplete:false,decisionIssue:!validControl?'Existing control score is missing or invalid; supply a score between 0 and 100.':'Required model evidence is incomplete.'};
 const anomalyScore=Math.max(0,Math.min(100,result.score*100)),patterns=approvedPatternAdjustments(result,approvedPatterns,context),patternAdjustment=patterns.reduce((sum,p)=>sum+p.points,0);
 const base=context.ruleScore*.55+anomalyScore*.45,controlFloor=context.ruleScore>=80?75:0,score=Math.max(0,Math.min(100,Math.max(Math.round(base+patternAdjustment),controlFloor)));
 let risk=score>=75?'High':score>34?'Medium':'Low';
 if(risk==='Low'&&(result.modelFlagged||result.ruleFlagged||context.features?.crossSourceConflict))risk='Medium';
 const route=risk==='High'?'Fraud Prevention & Inspection Review':context.features?.crossSourceConflict?'Data Verification Review':risk==='Medium'?'Eligibility Verification':'Straight-through processing';
 return {...policy,decisionComplete:true,score,risk,route,status:risk==='Low'?'Ready to proceed':'Awaiting specialist',reviewRequired:risk!=='Low',scoringComponents:{controlScore:context.ruleScore,anomalyScore,controlWeight:55,anomalyWeight:45,controlContribution:context.ruleScore*.55,anomalyContribution:anomalyScore*.45,patternAdjustment,approvedPatterns:patterns,controlFloor,formula:'round(0.55 × control score + 0.45 × anomaly score + approved adjustments), capped 0–100 with critical-control floor'}};
}

export function hybridReasons(policy){
 if(!policy.decisionComplete)return [{code:policy.decisionIssue?.startsWith('Existing control')?'CONTROL_SCORE_MISSING':'EVIDENCE_INCOMPLETE',description:policy.decisionIssue}];
 return [{code:'HYBRID_SCORE_COMPONENTS',description:`Hybrid review score ${policy.score}/100 combines existing control ${policy.controlScore}/100, AI score ${policy.scoringComponents.anomalyScore.toFixed(1)}/100 and approved pattern adjustment ${policy.scoringComponents.patternAdjustment}.`},...policy.scoringComponents.approvedPatterns.map(p=>({code:p.code,description:`${p.description} (${p.points} approved adjustment points).`}))];
}
