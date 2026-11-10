// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"]
// Guardião das ENTRADAS de criação → tela nova (/create/<aba>). Offline: módulos REAIS transpilados, páginas executadas com dublês
// (sessão, roteador, eventos, sessionStorage), React SSR; sem rede, sem banco, sem credencial. Prova:
//   A. a entrada única (lib/create/entry.ts): interruptor × aba × visitante/logado × parâmetros; com qualquer interruptor fora de
//      'public' TODO href volta byte a byte ao antigo; só vira tela nova o que ela recebe e trata igual;
//   B. /create/film lê o que o /studio lê (executando AS DUAS páginas): ideia, campanha, motor; chegada do cadastro (StudioIdeaArrival);
//      parâmetro que ela não sabe tratar volta ao /studio com a query intacta; visitante volta do cadastro para a aba COM a query;
//   C. o MESMO pedido e os MESMOS eventos campo a campo (/studio com o link antigo × /create/film com o link novo), e o filme grátis
//      anunciado na aba para quem está no teste;
//   D. cada entrada mapeada (topo, lateral, celular, cartões da home, caixa do celular, faixa, caixa de presente, /pricing) renderizada:
//      'off' = HTML byte a byte o da main; 'public' = só os hrefs de criação mudam, para o destino da entrada única; medição
//      (data-home-cta, data-nav-item, data-home-card…) idêntica; os três menus coerentes; páginas de SEO intocadas;
//   E. mutantes provam que o teste morde.
// KINEO-ENTRADAS-SO-LOGADO-1011 [CEO 10/11: "VISITANTE (deslogado) FICA NO DESTINO ANTIGO… só quem está LOGADO vai para as abas novas"] —
// visitante = HTML idêntico ao da main em todas as superfícies; logado = abas. /pricing intocado; "My videos" → /library.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { renderPage, setCurrentFilter } from './preview-ux-complete.mjs'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const { aba } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const React = require(ROOT + '/node_modules/react')
const { renderToStaticMarkup } = require(ROOT + '/node_modules/react-dom/server')

