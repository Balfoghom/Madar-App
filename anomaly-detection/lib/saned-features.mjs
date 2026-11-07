export function features(c) {
  if(!c || c.synthetic!==true || typeof c.id!=='string' || !c.id.startsWith('SYN-') || !Number.isFinite(c.asOf) || !Number.isInteger(c.workforce) || c.workforce<=0 || !Array.isArray(c.events)) return null;
  const types=['wage','amendment','employer_exclusion','supervisor_change','claim'];
  if(c.events.some(e=>!e || !types.includes(e.type) || !Number.isFinite(e.recordedAt) || typeof e.subject!=='string' || !e.subject.startsWith('SYN-')))return null;
  const es=c.events.filter(e=>Number.isFinite(e.recordedAt)&&e.recordedAt<=c.asOf);
  const am=es.filter(e=>e.type==='amendment'&&e.subject===c.id&&e.recordedAt>=c.asOf-30*86400000);
  const wages=es.filter(e=>e.type==='wage'&&e.subject===c.id).sort((a,b)=>a.recordedAt-b.recordedAt);
  if(!es.some(e=>e.type==='claim'&&e.subject===c.id))return null;
  if(wages.length<2 || wages.some(e=>!Number.isFinite(e.amount)||e.amount<=0) || am.some(e=>!Number.isFinite(e.effectiveAt))) return null;
  const x=[am.length,Math.max(0,...am.map(e=>(e.recordedAt-e.effectiveAt)/86400000)),Math.log1p(am.length?(c.asOf-Math.max(...am.map(e=>e.recordedAt)))/3600000:720),(wages.at(-1).amount/wages.at(-2).amount-1)*100,100*es.filter(e=>e.type==='employer_exclusion'&&e.recordedAt>=c.asOf-7*86400000).length/c.workforce,100*es.filter(e=>e.type==='supervisor_change'&&e.recordedAt>=c.asOf-86400000).length/c.workforce];
  return x.every(Number.isFinite)?x:null;
}
