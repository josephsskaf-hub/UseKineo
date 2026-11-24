import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {BASE,HARNESS} from './versoes.mjs'
const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(process.argv[2]||process.cwd())
process.chdir(root)
const base=await mundo(root, BASE)
const cases=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))
const sha=text=>createHash('sha256').update(text).digest('hex')
const borders=frontieres(base)
const results=[]
for(const film of cases) for(const account of [true,false]) {
  const cap=await capture(base,borders,film,s=>s,'off',account)
  results.push({id:film.id,account,admission:cap.admission,models:cap.sends.map(t=>t.model),routeSource:[borders.sheet.line,borders.textStill.line,borders.editedStill.line],bodySha:cap.sends.map(t=>sha(t.body)),allSha:sha(JSON.stringify(cap))})
}
assert.equal(results.length,16)
const result={base:base.sha,harness:HARNESS,captures:results.length*3,results}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-base.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
