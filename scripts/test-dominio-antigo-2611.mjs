// KINEO-DOMINIO-ANTIGO-2611 — guardião (sem rede): as URLs FINAIS dos anúncios e dos sitelinks da conta 186-928-2523 respondem no PRÓPRIO host antigo
// (shortsforgeai.com, www.shortsforgeai.com e shortsforgeai.vercel.app), igual para todo user-agent, e o resto do host antigo segue com o 308 de hoje.
// Executa a regra pura (lib/seo/dominioAntigo2611.ts) e confere a ligação no middleware.
//   A. hosts: os três antigos na regra; www.usekineo.com fora (null = o middleware de hoje);
//   B. a lista única de URLs da conta, a mesma nos três hosts: "/" e "/pricing" no lugar; "/ai-shorts/2-clicks", "/signup", "/start", "/generate" e
//      "/my-videos" mostram a home a quem CHEGA; o clique de dentro da página (Sec-Fetch-Site same-origin) nas páginas de conta leva o 308 para www;
//   C. o resto: o 308 (login, studio, admin, robots, sitemap, API de compra); a pré-carga RSC de outra página = 204 no mesmo host;
//   D. o que a página carrega ao abrir: mídia e fonte da pasta public e as chamadas de API medidas ficam no mesmo host;
//   E. o webhook do Stripe e o /api/youtube/* (callback do OAuth em shortsforgeai.vercel.app) ficam FORA da regra nos três hosts: o middleware faz o de hoje;
//   F. nada lê user-agent; o middleware aplica a regra ANTES do 308;
//   G. mutantes (só AssertionError conta).
// Rodar: node scripts/test-dominio-antigo-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LIB = 'lib/seo/dominioAntigo2611.ts', MW = 'middleware.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const HOSTS = ['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app']

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const R = createOfflineLoader({ source: (rel, t) => muda(rel, t) })('@/' + LIB)
  const mw = muda(MW, local(MW)), lib = muda(LIB, local(LIB))
  const d = (host, pathname, method = 'GET', buscaDaPagina = false, doProprioSite) => R.decidirDominioAntigo2611({ host, pathname, method, buscaDaPagina, doProprioSite })

  // A. hosts
  for (const h of [...HOSTS, 'WWW.SHORTSFORGEAI.COM']) igual(d(h, '/'), { acao: 'segue' }, `A ${h}: host antigo na regra`)
  for (const h of ['www.usekineo.com', 'usekineo.com', 'plugin.usekineo.com', 'localhost', '']) assert.equal(d(h, '/'), null, `A ${h}: fora da regra (o middleware de hoje)`)

  // B. a lista única de URLs da conta, nos três hosts
  const NO_LUGAR = ['/', '/pricing'], HOME = ['/ai-shorts/2-clicks', '/signup', '/start', '/generate', '/my-videos'], CONTA = ['/signup', '/start', '/generate', '/my-videos']
  igual(R.URLS_DA_CONTA_2611.map((u) => u.caminho), [...NO_LUGAR, ...HOME], 'B a lista única tem exatamente as 7 URLs lidas na conta')
  assert.ok(R.URLS_DA_CONTA_2611.every((u) => u.origem.length > 20), 'B cada URL diz de onde veio na conta')
  for (const h of HOSTS) {
    for (const p of NO_LUGAR) {
      igual(d(h, p), { acao: 'segue' }, `B ${h}${p} no próprio host`)
      igual(d(h, p, 'GET', false, true), { acao: 'segue' }, `B ${h}${p} clicado de dentro continua no host`)
    }
    for (const p of HOME) igual(d(h, p), { acao: 'reescreve', para: '/' }, `B ${h}${p}: quem chega vê a home no próprio host`)
    for (const p of CONTA) {
      igual(d(h, p, 'GET', false, false), { acao: 'reescreve', para: '/' }, `B ${h}${p}: quem chega do anúncio (cross-site) vê a home`)
      igual(d(h, p, 'GET', false, true), { acao: 'redireciona' }, `B ${h}${p}: o clique de dentro da página leva a www.usekineo.com (308)`)
      igual(d(h, p, 'GET', true, true), { acao: 'pre_carga_204' }, `B ${h}${p}: a pré-carga de dentro da página = 204, e o Next abre por navegação (308)`)
    }
    igual(d(h, '/ai-shorts/2-clicks', 'GET', false, true), { acao: 'reescreve', para: '/' }, `B ${h} /ai-shorts/2-clicks não é página de conta`)
    igual(d(h, '/', 'HEAD'), { acao: 'segue' }, 'B HEAD igual ao GET')
    igual(d(h, '/', 'GET', true), { acao: 'segue' }, 'B a pré-carga RSC da própria página fica no host')
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) igual(d(h, '/signup', m), { acao: 'redireciona' }, `B ${m} numa URL da conta: o 308 de hoje`)
  }

  // C. o resto do host antigo
  for (const h of HOSTS) {
    for (const p of ['/studio', '/login', '/signup/', '/generate/x', '/admin', '/robots.txt', '/sitemap.xml', '/llms.txt', '/pricing/', '/ai-shorts', '/api/stripe/checkout', '/api/generate-video-cinematic', '/auth/callback'])
      igual(d(h, p), { acao: 'redireciona' }, `C ${h}${p}: o 308 de hoje`)
    for (const p of ['/studio', '/login', '/made-with-kineo', '/pricing/annual']) igual(d(h, p, 'GET', true), { acao: 'pre_carga_204' }, `C ${h} pré-carga RSC de ${p}: 204 no mesmo host`)
  }

  // D. o que a página carrega ao abrir (medido no navegador; docs/google-ads/CONSERTO-DOMINIO-ANTIGO-2611.md)
  for (const p of ['/previews/home-card.mp4', '/fonts/outra/latin.woff2', '/favicon.ico', '/site.webmanifest', '/api/offers/bf2026', '/api/offers/studio50', '/api/offers/offer290-rescue',
    '/api/offers/annual-welcome', '/api/affiliate/offer', '/api/stripe/checkout/resume', '/api/stripe/change-plan', '/api/kling4-trial/availability', '/api/kling4-paid/availability',
    '/api/stats/public', '/api/geo', '/api/consent'])
    igual(d('shortsforgeai.com', p), { acao: 'segue' }, `D ${p}: no mesmo host`)
  igual(d('shortsforgeai.vercel.app', '/api/consent', 'POST'), { acao: 'segue' }, 'D a escolha da faixa de consentimento (POST) no mesmo host')
  igual(d('shortsforgeai.com', '/api/events', 'POST'), { acao: 'segue' }, 'D o rastro de evento (POST) no mesmo host')
  for (const [p, m] of [['/api/offers/bf2026', 'POST'], ['/api/stripe/change-plan', 'POST'], ['/api/stripe/checkout/resume', 'POST'], ['/api/events', 'PUT'], ['/api/stripe/checkout', 'POST']])
    igual(d('shortsforgeai.com', p, m), { acao: 'redireciona' }, `D ${m} ${p}: o 308 de hoje (escrita fora das duas da página)`)

  // E. webhook e YouTube fora da regra, nos três hosts (o callback do OAuth em shortsforgeai.vercel.app não muda)
  for (const h of HOSTS) {
    for (const [p, m, f] of [['/api/youtube/callback', 'GET', false], ['/api/youtube/callback', 'GET', true], ['/api/youtube/connect', 'GET', false], ['/api/stripe/webhook', 'POST', false], ['/api/stripe/webhook', 'GET', true]])
      assert.equal(d(h, p, m, f, false), null, `E ${h} ${m} ${p}: fora da regra (o middleware deixa rodar no lugar, como hoje)`)
  }
  assert.ok(mw.includes('const dominioAntigo2611 = runsOnLegacyHost(request.nextUrl.pathname) ? null : decidirDominioAntigo2611({'), 'E o middleware nem chama a regra nos caminhos que já rodavam no host antigo')
  assert.ok(mw.includes("const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])") && mw.includes("const LEGACY_HOST_DIRECT_PREFIXES = ['/api/youtube/']"), 'E as exceções de sempre não mudam')

  // F. nada lê user-agent; a ligação no middleware
  assert.ok(!/user-?agent|navigator|isbot|googlebot|adsbot/i.test(lib.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '')), 'F a regra não lê user-agent')
  const bloco = mw.slice(mw.indexOf('const dominioAntigo2611 = '), mw.indexOf('return NextResponse.redirect(canonicalUrl, 308)'))
  assert.ok(bloco.length > 0 && !/user-agent|userAgent/i.test(bloco), 'F o middleware chama a regra sem user-agent, antes do 308')
  assert.ok(mw.includes("import { decidirDominioAntigo2611 } from '@/lib/seo/dominioAntigo2611'"), 'F o import')
  assert.ok(bloco.includes("if (dominioAntigo2611?.acao === 'reescreve') {") && bloco.includes('paginaUrl.pathname = dominioAntigo2611.para') && bloco.includes('return NextResponse.rewrite(paginaUrl)'), 'F reescreve no próprio host')
  assert.ok(bloco.includes("doProprioSite: request.headers.get('sec-fetch-site') === 'same-origin',"), 'F o clique de dentro da página vem do Sec-Fetch-Site (cabeçalho do navegador)')
  assert.ok(bloco.includes("buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',"), 'F o sinal da pré-carga é o Sec-Fetch-Dest (o Next 14 apaga o cabeçalho RSC antes do middleware)')
  assert.ok(bloco.includes("if (dominioAntigo2611?.acao === 'pre_carga_204') {") && bloco.includes('return new NextResponse(null, { status: 204,'), 'F a pré-carga recebe 204')
  assert.ok(bloco.includes("LEGACY_PUBLIC_HOSTS.has(hostname) &&\n    !runsOnLegacyHost(request.nextUrl.pathname) &&\n    dominioAntigo2611?.acao !== 'segue'"), 'F o 308 de hoje só deixa passar o que a regra manda seguir')
  assert.ok(mw.includes("'shortsforgeai.com',\n  'www.shortsforgeai.com',\n  'shortsforgeai.vercel.app',"), 'F os hosts antigos do middleware não mudam')
  assert.ok(mw.includes("canonicalUrl.host = 'www.usekineo.com'\n    return NextResponse.redirect(canonicalUrl, 308)"), 'F o 308 de sempre para www.usekineo.com')
}

