// KINEO-ESTILOS-PRODUTO-2026-10-09 — guardião dos ESTILOS DE PRODUTO do anúncio v2 (Studio Ads).
// Decisão do fundador (09/10): 5 efeitos aprovados com render real, todos de fal-ai/pixverse/v5/effects. Com estilo, o
// plano-herói do produto sai pelo efeito (mesma foto, 720p, 5 s); o preço em créditos NÃO muda; sem estilo, nada muda.
// Prova, EXECUTANDO o código real pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs):
//   (1) os 5 enums da fal EXATOS e os espelhos (v2Styles = v2Contract = v2ShotLists = v2Engines = sonda), o endpoint;
//   (2) contrato: estilo da lista passa; 'none'/ausente = sem a chave (corpo de antes); desconhecido = 400 bad_style;
//   (3) planShots: só o 1º product_hero (senão o 1º product de foto) ganha o efeito, com corte que cabe no clipe de 5 s;
//       sem foto de produto o estilo some; 'none' = o plano de antes byte a byte; fotos/prompts nunca mudam;
//   (4) routeShot: pixverse_effect SÓ com estilo, só em product/product_hero, tentativas 1-2; 3ª = reserva H3;
//   (5) custo: o efeito entra na estimativa (US$ 0,20 no lugar do motor); créditos e preço de refação NÃO mudam;
//   (6) EXECUTADO contra um banco falso: linhas iniciais, envio com o enum certo ao slug certo, efeito que falha refaz e
//       cai no H3 sem matar o anúncio (inclusive 'auth_model_access' do efeito e entrada recusada), Kling sem acesso segue
//       terminal; a refação paga usa o mesmo efeito;
//   (7) dinheiro intocado: v2Billing e sample.ts idênticos (impressão digital), /start só mudou a linha da estimativa;
//   (8) frases nas 16 línguas da interface; prévias (mp4 + jpg) existem; telas e páginas (leitura);
//   (9) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
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
const near = (a, b) => Math.abs(a - b) < 1e-9

const F = {
  styles: 'lib/ads/v2Styles.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  engines: 'lib/ads/v2Engines.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  contract: 'lib/ads/v2Contract.ts',
  advance: 'lib/ads/v2Advance.ts',
  billing: 'lib/ads/v2Billing.ts',
  sample: 'lib/ads/sample.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  start: 'app/api/ads/v2/start/route.ts',
  retake: 'app/api/ads/v2/retake/route.ts',
  variations: 'app/api/ads/v2/variations/route.ts',
  probe: 'app/api/admin/effect-probe/route.ts',
  comp: 'components/ads/AdsStyles.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  business: 'app/business/page.tsx',
  door: 'app/ads/page.tsx',
  mig: 'migrations_pending/2026-10-09_ads_v2_estilos.sql',
}

const ENUMS = {
  package_explosion: 'Package Explosion',
  giant_product: 'Giant Product',
  product_closeup: 'Product close-up',
  ocean_ad: 'Ocean ad',
  mechanical_assembly: 'Mechanical Assembly',
}
const KEYS = Object.keys(ENUMS)
const SLUG = 'fal-ai/pixverse/v5/effects'

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
          const row = { id: `${name}-${++seq}`, submit_claimed_at: null, image_submit_claimed_at: null, request_id: null, image_request_id: null, reason: null, reason_class: null, fal_url: null, stored_url: null, submitted_at: null, created_at: now, ...r, updated_at: now }
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

