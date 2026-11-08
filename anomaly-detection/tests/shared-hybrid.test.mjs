import {behavioral} from './fixtures/behavioral.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import cases from '../data/cases.json' with {type:'json'};
import {assess} from '../lib/detector.mjs';
import {hybridPolicy,approvedPatternAdjustments} from '../lib/hybrid-policy.mjs';
import {createApplicationAssessment} from '../lib/assessment-adapter.mjs';
import {explanationEvidence} from '../lib/case-explainer.mjs';
test('Appendix score uses supplied feature points independently of raw model scores',()=>{
 const result={complete:true,score:.4,percentile:99,features:[],modelFlagged:false,ruleFlagged:false};
 const base=hybridPolicy({ruleScore:20,features:{...behavioral}},result);assert.equal(base.score,11);assert.equal(base.scoringComponents.anomalyScore,0);assert.equal(base.scoringComponents.patternAdjustment,0);
 assert.equal(hybridPolicy({ruleScore:20,features:{...behavioral}},{...result,score:.99,percentile:0}).score,base.score);
 const strong=hybridPolicy({ruleScore:90,features:{...behavioral}},result);assert.equal(strong.score,75);assert.equal(strong.risk,'High');
 assert.equal(hybridPolicy({ruleScore:90},{complete:false}).score,null);
 assert.equal(hybridPolicy({ruleScore:90,features:{...behavioral,priorRisk:undefined}},result).score,null);
});
test('only reviewed approved catalog patterns can contribute an adjustment',()=>{
 const result={modelVersion:'test-model',features:[{name:'Amendments',value:3},{name:'Backdating',value:20}]};const scope={journey:'SANED'};
 const pattern={journey:'SANED',modelVersion:'test-model',code:'TEST_PATTERN',description:'Synthetic test approval only',points:8,status:'Approved',approvedBy:'Test reviewer',approvedAt:'2026-11-07T00:00:00Z',conditions:[{feature:'amendments30d',operator:'gte',value:2},{feature:'backdatingDays',operator:'gte',value:7}]};
 assert.equal(approvedPatternAdjustments(result,[pattern],scope)[0].points,8);
 for(const change of [{journey:'Maternity Benefit'},{modelVersion:'other-model'},{status:'Proposed'},{status:'Active'},{approvedBy:''},{approvedAt:''},{points:Infinity},{conditions:[{feature:'outcome',operator:'gte',value:1}]}])assert.equal(approvedPatternAdjustments(result,[{...pattern,...change}],scope).length,0);
 assert.equal(approvedPatternAdjustments(result,[{...pattern,conditions:[{feature:'amendments30d',operator:'gte',value:8}]}],scope).length,0);
});
test('SANED explainability includes hybrid components, evidence quality and review route without accepting imported adjustments',()=>{
 const context={id:'NEW-hybrid-test',synthetic:true,transactionId:'HYBRID-1',journey:'SANED',scenario:'Custom SANED inference',ruleScore:20,features:{...behavioral},modelInput:{case_id:cases[2].id},approvedPatterns:[{points:100,status:'Approved'}],interaction:100};
 const record=createApplicationAssessment(context);assert.equal(record.caseData.interaction,0);assert.equal(record.caseData.scoringComponents.patternAdjustment,0);
 assert.equal(record.modelResult.score,assess(cases[2]).score);assert.equal(record.caseData.assessmentMode,'hybrid');assert.ok(record.reasonCodes.some(r=>r.code==='HYBRID_SCORE_COMPONENTS'));
 assert.equal(record.caseData.confidence,record.caseData.dataQuality.label);assert.ok(record.caseData.recommendedRoute);
 assert.ok(explanationEvidence(record).facts.some(f=>f.id==='hybrid-decision'));
});

