// KINEO-ESTILOS-DIA1-2026-10-13 — guardião dos estilos de anúncio do lote do dia 1 (fundador 13/10: "tudo sim").
// dolly_zoom · boom_drop · macaron_machine ("Candy machine").
// reancorado KINEO-TIRA-STARLIGHT-1410 — fundador 14/10 ("tudo sim"): o starlight_gift ("Starlit gift", Holiday) SAIU do produto
// (o efeito põe criança e rena em cena e o produto fica pequeno na mão da criança — ruim para produto adulto). Eram 4, ficam 3;
// o catálogo vai de 19 para 18. A sonda admin ad_starlight_gift (app/api/admin/effect-probe/route.ts) fica: é teste de admin.
// Cada estilo foi testado com render real pela sonda (chaves ad_*, PixVerse v5). Prova, EXECUTANDO o código real pelo
// carregador offline da casa (scripts/test-support/offline-ts-loader.mjs):
//   (1) as 3 chaves existem no catálogo (lib/ads/v2Styles.ts), com prévia /ads-styles/<chave>.mp4 e .jpg; a lista real tem 18;
//   (2) o enum mandado à fal = o enum EXATO da sonda que renderizou (catálogo, espelho de v2Engines e o builder buildShotInput),
//       no MESMO endpoint da sonda (PIXVERSE = ADS_V2_STYLE_ENDPOINT = slug do motor pixverse_effect);
//   (3) o servidor aceita: sanitizePlanBody (contrato do /plan) devolve o estilo, isAdsV2PlanStyle aceita e o planShots põe o
//       efeito no plano de produto;
//   (4) os arquivos de prévia existem, não estão vazios, são MP4 (ftyp) e JPEG (FFD8) e têm o peso das prévias de antes;
//   (5) starlight_gift AUSENTE: fora do catálogo, dos 4 espelhos, das categorias, das cores do palco, das frases nas 16 línguas
//       e do /trending; o servidor recusa (/plan = bad_style, isAdsV2PlanStyle = false, planShots sem efeito, buildShotInput
//       lança); as prévias saíram do repositório;
//   (6) o mecanismo de época (campo `season`, selo nas 16 línguas e as 4 telas) segue de pé, dormente: nenhum estilo é de época;
//   (7) frases dos 3 nas 16 línguas, escritas (não copiadas do inglês); no /trending os 3 abrem a fila com o selo New;
//   (M) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  styles: 'lib/ads/v2Styles.ts',
  contract: 'lib/ads/v2Contract.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  engines: 'lib/ads/v2Engines.ts',
  flow: 'lib/ads/v2Flow.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  trending: 'lib/trending/trendingNow.ts',
  probe: 'app/api/admin/effect-probe/route.ts',
  comp: 'components/ads/AdsStyles.tsx',
  card: 'app/trending/TrendingCard.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
}
// reancorado KINEO-TIRA-STARLIGHT-1410 — 4 → 3 (starlight_gift tirado); TOTAL 19 → 18.
const NEW = ['dolly_zoom', 'boom_drop', 'macaron_machine']
const GONE = 'starlight_gift'
const TOTAL = 18
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const NOW = new Date('2026-10-13T22:00:00Z')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); return src.split(de).join(para) }

/** Mundo: o código real, com textos trocados em memória pelo mutante (over[arquivo] = texto). */
function mundo(over = {}) {
  // Os .json que a cadeia do /trending importa entram como dado (o carregador offline só transpila .ts/.tsx).
  const json = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(read(rel))]))
  const load = createOfflineLoader({ mocks: json, source: (rel, text) => (over[rel.replace(/\\/g, '/')] !== undefined ? over[rel.replace(/\\/g, '/')] : text) })
  const txt = (rel) => (over[rel] !== undefined ? over[rel] : read(rel))
  return { L: load, txt }
}

