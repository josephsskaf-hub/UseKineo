#!/usr/bin/env node
// KINEO-CLIPES-2026-09-29 — guardião do clipe avulso (/clips). Node puro: transpila os módulos puros de lib/clips e os
// EXECUTA com dependências falsas (nada de fal, banco ou crédito de verdade); o resto é leitura de arquivo.
// Prova: preço = tabela proposta · durações reais por motor · motor escondido recusado · duração fora da lista recusada ·
// foto de outra conta recusada · moderação antes do débito · estorno em toda falha · MP4 no nosso bucket antes de
// "pronto" · idempotência · nenhuma rota nova sob generate-video-* · rede de estorno no cron · 16 línguas.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const ts = createRequire(join(root, 'package.json'))('typescript')
let checks = 0
const ok = (v, label) => { assert.ok(v, label); checks += 1 }
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks += 1 }

const cache = new Map()
function loadTs(p) {
  if (cache.has(p)) return cache.get(p).exports
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const mod = { exports: {} }
  cache.set(p, mod)
  const req = (name) => {
    if (name.startsWith('./')) return loadTs(posix.join(posix.dirname(p), name.slice(2) + '.ts'))
    throw new Error(`${p}: import inesperado ${name} (módulo precisa ser puro)`)
  }
  new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
  return mod.exports
}

const cat = loadTs('lib/clips/clipCatalog.ts')
const price = loadTs('lib/clips/clipPricing.ts')
const flow = loadTs('lib/clips/clipFlow.ts')
const copy = loadTs('lib/clips/clipCopy.ts')
const engineCost = loadTs('lib/credits/engineCost.ts')

// ─── 1. Durações reais por motor (schema da fal, 29/09) ─────────────────────
const EXPECTED_SECONDS = {
  seedance: [5, 7, 10, 12],
  kling: [5, 10],
  hollywood: [5, 7, 10, 15],
  veo: [6, 8],
  h3: [5, 7, 10, 15],
  omni: [5, 7, 10],
  s25: [5, 7, 10, 15],
}
for (const [engine, secs] of Object.entries(EXPECTED_SECONDS)) {
  equal(cat.offeredSecondsFor(engine), secs, `durações reais ${engine}`)
  for (const s of secs) ok(cat.CLIP_ENGINES[engine].falSeconds.includes(s), `${engine} ${s}s é aceito pelo schema (sem emenda)`)
}
equal([...cat.CLIP_TARGET_SECONDS], [5, 7, 10, 15], 'alvos do fundador 5/7/10/15')
equal(cat.nearestAcceptedSeconds([4, 6, 8], 5), 6, 'empate vai para o maior (Veo 5 → 6)')
equal(cat.nearestAcceptedSeconds([4, 6, 8], 15), null, 'Veo não chega a 15 (mais de 3 s de distância)')
equal(cat.nearestAcceptedSeconds([5, 10], 15), null, 'Kling 2.5: 15 fica a 5 s do 10 — sem botão de 15')
equal(cat.CLIP_ENGINES.omni.t2vModel, null, 'Omni não tem text-to-video (schema)')
equal(cat.modesFor('omni'), ['i2v'], 'Omni só com foto')

