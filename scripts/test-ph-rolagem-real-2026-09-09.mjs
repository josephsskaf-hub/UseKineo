// KINEO-FRIO-ROLAGEM-2026-09-09 (sprint do tráfego frio, r2) — guardião do
// conserto da medição de rolagem da /ph.
//
// O DEFEITO QUE ELE IMPEDE DE VOLTAR. A r1 instrumentou a /ph para responder a
// pergunta que decide a sprint inteira: as 160 pessoas de 167 que não fizeram
// nada FECHARAM A ABA antes de ler (remédio = promessa/peso/velocidade) ou
// LERAM E RECUSARAM a oferta (remédio = oferta/prova)? A instrumentação nasceu
// respondendo "100% leram a página inteira" para todo mundo — cega de um jeito
// pior que não medir, porque parecia dado bom.
//
// Medido no navegador, em produção, na /ph (4.427px de conteúdo em viewport de
// 812px), com o conteúdo rolado a 1500px:
//
//     window.scrollY ................ 0
//     documentElement.scrollHeight .. 812   (= clientHeight)
//     body.scrollHeight ............. 4427
//     fórmula da r1 ................. 100%  ← errada
//     fórmula correta ...............  52%
//
// Causa: `app/globals.css:121` põe `html, body { height: 100% }`. Com altura
// fixa na raiz, quem rola é o <body> — a raiz tem scrollHeight == clientHeight,
// `window.scrollY` fica preso em 0, e o evento de scroll de um ELEMENTO não
// borbulha até a `window` (o listener da r1 nunca era chamado).
//
// Este guardião não se contenta em casar texto: ele EXTRAI as duas funções do
// componente e as EXECUTA contra três DOMs falsos, incluindo o da casa com os
// números reais acima. Guardião que só conta texto fica verde com a condição
// invertida; este só fica verde se a conta der certo.
//
// Estilo readFileSync sem import de '@/...' de propósito: guardião com alias
// morre no import antes da primeira verificação e passa a vida em falso verde.
import { readFileSync } from 'node:fs'

const BEACON = readFileSync(new URL('../components/PhLandingBeacon.tsx', import.meta.url), 'utf8')
const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

let falhas = 0
function check(nome, condicao) {
  if (condicao) return
  falhas++
  console.error(`FALHOU: ${nome}`)
}

// --- 1. a premissa do defeito ainda é verdade ----------------------------
// Se um dia o layout parar de fixar a altura da raiz, o <body> deixa de ser o
// scroller e este conserto vira desnecessário — mas continua correto. O que
// NÃO pode acontecer é alguém remover o conserto achando que o CSS mudou sem
// ter olhado. Esta verificação documenta a premissa no lugar onde ela vive.
check(
  'o CSS global ainda fixa height:100% em html,body (a premissa do conserto)',
  /html\s*,\s*body\s*\{[^}]*height:\s*100%/.test(CSS),
)

// --- 2. o alvo de rolagem é escolhido, não presumido ----------------------
check('existe a função alvoDeRolagem', /function alvoDeRolagem\(\)/.test(BEACON))
check(
  'o alvo cobre os três casos: window, body e nenhum',
  /fonte:\s*'window'/.test(BEACON) && /fonte:\s*'body'/.test(BEACON) && /fonte:\s*'nenhum'/.test(BEACON),
)
check(
  'o ramo do body lê scrollTop/clientHeight/scrollHeight do próprio body',
  /corpo\.scrollTop/.test(BEACON) && /corpo\.clientHeight/.test(BEACON) && /corpo\.scrollHeight/.test(BEACON),
)
check(
  'a eleição do scroller compara scrollHeight com clientHeight (e não com o viewport)',
  /raiz\.scrollHeight\s*>\s*raiz\.clientHeight/.test(BEACON) && /corpo\.scrollHeight\s*>\s*corpo\.clientHeight/.test(BEACON),
)
check(
  'a profundidade soma o topo rolado à janela visível do alvo eleito',
  /alvo\.topo\s*\+\s*alvo\.janela/.test(BEACON),
)
check(
  'a profundidade NÃO volta a presumir a janela',
  !/window\.scrollY\s*\+\s*window\.innerHeight/.test(BEACON),
)

// --- 3. o evento diz qual scroller foi usado -----------------------------
// Sem este campo não há como distinguir, olhando o dado, rolagem de verdade de
// fórmula velha: os dois gravam depth=100 quando a página é curta.
check(
  'os três eventos carregam o scroller que foi realmente usado',
  (BEACON.match(/scroller:\s*(alvo\.fonte|alvoDeRolagem\(\)\.fonte)/g) ?? []).length >= 3,
)

