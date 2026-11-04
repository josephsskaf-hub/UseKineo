// KINEO-AVULSO-UNICO-3110 [TRAVA 8.2 — vai do fundador 31/10 "2A"] — guardião da oferta avulsa ÚNICA de filme.
//   · Nenhuma tela oferece mais o pacote one_time_film35 (US$ 5 / 21 cr / 35 s): /pricing, parede de criação (PricingCards),
//     exit-intent do /pricing e caixa de upgrade mostram o passe de US$ 4,99 (?pack=starter = PACK_CREDITS.starter = 1 filme
//     Seedance 1.5 de 60 s), com a frase "Not ready for a plan? One 60-second film for $4.99, once".
//   · O passe é vendido por buildPackAndRedirect (preço de PACK_PRICE_MINOR) e entregue pelo webhook Path A (pack_credits, guard
//     checkout_fulfilled:<sessão>). O caminho do one_time_film35 no webhook continua de pé (sessão aberta ainda paga).
//   · O anúncio avulso (one_time_ad, US$ 9 / 41 cr) fica onde estava, inclusive sozinho no Studio Ads.
// EXECUTA o código real (loader offline, sem rede/banco/Stripe), varre app/ e components/ e lê a fiação; mutantes no fim.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const MARCA = 'KINEO-AVULSO-UNICO-3110'
const TRAVA = `${MARCA} [TRAVA 8.2 — vai do fundador 31/10 "2A"]`
const HELPER = 'lib/offers/avulsoUnico3110.ts'
const OTI = 'components/OneTimeItemOffer.tsx'
const OTI_LIB = 'lib/oneTimeItem.ts'
const EXIT = 'components/ExitIntentOffer.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
const PRICING_CARDS = 'components/PricingCards.tsx'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const MRR = 'lib/offers/mrrConversion.ts'
const GENERATE = 'app/(dashboard)/generate/GenerateClient.tsx'
const ADS = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const CHECKOUT = 'app/api/stripe/checkout/route.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const FULFILL = 'lib/stripe/oneTimeItemFulfillment.ts'
const PRICES = 'lib/checkoutPricing.ts'
const ENGINE = 'lib/credits/engineCost.ts'
const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const FILES = [HELPER, OTI, OTI_LIB, EXIT, PRICING, PRICING_CARDS, UPGRADE, MRR, GENERATE, ADS, CHECKOUT, WEBHOOK, FULFILL, PRICES]
const SRC = Object.fromEntries(FILES.map((rel) => [rel, read(rel)]))

