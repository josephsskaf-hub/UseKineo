// KINEO-ADS-CENA-95-2110 — MP4 sintético + transporte exclusivamente em dublês; zero fal/SDK/env/banco reais.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const FILE = 'lib/ads/cena/frames95.ts', source = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const plain = value => JSON.parse(JSON.stringify(value))
function load(override) { return createOfflineLoader({ globals: { Error, AbortSignal }, source: (p, text) => p === FILE && override !== undefined ? override : text })(FILE) }
const uint = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
const signed = n => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b }
const big = n => { const b = Buffer.alloc(8); b.writeBigInt64BE(BigInt(n)); return b }
const short = n => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b }
function box(type, ...parts) { const payload = Buffer.concat(parts); return Buffer.concat([uint(payload.length + 8), Buffer.from(type), payload]) }
function wideBox(type, ...parts) { const payload = Buffer.concat(parts); return Buffer.concat([uint(1), Buffer.from(type), big(payload.length + 16), payload]) }
const full = (type, version, ...parts) => box(type, Buffer.from([version, 0, 0, 0]), ...parts)
function runs(values) { const out = []; for (const n of values) { const last = out.at(-1); if (last?.[1] === n) last[0]++; else out.push([1, n]) } return out }
function track({ deltas, scale, handler = 'vide', offsets, cttsVersion = 0, mdhdVersion = 0, mdhdTicks, sampleCount, sttsRuns, cttsRuns, edit, duplicateStts = false, emptyStts = false }) {
  const ticks = mdhdTicks ?? deltas.reduce((n, d) => n + d, 0), entries = sttsRuns ?? runs(deltas)
  const mdhd = mdhdVersion === 1 ? full('mdhd', 1, big(0), big(0), uint(scale), big(ticks), uint(0)) : full('mdhd', 0, uint(0), uint(0), uint(scale), uint(ticks), uint(0))
  const hdlr = full('hdlr', 0, uint(0), Buffer.from(handler), Buffer.alloc(12), Buffer.from([0]))
  const stts = full('stts', 0, uint(emptyStts ? 0 : entries.length), ...(emptyStts ? [] : entries.flatMap(([n, d]) => [uint(n), uint(d)])))
  const stsz = full('stsz', 0, uint(1), uint(sampleCount ?? deltas.length))
  const cttsEntries = cttsRuns ?? (offsets ? runs(offsets) : null)
  const ctts = cttsEntries ? full('ctts', cttsVersion, uint(cttsEntries.length), ...cttsEntries.flatMap(([n, d]) => [uint(n), cttsVersion === 1 ? signed(d) : uint(d)])) : Buffer.alloc(0)
  const stbl = box('stbl', stts, ...(duplicateStts ? [stts] : []), stsz, ctts)
  const edts = edit ? box('edts', full('elst', edit.version ?? 0, uint(edit.count ?? 1), ...((edit.count ?? 1) === 1 ? [(edit.version ?? 0) === 1 ? big(edit.ticks) : uint(edit.ticks), (edit.version ?? 0) === 1 ? big(edit.mediaStart) : signed(edit.mediaStart), short(edit.rate ?? 1), short(edit.fraction ?? 0)] : []))) : Buffer.alloc(0)
  return box('trak', full('tkhd', 0, Buffer.alloc(80)), edts, box('mdia', mdhd, hdlr, box('minf', stbl)))
}
function mp4(options = {}) {
  const deltas = options.deltas ?? Array(360).fill(1000), scale = options.scale ?? 24000
  const video = track({ ...options, deltas, scale })
  const audio = track({ deltas: Array(700).fill(1024), scale: 48000, handler: 'soun' })
  const movieScale = options.movieScale ?? 1000
  const mvhd = options.mvhdVersion === 1 ? full('mvhd', 1, big(0), big(0), uint(movieScale), big(15000), Buffer.alloc(80)) : full('mvhd', 0, uint(0), uint(0), uint(movieScale), uint(15000), Buffer.alloc(80))
  const moov = (options.wide ? wideBox : box)('moov', mvhd, audio, video, ...(options.duplicateVideo ? [video] : []), ...(options.fragmented ? [box('mvex')] : []))
  const mdat = box('mdat', Buffer.alloc(deltas.length + 700))
  if (options.zeroMdat) mdat.writeUInt32BE(0)
  return Buffer.concat([box('ftyp', Buffer.from('isom'), uint(0), Buffer.from('isommp42')), moov, ...(options.moof ? [box('moof')] : []), mdat])
}
const cfr24 = mp4(), cfr30 = mp4({ deltas: Array(450).fill(1000), scale: 30000 })
const vfr = mp4({ deltas: [...Array(168).fill(1000), ...Array(240).fill(800)] })
const fractional = mp4({ deltas: Array(450).fill(1001), scale: 30000 })
function probeProof(override) {
  const F = load(override), p24 = F.probeCena95Mp4(cfr24), p30 = F.probeCena95Mp4(cfr30)
  assert.ok(p24 && p30); assert.equal(p24.duration, 15); assert.equal(p30.duration, 15)
  assert.equal(p24.sampleCount, 360); assert.equal(p30.sampleCount, 450)
  assert.equal(p24.timescale, 24000, 'escolhe hdlr=vide, não áudio de 48kHz que aparece primeiro')
  assert.equal(p24.timingSource, 'mp4_stts_ctts')
  assert.equal(p24.times[24], 1); assert.equal(p30.times[30], 1)
  const pv = F.probeCena95Mp4(vfr)
  assert.ok(pv); assert.equal(pv.duration, 15); assert.equal(pv.sampleCount, 408)
  assert.equal(pv.times[8], 1 / 3); assert.equal(pv.times[168], 7); assert.equal(pv.times[176], 7 + 8 / 30)
  assert.notEqual(pv.times[8], 8 * pv.duration / pv.sampleCount, 'VFR não pode interpolar tempo médio')
  assert.equal(F.probeCena95Mp4(mp4({ mdhdVersion: 1, mvhdVersion: 1, wide: true, zeroMdat: true })).times[240], 10)
  for (const bytes of [cfr24.subarray(0, -1), cfr24.subarray(0, 20), mp4({ duplicateVideo: true }), mp4({ duplicateStts: true }), mp4({ fragmented: true }), mp4({ moof: true }), mp4({ mdhdTicks: 360001 }), mp4({ sampleCount: 359 }), mp4({ emptyStts: true }), mp4({ sttsRuns: [[360, 0]] }), mp4({ sttsRuns: [[7201, 1000]] }), mp4({ deltas: Array(3600).fill(100), scale: 24000 }), mp4({ scale: 0 })]) assert.equal(F.probeCena95Mp4(bytes), null, 'metadados incompletos/inconsistentes/fora do teto reprovam')
}
function compositionProof(override) {
  const F = load(override)
  const offsets = Array.from({ length: 360 }, (_, n) => [2000, 3000, 1000][n % 3])
  const edited = F.probeCena95Mp4(mp4({ offsets, edit: { ticks: 15000, mediaStart: 2000 } }))
  assert.ok(edited, 'B-frames com deslocamento e edit único sem corte são suportados')
  assert.equal(edited.duration, 15); assert.equal(edited.times[0], 0); assert.equal(edited.times[24], 1)
  const signedOffsets = Array.from({ length: 360 }, (_, n) => [0, 1000, -1000][n % 3])
  const signedProbe = F.probeCena95Mp4(mp4({ offsets: signedOffsets, cttsVersion: 1 }))
  assert.ok(signedProbe); assert.equal(signedProbe.times[359], 359 / 24)
  assert.ok(F.probeCena95Mp4(mp4({ offsets, mdhdVersion: 1, mvhdVersion: 1, edit: { version: 1, ticks: 15000, mediaStart: 2000 } })))
  const uneven = F.probeCena95Mp4(mp4({ deltas: Array.from({ length: 270 }, (_, n) => [1000, 1000, 2000][n % 3]), offsets: Array.from({ length: 270 }, (_, n) => [0, 2000, -1000][n % 3]), cttsVersion: 1 }))
  assert.ok(uneven); assert.equal(uneven.times[1], 1000 / 24000); assert.equal(uneven.times[2], 3000 / 24000, 'ordem de apresentação difere de DTS')
  for (const bytes of [mp4({ offsets }), mp4({ cttsRuns: [[359, 0]] }), mp4({ cttsRuns: [[361, 0]] }), mp4({ cttsRuns: [[360, 48001]] }), mp4({ offsets: Array.from({ length: 360 }, (_, n) => n === 1 ? -1000 : 0), cttsVersion: 1 }), mp4({ edit: { count: 2 } }), mp4({ edit: { ticks: 15000, mediaStart: -1 } }), mp4({ edit: { ticks: 14000, mediaStart: 0 } }), mp4({ edit: { ticks: 15000, mediaStart: 0, rate: 0 } }), mp4({ edit: { ticks: 15000, mediaStart: 0, fraction: 1 } })]) assert.equal(F.probeCena95Mp4(bytes), null, 'não adivinha edit complexo, corte, dwell ou PTS duplicados')
}
function selectionProof(override) {
  const F = load(override)
  for (const [bytes, interval] of [[cfr24, 8], [cfr30, 10], [fractional, 10]]) {
    const p = F.probeCena95Mp4(bytes), s = F.cena95FrameSelection(p, 15)
    assert.ok(s); assert.equal(s.frameInterval, interval); assert.equal(s.maxFrames, 45)
    assert.equal(s.times.length, s.maxFrames); assert.equal(s.times[0], 0)
    assert.equal(s.times.at(-1), p.times[44 * interval]); assert.ok(s.times.at(-1) > 14.6)
    for (const [start, end] of [[0, 3], [3, 10], [10, 15]]) assert.ok(s.times.filter(t => t >= start && t < end).length >= 3, 'cada seção inteira tem pelo menos três quadros reais')
  }
  const pv = F.probeCena95Mp4(vfr), s = F.cena95FrameSelection(pv, 15)
  assert.equal(s.frameInterval, 8); assert.equal(s.maxFrames, 51); assert.equal(s.times[21], 7); assert.equal(s.times[22], 7 + 8 / 30)
  const short = F.probeCena95Mp4(mp4({ deltas: Array(336).fill(1000) }))
  assert.equal(F.cena95FrameSelection(short, 15), null, '14s não cobrem um pedido de 15s')
  const sparse = F.probeCena95Mp4(mp4({ deltas: Array(30).fill(12000) }))
  assert.ok(sparse); assert.equal(F.cena95FrameSelection(sparse, 15), null, 'amostras reais esparsas não viram cobertura inventada')
  const pathological = F.probeCena95Mp4(mp4({ deltas: [...Array(24).fill(8000), ...Array(840).fill(200)] }))
  assert.ok(pathological); assert.equal(F.cena95FrameSelection(pathological, 15), null, 'VFR exige N pequeno mas excede teto de imagens: reprovar em vez de truncar')
  const six = F.probeCena95Mp4(mp4({ deltas: Array(144).fill(1000) })), keep5 = F.cena95FrameSelection(six, 5)
  assert.ok(keep5.times.at(-1) > 5, 'arquivo de 6s/keep5 é extraído inteiro, sem atribuir tempos falsos')
  for (const seconds of [0, 0.5, NaN, Infinity, 31]) assert.equal(F.cena95FrameSelection(pv, seconds), null)
}
function fakeTransport(bytes = cfr24, options = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal)
    if (init.method === 'GET') {
      assert.equal(url, 'https://offline.example/own.mp4'); assert.ok(!init.headers, 'GET próprio não leva chave fal')
      if (options.getResponse) return options.getResponse()
      return new Response(bytes, { status: options.getStatus ?? 200, headers: { 'content-type': options.mime ?? 'video/mp4', ...(options.length === undefined ? {} : { 'content-length': String(options.length) }) } })
    }
    assert.equal(init.method, 'POST'); assert.equal(url, 'https://fal.run/fal-ai/workflow-utilities/extract-nth-frame')
    assert.equal(init.headers.Authorization, 'Key offline-fixture-only')
    const body = JSON.parse(init.body)
    assert.equal(body.video_url, 'https://offline.example/own.mp4'); assert.equal(body.output_format, 'jpg'); assert.equal(body.quality, 90)
    if (options.postThrow) throw new Error('ambiguous provider timeout')
    const count = options.count ?? body.max_frames
    const result = options.result ?? { images: Array.from({ length: count }, (_, n) => ({ url: `https://offline.example/frame-${n}.jpg` })), frame_count: count }
    return new Response(JSON.stringify(result), { status: options.postStatus ?? 200 })
  }
  return { calls, fetchImpl }
}
async function transportProof(override) {
  const F = load(override)
  for (const [bytes, interval, count] of [[cfr24, 8, 45], [cfr30, 10, 45], [vfr, 8, 51]]) {
    const mock = fakeTransport(bytes), result = await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: mock.fetchImpl, falKey: 'offline-fixture-only' })
    assert.ok(result); assert.equal(mock.calls.length, 2); assert.equal(result.frames.length, count)
    const body = JSON.parse(mock.calls[1].init.body)
    assert.equal(body.frame_interval, interval); assert.equal(body.max_frames, count, 'max_frames cobre todos os quadros escolhidos, não só começo')
    assert.equal(result.frames[0].t, 0); assert.ok(result.frames.at(-1).t > 14.6)
    assert.equal(result.frames[1].t, F.probeCena95Mp4(bytes).times[interval]); assert.equal(result.actualComputeSeconds, null)
    assert.ok(Number.isFinite(result.wallMs) && result.wallMs >= 0)
    if (bytes === vfr) assert.equal(result.frames[22].t, 7 + 8 / 30, 'retorno mapeado por PTS real em VFR')
  }
  for (const options of [{ postThrow: true }, { postStatus: 429 }, { postStatus: 503 }]) {
    const mock = fakeTransport(cfr24, options)
    assert.equal(await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: mock.fetchImpl, falKey: 'offline-fixture-only' }), null)
    assert.equal(mock.calls.filter(c => c.init.method === 'POST').length, 1, 'timeout/429/erro não podem repetir POST pago')
  }
  for (const result of [{ images: [{ url: 'https://offline.example/one.jpg' }], frame_count: 45 }, { images: Array.from({ length: 45 }, (_, n) => ({ url: `https://offline.example/${n}` })), frame_count: 44 }, { images: Array.from({ length: 45 }, () => ({ url: 'https://offline.example/same.jpg' })), frame_count: 45 }, { images: Array.from({ length: 45 }, () => ({ url: 'http://offline.example/insecure.jpg' })), frame_count: 45 }, { data: { images: [], frame_count: 0 } }]) {
    const mock = fakeTransport(cfr24, { result })
    assert.equal(await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: mock.fetchImpl, falKey: 'offline-fixture-only' }), null, 'resposta parcial/inválida não recebe timestamps inventados')
    assert.equal(mock.calls.length, 2)
  }
}
async function failClosedProof(override) {
  const F = load(override)
  for (const options of [{ getStatus: 206 }, { getStatus: 404 }, { mime: 'text/html' }, { length: cfr24.length + 1 }, { length: F.CENA95_FRAME_MAX_BYTES + 1 }]) {
    const mock = fakeTransport(cfr24, options)
    assert.equal(await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: mock.fetchImpl, falKey: 'offline-fixture-only' }), null)
    assert.equal(mock.calls.length, 1, 'download incompleto/inválido reprova antes de gastar')
  }
  for (const bytes of [cfr24.subarray(0, -1), mp4({ mdhdTicks: 360001 }), mp4({ deltas: Array(30).fill(12000) })]) {
    const mock = fakeTransport(bytes)
    assert.equal(await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: mock.fetchImpl, falKey: 'offline-fixture-only' }), null)
    assert.equal(mock.calls.length, 1)
  }
  for (const [url, deps] of [['http://offline.example/own.mp4', {}], ['https://user:secret@offline.example/own.mp4', {}], ['https://offline.example/own.mp4#ambiguous', {}], ['https://offline.example/own.mp4', { falKey: '' }], ['https://offline.example/own.mp4', { timeoutMs: 0 }]]) {
    let calls = 0
    assert.equal(await F.extractCena95Frames(url, 15, { falKey: 'offline-fixture-only', fetchImpl: async () => { calls++; throw new Error('should not run') }, ...deps }), null)
    assert.equal(calls, 0)
  }
  let reads = 0, cancels = 0, releases = 0
  const chunk = new Uint8Array(2 * 1024 * 1024)
  const stream = fakeTransport(cfr24, { getResponse: () => ({ status: 200, headers: new Headers(), body: { getReader: () => ({ read: async () => ++reads <= 33 ? { value: chunk, done: false } : { done: true }, cancel: async () => { cancels++ }, releaseLock: () => { releases++ } }) } }) })
  assert.equal(await F.extractCena95Frames('https://offline.example/own.mp4', 15, { fetchImpl: stream.fetchImpl, falKey: 'offline-fixture-only' }), null)
  assert.equal(cancels, 1, 'cap de 64MiB cancela stream antes de acumular corpo sem limite')
  assert.equal(releases, 1); assert.equal(stream.calls.length, 1)
}
const groups = { probeProof, compositionProof, selectionProof, transportProof, failClosedProof }
for (const [name, proof] of Object.entries(groups)) { await proof(); console.log(`OK ${name}`) }
function replaceOnce(from, to) { assert.ok(source.includes(from), `mutação deve encontrar fonte: ${from}`); return source.replace(from, to) }
const mutations = [
  ['VFR interpolado por média', 'probeProof', 'return (s.pts - mediaStart) / timescale', 'return n * duration / sampleCount'],
  ['áudio tomado como vídeo', 'probeProof', "if (tag(hdlr.start + 8) === 'vide')", 'if (videoTracks.length === 0)'],
  ['aceitar box truncado', 'probeProof', 'if (size < header || size > end - p) invalid()', 'if (size < header) invalid()'],
  ['ignorar sample_count', 'probeProof', 'sampleCount !== samples.length || ', ''],
  ['aceitar FPS excessivo', 'probeProof', ' || timescale / delta > CENA95_FRAME_MAX_FPS', ''],
  ['ignorar ctts', 'compositionProof', 'if (ctts) {', 'if (false && ctts) {'],
  ['não ordenar apresentação B-frame', 'compositionProof', 'samples.sort((a, b) => a.pts - b.pts)', '/* DTS não é PTS */'],
  ['aceitar ctts sem todas amostras', 'compositionProof', 'if (index !== sampleCount) invalid()', '/* aceita tabela parcial */'],
  ['inventar cobertura de vídeo curto', 'selectionProof', 'probe.duration + 0.001 < seconds || ', ''],
  ['ignorar vãos temporais', 'selectionProof', 'if (times.some((t, n) => n > 0 && t - times[n - 1] > MAX_GAP) || probe.duration - times[times.length - 1] > MAX_GAP) continue', '/* ignora lacunas */'],
  ['truncar max_frames', 'transportProof', 'max_frames: selection.maxFrames', 'max_frames: 10'],
  ['timestamp de 24FPS inventado', 'transportProof', 't: selection.times[n]', 't: n * selection.frameInterval / 24'],
  ['aceitar resposta parcial', 'transportProof', 'if (!Array.isArray(raw.images) || raw.frame_count !== selection.maxFrames || raw.images.length !== selection.maxFrames) return null', 'if (!Array.isArray(raw.images)) return null'],
  ['latência tratada como CPU real', 'transportProof', 'actualComputeSeconds: null }\n  } catch', 'actualComputeSeconds: (Date.now() - start) / 1000 }\n  } catch'],
  ['retry silencioso de POST', 'transportProof', 'const response = await fetchImpl(`https://fal.run/${CENA95_FRAME_ENDPOINT}`, {', 'const response = await (async (url, init) => { try { return await fetchImpl(url, init) } catch { return await fetchImpl(url, init) } })(`https://fal.run/${CENA95_FRAME_ENDPOINT}`, {'],
  ['aceitar HTTP206 parcial', 'failClosedProof', 'if (video.status !== 200) return null', 'if (video.status < 200 || video.status > 299) return null'],
  ['não limitar stream', 'failClosedProof', 'if (total > cap) { await reader.cancel(); invalid() }', 'if (false && total > cap) { await reader.cancel(); invalid() }'],
]
for (const [name, group, from, to] of mutations) {
  const changed = replaceOnce(from, to)
  let red = false
  try { await groups[group](changed) } catch { red = true }
  assert.equal(red, true, `mutante precisa ficar vermelho: ${name}`)
}
console.log(`OK KINEO-ADS-CENA-95-2110 — ${Object.keys(groups).length} grupos; ${mutations.length} mutantes vermelhos; sem rede real`)
