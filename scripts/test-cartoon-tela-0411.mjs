// KINEO-MENU-ADS-NOVA-TELA-0411 · KINEO-CARTOON-TELA-0411 [fundador 05/11: "Publica ela da mesma forma na tela dos cartoons ... Não tem esses packs mais, a pessoa escolhe e vamos embora. E ainda, quando eu clico no Product Ads, ele pega a versão do layout antigo"]
// Guardião sem rede. Executa as páginas e os componentes de verdade (servidor com dublês; React de verdade no render) e reprova mutantes:
//   · o menu chega à tela nova, com qualquer conta; AI UGC Ads segue em ?entry=ugc; link antigo com parâmetro explícito cai onde sempre caiu; visitante segue pela lista exata;
//   · /kids-cartoon sem quadro de planos, sem preço e sem pack para quem não comprou; quem comprou continua vendo o canal; 1º episódio grátis só para quem pode;
//   · mesmo esqueleto do anúncio, com o personagem como estrela: formulário antes da prévia, um botão principal, opcionais fechados, preço só na linha do botão final;
//   · as regras de estilo copiadas seguem iguais às da origem.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = process.cwd()
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(path.join(ROOT, f), 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const V2 = 'app/(dashboard)/ads/v2/page.tsx', V2W = 'app/(dashboard)/ads/v2/AdsV2Workspace.tsx' /* KINEO-ADS-MOLDURA-1311 — a regra da página mora aqui */, NOVO = 'app/(dashboard)/ads/new/page.tsx', MENU = 'lib/ads/entradaDoMenu.ts'
const TPL = 'components/kidsCartoon/KidsCartoonTemplate.tsx', PAINEL = 'components/kidsCartoon/KidsVendaPanel.tsx', GRATIS = 'components/kidsCartoon/KidsEpisodioGratis.tsx', PG = 'app/(dashboard)/kids-cartoon/page.tsx', CSS = 'lib/kidsCartoon/telaCartoon.ts'

/** Carrega .ts/.tsx de verdade, com dublês para o que precisa de rede. */
function carregador({ mocks = {}, mutar = {} } = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (Object.hasOwn(mocks, nome)) return mocks[nome]
    if (nome === 'react') return React
    if (nome === '@/components/billing/BuyCreditsEntry') return { __esModule: true, default: () => null } // KINEO-ASSINANTE-COMPRA-SEMPRE-1211 — o "Buy credits" tem guardião próprio
    if (nome === '@/components/billing/SubscriberUpgradeNudge') return { __esModule: true, default: () => null } // KINEO-RECARGA-DESENHO-1211 — o aviso do assinante (react-dom/portal) tem guardião próprio; aqui só a tela do desenho
    if (nome === 'next/link') return { __esModule: true, default: ({ children, href, className }) => React.createElement('a', { href, className }, children) }
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : ['app/', 'lib/', 'components/'].some((p) => nome.startsWith(p)) ? path.join(ROOT, nome) : null
    if (!f) throw new Error('import inesperado: ' + nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx'].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    vm.runInNewContext(js, { React, exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console: { log() {}, warn() {}, error() {} }, process: { env: {} }, URL, URLSearchParams, Buffer, Promise, encodeURIComponent, JSON, Math, Date, Number, String, Array, Object, Set, Map, Error, RegExp, Boolean, Symbol, Intl }, { filename: f })
    return mod.exports
  }
  return carrega
}

// ═══ Servidor: /ads/v2 e /ads/new ═══
class Redirecionou extends Error { constructor(u) { super(u); this.para = u } }
const redirect = (u) => { throw new Redirecionou(u) }
function dublesDoAnuncio(usuario, { razao = 'internal', amostraUsada = null } = {}) {
  const admin = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { video_credits: 10 }, error: null }) }) }) }) }
  return {
    'next/navigation': { redirect },
    'next/headers': { headers: () => ({ get: () => null }), cookies: () => ({ get: () => undefined }) },
    react: React,
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: usuario } }) } }) },
    '@/lib/ads/serverAccess': { adsGate: (r) => (r === 'none' ? 'no_access' : 'ok'), loadAdsAccess: async () => ({ admin, reason: razao, ownerId: null, role: 'owner', ownerPlan: 'pro' }), adsSampleOpen: async () => true },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2VariationsAccess': { adsVariationsVisible: () => false },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
    '@/lib/ads/offer': { KINEO1_35S_CREDITS: 5 },
    '@/lib/ads/access': { isAdsInternalEmail: (e) => e === 'casa@example.org' },
    '@/lib/ads/producao': { PRODUCAO_PUBLIC: false, producaoVisibleFor: () => false },
    '@/lib/ads/workspace': { loadAdsWorkspaceLabel: async () => null },
    '@/lib/ads/team': { isTeamOwnerPlan: () => false },
    '@/lib/businessPlan': { businessAdsOffer: () => null },
    '@/components/ads/AdsPresenterAllProvider': {},
    '@/components/ads/AdsPresenterPicker': { AdsPresenterAllProvider: ({ children }) => children },
    './AdsV2Client': { __esModule: true, default: function AdsV2Client() { return null } },
    './AdsWizardClient': { __esModule: true, default: function AdsWizardClient() { return null } },
    '@/lib/ads/cena/catalog': { cenaEnabled: () => true },
    '@/lib/ads/cena/escolhaSamplePolicy': { ADS_ESCOLHA_SAMPLE_LIVE: true },
    '@/lib/ads/cena/escolhaPersonalAccess': { isEscolhaPersonalOrder: async (_a, _u, pedido) => amostraUsada !== null && pedido === amostraUsada },
    '@/lib/ads/v2Contract': { isUuid: (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) },
    '@/lib/freeFilmPolicy': { paisDoRequest: () => 'US' },
    '@/lib/ads/eligibility': { loadAdsEligibility: async () => (amostraUsada ? { state: 'free_sample_used', reason: null, sampleOrderId: amostraUsada, resetAt: null, country: 'US' } : { state: razao === 'none' ? 'free_sample_available' : 'paid', reason: null, sampleOrderId: null, resetAt: null, country: 'US' }) },
    '@/components/ads/AdsEligibilityNotice': { __esModule: true, default: () => null },
    '@/lib/ads/v2Tiers': { ADS_V2_PUBLIC: true, adsV2Credits: () => 41 },
    '@/lib/ads/bfCampaign': { bfCampaignFromQuery: (q) => (q.get('bf_template') ? { id: q.get('bf_template'), lang: 'en' } : null) },
    '@/lib/ads/autoBrief': { adsAutoVisible: () => true },
    '@/lib/growth/checkoutAuthSessionBridge': { EVENT_SESSION_COOKIE: 'x', normalizeEventSessionId: () => null },
  }
}
let eventos = []
/** Roda a página e devolve { para } (redirect) ou { cliente: props do AdsV2Client }. */
async function abrirV2(usuario, q, op = {}, mutar = {}) {
  eventos = []
  const pag = carregador({ mocks: dublesDoAnuncio(usuario, op), mutar })(V2).default
  try {
    let el = await pag({ searchParams: q })
    if (el?.type?.name === 'AdsV2Workspace') el = await el.type(el.props) // KINEO-ADS-MOLDURA-1311 — a página entrega o Workspace; a prova roda os dois, como o servidor
    const achar = (n) => { if (!n || typeof n !== 'object') return null; if (n.type?.name === 'AdsV2Client') return n.props; const f = n.props?.children; for (const c of Array.isArray(f) ? f : [f]) { const a = achar(c); if (a) return a } return null }
    return { cliente: achar(el) }
  } catch (e) { if (e instanceof Redirecionou) return { para: e.para }; throw e }
}
async function abrirNovo(usuario, q, mutar = {}) {
  const pag = carregador({ mocks: dublesDoAnuncio(usuario), mutar })(NOVO).default
  try { const el = await pag({ searchParams: q }); return { tela: el } } catch (e) { if (e instanceof Redirecionou) return { para: e.para }; throw e }
}
const CASA = { id: 'c', email: 'casa@example.org' }, CLIENTE = { id: 'u', email: 'cliente@example.org' }
const ORDEM = '00000000-0000-4000-8000-000000000002'

