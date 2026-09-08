#!/usr/bin/env node
/**
 * GUARDIÃO — a carta dos "duas vezes" sai na ordem da RECÊNCIA DA INTENÇÃO.
 *
 * O erro que este guardião trava (medido em 07/09/2026, rotação #14):
 * a fila era ordenada por `b.films - a.films` ("quem mais entregou primeiro").
 * As 30 primeiras cartas foram para uma coorte cuja intenção tinha MEDIANA de
 * 23,4 dias — zero dentro de 48h, zero dentro de 7 dias — enquanto 25 pessoas
 * com intenção mais nova que 7 dias (4 delas dentro de 48h) ficaram na fila
 * por terem feito MENOS filmes. Zero retornos, zero cliques, zero pagamentos.
 *
 * A casa já tinha a prova de que isso estava invertido: em 90 dias, 12
 * pagantes, 10 deles em menos de 48h do primeiro checkout, e nenhum pagante
 * orgânico depois do D2.
 *
 * Estilo readFileSync de propósito: guardião com alias `@/` morre no import
 * antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
 * Leitura normalizada de CRLF (memória `guardiao-crlf-falso-vermelho`).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const ROTA = 'app/api/admin/send-second-try-1usd/route.ts'
const src = ler(ROTA)

let ok = 0
let mau = 0
const check = (nome, condicao) => {
  if (condicao) { ok += 1; console.log(`  ✅ ${nome}`) }
  else { mau += 1; console.log(`  ❌ ${nome}`) }
}

console.log('\n== A ORDEM DA FILA É A RECÊNCIA, NÃO A CONTAGEM DE FILMES ==')

// O bloco do `.sort` que decide quem recebe a carta. Ancorado na linha
// inteira do `const alvos`, não por substring solta (memória
// `ancora-por-prefixo-orfana-a-guarda`).
const iAlvos = src.indexOf('const alvos = candidatos')
check('a fila `const alvos` existe', iAlvos > 0)
const blocoSort = src.slice(iAlvos, iAlvos + 2000)
const iSort = blocoSort.indexOf('.sort(')
check('a fila é ordenada', iSort > 0)
const corpoSort = blocoSort.slice(iSort, blocoSort.indexOf('\n\n', iSort) + 1 || iSort + 600)

// A verificação que importa: o PRIMEIRO critério é lastCheckoutAt.
const primeiroCriterio = corpoSort.replace(/\s+/g, ' ').match(/\.sort\(\s*\(a, b\) =>\s*([^|]+)\|\|/)
check('o sort tem um primeiro critério seguido de desempate', !!primeiroCriterio)
check(
  'o PRIMEIRO critério da fila é `lastCheckoutAt` (recência), não `films`',
  !!primeiroCriterio && primeiroCriterio[1].includes('lastCheckoutAt'),
)
check(
  'o primeiro critério NÃO é contagem de filmes',
  !!primeiroCriterio && !primeiroCriterio[1].includes('films'),
)
check(
  'a recência é comparada em ordem DECRESCENTE (b antes de a: mais novo primeiro)',
  /\(b\.lastCheckoutAt \?\? ''\)\.localeCompare\(a\.lastCheckoutAt \?\? ''\)/.test(corpoSort),
)
check(
  '`films` sobrevive apenas como DESEMPATE, depois de um `||`',
  /\|\|\s*b\.films - a\.films/.test(corpoSort.replace(/\s+/g, ' ')),
)
check(
  'intenção sem carimbo (`null`) não é tratada como recente: cai para `\'\'`',
  corpoSort.includes("lastCheckoutAt ?? ''"),
)
// Falsificação da regressão exata que aconteceu: o sort antigo começava por films.
check(
  'REGRESSÃO TRAVADA: o sort não começa mais por `b.films - a.films`',
  !/\.sort\(\s*\(a, b\) =>\s*b\.films - a\.films/.test(corpoSort.replace(/\s+/g, ' ')),
)

console.log('\n== O DRY-RUN MOSTRA A IDADE DA INTENÇÃO DO LOTE ==')

const iDry = src.indexOf("mode: 'DRY_RUN'")
check('o dry-run existe', iDry > 0)
const blocoDry = src.slice(iDry, src.indexOf('})', iDry))
check(
  'o dry-run publica `intent_age_days`',
  /intent_age_days:\s*intentAgeReport\(/.test(blocoDry),
)
check(
  'a idade é medida sobre o LOTE que vai sair (`slice(0, batch)`), não sobre a fila inteira',
  /intentAgeReport\(alvos\.slice\(0, batch\)\)/.test(blocoDry),
)

console.log('\n== A FUNÇÃO DE IDADE É PURA E HONESTA ==')

const iFn = src.indexOf('export function intentAgeReport')
check('`intentAgeReport` é exportada (testável, sem I/O)', iFn > 0)
const fn = src.slice(iFn, src.indexOf('\n}\n', iFn))
check('recebe `now` injetável — o guardião pode fixar o relógio', /now: Date = new Date\(\)/.test(fn))
check('devolve a mediana', /median/.test(fn))
check('devolve quantos estão dentro de 48h', /within_48h:\s*idades\.filter\(\(d\) => d <= 2\)/.test(fn))
check('devolve quantos estão dentro de 7 dias', /within_7d:\s*idades\.filter\(\(d\) => d <= 7\)/.test(fn))
check('devolve quantos passaram de 30 dias', /older_than_30d/.test(fn))
check(
  'data ilegível NÃO vira idade 0 — é descartada (`Number.isFinite`)',
  // Exigir a forma `.filter(...)` E negar a forma que a substitui: só
  // procurar "Number.isFinite" passava verde num mutante que trocava o filtro
  // por `.map((d) => (Number.isFinite(d) ? d : 0))` — a substring sobrevivia.
  /\.filter\(\(d\) => Number\.isFinite\(d\)\)/.test(fn) && !/\? d : 0/.test(fn),
)
check(
  'quem não tem carimbo é contado à parte em `unknown`, não somado como recente',
  /unknown:\s*batch\.length - idades\.length/.test(fn),
)
check('a mediana ordena antes de escolher o meio', /\.sort\(\(a, b\) => a - b\)/.test(fn))
check(
  'a mediana trata lote PAR (média dos dois centrais), não só ímpar',
  /idades\.length \/ 2 - 1\]/.test(fn) && /idades\[idades\.length \/ 2\]/.test(fn),
)
check('lote vazio devolve mediana `null`, nunca 0', /idades\.length === 0\s*\?\s*null/.test(fn))

console.log('\n== A RAZÃO FICA ESCRITA ONDE O PRÓXIMO VAI LER ==')
// Um comentário que justifica por "soa certo" envelhece mal; este cita o
// número medido (memória `comentario-que-justifica-envelhece`).
// A justificativa vive ENTRE `const alvos` e o `.sort(` — não dentro do corpo
// do comparador. Ancorar no corpo dava vermelho por recorte, não por defeito.
const razao = blocoSort.slice(0, iSort)
check('a razão fica escrita imediatamente antes do sort', razao.length > 0)
check('o comentário do sort cita a prova dos 90 dias / D2', /D2/.test(razao) && /48h/.test(razao))
check('o comentário do sort cita o custo medido (23,4 dias de mediana)', /23,4/.test(razao))

console.log(`\n${mau === 0 ? '✅' : '❌'} ${ok} verdes / ${mau} vermelhos\n`)
process.exit(mau === 0 ? 0 : 1)