await suite(null)
const MUT = [
  ['vercel.app sai da regra (os 6 sitelinks)', LIB, "new Set(['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app'])", "new Set(['shortsforgeai.com', 'www.shortsforgeai.com'])"],
  ['o callback do YouTube entra na regra', LIB, "p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')", "p === '/api/stripe/webhook'"],
  ['o webhook do Stripe entra na regra', LIB, "p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')", "p.startsWith('/api/youtube/')"],
  ['o middleware chama a regra no webhook e no youtube', MW, 'runsOnLegacyHost(request.nextUrl.pathname) ? null : decidirDominioAntigo2611({', 'decidirDominioAntigo2611({'],
  ['"/generate" sai da lista', LIB, "  { caminho: '/generate', mostra: '/', clique_vai_a_www: true, origem: 'sitelink \"Start Generating Free\" (vercel.app/generate)' },\n", ''],
  ['"/my-videos" abre a página logada no host antigo', LIB, "{ caminho: '/my-videos', mostra: '/',", "{ caminho: '/my-videos', mostra: '/my-videos',"],
  ['"/signup" abre o cadastro no host antigo', LIB, "{ caminho: '/signup', mostra: '/',", "{ caminho: '/signup', mostra: '/signup',"],
  ['"/start" deixa de levar o clique a www', LIB, "{ caminho: '/start', mostra: '/', clique_vai_a_www: true,", "{ caminho: '/start', mostra: '/', clique_vai_a_www: false,"],
  ['o clique de dentro volta à home', LIB, "    if (a.doProprioSite === true && url.clique_vai_a_www) return a.buscaDaPagina ? { acao: 'pre_carga_204' } : { acao: 'redireciona' }\n", ''],
  ['quem chega do anúncio leva o 308', LIB, "    return url.mostra === a.pathname ? { acao: 'segue' } : { acao: 'reescreve', para: url.mostra }", "    return a.doProprioSite === true ? { acao: 'segue' } : { acao: 'redireciona' }"],
  ['o middleware não passa o Sec-Fetch-Site', MW, "    doProprioSite: request.headers.get('sec-fetch-site') === 'same-origin',", '    doProprioSite: false,'],
  ['POST passa numa URL da conta', LIB, "if (metodo !== 'GET' && metodo !== 'HEAD') return { acao: 'redireciona' }\n", ''],
  ['pré-carga de outra página leva o 308', LIB, "  if (a.buscaDaPagina) return { acao: 'pre_carga_204' }\n", ''],
  ['página fora da lista abre no host antigo', LIB, "  { caminho: '/pricing', mostra: '/pricing',", "  { caminho: '/studio', mostra: '/studio', clique_vai_a_www: false, origem: 'nenhuma, inventada pelo mutante' },\n  { caminho: '/pricing', mostra: '/pricing',"],
  ['robots e sitemap servidos no host antigo', LIB, '|css|js|avif)$/i', '|css|js|avif|txt|xml)$/i'],
  ['qualquer API abre no host antigo', LIB, "  if (CHAMADAS_AO_ABRIR_2611.has(a.pathname) || ARQUIVO_DA_PAGINA_2611", "  if (a.pathname.startsWith('/api/') || CHAMADAS_AO_ABRIR_2611.has(a.pathname) || ARQUIVO_DA_PAGINA_2611"],
  ['o middleware volta a ler o cabeçalho RSC (que o Next apaga)', MW, "buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',", "buscaDaPagina: request.headers.get('rsc') === '1',"],
  ['a regra lê user-agent', LIB, 'DecisaoDominioAntigo2611 | null {\n', "DecisaoDominioAntigo2611 | null {\n  if (/googlebot|adsbot/i.test(String((a as { ua?: string }).ua ?? ''))) return { acao: 'redireciona' }\n"],
  ['qualquer POST da lista de leitura passa', LIB, "if (metodo === 'POST' && ESCRITAS_AO_ABRIR_2611.has(a.pathname)) return { acao: 'segue' }", "if (metodo === 'POST' && (ESCRITAS_AO_ABRIR_2611.has(a.pathname) || CHAMADAS_AO_ABRIR_2611.has(a.pathname))) return { acao: 'segue' }"],
  ['o middleware ignora a regra no 308', MW, " &&\n    dominioAntigo2611?.acao !== 'segue'", ''],
  ['o middleware manda 308 na pré-carga', MW, "return new NextResponse(null, { status: 204,", "return NextResponse.redirect(new URL('https://www.usekineo.com'), 308); void ({ status: 204,"],
  ['o middleware tira a exceção do webhook', MW, "const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])", 'const LEGACY_HOST_DIRECT_PATHS = new Set<string>([])'],
]
let mortos = 0
for (const [nome, ...m] of MUT) {
  assert.equal(local(m[0]).split(m[1]).length, 2, 'mutante não aplica: ' + nome)
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + nome)
  mortos++
}
console.log(`PASS KINEO-DOMINIO-ANTIGO-2611: as 7 URLs da conta (anúncios e sitelinks) no próprio shortsforgeai.com, www.shortsforgeai.com e shortsforgeai.vercel.app ("/" e "/pricing" no lugar; "/ai-shorts/2-clicks", "/signup", "/start", "/generate" e "/my-videos" = a home a quem chega; o clique de dentro nas páginas de conta vai a www), só GET e HEAD, sem ler user-agent; o resto do host antigo com o 308 de hoje; pré-carga RSC de outra página = 204 no mesmo host; mídia, fonte e as chamadas ao abrir no mesmo host; webhook do Stripe e /api/youtube/* fora da regra nos três hosts; ${mortos}/${MUT.length} mutantes mortos (só AssertionError).`)
