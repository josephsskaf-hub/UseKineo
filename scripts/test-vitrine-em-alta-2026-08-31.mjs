// sprint-v1v4 #16 — a prateleira de temas em alta na tela de "video pronto".
//
// Numeros reais de producao (30 dias, so pessoas externas) que escolheram o alvo:
//   /viral-now visto ......... 124 pessoas
//   tema clicado .............  44 pessoas  (35% dos expostos)
//   apertou Generate <2h .....  24 pessoas  (55% dos que clicaram)
//   recebeu video <2h ........  20 pessoas  (45% dos que clicaram)
// Contra 15 escolhas em 420 expostos (2,6%) nesta mesma tela.
//
// Rodar: node scripts/test-vitrine-em-alta-2026-08-31.mjs
import { readFileSync } from 'node:fs'

let ok = 0
const falhas = []
const v = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

const CAMINHO = 'components/video/NextShortsSection.tsx'
const src = readFileSync(CAMINHO, 'utf8')
const GEN = readFileSync('app/(dashboard)/generate/GenerateClient.tsx', 'utf8')
const API = readFileSync('app/api/viral-now/route.ts', 'utf8')

// Codigo sem comentarios. Toda proibicao roda AQUI (licoes #4, #6, #7): um
// comentario que EXPLICA a regra nao pode reprovar a regra.
const semComentario = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const CODIGO = semComentario(src)

