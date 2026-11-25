import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { aplicar } from '../docs/filme-nota-9/epoca-2411/acoplar.mjs'
import { capture, frontieres } from '../docs/filme-nota-9/epoca-2411/captura.mjs'

const routeFile = 'app/api/generate-video-cinematic/route.ts'
const route = readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n')
const films = JSON.parse(readFileSync('docs/filme-nota-9/epoca-2411/roteiros.json', 'utf8'))
const lePrince = films.find(film => film.id === 'leprince')
const cooper = films.find(film => film.id === 'cooper')
const load = createOfflineLoader({ globals: { AbortSignal } })

function runner(source) {
  const world = { ts, load, read(file) { assert.equal(file, routeFile); return source } }
  const borders = frontieres(world)
  return (film, mode, internal) => capture(world, borders, film, aplicar, mode, internal)
}

function dispatches(run) {
  return run.sends.map(send => JSON.parse(send.body).multi_prompt.map(shot => shot.prompt))
}

function changeOnce(before, after) {
  assert.equal(route.split(before).length, 2, 'Anchor must occur exactly once: ' + before)
  return route.replace(before, after)
}

async function external(run) {
  const off = await run(lePrince, 'off', false)
  const gated = await run(lePrince, 'internal', false)
  assert.deepEqual(gated, off, 'external account received a period setting')
}

async function sheetFirst(run) {
  const active = await run(lePrince, 'internal', true)
  assert.match(active.sheet, /Period setting: 1888\b/u, 'sheet must date the opening workshop')
}

async function sectionDates(run) {
  // The route splits three narrated scenes into four shots. Verify the actual bytes
  // captured at all three submit paths so applying a date only to the stills cannot pass.
  const active = await run({ ...lePrince, groups: [[0, 1], [2], [3]] }, 'internal', true)
  for (const shots of dispatches(active)) {
    assert.equal(shots.length, 4, 'test fixture must exercise the section split')
    for (const [i, year] of [1888, 1890, 1890, 1890].entries()) {
      assert.ok(shots[i].includes('Period setting: ' + year), 'missing section date on dispatch')
    }
  }
}

async function longAuthorHint(run) {
  const hint = 'A man in a dark suit sits in an airplane seat and holds a newspaper and a briefcase. Warm overhead lamps illuminate the rows of seats. A flight attendant walks past the passengers. The cabin walls have a pale finish and the aisle runs to the back. He opens the briefcase and shows the attendant a folded note. The note says he has a bomb in the briefcase. The engines hum as the plane climbs over the clouds.'
  assert.ok([...hint].length >= 400)
  const film = { ...cooper, script: cooper.script.replace('man in dark suit and black tie sitting in an airplane seat with a briefcase', hint) }
  assert.notEqual(film.script, cooper.script)
  const off = dispatches(await run(film, 'off', true))
  const on = dispatches(await run(film, 'internal', true))
  for (const [index, baseline] of off.entries()) {
    const before = baseline[1]
    const after = on[index][1]
    const ending = 'The engines hum as the plane climbs over the clouds.'
    assert.ok(before.includes(ending), 'OFF fixture must retain original ending')
    assert.ok(after.includes(ending), 'epoch removed the author’s final action on ' + index)
    if (index < 2) assert.ok(before.includes('Every page shows only aged texture'), 'OFF fixture must retain surface protection')
    else assert.ok(before.includes('Keep the face and outfit of @Image1.'), 'OFF reference fixture must retain identity')
    // Preserve every complete sentence that actually reached the provider in OFF,
    // including the seat/camera scale, surface protection and reference identity.
    const sentences = before.split(/(?<=[.!?])\s+/u).filter(Boolean)
    for (const sentence of sentences) assert.ok(after.includes(sentence), 'long dispatch lost original content: ' + sentence)
    assert.ok([...after].length <= 512)
  }
}

