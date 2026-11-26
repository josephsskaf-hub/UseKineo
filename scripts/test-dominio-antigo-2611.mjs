// KINEO-DOMINIO-ANTIGO-2611 — guardião (sem rede). Decisão da CEO 26/11 11:15 (opção B), depois da revisora 2c5749dd:
// nos três hosts antigos (shortsforgeai.com, www.shortsforgeai.com, shortsforgeai.vercel.app), as 7 URLs finais da conta do Google Ads respondem
// SEMPRE 200 com a MESMA página de entrada (app/entrada-dominio-antigo-2611/route.ts); tudo o mais segue com o 308 de hoje para www.usekineo.com.
//   A. hosts: os três antigos na regra; www.usekineo.com e outros fora (null);
//   B. a lista única das 7 URLs: GET e HEAD = entrada, nos três hosts, decidida só por host, caminho e método (V4: nada de Sec-Fetch-Site nem UA);
//   C. o resto: 308, inclusive o furo da revisora (V1: /admin/people/x.css, /api/render/x.mp4, /a/X.js, /s/tiktok.js) e toda API;
//   D. webhook do Stripe e /api/youtube/* fora da regra (V5);
//   E. V2 no MIDDLEWARE REAL (dublês só do que não é desta regra): cookie sb-* velho não chega ao app, a resposta o apaga, o updateSession não roda;
//      same-origin, cross-site, Safari sem Sec-Fetch-*, AdsBot e Googlebot recebem a MESMA reescrita; a rota interna pedida direto dá 404;
//   F. V6: o redirect /start → /signup do next.config pula os três hosts antigos;
//   G. a página de entrada: o mesmo HTML para todo pedido com a mesma query; botões ABSOLUTOS para www.usekineo.com com a query de chegada;
//      sem form, script, meta refresh, iframe; canonical em www; diz que o ShortsForgeAI agora é Kineo; capas que existem na public;
//   H. mutantes (só AssertionError conta).
// Rodar: node scripts/test-dominio-antigo-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LIB = 'lib/seo/dominioAntigo2611.ts', MW = 'middleware.ts', CFG = 'next.config.js', PAG = 'app/entrada-dominio-antigo-2611/route.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const HOSTS = ['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app']
const URLS = ['/', '/pricing', '/ai-shorts/2-clicks', '/signup', '/start', '/generate', '/my-videos']
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'AdsBot-Google (+http://www.google.com/adsbot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'curl/8.4.0',
]

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const R = createOfflineLoader({ source: (rel, t) => muda(rel, t) })('@/' + LIB)
  const mw = muda(MW, local(MW)), lib = muda(LIB, local(LIB)), cfg = muda(CFG, local(CFG))
  const d = (host, pathname, method = 'GET') => R.decidirDominioAntigo2611({ host, pathname, method })

  // A. hosts
  for (const h of [...HOSTS, 'WWW.SHORTSFORGEAI.COM']) igual(d(h, '/signup'), { acao: 'entrada' }, `A ${h}: host antigo na regra`)
  for (const h of ['www.usekineo.com', 'usekineo.com', 'plugin.usekineo.com', 'localhost', '']) assert.equal(d(h, '/signup'), null, `A ${h}: fora da regra`)

  // B. as 7 URLs
  igual(R.URLS_DA_CONTA_2611.map((u) => u.caminho), URLS, 'B a lista única tem exatamente as 7 URLs lidas na conta')
  assert.ok(R.URLS_DA_CONTA_2611.every((u) => u.origem.length > 20), 'B cada URL diz de onde veio na conta')
  for (const h of HOSTS) for (const p of URLS) {
    igual(d(h, p), { acao: 'entrada' }, `B ${h}${p} GET: a página de entrada`)
    igual(d(h, p, 'HEAD'), { acao: 'entrada' }, `B ${h}${p} HEAD: a página de entrada`)
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) igual(d(h, p, m), { acao: 'redireciona' }, `B ${h} ${m} ${p}: o 308 de hoje`)
  }
  assert.ok(!/sec-fetch|user-?agent|navigator|isbot|googlebot|adsbot|headers/i.test(lib.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '')), 'B V4: a regra não lê cabeçalho nem user-agent')

  // C. o resto, com o furo da revisora (V1)
  for (const h of HOSTS) for (const p of ['/studio', '/login', '/signup/', '/signup/x', '/generate/x', '/admin', '/robots.txt', '/sitemap.xml', '/llms.txt', '/pricing/', '/ai-shorts',
    '/api/stripe/checkout', '/api/stripe/checkout/resume', '/api/stripe/change-plan', '/api/events', '/api/consent', '/api/offers/bf2026', '/auth/callback',
    '/admin/people/x.css', '/api/admin/people/x.js', '/api/render/x.mp4', '/api/compose/status/x.mp4', '/a/ABCD1234.js', '/s/tiktok.js', '/previews/x.mp4', '/fonts/x.woff2',
    '/entrada-dominio-antigo-2611', '/Pricing', '/%70ricing', '/index'])
    igual(d(h, p), { acao: 'redireciona' }, `C ${h}${p}: o 308 de hoje`)

  // D. webhook e YouTube fora (V5)
  for (const h of HOSTS) for (const [p, m] of [['/api/youtube/callback', 'GET'], ['/api/youtube/connect', 'GET'], ['/api/stripe/webhook', 'POST'], ['/api/stripe/webhook', 'GET']])
    assert.equal(d(h, p, m), null, `D ${h} ${m} ${p}: fora da regra (o middleware deixa rodar no lugar, como hoje)`)
  assert.ok(mw.includes("const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])") && mw.includes("const LEGACY_HOST_DIRECT_PREFIXES = ['/api/youtube/']"), 'D as exceções de sempre não mudam')

  // V2: a regra pura dos cookies
  igual(R.semSessaoNoHostAntigo2611('sb-abc-auth-token=x; kineo_vid=v; sb-abc-auth-token.1=y; sb-abc-auth-token-code-verifier=z; theme=dark'),
    { cookie: 'kineo_vid=v; theme=dark', apagar: ['sb-abc-auth-token', 'sb-abc-auth-token.1', 'sb-abc-auth-token-code-verifier'] }, 'E tira todo sb-* e diz quais apagar')
  igual(R.semSessaoNoHostAntigo2611('sb-x=1'), { cookie: null, apagar: ['sb-x'] }, 'E só sb-*: o pedido segue sem cabeçalho Cookie')
  igual(R.semSessaoNoHostAntigo2611(null), { cookie: null, apagar: [] }, 'E sem cookie')

  // E. o MIDDLEWARE REAL
  const chamou = { updateSession: 0 }
  const resposta = (extra) => { const r = { status: 200, jar: [], ...extra }; r.cookies = { set: (n, v, o) => r.jar.push({ n, v, maxAge: o?.maxAge }) }; r.headers = { set() {} }; return r }
  function NextResponse(corpo, init) { return resposta({ tipo: 'corpo', status: init?.status ?? 200 }) }
  NextResponse.next = (init) => resposta({ tipo: 'next', cookie: init?.request?.headers?.get('cookie') ?? null })
  NextResponse.rewrite = (url, init) => { const u = new URL(String(url)); return resposta({ tipo: 'rewrite', para: u.pathname, busca: u.search, cookie: init?.request?.headers?.get('cookie') ?? null, temRequest: !!init?.request }) }
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
  const pedido = (href, { method = 'GET', cookie = '', site, ua = UAS[0] } = {}) => {
    const u = new URL(href)
    const headers = new Headers({ host: u.host, 'user-agent': ua, ...(site ? { 'sec-fetch-site': site, 'sec-fetch-dest': 'document' } : {}), ...(cookie ? { cookie } : {}) })
    const comClone = (x) => Object.assign(x, { clone: () => comClone(new URL(x.href)) })
    const pares = cookie ? cookie.split(';').map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p.split('=')[0], value: p.split('=').slice(1).join('=') })) : []
    return { url: href, method, headers, nextUrl: comClone(new URL(href)), cookies: { getAll: () => pares, get: (n) => pares.find((c) => c.name === n), set() {} } }
  }
  const ev = { waitUntil() {} }, COOKIE = 'sb-abc-auth-token=velho; sb-abc-auth-token.1=resto; kineo_vid=v'
  for (const h of HOSTS) {
    chamou.updateSession = 0
    for (const p of URLS) for (const ua of UAS) for (const site of [undefined, 'none', 'cross-site', 'same-origin', 'same-site']) {
      const r = await M.middleware(pedido(`https://${h}${p}?gclid=x`, { cookie: COOKIE, site, ua }), ev)
      assert.ok(r.tipo === 'rewrite' && r.para === '/entrada-dominio-antigo-2611' && r.busca === '?gclid=x', `E ${h}${p} (UA ${ua.slice(0, 20)}, Sec-Fetch-Site ${site}): a MESMA reescrita para a entrada, com a query (veio ${r.tipo} ${r.para})`)
      assert.ok(r.temRequest && r.cookie === 'kineo_vid=v', `E ${h}${p}: o pedido chega ao app SEM os sb-*`)
      igual(r.jar.filter((c) => c.n.startsWith('sb-')).map((c) => [c.n, c.v, c.maxAge]), [['sb-abc-auth-token', '', 0], ['sb-abc-auth-token.1', '', 0]], `E ${h}${p}: a resposta apaga os sb-*`)
    }
    for (const p of ['/admin/people/x.css', '/api/render/x.mp4', '/a/ABCD1234.js', '/s/tiktok.js', '/api/stripe/change-plan', '/api/stripe/checkout/resume?go=1', '/login']) {
      const r = await M.middleware(pedido(`https://${h}${p}`, { cookie: COOKIE }), ev)
      assert.ok(r.tipo === 'redirect' && r.status === 308 && r.para.startsWith('https://www.usekineo.com/'), `E ${h}${p}: 308 para www (veio ${r.tipo})`)
    }
    assert.equal(chamou.updateSession, 0, `E ${h}: o updateSession NUNCA roda no host antigo fora dos caminhos de sempre`)
    const direta = await M.middleware(pedido(`https://${h}/entrada-dominio-antigo-2611`), ev)
    assert.ok(direta.tipo === 'corpo' && direta.status === 404, `E ${h}: a rota interna pedida direto dá 404`)
    const yt = await M.middleware(pedido(`https://${h}/api/youtube/callback?code=c`, { cookie: COOKIE }), ev)
    assert.ok(yt.tipo === 'updateSession' && chamou.updateSession === 1, `E ${h} /api/youtube/callback: o caminho de hoje`)
  }
  chamou.updateSession = 0
  const www = await M.middleware(pedido('https://www.usekineo.com/signup', { cookie: COOKIE }), ev)
  assert.ok(www.tipo === 'updateSession' && chamou.updateSession === 1 && www.jar.length === 0, 'E www.usekineo.com/signup: o de sempre (updateSession, nada apagado)')
  const wwwDireta = await M.middleware(pedido('https://www.usekineo.com/entrada-dominio-antigo-2611'), ev)
  assert.ok(wwwDireta.tipo === 'corpo' && wwwDireta.status === 404, 'E www.usekineo.com: a rota interna dá 404')
  assert.ok(!/sec-fetch|user-agent|userAgent/i.test(mw.slice(mw.indexOf('// KINEO-DOMINIO-ANTIGO-2611 — nos hosts antigos'), mw.indexOf('return NextResponse.redirect(canonicalUrl, 308)')).replace(/^\s*\/\/.*$/gm, '')), 'E o bloco do middleware não lê Sec-Fetch nem user-agent')

  // F. V6: o redirect do /start pula os três hosts antigos
  const linhaStart = cfg.split('\n').find((l) => l.includes("source: '/start'")) ?? ''
  for (const h of HOSTS) assert.ok(linhaStart.includes(`{ type: 'host', value: '${h}' }`) && linhaStart.includes('missing:'), `F o /start do next.config não age em ${h}`)
  assert.ok(linhaStart.includes("destination: '/signup?utm_source=start'"), 'F em www o /start segue como hoje')

  // G. a página de entrada
  const P = createOfflineLoader({ source: (rel, t) => muda(rel, t) })('@/' + PAG)
  const html = P.htmlDaEntrada2611('?gclid=abc&utm_source=g'), html2 = P.htmlDaEntrada2611('?gclid=abc&utm_source=g')
  assert.equal(html, html2, 'G o mesmo HTML para a mesma query')
  assert.ok(P.htmlDaEntrada2611('').includes('href="https://www.usekineo.com/signup"'), 'G sem query, o botão vai limpo para www')
  for (const c of ['/signup', '/login', '/pricing', '/'])
    assert.ok(html.includes(`href="https://www.usekineo.com${c}?gclid=abc&amp;utm_source=g"`), `G botão ABSOLUTO para www.usekineo.com${c} com a query de chegada`)
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
  assert.ok(hrefs.every((h) => h.startsWith('https://www.usekineo.com')), `G todo link é absoluto para www (achei: ${hrefs.filter((h) => !h.startsWith('https://www.usekineo.com'))})`)
  assert.ok(!/<form|<script|<iframe|http-equiv|onclick|onload|window\.location|supabase|\$\d|checkout/i.test(html), 'G sem formulário, script, iframe, meta refresh, Supabase, preço ou compra')
  assert.ok(html.includes('<link rel="canonical" href="https://www.usekineo.com/">'), 'G canonical em www')
  assert.ok(html.includes('<meta name="robots" content="noindex, follow">'), 'G noindex (a cópia no host antigo não entra no índice)')
  assert.ok(html.includes('ShortsForgeAI is now Kineo') && html.includes('June 30, 2026') && html.includes('usekineo.com'), 'G diz que o ShortsForgeAI agora é Kineo, desde 30/06/2026, em usekineo.com')
  assert.ok(html.includes('Your account and plan are at usekineo.com'), 'G a frase de conta e plano')
  const capas = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])
  assert.ok(capas.length >= 2 && capas.every((c) => existsSync('public' + c)), 'G as capas existem na public')
  const hostil = P.htmlDaEntrada2611('?x="><script>alert(1)</script>')
  assert.ok(!hostil.includes('<script') && !hostil.includes('alert(1)'), 'G a query de chegada é escapada')
}

