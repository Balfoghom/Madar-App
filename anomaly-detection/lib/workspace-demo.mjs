import {randomUUID,createHash} from 'node:crypto';
import bundledBusiness from '../data/business-demo-cases.json' with {type:'json'};
import {createDemoPortfolio} from './demo-portfolio.mjs';
const names=['Mohammed Alotaibi','Noura Alharbi','Abdullah Alqahtani','Abeer Alasmari','Faisal Aldosari','Reem Alzahrani','Khalid Alghamdi','Hessa Alenezi','Saad Almutairi','Maha Alsubaie','Sultan Alrasheed','Jawaher Albalawi','Ahmed Aljuhani','Nouf Alasmari','Saleh Almarri','Ghada Almutairi'];
const employers=['Al Manar Services Co.','Riyadh Horizon Trading','Najd Technical Solutions','Eastern Gate Contracting','Al Waha Logistics','Arabian Field Services','Mada Operations Co.','Rowad Business Support','Takamul Industrial Services','Bunyan Facilities Management'];
const hash=value=>parseInt(createHash('sha256').update(String(value)).digest('hex').slice(0,7),16);
export function caseStatus(data){
 if(data.workflow?.stage==='Closed')return 'Closed';
 if(data.outcome&&!/^(Suspected|Inconclusive)/.test(data.outcome))return 'Outcome recorded';
 if(data.workflow?.stage==='Decision pending')return 'Awaiting decision';
 if(data.workflow?.stage==='Investigation'||data.outcome)return 'Under investigation';
 if(data.risk==='Incomplete'||data.features?.missingData)return 'Evidence needed';
 if(data.humanDecision?.action==='approve'||data.status==='Route approved')return 'Route approved';
 if(data.risk==='Low')return 'Ready to proceed';
 return 'Awaiting specialist';
}
export function enrichDemoRecord(record){
 if(!record.caseData||record.synthetic!==true)return record;
 const data={...record.caseData};const n=hash(data.subject||record.caseId),e=hash(data.entity||record.caseId);
 const replace=v=>!v||/^(Synthetic |SYN-|EMP-SYN|CTR-SYN|\d+ linked contributor|Not supplied|Missing employer)/i.test(v);
 if(replace(data.customerName))data.customerName=names[n%names.length];
 if(replace(data.employerName))data.employerName=employers[e%employers.length];
 if(replace(data.nationalIdMasked))data.nationalIdMasked= '10******'+String(n%100).padStart(2,'0');if(replace(data.mobileMasked))data.mobileMasked= '050***'+String(n%10000).padStart(4,'0');
 data.employerNumber ||= '700'+String(e%1000000).padStart(6,'0');data.supervisorName ||=names[(e+7)%names.length];data.supervisorUserId ||= 'USR-'+String(e%1000).padStart(3,'0');data.supervisorMobileMasked ||= '055***'+String(e%10000).padStart(4,'0');
 data.demoContextProvenance='Fictional presentation identity and control/financial context; source model evidence is unchanged.';
 if(!Number.isFinite(data.transactionAmount))data.transactionAmount=18000+(n%18)*3250;
 if(!Number.isFinite(data.amountAtRisk))data.amountAtRisk=data.risk==='Low'?0:Math.round(data.transactionAmount*.8);
 if(!Number.isFinite(data.ruleScore)){
   data.ruleScore=data.risk==='High'?85:data.risk==='Medium'?55:data.risk==='Low'?15:40;
   data.controlScoreProvenance='Supplied fictional operational-control context for the demo; not a model output.';
 }
 if(data.assessmentSource==='cross-journey'&&data.modelAssessment?.complete){data.score=data.ruleScore;data.scoreMeaning='Supplied demo control score; cross-journey model finding remains separate.';}
 data.financialProvenance ||= 'Fictional supplied scenario amount; not inferred from model output.';
 data.status=caseStatus(data);
 return {...record,caseData:data};
}
export function applyBusinessConfig(data,config){
 const components=data.scoringComponents||{behavior:data.anomalyScore||0,pattern:data.interaction||0};
 const median=values=>{const sorted=values.slice().sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
 let behavior=0;
 for(const key of ['velocity','retroDays','linkedEntities','priorRisk','overrides','identityReuse','amountChangePct']){
   const values=bundledBusiness.map(item=>Number(item.features[key])||0),med=median(values),mad=median(values.map(value=>Math.abs(value-med)))||Math.max(1,med*.25);
   const deviation=Math.max(0,((Number(data.features[key])||0)-med)/(1.4826*mad));
   behavior+=(config.featureWeights[key]||0)*Math.min(deviation/3,1);
 }
 if(data.features.crossSourceConflict)behavior+=config.featureWeights.crossSourceConflict;
 behavior=Math.max(0,Math.min(100,Math.round(behavior)));
 const interaction=Math.round(components.pattern*config.interactionMultiplier/100);
 const sum=config.controlWeight+config.anomalyWeight;
 const calculated=Math.round(data.ruleScore*config.controlWeight/sum+behavior*config.anomalyWeight/sum+interaction);
 const floor=data.ruleScore>=config.criticalControlFloor?config.highMin:0;
 const complete=!data.features?.missingData;
 const score=complete?Math.max(0,Math.min(100,Math.max(calculated,floor))):null;
 const risk=!complete?'Incomplete':score>=config.highMin?'High':score>config.lowMax?'Medium':'Low';
 const route=!complete?'Complete evidence':risk==='Low'?'Straight-through processing':risk==='High'?'Fraud Prevention & Inspection Review':'Additional verification';
 return {...data,score,risk,interaction,anomalyScore:behavior,scoringComponents:components,rulesAssessment:{...data.rulesAssessment,complete,score,route},recommendedRoute:route,route:data.reviewHistory?.some(r=>r.type==='decision')?data.route:route};
}
export function createBusinessPortfolio(now=new Date()){
 const time=now.toISOString();
 return bundledBusiness.map(original=>{
  const data=structuredClone(original),assessmentId=randomUUID();
  Object.assign(data,{assessmentId,assessedAt:time,requested:time,assessmentSource:'rules-demo',assessmentMode:'business-rule-simulation',businessSimulation:true,detectionMethod:'Business rules',comparison:'Business-rule scoring; no trained ML model used.',scoringComponents:{behavior:data.anomalyScore,pattern:data.interaction},reasonCodes:data.signals.map(([code,description])=>({code,description})),rulesEvidence:{requiredFields:['sourceRecordDate','referenceRecord','recordStatus'],fields:{sourceRecordDate:time,referenceRecord:'Bundled business scenario',recordStatus:'Active'},ruleCode:data.primaryCode,measure:'Configured business indicators',threshold:null,observed:data.features.velocity},rulesAssessment:{complete:!data.features.missingData,score:data.score,ruleFlagged:data.risk!=='Low',route:data.route,reasons:[data.primaryReason],version:'business-scoring-v1'}});
  if(data.features.missingData){data.risk='Incomplete';data.score=null;data.rulesAssessment.complete=false;data.rulesEvidence.fields.referenceRecord=null;data.route='Complete evidence';}
  const reviewHistory=data.outcome?[{caseId:data.id,assessmentId,reviewId:randomUUID(),type:'outcome',outcome:data.outcome,actorName:data.decisionOwner,recordedAt:time,note:'Scripted business demonstration outcome.',syntheticExample:true}]:[];
  data.reviewHistory=reviewHistory;data.outcomeProvenance=data.outcome?'Scripted demo outcome':null;data.status=caseStatus(data);
  return {caseId:data.id,assessmentId,assessedAt:time,synthetic:true,assessmentSource:'rules-demo',journey:data.journey,complete:data.rulesAssessment.complete,ruleFlagged:data.rulesAssessment.ruleFlagged,caseData:data,reviewHistory,applicationAssessment:{route:data.route},reasonCodes:data.reasonCodes};
 });
}
export function createWorkspacePortfolio(now=new Date()){return [...createBusinessPortfolio(now),...createDemoPortfolio(now)].map(enrichDemoRecord);}
