// KINEO-ATOR-ANUNCIO-2026-10-09 — guardião do ATOR DE IA do anúncio v2 ("Person talking about it", Studio Ads).
// Decisão do fundador (09/10): 8 de 14 concorrentes vendem uma pessoa de IA falando do produto; o teste real (1 foto de IA
// segurando um sérum + a voz → 32 s no fal-ai/kling-video/ai-avatar/v2/standard) foi aprovado ("boca acompanhando a fala").
// Prova, EXECUTANDO o código real pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs):
//   (1) espelhos (slug/preço/atuação = lib/avatar/veed.ts; v2Tiers = v2Presenter) e a migration pendente que só alarga;
//   (2) contrato: presenter true só com foto 'product' (senão 400 presenter_needs_voice_and_product); ausente = corpo de
//       antes; não-booleano = 400 bad_presenter; a rota /plan exige a narração ligada no pedido;
//   (3) plano do ator: a 1ª foto de produto, pessoa pela semente do pedido, prompt com boca fechada/sem texto/produto exato;
//   (4) motor: routeShot NUNCA devolve 'kling_avatar' para um plano; o builder manda SÓ { image_url, audio_url, prompt };
//   (5) custo honesto: + US$ 0,0562/s × duração + a foto (US$ 0,15); créditos e refação NÃO mudam;
//   (6) EXECUTADO contra um banco falso: foto do ator pelo Nano Banana com a foto do produto, voz sintetizada uma vez, vídeo
//       falado com a voz, 2ª tentativa sem cobrar, desistência (2ª falha, saldo, sem voz, voz longa, prazo) que NUNCA mata
//       o pedido e sai o anúncio normal, montagem com o ator como trilha base e SEM voz dupla (o source que iria ao
//       Creatomate é inspecionado), a linha do ator recriada, a vista e a refação;
//   (7) montagem pura: ator com som, inserts mudos de 1,5-2,5 s, rosto no gancho e no fim, frases esticadas, música baixa;
//       sem ator o source é o de antes;
//   (8) dinheiro intocado: v2Billing e sample.ts byte a byte; /start só mudou a linha da estimativa;
//   (9) frases nas 16 línguas; prévia (mp4 + jpg) existe; telas e páginas (leitura);
//  (10) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + ts.transpileModule (via offline-ts-loader). Nenhum import com alias @/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); return src.split(de).join(para) }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps

const F = {
  presenter: 'lib/ads/v2Presenter.ts',
  veed: 'lib/avatar/veed.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  engines: 'lib/ads/v2Engines.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  contract: 'lib/ads/v2Contract.ts',
  advance: 'lib/ads/v2Advance.ts',
  montage: 'lib/ads/adV2Montage.ts',
  billing: 'lib/ads/v2Billing.ts',
  sample: 'lib/ads/sample.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  start: 'app/api/ads/v2/start/route.ts',
  retake: 'app/api/ads/v2/retake/route.ts',
  variations: 'app/api/ads/v2/variations/route.ts',
  comp: 'components/ads/AdsStyles.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  business: 'app/business/page.tsx',
  door: 'app/ads/page.tsx',
  mig: 'migrations_pending/2026-10-09_ads_v2_ator.sql',
}
const SLUG = 'fal-ai/kling-video/ai-avatar/v2/standard'

// ── banco falso (filtros de verdade, UPDATE condicional, upsert com onConflict/ignoreDuplicates) ─────────────────────────
let seq = 0
function fakeDb(tables) {
  const from = (name) => {
    tables[name] ??= []
    const st = { op: 'select', filters: [], patch: null, rows: null, opts: null, orders: [] }
    const run = (single) => {
      const now = new Date().toISOString()
      if (st.op === 'upsert' || st.op === 'insert') {
        const added = []
        for (const r of Array.isArray(st.rows) ? st.rows : [st.rows]) {
          const keys = (st.opts?.onConflict ?? '').split(',').filter(Boolean)
          if (keys.length && tables[name].some((x) => keys.every((k) => String(x[k]) === String(r[k])))) {
            if (st.opts?.ignoreDuplicates) continue
            return { data: null, error: { code: '23505', message: 'duplicate' } }
          }
          const row = { id: `${name}-${++seq}`, submit_claimed_at: null, image_submit_claimed_at: null, request_id: null, image_request_id: null, reason: null, reason_class: null, fal_url: null, stored_url: null, measured_seconds: null, submitted_at: null, created_at: now, ...r, updated_at: now }
          tables[name].push(row)
          added.push(row)
        }
        return { data: single ? added[0] ?? null : added, error: null }
      }
      let rows = tables[name].filter((r) => st.filters.every((f) => f(r)))
      if (st.op === 'update') for (const r of rows) Object.assign(r, st.patch, { updated_at: now })
      for (const [k, asc] of [...st.orders].reverse()) rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1))
      return { data: single ? rows[0] ?? null : rows, error: null }
    }
    const api = {
      select() { return api },
      eq(k, v) { st.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { st.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { st.filters.push((r) => (r[k] ?? null) === v); return api },
      not() { return api }, gte() { return api }, lt() { return api }, limit() { return api },
      order(k, o) { st.orders.push([k, o?.ascending !== false]); return api },
      update(p) { st.op = 'update'; st.patch = p; return api },
      upsert(rows, opts) { st.op = 'upsert'; st.rows = rows; st.opts = opts; return api },
      insert(rows) { st.op = 'insert'; st.rows = rows; return api },
      maybeSingle() { return Promise.resolve(run(true)) },
      single() { return Promise.resolve(run(true)) },
      then(res, rej) { return Promise.resolve(run(false)).then(res, rej) },
    }
    return api
  }
  return { from }
}

