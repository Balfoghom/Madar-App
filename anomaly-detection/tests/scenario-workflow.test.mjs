import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
test('New Assessment persists reasons and scenario review stages without bypassing review gates', {timeout: 15000}, async () => {
const root=fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const dir=await mkdtemp(join(tmpdir(),'scenario-review-'));
process.env.ASSESSMENT_DATA_DIR=dir;
const {createInferenceServer}=await import(root+'/server.mjs');
let server;
async function start(){server=createInferenceServer();server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;}
let base=await start();
async function post(path,body,expected=200){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;}
const common={synthetic:true,transactionId:'TX-DEMO-REVIEW',journey:'Benefit Payments',scenario:'Repeated payout changes',source:'Manual sandbox input',subject:'SYN-SUBJECT',entity:'SYN-EMPLOYER',ruleScore:45,features:{velocity:2,linkedEntities:2,priorRisk:20,retroDays:0,identityReuse:1,amountChangePct:0,overrides:0,crossSourceConflict:0,missingData:0},primaryCode:'MANUAL_BEHAVIORAL_ASSESSMENT',primaryReason:'Repeated payout changes',journeyFeatures:{requests30d:1,amountDeviationPct:0,payoutAccountChangeDays:365,duplicatePayments:0,sharedBeneficiaries:1}};
try{
 const journeyInputs = {
  'Benefit Payments': common.journeyFeatures,
  'Employer Registration': {amendments30d:2,companyAgeAtChangeDays:365,linkedContactEmployers:1,workforceChangePct:0,backdatedChanges90d:0,sourceConflicts:0},
  Retirement: {contributionMonths:240,gapMonths:0,wageChangePct:0,retroCorrections12m:0,overlapPeriods:0,overlapMonths:0},
  'Maternity Benefit': {contributionMonthsInWindow:12,daysEventToRequest:5,wageChangePct:0,employerTenureDays:365,concurrentClaims:0,retroCorrections12m:0},
  'Contribution & Wage': {materialWageChangeWorkersPct:0,medianWageChangePct:0,payrollDelayDays:0,resubmissions30d:0,retroCorrections90d:0,workersAcrossEmployers:0,reconciliationDeviationPct:0},
 };
 for (const [journey, journeyFeatures] of Object.entries(journeyInputs)) {
   const assessment={...common,id:'NEW-'+journey.replace(/[^A-Za-z0-9]/g, '-'),journey,journeyFeatures};
   const scored=await post('/assess',{assessment});
   assert.equal(scored.complete,true);assert.ok(scored.reasonCodes.length);assert.ok(scored.mainReason);
   const stored=await post('/save-assessment',{assessmentId:scored.assessmentId});
   assert.equal(stored.mainReason,scored.mainReason);assert.ok(stored.reasonCodes.length);
 }
 const seed=JSON.parse(await readFile(join(root,'data','cases.json'),'utf8'))[0];
 const saned=await post('/assess-case',{case:seed,context:{...common,id:seed.id,journey:'SANED'}});
 assert.equal(saned.complete,true);assert.ok(saned.mainReason);assert.equal(saned.caseData.primaryReason,saned.mainReason);
 const raw={...common,id:'NEW-REVIEW-TEST'};
 const model=await post('/assess',{assessment:raw});assert.equal(model.complete,true);
 const item={...raw,...model.businessAssessment,signals:[['MANUAL_BEHAVIORAL_ASSESSMENT',raw.scenario]],aiModel:{version:model.modelVersion,reasons:model.reasons},audit:[]};
 await post('/save-assessment',{assessmentId:model.assessmentId});
 const review={caseId:item.id,role:'Specialist',actorName:'Demo specialist',note:'Evidence reviewed; useful synthetic example.'};
 await post('/scenario-proposals',{...review,action:'submit'},409);
 await post('/outcome',{caseId:item.id,outcome:'Legitimate activity',financialOutcome:'Proceeded',amountAtRisk:0,confirmedFraudAmount:0,preventedAmount:0,note:'Evidence consistent.'});
 let {proposal}=await post('/scenario-proposals',{...review,action:'submit'});assert.equal(proposal.status,'Specialist Review');
 await post('/scenario-proposals',{...review,action:'submit'},409);
 await post('/scenario-proposals',{...review,action:'approve',expectedStatus:'Specialist Review',role:'GM'},409);
 await post('/scenario-proposals',{...review,action:'review',expectedStatus:'Specialist Review',role:'GM'},403);
 ({proposal}=await post('/scenario-proposals',{...review,action:'review',expectedStatus:'Specialist Review'}));assert.equal(proposal.status,'Testing');
 await post('/scenario-proposals',{...review,action:'pass-test',expectedStatus:'Specialist Review',role:'Data & AI'},409);
 for(const [action,role,status] of [['pass-test','Data & AI','GM Approval'],['approve','GM','Approved'],['activate','GM','Active']]){
  ({proposal}=await post('/scenario-proposals',{...review,action,role,expectedStatus:proposal.status}));assert.equal(proposal.status,status);
 }
 assert.equal(proposal.history.length,5);assert.equal(proposal.snapshot.primaryReason,model.mainReason);
 await new Promise(resolve=>server.close(resolve));base=await start();
 const persisted=await(await fetch(base+'/scenario-proposals')).json();assert.equal(persisted.proposals[0].status,'Active');
 const assessments=await(await fetch(base+'/assessments')).json();assert.equal(assessments[0].caseData.scenarioProposal.status,'Active');assert.equal(assessments[0].caseData.primaryReason,model.mainReason);
 assert.ok(assessments[0].caseData.audit.length>=7);
 const data=JSON.parse(await readFile(join(dir,'scenario-proposals.json'),'utf8'));assert.equal(data[0].history[4].role,'GM');
 await post('/demo-reset',{});assert.equal((await(await fetch(base+'/scenario-proposals')).json()).proposals.length,0);

}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}

});
