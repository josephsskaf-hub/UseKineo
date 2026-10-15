// KINEO-CARTAO-RECUSADO-1510 — guardião da recuperação de assinatura por CARTÃO RECUSADO (fundador, 15/10).
// Sem rede, sem banco, sem credencial. Prova, EXECUTANDO os módulos (TS transpilado; aliases '@/…' trocados por dublês):
//   (1) tolerância: renovação recusada (past_due) MANTÉM plano e créditos até a Stripe desistir — o webhook não revoga em
//       cobrança, e nenhum ramo de falha toca `video_credits`;
//   (2) decisão da rodada: lembrete só ≥ 20 h depois do 1º aviso, 1 por fatura, nunca a quem pagou, dedupe ilegível
//       não envia, interna/nunca-pagou fora;
//   (3) link: botão = fatura hospedada da Stripe (https://invoice.stripe.com, sem login); qualquer outra coisa cai no
//       portal; UM link só; motivo humano sem dado de cartão; nada de preço/desconto;
//   (4) a rodada de verdade (runRenewalFollowUp com Stripe/banco/Resend dublês): dry-run não envia nem carimba; envio
//       carimba por fatura; 2ª rodada não repete; lembrete no dia 2; fatura paga relida na hora não recebe; Resend
//       recusando não carimba;
//   (5) ligações: rota (etapa=lembrete, dry-run por padrão), cron no vercel.json com confirm e minuto exclusivo, lista
//       canônica, webhook passa link + motivo, banner usa a fatura aberta;
//   (6) nada de preço/cupom/cobrança: os arquivos novos só LEEM a Stripe;
//   (7) mutantes: cada regra quebrada fica vermelha (e cada mutante prova que aplicou).
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

const EMAIL = 'lib/billing/renewalFailedEmail.ts'
const ACCESS = 'lib/billing/subscriptionAccess.ts'
const FOLLOW = 'lib/billing/renewalFailedFollowUp.ts'
const DECLINE = 'lib/billing/renewalDecline.ts'
const HOOK = 'app/api/stripe/webhook/route.ts'
const ROUTE = 'app/api/admin/send-renewal-declined/route.ts'
const LIST = 'lib/lifecycle/emailEvents.ts'
const VERCEL = 'vercel.json'
const ME = 'app/api/me/subscription/route.ts'
const BANNER = 'components/RenewalDeclinedBanner.tsx'

const HOSTED = 'https://invoice.stripe.com/i/acct_TEST/test_YWNjdF8xTkxCVGs'
const PORTAL = 'https://www.usekineo.com/api/stripe/portal/update-card?utm_source=lifecycle&utm_medium=email&utm_campaign=renewal_failed'
const count = (hay, needle) => hay.split(needle).length - 1

