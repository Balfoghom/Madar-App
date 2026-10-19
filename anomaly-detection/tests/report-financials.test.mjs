import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../../dist/app.js',import.meta.url),'utf8');
const helpers=runInNewContext(source.slice(source.indexOf('function formatSar('),source.indexOf('function showToast('))+';({financialPortfolio,formatSar});');
test('reports distinguish missing transaction and exposure values from a supplied zero',()=>{
 const missing={risk:'Medium',transactionAmount:null,amountAtRisk:null};
 const zero={risk:'Medium',transactionAmount:0,amountAtRisk:0};
 const known={risk:'High',transactionAmount:100,amountAtRisk:60};
 assert.equal(helpers.financialPortfolio([missing]).assessedAmount,null);
 assert.equal(helpers.financialPortfolio([missing,known]).amountAtRisk,null);
 assert.equal(helpers.financialPortfolio([zero,known]).amountAtRisk,60);
 assert.equal(helpers.financialPortfolio([zero]).assessedAmount,0);
 assert.equal(helpers.formatSar(null),'Not supplied');
 assert.equal(helpers.financialPortfolio([]).assessedAmount,0);
});
