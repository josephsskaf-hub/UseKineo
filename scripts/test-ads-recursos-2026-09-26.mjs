// KINEO-ADS-LINK + KIT-MARCA + VERSOES — 2026-09-26 — guardião dos itens 1, 2, 4 e 5 da pesquisa de concorrentes.
// (1) link → anúncio: o leitor puro extrai título/descrição/preço/imagens/logo de HTML real (og, JSON-LD) e recusa
// endereço interno; a rota valida cada salto, baixa só JPG/PNG pelos bytes, modera e salva na pasta da conta.
// (4) kit da marca: a marca do último anúncio com logo + contato; (2)(5) versões: outra abertura, outra língua, outro formato.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()
const L = load('@/lib/ads/linkReader')

// ── (1) leitor ──────────────────────────────────────────────────────────────
const SHOP = `<!doctype html><html><head><title>Tree Runner – Allbirds</title>
<meta property="og:site_name" content="Allbirds"><meta property="og:title" content="Men's Tree Runners">
<meta property="og:description" content="Breathable, lightweight sneakers made with eucalyptus tree fiber.">
<meta property="og:image" content="//cdn.shop.com/img/runner-1.jpg?v=2"><meta property="og:image" content="https://cdn.shop.com/img/runner-1.jpg?v=2">
<meta name="twitter:image" content="/img/runner-side.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Men's Tree Runners","image":["https://cdn.shop.com/img/runner-2.jpg","https://cdn.shop.com/img/runner-3.jpg"],"offers":{"@type":"Offer","price":"98.00","priceCurrency":"USD"}}</script>
</head><body>x</body></html>`
const f = L.readLinkFacts(SHOP, 'https://www.allbirds.com/products/mens-tree-runners')
checa('leitor: título do produto (JSON-LD vence og)', f.title === "Men's Tree Runners")
checa('leitor: nome da loja', f.siteName === 'Allbirds')
checa('leitor: descrição', f.description.startsWith('Breathable, lightweight sneakers'))
checa('leitor: preço com moeda', f.price === 'USD 98.00')
checa('leitor: imagens absolutas, sem repetir, produto primeiro', f.images[0] === 'https://cdn.shop.com/img/runner-2.jpg' && f.images.includes('https://cdn.shop.com/img/runner-1.jpg?v=2') && f.images.includes('https://www.allbirds.com/img/runner-side.png') && new Set(f.images).size === f.images.length)
checa('leitor: logo = apple-touch-icon (nunca o favicon .ico)', f.logo === 'https://www.allbirds.com/apple-touch-icon.png')
checa('leitor: host sem www', f.host === 'allbirds.com')
const frase = L.linkSentence(f)
checa('frase: nome, descrição, preço e site, sem inventar', frase.startsWith("Allbirds — Men's Tree Runners.") && frase.includes('Price: USD 98.00.') && frase.includes('Website: allbirds.com.'))
const pobre = L.readLinkFacts('<html><head><title>Padaria Pão &amp; Cia</title></head></html>', 'https://paoecia.com.br/')
checa('página pobre: título com entidade decodificada, sem preço, sem imagem', pobre.title === 'Padaria Pão & Cia' && pobre.price === null && pobre.images.length === 0 && pobre.logo === null)
checa('JSON-LD quebrado não derruba', L.readLinkFacts('<script type="application/ld+json">{oops</script><title>X</title>', 'https://x.com').title === 'X')
checa('logo SVG é ignorado', L.readLinkFacts('<link rel="apple-touch-icon" href="/l.svg">', 'https://x.com').logo === null)