// --- 4. o listener ouve o scroll de ELEMENTO -----------------------------
// Scroll de elemento não borbulha. Ouvir na window é não ouvir.
check(
  'o scroll é ouvido no document na fase de captura',
  /document\.addEventListener\(\s*'scroll'\s*,\s*aoRolar\s*,\s*\{[^}]*capture:\s*true/.test(BEACON),
)
check(
  'o scroll não é ouvido apenas na window (onde nunca chega)',
  !/window\.addEventListener\(\s*'scroll'/.test(BEACON),
)
check(
  'o listener de scroll é removido com o mesmo capture (senão vaza)',
  /document\.removeEventListener\(\s*'scroll'\s*,\s*aoRolar\s*,\s*true\s*\)/.test(BEACON),
)

// --- 5. o carimbo do bundle separa o lixo do bom -------------------------
// A rolagem gravada sob v2 é inválida por construção e não pode ser somada à
// boa. O corte da medição é por campo novo, nunca por relógio.
const versao = (BEACON.match(/const VERSAO = '([^']+)'/) ?? [])[1]
check('a VERSAO subiu para ph_sep10_v3 ou mais nova', Boolean(versao) && versao !== 'ph_sep10_v1' && versao !== 'ph_sep10_v2')

// --- 6. A CONTA, EXECUTADA -----------------------------------------------
// Extrai alvoDeRolagem() e profundidade() do componente e roda de verdade.
function extrairFuncao(fonte, assinatura) {
  const inicio = fonte.indexOf(assinatura)
  if (inicio < 0) return null
  let i = fonte.indexOf('{', inicio)
  if (i < 0) return null
  let nivel = 0
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === '{') nivel++
    else if (fonte[j] === '}') {
      nivel--
      if (nivel === 0) return fonte.slice(inicio, j + 1)
    }
  }
  return null
}

const fonteAlvo = extrairFuncao(BEACON, 'function alvoDeRolagem()')
const fonteProf = extrairFuncao(BEACON, 'function profundidade()')
check('as duas funções da conta puderam ser extraídas do componente', Boolean(fonteAlvo) && Boolean(fonteProf))

let calcular = null
if (fonteAlvo && fonteProf) {
  // Só as anotações de tipo saem; a lógica roda exatamente como está no arquivo.
  const semTipos = `${fonteAlvo}\n${fonteProf}`.replace(/\)\s*:\s*(AlvoDeRolagem|number)\s*\{/g, ') {')
  calcular = new Function(
    'document',
    'window',
    `${semTipos}\nreturn { alvoDeRolagem, profundidade }`,
  )
}

function cenario(nome, dom, esperadoDepth, esperadaFonte) {
  if (!calcular) {
    check(`cenário ${nome}: a conta pôde ser executada`, false)
    return
  }
  const doc = {
    documentElement: { scrollHeight: dom.raizScrollH, clientHeight: dom.raizClientH },
    body: { scrollHeight: dom.bodyScrollH, clientHeight: dom.bodyClientH, scrollTop: dom.bodyScrollTop },
  }
  const win = { scrollY: dom.winScrollY, innerHeight: dom.winInnerH }
  const { alvoDeRolagem, profundidade } = calcular(doc, win)
  const fonte = alvoDeRolagem().fonte
  const depth = profundidade()
  check(`cenário ${nome}: elege o scroller '${esperadaFonte}' (elegeu '${fonte}')`, fonte === esperadaFonte)
  check(`cenário ${nome}: profundidade ${esperadoDepth}% (deu ${depth}%)`, depth === esperadoDepth)
}

// A CASA, com os números medidos em produção. Antes do conserto isto dava 100.
cenario(
  'body rola (a /ph real, rolada a 1500 de 4427)',
  { raizScrollH: 812, raizClientH: 812, bodyScrollH: 4427, bodyClientH: 812, bodyScrollTop: 1500, winScrollY: 0, winInnerH: 812 },
  52,
  'body',
)
// A mesma página no topo: quem acabou de abrir viu 18%, não 100%.
cenario(
  'body rola, visitante no topo',
  { raizScrollH: 812, raizClientH: 812, bodyScrollH: 4427, bodyClientH: 812, bodyScrollTop: 0, winScrollY: 0, winInnerH: 812 },
  18,
  'body',
)
// Layout normal (a janela rola): o conserto não pode quebrar o caso comum.
cenario(
  'janela rola (layout sem height:100%)',
  { raizScrollH: 4427, raizClientH: 812, bodyScrollH: 4427, bodyClientH: 4427, bodyScrollTop: 0, winScrollY: 1500, winInnerH: 812 },
  52,
  'window',
)
// Página que cabe na tela: quem não precisou rolar VIU tudo — 100 é correto
// aqui, e contar isso como "não rolou" culparia a copy por um defeito que não
// existe.
cenario(
  'página curta que cabe inteira na tela',
  { raizScrollH: 812, raizClientH: 812, bodyScrollH: 812, bodyClientH: 812, bodyScrollTop: 0, winScrollY: 0, winInnerH: 812 },
  100,
  'nenhum',
)

if (falhas) {
  console.error(`\n${falhas} verificação(ões) falharam`)
  process.exit(1)
}
console.log('test-ph-rolagem-real-2026-09-09: OK')
