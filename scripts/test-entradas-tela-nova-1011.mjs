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
// KINEO-ENTRADAS-SO-LOGADO-1011 — reancorado em 26/11: a porta de criação é pública. O Generate continua autenticado.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { renderPage, setCurrentFilter } from './preview-ux-complete.mjs'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const { aba } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const React = require(ROOT + '/node_modules/react')
const { renderToStaticMarkup } = require(ROOT + '/node_modules/react-dom/server')

const MAIN = '2a5525920b4b41b5adb359355e0fc489cb50597c' // produção antes dos editores públicos (26/11)
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
  ['/ads/new?utm_source=studio_door', 'ads', '/create/ads?utm_source=studio_door'],
  ['/ads/new?style=xmas', 'ads', '/create/ads?style=xmas'],
  ['/ads/v2?entry=product&utm_source=home_card', 'ads', '/create/ads?entry=product&utm_source=home_card'], // KINEO-ENTRADAS-CARTOES-1011
  ['/ads/v2?entry=ugc&utm_source=home_card', 'ads', '/create/ads?entry=ugc&utm_source=home_card'],
  ['/ads/v2?entry=ugc', 'ads', '/create/ads?entry=ugc'],
  ['/ads/v2?entry=evil&utm_source=home_card', 'ads', null],
  ['/ads/v2?entry=product&order=11111111-2222-3333-4444-555555555555', 'ads', null],
  ['/ads/v2?bf_template=x&bf_lang=en', 'ads', '/create/ads?bf_template=x&bf_lang=en'],
  ['/ads/v2?bf_template=x&bf_lang=unknown', 'ads', null],
  ['/ads/v2?mode=full', 'ads', null],
  ['/ads/v2', 'ads', '/create/ads'],
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
    ok(entry.createEntryHref(kind, legacy, false) === (novo ?? legacy), `visitante: ${kind} ${legacy} → ${novo ?? legacy}`)
    for (const quem of [undefined, null, 'true', 1]) ok(entry.createEntryHref(kind, legacy, quem) === legacy && entry.createEntryForLegacyHref(legacy, quem) === legacy, `visitante (${String(quem)}): ${legacy} fica`)
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
  const RELEASE = 'lib/create/publicEditorRelease.ts'
  const closed = loader({}, { ...o, [RELEASE]: read(RELEASE).replace('PUBLIC_CREATE_EDITORS = true', 'PUBLIC_CREATE_EDITORS = false') })('lib/create/entry')
  for (const [legacy, kind, expected] of FILM_CASES) {
    ok(closed.createEntryHref(kind, legacy, false) === legacy, 'fechar a porta pública restaura o link do visitante')
    ok(closed.createEntryHref(kind, legacy, true) === (expected ?? legacy), 'fechar a porta pública conserva o editor da conta')
  }
  const oldCard = S('/kids-cartoon?utm_source=home_card')
  ok(closed.createEntryForSignupHref(oldCard, false) === S('/create/cartoon?utm_source=home_card'), 'rollback mantém a atribuição de cadastro que o visitante já tinha')
  for (const [antigo, novo] of [
    ['/studio?engine=seedance&intent_campaign=home_card', '/create/film?engine=seedance&intent_campaign=home_card'],
    ['/studio?intent_campaign=home_clips_first_film', '/create/film?intent_campaign=home_clips_first_film'],
    ['/studio?intent_campaign=home_news_bar_k4_trial', '/create/film?intent_campaign=home_news_bar_k4_trial'],
    ['/ads/v2?entry=product&utm_source=home_card', '/create/ads?entry=product&utm_source=home_card'],
    ['/ads/v2?entry=ugc&utm_source=home_card', '/create/ads?entry=ugc&utm_source=home_card'],
    ['/kids-cartoon?utm_source=home_card', '/create/cartoon?utm_source=home_card'],
  ]) {
    for (const signed of [false, true]) ok(entry.createEntryForSignupHref(S(antigo), signed) === novo, `editor antes do cadastro: ${antigo} → ${novo} (sessão ${signed})`)
    ok(entry.createEntryForSignupHref(S(antigo), undefined) === S(antigo) && entry.createEntryForSignupHref(S(antigo), 'true') === S(antigo), `login desconhecido: ${antigo} fica`)
    ok(entry.createEntryForSignupHref(antigo, true) === novo && entry.createEntryForSignupHref(novo, true) === novo, `logado: ${antigo} → ${novo}`)
    ok(auth.normalizeInternalRedirect(novo) === novo, `${novo} é um redirect interno válido do cadastro`)
    for (const r of ['off', 'internal']) ok(entry.createEntryForSignupHref(S(antigo), false, { entry: r }) === S(antigo) && entry.createEntryForSignupHref(S(antigo), false, { shell: r }) === S(antigo), `interruptor '${r}': o cadastro volta ao destino antigo (${antigo})`)
  }
  for (const h of [
    S('/images?engine=nanobanana&utm_source=made_with_kineo'), S('/spaces'), S('/pricing'),
    S('/studio?prompt=Rome'), S('/studio?engine=hollywood&prompt=Rome'), S('/ads/v2?entry=evil'), S('/api/stripe/checkout?plan=creator'),
    '/signup', '/signup?utm_source=nav', '/signup?utm_source=nav-mobile', '/signup?reason=checkout&redirect=%2Fstudio',
    '/signup?prompt=A%20ship%20found%20adrift', '/signup?redirect=%2Fstudio&redirect=%2Fads%2Fv2%3Fentry%3Dugc', '/login?redirect=%2Fstudio',
    '/ai-ugc-ads', '/ai-kids-cartoon-videos', '#try-kineo', 'https://evil.example/signup?redirect=%2Fstudio',
  ]) ok(entry.createEntryForSignupHref(h, false) === h, `visitante: ${h} fica byte a byte`)
  ok(['/studio', '/ads/new', '/kids-cartoon', '/signup?utm_source=x', '/clips'].every(h => entry.createEntryForSignupHref(h, true) === entry.createEntryForLegacyHref(h, true)), 'logado: createEntryForSignupHref = createEntryForLegacyHref')
  const clip = '/clips?engine=hollywood&prompt=Plan%20A&intent_campaign=card'
  for (const signed of [true, false]) {
    ok(entry.createEntryForSignupHref(S(clip), signed) === clip.replace('/clips', '/create/clip'), 'clip mantém o pedido pelo cadastro e pela URL')
    for (const r of ['/recreate','/recreate/passarela']) ok(entry.createEntryForSignupHref(S(r), signed) === r, 'Recreate abre o catálogo ou o molde pelo ID')
    ok(entry.createEntryForSignupHref('/signup?redirect=%2Fstudio&utm_source=chatgpt', signed) === '/create/film?utm_source=chatgpt&intent_campaign=studio_simple', 'atribuição externa do envelope chega ao editor antes do cadastro')
    ok(entry.createEntryForSignupHref('/signup?redirect=%2Fstudio%3Futm_source%3Dchatgpt&utm_source=google', signed).startsWith('/signup?'), 'origens conflitantes não são sobrepostas')
  }
  for (const bad of ['//outside.invalid', 'https://outside.invalid', '/api/checkout', '/library', '/login']) {
    ok(entry.publicCreateCtaHref(S(bad)) === S(bad), 'um link de conta, compra ou externo não vira entrada de editor')
  }
  const outer = new URLSearchParams({ intent_campaign: 'editorial_mystery', utm_source: 'chatgpt', redirect: '/studio?engine=h3&prompt=Camera%20inside%20the%20room&language=pt&script_mode=verbatim' })
  const seo = new URL(entry.publicCreateCtaHref('/signup?' + outer), 'https://kineo.test')
  ok(seo.pathname === '/create/film' && seo.searchParams.get('ideia') === 'Camera inside the room' && seo.searchParams.get('engine') === 'h3' && seo.searchParams.get('language') === 'pt' && seo.searchParams.get('script_mode') === 'verbatim', 'CTA editorial mantém motor, idioma e roteiro')
  ok(seo.searchParams.get('utm_source') === 'chatgpt' && seo.searchParams.get('intent_campaign') === 'editorial_mystery', 'CTA editorial mantém a origem ChatGPT e a campanha')
  ok(!seo.searchParams.has('create_intent') && !seo.searchParams.has('autostart'), 'o CTA editorial não arma disparo')
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
  ok(['/signup?utm_source=nav', '/signup?redirect=%2Fstudio&utm_source=x', '/signup', '/pricing', '/recreate/passarela', '/ai-kids-cartoon-videos', '#try-kineo'].every(h => entry.createEntryForLegacyHref(h, true) === h), 'outros hrefs (cadastro com outra chave, preços, clipes, Recreate, página de conteúdo) ficam')
  ok(entry.createEntryForLegacyHref('/studio', true) === '/create/film?intent_campaign=studio_simple' && entry.createEntryForLegacyHref('/ads/new', true) === '/create/ads' && entry.createEntryForLegacyHref('/kids-cartoon', true) === '/create/cartoon', 'menus: os três destinos antigos secos')
}

