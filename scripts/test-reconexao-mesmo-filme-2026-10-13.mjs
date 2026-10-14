// KINEO-RECONEXAO-MESMO-FILME-2026-10-13 — guardião do conserto da reconexão da mesma geração.
// Caso real (13/10 19:36, conta TR, filme grátis de região de 15 s): débito de 9 às 19:36:49; a tela reconectou com o MESMO
// generationId às 19:36:59; saldo 5 < 9 → 402 credits_held_by_render pelo crédito do PRÓPRIO filme → tela "failed", painel FAILED,
// e o filme só chegou pelo resgate do servidor 14 min depois. Este guardião prova, lendo a rota:
//   1. a leitura do débito é DESTA geração (render_id cinematic-<claimId>), vivo (refunded_at nulo), do mesmo dono, e falha fechada;
//   2. o portão de saldo é pulado SÓ quando essa leitura é verdadeira, e o saldo real volta antes do claim;
//   3. TRAVA 8.2: só linhas marcadas — retiradas, a rota volta à base byte a byte (base = pai do 1º commit com a marca).
// Mutantes: ROTA_ALVO=<arquivo> roda contra uma cópia mutada (scripts/test-reconexao-mesmo-filme-2026-10-13.mutantes.sh).
import { readFileSync } from 'node:fs'
import { desfazAncoraLegenda1410 } from './test-support/desfaz-ancora-legenda-1410.mjs' // reancorado KINEO-ANCORA-LEGENDA-1410 [TRAVA 8.2 — vai do fundador 14/10]: Seedance com still em todas as cenas + legenda 9:16 centralizada saem em memória antes do byte a byte
import { execFileSync } from 'node:child_process'
import { desfazRomanceAdulto } from './test-support/desfaz-romance-adulto-1310.mjs' // reancorado KINEO-LEVA7-1310: o conserto do romance (13/10) também sai, em memória, antes do byte a byte
import { semContratoClassicos1410 } from "./test-support/desfaz-contrato-classicos-1410.mjs" // reancorado KINEO-CONTRATO-CLASSICOS-1410: o contrato clássico (14/10) sai, em memória, antes do byte a byte
import { desfazParceiroEyebible2_1410 } from './test-support/desfaz-parceiro-eyebible-2-1410.mjs' // reancorado KINEO-PARCEIRO-EYEBIBLE-2-1410 [TRAVA 8.2 — vai do fundador 14/10]: a 2ª leva do Robert/EyeBible sai em memória antes do byte a byte

const MARCA = 'KINEO-RECONEXAO-MESMO-FILME-2026-10-13'
const CAMINHO = 'app/api/generate-video-cinematic/route.ts'
const rota = readFileSync(process.env.ROTA_ALVO || CAMINHO, 'utf8').replace(/\r\n/g, '\n')
let ok = 0
let falhas = 0
const checa = (nome, cond) => { if (cond) { ok++; console.log(`  ✓ ${nome}`) } else { falhas++; console.log(`  ✗ ${nome}`) } }

// ── 1. a leitura ──
const ini = rota.indexOf('async function geracaoJaDebitada(')
const fim = rota.indexOf('\n} // ' + MARCA, ini)
const helper = ini >= 0 && fim > ini ? rota.slice(ini, fim) : ''
checa('helper geracaoJaDebitada existe', helper.length > 0)
checa('lê credit_debits pelo render_id DESTA geração', /\.from\('credit_debits'\)/.test(helper) && /\.eq\('render_id', `cinematic-\$\{cinematicClaimId\(userId, generationId\)\}`\)/.test(helper))
checa('só débito vivo e do mesmo dono conta', /return data\.user_id === userId && !data\.refunded_at/.test(helper))
checa('erro ou ausência → false (portão antigo)', /if \(error \|\| !data\) return false/.test(helper) && /catch \{ return false \}/.test(helper))
checa('sem env → false', /if \(!url \|\| !key\) return false/.test(helper))

// ── 2. o desvio do portão ──
const iDecisao = rota.indexOf('const reconexaoDoMesmoFilme = balance < cost && await geracaoJaDebitada(user.id, generationId)')
const iGuarda = rota.indexOf('const saldoDaReconexao = balance')
const iPula = rota.indexOf("if (reconexaoDoMesmoFilme) { balance = cost;")
const portoes = [...rota.matchAll(/\n    if \(balance < cost\) \{/g)].map((m) => m.index)
const iVolta = rota.indexOf('if (reconexaoDoMesmoFilme) balance = saldoDaReconexao')
const iClaim = rota.indexOf('const acquired = await acquireCinematicClaim(')
checa('a decisão só consulta o banco quando o saldo não paga (balance < cost &&)', iDecisao > 0)
checa('o saldo real é guardado ANTES do desvio', iGuarda > iDecisao && iPula > iGuarda)
checa('o desvio vem ANTES dos dois portões de saldo', portoes.length >= 2 && iPula < portoes[0])
checa('o desvio só existe sob reconexaoDoMesmoFilme (nenhum "balance = cost" solto)', (rota.match(/balance = cost\b/g) || []).length === 1)
checa('o saldo real volta DEPOIS do 2º portão e ANTES do claim', iVolta > portoes[1] && iClaim > iVolta)
checa('os dois portões da base seguem intactos (dois `if (balance < cost) {`)', portoes.length >= 2)

// ── 3. TRAVA 8.2 ──
const linhasNovas = rota.split('\n').filter((l) => /geracaoJaDebitada|reconexaoDoMesmoFilme|saldoDaReconexao/.test(l))
checa('toda linha do conserto carrega a marca', linhasNovas.length >= 5 && linhasNovas.every((l) => l.includes(MARCA)))
if (!process.env.ROTA_ALVO) {
  const git = (a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  let base = null
  try {
    const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean)
    const ref = shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
    base = git(['show', `${ref}:${CAMINHO}`]).replace(/\r\n/g, '\n')
  } catch { base = null }
  const semMarca = (s) => s.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
  checa('sem as linhas marcadas, a rota = base byte a byte', base !== null && desfazRomanceAdulto(CAMINHO, semMarca(semContratoClassicos1410(desfazParceiroEyebible2_1410(CAMINHO, desfazAncoraLegenda1410(CAMINHO, rota) /* KINEO-ANCORA-LEGENDA-1410 */), CAMINHO))) === base) /* reancorado KINEO-CONTRATO-CLASSICOS-1410 */ // reancorado KINEO-LEVA7-1310
}

console.log(`\ntest-reconexao-mesmo-filme-2026-10-13: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
