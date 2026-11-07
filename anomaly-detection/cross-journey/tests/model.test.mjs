import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import cases from "../data/demo-cases.json" with { type: "json" };
import evaluation from "../data/evaluation.json" with { type: "json" };
import evaluationCases from "../data/evaluation-cases.json" with { type: "json" };
import fixtures from "../data/parity-fixtures.json" with { type: "json" };
import { assess, extractFeatures, model, scoreVector } from "../inference/detector.mjs";

test("model artifact matches its evaluation fingerprint", () => {
  const digest = createHash("sha256")
    .update(readFileSync(new URL("../data/model.json", import.meta.url)))
    .digest("hex");
  assert.equal(digest, evaluation.artifactSha256);
});

test("JavaScript feature extraction and scoring match Python fixtures", () => {
  for (const fixture of fixtures) {
    const vector = extractFeatures(fixture.case);
    vector.forEach((value, index) => assert.ok(Math.abs(value - fixture.features[index]) < 1e-9));
    assert.ok(Math.abs(scoreVector(vector) - fixture.score) < 1e-10);
  }
});

test("all held-out scores reproduce Python and the model metrics", () => {
  const counts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const caseResult of evaluationCases) {
    const score = scoreVector(caseResult.features);
    assert.ok(Math.abs(score - caseResult.pythonScore) < 1e-10);
    const flagged = score >= model.threshold;
    const key = caseResult.expectedReview
      ? flagged ? "tp" : "fn"
      : flagged ? "fp" : "tn";
    counts[key] += 1;
  }
  const expected = evaluation.metrics["Cross-journey pattern model only"];
  for (const key of Object.keys(counts)) assert.equal(counts[key], expected[key]);
});

test("proof case links one employer and contributors across three journeys", () => {
  const proof = cases.find((caseRecord) => caseRecord.family === "coordinated_claim_sequence");
  assert.deepEqual(
    [...new Set(proof.events.map((event) => event.journey))].sort(),
    ["Contribution & Wage", "Employer Registration", "SANED"],
  );
  assert.equal(new Set(proof.events.map((event) => event.employerId)).size, 1);
  const subjects = new Set(proof.events.map((event) => event.subjectId));
  assert.equal(subjects.size, 3);
  for (const subject of subjects) {
    assert.ok(new Set(proof.events.filter((event) => event.subjectId === subject).map((event) => event.journey)).size >= 3);
  }
});

test("proof case is found by the trained model while comparator rules remain quiet", () => {
  const result = assess(cases.find((caseRecord) => caseRecord.family === "coordinated_claim_sequence"));
  assert.equal(result.modelFlagged, true);
  assert.equal(result.ruleFlagged, false);
  assert.equal(result.route, "Specialist review");
  assert.equal(result.involvedJourneys.length, 3);
});

test("future events cannot leak into assessment", () => {
  const routine = structuredClone(cases.find((caseRecord) => caseRecord.family === "routine"));
  const before = assess(routine).score;
  routine.events.push({
    eventId: "EVT-FUTURE",
    journey: "Contribution & Wage",
    type: "wage",
    recordedAt: routine.asOf + 1,
    subjectId: routine.events[0].subjectId,
    employerId: routine.employerId,
    previousAmount: 6000,
    amount: 600000,
    sourceConflict: false,
    ruleOverride: false,
  });
  assert.equal(assess(routine).score, before);
});

test("array order and descriptive labels do not affect inference", () => {
  const proof = structuredClone(cases.find((caseRecord) => caseRecord.family === "coordinated_claim_sequence"));
  const before = assess(proof).score;
  proof.family = "routine";
  proof.expectedReview = false;
  proof.events.reverse();
  assert.equal(assess(proof).score, before);
});

test("missing linked entity evidence causes abstention", () => {
  const result = assess(cases.find((caseRecord) => caseRecord.family === "missing"));
  assert.equal(result.complete, false);
  assert.equal(result.percentile, null);
  assert.equal(result.route, "Complete evidence");
});

test("Data Intake event CSV carries the assessment time needed for the 30-day window", () => {
  const rows = readFileSync(
    new URL("../data/cross-journey-demo-events.csv", import.meta.url),
    "utf8",
  ).trim().split(/\r?\n/);
  const header = rows[0].split(",");
  const caseIndex = header.indexOf("case_id");
  const assessmentIndex = header.indexOf("assessment_time");
  assert.ok(caseIndex >= 0);
  assert.ok(assessmentIndex >= 0);
  for (const row of rows.slice(1)) {
    const columns = row.split(",");
    assert.match(columns[caseIndex], /^CJ-SYN-demo-/);
    assert.equal(Number(columns[assessmentIndex]),cases.find(c=>c.id===columns[caseIndex]).asOf);
  }
});

