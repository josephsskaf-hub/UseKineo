// KINEO-DOMINIO-ANTIGO-2611 — guardião (sem rede): as páginas dos 3 anúncios antigos respondem no PRÓPRIO shortsforgeai.com, igual para todo user-agent,
// e o resto do host antigo segue com o 308 de hoje. Executa a regra pura (lib/seo/dominioAntigo2611.ts) e confere a ligação no middleware.
//   A. hosts: shortsforgeai.com e www.shortsforgeai.com; shortsforgeai.vercel.app (CEO 26/11: por ora) e www.usekineo.com fora (null = o middleware de hoje);
//   B. as páginas dos anúncios: "/" e "/pricing" no próprio host; "/ai-shorts/2-clicks" mostra a home; só GET e HEAD;
//   C. o resto: o 308 (login, studio, admin, robots, sitemap, API de compra); a pré-carga RSC de outra página = 204 no mesmo host;
//   D. o que a página carrega ao abrir: mídia e fonte da pasta public e as chamadas de API medidas ficam no mesmo host;
//   E. nada lê user-agent; o middleware aplica a regra ANTES do 308 e o webhook e o /api/youtube/* nem passam pela regra;
//   F. mutantes (só AssertionError conta).
// Rodar: node scripts/test-dominio-antigo-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LIB = 'lib/seo/dominioAntigo2611.ts', MW = 'middleware.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const R = createOfflineLoader({ source: (rel, t) => muda(rel, t) })('@/' + LIB)
  const mw = muda(MW, local(MW)), lib = muda(LIB, local(LIB))
  const d = (host, pathname, method = 'GET', buscaDaPagina = false, doProprioSite) => R.decidirDominioAntigo2611({ host, pathname, method, buscaDaPagina, doProprioSite })

  // A. hosts
  for (const h of ['shortsforgeai.com', 'www.shortsforgeai.com', 'WWW.SHORTSFORGEAI.COM']) igual(d(h, '/'), { acao: 'segue' }, `A ${h}: host antigo dos anúncios`)
  for (const h of ['shortsforgeai.vercel.app', 'www.usekineo.com', 'usekineo.com', 'localhost', '']) assert.equal(d(h, '/'), null, `A ${h}: fora da regra (o middleware de hoje)`)

  // B. as páginas dos anúncios
  for (const h of ['shortsforgeai.com', 'www.shortsforgeai.com']) {
    // as URLs finais lidas na conta em 26/11: /signup (3 reprovados), /start, / e /pricing (vercel.app)
    igual(d(h, '/signup'), { acao: 'reescreve', para: '/' }, 'B "/signup" mostra a home (sem formulário no host antigo)')
    igual(d(h, '/start'), { acao: 'reescreve', para: '/' }, 'B "/start" mostra a home')
    igual(d(h, '/signup', 'GET', false, false), { acao: 'reescreve', para: '/' }, 'B quem chega do anúncio (cross-site) no "/signup" vê a home')
    igual(d(h, '/signup', 'GET', false, true), { acao: 'redireciona' }, 'B o clique em "Sign up" dentro da página leva a www.usekineo.com (308)')
    igual(d(h, '/signup', 'GET', true, true), { acao: 'pre_carga_204' }, 'B a pré-carga do "/signup" dentro da página: 204, e o Next abre por navegação (308)')
    igual(d(h, '/start', 'GET', false, true), { acao: 'redireciona' }, 'B "/start" clicado dentro da página: 308')
    igual(d(h, '/', 'GET', false, true), { acao: 'segue' }, 'B a home clicada dentro da página continua no host')
    igual(d(h, '/'), { acao: 'segue' }, 'B "/" no próprio host')
    igual(d(h, '/pricing'), { acao: 'segue' }, 'B "/pricing" no próprio host')
    igual(d(h, '/ai-shorts/2-clicks'), { acao: 'reescreve', para: '/' }, 'B "/ai-shorts/2-clicks" mostra a home')
    igual(d(h, '/', 'HEAD'), { acao: 'segue' }, 'B HEAD igual ao GET')
    igual(d(h, '/', 'GET', true), { acao: 'segue' }, 'B a pré-carga RSC da própria página fica no host')
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) igual(d(h, '/', m), { acao: 'redireciona' }, `B ${m} na página: o 308 de hoje`)
  }

  // C. o resto do host antigo
  for (const p of ['/studio', '/login', '/signup/', '/admin', '/robots.txt', '/sitemap.xml', '/llms.txt', '/pricing/', '/ai-shorts', '/api/stripe/checkout', '/api/generate-video-cinematic', '/auth/callback'])
    igual(d('shortsforgeai.com', p), { acao: 'redireciona' }, `C ${p}: o 308 de hoje`)
  for (const p of ['/studio', '/login', '/made-with-kineo', '/pricing/annual']) igual(d('shortsforgeai.com', p, 'GET', true), { acao: 'pre_carga_204' }, `C pré-carga RSC de ${p}: 204 no mesmo host`)

  // D. o que a página carrega ao abrir
  // as chamadas medidas no navegador ao abrir a home e o /pricing (docs/google-ads/CONSERTO-DOMINIO-ANTIGO-2611.md)
  for (const p of ['/previews/home-card.mp4', '/fonts/outra/latin.woff2', '/favicon.ico', '/site.webmanifest', '/api/offers/bf2026', '/api/offers/studio50', '/api/offers/offer290-rescue',
    '/api/offers/annual-welcome', '/api/affiliate/offer', '/api/stripe/checkout/resume', '/api/stripe/change-plan', '/api/kling4-trial/availability', '/api/kling4-paid/availability',
    '/api/stats/public', '/api/geo', '/api/consent'])
    igual(d('shortsforgeai.com', p), { acao: 'segue' }, `D ${p}: no mesmo host`)
  igual(d('shortsforgeai.com', '/api/events', 'POST'), { acao: 'segue' }, 'D o rastro de evento (POST) no mesmo host')
  igual(d('shortsforgeai.com', '/api/consent', 'POST'), { acao: 'segue' }, 'D a escolha da faixa de consentimento (POST) no mesmo host')
  for (const [p, m] of [['/api/offers/bf2026', 'POST'], ['/api/stripe/change-plan', 'POST'], ['/api/stripe/checkout/resume', 'POST'], ['/api/events', 'PUT'], ['/api/stripe/checkout', 'POST']])
    igual(d('shortsforgeai.com', p, m), { acao: 'redireciona' }, `D ${m} ${p}: o 308 de hoje (escrita fora das duas da página)`)

  // E. nada lê user-agent; a ligação no middleware
  assert.ok(!/user-?agent|navigator|isbot|googlebot|adsbot/i.test(lib.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '')), 'E a regra não lê user-agent')
  assert.ok(mw.includes('const dominioAntigo2611 = runsOnLegacyHost(request.nextUrl.pathname) ? null : decidirDominioAntigo2611({'), 'E o webhook e o /api/youtube/* do host antigo nem passam pela regra (seguem como hoje)')
  const bloco = mw.slice(mw.indexOf('const dominioAntigo2611 = '), mw.indexOf('return NextResponse.redirect(canonicalUrl, 308)'))
  assert.ok(bloco.length > 0 && !/user-agent|userAgent/i.test(bloco), 'E o middleware chama a regra sem user-agent, antes do 308')
  assert.ok(mw.includes("import { decidirDominioAntigo2611 } from '@/lib/seo/dominioAntigo2611'"), 'E o import')
  assert.ok(bloco.includes("if (dominioAntigo2611?.acao === 'reescreve') {") && bloco.includes('paginaUrl.pathname = dominioAntigo2611.para') && bloco.includes('return NextResponse.rewrite(paginaUrl)'), 'E reescreve no próprio host')
  assert.ok(bloco.includes("doProprioSite: request.headers.get('sec-fetch-site') === 'same-origin',"), 'E o clique dentro da página vem do Sec-Fetch-Site (cabeçalho do navegador)')
  assert.ok(bloco.includes("buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',"), 'E o sinal da pré-carga é o Sec-Fetch-Dest (o Next 14 apaga o cabeçalho RSC antes do middleware)')
  assert.ok(bloco.includes("if (dominioAntigo2611?.acao === 'pre_carga_204') {") && bloco.includes('return new NextResponse(null, { status: 204,'), 'E a pré-carga recebe 204')
  assert.ok(bloco.includes("LEGACY_PUBLIC_HOSTS.has(hostname) &&\n    !runsOnLegacyHost(request.nextUrl.pathname) &&\n    dominioAntigo2611?.acao !== 'segue'"), 'E o 308 de hoje só deixa passar o que a regra manda seguir')
  assert.ok(mw.includes("'shortsforgeai.com',\n  'www.shortsforgeai.com',\n  'shortsforgeai.vercel.app',") && mw.includes("const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])") && mw.includes("const LEGACY_HOST_DIRECT_PREFIXES = ['/api/youtube/']"), 'E os hosts e as exceções de sempre não mudam')
  assert.ok(mw.includes("canonicalUrl.host = 'www.usekineo.com'\n    return NextResponse.redirect(canonicalUrl, 308)"), 'E o 308 de sempre para www.usekineo.com')
}

