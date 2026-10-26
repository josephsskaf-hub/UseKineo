// Generates an exact in-memory undo against the task's immutable main baseline.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),base='46fa10e58fced6430e0a2ba7bb445bb8905bd2e7';
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8e6}).replace(/\r\n/g,'\n');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const changed=git('diff','--name-status',base,'HEAD','--','app','components','lib').trim().split('\n').filter(Boolean).map(line=>line.split('\t'));
const scope={},newRuntimeFiles=[];
for(const [status,file] of changed){
 if(status==='A'){newRuntimeFiles.push(file);continue;}
 if(status!=='M')throw new Error('Unexpected source operation '+status+' '+file);
 const before=git('show',base+':'+file),after=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
 const patch=git('diff','--no-ext-diff','--unified=6',base,'HEAD','--',file).split('\n');
 const hunks=[];let current=null,evidence=[];
 for(const line of patch){
  if(line.startsWith('@@ ')){if(current)hunks.push(current);current={header:line,before:'',after:''};continue;}
  if(!current)continue;
  const prefix=line[0];if(prefix===' '||prefix==='-')current.before+=line.slice(1)+'\n';
  if(prefix===' '||prefix==='+')current.after+=line.slice(1)+'\n';
  if(prefix==='+'&&/filmComplete|film_complete|film15_|FullVersion|fullVersionOffer|fullFilm|FILM_COMPLETE|film-complete/.test(line)&&!before.includes(line.slice(1).trim()))evidence.push(line.slice(1).trim());
 }
 if(current)hunks.push(current);
 let restored=after;
 for(const h of hunks){if(restored.split(h.after).length!==2)throw new Error('Non-unique undo hunk '+file+' '+h.header);restored=restored.replace(h.after,()=>h.before);}
 if(restored!==before)throw new Error('Undo does not restore exact source '+file);
 if(!evidence.length)throw new Error('Missing layer evidence '+file);
 scope[file]={beforeSha256:sha(before),afterSha256:sha(after),evidence:[...new Set(evidence)].slice(0,8),hunks};
}
const manifest={task:'KINEO-UPSELL-FILME15-2610',base,newRuntimeFiles,scope};
fs.writeFileSync(path.join(root,'scripts/test-support/desfaz-upsell-filme15-2610-hunks.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Exact upsell undo: '+Object.keys(scope).length+' modified sources, '+newRuntimeFiles.length+' new runtime files; LF SHA-256 verified');
