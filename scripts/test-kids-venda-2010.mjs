// KINEO-KIDS-VENDA-2010 — guardião das 3 FORMAS DE VENDER o AI Kids Cartoon Stories (fundador 20/10 "três sim"; CEO: US$ 29/mês · 30 vídeos,
// US$ 49 o pack de 30, BRL pela fórmula da casa; KIDS_SALES_LIVE=true autorizado pelo fundador 21/10). Roda com `node scripts/test-kids-venda-2010.mjs`
// na raiz do repo, sem rede, sem banco, sem Stripe: o checkout, as regras puras, o banco (dublê) e as intercepções do webhook são EXECUTADOS
// (scripts/test-support/offline-ts-loader.mjs); as rotas gigantes (webhook, filme, cron) são conferidas pela ORDEM das linhas.
//
// O que prova:
//   P  PREÇO SÓ DO SERVIDOR: pack cobra 4900 (mode payment, price_data inline, metadata.pack=kids_pack, SEM pack_credits); piloto cobra 2900
//      (mode subscription, price_data inline com recurring month — nenhum Price do painel — metadata.kids_product na sessão E na assinatura);
//      a query string com preço/créditos é ignorada; Brasil em reais pela fórmula da casa; margem positiva no pior caso (15 s = 9 cr);
//   S  INTERRUPTOR LIGADO NO DISCO: KIDS_SALES_LIVE true; público liberado; ao desligar em memória, checkout recusa quem não é da casa ('sales_closed') e aceita a casa;
//      ao desligar, cartões devolvem null e a amostra retorna 404; desfaz exato = origin/main 72d23210c em todo arquivo tocado;
//   C  30 POR CICLO, CONTADOS POR CICLO: posição/restante puros; ciclo de 30 dias da assinatura; 1/dia (24 h) e recuperação (8 h) quando
//      atrasado; renovação pela fatura zera a contagem e é idempotente por invoice; teto de crédito por ciclo (× 1,25);
//   Q  PACK EM FILA: 2 por pedido por passada, 6 por passada no total, piloto 1 por passada; a run nasce ANTES do gasto (unique = trava);
//   A  1 GRÁTIS POR CONTA + TETO: descartável, trial barrado, já usada, já comprou, teto 30/dia — todos recusam; o resto passa;
//   I  WEBHOOK IDEMPOTENTE: pack = guard da sessão ANTES do pedido, NENHUM crédito concedido, falha = RetryableEntitlementError; pedido único
//      por sessão/assinatura (23505 → o de antes); intercepções ANTES do tier/plan de sempre (Path B, renovação, updated, deleted);
//   R  ROTA DO FILME: admissão `kids_order` só com pedido ativo da pessoa + run pendente deste generationId (executada no dublê), colocada
//      ANTES do gate de plano e dentro de currentPaid; sem o campo = false;
//   D  desfaz + novos + marca + encadeamento + contagem; M mutantes (todos APLICADOS e VERMELHOS), em memória.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semKidsVenda2010, KIDS_VENDA_2010_ARQUIVOS, KIDS_VENDA_2010_NOVOS, KIDS_VENDA_2010_BASE, MARCA_KIDS_VENDA_2010, ACRESCIMOS_KIDS_VENDA_2010, TROCAS_KIDS_VENDA_2010 } from './test-support/desfaz-kids-venda-2010.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-KIDS-VENDA-2010'
const lf = (s) => String(s).split('\r\n').join('\n')
const disco = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${KIDS_VENDA_2010_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  kids: 'lib/kidsCartoon/kidsCartoon.ts', lib: 'lib/kidsVenda/kidsVenda.ts', server: 'lib/kidsVenda/server.ts', cron: 'lib/kidsVenda/cron.ts', wh: 'lib/kidsVenda/webhook.ts', checkoutKids: 'lib/stripe/kidsVendaCheckout.ts',
  checkout: 'app/api/stripe/checkout/route.ts', webhook: 'app/api/stripe/webhook/route.ts', film: 'app/api/generate-video-cinematic/route.ts', cronRoute: 'app/api/cron/autopilot-generate/route.ts',
  cards: 'components/kidsCartoon/KidsVendaCards.tsx', panel: 'components/kidsCartoon/KidsVendaPanel.tsx', sample: 'app/api/kids-venda/sample/route.ts', status: 'app/api/kids-venda/status/route.ts',
  statusRoute: 'app/api/compose/status/[renderId]/route.ts', stranded: 'app/api/cron/finish-stranded-renders/route.ts', pricing: 'app/pricing/PricingClient.tsx', pages: 'components/kidsCartoon/KidsCartoonPages.tsx', page: 'app/(dashboard)/kids-cartoon/page.tsx', precos: 'lib/checkoutPricing.ts', engine: 'lib/credits/engineCost.ts', settle: 'lib/settlementCurrency.ts',
}
const ENV = { STRIPE_SECRET_KEY: 'sk_test_guardiao', NEXT_PUBLIC_SUPABASE_URL: 'https://guardiao.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'svc_guardiao' }
const noop = async () => true
const carregar = (over = {}, { velho = false, mocks = {}, globals = {} } = {}) => createOfflineLoader({ env: ENV, mocks: { '@/lib/serverEvents': { writeServerEvent: noop }, ...mocks }, globals, source: (rel, text) => (Object.hasOwn(over, rel) ? lf(over[rel]) : velho ? semKidsVenda2010(text, rel) : text) })

// ── um banco DUBLÊ mínimo (supabase-js): grava o que recebe; responde pelo que foi programado por tabela ────────────────────
function fakeDb(state) {
  const log = []
  const build = (table) => {
    const q = { table, op: 'select', filters: [], payload: null, count: null }
    const run = async () => {
      log.push({ ...q })
      const h = state[table]
      const r = h ? await h(q, log) : { data: null, error: null }
      return { data: r?.data ?? null, error: r?.error ?? null, count: r?.count ?? null }
    }
    const api = {
      select: (cols, opts) => { if (q.op === 'select') q.cols = cols; if (opts?.count) q.count = opts.count; return api },
      insert: (p) => { q.op = 'insert'; q.payload = p; return api }, update: (p) => { q.op = 'update'; q.payload = p; return api },
      eq: (k, v) => { q.filters.push(['eq', k, v]); return api }, in: (k, v) => { q.filters.push(['in', k, v]); return api }, gte: (k, v) => { q.filters.push(['gte', k, v]); return api },
      like: (k, v) => { q.filters.push(['like', k, v]); return api }, or: (v) => { q.filters.push(['or', v]); return api }, not: (k, o, v) => { q.filters.push(['not', k, o, v]); return api },
      order: () => api, limit: () => api, range: () => api,
      maybeSingle: run, single: run, then: (res, rej) => run().then(res, rej),
    }
    return api
  }
  return { db: { from: build, auth: { admin: { getUserById: async (id) => ({ data: { user: { id, email: state.__email ?? 'cliente@exemplo.test' } }, error: null }) } } }, log }
}

// ── o checkout, executado ───────────────────────────────────────────────────────────────────────────────────────────────────
async function checkoutKids(over, { kind = 'pack', user = { id: 'u-1', email: 'cliente@exemplo.test' }, internal = true, country = 'US', query = '', hasAutopilot = false, probeErr = null, theme = 'aventuras no jardim' } = {}) {
  const calls = []
  const events = []
  const mocks = {
    'next/server': { NextResponse: { redirect: (u) => ({ kind: 'redirect', url: String(u) }), json: (b, i) => ({ kind: 'json', body: b, status: i?.status ?? 200 }) }, NextRequest: class {} },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { email: user?.email ?? null, stripe_customer_id: null } }) }) }) }) }) },
    '@supabase/supabase-js': { createClient: () => fakeDb({ kids_orders: async (q) => (q.op === 'select' && q.filters.some((f) => f[0] === 'eq' && f[1] === 'kind') ? { data: hasAutopilot ? [{ id: 'o-1' }] : [] } : { error: probeErr }) }).db },
    '@/lib/internalAccounts': { isInternalEmail: () => internal },
    '@/lib/stripe': { stripe: { checkout: { sessions: { create: async (params, opts) => { calls.push({ params, opts }); return { id: 'cs_test_kids', url: 'https://checkout.stripe.test/cs_test_kids' } } } } } },
  }
  const M = carregar(over, { mocks })(F.checkoutKids)
  const pack = kind === 'pack' ? 'kids_pack' : 'kids_autopilot'
  const url = new URL(`https://www.usekineo.com/api/stripe/checkout?pack=${pack}&character=mia&language=pt&theme=${encodeURIComponent(theme)}${query}`)
  const req = { nextUrl: url, headers: { get: (k) => (k === 'x-vercel-ip-country' ? country : k === 'accept-language' ? (country === 'BR' ? 'pt-BR' : 'en-US') : null) } }
  const deps = { recordCheckoutEvent: async (name, uid, meta) => { events.push({ name, uid, meta }) }, browserSessionIdFrom: () => 'sid-guardiao', checkoutFailureReason: (m) => String(m).split(':')[0].toLowerCase().replace(/[^a-z0-9]+/g, '_'), oneTimeIdempotencyKey: (p) => 'k:' + JSON.stringify(p) }
  const res = await M.buildKidsVendaAndRedirect(req, deps)
  return { res, calls, events, M }
}

