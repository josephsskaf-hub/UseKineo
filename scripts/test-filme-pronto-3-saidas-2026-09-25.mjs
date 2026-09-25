// KINEO-FLUXO-NOVO-2026-09-25 — guardião da Peça A (fundador, 25/09): "filme pronto com 3 saídas: próximo filme ·
// mais créditos (barra 50-2.000) · assinar". Prova por COMPORTAMENTO, amarrado à variável que decide:
//   (a) a barra de créditos abre SÓ para quem o checkout aceita (canPurchaseCreditTopup, a mesma regra da Stripe);
//   (b) "Next film" navega para /studio levando só escolhas — nunca o texto nem gatilho de disparo;
//   (c) o componente tem EXATAMENTE 3 saídas, cada clique grava a própria saída, e o modal só abre no ramo 'topup';
//   (d) nenhum preço digitado na lib nem no componente (preço congelado; a barra lê a fonte única);
//   (e) GenerateClient monta UMA vez, dentro de done-result-actions, DEPOIS do download e ANTES do <details> fechado;
//   (f) nenhum evento novo está na lista server-only do /api/events (senão seria descartado em silêncio);
//   (g) o /studio só põe o foco na caixa da ideia com ponteiro fino, sem roubar foco de outro campo, e mede a chegada.
// Cada grupo roda também contra mutantes em memória (e o guardião exige que o mutante TENHA aplicado).
// Roda: node scripts/test-filme-pronto-3-saidas-2026-09-25.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

let passed = 0
const falhas = []
function ok(cond, name) {
  // Trava contra a ordem invertida (ok(nome, cond) passaria sem avaliar nada).
  if (typeof name !== 'string' || typeof cond === 'string') throw new Error('ok(cond, name) chamado com argumentos trocados: ' + String(cond))
  if (cond === true) { passed += 1; return }
  falhas.push(name)
  console.error('  ✗ ' + name)
}

function roda(src, req = {}, jsx = false) {
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: jsx ? ts.JsxEmit.ReactJSX : undefined },
    fileName: jsx ? 'x.tsx' : 'x.ts',
  }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
function semComentarios(src, tsx) {
  return ts.transpileModule(src, {
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    fileName: tsx ? 'x.tsx' : 'x.ts',
  }).outputText
}
function mutante(nome, src, de, para, provas) {
  if (src.split(de).length !== 2) { ok(false, `mutante "${nome}": âncora única encontrada`); return }
  const m = src.replace(de, para)
  ok(m.includes(para) && !src.includes(para), `mutante "${nome}" aplicou`)
  let caiu = false
  try { caiu = provas(m).some(([, c]) => c !== true) } catch { caiu = true }
  ok(caiu, `mutante "${nome}" é pego`)
}

const TOPUP = roda(rd('lib/growth/topupEligibility.ts'))
const LIB_SRC = rd('lib/growth/filmReadyExits.ts')
const COMP_SRC = rd('components/FilmReadyExits.tsx')
const GEN_SRC = rd('app/(dashboard)/generate/GenerateClient.tsx')
const STUDIO_SRC = rd('app/(dashboard)/studio/StudioClient.tsx')
const EVENTS_SRC = rd('app/api/events/route.ts')
const EVENT_NAMES = ['film_ready_exits_shown', 'film_ready_exit_clicked', 'film_ready_next_film_arrived']

const PLANOS = ['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', ' PRO ', 'Starter', 'free', 'autopilot',
  'autopilot_pilot', 'creator', 'studio', '', null, undefined, 42]

