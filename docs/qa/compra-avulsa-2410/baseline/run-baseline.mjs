import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const out=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const workflow=fs.readFileSync('.github/workflows/guardiao.yml','utf8').split('  legacy:')[0];
const cases=[];
for(const line of workflow.split(/\r?\n/)){
 const m=line.match(/\bnode (scripts\/test-[\w-]+\.mjs)(.*)$/); if(!m)continue;
 const tail=m[2].replace(/;.*$/,'').trim();
 cases.push({file:m[1],args:tail?tail.split(/\s+/):[],expected:line.includes('if node ')?'reject':'pass',suite:'critical'});
}
for(const item of ['a','b','c'])for(const mutant of [false,true])cases.push({file:`scripts/test-gpt-5h-${item}-2026-09-24.mjs`,args:mutant?['--mutant']:[],expected:mutant?'reject':'pass',suite:'critical'});
for(const file of ['test-kit-bf-1910','test-kit-bf-venda-2010','test-kids-venda-2010','test-stripe-async-checkout','test-stripe-checkout-failure-truth','test-verified-checkout-purchase','test-checkout-success-entitlement','test-checkout-currency-truth','test-checkout-clareza-1610','test-checkout-honesto-2026-10-07','test-low-balance-pricing-bridge','test-pricing-plan-choice-attribution','test-pricing-diz-a-verdade-2026-09-27'])cases.push({file:`scripts/${file}.mjs`,args:[],expected:'pass',suite:'pertinent'});
const systemNames=['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','ProgramFiles','ProgramFiles(x86)','COMSPEC'];
const env=Object.fromEntries(systemNames.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
env.NODE_OPTIONS=`--require=${path.join(out,'offline-guard.cjs')}`;
const results=[];
function run(test,command,args){const start=Date.now();const result=spawnSync(command,args,{cwd:process.cwd(),env,encoding:'utf8',windowsHide:true,maxBuffer:64<<20,timeout:150000});const ok=test.expected==='reject'?result.status!==0&&result.status!==null:result.status===0;const record={...test,exit:result.status,ok,elapsedMs:Date.now()-start,error:result.error?.message??null};const log=`COMMAND: ${command} ${args.join(' ')}\nEXPECTED: ${test.expected}\nEXIT: ${result.status}\nELAPSED_MS: ${record.elapsedMs}\n${result.stdout??''}${result.stderr??''}`;const filename=String(results.length).padStart(2,'0')+'-'+path.basename(test.file).replace(/\.mjs$/,'')+(test.args?.length?'-'+test.args.join('-').replace(/^-+/, ''):'')+'.log';fs.writeFileSync(path.join(out,filename),log);record.log=filename;results.push(record);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base:'7950e411',date:new Date().toISOString(),node:process.version,results},null,2));console.log(`${ok?'PASS':'FAIL'} ${test.suite}: ${test.file} ${(test.args??[]).join(' ')} exit=${result.status} ms=${record.elapsedMs}`);}
run({file:'typescript-noemit',args:[],expected:'pass',suite:'typecheck'},process.execPath,['../../../node_modules/typescript/lib/tsc.js','--noEmit','--incremental','false']);
for(const test of cases)run(test,process.execPath,[test.file,...test.args]);
console.log(`TOTAL ${results.length}: ${results.filter(x=>x.ok).length} accepted / ${results.filter(x=>!x.ok).length} failed`);