/** Carrega um módulo TS; '@/x' → ROOT/x.ts ou dublê; './x' relativo. */
function load(rel, over, stubs, cache = new Map()) {
  if (cache.has(rel)) return cache.get(rel)
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  cache.set(rel, mod.exports)
  const req = (name) => {
    if (stubs[name]) return stubs[name]
    if (name.startsWith('node:')) return require(name)
    let target
    if (name.startsWith('@/')) target = name.slice(2) + '.ts'
    else if (name.startsWith('./')) target = path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts')
    else throw new Error(`${rel}: import inesperado ${name}`)
    return load(target, over, stubs, cache)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  cache.set(rel, mod.exports)
  return mod.exports
}

// ── Dublês da rodada ────────────────────────────────────────────────────────────────────────────────────────────────
function world() {
  const events = [] // { name, user_id, metadata, created_at }
  const sent = [] // { to, subject, text, html }
  const profiles = {
    sub_A: { id: 'u-A', email: 'ana@example.com', has_paid: true, plan: 'starter', signup_country: 'ES', last_country: null },
    sub_B: { id: 'u-B', email: 'bia@example.com', has_paid: true, plan: 'pro', signup_country: 'SA', last_country: null },
    sub_C: { id: 'u-C', email: 'josephsskaf@gmail.com', has_paid: true, plan: 'pro', signup_country: 'BR', last_country: null },
    sub_D: { id: 'u-D', email: 'dan@example.com', has_paid: true, plan: 'basic', signup_country: 'US', last_country: null },
    sub_E: { id: 'u-E', email: 'eve@example.com', has_paid: false, plan: 'free', signup_country: 'US', last_country: null },
  }
  const invoices = {
    in_A: { id: 'in_A', status: 'open', billing_reason: 'subscription_cycle', hosted_invoice_url: HOSTED + 'A', attempt_count: 2, payment_intent: 'pi_A' },
    in_B: { id: 'in_B', status: 'paid', billing_reason: 'subscription_cycle', hosted_invoice_url: HOSTED + 'B', attempt_count: 3, payment_intent: 'pi_B' },
    in_C: { id: 'in_C', status: 'open', billing_reason: 'subscription_cycle', hosted_invoice_url: HOSTED + 'C', attempt_count: 1, payment_intent: 'pi_C' },
    in_D: { id: 'in_D', status: 'open', billing_reason: 'subscription_cycle', hosted_invoice_url: null, attempt_count: 1, payment_intent: 'pi_D' },
    in_E: { id: 'in_E', status: 'open', billing_reason: 'subscription_cycle', hosted_invoice_url: HOSTED + 'E', attempt_count: 1, payment_intent: 'pi_E' },
  }
  const subs = ['A', 'B', 'C', 'D', 'E'].map((k) => ({ id: `sub_${k}`, status: 'past_due', latest_invoice: `in_${k}`, metadata: { tier: profiles[`sub_${k}`].plan } }))
  const stripeCalls = []
  const stripe = {
    subscriptions: {
      list: (p) => { stripeCalls.push(['subscriptions.list', p]); return (async function* () { for (const s of subs) yield s })() },
    },
    invoices: { retrieve: async (id) => { stripeCalls.push(['invoices.retrieve', id]); return { ...invoices[id] } } },
    paymentIntents: { retrieve: async (id) => { stripeCalls.push(['paymentIntents.retrieve', id]); return { id, last_payment_error: { decline_code: 'insufficient_funds', code: 'card_declined' } } } },
  }
  let failFor = new Set(['dan@example.com'])
  const admin = {
    from(table) {
      const f = { table, eqs: [], ord: null, lim: null }
      const q = {
        select() { return q },
        eq(col, val) { f.eqs.push([col, val]); return q },
        order(col, o) { f.ord = [col, o]; return q },
        limit(n) { f.lim = n; return Promise.resolve(run()) },
        maybeSingle() { const r = run(); return Promise.resolve({ data: r.data[0] ?? null, error: null }) },
      }
      const run = () => {
        if (table === 'profiles') {
          const sub = f.eqs.find(([c]) => c === 'stripe_subscription_id')?.[1]
          return { data: profiles[sub] ? [profiles[sub]] : [], error: null }
        }
        if (table === 'events') {
          const name = f.eqs.find(([c]) => c === 'name')?.[1]
          const inv = f.eqs.find(([c]) => c === 'metadata->>invoice_id')?.[1]
          if (!name || !inv || !f.ord) return { data: null, error: { message: 'consulta sem nome/fatura/ordem' } }
          const rows = events.filter((e) => e.name === name && e.metadata?.invoice_id === inv).sort((a, b) => a.created_at.localeCompare(b.created_at))
          return { data: rows.slice(0, f.lim ?? rows.length), error: null }
        }
        return { data: [], error: null }
      }
      return q
    },
  }
  let clock = Date.parse('2026-10-15T14:13:00Z')
  const stubs = {
    '@/lib/stripe': { stripe },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push({ name: e.name, user_id: e.userId, metadata: e.metadata, created_at: new Date(clock).toISOString() }); return true } },
    '@/lib/email/quota': { recordResendResponse: async () => {}, recordEmailSend: async () => {} },
    '@/lib/internalAccounts': { isInternalEmail: (e) => /josephsskaf/.test(String(e ?? '')) },
  }
  const fetchStub = async (url, init) => {
    const body = JSON.parse(init.body)
    const okSend = !failFor.has(body.to[0])
    if (okSend) sent.push({ to: body.to[0], subject: body.subject, text: body.text, html: body.html })
    return { ok: okSend, status: okSend ? 200 : 422, json: async () => ({ id: 're_' + sent.length }) }
  }
  return { events, sent, stripe, stripeCalls, admin, stubs, fetchStub, setClock: (ms) => { clock = ms }, getClock: () => clock, healDan: () => { failFor = new Set() } }
}

