import {behavioral} from './fixtures/behavioral.mjs';
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
 assert.equal(view.score(saned).value,saned.score);assert.equal(view.score(saned).kind,'incomplete');assert.equal(view.score(saned).label,'Evidence incomplete');
 const linked=portfolio.find(r=>r.caseId==='CJ-SYN-enterprise-001').caseData;
 assert.equal(view.score(linked).value,linked.score);assert.equal(view.score(linked).kind,'incomplete');
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
 assert.match(view.mainReason(sequence),/Repeated registration, wage and employment-exclusion changes.*3 linked contributors/);
 const digital=records.find(r=>r.id==='CJ-SYN-enterprise-009');
 assert.match(view.mainReason(digital),/Login, profile and IBAN changes.*1 contributor completed.*24 hours/);
 assert.notEqual(view.mainReason(sequence),view.mainReason(digital));
 const missing=records.find(r=>r.modelAssessment.complete===false);
 assert.match(view.mainReason(missing),/connected source evidence is incomplete/);
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

test('linked journey labels describe source services without changing the destination',()=>{
 const record=createDemoPortfolio().find(r=>r.caseId==='CJ-SYN-enterprise-009').caseData;
 const original=JSON.stringify(record),linked=view.journeys(record);
 assert.ok(linked.includes('Digital Access'));assert.ok(linked.includes('Benefit Payments'));assert.ok(linked.includes('SANED'));assert.equal(record.journey,'SANED');
 const future=structuredClone(record);future.crossJourneyEvidence.events.push({...future.crossJourneyEvidence.events[0],journey:'Future service',recordedAt:future.crossJourneyEvidence.asOf+1});
 assert.deepEqual(view.journeys(future),linked);assert.equal(JSON.stringify(record),original);
});

test('maternity explanations name the request and linked evidence',()=>{
 const item={assessmentSource:'cross-journey',journey:'Maternity Benefit',modelAssessment:{complete:true,modelFlagged:true,maternityContributorChains:3,reasons:[]}};
 assert.match(view.mainReason(item),/registration and wage changes preceded maternity requests/);
 item.modelAssessment.maternityContributorChains=0;item.modelAssessment.reasons=['3 contributors show a login → profile update → IBAN change → request sequence within 24 hours.'];
 assert.match(view.mainReason(item),/maternity request/);assert.doesNotMatch(view.mainReason(item),/SANED/);
});

test('shared decision breakdown exposes saved contributions without recomputing model outputs',async()=>{
 const {createCrossJourneyAssessment,demoCases}=await import('../lib/cross-journey-adapter.mjs');
 const item=createCrossJourneyAssessment(demoCases[1],{ruleScore:55,behavioralInputs:behavioral}).caseData,before=JSON.stringify(item);
 const breakdown=view.decisionBreakdown(item);assert.equal(breakdown.complete,true);assert.equal(breakdown.score,item.score);
 assert.deepEqual(breakdown.components.map(c=>c.points),[item.scoringComponents.controlContribution,item.scoringComponents.anomalyContribution,item.scoringComponents.patternAdjustment]);
 assert.equal(breakdown.confidence.label,item.dataQuality.label);assert.equal(JSON.stringify(item),before);
 const incomplete={...item,decisionComplete:false,score:75,scoringComponents:null,decisionIssue:'Existing control score is missing.'};
 assert.equal(view.score(incomplete).value,null);assert.equal(view.decisionBreakdown(incomplete).complete,false);assert.deepEqual(view.decisionBreakdown(incomplete).components,[]);assert.match(view.decisionBreakdown(incomplete).notes[0],/control score/);
});
test('decision explanation distinguishes the critical-control floor and required-review guard',()=>{
 const base={assessmentMode:'hybrid',decisionComplete:true,score:75,risk:'High',scoringComponents:{controlScore:90,controlWeight:55,controlContribution:49.5,anomalyScore:20,anomalyWeight:45,anomalyContribution:9,patternAdjustment:0,approvedPatterns:[],controlFloor:75}};
 assert.match(view.decisionBreakdown(base).notes.join(' '),/at least 75/);
 const guard={...base,score:29,risk:'Medium',scoringComponents:{...base.scoringComponents,controlFloor:0}};
 assert.match(view.decisionBreakdown(guard).notes.join(' '),/requires review/);
 assert.equal(view.decisionBreakdown({assessmentSource:'rules-demo',ruleScore:85}),null);
});

test('missing login dates and times stay explicit when native inference reports generic incomplete evidence',()=>{
 for(const field of ['loginDate','loginTime']){
  const item={assessmentSource:'journey-prototype',primaryReason:'Required workforce or event evidence is missing.',accessEvidence:{loginDate:'2026-11-05',loginTime:'09:42',[field]:null},modelAssessment:{complete:false}};
  const before=JSON.stringify(item);assert.match(view.mainReason(item),new RegExp('login '+(field==='loginDate'?'date':'time')+' is missing'));assert.equal(JSON.stringify(item),before);
 }
});
