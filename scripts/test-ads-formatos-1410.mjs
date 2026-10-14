// KINEO-ADS-MELHORIAS-1410 — guardião dos FORMATOS do Studio Ads v2 (fundador 14/10, "tudo sim"): 9:16 (padrão), 4:5 e 1:1 para o
// feed, em "Mais opções", com os MESMOS créditos e SÓ onde o pipeline inteiro aceita. Prova EXECUTANDO o código real:
//   F1  a lógica (lib/ads/v2ShotLists.ts): os 3 formatos, o recorte (1080×1920 · 1080×1350 · 1080×1080, a MESMA conta de cropRect)
//       e quem bloqueia: estilo (PixVerse sem aspect_ratio) e ator (retrato 9:16) só em 9:16; Premium sem 4:5 (Seedance sem 4:5);
//   F2  o contrato do /plan: 9:16/ausente = sem a chave (o corpo de antes); 4:5/1:1 entram; qualquer outra coisa = 400 bad_format;
//   F3  NÚCLEO REAL do /plan: 4:5 grava `format` no plano e pede a cena "portrait" (sem número), créditos iguais ao 9:16; 9:16 =
//       plano SEM a chave e a cena "vertical 9:16" de sempre; 4:5+estilo, 1:1+ator e Premium+4:5 = 400 format_unsupported ANTES
//       do modelo (nada gravado, nada cobrado); Premium+1:1 sai;
//   F4  motores: Nano Banana com aspect_ratio do formato (9:16 = o input de sempre, byte a byte); Seedance 1:1 só no Premium
//       quadrado (linha própria no avanço; o construtor de sempre intocado);
//   F5  montagem: quadro 1080×1350 / 1080×1080; o cartão final 9:16 reposicionado com o CONTEÚDO inteiro dentro do quadro; em
//       9:16 o cartão sai como sempre; frases e vídeo do cliente seguem relativos ao quadro;
//   F6  avanço: o quadro do formato vem de renderOutputSpecFor(formato do plano) e bate com o recorte;
//   F7  tela: o seletor em "Mais opções" (3 opções, fechadas com o motivo), "Mesmos créditos", recorte e upload no formato, o
//       formato no corpo e na assinatura só fora do 9:16, estilo/ator saem no 4:5/1:1 e voltam o anúncio ao 9:16;
//   F8  frases nas 16 línguas;
//   F9  núcleo do /plan: as linhas do formato são inteiras e marcadas, nenhuma fala de crédito/débito/preço; a tela: as linhas
//       MUDADAS voltam ao texto exato de antes por semMelhorias1410; dinheiro (v2Billing, v2Tiers, v2StartCore) intocado;
//   M   mutantes.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { MARCA_MELHORIAS_1410, VOLTA_MELHORIAS_1410, semMelhorias1410 } from './test-support/desfaz-melhorias-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  lists: 'lib/ads/v2ShotLists.ts',
  formats: 'lib/ads/v2Formats.ts',
  contract: 'lib/ads/v2Contract.ts',
  core: 'lib/ads/v2PlanCore.ts',
  brief: 'lib/ads/v2Brief.ts',
  engines: 'lib/ads/v2Engines.ts',
  montage: 'lib/ads/adV2Montage.ts',
  advance: 'lib/ads/v2Advance.ts',
  screen: 'lib/ads/v2Screen.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const mod = (rel, over = {}) => carregar(over)(rel)