// ── as provas (rodam no disco e em cada mutante) ────────────────────────────────────────────────────────────────────────────
async function provas(over = {}) {
  const r = {}
  const src = (p) => (Object.hasOwn(over, p) ? lf(over[p]) : disco(p))
  const L = carregar(over)
  const K = L(F.lib)
  const P = L(F.precos)
  const E = L(F.engine)
  const SC = L(F.settle)

  // P — preço só do servidor
  r.P1_precos = K.KIDS_PRICES.autopilot.usdMinor === 2900 && K.KIDS_PRICES.pack.usdMinor === 4900 && K.KIDS_PRICES.autopilot.per === 'month' && K.KIDS_PRICES.pack.per === 'once' && K.kidsPriceLabel(2900) === 'US$29' && K.kidsPriceLabel(4900) === 'US$49'
  const cp = await checkoutKids(over, { kind: 'pack', query: '&amount=1&unit_amount=1&price=100&credits=9999&pack_credits=9999' })
  const lip = cp.calls[0]?.params?.line_items?.[0]
  r.P2_pack_valor_servidor = cp.calls.length === 1 && cp.calls[0].params.mode === 'payment' && lip?.price_data?.unit_amount === 4900 && lip?.price_data?.currency === 'usd' && !lip?.price && !lip?.price_data?.recurring
    && cp.calls[0].params.metadata.pack === 'kids_pack' && cp.calls[0].params.metadata.pack_credits === undefined && cp.calls[0].params.metadata.kids_character === 'mia' && cp.calls[0].params.metadata.kids_language === 'pt'
    && cp.res.url === 'https://checkout.stripe.test/cs_test_kids' && cp.events.some((e) => e.name === 'checkout_started' && e.meta.sku === 'kids_pack')
  const ca = await checkoutKids(over, { kind: 'autopilot', query: '&amount=1&price=100' })
  const lia = ca.calls[0]?.params?.line_items?.[0]
  r.P3_piloto_assinatura_inline = ca.calls.length === 1 && ca.calls[0].params.mode === 'subscription' && lia?.price_data?.unit_amount === 2900 && lia?.price_data?.recurring?.interval === 'month' && !lia?.price
    && ca.calls[0].params.metadata.kids_product === 'kids_autopilot' && ca.calls[0].params.subscription_data?.metadata?.kids_product === 'kids_autopilot' && ca.calls[0].params.subscription_data?.metadata?.supabase_user_id === 'u-1' && ca.calls[0].params.metadata.pack === undefined
  const cb = await checkoutKids(over, { kind: 'pack', country: 'BR' })
  r.P4_brl_formula = cb.calls.length === 1 && cb.calls[0].params.line_items[0].price_data.currency === 'brl' && cb.calls[0].params.line_items[0].price_data.unit_amount === SC.settlementAmountMinor(4900, 'brl')
  const custo = E.creditCostForDuration('cinematic_ai', true, K.KIDS_VENDA_DURATION)
  const piorPorVideo = (custo / E.creditCostFor('cinematic_ai', true)) * P.WORST_CASE_FILM_COSTS.cinematic_ai
  r.P5_margem_positiva_pior_caso = K.KIDS_VENDA_DURATION === 15 && custo === 9 && P.netAfterStripeUsd(29) - 30 * piorPorVideo > 0 && P.netAfterStripeUsd(49) - 30 * piorPorVideo > 0
  const c2 = await checkoutKids(over, { kind: 'autopilot', hasAutopilot: true })
  r.P6_um_piloto_por_conta = c2.calls.length === 0 && /checkout_error=/.test(c2.res.url) && c2.events.some((e) => e.name === 'checkout_failed' && e.meta.blocked === 'has_autopilot')
  const c3 = await checkoutKids(over, { kind: 'pack', theme: 'the kids drink beer' })
  r.P7_tema_fere_regra_infantil = c3.calls.length === 0 && /checkout_error=/.test(c3.res.url)

  // S — interruptor
  r.S1_ligado_no_disco = K.KIDS_SALES_LIVE === true && K.KIDS_SALES_OPEN_FOR_PUBLIC === true && K.kidsSalesOpen(false, false) === false && K.kidsSalesOpen(false, true) === true && K.kidsSalesOpen(true, false) === true
  const desligado = { ...over, [F.lib]: src(F.lib).replace('export const KIDS_SALES_LIVE = true', 'export const KIDS_SALES_LIVE = false') }
  const cPublic = await checkoutKids(over, { kind: 'pack', internal: false })
  const cAutoPublic = await checkoutKids(over, { kind: 'autopilot', internal: false })
  r.S0_checkout_publico_ligado = cPublic.calls.length === 1 && cPublic.res.url === 'https://checkout.stripe.test/cs_test_kids' && cAutoPublic.calls.length === 1 && cAutoPublic.calls[0].params.mode === 'subscription'
  const cOff = await checkoutKids(desligado, { kind: 'pack', internal: false })
  r.S2_checkout_recusa_fora_da_casa = cOff.calls.length === 0 && /checkout_error=/.test(cOff.res.url) && cOff.events.some((e) => e.name === 'checkout_failed' && e.meta.blocked === 'sales_closed')
  r.S3_cartoes_somem = /^\s*if \(!KIDS_SALES_OPEN_FOR_PUBLIC\) return null$/m.test(src(F.cards)) && /KIDS_SALES_OPEN_FOR_PUBLIC/.test(src(F.sample)) && /return NextResponse\.json\(\{ error: 'Not found\.' \}, \{ status: 404 \}\)/.test(src(F.sample)) && /kidsSalesOpen\(KIDS_SALES_OPEN_FOR_PUBLIC, internal\)/.test(src(F.sample)) && /kidsSalesOpen\(KIDS_SALES_OPEN_FOR_PUBLIC, internal\)/.test(src(F.status))

  // C — 30 por ciclo, contados por ciclo
  r.C1_posicoes = K.KIDS_VIDEOS.autopilot === 30 && K.KIDS_VIDEOS.pack === 30 && K.KIDS_VIDEOS.sample === 1 && K.kidsNextSeq({ total: 30, delivered: 0, inFlight: 0 }) === 1 && K.kidsNextSeq({ total: 30, delivered: 29, inFlight: 0 }) === 30
    && K.kidsNextSeq({ total: 30, delivered: 29, inFlight: 1 }) === null && K.kidsNextSeq({ total: 30, delivered: 30, inFlight: 0 }) === null && K.kidsRemaining({ total: 30, delivered: 10, inFlight: 2 }) === 18
  const t0 = Date.parse('2026-10-20T15:00:00.000Z')
  const cyc = K.kidsCycleBounds(t0)
  r.C2_ciclo_30_dias_da_assinatura = K.KIDS_CYCLE_DAYS === 30 && cyc.start === '2026-10-20T15:00:00.000Z' && cyc.end === '2026-11-19T15:00:00.000Z' && K.kidsCycleKey(cyc.start) === '2026-10-20'
  r.C3_um_por_dia_e_recuperacao = K.kidsAutopilotNextRunMs({ nowMs: t0, remaining: 20, cycleEndMs: t0 + 25 * 86_400_000 }) === t0 + 24 * 3_600_000 && K.kidsAutopilotNextRunMs({ nowMs: t0, remaining: 20, cycleEndMs: t0 + 10 * 86_400_000 }) === t0 + 8 * 3_600_000
  r.C4_teto_de_credito = K.KIDS_CYCLE_FUNDING_HEADROOM === 1.25 && K.kidsCycleCreditCap(30, 9) === 338 && K.kidsCycleCreditCap(1, 9) === 12
  {
    const S = carregar(over, { mocks: { '@supabase/supabase-js': { createClient: () => null }, '@/lib/emailValidation': { isDisposableEmail: () => false }, '@/lib/ads/sample': { adsSampleTrialStatusBlocked: () => false } } })(F.server)
    const rows = { 'sub_1': { id: 'o-1', user_id: 'u-1', cycle_index: 0, last_invoice_id: null, status: 'active', videos_delivered: 30 } }
    const updates = []
    const { db } = fakeDb({ kids_orders: async (q) => (q.op === 'select' ? { data: rows.sub_1 } : (updates.push(q.payload), Object.assign(rows.sub_1, { cycle_index: q.payload.cycle_index, last_invoice_id: q.payload.last_invoice_id, videos_delivered: q.payload.videos_delivered }), { data: null })) })
    const a = await S.renewKidsCycle(db, { subscriptionId: 'sub_1', invoiceId: 'in_1', fromMs: t0, path: '/t' })
    const b = await S.renewKidsCycle(db, { subscriptionId: 'sub_1', invoiceId: 'in_1', fromMs: t0, path: '/t' })
    r.C5_renovacao_zera_e_e_idempotente = a.ok && a.renewed && updates.length === 1 && updates[0].videos_delivered === 0 && updates[0].cycle_index === 1 && updates[0].cycle_credits_funded === 0 && updates[0].cycle_end === '2026-11-19T15:00:00.000Z' && b.ok && !b.renewed && updates.length === 1
  }

  // Q — pack em fila
  r.Q1_fila = K.KIDS_PACK_PER_ORDER_PER_PASS === 2 && K.KIDS_MAX_STARTS_PER_PASS === 6 && K.kidsStartsAllowedThisPass('pack') === 2 && K.kidsStartsAllowedThisPass('autopilot') === 1 && K.kidsStartsAllowedThisPass('sample') === 1 && K.KIDS_KIND_PRIORITY.sample < K.KIDS_KIND_PRIORITY.autopilot && K.KIDS_KIND_PRIORITY.autopilot < K.KIDS_KIND_PRIORITY.pack
  const cronSrc = src(F.cron)
  const iRun = cronSrc.indexOf(".insert({ id: runId, order_id: order.id")
  const iStory = cronSrc.indexOf("path: '/api/kids-cartoon/story'")
  const iFund = cronSrc.indexOf('await fundCredits(db, order.user_id, cost)')
  const iPost = cronSrc.indexOf("path: '/api/generate-video-cinematic'")
  r.Q2_run_nasce_antes_do_gasto = iRun > 0 && iStory > iRun && iFund > iStory && iPost > iFund && /if \(\(claim\.error as \{ code\?: string \}\)\.code !== '23505'\)/.test(cronSrc) && /if \(order\.kind === 'autopilot'\) break/.test(cronSrc)
  r.Q3_pausa_da_fal = K.KIDS_FAL_BALANCE_EVENT === 'fal_balance_exhausted' && K.kidsFalPaused(new Date(t0 - 60 * 60 * 1000).toISOString(), t0) === true && K.kidsFalPaused(new Date(t0 - 3 * 60 * 60 * 1000).toISOString(), t0) === false && K.kidsFalPaused(null, t0) === false && /kidsFalPaused\(lastExhausted, now\)/.test(cronSrc)
  r.Q4_estorno_tira_de_volta = /if \(debit === 'refunded'\) \{ await fail\('render_refunded', true\); continue \}/.test(cronSrc) && /async function clawBack/.test(cronSrc) && /KIDS_RUN_TIMEOUT_MS/.test(cronSrc) && K.KIDS_RUN_TIMEOUT_MS === 6 * 60 * 60 * 1000
  r.Q6_email_so_do_cron = src(F.statusRoute).includes("if (RESEND_API_KEY && user.email && !String(prepaidCinematicClaim?.generationId ?? '').startsWith('kids-')) { // KINEO-KIDS-VENDA-2010")
    && src(F.stranded).includes("const mayEmail = !!email && !prof?.email_opted_out && !isInternalOrJunkEmail(email) && !String(genId).startsWith('kids-') // KINEO-KIDS-VENDA-2010")
    && K.kidsGenerationId('abc') === 'kids-abc' && /houseAlreadyEmailed/.test(cronSrc)
  r.Q5_no_cron_do_autopilot = /kids = await kidsPass\(\{ db, baseUrl, deadline, sessions \}\)/.test(src(F.cronRoute)) && !/kids-venda|kidsPass/.test(disco('vercel.json'))

  // A — 1 grátis por conta + teto
  const okIn = { live: true, internal: false, disposable: false, trialBlocked: false, samplesUsed: 0, paidOrders: 0, startedToday: 0 }
  r.A1_amostra = K.KIDS_SAMPLE_DAILY_CAP === 30 && K.kidsSampleDecision(okIn).ok === true
    && K.kidsSampleDecision({ ...okIn, live: false }).reason === 'closed' && K.kidsSampleDecision({ ...okIn, live: false, internal: true }).ok === true
    && K.kidsSampleDecision({ ...okIn, disposable: true }).reason === 'disposable' && K.kidsSampleDecision({ ...okIn, trialBlocked: true }).reason === 'trial_blocked'
    && K.kidsSampleDecision({ ...okIn, samplesUsed: 1 }).reason === 'already_used' && K.kidsSampleDecision({ ...okIn, paidOrders: 1 }).reason === 'has_order'
    && K.kidsSampleDecision({ ...okIn, startedToday: 30 }).reason === 'daily_cap' && K.kidsSampleDecision({ ...okIn, startedToday: 29 }).ok === true

  // I — webhook idempotente (ordem das linhas + execução do dublê)
  const W = src(F.webhook)
  const iPackBranch = W.indexOf('if (isKidsPackSession(session)) {')
  const iPackGuard = W.indexOf("const { error: kidsGuardError } = await supabase.from('stripe_events').insert({ id: checkoutFulfillmentGuard })")
  const iPackFulfill = W.indexOf('const kidsPack = await fulfillKidsPack(supabase, session)')
  const iPackThrow = W.indexOf('if (!kidsPack.ok) throw new RetryableEntitlementError(kidsPack.error)')
  const iMetaCredits = W.indexOf("const metaCredits = Number(session.metadata?.pack_credits ?? 0)")
  r.I1_pack_guard_antes_pedido_antes_do_valor = iPackBranch > 0 && iPackGuard > iPackBranch && iPackFulfill > iPackGuard && iPackThrow > iPackFulfill && iMetaCredits > iPackThrow && W.slice(iPackBranch, iMetaCredits).includes('checkoutFulfillmentGuardAcquired = true')
  const iPathB = W.indexOf('// ── Path B: Subscription checkout ──')
  const iAutoBranch = W.indexOf('if (isKidsAutopilotSession(session)) {')
  const iGuest = W.indexOf('let sendGuestReadyEmail: (() => Promise<void>) | null = null')
  const iTier = W.indexOf("const tier: CheckoutPlanTier =", iPathB)
  r.I2_piloto_antes_do_path_b = iPathB > 0 && iAutoBranch > iPathB && iGuest > iAutoBranch && iTier > iAutoBranch && W.slice(iAutoBranch, iGuest).includes('stripe.subscriptions.retrieve(kidsSubId)') && W.slice(iAutoBranch, iGuest).includes('if (!kidsAuto.ok) throw new RetryableEntitlementError(kidsAuto.error)')
  const iInv = W.indexOf('const kidsInv = await kidsInvoicePaid(supabase, subscription')
  const iRenewalTier = W.indexOf('const renewalTier: CheckoutPlanTier =')
  const iUpd = W.indexOf('const kidsUpd = await kidsSubscriptionUpdated(supabase, subscription)')
  const iUpdProfile = W.indexOf(".select('id, stripe_subscription_id')\n          .eq('stripe_customer_id', customerId)")
  const iDel = W.indexOf('const kidsDel = await kidsSubscriptionDeleted(supabase, subscription)')
  const iDelProfile = W.indexOf("            is_pro: false,\n            plan: 'free',")
  r.I3_intercepcoes_antes_do_plano = iInv > 0 && iRenewalTier > iInv && iUpd > 0 && iUpdProfile > iUpd && iDel > 0 && iDelProfile > iDel && /if \(isKidsSubscription\(subscription\)\) \{/.test(W)
  r.I4_duplicata_retoma = /!isKidsPackSession\(duplicateSession\)/.test(W)
  {
    const WH = carregar(over, { mocks: { '@supabase/supabase-js': { createClient: () => null }, '@/lib/emailValidation': { isDisposableEmail: () => false }, '@/lib/ads/sample': { adsSampleTrialStatusBlocked: () => false }, '@/lib/billing/subscriptionAccess': { stripeSubscriptionKeepsAccess: (s) => s === 'active' || s === 'trialing' } } })(F.wh)
    const inserted = []
    const profileUpdates = []
    let dup = false
    const { db } = fakeDb({
      kids_orders: async (q) => (q.op === 'insert' ? (dup ? { error: { code: '23505', message: 'dup' } } : (inserted.push(q.payload), dup = true, { data: { id: 'o-new' } })) : { data: { id: 'o-new' } }),
      profiles: async (q) => (profileUpdates.push(q.payload), { data: null }),
    })
    const session = { id: 'cs_1', mode: 'payment', metadata: { supabase_user_id: 'u-1', pack: 'kids_pack', kids_character: 'dino', kids_language: 'es', kids_theme: 'el bosque' }, amount_total: 4900, currency: 'usd', customer: 'cus_1' }
    const a = await WH.fulfillKidsPack(db, session)
    const b = await WH.fulfillKidsPack(db, session)
    r.I5_pack_pedido_unico_sem_credito = a.ok && /created/.test(a.detail) && b.ok && /existing/.test(b.detail) && inserted.length === 1 && inserted[0].kind === 'pack' && inserted[0].videos_total === 30 && inserted[0].character === 'dino' && inserted[0].language === 'es'
      && profileUpdates.every((p) => p && p.has_paid === true && !('video_credits' in p) && !('plan' in p))
    const sub = { id: 'sub_9', status: 'active', customer: 'cus_1', current_period_start: Math.floor(t0 / 1000), metadata: { supabase_user_id: 'u-1', kids_product: 'kids_autopilot', kids_character: 'pip', kids_language: 'en', kids_theme: '' } }
    dup = false; inserted.length = 0
    const c = await WH.fulfillKidsAutopilot(db, { id: 'cs_2', mode: 'subscription', metadata: sub.metadata, amount_total: 2900, currency: 'usd' }, sub)
    const d = await WH.fulfillKidsAutopilot(db, { id: 'cs_2', mode: 'subscription', metadata: { supabase_user_id: 'u-2', kids_product: 'kids_autopilot' }, amount_total: 2900, currency: 'usd' }, sub)
    r.I6_piloto_ciclo_da_assinatura_e_dono = c.ok && inserted.length === 1 && inserted[0].kind === 'autopilot' && inserted[0].cycle_start === '2026-10-20T15:00:00.000Z' && inserted[0].cycle_end === '2026-11-19T15:00:00.000Z' && inserted[0].stripe_subscription_id === 'sub_9' && !d.ok && /owner mismatch/.test(d.error)
    const { db: dbErr } = fakeDb({ kids_orders: async () => ({ error: { code: 'XX000', message: 'boom' } }), profiles: async () => ({ data: null }) })
    const e = await WH.fulfillKidsPack(dbErr, session)
    r.I7_falha_do_banco_vira_retentativa = !e.ok && /not recorded/.test(e.error)
  }

  // R — rota do filme
  const FM = src(F.film)
  const iAdm = FM.indexOf('const kidsPedidoAdmitido = await kidsOrderAdmits(')
  const iWrap = FM.indexOf('if (!kidsPedidoAdmitido) {')
  const iGate = FM.indexOf('if (!regionFreeFilmAdmitted) {')
  const iPaidGate = FM.indexOf('if (!isPaidUser && !trialActive) {')
  const iCur = FM.indexOf('kidsPedidoAdmitido || // KINEO-KIDS-VENDA-2010')
  const iCurPaid = FM.indexOf('const currentPaid =')
  r.R1_admissao_antes_do_gate = iAdm > 0 && iWrap > iAdm && iGate > iWrap && iPaidGate > iGate && iCur > iCurPaid && iCurPaid > 0 && /\} \/\/ KINEO-KIDS-VENDA-2010 — fim do `if \(!kidsPedidoAdmitido\)`/.test(FM)
  {
    const mk = (orderRow, runRow) => fakeDb({ kids_orders: async () => ({ data: orderRow }), kids_runs: async () => ({ data: runRow }) }).db
    const S = (db) => carregar(over, { mocks: { '@supabase/supabase-js': { createClient: () => db }, '@/lib/emailValidation': { isDisposableEmail: () => false }, '@/lib/ads/sample': { adsSampleTrialStatusBlocked: () => false } } })(F.server)
    const oid = '11111111-2222-4333-8444-555555555555'
    const good = { raw: oid, userId: 'u-1', generationId: 'kids-abc', engine: 'seedance', duration: 15 }
    const okRun = { id: 'r1', status: 'pending' }
    const t1 = await S(mk({ id: oid, user_id: 'u-1', status: 'active' }, okRun)).kidsOrderAdmits(good)
    const t2 = await S(mk({ id: oid, user_id: 'u-2', status: 'active' }, okRun)).kidsOrderAdmits(good)
    const t3 = await S(mk({ id: oid, user_id: 'u-1', status: 'paused' }, okRun)).kidsOrderAdmits(good)
    const t4 = await S(mk({ id: oid, user_id: 'u-1', status: 'active' }, { id: 'r1', status: 'dispatched' })).kidsOrderAdmits(good)
    const t5 = await S(mk({ id: oid, user_id: 'u-1', status: 'active' }, okRun)).kidsOrderAdmits({ ...good, duration: 35 })
    const t6 = await S(mk({ id: oid, user_id: 'u-1', status: 'active' }, okRun)).kidsOrderAdmits({ ...good, raw: undefined })
    const t7 = await S(mk({ id: oid, user_id: 'u-1', status: 'active' }, okRun)).kidsOrderAdmits({ ...good, engine: 'kling' })
    r.R2_admissao_executada = t1 === true && t2 === false && t3 === false && t4 === false && t5 === false && t6 === false && t7 === false
  }

  // N — telas: só o cartão/painel, sem preço na URL
  r.N1_telas = /<KidsVendaCards lang="en" surface="pricing" \/>/.test(src(F.pricing)) && /<KidsVendaCards lang=\{lang\} surface="page" \/>/.test(src(F.pages)) && /<KidsVendaPanel \/>/.test(src(F.page))
    && !/price=|amount=|credits=/.test(src(F.cards)) && !/price=|amount=|credits=/.test(src(F.panel)) && K.kidsCheckoutHref('pack', { character: 'leo', language: 'en', theme: '' }) === '/api/stripe/checkout?pack=kids_pack&character=leo&language=en'
  const linguas = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
  r.N2_16_linguas_sem_renda = linguas.every((g) => Object.hasOwn(K.KIDS_VENDA_COPY, g) && K.kidsVendaCardText(g).autopilot.includes('US$29') && K.kidsVendaCardText(g).pack.includes('US$49') && K.kidsVendaCardText(g).honest.length > 10)
    && !/income|renda|earn money|ganhe dinheiro|ganar dinero/i.test(Object.values(K.KIDS_VENDA_COPY).map((c) => c.autopilotNote + c.packNote + c.sample).join(' '))
  return r
}