// segurança do endereço
checa('link: aceita site sem https:// (completa)', L.safeLinkUrl('padaria.com.br/cardapio')?.toString() === 'https://padaria.com.br/cardapio')
for (const bad of ['http://localhost:3000', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://169.254.169.254/latest/meta-data', 'http://192.168.1.1', 'http://[::1]/', 'file:///etc/passwd', 'ftp://x.com', 'http://user:pw@x.com', 'http://x.com:8080/', 'http://intranet/', 'http://printer.local/'])
  checa(`link: recusa ${bad}`, L.safeLinkUrl(bad) === null)
checa('IP privado: 172.16-31 e 100.64 (CGNAT)', L.isPrivateHost('172.20.1.1') && L.isPrivateHost('100.100.1.1') && !L.isPrivateHost('172.32.0.1') && !L.isPrivateHost('8.8.8.8'))

const RT = rd('app/api/ads/from-link/route.ts')
const pos = (s) => RT.indexOf(s)
checa('rota: login → interruptor → acesso → pedido do dono em rascunho → teto, antes de baixar', pos('auth.getUser()') < pos('adsAutoVisible(reason)') && pos('adsAutoVisible(reason)') < pos('adsGate(reason)') && pos(".eq('user_id', user.id)") < pos('safeGet(target') && pos('ADS_LINK_DAILY_CAP') < pos('safeGet(target'))
checa('rota: redirecionamento manual e cada salto revalidado (DNS incluso)', RT.includes("redirect: 'manual'") && RT.includes('if (!(await publicHost(url))) return null') && RT.includes('const nu = next ? safeLinkUrl(new URL(next, url).toString()) : null'))
checa('rota: DNS não pode apontar para IP interno', RT.includes('addrs.every((a) => !isPrivateHost(a.address))'))
checa('rota: só JPG/PNG pelos bytes', RT.includes('const ext = img ? imageExt(img.body) : null'))
checa('rota: texto moderado antes de salvar imagem', pos("surface: 'ads_brief'") < pos('.storage.from(USER_FOOTAGE_BUCKET).upload('))
checa('rota: cada imagem moderada, barrada vai à quarentena', RT.includes("surface: 'footage', stage: 'upload'") && RT.includes("quarantineObject(store, { bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' })"))
checa('rota: respeita a cota de armazenamento', RT.includes('FOOTAGE_QUOTA_PAID - (await totalFootageBytes(user.id))') && RT.includes('img.body.byteLength > room'))
checa('rota: salva na pasta da PRÓPRIA conta', RT.includes('const path = `${user.id}/clip-${Date.now()}-${i}.${ext}`'))
checa('rota: só exports válidos de rota do Next', !/^export const (ADS_|PAGE_|IMAGE_)/m.test(RT))

// ── (4)(2)(5) tela ─────────────────────────────────────────────────────────
const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const fn = (name) => { const i = W.indexOf(`function ${name}(`); return W.slice(i, W.indexOf('\n}\n', i) + 3) }
const ts = createRequire(import.meta.url)(join(root, 'node_modules', 'typescript'))
const run = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports); return m.exports }
const K = run(`const BUSINESS_SEP = ' — '\n${fn('orderMedia')}\n${fn('splitBusiness')}\n${fn('lastBrandFrom')}\n${fn('brandSentence')}\nmodule.exports = { lastBrandFrom, brandSentence }`)
const logo = { footageId: 'l', url: 'u', kind: 'image', isLogo: true }
const orders = [
  { id: 'n', brief: { business: 'Sem Logo', contact: 'x' }, media: [] },
  { id: 'a', brief: { business: 'Brasa — peixes', contact: '+55 11 98765-4321', offer: 'Jantar R$189', cta: 'whatsapp' }, media: [logo, { footageId: 'p', isLogo: false, kind: 'image' }] },
  { id: 'b', brief: { business: 'Antigo', contact: 'y' }, media: [logo] },
]
const kit = K.lastBrandFrom(orders)
checa('kit: pula pedido sem logo e pega o mais recente com logo + contato', kit && kit.brief.business === 'Brasa — peixes' && kit.logo.footageId === 'l')
checa('kit: frase começa pela marca e deixa a oferta para trocar', K.brandSentence(kit.brief) === 'Brasa, peixes. Jantar R$189. Contact: +55 11 98765-4321.')
checa('kit: sem histórico = sem cartão', K.lastBrandFrom([]) === null)
checa('kit: só a tela nova oferece e copia só o logo', W.includes('{!order && brand ? (') && W.includes('await patchOrder(created.data.order.id, { media: [stripItem(brand.logo)] })'))
checa('versões: A/B escolhe abertura diferente da origem', W.includes('const v = s.data.versions.find((x) => x.angle !== avoidAngle) ?? s.data.versions[0]') && W.includes("setAvoidAngle(remix.kind === 'opening' ? angleOf(base.script_angle).replace(/_edited$/, '') : null)"))
checa('versões: tradução troca só a língua do brief', W.includes('const brief: AdsBrief = { ...base.brief, language: remix.language ?? base.brief.language }'))
checa('versões: formato vem da escolha', W.includes('if (remix.format) setFormat(remix.format)'))
checa('versões: pedido NOVO (a origem fica entregue), com a mesma mídia e modelo', W.includes("await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ brief }) })") && W.includes('media: orderMedia(base).map(stripItem), consent: true, template: baseModel.id'))
checa('versões: botões só com o modo IA liberado', W.includes('onRemix={adsAutoVisible(access) ? (r) => {'))
checa('versões: a pessoa confere antes de gastar (abre na conferência)', W.includes("setPhase('confirm')\n      onRemixUsed()"))

console.log(`test-ads-recursos-2026-09-26: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