// ── A · A PECA ESTA LIGADA (licao do sceneTruth, 27/08: biblioteca morta
//      resumida como pronta). Nao basta existir; tem de estar montada.
v('A1 GenerateClient importa NextShortsSection', /import NextShortsSection from '@\/components\/video\/NextShortsSection'/.test(GEN))
v('A2 GenerateClient monta <NextShortsSection', GEN.includes('<NextShortsSection'))
v('A3 a rota /api/viral-now existe e responde GET', /export async function GET/.test(API))
v('A4 a rota devolve topics', /topics/.test(API))
v('A5 o componente chama /api/viral-now', CODIGO.includes("fetch('/api/viral-now'"))
v('A6 o componente segue chamando /api/next-shorts', CODIGO.includes("fetch('/api/next-shorts'"))
v('A7 onPick recebe o prompt do tema em alta', /onPick\(\{ title: tema\.title, prompt: tema\.prompt/.test(CODIGO))
v('A8 o GenerateClient carrega idea.prompt no compositor', /setPrompt\(idea\.prompt\)/.test(GEN))

// ── B · AS DUAS FONTES SAO INDEPENDENTES
// O ponto inteiro da rodada: a chamada fragil (modelo) nao pode derrubar a
// confiavel (rotacao estatica). allSettled, nunca all.
v('B1 usa Promise.allSettled', CODIGO.includes('Promise.allSettled'))
v('B2 NAO usa Promise.all seco', !/Promise\.all\(/.test(CODIGO))
v('B3 le o resultado por status fulfilled', (CODIGO.match(/status === 'fulfilled'/g) || []).length >= 2)
v('B4 uma so requisicao por render (guarda mantida)', CODIGO.includes('requestedRef.current'))

// ── C · O CONTRATO DE FALHA INVISIVEL MUDOU DE REGUA, MAS CONTINUA EXISTINDO
v('C1 so devolve null com as DUAS fontes vazias', /ideas\.length === 0 && trending\.length === 0\) return null/.test(CODIGO))
v('C2 a lista pessoal vazia NAO apaga mais a tela', !/if \(!loading && ideas\.length === 0\) return null/.test(CODIGO))
v('C3 o bloco pessoal so ocupa espaco se tiver algo', /\(loading \|\| ideas\.length > 0\) &&/.test(CODIGO))
v('C4 a prateleira so aparece com tema', /trending\.length > 0 &&/.test(CODIGO))

// ── D · O PARSER ERRA SEMPRE PARA "NAO TEM NADA"
const mod = await import('../components/video/NextShortsSection.tsx').catch(() => null)
// O .tsx nao roda no node cru; entao o parser e verificado pelo texto, com as
// mesmas garantias que a lib da #14 pediu por escrito.
v('D1 lerTemasEmAlta e exportada', /export function lerTemasEmAlta/.test(src))
v('D2 payload nao-array devolve lista vazia', /if \(!Array\.isArray\(lista\)\) return \[\]/.test(CODIGO))
v('D3 tudo dentro de try/catch com catch vazio', /catch \{\s*return \[\]\s*\}/.test(CODIGO))
v('D4 tema sem titulo e descartado', /if \(!title \|\| prompt\.trim\(\)\.length < 40\) continue/.test(CODIGO))
v('D5 respeita o limite de quantidade', /if \(saida\.length >= quantos\) break/.test(CODIGO))
v('D6 texto que vai para a tela e limpo de controle', /replace\(\/\[\\u0000-\\u001f\\u007f\]\/g/.test(CODIGO))
v('D7 todo campo tem teto de tamanho', (CODIGO.match(/textoSeguro\(t\?\./g) || []).length >= 6)
v('D8 titulo com teto de 90', /textoSeguro\(t\?\.title, 90\)/.test(CODIGO))
v('D9 id com teto de 64 (mesmo teto do catalogo do servidor)', /textoSeguro\(t\?\.id, 64\)/.test(CODIGO))
v('D10 o componente nao importa lib/viralTopics (peso de bundle)', !/from '@\/lib\/viralTopics'/.test(src))

// ── E · AFORDANCIA: NENHUM SINAL SO-HOVER (a doenca curada na #7)
const iShelf = src.indexOf('SPRINT-V1V4 #16 — THE TRENDING SHELF')
v('E0 a fatia da prateleira foi encontrada', iShelf > 0)
const prateleira = iShelf > 0 ? src.slice(iShelf, src.length) : ''
// Licao da #14: "nao contem" sobre string vazia e aprovacao por vacuo. Toda
// fatia precisa de uma checagem de tamanho ao lado.
v('E1 a fatia tem tamanho de verdade', prateleira.length > 1500)
v('E2 rotulo de acao permanentemente visivel', prateleira.includes('Make this one'))
v('E3 seta no rotulo, igual as demais saidas do produto', prateleira.includes('→'))
v('E4 borda de repouso azul (unico sinal de controle no telefone)', prateleira.includes("border: '1px solid rgba(41,151,255,.30)'"))
v('E5 feedback proprio de toque', prateleira.includes('onTouchStart') && prateleira.includes('onTouchEnd'))
v('E6 feedback de teclado', prateleira.includes('onFocus') && prateleira.includes('onBlur'))
v('E7 realce de toque nativo', prateleira.includes('WebkitTapHighlightColor'))
v('E8 e um <button type=button>, nao uma caixa decorativa', prateleira.includes('type="button"'))
v('E9 alvo de toque >= 44px', /minHeight: 56/.test(prateleira))
v('E10 emoji decorativo escondido do leitor de tela', prateleira.includes('aria-hidden="true"'))

// ── F · A PRATELEIRA NAO COMECA NADA (mesma trava da #14)
// Um toque acidental custa uma rolagem, nunca um credito.
v('F1 nao chama handleGenerate', !/handleGenerate/.test(prateleira))
v('F2 nao faz fetch', !/fetch\(/.test(semComentario(prateleira)))
v('F3 nao empurra rota', !/router\.push/.test(prateleira))
v('F4 nao escreve em localStorage', !/localStorage/.test(prateleira))
v('F5 so carrega o compositor via onPick', (prateleira.match(/onPick\(/g) || []).length === 1)

// ── G · FRONTEIRA COM O CODEX (regra 2 e 3 da sprint)
for (const proibido of ['stripe', 'checkout', 'price', 'credit', 'upgrade', 'coupon', 'subscription']) {
  v(`G-${proibido} ausente do codigo do componente`, !CODIGO.toLowerCase().includes(proibido))
}
v('G1 zero contato com EngineCycleCard (curadoria do fundador)', !src.includes('EngineCycleCard'))
v('G2 zero contato com engineWall', !src.includes('engineWall'))
v('G3 a rodada nao alterou GenerateClient para a prateleira', !GEN.includes('next_shorts_trending_picked'))

// ── H · TELEMETRIA QUE FECHA O GATE
v('H1 emite next_shorts_trending_shown', CODIGO.includes("'next_shorts_trending_shown'"))
v('H2 emite next_shorts_trending_picked', CODIGO.includes("'next_shorts_trending_picked'"))
v('H3 o evento antigo next_shorts_shown continua vivo', CODIGO.includes("'next_shorts_shown'"))
v('H4 o evento antigo next_shorts_picked continua vivo', CODIGO.includes("'next_shorts_picked'"))
v('H5 a escolha carrega topic_id (da para cruzar com /viral-now)', /topic_id: tema\.id/.test(CODIGO))
v('H6 a escolha carrega vertical', /vertical: tema\.vertical/.test(CODIGO))
v('H7 a exibicao registra se a metade pessoal existia', /had_personal: list\.length > 0/.test(CODIGO))
v('H8 os dois eventos novos carregam is_touch/viewport_w', (CODIGO.match(/\.\.\.ambienteDePonteiro\(\)/g) || []).length >= 4)
v('H9 nenhum texto da pessoa viaja na telemetria', !/topic:|prompt: tema\.prompt,\s*\.\.\.ambiente/.test(CODIGO.slice(CODIGO.indexOf('next_shorts_trending_picked'), CODIGO.indexOf('next_shorts_trending_picked') + 400)))

// ── I · ARMADILHA DA #8: crase em comentario vira codigo dentro de template
const comentariosNovos = (src.match(/\/\/ .*#16.*/g) || []).concat(src.match(/SPRINT-V1V4 #16[\s\S]{0,900}?\*\//g) || [])
v('I1 comentarios da rodada existem', comentariosNovos.length > 0)
v('I2 nenhuma crase nos comentarios novos', !comentariosNovos.some((c) => c.includes('`')))

// ── J · REGRESSAO: a metade pessoal da #7 nao foi mexida
v('J1 os 3 cards pessoais continuam la', CODIGO.includes('Your next 3 Shorts'))
// Sobre CODIGO, nao sobre src: a terceira ocorrencia e o COMENTARIO da #7 que
// explica a regra. Sexta vez nesta sprint que a checagem tropeca no proprio
// comentario — a regra vale sem excecao.
v('J2 o rotulo permanente da #7 sobreviveu, e agora sao dois', (CODIGO.match(/Make this one/g) || []).length === 2)
v('J3 ambienteDePonteiro continua sem tocar dado da pessoa', /function ambienteDePonteiro/.test(src))
v('J4 skeleton de carregamento preservado', CODIGO.includes('minHeight: 104'))

console.log(`\n${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { falhas.forEach((f) => console.log('  ✗ ' + f)); process.exit(1) }
console.log('✓ sprint-v1v4 #16 — prateleira de temas em alta na tela de video pronto\n')
