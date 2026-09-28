// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-STRIPE-ATRASO-2026-09-28 — a Stripe passou a cobrar por 2
// meses (8 tentativas; antes 4 em 3 semanas). Três furos que a janela longa
// transforma em dinheiro perdido ou em churn invisível.
// ═══════════════════════════════════════════════════════════════════════════
// C1 · o checkout NÃO rebaixa quem está em atraso. O reparo de perfil do
//      app/api/stripe/checkout/route.ts decidia acesso com o literal
//      active/trialing: uma pessoa em past_due que clicava num card de assinar
//      virava plan='free'/is_pro=false. Agora usa a regra única
//      stripeSubscriptionKeepsAccess (lib/billing/subscriptionAccess.ts).
// C2 · fim de assinatura vira evento. O case customer.subscription.deleted
//      rebaixava certo e não gravava nada: `subscription_ended` nasce DEPOIS do
//      update, com o saldo lido no MESMO select, e é só-servidor.
// C3 · renovação que credita fatura paga em atraso e é idempotente por fatura.
//      O portão aceita past_due (e o descarte vira `renewal_ignored_non_access`);
//      a chave `renewal_granted:${invoice.id}` em stripe_events é CONSULTADA
//      antes do update de saldo e INSERIDA depois (falha na inserção = log).
//
// Estilo: readFileSync + regex sobre o texto com CRLF normalizado; o predicado
// real é TRANSPILADO e executado; mutantes em MEMÓRIA (nenhum arquivo é
// escrito no repo). Sem rede, sem banco, sem alias @/.
//
// Rodar: node scripts/test-stripe-atraso-2-meses-2026-09-28.mjs

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHECKOUT = join(root, 'app', 'api', 'stripe', 'checkout', 'route.ts')
const WEBHOOK = join(root, 'app', 'api', 'stripe', 'webhook', 'route.ts')
const EVENTS = join(root, 'app', 'api', 'events', 'route.ts')
const ACCESS = join(root, 'lib', 'billing', 'subscriptionAccess.ts')
// A ponta de origin/main em que este conserto nasceu. Fixa de propósito: comparar
// com uma ref que anda faria o guardião mudar de opinião sozinho.
const BASE_COMMIT = '10c59ed9'

const norm = (s) => s.replace(/\r\n/g, '\n')
const read = (p) => norm(readFileSync(p, 'utf8'))
const count = (text, needle) => text.split(needle).length - 1
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let total = 0
let failed = 0
function check(name, cond) {
  total += 1
  if (!cond) {
    failed += 1
    console.error(`  FAIL ${name}`)
  } else {
    console.log(`  ok   ${name}`)
  }
}