/** O enum que a SONDA mandou à fal para cada chave ad_<estilo> (o que renderizou de verdade em 13/10). */
function probeEnums(probe) {
  const out = {}
  for (const k of NEW) {
    const m = probe.match(new RegExp(`^  ad_${k}: \\{ model: PIXVERSE, input: \\(image\\) => \\(\\{ effect: '([^']+)', image_url: image, resolution: '720p', duration: '5' \\}\\) \\},$`, 'm'))
    out[k] = m ? m[1] : null
  }
  const slug = (probe.match(/^const PIXVERSE = '([^']+)'$/m) || [])[1] || null
  return { enums: out, slug }
}

// ─── (1) catálogo ─────────────────────────────────────────────────────────────
function catalogo({ L }) {
  const S = L(F.styles)
  const C = L(F.contract)
  const SL = L(F.shots)
  const E = L(F.engines)
  const keys = S.ADS_V2_STYLES.map((s) => s.key)
  return NEW.every((k) => keys.includes(k) && S.isAdsV2Style(k)) &&
    // a contagem é a da lista real, e os 4 espelhos têm a mesma lista, na mesma ordem
    [S.ADS_V2_STYLE_KEYS, C.ADS_V2_CONTRACT_STYLES, SL.ADS_V2_PLAN_STYLES, Object.keys(E.ADS_V2_EFFECT_BY_STYLE)].every((l) => JSON.stringify(l) === JSON.stringify(keys)) &&
    keys.length === TOTAL && new Set(keys).size === keys.length &&
    // os 3 do lote fecham a lista, na ordem do lote
    JSON.stringify(keys.slice(-NEW.length)) === JSON.stringify(NEW) &&
    NEW.every((k) => { const s = S.adsV2Style(k); return s.preview === `/ads-styles/${k}.mp4` && s.poster === `/ads-styles/${k}.jpg` && S.ADS_V2_STYLE_CATEGORIES[k]?.length > 0 }) &&
    S.adsV2Style('macaron_machine').label === 'Candy machine' && /food/i.test(S.adsV2Style('macaron_machine').bestFor) && S.ADS_V2_STYLE_CATEGORIES.macaron_machine.includes('food')
}

// ─── (2) enum = o da sonda, no mesmo endpoint ─────────────────────────────────
function enumDaSonda({ L, txt }) {
  const S = L(F.styles)
  const E = L(F.engines)
  const T = L(F.tiers)
  const { enums, slug } = probeEnums(txt(F.probe))
  return NEW.every((k) => {
    const want = enums[k]
    if (!want) return false
    const built = E.buildShotInput('pixverse_effect', { imageUrl: 'https://example.supabase.co/storage/v1/object/public/x/p.jpg', prompt: '', effect: k })
    return S.adsV2Style(k).effect === want && E.ADS_V2_EFFECT_BY_STYLE[k] === want &&
      JSON.stringify(built) === JSON.stringify({ effect: want, image_url: 'https://example.supabase.co/storage/v1/object/public/x/p.jpg', resolution: '720p', duration: '5' })
  }) && !!slug && S.ADS_V2_STYLE_ENDPOINT === slug && T.ADS_V2_ENGINES.pixverse_effect.slug === slug
}

// ─── (3) o servidor aceita ────────────────────────────────────────────────────
const PB = (extra) => ({ order_id: U(9), sector: 'restaurant', logo_footage_id: U(8), photos: [1, 2, 3].map((n) => ({ footage_id: U(n), kind: 'product' })), ...extra })
const FOTOS = [1, 2, 3].map((n) => ({ id: U(n), url: `https://example.supabase.co/storage/v1/object/public/x/${n}.jpg`, kind: 'product' }))
function servidorAceita({ L }) {
  const C = L(F.contract)
  const SL = L(F.shots)
  return NEW.every((k) => {
    const r = C.sanitizePlanBody(PB({ style: k }))
    const plan = SL.planShots({ sector: 'restaurant', tier: 'commercial', photos: FOTOS, seconds: 15, style: k })
    return r.ok && r.value.style === k && SL.isAdsV2PlanStyle(k) && plan.style === k && plan.shots.filter((s) => s.effect === k).length === 1
  }) && C.sanitizePlanBody(PB({ style: 'starlight' })).error === 'bad_style' && C.sanitizePlanBody(PB({ style: 'Starlight Gift Box' })).error === 'bad_style'
}

