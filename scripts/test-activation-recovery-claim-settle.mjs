// sprint-assinaturas #8 (02/09/2026) — a sonda /api/compose/active dizendo
// 'none' com menos de 60s desde o `dispatched:<ts>` NAO libera o recovery
// automatico: o claim do 1o despacho assenta ~12s depois (e7f9f000: F5 as
// 02:53:21, claim as 02:53:29) e um 'none' nessa janela e o buraco pelo qual
// 489a2c31 (01/09) e e7f9f000 (02/09) passaram COM o #2 no ar. Le o arquivo
// REAL e prova a espera, o teto, o fail-closed e que nada novo gera/cobra.
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

// constantes: 60s de janela, re-sonda a cada 5s, teto de 14 (>= 60/5 + folga)
const m = /const ACTIVATION_RECOVERY_CLAIM_SETTLE_MS = (\d[\d_]*)\s*\nconst ACTIVATION_RECOVERY_SETTLE_REPROBE_MS = (\d[\d_]*)\s*\nconst ACTIVATION_RECOVERY_SETTLE_MAX_PROBES = (\d+)/.exec(src)
ok(!!m, 'as 3 constantes existem, juntas, antes do componente')
const settle = Number(m[1].replace(/_/g, '')), reprobe = Number(m[2].replace(/_/g, '')), max = Number(m[3])
ok(settle === 60_000, 'janela de assentamento = 60s (5x os ~12s medidos)')
ok(reprobe === 5_000, 're-sonda a cada 5s')
ok(max * reprobe >= settle, 'teto de re-sondagens cobre a janela inteira (teto*5s >= 60s)')
ok(max <= 20, 'teto e finito e curto (relogio torto termina em skip, nao em laco)')

const i0 = src.indexOf('const dispatchedRecovery = recoveryEligible')
ok(i0 > 0, 'guarda do #2 existe')
const block = src.slice(i0, src.indexOf('activationAutostartDecisionRef.current = true', i0))
ok(block.length > 500 && block.length < 6000, 'bloco delimitado ate a decisao de despachar')

// ordem: busy/unknown pulam ANTES de qualquer espera (rendering em qualquer sondagem = skip na hora)
const iBusy = block.indexOf("consumeAndSkip(verdict === 'busy' ? 'server_render_in_flight' : 'server_probe_unavailable')")
const iSettle = block.indexOf('const dispatchedAtMs')
ok(iBusy > 0 && iSettle > iBusy, "'rendering'/'completed'/unknown decidem antes da janela de assentamento")

// le o ts do proprio sessionStorage (dispatched:<ms>)
ok(/Number\(consumedState\?\.slice\('dispatched:'\.length\)\)/.test(block), 'ts vem do `dispatched:<ms>` gravado no despacho')
ok(/Number\.isFinite\(dispatchedAtMs\)\s*\?\s*Math\.max\(0, Date\.now\(\) - dispatchedAtMs\)\s*:\s*ACTIVATION_RECOVERY_CLAIM_SETTLE_MS/.test(block), 'ts ilegivel = janela vencida (comportamento do #2); ts no futuro = 0s (espera)')

// espera: dentro da janela, volta a 'pending', rearma a sonda e agenda o tick
const wait = block.slice(block.indexOf('if (sinceDispatchMs < ACTIVATION_RECOVERY_CLAIM_SETTLE_MS)'), block.indexOf('metadata.settle_probes = activationRecoverySettleProbesRef.current\n      metadata.secs_after_first'))
ok(wait.length > 200, 'ramo de espera existe')
ok(/activationRecoveryServerVerdictRef\.current = 'pending'/.test(wait), "veredito volta a 'pending' (a proxima sondagem e nova)")
ok(/activationRecoveryProbeStartedRef\.current = false/.test(wait), 'sonda rearmada')
ok(/activationRecoverySettleProbesRef\.current \+= 1/.test(wait), 'conta a re-sondagem')
ok(/setTimeout\(\(\) => \{\s*setActivationAutostartWaitTick\(\(v\) => v \+ 1\)\s*\}, ACTIVATION_RECOVERY_SETTLE_REPROBE_MS\)/.test(wait), 'tick agendado com o intervalo de re-sonda')
ok(/return \(\) => clearTimeout\(settleTick\)/.test(wait), 'cleanup do effect cancela o tick')
ok(/void trackEvent\('activation_autostart_waiting'/.test(wait) && /reason: 'server_claim_settling'/.test(wait) && /secs_after_first/.test(wait), 'evento de espera (uma vez) com motivo e segundos desde o 1o despacho')
ok(/activationRecoverySettleLoggedRef\.current = true/.test(wait), 'evento de espera so uma vez')
ok(/>= ACTIVATION_RECOVERY_SETTLE_MAX_PROBES\)/.test(wait) && /consumeAndSkip\('server_probe_unavailable'\)/.test(wait), 'teto atingido = skip fail-closed (nunca despacha)')
const iCap = wait.indexOf('ACTIVATION_RECOVERY_SETTLE_MAX_PROBES)'), iInc = wait.indexOf('activationRecoverySettleProbesRef.current += 1')
ok(iCap > 0 && iCap < iInc, 'teto e testado ANTES de contar (laco termina)')

// depois da janela: segue para o recovery com rastro
ok(/metadata\.settle_probes = activationRecoverySettleProbesRef\.current\n\s*metadata\.secs_after_first = Math\.round\(sinceDispatchMs \/ 1000\)/.test(block), 'recovery_eligible carrega settle_probes e secs_after_first (para medir a corrida)')

// refs novas nascem zeradas
ok(/activationRecoverySettleProbesRef = useRef\(0\)/.test(src), 'contador nasce em 0')
ok(/activationRecoverySettleLoggedRef = useRef\(false\)/.test(src), 'flag do evento nasce false')

// nada novo chama geracao, cobranca, navegacao ou fala de dinheiro
const added = block.slice(iSettle).split('\n').filter(l => !l.trim().startsWith('//'))
const forbidden = ['handleGenerate', 'fetch(', 'router.push', 'setError(', 'trackGenerationFailure', 'openOutOfCredits', 'price', 'checkout', 'coupon', 'stripe', 'upgrade', 'plan']
for (const f of forbidden) ok(!added.some(l => l.toLowerCase().includes(f.toLowerCase())), `bloco novo nao contem '${f}'`)

// guardas antigas intactas
ok(/consumedState\?\.startsWith\('dispatched:'\) === true && !paidAccount/.test(src), 'guarda D1 (conta paga nunca recupera dispatched) intacta')
ok(/consumedState !== 'eligible'/.test(block), "'eligible' (nada gasto) continua recuperando sem sonda nem espera")

console.log(`\n${n - fail}/${n} verificacoes${fail ? ' — FALHOU' : ''}`)
process.exit(fail ? 1 : 0)
