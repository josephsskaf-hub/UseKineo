// Read-only comparison against the immutable starting commit. No checkout/index/working-tree edits.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync, execFileSync } = require('node:child_process')
const ROOT = path.resolve(__dirname,'../..')
const BASE = 'eb505e48d68d0bd72aa5034c927159d70b8291a2'
const tests = ['test-clipes-2026-09-29.mjs','test-studio-series-review.mjs','test-five-improvements.mjs']
if(process.argv[2]==='child') {
  const read=fs.readFileSync
  const cache=new Map()
  fs.readFileSync=function(file,options){
    const absolute=typeof file==='string'?path.resolve(file):''
    const rel=path.relative(ROOT,absolute).replaceAll('\\','/')
    if(rel.endsWith('.env.local'))throw new Error('Reading .env.local is prohibited')
    if(absolute && !rel.startsWith('..') && !rel.startsWith('node_modules/') && /\.(ts|tsx|mjs|json|md|css|yml)$/.test(rel)){
      if(!cache.has(rel)){
        try{cache.set(rel,execFileSync('git',['show',`${BASE}:${rel}`],{cwd:ROOT,stdio:['ignore','pipe','ignore']}))}catch{cache.set(rel,null)}
      }
      const saved=cache.get(rel)
      if(saved){const encoding=typeof options==='string'?options:options?.encoding;return encoding?saved.toString(encoding):Buffer.from(saved)}
    }
    return read.call(fs,file,options)
  }
  require('node:module').syncBuiltinESMExports()
  import(require('node:url').pathToFileURL(path.join(ROOT,'scripts',process.argv[3])).href).catch(e=>{console.error(e);process.exitCode=1})
}else{
  const outcomes=tests.map(test=>{
    const result=spawnSync(process.execPath,[__filename,'child',test],{cwd:ROOT,encoding:'utf8'})
    const text=result.stdout+result.stderr
    const signature=text.match(/(?:AssertionError[^\n]*|Error: semEstreia[^\n]*|ReferenceError[^\n]*)/)?.[0]??text.slice(-500)
    return {test,exit:result.status,signature}
  })
  fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify({base:BASE,checkedAt:new Date().toISOString(),outcomes},null,2)+'\n')
  console.log(JSON.stringify(outcomes,null,2))
  if(outcomes.some(o=>o.exit===0))process.exitCode=1
}
