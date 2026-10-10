// KINEO-ADS-1FOTO-LINK-2026-10-10 — guardião das duas promessas do Studio Ads v2 que a /business e os anúncios pagos da
// Microsoft fazem ("Turn ONE product photo into a ready video ad" e "Paste a link, get an ad"). Aprovado pelo fundador
// (10/10: "tudo sim"). Prova, EXECUTANDO o código real pelo carregador offline da casa (scripts/test-support/
// offline-ts-loader.mjs), sem internet, sem banco, sem fal:
//   (1) 1 FOTO BASTA, no cliente E no servidor: os 3 espelhos do mínimo = 1; o contrato do /plan aceita 1 foto e recusa 0
//       (também 0 foto + vídeos e o rascunho com fotos []); a tela simples e a completa usam a constante;
//   (2) O PLANO PREENCHE OS 15 s com 1 foto em cada nível (Standard/Commercial/Premium), em 15/20/30 s, para cada tipo de
//       foto, com e sem estilo: mesma duração do plano com 3 fotos, índices em sequência, NENHUM plano idêntico colado no
//       anterior (a mesma foto ganha outro movimento; foto de texto repetida vira UM plano mais longo), Comercial/Premium
//       com as 3/4 cenas criadas a partir da foto, e o ator com 1 foto de produto;
//   (3) O LINK: candidatas de og:image / JSON-LD Product / <img> grandes que passam em looksLikePhoto (logo, ícone, SVG,
//       data: e repetido ficam de fora); tipo pelos BYTES; frase sugerida; contrato do corpo;
//   (4) a REDE (lib/ads/v2Link.ts com fetch e DNS falsos): no máximo 3 fotos; host interno recusado ANTES do pedido (IP
//       literal, DNS que resolve para IP interno, redirecionamento para interno, imagem em host interno); imagem acima do
//       teto abortada; WebP pulado; teto de bytes da conta respeitado;
//   (5) a ROTA /api/ads/v2/link-import EXECUTADA: guarda as fotos no user_footage DO DONO com moderação (barrada vai para a
//       quarentena e não vira linha), NUNCA cria nem toca pedido (ads_v2_orders), teto diário antes da rede (menor na
//       amostra; leitura que falha = fechado), amostra grátis pela mesma porta das rotas v2 com o teto de bytes da amostra,
//       quem já usou a amostra fica de fora;
//   (6) o /plan junta o que a página diz à frase no modo simples, sem nunca derrubar o plano; a tela tem o campo, chama a
//       rota ao colar, preenche a frase só se vazia, mostra "add at least one photo" sem foto, e manda o link lido no rascunho;
//   (7) as frases novas nas 16 línguas da interface e o "3 a 7" morto nas 3 línguas do modo simples; a /business continua
//       prometendo "one product photo" e "paste your product link" — agora verdade;
//   (8) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única + texto novo presente).
// Estilo readFileSync + ts.transpileModule (via offline-ts-loader). Nenhum import com alias @/.
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
/** Comentários fora (linha // e bloco), sem varrer posição. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
/** Troca com âncora única (split/join, nunca "$1"); a prova de que o mutante aplicou é o texto novo presente. */
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70))
  const out = src.split(de).join(para)
  if (out === src || !out.includes(para)) throw new Error('mutante não aplicou: ' + de.slice(0, 70))
  return out
}
/** Corpo de uma função de nível de componente: do início até a próxima função irmã. */
const bloco = (src, inicio) => {
  const i = src.indexOf(inicio)
  if (i < 0) return ''
  const rest = src.slice(i + inicio.length)
  const m = /\n {2}(async )?function \w+\(/.exec(rest)
  return inicio + (m ? rest.slice(0, m.index) : rest)
}

const F = {
  shots: 'lib/ads/v2ShotLists.ts',
  contract: 'lib/ads/v2Contract.ts',
  simpleLib: 'lib/ads/v2Simple.ts',
  linkImport: 'lib/ads/v2LinkImport.ts',
  linkReader: 'lib/ads/linkReader.ts',
  v2Link: 'lib/ads/v2Link.ts',
  presenter: 'lib/ads/v2Presenter.ts',
  route: 'app/api/ads/v2/link-import/route.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  business: 'app/business/page.tsx',
  iface: 'lib/ui/interfaceLanguage.ts',
  screen: 'lib/ads/v2Screen.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))
const pura = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })

// ═══ 1. 1 foto basta, cliente e servidor ═════════════════════════════════════════════════════════════════════════════
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const fotos = (n, kind = 'place') => Array.from({ length: n }, (_, i) => ({ footage_id: U(10 + i), kind }))
const vid = (i) => ({ footage_id: U(40 + i), start: 1, focus_x: 0.5, focus_y: 0.5, width: 1080, height: 1920 })
const minimo = (SL, C, S) => SL.ADS_V2_MIN_PHOTOS === 1 && C.ADS_V2_CONTRACT_MIN_PHOTOS === 1 && S.ADS_V2_SIMPLE_MIN_IN_AD === 1 &&
  SL.ADS_V2_MAX_PHOTOS === 7 && C.ADS_V2_CONTRACT_MAX_PHOTOS === 7 && S.ADS_V2_SIMPLE_MAX_IN_AD === 7
