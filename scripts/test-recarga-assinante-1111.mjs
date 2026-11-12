// KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "Aprovado pode fazer" — 60 créditos por US$ 9, só para assinante que zerou]
// Guardião offline da recarga do assinante. Prova:
//   A. preço e créditos numa fonte única (lib/credits/creditSlider.ts: o botão RECARGA_ASSINANTE_1111 = 900 / 60 é o 1º degrau
//      da barra); a escada nova (60 → 9 · 350 → 52 · 700 → 102 · 2.000 → 270 · 3.700 → 500), dólar inteiro, passo 10, e em
//      TODOS os degraus: mais cara por crédito que o crédito mais barato dos planos e líquido (cartão internacional) acima
//      do pior custo;
//   B. elegibilidade: só plano pago da escada (sem _trial: cortesia/teste fora), com assinatura da Stripe, saldo abaixo do
//      filme mais barato; leitura estranha = não;
//   C. interruptor: nasce 'internal'; 'off' = nenhuma leitura, nenhum evento; 'internal' = só a casa, em conferência, ninguém
//      compra; 'public' = elegível vê e compra;
//   D. checkout EXECUTADO com banco e Stripe falsos: recusa sem sessão (não assinante, trial, saldo que paga, URL na mão em
//      'internal'); elegível abre UMA sessão USD 900 com metadata.pack, 60 da fonte, validade de 30 min e a volta saneada;
//   E. webhook (lido): SKU só por metadata.pack exata (nunca pelo valor 900 — Starter mensal e one_time_ad), créditos da fonte,
//      guard por sessão ANTES da concessão, evento de pago DEPOIS; o one_time_ad sai antes do Path A;
//   F. rota da oferta EXECUTADA: quem vê, conferência sem cobrança, clique leva ao checkout do SKU;
//   G. aviso: recarga como botão principal, troca como secundário, nenhum preço digitado, leitura só fora do 'off', texto sem
//      "credits never expire"; modal do /studio/create sem "first highlighted option below" para assinante;
//   H. eventos de servidor (SERVER_ONLY_EVENTS);
//   I. mutantes: cada regra quebrada derruba pelo menos uma verificação.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const norm = (s) => s.replace(/\r\n/g, '\n')
const read = (rel) => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const FILES = {
  lib: 'lib/billing/recargaAssinante.ts',
  cp: 'lib/checkoutPricing.ts',
  slider: 'lib/credits/creditSlider.ts',
  modal: 'components/CreditsTopupModal.tsx',
  checkout: 'lib/stripe/recargaAssinanteCheckout.ts',
  route: 'app/api/billing/recarga-assinante/route.ts',
  checkoutRoute: 'app/api/stripe/checkout/route.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  nudge: 'components/billing/SubscriberUpgradeNudge.tsx',
  generate: 'app/(dashboard)/generate/GenerateClient.tsx',
  studio: 'app/(dashboard)/studio/StudioClient.tsx',
  events: 'app/api/events/route.ts',
}
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]))
const KEY_BY_FILE = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [f, k]))

// ── carregador: transpila .ts → CJS; '@/lib/x' resolve para lib/x.ts (com as fontes da suíte); `stubs` cobre o resto ──
function loader(S, stubs = {}, env = {}) {
  const cache = new Map()
  const load = (file) => {
    if (cache.has(file)) return cache.get(file)
    const k = KEY_BY_FILE[file]
    const code = k ? S[k] : read(file)
    const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const mod = { exports: {} }
    cache.set(file, mod.exports)
    const req = (id) => {
      if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id]
      if (id.startsWith('@/lib/')) return load('lib/' + id.slice(6) + '.ts')
      throw new Error('import inesperado: ' + id + ' em ' + file)
    }
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, process: { env: { NODE_ENV: 'test', ...env } }, console: { warn: () => {}, log: () => {}, error: () => {} }, Math, Date, Number, String, Array, Object, JSON, Map, Set, Promise, Error, URL, URLSearchParams, RegExp, encodeURIComponent, Symbol, parseInt, parseFloat, isFinite, Infinity, NaN, setTimeout })
    cache.set(file, mod.exports)
    return mod.exports
  }
  return load
}

const HOUSE = 'josephsskaf@gmail.com'
const USER = { id: '22222222-2222-4222-8222-222222222222', email: 'buyer@example.com' }
const SUB = { plan: 'basic', stripe_subscription_id: 'sub_123', video_credits: 1, email: 'buyer@example.com', stripe_customer_id: 'cus_1' }
const REL = (s, v) => ({ ...s, lib: s.lib.replace(/RECARGA_ASSINANTE_1111_RELEASE: RecargaAssinanteRelease = '(off|internal|public)'/, `RECARGA_ASSINANTE_1111_RELEASE: RecargaAssinanteRelease = '${v}'`) })

