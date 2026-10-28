import { semCompraAvulsa2410 } from './test-support/desfaz-compra-avulsa-2410.mjs' // KINEO-LEVA-2410 — exact newer layer before the original G13 chain contract.
// KINEO-PAGINAS-UGC-2010 — guardião das páginas do AI UGC Ads (pilar EN/PT, gerador, 12 nichos) e do Kit Black Friday (EN/PT).
// Executa os módulos REAIS pelos loaders offline da casa (sem rede, sem banco) e renderiza cada página. Cada regra tem mutante
// que TEM de ficar vermelho na regra certa, com prova de que o mutante foi aplicado.
//
//   G1  as rotas existem e são estáticas: 5 páginas + /ai-ugc-ads/for/<nicho> só com os 12 nichos (nicho desconhecido = 404);
//   G2  metadata: título ≤ 60, description 70–155, canonical absoluto = página, hreflang en/pt-BR/x-default recíproco nos pares
//       (e nenhum hreflang nas páginas sem par); títulos e descriptions únicos;
//   G3  schema: todo JSON-LD é JSON válido com @context schema.org; a pilar tem FAQPage+HowTo+VideoObject+Product+BreadcrumbList,
//       as outras FAQPage+BreadcrumbList; FAQPage = FAQ visível; Product com preço numérico em USD; vídeo/pôster existem no disco;
//   G4  sitemap REAL (executado) traz cada URL nova uma vez com o lastmod da revisão, carimba as páginas que ganharam link, e o
//       IndexNow do cron (changedSinceSnapshot) envia as URLs novas na 1ª execução;
//   G5  /llms.txt REAL (executado) cita cada URL nova e os 3 carros-chefes com o nome do mercado;
//   G6  botão certo: UGC = /signup?redirect=/ads/v2?entry=ugc&…utm_campaign=<página> (logado = direto); Black Friday = three direct /ads/v2 template links + the existing credit pack;
//   G7  nenhum preço/crédito dentro de cartão de vídeo, de rosto ou de nicho;
//   G8  conteúdo único por nicho: campos completos, roteiro de 17–21 palavras com apresentador aprovado, cada campo longo com
//       similaridade (Jaccard de trigramas) < 0,5 contra o mesmo campo dos outros nichos, texto do nicho inteiro < 0,12, página
//       renderizada < 0,5, e o gerador não duplica a pilar (< 0,2);
//   G9  honestidade: nenhum crédito/preço digitado no texto, nada de nota/depoimento/"unlimited"/"#1", roteiro sem 1ª pessoa de
//       cliente nem pedido sensorial;
//   G10 links internos: pilar → 12 nichos + gerador + BF; nicho/gerador/BF → pilar; home (cards), /pricing e /ads → páginas novas;
//   G11 números das funções que cobram: a pilar mostra adsV2Credits do nível do apresentador e o preço do plano de entrada;
//   G12 rostos = os apresentadores aprovados (lib/ads/v2PresenterV2.ts), com retrato/voz/clipe existentes no disco;
//   G13 desfaz desta camada (scripts/test-support/desfaz-paginas-ugc-2010.mjs): cada arquivo antigo tocado, desfeito, é EXATAMENTE a base,
//       e a cabeça da cadeia do Studio Ads (semKitBfVenda2010) o chama primeiro.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { React, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const F = {
  paths: 'lib/seo/paginasUgc2010.ts',
  content: 'lib/growth/paginasUgc2010Content.ts',
  facts: 'lib/growth/paginasUgc2010Facts.ts',
  comp: 'components/ugc/UgcPages.tsx',
  bfComp: 'components/ads/BlackFridayCampaignPage.tsx',
  niche: 'app/ai-ugc-ads/for/[niche]/page.tsx',
  sitemap: 'app/sitemap.ts',
  llms: 'app/llms.txt/route.ts',
  home: 'components/home/HomeThreeCards.tsx',
  pricing: 'components/pricing/PricingBusinessBlock.tsx',
  ads: 'app/ads/page.tsx',
}
const BASE = 'https://www.usekineo.com'
const STUB = { __esModule: true, default: () => null }
const MOCKS = {
  'components/Footer.tsx': STUB,
  'lib/supabase/client.ts': { createClient: () => ({ auth: { getSession: async () => ({ data: {} }) } }) },
  'lib/analytics.ts': { trackEvent: () => {} },
}
const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const visible = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<nav[\s\S]*?<\/nav>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const shingles = (t) => { const w = t.toLowerCase().replace(/[^a-z0-9à-ú\s]/g, ' ').split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w.slice(i, i + 3).join(' ')); return s }
const jaccard = (a, b) => { const A = shingles(a), B = shingles(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n) }
const strip$ = (src) => src.replace(/\$\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '«expr»')

