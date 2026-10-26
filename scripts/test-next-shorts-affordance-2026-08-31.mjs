// SPRINT-V1V4 #7 — "Your next 3 Shorts" deixa de ser tres caixas mudas.
//
// Por que este teste existe: em 27/08 uma biblioteca (sceneTruth) foi resumida
// ao fundador como pronta sendo codigo morto. Desde entao todo teste desta
// pista prova tambem que a peca esta LIGADA e que ela nao encosta em dinheiro.
//
// REGRA DE METODO (terceira vez que ela salva a rodada, ver diario #4 e #6):
// toda checagem de "nao menciona X" roda sobre o CODIGO com comentarios
// removidos — senao o teste reprova o proprio comentario que explica a regra.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// A contribuição de 31/08 foi substituída explicitamente em 01/09. Os seus
// controles continuam integrais nesta fixture; o produto atual roda abaixo.
const caminho = 'components/video/NextShortsSection.tsx'
const frozen = (sha) => execFileSync('git', ['show', `${sha}:${caminho}`], { cwd: raiz, encoding: 'utf8' }).replace(/\r\n/g, '\n')
const comp = frozen('a99c5ec14e12fc74a7a9aa7a35fe80328f09e0c7')
const current = readFileSync(join(raiz, caminho), 'utf8').replace(/\r\n/g, '\n') // KINEO-LEVA-REBASE-2610: I1 retains the exact approved source with canonical LF.
const caller = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')

const semComentarios = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const compCodigo = semComentarios(comp)

let ok = 0
const falhas = []
const ver = (id, cond, msg) => { if (cond) ok++; else falhas.push(`${id}: ${msg}`) }

// ---- A. a linha de acao existe e e permanente -----------------------------
ver('A1', comp.includes('Make this one'), 'card sem rotulo de acao')
ver('A2', /Make this one <span aria-hidden="true">→<\/span>/.test(comp), 'rotulo sem seta acessivel')
ver('A3', !/hover:.*Make this one/.test(comp), 'rotulo nao pode depender de hover')
// a linha de acao esta DENTRO do <button>, nao solta no card
const corpoBotao = comp.slice(comp.indexOf('<button'), comp.indexOf('</button>'))
ver('A4', corpoBotao.includes('Make this one'), 'rotulo fora do botao clicavel')
ver('A5', corpoBotao.includes('onClick'), 'botao perdeu o onClick')

// ---- B. o toque ganhou feedback proprio ------------------------------------
ver('B1', comp.includes('onTouchStart'), 'sem feedback de toque')
ver('B2', comp.includes('onTouchEnd'), 'feedback de toque nao volta ao normal')
ver('B3', comp.includes('WebkitTapHighlightColor'), 'sem realce nativo de toque')
ver('B4', comp.includes('onFocus') && comp.includes('onBlur'), 'sem estado de foco (teclado)')
ver('B5', comp.includes('onMouseEnter') && comp.includes('onMouseLeave'), 'hover do mouse foi perdido')
// a borda em repouso deixou de ser neutra: e o unico sinal no telefone
ver('B6', comp.includes("border: '1px solid rgba(41,151,255,.30)'"), 'borda de repouso ainda neutra')
ver('B7', !/borderColor = 'rgba\(255,255,255,\.10\)'/.test(comp), 'mouseleave volta para a borda neutra antiga')

// ---- C. telemetria que responde a hipotese do toque ------------------------
ver('C1', comp.includes('function ambienteDePonteiro()'), 'helper de ambiente ausente')
ver('C2', /next_shorts_shown', \{ count: list\.length, \.\.\.ambienteDePonteiro\(\) \}/.test(comp),
  'next_shorts_shown sem is_touch/viewport_w')
ver('C3', /next_shorts_picked', \{ index: i, angle: idea\.angle, \.\.\.ambienteDePonteiro\(\) \}/.test(comp),
  'next_shorts_picked sem is_touch/viewport_w')
