// KINEO-PAGINAS-LOTE1-2026-10-12 — guardião do LOTE 1 das "10 páginas novas por semana no estilo das que já vendem".
//
// Prova, renderizando as páginas de verdade (harness offline: módulos locais reais, sem servidor, banco, chave ou rede):
//   1. as 10 rotas existem (7 nichos em /free-ai-shorts/<slug> pelo registro NICHES + 3 arquivos de página);
//   2. cada uma tem o botão de compra direta (BuyCreatorCta) na primeira dobra, ANTES do formulário grátis;
//   3. cada uma mostra UM vídeo real da vitrine do fundador (posse confirmada, motor = selo, prévia e capa no disco);
//   4. cada uma tem ≥ 400 palavras de texto PRÓPRIO (o que vem de lib/seo/paginasLote1.ts, fora a ideia do filme) e nenhuma
//      frase de 6+ palavras repetida entre as 10;
//   5. as 10 estão no sitemap EXECUTADO (lastmod = data do lote), no hub /free-ai-shorts (cards) e no /llms.txt;
//   6. nada de motor aposentado/pausado nem promessa vazia: sem "Fast", "Kineo 1", "Omni", "unlimited", "forever" no texto
//      renderizado do conteúdo das 10 nem nos arquivos novos;
//   7. a FAQ diz a verdade de hoje com números DERIVADOS (filme grátis de 15 s, Creator, Starter, Studio) — nunca digitados;
//   8. links internos vindos de páginas irmãs (não da home).
// Uso: node scripts/test-paginas-lote1-1210.mjs
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { React, offlineModules, renderToStaticMarkup, root as ROOT, checks } from './gpt24h-offline-support.mjs'

const { check, finish } = checks()
const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const texto = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const palavras = (s) => (s.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [])
const PROIBIDAS = [/\bfast\b/i, /kineo\s*1\b/i, /\bomni\b/i, /\bunlimited\b/i, /\bforever\b/i]

const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
const ctaMock = { __esModule: true, default: ({ children, source, placement, analyticsEvent, focusTargetId, ...props }) => React.createElement('a', { ...props, 'data-source': source, 'data-placement': placement }, children) }
// O botão de compra é client component (hook de checkout): no guardião vira um marcador com a página e o secundário dentro.
const buyMock = { __esModule: true, default: ({ page, lang, secondary }) => React.createElement('div', { 'data-kineo': 'buy-creator-cta', 'data-page': page, 'data-lang': lang ?? 'en' }, secondary) }
const formMock = { __esModule: true, default: ({ formId, campaign, language }) => React.createElement('form', { 'data-offline-boundary': 'TopicGeneratorForm', 'data-form': formId, 'data-campaign': campaign, 'data-language': language ?? '' }) }
const MOCKS = {
  'components/Footer.tsx': { __esModule: true, default: plain('Footer') },
  'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': formMock,
  'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx': { __esModule: true, default: plain('LocalBusinessAdBrief') },
  'components/BuyCreatorCta.tsx': buyMock,
  'components/OrganicCtaLink.tsx': ctaMock,
  'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
}
const load = offlineModules({ mocks: MOCKS })

const PATHS_MOD = 'lib/seo/paginasLote1Paths.ts'
const DATA_MOD = 'lib/seo/paginasLote1.ts'
const paths = load(PATHS_MOD)
const data = load(DATA_MOD)
const vitrineMod = load('lib/publicExamples.ts')
const vitrine = [...(vitrineMod.ENGINE_PAGE_LEAD ?? []), ...(vitrineMod.FOUNDER_SHOWCASE ?? [])]
const ENGINE_NAMES = { cinematic_ai: 'Seedance 1.5', cinematic_kling: 'Kling 2.5', cinematic_veo: 'Veo 3.1', cinematic_hollywood: 'Kling 3', cinematic_h3: 'MiniMax H3' }

