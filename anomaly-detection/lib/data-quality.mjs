import {withRouting} from './routing-policy.mjs';
// Transparent field checks, not a probability that the case or model is correct.
const supplied = value => typeof value === 'string' && value.trim() && !/^(not supplied|missing employer|—)$/i.test(value.trim());
const number = value => typeof value === 'number' && Number.isFinite(value);
export function dataQuality(data) {
  const checks=[];
  const check=(field,valid,critical=false)=>checks.push({field,valid:!!valid,critical});
  for(const field of ['transactionId','journey','subject','entity','country','region','city']) check(field,supplied(data[field]),['subject','entity'].includes(field));
  check('transactionAmount',number(data.transactionAmount)&&data.transactionAmount>=0);
  if(data.assessmentSource!=='cross-journey'||data.assessmentMode==='hybrid')check('existingControlScore',number(data.ruleScore)&&data.ruleScore>=0&&data.ruleScore<=100,true);
  // Linked-event conflicts are counted at their source cell, not again in the aggregate flag.
  if(!data.crossJourneyEvidence)check('sourceConsistency',!data.features?.crossSourceConflict);
  if(data.accessEvidence){
    const access=data.accessEvidence;
    check('access.loginDate',typeof access.loginDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(access.loginDate)&&Number.isFinite(Date.parse(access.loginDate+'T00:00:00Z')),true);
    check('access.loginTime',typeof access.loginTime==='string'&&/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(access.loginTime),true);
  }
  const linked=data.crossJourneyEvidence;
  const saned=data.modelInput?.sanedCase;
  if(linked || saned || (data.journey==='SANED' && data.modelAssessment)) {
    const evidence=linked || saned || {};
    check('history.assessmentTime',number(evidence.asOf),true);
    if(linked)check('history.employer',supplied(evidence.employerId),true);
    else check('history.workforce',Number.isInteger(evidence.workforce)&&evidence.workforce>0,true);
    const events=Array.isArray(evidence.events)?evidence.events:[];
    check('history.eventsPresent',events.length>0,true);
    events.forEach((event,index)=>{
      const key='history.event['+(index+1)+'].';
      check(key+'type',supplied(event?.type),true);
      check(key+'recordedAt',number(event?.recordedAt),true);
      check(key+'subject',supplied(linked?event?.subjectId:event?.subject),true);
      if(linked){check(key+'eventId',supplied(event?.eventId),true);check(key+'journey',supplied(event?.journey),true);check(key+'employer',supplied(event?.employerId),true);}
      if(event?.type==='wage'){
        check(key+'amount',number(event.amount)&&event.amount>0,true);
        if(linked)check(key+'previousAmount',number(event.previousAmount)&&event.previousAmount>0,true);
      }
      if(linked&&event?.type==='login'){check(key+'latitude',number(event.latitude)&&Math.abs(event.latitude)<=90,true);check(key+'longitude',number(event.longitude)&&Math.abs(event.longitude)<=180,true);check(key+'locationVerification',typeof event.locationVerified==='boolean',true);}
      if(linked&&event?.type==='iban_change'){check(key+'newAccount',supplied(event.identifierId),true);check(key+'previousAccount',supplied(event.previousIdentifierId),true);}
      if(linked&&event?.type==='profile_update')check(key+'changedField',supplied(event.changedField),true);
      if(event?.type==='amendment')check(key+'effectiveAt',number(event.effectiveAt),true);
      if(typeof event?.sourceConflict==='boolean')check(key+'sourceConsistency',!event.sourceConflict);
    });
  } else if(data.rulesEvidence) {
    for(const field of data.rulesEvidence.requiredFields)check('source.'+field,supplied(data.rulesEvidence.fields[field])||number(data.rulesEvidence.fields[field]),true);
  } else if(data.journeyFeatures) {
    for(const [field,value] of Object.entries(data.journeyFeatures))check('source.'+field,number(value));
  }
  if(data.features?.missingData && !checks.some(c=>c.critical&&!c.valid))check('reportedRequiredInformation',false,true);
  const passed=checks.filter(c=>c.valid).length, score=Math.round(100*passed/checks.length);
  return {version:'field-quality-v1',score,label:checks.some(c=>!c.valid&&c.critical)?'Low':score>=90?'High':score>=75?'Medium':'Low',passed,total:checks.length,issues:checks.filter(c=>!c.valid),criticalMissing:checks.some(c=>!c.valid&&c.critical),method:'Valid applicable field checks ÷ all applicable field checks × 100. Each required source cell is checked separately; optional fields are excluded. A missing critical field forces the quality label to Low regardless of the completeness percentage. This measures supplied-data completeness, basic validity and reported consistency, not source accuracy or fraud probability.'};
}
export function withDataQuality(record){
  if(!record.caseData)return record;
  const quality=dataQuality(record.caseData);
  return withRouting({...record,caseData:{...record.caseData,dataQuality:quality,confidenceScore:quality.score,confidence:quality.label}});
}
