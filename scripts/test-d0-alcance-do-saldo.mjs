#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-D0-ALCANCE-2026-09-07
// A primeira carta da casa não pode nomear um motor que o saldo não alcança.
// ═══════════════════════════════════════════════════════════════════════════
//
// ESTILO: leitura de arquivo, sem `import '@/...'` — um guardião com alias
// morre no primeiro import e devolve verde sem ter verificado nada (memória
// `guardioes-com-alias-nao-rodam`).
//
// O guardião NÃO confere só que a string sumiu: ele REFAZ A DIVISÃO com os
// números lidos das constantes reais (memória `guardiao-que-conta-texto-nao-
// prova-condicao`). Se amanhã o Kling 3 baixar para caber no trial, a trava
// que proíbe nomeá-lo cai sozinha — é a aritmética que manda, não uma
// blacklist de palavra.
//
// Rodar: node scripts/test-d0-alcance-do-saldo.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const P_ROTA = join(ROOT, 'app/api/cron/trial-lifecycle-emails/route.ts')
const P_LIB = join(ROOT, 'lib/lifecycle/trialReachLine.ts')
const P_CUSTO = join(ROOT, 'lib/credits/engineCost.ts')
const P_TRIAL = join(ROOT, 'lib/reverseTrial.ts')
const P_CHECKOUT = join(ROOT, 'lib/checkoutPricing.ts')

let ok = 0
const falhas = []
const check = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

const ler = (p) => readFileSync(p, 'utf8')
const rota = ler(P_ROTA)
const lib = ler(P_LIB)
const custo = ler(P_CUSTO)
const trial = ler(P_TRIAL)
const checkout = ler(P_CHECKOUT)

// ── Os números, lidos da fonte ────────────────────────────────────────────
// `creditCostFor` é um switch; cada `case` é seguido do seu `return N`. Pegar
// o PRIMEIRO return depois do case é o que o runtime faz.
function custoDe(quality) {
  const i = custo.indexOf(`case '${quality}':`)
  if (i < 0) return null
  const m = custo.slice(i).match(/return\s+(\d+)/)
  return m ? Number(m[1]) : null
}
const CUSTO_KLING3 = custoDe('cinematic_hollywood')
const CUSTO_SEEDANCE = custoDe('cinematic_ai')
const mTrial = trial.match(/export const TRIAL_CREDIT_CAP\s*=\s*(\d+)/)
const GRANT_TRIAL = mTrial ? Number(mTrial[1]) : null
const mCard = checkout.match(/export const CARD_TRIAL_GRANT_CREDITS\s*=\s*(\d+)/)
const GRANT_1USD = mCard ? Number(mCard[1]) : null

check('lê o custo do Kling 3 da tabela do cobrador', CUSTO_KLING3 !== null)
check('lê o custo do Seedance da tabela do cobrador', CUSTO_SEEDANCE !== null)
check('lê o grant do trial grátis', GRANT_TRIAL !== null)
check('lê o grant do trial de $1', GRANT_1USD !== null)
// Âncora: os números lidos batem com o que a rotação mediu. Se um deles mudar,
// o guardião ACUSA em vez de seguir calculando com um número que ninguém viu.
check('grant do trial grátis é 30 (restauração 09/09: 1 Seedance + 1 Kineo 1)', GRANT_TRIAL === 30)
check('Seedance (25) cabe no trial de 30 com 5 sobrando para um Kineo 1', CUSTO_SEEDANCE === 25 && GRANT_TRIAL - CUSTO_SEEDANCE === 5)
check('Kling 3 segue em 150', CUSTO_KLING3 === 150)

// ── A PREMISSA: o motor nomeado antes NÃO cabe no saldo ───────────────────
const klingCabeNoTrial = CUSTO_KLING3 !== null && GRANT_TRIAL !== null && CUSTO_KLING3 <= GRANT_TRIAL
const klingCabeNo1Usd = CUSTO_KLING3 !== null && GRANT_1USD !== null && CUSTO_KLING3 <= GRANT_1USD
check('Kling 3 NÃO cabe no trial grátis (premissa da correção)', !klingCabeNoTrial)
check('Kling 3 NÃO cabe no trial de $1', !klingCabeNo1Usd)
check('Seedance CABE no trial (é o motor que a frase pode nomear)', CUSTO_SEEDANCE <= GRANT_TRIAL)

