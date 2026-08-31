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

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const comp = readFileSync(join(raiz, 'components/video/NextShortsSection.tsx'), 'utf8')
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
ver('F1', comp.includes('if (!loading && ideas.length === 0) return null'),
  'lista vazia deixou de renderizar null')
ver('F2', comp.includes('requestedRef'), 'guarda de uma requisicao por render sumiu')
ver('F3', /catch \{\s*if \(!cancelled\) setIdeas\(\[\]\)/.test(comp), 'erro de rede deixou de ser silencioso')
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

console.log(`${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