async function runRound(over, w, confirm) {
  const M = load(FOLLOW, over, w.stubs)
  const realFetch = globalThis.fetch
  const realTimeout = globalThis.setTimeout
  globalThis.fetch = w.fetchStub
  globalThis.setTimeout = (fn) => realTimeout(fn, 0)
  try {
    return await M.runRenewalFollowUp({ admin: w.admin, confirm, limit: 30, trigger: 'cron', resendApiKey: 're_test', nowMs: w.getClock() })
  } finally {
    globalThis.fetch = realFetch
    globalThis.setTimeout = realTimeout
  }
}

async function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let E, A
  try { E = load(EMAIL, over, {}); A = load(ACCESS, over, {}) } catch (err) { return [`módulo puro não carrega: ${err.message}`] }

  // ── (1) tolerância ────────────────────────────────────────────────────────────────────────────────────────────────
  if (A.stripeSubscriptionKeepsAccess('past_due') !== true) p.push('past_due deixou de manter o acesso (o plano cairia na 1ª recusa)')
  for (const st of ['canceled', 'unpaid', 'incomplete_expired']) if (A.stripeSubscriptionKeepsAccess(st) !== false) p.push(`${st} passou a manter acesso`)
  const hook = src(HOOK)
  const pf = hook.indexOf("      case 'invoice.payment_failed': {")
  const pfEnd = hook.indexOf('      default:', pf)
  const pfBlock = pf < 0 ? '' : hook.slice(pf, pfEnd)
  const keeps = pfBlock.indexOf('        if (stripeSubscriptionKeepsAccess(failedSubscription.status)) {')
  const revoke = pfBlock.indexOf('        const { data: revokedProfile, error: revokeErr } = await supabase')
  if (keeps < 0 || revoke < 0 || !(keeps < revoke)) p.push('âncoras do invoice.payment_failed sumiram (graça antes da revogação)')
  else if (!pfBlock.slice(keeps, revoke).includes("          break\n        }\n")) p.push('o ramo da graça não sai (break) antes da revogação')
  if (/video_credits/.test(pfBlock)) p.push('o ramo de falha de pagamento mexe em video_credits (crédito pago some na recusa)')
  const su = hook.indexOf("      case 'customer.subscription.updated': {")
  const suBlock = su < 0 ? '' : hook.slice(su, hook.indexOf("      case 'customer.subscription.deleted': {", su))
  if (!suBlock.includes('        const isActive = stripeSubscriptionKeepsAccess(subscription.status)\n')) p.push('subscription.updated não decide pela graça')
  if (!suBlock.includes('        if (!isActive) {\n          subscriptionPatch.plan = \'free\'')) p.push('subscription.updated rebaixa fora do !isActive')
  if (/video_credits/.test(suBlock)) p.push('subscription.updated mexe em video_credits')

  // ── (2) decisão da rodada ─────────────────────────────────────────────────────────────────────────────────────────
  const now = Date.parse('2026-10-15T14:00:00Z')
  const h = (n) => new Date(now - n * 3_600_000).toISOString()
  const base = {
    live: true, billingReason: 'subscription_cycle', invoiceId: 'in_1', invoiceStatus: 'open', subscriptionStatus: 'past_due',
    ownerId: 'u1', ownerHasPaid: true, internal: false, dedupeReadable: true, firstSentAt: h(21), reminderSent: false,
    recipientEmail: 'a@example.com', nowMs: now,
  }
  const casos = [
    [base, 'reminder', 'lembrete 21 h depois do 1º aviso'],
    [{ ...base, firstSentAt: h(20) }, 'reminder', 'lembrete exatamente 20 h depois'],
    [{ ...base, firstSentAt: h(19) }, false, 'lembrete 19 h depois (cedo demais)'],
    [{ ...base, firstSentAt: h(1) }, false, 'lembrete 1 h depois'],
    [{ ...base, firstSentAt: null }, 'first', '1º aviso que o webhook não mandou'],
    [{ ...base, reminderSent: true }, false, 'lembrete já enviado para esta fatura'],
    [{ ...base, invoiceStatus: 'paid' }, false, 'fatura já paga (relida na hora)'],
    [{ ...base, invoiceStatus: 'void' }, false, 'fatura anulada'],
    [{ ...base, invoiceStatus: 'uncollectible' }, false, 'fatura incobrável'],
    [{ ...base, invoiceStatus: null }, false, 'status da fatura desconhecido'],
    [{ ...base, subscriptionStatus: 'active' }, false, 'assinatura em dia'],
    [{ ...base, subscriptionStatus: 'canceled' }, false, 'assinatura cancelada'],
    [{ ...base, dedupeReadable: false }, false, 'carimbo ilegível'],
    [{ ...base, firstSentAt: 'lixo' }, false, 'data do carimbo ilegível'],
    [{ ...base, ownerHasPaid: false }, false, 'quem nunca pagou'],
    [{ ...base, internal: true }, false, 'conta interna'],
    [{ ...base, ownerId: null }, false, 'sem dono'],
    [{ ...base, billingReason: 'subscription_create' }, false, 'fatura do checkout inicial'],
    [{ ...base, invoiceId: null }, false, 'sem fatura'],
    [{ ...base, recipientEmail: 'x' }, false, 'e-mail inválido'],
    [{ ...base, live: false }, false, 'interruptor desligado'],
  ]
  for (const [row, want, label] of casos) {
    const d = E.decideRenewalFollowUp(row)
    const got = d?.send ? d.stage : false
    if (got !== want) p.push(`rodada errada: ${label} (deu ${got})`)
  }
  if (E.RENEWAL_FAILED_REMINDER_AFTER_HOURS !== 20) p.push('janela do lembrete mudou de 20 h')
  if (E.decideRenewalFollowUp({ ...base, invoiceStatus: 'paid' })?.reason !== 'invoice_not_open') p.push('motivo da fatura paga não é invoice_not_open')

  // ── (3) link, motivo, textos ──────────────────────────────────────────────────────────────────────────────────────
  if (E.renewalPayUrl(HOSTED) !== HOSTED) p.push('fatura hospedada válida não vira o botão')
  for (const bad of ['http://invoice.stripe.com/i/x', 'https://invoice.stripe.com.evil.example/i/x', 'https://evil.example/?u=https://invoice.stripe.com/', 'javascript:alert(1)', '', null, undefined]) {
    if (E.renewalPayUrl(bad) !== PORTAL) p.push(`link não confiável aceito: ${JSON.stringify(bad)}`)
  }
  const cats = ['insufficient_funds', 'expired_card', 'card_restricted', 'authentication_required', 'incorrect_card_details', 'fraud_or_risk', 'generic_decline', null]
  const reminderSubjects = new Set()
  for (const lang of ['en', 'pt', 'es']) {
    for (const stage of ['first', 'reminder']) {
      const m = E.renewalFailedEmailMessage({ language: lang, tier: 'pro', hostedInvoiceUrl: HOSTED, reasonCategory: 'insufficient_funds', stage })
      if ((m.html.match(/<a\s/g) || []).length !== 1) p.push(`${lang}/${stage}: não tem exatamente UM link`)
      if (!m.html.includes(`href="${HOSTED}"`) || count(m.text, HOSTED) !== 1) p.push(`${lang}/${stage}: botão não é a fatura hospedada`)
      if (m.text.includes('/api/stripe/portal/update-card')) p.push(`${lang}/${stage}: rota com login junto do link de 1 clique`)
      if (!/no sign-in|sem precisar entrar|sin iniciar sesión/i.test(m.text)) p.push(`${lang}/${stage}: não diz que dispensa login`)
      if (/\$\s?\d|\d\s?%|discount|desconto|descuento|coupon|cupom|cupón/i.test(m.text + m.html)) p.push(`${lang}/${stage}: fala de preço/desconto`)
      if (/unsubscribe|descadastr|darte de baja/i.test(m.text + m.html)) p.push(`${lang}/${stage}: aviso transacional ganhou descadastro`)
      if (stage === 'reminder') reminderSubjects.add(m.subject)
    }
    const first = E.renewalFailedEmailMessage({ language: lang, tier: 'pro', hostedInvoiceUrl: HOSTED, stage: 'first' })
    const rem = E.renewalFailedEmailMessage({ language: lang, tier: 'pro', hostedInvoiceUrl: HOSTED, stage: 'reminder' })
    if (first.subject === rem.subject) p.push(`${lang}: lembrete com o mesmo assunto do 1º aviso`)
    const reasons = new Set()
    for (const c of cats) {
      const m = E.renewalFailedEmailMessage({ language: lang, tier: 'pro', reasonCategory: c })
      const line = E.RENEWAL_FAILED_COPY[lang].reason(c)
      reasons.add(line)
      if (!m.text.includes(line)) p.push(`${lang}: motivo ${c} não entra no texto`)
      if (/\d{4}|visa|master|amex|ending|final|terminad|\*\*\*/i.test(line)) p.push(`${lang}: motivo ${c} expõe dado de cartão (${line})`)
    }
    if (reasons.size < 7) p.push(`${lang}: motivos não são distintos por categoria (${reasons.size})`)
    const legacy = E.renewalFailedEmailMessage({ language: lang, tier: 'pro' })
    if (!legacy.html.includes(`href="${PORTAL.replace(/&/g, '&amp;')}"`)) p.push(`${lang}: sem fatura hospedada a carta não cai no portal`)
  }
  if (reminderSubjects.size !== 3) p.push('assunto do lembrete não traduzido')

  // ── (4) a rodada de verdade ───────────────────────────────────────────────────────────────────────────────────────
  try {
    const w = world()
    const dry = await runRound(over, w, false)
    if (dry.mode !== 'DRY_RUN') p.push('rodada sem confirm não é DRY_RUN')
    if (w.sent.length !== 0 || w.events.length !== 0) p.push(`dry-run enviou/carimbou (${w.sent.length} envios, ${w.events.length} eventos)`)
    if (dry.would_send !== 2) p.push(`dry-run deveria apontar 2 envios (A e D), apontou ${dry.would_send}`)
    if (!w.stripeCalls.some(([n, p2]) => n === 'subscriptions.list' && p2?.status === 'past_due')) p.push('a fonte não é subscriptions.list({status:past_due})')

    const r1 = await runRound(over, w, true)
    const toA = w.sent.filter((s) => s.to === 'ana@example.com')
    if (toA.length !== 1) p.push(`1ª rodada: Ana deveria receber 1 (recebeu ${toA.length})`)
    else {
      if (!toA[0].html.includes(`href="${HOSTED}A"`)) p.push('1ª rodada: botão da Ana não é a fatura dela')
      if (!/fondos insuficientes/.test(toA[0].text)) p.push('1ª rodada: Ana (ES) sem o motivo em espanhol')
    }
    if (w.sent.some((s) => s.to === 'bia@example.com')) p.push('fatura PAGA recebeu e-mail')
    if (w.sent.some((s) => s.to === 'josephsskaf@gmail.com')) p.push('conta interna recebeu e-mail')
    if (w.sent.some((s) => s.to === 'eve@example.com')) p.push('quem nunca pagou recebeu e-mail')
    const stampA = w.events.filter((e) => e.name === 'renewal_payment_failed_email_sent' && e.metadata?.invoice_id === 'in_A')
    if (stampA.length !== 1) p.push(`1ª rodada: carimbo do 1º aviso da Ana = ${stampA.length}`)
    if (stampA[0] && stampA[0].metadata.link !== 'hosted_invoice') p.push('carimbo não registra o tipo de link')
    if (w.events.some((e) => e.metadata?.invoice_id === 'in_D' && /_sent$/.test(e.name))) p.push('Resend recusou (Dan) e mesmo assim carimbou')
    if (!w.events.some((e) => e.name === 'renewal_payment_failed_email_failed' && e.metadata?.invoice_id === 'in_D')) p.push('falha do Resend sem evento _failed')
    if (r1.sent !== 1 || r1.failed !== 1) p.push(`1ª rodada: sent=${r1.sent} failed=${r1.failed} (esperado 1/1)`)

    w.healDan()
    w.setClock(w.getClock() + 2 * 3_600_000)
    await runRound(over, w, true)
    if (w.sent.filter((s) => s.to === 'ana@example.com').length !== 1) p.push('2ª rodada (2 h depois): Ana recebeu de novo')
    const toD = w.sent.filter((s) => s.to === 'dan@example.com')
    if (toD.length !== 1) p.push(`2ª rodada: Dan deveria receber o 1º aviso agora (recebeu ${toD.length})`)
    else if (!toD[0].html.includes('/api/stripe/portal/update-card')) p.push('fatura sem link hospedado não caiu no portal')

    w.setClock(w.getClock() + 21 * 3_600_000)
    await runRound(over, w, true)
    const anaAll = w.sent.filter((s) => s.to === 'ana@example.com')
    if (anaAll.length !== 2) p.push(`dia 2: Ana deveria ter recebido o lembrete (total ${anaAll.length})`)
    else if (!/Recordatorio/.test(anaAll[1].subject)) p.push('dia 2: o 2º e-mail da Ana não é o lembrete')
    if (w.events.filter((e) => e.name === 'renewal_payment_failed_reminder_sent' && e.metadata?.invoice_id === 'in_A').length !== 1) p.push('lembrete sem carimbo próprio por fatura')

    w.setClock(w.getClock() + 30 * 3_600_000)
    await runRound(over, w, true)
    if (w.sent.filter((s) => s.to === 'ana@example.com').length !== 2) p.push('dia 3: Ana recebeu um 2º lembrete')
  } catch (err) {
    p.push(`rodada lançou: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── (5) ligações ──────────────────────────────────────────────────────────────────────────────────────────────────
  const route = src(ROUTE)
  const branch = route.indexOf('    if (req.nextUrl.searchParams.get(RENEWAL_FOLLOWUP_STAGE_PARAM) === RENEWAL_FOLLOWUP_STAGE_VALUE) {')
  const auth = route.indexOf('    if (!autorizadoPorCron(req)) {')
  if (branch < 0 || auth < 0 || !(auth < branch)) p.push('a etapa lembrete não está atrás do portão admin/cron')
  if (!route.includes("        confirm: req.nextUrl.searchParams.get('confirm') === 'SEND',\n")) p.push('a etapa lembrete não é dry-run por padrão')
  if (!route.includes("  if (!cronSecret) return false\n")) p.push('portão de cron deixou de ser fail-closed')
  let crons = []
  try { crons = JSON.parse(src(VERCEL)).crons ?? [] } catch { p.push('vercel.json ilegível') }
  const mine = crons.filter((c) => c.path === '/api/admin/send-renewal-declined?etapa=lembrete&confirm=SEND&limit=30')
  if (mine.length !== 1) p.push('cron do lembrete ausente (ou sem confirm=SEND) no vercel.json')
  else {
    const exp = (f, max) => { const out = new Set(); for (const part of f.split(',')) { let [r, st] = part.split('/'); st = st ? +st : 1; let a, b; if (r === '*') { a = 0; b = max } else if (r.includes('-')) { [a, b] = r.split('-').map(Number) } else { a = b = +r; if (st > 1) b = max } for (let i = a; i <= b; i += st) out.add(i) } return out }
    const slots = (s) => { const [m, hh] = s.split(' '); const out = []; for (const a of exp(m, 59)) for (const b of exp(hh, 23)) out.push(a + '|' + b); return out }
    const minev = new Set(slots(mine[0].schedule))
    const clash = crons.filter((c) => c !== mine[0] && slots(c.schedule).some((s) => minev.has(s)))
    if (clash.length) p.push(`cron do lembrete divide minuto+hora com ${clash.map((c) => c.path).join(', ')}`)
    if (minev.size < 2) p.push('cron do lembrete roda menos de 2×/dia (o lembrete passaria do dia 2)')
  }
  if (!src(LIST).split('\n').includes("  'renewal_payment_failed_reminder_sent',")) p.push('carimbo do lembrete fora da lista canônica de e-mails')
  if (/renewal_payment_failed_reminder_failed'/.test(src(LIST))) p.push('evento de falha do lembrete entrou na lista canônica')

  const follow = src(FOLLOW)
  const iRetrieve = follow.indexOf('        invoice = await stripe.invoices.retrieve(invoiceId)\n')
  const iDecide = follow.indexOf('    const decision: RenewalFollowUpDecision = decideRenewalFollowUp({')
  const iStatus = follow.indexOf('      invoiceStatus: invoice?.status ?? null,\n')
  const iDry = follow.indexOf('    if (!confirm) { rows.push(row); continue }\n')
  const iFetch = follow.indexOf("      res = await fetch('https://api.resend.com/emails', {")
  const iNotOk = follow.indexOf('    if (!res || !res.ok) {\n')
  const iStamp = follow.indexOf("      name: decision.stage === 'reminder' ? RENEWAL_FAILED_REMINDER_EVENT : RENEWAL_FAILED_EMAIL_EVENT,\n")
  if ([iRetrieve, iDecide, iStatus, iDry, iFetch, iNotOk, iStamp].some((i) => i < 0)) p.push('âncoras da rodada sumiram (releitura, decisão, dry-run, envio, carimbo)')
  else if (!(iRetrieve < iDecide && iDecide < iStatus && iStatus < iDry && iDry < iFetch && iFetch < iNotOk && iNotOk < iStamp)) p.push('ordem quebrada: releitura → decisão → dry-run → envio → (só se ok) carimbo')
  if (follow.split('\n').some((l) => !/^\s*\/\//.test(l) && /\.in\(/.test(l))) p.push('a rodada usa .in() (truncável)')
  if (count(follow, ".eq('metadata->>invoice_id', invoiceId)") !== 1 || !follow.includes("    .order('created_at', { ascending: true })\n")) p.push('dedupe por fatura sem filtro/ordem')
  if (/void\s+(writeServerEvent|recordEmailSend|recordResendResponse|fetch)\b/.test(follow)) p.push('escrita com void na rodada (morre na Vercel)')

  const helperStart = hook.indexOf('async function sendRenewalFailedEmailOnce(')
  const helper = helperStart < 0 ? '' : hook.slice(helperStart, hook.indexOf('\n}\n', helperStart) + 3)
  if (!helper.includes('      hostedInvoiceUrl: input.invoice.hosted_invoice_url,\n')) p.push('webhook: 1º aviso sem o link de 1 clique')
  if (!helper.includes('      reasonCategory,\n') || !helper.includes('    const reasonCategory = await readInvoiceDeclineCategory(input.invoice)\n')) p.push('webhook: 1º aviso sem o motivo')
  if (!/'hosted_invoice_url' \| 'payment_intent'>/.test(helper)) p.push('webhook: a fatura passada ao helper perdeu hosted_invoice_url/payment_intent')
  const decline = src(DECLINE)
  if (/\bthrow\b/.test(decline) || !decline.includes('Promise.race([stripe.paymentIntents.retrieve(id), timeout])')) p.push('leitura do motivo pode lançar ou não tem teto de tempo')

  const me = src(ME)
  if (!me.includes("          if (invoice.status === 'open' && isStripeHostedInvoiceUrl(invoice.hosted_invoice_url)) payUrl = invoice.hosted_invoice_url ?? null\n")) p.push('/api/me/subscription não entrega a fatura aberta validada')
  if (!me.includes('    if (RENEWAL_NOTICE_STATUSES.has(sub.status)) {\n')) p.push('/api/me/subscription consulta fatura fora da cobrança')
  const banner = src(BANNER)
  if (!banner.includes('    if (payUrl) {\n      window.location.assign(payUrl)\n') || !banner.includes("fetch('/api/stripe/portal', { method: 'POST'")) p.push('banner não usa a fatura aberta com queda para o portal')

  // ── (6) nada de preço/cupom/cobrança ──────────────────────────────────────────────────────────────────────────────
  const forbidden = /\b(prices|coupons|promotionCodes|checkout\.sessions)\.|\.(create|update|del|cancel|pay|confirm|finalizeInvoice|voidInvoice|markUncollectible)\(/
  for (const f of [FOLLOW, DECLINE, EMAIL]) {
    const lines = src(f).split('\n').filter((l) => /stripe\./.test(l) && forbidden.test(l))
    if (lines.length) p.push(`${f} faz chamada que muda preço/cobrança: ${lines[0].trim()}`)
  }
  const meCalls = me.split('\n').filter((l) => /stripe\./.test(l) && forbidden.test(l))
  if (meCalls.length) p.push(`/api/me/subscription faz chamada que muda cobrança: ${meCalls[0].trim()}`)
  return p
}

console.log('TESTE cartão recusado — tolerância, 1 clique, motivo, lembrete do dia 2 (15/10)')
const real = await problems()
ok(real.length === 0, '(1–6) tolerância, decisão da rodada, link/motivo/textos, rodada executada, ligações, nada de cobrança' + (real.length ? ' → ' + real.join(' | ') : ''))

const mutants = [
  ['M1 lembrete sem esperar 20 h', EMAIL, "  if (x.nowMs - firstMs < RENEWAL_FAILED_REMINDER_AFTER_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }\n", ''],
  ['M2 manda para fatura já paga', EMAIL, "  if (x.invoiceStatus !== 'open') return { send: false, reason: 'invoice_not_open' }\n", ''],
  ['M3 ignora o carimbo do lembrete', EMAIL, "  if (x.reminderSent) return { send: false, reason: 'already_reminded' }\n", ''],
  ['M4 carimbo ilegível manda mesmo assim', EMAIL, "  if (!x.dedupeReadable) return { send: false, reason: 'dedupe_unavailable' }\n", ''],
  ['M5 link aceita host parecido', EMAIL, '    return u.protocol === \'https:\' && u.hostname === STRIPE_HOSTED_INVOICE_HOST\n', '    return u.protocol === \'https:\' && u.hostname.startsWith(STRIPE_HOSTED_INVOICE_HOST)\n'],
  ['M6 motivo expõe o cartão', EMAIL, "        case 'insufficient_funds': return 'Your bank said the card did not have enough funds at that moment.'\n", "        case 'insufficient_funds': return 'Your Visa ending 4242 did not have enough funds.'\n"],
  ['M7 conta interna recebe', EMAIL, "  if (x.internal) return { send: false, reason: 'internal' }\n", ''],
  ['M8 past_due perde o acesso na hora', ACCESS, "export const STRIPE_DUNNING_STATUSES = ['past_due'] as const\n", 'export const STRIPE_DUNNING_STATUSES = [] as const\n'],
  ['M9 falha de pagamento zera créditos', HOOK, "          .update({ is_pro: false, plan: 'free' })\n", "          .update({ is_pro: false, plan: 'free', video_credits: 0 })\n"],
  ['M10 rodada sem dry-run', FOLLOW, '    if (!confirm) { rows.push(row); continue }\n', ''],
  ['M11 rodada sem reler a fatura', FOLLOW, '        invoice = await stripe.invoices.retrieve(invoiceId)\n', "        invoice = { id: invoiceId, status: 'open', billing_reason: 'subscription_cycle', hosted_invoice_url: null } as unknown as Stripe.Invoice\n"],
  ['M12 carimba mesmo com o Resend recusando', FOLLOW, '    if (!res || !res.ok) {\n', '    if (!res) {\n'],
  ['M13 rodada cobra a fatura', FOLLOW, '    const reasonCategory = await readInvoiceDeclineCategory(invoice)\n', '    await stripe.invoices.pay(invoice.id)\n    const reasonCategory = await readInvoiceDeclineCategory(invoice)\n'],
  ['M14 rota envia sem confirm', ROUTE, "        confirm: req.nextUrl.searchParams.get('confirm') === 'SEND',\n", '        confirm: true,\n'],
  ['M15 cron sem confirm', VERCEL, '"/api/admin/send-renewal-declined?etapa=lembrete&confirm=SEND&limit=30"', '"/api/admin/send-renewal-declined?etapa=lembrete&limit=30"'],
  ['M16 cron no minuto de outro job', VERCEL, '"schedule": "13 14,22 * * *"', '"schedule": "0 13,22 * * *"'],
  ['M17 lembrete fora da lista canônica', LIST, "  'renewal_payment_failed_reminder_sent',\n", ''],
  ['M18 webhook sem link de 1 clique', HOOK, '      hostedInvoiceUrl: input.invoice.hosted_invoice_url,\n', ''],
  ['M19 banner sem a fatura aberta', BANNER, '    if (payUrl) {\n      window.location.assign(payUrl)\n', '    if (false) {\n      window.location.assign(String(payUrl))\n'],
]
for (const [label, file, from, to] of mutants) {
  const original = read(file)
  if (!original.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = original.replace(from, to)
  if (mutated === original) { ok(false, `(${label}) mutante não aplicou`); continue }
  let bitten = false
  try {
    const why = await problems({ [file]: mutated })
    bitten = why.length > 0
    if (process.env.SHOW_MUTANT_REASONS) console.log('     ↳ ' + why.join(' | '))
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