// ─── 2. Preço = tabela proposta ──────────────────────────────────────────────
const EXPECTED_CREDITS = {
  seedance: { 5: 5, 7: 5, 10: 5, 12: 5 },
  kling: { 5: 5, 10: 8 },
  hollywood: { 5: 8, 7: 11, 10: 16, 15: 23 },
  veo: { 6: 7, 8: 9 },
  h3: { 5: 5, 7: 5, 10: 7, 15: 11 },
  omni: { 5: 12, 7: 17, 10: 23 },
  s25: { 5: 12, 7: 16, 10: 23, 15: 35 },
}
for (const [engine, table] of Object.entries(EXPECTED_CREDITS)) {
  equal(Object.keys(table).map(Number), EXPECTED_SECONDS[engine], `tabela cobre as durações de ${engine}`)
  for (const [s, cr] of Object.entries(table)) {
    equal(price.clipCreditCost(engine, Number(s), false), cr, `${engine} ${s}s = ${cr} cr (texto)`)
    equal(price.clipCreditCost(engine, Number(s), true), cr, `${engine} ${s}s = ${cr} cr (foto: fal cobra igual)`)
    const m = price.clipMarginAtStudio(engine, Number(s))
    ok(m >= price.filmMarginAtStudio(engine) - 1e-9, `${engine} ${s}s: margem ${(m * 100).toFixed(1)}% ≥ margem do filme`)
    ok(m >= price.CLIP_MARGIN_FLOOR - 1e-9, `${engine} ${s}s: margem ≥ piso`)
  }
}
assert.throws(() => price.clipCreditCost('kling', 7.5), /positive integer/); checks += 1
// Espelhos com a fonte: créditos do filme, preço/créditos do Studio e o preço do Modo Clipe.
for (const [engine, spec] of Object.entries(price.CLIP_COSTS)) {
  equal(spec.filmCredits, engineCost.creditCostFor(spec.filmQuality, true), `filmCredits de ${engine} = creditCostFor(${spec.filmQuality})`)
}
const checkout = read('lib/checkoutPricing.ts')
const tierPrices = checkout.slice(checkout.indexOf('export const TIER_PRICES'))
equal(Number(/pro:\s*\{\s*usd:\s*(\d+)\s*\}/.exec(tierPrices)[1]), price.STUDIO_PLAN_USD_CENTS, 'US$ do Studio = TIER_PRICES.pro')
const tierCredits = checkout.slice(checkout.indexOf('export const TIER_CREDITS'))
equal(Number(/^\s*pro:\s*(\d+),?\s*$/m.exec(tierCredits.slice(0, tierCredits.indexOf('\n}')))[1]), price.STUDIO_PLAN_CREDITS, 'créditos do Studio = TIER_CREDITS.pro')
equal(Number(/export const CLIP_CREDITS = (\d+)/.exec(read('lib/cinematic/shotSpec.ts'))[1]), price.CLIP_MIN_CREDITS, 'piso = preço do Modo Clipe do Studio')

// ─── 3. Payload da fal por motor ─────────────────────────────────────────────
const U = '11111111-2222-3333-4444-555555555555'
const OTHER = '99999999-8888-7777-6666-555555555555'
const SUPA = 'https://abc.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg`
const req = (engine, seconds, extra = {}) => {
  const r = cat.validateClipRequest({ engine, seconds, aspect: '9:16', prompt: 'a storm over the sea at dusk', imageUrl: null, ...extra }, { userId: U, supabaseUrl: SUPA })
  assert.ok(r.ok, `${engine} ${seconds} deveria validar: ${r.error}`)
  return r.request
}
const k25 = cat.buildClipFalInput(req('kling', 10))
equal([k25.duration, k25.aspect_ratio], ['10', '9:16'], 'Kling 2.5 t2v: duração string + formato')
const k25i = cat.buildClipFalInput(req('kling', 5, { imageUrl: PHOTO }))
equal([k25i.image_url, 'aspect_ratio' in k25i], [PHOTO, false], 'Kling 2.5 i2v: foto = 1º quadro, formato da foto')
const veo = cat.buildClipFalInput(req('veo', 6))
equal([veo.duration, veo.generate_audio, veo.resolution], ['6s', false, '1080p'], 'Veo: "6s", sem áudio, 1080p')
const h3 = cat.buildClipFalInput(req('h3', 15, { aspect: '1:1' }))
equal([h3.duration, h3.aspect_ratio, h3.resolution], [15, '1:1', '768P'], 'H3: inteiro, 1:1, 768P')
const sd = cat.buildClipFalInput(req('seedance', 12, { imageUrl: PHOTO }))
equal([sd.duration, sd.aspect_ratio, sd.generate_audio, sd.image_url], ['12', 'auto', false, PHOTO], 'Seedance i2v: auto, sem áudio')
const k3 = cat.buildClipFalInput(req('hollywood', 7))
equal([k3.duration, k3.generate_audio], ['7', false], 'Kling 3: sem áudio (preço de US$ 0,112/s)')
const om = cat.buildClipFalInput(req('omni', 10, { imageUrl: PHOTO, aspect: '16:9' }))
equal([om.duration, om.aspect_ratio], [10, '16:9'], 'Omni: inteiro + formato explícito')