await suite(null)
const MUT = [
  ['vercel.app sai da regra (os 6 sitelinks)', LIB, "new Set(['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app'])", "new Set(['shortsforgeai.com', 'www.shortsforgeai.com'])"],
  ['o callback do YouTube entra na regra', LIB, "p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')", "p === '/api/stripe/webhook'"],
  ['o webhook do Stripe entra na regra', LIB, "p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')", "p.startsWith('/api/youtube/')"],
  ['"/generate" sai da lista', LIB, "  { caminho: '/generate', origem: 'sitelink \"Start Generating Free\" (vercel.app/generate)' },\n", ''],
  ['"/signup" sai da lista (os 3 reprovados)', LIB, "  { caminho: '/signup', origem:", "  { caminho: '/signup-x', origem:"],
  ['POST vira entrada', LIB, "if ((metodo === 'GET' || metodo === 'HEAD') && CAMINHOS_DA_CONTA_2611.has(a.pathname))", "if (CAMINHOS_DA_CONTA_2611.has(a.pathname))"],
  ['V1 volta: final de arquivo passa', LIB, "  return { acao: 'redireciona' }\n}", "  if (/\\.(?:css|js|mp4)$/.test(a.pathname)) return { acao: 'entrada' }\n  return { acao: 'redireciona' }\n}"],
  ['V4 volta: same-origin leva 308', MW, "    method: request.method,\n  })", "    method: request.method,\n  })\n  if (request.headers.get('sec-fetch-site') === 'same-origin' && dominioAntigo2611?.acao === 'entrada') return NextResponse.redirect(new URL('https://www.usekineo.com/signup'), 308)"],
  ['a regra lê user-agent', LIB, "  if (CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611(a.pathname)) return null\n", "  if (CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611(a.pathname)) return null\n  if (/googlebot|adsbot/i.test(String((a as { ua?: string }).ua ?? ''))) return { acao: 'redireciona' }\n"],
  ['o middleware deixa o updateSession rodar na entrada', MW, "  if (dominioAntigo2611?.acao === 'entrada') {", "  if (dominioAntigo2611?.acao === 'entrada' && false) {"],
  ['o pedido leva os sb-* ao app', MW, "    if (semSessao.cookie) cabecalhosSemSessao.set('cookie', semSessao.cookie)\n    else cabecalhosSemSessao.delete('cookie')\n", ''],
  ['a resposta não apaga os sb-*', MW, "    for (const nome of semSessao.apagar) respostaDoHostAntigo.cookies.set(nome, '', { path: '/', maxAge: 0 })\n", ''],
  ['a regra dos cookies deixa um sb- passar', LIB, "  const apagar = partes.filter((p) => nome(p).startsWith('sb-')).map(nome)\n  const ficam = partes.filter((p) => !nome(p).startsWith('sb-'))", "  const apagar = partes.filter((p) => nome(p).startsWith('sb-') && !nome(p).includes('.')).map(nome)\n  const ficam = partes.filter((p) => !nome(p).startsWith('sb-') || nome(p).includes('.'))"],
  ['a rota interna abre direto', MW, "  if (request.nextUrl.pathname === ROTA_DA_ENTRADA_2611) return new NextResponse(null, { status: 404 })\n", ''],
  ['a reescrita perde a query', MW, "    const entradaUrl = request.nextUrl.clone()\n", "    const entradaUrl = request.nextUrl.clone()\n    entradaUrl.search = ''\n"],
  ['o middleware tira a exceção do webhook', MW, "const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])", 'const LEGACY_HOST_DIRECT_PATHS = new Set<string>([])'],
  ['V6 volta: /start pula para /signup no host antigo', CFG, ", missing: [{ type: 'host', value: 'shortsforgeai.com' }, { type: 'host', value: 'www.shortsforgeai.com' }, { type: 'host', value: 'shortsforgeai.vercel.app' }]", ''],
  ['V6 esquece o vercel.app', CFG, ", { type: 'host', value: 'shortsforgeai.vercel.app' }]", ']'],
  ['botão relativo na entrada', PAG, '<a class="botao" href="${link(\'/login\')}">Log in</a>', '<a class="botao" href="/login">Log in</a>'],
  ['a entrada navega sozinha', PAG, '<title>ShortsForgeAI is now Kineo</title>', '<title>ShortsForgeAI is now Kineo</title>\n<meta http-equiv="refresh" content="0;url=https://www.usekineo.com/">'],
  ['a entrada perde a query', PAG, "  new URLSearchParams(busca).forEach((valor, chave) => url.searchParams.append(chave, valor))\n", ''],
  ['a entrada não escapa a query', PAG, '  const link = (caminho: string) => escapa(linkParaKineo2611(caminho, busca))', '  const link = (caminho: string) => linkParaKineo2611(caminho, busca).replace(/%22/g, \'"\').replace(/%3E/gi, \'>\').replace(/%3C/gi, \'<\')'],
  ['a entrada perde o noindex', PAG, '<meta name="robots" content="noindex, follow">\n', ''],
  ['a entrada perde o canonical', PAG, '<link rel="canonical" href="${escapa(BRAND_URL)}/">', ''],
]
let mortos = 0
for (const [nome, ...m] of MUT) {
  assert.equal(local(m[0]).split(m[1]).length, 2, 'mutante não aplica: ' + nome)
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + nome)
  mortos++
}
console.log(`PASS KINEO-DOMINIO-ANTIGO-2611: nos 3 hosts antigos as 7 URLs finais da conta = a MESMA página de entrada (só host, caminho e método; 6 UAs × 5 Sec-Fetch-Site iguais), com botões absolutos para www e a query de chegada; o resto = 308 (inclusive x.css, x.mp4, /a/X.js); webhook e youtube fora; sem sessão no host antigo (sb-* fora e apagado, sem updateSession); /start do next.config pula os hosts antigos; rota interna = 404 direto; ${mortos}/${MUT.length} mutantes mortos (só AssertionError).`)
