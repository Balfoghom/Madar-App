import {readFile,writeFile,rename,chmod,unlink} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

export function updateLlmEnvironment(text,{model,key}) {
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model)) throw new Error('Enter a valid model ID.');
  if(!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error('Enter the full OpenAI API key. Nothing was saved.');
  let result=text;
  for(const [name,value] of Object.entries({MADAR_LLM_PROVIDER:'openai',MADAR_LLM_MODEL:model,OPENAI_API_KEY:key})) {
    const pattern=new RegExp('^\\s*(?:export\\s+)?'+name+'\\s*=.*$','gm');
    result=result.replace(pattern,'').replace(/\n{3,}/g,'\n\n').trimEnd();
    result+='\n'+name+'='+value+'\n';
  }
  return result.replace(/^\n/,'');
}

function hiddenKey() {
  return new Promise((resolve,reject)=>{
    let value='';
    const input=process.stdin;
    process.stdout.write('OpenAI API key (hidden while you paste): ');
    input.setRawMode(true);input.setEncoding('utf8');input.resume();
    const cleanup=()=>{input.off('data',read);input.setRawMode(false);input.pause();process.stdout.write('\n')};
    const read=chunk=>{
      for(const character of chunk) {
        if(character==='\u0003'){cleanup();reject(new Error('Setup cancelled. Nothing was saved.'));return}
        if(character==='\r'||character==='\n'){cleanup();resolve(value.trim());return}
        if(character==='\u007f'||character==='\b')value=value.slice(0,-1);
        else if(character>=' ' && character<='~')value+=character;
      }
    };
    input.on('data',read);
  });
}

async function main(){
  if(!process.stdin.isTTY) throw new Error('Open Set up Madar LLM.command in Terminal. Key entry requires an interactive terminal.');
  console.log('Madar | مدار — OpenAI setup\nYour key stays in the local, Git-ignored .env file. This setup makes no API call.');
  const prompt=createInterface({input:process.stdin,output:process.stdout});
  const model=(await prompt.question('Model ID [gpt-5.6-terra]: ')).trim() || 'gpt-5.6-terra';prompt.close();
  const key=await hiddenKey();
  const root=fileURLToPath(new URL('..',import.meta.url)),path=join(root,'.env');
  let text='';try{text=await readFile(path,'utf8')}catch(error){if(error.code!=='ENOENT')throw error}
  const updated=updateLlmEnvironment(text,{model,key});
  const temporary=join(root,'.env.setup-'+randomUUID());
  try{await writeFile(temporary,updated,{mode:0o600,flag:'wx'});await rename(temporary,path);await chmod(path,0o600)}finally{await unlink(temporary).catch(()=>{})}
  console.log('\nOpenAI settings saved locally. The key was not printed or sent anywhere.\nRestart Madar, open a saved case in Intelligence Queue and select Explain this case.');
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main().catch(error=>{console.error(error.message);process.exitCode=1});
