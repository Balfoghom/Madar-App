import {behavioral} from './fixtures/behavioral.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createCrossJourneyAssessment,demoCases} from '../lib/cross-journey-adapter.mjs';
import {routingPolicy,withRouting} from '../lib/routing-policy.mjs';
import {createWorkspacePortfolio} from '../lib/workspace-demo.mjs';
test('six canonical routes have accountable owners and concrete next steps',()=>{
 assert.equal(routingPolicy.routes.length,6);
 for(const route of routingPolicy.routes){const info=routingPolicy.ownership(route,'SANED');assert.ok(info.owner);assert.ok(info.next.length>30);}
 for(const alias of ['Payment & IBAN Verification','Insurance Operations Audit','Benefit Operations Review','Additional verification'])assert.equal(routingPolicy.normalize(alias),'Eligibility Verification');
});
test('digital model findings propose cybersecurity review without rewriting fitted evidence or human overrides',()=>{
 const records=createWorkspacePortfolio();for(const id of ['009','010','011']){
 const r=createCrossJourneyAssessment(demoCases[Number(id)],{ruleScore:55,behavioralInputs:behavioral});assert.equal(r.caseData.recommendedRoute,'Cybersecurity Review');assert.equal(r.caseData.recommendedOwner,'Cybersecurity');
 const model=structuredClone(r.modelResult),override=structuredClone(r);override.caseData.humanDecision={action:'override',route:'Business Owner Review'};override.caseData.route='Business Owner Review';
 const result=withRouting(override);assert.equal(result.caseData.route,'Business Owner Review');assert.equal(result.caseData.recommendedRoute,'Cybersecurity Review');assert.deepEqual(result.modelResult,model);
 }
});

test('resolved cases retain their recorded route when a newer policy recommends a different route',()=>{
 const data={journey:'SANED',risk:'High',ruleScore:90,route:'Straight-through processing',outcome:'Legitimate activity',features:{},assessmentMode:'hybrid'};
 const resolved=routingPolicy.apply(data);assert.equal(resolved.recommendedRoute,'Fraud Prevention & Inspection Review');assert.equal(resolved.route,'Straight-through processing');
 assert.equal(routingPolicy.apply({...data,outcome:'Suspected fraud — further investigation'}).route,'Fraud Prevention & Inspection Review');
});