const BANNED = [
  [/\b\d[\d,.]*\s*\+?\s*(happy\s+)?(customers|users|creators|brands|businesses|clients|reviews|ratings|stars)\b/i, 'contagem de cliente/avaliação'],
  [/★|\b[1-5](\.\d)?\s*\/\s*5\b|\brated\s+[1-5]/i, 'nota inventada'],
  [/trusted by|loved by|customers? (say|love)\b/i, 'prova social inventada'],
  [/\bunlimited\b|\bilimitad|priority queue|forever storage|guaranteed? (results|sales|views|roas)/i, 'promessa proibida'],
  [/\bbetter than\b|\b#1\b|\bnúmero 1\b/i, 'vencedor universal'],
]

/** O sitemap REAL com as fronteiras que os guardiões da casa já simulam (o mesmo conjunto do test-bing-seo-1510). */
function sitemapReal(rep) {
  return offlineModules({
    replacements: rep,
    mocks: {
      'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] },
      'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
      'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
      'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
      'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
      'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
      'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
      'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
      'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
    },
  })(F.sitemap).default()
}

function ldOf(html) {
  const out = []
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) out.push(JSON.parse(m[1]))
  return out
}

async function audit(rep = {}, groups = null) {
  const fails = []
  const on = (g) => !groups || groups.includes(g)
  const fail = (g, msg) => fails.push(`${g}: ${msg}`)
  const src = (p) => (rep[p] ?? read(p)).replace(/\r\n/g, '\n')
  let load, P, C, facts, T, V2, L
  try {
    load = offlineModules({ replacements: rep, mocks: MOCKS })
    P = load(F.paths); C = load(F.content); facts = load(F.facts).paginasUgcFacts(); T = load('lib/ads/v2Tiers.ts'); V2 = load('lib/ads/v2PresenterV2.ts'); L = load('lib/ads/v2Presenter.ts')
  } catch (e) { fail('G1', `módulos não carregam: ${e.message}`); return fails }

  // ── as páginas ──────────────────────────────────────────────────────────────────────────────────────────────────
  const pages = [
    { kind: 'pillar', path: P.UGC_PILLAR_PATH, file: 'app/ai-ugc-ads/page.tsx', props: {}, campaign: P.PAGINAS_UGC_CAMPAIGN.pillar, cta: 'ugc' },
    { kind: 'pillar', path: P.UGC_PILLAR_PT_PATH, file: 'app/anuncios-ugc-com-ia/page.tsx', props: {}, campaign: P.PAGINAS_UGC_CAMPAIGN.pillarPt, cta: 'ugc' },
    { kind: 'generator', path: P.UGC_GENERATOR_PATH, file: 'app/ai-ugc-video-generator/page.tsx', props: {}, campaign: P.PAGINAS_UGC_CAMPAIGN.generator, cta: 'ugc' },
    { kind: 'bf', path: P.BF_EN_PATH, file: 'app/ai-black-friday-video-ads/page.tsx', props: {}, campaign: P.PAGINAS_UGC_CAMPAIGN.bf, cta: 'bf' },
    { kind: 'bf', path: P.BF_PT_PATH, file: 'app/anuncios-black-friday-com-ia/page.tsx', props: {}, campaign: P.PAGINAS_UGC_CAMPAIGN.bfPt, cta: 'bf' },
    { kind: 'bf', path: P.BF_ES_PATH, file: 'app/anuncios-black-friday-con-ia/page.tsx', props: {}, campaign: 'black_friday_kit_es', cta: 'bf' },
    ...P.UGC_NICHE_SLUGS.map((slug) => ({ kind: 'niche', slug, path: P.ugcNichePath(slug), file: F.niche, props: { params: { niche: slug } }, campaign: P.PAGINAS_UGC_CAMPAIGN.niche(slug), cta: 'ugc' })),
  ]
  if (JSON.stringify([...P.PAGINAS_UGC_PATHS].sort()) !== JSON.stringify(pages.map((p) => p.path).sort())) fail('G1', 'PAGINAS_UGC_PATHS ≠ páginas do lote')
  for (const p of pages) {
    if (!existsSync(resolve(root, p.file))) { fail('G1', `rota ausente: ${p.file}`); continue }
    try {
      const mod = load(p.file)
      p.meta = mod.metadata ?? mod.generateMetadata?.(p.props)
      p.html = renderToStaticMarkup(React.createElement(mod.default, p.props))
      p.text = visible(p.html)
      if (mod.dynamic !== 'force-static') fail('G1', `${p.path} não é estática`)
    } catch (e) { fail('G1', `${p.path} não renderiza: ${e.message}`) }
  }
  if (on('G1')) {
    try {
      const nm = load(F.niche)
      if (nm.dynamicParams !== false) fail('G1', 'nicho com dynamicParams diferente de false')
      if (JSON.stringify(nm.generateStaticParams().map((x) => x.niche)) !== JSON.stringify([...P.UGC_NICHE_SLUGS])) fail('G1', 'generateStaticParams ≠ os 12 nichos')
      if (P.UGC_NICHE_SLUGS.length !== 12) fail('G1', `nichos = ${P.UGC_NICHE_SLUGS.length} (pedido: 12)`)
      let nf = false
      try { renderToStaticMarkup(React.createElement(nm.default, { params: { niche: 'nope' } })) } catch (e) { nf = /NEXT_NOT_FOUND/.test(e.message) }
      if (!nf) fail('G1', 'nicho desconhecido não dá 404')
    } catch (e) { fail('G1', `rota de nicho: ${e.message}`) }
  }
  const ok = pages.filter((p) => p.html && p.meta)

  // ── G2 metadata ─────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G2')) {
    const titles = new Set(); const descs = new Set()
    for (const p of ok) {
      const t = p.meta.title?.absolute ?? p.meta.title; const d = p.meta.description
      if (typeof t !== 'string' || t.length < 20 || t.length > 60) fail('G2', `${p.path}: título com ${t?.length} caracteres`)
      if (typeof d !== 'string' || d.length < 70 || d.length > 155) fail('G2', `${p.path}: description com ${d?.length} caracteres`)
      if (titles.has(t)) fail('G2', `título repetido: ${t}`); titles.add(t)
      if (descs.has(d)) fail('G2', `description repetida em ${p.path}`); descs.add(d)
      if (p.meta.alternates?.canonical !== BASE + p.path) fail('G2', `${p.path}: canonical ${p.meta.alternates?.canonical}`)
      const pair = P.PAGINAS_UGC_PAIRS.find((x) => x.en === p.path || x.pt === p.path || x.es === p.path)
      const langs = p.meta.alternates?.languages
      if (pair) {
        const want = { en: BASE + pair.en, 'pt-BR': BASE + pair.pt, ...(pair.es ? { es: BASE + pair.es } : {}), 'x-default': BASE + pair.en }
        if (JSON.stringify(langs) !== JSON.stringify(want)) fail('G2', `${p.path}: hreflang ${JSON.stringify(langs)}`)
        const lang = p.path === pair.pt ? 'pt-BR' : p.path === pair.es ? 'es' : 'en'
        if (!p.html.includes(`lang="${lang}"`)) fail('G2', `${p.path}: <main lang> ≠ ${lang}`)
      } else if (langs) fail('G2', `${p.path}: hreflang numa página sem par`)
    }
    if (P.PAGINAS_UGC_PAIRS.length !== 2) fail('G2', 'pares EN/PT ≠ 2 (pilar e Black Friday)')
  }

  // ── G3 schema ───────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G3')) {
    for (const p of ok) {
      let lds
      try { lds = ldOf(p.html) } catch (e) { fail('G3', `${p.path}: JSON-LD inválido (${e.message})`); continue }
      for (const j of lds) if (j['@context'] !== 'https://schema.org') fail('G3', `${p.path}: @context ${j['@context']}`)
      const types = lds.map((j) => j['@type'])
      const need = p.kind === 'pillar' ? ['FAQPage', 'HowTo', 'VideoObject', 'Product', 'BreadcrumbList'] : ['FAQPage', 'BreadcrumbList']
      for (const t of need) if (types.filter((x) => x === t).length !== 1) fail('G3', `${p.path}: ${t} ×${types.filter((x) => x === t).length}`)
      const faq = lds.find((j) => j['@type'] === 'FAQPage')
      const shown = [...p.html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => ({ q: unesc(m[1]), a: unesc(m[2]) }))
      if (faq) {
        const ld = faq.mainEntity.map((x) => ({ q: x.name, a: x.acceptedAnswer?.text }))
        if (JSON.stringify(ld) !== JSON.stringify(shown) || shown.length < 3) fail('G3', `${p.path}: FAQPage (${ld.length}) ≠ FAQ visível (${shown.length})`)
      }
      for (const b of lds.filter((j) => j['@type'] === 'BreadcrumbList')) for (const it of b.itemListElement) if (!String(it.item).startsWith(BASE + '/')) fail('G3', `${p.path}: breadcrumb relativo`)
      const prod = lds.find((j) => j['@type'] === 'Product')
      if (prod) {
        const offers = prod.offers ?? []
        if (!offers.length || offers.some((o) => o['@type'] !== 'Offer' || !/^\d+(\.\d{2})?$/.test(String(o.price)) || o.priceCurrency !== 'USD')) fail('G3', `${p.path}: Product sem Offer numérico em USD`)
        const starter = load('lib/checkoutPricing.ts').getTierPrice('starter', 'usd', 'standard') / 100
        if (!offers.some((o) => Number(o.price) === starter)) fail('G3', `${p.path}: Offer do plano ≠ preço do caixa (${starter})`)
        if (prod.brand?.name !== 'Kineo') fail('G3', `${p.path}: Product sem brand Kineo`)
      }
      const vid = lds.find((j) => j['@type'] === 'VideoObject')
      if (vid) {
        for (const u of [vid.contentUrl, ...(vid.thumbnailUrl ?? [])]) if (!String(u).startsWith(BASE + '/') || !existsSync(resolve(root, 'public' + String(u).slice(BASE.length)))) fail('G3', `${p.path}: arquivo do VideoObject ausente (${u})`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(vid.uploadDate) || !/^PT\d+S$/.test(vid.duration)) fail('G3', `${p.path}: VideoObject sem data/duração`)
      }
      const how = lds.find((j) => j['@type'] === 'HowTo')
      if (how && (how.step?.length !== 3 || how.step.some((s) => !s.name || !s.text))) fail('G3', `${p.path}: HowTo sem os 3 passos`)
    }
  }

  // ── G4 sitemap + IndexNow ───────────────────────────────────────────────────────────────────────────────────────
  if (on('G4')) {
    try {
      const entries = sitemapReal(rep)
      const by = (u) => entries.filter((e) => e.url === u)
      for (const path of P.PAGINAS_UGC_PATHS) {
        const hit = by(BASE + path)
        if (hit.length !== 1) fail('G4', `sitemap cita ${path} ${hit.length}×`)
        else if (String(hit[0].lastModified) !== P.PAGINAS_UGC_REVIEWED_ISO) fail('G4', `${path}: lastmod ${hit[0].lastModified}`)
      }
      const stamp = new Date(`${P.PAGINAS_UGC_REVIEWED_ISO}T12:00:00.000Z`).getTime()
      for (const t of P.PAGINAS_UGC_TOUCHED_PATHS) {
        const hit = by(BASE + t)
        if (hit.length === 1 && !(new Date(hit[0].lastModified).getTime() >= stamp)) fail('G4', `página tocada "${t || '/'}" sem o carimbo do lote`)
        if (t !== '/ads' && hit.length !== 1) fail('G4', `página tocada "${t || '/'}" fora do sitemap`)
      }
      const I = load('lib/indexnow.ts')
      const now = Date.parse(`${P.PAGINAS_UGC_REVIEWED_ISO}T13:00:00.000Z`)
      const current = entries.map((e) => ({ loc: e.url, lastmod: e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified ?? '') }))
      const newUrls = new Set(P.PAGINAS_UGC_PATHS.map((x) => BASE + x))
      const snapshot = Object.fromEntries(current.filter((e) => !newUrls.has(e.loc)).map((e) => [e.loc, e.lastmod]))
      const changed = new Set(I.changedSinceSnapshot(current, snapshot, now))
      for (const u of newUrls) if (!changed.has(u)) fail('G4', `IndexNow do cron não enviaria ${u}`)
    } catch (e) { fail('G4', `sitemap não executa: ${e.message}`) }
  }

  // ── G5 /llms.txt ────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G5')) {
    try {
      const ll = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response }, source: (rel, raw) => (rep[rel] ?? raw).replace(/\r\n/g, '\n') })
      const body = ll(F.llms).GET()
      const t = typeof body === 'string' ? body : await body.text()
      for (const path of P.PAGINAS_UGC_PATHS) if (!t.includes(`](${BASE}${path})`)) fail('G5', `/llms.txt não cita ${path}`)
      for (const name of ['AI Faceless Videos', 'AI Product Ads', 'AI UGC Ads']) if (!t.includes(`- **${name}** — [`)) fail('G5', `/llms.txt sem o carro-chefe "${name}"`)
      for (const slug of P.UGC_NICHE_SLUGS) if (t.split(`](${BASE}${P.ugcNichePath(slug)})`).length !== 2) fail('G5', `/llms.txt cita o nicho ${slug} fora de 1×`)
    } catch (e) { fail('G5', `/llms.txt não executa: ${e.message}`) }
  }

  // ── G6 botões ───────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G6')) {
    for (const p of ok) {
      const need = p.kind === 'generator' ? 1 : 2
      if (p.cta === 'ugc') {
        const dest = P.ugcCtaDest(p.campaign)
        if (!dest.startsWith('/ads/v2?entry=ugc&') || !dest.includes(`utm_campaign=${p.campaign}`)) fail('G6', `${p.path}: destino UGC ${dest}`)
        if (P.ugcCtaHref(p.campaign, true) !== dest) fail('G6', 'logado não vai direto ao montador')
        const href = `/signup?redirect=${encodeURIComponent(dest)}`
        const n = p.html.split(`href="${href.replace(/&/g, '&amp;')}"`).length - 1
        if (n < need) fail('G6', `${p.path}: botão do 1º anúncio UGC ×${n} (esperado ≥${need})`)
      } else {
        const B = load('lib/ads/bfCampaign.ts')
        const lang = p.path === P.BF_PT_PATH ? 'pt' : p.path === P.BF_ES_PATH ? 'es' : 'en'
        for (const id of B.BF_TEMPLATE_IDS) {
          const href = B.bfTemplateHref(lang, id)
          if (!p.html.includes('href="' + href.replace(/&/g, '&amp;') + '"')) fail('G6', p.path + ': template sem destino direto ' + id)
        }
        const K = load('lib/ads/kitBfSale.ts')
        if (facts.kitSale) {
          const k = p.html.split('href="' + K.KIT_BF_CHECKOUT_HREF.replace(/&/g, '&amp;') + '"').length - 1
          if (k !== 1 || !p.text.includes(K.kitBfPriceLabel())) fail('G6', p.path + ': pack vigente ausente ou duplicado')
        }
      }
    }
  }

  // ── G7 sem preço em cartão ──────────────────────────────────────────────────────────────────────────────────────
  if (on('G7')) {
    const PRICE = /\d+\s*(credits?|créditos?)\b|(?<![A-Z])\$\s?\d|US\$|R\$/i
    for (const p of ok) {
      const blocks = [
        ...p.html.matchAll(/<figure class="kug-media"[\s\S]*?<\/figure>/g),
        ...p.html.matchAll(/<article class="kug-face"[\s\S]*?<\/article>/g),
        ...p.html.matchAll(/<div class="kug-niches">[\s\S]*?<\/div>/g),
      ].map((m) => visible(m[0]))
      for (const b of blocks) if (PRICE.test(b)) fail('G7', `${p.path}: preço dentro de cartão ("${b.slice(0, 70)}")`)
      if (p.kind === 'pillar' && !p.html.includes('class="kug-face"')) fail('G7', `${p.path}: cartões de rosto sumiram (prova vazia)`)
    }
  }

  // ── G8 conteúdo único por nicho ─────────────────────────────────────────────────────────────────────────────────
  if (on('G8')) {
    const N = P.UGC_NICHE_SLUGS.map((s) => C.UGC_NICHES[s])
    if (Object.keys(C.UGC_NICHES).sort().join() !== [...P.UGC_NICHE_SLUGS].sort().join()) fail('G8', 'UGC_NICHES ≠ UGC_NICHE_SLUGS')
    for (const n of N) {
      if (!n) continue
      if (n.formats?.length !== 3 || n.faqs?.length < 2 || n.related?.length !== 2) fail('G8', `${n.slug}: formatos/FAQ/relacionados incompletos`)
      if (n.related?.some((r) => r === n.slug || !P.UGC_NICHE_SLUGS.includes(r))) fail('G8', `${n.slug}: relacionado inválido`)
      const w = C.ugcScriptWords(n.script.lines)
      if (w < 17 || w > 21) fail('G8', `${n.slug}: roteiro com ${w} palavras (o apresentador v2 fala 17–21)`)
      if (!V2.ADS_V2_PRESENTER_V2_APPROVED.includes(n.script.presenter)) fail('G8', `${n.slug}: apresentador ${n.script.presenter} fora dos aprovados`)
      if (!n.title.includes('AI UGC Ads for') || !n.h1.toLowerCase().startsWith('ai ugc ads for')) fail('G8', `${n.slug}: título/H1 sem "AI UGC Ads for"`)
    }
    const FIELDS = [['intro', (n) => n.intro], ['angle', (n) => n.angle.body], ['photos', (n) => n.photos], ['check', (n) => n.check], ['description', (n) => n.description], ['faq', (n) => n.faqs.map((f) => f.q + ' ' + f.a).join(' ')], ['formats', (n) => n.formats.map((f) => f.name + ' ' + f.why).join(' ')], ['script', (n) => n.script.lines.join(' ')]]
    const whole = (n) => FIELDS.map(([, g]) => g(n)).join(' ') + ' ' + n.shopperQuestion + ' ' + n.angle.heading
    let maxWhole = 0, maxPage = 0
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      for (const [k, g] of FIELDS) { const s = jaccard(g(N[i]), g(N[j])); if (s >= 0.5) fail('G8', `${N[i].slug} × ${N[j].slug}: campo ${k} repetido (${s.toFixed(2)})`) }
      maxWhole = Math.max(maxWhole, jaccard(whole(N[i]), whole(N[j])))
    }
    if (maxWhole >= 0.12) fail('G8', `texto de nicho parecido demais (${maxWhole.toFixed(3)})`)
    const np = ok.filter((p) => p.kind === 'niche')
    for (let i = 0; i < np.length; i++) for (let j = i + 1; j < np.length; j++) maxPage = Math.max(maxPage, jaccard(np[i].text, np[j].text))
    if (maxPage >= 0.5) fail('G8', `páginas de nicho parecidas demais (${maxPage.toFixed(3)})`)
    const pil = ok.find((p) => p.path === P.UGC_PILLAR_PATH); const gen = ok.find((p) => p.path === P.UGC_GENERATOR_PATH)
    if (pil && gen && jaccard(pil.text, gen.text) >= 0.2) fail('G8', `o gerador duplica a pilar (${jaccard(pil.text, gen.text).toFixed(3)})`)
    audit.stats = { maxWhole, maxPage, gen: pil && gen ? jaccard(pil.text, gen.text) : null }
  }

  // ── G9 honestidade ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G9')) {
    const cs = strip$(src(F.content))
    const lits = cs.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n')
    for (const re of [/\d+\s*(credits?|créditos?)\b/i, /(?<![RS])\$\s?\d/, /US\$\s?\d/]) { const m = lits.match(re); if (m) fail('G9', `número nosso digitado no texto: "${m[0]}"`) }
    for (const [re, what] of BANNED) { const m = lits.match(re); if (m) fail('G9', `${what}: "${m[0]}"`) }
    for (const n of Object.values(C.UGC_NICHES)) {
      const s = n.script.lines.join(' ')
      if (/\b(I|I'm|I've|my|me|mine)\b/.test(s) || /\bI’/.test(s)) fail('G9', `${n.slug}: roteiro em 1ª pessoa de cliente`)
      if (/\b(smell|sniff|feel|savou?r|breathe|close your eyes|envelop|senses|allure|experience the)\b/i.test(s)) fail('G9', `${n.slug}: roteiro com pedido sensorial`)
    }
    if (/^import (?!type )/m.test(src(F.content)) || /^import (?!type )/m.test(src(F.paths))) fail('G9', 'texto/caminhos importam valor (deviam ser puros)')
  }

  // ── G10 links internos ──────────────────────────────────────────────────────────────────────────────────────────
  if (on('G10')) {
    const has = (p, href) => p.html.includes(`href="${href}"`)
    const pil = ok.find((p) => p.path === P.UGC_PILLAR_PATH)
    if (pil) for (const href of [...P.UGC_NICHE_SLUGS.map(P.ugcNichePath), P.UGC_GENERATOR_PATH, P.BF_EN_PATH, P.UGC_PILLAR_PT_PATH]) if (!has(pil, href)) fail('G10', `pilar sem link para ${href}`)
    const pt = ok.find((p) => p.path === P.UGC_PILLAR_PT_PATH)
    if (pt && !has(pt, P.BF_PT_PATH)) fail('G10', 'pilar PT sem link para o BF PT')
    for (const p of ok.filter((x) => x.kind === 'niche' || x.kind === 'generator' || x.path === P.BF_EN_PATH)) if (!has(p, P.UGC_PILLAR_PATH)) fail('G10', `${p.path} sem link para a pilar`)
    if (!src(F.home).includes('href={language === \'pt\' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH}') || !src(F.home).includes("<UiLabel>How AI UGC ads work</UiLabel>")) fail('G10', 'home (cards) sem o link para a pilar')
    for (const f of [F.pricing, F.ads]) if (!src(f).includes('href={UGC_PILLAR_PATH}') || !src(f).includes('href={BF_EN_PATH}')) fail('G10', `${f} sem os links para UGC e Black Friday`)
    const copy = JSON.parse(src('lib/ui/refinementCopy.json'))
    for (const [lang, m] of Object.entries(copy)) if (typeof m['How AI UGC ads work'] !== 'string' || !m['How AI UGC ads work'].trim()) fail('G10', `link da home sem tradução em ${lang}`)
  }

  // ── G11 números das funções que cobram ──────────────────────────────────────────────────────────────────────────
  if (on('G11')) {
    const tier = V2.ADS_V2_PRESENTER_V2_TIERS[0]
    const c15 = T.adsV2Credits(tier, 15), c20 = T.adsV2Credits(tier, 20), c30 = T.adsV2Credits(tier, 30)
    if (facts.ugcCredits.s15 !== c15 || facts.ugcCredits.s20 !== c20 || facts.ugcCredits.s30 !== c30) fail('G11', `créditos do UGC ≠ adsV2Credits(${tier}) (${JSON.stringify(facts.ugcCredits)})`)
    if (facts.minAdCredits15 !== Math.min(...T.ADS_V2_TIER_IDS.map((t) => T.adsV2Credits(t, 15)))) fail('G11', 'crédito mínimo do kit ≠ adsV2Credits')
    const pil = ok.find((p) => p.path === P.UGC_PILLAR_PATH)
    if (pil && !pil.text.includes(`${c15} credits (15 s), ${c20} (20 s) or ${c30} (30 s)`)) fail('G11', 'a pilar não mostra os créditos calculados')
    const bf = ok.find((p) => p.path === P.BF_EN_PATH)
    if (bf && !bf.text.includes(`${T.adsV2Credits('commercial', 15)} credits`)) fail('G11', 'a página do kit não mostra o crédito calculado')
    const K = load('lib/ads/kitBfSale.ts')
    if (facts.kitSale && (facts.kitSale.credits !== K.KIT_BF_CREDITS || facts.kitSale.perAd !== T.adsV2Credits('commercial', 15) || facts.kitSale.price !== K.kitBfPriceLabel())) fail('G11', 'números do kit ≠ lib/ads/kitBfSale.ts / adsV2Credits')
    if (bf && facts.kitSale && !bf.text.includes(`${K.KIT_BF_CREDITS} credits`)) fail('G11', 'a página do kit não mostra os créditos do kit')
    if (!src(F.facts).includes("from '@/lib/ads/kitBfSale'")) fail('G11', 'fatos não leem lib/ads/kitBfSale')
    const fs = src(F.facts)
    for (const imp of ["from '@/lib/ads/v2Tiers'", "from '@/lib/checkoutPricing'", "from '@/lib/ads/ugcComparison'", "from '@/lib/ads/v2KitBf'"]) if (!fs.includes(imp)) fail('G11', `fatos não leem ${imp}`)
  }

  // ── G12 rostos ──────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G12')) {
    const pil = ok.find((p) => p.path === P.UGC_PILLAR_PATH)
    const want = L.ADS_V2_PRESENTER_LIBRARY.filter((p) => V2.ADS_V2_PRESENTER_V2_APPROVED.includes(p.id)).map((p) => p.id)
    const shown = pil ? [...pil.html.matchAll(/data-ugc-face="([a-z]+)"/g)].map((m) => m[1]) : []
    if (JSON.stringify(shown) !== JSON.stringify(want) || want.length === 0) fail('G12', `rostos na página ${shown} ≠ aprovados ${want}`)
    for (const p of L.ADS_V2_PRESENTER_LIBRARY.filter((x) => want.includes(x.id))) for (const f of [p.portrait, p.voiceSample, p.clip].filter(Boolean)) if (!existsSync(resolve(root, 'public' + f))) fail('G12', `${p.id}: arquivo ausente ${f}`)
    for (const f of ['/previews/home-card-ugc-presenter.mp4', '/posters/home-card-ugc-presenter.webp']) if (!existsSync(resolve(root, 'public' + f))) fail('G12', `vídeo do herói ausente ${f}`)
  }
  // ── G13 desfaz ────────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('G13')) {
    try {
      const D = await import('./test-support/desfaz-paginas-ugc-2010.mjs')
      const git = (...a) => { try { return execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null } }
      for (const f of D.PAGINAS_UGC_2010_ARQUIVOS) {
        const base = git('show', `${D.PAGINAS_UGC_2010_BASE}:${f}`)
        if (base === null) continue // base fora deste clone: prova pulada
        let out
        try { out = D.semPaginasUgc2010(src(f), f) } catch (e) { fail('G13', e.message); continue }
        if (out.replace(/\r\n/g, '\n') !== base.replace(/\r\n/g, '\n')) fail('G13', `${f}: desfeito ≠ base`)
        if (out.includes(D.MARCA_PAGINAS_UGC_2010)) fail('G13', `${f}: sobrou a marca`)
      }
      if (!/export function semKitBfVenda2010\(texto, p\) \{\n  texto = semPaginasUgc2010\(texto, p\)/.test(semCompraAvulsa2410(read('scripts/test-support/desfaz-kit-bf-venda-2010.mjs'), 'scripts/test-support/desfaz-kit-bf-venda-2010.mjs'))) fail('G13', 'a cabeça da cadeia (semKitBfVenda2010) não chama o desfaz desta camada primeiro')
    } catch (e) { fail('G13', `desfaz não carrega: ${e.message}`) }
  }
  return fails
}

