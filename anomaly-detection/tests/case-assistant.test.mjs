import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {explanationEvidence,PROMPT_VERSION} from '../lib/case-explainer.mjs';
const dir=await mkdtemp(join(tmpdir(),'madar-assistant-'));
process.env.ASSESSMENT_DATA_DIR=dir;
process.env.MADAR_LLM_PROVIDER='openai';process.env.MADAR_LLM_MODEL='test-model';process.env.OPENAI_API_KEY='test-only-not-real';
const {createInferenceServer}=await import('../server.mjs');
let server,base,briefCalls=0,answerCalls=0,hold,release;
const explain=async(record,{language})=>{
 briefCalls++;const {facts,fingerprint}=explanationEvidence(record);const item={text:language==='ar'?'راجع الأدلة.':'Review the evidence.',evidenceIds:['assessment']};
 return {caseId:record.caseId,assessmentId:record.assessmentId,language,promptVersion:PROMPT_VERSION,model:'test-model',evidenceFingerprint:fingerprint,facts,explanation:{overview:item,whyItMatters:item,findings:[],questions:[],nextSteps:[item]}};
};
const answer=async(record,{language,question})=>{answerCalls++;if(hold)await hold;return {answer:{text:question,evidenceIds:['assessment']},language,assessmentId:record.assessmentId,evidenceFingerprint:explanationEvidence(record).fingerprint};};
test.before(async()=>{server=createInferenceServer({explain,answer});server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
async function post(path,body,status=200){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
test('brief cache separates languages; questions stay tied to the current case evidence',async()=>{
 const record=(await post('/cross-journey/assess',{case_id:'CJ-SYN-demo-00001'})).saved[0];
 const body={caseId:record.caseId,assessmentId:record.assessmentId,generate:true};
 const en=await post('/case-explanation',{...body,language:'en'}),ar=await post('/case-explanation',{...body,language:'ar'});
 assert.equal(en.draft.language,'en');assert.equal(ar.draft.language,'ar');assert.equal(briefCalls,2);
 for(const language of ['ar','en']){const cached=await post('/case-explanation',{...body,language,generate:false});assert.equal(cached.cached,true);assert.equal(cached.draft.language,language);}
 await post('/case-explanation',{...body,language:'fr'},400);assert.equal(briefCalls,2);
 const question={caseId:record.caseId,assessmentId:record.assessmentId,language:'ar',question:'لماذا؟',history:[],evidenceFingerprint:ar.draft.evidenceFingerprint};
 const response=await post('/case-question',question);assert.equal(response.language,'ar');assert.equal(answerCalls,1);
 await post('/case-question',{...question,assessmentId:'other-case'},409);
 await post('/case-question',{...question,evidenceFingerprint:'old'},409);
 await post('/case-question',{...question,question:'a'.repeat(1201)},400);
 await post('/case-question',{...question,history:[{role:'assistant',text:'Unsupported context'}]},400);
 assert.equal(answerCalls,1);
 const before=(await(await fetch(base+'/assessments')).json()).find(r=>r.caseId===record.caseId);
 assert.deepEqual(before.modelResult,record.modelResult);assert.equal(before.reviewHistory.length,0);
 // A response generated against old evidence must never reach the specialist.
 hold=new Promise(resolve=>{release=resolve;});const pending=post('/case-question',question,409);
 while(answerCalls<2)await new Promise(resolve=>setTimeout(resolve,5));
 await post('/case-question',question,409);
 await post('/outcome',{caseId:record.caseId,assessmentId:record.assessmentId,actorName:'QA',note:'Verified synthetic records.',outcome:'Legitimate activity',financialOutcome:'No financial impact',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0});release();await pending;hold=null;
 await post('/case-question',question,409);
});
