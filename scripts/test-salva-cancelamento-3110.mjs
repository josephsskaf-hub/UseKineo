#!/usr/bin/env node
// ═══ KINEO-SALVA-CANCELAMENTO-3110 — guardião: a tela "Before you go" antes do cancelamento ═══════════════════════════
// Executa o CÓDIGO REAL (readFileSync + ts.transpileModule; alias @/ resolvido aqui; sem rede, sem banco, sem Stripe):
//   R1 · regra pura (lib/billing/salvaCancelamento.ts): 5 motivos, 1 oferta por motivo; a troca só é oferecida quando a
//        rota change-plan vai aceitar (Starter já é o mais barato, anual vai ao suporte, cancelamento agendado, status
//        fora de active/trialing, sem assinatura); o tempo da troca é o da rota (agora com proration / teste / fim do
//        período no Business); o saldo é contado pela MESMA régua do webhook (renewalBalance): a cota zera, o comprado
//        fica — e o texto diz "don't roll over", nunca promete rollover;
//   R2 · rota GET /api/stripe/cancel-save: 401 sem sessão; só LEITURA (nenhum insert/update/upsert/delete no banco, só
//        subscriptions.retrieve na Stripe); assinatura de outra pessoa ou leitura falha = troca NÃO oferecida;
//   R3 · portal: sem corpo = o portal de sempre (return_url /pricing, sem flow_data); { flow: 'cancel' } = tela de
//        cancelar da PRÓPRIA assinatura; se a Stripe recusar o fluxo, cai no portal de sempre;
//   R4 · a tela (CancelSaveView renderizada): "Continue to cancel" em TODOS os estados (inclusive sem motivo); cada
//        motivo mostra a sua oferta e só ela; nenhuma palavra de desconto/preço novo;
//   R5 · eventos: cancel_flow_opened / cancel_reason_selected {reason} / cancel_saved_downgrade (só depois do ok da rota)
//        / cancel_continued; nenhum deles é só-servidor no /api/events (senão o navegador seria recusado);
//   R6 · conta: o botão "Cancel subscription" abre a tela; "Manage billing" segue no portal; a troca usa a rota existente.
// Depois, MUTANTES em memória (troca de texto com prova de aplicação): cada regra quebrada TEM de ficar vermelha.
//
// Rodar: node scripts/test-salva-cancelamento-3110.mjs [--verbose]
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const React = nodeRequire('react')
const { renderToStaticMarkup } = nodeRequire('react-dom/server')
const CR = String.fromCharCode(13)
const VERBOSE = process.argv.includes('--verbose')

const F = {
  lib: 'lib/billing/salvaCancelamento.ts',
  route: 'app/api/stripe/cancel-save/route.ts',
  portal: 'app/api/stripe/portal/route.ts',
  view: 'components/billing/CancelSaveFlow.tsx',
  account: 'app/(dashboard)/account/AccountClient.tsx',
  events: 'app/api/events/route.ts',
  changePlan: 'app/api/stripe/change-plan/route.ts',
}

const disk = new Map()
function readDisk(rel) {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}
let overlay = new Map() // mutantes: rel → texto
const src = (rel) => (overlay.has(rel) ? overlay.get(rel) : readDisk(rel))

// ── carregador mínimo: TS → CJS, alias @/, módulos falsos onde há rede ─────────────────────────────────────────────
function resolveRel(spec, fromRel) {
  let base
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(fromRel), spec))
  else return null
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (/\.(ts|tsx)$/.test(cand) && existsSync(join(root, cand))) return cand
  }
  return null
}
function loadModule(rel, fakes, cache = new Map()) {
  if (cache.has(rel)) return cache.get(rel).exports
  const out = ts.transpileModule(src(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: rel,
  }).outputText
  const mod = { exports: {} }
  cache.set(rel, mod)
  const req = (spec) => {
    if (Object.prototype.hasOwnProperty.call(fakes, spec)) return fakes[spec]
    const r = resolveRel(spec, rel)
    if (r) {
      if (Object.prototype.hasOwnProperty.call(fakes, `@/${r.replace(/\.(ts|tsx)$/, '')}`)) return fakes[`@/${r.replace(/\.(ts|tsx)$/, '')}`]
      return loadModule(r, fakes, cache)
    }
    return nodeRequire(spec)
  }
  new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
  return mod.exports
}

