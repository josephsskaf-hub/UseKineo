// Executes actual generation payload/metadata, compose speech orchestration and
// Creatomate builder code, with injected in-memory providers; no outbound I/O.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let checks = 0
const eq = (actual, expected, label) => { assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, label); checks++ }
const ok = (value, label) => { assert.ok(value, label); checks++ }
const rejects = (fn, label) => { assert.throws(fn, /unverified|narration|captions|timeline/); checks++ }
const load = createOfflineLoader()
const speech = load('@/lib/cinematic/speechContract')
const visual = load('@/lib/cinematic/visualMode')
const compose = load('@/lib/compose')
const timeline = load('@/lib/cinematic/timelineContract')
const words = text => text.split(/\s+/).filter(Boolean).map((word, i) => ({ word, start: 0.2 + i * 0.4, end: 0.5 + i * 0.4 }))

for (const text of ['An avatar tells this story.', 'O avatar fala exatamente este texto.', 'Un avatar cuenta la historia.', 'Avatar: यह मेरी कहानी है।']) {
  eq(visual.decidirFormato(text, false).modo, 'presenter', 'Explicit avatar is a speaking presenter')
  eq(visual.decidirFormato(text, true).modo, 'documentary_faceless', 'Explicit legacy faceless override remains authoritative')
}
for (const text of ['without an avatar', 'sem avatar', 'sin avatar', 'no avatar', 'avatarless landscape']) {
  eq(visual.decidirFormato(text, false).apresentadorPedido, false, 'Negation and token boundaries do not introduce an avatar')
}
for (const text of ['Hello.', 'I’m here, now!', 'Olá, esta é minha história.', 'Esta es mi historia.', 'यह मेरी कहानी है।']) {
  eq(speech.verifyObservedSpeech(text, words(text)).ok, true, 'EN/PT/ES/HI observed words match')
}
eq(speech.verifyObservedSpeech("I'm here.", words('I’m here!')).ok, true, 'Typography does not change speech')
eq(speech.verifyObservedSpeech('There were 22 people.', words('There were twenty-two people.')).ok, true, 'Bounded English cardinal-number ASR equivalence')
eq(speech.verifyObservedSpeech('U.S.A.', words('USA')).ok, true, 'Dotted acronym typography is equivalent')
eq(speech.verifyObservedSpeech('There were 22 people.', words('There were twenty-three people.')).ok, false, 'Different numbers are never fuzzy-matched')
// KINEO-NUMEROS-EQUIVALENTES-2026-09-14 (auditoria, item 6)
eq(speech.verifyObservedSpeech('Había 22 personas.', words('Había veintidós personas.')).ok, true, 'ES: 22 ≡ veintidós')
eq(speech.verifyObservedSpeech('Faltan 59 días.', words('Faltan cincuenta y nueve días.')).ok, true, 'ES: 59 ≡ cincuenta y nueve')
eq(speech.verifyObservedSpeech('In 1959 it began.', words('In nineteen fifty nine it began.')).ok, true, 'EN: 1959 ≡ nineteen fifty nine')
eq(speech.verifyObservedSpeech('Since 2020.', words('Since twenty twenty.')).ok, true, 'EN: 2020 ≡ twenty twenty')
eq(speech.verifyObservedSpeech('A wave of 524 meters.', words('A wave of five hundred twenty four meters.')).ok, true, 'EN: 524 ≡ five hundred twenty four')
eq(speech.verifyObservedSpeech('In 2005.', words('In two thousand and five.')).ok, true, 'EN: 2005 ≡ two thousand and five')
eq(speech.verifyObservedSpeech('Em 1959, a onda.', words('Em mil novecentos e cinquenta e nove, a onda.')).ok, true, 'PT: 1959 ≡ mil novecentos e cinquenta e nove')
eq(speech.verifyObservedSpeech('Uma onda de 524 metros.', words('Uma onda de quinhentos e vinte e quatro metros.')).ok, true, 'PT: 524 ≡ quinhentos e vinte e quatro')
eq(speech.verifyObservedSpeech('En 1959.', words('En mil novecientos cincuenta y nueve.')).ok, true, 'ES: 1959 ≡ mil novecientos cincuenta y nueve')
eq(speech.verifyObservedSpeech('In 1959 it began.', words('In nineteen fifty eight it began.')).ok, false, 'Different years stay different')
eq(speech.verifyObservedSpeech('Pedro e Ana chegaram.', words('Pedro e Ana chegaram.')).ok, true, 'PT connector e between names is still a word')
eq(speech.verifyObservedSpeech('Pedro e Ana chegaram.', words('Pedro Ana chegaram.')).ok, false, 'Dropping the connector e is still a mismatch')
// KINEO-FALA-ALEM-DO-CLIPE-2026-09-14 (auditoria, item 7)
eq(speech.verifyObservedSpeech('Hello world', words('Hello world'), { maxEndSeconds: 0.5 }), { ok: false, reason: 'speech_overruns_clip' }, 'Words ending after the usable clip seconds are not accepted')
eq(speech.verifyObservedSpeech('Hello world', words('Hello world'), { maxEndSeconds: 2 }).ok, true, 'Words inside the clip pass')
eq(speech.verifyObservedSpeech('Hello world', words('Hello world'), { maxEndSeconds: 0.7 }).ok, true, '0.25s ASR tolerance')
{
  const rota = fs.readFileSync(new URL('../app/api/compose/route.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  eq(rota.includes('verifyObservedSpeech(c.dialogueLine, words, { maxEndSeconds: tetoReal(cinematicSceneSeconds(c)) })') && rota.includes("const tetoReal = (s: number) => (medicao === 'mvhd' ? Math.min(s, mediaSeconds as number) : Math.min(s, autorizado))"), true, 'compose passes the usable seconds of the clip — real media length when measured, the authorized seconds when unknown — to the verifier')
  eq(/speech\.reason === 'speech_overruns_clip'\) \{[\s\S]{0,900}c\.seconds = Math\.round\(\(lastEnd \+ 0\.3\) \* 10\) \/ 10/.test(rota), true, 'an overrun grows the scene to the last word instead of cutting the speech')
  eq(rota.indexOf('const originalFootageSeconds = hollywoodClips.map(cinematicSceneSeconds)') > rota.indexOf("speech.reason === 'speech_overruns_clip'"), true, 'pre-trim seconds are read after the scene may have grown')
  // Board 14/09: re-checagem depois do teto + o montador confere a duração final
  eq(rota.includes("const recheck = verifyObservedSpeech(c.dialogueLine, words, { maxEndSeconds: tetoReal(cinematicSceneSeconds(c)) })") && rota.includes("code: 'cinematic_dialogue_overruns_clip', recoverable: true,"), true, 'after growing to the cap, the route re-verifies and refuses honestly if speech still overruns')
  const montador = fs.readFileSync(new URL('../lib/compose.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  eq(montador.includes('verifyObservedSpeech(clip.dialogueLine, clip.speechWords, { maxEndSeconds: secondsFor(clip) })'), true, 'the builder verifies speech against the FINAL scene seconds, not only the text')
}
for (const [expected, observed, reason] of [
  ['Hello world', [], 'missing_speech'],
  ['Hello world', words('Goodbye world'), 'script_mismatch'],
  ['Hello world', words('Hello'), 'script_mismatch'],
  ['', words('Hello'), 'missing_script'],
  ['Hello', [{ word: 'Hello', start: -1, end: 1 }], 'invalid_timestamps'],
  ['Hello', [{ word: 'Hello', start: 1, end: 1 }], 'invalid_timestamps'],
]) eq(speech.verifyObservedSpeech(expected, observed), { ok: false, reason }, 'Unverified audio is not accepted')

// Extract exact production syntax nodes, not a copied implementation. Dependency
// injection exercises real statements without unrelated account/billing setup.
const generationSource = fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
const generationAst = ts.createSourceFile('route.ts', generationSource, ts.ScriptTarget.Latest, true)
function findNode(ast, predicate) {
  let found
  function visit(node) { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit) }
  visit(ast)
  assert.ok(found, 'Expected real production node exists')
  return found
}
function evaluate(source, scope) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, ...scope }, { timeout: 5000 })
  return exports
}
const narrationNode = findNode(generationAst, n => ts.isVariableDeclaration(n) && n.name.getText(generationAst) === 'hNarrations')
const planned = [
  { type: 'dialogue', dialogueLine: 'Actor speaks', voiceover: 'Wrong external voice', needsNarration: false },
  { type: 'support', voiceover: 'Narrator explains', needsNarration: true },
  { type: 'cinematic', voiceover: 'The story ends', needsNarration: true },
]
const narrations = evaluate(`export const result = ${narrationNode.initializer.getText(generationAst)}`, { plan: { scenes: planned }, ...speech }).result
eq(narrations, [null, 'Narrator explains', 'The story ends'], 'Actual generation caller never labels dialogue for external narration')
const inputNode = findNode(generationAst, n => ts.isFunctionDeclaration(n) && n.name?.text === 'buildFalInput')
const constants = {
  H3_I2V_MODEL: 'minimax/h3/image-to-video', H3_MODELS: { dialogue: 'minimax/h3/text-to-video' }, H3_RESOLUTION: '768P',
  OMNI_I2V_MODEL: 'google/gemini-omni-flash/image-to-video',
  S25_I2V_MODEL: 's25-i2v', S25_T2V_MODEL: 's25-t2v', S25_RESOLUTION: '720p',
}
const actualInput = evaluate(`export ${inputNode.getText(generationAst)}`, { ...constants, ...load('@/lib/aspect') }).buildFalInput
for (const model of [constants.H3_I2V_MODEL, constants.H3_MODELS.dialogue, constants.OMNI_I2V_MODEL]) {
  const input = actualInput(model, 'An actor says the approved line.', true, true, 8, 'https://example.invalid/anchor.png')
  eq(input.duration, 8, 'Model receives requested scene duration')
  if (model !== constants.H3_MODELS.dialogue) eq(input.image_url, 'https://example.invalid/anchor.png', 'Native image-to-video keeps the intended avatar anchor')
  ok(!Object.hasOwn(input, 'generate_audio'), 'Exact official H3/Omni payload does not invent audio switches')
  ok(!Object.hasOwn(input, 'audio_url'), 'No unsupported input-audio field or extra provider introduced')
}

