// KINEO-CARTOON-SO-PLANO-0411 [TRAVA 8.2 — fundador 05/11: "Sem ep grátis de cartoon, só dentro do plano com crédito (plano comprado)"]
// Guardião sem rede. Executa de verdade a regra, as rotas da história e da amostra, a tela e o e-mail do cron, e reprova mutantes.
// A rota do filme é grande demais para rodar aqui: a prova dela é a posição do bloco, a regra executada e o diff, que só acrescenta o bloco.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
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

const CHAVE = 'lib/kidsVenda/ofertaKids.ts', REGRA = 'lib/kidsVenda/planoDoDesenho.ts', FILME = 'app/api/generate-video-cinematic/route.ts', HIST = 'app/api/kids-cartoon/story/route.ts', AMOSTRA = 'app/api/kids-venda/sample/route.ts', STATUS = 'app/api/kids-venda/status/route.ts', TPL = 'components/kidsCartoon/KidsCartoonTemplate.tsx', PAGINAS = 'components/kidsCartoon/KidsCartoonPages.tsx', CRON = 'lib/kidsVenda/cron.ts', LANC = 'lib/growth/kidsLaunchEmail.ts'

function carregador({ mocks = {}, mutar = {}, globais = {} } = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (Object.hasOwn(mocks, nome)) return mocks[nome]
    if (nome === 'react') return React
    if (nome === 'node:crypto' || nome === 'crypto') return require('node:crypto')
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : ['app/', 'lib/', 'components/'].some((p) => nome.startsWith(p)) ? path.join(ROOT, nome) : null
    if (!f) throw new Error('import inesperado: ' + nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx'].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    vm.runInNewContext(js, { React, exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console: { log() {}, warn() {}, error() {} }, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x.test', SUPABASE_SERVICE_ROLE_KEY: 'k' } }, URL, URLSearchParams, Buffer, Promise, encodeURIComponent, JSON, Math, Date, Number, String, Array, Object, Set, Map, Error, RegExp, Boolean, Symbol, Intl, ...globais }, { filename: f })
    return mod.exports
  }
  return carrega
}

// ═══ o banco de mentira ═══
function banco({ plan = 'free', pedidos = [], erroPerfil = false, erroPedidos = false, pendente = false, pedidoAtivo = false } = {}) {
  const leituras = []
  const consulta = (t) => {
    leituras.push(t)
    const q = { _t: t, select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q, gte: () => q,
      limit: async () => (erroPedidos ? { data: null, error: { code: 'XX' } } : { data: pedidos, error: null }),
      maybeSingle: async () => {
        if (t === 'profiles') return erroPerfil ? { data: null, error: { code: 'XX' } } : { data: { plan }, error: null }
        if (t === 'kids_orders') return { data: pedidoAtivo ? { id: 'o', user_id: 'u', status: 'active' } : null, error: null }
        if (t === 'kids_runs') return { data: pendente ? { id: 'r', status: 'pending' } : null, error: null }
        return { data: null, error: null }
      } }
    return q
  }
  return { from: consulta, leituras }
}
const dublesRegra = (db) => ({
  '@supabase/supabase-js': { createClient: () => db },
  '@/lib/internalAccounts': { isInternalEmail: (e) => e === 'casa@example.org' || String(e).startsWith('test'), INTERNAL_EXACT_EMAILS: ['casa@example.org'] },
  '@/lib/serverEvents': { writeServerEvent: async () => true },
  '@/lib/ads/offer': { ADS_ACCESS_COLUMN: 'ads_access_until' },
  '@/lib/emailDisposable': {},
})
const ID = '00000000-0000-4000-8000-000000000009'
const regra = (db, mutar = {}) => carregador({ mocks: dublesRegra(db), mutar })(REGRA)
const pedidoFilme = (over = {}) => ({ raw: 'leo', kidsOrder: undefined, userId: 'u', email: 'gente@example.org', generationId: 'g', engine: 'seedance', duration: 15, language: 'en', ...over })