// ─── (4) prévias de verdade ───────────────────────────────────────────────────
function previas({ L }) {
  const S = L(F.styles)
  const tamanhos = S.ADS_V2_STYLES.filter((s) => !NEW.includes(s.key)).map((s) => fs.statSync(path.join(ROOT, 'public', s.preview)).size)
  const teto = Math.max(...tamanhos) * 1.25
  return NEW.every((k) => {
    const s = S.adsV2Style(k)
    const mp4p = path.join(ROOT, 'public', s.preview)
    const jpgp = path.join(ROOT, 'public', s.poster)
    if (!fs.existsSync(mp4p) || !fs.existsSync(jpgp)) return false
    const mp4 = fs.readFileSync(mp4p)
    const jpg = fs.readFileSync(jpgp)
    return mp4.length > 20000 && mp4.length <= teto && mp4.subarray(4, 8).toString() === 'ftyp' && mp4.indexOf('moov') < mp4.indexOf('mdat') &&
      jpg.length > 3000 && jpg[0] === 0xff && jpg[1] === 0xd8
  })
}

// ─── (5) starlight_gift ausente — catálogo, espelhos, telas e servidor ────────
// reancorado KINEO-TIRA-STARLIGHT-1410 — antes esta regra provava o selo de época do starlight_gift; agora prova que ele saiu.
function starlightAusente({ L }) {
  const S = L(F.styles)
  const C = L(F.contract)
  const SL = L(F.shots)
  const E = L(F.engines)
  const FL = L(F.flow)
  const T = L(F.trending)
  const has = (o) => Object.prototype.hasOwnProperty.call(o, GONE)
  const catalogo = !S.ADS_V2_STYLES.some((s) => s.key === GONE || s.effect === 'Starlight Gift Box') && !S.isAdsV2Style(GONE) &&
    ![S.ADS_V2_STYLE_KEYS, C.ADS_V2_CONTRACT_STYLES, SL.ADS_V2_PLAN_STYLES, Object.keys(E.ADS_V2_EFFECT_BY_STYLE), Object.keys(FL.ADS_V2_STYLE_TINT)].some((l) => l.includes(GONE)) &&
    !Object.values(E.ADS_V2_EFFECT_BY_STYLE).includes('Starlight Gift Box') &&
    !has(S.ADS_V2_STYLE_CATEGORIES) && !S.adsV2StylesIn('all').includes(GONE) &&
    LANGS.every((l) => !has(S.ADS_V2_STYLE_COPY[l].styles) && !Object.values(S.ADS_V2_STYLE_COPY[l].styles).some((x) => x.label === 'Starlit gift')) &&
    !has(T.ADS_STYLE_RELEASED) && !T.adStyleCards(NOW, true).some((c) => c.key === GONE) &&
    JSON.stringify(FL.adsV2StyleTint(GONE)) === JSON.stringify(FL.ADS_V2_FLOW_AUTO_TINT)
  // o servidor recusa: contrato do /plan = bad_style; o plano não ganha efeito; o builder da fal lança antes de qualquer POST
  const plan = SL.planShots({ sector: 'restaurant', tier: 'commercial', photos: FOTOS, seconds: 15, style: GONE })
  let lancou = false
  try { E.buildShotInput('pixverse_effect', { imageUrl: 'https://example.supabase.co/storage/v1/object/public/x/p.jpg', prompt: '', effect: GONE }) } catch (e) { lancou = /ads_v2_effect_without_style/.test(String(e && e.message)) }
  const servidor = C.sanitizePlanBody(PB({ style: GONE })).error === 'bad_style' && !SL.isAdsV2PlanStyle(GONE) &&
    plan.style !== GONE && !plan.shots.some((s) => s.effect === GONE) && lancou
  // as prévias saíram do repositório
  const arquivos = !fs.existsSync(path.join(ROOT, 'public/ads-styles', GONE + '.mp4')) && !fs.existsSync(path.join(ROOT, 'public/ads-styles', GONE + '.jpg'))
  return catalogo && servidor && arquivos
}