// ── carregador: módulos reais (puros) + v2Advance com fornecedores falsos (fal, voz, Creatomate) ────────────────────────
const VOICE_URL = 'https://x.supabase.co/storage/v1/object/public/voiceovers/u/voz.mp3'
const MUSIC_URL = 'https://x.supabase.co/storage/v1/object/public/music/u/trilha.mp3'
function world(over = {}, opts = {}) {
  const submits = []
  const images = []
  const events = []
  const fails = []
  const sources = []
  const tts = []
  const voiceSeconds = opts.voiceSeconds ?? 12.4
  const mocks = {
    '@/lib/compose': {
      CreatomateSubmitError: class extends Error {},
      estimateMp3DurationSeconds: () => voiceSeconds,
      pollCreatomateRender: async () => ({ status: 'rendering' }),
      submitCreatomateRender: async (src) => { sources.push(src); return 'render-1' },
      uploadVoiceoverToSupabase: async () => VOICE_URL,
    },
    '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
    '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => MUSIC_URL },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async (text) => { tts.push(text); if (opts.ttsFails) throw new Error('tts down'); return Buffer.from('mp3') } },
    '@/lib/renderAssets': {},
    '@/lib/renderProfile': { renderOutputSpecFor: () => ({ width: 1080, height: 1920 }) },
    '@/lib/textLanguage': { captionFontFor: () => 'Inter', narrationLanguage: () => 'en' },
    '@/lib/ads/speakable': { speakableForTts: (t) => t },
    '@/lib/ads/v2Music': { adsV2FallbackTrack: () => null, adsV2MusicTrimStart: () => 0, adsV2MusicUsable: () => true, adsV2SwapLibraryTrack: (u) => u },
    '@/lib/ads/v2Images': {
      submitSceneImage: async (scene) => { images.push(scene); return { kind: 'accepted', requestId: `img-${images.length}`, posts: 1 } },
      pollSceneImage: async () => ({ state: 'processing', url: null }),
      persistSceneImage: async () => null,
      persistAudioCopy: async () => null,
    },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e) } },
    '@/lib/ads/v2Variations': { ADS_V2_SAME_PERSON_LINE: '', adsV2AnchorDecision: () => ({ kind: 'skip' }), variationTagOf: () => null, variationTintOf: () => null },
    '@/lib/ads/v2Billing': {
      ADS_V2_QUALITY: 'ads_v2',
      confirmAdsV2Debit: async () => ({ ok: true, refunded: false }),
      failAdsV2Order: async (admin, order, reason) => { fails.push(reason); await admin.from('ads_v2_orders').update({ status: 'failed', error: reason }).eq('id', order.id) },
    },
    '@/lib/ads/v2Shots': {
      ADS_V2_AMBIGUOUS_MAX_MS: 20 * 60 * 1000, ADS_V2_BATCH_SIZE: 3, ADS_V2_COPY_MAX_MS: 30 * 60 * 1000, ADS_V2_KLING_GAP_MS: 0, ADS_V2_SHOT_STUCK_MS: 20 * 60 * 1000,
      persistShotClip: async () => null,
      pollFalJob: async () => ({ state: 'processing', url: null }),
      submitShotOnce: async (slug, input) => { submits.push({ slug, input }); return { kind: 'accepted', requestId: `req-${submits.length}`, posts: 1 } },
    },
  }
  const load = createOfflineLoader({
    mocks,
    globals: { setTimeout: (fn) => { setImmediate(fn); return 0 } },
    source: (rel, text) => (Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : text),
  })
  return { load, submits, images, events, fails, sources, tts }
}
const base = world()
const P = base.load(F.presenter)
const T = base.load(F.tiers)
const E = base.load(F.engines)
const SL = base.load(F.shots)
const C = base.load(F.contract)
const M = base.load(F.montage)
const I = base.load(F.iface)

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const url = (n) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${n}.jpg`
const clip = (n) => `https://x.supabase.co/storage/v1/object/public/renders/u/adsv2-p${n}.mp4`
const FOTOS = [
  { id: U(1), url: url(1), kind: 'product' },
  { id: U(2), url: url(2), kind: 'place' },
  { id: U(3), url: url(3), kind: 'people' },
  { id: U(4), url: url(4), kind: 'product' },
  { id: U(5), url: url(5), kind: 'place' },
]
const FOTOS_DB = FOTOS.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url }))
const TIERS = ['photo_motion', 'commercial', 'cinema']
const KINDS = ['people', 'place', 'product', 'product_hero', 'text', 'user_video']
const PERF = P.ADS_V2_PRESENTER_PERFORMANCE_PROMPT

// ═══ 1. espelhos e migration ═════════════════════════════════════════════════════════════════════════════════════════
await check('1a espelhos com lib/avatar/veed.ts: slug = PRESENTER_MODEL, atuação = PRESENTER_ENERGETIC_PERFORMANCE_PROMPT, US$/s = PRESENTER_USD_PER_SECOND', () => {
  const v = read(F.veed)
  const model = (v.match(/export const PRESENTER_MODEL = '([^']+)'/) || [])[1]
  const perf = (v.match(/export const PRESENTER_ENERGETIC_PERFORMANCE_PROMPT =\s*\n?\s*'([^']+)'/) || [])[1]
  const usd = Number((v.match(/export const PRESENTER_USD_PER_SECOND = ([\d.]+)/) || [])[1])
  return model === SLUG && P.ADS_V2_PRESENTER_SLUG === SLUG && perf === PERF && perf.length > 50 && near(usd, P.ADS_V2_PRESENTER_USD_PER_SECOND)
})
await check('1b catálogo do anúncio: v2Tiers.kling_avatar = o mesmo slug e US$ 0,0562/s; o id existe em v2Tiers e v2Engines', () =>
  T.ADS_V2_KLING_AVATAR_SLUG === SLUG && T.ADS_V2_ENGINES.kling_avatar.slug === SLUG && near(T.ADS_V2_ENGINES.kling_avatar.usdPerSecond, 0.0562) &&
  T.ADS_V2_ENGINE_IDS.includes('kling_avatar') && /export type AdsV2EngineId = [^\n]*'kling_avatar'/.test(read(F.engines)) && P.ADS_V2_PRESENTER_ENGINE === 'kling_avatar')
await check('1c migration pendente: alarga kind (+presenter) e motor (+kling_avatar), idempotente, trava ator↔motor; não toca em dados', () => {
  const sql = read(F.mig).replace(/--.*$/gm, '')
  return /drop constraint if exists ads_v2_shots_kind_check;/.test(sql) && /check \(kind in \('people', 'place', 'product', 'product_hero', 'text', 'user_video', 'presenter'\)\)/.test(sql) &&
    /drop constraint if exists ads_v2_shots_engine_check;/.test(sql) && /check \(engine is null or engine in \('kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect', 'kling_avatar'\)\)/.test(sql) &&
    /drop constraint if exists ads_v2_shots_presenter_engine;/.test(sql) && /check \(\(kind = 'presenter'\) = \(engine is not distinct from 'kling_avatar'\)\)/.test(sql) &&
    !/\b(delete|update|insert|truncate|drop table|drop column)\b/i.test(sql)
})
await check('1d a linha do ator cabe no banco: idx 31 (CHECK 0..31), fora de qualquer plano; tipo fora de ADS_V2_SHOT_KINDS', () =>
  P.ADS_V2_PRESENTER_IDX === 31 && /idx integer not null check \(idx >= 0 and idx <= 31\)/.test(read('migrations_pending/2026-09-29_ads_v2.sql')) &&
  !T.ADS_V2_SHOT_KINDS.includes('presenter') &&
  TIERS.every((tier) => [15, 20, 30].every((seconds) => SL.planShots({ sector: 'store', tier, photos: FOTOS, seconds }).shots.every((s) => s.idx < 31))))

// ═══ 2. contrato ═════════════════════════════════════════════════════════════════════════════════════════════════════
const PB = (extra, kinds = ['product', 'place', 'people']) => ({ order_id: U(9), sector: 'store', logo_footage_id: U(8), photos: kinds.map((k, i) => ({ footage_id: U(i + 1), kind: k })), ...extra })
await check('2a presenter:true com foto de produto vai no valor; ausente/null/false = SEM a chave (corpo de antes, byte a byte)', () =>
  C.sanitizePlanBody(PB({ presenter: true })).value.presenter === true &&
  [undefined, null, false].every((v) => { const r = C.sanitizePlanBody(PB(v === undefined ? {} : { presenter: v })); return r.ok && !('presenter' in r.value) }) &&
  JSON.stringify(C.sanitizePlanBody(PB({ presenter: false }))) === JSON.stringify(C.sanitizePlanBody(PB({}))))
await check('2b presenter sem NENHUMA foto marcada produto = 400 presenter_needs_voice_and_product (também no modo simples)', () =>
  C.sanitizePlanBody(PB({ presenter: true }, ['place', 'people', 'text'])).error === 'presenter_needs_voice_and_product' &&
  C.sanitizePlanBody({ ...PB({ presenter: true }, ['place', 'place', 'people']), mode: 'simple', logo_footage_id: null }).error === 'presenter_needs_voice_and_product')
