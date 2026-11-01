// KINEO-CARTAO-RECUSADO-0111 — guardião do laço automático do CARTÃO RECUSADO (fundador 01/11, "pode fazer tudo").
// MEDIDO: em 13/10, 3 de 4 perdas na 1ª renovação foram cartão recusado; a cintia teve 4 recusas e o laço calou depois do
// 1º lembrete (08/10 aviso, 15/10 lembrete, 24/10 recusa sem uma linha, carta manual só em 31/10).
// Sem rede, sem banco, sem credencial. EXECUTA a rota real app/api/admin/send-renewal-declined (?etapa=lembrete), com a
// Stripe, o banco (events/profiles) e o Resend EM MEMÓRIA, e prova:
//   (1) régua pura: 1º aviso · lembrete no dia 3 (≥ 48 h) · último lembrete no dia 7 (≥ 144 h, ≥ 48 h do lembrete,
//       nunca para fatura de antes da régua) · depois disso, nada;
//   (2) a rota: sem confirm = DRY_RUN (nada sai, nada é carimbado); sem cron/admin = 403; com confirm=SEND manda;
//       2ª rodada não repete (dedupe por fatura e por etapa); `card_failed_email_sent` com attempt 1/2/3, uma linha por
//       envio; Resend recusando não carimba; quem PAGOU para; assinatura CANCELADA não recebe; fatura antiga (cintia)
//       não ganha "dia 7" semanas depois;
//   (3) brasileiro com cartão BR em cobrança USD recebe a dica honesta (liberar compra internacional / outro cartão) e
//       NENHUMA promessa de Pix (não existe trilho em reais para fatura de renovação);
//   (4) `card_recovered`: fatura paga depois de falha (Stripe tentou >1 vez ou mandamos e-mail) — e só ela; nunca lança;
//   (5) ligações: webhook grava attempt 1 e chama o card_recovered; cron no vercel.json com confirm=SEND; carimbos fora
//       do alcance do navegador; último lembrete na lista canônica; banner com a frase e os eventos novos;
//   (6) mutantes: cada regra quebrada fica vermelha.
//   (7) KINEO-CARTAO-RECUSADO-0111b — quem cancelou pelo portal no modo "fim do período" (cancel_at_period_end) ou com data
//       marcada (cancel_at) segue past_due e a Stripe segue tentando: NENHUMA etapa sai (nem o 1º aviso do webhook), o
//       relatório mostra cancel_scheduled, e o fato ausente fecha a porta.
// Rodar: node scripts/test-cartao-recusado-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const EMAIL = 'lib/billing/renewalFailedEmail.ts'
const FOLLOW = 'lib/billing/renewalFailedFollowUp.ts'
const RECOVER = 'lib/billing/cardRecovered.ts'
const ROUTE = 'app/api/admin/send-renewal-declined/route.ts'
const HOOK = 'app/api/stripe/webhook/route.ts'
const LIST = 'lib/lifecycle/emailEvents.ts'
const EVENTS_ROUTE = 'app/api/events/route.ts'
const VERCEL = 'vercel.json'
const BANNER = 'components/RenewalDeclinedBanner.tsx'
const NOTICE = 'lib/billing/renewalNotice.ts'
const HOSTED = 'https://invoice.stripe.com/i/acct_TEST/test_'
const H = 3_600_000

type Over = Record<string, string>

/** Carrega um módulo TS (transpilado); '@/x' → ROOT/x.ts, './x' e '../x' relativos; `stubs` ganha de tudo. */
function load(rel: string, over: Over, stubs: Record<string, unknown>, cache = new Map<string, unknown>()): any {
  if (cache.has(rel)) return cache.get(rel)
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod: { exports: any } = { exports: {} }
  cache.set(rel, mod.exports)
  const req = (name: string) => {
    if (stubs[name]) return stubs[name]
    if (name.startsWith('node:')) return require(name)
    let target: string
    if (name.startsWith('@/')) target = name.slice(2) + '.ts'
    else if (name.startsWith('./') || name.startsWith('../')) target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), name + '.ts'))
    else throw new Error(`${rel}: import inesperado ${name}`)
    return load(target, over, stubs, cache)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  cache.set(rel, mod.exports)
  return mod.exports
}