test('all six original journey models feed the shared policy without altering native inference',async()=>{
 const {assessJourney}=await import('../lib/journey-detector.mjs');
 const examples={
  'Benefit Payments':{requests30d:1,amountDeviationPct:0,payoutAccountChangeDays:365,duplicatePayments:0,sharedBeneficiaries:1},
  'Employer Registration':{amendments30d:1,companyAgeAtChangeDays:365,linkedContactEmployers:1,workforceChangePct:0,backdatedChanges90d:0,sourceConflicts:0},
  Retirement:{contributionMonths:240,gapMonths:0,wageChangePct:0,retroCorrections12m:0,overlapPeriods:0,overlapMonths:0},
  'Maternity Benefit':{contributionMonthsInWindow:9,daysEventToRequest:7,wageChangePct:0,employerTenureDays:365,concurrentClaims:0,retroCorrections12m:0},
  'Contribution & Wage':{materialWageChangeWorkersPct:2,medianWageChangePct:0,payrollDelayDays:0,resubmissions30d:0,retroCorrections90d:0,workersAcrossEmployers:0,reconciliationDeviationPct:0},
 };
 for(const [index,journey] of ['SANED',...Object.keys(examples)].entries()){
  const context={id:'NEW-shared-'+index,transactionId:'SHARED-'+index,synthetic:true,journey,scenario:'Shared decision layer',ruleScore:20,features:{...behavioral},subject:'SYN-shared-person',entity:'EMP-SYN-shared-employer',country:'Saudi Arabia',region:'Riyadh',city:'Riyadh',transactionAmount:0,...(journey==='SANED'?{modelInput:{case_id:cases[0].id}}:{journeyFeatures:examples[journey]})};
  const expected=journey==='SANED'?assess(cases[0]):assessJourney(context),record=createApplicationAssessment(context);
  assert.equal(record.caseData.policy,'appendix-scoring-v1');assert.equal(record.caseData.assessmentMode,'hybrid');assert.equal(record.caseData.decisionComplete,true,journey);
  for(const key of ['score','percentile','modelFlagged','features'])assert.deepEqual(record.modelResult[key],expected[key],journey+': '+key);
  assert.equal(record.caseData.score,11);assert.equal(record.caseData.confidence,record.caseData.dataQuality.label);
  assert.ok(record.reasonCodes.some(r=>r.code==='HYBRID_SCORE_COMPONENTS'));assert.ok(explanationEvidence(record).facts.some(f=>f.id==='hybrid-decision'));
 }
});
test('cross-journey control context versions only the decision and does not fabricate missing controls',async()=>{
 const {createCrossJourneyAssessment,demoCases}=await import('../lib/cross-journey-adapter.mjs');
 const evidence=structuredClone(demoCases[1]),missing=createCrossJourneyAssessment(evidence),zero=createCrossJourneyAssessment(evidence,{ruleScore:0,behavioralInputs:behavioral}),high=createCrossJourneyAssessment(evidence,{ruleScore:90,behavioralInputs:behavioral});
 assert.equal(missing.modelResult.complete,true);assert.equal(missing.caseData.decisionComplete,false);assert.equal(missing.caseData.score,null);assert.equal(missing.caseData.ruleScore,null);assert.equal(missing.caseData.dataQuality.label,'Low');assert.equal(missing.caseData.route,'Data Verification Review');
 assert.equal(zero.caseData.decisionComplete,true);assert.equal(zero.caseData.ruleScore,0);assert.equal(high.caseData.score,75);
 for(const key of ['score','percentile','modelFlagged','features'])assert.deepEqual(zero.modelResult[key],high.modelResult[key]);
 assert.equal(zero.evidenceFingerprint,high.evidenceFingerprint);assert.notEqual(zero.decisionFingerprint,high.decisionFingerprint);
 assert.ok(high.caseData.scoringComponents);assert.ok(explanationEvidence(high).facts.some(f=>f.id==='hybrid-decision'));
});

test('connected API deduplicates unchanged decision context and versions changed controls',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{once}=await import('node:events');
 const dir=await mkdtemp(join(tmpdir(),'shared-context-'));process.env.ASSESSMENT_DATA_DIR=dir;const {createInferenceServer}=await import('../server.mjs');
 const server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const post=async(body,status=200)=>{const response=await fetch(base+'/cross-journey/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;};
 try{
  const missing=(await post({case_id:'CJ-SYN-demo-00001'})).saved[0];assert.equal(missing.modelResult.complete,true);assert.equal(missing.caseData.decisionComplete,false);
  const first=(await post({case_id:'CJ-SYN-demo-00001',existingControlScore:0,behavioralInputs:behavioral})).saved[0];assert.equal(first.caseData.decisionComplete,true);assert.notEqual(first.assessmentId,missing.assessmentId);
  const repeat=(await post({case_id:'CJ-SYN-demo-00001',existingControlScore:0,behavioralInputs:behavioral})).saved[0];assert.equal(repeat.assessmentId,first.assessmentId);
  const changed=(await post({case_id:'CJ-SYN-demo-00001',existingControlScore:90,behavioralInputs:behavioral})).saved[0];assert.notEqual(changed.assessmentId,first.assessmentId);assert.equal(changed.evidenceFingerprint,first.evidenceFingerprint);assert.equal(changed.modelResult.score,first.modelResult.score);
  for(const value of [-1,101,null,'55'])await post({case_id:'CJ-SYN-demo-00001',existingControlScore:value},400);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
