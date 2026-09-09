// KINEO-TROCA-DE-PLANO-2026-09-09 — guardião: assinante troca de plano sem cancelar,
// a Stripe recebe o preço da fonte única, a renovação lê o tier novo, e a fatura
// de proration nunca é tratada como renovação.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

console.log('== a rota ==')
const r = rd('app/api/stripe/change-plan/route.ts')
checa('só starter/basic/pro trocam', /SWITCHABLE = new Set<CheckoutTier>\(\['starter', 'basic', 'pro'\]\)/.test(r))
checa('precisa de assinatura Stripe (PayPal e sem assinatura → 409)', /paypal_subscription' : 'no_subscription'/.test(r) && /status: 409/.test(r))
checa('mesmo plano → 409', /error: 'same_plan'/.test(r))
checa('dono conferido pelo metadata da assinatura', /sub\.metadata\.supabase_user_id !== user\.id/.test(r) && /status: 403/.test(r))
checa('só active ou trialing', /sub\.status !== 'active' && sub\.status !== 'trialing'/.test(r))
checa('anual fora do escopo (409 annual_needs_support)', /interval !== 'month'/.test(r) && /annual_needs_support/.test(r))
checa('preço do plano novo vem da fonte única (TIER_PRICES[target].usd)', /unit_amount: TIER_PRICES\[target\]\.usd/.test(r) && !/unit_amount: \d/.test(r))
checa('metadata.tier e plan_credits carimbados (é de lá que a renovação lê)', /tier: target,\s*\n\s*plan_credits: String\(TIER_CREDITS\[target\]\)/.test(r))
checa('trial troca sem proration; ativo rateia na próxima fatura', /proration_behavior: trialing \? 'none' : 'create_prorations'/.test(r))
checa('perfil: plano vira <tier>_trial no trial e <tier> quando ativo', /plan: trialing \? `\$\{target\}_trial` : target/.test(r))
checa('créditos sobem só no upgrade de assinatura ativa (delta ≥ 0)', /const delta = !trialing && currentTier \? Math\.max\(0, TIER_CREDITS\[target\] - TIER_CREDITS\[currentTier\]\) : 0/.test(r) && /if \(delta > 0\) patch\.video_credits = before \+ delta/.test(r))
checa('escrita no perfil pela chave de serviço (RLS não deixa o cliente mudar plano)', /createAdminClient\(url, svc/.test(r))
checa('evento plan_changed nos dois desfechos', (r.match(/name: PLAN_CHANGED_EVENT/g) || []).length === 2)
checa('GET não chama a Stripe (só o perfil)', !/stripe\.subscriptions\.retrieve/.test(r.slice(0, r.indexOf('export async function POST'))))

console.log('== os dois lugares de preço ==')
const pc = rd('app/pricing/PricingClient.tsx')
const cards = rd('components/PricingCards.tsx')
checa('/pricing: assinante vai para a troca, não para o checkout', /if \(planSwitch\.subscribed && \(tier === 'starter' \|\| tier === 'basic' \|\| tier === 'pro'\)\)/.test(pc) && /void handleSwitchPlan\(tier/.test(pc))
checa('/pricing: rótulo "Current plan" / "Switch to X" via planSwitchLabel', /planSwitchLabel\(planSwitch, p\.tier as SwitchableTier, p\.name\)/.test(pc))
checa('/pricing: confirma antes de trocar e mostra o desfecho', /window\.confirm\(planSwitchConfirmText/.test(pc) && /data-testid="plan-switch-notice"/.test(pc))
checa('cards do app: mesma regra (assinante troca, não compra)', /if \(planSwitch\.subscribed && \(tier === 'starter' \|\| tier === 'basic' \|\| tier === 'pro'\)\) \{ void handleSwitchPlan\(tier\); return \}/.test(cards))
checa('cards do app: rótulos dos três planos passam pelo planSwitchLabel', (cards.match(/planSwitchLabel\(planSwitch, '(starter|basic|pro)'/g) || []).length === 3)
checa('cards do app: o botão do trial de $1 some para quem já assina', /secondary=\{planSwitch\.subscribed \? null : \{ label: CARD_TRIAL_SECONDARY_LABEL/.test(cards))
const lib = rd('lib/growth/planSwitch.ts')
checa('helper: POST /api/stripe/change-plan e textos de erro honestos', /fetch\('\/api\/stripe\/change-plan', \{\s*\n?\s*method: 'POST'/.test(lib) && /Nothing was changed/.test(lib) && /annual_needs_support/.test(lib))

console.log('== o webhook ==')
const wh = rd('app/api/stripe/webhook/route.ts')
const iCreate = wh.indexOf("if (billingReason === 'subscription_create') break")
const iUpdate = wh.indexOf("if (billingReason === 'subscription_update') {")
const iGrant = wh.indexOf('const renewalCredits = renewalCreditsFor(')
checa('fatura de proration (subscription_update) sai ANTES do grant de renovação', iCreate > 0 && iUpdate > iCreate && iGrant > iUpdate)
checa('proration deixa rastro (subscription_update_invoice_paid)', /name: 'subscription_update_invoice_paid'/.test(wh))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — troca de plano sem cancelar: rota, dois lugares de preço e webhook alinhados')
