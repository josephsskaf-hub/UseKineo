// KINEO-CHECKOUT-CLAREZA-1610 — guardião das 3 mudanças da hora de pagar (fundador 16/10, "tudo sim"; nada de preço muda):
//   1. GARANTIA ÚNICA: uma frase verdadeira (Termos §4: 1º mês pago das mensais em 7 dias; anual em 14), a MESMA no FAQ, na
//      faixa de confiança, sob o botão de cada cartão do /pricing e no modal de upgrade; sem "all plans", sem "1 click".
//   2. PREÇO POR FILME no cartão (≈ N films of 60 s · ≈ US$ X per film) com a MESMA régua da linha de filmes do cartão e de
//      lib/marketingPrice (Seedance 1.5, o motor padrão), executada; e a comparação com o criador UGC humano no /ads e no
//      bloco Business (fonte citada no código, lado da Kineo calculado).
//   3. PRAZO REAL DE 48 h nos 20% do 1º mês: relógio por conta no servidor (uma linha em `events`, id determinístico),
//      executado contra um banco falso (começa, não reinicia, vence, lê a mais antiga, falha = 'unknown'); e a fiação: o
//      checkout decide ANTES da sessão da Stripe, as telas somem com o vencido, o navegador não cunha o evento.
//   + mutantes: cada um deixa pelo menos uma verificação vermelha (e prova que foi aplicado: alvo único, senão lança).
// Só readFileSync + carregador offline (scripts/gpt24h-offline-support.mjs): nada de rede, banco ou Stripe.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const MARCA = 'KINEO-CHECKOUT-CLAREZA-1610'
const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const PRICES = 'lib/checkoutPricing.ts'
const CLIENT = 'app/pricing/PricingClient.tsx'
const STAGE = 'components/pricing/PlanValueStage.tsx'
const VALUE = 'lib/pricingPlanValue.ts'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const TERMS = 'app/terms/page.tsx'
const DEADLINE = 'lib/growth/welcome20Deadline.ts'
const HOOK = 'lib/growth/useWelcome20Deadline.ts'
const API = 'app/api/offers/welcome20-deadline/route.ts'
const CHECKOUT = 'app/api/stripe/checkout/route.ts'
const EVENTS = 'app/api/events/route.ts'
const BAR = 'components/pricing/PricingDealBar.tsx'
const MODAL = 'components/WelcomeOfferModal.tsx'
const UGC = 'lib/ads/ugcComparison.ts'
const ADS = 'app/ads/page.tsx'
const BIZ = 'components/pricing/PricingBusinessBlock.tsx'
const LANDING = 'components/LandingPlanPrice.tsx'
const BUYCTA = 'components/BuyCreatorCta.tsx'
const FILM60 = 'components/FilmReady60sUpsell.tsx'
const MKT = 'lib/marketingPrice.ts'
const FILES = [PRICES, CLIENT, STAGE, VALUE, UPGRADE, TERMS, DEADLINE, HOOK, API, CHECKOUT, EVENTS, BAR, MODAL, UGC, ADS, BIZ, LANDING, BUYCTA, FILM60]
const SRC = Object.fromEntries(FILES.map((f) => [f, read(f)]))

const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const strip = (html) => html.replace(/<!-- -->/g, '')
const GUARANTEE = 'Full refund if you email us within 7 days of your first monthly payment (14 days on annual plans).'
const HOUR = 60 * 60 * 1000

