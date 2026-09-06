#!/usr/bin/env node
// ═══ GUARDIÃO DO CADEADO DA TEMPORADA (sprint-assinaturas #31) ═════════════
//
// O QUE ESTE ARQUIVO IMPEDE DE VOLTAR: a faixa da temporada pintar os cinco
// episódios como disponíveis para quem só tem saldo para um, e por isso NÃO
// mostrar a moldura que convida para o plano.
//
// O caso 1 abaixo é a ÚNICA exposição real da faixa em produção (06/09), com
// os números que o próprio evento `season_shown` gravou:
//   balance 5 · episode_cost 5 · episodes 5 · affordable_episodes 1 · locked 0
// `locked: 0` era o defeito. Depois desta entrega o mesmo caso tem de dar 4.
//
// Este guardião EXECUTA a função real (transpila lib/temporada.ts e chama-a);
// não conta texto. Um mutante que troque a conta acumulada pela conta por
// episódio derruba o caso 1 (memória `guardiao-contar-texto-nao-prova-condicao`).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
// CRLF no checkout do Windows não pode virar vermelho falso.
const read = (p) => readFileSync(join(root, p), 'utf8').split('\r\n').join('\n')

let checks = 0
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }
function ok(value, label) { assert.ok(value, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const temporada = loadTs('lib/temporada.ts')
const { acessoDaTemporada, TOTAL_EPISODIOS, PRIMEIRO_EPISODIO, ULTIMO_EPISODIO } = temporada

ok(typeof acessoDaTemporada === 'function', 'a função do cadeado é exportada e executável')
equal(TOTAL_EPISODIOS, 5, 'a faixa continua a pintar cinco episódios')
equal(ULTIMO_EPISODIO - PRIMEIRO_EPISODIO + 1, TOTAL_EPISODIOS, 'o total é derivado da faixa 2..6')

// ── CASO 1 — a exposição real de 06/09. Era 0; tem de ser 4. ───────────────
{
  const balance = 5
  const custo = 5
  const acumulada = Math.min(TOTAL_EPISODIOS, Math.floor(balance / custo)) // = 1, a conta da rota
  const a = acessoDaTemporada(5, acumulada)
  equal(a.liberados, 1, 'caso real: o saldo de 5 paga UM episódio de 5')
  equal(a.bloqueados, 4, 'caso real: quatro episódios ficam atrás do plano (era 0 — o defeito)')
  ok(a.bloqueados > 0, 'caso real: a moldura de monetização RENDERIZA')
}

// ── CASO 2 — saldo zero: tudo bloqueado, oferta visível. ───────────────────
{
  const a = acessoDaTemporada(5, 0)
  equal(a.liberados, 0, 'saldo zero não libera episódio nenhum')
  equal(a.bloqueados, 5, 'saldo zero bloqueia os cinco')
}

// ── CASO 3 — saldo do trial (25cr, episódio de 5): paga os cinco, sem oferta.
{
  const a = acessoDaTemporada(5, Math.min(5, Math.floor(25 / 5)))
  equal(a.liberados, 5, 'o trial inteiro paga a temporada toda')
  equal(a.bloqueados, 0, 'quem paga tudo não vê cadeado nem oferta')
}

// ── CASO 4 — saldo maior que a temporada não inventa episódios. ────────────
{
  const a = acessoDaTemporada(5, 99)
  equal(a.liberados, 5, 'liberados nunca passa do que a faixa pinta')
  equal(a.bloqueados, 0, 'e bloqueados nunca fica negativo')
}

// ── CASO 5 — custo desconhecido NÃO vira zero. ─────────────────────────────
for (const desconhecido of [null, undefined, Number.NaN]) {
  const a = acessoDaTemporada(5, desconhecido)
  equal(a.liberados, 5, `custo desconhecido (${String(desconhecido)}) não tranca a faixa`)
  equal(a.bloqueados, 0, `custo desconhecido (${String(desconhecido)}) não inventa oferta`)
}

// ── CASO 6 — meio da tabela, o degrau que faz a oferta existir. ────────────
{
  const a = acessoDaTemporada(5, 3)
  equal(a.liberados, 3, 'três pagos')
  equal(a.bloqueados, 2, 'dois atrás do plano')
}

// ── CASO 7 — faixa vazia não estoura. ──────────────────────────────────────
{
  const a = acessoDaTemporada(0, 1)
  equal(a.liberados, 0, 'faixa vazia libera zero')
  equal(a.bloqueados, 0, 'faixa vazia bloqueia zero')
}

// ── A TELA ESTÁ AMARRADA À FUNÇÃO, e não à conta por episódio. ─────────────
const strip = read('components/video/SeasonStrip.tsx')
ok(strip.includes("import { acessoDaTemporada } from '@/lib/temporada'"), 'a faixa importa a função do cadeado')
ok(
  strip.includes('const { liberados, bloqueados } = acessoDaTemporada(episodes.length, affordableEpisodes)'),
  'a faixa deriva o cadeado da conta ACUMULADA',
)
ok(strip.includes('const desbloqueado = i < liberados'), 'o cadeado de cada episódio é POSICIONAL')
ok(strip.includes('disabled={!desbloqueado}'), 'o botão desabilita pelo posicional')
ok(
  !/disabled=\{!ep\.affordable\}/.test(strip),
  'a conta por episódio ("cabe UM?") não decide mais o botão',
)
ok(
  !/bloqueados = episodes\.filter/.test(strip),
  'a contagem de bloqueados não volta a ser filtro por episódio',
)
ok(strip.includes('locked: acesso.bloqueados'), 'o evento reporta o MESMO locked que a tela pinta')
ok(strip.includes('offer_shown: acesso.bloqueados > 0'), 'o evento diz se a moldura renderizou')
ok(strip.includes('{bloqueados > 0 ?'), 'a moldura continua atrás de bloqueados > 0')

// ── A ROTA continua a emitir a conta acumulada que a tela consome. ─────────
const rota = read('app/api/season/route.ts')
ok(
  /affordableEpisodes:\s*custo && custo > 0 \? Math\.min\(TOTAL_EPISODIOS, Math\.floor\(balance \/ custo\)\) : null/.test(rota),
  'a rota continua a devolver a conta acumulada intacta',
)
ok(rota.includes('creditCostForDuration'), 'o custo continua a vir da conta do cobrador, não digitado')

console.log(`OK — ${checks} verificações do cadeado da temporada`)
