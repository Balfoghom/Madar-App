import '../../dist/routing-policy.js';
export const routingPolicy=globalThis.MadarRoutingPolicy;
export function withRouting(record){
 if(!record.caseData)return record;
 const caseData=routingPolicy.apply(record.caseData);
 return {...record,caseData,applicationAssessment:{...record.applicationAssessment,route:caseData.recommendedRoute}};
}
