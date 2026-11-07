import test from 'node:test';import assert from 'node:assert/strict';
import training from '../data/saned-training-records.json' with {type:'json'};
import model from '../data/model.json' with {type:'json'};
import cases from '../data/cases.json' with {type:'json'};
import {trainForest,forestScore} from '../lib/isolation-forest.mjs';
import {features,assess} from '../lib/detector.mjs';
import {hybridPolicy,approvedPatternAdjustments} from '../lib/hybrid-policy.mjs';
import {createApplicationAssessment} from '../lib/assessment-adapter.mjs';
import {explanationEvidence} from '../lib/case-explainer.mjs';
test('custom JavaScript model is reproducibly trained on exactly 96 synthetic SANED histories with 80 trees',()=>{
 assert.equal(training.length,96);assert.equal(new Set(training.map(r=>r.id)).size,96);assert.ok(training.every(c=>c.synthetic&&features(c)));
 assert.equal(model.trainCount,96);assert.equal(model.trees.length,80);assert.equal(model.maxSamples,96);assert.equal(model.implementationLanguage,'JavaScript');
 assert.deepEqual(trainForest(training.map(features),{treeCount:80,seed:model.seed}),model.trees);
});
test('isolation path normalization handles unsplittable populations and rejects invalid vectors',()=>{
 const rows=Array.from({length:96},()=>[1,1]);const constant={features:['a','b'],maxSamples:96,trees:trainForest(rows)};
 assert.ok(Math.abs(forestScore(constant,[1,1])-.5)<1e-12);assert.throws(()=>forestScore(constant,[1,NaN]),/numeric/);assert.throws(()=>trainForest([[1],[NaN]]),/numeric/);
});
test('hybrid review score uses raw anomaly score, supplied control score and critical control protection',()=>{
 const result={complete:true,score:.4,percentile:99,features:[],modelFlagged:false,ruleFlagged:false};
 const base=hybridPolicy({ruleScore:20,features:{}},result);assert.equal(base.score,29);assert.equal(base.scoringComponents.anomalyScore,40);assert.equal(base.scoringComponents.patternAdjustment,0);
 assert.equal(hybridPolicy({ruleScore:20,features:{}},{...result,percentile:0}).score,base.score);
 const strong=hybridPolicy({ruleScore:90,features:{}},result);assert.equal(strong.score,75);assert.equal(strong.risk,'High');
 assert.equal(hybridPolicy({ruleScore:90},{complete:false}).score,null);
});
test('only reviewed approved catalog patterns can contribute an adjustment',()=>{
 const result={features:[{value:3},{value:20}]};
 const pattern={code:'TEST_PATTERN',description:'Synthetic test approval only',points:8,status:'Approved',approvedBy:'Test reviewer',approvedAt:'2026-11-07T00:00:00Z',conditions:[{feature:'amendments30d',operator:'gte',value:2},{feature:'backdatingDays',operator:'gte',value:7}]};
 assert.equal(approvedPatternAdjustments(result,[pattern])[0].points,8);
 for(const change of [{status:'Proposed'},{status:'Active'},{approvedBy:''},{approvedAt:''},{points:Infinity},{conditions:[{feature:'outcome',operator:'gte',value:1}]}])assert.equal(approvedPatternAdjustments(result,[{...pattern,...change}]).length,0);
 assert.equal(approvedPatternAdjustments(result,[{...pattern,conditions:[{feature:'amendments30d',operator:'gte',value:8}]}]).length,0);
});
test('SANED explainability includes hybrid components, evidence quality and review route without accepting imported adjustments',()=>{
 const context={id:'NEW-hybrid-test',synthetic:true,transactionId:'HYBRID-1',journey:'SANED',scenario:'Custom SANED inference',ruleScore:20,features:{},modelInput:{case_id:cases[2].id},approvedPatterns:[{points:100,status:'Approved'}],interaction:100};
 const record=createApplicationAssessment(context);assert.equal(record.caseData.interaction,0);assert.equal(record.caseData.scoringComponents.patternAdjustment,0);
 assert.equal(record.modelResult.score,assess(cases[2]).score);assert.equal(record.caseData.assessmentMode,'saned-hybrid');assert.ok(record.reasonCodes.some(r=>r.code==='HYBRID_SCORE_COMPONENTS'));
 assert.equal(record.caseData.confidence,record.caseData.dataQuality.label);assert.ok(record.caseData.recommendedRoute);
 assert.ok(explanationEvidence(record).facts.some(f=>f.id==='hybrid-decision'));
});