// ── D — desfaz exato, novos, marca, encadeamento ──────────────────────────────────────────────────────────────────────────
console.log('D — desfaz / novos / marca')
for (const p of KIDS_VENDA_2010_ARQUIVOS) {
  // KINEO-ADS-CENA-95-2110 — retira a camada posterior95 e depois a venda; tela clara, som e folha continuam na comparação.
  const b = base(p)
  let des = null
  try { des = semKidsVenda2010(disco(p), p) } catch (e) { console.log('       (' + e.message + ')') }
  ok(b !== null && des === b, `D1 desfaz exato = origin/main ${KIDS_VENDA_2010_BASE} (sem95 e sem venda): ${p}`) // KINEO-ADS-CENA-95-2110

}
ok(KIDS_VENDA_2010_NOVOS.every((p) => existsSync(join(ROOT, p)) && base(p) === null), 'D2 os arquivos novos existem e não estavam na base')
ok(KIDS_VENDA_2010_NOVOS.filter((p) => /\.(ts|tsx|mjs|sql)$/.test(p)).every((p) => disco(p).includes(MARCA)), 'D3 todo arquivo novo carrega a marca')
ok(MARCA_KIDS_VENDA_2010 === MARCA && Object.keys(TROCAS_KIDS_VENDA_2010).every((k) => KIDS_VENDA_2010_ARQUIVOS.includes(k)), 'D4 trocas só em arquivos declarados')
ok(KIDS_VENDA_2010_ARQUIVOS.every((p) => { const n = disco(p).split('\n').filter((l) => l.includes(MARCA)).length; return n === (ACRESCIMOS_KIDS_VENDA_2010[p] ?? 0) + (TROCAS_KIDS_VENDA_2010[p] ?? []).length }), 'D5 contagem de linhas marcadas = acréscimos + trocas')
ok(semKidsVenda2010('qualquer texto sem marca', F.webhook) === 'qualquer texto sem marca' && semKidsVenda2010(disco(F.lib), F.lib) === disco(F.lib), 'D6 idempotente fora da lista e sem marca')
{
  const { semMenuUgc2010 } = await import('./test-support/desfaz-menu-ugc-2010.mjs')
  const viaCadeia = semMenuUgc2010(disco(F.webhook), F.webhook)
  ok(!viaCadeia.includes(MARCA) && /^  texto = semKidsVenda2010\(texto, p\) \/\/ KINEO-KIDS-VENDA-2010/m.test(disco('scripts/test-support/desfaz-bebe-que-fala-2010.mjs')), 'D7 encadeado: a cabeça (semMenuUgc2010 → semBebeQueFala2010) tira esta camada primeiro')
}