// Banco falso com a forma mínima que lib/growth/welcome20Deadline.ts usa (select→eq→eq→order→limit; insert com PK).
function fakeDb({ rows = [], failRead = false, failInsert = false, nowIso } = {}) {
  const state = { rows: rows.map((r) => ({ ...r })), inserts: 0, attempts: 0 }
  const db = {
    state,
    from() {
      return {
        select() {
          const filters = []
          const q = {
            eq(col, val) { filters.push([col, val]); return q },
            order(col, { ascending }) {
              return {
                limit(n) {
                  if (failRead) return Promise.resolve({ data: null, error: { code: 'XX', message: 'read failed' } })
                  const data = state.rows
                    .filter((r) => filters.every(([c, v]) => r[c] === v))
                    .sort((a, b) => (ascending ? 1 : -1) * (Date.parse(a[col]) - Date.parse(b[col])))
                    .slice(0, n)
                    .map((r) => ({ created_at: r.created_at }))
                  return Promise.resolve({ data, error: null })
                },
              }
            },
          }
          return q
        },
        insert(row) {
          state.attempts++
          if (failInsert) return Promise.resolve({ error: { code: '42501', message: 'denied' } })
          if (state.rows.some((r) => r.id === row.id)) return Promise.resolve({ error: { code: '23505', message: 'duplicate' } })
          state.inserts++
          state.rows.push({ ...row, created_at: nowIso })
          return Promise.resolve({ error: null })
        },
      }
    },
  }
  return db
}