// ── (a)(b) a lib pura ───────────────────────────────────────────────────────────────────────────────────────────────
function provasLib(src) {
  const R = []
  const L = roda(src, { '@/lib/growth/topupEligibility': TOPUP })
  R.push(['(a) mais créditos = barra exatamente quando o checkout aceita (todos os planos)',
    PLANOS.every((p) => L.filmReadyCreditsExit(p) === (TOPUP.canPurchaseCreditTopup(p) ? 'topup' : 'plans'))])
  R.push(['(a) free, Autopilot e plano desconhecido (leitura falhou) vão aos planos, nunca ao 403',
    ['free', 'autopilot', null, undefined, ''].every((p) => L.filmReadyCreditsExit(p) === 'plans')])
  R.push(['(a) Starter e Studio pagantes abrem a barra', ['starter', 'pro'].every((p) => L.filmReadyCreditsExit(p) === 'topup')])
  // Delegação real: se a fonte única mudar, a saída muda junto (não há lista própria escondida na lib).
  const L2 = roda(src, { '@/lib/growth/topupEligibility': { canPurchaseCreditTopup: () => true } })
  R.push(['(a) a decisão delega à fonte única canPurchaseCreditTopup', L2.filmReadyCreditsExit('free') === 'topup'])

  // O texto do autor aqui é UMA palavra de caracteres seguros: quem decide que ele não viaja é a lista de chaves,
  // não o filtro de caracteres (com espaços o filtro o barraria e o mutante "leva o texto" passaria despercebido).
  const cheia = 'engine=seedance&prompt=SegredoDoAutor&duration=60&script_mode=verbatim&autoanalyze=1&studio=1'
    + '&intent_campaign=x&create_intent=trial_best&language=pt&aspect=16%3A9&resume=wall_v1&onboarding_goal=faceless&series=1'
  const href = L.filmReadyNextFilmHref(cheia)
  const u = new URL('https://k.invalid' + href)
  R.push(['(b) próximo filme vai para /studio (não /studio/create)', href.startsWith('/studio?') && u.pathname === '/studio'])
  R.push(['(b) leva as escolhas do filme', u.searchParams.get('engine') === 'seedance' && u.searchParams.get('duration') === '60'
    && u.searchParams.get('script_mode') === 'verbatim' && u.searchParams.get('language') === 'pt' && u.searchParams.get('aspect') === '16:9'])
  R.push(['(b) chega com focus=idea', u.searchParams.get('focus') === 'idea'])
  const proibidas = ['prompt', 'autoanalyze', 'studio', 'intent_campaign', 'create_intent', 'resume', 'onboarding_goal', 'series']
  R.push(['(b) nunca leva texto nem gatilho de disparo (prompt/studio/autoanalyze/create_intent…)', proibidas.every((k) => !u.searchParams.has(k))])
  R.push(['(b) URL vazia, nula ou não-texto → /studio?focus=idea', [ '', null, undefined, 7, {} ].every((x) => L.filmReadyNextFilmHref(x) === '/studio?focus=idea')])
  R.push(['(b) valor sujo não viaja', !L.filmReadyNextFilmHref('engine=%3Cscript%3E&duration=' + '9'.repeat(40)).includes('engine=')
    && !L.filmReadyNextFilmHref('duration=' + '9'.repeat(40)).includes('duration=')])

  R.push(['planos → /pricing#plans com a campanha da peça', L.filmReadyPlansHref() === '/pricing?intent_campaign=film_ready_v1#plans'])
  R.push(['rótulo honesto: assinante troca, não-assinante assina, leitura falhou vê planos',
    L.filmReadyPlanLabel('basic') === 'Change plan' && L.filmReadyPlanLabel('starter_trial') === 'Change plan'
    && L.filmReadyPlanLabel('free') === 'Subscribe' && L.filmReadyPlanLabel(null) === 'See plans'])
  const shown = L.filmReadyExitsShownMetadata({ videoId: 'vid-1', plan: 'free' })
  R.push(['impressão carrega versão, vídeo, saída de crédito e estado do plano',
    shown.version === 'film_ready_exits_v1' && shown.video_id === 'vid-1' && shown.credits_exit === 'plans' && shown.plan_state === 'not_subscriber'])
  const dest = (exit, plan) => L.filmReadyExitClickedMetadata({ exit, videoId: 'v', plan }).destination
  R.push(['clique carrega o destino real', dest('next_film', 'pro') === 'studio' && dest('more_credits', 'pro') === 'topup_modal'
    && dest('more_credits', 'free') === 'pricing' && dest('subscribe', 'pro') === 'pricing'])
  return R
}
for (const [n, c] of provasLib(LIB_SRC)) ok(c, n)
mutante('condição da barra vira true', LIB_SRC, "return canPurchaseCreditTopup(plan) ? 'topup' : 'plans'", "return true ? 'topup' : 'plans'", provasLib)
mutante('próximo filme leva o texto', LIB_SRC, "const NEXT_FILM_CARRY_KEYS = ['engine',", "const NEXT_FILM_CARRY_KEYS = ['prompt', 'engine',", provasLib)
mutante('próximo filme volta ao /studio/create', LIB_SRC, 'return `/studio?${out.toString()}`', 'return `/studio/create?${out.toString()}`', provasLib)

