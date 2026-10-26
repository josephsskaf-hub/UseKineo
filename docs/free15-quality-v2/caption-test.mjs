// Real pure guard + real compose control-flow slice. No env, SDK, DB, ASR or render.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'))
process.chdir(ROOT)
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const lib = 'lib/captionEvidenceGuard.ts', routePath = 'app/api/compose/route.ts'
const load = createOfflineLoader(), assess = load(lib).assessOwnTtsCaptionEvidence
const actual = JSON.parse(read('docs/free15-quality-v2/caption-owned-fixture.json'))
const controls = JSON.parse(read('docs/free15-quality-v2/caption-owned-controls.json'))
const mockWords = text => text.split(/\s+/).filter(Boolean).map((word, i) => ({ word, start: i * .2, end: (i + 1) * .2 }))
const make = (script, spoken = script, extra = {}) => ({ quality: 'cinematic_ai', duration: 15, ownTts: true, language: 'pt', script, words: mockWords(spoken), ...extra })
const realInput = make(actual.script, '', { words: actual.words })
let checks = 0
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name) }

check('actual owned ASR disagreement does not diagnose a bad voice', () => {
  const before = JSON.stringify(realInput), result = assess(realInput)
  assert.equal(result.status, 'mismatch')
  assert.ok(['broad_text_disagreement', 'corrupted_passage', 'substantial_script_omission'].includes(result.reason))
  assert.equal(JSON.stringify(realInput), before)
  assert.equal(Object.hasOwn(result, 'words'), false)
  assert.equal(Object.hasOwn(result, 'script'), false)
  assert.equal(/faceboard|arqueóloga|http|user_id/i.test(JSON.stringify(result)), false)
  console.log('OWNED FIXTURE COUNTS ' + JSON.stringify(result))
})
for (const control of controls) {
  check('real owned control ' + control.label + ' is not rejected (no new ASR)', () => {
    const r = assess(make(control.script, '', { words: control.words }))
    assert.ok(['consistent', 'unverified'].includes(r.status))
    console.log('OWNED CONTROL ' + control.label + ' ' + JSON.stringify(r))
  })
}

