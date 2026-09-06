#!/usr/bin/env node
// ═══ GUARDIÃO DA COTA NO CADEADO DA TEMPORADA (sprint-assinaturas #32) ═════
//
// O QUE ESTE ARQUIVO IMPEDE DE VOLTAR: a faixa prometer cinco episódios
// "grátis" a quem paga em COTA e já gastou a vaga. O Kineo 1 gratuito custa 0
// CRÉDITOS — e custo 0 fazia a rota devolver `affordableEpisodes: null`, que o
// #31 traduz (de propósito) para "não invento cadeado" = cinco liberados.
//
// Medido em produção 06/09 (7 dias): 156 pessoas terminaram um filme; em 77 o
// último é `fast`; 19 dessas não têm trial ativo nem plano pago — para elas o
// episódio custa 0 e a faixa mentia.
//
// EXECUTA a função real (transpila lib/temporada.ts) e lê o texto da rota para
// provar o CALLER — contar texto não prova condição
// (memória `guardiao-contar-texto-nao-prova-condicao`), por isso todo caso de
// número chama a função de verdade.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (p) => readFileSync(join(root, p), 'utf8').split('\r\n').join('\n')

let checks = 0
function equal(a, b, l) { assert.equal(a, b, l); checks += 1 }
function ok(v, l) { assert.ok(v, l); checks += 1 }

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

const { episodiosQueCabem, acessoDaTemporada, TOTAL_EPISODIOS } = loadTs('lib/temporada.ts')
ok(typeof episodiosQueCabem === 'function', 'episodiosQueCabem é exportada e executável')

// ── CASO 1 — O DEFEITO. Kineo 1 free, cota gasta no filme 1. ──────────────
// Antes: custo 0 → affordableEpisodes null → 5 liberados, 0 bloqueados.
{
  const cabem = episodiosQueCabem({ custo: 0, saldo: 25, cotaRestante: 0, total: 5 })
  equal(cabem, 0, 'cota esgotada não paga episódio nenhum, mesmo com 25 créditos em carteira')
  const a = acessoDaTemporada(5, cabem)
  equal(a.bloqueados, 5, 'os cinco ficam atrás do plano (era 0 — o defeito)')
  ok(a.bloqueados > 0, 'a moldura de monetização RENDERIZA para quem paga em cota')
}

// ── CASO 2 — cota com uma vaga livre: um liberado, quatro atrás do plano. ──
{
  const cabem = episodiosQueCabem({ custo: 0, saldo: 0, cotaRestante: 1, total: 5 })
  equal(cabem, 1, 'uma vaga de cota paga exatamente um episódio')
  equal(acessoDaTemporada(5, cabem).bloqueados, 4, 'os outros quatro ficam bloqueados')
}

// ── CASO 3 — NÃO-SEI CONTINUA CALADO. Falha de leitura não vira cadeado. ──
{
  equal(episodiosQueCabem({ custo: 0, saldo: 5, cotaRestante: null, total: 5 }), null,
    'cota não contada (falha de leitura) devolve null, NUNCA 0')
  equal(acessoDaTemporada(5, null).bloqueados, 0, 'null mantém a moldura calada, não inventa cadeado')
  equal(episodiosQueCabem({ custo: null, saldo: 5, cotaRestante: 3, total: 5 }), null,
    'custo desconhecido continua null (ramo do #31 intacto)')
}

