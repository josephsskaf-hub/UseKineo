// KINEO-REGIAO-FILME-199-1011 [fundador 10/11: "1.99 1 filme!"]
// Guardião offline do filme de 15 s por US$ 1,99 (IN/PK/NG, pagamento único, uma vez por conta). Prova:
//   A. preço 199 e créditos DERIVADOS (creditCostForDuration Seedance 1.5 a 15 s = 9), fonte única, margem com cartão
//      internacional (invariante (9)) e nenhuma colisão de valor;
//   B. elegibilidade, cada condição com o seu caso (e mutante): região, país do PERFIL (IN/PK/NG), has_paid === false,
//      plano grátis, nenhuma compra anterior; país fora dos 3 não vê; conta que já pagou não vê;
//   C. interruptor: nasce 'internal'; 'off' = idêntico à main; 'internal' = só a casa, em conferência, e ninguém compra;
//   D. checkout EXECUTADO com banco e Stripe falsos: recusa inelegível (mesmo com a URL na mão) sem abrir sessão; elegível
//      abre UMA sessão em USD 199 com metadata.pack e os créditos da fonte; ?currency/IP não mudam a moeda;
//   E. webhook (Path A, lido): créditos da fonte única, guard por sessão ANTES da concessão, sem fallback por valor, evento
//      de pagamento DEPOIS da concessão, reentrega do mesmo evento não retoma a concessão;
//   F. a faixa: nenhum preço digitado, Starter vira secundário, conferência marcada, oferta só no /pricing;
//   G. eventos de servidor (SERVER_ONLY_EVENTS) com user_id;
//   H. mutantes: cada regra quebrada derruba pelo menos uma verificação.
//   I. KINEO-REGIAO-FILME-199-TRAVA-1111 — o bloqueador da revisão de 11/11: perfil editado pelo navegador (carimbo de região,
//      país, has_paid baixado, plano baixado) NÃO abre a compra sem a PROVA DE SERVIDOR (trial_region_excluded com país
//      IN/PK/NG e nenhum payment_success/region_film_199_paid na história).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const norm = (s) => s.replace(/\r\n/g, '\n')
const read = (rel) => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const main = (rel) => { try { return norm(execSync(`git show origin/main:${rel}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const FILES = {
  lib: 'lib/growth/regiaoFilme199.ts',
  cp: 'lib/checkoutPricing.ts',
  checkout: 'lib/stripe/regiaoFilme199Checkout.ts',
  checkoutRoute: 'app/api/stripe/checkout/route.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  route: 'app/api/scene-preview/pricing-strip/route.ts',
  strip: 'components/PreviewPricingStrip.tsx',
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
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, process: { env: { NODE_ENV: 'test', ...env } }, console: { warn: () => {}, log: () => {}, error: () => {} }, Math, Date, Number, String, Array, Object, Set, Map, Intl, JSON, URL, Promise, Error, encodeURIComponent, RegExp }, { filename: file })
    cache.set(file, mod.exports)
    return mod.exports
  }
  return load
}

// ── o checkout EXECUTADO com banco, sessão e Stripe falsos ─────────────────────────────────────────────────────────
async function runCheckout(S, { user, profile, profileErr = false, events = PROVA_EVENTS, eventsErr = false, url = 'https://www.usekineo.com/api/stripe/checkout?pack=region_film_199&intent_campaign=region_film_199', headers = {} }) {
  const calls = { stripe: [], checkoutEvents: [], serverEvents: [], dbReads: 0 }
  const NextResponse = {
    redirect: (u, status) => ({ kind: 'redirect', location: String(u), status: status ?? 307 }),
    json: (body, init) => ({ kind: 'json', body, status: init?.status ?? 200 }),
  }
  const db = {
    from(table) {
      const filters = []
      const b = {
        select() { return b },
        eq(k, v) { filters.push([k, (x) => x === v]); return b },
        in(k, arr) { filters.push([k, (x) => arr.includes(x)]); return b },
        order() { return b },
        limit(n) {
          calls.dbReads++
          if (table !== 'events') return Promise.resolve({ data: [], error: null })
          if (eventsErr) return Promise.resolve({ data: null, error: { message: 'down' } })
          return Promise.resolve({ data: events.filter((e) => filters.every(([k, f]) => f(e[k]))).slice(0, n), error: null })
        },
        maybeSingle() { calls.dbReads++; return Promise.resolve(profileErr ? { data: null, error: { message: 'down' } } : { data: profile ?? null, error: null }) },
      }
      return b
    },
  }
  const stubs = {
    'next/server': { NextResponse },
    stripe: function Stripe() {},
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: user ?? null }, error: null }) } }) },
    '@/lib/stripe': { stripe: { checkout: { sessions: { create: async (params, opts) => { calls.stripe.push({ params, opts }); return { id: 'cs_test_199', url: 'https://checkout.stripe.test/cs_test_199' } } } } } },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.serverEvents.push(e); return true } },
  }
  const load = loader(S, stubs, { STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' })
  const C = load(FILES.checkout)
  const u = new URL(url)
  const req = { url, nextUrl: u, headers: { get: (k) => headers[k.toLowerCase()] ?? null } }
  const deps = {
    recordCheckoutEvent: async (name, userId, metadata) => { calls.checkoutEvents.push({ name, userId, metadata }) },
    browserSessionIdFrom: () => undefined,
    checkoutFailureReason: (m) => m,
    oneTimeIdempotencyKey: (parts) => 'idem:' + JSON.stringify(parts),
  }
  const res = await C.buildRegiaoFilme199AndRedirect(req, deps)
  return { res, calls }
}

const REGION_IN = { user_id: '11111111-1111-4111-8111-111111111111', name: 'trial_region_excluded', id: 'r1', metadata: { country: 'IN', marked: true } }
const PROVA_EVENTS = [REGION_IN]
const PROVA = { regionCountry: 'IN', everPaid: false }
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'buyer@example.com' }
const BASE = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', signup_country: 'IN', last_country: null, email: 'buyer@example.com', stripe_customer_id: null }
const PUBLIC = (s) => ({ ...s, lib: s.lib.replace("REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'internal'", "REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'public'") })
const OFF = (s) => ({ ...s, lib: s.lib.replace("REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'internal'", "REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'off'") })
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  let L, CP, E
  try {
    const load = loader(S)
    L = load(FILES.lib)
    CP = load(FILES.cp)
    E = load('lib/credits/engineCost.ts')
  } catch (e) { t(false, 'módulos carregam: ' + e.message); return out }

  // A — preço e créditos
  const seedance15 = E.creditCostForDuration('cinematic_ai', true, 15)
  t(CP.REGIAO_FILME_199_PRICE_MINOR && CP.REGIAO_FILME_199_PRICE_MINOR.usd === 199 && Object.keys(CP.REGIAO_FILME_199_PRICE_MINOR).join() === 'usd', 'preço = 199 centavos de dólar, só USD')
  t(seedance15 === 9 && CP.regiaoFilme199Credits() === seedance15, `créditos = creditCostForDuration('cinematic_ai', true, 15) = ${seedance15}`)
  t(/export function regiaoFilme199Credits\(\): number \{\n\s*return creditCostForDuration\(REGIAO_FILME_199_QUALITY, true, REGIAO_FILME_199_SECONDS\)\n\}/.test(S.cp) && /REGIAO_FILME_199_QUALITY = 'cinematic_ai' as const/.test(S.cp) && /REGIAO_FILME_199_SECONDS = 15\n/.test(S.cp), 'créditos derivados (nenhum 9 digitado): Seedance 1.5 a 15 s')
  t(CP.regiaoFilme199PriceLabel() === '$1.99', 'rótulo do preço sai da mesma linha ($1.99)')
  t(Math.abs(CP.netAfterStripeIntlUsd(1.99) - (1.99 * 0.956 - 0.3)) < 1e-9, 'líquido com cartão internacional: 4,4% + US$ 0,30')
  const net = CP.netAfterStripeIntlUsd(1.99), cogs = CP.regiaoFilme199WorstCogsUsd()
  t(cogs >= 9 * CP.WORST_CASE_USD_PER_CREDIT - 1e-9 && cogs >= CP.worstCaseCogsUsd(9) && net - cogs > 0, `margem no pior caso: líquido $${net.toFixed(3)} > custo $${cogs.toFixed(3)}`)
  t(CP.checkPricingInvariants().length === 0, 'invariantes de preço passam (nenhuma exceção silenciosa)')
  t(/\(9\) KINEO-REGIAO-FILME-199-1011/.test(S.cp) && /netAfterStripeIntlUsd\(REGIAO_FILME_199_PRICE_MINOR\.usd \/ 100\)/.test(S.cp), 'invariante (9) próprio do SKU, com a taxa internacional')
  try {
    const low = loader({ ...S, cp: S.cp.replace('REGIAO_FILME_199_PRICE_MINOR: Record<CheckoutCurrency, number> = { usd: 199 }', 'REGIAO_FILME_199_PRICE_MINOR: Record<CheckoutCurrency, number> = { usd: 120 }') })(FILES.cp)
    t(low.checkPricingInvariants().some((x) => /region_film_199 is below cost with an international card/.test(x)), 'invariante (9) acusa de verdade: a US$ 1,20 o SKU reclama (executado)')
  } catch (e) { t(false, 'invariante (9) executa: ' + e.message) }
  t(/claim\(REGIAO_FILME_199_PRICE_MINOR\.usd, 'pack:region_film_199'\)/.test(S.cp), 'o valor 199 é reivindicado no mapa de colisões (6)')

  // B — elegibilidade
  const el = (over, prova = PROVA) => L.regiaoFilme199Eligible({ ...BASE, ...over }, prova)
  t(el({}) === true && el({ signup_country: 'PK' }) && el({ signup_country: 'NG' }) && el({ signup_country: ' in ' }), 'IN/PK/NG elegíveis (país normalizado)')
  t(el({ signup_country: 'BR' }) === false && el({ signup_country: 'US' }) === false && el({ signup_country: 'BD' }) === false, 'país fora dos 3 não vê')
  t(el({ signup_country: null, last_country: 'PK' }) === true && el({ signup_country: 'BR', last_country: 'IN' }) === false && el({ signup_country: null, last_country: null }) === false && el({ signup_country: 'XX', last_country: 'NG' }) === true, 'país do perfil: signup_country, senão last_country (a regra de paisDoPerfil); sem país = não')
  t(el({ trial_status: 'active' }) === false && el({ trial_status: null }) === false, "só 'region_paid_only'")
  t(el({ has_paid: true }) === false && el({ has_paid: null }) === false && el({ has_paid: undefined }) === false, 'has_paid === false COMPROVADO (já pagou ou leitura nula = não vê)')
  t(el({ plan: 'starter' }) === false && el({ plan: 'basic' }) === false && el({ plan: null }) === true && el({ plan: 'FREE' }) === true, 'só plano grátis')
  t(el({}, { regionCountry: 'IN', everPaid: true }) === false && el({}, null) === false, 'compra anterior registrada (ou leitura que falhou) = não vê — uma vez por conta')
  t(L.regiaoFilme199Eligible(null, PROVA) === false, 'sem perfil = não')
  // I — a prova de servidor (o perfil sozinho é editável pelo navegador)
  t(el({}, { regionCountry: null, everPaid: false }) === false, 'I1 perfil com cara de região mas SEM o carimbo do servidor (trial_region_excluded) = não vê')
  t(el({}, { regionCountry: 'BR', everPaid: false }) === false && el({}, { regionCountry: 'US', everPaid: false }) === false, 'I2 carimbo do servidor de país fora dos 3 = não vê (perfil trocado para IN não engana)')
  t(el({}, { regionCountry: 'PK', everPaid: false }) === true && el({}, { regionCountry: 'NG', everPaid: false }) === true, 'I3 carimbo do servidor em IN/PK/NG = vê')
  const pv = L.regiaoFilme199ProvaDe({ metadata: { country: ' pk ' } }, [])
  t(pv?.regionCountry === 'PK' && pv?.everPaid === false && L.regiaoFilme199ProvaDe({ metadata: { country: 'IN' } }, [{ id: 'p' }])?.everPaid === true && L.regiaoFilme199ProvaDe(null, null) === null && L.regiaoFilme199ProvaDe(null, [])?.regionCountry === null, 'I4 a prova lida dos eventos: país normalizado, qualquer pagamento conta, leitura falhou = null')
  t(L.REGIAO_FILME_199_REGION_EVENT === /TRIAL_REGION_EXCLUDED_EVENT = '([^']+)'/.exec(read('lib/freeFilmPolicy.ts'))?.[1] && read('lib/reverseTrial.ts').includes('name: TRIAL_REGION_EXCLUDED_EVENT'), 'I5 o carimbo é o MESMO evento que o servidor grava no cadastro (lib/reverseTrial.ts)')
  t(/'trial_region_excluded',/.test(S.events) && /'payment_success',/.test(S.events), 'I6 os dois eventos da prova são de servidor (o navegador não os cunha)')
  t(L.REGIAO_FILME_199_TRIAL_STATUS === /REGION_PAID_ONLY_TRIAL_STATUS = '([^']+)'/.exec(read('lib/freeFilmPolicy.ts'))?.[1], 'o carimbo de região é o mesmo de lib/freeFilmPolicy.ts')
  const PdP = /export function paisDoPerfil[\s\S]*?\n}\n/.exec(read('lib/lifecycle/regionFirstFilmEmail.ts'))?.[0] ?? ''
  t(/for \(const raw of \[p\?\.signup_country, p\?\.last_country\]\)/.test(PdP) && /for \(const raw of \[p\?\.signup_country, p\?\.last_country\]\)/.test(S.lib) && /c !== 'XX' && c !== 'T1'/.test(S.lib), 'regra de país igual à paisDoPerfil já usada pela casa')

  // C — interruptor e modos
  t(L.REGIAO_FILME_199_RELEASE === 'internal', "nasce 'internal'")
  for (const h of [true, false]) for (const e of [true, false]) t(L.regiaoFilme199Mode({ release: 'off', house: h, eligible: e }) === 'hide', `'off' esconde tudo (casa=${h}, elegível=${e})`)
  t(L.regiaoFilme199Mode({ release: 'internal', house: false, eligible: true }) === 'hide', "'internal': cliente elegível NÃO vê")
  t(L.regiaoFilme199Mode({ release: 'internal', house: true, eligible: false }) === 'qa', "'internal': a casa vê em conferência")
  t(L.regiaoFilme199Mode({ release: 'public', house: false, eligible: true }) === 'real' && L.regiaoFilme199Mode({ release: 'public', house: false, eligible: false }) === 'hide', "'public': só elegível vê")
  for (const r of ['off', 'internal', 'public']) for (const e of [true, false]) t(L.regiaoFilme199Mode({ release: r, house: false, eligible: e }) !== 'qa', `conta de fora nunca é conferência (${r}, ${e})`)
  t(L.regiaoFilme199CheckoutAllowed('public', true) === true && L.regiaoFilme199CheckoutAllowed('internal', true) === false && L.regiaoFilme199CheckoutAllowed('off', true) === false && L.regiaoFilme199CheckoutAllowed('public', false) === false, "compra só com 'public' + elegível")

  // D — checkout executado
  try {
    const intern = await runCheckout(S, { user: USER, profile: BASE })
    t(intern.res.kind === 'redirect' && new URL(intern.res.location).pathname === '/pricing' && intern.calls.stripe.length === 0 && intern.calls.dbReads === 0 && intern.calls.checkoutEvents.length === 0, "'internal': elegível com a URL na mão → /pricing, sem sessão, sem leitura, sem evento")
    const off = await runCheckout(OFF(S), { user: USER, profile: BASE })
    t(off.res.kind === 'redirect' && new URL(off.res.location).pathname === '/pricing' && off.calls.stripe.length === 0, "'off': /pricing, sem sessão")
    const P = PUBLIC(S)
    const good = await runCheckout(P, { user: USER, profile: BASE, url: 'https://www.usekineo.com/api/stripe/checkout?pack=region_film_199&intent_campaign=region_film_199&currency=brl&credits=500&amount=1', headers: { 'x-vercel-ip-country': 'BR', 'accept-language': 'pt-BR' } })
    const sp = good.calls.stripe[0]?.params
    t(good.calls.stripe.length === 1 && good.res.location === 'https://checkout.stripe.test/cs_test_199', 'elegível: UMA sessão da Stripe')
    t(sp && sp.mode === 'payment' && sp.line_items.length === 1 && sp.line_items[0].price_data.currency === 'usd' && sp.line_items[0].price_data.unit_amount === 199 && !sp.line_items[0].price_data.recurring, 'pagamento único em USD 199 (?currency=brl, IP BR e ?amount ignorados)')
    t(sp && sp.metadata.pack === 'region_film_199' && sp.metadata.pack_credits === String(seedance15) && sp.metadata.supabase_user_id === USER.id && sp.client_reference_id === USER.id && sp.metadata.intent_campaign === 'region_film_199', 'metadata: pack, créditos da fonte, dono e campanha')
    t(sp && !('allow_promotion_codes' in sp) && !('discounts' in sp) && !('subscription_data' in sp), 'sem cupom, sem desconto, sem assinatura')
    t(sp && /\/studio\/create\?resume=wall_v1&pack=region_film_199&engine=seedance&duration=15&script_mode=verbatim&session_id=\{CHECKOUT_SESSION_ID\}$/.test(sp.success_url) && /\/pricing\?from=scene_preview$/.test(sp.cancel_url), 'volta: Studio esperando o crédito, no Seedance 15 s, roteiro como está; desistência volta à faixa')
    t(good.calls.stripe[0]?.opts?.idempotencyKey?.startsWith('idem:') && /"sku":"region_film_199"/.test(good.calls.stripe[0].opts.idempotencyKey), 'chave de idempotência por SKU/pessoa/valor')
    t(good.calls.checkoutEvents.map((e) => e.name).join() === 'checkout_attempted,checkout_started' && good.calls.checkoutEvents.every((e) => e.userId === USER.id && e.metadata.sku === 'region_film_199'), 'eventos de checkout de sempre, com user_id e o SKU')
    t(good.calls.serverEvents.length === 1 && good.calls.serverEvents[0].name === 'region_film_199_checkout_started' && good.calls.serverEvents[0].userId === USER.id && good.calls.serverEvents[0].metadata.stripe_session_id === 'cs_test_199', 'evento de servidor: checkout aberto com o SKU')
    const refusals = [
      ['país BR', { profile: { ...BASE, signup_country: 'BR' } }],
      ['já pagou', { profile: { ...BASE, has_paid: true } }],
      ['has_paid nulo', { profile: { ...BASE, has_paid: null } }],
      ['plano Starter', { profile: { ...BASE, plan: 'starter' } }],
      ['não é de região', { profile: { ...BASE, trial_status: 'active' } }],
      ['já comprou este SKU', { profile: BASE, events: [REGION_IN, { user_id: USER.id, name: 'region_film_199_paid', id: 'e1' }] }],
      ['perfil editado, sem carimbo de servidor', { profile: BASE, events: [] }],
      ['carimbo de servidor de outro país', { profile: BASE, events: [{ ...REGION_IN, metadata: { country: 'BR' } }] }],
      ['pagou antes (payment_success), has_paid baixado pelo navegador', { profile: BASE, events: [REGION_IN, { user_id: USER.id, name: 'payment_success', id: 'p1' }] }],
      ['livro de eventos fora do ar', { profile: BASE, eventsErr: true }],
      ['perfil fora do ar', { profile: BASE, profileErr: true }],
    ]
    for (const [nome, o] of refusals) {
      const r = await runCheckout(P, { user: USER, ...o })
      t(r.res.kind === 'redirect' && new URL(r.res.location).pathname === '/pricing' && r.calls.stripe.length === 0 && r.calls.checkoutEvents.length === 0, `checkout recusa (${nome}) → /pricing normal, sem sessão`)
    }
    const anon = await runCheckout(P, { user: null, profile: BASE })
    t(anon.res.kind === 'redirect' && /\/login\?reason=checkout/.test(anon.res.location) && anon.calls.stripe.length === 0, 'sem login → login com retomada, sem sessão')
  } catch (e) { t(false, 'checkout executa: ' + e.message) }
  t(!/x-vercel-ip-country|resolveSettlementCurrency|searchParams\.get\('currency'\)/.test(S.checkout), 'o checkout nunca lê país/moeda do pedido')

  // D2 — ligação na rota de checkout
  const iMine = S.checkoutRoute.indexOf('if (packParam === REGIAO_FILME_199_SKU) return await buildRegiaoFilme199AndRedirect(')
  const iSpec = S.checkoutRoute.indexOf('if (isSpeculativeRequest(req))')
  const iPass = S.checkoutRoute.indexOf("if ((!FILM_PASS_LIVE && packParam === 'starter')")
  t(iMine > iSpec && iSpec > 0 && iMine < iPass && iMine < S.checkoutRoute.indexOf('    if (packParam) {\n'), 'checkout: o SKU é tratado antes de todo fallback de ?pack= (e depois do filtro de pré-carregamento)')
  t(/export const FILM_PASS_LIVE = false as boolean/.test(read('lib/offers/avulsoUnico3110.ts')), 'o passe antigo continua desligado')

  // E — webhook (Path A)
  const W = S.webhook
  const iIs = W.indexOf('const isFilm199 = packMeta === REGIAO_FILME_199_SKU')
  const iGrantSrc = W.indexOf('creditsToAdd = regiaoFilme199Credits()')
  const iZero = W.indexOf('if (creditsToAdd === 0) {', iIs)
  const iGuard = W.indexOf('.insert({ id: checkoutFulfillmentGuard })', iIs)
  const iDup = W.indexOf("} else if (packGuardError.code === '23505') {", iIs)
  const iUpd = W.indexOf('const profileUpdate: Record<string, unknown> = { video_credits: next, has_paid: true }')
  const iElse = W.indexOf('entitlementConfirmed = true', W.indexOf('if (updateErr) {', iUpd))
  const iPaid = W.indexOf('if (isFilm199) await writeServerEvent({ name: REGIAO_FILME_199_EVENTS.paid')
  const iMark = W.indexOf('await markTrialConverted(supabase, userId', iPaid)
  t(iIs > 0 && iGrantSrc > iIs && iGrantSrc < iZero, 'webhook: o SKU concede regiaoFilme199Credits() (fonte única), nunca o número da metadata')
  const zeroBlock = W.slice(iZero, W.indexOf('if (creditsToAdd === 0) {', iZero + 10))
  t(!/REGIAO_FILME_199|=== 199\b/.test(zeroBlock), 'webhook: nenhum fallback por valor para 199 (sessão sem metadata.pack nunca vira este SKU)')
  t(iGuard > iZero && iDup > iGuard && iUpd > iDup, 'webhook: guard checkout_fulfilled:<sessão> gravado ANTES da concessão; 23505 = já concedido, sai sem somar')
  t(/checkoutFulfillmentGuard = `checkout_fulfilled:\$\{session\.id\}`/.test(W) && W.indexOf('const checkoutSettled = checkoutPaymentIsSettled(session.payment_status)') < iIs && /if \(!checkoutSettled\) \{[\s\S]{0,200}break/.test(W), 'webhook: só concede com pagamento LIQUIDADO, uma vez por sessão')
  t(iPaid > iElse && iElse > iUpd && iMark > iPaid, 'webhook: evento de pagamento DEPOIS do UPDATE confirmado (has_paid=true no mesmo UPDATE)')
  const dupLine = W.split('\n').find((l) => l.includes('if (!duplicateSession || (!isOneTimeItemSession(duplicateSession)')) ?? ''
  t(dupLine.length > 0 && !/FILME_199|Film199|region_film/i.test(dupLine), 'webhook: reentrega do MESMO evento não retoma a concessão aditiva (sai como duplicate)')
  t(/\{ name: REGIAO_FILME_199_EVENTS\.paid, userId, path: '\/api\/stripe\/webhook', metadata: \{ stripe_session_id: session\.id, credits: creditsToAdd/.test(W), 'evento de pagamento com user_id, sessão e créditos concedidos')

  // F — a faixa e a rota
  const R = S.route
  const fn = /async function film199ModeFor[\s\S]*?\n}\n/.exec(R)?.[0] ?? ''
  t(/^async function film199ModeFor\(db: AdminDb, userId: string, house: boolean\): Promise<RegiaoFilme199Mode> \{\n  if \(REGIAO_FILME_199_RELEASE === 'off'\) return 'hide'\n/.test(fn), "rota: com 'off' nenhuma leitura a mais (sai antes do banco)")
  t(/\.select\('trial_status, has_paid, plan, signup_country, last_country'\)/.test(fn) && !/headers|x-vercel|paisDoRequest/.test(fn), 'rota: país do PERFIL, nunca do pedido')
  t(/const prova = await lerProvaRegiaoFilme199\(db, userId\)/.test(fn) && /regiaoFilme199Eligible\(row as RegiaoFilme199Profile \| null, prova\)/.test(fn) && /import \{ lerProvaRegiaoFilme199 \} from '@\/lib\/stripe\/regiaoFilme199Checkout'/.test(S.route), 'rota: a MESMA prova de servidor do checkout (carimbo de região + nenhum pagamento); leitura que falha = não elegível')
  t(/const film199Mode: RegiaoFilme199Mode = surface === 'pricing' \? await film199ModeFor\(db, user\.id, house\) : 'hide'/.test(R), 'rota: a oferta só entra na faixa do /pricing')
  t(/price: regiaoFilme199PriceLabel\(\), credits: regiaoFilme199Credits\(\), seconds: REGIAO_FILME_199_SECONDS/.test(R), 'rota: preço/créditos/segundos da fonte única')
  t(/if \(film199\) await writeServerEvent\(\{ name: REGIAO_FILME_199_EVENTS\.shown, userId: user\.id/.test(R) && R.indexOf('REGIAO_FILME_199_EVENTS.shown') > R.indexOf('if (scenes.length === 0) return HIDE()'), 'rota: shown só quando a oferta vai na resposta')
  t(/\.\.\.\(film199 \? \{ film199 \} : \{\}\),/.test(R), "rota: sem oferta, a resposta de sempre (nenhum campo a mais)")
  const goBlock = R.slice(R.indexOf("req.nextUrl.searchParams.get('offer') === 'film199'"), R.indexOf('  if (go) {\n    await writeServerEvent({ name: REGIAO_PAGA_EVENTS.clicked'))
  t(/if \(film199 === 'hide'\) return back\(\)/.test(goBlock) && /REGIAO_FILME_199_EVENTS\.clicked, userId: user\.id/.test(goBlock) && /film199 === 'qa' \? REGIAO_FILME_199_CANCEL_PATH : REGIAO_FILME_199_CHECKOUT_HREF/.test(goBlock), 'rota: clique re-decidido no servidor; conferência nunca vai ao checkout')
  t(R.indexOf("req.nextUrl.searchParams.get('offer') === 'film199'") > R.indexOf("if (mode === 'hide') return go ? back() : HIDE()"), 'rota: nenhum evento antes da decisão de quem vê')
  t(L.REGIAO_FILME_199_CHECKOUT_HREF === '/api/stripe/checkout?pack=region_film_199&intent_campaign=region_film_199', 'href do checkout sem preço nem créditos')
  t(/\.from\('profiles'\)\.update|\.insert\(|\.upsert\(|\.rpc\(/.test(R) === false, 'rota: não escreve no banco (só writeServerEvent)')

  const ST = strip(S.strip)
  t(!/\$\s?\d/.test(ST) && !/\$\s?\d/.test(strip(S.lib)), 'nenhum preço digitado na faixa nem nos textos')
  t(/\{regiaoFilme199Fill\(fc\.cta, fv\)\}/.test(ST) && /href=\{film\.go\}/.test(ST) && /data-testid="region-film-199-cta"/.test(ST), 'faixa: botão principal = o filme, pela rota que grava o clique')
  t(/<a href=\{data\.go\} onClick=\{saveResume\} data-testid="region-preview-pricing-cta" style=\{\{ fontSize: 13/.test(ST) && /\{regiaoFilme199Fill\(fc\.starter, fv\)\}/.test(ST), 'faixa: Starter vira link secundário')
  t(/const fv = \{ price: film\.price, seconds: film\.seconds, starterPrice: data\.price, films: data\.films \}/.test(ST), 'faixa: todos os números vêm do servidor')
  t(/data\.qa \|\| film\.qa \? <div[^>]*>\{copy\.qa\}<\/div> : null/.test(ST) && /if \(!film \|\| film\.qa \|\| data\.qa \|\| !data\.script\.trim\(\)\) return/.test(ST), 'faixa: conferência marcada e sem gravar retomada')
  t(/sessionStorage\.setItem\(CARD_ENTRY_DRAFT_KEY, serializeCardEntryDraft\(\{ prompt: data\.script, quality: 'cinematic_ai', duration: film\.seconds, mode: 'cinematic_ai', engine: 'seedance'/.test(ST) && /saveResume\(\)\n/.test(ST), 'faixa: o roteiro vai junto para a volta (rascunho da aba + aviso da prévia)')
  const mainStrip = main(FILES.strip)
  const oldJsx = mainStrip ? mainStrip.slice(mainStrip.indexOf('  return (\n    <section'), mainStrip.lastIndexOf('}')) : null
  t(oldJsx && S.strip.includes(oldJsx), 'faixa sem a oferta: o JSX de sempre, byte a byte')

  for (const lang of ['en', 'pt', 'es']) {
    const c = L.REGIAO_FILME_199_COPY[lang]
    t(c && c.cta.includes('{price}') && c.title.includes('{price}') && c.body.includes('{seconds}') && c.starter.includes('{starterPrice}'), `textos ${lang}: preço e segundos por parâmetro`)
    t(/one-time payment, no subscription|pagamento único, sem assinatura|pago único, sin suscripción/i.test(c.body), `textos ${lang}: "pagamento único, sem assinatura"`)
    t(!/this exact|this film|este filme exato|esta película exacta|makes this|faz este|hace esta/i.test(JSON.stringify(c)), `textos ${lang}: não promete "este filme exato"`)
    t(!/seedance|kling|veo|minimax|unlimited|ilimitad/i.test(JSON.stringify(c)), `textos ${lang}: sem nome de motor nem "ilimitado"`)
  }
  t(L.regiaoFilme199Fill(L.REGIAO_FILME_199_COPY.en.body, { price: 'P', seconds: 15, starterPrice: 'S', films: 4 }).startsWith('One 15-second film from your idea, one-time payment, no subscription.'), 'en: "One 15-second film from your idea, one-time payment, no subscription."')

  // G — eventos
  const i0 = S.events.indexOf('const SERVER_ONLY_EVENTS')
  const set = S.events.slice(i0, S.events.indexOf('\n])', i0))
  for (const n of Object.values(L.REGIAO_FILME_199_EVENTS)) t(set.includes(`'${n}'`), `evento ${n} é SÓ de servidor`)
  t(L.REGIAO_FILME_199_CAMPAIGN === 'region_film_199' && L.REGIAO_FILME_199_SKU === 'region_film_199', 'campanha e SKU próprios')
  return out
}

console.log('0 — o que NÃO pode mudar (igual à origin/main)')
for (const rel of ['lib/scenePreview.ts', 'lib/freeFilmPolicy.ts', 'lib/regionPass.ts', 'lib/offers/avulsoUnico3110.ts', 'lib/credits/engineCost.ts', 'app/pricing/PricingClient.tsx', 'app/pricing/page.tsx', 'app/(dashboard)/layout.tsx', 'lib/growth/regiaoPaga1011.ts', 'lib/recreate/access.ts']) {
  const m = main(rel)
  // reancorado KINEO-RECREATE-MOVIMENTO-1411 — lib/recreate/access.ts ganhou a linha do molde de movimento (antes da regra do efeito): aqui a regra é
  // "só acréscimos" (toda linha da main continua lá, na mesma ordem), como no preço; a visibilidade do Recreate é guardada por
  // scripts/test-recreate-movimento-1411.mjs e scripts/test-recreate-trava-1011.mjs.
  if (rel === 'lib/recreate/access.ts') {
    const cur = read(rel).split('\n')
    let k = 0
    ok(m !== null && m.split('\n').every((line) => { while (k < cur.length && cur[k] !== line) k++; if (k >= cur.length) return false; k++; return true }), `${rel}: só acréscimos em relação à main`)
    continue
  }
  ok(m !== null && m === read(rel), `${rel} idêntico à main`)
}
const cpMain = main(FILES.cp)
ok(cpMain && /export const TIER_PRICES[\s\S]*?\n}\n/.exec(cpMain)?.[0] === /export const TIER_PRICES[\s\S]*?\n}\n/.exec(SRC.cp)?.[0] && /export const TIER_CREDITS[\s\S]*?\n}\n/.exec(cpMain)?.[0] === /export const TIER_CREDITS[\s\S]*?\n}\n/.exec(SRC.cp)?.[0] && /export const PACK_CREDITS[\s\S]*?\n}/.exec(cpMain)?.[0] === /export const PACK_CREDITS[\s\S]*?\n}/.exec(SRC.cp)?.[0], 'tabela de planos e créditos dos packs intocadas')

console.log('suíte contra a fonte real')
for (const [c, m] of await suite(SRC)) ok(c, m)

console.log('mutantes (cada um precisa derrubar ≥1 verificação)')
const M = (file, a, b) => ({ file, a, b })
const MUT = [
  ['preço digitado diferente', M('cp', 'REGIAO_FILME_199_PRICE_MINOR: Record<CheckoutCurrency, number> = { usd: 199 }', 'REGIAO_FILME_199_PRICE_MINOR: Record<CheckoutCurrency, number> = { usd: 99 }')],
  ['créditos digitados', M('cp', 'return creditCostForDuration(REGIAO_FILME_199_QUALITY, true, REGIAO_FILME_199_SECONDS)', 'return 9')],
  ['créditos do 60 s', M('cp', 'export const REGIAO_FILME_199_SECONDS = 15', 'export const REGIAO_FILME_199_SECONDS = 60')],
  ['taxa doméstica no SKU', M('cp', 'export const REGIAO_FILME_199_STRIPE_PERCENT = 0.044', 'export const REGIAO_FILME_199_STRIPE_PERCENT = 0.029')],
  ['invariante (9) apagado', M('cp', '    if (net199 - cogs199 < 0) {', '    if (false) {')],
  ['sem claim do 199', M('cp', "  claim(REGIAO_FILME_199_PRICE_MINOR.usd, 'pack:region_film_199')", '  void 0')],
  ['nasce public', M('lib', "REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'internal'", "REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'public'")],
  ['sem checar região', M('lib', '  if (!row || row.trial_status !== REGIAO_FILME_199_TRIAL_STATUS) return false', '  if (!row) return false')],
  ['has_paid frouxo', M('lib', '  if (row.has_paid !== false) return false', '  if (row.has_paid === true) return false')],
  ['qualquer plano', M('lib', "  if (plan !== 'free' && plan !== '') return false", '')],
  ['qualquer país', M('lib', '  if (!country || !REGIAO_FILME_199_COUNTRIES.includes(country)) return false', '')],
  ['país a mais', M('lib', "['IN', 'PK', 'NG']", "['IN', 'PK', 'NG', 'BR']")],
  ['last_country vence', M('lib', 'for (const raw of [p?.signup_country, p?.last_country])', 'for (const raw of [p?.last_country, p?.signup_country])')],
  ['compra anterior ignorada', M('lib', '  if (!prova || prova.everPaid !== false) return false', '  if (!prova) return false')],
  ['sem prova de região', M('lib', '  return !!prova.regionCountry && REGIAO_FILME_199_COUNTRIES.includes(prova.regionCountry)', '  return true')],
  ['prova aceita qualquer país', M('lib', '  return !!prova.regionCountry && REGIAO_FILME_199_COUNTRIES.includes(prova.regionCountry)', '  return !!prova.regionCountry')],
  ['pagamentos só deste SKU', M('checkout', "in('name', ['payment_success', REGIAO_FILME_199_EVENTS.paid])", "in('name', [REGIAO_FILME_199_EVENTS.paid])")],
  ["'off' não esconde", M('lib', "  if (a.release === 'off') return 'hide'\n  if (a.release === 'public'", "  if (a.release === 'public'")],
  ['internal abre para cliente', M('lib', "if (a.release === 'public' && a.eligible === true) return 'real'", "if (a.release !== 'off' && a.eligible === true) return 'real'")],
  ['cliente vira casa', M('lib', "  if (a.house === true) return 'qa'", "  return 'qa'")],
  ['compra em internal', M('lib', "return release === 'public' && eligible === true", "return release !== 'off' && eligible === true")],
  ['promete este filme', M('lib', "body: 'One {seconds}-second film from your idea,", "body: 'This exact film, {seconds} seconds, from your idea,")],
  ['preço digitado no texto', M('lib', "cta: 'Make my film — {price}'", "cta: 'Make my film — $1.99'")],
  ['esconde que é único', M('lib', 'one-time payment, no subscription. Your idea', 'no subscription. Your idea')],
  ['checkout lê moeda do pedido', M('checkout', "currency: 'usd', product_data:", "currency: (req.nextUrl.searchParams.get('currency') ?? 'usd'), product_data:")],
  ['checkout sem elegibilidade', M('checkout', '  if (!regiaoFilme199CheckoutAllowed(REGIAO_FILME_199_RELEASE, eligible)) return refused()', '')],
  ['checkout ignora interruptor', M('checkout', "  if (REGIAO_FILME_199_RELEASE !== 'public') return refused()", '')],
  ['checkout créditos da URL', M('checkout', 'pack_credits: String(credits),\n      intent', "pack_credits: String(req.nextUrl.searchParams.get('credits') ?? credits),\n      intent")],
  ['checkout assinatura', M('checkout', "    mode: 'payment',\n    line_items", "    mode: 'subscription',\n    line_items")],
  ['checkout sem prova', M('checkout', '  const prova = await lerProvaRegiaoFilme199(db, user.id)', "  const prova = { regionCountry: 'IN', everPaid: false }")],
  ['checkout sem evento próprio', M('checkout', '  await writeServerEvent({ name: REGIAO_FILME_199_EVENTS.checkoutStarted,', '  void ({ name: REGIAO_FILME_199_EVENTS.checkoutStarted,')],
  ['rota de checkout depois do fallback', M('checkoutRoute', "    if (packParam === REGIAO_FILME_199_SKU) return await buildRegiaoFilme199AndRedirect(", "    if (packParam === 'never') return await buildRegiaoFilme199AndRedirect(")],
  ['webhook concede a metadata', M('webhook', '            creditsToAdd = regiaoFilme199Credits() // KINEO-REGIAO-FILME-199-1011', '            void 0 // KINEO-REGIAO-FILME-199-1011')],
  ['webhook fallback por valor', M('webhook', '            else if (amount === 290) creditsToAdd = PACK_CREDITS.starter290', '            else if (amount === 290) creditsToAdd = PACK_CREDITS.starter290\n            else if (amount === 199) creditsToAdd = regiaoFilme199Credits()')],
  ['webhook evento antes da concessão', M('webhook', '            if (isFilm199) await writeServerEvent({ name: REGIAO_FILME_199_EVENTS.paid', '            if (isFilm199) void ({ name: REGIAO_FILME_199_EVENTS.paid')],
  ['webhook retoma na reentrega', M('webhook', 'if (!duplicateSession || (!isOneTimeItemSession(duplicateSession)', 'if (!duplicateSession || (!isOneTimeItemSession(duplicateSession) && duplicateSession.metadata?.pack !== REGIAO_FILME_199_SKU')],
  ['rota off lê o banco', M('route', "  if (REGIAO_FILME_199_RELEASE === 'off') return 'hide'\n", '')],
  ['rota país do navegador', M('route', ".select('trial_status, has_paid, plan, signup_country, last_country')", ".select('trial_status, has_paid, plan, last_country')")],
  ['rota oferta fora do /pricing', M('route', "surface === 'pricing' ? await film199ModeFor(db, user.id, house) : 'hide'", "await film199ModeFor(db, user.id, house)")],
  ['rota conferência compra', M('route', "film199 === 'qa' ? REGIAO_FILME_199_CANCEL_PATH : REGIAO_FILME_199_CHECKOUT_HREF", 'REGIAO_FILME_199_CHECKOUT_HREF')],
  ['rota preço digitado', M('route', 'price: regiaoFilme199PriceLabel(),', "price: '$1.99',")],
  ['faixa preço digitado', M('strip', '{regiaoFilme199Fill(fc.cta, fv)}', 'Make my film — $1.99')],
  ['faixa Starter continua principal', M('strip', '<a href={data.go} onClick={saveResume} data-testid="region-preview-pricing-cta" style={{ fontSize: 13', '<a href={data.go} onClick={saveResume} data-testid="region-preview-pricing-cta" style={{ background: \'#2997ff\', fontSize: 13')],
  ['faixa conferência grava', M('strip', 'if (!film || film.qa || data.qa || !data.script.trim()) return', 'if (!film || !data.script.trim()) return')],
  ['evento cunhável pelo navegador', M('events', "  'region_film_199_paid',\n", '')],
]
for (const [nome, m] of MUT) {
  const src = SRC[m.file]
  if (src.split(m.a).length !== 2) { ok(false, `mutante "${nome}" não aplicou`); continue }
  const r = await suite({ ...SRC, [m.file]: src.replace(m.a, m.b) })
  ok(r.some(([c]) => !c), `mutante "${nome}" é pego`)
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