// ─── (6) o mecanismo de época segue de pé, dormente ───────────────────────────
function epocaDormente({ L, txt }) {
  const S = L(F.styles)
  const comp = txt(F.comp)
  const card = txt(F.card)
  const batch = txt(F.batch)
  return S.ADS_V2_STYLES.every((s) => s.season === undefined) &&
    LANGS.every((l) => typeof S.ADS_V2_STYLE_COPY[l].seasonTag === 'string' && S.ADS_V2_STYLE_COPY[l].seasonTag.trim().length > 0) &&
    S.ADS_V2_STYLE_COPY.en.seasonTag === 'Holiday' && LANGS.filter((l) => l !== 'en').every((l) => S.ADS_V2_STYLE_COPY[l].seasonTag !== 'Holiday') &&
    // as telas: seletor (16 línguas), faixa pública (inglês), /trending e o lote — o selo continua condicionado a `season`
    comp.includes("s.season === 'holiday' ? copy.seasonTag : null") && comp.includes('{season ? <span className="kst-season" data-season="holiday">{season}</span> : null}') &&
    comp.includes(`{s.season === 'holiday' ? <span className="kst-season" data-season="holiday">Holiday</span> : null}`) &&
    card.includes("adsV2Style(card.key).season === 'holiday' ? adsV2StyleCopy(language).seasonTag : null") && card.includes('{seasonTag ? <span className="tr-badge tr-badge-season" data-season="holiday">{seasonTag}</span> : null}') &&
    batch.includes("s.season === 'holiday' ? `${s.label} · Holiday` : s.label")
}

// ─── (7) frases nas 16 línguas e o /trending ──────────────────────────────────
function frasesETrending({ L }) {
  const S = L(F.styles)
  const T = L(F.trending)
  const frases = LANGS.every((l) => NEW.every((k) => ['label', 'bestFor', 'oneLine'].every((x) => typeof S.ADS_V2_STYLE_COPY[l].styles[k]?.[x] === 'string' && S.ADS_V2_STYLE_COPY[l].styles[k][x].trim()))) &&
    LANGS.filter((l) => l !== 'en').every((l) => NEW.every((k) => S.ADS_V2_STYLE_COPY[l].styles[k].oneLine !== S.ADS_V2_STYLE_COPY.en.styles[k].oneLine)) &&
    NEW.every((k) => S.ADS_V2_STYLE_COPY.en.styles[k].oneLine === S.adsV2Style(k).oneLine && S.ADS_V2_STYLE_COPY.en.styles[k].label === S.adsV2Style(k).label && S.ADS_V2_STYLE_COPY.en.styles[k].bestFor === S.adsV2Style(k).bestFor)
  const cards = T.adStyleCards(NOW, true)
  const topo = cards.slice(0, NEW.length)
  const trending = NEW.every((k) => T.ADS_STYLE_RELEASED[k] === '2026-10-13') && topo.map((c) => c.key).join() === NEW.join() && topo.every((c) => c.badge === 'new' && c.video === `/ads-styles/${c.key}.mp4`) &&
    cards.length === S.ADS_V2_STYLES.length && cards.length === TOTAL
  return frases && trending
}

const REGRAS = [
  ['(1) as 3 chaves no catálogo, com prévia, nos 4 espelhos; a lista real tem 18 estilos', catalogo],
  ['(2) o enum mandado à fal (catálogo, v2Engines e buildShotInput) = o da sonda ad_* que renderizou, no mesmo endpoint', enumDaSonda],
  ['(3) o servidor aceita os 3 (contrato do /plan, isAdsV2PlanStyle e planShots); chave inventada = bad_style', servidorAceita],
  ['(4) prévias .mp4 (MP4, faststart) e .jpg (JPEG) existem, não vazias, no peso das prévias de antes', previas],
  ['(5) starlight_gift ausente: catálogo, espelhos, categorias, cores, 16 línguas, /trending; servidor recusa; prévias fora do repo', starlightAusente],
  ['(6) mecanismo de época dormente: nenhum estilo é de época; selo nas 16 línguas e as 4 telas seguem condicionadas a `season`', epocaDormente],
  ['(7) frases dos 3 nas 16 línguas (escritas, não copiadas); no /trending os 3 abrem a fila de estilos com o selo New', frasesETrending],
]
console.log('KINEO-ESTILOS-DIA1-2026-10-13 · KINEO-TIRA-STARLIGHT-1410')
const real = mundo()
for (const [nome, regra] of REGRAS) ok(tenta(() => regra(real)), nome)