const contratoUmaFoto = (C) => {
  const base = { order_id: U(1), sector: 'store', logo_footage_id: U(2) }
  const simples = { order_id: U(1), sector: 'other', mode: 'simple' }
  return C.sanitizePlanBody({ ...base, photos: fotos(1, 'product') }).ok &&
    C.sanitizePlanBody({ ...simples, photos: fotos(1, 'product') }).ok &&
    C.sanitizePlanBody({ ...simples, photos: fotos(1, 'product'), presenter: true }).ok &&
    C.sanitizePlanBody({ ...base, photos: fotos(0) }).error === 'too_few_photos' &&
    C.sanitizePlanBody({ ...simples, photos: [] }).error === 'too_few_photos' &&
    C.sanitizePlanBody({ ...simples, photos: [], videos: [vid(1), vid(2)] }).error === 'too_few_photos' &&
    C.sanitizePlanBody({ ...base, photos: fotos(8) }).error === 'too_many_photos' &&
    C.sanitizeAssetsBody({ photos: fotos(1) }).ok && C.sanitizeAssetsBody({ photos: [] }).error === 'too_few_photos'
}
{
  const L = pura()
  ok(minimo(L(F.shots), L(F.contract), L(F.simpleLib)), '1a os 3 espelhos do mínimo = 1 foto (planner, contrato do servidor, tela simples); o teto segue 7')
  ok(contratoUmaFoto(L(F.contract)), '1b servidor: o /plan aceita 1 foto (completo, simples e com ator) e recusa 0 foto, 0 foto + 2 vídeos e 8 fotos; o rascunho aceita 1 e recusa []')
}
ok(/const parsed = sanitizePlanBody\(body\)/.test(code(SRC.plan)) && /if \(!parsed\.ok\) return v2Fail\(parsed\.error, 400\)/.test(code(SRC.plan)), '1c o /plan valida com o MESMO contrato (a regra não é só da tela)')
{
  const s = code(SRC.simple)
  ok(/if \(inAd\.length < ADS_V2_SIMPLE_MIN_IN_AD\) missing\.push\(fill\(lcopy\.needPhoto, \{ n: ADS_V2_SIMPLE_MIN_IN_AD - inAd\.length, min: ADS_V2_SIMPLE_MIN_IN_AD, max: ADS_V2_SIMPLE_MAX_IN_AD \}\)\)/.test(s) &&
    /if \(busy \|\| missing\.length\) return/.test(bloco(s, 'async function planAd(')) && /disabled=\{locked \|\| missing\.length > 0\} onClick=\{\(\) => void planAd\(\)\}/.test(s),
  '1d tela simples: menos de 1 foto = falta, o botão de planejar fica desligado e planAd não roda (link sozinho não planeja)')
  ok(/if \(photos\.length < ADS_V2_MIN_PHOTOS\) missing\.push/.test(code(SRC.client)), '1e modo completo: a falta de foto usa ADS_V2_MIN_PHOTOS (agora 1), nenhum número cravado')
}

// ═══ 2. o plano preenche os 15 s com 1 foto ══════════════════════════════════════════════════════════════════════════
const SL = pura()(F.shots)
const foto = (id, kind) => ({ id, url: `https://x.supabase.co/storage/v1/object/public/user-footage/u/${id}.jpg`, kind })
const TIERS = ['photo_motion', 'commercial', 'cinema']
const KINDS = ['product', 'place', 'people', 'text']
const SECTORS = ['store', 'restaurant', 'real_estate', 'other', 'app_service']
const assinatura = (s) => JSON.stringify([s.source, s.sourceFootageId, s.kind, s.prompt, s.scenePrompt, s.effect ?? null])
/** Nenhum plano idêntico colado no anterior. */
const semRepeticaoColada = (shots) => shots.every((s, i) => i === 0 || assinatura(s) !== assinatura(shots[i - 1]))
const preenche = (S, { sector, tier, seconds, photos, style = null }) => {
  const p = S.planShots({ sector, tier, photos, seconds, ...(style ? { style } : {}) })
  const ref = S.planShots({ sector, tier, photos: [foto('a', 'product'), foto('b', 'place'), foto('c', 'people')], seconds })
  const scenes = p.shots.filter((s) => s.source === 'generated_scene')
  const temRef = photos.some((ph) => ph.kind !== 'text')
  const cenasEsperadas = !temRef ? 0 : tier === 'commercial' ? 3 : tier === 'cinema' ? 4 : 0
  return p.shots.length > 0 && p.totalSeconds >= seconds && p.shotsSeconds === ref.shotsSeconds && p.totalSeconds === ref.totalSeconds &&
    p.shots.every((s, i) => s.idx === i && s.cutSeconds > 0) && semRepeticaoColada(p.shots) &&
    scenes.length === cenasEsperadas && scenes.every((s) => s.referenceFootageIds.length >= 1 && s.referenceFootageIds.every((id) => photos.some((ph) => ph.id === id))) &&
    p.shots.filter((s) => s.source === 'client_photo').every((s) => photos.some((ph) => ph.id === s.sourceFootageId)) &&
    p.shots.filter((s) => s.kind !== 'text').every((s) => typeof s.prompt === 'string' && s.prompt.endsWith(SL.ADS_V2_KEEP_PHRASE))
}
const casos = []
for (const sector of SECTORS) for (const tier of TIERS) for (const seconds of [15, 20, 30]) for (const kind of KINDS) casos.push({ sector, tier, seconds, photos: [foto('u', kind)] })
for (const tier of TIERS) for (const style of ['product_closeup', 'package_explosion']) casos.push({ sector: 'store', tier, seconds: 15, photos: [foto('u', 'product')], style })
for (const tier of TIERS) for (const [k1, k2] of [['product', 'place'], ['text', 'product'], ['people', 'people'], ['text', 'text']]) casos.push({ sector: 'other', tier, seconds: 15, photos: [foto('u', k1), foto('v', k2)] })
const todosPreenchem = (S) => casos.every((c) => preenche(S, c))
ok(todosPreenchem(SL), `2a com 1 foto (e com 2) cada nível × 15/20/30 s × tipo × setor × estilo (${casos.length} casos) dura o mesmo que com 3 fotos, sem plano idêntico colado, índices em sequência, cenas criadas a partir da foto`)
{
  const p = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: [foto('u', 'product')], seconds: 15 })
  const moves = p.shots.map((s) => s.prompt)
  ok(p.shots.length === 6 && new Set(moves).size === SL.ADS_V2_MOVEMENTS.product.length && p.shots.every((s) => s.sourceFootageId === 'u'), '2b Standard com 1 foto de produto: 6 planos da MESMA foto com os 3 movimentos de produto se revezando (nunca 2 iguais seguidos)')
  const c = SL.planShots({ sector: 'store', tier: 'commercial', photos: [foto('u', 'product')], seconds: 15 })
  const k = SL.planShots({ sector: 'store', tier: 'cinema', photos: [foto('u', 'product')], seconds: 15 })
  ok(c.shots.filter((s) => s.source === 'generated_scene').length === 3 && k.shots.filter((s) => s.source === 'generated_scene').length === 4 && k.shots.filter((s) => s.kind === 'product_hero').length === 2,
    '2c Commercial com 1 foto = 3 cenas criadas dela; Premium = 4 cenas + 2 closes-herói da mesma foto (movimentos diferentes)')
  const t = SL.planShots({ sector: 'app_service', tier: 'photo_motion', photos: [foto('u', 'text')], seconds: 15 })
  ok(t.shots.length === 1 && t.shots[0].kind === 'text' && t.shots[0].cutSeconds === 12.5 && t.totalSeconds === 15 && t.shots[0].prompt === null,
    '2d 1 foto de TEXTO (tela de app): os 6 planos parados idênticos viram UM plano de 12,5 s (+ cartão = 15 s), sem IA')
  const m = SL.mergeRepeatedTextShots([{ idx: 0, kind: 'text', sourceFootageId: 'a', cutSeconds: 2 }, { idx: 1, kind: 'place', sourceFootageId: 'a', cutSeconds: 2 }, { idx: 2, kind: 'text', sourceFootageId: 'a', cutSeconds: 2 }, { idx: 3, kind: 'text', sourceFootageId: 'b', cutSeconds: 2.5 }])
  ok(m.length === 4 && m.map((s) => s.idx).join() === '0,1,2,3', '2e só junta texto da MESMA foto colado: texto separado por outro plano ou de outra foto fica como estava')
  const tres = SL.planShots({ sector: 'restaurant', tier: 'commercial', photos: [foto('a', 'product'), foto('b', 'place'), foto('c', 'people')], seconds: 30 })
  ok(tres.shots.length === 12 && tres.shots.every((s, i) => s.idx === i), '2f com 3 fotos o plano é o de antes (12 planos no Commercial de 30 s; nada juntado)')
  const P = pura()(F.presenter)
  const ator = P.planAdsV2Presenter({ sector: 'store', photos: [{ footage_id: U(10), kind: 'product', url: foto('u', 'product').url }], seedKey: U(1) })
  ok(!!ator && typeof ator === 'object', '2g o ator ("Person talking about it") monta com UMA foto de produto')
}

