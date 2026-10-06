// KINEO-ADS-PAREDE-2026-10-06 — guardião da parede do Studio Ads que passa a VENDER (tarefa 8 da sprint "MRR hoje", 06/10).
// Prova, EXECUTANDO lib/ads/paywall.ts (puro, carregado sem nenhum import) e lib/ads/paywallSources.ts (pelo carregador offline
// da casa, scripts/test-support/offline-ts-loader.mjs, com as fontes reais e com fontes PERTURBADAS):
//   (1) o preço, os créditos, o nome e o plano de entrada vêm das fontes (TIER_PRICES/TIER_CREDITS/planName/ADS_SUBSCRIBER_PLANS)
//       — num mundo perturbado (outro plano mais barato, outros créditos, outro Express) a oferta segue a fonte, nunca um literal;
//   (2) as contagens de anúncios por mês nunca prometem mais do que o crédito paga (nível mais caro decide);
//   (3) quem vê: só porta da parede + sem acesso com PROVA relida; assinante, passe, leitura que falhou, timeout, interna,
//       Studio Ads fechado e porta desconhecida não veem; 'region_paid_only' vê a MESMA oferta (sem passe);
//   (4) o checkout leva a origem ads_paywall pelo GET que o checkout já lê (sanitizador lido do route.ts), e sem sessão o checkout
//       leva ao /signup e retoma; o Express some com a url vazia e leva client_reference_id, nunca e-mail;
//   (5) as 12 frases existem nas 16 línguas com os mesmos marcadores, e o componente só pinta por elas (nenhum preço digitado);
//   (6) impressão e clique pelo mecanismo das telas do Ads (trackEvent, lista fechada lib/ads/events.ts, nunca só-servidor);
//   (7) a negação do visitante no /ads/new passa a levar session_id (cookie normalizado);
//   (8) mutantes: cada regra quebrada fica vermelha (e cada mutante prova que aplicou).
// Estilo readFileSync + ts.transpileModule (molde scripts/test-clipe-gratis-regiao-2026-10-05.mjs). Nenhum import com alias @/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve a partir do cwd
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega um módulo TS PURO: qualquer import = erro (prova que o arquivo continua puro). */
function loadPure(rel, over = {}) {
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => { throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`) }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

/** Carregador offline (resolve @/ e ./) com fontes sobrepostas: `over` (mutantes) e `world` (perturbações). */
function offline(over = {}, world = {}) {
  return createOfflineLoader({
    source: (rel, text) => {
      let s = over[rel] !== undefined ? over[rel] : text
      if (world[rel]) s = world[rel](s)
      return s
    },
  })
}

const PAYWALL = 'lib/ads/paywall.ts'
const SOURCES = 'lib/ads/paywallSources.ts'
const PAGE = 'app/ads/page.tsx'
const COMP = 'app/ads/AdsPaywall.tsx'
const EVENTS = 'lib/ads/events.ts'
const COPYFILE = 'lib/ui/refinementCopy.json'
const NEWPAGE = 'app/(dashboard)/ads/new/page.tsx'
const CHECKOUT = 'app/api/stripe/checkout/route.ts' // só leitura
const SINK = 'app/api/events/route.ts' // só leitura
const PRICING = 'lib/checkoutPricing.ts'
const DFY = 'lib/growth/dfyOffer.ts'

// ── perturbações (mundo P2): outro plano mais barato, outros créditos, outro Express ─────────────────────────────────────
/** Troca valores linha a linha dentro de um bloco `export const NAME…{ … }` (regex literal; troca por função, nunca "$1"). */
function retouchBlock(src, startMarker, lineRe, valueFor) {
  const start = src.indexOf(startMarker)
  if (start < 0) throw new Error(`perturbação: ${startMarker} não encontrado`)
  const end = src.indexOf('\n}', start)
  const block = src.slice(start, end)
  let changed = 0
  const next = block.split('\n').map((line) => {
    const m = line.match(lineRe)
    if (!m) return line
    const v = valueFor(m)
    if (v === undefined) return line
    changed++
    // o último grupo é sempre o número: troca só ele (split/join, nunca "$1")
    const num = m[m.length - 1]
    const at = line.lastIndexOf(num)
    return line.slice(0, at) + String(v) + line.slice(at + num.length)
  }).join('\n')
  if (changed === 0) throw new Error(`perturbação: nenhuma linha trocada em ${startMarker}`)
  return src.slice(0, start) + next + src.slice(end)
}
const P2_PRICES = { starter: 2994, basic: 1777, pro: 5499 }
const P2_CREDITS = { starter: 61, basic: 103, pro: 301 }
const P2_EXPRESS = { priceMinor: 3700, hours: 47 }
const worldP2 = {
  [PRICING]: (s) => retouchBlock(
    retouchBlock(s, 'export const TIER_PRICES:', /^\s+(starter|basic|pro): \{ usd: (\d+) \},?$/, (m) => P2_PRICES[m[1]]),
    'export const TIER_CREDITS:', /^\s+(starter|basic|pro): (\d+),$/, (m) => P2_CREDITS[m[1]],
  ),
  [DFY]: (s) => {
    const i = s.indexOf('  express: {')
    const j = s.indexOf('\n  },', i)
    const block = s.slice(i, j)
      .replace(/(\n\s+priceMinor: )\d+,/, (_, a) => `${a}${P2_EXPRESS.priceMinor},`)
      .replace(/(\n\s+hours: )\d+,/, (_, a) => `${a}${P2_EXPRESS.hours},`)
    return s.slice(0, i) + block + s.slice(j)
  },
}
const worldNoExpress = {
  [DFY]: (s) => {
    const i = s.indexOf('  express: {')
    const j = s.indexOf('\n  },', i)
    return s.slice(0, i) + s.slice(i, j).replace(/(\n\s+url: )'[^']*',/, (_, a) => `${a}'',`) + s.slice(j)
  },
}

const UID = '7f1c2a9e-0000-4000-8000-00000000abcd'
/** O que cada mundo calculou na última chamada de problems() — só para o rodapé legível. */
const shownOffers = {}

function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let P
  try { P = loadPure(PAYWALL, over) } catch (err) { return [`paywall.ts não carrega puro: ${err.message}`] }

  // ── (1)+(2) as fontes, executadas: mundo real e mundo perturbado ─────────────────────────────────────────────────
  function offerIn(world, label, expectExplicit) {
    let L
    try { L = offline(over, world) } catch (err) { p.push(`${label}: carregador falhou: ${err.message}`); return null }
    let S, CP, ACC, LV, SC, OF, MD, DF, PF
    try {
      S = L(SOURCES); CP = L(PRICING); ACC = L('lib/ads/access.ts'); LV = L('lib/ads/v2Levels.ts'); SC = L('lib/ads/v2Screen.ts')
      OF = L('lib/ads/offer.ts'); MD = L('lib/ads/models.ts'); DF = L(DFY); PF = L('lib/growth/planFit.ts')
    } catch (err) { p.push(`${label}: fonte não carrega: ${err.message}`); return null }
    const sources = S.adsPaywallSources(UID)
    const offer = P.adsPaywallOffer(sources)
    if (!offer) { p.push(`${label}: nenhuma oferta calculada`); return null }
    // o plano de entrada = o de menor mensalidade que abre o Studio Ads (recalculado aqui das fontes)
    const tiers = Object.keys(CP.TIER_PRICES).filter((t) => ACC.ADS_SUBSCRIBER_PLANS.includes(t))
    const entry = tiers.reduce((b, t) => (CP.getTierPrice(t, 'usd', 'standard') < CP.getTierPrice(b, 'usd', 'standard') ? t : b))
    const price = CP.getTierPrice(entry, 'usd', 'standard')
    if (offer.tier !== entry) p.push(`${label}: plano de entrada ${offer.tier}, a fonte diz ${entry}`)
    if (offer.priceMinor !== price) p.push(`${label}: preço ${offer.priceMinor} ≠ getTierPrice(${entry}) ${price}`)
    if (offer.priceLabel !== CP.formatCheckoutMoney('usd', price)) p.push(`${label}: rótulo de preço ${offer.priceLabel} ≠ formatCheckoutMoney`)
    if (offer.credits !== CP.TIER_CREDITS[entry]) p.push(`${label}: créditos ${offer.credits} ≠ TIER_CREDITS.${entry} ${CP.TIER_CREDITS[entry]}`)
    if (offer.planName !== PF.planName(entry)) p.push(`${label}: nome ${offer.planName} ≠ planName(${entry})`)
    if (ACC.adsAccessReason({ plan: offer.tier, ads_access_until: null }, 'cliente@exemplo.com') !== 'subscriber') p.push(`${label}: o plano oferecido não abre o Studio Ads`)
    const levels = LV.ADS_V2_LEVEL_PRICES.map((l) => l.credits)
    const dearest = Math.max(...levels)
    if (offer.newAds !== Math.floor(offer.credits / dearest) || offer.newAds * dearest > offer.credits) p.push(`${label}: anúncios novos ${offer.newAds} ≠ créditos/nível mais caro (${offer.credits}/${dearest})`)
    if (offer.newAdSeconds !== SC.ADS_V2_SCREEN_SECONDS) p.push(`${label}: duração do anúncio novo ≠ ADS_V2_SCREEN_SECONDS`)
    const shortest = Math.min(...MD.ADS_MODELS.map((m) => m.seconds))
    if (offer.classicAdSeconds !== shortest) p.push(`${label}: duração do clássico ${offer.classicAdSeconds} ≠ modelo mais curto ${shortest}`)
    if (!MD.ADS_MODELS.filter((m) => m.seconds === shortest).every((m) => m.credits === OF.KINEO1_35S_CREDITS)) p.push(`${label}: o clássico mais curto não custa KINEO1_35S_CREDITS (a contagem mentiria)`)
    if (offer.classicAds !== Math.floor(offer.credits / OF.KINEO1_35S_CREDITS)) p.push(`${label}: clássicos ${offer.classicAds} ≠ créditos/KINEO1_35S_CREDITS`)
    // checkout com a origem
    const href = offer.checkoutHref
    const [pathPart, query = ''] = href.split('?')
    const qp = new URLSearchParams(query)
    if (pathPart !== '/api/stripe/checkout' || qp.get('tier') !== entry || qp.get('billing') !== 'monthly' || qp.get('intent_campaign') !== 'ads_paywall' || [...qp.keys()].length !== 3) {
      p.push(`${label}: checkout sem a origem/tier certos: ${href}`)
    }
    // Express: só com url válida, preço e prazo do degrau, client_reference_id e nunca e-mail
    const ex = DF.DFY_TIERS.express
    if (DF.isDfyLinkUrl(ex.url)) {
      if (!offer.express) p.push(`${label}: Express ligado e não aparece`)
      else {
        if (offer.express.priceLabel !== DF.dfyPriceLabel(ex.priceMinor) || offer.express.hours !== ex.hours || offer.express.name !== ex.name) p.push(`${label}: Express com preço/prazo/nome fora da fonte`)
        let eu = null
        try { eu = new URL(offer.express.href) } catch { p.push(`${label}: link do Express inválido: ${offer.express.href}`) }
        if (eu && (`${eu.origin}${eu.pathname}` !== ex.url || eu.searchParams.get('client_reference_id') !== UID || eu.searchParams.get('utm_source') !== 'ads_paywall' || eu.searchParams.has('prefilled_email'))) {
          p.push(`${label}: link do Express errado: ${offer.express.href}`)
        }
      }
    } else if (offer.express !== null) p.push(`${label}: Express aparece com url vazia/inválida`)
    if (expectExplicit) {
      for (const [k, v] of Object.entries(expectExplicit)) {
        const got = k.startsWith('express.') ? offer.express?.[k.slice(8)] : offer[k]
        if (got !== v) p.push(`${label}: esperava ${k}=${JSON.stringify(v)}, veio ${JSON.stringify(got)}`)
      }
    }
    // sem visitante: o mesmo cálculo sem id não leva client_reference_id
    const anon = P.adsPaywallOffer(S.adsPaywallSources(null))
    if (anon?.express) {
      let carriesId = true
      try { carriesId = new URL(anon.express.href).searchParams.has('client_reference_id') } catch { p.push(`${label}: link do Express do anônimo inválido`) }
      if (carriesId) p.push(`${label}: Express do anônimo com client_reference_id (ou inválido)`)
    }
    shownOffers[label] = offer
    return offer
  }
  const real = offerIn({}, 'mundo real', null)
  offerIn(worldP2, 'mundo perturbado', {
    tier: 'basic', priceMinor: P2_PRICES.basic, credits: P2_CREDITS.basic, newAds: 2, classicAds: 34,
    'express.priceLabel': 'US$37', 'express.hours': P2_EXPRESS.hours,
  })
  offerIn(worldNoExpress, 'Express desligado', { express: null })
  if (real && real.express === null) p.push('mundo real: o Express está ligado em DFY_TIERS e não aparece')

  // ── (3) quem vê ──────────────────────────────────────────────────────────────────────────────────────────────────
  if (P.ADS_PAYWALL_LIVE !== true) p.push('interruptor ADS_PAYWALL_LIVE desligado (a tarefa liga a parede)')
  if (JSON.stringify(P.ADS_PAYWALL_DOORS) !== JSON.stringify(['v2', 'new', 'producao', 'studio'])) p.push(`portas da parede mudaram: ${JSON.stringify(P.ADS_PAYWALL_DOORS)}`)
  const none = { reason: 'none', trialStatus: null }
  const signed = (gate, proof) => ({ signedIn: true, gate, noSession: false, proof })
  const anonV = (noSession) => ({ signedIn: false, gate: null, noSession, proof: null })
  const casos = [
    [{ live: true, from: 'v2', viewer: signed('no_access', none) }, true, 'sem acesso, prova relida, veio do /ads/v2'],
    [{ live: true, from: 'new', viewer: signed('no_access', none) }, true, 'sem acesso, veio do /ads/new'],
    [{ live: true, from: 'producao', viewer: signed('no_access', none) }, true, 'sem acesso, veio da Produção'],
    [{ live: true, from: 'studio', viewer: signed('no_access', none) }, true, 'sem acesso, veio do tile do /studio'],
    [{ live: true, from: 'v2', viewer: signed('no_access', { reason: 'none', trialStatus: 'region_paid_only' }) }, true, "conta 'region_paid_only' vê a mesma oferta"],
    [{ live: true, from: 'v2', viewer: signed('ok', null) }, false, 'assinante (gate ok)'],
    [{ live: true, from: 'v2', viewer: signed('no_access', { reason: 'subscriber', trialStatus: null }) }, false, 'assinante relido (o gate errou na 1ª leitura)'],
    [{ live: true, from: 'v2', viewer: signed('no_access', { reason: 'pass', trialStatus: null }) }, false, 'passe relido'],
    [{ live: true, from: 'v2', viewer: signed('no_access', { reason: 'internal', trialStatus: null }) }, false, 'conta interna relida'],
    [{ live: true, from: 'v2', viewer: signed('no_access', null) }, false, 'leitura da prova falhou'],
    [{ live: true, from: 'v2', viewer: signed('closed', none) }, false, 'Studio Ads fechado (gate closed)'],
    [{ live: true, from: 'v2', viewer: signed(null, null) }, false, 'leitura do acesso falhou (gate null)'],
    [{ live: false, from: 'v2', viewer: signed('no_access', none) }, false, 'passe desligado (adsPassLive false)'],
    [{ live: true, from: null, viewer: signed('no_access', none) }, false, 'sem ?from='],
    [{ live: true, from: 'pricing', viewer: signed('no_access', none) }, false, 'porta que não é parede (?from=pricing)'],
    [{ live: true, from: 'V2', viewer: signed('no_access', none) }, false, 'porta com outra grafia'],
    [{ live: true, from: 'studio', viewer: anonV(true) }, true, 'anônimo confirmado pelo auth (vai ao cadastro e volta ao checkout)'],
    [{ live: true, from: 'studio', viewer: anonV(false) }, false, 'anônimo NÃO confirmado (timeout/erro de auth)'],
    [{ live: true, from: 'v2', viewer: signed('no_access', none), enabled: false }, false, 'interruptor desligado'],
  ]
  for (const [input, want, label] of casos) if (P.adsPaywallVisible(input) !== want) p.push(`visibilidade errada: ${label}`)
  const noSess = [[null, true], [undefined, true], [{ name: 'AuthSessionMissingError' }, true], [{ name: 'AuthApiError' }, false], [{ name: 'AuthRetryableFetchError' }, false], ['erro', false]]
  for (const [e, want] of noSess) if (P.adsPaywallNoSession(e) !== want) p.push(`adsPaywallNoSession(${JSON.stringify(e)}) ≠ ${want}`)
  // a regra REAL de acesso amarrada à visibilidade (perfil → adsAccessReason → prova → oferta)
  try {
    const ACC = offline(over)('lib/ads/access.ts')
    const fut = new Date(Date.now() + 86400000).toISOString()
    const perfis = [
      [{ plan: 'free', ads_access_until: null }, true, 'free'],
      [{ plan: 'basic_trial', ads_access_until: null }, true, 'trial'],
      [{ plan: 'starter', ads_access_until: null }, false, 'Starter pago'],
      [{ plan: 'pro', ads_access_until: null }, false, 'Studio pago'],
      [{ plan: 'free', ads_access_until: fut }, false, 'passe válido'],
    ]
    for (const [row, want, label] of perfis) {
      const proof = { reason: ACC.adsAccessReason(row, 'cliente@exemplo.com'), trialStatus: null }
      if (P.adsPaywallVisible({ live: true, from: 'v2', viewer: signed('no_access', proof) }) !== want) p.push(`perfil ${label}: oferta ${want ? 'deveria' : 'não deveria'} aparecer`)
    }
  } catch (err) { p.push(`lib/ads/access.ts não carrega: ${err.message}`) }
  // a oferta é a mesma para qualquer conta sem acesso: o cálculo não recebe trial_status nem passe
  if (P.adsPaywallOffer.length !== 1) p.push('adsPaywallOffer passou a receber mais que as fontes (a oferta não pode variar por conta)')
  if (real && Object.keys(real).some((k) => /pass/i.test(k))) p.push('a oferta ganhou um campo de passe')

  // ── página: a oferta só por adsPaywallVisible, com a prova relida, no lugar da faixa ─────────────────────────────
  const page = src(PAGE)
  if (!page.includes('const paywallOffer = adsPaywallVisible({ live, from, viewer }) ? adsPaywallOffer(adsPaywallSources(viewer.userId)) : null')) p.push('page.tsx: a oferta não nasce de adsPaywallVisible + adsPaywallSources')
  if (!page.includes('const proof = gate === \'no_access\' ? await readPaywallProof(admin, user.id, user.email) : null')) p.push('page.tsx: a prova positiva não é relida para quem o gate barrou')
  const proofFn = page.slice(page.indexOf('async function readPaywallProof('), page.indexOf('/** Who is looking'))
  if (!proofFn.includes(".select(`${ADS_ACCESS_SELECT}, trial_status`).eq('id', userId).maybeSingle()") || !proofFn.includes('if (error || !data) return null') || !proofFn.includes('reason: adsAccessReason(row, authEmail)')) p.push('page.tsx: readPaywallProof não relê o perfil com falha = null')
  if (!page.includes('if (!user) return { ...ANONYMOUS, noSession: adsPaywallNoSession(error) }')) p.push('page.tsx: o anônimo não é confirmado pelo erro do getUser')
  if (!page.includes('const ANONYMOUS: DoorViewer = { signedIn: false, gate: null, internal: false, userId: null, noSession: false, proof: null }')) p.push('page.tsx: ANONYMOUS (também o valor do timeout) não é "não sei"')
  if (!page.includes('const viewer = await withTimeout(readViewer(), ANONYMOUS)')) p.push('page.tsx: o timeout do leitor mudou')
  const iPay = page.indexOf('{paywallOffer ? (')
  const iStrip = page.indexOf('{returnedFromWizard ? (')
  const iHero = page.indexOf('<header className="ads-hero">')
  if (!(iPay > 0 && iStrip > iPay && iHero > iStrip)) p.push('page.tsx: a oferta não ocupa o lugar da faixa, antes do hero')
  else {
    const branch = page.slice(iPay, iStrip)
    if (!branch.includes('<AdsPaywall offer={paywallOffer} from={from ?? \'\'} signedIn={viewer.signedIn} regionPaidOnly={viewer.proof?.trialStatus === REGION_PAID_ONLY_TRIAL_STATUS} />') || !/\) : \(\n\s+<>/.test(branch)) p.push('page.tsx: a faixa não virou o ramo "sem oferta"')
  }
  if ((page.match(/<AdsPaywall /g) || []).length !== 1) p.push('page.tsx: a oferta é pintada em mais de um lugar')
  try { if (loadPure('lib/freeFilmPolicy.ts').REGION_PAID_ONLY_TRIAL_STATUS !== 'region_paid_only') p.push("REGION_PAID_ONLY_TRIAL_STATUS ≠ 'region_paid_only'") } catch (err) { p.push(`freeFilmPolicy não carrega: ${err.message}`) }

  // ── (4) o checkout aceita a origem e leva o visitante ao cadastro (route.ts só lido) ─────────────────────────────
  const route = src(CHECKOUT)
  const san = route.match(/function intentCampaignFrom\(req: NextRequest\)[^\n]*\n[^\n]*\n\s+return (\/\^[^/]+\/)\.test\(raw\)/)
  if (!san || !new RegExp(san[1].slice(1, -1)).test(P.ADS_PAYWALL_CAMPAIGN)) p.push(`a origem "${P.ADS_PAYWALL_CAMPAIGN}" não passa pelo sanitizador intentCampaignFrom do checkout`)
  if (!route.includes("req.nextUrl.searchParams.get('intent_campaign')") || !route.includes("intent_campaign: intentCampaign ?? null,")) p.push('o checkout deixou de gravar intent_campaign')
  if (!route.includes("const tierParam = req.nextUrl.searchParams.get('tier') ?? 'basic'") || !route.includes("req.nextUrl.searchParams.get('billing') === 'annual'")) p.push('o GET do checkout deixou de ler tier/billing')
  if (!route.includes('return NextResponse.redirect(`${appUrl}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`)')) p.push('o checkout deixou de levar o visitante sem sessão ao /signup retomando a compra')

  // ── (5) frases nas 16 línguas; o componente só pinta por elas ───────────────────────────────────────────────────
  let copy
  try { copy = JSON.parse(src(COPYFILE)) } catch (err) { return [...p, `refinementCopy.json não é JSON: ${err.message}`] }
  const langs = Object.keys(copy)
  if (langs.length !== 16 || !langs.includes('en')) p.push(`refinementCopy com ${langs.length} línguas, não 16`)
  const marks = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',')
  const C = P.ADS_PAYWALL_COPY ?? {}
  const keys = Object.values(C)
  if (keys.length !== 12) p.push(`esperava 12 frases em ADS_PAYWALL_COPY, achei ${keys.length}`)
  for (const en of keys) {
    for (const lang of langs) {
      const v = copy[lang]?.[en]
      if (typeof v !== 'string' || !v.trim()) { p.push(`frase sem tradução em ${lang}: "${en}"`); continue }
      if (lang === 'en' && v !== en) p.push(`en não é identidade: "${en}"`)
      if (marks(v) !== marks(en)) p.push(`${lang}: marcadores de "${en}" viraram ${marks(v)}`)
    }
  }
  if (P.adsPaywallFill('Get {plan} · {price}/month', { plan: 'X', price: '$1.00' }) !== 'Get X · $1.00/month' || P.adsPaywallFill('{price}', { price: '$1$&' }) !== '$1$&') p.push('adsPaywallFill não preenche literal (retrovisor de replace)')
  const comp = src(COMP)
  for (const k of Object.keys(C)) if (!comp.includes(`COPY.${k}`)) p.push(`o componente não usa a frase COPY.${k}`)
  if ((comp.match(/\bui\(/g) || []).length < 11) p.push('o componente pinta texto fora do useUiCopy')
  const PRICE_LITERAL = /\$\s?\d|US\$\d|\b\d+[.,]\d{2}\b|\b(1290|2990|5490|3500)\b|\b60 credits\b|\/month<|\/mo\b/
  const codeOf = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  for (const [rel, s] of [[COMP, comp], [PAYWALL, src(PAYWALL)], [SOURCES, src(SOURCES)]]) {
    const code = codeOf(s)
    if (PRICE_LITERAL.test(code)) p.push(`${rel}: preço/crédito digitado (${code.match(PRICE_LITERAL)[0]})`)
  }
  if (!/<a href=\{offer\.checkoutHref\} className="go ok ads-go" data-kineo="ads-paywall-plan" onClick=\{\(\) => clicked\('plan'\)\}>/.test(comp)) p.push('o botão do plano não é um <a> para o checkout com o clique medido')
  if (!/\{offer\.express \? \(\n\s+<div className="ads-paywall-express">\n\s+<a href=\{offer\.express\.href\} data-kineo="ads-paywall-express" onClick=\{\(\) => clicked\('express'\)\}>/.test(comp)) p.push('o Express não depende de offer.express ou perdeu o clique medido')
  if (/from 'next\/link'|<Link\b|ads_pass|pack=|ADS_PASS/.test(codeOf(comp))) p.push('o componente ganhou <Link> (pré-busca do checkout) ou um passe')
  if (!comp.includes('{ui(signedIn ? COPY.note : COPY.noteAnon)}')) p.push('a nota do visitante (cria a conta antes) sumiu')

  // ── (6) medição pelo mecanismo das telas do Ads ──────────────────────────────────────────────────────────────────
  let EV
  try { EV = loadPure(EVENTS, over) } catch (err) { return [...p, `events.ts não carrega puro: ${err.message}`] }
  for (const name of [P.ADS_PAYWALL_VIEWED_EVENT, P.ADS_PAYWALL_CLICKED_EVENT]) {
    if (!EV.isAdsEvent(name)) p.push(`${name} fora da lista fechada lib/ads/events.ts`)
    if (EV.ADS_SERVER_ONLY_EVENTS.includes(name)) p.push(`${name} marcado só-servidor (o navegador não poderia gravar)`)
    if (src(SINK).includes(`'${name}'`)) p.push(`${name} bloqueado no sink do navegador (app/api/events)`)
  }
  if (P.ADS_PAYWALL_VIEWED_EVENT !== 'ads_paywall_viewed' || P.ADS_PAYWALL_CLICKED_EVENT !== 'ads_paywall_clicked') p.push('nomes dos eventos mudaram (a medição lê ads_paywall_viewed/clicked)')
  const viewedBlock = comp.slice(comp.indexOf('useEffect(() => {'), comp.indexOf('function clicked('))
  if (!viewedBlock.includes('if (viewedRef.current) return') || !viewedBlock.includes('viewedRef.current = true') || !viewedBlock.includes('void trackEvent(ADS_PAYWALL_VIEWED_EVENT, { ...shown, ads_offer_version: ADS_OFFER_VERSION })')) p.push('a impressão não é 1 por montagem com o retrato')
  if (!comp.includes('void trackEvent(ADS_PAYWALL_CLICKED_EVENT, { ...shown, ads_offer_version: ADS_OFFER_VERSION, choice, language })')) p.push('o clique não leva o retrato + escolha')
  if (real) {
    const shown = P.adsPaywallShown(real, { from: 'v2', signedIn: true, regionPaidOnly: true })
    for (const k of ['version', 'from', 'signed_in', 'region_paid_only', 'tier', 'price_minor', 'credits', 'new_ads', 'classic_ads', 'express']) if (!(k in shown)) p.push(`o retrato do evento perdeu ${k}`)
    if (shown.price_minor !== real.priceMinor || shown.region_paid_only !== true || shown.express !== (real.express !== null)) p.push('o retrato do evento não é o que foi mostrado')
  }

  // ── (7) a negação do visitante leva session_id ───────────────────────────────────────────────────────────────────
  const np = src(NEWPAGE)
  const anonBlock = np.slice(np.indexOf('if (!user) {'), np.indexOf('const { reason } = await loadAdsAccess'))
  if (!anonBlock.includes('const anonSession = normalizeEventSessionId(cookies().get(EVENT_SESSION_COOKIE)?.value)')) p.push('/ads/new: a sessão do visitante não é lida (normalizada) do cookie')
  if ((anonBlock.match(/, sessionId: anonSession \}\)/g) || []).length !== 2) p.push('/ads/new: as duas negações do visitante não levam sessionId')
  if (!/import \{ cookies \} from 'next\/headers'/.test(np) || !/import \{ EVENT_SESSION_COOKIE, normalizeEventSessionId \} from '@\/lib\/growth\/checkoutAuthSessionBridge'/.test(np)) p.push('/ads/new: imports do cookie de sessão ausentes')
  try {
    const B = loadPure('lib/growth/checkoutAuthSessionBridge.ts')
    if (B.EVENT_SESSION_COOKIE !== 'kineo_event_session_id' || B.normalizeEventSessionId('3f2b8c1e-1d2a-4b5c-9d8e-7f6a5b4c3d2e') !== '3f2b8c1e-1d2a-4b5c-9d8e-7f6a5b4c3d2e' || B.normalizeEventSessionId('<script>') !== null || B.normalizeEventSessionId(undefined) !== null) p.push('normalizeEventSessionId deixou de aceitar só o formato do lib/analytics')
  } catch (err) { p.push(`checkoutAuthSessionBridge não carrega puro: ${err.message}`) }
  return p
}

console.log('TESTE a parede do Studio Ads passa a vender — 06/10')
const real = problems()
for (const [label, o] of Object.entries(shownOffers)) {
  if (o) console.log(`    ${label}: ${o.planName} ${o.priceLabel}/mês · ${o.credits} cr · ${o.newAds} anúncio(s) novo(s) ou ${o.classicAds} clássicos de ${o.classicAdSeconds} s · ${o.checkoutHref} · Express ${o.express ? `${o.express.priceLabel} ${o.express.hours} h` : 'oculto'}`)
}
ok(real.length === 0, '(1–7) oferta das fontes (real e perturbada), quem vê, checkout com a origem, Express, 16 línguas, medição, session_id' + (real.length ? ' → ' + real.join(' | ') : ''))

// ── (8) mutantes — cada um prova que aplicou e que derruba o guardião ──────────────────────────────────────────────
const PT_TITLE = '"Studio Ads is included in every paid plan": "O Studio Ads está incluído em todos os planos pagos",'
const mutants = [
  ['M1 preço digitado nas fontes', SOURCES, "priceMinor: getTierPrice(tier, 'usd', 'standard')", 'priceMinor: 1290'],
  ['M2 créditos digitados nas fontes', SOURCES, 'credits: TIER_CREDITS[tier]', 'credits: 60'],
  ['M3 plano de entrada fixo (não o mais barato)', PAYWALL, 'return valid.reduce((best, p) => (p.priceMinor < best.priceMinor ? p : best))', 'return valid[0]'],
  ['M4 Express aparece com url vazia', PAYWALL, "const express = src.express && typeof src.express.href === 'string' && src.express.href", 'const express = src.express'],
  ['M5 Express sem client_reference_id (url crua)', SOURCES, "href: dfyPaymentLink({ tier: 'express', userId, source: ADS_PAYWALL_CAMPAIGN }),", 'href: express.url,'],
  ['M6 assinante relido vê a oferta (sem prova)', PAYWALL, "if (v.signedIn) return v.gate === 'no_access' && v.proof !== null && v.proof.reason === 'none'", "if (v.signedIn) return v.gate === 'no_access'"],
  ['M7 página sem reler a prova', PAGE, "const proof = gate === 'no_access' ? await readPaywallProof(admin, user.id, user.email) : null", "const proof = gate === 'no_access' ? { reason: 'none', trialStatus: null } : null"],
  ['M8 timeout vira anônimo', PAGE, 'userId: null, noSession: false, proof: null }', 'userId: null, noSession: true, proof: null }'],
  ['M9 checkout sem a origem', PAYWALL, '&billing=monthly&intent_campaign=${ADS_PAYWALL_CAMPAIGN}`', '&billing=monthly`'],
  ['M10 origem que o sanitizador recusa', PAYWALL, "export const ADS_PAYWALL_CAMPAIGN = 'ads_paywall' as const", "export const ADS_PAYWALL_CAMPAIGN = 'ads paywall' as const"],
  ['M11 frase sem tradução em pt', COPYFILE, PT_TITLE + '\n', ''],
  ['M12 marcador traduzido em fr', COPYFILE, '"{price}/month": "{price}/mois",', '"{price}/month": "{prix}/mois",'],
  ['M13 botão com preço digitado', COMP, '{fill(ui(COPY.cta), { plan: offer.planName, price })}', 'Get Starter · $12.90/month'],
  ['M14 clique do plano sem medição', COMP, "data-kineo=\"ads-paywall-plan\" onClick={() => clicked('plan')}>", 'data-kineo="ads-paywall-plan">'],
  ['M15 negação do visitante sem session_id', NEWPAGE, "outcome: 'anonymous_panel' }, sessionId: anonSession })", "outcome: 'anonymous_panel' } })"],
  ['M16 oferta para qualquer ?from=', PAYWALL, 'if (input.from === null || !ADS_PAYWALL_DOORS.includes(input.from)) return false', 'if (input.from === null) return false'],
  ["M17 'region_paid_only' fica sem a oferta", PAYWALL, "v.proof !== null && v.proof.reason === 'none'", "v.proof !== null && v.proof.reason === 'none' && v.proof.trialStatus !== 'region_paid_only'"],
  ['M18 evento de impressão fora da lista fechada', EVENTS, "  'ads_paywall_viewed',\n", ''],
  ['M19 interruptor desligado', PAYWALL, 'export const ADS_PAYWALL_LIVE = true', 'export const ADS_PAYWALL_LIVE = false'],
  ['M20 anúncios novos pelo nível mais barato (promete demais)', PAYWALL, 'Math.max(...src.newAdCredits)', 'Math.min(...src.newAdCredits)'],
  ['M21 anônimo com erro de auth vira "sem sessão"', PAYWALL, "return typeof error === 'object' && (error as { name?: unknown }).name === 'AuthSessionMissingError'", 'return true'],
]
for (const [label, file, from, to] of mutants) {
  const s = read(file)
  if (!s.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = s.replace(from, to)
  if (mutated === s || !mutated.includes(to)) { ok(false, `(${label}) mutante não aplicou`); continue }
  let bitten = false
  try {
    bitten = problems({ [file]: mutated }).length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
