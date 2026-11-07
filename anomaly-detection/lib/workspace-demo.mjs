import {hybridPolicy,hybridReasons} from './hybrid-policy.mjs';
import {randomUUID,createHash} from 'node:crypto';
import bundledBusiness from '../data/business-demo-cases.json' with {type:'json'};
import {withDataQuality} from './data-quality.mjs';
import {createApplicationAssessment} from './assessment-adapter.mjs';
import {routingPolicy} from './routing-policy.mjs';
import {createDemoPortfolio} from './demo-portfolio.mjs';
import maternityIntake from '../cross-journey/data/maternity-intake-cases.json' with {type:'json'};
import {createCrossJourneyAssessment} from './cross-journey-adapter.mjs';
const names=['Mohammed Alotaibi','Noura Alharbi','Abdullah Alqahtani','Abeer Alasmari','Faisal Aldosari','Reem Alzahrani','Khalid Alghamdi','Hessa Alenezi','Saad Almutairi','Maha Alsubaie','Sultan Alrasheed','Jawaher Albalawi','Ahmed Aljuhani','Nouf Alasmari','Saleh Almarri','Ghada Almutairi'];
const employers=['Al Manar Services Co.','Riyadh Horizon Trading','Najd Technical Solutions','Eastern Gate Contracting','Al Waha Logistics','Arabian Field Services','Mada Operations Co.','Rowad Business Support','Takamul Industrial Services','Bunyan Facilities Management'];
const hash=value=>parseInt(createHash('sha256').update(String(value)).digest('hex').slice(0,7),16);
const maleNames=['Mohammed','Abdullah','Faisal','Khalid','Saad','Sultan','Ahmed','Saleh','Omar','Turki','Nasser','Ibrahim','Yousef','Abdulaziz','Majed','Bader','Fahad','Hamad','Rakan','Waleed','Abdulrahman','Mansour','Ziyad','Nawaf'];
const femaleNames=['Noura','Abeer','Reem','Hessa','Maha','Jawaher','Nouf','Ghada','Sara','Lama','Shahad','Mona','Rana','Alanoud','Hind','Amal','Haifa','Razan','Dalal','Hanan','Mariam','Fatimah','Afnan','Wadha'];
const fathers=['Abdullah','Mohammed','Ibrahim','Abdulaziz','Hamad','Nasser','Khalid','Fahad'];
const families=['Alotaibi','Alharbi','Alqahtani','Alasmari','Aldosari','Alzahrani','Alghamdi','Alenezi','Almutairi','Alsubaie','Alrasheed','Albalawi','Aljuhani','Almarri'];
const demoIds=[...Array.from({length:30},(_,i)=>'BRI-'+String(i+1).padStart(3,'0')),...Array.from({length:30},(_,i)=>'SYN-ENTERPRISE-RULE-'+String(i+1).padStart(3,'0')),...Array.from({length:3},(_,i)=>'NEW-ENTERPRISE-SANED-'+i),...Array.from({length:12},(_,i)=>'CJ-SYN-enterprise-'+String(i).padStart(3,'0')),'NEW-SANED-DQ-LOGIN-DATE','NEW-SANED-DQ-LOGIN-TIME'];
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
 const index=demoIds.indexOf(record.caseId);
 if(index>=0){const pool=data.journey==='Maternity Benefit'?femaleNames:(index%3===1?femaleNames:maleNames);data.customerName=pool[index%pool.length]+' '+fathers[Math.floor(index/pool.length)%fathers.length]+' '+families[index%families.length];data.demoIdentityVersion='distinct-saudi-names-v2';}
 else if(replace(data.customerName))data.customerName=names[n%names.length];
 if(/^BRI-0(3[1-9]|[45][0-9]|60)$/.test(record.caseId))data.demoDuplicateOf='BRI-'+String(Number(record.caseId.slice(4))-30).padStart(3,'0');
 if(replace(data.employerName))data.employerName=employers[e%employers.length];
 if(replace(data.nationalIdMasked))data.nationalIdMasked= '10******'+String(n%100).padStart(2,'0');if(replace(data.mobileMasked))data.mobileMasked= '050***'+String(n%10000).padStart(4,'0');
 data.employerNumber ||= '700'+String(e%1000000).padStart(6,'0');data.supervisorName ||=names[(e+7)%names.length];data.supervisorUserId ||= 'USR-'+String(e%1000).padStart(3,'0');data.supervisorMobileMasked ||= '055***'+String(e%10000).padStart(4,'0');
 data.demoContextProvenance='Fictional presentation identity and control/financial context; source model evidence is unchanged.';
 if(!Number.isFinite(data.transactionAmount))data.transactionAmount=18000+(n%18)*3250;
 if(!Number.isFinite(data.amountAtRisk))data.amountAtRisk=data.risk==='Low'?0:Math.round(data.transactionAmount*.8);
 if(!Number.isFinite(data.ruleScore)&&!(data.assessmentMode==='hybrid'&&data.assessmentSource==='cross-journey')){
   data.ruleScore=data.risk==='High'?85:data.risk==='Medium'?55:data.risk==='Low'?15:40;
   data.controlScoreProvenance='Supplied fictional operational-control context for the demo; not a model output.';
 }
 if(data.assessmentSource==='cross-journey'&&data.assessmentMode==='hybrid'){
  const policy=hybridPolicy(data,data.modelAssessment);Object.assign(data,policy,{anomalyScore:policy.scoringComponents?.anomalyScore??null,interaction:policy.scoringComponents?.patternAdjustment||0});
  data.features={...data.features,missingData:!policy.decisionComplete};data.reasonCodes=[...(data.reasonCodes||[]).filter(r=>!['HYBRID_SCORE_COMPONENTS','CONTROL_SCORE_MISSING'].includes(r.code)),...hybridReasons(policy)];data.signals=data.reasonCodes.map(r=>[r.code,r.description]);
 }

 data.financialProvenance ||= 'Fictional supplied scenario amount; not inferred from model output.';
 data.status=caseStatus(data);
 return withDataQuality({...record,caseData:data});
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
 const route=!complete?'Data Verification Review':risk==='Low'?'Straight-through processing':risk==='High'?'Fraud Prevention & Inspection Review':'Eligibility Verification';
 return routingPolicy.apply({...data,score,risk,interaction,anomalyScore:behavior,scoringComponents:components,rulesAssessment:{...data.rulesAssessment,complete,score,route},recommendedRoute:route,route:data.reviewHistory?.some(r=>r.type==='decision')?data.route:route});
}
export function createBusinessPortfolio(now=new Date()){
 const time=now.toISOString();
 return bundledBusiness.filter((item,index,array)=>array.findIndex(other=>other.journey===item.journey&&other.scenario===item.scenario)===index).map(original=>{
  const data=structuredClone(original),assessmentId=randomUUID();
  Object.assign(data,{assessmentId,assessedAt:time,requested:time,assessmentSource:'rules-demo',assessmentMode:'business-rule-simulation',businessSimulation:true,detectionMethod:'Business rules',comparison:'Business-rule scoring; no trained ML model used.',scoringComponents:{behavior:data.anomalyScore,pattern:data.interaction},reasonCodes:data.signals.map(([code,description])=>({code,description})),rulesEvidence:{requiredFields:['sourceRecordDate','referenceRecord','recordStatus'],fields:{sourceRecordDate:time,referenceRecord:'Bundled business scenario',recordStatus:'Active'},ruleCode:data.primaryCode,measure:'Configured business indicators',threshold:null,observed:data.features.velocity},rulesAssessment:{complete:!data.features.missingData,score:data.score,ruleFlagged:data.risk!=='Low',route:data.route,reasons:[data.primaryReason],version:'business-scoring-v1'}});
  if(data.features.missingData){data.risk='Incomplete';data.score=null;data.rulesAssessment.complete=false;data.rulesEvidence.fields.referenceRecord=null;data.route='Complete evidence';}
  const reviewHistory=data.outcome?[{caseId:data.id,assessmentId,reviewId:randomUUID(),type:'outcome',outcome:data.outcome,actorName:data.decisionOwner,recordedAt:time,note:'Scripted business demonstration outcome.',syntheticExample:true}]:[];
  data.reviewHistory=reviewHistory;data.outcomeProvenance=data.outcome?'Scripted demo outcome':null;data.status=caseStatus(data);
  return {caseId:data.id,assessmentId,assessedAt:time,synthetic:true,assessmentSource:'rules-demo',journey:data.journey,complete:data.rulesAssessment.complete,ruleFlagged:data.rulesAssessment.ruleFlagged,caseData:data,reviewHistory,applicationAssessment:{route:data.route},reasonCodes:data.reasonCodes};
 });
}
export function createLoginQualityExamples(now=new Date()){
 return ['DATE','TIME'].map((field,index)=>{
  const record=createApplicationAssessment({id:'NEW-SANED-DQ-LOGIN-'+field,transactionId:'SANED-DQ-'+(index+1),synthetic:true,journey:'SANED',scenario:index===0?'Login date missing before a SANED request':'Login time missing before a SANED request',subject:'SYN-DQ-LOGIN-'+field,entity:'SYN-DQ-EMPLOYER-'+index,country:'Saudi Arabia',region:index?'Makkah':'Riyadh',city:index?'Jeddah':'Riyadh',ruleScore:25,transactionAmount:18000+index*6000,amountAtRisk:0,features:{missingData:1},accessEvidence:{loginDate:index===0?null:'2026-11-05',loginTime:index===1?null:'09:42',source:'Synthetic access-log extract'},modelInput:{case_id:'SYN-demo-00000'}});
  Object.assign(record.caseData,{demoPortfolio:true,assessedAt:now.toISOString(),requested:now.toISOString(),primaryCode:'LOGIN_'+field+'_MISSING',primaryReason:'The login '+field.toLowerCase()+' is missing. Complete the access log before relying on event chronology or the risk assessment.',reasonCodes:[{code:'LOGIN_'+field+'_MISSING',description:'Required login '+field.toLowerCase()+' is missing.'}],paymentStatus:'Pending',detectionStage:'Before payment'});
  record.caseData.signals=record.caseData.reasonCodes.map(r=>[r.code,r.description]);record.assessedAt=now.toISOString();
  return record;
 });
}
export function createWorkspacePortfolio(now=new Date()){return [...createBusinessPortfolio(now),...createDemoPortfolio(now),...createLoginQualityExamples(now)].map(enrichDemoRecord);}
export function activeWorkspaceRecords(records){return records.filter((r,i,a)=>r.caseData&&!r.caseData.demoDuplicateOf&&a.findIndex(x=>x.caseId===r.caseId)===i);}

