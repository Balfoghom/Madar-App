/* Case facts for presentation only. Never recalculates risk or model results. */
(() => {
  const present = value => typeof value === 'string' && value.trim() && !/^(not supplied|missing employer|—)$/i.test(value.trim());
  function score(item) {
    const connected=item.assessmentSource==='cross-journey';
    const incomplete=item.risk==='Incomplete' || item.modelAssessment?.complete===false || item.rulesAssessment?.complete===false;
    if(incomplete)return {value:null,label:'Evidence incomplete',kind:'incomplete',note:'Complete the required evidence before relying on this assessment.'};
    if(connected && Number.isFinite(item.ruleScore))return {value:item.ruleScore,label:'Control score',kind:'control',note:'Supplied demo operational-control score. The Cross-Journey Model result is separate.'};
    if(connected)return {value:null,label:item.modelAssessment?.modelFlagged?'Review suggested':'No model flag',kind:'pattern',note:'The connected model recommends a review route; no combined numeric score is supplied.'};
    if(item.businessSimulation)return {value:Number.isFinite(item.score)?item.score:null,label:'Business-rule score',kind:'simulation',note:'Configured business-rule scoring weights combine operational controls, simulated behavior and pattern adjustments. No trained ML model was used.'};
    if(item.modelAssessment || item.rulesAssessment)return {value:item.businessSimulation?item.score:Number.isFinite(item.ruleScore)?item.ruleScore:null,label:item.businessSimulation?'Business-rule score':'Control score',kind:'control',note:'Existing control score. AI findings may raise the review priority without changing this number.'};
    return {value:Number.isFinite(item.score)?item.score:null,label:'Simulation score',kind:'simulation',note:'Weighted scoring simulation: existing controls, simulated behavior and pattern adjustments. Not a fraud probability.'};
  }
  function state(item) {
    const outcome=typeof item.outcome==='string'?item.outcome:'';
    const resolved=!!outcome && !/^(Suspected|Inconclusive)/.test(outcome);
    const incomplete=item.risk==='Incomplete'||item.dataQuality?.criticalMissing===true;
    return {resolved,incomplete,heading:resolved?'Recorded outcome':incomplete?'Evidence needed':'Recommended next step',action:resolved?'Update outcome':'Record review',status:resolved?'Outcome recorded':item.status||'Awaiting review',scripted:item.outcomeProvenance==='Scripted demo outcome'};
  }
  function keyEvidence(item) {
    const facts=[];
    if(item.crossJourneyEvidence){
      const linked=item.crossJourneyEvidence,valid=(linked.events||[]).filter(e=>Number.isFinite(e.recordedAt)&&e.recordedAt<=linked.asOf&&e.recordedAt>=linked.asOf-30*86400000);
      const contributors=new Set(valid.map(e=>e.subjectId).filter(present));
      facts.push({title:'Linked activity',text:`${valid.length} supplied events involve ${contributors.size} contributor${contributors.size===1?'':'s'} in the 30-day review window.`,target:'activity'});
      const digital=valid.filter(e=>['login','iban_change','profile_update'].includes(e.type));
      if(digital.length){
        const accounts=digital.filter(e=>e.type==='iban_change').length,profiles=digital.filter(e=>e.type==='profile_update').length;
        facts.push({title:'Account activity',text:`${digital.filter(e=>e.type==='login').length} login events, ${profiles} profile update${profiles===1?'':'s'} and ${accounts} IBAN change${accounts===1?'':'s'} before assessment. Verify account access and ownership.`,target:'activity'});
        facts.push({title:'Cross-Journey Model',text:item.modelAssessment?.modelFlagged?'The connected event sequence crosses the trained model’s review threshold. Review it before payment; this does not confirm fraud.':'The connected event sequence stays below the trained model’s review threshold.',target:'assessment'});
      }
      const changes=valid.filter(e=>e.type==='wage'&&Number.isFinite(e.amount)&&Number.isFinite(e.previousAmount)&&e.amount!==e.previousAmount);
      if(changes.length)facts.push({title:'Wage changes',text:`${changes.length} recorded wage change${changes.length===1?'':'s'} in the linked histories. Verify the supporting records.`,target:'activity'});
      const conflicts=valid.filter(e=>e.sourceConflict===true);
      if(conflicts.length)facts.push({title:'Source conflict',text:`${conflicts.length} event${conflicts.length===1?' has':'s have'} a reported source conflict requiring verification.`,target:'activity'});
    }else if(item.rulesEvidence){
      facts.push({title:'Business control',text:item.primaryReason||'Review the supplied control evidence.',target:'assessment'});
    }else{
      const reasons=(item.reasonCodes||[]).filter(r=>!/^MODEL_(UNUSUAL_COMBINATION|NOT_FLAGGED)$/.test(r.code));
      reasons.slice(0,2).forEach(r=>facts.push({title:r.code==='SOURCE_CONFLICT'?'Source conflict':'Observed signal',text:r.description,target:'assessment'}));
      if(!facts.length && item.primaryReason)facts.push({title:'Assessment finding',text:item.primaryReason,target:'assessment'});
      if(!facts.length && item.signals?.length)facts.push({title:'Review signal',text:item.signals[0][1],target:'assessment'});
    }
    if(item.accessEvidence){const missing=['loginDate','loginTime'].filter(field=>!item.accessEvidence[field]);if(missing.length)return [{title:'Login evidence missing',text:'Missing '+missing.map(field=>field==='loginDate'?'login date':'login time').join(' and ')+'. The event sequence cannot be verified; complete the access log and reassess.',target:'assessment'},{title:'Assessment deferred',text:'Low data quality: a critical event timestamp is unavailable. No model risk score was produced.',target:'assessment'}];}
    if(item.dataQuality?.criticalMissing)facts.unshift({title:'Required evidence missing',text:'Required source fields are missing or invalid. Complete them before relying on the assessment.',target:'assessment'});
    return facts.slice(0,3);
  }
  function mainReason(item) {
    if(item.assessmentSource!=='cross-journey')return item.primaryReason||item.signals?.[0]?.[1]||'Review the supplied evidence.';
    const model=item.modelAssessment||{};
    if(model.complete===false)return model.reasons?.[0]||'Required connected-event evidence is missing; complete it before assessment.';
    const reasons=(model.reasons||[]).filter(reason=>!/^The trained cross-journey model/i.test(reason));
    const sequence=reasons.find(reason=>/login →|linked contributors each complete/.test(reason));
    if(sequence)return sequence.replace(/^1 contributors show/,'1 contributor shows');
    if(reasons.length)return reasons.slice(0,2).join(' ');
    const events=(item.crossJourneyEvidence?.events||[]).filter(event=>Number.isFinite(event.recordedAt)&&event.recordedAt<=item.crossJourneyEvidence.asOf&&event.recordedAt>=item.crossJourneyEvidence.asOf-30*86400000);
    const counts=new Map();for(const event of events)counts.set(event.type,(counts.get(event.type)||0)+1);
    const names={login:'login',profile_update:'profile update',iban_change:'IBAN change',registration:'registration',wage:'wage',exclusion:'exclusion',request:'request'};
    const activity=[...counts].map(([type,count])=>`${count} ${names[type]||type.replaceAll('_',' ')} event${count===1?'':'s'}`).join(', ');
    return `${model.modelFlagged?'Connected activity requires specialist review':'No model review threshold crossed'}${activity?': '+activity:'. No additional event detail supplied.'}`;
  }
  function financial(item){
    if(item.outcomeProvenance==='Scripted demo outcome' && Number.isFinite(item.preventedAmount)&&item.preventedAmount>0)return {label:'Recorded prevention · scripted demo',amount:item.preventedAmount};
    if(Number.isFinite(item.amountAtRisk))return {label:'Supplied potential exposure',amount:item.amountAtRisk};
    if(Number.isFinite(item.transactionAmount))return {label:'Supplied transaction amount',amount:item.transactionAmount};
    return {label:'Financial exposure',amount:null};
  }
  globalThis.MadarCasePresentation=Object.freeze({score,state,keyEvidence,financial,mainReason});
})();
