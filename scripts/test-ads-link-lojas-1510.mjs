// KINEO-ADS-LINK-LOJAS-1510 — guardião do leitor de link do Studio Ads em TODAS as plataformas que as agências atendem
// (fundador, 15/10: "perfeito para as agências usarem sozinhas, hoje"). Roda com `node scripts/test-ads-link-lojas-1510.mjs`,
// SEM rede (as páginas são as fixtures de scripts/fixtures/ads-link/, lidas UMA vez de lojas reais em 14/10/2026 e podadas),
// sem banco, sem alias '@/' no próprio guardião (as libs passam pelo carregador offline).
//
// O que ele prova:
//   1. UMA LOJA REAL POR PLATAFORMA (Shopify, WooCommerce, Nuvemshop, VTEX, Tray, Wix, Squarespace, BigCommerce, Magento,
//      Amazon): nome, preço de VENDA, moeda, 1ª foto (a maior versão) e a confiança do leitor.
//   2. PÁGINA QUE NÃO DÁ PARA LER: robô/captcha (Etsy/DataDome, Cloudflare, Loja Integrada, Amazon "Robot Check"), login
//      (Mercado Livre → /gz/account-verification) e só-JavaScript — com o aviso honesto; e loja de verdade que CITA "captcha"
//      no meio do JS (Shopify, Magento, Squarespace, Wix) NÃO cai aqui.
//   3. AS REGRAS DO PREÇO: o "de" nunca vira preço (VTEX listPrice, Tray "De", Nuvemshop compare_at); faixa, conflito ou
//      variantes com preços diferentes = SEM preço; e a regra do nome (não confere com a página = o título).
//   4. AS PORTAS JSON: /products/<handle>.js do Shopify e a busca pública da VTEX; o charset da página (Tray, ISO-8859-1).
//   5. A REDE (lib/ads/v2Link.ts com fetch e DNS falsos): Amazon que barra = o aviso da Amazon; captcha/só-JS = o porquê;
//      Shopify sem .json usa o .js; VTEX sem preço usa a busca; a Tray chega com acento.
//   6. A ROTA devolve plataforma/moeda/confiança/porquês e o aviso no 422; a TELA (de outra pista) ficou intocada.
//   7. O DESFAZ (scripts/test-support/desfaz-ads-link-lojas-1510.mjs) volta os 3 arquivos EXATAMENTE ao pai do commit.
// Mutantes no fim: cada um aplicado tem de deixar uma verificação vermelha.
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semLinkLojas1510, LINK_LOJAS_1510_ARQUIVOS, MARCA_LINK_LOJAS_1510 } from './test-support/desfaz-ads-link-lojas-1510.mjs'
import { desfazPosEntrega1510 } from './test-support/desfaz-ads-pos-entrega-1510.mjs' // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — o painel depois da entrega (pos-entrega, mais nova) sai da tela em memória antes do byte a byte
import { semMarcas1510 } from './test-support/desfaz-ads-marcas-1510.mjs' // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — as marcas (a mais nova da leva) saem primeiro
import { semLinkTela1510 } from './test-support/desfaz-ads-link-tela-1510.mjs' // reancorado KINEO-ADS-LINK-TELA-1510
import { semFiel2_1510 } from './test-support/desfaz-ads-fiel-2-1510.mjs' // reancorado KINEO-ADS-FIEL-2-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória
import { semFiel3_1510 } from './test-support/desfaz-ads-fiel-3-1510.mjs' // reancorado KINEO-ADS-FIEL-3-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const vermelho = async (fn) => { try { return !(await fn()) } catch { return true } }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80))
  const out = src.split(de).join(para)
  if (out === src || !out.includes(para)) throw new Error('mutante não aplicou: ' + de.slice(0, 80))
  return out
}

