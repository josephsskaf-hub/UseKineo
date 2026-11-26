import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lib = 'lib/juizDoPlano.ts'
const target = 'lib/kling4PlanoDaFala1911.ts'
const historical = process.argv[2] === '--base'
const base = 'd098087c3'
const load = createOfflineLoader({ globals: { setTimeout, clearTimeout, AbortController }, source: (p, s) => historical && [lib, target].includes(p) ? execFileSync('git', ['show', base + ':' + p], {encoding:'utf8'}) : s })
const judge = load('@/' + lib), review = load('@/' + target), {buildKling4TrialInput} = load('@/lib/kling4Trial.ts')
const narrations = ['A bronze bell rests on the shelf.', 'The bronze bell splits the glass tabletop.', 'The fragments settle on the tiles.']
const original = ['A bronze bell rests on a wooden shelf.', 'Overhead light fills a quiet room.', 'Glass fragments settle on the floor tiles.']
const repaired = 'The bronze bell drops through the glass tabletop.'
const entry = {caminho:'kling4_gratis', engine:'kling4', ensaio:true, pedido:narrations.join(' '), seconds:15, verbatim:true, conferirCenaA2:true}
const current = [...original]
const timing = {voiceovers:narrations, wordsPerSecond:2}
const dispatch = () => buildKling4TrialInput(current, [], timing).input.multi_prompt
const shots = () => dispatch().map(p => p.prompt)
const hit = {plano:2, fala:'splits the glass tabletop', visual:'light fills a quiet room'}
const response = candidates => ({
  protagonista:'', planos:[], d_sujeito:'bronze bell', d_sujeito_aparece:'sim',
  d_sujeito_e_pessoa:'nao', e_final_entrega:'sim', e_motivo:'', e_promessa:'', cenas_genericas_a2:candidates,
})
const input = () => ({...entry,cenas:narrations.map((fala,i)=>({fala,prompt:shots()[i]}))})
const answer = async (votes, data=input()) => {
  let calls=0
  const fetchImpl = async (_url, init) => {
    calls++
    const query=JSON.parse(init.body)
    assert.equal(query.n,3)
    if (!historical) {
      const schema=query.response_format.json_schema
      assert.equal(schema.schema.required.includes('cenas_genericas_a2'),!!data.conferirCenaA2)
      assert.equal(query.messages[0].content.includes('THAT narration'),!!data.conferirCenaA2)
    }
    return {ok:true,json:async()=>({choices:votes.map(v=>({message:{content:JSON.stringify(response(v))}}))})}
  }
  const value=await judge.esperarJuizDoPlano(judge.iniciarJuizDoPlano(data,{modo:'observe',apiKey:'synthetic-offline',fetchImpl}))
  assert.equal(value?.status,'JUDGED')
  assert.equal(calls,1)
  return value
}
const indices = verdict => JSON.parse(JSON.stringify(review.secoesAReescrever(verdict,3,3,{planos:shots()})))
assert.deepEqual(indices(await answer([[hit],[hit],[]])),[1],'C2: rewrite the flagged second shot even when the central subject appears earlier')
for (const invalid of [{...hit,plano:1},{...hit,plano:0},{...hit,fala:'unsaid action'},{...hit,visual:'fictional quote'}]) {
  assert.deepEqual(indices(await answer([[invalid],[invalid],[invalid]])),[])
}
assert.deepEqual(indices(await answer([[hit],[],[]])),[])
assert.deepEqual(indices(await answer([[hit],[hit],[hit]],{...input(),conferirCenaA2:false})),[])
const before=dispatch()
const report=await review.revisarPlanosA2({planos:shots,falas:()=>narrations,nSecoes:3,rejulgar:true,
  julgar:()=>answer(current[1]===original[1]?[[hit],[hit],[]]:[[],[],[]]),nomes:async()=>[],
  reescrever:async (targets,note)=>{assert.deepEqual(Array.from(targets),[1]);assert.match(note,/action or location/);current[1]=repaired}
})
const after=dispatch()
assert.deepEqual(Array.from(report.reescritas),[2])
assert.deepEqual(after[0],before[0]);assert.deepEqual(after[2],before[2])
assert(after[1].prompt.includes(repaired));assert(!after[1].prompt.includes(original[1]))
assert.deepEqual(after.map(p=>p.duration),before.map(p=>p.duration))
const route=readFileSync('app/api/generate-video-cinematic/route.ts','utf8')
assert.match(route,/rejulgar: true, julgar: \(p, f\) => julgar\(p, f, true\)/)
assert.match(route,/rejulgar, julgar: \(p, f\) => julgarA2\(p, f, true\)/)
console.log('PASS C2: 2-of-3 same-shot evidence, four invalid pairs, minority, non-A2, review and real 15 s dispatch. Semantic answers simulated.')
