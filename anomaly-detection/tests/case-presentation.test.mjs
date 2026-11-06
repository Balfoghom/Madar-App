import test from 'node:test';
import assert from 'node:assert/strict';
import '../../dist/case-presentation.js';
import {createDemoPortfolio} from '../lib/demo-portfolio.mjs';
const view=globalThis.MadarCasePresentation;
test('case presentation retains distinct control, connected and simulation scoring meanings',()=>{
 const portfolio=createDemoPortfolio();
 const rule=portfolio.find(r=>r.assessmentSource==='rules-demo'&&r.complete).caseData;
 assert.equal(view.score(rule).value,rule.ruleScore);assert.equal(view.score(rule).label,'Control score');
 const saned=portfolio.find(r=>r.caseId==='NEW-ENTERPRISE-SANED-1').caseData;
 assert.equal(view.score(saned).value,saned.ruleScore);assert.equal(view.score(saned).kind,'control');
 const linked=portfolio.find(r=>r.caseId==='CJ-SYN-enterprise-001').caseData;
 assert.equal(view.score(linked).value,null);assert.equal(view.score(linked).kind,'pattern');
 const incomplete=portfolio.find(r=>!r.complete).caseData;assert.equal(view.score(incomplete).value,null);
 const simulated={score:88,risk:'High',ruleScore:77};assert.equal(view.score(simulated).value,88);assert.equal(view.score(simulated).kind,'simulation');
});
test('resolved outcomes, unknown financial values and actual linked evidence are preserved',()=>{
 const linked=createDemoPortfolio().find(r=>r.caseId==='CJ-SYN-enterprise-001').caseData;
 const before=JSON.stringify(linked),facts=view.keyEvidence(linked);
 assert.match(facts[0].text,/12 supplied events involve 3 contributors/);
 assert.ok(facts.some(f=>f.title==='Source conflict'));
 assert.equal(view.state(linked).resolved,true);assert.equal(view.state(linked).action,'Update outcome');assert.equal(view.state(linked).scripted,true);
 assert.equal(view.state({...linked,outcome:'Suspected fraud — further investigation'}).resolved,false);
 assert.equal(view.financial({...linked,outcomeProvenance:null,amountAtRisk:null,transactionAmount:null}).amount,null);
 assert.equal(view.financial({...linked,outcomeProvenance:null,amountAtRisk:0}).amount,0);
 assert.equal(JSON.stringify(linked),before);
 const future=structuredClone(linked);future.crossJourneyEvidence.events.push({...future.crossJourneyEvidence.events[0],recordedAt:future.crossJourneyEvidence.asOf+1,subjectId:'future'});
 assert.deepEqual(view.keyEvidence(future),facts);
});