test('contributor sequences cannot be assembled from different people or repeated event counts',()=>{
 const proof=structuredClone(cases[1]);const subjects=[...new Set(proof.events.map(e=>e.subjectId))];
 for(const e of proof.events)e.subjectId=subjects[{registration:0,wage:1,exclusion:2,claim:0}[e.type]];
 const result=assess(proof);assert.equal(result.completedContributorChains,0);assert.ok(!result.reasons.some(r=>r.includes('each complete')));
 const repeated=structuredClone(cases[1]);for(const e of repeated.events)e.subjectId=subjects[0];
 assert.equal(assess(repeated).completedContributorChains,1);
 assert.equal(assess(cases[1]).completedContributorChains,3);
});
test('invalid wages and missing or mismatched journeys abstain',()=>{
 for(const mutate of [c=>c.events.forEach(e=>e.journey=''),c=>c.events[0].journey='SANED',c=>c.events.find(e=>e.type==='wage').amount=-100,c=>c.events.find(e=>e.type==='wage').amount=0]){
  const c=structuredClone(cases[1]);mutate(c);const result=assess(c);assert.equal(result.complete,false);assert.equal(result.percentile,null);
 }
});
test('reported journeys use the same evidence window as the model',()=>{
 const c=structuredClone(cases[0]);c.events.push({...c.events[0],type:'payment',journey:'Benefit Payments',recordedAt:c.asOf-31*86400000});
 assert.ok(!assess(c).involvedJourneys.includes('Benefit Payments'));
});

test('digital histories use fitted ML while ordinary travel and account changes remain typical',()=>{
 for(const family of ['account_takeover_sequence','coordinated_iban_network','rapid_profile_payment']){
  const evidence=cases.find(c=>c.family===family),result=assess(evidence);
  assert.equal(result.complete,true);assert.equal(result.modelFlagged,true);assert.equal(result.ruleFlagged,false);
  assert.equal(extractFeatures(evidence).length,25);
 }
 for(const family of ['routine_digital','legitimate_travel','legitimate_account_update'])assert.equal(assess(cases.find(c=>c.family===family)).modelFlagged,false);
});
test('digital sequences are contributor-specific and malformed location/account facts abstain',()=>{
 const base=cases.find(c=>c.family==='account_takeover_sequence');
 const separated=structuredClone(base);separated.events.find(e=>e.type==='profile_update').subjectId='CTR-SYN-other';
 assert.equal(extractFeatures(separated)[21],0);
 const unverified=structuredClone(base);unverified.events.filter(e=>e.type==='login').forEach(e=>e.locationVerified=false);
 assert.equal(extractFeatures(unverified)[18],0);
 const future=structuredClone(base);future.events.push({...future.events.find(e=>e.type==='iban_change'),eventId:'future',recordedAt:base.asOf+1});
 assert.deepEqual(extractFeatures(future),extractFeatures(base));
 for(const change of [e=>{e.events.find(e=>e.type==='login').latitude=120;},e=>{e.events.find(e=>e.type==='iban_change').previousIdentifierId='real-account';},e=>{delete e.events.find(e=>e.type==='profile_update').changedField;}]){
  const invalid=structuredClone(base);change(invalid);assert.equal(assess(invalid).complete,false);
 }
});

test('maternity-only histories are assessed across services without a SANED request',async()=>{
 const {default:incoming}=await import('../data/maternity-intake-cases.json',{with:{type:'json'}});
 for(const c of incoming){assert.ok(!c.events.some(e=>e.type==='claim'));assert.ok(c.events.some(e=>e.type==='maternity'));}
 for(const c of incoming.slice(0,3)){
  const result=assess(c);assert.equal(result.complete,true);assert.equal(result.modelFlagged,true,c.family);
  assert.ok(result.involvedJourneys.includes('Maternity Benefit'));
 }
 for(const c of incoming.slice(3,5)){assert.equal(assess(c).complete,true);assert.equal(assess(c).modelFlagged,false,c.family);assert.equal(assess(c).ruleFlagged,false);}
 assert.equal(assess(incoming[5]).complete,false);assert.equal(assess(incoming[5]).score,undefined);
 const c=structuredClone(incoming[0]);assert.equal(assess(c).maternityContributorChains,3);
 const subjects=[...new Set(c.events.map(e=>e.subjectId))];
 for(const event of c.events)event.subjectId=subjects[{registration:0,wage:1,maternity:2}[event.type]];
 assert.equal(assess(c).maternityContributorChains,0);
});
test('held-out maternity performance includes legitimate comparisons and preserves prior pattern coverage',()=>{
 for(const family of ['maternity_coordinated_wage','maternity_shared_account','maternity_source_conflict','coordinated_claim_sequence','account_takeover_sequence','coordinated_iban_network','rapid_profile_payment']){
  const row=evaluation.byScenario[family];assert.ok(row.aiFlagged/row.count>=.95,family);
 }
 for(const family of ['maternity_routine','maternity_legitimate_account_update']){
  const row=evaluation.byScenario[family];assert.ok(row.aiFlagged/row.count<=.05,family);
 }
});