// Varredura: toda tela (app/ e components/) — o one_time_film35 só pode aparecer em comentário. Rotas de servidor que ENTREGAM ou
// reconhecem o SKU (webhook, checkout item) ficam de fora: sessão aberta ainda tem de ser paga e entregue.
const SERVIDOR_PERMITIDO = new Set([WEBHOOK, 'app/api/stripe/checkout/item/route.ts', CHECKOUT])
function walk(dir, out = []) {
  for (const name of readdirSync(resolve(root, dir))) {
    const rel = `${dir}/${name}`
    const st = statSync(resolve(root, rel))
    if (st.isDirectory()) { if (name !== 'node_modules' && !name.startsWith('.')) walk(rel, out) } else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}
const TELAS = [...walk('app'), ...walk('components')].filter((rel) => !SERVIDOR_PERMITIDO.has(rel))
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')

async function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let helper, oti, otiLib, mrr, prices, engine
  try {
    // KINEO-PRECO-MERCADO-0411 — o avulso saiu da loja (fundador 04/11): o cartão segue provado com a flag ligada em memória; a venda fechada é provada abaixo sobre a fonte crua.
    const load = offlineModules({ replacements: { ...replacements, [OTI_LIB]: src(OTI_LIB).replace('export const ONE_TIME_ITEMS_LIVE = false', 'export const ONE_TIME_ITEMS_LIVE = true') }, mocks: { 'lib/analytics.ts': { trackEvent: async () => true }, 'lib/checkoutTelemetry.ts': { useCheckoutLaunch: () => ({ launch: () => false, pending: null, error: null }) } } })
    helper = load(HELPER); oti = load(OTI); otiLib = load(OTI_LIB); mrr = load(MRR); prices = load(PRICES); engine = load(ENGINE)
  } catch (e) {
    return ['módulos carregam: ' + String(e && e.stack || e)]
  }

  // ── 0. Fora da loja: nenhuma flag religada, nenhuma tela vende, a rota não cobra ─────────────────────────────
  if (!/export const ONE_TIME_ITEMS_LIVE = false/.test(src(OTI_LIB))) p.push('ONE_TIME_ITEMS_LIVE religado sem decisão do fundador')
  if (!/export const FILM_PASS_LIVE = false as boolean/.test(src(HELPER))) p.push('FILM_PASS_LIVE religado sem decisão do fundador')
  {
    const ckFora = src(CHECKOUT)
    const redirecao = "NextResponse.redirect(new URL('/pricing?from=no_one_time', req.url), 303)"
    if (!ckFora.includes("if (!FILM_PASS_LIVE) return " + redirecao + "\n      return await buildPackAndRedirect(req, true)")) p.push('rota: o fallback de ?pack= vende o passe com a loja fechada')
    if (!ckFora.includes("if (!FILM_PASS_LIVE) return " + redirecao + " // KINEO-PRECO-MERCADO-0411\n        return await buildStarter290AndRedirect(req, true)")) p.push('rota: ?pack=starter290 vende com a loja fechada')
    if (!/intent\.kind === 'pack' && !FILM_PASS_LIVE/.test(read('app/api/paypal/checkout/route.ts'))) p.push('PayPal vende o passe com a loja fechada')
    if (!/sku === 'first_pack' && !FILM_PASS_LIVE/.test(read('app/api/dodo/checkout/route.ts'))) p.push('Dodo vende o pacote com a loja fechada')
    const upFora = src(UPGRADE)
    if (!upFora.includes('return FILM_PASS_LIVE ? <ConversionPassCardVenda {...props} /> : null')) p.push('a parede ainda mostra o cartão do passe')
    if (!/!mostrar \|\| !FILM_PASS_LIVE/.test(read('components/RegionalFirstPack.tsx'))) p.push('a faixa regional ainda vende o passe')
  }
  // ── 1. O passe: preço, créditos e segundos das tabelas reais; 35 cr = exatamente 1 filme Seedance 1.5 de 60 s ──────────────
  if (prices.PACK_PRICE_MINOR.usd !== 499) p.push('o passe não custa mais US$ 4,99 (PACK_PRICE_MINOR) — decisão "2A" é o passe que já existia')
  const filme60 = engine.creditCostForDuration('cinematic_ai', true, 60)
  if (prices.PACK_CREDITS.starter !== filme60) p.push(`o passe concede ${prices.PACK_CREDITS.starter} cr e o filme de 60 s custa ${filme60}: a promessa "1 filme de 60 s" mente`)
  if (prices.PACK_ADVERTISED_SECONDS.starter !== 60) p.push('o passe deixou de anunciar 60 s')
  const offer = helper.filmPassOffer()
  if (offer.price !== '$4.99' || offer.seconds !== 60 || offer.credits !== prices.PACK_CREDITS.starter) p.push(`filmPassOffer() = ${JSON.stringify(offer)} (esperado $4.99 · 60 s · PACK_CREDITS.starter)`)
  if (offer.line !== 'One 60-second film for $4.99, once') p.push(`frase do passe: "${offer.line}"`)
  for (const s of ['pricing', 'generate_paywall', 'exit_intent']) {
    const href = helper.filmPassCheckoutHref(s)
    const q = new URL(href, 'https://x.test').searchParams
    if (!href.startsWith('/api/stripe/checkout?') || q.get('pack') !== 'starter' || q.get('return') !== 'studio' || q.get('intent_campaign') !== `${helper.AVULSO_UNICO_VERSION}_${s}`) p.push(`checkout do passe (${s}) errado: ${href}`)
  }
  if (helper.FILM_PASS_SKU !== 'starter10') p.push('FILM_PASS_SKU ≠ o SKU que o checkout grava (starter10)')
  // A rota vende ?pack=starter pelo construtor do passe, com o preço e os créditos das tabelas.
  const ck = src(CHECKOUT)
  if (!ck.includes('const PACK_PRICES: Record<Currency, number> = { usd: PACK_PRICE_MINOR.usd }') || !ck.includes('credits: PACK_CREDITS.starter,') || !/return await buildStarter290AndRedirect\(req, true\)\n\s+\}\n[\s\S]{0,300}return await buildPackAndRedirect\(req, true\)/.test(ck)) p.push('checkout: ?pack=starter não cai mais no buildPackAndRedirect com PACK_PRICE_MINOR/PACK_CREDITS.starter')
  if (!ck.includes("pack: 'starter10',\n      pack_credits: String(STARTER_PACK.credits),") || !ck.includes("? `${appUrl}/studio/create?resume=wall_v1&pack=starter&session_id={CHECKOUT_SESSION_ID}`")) p.push('checkout do passe sem metadata.pack/pack_credits ou sem a volta ao Studio (return=studio)')
  // Webhook: o passe é o Path A (pack_credits + guard da sessão); o one_time_film35 segue entregue pelo RPC (sessão aberta).
  const wh = src(WEBHOOK)
  if (!wh.includes("const metaCredits = Number(session.metadata?.pack_credits ?? 0)") || !wh.includes("const { error: packGuardError } = await supabase\n            .from('stripe_events')\n            .insert({ id: checkoutFulfillmentGuard })") || !wh.includes("const profileUpdate: Record<string, unknown> = { video_credits: next, has_paid: true }")) p.push('webhook: o Path A do passe (pack_credits + guard por sessão + has_paid) mudou')
  const iOne = wh.indexOf('if (isOneTimeItemSession(session)) {'), iLegacy = wh.indexOf('// ── Path A: Legacy one-time credit-pack purchase')
  if (iOne < 0 || iLegacy < 0 || iOne > iLegacy || !wh.slice(iOne, iLegacy).includes('await fulfillOneTimeItem(supabase, session)')) p.push('webhook: a sessão one_time_film35 ainda aberta deixou de ser entregue')
  if (!otiLib.isOneTimeItemId('one_time_film35') || !otiLib.oneTimeItemContractReady()) p.push('lib/oneTimeItem: o SKU one_time_film35 deixou de ser reconhecido (sessão aberta seria recusada)')

  // ── 2. Nenhuma tela oferece o pacote de US$ 5 ───────────────────────────────────────────────────────────────────────────────
  const telas = { ...Object.fromEntries(TELAS.map((rel) => [rel, null])) }
  for (const rel of Object.keys(telas)) {
    const code = semComentarios(replacements[rel] ?? (SRC[rel] ?? read(rel)))
    if (/one_time_film35/.test(code)) p.push(`tela ainda oferece o pacote de US$ 5 (one_time_film35): ${rel}`)
  }
  const html = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'pricing' }))
  const htmlWall = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'generate_paywall' }))
  for (const [nome, h] of [['/pricing', html], ['parede de criação', htmlWall]]) {
    for (const want of ['ONE-TIME PACK', 'Not ready for a plan? One 60-second film for $4.99, once.', '$4.99', '1 film of 60 s', `${prices.PACK_CREDITS.starter} credits: one 60-second Seedance 1.5 film`, '$9.00', '1 ad without a watermark', 'No subscription']) if (!h.includes(want)) p.push(`${nome}: o pacote não diz "${want}"`)
    for (const bad of ['$5.00', '35 s', '35-second', 'Buy just one']) if (h.includes(bad)) p.push(`${nome}: ainda mostra "${bad}" (o pacote de US$ 5)`)
  }
  const htmlPt = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'pricing', lang: 'pt' }))
  if (!htmlPt.includes('Um filme de 60 s por $4.99, uma vez.') || htmlPt.includes('35 s')) p.push('/pricing em português não fala do passe de 60 s')
  // O clique do filme abre o checkout do passe (nunca oneTimeItemCheckoutHref do filme).
  const o = src(OTI)
  if (!o.includes("if (sku === 'film_pass') { checkout.launch('film_pass', filmPassCheckoutHref(props.surface === 'generate_paywall' ? 'generate_paywall' : 'pricing'), { sku: FILM_PASS_SKU,")) p.push('OneTimeItemOffer: o cartão do filme não abre o checkout do passe')
  if (!o.includes(TRAVA)) p.push('OneTimeItemOffer sem a marca TRAVA 8.2')
  if (!src(PRICING).includes('<OneTimeItemOffer surface="pricing" checkout={checkout} />')) p.push('/pricing sem a oferta avulsa embaixo dos planos')
  if (!src(PRICING_CARDS).includes('<OneTimeItemOffer surface="generate_paywall" checkout={checkout} />')) p.push('parede de criação sem a oferta avulsa')
  // Exit-intent: a saída é o passe.
  const ex = src(EXIT)
  if (!ex.includes("filmPassCheckoutHref('exit_intent')") || !ex.includes("'film_pass',") || !ex.includes('`${filmPassOffer().line} →`') || !ex.includes('onClick={handleOneTimePack}') || !ex.includes('Not ready for a plan?{\' \'}')) p.push('exit-intent do /pricing não oferece o passe de US$ 4,99')
  if (!ex.includes(TRAVA)) p.push('exit-intent sem a marca TRAVA 8.2')
  // Caixa de upgrade (quem nunca pagou): o cartão do passe, com o preço e a capacidade das tabelas.
  const up = src(UPGRADE)
  if (!up.includes('onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />') || !up.includes('const offer = conversionPass()')) p.push('caixa de upgrade perdeu o passe avulso')
  const pass = mrr.conversionPass()
  if (pass.price !== '$4.99' || !pass.capacity.startsWith('1 film of 60s')) p.push(`caixa de upgrade: passe "${pass.price}" / "${pass.capacity}"`)
  if (!src(GENERATE).includes("withStudioReturn(withIntentCampaign('/api/stripe/checkout?pack=starter'))")) p.push('a parede do Studio deixou de abrir o checkout do passe (?pack=starter)')

  // ── 3. O anúncio avulso fica como está ──────────────────────────────────────────────────────────────────────────────────────
  if (prices.ONE_TIME_ITEM_USD_MINOR.one_time_ad !== 900 || otiLib.getOneTimeItem('one_time_ad').credits !== 41 || otiLib.oneTimeItemV1Credits('one_time_ad') !== 41) p.push('o anúncio avulso mudou (US$ 9 / 41 cr)')
  const htmlAds = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'ads_choice', newTab: true }))
  if (!htmlAds.includes('I only want 1 now') || !htmlAds.includes('$9.00') || htmlAds.includes('$4.99') || htmlAds.includes('ONE-TIME PACK') || !htmlAds.includes('pack=one_time_ad')) p.push('Studio Ads: a oferta mudou (tem de ser só o anúncio de US$ 9, em outra aba)')
  if (!src(ADS).includes('<OneTimeItemOffer surface="ads_choice" lang={lang} orderId={orderId || undefined} newTab busy={!!busy} />')) p.push('Studio Ads perdeu o anúncio avulso')
  return p
}