const F = {
  reader: 'lib/ads/linkReader.ts',
  v2Link: 'lib/ads/v2Link.ts',
  route: 'app/api/ads/v2/link-import/route.ts',
  linkImport: 'lib/ads/v2LinkImport.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  flow: 'components/ads/AdsFlow.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
}
const FIX = 'scripts/fixtures/ads-link/'
const bytes = (f) => new Uint8Array(fs.readFileSync(path.join(ROOT, f.includes('/') ? f : FIX + f)))
const mundo = (over = {}, mocks = {}, globals = {}) => createOfflineLoader({ mocks, globals, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const leitor = (over = {}) => mundo(over)(F.reader)
const SRC = { reader: read(F.reader), v2Link: read(F.v2Link), route: read(F.route) }

// A base: o pai do 1º commit que trouxe a marca a estes arquivos (antes do commit: HEAD).
const primeiro = git('log', '--reverse', '--format=%H', '-S', MARCA_LINK_LOJAS_1510, '--', ...LINK_LOJAS_1510_ARQUIVOS).trim().split('\n').filter(Boolean)[0]
const BASE = primeiro ? `${primeiro}^` : 'HEAD'
const base = (rel) => git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n')

// ═══ 1. uma loja real por plataforma ═════════════════════════════════════════════════════════════════════════════════
console.log('\n1. uma loja real por plataforma (fixtures de 14/10/2026)')
const LOJAS = [
  { f: 'shopify-produto.html', url: 'https://www.loja-exemplo.com/products/mens-tree-runners', platform: 'shopify', name: "Men's Tree Runner", price: '100.00', currency: 'USD', img: /\/cdn\/shop\/files\/TR3MJBW080_SHOE_LEFT[^?]*\.png\?v=1751165486&width=1600$/, confidence: 'high', brand: 'Allbirds' },
  { f: 'woocommerce-produto.html', url: 'https://www.loja-exemplo.com/product/iloj-desk-tray-large/', platform: 'woocommerce', name: 'Iloj - Desk Tray - Large', price: '80.00', currency: 'USD', img: /\/wp-content\/uploads\/2024\/05\/LOJEL-ILOJ-PebbleGray-Front45-DeskTrayLarge\.jpg$/, confidence: 'high' },
  { f: 'scripts/fixtures/ads-link-nuvemshop-atheeri.html', url: 'https://www.loja-exemplo.com.br/produtos/atheeri-lattafa-1d1bb/', platform: 'nuvemshop', name: 'Atheeri – Lattafa', price: '569', currency: 'BRL', img: /-1024-1024\.webp$/, confidence: 'high' },
  { f: 'vtex-produto.html', url: 'https://www.loja-exemplo.com.br/geladeira-brastemp-frost-free-inox-385l/p', platform: 'vtex', name: 'Geladeira Brastemp Frost Free 385 Litros Duplex cor Inox - BRM46MK', price: '2829', currency: 'BRL', img: /vtexassets\.com\/arquivos\/ids\/282427\/01_Brastemp_Geladeira_BRM46MK_Imagem_Frontal\.jpg/, confidence: 'high', brand: 'Brastemp' },
  { f: 'tray-produto.html', url: 'https://www.loja-exemplo.com.br/cama-box-casal-madri-molas-ensacadas-fabrispuma', platform: 'tray', name: 'Cama Box Casal Madri Molas Ensacadas Fabrispuma', price: '1410.80', currency: 'BRL', img: /images\.tcdn\.com\.br\/img\/img_prod\/1083165\/cama_box_casal_madri[^/]*\.jpg$/, confidence: 'high' },
  { f: 'wix-produto.html', url: 'https://www.loja-exemplo.com/product-page/le-sac-de-jeanne', platform: 'wix', name: 'Le Sac de Jeanne', price: '160', currency: 'USD', img: /^https:\/\/static\.wixstatic\.com\/media\/70aca0_7f466de3257248928917e4b679a97c12~mv2\.jpg\/v1\/fit\/w_1600,h_1600,q_90\/70aca0_7f466de3257248928917e4b679a97c12~mv2\.jpg$/, confidence: 'high' },
  { f: 'squarespace-produto.html', url: 'https://loja-exemplo.com/shop/major-hydrator-anytime-face-moisturiser', platform: 'squarespace', name: 'Major Hydrator | Anytime Face Moisturiser', price: '22.00', currency: 'GBP', img: /james-jake-product-major-hydrator-large\.001\.jpeg\?format=1500w$/, confidence: 'high' },
  { f: 'bigcommerce-produto.html', url: 'https://cornerstone-light-demo.mybigcommerce.com/all/orbit-terrarium-large/', platform: 'bigcommerce', name: 'Orbit Terrarium (Large)', price: '109', currency: 'CAD', img: /cdn11\.bigcommerce\.com\/s-n0i50vy\/.*roundterrariumlarge/, confidence: 'high', brand: 'OFS' },
  { f: 'magento-produto.html', url: 'https://www.loja-exemplo.com/joust-duffle-bag.html', platform: 'magento', name: 'Joust Duffle Bag', price: '34', currency: 'USD', img: /\/media\/catalog\/product\/cache\/22ff82cb4bed484efcc9e0a46bcf5b06\/m\/b\/mb01-blue-0\.jpg$/, confidence: 'high' },
  { f: 'amazon-produto.html', url: 'https://www.amazon.com/dp/B07FZ8S74R', platform: 'amazon', name: 'Echo Dot (3rd Gen, 2018 release) - Smart speaker with Alexa - Charcoal', price: null, currency: null, img: /^https:\/\/m\.media-amazon\.com\/images\/I\/61MZfowYoaL\._AC_SL1000_\.jpg$/, confidence: 'medium' },
]
const lerFix = (L, c) => L.readProductPage(L.decodeHtmlBytes(bytes(c.f), 'text/html'), c.url)
const lojaOk = (L, c) => { const r = lerFix(L, c); return r.platform === c.platform && r.blocked === null && r.name === c.name && r.price === c.price && r.currency === c.currency && c.img.test(r.images[0] ?? '') && r.images.length <= 3 && r.confidence === c.confidence && (!c.brand || r.brand === c.brand) }
const L0 = leitor()
for (const c of LOJAS) {
  ok(tenta(() => lojaOk(L0, c)), `1 ${c.platform}: "${c.name.slice(0, 40)}" · ${c.currency ?? '—'} ${c.price ?? 'sem preço'} · foto grande · confiança ${c.confidence}`)
}
ok(tenta(() => { const r = lerFix(L0, LOJAS[3]); return r.images.length === 3 && !/3299/.test(JSON.stringify(r)) }), '1 vtex: até 3 fotos; o listPrice 3299 ("de") não aparece em lugar nenhum')
ok(tenta(() => { const r = lerFix(L0, LOJAS[5]); return r.images.length === 3 && new Set(r.images.map((u) => u.split('/').pop())).size === 3 }), '1 wix: as 3 fotos com nomes de arquivo diferentes (o "file.jpg" do Wix faria as 3 parecerem a mesma no download)')
ok(tenta(() => { const r = lerFix(L0, LOJAS[0]); return r.images.length === 1 }), '1 shopify: as 4 larguras da MESMA foto (&width=100…900) contam uma vez, pedida a 1600')
ok(tenta(() => { const f = L0.readLinkFacts(L0.decodeHtmlBytes(bytes('tray-produto.html'), 'text/html'), LOJAS[4].url); return f.title === LOJAS[4].name && f.price === 'BRL 1410.80' && f.platform === 'tray' && f.confidence === 'high' && f.currency === 'BRL' && /colchão/.test(f.description) }),
  '1 readLinkFacts (a v1 e a v2 usam): o leitor de plataformas manda no nome, no preço ("BRL 1410.80") e na confiança')

// ═══ 2. página que não dá para ler ═══════════════════════════════════════════════════════════════════════════════════
console.log('\n2. robô, login e só-JavaScript: o aviso honesto')
const BLOQ = [
  { f: 'etsy-bloqueio-datadome.html', url: 'https://www.etsy.com/listing/568891609', kind: 'captcha', platform: 'etsy', msg: /^Etsy blocks automatic reading\. Upload the product photo instead\.$/ },
  { f: 'cloudflare-bloqueio.html', url: 'https://www.loja-exemplo.co.uk/4-section-stackable-leatherette-tray-black', kind: 'captcha', platform: 'generic', msg: /^This site blocks automatic reading\. Upload the product photo instead\.$/ },
  { f: 'lojaintegrada-bloqueio.html', url: 'https://www.loja-exemplo.com.br/', kind: 'captcha', platform: 'lojaintegrada', msg: /blocks automatic reading/ },
  { f: 'mercadolivre-login.html', url: 'https://www.mercadolivre.com.br/gz/account-verification?go=https%3A%2F%2Flista.mercadolivre.com.br%2Fcafe', kind: 'login', platform: 'mercadolivre', msg: /^Mercado Livre asks for a login/ },
  { f: 'amazon-captcha-sintetica.html', url: 'https://www.amazon.com/dp/B07FZ8S74R', kind: 'captcha', platform: 'amazon', msg: /^Amazon blocks automatic reading\. Upload the product photo instead\.$/ },
  { f: 'spa-so-javascript-sintetica.html', url: 'https://www.loja-exemplo.com/p/tenis-x', kind: 'js_only', platform: 'generic', msg: /only shows the product after running JavaScript/ },
]
const bloqOk = (L, c) => { const r = lerFix(L, c); return r.blocked === c.kind && r.platform === c.platform && r.name === '' && r.price === null && r.images.length === 0 && r.confidence === 'low' && c.msg.test(L.linkBlockMessage(r.platform, r.blocked)) }
for (const c of BLOQ) ok(tenta(() => bloqOk(L0, c)), `2 ${c.f.replace(/\.html$/, '')}: ${c.kind} (${c.platform}) → nada inventado, confiança baixa, aviso honesto`)
// O script de captcha do formulário de login/contato que TODA loja Shopify carrega (o "captcha-bootstrap" da página real de
// 14/10) e o formulário de login do Magento: com o produto na página, nada disso é página de robô nem de login.
const COM_CAPTCHA = (f) => new TextDecoder().decode(bytes(f)).replace('</body>', `<script id="captcha-bootstrap">!function(){'use strict';const t='contact',e='account',n='new_comment';[[e,'customer_login'],[e,'recover_customer_password']]}();</script><form action="/customer/account/loginPost/"><input type="password" name="login[password]"></form></body>`)
ok(tenta(() => [LOJAS[0], LOJAS[8], LOJAS[6]].every((c) => { const r = L0.readProductPage(COM_CAPTCHA(c.f), c.url); return r.blocked === null && r.name === c.name && r.price === c.price }) && LOJAS.every((c) => lerFix(L0, c).blocked === null)),
  '2 loja de verdade com o script de captcha e o formulário de senha (Shopify/Magento/Squarespace) NÃO é página de robô nem de login')

// ═══ 3. as regras do preço e do nome ═════════════════════════════════════════════════════════════════════════════════
console.log('\n3. preço de VENDA ou nenhum; nome conferido')
const P = (ld, extra = '', url = 'https://loja.example.com/product/camiseta-azul/') => `<html><head><title>Camiseta Azul – Loja</title><meta property="og:title" content="Camiseta Azul">${extra}<script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`
const FAIXA = P({ '@type': 'Product', name: 'Camiseta Azul', image: 'https://loja.example.com/wp-content/uploads/azul.jpg', offers: { '@type': 'AggregateOffer', lowPrice: '20.00', highPrice: '35.00', priceCurrency: 'USD' } })
const faixaOk = (L) => { const r = L.readProductPage(FAIXA, 'https://loja.example.com/product/camiseta-azul/'); return r.price === null && r.currency === null && r.reasons.includes('price_range') && r.confidence === 'medium' && r.name === 'Camiseta Azul' }
ok(tenta(() => faixaOk(L0)), '3a variável do WooCommerce (AggregateOffer 20–35) = SEM preço (o 20 seria o "a partir de"), confiança média')
const CONFLITO = P({ '@type': 'Product', name: 'Camiseta Azul', offers: { '@type': 'Offer', price: '50.00', priceCurrency: 'USD' } }, '<meta property="product:price:amount" content="45.00"><meta property="product:price:currency" content="USD">')
ok(tenta(() => { const r = L0.readProductPage(CONFLITO, 'https://loja.example.com/product/camiseta-azul/'); return r.price === null && r.reasons.includes('price_conflict') }), '3b JSON-LD 50 × meta 45 sem a plataforma desempatar = SEM preço (errado é pior que nenhum)')
const DE = P({ '@type': 'Product', name: 'Camiseta Azul', image: 'https://cdn11.bigcommerce.com/s-x/products/1/images/2/azul.jpg', offers: { '@type': 'Offer', price: '150.00', priceCurrency: 'USD' } }, '', 'x').replace('</body>', '<script>var BCData = {"product_attributes":{"price":{"without_tax":{"formatted":"$99.00","value":99,"currency":"USD"},"rrp_without_tax":{"formatted":"$150.00","value":150,"currency":"USD"}}}};</script></body>')
const deOk = (L) => { const r = L.readProductPage(DE, 'https://loja.example.com/camiseta-azul/'); return r.platform === 'bigcommerce' && r.price === '99' && r.currency === 'USD' && !r.reasons.includes('price_disagrees_jsonld') }
ok(tenta(() => deOk(L0)), '3c o JSON-LD traz o "de" (150) e a plataforma a venda (99, rrp 150): fica o 99 (sintético)')
const IO = '<html><head><title>Tênis Corrida X</title><link rel="preconnect" href="https://lojaexemplo.vtexassets.com"></head><body><script>__STATE__ = {"Product:sp-1":{"productName":"Tênis Corrida X","brand":"Marca X"},"$Product:sp-1.items.0.sellers.0.commertialOffer":{"Price":199.9,"ListPrice":299.9,"AvailableQuantity":5}};</script></body></html>'
ok(tenta(() => { const r = L0.readProductPage(IO, 'https://www.loja.example.com.br/tenis-corrida-x/p'); return r.platform === 'vtex' && r.name === 'Tênis Corrida X' && r.price === '199.90' && r.brand === 'Marca X' && !/299\.9/.test(r.price) }), '3d VTEX IO (__STATE__): Price 199,90 é a venda; ListPrice 299,90 ("de") nunca (sintético)')
const VARIA = '<html><head><title>Boné – Loja</title><meta property="og:title" content="Boné"><link href="//cdn.shopify.com/s/files/x.css"></head><body><script>var meta = {"product":{"vendor":"Loja","variants":[{"price":5900},{"price":7900}]}};</script></body></html>'
ok(tenta(() => { const r = L0.readProductPage(VARIA, 'https://loja.example.com/products/bone'); return r.platform === 'shopify' && r.price === null && r.reasons.includes('price_varies') }), '3e Shopify com variantes de preços diferentes e sem o JSON-LD desempatar = SEM preço (sintético)')
const TROCADO = new TextDecoder().decode(bytes('magento-produto.html')).replace('itemprop="name">Joust Duffle Bag</span>', 'itemprop="name">Delina Eau de Parfum</span>')
const nomeOk = (L) => { const r = L.readProductPage(TROCADO, 'https://www.loja-exemplo.com/joust-duffle-bag.html'); return r.name === 'Joust Duffle Bag' && r.reasons.includes('name_mismatch') && r.reasons.includes('name_from_title') && r.confidence === 'low' }
ok(tenta(() => nomeOk(L0)), '3f nome da plataforma que não confere com og:title/<title>/slug ("Delina" na página da Joust) = o título, confiança baixa')
ok(tenta(() => { const r = lerFix(L0, LOJAS[4]); return r.price === '1410.80' && !/2435|1567/.test(r.price) }), '3g Tray: o "Por" à vista que o JSON-LD e o 1x confirmam (1410,80); o "De" 2435,97 nunca')

// ═══ 4. as portas JSON e o charset ═══════════════════════════════════════════════════════════════════════════════════
console.log('\n4. /products/<handle>.js, busca VTEX, charset')
const JS = new TextDecoder().decode(bytes('shopify-produto.js.json'))
ok(tenta(() => { const p = L0.shopifyProductFromJs(JS); return p.title === 'XL Handmade Ceramic Mug: Plum, Nutmeg and Cinnamon' && p.vendor === 'AMRITA LASH' && p.price === '60.00' && p.images.length === 4 && p.images.every((u) => u.startsWith('https://cdn.shopify.com/')) }),
  '4a Shopify .js: título, marca, 6000 centavos = 60.00, fotos "//cdn" viram https')
ok(tenta(() => { const o = JSON.parse(JS); o.variants = [{ price: 5000 }, { price: 7000 }]; return L0.shopifyProductFromJs(JSON.stringify(o)).price === null && L0.shopifyProductFromJson(JSON.stringify({ product: { title: 'x', variants: [{ price: '50.00' }, { price: '70.00' }] } })).price === null && L0.shopifyProductFromJson(JSON.stringify({ product: { title: 'x', variants: [{ price: '50.00' }, { price: '50.00' }] } })).price === '50.00' }),
  '4b Shopify .js/.json com variantes de preços diferentes = sem preço (o variants[0] era o "a partir de"); preços iguais seguem')
const VB = new TextDecoder().decode(bytes('vtex-busca.json'))
ok(tenta(() => { const v = L0.vtexProductFromSearch(VB); return v.name === 'Geladeira Brastemp Frost Free 385 Litros Duplex cor Inox - BRM46MK' && v.brand === 'Brastemp' && v.price === '2829.00' && v.from === '3299.00' && v.images.length === 3 && L0.vtexProductFromSearch('x') === null }),
  '4c busca pública da VTEX: Price 2829 (venda) — ListPrice 3299 fica como "de"; 3 fotos')
const trayBytes = bytes('tray-produto.html')
ok(tenta(() => /colchão de molas/.test(L0.decodeHtmlBytes(trayBytes, 'text/html')) && /colchão/.test(L0.decodeHtmlBytes(trayBytes, 'text/html; charset=ISO-8859-1')) && !/colchão/.test(new TextDecoder('utf-8').decode(trayBytes)) && L0.decodeHtmlBytes(new TextEncoder().encode('<p>ação</p>'), null) === '<p>ação</p>'),
  '4d charset: a Tray (ISO-8859-1, declarada no <meta>) sai com acento; em UTF-8 puro sairia "colch�o"; sem charset = UTF-8')

// ═══ 5. a rede (v2Link com fetch e DNS falsos) ═══════════════════════════════════════════════════════════════════════
console.log('\n5. a rede: o aviso certo e as portas certas')
const JPG = (n) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b }
function internet(site) {
  const calls = []
  const fetch = async (u) => {
    const url = String(u)
    calls.push(url)
    const r = site[url]
    if (!r) return new Response('nao achou', { status: 404 })
    if (r.status) return new Response(r.html ?? 'barrado', { status: r.status, headers: { 'content-type': 'text/html' } })
    if (r.json !== undefined) return new Response(typeof r.json === 'string' ? r.json : JSON.stringify(r.json), { status: 200, headers: { 'content-type': 'application/json' } })
    if (r.html !== undefined) return new Response(r.html, { status: 200, headers: { 'content-type': r.type ?? 'text/html' } })
    return new Response(r.bytes, { status: 200, headers: { 'content-type': r.type ?? 'image/jpeg' } })
  }
  const lookup = async () => [{ address: '93.184.216.60', family: 4 }]
  return { fetch, lookup, calls }
}
const rede = (net, over = {}) => mundo(over, { 'node:dns/promises': { lookup: net.lookup } }, { fetch: net.fetch, AbortSignal, Response, ReadableStream })(F.v2Link)
const AMZ = 'https://www.amazon.com/dp/B07FZ8S74R'
const amazon503Ok = async (V) => { const why = {}; const r = await V(internet({ [AMZ]: { status: 503 } })).adsV2LinkImport(AMZ, { why }); return r === null && why.value === 'blocked' && why.platform === 'amazon' && why.message === 'Amazon blocks automatic reading. Upload the product photo instead.' }
await check('5a Amazon que barra (503): null, why "blocked" (a tela já traduz), plataforma amazon e o aviso da Amazon', () => amazon503Ok((n) => rede(n)))
const captchaOk = async (V) => { const why = {}; const r = await V(internet({ [AMZ]: { html: bytes('amazon-captcha-sintetica.html') } })).adsV2LinkImport(AMZ, { why }); return r === null && why.value === 'blocked' && why.detail === 'captcha' && why.platform === 'amazon' && /^Amazon blocks/.test(why.message) }
await check('5b Amazon "Robot Check" com HTTP 200: a página de robô NÃO vira produto — why "blocked", detalhe captcha, aviso da Amazon', () => captchaOk((n) => rede(n)))
const SPA = 'https://www.loja-exemplo.com/p/tenis-x'
await check('5c loja só-JavaScript: null, why "not_html" (a tela diz "não conseguimos abrir"), detalhe js_only e o aviso', async () => {
  const why = {}
  const r = await rede(internet({ [SPA]: { html: bytes('spa-so-javascript-sintetica.html') } })).adsV2LinkImport(SPA, { why })
  return r === null && why.value === 'not_html' && why.detail === 'js_only' && /JavaScript/.test(why.message)
})
const TRAY = LOJAS[4].url
const TRAY_IMG = 'https://images.tcdn.com.br/img/img_prod/1083165/cama_box_casal_madri_molas_ensacadas_fabrispuma_9571_1_c3c2585dcda619dd76a505b9c7e6697a.jpg'
await check('5d Tray servida em ISO-8859-1: o título e a frase saem com acento, preço "BRL 1410.80", confiança high, a foto do produto', async () => {
  const r = await rede(internet({ [TRAY]: { html: trayBytes, type: 'text/html; charset=iso-8859-1' }, [TRAY_IMG]: { bytes: JPG(40_000) } })).adsV2LinkImport(TRAY)
  return r && r.title === LOJAS[4].name && /colchão/.test(r.text) && !/�/.test(r.text) && r.price === 'BRL 1410.80' && r.currency === 'BRL' && r.confidence === 'high' && r.platform === 'tray' && r.images.length === 1 && r.images[0].src === TRAY_IMG
})
const SHOP = 'https://shop.loja-exemplo.com/products/xl-handmade-ceramic-mug-plum-nutmeg-and-cinnamon'
const jsOk = async (V) => {
  const o = JSON.parse(JS)
  const img = 'https://cdn.shopify.com/s/files/1/0615/0341/files/IMG_1600_fab630ff-b5dd-4aca-9227-e9014730a4d5.jpg?v=1786547418'
  const net = internet({ [SHOP]: { status: 403 }, [`${SHOP}.js`]: { json: o }, [img]: { bytes: JPG(50_000) } })
  const r = await V(net).adsV2LinkImport(SHOP)
  return r && r.title === o.title && r.price === '60.00' && r.images.length >= 1 && net.calls.includes(`${SHOP}.json`) && net.calls.includes(`${SHOP}.js`) && r.confidence === 'medium' && r.platform === 'shopify'
}
await check('5e Shopify que barra a página E o .json: o /products/<handle>.js salva (título, 60.00, fotos), confiança média', () => jsOk((n) => rede(n)))
const VTEX = LOJAS[3].url
const VTEX_SEM_LD = new TextDecoder().decode(bytes('vtex-produto.html')).replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Product"[\s\S]*?<\/script>/, '').replace(/<meta property="og:image"[^>]*>/g, '').replace(/<meta property="product:price:[^>]*>/g, '')
await check('5f VTEX sem JSON-LD de produto: a busca pública do catálogo traz o preço de VENDA (2829.00, nunca o 3299) e as fotos', async () => {
  const api = 'https://www.loja-exemplo.com.br/api/catalog_system/pub/products/search/geladeira-brastemp-frost-free-inox-385l/p'
  const site = { [VTEX]: { html: VTEX_SEM_LD }, [api]: { json: VB } }
  for (const it of JSON.parse(VB)[0].items) for (const im of it.images) site[im.imageUrl] = { bytes: JPG(30_000) }
  const net = internet(site)
  const r = await rede(net).adsV2LinkImport(VTEX)
  return r && /2829\.00$/.test(r.price ?? '') && !/3299/.test(r.price) && r.images.length === 3 && net.calls.includes(api) && (r.reasons ?? []).includes('vtex_search')
})
await check('5h página de robô (Cloudflare, HTTP 200) num endereço /products/<handle>: o JSON do Shopify ainda fala (nada inventado, confiança média)', async () => {
  const net = internet({ [SHOP]: { html: bytes('cloudflare-bloqueio.html') }, [`${SHOP}.json`]: { json: { product: { title: 'XL Mug', vendor: 'Amrita', variants: [{ price: '60.00' }], images: [] } } } })
  const r = await rede(net).adsV2LinkImport(SHOP)
  return r && r.title === 'XL Mug' && r.price === '60.00' && r.confidence === 'medium' && r.images.length === 0
})
await check('5g anti-SSRF intacto: a busca VTEX e o .js do Shopify só na MESMA origem da página', async () => {
  const net = internet({ [SHOP]: { status: 403 } })
  await rede(net).adsV2LinkImport(SHOP)
  return net.calls.every((c) => c.startsWith('https://shop.loja-exemplo.com/products/'))
})