const NextResponse = { json: (body, init) => ({ status: init?.status ?? 200, body }) }
const nextServer = { NextResponse, NextRequest: class {} }

// ── banco e Stripe falsos ──────────────────────────────────────────────────────────────────────────────────────────
function fakeSupabase({ user, profile, film }) {
  const writes = []
  const from = (table) => {
    const q = {
      _table: table,
      select() { return q },
      eq() { return q },
      order() { return q },
      limit() { return q },
      insert(v) { writes.push(['insert', table, v]); return q },
      update(v) { writes.push(['update', table, v]); return q },
      upsert(v) { writes.push(['upsert', table, v]); return q },
      delete() { writes.push(['delete', table]); return q },
      async maybeSingle() { return { data: table === 'profiles' ? profile : table === 'videos' ? film : null, error: null } },
      async single() { return { data: table === 'profiles' ? profile : null, error: null } },
      then(res, rej) { return Promise.resolve({ data: null, error: null }).then(res, rej) },
    }
    return q
  }
  return { client: { auth: { getUser: async () => ({ data: { user } }) }, from }, writes }
}
function fakeStripe({ sub, retrieveThrows = false, flowThrows = false }) {
  const calls = []
  return {
    calls,
    stripe: {
      subscriptions: {
        retrieve: async (id) => { calls.push(['subscriptions.retrieve', id]); if (retrieveThrows) throw new Error('boom'); return sub },
        update: async (...a) => { calls.push(['subscriptions.update', ...a]); return sub },
        cancel: async (...a) => { calls.push(['subscriptions.cancel', ...a]); return sub },
      },
      billingPortal: {
        sessions: {
          create: async (p) => {
            calls.push(['billingPortal.sessions.create', p])
            if (p.flow_data && flowThrows) throw new Error('flow not enabled')
            return { url: p.flow_data ? 'https://billing.test/cancel' : 'https://billing.test/home' }
          },
        },
      },
    },
  }
}