// Exercise the real route closure and provider body. Each baseline includes the
// full identity suffix(es), the author’s action and punctuation near the cap.
async function referenceBoundary(source, count) {
  const world = { ts, load, read: () => source }
  const closure = frontieres(world).v('kling4PorSecao')
  const epoch = { cenas: Array(4).fill('1971'), secoes: Array(4).fill('1971'), primeirasSecoes: [0,1,2,3] }
  const ref = {imageUrl:'https://fixture.invalid/dan', nomes:['Dan Cooper'], frase:'Keep the face and outfit of @Image1.'}
  if (count === 2) ref.segundo = {imageUrl:'https://fixture.invalid/flo', nomes:['Flo Schaffner'], frase:'Keep the face and outfit of @Image2.'}
  const actor = 'Dan Cooper and Flo Schaffner sit in an airplane cabin. '
  const words = ('Warm lamps light the seats and the wet windows. ').repeat(12).trim().split(' ')
  let nearLimit = false
  for (let i = 20; i <= 80; i++) {
    const hint = actor + words.slice(0,i).join(' ') + '. They close the map 🧳.'
    const voices = Array(4).fill('They enter the cabin.')
    const context = {
      aplicarEpocaVisual:load('@/lib/cinematic/epocaVisual2411').aplicarEpocaVisual,
      kling4PlanoPorSecao:true,verbatim:true,parsedScript:{segments:voices.map(voiceover=>({voiceover,pexelsQuery:hint}))},
      scenes:voices.map(voiceover=>({voiceover})), planosPorSecao:load('@/lib/kling4QuatroPlanos').planosPorSecao,
      sujeitoAparenciaLigada:()=>false, comSuperficieNoPlano:load('@/lib/cinematic/superficieSemTexto').comSuperficieNoPlano,
      kling4PlanoVariado:true, ...load('@/lib/kling4PlanoVariado'), kling4PlanoFinal:true,
      planoFinalEmMovimento:load('@/lib/kling4PlanoFinal').planoFinalEmMovimento, garantirSujeitoNoUltimo1911(){},
    }
    async function prompts(epocaVisual) {
      const args = {prompts:voices.map(()=>hint),approvedStills:[],timing:{referenciaUnica:ref,voiceovers:voices,wordsPerSecond:2.7}}
      const result = closure.run({...context,epocaVisual})(args)
      let body
      await load('@/lib/kling4Trial').submitKling4TrialVideo(result,{apiKey:'offline',now:()=>0,fetchImpl:async(url,options)=>{
        assert.ok(url.endsWith('/reference-to-video'))
        body=JSON.parse(options.body)
        return {ok:true,json:async()=>({request_id:'offline'})}
      }})
      return body.multi_prompt.map(s=>s.prompt)
    }
    const off = await prompts(null), on = await prompts(epoch)
    for (const [j,before] of off.entries()) {
      const after = on[j]
      assert.ok(before.includes('@Image1') && (before.includes('@Image2') === (count === 2)))
      assert.ok([...after].length <= 512)
      if ([...before].length >= 485) nearLimit = true
      for (const sentence of before.match(/[^.!?]+[.!?](?=\s|$)/gu) || []) {
        assert.ok(after.includes(sentence.trim()), 'reference budget ' + count + ' lost original text: ' + sentence.trim())
      }
    }
  }
  assert.ok(nearLimit,'reference fixture must exercise near-512 code points')
}

const run = runner(route)
const off = await run(lePrince, 'off', true)
for (const text of [off.sheet, ...off.textStills, ...off.editedStills, ...dispatches(off).flat()]) {
  assert.doesNotMatch(text, /Period setting:/u, 'OFF should not add epoch metadata')
}
await external(run)
await sheetFirst(run)
await sectionDates(run)
await longAuthorHint(run)
const budget = 'Math.max(Array.from(referencia).length, reservaDasReferencias)'
for (const count of [1,2]) {
  await referenceBoundary(route,count)
  await assert.rejects(() => referenceBoundary(changeOnce(budget,'Array.from(referencia).length'), count), err => err.code === 'ERR_ASSERTION' && err.message.startsWith('reference budget ' + count + ' lost'), 'M5, reference count ' + count)
}
await assert.rejects(() => referenceBoundary(changeOnce('a.timing.referenciaUnica?.segundo?.frase]', 'undefined]'),2), err => err.code === 'ERR_ASSERTION' && err.message.startsWith('reference budget 2 lost'), 'missing second reference')

const gate = 'kling4TrialCandidate && !qualidadeHerdada && isDryRunAccount(user.email)'
const section = 'indices ? epocaVisual.secoes[indices[i]] : epocaVisual.cenas[i]'
const mutants = [
  ['no account check', gate, 'kling4TrialCandidate && !qualidadeHerdada', external, 'external account received a period setting'],
  ['always internal', gate, 'true', external, 'external account received a period setting'],
  ['undated sheet', 'scenePrompt: aplicarEpocaVisual(promptDaFolha(f, styleAnchor, folhaSemNome2511), epocaVisual?.ficha, true),', 'scenePrompt: aplicarEpocaVisual(promptDaFolha(f, styleAnchor, folhaSemNome2511), undefined, true),', sheetFirst, 'sheet must date the opening workshop'],
  ['last epoch on sheet', 'scenePrompt: aplicarEpocaVisual(promptDaFolha(f, styleAnchor, folhaSemNome2511), epocaVisual?.ficha, true),', 'scenePrompt: aplicarEpocaVisual(promptDaFolha(f, styleAnchor, folhaSemNome2511), epocaVisual?.secoes.at(-1), true),', sheetFirst, 'sheet must date the opening workshop'],
  ['undated split shots', section, 'undefined', sectionDates, 'missing section date on dispatch'],
]
for (const [name, before, after, probe, reason] of mutants) {
  const mutated = runner(changeOnce(before, after))
  await assert.rejects(() => probe(mutated), error => error.code === 'ERR_ASSERTION' && error.message.startsWith(reason), name)
}
console.log('Epoch route passed: OFF, external account, first sheet, split shots, long author hint and five targeted route mutants.')
