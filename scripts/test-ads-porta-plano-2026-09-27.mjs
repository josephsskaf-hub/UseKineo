// KINEO-ADS-PORTA-PLANO-2026-09-27 — guardião do item A (ciclo B da sprint de 16 h, dom 27/09, alvo MRR): a porta /ads para
// quem quis fazer anúncio sem plano. Dado do dia: 2 pessoas logadas sem acesso abriram /ads/new, foram devolvidas a /ads sem
// uma palavra e /ads só oferecia o passe — nunca o Starter, que inclui o Studio Ads e custa menos. Agora: o gate devolve a
// /ads?from=new; a porta mostra DUAS portas (Starter primeiro, passe intacto) para quem não tem gate 'ok'; uma faixa no topo
// explica a quem voltou; ads_page_viewed ganha plan_offer + from; o clique no Starter vira ads_door_plan_clicked.
// Cada prova TRAVA o literal antigo (= 0) e prova o novo POR DERIVAÇÃO (preço/créditos/contagem nunca digitados). Só
// readFileSync (sem alias @/); o que é executado (formatCheckoutMoney, getTierPrice, TIER_CREDITS, adsAccessReason,
// decideEngineGate) roda pelo loader offline. Mutantes em memória no bloco 6.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const count = (s, needle) => s.split(needle).length - 1
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()

const PAGE = rd('app/(dashboard)/ads/new/page.tsx')
const DOOR = rd('app/ads/page.tsx')
const BANNERS = rd('app/ads/AdsPageBanners.tsx')
const WIZARD = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const ROUTE = rd('app/api/stripe/checkout/route.ts') // só leitura
const PORTAL = rd('app/api/stripe/portal/route.ts') // só leitura

// ── 1. /ads/new: o gate no_access devolve a /ads?from=new e o evento grava o destino ──
checa('1a. "redirect(\'/ads\')" literal = 0 em ads/new/page.tsx (a devolução muda nunca volta)', count(PAGE, "redirect('/ads')") === 0)
checa('1b. o gate no_access (e só ele) devolve a /ads?from=new', /if \(gate === 'no_access' && !resumingPass\) \{[\s\S]*?redirect\('\/ads\?from=new'\)/.test(PAGE) && count(PAGE, "redirect('/ads?from=new')") === 1)
checa('1c. ads_access_denied continua igual (stage/who/reason) e ganha metadata.redirect com o mesmo destino', PAGE.includes("metadata: { stage: 'page', who: 'no_access', reason, redirect: '/ads?from=new' } })"))
checa('1d. o ramo anônimo e o ?resume=pass não mudaram (um redirect ao /login, painel anônimo intacto)', count(PAGE, 'redirect(`/login') === 1 && PAGE.includes('<AdsWizardClient gate="anon" access="none" resumingPass={false} />'))

// ── 2. /ads deriva tudo: nome, preço, créditos e contagem nascem de lib/, nunca digitados ──
const cpImport = DOOR.match(/import \{ ([^}]*) \} from '@\/lib\/checkoutPricing'/)
const cpNames = cpImport ? cpImport[1].split(',').map((s) => s.trim()) : []
checa('2a. page.tsx importa TIER_CREDITS, formatCheckoutMoney e getTierPrice de @/lib/checkoutPricing', ['TIER_CREDITS', 'formatCheckoutMoney', 'getTierPrice'].every((n) => cpNames.includes(n)))
const offerImport = DOOR.slice(DOOR.indexOf('import {\n  ADS_PASS_ACCESS_DAYS'), DOOR.indexOf("} from '@/lib/ads/offer'"))
checa('2b. KINEO1_35S_CREDITS continua vindo do import de @/lib/ads/offer', offerImport.includes('KINEO1_35S_CREDITS,'))
checa('2c. o nome do plano vem de planName (lib/growth/planFit.ts, só lido), não digitado', /import \{ planName \} from '@\/lib\/growth\/planFit'/.test(DOOR) && DOOR.includes("const starterName = planName('starter')"))
checa('2d. preço derivado: formatCheckoutMoney(\'usd\', getTierPrice(\'starter\', \'usd\', \'standard\'))', DOOR.includes("const starterPrice = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))"))
checa('2e. anúncios por mês derivados: Math.floor(TIER_CREDITS.starter / KINEO1_35S_CREDITS)', DOOR.includes('const starterAds35 = Math.floor(TIER_CREDITS.starter / KINEO1_35S_CREDITS)'))
const TYPED = /9[.,]90|\b60 credits\b|\b20 ads\b|US\$9\b/
checa('2f. nenhum preço/crédito/contagem digitado ("9.90", "60 credits", "20 ads", "US$9") em app/ads/page.tsx', !TYPED.test(DOOR))
const cp = load('lib/checkoutPricing.ts')
const offer = load('lib/ads/offer.ts')
const starterPrice = cp.formatCheckoutMoney('usd', cp.getTierPrice('starter', 'usd', 'standard'))
checa('2g. EXECUTADO: o preço do Starter é moeda formatada a partir de TIER_PRICES e é outro número que o passe', /^\$\d+\.\d{2}$/.test(starterPrice) && starterPrice === cp.formatCheckoutMoney('usd', cp.TIER_PRICES.starter.usd) && cp.TIER_PRICES.starter.usd !== offer.ADS_PASS_USD_MINOR)
const ads35 = Math.floor(cp.TIER_CREDITS.starter / offer.KINEO1_35S_CREDITS)
checa('2h. EXECUTADO: "About N ads of 35 s" com N inteiro ≥ 1 e N × custo ≤ créditos mensais do Starter', Number.isInteger(ads35) && ads35 >= 1 && ads35 * offer.KINEO1_35S_CREDITS <= cp.TIER_CREDITS.starter)
checa('2i. EXECUTADO: o Starter custa menos que o passe — a razão de vir primeiro', cp.getTierPrice('starter', 'usd', 'standard') < offer.ADS_PASS_USD_MINOR)