await check('2c presenter que não é booleano = 400 bad_presenter', () =>
  ['true', 1, 'yes', {}, []].every((v) => C.sanitizePlanBody(PB({ presenter: v })).error === 'bad_presenter'))
await check('2d rota /plan: interruptor + narração do PEDIDO (400 presenter_needs_voice_and_product), ator gravado no plano e na estimativa (lido)', () => {
  const s = code(read(F.plan))
  return /const presenterAsked = ADS_V2_PRESENTER_PUBLIC && input\.presenter === true/.test(s) &&
    /if \(presenterAsked && order\.narration !== true\) return v2Fail\('presenter_needs_voice_and_product', 400\)/.test(s) &&
    ordem(s, 'const presenterAsked', "v2Fail('presenter_needs_voice_and_product', 400)", 'ownedFootage(', 'extractAdsV2Brief(', 'planAdsV2Presenter(', 'const stored: AdsV2StoredPlan') &&
    /const presenter = presenterAsked && extracted\.copy\.narration \? planAdsV2Presenter\(\{ sector, photos, seedKey: order\.id \}\) : null/.test(s) &&
    /\.\.\.\(presenter \? \{ presenter \} : \{\}\) \}/.test(s) && /seconds: plan\.totalSeconds, presenter: !!presenter \}\)/.test(s) && P.ADS_V2_PRESENTER_PUBLIC === true
})

// ═══ 3. o plano do ator ══════════════════════════════════════════════════════════════════════════════════════════════
await check('3a o ator segura a 1ª foto marcada produto; sem foto de produto (ou URL não https) = null', () => {
  const p = P.planAdsV2Presenter({ sector: 'store', photos: FOTOS_DB, seedKey: U(9) })
  return p.productFootageId === U(1) && p.productUrl === url(1) && P.isAdsV2PresenterPlan(p) &&
    P.planAdsV2Presenter({ sector: 'store', photos: FOTOS_DB.map((f) => ({ ...f, kind: f.kind === 'product' ? 'place' : f.kind })), seedKey: U(9) }) === null &&
    P.planAdsV2Presenter({ sector: 'store', photos: [{ footage_id: U(1), kind: 'product', url: 'http://x.test/a.jpg' }], seedKey: U(9) }) === null
})
await check('3b pessoa pela semente do pedido: estável, dentro da lista, e varia entre pedidos (≥ 4 pessoas em 30 pedidos)', () => {
  const ids = Array.from({ length: 30 }, (_, i) => U(100 + i))
  const ps = ids.map((id) => P.adsV2PresenterPerson(id))
  return ps.every((n, i) => Number.isInteger(n) && n >= 0 && n < P.ADS_V2_PRESENTER_PEOPLE.length && n === P.adsV2PresenterPerson(ids[i])) && new Set(ps).size >= 4
})
await check('3c prompt da foto: selfie vertical, olhando para a câmera, BOCA FECHADA, segura o produto da referência EXATO, fundo do setor, sem texto/logo; sempre mulher adulta (voz padrão feminina)', () =>
  ['restaurant', 'clinic', 'store', 'salon', 'gym', 'real_estate', 'app_service', 'other', 'xyz', null].every((sector) => {
    const pr = P.adsV2ActorPrompt(sector, 3)
    return /vertical smartphone selfie/.test(pr) && /looking straight into the camera/.test(pr) && /mouth closed/.test(pr) && /product from the reference photo/.test(pr) &&
      /EXACTLY as in the reference photo/.test(pr) && /No text, no captions, no logos or watermarks added/.test(pr) && /softly out of focus/.test(pr) && /only one person/.test(pr)
  }) && P.adsV2ActorPrompt('restaurant', 0).includes('restaurant') && P.adsV2ActorPrompt('salon', 0).includes('beauty salon') &&
  P.ADS_V2_PRESENTER_PEOPLE.every((who) => /\bwoman\b/.test(who) && !/\b(girl|teen|child|kid)\b/i.test(who)))
await check('3d desistência: 2ª falha, saldo, sem acesso e recusa nossa = desiste; 1ª falha do fornecedor e linha viva = não', () =>
  P.adsV2PresenterGaveUp({ status: 'failed', attempt: 2, reason_class: 'unknown' }) && P.adsV2PresenterGaveUp({ status: 'stuck', attempt: 2, reason_class: 'unknown' }) &&
  ['balance_quota', 'auth_model_access', 'local_policy_gate'].every((c) => P.adsV2PresenterGaveUp({ status: 'failed', attempt: 1, reason_class: c })) &&
  !P.adsV2PresenterGaveUp({ status: 'failed', attempt: 1, reason_class: 'unknown' }) && !P.adsV2PresenterGaveUp({ status: 'submitted', attempt: 2, reason_class: null }) &&
  !P.adsV2PresenterGaveUp({ status: 'done', attempt: 2, reason_class: null }))
await check('3e a voz cabe no ator até o alvo + 4 s (a mesma folga do cartão) e nunca acima do teto do modelo', () =>
  P.adsV2PresenterVoiceFits(12.4, 15) && P.adsV2PresenterVoiceFits(19, 15) && !P.adsV2PresenterVoiceFits(19.01, 15) && P.adsV2PresenterVoiceFits(33.9, 30) &&
  !P.adsV2PresenterVoiceFits(0, 15) && !P.adsV2PresenterVoiceFits(null, 15) && !P.adsV2PresenterVoiceFits(NaN, 15))

// ═══ 4. motor ════════════════════════════════════════════════════════════════════════════════════════════════════════
await check('4a routeShot NUNCA devolve kling_avatar (todo tipo × nível × tentativa × estilo): o ator só entra pela linha dele', () =>
  KINDS.every((k) => TIERS.every((t) => [1, 2, 3, 4].every((a) => [false, true].every((st) => T.routeShot(k, t, a, st) !== 'kling_avatar')))))
await check('4b builder do ator: SÓ { image_url, audio_url, prompt } (sem duração/resolução/end_image_url); sem voz https recusa', () => {
  const i = E.buildShotInput('kling_avatar', { imageUrl: url(1), prompt: PERF, audioUrl: VOICE_URL, effect: 'giant_product', end_image_url: url(2) })
  let r1 = false, r2 = false, r3 = false
  try { E.buildShotInput('kling_avatar', { imageUrl: url(1), prompt: PERF }) } catch { r1 = true }
  try { E.buildShotInput('kling_avatar', { imageUrl: url(1), prompt: PERF, audioUrl: 'http://x.test/v.mp3' }) } catch { r2 = true }
  try { E.buildShotInput('kling_avatar', { imageUrl: url(1), prompt: '', audioUrl: VOICE_URL }) } catch { r3 = true }
  return Object.keys(i).sort().join(',') === 'audio_url,image_url,prompt' && i.audio_url === VOICE_URL && i.image_url === url(1) && i.prompt === PERF && r1 && r2 && r3
})
await check('4c os outros motores ignoram audioUrl (entrada idêntica com e sem a voz)', () =>
  ['kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect'].every((e) =>
    JSON.stringify(E.buildShotInput(e, { imageUrl: url(1), prompt: 'Slow push in.', effect: 'giant_product', audioUrl: VOICE_URL })) === JSON.stringify(E.buildShotInput(e, { imageUrl: url(1), prompt: 'Slow push in.', effect: 'giant_product' }))))

