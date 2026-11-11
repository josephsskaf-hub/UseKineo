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
  // KINEO-ENTRADAS-MOTOR-1011 [CEO 10/11: "logado vai para /create/film sem o motor"] — motor específico SAI do link (4º campo = sem motor)
  ['/studio?engine=hollywood&intent_campaign=nav_mega', 'film', '/create/film?intent_campaign=nav_mega', 'sem motor'],
  ['/studio?engine=h3max&intent_campaign=nav_mega', 'film', '/create/film?intent_campaign=nav_mega', 'sem motor'],
  ['/studio?engine=s25&intent_campaign=nav_mega', 'film', '/create/film?intent_campaign=nav_mega', 'sem motor'],
  ['/studio?engine=h3&intent_campaign=nav_mega', 'film', '/create/film?intent_campaign=nav_mega', 'sem motor'],
  ['/studio?engine=fast&intent_campaign=final_chip', 'film', '/create/film?intent_campaign=final_chip', 'sem motor'],
  ['/studio?engine=hollywood', 'film', '/create/film?intent_campaign=studio_simple', 'sem motor'],
  // ficam no Studio antigo: texto do ChatGPT/galeria, roteiro, série, retomada, autostart, conector, "More options", motor repetido
  ['/studio?engine=hollywood&engine=h3', 'film', null],
  ['/studio?engine=hollywood&prompt=Rome', 'film', null],
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
  ['/kids-cartoon?utm_source=home_card', 'cartoon', '/create/cartoon?utm_source=home_card'], // KINEO-ENTRADAS-CARTOES-1011
  ['/kids-cartoon?utm_source=home_card&intent_campaign=x&gclid=1', 'cartoon', '/create/cartoon?utm_source=home_card&intent_campaign=x&gclid=1'],
  ['/kids-cartoon?utm_source=a&utm_source=b', 'cartoon', null],
  ['/kids-cartoon?character=leo', 'cartoon', null],
  ['/ads/new', 'ads', '/create/ads'],
  ['/ads/new?utm_source=studio_door', 'ads', null],
  ['/ads/new?style=xmas', 'ads', null],
  ['/ads/v2?entry=product&utm_source=home_card', 'ads', '/create/ads?entry=product&utm_source=home_card'], // KINEO-ENTRADAS-CARTOES-1011
  ['/ads/v2?entry=ugc&utm_source=home_card', 'ads', '/create/ads?entry=ugc&utm_source=home_card'],
  ['/ads/v2?entry=ugc', 'ads', '/create/ads?entry=ugc'],
  ['/ads/v2?entry=evil&utm_source=home_card', 'ads', null],
  ['/ads/v2?entry=product&order=11111111-2222-3333-4444-555555555555', 'ads', null],
  ['/ads/v2?bf_template=x&bf_lang=en', 'ads', null],
  ['/ads/v2?mode=full', 'ads', null],
  ['/ads/v2', 'ads', null],
  ['/ads/v2?entry=product', 'film', null], ['/ads/v2?entry=product', 'cartoon', null],
  ['/ads/new', 'film', null], ['/studio', 'ads', null], ['/kids-cartoon', 'film', null],
]
function moduleChecks(o = {}) {
  const m = loader({}, o)
  const entry = m('lib/create/entry'), release = m('lib/create/release'), caixa = m('lib/growth/studioSimples'), auth = m('lib/authRedirect')
  const src = lf(o['lib/create/release.ts'] ?? read('lib/create/release.ts'))
  ok(release.CREATE_ENTRY_RELEASE === 'public', "o interruptor CREATE_ENTRY_RELEASE está 'public'")
  ok(src.includes('"1 sim, todas as telas vão pro modelo novo"') && /VOLTA: 'off'[^\n]*devolve TODAS as entradas ao destino antigo/.test(src), 'o interruptor traz a frase do fundador e a volta')
  for (const [legacy, kind, novo, semMotor] of FILM_CASES) {
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
      if (semMotor) { ok(q.engine && q.engine !== 'seedance' && !new URL(novo, 'https://k').searchParams.has('engine'), `${legacy}: o motor saiu do link`); delete q.engine }
      ok(caixa.usarCaixaUnica(q) && caixa.motorDaCaixa(q.engine) === caixa.motorDaCaixa(undefined), `${legacy}: no /studio abriria a MESMA caixa, com o MESMO motor`)
      const nq = Object.fromEntries(new URL(novo, 'https://k').searchParams)
      ok(caixa.campanhaDaCaixa(nq.intent_campaign) === caixa.campanhaDaCaixa(q.intent_campaign) && (nq.ideia ?? null) === (q.ideia ?? null), `${legacy}: mesma campanha e mesma ideia que o /studio grava`)
    }
  }
  // KINEO-ENTRADAS-VISITANTE-1111 [CEO 11/11: "nem todos os botões estão entrando no fluxo novo"] — o VISITANTE dos cartões: o redirect do cadastro leva o
  // destino da tela nova; o resto (caixa, /clips, /recreate, conteúdo, outros parâmetros do /signup) fica byte a byte.
  const S = d => '/signup?redirect=' + encodeURIComponent(d)
  for (const [antigo, novo] of [
    ['/studio?engine=seedance&intent_campaign=home_card', '/create/film?engine=seedance&intent_campaign=home_card'],
    ['/studio?intent_campaign=home_clips_first_film', '/create/film?intent_campaign=home_clips_first_film'],
    ['/studio?intent_campaign=home_news_bar_k4_trial', '/create/film?intent_campaign=home_news_bar_k4_trial'],
    ['/ads/v2?entry=product&utm_source=home_card', '/create/ads?entry=product&utm_source=home_card'],
    ['/ads/v2?entry=ugc&utm_source=home_card', '/create/ads?entry=ugc&utm_source=home_card'],
    ['/kids-cartoon?utm_source=home_card', '/create/cartoon?utm_source=home_card'],
  ]) {
    ok(entry.createEntryForSignupHref(S(antigo), false) === S(novo), `visitante: ${antigo} → o cadastro volta em ${novo}`)
    ok(entry.createEntryForSignupHref(S(antigo), undefined) === S(antigo) && entry.createEntryForSignupHref(S(antigo), 'true') === S(antigo), `login desconhecido: ${antigo} fica`)
    ok(entry.createEntryForSignupHref(antigo, true) === novo && entry.createEntryForSignupHref(novo, true) === novo, `logado: ${antigo} → ${novo}`)
    ok(auth.normalizeInternalRedirect(novo) === novo, `${novo} é um redirect interno válido do cadastro`)
    for (const r of ['off', 'internal']) ok(entry.createEntryForSignupHref(S(antigo), false, { entry: r }) === S(antigo) && entry.createEntryForSignupHref(S(antigo), false, { shell: r }) === S(antigo), `interruptor '${r}': o cadastro volta ao destino antigo (${antigo})`)
  }
  for (const h of [
    S('/clips'), S('/clips?engine=x&prompt=y'), S('/recreate'), S('/recreate/passarela'), S('/images?engine=nanobanana&utm_source=made_with_kineo'), S('/spaces'), S('/pricing'),
    S('/studio?prompt=Rome'), S('/studio?engine=hollywood&prompt=Rome'), S('/ads/v2'), S('/ads/new?style=xmas'), S('/ads/v2?entry=evil'), S('/api/stripe/checkout?plan=creator'),
    '/signup', '/signup?utm_source=nav', '/signup?utm_source=nav-mobile', '/signup?reason=checkout&redirect=%2Fstudio', '/signup?redirect=%2Fstudio&utm_source=x',
    '/signup?prompt=A%20ship%20found%20adrift', '/signup?redirect=%2Fstudio&redirect=%2Fads%2Fv2%3Fentry%3Dugc', '/login?redirect=%2Fstudio', '/studio?intent_campaign=home_phone_box&ideia=x',
    '/ai-ugc-ads', '/ai-kids-cartoon-videos', '#try-kineo', 'https://evil.example/signup?redirect=%2Fstudio',
  ]) ok(entry.createEntryForSignupHref(h, false) === h, `visitante: ${h} fica byte a byte`)
  ok(['/studio', '/ads/new', '/kids-cartoon', '/signup?utm_source=x', '/clips'].every(h => entry.createEntryForSignupHref(h, true) === entry.createEntryForLegacyHref(h, true)), 'logado: createEntryForSignupHref = createEntryForLegacyHref')
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
    '@/components/StudioIdeaArrival': Marca('StudioIdeaArrival'), '@/components/create/StudioNaMoldura': Marca('StudioNaMoldura'), '@/components/create/CreateShell': Marca('CreateShell'), './AbaComChegada': Marca('AbaComChegada'), // KINEO-ENTRADAS-TOPO-E-HOME-1011
    '@/components/studio/StudioSimples': Marca('StudioSimples'), './StudioClient': Marca('StudioClient'),
    '@/lib/engineWall': { getHouseEngineExamples: () => [] }, '@/lib/publicExamples': { ENGINE_PAGE_LEAD: [], FOUNDER_SHOWCASE: [] }, '@/lib/growth/filmesDaPorta0511': { filmesDaPorta0511: () => [] },
  }
  const m = loader(stubs, o)
  return { create: m('app/create/[tab]/page').default, studio: m('app/(dashboard)/studio/page').default }
}
const filhos = el => React.Children.toArray(el?.props?.children ?? []).concat(el && typeof el.type === 'function' ? [el] : [])
const achar = (el, name) => filhos(el).find(c => c.type?.name === name)
const sp = href => Object.fromEntries(new URL(href, 'https://k').searchParams)
const semEngine = q => { const { engine, ...resto } = q; return resto } // KINEO-ENTRADAS-MOTOR-1011
async function pageChecks(o = {}) {
  const entry = loader({}, o)('lib/create/entry')
  const USER = { id: 'u', email: 'customer@example.org' }
  const filmEntries = FILM_CASES.filter(([, k, n]) => k === 'film' && n)
  for (const [legacy, , novo, semMotor] of filmEntries) {
    const P = paginas(o, USER)
    const st = P.studio({ searchParams: semMotor ? semEngine(sp(legacy)) : sp(legacy) }) // KINEO-ENTRADAS-MOTOR-1011 — sem motor: compara com o /studio sem o motor (o que a aba faz)
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
  // KINEO-ENTRADAS-MOTOR-1011 — a entrada tira o motor; a PÁGINA continua mandando ao /studio quem chega com outro motor pela URL.
  { let rm = null; try { await paginas(o, USER).create({ params: { tab: 'film' }, searchParams: { engine: 'hollywood', intent_campaign: 'x' } }) } catch (e) { rm = e.redirect } ; ok(rm === '/studio?engine=hollywood&intent_campaign=x', '/create/film?engine=hollywood (pela URL) → /studio com o motor') }
  ok(entry.filmParamsSupported({ ideia: 'x', signup: '1' }, { arrival: true }) && !entry.filmParamsSupported({ ideia: 'x', signup: '1' }), 'signup/welcome: só a página aceita (uma entrada nunca os manda)')
  // KINEO-ENTRADAS-TOPO-E-HOME-1011 [fundador 10/11: "Make my ad", "Make my UGC ad", "Make my cartoon" e "AI UGC Ads" abriam a tela ANTIGA] — as abas
  // Ads e Cartoon executadas: a chegada (entry + atribuição) é guardada e o "Continue" leva o MESMO dado ao gerador de hoje (o entry chega ao /ads/v2).
  for (const [tab, q, destino] of [
    ['ads', { entry: 'ugc', utm_source: 'home_card' }, '/ads/v2?entry=ugc&utm_source=home_card'],
    ['ads', { entry: 'product', utm_source: 'home_card' }, '/ads/v2?entry=product&utm_source=home_card'],
    ['ads', { entry: 'ugc' }, '/ads/v2?entry=ugc'],
    ['cartoon', { utm_source: 'home_card' }, '/kids-cartoon?utm_source=home_card'],
  ]) {
    const raiz = await paginas(o, USER).create({ params: { tab }, searchParams: q })
    const pg = achar(raiz, 'AbaComChegada') // KINEO-ENTRADAS-VISITANTE-1111 — dentro de um fragmento com a chegada do cadastro (StudioIdeaArrival)
    ok(!!achar(raiz, 'StudioIdeaArrival') && pg?.type?.name === 'AbaComChegada' && pg.props.tab === tab && pg.props.destino === destino, `/create/${tab}?${new URLSearchParams(q)} (logado): a aba com o Continue → ${pg?.props?.destino}`)
  }
  // KINEO-ENTRADAS-VISITANTE-1111 — conta nova que veio do cartão da home (o callback põe signup=1 no destino; o e-mail, welcome=1): cai na aba,
  // a conversão/origem do cadastro contam nela e o Continue leva a MESMA query (com a marca) ao gerador de hoje. Marca com outro valor = gerador de hoje.
  for (const [tab, q, destino] of [
    ['ads', { entry: 'ugc', utm_source: 'home_card', signup: '1' }, '/ads/v2?entry=ugc&utm_source=home_card&signup=1'],
    ['ads', { entry: 'product', utm_source: 'home_card', welcome: '1' }, '/ads/v2?entry=product&utm_source=home_card&welcome=1'],
    ['cartoon', { utm_source: 'home_card', signup: '1' }, '/kids-cartoon?utm_source=home_card&signup=1'],
  ]) {
    const raiz = await paginas(o, USER).create({ params: { tab }, searchParams: q })
    const pg = achar(raiz, 'AbaComChegada')
    ok(!!achar(raiz, 'StudioIdeaArrival') && pg?.props?.destino === destino, `/create/${tab} conta nova (${JSON.stringify(q)}): a aba, com a chegada do cadastro → ${pg?.props?.destino}`)
  }
  for (const [tab, q, volta] of [['ads', { entry: 'ugc', signup: '2' }, '/ads/v2?entry=ugc&signup=2'], ['cartoon', { signup: 'x' }, '/kids-cartoon?signup=x']]) {
    let r = null
    try { await paginas(o, USER).create({ params: { tab }, searchParams: q }) } catch (e) { r = e.redirect }
    ok(r === volta, `/create/${tab} com marca de cadastro que não é 1 → o gerador de hoje (${r})`)
  }
  for (const [tab, q, volta] of [['ads', { entry: 'bogus' }, '/ads/v2?entry=bogus'], ['ads', { entry: 'ugc', style: 'x' }, '/ads/v2?entry=ugc&style=x'], ['cartoon', { character: 'leo' }, '/kids-cartoon?character=leo']]) {
    let r = null
    try { await paginas(o, USER).create({ params: { tab }, searchParams: q }) } catch (e) { r = e.redirect }
    ok(r === volta, `/create/${tab} com dado que a aba não repassa → o gerador de hoje com a query intacta (${r})`)
  }
  for (const tab of ['ads', 'cartoon']) { const seco = await paginas(o, USER).create({ params: { tab }, searchParams: {} }); ok(seco?.type?.name === 'CreateShell', `/create/${tab} seco: a CreateShell de sempre`) }
}

// ─── C. O mesmo pedido e os mesmos eventos ─────────────────────────────────────────────────────────────────────────────
const GEN = ['mrr_generate_clicked', 'studio_simple_generate_clicked']
const MOUNT = ['studio_simple_viewed', 'mrr_studio_viewed']
const only = (evs, names) => evs.filter(([n]) => names.includes(n))
async function eventChecks(o = {}) {
  const entry = loader({}, o)('lib/create/entry')
  for (const [legacy, , , semMotor] of FILM_CASES.filter(([, k, n]) => k === 'film' && n)) {
    const novo = entry.createEntryHref('film', legacy, true)
    const P = paginas(o, { id: 'u', email: 'customer@example.org' })
    const a = achar(P.studio({ searchParams: semMotor ? semEngine(sp(legacy)) : sp(legacy) }), 'StudioSimples').props
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
  ['topo (app/KineoLanding.tsx: mega-menu, Product ads, menu do celular, Dashboard, CTA final)', (o, b, s) => viaRenderPage(o, 'app/KineoLanding.tsx', b, {}, { initialUser: s ? { id: 'fixture' } : null }), [0, null]], // KINEO-ENTRADAS-CARTOES-1011 — logado: TODA entrada de criação (era 8; + motores, AI UGC Ads, AI Cartoon Videos)
  ['menu lateral (components/Sidebar.tsx)', (o, b, s) => viaLoader(o, 'components/Sidebar.tsx', b, { userEmail: s ? 'customer@example.org' : '', isLoggedIn: s, credits: 10, plan: 'free' }), [0, 3]],
  ['menu do celular (components/MobileNav.tsx)', (o, b, s) => viaRenderPage(o, 'components/MobileNav.tsx', b, { pathname: '/library' }, { isLoggedIn: s }), [0, 3]],
  ['cartões da home (components/home/HomeThreeCards.tsx, entradaNova)', (o, b, s) => viaRenderPage(o, 'components/home/HomeThreeCards.tsx', b, {}, { signedIn: s, kidsCard: true, ...(b ? {} : { entradaNova: true }) }), [null, null]], // KINEO-ENTRADAS-CARTOES-1011 — logado: Films + Product + UGC + Cartoon (era 1)
  ['portas e caixa do celular (components/home/HomePortasCelular.tsx, entradaNova)', (o, b, s) => viaRenderPage(o, 'components/home/HomePortasCelular.tsx', b, {}, { signedIn: s, ...(b ? {} : { entradaNova: true }) }), [null, null]], // KINEO-ENTRADAS-CARTOES-1011 — logado: as 3 portas + Cartoon + caixa (era 2)
  ['vitrine (components/home/HomeMosaic.tsx: filmes + "Ad example")', (o, b, s) => viaLoader(o, 'components/home/HomeMosaic.tsx', b, { signedIn: s }), [null, null]],
  ['páginas de SEO (HomeThreeCards sem entradaNova, como em components/seo/PaginaClara.tsx)', (o, b, s) => viaRenderPage(o, 'components/home/HomeThreeCards.tsx', b, {}, { signedIn: s, kidsCard: true }), [0, 0]],
]
function renderChecks(o = {}, { so = null } = {}) {
  const entry = loader({}, o)('lib/create/entry')
  const MAP = new Set(['/studio', '/ads/new', '/kids-cartoon', '/ads/v2']) // KINEO-ENTRADAS-CARTOES-1011 — + /ads/v2 (cartões Product/UGC)
  // KINEO-ENTRADAS-CARTOES-1011 — links de CONTEÚDO que, para quem está logado, são "fazer agora" (topo: AI UGC Ads · AI Cartoon Videos).
  const CONTEUDO = { '/ai-kids-cartoon-videos': ['cartoon', '/kids-cartoon'], '/ai-ugc-ads': ['ads', '/ads/v2?entry=ugc'] }
  const esperado = (h, s) => { const c = CONTEUDO[inner(h).pathname]; return c ? entry.createEntryForContentHref(c[0], h, c[1], s) : entry.createEntryForSignupHref(h, s) } // KINEO-ENTRADAS-VISITANTE-1111 — + o embrulho do cadastro do visitante
  const criacao = h => MAP.has(inner(h).pathname) || inner(h).pathname in CONTEUDO
  const inner = h => { const u = new URL(h, 'https://k'); return u.pathname === '/signup' && u.searchParams.get('redirect') ? new URL(u.searchParams.get('redirect'), 'https://k') : u }
  for (const [nome, render, conta] of SUPERFICIES) {
    if (so && !so.some(x => nome.includes(x))) continue
    for (const signed of [false, true]) {
      const quem = signed ? 'logado' : 'visitante'
      const main = render(o, true, signed), off = render(OFF(o), false, signed), pub = render(o, false, signed)
      ok(off === main, `${nome} · ${quem}: 'off' = HTML byte a byte o da main`)
      if (!signed && conta[0] === 0) ok(pub === main, `${nome} · visitante: HTML byte a byte o da main (sem muro de cadastro novo)`) // KINEO-ENTRADAS-VISITANTE-1111 — as superfícies com [null] mudam SÓ o redirect do cadastro (conferido link a link abaixo)
      ok(medicao(pub) === medicao(main), `${nome} · ${quem}: medição (data-home-cta/data-nav-item/data-home-card…) idêntica`)
      const a = hrefs(main), b = hrefs(pub)
      ok(a.length === b.length, `${nome} · ${quem}: mesmo número de links`)
      let mudou = 0
      for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) continue
        mudou++
        ok(criacao(a[i]), `${nome} · ${quem}: só entrada de criação muda (${a[i]})`)
        ok(b[i] === esperado(a[i], signed) || (inner(a[i]).pathname in CONTEUDO && b[i] === a[i]), `${nome} · ${quem}: ${a[i]} → ${b[i]} = a entrada única`)
        ok(/^\/create\/(film|cartoon|ads)$/.test(inner(b[i]).pathname), `${nome} · ${quem}: destino novo é uma aba (${b[i]})`)
      }
      const conta1 = conta[signed ? 1 : 0]
      if (conta1 === null) ok(mudou > 0 && mudou >= a.filter(h => MAP.has(inner(h).pathname) && esperado(h, signed) !== h).length && mudou <= a.filter(h => criacao(h) && esperado(h, signed) !== h).length, `${nome} · ${quem}: todos os filmes e anúncios secos mudaram (${mudou})`)
      else ok(mudou === conta1, `${nome} · ${quem}: ${conta1} entrada(s) mudam (vieram ${mudou})`)
      // KINEO-ENTRADAS-MOTOR-1011 — link com motor específico: logado vai à aba Film SEM o motor; visitante fica no Studio.
      for (let i = 0; i < a.length; i++) if (/^\/studio\?engine=(hollywood|h3|h3max|s25|fast)\b/.test(a[i])) ok(signed ? b[i].startsWith('/create/film') && !/[?&]engine=/.test(b[i]) : b[i] === a[i], `${nome} · ${quem}: ${a[i]} → ${b[i]}`)
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
  // KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11] — "Make my cartoon" (cartão da home), "AI UGC Ads" do topo: renderizados de verdade.
  for (const s of [true, false]) {
    const quem = s ? 'logado' : 'visitante'
    const kids = (ov, props) => hrefs(viaLoader(ov, 'components/home/HomeKidsCard.tsx', false, props))[0]
    const kMain = hrefs(viaLoader(o, 'components/home/HomeKidsCard.tsx', true, { signedIn: s }))[0]
    ok(kids(o, { signedIn: s }) === kMain && kids(OFF(o), { signedIn: s, entradaNova: true }) === kMain, `cartão Cartoon (${quem}): sem entradaNova ou com 'off' = main (${kMain})`)
    ok(kids(o, { signedIn: s, entradaNova: true }) === (s ? '/create/cartoon?utm_source=home_card' : '/signup?redirect=' + encodeURIComponent('/create/cartoon?utm_source=home_card')), `cartão Cartoon (${quem}, home; KINEO-ENTRADAS-VISITANTE-1111: o visitante volta do cadastro na aba): ${kids(o, { signedIn: s, entradaNova: true })}`)
    const ugc = (ov, props) => hrefs(viaLoader(ov, 'components/NavUgcAdsLink.tsx', false, { 'data-nav-item': 'more:ugc', ...props }))[0]
    const uMain = hrefs(viaLoader(o, 'components/NavUgcAdsLink.tsx', true, { 'data-nav-item': 'more:ugc' }))[0]
    ok(ugc(o, {}) === uMain && ugc(OFF(o), { signedIn: true }) === uMain && ugc(o, { signedIn: false }) === uMain, `AI UGC Ads: sem login conhecido, visitante ou 'off' = a página de conteúdo (${uMain})`)
    if (s) ok(ugc(o, { signedIn: true }) === '/create/ads?entry=ugc', `AI UGC Ads (logado): ${ugc(o, { signedIn: true })}`)
  }
  const e = loader({}, o)('lib/create/entry')
  ok(e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', true) === '/create/cartoon' && e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', false) === '/ai-kids-cartoon-videos' && e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', true, { entry: 'off' }) === '/ai-kids-cartoon-videos', 'AI Cartoon Videos: logado → aba; visitante e off → conteúdo')
  for (const f of ['app/examples/page.tsx', 'app/made-with-kineo/page.tsx']) {
    const src = lf(o[f] ?? read(f))
    ok(!/href="\/(studio|ads\/new)"/.test(src) && src.includes("createEntryForContentHref('cartoon', MENU_CARTOON_HREF, '/kids-cartoon',") && /<NavUgcAdsLink data-nav-item="more:ugc" signedIn=\{/.test(src), `${f}: o topo passa pela entrada única (Make a film · Product ads · AI UGC Ads · AI Cartoon Videos · Open Studio)`)
  }
  const t = aba(o), tOff = aba(OFF(o)), tMain = aba({ ...o, 'components/home/EngineNewsBar.tsx': mainSrc('components/home/EngineNewsBar.tsx') })
  for (const s of [true, false]) {
    const pub = t.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s), off = tOff.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s), main = tMain.m('components/home/EngineNewsBar').engineNewsBarTrialHref(s)
    ok(off === main, `faixa "Make my film" (${s ? 'logado' : 'visitante'}): 'off' = main (${main})`)
    ok(pub === (s ? '/create/film?intent_campaign=home_news_bar_k4_trial' : '/signup?redirect=' + encodeURIComponent('/create/film?intent_campaign=home_news_bar_k4_trial')), `faixa "Make my film" (${s ? 'logado' : 'visitante'}): ${pub}`)
  }
  const caixa = (ov) => loader({}, ov)('lib/ui/caixaPresente0511')
  const linha = (R) => R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).find(l => l.id === 'filme')?.href
  const cMain = caixa({ ...o, 'lib/ui/caixaPresente0511.ts': mainSrc('lib/ui/caixaPresente0511.ts') })
  ok(linha(cMain) === '/studio' && linha(caixa(OFF(o))) === '/studio', "caixa de presente: 'off' = main (/studio)")
  ok(linha(caixa(o)) === '/create/film?intent_campaign=studio_simple', 'caixa de presente: a linha do filme grátis abre a aba Film')
  const R = caixa(o)
  ok(R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).every(l => l.id === 'filme' || l.href === cMain.linhasDaCaixa({ ...cMain.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).find(x => x.id === l.id)?.href), 'caixa de presente: as outras linhas (Kling 4 com motor, conector, afiliado, oferta) não mudam')
  // /pricing: intocado (CEO 10/11: "DESFAÇA a linha do app/pricing/PricingClient.tsx") — igual à main byte a byte.
  // KINEO-ENTRADAS-VISITANTE-1111 — por CONTEÚDO, não por diff contra uma main fixa: a faxina do Google (11/11) mexeu legitimamente no /pricing. O que não pode: a entrada única nele.
  { const pr = lf(o['app/pricing/PricingClient.tsx'] ?? read('app/pricing/PricingClient.tsx')); ok(!/KINEO-ENTRADAS-|lib\/create\/entry/.test(pr), '/pricing: PricingClient.tsx sem a entrada única (intocado por esta obra)') }
  // A tela nova: sem menu lateral, mas com volta para os vídeos e para os preços pelo cabeçalho.
  const nav = lf(o['components/create/CreateNavConta.tsx'] ?? read('components/create/CreateNavConta.tsx'))
  ok(nav.includes('href={CREATE_NAV_PRICING_HREF}') && nav.includes("CREATE_NAV_PRICING_HREF = '/pricing'") && nav.includes('href={CREATE_NAV_VIDEOS_HREF}') && nav.includes("CREATE_NAV_VIDEOS_HREF = '/library'") && /My videos/.test(nav), 'cabeçalho da tela nova: Pricing e My videos (/library, onde moram os filmes) presentes')
  const lib = lf(read('app/(dashboard)/library/LibraryClient.tsx'))
  ok(lib.includes("fetch('/api/videos?limit=1000'") && lib.includes("fetch('/api/clips'") && lib.includes("{ key: 'videos', label: 'Videos'") && lib.includes("{ key: 'clips', label: 'Clips'"), '/library mostra os filmes (Videos) e os clipes/Recreates (Clips)')
  // Nada fora do escopo: geradores, SEO, e-mail, conector, checkout.
  // KINEO-ENTRADAS-TOPO-E-HOME-1011 [CEO 10/11: "a checagem final… compara a árvore inteira com a main e falha em qualquer branch futura"] — a
  // checagem não depende mais de "diff da árvore contra uma main": olha o CONTEÚDO. A entrada única só existe onde há a marca da obra
  // (KINEO-ENTRADAS-*) ou o import de lib/create/entry; nenhum gerador, página de SEO, e-mail, conector, checkout ou lista de menu pode ter
  // nenhum dos dois. Obra alheia nesses arquivos (outra branch, outra sessão) não acusa nada; a entrada vazando para lá acusa.
  const proibido = /^(components\/studio\/|app\/\(dashboard\)\/(studio|generate|ads|kids-cartoon)\/|app\/api\/|app\/ai-video-generator\/|app\/vs\/|app\/alternatives\/|components\/seo\/|lib\/email|lib\/lifecycle|app\/checkout\/|lib\/stripe\/|supabase\/|lib\/growth\/homeClipsFirst|lib\/ui\/homeThreeCards|lib\/ui\/homeKidsCard|lib\/ui\/workspaceNavigation|app\/pricing\/)/
  const arquivos = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.ts', '*.tsx', '*.js', '*.mjs', '*.sql'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e8 }).split('\n').map(s => s.trim()).filter(f => f && proibido.test(f))
  const temEntrada = s => /KINEO-ENTRADAS-|['"]@\/lib\/create\/entry['"]|['"](?:\.\.\/)+(?:lib\/)?create\/entry['"]/.test(s)
  const vazou = arquivos.filter(f => { try { return temEntrada(o[f] ?? read(f)) } catch { return false } })
  ok(arquivos.length > 100, `checagem de escopo enxerga os arquivos protegidos (${arquivos.length})`)
  ok(vazou.length === 0, `nenhum gerador, SEO, e-mail, conector, checkout ou lista de menu carrega a entrada (${vazou.join(', ') || 'ok'})`)
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
  // KINEO-ENTRADAS-CARTOES-1011 · KINEO-ENTRADAS-MOTOR-1011
  ['o cartão Cartoon ignora a entrada', troca('components/home/HomeKidsCard.tsx', 'href={entradaNova ? createEntryForSignupHref(homeKidsCardHref(signedIn), signedIn) : homeKidsCardHref(signedIn)', 'href={homeKidsCardHref(signedIn)'), ['X']],
  ['AI UGC Ads sempre na página de conteúdo', troca('components/NavUgcAdsLink.tsx', "createEntryForContentHref('ads', menuUgcHref(language), NAV_UGC_MAKE_NOW_HREF, signedIn)", 'menuUgcHref(language)'), ['X']],
  ['o motor não sai do link', troca('lib/create/entry.ts', "if (motores.length === 1 && motores[0] !== FILM_DEFAULT_ENGINE) q.delete('engine')", ''), ['A']],
  ['o cartão UGC perde o entry', troca('lib/create/entry.ts', 'adsArrivalSupported(u.searchParams) ? `/create/ads${u.search}`', 'adsArrivalSupported(u.searchParams) ? `/create/ads`'), ['A']],
  ['entry inválido passa', troca('lib/create/entry.ts', "k === 'entry' ? ADS_ENTRIES.has(v) :", "k === 'entry' ? true :"), ['A']],
  ['o visitante do AI Cartoon vai à aba', troca('lib/create/entry.ts', 'const novo = createEntryHref(kind, makeNowHref, signedIn, opts)', 'const novo = createEntryHref(kind, makeNowHref, true, opts)'), ['X']],
  ['visitante vai ao cadastro (muro novo)', troca('lib/create/entry.ts', "if (signedIn !== true) return legacyHref", "if (signedIn !== true) return '/signup?' + new URLSearchParams({ redirect: legacyHref })"), ['A']],
  ['visitante vai à tela nova no topo', troca('app/KineoLanding.tsx', 'href={createEntryHref(\'ads\', \'/ads/new\', isSignedIn)} data-nav-item="business" className="nav-primary"', 'href={createEntryHref(\'ads\', \'/ads/new\', true)} data-nav-item="business" className="nav-primary"'), ['D'], { so: ['topo'] }],
  ['a lateral manda visitante à tela nova', troca('components/Sidebar.tsx', 'signedIn={isLoggedIn} />', 'signedIn />'), ['D'], { so: ['lateral'] }],
  ['My videos volta para /clips', troca('components/create/CreateNavConta.tsx', "CREATE_NAV_VIDEOS_HREF = '/library'", "CREATE_NAV_VIDEOS_HREF = '/clips'"), ['X']],
  ['/pricing mexido', troca('app/pricing/PricingClient.tsx', "'use client'", "'use client'\nimport '@/lib/create/entry'"), ['X']],
  ['a aba Film aceita prompt', troca('lib/create/entry.ts', 'const FILM_KEYS = /^(?:intent_campaign|ideia|', 'const FILM_KEYS = /^(?:prompt|intent_campaign|ideia|'), ['A']],
  ['qualquer motor vai para a aba Film', troca('lib/create/entry.ts', "if (k === 'engine') { if (v !== FILM_DEFAULT_ENGINE) return false; continue }", "if (k === 'engine') continue"), ['A', 'B']],
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
  ['as páginas de SEO mudam junto', troca('components/home/HomeThreeCards.tsx', 'href={entradaNova ? createEntryForSignupHref(homeCardHref(card, signedIn), signedIn) : homeCardHref(card, signedIn)}', 'href={createEntryForSignupHref(homeCardHref(card, signedIn), signedIn)}'), ['D'], { so: ['SEO'] }],
  ['a vitrine leva os filmes ao Studio antigo', troca('components/home/HomeMosaic.tsx', 'const filmHref = createEntryForSignupHref(clipsFirstFilmHref(signedIn), signedIn)', 'const filmHref = clipsFirstFilmHref(signedIn)'), ['D'], { so: ['vitrine'] }],
  ['a caixa de presente leva ao Studio antigo', troca('lib/ui/caixaPresente0511.ts', "href: createEntryHref('film', '/studio', true) })", "href: '/studio' })"), ['X']],
  ['a aba Ads não repassa o entry', troca('lib/create/entry.ts', "return `${tab === 'ads' ? ADS_V2_PATH : LEGACY_ENTRY_PATH.cartoon}?${query}`", "return tab === 'ads' ? ADS_V2_PATH : `${LEGACY_ENTRY_PATH.cartoon}?${query}`"), ['B']], // KINEO-ENTRADAS-TOPO-E-HOME-1011
  ['a entrada vaza para uma lista de menu', troca('lib/ui/homeKidsCard.ts', 'export function homeKidsCardHref(', "import '@/lib/create/entry'\nexport function homeKidsCardHref("), ['X']], // KINEO-ENTRADAS-TOPO-E-HOME-1011
  // KINEO-ENTRADAS-VISITANTE-1111
  ['o cadastro do visitante ignora outros parâmetros', troca('lib/create/entry.ts', "if (keys.length !== 1 || keys[0] !== 'redirect') return legacyHref", ''), ['A']],
  ['login desconhecido vira visitante', troca('lib/create/entry.ts', "if (signedIn !== false) return legacyHref // login desconhecido", "// login desconhecido"), ['A']],
  ['a marca do cadastro aceita qualquer valor', troca('lib/create/entry.ts', "return ARRIVAL_KEYS.test(k) && v === '1'", "return ARRIVAL_KEYS.test(k)"), ['B']],
  ['a aba Ads/Cartoon esquece a chegada do cadastro', troca('app/create/[tab]/page.tsx', 'return <><StudioIdeaArrival /><AbaComChegada', 'return <><AbaComChegada'), ['B']],
  ['o cartão de filme do visitante fica no Studio antigo (vitrine)', troca('components/home/HomeMosaic.tsx', 'const filmHref = createEntryForSignupHref(clipsFirstFilmHref(signedIn), signedIn)', 'const filmHref = clipsFirstFilmHref(signedIn)'), ['D'], { so: ['vitrine'] }],
  ['a faixa do visitante fica no Studio antigo', troca('components/home/EngineNewsBar.tsx', 'return createEntryForSignupHref(signedIn ? studio', 'return (signedIn ? studio'), ['X']],
  ['as portas do celular do visitante ficam no antigo', troca('components/home/HomePortasCelular.tsx', '(entradaNova ? createEntryForSignupHref(href, signedIn) : href)', '(entradaNova ? (signedIn ? createEntryForLegacyHref(href, signedIn) : href) : href)'), ['D'], { so: ['portas'] }],
  ['o redirect do visitante aponta para fora das abas', troca('lib/create/entry.ts', "return `/signup?redirect=${encodeURIComponent(novo)}`", "return `/signup?redirect=${encodeURIComponent(destino + '&x=1')}`"), ['A']],
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