async function provaDoMenu(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  for (const [conta, op] of [[CASA, { razao: 'internal' }], [CLIENTE, { razao: 'subscription' }], [CLIENTE, { razao: 'none' }]]) {
    const r = await abrirV2(conta, {}, op, mutar)
    exige(r.cliente?.entry === 'product', `/ads/v2 sem nada abre a tela nova (${conta.email}, ${op.razao})`)
    exige((await abrirV2(conta, { utm_source: 'studio' }, op, mutar)).cliente?.entry === 'product', 'só utm também abre a tela nova')
    exige((await abrirV2(conta, { entry: 'ugc' }, op, mutar)).cliente?.entry === 'ugc', 'AI UGC Ads continua em ugc')
    exige((await abrirV2(conta, { entry: 'errado' }, op, mutar)).cliente?.entry === 'product', 'entrada inválida cai no produto')
    for (const q of [{ mode: 'batch' }, { mode: 'full' }, { mode: 'simple' }, { order: ORDEM }, { group: 'g' }, { bf_template: 't', bf_lang: 'en' }, { sample_probe: '1' }]) {
      exige((await abrirV2(conta, q, op, mutar)).cliente?.entry === null, `link explícito segue na tela de antes: ${JSON.stringify(q)}`)
    }
  }
  // visitante: lista exata e login com volta
  const nada = await abrirV2(null, {}, {}, mutar)
  exige(nada.para === `/login?redirect=${encodeURIComponent('/ads/v2')}`, 'visitante em /ads/v2 vai ao login com volta')
  exige((await abrirV2(null, { utm_source: 'home_card' }, {}, mutar)).para?.startsWith('/login'), 'visitante sem entrada não abre a tela, mesmo vindo do cartão')
  exige((await abrirV2(null, { entry: 'errado', utm_source: 'home_card' }, {}, mutar)).para?.startsWith('/login'), 'visitante com entrada inválida vai ao login')
  const cartao = await abrirV2(null, { entry: 'product', utm_source: 'home_card' }, {}, mutar)
  exige(cartao.cliente?.guest === true && cartao.cliente?.entry === 'product', 'visitante pelo cartão da home abre a tela')
  exige((await abrirV2(null, { order: ORDEM }, {}, mutar)).para === `/login?redirect=${encodeURIComponent('/ads/v2?order=' + ORDEM)}`, 'pedido salvo volta ao mesmo pedido depois do login')
  // quem já usou a amostra: mesmo destino do cartão
  const usada = await abrirV2(CLIENTE, {}, { razao: 'none', amostraUsada: ORDEM }, mutar)
  exige(usada.para === `/ads/v2?order=${ORDEM}&entry=product`, 'amostra usada pelo menu = mesmo destino do cartão')
  // medição: o menu não vira "veio do cartão"
  await abrirV2(CLIENTE, {}, { razao: 'none' }, mutar)
  exige(eventos.some((x) => x.name === 'ads_door_state') && eventos.every((x) => !('entry' in (x.metadata ?? {}))), 'o evento não conta o menu como entrada de cartão')
  // /ads/new
  exige((await abrirNovo(CLIENTE, {}, mutar)).para === '/ads/v2', '/ads/new com conta vai a /ads/v2')
  exige((await abrirNovo(CLIENTE, { utm_source: 'studio_door' }, mutar)).para === '/ads/v2?utm_source=studio_door', '/ads/new leva a origem')
  exige((await abrirNovo(null, {}, mutar)).para === '/ads', '/ads/new sem conta vai à porta pública')
  exige((await abrirNovo(CLIENTE, { classic: '1' }, mutar)).para === '/ads/v2', 'clássico de cliente cai na tela de sempre')
  exige(!!(await abrirNovo(CASA, { classic: '1' }, mutar)).tela, 'assistente antigo segue no endereço exato da casa')
  return e
}

