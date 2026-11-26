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

function launch(file, props, overrides, selection) {
  const tab = aba(overrides)
  tab.mount(React.createElement(tab.m(file).default, { filmes: [], motor: 'seedance', campanha: 'voice_test', ideiaInicial: idea, ...props }))
  if (selection) {
    assert.deepEqual(picked(tab), ['Narrator'])
    if (selection === 'characters') tab.click((p, t) => voiceButton(p, t) && p.children === 'Characters talk', 'Characters talk')
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

function filmRequests(fields, voiceMode, source = read(film), mode = 'cinematic_ai') {
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
    ideia: idea, rawSource: idea, duracaoPedida: 15, alvo: { targetSeconds: 15 },
  }
  evaluate('const cinematicPayload = ' + expression(source, 'cinematicPayload', film) + '\n' + [...writer, ...generator].join('\n'), context)
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
  assert.deepEqual(payloads.map(body => body.voice_mode), enabled ? ['characters', 'characters'] : [undefined, undefined])
  assert.equal(payloads[1].engine, kids.KIDS_CARTOON_ENGINE)
  assert.equal(payloads[1].script_mode, 'verbatim')
  assert.equal(parked.corpoDaRetomada(parked.pedidoEstacionavel(payloads[1]), 'retry').voice_mode, enabled ? 'characters' : undefined)
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
  tab.click((p, t) => voiceButton(p, t) && p.children === 'Characters talk', 'Characters talk')
  tab.click(p => Boolean(p['data-create-continue']), 'Continue')
  assert.equal(new URL(jumps[0], 'https://example.invalid').pathname, '/kids-cartoon')
  const saved = tab.m('lib/ads/rascunhoDoVisitante.ts').lerRascunhoDoDesenho()
  assert.equal(saved.voice_mode, 'characters')
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
