// KINEO-KIDS-SEM-OFERTA-0411 [fundador 05/11: "Não tem esses packs mais, a pessoa escolhe e vamos embora"]
// Guardião sem rede, com mutantes. Executa o cartão, as duas páginas públicas e o e-mail do cron de verdade:
//   · desligado: cartão vazio, páginas sem preço nem pack, com o caminho para /kids-cartoon; e-mail sem convite, mas o episódio ainda é avisado;
//   · ligado: tudo volta, o que prova que o interruptor único está ligado aos três lugares;
//   · checkout, webhook, rotas de status e amostra, e os passes de entrega não leem o interruptor.
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

const CHAVE = 'lib/kidsVenda/ofertaKids.ts', CARDS = 'components/kidsCartoon/KidsVendaCards.tsx', PAGINAS = 'components/kidsCartoon/KidsCartoonPages.tsx', CRON = 'lib/kidsVenda/cron.ts'
const LIGA = { [CHAVE]: (t) => t.replace('export const KIDS_VENDA_LIVE = false', 'export const KIDS_VENDA_LIVE = true') }

function carregador({ mocks = {}, mutar = {}, globais = {} } = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (Object.hasOwn(mocks, nome)) return mocks[nome]
    if (nome === 'react') return React
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : ['app/', 'lib/', 'components/'].some((p) => nome.startsWith(p)) ? path.join(ROOT, nome) : null
    if (!f) throw new Error('import inesperado: ' + nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx'].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    vm.runInNewContext(js, { React, exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console: { log() {}, warn() {}, error() {} }, process: { env: {} }, URL, URLSearchParams, Buffer, Promise, encodeURIComponent, JSON, Math, Date, Number, String, Array, Object, Set, Map, Error, RegExp, Boolean, Symbol, Intl, ...globais }, { filename: f })
    return mod.exports
  }
  return carrega
}
const dublesTela = {
  'next/link': { __esModule: true, default: ({ children, href, className, ...r }) => React.createElement('a', { href, className, 'data-kineo': r['data-kineo'] }, children) },
  '@/components/Footer': { __esModule: true, default: () => null },
  '@/components/ugc/UgcVideo': { __esModule: true, default: () => null },
  '@/components/ugc/UgcPages': { UGC_PAGE_CSS: '' },
  '@/lib/analytics': { trackEvent: async () => true },
  '@/lib/supabase/client': { createClient: () => ({ auth: { getSession: async () => ({ data: {} }) } }) },
}
const semEstilo = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '')
const desenharCartao = (mutar = {}) => semEstilo(renderToStaticMarkup(React.createElement(carregador({ mocks: dublesTela, mutar })(CARDS).KidsVendaCards, { lang: 'en', surface: 'page' })))
const desenharPagina = (lang, mutar = {}) => semEstilo(renderToStaticMarkup(React.createElement(carregador({ mocks: dublesTela, mutar })(PAGINAS).KidsCartoonPage, { lang })))

