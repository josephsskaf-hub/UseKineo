import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import ts from 'typescript'
import {createOfflineLoader} from './test-support/offline-ts-loader.mjs'
import {frontieres} from '../docs/filme-nota-9/epoca-2411/captura.mjs'

const routeFile = 'app/api/generate-video-cinematic/route.ts'
const engineFile = 'lib/kling4Trial.ts'
const source = fs.readFileSync(routeFile, 'utf8')
const load = createOfflineLoader({globals:{AbortSignal}})
const house = load('@/lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
const hash = s => createHash('sha256').update(s).digest('hex')
const names = /\b(?:Metal Sonic|Sonic|Amy Rose)\b/giu
const base = process.argv.find(arg => arg.startsWith('--base='))?.slice(7)
function objectAtBase(file) {
  return execFileSync('git', ['show', base + ':' + file], {encoding:'utf8', maxBuffer:16e6})
}
const baseLoad = base && createOfflineLoader({globals:{AbortSignal},source:(file, text) => file === engineFile ? objectAtBase(file) : text})
const candidate = frontieres({ts,read:()=>source})
const previous = base && frontieres({ts,read:()=>objectAtBase(routeFile)})
const synthetic = {
  pedido: 'Sonic, a blue hedgehog, met Amy Rose, a pink hedgehog. Metal Sonic waits.',
  falas: ['Sonic waits.', 'Amy Rose opens a map.', 'Metal Sonic fixes the bell.'],
  planos: ['Identity: Sonic. Sonic waits in a hallway.', 'Amy Rose opens a map.', 'Metal Sonic fixes the bell.'],
}
const archive = process.argv.find(arg => arg.startsWith('--ensaio='))?.slice(9)
const cases = [['sintetico',synthetic]]
if (archive) {
  const film = JSON.parse(fs.readFileSync(archive,'utf8')).filmes.find(f=>f.gen === 'ac9bb8f8')
  assert.ok(film?.dry_run && film.a2.falas.length === 3 && film.a2.hoje.planos.length === 4)
  for (const key of ['hoje','novo','final']) {
    cases.push(['ac9bb8f8-' + key, {pedido:film.a2.pedido,falas:film.a2.falas,planos:film.a2[key].planos}])
  }
}

async function submit(film, mode, account, shape, old=false) {
  const api = old ? baseLoad : load
  const borders = old ? previous : candidate
  const lib = api('@/lib/cinematic/elencoEFigurino2411')
  const role = !old && borders.v('papelVisual2411').run({
    ...lib, LEITOR_DO_ELENCO_2411:mode, kling4TrialCandidate:true, user:{email:account},
    body:{original_idea:film.pedido}, prompt:film.falas.join('\n'),
  })
  const assemble = borders.v('kling4PorSecao').run({
    papelVisual2411:role, kling4PlanoPorSecao:false, verbatim:true, parsedScript:{segments:[]},
    scenes:film.planos.map(description=>({description})), epocaVisual:null, kling4PlanoVariado:false,
    kling4PlanoFinal:false, garantirSujeitoNoUltimo1911(){}, comSuperficieNoPlano:api('@/lib/cinematic/superficieSemTexto').comSuperficieNoPlano,
  })
  // The archived still records three narration groups but four assembled shots.
  // Use group text only for identity/context. Empty duration weights isolate the final visual payload.
  const timing = {voiceovers:film.planos.map(()=>''), wordsPerSecond:2.7}
  if (shape==='reference') timing.referenciaUnica = {
    imageUrl:'https://fixture.invalid/um', nomes:['Sonic'], frase:'Keep the face and outfit of @Image1.',
    segundo:{imageUrl:'https://fixture.invalid/dois', nomes:['Amy Rose'], frase:'Keep the face and outfit of @Image2.'},
  }
  const event = assemble({prompts:film.planos, approvedStills:shape==='stills'?['https://fixture.invalid/still']:[],timing})
  let out
  await api('@/lib/kling4Trial').submitKling4TrialVideo(event, {
    apiKey:'offline', now:()=>0, fetchImpl:async (url,options)=>{
      out = {model:new URL(url).pathname,body:JSON.parse(options.body)}
      return {ok:true,json:async()=>({request_id:'offline'})}
    },
  })
  return out
}

for (const [id,film] of cases) {
  const voice = hash(film.falas.join('\n'))
  const stats = []
  for (const shape of ['text','stills','reference']) {
    const off = await submit(film,'off',house,shape)
    const external = await submit(film,'internal','outside@example.invalid',shape)
    assert.deepEqual(external,off)
    if (base) assert.deepEqual(off,await submit(film,'off',house,shape,true))
    const actual = await submit(film,'internal',house,shape)
    assert.equal(actual.model,off.model)
    const mask = x => ({...x.body,multi_prompt:x.body.multi_prompt.map(({prompt,...rest})=>rest)})
    assert.deepEqual(mask(actual),mask(off))
    let before = 0
    for(const [i,shot] of actual.body.multi_prompt.entries()) {
      const raw = off.body.multi_prompt[i].prompt
      before += [...raw.matchAll(names)].length
      assert.deepEqual(shot.prompt.match(/@Image\d+/g),raw.match(/@Image\d+/g))
      assert.equal([...shot.prompt.matchAll(names)].length,0)
      assert.ok([...shot.prompt].length <=512)
    }
    assert.ok(before > 0, 'the control must expose a name in ' + id)
    stats.push({shape,shots:actual.body.multi_prompt.length,before,after:0})
  }
  assert.equal(hash(film.falas.join('\n')),voice)
  console.log(JSON.stringify({id,narrationSha256:voice,stats}))
}
const mod = load('@/lib/cinematic/elencoEFigurino2411')
const roles = mod.prepararPapeisVisuais2411(synthetic.pedido,synthetic.falas.join(' '))
assert.equal(roles('Rose watches. Amy Rose joins Sonic.').startsWith('Rose watches.'),true)
assert.equal(roles('Metal Sonic') !== roles('Sonic'),true)
assert.equal(roles('METAL SONIC fixes a radio.'),roles('Metal Sonic fixes a radio.'))
assert.equal(roles('A sonic boom startles Rose.'),'A sonic boom startles Rose.')
const long = 'a'.repeat(488)+' Sonic turns. @Image2'
assert.ok(roles(long).endsWith(' turns. @Image2') && [...roles(long)].length<=512)
assert.equal(mod.prepararPapeisVisuais2411('Mario, an engineer at a tech giant, waits.', 'Mario waits.'),null)
console.log('Replay offline: plano, referências e voz conferidos.')