// ─── 4. Validação: duração, modo, formato, foto alheia ───────────────────────
const bad = (input, code) => {
  const r = cat.validateClipRequest({ engine: 'kling', seconds: 5, aspect: '9:16', prompt: 'a storm over the sea', imageUrl: null, ...input }, { userId: U, supabaseUrl: SUPA })
  equal([r.ok, r.code], [false, code], `recusa ${code}: ${JSON.stringify(input)}`)
}
bad({ seconds: 7 }, 'seconds')                       // Kling 2.5 não faz 7
bad({ engine: 'veo', seconds: 5 }, 'seconds')        // Veo não faz 5 (faz 6)
bad({ seconds: 5.5 }, 'seconds')
bad({ engine: 'sora' }, 'engine')
bad({ engine: 'omni', seconds: 5 }, 'mode')          // Omni sem foto
bad({ engine: 'veo', seconds: 6, aspect: '1:1' }, 'aspect')
bad({ prompt: 'ab' }, 'prompt')
bad({ prompt: 'x'.repeat(1001) }, 'prompt')
for (const foreign of [
  `${SUPA}/storage/v1/object/public/avatars/${OTHER}/foto.jpg`,
  `https://evil.example/storage/v1/object/public/avatars/${U}/foto.jpg`,
  `${SUPA}/storage/v1/object/public/avatars/${U}x/foto.jpg`,
  `${SUPA}/storage/v1/object/public/avatars/${U}/../${OTHER}/foto.jpg`,
  `${SUPA}/storage/v1/object/public/avatars/${U}/%2e%2e/${OTHER}/foto.jpg`,
  `${SUPA}/storage/v1/object/public/renders/${U}/foto.jpg`,
  `${SUPA}/storage/v1/object/public/avatars/${U}/`,
  `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg?x=1`,
]) {
  equal(cat.ownedClipImageUrl(foreign, U, SUPA), null, `foto recusada: ${foreign.replace(SUPA, '<supa>')}`)
  bad({ imageUrl: foreign }, 'image')
}
equal(cat.ownedClipImageUrl(PHOTO, U, SUPA), PHOTO, 'foto própria aceita')

// ─── 5. Visibilidade ─────────────────────────────────────────────────────────
equal(cat.clipEngineAccess({ paused: false, launchVisible: true, planAllowed: true }), { ok: true }, 'motor liberado')
equal(cat.clipEngineAccess({ paused: true, launchVisible: true, planAllowed: true }).reason, 'paused', 'pausado recusa')
equal(cat.clipEngineAccess({ paused: false, launchVisible: false, planAllowed: true }).reason, 'hidden', 'interno recusa conta de fora')
equal(cat.clipEngineAccess({ paused: false, launchVisible: true, planAllowed: false }).reason, 'plan', 'fora do plano recusa')

// ─── 6. Fluxo do pedido (dependências falsas, ordem gravada) ─────────────────
const NOW = Date.parse('2026-09-29T12:00:00Z')
function fakeSubmitDeps(over = {}) {
  const calls = []
  const rows = new Map()
  const deps = {
    supabaseUrl: SUPA,
    engineAccess: () => ({ ok: true }),
    findByKey: async (_u, key) => { calls.push('find'); return rows.get(key) ?? null },
    countActive: async () => { calls.push('count'); return 0 },
    verifyImage: async () => { calls.push('verify') },
    moderate: async () => { calls.push('moderate'); return { ok: true } },
    getBalance: async () => { calls.push('balance'); return 100 },
    newId: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    insertPending: async (row) => { calls.push('insert'); rows.set(row.idempotency_key, row); return { ok: true } },
    debit: async (ref, cr) => { calls.push(`debit:${ref}:${cr}`); return { ok: true, balance: 100 - cr } },
    refund: async (ref) => { calls.push(`refund:${ref}`); return 8 },
    submit: async (model) => { calls.push(`submit:${model}`); return { ok: true, requestId: 'req_1' } },
    markSubmitted: async () => { calls.push('markSubmitted'); return true },
    markFailed: async (_id, reason, refunded) => { calls.push(`markFailed:${reason}:${refunded}`); return true },
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => NOW,
    ...over,
  }
  return { deps, calls, rows }
}
const body = (over = {}) => ({ engine: 'kling', seconds: 10, aspect: '9:16', prompt: 'a storm over the sea at dusk', imageUrl: null, ...over })
const KEY = 'clip-ui-test-0001'