console.log('1. o menu e os links')
{
  const erros = await provaDoMenu()
  checa(`a página de verdade decide certo em todos os caminhos (${erros.join('; ') || 'ok'})`, erros.length === 0)
  const nav = ler('lib/ui/workspaceNavigation.ts'), mob = ler('components/MobileNav.tsx'), topo = ler('app/KineoLanding.tsx'), ugc = ler('lib/ui/menuUgc2010.ts')
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o destino ANTIGO dos três segue /ads/new; o link passa
  // pela entrada única (lib/create/entry.ts: a aba Ads da tela nova, cujo "Make your ad" entrega ao /ads/new; 'off' = /ads/new direto).
  checa('barra lateral, celular e topo levam a /ads/new, que redireciona a /ads/v2', nav.includes("{ href: '/ads/new', label: 'Product ads'") && mob.includes("href: '/ads/new'") && mob.includes('href={createEntryForLegacyHref(href, isLoggedIn === true)}') && ler('components/Sidebar.tsx').includes('href={createEntryForLegacyHref(href, signedIn)}') && (topo.match(/href=\{createEntryHref\('ads', '\/ads\/new', isSignedIn\)\}/g) ?? []).length === 2 && !/href="\/ads\/new"/.test(topo))
  checa('AI UGC Ads continua levando à página de UGC', ugc.includes('UGC_PILLAR_PATH') && ler('components/NavUgcAdsLink.tsx').includes('menuUgcHref'))
  const cli = ler('app/(dashboard)/ads/v2/AdsV2Client.tsx')
  checa('com a entrada ligada, cabeçalho novo e sem as abas (o que o print 278 mostra)', cli.includes('{mode && !n9Head && advancedModes ? <AdsFlowTabs') && cli.includes("<h1>{n9Head ? n9Head.title : shell.title}</h1>"))
  checa('?mode= continua sendo lido pela tela', cli.includes(".get('mode') === 'full'") && cli.includes(".get('mode') === 'batch'"))
}

