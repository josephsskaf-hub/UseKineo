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
//   G. [revisora V1] arquivo da página só nas pastas reais da public que não são rota do app (conferido contra o disco); rota com final de arquivo = 308;
//   H. [revisora V2] o MIDDLEWARE REAL (com dublês só do que não é desta regra): no host antigo o pedido chega sem sb-*, a resposta os apaga e o
//      updateSession não roda; em www.usekineo.com e nos caminhos de sempre (webhook, youtube) nada muda;
//   I. mutantes (só AssertionError conta).
// Rodar: node scripts/test-dominio-antigo-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
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
  for (const p of ['/previews/home-card.mp4', '/fonts/outra/latin.woff2', '/favicon.ico', '/manifest.webmanifest', '/videos/a/b.mp4', '/sfx/x.mp3', '/api/offers/bf2026', '/api/offers/studio50', '/api/offers/offer290-rescue',
    '/api/offers/annual-welcome', '/api/affiliate/offer', '/api/stripe/checkout/resume', '/api/stripe/change-plan', '/api/kling4-trial/availability', '/api/kling4-paid/availability',
    '/api/stats/public', '/api/geo', '/api/consent'])
    igual(d('shortsforgeai.com', p), { acao: 'segue' }, `D ${p}: no mesmo host`)
  igual(d('shortsforgeai.vercel.app', '/api/consent', 'POST'), { acao: 'segue' }, 'D a escolha da faixa de consentimento (POST) no mesmo host')
  igual(d('shortsforgeai.com', '/api/events', 'POST'), { acao: 'segue' }, 'D o rastro de evento (POST) no mesmo host')
  for (const [p, m] of [['/api/offers/bf2026', 'POST'], ['/api/stripe/change-plan', 'POST'], ['/api/stripe/checkout/resume', 'POST'], ['/api/events', 'PUT'], ['/api/stripe/checkout', 'POST']])
    igual(d('shortsforgeai.com', p, m), { acao: 'redireciona' }, `D ${m} ${p}: o 308 de hoje (escrita fora das duas da página)`)

  // G. V1: só as pastas reais da public, que não são rota do app
  for (const pasta of R.PASTAS_DA_PUBLIC_2611) {
    assert.ok(existsSync('public/' + pasta) && statSync('public/' + pasta).isDirectory(), `G public/${pasta} existe`)
    const rotas = ['app/' + pasta, ...readdirSync('app').filter((x) => /^\(.*\)$/.test(x)).map((g) => `app/${g}/${pasta}`)]
    assert.ok(!rotas.some((r) => existsSync(r)), `G ${pasta} não é rota do app (senão um caminho dinâmico executaria no host antigo)`)
  }
  for (const h of HOSTS) {
    for (const p of ['/admin/people/x.css', '/api/admin/people/x.js', '/api/render/x.mp4', '/api/compose/status/x.mp4', '/a/ABCD1234.js', '/s/tiktok.js', '/auth/x.js',
      '/ads/x.mp4', '/trending/x.mp4', '/kids-cartoon/x.mp4', '/x.js', '/sw.js', '/design/x.css', '/previews/../admin/x.css', '/previews/%2e%2e/x.js', '/previews/x.html', '/Previews/x.mp4']) {
      igual(d(h, p), { acao: 'redireciona' }, `G ${h}${p}: final de arquivo fora das pastas da public = o 308 de hoje`)
      igual(d(h, p, 'GET', true), { acao: 'pre_carga_204' }, `G ${h}${p}: buscado pela página = 204, nunca executa`)
    }
  }
  // H. V2: a regra pura dos cookies
  igual(R.semSessaoNoHostAntigo2611('sb-abc-auth-token=x; kineo_vid=v; sb-abc-auth-token.1=y; sb-abc-auth-token-code-verifier=z; theme=dark'),
    { cookie: 'kineo_vid=v; theme=dark', apagar: ['sb-abc-auth-token', 'sb-abc-auth-token.1', 'sb-abc-auth-token-code-verifier'] }, 'H tira todo sb-* e diz quais apagar')
  igual(R.semSessaoNoHostAntigo2611('sb-x=1'), { cookie: null, apagar: ['sb-x'] }, 'H só sb-*: o pedido segue sem cabeçalho Cookie')
  igual(R.semSessaoNoHostAntigo2611(null), { cookie: null, apagar: [] }, 'H sem cookie')

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
  assert.ok(mw.includes("import { decidirDominioAntigo2611, semSessaoNoHostAntigo2611 } from '@/lib/seo/dominioAntigo2611'"), 'F o import')
  assert.ok(bloco.includes('paginaUrl.pathname = dominioAntigo2611.para') && bloco.includes('NextResponse.rewrite(paginaUrl, { request: { headers: cabecalhosSemSessao } })'), 'F reescreve no próprio host, sem sessão')
  assert.ok(bloco.includes("doProprioSite: request.headers.get('sec-fetch-site') === 'same-origin',"), 'F o clique de dentro da página vem do Sec-Fetch-Site (cabeçalho do navegador)')
  assert.ok(bloco.includes("buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',"), 'F o sinal da pré-carga é o Sec-Fetch-Dest (o Next 14 apaga o cabeçalho RSC antes do middleware)')
  assert.ok(bloco.includes("if (dominioAntigo2611?.acao === 'pre_carga_204') {") && bloco.includes('return new NextResponse(null, { status: 204,'), 'F a pré-carga recebe 204')
  assert.ok(bloco.includes("LEGACY_PUBLIC_HOSTS.has(hostname) &&\n    !runsOnLegacyHost(request.nextUrl.pathname)\n  ) {"), 'F o 308 de hoje vem depois da saída do host antigo (o que a regra serve já saiu acima)')
  assert.ok(mw.includes("'shortsforgeai.com',\n  'www.shortsforgeai.com',\n  'shortsforgeai.vercel.app',"), 'F os hosts antigos do middleware não mudam')
  assert.ok(mw.includes("canonicalUrl.host = 'www.usekineo.com'\n    return NextResponse.redirect(canonicalUrl, 308)"), 'F o 308 de sempre para www.usekineo.com')

  // H. V2 no MIDDLEWARE REAL
  const chamou = { updateSession: 0 }
  const resposta = (extra) => { const r = { status: 200, jar: [], ...extra }; r.cookies = { set: (n, v, o) => r.jar.push({ n, v, maxAge: o?.maxAge }) }; r.headers = { set() {} }; return r }
  function NextResponse(corpo, init) { return resposta({ tipo: 'corpo', status: init?.status ?? 200 }) }
  NextResponse.next = (init) => resposta({ tipo: 'next', cookie: init?.request?.headers?.get('cookie') ?? null, temRequest: !!init?.request })
  NextResponse.rewrite = (url, init) => resposta({ tipo: 'rewrite', para: new URL(String(url)).pathname, cookie: init?.request?.headers?.get('cookie') ?? null, temRequest: !!init?.request })
  NextResponse.redirect = (url, status) => resposta({ tipo: 'redirect', para: String(url), status })
  const M = createOfflineLoader({
    source: (rel, t) => muda(rel, t),
    globals: { Headers },
    mocks: {
      'next/server': { NextResponse },
      '@/lib/growth/citationPagesRelease': { citationFormatPreviewPath: () => null },
      '@/lib/seo/aiFetchLog': { registrarLeituraDeRoboIa: () => undefined },
      '@/lib/supabase/middleware': { updateSession: async () => { chamou.updateSession++; return resposta({ tipo: 'updateSession' }) } },
      '@/lib/growth/homeClipsFirst': { HOME_VISITOR_COOKIE: 'kineo_vid', HOME_VISITOR_COOKIE_MAX_AGE_SECONDS: 1, shouldMintHomeVisitorCookie: () => false },
      '@/lib/growth/checkoutRobotGate': { decideCheckoutGate: () => ({ action: 'pass' }), checkoutGateHtml: () => '', checkoutGatePageReason: () => '', checkoutGateStatus: () => 200, CHECKOUT_GATE_HEADERS: {} },
      '@/lib/seo/linguasPublicas0311': { caminhoForaDasLinguas: () => false },
      '@/lib/growth/visitanteEscreveAntes': { destinoDoVisitanteQueEscreve: () => null },
    },
  })('@/middleware.ts')
  const pedido = (href, { method = 'GET', cookie = '', site = 'cross-site', dest = 'document' } = {}) => {
    const u = new URL(href), headers = new Headers({ host: u.host, 'sec-fetch-site': site, 'sec-fetch-dest': dest, ...(cookie ? { cookie } : {}) })
    const comClone = (x) => Object.assign(x, { clone: () => comClone(new URL(x.href)) })
    const pares = cookie ? cookie.split(';').map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p.split('=')[0], value: p.split('=').slice(1).join('=') })) : []
    return { url: href, method, headers, nextUrl: comClone(new URL(href)), cookies: { getAll: () => pares, get: (n) => pares.find((c) => c.name === n), set() {} } }
  }
  const ev = { waitUntil() {} }, COOKIE = 'sb-abc-auth-token=velho; sb-abc-auth-token.1=resto; kineo_vid=v'
  for (const h of HOSTS) {
    chamou.updateSession = 0
    const home = await M.middleware(pedido(`https://${h}/`, { cookie: COOKIE }), ev)
    assert.equal(home.tipo, 'next', `H ${h} GET /: segue no próprio host`)
    assert.ok(home.temRequest && home.cookie === 'kineo_vid=v', `H ${h} GET /: o pedido chega ao app SEM os sb-* (veio: ${home.cookie})`)
    igual(home.jar.filter((c) => c.n.startsWith('sb-')).map((c) => [c.n, c.v, c.maxAge]), [['sb-abc-auth-token', '', 0], ['sb-abc-auth-token.1', '', 0]], `H ${h} GET /: a resposta apaga os sb-*`)
    const signup = await M.middleware(pedido(`https://${h}/signup?gclid=x`, { cookie: COOKIE }), ev)
    assert.ok(signup.tipo === 'rewrite' && signup.para === '/' && signup.cookie === 'kineo_vid=v' && signup.jar.some((c) => c.n === 'sb-abc-auth-token' && c.maxAge === 0), `H ${h} /signup: a home, sem sessão`)
    const api = await M.middleware(pedido(`https://${h}/api/stripe/change-plan`, { cookie: COOKIE, site: 'same-origin', dest: 'empty' }), ev)
    assert.ok(api.tipo === 'next' && api.cookie === 'kineo_vid=v', `H ${h} change-plan: roda sem a sessão (visitante)`)
    const resume = await M.middleware(pedido(`https://${h}/api/stripe/checkout/resume?go=1`, { cookie: COOKIE }), ev)
    assert.ok(resume.tipo === 'next' && resume.cookie === 'kineo_vid=v', `H ${h} checkout/resume?go=1: sem a sessão`)
    const clique = await M.middleware(pedido(`https://${h}/signup?utm_source=nav`, { cookie: COOKIE, site: 'same-origin' }), ev)
    assert.ok(clique.tipo === 'redirect' && clique.para === 'https://www.usekineo.com/signup?utm_source=nav' && clique.status === 308, `H ${h} clique em Sign up de dentro: 308 para www com a query`)
    const furo = await M.middleware(pedido(`https://${h}/admin/people/x.css`, { cookie: COOKIE }), ev)
    assert.ok(furo.tipo === 'redirect' && furo.status === 308, `H ${h} /admin/people/x.css: 308 (V1)`)
    assert.equal(chamou.updateSession, 0, `H ${h}: o updateSession NUNCA roda no que a regra serve no host antigo`)
    const yt = await M.middleware(pedido(`https://${h}/api/youtube/callback?code=c`, { cookie: COOKIE }), ev)
    assert.ok(yt.tipo === 'updateSession' && chamou.updateSession === 1, `H ${h} /api/youtube/callback: o caminho de hoje (roda no lugar, com a sessão)`)
  }
  chamou.updateSession = 0
  const www = await M.middleware(pedido('https://www.usekineo.com/', { cookie: COOKIE }), ev)
  assert.ok(www.tipo === 'updateSession' && chamou.updateSession === 1 && www.jar.length === 0, 'H www.usekineo.com: o de sempre (updateSession, nada apagado)')
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
  ['robots e sitemap servidos no host antigo', LIB, "const ARQUIVOS_DA_RAIZ_2611: ReadonlySet<string> = new Set(['/favicon.ico', '/manifest.webmanifest'])", "const ARQUIVOS_DA_RAIZ_2611: ReadonlySet<string> = new Set(['/favicon.ico', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml'])"],
  ['qualquer API abre no host antigo', LIB, "  if (CHAMADAS_AO_ABRIR_2611.has(a.pathname) || arquivoDaPagina2611", "  if (a.pathname.startsWith('/api/') || CHAMADAS_AO_ABRIR_2611.has(a.pathname) || arquivoDaPagina2611"],
  ['o middleware volta a ler o cabeçalho RSC (que o Next apaga)', MW, "buscaDaPagina: request.headers.get('sec-fetch-dest') === 'empty',", "buscaDaPagina: request.headers.get('rsc') === '1',"],
  ['a regra lê user-agent', LIB, 'DecisaoDominioAntigo2611 | null {\n', "DecisaoDominioAntigo2611 | null {\n  if (/googlebot|adsbot/i.test(String((a as { ua?: string }).ua ?? ''))) return { acao: 'redireciona' }\n"],
  ['qualquer POST da lista de leitura passa', LIB, "if (metodo === 'POST' && ESCRITAS_AO_ABRIR_2611.has(a.pathname)) return { acao: 'segue' }", "if (metodo === 'POST' && (ESCRITAS_AO_ABRIR_2611.has(a.pathname) || CHAMADAS_AO_ABRIR_2611.has(a.pathname))) return { acao: 'segue' }"],
  ['o middleware deixa o "segue" chegar ao updateSession', MW, "if (dominioAntigo2611?.acao === 'reescreve' || dominioAntigo2611?.acao === 'segue') {", "if (dominioAntigo2611?.acao === 'reescreve') {"],
  ['o pedido leva os sb-* ao app', MW, "    if (semSessao.cookie) cabecalhosSemSessao.set('cookie', semSessao.cookie)\n    else cabecalhosSemSessao.delete('cookie')\n", ''],
  ['a resposta não apaga os sb-*', MW, "    for (const nome of semSessao.apagar) respostaDoHostAntigo.cookies.set(nome, '', { path: '/', maxAge: 0 })\n", ''],
  ['a regra dos cookies deixa um sb- passar', LIB, "  const apagar = partes.filter((p) => nome(p).startsWith('sb-')).map(nome)\n  const ficam = partes.filter((p) => !nome(p).startsWith('sb-'))", "  const apagar = partes.filter((p) => nome(p).startsWith('sb-') && !nome(p).includes('.')).map(nome)\n  const ficam = partes.filter((p) => !nome(p).startsWith('sb-') || nome(p).includes('.'))"],
  ['V1 volta: qualquer final de arquivo passa', LIB, "  return pasta !== undefined && PASTAS_DA_PUBLIC_2611.has(pasta) && FINAL_DE_ARQUIVO_2611.test(p)", "  return FINAL_DE_ARQUIVO_2611.test(p) || (pasta !== undefined && PASTAS_DA_PUBLIC_2611.has(pasta) && FINAL_DE_ARQUIVO_2611.test(p))"],
  ['uma pasta que é rota do app entra na lista (auth)', LIB, "'models', 'og',\n])", "'models', 'og', 'auth',\n])"],
  ['uma pasta que não existe na public entra na lista', LIB, "'models', 'og',\n])", "'models', 'og', 'admin',\n])"],
  ['o caminho com .. passa', LIB, " && !p.includes('..') && !p.includes('%')", " && !p.includes('%')"],
  ['o middleware manda 308 na pré-carga', MW, "return new NextResponse(null, { status: 204,", "return NextResponse.redirect(new URL('https://www.usekineo.com'), 308); void ({ status: 204,"],
  ['o middleware tira a exceção do webhook', MW, "const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])", 'const LEGACY_HOST_DIRECT_PATHS = new Set<string>([])'],
]
let mortos = 0
for (const [nome, ...m] of MUT) {
  assert.equal(local(m[0]).split(m[1]).length, 2, 'mutante não aplica: ' + nome)
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + nome)
  mortos++
}
console.log(`PASS KINEO-DOMINIO-ANTIGO-2611: as 7 URLs da conta (anúncios e sitelinks) no próprio shortsforgeai.com, www.shortsforgeai.com e shortsforgeai.vercel.app ("/" e "/pricing" no lugar; "/ai-shorts/2-clicks", "/signup", "/start", "/generate" e "/my-videos" = a home a quem chega; o clique de dentro nas páginas de conta vai a www), só GET e HEAD, sem ler user-agent; o resto do host antigo com o 308 de hoje; pré-carga RSC de outra página = 204 no mesmo host; mídia, fonte e as chamadas ao abrir no mesmo host; webhook do Stripe e /api/youtube/* fora da regra nos três hosts; final de arquivo só nas pastas reais da public (V1); no host antigo o pedido chega sem sb-*, a resposta os apaga e o updateSession não roda, provado no middleware real (V2); ${mortos}/${MUT.length} mutantes mortos (só AssertionError).`)
