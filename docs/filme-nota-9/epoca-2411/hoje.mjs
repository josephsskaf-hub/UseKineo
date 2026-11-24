import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'

import {BASE,OLD_MUSEUM,OLD_OBJECT} from './versoes.mjs'
const [rootArg,ref]=process.argv.slice(2)
const root=path.resolve(rootArg), here=path.dirname(fileURLToPath(import.meta.url))
process.chdir(root)
const prior=await mundo(root,OLD_MUSEUM)
const intermediate=await mundo(root,OLD_OBJECT)
const next=await mundo(root,ref)
const oldBorders=frontieres(prior), intermediateBorders=frontieres(intermediate), newBorders=frontieres(next)
const film=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))[1]
const end=film.script.indexOf('PAYOFF: ')
const cases=[
  ['controle-museu','present-day visitor looking at the restored camera in a modern museum','Today, visitors can see his camera in a museum.','present day','modern museum'],
  ['museu-com-camera-1888','present-day visitor in a modern museum','Today visitors see the camera made in 1888.','present day','modern museum'],
  ['oficina-historica-relatada-hoje','a man operating the camera in 1888','Today we tell his story.','1888','operating the camera in 1888'],
  ['museu-com-fala-historica','present-day visitor in a modern museum','The inventor made the camera in 1888.','present day','modern museum'],
  ['oficina-historica-com-data-na-fala','a man operating the camera in 1888','Today we show how he operated his camera in 1888.','1888','operating the camera in 1888'],
  ['museu-1920-camera-1888','a visitor in a museum in 1920','The inventor made this camera in 1888.','1920','museum in 1920'],
  ['museu-1920-evento-1888','a visitor in the museum in 1920','In 1888 the inventor opens the box.','1920','museum in 1920'],
  ['cena-1935-camera-1888','a restored camera made in 1888','In 1935 a visitor inspects the exhibit.','1935','camera made in 1888'],
  ['decada-compativel','a man in an 1880s suit','In 1888 he turns the camera.','1888','1880s suit'],
  ['somente-data-do-objeto','a camera manufactured in 1888','A visitor inspects the exhibit.',null,'camera manufactured in 1888']
]
function lastShot(c){
  return {narration:c.narration[3],still:c.textStills[3],editedStill:c.editedStills[3],
    dispatch:c.sends.map(s=>({model:s.model,prompt:JSON.parse(s.body).multi_prompt[3].prompt}))}
}
const receipt={base:BASE,candidate:next.sha,previous:prior.sha,intermediate:intermediate.sha,cases:[]}
const neutral='HOOK: [Pexels: a museum visitor] A visitor enters.\n\nMICRO REWARD 1: [Pexels: a glass cabinet] The visitor stops.\n\nMICRO REWARD 2: [Pexels: a wooden box] The box opens.\n\n'
for(const [i,[id,visual,voice,expected,object]] of cases.entries()){
  const beforeWorld=i<5?prior:intermediate, beforeBorders=i<5?oldBorders:intermediateBorders
  const mixed={...film,script:(expected===null?neutral:film.script.slice(0,end))+'PAYOFF: [Pexels: '+visual+'] '+voice}
  const before=lastShot(await capture(beforeWorld,beforeBorders,mixed,aplicar,'internal',true))
  const after=lastShot(await capture(next,newBorders,mixed,aplicar,'internal',true))
  assert.equal(before.narration,voice)
  assert.equal(after.narration,voice,id+' alterou a fala, o objeto ou sua data')
  const texts=[after.still, after.editedStill, ...after.dispatch.map(d=>d.prompt)]
  for(const text of texts){
    const settings=[...text.matchAll(/Period setting:\s*([^,]+),/giu)].map(m=>m[1])
    if(expected===null) assert.equal(settings.length,0,id+' atribuiu época à cena só pela idade do objeto')
    else assert.deepEqual([...new Set(settings)],[expected],id+' época única errada: '+text)
    assert.ok(text.toLowerCase().includes(object),id+' perdeu ação ou objeto no plano')
    const withoutAspect=text.replace(/(?:vertical 9:16 portrait image|taller than wide \(9:16\))/giu,'')
    assert.doesNotMatch(withoutAspect,/\b(?:dawn|dusk|midnight|noon|sunrise|sunset|\d{1,2}:\d{2}(?:\s*[ap]m)?)\b/iu,id+' inventou horário')
  }
  receipt.cases.push({id,visual,voice,expected,beforeSha:beforeWorld.sha,before,after})
}
const broken=receipt.cases.filter(c=>[c.before.still,...c.before.dispatch.map(s=>s.prompt)].some(t=>c.expected===null?t.includes('Period setting:'):!t.includes('Period setting: '+c.expected+','))).map(c=>c.id)
assert.ok(broken.includes('museu-com-camera-1888'),'A prova anterior deveria reproduzir o defeito formal')
assert.ok(broken.includes('museu-1920-camera-1888'),'O museu em 1920 deve reproduzir a segunda volta na revisão f42089850')
if(process.env.REPLAY_SAVE==='1')fs.writeFileSync(path.join(here,'recibo-hoje.json'),JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify({candidate:next.sha,cases:cases.length,badOnPrevious:broken,imagesAndPostsVerified:cases.length*5}))
