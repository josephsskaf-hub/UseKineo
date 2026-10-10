// KINEO-TROCA-BUSINESS-2026-10-10 — guardião da troca de plano de/para o Business (US$ 84/mês, 500 créditos).
//
// Prova, EXECUTANDO os módulos pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs) — a rota
// /api/stripe/change-plan com Stripe/Supabase de mentira, a concessão do webhook (applyBusinessUpgradeGrant) com um
// banco de mentira e o lado do cliente (lib/growth/planSwitch.ts) com um fetch de mentira — e lendo o que não roda fora
// do servidor (readFileSync: o fio do webhook, o checkout, o /pricing e o /business):
//   (1) SUBIDA: a Stripe cobra a proration AGORA ('always_invoice' + 'error_if_incomplete', chave de idempotência) e a
//       rota NÃO mexe no saldo; cartão recusado = 402 e nada muda; a prévia não troca nada;
//   (2) CRÉDITOS só com a fatura paga: a decisão do webhook exige billing_reason 'subscription_update', tier business +
//       carimbo da troca, fatura com cobrança criada depois do carimbo; a concessão é idempotente por troca (reentrega,
//       corrida, razão pendente, saldo ambíguo, erro de banco = reenvio sem conceder);
//   (3) DESCIDA: agendada para o fim do período pago (Subscription Schedule, proration 'none'), sem crédito retirado
//       nem cobrança hoje; as trocas de sempre (Starter/Creator/Studio) seguem com a regra de antes;
//   (4) ANUAL recusado com motivo próprio (o suporte segue o caminho do anual) e teste de 7 dias recusado;
//   (5) afiliado: a fatura da subida paga comissão com o tier da assinatura viva (Business = 20%);
//   (6) TELA: quem assina vê "Switch to Business"/"Current plan" e troca com a prévia (preço e créditos); o checkout e o
//       /business deixam de mandar o assinante Stripe ao suporte;
//   (7) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + transpile; nenhum import com alias @/ no guardião.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

const F = {
  LIB: 'lib/billing/trocaBusiness.ts',
  ROUTE: 'app/api/stripe/change-plan/route.ts',
  WEBHOOK: 'app/api/stripe/webhook/route.ts',
  SWITCH: 'lib/growth/planSwitch.ts',
  PCLIENT: 'app/pricing/PricingClient.tsx',
  CARDS: 'components/PricingCards.tsx',
  BLOCK: 'components/pricing/PricingBusinessBlock.tsx',
  CHECKOUT: 'app/api/stripe/checkout/route.ts',
  PAGE: 'app/business/page.tsx',
  BIZ: 'lib/businessPlan.ts',
  PRICING: 'lib/checkoutPricing.ts',
}
const src = (over, rel) => (over[rel] !== undefined ? over[rel] : read(rel))