async function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let load, prices, value, stage, dl, ugc, mkt, model, biz, v2
  try {
    load = offlineModules({ replacements })
    prices = load(PRICES)
    value = load(VALUE)
    stage = load(STAGE)
    dl = load(DEADLINE)
    ugc = load(UGC)
    mkt = load(MKT)
    biz = load('lib/businessPlan.ts')
    v2 = load('lib/ads/v2Tiers.ts')
    model = load('components/pricing/TwoProductsPricing.tsx').twoProductsModelForPage()
  } catch (e) {
    return ['módulos carregam: ' + String(e && e.message)]
  }

  // ── 1. GARANTIA ÚNICA ────────────────────────────────────────────────────────────────────────────────────────────────
  if (prices.MONEY_BACK_GUARANTEE !== GUARANTEE) p.push(`garantia: frase ≠ a aprovada: ${prices.MONEY_BACK_GUARANTEE}`)
  if (prices.MONTHLY_REFUND_DAYS !== 7 || prices.ANNUAL_REFUND_DAYS !== 14) p.push('garantia: dias ≠ Termos (7 mensal / 14 anual)')
  if (/all plans|1 click|one click/i.test(String(prices.MONEY_BACK_GUARANTEE))) p.push('garantia: promete "all plans" ou "1 click"')
  const terms = src(TERMS)
  if (!terms.includes('money-back guarantee on the first paid month') || !terms.includes('within 7 days of the first charge') || !terms.includes('{ANNUAL_REFUND_POLICY}')) p.push('Termos §4 mudaram: a frase da garantia precisa ser reconferida')
  const client = src(CLIENT)
  const clientCode = semComentarios(client)
  if (!client.includes('a: `Yes. ${MONEY_BACK_GUARANTEE}`,')) p.push('FAQ: a resposta da garantia não é a frase única')
  if (!client.includes("{['Cancel anytime', MONEY_BACK_GUARANTEE].map((label) => (")) p.push('faixa de confiança: sem a frase única nos dois modos')
  if (/all plans|Works for all plans|Starter, Creator, and Studio come with|ANNUAL_REFUND_POLICY|refund 100%/.test(clientCode)) p.push('PricingClient: sobrou uma segunda versão da garantia')
  const stray = (clientCode.match(/7-day money-back/g) || []).length
  const autopilotOnly = (clientCode.match(/billed by Kineo · cancel anytime · 7-day money-back/g) || []).length
  if (stray !== autopilotOnly || autopilotOnly !== 2) p.push(`PricingClient: "7-day money-back" fora das 2 linhas do Autopilot oculto (${stray}/${autopilotOnly})`)
  if (!client.includes('data-testid="money-back-guarantee">\n                {MONEY_BACK_GUARANTEE}')) p.push('caixa de garantia do fim da página: sem a frase única')
  const up = semComentarios(src(UPGRADE))
  if (!up.includes('{MONEY_BACK_GUARANTEE} Cancel anytime. <a href="/terms">Terms</a>') || /ANNUAL_REFUND_POLICY|See the current refund terms/.test(up)) p.push('modal de upgrade: sem a frase única (ou com a versão antiga)')
  const proof = read('components/growth/MrrPricingProof.tsx')
  if (!proof.includes('not an automatic refund of your subscription payment. {MONEY_BACK_GUARANTEE} <a href="/terms">Terms</a>.') || proof.includes('7-day money-back guarantee:')) p.push('"How many films do I get?" (MrrPricingProof): sem a frase única')
  if (/\b1 click\b|one click/i.test(clientCode + up)) p.push('alguma superfície tocada promete "cancel in 1 click" (o portal da Stripe pede mais de um clique)')

  // ── 2a. PREÇO POR FILME — a MESMA régua do cartão e de lib/marketingPrice ────────────────────────────────────────
  const seedance60 = mkt.creditsPerReferenceVideo('cinematic_ai')
  for (const tier of ['starter', 'basic', 'pro']) {
    const credits = prices.TIER_CREDITS[tier]
    const v = stage.planValueForPage(credits)
    const film = value.planValueCardLines(v).film
    const monthly = prices.TIER_PRICES[tier].usd
    const pf = value.planValuePerFilm(v, monthly)
    if (!film || !pf) { p.push(`${tier}: sem filme de 60 s no cartão`); continue }
    if (film.creditsEach !== seedance60) p.push(`${tier}: o filme do cartão (${film.label}, ${film.creditsEach} cr) não é o Seedance 1.5 de lib/marketingPrice (${seedance60} cr)`)
    if (pf.count !== film.count || pf.count !== mkt.videosPerMonth(tier, 'cinematic_ai')) p.push(`${tier}: contagem ${pf.count} ≠ cartão ${film.count} / marketingPrice ${mkt.videosPerMonth(tier, 'cinematic_ai')}`)
    if (pf.perFilmMinor !== Math.round(monthly / film.count)) p.push(`${tier}: US$ por filme ${pf.perFilmMinor} ≠ round(${monthly}/${film.count})`)
    if (Math.abs(pf.perFilmMinor / 100 - mkt.costPerFilmUsd(tier)) > 0.00501) p.push(`${tier}: diverge de costPerFilmUsd (${mkt.costPerFilmUsd(tier)})`)
    const annualPf = value.planValuePerFilm(v, prices.ANNUAL_PRICES[tier].usd / 12)
    if (!annualPf || annualPf.perFilmMinor !== Math.round(prices.ANNUAL_PRICES[tier].usd / 12 / film.count)) p.push(`${tier}: US$ por filme do anual ≠ anual ÷ 12 ÷ filmes`)
  }
  if (value.planValuePerFilm(stage.planValueForPage(5), 990) !== null) p.push('plano que não fecha um filme ganhou "US$ por filme"')
  if (value.planValuePerFilm(stage.planValueForPage(150), 0) !== null || value.planValuePerFilm(stage.planValueForPage(150), null) !== null) p.push('sem preço, a linha por filme apareceu')
  // render do cartão (Creator, mensal): a linha por filme ao lado do preço e a garantia SOB o botão
  try {
    const credits = prices.TIER_CREDITS.basic
    const pf = value.planValuePerFilm(stage.planValueForPage(credits), prices.TIER_PRICES.basic.usd)
    const expected = `≈ ${pf.count} ${pf.count === 1 ? 'film' : 'films'} of 60 s · ≈ US$ ${Math.floor(pf.perFilmMinor / 100)}.${String(pf.perFilmMinor % 100).padStart(2, '0')} per film`
    const props = { tier: 'basic', name: 'Creator', popular: true, requested: false, selected: true, onSelect() {}, credits, amount: '$A', per: '/month', ctaLabel: 'Get Creator', ctaDisabled: false, onBuy() {}, save: 'SAVE-LINE', included: ['No watermark'], monthlyPriceMinor: prices.TIER_PRICES.basic.usd }
    const html = strip(renderToStaticMarkup(React.createElement(stage.PlanValueCard, props)))
    const iPrice = html.indexOf('class="pv-price"'), iPer = html.indexOf(expected), iCta = html.indexOf('class="pv-cta'), iG = html.indexOf(GUARANTEE)
    if (iPer < 0) p.push(`cartão: sem a linha "${expected}"`)
    if (!(iPrice < iPer && iPer < iCta)) p.push('cartão: a linha por filme não está ao lado do preço (entre o preço e o botão)')
    if (!(iG > iCta)) p.push('cartão: a garantia não está sob o botão de pagar')
    const bare = strip(renderToStaticMarkup(React.createElement(stage.PlanValueCard, { ...props, monthlyPriceMinor: undefined })))
    if (bare.includes('per film')) p.push('cartão sem preço mostrou "per film"')
  } catch (e) {
    p.push('render do cartão: ' + String(e && e.message))
  }
  if (!client.includes('monthlyPriceMinor={displayCurrency ? (annual ? getAnnualPrice(tier, resolvedCurrency, resolvedRegion) / 12 : getTierPrice(tier, resolvedCurrency, resolvedRegion)) : null}')) p.push('PricingClient: o cartão não recebe o preço CHEIO do caixa por mês')
  if (/US\$ ?\d|\$\d+\.\d\d per film/.test(semComentarios(src(STAGE)) + semComentarios(src(VALUE)) + clientCode)) p.push('preço por filme digitado em vez de calculado')

  // ── 2b. UGC HUMANO × ANÚNCIO NA KINEO ────────────────────────────────────────────────────────────────────────────
  if (ugc.UGC_CREATOR_LINE !== 'A human UGC creator typically charges US$ 150–500 per video (market estimate).') p.push(`UGC: frase de mercado mudou: ${ugc.UGC_CREATOR_LINE}`)
  if (!/Billo/.test(ugc.UGC_CREATOR_PRICE_SOURCE) || !/sync\.so\/blog\/ai-ugc/.test(ugc.UGC_CREATOR_PRICE_SOURCE)) p.push('UGC: a fonte (Billo via sync.so) sumiu do código')
  const levels = Object.values(v2.ADS_V2_TIERS).map((t) => v2.adsV2Credits(t.id, 15))
  const lo = Math.min(...levels), hi = Math.max(...levels)
  const starterUsd = prices.TIER_PRICES.starter.usd, starterCr = prices.TIER_CREDITS.starter
  const money = (m) => `${Math.floor(m / 100)}.${String(m % 100).padStart(2, '0')}`
  const adsExpected = `${ugc.UGC_CREATOR_LINE} On Kineo, a 15-second ad uses ${lo}–${hi} credits: about US$ ${money(Math.round(starterUsd * lo / starterCr))}–${money(Math.round(starterUsd * hi / starterCr))} of the Starter plan.`
  const adsGot = ugc.adsUgcComparisonLine({ planName: 'Starter', planPriceMinor: starterUsd, planCredits: starterCr, seconds: 15, adCredits: levels })
  if (adsGot !== adsExpected) p.push(`/ads: linha UGC ≠ conta (${adsGot})`)
  const bizExpected = `${ugc.UGC_CREATOR_LINE} On Business, each ${biz.BUSINESS_AD_SECONDS}-second ad works out to about US$ ${money(Math.round(biz.BUSINESS_PRICE_USD_MINOR / biz.BUSINESS_ADS_PER_MONTH))}.`
  if (ugc.businessUgcComparisonLine({ planPriceMinor: biz.BUSINESS_PRICE_USD_MINOR, adsPerMonth: biz.BUSINESS_ADS_PER_MONTH, seconds: biz.BUSINESS_AD_SECONDS }) !== bizExpected) p.push('Business: linha UGC ≠ preço ÷ anúncios do mês')
  const ads = src(ADS)
  if (!ads.includes('adsUgcComparisonLine({') || !ads.includes("planPriceMinor: getTierPrice('starter', 'usd', 'standard')") || !ads.includes('adCredits: V2_LEVELS.map((l) => l.credits)') || !ads.includes('{ugcLine ? <p className="ads-fine" data-kineo="ads-ugc-comparison">{ugcLine}</p> : null}')) p.push('/ads: a linha UGC não está ligada na seção Price com os números do caixa')
  const bizSrc = src(BIZ)
  if (!bizSrc.includes('businessUgcComparisonLine({ planPriceMinor: BUSINESS_PRICE_USD_MINOR, adsPerMonth: BUSINESS_ADS_PER_MONTH, seconds: BUSINESS_AD_SECONDS })') || !bizSrc.includes('{UGC_LINE ?')) p.push('Business: a linha UGC não está ligada')
  if (/150–500|150-500/.test(semComentarios(ads) + semComentarios(bizSrc))) p.push('número de mercado digitado na tela (mora só em lib/ads/ugcComparison.ts)')

  // ── 3a. PRAZO DE 48 h — executado ────────────────────────────────────────────────────────────────────────────────
  if (dl.WELCOME20_DEADLINE_HOURS !== 48 || dl.WELCOME20_DEADLINE_MS !== 48 * HOUR) p.push('prazo ≠ 48 h')
  const user = '11111111-2222-3333-4444-555555555555'
  const eventId = dl.welcome20DeadlineUuid(createHash('sha256').update(dl.welcome20DeadlineIdSeed(user)).digest('hex'))
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(eventId)) p.push('id do relógio não é uuid')
  const t0 = Date.parse('2026-10-16T12:00:00.000Z')
  try {
    const db = fakeDb({ nowIso: new Date(t0).toISOString() })
    const r0 = await dl.readWelcome20Deadline(db, user, t0)
    if (r0.state !== 'not_started') p.push(`sem linha: ${r0.state} ≠ not_started`)
    const s1 = await dl.startWelcome20Deadline(db, { userId: user, eventId, surface: 'pricing_deal_bar', nowMs: t0 })
    if (s1.state !== 'active' || s1.endsAt !== new Date(t0 + 48 * HOUR).toISOString() || db.state.inserts !== 1) p.push(`começar: ${JSON.stringify(s1)} / inserts ${db.state.inserts}`)
    const row = db.state.rows[0]
    if (!row || row.id !== eventId || row.name !== 'welcome20_deadline_started' || row.user_id !== user) p.push('linha do relógio sem id determinístico/nome/conta')
    // 2ª visita 10 h depois: NÃO reinicia
    const s2 = await dl.startWelcome20Deadline(db, { userId: user, eventId, surface: 'welcome_modal', nowMs: t0 + 10 * HOUR })
    if (s2.endsAt !== s1.endsAt || db.state.inserts !== 1 || db.state.attempts !== 1) p.push('o relógio reiniciou (ou tentou regravar) numa 2ª visita')
    const label = dl.welcome20DeadlineLabel(s2, t0 + 48 * 60 * 1000)
    if (label !== 'Ends in 47h 12m') p.push(`contagem: ${label} ≠ "Ends in 47h 12m"`)
    // vencido
    const late = t0 + 48 * HOUR
    const s3 = await dl.startWelcome20Deadline(db, { userId: user, eventId, surface: 'pricing_card', nowMs: late + HOUR })
    if (s3.state !== 'expired' || db.state.inserts !== 1 || db.state.attempts !== 1 || s3.endsAt !== s1.endsAt) p.push(`vencido: ${s3.state}, inserts ${db.state.inserts} (não pode recomeçar)`)
    if (dl.welcome20OfferAllowed('expired') !== false) p.push('vencido ainda deixa a oferta aparecer')
    if (dl.welcome20DeadlineLabel(s3, late + HOUR) !== null) p.push('vencido mostra contagem')
    const r4 = await dl.readWelcome20Deadline(db, user, late - 1)
    if (r4.state !== 'active') p.push('1 ms antes de 48 h já constava vencido')
    // duas linhas (corrida antiga): manda a MAIS ANTIGA
    const db2 = fakeDb({ rows: [
      { id: 'b', user_id: user, name: 'welcome20_deadline_started', created_at: new Date(t0 + 5 * HOUR).toISOString() },
      { id: 'a', user_id: user, name: 'welcome20_deadline_started', created_at: new Date(t0).toISOString() },
    ] })
    const r5 = await dl.readWelcome20Deadline(db2, user, t0 + 49 * HOUR)
    if (r5.state !== 'expired' || r5.startedAt !== new Date(t0).toISOString()) p.push('com duas linhas, não vale a mais antiga')
    // outra conta não conta
    const r6 = await dl.readWelcome20Deadline(db2, '99999999-2222-3333-4444-555555555555', t0)
    if (r6.state !== 'not_started') p.push('a linha de uma conta vale para outra')
    // falhas = unknown (nunca "acabou")
    const r7 = await dl.readWelcome20Deadline(fakeDb({ failRead: true }), user, t0)
    if (r7.state !== 'unknown' || dl.welcome20OfferAllowed('unknown') !== true) p.push('leitura que falha não é "unknown" com a oferta de sempre')
    const r8 = await dl.startWelcome20Deadline(fakeDb({ failInsert: true, nowIso: new Date(t0).toISOString() }), { userId: user, eventId, surface: 'checkout', nowMs: t0 })
    if (r8.state !== 'unknown') p.push('escrita que falha não é "unknown"')
    // 23505 (outra aba gravou antes): relê e usa a dela
    const db3 = fakeDb({ rows: [{ id: eventId, user_id: 'outra', name: 'x', created_at: new Date(t0).toISOString() }], nowIso: new Date(t0).toISOString() })
    const r9 = await dl.startWelcome20Deadline(db3, { userId: user, eventId, surface: 'checkout', nowMs: t0 })
    if (r9.state !== 'unknown') p.push('23505 sem linha desta conta deveria virar "unknown" (nunca contagem inventada)')
    if (dl.welcome20DeadlineFrom('lixo', t0).state !== 'unknown') p.push('data ilegível vira estado inventado')
  } catch (e) {
    p.push('relógio executado: ' + String(e && e.message))
  }
  const dec = (state, requestedWelcome, autoWelcome) => dl.welcome20CheckoutDecision({ state, requestedWelcome, autoWelcome })
  if (dec('expired', true, false) !== 'reject_requested' || dec('expired', false, true) !== 'block_auto' || dec('active', true, true) !== 'allow' || dec('unknown', false, true) !== 'allow' || dec('not_started', true, false) !== 'allow') p.push('régua do checkout errada')
  if (!/has ended\. You have not been charged\./.test(dl.WELCOME20_DEADLINE_ENDED_MESSAGE)) p.push('frase do link vencido não diz que nada foi cobrado')

  // ── 3b. fiação ───────────────────────────────────────────────────────────────────────────────────────────────────
  const route = src(CHECKOUT)
  const iDecide = route.indexOf('const deadlineDecision = welcome20CheckoutDecision({')
  const iAffiliate = route.indexOf("checkoutMetadata.public_promo_auto = 'affiliate'")
  const iSession = route.indexOf('stripe.checkout.sessions.create(', iDecide)
  const iAutoApply = route.indexOf('if (autoWelcome20 && !discountApplied && !promoBlocked && !privatePackPromo && !promisedPublicPromo) {')
  if (!(iAffiliate > 0 && iDecide > iAffiliate && iAutoApply > iDecide && iSession > iAutoApply)) p.push('checkout: a régua do prazo não roda antes do automático e da sessão da Stripe')
  const block = route.slice(iDecide, iDecide + 900)
  if (!block.includes("if (deadlineDecision === 'reject_requested') {") || !block.includes('return isGet ? redirectError(WELCOME20_DEADLINE_ENDED_MESSAGE) : jsonError(WELCOME20_DEADLINE_ENDED_MESSAGE, 409)')) p.push('checkout: link vencido não é recusado')
  if (!block.includes("if (deadlineDecision === 'block_auto') {\n      autoWelcome20 = false")) p.push('checkout: vencido ainda leva o WELCOME20 automático')
  if (!route.includes("if (autoWelcome20 || promisedPublicPromo === 'welcome_first_month_20') {")) p.push('checkout: a régua não cobre o automático e o pedido explícito')
  const iStart = route.indexOf('if (welcome20DeadlineStart && (promisedPublicPromoVerified || autoWelcome20Applied)) {')
  const iStarted = route.lastIndexOf("'checkout_started',", iStart)
  if (!(iStart > iStarted && iStarted > iSession && iSession > 0)) p.push('checkout: o relógio começa antes de a sessão com -20% existir')
  if (!/^\s*'welcome20_deadline_started',$/m.test(src(EVENTS))) p.push('o navegador pode cunhar welcome20_deadline_started (falta em SERVER_ONLY_EVENTS)')
  const api = src(API)
  const getBody = api.slice(api.indexOf('export async function GET'), api.indexOf('export async function POST'))
  if (getBody.includes('startWelcome20Deadline') || !api.slice(api.indexOf('export async function POST')).includes('startWelcome20Deadline(db, { userId, eventId, surface, nowMs: now })')) p.push('API: GET começa relógio ou POST não começa')
  if (!api.includes("if (!userId) return reply({ state: 'no_account', startedAt: null, endsAt: null })")) p.push('API: sem conta deveria responder no_account (sem prazo)')
  if (!client.includes('const welcome20Allowed = signedIn === false || (signedIn === true && welcomeDeadline.ready && welcomeDeadline.allowed)')) p.push('/pricing: a oferta não espera o servidor / não some com o vencido')
  if (!client.includes('&& !arrivedWithPromo && !planSwitch.subscribed && welcome20Allowed\n')) p.push('/pricing: o cartão (e o ?promo= do botão) não respeita o prazo')
  if (!client.includes('{PRICING_WELCOME20_ON_CARD && !arrivedWithPromo && !planSwitch.subscribed && welcome20Allowed ? (')) p.push('/pricing: a faixa não respeita o prazo')
  if (!client.includes('endsLabel={welcomeDeadline.label')) p.push('/pricing: a faixa não mostra a contagem')
  const bar = src(BAR)
  if (!bar.includes('{endsLabel ? <> · <span className="kdb-ends" data-testid="welcome20-ends">{endsLabel}</span></> : null}')) p.push('faixa: sem a contagem')
  const modal = src(MODAL)
  if (!modal.includes("const deadline = await fetchWelcome20Deadline('welcome_modal')\n        if (cancelled || !welcome20OfferAllowed(deadline.state)) return")) p.push('convite: abre com o prazo vencido')
  for (const [rel, needle] of [[LANDING, 'welcomeFirstMonth && welcomeLive &&'], [BUYCTA, 'buyCreatorPrice(welcomeLive)'], [FILM60, 'film60Copy(language, welcomeLive)']]) {
    if (!src(rel).includes(needle)) p.push(`${rel}: vitrine dos 20% não some com o prazo vencido`)
  }
  const hook = src(HOOK)
  if (!hook.includes('.then(({ data }) => (data.session ? fetchWelcome20Deadline(null) : null))')) p.push('vitrine secundária chama a rota para visitante sem sessão')
  if (/Date\.now\(\)\s*\+\s*WELCOME20_DEADLINE_MS|setItem\([^)]*deadline/i.test(hook + bar + modal + client)) p.push('o navegador calcula/guarda o próprio prazo (tem de vir do servidor)')
  const pend = resolve(root, 'migrations_pending')
  if (existsSync(pend) && readdirSync(pend).some((f) => /welcome20/i.test(f))) p.push('migration nova para o prazo (o desenho usa a tabela events, sem migration)')

  // ── marcador ────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const rel of FILES.filter((f) => f !== TERMS && f !== MKT)) if (!src(rel).includes(MARCA)) p.push(`${rel}: sem o marcador ${MARCA}`)
  return p
}