// ── (c) o componente, executado com um React de mentira (hooks gravam, cliques são chamados de verdade) ───────────────
const LIB = roda(LIB_SRC, { '@/lib/growth/topupEligibility': TOPUP })
function renderiza(src, props, topupAberto) {
  const setters = []
  const eventos = []
  const Link = function Link() {}
  const Modal = function CreditsTopupModal() {}
  const React = {
    useState: (init) => {
      const v0 = typeof init === 'function' ? init() : init
      const v = v0 === false ? topupAberto : v0
      const set = (x) => setters.push({ init: v0, x })
      return [v, set]
    },
    useRef: (v) => ({ current: v }),
    useEffect: () => {},
  }
  const jsx = (type, p, key) => ({ type, props: p ?? {}, key })
  const C = roda(src, {
    react: React,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/link': { __esModule: true, default: Link },
    '@/components/CreditsTopupModal': { __esModule: true, default: Modal },
    'react-dom': { createPortal: (el) => el }, // KINEO-FLUXO-NOVO-2026-09-25 — o modal vai por portal (revisão: transform prendia o fixed)
    '@/lib/analytics': { trackEvent: (name, meta) => { eventos.push({ name, meta }); return Promise.resolve(true) } },
    '@/lib/growth/filmReadyExits': LIB,
  }, true)
  const arvore = C.default(props)
  const todos = []
  const anda = (n) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { n.forEach(anda); return }
    todos.push(n)
    anda(n.props?.children)
  }
  anda(arvore)
  const grupo = todos.find((n) => n.props?.['data-kineo'] === 'film-ready-exits')
  const dentro = []
  const anda2 = (n) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(anda2); return } if (n !== grupo) dentro.push(n); anda2(n.props?.children) }
  if (grupo) anda2(grupo)
  return { todos, grupo, saidas: dentro.filter((n) => typeof n.props?.onClick === 'function'), setters, eventos, Link, Modal }
}
const texto = (n) => { if (n == null || typeof n === 'boolean') return ''; if (typeof n !== 'object') return String(n); if (Array.isArray(n)) return n.map(texto).join(''); return texto(n.props?.children) }
function provasComp(src) {
  const R = []
  for (const plan of ['starter', 'pro_trial', 'basic', 'free', null, 'autopilot']) {
    const r = renderiza(src, { videoId: 'vid-9', plan }, false)
    const barra = TOPUP.canPurchaseCreditTopup(plan)
    R.push([`(c) [${plan}] exatamente 3 saídas no bloco`, r.grupo !== undefined && r.saidas.length === 3])
    if (r.saidas.length !== 3) continue
    const [prox, cred, plano] = r.saidas
    R.push([`(c) [${plan}] 1ª saída = Next film, link para /studio?…focus=idea`, prox.type === r.Link
      && String(prox.props.href).startsWith('/studio?') && String(prox.props.href).includes('focus=idea') && /Next film/.test(texto(prox))])
    R.push([`(c) [${plan}] 3ª saída = planos, rótulo da lib`, plano.type === 'a' && plano.props.href === LIB.filmReadyPlansHref()
      && texto(plano) === LIB.filmReadyPlanLabel(plan)])
    R.push([`(c) [${plan}] 2ª saída é botão da barra só com recarga; senão link aos planos`, barra
      ? cred.type === 'button' && cred.props.href === undefined
      : cred.type === 'a' && cred.props.href === LIB.filmReadyPlansHref()])
    const abriu = () => r.setters.some((s) => s.init === false && s.x === true)
    prox.props.onClick({ preventDefault() {} })
    plano.props.onClick({ preventDefault() {} })
    R.push([`(c) [${plan}] próximo filme e planos nunca abrem o modal`, !abriu()])
    cred.props.onClick({ preventDefault() {} })
    R.push([`(c) [${plan}] o modal abre SE E SÓ SE a recarga é permitida`, abriu() === barra])
    const cliques = r.eventos.filter((e) => e.name === 'film_ready_exit_clicked')
    R.push([`(c) [${plan}] cada clique grava a própria saída e o destino`, cliques.length === 3
      && cliques.map((e) => e.meta.exit).join() === 'next_film,subscribe,more_credits'
      && cliques[2].meta.destination === (barra ? 'topup_modal' : 'pricing') && cliques.every((e) => e.meta.video_id === 'vid-9')])
  }
  const aberto = renderiza(src, { videoId: 'v', plan: 'starter' }, true)
  const modal = aberto.todos.find((n) => n.type === aberto.Modal)
  R.push(['(c) modal aberto = a MESMA barra (CreditsTopupModal) com surface film_ready, fora do grupo das 3 saídas',
    Boolean(modal) && modal.props.surface === 'film_ready' && typeof modal.props.onClose === 'function'
    && aberto.saidas.every((n) => n.type !== aberto.Modal)])
  R.push(['(c) modal fechado não é montado', !renderiza(src, { videoId: 'v', plan: 'starter' }, false).todos.some((n) => n.type === aberto.Modal)])
  return R
}
for (const [n, c] of provasComp(COMP_SRC)) ok(c, n)
mutante('botão abre a barra para todo mundo', COMP_SRC, "{creditsExit === 'topup' ? (", '{true ? (', provasComp)
mutante('saída de planos some', COMP_SRC, "onClick={() => track('subscribe')}", "data-x=\"1\"", provasComp)

