// Custom JavaScript Isolation Forest. Training receives numeric vectors only.
export function seededRandom(seed){let state=seed>>>0;return ()=>{state=(state+0x6d2b79f5)>>>0;let v=state;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296;};}
export function pathCorrection(n){return n<=1?0:n===2?1:2*(Math.log(n-1)+0.5772156649015329)-2*(n-1)/n;}
export function trainForest(rows,{treeCount=80,seed=20261108}={}){
 if(!Array.isArray(rows)||rows.length<2||rows.some(r=>!Array.isArray(r)||r.length!==rows[0].length||!r.every(Number.isFinite)))throw new TypeError('Supply complete numeric training vectors.');
 const random=seededRandom(seed),limit=Math.ceil(Math.log2(rows.length));
 return Array.from({length:treeCount},()=>{
  const tree={left:[],right:[],feature:[],threshold:[],samples:[]};
  function grow(sample,depth){
   const node=tree.left.length;tree.left.push(-1);tree.right.push(-1);tree.feature.push(-1);tree.threshold.push(0);tree.samples.push(sample.length);
   if(sample.length<=1||depth>=limit)return node;
   const ranges=sample[0].map((_,i)=>[Math.min(...sample.map(r=>r[i])),Math.max(...sample.map(r=>r[i]))]);
   const choices=ranges.map((r,i)=>r[1]>r[0]?i:-1).filter(i=>i>=0);if(!choices.length)return node;
   const feature=choices[Math.floor(random()*choices.length)], [min,max]=ranges[feature],threshold=min+random()*(max-min);
   const left=sample.filter(r=>r[feature]<=threshold),right=sample.filter(r=>r[feature]>threshold);if(!left.length||!right.length)return node;
   tree.feature[node]=feature;tree.threshold[node]=threshold;tree.left[node]=grow(left,depth+1);tree.right[node]=grow(right,depth+1);return node;
  }
  grow(rows,0);return tree;
 });
}
export function forestScore(model,vector){
 if(!Array.isArray(vector)||vector.length!==model.features.length||!vector.every(Number.isFinite))throw new TypeError('Supply the complete numeric feature vector.');
 const paths=model.trees.map(t=>{let node=0,depth=0;while(t.left[node]!==-1){node=vector[t.feature[node]]<=t.threshold[node]?t.left[node]:t.right[node];depth++;}return depth+pathCorrection(t.samples[node]);});
 return 2**(-paths.reduce((a,b)=>a+b,0)/paths.length/pathCorrection(model.maxSamples));
}