const troca = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${rel}: ${de.slice(0, 80)}`)
  return { [rel]: s.split(de).join(para) }
}
const MUTANTES = [
  ['garantia volta a "all plans"', troca(PRICES, '(${ANNUAL_REFUND_DAYS} days on annual plans).', '(all plans).')],
  ['FAQ volta à versão antiga', troca(CLIENT, 'a: `Yes. ${MONEY_BACK_GUARANTEE}`,', "a: `Yes — Starter, Creator, and Studio come with a 7-day money-back guarantee. We'll refund 100%.`,")],
  ['cartão sem a garantia sob o botão', troca(STAGE, '<p className="pv-guarantee" data-testid="plan-guarantee">{MONEY_BACK_GUARANTEE}</p>', '')],
  ['modal de upgrade volta à frase vaga', troca(UPGRADE, '{MONEY_BACK_GUARANTEE} Cancel anytime.', 'Monthly billing. Cancel anytime. See the current refund terms.')],
  ['preço por filme com a conta errada', troca(VALUE, 'Math.round(monthlyPriceMinor / film.count)', 'Math.round(monthlyPriceMinor / (film.count + 1))')],
  ['cartão não recebe o preço do caixa', troca(CLIENT, 'monthlyPriceMinor={displayCurrency ? (annual ? getAnnualPrice(tier, resolvedCurrency, resolvedRegion) / 12 : getTierPrice(tier, resolvedCurrency, resolvedRegion)) : null}', 'monthlyPriceMinor={1990}')],
  ['UGC com número trocado', troca(UGC, '{ low: 150, high: 500 }', '{ low: 100, high: 500 }')],
  ['prazo de 72 h', troca(DEADLINE, 'export const WELCOME20_DEADLINE_HOURS = 48', 'export const WELCOME20_DEADLINE_HOURS = 72')],
  ['relógio reinicia depois de vencer', troca(DEADLINE, "if (current.state !== 'not_started') return current", "if (current.state === 'active' || current.state === 'unknown') return current")],
  ['lê a linha mais nova', troca(DEADLINE, ".order('created_at', { ascending: true })", ".order('created_at', { ascending: false })")],
  ['vencido continua aparecendo', troca(DEADLINE, "return state !== 'expired'", 'return true')],
  ['link vencido vira preço cheio calado', troca(DEADLINE, "if (input.requestedWelcome) return 'reject_requested'", "if (input.requestedWelcome) return 'block_auto'")],
  ['checkout não desliga o automático do vencido', troca(CHECKOUT, "if (deadlineDecision === 'block_auto') {\n      autoWelcome20 = false", "if (deadlineDecision === 'block_auto') {\n      void autoWelcome20")],
  ['navegador pode cunhar o relógio', troca(EVENTS, "  'welcome20_deadline_started',\n", '')],
  ['cartão ignora o prazo', troca(CLIENT, '&& !arrivedWithPromo && !planSwitch.subscribed && welcome20Allowed\n', '&& !arrivedWithPromo && !planSwitch.subscribed\n')],
  ['convite abre com o prazo vencido', troca(MODAL, 'if (cancelled || !welcome20OfferAllowed(deadline.state)) return', 'if (cancelled) return')],
]

