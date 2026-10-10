// KINEO-ADS-UX-MARCA-2026-10-10 — guardião da tela nova do anúncio (/ads/v2, modo simples) + KIT DA MARCA + 15 estilos.
// Fundador, 10/10: "mais bonito, mais inteligente, mais interativo, mais fácil de mexer" (como Higgsfield/Creatify/PixVerse)
// e "coloca 15 estilos dos mais usados". Prova, EXECUTANDO o código real pelo carregador offline da casa:
//   (1) lib pura: só importa tipos + v2Tiers + v2Screen (puras, sem import);
//   (2) linha de custo da prévia = adsV2Credits(nível, 15) em todo nível (o MESMO número que o /start debita); amostra 0;
//       3 variações = o preço do grupo que a tela passa; "falta" certo; nível padrão pelo saldo (nunca o Premium sozinho);
//   (3) enquadramento: a janela 9:16 anda com o dedo dentro do contrato de sempre (cropRect); reordenar;
//   (4) kit da marca: corpo só com as 5 chaves (user_id do corpo = 400), cor/uuid/teto; preenche SÓ campo vazio;
//   (5) rota /api/ads/brand-kit EXECUTADA contra um banco falso: 401 sem login, 403 sem acesso, GET devolve só o kit DA
//       SESSÃO (nunca o de outra conta), logo só se for imagem do user_footage do dono, PUT grava com o user_id da sessão,
//       logo de outra conta = 400, tabela ausente = GET ready:false / PUT 503, nunca toca profiles/pedidos/eventos;
//   (6) dinheiro intocado: /start, /orders, /plan, /research, /variations, /retake, /link-import, v2Billing, sample e
//       v2Tiers byte a byte iguais à base aeef024f (impressão digital); na tela, 1 só chamada ao /start (no botão), o kit
//       só é gravado DEPOIS do /start aceito; corpos de /orders e /plan iguais;
//   (7) 16 línguas completas (nada cai no inglês) com os marcadores {n}/{s}/{tier}/{c}/{lang};
//   (8) 15 estilos: os enums EXATOS da fal, espelhos, prévias mp4+jpg de verdade, categorias e frases;
//   (9) tela e invólucro (leitura); migração idempotente com RLS e sem policy;
//  (10) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo da casa: readFileSync + ts.transpileModule (offline-ts-loader). Nenhum import com alias @/ no guardião.
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
const bloco = (src, inicio) => { const i = src.indexOf(inicio); if (i < 0) return ''; let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1) } } return '' }

const F = {
  ux: 'lib/ads/v2SimpleUx.ts',
  uxTsx: 'app/(dashboard)/ads/v2/AdsV2SimpleUx.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  route: 'app/api/ads/brand-kit/route.ts',
  styles: 'lib/ads/v2Styles.ts',
  contract: 'lib/ads/v2Contract.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  engines: 'lib/ads/v2Engines.ts',
  comp: 'components/ads/AdsStyles.tsx',
  tiers: 'lib/ads/v2Tiers.ts',
  screen: 'lib/ads/v2Screen.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  mig: 'migrations_pending/2026-10-10_brand_kit.sql',
  probe: 'app/api/admin/effect-probe/route.ts',
}

const pura = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const L = pura()
const U = L(F.ux)
const T = L(F.tiers)
const SC = L(F.screen)
const S = L(F.styles)
const I = L(F.iface)
const TIERS = ['photo_motion', 'commercial', 'cinema']
const LANGS = I.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)