const MAIN = 'fb3235afb' // origin/main antes desta obra (rebase de 10/11: KINEO-REGIAO-PAGA-1011 e -ABRE-1011)
const mainSrc = p => execFileSync('git', ['show', `${MAIN}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e8 })
const lf = s => s.replace(/\r\n/g, '\n')
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const RELEASES = ['off', 'internal', 'public']
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const SESSION = 'sb-abc-auth-token=x'
const TRIAL = { credits: 10, hasPaid: false, isStarter: false, isCreator: false, isStudio: false, entitlementsResolved: true, filmsDelivered: 0, trial: { phase: 'active', creditsGranted: 10, msLeft: 86_400_000, creditsUsedForDisplay: 0 } }
const unesc = h => h.replace(/&amp;/g, '&')
const hrefs = html => [...html.matchAll(/href="([^"]*)"/g)].map(m => unesc(m[1]))
const medicao = html => [...html.matchAll(/data-(home-cta|nav-item|home-card|home-door|clip-novo|kineo|home-ugc-guide)="([^"]*)"/g)].map(m => m[1] + '=' + m[2]).join('|')
const withSwitch = (o, name, v) => ({ ...o, 'lib/create/release.ts': (o['lib/create/release.ts'] ?? read('lib/create/release.ts')).replace(new RegExp(`${name}: InternalRelease = '[a-z]+'`), `${name}: InternalRelease = '${v}'`) })
const OFF = o => withSwitch(o, 'CREATE_ENTRY_RELEASE', 'off')

// ─── A. A entrada única ─────────────────────────────────────────────────────────────────────────────────────────────────
// [legado, aba, destino novo esperado (logado) ou null = fica no antigo]
const FILM_CASES = [
  ['/studio', 'film', '/create/film?intent_campaign=studio_simple'],
  ['/studio?intent_campaign=nav_door', 'film', '/create/film?intent_campaign=nav_door'],
  ['/studio?engine=seedance&intent_campaign=home_card', 'film', '/create/film?engine=seedance&intent_campaign=home_card'],
  ['/studio?intent_campaign=home_phone_box&ideia=The%20island%20nobody%20visits', 'film', '/create/film?intent_campaign=home_phone_box&ideia=The+island+nobody+visits'],
  ['/studio?intent_campaign=home_news_bar_k4_trial', 'film', '/create/film?intent_campaign=home_news_bar_k4_trial'],
  ['/studio?ideia=Rome&utm_source=x&gclid=1&ref=a', 'film', '/create/film?ideia=Rome&utm_source=x&gclid=1&ref=a&intent_campaign=studio_simple'],
  // ficam no Studio antigo: motor específico, texto do ChatGPT/galeria, roteiro, série, retomada, autostart, conector, "More options"
  ['/studio?engine=hollywood&intent_campaign=nav_mega', 'film', null],
  ['/studio?engine=h3max&intent_campaign=nav_mega', 'film', null],
  ['/studio?engine=s25&intent_campaign=nav_mega', 'film', null],
  ['/studio?engine=fast&intent_campaign=final_chip', 'film', null],
  ['/studio?prompt=Rome&script_mode=ai&intent_campaign=gallery', 'film', null],
  ['/studio?prompt=Rome&intent_campaign=gallery', 'film', null],
  ['/studio?avancado=1&engine=seedance&intent_campaign=studio_simple', 'film', null],
  ['/studio?onboarding_goal=faceless&intent_campaign=welcome', 'film', null],
  ['/studio?series=abc&studio_continuation=1', 'film', null],
  ['/studio?chatgpt_quickstart=1&prompt=x', 'film', null],
  ['/studio?create_intent=fast&prompt=x', 'film', null],
  ['/studio?film60=1', 'film', null],
  ['/studio?focus=idea', 'film', null],
  ['/studio?ideia=a&ideia=b', 'film', null],
  ['/studio#top', 'film', null],
  ['/studio/create?prompt=x', 'film', null],
  ['/studio/create?welcome=1', 'film', null],
  ['https://evil.example/studio', 'film', null],
  ['//evil.example/studio', 'film', null],
  ['/kids-cartoon', 'cartoon', '/create/cartoon'],
  ['/kids-cartoon?utm_source=home_card', 'cartoon', null],
  ['/kids-cartoon?character=leo', 'cartoon', null],
  ['/ads/new', 'ads', '/create/ads'],
  ['/ads/new?utm_source=studio_door', 'ads', null],
  ['/ads/new?style=xmas', 'ads', null],
  ['/ads/v2?entry=product&utm_source=home_card', 'ads', null],
  ['/ads/new', 'film', null], ['/studio', 'ads', null], ['/kids-cartoon', 'film', null],
]
function moduleChecks(o = {}) {
  const m = loader({}, o)
  const entry = m('lib/create/entry'), release = m('lib/create/release'), caixa = m('lib/growth/studioSimples'), auth = m('lib/authRedirect')
  const src = lf(o['lib/create/release.ts'] ?? read('lib/create/release.ts'))
  ok(release.CREATE_ENTRY_RELEASE === 'public', "o interruptor CREATE_ENTRY_RELEASE está 'public'")
  ok(src.includes('"1 sim, todas as telas vão pro modelo novo"') && /VOLTA: 'off'[^\n]*devolve TODAS as entradas ao destino antigo/.test(src), 'o interruptor traz a frase do fundador e a volta')
  for (const [legacy, kind, novo] of FILM_CASES) {
    const got = entry.createEntryHref(kind, legacy, true)
    ok(got === (novo ?? legacy), `logado: ${kind} ${legacy} → ${novo ?? 'fica'} (veio ${got})`)
    // Visitante (ou login desconhecido): SEMPRE o destino de hoje, byte a byte — sem muro de cadastro novo.
    for (const quem of [false, undefined, null, 'true', 1]) ok(entry.createEntryHref(kind, legacy, quem) === legacy && entry.createEntryForLegacyHref(legacy, quem) === legacy, `visitante (${String(quem)}): ${legacy} fica`)
    if (novo) ok(auth.normalizeInternalRedirect(novo) === novo, `logado: ${novo} é um destino interno válido`)
    // Cada interruptor fora de 'public' devolve o antigo byte a byte (Film também pelo CREATE_FILM_INPLACE).
    for (const r of ['off', 'internal']) {
      ok(entry.createEntryHref(kind, legacy, true, { entry: r }) === legacy, `entrada '${r}': ${legacy} volta`)
      ok(entry.createEntryHref(kind, legacy, true, { shell: r }) === legacy, `casca '${r}': ${legacy} volta`)
      ok(entry.createEntryHref(kind, legacy, true, { filmInplace: r }) === (kind === 'film' ? legacy : got), `Film na moldura '${r}': só Film volta (${legacy})`)
    }
    // O que vai para a aba Film é exatamente o que a caixa do /studio trata (usarCaixaUnica) — nada que o Studio completo trataria.
    if (novo && kind === 'film') {
      const q = Object.fromEntries(new URL(legacy, 'https://k').searchParams)
      ok(caixa.usarCaixaUnica(q) && caixa.motorDaCaixa(q.engine) === caixa.motorDaCaixa(undefined), `${legacy}: no /studio abriria a MESMA caixa, com o MESMO motor`)
      const nq = Object.fromEntries(new URL(novo, 'https://k').searchParams)
      ok(caixa.campanhaDaCaixa(nq.intent_campaign) === caixa.campanhaDaCaixa(q.intent_campaign) && (nq.ideia ?? null) === (q.ideia ?? null), `${legacy}: mesma campanha e mesma ideia que o /studio grava`)
    }
  }
  // Forçando no ARQUIVO (não só pelo parâmetro).
  for (const [name, v] of [['CREATE_ENTRY_RELEASE', 'off'], ['CREATE_ENTRY_RELEASE', 'internal'], ['CREATE_SHELL_RELEASE', 'internal'], ['CREATE_SHELL_RELEASE', 'off']]) {
    const e2 = loader({}, withSwitch(o, name, v))('lib/create/entry')
    ok(FILM_CASES.every(([l, k]) => e2.createEntryHref(k, l, true) === l && e2.createEntryHref(k, l, false) === l && e2.createEntryForLegacyHref(l, true) === l), `arquivo ${name}='${v}': todo href volta ao antigo`)
  }
  const e3 = loader({}, withSwitch(o, 'CREATE_FILM_INPLACE', 'internal'))('lib/create/entry')
  ok(e3.createEntryHref('film', '/studio', true) === '/studio' && e3.createEntryHref('ads', '/ads/new', true) === '/create/ads', "arquivo CREATE_FILM_INPLACE='internal': Film volta ao /studio (nunca aponta para a casca sem o Studio)")
  // Embrulho do cadastro que as funções da home já fazem.
  const W = s => '/signup?redirect=' + encodeURIComponent(s)
  ok([W('/studio?intent_campaign=home_card'), W('/ads/new'), W('/kids-cartoon?utm_source=home_card')].every(h => entry.createEntryForLegacyHref(h, true) === h && entry.createEntryForLegacyHref(h, false) === h), 'o cadastro embrulhado do visitante nunca muda')
  ok(['/signup?utm_source=nav', '/signup?redirect=%2Fstudio&utm_source=x', '/signup', '/pricing', '/clips?engine=x', '/recreate/passarela', '/ai-kids-cartoon-videos', '#try-kineo'].every(h => entry.createEntryForLegacyHref(h, true) === h), 'outros hrefs (cadastro com outra chave, preços, clipes, Recreate, página de conteúdo) ficam')
  ok(entry.createEntryForLegacyHref('/studio', true) === '/create/film?intent_campaign=studio_simple' && entry.createEntryForLegacyHref('/ads/new', true) === '/create/ads' && entry.createEntryForLegacyHref('/kids-cartoon', true) === '/create/cartoon', 'menus: os três destinos antigos secos')
}

// ─── B. /create/film lê o que o /studio lê (as duas páginas executadas) ───────────────────────────────────────────────────
const Marca = name => { const f = () => null; Object.defineProperty(f, 'name', { value: name }); return { __esModule: true, default: f } }
function paginas(o, user) {
  const nav = { redirect: u => { throw { redirect: u } }, notFound: () => { throw { notFound: true } }, useRouter: () => ({}), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }
  const stubs = {
    'next/navigation': nav, 'next/link': link, '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/components/StudioIdeaArrival': Marca('StudioIdeaArrival'), '@/components/create/StudioNaMoldura': Marca('StudioNaMoldura'), '@/components/create/CreateShell': Marca('CreateShell'),
    '@/components/studio/StudioSimples': Marca('StudioSimples'), './StudioClient': Marca('StudioClient'),
    '@/lib/engineWall': { getHouseEngineExamples: () => [] }, '@/lib/publicExamples': { ENGINE_PAGE_LEAD: [], FOUNDER_SHOWCASE: [] }, '@/lib/growth/filmesDaPorta0511': { filmesDaPorta0511: () => [] },
  }
  const m = loader(stubs, o)
  return { create: m('app/create/[tab]/page').default, studio: m('app/(dashboard)/studio/page').default }
}
const filhos = el => React.Children.toArray(el?.props?.children ?? []).concat(el && typeof el.type === 'function' ? [el] : [])
const achar = (el, name) => filhos(el).find(c => c.type?.name === name)
const sp = href => Object.fromEntries(new URL(href, 'https://k').searchParams)
async function pageChecks(o = {}) {
  const entry = loader({}, o)('lib/create/entry')
  const USER = { id: 'u', email: 'customer@example.org' }
  const filmEntries = FILM_CASES.filter(([, k, n]) => k === 'film' && n)
  for (const [legacy, , novo] of filmEntries) {
    const P = paginas(o, USER)
    const st = P.studio({ searchParams: sp(legacy) })
    const cr = await P.create({ params: { tab: 'film' }, searchParams: sp(novo) })
    const a = achar(st, 'StudioSimples')?.props, b = achar(cr, 'StudioNaMoldura')?.props
    ok(a && b, `${novo}: as duas páginas montam a caixa`)
    ok(a.motor === b.motor && a.campanha === b.campanha && a.ideiaInicial === b.ideiaInicial, `${novo}: motor (${b.motor}), campanha (${b.campanha}) e ideia (“${b.ideiaInicial}”) = as do /studio`)
    ok(!!achar(st, 'StudioIdeaArrival') && !!achar(cr, 'StudioIdeaArrival'), `${novo}: a chegada do cadastro (conversão do Ads) monta nas duas`)
    // O retorno do cadastro: OAuth acrescenta ?signup=1, a confirmação de e-mail ?welcome=1 — a aba aceita e segue na caixa.
    for (const k of ['signup', 'welcome']) {
      const back = await P.create({ params: { tab: 'film' }, searchParams: { ...sp(novo), [k]: '1' } })
      ok(achar(back, 'StudioNaMoldura')?.props.ideiaInicial === b.ideiaInicial && !!achar(back, 'StudioIdeaArrival'), `${novo} + ${k}=1: cai na aba Film com a ideia`)
    }
    // Visitante: cadastro com retorno à aba COM a query inteira.
    const PV = paginas(o, null)
    let red = null
    try { await PV.create({ params: { tab: 'film' }, searchParams: sp(novo) }) } catch (e) { red = e.redirect }
    ok(red === '/signup?' + new URLSearchParams({ redirect: novo }), `visitante em ${novo}: cadastro e volta com a query (${red})`)
  }
  // Bare /create/film (abas da própria tela): a campanha de sempre da aba.
  const P = paginas(o, USER)
  const bare = await P.create({ params: { tab: 'film' }, searchParams: {} })
  ok(achar(bare, 'StudioNaMoldura')?.props.campanha === 'create_film' && achar(bare, 'StudioNaMoldura')?.props.ideiaInicial === '', '/create/film sem query: create_film, caixa vazia (como antes)')
  const PV = paginas(o, null)
  let red = null
  try { await PV.create({ params: { tab: 'cartoon' }, searchParams: {} }) } catch (e) { red = e.redirect }
  ok(red === '/signup?redirect=%2Fcreate%2Fcartoon', 'visitante sem query: o href de antes')
  // Parâmetro que a aba não trata igual → /studio com a query intacta (nada se perde), antes até da sessão.
  for (const legacy of FILM_CASES.filter(([l, k, n]) => k === 'film' && !n && l.startsWith('/studio?')).map(([l]) => l)) {
    const q = sp(legacy)
    if (Object.keys(q).length !== [...new URL(legacy, 'https://k').searchParams.keys()].length) continue // chave repetida: o objeto já perdeu um valor
    let r = null
    try { await paginas(o, USER).create({ params: { tab: 'film' }, searchParams: q }) } catch (e) { r = e.redirect }
    ok(r === '/studio?' + new URLSearchParams(q), `/create/film${legacy.slice(7)} → ${r}`)
    let rv = null
    try { await paginas(o, null).create({ params: { tab: 'film' }, searchParams: q }) } catch (e) { rv = e.redirect }
    ok(rv === r, `visitante: o mesmo /studio (público) — ${legacy}`)
  }
  let rl = null
  try { await paginas(o, USER).create({ params: { tab: 'film' }, searchParams: { ideia: ['a', 'b'] } }) } catch (e) { rl = e.redirect }
  ok(rl === '/studio?ideia=a&ideia=b', 'lista na query: volta ao /studio com os dois valores')
  ok(entry.filmParamsSupported({ ideia: 'x', signup: '1' }, { arrival: true }) && !entry.filmParamsSupported({ ideia: 'x', signup: '1' }), 'signup/welcome: só a página aceita (uma entrada nunca os manda)')
}

// ─── C. O mesmo pedido e os mesmos eventos ─────────────────────────────────────────────────────────────────────────────
const GEN = ['mrr_generate_clicked', 'studio_simple_generate_clicked']
const MOUNT = ['studio_simple_viewed', 'mrr_studio_viewed']
const only = (evs, names) => evs.filter(([n]) => names.includes(n))
async function eventChecks(o = {}) {
  const entry = loader({}, o)('lib/create/entry')
  for (const [legacy] of FILM_CASES.filter(([, k, n]) => k === 'film' && n)) {
    const novo = entry.createEntryHref('film', legacy, true)
    const P = paginas(o, { id: 'u', email: 'customer@example.org' })
    const a = achar(P.studio({ searchParams: sp(legacy) }), 'StudioSimples').props
    const b = achar(await P.create({ params: { tab: 'film' }, searchParams: sp(novo) }), 'StudioNaMoldura').props
    // Uma aba de cada vez: os dublês de navegador (sessionStorage, document) são globais.
    const ta = aba(o)
    ta.mount(React.createElement(ta.m('components/studio/StudioSimples').default, a))
    if (!a.ideiaInicial) ta.type(p => p['aria-label'] === 'Your idea', 'The lost plane of 1942', 'caixa')
    ta.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
    const tb = aba(o)
    tb.mount(React.createElement(tb.m('components/create/StudioNaMoldura').default, b))
    if (!a.ideiaInicial) tb.type(p => p.id === 'sm-idea', 'The lost plane of 1942', 'passo 1')
    else ok(tb.one(p => p.id === 'sm-idea', 'passo 1').props.value === a.ideiaInicial, `${novo}: a ideia do link já está no passo 1`)
    ok(JSON.stringify(only(tb.log.events, MOUNT)) === JSON.stringify(only(ta.log.events, MOUNT)), `${novo}: eventos de montagem iguais campo a campo (${JSON.stringify(only(tb.log.events, MOUNT)[0])})`)
    tb.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
    ok(ta.log.pushes.length === 1 && JSON.stringify(tb.log.pushes) === JSON.stringify(ta.log.pushes), `${novo}: o MESMO pedido (${tb.log.pushes[0]})`)
    ok(JSON.stringify(only(tb.log.events, GEN)) === JSON.stringify(only(ta.log.events, GEN)) && only(tb.log.events, GEN).length === 2, `${novo}: eventos do Generate iguais campo a campo`)
    ok(JSON.stringify([...tb.log.storage]) === JSON.stringify([...ta.log.storage]), `${novo}: o mesmo bilhete na sessionStorage`)
  }
  // Conta nova em teste grátis: a linha do filme grátis aparece na aba (mesma leitura de /api/credits).
  const t = aba(o, { cookie: SESSION, credits: TRIAL })
  const P = paginas(o, { id: 'u', email: 'new@example.org' })
  const b = achar(await P.create({ params: { tab: 'film' }, searchParams: { ...sp(entry.createEntryHref('film', '/studio?intent_campaign=home_card&engine=seedance', true)), signup: '1' } }), 'StudioNaMoldura').props
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, b))
  await t.settle()
  ok(t.html().includes('data-testid="studio-free-film-line"'), 'conta nova vinda do cadastro: o aviso do filme grátis aparece na aba Film')
  ok(t.log.pushes.length === 0, 'nada começa sozinho na chegada (um passo: Generate)')
}

// ─── D. Cada entrada renderizada ───────────────────────────────────────────────────────────────────────────────────────
function viaRenderPage(o, file, before, fixture, props) {
  setCurrentFilter((t, f) => o[f] ?? t)
  try { return renderPage(file, before, fixture, props, MAIN) } finally { setCurrentFilter(t => t) }
}
const homeStubs = { 'next/link': link, '@/lib/analytics': { trackEvent: async () => true, trackClosedEvent: async () => 'stored' }, 'next/navigation': { usePathname: () => '/library', useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() }, '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }, channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel() {}, from: () => { throw Error('db') } }) } }
function viaLoader(o, file, before, props) {
  const ov = before ? { ...o, [file]: mainSrc(file) } : o
  return renderToStaticMarkup(React.createElement(loader(homeStubs, ov)(file.replace(/\.tsx$/, '')).default, props))
}
// [nome, render(o, before, signed), quantos hrefs mudam (visitante, logado)]
const SUPERFICIES = [
  ['topo (app/KineoLanding.tsx: mega-menu, Product ads, menu do celular, Dashboard, CTA final)', (o, b, s) => viaRenderPage(o, 'app/KineoLanding.tsx', b, {}, { initialUser: s ? { id: 'fixture' } : null }), [0, 8]],
  ['menu lateral (components/Sidebar.tsx)', (o, b, s) => viaLoader(o, 'components/Sidebar.tsx', b, { userEmail: s ? 'customer@example.org' : '', isLoggedIn: s, credits: 10, plan: 'free' }), [0, 3]],
  ['menu do celular (components/MobileNav.tsx)', (o, b, s) => viaRenderPage(o, 'components/MobileNav.tsx', b, { pathname: '/library' }, { isLoggedIn: s }), [0, 3]],
  ['cartões da home (components/home/HomeThreeCards.tsx, entradaNova)', (o, b, s) => viaRenderPage(o, 'components/home/HomeThreeCards.tsx', b, {}, { signedIn: s, kidsCard: true, ...(b ? {} : { entradaNova: true }) }), [0, 1]],
  ['portas e caixa do celular (components/home/HomePortasCelular.tsx, entradaNova)', (o, b, s) => viaRenderPage(o, 'components/home/HomePortasCelular.tsx', b, {}, { signedIn: s, ...(b ? {} : { entradaNova: true }) }), [0, 2]],
  ['vitrine (components/home/HomeMosaic.tsx: filmes + "Ad example")', (o, b, s) => viaLoader(o, 'components/home/HomeMosaic.tsx', b, { signedIn: s }), [null, null]],
  ['páginas de SEO (HomeThreeCards sem entradaNova, como em components/seo/PaginaClara.tsx)', (o, b, s) => viaRenderPage(o, 'components/home/HomeThreeCards.tsx', b, {}, { signedIn: s, kidsCard: true }), [0, 0]],
]
function renderChecks(o = {}, { so = null } = {}) {
  const entry = loader({}, o)('lib/create/entry')
  const MAP = new Set(['/studio', '/ads/new', '/kids-cartoon'])
  const inner = h => { const u = new URL(h, 'https://k'); return u.pathname === '/signup' && u.searchParams.get('redirect') ? new URL(u.searchParams.get('redirect'), 'https://k') : u }
  for (const [nome, render, conta] of SUPERFICIES) {
    if (so && !so.some(x => nome.includes(x))) continue
    for (const signed of [false, true]) {
      const quem = signed ? 'logado' : 'visitante'
      const main = render(o, true, signed), off = render(OFF(o), false, signed), pub = render(o, false, signed)
      ok(off === main, `${nome} · ${quem}: 'off' = HTML byte a byte o da main`)
      if (!signed) ok(pub === main, `${nome} · visitante: HTML byte a byte o da main (sem muro de cadastro novo)`)
      ok(medicao(pub) === medicao(main), `${nome} · ${quem}: medição (data-home-cta/data-nav-item/data-home-card…) idêntica`)
      const a = hrefs(main), b = hrefs(pub)
      ok(a.length === b.length, `${nome} · ${quem}: mesmo número de links`)
      let mudou = 0
      for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) continue
        mudou++
        ok(MAP.has(inner(a[i]).pathname), `${nome} · ${quem}: só entrada de criação muda (${a[i]})`)
        ok(b[i] === entry.createEntryForLegacyHref(a[i], signed), `${nome} · ${quem}: ${a[i]} → ${b[i]} = a entrada única`)
        ok(/^\/create\/(film|cartoon|ads)$/.test(inner(b[i]).pathname), `${nome} · ${quem}: destino novo é uma aba (${b[i]})`)
      }
      const esperado = conta[signed ? 1 : 0]
      if (esperado === null) ok((signed ? mudou > 0 : mudou === 0) && mudou === a.filter(h => MAP.has(inner(h).pathname) && entry.createEntryForLegacyHref(h, signed) !== h).length, `${nome} · ${quem}: todos os filmes e anúncios secos mudaram (${mudou})`)
      else ok(mudou === esperado, `${nome} · ${quem}: ${esperado} entrada(s) mudam (vieram ${mudou})`)
      // O que FICA no antigo (motor específico, cartão de anúncio com formato, desenho com utm) continua lá.
      ok(a.filter(h => /^\/studio\?engine=(hollywood|h3|h3max|s25|fast)/.test(h)).every(h => b.includes(h)), `${nome} · ${quem}: links com motor específico ficam no Studio`)
    }
  }
  // Os três menus coerentes (logado: o MESMO href; visitante: a mesma aba no fim).
  if (!so || so.includes('menus')) {
    for (const signed of [true, false]) {
      const topo = viaRenderPage(o, 'app/KineoLanding.tsx', false, {}, { initialUser: signed ? { id: 'fixture' } : null })
      const nav = topo.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)[0], celTopo = nav.slice(nav.indexOf('id="mobile-nav-menu"'))
      const lateral = viaLoader(o, 'components/Sidebar.tsx', false, { userEmail: signed ? 'customer@example.org' : '', isLoggedIn: signed, credits: 10, plan: 'free' })
      const cel = viaRenderPage(o, 'components/MobileNav.tsx', false, { pathname: '/library' }, { isLoggedIn: signed })
      const pega = (html, item, label) => unesc(html.match(new RegExp(`<a[^>]*href="([^"]*)"[^>]*data-nav-item="${item}"[^>]*>(?:<[^>]+>)*${label}`))?.[1] ?? html.match(new RegExp(`<a[^>]*data-nav-item="${item}"[^>]*href="([^"]*)"`))?.[1] ?? '')
      const film = [pega(celTopo, 'video', 'Make a film'), pega(lateral, 'video', ''), pega(cel, 'video', '')]
      const ads = [pega(celTopo, 'business', 'Product ads'), pega(lateral, 'ads', ''), pega(cel, 'ads', '')]
      const [pf, pa] = signed ? ['/create/film', '/create/ads'] : ['/studio', '/ads/new']
      ok(film.every(h => h && new URL(h, 'https://k').pathname === pf) && ads.every(h => h && new URL(h, 'https://k').pathname === pa), `menus (${signed ? 'logado' : 'visitante'}): topo, lateral e celular levam ao MESMO lugar (${film.join(' · ')} | ${ads.join(' · ')})`)
      if (signed) ok(new Set(film).size === 1 && new Set(ads).size === 1, 'menus (logado): o MESMO href nos três')
      ok(lateral.includes('href="/library"') && cel.includes('href="/library"') && lateral.includes('href="/pricing"') && cel.includes('href="/pricing"'), 'menus das telas antigas: Library e Pricing seguem lá (só o destino da criação mudou)')
    }
  }
}

// Fora do que renderiza: faixa da home, caixa de presente, /pricing, e o cabeçalho da tela nova.
function otherChecks(o = {}) {
  const t = aba(o), tOff = aba(OFF(o)), tMain = aba({ ...o, 'components/home/EngineNewsBar.tsx': mainSrc('components/home/EngineNewsBar.tsx') })
  for (const s of [true, false]) {
    const pub = t.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s), off = tOff.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s), main = tMain.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s)
    ok(off === main, `faixa "Make my film" (${s ? 'logado' : 'visitante'}): 'off' = main (${main})`)
    ok(pub === (s ? '/create/film?intent_campaign=home_news_bar_k4_trial' : main), `faixa "Make my film" (${s ? 'logado' : 'visitante'}): ${pub}`)
  }
  const caixa = (ov) => loader({}, ov)('lib/ui/caixaPresente0511')
  const linha = (R) => R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).find(l => l.id === 'filme')?.href
  const cMain = caixa({ ...o, 'lib/ui/caixaPresente0511.ts': mainSrc('lib/ui/caixaPresente0511.ts') })
  ok(linha(cMain) === '/studio' && linha(caixa(OFF(o))) === '/studio', "caixa de presente: 'off' = main (/studio)")
  ok(linha(caixa(o)) === '/create/film?intent_campaign=studio_simple', 'caixa de presente: a linha do filme grátis abre a aba Film')
  const R = caixa(o)
  ok(R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).every(l => l.id === 'filme' || l.href === cMain.linhasDaCaixa({ ...cMain.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).find(x => x.id === l.id)?.href), 'caixa de presente: as outras linhas (Kling 4 com motor, conector, afiliado, oferta) não mudam')
  // /pricing: intocado (CEO 10/11: "DESFAÇA a linha do app/pricing/PricingClient.tsx") — igual à main byte a byte.
  ok(lf(o['app/pricing/PricingClient.tsx'] ?? read('app/pricing/PricingClient.tsx')) === lf(mainSrc('app/pricing/PricingClient.tsx')), '/pricing: PricingClient.tsx igual à main')
  // A tela nova: sem menu lateral, mas com volta para os vídeos e para os preços pelo cabeçalho.
  const nav = lf(o['components/create/CreateNavConta.tsx'] ?? read('components/create/CreateNavConta.tsx'))
  ok(nav.includes('href={CREATE_NAV_PRICING_HREF}') && nav.includes("CREATE_NAV_PRICING_HREF = '/pricing'") && nav.includes('href={CREATE_NAV_VIDEOS_HREF}') && nav.includes("CREATE_NAV_VIDEOS_HREF = '/library'") && /My videos/.test(nav), 'cabeçalho da tela nova: Pricing e My videos (/library, onde moram os filmes) presentes')
  const lib = lf(read('app/(dashboard)/library/LibraryClient.tsx'))
  ok(lib.includes("fetch('/api/videos?limit=1000'") && lib.includes("fetch('/api/clips'") && lib.includes("{ key: 'videos', label: 'Videos'") && lib.includes("{ key: 'clips', label: 'Clips'"), '/library mostra os filmes (Videos) e os clipes/Recreates (Clips)')
  // Nada fora do escopo: geradores, SEO, e-mail, conector, checkout.
  const diff = execFileSync('git', ['diff', '--name-only', MAIN, '--', '.'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  const proibido = /^(components\/studio\/|app\/\(dashboard\)\/(studio|generate|ads|kids-cartoon)\/|app\/api\/|app\/ai-video-generator\/|app\/vs\/|app\/alternatives\/|components\/seo\/|lib\/email|lib\/lifecycle|app\/checkout\/|lib\/stripe\/|supabase\/|lib\/growth\/homeClipsFirst|lib\/ui\/homeThreeCards|lib\/ui\/homeKidsCard|lib\/ui\/workspaceNavigation|app\/pricing\/)/
  ok(diff.every(f => !proibido.test(f)), `nenhum gerador, SEO, e-mail, conector, checkout ou lista de menu mexido (${diff.filter(f => proibido.test(f)).join(', ') || 'ok'})`)
}

async function rodar(o = {}, partes = ['A', 'B', 'C', 'D', 'X'], opts = {}) {
  if (partes.includes('A')) moduleChecks(o)
  if (partes.includes('B')) await pageChecks(o)
  if (partes.includes('C')) await eventChecks(o)
  if (partes.includes('D')) renderChecks(o, opts)
  if (partes.includes('X')) otherChecks(o)
}

await rodar()
const verdes = passed

// ─── E. Mutantes ───────────────────────────────────────────────────────────────────────────────────────────────────────
const src = p => read(p)
const troca = (p, a, b) => { const s = src(p); if (!s.includes(a)) throw new Error(`mutante sem alvo em ${p}: ${a}`); return { [p]: s.replace(a, b) } }
const MUTANTES = [
  ['visitante vai ao cadastro (muro novo)', troca('lib/create/entry.ts', "if (signedIn !== true) return legacyHref", "if (signedIn !== true) return '/signup?' + new URLSearchParams({ redirect: legacyHref })"), ['A']],
  ['visitante vai à tela nova no topo', troca('app/KineoLanding.tsx', 'href={createEntryHref(\'ads\', \'/ads/new\', isSignedIn)} data-nav-item="business" className="nav-primary"', 'href={createEntryHref(\'ads\', \'/ads/new\', true)} data-nav-item="business" className="nav-primary"'), ['D'], { so: ['topo'] }],
  ['a lateral manda visitante à tela nova', troca('components/Sidebar.tsx', 'signedIn={isLoggedIn} />', 'signedIn />'), ['D'], { so: ['lateral'] }],
  ['My videos volta para /clips', troca('components/create/CreateNavConta.tsx', "CREATE_NAV_VIDEOS_HREF = '/library'", "CREATE_NAV_VIDEOS_HREF = '/clips'"), ['X']],
  ['/pricing mexido', troca('app/pricing/PricingClient.tsx', 'Go to Dashboard', 'Go to Studio'), ['X']],
  ['a aba Film aceita prompt', troca('lib/create/entry.ts', 'const FILM_KEYS = /^(?:intent_campaign|ideia|', 'const FILM_KEYS = /^(?:prompt|intent_campaign|ideia|'), ['A']],
  ['qualquer motor vai para a aba Film', troca('lib/create/entry.ts', "if (k === 'engine') { if (v !== FILM_DEFAULT_ENGINE) return false; continue }", "if (k === 'engine') continue"), ['A']],
  ['o interruptor de entrada é ignorado', troca('lib/create/entry.ts', "if (entry !== 'public' || shell", "if (shell"), ['A']],
  ['Film ignora o CREATE_FILM_INPLACE', troca('lib/create/entry.ts', " || (kind === 'film' && film !== 'public')", ''), ['A']],
  ['entrada seca sem a campanha do /studio', troca('lib/create/entry.ts', "if (!q.has('intent_campaign')) q.append('intent_campaign', STUDIO_BOX_DEFAULT_CAMPAIGN)", ''), ['A']],
  ['Cartoon com dado vai para a casca', troca('lib/create/entry.ts', "if (u.search) return legacyHref", ''), ['A']],
  ['a aba não lê a ideia do link', troca('app/create/[tab]/page.tsx', 'ideiaInicial={ideiaDoLink(searchParams.ideia)}', ''), ['B']],
  ['a aba esquece a chegada do cadastro', troca('app/create/[tab]/page.tsx', 'return <><StudioIdeaArrival /><StudioNaMoldura', 'return <><StudioNaMoldura'), ['B']],
  ['a aba ignora a campanha do link', troca('app/create/[tab]/page.tsx', "const campanha = searchParams.intent_campaign === undefined ? CREATE_FILM_CAMPAIGN : campanhaDaCaixa(searchParams.intent_campaign)", 'const campanha = CREATE_FILM_CAMPAIGN'), ['B']],
  ['parâmetro estranho fica na aba', troca('app/create/[tab]/page.tsx', "if (params.tab === 'film' && !filmParamsSupported(searchParams, { arrival: true })) redirect(`/studio?${query}`)", ''), ['B']],
  ['o visitante volta sem a query', troca('lib/create/access.ts', "createTabHref(tab as CreateTab) + (query ? '?' + query : '')", 'createTabHref(tab as CreateTab)'), ['B']],
  ['StudioNaMoldura não repassa a ideia', troca('components/create/StudioNaMoldura.tsx', 'campanha={campanha} ideiaInicial={ideiaInicial} moldura=', 'campanha={campanha} moldura='), ['C']],
  ['a lateral volta ao Studio antigo', troca('components/Sidebar.tsx', 'href={createEntryForLegacyHref(href, signedIn)}', 'href={href}'), ['D'], { so: ['lateral', 'menus'] }],
  ['o celular mede pelo destino novo', troca('components/MobileNav.tsx', 'data-nav-item={navItemIdFor(href)}', 'data-nav-item={navItemIdFor(createEntryForLegacyHref(href, true))}'), ['D'], { so: ['celular (components'] }],
  ['o topo do celular esquece o Product ads', troca('app/KineoLanding.tsx', `<Link href={createEntryHref('ads', '/ads/new', isSignedIn)} data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>`, '<Link href="/ads/new" data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>'), ['D'], { so: ['menus'] }],
  ['as páginas de SEO mudam junto', troca('components/home/HomeThreeCards.tsx', 'href={entradaNova ? createEntryForLegacyHref(homeCardHref(card, signedIn), signedIn) : homeCardHref(card, signedIn)}', 'href={createEntryForLegacyHref(homeCardHref(card, signedIn), signedIn)}'), ['D'], { so: ['SEO'] }],
  ['a vitrine leva os filmes ao Studio antigo', troca('components/home/HomeMosaic.tsx', 'const filmHref = createEntryForLegacyHref(clipsFirstFilmHref(signedIn), signedIn)', 'const filmHref = clipsFirstFilmHref(signedIn)'), ['D'], { so: ['vitrine'] }],
  ['a caixa de presente leva ao Studio antigo', troca('lib/ui/caixaPresente0511.ts', "href: createEntryHref('film', '/studio', true) })", "href: '/studio' })"), ['X']],
  ['o "off" do topo não é o da main', troca('app/KineoLanding.tsx', "href={createEntryHref('film', '/studio?intent_campaign=nav_door', isSignedIn)}", "href={createEntryHref('film', '/studio?intent_campaign=nav_door&x=1', isSignedIn)}"), ['D'], { so: ['topo'] }],
]
let mortos = 0
for (const [nome, o, partes, opts] of MUTANTES) {
  let morreu = false
  try { await rodar(o, partes, opts) } catch { morreu = true }
  assert(morreu, 'MUTANTE SOBREVIVEU: ' + nome)
  mortos++
}
console.log(`test-entradas-tela-nova-1011: ${verdes} verificações verdes · ${mortos}/${MUTANTES.length} mutantes mortos`)
