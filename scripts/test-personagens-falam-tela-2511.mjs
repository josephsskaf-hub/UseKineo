import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const require = createRequire(import.meta.url)
const { aba, React, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const release = 'lib/cinematic/filmVoice2511.ts'
const film = 'app/(dashboard)/generate/GenerateClient.tsx'
const cartoon = 'components/kidsCartoon/KidsCartoonTemplate.tsx'
const entry = 'app/(dashboard)/studio/create/page.tsx'
const idea = 'Íris opens the blue door & asks: Who is there?'
const speakers = 'HOOK: [Pexels: blue door]\nÍris: Who is there?\nRui: It is me.\nPAYOFF: [Pexels: hallway]\nÍris: Please come in.'
const gateSource = (src, enabled) => src.replace(/(FILM_VOICE_RELEASE: 'off' \| 'on' = )'(?:off|on)'/, (_, prefix) => prefix + (enabled ? "'on'" : "'off'"))
const active = { [release]: gateSource(read(release), true) }
const rollback = { [release]: gateSource(read(release), false) }
assert.match(read(release), /FILM_VOICE_RELEASE:.*= 'off'/, 'o commit permanece OFF')

function fromBase(file) {
  return execFileSync('git', ['show', '43a94f1b0:' + file], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
}
function matches(source, file, test) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  function visit(node) {
    if (test(node)) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}
function expression(source, name, file) {
  const nodes = matches(source, file, node => ts.isVariableDeclaration(node) && node.name.getText() === name)
  assert.equal(nodes.length, 1, 'uma declaração de ' + name)
  return nodes[0].initializer.getText()
}
function calls(file, path, source = read(file)) {
  return matches(source, file, node => ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === path && /^(fetch|fetchResilienteSemDinheiro|postJson)$/.test(node.expression.getText())).map(node => node.getText())
}
function evaluate(code, context) {
  return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context, { timeout: 4000 })
}
const voiceButton = (props, tag) => tag === 'button' && ['Narrator', 'Characters talk'].includes(props.children)
const picked = tab => tab.all(voiceButton).filter(node => node.props['aria-pressed']).map(node => node.props.children)
const action = (props, tag) => tag === 'button' && /^studio-(simple|moldura)-generate$/.test(props['data-testid'] ?? '')

const charactersButton = (p, t) => voiceButton(p, t) && p.children === 'Characters talk'
function setSeconds(tab, seconds) {
  const settings = p => p['data-testid'] === 'studio-simple-settings'
  const chip = p => p['data-cx-chip'] === 'duracao'
  if (tab.all(settings).length) tab.click(settings, 'Settings')
  if (tab.all(chip).length) tab.click(chip, 'Length')
  tab.click((p, t) => t === 'button' && (String(p['data-studio-duration']) === String(seconds) ||
    (p.className === 'ksx-opt' && p.children[0] === seconds)), 'Length ' + seconds)
  if (tab.all(p => p.className === 'ksx-done').length) tab.click(p => p.className === 'ksx-done', 'Done')
}
function launch(file, props, overrides, selection) {
  const tab = aba(overrides)
  tab.mount(React.createElement(tab.m(file).default, { filmes: [], motor: 'seedance', campanha: 'voice_test', ideiaInicial: idea, ...props }))
  if (selection) {
    assert.deepEqual(picked(tab), ['Narrator'])
    assert.equal(tab.one(charactersButton, 'long film').props.disabled, true)
    setSeconds(tab, 15)
    assert.ok(!tab.one(charactersButton, 'short film').props.disabled)
    if (selection === 'characters') {
      tab.click(charactersButton, 'Characters talk')
      setSeconds(tab, 35)
      assert.equal(tab.one(charactersButton, '35s').props.disabled, true)
      assert.deepEqual(picked(tab), ['Narrator'])
      setSeconds(tab, 15)
    }
    assert.deepEqual(picked(tab), [selection === 'characters' ? 'Characters talk' : 'Narrator'])
  } else assert.deepEqual(picked(tab), [])
  const html = tab.html()
  tab.click(action, 'Generate')
  assert.equal(tab.log.pushes.length, 1)
  return { html, url: tab.log.pushes[0] }
}
function makeWorld(enabled) {
  return createOfflineLoader({ source: (file, str) => file === release ? gateSource(str, enabled) : str })
}
const live = makeWorld(true)
const off = makeWorld(false)
const onFields = live('@/lib/cinematic/filmVoice2511').voiceModeFields
const offFields = off('@/lib/cinematic/filmVoice2511').voiceModeFields

function filmRequests(fields, voiceMode, source = read(film), mode = 'cinematic_ai', changes = {}) {
  const captured = []
  const record = (path, request) => captured.push({ path, method: request.method, body: JSON.parse(request.body) })
  const writer = calls(film, '/api/generate-script', source)
  const generator = calls(film, '/api/generate-video-cinematic', source)
  assert.equal(writer.length, 2, 'writer normal e recuperação de 422')
  assert.equal(generator.length, 1)
  const context = {
    fetch: record, fetchResilienteSemDinheiro: record, voiceModeFields: fields, voiceMode, mode, filmLook: undefined,
    quality: 'cinematic_ai', cinematicGenerationId: 'sample-voice-2511', trimmed: idea, duration: 15, language: 'en',
    aspectRequested: '9:16', scriptMode: 'ai', analysis: null, aiEngine: 'seedance', cineBrollScenes: undefined,
    cineUsable: false, ideiaDoRoteiroRef: { current: null }, estrelaRef: { current: null }, kidsCartoonId: null,
    dispatchTimeoutSignal: () => undefined, CINEMATIC_DISPATCH_TIMEOUT_MS: 10000,
    restoredPreview: { prompt: '', style: undefined }, previewStyleCue: live('@/lib/cinematic/characterVoiceAvailable').previewStyleCue,
    characterVoiceAvailable: live('@/lib/cinematic/characterVoiceAvailable').characterVoiceAvailable,
    filmVoiceEnabled: () => fields === onFields,
    ideia: idea, rawSource: idea, duracaoPedida: 15, alvo: { targetSeconds: 15 }, ...changes,
  }
  const voiceFunctions = matches(source, film, n => ts.isFunctionDeclaration(n) && ['voiceForFilm', 'voiceAvailableForFilm', 'writerVoiceFields', 'resumedStyle'].includes(n.name?.text)).map(n => n.getText())
  evaluate(voiceFunctions.join('\n') + '\nconst cinematicPayload = ' + expression(source, 'cinematicPayload', film) + '\n' + [...writer, ...generator].join('\n'), context)
  assert.deepEqual(captured.map(request => [request.method, request.path]), [
    ['POST', '/api/generate-script'], ['POST', '/api/generate-script'], ['POST', '/api/generate-video-cinematic'],
  ])
  return captured.map(request => request.body)
}

for (const [file, props] of [
  ['components/studio/StudioSimples.tsx', {}],
  ['components/create/StudioNaMoldura.tsx', {}],
  ['components/create/StudioNaMoldura.tsx', { caixaNova: true }],
]) {
  const stable = Object.fromEntries([file, 'components/studio/StudioSimples.tsx', 'components/create/CaixaNovaDoFilme.tsx', 'components/create/CaixaDeCriar.tsx', 'lib/growth/studioSimples.ts'].map(path => [path, fromBase(path)]))
  assert.deepEqual(launch(file, props, rollback, null), launch(file, props, { ...stable, ...rollback }, null), 'OFF preserva montagem e destino')
  for (const selection of ['characters', 'narrator']) {
    const clicked = launch(file, props, active, selection)
    const path = new URL(clicked.url, 'https://example.invalid')
    assert.equal(path.pathname, '/studio/create')
    assert.equal(path.searchParams.get('prompt'), idea)
    const signup = new URL('/signup?redirect=' + encodeURIComponent(path.pathname + path.search), path)
    const returned = new URL(signup.searchParams.get('redirect'), path)
    const searchParams = Object.fromEntries(returned.searchParams)
    const declaration = expression(read(entry), '{ voice_mode: initialVoiceMode }', entry)
    const restored = evaluate(declaration, { searchParams, voiceModeFields: onFields }).voice_mode
    assert.equal(restored, selection)
    assert.deepEqual(filmRequests(onFields, restored).map(body => body.voice_mode), [selection, selection, selection])
  }
}
assert.deepEqual(filmRequests(offFields, 'characters'), filmRequests(offFields, 'characters', fromBase(film)), 'OFF preserva os três corpos anteriores')
assert.deepEqual(filmRequests(onFields, 'characters', read(film), 'fast').slice(0, 2).map(body => body.voice_mode), [undefined, undefined])

{
  const tab = aba(active)
  const editor = tab.m('components/studio/StudioSimples.tsx').default
  tab.mount(React.createElement(editor, { filmes: [], motor: 'seedance', campanha: 'voice_test', ideiaInicial: idea, showFilmStyle: true, initialVoiceMode: 'characters' }))
  setSeconds(tab, 15)
  assert.deepEqual(picked(tab), ['Characters talk'], 'restored eligible preference')
  for (const style of ['Anime', 'Cartoon', 'Realistic']) {
    tab.click((p,t) => t === 'button' && p.children === style, style)
    assert.deepEqual(picked(tab), [style === 'Realistic' ? 'Characters talk' : 'Narrator'], style)
    assert.equal(Boolean(tab.one(charactersButton, style).props.disabled), style !== 'Realistic')
  }
}

for (const gate of [live, off]) {
  const enabled = gate === live
  const draft = gate('@/lib/growth/cardEntryResumeDraft')
  const parked = gate('@/lib/filaQuedaFal')
  const previews = gate('@/lib/scenePreview')
  const plan = gate('@/lib/growth/planoDoFilme')
  const prefix = 'X'.repeat(140)
  const savedId = '11200000-0000-4000-8000-000000002511'
  const otherId = '21200000-0000-4000-8000-000000002511'
  const literal = { t: 100, idea: prefix + ' first ending', script: speakers, language: 'en', previewId: savedId }
  const matching = { idea: prefix, script: speakers, language: 'en', previewId: savedId }
  assert.equal(previews.previaIdentityFields(savedId).previewId, enabled ? savedId : undefined)
  assert.equal(previews.previaIdentityFields('bad').previewId, undefined)
  assert.equal(previews.mesmaPreviaParaRetomar(literal, matching), enabled)
  assert.equal(previews.mesmaPreviaParaRetomar(literal, { ...matching, previewId: otherId }), false, 'mesmo prefixo e roteiro, outra reserva')
  assert.equal(previews.mesmaPreviaParaRetomar(literal, { ...matching, previewId: undefined }), false, 'sem id, o prefixo nunca prova identidade')
  const saved = draft.serializeCardEntryDraft({ prompt: idea, duration: 15, quality: 'cinematic_ai', mode: 'cinematic_ai', engine: 'seedance', at: 100, voiceMode: 'characters', scriptMode: 'verbatim' })
  assert.equal(draft.readCardEntryDraft(saved, 101).script_mode, enabled ? 'verbatim' : undefined)
  assert.equal(draft.readCardEntryDraft(saved, 101).voice_mode, enabled ? 'characters' : undefined)
  assert.equal(draft.readCardEntryDraft(JSON.stringify({ prompt: idea, at: 100 }), 101).voice_mode, undefined, 'rascunho anterior à chave')
  const [story] = calls(cartoon, '/api/kids-cartoon/story')
  const [make] = calls(cartoon, '/api/generate-video-cinematic')
  assert.ok(story && make)
  const payloads = []
  const kids = gate('@/lib/kidsCartoon/kidsCartoon')
  evaluate(story + '\n' + make, {
    fetch: (_url, opts) => payloads.push(JSON.parse(opts.body)), postJson: (_url, body) => payloads.push(body),
    kidsCinematicPayload: kids.kidsCinematicPayload, generationId: 'sample-cartoon-2511', texto: idea,
    character: kids.KIDS_CHARACTERS[0].id, language: 'en', duration: 15, dur: 15,
    captions: true, ideaId: null, idea, voiceMode: 'characters', voiceModeFields: enabled ? onFields : offFields,
  })
  assert.deepEqual(payloads.map(body => body.voice_mode), enabled ? ['narrator', 'narrator'] : [undefined, undefined])
  assert.equal(payloads[1].engine, kids.KIDS_CARTOON_ENGINE)
  assert.equal(payloads[1].script_mode, 'verbatim')
  assert.equal(parked.corpoDaRetomada(parked.pedidoEstacionavel(payloads[1]), 'retry').voice_mode, enabled ? 'narrator' : undefined)
  const filmDraft = {prompt: speakers, duration: 15, ...(enabled ? onFields : offFields)('characters')}
  assert.equal(parked.corpoDaRetomada(parked.pedidoEstacionavel(filmDraft), 'retry').voice_mode, enabled ? 'characters' : undefined)
  for (const invalid of [null, 'dialogue', ['characters'], { mode: 'characters' }]) {
    assert.equal(parked.pedidoEstacionavel({ prompt: idea, duration: 15, voice_mode: invalid }).voice_mode, undefined)
  }
  const preview = new URL(previews.previaPath({ prompt: idea, voiceMode: 'characters' }), 'https://example.invalid')
  assert.equal(preview.searchParams.get('voice_mode'), enabled ? 'characters' : null)
  const resume = new URL(previews.previaResumeStudioHref({ idea, script: speakers, t: 100, language: 'en', voice_mode: 'characters' }), preview)
  assert.equal(resume.searchParams.get('voice_mode'), enabled ? 'characters' : null)
  assert.equal(resume.searchParams.get('script_mode'), 'verbatim')
  assert.equal(resume.searchParams.get('prompt'), speakers, 'a ideia não substitui o roteiro da prévia')
  const rawScript = speakers.replaceAll('Íris', 'Nia')
  const manualPreview = new URL(previews.previaPath({ prompt: rawScript, voiceMode: 'characters', scriptMode: 'verbatim' }), preview)
  assert.equal(manualPreview.searchParams.get('script_mode'), enabled ? 'verbatim' : null)
  const manualResume = new URL(previews.previaResumeStudioHref({ idea: rawScript, script: speakers, t: 100, language: 'en', voice_mode: 'characters', script_mode: 'verbatim' }), preview)
  assert.equal(manualResume.searchParams.get('prompt'), enabled ? rawScript : speakers, 'falas literais aprovadas continuam literais')
  assert.equal(manualResume.searchParams.get('script_mode'), 'verbatim')
  assert.equal(previews.previaResumeScript({ idea: rawScript, script: speakers, t: 100, language: 'en', voice_mode: 'characters', script_mode: 'verbatim' }), enabled ? rawScript : speakers)
  for (const separator of ['Pexels:', 'Pexels -', 'Pexels –', 'Pexels']) {
    const marked = speakers.replaceAll('Pexels:', separator)
    assert.equal(plan.cenasDoPlano(marked).length, 2, separator)
    assert.deepEqual(Array.from(plan.cenasDoPlano(marked, true), scene => scene.texto), ['Íris: Who is there?\nRui: It is me.', 'Íris: Please come in.'], separator)
  }
}
for (const file of ['components/create/CreateShell.tsx', 'app/create/[tab]/AbaComChegada.tsx']) {
  const tab = aba(active)
  const jumps = []
  window.location = { assign: href => jumps.push(href) }
  tab.mount(React.createElement(tab.m(file).default, { tab: 'cartoon', destino: '/kids-cartoon?utm_source=home_card' }))
  assert.deepEqual(picked(tab), ['Narrator'])
  tab.type((p, t) => t === 'textarea' && p.id === 'ct-idea', idea, 'Cartoon idea')
  assert.equal(tab.one(charactersButton, 'Cartoon narrado').props.disabled, true)
  tab.click(p => Boolean(p['data-create-continue']), 'Continue')
  assert.equal(new URL(jumps[0], 'https://example.invalid').pathname, '/kids-cartoon')
  const saved = tab.m('lib/ads/rascunhoDoVisitante.ts').lerRascunhoDoDesenho()
  assert.equal(saved.voice_mode, 'narrator')
  assert.equal(saved.idea, idea)
}
console.log('Verdes: montagens Film/Cartoon, modos padrão e explícito, cadastro, escritores, POST, prévia, rascunho, fila e falas no plano. OFF equivalente à base.')

const picker = read('components/studio/FilmVoicePicker.tsx')
for (const part of ['29–45 spoken words', 'up to two adults', '15-second photorealistic film in English', 'Other films use narration']) assert.ok(picker.includes(part))
const refusal = matches(read(film), film, node => ts.isIfStatement(node) && node.expression.getText().includes("data.reason === 'fala_curta_cliente'"))[0]
assert.ok(refusal)
function onResponse(status, data) {
  const seen = []
  const context = {res: {status}, data, trimmed: speakers, generationInFlightRef: { current: true }, activationAutoGenerateRef: { current: true }, onboardingAutoGenerateRef: { current: true }}
  for (const setter of ['setPrompt','setScriptMode','setPhase','setError']) context[setter] = value => seen.push([setter,value])
  vm.runInNewContext('(function(){'+refusal.getText()+'})()',context)
  return seen
}
assert.deepEqual(onResponse(422,{narrationTooShort:true,reason:'fala_curta_cliente',error:'There are 24 spoken words.'}),[['setPrompt',speakers],['setScriptMode','verbatim'],['setError','There are 24 spoken words.'],['setPhase','idle']])
assert.deepEqual(onResponse(422,{narrationTooShort:true,reason:'narration_too_short'}),[])
assert.deepEqual(onResponse(503,{narrationTooShort:true,reason:'fala_curta_cliente'}),[])

// Exercise the actual preview, both checkout buttons and the return banner, without a checkout.
async function resumeEditedPreview(originalScript) {
  const edited = 'Make a hand-drawn anime film about two adult cabinetmakers.'
  const neutral = 'Mira and Rowan check the brass latch beneath the workshop window.'
  const previewId = '97ec3acf-10fd-45ae-abf4-7737fdfdfd11'
  const projection = { show:true, idea:edited, script:neutral, language:'en', previewId, scenes:[], price:'fixture', films:1, go:'/starter',
    film199:{go:'/single', seconds:15, balance:0} }
  const disk = new Map(), session = new Map()
  const storage = map => ({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)})
  async function mount(file, props, responses) {
    const tab = aba({ ...active, 'components/InterfaceLanguage.tsx': "export const useInterfaceLanguage = () => 'en'" })
    globalThis.localStorage = storage(disk)
    globalThis.sessionStorage = storage(session)
    globalThis.window.location = {href:''}
    globalThis.fetch = async (url, options) => {
      const key = (options?.method ?? 'GET') + ' ' + url
      assert.ok(Object.hasOwn(responses, key), key)
      return {ok:true, json:async()=>responses[key]}
    }
    tab.mount(React.createElement(tab.m(file).default, props))
    await tab.settle()
    return tab
  }
  const preview = await mount('app/(dashboard)/studio/previa/ScenePreviewClient.tsx',
    {initialIdea:idea, originalScript, from:'generate', voiceMode:'characters'}, {
      'GET /api/scene-preview':{left:2}, 'POST /api/scene-preview':projection, 'POST /api/scene-preview/cta':{},
    })
  preview.type(p=>p.id==='previa-idea', edited, 'edit visual idea')
  preview.click((p,t)=>t==='button' && p.children==='See free preview','preview')
  await preview.settle()
  preview.click(p=>p['data-testid']==='scene-preview-to-film','turn into film')
  const saved = disk.get('kineo:previa:v1')
  assert.equal(JSON.parse(saved).voice_mode, 'narrator')
  for (const testId of ['region-preview-pricing-cta','region-film-199-cta']) {
    disk.set('kineo:previa:v1',saved)
    const pricing = await mount('components/PreviewPricingStrip.tsx', {}, {'GET /api/scene-preview/pricing-strip?surface=pricing':projection})
    pricing.click(p=>p['data-testid']===testId,testId)
    const banner = await mount('components/ScenePreviewResumeBanner.tsx', {}, {})
    const query = new URL(banner.one((p,t)=>t==='a','resume').props.href,'https://example.invalid').searchParams
    const literal = originalScript ?? neutral
    assert.equal(query.get('voice_mode'),'narrator')
    assert.equal(query.get('preview_style'),'anime')
    assert.equal(query.get('prompt'),literal)
    assert.equal(query.get('script_mode'),'verbatim')
    assert.ok(!query.toString().includes('cabinetmakers'))
    if (testId==='region-film-199-cta') {
      const drafts = live('@/lib/growth/cardEntryResumeDraft')
      const restored = drafts.readCardEntryDraft(session.get(drafts.CARD_ENTRY_DRAFT_KEY),Date.now())
      assert.deepEqual([restored.prompt,restored.voice_mode,restored.preview_style,restored.script_mode],[literal,'narrator','anime','verbatim'])
    }
    const [,,post] = filmRequests(onFields,'characters',read(film),'cinematic_ai',{trimmed:literal,restoredPreview:{prompt:literal,style:'anime'}})
    assert.deepEqual([post.prompt,post.original_idea,post.voice_mode],[literal,'anime','narrator'])
  }
}
await resumeEditedPreview(undefined)
await resumeEditedPreview(speakers)
console.log('Starter e avulso: ideia editada para Anime, roteiro neutro ou literal, narração e estilo preservados até o POST.')

