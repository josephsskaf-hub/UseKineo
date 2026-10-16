#!/usr/bin/env node
// KINEO-S25-FOTO-CLIPES-1610 — guardião do conserto do Seedance 2.5 com foto no /clips
// (docs/DIAGNOSTICO-S25-FOTO-CLIPES-2026-10-16.md; fundador 16/10: "confio em você pra escolher a próxima opção").
//
// EXECUTA o código real (lib/clips/clipCatalog.ts, clipFlow.ts submitClip/settleClip, clipServer.ts pollFal/submitToFalOnce
// via settleDepsFor/submitDepsFor) pelo carregador offline (scripts/test-support/offline-ts-loader.mjs — lê com readFileSync e
// transpila; os '@/...' são resolvidos ou trocados por falsos que FALHAM se tocados). Nenhuma rede, banco, débito ou fal real.
// Prova:
//   [catalogo] o 2.5 do clipe não tem modo foto (i2vModel null, modesFor só t2v, card photo:false) e os motores sugeridos para
//              foto (Kling 3, Seedance 1.5) seguem com foto;
//   [servidor] pedido do 2.5 COM foto é recusado (400 'mode') antes de consulta, moderação, débito ou envio — mesmo pagante;
//   [texto]    o 2.5 de TEXTO do clipe segue igual (endpoint do filme, 480p, sem áudio, 5/7/10/15 s, aceito e cobrado);
//   [filme]    o FILME do 2.5 segue com i2v + âncora (lib/hollywood/router.ts) e não lê o catálogo do clipe;
//   [poll]     falha da fal na CONSULTA grava provider_error (o err.body.detail real) no clip_failed + console.warn, em 2 motores;
//   [envio]    recusa da fal no ENVIO grava provider_error no clip_failed + console.warn;
//   [limpeza]  nada gravado/logado carrega URL, a FAL_KEY, token ou o eco do pedido; ≤300 caracteres; failure_reason curto;
//   [tela]     motor sem foto esconde o "Add photo" e sugere Kling 3 / Seedance 1.5 (texto noPhoto + botões);
//   mutantes   cada um aplicado (âncora achada 1×, texto mudou) e VERMELHO no grupo certo.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve '@/...' a partir do cwd
const readRaw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const CATALOG = 'lib/clips/clipCatalog.ts'
const FLOW = 'lib/clips/clipFlow.ts'
const SERVER = 'lib/clips/clipServer.ts'
const ROUTER = 'lib/hollywood/router.ts'
const CLIENT = 'app/(dashboard)/clips/ClipsClient.tsx'
const COPY = 'lib/clips/clipCopy.ts'

const SUPA = 'https://abc.supabase.co'
const NOW = '2026-10-16T14:00:00.000Z'
const UID = '11111111-2222-3333-4444-555555555555'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${UID}/perfume.png`
// Chave falsa CURTA de propósito (16 caracteres): só a remoção explícita da FAL_KEY a pega — nenhuma outra regra da limpeza.
const FAKE_KEY = 'kfalSecretZeta9x'
const S25_T2V = 'fal-ai/seedance-2.5/text-to-video'
const S25_I2V = 'fal-ai/seedance-2.5/image-to-video'
const STUDIO = { email: 'pessoa@example.com', plan: 'pro', createdAt: NOW, partner: false }

// O que NUNCA pode aparecer no que é gravado ou logado.
const LEAKS = [/https?:\/\//i, /cdn\.example/i, /queue\.fal\.run/i, /avatars\//i, /deadbeef1234/i, /abc123def456/i, /abcdefghijklmnop1234/i, new RegExp(FAKE_KEY), /perfume\.png/i]
const leaksIn = (text) => LEAKS.filter((re) => re.test(String(text ?? ''))).map(String)

const forbidden = (what) => () => { throw new Error(`offline: ${what} proibido neste guardião`) }

// ─── Respostas falsas da fal ─────────────────────────────────────────────────
function pollError(kind) {
  if (kind === 'list') {
    return Object.assign(new Error('Unprocessable Entity'), {
      status: 422,
      body: { detail: [{
        loc: ['body', 'image_url'],
        msg: `Input image contains a realistic human face; see https://cdn.example/files/x/signed.png?X-Amz-Signature=deadbeef1234 (account ${FAKE_KEY})`,
        type: 'content_policy_violation',
        input: PHOTO,
      }] },
    })
  }
  if (kind === 'string') {
    return Object.assign(new Error('Unprocessable Entity'), { status: 422, body: { detail: 'The request was rejected: real person detected. Bearer abcdefghijklmnop1234' } })
  }
  if (kind === 'object') {
    // Sem detail/message/error: o corpo inteiro vira o motivo — MENOS o eco do pedido (input/ctx).
    return Object.assign(new Error('Unprocessable Entity'), { status: 422, body: { code: 'face_blocked', input: { prompt: 'segredo do cliente', image_url: PHOTO }, ctx: { hint: 'segredo do cliente' } } })
  }
  // 'long': motivo enorme — tem de sair cortado em 300.
  return Object.assign(new Error('Bad Request'), { status: 400, body: { detail: 'face policy '.repeat(400) } })
}
const SUBMIT_BODY = JSON.stringify({ detail: [{
  msg: `Image rejected by safety filter https://queue.fal.run/x?token=abc123def456 (account ${FAKE_KEY})`,
  type: 'image_policy',
  input: { image_url: PHOTO, prompt: 'segredo do cliente' },
}] })