// ═══ 3. o link: candidatas, bytes, frase, contrato ═══════════════════════════════════════════════════════════════════
const LR = pura()(F.linkReader)
const LI = pura()(F.linkImport)
const C = pura()(F.contract)
const PAGE_URL = 'https://loja.example.com/p/tenis-azul'
const html = ({ jsonld = true, imgs = true, og = true } = {}) => `<!doctype html><html lang="pt"><head>
<title>Tênis Azul Runner | Loja Exemplo</title>
<meta property="og:site_name" content="Loja Exemplo">
${og ? '<meta property="og:image" content="https://cdn.example.com/share/og-tenis.jpg">' : ''}
<meta name="description" content="Tênis leve de malha, solado macio.">
${jsonld ? `<script type="application/ld+json">{"@type":"Product","name":"Tênis Azul Runner","image":["https://cdn.example.com/p/tenis-1.jpg","https://cdn.example.com/p/tenis-1.jpg?v=2","https://cdn.example.com/p/tenis-2.png"],"offers":{"price":"299","priceCurrency":"BRL"}}</script>` : ''}
</head><body>
${imgs ? `<img src="/img/logo-loja.png" width="400"><img src="https://cdn.example.com/p/tenis-3.jpg" width="800"><img src="https://cdn.example.com/p/sprite.svg">
<img src="data:image/png;base64,AAAA"><img src="https://cdn.example.com/p/thumb.jpg" width="80"><img src="https://cdn.example.com/p/tenis-4.jpg"><img src="https://cdn.example.com/p/tenis-5.webp">` : ''}
</body></html>`
{
  const f = LR.readLinkFacts(html(), PAGE_URL)
  const cand = LR.productImageCandidates(f.images, 6)
  ok(cand[0] === 'https://cdn.example.com/p/tenis-1.jpg' && cand[1] === 'https://cdn.example.com/p/tenis-2.png' && cand.includes('https://cdn.example.com/p/tenis-3.jpg') &&
    !cand.some((u) => /logo|sprite|\.svg|^data:|thumb\.jpg|v=2/.test(u)) && !cand.includes('https://cdn.example.com/share/og-tenis.jpg'),
  '3a candidatas: fotos do JSON-LD Product primeiro, depois <img> grandes; logo, SVG, data:, miniatura (< 300 px) e a mesma foto com ?v=2 ficam de fora; og:image só sem outra')
  const soOg = LR.productImageCandidates(LR.readLinkFacts(html({ jsonld: false, imgs: false }), PAGE_URL).images, 6)
  ok(soOg.length === 1 && soOg[0] === 'https://cdn.example.com/share/og-tenis.jpg', '3b página só com og:image: a foto de compartilhamento vira a candidata')
  ok(LR.productImageCandidates(['https://a.com/x.jpg', 'https://a.com/logo.jpg', 'javascript:alert(1)', 'ftp://a.com/y.jpg', 42, 'https://a.com/z.jpg'], 6).join() === 'https://a.com/x.jpg,https://a.com/z.jpg' && LR.productImageCandidates(Array.from({ length: 9 }, (_, i) => `https://a.com/${i}.jpg`), 6).length === 6,
    '3c só http(s) com cara de foto, e no máximo `max`')
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5])
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  ok(LI.adsV2ImageExt(jpg) === 'jpg' && LI.adsV2ImageExt(png) === 'png' && LI.adsV2ImageExt(webp) === null && LI.adsV2ImageExt(new TextEncoder().encode('<html>')) === null && LI.adsV2ImageExt(null) === null,
    '3d o tipo vem dos BYTES: JPG e PNG passam; WebP, HTML e nada ficam de fora')
  ok(LI.adsV2LinkPrefill(f) === 'Tênis Azul Runner — Loja Exemplo' && LI.adsV2LinkPrefill({ title: 'Wool Runner', siteName: 'Allbirds' }) === 'Wool Runner — Allbirds' && LI.adsV2LinkPrefill({ title: '', siteName: '', host: 'loja.com' }) === 'loja.com' && LI.adsV2LinkPrefill({ title: 'x '.repeat(200) }).length <= LI.ADS_V2_LINK_PREFILL_MAX,
    '3e frase sugerida: o nome do produto (+ a marca quando o título não a cita), senão o domínio; curta')
  const b = (url) => C.sanitizeLinkImportBody({ url })
  ok(b('loja.com/p/1').value?.url === 'https://loja.com/p/1' && b(' https://loja.com/p ').value?.url === 'https://loja.com/p' && b('loja.com:443/p').ok && b('javascript:alert(1)').error === 'link_invalid' &&
    b('file:///etc/passwd').error === 'link_invalid' && b('https://a.com/ x').error === 'link_invalid' && b('https://a.com/' + 'x'.repeat(600)).error === 'link_invalid' && C.sanitizeLinkImportBody({ url: 5 }).error === 'link_invalid' && C.sanitizeLinkImportBody(null).error === 'bad_body',
  '3f contrato do corpo: sem esquema vira https://; javascript:/file:, espaço, > 500 e não-texto = link_invalid')
}