// ─── (M) mutantes ─────────────────────────────────────────────────────────────
function mutante(nome, rel, de, para, regra) {
  const original = read(rel)
  let mudado
  try { mudado = trocar(original, de, para) } catch (e) { ok(false, `(M) ${nome}: ${e.message}`); return }
  const aplicou = mudado !== original && mudado.includes(para)
  const verde = tenta(() => regra(mundo({ [rel]: mudado })))
  ok(aplicou && !verde, `(M) ${nome} → vermelho (aplicou: ${aplicou})`)
}
const MACARON = "  { key: 'macaron_machine', effect: 'Macaron Machine', label: 'Candy machine', oneLine: 'Your product fills a pastel candy machine that bursts open.', bestFor: 'Food, sweets, snacks', ...asset('macaron_machine') },\n"
const STARLIGHT_DE_VOLTA = "  { key: 'starlight_gift', effect: 'Starlight Gift Box', label: 'Starlit gift', oneLine: 'A snowy holiday scene with lights and a reindeer, with your product as the gift.', bestFor: 'Holiday and gift season', season: 'holiday', ...asset('starlight_gift') },\n"
mutante('enum do boom_drop com a caixa trocada no espelho de v2Engines', F.engines, "  boom_drop: 'BOOM DROP',", "  boom_drop: 'Boom Drop',", enumDaSonda)
mutante('contrato do /plan sem o macaron_machine', F.contract, ", 'boom_drop', 'macaron_machine']", ", 'boom_drop']", servidorAceita)
mutante('prévia do macaron_machine apontando para outro arquivo', F.styles, "const asset = (key: AdsV2StyleKey) => ({ preview: `/ads-styles/${key}.mp4`", "const asset = (key: AdsV2StyleKey) => ({ preview: `/ads-styles/${key === 'macaron_machine' ? 'macaron' : key}.mp4`", catalogo)
mutante('/trending sem a data de lançamento do dolly_zoom', F.trending, "  dolly_zoom: '2026-10-13', ", '  ', frasesETrending)
// reancorado KINEO-TIRA-STARLIGHT-1410 — a ausência fica vermelha se o starlight_gift voltar por qualquer porta
mutante('starlight_gift de volta ao catálogo', F.styles, MACARON, MACARON + STARLIGHT_DE_VOLTA, starlightAusente)
mutante('starlight_gift de volta ao contrato do /plan (validação do servidor)', F.contract, ", 'boom_drop', 'macaron_machine']", ", 'boom_drop', 'macaron_machine', 'starlight_gift']", starlightAusente)
mutante('starlight_gift de volta ao espelho de v2Engines (enum para a fal)', F.engines, "  macaron_machine: 'Macaron Machine',\n", "  macaron_machine: 'Macaron Machine',\n  starlight_gift: 'Starlight Gift Box',\n", starlightAusente)
mutante('starlight_gift de volta ao /trending', F.trending, " macaron_machine: '2026-10-13',", " macaron_machine: '2026-10-13', starlight_gift: '2026-10-13',", starlightAusente)
mutante('estilo de época de volta (selo em um dos 3)', F.styles, "bestFor: 'Food, sweets, snacks', ...asset('macaron_machine')", "bestFor: 'Food, sweets, snacks', season: 'holiday', ...asset('macaron_machine')", epocaDormente)

console.log(`\ntest-estilos-dia1-1310: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