function fakeDb(profile, calls, { profileErr = false } = {}) {
  return {
    from(table) {
      calls.dbReads.push(table)
      const b = {
        select() { return b },
        eq() { return b },
        maybeSingle() { return Promise.resolve(profileErr ? { data: null, error: { message: 'down' } } : { data: profile ?? null, error: null }) },
      }
      return b
    },
  }
}
const NextResponse = {
  redirect: (u, status) => ({ kind: 'redirect', location: String(u), status: status ?? 307 }),
  json: (body, init) => ({ kind: 'json', body, status: init?.status ?? 200 }),
}
function baseStubs(S, user, profile, calls, opts) {
  return {
    'next/server': { NextResponse },
    stripe: function Stripe() {},
    '@supabase/supabase-js': { createClient: () => fakeDb(profile, calls, opts) },
    '@/lib/supabase/server': { createClient: () => { calls.auth++; return { auth: { getUser: async () => ({ data: { user: user ?? null }, error: null }) } } } },
    '@/lib/stripe': { stripe: { checkout: { sessions: { create: async (params, o) => { calls.stripe.push({ params, opts: o }); return { id: 'cs_test_rec', url: 'https://checkout.stripe.test/cs_test_rec' } } } } } },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.serverEvents.push(e); return true } },
    '@/lib/recreate/access': { releaseVisible: (email, release) => release === 'public' || (release === 'internal' && [HOUSE].includes(String(email ?? '').toLowerCase())) },
  }
}
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' }