// Real builder: audio source unchanged, native speech never loops, timestamps
// from the clip (not requested dialogue/scene caption) drive visible captions.
for (const engine of ['dialogue', 'host']) {
  const clip = { engine, url: 'https://example.invalid/actor.mp4', seconds: 5, dialogueLine: 'Hello world', caption: 'UNOBSERVED SCENE LABEL', speechWords: words('Hello world') }
  const source = compose.buildHollywoodCreatomateSource({ clips: [clip], narrationBlocks: [], muteClipAudio: true })
  const video = source.elements.find(e => e.type === 'video')
  eq(video.source, clip.url, 'Avatar/native clip identity is preserved')
  eq(video.loop, false, 'Native dialogue is never replayed to fill a slot')
  eq(video.volume, '100%', 'Speech is not muted by H3/Omni narration policy')
  ok(!source.elements.some(e => e.type === 'audio'), 'No replacement external narrator is added to native dialogue')
  ok(!JSON.stringify(source).includes('UNOBSERVED SCENE LABEL'), 'Scene caption cannot impersonate native speech')
  for (const speechWords of [undefined, [], words('Someone else spoke')]) {
    rejects(() => compose.buildHollywoodCreatomateSource({ clips: [{ ...clip, speechWords }], narrationBlocks: [] }), 'Actual builder rejects missing/different native speech')
  }
  const oneWord = compose.buildHollywoodCreatomateSource({ clips: [{ ...clip, dialogueLine: 'Hello', speechWords: words('Hello') }], narrationBlocks: [] })
  ok(oneWord.elements.some(e => e.type === 'text' && /HELLO/i.test(e.text)), 'One actual spoken word is sufficient; no fabricated fallback')
}