for (const inputs of [
  {filmLook: 'anime'}, {trimmed: 'An anime film', rawSource: 'An anime film', ideia: 'An anime film'},
  {kidsCartoonId: 'test'}, {duration: 35, duracaoPedida: 35, alvo: {targetSeconds: 35}},
]) assert.deepEqual(filmRequests(onFields, 'characters', read(film), 'cinematic_ai', inputs).map(r => r.voice_mode), ['narrator','narrator','narrator'])

const route = 'app/api/generate-video-cinematic/route.ts'
const writerRoute = 'app/api/generate-script/route.ts'
const routeSource = read(route)
const writerSource = read(writerRoute)
const start = routeSource.indexOf('    const faladoPedido2511 = ')
const writerStart = routeSource.indexOf('    const ideiaNoEscritor = ', start)
const gateStart = routeSource.indexOf('    const faladoNoPortao2511 = ', writerStart)
const gateEnd = routeSource.indexOf('    if (verbatim && parsedScript.narration', gateStart)
assert.ok(start > 0 && start < writerStart && writerStart < gateStart && gateStart < gateEnd)
const eligibility = routeSource.slice(start, writerStart)
const gateCode = routeSource.slice(gateStart, gateEnd)
const callWriter = expression(routeSource, 'ideiaNoEscritor', route)
const writerGate = matches(writerSource, writerRoute, n => ts.isIfStatement(n) && n.expression.getText().includes('lerVoiceMode(body.voice_mode)'))[0].expression.getText()
const { parseUserScript } = live('@/lib/scriptParser')
const { textoDoLook } = live('@/lib/cinematic/elencoTrava')
const { characterVoiceAvailable } = live('@/lib/cinematic/characterVoiceAvailable')
const voice = live('@/lib/cinematic/falaDosPersonagens2511')
const ruler = live('@/lib/cinematic/roteiroFalado2511')
for (const [label, duration, cartoon, look, original, words, expected] of [
  ['Cartoon', 15, true, undefined, '', 28, 'narrator'],
  ['Anime by selection', 15, false, 'anime', '', 28, 'narrator'],
  ['Anime in original idea', 15, false, undefined, 'Use a hand drawn anime visual style in a quiet repair shop.', 28, 'narrator'],
  ['35 seconds', 35, false, undefined, '', 28, 'narrator'],
  ['short film below minimum', 15, false, undefined, '', 28, '422'],
  ['short film at minimum', 15, false, undefined, '', 29, 'characters'],
  ['short film at maximum', 15, false, undefined, '', 45, 'characters'],
]) {
  const line = n => Array(n).fill('word').join(' ')
  const prompt = '[Pexels: garden] Mira: ' + line(14) + '.\n[Pexels: door] Rowan: ' + line(words - 14) + '.'
  const body = { voice_mode: 'characters', original_idea: original, prompt, look, kids_cartoon: cartoon ? 'fixture' : undefined }
  const released = [], forwarded = []
  let writerOptions
  const context = {
    ...ruler, ...voice, characterVoiceAvailable, textoDoLook, prompt, duration, styleSuffix: '', explicitFilmLook: look,
    body, desenhoInfantil: {ativo: cartoon}, narrationLanguage: {language: 'en'}, user: {email:'fixture@example.invalid'},
    parsedScript: parseUserScript(prompt), contaDaCasaExata2511: () => false,
    releaseBirthClaim: async reason => released.push(reason), NextResponse: {json: (data, opts) => ({...opts, data})},
    escreverIdeiaNoServidor: async opts => { writerOptions = opts; await opts.escritor({topic: original || prompt}) },
    req: {url: 'https://example.invalid/local'}, NextRequest: Request, URL,
    escritorMarcadoDoGenerateScript: async request => { forwarded.push(await request.json()); return {status:200,json:async()=>({})} },
  }
  const result = await evaluate('(async()=>{\n' + eligibility + '\n' + callWriter + '\n' + gateCode + '\nreturn faladoNoPortao2511\n})()', context)
  const eligible = expected !== 'narrator'
  assert.equal(writerOptions.falado === true, eligible, label + ' writer choice')
  assert.equal(forwarded[0].voice_mode === 'characters', eligible, label + ' delegated writer')
  const direct = evaluate(writerGate, {body, language:'en', topic: original || 'Two people in a garden', user:context.user, alvoSegundos:duration,
    characterVoiceAvailable, selectedFilmLook: () => look, lerVoiceMode: x => x, hasViralMarkers: () => false, reguaDoDialogo2511: () => ({})})
  assert.equal(direct, eligible, label + ' direct writer')
  assert.deepEqual(released, expected === '422' ? ['fala_curta_cliente_no_charge'] : [], label)
  if (expected === '422') {
    assert.equal(result.status, 422)
    assert.equal(result.data.reason, 'fala_curta_cliente')
    assert.deepEqual(onResponse(result.status,result.data), [['setPrompt',speakers],['setScriptMode','verbatim'],['setError',result.data.error],['setPhase','idle']])
  } else assert.equal(result, expected === 'characters', label)
  console.log(label, '→', expected)
}