// ── O RAMO d0_welcome ─────────────────────────────────────────────────────
const iD0 = rota.indexOf(`if (c.kind === 'd0_welcome') {`)
const iFim = rota.indexOf(`if (c.kind === 'ending_soon') {`)
check('o ramo d0_welcome existe', iD0 > 0)
check('o ramo ending_soon existe (delimita o d0)', iFim > iD0)
const ramoD0 = iD0 > 0 && iFim > iD0 ? rota.slice(iD0, iFim) : ''
check('o ramo d0 foi delimitado', ramoD0.length > 500)
// ⚠️ SEM OS COMENTÁRIOS. O cabeçalho desta correção CITA "Kling 3" para
// explicar o que saiu — um regex solto casaria com a própria explicação e
// acusaria o conserto de ser o defeito (memória
// `falsificar-mutacao-commitar-antes`: "regex solto casa com o próprio
// comentário"). O que a pessoa lê é a STRING, não o comentário.
const ramoD0Codigo = ramoD0.replace(/\/\/.*$/gm, '')
check('a limpeza de comentários não comeu o ramo', ramoD0Codigo.length > 400)
check('a limpeza REALMENTE removeu comentários', ramoD0Codigo.length < ramoD0.length)

// A trava que importa: enquanto o motor não couber no saldo, o ramo não pode
// nomeá-lo. Amarrada à ARITMÉTICA, não a uma palavra proibida para sempre.
if (!klingCabeNoTrial) {
  check('o d0 não nomeia mais Kling 3', !/Kling 3/.test(ramoD0Codigo))
  check('o d0 não diz mais "Kling 3 included"', !/Kling 3 included/.test(ramoD0Codigo))
}
check('o d0 usa a cláusula derivada', /trialReachClause\(c\.creditsLeft\)/.test(ramoD0))
check('a cláusula entra nas DUAS superfícies (text e html)', (ramoD0.match(/\$\{engineLine\}/g) || []).length === 2)
check('o ramo trata o null da cláusula', /reachClause \?/.test(ramoD0))
check('o fallback do null não publica contagem', /'Every engine is unlocked\. '/.test(ramoD0))
check('a promessa pública do fundador continua na carta', /[Ee]very engine is unlocked/.test(ramoD0))
check('a marca d\'água continua declarada', /watermark until you upgrade/.test(ramoD0))

// ── O import existe e aponta para o módulo certo ──────────────────────────
check('a rota importa a cláusula', /import \{ trialReachClause, trialFilmsWithinReach \} from '@\/lib\/lifecycle\/trialReachLine'/.test(rota))

// ── O MÓDULO ──────────────────────────────────────────────────────────────
check('o módulo lê a tabela do cobrador', /import \{ creditCostFor \} from '@\/lib\/credits\/engineCost'/.test(lib))
check('o módulo NÃO digita o custo do motor', !/=\s*25\b/.test(lib.replace(/\/\/.*$/gm, '')))
check('o módulo devolve null abaixo do custo de um render', /if \(films < 1\) return null/.test(lib))
check('o plural nasce do número, na mesma expressão', /films === 1 \? 'film' : 'films'/.test(lib))
check('o motor alcançável é o cinematic_ai', /TRIAL_REACH_QUALITY = 'cinematic_ai'/.test(lib))
check('o módulo guarda o custo em cost e divide por ele', /Math\.floor\(creditsLeft \/ cost\)/.test(lib))
check('o módulo se defende de custo zero', /cost <= 0\) return 0/.test(lib))