// ═══ 6. a rota e a tela ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n6. a rota devolve a confiança; a tela ficou como estava')
const rotaOk = (s) => { const c = code(s); return /platform: read\.platform \?\? null,/.test(c) && /currency: read\.currency \?\? null,/.test(c) && /confidence: read\.confidence \?\? null,/.test(c) && /reasons: read\.reasons \?\? \[\],/.test(c) && /\.\.\.\(failWhy\.message \? \{ message: failWhy\.message \} : \{\}\)/.test(c) && /why: failWhy\.value \?\? 'unreachable'/.test(c) }
ok(tenta(() => rotaOk(SRC.route)), '6a /api/ads/v2/link-import devolve platform/currency/brand/confidence/reasons; o 422 leva why (de sempre) + detail/platform/message')
ok(tenta(() => [F.simple, F.flow, F.batch, F.linkImport].every((f) => desfazPosEntrega1510(f, semMarcas1510(f, semLinkTela1510(f, read(f)))) === base(f))) /* reancorado KINEO-LEVA-ADS-AGENCIA-1510 — as camadas mais novas da tela saem antes */ /* reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor (a mais nova) sai primeiro */, '6b a tela (AdsV2Simple, AdsFlow, AdsV2Batch) e as frases (v2LinkImport) intocadas: outra pista cuida da tela')
ok(tenta(() => !/^\s*import\s(?!type)/m.test(SRC.reader)), '6c linkReader.ts segue PURO (só import type): vai ao cliente')

