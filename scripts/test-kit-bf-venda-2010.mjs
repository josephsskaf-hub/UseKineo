// KINEO-KIT-BF-VENDA-2010 — guardião do KIT BLACK FRIDAY À VENDA (US$ 49 único; incluído no Business) e da OFERTA ANTECIPADA DO ANUAL ("2 meses
// grátis" até 21/11, o MAIOR desconto, sem somar). Fundador 19/10 ("3 decisões sim"), execução 20/10. Roda com `node scripts/test-kit-bf-venda-2010.mjs`
// na raiz do repo, sem rede, sem banco, sem Stripe: o checkout do kit, a rota da oferta, a recarga anual e as regras são EXECUTADOS de verdade
// (scripts/test-support/offline-ts-loader.mjs, Stripe/Supabase falsos); o webhook (3.400 linhas) é conferido pela ORDEM das linhas no Path A.
//
// O que prova:
//   P  PREÇO NO SERVIDOR: o checkout cobra 4900 (USD; BRL pela fórmula da casa) com price_data inline e metadata.pack/pack_credits, ignorando
//      amount/price/credits na URL; 340 créditos = 10 × adsV2Credits('photo_motion', 15); o anual cobrado = annualEarlyOfferPriceMinor(vigente,
//      mensal) sem nada do pedido; hoje (preços de 20/10) o anual de 30% vence em todo plano = o MESMO valor de antes; sintético: 10 × o mensal
//      vence só quando é menor, nunca soma; margem do kit positiva no pior caso;
//   I  IDEMPOTÊNCIA DO WEBHOOK: a concessão do kit mora no Path A DEPOIS do guard `checkout_fulfilled:<sessão>` e ANTES do UPDATE único (créditos
//      + acesso no mesmo UPDATE); leitura do acesso que falha = RetryableEntitlementError (o finally libera o guard e responde 500); o evento de
//      compra só depois de entitlementConfirmed; reconhecimento só por metadata.pack (nunca pelo valor 4900 = bulk30); acesso nunca encurta;
//   T  PRAZOS NO SERVIDOR: venda fecha em 30/11 24:00 BRT (checkout recusa, rota diz 'closed'); anual desliga em 21/11 24:00 BRT; acesso até 31/12;
//   B  BUSINESS RECEBE SEM PAGAR: checkout recusa o Business com a frase "incluído"; a rota devolve 'included'; 500 cr do mês ≥ 340 do kit;
//   N  NADA MUDA PARA QUEM NÃO COMPRA: desfaz exato (= base) em todo arquivo tocado; recarga anual igual à base numa grade de valores; as linhas
//      do webhook só agem com isKitBf; o cartão nunca põe preço na URL;
//   D  desfaz + novos + marca + encadeamento + reâncoras;
//   M  mutantes (todos APLICADOS e VERMELHOS), em memória — nenhum arquivo do disco é tocado.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semKitBfVenda2010, KIT_BF_VENDA_2010_ARQUIVOS, KIT_BF_VENDA_2010_NOVOS, KIT_BF_VENDA_2010_BASE, MARCA_KIT_BF_VENDA_2010, ACRESCIMOS_KIT_BF_VENDA_2010, TROCAS_KIT_BF_VENDA_2010 } from './test-support/desfaz-kit-bf-venda-2010.mjs'
import { semAdsNota92110 } from './test-support/desfaz-ads-nota9-2110.mjs' // reancorado KINEO-ADS-NOTA9-2110
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-KIT-BF-VENDA-2010'
const lf = (s) => String(s).split('\r\n').join('\n')
const disco = (p) => lf(semAdsNota92110(semAfiliado50_2610(p, readFileSync(join(ROOT, p), 'utf8')), p)) // Later independent affiliate offer and test compatibility exit before older exact undo layers.
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${KIT_BF_VENDA_2010_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  sale: 'lib/ads/kitBfSale.ts', annual: 'lib/billing/annualEarlyOffer.ts', checkoutKit: 'lib/stripe/kitBfCheckout.ts', rota: 'app/api/offers/black-friday/route.ts',
  card: 'components/ads/KitBfBuyCard.tsx', checkout: 'app/api/stripe/checkout/route.ts', webhook: 'app/api/stripe/webhook/route.ts', events: 'app/api/events/route.ts',
  refill: 'lib/billing/annualRefill.ts', pricing: 'app/pricing/PricingClient.tsx', adsClient: 'app/(dashboard)/ads/v2/AdsV2Client.tsx', tiers: 'lib/ads/v2Tiers.ts',
  cr: 'lib/ads/v2CloseReal.ts', precos: 'lib/checkoutPricing.ts',
}
const ENV = { STRIPE_SECRET_KEY: 'sk_test_guardiao', NEXT_PUBLIC_SUPABASE_URL: 'https://guardiao.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'svc_guardiao' }
const T = (iso) => Date.parse(iso)
const HOJE = T('2026-10-20T15:00:00.000Z')

// ── o carregador (over = fonte trocada em memória; velho = esta camada desfeita = a base) ─────────────────────────────────────────────
const carregar = (over = {}, { velho = false, mocks = {}, globals = {} } = {}) => createOfflineLoader({ env: ENV, mocks, globals, source: (rel, text) => (Object.hasOwn(over, rel) ? lf(over[rel]) : velho ? semKitBfVenda2010(text, rel) : text) })

// ── o checkout do kit, executado ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function checkoutKit(over, { plan = 'free', user = { id: 'u-1', email: 'cliente@exemplo.test' }, now = HOJE, country = 'US', probeErr = null, query = '' } = {}) {
  const calls = []
  const events = []
  const mocks = {
    'next/server': { NextResponse: { redirect: (u) => ({ kind: 'redirect', url: String(u) }), json: (b, i) => ({ kind: 'json', body: b, status: i?.status ?? 200 }) }, NextRequest: class {} },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { email: user?.email ?? null, stripe_customer_id: null, plan } }) }) }) }) }) },
    '@supabase/supabase-js': { createClient: () => ({ from: () => ({ select: () => ({ limit: async () => ({ error: probeErr }) }) }) }) },
    '@/lib/stripe': { stripe: { checkout: { sessions: { create: async (params, opts) => { calls.push({ params, opts }); return { id: 'cs_test_kit', url: 'https://checkout.stripe.test/cs_test_kit' } } } } } },
  }
  const M = carregar(over, { mocks })(F.checkoutKit)
  const url = new URL(`https://www.usekineo.com/api/stripe/checkout?pack=kit_bf${query}`)
  const req = { nextUrl: url, headers: { get: (k) => (k === 'x-vercel-ip-country' ? country : k === 'accept-language' ? (country === 'BR' ? 'pt-BR' : 'en-US') : null) } }
  const deps = { recordCheckoutEvent: async (name, uid, meta) => { events.push({ name, uid, meta }) }, browserSessionIdFrom: () => 'sid-guardiao', checkoutFailureReason: (m) => String(m).split(':')[0].toLowerCase().replace(/[^a-z0-9]+/g, '_'), oneTimeIdempotencyKey: (p) => 'k:' + JSON.stringify(p), now: () => now }
  const res = await M.buildKitBfAndRedirect(req, deps)
  return { res, calls, events, M }
}