// ═══ 1. lib pura ══════════════════════════════════════════════════════════════════════════════════════════════════════
await check('1a v2SimpleUx só importa tipos + v2Tiers + v2Screen, e as duas não importam nada', () => {
  const imps = [...read(F.ux).matchAll(/^import\s(?!type)[\s\S]*?from '([^']+)'/gm)].map((m) => m[1])
  return imps.length === 2 && imps.includes('@/lib/ads/v2Tiers') && imps.includes('@/lib/ads/v2Screen') &&
    !/^\s*import\s/m.test(read(F.tiers)) && !/^\s*import\s/m.test(read(F.screen)) && !/fetch\(|createClient|process\.env/.test(code(read(F.ux)))
})

// ═══ 2. custo e nível padrão ═════════════════════════════════════════════════════════════════════════════════════════
const custoOk = (Ux) => TIERS.every((t) => [null, 0, 10, 34, 40, 41, 51, 500].every((b) => {
  const c = Ux.adsV2CostLine({ tier: t, balance: b })
  const want = T.adsV2Credits(t, 15)
  return c.seconds === 15 && c.credits === want && c.short === (b === null ? 0 : Math.max(0, want - b))
})) && Ux.adsV2CostLine({ tier: null, balance: 10 }).credits === null &&
  TIERS.every((t) => Ux.adsV2CostLine({ tier: t, balance: 0, sample: true }).credits === 0 && Ux.adsV2CostLine({ tier: t, balance: 0, sample: true }).short === 0) &&
  Ux.adsV2CostLine({ tier: 'commercial', balance: 100, group: 111 }).credits === 111 && Ux.adsV2CostLine({ tier: 'commercial', balance: 100, group: 111 }).short === 11
await check('2a linha de custo = adsV2Credits(nível, 15) em todo nível e saldo (o MESMO do débito); amostra 0; grupo das 3 variações; falta certa', () => custoOk(U) && SC.ADS_V2_SCREEN_SECONDS === 15)
await check('2b nível padrão: recomendado (Commercial) se o saldo paga; senão o Standard; saldo desconhecido = nenhum; NUNCA o Premium sozinho', () =>
  U.ADS_V2_RECOMMENDED_TIER === 'commercial' && U.adsV2DefaultTier(null) === null && U.adsV2DefaultTier(undefined) === null && U.adsV2DefaultTier(NaN) === null &&
  U.adsV2DefaultTier(T.adsV2Credits('commercial', 15)) === 'commercial' && U.adsV2DefaultTier(10_000) === 'commercial' &&
  U.adsV2DefaultTier(T.adsV2Credits('commercial', 15) - 1) === 'photo_motion' && U.adsV2DefaultTier(0) === 'photo_motion' &&
  [0, 5, 34, 40, 41, 51, 99999].every((b) => U.adsV2DefaultTier(b) !== 'cinema'))
await check('2c o que cada nível inclui vem de ADS_V2_TIERS (nada digitado); entrega estimada 10–15 min', () =>
  TIERS.every((t) => { const i = U.adsV2TierIncludes(t); const s = T.ADS_V2_TIERS[t]; return i.shots === s.shots && i.scenes === s.generatedScenes && i.closeups === s.heroCloseups }) &&
  U.ADS_V2_DELIVERY_MINUTES.min === 10 && U.ADS_V2_DELIVERY_MINUTES.max === 15)

// ═══ 3. enquadramento e ordem ════════════════════════════════════════════════════════════════════════════════════════
await check('3a a janela 9:16 anda COM o dedo dentro do cropRect de sempre (largo: só x; alto: só y; 9:16: não mexe); sem zoom', () => {
  const wide = { w: 1600, h: 900 }
  const disp = { w: 400, h: 225 }
  const r = SC.cropRect(wide.w, wide.h, 0.5, 0.5)
  const spare = (wide.w - r.sw) * (disp.w / wide.w)
  const a = U.adsV2MoveCropWindow({ fx: 0.5, fy: 0.5 }, { dx: spare / 2, dy: 50 }, disp, wide)
  const b = U.adsV2MoveCropWindow({ fx: 0.5, fy: 0.5 }, { dx: -9999, dy: 0 }, disp, wide)
  const tall = U.adsV2MoveCropWindow({ fx: 0.5, fy: 0.5 }, { dx: 80, dy: 40 }, { w: 200, h: 600 }, { w: 1000, h: 3000 })
  const same = U.adsV2MoveCropWindow({ fx: 0.3, fy: 0.7 }, { dx: 80, dy: 80 }, { w: 90, h: 160 }, { w: 1080, h: 1920 })
  const pct = U.adsV2CropWindowPct(wide, 1, 0.5)
  return Math.abs(a.fx - 1) < 1e-9 && a.fy === 0.5 && b.fx === 0 && tall.fx === 0.5 && tall.fy > 0.5 && same.fx === 0.3 && same.fy === 0.7 &&
    Math.abs(pct.left + pct.width - 100) < 0.02 && pct.top === 0 && pct.height === 100 && !/scale|zoom/i.test(code(bloco(read(F.ux), 'export function adsV2MoveCropWindow(')))
})
await check('3b reordenar: move de i para j sem perder nem duplicar; fora da faixa = a mesma lista', () => {
  const l = ['a', 'b', 'c', 'd']
  return JSON.stringify(U.adsV2MoveTo(l, 3, 0)) === '["d","a","b","c"]' && JSON.stringify(U.adsV2MoveTo(l, 0, 2)) === '["b","c","a","d"]' &&
    JSON.stringify(U.adsV2MoveTo(l, -1, 2)) === JSON.stringify(l) && JSON.stringify(U.adsV2MoveTo(l, 1, 9)) === JSON.stringify(l) && JSON.stringify(l) === '["a","b","c","d"]'
})

// ═══ 4. kit da marca (puro) ══════════════════════════════════════════════════════════════════════════════════════════
const LOGO = '11111111-2222-4333-8444-555555555555'
const kitPuroOk = (Ux) => {
  const good = Ux.sanitizeBrandKit({ logo_footage_id: LOGO.toUpperCase(), color: '#E11D48', business: '  Lume\u0007  Skincare ', price: '$29', contact: null })
  return good.ok && good.value.logo_footage_id === LOGO && good.value.color === '#e11d48' && good.value.business === 'Lume Skincare' && good.value.contact === null &&
    Ux.sanitizeBrandKit({ user_id: 'x', color: '#000000' }).error === 'bad_field' && Ux.sanitizeBrandKit({ color: 'red' }).error === 'bad_color' &&
    Ux.sanitizeBrandKit({ logo_footage_id: '../x' }).error === 'bad_logo' && Ux.sanitizeBrandKit({ business: 'x'.repeat(61) }).error === 'bad_text' &&
    Ux.sanitizeBrandKit([]).error === 'bad_body' && Ux.sanitizeBrandKit(null).error === 'bad_body' && Ux.sanitizeBrandKit({}).ok
}
await check('4a corpo do kit: só as 5 chaves (user_id do corpo = 400), cor #rrggbb, logo uuid, textos limpos e dentro do teto', () => kitPuroOk(U))
const prefillOk = (Ux) => {
  const kit = { logo_footage_id: LOGO, color: '#e11d48', business: 'Lume', price: '$29', contact: 'lume.shop' }
  const vazio = Ux.brandKitPrefill(kit, { business: '', price: '', contact: '', color: '#2997ff', defaultColor: '#2997FF', hasLogo: false }, 'blob:x')
  const cheio = Ux.brandKitPrefill(kit, { business: 'Outra', price: '10', contact: 'zap', color: '#123456', defaultColor: '#2997ff', hasLogo: true }, 'blob:x')
  const semUrl = Ux.brandKitPrefill(kit, { business: '', price: '', contact: '', color: '#2997ff', defaultColor: '#2997ff', hasLogo: false }, null)
  return vazio.business === 'Lume' && vazio.price === '$29' && vazio.contact === 'lume.shop' && vazio.color === '#e11d48' && vazio.logo.footageId === LOGO &&
    Object.keys(cheio).length === 0 && !('logo' in semUrl) && Object.keys(Ux.brandKitPrefill(null, { business: '', price: '', contact: '', color: '', defaultColor: '', hasLogo: false }, null)).length === 0
}
await check('4b o kit preenche SÓ campo vazio (cor ainda a padrão, sem logo); o que a pessoa digitou nunca é trocado', () => prefillOk(U))
await check('4c o kit salvo = o cartão de agora (título só se a pessoa digitou; vazio = nulo; logo só uuid)', () => {
  const k = U.brandKitFromScreen({ business: '  ', price: ' $29 ', contact: 'lume.shop', color: '#E11D48', logoFootageId: LOGO })
  const k2 = U.brandKitFromScreen({ business: 'Lume', price: '', contact: '', color: 'bad', logoFootageId: 'nope' })
  return k.business === null && k.price === '$29' && k.color === '#e11d48' && k.logo_footage_id === LOGO && k2.business === 'Lume' && k2.color === null && k2.logo_footage_id === null &&
    U.brandKitIsEmpty(U.ADS_BRAND_KIT_EMPTY) && !U.brandKitIsEmpty(k) && U.sanitizeBrandKit(k).ok
})

// ═══ 5. rota /api/ads/brand-kit (EXECUTADA) ══════════════════════════════════════════════════════════════════════════
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PREFIX = 'https://sb.example.co/storage/v1/object/public/user-footage/'
const LOGO_B = '99999999-2222-4333-8444-555555555555'
const VID_A = '77777777-2222-4333-8444-555555555555'
function fakeDb(tables, { missing = false } = {}) {
  const log = []
  const from = (name) => {
    tables[name] ??= []
    const st = { op: 'select', filters: [], row: null, opts: null }
    const exec = (single) => {
      log.push({ name, op: st.op })
      if (missing && name === 'ads_brand_kits') return Promise.resolve({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
      if (st.op === 'upsert') {
        const keys = (st.opts?.onConflict ?? '').split(',').filter(Boolean)
        const i = tables[name].findIndex((x) => keys.every((k) => x[k] === st.row[k]))
        if (i >= 0) tables[name][i] = { ...tables[name][i], ...st.row }
        else tables[name].push({ ...st.row })
        return Promise.resolve({ data: null, error: null })
      }
      const rows = tables[name].filter((r) => st.filters.every((f) => f(r)))
      return Promise.resolve({ data: single ? (rows[0] ? { ...rows[0] } : null) : rows.map((r) => ({ ...r })), error: null })
    }
    const b = {
      select() { return b },
      eq(c, v) { st.filters.push((r) => r[c] === v); return b },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return b },
      upsert(row, opts) { st.op = 'upsert'; st.row = row; st.opts = opts; return b },
      maybeSingle() { return exec(true) },
      then(res, rej) { return exec(false).then(res, rej) },
    }
    return b
  }
  return { from, __log: log }
}
const mundo = () => ({
  ads_brand_kits: [
    { user_id: B, logo_footage_id: LOGO_B, color: '#000000', business: 'Outra Loja B', price: '$1', contact: 'b.shop' },
    { user_id: A, logo_footage_id: LOGO, color: '#e11d48', business: 'Lume', price: '$29', contact: 'lume.shop' },
  ],
  user_footage: [
    { id: LOGO, user_id: A, url: `${PREFIX}${A}/clip-1-logo.png`, kind: 'image' },
    { id: VID_A, user_id: A, url: `${PREFIX}${A}/clip-2.mp4`, kind: 'video' },
    { id: LOGO_B, user_id: B, url: `${PREFIX}${B}/clip-9-logo.png`, kind: 'image' },
  ],
  profiles: [{ id: A, video_credits: 100 }],
})
async function runRoute(method, { user = A, reason = 'paid', body = undefined, tables = mundo(), missing = false, over = {} } = {}) {
  const db = fakeDb(tables, { missing })
  const load = createOfflineLoader({
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
    mocks: {
      'next/server': { NextResponse: { json: (b, init) => ({ status: init?.status ?? 200, body: b }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: user, email: 'dona@example.com' } : null } }) } }) },
      '@/lib/ads/serverAccess': {
        loadAdsAccess: async () => ({ admin: db, reason }),
        adsGate: (r) => (r === 'paid' ? 'ok' : r === 'closed' ? 'closed' : 'no_access'),
        adsSampleOpen: async () => false,
        isMissingAdsTable: (c) => c === '42P01' || c === 'PGRST205',
      },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/userFootage': { FOOTAGE_PUBLIC_PREFIX: () => PREFIX },
      '@/lib/mp4Duration': { probeMp4DurationSeconds: () => null },
    },
  })
  const R = load(F.route)
  const req = { json: async () => { if (body === undefined) throw new Error('sem corpo'); return body } }
  const res = method === 'GET' ? await R.GET(req) : await R.PUT(req)
  return { res, tables, log: db.__log }
}
const rotaOk = async (over = {}) => {
  const anon = await runRoute('GET', { user: null, over })
  const sem = await runRoute('PUT', { reason: 'none', body: { color: '#111111' }, over })
  const g = await runRoute('GET', { over })
  const gB = await runRoute('GET', { user: B, over })
  return anon.res.status === 401 && sem.res.status === 403 && sem.tables.ads_brand_kits.length === 2 &&
    g.res.status === 200 && g.res.body.kit.business === 'Lume' && g.res.body.logo_url === `${PREFIX}${A}/clip-1-logo.png` && g.res.body.ready === true &&
    gB.res.body.kit.business === 'Outra Loja B' && gB.res.body.logo_url === `${PREFIX}${B}/clip-9-logo.png`
}
await check('5a GET: 401 sem login, 403 sem acesso; devolve SÓ o kit da sessão (A vê o de A, B vê o de B) e o logo do dono', () => rotaOk())
const escritaOk = async (over = {}) => {
  const w = await runRoute('PUT', { body: { logo_footage_id: LOGO, color: '#00ff00', business: 'Lume 2', price: null, contact: 'lume.shop' }, over })
  const rowA = w.tables.ads_brand_kits.find((r) => r.user_id === A)
  const rowB = w.tables.ads_brand_kits.find((r) => r.user_id === B)
  const alheio = await runRoute('PUT', { body: { logo_footage_id: LOGO_B, color: '#00ff00' }, over })
  const video = await runRoute('PUT', { body: { logo_footage_id: VID_A }, over })
  const intruso = await runRoute('PUT', { body: { user_id: B, color: '#00ff00' }, over })
  const novo = await runRoute('PUT', { user: B, tables: { ads_brand_kits: [], user_footage: mundo().user_footage }, body: { color: '#abcdef' }, over })
  return w.res.status === 200 && rowA.color === '#00ff00' && rowA.business === 'Lume 2' && rowA.price === null && rowB.color === '#000000' && rowB.business === 'Outra Loja B' &&
    alheio.res.status === 400 && alheio.res.body.error === 'bad_logo' && alheio.tables.ads_brand_kits.find((r) => r.user_id === A).color === '#e11d48' &&
    video.res.status === 400 && video.res.body.error === 'bad_logo' && intruso.res.status === 400 && intruso.res.body.error === 'bad_field' &&
    intruso.tables.ads_brand_kits.find((r) => r.user_id === B).color === '#000000' && novo.res.status === 200 && novo.tables.ads_brand_kits.length === 1 && novo.tables.ads_brand_kits[0].user_id === B
}
await check('5b PUT grava com o user_id DA SESSÃO; logo de outra conta ou vídeo = 400 bad_logo; user_id no corpo = 400; a linha de B nunca muda', () => escritaOk())
await check('5c tabela não aplicada: GET 200 { kit: null, ready: false }; PUT 503 not_ready (nunca 500)', async () => {
  const g = await runRoute('GET', { missing: true })
  const p = await runRoute('PUT', { missing: true, body: { color: '#111111' } })
  return g.res.status === 200 && g.res.body.kit === null && g.res.body.ready === false && p.res.status === 503 && p.res.body.error === 'not_ready'
})
await check('5d a rota só toca ads_brand_kits e user_footage (nunca profiles, pedidos, créditos ou eventos); nenhuma chamada de rede', async () => {
  const all = [await runRoute('GET'), await runRoute('PUT', { body: { logo_footage_id: LOGO, color: '#00ff00' } })]
  const src = code(read(F.route))
  return all.every((r) => r.log.every((x) => ['ads_brand_kits', 'user_footage'].includes(x.name))) && !/fetch\(|chargeAds|debit|video_credits|writeServerEvent|ads_v2_orders/.test(src) &&
    // KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: o kit é o do DONO do workspace (uid; sem equipe, o próprio user.id).
    /const uid: string = ws\.ownerId \?\? user\.id/.test(src) && /\.eq\('user_id', uid\)\.maybeSingle\(\)/.test(src) && /upsert\(\{ user_id: uid, \.\.\.kit \}, \{ onConflict: 'user_id' \}\)/.test(src)
})

// ═══ 6. dinheiro intocado ════════════════════════════════════════════════════════════════════════════════════════════
const BASE = {
  'app/api/ads/v2/start/route.ts': 'e870f689ce692e36f53ac48266df0e15667c16980cb1cf478c974396eaa8712b',
  'app/api/ads/v2/orders/route.ts': '968bb3f272746e6f7d0a0b603d3020d05d774fc890c00e6473cc4cffa3f98a10',
  'app/api/ads/v2/plan/route.ts': 'f638ee485042e253f381b9d16834b1629505cbcae3f0dc89ed1b1b4322983027',
  'app/api/ads/v2/research/route.ts': '60789469df3154ed3d2bb94bd445392ebe1725862d7dcde50f57c13f770de9fc',
  'app/api/ads/v2/variations/route.ts': 'ed232672fd0de370744a197c70b779ea07815ac6adefcbee72712118d61c0643',
  'app/api/ads/v2/link-import/route.ts': '03fd100e70bdb1644c923eabf6489cc12dc7798253891e8a8722160f7bf95cc3',
  'app/api/ads/v2/retake/route.ts': 'c0bfbf93e4243390104bc0785ba29668b68428531f9fe64daf874c37da767662',
  'lib/ads/v2Billing.ts': 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9',
  'lib/ads/sample.ts': '5495f78a67a8e622c6c4ebc82e25b3f6d8d130ea7b427c0d267d06cb8c957a93',
  'lib/ads/v2Tiers.ts': '18678aa1573651bc61ee6ff55508187393ae56c093dbc09f8737e65d344219a0',
}
// KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: a equipe do Business trocou user.id → uid (o dono do workspace) nas 7 rotas, pediu loadAdsAccess com { workspace: true },
// somou created_by (só membro) e o rastro ads_order_by_member. desfazEquipe tira EXATAMENTE isso (linhas marcadas, o if do rastro,
// o created_by, a opção, o ...ws e o uid) e a impressão digital da base aeef024f tem de bater igual — o resto do dinheiro intocado.
// v2Billing, sample e v2Tiers seguem lidos crus (a equipe não tocou neles).
const desfazEquipe = (s) => s.split('\n')
  .filter((l) => !l.includes('KINEO-EQUIPE-BUSINESS-2026-10-10') && !/^\s*if \((access|ws)\.role === 'member'\) await writeServerEvent\(\{ name: 'ads_order_by_member'/.test(l))
  .join('\n').replace(/, \.\.\.\((access|ws)\.role === 'member' \? \{ created_by: user\.id \} : \{\}\)/g, '')
  .split(', { workspace: true })').join(')').split(', ...ws } = await loadAdsAccess(').join(' } = await loadAdsAccess(').replace(/(?<!<)\buid\b/g, 'user.id')
await check('6a /start, /orders, /plan, /research, /variations, /retake, /link-import, v2Billing, sample e v2Tiers byte a byte iguais à base aeef024f', () =>
  Object.entries(BASE).every(([f, h]) => sha(f.startsWith('app/api/ads/v2/') ? desfazEquipe(read(f)) : read(f)) === h))
const telaDinheiroOk = (src) => {
  const s = code(src)
  const make = bloco(s, 'async function makeAd()')
  const vari = bloco(s, 'async function makeVariations()')
  return (s.match(/'\/api\/ads\/v2\/start'/g) || []).length === 1 && (s.match(/'\/api\/ads\/brand-kit'/g) || []).length === 2 &&
    /await api<\{ kit\?: AdsBrandKit \| null; logo_url\?: string \| null \}>\('\/api\/ads\/brand-kit'\)/.test(s) &&
    /void api\('\/api\/ads\/brand-kit', \{ method: 'PUT', body \}\)/.test(bloco(s, 'function saveBrandKit()')) &&
    ordem(make, "api<StatusView>('/api/ads/v2/start'", 'if (!r.ok) {', 'return', 'setDraft(null)', 'if (saveKit) saveBrandKit()', 'adoptOrder(') &&
    ordem(vari, "'/api/ads/v2/variations'", "if (!r.ok || typeof r.data.group_id !== 'string') {", 'return', 'setDraft(null)', 'if (saveKit) saveBrandKit()', 'onVariationsStarted(r.data.group_id)') &&
    (s.match(/saveBrandKit\(\)/g) || []).length === 3 &&
    /body: \{ mode: 'simple', order_id: orderId, sector, logo_footage_id: logo\?\.footageId \?\? null, \.\.\.\(presenterOn \? \{ presenter: true \} : \{\}\), photos: uploaded, videos, card_footage_id: card\.footageId, facts: chosen, \.\.\.\(style !== 'none' \? \{ style \} : \{\}\) \}/.test(s) &&
    /if \(!plan \|\| !planFresh \|\| busy \|\| cost === null\) return/.test(make) && /const cost = tier \? adsV2Credits\(tier, ADS_V2_SCREEN_SECONDS\) : null/.test(s)
}
await check('6b tela: 1 só chamada ao /start (no botão); o kit só é gravado DEPOIS do /start/variações aceitos; corpo do /plan igual; preço = adsV2Credits', () => telaDinheiroOk(read(F.simple)))
await check('6c as peças novas da tela não chamam rota nenhuma (sem fetch/api), nem decidem preço', () => {
  const s = code(read(F.uxTsx))
  return !/fetch\(|\bapi\(|\/api\/|adsV2Credits/.test(s) && /^'use client'/.test(read(F.uxTsx))
})

// ═══ 7. 16 línguas ═══════════════════════════════════════════════════════════════════════════════════════════════════
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]))
const copyOk = (table) => {
  const en = flat(table.en)
  const keys = en.map(([k]) => k).join('|')
  const marks = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join('')
  const traduzidas = ['stepper', 'drop.title', 'drop.hint', 'cropHint', 'preview.title', 'preview.empty', 'preview.delivery', 'kit.save', 'kit.saveHint', 'tiers.yourPhotos', 'styles.recommended']
  return LANGS.length === 16 && Object.keys(table).length === 16 && LANGS.every((l) => {
    const f = flat(table[l])
    const m = Object.fromEntries(f)
    return f.map(([k]) => k).join('|') === keys && f.every(([, v]) => typeof v === 'string' && v.trim().length > 0) &&
      en.every(([k, v]) => marks(v) === marks(m[k])) && (l === 'en' || traduzidas.every((k) => m[k] !== Object.fromEntries(en)[k]))
  })
}
await check('7a frases novas nas 16 línguas: mesmas chaves, nenhuma vazia, mesmos marcadores {n}/{s}/{tier}/{c}/{lang}, escritas (não copiadas do inglês)', () =>
  copyOk(U.ADS_V2_UX_COPY) && U.adsV2UxCopy('xx') === U.ADS_V2_UX_COPY.en && U.adsV2UxCopy('pt') === U.ADS_V2_UX_COPY.pt)

// ═══ 8. 15 estilos ═══════════════════════════════════════════════════════════════════════════════════════════════════
const ENUMS = {
  package_explosion: 'Package Explosion', giant_product: 'Giant Product', product_closeup: 'Product close-up', ocean_ad: 'Ocean ad', mechanical_assembly: 'Mechanical Assembly',
  naked_eye_3d_ad: '3D Naked-Eye AD', beach_ad: 'Beach AD', lighting_ad: 'Lighting AD', supermarket_ad: 'Supermarket AD', poster_ad: 'Poster AD',
  graffiti_ad: 'Graffiti AD', dreamlike_cloud: 'Dreamlike Cloud', parachute_delivery: 'Parachute Delivery', shoal_surround: 'Shoal Surround', dishes_served: 'Dishes Served',
}
const KEYS = Object.keys(ENUMS)
const estilosOk = (Sx, C, SL, E) => Sx.ADS_V2_STYLES.length === 15 && Sx.ADS_V2_STYLES.every((s, i) => s.key === KEYS[i] && s.effect === ENUMS[s.key]) &&
  [Sx.ADS_V2_STYLE_KEYS, C.ADS_V2_CONTRACT_STYLES, SL.ADS_V2_PLAN_STYLES, Object.keys(E.ADS_V2_EFFECT_BY_STYLE)].every((l) => JSON.stringify(l) === JSON.stringify(KEYS)) &&
  KEYS.every((k) => E.ADS_V2_EFFECT_BY_STYLE[k] === ENUMS[k])
await check('8a os 15 estilos com o enum EXATO da fal, na ordem; espelhos v2Styles = v2Contract = v2ShotLists = v2Engines; todos no MESMO endpoint testado (sonda)', () => {
  const probe = read(F.probe)
  return estilosOk(S, L(F.contract), L(F.shots), L(F.engines)) && S.ADS_V2_STYLE_ENDPOINT === 'fal-ai/pixverse/v5/effects' &&
    KEYS.every((k) => probe.includes(`${k}: { model: PIXVERSE, input: (image) => ({ effect: '${ENUMS[k]}', image_url: image, resolution: '720p', duration: '5' }) }`))
})
await check('8b cada estilo tem prévia de verdade: public/ads-styles/<chave>.mp4 (MP4) e .jpg (JPEG), feitas pelo efeito', () =>
  S.ADS_V2_STYLES.every((s) => {
    const mp4 = fs.readFileSync(path.join(ROOT, 'public', s.preview))
    const jpg = fs.readFileSync(path.join(ROOT, 'public', s.poster))
    return s.preview === `/ads-styles/${s.key}.mp4` && s.poster === `/ads-styles/${s.key}.jpg` && mp4.length > 20000 && mp4.subarray(4, 8).toString() === 'ftyp' && jpg.length > 3000 && jpg[0] === 0xff && jpg[1] === 0xd8
  }))
await check('8c categorias: todo estilo em pelo menos 1; cada categoria (Food & drink · Beauty · Tech · Any) tem estilo; "all" = os 15', () =>
  KEYS.every((k) => Array.isArray(S.ADS_V2_STYLE_CATEGORIES[k]) && S.ADS_V2_STYLE_CATEGORIES[k].length > 0 && S.ADS_V2_STYLE_CATEGORIES[k].every((c) => S.ADS_V2_STYLE_CATEGORY_IDS.includes(c))) &&
  S.ADS_V2_STYLE_CATEGORY_IDS.every((c) => S.adsV2StylesIn(c).length > 0) && S.adsV2StylesIn('all').length === 15 &&
  S.adsV2StylesIn('food').includes('dishes_served') && S.adsV2StylesIn('tech').includes('mechanical_assembly') && S.adsV2StylesIn('beauty').includes('dreamlike_cloud'))
await check('8d frases dos 15 estilos nas 16 línguas: nome, para que serve e o que faz (oneLine), escritas; sugestão por setor de antes intacta', () =>
  LANGS.every((l) => KEYS.every((k) => ['label', 'bestFor', 'oneLine'].every((x) => typeof S.ADS_V2_STYLE_COPY[l].styles[k]?.[x] === 'string' && S.ADS_V2_STYLE_COPY[l].styles[k][x].trim()))) &&
  LANGS.filter((l) => l !== 'en').every((l) => KEYS.every((k) => S.ADS_V2_STYLE_COPY[l].styles[k].oneLine !== S.ADS_V2_STYLE_COPY.en.styles[k].oneLine)) &&
  S.ADS_V2_STYLES.every((s) => S.ADS_V2_STYLE_COPY.en.styles[s.key].oneLine === s.oneLine) &&
  S.adsV2SuggestedStyle('restaurant') === 'package_explosion' && S.adsV2SuggestedStyle('salon') === 'product_closeup' && S.adsV2SuggestedStyle('store') === 'giant_product' && S.adsV2SuggestedStyle('real_estate') === 'none')

// ═══ 9. tela, invólucro, componente e migração (leitura) ═════════════════════════════════════════════════════════════
await check('9a tela: passo a passo, soltar arquivos pelo MESMO addFiles, editor de enquadramento, nível do saldo, estilos em carrossel, prévia ao vivo e barra do celular', () => {
  const s = code(read(F.simple))
  return ordem(s, '<SimpleStepper copy={ux} steps={steps} />', 'aria-labelledby="adv2s-s1"', '<DropZone', 'onFiles={(list) => void addFiles(list)}', 'data-kineo="ads-link-import"', 'aria-labelledby="adv2s-s2"', 'data-kineo="ads-brand-kit-chip"', 'aria-labelledby="adv2s-s3"', '<TierIncludes', '<AdsStylePicker', 'carousel={{', 'aria-labelledby="adv2s-s4"', 'data-kineo="ads-brand-kit-save"', '<LiveStage slot={previewSlot}', '<MobilePreviewBar') &&
    /const costLine = adsV2CostLine\(\{ tier, balance, sample: !!scopy, group: variations && three \? variationsPrice\(cost\) : null \}\)/.test(s) &&
    /const d = adsV2DefaultTier\(balance\)/.test(s) && /if \(tierAutoRef\.current \|\| sample \|\| tier !== null\) return/.test(s) &&
    /const \[saveKit, setSaveKit\] = useState\(true\)/.test(s) && /<CropEditor/.test(s) && /moveItemTo\(dragKey, p\.key\)/.test(s) &&
    /const \[tier, setTier\] = useState<AdsV2Tier \| null>\(sample \? ADS_SAMPLE_TIER : null\)/.test(s)
})
await check('9b invólucro: a vaga do palco só no modo simples; o palco da casa some SÓ enquanto a prévia ao vivo ocupa (volta no completo e no progresso)', () => {
  const s = code(read(F.client))
  return /\{mode === 'simple' \? <div ref=\{setPreviewSlot\} className="adv2s-slot" \/> : null\}/.test(s) &&
    /\{mode === 'simple' && simplePreview \? null : <ProductStage /.test(s) && /previewSlot=\{previewSlot\}\n\s*onPreview=\{setSimplePreview\}/.test(s) &&
    /const previewOn = phase === 'build' && !!previewSlot/.test(code(read(F.simple)))
})
await check('9c componente de estilos: carrossel e categorias OPCIONAIS (o modo completo segue igual); faixa pública rola com os 15; sem cor cravada', () => {
  const s = read(F.comp)
  return /carousel\?: \{ labels: Record<AdsV2StyleCategory \| 'all', string>; recommended: string; prev: string; next: string \}/.test(s) &&
    /const shown = carousel \? adsV2StylesIn\(cat\) : ADS_V2_STYLES\.map\(\(s\) => s\.key\)/.test(s) && !/overflow-x:visible/.test(s) && /@media \(min-width:900px\)\{\.kst-strip li\{flex:0 0 172px\}\}/.test(s) &&
    !/#[0-9a-f]{6}/i.test(s.replace('#fff', '')) && !/carousel=/.test(code(read(F.client)))
})
await check('9d peças novas: CSS por dangerouslySetInnerHTML, só tokens --ads-* fora do palco escuro, "reduzir movimento" respeitado, teclado no enquadramento', () => {
  const s = read(F.uxTsx)
  const simple = read(F.simple)
  return /__html: SIMPLE_CSS \+ SIMPLE_UX_CSS/.test(simple) && !/<style>/.test(simple + s) && /prefers-reduced-motion:reduce/.test(s) && /prefersReducedMotion\(\)/.test(s) &&
    /ArrowLeft: \[-step, 0\]/.test(s) && /role="dialog" aria-modal="true"/.test(s) && /e\.key === 'Escape'/.test(s) && /\.adv2s-slot:empty\{display:none\}/.test(s) &&
    !/\/\*/.test(s.split('\n').filter((l) => /^\s*\/\//.test(l)).join('\n'))
})
await check('9e migração: tabela própria, RLS ligado, revoke de anon/authenticated, NENHUMA policy, idempotente, sem apagar/alterar dado', () => {
  const sql = read(F.mig)
  return /create table if not exists public\.ads_brand_kits \(/.test(sql) && /user_id uuid primary key references auth\.users \(id\) on delete cascade/.test(sql) &&
    /alter table public\.ads_brand_kits enable row level security;/.test(sql) && /revoke all on table public\.ads_brand_kits from anon, authenticated;/.test(sql) &&
    !/create policy/i.test(sql) && /drop trigger if exists/.test(sql) && !/\b(delete from|update public|insert into|truncate|drop table|drop column)\b/i.test(sql) &&
    /color ~ '\^#\[0-9a-f\]\{6\}\$'/.test(sql)
})

// ═══ 10. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, file, de, para, aindaPassa) => {
  const src = read(file)
  const m = trocar(src, de, para)
  const aplicou = m !== src && m.includes(para)
  let passa = true
  try { passa = !!(await aindaPassa({ [file]: m }, m)) } catch { passa = false }
  ok(aplicou && !passa, `10 mutante: ${nome} fica vermelho (aplicou: ${aplicou})`)
}
await mutante('custo com 30 s no lugar de 15', F.ux, '  const single = adsV2Credits(input.tier, seconds)', '  const single = adsV2Credits(input.tier, 30)', (over) => custoOk(pura(over)(F.ux)))
await mutante('custo que ignora a amostra', F.ux, 'const credits = input.sample === true ? 0 :', 'const credits = false ? 0 :', (over) => custoOk(pura(over)(F.ux)))
await mutante('nível padrão começando no Premium', F.ux, 'export const ADS_V2_RECOMMENDED_TIER: AdsV2Tier = \'commercial\'', 'export const ADS_V2_RECOMMENDED_TIER: AdsV2Tier = \'cinema\'',
  (over) => { const Ux = pura(over)(F.ux); return [0, 5, 34, 40, 41, 51, 99999].every((b) => Ux.adsV2DefaultTier(b) !== 'cinema') })
await mutante('corpo do kit aceitando chave extra (user_id)', F.ux, "  if (Object.keys(b).some((k) => !allowed.includes(k))) return { ok: false, error: 'bad_field' }\n", '', (over) => kitPuroOk(pura(over)(F.ux)))
await mutante('kit trocando o que a pessoa digitou', F.ux, '  if (kit.business && !now.business.trim()) out.business = kit.business', '  if (kit.business) out.business = kit.business', (over) => prefillOk(pura(over)(F.ux)))
// KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: o filtro é pelo dono do workspace (uid).
await mutante('GET lendo o kit sem filtrar pela sessão', F.route, ".select(KIT_COLUMNS).eq('user_id', uid).maybeSingle()", '.select(KIT_COLUMNS).maybeSingle()', (over) => rotaOk(over))
await mutante('PUT sem conferir a posse do logo', F.route, "      if (!f || !f.isImage) return v2Fail('bad_logo', 400)\n", '', (over) => escritaOk(over))
// KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: a escrita é no dono do workspace (uid).
await mutante('PUT gravando sem o user_id da sessão', F.route, '.upsert({ user_id: uid, ...kit }', '.upsert({ ...kit }', (over) => escritaOk(over))
await mutante('kit gravado ANTES do /start', F.simple, "    setBusy('start')\n    setPlanError(null)\n    try {\n      if (!(await syncCard(plan))) return\n      setBusyNote(copy.plan.starting)", "    setBusy('start')\n    setPlanError(null)\n    if (saveKit) saveBrandKit()\n    try {\n      if (!(await syncCard(plan))) return\n      setBusyNote(copy.plan.starting)",
  (_o, m) => telaDinheiroOk(m))
await mutante('língua faltando uma frase', F.ux, "  kit: { chip: 'Kit merek diterapkan', edit: 'Ubah', save: 'Simpan sebagai kit merekku', saveHint: 'Logo, warna, nama, harga, dan kontak terisi sendiri lain kali.' },", "  kit: { chip: 'Kit merek diterapkan', edit: 'Ubah', save: 'Simpan sebagai kit merekku', saveHint: '' },",
  (over) => copyOk(pura(over)(F.ux).ADS_V2_UX_COPY))
await mutante('enum de estilo novo com a caixa trocada', F.engines, "  beach_ad: 'Beach AD',", "  beach_ad: 'Beach ad',",
  (over) => { const Lx = pura(over); return estilosOk(Lx(F.styles), Lx(F.contract), Lx(F.shots), Lx(F.engines)) })
await mutante('espelho do contrato sem um estilo novo', F.contract, ", 'shoal_surround', 'dishes_served']", ", 'shoal_surround']",
  (over) => { const Lx = pura(over); return estilosOk(Lx(F.styles), Lx(F.contract), Lx(F.shots), Lx(F.engines)) })
await mutante('1 caractere a mais no /start', 'app/api/ads/v2/start/route.ts', "export const runtime = 'nodejs'", "export const runtime = 'nodejs' ", (_o, m) => sha(m) === BASE['app/api/ads/v2/start/route.ts'])

console.log(`\ntest-ads-ux-marca-2026-10-10: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