function world(over, { pollKind = 'list', warns = [] } = {}) {
  const applied = []
  const transform = (rel, text) => {
    if (!over[rel]) return text
    const out = over[rel](text)
    applied.push(rel)
    return out
  }
  const falFake = {
    config: () => {},
    queue: {
      status: async () => ({ status: 'COMPLETED' }),
      result: async () => { throw pollError(pollKind) },
    },
  }
  const fetchFake = async (url) => {
    if (!String(url).startsWith('https://queue.fal.run/')) throw new Error(`fetch inesperado: ${url}`)
    return { ok: false, status: 422, text: async () => SUBMIT_BODY }
  }
  const MOCKS = {
    '@fal-ai/client': { fal: falFake },
    '@/lib/credits/debit': { debitVideoCredits: forbidden('débito real') },
    '@/lib/credits/refund': { refundRenderCredits: forbidden('estorno real') },
    '@/lib/safety/contentModeration': { moderateContent: forbidden('moderação real') },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/animate/remoteImage': { downloadPublicAnimateImage: forbidden('download') },
    '@/lib/serverEvents': { writeServerEvent: forbidden('evento real') },
    '@/lib/falAlert': { alertFalExhausted: forbidden('alerta'), looksExhausted: () => false },
    '@/lib/stripe': { stripe: new Proxy({}, { get: forbidden('Stripe') }) },
  }
  const load = createOfflineLoader({
    mocks: MOCKS,
    source: transform,
    env: { NEXT_PUBLIC_SUPABASE_URL: SUPA, FAL_KEY: FAKE_KEY },
    globals: {
      fetch: fetchFake,
      AbortSignal: { timeout: () => undefined },
      console: { log() {}, error() {}, warn: (...a) => { warns.push(a.map(String).join(' ')) } },
    },
  })
  return { cat: load(CATALOG), flow: load(FLOW), server: load(SERVER), applied }
}

function fakeSubmitDeps(engineAccess, realSubmit = null) {
  const calls = []
  const events = []
  const deps = {
    supabaseUrl: SUPA,
    engineAccess,
    findByKey: async () => { calls.push('find'); return null },
    countActive: async () => { calls.push('count'); return 0 },
    verifyImage: async () => { calls.push('verify') },
    moderate: async () => { calls.push('moderate'); return { ok: true } },
    getBalance: async () => { calls.push('balance'); return 500 },
    newId: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    insertPending: async (row) => { calls.push('insert'); deps.row = row; return { ok: true } },
    debit: async (ref, cr) => { calls.push(`debit:${cr}`); return { ok: true, balance: 500 - cr } },
    refund: async () => { calls.push('refund'); return 14 },
    submit: async (model, input) => {
      calls.push(`submit:${model}`)
      deps.sent = { model, input }
      return realSubmit ? realSubmit(model, input) : { ok: true, requestId: 'req_1' }
    },
    markSubmitted: async () => { calls.push('markSubmitted'); return true },
    markFailed: async (_id, reason) => { calls.push(`markFailed:${reason}`); deps.failureReason = reason; return true },
    event: async (name, metadata) => { calls.push(`event:${name}`); events.push({ name, metadata }) },
    now: () => Date.parse(NOW),
  }
  return { deps, calls, events }
}

