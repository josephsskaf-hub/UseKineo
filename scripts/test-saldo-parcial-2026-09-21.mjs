// KINEO-SALDO-PARCIAL-2026-09-21 — guardião: recusa parcial por saldo da fal estorna e avisa; too_few no resgate estorna e encerra.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

console.log('1) rota: recusa PARCIAL por saldo aborta, estorna e avisa')
const rota = rd('app/api/generate-video-cinematic/route.ts')
const ini = rota.indexOf("let validIds = falRequestIds.filter((id): id is string => id !== null)")
const bloco = rota.slice(ini, rota.indexOf('if (!hasRenderableClassicScene(falRequestIds))', ini))
checa('o bloco novo vem DEPOIS de conhecer os ids aceitos e ANTES da decisão de zero aceitas', ini > 0 && bloco.includes('KINEO-SALDO-PARCIAL-2026-09-21'))
checa('condição amarrada ao flag que só o 403 balance_quota liga, e a pelo menos 1 aceita (o zero já tem ramo)', bloco.includes('if (ctxDespacho().balanceExhausted && validIds.length > 0) {'))
checa('estorna pelo mesmo releaseBirthClaim, com motivo próprio', bloco.includes("await releaseBirthClaim('provider_balance_rejected_partial')"))
checa('grava claimAction/refundConfirmed no ledger do despacho', bloco.includes("c.claimAction = released ? 'released' : 'release_failed'") && bloco.includes('c.refundConfirmed = released'))
checa('alarme ao fundador com PARTIAL e contagem', bloco.includes('await alertFalExhausted(`PARTIAL user=') && bloco.includes('accepted=${validIds.length}/${scenes.length}'))
checa('estorno não confirmado → 503 pedindo retry, nunca segue em frente', bloco.includes('if (!released) {') && bloco.includes("status: 503"))
checa('estorno confirmado → mensagem calma com "refunded automatically" e queued', bloco.includes('queued: true') && bloco.includes('your credits were refunded automatically'))
checa('o flag só nasce de balance_quota', rota.includes("if (despachoCena.outcome.reason_class === 'balance_quota') c.balanceExhausted = true"))
// mutante: sem o bloco, 4/8 aceitas passam direto para a publicação
const semBloco = rota.replace(/    \/\/ ═══ KINEO-SALDO-PARCIAL-2026-09-21[\s\S]*?\n    }\n\n    \/\/ Do not silently downgrade/, '    // Do not silently downgrade')
checa('mutante (bloco removido) é pego', !semBloco.includes('provider_balance_rejected_partial') && semBloco.length < rota.length)

console.log('2) cron de resgate: too_few é terminal')
const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
const c0 = cron.indexOf("if (collected.state === 'too_few') {")
const c1 = cron.indexOf("if (collected.state !== 'ready') {", c0)
const cb = cron.slice(c0, c1)
checa('ramo too_few existe ANTES do pulo genérico (que só logava)', c0 > 0 && c1 > c0)
checa('referência de cobrança lida do claim (resolution_reference)', cb.includes("md.resolution_reference"))
checa('estorno idempotente (refundRenderCredits) + confirmação por refunded_at', cb.includes('await refundRenderCredits(billingReference)') && cb.includes("select('refunded_at')"))
checa('sem confirmação → deixa para o refund-sweep, não libera o claim', cb.includes('too_few_refund_unconfirmed') && cb.indexOf('too_few_refund_unconfirmed') < cb.indexOf('releaseCinematicClaim('))
checa('claim liberado com motivo que a biblioteca ACEITA para claim settled (provider_failed_refunded) → poller da aba recebe 404', cb.includes("reason: 'provider_failed_refunded', reference: billingReference") && rd('lib/cinematic/claim.ts').includes("/^provider_(all_failed|failed|abandoned)_refunded$/"))
checa('liberação que falha vira desfecho terminal e não grava estorno de 0 (laço de 21/09)', cb.includes('too_few_release_failed') && cb.includes('if (refunded > 0 || released.ok) {'))
checa('rastro credits_refunded com why too_few e done/total/dead', cb.includes("name: 'credits_refunded'") && cb.includes("why: 'too_few', done: collected.done, total: collected.total, dead: collected.dead"))
checa('encerra a rodada (continue) — nunca mais gira no mesmo claim', /continue\s*\}\s*$/.test(cb))
checa('import de releaseCinematicClaim', cron.includes("loadVerifiedCinematicClaim, releaseCinematicClaim } from '@/lib/cinematic/claim'"))
checa('o poller trata 404 como "créditos devolvidos" (contrato do outro lado)', rd('app/(dashboard)/generate/GenerateClient.tsx').includes("'This generation was closed and your credits were already returned"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
