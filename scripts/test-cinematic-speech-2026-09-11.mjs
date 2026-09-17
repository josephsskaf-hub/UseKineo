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
  H3_PROMPT_EXPANSION: 'disabled', // KINEO-H3-SEM-REESCRITA-2026-09-16
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
// ═══ KINEO-MOTORES-ESPECIFICOS-2026-09-14 (MOTOR-AUTO, pedido do Board) ═══
// Até aqui o payload real só era executado para H3/Omni e com constantes
// INJETADAS (S25 '720p' — o router diz '480p'). Agora o ROUTER REAL escolhe o
// modelo por família e o buildFalInput REAL monta o payload de Kling 3, Omni e
// Seedance 2.5; a rota real declara os tetos por família; e a cadeia
// cena de diálogo → narração → payload → compose é executada por família.
{
  const loadReal = createOfflineLoader({ mocks: { '@fal-ai/client': { fal: { config() {}, subscribe() { throw Error('provider forbidden') }, queue: { submit() { throw Error('provider forbidden') } } } } } })
  const router = loadReal('@/lib/hollywood/router')
  const real = { KLING3_MODEL: router.HOLLYWOOD_MODELS.dialogue, KLING3_I2V_MODEL: router.KLING3_I2V_MODEL, H3_I2V_MODEL: router.H3_I2V_MODEL, H3_MODELS: router.H3_MODELS, H3_RESOLUTION: router.H3_RESOLUTION, H3_PROMPT_EXPANSION: router.H3_PROMPT_EXPANSION, OMNI_I2V_MODEL: router.OMNI_I2V_MODEL, S25_I2V_MODEL: router.S25_I2V_MODEL, S25_T2V_MODEL: router.S25_T2V_MODEL, S25_RESOLUTION: router.S25_RESOLUTION }
  const realInput = evaluate(`export ${inputNode.getText(generationAst)}`, { ...real, ...load('@/lib/aspect') }).buildFalInput
  const anchor = 'https://example.invalid/anchor.png'
  // Kling 3 — família 'hollywood': com âncora i2v (fala nativa ligada), sem âncora t2v.
  const k3i2v = router.cinematicSceneModel('hollywood', 'dialogue', true), k3t2v = router.cinematicSceneModel('hollywood', 'support', false)
  eq([k3i2v, k3t2v], ['fal-ai/kling-video/o3/pro/image-to-video', 'fal-ai/kling-video/v3/pro/text-to-video'], 'Kling 3: router picks O3 Pro i2v with anchor, v3 Pro t2v without')
  const k3d = realInput(k3i2v, 'The person says: "Approved line."', true, true, 8, anchor)
  eq(k3d, { image_url: anchor, prompt: 'The person says: "Approved line."', duration: '8', generate_audio: true }, 'Kling 3 i2v: exact payload — string duration, native audio ON, aspect inherited from the anchor')
  eq([realInput(k3i2v, 'x', true, true, 20, anchor).duration, realInput(k3i2v, 'x', true, true, 2, anchor).duration, realInput(k3i2v, 'x', true, true, undefined, anchor).duration], ['15', '3', '10'], 'Kling 3 i2v: seconds clamp to the 3..15 string range, default 10')
  const k3s = realInput(k3t2v, 'Wide shot of the bay.', true, true, 8)
  eq([k3s.duration, k3s.aspect_ratio, k3s.generate_audio, k3s.cfg_scale], ['8', '9:16', true, 0.6], 'Kling 3 t2v: string duration, explicit 9:16, native audio ON, cfg_scale 0.6')
  ok(/^cartoon, anime, illustration, 3d render, /.test(k3s.negative_prompt) && /chinese text/.test(k3s.negative_prompt), 'Kling 3 t2v: anti-CGI + anti-Chinese-text negatives by default')
  ok(!/cartoon/.test(realInput(k3t2v, 'x', true, true, 8, undefined, undefined, true).negative_prompt), 'Kling 3 t2v: stylized film drops the anti-CGI negatives')
  // Omni Flash — família 'omni': só i2v existe no fal; sem âncora cai no Kling t2v.
  eq([router.cinematicSceneModel('omni', 'dialogue', true), router.cinematicSceneModel('omni', 'support', false)], [real.OMNI_I2V_MODEL, k3t2v], 'Omni: anchored scenes go to Omni i2v; without anchor the router falls back to Kling t2v')
  const om = realInput(real.OMNI_I2V_MODEL, 'Storm over the bay.', true, true, 8, anchor)
  eq(om, { image_url: anchor, prompt: 'Storm over the bay.', aspect_ratio: '9:16', duration: 8 }, 'Omni i2v: exact payload — explicit 9:16 (default would be 16:9), INTEGER duration, no audio switch, no resolution')
  eq([realInput(real.OMNI_I2V_MODEL, 'x', true, true, 12, anchor).duration, realInput(real.OMNI_I2V_MODEL, 'x', true, true, 2, anchor).duration], [10, 3], 'Omni i2v: seconds clamp to the 3..10 integer range')
  // Seedance 2.5 — família 's25': i2v com âncora, t2v sem; 480p real; áudio nativo DESLIGADO.
  eq([router.cinematicSceneModel('s25', 'dialogue', true), router.cinematicSceneModel('s25', 'support', false)], [real.S25_I2V_MODEL, real.S25_T2V_MODEL], 'S25: router picks seedance-2.5 i2v with anchor, t2v without')
  eq(realInput(real.S25_I2V_MODEL, 'Storm over the bay.', true, true, 8, anchor), { image_url: anchor, prompt: 'Storm over the bay.', duration: '8', resolution: '480p', generate_audio: false }, 'S25 i2v: exact payload — string duration, REAL 480p (not the 720p the old fixture assumed), native audio OFF')
  eq(realInput(real.S25_T2V_MODEL, 'Storm over the bay.', true, true, 8), { prompt: 'Storm over the bay.', duration: '8', resolution: '480p', aspect_ratio: '9:16', generate_audio: false }, 'S25 t2v: explicit 9:16 (schema default is auto) — executable replacement for the stale regex in test-motores-d1')
  eq([realInput(real.S25_I2V_MODEL, 'x', true, true, 35, anchor).duration, realInput(real.S25_I2V_MODEL, 'x', true, true, 2, anchor).duration], ['30', '4'], 'S25: seconds clamp to the 4..30 string range')
  // Tetos por família declarados na ROTA real (não na policy): Omni 10/10, demais 12/15.
  const capDecl = (name) => findNode(generationAst, n => ts.isVariableDeclaration(n) && n.name.getText(generationAst) === name).initializer.getText(generationAst)
  for (const [family, caps] of [['omni', [10, 10]], ['hollywood', [12, 15]], ['h3', [12, 15]], ['s25', [12, 15]]]) {
    eq([vm.runInNewContext(capDecl('SCENE_CAP'), { family }), vm.runInNewContext(capDecl('DIALOGUE_CAP'), { family })], caps, `${family}: real route caps SCENE_CAP/DIALOGUE_CAP`)
  }
  // Apara-folga do Omni (bloco real `if (family === 'omni')`): só cena narrada com gordura encolhe, até alvo+4; verbatim é no-op.
  const omniTrim = findNode(generationAst, n => ts.isIfStatement(n) && n.expression.getText(generationAst) === "family === 'omni'" && n.thenStatement.getText(generationAst).includes('KINEO-OMNI-ALVO'))
  const trimFn = evaluate(`export function run(family, plan, hollywoodTarget) { ${omniTrim.getText(generationAst)} }`, { console: { log() {} } }).run
  const runTrim = (scenes, target) => { const plan = { scenes: scenes.map(s => ({ ...s })) }; trimFn('omni', plan, target); return plan.scenes }
  const ten = Array(10).fill('w').join(' ')
  const fat = runTrim([{ type: 'dialogue', seconds: 10, dialogueLine: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }, { type: 'support', seconds: 10, voiceover: ten }], 60)
  eq(fat.reduce((a, s) => a + s.seconds, 0), 64, 'Omni: an 80s plan with slack is trimmed to target+4')
  eq(fat[0].seconds, 10, 'Omni: dialogue scenes are never trimmed')
  ok(fat.every(s => s.seconds >= 5) && fat.every(s => (s.voiceover ?? s.dialogueLine) === ten), 'Omni: no scene below what its own words sustain, and no word touched')
  const tight = [{ type: 'support', seconds: 5, voiceover: ten }, { type: 'support', seconds: 5, voiceover: ten }]
  eq(runTrim(tight, 4), tight, 'Omni: a verbatim plan (no slack) is a no-op even above target+4')
  // CADEIA POR FAMÍLIA — cena de diálogo forçada pelo planner (hostFits) sem olhar a família:
  // narração real → null (sem TTS); o payload decide se o clipe TEM fala; o compose real exige fala verificada.
  const dialogueScene = [{ type: 'dialogue', dialogueLine: 'Actor speaks', needsNarration: false }, { type: 'support', voiceover: 'Narrator explains', needsNarration: true }]
  eq(speech.sceneNarrationsForPlan(dialogueScene), [null, 'Narrator explains'], 'Any family: the dialogue scene gets no external narration')
  eq(realInput(k3i2v, 'x', true, true, 8, anchor).generate_audio, true, 'Kling 3: the dialogue clip is generated WITH native speech')
  const k3Film = await runActualComposeSpeech({ nativeText: 'Actor speaks' })
  eq(k3Film.reply.status, 200, 'Kling 3: verified native speech composes')
  eq(realInput(router.cinematicSceneModel('s25', 'dialogue', true), 'x', true, true, 8, anchor).generate_audio, false, 'S25: the same dialogue clip is generated WITHOUT any speech')
  const s25Film = await runActualComposeSpeech({ nativeWords: [] })
  eq([s25Film.reply.status, s25Film.reply.body.code], [422, 'cinematic_dialogue_unverified'], 'S25: a silent dialogue clip can never compose — the film dies after the provider was paid')
  ok(!s25Film.calls.some(c => c[0] === 'tts'), 'S25: and no TTS rescues it (dialogue has no narration text)')
  // ═══ KINEO-S25-FALA-SEM-VOZ-2026-09-14 (Board, MOTORES-ESPECIFICOS-R2) ═══
  // O contrato certo: o PEDIDO é preservado (apresentador pedido continua
  // apresentador em toda família) e o fallback nativo INVÁLIDO do S25 é
  // protegido — pelo caminho REAL do host (if extraído por AST, TTS/upload/
  // submit mockados, rede proibida), pela condição REAL do `if` nativo, pelos
  // portões pré-gasto reais e pelo ledger real. Vermelho em cb5f746b (apagava o
  // host) e em d6f61835 (diálogo S25 sem host ia ao POST nativo mudo).
  const facelessDecl = capDecl('facelessRequested')
  const visualMode = load('@/lib/cinematic/visualMode')
  const decide = (engine, modo) => vm.runInNewContext(facelessDecl, { permiteApresentador: visualMode.permiteApresentador, formatoVisual: { modo }, body: { engine } })
  eq([decide('hollywood', 'presenter'), decide('h3', 'presenter'), decide('omni', 'presenter'), decide('s25', 'presenter')], [false, false, false, false], 'A requested presenter is preserved in EVERY family — S25 included (no silent format conversion)')
  eq([decide('s25', 'documentary_faceless'), decide('hollywood', 'documentary_faceless')], [true, true], 'Documentary stays faceless by content, not by engine')

  // Caminho REAL do laço: host `if` + retenção + condição do `if` nativo (corpo trocado por um espião).
  const hostIf = findNode(generationAst, n => ts.isIfStatement(n) && n.expression.getText(generationAst).startsWith('hostTtsEnabled && anchors && hostVoice'))
  const loopBlock = hostIf.parent
  const stmts = loopBlock.statements
  const hostIdx = stmts.indexOf(hostIf)
  const nativeIf = stmts.slice(hostIdx + 1).find(s => ts.isIfStatement(s) && s.expression.getText(generationAst).startsWith('!id'))
  ok(nativeIf, 'the native-payload if follows the host if inside the real submit loop')
  const between = stmts.slice(hostIdx + 1, stmts.indexOf(nativeIf)).map(s => s.getText(generationAst)).join('\n')
  const loopCode = `export const run = (async () => { let id = null, sceneModel = 'planned-model', sceneEngine = hs.type; const idx = 0; const hHeldByPolicy = new Set(); const hHostAttempts = new Map()
    for (const once of [0]) { ${hostIf.getText(generationAst)}\n${between}\nif (${nativeIf.expression.getText(generationAst)}) { calls.push(['native-post', family, hs.type]) } }
    return { id, sceneModel, sceneEngine, held: hHeldByPolicy.has(0), dispositions: hDispositions.slice(), requestIds: hRequestIds.slice(), hostAttempt: hHostAttempts.get(0) ?? null } })`
  // R5 §1 — a classe REAL do adaptador (lib/avatar/veed.ts), extraída por AST:
  // `status` só existe depois do fetch; é nela que a rota decide se houve POST.
  const veedSource = fs.readFileSync('lib/avatar/veed.ts', 'utf8')
  const veedAst = ts.createSourceFile('veed.ts', veedSource, ts.ScriptTarget.Latest, true)
  const veedErrorClass = findNode(veedAst, n => ts.isClassDeclaration(n) && n.name?.text === 'AvatarSubmitError')
  const veedSubmitOnce = findNode(veedAst, n => ts.isFunctionDeclaration(n) && n.name?.text === 'submitQueueOnce')
  const veedApi = (fetchImpl, env = { FAL_KEY: 'offline-fixture-not-a-secret' }) => evaluate(`export ${veedErrorClass.getText(veedAst)}\nexport ${veedSubmitOnce.getText(veedAst)}`, { process: { env }, fetch: fetchImpl })
  const { AvatarSubmitError } = veedApi(() => { throw Error('network forbidden') })
  const hostScope = ({ family, type = 'dialogue', hostOn = true, anchors = { portraitUrl: 'https://offline.invalid/portrait.png' }, voice = { voice: 'approved', defaultSpeed: 1 }, submit = async () => 'offline-host-id', earlierIds = [], tts, upload }) => {
    const calls = []
    const hRequestIds = earlierIds.slice(), hDispositions = earlierIds.map(() => 'accepted'), hModels = [], hEngines = [], hSubmittedPrompts = [], hRecusas = earlierIds.map(() => null)
    const ctxStub = { submittedPrompts: {}, ultimaRecusa: null }
    const scope = {
      family, hostTtsEnabled: hostOn, anchors, hostVoice: voice, calls, hRequestIds, hDispositions, hModels, hEngines, hSubmittedPrompts, hRecusas,
      hs: { index: 1, type, dialogueLine: type === 'dialogue' ? 'I am the presenter. This is my story.' : '', seconds: 8, prompt: 'x' },
      hostUserSpeed: 1, hostPerformancePrompt: 'approved performance', user: { id: 'internal-fixture' }, submittedPrompt: 'x',
      synthesizeHostSpeech: async a => { calls.push(['tts', a.text]); if (tts) return tts(); return Buffer.from('offline') },
      estimateMp3DurationSeconds: () => 8, uploadVoiceoverToSupabase: async () => { calls.push(['upload']); if (upload) return upload(); return 'https://offline.invalid/voice.mp3' },
      submitAvatarJob: async a => { calls.push(['host-submit', a.engine]); return submit() },
      HOST_PRESENTER_MODEL: 'offline-host-model', AvatarSubmitError, cinematicSubmissionUncertain: false, providerSubmissionMayExist: false,
      cinematicSceneModel: (fam, t, anchored) => `${fam}/${t}/${anchored ? 'i2v' : 't2v'}`, ctxDespacho: () => ctxStub,
      console: { log() {}, warn() {} }, fetch() { throw Error('network forbidden') }, Buffer, Math,
    }
    return { scope, calls }
  }
  const runLoop = async (opts) => { const { scope, calls } = hostScope(opts); const r = await evaluate(loopCode, scope).run(); return { ...r, calls } }
  const healthy = await runLoop({ family: 's25' })
  eq([healthy.id, healthy.sceneEngine, healthy.sceneModel, healthy.held], ['offline-host-id', 'host', 'offline-host-model', false], 'S25 healthy host: the presenter keeps its voice (TTS + lip-sync), sceneEngine=host')
  eq(healthy.calls, [['tts', 'I am the presenter. This is my story.'], ['upload'], ['host-submit', 'presenter']], 'S25 healthy host: exactly one TTS, one upload, one presenter submit — and NO native post')
  const explicitFail = await runLoop({ family: 's25', submit: async () => null })
  eq([explicitFail.id, explicitFail.sceneEngine, explicitFail.held], [null, 'dialogue', true], 'S25 explicit host failure: the dialogue scene is HELD (local policy), not converted')
  ok(!explicitFail.calls.some(c => c[0] === 'native-post'), 'S25 explicit host failure: the silent native POST never happens')
  const hostOff = await runLoop({ family: 's25', hostOn: false })
  eq([hostOff.held, hostOff.calls], [true, []], 'S25 with host switched off: no TTS, no native post — held')
  const noAnchor = await runLoop({ family: 's25', anchors: null })
  eq([noAnchor.held, noAnchor.calls], [true, []], 'S25 without portrait anchor: held, nothing posted')
  const noVoice = await runLoop({ family: 's25', voice: null })
  eq([noVoice.held, noVoice.calls], [true, []], 'S25 without pinned voice: held, nothing posted')
  const s25Support = await runLoop({ family: 's25', type: 'support' })
  eq([s25Support.held, s25Support.calls], [false, [['native-post', 's25', 'support']]], 'S25 support/documentary scene stays eligible for the native path')
  for (const fam of ['hollywood', 'h3', 'omni']) {
    const nat = await runLoop({ family: fam, submit: async () => null })
    eq([nat.held, nat.id, nat.sceneEngine, nat.calls.at(-1)], [false, null, 'dialogue', ['native-post', fam, 'dialogue']], `${fam}: explicit host failure still falls back to the native-audio path (unchanged)`)
    const hz = await runLoop({ family: fam })
    eq([hz.sceneEngine, hz.calls.some(c => c[0] === 'native-post')], ['host', false], `${fam}: healthy host unchanged`)
  }
  const ambiguous = await runLoop({ family: 's25', submit: async () => { throw new AvatarSubmitError('presenter POST timed out', { ambiguous: true, status: 504 }) }, earlierIds: ['earlier-accepted-id'] })
  eq([ambiguous.id, ambiguous.held, ambiguous.dispositions, ambiguous.requestIds, ambiguous.calls.some(c => c[0] === 'native-post')], [null, false, ['accepted', 'ambiguous'], ['earlier-accepted-id', null], false], 'S25 ambiguous host failure: existing protection intact — no second job, earlier IDs preserved, not re-labelled as policy hold')
  await assert.rejects(runLoop({ family: 's25', submit: async () => { throw new AvatarSubmitError('presenter POST timed out', { ambiguous: true, status: 504 }) } }), /timed out/, 'S25 ambiguous failure with no earlier IDs still propagates (claim stays pending)'); checks++

  // Portões PRÉ-GASTO reais (antes das âncoras / antes do laço): extraídos e executados com estorno mockado.
  const pre = findNode(generationAst, n => ts.isVariableStatement(n) && n.declarationList.declarations[0].name.getText(generationAst) === 's25DialogueScenes')
  const rejectFn = findNode(generationAst, n => ts.isVariableStatement(n) && n.declarationList.declarations[0].name.getText(generationAst) === 'rejectS25DialogueWithoutHost')
  const gates = []
  { const visit = n => { if (ts.isIfStatement(n) && n.expression.getText(generationAst).startsWith('s25DialogueScenes > 0')) gates.push(n); ts.forEachChild(n, visit) }; visit(generationAst) }
  eq(gates.length, 2, 'two pre-spend gates exist: before the anchors (switch off) and before the loop (anchor/voice missing)')
  const gateCode = `export const run = (async () => { ${pre.getText(generationAst)}\n${rejectFn.getText(generationAst)}\n${gates[0].getText(generationAst)}\nanchorsSpent()\n${gates[1].getText(generationAst)}\nreturn null })`
  const runGates = async ({ family, scenes, hostOn = true, anchors = {}, hostVoice = {}, refunded = true, released = true }) => {
    const calls = []
    const scope = { family, plan: { scenes }, hostTtsEnabled: hostOn, anchors, hostVoice, user: { id: 'u' }, generationId: 'g', formatoVisual: { modo: 'presenter' },
      confirmCinematicRefund: async () => { calls.push(['refund']); return refunded }, releaseBirthClaim: async (reason) => { calls.push(['release', reason]); return released },
      writeServerEvent: async (e) => { calls.push(['event', e.name, e.metadata.anchors_generated, e.metadata.scene_posts]) }, anchorsSpent: () => calls.push(['anchors']), ctxDespacho: () => ({}),
      NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) }, console: { warn() {}, log() {} }, Boolean, fetch() { throw Error('network forbidden') } }
    const res = await evaluate(gateCode, scope).run()
    return { res, calls }
  }
  const dlg = [{ type: 'dialogue', dialogueLine: 'Hi', seconds: 8 }, { type: 'support', voiceover: 'v', seconds: 8 }]
  const off = await runGates({ family: 's25', scenes: dlg, hostOn: false })
  eq([off.res.status, off.res.body.reason, off.res.body.retryable, off.calls], [422, 's25_dialogue_without_host', false, [['refund'], ['release', 's25_dialogue_without_host'], ['event', 's25_dialogue_without_host', false, 0]]], 'S25 presenter with the host switch off: stops BEFORE the anchors — no anchor spend, no scene post, refund confirmed then claim released, event written')
  ok(off.res.body.error.includes('credits are back') && off.res.body.error.includes('No video scene was started'), 'refund is only claimed to the customer when confirmed')
  const offUnconfirmed = await runGates({ family: 's25', scenes: dlg, hostOn: false, refunded: false })
  eq([offUnconfirmed.res.status, offUnconfirmed.res.body.refunded, offUnconfirmed.res.body.claimReleased, offUnconfirmed.calls.some(c => c[0] === 'release')], [422, false, false, false], 'unconfirmed refund: the claim is NOT released and nothing is promised')
  ok(!offUnconfirmed.res.body.error.includes('credits are back'), 'unconfirmed refund: the message does not say the credits are back')
  const noAnch = await runGates({ family: 's25', scenes: dlg, anchors: null })
  eq([noAnch.res.status, noAnch.res.body.motivo, noAnch.calls[0], noAnch.calls.at(-1)], [422, 'the portrait anchor could not be generated', ['anchors'], ['event', 's25_dialogue_without_host', false, 0]], 'S25 presenter without anchors: stops before the loop (anchor attempt already made, no scene post)')
  const noVoicePre = await runGates({ family: 's25', scenes: dlg, hostVoice: null })
  eq([noVoicePre.res.status, noVoicePre.res.body.motivo, noVoicePre.calls.at(-1)], [422, 'no presenter voice could be pinned', ['event', 's25_dialogue_without_host', true, 0]], 'S25 presenter without a pinned voice: stops before the loop; anchors recorded as spent (our cost, not hidden)')
  const s25Doc = await runGates({ family: 's25', scenes: [{ type: 'support', voiceover: 'v', seconds: 8 }], hostOn: false, anchors: null, hostVoice: null })
  eq([s25Doc.res, s25Doc.calls], [null, [['anchors']]], 'S25 narrated film (no dialogue scene): no gate fires, generation proceeds')
  for (const fam of ['hollywood', 'h3', 'omni']) {
    const other = await runGates({ family: fam, scenes: dlg, hostOn: false, anchors: null, hostVoice: null })
    eq([other.res, other.calls], [null, [['anchors']]], `${fam}: presenter without host is NOT gated (native speech exists) — unchanged`)
  }

  // Ledger REAL (ctx.outcomes): cena retida sem tentativa = recusa nossa, sem POST.
  const ledger = findNode(generationAst, n => ts.isBlock(n) && n.statements.length === 2 && n.getText(generationAst).includes('c.outcomes[i] = {') && n.getText(generationAst).includes('hDispositions[i]'))
  const disposition = load('@/lib/cinematic/sceneDisposition')
  const dispatch = load('@/lib/cinematic/dispatchScenes')
  const runLedger = (dispositions, heldIdx, hostAttempts = new Map()) => {
    const c = { outcomes: [], attempts: [], totalPosts: 0 }
    vm.runInNewContext(ts.transpileModule(ledger.getText(generationAst), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { ctxDespacho: () => c, plan: { scenes: dispositions.map(() => ({})) }, hDispositions: dispositions, hRecusas: dispositions.map(() => null), hModels: dispositions.map(() => 'm'), hHeldByPolicy: new Set(heldIdx), hHostAttempts: hostAttempts, claimQuality: 'q', classifyProviderFailure: disposition.classifyProviderFailure })
    return c
  }
  const led = runLedger(['accepted', 'explicit_reject', 'accepted'], [1])
  eq([led.outcomes[1].reason_class, led.outcomes[1].attempt_count, led.attempts[1], led.totalPosts], ['local_policy_gate', 0, [], 2], 'held S25 scene WITHOUT a host attempt: local_policy_gate, zero attempts, not counted as a provider POST')
  eq([led.outcomes[0].reason_class, led.outcomes[0].attempt_count, led.attempts[0].length], ['ok', 1, 1], 'accepted scenes keep their ledger entry')
  const ledReject = runLedger(['explicit_reject'], [])
  eq([ledReject.outcomes[0].reason_class, ledReject.totalPosts], ['unknown', 1], 'a provider explicit reject is still one counted POST with class unknown (unchanged)')
  eq(dispatch.invarianteFecha(disposition.summarize(led.outcomes, 3)), true, 'the dispatch invariant still closes with a held scene (rejected by us, never a phantom)')

  // ═══ KINEO-S25-FALA-SEM-VOZ-R5-2026-09-14 (Board, MOTORES-ESPECIFICOS-R4) ═══
  // §1 — o POST REAL do host não some do ledger. §2 — uma fala retida nunca vira
  // sucesso normal. Prova numa só corrida: o corpo INTEIRO do laço real
  // (declarações, host `if`, retenção, condição nativa com espião, cauda com o
  // `break`), o `submitQueueOnce` REAL do adaptador com fetch em memória, o
  // preenchimento real de slots, o ledger real, o desfecho real
  // (`if (hHeldByPolicy.size > 0)` + `rejectS25DialogueWithoutHost`) e, quando
  // ele não dispara, a expressão real do piso. Rede proibida.
  const loopStmt = findNode(generationAst, n => ts.isForOfStatement(n) && n.initializer.getText(generationAst) === 'const [idx, hs]' && n.expression.getText(generationAst) === 'plan.scenes.entries()' && n.statement.getText(generationAst).includes('s25DialogueHeld'))
  ok(stmts === loopStmt.statement.statements, 'the host if / hold / native if live inside the real per-scene submit loop')
  const fillWhile = findNode(generationAst, n => ts.isWhileStatement(n) && n.expression.getText(generationAst) === 'hRequestIds.length < plan.scenes.length')
  const heldOutcome = findNode(generationAst, n => ts.isIfStatement(n) && n.expression.getText(generationAst) === 'hHeldByPolicy.size > 0')
  const floorIf = findNode(generationAst, n => ts.isIfStatement(n) && n.expression.getText(generationAst).includes('hValid.length === 0 || hSubmittedSec'))
  const decl = name => findNode(generationAst, n => ts.isVariableDeclaration(n) && n.name.getText(generationAst) === name).initializer.getText(generationAst)
  const bodyWithSpy = stmts.map(s => s === nativeIf ? `if (${nativeIf.expression.getText(generationAst)}) { calls.push(['native-post', family, hs.type, idx]); id = 'native-' + idx }` : s.getText(generationAst)).join('\n')
  const fullCode = `export const run = (async () => {
    const hRequestIds = [], hDispositions = [], hModels = [], hEngines = [], hSubmittedPrompts = [], contratoRelato = [], hRecusas = []
    const hHeldByPolicy = new Set(); const hHostAttempts = new Map()
    let cinematicSubmissionUncertain = false, providerSubmissionMayExist = false
    ${pre.getText(generationAst)}
    ${rejectFn.getText(generationAst)}
    for (const [idx, hs] of plan.scenes.entries()) {\n${bodyWithSpy}\n}
    ${fillWhile.getText(generationAst)}
    ${ledger.getText(generationAst)}
    const hValid = hRequestIds.filter((id) => id !== null)
    const hPlannedSec = ${decl('hPlannedSec')}
    const hSubmittedSec = ${decl('hSubmittedSec')}
    const response = await (async () => { ${heldOutcome.getText(generationAst)}
      return null })()
    const floorAbort = response ? undefined : ${floorIf.expression.getText(generationAst)}
    return { outcome: response ? 'explicit_outcome' : 'normal_success', response, floorAbort, requestIds: hRequestIds.slice(), models: hModels.slice(), engines: hEngines.slice(), dispositions: hDispositions.slice(), held: [...hHeldByPolicy], hSubmittedSec, hPlannedSec }
  })`
  const runFull = async ({ scenes, family = 's25', fetchImpl, tts, upload, refunded = true, released = true, hostOn = true, anchors = { portraitUrl: 'https://offline.invalid/portrait.png', environmentUrl: 'https://offline.invalid/env.png' } }) => {
    const calls = []
    const api = veedApi(async (url, init) => { calls.push(['provider-post', init.method]); return fetchImpl(url, init) })
    const c = { outcomes: [], attempts: [], totalPosts: 0, submittedPrompts: {}, claimAction: 'unknown', refundConfirmed: null, planned: 0 }
    const scope = {
      family, plan: { scenes: scenes.map(s => ({ ...s })), environmentSheet: '', characterSheet: '' }, hostTtsEnabled: hostOn, anchors, hostVoice: { voice: 'approved', defaultSpeed: 1 }, hostUserSpeed: 1, hostPerformancePrompt: 'approved performance',
      user: { id: 'internal-fixture' }, generationId: 'gen-fixture', formatoVisual: { modo: 'presenter' }, eraSuffix: '', claimQuality: 'cinematic_s25', calls,
      synthesizeHostSpeech: async a => { calls.push(['tts', a.text]); if (tts) return tts(); return Buffer.from('offline') },
      estimateMp3DurationSeconds: () => 5, uploadVoiceoverToSupabase: async () => { calls.push(['upload']); if (upload) return upload(); return 'https://offline.invalid/voice.mp3' },
      submitAvatarJob: async a => { calls.push(['host-submit', a.engine]); return api.submitQueueOnce('fixture-host-model', {}) },
      AvatarSubmitError: api.AvatarSubmitError, HOST_PRESENTER_MODEL: 'offline-host-model',
      cinematicSceneModel: (fam, t, anchored) => `${fam}/${t}/${anchored ? 'i2v' : 't2v'}`, ctxDespacho: () => c, classifyProviderFailure: disposition.classifyProviderFailure,
      confirmCinematicRefund: async () => { calls.push(['refund']); return refunded }, releaseBirthClaim: async (reason) => { calls.push(['release', reason]); return released },
      writeServerEvent: async (e) => { calls.push(['event', e.name, e.metadata]) },
      NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) },
      setTimeout: (fn) => fn(), console: { log() {}, warn() {}, error() {} }, fetch() { throw Error('network forbidden') }, Buffer, Math, Boolean, Set, Map, Promise, String, Array,
    }
    const result = await evaluate(fullCode, scope).run()
    return { result, calls, ctx: c }
  }
  const line = 'This exact line must remain.'
  const presenterPlan = (supportSeconds, supports = 5) => [{ index: 1, type: 'dialogue', dialogueLine: line, seconds: 5, prompt: 'presenter', voiceover: null }, ...Array.from({ length: supports }, (_, i) => ({ index: i + 2, type: 'support', dialogueLine: '', seconds: supportSeconds, prompt: `support ${i}`, voiceover: 'Support narration.' }))]
  const reject400 = async () => ({ ok: false, status: 400, text: async () => '{"detail":"fixture rejection"}' })

  // §1 — o adaptador REAL faz o POST e o fornecedor devolve 400: o ledger conserva o host.
  const posted = await runFull({ scenes: presenterPlan(11), fetchImpl: reject400 })
  eq(posted.calls.slice(0, 4), [['tts', line], ['upload'], ['host-submit', 'presenter'], ['provider-post', 'POST']], 'S25 dialogue: TTS, upload and ONE real provider POST happened before the host rejected')
  eq([posted.result.held, posted.result.models[0], posted.result.dispositions[0]], [[0], 'offline-host-model', 'explicit_reject'], 'held scene keeps the HOST model that was actually posted — never the native model that was never called')
  eq(posted.ctx.outcomes[0], { scene_index: 0, model: 'offline-host-model', disposition: 'explicit_reject', reason_class: 'invalid_payload', retry_safety: 'never', provider_http_status: 400, attempt_count: 1 }, '§1 ledger: the real host POST is ONE attempt with its real status (400 → invalid_payload), not zero')
  eq([posted.ctx.attempts[0], posted.ctx.totalPosts], [[{ model: 'offline-host-model', status: 400, ambiguous: false, accepted: false }], 1], '§1 ledger: attempts and total_posts count the host POST — and nothing for the blocked native fallback')
  ok(!posted.calls.some(c => c[0] === 'native-post'), '§2: the silent native POST never happens for the held scene')
  const postedEvent = posted.calls.find(c => c[0] === 'event')[2]
  eq([postedEvent.host_attempts, postedEvent.native_posts_for_held, postedEvent.scene_posts], [[{ scene_index: 0, host_model: 'offline-host-model', host_post: true, host_status: 400 }], 0, 1], 'the event separates the real host attempt (posted, 400) from the native fallback (blocked, zero POST)')
  // §1 — TTS falha ANTES de qualquer POST: zero tentativas de vídeo, como sempre.
  const ttsFail = await runFull({ scenes: presenterPlan(11), fetchImpl: reject400, tts: async () => { throw Error('tts unavailable') } })
  eq([ttsFail.calls.filter(c => c[0] === 'provider-post').length, ttsFail.ctx.outcomes[0].attempt_count, ttsFail.ctx.outcomes[0].reason_class, ttsFail.ctx.attempts[0], ttsFail.ctx.totalPosts], [0, 0, 'local_policy_gate', [], 0], '§1: a TTS failure before the submit stays a zero-attempt policy hold (no phantom POST)')
  eq(ttsFail.calls.find(c => c[0] === 'event')[2].host_attempts, [{ scene_index: 0, host_model: 'offline-host-model', host_post: false, host_status: null }], '§1: the event records the host attempt as NOT posted')
  const uploadFail = await runFull({ scenes: presenterPlan(11), fetchImpl: reject400, upload: async () => { throw Error('storage unavailable') } })
  eq([uploadFail.calls.filter(c => c[0] === 'provider-post').length, uploadFail.ctx.outcomes[0].attempt_count, uploadFail.ctx.totalPosts], [0, 0, 0], '§1: an upload failure before the submit is also zero attempts')
  // §1 — chave ausente: o adaptador REAL lança AvatarSubmitError com status null ANTES do fetch → não houve POST.
  const noKeyApi = veedApi(() => { throw Error('fetch must not run without a key') }, {})
  await assert.rejects(noKeyApi.submitQueueOnce('m', {}), e => e instanceof noKeyApi.AvatarSubmitError && e.status === null && e.ambiguous === false, 'real adapter: missing FAL_KEY is an explicit error with status null, raised before any fetch'); checks++
  const noKeyLedger = runLedger(['explicit_reject'], [0], new Map([[0, { model: 'offline-host-model', status: null, posted: false, message: 'FAL_KEY is not configured' }]]))
  eq([noKeyLedger.outcomes[0].attempt_count, noKeyLedger.outcomes[0].reason_class, noKeyLedger.totalPosts], [0, 'local_policy_gate', 0], '§1 ledger: status null before the fetch = no POST = zero attempts')
  // §1 — não comprovável: declarado 'unknown', nunca zero.
  const unknownLedger = runLedger(['explicit_reject'], [0], new Map([[0, { model: 'offline-host-model', status: null, posted: 'unknown', message: 'adapter threw outside its contract' }]]))
  eq([unknownLedger.outcomes[0].reason_class, unknownLedger.outcomes[0].provider_http_status, unknownLedger.outcomes[0].attempt_count, unknownLedger.attempts[0].length], ['unknown', null, 1, 1], '§1 ledger: an unprovable POST is declared unknown (one attempt, class unknown), not asserted as zero')
  // §1 — ambíguo (5xx REAL do adaptador): a proteção existente continua — sem segunda tentativa, IDs anteriores preservados, sem retenção.
  const ambiguous5xx = await runFull({ scenes: [{ index: 1, type: 'support', dialogueLine: '', seconds: 11, prompt: 's', voiceover: 'v' }, ...presenterPlan(11, 1)], fetchImpl: async () => ({ ok: false, status: 503, text: async () => 'busy' }) })
  eq([ambiguous5xx.result.requestIds, ambiguous5xx.result.dispositions, ambiguous5xx.result.held, ambiguous5xx.calls.filter(c => c[0] === 'provider-post').length], [['native-0', null, null], ['accepted', 'ambiguous'], [], 1], 'S25 ambiguous host failure (real 503): earlier accepted ID preserved, ONE POST, no second job, no policy hold, no native fallback')
  eq([ambiguous5xx.ctx.outcomes[1].disposition, ambiguous5xx.ctx.outcomes[1].reason_class, ambiguous5xx.ctx.outcomes[1].attempt_count], ['ambiguous', 'transport_timeout_5xx', 1], 'ambiguous ledger entry unchanged')

  // §2 — os dois cenários do Board, até a resposta: NUNCA o sucesso normal.
  const timelineApi = load('@/lib/cinematic/timelineContract')
  // Plano do Board: cinco apoios ACEITOS e a fala por último — é assim que o piso aprovava em ec650782.
  const presenterLast = (supportSeconds) => { const p = presenterPlan(supportSeconds); return [...p.slice(1), p[0]] }
  for (const [supportSeconds, label] of [[11, '55/60s (floor passes, timeline would refuse later)'], [12, '60/65s (floor passes, timeline would ACCEPT a film without the line)']]) {
    const r = await runFull({ scenes: presenterLast(supportSeconds), fetchImpl: reject400 })
    eq([r.result.outcome, r.result.response.status, r.result.response.body.reason, r.result.response.body.retryable, r.result.response.body.heldScenes, r.result.response.body.claimReleased], ['explicit_outcome', 422, 's25_dialogue_without_host', false, [5], true], `§2 ${label}: explicit recoverable 422, retryable:false — not the normal success`)
    eq(r.result.response.body.motivo, 'the presenter voice provider rejected the scene (HTTP 400)', `§2 ${label}: the reason names what really happened`)
    ok(r.result.floorAbort === undefined && r.result.hSubmittedSec >= r.result.hPlannedSec * 0.9, `§2 ${label}: the accepted seconds WOULD pass the 90% floor (${r.result.hSubmittedSec}/${r.result.hPlannedSec}), and the outcome is decided before the floor is evaluated`)
    eq([r.result.requestIds, r.result.response.body.acceptedScenes.map(a => a.request_id), r.result.response.body.scenePosts], [['native-0', 'native-1', 'native-2', 'native-3', 'native-4', null], ['native-0', 'native-1', 'native-2', 'native-3', 'native-4'], 6], `§2 ${label}: the five accepted IDs are preserved in the response; 6 real POSTs (5 native + the host)`)
    ok(r.result.response.body.error.includes('5 scenes had already started and were set aside') && r.result.response.body.error.includes('credits are back'), `§2 ${label}: the customer is told the scenes were set aside and that the refund is confirmed`)
    eq([r.ctx.claimAction, r.ctx.refundConfirmed, r.ctx.outcomes[5].model, r.ctx.outcomes[5].attempt_count, r.ctx.totalPosts], ['released', true, 'offline-host-model', 1, 6], `§2 ${label}: the ledger context records the release; the held slot keeps the host POST; total_posts is honest`)
  }
  // §2 — a impossibilidade descoberta DEPOIS de cenas aceitas: para de gastar, preserva IDs, desfecho explícito.
  const mid = await runFull({ scenes: [...presenterPlan(12).slice(1, 3), ...presenterPlan(12).slice(0, 1), ...presenterPlan(12).slice(3)], fetchImpl: reject400 })
  eq([mid.result.response.status, mid.result.requestIds, mid.result.dispositions], [422, ['native-0', 'native-1', null, null, null, null], ['accepted', 'accepted', 'explicit_reject']], '§2 mid-film: the two accepted IDs are preserved, the held slot is null, and submission STOPS — three later support scenes are never posted')
  eq(mid.calls.filter(c => c[0] === 'native-post').map(c => c[3]), [0, 1], '§2 mid-film: exactly the two scenes before the held dialogue went to the provider')
  eq([mid.result.response.body.acceptedScenes, mid.result.response.body.scenePosts, mid.result.response.body.heldScenes], [[{ scene_index: 0, request_id: 'native-0', model: 's25/support/i2v' }, { scene_index: 1, request_id: 'native-1', model: 's25/support/i2v' }], 3, [2]], '§2 mid-film: the response lists the accepted IDs (set aside, our cost), 3 real POSTs (2 native + 1 host), the held index')
  ok(mid.result.response.body.error.includes('2 scenes had already started and were set aside and your credits are back'), '§2 mid-film: the customer is told scenes were set aside and the refund is confirmed')
  const midEvent = mid.calls.find(c => c[0] === 'event')[2]
  eq([midEvent.accepted_request_ids, midEvent.stopped_after_scene, midEvent.scene_posts, midEvent.held_scenes], [['native-0', 'native-1'], 3, 3, [2]], '§2 mid-film: the event carries accepted IDs, where submission stopped, real POST count, held scenes')
  eq(mid.ctx.outcomes.map(o => o && [o.model, o.attempt_count]), [['s25/support/i2v', 1], ['s25/support/i2v', 1], ['offline-host-model', 1]], '§1+§2 united: accepted scenes 1 attempt each, held scene = the host POST, later scenes absent (not_attempted)')
  eq(dispatch.invarianteFecha(disposition.summarize(mid.ctx.outcomes.filter(Boolean), 6)), true, 'the dispatch invariant closes: 2 accepted + 1 rejected + 3 not_attempted = 6')
  // §2 — estorno NÃO confirmado: o claim não é liberado e nada é prometido.
  const unconfirmed = await runFull({ scenes: presenterPlan(12), fetchImpl: reject400, refunded: false })
  eq([unconfirmed.result.response.status, unconfirmed.result.response.body.refunded, unconfirmed.result.response.body.claimReleased, unconfirmed.calls.some(c => c[0] === 'release'), unconfirmed.ctx.claimAction], [422, false, false, false, 'release_failed'], '§2: unconfirmed refund → claim stays closed to new spend, nothing promised, ledger says release_failed')
  ok(!unconfirmed.result.response.body.error.includes('credits are back'), '§2: the message never claims the refund when it is not confirmed')
  // §2 — a prova de que o sucesso normal escondia a fala: alinhamento real + timeline real sobre o que o piso aprovava em ec650782.
  const aligned = (supportSeconds) => {
    const plan = presenterPlan(supportSeconds)
    const ids = [null, ...plan.slice(1).map((_, i) => 'id' + i)]
    const urls = ids.map(id => id ? 'https://offline.invalid/' + id : null)
    const response = { scene_engines: plan.map(s => s.type), scene_seconds: plan.map(s => s.seconds), scene_narrations: plan.map(s => s.voiceover), scene_dialogues: plan.map(s => s.type === 'dialogue' ? s.dialogueLine : null), scene_captions: plan.map(() => null) }
    const a = timelineApi.signedSceneMetadata(response, urls, urls.filter(Boolean), true)
    let verdict = 'accepted'; try { timelineApi.assertCinematicTimeline(a.scene_engines.map((engine, i) => ({ engine, seconds: a.scene_seconds[i] })), 60) } catch (e) { verdict = e.message }
    return { dialogues: a.scene_dialogues, verdict }
  }
  eq(aligned(12), { dialogues: [null, null, null, null, null], verdict: 'accepted' }, 'BEFORE (what the floor let through): real alignment drops the held dialogue and the real timeline gate ACCEPTS a 60s film without the mandatory line')
  ok(aligned(11).verdict !== 'accepted', 'BEFORE: with 55s the loss only surfaced later as a timeline refusal')
  // §2 — S25 sem diálogo e outras famílias: o laço inteiro continua igual (sucesso normal, piso avaliado).
  const s25Narrated = await runFull({ scenes: presenterPlan(12).slice(1), fetchImpl: reject400 })
  eq([s25Narrated.result.outcome, s25Narrated.result.floorAbort, s25Narrated.result.requestIds.every(Boolean), s25Narrated.result.held], ['normal_success', false, true, []], 'S25 narrated film: every support scene posted, floor evaluated, normal success (unchanged)')
  for (const fam of ['hollywood', 'h3', 'omni']) {
    const nat = await runFull({ scenes: presenterPlan(12), family: fam, fetchImpl: reject400 })
    eq([nat.result.outcome, nat.result.held, nat.result.engines[0], nat.result.requestIds.every(Boolean), nat.calls.filter(c => c[0] === 'native-post').length], ['normal_success', [], 'dialogue', true, 6], `${fam}: explicit host failure still falls back to native speech, all 6 scenes posted, normal success (unchanged)`)
  }

  // MAPA DE ÁUDIO por motor, pelo código real: host (TTS + lip-sync) / fallback nativo / apoio narrado.
  const audioMap = {}
  for (const fam of ['hollywood', 'h3', 'omni', 's25']) {
    const nativeModel = router.cinematicSceneModel(fam, 'dialogue', true)
    const payload = realInput(nativeModel, 'x', true, true, 8, anchor)
    audioMap[fam] = { host_dialogue: (await runLoop({ family: fam })).sceneEngine, native_dialogue_allowed: !(await runLoop({ family: fam, submit: async () => null })).held, native_generate_audio: payload.generate_audio ?? 'absent', support_narrated: speech.sceneNarrationsForPlan([{ type: 'support', voiceover: 'Narrator', needsNarration: true }])[0] === 'Narrator' }
  }
  eq(audioMap, {
    hollywood: { host_dialogue: 'host', native_dialogue_allowed: true, native_generate_audio: true, support_narrated: true },
    h3: { host_dialogue: 'host', native_dialogue_allowed: true, native_generate_audio: 'absent', support_narrated: true },
    omni: { host_dialogue: 'host', native_dialogue_allowed: true, native_generate_audio: 'absent', support_narrated: true },
    s25: { host_dialogue: 'host', native_dialogue_allowed: false, native_generate_audio: false, support_narrated: true },
  }, 'audio map: dialogue speaks via host TTS+lip-sync in every family; native fallback carries speech in Kling 3 (switch on) and by model behaviour in H3/Omni (verified by ASR at compose); S25 has no native voice and its native fallback is closed; support is narrated everywhere')
}

console.log(`cinematic-speech: ${checks} passed; real production payload/compose branches/builder; no external calls`)