const OFERTA_PAGINA = /US\$|R\$|\$\s?\d|\/month|\/mês|\bpack\b|Channel on autopilot|Piloto:|Pilot:|<table/i
function provaDasPaginas(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  exige(desenharCartao(mutar) === '', 'o cartão não desenha nada')
  for (const lang of ['en', 'pt']) {
    const h = desenharPagina(lang, mutar)
    exige(!OFERTA_PAGINA.test(h), `página ${lang}: sem preço, pack nem tabela (${(h.match(OFERTA_PAGINA) ?? [''])[0]})`)
    exige(!/#plans|kids-venda-cards|kids-venda-cta/.test(h), `página ${lang}: sem o link morto`)
    exige((h.match(/href="\/[^"]*kids-cartoon[^"]*"|href="\/(signup|login)[^"]*kids-cartoon[^"]*"/g) ?? []).length >= 2 && (h.match(/data-kids-cta|class="kug-cta"/g) ?? []).length >= 2, `página ${lang}: os 2 botões seguem indo a /kids-cartoon`)
    exige(/<h1>/.test(h) && /id="kk-how"/.test(h) && /id="kk-faq"/.test(h) && /id="kk-chars"/.test(h), `página ${lang}: as seções seguem de pé`)
    const naoAberta = lang === 'pt' ? 'Os desenhos fazem parte dos planos pagos' : 'Cartoons are included in paid plans' // KINEO-CARTOON-SO-PLANO-0411 — era: "currently unavailable"
    exige(h.includes(naoAberta), `página ${lang}: a pergunta da assinatura responde que não há oferta`)
  }
  return e
}

// ═══ o e-mail do cron, de verdade ═══
function mundoDoEmail(mutar = {}) {
  const enviados = [], patches = []
  const db = {
    from: (t) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { email: 'pessoa@example.org', email_opted_out: false }, error: null }), limit: async () => ({ data: [], error: null }) }),
        in: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
      }),
      update: (p) => ({ eq: async () => { patches.push({ t, p }); return { error: null } } }),
    }),
  }
  const fetch = async (u, o) => { enviados.push(JSON.parse(o.body)); return { ok: true } }
  const dubles = {
    '@supabase/supabase-js': {},
    '@/lib/autopilot/session': { callAsUser: async () => ({}), mintUserSession: async () => null },
    '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@/lib/emailSuppression': { emailFooterText: () => '\n--', unsubscribeHeaders: () => ({}) },
    '@/lib/cinematic/claim': { cinematicClaimId: () => 'c' },
  }
  const expor = (t) => (mutar[CRON] ? mutar[CRON](t) : t) + '\nexport { sendKidsReadyEmail }\n'
  const m = carregador({ mocks: dubles, mutar: { ...mutar, [CRON]: expor }, globais: { fetch, process: { env: { RESEND_API_KEY: 'x' } }, setTimeout, clearTimeout } })(CRON)
  return { m, db, enviados, patches }
}
const RUN = { id: 'r1', seq: 3, title: 'Leo and the mitten', generation_id: 'kids-r1', email_sent_at: null }
const PEDIDO = (kind, total, seq) => ({ order: { id: 'o1', user_id: 'u', kind, language: 'en', videos_total: total }, run: { ...RUN, seq } })
const CONVITE = /Liked it\?|Channel on autopilot|pack of 30|keep the channel going|US\$|\$\s?\d/i
async function provaDoEmail(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  for (const [nome, kind, total, seq] of [['amostra grátis', 'sample', 1, 1], ['fim do pack', 'pack', 30, 30], ['meio do pack', 'pack', 30, 3], ['canal em andamento', 'autopilot', 30, 5]]) {
    const { m, db, enviados, patches } = mundoDoEmail(mutar)
    const { order, run } = PEDIDO(kind, total, seq)
    const r = await m.sendKidsReadyEmail(db, run, order, 'https://www.usekineo.com')
    exige(r === true && enviados.length === 1, `${nome}: o e-mail do episódio continua saindo`)
    const texto = enviados[0]?.text ?? ''
    exige(texto.includes('Leo and the mitten') && texto.includes('/kids-cartoon?utm_source=kids_ready#my-episodes'), `${nome}: o e-mail diz qual é o episódio e onde está`)
    exige(!CONVITE.test(texto), `${nome}: sem convite para comprar`)
    exige(patches.some((x) => x.t === 'kids_runs' && x.p.email_sent_at), `${nome}: a entrega é marcada como avisada`)
  }
  return e
}

console.log('1. o interruptor')
{
  const t = ler(CHAVE)
  const linhas = t.split('\n')
  const i = linhas.indexOf('export const KIDS_VENDA_LIVE = false')
  checa('linha simples, com comentário logo acima', i > 0 && linhas[i - 1].startsWith('//'))
  checa('o arquivo não importa nada', !/^import /m.test(t))
  const usos = ['app', 'components', 'lib'].flatMap((d) => { const o = []; const anda = (p) => { for (const n of fs.readdirSync(path.join(ROOT, p))) { const q = path.join(p, n); if (fs.statSync(path.join(ROOT, q)).isDirectory()) anda(q); else if (/\.tsx?$/.test(n) && fs.readFileSync(path.join(ROOT, q), 'utf8').includes('KIDS_VENDA_LIVE')) o.push(q.split(path.sep).join('/')) } }; anda(d); return o }).sort()
  checa(`só estes lugares leem o interruptor (${usos.join(', ')})`, JSON.stringify(usos) === JSON.stringify([CARDS, PAGINAS, CHAVE, CRON, 'app/llms.txt/route.ts'].sort()))
}

console.log('2. as páginas')
{
  const e = provaDasPaginas()
  checa(`desligado: cartão vazio, páginas limpas e com caminho (${e.join('; ') || 'ok'})`, e.length === 0)
  checa('ligado: o cartão volta', desenharCartao(LIGA).includes('kvc-cta') || desenharCartao(LIGA).includes('kids-venda-cta'))
  for (const lang of ['en', 'pt']) checa(`ligado: tabela e preço voltam na página ${lang}`, /<table/.test(desenharPagina(lang, LIGA)) && /US\$\s?29/.test(desenharPagina(lang, LIGA)))
}

console.log('3. o e-mail')
{
  const e = await provaDoEmail()
  checa(`desligado: episódio avisado, sem convite (${e.join('; ') || 'ok'})`, e.length === 0)
  const envia = async (kind, total, seq) => { const { m, db, enviados } = mundoDoEmail(LIGA); const { order, run } = PEDIDO(kind, total, seq); await m.sendKidsReadyEmail(db, run, order, 'https://x'); return enviados[0]?.text ?? '' }
  checa('ligado: o convite volta depois do grátis', /Liked it\?/.test(await envia('sample', 1, 1)))
  checa('ligado: o convite volta no fim do pack', /keep the channel going/.test(await envia('pack', 30, 30)))
  checa('ligado: o meio do pack e o canal nunca tiveram convite', !CONVITE.test(await envia('pack', 30, 3)) && !CONVITE.test(await envia('autopilot', 30, 5)))
}

