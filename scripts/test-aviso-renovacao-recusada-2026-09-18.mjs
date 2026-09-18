// KINEO-AVISO-RENOVACAO-RECUSADA-2026-09-18 — guardião: assinante com cobrança recusada vê o aviso dentro do produto.
// Sem rede, sem banco. Decisão pura (com mutante) + montagem no layout + o banner só consulta a Stripe com assinatura.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => { throw new Error('sem imports') })
  return m.exports
}

console.log('1) decisão pura')
const libSrc = rd('lib/billing/renewalNotice.ts')
const lib = roda(libSrc)
checa('past_due com assinatura → visível', lib.decideRenewalNotice({ hasStripeSubscription: true, status: 'past_due' }).visible === true)
checa('unpaid (Stripe desistiu sem cancelar) → visível', lib.decideRenewalNotice({ hasStripeSubscription: true, status: 'unpaid' }).visible === true)
checa('active → invisível', lib.decideRenewalNotice({ hasStripeSubscription: true, status: 'active' }).reason === 'in_good_standing')
checa('trialing → invisível', lib.decideRenewalNotice({ hasStripeSubscription: true, status: 'trialing' }).visible === false)
checa('canceled → invisível (já virou free; não há cartão para consertar)', lib.decideRenewalNotice({ hasStripeSubscription: true, status: 'canceled' }).visible === false)
checa('sem assinatura → invisível, sem consultar', lib.decideRenewalNotice({ hasStripeSubscription: false, status: 'past_due' }).reason === 'no_subscription')
checa('status desconhecido (Stripe fora) → invisível', lib.decideRenewalNotice({ hasStripeSubscription: true, status: null }).reason === 'status_unknown')
checa('rótulos de plano', lib.renewalNoticePlanLabel('basic') === 'Creator' && lib.renewalNoticePlanLabel('starter_trial') === 'Starter' && lib.renewalNoticePlanLabel('pro') === 'Studio' && lib.renewalNoticePlanLabel(null) === 'Kineo')
const copy = lib.renewalNoticeCopy('Creator')
checa('copy diz o plano, que o plano segue e que crédito novo espera o pagamento', copy.title.includes('Creator') && /still on/.test(copy.body) && /new credits/.test(copy.body))

console.log('2) mutante: o status deixa de decidir')
const mut = libSrc.replace("if (!RENEWAL_NOTICE_STATUSES.has(input.status)) return { visible: false, reason: 'in_good_standing', version }", "if (false) return { visible: false, reason: 'in_good_standing', version }")
checa('mutante aplicou', mut !== libSrc)
checa('mutante é pego (active viraria aviso)', roda(mut).decideRenewalNotice({ hasStripeSubscription: true, status: 'active' }).visible === true)

console.log('3) banner e layout')
const b = rd('components/RenewalDeclinedBanner.tsx')
checa('banner consulta a Stripe viva via /api/me/subscription', b.includes("fetch('/api/me/subscription'"))
checa('… e só quando há assinatura Stripe no perfil', /useEffect\(\(\) => \{\s*\n\s*if \(!hasStripeSubscription\) return/.test(b))
checa('decisão importada da lib, não redigitada', b.includes("from '@/lib/billing/renewalNotice'") && !b.includes("'past_due'"))
checa('botão abre o portal da Stripe (cartão novo)', b.includes("fetch('/api/stripe/portal', { method: 'POST'") && b.includes('window.location.assign(j.url)'))
checa('impressão e clique medidos', b.includes("trackEvent('renewal_declined_banner_shown'") && b.includes("trackEvent('renewal_declined_banner_clicked'"))
const lay = rd('app/(dashboard)/layout.tsx')
checa('layout lê stripe_subscription_id do perfil', lay.includes("'is_pro, email, trial_status, has_paid, plan, video_credits, stripe_subscription_id'"))
checa('layout monta o banner para usuário logado', lay.includes("import RenewalDeclinedBanner from '@/components/RenewalDeclinedBanner'") && /\{user && \(\s*\n\s*<RenewalDeclinedBanner/.test(lay))
const sub = rd('app/api/me/subscription/route.ts')
checa('/api/me/subscription devolve o status vivo da Stripe', sub.includes('status: sub.status ?? null'))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
