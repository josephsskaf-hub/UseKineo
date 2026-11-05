// KINEO-VS-RIVAIS-0311 — guardião das comparações dos rivais do mesmo porte (fundador 03/11: "Sim para as páginas de comparação").
// Páginas novas: Revid, Crayo, AutoShorts, Faceless.video, Fliki, Zebracat. Relidas: InVideo, Pictory, OpusClip, Higgsfield.
// Offline: executa os módulos REAIS (páginas, sitemap, /llms.txt) sem rede/banco.
//
// Regras (cada uma com mutante que TEM de ficar vermelho, com prova de que o mutante foi aplicado):
//   R1 molde que a IA cita: estática, H1 = pergunta, canonical, título ≤60, descrição ≤155, 1ª frase diz quem escolhe o quê,
//      "Checked November 2026" visível, tabela e preços com fato + fonte + data na mesma célula, "When to choose" dos dois lados,
//      FAQPage JSON-LD = FAQ visível, datePublished/dateModified = dia da leitura;
//   R2 CTA com campanha própria (seo_vs_<id>) no destino e na origem do clique, na primeira dobra e no fecho; compra do Creator;
//   R3 nenhum preço da Kineo digitado: os arquivos não têm "$<n>", "USD <n>", "<n> credits" nem "<n>/month"; a página mostra o que
//      as constantes do código dizem (TIER_PRICES, TIER_CREDITS, creditsPerReferenceVideo, KLING4_PAID_CREDITS);
//   R4 todo fato de concorrente tem `// fonte: <URL> (lido em <data>)` logo acima com a MESMA URL e data, a URL é do site do
//      próprio concorrente, e número de concorrente só existe no módulo de fatos;
//   R5 sitemap (lastmod = data da leitura), /llms.txt, hub /vs e lista de guias citam as páginas; nenhuma fora das 5 línguas;
//   R6 nada de promessa proibida (COPY QUE MENTE), vencedor universal, nota inventada; o filme grátis leva a cláusula de país; só
//      motor público aparece na coluna da Kineo;
//   R7 as páginas relidas mostram o carimbo, o fato novo com fonte e o lastmod novo; o preço digitado do Higgsfield morreu;
//   R8 nenhuma página redireciona por país nem lê o visitante (lição da suspensão do Google Ads por cloaking).
// Rodar: node scripts/test-vs-rivais-0311.mjs
import assert from 'node:assert/strict'
import { React, root, source, offlineModules, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
import { moduleAt } from './gpt-5h-test-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

process.env.KINEO_REVERSE_TRIAL_ENABLED = 'true'
globalThis.fetch = () => { throw Error('Network forbidden in vs-rivais-0311 test') }

const BASE = 'https://www.usekineo.com'
const DAY = '2026-11-03'
const LABEL = 'Checked November 2026'
const FACTS = 'lib/seo/vsRivais0311.ts'
const ANSWERS = 'lib/growth/vsRivaisAnswers.ts'
const COMPONENT = 'components/VsRivalComparison.tsx'
const TEMPLATE = 'components/CitationAnswerPage.tsx'
const VS_ALT = 'components/VsAlternativeComparison.tsx'
const SITEMAP = 'app/sitemap.ts'
const LLMS = 'app/llms.txt/route.ts'
const HUB = 'app/vs/page.tsx'
const LINKS = 'components/CitationAnswerLinks.tsx'
const HIGGS_PAGE = 'app/kineo-vs-higgsfield/page.tsx'
const INVIDEO_PAGE = 'app/vs/invideo-alternatives-faceless-shorts/page.tsx'
const PICTORY_PAGE = 'app/vs/pictory-alternatives-cinematic-shorts/page.tsx'
const OPUS_PAGE = 'app/vs/opus-clip-alternatives-original-shorts/page.tsx'
const PAGES = {
  revid: 'app/vs/revid-alternative/page.tsx',
  crayo: 'app/vs/crayo-alternative/page.tsx',
  autoshorts: 'app/vs/autoshorts-alternative/page.tsx',
  facelessvideo: 'app/vs/faceless-video-alternative/page.tsx',
  fliki: 'app/vs/fliki-alternative/page.tsx',
  zebracat: 'app/vs/zebracat-alternative/page.tsx',
}
const FACT_KEYS = ['start', 'output', 'visuals', 'publish', 'price', 'plans', 'free']
// As promessas que o CLAUDE.md lista como "COPY QUE MENTE", e vencedor universal/nota inventada. Vale para o texto da Kineo: o fato
// do concorrente (que pode dizer "1080p" ou "Unlimited Cat", o nome do plano dele) é tirado antes.
const BANNED = [/unlimited/i, /priority queue/i, /12 characters/i, /1080p/i, /premium voices?/i, /forever storage/i, /stored forever/i,
  /every engine unlocked/i, /testimonial/i, /★/, /\b[1-5](\.\d)?\s*\/\s*5\b/, /\brated\s+[1-5]/i, /customers? (say|love)/i, /\bthe best\b/i, /\b#1\b/,
  /better than (revid|crayo|autoshorts|faceless\.video|fliki|zebracat)/i, /\bbeats\b/i, /guarantee(d|s)? (results|sales|views)/i]

const kineoFacts = await moduleAt('lib/kineoFacts.ts')
const read = (p, rep) => (rep[p] ?? source(p)).replace(/\r\n/g, '\n')
const codeOnly = (text) => text.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/ .*$/gm, '')
const ldOf = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
const titleOf = (meta) => (typeof meta.title === 'string' ? meta.title : meta.title?.absolute) ?? ''