// ═══ 5. custo e créditos ═════════════════════════════════════════════════════════════════════════════════════════════
const est = (tier, presenter, seconds = 15) => { const p = SL.planShots({ sector: 'store', tier, photos: FOTOS, seconds }); return T.estimateAdUsd({ tier, shots: p.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds, presenter }) }
await check('5a estimativa honesta: + US$ 0,0562/s × duração + a foto do ator (US$ 0,15); +1 motor, +1 imagem', () =>
  TIERS.every((t) => [15, 20, 30].every((s) => {
    const a = est(t, false, s), b = est(t, true, s)
    return near(b.totalUsd - a.totalUsd, 0.0562 * s + 0.15, 0.002) && b.aiShots === a.aiShots + 1 && b.sceneImages === a.sceneImages + 1
  })) && near(est('photo_motion', true).totalUsd - est('photo_motion', false).totalUsd, 0.993, 0.002))
await check('5b créditos NÃO mudam com o ator (34/41/51 por 15 s; adsV2Credits só tem nível e segundos) e a refação idem', () =>
  T.adsV2Credits('photo_motion', 15) === 34 && T.adsV2Credits('commercial', 15) === 41 && T.adsV2Credits('cinema', 15) === 51 && T.adsV2Credits.length === 2 &&
  T.adsV2RetakeCredits('product', 'photo_motion') === 5 && T.adsV2RetakeCredits('product_hero', 'cinema') === 12 && T.ADS_V2_RETAKE_CREDITS.kling_avatar === 0 &&
  !/presenter/.test((code(read(F.tiers)).match(/export function adsV2Credits[\s\S]*?\n}/) || [''])[0]))
await check('5c plan/start/variations passam o ator à estimativa (lido); o preço continua adsV2Credits(tier, segundos)', () =>
  /seconds: plan\.totalSeconds, presenter: !!presenter \}\)/.test(read(F.plan)) && /seconds: plan\.totalSeconds, presenter: !!plan\.presenter \}\)/.test(read(F.start)) &&
  /seconds: base\.totalSeconds, presenter: !!base\.presenter \}\)/.test(read(F.variations)) && /const credits = adsV2Credits\(order\.tier, order\.seconds\)/.test(read(F.plan)))

// ═══ 6. execução contra o banco falso ════════════════════════════════════════════════════════════════════════════════
const ORDER = '22222222-2222-4222-8222-222222222222'
const PLAN = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: FOTOS, seconds: 15 })
const PRES = P.planAdsV2Presenter({ sector: 'store', photos: FOTOS_DB, seedKey: ORDER })
const OVERLAYS = [{ role: 'hook', start: 0.3, end: 3, text: 'Glow all day' }, { role: 'cta', start: 8, end: 12, text: 'Order today' }]
const NARRATION = 'This serum keeps your skin bright and fresh all day. Order yours today.'
function cena(o = {}) {
  const now = Date.now()
  const started = new Date(now - (o.agoMs ?? 0)).toISOString()
  const rows = PLAN.shots.map((s, i) => {
    const text = s.kind === 'text'
    const live = o.firstWorking && i === 0
    return {
      id: `s${i}`, order_id: ORDER, idx: s.idx, attempt: 1, role: s.role, kind: s.kind, source: s.source, source_footage_id: s.sourceFootageId,
      image_url: s.imageUrl ?? null, engine: text ? null : T.routeShot(s.kind, 'photo_motion', 1), prompt: text ? null : s.prompt,
      status: text ? 'skipped_text' : live ? 'submitted' : 'done', request_id: live ? 'req-x' : null, submitted_at: live ? new Date().toISOString() : null,
      stored_url: text ? s.imageUrl : live ? null : clip(i), measured_seconds: text || live ? null : 3.0,
      cut_start: s.cutStart, cut_seconds: s.cutSeconds, movement_variant: 0, reason: null, reason_class: null, created_at: started, updated_at: started,
    }
  })
  const pr = o.presenter === null ? null : {
    id: 'pr', order_id: ORDER, idx: 31, attempt: 1, role: 'presenter', kind: 'presenter', source: 'generated_scene', source_footage_id: U(1),
    image_url: null, engine: 'kling_avatar', prompt: PERF, status: 'pending', stored_url: null, measured_seconds: null, cut_start: 0, cut_seconds: null,
    movement_variant: 0, reason: null, reason_class: null, request_id: null, submitted_at: null, submit_claimed_at: null, image_submit_claimed_at: null, created_at: started, updated_at: started, ...(o.presenter ?? {}),
  }
  return {
    ads_v2_orders: [{
      id: ORDER, user_id: U(99), status: 'generating', tier: 'photo_motion', seconds: 15, sector: 'store', brief: null, language: 'en', narration: o.narration ?? true,
      plan: { ...PLAN, overlays: OVERLAYS, narration: NARRATION, ...(o.noPresenterPlan ? {} : { presenter: PRES }) },
      started_at: started, billing_ref: `adsv2-${ORDER}-g`, credits_charged: 34, card_url: url(9), parent_order_id: null,
      voice_url: o.voice ? VOICE_URL : null, voice_seconds: o.voice ? o.voiceSeconds ?? 12.4 : null, generation_id: 'g', music_url: null,
      creatomate_render_id: null, assembly_submit_at: null, assembly_lease_at: null, video_id: null, error: null,
    }],
    ads_v2_shots: pr ? [...rows, pr] : rows,
  }
}
async function advance(tables, over = {}, opts = {}) {
  const w = world(over, opts)
  const A = w.load(F.advance)
  await A.advanceAdsV2Order(fakeDb(tables), ORDER, { deadlineMs: Date.now() + 60_000 })
  return { ...w, A, tables }
}
const actorRows = (t) => t.ads_v2_shots.filter((r) => r.idx === 31).sort((a, b) => a.attempt - b.attempt)
const actor = (t) => actorRows(t).slice(-1)[0]
const orderOf = (t) => t.ads_v2_orders[0]
const vids = (src, track) => src.elements.filter((e) => e.type === 'video' && (track === undefined || e.track === track))
const audios = (src) => src.elements.filter((e) => e.type === 'audio')