check('Latin accents, NFD, punctuation and hyphenation do not create a rejection', () => {
  assert.equal(assess(make('A arqueóloga segurou a pena dourada. A porta abriu e revelou um jardim.', 'A arqueologa segurou a pena dourada a porta abriu e revelou um jardim')).status, 'consistent')
  assert.equal(assess(make(actual.script, actual.script.normalize('NFD'))).status, 'consistent')
  assert.equal(assess(make('Ao segurá-la, a sala se ilumina.', 'Ao segura la a sala se ilumina')).status, 'consistent')
})
check('real integer normalization handles spoken numbers and preserves different values', () => {
  for (const [language, script, spoken] of [
    ['pt', 'Em 1959 ela encontrou 22 moedas e guardou 63% do tesouro na caixa.', 'Em mil novecentos e cinquenta e nove ela encontrou vinte e duas moedas e guardou sessenta e tres por cento do tesouro na caixa'],
    ['en', 'In 1959 she found 22 coins and kept 63% of the treasure.', 'In nineteen fifty nine she found twenty two coins and kept sixty three percent of the treasure'],
    ['es', 'En 1959 ella encontró 22 monedas y guardó 63% del tesoro.', 'En mil novecientos cincuenta y nueve ella encontro veintidos monedas y guardo sesenta y tres por ciento del tesoro'],
  ]) {
    assert.equal(assess(make(script, spoken, { language })).status, 'consistent', language)
  }
  assert.notEqual(assess(make('A arqueóloga encontrou 22 moedas e abriu a porta do jardim com a chave.', 'A arqueóloga encontrou vinte e três moedas e abriu a porta do jardim com a chave.')).status, 'consistent')
  const oneTypo = assess(make('A arqueóloga encontrou 22 moedas e abriu a porta antiga do jardim com a chave dourada.', 'A arqueóloga encontrou vinte e duas moedas e abriu a porta velha do jardim com a chave dourada.'))
  assert.equal(oneTypo.status, 'unverified')
  assert.ok(oneTypo.expectedCoverage > .9)
})
check('unsupported decimal/date readings remain explicitly unverified', () => {
  for (const script of ['A menina encontrou 3,5 moedas dentro da caixa e voltou para o jardim.', 'No dia 12/05 a menina encontrou a caixa e voltou para o jardim.']) {
    assert.equal(assess(make(script, 'A menina encontrou três vírgula cinco moedas dentro da caixa e voltou para o jardim.')).reason, 'numeric_form_not_calibrated')
  }
})
check('non-Latin script is not erased or judged with a Latin heuristic', () => {
  for (const script of ['पुरानी पेटी खुली और लड़की को सुनहरी चाबी मिली।', 'اس نے صندوق کھولا اور سنہری چابی دیکھی۔', 'فتحت الفتاة الصندوق ووجدت مفتاحا ذهبيا', '女孩打开盒子发现了一把金色钥匙。', '少女は箱を開けて金色の鍵を見つけた。', 'Девушка открыла коробку и нашла золотой ключ.']) {
    assert.equal(assess(make(script)).status, 'consistent')
    const r = assess(make(script, 'A completely different narration about cooking dinner at home.'))
    assert.equal(r.status, 'unverified'); assert.equal(r.reason, 'writing_system_not_calibrated')
  }
  assert.notEqual(assess(make('वह घर में है', 'वह घर म ह')).status, 'consistent')
})
check('other Latin languages keep their path until mismatch rules are validated', () => {
  for (const language of ['fr', 'de', 'it', 'nl', 'tr', 'id', '']) {
    assert.equal(assess({ ...realInput, language }).reason, 'language_not_calibrated')
    assert.equal(assess(make(actual.script, actual.script, { language })).status, 'consistent')
  }
})
check('missing, malformed and oversized evidence is not an approval', () => {
  for (const words of [undefined, [], [{ word: 'x', start: 1, end: 0 }], [{ word: 'x', start: 0, end: NaN }], [{ word: 'x', start: 1, end: 2 }, { word: 'y', start: 0, end: 1 }]]) {
    assert.equal(assess({ ...realInput, words }).status, 'unverified')
  }
  assert.equal(assess({ ...realInput, script: '' }).status, 'unverified')
  assert.equal(assess({ ...realInput, words: Array.from({ length: 251 }, (_, i) => ({ word: 'x', start: i, end: i + 1 })) }).status, 'unverified')
})
check('short text and a localized spelling error cannot become broad corruption', () => {
  assert.equal(assess(make('A menina abriu a porta.', 'A menina abriu a caixa.')).status, 'unverified')
  const script = 'A menina abriu a porta dourada e encontrou uma pequena caixa de madeira no jardim.'
  assert.equal(assess(make(script, script.replace('madeira', 'madeyra'))).status, 'unverified')
})
check('substantial missing, unrelated and inserted passages are detected', () => {
  const script = 'A menina abriu a pequena caixa de madeira no jardim e encontrou uma pena dourada. Ela levantou a pena e a porta secreta revelou um caminho iluminado para casa.'
  for (const spoken of [
    'A menina abriu a pequena caixa de madeira no jardim.',
    'O motorista entrou no ônibus vermelho e dirigiu pela avenida até chegar ao restaurante onde pediu uma sopa quente.',
    script + ' Em seguida o motorista entrou no ônibus vermelho e levou os passageiros até o aeroporto distante.',
    script.replace('Ela levantou a pena e a porta secreta revelou um caminho iluminado', 'O motorista vendeu o carro vermelho porque preferia comprar uma moto nova'),
  ]) assert.equal(assess(make(script, spoken)).status, 'mismatch', spoken)
})
check('scope excludes external audio, Ads, avatar, other engines and other durations', () => {
  for (const extra of [{ ownTts: false }, { quality: 'avatar' }, { quality: 'cinematic_kling' }, { quality: 'cinematic_s25' }, { quality: 'fast' }, { duration: 60 }, { duration: 15.1 }]) assert.equal(assess({ ...realInput, ...extra }).status, 'not_applicable')
})