const LANGS = ['en', 'es', 'hi', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const url = (id) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${id}.jpg`

// ═══ F1. a lógica ════════════════════════════════════════════════════════════════════════════════════════════════════
const f1 = (listsSrc) => {
  const L = mod(F.lists, listsSrc ? { [F.lists]: listsSrc } : {})
  const S = mod(F.screen)
  const B = (o) => L.adsV2FormatBlock({ format: '9:16', tier: 'photo_motion', style: null, presenter: false, ...o })
  const cropOk = [[4000, 3000, 0.3, 0.7], [1080, 1920, 0.5, 0.5], [3000, 4000, 0, 1], [1200, 1200, 1, 0]].every(([w, h, fx, fy]) => JSON.stringify(L.adsV2CropRectFor(w, h, fx, fy, '9:16')) === JSON.stringify(S.cropRect(w, h, fx, fy)))
  const r45 = L.adsV2CropRectFor(4000, 3000, 0.5, 0.5, '4:5')
  const r11 = L.adsV2CropRectFor(4000, 3000, 0.5, 0.5, '1:1')
  return JSON.stringify(L.ADS_V2_FORMATS) === JSON.stringify(['9:16', '4:5', '1:1']) &&
    JSON.stringify(L.ADS_V2_FORMAT_CROP) === JSON.stringify({ '9:16': { width: 1080, height: 1920 }, '4:5': { width: 1080, height: 1350 }, '1:1': { width: 1080, height: 1080 } }) &&
    L.normalizeAdsV2Format('4:5') === '4:5' && L.normalizeAdsV2Format('16:9') === '9:16' && L.normalizeAdsV2Format(undefined) === '9:16' &&
    L.adsV2PlanFormat({ format: '1:1' }) === '1:1' && L.adsV2PlanFormat({}) === '9:16' && L.adsV2PlanFormat(null) === '9:16' &&
    B({ style: 'giant_product', presenter: true, tier: 'cinema' }) === null && // 9:16 nunca bloqueia
    B({ format: '4:5', style: 'giant_product' }) === 'style' && B({ format: '1:1', style: 'beach_ad' }) === 'style' && B({ format: '4:5', style: 'none' }) === null &&
    B({ format: '1:1', presenter: true }) === 'presenter' && B({ format: '4:5', tier: 'cinema' }) === 'premium_45' && B({ format: '1:1', tier: 'cinema' }) === null &&
    B({ format: '4:5', tier: 'commercial' }) === null && cropOk &&
    Math.abs(r45.sw / r45.sh - 0.8) < 1e-9 && r45.sh === 3000 && Math.abs(r11.sw - 3000) < 1e-9 &&
    L.adsV2SeedanceAspect('1:1') === '1:1' && L.adsV2SeedanceAspect('9:16') === '9:16' && (() => { try { L.adsV2SeedanceAspect('4:5'); return false } catch { return true } })()
}
await check('F1 3 formatos; recorte 1080×1920/1350/1080 com a MESMA conta do cropRect (9:16 idêntico); estilo e ator só em 9:16; Premium sem 4:5 (Seedance), com 1:1', () => f1())

// ═══ F2. contrato ════════════════════════════════════════════════════════════════════════════════════════════════════
const BODY = { order_id: U(1), sector: 'store', logo_footage_id: null, mode: 'simple', facts: [], photos: [{ footage_id: U(22), kind: 'product' }] }
const f2 = (contractSrc) => {
  const C = mod(F.contract, contractSrc ? { [F.contract]: contractSrc } : {})
  const a = C.sanitizePlanBody(BODY)
  const b = C.sanitizePlanBody({ ...BODY, format: '9:16' })
  const c = C.sanitizePlanBody({ ...BODY, format: '4:5' })
  const d = C.sanitizePlanBody({ ...BODY, format: '1:1' })
  const e = C.sanitizePlanBody({ ...BODY, format: '16:9' })
  const g = C.sanitizePlanBody({ ...BODY, format: 45 })
  return a.ok && !('format' in a.value) && b.ok && JSON.stringify(b.value) === JSON.stringify(a.value) && c.ok && c.value.format === '4:5' && d.ok && d.value.format === '1:1' &&
    !e.ok && e.error === 'bad_format' && !g.ok && g.error === 'bad_format'
}
await check('F2 contrato do /plan: ausente ou "9:16" = o corpo de antes, chave por chave; "4:5"/"1:1" entram; "16:9" ou número = 400 bad_format', () => f2())

// ═══ F3. núcleo REAL do /plan ════════════════════════════════════════════════════════════════════════════════════════
async function rodaPlano({ coreSrc, tier = 'commercial', format, style, presenter, photos = [{ footage_id: U(21), kind: 'place' }, { footage_id: U(22), kind: 'product' }] } = {}) {
  const log = { stored: null, extract: 0 }
  const order = {
    id: U(1), user_id: U(9), status: 'draft', tier, seconds: 15, sector: 'store', language: 'en', narration: true,
    brief: { sentence: 'Lume eau de parfum, warm amber', link: null, mode: 'simple', overlays: true, price: null, contact: null, kind: 'product', scene: null, research: { status: 'ok', at: new Date().toISOString(), facts: [] } },
    logo_footage_id: null, card_url: null, card_footage_id: null, photos: null, plan: null,
  }
  const admin = {
    from() {
      const q = {
        select: () => q, eq: () => q, gte: () => q, in: () => q,
        update: (row) => { log.stored = row; return q },
        maybeSingle: async () => ({ data: { id: order.id, card_url: 'https://x/card.png' }, error: null }),
        then: (a, b) => Promise.resolve({ count: 0, error: null, data: [] }).then(a, b),
      }
      return q
    },
  }
  const realBrief = carregar()(F.brief)
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
    '@/lib/openai': { openai: new Proxy({}, { get() { throw new Error('Offline: OpenAI proibido') } }) },
    '@/lib/serverEvents': { writeServerEvent: async () => {} },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, adsSampleOpen: async () => false, adsSampleLevelOk: () => true },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order: structuredClone(order), error: null }) },
    '@/lib/ads/v2Server': {
      ownedFootage: async (_a, _u, ids) => new Map(ids.map((id) => [id, { url: url(id.slice(-2)), isImage: true, isPng: true, isVideo: false }])),
      measureFootageVideo: async () => null,
      v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
      v2Json: (b, status = 200) => ({ status, body: b }),
    },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Brief': {
      ...realBrief,
      extractAdsV2Brief: async () => { log.extract++; return { ok: true, brief: { business: 'Lume', offer: '', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }, copy: { narration: 'Lume eau de parfum. Warm amber that stays with you.', overlays: ['Lume', 'Warm amber'], sectorHint: null }, dropped: [], attempts: 1 } },
    },
  }
  const core = carregar(coreSrc ? { [F.core]: coreSrc } : {}, mocks, { OPENAI_API_KEY: 'offline' })(F.core)
  const body = { mode: 'simple', order_id: order.id, sector: 'store', photos, facts: [], ...(format ? { format } : {}), ...(style ? { style } : {}), ...(presenter ? { presenter: true } : {}) }
  const res = await core.adsV2PlanFor({ id: order.user_id, email: 'qa@exemplo.com' }, { admin, reason: 'internal', ownerId: order.user_id }, async () => structuredClone(body), Date.now())
  return { res, log }
}
const T = mod(F.tiers)
const scenes = (r) => (r.log.stored?.plan?.shots ?? []).map((s) => s.scenePrompt).filter(Boolean)
const f3 = async (coreSrc) => {
  const v = await rodaPlano({ coreSrc })
  const p = await rodaPlano({ coreSrc, format: '4:5' })
  const q = await rodaPlano({ coreSrc, format: '1:1', tier: 'cinema' })
  const s = await rodaPlano({ coreSrc, format: '4:5', style: 'giant_product' })
  const a = await rodaPlano({ coreSrc, format: '1:1', presenter: true })
  const c = await rodaPlano({ coreSrc, format: '4:5', tier: 'cinema' })
  const recusa = (r, why) => r.res.status === 400 && r.res.body.error === 'format_unsupported' && r.res.body.why === why && r.log.extract === 0 && r.log.stored === null
  return v.res.status === 200 && !('format' in v.log.stored.plan) && scenes(v).length === 3 && scenes(v).every((x) => x.startsWith('Photorealistic vertical 9:16 frame')) &&
    p.res.status === 200 && p.log.stored.plan.format === '4:5' && scenes(p).length === 3 && scenes(p).every((x) => x.startsWith('Photorealistic portrait frame') && !/\d+:\d+/.test(x)) &&
    p.res.body.credits === v.res.body.credits && p.res.body.credits === T.adsV2Credits('commercial', 15) &&
    q.res.status === 200 && q.log.stored.plan.format === '1:1' && scenes(q).every((x) => x.startsWith('Photorealistic square frame')) && q.res.body.credits === T.adsV2Credits('cinema', 15) &&
    recusa(s, 'style') && recusa(a, 'presenter') && recusa(c, 'premium_45')
}
await check('F3 NÚCLEO REAL do /plan: 4:5 grava `format` e pede a cena "portrait" (sem número), créditos IGUAIS ao 9:16; 9:16 = plano sem a chave e a cena de sempre; Premium 1:1 sai "square"; 4:5+estilo, 1:1+ator e Premium+4:5 = 400 ANTES do modelo, nada gravado', () => f3())

// ═══ F4. motores ═════════════════════════════════════════════════════════════════════════════════════════════════════
const f4 = (engSrc) => {
  const E = mod(F.engines, engSrc ? { [F.engines]: engSrc } : {})
  const sc = { prompt: 'Photorealistic portrait frame from a store commercial.', referenceUrls: ['https://x/a.jpg'] }
  const base = E.buildSceneImageInput(sc)
  const seed = E.buildShotInput('seedance_20_fast', { imageUrl: 'https://x/a.jpg', prompt: 'Slow push-in.' })
  return JSON.stringify(base) === JSON.stringify({ prompt: sc.prompt, image_urls: ['https://x/a.jpg'], aspect_ratio: '9:16', num_images: 1, resolution: '2K', output_format: 'jpeg' }) &&
    E.buildSceneImageInput({ ...sc, aspect: '9:16' }).aspect_ratio === '9:16' && E.buildSceneImageInput({ ...sc, aspect: '4:5' }).aspect_ratio === '4:5' && E.buildSceneImageInput({ ...sc, aspect: '1:1' }).aspect_ratio === '1:1' &&
    E.buildSceneImageInput({ ...sc, aspect: '16:9' }).aspect_ratio === '9:16' && seed.aspect_ratio === '9:16' &&
    /if \(engine === 'seedance_20_fast' && adsV2PlanFormat\(order\.plan\) === '1:1'\) input = \{ \.\.\.input, aspect_ratio: adsV2SeedanceAspect\('1:1'\) \}/.test(SRC.advance) &&
    /submitSceneImage\(\{ prompt, referenceUrls: refs, \.\.\.\(adsV2PlanFormat\(order\.plan\) !== '9:16' \? \{ aspect: adsV2PlanFormat\(order\.plan\) \} : \{\}\) \}/.test(SRC.advance)
}
await check('F4 motores: Nano Banana pede o formato (9:16 = o input de sempre, byte a byte; formato desconhecido = 9:16); Seedance do construtor intocado (9:16) e 1:1 só no Premium quadrado, numa linha própria do avanço', () => f4())

// ═══ F5. montagem ════════════════════════════════════════════════════════════════════════════════════════════════════
const vid = { url: 'https://x/a.mp4', kind: 'people', cutStart: 0.5, cutSeconds: 2, measuredSeconds: 3.04 }
const MONT = (w, h) => ({ width: w, height: h, shots: [vid, { ...vid, url: 'https://x/b.mp4' }], overlays: [{ text: 'Lume', start: 0.3, end: 1.5 }], fontFamily: 'Inter', cardUrl: 'https://x/card.png', musicUrl: null })
const pctN = (s) => Number(String(s).replace('%', '')) / 100
const f5 = (montSrc) => {
  const M = mod(F.montage, montSrc ? { [F.montage]: montSrc } : {})
  const card = (src) => src.elements.find((e) => e.track === 3 && e.type === 'image')
  const v = card(M.buildAdV2Source(MONT(1080, 1920)))
  const dentro = (w, h) => {
    const c = card(M.buildAdV2Source(MONT(w, h)))
    const y = pctN(c.y), H = pctN(c.height)
    const topo = y - H / 2
    // a caixa do conteúdo do cartão (12% a 64%) cai dentro do quadro [0, 1]; o cartão cobre a largura e a altura inteiras
    return c.width === '100%' && H > 1 && topo <= 0 && topo + H >= 1 && topo + 0.12 * H >= 0 && topo + 0.64 * H <= 1 && Math.abs(H - (w / h) / (1080 / 1920)) < 0.001
  }
  const s45 = M.buildAdV2Source(MONT(1080, 1350))
  return v.x === '50%' && v.y === '50%' && v.width === '100%' && v.height === '100%' && dentro(1080, 1350) && dentro(1080, 1080) &&
    s45.width === 1080 && s45.height === 1350 && s45.elements.filter((e) => e.type === 'text').every((e) => /%$/.test(e.y) && /%$/.test(e.width)) &&
    JSON.stringify(M.adsV2CardFrame(1080, 1920)) === JSON.stringify({ x: '50%', y: '50%', width: '100%', height: '100%' })
}
await check('F5 montagem: quadro 1080×1350/1080×1080; o cartão final 9:16 cobre o quadro com a caixa do CONTEÚDO (12–64%) inteira dentro; em 9:16 o cartão sai como sempre (100% × 100%); frases relativas ao quadro', () => f5())

// ═══ F6. avanço ══════════════════════════════════════════════════════════════════════════════════════════════════════
await check('F6 avanço: o quadro da montagem é renderOutputSpecFor(formato do plano) — 4:5 = 1080×1350, 1:1 = 1080×1080, os MESMOS números do recorte', () => {
  const R = mod('lib/renderProfile.ts')
  const L = mod(F.lists)
  return /const out = renderOutputSpecFor\(adsV2PlanFormat\(plan\)\)/.test(SRC.advance) && !/const out = renderOutputSpecFor\('9:16'\)/.test(SRC.advance) &&
    ['4:5', '1:1'].every((f) => { const o = R.renderOutputSpecFor(f); return o.width === L.ADS_V2_FORMAT_CROP[f].width && o.height === L.ADS_V2_FORMAT_CROP[f].height })
})

// ═══ F7. tela ════════════════════════════════════════════════════════════════════════════════════════════════════════
const f7 = (src) => {
  const s = src
  const fs0 = s.indexOf('data-kineo="ads-format"')
  const more = s.indexOf('<details className="adv2s-more"')
  const picker = s.slice(fs0, s.indexOf('</fieldset>', fs0))
  return more > 0 && fs0 > more && // dentro de "Mais opções"
    /\{ADS_V2_FORMATS\.map\(\(fm\) => \{/.test(picker) && /const why = adsV2FormatBlock\(\{ format: fm, tier, style: null, presenter: false \}\)/.test(picker) && /disabled=\{!!why\}/.test(picker) &&
    /type="radio" name="adv2s-format" value=\{fm\} checked=\{format === fm\}/.test(picker) && /\{fcopy\.sameCredits\}/.test(picker) && /fcopy\.blocked\.premium_45/.test(picker) &&
    /onChange=\{\(\) => \{ setFormatChoice\(fm\); if \(fm !== '9:16'\) \{ setPresenterChoice\(false\); if \(styleChoice !== null\) setStyleChoice\(null\) \} \}\}/.test(picker) &&
    /const format: AdsV2Format = adsV2FormatBlock\(\{ format: formatChoice, tier, style: null, presenter: false \}\) \? '9:16' : formatChoice/.test(s) &&
    /const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && formatChoice === '9:16' \? styleChoice \?\? styleSuggested : 'none'/.test(s) &&
    /if \(picked\) setFormatChoice\('9:16'\)/.test(s) && /\(presenterChoice && !seen\.presenter\)/.test(s) &&
    /const sig = uploadSig\(p\) \+ \(format !== '9:16' && !p\.video \? `@\$\{format\}` : ''\)/.test(s) &&
    /const file = p\.video \? p\.video\.file : await cropToFormat\(p, format\)/.test(s) &&
    /if \(format === '9:16'\) return cropToVertical\(p\)/.test(s) && /adsV2CropRectFor\(img\.naturalWidth, img\.naturalHeight, p\.fx, p\.fy, format\)/.test(s) && /const \{ width, height \} = ADS_V2_FORMAT_CROP\[format\]/.test(s) &&
    /\.\.\.\(presenterOn && presenterPick \? \{ presenter_id: presenterPick \} : \{\}\), \.\.\.\(format !== '9:16' \? \{ format \} : \{\}\) \},/.test(s) &&
    /\.\.\.\(presenterOn && presenterPick \? \{ presenterPick \} : \{\}\), \.\.\.\(format !== '9:16' \? \{ format \} : \{\}\) \}\)/.test(s) &&
    /formatName=\{format !== '9:16' \? fcopy\.options\[format\]\.name : null\}/.test(s)
}
await check('F7 tela: o seletor em "Mais opções" (3 opções; fechada com o motivo; "Mesmos créditos"); 4:5/1:1 tira estilo e ator, e escolher estilo/ator volta ao 9:16; recorte e upload no formato (9:16 = cropToVertical); formato no corpo e na assinatura SÓ fora do 9:16', () => f7(SRC.simple))

await check('F7b o editor de enquadramento desenha e arrasta a janela NO FORMATO (4:5 numa foto 4000×3000 = janela 80%×… da altura inteira); sem formato = a janela 9:16 de sempre, número por número', () => {
  const X = mod('lib/ads/v2SimpleUx.ts')
  const wide = { w: 4000, h: 3000 }
  const p916 = X.adsV2CropWindowPct(wide, 0.5, 0.5)
  const p45 = X.adsV2CropWindowPct(wide, 0.5, 0.5, 0.8)
  const p11 = X.adsV2CropWindowPct(wide, 0, 0.5, 1)
  const m = X.adsV2MoveCropWindow({ fx: 0.5, fy: 0.5 }, { dx: 50, dy: 0 }, { w: 400, h: 300 }, wide, 0.8)
  return p916.height === 100 && Math.abs(p916.width - 42.19) < 0.02 && p45.height === 100 && p45.width === 60 && p11.width === 75 && p11.left === 0 &&
    JSON.stringify(X.adsV2CropWindowPct(wide, 0.3, 0.6)) === JSON.stringify(X.adsV2CropWindowPct(wide, 0.3, 0.6, undefined)) &&
    m.fx > 0.5 && m.fy === 0.5 && /ratio=\{format !== '9:16' \? ADS_V2_FORMAT_CROP\[format\]\.width \/ ADS_V2_FORMAT_CROP\[format\]\.height : undefined\}/.test(SRC.simple)
})

// ═══ F8. frases ══════════════════════════════════════════════════════════════════════════════════════════════════════
await check('F8 frases do formato nas 16 línguas (nenhuma cópia do inglês nos nomes de 4:5/1:1 e nos motivos); lib pura', () => {
  const C = mod(F.formats)
  const T8 = C.ADS_V2_FORMAT_COPY
  const k = (c) => [c.label, c.options['4:5'].where, c.sameCredits, c.blocked.style, c.blocked.presenter, c.blocked.premium_45]
  return Object.keys(T8).length === 16 && LANGS.every((l) => T8[l] && k(T8[l]).every((x) => typeof x === 'string' && x.trim().length > 0) && ['9:16', '4:5', '1:1'].every((f) => T8[l].options[f].name.includes(f))) &&
    LANGS.filter((l) => l !== 'en').every((l) => [T8[l].sameCredits, T8[l].blocked.style, T8[l].blocked.premium_45].every((x, i) => x !== [T8.en.sameCredits, T8.en.blocked.style, T8.en.blocked.premium_45][i])) &&
    C.adsV2FormatCopy('xx') === T8.en && !/^\s*import\s(?!type)/m.test(SRC.formats) && !/^\s*import\s/m.test(SRC.lists)
})

// ═══ F9. linhas marcadas e dinheiro ══════════════════════════════════════════════════════════════════════════════════
await check('F9 núcleo do /plan: 8 linhas marcadas (packshot 2 + formato 6: import, formato, bloqueio, recusa, cena, gravação), todas INTEIRAS, nenhuma de crédito/débito/preço; a recusa vem ANTES do modelo; a tela: cada linha MUDADA volta ao texto exato de antes; dinheiro intocado', () => {
  const marcadas = SRC.core.split('\n').filter((l) => l.includes(MARCA_MELHORIAS_1410))
  const tela = SRC.simple.split('\n')
  const desfeita = semMelhorias1410(SRC.simple).split('\n')
  const BASE = {
    'lib/ads/v2Billing.ts': 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9',
    'lib/ads/v2Tiers.ts': '18678aa1573651bc61ee6ff55508187393ae56c093dbc09f8737e65d344219a0',
    'lib/ads/v2StartCore.ts': '4393d6ccf8d02426eecded99df5b3be56c0ee9072d5a74221bef566b474dbbde',
  }
  return marcadas.length === 8 && !/credit|debit|charge|refund|adsV2Credits|estimateAdUsd|cost|price/i.test(marcadas.join('\n').replace(/\/\/.*$/gm, '')) &&
    SRC.core.indexOf("    if (formatBlock) return v2Fail('format_unsupported'") < SRC.core.indexOf('    const extracted = await extractAdsV2Brief(') &&
    VOLTA_MELHORIAS_1410.length === 5 && VOLTA_MELHORIAS_1410.every(([agora, antes]) => tela.includes(agora) && !desfeita.includes(agora) && desfeita.includes(antes) && agora.includes(MARCA_MELHORIAS_1410)) &&
    Object.entries(BASE).every(([f, h]) => sha(rd(f)) === h)
})

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════════
const vermelho = async (nome, src, de, para, prova) => {
  let mut = null
  try { mut = trocar(src, de, para) } catch (e) { ok(false, `mutante ${nome}: NÃO aplicou (${e.message})`); return }
  let red = false
  try { red = !(await prova(mut)) } catch (e) { console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = true }
  ok(red && mut !== src, `mutante ${nome}: aplicou e fica VERMELHO`)
}
await vermelho('M1 estilo liberado no 4:5', SRC.lists, "  if (typeof input.style === 'string' && input.style && input.style !== 'none') return 'style'\n", '', (m) => f1(m))
await vermelho('M2 Premium em 4:5 liberado', SRC.lists, "  if (input.format === '4:5' && input.tier === 'cinema') return 'premium_45'\n", '', (m) => f1(m))
await vermelho('M3 contrato aceitando 16:9', SRC.contract, "    if (b.format !== '4:5' && b.format !== '1:1') return fail('bad_format')\n", '', (m) => f2(m))
await vermelho('M4 núcleo sem a recusa do formato', SRC.core, SRC.core.split('\n').find((l) => l.startsWith("    if (formatBlock) return v2Fail('format_unsupported'")) + '\n', '', (m) => f3(m))
await vermelho('M5 núcleo sem gravar o formato no plano', SRC.core, SRC.core.split('\n').find((l) => l.startsWith("    if (format !== '9:16') Object.assign(stored, { format })")) + '\n', '', (m) => f3(m))
await vermelho('M6 Nano Banana ignorando o formato', SRC.engines, "aspect_ratio: scene?.aspect === '4:5' || scene?.aspect === '1:1' ? scene.aspect : '9:16',", "aspect_ratio: '9:16',", (m) => f4(m))
await vermelho('M7 cartão final sempre 100% × 100% (corta o logo no 1:1)', SRC.montage, '  if (F <= ADS_V2_CARD_ASPECT * (1 + ADS_V2_USER_VIDEO_ASPECT_TOLERANCE)) return full\n', '  return full\n', (m) => f5(m))
await vermelho('M8 tela sem o formato no corpo do /plan', SRC.simple, ", ...(format !== '9:16' ? { format } : {}) }, //", ' }, //', (m) => f7(m))
await vermelho('M9 recorte sempre 9:16', SRC.simple, '        const file = p.video ? p.video.file : await cropToFormat(p, format)', '        const file = p.video ? p.video.file : await cropToVertical(p)', (m) => f7(m))

console.log(`\ntest-ads-formatos-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