function fakeSettleDeps(realPoll) {
  const events = []
  const calls = []
  const deps = {
    poll: realPoll,
    persist: forbidden('persist'),
    refund: async () => { calls.push('refund'); return 14 },
    markDone: forbidden('markDone'),
    markFailed: async (_id, reason) => { calls.push(`markFailed:${reason}`); deps.failureReason = reason; return true },
    event: async (name, metadata) => { events.push({ name, metadata }) },
    now: () => Date.parse(NOW),
  }
  return { deps, calls, events }
}

const processingRow = (engine, model, mode) => ({
  id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', user_id: UID, idempotency_key: 'clip-ui-0001', fingerprint: 'x',
  billing_reference: 'clips-bbbbbbbb-cccc-dddd-eeee-ffffffffffff', engine, mode, model, seconds: 5, aspect: mode === 'image' ? 'image' : '9:16',
  prompt: 'segredo do cliente', image_url: mode === 'image' ? PHOTO : null, credits: 14, fal_usd: 1, status: 'processing',
  fal_request_id: '01a144fb-48a7-7441-a928-04507541e092', video_url: null, failure_reason: null, credits_refunded: 0,
  created_at: new Date(Date.parse(NOW) - 60_000).toISOString(),
})

/** Lista de problemas com o grupo entre colchetes. `over` = mutantes em memória por arquivo (texto → texto). */
async function problems(over = {}) {
  const p = []
  const read = (rel) => (over[rel] ? over[rel](readRaw(rel)) : readRaw(rel))

  // ─── [catalogo] / [servidor] / [texto] ─────────────────────────────────────
  const W = world(over)
  const { cat, flow, server } = W
  const s25 = cat.CLIP_ENGINES.s25
  if (s25.i2vModel !== null) p.push(`[catalogo] s25.i2vModel = ${s25.i2vModel} (devia ser null)`)
  if (JSON.stringify(cat.modesFor('s25')) !== '["t2v"]') p.push(`[catalogo] modesFor('s25') = ${JSON.stringify(cat.modesFor('s25'))}`)
  const card = server.clipCatalogFor(() => ({ ok: true }))
  const byKey = Object.fromEntries(card.map((e) => [e.key, e]))
  if (!byKey.s25 || byKey.s25.photo !== false || byKey.s25.text !== true) p.push(`[catalogo] card do 2.5 = ${JSON.stringify(byKey.s25 && { photo: byKey.s25.photo, text: byKey.s25.text })} (devia photo:false, text:true)`)
  if (byKey.s25 && byKey.s25.photoAspects.length !== 0) p.push('[catalogo] card do 2.5 ainda traz formatos de foto')
  for (const [key, label] of [['hollywood', 'Kling 3'], ['seedance', 'Seedance 1.5']]) {
    if (!byKey[key] || byKey[key].photo !== true || byKey[key].label !== label) p.push(`[catalogo] sugestão para foto ${label} perdeu a foto ou o rótulo`)
  }
  for (const key of ['hollywood', 'kling', 'seedance', 'veo', 'h3', 'omni']) {
    if (!cat.CLIP_ENGINES[key].i2vModel) p.push(`[catalogo] ${key} perdeu a foto (o conserto é só do 2.5)`)
  }
  {
    const v = cat.validateClipRequest({ engine: 's25', seconds: 10, aspect: '9:16', prompt: 'she lifts the perfume box', imageUrl: PHOTO }, { userId: UID, supabaseUrl: SUPA })
    if (v.ok || v.status !== 400 || v.code !== 'mode') p.push(`[servidor] validateClipRequest(s25 + foto) = ${JSON.stringify(v)}`)
    const { deps, calls } = fakeSubmitDeps(server.engineAccessFor(STUDIO))
    const r = await flow.submitClip(deps, { userId: UID, idempotencyKey: 'clip-ui-s25-foto-1610', body: { engine: 's25', seconds: 10, aspect: '9:16', prompt: 'she lifts the perfume box', imageUrl: PHOTO } })
    if (r.ok || r.status !== 400 || r.code !== 'mode') p.push(`[servidor] pagante com foto no 2.5: ${r.status} ${r.code} (devia 400 mode)`)
    if (calls.length || deps.sent) p.push(`[servidor] a recusa tocou em ${calls.join(',') || 'submit'} (devia ser antes de tudo)`)
    if (!/Seedance 2\.5 cannot start from a photo/.test(r.error ?? '')) p.push(`[servidor] frase da recusa: ${r.error}`)
  }
  {
    const offered = cat.offeredSecondsFor('s25')
    if (JSON.stringify(offered) !== '[5,7,10,15]') p.push(`[texto] durações do 2.5 = ${JSON.stringify(offered)}`)
    if (s25.t2vModel !== S25_T2V) p.push(`[texto] t2v do 2.5 = ${s25.t2vModel}`)
    if (JSON.stringify(s25.t2vAspects) !== '["9:16","16:9","1:1"]') p.push(`[texto] formatos do 2.5 = ${JSON.stringify(s25.t2vAspects)}`)
    const { deps, calls } = fakeSubmitDeps(server.engineAccessFor(STUDIO))
    const body = { engine: 's25', seconds: 5, aspect: '9:16', prompt: 'a lighthouse in a storm at night, waves crashing', imageUrl: null }
    const r = await flow.submitClip(deps, { userId: UID, idempotencyKey: 'clip-ui-s25-texto-1610', body })
    if (!r.ok || r.status !== 202) p.push(`[texto] pedido de texto do 2.5 não aceito (${r.status} ${r.code})`)
    else {
      const want = JSON.stringify({ prompt: body.prompt, duration: '5', resolution: '480p', generate_audio: false, aspect_ratio: '9:16' })
      if (deps.sent?.model !== S25_T2V) p.push(`[texto] enviado a ${deps.sent?.model}`)
      if (JSON.stringify(deps.sent?.input) !== want) p.push(`[texto] payload ${JSON.stringify(deps.sent?.input)}`)
      if (!calls.includes('debit:14')) p.push(`[texto] débito ≠ 14 (${calls.find((c) => c.startsWith('debit'))})`)
      if (calls.indexOf('moderate') > calls.indexOf('debit:14')) p.push('[texto] moderação depois do débito')
    }
  }

  // ─── [filme] ───────────────────────────────────────────────────────────────
  {
    const router = read(ROUTER)
    if (!router.includes(`export const S25_I2V_MODEL = '${S25_I2V}'`)) p.push('[filme] S25_I2V_MODEL do filme mudou ou sumiu')
    if (!router.includes(`export const S25_T2V_MODEL = '${S25_T2V}'`)) p.push('[filme] S25_T2V_MODEL do filme mudou ou sumiu')
    if (!/^\s*if \(family === 's25'\) return hasAnchor \? S25_I2V_MODEL : S25_T2V_MODEL\s*$/m.test(router)) p.push('[filme] o filme do 2.5 deixou de usar i2v com âncora')
    if (/clips\/clipCatalog/.test(router)) p.push('[filme] o router do filme passou a ler o catálogo do clipe')
  }

  // ─── [poll] (consulta, 2 motores) + [limpeza] ──────────────────────────────
  for (const [engine, model, mode] of [['s25', S25_T2V, 'text'], ['hollywood', 'fal-ai/kling-video/o3/pro/image-to-video', 'image']]) {
    const warns = []
    const w = world(over, { pollKind: 'list', warns })
    const realPoll = w.server.settleDepsFor({}, UID).poll
    const { deps, events } = fakeSettleDeps(realPoll)
    const out = await w.flow.settleClip(deps, processingRow(engine, model, mode))
    const ev = events.find((e) => e.name === 'clip_failed')
    const pe = ev?.metadata?.provider_error
    if (out.status !== 'failed' || deps.failureReason !== 'provider_failed') p.push(`[poll] ${engine}: não fechou provider_failed (${out.status} ${deps.failureReason})`)
    if (!ev) { p.push(`[poll] ${engine}: sem clip_failed`); continue }
    if (ev.metadata.stage !== 'settle' || ev.metadata.reason !== 'provider_failed') p.push(`[poll] ${engine}: evento ${JSON.stringify(ev.metadata)}`)
    if (typeof pe !== 'string' || !/content_policy_violation/.test(pe) || !/realistic human face/.test(pe) || !/body\.image_url/.test(pe) || !/422/.test(pe)) p.push(`[poll] ${engine}: provider_error sem o motivo real da fal (${pe})`)
    const leak = leaksIn(JSON.stringify(ev.metadata))
    if (leak.length) p.push(`[limpeza] ${engine} (consulta): evento vaza ${leak.join(' ')}`)
    if (typeof pe === 'string' && pe.length > 300) p.push(`[limpeza] provider_error com ${pe.length} caracteres`)
    if (JSON.stringify(ev.metadata).includes('segredo do cliente')) p.push('[limpeza] o texto do cliente foi junto no evento')
    const warn = warns.find((x) => /clip_failed stage=settle/.test(x))
    if (!warn || !/content_policy_violation/.test(warn) || !/request=01a144fb/.test(warn)) p.push(`[poll] ${engine}: sem console.warn curto com o motivo e o request (${warns.join(' | ')})`)
    const wleak = leaksIn(warns.join('\n'))
    if (wleak.length) p.push(`[limpeza] ${engine} (consulta): log vaza ${wleak.join(' ')}`)
    if (warn && warn.length > 500) p.push(`[poll] warn longo demais (${warn.length})`)
  }
  {
    // detail em string (não lista) e motivo gigante.
    const w1 = world(over, { pollKind: 'string' })
    const st1 = await w1.server.settleDepsFor({}, UID).poll(S25_T2V, 'req_x')
    if (st1.state !== 'failed' || !/real person detected/.test(st1.error ?? '')) p.push(`[poll] detail-string não chegou ao estado (${JSON.stringify(st1)})`)
    if (leaksIn(st1.error).length) p.push(`[limpeza] detail-string vaza ${leaksIn(st1.error).join(' ')}`)
    const w3 = world(over, { pollKind: 'object' })
    const st3 = await w3.server.settleDepsFor({}, UID).poll(S25_T2V, 'req_y')
    if (st3.state !== 'failed' || !/face_blocked/.test(st3.error ?? '')) p.push(`[poll] corpo sem detail não chegou ao estado (${JSON.stringify(st3)})`)
    if (/segredo do cliente/.test(st3.error ?? '') || leaksIn(st3.error).length) p.push(`[limpeza] corpo sem detail levou o eco do pedido (${st3.error})`)
    const w2 = world(over, { pollKind: 'long' })
    const { deps, events } = fakeSettleDeps(w2.server.settleDepsFor({}, UID).poll)
    await w2.flow.settleClip(deps, processingRow('seedance', 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', 'image'))
    const pe = events.find((e) => e.name === 'clip_failed')?.metadata?.provider_error
    if (typeof pe !== 'string' || pe.length > 300 || pe.length < 200 || !/face policy/.test(pe)) p.push(`[limpeza] motivo gigante não saiu cortado em ≤300 (${typeof pe === 'string' ? pe.length : pe})`)
    if (deps.failureReason && deps.failureReason.length > 60) p.push('[limpeza] failure_reason virou o texto longo')
  }

  // ─── [envio] + [limpeza] ───────────────────────────────────────────────────
  {
    const warns = []
    const w = world(over, { warns })
    const realSubmit = w.server.submitDepsFor({ admin: {}, userSupabase: {}, account: { userId: UID, balance: 500, ...STUDIO } }).submit
    const { deps, events } = fakeSubmitDeps(w.server.engineAccessFor(STUDIO), realSubmit)
    const r = await w.flow.submitClip(deps, { userId: UID, idempotencyKey: 'clip-ui-envio-1610', body: { engine: 'hollywood', seconds: 5, aspect: 'image', prompt: 'segredo do cliente', imageUrl: PHOTO } })
    const ev = events.find((e) => e.name === 'clip_failed')
    const pe = ev?.metadata?.provider_error
    if (r.ok || r.code !== 'provider_rejected' || deps.failureReason !== 'provider_rejected') p.push(`[envio] recusa do envio não fechou provider_rejected (${r.status} ${r.code} ${deps.failureReason})`)
    if (!ev || ev.metadata.stage !== 'submit') p.push('[envio] sem clip_failed stage=submit')
    if (typeof pe !== 'string' || !/Image rejected by safety filter/.test(pe) || !/image_policy/.test(pe) || !/fal 422/.test(pe)) p.push(`[envio] provider_error sem o motivo real da fal (${pe})`)
    if (ev) {
      const leak = leaksIn(JSON.stringify(ev.metadata))
      if (leak.length) p.push(`[limpeza] envio: evento vaza ${leak.join(' ')}`)
      if (JSON.stringify(ev.metadata).includes('segredo do cliente')) p.push('[limpeza] envio: o texto do cliente foi junto no evento')
    }
    if (/Image rejected|image_policy|\[url\]|\[secret\]/.test(r.error ?? '')) p.push('[envio] o texto da fal vazou para a frase do cliente')
    const warn = warns.find((x) => /clip_failed stage=submit/.test(x))
    if (!warn || !/image_policy/.test(warn)) p.push(`[envio] sem console.warn curto com o motivo (${warns.join(' | ')})`)
    if (leaksIn(warns.join('\n')).length) p.push(`[limpeza] envio: log vaza ${leaksIn(warns.join('\n')).join(' ')}`)
  }

  // ─── [limpeza] unidade ─────────────────────────────────────────────────────
  {
    const c = flow.cleanProviderError
    const cases = [
      ['fal 422 see https://x.fal.media/a/b.png?sig=1', /\[url\]/, /https?:/],
      ['Authorization: Key 6f1c2b7e-1111-2222-3333-444455556666:0123456789abcdef0123456789abcdef', /Authorization/, /0123456789abcdef|6f1c2b7e/],
      ['api_key=sk-12345678abcd failed', /api_key=/, /sk-12345678abcd/],
      ['bad image data:image/png;base64,AAAABBBB', /\[data\]/, /AAAABBBB/],
      [`denied for ${FAKE_KEY}`, /denied/, new RegExp(FAKE_KEY)],
    ]
    for (const [input, must, never] of cases) {
      const out = c(input, [FAKE_KEY])
      if (!must.test(out ?? '') || never.test(out ?? '')) p.push(`[limpeza] cleanProviderError(${JSON.stringify(input)}) = ${JSON.stringify(out)}`)
    }
    if (c('   ') !== null || c(null) !== null) p.push('[limpeza] texto vazio não vira null')
    if ((c('y'.repeat(5000)) ?? '').length !== 300) p.push('[limpeza] corte não é 300')
    if (c('Validation failed: duration must be one of 4..30') !== 'Validation failed: duration must be one of 4..30') p.push('[limpeza] limpeza mutilou um motivo comum')
  }

  // ─── [tela] ────────────────────────────────────────────────────────────────
  {
    const client = read(CLIENT)
    if (!/^\s*const photoBlocked = !effect && !!engine && !engine\.photo\s*$/m.test(client)) p.push('[tela] photoBlocked não é "motor sem foto fora do efeito"')
    const start = client.indexOf('const photoRow = photoBlocked && !photoUrl ? (')
    const mid = client.indexOf(') : (', start)
    const blocked = start >= 0 && mid > start ? client.slice(start, mid) : ''
    if (!blocked) p.push('[tela] o "Add photo" não some no motor sem foto')
    else {
      if (/addPhoto|fileRef/.test(blocked)) p.push('[tela] ramo bloqueado ainda oferece "Add photo"')
      if (!/t\('noPhoto', \{ engine: engine\?\.label \?\? '' \}\)/.test(blocked) || !blocked.includes('{photoPickButtons}')) p.push('[tela] ramo bloqueado sem a frase noPhoto + sugestões')
    }
    if (!client.includes("const preferred = (['hollywood', 'seedance'] as const).flatMap((k) => withPhotoEngines.filter((e) => e.key === k))")) p.push('[tela] sugestões não priorizam Kling 3 / Seedance 1.5')
    if (!client.includes('const withPhotoEngines = engines.filter((e) => e.photo && e.key !== engineKey)')) p.push('[tela] sugestões não vêm só de motor com foto')
    if (!client.includes('data-clip-photo-pick={alt.key} onClick={() => chooseEngine(alt)}')) p.push('[tela] botão da sugestão não troca o motor')
    if (!client.includes("{modeProblem === 'noPhoto' && photoPickButtons")) p.push('[tela] foto já posta + motor sem foto: sem sugestões')
    if (!read(COPY).includes("noPhoto: '{engine} can’t start from a photo.'")) p.push('[tela] frase noPhoto (en) mudou')
  }
  return { list: p, applied: W.applied }
}

// ─── Execução ────────────────────────────────────────────────────────────────
console.log('KINEO-S25-FOTO-CLIPES-1610 — Seedance 2.5 sem foto no /clips + provider_error gravado')
const base = await problems()
for (const x of base.list) console.log('    ' + x)
ok(base.list.length === 0, `código real: zero problema (${base.list.length})`)

/** Mutante = troca exata (achada 1× no arquivo); prova que aplicou e que ficou vermelho no grupo esperado. */
function swap(rel, from, to) {
  return {
    [rel]: (text) => {
      const n = text.split(from).length - 1
      if (n !== 1) throw new Error(`mutante: âncora achada ${n}× em ${rel}: ${from.slice(0, 70)}`)
      const out = text.split(from).join(to)
      if (out === text) throw new Error('mutante não mudou o texto')
      return out
    },
  }
}
const MUTANTS = [
  ['M1 foto do 2.5 volta no catálogo', swap(CATALOG, '    i2vModel: null,\n    falSeconds: range(4, 30),', `    i2vModel: '${S25_I2V}',\n    falSeconds: range(4, 30),`), ['[catalogo]', '[servidor]']],
  ['M2 servidor aceita modo sem modelo', swap(CATALOG, '  if (!model) {', "  if (!model && mode !== 'i2v') {"), ['[servidor]']],
  ['M3 2.5 de texto quebrado', swap(CATALOG, `    t2vModel: '${S25_T2V}',`, "    t2vModel: 'fal-ai/seedance-2.0/text-to-video',"), ['[texto]']],
  ['M4 filme sem i2v com âncora', swap(ROUTER, "if (family === 's25') return hasAnchor ? S25_I2V_MODEL : S25_T2V_MODEL", "if (family === 's25') return S25_T2V_MODEL"), ['[filme]']],
  ['M5 consulta descarta o erro', swap(FLOW, "return fail('provider_failed', cleanProviderError(state.error))", "return fail('provider_failed')"), ['[poll]']],
  ['M6 pollFal ignora err.body', swap(SERVER, 'const detail = falErrorDetail((err as { body?: unknown })?.body)', "const detail = ''"), ['[poll]']],
  ['M7 envio descarta o erro', swap(FLOW, "'The engine could not accept this clip.', cleanProviderError(sent.error))", "'The engine could not accept this clip.')"), ['[envio]']],
  ['M8 evento da consulta sem provider_error', swap(FLOW, "stage: 'settle', ...(providerError ? { provider_error: providerError } : {})", "stage: 'settle'"), ['[poll]']],
  ['M9 sem warn na consulta', swap(FLOW, '    if (moved && providerError) console.warn(', '    if (false) console.warn('), ['[poll]']],
  ['M10 URL não é tirada', swap(FLOW, String.raw`    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()\]]+/gi, '[url]')` + '\n', ''), ['[limpeza]']],
  ['M11 FAL_KEY não é tirada na consulta', swap(SERVER, "[process.env.FAL_KEY ?? '']", '[]'), ['[limpeza]']],
  ['M12 FAL_KEY não é tirada no envio', swap(SERVER, '`fal ${response.status}: ${detail}`, [key])', '`fal ${response.status}: ${detail}`, [])'), ['[limpeza]']],
  ['M13 eco do pedido volta', swap(FLOW, "filter(([k]) => k !== 'input' && k !== 'ctx')", 'filter(() => true)'), ['[limpeza]', '[envio]', '[poll]']],
  ['M14 corte some', swap(FLOW, 'return text ? text.slice(0, PROVIDER_ERROR_MAX) : null', 'return text || null'), ['[limpeza]']],
  ['M15 "Add photo" volta no motor sem foto', swap(CLIENT, 'const photoBlocked = !effect && !!engine && !engine.photo', 'const photoBlocked = false'), ['[tela]']],
  ['M16 sugestão sem Kling 3 / Seedance 1.5', swap(CLIENT, "(['hollywood', 'seedance'] as const)", "(['veo'] as const)"), ['[tela]']],
]
for (const [name, over, groups] of MUTANTS) {
  let res
  try {
    res = await problems(over)
  } catch (e) {
    ok(false, `${name}: não aplicou (${e.message})`)
    continue
  }
  const rel = Object.keys(over)[0]
  const loaderFile = [CATALOG, FLOW, SERVER].includes(rel)
  const applied = loaderFile ? res.applied.includes(rel) : true // ROUTER/CLIENT: lidos por read() com a troca (a âncora achada 1× prova)
  const hit = groups.filter((g) => res.list.some((x) => x.startsWith(g)))
  ok(applied && hit.length > 0, `${name}: aplicado e VERMELHO em ${hit.join(' ') || '— nenhum —'} (${res.list.length} problema[s])`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
