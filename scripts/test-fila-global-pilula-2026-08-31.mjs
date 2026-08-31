// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #15 — a fila da espera passa a existir em TODA pagina autenticada.
//
// Lição do sceneTruth (biblioteca viva, callers zero) e a lição da #14 (fatia
// vazia aprova por vácuo): TODA fatia deste teste checa o próprio tamanho antes
// de afirmar "não contém".
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pill = readFileSync(join(raiz, 'components/ActiveRenderPill.tsx'), 'utf8')
const gc = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const fila = readFileSync(join(raiz, 'lib/proximoEpisodioFila.ts'), 'utf8')

let ok = 0
let bad = 0
function t(nome, cond) {
  if (cond) { ok++; console.log('  ✓ ' + nome) }
  else { bad++; console.log('  ✗ ' + nome) }
}

console.log('\nA — A PEÇA ESTÁ LIGADA (não é biblioteca morta)')
t('A1 a pílula importa lerIdeiaDaFila', /import\s*\{[^}]*lerIdeiaDaFila[^}]*\}\s*from '@\/lib\/proximoEpisodioFila'/s.test(pill))
t('A2 a pílula importa limparFila', /limparFila/.test(pill))
t('A3 a pílula importa o tipo IdeiaNaFila', /type IdeiaNaFila/.test(pill))
t('A4 lerIdeiaDaFila é CHAMADA (não só importada)', (pill.match(/lerIdeiaDaFila\(\)/g) || []).length >= 2)
t('A5 existe o componente FilaLinedUpPill', /function FilaLinedUpPill\(/.test(pill))
t('A6 FilaLinedUpPill é RENDERIZADO', /<FilaLinedUpPill\b/.test(pill))
t('A7 handleFilaGo existe e é usado', /function handleFilaGo\(/.test(pill) && /handleFilaGo\(/.test(pill.split('function handleFilaGo(')[1] ?? ''))
t('A8 handleFilaDismiss existe e é usado', /function handleFilaDismiss\(/.test(pill) && (pill.match(/handleFilaDismiss/g) || []).length >= 2)

console.log('\nB — O CAMINHO DO 2º VÍDEO É O MESMO DA TELA DE VÍDEO PRONTO')
const hrefPill = pill.match(/idea_source: '([a-z_]+)'/)
const hrefGc = gc.match(/idea_source: '([a-z_]+)'/)
t('B1 a pílula empurra para /generate com prompt+autoanalyze', /\/generate\?\$\{new URLSearchParams\(\{[\s\S]{0,220}prompt: ideia\.seed[\s\S]{0,120}autoanalyze: '1'/.test(pill))
t('B2 a pílula carimba idea_source próprio', hrefPill?.[1] === 'wait_queue_pill')
t('B3 a tela de vídeo pronto continua com o dela', hrefGc?.[1] === 'wait_queue')
t('B4 as duas origens são DIFERENTES (dá para medir separado)', hrefPill?.[1] !== hrefGc?.[1])
t('B5 a pílula LIMPA a fila antes de navegar', /limparFila\(\)\s*\n\s*setFila\(null\)\s*\n[\s\S]{0,200}router\.push/.test(pill))

console.log('\nC — NÃO PROMETE O QUE NÃO CUMPRE (render em voo recusaria)')
t('C1 filaVisivel exige que NÃO haja render rodando', /const filaVisivel =[\s\S]{0,160}probe\?\.state !== 'rendering'/.test(pill))
t('C2 a impressão também exige', /const filaPillVisible =[\s\S]{0,160}probe\?\.state !== 'rendering'/.test(pill))
t('C3 suprimida onde o dono da fila é a própria tela', /if \(suppressed\) \{[\s\S]{0,220}setFila\(null\)/.test(pill))

console.log('\nD — FRONTEIRA COM O CODEX (nada de oferta/preço)')
const semComentarios = pill.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
t('D0 a fatia sem comentários não é vazia', semComentarios.length > 6000)
for (const proibido of ['stripe', 'checkout', 'price', 'upgrade', 'coupon', 'trial']) {
  t(`D-${proibido} ausente do código`, !new RegExp(proibido, 'i').test(semComentarios))
}

console.log('\nE — O CARTÃO DE FILA NÃO DISPARA NADA')
const i = pill.indexOf('function FilaLinedUpPill(')
const cartao = i >= 0 ? pill.slice(i) : ''
t('E0 a fatia do cartão tem tamanho real', cartao.length > 900)
for (const proibido of ['fetch(', 'router.push', 'handleGenerate', 'trackEvent', 'localStorage']) {
  t(`E-${proibido} ausente do cartão`, !cartao.includes(proibido))
}
t('E6 o cartão só recebe callbacks por prop', /onGo: \(ideia: IdeiaNaFila\) => void/.test(cartao) && /onDismiss: \(\) => void/.test(cartao))

console.log('\nF — TELEMETRIA')
t('F1 emite next_idea_pill_shown', /next_idea_pill_shown/.test(pill))
t('F2 a impressão não recontamina a cada rota (chave = semente)', /filaShownRef\.current === fila\.seed/.test(pill))
t('F3 next_idea_started carrega source=render_pill', /next_idea_started'[\s\S]{0,120}source: 'render_pill'/.test(pill))
t('F4 next_idea_cleared carrega source=render_pill', /next_idea_cleared'[\s\S]{0,120}source: 'render_pill'/.test(pill))
t('F5 waited_s medido do savedAt', /waited_s: Math\.max\(0, Math\.floor\(\(Date\.now\(\) - ideia\.savedAt\)/.test(pill))

console.log('\nG — ORDEM NO PICO DE ALEGRIA: a ideia DELA ganha da sugestão')
const j = pill.indexOf("if (!isRendering && (nextSeed ||")
const k = pill.indexOf('function FilaLinedUpPill(')
const bloco = j >= 0 && k > j ? pill.slice(j, k) : ''
t('G0 a fatia do cartão de pronto tem tamanho real', bloco.length > 1500)
t('G1 com fila, "Next episode" some e vira "Series"', /nextSeed && !\(filaVisivel && fila\)/.test(bloco) && /Series/.test(bloco))
t('G2 "Make it now" é o botão verde (flex-1)', /handleFilaGo\(fila\)[\s\S]{0,320}flex-1/.test(bloco))
t('G3 o botão verde de fila vem DEPOIS do Series no DOM (é o último = primário à direita)', bloco.indexOf('Series') < bloco.indexOf('Make it now'))
t('G4 o subtítulo mostra a ideia guardada quando existe', /filaVisivel && fila \? `Next: \$\{fila\.seed\}` : nextSeed/.test(bloco))
t('G5 a condição do cartão aceita fila SEM semente de série', /\(nextSeed \|\| \(filaVisivel && fila\)\)/.test(pill))

console.log('\nH — A FILA CONTINUA SENDO A MESMA LIB (nenhuma segunda definição)')
t('H1 a lib continua sem imports', !/^import /m.test(fila))
t('H2 a pílula NÃO redefine a chave do localStorage da fila', !pill.includes('kineo_proxima_ideia'))
t('H3 a pílula NÃO redefine TTL', !pill.includes('FILA_TTL'))
t('H4 a lib segue exportando lerIdeiaDaFila/limparFila', /export function lerIdeiaDaFila/.test(fila) && /export function limparFila/.test(fila))

console.log(`\n${ok}/${ok + bad} verificações`)
if (bad > 0) process.exit(1)