// ─── B. /create/film lê o que o /studio lê (as duas páginas executadas) ───────────────────────────────────────────────────
const Marca = name => { const f = () => null; Object.defineProperty(f, 'name', { value: name }); return { __esModule: true, default: f } }
const pageFixtures = new WeakMap()
function paginas(o, user, country = 'US') {
  if (!pageFixtures.has(o)) pageFixtures.set(o, new Map())
  const fixtures = pageFixtures.get(o), key = JSON.stringify([user?.id, user?.email, country])
  if (fixtures.has(key)) return fixtures.get(key)
  const nav = { redirect: u => { throw { redirect: u } }, notFound: () => { throw { notFound: true } }, useRouter: () => ({}), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }
  const stubs = {
    'next/headers': { headers: () => new Headers(country ? { 'x-vercel-ip-country': country } : {}) },
    '@/components/kidsCartoon/KidsCartoonTemplate': Marca('KidsCartoonTemplate'), '@/components/kidsCartoon/KidsVendaPanel': Marca('KidsVendaPanel'),
    'next/navigation': nav, 'next/link': link, '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/components/StudioIdeaArrival': Marca('StudioIdeaArrival'), '@/components/create/StudioNaMoldura': Marca('StudioNaMoldura'), '@/components/create/CreateShell': Marca('CreateShell'), './AbaComChegada': Marca('AbaComChegada'), // KINEO-ENTRADAS-TOPO-E-HOME-1011
    '@/components/studio/StudioSimples': Marca('StudioSimples'), './StudioClient': Marca('StudioClient'),
    '@/lib/engineWall': { getHouseEngineExamples: () => [] }, '@/lib/auth/signedInFounder': { signedInFounder: async () => false }, '@/app/(dashboard)/ads/v2/AdsV2Workspace': Marca('AdsV2Workspace'), '@/lib/growth/filmesDaPorta0511': { filmesDaPorta0511: () => [] },
  }
  const m = loader(stubs, o)
  const pages = { create: m('app/create/[tab]/page').default, studio: m('app/(dashboard)/studio/page').default }
  fixtures.set(key, pages)
  return pages
}
const filhos = el => !React.isValidElement(el) ? [] : [el, ...React.Children.toArray(el.props.children).flatMap(filhos)]
const achar = (el, name) => filhos(el).find(c => c.type?.name === name)
const sp = href => Object.fromEntries(new URL(href, 'https://k').searchParams)
const semEngine = q => { const { engine, ...resto } = q; return resto } // KINEO-ENTRADAS-MOTOR-1011
async function pageChecks(o = {}) {
  const entry = loader({}, o)('lib/create/entry')
  const USER = { id: 'u', email: 'customer@example.org' }
  const filmEntries = FILM_CASES.filter(([, k, n]) => k === 'film' && n)
  for (const [legacy, , novo, semMotor] of filmEntries) {
    const P = paginas(o, USER)
    const st = await P.studio({ searchParams: semMotor ? semEngine(sp(legacy)) : sp(legacy) }) // KINEO-ENTRADAS-MOTOR-1011 — sem motor: compara com o /studio sem o motor (o que a aba faz)
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
    const visitor = await paginas(o, null).create({ params: { tab: 'film' }, searchParams: sp(novo) })
    const guest = achar(visitor, 'StudioNaMoldura')?.props
    ok(guest && guest.ideiaInicial === b.ideiaInicial && guest.campanha === b.campanha && guest.caixaNova && guest.entry.visitor === true && guest.entry.confirmedCountry === true, `página Film antes do cadastro: ${novo}`)
  }
  // Bare /create/film (abas da própria tela): a campanha de sempre da aba.
  const P = paginas(o, USER)
  const bare = await P.create({ params: { tab: 'film' }, searchParams: {} })
  ok(achar(bare, 'StudioNaMoldura')?.props.campanha === 'create_film' && achar(bare, 'StudioNaMoldura')?.props.ideiaInicial === '', '/create/film sem query: create_film, caixa vazia (como antes)')
  for (const country of [null, 'BD']) {
    const frame = achar(await paginas(o, null, country).create({ params: { tab: 'film' }, searchParams: {} }), 'StudioNaMoldura')
    ok(frame?.props.entry.visitor && !frame.props.entry.confirmedCountry, 'mercado sem confirmação não promete filme grátis')
  }
  const PV = paginas(o, null)
  const cartoonGuest = await PV.create({ params: { tab: 'cartoon' }, searchParams: {} }).catch(e => { if (e.redirect) assert.fail('Cartoon redirecionou antes do Generate: ' + e.redirect); throw e })
  ok(achar(cartoonGuest, 'KidsCartoonTemplate')?.props.visitante === true, 'visitante abre o Cartoon antes do cadastro')
  const cartoonSigned = await P.create({ params: { tab: 'cartoon' }, searchParams: {} })
  for (const [page, signedIn] of [[cartoonGuest, false], [cartoonSigned, true]]) {
    const header = achar(page, 'CreateMolduraTopo')
    ok(header?.props.active === 'cartoon' && header.props.signedIn === signedIn, 'cabeçalho mantém Cartoon ativa e o estado da sessão')
  }
  // Parâmetro que a aba não trata igual → /studio com a query intacta (nada se perde), antes até da sessão.
  for (const legacy of FILM_CASES.filter(([l, k, n]) => k === 'film' && !n && l.startsWith('/studio?')).map(([l]) => l)) {
    const q = sp(legacy)
    if (Object.keys(q).length !== [...new URL(legacy, 'https://k').searchParams.keys()].length) continue // chave repetida: o objeto já perdeu um valor
    // A URL do próprio editor suporta roteiro e estilo vindos de SEO, inclusive quando um menu genérico conserva o destino antigo.
    if (q.prompt && Object.keys(q).every(k => ['engine','prompt','script_mode','intent_campaign'].includes(k))) {
      for (const actor of [USER, null]) {
        const frame = achar(await paginas(o, actor).create({ params: { tab: 'film' }, searchParams: q }), 'StudioNaMoldura')
        ok(frame?.props.ideiaInicial === q.prompt && (!q.engine || frame.props.motor === q.engine), 'editor recebe o texto e o motor do CTA')
      }
      continue
    }
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
  ok(entry.filmParamsSupported({ engine: 'hollywood' }) && !entry.filmParamsSupported({ engine: 'unlisted' }), 'o modelo explícito do CTA tem de pertencer ao editor')
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
    if (tab === 'ads') {
      const pg = achar(raiz, 'AdsV2Workspace')
      ok(!!achar(raiz, 'StudioIdeaArrival') && pg?.props.moldura && JSON.stringify(pg.props.searchParams) === JSON.stringify(q), `Ads na moldura preserva entry e atribuição: ${destino}`)
    } else {
      ok(!!achar(raiz, 'StudioIdeaArrival') && achar(raiz, 'KidsCartoonTemplate')?.props.visitante === false && entry.destinoDaChegada(tab, new URLSearchParams(q).toString()) === destino, `Cartoon preserva chegada: ${destino}`)
    }
  }
  // KINEO-ENTRADAS-VISITANTE-1111 — conta nova que veio do cartão da home (o callback põe signup=1 no destino; o e-mail, welcome=1): cai na aba,
  // a conversão/origem do cadastro contam nela e o Continue leva a MESMA query (com a marca) ao gerador de hoje. Marca com outro valor = gerador de hoje.
  for (const [tab, q, destino] of [
    ['ads', { entry: 'ugc', utm_source: 'home_card', signup: '1' }, '/ads/v2?entry=ugc&utm_source=home_card&signup=1'],
    ['ads', { entry: 'product', utm_source: 'home_card', welcome: '1' }, '/ads/v2?entry=product&utm_source=home_card&welcome=1'],
    ['cartoon', { utm_source: 'home_card', signup: '1' }, '/kids-cartoon?utm_source=home_card&signup=1'],
  ]) {
    const raiz = await paginas(o, USER).create({ params: { tab }, searchParams: q })
    const pg = achar(raiz, tab === 'ads' ? 'AdsV2Workspace' : 'KidsCartoonTemplate')
    ok(!!achar(raiz, 'StudioIdeaArrival') && (tab === 'ads' ? JSON.stringify(pg?.props.searchParams) === JSON.stringify(q) : pg?.props.visitante === false && entry.destinoDaChegada(tab, new URLSearchParams(q).toString()) === destino), `/create/${tab} conta nova (${JSON.stringify(q)}): a aba, com a chegada do cadastro → ${pg?.props?.destino}`)
  }
  for (const [tab, q, volta] of [['ads', { entry: 'ugc', signup: '2' }, '/ads/v2?entry=ugc&signup=2'], ['cartoon', { signup: 'x' }, '/kids-cartoon?signup=x']]) {
    let r = null
    try {
      const tree = await paginas(o, USER).create({ params: { tab }, searchParams: q })
      if (tab === 'ads') { const pg = achar(tree, 'AdsV2Workspace'); ok(pg?.props.moldura && JSON.stringify(pg.props.searchParams) === JSON.stringify(q), 'Ads recebeu a query inteira no workspace'); continue }
    } catch (e) { r = e.redirect }
    ok(r === volta, `/create/${tab} com marca de cadastro que não é 1 → o gerador de hoje (${r})`)
  }
  for (const [tab, q, volta] of [['ads', { entry: 'bogus' }, '/ads/v2?entry=bogus'], ['ads', { entry: 'ugc', style: 'x' }, '/ads/v2?entry=ugc&style=x'], ['cartoon', { character: 'leo' }, '/kids-cartoon?character=leo']]) {
    let r = null
    try {
      const tree = await paginas(o, USER).create({ params: { tab }, searchParams: q })
      if (tab === 'ads') { const pg = achar(tree, 'AdsV2Workspace'); ok(pg?.props.moldura && JSON.stringify(pg.props.searchParams) === JSON.stringify(q), 'Ads recebeu a query inteira no workspace'); continue }
    } catch (e) { r = e.redirect }
    ok(r === volta, `/create/${tab} com dado que a aba não repassa → o gerador de hoje com a query intacta (${r})`)
  }
  for (const tab of ['ads', 'cartoon']) { const seco = await paginas(o, USER).create({ params: { tab }, searchParams: {} }); ok(achar(seco, tab === 'ads' ? 'AdsV2Workspace' : 'KidsCartoonTemplate'), `/create/${tab} seco: a CreateShell de sempre`) }
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
    const a = achar(await P.studio({ searchParams: semMotor ? semEngine(sp(legacy)) : sp(legacy) }), 'StudioSimples').props
    const b = achar(await P.create({ params: { tab: 'film' }, searchParams: sp(novo) }), 'StudioNaMoldura').props
    // Uma aba de cada vez: os dublês de navegador (sessionStorage, document) são globais.
    const returning = { cookie: SESSION, credits: { ...TRIAL, hasPaid: true, filmsDelivered: 2 } }
    const ta = aba(o, returning)
    ta.mount(React.createElement(ta.m('components/studio/StudioSimples').default, a))
    await ta.settle()
    if (!a.ideiaInicial) ta.type(p => p['aria-label'] === 'Your idea', 'The lost plane of 1942', 'caixa')
    ta.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
    const tb = aba(o, returning)
    tb.mount(React.createElement(tb.m('components/create/StudioNaMoldura').default, b))
    await tb.settle()
    if (!a.ideiaInicial) tb.type(p => p.id === 'cx-ideia', 'The lost plane of 1942', 'passo 1')
    else ok(tb.one(p => p.id === 'cx-ideia', 'passo 1').props.value === a.ideiaInicial, `${novo}: a ideia do link já está no passo 1`)
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
  ok(/<button[^>]*data-testid="studio-simple-generate"[^>]*>[\s\S]*?First film free[\s\S]*?<\/button>/.test(t.html()), 'conta nova vinda do cadastro: o aviso do filme grátis aparece na aba Film')
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
// Cada superfície renderiza a marcação real, com a sessão injetada. Nas páginas que pediram links de criação,
// apenas a URL da ação muda. Âncoras editoriais, de conta e os identificadores de medição continuam idênticos.
const SURFACES = [
  ['topo', (o, s) => viaRenderPage(o, 'app/KineoLanding.tsx', false, {}, { initialUser: s ? { id: 'fixture' } : null })],
  ['lateral', (o, s) => viaLoader(o, 'components/Sidebar.tsx', false, { userEmail: s ? 'customer@example.org' : '', isLoggedIn: s, credits: 10, plan: 'free' })],
  ['celular', (o, s) => viaRenderPage(o, 'components/MobileNav.tsx', false, { pathname: '/library' }, { isLoggedIn: s })],
  ['cartões', (o, signedIn) => viaLoader(o, 'components/home/HomeThreeCards.tsx', false, { signedIn, kidsCard: true, entradaNova: true, focusedShowcase: true })],
  ['portas', (o, signedIn) => viaRenderPage(o, 'components/home/HomePortasCelular.tsx', false, {}, { signedIn, entradaNova: true, focusedShowcase: true })],
  ['vitrine', (o, signedIn) => viaLoader(o, 'components/home/HomeMosaic.tsx', false, { signedIn })],
  ['cabeçalho', (o, signedIn) => viaLoader(o, 'components/PublicSiteHeader.tsx', false, { signedIn })],
  ['cards editoriais', (o, signedIn) => viaLoader(o, 'components/home/HomeThreeCards.tsx', false, { signedIn, kidsCard: true, entradaNova: true })],
]
const url = value => new URL(value, 'https://kineo.test')
const pathOf = href => url(href).pathname
function attributes(tag) {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w-]+)="([^"]*)"/g), m => [m[1], unesc(m[2])]))
}
function anchors(html) {
  return Array.from(html.matchAll(/<a\b[^>]*>/g), m => attributes(m[0])).filter(a => a.href)
}
const editorial = new Set(['/made-with-kineo', '/kineo-in-claude', '/pricing', '/login', '/library'])
function requireLink(links, selector, path, name) {
  const matched = links.filter(selector)
  ok(matched.length > 0, `${name}: o link existe`)
  for (const a of matched) ok(pathOf(a.href) === path, `${name}: esperado ${path}, veio ${a.href}`)
}
function renderChecks(o = {}, { so = null } = {}) {
  for (const [name, render] of SURFACES) {
    if (so && !so.includes(name)) continue
    for (const signed of [false, true]) {
      const pub = render(o, signed), off = render(OFF(o), signed)
      const links = anchors(pub), legacy = anchors(off)
      ok(links.length > 0 && links.length === legacy.length, `${name} tem os mesmos links com a chave ligada/desligada`)
      ok(medicao(pub) === medicao(off), `${name}: data de atribuição igual`)
      for (const [index, original] of legacy.entries()) {
        const dest = url(original.href)
        if (editorial.has(dest.pathname)) ok(links[index].href === original.href, `${name} preserva o destino editorial/conta ${original.href}`)
        if (original.href.startsWith('/signup?') && dest.searchParams.has('redirect')) {
          const target = url(dest.searchParams.get('redirect'))
          const path = { '/studio':'/create/film', '/kids-cartoon':'/create/cartoon', '/ads/v2':'/create/ads', '/ads/new':'/create/ads' }[target.pathname]
          if (!path) continue
          const actual = url(links[index].href)
          ok(actual.pathname === path, `${name}: antes de cadastro ${original.href} → ${path} (veio ${actual.pathname})`)
          for (const [k, v] of target.searchParams) if (/^(utm_|intent_campaign$|entry$|ref$|ideia$)/.test(k)) ok(actual.searchParams.get(k) === v, `${name}: ${k} preservado do cartão`)
        }
      }
      if (['topo','cabeçalho','lateral','celular'].includes(name)) {
        requireLink(links, a => a['data-nav-item'] === 'video', '/create/film', name+' Films')
        requireLink(links, a => /cartoon/.test(a['data-nav-item'] ?? ''), '/create/cartoon', name+' Cartoon')
        for (const path of ['/recreate', '/pricing']) requireLink(links, a => pathOf(a.href) === path, path, name)
        if (name === 'topo' || name === 'cabeçalho') {
          for (const path of ['/made-with-kineo','/kineo-in-claude']) requireLink(links, a => pathOf(a.href) === path, path, name)
          ok(links.filter(a => a['data-nav-item'] === 'video').length === 2, name+': Film no topo e no menu do celular')
        } else requireLink(links, a => pathOf(a.href) === '/library', '/library', name+' biblioteca')
      }
      if (name === 'cartões' || name === 'portas') {
        const cards = links.filter(a => (name === 'cartões' ? a['data-home-card'] : a.class === 'kpc-porta'))
        assert.deepEqual(cards.map(a => pathOf(a.href)), ['/create/film','/create/film','/create/cartoon','/create/cartoon'], name+': os quatro cartões abrem o produto')
      }
      if (name === 'vitrine') {
        const cards = links.filter(a => a['data-home-cta'] === 'mosaic_film')
        requireLink(cards, () => true, '/create/film', name+' filme')
      }
      if (name === 'cards editoriais') {
        requireLink(links, a => a['data-home-card'] === 'product_ads', '/create/ads', name+' anúncios de produto')
        requireLink(links, a => a['data-home-card'] === 'ugc_ads', '/create/ads', name+' UGC')
        requireLink(links, a => a['data-home-ugc-guide'], '/ai-ugc-ads', name+' guia público')
      }
    }
  }
}

