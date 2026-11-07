import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {once} from 'node:events';
import {createWorkspacePortfolio,enrichDemoRecord,caseStatus} from '../lib/workspace-demo.mjs';import {createDemoPortfolio} from '../lib/demo-portfolio.mjs';import {explanationEvidence} from '../lib/case-explainer.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-workspace-'));process.env.ASSESSMENT_DATA_DIR=dir;
const {createInferenceServer}=await import('../server.mjs');let server,base;
test.before(async()=>{server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
async function post(path,body={},status=200){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}
test('unified demo provides named, persisted business rules and ML cases without changing inference evidence',()=>{
 const list=createWorkspacePortfolio();assert.equal(list.length,77);assert.equal(new Set(list.map(r=>r.caseId)).size,77);
 for(const record of list){assert.ok(record.assessmentId);assert.match(record.caseData.customerName,/Al/);assert.doesNotMatch(record.caseData.employerName,/^(EMP-|SYN-|Synthetic)/);assert.ok(Number.isFinite(record.caseData.ruleScore));assert.ok(Number.isFinite(record.caseData.transactionAmount));assert.doesNotThrow(()=>explanationEvidence(record));}
 const original=createDemoPortfolio().find(r=>r.caseId==='CJ-SYN-enterprise-001'),copy=structuredClone(original),enriched=enrichDemoRecord(original);
 assert.deepEqual(enriched.modelResult,copy.modelResult);assert.deepEqual(enriched.caseData.crossJourneyEvidence,copy.caseData.crossJourneyEvidence);assert.equal(enriched.caseData.ruleScore,55);
 assert.ok(list.some(r=>/login|session/i.test(r.caseData.scenario)));assert.ok(list.some(r=>/IBAN/.test(r.caseData.scenario)));
});
test('workspace refresh preserves reviews; applying and resetting weights changes only business simulations',async()=>{
 const initial=await post('/workspace-demo');assert.equal(initial.added,77);
 const business=initial.saved.find(r=>r.caseId==='BRI-002'),model=initial.saved.find(r=>r.caseId==='CJ-SYN-enterprise-001');
 const defaults=(await(await fetch(base+'/risk-config')).json()).config;
 const pending=initial.saved.find(r=>r.caseData.businessSimulation&&!r.caseData.outcome&&r.complete);
 await post('/decision',{caseId:pending.caseId,assessmentId:pending.assessmentId,actorName:'QA specialist',note:'Source evidence reviewed.',action:'override',route:'Additional verification'});
 const repeat=await post('/workspace-demo');assert.equal(repeat.added,0);assert.equal(repeat.saved.length,77);assert.ok(repeat.saved.find(r=>r.caseId===pending.caseId).reviewHistory.length);
 const config={...defaults,controlWeight:0,anomalyWeight:100,interactionMultiplier:0};await post('/risk-config',{config});
 const changed=await post('/workspace-demo');const altered=changed.saved.find(r=>r.caseId===business.caseId);
 assert.notEqual(altered.caseData.score,business.caseData.score);assert.notEqual(altered.assessmentId,business.assessmentId);
 assert.deepEqual(changed.saved.find(r=>r.caseId===model.caseId).modelResult,model.modelResult);
 assert.equal(changed.saved.find(r=>r.caseId===pending.caseId).caseData.route,'Eligibility Verification');
 await post('/risk-config',{config:defaults});const reset=await post('/workspace-demo');assert.equal(reset.saved.find(r=>r.caseId===business.caseId).caseData.score,business.caseData.score);
 assert.deepEqual(reset.saved.find(r=>r.caseId===model.caseId).modelResult,model.modelResult);
});
test('status labels distinguish missing evidence, active investigation and resolved outcomes',()=>{
 assert.equal(caseStatus({risk:'Incomplete'}),'Evidence needed');assert.equal(caseStatus({risk:'High'}),'Awaiting specialist');
 assert.equal(caseStatus({outcome:'Suspected fraud — further investigation'}),'Under investigation');assert.equal(caseStatus({outcome:'Inconclusive'}),'Under investigation');assert.equal(caseStatus({outcome:'Legitimate activity'}),'Outcome recorded');assert.equal(caseStatus({workflow:{stage:'Closed'},outcome:'Legitimate activity'}),'Closed');
});

test('model upgrade reassesses saved evidence while preserving ownership, outcomes and historical reviews',async()=>{
 const path=join(dir,'backend-assessments.json'),records=JSON.parse(await readFile(path,'utf8'));
 const record=records.find(r=>r.caseId==='CJ-SYN-enterprise-001'),oldId=record.assessmentId;
 record.modelResult.modelVersion='historical-v2';record.caseData.workflow={stage:'Closed',assignedTo:'Demo specialist',revision:3};
 const outcome=record.caseData.outcome,amount=record.caseData.preventedAmount,history=structuredClone(record.reviewHistory);
 await writeFile(path,JSON.stringify(records));
 const refreshed=await post('/workspace-demo'),next=refreshed.saved.find(r=>r.caseId===record.caseId);
 assert.equal(next.modelResult.modelVersion,'madar-cross-journey-rf-20261107-v4');assert.notEqual(next.assessmentId,oldId);
 assert.deepEqual(next.caseData.crossJourneyEvidence,record.caseData.crossJourneyEvidence);
 assert.deepEqual(next.caseData.workflow,record.caseData.workflow);assert.deepEqual(next.reviewHistory,history);
 assert.equal(next.caseData.outcome,outcome);assert.equal(next.caseData.preventedAmount,amount);assert.equal(next.caseData.status,'Closed');
 assert.ok(next.caseData.assessmentHistory.some(r=>r.assessmentId===oldId&&r.modelVersion==='historical-v2'));
 const repeat=await post('/workspace-demo');assert.equal(repeat.saved.find(r=>r.caseId===record.caseId).assessmentId,next.assessmentId);
});

test('active demo cases have distinct identities and maternity beneficiaries have female names',()=>{
 const records=createWorkspacePortfolio();assert.equal(new Set(records.map(r=>r.caseData.customerName)).size,records.length);
 const business=records.filter(r=>r.caseData.businessSimulation);assert.equal(business.length,30);assert.equal(new Set(business.map(r=>r.caseData.scenario)).size,30);
 const female=/^(Noura|Abeer|Reem|Hessa|Maha|Jawaher|Nouf|Ghada|Sara|Lama|Shahad|Mona|Rana|Alanoud|Hind|Amal|Haifa|Razan|Dalal|Hanan|Mariam|Fatimah|Afnan|Wadha) /;
 for(const r of records.filter(r=>r.journey==='Maternity Benefit'))assert.match(r.caseData.customerName,female);
});
test('missing SANED login dates or times produce Low quality and abstention with an explicit source issue',()=>{
 const examples=createWorkspacePortfolio().filter(r=>r.caseId.startsWith('NEW-SANED-DQ-LOGIN-'));assert.equal(examples.length,2);
 for(const record of examples){
  const data=record.caseData;assert.equal(data.dataQuality.label,'Low');assert.equal(data.modelAssessment.complete,false);assert.equal(data.score,null);assert.equal(data.route,'Data Verification Review');
  assert.ok(data.dataQuality.issues.some(issue=>issue.critical&&issue.field.startsWith('access.login')));
  const facts=explanationEvidence(record).facts;assert.equal(facts.find(f=>f.id==='data-quality').value.label,'Low');
 }
});
test('previous repeated demo rows are hidden from the active workspace while their reviews remain stored',async()=>{
 const path=join(dir,'backend-assessments.json'),records=JSON.parse(await readFile(path,'utf8'));
 const duplicate=structuredClone(records.find(r=>r.caseId==='BRI-001'));duplicate.caseId='BRI-031';duplicate.caseData.id='BRI-031';duplicate.assessmentId='historical-duplicate';duplicate.caseData.assessmentId=duplicate.assessmentId;
 duplicate.reviewHistory=[{caseId:'BRI-031',type:'outcome',note:'Historical demonstration review',assessmentId:'historical-duplicate'}];duplicate.caseData.reviewHistory=duplicate.reviewHistory;
 await writeFile(path,JSON.stringify([...records,duplicate]));
 const refreshed=await post('/workspace-demo');assert.equal(refreshed.saved.length,77);assert.ok(!refreshed.saved.some(r=>r.caseId==='BRI-031'));
 const archived=JSON.parse(await readFile(path,'utf8')).find(r=>r.caseId==='BRI-031');assert.equal(archived.caseData.demoDuplicateOf,'BRI-001');assert.deepEqual(archived.reviewHistory,duplicate.reviewHistory);
});

test('demo intake adds six new maternity cases to preloaded data and safely deduplicates retries',async()=>{
 const before=await post('/workspace-demo');assert.equal(before.saved.length,77);
 const upload=await post('/demo-intake');assert.equal(upload.added,6);assert.equal(upload.received,6);assert.equal(upload.alreadyLoaded,0);assert.equal(upload.saved.length,83);
 assert.equal(upload.review,3);assert.equal(upload.complete,5);assert.equal(upload.incomplete,1);
 const incoming=upload.saved.filter(r=>r.caseData.demoIntakeBatch==='maternity-v1');assert.equal(incoming.length,6);
 for(const record of incoming){
  assert.equal(record.journey,'Maternity Benefit');assert.equal(record.caseData.outcome,null);assert.equal(record.caseData.preventedAmount,0);assert.equal(record.caseData.confirmedFraudAmount,0);
  assert.ok(!record.caseData.crossJourneyEvidence.events.some(e=>e.type==='claim'));
 }
 assert.equal(new Set(upload.saved.map(r=>r.caseData.customerName)).size,83);
 for(const record of before.saved){const after=upload.saved.find(r=>r.caseId===record.caseId);assert.equal(after.assessmentId,record.assessmentId);assert.deepEqual(after.reviewHistory,record.reviewHistory);}
 const pending=incoming.find(r=>r.complete&&r.modelFlagged);
 await post('/decision',{caseId:pending.caseId,assessmentId:pending.assessmentId,actorName:'QA maternity specialist',note:'Verify linked source records.',action:'override',route:'Additional verification'});
 const repeat=await post('/demo-intake');assert.equal(repeat.added,0);assert.equal(repeat.alreadyLoaded,6);assert.equal(repeat.saved.length,83);
 const retained=repeat.saved.find(r=>r.caseId===pending.caseId);assert.equal(retained.assessmentId,pending.assessmentId);assert.ok(retained.reviewHistory.some(r=>r.actorName==='QA maternity specialist'));
 const reload=await post('/workspace-demo');assert.equal(reload.saved.length,83);assert.equal(reload.added,0);assert.equal(reload.saved.find(r=>r.caseId===pending.caseId).assessmentId,pending.assessmentId);
 await post('/demo-reset');assert.equal((await post('/workspace-demo')).saved.length,77);assert.equal((await post('/demo-intake')).added,6);
});

test('SANED model and hybrid-policy upgrade preserves existing decisions, outcomes and ownership',async()=>{
 const before=await post('/workspace-demo');const original=before.saved.find(r=>r.caseId==='NEW-ENTERPRISE-SANED-0');
 let decided=await post('/decision',{caseId:original.caseId,assessmentId:original.assessmentId,actorName:'QA hybrid specialist',note:'Retain documented specialist route.',action:'override',route:'Cybersecurity Review'});
 decided=await post('/outcome',{caseId:original.caseId,assessmentId:original.assessmentId,actorName:'QA hybrid specialist',note:'Documented legitimate synthetic activity.',outcome:'Legitimate activity',financialOutcome:'Proceeded',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
 const path=join(dir,'backend-assessments.json'),records=JSON.parse(await readFile(path,'utf8')),record=records.find(r=>r.caseId===original.caseId);
 record.modelResult.modelVersion='historical-saned-model';record.caseData.assessmentMode='model-separated';record.caseData.workflow={stage:'Triage',assignedTo:'Retained owner',revision:2};await writeFile(path,JSON.stringify(records));
 const upgraded=(await post('/workspace-demo')).saved.find(r=>r.caseId===record.caseId);
 assert.notEqual(upgraded.assessmentId,record.assessmentId);assert.equal(upgraded.modelResult.modelVersion,'saned-if-20261016-v1');assert.equal(upgraded.caseData.assessmentMode,'hybrid');
 assert.deepEqual(upgraded.caseData.workflow,record.caseData.workflow);assert.deepEqual(upgraded.reviewHistory,decided.reviewHistory);assert.equal(upgraded.caseData.route,'Cybersecurity Review');
 for(const key of ['outcome','preventedAmount','confirmedFraudAmount','financialOutcome'])assert.equal(upgraded.caseData[key],record.caseData[key]);
 assert.ok(upgraded.caseData.assessmentHistory.some(h=>h.assessmentId===record.assessmentId));
 const repeated=(await post('/workspace-demo')).saved.find(r=>r.caseId===record.caseId);assert.equal(repeated.assessmentId,upgraded.assessmentId);
 const registry=await(await fetch(base+'/journey-models')).json(),saned=registry.models.find(m=>m.journey==='SANED');assert.equal(saned.trainingCases,2400);assert.equal(saned.treeCount,100);assert.equal(registry.models.length,7);
});
