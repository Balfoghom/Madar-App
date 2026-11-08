/* Shared Appendix calculation. Model outputs are supporting evidence only. */
(() => {
 const version='appendix-scoring-v1';
 const defaults={controlWeight:55,anomalyWeight:45,interactionMultiplier:100,lowMax:34,highMin:75,criticalControlFloor:80,featureWeights:{velocity:18,linkedEntities:14,retroDays:12,priorRisk:12,identityReuse:12,amountChangePct:12,crossSourceConflict:12,overrides:8}};
 // Frozen reference statistics from the original business-scenario baseline.
 const baseline={"velocity": {"median": 4.0, "mad": 2.0}, "retroDays": {"median": 0.0, "mad": 1}, "linkedEntities": {"median": 3.0, "mad": 1.0}, "priorRisk": {"median": 35.0, "mad": 17.0}, "overrides": {"median": 0.0, "mad": 1}, "identityReuse": {"median": 2.0, "mad": 1.0}, "amountChangePct": {"median": 0.0, "mad": 1}};
 const keys=[...Object.keys(baseline),'crossSourceConflict'];
 const labels={velocity:'Rapid event velocity',linkedEntities:'Linked-entity concentration',retroDays:'Retroactive material change',priorRisk:'Prior validated outcome',identityReuse:'Identifier reuse',amountChangePct:'Material amount or wage change',crossSourceConflict:'Cross-source conflict',overrides:'Repeated control override'};
 function calculate(context,config=defaults){
  const f=context.behavioralInputs??context.features??{},missing=keys.filter(k=>k==='crossSourceConflict'?!([true,false,0,1].includes(f[k])):!(Number.isFinite(f[k])&&f[k]>=0));
  const controlValid=Number.isFinite(context.ruleScore)&&context.ruleScore>=0&&context.ruleScore<=100;
  const base={policy:version,controlScore:context.ruleScore,scoreMeaning:'Appendix assessment: 55% existing control + 45% feature-based behavioral score + pattern adjustments. Model findings are separate supporting evidence; not a fraud probability.'};
  if(!controlValid||missing.length||context.requiredEvidenceMissing)return {...base,decisionComplete:false,score:null,risk:'Incomplete',route:'Data Verification Review',status:'Complete evidence',reviewRequired:true,scoringComponents:null,missingBehavioralInputs:missing,decisionIssue:!controlValid?'Existing control score is missing or invalid; supply a score between 0 and 100.':missing.length?'Required behavioral inputs missing or invalid: '+missing.map(k=>labels[k]).join(', ')+'.':'Required source evidence is incomplete.'};
  const featureContributions=Object.entries(baseline).map(([key,b])=>{const deviation=Math.max(0,(f[key]-b.median)/(1.4826*b.mad)),maximum=config.featureWeights[key];return {key,label:labels[key],value:f[key],median:b.median,mad:b.mad,maximum,points:maximum*Math.min(deviation/3,1)};});
  featureContributions.push({key:'crossSourceConflict',label:labels.crossSourceConflict,value:Number(f.crossSourceConflict),maximum:config.featureWeights.crossSourceConflict,points:f.crossSourceConflict?config.featureWeights.crossSourceConflict:0});
  const behavior=Math.max(0,Math.min(100,Math.round(featureContributions.reduce((s,c)=>s+c.points,0))));
  const patterns=[];const add=(condition,code,description,points)=>{if(condition)patterns.push({code:'APPENDIX_PATTERN_'+code,description,points});};
  add(f.identityReuse>=3&&f.crossSourceConflict,'IDENTIFIER_CONFLICT','Identifier reuse with a source conflict',10);
  add(f.velocity>=6&&f.linkedEntities>=7,'RAPID_LINKED_ACTIVITY','Rapid activity across linked entities',10);
  add(f.amountChangePct>=80&&f.velocity>=2,'RAPID_MATERIAL_CHANGE','Material change within a rapid sequence',8);
  add(f.crossSourceConflict&&f.priorRisk>=50,'PRIOR_OUTCOME_CONFLICT','Source conflict with a prior validated outcome indicator',8);
  add(f.retroDays>=7&&f.velocity>=2,'RAPID_RETROACTIVE_CHANGE','Retroactive change within a rapid sequence',8);
  add(f.overrides>=2,'REPEATED_OVERRIDE','Repeated control overrides',5);
  const country=String(context.country||'').toLowerCase();
  add(!!country&&!/saudi|ksa|المملكة/.test(country)&&f.crossSourceConflict,'EXTERNAL_SOURCE_CONFLICT','Source conflict with external location context',4);
  const patternAdjustment=Math.round(patterns.reduce((s,p)=>s+p.points,0)*config.interactionMultiplier/100),sum=config.controlWeight+config.anomalyWeight;
  const controlContribution=context.ruleScore*config.controlWeight/sum,anomalyContribution=behavior*config.anomalyWeight/sum,controlFloor=context.ruleScore>=config.criticalControlFloor?config.highMin:0;
  const score=Math.max(0,Math.min(100,Math.max(Math.round(controlContribution+anomalyContribution+patternAdjustment),controlFloor))),risk=score>=config.highMin?'High':score>config.lowMax?'Medium':'Low';
  const route=risk==='High'?'Fraud Prevention & Inspection Review':risk==='Medium'?'Eligibility Verification':'Straight-through processing';
  return {...base,decisionComplete:true,score,risk,route,status:risk==='Low'?'Ready to proceed':'Awaiting specialist',reviewRequired:risk!=='Low',missingBehavioralInputs:[],scoringComponents:{controlScore:context.ruleScore,anomalyScore:behavior,behavioralScore:behavior,controlWeight:config.controlWeight,anomalyWeight:config.anomalyWeight,controlContribution,anomalyContribution,patternAdjustment,approvedPatterns:patterns,featureContributions,controlFloor,formula:'round(0.55 × control score + 0.45 × feature-based behavioral score + pattern adjustments), capped 0–100 with critical-control floor'}};
 }
 globalThis.MadarAppendixScoring={version,defaults,baseline,keys,calculate};
})();
