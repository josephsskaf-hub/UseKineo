// KINEO-DECISOES-PRECO-3110 — guardião das 4 decisões de preço do fundador (31/10, literal: "1 sim, 2 não, 3 sim, 4 sim").
//   1 SIM — conta 'region_paid_only' que JÁ GANHOU o filme grátis de região (evento region_free_film_granted, granted:true, até o
//           corte) pode usá-lo: a admissão do cinematic e a faixa do topo passam a aceitar SÓ essa conta.
//   2 NÃO — conta NOVA da região segue só paga: REGION_FREE_FILM_LIVE continua false (o cadastro concede 0), conta sem evento,
//           com evento DEPOIS do corte ou com leitura que falhou é recusada.
//   3 SIM — o pacote avulso (one_time_item_v1: 1 filme de 35 s / 1 anúncio, preços de lib/checkoutPricing.ts) aparece no /pricing
//           ("Not ready for a plan? ... ONE-TIME PACK"), na parede de criação e no exit-intent do /pricing; o webhook concede
//           de forma idempotente (RPC com recibo por stripe_session_id: a 2ª entrega da MESMA sessão não soma de novo).
//   4 SIM — /pricing abre no ANUAL e cada plano mostra "Save $X" = 12 × mensal − anual (as tabelas reais); a parede também.
// EXECUTA o código real (loader offline, sem rede/banco/Stripe) e lê a fiação das rotas; mutantes no fim — cada um fica vermelho.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { semAvulsoUnico3110 } from './test-support/desfaz-avulso-unico-3110.mjs' // KINEO-AVULSO-UNICO-3110 — a entrega mais nova sai primeiro

const MARCA = 'KINEO-DECISOES-PRECO-3110'
const POLICY = 'lib/freeFilmPolicy.ts'
const GRANT = 'lib/regionFreeFilmGrant.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const LAYOUT = 'app/(dashboard)/layout.tsx'
const BANNER = 'components/RegionPaidOnlyBanner.tsx'
const REVERSE = 'lib/reverseTrial.ts'
const OTI = 'components/OneTimeItemOffer.tsx'
const OTI_LIB = 'lib/oneTimeItem.ts'
const FULFILL = 'lib/stripe/oneTimeItemFulfillment.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const SQL = 'migrations_pending/2026-10-24_one_time_items.sql'
const EXIT = 'components/ExitIntentOffer.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
const PRICING_CARDS = 'components/PricingCards.tsx'
const MRR = 'lib/offers/mrrConversion.ts'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const HANDOFF = 'lib/growth/pricingPlanChoiceAttribution.ts'
const PRICES = 'lib/checkoutPricing.ts'
const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const FILES = [POLICY, GRANT, ROUTE, LAYOUT, BANNER, REVERSE, OTI, OTI_LIB, FULFILL, WEBHOOK, SQL, EXIT, PRICING, PRICING_CARDS, MRR, UPGRADE, HANDOFF, PRICES]
// KINEO-AVULSO-UNICO-3110 [TRAVA 8.2 — vai do fundador 31/10 "2A"] — a entrega mais nova trocou o filme de US$ 5 pelo passe de
// US$ 4,99 no pacote e no exit-intent; este guardião confere a decisão "3 sim" SEM ela (camada exata, desfeita primeiro). O passe tem
// o guardião próprio: scripts/test-avulso-unico-3110.mjs.
const SRC = Object.fromEntries(FILES.map((rel) => [rel, semAvulsoUnico3110(read(rel), rel)]))
const SEM_AVULSO = { [OTI]: SRC[OTI], [EXIT]: SRC[EXIT] }
// O helper de servidor importa o SDK do Supabase só para o caminho sem `db`; o guardião sempre passa um banco falso.
const GRANT_OFFLINE = (src) => src.replace(/import \{ createClient as createAdminClient, type SupabaseClient \} from '@supabase\/supabase-js'\n/, "const createAdminClient = () => { throw new Error('rede proibida') }\ntype SupabaseClient = any\n")

