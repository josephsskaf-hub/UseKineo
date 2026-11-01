// KINEO-CARTAO-RECUSADO-0111c — o aviso dentro do app segue a mesma regra dos e-mails de cartão recusado: quem agendou o
// cancelamento (cancel_at_period_end ou cancel_at) não vê "update your card" e não é levado a pagar o período que recusou.
// Rodar: npx tsx scripts/test-cartao-banner-0111c.mts
import fs from 'node:fs'
import { decideRenewalNotice } from '../lib/billing/renewalNotice'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const base = { hasStripeSubscription: true, status: 'past_due' as string | null }
ok(decideRenewalNotice(base).visible === true, 'past_due sem informação de cancelamento continua visível')
const cancelado = decideRenewalNotice({ ...base, cancelScheduled: true })
ok(cancelado.visible === false && cancelado.reason === 'cancel_scheduled', 'cancelamento agendado esconde o aviso (cancel_scheduled)')
ok(decideRenewalNotice({ ...base, cancelScheduled: false }).visible === true, 'cancelScheduled=false mantém o aviso')
ok(decideRenewalNotice({ ...base, status: 'active', cancelScheduled: false }).visible === false, 'assinatura em dia nunca mostra o aviso')

const rota = fs.readFileSync('app/api/me/subscription/route.ts', 'utf8')
ok(/Boolean\(sub\.cancel_at_period_end\) \|\| Boolean\(sub\.cancel_at\)/.test(rota), '/api/me/subscription conta cancel_at como cancelamento agendado')
const banner = fs.readFileSync('components/RenewalDeclinedBanner.tsx', 'utf8')
ok(/decideRenewalNotice\(\{ hasStripeSubscription, status, cancelScheduled \}\)/.test(banner), 'o banner passa cancelScheduled para a decisão')
ok(/setCancelScheduled\(j\.cancelsAtPeriodEnd === true\)/.test(banner), 'o banner lê cancelsAtPeriodEnd da resposta')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