// ── a rota da oferta, executada (relógio do servidor congelado) ───────────────────────────────────────────────────────────────────────
async function rotaOferta(over, { plan = null, now = HOJE } = {}) {
  class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now) } static now() { return now } }
  const mocks = {
    'next/server': { NextResponse: { json: (b, i) => ({ body: b, init: i }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: plan ? { id: 'u-2' } : null } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan } }) }) }) }) }) },
  }
  const M = carregar(over, { mocks, globals: { Date: FakeDate } })(F.rota)
  return (await M.GET()).body
}

// ── as provas (rodam no disco e em cada mutante) ──────────────────────────────────────────────────────────────────────────────────────
async function provas(over = {}) {
  const r = {}
  const src = (p) => (Object.hasOwn(over, p) ? lf(over[p]) : disco(p))
  const L = carregar(over)
  const S = L(F.sale)
  const A = L(F.annual)
  const P = L(F.precos)
  const V = L(F.tiers)

  // P — números
  r.P1_preco = S.KIT_BF_USD_MINOR === 4900 && S.kitBfPriceLabel() === 'US$49'
  r.P2_creditos = S.KIT_BF_AD_CREDITS === V.adsV2Credits('photo_motion', 15) && S.KIT_BF_ADS === 10 && S.KIT_BF_CREDITS === 340 && S.KIT_BF_CREDITS === S.KIT_BF_ADS * V.adsV2Credits('photo_motion', 15)
  const margemPior = P.netAfterStripeUsd(S.KIT_BF_USD_MINOR / 100) - P.worstCaseCogsUsd(S.KIT_BF_CREDITS)
  r.P3_margem_pior_caso = margemPior > 0
  // P — o checkout cobra o número do servidor, ignorando o que vem na URL
  const c1 = await checkoutKit(over, { query: '&amount=1&unit_amount=1&price=100&credits=9999&pack_credits=9999' })
  const li = c1.calls[0]?.params?.line_items?.[0]
  r.P4_checkout_valor_servidor = c1.calls.length === 1 && li?.price_data?.unit_amount === 4900 && li?.price_data?.currency === 'usd' && !li?.price && c1.calls[0].params.mode === 'payment'
    && c1.calls[0].params.metadata.pack === 'kit_bf' && c1.calls[0].params.metadata.pack_credits === '340' && c1.res.url === 'https://checkout.stripe.test/cs_test_kit'
    && c1.events.some((e) => e.name === 'checkout_started' && e.meta.sku === 'kit_bf' && e.meta.stripe_session_id === 'cs_test_kit')
  const SC = L('lib/settlementCurrency.ts')
  const cBR = await checkoutKit(over, { country: 'BR' })
  r.P5_checkout_brl_formula = cBR.calls.length === 1 && cBR.calls[0].params.line_items[0].price_data.currency === 'brl' && cBR.calls[0].params.line_items[0].price_data.unit_amount === SC.settlementAmountMinor(4900, 'brl')
  // P — o anual: hoje o vigente vence em todo plano (o mesmo valor de antes); 10 × o mensal só quando é menor; nunca soma
  const tiers = Object.keys(P.ANNUAL_PRICES)
  r.P6_anual_hoje_igual = tiers.length === 3 && tiers.every((t) => A.annualEarlyOfferWinner(P.ANNUAL_PRICES[t].usd, P.monthlyPriceMinor(t, 'usd')) === 'current'
    && A.annualEarlyOfferPriceMinor(P.ANNUAL_PRICES[t].usd, P.monthlyPriceMinor(t, 'usd'), HOJE) === P.ANNUAL_PRICES[t].usd
    && A.annualEarlyOfferBadge(P.ANNUAL_PRICES[t].usd, P.monthlyPriceMinor(t, 'usd'), HOJE) === null)
  r.P7_anual_maior_desconto_sem_somar = A.annualEarlyOfferPriceMinor(12000, 1000, HOJE) === 10000 && A.annualEarlyOfferPriceMinor(9000, 1000, HOJE) === 9000 && A.annualEarlyOfferPriceMinor(10000, 1000, HOJE) === 10000
    && A.annualEarlyOfferFloorMinor(12000, 1000) === 10000 && A.annualEarlyOfferFloorMinor(9000, 1000) === 9000
  const sCheckout = src(F.checkout)
  r.P8_anual_checkout_servidor = sCheckout.split('\n').filter((l) => /annualEarlyOfferPriceMinor\(/.test(l) && !/^import /.test(l)).length === 1
    && /^    \? annualEarlyOfferPriceMinor\(getAnnualPrice\(tier, currency, region\), monthlyPriceMinor\(tier, currency, region\)\) \/\/ KINEO-KIT-BF-VENDA-2010/m.test(sCheckout)
  const iDfy = sCheckout.indexOf('        return await buildDfyFilms3AndRedirect(req)')
  const iKit = sCheckout.indexOf('      if (packParam === KIT_BF_PACK_ID) return await buildKitBfAndRedirect(req, { recordCheckoutEvent, browserSessionIdFrom, checkoutFailureReason, oneTimeIdempotencyKey }) // KINEO-KIT-BF-VENDA-2010')
  const iPack = sCheckout.lastIndexOf('      return await buildPackAndRedirect(req, true)')
  r.P9_checkout_despacho_antes_do_fallback = iDfy > 0 && iKit > iDfy && iPack > iKit
  r.P10_kit_sem_preco_do_pedido = !/searchParams\.get\('(amount|price|credits|unit_amount|pack_credits)'\)/.test(src(F.checkoutKit)) && /const unitAmount = KIT_BF_USD_MINOR\n/.test(src(F.checkoutKit))

  // T — prazos
  const fim = T('2026-12-01T03:00:00.000Z')
  r.T1_venda_fecha_30_11 = S.KIT_BF_SALE_ENDS_AT === '2026-12-01T03:00:00.000Z' && S.kitBfSaleOpen(fim - 1) && !S.kitBfSaleOpen(fim) && !S.kitBfSaleOpen(T('2026-12-02T12:00:00.000Z'))
  const cFim = await checkoutKit(over, { now: T('2026-12-02T12:00:00.000Z') })
  const cAntes = await checkoutKit(over, { now: fim - 60_000 })
  r.T2_checkout_recusa_depois = cFim.calls.length === 0 && /\/pricing\?checkout_error=/.test(cFim.res.url) && decodeURIComponent(cFim.res.url).includes('ended on Nov 30') && cAntes.calls.length === 1
  r.T3_anual_desliga_21_11 = A.ANNUAL_EARLY_OFFER_ENDS_AT === '2026-11-22T03:00:00.000Z' && A.annualEarlyOfferOpen(T('2026-11-22T02:59:59.000Z')) && !A.annualEarlyOfferOpen(T('2026-11-22T03:00:00.000Z'))
    && A.annualEarlyOfferPriceMinor(12000, 1000, T('2026-11-23T00:00:00.000Z')) === 12000 && A.annualEarlyOfferBadge(12000, 1000, T('2026-11-23T00:00:00.000Z')) === null
    && A.annualEarlyOfferBadge(12000, 1000, HOJE)?.priceMinor === 10000 && A.annualEarlyOfferBadge(12000, 1000, HOJE)?.daysLeft === 33
  r.T4_acesso_31_12_nunca_encurta = S.KIT_BF_ACCESS_UNTIL === '2027-01-01T03:00:00.000Z' && S.kitBfAccessUntilIso(null) === '2027-01-01T03:00:00.000Z'
    && S.kitBfAccessUntilIso('2026-11-01T00:00:00.000Z') === '2027-01-01T03:00:00.000Z' && S.kitBfAccessUntilIso('2027-09-25T10:00:00.000Z') === '2027-09-25T10:00:00.000Z' && S.kitBfAccessUntilIso('lixo') === '2027-01-01T03:00:00.000Z'
  const rHoje = await rotaOferta(over, { plan: 'free' })
  const rFim = await rotaOferta(over, { plan: 'free', now: T('2026-12-01T03:00:00.000Z') })
  r.T5_rota_relogio_servidor = rHoje.kit.state === 'buy' && rHoje.kit.daysLeft === 42 && rHoje.annual.open === true && Object.values(rHoje.annual.tiers).every((v) => v.badge === null && v.winner === 'current')
    && rFim.kit.state === 'closed' && rFim.annual.open === false

  // B — Business recebe sem pagar
  const cBiz = await checkoutKit(over, { plan: 'business' })
  r.B1_checkout_recusa_business = cBiz.calls.length === 0 && decodeURIComponent(cBiz.res.url).includes('already included in your Business plan')
  const rBiz = await rotaOferta(over, { plan: 'business' })
  r.B2_rota_incluido = rBiz.kit.state === 'included' && (await rotaOferta(over, { plan: 'basic' })).kit.state === 'buy'
  r.B3_500_cobre_o_kit = P.TIER_CREDITS.business === S.KIT_BF_BUSINESS_MONTHLY_CREDITS && P.TIER_CREDITS.business >= S.KIT_BF_CREDITS && S.kitBfIncludedInPlan('business') && !S.kitBfIncludedInPlan('pro') && !S.kitBfIncludedInPlan(null)
  const cNoUser = await checkoutKit(over, { user: null })
  const cProbe = await checkoutKit(over, { probeErr: { code: '42703', message: 'column missing' } })
  r.B4_sem_login_e_sem_coluna_nao_cobram = cNoUser.calls.length === 0 && /\/login\?reason=checkout/.test(cNoUser.res.url) && cProbe.calls.length === 0

  // I — idempotência do webhook (ordem das linhas no Path A)
  const W = src(F.webhook)
  const a0 = W.indexOf("        if (session.mode === 'payment') {")
  const a1 = W.indexOf('        // ── Path B: Subscription checkout ──')
  const seg = a0 > 0 && a1 > a0 ? W.slice(a0, a1) : ''
  const at = (s) => seg.indexOf(s)
  const gGuard = at('            .insert({ id: checkoutFulfillmentGuard })')
  const gKit = Math.min(...['const isKitBf', 'const kitCur', 'const kitUntilIso', 'profileUpdate[ADS_ACCESS_COLUMN] = kitUntilIso'].map((x) => { const i = at(x); return i < 0 ? -1 : i }))
  const gUpd = at('            .update(profileUpdate)')
  const gConf = at('            entitlementConfirmed = true\n            entitlementPending = false\n            console.log(`[stripe webhook] +${creditsToAdd} credits')
  const gEvt = at('            if (isKitBf) await writeServerEvent({ name: KIT_BF_EVENTS.purchased')
  r.I1_concessao_entre_guard_e_update = seg !== '' && gGuard > 0 && gKit > gGuard && gUpd > gKit && seg.split('\n').filter((l) => l.includes(MARCA)).every((l, i, all) => seg.indexOf(l) > gGuard || /creditsToAdd = KIT_BF_CREDITS/.test(l))
  r.I2_leitura_falha_retenta = /^          if \(kitCur\?\.error\) throw new RetryableEntitlementError\(/m.test(seg) && /class RetryableEntitlementError/.test(W) && /checkoutFulfillmentGuardAcquired && checkoutFulfillmentGuard\) \{\n\s+try \{\n\s+const \{ error: fulfillmentReleaseError \} = await supabase\n\s+\.from\('stripe_events'\)\n\s+\.delete\(\)/.test(W) && /\{ error: 'Webhook handler failed' \}, \{ status: 500 \}/.test(W)
  r.I3_evento_depois_da_concessao = gConf > gUpd && gEvt > gConf
  const marcadasW = W.split('\n').filter((l) => l.includes(MARCA) && !/^import /.test(l))
  r.I4_so_metadata_nunca_valor = marcadasW.length === 8 && marcadasW.every((l) => { const code = l.split(' // ')[0]; return /isKitBf|KIT_BF_PACK_ID|kitCur/.test(code) && !/4900|amount\s*===|\bbreak\b|\breturn\b/.test(code) })
    && /^            else if \(packMeta === KIT_BF_PACK_ID\) creditsToAdd = KIT_BF_CREDITS \/\/ KINEO-KIT-BF-VENDA-2010/m.test(seg) && S.isKitBfSession({ mode: 'payment', metadata: { pack: 'kit_bf' } }) && !S.isKitBfSession({ mode: 'payment', metadata: { pack: 'bulk30' } })
  r.I5_mesmo_update_creditos_e_acesso = /^          if \(isKitBf && kitUntilIso\) profileUpdate\[ADS_ACCESS_COLUMN\] = kitUntilIso \/\/ KINEO-KIT-BF-VENDA-2010/m.test(seg) && seg.split('.update(profileUpdate)').length === 2
    && (W.match(/profileUpdate\[ADS_ACCESS_COLUMN\]/g) || []).length === 2 && /if \(isAdsPass && adsUntilIso\) profileUpdate\[ADS_ACCESS_COLUMN\] = adsUntilIso/.test(seg) // só o passe e o kit escrevem a coluna
  const sEv = src(F.events)
  r.I6_evento_server_only = sEv.split('\n').filter((l) => l.includes(MARCA)).length === 1 && /^  'kit_bf_purchased', \/\/ KINEO-KIT-BF-VENDA-2010/m.test(sEv) && S.KIT_BF_EVENTS.purchased === 'kit_bf_purchased'

  // N — nada muda para quem não compra
  const RN = L(F.refill)
  const RV = carregar({ [F.refill]: base(F.refill) })(F.refill) // a recarga da BASE (git show), nunca o disco mutado
  const grade = [1, 990, 5000, 8299, 8300, 9900, 16600, 16700, 19900, 45999, 46000, 54900, 99999]
  r.N1_recarga_anual_igual_a_base = tiers.every((t) => grade.every((g) => ['usd', 'brl'].every((cur) => RN.annualRefillCredits(t, g, cur) === RV.annualRefillCredits(t, g, cur))))
  const sCard = src(F.card)
  r.N2_cartao_sem_preco_na_url = /href=\{`\$\{KIT_BF_CHECKOUT_HREF\}&surface=\$\{surface\}`\}/.test(sCard) && S.KIT_BF_CHECKOUT_HREF === '/api/stripe/checkout?pack=kit_bf' && !/price=|amount=|credits=/.test(sCard)
    && /\{included\n\s+\? <span className="kitbf-inc"/.test(sCard)
  const linguas = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
  const crSrc = src(F.cr)
  r.N3_cartao_16_linguas_numeros_do_servidor = linguas.every((g) => { const t = S.kitBfCardText(g, 7); const nome = new RegExp(`^  ${g}: \\{.*close_real: \\{ name: '([^']*)'`, 'm').exec(crSrc)?.[1]; return Object.hasOwn(S.KIT_BF_COPY, g) && t.bullets[0].includes('340') && t.bullets[0].includes(nome ?? '§') && S.KIT_BF_FORMAT_NAME[g] === nome && t.cta.includes('US$49') && t.ends.includes('7') && t.includedNote.includes('500') && !/\{\w+\}/.test([t.priceLine, ...t.bullets, t.ends, t.cta, t.includedNote].join(' ')) })
  r.N4_telas_so_o_cartao = src(F.pricing).split('\n').filter((l) => l.includes(MARCA)).length === 2 && src(F.adsClient).split('\n').filter((l) => l.includes(MARCA)).length === 2
    && /workspace\?\.role !== 'member' \? <KitBfBuyCard lang=\{lang\} surface="ads" \/> : null\}/.test(src(F.adsClient)) && /<KitBfBuyCard lang="en" surface="pricing" \/>/.test(src(F.pricing)) && /billing === 'annual' \? <AnnualEarlyOfferBadge \/> : null/.test(src(F.pricing))
  return { r, margemPior }
}

// ── D — desfaz exato, novos, marca, encadeamento ─────────────────────────────────────────────────────────────────────────────────────
console.log('D — desfaz / novos / marca')
for (const p of KIT_BF_VENDA_2010_ARQUIVOS) {
  const b = base(p)
  let des = null
  try { des = semKitBfVenda2010(disco(p), p) } catch (e) { console.log('       (' + e.message + ')') }
  ok(b !== null && des === b, `D1 desfaz exato = base: ${p}`)
}
ok(KIT_BF_VENDA_2010_NOVOS.every((p) => existsSync(join(ROOT, p)) && base(p) === null), 'D2 os arquivos novos existem e não estavam na base')
ok(KIT_BF_VENDA_2010_NOVOS.filter((p) => /\.(ts|tsx|mjs)$/.test(p)).every((p) => disco(p).includes(MARCA)), 'D3 todo arquivo novo carrega a marca')
ok(MARCA_KIT_BF_VENDA_2010 === MARCA && Object.keys(TROCAS_KIT_BF_VENDA_2010).filter((k) => k !== '__acrescimos').every((k) => KIT_BF_VENDA_2010_ARQUIVOS.includes(k)), 'D4 trocas só em arquivos declarados')
ok(KIT_BF_VENDA_2010_ARQUIVOS.every((p) => { const n = disco(p).split('\n').filter((l) => l.includes(MARCA)).length; return n === (ACRESCIMOS_KIT_BF_VENDA_2010[p] ?? 0) + (TROCAS_KIT_BF_VENDA_2010[p] ?? []).length }), 'D5 contagem de linhas marcadas = acréscimos + trocas, arquivo a arquivo')
ok(semKitBfVenda2010('qualquer texto sem marca', F.webhook) === 'qualquer texto sem marca' && semKitBfVenda2010(disco(F.sale), F.sale) === disco(F.sale), 'D6 idempotente fora da lista e sem marca')
{
  const { semApresentadorOlhos1910 } = await import('./test-support/desfaz-apresentador-olhos-1910.mjs')
  const viaCadeia = semApresentadorOlhos1910(disco(F.adsClient), F.adsClient)
  ok(!viaCadeia.includes(MARCA) && /^  texto = semKitBfVenda2010\(texto, p\) \/\/ KINEO-KIT-BF-VENDA-2010/m.test(disco('scripts/test-support/desfaz-apresentador-olhos-1910.mjs')), 'D7 encadeado: a cabeça do Ads (semApresentadorOlhos1910) tira esta camada PRIMEIRO')
}

// ── as provas no disco ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('P / T / B / I / N — no disco')
const { r: R0, margemPior } = await provas({})
for (const [k, v] of Object.entries(R0)) ok(v, k)
console.log(`       (margem do kit no pior caso: US$ ${margemPior.toFixed(2)} sobre US$ 47,28 líquidos)`)

// ── M — mutantes em memória (cada um precisa APLICAR e derrubar a prova alvo) ────────────────────────────────────────────────────────
console.log('M — mutantes')
const MUT = [
  ['M1 preço 4900→4800', F.sale, 'export const KIT_BF_USD_MINOR = 4900', 'export const KIT_BF_USD_MINOR = 4800', 'P1_preco'],
  ['M2 10→12 anúncios', F.sale, 'export const KIT_BF_ADS = 10', 'export const KIT_BF_ADS = 12', 'P2_creditos'],
  ['M3 venda até 31/12', F.sale, "export const KIT_BF_SALE_ENDS_AT = '2026-12-01T03:00:00.000Z'", "export const KIT_BF_SALE_ENDS_AT = '2026-12-31T03:00:00.000Z'", 'T2_checkout_recusa_depois'],
  ['M4 valor vindo da URL', F.checkoutKit, '  const unitAmount = KIT_BF_USD_MINOR\n', "  const unitAmount = Number(req.nextUrl.searchParams.get('amount')) || KIT_BF_USD_MINOR\n", 'P4_checkout_valor_servidor'],
  ['M5 Business compra', F.checkoutKit, '  if (kitBfIncludedInPlan(', '  if (false && kitBfIncludedInPlan(', 'B1_checkout_recusa_business'],
  ['M6 checkout ignora a janela', F.checkoutKit, '  if (!kitBfSaleOpen(nowMs)) {', '  if (false) {', 'T2_checkout_recusa_depois'],
  ['M7 descontos somados', F.annual, '  return annualEarlyOfferOpen(nowMs) ? annualEarlyOfferFloorMinor(currentAnnualMinor, monthlyMinor) : currentAnnualMinor', '  return annualEarlyOfferOpen(nowMs) ? Math.round((currentAnnualMinor * 10) / 12) : currentAnnualMinor', 'P6_anual_hoje_igual'],
  ['M8 anual sem prazo', F.annual, '  return Number.isFinite(nowMs) && nowMs < Date.parse(ANNUAL_EARLY_OFFER_ENDS_AT)', '  return Number.isFinite(nowMs)', 'T3_anual_desliga_21_11'],
  ['M9 leitura do acesso engole erro', F.webhook, '          if (kitCur?.error) throw new RetryableEntitlementError(', '          if (kitCur?.error) console.warn(', 'I2_leitura_falha_retenta'],
  ['M10 evento antes da concessão', F.webhook, '          const isKitBf = packMeta === KIT_BF_PACK_ID // KINEO-KIT-BF-VENDA-2010\n', "          const isKitBf = packMeta === KIT_BF_PACK_ID // KINEO-KIT-BF-VENDA-2010\n            if (isKitBf) await writeServerEvent({ name: KIT_BF_EVENTS.purchased, userId, path: '/x' }) // KINEO-KIT-BF-VENDA-2010\n", 'I3_evento_depois_da_concessao'],
  ['M11 concessão antes do guard', F.webhook, '          entitlementPending = true\n          // Legacy packs are additive', "          entitlementPending = true\n          if (packMeta === KIT_BF_PACK_ID) await supabase.from('profiles').update({ video_credits: 340 }).eq('id', userId) // KINEO-KIT-BF-VENDA-2010\n          // Legacy packs are additive", 'I1_concessao_entre_guard_e_update'],
  ['M12 rota: Business vira compra', F.rota, "kitBfIncludedInPlan(plan) ? 'included' : 'buy'", "'buy'", 'B2_rota_incluido'],
  ['M13 recarga anual muda', F.refill, 'annualAmountMinor < annualEarlyOfferFloorMinor(ANNUAL_PRICES[tier].usd, TIER_PRICES[tier].usd)', 'annualAmountMinor < annualEarlyOfferFloorMinor(ANNUAL_PRICES[tier].usd, TIER_PRICES[tier].usd / 10)', 'N1_recarga_anual_igual_a_base'],
  ['M14 anual lê o pedido', F.checkout, '    ? annualEarlyOfferPriceMinor(getAnnualPrice(tier, currency, region), monthlyPriceMinor(tier, currency, region))', "    ? annualEarlyOfferPriceMinor(getAnnualPrice(tier, currency, region), Number(req.nextUrl.searchParams.get('m')))", 'P8_anual_checkout_servidor'],
  ['M15 preço na URL do cartão', F.card, 'href={`${KIT_BF_CHECKOUT_HREF}&surface=${surface}`}', 'href={`${KIT_BF_CHECKOUT_HREF}&surface=${surface}&price=4900`}', 'N2_cartao_sem_preco_na_url'],
  ['M16 reconhece pelo valor', F.webhook, '            else if (packMeta === KIT_BF_PACK_ID) creditsToAdd = KIT_BF_CREDITS // KINEO-KIT-BF-VENDA-2010', '            else if (packMeta === KIT_BF_PACK_ID || amount === 4900) creditsToAdd = KIT_BF_CREDITS // KINEO-KIT-BF-VENDA-2010', 'I4_so_metadata_nunca_valor'],
  ['M17 acesso fora do UPDATE', F.webhook, '          if (isKitBf && kitUntilIso) profileUpdate[ADS_ACCESS_COLUMN] = kitUntilIso // KINEO-KIT-BF-VENDA-2010', "          if (isKitBf && kitUntilIso) await supabase.from('profiles').update({ [ADS_ACCESS_COLUMN]: kitUntilIso }).eq('id', userId) // KINEO-KIT-BF-VENDA-2010", 'I5_mesmo_update_creditos_e_acesso'],
  ['M18 acesso encurta', F.sale, 'cur > kit ? cur : kit', 'kit', 'T4_acesso_31_12_nunca_encurta'],
]
for (const [nome, arq, a, b, alvo] of MUT) {
  let over = null
  try { over = { [arq]: trocar(disco(arq), a, b) } } catch (e) { ok(false, `${nome} — ${e.message}`); continue }
  const aplicou = over[arq].includes(b.trim().slice(0, 40))
  let r = null
  try { r = (await provas(over)).r } catch (e) { r = { __lancou: false }; console.log('       (lançou: ' + e.message + ')') }
  ok(aplicou && r && (r[alvo] === false || r.__lancou === false), `${nome} → ${alvo} VERMELHO`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