async function provaDaRegra(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const pede = async (cfg, over) => regra(banco(cfg), mutar).kidsRecusaSemPlano(pedidoFilme(over))
  // quem não pode
  for (const [nome, cfg] of [['conta free com crédito', {}], ['teste creator_trial', { plan: 'creator_trial' }], ['cortesia studio_trial', { plan: 'studio_trial' }], ['pacote avulso antigo em conta free', { plan: 'free' }], ['piloto cancelado sem plano', { pedidos: [{ kind: 'autopilot', status: 'cancelled' }] }], ['só amostra entregue', { pedidos: [{ kind: 'sample', status: 'completed' }] }], ['amostra na fila, filme sem pedido', { pedidos: [{ kind: 'sample', status: 'active' }] }]]) {
    const r = await pede(cfg)
    exige(r?.status === 402 && r.corpo.reason === 'kids_plan_required' && r.corpo.charged === false && r.corpo.upsell === 'creator' && /paid plans/.test(r.corpo.error), `conta free com crédito é recusada pelo servidor: ${nome}`)
  }
  // quem pode
  for (const plan of ['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot', 'autopilot_lite', 'business']) exige((await pede({ plan })) === null, `plano comprado passa: ${plan}`)
  for (const k of [{ kind: 'pack', status: 'active' }, { kind: 'pack', status: 'completed' }, { kind: 'autopilot', status: 'active' }, { kind: 'autopilot', status: 'paused' }]) exige((await pede({ pedidos: [k] })) === null, `quem comprou passa: ${k.kind}/${k.status}`)
  const casa = banco()
  exige((await regra(casa, mutar).kidsRecusaSemPlano(pedidoFilme({ email: 'casa@example.org' }))) === null && casa.leituras.length === 0, 'conta da casa passa sem ler nada')
  exige((await pede({}, { email: 'test123@example.org' }))?.status === 402, 'e-mail que só parece da casa (test123) é recusado')
  // pedido na fila termina
  exige((await pede({ pedidoAtivo: true, pendente: true }, { kidsOrder: ID })) === null, 'pedido em andamento ainda entrega: filme do cron com run pendente passa em conta free')
  exige((await pede({ pedidoAtivo: true, pendente: false }, { kidsOrder: ID }))?.status === 402, 'kids_order sem run pendente não abre nada')
  exige((await pede({ pedidoAtivo: false, pendente: true }, { kidsOrder: ID }))?.status === 402, 'kids_order de pedido que não está ativo não abre nada')
  exige((await regra(banco({ pedidos: [{ kind: 'sample', status: 'active' }] }), mutar).kidsAcessoAoDesenho({ userId: 'u', email: 'gente@example.org', paraHistoria: true })) === 'ok', 'pedido em andamento ainda entrega: a história do cron passa')
  // leitura que falha não libera e não manda comprar
  const semLer = await pede({ erroPerfil: true })
  exige(semLer?.status === 503 && semLer.corpo.reason === 'kids_plan_unverified' && semLer.corpo.charged === false && !semLer.corpo.upsell, 'leitura que falha: 503, nada cobrado, sem mandar comprar')
  // sem kids_cartoon: nada muda
  for (const raw of [undefined, null, '']) {
    const db = banco()
    exige((await regra(db, mutar).kidsRecusaSemPlano(pedidoFilme({ raw }))) === null && db.leituras.length === 0, 'pedido que não é desenho passa sem nenhuma leitura')
  }
  // língua
  exige(/planos pagos/.test((await pede({}, { language: 'pt' }))?.corpo?.error ?? '') && /planes de pago/.test((await pede({}, { language: 'es' }))?.corpo?.error ?? ''), 'a frase segue a língua do pedido')
  return e
}