// ═══ 7. o desfaz ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n7. o desfaz volta os 3 arquivos ao pai do commit')
ok(LINK_LOJAS_1510_ARQUIVOS.length === 3 && LINK_LOJAS_1510_ARQUIVOS.every((f) => tenta(() => semLinkLojas1510(f, read(f)) === base(f))), '7a desfeito, linkReader, v2Link e /link-import são EXATAMENTE o pai do commit')
ok(tenta(() => { try { semLinkLojas1510(F.reader, base(F.reader)); return false } catch { return true } }), '7b o desfaz LANÇA quando o bloco não está lá (nunca engole mudança)')
ok(LINK_LOJAS_1510_ARQUIVOS.every((f) => read(f).split('\n').some((l) => l.includes(MARCA_LINK_LOJAS_1510))), '7c cada arquivo tocado leva a marca KINEO-ADS-LINK-LOJAS-1510')

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um aplicado tem de ficar vermelho)')
const comLeitor = (t) => leitor({ [F.reader]: t })
const m1 = trocar(SRC.reader, '      else if (lo || hi) out.range = true\n', '      else if (lo) seen.push({ n: lo, raw: o.lowPrice })\n')
ok(await vermelho(() => faixaOk(comLeitor(m1))), 'M1 a faixa do WooCommerce aceita o lowPrice ("a partir de") → 3a vermelho')
const m2 = trocar(SRC.reader, "  return { name: prod ? clean(item.title as string, 160) : '', prices, from, currency }", "  return { name: '', prices, from, currency }")
ok(await vermelho(() => lojaOk(comLeitor(m2), LOJAS[6])), 'M2 Squarespace sem o nome do item (fica o título de SEO do JSON-LD) → 1 squarespace vermelho')
const m11 = trocar(SRC.reader, "  const from = ['rrp_without_tax', 'rrp_with_tax', 'non_sale_price_without_tax', 'non_sale_price_with_tax'].map", '  const from = [].map')
ok(await vermelho(() => deOk(comLeitor(m11))), 'M11 o "de" (rrp) do BigCommerce esquecido → o JSON-LD 150 desmente a plataforma → 3c vermelho')
const m3 = trocar(SRC.reader, '  if (hasProduct) return null\n', '  return null\n')
ok(await vermelho(() => BLOQ.filter((c) => c.kind !== 'login').every((c) => bloqOk(comLeitor(m3), c))), 'M3 sem a detecção de robô/só-JS (a página de captcha viraria "produto") → 2 vermelho')
const m4 = trocar(SRC.reader, "    if (typeIs(n, 'Product') || typeIs(n, 'ProductGroup')) found.push", "    if (typeIs(n, 'Product')) found.push")
ok(await vermelho(() => lojaOk(comLeitor(m4), LOJAS[0])), 'M4 ProductGroup do Shopify esquecido (o nome vira o og:title com a cor) → 1 shopify vermelho')
const m5 = trocar(SRC.reader, "  try { return new TextDecoder((cs || 'utf-8').toLowerCase()).decode(b) }", "  try { return new TextDecoder('utf-8').decode(b) }")
ok(await vermelho(() => { const L = comLeitor(m5); return /colchão/.test(L.decodeHtmlBytes(trayBytes, 'text/html')) }), 'M5 charset ignorado (tudo UTF-8) → a Tray sai com "�" → 4d vermelho')
const m6 = trocar(SRC.reader, '      if (m && Number(m[2]) < 1600) return `${x.origin}', '      if (m && Number(m[2]) < 0) return `${x.origin}')
ok(await vermelho(() => lojaOk(comLeitor(m6), LOJAS[5])), 'M6 Wix sem a versão de 1600 px (fica a de 500) → 1 wix vermelho')
const m7 = trocar(SRC.reader, "  if (name && !productNameMatchesPage(name, { titles: [ogTitle, titleTag], url: pageUrl })) { reasons.push('name_mismatch'); name = '' }", "  if (false) { reasons.push('name_mismatch'); name = '' }")
ok(await vermelho(() => nomeOk(comLeitor(m7))), 'M7 sem a conferência do nome ("Delina" na página da Joust passaria) → 3f vermelho')
const m8 = trocar(SRC.v2Link, '  if (facts?.blocked) { // KINEO-ADS-LINK-LOJAS-1510', '  if (facts?.blocked && false) { // KINEO-ADS-LINK-LOJAS-1510')
ok(await vermelho(() => captchaOk((n) => rede(n, { [F.v2Link]: m8 }))), 'M8 a rede sem o porquê da página de robô (a Amazon "Robot Check" viraria produto) → 5b vermelho')
const m9 = trocar(SRC.v2Link, '  if (fromJson || !j) return fromJson // KINEO-ADS-LINK-LOJAS-1510\n', '  return fromJson // KINEO-ADS-LINK-LOJAS-1510\n')
ok(await vermelho(() => jsOk((n) => rede(n, { [F.v2Link]: m9 }))), 'M9 sem a porta /products/<handle>.js → 5e vermelho')
const m10 = trocar(SRC.v2Link, "    if (opts.why?.value === 'blocked') { const pf", "    if (false) { const pf")
ok(await vermelho(() => amazon503Ok((n) => rede(n, { [F.v2Link]: m10 }))), 'M10 a Amazon que barra (503) sem o aviso da Amazon → 5a vermelho')

console.log(`\ntest-ads-link-lojas-1510: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
