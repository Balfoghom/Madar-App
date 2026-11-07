/* Case facts for presentation only. Never recalculates risk or model results. */
(() => {
  const present = value => typeof value === 'string' && value.trim() && !/^(not supplied|missing employer|—)$/i.test(value.trim());
  function score(item) {
    const connected=item.assessmentSource==='cross-journey';
    const incomplete=item.risk==='Incomplete' || item.modelAssessment?.complete===false || item.rulesAssessment?.complete===false;
    if(incomplete)return {value:null,label:'Evidence incomplete',kind:'incomplete',note:'Complete the required evidence before relying on this assessment.'};
    if(connected)return {value:null,label:item.modelAssessment?.modelFlagged?'Model review suggested':'No model review flag',kind:'pattern',note:'The connected model supplies a review recommendation. Existing control score and operational risk band are separate.'};
    if(item.businessSimulation)return {value:Number.isFinite(item.score)?item.score:null,label:'Business-rule score',kind:'simulation',note:'Configured business-rule scoring weights combine operational controls, simulated behavior and pattern adjustments. No trained ML model was used.'};
    if(item.modelAssessment || item.rulesAssessment)return {value:item.businessSimulation?item.score:Number.isFinite(item.ruleScore)?item.ruleScore:null,label:item.businessSimulation?'Business-rule score':'Control score',kind:'control',note:'Existing control score. AI findings may raise the review priority without changing this number.'};
    return {value:Number.isFinite(item.score)?item.score:null,label:'Simulation score',kind:'simulation',note:'Weighted scoring simulation: existing controls, simulated behavior and pattern adjustments. Not a fraud probability.'};
  }
  function state(item) {
    const outcome=typeof item.outcome==='string'?item.outcome:'';
    const resolved=!!outcome && !/^(Suspected|Inconclusive)/.test(outcome);
    const incomplete=item.risk==='Incomplete'||item.dataQuality?.criticalMissing===true;
    const workStage=item.workflow?.stage||null;
    const status=workStage==='Closed'?'Closed':resolved?'Outcome recorded · closure pending':outcome?'Investigation ongoing':incomplete?'Evidence needed':workStage&&workStage!=='New'?workStage:item.humanDecision?.action==='reject'?'Returned for review':item.humanDecision?'Route decided · follow-up needed':item.route==='Straight-through processing'?'Ready to proceed':'Awaiting review';
    return {resolved,incomplete,workStage,heading:resolved?'Recorded outcome':incomplete?'Evidence needed':'Recommended next step',action:resolved?'Update outcome':'Record review',status,scripted:item.outcomeProvenance==='Scripted demo outcome'};
  }
  function needsReview(item){return !state(item).resolved && item.workflow?.stage!=='Closed';}
  function signals(item){
    const skipped=/^(MODEL_NOT_FLAGGED|LOWER_BEHAVIORAL_DEVIATION|NO_MATERIAL_ANOMALY|NO_RULE_TRIGGER|CROSS_JOURNEY_PATTERN|MODEL_UNUSUAL_COMBINATION|EVIDENCE_INCOMPLETE|COMBINED_PATTERN|REQUIRED_INFORMATION_MISSING)$/;
    const result=new Map();
    for(const [code,description] of item.signals||[]){
      if(skipped.test(code)||/^(SANED_COMPARATOR_|MODEL_FEATURE_)\d+$/.test(code))continue;
      let key=code;
      if(/^CROSS_JOURNEY_EVIDENCE_/.test(code)){
        key=/login →/.test(description)?'ACCOUNT_CHANGE_SEQUENCE':/rapid travel|login locations/i.test(description)?'LOGIN_LOCATION_CONFLICT':/payment-account changes/i.test(description)?'PAYMENT_ACCOUNT_CHANGE':/profile updates/i.test(description)?'PROFILE_CHANGE':/linked contributors.*sequence/i.test(description)?'LINKED_EMPLOYMENT_SEQUENCE':null;
      }
      if(code==='CJ_COMPLETED_CONTRIBUTOR_SEQUENCE')key='LINKED_EMPLOYMENT_SEQUENCE';
      if(key)result.set(key,[key,description]);
    }
    return [...result.values()];
  }
  function reasonLabel(signal){
    const code=signal[0];
    const special={CROSS_JOURNEY_PATTERN:'Connected model finding',MODEL_NOT_FLAGGED:'No model review flag',MODEL_UNUSUAL_COMBINATION:'Unusual combination',EVIDENCE_INCOMPLETE:'Required evidence missing',REQUIRED_INFORMATION_MISSING:'Required information missing',NO_MATERIAL_ANOMALY:'No material anomaly',LOWER_BEHAVIORAL_DEVIATION:'Lower behavioral deviation'};
    return special[code]||(signals({signals:[signal]})[0]?.[0]||'Observed evidence').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
  }
  function attentionMatches(item,kind){
    if(kind==='unresolved-high')return item.risk==='High'&&needsReview(item);
    if(kind==='low-quality')return item.confidence==='Low'||item.dataQuality?.label==='Low';
    if(kind==='data-quality')return item.dataQuality?item.dataQuality.issues.length>0:!!(item.features?.missingData||item.features?.crossSourceConflict);
    if(kind?.startsWith('signal:'))return signals(item).some(([code])=>code===kind.slice(7));
    return true;
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
  function journeys(item){
    if(item.assessmentSource!=='cross-journey')return [item.journey].filter(Boolean);
    const evidence=item.crossJourneyEvidence;
    const events=(evidence?.events||[]).filter(event=>Number.isFinite(event.recordedAt)&&event.recordedAt<=evidence.asOf&&event.recordedAt>=evidence.asOf-30*86400000).sort((a,b)=>a.recordedAt-b.recordedAt);
    const linked=[...new Set(events.map(event=>event.journey).filter(Boolean))];return linked.length?linked:[item.journey].filter(Boolean);
  }
  function mainReason(item) {
    if(item.assessmentSource!=='cross-journey')return item.primaryReason||item.signals?.[0]?.[1]||'Review the supplied evidence.';
    const model=item.modelAssessment||{},reasons=model.reasons||[];
    const request=item.journey==='SANED'?'SANED request':item.journey==='Maternity Benefit'?'maternity request':'service request';
    if(model.complete===false)return 'The connected source evidence is incomplete: '+(reasons[0]||'required event or employer records are missing.');
    if(!model.modelFlagged&&!model.ruleFlagged)return 'The connected activity remained below the model and comparator review thresholds.';
    if(model.maternityContributorChains>=2)return `Repeated registration and wage changes preceded maternity requests across ${model.maternityContributorChains} linked contributors.`;
    const chains=model.completedContributorChains;
    if(chains>=2)return `Repeated registration, wage and employment-exclusion changes preceded SANED requests across ${chains} linked contributors.`;
    const sequence=reasons.find(reason=>/contributors show a login →/.test(reason));
    if(sequence){const count=Number(sequence.match(/^\d+/)?.[0]);return `Login, profile and IBAN changes occurred before a ${request}: ${count} contributor${count===1?' completed':'s completed'} the sequence within 24 hours.`;}
    if(reasons.some(reason=>/rapid travel|login locations/i.test(reason)))return `Verified login locations imply an unusually rapid location change before the ${request}; account access requires verification.`;
    if(reasons.some(reason=>/Identifier shared by four/i.test(reason)))return `The same identifier is shared across at least four contributors before the ${request}.`;
    if(reasons.some(reason=>/cross-source conflicts/i.test(reason)))return `Connected source records contain at least two inconsistencies requiring verification before the ${request}.`;
    if(reasons.some(reason=>/Retroactive change of 30/i.test(reason)))return `A record change was applied at least 30 days retroactively before the ${request}.`;
    if(reasons.some(reason=>/Wage increase of 80/i.test(reason)))return `A wage increase of at least 80% appears in the linked records before the ${request}.`;
    const accounts=reasons.find(reason=>/payment-account changes appear/i.test(reason));
    if(accounts){const count=Number(accounts.match(/^\d+/)?.[0]);return `Payment-account details changed before the ${request}: ${count} IBAN change${count===1?' requires':'s require'} ownership verification.`;}
    const evidence=item.crossJourneyEvidence,events=(evidence?.events||[]).filter(event=>Number.isFinite(event.recordedAt)&&event.recordedAt<=evidence.asOf&&event.recordedAt>=evidence.asOf-30*86400000);
    const exclusions=events.filter(event=>event.type==='exclusion').length;
    if(exclusions)return `Employment exclusions preceded the ${request}: ${exclusions} exclusion record${exclusions===1?' appears':'s appear'} in the linked history.`;
    const profiles=events.filter(event=>event.type==='profile_update').length;
    if(profiles)return `Contributor details changed before the ${request}: ${profiles} profile update${profiles===1?' appears':'s appear'} in the linked records.`;
    return `Activity across ${journeys(item).join(', ')||'the supplied services'} requires review before the ${request}.`;
  }
  function financial(item){
    if(item.outcomeProvenance==='Scripted demo outcome' && Number.isFinite(item.preventedAmount)&&item.preventedAmount>0)return {label:'Recorded prevention · scripted demo',amount:item.preventedAmount};
    if(Number.isFinite(item.amountAtRisk))return {label:'Supplied potential exposure',amount:item.amountAtRisk};
    if(Number.isFinite(item.transactionAmount))return {label:'Supplied transaction amount',amount:item.transactionAmount};
    return {label:'Financial exposure',amount:null};
  }
  globalThis.MadarCasePresentation=Object.freeze({score,state,keyEvidence,financial,mainReason,needsReview,signals,attentionMatches,reasonLabel,journeys});
})();