// ═══ a rota do filme: posição e diff ═══
function provaDaRotaDoFilme(texto = ler(FILME)) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const bloco = texto.indexOf('const kidsSemPlano = await kidsRecusaSemPlano(')
  const retorno = texto.indexOf('return NextResponse.json(kidsSemPlano.corpo, { status: kidsSemPlano.status })')
  exige(bloco > 0 && retorno > bloco, 'o bloco existe na rota do filme')
  for (const [nome, marca] of [['tradução', 'assuntoTraduzidoPromessa = traduzirAssunto('], ['escritor', 'await escreverIdeiaNoServidor('], ['reserva da promo', 'await reserveKling4Promo('], ['débito', 'await debitVideoCredits('], ['claim', 'await prepareCinematicClaim('], ['fornecedor', 'await submitToFal(']]) {
    const p = texto.indexOf(marca)
    if (nome === 'claim' && p < 0) continue
    exige(p < 0 || retorno < p, `o bloco vem antes de: ${nome}`)
    exige(p >= 0 || nome === 'claim', `o marco existe: ${nome}`)
  }
  const dry = texto.indexOf("if (body.dry_run === true && !isDryRunAccount(user.email))")
  exige(dry > 0 && dry < bloco, 'o bloco vem depois do portão do dry_run')
  exige(texto.includes("raw: (body as { kids_cartoon?: unknown }).kids_cartoon"), 'o bloco olha o kids_cartoon do pedido')
  exige(!/dry_run/.test(texto.slice(bloco, retorno)), 'o bloco não muda nada por causa do dry_run')
  return e
}

// ═══ história e amostra, executadas ═══
const next = { 'next/server': { NextResponse: { json: (b, o) => ({ corpo: b, status: o?.status ?? 200 }) } } }
const req = (b) => ({ json: async () => b })
async function provaDasRotas(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  let chamouEscritor = 0
  const historia = (db, email = 'gente@example.org') => carregador({ mutar, mocks: { ...dublesRegra(db), ...next,
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u', email } } }) } }) },
    openai: { __esModule: true, default: class { constructor() { this.chat = { completions: { create: async () => { chamouEscritor++; return { choices: [{ message: { content: '' } }] } } } } } } },
    '@/lib/moderation': { moderateTopic: async () => ({ ok: true }), moderateContent: async () => ({ ok: true }), moderationRefusalMessage: () => '', moderationRefusalStatus: () => 400 },
  } })(HIST)
  let r
  try { r = await historia(banco()).POST(req({ character: 'leo', language: 'en', duration: 15, idea: 'a story', ideaId: null })) } catch (x) { e.push('história estourou: ' + x.message); r = {} }
  exige(r.status === 402 && r.corpo?.reason === 'kids_plan_required' && chamouEscritor === 0, 'história: conta free é recusada pelo servidor, sem chamar o escritor')
  // a amostra
  let gravou = 0
  const amostra = (email = 'gente@example.org') => carregador({ mutar, mocks: { ...next,
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u', email } } }) } }) },
    '@/lib/internalAccounts': { isInternalEmail: (x) => x === 'casa@example.org' },
    '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@/lib/kidsVenda/server': { createKidsOrder: async () => { gravou++; return { ok: true, orderId: 'o' } }, kidsSampleEligibility: async () => ({ ok: true }), kidsServiceClient: () => ({}) },
  } })(AMOSTRA)
  for (const email of ['gente@example.org', 'casa@example.org']) {
    const s = await amostra(email).POST(req({ character: 'leo', language: 'en', theme: '' }))
    exige(s.status === 410 && s.corpo.reason === 'free_episode_off' && s.corpo.charged === false && /Nothing was charged/.test(s.corpo.error), `amostra recusada no servidor: ${email}`)
  }
  exige(gravou === 0, 'amostra: nenhum pedido gravado')
  return e
}