const composeSource = fs.readFileSync('app/api/compose/route.ts', 'utf8')
const composeAst = ts.createSourceFile('route.ts', composeSource, ts.ScriptTarget.Latest, true)
const advanced = findNode(composeAst, n => ts.isIfStatement(n) && n.expression.getText(composeAst).includes("quality === 'cinematic_hollywood'") && n.thenStatement.getText(composeAst).includes('const rawEngines'))
const statements = advanced.thenStatement.statements
const narrationEnd = statements.findIndex(n => ts.isForOfStatement(n) && n.initializer.getText(composeAst) === 'const m')
assert.ok(narrationEnd > 0)
const narrationStatements = statements.slice(0, narrationEnd).map(n => n.getText(composeAst)).join('\n')
ok(statements.slice(0, narrationEnd).some(n => ts.isForOfStatement(n) && n.expression.getText(composeAst) === 'hollywoodClips.entries()'), 'Actual native verification precedes TTS spending')
async function runActualComposeSpeech({ engines = ['dialogue', 'support'], narrations = [null, 'Narrator explains'], dialogues = ['Actor speaks', null], nativeText = 'Actor speaks', nativeWords, sceneSeconds, mediaSeconds = 30, failure, ttsText = 'Narrator explains' } = {}) {
  const calls = [], logs = []
  const input = {
    body: { scene_engines: engines, scene_narrations: narrations, scene_seconds: sceneSeconds ?? engines.map(() => 8), scene_dialogues: dialogues },
    clipUrls: engines.map((_, i) => `https://example.invalid/scene-${i}.mp4`),
    ...speech,
    // The duration workstream now uses the same real timeline policy. This
    // fixture asks for16s of actual2x8s footage, not an implicit missing target.
    ...timeline, duration: engines.length * 8, cinematicSceneMetadataInvalid: false,
    user: { id: 'test-user' }, voiceoverScript: 'Actor speaks Narrator explains', language: 'en', vertical: 'history', explicitSpeed: 1,
    NextResponse: { json: (body, init) => ({ status: init.status, body }) },
    rejectBeforeProviderSubmission: async reply => { calls.push(['release-compose-claim']); return reply },
    resolveHollywoodVoice: () => { calls.push(['pin']); if (failure === 'pin') throw Error('SENTINEL_SECRET'); return { voice: 'approved-voice', defaultSpeed: 1, personaId: 'approved' } },
    // KINEO-VOZ-NA-BOCA-2026-09-11 — o compose prefere a voz gravada no claim; sem claim, cai no pin por roteiro (o caminho que este teste exercita).
    hollywoodVoiceFromClaim: (v) => (v && typeof v === 'object' && v.voice ? { voice: v.voice, defaultSpeed: v.speed ?? 1, personaId: v.persona_id ?? 'claim' } : null),
    cinematicBirthClaim: null,
    synthesizeHostSpeech: async args => { calls.push(['tts', args]); if (failure === 'synth') throw Error('SENTINEL_SECRET'); return failure === 'empty' ? Buffer.alloc(0) : Buffer.from('test-audio') },
    generateTTS: () => { throw Error('Forbidden alternate narrator') },
    estimateMp3DurationSeconds: () => failure === 'duration' ? 0 : 4,
    transcribeTTSWithTimestamps: async () => { calls.push(['asr-tts']); return failure === 'asr' ? [] : words(ttsText) },
    uploadVoiceoverToSupabase: async () => { calls.push(['upload']); if (failure === 'upload') throw Error('SENTINEL_SECRET'); return 'https://example.invalid/same-voice.mp3' },
    transcribeClipWithTimestamps: async () => { calls.push(['asr-native']); return nativeWords ?? words(nativeText) },
    transcribeClipWithTimestampsAndDuration: async () => { calls.push(['asr-native']); return { words: nativeWords ?? words(nativeText), durationSeconds: mediaSeconds } },
    console: { log: (...args) => logs.push(args), warn: (...args) => logs.push(args) }, Buffer,
  }
  const code = `export async function run() { ${narrationStatements}\n return { status: 200, measured, hollywoodClips }; }`
  const reply = await evaluate(code, input).run()
  return { reply, calls, logs }
}
const good = await runActualComposeSpeech()
eq(good.reply.status, 200, 'Actual compose speech orchestration accepts verified mixed scenes')
eq(good.calls.filter(c => c[0] === 'tts').map(c => c[1].voice), ['approved-voice'], 'Only pinned narration voice used; no TTS over actor')
eq(good.reply.measured.length, 1, 'Only support gets external TTS')
eq(good.reply.hollywoodClips[0].speechWords, words('Actor speaks'), 'Native clip transcript reaches actual builder input')
for (const failure of ['pin', 'synth', 'empty', 'duration', 'upload']) {
  const result = await runActualComposeSpeech({ failure })
  eq(result.reply.status, 422, 'No silent narration delivery or persona substitution on failure')
  eq(result.calls.filter(c => c[0] === 'release-compose-claim').length, 1, 'Recoverable pre-submit exit uses existing claim release')
  ok(!JSON.stringify(result.logs).includes('SENTINEL_SECRET'), 'Provider exception details are not logged')
}
for (const nativeText of ['', 'Someone else spoke', 'Actor']) {
  const result = await runActualComposeSpeech({ nativeText })
  eq(result.reply.body.code, 'cinematic_dialogue_unverified', 'Absent, different or truncated speech cannot pass as script')
  eq(result.reply.status, 422, 'Native speech rejection precedes render submission')
  ok(!result.calls.some(c => c[0] === 'tts'), 'Unverified native dialogue stops before extra TTS work')
}
const missing = await runActualComposeSpeech({ narrations: [null, null] })
eq(missing.reply.body.code, 'cinematic_speech_missing', 'Missing support metadata fails before TTS')
ok(!missing.calls.some(c => c[0] === 'tts'), 'No TTS spent on malformed narration metadata')
const wrongTts = await runActualComposeSpeech({ ttsText: 'An unrelated narrator' })
eq(wrongTts.reply.status, 200, 'Unreliable ASR cannot veto trusted TTS generated from canonical text')
eq(wrongTts.reply.measured[0].text, 'Narrator explains', 'Canonical text remains paired with the exact synthesized buffer')
ok(!wrongTts.reply.measured[0].words, 'Unrelated ASR cannot replace the canonical TTS captions')
const missingTtsAsr = await runActualComposeSpeech({ failure: 'asr' })
eq(missingTtsAsr.reply.status, 200, 'Missing ASR uses canonical TTS caption fallback without a new paid call')
ok(!missingTtsAsr.reply.measured[0].words, 'Fallback is explicitly untimed canonical TTS text, not observed speech')
const nativeOnly = await runActualComposeSpeech({ engines: ['dialogue'], narrations: ['Do not narrate over my avatar'], dialogues: ['Actor speaks'] })
eq(nativeOnly.reply.status, 200, 'Native-only avatar uses existing clip audio')
ok(!nativeOnly.calls.some(c => ['pin', 'tts', 'upload'].includes(c[0])), 'Native-only path does not request any substitute voice')

