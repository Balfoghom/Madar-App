import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

test('integration contract: CSV inference, separated scores, abstention and immutable human review history', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'contract-'));process.env.ASSESSMENT_DATA_DIR=dir;
 const {createInferenceServer}=await import('../server.mjs');
 const {assess}=await import('../lib/detector.mjs');
 const cases=JSON.parse(await readFile(new URL('../data/cases.json',import.meta.url),'utf8'));
 const server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 async function post(path,body,status=200){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;}
 const context=(n,score=20)=>({id:'UPL-contract-'+n,synthetic:true,transactionId:'TEST-'+n,journey:'SANED',scenario:'Synthetic contract check',ruleScore:score,transactionAmount:12000,features:{},modelInput:{case_id:cases[n].id}});
 try {
  const uploaded=await post('/upload',{csv:'synthetic,journey\ntrue,SANED',mode:'append',rows:[context(0),context(2),context(5)]});
  assert.equal(uploaded.saved.length,3);
  for(const item of uploaded.saved){const n=Number(item.caseId.split('-').at(-1));const direct=assess(cases[n]);for(const key of ['modelVersion','score','percentile','modelFlagged','ruleFlagged','complete','features']){assert.deepEqual(item[key],direct[key],key);assert.deepEqual(item.caseData.modelAssessment[key],direct[key],key);} }
  const missing=uploaded.saved.find(x=>x.complete===false);assert.ok(missing);assert.equal(missing.caseData.risk,'Incomplete');assert.equal(missing.caseData.score,null);assert.equal(missing.percentile,null);
  const before=uploaded.saved.find(x=>x.caseId==='UPL-contract-0');
  const other=await post('/assess',{assessment:{...context(0,90),id:'NEW-control-only'}});
  assert.equal(other.score,before.score);assert.equal(other.percentile,before.percentile);assert.equal(other.caseData.score,90);assert.equal(other.caseData.risk,'High');
  await post('/assess',{assessment:{...context(0),synthetic:false}},400);
  await post('/assess',{assessment:{...context(0),modelInput:{case_id:'SYN-unknown'}}},404);
  await post('/assess',{case_id:cases[0].id,score:99},400);
  await post('/save-assessment',{assessment:{...context(0),score:99}},409);
  const review={caseId:before.caseId,assessmentId:before.assessmentId,actorName:'Demo specialist',note:'Reviewed synthetic evidence.'};
  await post('/outcome',{...review,outcome:'unknown',financialOutcome:'Proceeded',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0},400);
  const recorded=await post('/outcome',{...review,outcome:'Legitimate activity',financialOutcome:'Proceeded',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
  assert.deepEqual(recorded.modelResult,before.modelResult);
  for(const action of ['approve','override','reject']){const result=await post('/decision',{...review,action,route:'Insurance Operations Audit'});assert.deepEqual(result.modelResult,before.modelResult);}
  const ledger=JSON.parse(await readFile(join(dir,'human-reviews.json'),'utf8'));assert.equal(ledger.length,4);assert.ok(ledger.every(x=>x.assessmentId===before.assessmentId));
  const newer=await post('/assess',{assessment:context(0)});assert.notEqual(newer.assessmentId,before.assessmentId);
  await post('/decision',{...review,action:'approve'},409);
  const saved=await(await fetch(base+'/assessments')).json();const current=saved.find(x=>x.assessmentId===newer.assessmentId);assert.equal(current.reviewHistory.length,4);assert.deepEqual(current.modelResult,newer.modelResult);
 } finally {await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