await check('6a linhas iniciais: com ator, + UMA linha (idx 31, presenter, kling_avatar, pending, sem imagem, atuação aprovada); sem ator, as de antes byte a byte', () => {
  const A = world().load(F.advance)
  const a = A.buildInitialShotRows(ORDER, 'photo_motion', { ...PLAN, presenter: PRES })
  const b = A.buildInitialShotRows(ORDER, 'photo_motion', PLAN)
  const x = a[a.length - 1]
  return a.length === b.length + 1 && JSON.stringify(a.slice(0, -1)) === JSON.stringify(b) && x.idx === 31 && x.kind === 'presenter' && x.engine === 'kling_avatar' &&
    x.status === 'pending' && x.image_url === null && x.source === 'generated_scene' && x.prompt === PERF && x.source_footage_id === U(1) &&
    JSON.stringify(A.buildInitialShotRows(ORDER, 'photo_motion', { ...PLAN, presenter: { bogus: true } })) === JSON.stringify(b)
})
await check('6b foto do ator: Nano Banana com o prompt do ator e a foto do PRODUTO como única referência; a voz sai já (1 vez, gravada no pedido)', async () => {
  const r = await advance(cena({ firstWorking: true }))
  const a = actor(r.tables)
  return r.images.length === 1 && r.images[0].prompt === PRES.actorPrompt && JSON.stringify(r.images[0].referenceUrls) === JSON.stringify([url(1)]) &&
    a.status === 'image_submitted' && r.tts.length === 1 && r.tts[0] === NARRATION && orderOf(r.tables).voice_url === VOICE_URL && near(Number(orderOf(r.tables).voice_seconds), 12.4) &&
    !r.submits.some((s) => s.slug === SLUG) && r.fails.length === 0 && orderOf(r.tables).status === 'generating'
})
await check('6c vídeo falado: foto pronta + voz → kling avatar com { image_url, audio_url: a voz, prompt: atuação }; gen_seconds/US$ = os da voz', async () => {
  const r = await advance(cena({ firstWorking: true, presenter: { status: 'image_done', image_url: url(50) } }))
  const s = r.submits.find((x) => x.slug === SLUG)
  const a = actor(r.tables)
  return !!s && JSON.stringify(s.input) === JSON.stringify({ image_url: url(50), audio_url: VOICE_URL, prompt: PERF }) && a.status === 'submitted' &&
    near(Number(a.gen_seconds), 12.4) && near(Number(a.usd), Math.round(0.0562 * 12.4 * 10000) / 10000) && r.tts.length === 1 && r.fails.length === 0
})
await check('6c2 a voz falhou (TTS fora): o ator ESPERA com a foto pronta — não falha, não manda nada à fal, o pedido segue', async () => {
  const r = await advance(cena({ firstWorking: true, presenter: { status: 'image_done', image_url: url(50) } }), {}, { ttsFails: true })
  const a = actor(r.tables)
  return r.tts.length === 1 && a.status === 'image_done' && a.submit_claimed_at === null && !r.submits.some((x) => x.slug === SLUG) && r.fails.length === 0 && orderOf(r.tables).voice_url === null
})
await check('6d voz pronta no pedido não é sintetizada de novo (a mesma voz da montagem)', async () => {
  const r = await advance(cena({ firstWorking: true, voice: true, presenter: { status: 'image_done', image_url: url(50) } }))
  return r.tts.length === 0 && r.submits.some((x) => x.slug === SLUG && x.input.audio_url === VOICE_URL)
})
await check('6e narração DESLIGADA: nenhuma foto do ator, o ator desiste (sem voz) e o anúncio normal sai SEM matar o pedido', async () => {
  const r = await advance(cena({ narration: false }))
  const a = actor(r.tables)
  return r.images.length === 0 && r.tts.length === 0 && a.status === 'failed' && a.reason === 'presenter_no_voice' && a.reason_class === 'local_policy_gate' &&
    r.fails.length === 0 && orderOf(r.tables).status === 'assembling' && r.sources.length === 1 && vids(r.sources[0], 2).every((v) => v.volume === '0%')
})
await check('6f voz longa demais para o ator (25 s num anúncio de 15): desiste, nada vai à fal, o pedido segue', async () => {
  const r = await advance(cena({ firstWorking: true, presenter: { status: 'image_done', image_url: url(50) } }), {}, { voiceSeconds: 25 })
  const a = actor(r.tables)
  return a.status === 'failed' && /^presenter_voice_too_long:25/.test(a.reason) && a.reason_class === 'local_policy_gate' && !r.submits.some((x) => x.slug === SLUG) && r.fails.length === 0 && orderOf(r.tables).status === 'generating'
})
await check('6g 1ª falha do ator (fornecedor): 2ª tentativa SEM cobrar, reaproveitando a foto; evento presenter:true charged:false; pedido vivo', async () => {
  const r = await advance(cena({ firstWorking: true, voice: true, presenter: { status: 'failed', image_url: url(50), reason: 'provider_failed', reason_class: 'unknown' } }))
  const rows = actorRows(r.tables)
  const ev = r.events.find((e) => e.name === 'ads_v2_shot_retried' && e.metadata.idx === 31)
  return rows.length === 2 && rows[1].attempt === 2 && rows[1].image_url === url(50) && rows[1].engine === 'kling_avatar' && ['image_done', 'submitted'].includes(rows[1].status) &&
    ev && ev.metadata.presenter === true && ev.metadata.charged === false && r.fails.length === 0 && orderOf(r.tables).status === 'generating'
})
await check('6h 2ª falha do ator: NÃO há 3ª tentativa, NÃO é terminal — o anúncio normal monta (com a voz TTS, sem ator)', async () => {
  const r = await advance(cena({ voice: true, presenter: { status: 'failed', attempt: 2, image_url: url(50), reason: 'provider_failed', reason_class: 'unknown' } }))
  const src = r.sources[0]
  const voice = audios(src).filter((e) => e.source === VOICE_URL)
  return actorRows(r.tables).length === 1 && r.fails.length === 0 && orderOf(r.tables).status === 'assembling' && r.sources.length === 1 &&
    voice.length === 1 && voice[0].track === 5 && vids(src).every((v) => v.volume === '0%') && vids(src, 2).length === PLAN.shots.filter((s) => s.kind !== 'text').length
})
await check('6i saldo da fal no ator (balance_quota) = desiste na hora (sem 2ª tentativa), nunca terminal', async () => {
  const r = await advance(cena({ voice: true, presenter: { status: 'failed', attempt: 1, reason: 'submit_rejected:403', reason_class: 'balance_quota' } }))
  return actorRows(r.tables).length === 1 && r.fails.length === 0 && orderOf(r.tables).status === 'assembling'
})
await check('6j ator pronto: ele é a trilha BASE com o SOM dele; NENHUMA voz separada (nunca duas vozes); inserts mudos; cartão no fim da fala', async () => {
  const r = await advance(cena({ voice: true, presenter: { status: 'done', image_url: url(50), stored_url: clip(31), measured_seconds: 12.9 } }))
  const src = r.sources[0]
  const base = vids(src, 2)
  const ins = vids(src, 3)
  const card = src.elements.find((e) => e.type === 'image' && e.track === 3)
  const ev = r.events.find((e) => e.name === 'ads_v2_assembling')
  return r.fails.length === 0 && orderOf(r.tables).status === 'assembling' && base.length === 1 && base[0].source === clip(31) && base[0].time === 0 && base[0].volume === '100%' &&
    near(base[0].duration, 12.9) && audios(src).every((e) => e.track === 6 && e.source === MUSIC_URL) && !JSON.stringify(src).includes(VOICE_URL) &&
    ins.length >= 2 && ins.every((e) => e.volume === '0%') && near(card.time, 12.65) && near(src.duration, 15.15) && ev && ev.metadata.presenter === true
})
await check('6k ator ainda trabalhando segura a montagem (planos prontos esperam); nada falha', async () => {
  const r = await advance(cena({ voice: true, presenter: { status: 'submitted', image_url: url(50), request_id: 'req-a', submitted_at: new Date().toISOString() } }))
  return orderOf(r.tables).status === 'generating' && r.sources.length === 0 && r.fails.length === 0
})
await check('6l prazo do ator (45 min desde o início): desiste e o anúncio normal monta dentro do prazo do pedido (90 min)', async () => {
  const r = await advance(cena({ voice: true, agoMs: 50 * 60 * 1000, presenter: { status: 'submitted', image_url: url(50), request_id: 'req-a', submitted_at: new Date().toISOString() } }))
  const a = actor(r.tables)
  return a.status === 'failed' && a.reason === 'presenter_deadline' && r.fails.length === 0 && orderOf(r.tables).status === 'assembling' && P.ADS_V2_PRESENTER_GIVEUP_MS < 90 * 60 * 1000
})
await check('6m linha do ator faltando (o /start caiu no meio): recriada pelo plano, sem duplicar', async () => {
  const t = cena({ presenter: null, firstWorking: true })
  const r = await advance(t)
  const r2 = await advance(r.tables)
  return actorRows(r2.tables).length === 1 && actor(r2.tables).kind === 'presenter' && r2.fails.length === 0
})
await check('6n vista: o ator fica FORA da lista de planos (sem refação na tela) e ganha o próprio estado; sem ator, nenhuma chave nova', () => {
  const A = world().load(F.advance)
  const t = cena({ presenter: { status: 'failed', attempt: 2, reason_class: 'unknown' } })
  const v = A.adsV2View(t.ads_v2_orders[0], t.ads_v2_shots)
  const t2 = cena({ presenter: null })
  const v2 = A.adsV2View(t2.ads_v2_orders[0], t2.ads_v2_shots)
  return v.shots.length === PLAN.shots.length && v.shots.every((s) => s.idx !== 31) && v.presenter.state === 'skipped' && !('presenter' in v2) && JSON.stringify(Object.keys(v2)) === JSON.stringify(Object.keys(v).filter((k) => k !== 'presenter'))
})
await check('6o refação paga: o ator PRONTO do pai vai copiado; o que desistiu fica de fora; o ator não é refeito (400) (lido)', () => {
  const s = code(read(F.retake))
  return /if \(target\.kind === 'presenter'\) return v2Fail\('presenter_not_retakable', 400\)/.test(s) && ordem(s, "'video_not_retakable'", "'presenter_not_retakable'", 'adsV2RetakeCredits(') &&
    /const rows = latest\.filter\(\(r\) => r\.kind !== 'presenter' \|\| r\.status === 'done'\)\.map\(/.test(s)
})

// ═══ 7. montagem pura ════════════════════════════════════════════════════════════════════════════════════════════════
const shotsIn = PLAN.shots.map((s, i) => ({ url: s.kind === 'text' ? url(i) : clip(i), kind: s.kind, cutStart: s.cutStart, cutSeconds: s.cutSeconds, measuredSeconds: s.kind === 'text' ? null : 3.0 }))
const baseIn = { width: 1080, height: 1920, shots: shotsIn, overlays: OVERLAYS.map(({ text, start, end }) => ({ text, start, end })), fontFamily: 'Inter', cardUrl: url(9), cardSeconds: 2.5, musicUrl: MUSIC_URL, voiceUrl: VOICE_URL, voiceSeconds: 11.2 }
const order0 = P.adsV2PresenterInsertOrder(PLAN.shots.map((s) => ({ idx: s.idx, kind: s.kind, source: s.source, effect: s.effect })))
const pres = (measured, extra = {}) => M.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: measured, insertOrder: order0 }, ...extra })
await check('7a sem ator o source é o de antes (presenter ausente = null = undefined, chave por chave)', () =>
  JSON.stringify(M.buildAdV2Source(baseIn)) === JSON.stringify(M.buildAdV2Source({ ...baseIn, presenter: null })) &&
  JSON.stringify(M.buildAdV2Source(baseIn)) === JSON.stringify(M.buildAdV2Source({ ...baseIn, presenter: undefined })))