// ═══ a tela ═══
const dublesTela = (useState) => ({
  react: { ...React, useState },
  'next/link': { __esModule: true, default: ({ children, href, className }) => React.createElement('a', { href, className }, children) },
  '@/components/InterfaceLanguage': { useInterfaceLanguage: () => 'en', UiLabel: ({ children }) => children },
  '@/lib/analytics': { trackEvent: async () => true },
  '@/components/premiere/Premiere': { PremiereResult: () => null, PremiereStage: () => null, usePremiereBeacon: () => {} },
  '@/components/kidsCartoon/KidsEpisodioGratis': { __esModule: true, default: () => React.createElement('span', { 'data-kineo': 'kids-episodio-gratis' }), KIDS_VENDA_MUDOU: 'x' },
  '@/lib/growth/visitanteEscreveAntes': { cadastroComVolta: () => '/signup' },
  '@/lib/ads/rascunhoDoVisitante': { guardarRascunhoDoDesenho() {}, lerRascunhoDoDesenho: () => null },
})
const STAGE = 5, SEMPLANO = 6, SCRIPT = 9
function tela({ over = {}, props = {}, mutar = {} } = {}) {
  let i = 0
  const useState = (ini) => { const n = i++; return React.useState(n in over ? over[n] : ini) }
  const T = carregador({ mocks: dublesTela(useState), mutar })(TPL).default
  i = 0
  return renderToStaticMarkup(React.createElement(T, props)).replace(/<style[\s\S]*?<\/style>/g, '')
}
const PRECO = /\d+\s*credits?|US\$|\$\s?\d/i
function provaDaTela(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const sem = tela({ over: { [SEMPLANO]: true }, mutar })
  exige(/data-kineo="kids-ver-planos"[^>]*>See plans/.test(sem), 'sem plano: o botão diz See plans')
  exige(!/Write my story/.test(sem), 'sem plano: não diz Write my story')
  exige(!/kids-ver-planos"[^>]*disabled/.test(sem), 'sem plano: o botão funciona mesmo sem ideia')
  exige(!PRECO.test(sem), 'sem plano: nenhum preço no formulário')
  exige(!/kids-episodio-gratis|First episode free|Get my free episode/.test(sem), 'sem o episódio grátis na tela')
  const com = tela({ mutar })
  exige(/Write my story/.test(com) && !/kids-ver-planos/.test(com), 'com plano: Write my story')
  exige(!/kids-episodio-gratis/.test(com), 'com plano também não há botão de episódio grátis')
  const vis = tela({ over: { [SEMPLANO]: true }, props: { visitante: true }, mutar })
  exige(/Write my story/.test(vis) && !/kids-ver-planos/.test(vis), 'visitante vai pelo cadastro primeiro')
  exige(/data-kids-character="leo"/.test(sem) && /<textarea/.test(sem), 'a tela segue aberta: personagem e ideia')
  // a linha de custo de quem tem plano
  const rev = tela({ over: { [STAGE]: 'review', [SCRIPT]: 'Leo finds a mitten.' }, mutar })
  exige(/35-second cartoon · 21 credits/.test(rev) && (rev.match(/kkc-cost/g) ?? []).length === 1, 'plano: a linha de custo segue uma só, com o preço de sempre')
  const fonte = (mutar[TPL] ?? ((t) => t))(ler(TPL))
  const ir = fonte.slice(fonte.indexOf('function irAosPlanos()'), fonte.indexOf('async function write('))
  exige(ir.includes('guardarRascunhoDoDesenho({ character, idea, ideaId, language, duration })') && ir.includes('window.location.assign(KIDS_PLANS_PATH)') && !ir.includes('fetch('), 'See plans: guarda o rascunho, vai aos planos, não começa nada')
  exige(fonte.includes("data.reason === 'kids_plan_required'"), 'a tela entende a recusa do servidor')
  exige(fonte.includes('d?.cartoon_plan === false') && fonte.includes("if (!visitante) fetch('/api/kids-venda/status'"), 'a tela pergunta ao servidor, e o visitante não pergunta')
  return e
}

// ═══ o preço ═══
function provaDoPreco() {
  const e = []
  const fonte = ler('lib/credits/engineCost.ts')
  const m = carregador()('lib/credits/engineCost.ts')
  if (m.creditCostForDuration('cinematic_ai', true, 15) !== 9) e.push('15 s deixou de custar 9 créditos')
  if (m.creditCostForDuration('cinematic_ai', true, 35) !== 21) e.push('35 s deixou de custar 21 créditos')
  if (!fonte) e.push('sem fonte')
  return e
}

// ═══ textos públicos ═══
const CLAIM = /free episode|first episode free|episódio grátis|1º episódio grátis|primeiro episódio|watermarked episode|episode free|marca d’água|a watermark|with watermark|sample limits|seis personagens|six (recurring )?characters|six fixed|currently unavailable|indisponíveis no momento/i
function provaDosTextos(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const mocks = { 'next/link': { __esModule: true, default: ({ children, href, className }) => React.createElement('a', { href, className }, children) }, '@/components/Footer': { __esModule: true, default: () => null }, '@/components/ugc/UgcVideo': { __esModule: true, default: () => null }, '@/components/ugc/UgcPages': { UGC_PAGE_CSS: '' }, '@/lib/analytics': { trackEvent: async () => true }, '@/lib/supabase/client': { createClient: () => ({ auth: { getSession: async () => ({ data: {} }) } }) } }
  const P = carregador({ mocks, mutar })(PAGINAS)
  for (const lang of ['en', 'pt']) {
    const h = renderToStaticMarkup(React.createElement(P.KidsCartoonPage, { lang })).replace(/<style[\s\S]*?<\/style>/g, '').replace(/usekineo\.com\/free[^.]*\./g, '')
    const achou = h.match(CLAIM)
    exige(!achou, `página ${lang}: sem a promessa antiga (${achou?.[0] ?? ''})`)
    exige((lang === 'pt' ? /planos pagos/ : /paid plans/).test(h), `página ${lang}: diz que faz parte dos planos pagos`)
    exige((lang === 'pt' ? /nove personagens/ : /nine characters/).test(h) && /Guilhermina/.test(h), `página ${lang}: os nove personagens`)
    const palavras = P.kidsPageCitation(lang).answer.trim().split(/\s+/).length
    exige(palavras >= 40 && palavras <= 65, `página ${lang}: resposta curta (${palavras} palavras)`)
  }
  const crypto = require('node:crypto')
  const L = carregador({ mutar, mocks: { 'node:crypto': crypto, '@/lib/emailSuppression': { emailFooterText: () => '', emailFooterHtml: () => '' }, '@/lib/internalAccounts': { isInternalEmail: () => false } } })(LANC)
  for (const lang of ['en', 'pt']) { const m = L.kidsLaunchEmail('u', lang); exige(!CLAIM.test(m.subject + m.text), `e-mail de lançamento ${lang}: sem a promessa antiga`) }
  const llmsSec = (mutar['lib/seo/paginasKidsCartoon2010.ts'] ?? ((t) => t))(ler('lib/seo/paginasKidsCartoon2010.ts'))
  exige(!CLAIM.test(llmsSec) && /one of nine fixed characters/.test(llmsSec) && /included in paid plans/.test(llmsSec), 'o trecho do /llms.txt: sem a promessa, com nove personagens e com os planos')
  exige(ler('app/llms.txt/route.ts').includes('trafego2310CartoonOffer(BASE, KIDS_VENDA_LIVE &&'), 'o /llms.txt não anuncia piloto e pack')
  const insta = ler('docs/CARTOON-INSTAGRAM-2210.md')
  exige(!/episódio grátis|amostra grátis|episode free|free watermarked/i.test(insta), 'o kit do Instagram: sem a promessa')
  return e
}

// ═══ o filme grátis segue ═══
function provaDoFilmeGratis() {
  const e = []
  const lote = ler('lib/seo/paginasLote1.ts')
  if (!lote.includes('First ${FREE_S}-second film free')) e.push('a oferta do filme grátis sumiu')
  if (!/REGION_FREE_FILM_LIVE/.test(ler(FILME)) || !/freeWeeklyAdmitted/.test(ler(FILME))) e.push('o caminho do filme grátis mudou')
  return e
}

// ═══ o e-mail do pedido em andamento ═══
async function provaDaEntrega(mutar = {}) {
  const e = []
  const enviados = []
  const db = { from: (t) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: 'p@example.org', email_opted_out: false }, error: null }), limit: async () => ({ data: [], error: null }) }), in: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }), update: () => ({ eq: async () => ({ error: null }) }) }) }
  const fetch = async (_u, o) => { enviados.push(JSON.parse(o.body)); return { ok: true } }
  const expor = (t) => (mutar[CRON] ? mutar[CRON](t) : t) + '\nexport { sendKidsReadyEmail }\n'
  const m = carregador({ mutar: { ...mutar, [CRON]: expor }, mocks: { '@supabase/supabase-js': {}, '@/lib/autopilot/session': { callAsUser: async () => ({}), mintUserSession: async () => null }, '@/lib/serverEvents': { writeServerEvent: async () => true }, '@/lib/emailSuppression': { emailFooterText: () => '', unsubscribeHeaders: () => ({}) }, '@/lib/cinematic/claim': { cinematicClaimId: () => 'c' } }, globais: { fetch, process: { env: { RESEND_API_KEY: 'x' } }, setTimeout, clearTimeout } })(CRON)
  const r = await m.sendKidsReadyEmail(db, { id: 'r', seq: 1, title: 'Leo and the mitten', generation_id: 'kids-r', email_sent_at: null }, { id: 'o', user_id: 'u', kind: 'sample', language: 'en', videos_total: 1 }, 'https://www.usekineo.com')
  if (r !== true || enviados.length !== 1 || !/Leo and the mitten/.test(enviados[0]?.text ?? '')) e.push('pedido em andamento ainda entrega: o e-mail do episódio grátis já na fila')
  const cron = (mutar[CRON] ?? ((t) => t))(ler(CRON))
  if (/KIDS_EPISODIO_GRATIS_LIVE/.test(cron)) e.push('pedido em andamento ainda entrega: o cron não lê o interruptor')
  return e
}

