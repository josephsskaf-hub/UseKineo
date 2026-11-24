import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'
const [rootArg,ref]=process.argv.slice(2)
const root=path.resolve(rootArg),here=path.dirname(fileURLToPath(import.meta.url))
process.chdir(root)
const world=await mundo(root,ref), borders=frontieres(world)
const film=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))[1]
const end=film.script.indexOf('PAYOFF: ')
const mixed={...film,script:film.script.slice(0,end)+'PAYOFF: [Pexels: present-day visitor looking at the restored camera in a modern museum] Today, visitors can see his camera in a museum.'}
const captureResult=await capture(world,borders,mixed,aplicar,'internal',true)
const r={candidate:world.sha,case:'Variante sintética de Le Prince, com último plano expressamente moderno',still:captureResult.textStills[3],dispatch:captureResult.sends.map(s=>({model:s.model,prompt:JSON.parse(s.body).multi_prompt[3].prompt}))}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-hoje.json'),JSON.stringify(r,null,2)+'\n')
console.log(JSON.stringify(r))
assert.ok([r.still,...r.dispatch.map(d=>d.prompt)].every(p=>!/Period setting: (?:1888|1890)/iu.test(p)&&/modern museum/i.test(p)),'Cena presente recebeu a época do trem')
