import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appendixScoring as scoring} from '../lib/appendix-scoring.mjs';
import {withAppendixAssessment,createWorkspacePortfolio} from '../lib/workspace-demo.mjs';
import {behavioral} from './fixtures/behavioral.mjs';
import business from '../data/business-demo-cases.json' with {type:'json'};

test('Appendix baseline and contribution maxima reproduce the existing business-scenario formula',()=>{
 const median=v=>{const s=v.toSorted((a,b)=>a-b),n=s.length;return n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2;};
 for(const [key,b] of Object.entries(scoring.baseline)){
  const values=business.map(r=>r.features[key]),med=median(values);
  assert.equal(b.median,med);assert.equal(b.mad,median(values.map(v=>Math.abs(v-med)))||Math.max(1,med*.25));
 }
 assert.deepEqual(scoring.defaults.featureWeights,{velocity:18,linkedEntities:14,retroDays:12,priorRisk:12,identityReuse:12,amountChangePct:12,crossSourceConflict:12,overrides:8});
 const result=scoring.calculate({ruleScore:70,country:'Saudi Arabia',features:{...behavioral,velocity:1000000,retroDays:1000000,linkedEntities:1000000,priorRisk:1000000,overrides:1000000,identityReuse:1000000,amountChangePct:1000000,crossSourceConflict:1}});
 assert.equal(result.scoringComponents.behavioralScore,100);
 assert.equal(result.scoringComponents.featureContributions.reduce((s,c)=>s+c.points,0),100);
 assert.equal(result.scoringComponents.patternAdjustment,49);assert.equal(result.score,100);
});
test('Appendix uses whole-number risk bands and a critical-control floor, never a model flag override',()=>{
 for(const [control,expected,risk] of [[0,0,'Low'],[62,34,'Low'],[64,35,'Medium'],[79,43,'Medium'],[80,75,'High'],[100,75,'High']]){
  const r=scoring.calculate({ruleScore:control,features:behavioral,modelAssessment:{score:1,modelFlagged:true}});
  assert.equal(r.score,expected);assert.equal(r.risk,risk);
 }
 const r=scoring.calculate({ruleScore:70,features:{...behavioral,retroDays:10,velocity:3}});
 assert.ok(r.scoringComponents.approvedPatterns.some(p=>p.code==='APPENDIX_PATTERN_RAPID_RETROACTIVE_CHANGE'&&p.points===8));
 const c=r.scoringComponents;assert.equal(r.score,Math.round(70*.55+c.behavioralScore*.45+c.patternAdjustment));
});
test('missing or invalid scoring inputs abstain before applying a critical-control floor; explicit zero is valid',()=>{
 for(const key of scoring.keys)for(const value of [undefined,null,'0',NaN,-1]){
  const r=scoring.calculate({ruleScore:90,features:{...behavioral,[key]:value}});
  assert.equal(r.score,null,key);assert.equal(r.risk,'Incomplete');assert.ok(r.missingBehavioralInputs.includes(key));
 }
 assert.equal(scoring.calculate({ruleScore:0,features:behavioral}).decisionComplete,true);
 assert.equal(scoring.calculate({ruleScore:90,features:behavioral,requiredEvidenceMissing:true}).score,null);
});
test('saved-policy migration preserves model outputs, reviews, outcomes, ownership and recorded routes and is idempotent',()=>{
 for(const source of createWorkspacePortfolio()){
  const legacy=structuredClone(source);legacy.caseData.policy='hybrid-review-55-45-v2';legacy.caseData.score=42;
  legacy.caseData.humanDecision={action:'override',route:'Business Owner Review'};legacy.caseData.route='Business Owner Review';legacy.caseData.recordedRoute='Business Owner Review';legacy.caseData.workflow={stage:'Triage',assignedTo:'Retained owner'};
  const before=structuredClone(legacy),after=withAppendixAssessment(legacy),again=withAppendixAssessment(after);
  for(const key of ['modelResult','reviewHistory','assessmentId'])assert.deepEqual(after[key],before[key],source.caseId+': '+key);
  for(const key of ['modelAssessment','crossJourneyEvidence','reviewHistory','outcome','financialOutcome','preventedAmount','confirmedFraudAmount','humanDecision','workflow','route'])assert.deepEqual(after.caseData[key],before.caseData[key],source.caseId+': '+key);
  assert.deepEqual(again,after);assert.equal(after.caseData.policy,scoring.version);
 }
});
test('the page loads the same shared calculator used by the saved-record policy',async()=>{
 const html=await readFile(new URL('../../dist/index.html',import.meta.url),'utf8'),app=await readFile(new URL('../../dist/app.js',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="appendix-scoring.js')<html.indexOf('src="app.js'));
 assert.match(app,/MadarAppendixScoring.calculate/);
});
