import test from 'node:test';
import assert from 'node:assert/strict';
import {updateLlmEnvironment} from '../../scripts/setup-llm.mjs';
test('local LLM setup replaces duplicate configuration while preserving unrelated settings',()=>{
 const output=updateLlmEnvironment('PORT=8090\n# Local host settings\nMADAR_DEMO_PASSWORD=keep-this\nOPENAI_API_KEY=old\nMADAR_LLM_PROVIDER=old\nOPENAI_API_KEY=second\n',{model:'gpt-5-mini',key:'sk-test-only-12345678901234567890'});
 assert.ok(output.includes('MADAR_DEMO_PASSWORD=keep-this'));
 assert.equal((output.match(/^OPENAI_API_KEY=/gm)||[]).length,1);
 assert.ok(output.includes('MADAR_LLM_PROVIDER=openai'));
 assert.throws(()=>updateLlmEnvironment(output,{model:'bad\nPORT=80',key:'sk-test-only-12345678901234567890'}),/valid model/);
 assert.throws(()=>updateLlmEnvironment(output,{model:'gpt-5-mini',key:'not-a-key'}),/Nothing was saved/);
});
