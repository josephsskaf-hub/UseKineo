// KINEO-ADS-CENA-95-2110 — contratos de voz/custos e transporte em dublês; nenhum serviço, segredo ou banco real.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const files = { voice: 'lib/ads/cena/voice95.ts', costs: 'lib/ads/cena/costs95.ts', transport: 'lib/ads/cena/audio95Runtime.ts' }
const plain = v => JSON.parse(JSON.stringify(v))
const same = (a, b) => assert.deepEqual(plain(a), plain(b))
function loader(over = {}, extraMocks = {}) { return createOfflineLoader({ globals: { Error }, mocks: { '@fal-ai/client': { createFalClient: () => { throw new Error('SDK real proibido; injete o dublê') } }, ...extraMocks }, source: (p, text) => over[p] ?? text }) }
const voiceInput = { beforeCta: 'Meet Pulse. A watch for your run.', cta: 'Shop Pulse now.', language: 'en', gender: 'female', age: 'adult', formato: 'ugc' }
function voiceProof(over = {}) {
  const V = loader(over)(files.voice)
  const oldClient = readFileSync('lib/ttsFallback.ts', 'utf8').match(/TTS_FALLBACK_MODEL = '([^']+)'/)[1]
  assert.equal(V.CENA95_MINIMAX_ENDPOINT, oldClient, 'reutiliza exatamente o modelo MiniMax da casa')
  for (const language of ['en', 'pt', 'es']) for (const gender of ['female', 'male']) for (const age of ['young_adult', 'adult', 'mature']) {
    const r = V.cena95NarratedVoiceRequest({ ...voiceInput, language, gender, age })
    assert.equal(r.input.output_format, 'url'); assert.equal(r.input.language_boost, ({ en: 'English', pt: 'Portuguese', es: 'Spanish' })[language])
    assert.equal(r.input.voice_setting.voice_id, V.CENA95_NARRATOR_VOICES[language][gender][age])
    assert.equal(r.profile.gender, gender); assert.equal(r.profile.age, age); assert.equal(r.profile.language, language)
    assert.equal(r.profile.ageBasis, 'editorial_direction_not_measured_age')
    assert.equal(r.profile.availability, 'documented_not_audio_validated')
    assert.equal(r.profile.style, 'conversational'); assert.equal(r.input.voice_setting.emotion, 'happy')
    assert.ok(!('gender' in r.input) && !('age' in r.input) && !('style' in r.input), 'nenhum parâmetro inventado enviado ao fornecedor')
    same(r.input.audio_setting, { format: 'mp3', sample_rate: 44100, bitrate: 128000, channel: 1 })
    assert.ok(r.estimated.wordsPerSecond >= 2.6 && r.estimated.wordsPerSecond <= 2.9)
    assert.equal(r.estimated.basis, 'planning_assumption_not_measured')
    assert.equal(r.input.voice_setting.speed, 1.05); assert.equal(r.estimated.wordsPerSecond, 2.9)
  }
  const r = V.cena95NarratedVoiceRequest(voiceInput)
  assert.equal(r.input.prompt, 'Meet Pulse. A watch for your run. <#0.35#> Shop Pulse now.')
  assert.equal(r.billingCharacters, r.input.prompt.length, 'cobrar previsão sobre todo texto realmente enviado, incluindo pausa')
  assert.equal(r.estimated.pauseSeconds, 0.35)
  const product = V.cena95NarratedVoiceRequest({ text: 'Veja o Pulse.', language: 'pt', gender: 'male', age: 'mature', formato: 'product' })
  assert.equal(product.profile.style, 'confident_product_demonstration'); assert.equal(product.input.voice_setting.emotion, 'neutral')
  const ugc = V.cena95NarratedVoiceRequest({ text: 'Veja o Pulse.', language: 'pt', gender: 'male', age: 'mature', formato: 'ugc' })
  assert.equal(ugc.input.voice_setting.emotion, 'happy', 'formato muda campo DOCUMENTADO do payload, não apenas metadado')
  same({ ...ugc.input, voice_setting: { ...ugc.input.voice_setting, emotion: 'neutral' } }, product.input)
  assert.equal(ugc.input.prompt, product.input.prompt, 'direção não vira prefixo falado nem altera copy')
  assert.equal(V.cena95NarratedVoiceRequest({ ...voiceInput, speed: 1 }).input.voice_setting.speed, 1, 'override de velocidade é preservado')
  for (const bad of [{ language: 'xx' }, { gender: 'unknown' }, { age: 'child' }, { speed: 2.75 }, { estimatedWordsPerSecond: 3.1 }, { pauseSeconds: 0 }]) assert.throws(() => V.cena95NarratedVoiceRequest({ ...voiceInput, ...bad }), /cena95_voice_bad_/)
  assert.throws(() => V.cena95NarratedVoiceRequest({ ...voiceInput, text: 'Do not mix contracts.' }), /cena95_voice_bad_cta_parts/)
  assert.throws(() => V.cena95NarratedVoiceRequest({ text: 'One voice.', language: 'en', gender: 'male', age: 'adult', pauseSeconds: 0.35 }), /cena95_voice_pause_needs_cta_parts/)
}
function resultProof(over = {}) {
  const V = loader(over)(files.voice)
  same(V.cena95VoiceResult({ data: { audio: { url: 'https://offline.example/voice.mp3' }, duration_ms: 14350, words: [{ word: 'untrusted', start: 0, end: 1 }] } }), { url: 'https://offline.example/voice.mp3', seconds: 14.35, timingSource: 'not_returned_by_endpoint' })
  for (const duration_ms of [undefined, null, 0, -1, 3.5, NaN, Infinity]) assert.throws(() => V.cena95VoiceResult({ audio: { url: 'https://offline.example/voice' }, duration_ms }), /cena95_voice_missing_duration/)
  assert.throws(() => V.cena95VoiceResult({ audio: { url: 'https://offline.example/voice' }, duration_ms: 15001 }), /cena95_voice_does_not_fit/)
  for (const url of ['http://offline.example/a', 'https://user:password@offline.example/a', '', 'not-url']) assert.throws(() => V.cena95VoiceResult({ audio: { url }, duration_ms: 10000 }), /cena95_voice_bad_audio/)
}
function costProof(over = {}) {
  const C = loader(over)(files.costs), expectedVideo = { kling3: { narrated: 2.8, talking: 5.6 }, seedance2: { narrated: 8.1918, talking: 11.2258 }, veo31: { narrated: 7.6, talking: 14 } }
  for (const route of Object.keys(expectedVideo)) for (const mode of ['narrated', 'talking']) {
    const c = C.estimateCena95Cost(route, mode, { characters: 200 }), part = key => c.breakdown.find(p => p.component === key)
    assert.equal(c.complete, true); assert.equal(c.estimated, true); assert.equal(typeof c.totalUsd, 'number')
    assert.ok(c.totalUsd > 0 && c.budgetMaxUsd > c.totalUsd); assert.equal(c.actualTotalUsd, null); assert.equal(c.actualStatus, 'not_measured')
    assert.ok(Math.abs(part('people_video').usd + part('real_product_close').usd - expectedVideo[route][mode]) < 1e-8)
    assert.equal(part('keyframes').quantity, 2); assert.equal(part('keyframes').usd, 0.3); assert.equal(part('keyframes').maxUsd, 0.6)
    assert.equal(part('people_video').maxUsd, Math.round(part('people_video').usd * 2 * 1e6) / 1e6)
    assert.equal(part('real_product_close').maxUsd, Math.round(part('real_product_close').usd * 2 * 1e6) / 1e6)
    assert.equal(part('narrated_voice').usd, mode === 'narrated' ? 0.02 : 0)
    assert.equal(part('music').unitUsd, 0.08); assert.equal(part('music').quantity, 1); assert.match(part('music').source, /lyria3\/pro$/)
    assert.equal(part('frame_extraction').usd, 0.12); assert.equal(part('frame_extraction').quantity, 120); assert.match(part('frame_extraction').basis, /not observed CPU/)
    assert.equal(part('creatomate').quantity, 8); assert.equal(part('creatomate').usd, 0.216)
    assert.equal(c.assumptions.render.fps, 24); assert.equal(c.assumptions.renderTariff.basis, 'published_plan_allocation')
    assert.match(c.assumptions.renderTariff.label, /actual account unknown/)
    assert.equal(part('classifier_image_input').quantity, 48169, 'não omite custo alto de imagem no classificador mini')
    assert.equal(part('judge_input').quantity, (route === 'veo31' ? 9 : 7) * 16384); assert.equal(part('judge_input').maxQuantity, (route === 'veo31' ? 18 : 14) * 16384)
    assert.equal(part('planning_text_input').quantity, 2 * 8192); assert.equal(part('planning_text_input').maxQuantity, 3 * 8192)
    const sum = key => Math.round(c.breakdown.reduce((s, p) => s + p[key], 0) * 1e6) / 1e6
    assert.equal(c.totalUsd, sum('usd'), 'total completo soma TODAS as parcelas'); assert.equal(c.budgetMaxUsd, sum('maxUsd'))
    assert.ok(c.breakdown.every(p => p.source.startsWith('https://') && Number.isFinite(p.usd)))
    if (route === 'seedance2') assert.ok(c.notes.some(n => n.includes('0.3034') && n.includes('0.3024')))
  }
  const c = C.estimateCena95Cost('kling3', 'narrated', { characters: 200 })
  assert.equal(c.totalUsd, 3.870701, 'exemplo manual: vídeo2.8+imagem.3+LLM.334701+voz.02+música.08+compute.12+render.216')
  assert.equal(c.budgetMaxUsd, 7.295717)
  assert.equal(C.cena95RenderCredits({ width: 1080, height: 1920, fps: 30, seconds: 15 }), 10)
  assert.equal(C.cena95RenderCredits({ width: 1, height: 1, fps: 1, seconds: 1 }), 1)
  for (const options of [{ characters: 0 }, { characters: 5, renderTariff: null }, { characters: 5, planningCalls: 0 }, { characters: 5, judgeCalls: 0 }, { characters: 5, computeSeconds: 0 }, { characters: 5, tokenBudgets: { planningInput: 128000 } }, { characters: 5, renderTariff: { ...C.CENA95_ESSENTIAL_PUBLIC, usdPerCredit: 0 } }, { characters: 5, renderTariff: { ...C.CENA95_ESSENTIAL_PUBLIC, source: '' } }]) assert.throws(() => C.estimateCena95Cost('kling3', 'narrated', options), /cena95_cost_/)
  const account = C.estimateCena95Cost('veo31', 'narrated', { characters: 180, renderTariff: { usdPerCredit: 0.01, source: 'https://offline.example/explicit-operator-contract', checkedAt: '2026-10-21', basis: 'provided_account_tariff', label: 'Offline supplied account tariff double' } })
  assert.equal(account.breakdown.find(p => p.component === 'creatomate').usd, 0.08); assert.equal(account.actualTotalUsd, null, 'fornecer tarifa não transforma previsão em fatura')
}
async function transportProof(over = {}) {
  const load = loader(over), V = load(files.voice), R = load(files.transport), request = V.cena95NarratedVoiceRequest(voiceInput)
  const trace = [], deps = {
    subscribe: async (endpoint, args) => { trace.push('submit'); assert.equal(endpoint, 'fal-ai/minimax/speech-2.8-hd'); assert.equal(args.timeout, 90000); same(args.input, request.input); return { data: { audio: { url: 'https://offline.example/provider.mp3' }, duration_ms: 14350 } } },
    download: async (url, timeout) => { trace.push('download'); assert.equal(timeout, 20000); assert.equal(url, 'https://offline.example/provider.mp3'); return Buffer.from('offline-audio') },
    upload: async bytes => { trace.push('upload'); assert.equal(bytes.toString(), 'offline-audio'); return 'https://offline.example/stored.mp3' },
  }
  same(await R.synthesizeCena95NarratedVoice(request, deps), { url: 'https://offline.example/stored.mp3', durationMs: 14350, timingSource: 'not_returned_by_endpoint' })
  same(trace, ['submit', 'download', 'upload'], 'uma síntese + uma cópia, sem retry implícito')
  const bounded = []
  await R.synthesizeCena95NarratedVoice(request, { ...deps, timeoutMs: 30000, downloadTimeoutMs: 10000,
    subscribe: async (endpoint, args) => { bounded.push(args.timeout); return { audio: { url: 'https://offline.example/provider.mp3' }, duration_ms: 14350 } },
    download: async (_url, timeout) => { bounded.push(timeout); return Buffer.from('offline-audio') },
  })
  same(bounded, [30000, 10000], 'runtime limita síntese/download ao prazo restante')
  let calls = 0
  await assert.rejects(R.synthesizeCena95NarratedVoice(request, { ...deps, subscribe: async () => { calls++; throw new Error('ambiguous-timeout') } }), /ambiguous-timeout/)
  assert.equal(calls, 1, 'timeout ambíguo nunca repete POST')
  await assert.rejects(R.synthesizeCena95NarratedVoice(request, { ...deps, download: async () => Buffer.alloc(0) }), /cena95_voice_bad_download/)
  await assert.rejects(R.synthesizeCena95NarratedVoice({ ...request, endpoint: 'unapproved/model' }, deps), /cena95_voice_transport_bad_request/)
  await assert.rejects(R.synthesizeCena95NarratedVoice(request, { ...deps, subscribe: async () => ({ audio: { url: 'https://offline.example/provider' } }) }), /cena95_voice_missing_duration/)
  let providerPosts = 0, sdkAttempts = 0
  const defaults = loader(over, { '@fal-ai/client': { createFalClient: config => ({ subscribe: async () => {
    // Imita o retry do SDK instalado; cada repetição deve parar ANTES do fetch que alcançaria o fornecedor.
    for (let i = 0; i < 4; i++) { sdkAttempts++; try { await config.fetch('https://offline.example/queue', { method: 'POST' }) } catch {} }
    throw new Error('offline-sdk-exhausted')
  } }) } })
  await assert.rejects(defaults(files.transport).synthesizeCena95NarratedVoice(request, { ...deps, subscribe: undefined, fetchImpl: async () => { providerPosts++; throw new Error('ambiguous-network-failure') } }), /offline-sdk-exhausted/)
  assert.equal(sdkAttempts, 4); assert.equal(providerPosts, 1, 'até retries INTERNOS do SDK têm no máximo UM POST pago')
}
function actualProof(over = {}) {
  const C = loader(over)(files.costs)
  const entries = C.CENA95_ACTUAL_COMPONENTS.map((component, i) => ({ id: 'measured-' + i, component, quantity: 1, unitUsd: 0.01, measurementSource: 'offline-provider-receipt-' + i, measuredAt: '2026-10-21T15:00:00Z', tariffSource: 'offline-confirmed-contract', tariffConfirmed: true, tariffBasis: 'confirmed_account' }))
  const usage = { voice_mode: 'narrated', completed: true, pendingIntents: 0, entries }
  const complete = C.actualCena95Cost(usage)
  assert.equal(complete.actualTotalUsd, 0.11); assert.equal(complete.invoicedUsd, null); same(complete.missing, [])
  assert.equal(complete.basis, 'measured_units_and_confirmed_tariffs_not_invoice')
  for (const component of C.CENA95_ACTUAL_COMPONENTS) {
    const incomplete = C.actualCena95Cost({ ...usage, entries: entries.filter(e => e.component !== component) })
    assert.equal(incomplete.actualTotalUsd, null); assert.ok(incomplete.missing.includes(component))
  }
  for (const patch of [{ tariffConfirmed: false }, { tariffBasis: 'public_reference' }, { measurementSource: '' }, { measuredAt: '' }, { quantity: NaN }]) {
    const result = C.actualCena95Cost({ ...usage, entries: entries.map((e, i) => i === 0 ? { ...e, ...patch } : e) })
    assert.equal(result.actualTotalUsd, null); assert.ok(result.missing.length > 0)
  }
  assert.equal(C.actualCena95Cost({ ...usage, pendingIntents: 1 }).actualTotalUsd, null)
  assert.equal(C.actualCena95Cost({ ...usage, completed: false }).actualTotalUsd, null)
  assert.throws(() => C.actualCena95Cost({ ...usage, entries: [...entries, entries[0]] }), /duplicate_or_missing_id/)
  const native = C.actualCena95Cost({ ...usage, voice_mode: 'talking', entries: entries.filter(e => e.component !== 'narrated_voice') })
  assert.equal(native.actualTotalUsd, 0.1, 'talking nunca exige medição de TTS não executado')
}
for (const [label, run] of [['MiniMax narrado: perfis/idioma reais, pausa real numa síntese, WPS só estimado', voiceProof], ['resposta requer duração real; nunca fabrica word timestamps', resultProof], ['previsão completa/teto por rota+modo, descartes, juiz, CPU e plano público identificados', costProof], ['transporte do cliente existente totalmente dublado, timeout e zero retry ambíguo', transportProof], ['medição completa exige todas parcelas, recibos/unidades e tarifas confirmadas', actualProof]]) { await run(); console.log('ok ' + label) }
function changed(file, from, to) { const text = readFileSync(file, 'utf8').replace(/\r\n/gu, '\n'); assert.equal(text.split(from).length - 1, 1, 'mutante aplica uma vez: ' + from); return { [file]: text.replace(from, to) } }
const mutants = [
  ['muda modelo MiniMax existente', voiceProof, files.voice, "CENA95_MINIMAX_ENDPOINT = 'fal-ai/minimax/speech-2.8-hd'", "CENA95_MINIMAX_ENDPOINT = 'invented/model'"],
  ['pausa textual some', voiceProof, files.voice, '<#${pause.toFixed(2)}#>', ''],
  ['formato muda só perfil sem efeito no payload', voiceProof, files.voice, "formato === 'ugc' ? 'happy' : 'neutral'", "'neutral'"],
  ['velocidade padrão perde direção1.05', voiceProof, files.voice, 'data.speed ?? 1.05', 'data.speed ?? 1'],
  ['caracteres excluem pausa enviada', voiceProof, files.voice, 'billingCharacters: text.length', 'billingCharacters: clean(data.beforeCta).length + clean(data.cta).length'],
  ['ignora duração ausente', resultProof, files.voice, 'const ms = body?.duration_ms', 'const ms = body?.duration_ms ?? 15000'],
  ['best-of-2 vira imagem única', costProof, files.costs, "add('keyframes', 2, 4", "add('keyframes', 1, 4"],
  ['Kling cobra só candidato escolhido', costProof, files.costs, "mode === 'narrated' ? 20 : 30", "mode === 'narrated' ? 10 : 15"],
  ['Veo cobra16 emvez32s gerados', costProof, files.costs, "route === 'veo31' ? 32", "route === 'veo31' ? 16"],
  ['close Veo inventa5s', costProof, files.costs, "const closeSeconds = route === 'veo31' ? 6 : 5", 'const closeSeconds = 5'],
  ['juiz não conta entrada', costProof, files.costs, 'judgeInputPerMillion: 2.5', 'judgeInputPerMillion: 0'],
  ['foto classificador vira custozero', costProof, files.costs, 'const classifierImageTokens = 2833 + 8 * 5667', 'const classifierImageTokens = 0'],
  ['TTS cobrado também no talking', costProof, files.costs, "mode === 'narrated' ? characters : 0, mode === 'narrated' ? characters : 0", 'characters, characters'],
  ['música migra paraLyria2', costProof, files.costs, 'lyria3PerAudio: 0.08', 'lyria3PerAudio: 0.1'],
  ['render arredonda para baixo', costProof, files.costs, 'Math.ceil(render.width * render.height', 'Math.floor(render.width * render.height'],
  ['previsão vira custo real fictício', costProof, files.costs, 'actualTotalUsd: null', 'actualTotalUsd: totalUsd'],
  ['tarifa desconhecida recebe default silencioso', costProof, files.costs, 'options.renderTariff === undefined ? CENA95_ESSENTIAL_PUBLIC : options.renderTariff', 'options.renderTariff ?? CENA95_ESSENTIAL_PUBLIC'],
  ['transporte repete síntese paga', transportProof, files.transport, 'const raw = await subscribe(request.endpoint, { input: request.input, timeout: deps.timeoutMs ?? 90_000 })', 'await subscribe(request.endpoint, { input: request.input, timeout: deps.timeoutMs ?? 90_000 }); const raw = await subscribe(request.endpoint, { input: request.input, timeout: deps.timeoutMs ?? 90_000 })'],
  ['síntese ignora prazo do chamador', transportProof, files.transport, 'timeout: deps.timeoutMs ?? 90_000', 'timeout: 90_000'],
  ['download ignora prazo do chamador', transportProof, files.transport, 'deps.downloadTimeoutMs ?? 20_000', '20_000'],
  ['retry interno do SDK chega ao fornecedor', transportProof, files.transport, "if (posted) throw new Error('cena95_voice_submit_unconfirmed'); posted = true", 'posted = true'],
  ['parcela real faltante vira total completo', actualProof, files.costs, 'actualTotalUsd: missing.length ? null : partialMeasuredUsd', 'actualTotalUsd: partialMeasuredUsd'],
  ['tarifa referência fingecontaconfirmada', actualProof, files.costs, "item.tariffBasis === 'confirmed_account'", 'true'],
]
for (const [label, run, file, from, to] of mutants) { const over = changed(file, from, to); let error; try { await run(over) } catch (failure) { error = failure } assert.ok(error, 'mutante executado deve ficar vermelho: ' + label); console.log('ok mutante vermelho: ' + label) }
console.log('KINEO-ADS-CENA-95-2110: voz, previsão e transporte provados offline; nenhum gasto ou custo real alegado.')
