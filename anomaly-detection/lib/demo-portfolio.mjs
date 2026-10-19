import {randomUUID} from 'node:crypto';
import {createApplicationAssessment} from './assessment-adapter.mjs';
import {createCrossJourneyAssessment,demoCases} from './cross-journey-adapter.mjs';
import {withDataQuality} from './data-quality.mjs';

const locations=[['Riyadh','Riyadh'],['Makkah','Jeddah'],['Eastern Province','Dammam'],['Madinah','Madinah'],['Asir','Abha'],['Qassim','Buraydah'],['Tabuk','Tabuk'],['Hail','Hail'],['Jazan','Jazan'],['Najran','Najran'],['Al Baha','Al Baha'],['Northern Borders','Arar'],['Al Jawf','Sakaka']];
const rules=[
  ['Benefit Payments','PAYMENT_ACCOUNT_MISMATCH','Beneficiary and payment-account ownership do not match','account ownership discrepancies',0],
  ['Contribution & Wage','CONTRIBUTION_RECONCILIATION','Declared contribution and payroll totals differ','unreconciled payroll entries',2],
  ['Employer Registration','EMPLOYER_REGISTRATION_DUPLICATE','Employer registration contains duplicate active records','duplicate registration records',0],
  ['Retirement','RETIREMENT_PERIOD_CONFLICT','Contribution periods overlap in the supplied eligibility records','overlapping contribution periods',0],
  ['Maternity Benefit','MATERNITY_DUPLICATE_REQUEST','More than one request refers to the same benefit period','duplicate requests for one benefit period',0]
];
function outcome(record,kind,amount=0){
  const data=record.caseData, prevented=kind==='prevented';
  const label=prevented?'Confirmed violation':kind==='normal'?'Legitimate activity':'Suspected fraud — further investigation';
  const review={reviewId:randomUUID(),caseId:record.caseId,assessmentId:record.assessmentId,type:'outcome',actorName:'Scripted demo specialist',recordedAt:record.assessedAt,outcome:label,syntheticExample:true,note:prevented?'Scripted demonstration: the specialist verifies the finding and records a simulated pre-payment intervention. No real payment was stopped.':'Scripted demonstration outcome; not an actual investigation.'};
  Object.assign(data,{outcome:label,financialOutcome:prevented?'Prevented before payment':kind==='normal'?'Proceeded':null,preventedAmount:amount,confirmedFraudAmount:0,amountAtRisk:kind==='normal'?0:data.amountAtRisk,paymentStatus:prevented?'Prevented':kind==='normal'?'Released':'Pending',decisionDate:record.assessedAt,decisionOwner:review.actorName,status:kind==='suspected'?'Under investigation':'Outcome recorded',outcomeProvenance:'Scripted demo outcome',reviewHistory:[review]});
  record.reviewHistory=[review];
}
export function createDemoPortfolio(now=new Date()){
  const records=[],time=now.toISOString();
  rules.forEach(([journey,code,reason,measure,limit],j)=>{
    for(let n=0;n<6;n++){
      const index=j*6+n,id='SYN-ENTERPRISE-RULE-'+String(index+1).padStart(3,'0');
      const [region,city]=locations[index%locations.length], missing=n>=4;
      const value=n===3?0:limit+(n<2?3:1), score=n===3?10:n<2?85:55;
      const fields={observedExceptions:value,sourceRecordDate:time,referenceRecord:'Synthetic reference supplied',reviewPeriod:time.slice(0,7),recordStatus:'Active',verificationSource:'Synthetic source extract'};
      if(n===4)delete fields.referenceRecord;
      if(n===5){delete fields.referenceRecord;delete fields.sourceRecordDate;delete fields.verificationSource;}
      const complete=!missing, flagged=complete&&value>limit;
      const route=missing?'Complete evidence':flagged?'Specialist review':'Standard review';
      const reasonText=missing?'Required source fields are missing; complete the evidence before relying on this control.':flagged?`${reason}: ${value} ${measure}; the demonstration threshold is more than ${limit}.`:'The supplied records did not trigger this demonstration control.';
      const reasonCodes=[{code:missing?'EVIDENCE_INCOMPLETE':flagged?code:'NO_RULE_TRIGGER',description:reasonText}];
      const assessmentId=randomUUID(),transactionAmount=18000+index*3500;
      const data={id,transactionId:'MADAR-RULE-'+(index+1),synthetic:true,demoPortfolio:true,journey,scenario:missing?'Source evidence needs completion':flagged?reason:'Routine '+journey.toLowerCase()+' activity',subject:'SYN-SUBJECT-'+(index+1),customerName:'Synthetic customer '+(index+1),entity:'SYN-EMPLOYER-'+(j+1),employerName:'Synthetic employer '+(j+1),country:index===11||index===23?'United Arab Emirates':'Saudi Arabia',region,city,requested:time,assessedAt:time,assessmentId,assessmentSource:'rules-demo',assessmentMode:'rules-only',detectionMethod:'Rules only',ruleScore:score,score:complete?score:null,risk:missing?'Incomplete':score>=75?'High':score>=35?'Medium':'Low',route,recommendedRoute:route,status:missing?'Complete evidence':flagged?'Awaiting specialist':'Ready to proceed',features:{missingData:missing?1:0,crossSourceConflict:0,urgentPriority:0},rulesEvidence:{requiredFields:Object.keys({observedExceptions:0,sourceRecordDate:0,referenceRecord:0,reviewPeriod:0,recordStatus:0,verificationSource:0}),fields,ruleCode:code,measure,threshold:limit,observed:value},rulesAssessment:{complete,ruleFlagged:flagged,score:complete?score:null,route,reasons:[reasonText],version:'illustrative-business-controls-v1'},source:'Illustrative business-rule output',reasonCodes,signals:reasonCodes.map(r=>[r.code,r.description]),primaryCode:reasonCodes[0].code,primaryReason:reasonText,anomalyScore:null,interaction:0,comparison:'Rules-only demonstration; no trained AI model was used for this case.',events:[['Source records received',time],['Business control assessed',time]],audit:['Illustrative rule applied to synthetic source records.'],transactionAmount,amountAtRisk:missing?null:flagged?transactionAmount:0,preventedAmount:0,confirmedFraudAmount:0,currency:'SAR',paymentStatus:'Pending',detectionStage:'Before payment',financialOutcome:null,outcome:null,financialProvenance:'Supplied synthetic scenario amounts; not inferred from model scores or wages.'};
      const record={caseId:id,assessmentId,assessedAt:time,synthetic:true,assessmentSource:'rules-demo',journey,complete,ruleFlagged:flagged,risk:data.risk,reasonCodes,applicationAssessment:{route},caseData:data};
      if(n===1)outcome(record,'prevented',transactionAmount);
      if(n===2)outcome(record,'suspected');
      if(n===3)outcome(record,'normal');
      records.push(record);
    }
  });
  ['00000','00002','00005'].forEach((suffix,index)=>{
    const id='NEW-ENTERPRISE-SANED-'+index,[region,city]=locations[index+3];
    const record=createApplicationAssessment({id,transactionId:'MADAR-AI-SANED-'+index,synthetic:true,journey:'SANED',scenario:['Routine SANED history','SANED review with simulated prevention','Incomplete SANED history'][index],subject:'SYN-demo-'+suffix,entity:'SYN-AI-EMPLOYER-'+index,customerName:'Synthetic SANED claimant '+(index+1),employerName:'Synthetic SANED employer '+(index+1),country:'Saudi Arabia',region,city,requested:time,ruleScore:index===1?45:10,transactionAmount:24000,amountAtRisk:index===2?null:index===1?24000:0,paymentStatus:'Pending',detectionStage:'Before payment',features:{},modelInput:{case_id:'SYN-demo-'+suffix}});
    record.assessedAt=time;Object.assign(record.caseData,{demoPortfolio:true,assessedAt:time,detectionMethod:'SANED AI + controls',financialProvenance:'Supplied synthetic benefit request amount; not a calculated entitlement.'});
    if(index===1&&record.modelFlagged)outcome(record,'prevented',24000);
    records.push(record);
  });
  demoCases.forEach((evidence,index)=>{
    const record=createCrossJourneyAssessment({...structuredClone(evidence),id:'CJ-SYN-enterprise-'+String(index).padStart(3,'0')});
    const [region,city]=locations[index+6];
    record.assessedAt=time;
    Object.assign(record.caseData,{demoPortfolio:true,scenario:['Routine connected activity','Connected activity with simulated prevention','Legitimate restructuring pattern','Shared identifier pattern','Conflicting source records','Incomplete linked history'][index],assessedAt:time,requested:time,country:'Saudi Arabia',region,city,transactionAmount:42000+index*6000,amountAtRisk:!record.complete?null:(record.modelFlagged||record.ruleFlagged)?42000+index*6000:0,detectionMethod:'Cross-journey AI + comparator rules',financialProvenance:'Supplied synthetic request total for the linked contributors; not inferred from wage changes.'});
    if(index===1&&record.modelFlagged)outcome(record,'prevented',record.caseData.transactionAmount);
    records.push(record);
  });
  return records.map(withDataQuality);
}
