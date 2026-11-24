import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(process.argv[2]||process.cwd())
process.chdir(root)
const base=await mundo(root, process.argv[3]||'c4fd957e65c2c9ec309d3acb562e35febb218c36')
const cases=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))
const sha=text=>createHash('sha256').update(text).digest('hex')
const borders=frontieres(base)
const results=[]
for(const film of cases) {
  const cap=await capture(base,borders,film,s=>s,'off',false)
  results.push({id:film.id,routeSource:[borders.sheet.line,borders.textStill.line,borders.editedStill.line],bodySha:cap.sends.map(t=>sha(t.body)),allSha:sha(JSON.stringify(cap))})
}
assert.equal(results.length,8)
const result={base:base.sha,harness:'7af247b9d006517b91791bf5261f69a7d5219404',captures:results.length*3,results}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-base.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