// ═══ 4. a rede (lib/ads/v2Link.ts) com fetch e DNS falsos ════════════════════════════════════════════════════════════
const JPG = (n) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b }
const PNG = (n) => { const b = new Uint8Array(n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b }
const WEBP = (n) => { const b = new Uint8Array(n); b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]); return b }
/** A internet falsa: url → resposta; DNS: host → IP. Registra cada pedido feito. */
function internet(over = {}) {
  const site = {
    [PAGE_URL]: { html: html() },
    'https://cdn.example.com/p/tenis-1.jpg': { bytes: JPG(50_000) },
    'https://cdn.example.com/p/tenis-2.png': { bytes: PNG(40_000) },
    'https://cdn.example.com/p/tenis-3.jpg': { bytes: JPG(30_000) },
    'https://cdn.example.com/p/tenis-4.jpg': { bytes: JPG(30_000) },
    'https://cdn.example.com/p/tenis-5.webp': { bytes: WEBP(30_000) },
    'https://cdn.example.com/share/og-tenis.jpg': { bytes: JPG(20_000) },
    ...over.site,
  }
  const dns = { 'loja.example.com': '93.184.216.34', 'cdn.example.com': '93.184.216.35', 'interno.example.com': '10.0.0.7', 'pula.example.com': '93.184.216.36', ...over.dns }
  const calls = []
  const fetch = async (u, init = {}) => {
    const url = String(u)
    calls.push(url)
    const r = site[url]
    if (!r) return new Response('nao achou', { status: 404 })
    if (r.redirect) return new Response(null, { status: 302, headers: { location: r.redirect } })
    if (r.html) return new Response(r.html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    const headers = { 'content-type': r.type ?? 'image/jpeg', ...(r.declared ? { 'content-length': String(r.declared) } : {}) }
    return new Response(r.bytes, { status: 200, headers })
  }
  const lookup = async (host) => {
    if (!(host in dns)) throw new Error('ENOTFOUND')
    return [{ address: dns[host], family: 4 }]
  }
  return { fetch, lookup, calls }
}
const linkWorld = (net, over = {}) => createOfflineLoader({
  mocks: { 'node:dns/promises': { lookup: net.lookup } },
  globals: { fetch: net.fetch, AbortSignal, Response, ReadableStream },
  source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
})
const importa = async (raw, opts = {}, netOver = {}, over = {}) => {
  const net = internet(netOver)
  const V = linkWorld(net, over)(F.v2Link)
  const r = await V.adsV2LinkImport(raw, opts)
  return { r, calls: net.calls }
}
await check('4a página com 5 candidatas: no máximo 3 fotos, JPG/PNG pelos bytes, na ordem da página; a frase e o link final voltam', async () => {
  const { r } = await importa(PAGE_URL)
  return r && r.images.length === 3 && r.images.map((i) => i.src).join() === ['tenis-1.jpg', 'tenis-2.png', 'tenis-3.jpg'].map((x) => 'https://cdn.example.com/p/' + x).join() &&
    r.images[1].ext === 'png' && r.images.every((i) => i.bytes.byteLength >= 2000) && r.sentence === 'Tênis Azul Runner — Loja Exemplo' && r.link === PAGE_URL && r.host === 'loja.example.com' && /Price: BRL 299/.test(r.text)
})
await check('4b IP interno literal, localhost, porta estranha e credencial: recusados ANTES de qualquer pedido à rede', async () => {
  for (const u of ['http://127.0.0.1/admin', 'http://10.0.0.5/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data', 'http://localhost/x', 'https://loja.example.com:8080/x', 'https://user:pw@loja.example.com/']) {
    const { r, calls } = await importa(u)
    if (r !== null || calls.length !== 0) return false
  }
  return true
})
await check('4c host público no nome mas que RESOLVE para IP interno (DNS): recusado sem pedido', async () => {
  const { r, calls } = await importa('https://interno.example.com/p')
  return r === null && calls.length === 0
})
await check('4d redirecionamento da página para host interno (IP literal OU nome que resolve para IP interno): para no salto, o interno nunca é pedido', async () => {
  const a = await importa('https://pula.example.com/p', {}, { site: { 'https://pula.example.com/p': { redirect: 'http://10.0.0.9/segredo' } } })
  const b = await importa('https://pula.example.com/p', {}, { site: { 'https://pula.example.com/p': { redirect: 'https://interno.example.com/segredo' } } })
  return a.r === null && a.calls.length === 1 && !a.calls.some((c) => c.includes('10.0.0.9')) && b.r === null && b.calls.length === 1 && !b.calls.some((c) => c.includes('interno.example'))
})
await check('4e imagem citada pela página em host interno (direto ou por DNS): pulada sem pedido; as públicas seguem', async () => {
  const page = html().split('https://cdn.example.com/p/tenis-1.jpg').join('http://192.168.0.10/tenis-1.jpg').replace('https://cdn.example.com/p/tenis-2.png', 'https://interno.example.com/tenis-2.png')
  const { r, calls } = await importa(PAGE_URL, {}, { site: { [PAGE_URL]: { html: page } } })
  return r && r.images.length === 2 && r.images.map((i) => i.src.split('/').pop()).join() === 'tenis-3.jpg,tenis-4.jpg' && !calls.some((c) => /192\.168|interno\.example/.test(c)) && r.skipped === 3
})
await check('4f imagem acima do teto (declarada ou no fluxo) abortada; WebP e imagem minúscula puladas', async () => {
  const big = { 'https://cdn.example.com/p/tenis-1.jpg': { bytes: JPG(LI.ADS_V2_LINK_IMAGE_MAX_BYTES + 10) }, 'https://cdn.example.com/p/tenis-2.png': { bytes: PNG(100), declared: LI.ADS_V2_LINK_IMAGE_MAX_BYTES + 1 }, 'https://cdn.example.com/p/tenis-3.jpg': { bytes: JPG(900) } }
  const { r } = await importa(PAGE_URL, {}, { site: big })
  return r && r.images.length === 1 && r.images[0].src.endsWith('tenis-4.jpg') && r.skipped === 4
})
await check('4g teto de bytes da conta (roomBytes): só entra o que cabe; sem espaço nenhum, nenhuma imagem é baixada', async () => {
  const a = await importa(PAGE_URL, { roomBytes: 60_000 })
  const z = await importa(PAGE_URL, { roomBytes: 0 })
  return a.r && a.r.images.length === 1 && a.r.images[0].bytes.byteLength === 50_000 && z.r && z.r.images.length === 0 && !z.calls.some((c) => c.includes('cdn.example.com'))
})
await check('4h página que não é HTML ou não abre = null (a rota responde link_unreachable)', async () => {
  const a = await importa(PAGE_URL, {}, { site: { [PAGE_URL]: { bytes: JPG(5000), type: 'image/jpeg' } } })
  const b = await importa('https://loja.example.com/nao-existe')
  return a.r === null && b.r === null
})
await check('4i adsV2LinkText (o texto do link, usado pelo /plan e pela pesquisa) segue lendo a página como antes', async () => {
  const net = internet()
  const V = linkWorld(net)(F.v2Link)
  const t = await V.adsV2LinkText(PAGE_URL)
  return t && t.host === 'loja.example.com' && t.lang === 'pt' && /Tênis Azul Runner/.test(t.text) && net.calls.length === 1
})

// ═══ 5. a rota /api/ads/v2/link-import EXECUTADA ═════════════════════════════════════════════════════════════════════
const likeRe = (p) => new RegExp('^' + p.split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$')
function fakeDb(tables, { failWhen = null } = {}) {
  const log = []
  const stored = []
  const removed = []
  const from = (name) => {
    tables[name] ??= []
    const st = { op: 'select', filters: [], desc: [], patch: null, rows: null, count: false, head: false, limit: null }
    const exec = (single) => {
      log.push({ name, op: st.op })
      if (failWhen && failWhen(name, st)) return Promise.resolve({ data: null, count: null, error: { code: 'XX000', message: 'falha injetada' } })
      if (st.op === 'insert') {
        const rows = (Array.isArray(st.rows) ? st.rows : [st.rows]).map((r) => ({ id: r.id ?? U(500 + tables[name].length), ...r }))
        tables[name].push(...rows)
        return Promise.resolve({ data: single ? rows[0] : rows, error: null })
      }
      let rows = tables[name].filter((r) => st.filters.every((f) => f(r)))
      if (st.op === 'update') for (const r of rows) Object.assign(r, st.patch)
      if (st.limit !== null) rows = rows.slice(0, st.limit)
      if (st.count && st.head) return Promise.resolve({ data: null, count: rows.length, error: null })
      if (single) return Promise.resolve({ data: rows[0] ? { ...rows[0] } : null, error: null })
      return Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null })
    }
    const b = {
      select(_c, o) { if (o && o.count) st.count = true; if (o && o.head) st.head = true; return b },
      eq(c, v) { st.filters.push((r) => r[c] === v); return b },
      like(c, p) { st.filters.push((r) => typeof r[c] === 'string' && likeRe(p).test(r[c])); return b },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return b },
      is(c, v) { st.filters.push((r) => (r[c] ?? null) === v); return b },
      gte(c, v) { st.filters.push((r) => r[c] != null && String(r[c]) >= String(v)); return b },
      order() { return b },
      limit(n) { st.limit = n; return b },
      update(p) { st.op = 'update'; st.patch = p; return b },
      insert(rows) { st.op = 'insert'; st.rows = rows; return b },
      maybeSingle() { return exec(true) },
      single() { return exec(true) },
      then(res, rej) { return exec(false).then(res, rej) },
    }
    return b
  }
  const storage = { from: (bucket) => ({
    upload: async (p, bytes, opts) => { stored.push({ bucket, path: p, size: bytes.byteLength, type: opts?.contentType }); return { error: null } },
    remove: async (paths) => { removed.push(...paths); return { error: null } },
  }) }
  return { from, storage, __log: log, __stored: stored, __removed: removed }
}
const USER = U(1)
const PREFIX = 'https://sb.example.co/storage/v1/object/public/user-footage/'
const ago = (h) => new Date(Date.now() - h * 3600_000).toISOString()
function mundo({ plan = 'starter', email = 'dona.loja@example.com', usedBytes = 0, events = [], sampleUsed = false, failWhen = null } = {}) {
  return {
    tables: {
      profiles: [{ id: USER, plan, has_paid: plan !== 'free', ads_access_until: null, video_credits: 100 }],
      ads_v2_orders: sampleUsed ? [{ id: U(90), user_id: USER, status: 'delivered', billing_ref: `adssample-${U(91)}-${U(92)}` }] : [],
      events: events.map((e, i) => ({ id: `e${i}`, user_id: USER, ...e })),
      user_footage: [],
    },
    email, usedBytes, failWhen,
  }
}
async function runRoute(w, { body = { url: PAGE_URL }, over = {}, netOver = {}, moderation = () => ({ ok: true }), env = { NEXT_PUBLIC_ADS_PASS_LIVE: '1' } } = {}) {
  const db = fakeDb(w.tables, { failWhen: w.failWhen })
  const net = internet(netOver)
  const events = []
  const mods = []
  const quarantined = []
  const load = createOfflineLoader({
    env,
    globals: { fetch: net.fetch, AbortSignal, Response, ReadableStream },
    mocks: {
      'next/server': {},
      'node:dns/promises': { lookup: net.lookup },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER, email: w.email } } }) } }) },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
      '@/lib/safety/contentModeration': { moderateContent: async (a) => { mods.push(a); return moderation(a) } },
      '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'barrado', moderationRefusalStatus: (r) => (r === 'blocked' ? 422 : 503) },
      '@/lib/safety/quarantine': { quarantineObject: async (_a, o) => { quarantined.push(o); return { ok: true } } },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/ads/v2Server': { v2Json: (b, status = 200) => ({ status, body: b }), v2Fail: (error, status, extra = {}) => ({ status, body: { error, ...extra } }) },
      '@/lib/userFootage': {
        footageAdminClient: () => db, ensureFootageBucket: async () => {}, FOOTAGE_PUBLIC_PREFIX: () => PREFIX,
        FOOTAGE_QUOTA_PAID: 500 * 1024 * 1024, totalFootageBytes: async () => w.usedBytes, USER_FOOTAGE_BUCKET: 'user-footage',
      },
    },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })
  const route = load(F.route)
  const res = await route.POST({ json: async () => body })
  const pedidos = db.__log.filter((l) => l.name === 'ads_v2_orders')
  return { res, events, mods, quarantined, db, net, tables: w.tables, pedidos, nuncaPedido: pedidos.every((l) => l.op === 'select') && w.tables.ads_v2_orders.every((o) => o.id === U(90)) }
}
const evento = (r) => r.events.find((e) => e.name === 'ads_link_read')
await check('5a conta paga: 3 fotos guardadas na pasta DELA, uma linha de user_footage cada (dono, url do bucket), moderadas; resposta com footage_id/url, frase e link; evento ads_link_read', async () => {
  const r = await runRoute(mundo())
  const rows = r.tables.user_footage
  return r.res.status === 200 && r.res.body.images.length === 3 && rows.length === 3 && rows.every((x) => x.user_id === USER && x.kind === 'image' && x.url.startsWith(PREFIX + USER + '/')) &&
    r.db.__stored.length === 3 && r.db.__stored.every((s) => s.bucket === 'user-footage' && s.path.startsWith(USER + '/')) &&
    r.res.body.images.every((im, i) => im.footage_id === rows[i].id && im.url === rows[i].url) && r.res.body.sentence === 'Tênis Azul Runner — Loja Exemplo' && r.res.body.link === PAGE_URL &&
    r.mods.filter((m) => m.surface === 'footage').length === 3 && r.mods.some((m) => m.surface === 'ads_brief') && evento(r)?.metadata?.ok === true && evento(r)?.metadata?.images_saved === 3
})
await check('5b a rota NUNCA cria nem mexe em pedido (ads_v2_orders): nem com fotos, nem sem foto, nem com erro', async () => {
  const runs = [await runRoute(mundo()), await runRoute(mundo(), { netOver: { site: { [PAGE_URL]: { html: html({ jsonld: false, imgs: false, og: false }) } } } }), await runRoute(mundo(), { body: { url: 'http://10.0.0.1/' } })]
  return runs.every((r) => r.nuncaPedido) && !/ads_v2_orders/.test(code(SRC.route))
})
await check('5c página sem foto: 200 com images [] e o link lido (a tela mostra "add at least one photo"; o link fica para o roteiro)', async () => {
  const r = await runRoute(mundo(), { netOver: { site: { [PAGE_URL]: { html: html({ jsonld: false, imgs: false, og: false }) } } } })
  return r.res.status === 200 && r.res.body.images.length === 0 && r.res.body.link === PAGE_URL && r.tables.user_footage.length === 0
})
await check('5d link interno: 422 link_unreachable sem pedir nada à rede, e a tentativa CONTA no teto (evento ok:false)', async () => {
  const r = await runRoute(mundo(), { body: { url: 'http://169.254.169.254/latest/meta-data' } })
  return r.res.status === 422 && r.res.body.error === 'link_unreachable' && r.net.calls.length === 0 && evento(r)?.metadata?.ok === false
})
await check('5e teto diário ANTES da rede: conta paga com 20 leituras em 24 h = 429; 19 passa; leituras de ontem não contam; leitura do teto que falha = 429', async () => {
  const ev = (n, h = 1) => Array.from({ length: n }, () => ({ name: 'ads_link_read', created_at: ago(h) }))
  const a = await runRoute(mundo({ events: ev(20) }))
  const b = await runRoute(mundo({ events: [...ev(19), ...ev(30, 30)] }))
  const c = await runRoute(mundo({ failWhen: (n) => n === 'events' }))
  return a.res.status === 429 && a.res.body.error === 'daily_limit' && a.net.calls.length === 0 && b.res.status === 200 && c.res.status === 429 && c.net.calls.length === 0
})
await check('5f amostra grátis (conta free sem amostra usada): entra pela MESMA porta das rotas v2, teto de 5 leituras e o teto de bytes da amostra', async () => {
  const ev = (n) => Array.from({ length: n }, () => ({ name: 'ads_link_read', created_at: ago(1) }))
  const ok1 = await runRoute(mundo({ plan: 'free' }))
  const cap = await runRoute(mundo({ plan: 'free', events: ev(5) }))
  const cheio = await runRoute(mundo({ plan: 'free', usedBytes: 60 * 1024 * 1024 - 1000 }))
  const pagoUsado = await runRoute(mundo({ usedBytes: 60 * 1024 * 1024 - 1000 }))
  return ok1.res.status === 200 && ok1.res.body.images.length === 3 && evento(ok1)?.metadata?.sample === true &&
    cap.res.status === 429 && cap.net.calls.length === 0 &&
    cheio.res.status === 200 && cheio.res.body.images.length === 0 && !cheio.net.calls.some((c) => c.includes('cdn.example.com')) &&
    pagoUsado.res.status === 200 && pagoUsado.res.body.images.length === 3
})
await check('5g quem já usou a amostra (ou Studio Ads desligado) fica de fora: 403 com rastro, nenhuma leitura de link', async () => {
  const a = await runRoute(mundo({ plan: 'free', sampleUsed: true }))
  const b = await runRoute(mundo({ plan: 'free' }), { env: { NEXT_PUBLIC_ADS_PASS_LIVE: '0' } })
  return a.res.status === 403 && a.res.body.error === 'no_access' && a.events.some((e) => e.name === 'ads_access_denied') && a.net.calls.length === 0 && b.res.status === 403 && b.net.calls.length === 0
})
await check('5h moderação: foto barrada vai para a quarentena e NÃO vira linha; texto barrado = recusa sem guardar foto nenhuma', async () => {
  const img = await runRoute(mundo(), { moderation: (a) => (a.surface === 'footage' && /link0\./.test(a.meta?.path ?? '') ? { ok: false, reason: 'blocked' } : { ok: true }) })
  const txt = await runRoute(mundo(), { moderation: (a) => (a.surface === 'ads_brief' ? { ok: false, reason: 'blocked' } : { ok: true }) })
  return img.res.status === 200 && img.res.body.images.length === 2 && img.tables.user_footage.length === 2 && img.quarantined.length === 1 && /link0\./.test(img.quarantined[0].path) &&
    txt.res.status === 422 && txt.res.body.error === 'moderation' && txt.tables.user_footage.length === 0 && txt.db.__stored.length === 0
})
await check('5i corpo ruim: 400 link_invalid antes do teto e da rede', async () => {
  const r = await runRoute(mundo(), { body: { url: 'javascript:alert(1)' } })
  return r.res.status === 400 && r.res.body.error === 'link_invalid' && r.net.calls.length === 0 && !r.db.__log.some((l) => l.name === 'events')
})

