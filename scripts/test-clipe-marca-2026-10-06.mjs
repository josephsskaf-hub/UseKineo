// KINEO-CLIPE-MARCA-2026-10-06 — guardião da marca do clipe grátis + botão "Post it" (tarefa 13 da sprint "MRR hoje").
// Prova, EXECUTANDO lib/clips/freeClipWatermark.ts (puro) e a fiação real (lib/clips/clipServer.ts settleDepsFor/persist,
// lib/clips/clipFlow.ts settleClip e lib/clips/freeClipWatermarkServer.ts) com banco, bucket, fal e Creatomate falsos:
//   (1) o interruptor nasce false e, desligado, NENHUMA marca: o persist real sobe o MP4 no caminho de sempre, sem ler o
//       perfil e sem chamar o Creatomate;
//   (2) pagante nunca recebe (has_paid, plano pago, trial de cartão da Stripe, PayPal, plano desconhecido, perfil ilegível);
//       grátis, trial reverso, região e cortesia (*_trial sem trilho de pagamento) recebem;
//   (3) ligado: a linha fica `processing` SEM estorno enquanto o render anda e sai COM marca; qualquer falha depois da cópia
//       limpa (MP4 ilegível, Creatomate recusou, render falhou, passou do teto) entrega o LIMPO + clip_watermark_failed; duas
//       abas nunca pedem dois renders; perto do prazo não começa; quem assinou depois recebe o limpo (caminho do HMAC);
//   (4) botão "Post it" para todo clipe pronto: legenda exata, no celular o ARQUIVO na folha de compartilhar, cópia da
//       legenda, no computador (ou sem folha) baixar + copiar, eventos do navegador (e nenhum deles barrado no sink);
//   (5) as 6 frases nas 16 línguas;
//   (6) mutantes: cada regra quebrada fica vermelha.
// Estilo readFileSync + transpile (molde scripts/test-clipe-gratis-regiao-2026-10-05.mjs) + o carregador offline da casa
// (scripts/test-support/offline-ts-loader.mjs) para a fiação. Nada de rede, nada de crédito.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const { createOfflineLoader } = await import('./test-support/offline-ts-loader.mjs')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const MOD = 'lib/clips/freeClipWatermark.ts'
const SERVER = 'lib/clips/clipServer.ts'
const WIRE = 'lib/clips/freeClipWatermarkServer.ts'
const ROUTE = 'app/api/clips/route.ts'
const CLIENT = 'app/(dashboard)/clips/ClipsClient.tsx'
const COPY = 'lib/ui/refinementCopy.json'
const EVENTS = 'app/api/events/route.ts'
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
// Um clipe REAL da casa: prévia do efeito "melt" (Kling 2.5, 5 s, 720×1280, 24 fps) — o formato do clipe grátis.
const MELT = fs.readFileSync(path.join(ROOT, 'public/previews/efeito-melt.mp4'))