{
  const { deps, calls } = fakeSubmitDeps()
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.status, r.clip.status, r.clip.credits, r.clip.billing_reference], [true, 202, 'processing', 8, 'clips-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'], 'pedido feliz: 202, processing, 8 cr, chave clips-')
  const iMod = calls.indexOf('moderate'), iDebit = calls.findIndex((c) => c.startsWith('debit:'))
  ok(iMod >= 0 && iDebit > iMod, 'moderação ANTES do débito')
  ok(calls.indexOf('insert') < iDebit, 'linha (trava de idempotência) nasce antes do débito')
  ok(iDebit < calls.findIndex((c) => c.startsWith('submit:')), 'débito antes do envio pago')
  ok(!calls.some((c) => c.startsWith('refund')), 'sucesso não estorna')
  ok(calls.includes('event:clip_requested'), 'clip_requested gravado')
}
{
  const { deps, calls } = fakeSubmitDeps({ engineAccess: () => ({ ok: false, reason: 'hidden', status: 404 }) })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ engine: 's25', seconds: 5 }) })
  equal([r.ok, r.status, r.code], [false, 404, 'engine_hidden'], 'motor escondido recusado')
  equal(calls, [], 'motor escondido: nada consultado, moderado ou cobrado')
}
{
  const { deps, calls } = fakeSubmitDeps({ engineAccess: () => ({ ok: false, reason: 'paused', status: 409 }) })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ engine: 'omni', seconds: 5, imageUrl: PHOTO }) })
  equal([r.ok, r.code, calls.length], [false, 'engine_paused', 0], 'motor pausado recusado sem custo')
}
{
  const { deps, calls } = fakeSubmitDeps()
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ seconds: 7 }) })
  equal([r.ok, r.code, calls.length], [false, 'seconds', 0], 'duração fora da lista recusada sem custo')
}
{
  const { deps, calls } = fakeSubmitDeps()
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ imageUrl: `${SUPA}/storage/v1/object/public/avatars/${OTHER}/f.jpg` }) })
  equal([r.ok, r.status, r.code, calls.length], [false, 403, 'image', 0], 'foto de outra conta recusada antes de tudo')
}
{
  const { deps, calls } = fakeSubmitDeps({ moderate: async () => { return { ok: false, reason: 'blocked', status: 422, message: 'no' } } })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ imageUrl: PHOTO, seconds: 5 }) })
  equal([r.ok, r.code], [false, 'moderation'], 'moderação barra')
  ok(!calls.some((c) => c.startsWith('debit') || c === 'insert' || c.startsWith('submit')), 'barrado pela moderação: sem linha, sem débito, sem fal')
}
{
  const { deps, calls } = fakeSubmitDeps({ getBalance: async () => 3 })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.status, r.code], [false, 402, 'credits'], 'saldo insuficiente = 402')
  ok(!calls.some((c) => c.startsWith('debit') || c === 'insert'), 'sem saldo: nada cobrado')
}
for (const [label, submit, reason] of [
  ['recusa explícita', async () => ({ ok: false, ambiguous: false, error: 'fal 422' }), 'provider_rejected'],
  ['resposta ambígua', async () => ({ ok: false, ambiguous: true, error: 'timeout' }), 'submit_ambiguous'],
]) {
  const { deps, calls } = fakeSubmitDeps({ submit })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.code], [false, reason], `${label}: falha`)
  ok(calls.includes('refund:clips-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), `${label}: ESTORNA pela chave do débito`)
  ok(calls.includes(`markFailed:${reason}:8`), `${label}: fecha failed com o valor devolvido`)
  ok(calls.includes('event:clip_failed'), `${label}: clip_failed gravado`)
}
{
  const { deps, calls } = fakeSubmitDeps({ debit: async () => ({ ok: false, error: 'insufficient' }), refund: async (ref) => { calls.push(`refund:${ref}`); return 0 } })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.code], [false, 'debit_failed'], 'débito falhou')
  ok(calls.some((c) => c.startsWith('refund:')), 'débito falhou: estorno pela mesma chave (o RPC pode ter gravado)')
  ok(!calls.some((c) => c.startsWith('submit:')), 'débito falhou: nada vai para a fal')
}
{
  // Idempotência: o mesmo pedido de novo devolve a MESMA linha e não cobra.
  const { deps, calls } = fakeSubmitDeps()
  await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  calls.length = 0
  const again = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([again.ok, again.replay], [true, true], 'replay pela chave')
  ok(!calls.some((c) => c.startsWith('debit') || c.startsWith('submit')), 'replay não debita nem reenvia')
  const other = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body({ prompt: 'outro pedido diferente' }) })
  equal([other.ok, other.status], [false, 409], 'mesma chave com outro conteúdo = 409')
}
{
  // Corrida: duas abas passam da checagem; a segunda perde o INSERT (UNIQUE) e devolve a linha da vencedora, sem débito.
  const winner = { fingerprint: flow.clipFingerprint(req('kling', 10)), status: 'processing', id: 'w' }
  let lookups = 0
  const { deps, calls } = fakeSubmitDeps({
    findByKey: async () => { lookups += 1; return lookups === 1 ? null : winner },
    insertPending: async () => ({ ok: false, conflict: true }),
  })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.replay, r.clip.id], [true, true, 'w'], 'conflito no INSERT = replay da vencedora')
  ok(!calls.some((c) => c.startsWith('debit')), 'perdedora da corrida não debita')
}
{
  const { deps } = fakeSubmitDeps()
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: 'curta', body: body() })
  equal([r.ok, r.code], [false, 'idempotency'], 'chave inválida recusada')
}
{
  const { deps, calls } = fakeSubmitDeps({ countActive: async () => flow.CLIP_MAX_ACTIVE })
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: KEY, body: body() })
  equal([r.ok, r.status], [false, 429], 'teto de clipes em andamento')
  ok(!calls.some((c) => c.startsWith('debit')), 'teto: nada cobrado')
}
equal(Object.keys(flow.clipTelemetry({ id: 'x', engine: 'kling', seconds: 5, mode: 'image', credits: 5 })).sort(), ['clip_id', 'credits', 'engine', 'seconds', 'with_image'], 'telemetria sem dado pessoal (sem texto, foto ou e-mail)')

