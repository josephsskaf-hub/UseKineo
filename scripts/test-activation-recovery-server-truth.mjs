// sprint-assinaturas #2 (02/09/2026) — o recovery automatico de `dispatched:*`
// (conta gratis) so pode re-despachar com a sonda /api/compose/active dizendo
// 'none'. Le o arquivo REAL e prova a guarda, o fail-closed e que nada novo
// chama geracao/cobranca/preco.
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

const i0 = src.indexOf('const dispatchedRecovery = recoveryEligible')
ok(i0 > 0, 'guarda existe')
const block = src.slice(i0, i0 + 2200)
ok(/consumedState !== 'eligible'/.test(block), "'eligible' (nada gasto) continua recuperando sem sonda")
ok(/verdict === 'pending'/.test(block) && /return\s*\n/.test(block), 'sonda pendente = espera (return), nao despacha')
ok(/refreshServerActiveRender\(\)\.then/.test(block), 'usa a MESMA sonda do lock do compose (/api/compose/active)')
ok(/probe !== null\s*\?\s*'busy'/.test(block), "'rendering' ou 'completed' (probe nao-nulo) = busy, resumavel ou nao")
ok(/serverProbeProvesIdleRef\.current && !serverProbeDegradedRef\.current\s*\?\s*'idle'/.test(block), "idle so com 200 lido ate o fim, state!='rendering' e nao degraded")
ok(/:\s*'unknown'/.test(block), '401/500/rede/degraded = unknown')
ok(/verdict !== 'idle'/.test(block) && /consumeAndSkip\(verdict === 'busy' \? 'server_render_in_flight' : 'server_probe_unavailable'\)/.test(block), 'busy e unknown pulam com motivo proprio (fail-closed)')
ok(/metadata\.server_state = serverActiveRenderRef\.current\?\.state/.test(block), 'evento skipped carrega o estado do servidor')
ok(/setActivationAutostartWaitTick\(\(v\) => v \+ 1\)/.test(block), 'reentra no effect quando a sonda responde')
ok(src.includes("activationAutostartWaitTick,\n"), 'o tick esta nas dependencias do effect')

// as refs novas existem e nascem fechadas
ok(/activationRecoveryServerVerdictRef = useRef<'pending' \| 'idle' \| 'busy' \| 'unknown'>\('pending'\)/.test(src), "veredito nasce 'pending'")
ok(/activationRecoveryProbeStartedRef = useRef\(false\)/.test(src), 'sonda dispara uma vez')
ok(/serverProbeDegradedRef = useRef\(false\)/.test(src) && /serverProbeDegradedRef\.current = data\.degraded === true/.test(src), 'degraded lido da resposta real')

// nada novo chama geracao, cobranca, navegacao ou fala de dinheiro
const added = block.split('\n').filter(l => !l.trim().startsWith('//'))
const forbidden = ['handleGenerate', 'fetch(', 'router.push', 'setError(', 'trackGenerationFailure', 'openOutOfCredits', 'price', 'checkout', 'coupon', 'stripe', 'upgrade', 'plan']
for (const f of forbidden) ok(!added.some(l => l.toLowerCase().includes(f.toLowerCase())), `bloco novo nao contem '${f}'`)

// a guarda D1 de conta paga continua intacta
ok(/consumedState\?\.startsWith\('dispatched:'\) === true && !paidAccount/.test(src), 'guarda D1 (conta paga nunca recupera dispatched) intacta')
// a rota da sonda ainda devolve rendering/resumable:false para o claim cinematic
const route = readFileSync(new URL('../app/api/compose/active/route.ts', import.meta.url), 'utf8')
ok(/resumable: false/.test(route) && /cinematic_submission_claim/.test(route), 'sonda ve o claim cinematic settled (rendering, resumable:false)')

console.log(`\n${n - fail}/${n} verificacoes${fail ? ' — FALHOU' : ''}`)
process.exit(fail ? 1 : 0)