// O desfaz dos guardiões antigos (scripts/test-support/desfaz-checkout-clareza-1610.mjs) é EXATO: cada arquivo tocado,
// desfeito, é o pai do 1º commit com a marca (ou HEAD, antes do commit) — medido contra o pai, nunca contra a árvore.
const { execFileSync } = await import('node:child_process')
const { semClareza1610, CHECKOUT_CLAREZA_1610_ARQUIVOS } = await import('./test-support/desfaz-checkout-clareza-1610.mjs')
const gitOut = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 })
const meus = gitOut('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
const PAI = meus.length ? `${meus[meus.length - 1]}~1` : 'HEAD'
const desfazRuim = CHECKOUT_CLAREZA_1610_ARQUIVOS.filter((f) => {
  try { return semClareza1610(f, read(f)).replace(/\r\n/g, '\n') !== gitOut('show', `${PAI}:${f}`).replace(/\r\n/g, '\n') } catch { return true }
})
let failed = 0
if (desfazRuim.length || CHECKOUT_CLAREZA_1610_ARQUIVOS.length !== 15) { failed++; console.log(`FAIL desfaz não devolve o pai (${PAI}): ${desfazRuim.join(', ')}`) } else console.log(`PASS desfaz exato: ${CHECKOUT_CLAREZA_1610_ARQUIVOS.length} arquivos desfeitos = ${PAI}`)
const base = await problems()
if (base.length) { failed++; console.log('FAIL base:\n  - ' + base.join('\n  - ')) } else console.log('PASS base: garantia única, preço por filme, UGC e prazo de 48 h')
for (const [nome, rep] of MUTANTES) {
  const got = await problems(rep)
  if (got.length === 0) { failed++; console.log(`FAIL mutante sobreviveu: ${nome}`) } else console.log(`PASS mutante morto: ${nome} (${got[0].slice(0, 90)})`)
}
console.log(failed ? `${failed} falha(s)` : `OK — base verde e ${MUTANTES.length} mutantes mortos`)
if (failed) process.exitCode = 1