await check('7b com ator: NENHUM elemento de voz (mesmo recebendo voiceUrl) — o som é o do vídeo do ator, a 100%', () =>
  [8, 12.9, 18, 33].every((m) => { const s = pres(m); return audios(s).every((e) => e.track === 6) && !JSON.stringify(s).includes(VOICE_URL) && vids(s, 2).length === 1 && vids(s, 2)[0].volume === '100%' && vids(s, 2)[0].trim_start === 0 && vids(s, 2)[0].loop === false }))
await check('7c inserts: mudos, 1,5-2,5 s, rosto sozinho nos 2,5 s do gancho e nos 2 s antes do cartão, sem sobreposição, trecho dentro do clipe medido, nunca texto', () =>
  [8, 12.9, 15.5, 18, 28, 33].every((m) => {
    const s = pres(m)
    const main = Math.round((m - 0.25) * 1000) / 1000
    const ins = vids(s, 3)
    return ins.every((e, i) => e.volume === '0%' && e.duration >= 1.5 && e.duration <= 2.5 && e.time >= 2.5 && e.time + e.duration <= main - 2 + 1e-9 && e.trim_start + e.duration <= 3.0 + 1e-9 &&
      (i === 0 || e.time >= ins[i - 1].time + ins[i - 1].duration) && !/\.jpg$/.test(e.source))
  }) && vids(pres(12.9), 3).length >= 2 && vids(pres(28), 3).length > vids(pres(12.9), 3).length)