// ─── 7. Entrega (settleClip) ─────────────────────────────────────────────────
const baseRow = (over = {}) => ({
  id: 'c1', user_id: U, idempotency_key: KEY, fingerprint: 'f', billing_reference: 'clips-c1', engine: 'kling', mode: 'text',
  model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', seconds: 10, aspect: '9:16', prompt: 'p', image_url: null, credits: 8,
  fal_usd: 0.7, status: 'processing', fal_request_id: 'req_1', video_url: null, failure_reason: null, credits_refunded: 0,
  created_at: new Date(NOW - 60_000).toISOString(), ...over,
})
function fakeSettleDeps(over = {}) {
  const calls = []
  const deps = {
    poll: async () => { calls.push('poll'); return { state: 'done', url: 'https://v3.fal.media/files/x.mp4' } },
    persist: async (row) => { calls.push('persist'); return `${SUPA}/storage/v1/object/public/renders/clips/${row.user_id}/${row.id}.mp4` },
    refund: async (ref) => { calls.push(`refund:${ref}`); return 8 },
    markDone: async (_id, url) => { calls.push(`markDone:${url}`); return true },
    markFailed: async (_id, reason, refunded) => { calls.push(`markFailed:${reason}:${refunded}`); return true },
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => NOW,
    ...over,
  }
  return { deps, calls }
}
{
  const { deps, calls } = fakeSettleDeps()
  const r = await flow.settleClip(deps, baseRow())
  equal(r.status, 'done', 'pronto')
  ok(calls.indexOf('persist') >= 0 && calls.indexOf('persist') < calls.findIndex((c) => c.startsWith('markDone')), 'MP4 persistido ANTES de marcar pronto')
  ok(calls.some((c) => c.startsWith('markDone:') && c.includes('/renders/clips/') && !c.includes('fal.media')), 'pronto grava a URL NOSSA, nunca a da fal')
  ok(calls.includes('event:clip_delivered') && !calls.some((c) => c.startsWith('refund')), 'entregue: evento e nenhum estorno')
}
{
  const { deps, calls } = fakeSettleDeps({ persist: async () => { calls.push('persist'); throw new Error('bucket down') } })
  const r = await flow.settleClip(deps, baseRow())
  equal(r.status, 'processing', 'persistência falhou: continua processing (tenta no próximo poll)')
  ok(!calls.some((c) => c.startsWith('markDone')), 'persistência falhou: NUNCA marca pronto')
  const { deps: d2, calls: c2 } = fakeSettleDeps({ persist: async () => { throw new Error('bucket down') } })
  const old = await flow.settleClip(d2, baseRow({ created_at: new Date(NOW - flow.CLIP_EXPIRE_MS - 1).toISOString() }))
  equal(old.status, 'failed', 'persistência falhou além do prazo: falha')
  ok(c2.includes('refund:clips-c1'), 'persistência falhou além do prazo: ESTORNA')
}
for (const [label, poll, row, reason] of [
  ['falha terminal da fal', async () => ({ state: 'failed', error: '422' }), baseRow(), 'provider_failed'],
  ['prazo vencido', async () => ({ state: 'running' }), baseRow({ created_at: new Date(NOW - flow.CLIP_EXPIRE_MS - 1).toISOString() }), 'expired'],
  ['envio perdido (pending sem request_id)', async () => ({ state: 'running' }), baseRow({ status: 'pending', fal_request_id: null, created_at: new Date(NOW - flow.CLIP_PENDING_STALE_MS - 1).toISOString() }), 'submit_lost'],
]) {
  const { deps, calls } = fakeSettleDeps({ poll })
  const r = await flow.settleClip(deps, row)
  equal([r.status, r.failure_reason, r.credits_refunded], ['failed', reason, 8], `${label}: falha com estorno`)
  ok(calls.includes('refund:clips-c1'), `${label}: ESTORNA pela chave do débito`)
  ok(calls.includes('event:clip_failed'), `${label}: clip_failed`)
}
{
  const { deps, calls } = fakeSettleDeps({ poll: async () => ({ state: 'unknown' }) })
  const r = await flow.settleClip(deps, baseRow())
  equal(r.status, 'processing', 'transporte da fal instável (jovem): espera, não estorna')
  ok(!calls.some((c) => c.startsWith('refund')), 'instável: nenhum estorno')
}
{
  // Dois atores (aba + cron): quem não moveu a linha não grava evento; o estorno é idempotente no banco.
  const { deps, calls } = fakeSettleDeps({ poll: async () => ({ state: 'failed', error: 'x' }), refund: async () => 0, markFailed: async () => false })
  await flow.settleClip(deps, baseRow())
  ok(!calls.includes('event:clip_failed'), 'perdeu a corrida: sem evento duplicado')
  const { deps: d3, calls: c3 } = fakeSettleDeps()
  await flow.settleClip(d3, baseRow({ status: 'done', video_url: 'x' }))
  equal(c3, [], 'linha terminal não é tocada')
}