// ═══ Tela do desenho ═══
const CHAR = 0, IDEIA = 1, STAGE = 5, SCRIPT = 8
function dublesDoDesenho(useState) {
  return {
    react: { ...React, useState },
    '@/components/InterfaceLanguage': { useInterfaceLanguage: () => 'en', UiLabel: ({ children }) => children },
    '@/lib/analytics': { trackEvent: async () => true },
    '@/components/premiere/Premiere': { PremiereResult: () => null, PremiereStage: () => React.createElement('div', { 'data-premiere': '1' }), usePremiereBeacon: () => {} },
    '@/components/kidsCartoon/KidsEpisodioGratis': { __esModule: true, default: () => React.createElement('span', { 'data-kineo': 'kids-episodio-gratis' }), KIDS_VENDA_MUDOU: 'x' },
    '@/lib/growth/visitanteEscreveAntes': { cadastroComVolta: () => '/signup' },
    '@/lib/ads/rascunhoDoVisitante': { guardarRascunhoDoDesenho() {}, lerRascunhoDoDesenho: () => null },
  }
}
function desenharTela({ over = {}, props = {}, mutar = {} } = {}) {
  let i = 0
  const useState = (ini) => { const n = i++; return React.useState(n in over ? over[n] : ini) }
  const T = carregador({ mocks: dublesDoDesenho(useState), mutar })(TPL).default
  i = 0
  return renderToStaticMarkup(React.createElement(T, props))
}
function desenharPainel(status, { busca = '', mutar = {} } = {}) {
  let i = 0
  const useState = (ini) => { const n = i++; return React.useState(n === 0 ? status : n === 1 && busca ? { ok: true, text: busca } : ini) }
  const P = carregador({ mocks: dublesDoDesenho(useState), mutar })(PAINEL).default
  i = 0
  return renderToStaticMarkup(React.createElement(P))
}
const semEstilo = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '')
const PEDIDO_CANAL = { id: 'o1', kind: 'autopilot', status: 'active', character: 'leo', language: 'en', theme: 'bedtime', total: 30, delivered: 1, inFlight: 0, cycleEnd: null, nextRunAt: '2026-11-06T12:00:00Z', createdAt: '2026-11-01', videos: [{ runId: 'r1', seq: 1, title: 'Leo and the mitten', caption: 'c', hashtags: [], videoId: 'v', videoUrl: 'https://offline.invalid/v.mp4', posterUrl: null, deliveredAt: null }] }
const PEDIDO_PACK = { ...PEDIDO_CANAL, id: 'o2', kind: 'pack' }
const ST = (orders) => ({ ready: true, open: true, sample: { eligible: orders.length === 0 }, orders })
const SEM_PRECO = /US\$|\$\s?\d|\/month|\bonce\b|Pack of 30|Channel on autopilot|\d+\s*credits?/i

