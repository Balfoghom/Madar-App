import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {hybridPolicy} from '../lib/hybrid-policy.mjs';
import {parseEventCSV,createCrossJourneyAssessment,demoCases} from '../lib/cross-journey-adapter.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-cross-integration-'));
process.env.ASSESSMENT_DATA_DIR=dir;
const {createInferenceServer}=await import('../server.mjs');
const csv=await readFile(new URL('../cross-journey/data/cross-journey-demo-events.csv',import.meta.url),'utf8');
test.after(()=>rm(dir,{recursive:true,force:true}));
test('expanded event CSV round-trips all twelve genuine model assessments',()=>{
 const grouped=parseEventCSV(csv);assert.equal(grouped.length,12);assert.equal(grouped.reduce((n,c)=>n+c.events.length,0),demoCases.reduce((n,c)=>n+c.events.length,0));
 const results=grouped.map(createCrossJourneyAssessment);
 for (let i=0;i<results.length;i++) assert.equal(results[i].evidenceFingerprint,createCrossJourneyAssessment(demoCases[i]).evidenceFingerprint);
 assert.deepEqual(results.map(r=>r.modelFlagged??null),[false,true,false,true,true,null,false,false,false,true,true,true]);
 assert.deepEqual(results.map(r=>r.ruleFlagged??null),[false,false,false,true,true,null,false,false,false,false,false,false]);
 const proof=results[1];assert.equal(proof.caseData.sourceTimeline.length,12);assert.equal(proof.linkedContributorCount,3);assert.equal(proof.caseData.ruleScore,55);assert.equal(proof.caseData.score,Math.max(0,Math.min(100,Math.round(55*.55+proof.modelResult.score*45))));assert.equal(proof.caseData.entity,grouped[1].employerId);
 assert.equal(results[5].caseData.risk,'Incomplete');assert.equal(results[5].percentile,null);
});
test('CSV rejects conflicting grouping keys, duplicate events and non-synthetic input',()=>{
 const lines=csv.trim().split('\n');
 assert.throws(()=>parseEventCSV(csv+'\n'+lines[1]),/Duplicate event/);
 assert.throws(()=>parseEventCSV(csv.replace('1792195200000','1792195200001')),/inconsistent/);
 assert.throws(()=>parseEventCSV([lines[0],...lines.slice(1).map(line=>{const cells=line.split(',');cells[lines[0].split(',').indexOf('synthetic')]='0';return cells.join(',');})].join('\n')),/synthetic/);
 assert.throws(()=>parseEventCSV('case_id,event_id\nx,y'),/template/);
 assert.throws(()=>parseEventCSV(csv+'"'),/unclosed/);
});
test('connected import is idempotent, decisions persist, changed evidence requires fresh review',async t=>{
 let server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 let base=`http://127.0.0.1:${server.address().port}`;
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let response=await post('/cross-journey/assess',{csv});assert.equal(response.status,200);
 let batch=await response.json();assert.equal(batch.saved.length,12);assert.equal(batch.complete,11);assert.equal(batch.incomplete,1);
 let proof=batch.saved[1];
 response=await post('/decision',{caseId:proof.caseId,assessmentId:proof.assessmentId,action:'approve',actorName:'Madar test specialist',note:'Review linked contributor timelines before proceeding.'});assert.equal(response.status,200);
 const reviewed=await response.json();assert.equal(reviewed.caseData.status,'Route approved');assert.deepEqual(reviewed.modelResult,proof.modelResult);
 const again=await (await post('/cross-journey/assess',{csv})).json();assert.equal(again.saved[1].assessmentId,proof.assessmentId);assert.equal(again.saved[1].reviewHistory.length,1);
 assert.equal((await(await fetch(base+'/assessments')).json()).length,12);
 const bad=await post('/cross-journey/assess',{csv:csv.replace('1792195200000','bad')});assert.equal(bad.status,400);assert.equal((await(await fetch(base+'/assessments')).json()).length,12);
 await new Promise(resolve=>server.close(resolve));server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
 const restored=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===proof.caseId);assert.equal(restored.reviewHistory.length,1);assert.equal(restored.caseData.status,'Route approved');
 const changed=csv.replaceAll('1792195200000','1792195200001');const updated=await(await post('/cross-journey/assess',{csv:changed})).json();const next=updated.saved.find(r=>r.caseId===proof.caseId);assert.notEqual(next.assessmentId,proof.assessmentId);assert.equal(next.reviewHistory.length,1);assert.equal(next.caseData.status,'Awaiting specialist');
 assert.equal((await post('/decision',{caseId:proof.caseId,assessmentId:proof.assessmentId,action:'approve',note:'Stale review',actorName:'Test'})).status,409);
 const health=await(await fetch(base+'/health')).json();assert.equal(health.crossJourneyModelVersion,'madar-cross-journey-rf-20261107-v4');
});

test('reported source conflicts require verification without changing the model flag',()=>{
 const model={complete:true,score:.4,modelFlagged:false,ruleFlagged:false};
 const policy=hybridPolicy({journey:'SANED',ruleScore:10,features:{crossSourceConflict:true}},model);
 assert.equal(policy.route,'Data Verification Review');assert.equal(policy.risk,'Medium');assert.equal(model.modelFlagged,false);assert.equal(policy.score,24);
});

test('cross-journey destination follows the request evidence rather than a SANED constant',()=>{
 const evidence=structuredClone(demoCases[1]);evidence.id='CJ-SYN-other-destination';
 const latest=evidence.events.filter(event=>event.type==='claim').sort((a,b)=>a.recordedAt-b.recordedAt).at(-1);latest.journey='Benefit Payments';
 const record=createCrossJourneyAssessment(evidence);assert.equal(record.journey,'Benefit Payments');assert.equal(record.caseData.journey,'Benefit Payments');assert.equal(record.caseData.crossJourneyEvidence.events.find(event=>event.eventId===latest.eventId).journey,'Benefit Payments');
});