await check('7d cartão (logo real) entra no fim da fala com dissolve e fecha o anúncio; fundo e véu cobrem certo', () => {
  const s = pres(12.9, { tint: 'rgba(10,20,30,0.12)' })
  const card = s.elements.find((e) => e.type === 'image' && e.track === 3)
  const tint = s.elements.find((e) => e.type === 'shape' && e.track === 7)
  return card.source === url(9) && near(card.time, 12.65) && near(card.time + card.duration, s.duration) && card.enter_transition.type === 'fade' && near(tint.duration, 12.65) && s.snapshot_time === 1
})
await check('7e frases: as mesmas do plano, esticadas para a fala, sempre antes do cartão; música 18% sob a fala e 70% depois', () => {
  const s = pres(12.9)
  const t = s.elements.filter((e) => e.type === 'text')
  const mus = audios(s)
  return t.length === 2 && t.every((e) => e.time >= 0 && e.time + e.duration <= 12.65 + 1e-9) && t[0].text === 'Glow all day' &&
    mus[0].volume === M.ADS_V2_MUSIC_VOLUME_PRESENTER && M.ADS_V2_MUSIC_VOLUME_PRESENTER === '18%' && near(mus[0].duration, 13.1) && mus[1].volume === '70%'
})
await check('7f ator curto demais (< 3 s de fala) ou sem medida é RECUSADO pelo montador — e o v2Advance volta ao anúncio de sempre (lido)', () => {
  let a = false, b = false
  try { pres(3.1) } catch (e) { a = /presenter_too_short/.test(e.message) }
  try { pres(null) } catch (e) { b = /presenter_unmeasured/.test(e.message) }
  const s = code(read(F.advance))
  return a && b && /source = presenterSource \?\? buildAdV2Source\(\{/.test(s) && /presenterSource = null\n\s*presenterMiss = `presenter_montage:/.test(s)
})
await check('7g ordem dos inserts: estilo → herói → produto → lugar → gente → vídeo do cliente; cena criada e texto nunca', () => {
  const o = P.adsV2PresenterInsertOrder([
    { idx: 0, kind: 'people', source: 'client_photo' }, { idx: 1, kind: 'text', source: 'client_photo' }, { idx: 2, kind: 'place', source: 'client_photo' },
    { idx: 3, kind: 'product', source: 'client_photo' }, { idx: 4, kind: 'people', source: 'generated_scene' }, { idx: 5, kind: 'product_hero', source: 'client_photo' },
    { idx: 6, kind: 'user_video', source: 'client_photo' }, { idx: 7, kind: 'product', source: 'client_photo', effect: 'giant_product' },
  ])
  return JSON.stringify(o) === JSON.stringify([7, 5, 3, 2, 0, 6])
})

// ═══ 8. dinheiro intocado ════════════════════════════════════════════════════════════════════════════════════════════
const BILLING_SHA = 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9'
const SAMPLE_SHA = '5495f78a67a8e622c6c4ebc82e25b3f6d8d130ea7b427c0d267d06cb8c957a93'
const START_SHA = 'a6de2e638d0fcaee810d6e41bdfea94d6f79607eda14375c2b465cf289ae5059'
const START_NOW = 'shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: plan.totalSeconds, presenter: !!plan.presenter }) // KINEO-ESTILOS-PRODUTO-2026-10-09 — o plano com estilo custa o efeito · KINEO-ATOR-ANUNCIO-2026-10-09 — o ator custa a foto e o vídeo falado'
const START_OLD = 'shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source })), seconds: plan.totalSeconds })'
await check('8a v2Billing.ts e sample.ts byte a byte iguais (cobrança, estorno e amostra "adssample-" intocados)', () => sha(read(F.billing)) === BILLING_SHA && sha(read(F.sample)) === SAMPLE_SHA)
await check('8b /start: a ÚNICA mudança desde a base é a linha da estimativa em US$ (débito, trava, amostra e envio intocados)', () => sha(trocar(read(F.start), START_NOW, START_OLD)) === START_SHA)
await check('8c o ator nunca chama cobrança/estorno: v2Advance segue com 11 chamadas a failAdsV2Order e nenhuma no código do ator; v2Presenter sem import de valor', () => {
  const s = code(read(F.advance))
  const fn = (name) => (s.match(new RegExp(`async function ${name}\\([\\s\\S]*?\\n}\\n`)) || [''])[0]
  return (s.match(/failAdsV2Order\(/g) || []).length === 11 && ['retryPresenter', 'ensureAdsV2Voice', 'stepPresenter'].every((n) => fn(n).length > 50 && !/failAdsV2Order|chargeAdsV2|refund/i.test(fn(n))) &&
    !/^\s*import\s(?!type)/m.test(read(F.presenter))
})

// ═══ 9. frases, prévia, telas e páginas ══════════════════════════════════════════════════════════════════════════════
const LANGS = I.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
const FIELDS = ['title', 'line', 'badge', 'needsVoice', 'needsProduct', 'simpleNote', 'fullNote', 'planLine', 'notApplied']
const copyOk = (table) => LANGS.length === 16 && Object.keys(table).length === 16 && LANGS.every((l) => table[l] && FIELDS.every((k) => typeof table[l][k] === 'string' && table[l][k].trim().length > 0)) &&
  LANGS.filter((l) => l !== 'en').every((l) => FIELDS.every((k) => table[l][k] !== table.en[k]))
await check('9a frases do ator nas 16 línguas da interface, completas e escritas (nenhuma copiada do inglês); língua desconhecida = inglês', () =>
  copyOk(P.ADS_V2_PRESENTER_COPY) && P.adsV2PresenterCopy('xx') === P.ADS_V2_PRESENTER_COPY.en && P.adsV2PresenterCopy('pt') === P.ADS_V2_PRESENTER_COPY.pt &&
  P.ADS_V2_PRESENTER_COPY.en.title === 'Person talking about it' && P.ADS_V2_PRESENTER_COPY.en.line === 'An AI person holds your product and says your script')
await check('9b prévia do teste aprovado: public/ads-styles/presenter.mp4 (MP4 de verdade, leve) e presenter.jpg (JPEG)', () => {
  const mp4 = fs.readFileSync(path.join(ROOT, 'public', P.ADS_V2_PRESENTER_PREVIEW))
  const jpg = fs.readFileSync(path.join(ROOT, 'public', P.ADS_V2_PRESENTER_POSTER))
  return P.ADS_V2_PRESENTER_PREVIEW === '/ads-styles/presenter.mp4' && P.ADS_V2_PRESENTER_POSTER === '/ads-styles/presenter.jpg' &&
    mp4.length > 20000 && mp4.length < 600000 && mp4.subarray(4, 8).toString() === 'ftyp' && jpg.length > 5000 && jpg[0] === 0xff && jpg[1] === 0xd8
})
await check('9c componente: caixa de seleção de verdade, desligada com o motivo, prévia muda em laço; a faixa pública abre com o ator (interruptor)', () => {
  const s = read(F.comp)
  return /export function AdsPresenterToggle\(/.test(s) && /type="checkbox"/.test(s) && /disabled=\{off\}/.test(s) && /const off = !!disabled \|\| !!reason/.test(s) &&
    /<StyleLoop src=\{ADS_V2_PRESENTER_PREVIEW\} poster=\{ADS_V2_PRESENTER_POSTER\} \/>/.test(s) && /\{reason \? <span className="kst-why">\{reason\}<\/span>/.test(s) &&
    ordem(s, 'export function AdsStyleStrip()', '{ADS_V2_PRESENTER_PUBLIC ? (', 'data-kineo="ads-presenter-strip"', '{ADS_V2_STYLES.map(') && /<style dangerouslySetInnerHTML=\{\{ __html: CSS \}\} \/>/.test(s)
})
await check('9d modo simples: cartão logo depois do estilo (antes do passo 4); sem voz/com tela = motivo; ligado → 1ª foto vira produto, ator no corpo e na assinatura', () => {
  const s = code(read(F.simple))
  return ordem(s, 'name="adv2s-tier"', '<AdsStylePicker', 'name="adv2s-style"', '<AdsPresenterToggle', 'name="adv2s-presenter"', 'aria-labelledby="adv2s-s4"') &&
    /const presenterWhy: string \| null = !narrationOn \? presenterCopy\.needsVoice : photoKind === 'text' \? presenterCopy\.needsProduct : null/.test(s) &&
    /const presenterOn = ADS_V2_PRESENTER_PUBLIC && presenterChoice && presenterWhy === null/.test(s) && /const firstAsProduct = style !== 'none' && photoKind !== 'text' \|\| presenterOn/.test(s) &&
    /logo_footage_id: logo\?\.footageId \?\? null, \.\.\.\(presenterOn \? \{ presenter: true \} : \{\}\), photos: uploaded/.test(s) && /presenter: presenterOn, items:/.test(s) &&
    /const presenterCopy: AdsV2PresenterCopy = adsV2PresenterCopy\(lang\)/.test(s) && /reason=\{presenterWhy\}/.test(s) && /presenterCopy\.notApplied/.test(s)
})
await check('9e modo completo: cartão no passo 1 depois do estilo; sem voz/sem foto Product = motivo; ator no corpo e na assinatura; inglês', () => {
  const s = code(read(F.client))
  return ordem(s, 'name="adv2-tier"', '<AdsStylePicker', '<AdsPresenterToggle', 'name="adv2-presenter"', 'id="adv2-s2"') &&
    /const presenterHasProduct = photos\.some\(\(p\) => p\.kind === 'product' && !p\.video\)/.test(s) &&
    /const presenterWhy: string \| null = !narrationOn \? ADS_V2_PRESENTER_COPY\.en\.needsVoice : !presenterHasProduct \? ADS_V2_PRESENTER_COPY\.en\.needsProduct : null/.test(s) &&
    /logo_footage_id: logo\?\.footageId, \.\.\.\(presenterOn \? \{ presenter: true \} : \{\}\), photos: uploaded/.test(s) && /presenter: presenterOn,\n\s*\}\),\n\s*\[tier, composed, linkNorm, sector, logo\?\.footageId, photos, style, presenterOn\]/.test(s)
})
await check('9f /business ("Styles your ads can use") e /ads ("Styles for your product shot") mostram a faixa — que abre com o ator', () =>
  [[F.business, 'Styles your ads can use'], [F.door, 'Styles for your product shot']].every(([f, h]) => { const s = code(read(f)); return ordem(s, h, '<AdsStyleStrip />') && /import \{ AdsStyleStrip \} from '@\/components\/ads\/AdsStyles'/.test(s) }))

// ═══ 10. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, file, de, para, aindaPassa) => {
  const src = read(file)
  const m = trocar(src, de, para)
  const aplicou = m !== src && m.includes(para)
  let passa = true
  try { passa = !!(await aindaPassa({ [file]: m })) } catch { passa = false }
  ok(aplicou && !passa, `10 mutante: ${nome} fica vermelho`)
}
const montagemCom = (over) => world(over).load(F.montage)
await mutante('voz dupla (a TTS por cima do ator)', F.montage, '  // NENHUM elemento de voz: a voz é o som do ator (input.voiceUrl é ignorado de propósito — duas vozes, nunca).\n',
  "  if (input.voiceUrl) elements.push({ type: 'audio', track: 5, time: 0.3, duration: Number(input.voiceSeconds), source: input.voiceUrl, volume: '100%' })\n",
  (over) => { const Mm = montagemCom(over); const s = Mm.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: 12.9, insertOrder: order0 } }); return !JSON.stringify(s).includes(VOICE_URL) })
await mutante('ator mudo', F.montage, "    volume: '100%',\n  })\n  // Inserts", "    volume: '0%',\n  })\n  // Inserts",
  (over) => { const Mm = montagemCom(over); return vids(Mm.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: 12.9, insertOrder: order0 } }), 2)[0].volume === '100%' })
await mutante('insert com som (cortaria a fala)', F.montage, "      ...frame,\n      volume: '0%',", "      ...frame,\n      volume: '100%',",
  (over) => { const Mm = montagemCom(over); return vids(Mm.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: 12.9, insertOrder: order0 } }), 3).every((e) => e.volume === '0%') })
await mutante('insert sem o rosto final (cobre o fim da fala)', F.montage, '    if (r3(t + seconds) > r3(mainSeconds - ADS_V2_PRESENTER_TAIL)) break\n', '    if (r3(t + seconds) > r3(mainSeconds)) break\n',
  (over) => { const Mm = montagemCom(over); return [12.9, 15.5, 18].every((m) => vids(Mm.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: m, insertOrder: order0 } }), 3).every((e) => e.time + e.duration <= m - 0.25 - 2 + 1e-9)) })
await mutante('ator virando terminal (falha do ator mata o pedido)', F.advance, '  if (row.kind === ADS_V2_PRESENTER_KIND) return retryPresenter(admin, order, row)\n', '',
  async (over) => { const r = await advance(cena({ voice: true, presenter: { status: 'failed', attempt: 2, image_url: url(50), reason: 'provider_failed', reason_class: 'unknown' } }), over); return r.fails.length === 0 && orderOf(r.tables).status === 'assembling' })
await mutante('ator sem limite de tentativas', F.presenter, 'export const ADS_V2_PRESENTER_MAX_ATTEMPTS = 2', 'export const ADS_V2_PRESENTER_MAX_ATTEMPTS = 9',
  async (over) => { const r = await advance(cena({ voice: true, presenter: { status: 'failed', attempt: 2, image_url: url(50), reason: 'provider_failed', reason_class: 'unknown' } }), over); return actorRows(r.tables).length === 1 && orderOf(r.tables).status === 'assembling' })
await mutante('montagem sem esperar o ator', F.advance, '  if (actor && !READY.has(actor.status) && !adsV2PresenterGaveUp(actor)) return\n', '',
  async (over) => { const r = await advance(cena({ voice: true, presenter: { status: 'submitted', image_url: url(50), request_id: 'req-a', submitted_at: new Date().toISOString() } }), over); return orderOf(r.tables).status === 'generating' })
await mutante('vídeo do ator saindo sem a voz pronta', F.advance, ".filter((r) => r.kind !== ADS_V2_PRESENTER_KIND || adsV2PresenterVoiceReady(order))", '',
  async (over) => { const r = await advance(cena({ firstWorking: true, presenter: { status: 'image_done', image_url: url(50) } }), over, { ttsFails: true }); return actor(r.tables).status === 'image_done' && !r.submits.some((x) => x.slug === SLUG) })
await mutante('foto do ator sem a foto do produto como referência', F.advance, '  const baseRefs = actor ? [actor.productUrl] : planned?.referenceUrls ?? []', '  const baseRefs = planned?.referenceUrls ?? []',
  async (over) => { const r = await advance(cena({ firstWorking: true }), over); return r.images.length === 1 && r.images[0].referenceUrls[0] === url(1) })
await mutante('contrato aceitando ator sem foto de produto', F.contract, "  if (presenter && !photos.some((p) => p.kind === 'product')) return fail('presenter_needs_voice_and_product')\n", '',
  (over) => world(over).load(F.contract).sanitizePlanBody(PB({ presenter: true }, ['place', 'people', 'text'])).error === 'presenter_needs_voice_and_product')
await mutante('estimativa ignorando o ator', F.tiers, '  if (plan.presenter === true) {', '  if (plan.presenter === 42) {',
  (over) => { const Tm = world(over).load(F.tiers); const p = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: FOTOS }); const sh = p.shots.map((s) => ({ kind: s.kind, source: s.source })); return near(Tm.estimateAdUsd({ tier: 'photo_motion', shots: sh, seconds: 15, presenter: true }).totalUsd - Tm.estimateAdUsd({ tier: 'photo_motion', shots: sh, seconds: 15 }).totalUsd, 0.993, 0.002) })
await mutante('ator na rota dos planos', F.tiers, "  if (attempt >= ADS_V2_FALLBACK_FROM_ATTEMPT) return 'h3'\n", "  if (attempt >= ADS_V2_FALLBACK_FROM_ATTEMPT) return 'h3'\n  if (kind === 'product') return 'kling_avatar' as AdsV2Engine\n",
  (over) => { const Tm = world(over).load(F.tiers); return KINDS.every((k) => TIERS.every((t) => [1, 2].every((a) => Tm.routeShot(k, t, a) !== 'kling_avatar'))) })
await mutante('frase faltando numa língua', F.presenter, "    notApplied: 'Không có ảnh sản phẩm hoặc giọng đọc nên quảng cáo này ra không có người.',\n", '',
  (over) => copyOk(world(over).load(F.presenter).ADS_V2_PRESENTER_COPY))
await mutante('língua copiada do inglês', F.presenter, "    line: 'Uma pessoa de IA segura seu produto e fala o seu texto',", "    line: 'An AI person holds your product and says your script',",
  (over) => copyOk(world(over).load(F.presenter).ADS_V2_PRESENTER_COPY))
{
  const m = read(F.billing) + ' '
  ok(m !== read(F.billing) && sha(m) !== BILLING_SHA, '10 mutante: 1 caractere a mais em v2Billing.ts fica vermelho (impressão digital)')
}

console.log(`\ntest-ads-ator-2026-10-09: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