// ── recortes ─────────────────────────────────────────────────────────────────
function slice(text, startNeedle, endNeedle) {
  const a = text.indexOf(startNeedle)
  if (a < 0) return ''
  const b = text.indexOf(endNeedle, a + startNeedle.length)
  return b < 0 ? '' : text.slice(a, b)
}
const checkoutBlock = (t) => slice(t, '  if (existingCustomerSubscription) {\n', '\n  // Provider-less Pro may be an admin grant')
const renewalBlock = (t) => slice(t, "      case 'invoice.payment_succeeded': {", "      case 'customer.subscription.trial_will_end': {")
const deletedBlock = (t) => slice(t, "      case 'customer.subscription.deleted': {", "      case 'invoice.payment_failed': {")
function serverOnlyList(t) {
  const body = slice(t, 'const SERVER_ONLY_EVENTS = new Set([', '\n])')
  const live = body.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
  return new Set([...live.matchAll(/'([^']+)'/g)].map((m) => m[1]))
}
// Corpo de um `if (...) {` até o primeiro `break` do mesmo ramo.
function branchBody(block, ifRegex) {
  const m = ifRegex.exec(block)
  if (!m) return null
  const rest = block.slice(m.index + m[0].length)
  const b = rest.search(/\n\s*break\n/)
  return b < 0 ? null : rest.slice(0, b)
}

// ═══ C1 · checkout ════════════════════════════════════════════════════════════
function checkoutFailures(t) {
  const f = []
  const c = (name, cond) => { if (!cond) f.push(name) }
  const block = checkoutBlock(t)
  c('C1.0 bloco existingCustomerSubscription encontrado', block.length > 0)
  c('C1.1 import da regra única de @/lib/billing/subscriptionAccess',
    /import\s*\{\s*stripeSubscriptionKeepsAccess\s*\}\s*from\s*'@\/lib\/billing\/subscriptionAccess'/.test(t))
  c('C1.2 grantsAccess = stripeSubscriptionKeepsAccess(existingCustomerSubscription.status)',
    count(block, 'const grantsAccess = stripeSubscriptionKeepsAccess(existingCustomerSubscription.status)') === 1)
  c('C1.3 o literal antigo active/trialing sumiu (0 no arquivo)',
    count(t, "status === 'active' || existingCustomerSubscription.status === 'trialing'") === 0)
  c('C1.4 ninguém fora do bloco depende de grantsAccess',
    count(t, 'grantsAccess') > 0 && count(t, 'grantsAccess') === count(block, 'grantsAccess'))
  c('C1.5 sem acesso continua virando free (incomplete/unpaid/paused)',
    /\} else if \(!grantsAccess\) \{\s*\n\s*repair\.plan = 'free'/.test(block) && /is_pro: grantsAccess,/.test(block))
  c('C1.6 o bloqueio da segunda assinatura continua no bloco',
    /return redirectError\('You already have a Kineo subscription\./.test(t.slice(t.indexOf('  if (existingCustomerSubscription) {\n'))) &&
      /duplicate checkout blocked:', user\.id, existingCustomerSubscription\.id, existingCustomerSubscription\.status\)\s*\n\s*return redirectError\('You already have a Kineo subscription\./.test(t))
  return f
}

// ═══ C2 · fim de assinatura ═══════════════════════════════════════════════════
function deletedFailures(t) {
  const f = []
  const c = (name, cond) => { if (!cond) f.push(name) }
  const block = deletedBlock(t)
  c('C2.0 case customer.subscription.deleted encontrado', block.length > 0)
  c('C2.1 o que o case grava no perfil NÃO mudou',
    /\.update\(\{\s*\n\s*is_pro: false,\s*\n\s*plan: 'free',\s*\n\s*stripe_subscription_id: null,\s*\n\s*cinematic_tokens: 0,\s*\n\s*\}\)\s*\n\s*\.eq\('stripe_customer_id', customerId\)\s*\n\s*\.eq\('stripe_subscription_id', subscription\.id\)\s*\n\s*\.select\('id, video_credits'\)\s*\n\s*\.maybeSingle\(\)/.test(block))
  const upd = block.indexOf('.update({')
  const errThrow = block.search(/if \(subscriptionDeleteErr\) \{\s*\n\s*throw new RetryableEntitlementError\(/)
  const ev = block.search(/writeServerEvent\(\{\s*\n\s*name: 'subscription_ended'/)
  c('C2.2 subscription_ended é gravado DEPOIS do update e do throw de erro',
    upd >= 0 && errThrow > upd && ev > errThrow)
  c('C2.3 um único subscription_ended no webhook', count(t, "name: 'subscription_ended'") === 1)
  c('C2.4 o evento só sai quando o perfil foi achado',
    ev > 0 && /if \(deletedSubscriptionProfile\?\.id\) \{\s*\n\s*const \w+ = await writeServerEvent\(\{\s*\n\s*name: 'subscription_ended'/.test(block))
  const call = ev >= 0 ? block.slice(ev, block.indexOf('\n          })', ev)) : ''
  c('C2.5 metadata: version/source/subscription_ref/tier/reason/credits_left',
    /version: 'stripe_subscription_ended_v1'/.test(call) &&
      /source: 'stripe_webhook'/.test(call) &&
      /subscription_ref: subscription\.id/.test(call) &&
      /tier: subscription\.metadata\?\.tier \?\? null/.test(call) &&
      /reason: subscription\.cancellation_details\?\.reason \?\? null/.test(call) &&
      /credits_left: [^\n]*deletedSubscriptionProfile\.video_credits/.test(call))
  c('C2.6 metadata sem e-mail', call.length > 0 && !/email/i.test(call))
  return f
}

// ═══ C3 · renovação ═══════════════════════════════════════════════════════════
// A fórmula da renovação, como estava em origin/main (10c59ed9). Nenhuma destas
// linhas pode mudar: o conserto é sobre QUANDO renovar, nunca sobre QUANTO.
const FORMULA_PINNED = [
  "if (billingReason === 'subscription_create') break",
  "if (billingReason === 'subscription_update') {",
  'const renewalCredits = renewalCreditsForInvoice(renewalTier, invoice.amount_paid, invoice.currency)',
  "const renewalCinematicTokens = (renewalTier === 'pro' || renewalTier === 'autopilot') ? 1 : 0",
  'const renovacao = renewalBalance(renewalProfile.video_credits, renewalCredits)',
  'video_credits: renovacao.balance, // KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25',
  'is_pro: true,',
  'plan: renewalTier,',
  'cinematic_tokens: renewalCinematicTokens,',
]
const FORMULA_LINE = /renewalCredits|renovacao|renewalCinematicTokens|video_credits|billingReason ===|renewalBalance/

function renewalFailures(t) {
  const f = []
  const c = (name, cond) => { if (!cond) f.push(name) }
  const block = renewalBlock(t)
  c('C3.0 case invoice.payment_succeeded encontrado', block.length > 0)

  // (a) portão pela regra única
  c('C3.1 a renovação usa !stripeSubscriptionKeepsAccess(subscription.status)',
    count(block, 'if (!stripeSubscriptionKeepsAccess(subscription.status)) {') === 1)
  c('C3.2 o portão active/trialing sumiu do case',
    !/subscription\.status !== 'active' && subscription\.status !== 'trialing'/.test(block))
  const ignored = branchBody(block, /if \(!stripeSubscriptionKeepsAccess\(subscription\.status\)\) \{/)
  c('C3.3 o ramo ignorado grava renewal_ignored_non_access {invoice_ref, subscription_ref, status}',
    ignored !== null &&
      /writeServerEvent\(\{\s*\n\s*name: 'renewal_ignored_non_access'/.test(ignored) &&
      /invoice_ref: invoice\.id/.test(ignored) &&
      /subscription_ref: subscriptionId/.test(ignored) &&
      /status: subscription\.status/.test(ignored) &&
      /entitlementConfirmed = true/.test(ignored) &&
      !/email/i.test(ignored))

  // (b) idempotência por fatura
  const keyDef = /const (\w+) = invoice\.id \? `renewal_granted:\$\{invoice\.id\}` : null/.exec(block)
  c('C3.4 a chave renewal_granted:${invoice.id} existe (uma vez)',
    keyDef !== null && count(block, '`renewal_granted:${invoice.id}`') === 1)
  const KEY = keyDef ? keyDef[1] : '__sem_chave__'
  const lookupRe = new RegExp(`\\.from\\('stripe_events'\\)\\s*\\n\\s*\\.select\\('id'\\)\\s*\\n\\s*\\.eq\\('id', ${esc(KEY)}\\)`, 'g')
  const insertRe = new RegExp(`\\.from\\('stripe_events'\\)\\s*\\n\\s*\\.insert\\(\\{ id: ${esc(KEY)} \\}\\)`, 'g')
  const lookups = [...block.matchAll(lookupRe)]
  const inserts = [...block.matchAll(insertRe)]
  const updM = /\.update\(\{\s*\n\s*video_credits: renovacao\.balance/.exec(block)
  const upd = updM ? updM.index : -1
  const renewThrow = block.search(/if \(renewErr \|\| !renewedProfile\?\.id\) \{\s*\n\s*throw new RetryableEntitlementError\(/)
  c('C3.5 uma consulta e uma inserção da chave', lookups.length === 1 && inserts.length === 1)
  c('C3.6 a chave é CONSULTADA antes do update de saldo',
    keyDef !== null && lookups.length === 1 && upd > 0 && keyDef.index < lookups[0].index && lookups[0].index < upd)
  c('C3.7 a chave é INSERIDA depois do update bem-sucedido (depois do throw de falha)',
    inserts.length === 1 && upd > 0 && renewThrow > upd && inserts[0].index > renewThrow)
  const granted = branchBody(block, new RegExp(`if \\(renewalGranted\\?\\.id === ${esc(KEY)}\\) \\{`))
  c('C3.8 fatura já concedida não reaplica saldo (sai antes do update, só passos idempotentes)',
    granted !== null && !/\.update\(/.test(granted) && !/video_credits/.test(granted) &&
      /entitlementConfirmed = true/.test(granted) &&
      /markTrialConverted\(/.test(granted) && /recordAffiliateCommission\(/.test(granted))
  const paidEv = block.indexOf("name: 'subscription_invoice_paid'")
  const markZone = inserts.length === 1 && paidEv > inserts[0].index ? block.slice(inserts[0].index, paidEv) : ''
  c('C3.9 falha ao inserir a chave loga e segue (sem throw depois do crédito)',
    markZone.length > 0 && !/\bthrow\b/.test(markZone) && /catch \(/.test(markZone) && /console\.error\(/.test(markZone))
  c('C3.10 a consulta que falha ANTES do crédito pede reenvio (RetryableEntitlementError)',
    lookups.length === 1 && /if \(\w+\) \{\s*\n\s*throw new RetryableEntitlementError\(\s*\n\s*`Failed to verify renewal grant/.test(block.slice(lookups[0].index, upd > 0 ? upd : undefined)))

  // fórmula intacta
  const lines = block.split('\n').map((l) => l.trim())
  c('C3.11 a fórmula da renovação é a mesma de origin/main (linhas fixas)',
    FORMULA_PINNED.every((p) => lines.filter((l) => l === p).length === 1))
  return f
}

function eventsFailures(t) {
  const f = []
  const list = serverOnlyList(t)
  if (!(list.size > 10)) f.push('E.0 SERVER_ONLY_EVENTS encontrado')
  if (!list.has('subscription_ended')) f.push('E.1 subscription_ended é só-servidor')
  if (!list.has('renewal_ignored_non_access')) f.push('E.2 renewal_ignored_non_access é só-servidor')
  return f
}

// ── predicado real, TRANSPILADO e executado ──────────────────────────────────
async function importAccess() {
  const src = readFileSync(ACCESS, 'utf8')
  const dir = mkdtempSync(join(tmpdir(), 'kineo-atraso-'))
  try {
    let js
    try {
      const require = createRequire(join(root, 'package.json'))
      const ts = require('typescript')
      js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    } catch {
      js = null
    }
    if (js === null) return await import(pathToFileURL(ACCESS).href) // node 24 tira os tipos sozinho
    const out = join(dir, 'subscriptionAccess.mjs')
    writeFileSync(out, js)
    return await import(pathToFileURL(out).href)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
}

// ── comparação com a base fixa (git local, sem rede; ausente = SKIP) ──────────
function baseWebhook() {
  try {
    return norm(execFileSync('git', ['-C', root, 'show', `${BASE_COMMIT}:app/api/stripe/webhook/route.ts`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }))
  } catch {
    return null
  }
}

console.log('\nKINEO — Stripe em atraso por 2 meses: checkout, fim de assinatura, renovação por fatura\n')

const checkoutSrc = read(CHECKOUT)
const webhookSrc = read(WEBHOOK)
const eventsSrc = read(EVENTS)

console.log('C1 · checkout não rebaixa past_due')
{
  const f = checkoutFailures(checkoutSrc)
  check('C1 · todas as verificações do checkout', f.length === 0)
  for (const x of f) console.error(`       ↳ ${x}`)
}
const access = await importAccess()
check('C1 · past_due MANTÉM acesso (executado)', access.stripeSubscriptionKeepsAccess('past_due') === true)
check('C1 · active/trialing mantêm acesso (executado)',
  ['active', 'trialing'].every((s) => access.stripeSubscriptionKeepsAccess(s) === true))
check('C1 · incomplete/unpaid/paused/canceled/incomplete_expired NÃO mantêm (executado)',
  ['incomplete', 'unpaid', 'paused', 'canceled', 'incomplete_expired', '', null].every((s) => access.stripeSubscriptionKeepsAccess(s) === false))

console.log('\nC2 · subscription_ended')
{
  const f = [...deletedFailures(webhookSrc), ...eventsFailures(eventsSrc).filter((x) => !x.startsWith('E.2'))]
  check('C2 · evento depois do update, sem e-mail, só-servidor', f.length === 0)
  for (const x of f) console.error(`       ↳ ${x}`)
}

console.log('\nC3 · renovação')
{
  const f = [...renewalFailures(webhookSrc), ...eventsFailures(eventsSrc).filter((x) => x.startsWith('E.2') || x.startsWith('E.0'))]
  check('C3 · past_due renova, chave por fatura antes/depois, fórmula intacta', f.length === 0)
  for (const x of f) console.error(`       ↳ ${x}`)
}
const base = baseWebhook()
if (base === null) {
  console.log(`  SKIP C3 · comparação com ${BASE_COMMIT} (commit ausente neste clone) — as linhas fixas acima já cobrem`)
} else {
  const baseLines = renewalBlock(base).split('\n').map((l) => l.trim()).filter((l) => FORMULA_LINE.test(l) && !l.startsWith('//'))
  const nowLines = new Set(renewalBlock(webhookSrc).split('\n').map((l) => l.trim()))
  const missing = baseLines.filter((l) => !nowLines.has(l))
  check(`C3 · toda linha de fórmula de ${BASE_COMMIT} (${baseLines.length}) segue idêntica`, baseLines.length >= 8 && missing.length === 0)
  for (const x of missing) console.error(`       ↳ mudou: ${x}`)
}

// ═══ MUTANTES EM MEMÓRIA ═══════════════════════════════════════════════════════
// Cada mutante prova que ALTEROU o texto antes de rodar; um mutante que não
// aplica é vermelho (memória `mutacao-precisa-provar-que-aplicou`).
function moveBlock(text, startNeedle, endNeedle, beforeNeedle) {
  const a = text.indexOf(startNeedle)
  const b = a < 0 ? -1 : text.indexOf(endNeedle, a)
  if (a < 0 || b < 0) return text
  const chunk = text.slice(a, b)
  const without = text.slice(0, a) + text.slice(b)
  const at = without.indexOf(beforeNeedle)
  if (at < 0) return text
  return without.slice(0, at) + chunk + without.slice(at)
}
const replaceOnce = (text, from, to) => (count(text, from) === 1 ? text.split(from).join(to) : text)

const INSERT_START = '        // KINEO-STRIPE-ATRASO-2026-09-28 — a chave só nasce DEPOIS do crédito'
const INSERT_END = '        // KINEO-PLACAR-TRIAL-2026-09-08'
const LOOKUP_START = '        // KINEO-STRIPE-ATRASO-2026-09-28 — renovação idempotente POR FATURA'
const LOOKUP_END = '        // On renewal we set the balance to the plan amount rather than adding,'
const EVENT_START = '        // KINEO-STRIPE-ATRASO-2026-09-28 — o rebaixamento acima não deixava rastro'
const EVENT_END = '\n        break\n      }\n\n      case \'invoice.payment_failed\''

const MUTANTS = [
  { name: 'M1 grantsAccess volta ao literal active/trialing', target: 'checkout',
    mutate: (t) => replaceOnce(t, 'const grantsAccess = stripeSubscriptionKeepsAccess(existingCustomerSubscription.status)',
      "const grantsAccess = existingCustomerSubscription.status === 'active' || existingCustomerSubscription.status === 'trialing'") },
  { name: 'M2 subscription_ended gravado ANTES do update', target: 'deleted',
    mutate: (t) => moveBlock(t, EVENT_START, EVENT_END, '        const { data: deletedSubscriptionProfile, error: subscriptionDeleteErr }') },
  { name: 'M3 subscription_ended fora de SERVER_ONLY_EVENTS', target: 'events-deleted',
    mutate: (t) => replaceOnce(t, "  'subscription_ended',\n", '') },
  { name: 'M4 metadata do fim de assinatura ganha e-mail', target: 'deleted',
    mutate: (t) => replaceOnce(t, "              version: 'stripe_subscription_ended_v1',\n",
      "              version: 'stripe_subscription_ended_v1',\n              customer_email: null,\n") },
  { name: 'M5 chave inserida ANTES do update (perderia a renovação se o update falhar)', target: 'renewal',
    mutate: (t) => moveBlock(t, INSERT_START, INSERT_END, LOOKUP_END) },
  { name: 'M6 chave consultada DEPOIS do update', target: 'renewal',
    mutate: (t) => moveBlock(t, LOOKUP_START, LOOKUP_END, INSERT_START) },
  { name: 'M7 condição da renovação volta a active/trialing', target: 'renewal',
    mutate: (t) => replaceOnce(t, 'if (!stripeSubscriptionKeepsAccess(subscription.status)) {',
      "if (subscription.status !== 'active' && subscription.status !== 'trialing') {") },
  { name: 'M8 falha na inserção da chave derruba o webhook depois de creditar', target: 'renewal',
    mutate: (t) => replaceOnce(t, "              console.error('[stripe webhook] renewal grant marker insert failed (credit already applied):', invoice.id, renewalGrantMarkError.code, renewalGrantMarkError.message)",
      "              throw new RetryableEntitlementError(`renewal grant marker insert failed (${invoice.id})`)") },
  { name: 'M9 fórmula muda (a cota vira saldo, some o carry)', target: 'renewal',
    mutate: (t) => replaceOnce(t, 'const renovacao = renewalBalance(renewalProfile.video_credits, renewalCredits)',
      'const renovacao = renewalBalance(0, renewalCredits)') },
  { name: 'M10 ramo ignorado perde o evento renewal_ignored_non_access', target: 'renewal',
    mutate: (t) => replaceOnce(t, "            name: 'renewal_ignored_non_access',", "            name: 'renewal_stale_ignored',") },
  { name: 'M11 fatura já concedida segue para o update (break removido)', target: 'renewal',
    mutate: (t) => replaceOnce(t, "            console.log('[stripe webhook] renewal already granted for invoice:', invoice.id, subscriptionId)\n            break\n",
      "            console.log('[stripe webhook] renewal already granted for invoice:', invoice.id, subscriptionId)\n") },
  { name: 'M12 renewal_ignored_non_access fora de SERVER_ONLY_EVENTS', target: 'events-renewal',
    mutate: (t) => replaceOnce(t, "  'renewal_ignored_non_access',\n", "  // 'renewal_ignored_non_access',\n") },
]

console.log('\nMutantes em memória (cada um tem de ficar VERMELHO):')
for (const m of MUTANTS) {
  const src = m.target === 'checkout' ? checkoutSrc : m.target.startsWith('events') ? eventsSrc : webhookSrc
  const mutated = m.mutate(src)
  const applied = mutated !== src
  let f = []
  if (applied) {
    if (m.target === 'checkout') f = checkoutFailures(mutated)
    else if (m.target === 'deleted') f = deletedFailures(mutated)
    else if (m.target === 'renewal') f = renewalFailures(mutated)
    else if (m.target === 'events-deleted') f = eventsFailures(mutated).filter((x) => x.startsWith('E.1'))
    else if (m.target === 'events-renewal') f = eventsFailures(mutated).filter((x) => x.startsWith('E.2'))
  }
  check(`${m.name} → ${applied ? (f.length ? `vermelho (${f[0]})` : 'PASSOU (guardião cego)') : 'NÃO APLICOU'}`, applied && f.length > 0)
}

console.log(`\n${total - failed}/${total} verificações verdes`)
if (failed > 0) {
  console.error(`\n${failed} FALHA(S)`)
  process.exit(1)
}
console.log('OK')
