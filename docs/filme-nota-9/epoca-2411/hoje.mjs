import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'

const [rootArg,ref]=process.argv.slice(2)
const root=path.resolve(rootArg), here=path.dirname(fileURLToPath(import.meta.url))
process.chdir(root)
const prior=await mundo(root,'da221631e5571db63c77b159fe14f1a605220df4')
const next=await mundo(root,ref)
const oldBorders=frontieres(prior), newBorders=frontieres(next)
const film=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))[1]
const end=film.script.indexOf('PAYOFF: ')
const cases=[
  ['controle-museu','present-day visitor looking at the restored camera in a modern museum','Today, visitors can see his camera in a museum.','present day','modern museum'],
  ['museu-com-camera-1888','present-day visitor in a modern museum','Today visitors see the camera made in 1888.','present day','modern museum'],
  ['oficina-historica-relatada-hoje','a man operating the camera in 1888','Today we tell his story.','1888','operating the camera in 1888'],
  ['museu-com-fala-historica','present-day visitor in a modern museum','The inventor made the camera in 1888.','present day','modern museum'],
  ['oficina-historica-com-data-na-fala','a man operating the camera in 1888','Today we show how he operated his camera in 1888.','1888','operating the camera in 1888']
]
function lastShot(c){
  return {narration:c.narration[3],still:c.textStills[3],editedStill:c.editedStills[3],
    dispatch:c.sends.map(s=>({model:s.model,prompt:JSON.parse(s.body).multi_prompt[3].prompt}))}
}
const receipt={candidate:next.sha,previous:prior.sha,cases:[]}
for(const [id,visual,voice,expected,object] of cases){
  const mixed={...film,script:film.script.slice(0,end)+'PAYOFF: [Pexels: '+visual+'] '+voice}
  const before=lastShot(await capture(prior,oldBorders,mixed,aplicar,'internal',true))
  const after=lastShot(await capture(next,newBorders,mixed,aplicar,'internal',true))
  assert.equal(before.narration,voice)
  assert.equal(after.narration,voice,id+' alterou a fala, o objeto ou sua data')
  const texts=[after.still, after.editedStill, ...after.dispatch.map(d=>d.prompt)]
  for(const text of texts){
    assert.ok(text.includes('Period setting: '+expected+','),id+' cenário sem a época pedida: '+text)
    assert.ok(text.toLowerCase().includes(object),id+' perdeu ação ou objeto no plano')
    assert.ok(!text.includes('Period setting: '+(expected==='1888'?'present day':'1888')+','),id+' cenário tem duas épocas')
  }
  receipt.cases.push({id,visual,voice,expected,before,after})
}
const broken=receipt.cases.filter(c=>[c.before.still,...c.before.dispatch.map(s=>s.prompt)].some(t=>!t.includes('Period setting: '+c.expected+','))).map(c=>c.id)
assert.ok(broken.includes('museu-com-camera-1888'),'A prova anterior deveria reproduzir o defeito formal')
if(process.env.REPLAY_SAVE==='1')fs.writeFileSync(path.join(here,'recibo-hoje.json'),JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify({candidate:next.sha,cases:cases.length,badOnPrevious:broken,imagesAndPostsVerified:cases.length*5}))