// ── 0. as listas puras batem com os dados ────────────────────────────────────────────────────────────────────────────
check('lote = 10 caminhos (7 nichos + 3 de intenção)', paths.LOTE1_PATHS.length === 10 && paths.LOTE1_NICHE_SLUG_LIST.length === 7 && paths.LOTE1_LANDING_PATH_LIST.length === 3)
check('chaves de LOTE1_NICHES = LOTE1_NICHE_SLUG_LIST', JSON.stringify(Object.keys(data.LOTE1_NICHES)) === JSON.stringify([...paths.LOTE1_NICHE_SLUG_LIST]))
check('caminhos de LOTE1_LANDINGS = LOTE1_LANDING_PATH_LIST', JSON.stringify(Object.values(data.LOTE1_LANDINGS).map((l) => l.path)) === JSON.stringify([...paths.LOTE1_LANDING_PATH_LIST]))
check('data do lote = 2026-10-12 (mesma nos dois módulos)', paths.LOTE1_REVIEWED_ISO === '2026-10-12' && data.LOTE1_REVIEWED_ISO === '2026-10-12')
check('módulo de caminhos é PURO (sem import)', !/^\s*import\s/m.test(rd(PATHS_MOD)))

// ── 1. as rotas existem ──────────────────────────────────────────────────────────────────────────────────────────────
const nichePage = load('app/free-ai-shorts/[niche]/page.tsx')
const ANTIGOS = ['money', 'faith', 'mystery', 'history', 'motivation', 'facts', 'ai', 'geography', 'space', 'truecrime', 'psychology', 'sports', 'science', 'conspiracy', 'luxury', 'stoicism', 'crypto', 'business', 'fitness', 'relationships', 'horror', 'celebrity', 'animals', 'health', 'cars', 'gaming', 'movies', 'food', 'travel', 'localbusiness']
check('NICHE_SLUGS = 30 de antes (mesma ordem) + 7 do lote no fim', JSON.stringify(nichePage.NICHE_SLUGS) === JSON.stringify([...ANTIGOS, ...paths.LOTE1_NICHE_SLUG_LIST]))
check('generateStaticParams cobre os 7 nichos', paths.LOTE1_NICHE_SLUG_LIST.every((s) => nichePage.generateStaticParams().some((x) => x.niche === s)))
check('nenhum slug do lote colide com nicho antigo', paths.LOTE1_NICHE_SLUG_LIST.every((s) => !ANTIGOS.includes(s)))
for (const p of paths.LOTE1_LANDING_PATH_LIST) check(`arquivo da rota ${p}`, existsSync(join(ROOT, 'app', p.slice(1), 'page.tsx')) && rd(`app${p}/page.tsx`).includes('KINEO-PAGINAS-LOTE1-2026-10-12'))

// ── renderiza as 10 ──────────────────────────────────────────────────────────────────────────────────────────────────
const paginas = []
for (const slug of paths.LOTE1_NICHE_SLUG_LIST) {
  const n = data.LOTE1_NICHES[slug]
  const html = renderToStaticMarkup(nichePage.default({ params: { niche: slug } }))
  const meta = nichePage.generateMetadata({ params: { niche: slug } })
  paginas.push({ id: `/free-ai-shorts/${slug}`, html, meta, dados: n, film: n.film, buyPage: `niche_${slug}` })
}
for (const [key, l] of Object.entries(data.LOTE1_LANDINGS)) {
  const mod = load(`app${l.path}/page.tsx`)
  const html = renderToStaticMarkup(mod.default())
  paginas.push({ id: l.path, html, meta: mod.metadata, dados: l, film: l.film, buyPage: l.buyPage, key })
}
check('10 páginas renderizadas', paginas.length === 10 && paginas.every((p) => p.html.length > 2000))

