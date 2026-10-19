import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {createDemoPortfolio} from '../lib/demo-portfolio.mjs';
import {dataQuality} from '../lib/data-quality.mjs';
import {explanationEvidence} from '../lib/case-explainer.mjs';

test('enterprise demo covers six journeys with honest detection and outcome provenance',()=>{
  const records=createDemoPortfolio();
  assert.equal(records.length,39);
  assert.equal(new Set(records.map(r=>r.journey)).size,6);
  const rules=records.filter(r=>r.assessmentSource==='rules-demo');
  assert.equal(rules.length,30);
  assert.ok(rules.every(r=>!r.modelResult&&!r.caseData.modelAssessment));
  assert.equal(new Set(records.map(r=>r.caseData.region)).size,13);
  const prevented=records.filter(r=>r.caseData.preventedAmount>0);
  assert.equal(prevented.length,7);
  const ai=prevented.filter(r=>r.modelFlagged);
  assert.equal(ai.length,2);
  assert.equal(ai.reduce((n,r)=>n+r.caseData.preventedAmount,0),72000);
  for(const r of prevented){assert.ok(r.caseData.preventedAmount<=r.caseData.transactionAmount);assert.equal(r.caseData.outcomeProvenance,'Scripted demo outcome');assert.equal(r.reviewHistory[0].syntheticExample,true);}
  for(const r of records.filter(r=>!r.complete)){assert.equal(r.caseData.risk,'Incomplete');assert.equal(r.caseData.preventedAmount,0);assert.equal(r.caseData.amountAtRisk,null);}
});

test('data quality counts individual missing cells; zero is valid; critical gaps remain visible',()=>{
  const base=createDemoPortfolio().find(r=>r.caseId==='NEW-ENTERPRISE-SANED-0').caseData;
  const one=structuredClone(base),ten=structuredClone(base);
  delete one.modelInput.sanedCase.events[0].subject;
  for(const event of ten.modelInput.sanedCase.events.slice(0,10))delete event.subject;
  const full=dataQuality(base),q1=dataQuality(one),q10=dataQuality(ten);
  assert.equal(full.score,100);
  assert.equal(q1.total,full.total);assert.equal(q10.total,full.total);
  assert.equal(full.passed-q1.passed,1);assert.equal(full.passed-q10.passed,10);
  assert.ok(q1.score>q10.score);assert.equal(q1.criticalMissing,true);
  const zero={...base,transactionAmount:0,ruleScore:0};assert.equal(dataQuality(zero).score,100);
  const linked=createDemoPortfolio().find(r=>r.caseId==='CJ-SYN-enterprise-001').caseData;
  assert.equal(linked.dataQuality.issues.filter(i=>i.field.includes('sourceConsistency')).length,1);
  const rules=createDemoPortfolio().filter(r=>r.assessmentSource==='rules-demo');
  assert.ok(rules[4].caseData.dataQuality.score>rules[5].caseData.dataQuality.score);
});

test('LLM evidence distinguishes rules-only cases and scripted prevention from real findings',()=>{
  const records=createDemoPortfolio();
  const rule=records.find(r=>r.assessmentSource==='rules-demo'&&r.caseData.preventedAmount>0);
  const facts=explanationEvidence(rule).facts;
  assert.match(facts.find(f=>f.id==='assessment').value.scoreMeaning,/no trained model/);
  assert.equal(facts.find(f=>f.id==='case-state').value.outcomeProvenance,'Scripted demo outcome');
  assert.ok(facts.some(f=>f.id==='data-quality'));
  assert.ok(facts.some(f=>f.id==='rule-evidence'));
});

test('portfolio load is idempotent, preserves reviews, and rejects route approval after resolution',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'madar-enterprise-demo-'));process.env.ASSESSMENT_DATA_DIR=dir;
  const {createInferenceServer}=await import('../server.mjs');const server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body,status=200)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;};
  try{
    const first=await post('/demo-portfolio',{});assert.equal(first.added,39);
    const pending=first.saved.find(r=>r.assessmentSource==='rules-demo'&&!r.caseData.outcome&&r.complete);
    const review={caseId:pending.caseId,assessmentId:pending.assessmentId,actorName:'QA reviewer',note:'Reviewed synthetic control evidence.'};
    await post('/decision',{...review,action:'override',route:'Additional verification'});
    const second=await post('/demo-portfolio',{});assert.equal(second.added,0);
    assert.equal(second.saved.find(r=>r.caseId===pending.caseId).caseData.route,'Additional verification');
    assert.equal(second.saved.find(r=>r.caseId===pending.caseId).reviewHistory.length,1);
    const resolved=first.saved.find(r=>r.caseData.preventedAmount>0);
    await post('/decision',{...review,caseId:resolved.caseId,assessmentId:resolved.assessmentId,action:'approve'},409);
    const restored=await(await fetch(base+'/assessments')).json();
    assert.equal(restored.find(r=>r.caseId===resolved.caseId).reviewHistory[0].syntheticExample,true);
    assert.ok(restored.every(r=>Number.isFinite(r.caseData.dataQuality.score)));
  }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
