const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(process.argv[2]);const output=path.resolve(process.argv[3]);
fs.mkdirSync(output,{recursive:true});
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SystemRoot|WINDIR|ComSpec|TEMP|TMP|PATHEXT|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(k)));
env.NODE_OPTIONS='--require='+path.resolve('.claude/showcase/offline.cjs');
const files=fs.readdirSync(path.join(root,'scripts')).filter(x=>/^test-.*\.mjs$/.test(x)).sort();
const results=[];let next=0;
async function worker(){while(next<files.length){const name=files[next++];await new Promise(resolve=>{
const child=cp.spawn(process.execPath,['scripts/'+name],{cwd:root,env,windowsHide:true});let stdout='',stderr='';
child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
const timer=setTimeout(()=>child.kill(),120000);
child.on('close',(code,signal)=>{clearTimeout(timer);const result={name,code,signal};results.push(result);fs.writeFileSync(path.join(output,name+'.txt'),stdout+'\nSTDERR\n'+stderr);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));if(results.length%50===0)console.log(results.length+'/'+files.length);resolve();});
});}}
Promise.all([worker(),worker(),worker()]).then(()=>console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.code===0).length,failed:results.filter(x=>x.code!==0).length})));