// texto PRÓPRIO de cada página = todas as strings dos dados dela, fora id/motor/fonte/ideia do filme e campos técnicos
// Só o que a página MOSTRA: meta (vai no <head>), card do hub e textos do formulário (client component) ficam fora da conta.
function proprios(obj, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (['id', 'engine', 'source', 'idea', 'path', 'buyPage', 'campaign', 'lang', 'href', 'searchTarget', 'metaTitle', 'metaDescription', 'hubCard', 'form', 'examples'].includes(k)) continue
    if (typeof v === 'string') out.push(v)
    else if (v && typeof v === 'object') proprios(v, out)
  }
  return out
}
const frasesPorPagina = new Map()
for (const p of paginas) {
  const strings = proprios(p.dados)
  const txt = strings.join(' \n ')
  const n = palavras(txt).length
  p.proprio = txt
  check(`${p.id}: ≥ 400 palavras de texto próprio (tem ${n})`, n >= 400)
  const unicas = new Set(palavras(txt)).size
  check(`${p.id}: vocabulário próprio ≥ 200 palavras distintas (tem ${unicas})`, unicas >= 200)
  // cada string própria aparece no HTML renderizado (o texto existe na página, não só nos dados)
  const t = texto(p.html)
  const faltando = strings.filter((s) => s.length > 30 && !t.includes(s.replace(/\s+/g, ' ').trim()))
  if (faltando.length) console.log(`  faltando em ${p.id}:`, faltando.map((s) => s.slice(0, 70)))
  check(`${p.id}: todo o texto próprio aparece no HTML (faltando ${faltando.length})`, faltando.length === 0)
  const frases = new Set(txt.split(/(?<=[.!?])\s+|\n/).map((f) => palavras(f).join(' ')).filter((f) => f.split(' ').length >= 6))
  frasesPorPagina.set(p.id, frases)
}
// ── 4b. nenhuma frase de 6+ palavras repetida entre as 10 ────────────────────────────────────────────────────────────
const repetidas = []
const ids = [...frasesPorPagina.keys()]
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  for (const f of frasesPorPagina.get(ids[i])) if (frasesPorPagina.get(ids[j]).has(f)) repetidas.push(`${ids[i]} × ${ids[j]}: ${f}`)
}
check(`nenhuma frase repetida entre as 10 páginas (${repetidas.length}${repetidas.length ? ': ' + repetidas[0] : ''})`, repetidas.length === 0)

for (const p of paginas) {
  const t = texto(p.html)
  // ── 2. compra direta antes do formulário ──
  const iBuy = p.html.indexOf('data-kineo="buy-creator-cta"')
  const iForm = p.html.indexOf('data-offline-boundary="TopicGeneratorForm"')
  check(`${p.id}: BuyCreatorCta (page=${p.buyPage}) na primeira dobra, antes do formulário`, iBuy > 0 && iForm > iBuy && p.html.includes(`data-page="${p.buyPage}"`))
  const h1 = p.html.indexOf('<h1')
  check(`${p.id}: H1 antes do botão de compra`, h1 > 0 && h1 < iBuy)
  check(`${p.id}: botão grátis ao lado do de compra (secundário dentro do bloco)`, /data-kineo="buy-creator-cta"[^>]*><a\b/.test(p.html))
  // ── 3. vídeo real da vitrine ──
  const v = vitrine.find((x) => x.id === p.film.id)
  check(`${p.id}: filme na vitrine do fundador com posse confirmada e motor igual`, !!v && v.ownershipEvidence === 'founder_confirmed_owned' && v.engine === p.film.engine)
  check(`${p.id}: <video> com a prévia e a capa do filme (arquivos no disco)`, !!v && p.html.includes(`<video src="${v.previewPath}"`) && p.html.includes(`poster="${v.posterPath}"`) && existsSync(join(ROOT, 'public', v.previewPath)) && existsSync(join(ROOT, 'public', v.posterPath)))
  check(`${p.id}: selo do motor real no vídeo (${ENGINE_NAMES[p.film.engine]})`, !!ENGINE_NAMES[p.film.engine] && t.includes(ENGINE_NAMES[p.film.engine]))
  check(`${p.id}: a ideia real do filme aparece`, t.includes(p.film.idea))
  if (p.film.honestNote) check(`${p.id}: nota honesta renderizada`, t.includes(p.film.honestNote))
  // ── 6. proibidas (no texto próprio e no renderizado do conteúdo) ──
  const alvo = `${p.proprio} ${p.meta.title} ${p.meta.description} ${p.dados.form ? Object.values(p.dados.form).join(' ') : ''} ${(p.dados.examples ?? []).join(' ')} ${(p.dados.ideas ?? []).join(' ')}`
  const achou = PROIBIDAS.filter((r) => r.test(alvo))
  check(`${p.id}: sem Fast/Kineo 1/Omni/unlimited/forever no conteúdo e no meta`, achou.length === 0)
  // ── meta responde à busca ──
  check(`${p.id}: title e description próprios (≤ 70 / ≤ 260 caracteres)`, typeof p.meta.title === 'string' && p.meta.title.length <= 70 && typeof p.meta.description === 'string' && p.meta.description.length <= 260 && p.meta.title === p.dados.metaTitle)
  check(`${p.id}: canonical próprio`, p.meta.alternates?.canonical === `https://www.usekineo.com${p.id}`)
  // ── FAQ + schema ──
  const faqLd = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((x) => x['@type'] === 'FAQPage')
  check(`${p.id}: FAQPage com as perguntas da página`, !!faqLd && faqLd.mainEntity.length === p.dados.faq.length && p.dados.faq.length >= 3)
}