// ── 3. a porta Starter: href que o checkout aceita, copy só com fato que o código cumpre, passe intacto ao lado ──
const hrefLine = DOOR.match(/const STARTER_CHECKOUT_HREF = '([^']*)'/)
const hrefParams = hrefLine ? (hrefLine[1].split('?')[1] ?? '').split('&') : []
checa('3a. href do Starter: /api/stripe/checkout com tier=starter, billing=monthly e intent_campaign=ads_door', !!hrefLine && hrefLine[1].startsWith('/api/stripe/checkout?') && ['tier=starter', 'billing=monthly', 'intent_campaign=ads_door'].every((p) => hrefParams.includes(p)))
checa('3b. o GET do checkout LÊ tier, billing e intent_campaign (app/api/stripe/checkout/route.ts, só leitura)', ROUTE.includes("req.nextUrl.searchParams.get('tier')") && ROUTE.includes("req.nextUrl.searchParams.get('billing') === 'annual'") && ROUTE.includes("req.nextUrl.searchParams.get('intent_campaign')"))
const sanitizer = ROUTE.match(/function intentCampaignFrom\(req: NextRequest\)[^\n]*\n[^\n]*\n\s+return (\/\^[^/]+\/)\.test\(raw\)/)
checa('3c. "ads_door" passa pelo sanitizador de intent_campaign (regex lida do route.ts, não copiada)', !!sanitizer && new RegExp(sanitizer[1].slice(1, -1)).test('ads_door'))
checa('3d. nenhum parâmetro de retorno inventado: o GET de assinatura só conhece return=wm (→ /generate); success_url é /checkout/success', !/return=|redirect=|next=/.test(hrefLine ? hrefLine[1] : 'return=') && ROUTE.includes("const returnToWatermark = req.nextUrl.searchParams.get('return') === 'wm'") && ROUTE.includes("return_to: returnToWatermark ? 'watermark_moment' : 'checkout_success'"))
checa('3e. sem sessão o checkout de assinatura leva ao /signup carregando a URL inteira e a retoma (o anônimo não perde a intenção)', ROUTE.includes("return NextResponse.redirect(`${appUrl}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`)"))
const doorStart = DOOR.indexOf('{planOffer ? (')
const doorBlock = DOOR.slice(doorStart, DOOR.indexOf('<div className="cost ads-price">', doorStart))
checa('3f. a porta Starter vem PRIMEIRO (antes do card do passe) e usa AdsCtaLink cta="plan" tier="starter" from={from}', doorStart > 0 && doorBlock.includes('<div className="cost ads-price ads-plan" data-kineo="ads-door-plan">') && doorBlock.includes('<AdsCtaLink href={STARTER_CHECKOUT_HREF} cta="plan" tier="starter" from={from} placement="price" className="go ok ads-go">'))
// REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): a porta vende o anúncio v2; a linha de cobertura do Starter passou a dizer
// quantos anúncios NOVOS o crédito paga (em qualquer nível) e, depois, os clássicos de 35 s. A intenção segue: tudo interpolado.
checa('3g. copy da porta interpolada: "<nome> plan", "<preço> /month", "{TIER_CREDITS.starter} credits every month: {newAdsLabel(starterV2)}, or about {starterAds35} classic ads of 35 s.", CTA "Get <nome> · <preço>/mo"', doorBlock.includes('<div className="sum">{starterName} plan</div>') && doorBlock.includes('<p className="ads-amount">{starterPrice}<span> /month</span></p>') && doorBlock.includes('{TIER_CREDITS.starter} credits every month: {newAdsLabel(starterV2)}, or about {starterAds35} classic ads of 35 s.') && doorBlock.includes('Get {starterName} · {starterPrice}/mo'))
checa('3h. a porta diz "Studio Ads · Included", "Video engines · Every engine your balance covers" (nunca "Every engine" pelado) e "Monthly · cancel anytime" — e nada de priority/editor/never expire', doorBlock.includes('<div className="val"><span>Studio Ads</span><b>Included</b></div>') && doorBlock.includes('<div className="val"><span>Video engines</span><b>Every engine your balance covers</b></div>') && !doorBlock.includes('<b>Every engine</b>') && doorBlock.includes('<div className="val"><span>Subscription</span><b>Monthly · cancel anytime</b></div>') && !/priority|human editor|never expire|forever/i.test(doorBlock))
const access = load('lib/ads/access.ts')
checa('3i. FATO "Studio Ads · Included": adsAccessReason({ plan: starter }) === subscriber (lib/ads/access.ts ADS_SUBSCRIBER_PLANS)', access.adsAccessReason({ plan: 'starter', ads_access_until: null }, 'someone@example.com') === 'subscriber' && access.ADS_SUBSCRIBER_PLANS.includes('starter'))
const gate = load('lib/enginePlanGate.ts')
const nowIso = new Date().toISOString()
const premium = [...gate.STUDIO_ONLY_ENGINE_KEYS, ...gate.STUDIO_ONLY_QUALITIES]
checa('3j. FATO "Every engine": decideEngineGate libera todo motor Studio-only para conta Starter criada hoje (gate desligado)', premium.length >= 6 && premium.every((e) => gate.decideEngineGate({ engine: e, plan: 'starter', profileCreatedAt: nowIso }).allowed === true))
// Revisão adversarial 27/09: acesso e saldo são coisas separadas (lib/kineoFacts.ts). A ressalva "your balance covers" só é
// honesta se for NECESSÁRIA: o motor mais caro a 60 s tem de custar mais do que o grant mensal do Starter.
const ec = load('lib/credits/engineCost.ts')
const dearest60 = Math.max(...[...gate.STUDIO_ONLY_QUALITIES].map((q) => ec.creditCostForDuration(q, true, 60)))
checa('3j2. FATO "your balance covers": o motor mais caro a 60 s (creditCostForDuration, conta paga) custa MAIS que TIER_CREDITS.starter — a ressalva é obrigatória, não enfeite', Number.isFinite(dearest60) && dearest60 > cp.TIER_CREDITS.starter)
checa('3k. FATO "cancel anytime": app/api/stripe/portal cria a sessão do Billing Portal', PORTAL.includes('stripe.billingPortal.sessions.create('))
checa('3l. o card do passe segue intacto ao lado (sum, CreditMinutesSummary, DoorCta price, CHECKOUT_HREF)', DOOR.includes('<div className="sum">{copy.name} pass</div>') && DOOR.includes('<CreditMinutesSummary credits={ADS_PASS_CREDITS} />') && DOOR.includes('<div className="ads-cta"><DoorCta cta={cta} placement="price" price={price} /></div>') && count(DOOR, "const CHECKOUT_HREF = '/api/stripe/checkout?pack=ads_pass'") === 1)