let passed = 0
let failed = []
function check(cond, label) {
  if (cond) passed++
  else failed.push(label)
  if (VERBOSE) console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`)
  return Boolean(cond)
}

const USER = { id: 'u-1' }
const NOW_END = 1793491200 // 2026-11-01T00:00:00Z
const subOf = (o = {}) => ({
  status: 'active',
  cancel_at_period_end: false,
  current_period_end: NOW_END,
  metadata: { supabase_user_id: USER.id },
  items: { data: [{ price: { recurring: { interval: 'month' } } }] },
  ...o,
})

async function suite() {
  // as rotas logam as falhas que o próprio teste provoca (Stripe falsa recusando): silêncio, salvo --verbose
  const { warn, error } = console
  if (!VERBOSE) { console.warn = () => {}; console.error = () => {} }
  try { await suiteBody() } finally { console.warn = warn; console.error = error }
}

async function suiteBody() {
  // ═══ R1 · regra pura ═══
  const L = loadModule(F.lib, { 'next/server': nextServer })
  check(L.CANCEL_REASONS.join(',') === 'too_expensive,unused_credits,quality,just_testing,other', 'R1 · 5 motivos, nesta ordem')
  check(L.offerForReason('too_expensive') === 'downgrade' && L.offerForReason('unused_credits') === 'credits'
    && L.offerForReason('quality') === 'support' && L.offerForReason('just_testing') === 'none' && L.offerForReason('other') === 'none',
  'R1 · uma oferta por motivo (caro→Starter, créditos→saldo, qualidade→suporte, resto→cancelar)')
  const base = { tier: 'basic', inTrial: false, hasStripeSubscription: true, interval: 'month', status: 'active', cancelAtPeriodEnd: false }
  const d = (o) => L.downgradeDecision({ ...base, ...o })
  check(d({}).possible === true && d({}).to === 'starter' && d({}).timing === 'now_prorated', 'R1 · Creator mensal ativo → Starter agora, com proration')
  check(d({ tier: 'pro', status: 'trialing', inTrial: true }).timing === 'trial', 'R1 · em teste → troca sem cobrança (timing trial)')
  check(d({ tier: 'business' }).timing === 'period_end', 'R1 · Business → Starter no fim do período pago')
  check(d({ tier: 'business', status: 'trialing' }).possible === false, 'R1 · Business em teste não troca (a rota recusa)')
  check(d({ tier: 'starter' }).block === 'already_cheapest', 'R1 · Starter já é o mais barato: sem botão')
  check(d({ interval: 'year' }).block === 'annual', 'R1 · anual → suporte, não botão (rota dá 409)')
  check(d({ interval: null }).possible === false, 'R1 · sem ler o intervalo na Stripe, não oferece às cegas')
  check(d({ cancelAtPeriodEnd: true }).block === 'canceling', 'R1 · cancelamento já agendado: sem troca')
  check(d({ status: null }).block === 'not_active' && d({ status: 'past_due' }).block === 'not_active', 'R1 · status fora de active/trialing: sem troca')
  check(d({ hasStripeSubscription: false }).block === 'no_subscription' && d({ tier: null }).block === 'unknown_plan', 'R1 · sem assinatura / plano desconhecido: sem troca')
  check(L.saveTierOfPlan('creator_trial').tier === 'basic' && L.saveTierOfPlan('creator_trial').inTrial === true
    && L.saveTierOfPlan('studio').tier === 'pro' && L.saveTierOfPlan('free').tier === null && L.saveTierOfPlan('autopilot').tier === null,
  'R1 · plano do perfil → tier da troca')

  const renewal = loadModule('lib/credits/renewalBalance.ts', {})
  for (const [bal, quota] of [[40, 150], [150, 150], [1150, 150], [0, 60], [700, 60]]) {
    const s = L.creditsStory(bal, quota)
    const r = renewal.renewalBalance(bal, quota)
    check(s.keptAfterRenewal === r.carried && s.resetsAtRenewal + s.keptAfterRenewal === bal, `R1 · saldo ${bal}/${quota} contado pela régua do webhook (renewalBalance)`)
  }
  const onlyPlan = L.creditsCopy(L.creditsStory(40, 150), 'November 1, 2026', false)
  const withBought = L.creditsCopy(L.creditsStory(1150, 150), 'November 1, 2026', false)
  check(/don't roll over/.test(onlyPlan) && /November 1, 2026/.test(onlyPlan) && /reset to 150/.test(onlyPlan), 'R1 · texto: cota zera na renovação, com a data, sem rollover')
  check(/1000 you bought or received stay/.test(withBought) && /don't roll over/.test(withBought), 'R1 · texto: o comprado/dado fica, a cota não acumula')
  check(![onlyPlan, withBought].some((t) => /never expire|roll(s)? over to|carry over|carried over to/i.test(t)), 'R1 · nenhuma promessa de rollover')
  const now = L.downgradeTimingCopy('now_prorated', null)
  const end = L.downgradeTimingCopy('period_end', 'November 1, 2026')
  check(/switches to Starter now/.test(now) && /next bill/.test(now) && /keep every credit/.test(now), 'R1 · troca agora: diz "agora", crédito na próxima fatura, saldo fica')
  check(/November 1, 2026/.test(end) && /nothing is charged today/.test(end), 'R1 · Business: diz a data e que nada é cobrado hoje')
  check(L.lastFilmHref({ videoUrl: 'https://cdn.test/a.mp4' }) === 'https://cdn.test/a.mp4'
    && L.lastFilmHref({ videoUrl: 'javascript:alert(1)' }) === '/library' && L.lastFilmHref({ videoUrl: 'http://x.test/a.mp4' }) === '/library'
    && L.lastFilmHref(null) === '/library', 'R1 · último filme: só https vira link; o resto vai à biblioteca')
  check(L.supportMailto('abc') === 'mailto:support@usekineo.com?subject=Video%20quality%20%E2%80%94%20film%20abc', 'R1 · e-mail do suporte com o filme no assunto')

  // ═══ R2 · rota de leitura ═══
  async function runRoute({ user = USER, profile, film = null, sub = subOf(), retrieveThrows = false }) {
    const sb = fakeSupabase({ user, profile, film })
    const st = fakeStripe({ sub, retrieveThrows })
    const mod = loadModule(F.route, {
      'next/server': nextServer,
      '@/lib/supabase/server': { createClient: () => sb.client },
      '@/lib/stripe': { stripe: st.stripe },
    })
    const res = await mod.GET()
    return { res, writes: sb.writes, calls: st.calls }
  }
  const prof = { plan: 'basic', stripe_subscription_id: 'sub_1', paypal_subscription_id: null, video_credits: 40 }
  const anon = await runRoute({ user: null, profile: prof })
  check(anon.res.status === 401 && anon.calls.length === 0, 'R2 · sem sessão = 401, nada na Stripe')
  const ok = await runRoute({ profile: prof, film: { id: 'f1', topic: 'HOOK: The lake that turns animals to stone\nMore', status: 'completed', video_url: 'https://cdn.test/f1.mp4', created_at: '2026-10-20T10:00:00Z' } })
  check(ok.res.status === 200 && ok.res.body.downgrade.possible === true && ok.res.body.downgrade.timing === 'now_prorated', 'R2 · Creator mensal: troca oferecida (agora)')
  check(ok.res.body.periodEnd === '2026-11-01T00:00:00.000Z' && ok.res.body.credits.balance === 40, 'R2 · data da renovação e saldo reais')
  check(ok.res.body.lastFilm?.href === 'https://cdn.test/f1.mp4' && ok.res.body.lastFilm?.title === 'The lake that turns animals to stone', 'R2 · último filme pronto, título limpo')
  check(ok.writes.length === 0, 'R2 · nenhuma escrita no banco')
  check(ok.calls.every(([n]) => n === 'subscriptions.retrieve') && ok.calls.length === 1, 'R2 · na Stripe só subscriptions.retrieve da própria assinatura')
  const foreign = await runRoute({ profile: prof, sub: subOf({ metadata: { supabase_user_id: 'outra' } }) })
  check(foreign.res.body.downgrade.possible === false && foreign.res.body.periodEnd === null, 'R2 · assinatura de outra pessoa: nada dela vaza, troca não oferecida')
  const broken = await runRoute({ profile: prof, retrieveThrows: true })
  check(broken.res.status === 200 && broken.res.body.downgrade.possible === false, 'R2 · Stripe falhou: tela abre, troca não oferecida')
  const annual = await runRoute({ profile: prof, sub: subOf({ items: { data: [{ price: { recurring: { interval: 'year' } } }] } }) })
  check(annual.res.body.downgrade.block === 'annual', 'R2 · anual: bloqueio "annual"')
  const starter = await runRoute({ profile: { ...prof, plan: 'starter' } })
  check(starter.res.body.downgrade.block === 'already_cheapest' && starter.res.body.cheapest.tier === 'starter', 'R2 · Starter: já é o mais barato')

  // ═══ R3 · portal ═══
  async function runPortal({ body, profile = { stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' }, flowThrows = false }) {
    const sb = fakeSupabase({ user: USER, profile })
    const st = fakeStripe({ sub: subOf(), flowThrows })
    const mod = loadModule(F.portal, {
      'next/server': nextServer,
      '@/lib/supabase/server': { createClient: () => sb.client },
      '@/lib/stripe': { stripe: st.stripe },
    })
    const req = { nextUrl: { origin: 'https://app.test' }, json: async () => { if (body === undefined) throw new SyntaxError('empty'); return body } }
    const res = await mod.POST(req)
    return { res, calls: st.calls, writes: sb.writes }
  }
  const plain = await runPortal({})
  const plainCreate = plain.calls.filter(([n]) => n === 'billingPortal.sessions.create')
  check(plain.res.body.url === 'https://billing.test/home' && plainCreate.length === 1 && !plainCreate[0][1].flow_data
    && plainCreate[0][1].return_url === 'https://app.test/pricing', 'R3 · sem corpo: o portal de sempre (return /pricing)')
  const flow = await runPortal({ body: { flow: 'cancel' } })
  const flowCreate = flow.calls.find(([n]) => n === 'billingPortal.sessions.create')?.[1]
  check(flow.res.body.url === 'https://billing.test/cancel' && flowCreate?.flow_data?.type === 'subscription_cancel'
    && flowCreate?.flow_data?.subscription_cancel?.subscription === 'sub_1' && flowCreate?.customer === 'cus_1', 'R3 · flow cancel: tela de cancelar da PRÓPRIA assinatura')
  check(!flow.calls.some(([n]) => n.startsWith('subscriptions.')), 'R3 · o portal não cancela nada sozinho (cancelar é na Stripe)')
  const fallback = await runPortal({ body: { flow: 'cancel' }, flowThrows: true })
  check(fallback.res.status === 200 && fallback.res.body.url === 'https://billing.test/home', 'R3 · fluxo recusado pela Stripe: cai no portal de sempre')
  const noSub = await runPortal({ body: { flow: 'cancel' }, profile: { stripe_customer_id: 'cus_1', stripe_subscription_id: null } })
  check(noSub.res.body.url === 'https://billing.test/home', 'R3 · sem assinatura: portal de sempre')

  // ═══ R4 · a tela ═══
  const V = loadModule(F.view, {
    '@/lib/analytics': { trackEvent: async () => true },
    'react-dom': { createPortal: (n) => n },
  })
  const info = (o = {}) => ({
    tier: 'basic', inTrial: false, periodEnd: '2026-11-01T00:00:00.000Z', cancelAtPeriodEnd: false,
    credits: L.creditsStory(40, 150),
    downgrade: { possible: true, to: 'starter', timing: 'now_prorated' },
    cheapest: { tier: 'starter', priceUsdMinor: 990, creditsPerMonth: 60 },
    lastFilm: { id: 'f1', title: 'The lake', createdAt: '2026-10-20T10:00:00Z', href: 'https://cdn.test/f1.mp4' },
    supportEmail: 'support@usekineo.com',
    ...o,
  })
  const noop = () => {}
  const render = (p) => renderToStaticMarkup(React.createElement(V.CancelSaveView, {
    phase: 'ready', info: info(), reason: null, error: null, savedNote: null, leaving: false,
    onClose: noop, onPickReason: noop, onSwitch: noop, onContinue: noop, ...p,
  }))
  const states = {
    loading: render({ phase: 'loading', info: null }),
    none: render({}),
    noInfo: render({ info: null, reason: 'too_expensive' }),
    expensive: render({ reason: 'too_expensive' }),
    expensiveStarter: render({ reason: 'too_expensive', info: info({ tier: 'starter', downgrade: { possible: false, block: 'already_cheapest' } }) }),
    expensiveAnnual: render({ reason: 'too_expensive', info: info({ downgrade: { possible: false, block: 'annual' } }) }),
    credits: render({ reason: 'unused_credits' }),
    quality: render({ reason: 'quality' }),
    testing: render({ reason: 'just_testing' }),
    other: render({ reason: 'other' }),
  }
  for (const [k, html] of Object.entries(states)) check(html.includes('Continue to cancel') && html.includes('cancel-save-continue'), `R4 · "Continue to cancel" visível no estado ${k}`)
  check((states.none.match(/role="radio"/g) || []).length === 5 && !/cancel-save-(downgrade|credits|support)/.test(states.none), 'R4 · sem motivo: 5 opções e nenhuma oferta empurrada')
  check(states.expensive.includes('Switch to Starter') && states.expensive.includes('$9.90') && states.expensive.includes('next bill')
    && !/cancel-save-(credits|support)/.test(states.expensive), 'R4 · caro: só a troca para o Starter, com preço e o quando')
  check(/already on Starter/.test(states.expensiveStarter.replace(/&#x27;/g, "'")) && !states.expensiveStarter.includes('Switch to Starter instead'), 'R4 · caro no Starter: sem botão, diz que é o mais barato')
  check(states.expensiveAnnual.includes('switched by our team') && !states.expensiveAnnual.includes('Switch to Starter instead'), 'R4 · caro no anual: suporte, sem botão que falha')
  const creditsText = states.credits.replace(/&#x27;/g, "'")
  check(states.credits.includes('cancel-save-credits') && /don't roll over/.test(creditsText) && creditsText.includes('November 1, 2026') && creditsText.includes('>40<'),
    'R4 · créditos: saldo, data e "don\'t roll over"')
  check(states.quality.includes('mailto:support@usekineo.com?subject=Video%20quality%20%E2%80%94%20film%20f1') && states.quality.includes('https://cdn.test/f1.mp4')
    && !/cancel-save-(downgrade|credits)/.test(states.quality), 'R4 · qualidade: e-mail do suporte + último filme, sem venda')
  check(!/cancel-save-(downgrade|credits|support)/.test(states.testing + states.other), 'R4 · testando/outro: direto ao cancelamento')
  check(!/\d+\s*%\s*off|discount|free month|coupon|promo/i.test(Object.values(states).join(' ')), 'R4 · nenhum desconto ou preço novo na tela')
  const saved = render({ phase: 'saved', savedNote: 'Done — you are on Starter now.' })
  check(saved.includes('Done — you are on Starter now.') && !saved.includes('Continue to cancel'), 'R4 · salvo: confirma a troca')

  // ═══ R5 · eventos ═══
  const view = src(F.view)
  for (const k of ['opened', 'reasonSelected', 'savedDowngrade', 'continued']) {
    check(new RegExp(`trackEvent\\(CANCEL_EVENTS\\.${k}\\b`).test(view), `R5 · trackEvent(CANCEL_EVENTS.${k})`)
  }
  check(/CANCEL_EVENTS\.reasonSelected, \{ reason: r\b/.test(view), 'R5 · cancel_reason_selected leva {reason}')
  const sw = view.slice(view.indexOf('async function switchToCheapest'), view.indexOf('if (!mounted) return null'))
  const okAt = sw.indexOf('if (res.ok && data?.ok)')
  check(okAt > 0 && sw.indexOf('CANCEL_EVENTS.savedDowngrade') > okAt && sw.includes("fetch('/api/stripe/change-plan'"), 'R5 · cancel_saved_downgrade só depois do ok da rota change-plan existente')
  check(L.CANCEL_EVENTS.opened === 'cancel_flow_opened' && L.CANCEL_EVENTS.reasonSelected === 'cancel_reason_selected'
    && L.CANCEL_EVENTS.savedDowngrade === 'cancel_saved_downgrade' && L.CANCEL_EVENTS.continued === 'cancel_continued', 'R5 · nomes dos 4 eventos')
  const serverOnly = src(F.events).slice(src(F.events).indexOf('const SERVER_ONLY_EVENTS'))
  const serverOnlyBlock = serverOnly.slice(0, serverOnly.indexOf('])'))
  check(!/cancel_(flow_opened|reason_selected|saved_downgrade|continued)/.test(serverOnlyBlock), 'R5 · nenhum evento da tela é só-servidor no /api/events')
  const cont = view.slice(view.indexOf('async function continueToCancel'), view.indexOf('async function switchToCheapest'))
  check(cont.includes("JSON.stringify({ flow: 'cancel' })") && cont.includes("fetch('/api/stripe/portal'"), 'R5 · "Continue to cancel" abre o portal na tela de cancelar')

  // ═══ R6 · conta ═══
  const acc = src(F.account)
  check(acc.includes("import CancelSaveFlow from '@/components/billing/CancelSaveFlow'") && acc.includes('onClick={() => setCancelSaveOpen(true)}')
    && acc.includes('{cancelSaveOpen && <CancelSaveFlow onClose={() => setCancelSaveOpen(false)} />}') && acc.includes('>\n                    Cancel subscription\n'),
  'R6 · conta: "Cancel subscription" abre a tela antes do portal')
  check(acc.includes('onClick={handlePortal}') && acc.includes("'Manage billing — payment method, invoices'"), 'R6 · "Manage billing" segue no portal (cartão/faturas)')
  check(!src(F.route).includes('subscriptions.update') && !src(F.view).includes('subscriptions.') && src(F.changePlan).includes("const SWITCHABLE = new Set<CheckoutTier>(['starter', 'basic', 'pro'])"),
    'R6 · nenhuma escrita nova na Stripe; a troca é a rota change-plan de sempre')
  check([F.lib, F.route, F.portal, F.view, F.account].every((f) => src(f).includes('KINEO-SALVA-CANCELAMENTO-3110')), 'R6 · marcador em todos os arquivos tocados')
}

// ── mutantes ───────────────────────────────────────────────────────────────────────────────────────────────────────
const MUTANTS = [
  ['texto promete rollover', F.lib, "unused plan credits don't roll over", 'unused plan credits roll over to next month'],
  ['anual ganha botão', F.lib, "  if (input.interval !== 'month') return { possible: false, block: 'annual' }\n", ''],
  ['Starter ganha botão de Starter', F.lib, "  if (input.tier === CHEAPEST_TIER) return { possible: false, block: 'already_cheapest' }\n", ''],
  ['cancelamento agendado ganha troca', F.lib, "  if (input.cancelAtPeriodEnd) return { possible: false, block: 'canceling' }\n", ''],
  ['qualidade vira venda', F.lib, "if (reason === 'quality') return 'support'", "if (reason === 'quality') return 'downgrade'"],
  ['saldo fora da régua do webhook', F.lib, 'const kept = renewalBalance(b, quota).carried', 'const kept = b'],
  ['rota escreve no banco', F.route, "  const { tier, inTrial } = saveTierOfPlan(profile?.plan)\n", "  await supabase.from('profiles').update({ plan: 'starter' }).eq('id', user.id)\n  const { tier, inTrial } = saveTierOfPlan(profile?.plan)\n"],
  ['rota ignora o dono da assinatura', F.route, 'if (!owner || owner === user.id) {', 'if (true) {'],
  ['portal cancela na assinatura errada', F.portal, 'subscription_cancel: { subscription: String(profile.stripe_subscription_id) }', "subscription_cancel: { subscription: 'sub_x' }"],
  ['portal sem queda para o de sempre', F.portal, "        console.warn('Portal cancel flow unavailable", "        throw flowError\n        console.warn('Portal cancel flow unavailable"],
  ['portal de sempre muda', F.portal, 'return_url: `${appUrl}/pricing`,', 'return_url: `${appUrl}/account`,'],
  ['"Continue to cancel" só depois do motivo', F.view, "{leaving ? 'Opening…' : 'Continue to cancel'}", "{reason ? (leaving ? 'Opening…' : 'Continue to cancel') : null}"],
  ['saved_downgrade antes do ok', F.view, "    try {\n      const res = await fetch('/api/stripe/change-plan', {", "    void trackEvent(CANCEL_EVENTS.savedDowngrade, {})\n    try {\n      const res = await fetch('/api/stripe/change-plan', {"],
  ['continuar sem a tela de cancelar', F.view, "body: JSON.stringify({ flow: 'cancel' }),", 'body: JSON.stringify({}),'],
  ['conta sem o botão de cancelar', F.account, '{cancelSaveOpen && <CancelSaveFlow onClose={() => setCancelSaveOpen(false)} />}', ''],
  ['tela oferece desconto', F.view, 'You keep your films and your library.', 'Get 50% off for 3 months.'],
]

async function main() {
  await suite()
  const baseFailed = failed
  const basePassed = passed
  console.log(`\nKINEO-SALVA-CANCELAMENTO-3110 — verificações: ${basePassed} · falhas: ${baseFailed.length}`)
  for (const f of baseFailed) console.log(`  ✗ ${f}`)
  let killed = 0
  const survivors = []
  for (const [name, file, from, to] of MUTANTS) {
    const orig = readDisk(file)
    const n = orig.split(from).length - 1
    if (n !== 1) { survivors.push(`${name} (âncora ${n}×)`); continue }
    const mutated = orig.replace(from, to)
    if (mutated === orig || (to && !mutated.includes(to))) { survivors.push(`${name} (não aplicou)`); continue }
    overlay = new Map([[file, mutated]])
    passed = 0
    failed = []
    let red = false
    try { await suite(); red = failed.length > 0 } catch { red = true }
    overlay = new Map()
    if (red) killed++
    else survivors.push(name)
    if (VERBOSE) console.log(`  mutante "${name}" → ${red ? 'vermelho' : 'SOBREVIVEU'}`)
  }
  passed = basePassed
  failed = baseFailed
  console.log(`  mutantes derrubados: ${killed}/${MUTANTS.length}`)
  for (const s of survivors) console.log(`  ✗ mutante sobreviveu: ${s}`)
  if (baseFailed.length || survivors.length) { console.log('VERMELHO'); process.exit(1) }
  console.log('OK — tela "Before you go": motivo + 1 oferta honesta, troca pela rota existente, saldo pela régua do webhook, "Continue to cancel" sempre, só leitura')
}
main().catch((e) => { console.error(e); process.exit(1) })