// ─── 8. Fiação real (leitura de arquivo) ─────────────────────────────────────
const route = read('app/api/clips/route.ts')
const status = read('app/api/clips/status/route.ts')
const server = read('lib/clips/clipServer.ts')
ok(route.includes('submitClip(submitDepsFor(') && status.includes('settleClip(settleDepsFor('), 'rotas chamam o fluxo executado acima')
ok(/export const fetchCache = 'force-no-store'/.test(route) && /export const fetchCache = 'force-no-store'/.test(status), 'rotas sem Data Cache')
ok(server.includes("moderateContent({ surface: 'clip', stage: 'input'"), 'moderação real = superfície clip (régua do /images e /animate)')
ok(server.includes('debitVideoCredits(userSupabase') && server.includes('refundRenderCredits(ref)'), 'débito e estorno pelos helpers únicos da casa')
ok(server.includes("storage.from(CLIPS_BUCKET).upload(path, buf, { contentType: 'video/mp4', upsert: true })") && server.includes("CLIPS_BUCKET = 'renders'"), 'MP4 no bucket renders (nenhum bucket novo)')
ok(server.includes("video_url: row.status === 'done' ? row.video_url : null"), 'resposta pública nunca expõe URL antes de pronto')
ok(server.includes('decideEngineGate(') && server.includes('enginePaused(engine)') && server.includes('s25Visible(account.email)'), 'visibilidade lê os interruptores da casa')
const refund = read('lib/credits/refund.ts')
ok(refund.includes(".not('render_id', 'like', 'clips-%')"), 'varredura genérica pula clips-% (clipe entregue não tem linha em videos)')
ok(!refund.includes(".not('render_id', 'like', 'clip-%')"), 'Modo Clipe do Studio (clip-%) continua na varredura genérica')
const cron = read('app/api/cron/refund-sweep/route.ts')
ok(cron.includes("import { sweepClipJobs } from '@/lib/clips/clipServer'") && cron.includes('await sweepClipJobs()'), 'cron horário roda a rede do clipe')
const events = read('app/api/events/route.ts')
for (const name of ['clip_requested', 'clip_delivered', 'clip_failed']) ok(events.includes(`'${name}',`), `${name} é só do servidor`)
ok(existsSync(join(root, 'supabase/migrations/20260929190000_clips.sql')), 'migration da tabela clips escrita')
const mig = read('supabase/migrations/20260929190000_clips.sql')
ok(/unique \(user_id, idempotency_key\)/.test(mig) && /billing_reference text not null unique/.test(mig), 'trava de idempotência no banco')