// ── carregador: módulos reais (puros) + v2Advance com os fornecedores falsos ─────────────────────────────────────────
function world(over = {}) {
  const submits = []
  const events = []
  const fails = []
  const mocks = {
    '@/lib/compose': {}, '@/lib/lyriaMusic': {}, '@/lib/pixabayMusic': {}, '@/lib/ttsFallback': {}, '@/lib/renderAssets': {},
    '@/lib/renderProfile': {}, '@/lib/textLanguage': {}, '@/lib/ads/speakable': {}, '@/lib/ads/v2Images': {},
    '@/lib/ads/adV2Montage': {}, '@/lib/ads/v2Music': {},
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
  return { load, submits, events, fails }
}
const base = world()
const S = base.load(F.styles)
const T = base.load(F.tiers)
const E = base.load(F.engines)
const SL = base.load(F.shots)
const C = base.load(F.contract)
const I = base.load(F.iface)

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const url = (n) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${n}.jpg`
const FULL = [
  { id: U(1), url: url(1), kind: 'product' },
  { id: U(2), url: url(2), kind: 'place' },
  { id: U(3), url: url(3), kind: 'people' },
  { id: U(4), url: url(4), kind: 'product' },
  { id: U(5), url: url(5), kind: 'place' },
]
const NO_PRODUCT = FULL.map((p) => ({ ...p, kind: p.kind === 'product' ? 'place' : p.kind }))
const TIERS = ['photo_motion', 'commercial', 'cinema']
const SECTORS = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other']
const SECONDS = [15, 20, 30]

// ═══ 1. enums, espelhos, endpoint ═════════════════════════════════════════════════════════════════════════════════════
await check('1a os 5 estilos, na ordem, com o enum EXATO da fal (maiúsculas e hífen contam)', () =>
  S.ADS_V2_STYLES.length === 5 && S.ADS_V2_STYLES.every((s, i) => s.key === KEYS[i] && s.effect === ENUMS[s.key]))
await check('1b espelhos: chaves de v2Styles = v2Contract = v2ShotLists = v2Engines; enums de v2Engines = v2Styles', () =>
  JSON.stringify(S.ADS_V2_STYLE_KEYS) === JSON.stringify(KEYS) && JSON.stringify(C.ADS_V2_CONTRACT_STYLES) === JSON.stringify(KEYS) &&
  JSON.stringify(SL.ADS_V2_PLAN_STYLES) === JSON.stringify(KEYS) && JSON.stringify(Object.keys(E.ADS_V2_EFFECT_BY_STYLE)) === JSON.stringify(KEYS) &&
  KEYS.every((k) => E.ADS_V2_EFFECT_BY_STYLE[k] === ENUMS[k]))
await check('1c endpoint: v2Styles = v2Tiers = a sonda testada (PIXVERSE), e os 5 efeitos da sonda são os mesmos enums', () => {
  const probe = read(F.probe)
  return S.ADS_V2_STYLE_ENDPOINT === SLUG && T.ADS_V2_PIXVERSE_EFFECTS_SLUG === SLUG && T.ADS_V2_ENGINES.pixverse_effect.slug === SLUG &&
    probe.includes(`const PIXVERSE = '${SLUG}'`) &&
    KEYS.every((k) => probe.includes(`${k}: { model: PIXVERSE, input: (image) => ({ effect: '${ENUMS[k]}', image_url: image, resolution: '720p', duration: '5' }) }`))
})
await check('1d o builder manda SÓ { effect, image_url, resolution 720p, duration 5 } e recusa chave desconhecida/ausente', () => {
  const i = E.buildShotInput('pixverse_effect', { imageUrl: url(1), prompt: 'x y z', effect: 'ocean_ad', end_image_url: url(2) })
  const keys = Object.keys(i).sort().join(',')
  let r1 = false, r2 = false, r3 = false
  try { E.buildShotInput('pixverse_effect', { imageUrl: url(1), prompt: 'x y z' }) } catch { r1 = true }
  try { E.buildShotInput('pixverse_effect', { imageUrl: url(1), prompt: 'x y z', effect: 'Ocean ad' }) } catch { r2 = true }
  try { E.buildShotInput('pixverse_effect', { imageUrl: url(1), prompt: 'x y z', effect: 'constructor' }) } catch { r3 = true }
  return keys === 'duration,effect,image_url,resolution' && i.effect === 'Ocean ad' && i.resolution === '720p' && i.duration === '5' && r1 && r2 && r3
})
await check('1e motor no catálogo: US$ 0,04/s × 5 s = US$ 0,20 por clipe; espelho do clipe de 5 s em v2ShotLists', () =>
  T.ADS_V2_ENGINE_IDS.includes('pixverse_effect') && near(T.ADS_V2_ENGINES.pixverse_effect.usdPerSecond * T.ADS_V2_ENGINES.pixverse_effect.genSeconds, 0.2) &&
  T.ADS_V2_ENGINES.pixverse_effect.genSeconds === 5 && SL.ADS_V2_EFFECT_GEN_SECONDS === 5)
await check('1f migration (pendente) alarga o CHECK do motor com pixverse_effect, idempotente', () => {
  const sql = read(F.mig).replace(/--.*$/gm, '')
  return /drop constraint if exists ads_v2_shots_engine_check/.test(sql) && /check \(engine is null or engine in \('kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect'\)\)/.test(sql)
})

// ═══ 2. contrato ══════════════════════════════════════════════════════════════════════════════════════════════════════
const PB = (extra) => ({ order_id: U(9), sector: 'restaurant', logo_footage_id: U(8), photos: [1, 2, 3].map((n) => ({ footage_id: U(n), kind: 'product' })), ...extra })
await check('2a estilo da lista vai no valor; ausente, null e "none" = SEM a chave (corpo de antes, chave por chave)', () =>
  KEYS.every((k) => C.sanitizePlanBody(PB({ style: k })).value.style === k) &&
  [undefined, null, 'none'].every((v) => { const r = C.sanitizePlanBody(PB(v === undefined ? {} : { style: v })); return r.ok && !('style' in r.value) }) &&
  JSON.stringify(C.sanitizePlanBody(PB({ style: 'none' }))) === JSON.stringify(C.sanitizePlanBody(PB({}))))
await check('2b estilo desconhecido, com caixa trocada, o enum da fal no lugar da chave ou não-string = 400 bad_style', () =>
  ['explosion', 'Package Explosion', 'GIANT_PRODUCT', 'constructor', '', 3, true, {}, []].every((v) => C.sanitizePlanBody(PB({ style: v })).error === 'bad_style'))
await check('2c a rota /plan aplica o estilo só com o interruptor ligado e passa-o ao planShots (lido)', () => {
  const s = code(read(F.plan))
  return /const styleAsked = ADS_V2_STYLES_PUBLIC \? input\.style \?\? null : null/.test(s) && /\.\.\.\(styleAsked \? \{ style: styleAsked \} : \{\}\) \}\)/.test(s) &&
    /import \{ ADS_V2_STYLES_PUBLIC \} from '@\/lib\/ads\/v2Styles'/.test(s) && S.ADS_V2_STYLES_PUBLIC === true
})

// ═══ 3. planShots ═════════════════════════════════════════════════════════════════════════════════════════════════════
const plan = (o) => SL.planShots({ sector: 'restaurant', tier: 'photo_motion', photos: FULL, ...o })
const fx = (p) => p.shots.filter((s) => 'effect' in s)
await check('3a "none", null, desconhecido e ausente = o plano de antes, byte a byte (nem effect nem style)', () =>
  SECTORS.every((sector) => TIERS.every((tier) => SECONDS.every((seconds) => {
    const a = JSON.stringify(SL.planShots({ sector, tier, photos: FULL, seconds }))
    return ['none', null, 'xyz', undefined].every((style) => JSON.stringify(SL.planShots({ sector, tier, photos: FULL, seconds, style })) === a) && !a.includes('"effect"') && !a.includes('"style"')
  }))))
await check('3b Cinema: o efeito vai no 1º product_hero; Foto em movimento/Comercial: no 1º product de foto do cliente; só UM plano', () =>
  SECTORS.every((sector) => SECONDS.every((seconds) => KEYS.every((style) => TIERS.every((tier) => {
    const p = SL.planShots({ sector, tier, photos: FULL, seconds, style })
    const hit = fx(p)
    const want = p.shots.find((s) => s.kind === 'product_hero' && s.source === 'client_photo') ?? p.shots.find((s) => s.kind === 'product' && s.source === 'client_photo')
    if (!want) return hit.length === 0 && !('style' in p)
    return hit.length === 1 && hit[0].idx === want.idx && hit[0].effect === style && p.style === style && (tier !== 'cinema' || hit[0].kind === 'product_hero')
  })))))
await check('3c sem foto de produto o estilo é ignorado (plano idêntico ao sem estilo)', () =>
  SECTORS.every((sector) => TIERS.every((tier) => KEYS.every((style) =>
    JSON.stringify(SL.planShots({ sector, tier, photos: NO_PRODUCT, style })) === JSON.stringify(SL.planShots({ sector, tier, photos: NO_PRODUCT }))))))
await check('3d fotos, tipos, prompts, cenas e tempos NUNCA mudam com o estilo (só effect + início do corte do plano escolhido)', () =>
  SECTORS.every((sector) => TIERS.every((tier) => SECONDS.every((seconds) => {
    const a = SL.planShots({ sector, tier, photos: FULL, seconds })
    const b = SL.planShots({ sector, tier, photos: FULL, seconds, style: 'giant_product' })
    return a.shots.length === b.shots.length && a.totalSeconds === b.totalSeconds && a.shots.every((s, i) => {
      const t = b.shots[i]
      const same = s.kind === t.kind && s.source === t.source && s.sourceFootageId === t.sourceFootageId && s.prompt === t.prompt && s.scenePrompt === t.scenePrompt && s.cutSeconds === t.cutSeconds && s.movementVariant === t.movementVariant
      return same && (t.effect ? true : s.cutStart === t.cutStart)
    })
  }))))
await check('3e corte do efeito: começa em 2,0 s (a virada do efeito) e cabe no clipe de 5 s com dissolve e margem', () =>
  SECTORS.every((sector) => TIERS.every((tier) => SECONDS.every((seconds) => fx(SL.planShots({ sector, tier, photos: FULL, seconds, style: 'ocean_ad' })).every((s) =>
    s.cutStart === 2 && s.cutStart + s.cutSeconds + SL.ADS_V2_FADE_SECONDS <= T.ADS_V2_ENGINES.pixverse_effect.genSeconds - SL.ADS_V2_CUT_MARGIN + 1e-9 &&
    s.cutStart + s.cutSeconds + SL.ADS_V2_FADE_SECONDS <= T.ADS_V2_ENGINES.h3.genSeconds - SL.ADS_V2_CUT_MARGIN + 1e-9)))))
await check('3f espelho: adsV2StyleTargetIdx (v2Styles) = adsV2PlanStyleTarget (v2ShotLists) em todos os moldes', () =>
  SECTORS.every((sector) => TIERS.every((tier) => SECONDS.every((seconds) => [FULL, NO_PRODUCT].every((photos) => {
    const p = SL.planShots({ sector, tier, photos, seconds })
    return S.adsV2StyleTargetIdx(p.shots) === SL.adsV2PlanStyleTarget(p.shots)
  })))))
await check('3g o vídeo do cliente nunca recebe o efeito (user_video fica fora do alvo)', () => {
  const p = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: FULL, style: 'giant_product', videos: [{ id: U(7), url: url(7), seconds: 10, start: 1 }] })
  return fx(p).every((s) => s.kind !== 'user_video' && s.source === 'client_photo')
})

// ═══ 4. rota de motor ═════════════════════════════════════════════════════════════════════════════════════════════════
await check('4a com estilo: product/product_hero → pixverse_effect nas tentativas 1 e 2; 3ª+ = reserva H3', () =>
  ['product', 'product_hero'].every((k) => TIERS.every((t) => T.routeShot(k, t, 1, true) === 'pixverse_effect' && T.routeShot(k, t, 2, true) === 'pixverse_effect' && T.routeShot(k, t, 3, true) === 'h3')))
await check('4b sem estilo (ou estilo em outro tipo) a rota é a de antes; texto e vídeo do cliente nunca vão à IA', () =>
  TIERS.every((t) => [1, 2, 3].every((a) => ['people', 'place', 'product', 'product_hero'].every((k) => T.routeShot(k, t, a) === T.routeShot(k, t, a, false)) &&
    T.routeShot('people', t, a, true) === T.routeShot('people', t, a) && T.routeShot('place', t, a, true) === T.routeShot('place', t, a) &&
    T.routeShot('text', t, a, true) === null && T.routeShot('user_video', t, a, true) === null)) && T.routeShot('product_hero', 'cinema', 1) === 'seedance_20_fast')

// ═══ 5. custo e créditos ═══════════════════════════════════════════════════════════════════════════════════════════════
const est = (tier, style, seconds = 15) => { const p = SL.planShots({ sector: 'restaurant', tier, photos: FULL, seconds, style }); return T.estimateAdUsd({ tier, shots: p.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })) }) }
const perto = (a, b) => Math.abs(a - b) < 0.0015
await check('5a a estimativa troca o motor do plano pelo efeito: −Kling 0,336 +0,20 (Foto/Comercial) e −Seedance 0,9676 +0,20 (Cinema)', () =>
  perto(est('photo_motion', 'giant_product').videoUsd, est('photo_motion').videoUsd - 0.336 + 0.2) &&
  perto(est('commercial', 'giant_product').videoUsd, est('commercial').videoUsd - 0.336 + 0.2) &&
  perto(est('cinema', 'giant_product').videoUsd, est('cinema').videoUsd - 0.9676 + 0.2) &&
  est('cinema', 'giant_product').aiShots === est('cinema').aiShots)
await check('5b sem estilo, a estimativa é a da especificação (2,266 · 2,716 · 4,465)', () =>
  near(est('photo_motion').totalUsd, 2.266) && near(est('commercial').totalUsd, 2.716) && Math.abs(est('cinema').totalUsd - 4.465) < 0.01)
await check('5c créditos do anúncio NÃO dependem do estilo (34/41/51 por 15 s) e a refação custa o mesmo com ou sem estilo', () =>
  T.adsV2Credits('photo_motion', 15) === 34 && T.adsV2Credits('commercial', 15) === 41 && T.adsV2Credits('cinema', 15) === 51 &&
  T.adsV2Credits.length === 2 && T.adsV2RetakeCredits('product_hero', 'cinema') === 12 && T.adsV2RetakeCredits('product', 'photo_motion') === 5 &&
  /export function adsV2RetakeCredits\(kind: AdsV2ShotKind, tier: AdsV2Tier\): number \{\n  const engine = routeShot\(kind, tier, 1\)\n/.test(code(read(F.tiers))))
await check('5d plan/start/variations passam o estilo à estimativa; o preço em créditos segue adsV2Credits(tier, segundos)', () =>
  [F.plan, F.start, F.variations].every((f) => /source: s\.source, styled: !!s\.effect \}\)\)/.test(read(f))) &&
  /const credits = adsV2Credits\(order\.tier, order\.seconds\)/.test(read(F.plan)))

// ═══ 6. execução contra o banco falso ═════════════════════════════════════════════════════════════════════════════════
const ORDER = '11111111-1111-4111-8111-111111111111'
const PROMPT = 'Slow push in on the product. Keep everything exactly as in the photo.'
function scenario({ effect = 'giant_product', engine = 'pixverse_effect', reasonClass = 'unknown', status = 'failed', attempt = 1, kind = 'product' } = {}) {
  const now = new Date().toISOString()
  const shots = [
    { idx: 0, kind: 'people', source: 'client_photo', role: 'hook', cutStart: 0.65, cutSeconds: 2, prompt: PROMPT, movementVariant: 0, sourceFootageId: U(3), imageUrl: url(3) },
    { idx: 1, kind, source: 'client_photo', role: 'product', cutStart: 2, cutSeconds: 2, prompt: PROMPT, movementVariant: 0, sourceFootageId: U(1), imageUrl: url(1), ...(effect ? { effect } : {}) },
  ]
  return {
    ads_v2_orders: [{ id: ORDER, user_id: U(99), status: 'generating', tier: 'photo_motion', seconds: 15, brief: null, plan: { shots, ...(effect ? { style: effect } : {}) }, started_at: now, billing_ref: `adsv2-${ORDER}-x`, credits_charged: 34, card_url: url(9), parent_order_id: null }],
    ads_v2_shots: [
      { id: 's0', order_id: ORDER, idx: 0, attempt: 1, role: 'hook', kind: 'people', source: 'client_photo', image_url: url(3), engine: 'kling_o3', prompt: PROMPT, status: 'done', stored_url: url(30), cut_start: 0.65, cut_seconds: 2, movement_variant: 0, created_at: now, updated_at: now },
      { id: 's1', order_id: ORDER, idx: 1, attempt, role: 'product', kind, source: 'client_photo', image_url: url(1), engine, prompt: PROMPT, status, reason: status === 'failed' ? 'provider_failed' : null, reason_class: status === 'failed' ? reasonClass : null, cut_start: 2, cut_seconds: 2, movement_variant: 0, submit_claimed_at: null, created_at: now, updated_at: now },
    ],
  }
}
async function advance(tables, over = {}) {
  const w = world(over)
  const A = w.load(F.advance)
  const db = fakeDb(tables)
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: Date.now() + 60_000 })
  return { ...w, A, tables }
}
const latest = (tables, idx) => tables.ads_v2_shots.filter((r) => r.idx === idx).sort((a, b) => b.attempt - a.attempt)[0]
const orderOf = (tables) => tables.ads_v2_orders[0]

await check('6a linhas iniciais: o plano com effect nasce no pixverse_effect (gen 5 s); os outros e o plano sem estilo como antes', () => {
  const A = world().load(F.advance)
  const p = SL.planShots({ sector: 'restaurant', tier: 'cinema', photos: FULL, style: 'package_explosion' })
  const q = SL.planShots({ sector: 'restaurant', tier: 'cinema', photos: FULL })
  const a = A.buildInitialShotRows(ORDER, 'cinema', p)
  const b = A.buildInitialShotRows(ORDER, 'cinema', q)
  const i = p.shots.findIndex((s) => s.effect)
  return i >= 0 && a[i].engine === 'pixverse_effect' && a[i].gen_seconds === 5 && a[i].cut_start === 2 && a[i].prompt === p.shots[i].prompt &&
    b[i].engine === 'seedance_20_fast' && a.every((r, k) => k === i || JSON.stringify(r) === JSON.stringify(b[k]))
})
await check('6b efeito que falhou (fornecedor) refaz SEM cobrar no MESMO efeito, com o enum certo no slug certo; o anúncio segue', async () => {
  const r = await advance(scenario())
  const n = latest(r.tables, 1)
  const sub = r.submits[0]
  return n.attempt === 2 && n.engine === 'pixverse_effect' && n.status === 'submitted' && r.fails.length === 0 && orderOf(r.tables).status === 'generating' &&
    r.submits.length === 1 && sub.slug === SLUG && JSON.stringify(sub.input) === JSON.stringify({ effect: 'Giant Product', image_url: url(1), resolution: '720p', duration: '5' }) &&
    r.events.some((e) => e.name === 'ads_v2_shot_retried' && e.metadata.engine === 'pixverse_effect' && e.metadata.charged === false)
})
await check('6c efeito que falhou 2 vezes cai na RESERVA H3 (mesma foto, prompt de movimento normal); a 3ª falha é o terminal de sempre', async () => {
  const r = await advance(scenario({ attempt: 2 }))
  const n = latest(r.tables, 1)
  const ok1 = n.attempt === 3 && n.engine === 'h3' && n.status === 'submitted' && r.fails.length === 0 && r.submits[0].slug === T.ADS_V2_ENGINES.h3.slug &&
    r.submits[0].input.prompt === PROMPT && r.submits[0].input.image_url === url(1) && !('effect' in r.submits[0].input)
  const r2 = await advance(scenario({ attempt: 3, engine: 'h3' }))
  return ok1 && r2.fails.length === 1 && /^shot_1_exhausted/.test(r2.fails[0])
})
await check('6d efeito SEM ACESSO (auth_model_access) não mata o anúncio: pula direto para a reserva H3', async () => {
  const r = await advance(scenario({ reasonClass: 'auth_model_access' }))
  const n = latest(r.tables, 1)
  return n.attempt === 3 && n.engine === 'h3' && r.fails.length === 0 && orderOf(r.tables).status === 'generating'
})
await check('6e Kling sem acesso continua TERMINAL (a exceção é só do efeito); saldo da fal no efeito também é terminal', async () => {
  const r = await advance(scenario({ effect: null, engine: 'kling_o3', reasonClass: 'auth_model_access' }))
  const r2 = await advance(scenario({ reasonClass: 'balance_quota' }))
  return r.fails.length === 1 && r.fails[0] === 'shot_1_auth_model_access' && r2.fails.length === 1 && r2.fails[0] === 'shot_1_balance_quota'
})
await check('6f entrada do efeito recusada aqui (plano sem a chave) = invalid_payload → refação no motor normal, anúncio vivo', async () => {
  const t = scenario({ effect: null, engine: 'pixverse_effect', status: 'pending' })
  const r = await advance(t)
  const failed = latest(r.tables, 1)
  const okFail = failed.status === 'failed' && failed.reason_class === 'invalid_payload' && r.submits.length === 0
  const r2 = await advance(r.tables)
  const n = latest(r2.tables, 1)
  return okFail && n.attempt === 2 && n.engine === 'kling_o3' && r2.fails.length === 0 && r2.submits.length === 1
})
await check('6g refação paga: o herói com estilo é refeito no MESMO efeito (rota lê o plano do pai); preço = adsV2RetakeCredits sem estilo', () => {
  const s = code(read(F.retake))
  return /const engine = routeShot\(target\.kind, parent\.tier, 1, adsV2ShotEffect\(parent\.plan, idx\) !== null\)/.test(s) &&
    /const price = adsV2RetakeCredits\(target\.kind, parent\.tier\)/.test(s) && /plan: parent\.plan,/.test(s)
})
await check('6h adsV2ShotEffect lê só chave válida do plano (inválida/ausente = null)', () => {
  const A = world().load(F.advance)
  return A.adsV2ShotEffect({ shots: [{ idx: 2, effect: 'ocean_ad' }] }, 2) === 'ocean_ad' && A.adsV2ShotEffect({ shots: [{ idx: 2, effect: 'Ocean ad' }] }, 2) === null &&
    A.adsV2ShotEffect({ shots: [{ idx: 2 }] }, 2) === null && A.adsV2ShotEffect(null, 2) === null
})

// ═══ 7. dinheiro intocado ═════════════════════════════════════════════════════════════════════════════════════════════
const BILLING_SHA = 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9'
const SAMPLE_SHA = '5495f78a67a8e622c6c4ebc82e25b3f6d8d130ea7b427c0d267d06cb8c957a93'
const START_SHA = 'a6de2e638d0fcaee810d6e41bdfea94d6f79607eda14375c2b465cf289ae5059'
// KINEO-ATOR-ANUNCIO-2026-10-09 — re-ancorado: a MESMA linha da estimativa ganhou o ator (presenter: !!plan.presenter); o resto
// do /start segue byte a byte igual à base (mesma impressão digital START_SHA).
const START_NEW = 'shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: plan.totalSeconds, presenter: !!plan.presenter }) // KINEO-ESTILOS-PRODUTO-2026-10-09 — o plano com estilo custa o efeito · KINEO-ATOR-ANUNCIO-2026-10-09 — o ator custa a foto e o vídeo falado'
const START_OLD = 'shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source })), seconds: plan.totalSeconds })'
await check('7a v2Billing.ts e sample.ts byte a byte iguais à base c17771fe (cobrança, estorno, amostra "adssample-")', () =>
  sha(read(F.billing)) === BILLING_SHA && sha(read(F.sample)) === SAMPLE_SHA)
await check('7b /start: a ÚNICA mudança é a linha da estimativa em US$ (débito, trava, amostra e envio intocados)', () =>
  sha(trocar(read(F.start), START_NEW, START_OLD)) === START_SHA)

// ═══ 8. frases, prévias, telas e páginas ══════════════════════════════════════════════════════════════════════════════
const LANGS = I.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
const strs = (c) => [c.title, c.hint, c.target, c.targetSimple, c.noProduct, c.suggested, c.autoLabel, c.autoBestFor, ...KEYS.flatMap((k) => [c.styles[k]?.label, c.styles[k]?.bestFor])]
const copyOk = (table) => LANGS.length === 16 && LANGS.every((l) => table[l] && strs(table[l]).every((x) => typeof x === 'string' && x.trim().length > 0)) &&
  LANGS.filter((l) => l !== 'en').every((l) => ['hint', 'target', 'targetSimple', 'noProduct', 'autoBestFor'].every((k) => table[l][k] !== table.en[k]) && KEYS.every((k) => table[l].styles[k].bestFor !== table.en.styles[k].bestFor)) &&
  Object.keys(table).length === 16
await check('8a frases da escolha de estilo nas 16 línguas da interface, completas e escritas (não copiadas do inglês)', () => copyOk(S.ADS_V2_STYLE_COPY) && S.adsV2StyleCopy('xx') === S.ADS_V2_STYLE_COPY.en && S.adsV2StyleCopy('pt') === S.ADS_V2_STYLE_COPY.pt)
await check('8b prévias feitas pelo efeito existem: public/ads-styles/<chave>.mp4 (MP4 de verdade) e .jpg (JPEG de verdade)', () =>
  S.ADS_V2_STYLES.every((s) => {
    const mp4 = fs.readFileSync(path.join(ROOT, 'public', s.preview))
    const jpg = fs.readFileSync(path.join(ROOT, 'public', s.poster))
    return s.preview === `/ads-styles/${s.key}.mp4` && s.poster === `/ads-styles/${s.key}.jpg` && mp4.length > 20000 && mp4.subarray(4, 8).toString() === 'ftyp' && jpg.length > 5000 && jpg[0] === 0xff && jpg[1] === 0xd8
  }))
await check('8c sugestão por setor: restaurante → explosão; salão/clínica → close; loja/academia/other → gigante; imóvel/app/desconhecido → nenhum', () =>
  S.adsV2SuggestedStyle('restaurant') === 'package_explosion' && S.adsV2SuggestedStyle('salon') === 'product_closeup' && S.adsV2SuggestedStyle('clinic') === 'product_closeup' &&
  ['store', 'gym', 'other'].every((s) => S.adsV2SuggestedStyle(s) === 'giant_product') && ['real_estate', 'app_service', null, undefined, 'xyz'].every((s) => S.adsV2SuggestedStyle(s) === 'none'))
await check('8d componente: vídeo mudo em laço com pôster, playsInline, preload metadata, aria-hidden; fileira com rolagem e encaixe e min-width 0', () => {
  const s = read(F.comp)
  return /^'use client'/.test(s) && /<video ref=\{ref\} src=\{src\} poster=\{poster\} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex=\{-1\} \/>/.test(s) &&
    /\.kst-row\{[^}]*min-width:0[^}]*overflow-x:auto[^}]*scroll-snap-type:x mandatory/.test(s) && /\.kst-strip\{[^}]*min-width:0[^}]*overflow-x:auto/.test(s) &&
    /prefers-reduced-motion: reduce/.test(s) && /type="radio"/.test(s) && /<style dangerouslySetInnerHTML=\{\{ __html: CSS \}\} \/>/.test(s) && !/#[0-9a-f]{6}/i.test(s.replace('#fff', ''))
})
await check('8e modo simples: escolha perto do nível, sugestão só com setor reconhecido, 1ª foto vira produto (nunca tela), estilo no corpo e na assinatura', () => {
  const s = code(read(F.simple))
  return ordem(s, 'name="adv2s-tier"', '<AdsStylePicker', 'name="adv2s-style"', 'aria-labelledby="adv2s-s4"') &&
    /const styleSuggested: AdsV2StyleChoice = sentence && sector !== 'other' \? adsV2SuggestedStyle\(sector\) : 'none'/.test(s) &&
    /const firstAsProduct = style !== 'none' && photoKind !== 'text'/.test(s) && /kind: firstAsProduct && out\.length === 0 \? 'product' : photoKind/.test(s) &&
    /facts: chosen, \.\.\.\(style !== 'none' \? \{ style \} : \{\}\) \}/.test(s) && /items: inAd\.map\(\(p\) => \[p\.key, focalSig\(p\)\]\), style \}\)/.test(s) &&
    /\{ADS_V2_STYLES_PUBLIC \? \(/.test(s) && /copy=\{styleCopy\}/.test(s) && /const styleCopy: AdsV2StyleCopy = adsV2StyleCopy\(lang\)/.test(s)
})
await check('8f modo completo: escolha no passo do nível, sugestão pelo setor escolhido, estilo no corpo e na assinatura, inglês', () => {
  const s = code(read(F.client))
  return ordem(s, 'name="adv2-tier"', '<AdsStylePicker', 'name="adv2-style"', 'copy={ADS_V2_STYLE_COPY.en}') &&
    /const styleSuggested: AdsV2StyleChoice = sector \? adsV2SuggestedStyle\(sector\) : 'none'/.test(s) &&
    /card_footage_id: cardDone\.footageId, \.\.\.\(style !== 'none' \? \{ style \} : \{\}\) \}/.test(s) &&
    // KINEO-ATOR-ANUNCIO-2026-10-09 — re-ancorado: a assinatura do plano ganhou o ator no fim (presenterOn); o estilo continua nela.
    /\[tier, composed, linkNorm, sector, logo\?\.footageId, photos, style, presenterOn\]/.test(s)
})
await check('8g /business: "Styles your ads can use" logo depois dos 3 passos do herói e antes do plano; /ads: depois de "How it works"', () => {
  const b = code(read(F.business))
  const d = code(read(F.door))
  return ordem(b, '{STEPS.map(', 'Styles your ads can use', 'Pick a style for your product shot', '<AdsStyleStrip />', 'id="plan"') &&
    ordem(d, 'id="ads-how"', 'aria-labelledby="ads-styles"', 'Pick a style for your product shot', '<AdsStyleStrip />', 'id="ads-levels"') &&
    /\{ADS_V2_STYLES_PUBLIC \? \(/.test(b) && /\{ADS_V2_STYLES_PUBLIC \? \(/.test(d) && /\{ADS_V2_STYLES\.length\} effects/.test(b) && /\{ADS_V2_STYLES\.length\} effects/.test(d)
})

// ═══ 9. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, file, de, para, aindaPassa) => {
  const src = read(file)
  const m = trocar(src, de, para)
  const aplicou = m !== src && m.includes(para)
  let passa = true
  try { passa = !!(await aindaPassa({ [file]: m })) } catch { passa = false }
  ok(aplicou && !passa, `9 mutante: ${nome} fica vermelho`)
}
const heroRoutes = (over) => { const Tm = world(over).load(F.tiers); return Tm.routeShot('product_hero', 'cinema', 1, true) === 'pixverse_effect' && Tm.routeShot('product', 'commercial', 2, true) === 'pixverse_effect' }
await mutante('rota sem o ramo do estilo', F.tiers, "  if (styled === true && (kind === 'product' || kind === 'product_hero')) return 'pixverse_effect'\n", '', heroRoutes)
await mutante('estilo pegando a 3ª tentativa (sem reserva H3)', F.tiers, "  if (attempt >= ADS_V2_FALLBACK_FROM_ATTEMPT) return 'h3'\n  if (styled === true", "  if (styled === true && attempt < 9 && (kind === 'product' || kind === 'product_hero')) return 'pixverse_effect'\n  if (attempt >= ADS_V2_FALLBACK_FROM_ATTEMPT) return 'h3'\n  if (styled === true",
  (over) => { const Tm = world(over).load(F.tiers); return Tm.routeShot('product', 'photo_motion', 3, true) === 'h3' })
await mutante('contrato aceitando estilo desconhecido', F.contract, "    if (typeof b.style !== 'string' || !(ADS_V2_CONTRACT_STYLES as readonly string[]).includes(b.style)) return fail('bad_style')\n", '',
  (over) => world(over).load(F.contract).sanitizePlanBody(PB({ style: 'explosion' })).error === 'bad_style')
await mutante('enum da fal com a caixa trocada no builder', F.engines, "  package_explosion: 'Package Explosion',", "  package_explosion: 'Package explosion',",
  (over) => { const Em = world(over).load(F.engines); return KEYS.every((k) => Em.ADS_V2_EFFECT_BY_STYLE[k] === ENUMS[k]) && Em.buildShotInput('pixverse_effect', { imageUrl: url(1), prompt: 'abc', effect: 'package_explosion' }).effect === 'Package Explosion' })
await mutante('estimativa ignorando o estilo', F.tiers, 'routeShot(shot.kind, plan.tier, shot.attempt ?? 1, shot.styled === true)', 'routeShot(shot.kind, plan.tier, shot.attempt ?? 1)',
  (over) => { const Tm = world(over).load(F.tiers); const p = SL.planShots({ sector: 'restaurant', tier: 'photo_motion', photos: FULL, style: 'giant_product' }); const a = Tm.estimateAdUsd({ tier: 'photo_motion', shots: p.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })) }); return perto(a.videoUsd, est('photo_motion').videoUsd - 0.336 + 0.2) })
await mutante('refação cobrando pelo motor do efeito', F.tiers, '  const engine = routeShot(kind, tier, 1)\n  return engine ? ADS_V2_RETAKE_CREDITS[engine] : 0', '  const engine = routeShot(kind, tier, 1, true)\n  return engine ? ADS_V2_RETAKE_CREDITS[engine] : 0',
  (over) => world(over).load(F.tiers).adsV2RetakeCredits('product_hero', 'cinema') === 12)
await mutante('efeito no 1º plano qualquer (não no de produto)', F.shots, '  const target = style ? adsV2PlanStyleTarget(shots) : null', '  const target = style ? 0 : null',
  (over) => { const SLm = world(over).load(F.shots); const p = SLm.planShots({ sector: 'clinic', tier: 'photo_motion', photos: FULL, style: 'giant_product' }); const want = SL.adsV2PlanStyleTarget(p.shots); return p.shots.filter((s) => s.effect).every((s) => s.idx === want) })
await mutante('corte do efeito começando no quadro parado (0 s)', F.shots, 'export const ADS_V2_CUT_START_EFFECT = 2.0', 'export const ADS_V2_CUT_START_EFFECT = 0',
  (over) => fx(world(over).load(F.shots).planShots({ sector: 'store', tier: 'photo_motion', photos: FULL, style: 'ocean_ad' })).every((s) => s.cutStart === 2))
await mutante('efeito sem acesso voltando a matar o anúncio', F.advance, ' && !effectAccess) return', ') return',
  async (over) => { const r = await advance(scenario({ reasonClass: 'auth_model_access' }), over); return r.fails.length === 0 })
await mutante('entrada recusada do efeito voltando a ser terminal', F.advance, "engine === 'pixverse_effect' ? 'invalid_payload' : 'local_policy_gate'", "'local_policy_gate'",
  async (over) => { const r = await advance(scenario({ effect: null, engine: 'pixverse_effect', status: 'pending' }), over); const r2 = await advance(r.tables, over); return r2.fails.length === 0 })
await mutante('refação automática perdendo o estilo do plano', F.advance, 'routeShot(row.kind, order.tier, attempt, adsV2ShotEffect(order.plan, row.idx) !== null)', 'routeShot(row.kind, order.tier, attempt)',
  async (over) => { const r = await advance(scenario(), over); return latest(r.tables, 1).engine === 'pixverse_effect' })
await mutante('envio sem a chave do estilo', F.advance, ', effect: adsV2ShotEffect(order.plan, row.idx) })', ' })',
  async (over) => { const r = await advance(scenario(), over); return r.submits.length === 1 && r.submits[0].input.effect === 'Giant Product' })
await mutante('frase faltando numa língua', F.styles, "    noProduct: 'Quảng cáo này không có ảnh sản phẩm nên sẽ ra không có hiệu ứng.',\n", '',
  (over) => copyOk(world(over).load(F.styles).ADS_V2_STYLE_COPY))
await mutante('língua copiada do inglês', F.styles, "    hint: 'Efek untuk adegan produkmu. Sudah termasuk harga.',", "    hint: 'An effect for your product shot. Included in the price.',",
  (over) => copyOk(world(over).load(F.styles).ADS_V2_STYLE_COPY))
{
  const m = read(F.billing) + ' '
  ok(m !== read(F.billing) && sha(m) !== BILLING_SHA, '9 mutante: 1 caractere a mais em v2Billing.ts fica vermelho (impressão digital)')
}
{
  const m = trocar(read(F.business), '<AdsStyleStrip />', '')
  ok(!m.includes('<AdsStyleStrip />') && !ordem(code(m), '{STEPS.map(', 'Styles your ads can use', 'Pick a style for your product shot', '<AdsStyleStrip />', 'id="plan"'), '9 mutante: /business sem a faixa de estilos fica vermelho')
}

console.log(`\ntest-ads-estilos-2026-10-09: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
