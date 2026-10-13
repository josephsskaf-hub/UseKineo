// KINEO-ANUNCIO-CONSERTOS-2026-10-12 — guardião dos consertos do Studio Ads achados nos 10 anúncios de amostra para marcas
// (12/10, relatório "prospects-2026-10-12.md", seção Problemas). Roda com `node scripts/test-anuncio-consertos-1210.mjs`, sem
// rede, sem banco, sem alias '@/' no próprio guardião (as libs são transpiladas pelo carregador offline, com stubs).
//
// O que ele prova, item a item do pedido do fundador ("vai anúncio"):
//   1. NARRAÇÃO HONESTA — os casos REAIS: "Feel the refreshing glow in Toronto today!", "Treat yourself today in
//      Australian!", "made in British", "inspired by Japanese baths in London" e "transforms your skin"/"sustainable" sem o
//      cliente ter escrito são RECUSADOS pela régua e CONSERTADOS em código; o pedido ao modelo leva a regra; o anúncio de
//      produto deixa de EXIGIR lugar; a extração executada (OpenAI falsa) sai consertada.
//   2. TEXTO EDITÁVEL — contrato, régua de palavras da duração, janelas do plano, rota sem modelo, tela com um campo por frase.
//   3. LINK — foto DECLARADA do produto primeiro (JSON-LD/og:type/Shopify), logo fora, WebP aceito, o porquê da página que
//      não abre (bloqueou/não existe) e o JSON do Shopify quando a página barra a leitura — com as travas anti-SSRF de sempre.
//   4. FOTO DO LINK sem o aviso de "cópia de app de conversa".
//   5. CARTÃO FINAL com a cor da foto do produto, fundo na cor da marca e o site do link (nada inventado).
//   6. TELA: kit de outra marca desmarca o "Save as my brand kit"; nível lembrado; texto genérico dos fatos; "Get photos"
//      vazio avisa; o que se digita sobrevive.
//   7. FRASES DE TELA no terço de baixo no anúncio de produto sem ator (o centro de sempre fica byte a byte).
// Mutantes no fim: a mesma verificação contra o código alterado TEM de ficar vermelha.
import fs from 'node:fs'
import path from 'node:path'
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
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70))
  const out = src.split(de).join(para)
  if (out === src || !out.includes(para)) throw new Error('mutante não aplicou: ' + de.slice(0, 70))
  return out
}

