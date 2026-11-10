// Offline, read-only comparison. No checkout, credentials or production I/O.
const fs=require('node:fs'),path=require('node:path'),{spawnSync,execFileSync}=require('node:child_process')
const ROOT=path.resolve(__dirname,'../..'),BASE='f59d53882be6db18a0f1f96f9915cf3587621120'
const tests=['test-clipes-2026-09-29.mjs','test-studio-series-review.mjs','test-five-improvements.mjs']
if(process.argv[2]==='child'){
  const original=fs.readFileSync,cache=new Map(),useBase=process.argv[3]==='base'
  fs.readFileSync=function(file,options){const abs=typeof file==='string'?path.resolve(file):'',rel=path.relative(ROOT,abs).replaceAll('\\','/');if(rel.endsWith('.env.local'))throw Error('Reading .env.local is prohibited');if(useBase&&abs&&!rel.startsWith('..')&&!rel.startsWith('node_modules/')&&/\.(ts|tsx|mjs|json|md|css|yml)$/.test(rel)){if(!cache.has(rel)){try{cache.set(rel,execFileSync('git',['show',BASE+':'+rel],{cwd:ROOT,stdio:['ignore','pipe','ignore']}))}catch{cache.set(rel,null)}}const saved=cache.get(rel);if(saved){const encoding=typeof options==='string'?options:options?.encoding;return encoding?saved.toString(encoding):Buffer.from(saved)}}return original.call(fs,file,options)}
  require('node:module').syncBuiltinESMExports()
  import(require('node:url').pathToFileURL(path.join(ROOT,'scripts',process.argv[4])).href).catch(e=>{console.error(e);process.exitCode=1})
}else{
  const outcomes=tests.map(test=>{const results={};for(const mode of ['base','candidate']){const r=spawnSync(process.execPath,[__filename,'child',mode,test],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});const output=r.stdout+r.stderr;results[mode]={exit:r.status,signature:output.match(/(?:AssertionError[^\n]*|Error: semEstreia[^\n]*|ReferenceError[^\n]*)/)?.[0]??output.slice(-300)}}return{test,...results,same:results.base.exit===results.candidate.exit&&results.base.signature===results.candidate.signature}})
  fs.writeFileSync(path.join(__dirname,'publication-baseline.json'),JSON.stringify({date:'2026-11-10',base:BASE,outcomes},null,2)+'\n');console.log(JSON.stringify(outcomes,null,2));if(outcomes.some(o=>!o.same))process.exitCode=1
}