ver('C4', comp.includes("typeof window === 'undefined'"), 'helper quebra no SSR')
ver('C5', comp.includes("typeof window.matchMedia === 'function'"), 'helper assume matchMedia')
ver('C6', /catch \{\s*return \{ is_touch: false, viewport_w: 0 \}/.test(comp), 'helper pode lancar erro')
ver('C7', comp.includes('largura > 0 && largura < 20000'), 'viewport_w sem teto de sanidade')
// nenhum dado da pessoa viaja: so booleano e numero.
// A quarta aplicacao da regra de metodo: a primeira versao desta checagem rodou
// sobre `comp` e reprovou o proprio comentario do helper, que diz "without ever
// touching user data". Proibicao SEMPRE sobre codigo sem comentario.
const inicioHelper = compCodigo.indexOf('function ambienteDePonteiro()')
const corpoHelper = compCodigo.slice(
  inicioHelper,
  compCodigo.indexOf('\n}\n', inicioHelper) + 3,
)
ver('C8', corpoHelper.length > 200, 'nao consegui isolar o corpo do helper')
ver('C9', !/(email|prompt|topic|title|hook|niche)/i.test(corpoHelper),
  'helper carrega dado da pessoa')

// ---- D. nao encosta em dinheiro (roda sobre codigo, nunca comentario) ------
for (const proibido of ['stripe', 'checkout', 'price', 'upgrade', 'plan_tier', 'credit']) {
  ver(`D_${proibido}`, !compCodigo.toLowerCase().includes(proibido),
    `o componente passou a mencionar ${proibido}`)
}

// ---- E. a peca esta LIGADA (licao do sceneTruth) --------------------------
ver('E1', caller.includes("import NextShortsSection from '@/components/video/NextShortsSection'"),
  'componente nao importado')
ver('E2', caller.includes('<NextShortsSection'), 'componente nao renderizado')
ver('E3', /<NextShortsSection[\s\S]{0,600}onPick=\{/.test(caller), 'onPick nao ligado')
ver('E4', /<NextShortsSection[\s\S]{0,600}onEvent=\{/.test(caller), 'onEvent nao ligado')
ver('E5', /phase === 'done' && finalVideoUrl && analysis \&\& \(\s*<NextShortsSection/.test(caller.replace(/\n/g, '\n')) ||
  caller.includes("{phase === 'done' && finalVideoUrl && analysis && ("), 'condicao de render mudou')

// ---- F. o contrato de falha silenciosa segue de pe ------------------------
// ATUALIZADO NA #16 (31/08). A regua do silencio MUDOU de proposito: a tela
// so fica muda quando as DUAS fontes voltam vazias (ideias do modelo E
// prateleira de temas em alta). Antes, uma chamada instavel de modelo apagava
// sozinha a superficie pos-video mais vista do produto. A assercao agora
// verifica o CONTRATO ("nao mostra erro, some quando nao tem nada a dizer"),
// nao a linha exata — mesma correcao que a #13 fez no test-expand-policy.
ver('F1', /ideas\.length === 0 && trending\.length === 0\) return null/.test(comp),
  'a tela deixou de sumir silenciosamente quando NAO ha nada a mostrar')
ver('F2', comp.includes('requestedRef'), 'guarda de uma requisicao por render sumiu')
// ATUALIZADO NA #16: o try/catch unico virou Promise.allSettled, para que a
// chamada fragil (modelo) nao derrube a confiavel (rotacao estatica). A
// garantia e a mesma — erro de rede vira lista vazia, nunca mensagem de erro
// na tela de quem acabou de gastar um credito.
ver('F3', comp.includes('Promise.allSettled') && (comp.match(/status === 'fulfilled'/g) || []).length >= 2,
  'erro de rede deixou de ser silencioso')
ver('F4', comp.includes("slice(0, 3)"), 'deixou de cortar em 3 ideias')

// ---- G. nao quebrou o layout ---------------------------------------------
ver('G1', comp.includes('grid gap-3 sm:grid-cols-3'), 'grade de 3 colunas perdida')
ver('G2', comp.includes("minHeight: 104"), 'altura minima do card perdida')
ver('G3', comp.includes("marginTop: 'auto'"), 'rodape do card nao cola embaixo')
ver('G4', comp.includes('flex flex-col'), 'card sem coluna flex (marginTop auto nao funciona)')
ver('G5', comp.includes("width: '100%'"), 'card pode encolher no grid')

// ---- H. o motivo da rodada ficou escrito no arquivo -----------------------
ver('H1', comp.includes('SPRINT-V1V4 #7'), 'sem marca da rodada')
ver('H2', comp.includes('674') && comp.includes('420'), 'sem o numero que escolheu o alvo')
ver('H3', comp.includes('2.6%'), 'sem a taxa medida')

// O contrato aprovado atual carrega o compositor, limita a três sugestões e
// mede visibilidade a 35%. Executamos o componente real com hooks/HTTP locais.
ver('I1', current === frozen('1c078ed01'), 'componente atual divergiu da base aprovada')
const ts = createRequire(join(raiz, 'package.json'))('typescript')
function world(source, ideas, reject = false) {
  const slots = [], effects = [], events = [], picks = [], requests = [], observers = [], loaded = []
  let cursor = 0
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value }] },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i] },
    useEffect(fn, deps) {
      const i = cursor++, old = slots[i]
      if (!old || deps.some((dep, j) => !Object.is(dep, old.deps[j]))) {
        slots[i] = { deps, cleanup: null }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn() })
      }
    },
    createElement(type, props, ...children) {
      if (props?.ref && typeof props.ref === 'object') props.ref.current = { nodeType: 1 }
      return { type, props: { ...props, children: children.flat(Infinity) } }
    },
  }
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = false; observers.push(this) }
    observe(element) { this.element = element }
    disconnect() { this.disconnected = true }
  }
  const module = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, React: react,
    require(id) { if (id === 'react') return react; throw new Error('unexpected import ' + id) },
    IntersectionObserver: Observer,
    fetch: async (url, options) => { requests.push({ url, options }); if (url !== '/api/next-shorts') throw new Error('network forbidden'); if (reject) throw new Error('synthetic failure'); return { json: async () => ({ ideas }) } },
  }, { filename: caminho, timeout: 5000 })
  const props = { topic: 'topic', title: 'title', niche: 'niche', hook: 'hook', onPick: idea => picks.push(idea), onEvent: (name, meta) => events.push({ name, meta }), onLoaded: count => loaded.push(count) }
  function render() { cursor = 0; const tree = module.exports.default(props); effects.splice(0).forEach(run => run()); return tree }
  return { render, events, picks, requests, observers, loaded }
}
function nodes(tree, type) {
  if (!tree || typeof tree !== 'object') return []
  return [...(tree.type === type ? [tree] : []), ...(tree.props?.children ?? []).flatMap(child => nodes(child, type))]
}
const fixture = Array.from({ length: 5 }, (_, i) => ({ title: `Episode ${i}`, prompt: `Exact prompt ${i}`, angle: `Angle ${i}` }))
async function ready(w) { w.render(); await new Promise(setImmediate); return w.render() }
const w = world(current, fixture), tree = await ready(w), buttons = nodes(tree, 'button')
ver('I2', buttons.length === 3 && w.loaded.join(',') === '3', 'lista não limitada a três ou onLoaded incorreto')
ver('I3', w.requests.length === 1 && w.requests[0].options.method === 'POST' && JSON.parse(w.requests[0].options.body).topic === 'topic', 'requisição de ideias incorreta')
ver('I4', JSON.stringify(tree).includes('Load into the composer'), 'ação permanente atual ausente')
buttons[0]?.props.onClick()
ver('I5', w.picks.length === 1 && w.picks[0].prompt === fixture[0].prompt && w.requests.length === 1, 'clique deve só carregar o prompt, sem gerar/requisitar')
ver('I6', w.events.filter(event => event.name === 'next_shorts_shown').length === 1 && w.events.some(event => event.name === 'next_shorts_picked'), 'telemetria de carga/escolha perdida')
const observer = w.observers[0]
observer?.callback([{ isIntersecting: true, intersectionRatio: 0.34 }])
ver('I7', !w.events.some(event => event.name === 'next_shorts_seen'), 'carga ou visibilidade insuficiente contou como visto')
observer?.callback([{ isIntersecting: true, intersectionRatio: 0.35 }])
observer?.callback([{ isIntersecting: true, intersectionRatio: 1 }])
ver('I8', w.events.filter(event => event.name === 'next_shorts_seen').length === 1 && observer?.disconnected && observer.options.threshold.includes(0.35), 'visibilidade deve contar uma vez a partir de35%')
ver('I9', await ready(world(current, [])) === null && await ready(world(current, fixture, true)) === null, 'lista vazia/erro deve sumir silenciosamente')
const mutant = current.replace('onPick(idea)', 'void idea')
const bad = world(mutant, fixture), badTree = await ready(bad)
nodes(badTree, 'button')[0]?.props.onClick()
ver('I10', mutant !== current && bad.picks.length === 0, 'controle não detectou remoção do carregamento do compositor')

console.log(`${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