// ── banco de mentira (o suficiente do PostgREST que a rota e a concessão usam) ──────────────────────────────────────
function makeDb(seed = {}, hooks = {}) {
  const tables = {}
  for (const [name, rows] of Object.entries(seed)) tables[name] = new Map(rows.map((r) => [r.id, clone(r)]))
  return {
    tables,
    row: (name, id) => tables[name]?.get(id) ?? null,
    from(name) {
      const t = (tables[name] ??= new Map())
      const q = { op: 'select', filters: [], patch: null, row: null, single: false }
      const run = () => {
        if (hooks.before) { const r = hooks.before(name, q, tables); if (r) return r }
        const match = (row) => q.filters.every(([k, v]) => row[k] === v)
        if (q.op === 'insert') {
          if (t.has(q.row.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
          t.set(q.row.id, clone(q.row))
          return { data: null, error: null }
        }
        if (q.op === 'update') {
          const hit = [...t.values()].filter(match)
          for (const r of hit) Object.assign(r, clone(q.patch))
          return { data: hit.map((r) => ({ id: r.id })), error: null }
        }
        const hit = [...t.values()].filter(match)
        return { data: q.single ? (hit[0] ? clone(hit[0]) : null) : hit.map(clone), error: null }
      }
      const b = {
        select() { return b },
        insert(row) { q.op = 'insert'; q.row = row; return b },
        update(patch) { q.op = 'update'; q.patch = patch; return b },
        eq(k, v) { q.filters.push([k, v]); return b },
        maybeSingle() { q.single = true; return Promise.resolve(run()) },
        then(res, rej) { return Promise.resolve(run()).then(res, rej) },
      }
      return b
    },
  }
}

// ── Stripe de mentira para a rota ───────────────────────────────────────────────────────────────────────────────────
const NOW_SEC = Math.floor(Date.now() / 1000)
const PERIOD_START = NOW_SEC - 10 * 86400
const PERIOD_END = NOW_SEC + 20 * 86400
function makeSub(o = {}) {
  return {
    id: 'sub_1', object: 'subscription', status: o.status ?? 'active', customer: 'cus_1',
    collection_method: 'charge_automatically', cancel_at_period_end: Boolean(o.canceling), schedule: o.schedule ?? null,
    current_period_start: PERIOD_START, current_period_end: PERIOD_END,
    metadata: { supabase_user_id: 'u1', tier: o.tier ?? 'starter', affiliate_system: 'kineo' },
    items: { data: [{ id: 'si_1', quantity: 1, price: { id: 'price_cur', currency: o.currency ?? 'usd', unit_amount: o.amount ?? 990, recurring: { interval: o.interval ?? 'month' } } }] },
  }
}
function makeStripe(sub, o = {}) {
  const calls = []
  return {
    calls,
    subscriptions: {
      async retrieve(id) { calls.push({ op: 'subscriptions.retrieve', id }); return clone(sub) },
      async update(id, params, opts) {
        calls.push({ op: 'subscriptions.update', id, params: clone(params), idempotencyKey: opts?.idempotencyKey ?? null })
        if (o.cardError) throw Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError', code: 'card_declined' })
        return { ...clone(sub), metadata: params.metadata ?? sub.metadata, latest_invoice: { id: 'in_up', status: 'paid', amount_paid: 3700, billing_reason: 'subscription_update' } }
      },
    },
    products: {
      async search(params) { calls.push({ op: 'products.search', params: clone(params) }); return { data: [{ id: 'prod_house' }] } },
      async create(params) { calls.push({ op: 'products.create', params: clone(params) }); return { id: 'prod_new' } },
    },
    invoices: {
      async createPreview(params) { calls.push({ op: 'invoices.createPreview', params: clone(params) }); return { amount_due: 3700, total: 3700 } },
    },
    subscriptionSchedules: {
      async create(params, opts) {
        calls.push({ op: 'schedules.create', params: clone(params), idempotencyKey: opts?.idempotencyKey ?? null })
        return { id: 'sub_sched_1', status: 'active', metadata: {}, phases: [{ start_date: PERIOD_START, end_date: PERIOD_END, items: [{ price: 'price_cur', quantity: 1 }] }] }
      },
      async update(id, params) {
        calls.push({ op: 'schedules.update', id, params: clone(params) })
        if (o.scheduleUpdateFails) throw Object.assign(new Error('bad phases'), { type: 'StripeInvalidRequestError' })
        return { id }
      },
      async release(id) { calls.push({ op: 'schedules.release', id }); return { id, status: 'released' } },
      async retrieve(id) {
        calls.push({ op: 'schedules.retrieve', id })
        return {
          id, status: 'active', metadata: o.foreignSchedule ? {} : { kineo_source: 'change-plan' },
          current_phase: { start_date: PERIOD_START, end_date: PERIOD_END },
          phases: [{ start_date: PERIOD_START, end_date: PERIOD_END, items: [{ price: 'price_cur', quantity: 1 }] }, { start_date: PERIOD_END, end_date: PERIOD_END + 30 * 86400, items: [{ price: 'price_old_target', quantity: 1 }] }],
        }
      },
    },
  }
}

/** Roda a rota com um mundo de mentira. Devolve resposta, chamadas à Stripe, perfil depois e eventos. */
async function runRoute(over, o) {
  const profile = { id: 'u1', plan: o.plan, stripe_subscription_id: 'sub_1', paypal_subscription_id: null, video_credits: o.credits }
  const db = makeDb({ profiles: [profile] })
  const stripe = makeStripe(makeSub(o.sub ?? {}), o.stripe ?? {})
  const events = []
  const load = createOfflineLoader({
    mocks: {
      'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: (t) => db.from(t) }) },
      '@/lib/stripe': { stripe },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(clone(e)) } },
    },
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })
  const route = load('@/' + F.ROUTE)
  const res = o.method === 'GET'
    ? await route.GET()
    : await route.POST({ json: async () => o.body })
  return { res, calls: stripe.calls, profile: db.row('profiles', 'u1'), events }
}
const callsOf = (calls, op) => calls.filter((c) => c.op === op)

// ── concessão do webhook com banco de mentira ────────────────────────────────────────────────────────────────────────
function grantInput(L, decision, o = {}) {
  return { userId: 'u1', subscriptionId: 'sub_1', invoiceId: o.invoiceId ?? 'in_up', amountPaid: 3700, currency: 'usd', decision, path: '/api/stripe/webhook' }
}