// This fixed source batch is separate from the preloaded portfolio. Stable source
// IDs make retries safe; every new history goes through the fitted model.
export const DEMO_INTAKE_BATCH='maternity-v1';
export function createDemoIntake(now=new Date()){
 const names=['Latifah Saad Alharbi','Dania Omar Alqahtani','Bayan Fahad Alotaibi','Wijdan Khalid Alzahrani','Raghad Nasser Alghamdi','Basma Hamad Almutairi'];
 const scenarios=['Registration and wage changes before linked maternity requests','Shared payment account before maternity requests','Conflicting wage records before a maternity request','Routine maternity request with linked employment history','Maternity request after a legitimate account update','Maternity request missing a contributor link'];
 return maternityIntake.map((evidence,index)=>{
  const record=createCrossJourneyAssessment(structuredClone(evidence),{ruleScore:[25,25,55,10,15,25][index]});
  Object.assign(record.caseData,{demoPortfolio:true,demoIntakeBatch:DEMO_INTAKE_BATCH,intakeReceivedAt:now.toISOString(),customerName:names[index],scenario:scenarios[index],country:'Saudi Arabia',region:index%2?'Makkah':'Riyadh',city:index%2?'Jeddah':'Riyadh',transactionAmount:24000+index*2000,amountAtRisk:!record.complete?null:(record.modelFlagged||record.ruleFlagged)?24000+index*2000:0,financialProvenance:'Supplied synthetic maternity request amount; not an inferred entitlement or confirmed loss.',detectionMethod:'Cross-journey AI + comparator rules'});
  const enriched=enrichDemoRecord(record);
  if(!record.complete)enriched.caseData.amountAtRisk=null;
  return enriched;
 });
}