// ── O mundo em memória: Stripe, banco e Resend ────────────────────────────────────────────────────────────────────────
type Ev = { name: string; user_id: string | null; metadata: Record<string, any>; created_at: string }
function world(startIso: string) {
  let clock = Date.parse(startIso)
  const iso = (ms: number) => new Date(ms).toISOString()
  const events: Ev[] = []
  const sent: Array<{ to: string; subject: string; text: string; html: string }> = []
  const failFor = new Set<string>()
  const profiles: Record<string, any> = {
    sub_ana: { id: 'u-ana', email: 'ana@example.com', has_paid: true, plan: 'starter', signup_country: 'US', last_country: null },
    sub_bru: { id: 'u-bru', email: 'bruno@example.com', has_paid: true, plan: 'basic', signup_country: 'BR', last_country: null },
    sub_car: { id: 'u-car', email: 'carla@example.com', has_paid: true, plan: 'pro', signup_country: 'US', last_country: null },
    sub_cin: { id: 'u-cin', email: 'cintia@example.com', has_paid: true, plan: 'starter', signup_country: 'ES', last_country: null },
    sub_dan: { id: 'u-dan', email: 'dan@example.com', has_paid: true, plan: 'starter', signup_country: 'US', last_country: null },
    // KINEO-CARTAO-RECUSADO-0111b — cancelaram pelo portal, mas a assinatura segue past_due (a Stripe segue tentando).
    sub_eva: { id: 'u-eva', email: 'eva@example.com', has_paid: true, plan: 'starter', signup_country: 'US', last_country: null },
    sub_fel: { id: 'u-fel', email: 'felipe@example.com', has_paid: true, plan: 'basic', signup_country: 'BR', last_country: null },
  }
  const subs: Record<string, any> = {
    sub_ana: { id: 'sub_ana', status: 'past_due', latest_invoice: 'in_ana', metadata: { tier: 'starter' } },
    sub_bru: { id: 'sub_bru', status: 'past_due', latest_invoice: 'in_bru', metadata: { tier: 'basic' } },
    sub_car: { id: 'sub_car', status: 'canceled', latest_invoice: 'in_car', metadata: { tier: 'pro' } },
    sub_cin: { id: 'sub_cin', status: 'past_due', latest_invoice: 'in_cin', metadata: { tier: 'starter' } },
    sub_dan: { id: 'sub_dan', status: 'past_due', latest_invoice: 'in_dan', metadata: { tier: 'starter' } },
    // Eva: "cancelar no fim do período" (cancel_at_period_end). Felipe: cancelamento com DATA marcada (cancel_at).
    sub_eva: { id: 'sub_eva', status: 'past_due', latest_invoice: 'in_eva', metadata: { tier: 'starter' }, cancel_at_period_end: true, cancel_at: null },
    sub_fel: { id: 'sub_fel', status: 'past_due', latest_invoice: 'in_fel', metadata: { tier: 'basic' }, cancel_at_period_end: false, cancel_at: 1_800_000_000 },
  }
  const inv = (id: string, extra: Record<string, unknown> = {}) => ({ id, status: 'open', billing_reason: 'subscription_cycle', currency: 'usd', hosted_invoice_url: HOSTED + id, attempt_count: 2, payment_intent: 'pi_' + id, ...extra })
  const invoices: Record<string, any> = {
    in_ana: inv('in_ana'),
    in_bru: inv('in_bru'),
    in_car: inv('in_car'), // fatura ainda 'open', mas a assinatura foi CANCELADA
    in_cin: inv('in_cin', { attempt_count: 4 }),
    in_dan: inv('in_dan'),
    in_eva: inv('in_eva'),
    in_fel: inv('in_fel'),
  }
  const cardCountry: Record<string, string> = { pi_in_bru: 'BR', pi_in_ana: 'US', pi_in_cin: 'ES', pi_in_dan: 'US', pi_in_car: 'US', pi_in_eva: 'US', pi_in_fel: 'BR' }
  const stripeWrites: string[] = []
  const stripe = {
    subscriptions: {
      list: (p: { status?: string }) => (async function* () {
        for (const s of Object.values(subs)) if (!p?.status || s.status === p.status) yield { ...s }
      })(),
    },
    invoices: {
      retrieve: async (id: string) => ({ ...invoices[id] }),
      pay: async () => { stripeWrites.push('invoices.pay') },
    },
    paymentIntents: {
      retrieve: async (id: string) => ({ id, last_payment_error: { decline_code: 'insufficient_funds', code: 'card_declined', payment_method: { card: { country: cardCountry[id] ?? null } } } }),
    },
  }
  let eventsReadable = true
  const admin = {
    from(table: string) {
      const f: { eqs: Array<[string, unknown]>; ord: unknown; lim: number | null } = { eqs: [], ord: null, lim: null }
      const run = () => {
        if (table === 'profiles') {
          const sub = f.eqs.find(([c]) => c === 'stripe_subscription_id')?.[1] as string
          return { data: profiles[sub] ? [profiles[sub]] : [], error: null }
        }
        if (table === 'events') {
          if (!eventsReadable) return { data: null, error: { message: 'events indisponível' } }
          const name = f.eqs.find(([c]) => c === 'name')?.[1]
          const invId = f.eqs.find(([c]) => c === 'metadata->>invoice_id')?.[1]
          if (!name || !invId || !f.ord) return { data: null, error: { message: 'consulta sem nome/fatura/ordem' } }
          const rows = events.filter((e) => e.name === name && e.metadata?.invoice_id === invId).sort((a, b) => a.created_at.localeCompare(b.created_at))
          return { data: rows.slice(0, f.lim ?? rows.length), error: null }
        }
        return { data: [], error: null }
      }
      const q: any = {
        select() { return q },
        eq(col: string, val: unknown) { f.eqs.push([col, val]); return q },
        order(col: string, o: unknown) { f.ord = [col, o]; return q },
        limit(n: number) { f.lim = n; return Promise.resolve(run()) },
        maybeSingle() { const r = run(); return Promise.resolve({ data: (r.data ?? [])[0] ?? null, error: r.error }) },
        insert() { throw new Error('a rodada não insere em tabela nenhuma direto') },
      }
      return q
    },
  }
  const writeServerEvent = async (e: { name: string; userId?: string | null; metadata?: Record<string, unknown>; sessionId?: string | null; dedupeMinutes?: number }) => {
    if (e.sessionId && e.dedupeMinutes && events.some((x) => x.name === e.name && x.metadata?.__session === e.sessionId && clock - Date.parse(x.created_at) < e.dedupeMinutes! * 60_000)) return true
    events.push({ name: e.name, user_id: e.userId ?? null, metadata: { ...(e.metadata ?? {}), __session: e.sessionId ?? null }, created_at: iso(clock) })
    return true
  }
  const fetchStub = async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body)
    const to = Array.isArray(body.to) ? body.to[0] : body.to
    const good = !failFor.has(to)
    if (good) sent.push({ to, subject: body.subject, text: body.text, html: body.html })
    return { ok: good, status: good ? 200 : 422, json: async () => ({ id: 're_' + sent.length }) }
  }
  const stubs: Record<string, unknown> = {
    'next/server': {
      NextRequest: class {},
      NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }) },
    },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
    '@supabase/supabase-js': { createClient: () => admin },
    '@/lib/emailSuppression': { emailFooterHtml: () => '', emailFooterText: () => '', unsubscribeHeaders: () => ({}) },
    '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
    '@/lib/internalAccounts': { isInternalEmail: (e: unknown) => /josephsskaf/.test(String(e ?? '')) },
    '../_shared/mrr': { PAID_PLANS: new Set(['starter', 'basic', 'pro']) },
    '@/lib/supabase/readAll': { readAll: async () => ({ data: [], error: null }) },
    '@/lib/stripe': { stripe },
    '@/lib/serverEvents': { writeServerEvent },
    '@/lib/email/quota': { recordResendResponse: async () => {}, recordEmailSend: async () => {} },
  }
  return {
    events, sent, subs, invoices, profiles, stripeWrites, admin, stubs, fetchStub, failFor,
    now: () => clock,
    advance: (hours: number) => { clock += hours * H },
    stamp: (name: string, invoiceId: string, userId: string, hoursAgo: number) => events.push({ name, user_id: userId, metadata: { invoice_id: invoiceId }, created_at: iso(clock - hoursAgo * H) }),
    pay: (subId: string) => { subs[subId].status = 'active'; invoices[subs[subId].latest_invoice].status = 'paid' },
    setEventsReadable: (v: boolean) => { eventsReadable = v },
  }
}

