// KINEO-FILME15-PERFEITO-2610. Runs ALL scripts/test-*.mjs with no credentials, env reads or network.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = path.resolve(process.argv[2] || '.'), out = path.resolve(process.argv[3]);
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(new URL('./offline-guard.cjs', import.meta.url), path.join(out, 'offline-guard.cjs'));
const base = process.argv[4] || '2072944f17eab603bc40fcaa0d576d3b0ce9c78f';
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
env.NODE_OPTIONS = `--require="${path.join(out,'offline-guard.cjs').replaceAll('\\','/')}"`;
env.GIT_TERMINAL_PROMPT = '0'; env.GIT_ALLOW_PROTOCOL = 'file';
const files=fs.readdirSync(path.join(root,'scripts')).filter(f=>/^test-.*\.mjs$/.test(f)).sort();
const risky = file => /\b(?:writeFileSync|appendFileSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmSync|spawnSync|execSync|spawn)\s*\(/.test(fs.readFileSync(path.join(root,'scripts',file),'utf8'));
const sequential=files.filter(risky), parallel=files.filter(f=>!risky(f));
const results=fs.existsSync(path.join(out,'results.json'))?JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')).results.filter(r=>r.status!==null&&!r.error):[]; const completed=new Set(results.map(r=>r.file));
function execute(file){return new Promise(resolve=>{
 const start=Date.now(); let output='', error=null; const run=spawn(process.execPath,[path.join(root,'scripts',file)],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const timer=setTimeout(()=>{error='test timeout';run.kill();},600000);
 run.stdout.on('data',b=>output+=b);run.stderr.on('data',b=>output+=b);
 run.on('error',e=>error=String(e));
 run.on('close',(status,signal)=>{clearTimeout(timer);const result={file,status,error,signal,ms:Date.now()-start};results.push(result);
 fs.writeFileSync(path.join(out,file+'.log'),output);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({root,base,date:new Date().toISOString(),total:files.length,completed:results.length,parallel:parallel.length,sequential:sequential.length,results},null,2));
 if(status!==0)console.log('FAIL '+file+' status='+status+' '+(error??''));if(results.length%25===0)console.log('PROGRESS '+results.length+'/'+files.length);resolve();});
 });}
let index=0;
await Promise.all(Array.from({length:6},async()=>{while(index<parallel.length){const file=parallel[index++];if(!completed.has(file))await execute(file);}}));
console.log('SEQUENTIAL '+sequential.length+' potential-write/child suites');
for(const file of sequential) if(!completed.has(file)) await execute(file);
console.log(JSON.stringify({done:true,total:results.length,failed:results.filter(r=>r.status!==0).map(r=>r.file),out},null,2));

