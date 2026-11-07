import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {seededRandom,trainForest,forestScore} from '../lib/isolation-forest.mjs';
import {features} from '../lib/saned-features.mjs';
const out=new URL('../data/',import.meta.url),DAY=86400000,HOUR=3600000,T=1792022400000;
export function generateHistory(index,family,split,random){
 const id=`SYN-${split}-${String(index).padStart(5,'0')}`,workforce=80+Math.floor(random()*321),events=[];
 let amendments=Math.floor(random()*4),retro=Math.floor(random()*9),hours=24+random()*576,wage=-8+random()*26,rate=random()*8,actor=random()*5;
 if(family==='retroactive'){amendments=5+Math.floor(random()*5);retro=40+random()*60;hours=1+random()*9;}
 if(family==='wage'){wage=85+random()*95;amendments=Math.max(1,amendments);}
 if(family==='coordinated'){amendments=3;retro=15+random()*13;hours=1+random()*7;rate=14+random()*11;actor=8+random()*8;wage=25+random()*30;}
 if(family==='legitimate_surge')rate=20+random()*22;
 const add=(type,ago,extra={})=>events.push({type,recordedAt:T-ago*HOUR,subject:id,...extra});
 add('wage',120*24,{amount:6000});add('wage',8*24,{amount:Math.round(6000*(1+wage/100)*100)/100});
 for(let j=0;j<amendments;j++)add('amendment',hours+j*3,{effectiveAt:T-(hours+j*3)*HOUR-retro*DAY});
 for(let j=0;j<Math.round(rate*workforce/100);j++)add('employer_exclusion',1+random()*166,{subject:`SYN-${split}-${index}-peer-${j}`});
 for(let j=0;j<Math.round(actor*workforce/100);j++)add('supervisor_change',1+random()*22,{subject:`SYN-${split}-${index}-peer-${j}`});
 add('claim',0);return {id,synthetic:true,asOf:T,workforce,events:events.sort((a,b)=>a.recordedAt-b.recordedAt),family,split};
}
const quantile=(values,q)=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*q)];};
const population=(n,split,seed,choose)=>{const random=seededRandom(seed);return Array.from({length:n},(_,i)=>generateHistory(i,choose(i),split,random));};
const training=population(96,'custom-train',20261108,i=>i%16===0?'legitimate_surge':'routine');
const calibration=population(800,'custom-calibration',20261109,i=>i%16===0?'legitimate_surge':'routine');
const vectors=training.map(features),model={version:'saned-custom-js-if-96x80-v1',algorithm:'Custom Isolation Forest (JavaScript)',implementationLanguage:'JavaScript',seed:20261108,syntheticOnly:true,features:['Amendments in 30 days','Maximum backdating (days)','Hours since last amendment','Wage change (%)','Employer exclusions / 100 workers','Supervisor changes / 100 workers'],trainCount:96,calibrationCount:800,maxSamples:96,trees:trainForest(vectors,{treeCount:80,seed:20261108}),trainingSource:'96 fully synthetic SANED behavioral histories generated with a fixed seed; IDs and labels excluded from features.'};
model.calibrationScores=calibration.map(c=>forestScore(model,features(c))).sort((a,b)=>a-b);model.threshold=quantile(model.calibrationScores,.97)+1e-10;
for(const [key,q] of [['referenceMedian',.5],['referenceP05',.05],['referenceP95',.95]])model[key]=model.features.map((_,i)=>quantile(vectors.map(v=>v[i]),q));
const test=population(600,'custom-test',20261110,i=>i<240?'routine':i<300?'legitimate_surge':i<400?'retroactive':i<500?'wage':'coordinated');
const rows=test.map(c=>({id:c.id,family:c.family,expectedReview:['retroactive','wage','coordinated'].includes(c.family),features:features(c),referenceScore:forestScore(model,features(c))}));
const metrics=p=>{const counts={tp:0,fp:0,fn:0,tn:0};rows.forEach((r,i)=>counts[r.expectedReview?(p[i]?'tp':'fn'):(p[i]?'fp':'tn')]++);return {...counts,precision:counts.tp/Math.max(1,counts.tp+counts.fp),recall:counts.tp/Math.max(1,counts.tp+counts.fn),falsePositiveRate:counts.fp/Math.max(1,counts.fp+counts.tn)};};
const rules=rows.map(({features:x})=>x[0]>=4||x[1]>=30||x[3]>=80||x[4]>=35||x[5]>=20),ml=rows.map(r=>r.referenceScore>=model.threshold),raw=JSON.stringify(model);
const report={modelVersion:model.version,artifactSha256:createHash('sha256').update(raw).digest('hex'),validation:'Custom JavaScript Isolation Forest; synthetic prototype only; real-data and business validation required.',train:96,calibration:800,test:600,normal:300,review:300,threshold:model.threshold,thresholdMethod:'97th percentile of a separate synthetic legitimate calibration population',splitMethod:'Disjoint synthetic IDs and independent fixed seeds for training, calibration and holdout; labels excluded from inputs.',metrics:{'Rules only':metrics(rules),'Isolation Forest only':metrics(ml),'Rules + Isolation Forest':metrics(ml.map((v,i)=>v||rules[i]))},byScenario:{}};
for(const family of new Set(rows.map(r=>r.family))){const indexes=rows.flatMap((r,i)=>r.family===family?[i]:[]);report.byScenario[family]={count:indexes.length,mlFlagged:indexes.filter(i=>ml[i]).length,ruleFlagged:indexes.filter(i=>rules[i]).length};}
for(const [name,data] of [['model.json',raw],['saned-training-records.json',JSON.stringify(training)],['evaluation.json',JSON.stringify(report,null,2)],['evaluation-cases.json',JSON.stringify(rows)],['parity-fixtures.json',JSON.stringify(test.filter((_,i)=>i%17===0).map(c=>({case:c,features:features(c),score:forestScore(model,features(c))}))) ]])await writeFile(new URL(name,out),data+'\n');
// The fingerprint covers the exact saved bytes, including the final newline.
report.artifactSha256=createHash('sha256').update(raw+'\n').digest('hex');await writeFile(new URL('evaluation.json',out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