type W = ReturnType<typeof world>

/** Chama o GET REAL da rota, com o relógio do mundo. */
async function callRoute(over: Over, w: W, query: string, auth: 'cron' | 'none' = 'cron') {
  process.env.RESEND_API_KEY = 're_test'
  process.env.CRON_SECRET = 'cron_test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_test'
  const M = load(ROUTE, over, w.stubs)
  const req = {
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' && auth === 'cron' ? 'Bearer cron_test' : null) },
    nextUrl: { searchParams: new URLSearchParams(query) },
  }
  const realFetch = globalThis.fetch
  const realTimeout = globalThis.setTimeout
  const realNow = Date.now
  globalThis.fetch = w.fetchStub as unknown as typeof fetch
  globalThis.setTimeout = ((fn: () => void) => realTimeout(fn, 0)) as unknown as typeof setTimeout
  Date.now = () => w.now()
  try {
    return await M.GET(req)
  } finally {
    globalThis.fetch = realFetch
    globalThis.setTimeout = realTimeout
    Date.now = realNow
  }
}

const ROUND = 'etapa=lembrete&confirm=SEND&limit=30'
const DRY = 'etapa=lembrete&limit=30'

async function problems(over: Over = {}): Promise<string[]> {
  const p: string[] = []
  const src = (rel: string) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let E: any
  try { E = load(EMAIL, over, {}) } catch (err) { return [`módulo puro não carrega: ${(err as Error).message}`] }

  // ── (1) régua pura ──────────────────────────────────────────────────────────────────────────────────────────────────
  const now = Date.parse('2026-11-01T14:13:00Z')
  const ago = (h: number) => new Date(now - h * H).toISOString()
  const base = {
    live: true, billingReason: 'subscription_cycle', invoiceId: 'in_1', invoiceStatus: 'open', subscriptionStatus: 'past_due',
    ownerId: 'u1', ownerHasPaid: true, internal: false, dedupeReadable: true, firstSentAt: ago(2), reminderSent: false,
    reminderSentAt: null, finalSent: false, recipientEmail: 'a@example.com', nowMs: now, cancelScheduled: false,
  }
  const casos: Array<[Record<string, unknown>, string | false, string]> = [
    [{ ...base, firstSentAt: null }, 'first', '1º aviso que faltou'],
    [{ ...base, firstSentAt: ago(47) }, false, 'lembrete 47 h depois (cedo)'],
    [{ ...base, firstSentAt: ago(48) }, 'reminder', 'lembrete 48 h depois (dia 3)'],
    [{ ...base, firstSentAt: ago(100), reminderSent: true, reminderSentAt: ago(52) }, false, 'último lembrete 100 h depois (cedo)'],
    [{ ...base, firstSentAt: ago(144), reminderSent: true, reminderSentAt: ago(96) }, 'final', 'último lembrete 144 h depois (dia 7)'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: ago(10) }, false, 'último lembrete a 10 h do lembrete (intervalo mínimo)'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: null }, false, 'lembrete sem data (carimbo antigo) não libera o último'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: 'lixo' }, false, 'data do lembrete ilegível'],
    [{ ...base, firstSentAt: ago(24 * 24), reminderSent: true, reminderSentAt: ago(17 * 24) }, false, 'fatura de antes da régua (cintia) não ganha dia 7 semanas depois'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: ago(96), finalSent: true }, false, 'os 3 e-mails já saíram'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: ago(96), invoiceStatus: 'paid' }, false, 'pagou → para'],
    [{ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: ago(96), subscriptionStatus: 'canceled' }, false, 'cancelou → para'],
    [{ ...base, firstSentAt: null, reminderSent: true }, false, 'lembrete sem 1º aviso (carimbo incoerente)'],
    // KINEO-CARTAO-RECUSADO-0111b — cancelou pelo portal (fim do período / data marcada) e segue past_due: nenhuma etapa sai.
    [{ ...base, firstSentAt: null, cancelScheduled: true }, false, 'cancelou no fim do período → sem 1º aviso que faltou'],
    [{ ...base, firstSentAt: ago(48), cancelScheduled: true }, false, 'cancelou no fim do período → sem lembrete do dia 3'],
    [{ ...base, firstSentAt: ago(144), reminderSent: true, reminderSentAt: ago(96), cancelScheduled: true }, false, 'cancelou no fim do período → sem último lembrete do dia 7'],
    [{ ...base, firstSentAt: ago(48), cancelScheduled: undefined }, false, 'cancelamento desconhecido (fato ausente) → não envia (porta fechada)'],
  ]
  for (const [row, want, label] of casos) {
    const d = E.decideRenewalFollowUp(row)
    const got = d?.send ? d.stage : false
    if (got !== want) p.push(`régua errada: ${label} (deu ${got})`)
  }
  if (E.decideRenewalFollowUp({ ...base, firstSentAt: ago(150), reminderSent: true, reminderSentAt: ago(96), finalSent: true })?.reason !== 'sequence_done') p.push('motivo do fim da régua não é sequence_done')
  if (E.decideRenewalFollowUp({ ...base, firstSentAt: ago(48), cancelScheduled: true })?.reason !== 'cancel_scheduled') p.push('motivo do pulo de quem cancelou não é cancel_scheduled')
  // 1º aviso do webhook: a mesma porta.
  const hookBase = { live: true, billingReason: 'subscription_cycle', invoiceId: 'in_1', ownerId: 'u1', ownerHasPaid: true, subscriptionStatus: 'past_due', alreadySentForInvoice: false, recipientEmail: 'a@example.com', marketingOptOut: false, cancelScheduled: false }
  if (E.decideRenewalFailedEmail(hookBase)?.send !== true) p.push('webhook: 1º aviso normal deixou de sair')
  if (E.decideRenewalFailedEmail({ ...hookBase, cancelScheduled: true })?.reason !== 'cancel_scheduled') p.push('webhook: quem cancelou no fim do período recebe o 1º aviso')
  if (E.decideRenewalFailedEmail({ ...hookBase, cancelScheduled: undefined })?.send !== false) p.push('webhook: cancelamento desconhecido manda o 1º aviso (porta aberta)')
  // Leitura da assinatura viva.
  const cs = E.stripeSubscriptionCancelScheduled
  if (typeof cs !== 'function') p.push('stripeSubscriptionCancelScheduled ausente')
  else {
    if (cs({ cancel_at_period_end: true, cancel_at: null }) !== true) p.push('cancel_at_period_end não conta como cancelamento')
    if (cs({ cancel_at_period_end: false, cancel_at: 1_800_000_000 }) !== true) p.push('cancel_at (data marcada) não conta como cancelamento')
    if (cs({ cancel_at_period_end: false, cancel_at: null }) !== false) p.push('assinatura sem cancelamento lida como cancelada')
    if (cs({}) !== false || cs(null) !== false) p.push('assinatura sem os campos lida como cancelada')
  }
  if (E.cardFailedEmailAttempt('first') !== 1 || E.cardFailedEmailAttempt('reminder') !== 2 || E.cardFailedEmailAttempt('final') !== 3) p.push('attempt 1/2/3 trocado')
  if (E.isBrazilianCardInUsd('usd', 'BR') !== true || E.isBrazilianCardInUsd('brl', 'BR') !== false || E.isBrazilianCardInUsd('usd', 'ES') !== false || E.isBrazilianCardInUsd(null, null) !== false) p.push('detecção do cartão BR em USD errada')

  // ── (3) textos: último lembrete e a dica BR, sem Pix e sem preço ────────────────────────────────────────────────────
  const finals = new Set<string>()
  for (const lang of ['en', 'pt', 'es']) {
    const fin = E.renewalFailedEmailMessage({ language: lang, tier: 'basic', hostedInvoiceUrl: HOSTED + 'x', reasonCategory: 'insufficient_funds', stage: 'final' })
    const rem = E.renewalFailedEmailMessage({ language: lang, tier: 'basic', hostedInvoiceUrl: HOSTED + 'x', stage: 'reminder' })
    finals.add(fin.subject)
    if (fin.subject === rem.subject) p.push(`${lang}: último lembrete com o assunto do lembrete`)
    if ((fin.html.match(/<a\s/g) || []).length !== 1) p.push(`${lang}: último lembrete sem exatamente UM link`)
    const br = E.renewalFailedEmailMessage({ language: lang, tier: 'basic', hostedInvoiceUrl: HOSTED + 'x', reasonCategory: 'card_restricted', stage: 'first', brazilianCardInUsd: true })
    const plain = E.renewalFailedEmailMessage({ language: lang, tier: 'basic', hostedInvoiceUrl: HOSTED + 'x', reasonCategory: 'card_restricted', stage: 'first' })
    const hint = E.RENEWAL_FAILED_COPY[lang].brCardUsd
    if (!br.text.includes(hint) || !br.html.includes(hint)) p.push(`${lang}: dica do cartão BR em USD não entra na carta`)
    if (plain.text.includes(hint)) p.push(`${lang}: dica BR aparece para quem não é cartão BR em USD`)
    for (const m of [fin, br]) {
      if (/\bpix\b|em reais|in reais|en reales|boleto/i.test(m.text + m.html)) p.push(`${lang}: carta promete Pix/reais (não existe trilho para renovação)`)
      if (/\$\s?\d|\d\s?%|discount|desconto|descuento|coupon|cupom|cupón/i.test(m.text + m.html)) p.push(`${lang}: carta fala de preço/desconto`)
      if (/\bdays?\b.*\b(cancel|lose)|em \d+ dias|en \d+ días|\d+ (days|dias|días)/i.test(m.text)) p.push(`${lang}: carta inventa prazo`)
    }
  }
  if (finals.size !== 3) p.push('assunto do último lembrete não traduzido')

  // ── (2) a rota real, rodada a rodada ────────────────────────────────────────────────────────────────────────────────
  try {
    const w = world('2026-11-01T14:13:00Z')
    // Estado inicial: a cintia (fatura de antes da régua) já recebeu 1º aviso há 24 dias e lembrete há 17 — como na vida real.
    w.stamp(E.RENEWAL_FAILED_EMAIL_EVENT, 'in_cin', 'u-cin', 24 * 24)
    w.stamp(E.RENEWAL_FAILED_REMINDER_EVENT, 'in_cin', 'u-cin', 17 * 24)
    // Dan: o 1º aviso saiu agora pelo webhook (carimbo de 1 h).
    w.stamp(E.RENEWAL_FAILED_EMAIL_EVENT, 'in_dan', 'u-dan', 1)
    // Felipe recebeu o 1º aviso há 1 h e DEPOIS cancelou no portal (data marcada): não pode ganhar o dia 3 nem o dia 7.
    w.stamp(E.RENEWAL_FAILED_EMAIL_EVENT, 'in_fel', 'u-fel', 1)
    w.failFor.add('ana@example.com') // Resend recusa a Ana na 1ª rodada
    const before = w.events.length

    const forbidden = await callRoute(over, w, ROUND, 'none')
    if (forbidden.status !== 403) p.push(`rota sem cron/admin não devolveu 403 (deu ${forbidden.status})`)
    if (w.sent.length) p.push('rota sem autorização enviou e-mail')

    const dry = await callRoute(over, w, DRY)
    if (dry.body?.mode !== 'DRY_RUN') p.push('rota sem confirm não é DRY_RUN')
    if (w.sent.length !== 0 || w.events.length !== before) p.push(`dry-run enviou/carimbou (${w.sent.length} envios, ${w.events.length - before} eventos)`)
    if (dry.body?.would_send !== 2) p.push(`dry-run deveria apontar 2 envios (Ana e Bruno, 1º aviso), apontou ${dry.body?.would_send}`)
    if ((dry.body?.rows ?? []).some((r: any) => r.subscription_ref === 'sub_car')) p.push('assinatura cancelada entrou na rodada')
    for (const ref of ['sub_eva', 'sub_fel']) {
      const row = (dry.body?.rows ?? []).find((r: any) => r.subscription_ref === ref)
      if (row?.decision !== 'cancel_scheduled') p.push(`dry-run: ${ref} (cancelou, segue past_due) não saiu como cancel_scheduled (${row?.decision})`)
    }

    const r1 = await callRoute(over, w, ROUND)
    if (r1.body?.mode !== 'SENT') p.push('rodada com confirm=SEND não é SENT')
    const to = (who: string) => w.sent.filter((s) => s.to === who)
    if (to('bruno@example.com').length !== 1) p.push(`rodada 1: Bruno deveria receber o 1º aviso (recebeu ${to('bruno@example.com').length})`)
    else {
      const b = to('bruno@example.com')[0]
      if (!/Sua renovação da Kineo não passou/.test(b.subject)) p.push('rodada 1: Bruno (BR) não recebeu em português')
      if (!b.text.includes(E.RENEWAL_FAILED_COPY.pt.brCardUsd)) p.push('rodada 1: Bruno (cartão BR, fatura USD) sem a dica')
      if (!b.html.includes(`href="${HOSTED}in_bru"`)) p.push('rodada 1: botão do Bruno não é a fatura dele')
    }
    if (to('ana@example.com').length !== 0) p.push('Resend recusou a Ana e mesmo assim contou envio')
    if (w.events.some((e) => e.metadata?.invoice_id === 'in_ana' && /_sent$/.test(e.name))) p.push('Resend recusou (Ana) e mesmo assim carimbou')
    if (to('carla@example.com').length) p.push('assinatura CANCELADA recebeu e-mail')
    if (to('dan@example.com').length) p.push('Dan recebeu outro e-mail 1 h depois do 1º aviso do webhook')
    if (to('cintia@example.com').length) p.push('fatura de antes da régua (cintia) recebeu o "dia 7" semanas depois')
    const cf = (inv: string, attempt?: number) => w.events.filter((e) => e.name === E.CARD_FAILED_EMAIL_SENT_EVENT && e.metadata?.invoice_id === inv && (attempt === undefined || e.metadata?.attempt === attempt))
    if (cf('in_bru', 1).length !== 1) p.push(`card_failed_email_sent attempt 1 do Bruno = ${cf('in_bru', 1).length}`)
    if (cf('in_ana').length !== 0) p.push('card_failed_email_sent gravado para envio que falhou')

    // 2ª rodada no mesmo instante (cron repetido / reenvio): dedupe. A Ana agora passa no Resend.
    w.failFor.clear()
    await callRoute(over, w, ROUND)
    if (to('bruno@example.com').length !== 1) p.push('rodada repetida: Bruno recebeu de novo (dedupe por fatura quebrado)')
    if (to('ana@example.com').length !== 1) p.push('rodada repetida: Ana (Resend voltou) não recebeu o 1º aviso')
    await callRoute(over, w, ROUND)
    if (to('ana@example.com').length !== 1 || to('bruno@example.com').length !== 1) p.push('3ª rodada no mesmo instante repetiu envio')

    // Dia 3: lembrete para Ana, Bruno e Dan.
    w.advance(49)
    await callRoute(over, w, ROUND)
    if (to('bruno@example.com').length !== 2 || !/Lembrete/.test(to('bruno@example.com')[1]?.subject ?? '')) p.push('dia 3: Bruno sem o lembrete')
    if (to('ana@example.com').length !== 2) p.push('dia 3: Ana sem o lembrete')
    if (to('dan@example.com').length !== 1) p.push('dia 3: Dan sem o lembrete')
    if (cf('in_bru', 2).length !== 1) p.push('dia 3: card_failed_email_sent attempt 2 ausente/duplicado')
    if (to('cintia@example.com').length) p.push('dia 3: cintia recebeu (fatura de antes da régua)')

    // Bruno paga a fatura (a Stripe vira active/paid). Daqui em diante, nada para ele.
    w.advance(11)
    w.pay('sub_bru')
    // Dia 7 (contado do 1º aviso da Ana/Bruno): último lembrete da Ana; Bruno pagou → nada.
    w.advance(90)
    await callRoute(over, w, ROUND)
    if (to('ana@example.com').length !== 3 || !/Last reminder/.test(to('ana@example.com')[2]?.subject ?? '')) p.push('dia 7: Ana sem o último lembrete')
    if (cf('in_ana', 3).length !== 1) p.push('dia 7: card_failed_email_sent attempt 3 ausente/duplicado')
    if (to('bruno@example.com').length !== 2) p.push('dia 7: Bruno PAGOU e mesmo assim recebeu')
    // Dan: o 1º aviso foi do webhook (fora desta caixa); aqui saem o lembrete e o último.
    if (to('dan@example.com').length !== 2 || !/Last reminder/.test(to('dan@example.com')[1]?.subject ?? '')) p.push('dia 7: Dan (1º aviso pelo webhook) sem o último lembrete')

    // Depois do dia 7: silêncio (sequence_done), mesmo com a fatura ainda aberta.
    w.advance(72)
    const after = await callRoute(over, w, ROUND)
    if (to('ana@example.com').length !== 3) p.push('depois do dia 7: Ana recebeu um 4º e-mail')
    if (!((after.body?.counts?.sequence_done ?? 0) >= 2)) p.push('relatório não mostra sequence_done para quem completou a régua')
    if (to('eva@example.com').length) p.push(`cancelou no fim do período (Eva) e recebeu ${to('eva@example.com').length} e-mail(s)`)
    if (to('felipe@example.com').length) p.push(`cancelou com data marcada (Felipe) e recebeu ${to('felipe@example.com').length} lembrete(s)`)
    if ((after.body?.counts?.cancel_scheduled ?? 0) !== 2) p.push(`relatório não mostra cancel_scheduled para os 2 que cancelaram (${after.body?.counts?.cancel_scheduled})`)
    if (w.events.some((e) => ['in_eva', 'in_fel'].includes(e.metadata?.invoice_id) && e.name === E.CARD_FAILED_EMAIL_SENT_EVENT)) p.push('card_failed_email_sent gravado para quem cancelou')

    // Uma linha de card_failed_email_sent por envio real.
    const okSends = w.sent.length
    const cfAll = w.events.filter((e) => e.name === E.CARD_FAILED_EMAIL_SENT_EVENT).length
    if (cfAll !== okSends) p.push(`card_failed_email_sent (${cfAll}) ≠ e-mails enviados (${okSends})`)
    if (w.stripeWrites.length) p.push(`a rodada escreveu na Stripe: ${w.stripeWrites.join(', ')}`)

    // Banco fora: leitura de carimbo falha → ninguém recebe.
    const w2 = world('2026-11-01T14:13:00Z')
    w2.setEventsReadable(false)
    await callRoute(over, w2, ROUND)
    if (w2.sent.length) p.push('carimbo ilegível e mesmo assim enviou')
  } catch (err) {
    p.push(`rota lançou: ${err instanceof Error ? err.stack : String(err)}`)
  }

  // ── (4) card_recovered ──────────────────────────────────────────────────────────────────────────────────────────────
  try {
    const w = world('2026-11-01T14:13:00Z')
    const R = load(RECOVER, over, w.stubs)
    const d = R.decideCardRecovered
    if (d({ attemptCount: 1, emailsSent: 0 }).record !== false) p.push('pagamento de primeira virou card_recovered')
    if (d({ attemptCount: 3, emailsSent: 0 }).reason !== 'retried') p.push('paga na 3ª tentativa não virou card_recovered')
    if (d({ attemptCount: 1, emailsSent: 2 }).reason !== 'emailed') p.push('paga depois dos nossos e-mails não virou card_recovered')
    if (d({ attemptCount: 2, emailsSent: null }).record !== true) p.push('leitura de e-mails falhou e apagou a recuperação')
    w.stamp(E.RENEWAL_FAILED_EMAIL_EVENT, 'in_x', 'u-x', 100)
    w.stamp(E.RENEWAL_FAILED_REMINDER_EVENT, 'in_x', 'u-x', 50)
    const input = { invoiceId: 'in_x', attemptCount: 3, userId: 'u-x', subscriptionId: 'sub_x', tier: 'starter', amountPaid: 990, currency: 'usd', billingReason: 'subscription_cycle', nowMs: w.now() }
    const rec = await R.recordCardRecoveredIfAny(w.admin, input)
    const rows = w.events.filter((e) => e.name === E.CARD_RECOVERED_EVENT)
    if (!rec || rows.length !== 1) p.push(`card_recovered não gravou (${rows.length})`)
    else {
      if (rows[0].metadata.emails_sent !== 2 || rows[0].metadata.last_email_stage !== 'reminder') p.push('card_recovered sem a contagem de e-mails/última etapa')
      if (rows[0].metadata.hours_since_first_email !== 100) p.push('card_recovered sem as horas desde o 1º e-mail')
    }
    await R.recordCardRecoveredIfAny(w.admin, input)
    if (w.events.filter((e) => e.name === E.CARD_RECOVERED_EVENT).length !== 1) p.push('card_recovered duplicou para a mesma fatura')
    const none = await R.recordCardRecoveredIfAny(w.admin, { ...input, invoiceId: 'in_y', attemptCount: 1 })
    if (none || w.events.some((e) => e.name === E.CARD_RECOVERED_EVENT && e.metadata.invoice_id === 'in_y')) p.push('fatura paga de primeira gravou card_recovered')
    const boom = { from() { throw new Error('banco explodiu') } }
    let threw = false
    try { await R.recordCardRecoveredIfAny(boom, input) } catch { threw = true }
    if (threw) p.push('card_recovered lança (derrubaria o webhook)')
  } catch (err) {
    p.push(`card_recovered lançou: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── (5) ligações ────────────────────────────────────────────────────────────────────────────────────────────────────
  const hook = src(HOOK)
  const helperStart = hook.indexOf('async function sendRenewalFailedEmailOnce(')
  const helper = helperStart < 0 ? '' : hook.slice(helperStart, hook.indexOf('\n}\n', helperStart) + 3)
  const iStamp = helper.indexOf('      name: RENEWAL_FAILED_EMAIL_EVENT,\n')
  const iCard = helper.indexOf('      name: CARD_FAILED_EMAIL_SENT_EVENT,\n')
  const iNotOk = helper.indexOf('    if (!res.ok) {\n')
  if (iCard < 0 || iStamp < 0 || iNotOk < 0 || !(iNotOk < iStamp && iStamp < iCard)) p.push('webhook: card_failed_email_sent não sai depois do Resend ok + carimbo')
  if (!helper.includes("        attempt: cardFailedEmailAttempt('first'),\n")) p.push('webhook: 1º aviso sem attempt 1')
  if (!helper.includes('      brazilianCardInUsd,\n')) p.push('webhook: 1º aviso sem a dica BR×USD')
  if (!helper.includes('      cancelScheduled: input.cancelScheduled,\n')) p.push('webhook: decisão do 1º aviso não recebe o cancelamento marcado')
  if (!hook.includes('              cancelScheduled: stripeSubscriptionCancelScheduled(failedSubscription),\n')) p.push('webhook: 1º aviso não lê cancel_at_period_end/cancel_at da assinatura viva')
  const ps = hook.indexOf("      case 'invoice.payment_succeeded': {")
  const psBlock = ps < 0 ? '' : hook.slice(ps, hook.indexOf("      case 'customer.subscription.trial_will_end': {", ps))
  const iPaid = psBlock.indexOf("          name: 'subscription_invoice_paid',\n")
  const iRec = psBlock.indexOf('        await recordCardRecoveredIfAny(supabase, {\n')
  if (iPaid < 0 || iRec < 0 || !(iPaid < iRec)) p.push('webhook: card_recovered não é chamado depois da fatura paga')
  if (!psBlock.includes('          attemptCount: invoice.attempt_count ?? null,\n')) p.push('webhook: card_recovered sem attempt_count')

  let crons: Array<{ path: string; schedule: string }> = []
  try { crons = JSON.parse(src(VERCEL)).crons ?? [] } catch { p.push('vercel.json ilegível') }
  if (crons.filter((c) => c.path === '/api/admin/send-renewal-declined?etapa=lembrete&confirm=SEND&limit=30').length !== 1) p.push('cron da régua ausente (ou sem confirm=SEND)')
  const route = src(ROUTE)
  if (!route.includes("        confirm: req.nextUrl.searchParams.get('confirm') === 'SEND',\n")) p.push('rota deixou de ser dry-run por padrão')

  const serverOnly = src(EVENTS_ROUTE)
  const soStart = serverOnly.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const soBlock = soStart < 0 ? '' : serverOnly.slice(soStart, serverOnly.indexOf('])', soStart))
  for (const n of ['renewal_payment_failed_email_sent', 'renewal_payment_failed_reminder_sent', 'renewal_payment_failed_final_sent', 'card_failed_email_sent', 'card_recovered']) {
    if (!soBlock.includes(`  '${n}',`)) p.push(`navegador pode forjar ${n}`)
  }
  const list = src(LIST).split('\n')
  if (!list.includes("  'renewal_payment_failed_final_sent',")) p.push('último lembrete fora da lista canônica de e-mails (oferta no mesmo dia)')
  if (list.some((l) => /'renewal_payment_failed_final_failed'|'card_failed_email_sent'/.test(l) && !/^\s*\/\//.test(l))) p.push('evento de medição/falha entrou na lista canônica')

  const banner = src(BANNER)
  if (!banner.includes('void trackEvent(CARD_UPDATE_BANNER_SHOWN_EVENT,') || !banner.includes('void trackEvent(CARD_UPDATE_BANNER_CLICKED_EVENT,')) p.push('banner sem card_update_banner_shown/clicked')
  let N: any
  try { N = load(NOTICE, over, {}) } catch (err) { p.push(`renewalNotice não carrega: ${(err as Error).message}`) }
  if (N && !/^Your last Creator payment didn't go through — update your card$/.test(N.renewalNoticeCopy('Creator').title)) p.push(`título do banner não é a frase pedida (${N.renewalNoticeCopy('Creator').title})`)
  if (E.CARD_UPDATE_BANNER_SHOWN_EVENT !== 'card_update_banner_shown' || E.CARD_UPDATE_BANNER_CLICKED_EVENT !== 'card_update_banner_clicked' || E.CARD_RECOVERED_EVENT !== 'card_recovered' || E.CARD_FAILED_EMAIL_SENT_EVENT !== 'card_failed_email_sent') p.push('nomes dos eventos mudaram')
  return p
}

console.log('TESTE cartão recusado — laço automático: dia 1 · dia 3 · dia 7, dry-run, dedupe, para ao pagar/cancelar (01/11)')
const real = await problems()
ok(real.length === 0, '(1–5) régua, rota real, dica BR, card_recovered, ligações' + (real.length ? ' → ' + real.join(' | ') : ''))

const mutants: Array<[string, string, string, string]> = [
  ['M1 último lembrete repete sem fim', EMAIL, "  if (x.finalSent === true) return { send: false, reason: 'sequence_done' }\n", ''],
  ['M2 dia 7 sem respeitar a janela', EMAIL, "  if (x.nowMs - firstMs < RENEWAL_FAILED_FINAL_AFTER_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }\n", ''],
  ['M3 dia 7 para fatura antiga (cintia)', EMAIL, "  if (x.nowMs - firstMs > RENEWAL_FAILED_FINAL_MAX_AGE_HOURS * 3_600_000) return { send: false, reason: 'final_window_passed' }\n", ''],
  ['M4 manda para fatura paga', EMAIL, "  if (x.invoiceStatus !== 'open') return { send: false, reason: 'invoice_not_open' }\n", ''],
  ['M5 rodada esquece o carimbo do último', FOLLOW, '      finalSent = finalStamp.ok ? finalStamp.createdAt !== null : false\n', '      finalSent = false\n'],
  ['M6 rota envia sem confirm', ROUTE, "        confirm: req.nextUrl.searchParams.get('confirm') === 'SEND',\n", '        confirm: true,\n'],
  ['M7 rodada lista toda assinatura (inclui canceladas)', FOLLOW, "  for await (const sub of stripe.subscriptions.list({ status: 'past_due', limit: 100 })) {\n", '  for await (const sub of stripe.subscriptions.list({ limit: 100 })) {\n'],
  ['M8 medição sem attempt', FOLLOW, '      metadata: { ...base, attempt: cardFailedEmailAttempt(decision.stage), stripe_attempt: base.attempt, provider_id: providerId },\n', '      metadata: { ...base, provider_id: providerId },\n'],
  ['M9 dica BR para todo mundo', EMAIL, "  return cur === 'usd' && cc === 'BR'\n", '  return true\n'],
  ['M10 carta promete Pix', EMAIL, "    brCardUsd: 'Cartão brasileiro costuma ser recusado em cobrança em dólar quando a compra internacional está desligada. Ligar a compra internacional no app do banco, ou usar outro cartão, costuma resolver.',\n", "    brCardUsd: 'Se preferir, pague em reais pelo Pix.',\n"],
  ['M11 recuperação conta pagamento de primeira', RECOVER, "  return { record: false, reason: 'first_try' }\n", "  return { record: true, reason: 'retried' }\n"],
  ['M12 webhook sem attempt 1', HOOK, "        attempt: cardFailedEmailAttempt('first'),\n", ''],
  ['M13 card_recovered fora do webhook', HOOK, '        await recordCardRecoveredIfAny(supabase, {\n', '        void (async (..._a: unknown[]) => {})(supabase, {\n'],
  ['M14 navegador forja card_recovered', EVENTS_ROUTE, "  'card_recovered',\n", ''],
  ['M15 cron sem confirm', VERCEL, '"/api/admin/send-renewal-declined?etapa=lembrete&confirm=SEND&limit=30"', '"/api/admin/send-renewal-declined?etapa=lembrete&limit=30"'],
  // KINEO-CARTAO-RECUSADO-0111b — quem cancelou pelo portal (assinatura ainda past_due) não recebe "troque o cartão".
  ['M16 régua ignora cancelamento marcado', EMAIL, "  if (x.cancelScheduled !== false) return { send: false, reason: 'cancel_scheduled' }\n", ''],
  ['M17 1º aviso ignora cancelamento marcado', EMAIL, "  if (f.cancelScheduled !== false) return { send: false, reason: 'cancel_scheduled' }\n", ''],
  ['M18 rodada não passa o cancelamento', FOLLOW, '      cancelScheduled: stripeSubscriptionCancelScheduled(sub),\n', '      cancelScheduled: false,\n'],
  ['M19 webhook não passa o cancelamento', HOOK, '              cancelScheduled: stripeSubscriptionCancelScheduled(failedSubscription),\n', '              cancelScheduled: false,\n'],
  ['M20 cancel_at (data marcada) ignorado', EMAIL, "  return typeof sub.cancel_at === 'number' && Number.isFinite(sub.cancel_at) && sub.cancel_at > 0\n", '  return false\n'],
  ['M21 porta do cancelamento abre no desconhecido', EMAIL, "  if (x.cancelScheduled !== false) return { send: false, reason: 'cancel_scheduled' }\n", "  if (x.cancelScheduled === true) return { send: false, reason: 'cancel_scheduled' }\n"],
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