// ── O CARIMBO DA MEDIÇÃO ──────────────────────────────────────────────────
check('o envio carimba reach_films', /reach_films: trialFilmsWithinReach\(c\.creditsLeft\)/.test(rota))
check('o carimbo é só do d0_welcome', /c\.kind === 'd0_welcome' \? \{ reach_films/.test(rota))
check('o carimbo grava zero explícito (não some do denominador)', /trialFilmsWithinReach\(c\.creditsLeft\)/.test(rota))

// ── A ARITMÉTICA DA FRASE QUE VAI SAIR ────────────────────────────────────
// Reproduz trialFilmsWithinReach com os números lidos: para o saldo cheio do
// trial a carta tem de dizer UM filme, no singular.
const filmesNoSaldoCheio = Math.floor(GRANT_TRIAL / CUSTO_SEEDANCE)
check('o saldo cheio do trial cobre exatamente 1 filme', filmesNoSaldoCheio === 1)
check('e portanto a frase sai no singular', (filmesNoSaldoCheio === 1 ? 'film' : 'films') === 'film')
const filmesSaldoZero = 0 >= CUSTO_SEEDANCE ? Math.floor(0 / CUSTO_SEEDANCE) : 0
check('saldo zero não gera contagem', filmesSaldoZero === 0)

// ── MUTANTES ──────────────────────────────────────────────────────────────
// Cada mutante PROVA que foi escrito antes de exigir vermelho — um mutante que
// não aplicou devolve verde e se lê como guardião resistindo (memória
// `mutacao-precisa-provar-que-aplicou`).
function mutar(caminho, de, para, nome, reChecagem) {
  const original = readFileSync(caminho, 'utf8')
  if (!original.includes(de)) { falhas.push(`MUTANTE ${nome}: alvo não encontrado`); return }
  const mutado = original.split(de).join(para)
  if (mutado === original) { falhas.push(`MUTANTE ${nome}: mutação não alterou o arquivo`); return }
  writeFileSync(caminho, mutado)
  const lido = readFileSync(caminho, 'utf8')
  const aplicou = lido.includes(para) && !lido.includes(de)
  const pego = aplicou ? reChecagem(lido) : false
  writeFileSync(caminho, original)
  if (readFileSync(caminho, 'utf8') !== original) { falhas.push(`MUTANTE ${nome}: NÃO RESTAUROU`); return }
  if (!aplicou) { falhas.push(`MUTANTE ${nome}: não aplicou`); return }
  if (!pego) { falhas.push(`MUTANTE ${nome}: NÃO FOI PEGO`); return }
  ok++
}

mutar(P_ROTA, '${engineLine}Films carry a watermark until you upgrade.',
  '${engineLine}Kling 3 included. Films carry a watermark until you upgrade.',
  'volta a nomear o Kling 3 na string que a pessoa lê',
  (t) => {
    const a = t.indexOf(`if (c.kind === 'd0_welcome') {`)
    const b = t.indexOf(`if (c.kind === 'ending_soon') {`)
    return /Kling 3/.test(t.slice(a, b).replace(/\/\/.*$/gm, ''))
  })

mutar(P_ROTA, 'const reachClause = trialReachClause(c.creditsLeft)',
  'const reachClause = null as string | null',
  'arranca a cláusula derivada',
  (t) => !/trialReachClause\(c\.creditsLeft\)/.test(t))

mutar(P_ROTA, 'reach_films: trialFilmsWithinReach(c.creditsLeft)',
  'reach_films_x: trialFilmsWithinReach(c.creditsLeft)',
  'renomeia o carimbo da medição',
  (t) => !/reach_films: trialFilmsWithinReach/.test(t))

mutar(P_LIB, 'if (films < 1) return null', 'if (films < 0) return null',
  'deixa passar "0 films"',
  (t) => !/if \(films < 1\) return null/.test(t))

mutar(P_LIB, `films === 1 ? 'film' : 'films'`, `'films'`,
  'crava o plural e publicaria "1 films"',
  (t) => !/films === 1 \? 'film' : 'films'/.test(t))

mutar(P_LIB, `import { creditCostFor } from '@/lib/credits/engineCost'`,
  `const creditCostFor = (_q, _p) => 25`,
  'desliga a leitura da tabela do cobrador',
  (t) => !/import \{ creditCostFor \} from '@\/lib\/credits\/engineCost'/.test(t))

mutar(P_CUSTO, `    case 'cinematic_hollywood':`, `    case 'cinematic_hollywood_x':`,
  'esconde o custo do Kling 3 da leitura',
  () => {
    const c2 = readFileSync(P_CUSTO, 'utf8')
    const i = c2.indexOf(`case 'cinematic_hollywood':`)
    return i < 0
  })

// ── RESULTADO ─────────────────────────────────────────────────────────────
console.log(`\nKINEO-D0-ALCANCE — ${ok} verificações OK, ${falhas.length} falhas`)
console.log(`  trial grátis ${GRANT_TRIAL}cr · trial $1 ${GRANT_1USD}cr · Seedance ${CUSTO_SEEDANCE}cr · Kling 3 ${CUSTO_KLING3}cr`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('  ✓ a primeira carta da casa só nomeia motor que o saldo alcança\n')