/** Banco falso de `events`: aplica os filtros encadeados e registra cada um. */
function fakeEventsDb(rows, { error = null } = {}) {
  const calls = []
  const q = { filters: [] }
  const chain = {
    select() { return chain },
    eq(col, val) { q.filters.push(['eq', col, val]); return chain },
    lte(col, val) { q.filters.push(['lte', col, val]); return chain },
    order() { return chain },
    limit() {
      calls.push(q.filters.slice())
      if (error) return Promise.resolve({ data: null, error })
      const out = rows.filter((r) => q.filters.every(([op, col, val]) => op === 'eq' ? r[col] === val : op === 'lte' ? Date.parse(r[col]) <= Date.parse(val) : true))
      return Promise.resolve({ data: out, error: null })
    },
  }
  return { db: { from(t) { if (t !== 'events') throw new Error('tabela inesperada ' + t); q.filters = []; return chain } }, calls }
}

async function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let pol, grant, oti, otiLib, fulfill, mrr, handoff, prices
  try {
    // KINEO-PRECO-MERCADO-0411 — o avulso saiu da loja (fundador 04/11); as decisões 3 e 4 seguem provadas com a flag ligada em memória, e a venda fechada logo abaixo.
    const load = offlineModules({ replacements: { ...SEM_AVULSO, ...replacements, [OTI_LIB]: src(OTI_LIB).replace('export const ONE_TIME_ITEMS_LIVE = false', 'export const ONE_TIME_ITEMS_LIVE = true'), [GRANT]: GRANT_OFFLINE(src(GRANT)) }, mocks: { 'lib/analytics.ts': { trackEvent: async () => true }, 'lib/checkoutTelemetry.ts': { useCheckoutLaunch: () => ({ launch: () => false, pending: null, error: null }) } } })
    pol = load(POLICY); grant = load(GRANT); oti = load(OTI); otiLib = load(OTI_LIB); fulfill = load(FULFILL); mrr = load(MRR); handoff = load(HANDOFF); prices = load(PRICES)
  } catch (e) {
    return ['módulos carregam: ' + String(e && e.stack || e)]
  }

  // ── 1/2. Régua do filme de região ──────────────────────────────────────────────────────────────────────────────
  if (pol.REGION_FREE_FILM_LIVE !== false) p.push('2 NÃO: REGION_FREE_FILM_LIVE tem de seguir false (conta nova não ganha filme)')
  if (pol.regionFreeFilmGrantCredits() !== 0) p.push('2 NÃO: o cadastro de região passou a conceder crédito de filme')
  if (pol.REGION_FREE_FILM_GRANTEES_LIVE !== true) p.push('1 SIM: REGION_FREE_FILM_GRANTEES_LIVE desligado')
  const cutoff = Date.parse(pol.REGION_FREE_FILM_GRANT_CUTOFF_ISO)
  if (!(cutoff > Date.parse('2026-10-28T21:25:17Z'))) p.push('corte antes da última concessão medida (28/10 21:25 UTC): premiado de verdade ficaria de fora')
  if (!(cutoff <= Date.parse('2026-10-31T00:00:00Z'))) p.push('corte depois da decisão: concessão futura entraria')
  const regiao = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 9 }
  const antes = { created_at: '2026-10-20T10:00:00Z', granted: true }
  const depois = { created_at: '2026-10-30T10:00:00Z', granted: true }
  if (!pol.regionFreeFilmGrantOnRecord(antes)) p.push('1 SIM: concessão antes do corte não conta')
  if (pol.regionFreeFilmGrantOnRecord(depois)) p.push('2 NÃO: concessão depois do corte conta')
  if (pol.regionFreeFilmGrantOnRecord({ created_at: antes.created_at, granted: false })) p.push('evento com granted:false conta')
  if (pol.regionFreeFilmGrantOnRecord(null)) p.push('sem evento conta')
  if (pol.regionFreeFilmEligibilityFor(regiao, true) !== 'eligible') p.push('1 SIM: premiado antes do corte NÃO é admitido')
  if (pol.regionFreeFilmEligibilityFor(regiao, false) === 'eligible') p.push('2 NÃO: conta nova da região (sem evento) admitida')
  if (pol.regionFreeFilmEligibilityFor(regiao, null) === 'eligible') p.push('leitura que falhou (null) admite — tem de falhar fechado')
  if (pol.regionFreeFilmEligibilityFor({ ...regiao, has_paid: true }, true) !== 'paid') p.push('quem pagou segue no filme grátis')
  if (pol.regionFreeFilmEligibilityFor({ ...regiao, trial_status: null }, true) !== 'not_region') p.push('conta fora da região admitida pela régua de região')
  if (pol.regionFreeFilmEligibilityFor(regiao, true, { granteesLive: false }) !== 'disabled') p.push('interruptor dos premiados desligado não volta ao de antes')
  if (pol.regionFreeFilmEligibilityFor(regiao, false, { live: true }) !== pol.regionFreeFilmEligibility(regiao, true)) p.push('com REGION_FREE_FILM_LIVE a régua mudou')
  if (!pol.regionFreeFilmAvailableFor(regiao, 0, true)) p.push('faixa: premiado com 0 vídeo e 9 cr não vê o filme')
  if (pol.regionFreeFilmAvailableFor({ ...regiao, video_credits: 8 }, 0, true)) p.push('faixa: saldo abaixo de 1 filme ainda mostra')
  if (pol.regionFreeFilmAvailableFor(regiao, 1, true)) p.push('faixa: quem já tem vídeo vê o filme grátis')
  if (pol.regionFreeFilmAvailableFor(regiao, 0, false)) p.push('faixa: conta nova vê "seu primeiro filme é grátis"')
  if (!pol.regionFreeFilmNeedsGrantRead(regiao) || pol.regionFreeFilmNeedsGrantRead({ ...regiao, has_paid: true }) || pol.regionFreeFilmNeedsGrantRead(regiao, { live: true })) p.push('regionFreeFilmNeedsGrantRead lê o evento fora da hora')
  if (pol.REGION_FREE_FILM_STRIP_LIVE !== true) p.push('faixa do filme desligada para os premiados')

  // Leitura de servidor (banco falso): filtra o evento certo, a conta e o corte; erro → null.
  const uid = 'u-1'
  const rows = [
    { name: 'region_free_film_granted', user_id: uid, created_at: '2026-10-20T10:00:00Z', metadata: { granted: true } },
    { name: 'region_free_film_granted', user_id: 'u-2', created_at: '2026-10-29T10:00:00Z', metadata: { granted: true } },
    { name: 'region_free_film_used', user_id: 'u-3', created_at: '2026-10-20T10:00:00Z', metadata: { granted: true } },
  ]
  const f1 = fakeEventsDb(rows)
  if ((await grant.readRegionFreeFilmGrantOnRecord(uid, f1.db)) !== true) p.push('leitura: premiado antes do corte não lido como true')
  const filtros = (f1.calls[0] || []).map((f) => f.join(':')).join(' ')
  if (!filtros.includes('eq:name:region_free_film_granted')) p.push('leitura não filtra o evento de concessão')
  if (!filtros.includes(`eq:user_id:${uid}`)) p.push('leitura não filtra a conta')
  if (!filtros.includes(`lte:created_at:${pol.REGION_FREE_FILM_GRANT_CUTOFF_ISO}`)) p.push('leitura não aplica o corte no banco')
  if ((await grant.readRegionFreeFilmGrantOnRecord('u-2', fakeEventsDb(rows).db)) !== false) p.push('leitura: concessão depois do corte vira true')
  if ((await grant.readRegionFreeFilmGrantOnRecord('u-3', fakeEventsDb(rows).db)) !== false) p.push('leitura: outro evento vira concessão')
  if ((await grant.readRegionFreeFilmGrantOnRecord(uid, fakeEventsDb(rows, { error: { message: 'x' } }).db)) !== null) p.push('leitura que falha não devolve null')

  // Fiação da rota (TRAVA 8.2): a admissão lê a concessão, usa a régua nova e a trava depois do claim continua.
  const r = src(ROUTE)
  if (!r.includes(`${MARCA} [TRAVA 8.2 — vai do fundador 31/10 "1 sim, 2 não, 3 sim, 4 sim"]`)) p.push('rota sem a marca TRAVA 8.2')
  if (!/const regionGrantOnRecord3110: boolean \| null = !isPaidUser && !trialActive && regionFreeFilmNeedsGrantRead\(profile\) \? await readRegionFreeFilmGrantOnRecord\(user\.id\) : false/.test(r)) p.push('rota não lê a concessão para a conta de região')
  if (!r.includes('const regionFreeFilmAdmitted: boolean = (REGION_FREE_FILM_LIVE || regionGrantOnRecord3110 === true) && !isPaidUser && !trialActive && costQuality === REGION_FREE_FILM_QUALITY && duration === REGION_FREE_FILM_SECONDS')) p.push('admissão do cinematic não aceita o premiado (ou perdeu Seedance/15 s)')
  if (!r.includes('const elegivelRegiao = regionFreeFilmEligibilityFor(profile, regionGrantOnRecord3110)')) p.push('admissão não usa a régua dos premiados')
  if (!r.includes('regionFreeFilmExclusive({ otherActiveHold: outroPedidoRegiao, lifetimeCinematicDebits: debitosNaVida })')) p.push('a trava de 1 filme por conta (depois do claim) sumiu')
  if (!r.includes('if ((REGION_FREE_FILM_LIVE || regionGrantOnRecord3110 === true) && profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) return NextResponse.json({ error: REGION_FREE_FILM_REFUSAL')) p.push('premiado fora do filme (outro motor) ouve "não disponível no seu país"')
  if (!/if \(profile\?\.trial_status === REGION_PAID_ONLY_TRIAL_STATUS\) \{\n\s+return NextResponse\.json\(\n\s+\{ error: REGION_PAID_ONLY_REFUSAL/.test(r)) p.push('2 NÃO: a recusa da conta nova ("not available in your country") sumiu')
  // O cadastro continua sem conceder (a concessão só roda com REGION_FREE_FILM_LIVE).
  const rv = src(REVERSE)
  if (!rv.includes('if (markedPais && REGION_FREE_FILM_LIVE)') || rv.includes('REGION_FREE_FILM_GRANTEES_LIVE')) p.push('2 NÃO: lib/reverseTrial.ts concede filme fora do interruptor')
  // A faixa do topo: o layout lê a concessão e o componente aceita o premiado.
  const lay = src(LAYOUT)
  if (!lay.includes('await readRegionFreeFilmGrantOnRecord(user.id)') || !lay.includes('regionFreeFilmAvailableFor(regionProfile3110, videosCount, regionGrant3110)') || !lay.includes('{user && regionFilmOpen3110')) p.push('layout não mostra o filme ao premiado')
  if (!src(BANNER).includes('const film = useRegionFilmGift(REGION_FREE_FILM_STRIP_LIVE && freeFilm)') || !src(BANNER).includes('if (REGION_FREE_FILM_STRIP_LIVE && film) return <RegionFreeFilmStrip />')) p.push('faixa ignora o premiado (lê só REGION_FREE_FILM_LIVE)')

  // ── 3. Pacote avulso ───────────────────────────────────────────────────────────────────────────────────────────
  if (!/export const ONE_TIME_ITEMS_LIVE = false/.test(src(OTI_LIB))) p.push('ONE_TIME_ITEMS_LIVE religado sem decisão do fundador (04/11: "tira o avulso")')
  if (prices.ONE_TIME_ITEM_USD_MINOR.one_time_film35 !== 500 || prices.ONE_TIME_ITEM_USD_MINOR.one_time_ad !== 900) p.push('preço do avulso mudou (decisão do fundador: não inventar preço)')
  if (otiLib.getOneTimeItem('one_time_film35').credits !== otiLib.oneTimeItemV1Credits('one_time_film35') || otiLib.getOneTimeItem('one_time_ad').credits !== otiLib.oneTimeItemV1Credits('one_time_ad') || !otiLib.oneTimeItemContractReady()) p.push('contrato V1 do avulso (créditos × preço) quebrado — o checkout recusaria')
  const html = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'pricing' }))
  for (const want of ['ONE-TIME PACK', 'Not ready for a plan?', '$5.00', '$9.00', 'No subscription']) if (!html.includes(want)) p.push(`/pricing: o pacote não diz "${want}"`)
  const htmlAds = renderToStaticMarkup(React.createElement(oti.OneTimeItemOfferView, { surface: 'ads_choice' }))
  if (!htmlAds.includes('I only want 1 now') || htmlAds.includes('ONE-TIME PACK')) p.push('Studio Ads perdeu o título dele')
  if (!src(PRICING).includes('<OneTimeItemOffer surface="pricing" checkout={checkout} />')) p.push('/pricing sem o pacote embaixo dos planos')
  if (!src(PRICING_CARDS).includes('<OneTimeItemOffer surface="generate_paywall" checkout={checkout} />')) p.push('parede de criação sem o pacote')
  const ex = src(EXIT)
  if (!ex.includes("oneTimeItemCheckoutHref('one_time_film35', 'pricing')") || !/\{ONE_TIME_ITEMS_LIVE \? \(/.test(ex) || !ex.includes('onClick={handleOneTimePack}')) p.push('exit-intent do /pricing sem o pacote')
  if (!src(UPGRADE).includes('onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />')) p.push('a parede (modal) perdeu o passe avulso de quem nunca pagou')
  // Webhook idempotente: a sessão avulsa sai ANTES dos caminhos legados e a concessão é o RPC com recibo único.
  const wh = src(WEBHOOK)
  const iOne = wh.indexOf('if (isOneTimeItemSession(session)) {'), iLegacy = wh.indexOf('// ── Path A: Legacy one-time credit-pack purchase')
  if (iOne < 0 || iLegacy < 0 || iOne > iLegacy || !/await fulfillOneTimeItem\(supabase, session\)[\s\S]{0,900}break \/\/ KINEO-COMPRA-AVULSA-2410/.test(wh.slice(iOne, iLegacy))) p.push('webhook: o avulso cai nos caminhos legados (concessão por valor)')
  const sql = src(SQL)
  if (!/stripe_session_id text primary key/.test(sql) || !sql.includes('on conflict (stripe_session_id) do nothing;') || !/if v_inserted = 0 then[\s\S]{0,900}return false;/.test(sql)) p.push('SQL: o recibo por sessão não é único / a 2ª entrega soma de novo')
  if (sql.indexOf('on conflict (stripe_session_id) do nothing;') > sql.indexOf('set video_credits = coalesce(video_credits, 0) + p_credits')) p.push('SQL: soma o saldo antes de gravar o recibo')
  // Executado: duas entregas da MESMA sessão Stripe → 1 concessão (o RPC falso segue o contrato do SQL).
  const granted = new Map(); let balance = 0
  const admin = { rpc: async (fn, a) => { if (fn !== 'fulfill_one_time_item') return { data: null, error: { message: 'fn' } }; if (granted.has(a.p_session_id)) return { data: false, error: null }; granted.set(a.p_session_id, a.p_credits); balance += a.p_credits; return { data: true, error: null } } }
  const session = { id: 'cs_test_1', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: 500, client_reference_id: 'u-9', metadata: { pack: 'one_time_film35', supabase_user_id: 'u-9', one_time_item_version: otiLib.ONE_TIME_ITEM_VERSION, pack_credits: '21', surface: 'pricing' } }
  try {
    const a1 = await fulfill.fulfillOneTimeItem(admin, session), a2 = await fulfill.fulfillOneTimeItem(admin, session)
    if (a1 !== true || a2 !== false || balance !== 21) p.push(`webhook: 2 entregas da mesma sessão deram ${balance} cr (esperado 21 uma vez)`)
  } catch (e) { p.push('webhook: entrega válida do avulso lançou ' + e.message) }
  try { await fulfill.fulfillOneTimeItem(admin, { ...session, id: 'cs_test_2', amount_total: 100 }); p.push('webhook: valor adulterado concedeu') } catch { /* recusa: certo */ }

  // ── 4. Anual pré-selecionado + "Save $X" ───────────────────────────────────────────────────────────────────────
  if (handoff.pricingBillingHandoff({}).initialBilling !== 'annual') p.push('4 SIM: /pricing não abre no anual')
  if (handoff.pricingBillingHandoff({ billing: 'monthly' }).initialBilling !== 'monthly') p.push('?billing=monthly explícito deixou de abrir no mensal')
  if (!src(PRICING).includes("export default function PricingClient({ initialBilling = 'annual' }")) p.push('PricingClient não nasce no anual')
  const esperado = { starter: 900 * 12 - 5400, basic: 1900 * 12 - 11400, pro: 5900 * 12 - 35400 } // KINEO-PRECO-MERCADO-0411
  for (const tier of ['starter', 'basic', 'pro']) {
    if (prices.TIER_PRICES[tier].usd * 12 - prices.ANNUAL_PRICES[tier].usd !== esperado[tier]) p.push(`preço do plano ${tier} mudou (mensal/anual)`)
    const s = mrr.annualSavingMinor(tier, 'usd', 'standard')
    if (s !== prices.getTierPrice(tier, 'usd') * 12 - prices.getAnnualPrice(tier, 'usd')) p.push(`Save $X do ${tier} ≠ 12 × mensal − anual`)
    const plan = mrr.conversionPlan(tier, 'annual', 'usd', 'standard')
    if (plan.annualSaving !== prices.formatCheckoutMoney('usd', esperado[tier])) p.push(`parede: "Save ${plan.annualSaving}/yr" no ${tier}, esperado ${prices.formatCheckoutMoney('usd', esperado[tier])}`)
    if (mrr.conversionPlan(tier, 'monthly', 'usd', 'standard').annualSaving !== null) p.push(`mensal do ${tier} mostra economia do anual`)
  }
  if (!src(PRICING).includes('const annualSavingMinor = getTierPrice(tier, resolvedCurrency, resolvedRegion) * 12 - getAnnualPrice(tier, resolvedCurrency, resolvedRegion)') || !src(PRICING).includes('<>Save <b>{formatCheckoutMoney(resolvedCurrency, annualSavingMinor)}</b> a year compared to monthly</>')) p.push('/pricing: o cartão perdeu o "Save $X a year" da conta real')
  if (!src(UPGRADE).includes("useState<ConversionBilling>('annual')") || !src(UPGRADE).includes('Save {plan.annualSaving}/yr')) p.push('parede: anual não pré-selecionado ou sem "Save $X/yr"')
  return p
}

let failed = 0
const base = await problems()
console.log(base.length === 0 ? 'PASS decisões de preço 31/10 (filme dos premiados, conta nova paga, pacote avulso idempotente, anual + Save $X)' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  const s = SRC[rel]
  if (!s.includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { [rel]: s.replace(from, to) }
}
const MUTANTES = [
  ['conta nova da região admitida', muta(POLICY, "return grantOnRecord === true ? 'eligible' : 'disabled'", "return 'eligible'")],
  ['leitura que falha admite', muta(POLICY, "return grantOnRecord === true ? 'eligible' : 'disabled'", "return grantOnRecord !== false ? 'eligible' : 'disabled'")],
  ['corte ignorado', muta(POLICY, 'return Number.isFinite(at) && Number.isFinite(cutoff) && at <= cutoff', 'return true')],
  ['filme ligado para todos (conta nova ganha)', muta(POLICY, 'export const REGION_FREE_FILM_LIVE = false', 'export const REGION_FREE_FILM_LIVE = true')],
  ['premiados desligados', muta(POLICY, 'export const REGION_FREE_FILM_GRANTEES_LIVE = true', 'export const REGION_FREE_FILM_GRANTEES_LIVE = false')],
  ['leitura sem corte no banco', muta(GRANT, "      .lte('created_at', REGION_FREE_FILM_GRANT_CUTOFF_ISO)\n", '')],
  ['leitura que falha vira false', muta(GRANT, 'if (error || !Array.isArray(data)) return null', 'if (error || !Array.isArray(data)) return false')],
  ['rota ignora o premiado', muta(ROUTE, '(REGION_FREE_FILM_LIVE || regionGrantOnRecord3110 === true) && !isPaidUser', 'REGION_FREE_FILM_LIVE && !isPaidUser')],
  ['rota sem a régua nova', muta(ROUTE, 'const elegivelRegiao = regionFreeFilmEligibilityFor(profile, regionGrantOnRecord3110)', 'const elegivelRegiao = regionFreeFilmEligibility(profile)')],
  ['faixa ignora o premiado', muta(BANNER, 'const film = useRegionFilmGift(REGION_FREE_FILM_STRIP_LIVE && freeFilm)', 'const film = useRegionFilmGift(REGION_FREE_FILM_LIVE && freeFilm)')],
  ['avulso religado sem decisão', muta(OTI_LIB, 'export const ONE_TIME_ITEMS_LIVE = false', 'export const ONE_TIME_ITEMS_LIVE = true')],
  ['pricing sem o pacote', muta(PRICING, '<OneTimeItemOffer surface="pricing" checkout={checkout} />', '')],
  ['pacote sem "Not ready for a plan?"', muta(OTI, "'Not ready for a plan? Buy just one.'", "'I only want 1 now'")],
  ['exit-intent sem o pacote', muta(EXIT, 'onClick={handleOneTimePack}', 'onClick={handleIntroStarter}')],
  ['webhook muda a chave de idempotência a cada entrega', muta(FULFILL, 'p_session_id: session.id, p_user_id: userId', 'p_session_id: `${session.id}:${Math.random()}`, p_user_id: userId')],
  ['SQL sem recibo único', muta(SQL, 'on conflict (stripe_session_id) do nothing;', ';')],
  ['webhook sem o desvio do avulso', muta(WEBHOOK, 'if (isOneTimeItemSession(session)) {', 'if (false) {')],
  ['Save $X conta 11 meses', muta(MRR, 'getTierPrice(tier, currency, region) * 12 - getAnnualPrice(tier, currency, region)', 'getTierPrice(tier, currency, region) * 11 - getAnnualPrice(tier, currency, region)')],
  ['/pricing abre no mensal', muta(HANDOFF, "requestedBilling ?? 'annual'", "requestedBilling ?? 'monthly'")],
  ['parede sem Save $X/yr', muta(UPGRADE, 'Save {plan.annualSaving}/yr', 'Save more')],
]
for (const [nome, repl] of MUTANTES) {
  const r = await problems(repl)
  console.log(`${r.length ? 'PASS' : 'FAIL'} mutante "${nome}" ${r.length ? 'pego' : 'NÃO pego'}${r.length ? ' — ' + r[0] : ''}`)
  if (!r.length) failed++
}
if (failed) { console.log(`${failed} falha(s)`); process.exit(1) }
console.log(`OK — ${MUTANTES.length} mutantes pegos`)