let failed = 0
const base = await problems()
console.log(base.length === 0 ? 'PASS oferta avulsa única: passe de US$ 4,99 no /pricing, parede, exit-intent e upgrade; US$ 5 fora; anúncio intacto' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  const s = SRC[rel]
  if (!s.includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { [rel]: s.replace(from, to) }
}
const MUTANTES = [
  ['passe religado sem decisão', muta(HELPER, 'export const FILM_PASS_LIVE = false as boolean', 'export const FILM_PASS_LIVE = true as boolean')],
  ['avulso religado sem decisão', muta(OTI_LIB, 'export const ONE_TIME_ITEMS_LIVE = false', 'export const ONE_TIME_ITEMS_LIVE = true')],
  ['fallback da rota volta a vender o passe', muta(CHECKOUT, "if (!FILM_PASS_LIVE) return NextResponse.redirect(new URL('/pricing?from=no_one_time', req.url), 303)\n      return await buildPackAndRedirect(req, true)", 'return await buildPackAndRedirect(req, true)')],
  ['o filme some do pacote', muta(OTI, "const DEFAULT_ITEMS: readonly ItemId[] = ['film_pass', 'one_time_ad']", "const DEFAULT_ITEMS: readonly ItemId[] = ['one_time_ad']")],
  ['título volta ao "Buy just one"', muta(OTI, '`Not ready for a plan? ${filmPassOffer().line}.`', "'Not ready for a plan? Buy just one.'")],
  ['cartão do filme abre o pacote de US$ 5', muta(OTI, "checkout.launch('film_pass', filmPassCheckoutHref(props.surface === 'generate_paywall' ? 'generate_paywall' : 'pricing'),", "checkout.launch('film_pass', oneTimeItemCheckoutHref('one_time_film35' as never, props.surface),")],
  ['exit-intent volta ao pacote de US$ 5', muta(EXIT, "filmPassCheckoutHref('exit_intent')", "oneTimeItemCheckoutHref('one_time_film35', 'pricing')")],
  ['preço do passe digitado', muta(HELPER, 'const price = packPriceLabel()', "const price = '$5.00'")],
  ['passe aponta para o SKU de US$ 5', muta(HELPER, 'pack=${FILM_PASS_PACK_PARAM}', 'pack=one_time_film35')],
  ['passe sem volta ao Studio', muta(HELPER, '&return=studio', '')],
  ['/pricing sem a oferta', muta(PRICING, '<OneTimeItemOffer surface="pricing" checkout={checkout} />', '')],
  ['parede de criação sem a oferta', muta(PRICING_CARDS, '<OneTimeItemOffer surface="generate_paywall" checkout={checkout} />', '')],
  ['caixa de upgrade sem o passe', muta(UPGRADE, 'onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />', 'null')],
  ['tela nova oferece o pacote de US$ 5', muta(PRICING_CARDS, '<OneTimeItemOffer surface="generate_paywall" checkout={checkout} />', '<OneTimeItemOffer surface="generate_paywall" checkout={checkout} /><a href={"/api/stripe/checkout?pack=one_time_film35"}>$5</a>')],
  ['anúncio avulso repreçado', muta(PRICES, 'one_time_ad: 900, one_time_film35: 500 }', 'one_time_ad: 700, one_time_film35: 500 }')],
  ['Studio Ads ganha o passe', muta(OTI, "items = surface === 'ads_choice' ? AD_ONLY : DEFAULT_ITEMS", 'items = DEFAULT_ITEMS')],
  ['passe concede menos que 1 filme de 60 s', muta(PRICES, '  starter: 35,\n  /** ?pack=starter290', '  starter: 21,\n  /** ?pack=starter290')],
  ['webhook deixa de entregar a sessão de US$ 5 aberta', muta(WEBHOOK, 'if (isOneTimeItemSession(session)) {', 'if (false) {')],
  ['webhook do passe sem guard da sessão', muta(WEBHOOK, '.insert({ id: checkoutFulfillmentGuard })\n          if (!packGuardError) {', '.insert({ id: `${checkoutFulfillmentGuard}:${Date.now()}` })\n          if (!packGuardError) {')],
]
for (const [nome, repl] of MUTANTES) {
  const r = await problems(repl)
  console.log(`${r.length ? 'PASS' : 'FAIL'} mutante "${nome}" ${r.length ? 'pego' : 'NÃO pego'}${r.length ? ' — ' + r[0] : ''}`)
  if (!r.length) failed++
}
if (failed) { console.log(`${failed} falha(s)`); process.exit(1) }
console.log(`OK — ${MUTANTES.length} mutantes pegos`)