console.log('4. o que não pode mudar')
{
  for (const f of ['app/api/stripe/checkout/route.ts', 'app/api/stripe/webhook/route.ts', 'lib/stripe/kidsVendaCheckout.ts', 'lib/kidsVenda/webhook.ts', 'lib/kidsVenda/server.ts', 'lib/kidsVenda/kidsVenda.ts', 'app/api/kids-venda/status/route.ts', 'app/api/kids-venda/sample/route.ts', 'app/api/cron/autopilot-generate/route.ts']) checa(`${f} não lê o interruptor`, !ler(f).includes('KIDS_VENDA_LIVE'))
  const cron = ler(CRON)
  checa('no cron, o interruptor só aparece no convite', (cron.match(/KIDS_VENDA_LIVE/g) ?? []).length === 2 && cron.includes("const offer = !KIDS_VENDA_LIVE ? ''"))
  const K = carregador()('lib/kidsVenda/kidsVenda.ts')
  checa('a venda de sempre segue aberta para quem já comprou e para o grátis', K.KIDS_SALES_LIVE === true && K.KIDS_SALES_OPEN_FOR_PUBLIC === true)
  checa('as portas de compra seguem de pé', K.kidsCheckoutHref('pack', { character: 'leo', language: 'en', theme: '' }) === '/api/stripe/checkout?pack=kids_pack&character=leo&language=en' && cron.includes('await dispatchPass(args.db') && cron.includes('await settlePass('))
}

console.log('5. mutantes')
const naoVerde = async (prova, mutar) => { try { return await prova(mutar) } catch (e) { return ['estourou: ' + e.message] } }
const MUTANTES = [
  ['o interruptor ligado', CHAVE, LIGA[CHAVE], provaDasPaginas, /cartão não desenha/],
  ['o interruptor ligado, no e-mail', CHAVE, LIGA[CHAVE], provaDoEmail, /sem convite/],
  ['o cartão ignora o interruptor', CARDS, (t) => t.replace(/  if \(!KIDS_VENDA_LIVE\) return null[^\n]*\n/, ''), provaDasPaginas, /cartão não desenha/],
  ['a tabela ignora o interruptor', PAGINAS, (t) => t.replace('{KIDS_VENDA_LIVE && KIDS_SALES_OPEN_FOR_PUBLIC ? <>', '{KIDS_SALES_OPEN_FOR_PUBLIC ? <>'), provaDasPaginas, /sem preço, pack nem tabela/],
  ['o FAQ ignora o interruptor', PAGINAS, (t) => t.replace('const salesOpen = KIDS_VENDA_LIVE && KIDS_SALES_OPEN_FOR_PUBLIC', 'const salesOpen = KIDS_SALES_OPEN_FOR_PUBLIC'), provaDasPaginas, /sem preço, pack nem tabela/],
  ['as páginas perdem o botão do fim', PAGINAS, (t) => t.replace('<KidsCtaLink className="kug-cta" campaign={campaign} placement="closing">', '<KidsCtaLink className="kug-cta-x" campaign="x" placement="closing">').replace('placement="closing">{c.cta} <span aria-hidden="true">→</span></KidsCtaLink>', 'placement="closing"></KidsCtaLink>').replace('<KidsCtaLink className="kug-cta" campaign={campaign} placement="hero">{c.cta} <span aria-hidden="true">→</span></KidsCtaLink>', ''), provaDasPaginas, /botões/],
  ['o e-mail mantém o convite do grátis', CRON, (t) => t.replace("const offer = !KIDS_VENDA_LIVE ? '' : order.kind === 'sample'", "const offer = order.kind === 'sample'"), provaDoEmail, /amostra grátis: sem convite/],
  ['o interruptor derruba o e-mail inteiro', CRON, (t) => t.replace("  if (run.email_sent_at) return false\n", "  if (run.email_sent_at || !KIDS_VENDA_LIVE) return false\n"), provaDoEmail, /canal em andamento: o e-mail do episódio/],
  ['o e-mail para de marcar a entrega', CRON, (t) => t.replace("  await patchRun(db, run.id, { email_sent_at: nowIso() })\n  await writeServerEvent({ name: KIDS_EVENTS.videoReadySent, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: order.id, seq:", "  await writeServerEvent({ name: KIDS_EVENTS.videoReadySent, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: order.id, seq:"), provaDoEmail, /marcada como avisada/],
]
for (const [nome, arq, muta, prova, esperado] of MUTANTES) {
  const original = ler(arq)
  const mudou = muta(original) !== original
  const r = await naoVerde(prova, { [arq]: muta })
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 240))
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => esperado.test(m)))
}
{
  // o passe de entrega não pode depender do interruptor: mutante de texto, conferido pelo próprio teste da seção 4
  const mut = ler(CRON).replace('const d = await dispatchPass(', 'const d = !KIDS_VENDA_LIVE ? { paused: false, dispatch: empty.dispatch } : await dispatchPass(')
  checa('mutante "o interruptor para as entregas" fica vermelho', (mut.match(/KIDS_VENDA_LIVE/g) ?? []).length !== 2)
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
