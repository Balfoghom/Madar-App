/* Shared application routing policy. Model scores and raw model routes are immutable. */
(() => {
  const routes=['Straight-through processing','Data Verification Review','Eligibility Verification','Cybersecurity Review','Business Owner Review','Fraud Prevention & Inspection Review'];
  const aliases={'Complete evidence':'Data Verification Review','Additional verification':'Eligibility Verification','Payment & IBAN Verification':'Eligibility Verification','Benefit Operations Review':'Eligibility Verification','Insurance Operations Audit':'Eligibility Verification','Specialist review':'Eligibility Verification','Standard review':'Straight-through processing','Specialist review — recommendation rejected':'Business Owner Review'};
  function normalize(route){return routes.includes(route)?route:aliases[route]||'Business Owner Review';}
  function recommend(data){
    if(data.risk==='Incomplete'||data.features?.missingData||data.dataQuality?.criticalMissing)return routes[1];
    const model=data.modelAssessment;
    const evidence=data.crossJourneyEvidence,events=(evidence?.events||[]).filter(e=>Number.isFinite(e.recordedAt)&&e.recordedAt<=evidence.asOf&&e.recordedAt>=evidence.asOf-30*86400000);
    const accountSequence=model?.modelFlagged&&events.some(e=>e.type==='login')&&events.some(e=>e.type==='profile_update'||e.type==='iban_change');
    if(data.risk==='High'&&!(data.assessmentMode==='hybrid'&&data.ruleScore<80&&accountSequence))return routes[5];
    if(accountSequence)return routes[3];
    if(data.features?.crossSourceConflict)return routes[1];
    if(data.risk==='Low')return routes[0];
    return normalize(data.recommendedRoute||data.route||routes[2]);
  }
  function ownership(route,journey){
    const value=normalize(route);
    const owners={SANED:'SANED Service Owner','Benefit Payments':'Payment Operations Owner','Employer Registration':'Registration & Contribution Owner',Retirement:'Retirement Service Owner','Maternity Benefit':'Benefit Service Owner','Contribution & Wage':'Contribution & Wage Owner'};
    return ({
      'Straight-through processing':{owner:'Service Operations',next:'Continue the normal service journey under existing controls and retain the assessment audit trail.'},
      'Data Verification Review':{owner:'Data Owner / Data Quality',next:'Complete missing dates, times or source records, resolve conflicting data, then reassess before relying on the result.'},
      'Eligibility Verification':{owner:'Eligibility Operations',next:'Verify eligibility, employment and benefit entitlement; confirm beneficiary and payment-account ownership where relevant, then record the review outcome.'},
      'Cybersecurity Review':{owner:'Cybersecurity',next:'Verify login chronology, trusted devices and account access; review profile and IBAN changes with the specialist before any service decision.'},
      'Business Owner Review':{owner:owners[journey]||'Service Journey Owner',next:'Clarify the business exception and applicable service policy, obtain supporting evidence and return a documented recommendation to the specialist.'},
      'Fraud Prevention & Inspection Review':{owner:'Fraud Prevention, Detection & Inspection',next:'Review the connected evidence, determine the proportionate investigation route and record the specialist decision. A risk flag does not establish fraud.'}
    })[value];
  }
  function apply(data){
    const recommendedRoute=recommend(data),reviewed=!!data.humanDecision||data.reviewHistory?.some(r=>r.type==='decision')||data.workflow?.stage==='Closed'||(!!data.outcome&&!/^(Suspected|Inconclusive)/.test(data.outcome));
    const route=reviewed?normalize(data.humanDecision?.action==='override'&&data.humanDecision.route?data.humanDecision.route:data.recordedRoute||data.route):recommendedRoute;
    const status=data.dataQuality?.criticalMissing&&['Ready to proceed','Awaiting specialist','Complete evidence'].includes(data.status)?'Evidence needed':data.status;
    return {...data,...(reviewed?{recordedRoute:route}:{}),status,route,recommendedRoute,routingPolicyVersion:'governed-routing-v3',...{recommendedOwner:ownership(recommendedRoute,data.journey).owner,nextStep:ownership(route,data.journey).next}};
  }
  globalThis.MadarRoutingPolicy=Object.freeze({routes,normalize,recommend,ownership,apply});
})();
