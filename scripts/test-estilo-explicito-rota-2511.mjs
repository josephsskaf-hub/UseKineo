import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import vm from 'node:vm'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const src = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8').replace(/\r\n/g, '\n')
const start = src.indexOf('const styleAnchor = deriveStyleAnchor(')
const romanceEnd = src.indexOf('\n', src.indexOf('if (romanceAdulto.ativo) Object.assign(styleAnchor', start))
assert.ok(start >= 0 && romanceEnd > start)
assert.match(src, /body = await req\.json\(\)/)
const selected = src.match(/^    const explicitFilmLook = .+$/m)?.[0]
assert.ok(selected, 'a rota valida o campo antes de poder guardá-lo')
const block = selected + '\n' + src.slice(start, romanceEnd)
const loader = createOfflineLoader()
const style = loader('@/lib/cinematic/sceneStyle')
const gate = loader('@/lib/cinematic/filmLook2511Server')
const shared = loader('@/lib/cinematic/filmLook2511')
const internalEmail = loader('@/lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
function probe(source) {
  const js = ts.transpileModule(source + '\nstyleAnchor', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const compiled = new vm.Script(js)
  return (text, look, house = true, romance = false, suffix = '') => compiled.runInNewContext({
    ...style, ...gate, prompt: text, body:{look}, user:{email:house ? internalEmail : 'external@example.invalid'},
    romanceAdulto:{ativo:romance}, styleSuffix:suffix, textoDoLook:(script, idea)=>[script,idea].filter(Boolean).join(' '),
  })
}
const resolve = probe(block)
const cases = ['A cartoon guard', 'An anime detective', 'Harbor at night', 'dark cinematic 3D animation', 'film noir', 'not cartoon']
for (const text of cases) for (const suffix of ['', ', candlelight']) {
  const base = style.deriveStyleAnchor(text, suffix)
  for (const value of [undefined, null, '', 'realistic', {}, 1]) assert.deepEqual(resolve(text,value,true,false,suffix),base)
  for (const value of ['anime','photoreal','animated3d']) assert.deepEqual(resolve(text,value,false,false,suffix),base)
}
function casesExplicit(resolve) {
  assert.equal(resolve('A cartoon guard','photoreal').look,'photoreal','explicit realistic')
  assert.equal(resolve('A guard','animated3d').look,'animated3d','explicit cartoon')
  assert.equal(resolve('A cartoon guard','anime').look,'anime','explicit anime')
  assert.equal(resolve('A couple','anime',true,true).look,'photoreal','romance must remain photoreal')
  assert.equal(resolve('Plain scene','anime',false).look,'photoreal','external bypassed gate')
}
casesExplicit(resolve)
for (const [before, after, reason] of [
  ['selectedFilmLook(body.look, user.email)', 'undefined','explicit realistic'],
  ['selectedFilmLook(body.look, user.email)', 'body.look','external bypassed gate'],
  ['if (romanceAdulto.ativo)', 'if (false)','romance must remain photoreal'],
]) {
  assert.ok(block.includes(before))
  assert.throws(()=>casesExplicit(probe(block.replace(before,after))),err=>err.code==='ERR_ASSERTION' && err.message.startsWith(reason))
}
assert.equal(shared.filmLookEnabled(true,'off'),false)
assert.equal(shared.filmLookEnabled(false,'internal'),false)
for(const [text,expected] of [['tall guard','photoreal'],['un dessin animé','animated3d'],['anime chase','anime'],['no cartoon','photoreal']]) {
  assert.equal(shared.suggestedFilmLook(text),expected)
}
const { parseUserScript } = loader('@/lib/scriptParser')
const { buildClassicVisualPrompt } = loader('@/lib/cinematic/visualPromptPolicy')
const { pedidoEstacionavel, corpoDaRetomada } = loader('@/lib/filaQuedaFal')
// Seção 2 do 92ccaf26, com os marcadores vizinhos descritos no parecer e no diagnóstico de 25/11.
const alcatraz = [
  'HOOK: [Pexels: alcatraz island aerial] Three inmates vanished from Alcatraz without a trace.',
  'MICRO REWARD 1: [Pexels: cartoon guard at prison gate] Guards said, Nobody leaves The Rock!',
  'PAYOFF: [Pexels: dark ocean waves at night] Their bodies were never found.',
].join('\n')
const chooseVisual = src.slice(src.indexOf('    const visualLookOverride ='), src.indexOf('    // KINEO-PROTAGONISTA-1311 [CEO 13/11'))
const classicScrub = src.slice(src.indexOf('    if (visualLookOverride) for (const scene of scenes)'), src.indexOf('    const classicScenePrompts ='))
const classic = src.slice(src.indexOf('    const classicScenePrompts ='), src.indexOf('      try {\n        const contrato = montarContrato({\n          indice: sceneIndex + 1,\n          falaFinal: scene.voiceover'))
const klingStart = src.indexOf('        const cues = q ? q.grupos.flat().map(')
const klingPrefix = src.slice(klingStart, src.indexOf('        if (q) Object.assign(r.timing', klingStart))
for (const [name, code] of Object.entries({ chooseVisual, classicScrub, classic, klingPrefix })) assert.ok(code.length > 60, name)
function exec(code, context) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new vm.Script(js).runInNewContext(context, { timeout: 2500 })
}
function alcatrazPrompts(look, opts = {}, stage = {}) {
  const parsedScript = parseUserScript(alcatraz)
  assert.equal(parsedScript.segments[1].pexelsQuery, 'cartoon guard at prison gate')
  const originalNarration = parsedScript.narration
  const styleAnchor = resolve(alcatraz, look, opts.house ?? true)
  const explicitFilmLook = gate.selectedFilmLook(look, opts.house === false ? 'external@example.invalid' : internalEmail)
  const ctx = { ...style, parsedScript, explicitFilmLook, styleAnchor, qualidadeHerdada: opts.inherited, desenhoInfantil: { ativo: false } }
  const after = exec((stage.chooseVisual ?? chooseVisual) + '\nvisualLookOverride', ctx)
  assert.equal(parsedScript.narration, originalNarration)
  assert.equal(parsedScript.segments[2].pexelsQuery, 'dark ocean waves at night')
  const scenes = [{ description: parsedScript.segments[1].pexelsQuery, aiPrompt: 'cartoon guard at prison gate', voiceover: parsedScript.segments[1].voiceover }]
  const classicVisualPolicy = { mode: 'documentary_faceless', style: styleAnchor, character: null, aspect: '9:16' }
  const rendered = exec((stage.classicScrub ?? classicScrub) + '\n' + classic + '\nreturn cinematicBruto\n})\nclassicScenePrompts[0]', {
    ...style, buildClassicVisualPrompt, classicVisualPolicy, eraSuffix: '', scenes, visualLookOverride: after,
  })
  const q = opts.grouped === false ? null : { grupos: [[1]] }
  const kling = { prompts: ['Photoreal film. Wide shot.'] }
  exec(klingPrefix, { q, parsedScript, scenes, r: kling })
  return { rendered, prefix: kling.prompts[0], spoken: scenes[0].voiceover }
}
for (const grouped of [true, false]) {
  const result = alcatrazPrompts('photoreal', { grouped })
  assert.match(result.rendered, /guard at prison gate/)
  assert.match(result.rendered, /photorealistic/)
  assert.doesNotMatch(result.rendered, /cartoon/i, 'o visual clássico não pode contradizer Realistic')
  assert.match(result.prefix, /^guard at prison gate\. Photoreal film\./, 'dica do Kling 4 sem o meio conflitante')
  assert.match(result.spoken, /Nobody leaves The Rock/)
}
for (const opts of [{}, { house: false }, { inherited: { style: {} } }]) {
  const result = alcatrazPrompts(opts.house === false || opts.inherited ? 'photoreal' : undefined, opts)
  assert.match(result.rendered, /cartoon guard at prison gate/)
  assert.match(result.prefix, /^cartoon guard at prison gate\./)
}
assert.match(alcatrazPrompts('animated3d').prefix, /^cartoon guard at prison gate\./)
assert.throws(() => assert.doesNotMatch(alcatrazPrompts('photoreal', {}, { classicScrub: '' }).rendered, /cartoon/))
assert.throws(() => assert.match(alcatrazPrompts('photoreal', {}, { chooseVisual: chooseVisual.split('\n').filter(line => !line.includes('segment.pexelsQuery =')).join('\n') }).prefix, /^guard at prison gate\./))
assert.equal(style.visualTextForFilmLook('Flat 2D cartoon guard, close shot, candlelight', 'photoreal'), 'guard, close shot, candlelight')
assert.equal(style.visualTextForFilmLook('Anime guardian with a live-action background', 'anime'), 'Anime guardian with a background')
assert.equal(style.visualTextForFilmLook('Without cartoon. Wide shot.', 'photoreal'), 'Without cartoon. Wide shot.')
assert.match(resolve('cartoon guard', 'photoreal', true, false, 'cartoon style, candlelight').suffix, /candlelight$/)
assert.doesNotMatch(resolve('cartoon guard', 'photoreal', true, false, 'cartoon style, candlelight').suffix, /cartoon/i)

const parking = src.match(/^    const pedidoEstacionado = .+$/m)?.[0]
assert.ok(parking)
const parked = (value, email) => exec(selected + '\n' + parking + '\npedidoEstacionado', {
  ...gate, user: { email }, pedidoEstacionavel, body: { prompt: alcatraz, duration: 15, look: value },
})
const salvage = src.match(/const salvageFp = createHash[\s\S]*?\.digest\('hex'\)/)?.[0]
assert.ok(salvage)
const key = (explicitFilmLook, prompt = alcatraz) => exec(salvage + '\nsalvageFp', { createHash, user: { id: 'synthetic' }, duration: 15, prompt, explicitFilmLook })
const oldKey = createHash('md5').update('synthetic|hollywood|15|' + alcatraz.trim().toLowerCase()).digest('hex')
assert.equal(key(undefined), oldKey, 'a chave histórica permanece byte a byte')
const looks = ['photoreal', 'animated3d', 'anime']
assert.equal(new Set([oldKey, ...looks.map(look => key(look))]).size, 4, 'salvage isolado por escolha de estilo')
for (const look of looks) {
  const request = corpoDaRetomada(parked(look, internalEmail), 'replacement-attempt')
  assert.equal(request.look, look, 'estacionamento e cron preservam a escolha')
  assert.equal(request.generationId, 'replacement-attempt')
  assert.equal(resolve(request.prompt, request.look).look, look)
  assert.ok(!Object.hasOwn(parked(look, 'external@example.invalid'), 'look'))
}
assert.ok(!Object.hasOwn(parked('invalid', internalEmail), 'look'))
assert.ok(!Object.hasOwn(parked(undefined, internalEmail), 'look'))
console.log('Film look: precedência, duas dicas visuais do caso Alcatraz, retomada, quatro chaves de salvage, OFF e cinco mutantes.')
