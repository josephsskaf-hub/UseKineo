#!/usr/bin/env node
// KINEO-CAIXA-NOVA-1511 — guardião da CAIXA NOVA da aba Film (dono 15/11: "deixar um lugar mais confortável… repetir igual os líderes").
//   A · interruptor CAIXA_NOVA_RELEASE (lib/create/release.ts): 'internal' = só a allowlist exata da casa; conta de fora e visitante nunca;
//       a página só troca a casca com filmNaMoldura E caixaNovaVisivel, e a linha de sempre (3 passos) continua lá, intacta.
//   B · o gerador, o transporte e a régua de custo batem byte a byte com as referências imutáveis revisadas.
//   C · desligado = os 3 passos de hoje (sem caixa nova); ligado = o MESMO pedido, o MESMO sessionStorage e os MESMOS eventos do Generate
//       que os 3 passos produzem para a mesma ideia/duração/formato; nada navega antes do clique; o exemplo só PREENCHE.
//   D · o número do botão é o que recebe (precoDoGenerate) e some quando ele é null; cada frase da linha de confiança tem a prova no código.
//   M · mutantes: interruptor 'public' por padrão, página sem a régua, Generate que não é o gerar(), exemplo que gera, estorno sumido.
// Offline (docs/studio-na-moldura-1011/runtime.cjs: módulos reais transpilados, hooks emulados, rede/roteador como dublês). Rodar: node scripts/test-caixa-nova-1511.mjs
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const R = require('../docs/studio-na-moldura-1011/runtime.cjs')
const { aba, React, read, ROOT } = R
const BASE = 'ec6348f4b7beafa640bc3fb5d9dc5da3b7ce7b0b'
// SHA-256 das duas fontes do pedido após acrescentar a escolha de voz. O guardião de voz também compara OFF com eb07dbd73.
const ESTILO = {
  'components/studio/StudioSimples.tsx': '12799c6f5961c11dba331478b842ba311fb70fecd242744bc871d1e2191fc501',
  'lib/growth/studioSimples.ts': 'bafa414b1ca6e9218db3e27c9c10a610e863f566ebdc4b68774e74eb80ced03e',
}
const baseSrc = (ref, p) => execFileSync('git', ['show', `${ref}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
const lf = s => s.replace(/\r\n/g, '\n')
const HOUSE = 'josephsskaf@gmail.com'
const CUSTOMER = 'customer@example.org'
const IDEA = 'The ghost ship Mary Celeste'
const isGen = p => p['data-testid'] === 'studio-simple-generate'
const PAGE = 'app/create/[tab]/page.tsx'
const STYLE_PROP = ' showFilmStyle={showFilmStyle}'
const LINHA_NOVA = 'if (filmNaMoldura(params.tab, user?.email) && caixaNovaVisivel(user?.email)) return <><StudioIdeaArrival /><StudioNaMoldura caixaNova showRecreate={decision.showRecreate} showClip={showClip} motor={motorDaCaixa(undefined)} campanha={campanha} ideiaInicial={ideiaDoLink(searchParams.ideia)} /></>'
const LINHA_DE_SEMPRE = 'if (filmNaMoldura(params.tab, user?.email)) return <><StudioIdeaArrival /><StudioNaMoldura showRecreate={decision.showRecreate} showClip={showClip} motor={motorDaCaixa(undefined)} campanha={campanha} ideiaInicial={ideiaDoLink(searchParams.ideia)} /></>'

const src = (o, p) => lf(o[p] ?? read(p))
// ─── A. Interruptor e porta ────────────────────────────────────────────────────────────────────────────────────────────
function casosA(o) {
  const access = aba(o).m('lib/create/access'), release = aba(o).m('lib/create/release')
  const v = (e, r) => access.caixaNovaVisivel(e, r)
  const page = src(o, PAGE).replaceAll(STYLE_PROP, '')
  const iNova = page.indexOf(LINHA_NOVA), iSempre = page.indexOf(LINHA_DE_SEMPRE)
  return [
    ["A1 interruptor aberto ao público em 15/11 (dono: \"pode liberar tudo para as pessoas\"); VOLTA = 'internal'", release.CAIXA_NOVA_RELEASE === 'public'],
    ['A2 padrão (público desde 15/11): a casa e a conta de fora veem; visitante nunca; de volta a "internal", a conta de fora não', v(HOUSE) === true && v(CUSTOMER) === true && v(null) === false && v(undefined) === false && v(CUSTOMER, 'internal') === false && v(HOUSE, 'internal') === true],
    ["A3 'internal': e-mail parecido não é allowlist", v('josephsskaf@gmail.com.evil.org', 'internal') === false && v('test-hacker@example.org', 'internal') === false],
    ["A4 'off': ninguém; 'public': toda conta logada, nunca visitante", [HOUSE, CUSTOMER, null].every(e => v(e, 'off') === false) && v(CUSTOMER, 'public') === true && v(null, 'public') === false],
    ['A5 a página troca a casca só com filmNaMoldura E caixaNovaVisivel', iNova > 0],
    ['A6 a linha de sempre (3 passos) segue intacta, logo depois', iSempre > iNova && iSempre - iNova < LINHA_NOVA.length + 400],
    ['A7 o caixaNova só aparece na linha guardada pela régua', (page.match(/StudioNaMoldura caixaNova/g) ?? []).length === 1],
  ]
}

// ─── B. O gerador é o de antes ─────────────────────────────────────────────────────────────────────────────────────────
function casosB(o) {
  return [
    ...Object.entries(ESTILO).map(([file, hash], i) => [`B${i + 1} ${file} igual à referência do pedido com voz`, createHash('sha256').update(src(o, file)).digest('hex') === hash]),
    ...['lib/create/filmNaMoldura.ts', 'lib/credits/engineCost.ts'].map((file, i) => [`B${i + 3} ${file} igual à main ${BASE.slice(0, 9)}`, src(o, file) === lf(baseSrc(BASE, file))]),
  ]
}

// ─── C. Mesmo pedido pelos dois caminhos ───────────────────────────────────────────────────────────────────────────────
function caminho(o, nova, { duracao, formato }) {
  const t = aba(o)
  const caixa = t.m('lib/growth/studioSimples'), tabs = t.m('lib/create/tabs')
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: caixa.motorDaCaixa(undefined), campanha: tabs.CREATE_FILM_CAMPAIGN, caixaNova: nova }))
  const antes = t.html()
  t.type(p => p.id === (nova ? 'cx-ideia' : 'sm-idea'), IDEA, 'ideia')
  if (nova && duracao) { t.click(p => p['data-cx-chip'] === 'duracao', 'chip duração'); t.click(p => p['data-studio-duration'] === String(duracao), 'duração') }
  if (nova && formato) { t.click(p => p['data-cx-chip'] === 'formato', 'chip formato'); t.click(p => p['data-studio-format'] === formato, 'formato') }
  if (!nova && duracao) t.click(p => p['data-studio-duration'] === duracao, 'duração')
  if (!nova && formato) t.click(p => p['data-studio-format'] === formato, 'formato')
  const navegouAntes = t.log.pushes.length
  t.click(isGen, 'Generate')
  const gen = t.log.events.filter(([n]) => ['mrr_generate_clicked', 'studio_simple_generate_clicked'].includes(n))
  return { antes, navegouAntes, pushes: t.log.pushes, storage: [...t.log.storage], gen }
}
function exemploSoPreenche(o) {
  const t = aba(o)
  const caixa = t.m('lib/growth/studioSimples'), tabs = t.m('lib/create/tabs')
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: caixa.motorDaCaixa(undefined), campanha: tabs.CREATE_FILM_CAMPAIGN, caixaNova: true }))
  const primeiro = tabs.CREATE_EXAMPLES.film[0]
  t.type(p => p.id === 'cx-ideia', IDEA + ' at dawn', 'ideia já escrita') // com texto na caixa, um exemplo que gerasse navegaria
  t.click(p => p['data-cx-exemplo'] === primeiro.id, 'exemplo')
  return { pushes: t.log.pushes.length, preenchido: t.one(p => p.id === 'cx-ideia', 'caixa').props.value === primeiro.idea }
}
function casosC(o) {
  const out = []
  const velho = caminho(o, false, {}), novo = caminho(o, true, {})
  out.push(['C1 desligado: os 3 passos de hoje, sem caixa nova', velho.antes.includes('id="sm-idea"') && !velho.antes.includes('data-caixa-nova')])
  out.push(['C2 ligado: a caixa nova, sem os 3 passos', novo.antes.includes('data-caixa-nova') && !novo.antes.includes('id="sm-idea"') && !novo.antes.includes('rc-progress')])
  for (const [n, op] of [['padrão', {}], ['35 s · 16:9', { duracao: 35, formato: '16:9' }], ['90 s · 1:1', { duracao: 90, formato: '1:1' }]]) {
    const a = caminho(o, false, op), b = caminho(o, true, op)
    out.push([`C3 ${n}: o MESMO pedido, sessionStorage e eventos do Generate`, a.pushes.length === 1 && JSON.stringify(a.pushes) === JSON.stringify(b.pushes) && JSON.stringify(a.storage) === JSON.stringify(b.storage) && JSON.stringify(a.gen) === JSON.stringify(b.gen)])
    out.push([`C4 ${n}: nada navega antes do clique em Generate`, b.navegouAntes === 0])
    if (op.duracao) {
      const duration = pedido => pedido && new URL(pedido, 'https://fixture.invalid').searchParams.get('duration')
      out.push([`C8 ${n}: o pedido de cada caixa leva a duração escolhida`, [a, b].every(v => duration(v.pushes[0]) === String(op.duracao))])
    }
  }
  const ex = exemploSoPreenche(o)
  out.push(['C5 o exemplo só PREENCHE a caixa (nunca gera)', ex.pushes === 0 && ex.preenchido])
  const cards = [...novo.antes.matchAll(/<button[^>]*data-cx-exemplo[^>]*>([\s\S]*?)<\/button>/g)]
  out.push(['C6 selo e título do palco ficam fora da área de vídeo',
    /<aside class="cx-palco"[^>]*>\s*<header class="cx-palco-caption">[\s\S]*?Film example[\s\S]*?<\/header>\s*<div class="cx-palco-video"><video/.test(novo.antes)])
  out.push(['C7 os quatro cartões guardam o título para acessibilidade sem repeti-lo visualmente',
    cards.length === 4 && cards.every(([, card]) => /<span class="sr-only">[^<]+<\/span>/.test(card) &&
      /<span class="cx-exemplo-nome">(?:[\s\S]*?<\/span>)?<\/span>\s*<span class="sr-only">/.test(card))])
  return out
}

// ─── D. Número do botão e linha de confiança ───────────────────────────────────────────────────────────────────────────
function casosD(o) {
  const t = aba(o)
  const Caixa = t.m('components/create/CaixaNovaDoFilme').default
  const c = { motor: 'seedance', texto: IDEA, escrever() {}, caixa: { current: null }, aviso: null, limiteMax: 2000, duracao: 60, opcoesDuracao: [15, 35, 60, 90], setDuracao() {}, formato: '9:16', formatos: ['9:16'], setFormato() {}, lingua: 'auto', setLingua() {}, palavraPorPalavra: false, setPalavraPorPalavra() {}, maisOpcoes: '/studio?avancado=1', temFilmeGratis: false, gerar() {}, contaPaga: true, motores: null, motoresEstado: 'fechado', abrirMotores() {}, escolherMotor() {}, kling4: null }
  t.mount(React.createElement(Caixa, { c, preco: 35, showRecreate: true, showClip: false })); const com = t.html()
  const t2 = aba(o); t2.mount(React.createElement(t2.m('components/create/CaixaNovaDoFilme').default, { c, preco: null, showRecreate: true, showClip: false })); const sem = t2.html()
  const texto = t.m('lib/create/caixaNovaTexto')
  const refund = src(o, 'lib/credits/refund.ts')
  const provas = [
    ['app/api/compose/status/[renderId]/route.ts', 'await refundRenderCredits('],
    ['app/api/generate-video-cinematic/route.ts', 'await refundRenderCredits(billingReference)'],
    ['app/api/cron/finish-stranded-renders/route.ts', 'await refundRenderCredits('],
  ]
  const tela = (s) => s.replace(/<header[\s\S]*?<\/header>/, ' ').replace(/<[^>]+>/g, ' ') // o cabeçalho (saldo · Pricing) é o de toda tela nova
  return [
    ['D1 o número vem de quem chama (precoDoGenerate) e aparece só no botão', /class="cx-gerar"[^>]*>[\s\S]*?✦ (<!-- -->)?35</.test(com) && (tela(com).match(/✦/g) ?? []).length === 1],
    ['D2 sem número (null), o botão diz só Generate', !sem.includes('✦')],
    ['D3 nenhum preço escrito na tela fora do botão', !/\$\s?\d|US\$|\bcredits?\b|✦\s?\d/i.test(texto.CAIXA_NOVA_CONFIANCA.reduce((s, f) => s.replace(f, ' '), tela(com.replace(/<button[^>]*class="cx-gerar"[\s\S]*?<\/button>/, ''))))], // a linha "Credits back…" é promessa, não preço
    ['D4 a linha de confiança é a de caixaNovaTexto (e só ela)', texto.CAIXA_NOVA_CONFIANCA.every(f => com.includes(f)) && texto.CAIXA_NOVA_CONFIANCA.length === 3],
    ['D5 prova do estorno: refundRenderCredits existe e as rotas do filme o chamam', /export async function refundRenderCredits\(/.test(refund) && provas.every(([p, s]) => src(o, p).includes(s))],
    ['D6 prova do "Private by default": a regra pública da casa', src(o, 'app/llms.txt/route.ts').includes('Customer videos are private by default')],
    ['D7 sem tempo de entrega prometido', !/\bmin\b|minutes?|seconds? to|ready in/i.test(texto.CAIXA_NOVA_CONFIANCA.join(' '))],
  ]
}

const todos = o => [...casosA(o), ...casosB(o), ...casosC(o), ...casosD(o)]
let falhas = 0, total = 0
for (const [nome, ok] of todos({})) { total++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${nome}`); if (!ok) falhas++ }