async function runCheckout(S, { user = USER, profile = SUB, url = 'https://www.usekineo.com/api/stripe/checkout?pack=recarga_assinante_1111&back=%2Fstudio%3Fprompt%3Dmy%2520idea%26autoanalyze%3D1' } = {}) {
  const calls = { stripe: [], checkoutEvents: [], serverEvents: [], dbReads: [], auth: 0 }
  const load = loader(S, baseStubs(S, user, profile, calls), ENV)
  const C = load(FILES.checkout)
  const u = new URL(url)
  const req = { url, nextUrl: u, headers: { get: () => null } }
  const deps = {
    recordCheckoutEvent: async (name, userId, metadata) => { calls.checkoutEvents.push({ name, userId, metadata }) },
    browserSessionIdFrom: () => undefined,
    checkoutFailureReason: (m) => m,
    oneTimeIdempotencyKey: (parts) => 'idem:' + JSON.stringify(parts),
  }
  const res = await C.buildRecargaAssinanteAndRedirect(req, deps)
  return { res, calls }
}
async function runRoute(S, { user = USER, profile = SUB, url = 'https://www.usekineo.com/api/billing/recarga-assinante?surface=studio_cockpit_short' } = {}) {
  const calls = { stripe: [], checkoutEvents: [], serverEvents: [], dbReads: [], auth: 0 }
  const load = loader(S, baseStubs(S, user, profile, calls), ENV)
  const R = load(FILES.route)
  const u = new URL(url)
  const res = await R.GET({ url, nextUrl: u, headers: { get: () => null } })
  return { res, calls }
}
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/ KINEO[^\n]*/g, '')

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  const load = loader(S)
  const L = load(FILES.lib)
  const CP = load(FILES.cp)
  const SL = load(FILES.slider)

  // ── A. fonte única, escada e margem em TODOS os degraus ──
  t(SL.RECARGA_ASSINANTE_1111.usdMinor === 900 && SL.RECARGA_ASSINANTE_1111.credits === 60, 'A1 fonte única: o botão = 900 centavos e 60 créditos')
  t(SL.usdWholeLabel(SL.RECARGA_ASSINANTE_1111.usdMinor) === '$9', 'A2 rótulo do preço vem da fonte ($9)')
  t(SL.CREDIT_SLIDER_MIN === SL.RECARGA_ASSINANTE_1111.credits && SL.sliderPriceUsdMinor(SL.CREDIT_SLIDER_MIN) === SL.RECARGA_ASSINANTE_1111.usdMinor, 'A3 o 1º degrau da barra é EXATAMENTE o botão (60 = US$ 9)')
  const tabela = { 60: 900, 350: 5200, 2000: 27000, 3700: 50000 }
  t(Object.entries(tabela).every(([c, v]) => SL.sliderPriceUsdMinor(Number(c)) === v) && SL.sliderPriceUsdMinor(700) >= 10000 && SL.sliderPriceUsdMinor(700) <= 10200, 'A4 conferência do fundador: 60 → 9 · 350 → 52 · 700 → 100–102 · 2.000 → 270 · 3.700 → 500')
  t(SL.CREDIT_SLIDER_MAX === 3700 && SL.CREDIT_SLIDER_STEP === 10 && [50, 55, 3710, 0, null, '1e3', 65].every((x) => SL.sliderPriceUsdMinor(x) === null), 'A5 faixa 60–3.700 de 10 em 10; fora disso não há preço')
  const degraus = []
  for (let c = SL.CREDIT_SLIDER_MIN; c <= SL.CREDIT_SLIDER_MAX; c += SL.CREDIT_SLIDER_STEP) degraus.push(c)
  t(degraus.every((c) => SL.sliderPriceUsdMinor(c) % 100 === 0), 'A6 todo preço em dólar inteiro (sem o ",90")')
  t(degraus.every((c, i) => i === 0 || SL.sliderPriceUsdMinor(c) >= SL.sliderPriceUsdMinor(degraus[i - 1])), 'A7 mais créditos nunca custam menos')
  const tiers = Object.keys(CP.TIER_PRICES)
  const cheapest = Math.min(...tiers.map((k) => CP.TIER_PRICES[k].usd / CP.TIER_CREDITS[k])) / 100
  const pior = Math.min(...degraus.map((c) => SL.sliderPriceUsdMinor(c) / 100 / c))
  t(pior > cheapest, `A8 nenhum degrau abaixo do crédito mais barato dos planos (pior ${pior.toFixed(4)} > plano ${cheapest.toFixed(4)})`)
  const margem = degraus.map((c) => SL.netAfterStripeIntlCardUsd(SL.sliderPriceUsdMinor(c) / 100) - Math.max(CP.worstCaseCogsUsd(c), c * CP.WORST_CASE_USD_PER_CREDIT))
  t(margem.every((m) => m > 0), `A9 líquido com cartão internacional acima do pior custo em todos os ${degraus.length} degraus (menor sobra $${Math.min(...margem).toFixed(2)})`)
  t(CP.recargaAssinanteMinFilmCredits() === 9, 'A10 filme mais barato = Seedance 1.5 de 15 s (9 créditos)')
  t(!/RECARGA_ASSINANTE_1111|creditSlider/.test(S.cp.replace(/\/\/.*$/gm, '')), 'A11 lib/checkoutPricing.ts não ganha import novo (dezenas de guardiões o carregam com lista fixa)')

  // ── B. elegibilidade ──
  const E = (row) => L.recargaAssinanteEligible(row, 9)
  t(E(SUB) === true, 'B1 Creator com assinatura e 1 crédito: elegível')
  t(E({ ...SUB, plan: 'starter' }) && E({ ...SUB, plan: 'pro' }) && E({ ...SUB, plan: 'studio' }), 'B2 Starter, Studio (pro/studio) também')
  t(E({ ...SUB, plan: 'basic_trial' }) === false && E({ ...SUB, plan: 'creator_trial' }) === false, 'B3 cortesia/teste (_trial) não compra')
  t(E({ ...SUB, plan: 'free' }) === false && E({ ...SUB, plan: null }) === false && E({ ...SUB, plan: 'autopilot' }) === false && E({ ...SUB, plan: 'business' }) === false, 'B4 sem plano pago da escada: não')
  t(E({ ...SUB, stripe_subscription_id: null }) === false && E({ ...SUB, stripe_subscription_id: '  ' }) === false, 'B5 sem assinatura da Stripe: não')
  t(E({ ...SUB, video_credits: 9 }) === false && E({ ...SUB, video_credits: 50 }) === false, 'B6 saldo que paga o filme mais barato: não')
  t(E({ ...SUB, video_credits: 8 }) === true && E({ ...SUB, video_credits: 0 }) === true, 'B7 saldo 0–8: elegível')
  t(E({ ...SUB, video_credits: null }) === false && E({ ...SUB, video_credits: '1' }) === false && E(null) === false, 'B8 leitura nula/estranha: não')
  const SUBR = (row) => L.recargaAssinanteSubscriber(row)
  t(SUBR({ ...SUB, video_credits: 900 }) === true && SUBR({ ...SUB, plan: 'basic_trial' }) === false && SUBR({ ...SUB, stripe_subscription_id: null }) === false && SUBR({ ...SUB, plan: 'free' }) === false, 'B9 barra: assinante pago (mesmo com saldo) sim; cortesia, sem assinatura e grátis não')

  // ── C. interruptor e modos ──
  t(/RECARGA_ASSINANTE_1111_RELEASE: RecargaAssinanteRelease = 'public'/.test(S.lib), "C1 aberta ao público (KINEO-RECARGA-ASSINANTE-PUBLICA-1111, depois da prova em tela)")
  const INT = REL(S, 'internal')
  t(L.recargaAssinanteMode({ release: 'off', house: true, eligible: true }) === 'hide', "C2 'off' esconde de todos, a casa incluída")
  t(L.recargaAssinanteMode({ release: 'internal', house: false, eligible: true }) === 'hide', "C3 'internal': cliente elegível não vê")
  t(L.recargaAssinanteMode({ release: 'internal', house: true, eligible: false }) === 'qa', "C4 'internal': a casa vê em conferência")
  t(L.recargaAssinanteMode({ release: 'public', house: false, eligible: true }) === 'real', "C5 'public': elegível vê")
  t(L.recargaAssinanteCheckoutAllowed('internal', true) === false && L.recargaAssinanteCheckoutAllowed('public', false) === false && L.recargaAssinanteCheckoutAllowed('public', true) === true, 'C6 só public + elegível compra')

  // ── volta saneada ──
  t(L.recargaAssinanteBack('/studio/create?studio=1&autoanalyze=1&prompt=hello&engine=seedance') === '/studio/create?prompt=hello&engine=seedance', 'C7 volta sem autoanalyze/studio (nada gera sozinho), ideia mantida')
  t(L.recargaAssinanteBack('https://evil.example/x') === '/studio' && L.recargaAssinanteBack('//evil.example') === '/studio' && L.recargaAssinanteBack('/pricing') === '/studio', 'C8 volta só para as telas que geram do próprio site')
  t(['https://evil.example/studio', '//evil.example/studio', '/\\evil.example/studio', 'javascript:alert(1)'].every((r) => { const o = L.recargaAssinanteBack(r); return o.startsWith('/') && !o.startsWith('//') && !o.includes('evil') }), 'C10 a volta é sempre caminho relativo do próprio site (nunca outra origem)')
  t(L.recargaAssinanteBack('/studio', 'my idea').includes('prompt=my+idea'), 'C9 a ideia da caixa volta como ?prompt=')

  // ── D. checkout executado ──
  const P = REL(S, 'public')
  {
    const { res, calls } = await runCheckout(P)
    const s0 = calls.stripe[0]?.params
    t(calls.stripe.length === 1 && res.location.includes('checkout.stripe.test'), 'D1 elegível em public: UMA sessão e redirect para a Stripe')
    t(s0?.mode === 'payment' && s0?.line_items?.[0]?.price_data?.currency === 'usd' && s0?.line_items?.[0]?.price_data?.unit_amount === 900, 'D2 pagamento único USD 900')
    t(s0?.metadata?.pack === 'recarga_assinante_1111' && s0?.metadata?.pack_credits === '60' && s0?.metadata?.supabase_user_id === USER.id, 'D3 metadata.pack, 60 créditos da fonte e o dono')
    t(typeof s0?.expires_at === 'number' && s0.expires_at - Math.floor(Date.now() / 1000) <= 30 * 60 && s0.expires_at - Math.floor(Date.now() / 1000) >= 29 * 60, 'D4 sessão vence em 30 min')
    t(s0?.success_url?.includes('/studio?prompt=my+idea&recarga=paid&session_id={CHECKOUT_SESSION_ID}') && !s0?.success_url?.includes('autoanalyze'), 'D5 volta para onde estava, com a ideia, sem autoanalyze')
    t(calls.serverEvents.some((e) => e.name === 'recarga_assinante_checkout_started' && e.userId === USER.id), 'D6 evento de servidor do checkout aberto')
  }
  for (const [label, profile] of [['não assinante', { ...SUB, plan: 'free', stripe_subscription_id: null }], ['cortesia (basic_trial)', { ...SUB, plan: 'basic_trial' }]]) { // KINEO-ASSINANTE-COMPRA-SEMPRE-1211: 'saldo que paga' saiu da lista de recusa (dono 12/11: qualquer saldo)
    const { res, calls } = await runCheckout(P, { profile })
    t(calls.stripe.length === 0 && res.kind === 'redirect' && !res.location.includes('stripe'), `D7 ${label}: recusa sem sessão da Stripe`)
  }
  {
    const { res, calls } = await runCheckout(INT)
    t(calls.stripe.length === 0 && calls.auth === 0 && calls.dbReads.length === 0 && res.kind === 'redirect', "D8 'internal' com a URL na mão: ninguém compra, nem login nem leitura")
    const off = await runCheckout(REL(S, 'off'))
    t(off.calls.stripe.length === 0 && off.calls.auth === 0 && off.calls.dbReads.length === 0, "D9 'off': nada acontece")
  }
  {
    const u = (q) => `https://www.usekineo.com/api/stripe/checkout?pack=recarga_assinante_1111&${q}&back=%2Fstudio`
    const rich = { ...SUB, video_credits: 500 }
    const ok350 = await runCheckout(P, { profile: rich, url: u('credits=350') })
    const s350 = ok350.calls.stripe[0]?.params
    t(ok350.calls.stripe.length === 1 && s350?.line_items?.[0]?.price_data?.unit_amount === 5200 && s350?.metadata?.pack_credits === '350' && s350?.metadata?.recarga_kind === 'slider', 'D11 barra: assinante com saldo compra 350 por US$ 52 (preço recalculado no servidor)')
    const bad = await runCheckout(P, { profile: rich, url: u('credits=355') })
    const over = await runCheckout(P, { profile: rich, url: u('credits=3710') })
    t(bad.calls.stripe.length === 0 && over.calls.stripe.length === 0 && bad.res.location.includes('checkout_error'), 'D12 barra: quantidade fora do passo ou do teto não abre sessão (erro visível)')
    const nonSub = await runCheckout(P, { profile: { ...SUB, plan: 'free', stripe_subscription_id: null }, url: u('credits=350') })
    const trial = await runCheckout(P, { profile: { ...SUB, plan: 'pro_trial' }, url: u('credits=350') })
    t(nonSub.calls.stripe.length === 0 && trial.calls.stripe.length === 0, 'D13 barra: não assinante e cortesia não compram')
    const max = await runCheckout(P, { profile: rich, url: u('credits=3700') })
    t(max.calls.stripe[0]?.params?.line_items?.[0]?.price_data?.unit_amount === 50000, 'D14 barra: o teto 3.700 = US$ 500')
    const btnRich = await runCheckout(P, { profile: rich, url: 'https://www.usekineo.com/api/stripe/checkout?pack=recarga_assinante_1111&back=%2Fstudio' })
    t(btnRich.calls.stripe.length === 1 && btnRich.calls.stripe[0]?.params?.line_items?.[0]?.price_data?.unit_amount === 900, 'D15 botão (sem quantidade) com saldo que paga: abre o checkout de 60 por US$ 9 (KINEO-ASSINANTE-COMPRA-SEMPRE-1211)')
    for (const saldo of [0, 1, 3, 200]) { const r = await runCheckout(P, { profile: { ...SUB, video_credits: saldo } }); t(r.calls.stripe.length === 1, `D16 assinante com saldo ${saldo} compra o botão`) } // KINEO-ASSINANTE-COMPRA-SEMPRE-1211
  }
  {
    const { res, calls } = await runCheckout(P, { url: 'https://www.usekineo.com/api/stripe/checkout?pack=recarga_assinante_1111&currency=brl&back=https%3A%2F%2Fevil.example' })
    t(calls.stripe[0]?.params?.line_items?.[0]?.price_data?.currency === 'usd' && calls.stripe[0]?.params?.cancel_url === 'https://www.usekineo.com/studio', 'D10 ?currency não muda a moeda; volta externa vira /studio')
    void res
  }

  // ── E. webhook (lido) ──
  const W = S.webhook
  const iOneTime = W.indexOf('if (isOneTimeItemSession(session))')
  const iPathA = W.indexOf("if (session.mode === 'payment') {", iOneTime)
  const iDetect = W.indexOf('const isRecargaAssinante = packMeta === RECARGA_ASSINANTE_SKU')
  const iGrant = W.indexOf('creditsToAdd = normalizeSliderCredits(metaCredits) ?? RECARGA_ASSINANTE_1111.credits')
  const iLegacy = W.indexOf('if (creditsToAdd === 0) {', iDetect)
  const iGuard = W.indexOf(".insert({ id: checkoutFulfillmentGuard })", iDetect)
  const iUpdate = W.indexOf('const profileUpdate: Record<string, unknown> = { video_credits: next, has_paid: true }', iDetect)
  const iPaid = W.indexOf('if (isRecargaAssinante) await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.paid')
  t(iOneTime > 0 && iPathA > iOneTime && iDetect > iPathA, 'E1 one_time_ad (900) sai pelo isOneTimeItemSession ANTES do Path A')
  t(iDetect > 0 && iGrant > iDetect && iLegacy > iGrant, 'E2 SKU por metadata.pack exata; créditos = degrau válido da escada (senão o botão) ANTES do fallback por valor')
  t(!/amount === 900[^\n]*RECARGA|RECARGA[^\n]*amount === 900/.test(W) && !/isRecargaAssinante\s*=[^\n]*amount/.test(W), 'E3 nenhum reconhecimento da recarga pelo valor')
  t(iGuard > iGrant && iUpdate > iGuard, 'E4 guard por sessão gravado ANTES do UPDATE do saldo (replay não concede de novo)')
  t(iPaid > iUpdate, 'E5 evento de pago DEPOIS da concessão')
  t(W.indexOf('checkoutPaymentIsSettled(session.payment_status)') > 0 && W.indexOf('checkoutPaymentIsSettled(session.payment_status)') < iOneTime, 'E6 nada é concedido antes de o pagamento estar liquidado')
  t(/if \(packParam === RECARGA_ASSINANTE_SKU\) return await buildRecargaAssinanteAndRedirect/.test(S.checkoutRoute) && S.checkoutRoute.indexOf('packParam === RECARGA_ASSINANTE_SKU') < S.checkoutRoute.indexOf('    if (packParam) {'), 'E7 checkout: o SKU entra antes de todo fallback de ?pack=')

  // ── F. rota da oferta executada ──
  {
    const pub = await runRoute(P)
    t(pub.res.kind === 'json' && pub.res.body.show === true && pub.res.body.qa === false && pub.res.body.price === '$9' && pub.res.body.credits === 60, 'F1 public + elegível: oferta com preço e créditos da fonte')
    t(pub.calls.serverEvents.some((e) => e.name === 'recarga_assinante_shown'), 'F2 evento de servidor "mostrada"')
    const nonSub = await runRoute(P, { profile: { ...SUB, plan: 'free', stripe_subscription_id: null } })
    t(nonSub.res.body.show === false && nonSub.calls.serverEvents.length === 0, 'F3 não assinante não vê')
    const rich = await runRoute(P, { profile: { ...SUB, video_credits: 40 } })
    t(rich.res.body.show === true && rich.res.body.button === true, 'F4 assinante com saldo que paga TAMBÉM vê o botão de 60 (KINEO-ASSINANTE-COMPRA-SEMPRE-1211, dono 12/11: qualquer saldo)')
    t(pub.res.body.button === true, 'F4b assinante que zerou vê o botão')
    const richGo = await runRoute(P, { profile: { ...SUB, video_credits: 40 }, url: 'https://www.usekineo.com/api/billing/recarga-assinante?go=1&surface=x&back=%2Fstudio' })
    t(richGo.res.location.includes('/api/stripe/checkout?pack='), 'F4c clique no botão por quem tem saldo: vai ao checkout (KINEO-ASSINANTE-COMPRA-SEMPRE-1211)')
    const slGo = await runRoute(P, { profile: { ...SUB, video_credits: 40 }, url: 'https://www.usekineo.com/api/billing/recarga-assinante?go=1&surface=x&credits=700&back=%2Fstudio' })
    t(slGo.res.location.includes('pack=recarga_assinante_1111') && slGo.res.location.includes('credits=700'), 'F4d clique na barra leva a quantidade ao checkout do SKU')
    const slBad = await runRoute(P, { profile: { ...SUB, video_credits: 40 }, url: 'https://www.usekineo.com/api/billing/recarga-assinante?go=1&surface=x&credits=12345&back=%2Fstudio' })
    t(!slBad.res.location.includes('checkout'), 'F4e quantidade inválida volta, nunca outro pacote')
    const intCustomer = await runRoute(INT)
    t(intCustomer.res.body.show === false, "F5 'internal': cliente elegível não vê")
    const intHouse = await runRoute(INT, { user: { id: USER.id, email: HOUSE }, profile: { ...SUB, video_credits: 500 } })
    t(intHouse.res.body.show === true && intHouse.res.body.qa === true, "F6 'internal': a casa vê marcada como conferência")
    const qaGo = await runRoute(INT, { user: { id: USER.id, email: HOUSE }, url: 'https://www.usekineo.com/api/billing/recarga-assinante?go=1&surface=x&back=%2Fstudio' })
    t(qaGo.res.kind === 'redirect' && qaGo.res.location.includes('/studio?recarga=qa') && !qaGo.res.location.includes('/api/stripe/checkout'), 'F7 clique da conferência volta sem ir ao checkout')
    const realGo = await runRoute(P, { url: 'https://www.usekineo.com/api/billing/recarga-assinante?go=1&surface=x&back=%2Fstudio%3Fprompt%3Dhi' })
    t(realGo.res.location.includes('/api/stripe/checkout?pack=recarga_assinante_1111') && realGo.calls.serverEvents.some((e) => e.name === 'recarga_assinante_clicked'), 'F8 clique real: evento de clique e checkout do SKU')
    const off = await runRoute(REL(S, 'off'), { user: { id: USER.id, email: HOUSE } })
    t(off.res.body.show === false && off.calls.auth === 0 && off.calls.dbReads.length === 0 && off.calls.serverEvents.length === 0, "F9 'off': nenhuma leitura, nenhum evento")
  }

  // ── G. aviso e modal ──
  const N = strip(S.nudge)
  t(/if \(RECARGA_ASSINANTE_1111_RELEASE === 'off'\) return/.test(S.nudge), "G1 aviso: em 'off' não lê a oferta")
  t(/data-kineo="recarga-assinante-cta"[^\n]*style=\{\{ \.\.\.primary/.test(S.nudge), 'G2 recarga = botão principal')
  t(/data-kineo="subscriber-upgrade-switch"[^\n]*style=\{recarga \? secondary : primary\}/.test(S.nudge), 'G3 troca de plano vira secundário quando há recarga')
  t(!/\$\s?9\b|\b60 credits\b|\b900\b/.test(N.replace(/fontWeight: 900/g, '')), 'G4 nenhum preço/crédito digitado no aviso')
  t(/recarga !== null/.test(S.nudge.split('const mostrar =')[1]?.split('\n')[0] ?? '') && /if \(!mostrar\) return null/.test(S.nudge), 'G5 o Studio (sem degrau) vê a recarga')
  t(!/location\.(href|assign|replace)/.test(S.nudge) && /<a href=\{recargaHref \?\? recarga\.go\}/.test(S.nudge), 'G5e o botão é um link (o aviso nunca navega sozinho)')
  t(/\{recarga\.button && \(/.test(S.nudge) && /data-kineo="recarga-assinante-more"/.test(S.nudge) && /RECARGA_ASSINANTE_COPY\.more/.test(S.nudge), 'G5b botão de 60 só para quem zerou; "Need more? Choose your amount" abre a barra')
  t(/if \(TOPUPS_LIVE \|\| props\.recarga\) return <CreditsTopupModalVenda/.test(S.modal) && /window\.location\.href = `\$\{recarga\.go\}&credits=\$\{amount\}&back=/.test(S.modal), 'G5c a barra é o MESMO pop-up, e com a recarga manda só a quantidade à rota da recarga')
  t(/const priceMinor = sliderPriceUsdMinor\(amount\)/.test(S.modal) && !/\$\d/.test(S.modal.replace(/\$\{/g, '')), 'G5d o pop-up mostra o preço da função que cobra; nenhum preço digitado')
  t(!/never expire|don't expire|do not expire/i.test(S.lib + S.nudge), 'G6 nenhum "créditos não expiram" (a renovação apaga comprado abaixo de uma cota)')
  // G7 — o GenerateClient fica IGUAL à main: guardiões antigos exigem o hash exato dele (camadas de desfazer). A frase errada
  // do modal ("the first highlighted option below…") é conserto de tela, com camada própria, para quem cuida da tela.
  t(!/KINEO-RECARGA-ASSINANTE-1111/.test(S.generate), 'G7 o GenerateClient não é tocado por esta entrega (os guardiões antigos dependem do hash dele)')
  t(/idea=\{prompt\}/.test(S.studio), 'G8 cockpit do Studio passa a ideia da caixa')

  // ── H. eventos de servidor ──
  for (const e of ['recarga_assinante_shown', 'recarga_assinante_clicked', 'recarga_assinante_checkout_started', 'recarga_assinante_paid']) {
    t(S.events.includes(`'${e}'`) && S.events.indexOf(`'${e}'`) > S.events.indexOf('const SERVER_ONLY_EVENTS = new Set(['), `H ${e} em SERVER_ONLY_EVENTS`)
  }
  return out
}

const base = await suite(SRC)
for (const [c, m] of base) ok(c, m)

// ── I. mutantes: cada um tem de derrubar pelo menos uma verificação ──
const MUTANTS = [
  ['elegibilidade aceita _trial', 'lib', "if (!RECARGA_ASSINANTE_PLANS.includes(plan)) return false", "if (!RECARGA_ASSINANTE_PLANS.includes(plan.replace(/_trial$/, ''))) return false"],
  ['elegibilidade sem assinatura', 'lib', "if (typeof row.stripe_subscription_id !== 'string' || !row.stripe_subscription_id.trim()) return false", ''],
  ['saldo <= em vez de <', 'lib', 'return balance < minFilmCredits', 'return balance <= minFilmCredits'],
  ['saldo ignorado', 'lib', 'return balance < minFilmCredits', 'return true'],
  ["'internal' vende", 'lib', "return release === 'public' && eligible === true\n}", "return release !== 'off' && eligible === true\n}"],
  ['conta de fora em conferência', 'lib', "if (a.house === true) return 'qa'", "if (a.house === true || a.eligible) return 'qa'"],
  ['volta mantém autoanalyze', 'lib', "const BACK_DROP = ['autoanalyze', ", "const BACK_DROP = ["],
  ['volta aceita qualquer página', 'lib', 'if (!okPath) return withIdea(fallback, idea)', ''],
  ['botão mais barato que o Studio', 'slider', 'export const RECARGA_ASSINANTE_1111 = { usdMinor: 900, credits: 60 } as const', 'export const RECARGA_ASSINANTE_1111 = { usdMinor: 700, credits: 60 } as const'],
  ['piso da escada abaixo do plano', 'slider', 'const RATE_FLOOR = 0.135', 'const RATE_FLOOR = 0.12'],
  ['escada com ,90', 'slider', '  return dollars * 100\n', '  return dollars * 100 - 10\n'],
  ['teto antigo', 'slider', 'export const CREDIT_SLIDER_MAX = 3700', 'export const CREDIT_SLIDER_MAX = 2000'],
  ['barra aceita fora do passo', 'slider', '  if (n % CREDIT_SLIDER_STEP !== 0) return null\n', ''],
  ['barra sem exigir assinatura', 'checkout', 'const eligible = recargaAssinanteSubscriber(profile)', 'const eligible = true'],
  ['checkout: botão volta a exigir zerado', 'checkout', 'const eligible = recargaAssinanteSubscriber(profile)', "const eligible = kind === 'button' ? false : recargaAssinanteSubscriber(profile)"],
  ['barra com preço digitado', 'checkout', "const unitAmount = kind === 'button' ? RECARGA_ASSINANTE_1111.usdMinor : sliderPriceUsdMinor(credits)", "const unitAmount = kind === 'button' ? RECARGA_ASSINANTE_1111.usdMinor : (credits ?? 0) * 15"],
  ['rota: botão volta a exigir zerado', 'route', 'const button = qa || subscriber', 'const button = qa || zeroed'],
  ['aviso: botão sempre', 'nudge', '{recarga.button && (', '{(\n'],
  ['checkout sem trava do interruptor', 'checkout', "if (RECARGA_ASSINANTE_1111_RELEASE !== 'public') return refused()", ''],
  ['checkout sem elegibilidade', 'checkout', 'if (!recargaAssinanteCheckoutAllowed(RECARGA_ASSINANTE_1111_RELEASE, eligible)) return refused()', ''],
  ['checkout em moeda local', 'checkout', "price_data: { currency: 'usd',", "price_data: { currency: (req.nextUrl.searchParams.get('currency') ?? 'usd') as 'usd',"],
  ['checkout sem validade', 'checkout', 'expires_at: Math.floor(Date.now() / 1000) + RECARGA_ASSINANTE_SESSION_TTL_SECONDS,', ''],
  ['checkout créditos digitados', 'checkout', 'pack_credits: String(credits),', "pack_credits: '61',"],
  ['webhook pelo valor', 'webhook', 'const isRecargaAssinante = packMeta === RECARGA_ASSINANTE_SKU', 'const isRecargaAssinante = amount === 900'],
  ['webhook concede a metadata crua', 'webhook', 'creditsToAdd = normalizeSliderCredits(metaCredits) ?? RECARGA_ASSINANTE_1111.credits // KINEO', 'creditsToAdd = metaCredits // KINEO'],
  ['webhook evento antes da concessão', 'webhook', 'if (isRecargaAssinante) await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.paid', 'if (false) await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.paid'],
  ['rota mostra a não assinante', 'route', 'const subscriber = recargaAssinanteSubscriber(p)', 'const subscriber = true'],
  ['rota lê em off', 'route', "if (RECARGA_ASSINANTE_1111_RELEASE === 'off') return go ? goBack() : HIDE()", ''],
  ['conferência vai ao checkout', 'route', "if (qa) return NextResponse.redirect(new URL(recargaAssinanteWithParam(back, 'recarga', 'qa'), req.url), 303)", ''],
  ['aviso lê em off', 'nudge', "if (RECARGA_ASSINANTE_1111_RELEASE === 'off') return\n    let alive = true\n    void fetch(", "let alive = true\n    void fetch("],
  ['aviso: troca continua principal', 'nudge', 'style={recarga ? secondary : primary}', 'style={primary}'],
  ['aviso: preço digitado', 'nudge', '{recargaAssinanteFill(RECARGA_ASSINANTE_COPY.cta, { price: recarga.price, credits: recarga.credits })}', 'Add 60 credits — $9'],
  ['texto promete não expirar', 'lib', "terms: 'One-time payment. Your plan stays the same.',", "terms: 'One-time payment. Credits never expire.',"],
  ['evento cunhável pelo navegador', 'events', "  'recarga_assinante_paid',\n", ''],
]
for (const [name, key, from, to] of MUTANTS) {
  const src = norm(SRC[key])
  if (!src.includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  const M = { ...SRC, [key]: src.replace(from, to) }
  let caught = false
  try { const r = await suite(M); caught = r.some(([c]) => !c) } catch { caught = true }
  ok(caught, `mutante "${name}" é pego`)
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
