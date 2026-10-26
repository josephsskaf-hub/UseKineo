import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
const root=process.argv[2], out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,''));
const templateDir=decodeURIComponent(out),outDir=process.argv[3]??templateDir,guard=path.join(templateDir,'offline-guard.cjs');
fs.mkdirSync(path.join(outDir,'logs'),{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32<<20}).replace(/\r\n/g,'\n');
const tests=[];for(const f of fs.readdirSync(path.join(root,'scripts')))if(/^test-.*\.mjs$/.test(f))tests.push('scripts/'+f);
function docsWalk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())docsWalk(file);else if(/^test.*\.mjs$/.test(e.name))tests.push(file)}}docsWalk('docs');tests.sort();
if(process.argv[5]){const selected=new Set(JSON.parse(fs.readFileSync(process.argv[5],'utf8')));for(let i=tests.length-1;i>=0;i--)if(!selected.has(tests[i]))tests.splice(i,1)}
const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:process.env.TEMP,TMP:process.env.TMP,COMSPEC:process.env.COMSPEC,PATHEXT:process.env.PATHEXT,LOCALAPPDATA:process.env.LOCALAPPDATA,USERPROFILE:process.env.USERPROFILE,NODE_OPTIONS:'--require='+JSON.stringify(guard),NO_COLOR:'1',GIT_ALLOW_PROTOCOL:'file',GIT_TERMINAL_PROMPT:'0',KINEO_PGLITE_PATH:path.join(process.env.TEMP,'kineo-compra-avulsa-sql-2410','node_modules','@electric-sql','pglite')};
const results=fs.existsSync(path.join(outDir,'results.json'))?JSON.parse(fs.readFileSync(path.join(outDir,'results.json'),'utf8')).results:[];
fs.writeFileSync(path.join(outDir,'inventory.json'),JSON.stringify({date:new Date().toISOString(),base:git('rev-parse','HEAD').trim(),tests},null,2));
function save(){
 fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify({date:new Date().toISOString(),root,base:git('rev-parse','HEAD').trim(),total:tests.length,completed:results.length,failed:results.filter(v=>v.status!==0).length,results},null,2));
}
async function run(file){const start=Date.now();return new Promise(resolve=>{
 const child=spawn(process.execPath,[file],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',error=null,timedOut=false;
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;if(output.length>32<<20)child.kill()});
 const timer=setTimeout(()=>{timedOut=true;child.kill()},Number(process.argv[6]??180000));child.on('error',e=>{error=e.code;output+='\nRUNNER_ERROR: '+e.message});
 child.on('close',(status,signal)=>{clearTimeout(timer);const log=String(tests.indexOf(file)+1).padStart(4,'0')+'-'+file.replaceAll('/','__')+'.log';fs.writeFileSync(path.join(outDir,'logs',log),output);results.push({file,status,signal,error,timedOut,ms:Date.now()-start,log});save();if(status!==0)console.log('FAIL '+file+' status='+status+' ms='+(Date.now()-start));if(results.length%25===0)console.log('PROGRESS '+results.length+'/'+tests.length+' failed='+results.filter(v=>v.status!==0).length);resolve()});
})}
const done=new Set(results.map(r=>r.file)),serial=[],parallel=[];
for(const file of tests.filter(f=>!done.has(f))){const source=fs.readFileSync(path.join(root,file),'utf8');(/\b(?:writeFileSync|writeFile|unlinkSync|rmSync|appendFileSync)\s*\(/.test(source)?serial:parallel).push(file)}
let next=0;await Promise.all(Array.from({length:Number(process.argv[4]??2)},async()=>{while(next<parallel.length)await run(parallel[next++])}));
for(const file of serial)await run(file);
console.log('COMPLETE '+results.length+' failed='+results.filter(v=>v.status!==0).length);
