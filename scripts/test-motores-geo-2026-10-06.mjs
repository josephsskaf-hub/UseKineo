// KINEO-MOTORES-GEO-2026-10-06 — guardião da TAREFA 12 (slug motores-geo2): as páginas de motor feitas para o ChatGPT
// CITAR. Executa o código real, offline (sem rede, sem banco, sem render pago), e prova:
//   (1) PREÇO DA FONTE — a primeira frase depois do H1 (onde usar o motor online + quanto custa por vídeo), a tabela
//       (clipe de ~5 s, filme de 35 e de 60 s, quantos por plano) e a FAQ citável saem no HTML do SERVIDOR com os
//       números de clipCreditCost / creditCostForDuration / TIER_PRICES / TIER_CREDITS — e acompanham quando a fonte muda;
//   (2) COMPARAÇÃO DIRETA — cada preço de terceiro bate com a cotação oficial datada (Runway: lib/clips/clipPriceVsMarket;
//       Google: FONTES_DIRETAS) e leva link oficial; o Seedance diz que não há preço direto conferível em vez de inventar;
//   (3) MOTOR DESLIGADO SEM PÁGINA INDEXÁVEL — motor pausado: sem camada citável, robots noindex (layout do segmento),
//       fora do sitemap e da seção de motores do llms.txt; e pausar/despausar no interruptor muda tudo sozinho;
//   (4) ROBOTS — OAI-SearchBot, ChatGPT-User, GPTBot e Bingbot liberados, /ai-video-generator fora do Disallow;
//   (5) SITEMAP E LLMS.TXT — as páginas indexáveis de motor (e as 26 traduzidas, o hub e as 3 comparações revisadas)
//       com lastmod REAL desta revisão; o llms.txt lista cada página com os números da fonte;
//   (6) CTA LEVA A CAMPANHA — o CTA do card (e os do hero/final) vai para /signup com intent_campaign=seo_engine_<slug> e
//       redirect=/studio?engine=<motor>&intent_campaign=seo_engine_<slug> (é o intent_campaign que vira
//       signup_utm_campaign, app/(auth)/signup + lib/analytics rememberSignupCampaign), com a frase da marca de apoio;
//   (7) MENTIRAS CORRIGIDAS — sem "3–7 minutes" nem "unlocked on every account" nas páginas citáveis, nenhum "free" nos
//       títulos, Veo sem "native audio" no catálogo que a IA lê, tier derivado (Kling 3 = Creator, H3 = Starter); nas 26
//       páginas traduzidas, 8–25 min e o trial com a cláusula do país (espelho conferido contra GRANT_COUNTRY_CLAUSE);
//   (8) PING PREPARADO — scripts/indexnow-ping-2026-10-06.mjs: ensaio por padrão, chave da casa, escolhe pelo lastmod
//       desta revisão (executado aqui contra o sitemap gerado, sem rede).
// Cada regra tem um mutante em memória (22) que precisa ficar VERMELHO pelo motivo certo, e 2 controles (a fonte muda:
// preço do Creator; o Veo pausado no interruptor) que precisam ficar VERDES — prova de que nada é digitado.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
import { offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { edicoesMotoresGeo } from './test-support/motores-geo-2026-10-06.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve '@/' a partir do cwd
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const LAYOUT = 'app/ai-video-generator/[engine]/layout.tsx'
const CATALOG = 'lib/growth/enginePageCatalog.ts'
const GEO = 'lib/seo/engineCitation.ts'
const SITEMAP = 'app/sitemap.ts'
const ROBOTS = 'app/robots.ts'
const LLMS = 'app/llms.txt/route.ts'
const LAUNCH = 'lib/engineLaunch.ts'
const PRICING = 'lib/checkoutPricing.ts'
const BASE = 'https://www.usekineo.com'
const BRAND = 'Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.'
const REWARDS = "60 seconds+ is the length TikTok's Creator Rewards pays for."
const AI_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Bingbot']
const OFICIAIS = ['runway.com', 'runwayml.com', 'help.runwayml.com', 'academy.runwayml.com', 'ai.google.dev', 'app.klingai.com', 'www.byteplus.com']

const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texto = (html) => unesc(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const usd = (cents) => `$${(Math.round(cents) / 100).toFixed(2)}`
const money = (cents) => (cents % 100 === 0 ? `$${cents / 100}` : usd(cents))

// A cláusula "nos países do trial" em cada língua (lib/seo/enginePageLangs.ts) — a mesma frase em todas as 3 superfícies.
const CLAUSULA_PAIS = {
  fr: ' (dans les pays éligibles)', de: ' (in unterstützten Ländern)', it: ' (nei paesi supportati)', nl: ' (in ondersteunde landen)',
  pl: ' (w obsługiwanych krajach)', tr: ' (desteklenen ülkelerde)', ru: ' (в поддерживаемых странах)', uk: ' (у підтримуваних країнах)',
  ar: ' (في الدول المدعومة)', ur: ' (معاون ممالک میں)', hi: ' (समर्थित देशों में)', id: ' (di negara yang didukung)', vi: ' (ở các quốc gia được hỗ trợ)',
}

const SITEMAP_MOCKS = {
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] }, 'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
  'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] }, 'lib/comparisons.ts': { CANONICAL_SLUGS: [] }, 'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
  'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
  'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
  'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
}