// ── 4. as condições: quem vê as duas portas, a linha do hero e a faixa ──
checa('4a. planOffer = live && viewer.gate !== \'ok\' (anônimo ou no_access; nunca com o passe desligado, quando adsGate diz closed a todos)', DOOR.includes("const planOffer = live && viewer.gate !== 'ok'"))
checa('4b. as duas portas ficam atrás de planOffer (grade só com as duas)', DOOR.includes("<div className={planOffer ? 'ads-doors' : undefined}>") && /\{planOffer \? \(\n\s+<div className="cost ads-price ads-plan"/.test(DOOR))
const heroLine = '{planOffer ? <p className="ads-plan-line"><a href="#ads-price">Included in any paid plan — from {starterPrice}/month</a></p> : null}'
checa('4c. hero: "Included in any paid plan — from <preço>/month" como link para #ads-price, logo abaixo do DoorCta, só com planOffer', (() => { const i = DOOR.indexOf('<DoorCta cta={cta} placement="hero" price={price} />'); const j = DOOR.indexOf(heroLine); return i > 0 && j > i && j - i < 200 && count(DOOR, heroLine) === 1 })())
checa('4d. searchParams chega pela prop da página (Next 14.2: objeto síncrono, como em ads/new) e from = first(searchParams?.from)', DOOR.includes('export default async function StudioAdsPage({ searchParams }: { searchParams?: SearchParams })') && DOOR.includes('const from = first(searchParams?.from)') && PAGE.includes('export default async function AdsNewPage({ searchParams }: { searchParams?: SearchParams })'))
// REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): o montador v2 devolve quem não tem acesso com ?from=v2 — mesma faixa.
checa('4e. faixa condicionada a (from === \'new\' || from === \'v2\') && viewer.signedIn && viewer.gate === \'no_access\'', DOOR.includes("const returnedFromWizard = (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'") && /\{returnedFromWizard \? \(\n\s+<div className="ads-banner ads-returned" role="status">/.test(DOOR))
const stripStart = DOOR.indexOf('{returnedFromWizard ? (')
const heroStart = DOOR.indexOf('<header className="ads-hero">')
const strip = DOOR.slice(stripStart, heroStart)
checa('4f. faixa ANTES do hero, com o texto combinado e o link para as duas portas', stripStart > 0 && heroStart > stripStart && strip.includes('<b>Studio Ads is part of every paid plan.</b> Pick {starterName} or the pass below and open the ad maker again.') /* REANCORADO 29/09: "wizard" → "ad maker" (virada do v2) */ && strip.includes('<a href="#ads-price">'))
// Rascunho: AdsWizardClient só grava 'kineo:ads:draft:v1' em saveDraftAndLogin, e TODO chamador está atrás de `anon`; takeDraft
// apaga na 1ª leitura (TTL 1 h). Logado sem acesso nunca monta o assistente → nada é gravado → a faixa não pode prometer.
const writers = count(WIZARD, 'saveDraftAndLogin(text, link)')
const anonWriters = count(WIZARD, 'anon ? saveDraftAndLogin(text, link)') + count(WIZARD, 'if (anon) return saveDraftAndLogin(text, link)')
checa('4g. a faixa NÃO promete rascunho salvo — e o código confirma: saveDraft só via saveDraftAndLogin, todos os chamadores atrás de anon', !/saved|kept for you|stays here|comes back|will be here|still here/i.test(strip) && writers >= 5 && anonWriters === writers && count(WIZARD, '  saveDraft(text, link)\n') === 1 && WIZARD.includes('window.sessionStorage.removeItem(ADS_DRAFT_KEY)'))

// ── 5. medição: ads_page_viewed com plan_offer + from (props do servidor); clique no Starter = ads_door_plan_clicked ──
checa('5a. AdsPageBanners recebe planOffer e from do servidor', DOOR.includes('<AdsPageBanners live={live} cta={cta} planOffer={planOffer} from={from} />') && /planOffer\?: boolean/.test(BANNERS) && /from\?: string \| null/.test(BANNERS))
const viewedStart = BANNERS.indexOf("void trackEvent('ads_page_viewed', {")
const viewed = BANNERS.slice(viewedStart, BANNERS.indexOf('})', viewedStart))
checa('5b. ads_page_viewed carrega plan_offer e from (e planOffer entra nas dependências do efeito)', viewedStart > 0 && viewed.includes('plan_offer: planOffer,') && /^\s+from,$/m.test(viewed) && BANNERS.includes('}, [live, cta, from, planOffer, error, cancelled])'))
checa('5c. o from do servidor passa pelo mesmo sanitizador (entrySource) com a URL como reserva — nunca ecoado cru', BANNERS.includes("const from = entrySource(fromProp ?? params?.get('from') ?? null)"))
checa('5d. AdsCtaLink reutilizado: cta="plan" grava ads_door_plan_clicked {tier, from}; open/buy seguem em ads_cta_clicked; nenhum componente novo', /cta: Extract<AdsDoorCta, 'open' \| 'buy'> \| 'plan'/.test(BANNERS) && BANNERS.includes("void trackEvent('ads_door_plan_clicked', { source: 'ads_page', tier: tier ?? null, from: entrySource(from), placement, ads_offer_version: ADS_OFFER_VERSION })") && BANNERS.includes("void trackEvent('ads_cta_clicked', { source: 'ads_page', cta, placement, ads_offer_version: ADS_OFFER_VERSION })") && count(BANNERS, 'export function') === 1)
const ev = load('lib/ads/events.ts')
checa('5e. ads_door_plan_clicked está na lista FECHADA ADS_EVENTS (lib/ads/events.ts, fonte única) e NÃO é só-de-servidor (o navegador grava)', ev.isAdsEvent('ads_door_plan_clicked') && !ev.ADS_SERVER_ONLY_EVENTS.includes('ads_door_plan_clicked'))

// ── 6. mutantes em memória: o guardião pega o que ele promete pegar ──
const auditDoor = (src) => {
  const p = []
  if (TYPED.test(src)) p.push('typed')
  const h = src.match(/const STARTER_CHECKOUT_HREF = '([^']*)'/)
  const params = h ? (h[1].split('?')[1] ?? '').split('&') : []
  if (!h || !params.includes('tier=starter') || !params.includes('intent_campaign=ads_door')) p.push('href')
  if (!src.includes("const starterPrice = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))")) p.push('derivation')
  if (!src.includes("const planOffer = live && viewer.gate !== 'ok'")) p.push('condition')
  if (/<b>Every engine<\/b>/.test(src)) p.push('engine-claim')
  return p
}
checa('6a. o auditor aprova o arquivo real', auditDoor(DOOR).length === 0)
const mutPrice = DOOR.replace('<p className="ads-amount">{starterPrice}<span> /month</span></p>', '<p className="ads-amount">$9.90<span> /month</span></p>')
checa('6b. MUTANTE preço digitado no JSX ("$9.90") fica vermelho', mutPrice !== DOOR && auditDoor(mutPrice).includes('typed'))
const mutDeriv = DOOR.replace("const starterPrice = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))", "const starterPrice = '$9.90'")
checa('6c. MUTANTE preço em constante digitada fica vermelho (derivação some E literal aparece)', mutDeriv !== DOOR && auditDoor(mutDeriv).includes('derivation') && auditDoor(mutDeriv).includes('typed'))
const mutHref = DOOR.replace('&intent_campaign=ads_door', '')
checa('6d. MUTANTE href sem intent_campaign fica vermelho', mutHref !== DOOR && auditDoor(mutHref).includes('href'))
const mutLive = DOOR.replace("const planOffer = live && viewer.gate !== 'ok'", "const planOffer = viewer.gate !== 'ok'")
checa('6e. MUTANTE porta Starter sem a trava do passe ligado fica vermelho', mutLive !== DOOR && auditDoor(mutLive).includes('condition'))
const mutRedirect = PAGE.replace("redirect('/ads?from=new')", "redirect('/ads')")
checa('6f. MUTANTE ads/new devolvendo a /ads pelado fica vermelho (1a travaria)', mutRedirect !== PAGE && count(mutRedirect, "redirect('/ads')") === 1)
const mutEngine = DOOR.replace('<b>Every engine your balance covers</b>', '<b>Every engine</b>')
checa('6g. MUTANTE "Every engine" sem a ressalva do saldo fica vermelho', mutEngine !== DOOR && auditDoor(mutEngine).includes('engine-claim'))

console.log(`test-ads-porta-plano-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
