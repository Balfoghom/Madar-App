import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {explanationEvidence,PROMPT_VERSION} from '../lib/case-explainer.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-llm-workflow-'));
process.env.ASSESSMENT_DATA_DIR=dir;
process.env.MADAR_LLM_PROVIDER='openai';
process.env.MADAR_LLM_MODEL='test-model';
process.env.OPENAI_API_KEY='test-only-not-a-real-key';
const {createInferenceServer}=await import('../server.mjs');
let server,base,calls=0,hold=null;
const explain=async record=>{
 calls++;
 if(hold)await hold;
 const {facts,fingerprint}=explanationEvidence(record);
 return {id:'test-draft-'+calls,assessmentId:record.assessmentId,caseId:record.caseId,provider:'OpenAI',model:'test-model',promptVersion:PROMPT_VERSION,evidenceFingerprint:fingerprint,facts,generatedAt:new Date().toISOString(),status:'Unreviewed draft',explanation:{overview:{text:'Synthetic evidence needs review.',evidenceIds:['assessment']},findings:[],questions:[],nextSteps:[]}};
};
test.before(async()=>{server=createInferenceServer({explain});server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port});
test.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})});
async function post(path,body,status=200){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data}
const assess=async id=>(await post('/cross-journey/assess',{case_id:id})).saved[0];
const request=r=>({caseId:r.caseId,assessmentId:r.assessmentId,generate:true});
const outcome=r=>({caseId:r.caseId,assessmentId:r.assessmentId,actorName:'QA specialist',note:'Synthetic review outcome.',outcome:'Legitimate activity',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});
test('LLM endpoint caches matching evidence and invalidates a draft after a recorded outcome',async()=>{
 const record=await assess('CJ-SYN-demo-00000'),body=request(record);
 const first=await post('/case-explanation',body);assert.equal(first.cached,false);assert.equal(calls,1);
 const cached=await post('/case-explanation',body);assert.equal(cached.cached,true);assert.equal(cached.draft.id,first.draft.id);assert.equal(calls,1);
 await post('/outcome',outcome(record));
 assert.equal((await post('/case-explanation',{...body,generate:false})).draft,null);
 const next=await post('/case-explanation',body);assert.equal(next.cached,false);assert.equal(calls,2);
 const saved=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===record.caseId);assert.deepEqual(saved.modelResult,record.modelResult);
});
test('in-flight duplicate requests remain locked and changed evidence prevents saving a stale draft',async()=>{
 const record=await assess('CJ-SYN-demo-00002');let release;hold=new Promise(resolve=>{release=resolve});
 const pending=post('/case-explanation',request(record),409);
 while(calls<3)await new Promise(resolve=>setTimeout(resolve,5));
 await post('/case-explanation',request(record),409);
 await post('/case-explanation',request(record),409);
 await post('/outcome',outcome(record));release();await pending;hold=null;
 assert.equal((await post('/case-explanation',{...request(record),generate:false})).draft,null);
});