// ── as provas no disco ────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('P / S / C / Q / A / I / R / N — no disco')
const R0 = await provas({})
for (const [k, v] of Object.entries(R0)) ok(v, k)

// ── M — mutantes em memória (cada um precisa APLICAR e derrubar a prova alvo) ────────────────────────────────────────────
console.log('M — mutantes')
const MUT = [
  ['M1 piloto 2900→2500', F.lib, "autopilot: { usdMinor: 2900,", "autopilot: { usdMinor: 2500,", 'P1_precos'],
  ['M2 pack 4900→3900', F.lib, "pack: { usdMinor: 4900,", "pack: { usdMinor: 3900,", 'P1_precos'],
  ['M3 valor vindo da URL', F.checkoutKids, '  const unitAmount = price.usdMinor\n', "  const unitAmount = Number(req.nextUrl.searchParams.get('amount')) || price.usdMinor\n", 'P2_pack_valor_servidor'],
  ['M4 piloto sem recurring', F.checkoutKids, "      ...(kind === 'autopilot' ? { recurring: { interval: 'month' as const } } : {}),\n", '\n', 'P3_piloto_assinatura_inline'],
  ['M5 venda desligada sem autorização', F.lib, 'export const KIDS_SALES_LIVE = true', 'export const KIDS_SALES_LIVE = false', 'S1_ligado_no_disco'],
  ['M26 template desligado fecha a venda pública', F.kids, 'export const KIDS_CARTOON_LIVE = true', 'export const KIDS_CARTOON_LIVE = false', 'S1_ligado_no_disco'],
  ['M6 checkout ignora o interruptor', F.checkoutKids, '  if (!kidsSalesOpen(KIDS_SALES_OPEN_FOR_PUBLIC, isInternalEmail(user.email))) {', '  if (false) {', 'S2_checkout_recusa_fora_da_casa'],
  ['M7 35 s (prejuízo)', F.lib, 'export const KIDS_VENDA_DURATION: KidsCartoonDuration = 15', 'export const KIDS_VENDA_DURATION: KidsCartoonDuration = 35', 'P5_margem_positiva_pior_caso'],
  ['M8 2º piloto passa', F.checkoutKids, "    if (has) { skuContext.blocked = 'has_autopilot'; return redirectError(KIDS_CHECKOUT_MSG.hasAutopilot) }", '', 'P6_um_piloto_por_conta'],
  ['M9 posição além do total', F.lib, '  return used < i.total ? used + 1 : null', '  return used + 1', 'C1_posicoes'],
  ['M10 ciclo de 31 dias', F.lib, 'export const KIDS_CYCLE_DAYS = 30', 'export const KIDS_CYCLE_DAYS = 31', 'C2_ciclo_30_dias_da_assinatura'],
  ['M11 renovação repete', F.server, '  if (row.last_invoice_id === i.invoiceId) return { ok: true, renewed: false }\n', '\n', 'C5_renovacao_zera_e_e_idempotente'],
  ['M12 pack 30 de uma vez', F.lib, "  return kind === 'pack' ? KIDS_PACK_PER_ORDER_PER_PASS : 1", "  return kind === 'pack' ? 30 : 1", 'Q1_fila'],
  ['M13 amostra sem teto', F.lib, '  if (i.startedToday >= KIDS_SAMPLE_DAILY_CAP) return { ok: false, reason: \'daily_cap\' }\n', '\n', 'A1_amostra'],
  ['M14 2ª amostra passa', F.lib, "  if (i.samplesUsed > 0) return { ok: false, reason: 'already_used' }\n", '\n', 'A1_amostra'],
  ['M15 pack concede crédito', F.wh, "  const paid = await markKidsBuyerPaid(db, userId)\n  if (!paid.ok) return { ok: false, error: `kids pack has_paid not set (${userId}): ${paid.error}` }", "  await db.from('profiles').update({ video_credits: 270, has_paid: true }).eq('id', userId)", 'I5_pack_pedido_unico_sem_credito'],
  ['M16 dono errado passa', F.wh, "  if ((subscription.metadata?.supabase_user_id ?? null) !== userId) return { ok: false, error: `kids autopilot subscription owner mismatch (${session.id})` }\n", '\n', 'I6_piloto_ciclo_da_assinatura_e_dono'],
  ['M17 falha do banco engolida', F.wh, "  if (!created.ok) return { ok: false, error: `kids pack order not recorded (${session.id}): ${created.error}` }", "  if (!created.ok) return { ok: true, detail: 'ignored' }", 'I7_falha_do_banco_vira_retentativa'],
  ['M18 admissão sem checar o dono', F.server, "    if (o.error || !order || order.user_id !== i.userId || order.status !== 'active') return false", "    if (o.error || !order || order.status !== 'active') return false", 'R2_admissao_executada'],
  ['M19 admissão com run já despachada', F.server, "    return !r.error && !!run && run.status === 'pending'", '    return !r.error && !!run', 'R2_admissao_executada'],
  ['M20 estorno não tira de volta', F.cron, "if (debit === 'refunded') { await fail('render_refunded', true); continue }", "if (debit === 'refunded') { await fail('render_refunded', false); continue }", 'Q4_estorno_tira_de_volta'],
  ['M21 webhook: pedido antes do guard', F.webhook, "            const { error: kidsGuardError } = await supabase.from('stripe_events').insert({ id: checkoutFulfillmentGuard }) // KINEO-KIDS-VENDA-2010\n", "            const kidsPack = await fulfillKidsPack(supabase, session) // KINEO-KIDS-VENDA-2010\n            const { error: kidsGuardError } = await supabase.from('stripe_events').insert({ id: checkoutFulfillmentGuard }) // KINEO-KIDS-VENDA-2010\n", 'I1_pack_guard_antes_pedido_antes_do_valor'],
  ['M22 rota: admissão fora de currentPaid', F.film, '      kidsPedidoAdmitido || // KINEO-KIDS-VENDA-2010', '      false || // KINEO-KIDS-VENDA-2010', 'R1_admissao_antes_do_gate'],
  ['M24 e-mail genérico da rota de status sai para o episódio', F.statusRoute, "user.email && !String(prepaidCinematicClaim?.generationId ?? '').startsWith('kids-')) { // KINEO-KIDS-VENDA-2010", "user.email) { // KINEO-KIDS-VENDA-2010", 'Q6_email_so_do_cron'],
  ['M25 e-mail de resgate da casa sai para o episódio', F.stranded, " && !String(genId).startsWith('kids-') // KINEO-KIDS-VENDA-2010", " // KINEO-KIDS-VENDA-2010", 'Q6_email_so_do_cron'],
  ['M23 preço na URL do cartão', F.cards, '#plans`', '#plans&price=2900`', 'N1_telas'],
]
for (const [nome, arq, a, b, alvo] of MUT) {
  let over = null
  try { over = { [arq]: trocar(disco(arq), a, b) } } catch (e) { ok(false, `${nome} — ${e.message}`); continue }
  const aplicou = over[arq] !== disco(arq)
  let r = null
  try { r = await provas(over) } catch (e) { r = { __lancou: false }; console.log('       (lançou: ' + e.message + ')') }
  ok(aplicou && r && (r[alvo] === false || r.__lancou === false), `${nome} → ${alvo} VERMELHO`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
