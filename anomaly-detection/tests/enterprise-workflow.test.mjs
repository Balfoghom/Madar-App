import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {once} from 'node:events';
import {createCrossJourneyAssessment,demoCases} from '../lib/cross-journey-adapter.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-enterprise-'));process.env.ASSESSMENT_DATA_DIR=dir;
const {createInferenceServer}=await import('../server.mjs');let server,base;
test.before(async()=>{server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port});
test.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})});
async function post(path,body,status=200){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data}
const reviewer=record=>({caseId:record.caseId,assessmentId:record.assessmentId,actorName:'Test specialist',note:'Synthetic evidence reviewed.'});
const input={id:'NEW-policy',synthetic:true,transactionId:'TX-SYN-policy',journey:'SANED',scenario:'Synthetic policy test',ruleScore:60,transactionAmount:100,features:{},modelInput:{case_id:'SYN-demo-00000'}};
test('sandbox drafts cannot change new assessment risk or routing',async()=>{
 const before=await post('/assess',{assessment:input});const {config}=await(await fetch(base+'/risk-config')).json();config.lowMax=70;
 const draft=await post('/risk-config',{config});assert.equal(draft.status,'Draft');
 const after=await post('/assess',{assessment:input});assert.equal(after.risk,before.risk);assert.equal(after.caseData.route,before.caseData.route);assert.equal(after.risk,'Medium');
});
test('approval after override restores the original recommendation and requires named current review',async()=>{
 const record=(await post('/cross-journey/assess',{case_id:demoCases[1].id})).saved[0];const review=reviewer(record);
 await post('/decision',{...review,action:'override',route:'Additional verification'});
 const result=await post('/decision',{...review,action:'approve'});assert.equal(result.caseData.route,record.modelResult.route);assert.deepEqual(result.modelResult,record.modelResult);
 await post('/decision',{caseId:record.caseId,action:'approve',note:'No version or reviewer'},400);
 await post('/decision',{...review,actorName:' ',action:'approve'},400);
});
test('financial outcomes reject inconsistent amounts and classifications',async()=>{
 const record=await post('/assess',{assessment:{...input,id:'NEW-finance'}});const common={...reviewer(record),outcome:'Legitimate activity',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0};
 for(const change of [{amountAtRisk:101},{confirmedFraudAmount:20},{preventedAmount:10},{financialOutcome:'Proceeded',amountAtRisk:20}]) await post('/outcome',{...common,...change},400);
 const valid=await post('/outcome',common);assert.equal(valid.caseData.outcome,'Legitimate activity');assert.equal(valid.caseData.paymentStatus,'Not applicable');
 const missing=(await post('/cross-journey/assess',{case_id:demoCases[2].id})).saved[0];
 await post('/outcome',{...common,...reviewer(missing),outcome:'Confirmed fraud — formally established',confirmedFraudAmount:20},400);
});
test('case ownership follows stages, guards stale edits, and requires resolution to close',async()=>{
 const record=await post('/assess',{assessment:{...input,id:'NEW-flow'}});const review=reviewer(record);const update={...review,assignedTo:'Test investigator',workflowStage:'Triage',expectedRevision:0};
 let saved=await post('/case-workflow',update);assert.equal(saved.caseData.workflow.stage,'Triage');assert.deepEqual(saved.modelResult,record.modelResult);
 await post('/case-workflow',update,409);
 await post('/case-workflow',{...update,workflowStage:'Closed',expectedRevision:1},409);
 saved=await post('/case-workflow',{...update,workflowStage:'Investigation',expectedRevision:1});
 saved=await post('/case-workflow',{...update,workflowStage:'Decision pending',expectedRevision:2});
 await post('/case-workflow',{...update,workflowStage:'Closed',expectedRevision:3},409);
 await post('/outcome',{...review,outcome:'Legitimate activity',financialOutcome:'Proceeded',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
 saved=await post('/case-workflow',{...update,workflowStage:'Closed',expectedRevision:3});assert.equal(saved.caseData.workflow.revision,4);
 await post('/outcome',{...review,outcome:'Inconclusive',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0},409);
 const restored=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===record.caseId);assert.equal(restored.caseData.workflow.assignedTo,'Test investigator');
});
test('distinct evidence cannot produce a false repeated indicator',async()=>{
 for(const evidence of [demoCases[1],demoCases[3]]){
  const record=(await post('/cross-journey/assess',{case_id:evidence.id})).saved[0];
  await post('/outcome',{...reviewer(record),outcome:'Confirmed violation',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
 }
 const different=await post('/indicator-suggestions/generate',{});assert.equal(different.proposals.length,0);
 const copy=structuredClone(demoCases[3]);copy.id='CJ-SYN-second-identifier';
 const record=(await post('/cross-journey/assess',{evidence:copy})).saved[0];
 await post('/outcome',{...reviewer(record),outcome:'Confirmed violation',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
 const repeated=await post('/indicator-suggestions/generate',{});assert.equal(repeated.proposals.length,1);assert.equal(repeated.proposals[0].code,'CJ_IDENTIFIER_REUSE');assert.equal(repeated.proposals[0].evidenceCount,2);
});
test('saved evidence reassessment does not replace it with the bundled example',async()=>{
 const evidence=structuredClone(demoCases[1]);evidence.events.find(e=>e.type==='wage').amount=10000;
 const record=(await post('/cross-journey/assess',{evidence})).saved[0];
 const again=(await post('/cross-journey/assess',{evidence:record.caseData.crossJourneyEvidence})).saved[0];assert.equal(record.assessmentId,again.assessmentId);assert.notEqual(record.evidenceFingerprint,createCrossJourneyAssessment(demoCases[1]).evidenceFingerprint);
});
test('capability registry includes the current cross-journey model',async()=>{
 const registry=await(await fetch(base+'/journey-models')).json();assert.equal(registry.models.length,7);assert.equal(registry.models[0].version,'madar-cross-journey-rf-20261019-v2');assert.equal(registry.models[0].evaluation.testCount,700);
});
test('LLM setup absence is explicit and does not alter model evidence',async()=>{
 const record=(await post('/cross-journey/assess',{case_id:demoCases[0].id})).saved[0];
 const status=await(await fetch(base+'/llm/status')).json();assert.equal(status.configured,false);
 assert.equal((await post('/case-explanation',{caseId:record.caseId,assessmentId:record.assessmentId,generate:false})).draft,null);
 await post('/case-explanation',{caseId:record.caseId,assessmentId:record.assessmentId,generate:true},503);
 const restored=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===record.caseId);assert.deepEqual(restored.modelResult,record.modelResult);
});
test('manual event histories reject duplicate event identities and invalid timestamps',async()=>{
 const evidence=structuredClone(demoCases[1]);evidence.events.push(structuredClone(evidence.events[0]));await post('/cross-journey/assess',{evidence},400);
 evidence.events.pop();evidence.events[0].recordedAt=1e20;await post('/cross-journey/assess',{evidence},400);
});
test('unusual features from different journey models cannot collide as one indicator',async()=>{
 const benefit=await post('/assess',{assessment:{...input,id:'NEW-feature-benefit',journey:'Benefit Payments',modelInput:undefined,journeyFeatures:{requests30d:100,amountDeviationPct:0,payoutAccountChangeDays:365,duplicatePayments:0,sharedBeneficiaries:1}}});
 const employer=await post('/assess',{assessment:{...input,id:'NEW-feature-employer',journey:'Employer Registration',modelInput:undefined,journeyFeatures:{amendments30d:100,companyAgeAtChangeDays:365,linkedContactEmployers:1,workforceChangePct:0,backdatedChanges90d:0,sourceConflicts:0}}});
 const codes=record=>record.caseData.reasonCodes.filter(r=>r.code.startsWith('MODEL_FEATURE_')).map(r=>r.code);
 assert.ok(codes(benefit).length);assert.ok(codes(employer).length);assert.equal(codes(benefit).some(code=>codes(employer).includes(code)),false);
});