// ═══ 6. o /plan e a tela ═════════════════════════════════════════════════════════════════════════════════════════════
{
  const p = code(SRC.plan)
  ok(/if \(simple && text && typeof brief0\.link === 'string' && brief0\.link\) \{\s*const page = await adsV2LinkText\(brief0\.link\)\.catch\(\(\) => null\)\s*if \(page\) \{\s*text = `\$\{text\}\\nFrom the product page: \$\{page\.text\}`/.test(p) &&
    ordem(p, 'if (simple && text && typeof brief0.link', "if (!text && typeof brief0.link === 'string' && brief0.link)", 'const safety = await moderateContent('),
  '6a /plan (modo simples): com o link lido no pedido, o que a página diz entra embaixo da frase ANTES da moderação; página que não abre não derruba o plano')
  const s = code(SRC.simple)
  const imp = bloco(s, 'async function importLink(')
  ok(/'\/api\/ads\/v2\/link-import', \{ method: 'POST', body: \{ url \} \}/.test(imp) && !/\/api\/ads\/v2\/(orders|plan|start)/.test(imp) &&
    /setText\(\(cur\) => \(cur\.trim\(\) \? cur : suggested\)\)/.test(imp) && /fetch\(im\.url, \{ cache: 'no-store' \}\)/.test(imp) && /itemFromFile\(f, false\)/.test(imp) && /fromLink: true/.test(imp) &&
    /: \{ warn: true, text: lcopy\.linkNoPhotos \}/.test(imp) && /r\.data\.images\.slice\(0, ADS_V2_LINK_IMPORT_MAX_IMAGES\)/.test(imp),
  '6b tela: importLink chama SÓ a rota do link (nunca orders/plan/start), preenche a frase só se vazia, cada foto entra como arquivo escolhido (recorte 9:16), sem foto = "add at least one photo"')
  ok(/onPaste=\{\(e\) => \{[\s\S]*?void importLink\(pasted\)/.test(s) && /data-kineo="ads-link-import"/.test(s) && /\{lcopy\.linkLabel\}/.test(s) && /placeholder=\{lcopy\.linkPlaceholder\}/.test(s) &&
    ordem(s, 'aria-labelledby="adv2s-s1"', 'data-kineo="ads-link-import"', 'aria-labelledby="adv2s-s2"') && /<p className="adsw-lead">\{lcopy\.lead\}<\/p>/.test(s),
  '6c tela: o campo "Or paste your product link" mora na seção das fotos; colar já busca; a linha de cima é a nova (16 línguas)')
  ok(/link: linkRead,/.test(bloco(s, 'async function ensureDraft(')) && /lang: spoken, tier, link: linkRead \}\)/.test(s) && /\(p\.fromLink === true && sector === 'other'\) \? 'product' : photoKind/.test(s),
    '6d o link LIDO vai no rascunho (fonte do roteiro) e entra na chave do rascunho; foto do link é produto quando o texto não reconheceu setor')
}

// ═══ 7. as frases ════════════════════════════════════════════════════════════════════════════════════════════════════
let frases = () => true
{
  const IF = pura()(F.iface)
  const codes = IF.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
  frases = (L) => {
    const T = L.ADS_V2_LINK_IMPORT_COPY
    const campos = Object.keys(T.en)
    return codes.length === 16 && Object.keys(T).sort().join() === [...codes].sort().join() && campos.length === 13 &&
      codes.every((c) => campos.every((k) => typeof T[c][k] === 'string' && T[c][k].trim().length > 1)) &&
      codes.filter((c) => c !== 'en').every((c) => campos.filter((k) => k !== 'linkPlaceholder').every((k) => T[c][k] !== T.en[k])) &&
      codes.every((c) => T[c].needPhoto.includes('{min}') && T[c].needPhoto.includes('{max}') && T[c].linkGot.includes('{n}') && T[c].linkGot.includes('{host}') && /\b1\b/.test(T[c].lead) && /7/.test(T[c].lead) && !/\b3\b/.test(T[c].lead))
  }
  ok(frases(LI), '7a as 13 frases novas nas 16 línguas da interface: todas escritas, diferentes do inglês, com {min}/{max} e {n}/{host}; a linha de cima diz 1 a 7 (sem "3")')
  ok(LI.adsV2LinkImportCopy('vi') === LI.ADS_V2_LINK_IMPORT_COPY.vi && LI.adsV2LinkImportCopy('xx') === LI.ADS_V2_LINK_IMPORT_COPY.en && LI.adsV2LinkImportError('daily_limit', LI.ADS_V2_LINK_IMPORT_COPY.pt) === LI.ADS_V2_LINK_IMPORT_COPY.pt.linkLimit && LI.adsV2LinkImportError('link_unreachable', LI.ADS_V2_LINK_IMPORT_COPY.en) === LI.ADS_V2_LINK_IMPORT_COPY.en.linkUnreachable,
    '7b língua desconhecida = inglês; os códigos da rota viram a frase certa')
  const S = pura()(F.simpleLib)
  ok(['en', 'pt', 'es'].every((l) => S.ADS_V2_SIMPLE_COPY[l].files.lead === LI.ADS_V2_LINK_IMPORT_COPY[l].lead && S.ADS_V2_SIMPLE_COPY[l].plan.needFiles === LI.ADS_V2_LINK_IMPORT_COPY[l].needPhoto) &&
    !/3 to 7|3 a 7|de 3 a 7|at least 3|pelo menos 3|al menos 3/.test(SRC.simpleLib.split('// ── textos da tela')[1] ?? 'x') && !/at least 3 photos/.test(SRC.screen),
  '7c o "3 a 7" morreu nas 3 línguas do modo simples (linha de cima, falta e erro too_few_photos) e no erro do servidor; en/pt/es = a tabela das 16')
  ok(!/^\s*import\s(?!type)/m.test(SRC.linkImport) && !/^\s*import\s(?!type)/m.test(SRC.linkReader), '7d lib/ads/v2LinkImport.ts e linkReader.ts são PURAS (só import type): podem ir ao cliente')
  const b = code(SRC.business)
  ok(/<h1>Turn one product photo into a ready video ad<\/h1>/.test(b) && /paste your product link/i.test(b) && /data-kineo="ads-link-import"/.test(SRC.simple) && /href="\/ads\?from=business_page"/.test(b),
    '7e /business: "one product photo" (agora verdade: mínimo 1) e "paste your product link" (agora existe no modo simples, a porta do botão)')
}

// ═══ 8. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
await check('M1 mínimo do planner de volta a 3: o espelho fica vermelho', () => {
  const L = pura({ [F.shots]: trocar(SRC.shots, 'export const ADS_V2_MIN_PHOTOS = 1', 'export const ADS_V2_MIN_PHOTOS = 3') })
  return !minimo(L(F.shots), L(F.contract), L(F.simpleLib))
})
await check('M2 contrato do servidor de volta a 3 fotos: "1 foto basta no servidor" fica vermelho', () => !contratoUmaFoto(pura({ [F.contract]: trocar(SRC.contract, 'export const ADS_V2_CONTRACT_MIN_PHOTOS = 1', 'export const ADS_V2_CONTRACT_MIN_PHOTOS = 3') })(F.contract)))
await check('M3 contrato sem "pelo menos 1 foto" (só vídeo/link planejaria): vermelho', () => !contratoUmaFoto(pura({ [F.contract]: trocar(SRC.contract, "if (b.photos.length < 1 || total < ADS_V2_CONTRACT_MIN_PHOTOS) return fail('too_few_photos')", "if (total < ADS_V2_CONTRACT_MIN_PHOTOS) return fail('too_few_photos')") })(F.contract)))
await check('M4 sem juntar a foto de texto repetida: plano idêntico colado → vermelho', () => !todosPreenchem(pura({ [F.shots]: trocar(SRC.shots, 'const shots = mergeRepeatedTextShots(built)', 'const shots = built') })(F.shots)))
await check('M5 a mesma foto sempre com o MESMO movimento (variante fixa): vermelho', () => !todosPreenchem(pura({ [F.shots]: trocar(SRC.shots, '    const variant = uses.get(photo.id) ?? 0\n', '    const variant = 0\n') })(F.shots)))
await check('M6 candidatas sem looksLikePhoto: logo/SVG entram → vermelho', () => {
  const L = pura({ [F.linkReader]: trocar(SRC.linkReader, "if (typeof raw !== 'string' || !/^https?:\\/\\//i.test(raw) || !looksLikePhoto(raw)) continue", "if (typeof raw !== 'string' || !/^https?:\\/\\//i.test(raw)) continue") })(F.linkReader)
  return L.productImageCandidates(['https://a.com/x.jpg', 'https://a.com/logo.jpg', 'https://a.com/z.jpg'], 6).length !== 2
})
await check('M7 download sem conferir o host a cada salto: o redirecionamento para um nome que resolve para IP interno é pedido → vermelho', async () => {
  const over = { [F.v2Link]: trocar(SRC.v2Link, '    if (!(await publicHost(url))) return null\n', '') }
  const { r, calls } = await importa('https://pula.example.com/p', {}, { site: { 'https://pula.example.com/p': { redirect: 'https://interno.example.com/segredo' } } }, over)
  return calls.some((c) => c.includes('interno.example')) || r !== null
})
await check('M8 sem o teto de 3 fotos: a página com 5 candidatas traz mais de 3 → vermelho', async () => {
  const over = { [F.v2Link]: trocar(SRC.v2Link, '    if (images.length >= max) break\n', '') }
  const { r } = await importa(PAGE_URL, {}, {}, over)
  return r.images.length > 3
})
await check('M9 rota sem teto diário: 20 leituras/24 h passam → vermelho', async () => {
  const over = { [F.route]: trocar(SRC.route, ' || capRead.count >= adsV2LinkDailyCap(sample)) return', ') return') }
  const r = await runRoute(mundo({ events: Array.from({ length: 20 }, () => ({ name: 'ads_link_read', created_at: ago(1) })) }), { over })
  return r.res.status === 200
})
await check('M10 amostra com a cota de quem paga: a conta free quase cheia baixa fotos → vermelho', async () => {
  const over = { [F.route]: trocar(SRC.route, "const quota = gate === 'ok' ? FOOTAGE_QUOTA_PAID : ADS_SAMPLE_FOOTAGE_MAX_BYTES", 'const quota = FOOTAGE_QUOTA_PAID') }
  const r = await runRoute(mundo({ plan: 'free', usedBytes: 60 * 1024 * 1024 - 1000 }), { over })
  return r.res.body.images?.length > 0
})
await check('M11 foto barrada que vira linha (sem o continue da moderação): vermelho', async () => {
  const over = { [F.route]: trocar(SRC.route, '        blocked++\n        skipped++\n        continue\n', '        blocked++\n') }
  const r = await runRoute(mundo(), { over, moderation: (a) => (a.surface === 'footage' && /link0\./.test(a.meta?.path ?? '') ? { ok: false, reason: 'blocked' } : { ok: true }) })
  return r.tables.user_footage.length === 3
})
await check('M12 tabela sem o vietnamita: as 16 línguas ficam vermelhas', () => {
  const src = SRC.linkImport
  const i = src.indexOf('  vi: {')
  const j = src.indexOf('\n  },\n', i)
  const L = pura({ [F.linkImport]: trocar(src, src.slice(i, j + 5), '') })(F.linkImport)
  const T = L.ADS_V2_LINK_IMPORT_COPY
  return !T.vi && Object.keys(T).length === 15 && !frases(L)
})
await check('M13 a linha de cima volta a dizer "3 a 7": vermelho', () => {
  const L = pura({ [F.linkImport]: trocar(SRC.linkImport, "lead: 'Envie de 1 a 7 fotos", "lead: 'Envie de 3 a 7 fotos") })(F.linkImport)
  return !/\b1\b/.test(L.ADS_V2_LINK_IMPORT_COPY.pt.lead) || /\b3\b/.test(L.ADS_V2_LINK_IMPORT_COPY.pt.lead)
})

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