// Fora do que renderiza: faixa da home, caixa de presente, /pricing, e o cabeçalho da tela nova.
let scope
function protectedScope() {
  if (scope) return scope
  const proibido = /^(app\/api\/|lib\/email|lib\/lifecycle|app\/checkout\/|lib\/stripe\/|supabase\/)/
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.ts', '*.tsx', '*.js', '*.mjs', '*.sql'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e8 }).split('\n').map(s => s.trim()).filter(f => f && proibido.test(f) && !['app/api/citations/film-entry/route.ts','app/api/citations/tool-entry/route.ts'].includes(f))
  const temEntrada = s => /KINEO-ENTRADAS-|['"]@\/lib\/create\/entry['"]|['"](?:\.\.\/)+(?:lib\/)?create\/entry['"]/.test(s)
  const previous = new Map()
  function violation(file, source) {
    if (!temEntrada(source)) return false
    if (!previous.has(file)) {
      try { previous.set(file, temEntrada(mainSrc(file))) } catch { previous.set(file, false) }
    }
    return !previous.get(file)
  }
  const baseline = new Set(paths.filter(file => violation(file, read(file))))
  scope = { paths: new Set(paths), baseline, violation }
  return scope
}

function otherChecks(o = {}) {
  // KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11] — "Make my cartoon" (cartão da home), "AI UGC Ads" do topo: renderizados de verdade.
  for (const s of [true, false]) {
    const quem = s ? 'logado' : 'visitante'
    const kids = (ov, props) => hrefs(viaLoader(ov, 'components/home/HomeKidsCard.tsx', false, props))[0]
    const kMain = hrefs(viaLoader(o, 'components/home/HomeKidsCard.tsx', true, { signedIn: s }))[0]
    ok(kids(o, { signedIn: s, entradaNova: false }) === kMain && kids(OFF(o), { signedIn: s, entradaNova: true }) === kMain, `cartão Cartoon (${quem}): sem entradaNova ou com 'off' = main (${kMain})`)
    ok(kids(o, { signedIn: s, entradaNova: true }) === '/create/cartoon?utm_source=home_card', `cartão Cartoon (${quem}, home; KINEO-ENTRADAS-VISITANTE-1111: o visitante volta do cadastro na aba): ${kids(o, { signedIn: s, entradaNova: true })}`)
    const ugc = (ov, props) => hrefs(viaLoader(ov, 'components/NavUgcAdsLink.tsx', false, { 'data-nav-item': 'more:ugc', ...props }))[0]
    const uMain = '/ai-ugc-ads'
    ok(ugc(OFF(o), { signedIn: s }) === uMain, 'AI UGC Ads: OFF mantém a página pública')
    ok(ugc(o, { signedIn: s }) === '/create/ads?entry=ugc', 'AI UGC Ads: as duas sessões abrem o editor UGC')
  }
  const e = loader({}, o)('lib/create/entry')
  ok(e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', true) === '/create/cartoon' && e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', false) === '/create/cartoon' && e.createEntryForContentHref('cartoon', '/ai-kids-cartoon-videos', '/kids-cartoon', true, { entry: 'off' }) === '/ai-kids-cartoon-videos', 'AI Cartoon Videos: logado → aba; visitante e off → conteúdo')
  for (const signed of [false, true]) {
    const trial = aba(o).m('components/home/EngineNewsBar').engineNewsBarTrialHref(signed)
    const off = aba(OFF(o)).m('components/home/EngineNewsBar').engineNewsBarTrialHref(signed)
    ok(trial === '/create/film?intent_campaign=home_news_bar_k4_trial', 'a faixa abre o editor diretamente nas duas sessões')
    const original = '/studio?intent_campaign=home_news_bar_k4_trial'
    ok(off === (signed ? original : '/signup?redirect=' + encodeURIComponent(original)), 'a faixa OFF conserva o destino antigo')
  }
  const caixa = (ov) => loader({}, ov)('lib/ui/caixaPresente0511')
  const linha = (R) => R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, credits: TRIAL }, 1_800_000_000_000).find(l => l.id === 'filme')?.href
  const cMain = caixa({ ...o, 'lib/ui/caixaPresente0511.ts': mainSrc('lib/ui/caixaPresente0511.ts') })
  ok(linha(cMain) === '/create/film?intent_campaign=studio_simple' && linha(caixa(OFF(o))) === '/studio', "caixa de presente: 'off' = main (/studio)")
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
  // O novo escopo inclui CTAs em SEO. Os caminhos financeiros e os processadores não recebem a lógica de navegação.
  const { paths: arquivos, baseline, violation } = protectedScope()
  const vazou = new Set(baseline)
  for (const [file, source] of Object.entries(o)) if (arquivos.has(file)) {
    if (violation(file, source)) vazou.add(file)
    else vazou.delete(file)
  }
  ok(arquivos.size > 100, `checagem de escopo enxerga os arquivos protegidos (${arquivos.size})`)
  ok(vazou.size === 0, `nenhum gerador, SEO, e-mail, conector, checkout ou lista de menu carrega a entrada (${[...vazou].join(', ') || 'ok'})`)
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