console.log('1. o interruptor')
{
  const t = ler(CHAVE).split('\n')
  const i = t.indexOf('export const KIDS_EPISODIO_GRATIS_LIVE = false')
  checa('linha simples, com comentário logo acima', i > 0 && t[i - 1].startsWith('//'))
}
const secao = async (nome, prova) => { console.log(nome); const r = await prova(); checa(`${nome} (${r.join('; ') || 'ok'})`, r.length === 0) }
await secao('2. quem pode', provaDaRegra)
await secao('3. a rota do filme', () => provaDaRotaDoFilme())
await secao('4. história e amostra', provaDasRotas)
await secao('5. a tela', provaDaTela)
await secao('6. o preço', provaDoPreco)
await secao('7. os textos públicos', provaDosTextos)
await secao('8. o filme grátis', provaDoFilmeGratis)
await secao('9. o pedido na fila', provaDaEntrega)

console.log('10. o diff da rota do filme só acrescenta o bloco')
{
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 })
  const dono = git('log', '-1', '--format=%H', '--grep=KINEO-CARTOON-SO-PLANO-0411', '--', FILME).trim()
  const diff = dono ? git('show', '--format=', '--unified=0', dono, '--', FILME) : git('diff', '--unified=0', 'HEAD', '--', FILME)
  const linhas = lf(diff).split('\n')
  const mais = linhas.filter((l) => l.startsWith('+') && !l.startsWith('+++')), menos = linhas.filter((l) => l.startsWith('-') && !l.startsWith('---'))
  checa(`nada removido, 4 linhas novas, todas marcadas (${mais.length} novas, ${menos.length} removidas)`, menos.length === 0 && mais.length === 4 && mais.every((l) => l.includes('KINEO-CARTOON-SO-PLANO-0411')))
  const sem = ler(FILME).split('\n').filter((l) => !l.includes('KINEO-CARTOON-SO-PLANO-0411')).join('\n')
  checa('sem as linhas marcadas, nada na rota fala de plano do desenho', !/kidsSemPlano|kidsRecusaSemPlano/.test(sem))
  checa('sem kids_cartoon, o dry_run e todo pedido comum saem do bloco por um null', /if \(kidsSemPlano\) \{/.test(ler(FILME)))
}
console.log('11. o que não pode mudar')
{
  for (const f of ['app/api/stripe/webhook/route.ts', 'lib/stripe/kidsVendaCheckout.ts', 'lib/kidsVenda/webhook.ts', 'lib/kidsVenda/cron.ts', 'lib/credits/engineCost.ts', 'lib/checkoutPricing.ts', 'app/(dashboard)/generate/GenerateClient.tsx']) checa(`${f} não lê as regras novas`, !/kidsRecusaSemPlano|kidsAcessoAoDesenho|KIDS_EPISODIO_GRATIS_LIVE/.test(ler(f)))
  const gen = ler('app/(dashboard)/generate/GenerateClient.tsx')
  checa('o /generate mostra a frase do servidor na 402 com upsell', gen.includes("setError(typeof data?.error === 'string' ? data.error : `This needs more credits.") && gen.includes("data?.upsell === 'creator' ? 'creator'"))
}