// ── 6b. arquivos novos sem as proibidas (fora comentário) ────────────────────────────────────────────────────────────
// fora comentário e fora o literal técnico 'fast' do creationIntent (contrato do cadastro, não copy)
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n').replace(/OFFER\.reverseTrial \? 'trial_best' : 'fast'/g, '')
for (const f of ['components/Lote1Landing.tsx', DATA_MOD, ...paths.LOTE1_LANDING_PATH_LIST.map((p) => `app${p}/page.tsx`)]) {
  const src = semComentario(rd(f))
  check(`${f}: sem Fast/Kineo 1/Omni/unlimited/forever`, PROIBIDAS.every((r) => !r.test(src)))
}

// ── 7. verdade de hoje, derivada ─────────────────────────────────────────────────────────────────────────────────────
const dsrc = rd(DATA_MOD)
check('preço/créditos não digitados nos dados (sem "$" seguido de número)', !/\$\d/.test(semComentario(dsrc)))
check('dados derivam de buyCreatorPrice/creatorSeedanceFilms/TRIAL_FREE_FILM_SECONDS/marketingPrice', ['buyCreatorPrice()', 'creatorSeedanceFilms()', 'TRIAL_FREE_FILM_SECONDS', 'STARTER_PRICE', 'STUDIO_PRICE'].every((x) => dsrc.includes(x)))
const offer = load('lib/growth/buyCreatorOffer.ts')
const mp = load('lib/marketingPrice.ts')
const free = load('lib/freeTierOffer.ts')
const preco = offer.buyCreatorPrice()
for (const p of paginas) {
  const faq = p.dados.faq.map((f) => f.a).join(' ')
  check(`${p.id}: FAQ diz o filme grátis de ${free.TRIAL_FREE_FILM_SECONDS} s com marca d'água`, faq.includes(`${free.TRIAL_FREE_FILM_SECONDS}`) && /watermark|marca de agua/i.test(faq))
  check(`${p.id}: FAQ diz o preço do Creator (${preco.full}${preco.firstMonth ? ` / ${preco.firstMonth} no 1º mês` : ''}) e os ${offer.creatorSeedanceFilms()} filmes de 60 s`, faq.includes(preco.full) && (!preco.firstMonth || faq.includes(preco.firstMonth)) && faq.includes(`${offer.creatorSeedanceFilms()}`))
}
const todasFaq = paginas.map((p) => p.dados.faq.map((f) => f.a).join(' ')).join(' ')
check(`Starter (${mp.STARTER_PRICE}) e Studio (${mp.STUDIO_PRICE}) aparecem na FAQ do lote`, todasFaq.includes(mp.STARTER_PRICE) && todasFaq.includes(mp.STUDIO_PRICE))
check('a página "no watermark" diz que o grátis TEM marca d\'água', ((a) => /^No\./.test(a) && /\bfree\b/.test(a) && /\bwatermarked\b/.test(a))(data.LOTE1_LANDINGS['ai-shorts-generator-no-watermark'].faq[0].a))
check('a página em espanhol usa o botão em espanhol', paginas.find((p) => p.id === '/generador-de-videos-de-terror').html.includes('data-lang="es"'))
check('a página em espanhol leva language=es ao formulário', paginas.find((p) => p.id === '/generador-de-videos-de-terror').html.includes('data-language="es"'))
const esCopy = offer.buyCreatorCopy('es')
check('copy do botão em espanhol deriva dos mesmos números', esCopy.button.includes(`${offer.creatorSeedanceFilms()} videos de 60 s`) && esCopy.note.includes('sin marca de agua'))