const F = {
  honesty: 'lib/ads/v2Honesty.ts',
  brief: 'lib/ads/v2Brief.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  contract: 'lib/ads/v2Contract.ts',
  ordersRoute: 'app/api/ads/v2/orders/route.ts',
  planRoute: 'app/api/ads/v2/plan/route.ts',
  linkRoute: 'app/api/ads/v2/link-import/route.ts',
  linkReader: 'lib/ads/linkReader.ts',
  linkImport: 'lib/ads/v2LinkImport.ts',
  v2Link: 'lib/ads/v2Link.ts',
  ux: 'lib/ads/v2SimpleUx.ts',
  simpleLib: 'lib/ads/v2Simple.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  endCard: 'lib/ads/endCard.ts',
  montage: 'lib/ads/adV2Montage.ts',
  advance: 'lib/ads/v2Advance.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — re-ancorado: o corpo do /plan foi EXTRAÍDO, sem mudar uma linha, para lib/ads/v2PlanCore.ts
// (a rota só lê o cookie e chama o núcleo). Leitura do /plan = rota + núcleo, na ordem em que rodam.
SRC.planRoute = `${SRC.planRoute}\n${read('lib/ads/v2PlanCore.ts')}`
const mundo = (over = {}, mocks = {}, globals = {}) => createOfflineLoader({ mocks, globals, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const pura = (over = {}) => mundo(over)

// ═══ 1. NARRAÇÃO HONESTA ═════════════════════════════════════════════════════════════════════════════════════════════
const H = pura()(F.honesty)
const fonte = (source, extra = {}) => ({ source, typed: source, product: true, places: [], ...extra })
const casos = {
  toronto: { t: 'Feel the refreshing glow in Toronto today!', h: fonte('hydratone 3-in-1 essence by Graydon, made in Toronto', { places: ['Toronto'] }), fixed: 'Feel the refreshing glow today!' },
  australian: { t: 'Treat yourself today in Australian!', h: fonte('Garshana Soft Face Brush, an Australian brand'), fixed: 'Treat yourself today!' },
  british: { t: 'A watch made in British. Petite and bold.', h: fonte('Votch Rose Gold Petite watch, Brighton', { places: ['Brighton'] }), fixed: 'A watch made in the UK. Petite and bold.' },
  london: { t: 'Inspired by Japanese baths in London. Light it tonight.', h: fonte('Onsen candle by Earl of East, London', { places: ['London'] }), fixed: 'Inspired by Japanese baths. Light it tonight.' },
  skin: { t: 'Meet hydratone by Graydon. It transforms your skin.', h: fonte('hydratone essence by Graydon'), fixed: 'Meet hydratone by Graydon.' },
}
for (const [k, c] of Object.entries(casos)) {
  const why = H.honestyIssues(c.t, c.h, 'narration')
  const r = H.repairHonesty(c.t, c.h)
  ok(why.length > 0 && r.text === c.fixed && r.fixes.length > 0 && H.honestyIssues(r.text, c.h, 'narration').length === 0,
    `1a caso real "${c.t}" (${k}): recusado pela régua e consertado em código → "${c.fixed}"`)
}
ok(H.unsupportedClaims('A sustainable choice for your mornings.', fonte('Harbour Roast coffee')).length === 1 &&
  H.unsupportedClaims('Organic matcha, first flush.', fonte('Organic First Flush Uji Matcha')).length === 0 &&
  H.unsupportedClaims('It transforms your skin.', fonte('the essence that transforms your skin')).length === 0 &&
  ['eco-friendly', 'all-natural', 'vegan', 'cruelty-free', 'handmade', 'clinically proven', 'dermatologist tested', 'guaranteed', 'award-winning'].every((w) => H.unsupportedClaims(`It is ${w}.`, fonte('a candle')).length === 1),
'1b alegação só passa se estiver na fonte do cliente: "sustainable" sem fonte cai; "organic" escrito pelo cliente passa; a lista cobre eco/natural/vegan/handmade/clínico/garantia/prêmio')
ok(H.unsupportedClaims('It helps reduce inflammation.', { source: 'Matcha. From the product page: helps reduce inflammation', typed: 'Uji matcha tin' }).length === 1 &&
  H.unsupportedClaims('It helps reduce inflammation.', { source: 'x', typed: 'matcha that helps reduce inflammation' }).length === 0,
'1c alegação de SAÚDE só vale se o cliente DIGITOU — copiada da página do produto (caso Pluck, "reduce inflammation") é recusada')
ok(['Roasted in Saint John, from East Coast Roasts.', 'Made in British Columbia.', 'Narrated in Japanese for you.', 'Proudly from Toronto.', 'A Toronto-based brand.']
  .every((t) => H.honestyIssues(t, fonte('x', { places: ['Saint John', 'Toronto'] }), 'n').length === 0),
'1d o lugar em forma NATURAL passa ("roasted in Saint John", "from Toronto", "Toronto-based", "British Columbia", "in Japanese" como língua)')
ok(H.isDemonym('British') && H.isDemonym('australian') && !H.isDemonym('Toronto') && H.ADS_V2_DEMONYMS.british === 'the UK',
  '1e adjetivo de nacionalidade reconhecido (nunca é lugar a exigir) e mapeado ao país')

// O pedido ao modelo e a régua do v2Brief (OpenAI desligada para as funções puras).
const briefWorld = (over = {}, openai = {}) => mundo(over, { '@/lib/openai': { openai } })(F.brief)
const B = briefWorld()
const BRIEF = { business: 'Graydon — hydratone 3-in-1 essence', offer: '', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }
const HON = { source: 'hydratone 3-in-1 essence by Graydon, made in Toronto', typed: 'hydratone 3-in-1 essence by Graydon, made in Toronto', product: true, places: ['Toronto'] }
await check('1f pedido de texto: COM a fonte do cliente leva a regra de honestidade e (produto) a regra do lugar; SEM, nenhuma linha nova (o modo completo byte a byte)', () => {
  const com = B.buildV2CopyMessages(BRIEF, 'English', { maxWords: 30, narration: true, honesty: HON }).system
  const sem = B.buildV2CopyMessages(BRIEF, 'English', { maxWords: 30, narration: true }).system
  return com.includes(H.ADS_V2_HONESTY_RULE) && com.includes('places are optional in a product ad') && com.includes('"Toronto"') && /made in the UK/.test(com) &&
    !sem.includes(H.ADS_V2_HONESTY_RULE) && !sem.includes('places are optional')
})
const copia = (narration, overlays = ['Graydon hydratone', '3-in-1 essence']) => JSON.stringify({ narration, overlays, sector: 'store' })
await check('1g régua (checkV2Copy) com a fonte: "glow in Toronto today" e "transforms your skin" RECUSADOS com o motivo; sem a fonte, a régua de sempre', () => {
  const ruim = B.checkV2Copy(copia('Meet hydratone, the 3-in-1 essence by Graydon. Feel the refreshing glow in Toronto today! It transforms your skin.'), BRIEF, { maxWords: 30, narration: true, honesty: HON })
  const bom = B.checkV2Copy(copia('Meet hydratone, the 3-in-1 essence by Graydon. A light mist for your morning routine, made in Toronto.'), BRIEF, { maxWords: 30, narration: true, honesty: HON })
  const semFonte = B.checkV2Copy(copia('Meet hydratone, the 3-in-1 essence by Graydon. Feel the refreshing glow in Toronto today! It transforms your skin.'), BRIEF, { maxWords: 30, narration: true })
  return !ruim.ok && ruim.why.some((w) => /Toronto/.test(w)) && ruim.why.some((w) => /transforms/.test(w)) && bom.ok && semFonte.ok
})

// extractAdsV2Brief EXECUTADA com a OpenAI falsa (1 extração + texto + 1 correção; o conserto em código no fim).
function openaiFalsa(respostas) {
  const log = []
  const fila = respostas.slice()
  return { log, chat: { completions: { create: async (body) => { log.push(body); const next = fila.shift(); return { choices: [{ message: { content: typeof next === 'string' ? next : JSON.stringify(next ?? {}) } }] } } } } }
}
const BRIEF_RAW = { business: 'Graydon — hydratone 3-in-1 essence', offer: '', cta: 'buy', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
const FRASE = 'hydratone 3-in-1 essence by Graydon, made in Toronto'
const RUIM = 'Meet hydratone, the 3-in-1 essence by Graydon. Feel the refreshing glow in Toronto today! It transforms your skin.'
const extrai = async (respostas, over = {}, extra = {}) => {
  const oa = openaiFalsa([BRIEF_RAW, ...respostas])
  const M = briefWorld(over, oa)
  const r = await M.extractAdsV2Brief({ text: FRASE, language: 'en', languageName: 'English', maxWords: 30, narration: true, facts: [], sentence: FRASE, productPhoto: true, ...extra })
  return { r, log: oa.log }
}
const extracaoConsertada = async (over) => {
  const { r, log } = await extrai([JSON.parse(copia(RUIM)), JSON.parse(copia(RUIM))], over)
  const sys = log[1]?.messages?.[0]?.content ?? ''
  const correcao = log[2]?.messages?.at(-1)?.content ?? ''
  return r.ok && r.copy.narration === 'Meet hydratone, the 3-in-1 essence by Graydon. Feel the refreshing glow today!' && Array.isArray(r.honestyFixes) && r.honestyFixes.length >= 2 &&
    sys.includes(H.ADS_V2_HONESTY_RULE) && sys.includes('places are optional in a product ad') && !/say each of these names/.test(sys) &&
    /Toronto/.test(correcao) && /transforms/.test(correcao) && r.ad?.product === true && JSON.stringify(r.voice?.names) === '[]'
}
await check('1h extração EXECUTADA (anúncio de produto): o pedido leva as regras e NÃO exige o lugar; a resposta inventada volta com o motivo; a 2ª igual sai CONSERTADA em código ("glow today", sem "transforms")', () => extracaoConsertada())
await check('1i honestidade continua dura: 2ª resposta com NÚMERO inventado não é "consertada" — recusa (stage copy)', async () => {
  const { r } = await extrai([JSON.parse(copia(RUIM)), JSON.parse(copia('Meet hydratone by Graydon, loved by 500 customers. It transforms your skin.'))])
  return !r.ok && r.stage === 'copy' && r.why.some((w) => /500/.test(w))
})
await check('1j a rota /plan passa o que a pessoa DIGITOU (typed, antes da página do link) e grava os consertos no evento do plano', () => {
  const s = code(SRC.planRoute)
  return ordem(s, 'const typed = text', 'let pageLang', 'From the product page', 'const extracted = await extractAdsV2Brief({', 'typed,', '})') &&
    /if \(extracted\.ok && extracted\.honestyFixes\) Object\.assign\(modeTag, \{ honesty_fixes: extracted\.honestyFixes \}\)/.test(s)
})

// ═══ 2. TEXTO EDITÁVEL (modo simples) ════════════════════════════════════════════════════════════════════════════════
const C = pura()(F.contract)
const U = '11111111-2222-4333-8444-555555555555'
ok(C.sanitizePatchBody({ order_id: U, narration_text: '  Meet   hydratone.  ' }).value?.narration_text === 'Meet hydratone.' &&
  C.sanitizePatchBody({ order_id: U, overlay_texts: ['Graydon', ''] }).value?.overlay_texts.join('|') === 'Graydon|' &&
  C.sanitizePatchBody({ order_id: U, overlay_texts: ['x'.repeat(43)] }).error === 'overlay_too_long' &&
  C.sanitizePatchBody({ order_id: U, overlay_texts: ['a', 'b', 'c', 'd'] }).error === 'bad_overlay_texts' &&
  C.sanitizePatchBody({ order_id: U, narration_text: 5 }).error === 'bad_narration_text' && C.sanitizePatchBody({ order_id: U, narration_text: '   ' }).error === 'bad_narration_text' &&
  C.sanitizePatchBody({ order_id: U }).error === 'nothing_to_change' && C.sanitizePatchBody({ order_id: U, narration: false }).value?.narration_text === null,
'2a contrato do PATCH: texto da voz e frases de tela (espaços colapsados, até 3 frases de até 42 caracteres, vazio = tirar); nada = nothing_to_change')
{
  const shots = read(F.shots)
  ok(C.ADS_V2_EDIT_OVERLAY_MAX_CHARS === Number(/export const ADS_V2_OVERLAY_MAX_CHARS = (\d+)/.exec(shots)?.[1]) && C.ADS_V2_EDIT_NARRATION_WORDS_15 === Number(/export const ADS_V2_NARRATION_WORDS_15 = (\d+)/.exec(shots)?.[1]) &&
    /ADS_V2_EDIT_DEFAULT_LIMITS = \{ narrationWords: 30, overlayChars: 42 \}/.test(SRC.ux),
  '2b espelhos: 42 caracteres por frase e 30 palavras em 15 s (lib/ads/v2ShotLists.ts) no contrato e na tela')
}
const PLAN = { shots: [{ idx: 0 }], narration: 'Meet hydratone by Graydon.', overlays: [{ role: 'brand', start: 0, end: 4, text: 'Graydon' }, { role: 'offer', start: 5, end: 9, text: '3-in-1 essence' }] }
ok((() => {
  const a = C.applyAdsV2CopyEdit(PLAN, 15, { narration_text: 'Meet hydratone, made in Toronto.', overlay_texts: ['Graydon hydratone', ''] })
  const longa = C.applyAdsV2CopyEdit(PLAN, 15, { narration_text: Array.from({ length: 31 }, () => 'word').join(' '), overlay_texts: null })
  const vinte = C.applyAdsV2CopyEdit(PLAN, 20, { narration_text: Array.from({ length: 40 }, () => 'word').join(' '), overlay_texts: null })
  return a.ok && a.plan.narration === 'Meet hydratone, made in Toronto.' && a.plan.overlays.length === 1 && a.plan.overlays[0].text === 'Graydon hydratone' && a.plan.overlays[0].start === 0 && a.plan.overlays[0].end === 4 &&
    PLAN.overlays.length === 2 && !longa.ok && longa.error === 'narration_too_long' && longa.status === 400 && longa.extra.max_words === 30 && vinte.ok &&
    C.applyAdsV2CopyEdit(PLAN, 15, { narration_text: null, overlay_texts: ['a'] }).error === 'overlays_mismatch' &&
    C.applyAdsV2CopyEdit(null, 15, { narration_text: 'x', overlay_texts: null }).error === 'plan_required' && C.applyAdsV2CopyEdit(PLAN, 15, { narration_text: null, overlay_texts: null }) === null
})(), '2c edição aplicada ao plano: voz até 30 palavras em 15 s (40 em 20 s), frases nas MESMAS janelas, vazia sai, plano original intocado; sem plano = 409')
ok((() => {
  const s = code(SRC.ordersRoute)
  const patch = s.slice(s.indexOf('export async function PATCH('))
  return ordem(patch, "if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)", 'const copyEdit = applyAdsV2CopyEdit(order.plan, order.seconds, p)', 'if (copyEdit?.ok) patch.plan = copyEdit.plan', ".in('status', ['draft', 'planned'])", 'plan_narration: copyEdit.plan.narration') &&
    !/openai|extractAdsV2Brief|chargeAds|video_credits|adsV2Credits\(/.test(patch)
})(), '2d rota PATCH: só rascunho/planejado, UPDATE condicional, sem modelo, sem crédito (editar é grátis); devolve o texto gravado')
ok((() => {
  const s = code(SRC.simple)
  return /data-kineo="ads-copy-edit"/.test(s) && /'\/api\/ads\/v2\/orders', \{ method: 'PATCH', body \}/.test(s) && /body\.narration_text = narr/.test(s) && /body\.overlay_texts = copyEdit\.overlays/.test(s) &&
    /disabled=\{busy !== null \|\| cost === null \|\| short > 0 \|\| !!editor\?\.edit\}/.test(s) && /if \(copyEdit\) \{\s*setPlanError\(fix\.saveFirst\)/.test(s) &&
    /maxLength=\{editor\.limits\.overlay_chars\}/.test(s) && /fill\(editor\.fix\.words, \{ n: adsV2CountWords\(editor\.edit\.narration\), max: editor\.limits\.narration_words \}\)/.test(s) &&
    /edit_limits: \{ narration_words: maxWords, overlay_chars: ADS_V2_OVERLAY_MAX_CHARS \}/.test(code(SRC.planRoute))
})(), '2e tela: um campo por frase (limite de caracteres) e a voz com contador de palavras; salvar = PATCH; "Make my ad" travado enquanto edita')

// ═══ 3. LINK DO PRODUTO ══════════════════════════════════════════════════════════════════════════════════════════════
const LR = pura()(F.linkReader)
const LI = pura()(F.linkImport)
ok((() => {
  const ld = '<script type="application/ld+json">{"@type":"Product","name":"Garshana","image":["https://cdn.x.com/p/brush.jpg"]}</script>'
  const og = '<meta property="og:type" content="product"><meta property="og:image" content="https://cdn.x.com/p/hero.jpg">'
  const soOg = '<meta property="og:type" content="website"><meta property="og:image" content="https://cdn.x.com/share/logo-banner.jpg">'
  return LR.productPageImages(`<html><head>${ld}${og}</head><body><img src="https://cdn.x.com/team/founder.jpg" width="900"><img src="https://cdn.x.com/p/axilla.jpg" width="900"></body></html>`, 'https://shop.x.com/products/garshana').join() === 'https://cdn.x.com/p/brush.jpg' &&
    LR.productPageImages(`<head>${og}</head>`, 'https://shop.x.com/p').join() === 'https://cdn.x.com/p/hero.jpg' && LR.productPageImages(`<head>${soOg}</head>`, 'https://shop.x.com/p').length === 0
})(), '3a foto DECLARADA do produto: JSON-LD Product.image (a pessoa e o "outro pote" das <img> soltas ficam de fora); sem JSON-LD, og:image só com og:type=product')
ok(LR.shopifyProductJsonUrl('https://blackchicken.com.au/products/garshana-soft-face-brush') === 'https://blackchicken.com.au/products/garshana-soft-face-brush.json' &&
  LR.shopifyProductJsonUrl('https://x.com/collections/all/products/hydratone?variant=1') === 'https://x.com/products/hydratone.json' && LR.shopifyProductJsonUrl('https://x.com/p/tenis') === null &&
  LR.isShopifyHtml('<link href="//cdn.shopify.com/s/files/x.css">') && !LR.isShopifyHtml('<html></html>') &&
  (() => { const p = LR.shopifyProductFromJson(JSON.stringify({ product: { title: 'hydratone', vendor: 'Graydon', body_html: '<p>3-in-1 <b>essence</b></p>', variants: [{ price: '42.00' }], images: [{ src: 'https://cdn.shopify.com/s/files/1/hydratone.webp' }, { src: 'javascript:x' }] } })); return p && p.title === 'hydratone' && p.vendor === 'Graydon' && p.description === '3-in-1 essence' && p.price === '42.00' && p.images.length === 1 })() &&
  LR.shopifyProductFromJson('not json') === null,
'3b Shopify: /products/<handle> → o JSON público na MESMA origem; o JSON lido só pelo que diz (título, marca, descrição, preço, fotos http)')
ok(LR.preferJpegUrl('https://cdn.shopify.com/s/files/1/hydratone.webp?v=1') === 'https://cdn.shopify.com/s/files/1/hydratone.webp?v=1&format=jpg' && LR.preferJpegUrl('https://x.com/cdn/shop/files/a.webp') === 'https://x.com/cdn/shop/files/a.webp?format=jpg' &&
  LR.preferJpegUrl('https://cdn.x.com/a.webp') === 'https://cdn.x.com/a.webp' && LR.preferJpegUrl('https://cdn.shopify.com/a.jpg') === 'https://cdn.shopify.com/a.jpg' &&
  LR.imageFileKey('https://x.com/cdn/shop/files/Harbour.jpg?v=2&width=1920') === LR.imageFileKey('https://cdn.shopify.com/s/files/1/0/files/Harbour.jpg?v=2'),
'3c WebP do CDN do Shopify pedido em JPG ao próprio CDN; a mesma foto em dois endereços (tema e JSON) conta uma vez')
ok(LI.adsV2ImageKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === 'webp' && LI.adsV2ImageExt(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === null &&
  LI.adsV2LinkFailWhy(403, false) === 'blocked' && LI.adsV2LinkFailWhy(429, false) === 'blocked' && LI.adsV2LinkFailWhy(404, false) === 'not_found' && LI.adsV2LinkFailWhy(null, false) === 'unreachable' && LI.adsV2LinkFailWhy(200, true) === 'not_html' &&
  LI.ADS_V2_LINK_WEBP_INLINE_MAX_BYTES <= 1_500_000 && LI.ADS_V2_LINK_WEBP_INLINE_TOTAL_BYTES <= 2_600_000,
'3d WebP reconhecido pelos BYTES (o bucket segue só JPG/PNG: adsV2ImageExt intocado); o porquê da falha: bloqueou / não existe / não é página; teto do WebP embutido')

// A rede (lib/ads/v2Link.ts) com fetch e DNS falsos: página Shopify que BARRA a leitura (403) → o JSON do produto salva.
const JPG = (n) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b }
const WEBP = (n) => { const b = new Uint8Array(n); b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]); return b }
function internet(site, dns = {}) {
  const calls = []
  const fetch = async (u) => {
    const url = String(u)
    calls.push(url)
    const r = site[url]
    if (!r) return new Response('nao achou', { status: 404 })
    if (r.status) return new Response('barrado', { status: r.status })
    if (r.json) return new Response(JSON.stringify(r.json), { status: 200, headers: { 'content-type': 'application/json' } })
    if (r.html) return new Response(r.html, { status: 200, headers: { 'content-type': 'text/html' } })
    return new Response(r.bytes, { status: 200, headers: { 'content-type': r.type ?? 'image/jpeg' } })
  }
  const lookup = async (host) => { const d = { 'graydon.example.com': '93.184.216.40', 'cdn.shopify.com': '93.184.216.41', 'interno.example.com': '10.0.0.8', ...dns }; if (!(host in d)) throw new Error('ENOTFOUND'); return [{ address: d[host], family: 4 }] }
  return { fetch, lookup, calls }
}
const linkMundo = (net, over = {}) => mundo(over, { 'node:dns/promises': { lookup: net.lookup } }, { fetch: net.fetch, AbortSignal, Response, ReadableStream })(F.v2Link)
const GRAYDON = 'https://graydon.example.com/products/hydratone'
await check('3e página Shopify que BARRA a leitura (403): o JSON do produto traz a foto (WebP aceito); sem JSON, null com o porquê "blocked"; 404 = "not_found"', async () => {
  const net = internet({ [GRAYDON]: { status: 403 }, [`${GRAYDON}.json`]: { json: { product: { title: 'hydratone', vendor: 'Graydon', body_html: 'essence', images: [{ src: 'https://cdn.shopify.com/s/files/1/hydratone.webp' }] } } }, 'https://cdn.shopify.com/s/files/1/hydratone.webp?format=jpg': { bytes: WEBP(30_000) } })
  const r = await linkMundo(net).adsV2LinkImport(GRAYDON)
  const why = {}
  const z = await linkMundo(internet({ [GRAYDON]: { status: 403 } })).adsV2LinkImport(GRAYDON, { why })
  const nf = {}
  await linkMundo(internet({})).adsV2LinkImport('https://graydon.example.com/nada', { why: nf })
  return r && r.images.length === 1 && r.images[0].ext === 'webp' && /hydratone/.test(r.text) && r.sentence === 'hydratone — Graydon' && z === null && why.value === 'blocked' && nf.value === 'not_found'
})
await check('3f anti-SSRF intacto no caminho novo: foto do JSON do Shopify em host interno nunca é pedida; o JSON só na MESMA origem da página', async () => {
  const net = internet({ [GRAYDON]: { status: 403 }, [`${GRAYDON}.json`]: { json: { product: { title: 'x', vendor: 'y', images: [{ src: 'https://interno.example.com/a.jpg' }, { src: 'http://10.0.0.9/b.jpg' }] } } } })
  const r = await linkMundo(net).adsV2LinkImport(GRAYDON)
  return r && r.images.length === 0 && !net.calls.some((c) => /interno\.example|10\.0\.0\.9/.test(c)) && net.calls.every((c) => c.startsWith('https://graydon.example.com/'))
})
await check('3g página que DECLARA o produto: o logo (mesmo arquivo do ícone da marca) nunca entra como foto', async () => {
  const html = '<html><head><link rel="apple-touch-icon" href="https://cdn.x.example.com/brand/mark.jpg"><script type="application/ld+json">{"@type":"Product","name":"Harbour Roast","image":["https://cdn.x.example.com/brand/mark.jpg","https://cdn.x.example.com/p/harbour.jpg"]}</script></head></html>'
  const net = internet({ 'https://shop.x.example.com/products/harbour': { html }, 'https://cdn.x.example.com/p/harbour.jpg': { bytes: JPG(30_000) }, 'https://cdn.x.example.com/brand/mark.jpg': { bytes: JPG(30_000) } }, { 'shop.x.example.com': '93.184.216.50', 'cdn.x.example.com': '93.184.216.51' })
  const r = await linkMundo(net).adsV2LinkImport('https://shop.x.example.com/products/harbour')
  return r && r.images.length === 1 && r.images[0].src === 'https://cdn.x.example.com/p/harbour.jpg' && !net.calls.includes('https://cdn.x.example.com/brand/mark.jpg')
})
ok((() => {
  const s = code(SRC.linkRoute)
  return /if \(im\.ext === 'webp'\) \{ if \(im\.bytes\.byteLength > ADS_V2_LINK_WEBP_INLINE_MAX_BYTES \|\| inlineBytes \+ im\.bytes\.byteLength > ADS_V2_LINK_WEBP_INLINE_TOTAL_BYTES\) \{ skipped\+\+; continue \}/.test(s) &&
    /url: `data:image\/webp;base64,\$\{Buffer\.from\(im\.bytes\)\.toString\('base64'\)\}`/.test(s) && /return v2Fail\('link_unreachable', 422, \{ why: failWhy\.value \?\? 'unreachable' \}\)/.test(s) &&
    ordem(s, "if (im.ext === 'webp')", 'continue }', 'const path = `${uid}/clip-', 'await moderateContent({ surface: \'footage\'')
})(), '3h rota: WebP volta EMBUTIDO (nunca no bucket, com teto) e ANTES do caminho do bucket/moderação; o 422 leva o porquê')
ok((() => {
  const s = code(SRC.simple)
  return /if \(!url\) \{\s*setLinkNote\(\{ warn: true, text: fix\.linkEmpty \}\)/.test(s) && !/disabled=\{locked \|\| linkBusy \|\| !link\.trim\(\)/.test(s) &&
    /r\.body\.why === 'blocked' \? fix\.linkBlocked/.test(s) && /r\.body\.why === 'not_found' \? fix\.linkNotFound/.test(s) && /const webp = blob\.type === 'image\/webp'/.test(s)
})(), '3i tela: "Get photos" com o campo vazio AVISA (o botão não fica morto); a página que bloqueia/não existe ganha a frase certa; WebP vira arquivo e recorte')

// ═══ 4. FOTO DO LINK SEM CULPAR O CLIENTE ════════════════════════════════════════════════════════════════════════════
const UXL = pura()(F.ux)
ok((() => {
  const s = code(SRC.simple)
  return /const small = item\.fromLink \? crop\.sw < ADS_V2_LINK_SMALL_WIDTH : isSmallCrop\(crop\)/.test(s) && /item\.fromLink \? fix\?\.linkSmall \?\? copy\.files\.small : copy\.files\.small/.test(s) &&
    UXL.ADS_V2_LINK_SMALL_WIDTH === 540 && !/chat app|WhatsApp/i.test(UXL.ADS_V2_FIX_COPY.en.linkSmall) && !/WhatsApp/.test(UXL.ADS_V2_FIX_COPY.pt.linkSmall)
})(), '4a foto do link: só avisa quando REALMENTE pequena para 1080p (recorte < 540 px), com texto neutro — nunca "cópia de app de conversa"')

// ═══ 5. CARTÃO FINAL ═════════════════════════════════════════════════════════════════════════════════════════════════
ok((() => {
  const px = (r, g, b, n = 200) => Array.from({ length: n }, () => [r, g, b, 255]).flat()
  const vermelho = UXL.adsV2DominantColor([...px(200, 30, 40), ...px(250, 250, 250, 400)])
  return /^#[0-9a-f]{6}$/.test(vermelho ?? '') && parseInt(vermelho.slice(1, 3), 16) > parseInt(vermelho.slice(3, 5), 16) &&
    UXL.adsV2DominantColor(px(250, 250, 250)) === null && UXL.adsV2DominantColor(px(128, 128, 128)) === null && UXL.adsV2DominantColor(px(5, 5, 5)) === null &&
    UXL.adsV2LinkHost('https://www.eastcoastroasts.ca/products/1-pound') === 'eastcoastroasts.ca' && UXL.adsV2LinkHost(null) === '' && UXL.adsV2LinkHost('lixo') === ''
})(), '5a a cor dominante da foto do produto (fundo branco/cinza/preto ignorado) e o site do link (só o domínio)')
ok((() => {
  const s = code(SRC.simple)
  const e = code(SRC.endCard)
  return (s.match(/ctaLabel: cardCta, contact: cardContact, accent: cardAccent, brandBg: true \}\)/g) || []).length === 3 &&
    /const cardAccent = cardColor !== DEFAULT_COLOR \? cardColor : photoColor \?\? DEFAULT_COLOR/.test(s) && /const cardContact = contactT \|\| linkHost/.test(s) &&
    /const cardCta = contactT \? endCardCtaLabel\(simpleCtaKind\(contactT\), spoken\) : linkHost \? endCardCtaLabel\('buy', spoken\) : ''/.test(s) &&
    /cardSig = JSON\.stringify\(\{ title: cardTitleFinal, price: priceT, contact: cardContact, cta: cardCta, color: cardAccent/.test(s) &&
    /if \(input\.brandBg\) \{/.test(e) && /bg\.addColorStop\(0, '#0d1422'\)/.test(e) && /logo: logo\?\.footageId \?\? null/.test(s) &&
    /body = brandKitFromScreen\(\{ business: cardTitle, price: priceT, contact: contactT, color: cardColor,/.test(s)
})(), '5b cartão: cor da foto quando ninguém escolheu cor (kit/pessoa mandam), fundo na cor da marca, o site do link só quando não há contato (sem link e sem contato = sem botão); o kit salvo segue com o que a PESSOA escolheu')

// ═══ 6. PADRÕES DA TELA ══════════════════════════════════════════════════════════════════════════════════════════════
ok(UXL.brandKitIsOtherBrand('Harbour Roast', 'hydratone', 'hydratone essence by Graydon') && UXL.brandKitIsOtherBrand('Harbour Roast', 'Harbour Roast', 'hydratone essence by Graydon') &&
  !UXL.brandKitIsOtherBrand('Harbour Roast', 'Harbour Roast', '1lb Harbour Roast, Guatemala beans') && !UXL.brandKitIsOtherBrand(null, 'x', 'y') && !UXL.brandKitIsOtherBrand('Café Aurora', 'cafe aurora', ''),
'6a "outra marca": o nome do cartão difere do kit OU a frase não cita a marca do kit; sem kit = como sempre')
ok(UXL.adsV2RememberedTier(() => 'photo_motion') === 'photo_motion' && UXL.adsV2RememberedTier(() => 'turbo') === null && UXL.adsV2RememberedTier(() => { throw new Error('privado') }) === null &&
  (() => { let v = null; UXL.adsV2RememberTier((x) => { v = x }, 'cinema'); UXL.adsV2RememberTier(() => { throw new Error('x') }, 'cinema'); return v === 'cinema' })(),
'6b nível lembrado: só nível que existe; armazenamento bloqueado = como antes (nunca quebra a tela)')
ok((() => {
  const s = code(SRC.simple)
  return ordem(s, 'if (tierAutoRef.current || sample || tier !== null) return', 'const remembered = adsV2RememberedTier(() => window.localStorage.getItem(ADS_V2_TIER_MEMORY_KEY))', 'const d = adsV2DefaultTier(balance)') &&
    /onChange=\{\(\) => \{ setTier\(t\); if \(!scopy\) adsV2RememberTier\(\(v\) => window\.localStorage\.setItem\(ADS_V2_TIER_MEMORY_KEY, v\), t\) \}\}/.test(s) &&
    /const \[saveKit, setSaveKit\] = useState\(true\)/.test(s) && /if \(saveKitTouchedRef\.current\) return\s*setSaveKit\(!otherBrand\)/.test(s) && /saveKitTouchedRef\.current = true; setSaveKit\(e\.target\.checked\)/.test(s) &&
    /setKitBusiness\(typeof kit\.business === 'string'/.test(s)
})(), '6c tela: o nível lembrado vem antes do saldo (amostra não grava); "Save as my brand kit" desmarca sozinho para outra marca e o clique da pessoa manda')
ok(!/building or the area|prédio ou o bairro|edificio o la zona/.test(code(SRC.simpleLib)) && /true about your product, business or place/.test(SRC.simpleLib),
  '6d o texto dos fatos é genérico (não fala mais de "building or the area" num anúncio de café)')
ok((() => {
  const s = code(SRC.simple)
  return /const typedMemory = \{ link: '', text: '' \}/.test(s) && /useState\(\(\) => \(resume \? typedMemory\.text : ''\)\)/.test(s) && /useState\(\(\) => \(resume \? typedMemory\.link : ''\)\)/.test(s) &&
    /if \(domLink && !link\) setLink\(domLink\)/.test(s) && /ref=\{linkInputRef\}/.test(s) && /ref=\{textAreaRef\}/.test(s)
})(), '6e o que se digita sobrevive: memória da página (retomada) e o campo já escrito é ADOTADO (não apagado) quando o formulário abre; "Start over" começa vazio')
{
  const IF = pura()(F.iface)
  const codes = IF.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
  const T = UXL.ADS_V2_FIX_COPY
  const campos = Object.keys(T.en)
  ok(codes.length === 16 && Object.keys(T).sort().join() === [...codes].sort().join() && campos.length === 17 &&
    codes.every((l) => Object.keys(T[l]).sort().join() === [...campos].sort().join() && campos.every((k) => typeof T[l][k] === 'string' && T[l][k].trim())) &&
    codes.every((l) => ['words', 'tooLong', 'lineHint'].every((k) => T[l][k].includes('{max}')) && T[l].words.includes('{n}') && T[l].line.includes('{n}')) &&
    UXL.adsV2FixCopy('xx') === T.en && UXL.adsV2FixCopy('pt') === T.pt,
  '6f frases dos consertos nas 16 línguas da interface (mesmos 17 campos, marcadores {n}/{max} em todas; língua desconhecida = inglês)')
}

// ═══ 7. FRASES DE TELA LONGE DO RÓTULO ═══════════════════════════════════════════════════════════════════════════════
const M = pura()(F.montage)
const baseIn = {
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: 'https://x.test/card.png', musicUrl: null,
  shots: [{ url: 'https://x.test/a.mp4', kind: 'product', cutStart: 0.4, cutSeconds: 3, measuredSeconds: 5 }, { url: 'https://x.test/b.mp4', kind: 'product', cutStart: 0.2, cutSeconds: 3, measuredSeconds: 5 }, { url: 'https://x.test/c.mp4', kind: 'product', cutStart: 0, cutSeconds: 3, measuredSeconds: 5 }],
  overlays: [{ text: 'Harbour Roast', start: 0.5, end: 3 }, { text: 'Guatemala beans', start: 4, end: 8 }],
}
await check('7a anúncio de PRODUTO sem ator: frases no terço de baixo (77%, a caixa do ator); sem a opção, o centro de sempre (45%); o resto do source idêntico', () => {
  const textos = (s) => s.elements.filter((e) => e.type === 'text')
  const a = M.buildAdV2Source({ ...baseIn, overlayPlacement: 'lower_third' })
  const b = M.buildAdV2Source(baseIn)
  const semY = (s) => JSON.stringify({ ...s, elements: s.elements.map((e) => (e.type === 'text' ? { ...e, y: null } : e)) })
  return textos(a).every((e) => e.y === '77%') && textos(b).every((e) => e.y === '45%') && semY(a) === semY(b)
})
ok((() => {
  const A = M
  return A.adsV2ProductOverlays([{ kind: 'place' }, { kind: 'product' }]) && !A.adsV2ProductOverlays([{ kind: 'place' }]) && !A.adsV2ProductOverlays(null) &&
    /\.\.\.\(adsV2ProductOverlays\(order\.photos\) \? \{ overlayPlacement: 'lower_third' as const \} : \{\}\),/.test(code(SRC.advance))
})(), '7b o avanço pede o terço de baixo SÓ quando o anúncio tem foto marcada como produto (imóvel/lugar seguem no centro)')

// ═══ MUTANTES ════════════════════════════════════════════════════════════════════════════════════════════════════════
await check('M1 checkV2Copy sem a régua de honestidade: a extração do caso Graydon NÃO sai consertada → vermelho', async () =>
  !(await extracaoConsertada({ [F.brief]: trocar(SRC.brief, "    if (opts.honesty) why.push(...honestyIssues(narration, opts.honesty, 'narration'))\n", '') })))
await check('M2 sem o conserto em código (repairCopyRaw): a 2ª resposta inventada vira 502 → vermelho', async () =>
  !(await extracaoConsertada({ [F.brief]: trocar(SRC.brief, '    const fixed = repairCopyRaw(raw, honesty)\n', '    const fixed = null as { raw: string; fixes: string[] } | null\n') })))
await check('M3 o anúncio de produto voltando a EXIGIR todo nome (Toronto obrigatório) → vermelho', async () =>
  !(await extracaoConsertada({ [F.brief]: trocar(SRC.brief, 'names: productAd ? [] : voiceRaw.names.filter((n) => !isDemonym(n))', 'names: voiceRaw.names') })))
await check('M4 "made in British" sem virar o país → vermelho', () => {
  const Hm = pura({ [F.honesty]: trocar(SRC.honesty, "    const replacement = /^in$/i.test(lead) ? '' : `${lead} ${place}`", "    const replacement = m[0]") })(F.honesty)
  return Hm.repairHonesty(casos.british.t, casos.british.h).text !== casos.british.fixed
})
await check('M5 alegação de saúde aceita só por estar na PÁGINA (typed ignorado) → vermelho', () => {
  const Hm = pura({ [F.honesty]: trocar(SRC.honesty, '    const from = typedOnly ? h.typed : h.source', '    const from = h.source') })(F.honesty)
  return Hm.unsupportedClaims('It helps reduce inflammation.', { source: 'From the product page: helps reduce inflammation', typed: 'Uji matcha tin' }).length === 0
})
await check('M6 PATCH que aceita voz acima das palavras da duração → vermelho', () => {
  const Cm = pura({ [F.contract]: trocar(SRC.contract, "    if (body.narration_text.trim().split(/\\s+/).filter(Boolean).length > max) return { ok: false, error: 'narration_too_long', status: 400, extra: { max_words: max } }\n", '') })(F.contract)
  return Cm.applyAdsV2CopyEdit(PLAN, 15, { narration_text: Array.from({ length: 31 }, () => 'w').join(' '), overlay_texts: null }).ok === true
})
await check('M7 link sem preferir a foto declarada (as <img> soltas primeiro) → a pessoa/o outro produto entram → vermelho', async () => {
  const html = '<html><head><script type="application/ld+json">{"@type":"Product","name":"Garshana","image":["https://cdn.x.example.com/p/brush.jpg"]}</script></head><body><img src="https://cdn.x.example.com/team/founder.jpg" width="900"><img src="https://cdn.x.example.com/p/axilla.jpg" width="900"></body></html>'
  const site = { 'https://shop.x.example.com/products/garshana': { html }, 'https://cdn.x.example.com/p/brush.jpg': { bytes: JPG(30_000) }, 'https://cdn.x.example.com/team/founder.jpg': { bytes: JPG(30_000) }, 'https://cdn.x.example.com/p/axilla.jpg': { bytes: JPG(30_000) } }
  const dns = { 'shop.x.example.com': '93.184.216.50', 'cdn.x.example.com': '93.184.216.51' }
  const certo = await linkMundo(internet(site, dns)).adsV2LinkImport('https://shop.x.example.com/products/garshana')
  const over = { [F.v2Link]: trocar(SRC.v2Link, '  await take(primary)\n  if (!images.length) await take(general)\n', '  await take(general)\n') }
  const errado = await linkMundo(internet(site, dns), over).adsV2LinkImport('https://shop.x.example.com/products/garshana')
  return certo.images.map((i) => i.src).join() === 'https://cdn.x.example.com/p/brush.jpg' && errado.images.length > 1
})
await check('M8 frase de produto de volta ao centro (cobre o rótulo) → vermelho', () => {
  const Mm = pura({ [F.montage]: trocar(SRC.montage, "y: pct(input.overlayPlacement === 'lower_third' ? ADS_V2_PRESENTER_OVERLAY_Y : ADS_V2_OVERLAY_Y)", 'y: pct(ADS_V2_OVERLAY_Y)') })(F.montage)
  return Mm.buildAdV2Source({ ...baseIn, overlayPlacement: 'lower_third' }).elements.filter((e) => e.type === 'text').every((e) => e.y === '45%')
})

console.log(`\ntest-anuncio-consertos-1210: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