function loaderFor(rep) {
  const base = offlineModules({ replacements: rep, mocks: { 'lib/kineoFacts.ts': kineoFacts, 'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source: s, placement, ...props }) => React.createElement('a', { ...props, 'data-source': s, 'data-placement': placement }, children) } } })
  const buy = base('lib/growth/buyCreatorOffer.ts')
  const cta = ({ page }) => React.createElement('a', { href: buy.buyCreatorHref(page), 'data-buy': 'creator' }, `${buy.buyCreatorCopy('en').button} · ${buy.buyCreatorCopy('en').priceLine}`)
  return offlineModules({
    replacements: rep,
    mocks: {
      'lib/kineoFacts.ts': kineoFacts,
      'components/OrganicCtaLink.tsx': base('components/OrganicCtaLink.tsx'),
      'components/BuyCreatorCta.tsx': { __esModule: true, default: cta },
    },
  })
}

async function run(rep = {}) {
  const fails = []
  const fail = (rule, msg) => fails.push(`${rule} ${msg}`)
  const load = loaderFor(rep)
  let facts
  try { facts = load(FACTS) } catch (e) { fail('R4', `módulo de fatos: ${e.message}`); return fails }
  if (facts.VS_RIVAIS_CHECKED_ISO !== DAY) fail('R4', `data da leitura ${facts.VS_RIVAIS_CHECKED_ISO}`)
  if (facts.VS_RIVAIS_CHECKED_LABEL !== LABEL) fail('R1', `carimbo "${facts.VS_RIVAIS_CHECKED_LABEL}"`)

  const engine = load('lib/engineLaunch.ts')
  const answersMod = load(ANSWERS)
  const answers = answersMod.VS_RIVAL_ANSWERS
  const market = load('lib/marketingPrice.ts')
  const checkout = load('lib/checkoutPricing.ts')
  const offer = load('lib/freeTierOffer.ts')
  const policy = load('lib/freeFilmPolicy.ts')
  const k4 = load('lib/kling4PaidPricing.ts')
  const k4Policy = load('lib/kling4PaidPolicy.ts')
  const html = {}

  // ── R1 · molde · R2 · CTA ────────────────────────────────────────────────────────────────────────────────────────────
  for (const [id, file] of Object.entries(PAGES)) {
    let mod
    try { mod = load(file) } catch (e) { fail('R1', `${id}: página não carrega (${e.message})`); continue }
    const a = answers[id]
    const c = facts.VS_RIVALS[id]
    if (!a || !c) { fail('R1', `${id}: sem resposta ou fatos`); continue }
    if (mod.dynamic !== 'force-static') fail('R1', `${id}: não é force-static`)
    const h = renderToStaticMarkup(React.createElement(mod.default))
    html[id] = h
    const t = titleOf(mod.metadata)
    if (!t || t.length > 60) fail('R1', `${id}: título ${t.length} > 60 ("${t}")`)
    const d = mod.metadata.description ?? ''
    if (!d || d.length > 155) fail('R1', `${id}: descrição ${d.length} > 155`)
    if (mod.metadata.alternates?.canonical !== `${BASE}${a.path}`) fail('R1', `${id}: canonical`)
    if (!h.includes(`<h1>${escapeHtml(a.question)}</h1>`)) fail('R1', `${id}: H1 não é a pergunta`)
    const direct = h.match(/<div class="kc-direct">([\s\S]*?)<\/div>/)?.[1] ?? ''
    const first = direct.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? ''
    if (!first.startsWith(`Pick ${escapeHtml(c.name)} if`) || !/\. Pick Kineo if /.test(first)) fail('R1', `${id}: a 1ª frase não diz quem escolhe o quê`)
    if (!h.includes(`Reviewed ${DAY}`)) fail('R1', `${id}: "Reviewed" não é a data da leitura`)
    if (!h.includes(LABEL)) fail('R1', `${id}: sem "${LABEL}" visível`)
    for (const k of FACT_KEYS) {
      const f = c[k]
      if (!f) { fail('R4', `${id}.${k}: fato ausente`); continue }
      const cell = `<td>${escapeHtml(f.text)}<span class="kc-source"><br/><a href="${escapeHtml(f.url)}" rel="nofollow noopener noreferrer">${escapeHtml(f.label)}</a> (${f.checkedOn})</span></td>`
      if (!h.includes(cell)) fail('R1', `${id}.${k}: fato sem texto/fonte/data na mesma célula`)
    }
    if (!h.includes(`<h2>When to choose ${escapeHtml(c.name)}</h2>`)) fail('R1', `${id}: sem "When to choose ${c.name}"`)
    if (!h.includes('<h2>When to choose Kineo</h2>')) fail('R1', `${id}: sem "When to choose Kineo"`)
    if (!h.includes('Pricing compared</h2>')) fail('R1', `${id}: sem "Pricing compared"`)
    const ld = ldOf(h)
    const faq = ld.find((x) => x['@type'] === 'FAQPage')
    if (!faq || faq.mainEntity.length !== a.faqs.length) fail('R1', `${id}: FAQPage JSON-LD`)
    else for (let i = 0; i < a.faqs.length; i++) {
      const q = faq.mainEntity[i]
      if (q.name !== a.faqs[i].question || q.acceptedAnswer.text !== a.faqs[i].answer || !h.includes(`<summary>${escapeHtml(q.name)}</summary>`) || !h.includes(escapeHtml(q.acceptedAnswer.text))) fail('R1', `${id}: FAQ ≠ JSON-LD (${q.name})`)
    }
    const page = ld.find((x) => x['@type'] === 'WebPage')
    if (page?.datePublished !== DAY || page?.dateModified !== DAY) fail('R1', `${id}: datePublished/dateModified (${page?.datePublished}/${page?.dateModified})`)
    if (!page?.citation?.includes(c.price.url)) fail('R1', `${id}: citation sem a fonte do preço`)

    // R2 — o link passa pelo escape do HTML; os testes leem o href já desescapado
    const hrefs = [...h.matchAll(/<a[^>]*href="([^"]*)"[^>]*data-source="([^"]*)"[^>]*data-placement="([^"]*)"/g)].map((m) => ({ href: m[1].replace(/&amp;/g, '&'), src: m[2], place: m[3] }))
    const campaign = `seo_vs_${id}`
    for (const place of ['hero', 'closing']) {
      const cta = hrefs.find((x) => x.place === place)
      if (!cta) { fail('R2', `${id}: sem CTA em ${place}`); continue }
      if (cta.src !== campaign) fail('R2', `${id}: origem do clique em ${place} é ${cta.src}`)
      const u = new URL(cta.href, BASE)
      if (u.pathname !== '/signup' || u.searchParams.get('intent_campaign') !== campaign || !String(u.searchParams.get('redirect')).startsWith('/studio')) fail('R2', `${id}: destino do CTA em ${place}: ${cta.href}`)
    }
    if (!/data-buy="creator"/.test(h)) fail('R2', `${id}: sem a compra do Creator`)
  }

  // ── R3 · nenhum preço nosso digitado ───────────────────────────────────────────────────────────────────────────────────
  const priceLiteral = /(\$\s?\d|USD\s?\d|\d+(\.\d+)?\s?(\/mo\b|\/month|per month|a month)|\b\d+\s?credits\b)/i
  for (const [label, text] of [[ANSWERS, read(ANSWERS, rep)], [COMPONENT, read(COMPONENT, rep)], ...Object.values(PAGES).map((f) => [f, read(f, rep)])]) {
    const m = codeOnly(text).match(priceLiteral)
    if (m) fail('R3', `${label}: preço digitado "${m[0]}"`)
  }
  const factsSrc = read(FACTS, rep)
  if (/^import /m.test(factsSrc)) fail('R3', `${FACTS}: deixou de ser puro (tem import)`)
  if (/Kineo[^.\n]{0,60}(\$|USD)\s?\d/.test(factsSrc)) fail('R3', `${FACTS}: preço da Kineo digitado`)
  const usd = (cents) => `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`
  const expected = [
    `Starter: ${usd(checkout.TIER_PRICES.starter.usd)}/month, ${checkout.TIER_CREDITS.starter} credits`,
    `Creator: ${usd(checkout.TIER_PRICES.basic.usd)}/month, ${checkout.TIER_CREDITS.basic} credits`,
    `Studio: ${usd(checkout.TIER_PRICES.pro.usd)}/month, ${checkout.TIER_CREDITS.pro} credits`,
    `${market.creditsPerReferenceVideo('cinematic_ai')} credits on Seedance 1.5`,
    `${market.creditsPerReferenceVideo('cinematic_h3')} on MiniMax H3`,
    ...(k4Policy.KLING4_PAID_LIVE ? [`${k4.KLING4_PAID_CREDITS[60]} on Kling 4.0`] : []),
  ]
  for (const [id, h] of Object.entries(html)) for (const want of expected) if (!h.includes(escapeHtml(want))) fail('R3', `${id}: a página não mostra "${want}" das constantes do código`)

  // ── R4 · todo fato externo com fonte e data; URL do próprio concorrente ───────────────────────────────────────────────────
  const lines = factsSrc.split('\n')
  const factLines = lines.map((l, i) => ({ l, i })).filter(({ l }) => /^\s+[a-zA-Z]+: \{ text: /.test(l))
  const expectedFacts = Object.keys(PAGES).length * FACT_KEYS.length + 4 + 1
  if (factLines.length !== expectedFacts) fail('R4', `esperava ${expectedFacts} fatos, achei ${factLines.length}`)
  const hostOf = (u) => new URL(u).hostname.replace(/^www\./, '').replace(/^help\./, '').replace(/^docs\./, '')
  const allowedHosts = new Set([...Object.values(facts.VS_RIVALS).map((c) => hostOf(c.homepage)), 'invideo.io', 'pictory.ai', 'opus.pro', 'higgsfield.ai'])
  for (const { l, i } of factLines) {
    const url = l.match(/url: '([^']+)'/)?.[1]
    const checked = l.match(/checkedOn: '([^']+)'/)?.[1]
    const c = (lines[i - 1] ?? '').match(/^\s+\/\/ fonte: (https:\/\/\S+) \(lido em (\d{4}-\d{2}-\d{2})\)$/)
    if (!c) { fail('R4', `fato sem comentário de fonte: ${l.trim().slice(0, 60)}`); continue }
    if (c[1] !== url) fail('R4', `fonte do comentário ≠ url do fato (${c[1]} vs ${url})`)
    if (c[2] !== checked || checked !== DAY) fail('R4', `data da fonte ≠ data do fato (${c[2]} vs ${checked})`)
    if (!allowedHosts.has(hostOf(url))) fail('R4', `fonte fora do site do próprio concorrente: ${url}`)
  }
  for (const [id, c] of Object.entries(facts.VS_RIVALS)) for (const k of FACT_KEYS) if (c[k] && hostOf(c[k].url) !== hostOf(c.homepage)) fail('R4', `${id}.${k}: fonte de outro site (${c[k].url})`)
  const allFacts = [...Object.values(facts.VS_RIVALS).flatMap((c) => FACT_KEYS.map((k) => c[k]).filter(Boolean)), ...Object.values(facts.VS_RIVAIS_REREAD).flatMap((x) => Object.values(x))]
  const numbers = new Set(allFacts.flatMap((f) => f.text.match(/\d[\d,.]*\d/g) ?? []).filter((n) => n.length >= 3 && !/^\d\.\d$/.test(n)))
  for (const [label, text] of [[ANSWERS, read(ANSWERS, rep)], [COMPONENT, read(COMPONENT, rep)], [VS_ALT, read(VS_ALT, rep)]]) { // as 2 páginas antigas têm números próprios: o R7 cobre o preço do Higgsfield
    const code = codeOnly(text).replace(/\b(2026|0311|u003c)\b/g, '')
    for (const n of numbers) if (new RegExp(`(^|[^\\w.,])${n.replace(/[.,]/g, '\\$&')}([^\\w]|$)`).test(code)) fail('R4', `${label}: número de concorrente "${n}" digitado fora do módulo de fatos`)
  }

  // ── R5 · sitemap, /llms.txt, hub, 5 línguas ──────────────────────────────────────────────────────────────────────────
  const lang = load('lib/seo/linguasPublicas0311.ts')
  const paths = facts.VS_RIVAL_LINKS.map((l) => l.path)
  for (const p of [...paths, ...facts.VS_RIVAIS_REFRESHED_PATHS]) if (lang.caminhoForaDasLinguas(p)) fail('R5', `${p}: fora das 5 línguas`)
  try {
    const altSrc = source('app/alternatives/[competitor]/page.tsx')
    const altSlugs = [...altSrc.slice(altSrc.indexOf('export const COMPETITORS'), altSrc.indexOf('export const COMPETITOR_SLUGS')).matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => m[1])
    const citation = load('lib/growth/citationAnswers.ts')
    const sm = offlineModules({
      replacements: rep,
      mocks: {
        'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] },
        'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: altSlugs },
        'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
        'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
        'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
        'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
        'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
        'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: citation.CITATION_ANSWER_LINKS, CITATION_REVIEW_DATE: citation.CITATION_REVIEW_DATE },
        'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
        'lib/kineoFacts.ts': kineoFacts,
      },
    })(SITEMAP).default()
    for (const path of [...paths, ...facts.VS_RIVAIS_REFRESHED_PATHS]) {
      const hits = sm.filter((x) => x.url === `${BASE}${path}`)
      if (hits.length !== 1) fail('R5', `sitemap: ${path} aparece ${hits.length}×`)
      else if (new Date(hits[0].lastModified).toISOString().slice(0, 10) !== DAY) fail(facts.VS_RIVAIS_REFRESHED_PATHS.includes(path) ? 'R7' : 'R5', `sitemap ${path} com lastmod ${hits[0].lastModified}`)
    }
  } catch (e) { fail('R5', `sitemap não executa: ${e.message}`) }
  try {
    const transform = (rel, raw) => (rep[rel] ?? raw).replace(/\r\n/g, '\n')
    const ll = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response }, source: transform })
    const body = ll(LLMS).GET()
    const t = typeof body === 'string' ? body : await body.text()
    for (const id of facts.VS_RIVAL_IDS) if (!t.includes(`- [${facts.VS_RIVAL_PAGES[id].label}](${BASE}${facts.VS_RIVAL_PAGES[id].path}): `)) fail('R5', `/llms.txt sem ${id}`)
  } catch (e) { fail('R5', `/llms.txt não executa: ${e.message}`) }
  if (!/\.\.\.VS_RIVAL_LINKS/.test(read(HUB, rep))) fail('R5', 'hub /vs sem as páginas')
  if (!/\.\.\.VS_RIVAL_LINKS\]/.test(read(LINKS, rep))) fail('R5', 'lista de guias sem as páginas')

  // ── R6 · promessa proibida, país, motor público ───────────────────────────────────────────────────────────────────────
  const stripFacts = (h, id) => {
    let out = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    for (const k of FACT_KEYS) { const f = facts.VS_RIVALS[id]?.[k]; if (f) out = out.split(escapeHtml(f.text)).join(' ').split(escapeHtml(f.text.charAt(0).toLowerCase() + f.text.slice(1))).join(' ') }
    return out.replace(/<[^>]+>/g, ' ')
  }
  const filmLine = `${offer.FREE_FILM_LABEL}${policy.FREE_FILM_COUNTRY_CLAUSE}`
  const publicEngines = engine.VIDEO_ENGINE_LIST_COPY
  for (const [id, h] of Object.entries(html)) {
    const text = stripFacts(h, id)
    for (const re of BANNED) if (re.test(text)) fail('R6', `${id}: promessa proibida ${re}: "${text.match(re)?.[0]}"`)
    if (!text.includes(escapeHtml(filmLine))) fail('R6', `${id}: filme grátis sem a cláusula de país ("${filmLine}")`)
    if (!engine.S25_PUBLIC && /Seedance 2\.5/.test(text)) fail('R6', `${id}: Seedance 2.5 na coluna da Kineo com S25_PUBLIC desligado`)
    if (engine.S25_PUBLIC && publicEngines.includes('Seedance 2.5') && !text.includes('Seedance 2.5 (paid plans)')) fail('R6', `${id}: Seedance 2.5 público sem "(paid plans)"`)
    if (/Omni Flash/i.test(text)) fail('R6', `${id}: motor pausado na página`)
    if (!engine.AVATAR_PUBLIC && /avatar engine\b/i.test(text) && !/no avatar engine/i.test(text)) fail('R6', `${id}: motor de avatar fora do catálogo`)
  }
  if (engine.KINEO1_PUBLIC) fail('R6', 'o Kineo 1 (estoque) voltou ao catálogo: "scenes are generated, not matched from stock" deixou de valer; rever o texto')
  const copy = codeOnly(read(ANSWERS, rep))
  for (const re of BANNED) if (re.test(copy)) fail('R6', `${ANSWERS}: promessa proibida ${re}`)
  if (copy.includes('Seedance 2.5') || copy.includes('Omni')) fail('R6', `${ANSWERS}: motor digitado em vez de vir de lib/engineLaunch`)

  // ── R7 · as páginas que já existiam, relidas ───────────────────────────────────────────────────────────────────────────
  const cellOf = (f) => `${escapeHtml(f.text)}<span class="kc-source"><br/><a href="${escapeHtml(f.url)}" rel="nofollow noopener noreferrer">${escapeHtml(f.label)}</a> (${f.checkedOn})</span>`
  for (const [id, file, cells] of [['pictory', PICTORY_PAGE, [facts.VS_RIVAIS_REREAD.pictory.plans, facts.VS_RIVAIS_REREAD.pictory.stock]], ['opusclip', OPUS_PAGE, [facts.VS_RIVAIS_REREAD.opusclip.plans]]]) {
    let h = ''
    try { h = renderToStaticMarkup(React.createElement(load(file).default)) } catch (e) { fail('R7', `${id}: não renderiza (${e.message})`); continue }
    if (!h.includes(LABEL)) fail('R7', `${id}: sem carimbo`)
    if (!h.includes(`Reviewed ${DAY}`)) fail('R7', `${id}: "Reviewed" velho`)
    if (ldOf(h).find((x) => x['@type'] === 'WebPage')?.dateModified !== DAY) fail('R7', `${id}: sem dateModified`)
    for (const f of cells) if (!h.includes(cellOf(f))) fail('R7', `${id}: fato relido sem fonte/data`)
  }
  try {
    const h = renderToStaticMarkup(React.createElement(load(INVIDEO_PAGE).default))
    const f = facts.VS_RIVAIS_REREAD.invideo.plans
    if (!h.includes(LABEL) || !h.includes(escapeHtml(f.text)) || !h.includes(`href="${f.url}"`)) fail('R7', 'invideo: sem carimbo/fato/fonte')
    if (ldOf(h).find((x) => x['@type'] === 'WebPage')?.dateModified !== DAY) fail('R7', 'invideo: sem dateModified')
  } catch (e) { fail('R7', `invideo: não renderiza (${e.message})`) }
  try {
    const mod = load(HIGGS_PAGE)
    const h = renderToStaticMarkup(React.createElement(mod.default))
    const f = facts.VS_RIVAIS_REREAD.higgsfield.plans
    if (!h.includes(LABEL) || !h.includes(escapeHtml(f.text)) || !h.includes(`href="${f.url}"`)) fail('R7', 'higgsfield: sem carimbo/fato/fonte')
    if (ldOf(h).find((x) => x['@type'] === 'WebPage')?.dateModified !== DAY) fail('R7', 'higgsfield: sem dateModified')
    if (!/data-vs-rival-answer="higgsfield"[^>]*>\s*Pick Higgsfield if [^<]*Pick Kineo if/.test(h)) fail('R7', 'higgsfield: sem a resposta primeiro')
    if (/\$15\/month|\$49\/month/.test(codeOnly(read(HIGGS_PAGE, rep)))) fail('R7', 'higgsfield: preço do concorrente digitado na página')
  } catch (e) { fail('R7', `higgsfield: não renderiza (${e.message})`) }

  // ── R8 · sem redirect por país ──────────────────────────────────────────────────────────────────────────────────────
  for (const file of [...Object.values(PAGES), COMPONENT, HIGGS_PAGE, INVIDEO_PAGE]) {
    const code = codeOnly(read(file, rep))
    for (const re of [/\bredirect\(/, /\bpermanentRedirect\(/, /\bheaders\(\)/, /\bcookies\(\)/, /x-vercel-ip-country/i, /geo\.country/i]) if (re.test(code)) fail('R8', `${file}: ${re}`)
  }
  return fails
}

const results = []
let ok = true, count = 0
const real = await run()
results.push(`${real.length ? 'FAIL' : 'PASS'} mundo real${real.length ? '\n   ' + real.join('\n   ') : ''}`)
if (real.length) ok = false; else count++

const sub = (file, from, to) => {
  const raw = source(file).replace(/\r\n/g, '\n')
  if (!raw.includes(from)) throw new Error(`mutante não aplica em ${file}: ${from.slice(0, 70)}`)
  const out = raw.split(from).join(to)
  assert.notEqual(out, raw)
  return { [file]: out }
}
const MUTANTS = [
  ['M1 fato sem comentário de fonte', 'R4', () => sub(FACTS, "    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)\n    price:", '    price:')],
  ['M2 fonte do comentário ≠ url', 'R4', () => sub(FACTS, "    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)\n    price:", "    // fonte: https://crayo.ai/ (lido em 2026-11-03)\n    price:")],
  ['M3 data do fato ≠ data da leitura', 'R4', () => sub(FACTS, "price: { text: 'Starter: USD 20/month, 30 credits, up to 15 videos a month.', label: 'Pricing page', url: 'https://faceless.video/pricing', checkedOn: '2026-11-03' }", "price: { text: 'Starter: USD 20/month, 30 credits, up to 15 videos a month.', label: 'Pricing page', url: 'https://faceless.video/pricing', checkedOn: '2026-10-01' }")],
  ['M4 fonte de terceiros (review, não o site dele)', 'R4', () => sub(FACTS, "    // fonte: https://www.zebracat.ai/pricing (lido em 2026-11-03)\n    price: { text: 'Cat Mode: USD 39/month, or USD 23/month billed yearly, for 15 videos and 350 generative AI credits a month.', label: 'Pricing page', url: 'https://www.zebracat.ai/pricing'", "    // fonte: https://www.g2.com/products/zebracat (lido em 2026-11-03)\n    price: { text: 'Cat Mode: USD 39/month, or USD 23/month billed yearly, for 15 videos and 350 generative AI credits a month.', label: 'Pricing page', url: 'https://www.g2.com/products/zebracat'")],
  ['M5 preço da Kineo digitado na resposta', 'R3', () => sub(ANSWERS, 'const CREATOR_LINE = `Kineo Creator is ${creator.priceLine} for', 'const CREATOR_LINE = `Kineo Creator is $9.90/month for')],
  ['M6 preço da Kineo digitado na tabela', 'R3', () => sub(COMPONENT, '{CITATION_PLANS.map((plan) => `${plan.name}: ${plan.price}, ${plan.credits} credits a month.`).join(\' \')}', 'Starter: $9.90/month, 40 credits a month.')],
  ['M7 crédito do filme digitado', 'R3', () => sub(ANSWERS, "`${creditsPerReferenceVideo('cinematic_ai')} credits on Seedance 1.5`", "'20 credits on Seedance 1.5'")],
  ['M8 número do concorrente digitado na resposta', 'R4', () => sub(ANSWERS, 'Revid pricing: ${r.revid.price.text}', 'Revid pricing: Growth has 2,000 AI credits.')],
  ['M9 CTA sem a campanha', 'R2', () => sub(ANSWERS, "startHref: buildBlankStudioSignupHref({ campaign }), ctaSource: campaign", "startHref: '/signup', ctaSource: campaign")],
  ['M10 origem do clique sem a campanha', 'R2', () => sub(TEMPLATE, 'const ctaSource = answer.ctaSource ?? `citacoes_01_${answer.id}`', 'const ctaSource = `citacoes_01_${answer.id}`')],
  ['M11 FAQ sem JSON-LD', 'R1', () => sub(TEMPLATE, '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, \'\\\\u003c\') }} />', '')],
  ['M12 sem dateModified', 'R1', () => sub(COMPONENT, '    dateModified: VS_RIVAIS_CHECKED_ISO,\n', '')],
  ['M13 sem o carimbo visível', 'R1', () => sub(FACTS, "'Checked November 2026'", "'Recently checked'")],
  ['M14 fonte some da célula', 'R1', () => sub(COMPONENT, '<a href={fact.url} rel="nofollow noopener noreferrer">{fact.label}</a>', '<a href="https://example.com" rel="nofollow noopener noreferrer">{fact.label}</a>')],
  ['M15 "When to choose" do rival some', 'R1', () => sub(ANSWERS, "heading: 'When to choose Revid',", "heading: 'Why Kineo wins',")],
  ['M16 a 1ª frase deixa de responder', 'R1', () => sub(ANSWERS, '`Pick Fliki if you turn', '`Fliki is a tool. People who turn')],
  ['M17 página fora do sitemap', 'R5', () => sub(SITEMAP, '...[...VS_RIVAL_LINKS.map(({ path }) => path), ...VS_RIVAIS_REFRESHED_PATHS]', '...[...VS_RIVAL_LINKS.slice(1).map(({ path }) => path), ...VS_RIVAIS_REFRESHED_PATHS]')],
  ['M18 página fora do /llms.txt', 'R5', () => sub(FACTS, 'return VS_RIVAL_IDS.map((id) => {', 'return VS_RIVAL_IDS.slice(1).map((id) => {')],
  ['M19 hub sem as páginas', 'R5', () => sub(HUB, '...VS_RIVAL_LINKS,', '')],
  ['M20 promessa proibida na resposta', 'R6', () => sub(ANSWERS, "output: 'One finished film:", "output: 'Priority queue and one finished film:")],
  ['M21 filme grátis sem a cláusula de país', 'R6', () => sub(ANSWERS, '`the first one is a ${FREE_FILM_LABEL}${FREE_FILM_COUNTRY_CLAUSE}`', '`the first one is a ${FREE_FILM_LABEL}`')],
  ['M22 lista de motores digitada com motor pausado', 'R6', () => sub(ANSWERS, "export const KINEO_ENGINE_LIST = KLING4_PAID_LIVE ? VIDEO_ENGINE_LIST_COPY : VIDEO_ENGINE_LIST_COPY.replace('Kling 4.0', 'Kling 3')", "export const KINEO_ENGINE_LIST = 'Omni Flash, Kling 3 and Seedance 2.5'")],
  ['M23 Pictory volta a 13/10', 'R7', () => sub(PICTORY_PAGE, 'reviewDate={VS_RIVAIS_CHECKED_ISO}', "reviewDate={'2026-10-13'}")],
  ['M24 preço do Higgsfield digitado de novo', 'R7', () => sub(HIGGS_PAGE, "on Higgsfield's own pricing page (checked November 2026): ${HIGGS.text}", "Higgsfield's plans start at $15/month.")],
  ['M25 relida com lastmod velho', 'R7', () => sub(SITEMAP, '...[...VS_RIVAL_LINKS.map(({ path }) => path), ...VS_RIVAIS_REFRESHED_PATHS]', '...VS_RIVAL_LINKS.map(({ path }) => path)')],
  ['M26 redirect por país', 'R8', () => sub(PAGES.fliki, 'export default function Page() {\n', "export default function Page() {\n  if (headers().get('x-vercel-ip-country') === 'BR') redirect('/')\n")],
]
for (const [name, rule, make] of MUTANTS) {
  let rep
  try { rep = make() } catch (e) { results.push(`FAIL ${name}: ${e.message}`); ok = false; continue }
  let fails
  try { fails = await run(rep) } catch (e) { fails = [`${rule} quebrou: ${e.message}`] }
  const red = fails.some((f) => f.startsWith(rule + ' '))
  results.push(`${red ? 'PASS' : 'FAIL'} mutante ${name} → ${red ? `vermelho em ${rule}` : `NÃO ficou vermelho em ${rule} (${fails.join(' | ') || 'verde'})`}`)
  if (red) count++; else ok = false
}

console.log(results.join('\n'))
if (!ok) { console.log(`FAIL vs-rivais-0311 (${count} ok)`); process.exit(1) }
console.log(`PASS vs-rivais-0311: mundo real + ${MUTANTS.length} mutantes vermelhos; root ${root}`)