// Nenhuma rota nova sob generate-video-* nem mexida na trava 8.2.
let changed = []
try {
  const base = execSync('git merge-base HEAD origin/main', { cwd: root, encoding: 'utf8' }).trim()
  changed = execSync(`git diff --name-only ${base}`, { cwd: root, encoding: 'utf8' }).split('\n')
    .concat(execSync('git ls-files --others --exclude-standard', { cwd: root, encoding: 'utf8' }).split('\n'))
    .map((s) => s.trim()).filter(Boolean)
} catch { changed = [] }
const TRAVA = [/^app\/api\/generate-video-/, /^lib\/compose/, /^lib\/hollywood\//, /^lib\/cinematic\//, /^lib\/broll\//, /^lib\/lyriaMusic/, /^lib\/narrationFit/, /^app\/api\/analyze-idea\//, /^app\/api\/generate-script\//]
equal(changed.filter((f) => TRAVA.some((r) => r.test(f))), [], 'nada na trava 8.2 (inclui app/api/generate-video-*)')
ok(existsSync(join(root, 'app/api/clips/route.ts')) && !existsSync(join(root, 'app/api/generate-video-clips')), 'rota nova mora em app/api/clips')

// ─── 9. Tela, pares de navegação e 16 línguas ────────────────────────────────
const client = read('app/(dashboard)/clips/ClipsClient.tsx')
ok(client.includes("{e.seconds.join(' · ')} s"), 'card do motor mostra as durações reais antes do clique')
ok(client.includes("t('notLength', { engine: engine.label, s: seconds })") && client.includes('onClick={() => setEngineKey(alt.key)}'), 'duração que o motor não faz: mostra quem faz e troca com 1 clique')
const sidebar = read('components/Sidebar.tsx')
ok(read('lib/ui/workspaceNavigation.ts').includes("{ href: '/clips', label: 'Clips', icon: 'clips' }") && sidebar.includes('  clips: ('), 'Sidebar tem Clipes')
ok(sidebar.includes("WORKSPACE_NAV.filter(item => item.href !== '/clips' || clipsVisible(userEmail))"), 'Sidebar respeita o interruptor do clipe')
const mobile = read('components/MobileNav.tsx')
ok(mobile.includes("href: '/clips'") && mobile.includes("{CLIPS_PUBLIC && primaryLink('/clips')}") && mobile.includes("...(CLIPS_PUBLIC ? ['/clips'] : [])"), 'MobileNav tem Clipes (par) atrás do interruptor')
const landing = read('app/KineoLanding.tsx')
ok((landing.match(/href="\/clips"/g) ?? []).length === 2 && (landing.match(/\{clipsVisible\(initialEmail\) && <Link href="\/clips"/g) ?? []).length === 2, 'mega-menu e menu público têm Clipes (par) atrás do interruptor')

// ─── 10. Interruptor de lançamento: preço é PROPOSTA até o "vai" do fundador ─
const launch = read('lib/clips/clipLaunch.ts')
ok(/export const CLIPS_PUBLIC = false\b/.test(launch) && launch.includes('return CLIPS_PUBLIC || isInternalEmail(email)'), 'CLIPS_PUBLIC=false: só a casa')
const routeNow = read('app/api/clips/route.ts')
ok((routeNow.match(/if \(!clipsVisible\(user\.email\)\) return NextResponse\.json\(\{ error: 'Not found\.'/g) ?? []).length === 2 && routeNow.includes('if (!clipsVisible(null)) return NextResponse.json({ error: \'Not found.\''), 'GET e POST recusam conta de fora antes de qualquer custo')
ok(read('app/api/clips/status/route.ts').includes("if (!clipsVisible(user.email)) return NextResponse.json({ error: 'Not found.' }"), 'status recusa conta de fora')
ok(read('app/(dashboard)/clips/page.tsx').includes('if (!clipsVisible(user?.email ?? null)) notFound()'), 'página 404 para conta de fora')
ok(routeNow.indexOf('clipsVisible(user.email)') < routeNow.indexOf('submitClip('), 'interruptor antes do fluxo pago')
const EN = Object.keys(copy.CLIP_COPY_EN)
const LANGS = ['pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
equal(Object.keys(copy.CLIP_COPY).sort(), [...LANGS].sort(), '15 línguas + inglês')
const marks = (s) => (s.match(/\{(engine|s|n)\}/g) ?? []).sort().join(',')
for (const lang of LANGS) {
  equal(Object.keys(copy.CLIP_COPY[lang]).sort(), [...EN].sort(), `${lang}: todas as chaves`)
  for (const k of EN) {
    ok(copy.CLIP_COPY[lang][k].trim().length > 0, `${lang}.${k} não vazio`)
    equal(marks(copy.CLIP_COPY[lang][k]), marks(copy.CLIP_COPY_EN[k]), `${lang}.${k}: mesmos marcadores`)
  }
}
equal(copy.clipCopy('pt', 'notLength', { engine: 'Kling 2.5', s: 7 }), 'O Kling 2.5 não faz clipes de 7 s. Estes motores fazem:', 'pt preenche marcadores')
const refine = JSON.parse(read('lib/ui/refinementCopy.json'))
for (const lang of ['en', ...LANGS]) ok(typeof refine[lang]?.['Clips'] === 'string', `menu "Clips" traduzido em ${lang}`)

console.log(`OK test-clipes-2026-09-29: ${checks} verificações`)