function provaDaTela(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const h = semEstilo(desenharTela({ mutar }))
  // o esqueleto do anúncio
  for (const [c, m] of [['class="stu adsw adv2 kps-page adv2q kkc"', 'as classes de página do anúncio'], ['class="adsw-header adv2-head"', 'o cabeçalho do anúncio'], ['class="kps-grid"', 'a grade'], ['class="kps-panel"', 'o painel'], ['class="ace-stage"', 'a prévia'], ['class="ace-card"', 'o cartão']]) exige(h.includes(c), m)
  exige(!h.includes('<main'), 'sem <main> dentro do <main> do painel')
  // ordem: formulário antes da prévia; personagem é o primeiro campo; botão depois dos opcionais
  const pos = (s) => h.indexOf(s)
  exige(pos('data-kineo="kids-personagem"') > 0 && pos('data-kineo="kids-personagem"') < pos('data-kineo="kids-ideia"') && pos('data-kineo="kids-ideia"') < pos('data-kineo="kids-mais-opcoes"') && pos('data-kineo="kids-mais-opcoes"') < pos('data-kineo="kids-botao"') && pos('data-kineo="kids-botao"') < pos('data-kineo="kids-previa"'), 'ordem: personagem, ideia, mais opções, botão, prévia')
  // o personagem é a estrela
  const nomes = (h.match(/data-kids-character="/g) ?? []).length
  exige(nomes === 9 && (h.match(/class="kkc-face"/g) ?? []).length === 9, 'os 9 personagens com retrato')
  exige(/name="kkc-character"/.test(h), 'personagem é escolha única')
  const css = ler(CSS)
  exige(/\.kkc \.ace-faces\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/.test(css) && /\.kkc \.ace-radio img\{aspect-ratio:1\/1/.test(css), 'retratos grandes: 5 por linha, quadrados, maiores que os 6 pequenos do anúncio')
  // um botão principal
  exige((h.match(/kkc-go/g) ?? []).length === 1, 'um botão principal só')
  // opcionais fechados
  const mais = h.slice(pos('data-kineo="kids-mais-opcoes"') - 40, pos('data-kineo="kids-botao"'))
  exige(/<details[^>]*data-kineo="kids-mais-opcoes"/.test(h) && !/<details[^>]*data-kineo="kids-mais-opcoes"[^>]*open/.test(h), 'mais opções fechado')
  exige(mais.includes('Narration language') && mais.includes('Length'), 'língua e duração moram em mais opções')
  // sem preço, sem pack
  exige(!SEM_PRECO.test(h.replace(/<span[^>]*credits[^>]*>/g, '')), 'o formulário não mostra preço, pack nem plano')
  exige(!/id="plans"|data-kids-venda="plans"|kids-cta-pack|kids-cta-autopilot|\/api\/stripe\/checkout/.test(h), 'sem quadro de planos nem link de compra')
  // texto verdadeiro
  exige(/narrated 3D cartoon with captions/.test(h), 'a promessa de sempre: desenho 3D narrado com legenda')
  // prévia honesta, muda com a escolha
  const previa = (x) => x.slice(x.indexOf('data-kineo="kids-previa"'))
  exige(previa(h).includes('/kids-cartoon/leo.webp') && previa(h).includes('Illustrative'), 'prévia: retrato escolhido com o rótulo Illustrative')
  const mia = semEstilo(desenharTela({ over: { [CHAR]: 'mia' }, mutar }))
  exige(previa(mia).includes('/kids-cartoon/mia.webp') && !previa(mia).includes('/kids-cartoon/leo.webp') && previa(mia).includes('Mia'), 'a prévia muda com a escolha')
  // KINEO-CARTOON-SO-PLANO-0411 — sem episódio grátis novo; era: quem tem conta via o botão
  exige(!h.includes('data-kineo="kids-episodio-gratis"'), 'o episódio grátis saiu da tela')
  const visitante = semEstilo(desenharTela({ props: { visitante: true }, mutar }))
  exige(!visitante.includes('kids-episodio-gratis') && visitante.includes('class="kps-grid"'), 'visitante vê a mesma tela, sem pedir à API')
  // a linha do botão final ainda diz o preço
  const rev = semEstilo(desenharTela({ over: { [STAGE]: 'review', [SCRIPT]: 'Leo finds a mitten.' }, mutar }))
  exige(/class="kkc-cost"[^>]*>.*?\d+\s*credits?/.test(rev) && (rev.match(/kkc-cost/g) ?? []).length === 1, 'na revisão, uma linha de custo no botão final')
  exige(!rev.includes('data-kineo="kids-mais-opcoes"') && rev.includes('data-kids-story="1"'), 'na revisão, só a história e o botão')
  // o filme em andamento segue na tela
  const clips = semEstilo(desenharTela({ over: { [STAGE]: 'clips', [SCRIPT]: 'x' }, mutar }))
  exige(clips.includes('data-premiere') && clips.includes('data-kids-render="clips"') && clips.includes('class="ace-stage"'), 'o filme em andamento segue na sala de estreia, dentro da mesma grade')
  // o painel
  exige(desenharPainel(ST([]), { mutar }) === '', 'quem não comprou: o painel não mostra nada')
  const canal = semEstilo(desenharPainel(ST([PEDIDO_CANAL]), { mutar }))
  exige(canal.includes('My episodes') && canal.includes('Channel on autopilot') && canal.includes('1 of 30 delivered') && canal.includes('Next episode'), 'quem assina o canal continua vendo o estado do canal')
  exige(!/id="plans"|data-kids-venda="plans"|kids-cta|\$\s?\d|\/api\/stripe\/checkout/.test(canal), 'sem oferta para quem já comprou')
  const pack = semEstilo(desenharPainel(ST([PEDIDO_PACK]), { mutar }))
  exige(pack.includes('Pack of 30') && pack.includes('Download') , 'quem comprou o pack continua baixando')
  exige(semEstilo(desenharPainel(ST([]), { busca: 'Payment received', mutar })).includes('Payment received'), 'o aviso de volta do checkout continua')
  exige(desenharPainel({ ready: true, open: false, sample: { eligible: false }, orders: [PEDIDO_CANAL] }, { mutar }) === '', 'venda fechada para a conta: o painel não existe')
  return e
}

console.log('2. a tela do desenho')
{
  const erros = provaDaTela()
  checa(`a tela de verdade (${erros.join('; ') || 'ok'})`, erros.length === 0)
  const pg = ler(PG)
  checa('a página: visitante sem painel, com conta os episódios dentro da página', pg.includes('return <KidsCartoonTemplate visitante />') && pg.includes('<KidsCartoonTemplate episodios={<KidsVendaPanel />} />'))
  const pai = ler(PAINEL)
  checa('o painel não importa mais o caminho de compra', !/kidsCheckoutHref|kidsVendaCardText|kids_checkout_click/.test(pai))
  const gr = ler(GRATIS)
  checa('o episódio grátis pergunta ao servidor e só aparece para quem pode', gr.includes("fetch('/api/kids-venda/status'") && gr.includes('d?.sample?.eligible === true') && gr.includes("fetch('/api/kids-venda/sample'") && gr.includes('if (!pode && !msg) return null'))
  checa('rotas de compra, webhook e entrega seguem de pé', ['lib/stripe/kidsVendaCheckout.ts', 'lib/kidsVenda/webhook.ts', 'lib/kidsVenda/cron.ts', 'app/api/kids-venda/status/route.ts', 'app/api/kids-venda/sample/route.ts'].every((f) => fs.existsSync(path.join(ROOT, f))) && ler('app/api/stripe/checkout/route.ts').includes('buildKidsVendaAndRedirect') && ler('lib/kidsVenda/kidsVenda.ts').includes('export function kidsCheckoutHref'))
  // regras copiadas iguais à origem
  const M = carregador()(CSS)
  const escolha = ler('app/(dashboard)/ads/v2/AdsV2Escolha.tsx'), cliente = ler('app/(dashboard)/ads/v2/AdsV2Client.tsx')
  const diferentes = M.REGRAS_DO_ANUNCIO.filter((r) => !escolha.includes(r)).concat(M.REGRAS_DO_CABECALHO.filter((r) => !cliente.includes(r)))
  checa(`as ${M.REGRAS_DO_ANUNCIO.length + M.REGRAS_DO_CABECALHO.length} regras copiadas seguem iguais à origem (${diferentes.map((x) => x.slice(0, 40)).join(' | ') || 'ok'})`, diferentes.length === 0)
  checa('nenhuma regra da tela usa :has()', !M.KIDS_TELA_CSS.includes(':has('))
  const cop = (l) => M.kidsTelaCopy(l)
  checa('os textos da tela: en, pt, es; o resto em inglês', cop('pt').illustrative === 'Ilustrativo' && cop('es').more === 'Más opciones' && cop('de') === cop('en'))
}

console.log('3. mutantes')
const MUTANTES = [
  // menu
  ['a página volta a mandar a entrada crua', V2W, (t) => t.replace('entry={entryDaTela} escolhaInternal', 'entry={entry} escolhaInternal'), provaDoMenu, /tela nova/],
  ['o padrão vira ugc', MENU, (t) => t.replace("? null : 'product'", "? null : 'ugc'"), provaDoMenu, /tela nova/],
  ['link ?mode=batch perde a tela de antes', MENU, (t) => t.replace("['mode', 'order'", "['order'"), provaDoMenu, /link explícito/],
  ['pedido salvo perde a tela de antes', MENU, (t) => t.replace("'mode', 'order', 'group'", "'mode', 'group'"), provaDoMenu, /link explícito/],
  ['visitante recebe a entrada padrão', V2W, (t) => t.replace("anuncioAbreSemConta(entry, Array.isArray(rawOrigem)", "anuncioAbreSemConta(entradaDaTela(entry, searchParams), Array.isArray(rawOrigem)"), provaDoMenu, /visitante sem entrada/],
  ['login perde a volta', V2W, (t) => t.replace('redirect(`/login?redirect=${encodeURIComponent(loginTarget)}`)', "redirect('/login')"), provaDoMenu, /login com volta/],
  ['evento conta o menu como cartão', V2W, (t) => t.replace("resume: personalResume, ...(entry ? { entry } : {})", "resume: personalResume, ...(entryDaTela ? { entry: entryDaTela } : {})"), provaDoMenu, /não conta o menu/],
  // tela
  ['quadro de planos de volta no painel', PAINEL, (t) => t.replace('if (liveOrders.length === 0 && !msg) return null', '').replace('{msg ? <p', '<section id="plans" data-kids-venda="plans"><a data-kineo="kids-cta-pack" href="/api/stripe/checkout?pack=kids_pack">Buy the pack — US$49</a></section>{msg ? <p'), provaDaTela, /painel não mostra nada|sem oferta/],
  ['painel vazio aparece para quem não comprou', PAINEL, (t) => t.replace('if (liveOrders.length === 0 && !msg) return null', ''), provaDaTela, /painel não mostra nada/],
  ['quem comprou perde o canal', PAINEL, (t) => t.replace('{liveOrders.length > 0 ? (', '{false ? ('), provaDaTela, /estado do canal/],
  ['preço de volta na duração', TPL, (t) => t.replace('{d} s</button>', '{kidsDurationChip(ui, d, kidsCartoonCost(d))}</button>'), provaDaTela, /não mostra preço/],
  ['dois botões principais', TPL, (t) => t.replace('<div className="ace-actions" data-kineo="kids-botao">', '<div className="ace-actions" data-kineo="kids-botao"><button type="button" className="kkc-go">x</button>'), provaDaTela, /um botão principal/],
  ['mais opções aberto', TPL, (t) => t.replace('<details className="ace-more" data-kineo="kids-mais-opcoes">', '<details className="ace-more" data-kineo="kids-mais-opcoes" open>'), provaDaTela, /mais opções fechado/],
  ['prévia sem o rótulo', TPL, (t) => t.replace('<span className="ace-stage-label">{tela.illustrative}</span>', ''), provaDaTela, /rótulo Illustrative/],
  ['prévia parada no Leo', TPL, (t) => t.replace('<img className="ace-stage-portrait" src={char.portrait}', '<img className="ace-stage-portrait" src="/kids-cartoon/leo.webp"'), provaDaTela, /muda com a escolha/],
  ['prévia antes do formulário', TPL, (t) => { const a = t.indexOf('      <div className="adv2s-slot">'), b = t.indexOf('      </div>\n    </div>\n  )', a); const bloco = t.slice(a, b); return t.slice(0, a) + t.slice(b).replace('', '') && t.replace(bloco, '').replace('      <div className="kps-panel">', bloco + '      <div className="kps-panel">') }, provaDaTela, /ordem/],
  ['personagem depois da ideia', TPL, (t) => { const a = t.indexOf('          <section className="ace-card" aria-label={t.character}'), b = t.indexOf('          <section className="ace-card" aria-label={t.idea}'), c = t.indexOf('          {/* KINEO-CARTOON-TELA-0411 — os opcionais'); return t.slice(0, a) + t.slice(b, c) + t.slice(a, b) + t.slice(c) }, provaDaTela, /ordem/],
  ['personagem sem retrato', TPL, (t) => t.replace('<span className="kkc-face" aria-hidden="true">{c.portrait ? <img src={c.portrait} alt="" /> : c.name.slice(0, 1)}</span>', ''), provaDaTela, /com retrato/],
  ['custo some do botão final', TPL, (t) => t.replace('<p className="kkc-cost" data-enough={String(costLine.enough)}><i aria-hidden="true" />{costLine.text}</p>', ''), provaDaTela, /linha de custo/],
  ['o episódio grátis volta à tela', TPL, (t) => t.replace('{KIDS_EPISODIO_GRATIS_LIVE && !visitante ? <KidsEpisodioGratis', '{true ? <KidsEpisodioGratis'), provaDaTela, /episódio grátis saiu|visitante vê/],
  ['um <main> dentro do outro', TPL, (t) => t.replace('<div className="stu adsw adv2 kps-page adv2q kkc"', '<main className="stu adsw adv2 kps-page adv2q kkc"').replace('      </div>\n    </div>\n  )\n}', '      </div>\n    </main>\n  )\n}'), provaDaTela, /<main/],
]
for (const [nome, arq, muta, prova, esperado] of MUTANTES) {
  const original = ler(arq)
  const mudou = muta(original) !== original
  let r = []
  try { r = await prova({ [arq]: muta }) } catch (e) { r = ['estourou: ' + e.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 260))
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => esperado.test(m)))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
