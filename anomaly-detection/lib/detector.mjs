import model from '../data/model.json' with { type: 'json' };
export { model };
import {features} from './saned-features.mjs';
import {forestScore} from './isolation-forest.mjs';
export {features};
export {pathCorrection} from './isolation-forest.mjs';
export function scoreVector(x){return forestScore(model,x);}
export function assess(c){
  const x=features(c);
  if(!x) return {modelVersion:model.version,complete:false,route:'Complete evidence',band:'Incomplete',percentile:null,reasons:['Required workforce or event evidence is missing. No model score was produced.'],features:[]};
  const score=scoreVector(x), percentile=100*model.calibrationScores.filter(v=>v<=score).length/model.calibrationScores.length;
  const rules=[];
  if(x[0]>=4)rules.push('Four or more claimant amendments in 30 days');
  if(x[1]>=30)rules.push('Backdating of 30 days or more');
  if(x[3]>=80)rules.push('Wage increase of 80% or more');
  if(x[4]>=35)rules.push('Employer exclusion rate of 35% or more');
  if(x[5]>=20)rules.push('Supervisor change rate of 20% or more');
  const flagged=score>=model.threshold;
  const evidence=x.map((v,i)=>({name:model.features[i],value:i===2?Math.expm1(v):v,median:i===2?Math.expm1(model.referenceMedian[i]):model.referenceMedian[i],low:i===2?Math.expm1(model.referenceP05[i]):model.referenceP05[i],high:i===2?Math.expm1(model.referenceP95[i]):model.referenceP95[i],unusual:v<model.referenceP05[i]||v>model.referenceP95[i]}));
  return {modelVersion:model.version,complete:true,score,percentile,modelFlagged:flagged,ruleFlagged:rules.length>0,ruleReasons:rules,route:rules.length||flagged?'Specialist review':'Standard review',band:rules.length||flagged?'Review':'Typical',features:evidence,reasons:[flagged?'The trained forest finds this combination unusual relative to its synthetic reference population.':'The trained forest did not flag this combination at the selected threshold.',...rules],explanationBoundary:'Feature ranges provide context, not causal explanations or exact model contributions.'};
}