// ── CASO 4 — A MOEDA CRÉDITO NÃO REGREDIU (a exposição real do #31). ──────
{
  equal(episodiosQueCabem({ custo: 5, saldo: 5, cotaRestante: null, total: 5 }), 1,
    'saldo 5 / custo 5 = 1 (a conta ACUMULADA, não "cabe um?" cinco vezes)')
  equal(acessoDaTemporada(5, 1).bloqueados, 4, 'e quatro seguem atrás do plano')
  equal(episodiosQueCabem({ custo: 5, saldo: 0, cotaRestante: null, total: 5 }), 0, 'saldo zero paga zero')
  equal(episodiosQueCabem({ custo: 5, saldo: 999, cotaRestante: null, total: 5 }), 5, 'saldo alto não passa do teto da faixa')
  // Cota NÃO pode vazar para quem paga em crédito: com custo > 0 a cota é ignorada.
  equal(episodiosQueCabem({ custo: 5, saldo: 25, cotaRestante: 0, total: 5 }), 5,
    'quem paga em crédito NÃO é bloqueado por cota (cota 0 é irrelevante ali)')
}

// ── CASO 5 — O CALLER. A rota tem de usar as duas moedas de verdade. ──────
{
  const rota = read('app/api/season/route.ts')
  ok(rota.includes('episodiosQueCabem'), 'a rota chama episodiosQueCabem')
  ok(/affordableEpisodes:\s*cabem/.test(rota),
    'affordableEpisodes vem da conta das duas moedas, não de floor(balance/custo)')
  ok(!/Math\.floor\(balance \/ custo\)/.test(rota),
    'a conta antiga de uma moeda só NÃO sobreviveu na rota')
  ok(/affordable:\s*cabem === null \? custo !== null : i < cabem/.test(rota),
    'o affordable de cada episódio é POSICIONAL (i < cabem), não "custo <= saldo"')

  // O predicado do cobrador não é redigitado: vem de countsAgainstFreeQuota e
  // countFreeFastUsage (memória `predicado-do-cobrador-nao-se-redigita`).
  ok(rota.includes('ent.countsAgainstFreeQuota'),
    'quem paga em cota é decidido por countsAgainstFreeQuota, não por plano redigitado')
  ok(rota.includes('countFreeFastUsage'), 'as vagas são contadas pela MESMA função que o compose usa para recusar')
  ok(rota.includes('getFreeTierOffer'), 'limite e janela vêm de freeTierOffer, nunca digitados aqui')
  ok(rota.includes('COMPOSE_CLAIM_EVENT') && rota.includes('COMPOSE_CLAIM_PATH'),
    'o nome/caminho do evento de reserva são importados, não escritos à mão')
  ok(!/'compose_claim'/.test(rota), 'o nome errado do evento de reserva não voltou')
  ok(/oferta\.limit - uso/.test(rota), 'vagas = limite - uso, o espelho de `uso > limite` do compose')

  // A query da cota só existe para quem custa 0 — nunca para quem paga.
  ok(/custoAqui === 0/.test(rota), 'a cota só é consultada quando o episódio custa 0')

  // Campos novos = impressão digital do bundle novo no payload.
  ok(rota.includes('costCurrency'), 'o payload diz QUAL moeda decidiu')
  ok(rota.includes('freeQuotaRemaining'), 'o payload diz quantas vagas de cota sobraram')
}

// ── CASO 6 — TETO E BORDAS. ───────────────────────────────────────────────
{
  equal(episodiosQueCabem({ custo: 0, saldo: 0, cotaRestante: 99, total: 5 }), 5, 'cota alta não passa do teto')
  equal(episodiosQueCabem({ custo: 0, saldo: 0, cotaRestante: -3, total: 5 }), 0, 'cota negativa vira 0, não negativo')
  equal(episodiosQueCabem({ custo: 0, saldo: 0, cotaRestante: 1.9, total: 5 }), 1, 'cota fracionária arredonda para baixo')
  equal(episodiosQueCabem({ custo: 5, saldo: -10, cotaRestante: null, total: 5 }), 0, 'saldo negativo paga zero')
  equal(episodiosQueCabem({ custo: 0, saldo: 0, cotaRestante: 3, total: 0 }), 0, 'faixa vazia devolve 0')
  equal(TOTAL_EPISODIOS, 5, 'a faixa continua a pintar cinco episódios')
}

console.log(`test-season-cota: ${checks} verificações OK`)
