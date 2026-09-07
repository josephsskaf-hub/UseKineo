// A assinatura que a Stripe ainda está cobrando não pode virar 'free'.
// Sem rede, sem banco, sem credencial, sem escrita em produção.
//
// O que este guardião protege (medido em 07/09/2026): os dois pontos do webhook
// que REVOGAM acesso escreviam `status === 'active' || status === 'trialing'` à
// mão. `past_due` ficava de fora, então a primeira fatura de renovação recusada
// derrubava o cliente para `plan='free'` no mesmo instante — enquanto a Stripe
// ainda ia repetir o cartão por dias. Duas assinaturas reais morreram assim.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// CRLF normalizado na leitura: sem isto toda asserção multi-linha fica vermelha
// no checkout do Windows e verde no Linux, sem defeito nenhum no produto.
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

const access = read('lib/billing/subscriptionAccess.ts')
const webhook = read('app/api/stripe/webhook/route.ts')
const mrr = read('app/api/admin/_shared/mrr.ts')

let total = 0
let failed = 0
function check(name, condition) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}`)
}

console.log('\nKINEO — dunning grace: a cobrança em curso não vira free\n')

// ── 1. A fonte única existe e classifica cada estado no lado certo ───────────
check(
  'past_due é um estado de cobrança em curso, não de acesso corrente',
  /STRIPE_DUNNING_STATUSES\s*=\s*\[\s*'past_due'/.test(access) &&
    !/STRIPE_ACCESS_STATUSES\s*=\s*\[[^\]]*'past_due'/.test(access)
)
check(
  'incomplete NÃO ganha carência: nunca houve dinheiro',
  /STRIPE_REVOKE_STATUSES\s*=\s*\[[^\]]*'incomplete'/.test(access) &&
    !/STRIPE_DUNNING_STATUSES\s*=\s*\[[^\]]*'incomplete'/.test(access)
)
check(
  'os estados terminais da Stripe revogam',
  ['unpaid', 'canceled', 'incomplete_expired', 'paused'].every((s) =>
    new RegExp(`STRIPE_REVOKE_STATUSES\\s*=\\s*\\[[^\\]]*'${s}'`).test(access)
  )
)
// Amarra na COMPOSIÇÃO que decide, não na contagem de texto: quem troca o corpo
// de keepsAccess por `true` (ou por só `isCurrent`) cai aqui.
check(
  'keepsAccess é corrente OU em cobrança — as duas metades',
  /export function stripeSubscriptionKeepsAccess[\s\S]{0,220}?stripeSubscriptionIsCurrent\(status\)\s*\|\|\s*stripeSubscriptionIsDunning\(status\)/.test(
    access
  )
)

// ── 2. Os DOIS pontos de revogação do webhook usam a fonte única ────────────
check(
  'o webhook importa a fonte única',
  /import\s*\{[^}]*stripeSubscriptionKeepsAccess[^}]*\}\s*from\s*'@\/lib\/billing\/subscriptionAccess'/.test(
    webhook
  )
)
check(
  'customer.subscription.updated decide por keepsAccess',
  /const isActive = stripeSubscriptionKeepsAccess\(subscription\.status\)/.test(webhook)
)
check(
  'invoice.payment_failed decide por keepsAccess',
  /if \(stripeSubscriptionKeepsAccess\(failedSubscription\.status\)\) \{/.test(webhook)
)
// O predicado do cobrador não pode ser redigitado ao lado do que ele substituiu.
check(
  'nenhum ponto de revogação voltou a escrever o predicado à mão',
  !/const isActive =\s*\n?\s*subscription\.status === 'active'/.test(webhook) &&
    !/if \(failedSubscription\.status === 'active'/.test(webhook)
)

// ── 3. Manter acesso tem que deixar rastro, senão ninguém mede ──────────────
check(
  'preservar acesso durante a cobrança emite evento',
  webhook.includes("name: 'subscription_access_held_during_dunning'")
)
check(
  'o evento só sai no ramo de cobrança em curso, não em todo acesso mantido',
  /if \(stripeSubscriptionIsDunning\(failedSubscription\.status\)\) \{[\s\S]{0,400}?subscription_access_held_during_dunning/.test(
    webhook
  )
)

// ── 4. A contradição que provou o defeito não pode voltar ───────────────────
// O painel conta past_due como receita viva. Se o produto voltar a tratar
// past_due como free, os livros e o produto discordam de novo.
check(
  'o painel de MRR continua contando past_due como receita viva',
  /sub\.status === 'past_due'/.test(mrr)
)

console.log(`\n${total - failed}/${total} checks passed\n`)
process.exit(failed === 0 ? 0 : 1)
