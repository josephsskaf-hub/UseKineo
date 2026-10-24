const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=process.argv[2],base='dd0abba8cc711be4bde2faaac39f0aef29f3f90d',integration='8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405',previous='b01cfe2cb2d9f244df0ee22baa649daa8d6103fe',target='scripts/test-support/desfaz-idiomas-formatos-2410-fontes.json';
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).replace(/\r\n/g,'\n');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const old=JSON.parse(git('show',previous+':'+target));
const names=[...new Set([...git('diff','--name-only',integration).trim().split('\n'),...git('ls-files','--others','--exclude-standard').trim().split('\n')])].filter(Boolean).sort();
const sources={},newFiles=[],artifacts=[],overlaps=[];
for(const file of names){
 if(file.startsWith('docs/')){artifacts.push(file);continue;}
 let integratedBefore;try{integratedBefore=git('show',integration+':'+file);}catch{newFiles.push(file);continue;}
 const original=old.sources[file],before=original?.before??integratedBefore;
 const after=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
 const diff=git('diff','--unified=0',integration,'--',file);
 const evidence=[...new Set(diff.split('\n').filter(s=>s.startsWith('+')&&!s.startsWith('+++')).map(s=>s.slice(1).replace(/\/\/.*$/u,'').trim()).filter(s=>s.length>=15&&!integratedBefore.includes(s)))];
 const entry={before,beforeHash:hash(before),afterHash:hash(after),evidence};
 if(original){if(before!==git('show',base+':'+file)||original.beforeHash!==entry.beforeHash)throw Error('original immutable source drift '+file);entry.originalAfterHash=hash(git('show',previous+':'+file));}
 else entry.sourceBase=integration;
 if(before!==integratedBefore){entry.integratedBefore=integratedBefore;entry.integratedBeforeHash=hash(integratedBefore);overlaps.push(file);}
 sources[file]=entry;
}
const expected=['.github/workflows/guardiao.yml','scripts/test-ads-escolha-publico-2410.mjs','scripts/test-support/desfaz-ads-escolha-publico-2410.mjs'].sort();
if(JSON.stringify(overlaps.sort())!==JSON.stringify(expected))throw Error('Unexpected overlap '+JSON.stringify(overlaps));
fs.writeFileSync(path.join(root,target),JSON.stringify({base,integration:{base:integration,previous},sources,newFiles,artifacts},null,2)+'\n');
console.log(JSON.stringify({sourceCount:Object.keys(sources).length,newFiles:newFiles.length,artifacts:artifacts.length,overlaps,integrationOnlySources:Object.entries(sources).filter(([,r])=>r.sourceBase).map(([f])=>f)}));