// ═══ KINEO-FALA-ALEM-DO-CLIPE-2026-09-14 — item 7 da auditoria, testes de
// COMPORTAMENTO pedidos pelo Board: transcrição simulada terminando depois
// dos segundos declarados, dentro e além do teto (diálogo 15 s, host 20 s),
// na rota real (mocks injetados) e no montador real.
const spokenUntil = (text, end) => { const ws = text.split(/\s+/).filter(Boolean); return ws.map((word, i) => ({ word, start: i === ws.length - 1 ? end - 0.4 : 0.2 + i * 0.4, end: i === ws.length - 1 ? end : 0.5 + i * 0.4 })) }
for (const [engine, cap, dentro, alem] of [['dialogue', 15, 11.0, 16.0], ['host', 20, 19.0, 22.0]]) {
  // dentro do teto: a cena CRESCE até a última palavra e o compose segue (200), sem TTS sobre a fala nativa
  const cresce = await runActualComposeSpeech({ engines: [engine, 'support'], dialogues: ['Actor speaks', null], nativeWords: spokenUntil('Actor speaks', dentro), sceneSeconds: [8, 8] })
  eq(cresce.reply.status, 200, `${engine}: speech ending at ${dentro}s inside the ${cap}s cap is accepted`)
  eq(cresce.reply.hollywoodClips[0].seconds, Math.round((dentro + 0.3) * 10) / 10, `${engine}: the scene grows to cover the last word (+0.3s)`)
  ok(cresce.logs.some(l => JSON.stringify(l).includes('cena cresce para cobrir a fala')), `${engine}: growth is logged with before/after`)
  eq(cresce.calls.filter(c => c[0] === 'tts').length, 1, `${engine}: only the support scene gets TTS; nothing narrated over the actor`)
  // além do teto: recusa honesta, clipes preservados, nenhuma geração extra
  const estoura = await runActualComposeSpeech({ engines: [engine, 'support'], dialogues: ['Actor speaks', null], nativeWords: spokenUntil('Actor speaks', alem), sceneSeconds: [8, 8] })
  eq(estoura.reply.status, 422, `${engine}: speech ending at ${alem}s beyond the ${cap}s cap is refused`)
  eq(estoura.reply.body.code, 'cinematic_dialogue_overruns_clip', `${engine}: refusal carries its own code`)
  ok(/preserved/.test(estoura.reply.body.error) && estoura.reply.body.recoverable === true, `${engine}: the message says the clips are preserved and the state is recoverable`)
  eq(estoura.calls.map(c => c[0]), ['asr-native', 'release-compose-claim'], `${engine}: after the refusal nothing else runs — no pin, no TTS, no upload, no second generation`)
  eq(estoura.calls.filter(c => c[0] === 'release-compose-claim').length, 1, `${engine}: the compose claim is released exactly once`)
  // montador real: a duração FINAL da cena também barra a fala que passa
  const clipe = { engine, url: 'https://example.invalid/actor.mp4', seconds: cap, dialogueLine: 'Hello world', caption: '' }
  assert.throws(() => compose.buildHollywoodCreatomateSource({ clips: [{ ...clipe, speechWords: spokenUntil('Hello world', cap + 1) }], narrationBlocks: [] }), /unverified dialogue \(speech_overruns_clip\)/, `${engine}: builder refuses speech ending after the final ${cap}s`); checks++
  const cabe = compose.buildHollywoodCreatomateSource({ clips: [{ ...clipe, speechWords: spokenUntil('Hello world', cap - 0.1) }], narrationBlocks: [] })
  ok(cabe.elements.some(e => e.type === 'video' && e.source === clipe.url), `${engine}: builder accepts speech that ends inside the final ${cap}s`)
}