const route = read(routePath)
const compose = load('lib/compose.ts'), faceless = load('lib/filmes/faceless15.ts')
const select = load(lib).selectOwnTtsCaptionSource
const json = x => JSON.parse(JSON.stringify(x))
const isCaption = e => e.type === 'text' && [5, 7].includes(Number(e.track))
const nonCaptions = s => s.elements.filter(e => !isCaption(e))
const textOf = s => s.elements.filter(isCaption).map(e => e.text).join(' ')
const tokens = s => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/)
function buildCase(fixture = actual, { words = fixture.words, quality = 'cinematic_ai', duration = 15, measured = fixture.audioDuration, format = true } = {}) {
  compose.setActiveCaptionFont('pt')
  const spelling = words ? load('lib/captionScriptSpelling.ts').alinharGrafiaDoRoteiro(words, fixture.script) : null
  const captionWords = load('lib/escritaDaLegenda.ts').legendaNaEscritaDoRoteiro(spelling?.words ?? words, fixture.script)
  const input = {
    clipUrls: ['https://fixture.invalid/a.mp4', 'https://fixture.invalid/b.mp4', 'https://fixture.invalid/c.mp4'],
    clipSeconds: [6, 6, 6], clipSpeech: { narrationWords: fixture.script.split(/\s+/), wordStarts: [0, 13, 27] },
    voiceoverUrl: 'https://fixture.invalid/voice.mp3', voiceoverScript: fixture.script,
    sceneCaptions: [], duration, quality, realAudioDuration: measured, whisperWords: captionWords,
    musicUrl: 'https://fixture.invalid/music.mp3', aspect: '9:16', watermark: true,
  }
  const decision = format ? faceless.resolverFaceless15({ interna: false, quality, duration, aspect: '9:16', avatar: false, studioAds: false }) : { ativo: false, motivo: 'test_without_format', fases: [] }
  const source = compose.buildCreatomateSource(input)
  const report = faceless.aplicarFaceless15(source, decision, { whisperWords: captionWords ?? null, clipSeconds: input.clipSeconds, font: 'Montserrat' })
  return { input, source, decision, report }
}
function routeSlice(source, from, until) {
  const sf = ts.createSourceFile(routePath, source, ts.ScriptTarget.Latest, true)
  let found
  const named = (n, name) => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(sf) === name)
  function visit(node) {
    if (ts.isBlock(node)) {
      const start = node.statements.findIndex(s => named(s, from))
      if (start >= 0) {
        const end = node.statements.findIndex((s, i) => i > start && until(s, sf, named))
        assert.ok(end > start)
        found = { code: [...node.statements].slice(start, end).map(n => n.getText(sf)).join('\n'), pos: node.statements[start].getStart(sf) }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf); assert.ok(found, 'actual route slice ' + from); return found
}
const evidenceSlice = source => routeSlice(source, 'captionEvidence', (s, sf, named) => named(s, 'detectedPersonaId'))
const selectionSlice = source => routeSlice(source, 'captionSelection', (s, sf) => ts.isIfStatement(s) && (s.expression.getText(sf) === 'faceless15.ativo' || s.getText(sf).includes('buildFree15CanonicalCaptions'))) // KINEO-LEVA-PERFEITO-2610 — o reagrupamento de legenda do filme perfeito (await import, guardiões próprios) fica fora do recorte síncrono
function routeRun({ fixture = actual, source = route, avatarMode = false, hasUserVoice = false, isServiceFinish = false, setup = {}, module = load(lib) } = {}) {
  const built = buildCase(fixture, setup), snapshot = json(built.source), raw = JSON.stringify(fixture.words)
  const code = evidenceSlice(source).code + '\n' + selectionSlice(source).code + '\nreturn { source, captionSelection, faceless15Relato };'
  const forbidden = () => { throw new Error('No render, network, rejection, credit, refund or transcription allowed') }
  const result = vm.runInNewContext(ts.transpileModule('(function(){' + code + '})()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    quality: built.input.quality, duration: built.input.duration, language: 'pt',
    avatarMode, hasUserVoice, isServiceFinish, scaledScript: fixture.script,
    whisperWords: setup.words ?? fixture.words, source: built.source, composeInputs: built.input,
    assessOwnTtsCaptionEvidence: module.assessOwnTtsCaptionEvidence,
    selectOwnTtsCaptionSource: module.selectOwnTtsCaptionSource,
    buildCreatomateSource: compose.buildCreatomateSource,
    aplicarFaceless15: faceless.aplicarFaceless15, faceless15: built.decision, faceless15Relato: built.report,
    captionFontFor: load('lib/textLanguage.ts').captionFontFor,
    console: { log() {} }, fetch: forbidden, rejectBeforeProviderSubmission: forbidden,
    submitCreatomateOnce: forbidden, storeCachedVoiceover: forbidden, generateTTS: forbidden,
  })
  assert.equal(JSON.stringify(fixture.words), raw, 'raw ASR/cache evidence unchanged')
  return { ...built, ...result, snapshot }
}
function proveCanonical(result, fixture = actual) {
  assert.equal(result.captionSelection.alignment.source, 'canonical_tts_script')
  assert.equal(result.captionSelection.alignment.timing, 'approximate')
  assert.equal(result.captionSelection.alignment.evidence_status, 'unverified')
  assert.equal(result.captionSelection.alignment.measured_audio_seconds, fixture.audioDuration)
  assert.deepEqual(tokens(textOf(result.source)), tokens(fixture.script), 'all canonical words, in order, including ending')
  assert.doesNotMatch(textOf(result.source), /faceboard|Persefuro|embredamente|sangue da chave/i)
  assert.deepEqual(json(nonCaptions(result.source)), nonCaptions(result.snapshot), 'all audio/video/cuts/music/watermark retained exactly')
  assert.deepEqual(Object.keys(result.source).filter(k => k !== 'elements').map(k => [k, result.source[k]]), Object.keys(result.snapshot).filter(k => k !== 'elements').map(k => [k, result.snapshot[k]]))
  for (const cap of result.source.elements.filter(isCaption)) {
    assert.ok(cap.time >= 0 && cap.duration > 0)
    assert.ok(cap.time + cap.duration <= fixture.audioDuration + .002, 'caption remains inside measured audio')
  }
  const captions = result.source.elements.filter(isCaption)
  assert.ok(Math.abs(captions.at(-1).time + captions.at(-1).duration - fixture.audioDuration) < .002, 'ending survives')
  assert.equal(result.source.elements.find(e => e.type === 'audio' && e.track === 4).source, result.input.voiceoverUrl)
}
check('actual route and REAL builder repair C captions, without replacing any film element or ASR', () => {
  const result = routeRun(); proveCanonical(result)
  assert.equal(result.faceless15Relato.f1.chunker, 'proporcional')
  assert.doesNotMatch(JSON.stringify(result.captionSelection.alignment), /arqueóloga|http|user_id/)
})
check('existing builder proportional fallback also works without Faceless decoration', () => proveCanonical(routeRun({ setup: { format: false } })))
for (const fixture of controls) check('real control ' + fixture.label + ' output unchanged including numeric/Maya ambiguity', () => {
  const result = routeRun({ fixture })
  assert.deepEqual(json(result.source), result.snapshot)
  assert.equal(result.captionSelection.alignment.source, 'existing_caption_path')
  assert.equal(result.captionSelection.alignment.evidence_status, 'unverified')
})
check('valid evidence never rebuilds the source or claims audio certification', () => {
  const built = buildCase(controls[0]); const calls = []
  const result = select({ source: built.source, compose: built.input, evidence: assess(make(controls[0].script, '', { words: controls[0].words })), build: () => calls.push('forbidden') })
  assert.equal(result.source, built.source); assert.equal(calls.length, 0)
  assert.equal(result.alignment.evidence_status, 'unverified')
})
check('missing/invalid duration never invents a measured canonical alignment', () => {
  for (const measured of [null, NaN, 0, -1, 4, 121]) {
    const r = routeRun({ setup: { measured } })
    assert.deepEqual(json(r.source), r.snapshot)
    assert.equal(r.captionSelection.alignment.reason, 'measured_duration_unavailable')
  }
})
check('external voice, service, avatar, other duration/engine preserve existing captions', () => {
  for (const params of [{ hasUserVoice: true }, { isServiceFinish: true }, { avatarMode: true }, { setup: { duration: 35 } }, { setup: { quality: 'cinematic_kling' } }]) {
    const r = routeRun(params); assert.deepEqual(json(r.source), r.snapshot); assert.equal(r.captionSelection.alignment, null)
  }
})
check('missing ASR and unavailable canonical output are explicitly inconclusive', () => {
  const built = buildCase(actual), evidence = assess({ ...realInput, words: undefined })
  const first = select({ source: built.source, compose: built.input, evidence, build: () => { throw Error('must not call') } })
  assert.equal(first.source, built.source); assert.equal(first.alignment.evidence_status, 'unverified')
  const second = select({ source: built.source, compose: built.input, evidence: assess(realInput), build: () => ({ elements: [] }) })
  assert.equal(second.source, built.source); assert.equal(second.alignment.reason, 'canonical_captions_unavailable')
  const third = select({ source: built.source, compose: built.input, evidence: assess(realInput), build: () => { throw Error('synthetic local assembly failure') } })
  assert.equal(third.source, built.source); assert.equal(third.alignment.reason, 'canonical_assembly_unavailable')
  const fourth = select({ source: built.source, compose: { ...built.input, realAudioDuration: undefined }, evidence: assess(realInput), build: () => { throw Error('must not call') } })
  assert.equal(fourth.source, built.source); assert.equal(fourth.alignment.reason, 'measured_duration_unavailable')
})
check('raw assessment precedes repair/cache is untouched; response and existing timing event expose alignment', () => {
  const guard = evidenceSlice(route), selection = selectionSlice(route)
  assert.ok(route.indexOf('whisperWords = cachedVoiceover.words') < guard.pos)
  assert.ok(route.indexOf('await storeCachedVoiceover(voiceoverCacheKey, audioBuffer, whisperWords ?? [], realAudioDuration)') < guard.pos)
  assert.ok(route.indexOf('const grafia =') > guard.pos)
  assert.ok(route.indexOf('const faceless15Relato =') < selection.pos)
  assert.ok(route.indexOf('renderId = await submitCreatomateOnce(source, submissionKey)') > selection.pos)
  assert.doesNotMatch(guard.code + selection.code, /rejectBeforeProviderSubmission|NextResponse|fetch\(|generateTTS|storeCachedVoiceover|refunded/)
  const sf = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true)
  let alignmentFields = 0, builderCalls = 0
  function inspect(n) {
    if (ts.isPropertyAssignment(n) && n.name.getText(sf) === 'caption_alignment' && n.initializer.getText(sf) === 'captionSelection.alignment') alignmentFields++
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'buildCreatomateSource' && n.arguments[0]?.getText(sf) === 'composeInputs') builderCalls++
    ts.forEachChild(n, inspect)
  }
  inspect(sf); assert.equal(alignmentFields, 2); assert.equal(builderCalls, 1)
})