// ─── M. Mutantes: cada um tem de reprovar pelo menos um caso ───────────────────────────────────────────────────────────
const mut = (p, de, para) => { const s = lf(read(p)); if (!s.includes(de)) throw new Error(`mutante sem alvo em ${p}: ${de.slice(0, 60)}`); return { [p]: s.replace(de, para) } }
const MUTANTES = [
  ["M1 interruptor fechado por engano", mut('lib/create/release.ts', "CAIXA_NOVA_RELEASE: InternalRelease = 'public'", "CAIXA_NOVA_RELEASE: InternalRelease = 'off'")],
  ['M2 régua ignora a allowlist', mut('lib/create/access.ts', "release: InternalRelease = CAIXA_NOVA_RELEASE): boolean {\n  return !!email && releaseVisible(email, release)", "release: InternalRelease = CAIXA_NOVA_RELEASE): boolean {\n  return !!email")],
  ['M3 página sem a régua da caixa nova', mut(PAGE, ' && caixaNovaVisivel(user?.email)) return', ') return')],
  ['M4 Generate que não é o gerar() do Studio', mut('components/create/CaixaNovaDoFilme.tsx', 'aoClicar: c.gerar,', 'aoClicar: () => c.setDuracao(60),')],
  ['M5 o exemplo gera sozinho', mut('components/create/CaixaNovaDoFilme.tsx', '// só PREENCHE: o filme nunca começa sozinho', '; c.gerar()')],
  ['M6 o pedido mudou no StudioSimples', mut('components/studio/StudioSimples.tsx', 'router.push(pedidoDoStudioSimples({ motor, texto: t, duracao, formato, lingua, palavraPorPalavra, campanha', 'router.push(pedidoDoStudioSimples({ motor, texto: t, duracao: 90, formato, lingua, palavraPorPalavra, campanha'), 'C8 35 s'],
  ['M7 estorno sumiu do filme', mut('app/api/generate-video-cinematic/route.ts', 'await refundRenderCredits(billingReference)', 'await Promise.resolve(0)')],
  ['M8 preço escrito fora do botão', mut('components/create/CaixaNovaDoFilme.tsx', "valor: `${c.duracao} s`,", "valor: `${c.duracao} s · ✦ 35`,")],
  ['M9 selo volta para cima do vídeo', mut('components/create/CaixaNovaDoFilme.tsx', '<header className="cx-palco-caption">', '<div className="cx-palco-video"><header className="cx-palco-caption">')],
  ['M10 título volta a aparecer abaixo da capa', mut('components/create/CaixaDeCriar.tsx', '<span className="sr-only">{e.title}</span>', '<span>{e.title}</span>')],
]
for (const [nome, o, testeEsperado] of MUTANTES) {
  let reprovou, porque = ''
  try { const f = todos(o).filter(([, ok]) => !ok); reprovou = testeEsperado ? f.some(([n]) => n.startsWith(testeEsperado)) : f.length > 0; porque = f.map(([n]) => n.split(' ')[0]).join(', ') } catch (e) { reprovou = !testeEsperado; porque = 'erro: ' + String(e?.message ?? e).slice(0, 60) }
  total++
  console.log(`  ${reprovou ? 'ok  ' : 'FAIL'} ${nome} → o guardião reprova (${porque})`)
  if (!reprovou) falhas++
}
console.log(`${total - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
