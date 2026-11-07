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
 assert.equal(facts.some(f=>f.title==='Source conflict'),linked.crossJourneyEvidence.events.some(e=>e.sourceConflict));
 assert.equal(view.state(linked).resolved,true);assert.equal(view.state(linked).action,'Update outcome');assert.equal(view.state(linked).scripted,true);
 assert.equal(view.state({...linked,outcome:'Suspected fraud — further investigation'}).resolved,false);
 assert.equal(view.financial({...linked,outcomeProvenance:null,amountAtRisk:null,transactionAmount:null}).amount,null);
 assert.equal(view.financial({...linked,outcomeProvenance:null,amountAtRisk:0}).amount,0);
 assert.equal(JSON.stringify(linked),before);
 const future=structuredClone(linked);future.crossJourneyEvidence.events.push({...future.crossJourneyEvidence.events[0],recordedAt:future.crossJourneyEvidence.asOf+1,subjectId:'future'});
 assert.deepEqual(view.keyEvidence(future),facts);
});

test('queue reasons describe connected evidence and preserve assessment outputs',()=>{
 const records=createDemoPortfolio().filter(r=>r.caseData.assessmentSource==='cross-journey').map(r=>r.caseData);
 const original=JSON.stringify(records);
 const sequence=records.find(r=>r.id==='CJ-SYN-enterprise-001');
 assert.match(view.mainReason(sequence),/3 linked contributors.*registration → wage → exclusion → SANED/);
 const digital=records.find(r=>r.id==='CJ-SYN-enterprise-009');
 assert.match(view.mainReason(digital),/1 contributor shows a login → profile update → IBAN change → request/);
 assert.notEqual(view.mainReason(sequence),view.mainReason(digital));
 const missing=records.find(r=>r.modelAssessment.complete===false);
 assert.equal(view.mainReason(missing),missing.modelAssessment.reasons[0]);
 assert.equal(JSON.stringify(records),original);
});

test('unresolved classifications stay in attention while resolved outcomes require closeout',()=>{
 const suspected={risk:'High',outcome:'Suspected fraud — further investigation',workflow:{stage:'New'}};
 assert.equal(view.needsReview(suspected),true);assert.equal(view.state(suspected).status,'Investigation ongoing');
 assert.equal(view.attentionMatches(suspected,'unresolved-high'),true);
 const resolved={...suspected,outcome:'Confirmed violation'};
 assert.equal(view.needsReview(resolved),false);assert.equal(view.state(resolved).status,'Outcome recorded · closure pending');
 assert.equal(view.state({...resolved,workflow:{stage:'Closed'}}).status,'Closed');
 const connected={assessmentSource:'cross-journey',risk:'Medium',ruleScore:55,modelAssessment:{complete:true,modelFlagged:true}};
 assert.equal(view.score(connected).value,null);assert.equal(view.score(connected).label,'Model review suggested');
});
test('business signal counts use semantic categories and deduplicate each case',()=>{
 const item={signals:[['CROSS_JOURNEY_EVIDENCE_1','2 payment-account changes appear before the assessment; verify ownership before payment.'],['CROSS_JOURNEY_EVIDENCE_2','3 payment-account changes appear before the assessment; verify ownership before payment.'],['CROSS_JOURNEY_EVIDENCE_3','1 contributors show a login → profile update → IBAN change → request sequence within 24 hours.']]};
 assert.deepEqual(view.signals(item).map(([code])=>code),['PAYMENT_ACCOUNT_CHANGE','ACCOUNT_CHANGE_SEQUENCE']);
 assert.equal(view.attentionMatches(item,'signal:ACCOUNT_CHANGE_SEQUENCE'),true);
 assert.equal(view.attentionMatches(item,'signal:SOURCE_CONFLICT'),false);
 assert.equal(view.reasonLabel(item.signals[0]),'Payment account change');
 assert.equal(view.attentionMatches({confidence:'Low'},'low-quality'),true);
});
