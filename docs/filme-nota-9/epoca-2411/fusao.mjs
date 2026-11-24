import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'
import {BASE} from './versoes.mjs'
const [rootArg,ref]=process.argv.slice(2),root=path.resolve(rootArg),here=path.dirname(fileURLToPath(import.meta.url))
process.chdir(root)
const world=await mundo(root,ref),bo=frontieres(world)
const cases=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8')).slice(0,3)
const dates={cooper:['1971','1971','1971','1971'],leprince:['1888','1890','1890','1890'],slocum:['before 1909','before 1909','1909','1909']}
const out=[]
for(const f of cases) for(const groups of [[[0],[1],[2,3]],[[0,1],[2],[3]],[[0],[1,2],[3]]]) {
  const cap=await capture(world,bo,{...f,groups},aplicar,'internal',true)
  for(let i=0;i<3;i++){
    const sceneDate=dates[f.id][groups[i][0]]
    assert.ok(cap.textStills[i].includes('Period setting: '+sceneDate+','),f.id+' still '+i)
  }
  for(const req of cap.sends) {
    const p=JSON.parse(req.body).multi_prompt
    assert.equal(p.length,4)
    p.forEach((s,i)=>assert.ok(s.prompt.includes('Period setting: '+dates[f.id][i]+','),f.id+' '+req.model+' '+(i+1)+' deveria '+dates[f.id][i]))
  }
  out.push({film:f.id,groups,models:cap.sends.map(r=>r.model),dates:dates[f.id]})
}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-fusao.json'),JSON.stringify({base:BASE,candidate:world.sha,groups:out},null,2)+'\n')
console.log('9 fusões, 27 pedidos locais, 108 planos: época conferida até o transporte')