/** Tudo que esta mudança promete, medido no código real com as trocas `rep` (caminho → fonte). [] = verde. */
async function problemas(rep = {}) {
  const p = []
  const load = engineFixture(rep)
  const cat = load(CATALOG)
  const launch = load(LAUNCH)
  const cost = load('lib/credits/engineCost.ts')
  const clipPricing = load('lib/clips/clipPricing.ts')
  const two = load('lib/pricingTwoProducts.ts')
  const pricing = load(PRICING)
  const intent = load('lib/growth/engineLandingIntent.ts')
  const market = load('lib/clips/clipPriceVsMarket.ts')
  const geoLib = load(GEO)
  const trial = load('lib/freeTierOffer.ts')
  const tiers = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']]
  const creator = { usd: pricing.TIER_PRICES.basic.usd, cr: pricing.TIER_CREDITS.basic }
  const usdOf = (credits) => Math.round((credits * creator.usd) / creator.cr)
  const minutos = `${geoLib.ENGINE_GEO_FILM_MINUTES.min}–${geoLib.ENGINE_GEO_FILM_MINUTES.max} minutes`
  const visivel = (param) => !launch.enginePaused(param) && (param !== 's25' || launch.S25_PUBLIC)
  const indexaveis = cat.ENGINE_SLUGS.filter((s) => visivel(cat.ENGINES[s].param))
  const fora = cat.ENGINE_SLUGS.filter((s) => !indexaveis.includes(s))
  if (JSON.stringify([...cat.INDEXABLE_ENGINE_SLUGS]) !== JSON.stringify(indexaveis)) p.push(`INDEXABLE_ENGINE_SLUGS ≠ régua do interruptor: ${cat.INDEXABLE_ENGINE_SLUGS} vs ${indexaveis}`)
  const reviewedIso = geoLib.ENGINE_GEO_REVIEWED_ISO
  const lastmodGeo = new Date(`${reviewedIso}T12:00:00.000Z`).getTime()

  // (1) (2) (6) (7) — página renderizada de cada motor indexável
  const esperado = {}
  for (const slug of indexaveis) {
    const e = cat.ENGINES[slug]
    const key = e.param
    const quality = clipPricing.CLIP_COSTS[key].filmQuality
    const clipSec = two.clipSecondsForTarget(key, 5)
    const clipCr = clipPricing.clipCreditCost(key, clipSec, false)
    const f35 = cost.creditCostForDuration(quality, true, 35)
    const f60 = cost.creditCostForDuration(quality, true, 60)
    const smallest = tiers.find(([t]) => pricing.TIER_CREDITS[t] >= f60) ?? null
    esperado[slug] = { name: e.name, clipSec, clipCr, f35, f60 }
    const html = renderToStaticMarkup(await load(PAGE).default({ params: { engine: slug } }))
    const t = texto(html)
    // primeira frase depois do H1
    const depoisH1 = html.slice(html.indexOf('</h1>'))
    const primeiroP = depoisH1.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''
    if (!primeiroP.startsWith('<p data-kineo="engine-answer"')) p.push(`${slug}: o primeiro parágrafo depois do H1 não é a resposta citável`)
    const lead = texto(primeiroP)
    const frase1 = `You can use ${e.name} online in Kineo Studio`
    if (!lead.startsWith(frase1)) p.push(`${slug}: a resposta não começa por "${frase1}"`)
    if (!lead.includes(`a ${clipSec}-second ${e.name} clip costs ${clipCr} credits (about ${usd(usdOf(clipCr))})`)) p.push(`${slug}: preço do clipe na 1ª frase ≠ fonte (${clipCr} cr, ${usd(usdOf(clipCr))})`)
    if (!lead.includes(`video with voice, captions and music costs ${f60} credits (about ${usd(usdOf(f60))})`)) p.push(`${slug}: preço do filme de 60 s na 1ª frase ≠ fonte (${f60} cr)`)
    if (smallest && !lead.includes(`is ${smallest[1]} at ${money(pricing.TIER_PRICES[smallest[0]].usd)}/month`)) p.push(`${slug}: menor plano ≠ fonte (${smallest[1]})`)
    // tabela
    const card = html.match(/<section data-kineo="engine-price-card"[\s\S]*?<\/section>/)?.[0] ?? ''
    if (!card) p.push(`${slug}: sem a tabela de preço`)
    const linhas = [...card.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => texto(c[1])))
    const exp = [[`${clipSec}-second clip`, clipCr], ['35-second video', f35], ['60-second video', f60]]
    for (const [rotulo, cr] of exp) {
      const linha = linhas.find((l) => l[0]?.startsWith(rotulo))
      const planos = tiers.map(([t]) => { const n = Math.floor(pricing.TIER_CREDITS[t] / cr); return n > 0 ? `${n} per month` : '—' })
      if (!linha || linha[1] !== `${cr} cr` || linha[2] !== usd(usdOf(cr)) || JSON.stringify(linha.slice(3)) !== JSON.stringify(planos)) {
        p.push(`${slug}: linha "${rotulo}" ≠ fonte (${JSON.stringify(linha)} vs ${cr} cr ${usd(usdOf(cr))} ${planos})`)
      }
    }
    for (const [tier, label] of tiers) {
      if (!card.includes(`${label} (${money(pricing.TIER_PRICES[tier].usd)}/mo · ${pricing.TIER_CREDITS[tier]} cr)`)) p.push(`${slug}: cabeçalho do plano ${label} ≠ checkout`)
    }
    // comparação direta (só fonte oficial, datada)
    const geo = cat.ENGINE_GEO[slug]
    if (!geo) { p.push(`${slug}: indexável sem camada citável`); continue }
    const cotacoes = { kling: 'runway-k25-standard', hollywood: 'runway-k3-standard', h3: 'runway-h3-standard', s25: 'runway-s25-standard' }
    for (const r of geo.direct) {
      for (const s of r.sources) {
        let host = ''
        try { host = new URL(s.url).hostname } catch { /* inválida */ }
        if (!OFICIAIS.includes(host) || !s.url.startsWith('https://')) p.push(`${slug}: fonte não oficial ${s.url}`)
        if (!card.includes(`href="${s.url}"`)) p.push(`${slug}: link da fonte ausente ${s.url}`)
      }
      if (geoLib.monthYear(r.checkedOn) !== 'October 2026') p.push(`${slug}: preço direto sem data de outubro/2026 (${r.checkedOn})`)
      if (r.clipUsdCents === null) continue
      let esperadoCents = null
      if (r.who.startsWith('Runway')) {
        const q = market.MARKET_QUOTES.find((x) => x.id === cotacoes[key])
        esperadoCents = q && q.source === 'oficial' ? Math.round((q.creditsPerSecond * clipSec * q.plan.usdCentsMonthly) / q.plan.creditsMonthly) : null
      } else if (r.who.startsWith('Google')) {
        esperadoCents = Math.round(geoLib.FONTES_DIRETAS.geminiVeoFast.usdPerSecondFrom * clipSec * 100)
      }
      if (esperadoCents === null || r.clipUsdCents !== esperadoCents) p.push(`${slug}: ${r.who} ≈ ${r.clipUsdCents} ≠ cotação oficial ${esperadoCents}`)
      if (!texto(card).includes(`About ${usd(r.clipUsdCents)} for ${clipSec} seconds of raw video.`)) p.push(`${slug}: preço direto de ${r.who} fora do HTML`)
    }
    if (!geo.direct.length && !geo.directNote) p.push(`${slug}: sem comparação direta e sem aviso honesto`)
    if (key === 'seedance' && !(geo.directNote && card.includes('href="https://www.byteplus.com/en/product/modelark"'))) p.push('seedance: aviso honesto da BytePlus ausente')
    // CTA → campanha + motor; frase da marca de apoio
    const cta = card.match(/<a href="([^"]+)"[^>]*>(Make a [^<]+ video →)<\/a>/)
    const hrefEsperado = intent.buildEngineLandingSignupHref({ engine: key, campaign: `seo_engine_${slug}` })
    if (!cta || unesc(cta[1]) !== hrefEsperado || cta[2] !== `Make a ${e.name} video →`) p.push(`${slug}: CTA do card ≠ cadastro com a campanha (${cta && unesc(cta[1])})`)
    else {
      const u = new URL(unesc(cta[1]), BASE)
      const redirect = new URL(u.searchParams.get('redirect') ?? '', BASE)
      if (u.pathname !== '/signup' || u.searchParams.get('intent_campaign') !== `seo_engine_${slug}` || redirect.pathname !== '/studio' || redirect.searchParams.get('engine') !== key || redirect.searchParams.get('intent_campaign') !== `seo_engine_${slug}`) {
        p.push(`${slug}: CTA não leva o motor e seo_engine_${slug} até o Studio`)
      }
    }
    const depoisCta = texto(card.slice(card.indexOf(cta?.[0] ?? '§')))
    if (!depoisCta.includes(BRAND) || !depoisCta.includes(REWARDS)) p.push(`${slug}: frase da marca não está logo abaixo do CTA`)
    if (/qualif/i.test(texto(card))) p.push(`${slug}: promete que o vídeo "se qualifica"`)
    // os CTAs de cadastro da página (hero, quando não é o par Seedance/Veo, e final) levam o mesmo destino
    const ctasPagina = [...html.matchAll(/<a href="([^"]+)"[^>]*>(Make a [^<]+ video →)<\/a>/g)]
    if (ctasPagina.length < 2 || ctasPagina.some((m) => unesc(m[1]) !== hrefEsperado)) p.push(`${slug}: CTAs "Make a … video" da página fora do destino com campanha`)
    // mentiras corrigidas
    if (t.includes('3–7 minutes')) p.push(`${slug}: ainda promete 3–7 minutes`)
    if (!t.includes(`Usually ${minutos} for a narrated video`)) p.push(`${slug}: tempo de entrega honesto ausente`)
    if (/unlocked on every account/.test(t)) p.push(`${slug}: ainda diz "unlocked on every account"`)
    if (!t.includes(`New accounts${trial.GRANT_COUNTRY_CLAUSE} start with ${trial.TRIAL_CREDITS_SHOWN} free credits`)) p.push(`${slug}: nota de acesso sem a cláusula do país`)
    // FAQ citável no JSON-LD (o que a IA lê)
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
    const faq = ld.find((x) => x && x['@type'] === 'FAQPage')
    const q = faq?.mainEntity?.find((x) => x.name === `Where can I use ${e.name} online, and what does a ${e.name} video cost?`)
    if (!q || !q.acceptedAnswer.text.includes(`a ${clipSec}-second ${e.name} clip costs ${clipCr} credits`) || !q.acceptedAnswer.text.includes(`${f60} credits for 60 seconds`)) p.push(`${slug}: FAQ citável ausente ou ≠ fonte no JSON-LD`)
    // tier derivado
    const tierEsperado = smallest ? smallest[1] : 'Studio'
    if (e.tier !== tierEsperado) p.push(`${slug}: tier "${e.tier}" ≠ menor plano que paga 60 s (${tierEsperado})`)
  }

  // (7b) as 26 páginas traduzidas (Seedance 1.5 e Veo 3.1 × 13 línguas): tempo honesto e trial com a cláusula do país
  const EL = load('lib/seo/enginePageLangs.ts')
  const restrito = trial.GRANT_COUNTRY_CLAUSE !== ''
  if (EL.TRIAL_ONLY_IN_SUPPORTED_COUNTRIES !== restrito) p.push(`enginePageLangs: espelho do país (${EL.TRIAL_ONLY_IN_SUPPORTED_COUNTRIES}) ≠ GRANT_COUNTRY_CLAUSE (${restrito})`)
  const fx = { engine: 'Veo 3.1', credits: cost.creditCostForDuration('cinematic_veo', true, 60), trial: trial.TRIAL_CREDITS_SHOWN }
  for (const code of EL.ENGINE_LANG_CODES) {
    const Lg = EL.ENGINE_LANGS[code]
    const faqs = Lg.faq({ ...fx, covers: false, starter: 'X' })
    const trialTextos = [Lg.description(fx), Lg.cost({ ...fx, covers: false, starter: 'X' }), faqs[1].a]
    const clausula = CLAUSULA_PAIS[code]
    if (!clausula) p.push(`${code}: língua sem cláusula de país conhecida pelo guardião`)
    else if (restrito && !trialTextos.every((s) => s.includes(clausula))) p.push(`${code}: trial prometido sem a cláusula do país`)
    else if (!restrito && trialTextos.some((s) => s.includes(clausula))) p.push(`${code}: cláusula do país com a política "todos"`)
    const tempo = faqs[2].a
    if (/(^|[^0-9])3\s*(–|à|إلى|سے|से)\s*7([^0-9]|$)/.test(tempo) || !/(^|[^0-9])8\s*(–|à|إلى|سے|से)\s*25([^0-9]|$)/.test(tempo)) p.push(`${code}: tempo de entrega ainda é 3–7 min (ou sem 8–25)`)
  }

  // (3) motor fora: sem camada citável, página sem bloco novo e sem "unlocked on every account"
  for (const slug of fora) {
    if (cat.ENGINE_GEO[slug]) p.push(`${slug}: motor pausado com camada citável`)
    const html = renderToStaticMarkup(await load(PAGE).default({ params: { engine: slug } }))
    if (html.includes('data-kineo="engine-answer"') || html.includes('data-kineo="engine-price-card"')) p.push(`${slug}: página de motor pausado com resposta citável`)
    if (/unlocked on every account/.test(texto(html))) p.push(`${slug}: página pausada diz "unlocked on every account"`)
  }
  const layout = load(LAYOUT)
  for (const slug of cat.ENGINE_SLUGS) {
    const meta = layout.generateMetadata({ params: { engine: slug } })
    const noindex = meta?.robots?.index === false
    if (noindex !== fora.includes(slug)) p.push(`${slug}: layout ${noindex ? 'noindex' : 'indexável'} ≠ régua (fora=${fora.includes(slug)})`)
  }
  // títulos sem "free"
  for (const slug of cat.ENGINE_SLUGS) {
    const title = load(PAGE).generateMetadata({ params: { engine: slug } }).title ?? ''
    if (/\bfree\b/i.test(title)) p.push(`${slug}: título com "free"`)
  }

  // (5) sitemap
  const sm = offlineModules({ replacements: rep, mocks: SITEMAP_MOCKS })(SITEMAP).default()
  const urls = sm.map((x) => x.url)
  for (const slug of indexaveis) {
    const ent = sm.filter((x) => x.url === `${BASE}/ai-video-generator/${slug}`)
    if (ent.length !== 1) p.push(`sitemap: ${slug} aparece ${ent.length}×`)
    else if (new Date(ent[0].lastModified).getTime() !== lastmodGeo) p.push(`sitemap: ${slug} sem o lastmod real da revisão`)
  }
  for (const slug of fora) if (urls.some((u) => u === `${BASE}/ai-video-generator/${slug}` || u.startsWith(`${BASE}/ai-video-generator/${slug}/`))) p.push(`sitemap: motor pausado ${slug} no mapa`)
  const langs = load('lib/seo/enginePageLangs.ts')
  for (const slug of langs.LOCALIZED_ENGINE_SLUGS) for (const code of langs.ENGINE_LANG_CODES) {
    const u = `${BASE}/ai-video-generator/${slug}/${code}`
    const ent = sm.find((x) => x.url === u)
    if (indexaveis.includes(slug) && (!ent || new Date(ent.lastModified).getTime() !== lastmodGeo)) p.push(`sitemap: ${u} ausente ou sem o lastmod da revisão`)
  }
  for (const path of ['/ai-video-generator', '/models-pricing', '/kineo-vs-higgsfield', '/seedance-vs-veo-vs-kling']) {
    const ent = sm.find((x) => x.url === `${BASE}${path}`)
    if (!ent || new Date(ent.lastModified).getTime() !== lastmodGeo) p.push(`sitemap: ${path} sem o lastmod da revisão`)
  }
  const cluster = sm.find((x) => x.url === `${BASE}/pricing`)
  if (!cluster || new Date(cluster.lastModified).getTime() === lastmodGeo) p.push('sitemap: re-datou página que esta revisão não tocou (/pricing)')

  // (5) llms.txt
  const L = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response, Date }, source: (rel, raw) => (Object.hasOwn(rep, rel) ? rep[rel] : raw) })
  const llms = await L(LLMS).GET().text()
  const ini = llms.indexOf('## Where to use each video engine online')
  const secao = ini >= 0 ? llms.slice(ini, llms.indexOf('\n## ', ini + 5)) : ''
  if (!secao) p.push('llms.txt: sem a seção "Where to use each video engine online"')
  for (const slug of indexaveis) {
    const x = esperado[slug]
    const linha = secao.split('\n').find((l) => l.startsWith(`- [Where to use ${x.name} online](${BASE}/ai-video-generator/${slug})`)) ?? ''
    if (!linha.includes(`${x.clipSec}-second clip: ${x.clipCr} credits`) || !linha.includes(`60-second narrated video: ${x.f60} credits`) || !linha.includes(`35-second narrated video: ${x.f35} credits`)) p.push(`llms.txt: linha do ${x.name} ausente ou ≠ fonte`)
  }
  for (const slug of fora) if (secao.includes(`/ai-video-generator/${slug})`)) p.push(`llms.txt: motor pausado ${slug} na seção de onde usar`)
  const arena = llms.split('\n').find((l) => l.startsWith('- [Engine Arena]')) ?? ''
  if (/\bseven\b/i.test(arena)) p.push('llms.txt: Engine Arena ainda fala em "seven"')
  const facts = L('lib/kineoFacts.ts')
  const veoFact = facts.ENGINE_FACTS.find((f) => f.name === 'Veo 3.1')
  if (!veoFact || /native audio/i.test(veoFact.what)) p.push('kineoFacts: Veo ainda diz "native audio" (a casa desliga o áudio do modelo)')

  // (4) robots
  const R = createOfflineLoader({ source: (rel, raw) => (Object.hasOwn(rep, rel) ? rep[rel] : raw) })(ROBOTS).default()
  for (const bot of AI_BOTS) {
    const grupo = R.rules.find((g) => (Array.isArray(g.userAgent) ? g.userAgent : [g.userAgent]).includes(bot))
    if (!grupo) { p.push(`robots: ${bot} sem grupo explícito`); continue }
    const allow = [].concat(grupo.allow ?? []), disallow = [].concat(grupo.disallow ?? [])
    if (!allow.includes('/')) p.push(`robots: ${bot} sem Allow: /`)
    if (disallow.some((d) => d === '/' || '/ai-video-generator/seedance'.startsWith(d))) p.push(`robots: ${bot} bloqueado nas páginas de motor`)
  }
  return p
}