console.log('12. mutantes')
const naoVerde = async (prova, mutar) => { try { return await prova(mutar) } catch (x) { return ['estourou: ' + x.message] } }
const blocoFora = (t) => t.split('\n').filter((l) => !l.includes('kidsRecusaSemPlano(') && !l.includes('if (kidsSemPlano)')).join('\n')
const MUTANTES = [
  ['conta free com crédito passa', REGRA, (t) => t.replace("  return kidsRecusaDeAcesso(acesso, i.language)\n}", "  return null\n}"), provaDaRegra, /conta free com crédito é recusada/],
  ['*_trial conta como plano', REGRA, (t) => t.replace("return typeof plan === 'string' && ADS_SUBSCRIBER_PLANS.includes(plan.trim().toLowerCase())", "return typeof plan === 'string' && plan !== 'free'"), provaDaRegra, /teste creator_trial/],
  ['has_paid em vez do plano: qualquer conta com leitura', REGRA, (t) => t.replace("if (temPlanoComprado((perfil.data as { plan?: unknown } | null)?.plan)) return 'ok'", "if (perfil.data) return 'ok'"), provaDaRegra, /conta free com crédito é recusada/],
  ['pedido em andamento deixa de entregar', REGRA, (t) => t.replace("if (await kidsOrderAdmits({ raw: i.kidsOrder, userId: i.userId, generationId: i.generationId, engine: i.engine, duration: i.duration })) return null\n", ""), provaDaRegra, /pedido em andamento ainda entrega/],
  ['a história do cron deixa de passar', REGRA, (t) => t.replace("if (i.paraHistoria && linhas.some((o) => o.kind === 'sample' && o.status === 'active')) return 'ok'\n", ""), provaDaRegra, /a história do cron passa/],
  ['quem comprou perde o acesso', REGRA, (t) => t.replace("if (linhas.some((o) => o.kind !== 'sample' && o.status !== 'cancelled')) return 'ok'\n", ""), provaDaRegra, /quem comprou passa/],
  ['pedido cancelado abre', REGRA, (t) => t.replace("o.kind !== 'sample' && o.status !== 'cancelled'", "o.kind !== 'sample'"), provaDaRegra, /piloto cancelado/],
  ['padrão test% abre como casa', REGRA, (t) => t.replace("if (isAdsInternalEmail(i.email)) return 'ok'", "if (isAdsInternalEmail(i.email) || String(i.email).startsWith('test')) return 'ok'"), provaDaRegra, /parece da casa/],
  ['conta da casa recusada', REGRA, (t) => t.replace("if (isAdsInternalEmail(i.email)) return 'ok'", "if (false) return 'ok'"), provaDaRegra, /conta da casa/],
  ['pedido comum passa a ler o banco', REGRA, (t) => t.replace("if (i.raw === undefined || i.raw === null || i.raw === '') return null\n", ""), provaDaRegra, /que não é desenho/],
  ['leitura que falha libera', REGRA, (t) => t.replace("if (perfil.error) return 'sem_leitura'", "if (perfil.error) return 'ok'"), provaDaRegra, /leitura que falha/],
  ['história sem a guarda', HIST, (t) => t.replace(/  if \(semPlano\) \{[^\n]*\n/, ''), provaDasRotas, /história: conta free/],
  ['amostra aceita de novo', AMOSTRA, (t) => t.replace(/  if \(!KIDS_EPISODIO_GRATIS_LIVE\) \{[^\n]*\n/, ''), provaDasRotas, /amostra recusada/],
  ['interruptor do grátis ligado', CHAVE, (t) => t.replace('export const KIDS_EPISODIO_GRATIS_LIVE = false', 'export const KIDS_EPISODIO_GRATIS_LIVE = true'), provaDasRotas, /amostra recusada/],
  ['botão do grátis de volta', TPL, (t) => t.replace('{KIDS_EPISODIO_GRATIS_LIVE && !visitante ? <KidsEpisodioGratis', '{!visitante ? <KidsEpisodioGratis'), provaDaTela, /episódio grátis/],
  ['sem plano começa a história', TPL, (t) => t.replace('{semPlano && !visitante ? <button', '{false ? <button'), provaDaTela, /See plans/],
  ['visitante vai direto aos planos', TPL, (t) => t.replace('{semPlano && !visitante ? <button', '{semPlano ? <button'), provaDaTela, /visitante vai pelo cadastro/],
  ['See plans sem guardar o rascunho', TPL, (t) => t.replace("    guardarRascunhoDoDesenho({ character, idea, ideaId, language, duration })\n    void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration, surface: 'form' })", "    void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration, surface: 'form' })"), provaDaTela, /guarda o rascunho/],
  ['promessa de volta na página', PAGINAS, (t) => t.replace('Cartoons are included in paid plans and use your plan credits; the credit cost', 'Try your first episode free; the credit cost'), provaDosTextos, /sem a promessa antiga|paid plans/],
  ['"currently unavailable" de volta', PAGINAS, (t) => t.replace("'Cartoons are included in paid plans and use your plan credits. There is no separate subscription: see the plans on the pricing page. The credit cost appears before you confirm.'", "'Dedicated offers are currently unavailable.'"), provaDosTextos, /sem a promessa antiga/],
  ['seis personagens de volta', PAGINAS, (t) => t.replace('using one of nine characters', 'using one of six characters'), provaDosTextos, /sem a promessa antiga|nove personagens/],
  ['e-mail de lançamento promete de novo', LANC, (t) => t.replace('Create your cartoon channel with the same character — in paid plans', 'Create your cartoon channel — first episode free'), provaDosTextos, /e-mail de lançamento/],
  ['o cron para o que está na fila', CRON, (t) => t.replace("  if (run.email_sent_at) return false\n", "  if (run.email_sent_at || order.kind === 'sample') return false\n"), provaDaEntrega, /pedido em andamento/],
]
for (const [nome, arq, muta, prova, esperado] of MUTANTES) {
  const original = ler(arq)
  const mudou = muta(original) !== original
  const r = await naoVerde(prova, { [arq]: muta })
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 220))
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => esperado.test(m)))
}
{
  const r = provaDaRotaDoFilme(blocoFora(ler(FILME)))
  checa('mutante "a rota do filme sem o bloco" fica vermelho', r.some((m) => /o bloco existe/.test(m)))
  const texto = ler(FILME), trecho = texto.split('\n').filter((l) => l.includes('kidsRecusaSemPlano(') || l.includes('if (kidsSemPlano)')).join('\n')
  const fora = blocoFora(texto), lin = fora.indexOf('const ideiaNoEscritor = await escreverIdeiaNoServidor('), fim = fora.indexOf('\n', lin)
  const depois = fora.slice(0, fim + 1) + trecho + '\n' + fora.slice(fim + 1)
  checa('mutante "o bloco depois do escritor" fica vermelho', provaDaRotaDoFilme(depois).some((m) => /antes de: escritor/.test(m)))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