// ── Real: verde ────────────────────────────────────────────────────────────────────────────────────────────────────
const realFails = await audit()
assert.deepEqual(realFails, [], `guardião vermelho no código real:\n${realFails.join('\n')}`)
console.log(`ok — 18 páginas renderizadas: rotas, metadata/hreflang, schema, sitemap+IndexNow, /llms.txt, botões, sem preço em cartão, nichos únicos (máx. ${audit.stats.maxWhole.toFixed(3)} texto, ${audit.stats.maxPage.toFixed(3)} página; gerador × pilar ${audit.stats.gen.toFixed(3)}), honestidade, links, números calculados, rostos aprovados, desfaz exato`)

// ── Mutantes: cada um TEM de ficar vermelho na regra certa ─────────────────────────────────────────────────────────
const MUTANTS = [
  ['G1', F.niche, 'UGC_NICHE_SLUGS.map((niche) => ({ niche }))', 'UGC_NICHE_SLUGS.slice(1).map((niche) => ({ niche }))'],
  ['G2', F.content, "title: 'AI UGC Ads: an AI Person Holds Your Product | Kineo',", "title: 'AI UGC Ads: an AI Person Holds Your Product and Tells Why | Kineo',"],
  ['G2', F.paths, "      'pt-BR': `${PAGINAS_UGC_BASE}${pair.pt}`,", "      pt: `${PAGINAS_UGC_BASE}${pair.pt}`,"],
  ['G2', F.content, "title: 'AI UGC Ads for Perfume & Fragrance Brands | Kineo',", "title: 'AI UGC Ads for Skincare & Beauty Brands | Kineo',"],
  ['G3', F.comp, '{ld(faqLd(c.faqs))}{ld(howToLd)}', '{ld(faqLd(c.faqs.slice(1)))}{ld(howToLd)}'],
  ['G3', F.comp, '{ld(productLd)}', ''],
  ['G4', F.sitemap, '...PAGINAS_UGC_PATHS.map((path) => ({', '...PAGINAS_UGC_PATHS.slice(2).map((path) => ({'],
  ['G4', F.sitemap, 'const paths = new Set<string>(PAGINAS_UGC_TOUCHED_PATHS)', 'const paths = new Set<string>([])'],
  ['G5', F.llms, 'STUDIO_ADS_FACT ? paginasUgcLlmsSection(BASE, ugcNicheLabel) :', "STUDIO_ADS_FACT ? '' :"],
  ['G5', F.paths, "{ name: 'AI Product Ads', path: '/ads',", "{ name: 'Product Ads', path: '/ads',"],
  ['G6', F.paths, 'return `/ads/v2?entry=ugc&utm_source=seo', 'return `/ads/v2?entry=product&utm_source=seo'],
  ['G6', F.bfComp, 'href={bfTemplateHref(lang, id)}', 'href="/pricing"'],
  ['G11', F.facts, 'credits: KIT_BF_CREDITS,', 'credits: 300,'],
  ['G7', F.comp, '<span>{tag[p.tag] ?? p.tag} · {p.ageMin}–{p.ageMax}</span>', '<span>{tag[p.tag] ?? p.tag} · 41 credits</span>'],
  ['G8', F.content, "photos: 'The bottle upright with the cap on and the name readable, plus the box. A photo on a dressing table or in a hand helps the presenter shot get the scale right.',", "photos: 'The bottle or jar with the label readable, one photo of the texture on a clean surface, and the box if it carries the brand.',"],
  ['G8', F.content, "'Tap to get yours.']", "'Tap the button below right now and get yours today.']"],
  ['G8', F.content, "script: { presenter: 'kenji', product: 'the Orbit steel watch',", "script: { presenter: 'marcus', product: 'the Orbit steel watch',"],
  ['G9', F.content, "'Shop it today.']", "'I use it every day. Shop it.']"],
  ['G9', F.content, "'Grab one today.'", "'Smell the difference today.'"],
  ['G9', F.content, "a: 'Yes. Swap the roast for the blend and the steeping time; the script follows the facts you type.' }", "a: 'Yes, and it costs 41 credits. Trusted by 2,000 brands.' }"],
  ['G10', F.comp, '{UGC_NICHE_SLUGS.map((slug) => <Link key={slug} href={ugcNichePath(slug)}>', '{UGC_NICHE_SLUGS.slice(3).map((slug) => <Link key={slug} href={ugcNichePath(slug)}>'],
  ['G10', F.home, 'href={language === \'pt\' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH}', 'href="/ads"'],
  ['G10', F.pricing, '<a href={BF_EN_PATH} data-kineo="pricing-bf-link">', '<a href="/pricing" data-kineo="pricing-bf-link">'],
  ['G11', F.facts, 's15: adsV2Credits(UGC_AD_TIER, 15)', 's15: 40'],
  // G12: o interruptor dos aprovados e a lista filtram juntos; o mutante tira os dois e os 12 rostos aparecem.
  ['G12', F.comp, 'adsV2PresenterV2Visible(p.id, false) && ADS_V2_PRESENTER_V2_APPROVED.includes(p.id) && !!p.portrait)', '!!p.portrait)'],
  ['G13', F.ads, '3–5 variations</a></p>{/* KINEO-PAGINAS-UGC-2010 */}\n', '3–5 variations</a></p>\n'],
  ['G13', F.pricing, 'How Business works</a>\n', 'How Business works</a>\n            <span>extra</span>\n'],
]
for (const [rule, file, from, to] of MUTANTS) {
  const text = read(file)
  assert.ok(text.includes(from), `mutante ${rule} não aplicável: "${from.slice(0, 70)}" não existe em ${file}`)
  const mutated = text.replace(from, to)
  assert.ok(mutated !== text && mutated.includes(to), `mutante ${rule} não foi aplicado em ${file}`)
  const fails = await audit({ [file]: mutated }, [rule])
  assert.ok(fails.some((f) => f.startsWith(`${rule}:`)), `mutante ${rule} em ${file} ("${to.slice(0, 50)}") ficou VERDE. Falhas: ${fails.join(' | ')}`)
}
console.log(`ok — ${MUTANTS.length} mutantes aplicados, todos vermelhos na regra certa`)