/** Carrega um módulo TS puro; imports relativos ('./x') resolvem para o .ts vizinho. Qualquer outro import = erro. */
function loadPure(rel, over = {}) {
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => {
    if (!name.startsWith('./')) throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    return loadPure(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'), over)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

/** O mesmo MP4 com a matriz do tkhd girada 90°: sem certeza do quadro, a marca não sai. */
function rotated(buf) {
  const b = Buffer.from(buf)
  let i = -1
  while ((i = b.indexOf('tkhd', i + 1)) !== -1) {
    const payload = i + 4
    const m = payload + 4 + (b[payload] === 1 ? 32 : 20) + 16
    b.writeInt32BE(0, m); b.writeInt32BE(65536, m + 4); b.writeInt32BE(-65536, m + 12); b.writeInt32BE(0, m + 16)
  }
  return b
}

const outcome = async (promise) => { try { return { value: await promise } } catch (error) { return { error } } }
const notReady = (r, why) => r.error?.name === 'FreeClipNotReady' && (why === undefined || r.error.why === why)

// ─── Dependências falsas da orquestração pura ────────────────────────────────
const CLEAN = 'https://cdn.test/clean.mp4'
const BRANDED = 'https://cdn.test/x.kineo.mp4'
function fakeDeps(o = {}) {
  const calls = []
  const events = []
  const state = { marker: o.marker ?? null, source: null }
  const deps = {
    now: () => o.now ?? Date.now(),
    claim: async (m) => { calls.push('claim'); if (o.claim) return o.claim; if (state.marker) return 'taken'; state.marker = m; return 'claimed' },
    swap: async (from, to) => { calls.push(to === null ? 'release' : `swap:${to.split(':')[2]}`); if (state.marker !== from) return false; state.marker = to; return true },
    download: async () => { calls.push('download'); if (o.downloadFail) throw new Error('rede caiu'); return o.bytes ?? MELT },
    uploadClean: async () => { calls.push('uploadClean'); return CLEAN },
    cleanUrl: () => CLEAN,
    submit: async (source) => { calls.push('submit'); if (o.submitFail) throw new Error('Creatomate rejected the render (400)'); state.source = source; return 'rnd-00000001' },
    poll: async () => { calls.push('poll'); return o.poll ?? { status: 'pending' } },
    copyBranded: async () => { calls.push('copy'); if (o.copyFail) throw new Error('copy failed'); return BRANDED },
    event: async (name, metadata) => { events.push({ name, metadata }) },
  }
  return { deps, calls, events, state }
}

// ─── A fiação real com banco/bucket/fal/Creatomate falsos ────────────────────
const UID = '11111111-1111-4111-8111-111111111111'
const CID = '22222222-2222-4222-8222-222222222222'
const KEY = 'test-service-key'
const TOKEN = crypto.createHmac('sha256', KEY).update(`kineo-clip-clean:${CID}`).digest('hex').slice(0, 24)
const PUB = (p) => `https://cdn.test/renders/${p}`
const CANONICAL = `clips/${UID}/${CID}.mp4`
const CLEAN_PATH = `clips/${UID}/${CID}.src-${TOKEN}.mp4`
const BRANDED_PATH = `clips/${UID}/${CID}.kineo.mp4`

function clipRow(over = {}) {
  return {
    id: CID, user_id: UID, idempotency_key: 'k-12345678', fingerprint: 'f', billing_reference: `clips-${CID}`, engine: 'seedance',
    mode: 'image', model: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', seconds: 5, aspect: 'image', prompt: 'a red fox',
    image_url: null, credits: 5, fal_usd: 0.13, status: 'processing', fal_request_id: 'req-1', video_url: null, failure_reason: null,
    credits_refunded: 0, created_at: new Date(Date.now() - 90_000).toISOString(), ...over,
  }
}

function fakeAdmin(ctx) {
  return {
    from(table) {
      const q = { op: 'select', patch: null, filters: [] }
      const exec = () => {
        const st = ctx.st
        if (table === 'profiles') {
          st.profileReads++
          return st.profileError ? { data: null, error: { message: 'profiles down' } } : { data: st.profile, error: null }
        }
        if (table === 'clips' && q.op === 'update') {
          if (!q.filters.every((f) => f(st.clip))) return { data: [], error: null }
          Object.assign(st.clip, q.patch)
          return { data: [{ id: st.clip.id }], error: null }
        }
        st.unexpected.push(`${table}:${q.op}`)
        return { data: null, error: { message: 'unexpected query' } }
      }
      const api = {
        select() { return api },
        update(patch) { q.op = 'update'; q.patch = patch; return api },
        eq(c, v) { q.filters.push((r) => r[c] === v); return api },
        is(c, v) { q.filters.push((r) => r[c] === v); return api },
        in(c, vs) { q.filters.push((r) => vs.includes(r[c])); return api },
        maybeSingle() { return Promise.resolve(exec()) },
        then(okFn, koFn) { return Promise.resolve(exec()).then(okFn, koFn) },
      }
      return api
    },
    storage: {
      from: (bucket) => ({
        upload: async (p) => { ctx.st.uploads.push(p); return { error: null } },
        getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${p}` } }),
      }),
    },
  }
}

/** Um carregador da fiação real. live=true simula o fundador virando o interruptor. */
function wiring(over, live) {
  const ctx = { st: null }
  const transform = (rel, text) => {
    let t = over[rel] ?? text
    if (rel === MOD && live) t = t.replace('export const FREE_CLIP_WATERMARK_LIVE = false', 'export const FREE_CLIP_WATERMARK_LIVE = true')
    return t
  }
  const mocks = {
    '@fal-ai/client': { fal: { config() {}, queue: { status: async () => ({ status: 'COMPLETED' }), result: async () => ({ data: { video: { url: 'https://fal.test/out.mp4' } } }) } } },
    '@/lib/credits/debit': { debitVideoCredits: async () => { throw new Error('débito no settle') } },
    '@/lib/credits/refund': { refundRenderCredits: async (ref) => { ctx.st.refunds.push(ref); return 5 } },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/safety/moderationPolicy': {},
    '@/lib/animate/remoteImage': { downloadPublicAnimateImage: async () => {} },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { ctx.st.events.push(e); return true } },
    '@/lib/falAlert': { alertFalExhausted: async () => {}, looksExhausted: () => false },
    // REANCORADO 06/10 (KINEO-S25-CLIPES-2026-10-06): clipServer passou a ler o predicado canônico de pagante (isPayingPlan,
    // app/api/admin/_shared/mrr.ts), que importa a Stripe — aqui ela falha fechada (nenhuma prova da marca usa a Stripe).
    '@/lib/stripe': { stripe: new Proxy({}, { get: () => { throw new Error('Stripe no teste da marca') } }) },
    '@/lib/compose': {
      submitCreatomateRender: async (source) => { ctx.st.submits.push(source); if (ctx.st.submitFail) throw new Error('Creatomate rejected the render (400)'); return 'rnd-00000001' },
      pollCreatomateRender: async () => {
        const s = ctx.st.renderState
        return s === 'succeeded' ? { status: 'succeeded', url: 'https://creatomate.test/rnd.mp4', error: null }
          : s === 'failed' ? { status: 'failed', url: null, error: 'render error' } : { status: 'rendering', url: null, error: null }
      },
    },
  }
  const fetch = async (url) => {
    ctx.st.fetches.push(String(url))
    const bytes = String(url).includes('fal.test') ? MELT : Buffer.from('BRANDED-MP4-BYTES')
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { ok: true, status: 200, arrayBuffer: async () => ab, text: async () => '' }
  }
  const load = createOfflineLoader({
    mocks,
    source: transform,
    env: { SUPABASE_SERVICE_ROLE_KEY: KEY, NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', FAL_KEY: 'fal-test' },
    globals: { fetch, AbortSignal },
  })
  const server = load(SERVER)
  const flow = load('lib/clips/clipFlow.ts')
  const admin = fakeAdmin(ctx)
  const world = (o = {}) => {
    ctx.st = {
      clip: clipRow(o.row ?? {}), profile: o.profile ?? null, profileError: !!o.profileError, profileReads: 0, uploads: [], fetches: [],
      events: [], refunds: [], submits: [], unexpected: [], submitFail: !!o.submitFail, renderState: o.renderState ?? 'succeeded',
    }
    return ctx.st
  }
  const settle = async () => flow.settleClip(server.settleDepsFor(admin, UID), { ...ctx.st.clip })
  return { server, flow, admin, world, settle }
}
const names = (st) => st.events.map((e) => e.name)
const failedStage = (st) => st.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage ?? null

async function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let M
  try { M = loadPure(MOD, over) } catch (err) { return [`módulo puro não carrega: ${err.message}`] }

  // (1) interruptor e textos
  if (M.FREE_CLIP_WATERMARK_LIVE !== false) p.push('(1) o interruptor nasceu ligado (combinado com o fundador: nasce false, ele liga)')
  if (M.FREE_CLIP_WATERMARK_TEXT !== 'usekineo.com') p.push('(1) o texto da marca não é usekineo.com')
  if (M.CLIP_SHARE_CAPTION !== 'Made with Kineo · usekineo.com #madewithkineo') p.push('(4) a legenda do "Post it" mudou')

  // (2) quem recebe
  const FREE = [
    [{ plan: 'free', has_paid: false }, 'free', 'conta grátis'],
    [{ plan: null, has_paid: null }, 'free', 'plano nulo'],
    [{ plan: 'free', has_paid: false, trial_status: 'active' }, 'free', 'trial reverso ativo'],
    [{ plan: 'free', has_paid: false, trial_status: 'region_paid_only' }, 'free', 'região (clipe grátis de 5 s)'],
    [{ plan: 'studio_trial', has_paid: false, trial_status: 'courtesy' }, 'courtesy', 'cortesia studio_trial sem trilho'],
    [{ plan: 'creator_trial', has_paid: false, stripe_subscription_id: '' }, 'courtesy', 'cortesia creator_trial'],
  ]
  const PAYING = [
    [{ plan: 'pro', has_paid: true }, 'pro pago'],
    [{ plan: 'free', has_paid: true }, 'comprou antes (plano free + has_paid)'],
    [{ plan: 'starter', has_paid: false }, 'plano pago sem has_paid'],
    [{ plan: 'studio_trial', has_paid: true, stripe_subscription_id: 'sub_1' }, 'trial de cartão da Stripe'],
    [{ plan: 'creator_trial', has_paid: false, paypal_subscription_id: 'I-123' }, 'trial com assinatura PayPal'],
    [{ plan: 'enterprise', has_paid: false }, 'plano desconhecido (na dúvida, paga)'],
  ]
  for (const [profile, reason, label] of FREE) {
    const off = M.freeClipWatermarkDecision({ live: false, profile })
    if (off.brand !== false || off.reason !== 'switch_off') p.push(`(1) desligado e ${label} recebeu marca`)
    const on = M.freeClipWatermarkDecision({ live: true, profile })
    if (on.brand !== true || on.reason !== reason) p.push(`(2) ligado e ${label} sem marca: ${JSON.stringify(on)}`)
  }
  for (const [profile, label] of PAYING) {
    const on = M.freeClipWatermarkDecision({ live: true, profile })
    if (on.brand !== false || on.reason !== 'paying') p.push(`(2) PAGANTE recebeu marca: ${label}`)
  }
  for (const profile of [null, undefined]) {
    if (M.freeClipWatermarkDecision({ live: true, profile }).brand !== false) p.push('(2) perfil ilegível recebeu marca')
  }

  // (3a) leitura do MP4 real e o desenho da marca
  const info = M.probeClipVideo(MELT)
  if (!info || info.width !== 720 || info.height !== 1280 || info.fps !== 24 || !(Math.abs(info.durationSeconds - 5.042) < 0.01)) {
    p.push(`(3) leitura do MP4 real errada: ${JSON.stringify(info)}`)
  }
  if (M.probeClipVideo(rotated(MELT)) !== null) p.push('(3) MP4 girado lido como quadro normal (sairia marca torta)')
  if (M.probeClipVideo(Buffer.from('isto não é um mp4')) !== null) p.push('(3) lixo lido como MP4')
  for (const [w, h, label] of [[720, 1280, '9:16'], [1280, 720, '16:9'], [1080, 1080, '1:1']]) {
    const s = M.buildFreeClipWatermarkSource('https://cdn.test/clean.mp4', { width: w, height: h, fps: 24, durationSeconds: 5 })
    const video = (s.elements ?? []).find((e) => e.type === 'video')
    const text = (s.elements ?? []).find((e) => e.type === 'text')
    const short = Math.min(w, h)
    if (s.width !== w || s.height !== h || s.frame_rate !== 24 || s.output_format !== 'mp4') p.push(`(3) ${label}: quadro do render ≠ quadro do clipe`)
    if (!video || video.source !== 'https://cdn.test/clean.mp4') p.push(`(3) ${label}: o render não parte do clipe limpo`)
    if (!text || text.text !== 'usekineo.com' || text.x_anchor !== '100%' || text.y_anchor !== '100%') p.push(`(3) ${label}: marca sem o texto ou fora do canto`)
    else {
      if (!(text.x > w * 0.75 && text.x < w && text.y > h * 0.85 && text.y < h)) p.push(`(3) ${label}: marca fora do canto inferior direito (${text.x},${text.y})`)
      if (!(text.font_size >= short * 0.025 && text.font_size <= short * 0.05)) p.push(`(3) ${label}: fonte ilegível ou chamativa (${text.font_size}px)`)
      if (text.font_family !== 'Montserrat' || !text.background_color) p.push(`(3) ${label}: marca sem a fonte/plaqueta da casa`)
    }
  }
  const est = info ? M.creatomateCreditsEstimate(info) : null
  if (!(est > 1 && est < 1.3)) p.push(`(3) custo estimado do clipe de 5 s fora de ~1,1 crédito: ${est}`)

  // (3b) a orquestração pura, caso a caso
  const ROW = { id: CID, engine: 'seedance', seconds: 5, video_url: null }
  const run = (fx, args = {}) => M.brandFreeClip(fx.deps, { row: ROW, providerUrl: 'https://fal.test/out.mp4', reason: 'free', ageMs: 90_000, expireMs: 6 * 3600_000, ...args })
  {
    const fx = fakeDeps()
    const r = await outcome(run(fx))
    if (!notReady(r, 'rendering')) p.push(`(3) começo: devia esperar o render (${r.error?.message ?? r.value})`)
    if (fx.calls.join() !== 'claim,download,uploadClean,submit,swap:rendering') p.push(`(3) começo fora de ordem: ${fx.calls.join()}`)
    const started = fx.events.find((e) => e.name === 'clip_watermark_started')
    if (!started || !(started.metadata.creatomate_credits_est > 1)) p.push('(3) render pedido sem clip_watermark_started com o custo')
    const marker = fx.state.marker
    if (!M.parseBrandMarker(marker) || M.parseBrandMarker(marker).phase !== 'rendering') p.push('(3) marca de andamento não gravada')
    const fx2 = fakeDeps({ marker, poll: { status: 'succeeded', url: 'https://creatomate.test/r.mp4' } })
    const r2 = await outcome(run(fx2, { row: { ...ROW, video_url: marker }, reason: null }))
    if (r2.value !== BRANDED || !fx2.events.some((e) => e.name === 'clip_watermark_applied')) p.push('(3) render pronto não entregou o clipe COM marca')
    const fx3 = fakeDeps({ marker })
    if (!notReady(await outcome(run(fx3, { row: { ...ROW, video_url: marker }, reason: null })), 'rendering')) p.push('(3) render andando dentro do teto não esperou')
    const fx4 = fakeDeps({ marker, poll: { status: 'failed', error: 'x' } })
    const r4 = await outcome(run(fx4, { row: { ...ROW, video_url: marker }, reason: null }))
    if (r4.value !== CLEAN || fx4.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage !== 'render') p.push('(3) render que falhou não entregou o LIMPO')
    const old = M.brandMarker({ phase: 'rendering', reason: 'free', startedAt: Date.now() - 4 * 60_000, renderId: 'rnd-00000001' })
    const fx5 = fakeDeps({ marker: old })
    const r5 = await outcome(run(fx5, { row: { ...ROW, video_url: old }, reason: null }))
    if (r5.value !== CLEAN || fx5.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage !== 'timeout') p.push('(3) render preso além do teto não entregou o LIMPO')
    const fx6 = fakeDeps({ marker, poll: { status: 'succeeded', url: 'u' }, copyFail: true })
    if (!notReady(await outcome(run(fx6, { row: { ...ROW, video_url: marker }, reason: null })), 'copy_retry')) p.push('(3) cópia que falhou dentro do teto não tentou de novo')
    const fx7 = fakeDeps({ marker: old, poll: { status: 'succeeded', url: 'u' }, copyFail: true })
    if ((await outcome(run(fx7, { row: { ...ROW, video_url: old }, reason: null }))).value !== CLEAN) p.push('(3) cópia que falhou além do teto não entregou o LIMPO')
  }
  {
    const fx = fakeDeps({ submitFail: true })
    const r = await outcome(run(fx))
    if (r.value !== CLEAN || fx.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage !== 'submit') p.push('(3) Creatomate recusou e o clipe não saiu LIMPO')
    if (fx.calls.includes('swap:rendering')) p.push('(3) recusa do Creatomate gravou marca de render')
  }
  {
    const fx = fakeDeps({ bytes: Buffer.from('lixo') })
    const r = await outcome(run(fx))
    if (r.value !== CLEAN || fx.calls.includes('submit') || fx.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage !== 'probe') p.push('(3) MP4 ilegível não saiu LIMPO (ou pediu render às cegas)')
  }
  {
    const fx = fakeDeps({ downloadFail: true })
    const r = await outcome(run(fx))
    if (!r.error || notReady(r) || r.value !== undefined) p.push('(3) sem a cópia limpa, devia esperar o próximo poll como o caminho de sempre')
    if (!fx.calls.includes('release') || fx.state.marker !== null) p.push('(3) falha antes da cópia limpa não soltou a trava')
  }
  {
    const other = M.brandMarker({ phase: 'starting', reason: 'free', startedAt: Date.now() - 1000, renderId: null })
    const fx = fakeDeps({ marker: other })
    const r = await outcome(run(fx))
    if (!notReady(r, 'claimed_elsewhere') || fx.calls.includes('download') || fx.calls.includes('submit')) p.push('(3) outra aba já pegou a trava e esta pediu outro render')
    const fresh = fakeDeps({ marker: other })
    if (!notReady(await outcome(run(fresh, { row: { ...ROW, video_url: other }, reason: null })), 'starting_elsewhere') || fresh.calls.includes('download')) p.push('(3) marca recente de outro ator foi atropelada')
    const stale = M.brandMarker({ phase: 'starting', reason: 'free', startedAt: Date.now() - 70_000, renderId: null })
    const fs2 = fakeDeps({ marker: stale })
    const r2 = await outcome(run(fs2, { row: { ...ROW, video_url: stale }, reason: null }))
    if (!notReady(r2, 'rendering') || !fs2.calls.includes('submit')) p.push('(3) marca de ator morto não foi assumida')
  }
  {
    const fx = fakeDeps({ claim: 'error' })
    const r = await outcome(run(fx))
    if (r.value !== null || fx.calls.includes('download') || fx.events.find((e) => e.name === 'clip_watermark_failed')?.metadata?.stage !== 'claim') p.push('(3) trava que não gravou não seguiu o caminho de sempre')
    const near = fakeDeps()
    if ((await outcome(run(near, { ageMs: 6 * 3600_000 - 10 * 60_000 }))).value !== null || near.calls.length) p.push('(3) clipe perto do prazo de estorno começou marca')
    const undecided = fakeDeps()
    if ((await outcome(run(undecided, { reason: null }))).value !== null || undecided.calls.length) p.push('(3) sem decisão, a marca começou mesmo assim')
  }

  // (1/2/3c) a fiação REAL: persist do clipServer → settleClip → servidor da marca
  let off, on
  try { off = wiring(over, false); on = wiring(over, true) } catch (err) { return [...p, `fiação não carrega: ${err.message}`] }
  {
    const st = off.world({ profile: { plan: 'free', has_paid: false } })
    const after = await off.settle()
    if (after.status !== 'done' || after.video_url !== PUB(CANONICAL)) p.push(`(1) desligado: o clipe grátis não saiu pelo caminho de sempre (${after.status} ${after.video_url})`)
    if (st.profileReads !== 0 || st.submits.length !== 0 || st.uploads.join() !== CANONICAL) p.push(`(1) desligado e ainda leu perfil (${st.profileReads}) / chamou o Creatomate (${st.submits.length}) / subiu ${st.uploads.join()}`)
  }
  {
    const st = on.world({ profile: { plan: 'pro', has_paid: true } })
    const after = await on.settle()
    if (after.video_url !== PUB(CANONICAL) || st.submits.length !== 0 || st.uploads.join() !== CANONICAL) p.push('(2) ligado e o PAGANTE passou pela marca')
  }
  {
    const st = on.world({ profile: { plan: 'free', has_paid: false } })
    const first = await on.settle()
    if (first.status !== 'processing' || st.refunds.length) p.push(`(3) ligado: o 1º poll devia deixar o clipe em processamento, sem estorno (${first.status}, estornos ${st.refunds.length})`)
    if (st.uploads[0] !== CLEAN_PATH) p.push(`(3) o original limpo não foi guardado no caminho do HMAC: ${st.uploads[0]}`)
    const text = st.submits[0]?.elements?.find((e) => e.type === 'text')
    const video = st.submits[0]?.elements?.find((e) => e.type === 'video')
    if (!text || text.text !== 'usekineo.com' || video?.source !== PUB(CLEAN_PATH) || st.submits[0].width !== 720 || st.submits[0].height !== 1280) p.push('(3) render pedido sem a marca ou fora do quadro do clipe')
    const second = await on.settle()
    if (second.status !== 'done' || second.video_url !== PUB(BRANDED_PATH) || st.clip.video_url !== PUB(BRANDED_PATH)) p.push(`(3) ligado: o clipe grátis não saiu COM marca (${second.status} ${second.video_url})`)
    if (st.refunds.length || st.submits.length !== 1 || st.unexpected.length) p.push(`(3) marca custou estorno/2º render/consulta estranha: ${st.refunds.length}/${st.submits.length}/${st.unexpected.join()}`)
    for (const n of ['clip_watermark_started', 'clip_watermark_applied', 'clip_delivered']) if (!names(st).includes(n)) p.push(`(3) sem o evento ${n}`)
    const pub = on.server.toPublicClip({ ...st.clip })
    if (pub.branded !== true || pub.video_url !== PUB(BRANDED_PATH)) p.push('(3) o clipe público não diz que tem marca')
    st.profile = { plan: 'free', has_paid: false }
    const free = await on.server.publicClipsForViewer(on.admin, UID, [{ ...st.clip }])
    if (free[0]?.video_url !== PUB(BRANDED_PATH)) p.push('(3) conta grátis recebeu o original limpo pelo GET')
    st.profile = { plan: 'starter', has_paid: true }
    const paid = await on.server.publicClipsForViewer(on.admin, UID, [{ ...st.clip }])
    if (paid[0]?.video_url !== PUB(CLEAN_PATH) || paid[0]?.branded !== false) p.push('(3) quem assinou depois não recebeu o original limpo')
  }
  {
    const st = on.world({ profile: { plan: 'free', has_paid: false }, submitFail: true })
    const after = await on.settle()
    if (after.status !== 'done' || after.video_url !== PUB(CLEAN_PATH) || failedStage(st) !== 'submit' || st.refunds.length) p.push('(3) Creatomate recusou e o clipe não saiu LIMPO na hora')
  }
  {
    const st = on.world({ profile: { plan: 'free', has_paid: false }, renderState: 'failed' })
    await on.settle()
    const after = await on.settle()
    if (after.status !== 'done' || after.video_url !== PUB(CLEAN_PATH) || failedStage(st) !== 'render' || st.refunds.length) p.push('(3) render falhou e o clipe não saiu LIMPO')
  }
  {
    const st = on.world({ profile: null, profileError: true })
    const after = await on.settle()
    if (after.video_url !== PUB(CANONICAL) || st.submits.length || failedStage(st) !== 'profile') p.push('(2) perfil ilegível: devia sair sem marca e registrar a falha')
  }
  {
    // Duas abas: esta leu a linha SEM marca, mas outra aba gravou a trava antes dela.
    const st = on.world({ profile: { plan: 'free', has_paid: false } })
    const other = M.brandMarker({ phase: 'starting', reason: 'free', startedAt: Date.now() - 1000, renderId: null })
    const row = { ...st.clip }
    st.clip.video_url = other
    const after = await on.flow.settleClip(on.server.settleDepsFor(on.admin, UID), row)
    if (after.status !== 'processing' || st.submits.length || st.fetches.includes('https://fal.test/out.mp4') || st.clip.video_url !== other) p.push('(3) duas abas: a segunda pediu outro render por cima da trava')
  }
  {
    const st = on.world({ profile: { plan: 'free', has_paid: false }, row: { created_at: new Date(Date.now() - (6 * 3600_000 - 10 * 60_000)).toISOString() } })
    const after = await on.settle()
    if (after.video_url !== PUB(CANONICAL) || st.submits.length) p.push('(3) perto do prazo de estorno a marca começou (o clipe podia virar estorno)')
  }

  // (3d) GET e o par da rota
  const route = src(ROUTE)
  if (!route.includes('clips: await publicClipsForViewer(admin, user.id, rows)')) p.push('(3) o GET /api/clips não entrega o limpo a quem assinou depois')

  // (4) botão "Post it"
  const client = src(CLIENT)
  const doneBlock = client.slice(client.indexOf("{c.status === 'done' && c.video_url && ("), client.indexOf('{postNote?.id === c.id && ('))
  for (const need of [
    "import { CLIP_POST_COPY, CLIP_POST_EVENTS, CLIP_SHARE_CAPTION } from '@/lib/clips/freeClipWatermark'",
    'await navigator.clipboard.writeText(CLIP_SHARE_CAPTION)',
    "const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches",
    "const sheet = touch && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'",
    'if (navigator.canShare({ files: [file] })) {',
    'navigator.share({ files: [file], text: CLIP_SHARE_CAPTION })',
    'await download(url, name)',
    "void trackClosedEvent(CLIP_POST_EVENTS.clicked, { ...meta, method: sheet ? 'share_sheet' : 'download_copy' })",
    "void trackClosedEvent(CLIP_POST_EVENTS.shared, { ...meta, method: 'share_sheet' })",
    "void trackClosedEvent(CLIP_POST_EVENTS.fallback, { ...meta, method: 'download_copy', caption_copied: copied })",
    '<UiLabel>{CLIP_POST_COPY[postNote.kind]}</UiLabel>',
  ]) if (!client.includes(need)) p.push(`(4) tela sem "${need.slice(0, 70)}"`)
  if (!doneBlock.includes('onClick={() => void post(c)}') || !doneBlock.includes('<UiLabel>{postBusy === c.id ? CLIP_POST_COPY.preparing : CLIP_POST_COPY.button}</UiLabel>')) p.push('(4) clipe pronto sem o botão "Post it" traduzido')
  if (/c\.branded\s*&&/.test(doneBlock)) p.push('(4) o "Post it" ficou só para clipe com marca (é para todas as contas)')
  const clientCode = client.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  if (/['">]Post it['"<]/.test(clientCode)) p.push('(4) "Post it" escrito à mão na tela (fora do dicionário)')
  if (M.CLIP_POST_EVENTS?.clicked !== 'clip_post_clicked' || M.CLIP_POST_EVENTS?.shared !== 'clip_post_shared' || M.CLIP_POST_EVENTS?.fallback !== 'clip_post_fallback') p.push('(4) nomes dos eventos do "Post it" mudaram')
  const events = src(EVENTS)
  const open = events.indexOf('[', events.indexOf('const SERVER_ONLY_EVENTS = new Set(['))
  const close = events.indexOf('])', open)
  const serverOnly = new Set(Function(`"use strict"; return (${events.slice(open, close + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')})`)())
  for (const n of Object.values(M.CLIP_POST_EVENTS ?? {})) if (serverOnly.has(n)) p.push(`(4) ${n} está em SERVER_ONLY_EVENTS: o navegador não conseguiria gravar o clique`)

  // (5) 6 frases nas 16 línguas
  let dict = null
  try { dict = JSON.parse(src(COPY)) } catch (err) { p.push(`(5) refinementCopy.json inválido: ${err.message}`) }
  if (dict) {
    if (Object.keys(dict).sort().join() !== [...LANGS].sort().join()) p.push('(5) as línguas do dicionário mudaram')
    const phrases = Object.values(M.CLIP_POST_COPY ?? {})
    if (phrases.length !== 6) p.push('(5) esperava 6 frases do "Post it"')
    for (const phrase of phrases) {
      for (const lang of LANGS) {
        const v = dict[lang]?.[phrase]
        if (typeof v !== 'string' || !v.trim()) p.push(`(5) "${phrase}" sem tradução em ${lang}`)
        else if (lang === 'en' ? v !== phrase : v === phrase) p.push(`(5) "${phrase}" em ${lang} não é tradução`)
      }
    }
  }
  return p
}

console.log('TESTE clipe grátis com marca usekineo.com + botão Post it — 06/10')
const real = await problems()
ok(real.length === 0, '(1–5) interruptor nasce false; desligado nada muda; pagante nunca; falha entrega o limpo; Post it com legenda; 16 línguas' + (real.length ? ' → ' + real.join(' | ') : ''))

// (6) mutantes — cada âncora é real e cada regra quebrada fica vermelha
const mutants = [
  ['M1 interruptor nasce ligado', MOD, 'export const FREE_CLIP_WATERMARK_LIVE = false', 'export const FREE_CLIP_WATERMARK_LIVE = true'],
  ['M2 persist sem o interruptor (lê perfil com a peça desligada)', SERVER, '  if (FREE_CLIP_WATERMARK_LIVE) {\n    const { persistFreeClipWithMark }', '  if (true) {\n    const { persistFreeClipWithMark }'],
  ['M3 has_paid ignorado', MOD, '  if (row.has_paid === true) return true\n', ''],
  ['M4 trial de cartão (Stripe/PayPal) tratado como cortesia', MOD, '    return filled(row.stripe_subscription_id) || filled(row.paypal_subscription_id) || filled(row.paddle_subscription_id)\n', '    return false\n'],
  ['M5 plano desconhecido vira grátis', MOD, '  }\n  return true\n}\n\nexport type FreeClipMarkReason', '  }\n  return false\n}\n\nexport type FreeClipMarkReason'],
  ['M6 perfil ilegível recebe marca', MOD, "  if (!args.profile) return { brand: false, reason: 'profile_unreadable' }", "  if (!args.profile) return { brand: true, reason: 'free' }"],
  ['M7 recusa do Creatomate segura o clipe', MOD, "      return deliverClean(clean, 'submit', error, { reason })", '      throw error'],
  ['M8 render preso nunca entrega o limpo', MOD, "  if (elapsed >= FREE_CLIP_MARK_MAX_MS) return deliverClean(clean, 'timeout', null, ofMarker(marker))\n", ''],
  ['M9 render que falhou fica esperando', MOD, "  if (state?.status === 'failed') return deliverClean(clean, 'render', state.error, ofMarker(marker))\n", ''],
  ['M10 falha antes da cópia limpa não solta a trava', MOD, '      await deps.swap(starting, null).catch(() => false)\n', ''],
  ['M11 sem a guarda do prazo de estorno', MOD, '    if (Number.isFinite(args.ageMs) && args.ageMs > args.expireMs - FREE_CLIP_MARK_EXPIRE_GUARD_MS) return null\n', ''],
  ['M12 trava sem compare-and-set (duas abas, dois renders)', WIRE, "        .is('video_url', null)\n", ''],
  ['M13 quem assinou depois continua com marca', SERVER, '  if (error || !data || !clipOwnerPays(data as ClipOwnerProfile)) return out\n', '  if (true) return out\n'],
  ['M14 conta grátis recebe o limpo pelo GET', SERVER, '  if (error || !data || !clipOwnerPays(data as ClipOwnerProfile)) return out\n', '  if (error || !data) return out\n'],
  ['M15 clipe público não diz que tem marca', SERVER, "    branded: row.status === 'done' && isBrandedClipUrl(row.video_url),", '    branded: false,'],
  ['M16 GET sem o limpo para quem assinou', ROUTE, 'clips: await publicClipsForViewer(admin, user.id, rows)', 'clips: rows.map(toPublicClip)'],
  ['M17 legenda trocada', MOD, "export const CLIP_SHARE_CAPTION = 'Made with Kineo · usekineo.com #madewithkineo'", "export const CLIP_SHARE_CAPTION = 'Made with Kineo'"],
  ['M18 compartilha sem o arquivo', CLIENT, 'navigator.share({ files: [file], text: CLIP_SHARE_CAPTION })', 'navigator.share({ text: CLIP_SHARE_CAPTION })'],
  ['M19 legenda não vai para a área de transferência', CLIENT, 'await navigator.clipboard.writeText(CLIP_SHARE_CAPTION)', "await navigator.clipboard.writeText('')"],
  ['M20 botão não faz nada', CLIENT, 'onClick={() => void post(c)}', 'onClick={() => undefined}'],
  ['M21 aviso fora do dicionário', CLIENT, '<UiLabel>{CLIP_POST_COPY[postNote.kind]}</UiLabel>', '{CLIP_POST_COPY[postNote.kind]}'],
  ['M22 compartilhamento concluído sem evento', CLIENT, "          void trackClosedEvent(CLIP_POST_EVENTS.shared, { ...meta, method: 'share_sheet' })\n", ''],
  ['M23 frase sem tradução em vietnamita', COPY, '    "Post it": "Đăng",\n', ''],
  ['M24 folha do sistema no computador (sem baixar + copiar)', CLIENT, "const sheet = touch && typeof navigator.share === 'function'", "const sheet = typeof navigator.share === 'function'"],
]
for (const [label, file, from, to] of mutants) {
  const text = read(file)
  const hits = text.split(from).length - 1
  if (hits !== 1) { ok(false, `(${label}) âncora do mutante encontrada ${hits}x — reancore`); continue }
  let bitten = false
  try {
    // Só conta o vermelho NOVO: um problema que a árvore real já tem não prova nada sobre o mutante.
    const fresh = (await problems({ [file]: text.split(from).join(to) })).filter((x) => !real.includes(x))
    if (process.env.MARCA_DEBUG) console.log(`    ${label}: ${fresh.join(' | ')}`)
    bitten = fresh.length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
