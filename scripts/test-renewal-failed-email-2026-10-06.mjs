// KINEO-DUNNING-EMAIL-2026-10-06 — guardião do aviso AUTOMÁTICO de renovação recusada (sprint "MRR hoje", tarefa 6/10).
// Sem rede, sem banco, sem credencial. Prova, EXECUTANDO lib/billing/renewalFailedEmail.ts e lib/authRedirect.ts (puros):
//   (1) decisão: só renovação ('subscription_cycle') de quem já pagou, só com a assinatura em cobrança (past_due),
//       1 e-mail por fatura, dedupe ilegível = não envia agora, opt-out de MARKETING não cala o aviso, interruptor ligado;
//   (2) língua pelo país (pt/es, resto en) e textos: assunto direto, vídeos e créditos guardados, UM botão para a rota
//       do portal, sem descadastro, sem preço nem desconto;
//   (3) webhook: a chamada mora no ramo de cobrança do invoice.payment_failed, DEPOIS de entitlementConfirmed, com
//       await e uma vez só; o helper lê a dedupe por fatura ANTES do POST no Resend, carimba SÓ depois do ok, e não
//       lança (try/catch);
//   (4) o carimbo está na lista canônica de e-mails (os outros jobs ficam 24 h quietos depois dele);
//   (5) a rota do botão: GET só, exige sessão (login com ?redirect= que o resolvedor REAL preserva), portal da Stripe no
//       fluxo de troca de cartão com queda para o portal normal, fetchCache no-store, evento de abertura;
//   (6) a carta manual (send-renewal-declined) não repete quem já recebeu o automático;
//   (7) mutantes: cada regra quebrada fica vermelha (e cada mutante prova que aplicou).
// Estilo readFileSync + transpile (molde scripts/test-clipe-gratis-regiao-2026-10-05.mjs). CRLF normalizado na leitura.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega um módulo TS puro; imports relativos ('./x') resolvem para o .ts vizinho. Qualquer outro import = erro. */
function load(rel, over = {}) {
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => {
    if (!name.startsWith('./')) throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    return load(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'), over)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

const MOD = 'lib/billing/renewalFailedEmail.ts'
const HOOK = 'app/api/stripe/webhook/route.ts'
const LIST = 'lib/lifecycle/emailEvents.ts'
const ROUTE = 'app/api/stripe/portal/update-card/route.ts'
const MANUAL = 'app/api/admin/send-renewal-declined/route.ts'
const AUTH = 'lib/authRedirect.ts'

const EXPECTED_URL = 'https://www.usekineo.com/api/stripe/portal/update-card?utm_source=lifecycle&utm_medium=email&utm_campaign=renewal_failed'
const count = (hay, needle) => hay.split(needle).length - 1
const lines = (text) => text.split('\n')

function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let M
  try { M = load(MOD, over) } catch (err) { return [`módulo puro não carrega: ${err.message}`] }

  // ── (1) decisão ───────────────────────────────────────────────────────────────────────────────────────────────────
  if (M.RENEWAL_FAILED_EMAIL_LIVE !== true) p.push('interruptor RENEWAL_FAILED_EMAIL_LIVE desligado')
  if (M.RENEWAL_FAILED_EMAIL_EVENT !== 'renewal_payment_failed_email_sent') p.push('nome do carimbo mudou (a dedupe e a medição leem renewal_payment_failed_email_sent)')
  if (M.RENEWAL_FAILED_UPDATE_CARD_PATH !== '/api/stripe/portal/update-card') p.push('caminho do botão mudou')
  if (M.RENEWAL_FAILED_UPDATE_CARD_URL !== EXPECTED_URL) p.push(`URL do botão errada (${M.RENEWAL_FAILED_UPDATE_CARD_URL})`)
  const base = {
    live: true, billingReason: 'subscription_cycle', invoiceId: 'in_test_1', ownerId: 'user-1', ownerHasPaid: true,
    subscriptionStatus: 'past_due', alreadySentForInvoice: false, recipientEmail: 'cliente@example.com', marketingOptOut: false,
  }
  const casos = [
    [base, true, 'renovação recusada, 1ª falha da fatura'],
    [{ ...base, marketingOptOut: true }, true, 'opt-out de MARKETING não cala o aviso transacional'],
    [{ ...base, billingReason: 'subscription_create' }, false, 'fatura do checkout inicial'],
    [{ ...base, billingReason: 'subscription_update' }, false, 'fatura de proration'],
    [{ ...base, billingReason: 'manual' }, false, 'fatura manual'],
    [{ ...base, billingReason: null }, false, 'sem billing_reason'],
    [{ ...base, alreadySentForInvoice: true }, false, 'segunda falha da MESMA fatura'],
    [{ ...base, alreadySentForInvoice: null }, false, 'dedupe ilegível'],
    [{ ...base, subscriptionStatus: 'active' }, false, 'assinatura já paga (evento de falha atrasado)'],
    [{ ...base, subscriptionStatus: 'canceled' }, false, 'assinatura cancelada'],
    [{ ...base, subscriptionStatus: 'unpaid' }, false, 'assinatura unpaid'],
    [{ ...base, ownerHasPaid: false }, false, 'quem nunca pagou (1ª cobrança depois do teste com cartão)'],
    [{ ...base, ownerId: null }, false, 'assinatura sem dono'],
    [{ ...base, invoiceId: null }, false, 'sem id de fatura'],
    [{ ...base, recipientEmail: '' }, false, 'sem e-mail'],
    [{ ...base, recipientEmail: 'nao-e-email' }, false, 'e-mail inválido'],
    [{ ...base, live: false }, false, 'interruptor desligado'],
  ]
  for (const [row, want, label] of casos) {
    const d = M.decideRenewalFailedEmail(row)
    if (d?.send !== want) p.push(`decisão errada para: ${label} (send=${d?.send})`)
  }
  const reasonOf = (row) => M.decideRenewalFailedEmail(row)?.reason
  if (reasonOf({ ...base, alreadySentForInvoice: true }) !== 'already_sent_for_invoice') p.push('motivo da 2ª falha não é already_sent_for_invoice')
  if (reasonOf({ ...base, alreadySentForInvoice: null }) !== 'dedupe_unavailable') p.push('motivo da dedupe ilegível não é dedupe_unavailable')
  if (reasonOf({ ...base, live: false }) !== 'switch_off') p.push('motivo do interruptor não é switch_off')
  if (reasonOf(base) !== 'first_failure_for_invoice') p.push('motivo do envio não é first_failure_for_invoice')

  // ── (2) língua e textos ───────────────────────────────────────────────────────────────────────────────────────────
  for (const [country, want] of [['BR', 'pt'], ['br', 'pt'], [' PT ', 'pt'], ['ES', 'es'], ['MX', 'es'], ['AR', 'es'], ['US', 'en'], ['SA', 'en'], ['NG', 'en'], ['', 'en'], [null, 'en'], ['XX', 'en']]) {
    if (M.renewalEmailLanguage(country) !== want) p.push(`língua errada para o país ${JSON.stringify(country)} (${M.renewalEmailLanguage(country)})`)
  }
  const button = { en: 'Update card', pt: 'Atualizar cartão', es: 'Actualizar tarjeta' }
  const safe = { en: /videos and credits are safe/i, pt: /vídeos e créditos estão guardados/i, es: /videos y créditos están guardados/i }
  const subjects = new Set()
  for (const lang of ['en', 'pt', 'es']) {
    const m = M.renewalFailedEmailMessage({ language: lang, tier: 'pro' })
    if (m.language !== lang) { p.push(`mensagem em ${lang} saiu em ${m.language}`); continue }
    if (!m.subject?.trim()) p.push(`assunto vazio em ${lang}`)
    subjects.add(m.subject)
    if (count(m.text, EXPECTED_URL) !== 1) p.push(`texto em ${lang} não leva o link do botão exatamente 1 vez`)
    if ((m.html.match(/<a\s/g) || []).length !== 1) p.push(`html em ${lang} não tem exatamente UM link/botão`)
    if (!m.html.includes(`href="${EXPECTED_URL.replace(/&/g, '&amp;')}"`)) p.push(`botão em ${lang} não aponta para a rota do portal`)
    if (!m.html.includes(`>${button[lang]}</a>`)) p.push(`botão em ${lang} não diz "${button[lang]}"`)
    if (!safe[lang].test(m.text) || !safe[lang].test(m.html)) p.push(`texto em ${lang} não diz que vídeos e créditos estão guardados`)
    if (!m.text.includes('Studio')) p.push(`texto em ${lang} não nomeia o plano (tier pro = Studio)`)
    if (/unsubscribe|descadastr|darte de baja/i.test(m.text + m.html)) p.push(`aviso transacional em ${lang} ganhou descadastro`)
    if (/\$\s?\d|\d\s?%|discount|desconto|descuento/i.test(m.text + m.html)) p.push(`aviso em ${lang} fala de preço/desconto`)
  }
  if (M.renewalFailedEmailMessage({ language: 'en', tier: null }).subject !== "Your Kineo renewal didn't go through") p.push('assunto em inglês não é o combinado')
  if (subjects.size !== 3) p.push('assuntos não estão traduzidos (pt/es iguais ao en)')
  if (!M.renewalFailedEmailMessage({ language: 'en', tier: 'algo-estranho' }).text.includes('renew your Kineo plan')) p.push('tier desconhecido não cai em "your Kineo plan"')
  if (!M.renewalFailedEmailMessage({ language: 'pt', tier: 'basic' }).text.includes('plano Kineo Creator')) p.push('tier basic não vira Creator')
  if (M.renewalFailedEmailMessage({ language: 'xx' }).language !== 'en') p.push('língua desconhecida não cai em inglês')

  // ── (3) webhook ───────────────────────────────────────────────────────────────────────────────────────────────────
  const hook = src(HOOK)
  if (!/import \{[^}]*\bdecideRenewalFailedEmail\b[^}]*\} from '@\/lib\/billing\/renewalFailedEmail'/.test(hook)) p.push('webhook não importa a decisão do módulo puro')
  const caseStart = hook.indexOf("      case 'invoice.payment_failed': {")
  const keepsIdx = hook.indexOf('        if (stripeSubscriptionKeepsAccess(failedSubscription.status)) {', caseStart)
  const confirmIdx = hook.indexOf('          entitlementConfirmed = true', keepsIdx)
  const dunningIdx = hook.indexOf('          if (stripeSubscriptionIsDunning(failedSubscription.status)) {', keepsIdx)
  const keptIdx = hook.indexOf("          console.warn('[stripe webhook] payment_failed kept access for subscription:'", dunningIdx)
  const callLine = '            await sendRenewalFailedEmailOnce(supabase, {'
  const callCount = lines(hook).filter((l) => l === callLine).length
  const callIdx = hook.indexOf('\n' + callLine + '\n')
  if (caseStart < 0 || keepsIdx < 0 || confirmIdx < 0 || dunningIdx < 0 || keptIdx < 0) p.push('âncoras do ramo invoice.payment_failed não encontradas')
  else if (callCount !== 1 || callIdx < 0) p.push(`a chamada "await sendRenewalFailedEmailOnce(supabase, {" não está lá exatamente 1 vez (achei ${callCount})`)
  else {
    if (!(callIdx > dunningIdx && callIdx < keptIdx)) p.push('a chamada não está dentro do ramo de cobrança (past_due) do invoice.payment_failed')
    if (!(confirmIdx < dunningIdx && confirmIdx < callIdx)) p.push('a chamada não vem depois de entitlementConfirmed = true')
    const callBlock = hook.slice(callIdx, hook.indexOf('\n            })\n', callIdx))
    for (const need of ['              invoice,', '              subscriptionStatus: failedSubscription.status,', '              owner: dunningOwner,']) {
      if (!callBlock.includes(need)) p.push(`chamada sem "${need.trim()}"`)
    }
  }
  if (count(hook, 'sendRenewalFailedEmailOnce(') !== 2) p.push('sendRenewalFailedEmailOnce aparece fora do par definição + 1 chamada')
  if (/void\s+(sendRenewalFailedEmailOnce|writeServerEvent|recordEmailSend|recordResendResponse)\b/.test(hook)) p.push('envio/registro com void (morre na Vercel)')

  const fnStart = hook.indexOf('async function sendRenewalFailedEmailOnce(')
  const helper = fnStart < 0 ? '' : hook.slice(fnStart, hook.indexOf('\n}\n', fnStart) + 3)
  if (!helper) p.push('helper sendRenewalFailedEmailOnce não encontrado')
  else {
    const at = (needle) => helper.indexOf(needle)
    const iName = at("        .eq('name', RENEWAL_FAILED_EMAIL_EVENT)\n")
    const iInvoice = at("        .eq('metadata->>invoice_id', invoiceId)\n")
    const iDecision = at('    const decision = decideRenewalFailedEmail({')
    const iFed = at('      alreadySentForInvoice,\n')
    const iLive = at('      live: RENEWAL_FAILED_EMAIL_LIVE,\n')
    const iSkip = at('    if (!decision.send) {')
    const iFetch = at("      res = await fetch('https://api.resend.com/emails', {")
    const iTimeout = at('        signal: AbortSignal.timeout(RENEWAL_FAILED_EMAIL_TIMEOUT_MS),')
    const iNotOk = at('    if (!res.ok) {')
    const iStamp = at('      name: RENEWAL_FAILED_EMAIL_EVENT,')
    const iCatch = helper.lastIndexOf('\n  } catch (err) {\n')
    if (iName < 0 || iInvoice < 0) p.push('dedupe por fatura (name + metadata->>invoice_id) sumiu do helper')
    if (iDecision < 0 || iFed < 0 || iLive < 0) p.push('decisão não recebe a dedupe e o interruptor')
    if (iSkip < 0) p.push('pulo (if (!decision.send)) sumiu')
    if (iFetch < 0) p.push('POST no Resend sem await')
    if (iTimeout < 0) p.push('POST no Resend sem teto de tempo')
    if (iNotOk < 0) p.push('carimbo sem a guarda if (!res.ok)')
    if (iStamp < 0) p.push('carimbo RENEWAL_FAILED_EMAIL_EVENT sumiu')
    if (iCatch < 0) p.push('helper sem o try/catch final (não pode lançar dentro do webhook)')
    if ([iName, iInvoice, iDecision, iSkip, iFetch, iNotOk, iStamp, iCatch].every((i) => i >= 0)) {
      if (!(iName < iDecision && iInvoice < iDecision && iDecision < iSkip && iSkip < iFetch)) p.push('a dedupe e a decisão não vêm ANTES do POST no Resend')
      if (!(iFetch < iNotOk && iNotOk < iStamp && iStamp < iCatch)) p.push('o carimbo não vem SÓ depois do Resend dizer ok')
      if (!helper.slice(iNotOk, iStamp).includes('      return\n')) p.push('o ramo !res.ok não retorna antes do carimbo')
    }
    if (count(helper, 'name: RENEWAL_FAILED_EMAIL_EVENT,') !== 1) p.push('mais de um lugar grava o carimbo de enviado')
    if (/\bthrow\b/.test(helper)) p.push('o helper lança (derrubaria o webhook)')
    if (count(helper, 'writeServerEvent(') !== count(helper, 'await writeServerEvent(')) p.push('evento do helper sem await')
    if (!helper.includes("recordResendResponse({ kind: RENEWAL_FAILED_EMAIL_KIND, priority: 'revenue'")) p.push('envio fora do ledger de cota (email_send_log) ou sem prioridade revenue')
    for (const need of ['    invoice_id: invoiceId,', '    subscription_ref: input.subscriptionId,', '    attempt: ']) {
      if (!helper.includes(need)) p.push(`metadata do carimbo sem "${need.trim()}"`)
    }
  }

  // ── (4) lista canônica de e-mails ─────────────────────────────────────────────────────────────────────────────────
  const list = lines(src(LIST))
  if (!list.includes("  'renewal_payment_failed_email_sent',")) p.push('carimbo fora da lista canônica (os outros jobs não ficariam quietos depois dele)')
  if (list.some((l) => /renewal_payment_failed_email_(skipped|failed)/.test(l) && /^\s*'/.test(l))) p.push('evento de pulo/falha entrou na lista canônica (nada saiu)')

  // ── (5) rota do botão ─────────────────────────────────────────────────────────────────────────────────────────────
  if (!fs.existsSync(path.join(ROOT, `app${M.RENEWAL_FAILED_UPDATE_CARD_PATH}/route.ts`))) p.push('a rota do botão não existe no caminho anunciado')
  const route = src(ROUTE)
  if (!route.includes('export async function GET(req: NextRequest) {')) p.push('rota do botão sem GET')
  if (/export (async )?function (POST|PUT|DELETE|PATCH)/.test(route)) p.push('rota do botão ganhou método que muda estado')
  if (!lines(route).includes("export const fetchCache = 'force-no-store'")) p.push("rota do botão sem fetchCache = 'force-no-store'")
  const noUser = route.indexOf('    if (!user) {')
  const noUserBlock = noUser < 0 ? '' : route.slice(noUser, route.indexOf('\n    }\n', noUser))
  if (!noUserBlock.includes("login.searchParams.set('redirect', `${RENEWAL_FAILED_UPDATE_CARD_PATH}${req.nextUrl.search}`)") || !noUserBlock.includes('      return NextResponse.redirect(login, 303)')) {
    p.push('sem sessão a rota não manda para o login levando o destino')
  }
  if (count(route, 'stripe.billingPortal.sessions.create(') !== 2 || !route.includes("          type: 'payment_method_update',")) p.push('rota não abre o portal no fluxo de troca de cartão com queda para o portal normal')
  if (!route.includes('    name: BILLING_UPDATE_CARD_OPENED_EVENT,')) p.push('abertura do botão sem evento (clique invisível)')
  if (!/\} catch \(err\) \{[\s\S]{0,300}return NextResponse\.redirect\(account, 303\)/.test(route)) p.push('erro na rota não cai em /account')
  try {
    const auth = load(AUTH)
    const u = new URL(M.RENEWAL_FAILED_UPDATE_CARD_URL)
    const dest = u.pathname + u.search
    const login = new URL('/login', 'https://www.usekineo.com')
    login.searchParams.set('redirect', dest)
    const back = new URL(login.toString()).searchParams.get('redirect')
    if (auth.resolveAuthRedirect(back, '/') !== dest) p.push(`o login não devolve a pessoa ao botão (${auth.resolveAuthRedirect(back, '/')})`)
  } catch (err) {
    p.push(`resolvedor do login não carrega: ${err.message}`)
  }

  // ── (6) carta manual não repete o automático ──────────────────────────────────────────────────────────────────────
  const manual = src(MANUAL)
  if (!manual.includes(".in('name', [SENT_EVENT, RENEWAL_FAILED_EMAIL_EVENT])") || !manual.includes("import { RENEWAL_FAILED_EMAIL_EVENT } from '@/lib/billing/renewalFailedEmail'")) {
    p.push('a carta manual não enxerga quem já recebeu o aviso automático')
  }
  return p
}

console.log('TESTE aviso automático de renovação recusada — 06/10')
const real = problems()
ok(real.length === 0, '(1–6) decisão, língua e textos, ligação no webhook com dedupe e await, lista canônica, rota do botão, carta manual' + (real.length ? ' → ' + real.join(' | ') : ''))

// ── (7) mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────
const mutants = [
  ['M1 aceita qualquer fatura (inclusive checkout inicial e proration)', MOD, "  if (f.billingReason !== 'subscription_cycle') return { send: false, reason: 'not_renewal' }\n", "  if (f.billingReason === 'nunca') return { send: false, reason: 'not_renewal' }\n"],
  ['M2 ignora a dedupe por fatura', MOD, "  if (f.alreadySentForInvoice) return { send: false, reason: 'already_sent_for_invoice' }\n", ''],
  ['M3 dedupe ilegível vira "não enviado"', MOD, "  if (f.alreadySentForInvoice === null) return { send: false, reason: 'dedupe_unavailable' }\n", ''],
  ['M4 opt-out de marketing cala o aviso transacional', MOD, "  if (!isDeliverableEmail(f.recipientEmail)) return { send: false, reason: 'no_recipient' }\n", "  if (!isDeliverableEmail(f.recipientEmail)) return { send: false, reason: 'no_recipient' }\n  if (f.marketingOptOut) return { send: false, reason: 'no_recipient' }\n"],
  ['M5 interruptor desligado', MOD, 'export const RENEWAL_FAILED_EMAIL_LIVE = true\n', 'export const RENEWAL_FAILED_EMAIL_LIVE = false\n'],
  ['M6 manda com a assinatura já ativa/cancelada', MOD, "  if (!stripeSubscriptionIsDunning(f.subscriptionStatus)) return { send: false, reason: 'not_dunning' }\n", ''],
  ['M7 manda para quem nunca pagou', MOD, "  if (f.ownerHasPaid !== true) return { send: false, reason: 'never_paid' }\n", ''],
  ['M8 Brasil cai em inglês', MOD, "const PORTUGUESE_COUNTRIES = new Set(['BR', ", "const PORTUGUESE_COUNTRIES = new Set(['XB', "],
  ['M9 botão com campanha errada', MOD, 'utm_medium=email&utm_campaign=${RENEWAL_FAILED_CAMPAIGN}`\n', 'utm_medium=email&utm_campaign=outra`\n'],
  ['M10 rodapé ganha descadastro e 2º link', MOD, '<br>Kineo &middot; usekineo.com</p>\n', '<br>Kineo &middot; <a href="https://www.usekineo.com/unsubscribe">Unsubscribe</a></p>\n'],
  ['M11 webhook chama sem await (void)', HOOK, '\n            await sendRenewalFailedEmailOnce(supabase, {\n', '\n            void sendRenewalFailedEmailOnce(supabase, {\n'],
  ['M12 webhook deixa de chamar o aviso', HOOK, '\n            await sendRenewalFailedEmailOnce(supabase, {\n', '\n            await sendRenewalFailedEmailLater(supabase, {\n'],
  ['M13 dedupe sem o filtro da fatura', HOOK, "        .eq('metadata->>invoice_id', invoiceId)\n", ''],
  ['M14 carimbo mesmo com o Resend recusando', HOOK, '    if (!res.ok) {\n', '    if (false) {\n'],
  ['M15 helper sem catch final (lançaria no webhook)', HOOK, "  } catch (err) {\n    console.warn('[stripe webhook] renewal failed email threw (webhook continues):'", "  } finally {\n    console.warn('[stripe webhook] renewal failed email threw (webhook continues):'"],
  ['M16 carimbo fora da lista canônica', LIST, "  'renewal_payment_failed_email_sent',\n", ''],
  ['M17 rota sem sessão não leva ao login', ROUTE, '      return NextResponse.redirect(login, 303)\n', '      return NextResponse.redirect(account, 303)\n'],
  ['M18 rota sem fetchCache no-store', ROUTE, "export const fetchCache = 'force-no-store'\n", ''],
  ['M19 carta manual cega para o automático', MANUAL, ".in('name', [SENT_EVENT, RENEWAL_FAILED_EMAIL_EVENT])", ".eq('name', SENT_EVENT)"],
]
for (const [label, file, from, to] of mutants) {
  const original = read(file)
  if (!original.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = original.replace(from, to)
  if (mutated === original) { ok(false, `(${label}) mutante não aplicou`); continue }
  let bitten = false
  try {
    const why = problems({ [file]: mutated })
    bitten = why.length > 0
    // SHOW_MUTANT_REASONS=1 mostra POR QUE cada mutante ficou vermelho (prova que a régua certa mordeu).
    if (process.env.SHOW_MUTANT_REASONS) console.log('     ↳ ' + why.join(' | '))
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