// KINEO-DURACAO-REAL-DO-CLIPE-2026-09-14 — a proteção pendente: o arquivo manda.
{
  const mp4 = load('@/lib/mp4Duration')
  const box = (type, payload) => { const b = Buffer.alloc(8 + payload.length); b.writeUInt32BE(8 + payload.length, 0); b.write(type, 4, 'ascii'); payload.copy(b, 8); return b }
  const mvhd = (timescale, duration) => { const p = Buffer.alloc(100); p.writeUInt32BE(timescale, 12); p.writeUInt32BE(duration, 16); return box('mvhd', p) }
  const file = Buffer.concat([box('ftyp', Buffer.from('isom')), box('mdat', Buffer.alloc(64)), box('moov', Buffer.concat([box('udta', Buffer.alloc(4)), mvhd(1000, 12345)]))])
  eq(mp4.probeMp4DurationSeconds(file), 12.345, 'mvhd (moov at the end, nested after another box) yields the real media duration')
  const p64 = Buffer.alloc(120); p64[0] = 1; p64.writeUInt32BE(90000, 20); p64.writeUInt32BE(0, 24); p64.writeUInt32BE(90000 * 9, 28)
  eq(mp4.probeMp4DurationSeconds(Buffer.concat([box('ftyp', Buffer.from('isom')), box('moov', box('mvhd', p64))])), 9, 'mvhd version 1 (64-bit duration) is read')
  eq(mp4.probeMp4DurationSeconds(Buffer.from('not an mp4 at all, just bytes')), null, 'garbage is null, never a number')
  eq(mp4.probeMp4DurationSeconds(Buffer.concat([box('ftyp', Buffer.from('isom')), box('mdat', Buffer.alloc(32))])), null, 'no moov = null (caller keeps the engine cap)')
  // rota real: fala até 11 s numa cena de 8 s, mas o ARQUIVO tem 9 s → recusa (não cresce além do arquivo)
  const curto = await runActualComposeSpeech({ nativeWords: spokenUntil('Actor speaks', 11.0), sceneSeconds: [8, 8], mediaSeconds: 9 })
  eq(curto.reply.status, 422, 'speech past the real media length is refused even inside the engine cap')
  eq(curto.reply.body.code, 'cinematic_dialogue_overruns_clip', 'same honest refusal code')
  eq(curto.calls.map(c => c[0]), ['asr-native', 'release-compose-claim'], 'nothing else runs after the refusal')
  const cabeNoArquivo = await runActualComposeSpeech({ nativeWords: spokenUntil('Actor speaks', 11.0), sceneSeconds: [8, 8], mediaSeconds: 12 })
  eq(cabeNoArquivo.reply.status, 200, 'speech inside the real media length grows the scene')
  eq(cabeNoArquivo.reply.hollywoodClips[0].seconds, 11.3, 'grown to the last word (+0.3s) within the file')
  // Fundador 14/09: duração DESCONHECIDA → a cena não cresce além do autorizado só pelo Whisper; clipes preservados; nada declarado como medido
  const semCabecalho = await runActualComposeSpeech({ nativeWords: spokenUntil('Actor speaks', 11.0), sceneSeconds: [8, 8], mediaSeconds: null })
  eq(semCabecalho.reply.status, 422, 'unknown media length: speech past the authorized 8s is refused, not grown on Whisper alone')
  eq(semCabecalho.reply.body.code, 'cinematic_dialogue_overruns_clip', 'same honest refusal code')
  ok(/preserved/.test(semCabecalho.reply.body.error), 'clips are preserved')
  eq(semCabecalho.calls.map(c => c[0]), ['asr-native', 'release-compose-claim'], 'nothing else runs')
  ok(semCabecalho.logs.some(l => JSON.stringify(l).includes('"medicao":"desconhecida"')), 'the log says the measurement is unknown, never a measured number')
  const semCabecalhoCabe = await runActualComposeSpeech({ nativeWords: spokenUntil('Actor speaks', 7.5), sceneSeconds: [8, 8], mediaSeconds: null })
  eq(semCabecalhoCabe.reply.status, 200, 'unknown media length: speech inside the authorized seconds still passes')
  eq(semCabecalhoCabe.reply.hollywoodClips[0].seconds, 8, 'and the scene keeps its authorized seconds')
  ok(cabeNoArquivo.logs.some(l => JSON.stringify(l).includes('"medicao":"mvhd"')), 'a real measurement is labeled by its method')
}

