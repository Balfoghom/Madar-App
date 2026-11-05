import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {separatedPolicy} from '../lib/assessment-adapter.mjs';
import {parseEventCSV,createCrossJourneyAssessment,demoCases} from '../lib/cross-journey-adapter.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-cross-integration-'));
process.env.ASSESSMENT_DATA_DIR=dir;
const {createInferenceServer}=await import('../server.mjs');
const csv=await readFile(new URL('../cross-journey/data/cross-journey-demo-events.csv',import.meta.url),'utf8');
test.after(()=>rm(dir,{recursive:true,force:true}));
test('event CSV groups 35 events into six genuine model assessments',()=>{
 const grouped=parseEventCSV(csv);assert.equal(grouped.length,6);assert.equal(grouped.reduce((n,c)=>n+c.events.length,0),35);
 const results=grouped.map(createCrossJourneyAssessment);
 for (let i=0;i<results.length;i++) assert.equal(results[i].evidenceFingerprint,createCrossJourneyAssessment(demoCases[i]).evidenceFingerprint);
 assert.deepEqual(results.map(r=>r.modelFlagged??null),[false,true,false,true,true,null]);
 assert.deepEqual(results.map(r=>r.ruleFlagged??null),[false,false,false,true,true,null]);
 const proof=results[1];assert.equal(proof.caseData.sourceTimeline.length,12);assert.equal(proof.linkedContributorCount,3);assert.equal(proof.caseData.score,null);assert.equal(proof.caseData.entity,grouped[1].employerId);
 assert.equal(results[5].caseData.risk,'Incomplete');assert.equal(results[5].percentile,null);
});
test('CSV rejects conflicting grouping keys, duplicate events and non-synthetic input',()=>{
 const lines=csv.trim().split('\n');
 assert.throws(()=>parseEventCSV(csv+'\n'+lines[1]),/Duplicate event/);
 assert.throws(()=>parseEventCSV(csv.replace('1792195200000','1792195200001')),/inconsistent/);
 assert.throws(()=>parseEventCSV(csv.replace(/,1\r?\n/,',0\n')),/synthetic/);
 assert.throws(()=>parseEventCSV('case_id,event_id\nx,y'),/template/);
 assert.throws(()=>parseEventCSV(csv+'"'),/unclosed/);
});
test('connected import is idempotent, decisions persist, changed evidence requires fresh review',async t=>{
 let server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 let base=`http://127.0.0.1:${server.address().port}`;
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let response=await post('/cross-journey/assess',{csv});assert.equal(response.status,200);
 let batch=await response.json();assert.equal(batch.saved.length,6);assert.equal(batch.complete,5);assert.equal(batch.incomplete,1);
 let proof=batch.saved[1];
 response=await post('/decision',{caseId:proof.caseId,assessmentId:proof.assessmentId,action:'approve',actorName:'Madar test specialist',note:'Review linked contributor timelines before proceeding.'});assert.equal(response.status,200);
 const reviewed=await response.json();assert.equal(reviewed.caseData.status,'Route approved');assert.deepEqual(reviewed.modelResult,proof.modelResult);
 const again=await (await post('/cross-journey/assess',{csv})).json();assert.equal(again.saved[1].assessmentId,proof.assessmentId);assert.equal(again.saved[1].reviewHistory.length,1);
 assert.equal((await(await fetch(base+'/assessments')).json()).length,6);
 const bad=await post('/cross-journey/assess',{csv:csv.replace('1792195200000','bad')});assert.equal(bad.status,400);assert.equal((await(await fetch(base+'/assessments')).json()).length,6);
 await new Promise(resolve=>server.close(resolve));server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
 const restored=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===proof.caseId);assert.equal(restored.reviewHistory.length,1);assert.equal(restored.caseData.status,'Route approved');
 const changed=csv.replaceAll('1792195200000','1792195200001');const updated=await(await post('/cross-journey/assess',{csv:changed})).json();const next=updated.saved.find(r=>r.caseId===proof.caseId);assert.notEqual(next.assessmentId,proof.assessmentId);assert.equal(next.reviewHistory.length,1);assert.equal(next.caseData.status,'Awaiting specialist');
 assert.equal((await post('/decision',{caseId:proof.caseId,assessmentId:proof.assessmentId,action:'approve',note:'Stale review',actorName:'Test'})).status,409);
 const health=await(await fetch(base+'/health')).json();assert.equal(health.crossJourneyModelVersion,'madar-cross-journey-rf-20261019-v2');
});

test('reported source conflicts require verification without changing the model flag',()=>{
 const model={complete:true,modelFlagged:false,ruleFlagged:false};
 const policy=separatedPolicy({journey:'SANED',ruleScore:10,features:{crossSourceConflict:true}},model);
 assert.equal(policy.route,'Additional verification');assert.equal(policy.risk,'Medium');assert.equal(model.modelFlagged,false);assert.equal(policy.score,10);
});