// ── (d) nenhum preço digitado ─────────────────────────────────────────────────────────────────────────────────────────
function provasPreco(lib, comp) {
  const R = []
  for (const [nome, src, tsx] of [['lib', lib, false], ['componente', comp, true]]) {
    const code = semComentarios(src, tsx)
    R.push([`(d) ${nome}: nenhum $+dígito`, !/\$\s?\d/.test(code.replace(/\$\{/g, ''))])
    // Vírgula dentro de chaves é quantificador de regex ({1,24}), não centavos.
    R.push([`(d) ${nome}: nenhum valor com centavos`, !/\d+\.\d{2}\b/.test(code) && !/(?<!\{)\d+,\d{2}(?!\d)/.test(code)])
    R.push([`(d) ${nome}: nenhum R$`, !/R\$/.test(code)])
    R.push([`(d) ${nome}: não importa tabela de preço nem monta checkout próprio`, !/checkoutPricing|creditSlider|\/api\/stripe|credits_custom/.test(code)])
  }
  return R
}
for (const [n, c] of provasPreco(LIB_SRC, COMP_SRC)) ok(c, n)
mutante('preço digitado no botão', COMP_SRC, '          More credits\n        </button>', '          More credits $9.90\n        </button>', (m) => provasPreco(LIB_SRC, m))

// ── (e) a montagem no GenerateClient ─────────────────────────────────────────────────────────────────────────────────
function provasMontagem(src) {
  const R = []
  const ast = ts.createSourceFile('GenerateClient.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const montagens = []
  let acoes = null
  let imports = 0
  const anda = (n) => {
    if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@/components/FilmReadyExits') imports += 1
    if (ts.isJsxSelfClosingElement(n) && n.tagName.getText(ast) === 'FilmReadyExits') montagens.push(n)
    if (ts.isJsxElement(n) && !acoes && /className="done-result-actions[ "]/.test(n.openingElement.getText(ast))) acoes = n
    ts.forEachChild(n, anda)
  }
  anda(ast)
  R.push(['(e) importa o componente uma vez', imports === 1])
  R.push(['(e) monta exatamente uma vez', montagens.length === 1])
  R.push(['(e) done-result-actions encontrado', acoes !== null])
  if (montagens.length !== 1 || !acoes) return R
  const m = montagens[0]
  const attrs = m.attributes.properties.map((p) => p.getText(ast)).sort()
  R.push(['(e) só videoId={publicVideoId} e plan={commercialPlan} (nenhum on*/href novo para a trava do done-workspace)',
    attrs.join('|') === 'plan={commercialPlan}|videoId={publicVideoId}'])
  R.push(['(e) mora dentro de done-result-actions', m.getStart(ast) > acoes.getStart(ast) && m.getEnd() < acoes.getEnd()])
  const downloads = []
  let detalhes = null
  let episodio2 = null
  const dentro = (n) => {
    if (ts.isJsxAttribute(n) && n.name.getText(ast) === 'onClick' && n.initializer?.expression?.getText(ast) === 'handleDownload') downloads.push(n.getStart(ast))
    if (ts.isJsxAttribute(n) && n.name.getText(ast) === 'ref' && n.initializer?.expression?.getText(ast) === 'nextEpisodeTopBtnRef') episodio2 = n.getStart(ast)
    if (ts.isJsxElement(n) && !detalhes && n.openingElement.getText(ast).includes('className="done-result-options"')) detalhes = n
    ts.forEachChild(n, dentro)
  }
  dentro(acoes)
  const pos = m.getStart(ast)
  R.push(['(e) depois do botão de download (deliver-first)', downloads.length >= 1 && downloads.every((d) => d < pos)])
  R.push(['(e) depois da porta do episódio 2', episodio2 !== null && episodio2 < pos])
  R.push(['(e) antes do <details> fechado e fora dele', detalhes !== null && pos < detalhes.getStart(ast)])
  let pai = m.parent
  let emDetails = false
  while (pai) { if (ts.isJsxElement(pai) && pai.openingElement.tagName.getText(ast) === 'details') emDetails = true; pai = pai.parent }
  R.push(['(e) nenhum ancestral <details> (não fica escondido)', !emDetails])
  return R
}
for (const [n, c] of provasMontagem(GEN_SRC)) ok(c, n)
{
  const linha = '                <FilmReadyExits videoId={publicVideoId} plan={commercialPlan} />\n'
  const semMontagem = GEN_SRC.split(linha).length === 2 ? GEN_SRC.replace(linha, '') : null
  ok(semMontagem !== null, 'mutante "montagem acima do download": linha única encontrada')
  if (semMontagem) {
    const antes = '                {!showPostVideoExportChoice && (\n                  <a\n                    href={finalVideoUrl}\n                    onClick={handleDownload}'
    mutante('montagem acima do download', semMontagem, antes, linha + antes, provasMontagem)
    mutante('montagem dentro do <details> fechado', semMontagem, '                  <summary>Sharing, publishing & more</summary>\n',
      '                  <summary>Sharing, publishing & more</summary>\n' + linha, provasMontagem)
  }
}

// ── (f) nenhum evento novo é descartado pelo /api/events ────────────────────────────────────────────────────────────
function provasEventos(src) {
  const bloco = /const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/.exec(src)
  const nomes = new Set()
  if (bloco) for (const m of bloco[1].replace(/\/\/.*$/gm, '').matchAll(/'([^']+)'|"([^"]+)"/g)) nomes.add(m[1] ?? m[2])
  return [
    ['(f) lista SERVER_ONLY_EVENTS encontrada e não vazia', nomes.size > 10],
    ...EVENT_NAMES.map((e) => [`(f) ${e} não está na lista server-only`, !nomes.has(e)]),
  ]
}
for (const [n, c] of provasEventos(EVENTS_SRC)) ok(c, n)
mutante('evento de clique vira server-only', EVENTS_SRC, 'const SERVER_ONLY_EVENTS = new Set([\n', "const SERVER_ONLY_EVENTS = new Set([\n  'film_ready_exit_clicked',\n", provasEventos)
ok(COMP_SRC.includes("trackEvent('film_ready_exits_shown'") && COMP_SRC.includes("trackEvent('film_ready_exit_clicked'")
  && STUDIO_SRC.includes("trackEvent('film_ready_next_film_arrived'"), '(f) os 3 nomes medidos são os emitidos')

// ── (g) o foco no /studio, executando o efeito real ─────────────────────────────────────────────────────────────────
function efeitoDeFoco(src) {
  const ast = ts.createSourceFile('StudioClient.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados = []
  const anda = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]
      && n.arguments[0].getText(ast).includes("'(pointer: fine)'")) achados.push(n)
    ts.forEachChild(n, anda)
  }
  anda(ast)
  return achados
}
function provasFoco(src) {
  const R = []
  const efeitos = efeitoDeFoco(src)
  R.push(['(g) um único efeito de foco com (pointer: fine)', efeitos.length === 1])
  if (efeitos.length !== 1) return R
  const [fn, deps] = efeitos[0].arguments
  R.push(['(g) roda a cada chegada (deps [searchSignature])', deps?.getText() === '[searchSignature]'])
  R.push(['(g) não mexe no texto nem navega', !/setPrompt|router\.|location\./.test(fn.getText())])
  const js = ts.transpileModule('exports.run = ' + fn.getText(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  function cena({ busca = '', fino = true, semMatchMedia = false, ativoOutro = false, serie = false, chatgpt = false }) {
    const focos = []
    const eventos = []
    const body = { tag: 'body' }
    const outro = { tag: 'input' }
    const doc = { body, activeElement: ativoOutro ? outro : body }
    const caixa = { focus(o) { focos.push(o); doc.activeElement = caixa } }
    const ctx = {
      exports: {},
      URLSearchParams,
      Boolean,
      searchSignature: busca,
      promptRef: { current: caixa },
      document: doc,
      window: {
        matchMedia: semMatchMedia ? undefined : (q) => ({ matches: q === '(pointer: fine)' ? fino : false }),
        requestAnimationFrame: (cb) => { cb(0); return 1 },
        cancelAnimationFrame: () => {},
      },
      isStudioSeriesReview: () => serie,
      isChatGptQuickstartChoice: (v) => chatgpt && v === 'upload',
      trackEvent: (name, meta) => { eventos.push({ name, meta }); return Promise.resolve(true) },
    }
    vm.runInNewContext(js, ctx)
    const limpa = ctx.exports.run()
    return { focos, eventos, limpa }
  }
  const a = cena({})
  R.push(['(g) mouse/trackpad: foco na caixa, sem rolar a página', a.focos.length === 1 && a.focos[0]?.preventScroll === true])
  R.push(['(g) chegada comum não grava evento', a.eventos.length === 0])
  R.push(['(g) efeito devolve limpeza (cancela o frame)', typeof a.limpa === 'function'])
  R.push(['(g) toque (pointer coarse): nunca foca (não abre o teclado)', cena({ fino: false }).focos.length === 0])
  R.push(['(g) sem matchMedia: não foca', cena({ semMatchMedia: true }).focos.length === 0])
  R.push(['(g) não rouba o foco de outro campo', cena({ ativoOutro: true }).focos.length === 0])
  R.push(['(g) revisão de série e atalho do ChatGPT mantêm o foco deles', cena({ serie: true }).focos.length === 0
    && cena({ busca: 'chatgpt_quickstart=upload', chatgpt: true }).focos.length === 0])
  const f = cena({ busca: 'engine=fast&focus=idea' })
  R.push(['(g) chegada do filme pronto grava film_ready_next_film_arrived com foco confirmado', f.focos.length === 1
    && f.eventos.length === 1 && f.eventos[0].name === 'film_ready_next_film_arrived'
    && f.eventos[0].meta.version === LIB.FILM_READY_EXITS_VERSION && f.eventos[0].meta.focused === true && f.eventos[0].meta.pointer_fine === true])
  const g = cena({ busca: 'focus=idea', fino: false })
  R.push(['(g) no celular a chegada é medida sem foco', g.focos.length === 0 && g.eventos.length === 1
    && g.eventos[0].meta.focused === false && g.eventos[0].meta.pointer_fine === false])
  return R
}
for (const [n, c] of provasFoco(STUDIO_SRC)) ok(c, n)
mutante('foco sem exigir ponteiro fino', STUDIO_SRC, 'if (ponteiroFino && caixa && livre) caixa.focus', 'if (caixa && livre) caixa.focus', provasFoco)
mutante('foco rouba outro campo', STUDIO_SRC, 'if (ponteiroFino && caixa && livre) caixa.focus', 'if (ponteiroFino && caixa) caixa.focus', provasFoco)

console.log(`test-filme-pronto-3-saidas-2026-09-25: ${passed} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
