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
 assert.equal(next.modelResult.modelVersion,'madar-cross-journey-rf-20261107-v3');assert.notEqual(next.assessmentId,oldId);
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