// ── 5. sitemap EXECUTADO, hub e llms.txt ─────────────────────────────────────────────────────────────────────────────
const SITEMAP_MOCKS = {
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: nichePage.NICHE_SLUGS }, 'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
  'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] }, 'lib/comparisons.ts': { CANONICAL_SLUGS: [] }, 'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false }, 'lib/growth/enginePageCatalog.ts': { ENGINE_SLUGS: [], isIndexableEngineSlug: () => false },
  'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
  'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
  'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] }, 'lib/seo/enginePageLangs.ts': { LOCALIZED_ENGINE_SLUGS: [], ENGINE_LANG_CODES: [] },
}
const sm = offlineModules({ mocks: SITEMAP_MOCKS })('app/sitemap.ts').default()
for (const p of paths.LOTE1_PATHS) {
  const e = sm.filter((x) => x.url === `https://www.usekineo.com${p}`)
  check(`sitemap: ${p} uma vez, lastmod 2026-10-12`, e.length === 1 && new Date(e[0].lastModified).toISOString().startsWith('2026-10-12'))
}
const hub = rd('app/free-ai-shorts/page.tsx')
check('hub /free-ai-shorts ganha o card de cada nicho do lote (LOTE1_NICHES[slug].hubCard)', hub.includes('for (const [slug, n] of Object.entries(LOTE1_NICHES))') && hub.includes('title: n.hubCard.title'))
const hubMod = offlineModules({ mocks: { ...MOCKS, 'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: nichePage.NICHE_SLUGS } } })('app/free-ai-shorts/page.tsx')
const hubHtml = renderToStaticMarkup(hubMod.default())
check('hub renderizado linka os 7 nichos novos', paths.LOTE1_NICHE_SLUG_LIST.every((s) => hubHtml.includes(`/free-ai-shorts/${s}"`)))
const llms = rd('app/llms.txt/route.ts')
check('llms.txt Key pages: as 10 URLs, em 3 linhas novas', paths.LOTE1_PATHS.every((p) => llms.includes(`\${BASE}${p})`)) && llms.split('\n').filter((l) => paths.LOTE1_PATHS.some((p) => l.includes(`\${BASE}${p})`))).length === 3)
check('llms.txt: linhas do lote antes de "Best AI Shorts generators" (dentro de Key pages)', llms.indexOf('${BASE}/ai-shorts-generator-no-watermark)') > llms.indexOf('## Key pages') && llms.indexOf('${BASE}/ai-shorts-generator-no-watermark)') < llms.indexOf('- [Best AI Shorts generators]'))

// ── 8. links internos de irmãs (não da home) ─────────────────────────────────────────────────────────────────────────
const horror = renderToStaticMarkup(nichePage.default({ params: { niche: 'horror' } }))
check('horror (nicho nº 1) linka a porta em espanhol e o curta-metragem', horror.includes('href="/generador-de-videos-de-terror"') && horror.includes('href="/ai-short-film-generator"'))
check('cada nicho antigo ganha os 7 novos no rodapé "More:"', paths.LOTE1_NICHE_SLUG_LIST.every((s) => horror.includes(`href="/free-ai-shorts/${s}"`)))
check('/free-ai-shorts-generator linka "no watermark" e o curta-metragem', rd('app/free-ai-shorts-generator/page.tsx').includes('href="/ai-shorts-generator-no-watermark"') && rd('app/free-ai-shorts-generator/page.tsx').includes('href="/ai-short-film-generator"'))
check('/generador-de-shorts-gratis linka a página de terror', rd('app/generador-de-shorts-gratis/page.tsx').includes('href="/generador-de-videos-de-terror"'))
check('a home NÃO foi tocada pelo lote', !rd('app/page.tsx').includes('KINEO-PAGINAS-LOTE1') && !rd('app/KineoLanding.tsx').includes('KINEO-PAGINAS-LOTE1'))
check('lib/engineWall.ts NÃO foi tocado pelo lote', !rd('lib/engineWall.ts').includes('KINEO-PAGINAS-LOTE1'))

// ── nichos antigos continuam iguais onde importa (o lote não reescreve título/descrição deles) ─────────────────────────
const mHorror = nichePage.generateMetadata({ params: { niche: 'horror' } })
check('nicho antigo mantém o título de sempre', mHorror.title === 'Free AI Horror Shorts Generator — Kineo')
check('nicho antigo não ganha o bloco do lote', !horror.includes('data-kineo="lote1-guide"'))

finish()