/** Todas as checagens; devolve os rótulos que falharam (o caminho real exige lista vazia). */
async function runChecks(over = {}, verbose = false) {
  const failed = []
  const check = (c, m) => { if (verbose) ok(c, m); if (!c) failed.push(m) }
  let L, P, S
  try {
    const load = createOfflineLoader({ mocks: { '@/lib/stripe': { stripe: {} } }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
    L = load('@/' + F.LIB); P = load('@/' + F.PRICING)
  } catch (e) {
    check(false, 'carregar lib/billing/trocaBusiness.ts: ' + (e && e.message))
    return failed
  }

  // (1)(2)(3) a regra, executada
  check(L.BUSINESS_UPGRADE_PRORATION === 'always_invoice', '(1) subida cobra a proration AGORA (always_invoice)')
  check(L.BUSINESS_UPGRADE_PAYMENT_BEHAVIOR === 'error_if_incomplete', '(1) subida: cartão recusado = a Stripe não aplica (error_if_incomplete)')
  check(L.BUSINESS_DOWNGRADE_PRORATION === 'none', '(3) descida sem rateio (nada devolvido, nada cobrado hoje)')
  check(L.businessSwitchDirection('starter', 'business') === 'upgrade' && L.businessSwitchDirection('pro', 'business') === 'upgrade', '(1) escada → business = subida')
  check(L.businessSwitchDirection('business', 'basic') === 'downgrade', '(3) business → escada = descida')
  check(L.businessSwitchDirection('business', 'business') === null && L.businessSwitchDirection('autopilot', 'business') === null && L.businessSwitchDirection('starter', 'pro') === null, '(1) fora da regra: mesmo plano, autopilot, troca comum')
  const TC = P.TIER_CREDITS
  check(L.businessUpgradeCredits('starter') === TC.business - TC.starter && L.businessUpgradeCredits('basic') === TC.business - TC.basic && L.businessUpgradeCredits('pro') === TC.business - TC.pro, `(2) créditos da subida = cota business − cota de antes (starter +${TC.business - TC.starter})`)
  const meta = L.businessUpgradeMetadata({ supabase_user_id: 'u1', affiliate_system: 'kineo', tier: 'starter' }, 'starter', '2026-10-10T12:00:00.000Z')
  check(meta.supabase_user_id === 'u1' && meta.affiliate_system === 'kineo' && meta.tier === 'business' && meta.plan_credits === String(TC.business) && meta.business_upgrade_from === 'starter' && meta.business_upgrade_at === '2026-10-10T12:00:00.000Z', '(2) metadata da subida: dono preservado, tier business, carimbo da troca')
  const k1 = L.businessUpgradeIdempotencyKey('sub_1', 'si_1', 'starter', 8400, 1_000_000)
  check(k1 === L.businessUpgradeIdempotencyKey('sub_1', 'si_1', 'starter', 8400, 1_000_000 + 30_000) && k1 !== L.businessUpgradeIdempotencyKey('sub_1', 'si_1', 'starter', 8400, 1_000_000 + 10 * 60_000), '(1) chave de idempotência da Stripe: dois cliques = uma cobrança; janela curta')
  const UP_AT = '2026-10-10T12:00:00.000Z'
  const upSec = Date.parse(UP_AT) / 1000
  const liveMeta = { tier: 'business', business_upgrade_from: 'starter', business_upgrade_at: UP_AT }
  const dec = (billingReason, total, created, metadata = liveMeta) => L.businessUpgradeGrantDecision({ billingReason, invoice: { total, created }, subscription: { id: 'sub_1', metadata } })
  const d0 = dec('subscription_update', 3700, upSec + 5)
  check(d0.grant === true && d0.credits === TC.business - TC.starter && d0.key === `troca_business_granted:sub_1:${UP_AT}`, '(2) fatura paga da subida → concede a diferença, chave por troca')
  check(dec('subscription_cycle', 8400, upSec + 5).grant === false && dec('subscription_create', 8400, upSec + 5).grant === false, '(2) só a fatura da troca (subscription_update) concede a diferença')
  check(dec('subscription_update', 0, upSec + 5).grant === false && dec('subscription_update', -500, upSec + 5).grant === false, '(2) fatura zerada/crédito não concede (sem cobrança, sem crédito)')
  check(dec('subscription_update', 3700, upSec - 3600).grant === false, '(2) fatura anterior à troca não concede')
  check(dec('subscription_update', 3700, upSec + 5, { tier: 'pro', business_upgrade_from: 'starter', business_upgrade_at: UP_AT }).grant === false, '(2) depois da descida (tier pro com carimbo velho) nada concede')
  check(dec('subscription_update', 3700, upSec + 5, { tier: 'basic' }).grant === false, '(2) troca comum / anual (subscription_update sem carimbo) nada concede')
  const phases = L.businessDowngradePhases({ currentPriceId: 'price_cur', currentStart: 1, currentEnd: 2, target: 'pro', currency: 'usd', productId: 'prod_x', unitAmount: 5490, phaseMetadata: L.businessDowngradePhaseMetadata('pro', 'x', 'y') })
  check(phases.length === 2 && phases[0].items[0].price === 'price_cur' && phases[0].end_date === 2 && phases[1].iterations === 1 && phases[1].proration_behavior === 'none' && phases[1].metadata.tier === 'pro' && phases[1].metadata.plan_credits === String(TC.pro), '(3) Schedule: Business até o fim do período, plano novo depois, cota nova na metadata da fase')

  // (2) a concessão, executada com banco de mentira
  const D = d0
  {
    const db = makeDb({ profiles: [{ id: 'u1', video_credits: 60, plan: 'starter' }] })
    const r1 = await L.applyBusinessUpgradeGrant(db, grantInput(L, D))
    const p1 = db.row('profiles', 'u1')
    check(r1.status === 'granted' && p1.video_credits === 60 + D.credits && p1.plan === 'business', `(2) fatura paga: saldo 60 → ${60 + D.credits}, plano business`)
    const led = db.row('events', D.ledgerId)
    check(led && led.name === 'business_upgrade_credits_granted' && led.metadata.credits_granted === true && led.metadata.stripe_invoice_id === 'in_up', '(2) razão da concessão gravado (credits_granted=true, com a fatura)')
    const r2 = await L.applyBusinessUpgradeGrant(db, grantInput(L, D, { invoiceId: 'in_up' }))
    check(r2.status === 'already_granted' && db.row('profiles', 'u1').video_credits === 60 + D.credits, '(2) reentrega da Stripe não concede de novo')
  }
  {
    const db = makeDb({ profiles: [{ id: 'u1', video_credits: 60, plan: 'starter' }], events: [{ id: D.ledgerId, name: 'business_upgrade_credits_granted', metadata: { credits_before: 60, credits_after: 60 + D.credits, credits_granted: false } }] })
    const r = await L.applyBusinessUpgradeGrant(db, grantInput(L, D))
    const r2 = await L.applyBusinessUpgradeGrant(db, grantInput(L, D))
    check(r.status === 'granted' && r2.status === 'already_granted' && db.row('profiles', 'u1').video_credits === 60 + D.credits, '(2) razão pendente (crash no meio) termina UMA vez')
  }
  {
    const db = makeDb({ profiles: [{ id: 'u1', video_credits: 30, plan: 'starter' }], events: [{ id: D.ledgerId, name: 'business_upgrade_credits_granted', metadata: { credits_before: 60, credits_after: 60 + D.credits, credits_granted: false } }] })
    const r = await L.applyBusinessUpgradeGrant(db, grantInput(L, D))
    check(r.status === 'ambiguous' && db.row('profiles', 'u1').video_credits === 30, '(2) saldo ambíguo no razão pendente: não concede (não dobra)')
  }
  {
    let spent = false
    const db = makeDb({ profiles: [{ id: 'u1', video_credits: 60, plan: 'starter' }] }, {
      before(name, q, tables) {
        if (name === 'profiles' && q.op === 'update' && !spent) { spent = true; tables.profiles.get('u1').video_credits = 50 }
        return null
      },
    })
    const r = await L.applyBusinessUpgradeGrant(db, grantInput(L, D))
    check(r.status === 'granted' && db.row('profiles', 'u1').video_credits === 50 + D.credits, '(2) gasto no meio da concessão: relê e soma a diferença ao saldo novo (sem perder nem dobrar)')
  }
  {
    const db = makeDb({ profiles: [{ id: 'u1', video_credits: 60, plan: 'starter' }] }, {
      before(name, q) { return name === 'profiles' && q.op === 'update' ? { data: null, error: { message: 'db down' } } : null },
    })
    let threw = false
    try { await L.applyBusinessUpgradeGrant(db, grantInput(L, D)) } catch { threw = true }
    check(threw && db.row('profiles', 'u1').video_credits === 60 && db.row('events', D.ledgerId)?.metadata?.credits_granted === false, '(2) erro de banco: lança (webhook 500 → reenvio), nada concedido, razão pendente')
  }

  // (1)(3)(4) a rota, executada
  let up
  try {
    up = await runRoute(over, { plan: 'starter', credits: 60, body: { tier: 'business' } })
  } catch (e) {
    check(false, '(1) rota executa a subida: ' + (e && e.message))
    return failed
  }
  const upd = callsOf(up.calls, 'subscriptions.update')
  const p0 = upd[0]?.params
  check(up.res.status === 200 && up.res.body.ok === true && up.res.body.tier === 'business' && up.res.body.direction === 'upgrade', '(1) subida responde ok (tier business)')
  check(upd.length === 1 && p0.proration_behavior === 'always_invoice' && p0.payment_behavior === 'error_if_incomplete' && Boolean(upd[0].idempotencyKey), '(1) Stripe: always_invoice + error_if_incomplete + chave de idempotência')
  check(p0 && p0.items[0].id === 'si_1' && p0.items[0].price_data.unit_amount === 8400 && p0.items[0].price_data.recurring.interval === 'month' && p0.metadata.tier === 'business' && p0.metadata.business_upgrade_from === 'starter' && p0.metadata.supabase_user_id === 'u1', '(1) item vira US$ 84/mês, metadata carimbada com a troca')
  check(up.profile.video_credits === 60 && up.res.body.credits === 60 && up.res.body.credits_pending === TC.business - TC.starter, '(1)(2) a rota NÃO mexe no saldo — os créditos ficam pendentes da fatura paga (webhook)')
  check(up.profile.plan === 'business', '(1) plano vira business com a fatura da troca paga')
  const upEv = up.events.find((e) => e.name === 'plan_changed')
  check(upEv && upEv.metadata.ok === true && upEv.metadata.credits_delta === 0 && upEv.metadata.charged_now_minor === 3700 && upEv.metadata.stripe_invoice_id === 'in_up', '(1) evento plan_changed: cobrado agora, créditos 0 na rota')
  const pv = await runRoute(over, { plan: 'pro', credits: 120, body: { tier: 'business', preview: true } })
  check(pv.res.status === 200 && pv.res.body.preview === true && pv.res.body.charged_now_minor === 3700 && pv.res.body.credits_after_payment === TC.business - TC.pro, '(1) prévia: cobrado agora (fatura de prévia) e créditos depois do pagamento')
  check(callsOf(pv.calls, 'subscriptions.update').length === 0 && callsOf(pv.calls, 'invoices.createPreview')[0]?.params?.subscription_details?.proration_behavior === 'always_invoice' && pv.profile.video_credits === 120 && pv.profile.plan === 'pro', '(1) prévia não troca nada')
  const card = await runRoute(over, { plan: 'basic', credits: 90, body: { tier: 'business' }, stripe: { cardError: true } })
  check(card.res.status === 402 && card.res.body.error === 'payment_failed' && card.profile.plan === 'basic' && card.profile.video_credits === 90, '(1) cartão recusado: 402, plano e saldo intactos')
  const annual = await runRoute(over, { plan: 'pro', credits: 300, body: { tier: 'business' }, sub: { interval: 'year', amount: 46116 } })
  check(annual.res.status === 409 && annual.res.body.error === 'business_annual_needs_support' && callsOf(annual.calls, 'subscriptions.update').length === 0, '(4) anual → 409 business_annual_needs_support, nada cobrado')
  const trial = await runRoute(over, { plan: 'starter_trial', credits: 80, body: { tier: 'business' }, sub: { status: 'trialing' } })
  check(trial.res.status === 409 && trial.res.body.error === 'business_after_trial' && callsOf(trial.calls, 'subscriptions.update').length === 0, '(4) teste de 7 dias → 409 business_after_trial (não existe business_trial)')
  const down = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'pro' }, sub: { tier: 'business', amount: 8400 } })
  const sc = callsOf(down.calls, 'schedules.create')[0]
  const su = callsOf(down.calls, 'schedules.update')[0]?.params
  check(down.res.status === 200 && down.res.body.scheduled_tier === 'pro' && down.res.body.effective_at === new Date(PERIOD_END * 1000).toISOString(), '(3) descida responde agendada para o fim do período pago')
  check(callsOf(down.calls, 'subscriptions.update').length === 0 && sc?.params?.from_subscription === 'sub_1', '(3) descida NÃO troca o item agora: nasce um Schedule da assinatura')
  check(su && su.end_behavior === 'release' && su.proration_behavior === 'none' && su.phases?.[0]?.end_date === PERIOD_END && su.phases?.[1]?.metadata?.tier === 'pro' && su.phases?.[1]?.items?.[0]?.price_data?.unit_amount === 5490 && su.metadata?.kineo_source === 'change-plan', '(3) Schedule: Business até a virada, Studio depois, sem rateio, marcado como nosso')
  check(down.profile.plan === 'business' && down.profile.video_credits === 420, '(3) descida: plano e créditos intactos até a renovação (nada retirado)')
  const dpv = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'basic', preview: true }, sub: { tier: 'business', amount: 8400 } })
  check(dpv.res.body.preview === true && dpv.res.body.charged_now_minor === 0 && dpv.res.body.credits_per_month === TC.basic && callsOf(dpv.calls, 'schedules.create').length === 0, '(3) prévia da descida: nada cobrado, cota nova, nada agendado')
  const dfail = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'starter' }, sub: { tier: 'business', amount: 8400 }, stripe: { scheduleUpdateFails: true } })
  check(dfail.res.status === 502 && callsOf(dfail.calls, 'schedules.release').some((c) => c.id === 'sub_sched_1'), '(3) Schedule que falha pela metade é solto (assinatura como estava)')
  const resched = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'basic' }, sub: { tier: 'business', amount: 8400, schedule: 'sub_sched_old' } })
  check(resched.res.status === 200 && callsOf(resched.calls, 'schedules.release').length === 0 && callsOf(resched.calls, 'schedules.create').length === 0 && callsOf(resched.calls, 'schedules.update')[0]?.id === 'sub_sched_old' && callsOf(resched.calls, 'schedules.update')[0]?.params?.phases?.[1]?.metadata?.tier === 'basic' && callsOf(resched.calls, 'schedules.update')[0]?.params?.phases?.[0]?.end_date === PERIOD_END, '(3) nova descida reescreve as fases do Schedule nosso (não solta, não cria outro)')
  const reschedFail = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'starter' }, sub: { tier: 'business', amount: 8400, schedule: 'sub_sched_old' }, stripe: { scheduleUpdateFails: true } })
  check(reschedFail.res.status === 502 && callsOf(reschedFail.calls, 'schedules.release').length === 0, '(3) reescrita recusada: a descida de antes continua valendo (nada solto)')
  const afterTurn = await runRoute(over, { plan: 'pro', credits: 300, body: { tier: 'basic' }, sub: { tier: 'pro', amount: 5490, schedule: 'sub_sched_done' } })
  check(afterTurn.res.status === 200 && callsOf(afterTurn.calls, 'schedules.release').some((c) => c.id === 'sub_sched_done') && callsOf(afterTurn.calls, 'subscriptions.update').length === 1, '(3) já no plano novo: o Schedule nosso é solto antes da troca de sempre')
  const foreign = await runRoute(over, { plan: 'business', credits: 420, body: { tier: 'basic' }, sub: { tier: 'business', amount: 8400, schedule: 'sub_sched_x' }, stripe: { foreignSchedule: true } })
  check(foreign.res.status === 409 && foreign.res.body.error === 'schedule_needs_support' && callsOf(foreign.calls, 'schedules.release').length === 0, '(3) Schedule alheio não é mexido (suporte)')
  const old = await runRoute(over, { plan: 'starter', credits: 60, body: { tier: 'pro' } })
  const oldUpd = callsOf(old.calls, 'subscriptions.update')[0]?.params
  check(old.res.status === 200 && oldUpd?.proration_behavior === 'create_prorations' && old.profile.video_credits === 60 + (TC.pro - TC.starter), '(3) troca comum (Starter → Studio) segue a regra de antes')
  const notSupported = await runRoute(over, { plan: 'starter', credits: 60, body: { tier: 'pro', preview: true } })
  check(notSupported.res.status === 400 && callsOf(notSupported.calls, 'subscriptions.update').length === 0, '(1) prévia nunca troca uma troca comum (400 preview_unsupported)')
  const get = await runRoute(over, { method: 'GET', plan: 'business', credits: 10 })
  check(get.res.body.subscribed === true && get.res.body.tier === 'business' && get.calls.length === 0, '(6) GET: assinante do Business aparece (sem chamar a Stripe)')

  // (2)(5) o fio do webhook
  const wh = src(over, F.WEBHOOK)
  const iUpd = wh.indexOf("        if (billingReason === 'subscription_update') {\n")
  const iEnd = wh.indexOf('const subscriptionId = typeof invoice.subscription', iUpd)
  const branch = iUpd > 0 && iEnd > iUpd ? wh.slice(iUpd, iEnd) : ''
  check(/businessUpgradeGrantDecision\(\{\n\s+billingReason,/.test(branch), '(2) webhook: a fatura da troca passa pela decisão do Business')
  check(/trocaGrant = await applyBusinessUpgradeGrant\(supabase, \{/.test(branch) && /throw new RetryableEntitlementError\(`Business upgrade grant failed/.test(branch), '(2) webhook: concessão idempotente; falha = reenvio da Stripe')
  check(branch.includes('if (!trocaDecision.grant || !trocaUserId) {') && branch.indexOf('applyBusinessUpgradeGrant(') > branch.indexOf('if (!trocaDecision.grant || !trocaUserId) {') && /stripeSubscriptionKeepsAccess\(trocaSubscription\.status\)/.test(branch), '(2) webhook: só concede depois da decisão e com a assinatura com acesso')
  check(/await recordAffiliateCommission\(supabase, \{ userId: trocaUserId, externalId: invoice\.id \?\? trocaSubscriptionId, amountGross: invoice\.amount_paid \?\? 0,[^\n]*plan: trocaSubscription\.metadata\?\.tier \}\)/.test(branch), '(5) webhook: comissão da fatura da subida com o tier da assinatura viva (Business = 20%)')
  check(/\n\s+break\n\s+\}\n\s*$/.test(branch), '(2) a fatura da troca nunca cai na renovação (break antes do grant de renovação)')

  // (6) a tela e as portas
  const sw = src(over, F.SWITCH)
  let S2
  try {
    const fetchLog = []
    const fetchMock = async (url, init) => {
      fetchLog.push(JSON.parse(init?.body ?? '{}'))
      const body = JSON.parse(init?.body ?? '{}')
      const data = body.preview
        ? { ok: true, preview: true, direction: 'upgrade', currency: 'usd', charged_now_minor: 3700, monthly_minor: 8400, credits_after_payment: 440 }
        : { ok: true, tier: 'business', direction: 'upgrade' }
      return { ok: true, status: 200, json: async () => data }
    }
    const load = createOfflineLoader({ globals: { fetch: fetchMock }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
    S2 = load('@/' + F.SWITCH)
    const st = { subscribed: true, tier: 'starter', status: 'active' }
    check(S2.planSwitchLabel(st, 'business', 'Business') === 'Switch to Business' && S2.planSwitchLabel({ subscribed: true, tier: 'business', status: 'active' }, 'business', 'Business') === 'Current plan', '(6) rótulos: "Switch to Business" / "Current plan"')
    const up = { direction: 'upgrade', currency: 'usd', chargedNowMinor: 3700, monthlyMinor: 8400, creditsAfterPayment: 440, creditsPerMonth: 0, effectiveAt: null }
    const t = S2.businessSwitchConfirmText(up, 'Business')
    check(t.includes('$37.00 now') && t.includes('$84.00/month') && t.includes('+440 credits') && t.includes('as soon as the payment goes through'), '(6) confirmação da subida: diferença cobrada agora, preço mensal e créditos depois do pagamento')
    const dt = S2.businessSwitchConfirmText({ ...up, direction: 'downgrade', chargedNowMinor: 0, monthlyMinor: 5490, creditsPerMonth: 300, effectiveAt: '2026-11-01T00:00:00.000Z' }, 'Studio')
    check(dt.includes('Nothing is charged today') && dt.includes('November 1, 2026') && dt.includes('300 credits a month'), '(6) confirmação da descida: nada hoje, data da virada e a cota nova')
    check(/annual/i.test(S2.planSwitchErrorText('business_annual_needs_support')) && /support@usekineo\.com/.test(S2.planSwitchErrorText('business_annual_needs_support')), '(4)(6) anual: texto honesto, suporte segue o caminho')
    let asked = null
    const done = await S2.confirmAndSwitchBusiness({ tier: 'business', planName: 'Business', confirm: (x) => { asked = x; return true } })
    check(done.status === 'done' && asked && asked.includes('$37.00') && fetchLog.length === 2 && fetchLog[0].preview === true && fetchLog[1].tier === 'business' && !fetchLog[1].preview, '(6) fluxo: prévia → confirmação com os números → troca')
    fetchLog.length = 0
    const cancelled = await S2.confirmAndSwitchBusiness({ tier: 'business', planName: 'Business', confirm: () => false })
    check(cancelled.status === 'cancelled' && fetchLog.length === 1 && fetchLog[0].preview === true, '(6) "Cancelar" na confirmação = nenhuma troca')
  } catch (e) {
    check(false, '(6) planSwitch executa: ' + (e && e.message))
  }
  check(!/^import /m.test(sw), '(6) planSwitch segue sem imports (roda cru nos guardiões)')
  const pc = src(over, F.PCLIENT)
  const iBuy = pc.indexOf('  function handleBuy(tier: BuyableTier')
  const iBizBranch = pc.indexOf("    if (planSwitch.subscribed && tier === 'business') {\n      void handleBusinessSwitch('business', 'Business')\n      return\n    }", iBuy)
  const iCheckout = pc.indexOf('const started = checkout.launch(', iBuy)
  check(iBuy > 0 && iBizBranch > iBuy && iCheckout > iBizBranch, '(6) /pricing: assinante clica "Business" → troca, nunca checkout')
  check(/planSwitch\.tier === 'business'\) \{ void handleBusinessSwitch\(tier, planName\); return \}/.test(pc), '(6) /pricing: descida do Business pelos 3 cartões passa pela troca do Business')
  check(/<PricingBusinessBlock onBuy=\{\(\) => handleBuy\('business'\)\}[^\n]*switchLabel=\{switching === 'business' \? 'Switching…' : planSwitchLabel\(planSwitch, 'business', 'Business'\)\}/.test(pc), '(6) bloco Business recebe o rótulo da troca')
  check(/confirmAndSwitchBusiness\(\{ tier, planName: name,/.test(src(over, F.CARDS)), '(6) cards do app: descida do Business pela mesma troca')
  const block = src(over, F.BLOCK)
  check(/\{pending \? 'Opening secure checkout…' : switchLabel \?\? 'Get Business →'\}/.test(block) && !/support@/.test(block), '(6) bloco: "Switch to Business" para quem assina, sem caminho de suporte')
  const co = src(over, F.CHECKOUT)
  const selfServe = /const BUSINESS_SWITCH_SELF_SERVE_MESSAGE =\n\s+'([^']*)'/.exec(co)
  check(selfServe && /Switch to Business/.test(selfServe[1]) && !/support@/.test(selfServe[1]), '(6) checkout: mensagem ao assinante Stripe aponta a troca, não o suporte')
  check(/return redirectError\(BUSINESS_SWITCH_SELF_SERVE_MESSAGE\)/.test(co) && !/BUSINESS_SWITCH_BY_SUPPORT_MESSAGE/.test(co), '(6) checkout: o ramo da assinatura Stripe usa a mensagem da troca')
  const page = src(over, F.PAGE)
  check(/href=\{BUSINESS_SWITCH_HREF\}/.test(page) && /BUSINESS_SWITCH_HREF = '\/pricing#business'/.test(src(over, F.BIZ)) && /id="business"/.test(block), '(6) /business: "Already on a Kineo plan? Switch to Business" leva ao bloco do /pricing')
  // a rota nunca escreve saldo no caminho do Business
  const route = src(over, F.ROUTE)
  const iBiz = route.indexOf('async function businessSwitch(')
  check(iBiz > 0 && !/video_credits/.test(route.slice(iBiz)), '(1)(2) businessSwitch não escreve video_credits (créditos só pelo webhook)')
  return failed
}

console.log('— caminho real')
const real = await runChecks({}, true)
ok(real.length === 0, `caminho real: ${real.length} falhas`)

// ── mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────────
function mutate(rel, from, to) {
  const orig = read(rel)
  if (!orig.includes(from)) return { applied: false }
  const next = orig.split(from).join(to)
  return { applied: next !== orig, over: { [rel]: next } }
}
const MUTANTS = [
  ['subida volta ao rateio na próxima fatura', F.LIB, "export const BUSINESS_UPGRADE_PRORATION = 'always_invoice' as const", "export const BUSINESS_UPGRADE_PRORATION = 'create_prorations' as const", /\(1\) subida cobra|\(1\) Stripe: always_invoice/],
  ['cartão recusado deixa a troca pela metade', F.LIB, "export const BUSINESS_UPGRADE_PAYMENT_BEHAVIOR = 'error_if_incomplete' as const", "export const BUSINESS_UPGRADE_PAYMENT_BEHAVIOR = 'allow_incomplete' as const", /error_if_incomplete/],
  ['rota credita na hora (antes da fatura paga)', F.ROUTE, ".update({ plan: BUSINESS_TIER, is_pro: true }).eq('id', userId)", ".update({ plan: BUSINESS_TIER, is_pro: true, video_credits: input.creditsBefore + creditsPending }).eq('id', userId)", /a rota NÃO mexe no saldo|não escreve video_credits/],
  ['decisão aceita fatura zerada', F.LIB, "  if (!(total > 0)) return { grant: false, reason: 'no_charge' }\n", '', /fatura zerada/],
  ['decisão aceita a renovação como subida', F.LIB, "  if (input.billingReason !== 'subscription_update') return { grant: false, reason: 'not_subscription_update' }\n", '', /só a fatura da troca/],
  ['chave da concessão por entrega (não por troca)', F.LIB, 'return `troca_business_granted:${subscriptionId}:${upgradeAtIso}`', 'return `troca_business_granted:${subscriptionId}:${upgradeAtIso}:${Math.random()}`', /reentrega da Stripe não concede de novo|chave por troca/],
  ['razão pendente concede sem compare-and-set', F.LIB, "    if (!granted) return { status: 'ambiguous', creditsBefore: before, creditsAfter: after, creditsNow: now }\n", '', /saldo ambíguo/],
  ['descida imediata com rateio', F.LIB, "export const BUSINESS_DOWNGRADE_PRORATION = 'none' as const", "export const BUSINESS_DOWNGRADE_PRORATION = 'create_prorations' as const", /\(3\) descida sem rateio|\(3\) Schedule/],
  ['anual deixa de ter motivo próprio', F.ROUTE, "    if (businessMove) return NextResponse.json({ error: 'business_annual_needs_support', interval }, { status: 409 })\n", '', /\(4\) anual → 409/],
  ['teste de 7 dias sobe para o Business', F.ROUTE, "  if (sub.status === 'trialing' || input.inTrial) return NextResponse.json({ error: 'business_after_trial' }, { status: 409 })\n", '', /\(4\) teste de 7 dias/],
  ['prévia passa a trocar', F.ROUTE, '    if (input.preview) {\n      try {\n        const pv = await stripe.invoices.createPreview({', '    if (input.preview && false) {\n      try {\n        const pv = await stripe.invoices.createPreview({', /prévia/],
  ['descida pendente é solta antes de reescrever', F.ROUTE, "      if (kind === 'own' && !onBusiness) await stripe.subscriptionSchedules.release(scheduleRef)", "      if (kind === 'own') await stripe.subscriptionSchedules.release(scheduleRef)", /reescreve as fases|descida de antes continua/],
  ['webhook concede sem a decisão', F.WEBHOOK, '            if (!trocaDecision.grant || !trocaUserId) {', '            if (!trocaUserId) {', /só concede depois da decisão/],
  ['comissão da subida sem o plano', F.WEBHOOK, "attributionSystem: trocaSubscription.metadata?.affiliate_system, plan: trocaSubscription.metadata?.tier })", 'attributionSystem: trocaSubscription.metadata?.affiliate_system })', /\(5\) webhook: comissão/],
  ['/pricing manda o assinante ao checkout do Business', F.PCLIENT, "    if (planSwitch.subscribed && tier === 'business') {\n      void handleBusinessSwitch('business', 'Business')\n      return\n    }\n", '', /\(6\) \/pricing: assinante clica/],
  ['checkout volta a mandar ao suporte', F.CHECKOUT, '      return redirectError(BUSINESS_SWITCH_SELF_SERVE_MESSAGE) // KINEO-TROCA-BUSINESS-2026-10-10', '      return redirectError(BUSINESS_SWITCH_PAYPAL_MESSAGE) // KINEO-TROCA-BUSINESS-2026-10-10', /\(6\) checkout: o ramo/],
  ['confirmação esconde a cobrança de agora', F.SWITCH, "You pay ${switchMoneyLabel(preview.currency, preview.chargedNowMinor)} now", 'You pay the difference now', /confirmação da subida/],
]
console.log('— mutantes')
for (const [name, rel, from, to, expect] of MUTANTS) {
  const m = mutate(rel, from, to)
  ok(m.applied, `mutante aplicou: ${name}`)
  if (!m.applied) continue
  const failed = await runChecks(m.over)
  ok(failed.some((f) => expect.test(f)), `mutante fica vermelho: ${name} → [${failed.slice(0, 3).join(' | ')}]`)
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