console.log('TESTE motores-geo — páginas de motor citáveis (06/10)')
const real = await problemas()
ok(real.length === 0, '(1–7) preço da fonte, comparação direta, motor pausado fora do índice, robots, sitemap, llms.txt, CTA com campanha, mentiras corrigidas' + (real.length ? ' → ' + real.join(' | ') : ''))
ok(edicoesMotoresGeo(rd(PAGE)) === 11, 'as 11 edições da página que os guardiões de trava descontam existem (scripts/test-support/motores-geo-2026-10-06.mjs)')
{
  const cat = engineFixture()(CATALOG)
  const premium = ['seedance', 'kling', 'veo', 'kling-3', 'minimax-h3']
  ok(premium.every((s) => cat.INDEXABLE_ENGINE_SLUGS.includes(s) && cat.ENGINE_GEO[s]) && !cat.INDEXABLE_ENGINE_SLUGS.includes('gemini-omni-flash') && !cat.INDEXABLE_ENGINE_SLUGS.includes('kineo-1'), `hoje: Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3 e MiniMax H3 indexáveis com camada citável; Omni (pausado) e Kineo 1 (aposentado) fora [${cat.INDEXABLE_ENGINE_SLUGS}]`)
}

// (8) o ping do IndexNow: preparado, não executado
{
  const s = rd('scripts/indexnow-ping-2026-10-06.mjs')
  const geoSrc = rd(GEO)
  const key = (s.match(/const KEY = '([0-9a-f]{32})'/) ?? [])[1]
  ok(Boolean(key) && rd(`public/${key}.txt`).trim() === key && rd('lib/indexnow.ts').includes(`'${key}'`), '(8) ping usa a chave da casa: public/<chave>.txt na raiz do site, a mesma de lib/indexnow.ts')
  const iso = (s.match(/const REVIEWED_ISO = '([\d-]+)'/) ?? [])[1]
  ok(Boolean(iso) && geoSrc.includes(`export const ENGINE_GEO_REVIEWED_ISO = '${iso}'`), '(8) ping escolhe pelo lastmod desta revisão (espelho de ENGINE_GEO_REVIEWED_ISO)')
  ok(s.includes("const submit = args.includes('--submit')") && /if \(!submit\) \{[\s\S]*?process\.exit\(0\)/.test(s) && s.indexOf('await fetch(ENDPOINT') > s.indexOf('if (!submit) {'), '(8) ping é ensaio por padrão: só envia com --submit, depois de conferir a chave no ar')
  // executa o ping em modo offline contra o sitemap REAL gerado aqui (nenhuma rede)
  const sm = offlineModules({ mocks: SITEMAP_MOCKS })(SITEMAP).default()
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset>${sm.map((x) => `<url><loc>${x.url}</loc><lastmod>${new Date(x.lastModified).toISOString()}</lastmod></url>`).join('')}</urlset>`
  const dir = mkdtempSync(join(tmpdir(), 'kineo-indexnow-'))
  writeFileSync(join(dir, 'sitemap.xml'), xml)
  let saida = null
  try { saida = JSON.parse(execFileSync(process.execPath, ['scripts/indexnow-ping-2026-10-06.mjs', '--sitemap-file', join(dir, 'sitemap.xml')], { cwd: ROOT, encoding: 'utf8' }).split('\nNada foi enviado.')[0]) } catch (err) { console.log('    (ping offline falhou: ' + (err?.message ?? err) + ')') }
  const fx = engineFixture()
  const cat = fx(CATALOG)
  const langs = fx('lib/seo/enginePageLangs.ts')
  const deveTer = [
    `${BASE}/ai-video-generator`,
    ...cat.INDEXABLE_ENGINE_SLUGS.map((slug) => `${BASE}/ai-video-generator/${slug}`),
    ...langs.LOCALIZED_ENGINE_SLUGS.filter((s) => cat.INDEXABLE_ENGINE_SLUGS.includes(s)).flatMap((slug) => langs.ENGINE_LANG_CODES.map((code) => `${BASE}/ai-video-generator/${slug}/${code}`)),
    `${BASE}/models-pricing`, `${BASE}/kineo-vs-higgsfield`, `${BASE}/seedance-vs-veo-vs-kling`,
  ].sort()
  const veio = [...(saida?.urlList ?? [])].sort()
  ok(saida?.mode === 'ensaio-offline' && JSON.stringify(veio) === JSON.stringify(deveTer), `(8) ping offline escolhe EXATAMENTE as ${deveTer.length} URLs desta revisão (hub, motores indexáveis, traduzidas, 3 comparações) — nada de motor pausado nem de página de outra sessão [veio ${veio.length}]`)
}

// ── mutantes: cada regra quebrada fica VERMELHA; controles (a fonte muda) ficam VERDES ──
const troca = (rel, de, para, extra = {}) => {
  const src = rd(rel)
  if (src.split(de).length !== 2) throw new Error(`âncora do mutante ausente/ambígua em ${rel}: ${de.slice(0, 80)}`)
  return { ...extra, [rel]: src.replace(de, () => para) }
}
const precoCreatorMudou = troca(PRICING, 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 1290 },\n  basic: { usd: 2990 },', 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 1290 },\n  basic: { usd: 3190 },')
const veoPausado = troca(LAUNCH, '  return (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null', "  return k === 'veo' ? ENGINE_PAUSE.omni : (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null")
const controles = [
  ['C1 preço do Creator muda na fonte → a página acompanha (US$ derivado)', precoCreatorMudou],
  ['C2 pausar o Veo no interruptor → a página dele sai do índice sozinha', veoPausado],
]
for (const [rotulo, rep] of controles) {
  const r = await problemas(rep)
  ok(r.length === 0, `${rotulo} → verde` + (r.length ? ' → ' + r.join(' | ') : ''))
}
const mutantes = [
  ['M1 preço do clipe digitado', troca(GEO, "  const clip = row('clip', clipSeconds, clipCreditCost(key, clipSeconds, false))", "  const clip = row('clip', clipSeconds, 5)")],
  ['M2 preço do filme de 60 s digitado', troca(GEO, "  const film60 = row('film60', 60, creditCostForDuration(quality, true, 60))", "  const film60 = row('film60', 60, 35)")],
  ['M3 preço do plano digitado (com a fonte mudando)', troca(CATALOG, "  { tier: 'basic', label: 'Creator', usdCents: TIER_PRICES.basic.usd, credits: TIER_CREDITS.basic },", "  { tier: 'basic', label: 'Creator', usdCents: 2990, credits: TIER_CREDITS.basic },", precoCreatorMudou)],
  ['M4 motor pausado ganha página citável', troca(CATALOG, "  return !enginePaused(param) && (param !== 's25' || S25_PUBLIC)", "  return param !== 's25' || S25_PUBLIC")],
  ['M5 sitemap ignora a pausa (com o Veo pausado)', troca(SITEMAP, '  const engineNoIndex = ENGINE_SLUGS.filter((slug) => !isIndexableEngineSlug(slug)).map((slug) => `/ai-video-generator/${slug}`)', '  const engineNoIndex: string[] = []', veoPausado)],
  ['M6 layout não põe noindex', troca(LAYOUT, '  return ENGINES[params.engine] && !isIndexableEngineSlug(params.engine) ? { robots: { index: false, follow: true } } : {}', '  return {}')],
  ['M7 robots sem o Bingbot', troca(ROBOTS, "const SEARCH_INDEX_CRAWLERS = ['Bingbot']", 'const SEARCH_INDEX_CRAWLERS: string[] = []')],
  ['M8 robots sem o OAI-SearchBot', troca(ROBOTS, "  'OAI-SearchBot',\n", '')],
  ['M9 robots bloqueia as páginas de motor', troca(ROBOTS, "const DISALLOW = ['/api/',", "const DISALLOW = ['/ai-video-generator', '/api/',")],
  ['M10 llms.txt sem a seção de onde usar', troca(LLMS, '${engines}\n\n${engineGeoSection}## Beyond video', '${engines}\n\n## Beyond video')],
  ['M11 CTA do card sem cadastro (vai direto ao Studio)', troca(PAGE, '        {geo && <EnginePriceCard geo={geo} ctaHref={signupUrl} campaign={campaign} />}', '        {geo && <EnginePriceCard geo={geo} ctaHref={studioUrl} campaign={campaign} />}')],
  ['M12 campanha errada nos CTAs', troca(PAGE, '  const campaign = `seo_engine_${params.engine}`', "  const campaign = 'seo_engine'")],
  ['M13 resposta deixa de ser a 1ª frase depois do H1', troca(PAGE, '          {geo && <EngineAnswerLead geo={geo} />}\n          {!enginePaused(e.param) && <PaidEngineBudget slug={params.engine} />}\n', '          {!enginePaused(e.param) && <PaidEngineBudget slug={params.engine} />}\n          {geo && <EngineAnswerLead geo={geo} />}\n')],
  ['M14 volta o "3–7 minutes"', troca(GEO, '    turnaround: `Usually ${minutes} for a narrated video — it varies with length and provider queues`,', "    turnaround: '3–7 minutes from idea to download',")],
  ['M15 volta o "unlocked on every account"', troca(PAGE, '  const tierNote = geo ? geo.accessNote : enginePaused(e.param) ? pausedAccessNote(e.name, enginePaused(e.param)!) : e.tier', '  const tierNote = e.tier')],
  ['M16 sitemap re-data com a data antiga', troca(SITEMAP, ': engineGeoRevised.has(r.path) ? ENGINE_GEO_LAST_MODIFIED : LAST_MODIFIED,', ': LAST_MODIFIED,')],
  ['M17 preço direto inventado (Runway com crédito/s digitado)', troca(GEO, '    clipUsdCents: Math.round((q.creditsPerSecond * seconds * q.plan.usdCentsMonthly) / q.plan.creditsMonthly),', '    clipUsdCents: Math.round((10 * seconds * q.plan.usdCentsMonthly) / q.plan.creditsMonthly),')],
  ['M18 Veo volta a dizer "native audio"', troca('lib/kineoFacts.ts', "    what: 'Google Veo 3.1 (the Fast version) for high-fidelity generated scenes; Kineo turns the model’s own audio off and adds the narration, captions and music.',", "    what: 'Google Veo 3.1 for the highest-fidelity generated scenes, with native audio.',")],
  ['M19 tier volta a ser digitado (Kling 3 = Studio)', troca(CATALOG, "    tier: tierFor('cinematic_hollywood'),", "    tier: 'Studio',")],
  ['M20 frase da marca some do CTA', troca('components/EngineCitationAnswer.tsx', '>{ENGINE_GEO_BRAND_LINE}</p>', '>Start free today.</p>')],
  ['M21 espelho do país desligado (trial volta a valer "para todos" nas traduzidas)', troca('lib/seo/enginePageLangs.ts', 'export const TRIAL_ONLY_IN_SUPPORTED_COUNTRIES = true', 'export const TRIAL_ONLY_IN_SUPPORTED_COUNTRIES = false')],
  ['M22 tradução volta a prometer 3–7 minutos', troca('lib/seo/enginePageLangs.ts', 'lädst das Video herunter, meist in 8–25 Minuten.', 'lädst das Video herunter, meist in 3–7 Minuten.')],
]
// O mutante tem de ficar vermelho PELO MOTIVO CERTO (não por efeito colateral): o problema esperado precisa aparecer.
const ESPERADO = {
  M1: /preço do clipe na 1ª frase ≠ fonte/, M2: /preço do filme de 60 s na 1ª frase ≠ fonte/, M3: /na 1ª frase ≠ fonte/,
  M4: /INDEXABLE_ENGINE_SLUGS ≠ régua|motor pausado com camada citável/, M5: /sitemap: motor pausado veo no mapa/,
  M6: /layout indexável ≠ régua/, M7: /robots: Bingbot sem grupo explícito/, M8: /robots: OAI-SearchBot sem grupo explícito/,
  M9: /bloqueado nas páginas de motor/, M10: /llms\.txt: sem a seção/, M11: /CTA do card ≠ cadastro com a campanha/,
  M12: /CTA do card ≠ cadastro com a campanha/, M13: /primeiro parágrafo depois do H1 não é a resposta citável/,
  M14: /ainda promete 3–7 minutes/, M15: /ainda diz "unlocked on every account"/, M16: /sem o lastmod/,
  M17: /≠ cotação oficial/, M18: /Veo ainda diz "native audio"/, M19: /tier "Studio" ≠ menor plano/,
  M20: /frase da marca não está logo abaixo do CTA/,
  M21: /espelho do país .* ≠ GRANT_COUNTRY_CLAUSE/, M22: /de: tempo de entrega ainda é 3–7 min/,
}
for (const [rotulo, rep] of mutantes) {
  let r
  try { r = await problemas(rep) } catch (err) { r = [`(mutante lançou: ${err instanceof Error ? err.message.slice(0, 120) : String(err)})`] }
  const re = ESPERADO[rotulo.split(' ')[0]]
  const motivo = re ? r.find((x) => re.test(x)) : null
  ok(Boolean(motivo), `${rotulo} → vermelho pelo motivo certo` + (motivo ? ` (${motivo.slice(0, 110)}…)` : ` (esperado ${re}; veio: ${(r[0] ?? 'nada').slice(0, 110)})`))
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
if (fail) process.exit(1)