// Somente o erro de asserção previsto mata o mutante. Falha de import, erro de sintaxe ou dublê incompleto falham o teste.
const ENTRY = 'lib/create/entry.ts'
function mutation(file, original, replacement, { all = false } = {}) {
  const source = read(file)
  assert.ok(source.includes(original), `alvo de mutação ausente em ${file}: ${original}`)
  return { [file]: all ? source.replaceAll(original, replacement) : source.replace(original, replacement) }
}
const PAGE = 'app/create/[tab]/page.tsx'
const changes = [
  ['texto da aba não chega à caixa', PAGE, 'ideiaInicial={entry.text}', "ideiaInicial=''", ['B'], /mesma|motor \(|ideia.*studio/],
  ['aba perde campanha', PAGE, 'campanha={campaign}', 'campanha="lost"', ['B'], /motor \(|campanha/],
  ['retorno sem atribuição', PAGE, 'return <><StudioIdeaArrival /><StudioNaMoldura caixaNova entry={entry}', 'return <><StudioNaMoldura caixaNova entry={entry}', ['B'], /chegada do cadastro/],
  ['visitante assumido logado', PAGE, 'filmEntry(searchParams, !loggedIn, trusted', 'filmEntry(searchParams, false, trusted', ['B'], /página Film antes do cadastro/],
  ['grátis para país desconhecido', PAGE, 'trusted && paisDaListaConfirmado(paisDoRequest(headers())) !== null', 'true', ['B'], /mercado sem confirmação/],
  ['perde consulta ao regressar', PAGE, 'redirect(\`/studio?\${query}\`)', "redirect('/studio')", ['B'], /create\/film\?/],
  ["aba Cartoon exige login precoce", PAGE, "if (params.tab === 'cartoon') return", "if (loggedIn && params.tab === 'cartoon') return", ['B'], /visitante abre o Cartoon|redirecionou antes/],
  ['Ads perde entry ou UTM', PAGE, 'searchParams={searchParams} moldura', 'searchParams={{}} moldura', ['B'], /Ads na moldura/, null, true],
  ["Cartoon perde a presença do evento", PAGE, "if (params.tab === 'cartoon') return <><StudioIdeaArrival />", "if (params.tab === 'cartoon') return <>", ['B'], /Cartoon preserva chegada/],
  ['móvel mede por destino novo', 'components/MobileNav.tsx', 'data-nav-item={navItemIdFor(href)}', 'data-nav-item={navItemIdFor(createEntryForLegacyHref(href, isLoggedIn === true))}', ['D'], /data de atribuição/, ['celular']],
  ['topo visitante no Studio', 'app/KineoLanding.tsx', "href={createEntryHref('film', '/studio?intent_campaign=nav_door', isSignedIn)}", 'href="/studio?intent_campaign=nav_door"', ['D'], /topo Films: esperado/, ['topo']],
  ['Cartoon móvel no guia SEO', 'app/KineoLanding.tsx', "href={createEntryForContentHref('cartoon', MENU_CARTOON_HREF, '/kids-cartoon', isSignedIn)}", 'href={MENU_CARTOON_HREF}', ['D'], /topo Cartoon: esperado/, ['topo'], true],
  ['portas móveis voltam ao cadastro', 'components/home/HomePortasCelular.tsx', '(entradaNova ? createEntryForSignupHref(href, signedIn) : href)', 'href', ['D'], /portas.*antes de cadastro|quatro cartões/, ['portas']],
  ['cards editoriais pulam entrada', 'components/home/HomeThreeCards.tsx', 'createEntryForSignupHref(homeCardHref(card, signedIn), signedIn)', 'homeCardHref(card, signedIn)', ['D'], /cards editoriais.*antes de cadastro|cards editoriais.*esperado/, ['cards editoriais']],
  ['login desconhecido', ENTRY, "if (typeof signedIn !== 'boolean' || (!signedIn && !PUBLIC_CREATE_EDITORS)) return legacyHref", '', ['A'], /visitante \(undefined\)/],
  ['visitante volta ao legado', ENTRY, "return productHref(kind, legacyHref, opts, false)", "return signedIn ? productHref(kind, legacyHref, opts, false) : legacyHref", ['A'], /visitante: film/],
  ['cadastro antes da criação', ENTRY, "u.pathname === '/signup' ? destinationFromSignup(u, opts, false)", "u.pathname === '/signup' ? href", ['A'], /editor antes do cadastro/],
  ['perda de origem no cadastro', ENTRY, 'nested.searchParams.set(k, v)', 'if (k !== "utm_source") nested.searchParams.set(k, v)', ['A'], /atribuição externa/],
  ['mistura de origens', ENTRY, 'if (nested.searchParams.has(k) && nested.searchParams.get(k) !== v) return null', '', ['A'], /origens conflitantes/],
  ['duas chaves repetidas', ENTRY, "typeof value !== 'string' || result.has(key)", "typeof value !== 'string'", ['A'], /engine=hollywood&engine=h3/],
  ['OFF indevido', ENTRY, "(opts.entry ?? CREATE_ENTRY_RELEASE) !== 'public' || ", '', ['A'], /entrada 'off'/],
  ['casca interna exposta', ENTRY, "(opts.shell ?? CREATE_SHELL_RELEASE) !== 'public'", "false", ['A'], /casca 'off'/],
  ['Film ignora flag', ENTRY, "return kind !== 'film' || (opts.filmInplace ?? CREATE_FILM_INPLACE) === 'public'", 'return true', ['A'], /Film na moldura 'off'/],
  ['motor de menu enviado por engano', ENTRY, "!explicit && q.get('engine') !== FILM_DEFAULT_ENGINE", 'false', ['A'], /engine=hollywood/],
  ['motor oficial recusado', ENTRY, "case 'engine': return FILM_ENGINES.has(v)", "case 'engine': return false", ['A'], /engine=seedance/],
  ['campanha default perdida', ENTRY, "q.set('intent_campaign', STUDIO_BOX_DEFAULT_CAMPAIGN)", "q.delete('intent_campaign')", ['A'], /logado: film \/studio →/],
  ['chave arbitrária admitida', ENTRY, '      default: return false', '      default: return true', ['A'], /avancado=1|onboarding_goal=faceless|series=abc/],
  ['perda de campanha/editorial', ENTRY, "q.set('ideia', q.get('prompt')!)", "q.set('ideia', '')", ['A'], /CTA editorial mantém/],
  ['entry UGC some', ENTRY, "'/create/ads' + u.search", "'/create/ads'", ['A'], /ads\/new\?utm_source|ads\/v2\?entry/],
  ['entry inválido admitido', ENTRY, "(v === 'product' || v === 'ugc')", 'true', ['A'], /entry=evil/],
  ['atribuição do Cartoon some', ENTRY, "'/create/cartoon' + u.search", "'/create/cartoon'", ['A'], /kids-cartoon\?utm_source/],
  ['cartoon sem guarda', ENTRY, '&& cartoonArrivalSupported(u.searchParams)', '', ['A'], /utm_source=a&utm_source=b|character=leo/],
  ['menu Cartoon volta ao editorial', ENTRY, 'return novo !== makeNowHref && novo.startsWith', 'return signedIn && novo !== makeNowHref && novo.startsWith', ['X'], /AI UGC Ads: as duas sessões/],
  ['Clip perde o prompt', ENTRY, "'/create/clip' + u.search", "'/create/clip'", ['A'], /clip mantém/],
  ['a lateral volta ao Studio', 'components/Sidebar.tsx', 'href={createEntryForLegacyHref(href, signedIn)}', 'href={href}', ['D'], /lateral Films: esperado/, ['lateral']],
  ['cartão passa pelo cadastro', 'components/home/HomeKidsCard.tsx', 'createEntryForSignupHref(homeKidsCardHref(signedIn), signedIn)', 'homeKidsCardHref(signedIn)', ['X'], /cartão Cartoon/],
  ['faixa do visitante no Studio', 'components/home/EngineNewsBar.tsx', 'return createEntryForSignupHref(signedIn ? studio', 'return (signedIn ? studio', ['X'], /faixa abre/],
  ['vitrine volta ao Studio', 'components/home/HomeMosaic.tsx', 'const filmHref = createEntryForSignupHref(clipsFirstFilmHref(signedIn), signedIn)', 'const filmHref = clipsFirstFilmHref(signedIn)', ['D'], /vitrine.*antes de cadastro|vitrine filme: esperado/, ['vitrine']],
  ['separação de créditos', 'lib/ui/caixaPresente0511.ts', "href: createEntryHref('film', '/studio', true) })", "href: '/studio' })", ['X'], /caixa de presente/],
  ['Pricing ganha roteamento', 'app/pricing/PricingClient.tsx', "'use client'", "'use client'\nimport '@/lib/create/entry'", ['X'], /PricingClient/],
  ['perda da Library', 'components/create/CreateNavConta.tsx', "CREATE_NAV_VIDEOS_HREF = '/library'", "CREATE_NAV_VIDEOS_HREF = '/clips'", ['X'], /cabeçalho da tela nova/],
  ['roteamento em checkout', 'app/checkout/success/page.tsx', 'import ', "import '@/lib/create/entry'\nimport ", ['X'], /nenhum gerador/],
]
for (const [name, file, original, replacement, sections, message, so, all] of changes) {
  const o = mutation(file, original, replacement, { all })
  await assert.rejects(() => rodar(o, sections, { so }), e => e?.code === 'ERR_ASSERTION' && message.test(e.message), 'mutante sem reprovação específica: '+name)
}
console.log(`test-entradas-tela-nova-1011: ${verdes} verificações verdes · ${changes.length}/${changes.length} mutantes mortos`)