let mutants = 0
function killed(name, mutate, verify) {
  const original = read(lib), changed = mutate(original); assert.notEqual(changed, original, name + ' applied')
  const mutant = createOfflineLoader({ source: (rel, source) => rel === lib ? changed : source })(lib)
  assert.throws(() => verify(mutant), undefined, name + ' is caught'); mutants++
}
killed('bypass strong mismatch', s => s.replaceAll("finish('mismatch',", "finish('unverified',"), m => proveCanonical(routeRun({ module: m })))
killed('external audio admitted', s => s.replace('input.ownTts !== true', 'false'), m => assert.equal(routeRun({ module: m, hasUserVoice: true }).captionSelection.alignment, null))
killed('missing ASR falsely consistent', s => s.replace("status: 'unverified', reason: 'missing_evidence'", "status: 'consistent', reason: 'missing_evidence'"), m => assert.equal(m.assessOwnTtsCaptionEvidence({ ...realInput, words: [] }).status, 'unverified'))
killed('script replaces observed evidence', s => s.replace("input.words.map(w => w.word).join(' ')", 'input.script'), m => proveCanonical(routeRun({ module: m })))
killed('canonical builder accidentally reuses corrupt words', s => s.replace('whisperWords: undefined', 'whisperWords: compose.whisperWords'), m => proveCanonical(routeRun({ module: m })))
killed('substituting audio along with captions', s => s.replace("(value as { type?: unknown }).type === 'text' && [5, 7].includes", "['text', 'audio'].includes((value as { type?: string }).type ?? '') && [4, 5, 7, 8].includes"), m => {
  const built = buildCase(actual), changedAudio = { ...built.input, voiceoverUrl: 'https://fixture.invalid/different.mp3' }
  const r = m.selectOwnTtsCaptionSource({ source: built.source, compose: changedAudio, evidence: assess(realInput), build: compose.buildCreatomateSource })
  assert.deepEqual(json(nonCaptions(r.source)), json(nonCaptions(built.source)))
})
killed('measured audio replaced by requested duration', s => s.replace('input.build({ ...compose, whisperWords: undefined })', 'input.build({ ...compose, realAudioDuration: compose.duration, whisperWords: undefined })'), m => proveCanonical(routeRun({ module: m })))
assert.throws(() => proveCanonical(routeRun({ source: route.replace('source = captionSelection.source', 'source = source') }))); mutants++
assert.throws(() => assert.equal(routeRun({ hasUserVoice: true, source: route.replace('ownTts: !avatarMode && !hasUserVoice && !isServiceFinish', 'ownTts: true') }).captionSelection.alignment, null)); mutants++
console.log(`FREE15 CAPTION PASS: ${checks} behavioral groups; ${mutants} rejected mutants; real builders, raw ASR preserved, no external operations.`)