await suite(null)
const MUT = [
  ['vercel.app entra na regra (CEO: fica como está por ora)', LIB, "new Set(['shortsforgeai.com', 'www.shortsforgeai.com'])", "new Set(['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app'])"],
  ['"/signup" abre o cadastro no host antigo', LIB, "  ['/signup', '/'],", "  ['/signup', '/signup'],"],
  ['"/signup" sai da lista (os 3 reprovados levam o 308)', LIB, "  ['/signup', '/'],", ''],
  ['o clique em "Sign up" volta à home', LIB, "  if (a.doProprioSite === true && ENTRADAS_DE_CADASTRO_2611.has(a.pathname)) return a.buscaDaPagina ? { acao: 'pre_carga_204' } : { acao: 'redireciona' }\n", ''],
  ['o middleware não passa o Sec-Fetch-Site', MW, "    doProprioSite: request.headers.get('sec-fetch-site') === 'same-origin',", "    doProprioSite: false,"],
  ['quem chega do anúncio no /signup leva o 308', LIB, "if (a.doProprioSite === true && ENTRADAS", "if (a.doProprioSite !== true && a.pathname === '/signup') return { acao: 'redireciona' }\n  if (a.doProprioSite === true && ENTRADAS"],
  ['"/start" sai da lista', LIB, "  ['/start', '/'],", ''],
  ['o webhook e o youtube passam pela regra', MW, 'runsOnLegacyHost(request.nextUrl.pathname) ? null : decidirDominioAntigo2611({', 'decidirDominioAntigo2611({'],
  ['POST passa na página', LIB, "if (metodo !== 'GET' && metodo !== 'HEAD') return { acao: 'redireciona' }\n", ''],
  ['pré-carga de outra página leva o 308', LIB, "  if (a.buscaDaPagina) return { acao: 'pre_carga_204' }\n", ''],
  ['página fora da lista abre no host antigo', LIB, "  ['/pricing', '/pricing'],", "  ['/pricing', '/pricing'],\n  ['/studio', '/studio'],"],
  ['"/ai-shorts/2-clicks" vira 404 no host antigo', LIB, "  ['/ai-shorts/2-clicks', '/'],", "  ['/ai-shorts/2-clicks', '/ai-shorts/2-clicks'],"],
  ['robots e sitemap servidos no host antigo', LIB, '|css|js|avif)$/i', '|css|js|avif|txt|xml)$/i'],
  ['qualquer API abre no host antigo', LIB, "  if (CHAMADAS_AO_ABRIR_2611.has(a.pathname) || ARQUIVO_DA_PAGINA_2611", "  if (a.pathname.startsWith('/api/') || CHAMADAS_AO_ABRIR_2611.has(a.pathname) || ARQUIVO_DA_PAGINA_2611"],
  ['o middleware volta a ler o cabeçalho RSC (que o Next apaga)', MW, "buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',", "buscaDaPagina: request.headers.get('rsc') === '1',"],
  ['a regra lê user-agent', LIB, 'export function decidirDominioAntigo2611(a: { host: string; pathname: string; method: string; buscaDaPagina: boolean; doProprioSite?: boolean }): DecisaoDominioAntigo2611 | null {\n', "export function decidirDominioAntigo2611(a: { host: string; pathname: string; method: string; buscaDaPagina: boolean; doProprioSite?: boolean }): DecisaoDominioAntigo2611 | null {\n  if (/googlebot|adsbot/i.test(String((a as { ua?: string }).ua ?? ''))) return { acao: 'redireciona' }\n"],
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
console.log(`PASS KINEO-DOMINIO-ANTIGO-2611: as páginas dos anúncios ("/", "/pricing"; "/ai-shorts/2-clicks", "/signup" e "/start" = a home) no próprio shortsforgeai.com e www.shortsforgeai.com (vercel.app como hoje), só GET e HEAD, sem ler user-agent; o resto do host antigo com o 308 de hoje; pré-carga RSC de outra página = 204 no mesmo host; mídia, fonte e as chamadas ao abrir no mesmo host; o webhook e o /api/youtube/* fora da regra; ${mortos}/${MUT.length} mutantes mortos (só AssertionError).`)