// Native support audio is subordinate to the explicit per-scene narration.
const supportClips = ['support', 'cinematic'].map((engine, i) => ({ engine, seconds: 8, url: `https://example.invalid/support-${i}.mp4`, caption: '' }))
for (const narratedScene of [0, 1]) {
  const narration = { time: narratedScene * 8, endCap: narratedScene * 8 + 8, audioDuration: 4, url: 'https://example.invalid/narrator.mp3', text: 'Approved narrator speaks.' }
  const result = compose.buildHollywoodCreatomateSource({ clips: supportClips, narrationBlocks: [narration], muteClipAudio: false })
  const clips = result.elements.filter(e => e.type === 'video')
  eq(clips.map(c => c.volume), narratedScene === 0 ? ['0%', '55%'] : ['35%', '0%'], 'Only narrated support/cinematic scenes lose competing native audio')
  eq(result.elements.filter(e => e.type === 'audio').map(e => e.source), [narration.url], 'The intended narration recording remains the sole speech source')
}

// The actual explicitly-cloned-voice route branch, including its scoped profile
// lookup and its return, is executed with a simulated profile/provider only.
const cloneNode = findNode(composeAst, n => ts.isIfStatement(n) && n.expression.getText(composeAst) === 'useClonedVoice' && n.thenStatement.getText(composeAst).includes('voice_clone_id'))
async function runCloneBranch({ requested = true, failure } = {}) {
  const calls = [], logs = []
  const query = {
    select(column) { calls.push(['select', column]); return this },
    eq(column, value) { calls.push(['owner', column, value]); return this },
    async single() { return { data: { voice_clone_id: failure === 'missing' ? null : 'selected-clone' }, error: failure === 'lookup' ? { message: 'SENTINEL_SECRET' } : null } },
  }
  const scope = {
    useClonedVoice: requested, user: { id: 'verified-owner' }, scaledScript: 'Speak this exact line.', language: 'en',
    supabase: { from(table) { calls.push(['table', table]); return query } },
    require: name => {
      assert.equal(name, '@/lib/avatar/voice')
      return { synthesizeWithVoice: async args => { calls.push(['clone-synth', args]); if (failure === 'provider') throw Error('SENTINEL_SECRET'); return failure === 'empty' ? Buffer.alloc(0) : Buffer.from('selected-clone-audio') } }
    },
    console: { log: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    NextResponse: { json: (body, init) => ({ status: init.status, body }) },
    rejectBeforeProviderSubmission: async response => { calls.push(['reject-before-provider']); return response },
  }
  const runner = evaluate(`export async function run() { let audioBuffer = null; let clonedVoiceUsed = false; ${cloneNode.getText(composeAst)}; return { status: 200, clonedVoiceUsed, bytes: audioBuffer?.length ?? 0 }; }`, scope)
  return { response: await runner.run(), calls, logs }
}
for (const failure of ['lookup', 'missing', 'provider', 'empty']) {
  const result = await runCloneBranch({ failure })
  eq(result.response.status, 422, 'An explicitly requested clone cannot fall through to default voice/cache')
  eq(result.response.body.qualityCheckFailed, true, 'Voice failure is marked for root quality settlement/UX')
  eq(result.response.body.code, 'requested_voice_unavailable', 'Voice ownership failure has a stable quality code')
  ok(result.calls.some(c => c[0] === 'owner' && c[1] === 'id' && c[2] === 'verified-owner'), 'Existing profile lookup stays scoped to authenticated user')
  ok(!JSON.stringify(result.logs).includes('SENTINEL_SECRET'), 'Clone provider/profile details stay out of logs')
}
const cloneSuccess = await runCloneBranch()
eq(cloneSuccess.response.status, 200, 'A healthy selected clone still succeeds')
eq(cloneSuccess.response.clonedVoiceUsed, true, 'Healthy clone skips subsequent default voice/cache paths')
eq(cloneSuccess.calls.find(c => c[0] === 'clone-synth')[1], { voiceId: 'selected-clone', text: 'Speak this exact line.', language: 'en' }, 'Same selected identity and exact script reach synthesis')
const notRequested = await runCloneBranch({ requested: false })
eq(notRequested.response.status, 200, 'Default voice flow is untouched when clone was not requested')
eq(notRequested.calls.length, 0, 'No clone/profile lookup when unrequested')
console.log(`cinematic-speech: ${checks} passed; real production payload/compose branches/builder; no external calls`)
