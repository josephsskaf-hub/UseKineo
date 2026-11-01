// KINEO-PAGINAS-IA-0111 — guardião das 20 páginas novas de 01/11 ("dobrar o canal que já paga": ChatGPT/Bing).
// Prova, contra o código real: (1) as 20 rotas existem (8 nichos em /free-ai-shorts, 10 no catálogo /ai-video-generator/for,
// 2 artigos de dinheiro com rota própria); (2) estão no sitemap (nichos por NICHE_SLUGS, catálogo por INTENT_SLUGS, artigos
// empurrados direto) e no llms.txt; (3) nenhum título, H1 ou description duplicado — entre elas e contra as irmãs;
// (4) nenhum preço literal da Kineo (preço vem de lib/marketingPrice/buyCreatorOffer) e nenhuma promessa proibida;
// (5) todo número de terceiro dos artigos tem fonte oficial (YouTube/AdSense Help) com data; (6) a família 'alternative' só
// descreve a Kineo. Cada regra também roda contra MUTANTES (cada um tem de derrubar a sua regra).
// Rodar: node scripts/test-paginas-ia-0111.mts
import { readFileSync, existsSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const FILES: Record<string, string> = {
  paths: 'lib/seo/paginasIa0111Paths.ts',
  data: 'lib/seo/paginasIa0111.ts',
  intent: 'lib/seo/intentPages.ts',
  niche: 'app/free-ai-shorts/[niche]/page.tsx',
  hub: 'app/free-ai-shorts/page.tsx',
  sitemap: 'app/sitemap.ts',
  llms: 'lib/seo/trafego2310.ts',
  artigo: 'components/seo/ArtigoDinheiro0111.tsx',
  pay: 'app/when-does-youtube-pay-you/page.tsx',
  share: 'app/youtube-shorts-revenue-sharing-explained/page.tsx',
  acq: 'lib/acquisitionSource.ts',
  lote1: 'lib/seo/paginasLote1.ts',
}
const REAL: Record<string, string> = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))

// valores falsos e reconhecíveis para as fontes únicas de preço: se um deles aparecer, veio da fonte (não foi digitado)
const STUB_PRICE = { full: '$PRECO_CREATOR', firstMonth: null, percentOff: null }
function run(src: string, mods: Record<string, unknown>): any {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports: Record<string, unknown> = {}
  const require = (id: string) => {
    if (id in mods) return mods[id]
    throw new Error(`import inesperado: ${id}`)
  }
  vm.runInNewContext(js, { exports, require, URLSearchParams, URL, Map, Set, Array, Object, String, Number, RegExp, Error, JSON, Math, Date })
  return exports
}

function load(S: Record<string, string>) {
  const P = run(S.paths, {})
  const D = run(S.data, {
    '@/lib/growth/buyCreatorOffer': { buyCreatorPrice: () => STUB_PRICE, creatorSeedanceFilms: () => 7 },
    '@/lib/freeTierOffer': { TRIAL_FREE_FILM_SECONDS: 15 },
    '@/lib/freeFilmEngine': { FREE_FILM_ENGINE_NAME: 'Seedance 1.5' },
    '@/lib/entryPolicy': { FREE_ENTRY_COUNTRY_CLAUSE_MIRROR: ' in supported countries' },
    '@/lib/marketingPrice': { STARTER_PRICE: '$PRECO_STARTER', STUDIO_PRICE: '$PRECO_STUDIO' },
    '@/lib/seo/paginasIa0111Paths': P,
  })
  const C = run(S.intent, { '../freeFilmEngine': { FREE_FILM_ENGINE_NAME: 'Seedance 1.5' } })
  return { P, D, C }
}

// títulos das irmãs que já existiam: niche h1 → "<h1> — Kineo", metaTitle do lote 1
function siblingTitles(S: Record<string, string>): string[] {
  const out: string[] = []
  for (const m of S.niche.matchAll(/\n    h1: '([^']+)',/g)) out.push(`${m[1]} — Kineo`)
  for (const m of S.lote1.matchAll(/metaTitle: '([^']+)'/g)) out.push(m[1])
  return out
}

const PROIBIDAS = [/\b30 credits\b/i, /every engine unlocked/i, /MiniMax H3/i, /Omni Flash/i, /Seedance 2\.5/i, /voice clon/i, /unlimited/i, /guarantee/i, /forever/i, /credits? for free\b/i]
const semInterpolacao = (src: string) => src.replace(/\/\/.*$/gm, '').replace(/\$\{/g, '')

function rules(S: Record<string, string>): Array<[string, boolean]> {
  const R: Array<[string, boolean]> = []
  const rule = (id: string, fn: () => unknown) => { let okv = false; try { okv = !!fn() } catch { okv = false } R.push([id, okv]) }
  let L: ReturnType<typeof load> | null = null
  try { L = load(S) } catch { L = null }
  const P = L?.P ?? {}, D = L?.D ?? {}, C = L?.C ?? {}
  const nicheSlugs: string[] = [...(P.PAGINAS_IA_0111_NICHE_SLUGS ?? [])]
  const intentSlugs: string[] = [...(P.PAGINAS_IA_0111_INTENT_SLUGS ?? [])]
  const moneyPaths: string[] = [...(P.PAGINAS_IA_0111_MONEY_PATHS ?? [])]
  const allPaths: string[] = [...(P.PAGINAS_IA_0111_PATHS ?? [])]
  const newIntent = () => intentSlugs.map((s) => C.getIntentPage(s))
  const niches = () => nicheSlugs.map((s) => D.IA0111_NICHES[s])
  const money = () => moneyPaths.map((p) => D.MONEY_ARTICLES_0111[p])

  // ── (1) as 20 rotas existem ─────────────────────────────────────────────────────────────────────────────
  rule('R1 20 caminhos únicos: 8 nichos + 10 do catálogo /for + 2 artigos', () =>
    nicheSlugs.length === 8 && intentSlugs.length === 10 && moneyPaths.length === 2 && new Set(allPaths).size === 20 && allPaths.length === 20)
  rule('R2 cada nicho tem dados completos (título, descrição, resposta, 5 ideias, 2+ seções, 3 FAQ, card do hub)', () =>
    nicheSlugs.length === 8 && niches().every((n: any) => n && n.metaTitle && n.metaDescription && n.intro.length > 150 && n.ideas.length === 5
      && n.sections.length >= 2 && n.faq.length === 3 && n.hubCard?.title && n.hubCard?.example))
  rule('R3 os nichos entram no registro da página, na metadata, no guia com FAQPage e no card do hub', () =>
    S.niche.includes('for (const [slug, n] of Object.entries(IA0111_NICHES)) {')
    && S.niche.includes('Object.prototype.hasOwnProperty.call(IA0111_NICHES, params.niche) ? IA0111_NICHES[params.niche] : null')
    && S.niche.includes("data-kineo=\"ia0111-guide\"") && S.niche.includes("'@type': 'FAQPage',\n              mainEntity: ia0111.faq.map(")
    && S.hub.includes('for (const [slug, n] of Object.entries(IA0111_NICHES)) {'))
  rule('R4 as 10 do catálogo existem, na família certa (4 niche + 6 alternative), com 3 FAQ e prompt de 8+ palavras', () => {
    const ps = newIntent()
    return ps.every(Boolean) && ps.filter((p: any) => p.family === 'niche').length === 4 && ps.filter((p: any) => p.family === 'alternative').length === 6
      && ps.every((p: any) => p.faq.length === 3 && p.examplePrompt.trim().split(/\s+/).length >= 8 && p.engine === 'cinematic_ai')
  })
  rule('R5 as 10 do catálogo têm resposta direta própria (não o intro-modelo)', () =>
    newIntent().every((p: any) => p && !p.intro.startsWith('Built for ') && !p.intro.startsWith('If you are comparing ') && p.intro.length > 200))
  rule('R6 os 2 artigos têm rota estática própria que usa o molde', () =>
    [['pay', '/when-does-youtube-pay-you'], ['share', '/youtube-shorts-revenue-sharing-explained']].every(([k, path]) =>
      S[k].includes(`const PATH = '${path}'`) && S[k].includes("export const dynamic = 'force-static'") && S[k].includes('<ArtigoDinheiro0111 path={PATH} />'))
    && moneyPaths.every((p) => existsSync(new URL(`../app${p}/page.tsx`, import.meta.url))))
  // ── (2) sitemap e llms.txt ───────────────────────────────────────────────────────────────────────────────
  rule('R7 sitemap: nichos por NICHE_SLUGS, catálogo por INTENT_SLUGS, artigos empurrados e data da rodada', () =>
    S.sitemap.includes("import { NICHE_SLUGS } from './free-ai-shorts/[niche]/page'")
    && S.sitemap.includes('for (const slug of INTENT_SLUGS) {')
    && S.sitemap.includes("import { PAGINAS_IA_0111_MONEY_PATHS, PAGINAS_IA_0111_PATHS, PAGINAS_IA_0111_REVIEWED_ISO } from '@/lib/seo/paginasIa0111Paths'")
    && S.sitemap.includes('for (const path of PAGINAS_IA_0111_MONEY_PATHS) {\n    staticEntries.push({ url: `${BASE}${path}`')
    && S.sitemap.includes('if (PAGINAS_IA_0111_PATHS.some((path) => e.url === `${BASE}${path}`)) e.lastModified = PAGINAS_IA_0111_LAST_MODIFIED'))
  rule('R8 os slugs do módulo de caminhos batem com os dados (nichos e catálogo)', () =>
    nicheSlugs.every((s) => D.IA0111_NICHES[s]) && Object.keys(D.IA0111_NICHES).length === 8
    && intentSlugs.every((s) => C.INTENT_SLUGS.includes(s)) && moneyPaths.every((p) => D.MONEY_ARTICLES_0111[p]?.path === p))
  rule('R9 o llms.txt aponta para as 20', () => allPaths.length === 20 && allPaths.every((p) => S.llms.includes(`\${base}${p})`)))
  rule('R10 os 2 artigos contam como página de conteúdo na atribuição (ai_assistant_likely)', () =>
    moneyPaths.every((p) => S.acq.includes(`  '${p.slice(1)}',`)))
  // ── (3) nada duplicado ───────────────────────────────────────────────────────────────────────────────────
  rule('R11 títulos únicos: as 20 entre si, contra o catálogo inteiro e contra os nichos/lote 1 que já existiam', () => {
    const novos = [...niches().map((n: any) => n.metaTitle), ...newIntent().map((p: any) => p.title), ...money().map((a: any) => a.title)]
    const catalogoOutros = C.INTENT_PAGES.filter((p: any) => !intentSlugs.includes(p.slug)).map((p: any) => p.title)
    const todos = [...novos, ...catalogoOutros, ...siblingTitles(S)]
    return novos.length === 20 && new Set(novos).size === 20 && new Set(todos.map((t) => t.toLowerCase())).size === todos.length
  })
  rule('R12 H1 e descriptions únicos entre as 20; nenhum H1 de nicho repete um H1 que já existia', () => {
    const h1 = [...niches().map((n: any) => n.h1), ...newIntent().map((p: any) => p.h1), ...money().map((a: any) => a.h1)]
    const desc = [...niches().map((n: any) => n.metaDescription), ...money().map((a: any) => a.description), ...newIntent().map((p: any) => p.intro)]
    const velhos = [...S.niche.matchAll(/\n    h1: '([^']+)',/g)].map((m) => m[1])
    return new Set(h1).size === 20 && new Set(desc).size === 20 && niches().every((n: any) => !velhos.includes(n.h1))
  })
  rule('R13 nenhuma frase das seções/FAQ dos nichos se repete entre eles', () => {
    const frases = niches().flatMap((n: any) => [...n.sections.flatMap((s: any) => s.paragraphs), n.intro]).flatMap((p: string) => p.split(/(?<=[.!?])\s+/)).filter((f: string) => f.length > 40)
    return frases.length > 50 && new Set(frases).size === frases.length
  })
  // ── (4) preço só da fonte única, nenhuma promessa proibida ───────────────────────────────────────────────
  rule('R14 nenhum "$<dígito>" digitado nos arquivos novos nem nas entradas novas do catálogo', () => {
    const novasEntradas = S.intent.split('\n').filter((l) => /answer: '/.test(l)).join('\n')
    return [S.paths, S.data, S.artigo, S.pay, S.share, novasEntradas].every((src) => !/\$\d/.test(semInterpolacao(src)))
  })
  rule('R15 o preço que aparece nos nichos veio da fonte única (os valores falsos do teste aparecem no texto)', () =>
    niches().every((n: any) => n.faq.some((f: any) => f.a.includes('$PRECO_CREATOR') && f.a.includes('$PRECO_STARTER') && f.a.includes('$PRECO_STUDIO'))))
  rule('R16 o molde dos artigos lê preço e filme grátis da fonte única', () =>
    S.artigo.includes("import { FREE_FILM_LABEL } from '@/lib/freeTierOffer'") && S.artigo.includes("import { STARTER_MONTH } from '@/lib/marketingPrice'")
    && S.artigo.includes('{FREE_FILM_LABEL}') && S.artigo.includes('{STARTER_MONTH}'))
  rule('R17 nenhuma frase proibida nas 20 (motor pausado, promessa, crédito literal)', () => {
    const texto = JSON.stringify([niches(), newIntent(), money()])
    return texto.length > 1000 && PROIBIDAS.every((re) => !re.test(texto))
  })
  // ── (5) fontes primárias nos artigos ─────────────────────────────────────────────────────────────────────
  rule('R18 cada linha da tabela dos artigos tem fonte oficial (support.google.com) lida na data da rodada', () =>
    money().every((a: any) => a.rows.length >= 5 && a.rows.every((r: any) => /^https:\/\/support\.google\.com\/(youtube|adsense)\/answer\/\d+/.test(r.source.url) && r.source.checkedOn === P.PAGINAS_IA_0111_REVIEWED_ISO)
      && a.sources.length >= 2 && a.sources.every((s: any) => s.url.startsWith('https://support.google.com/'))))
  rule('R19 os números dos artigos saem da tabela de fatos (o limite de pagamento e os 45% aparecem formatados)', () => {
    const t = JSON.stringify(money())
    return t.includes('$100') && t.includes('45%') && t.includes('21st') && t.includes('10 million')
  })
  rule('R20 artigos no padrão do Bing: título ≤ 60, description 120–160, resposta direta > 200', () =>
    money().every((a: any) => a.title.length <= 60 && a.description.length >= 120 && a.description.length <= 160 && a.answer.length > 200))
  rule('R21 títulos dos nichos ≤ 65 e descriptions dos nichos 120–160', () =>
    niches().every((n: any) => n.metaTitle.length <= 65 && n.metaDescription.length >= 120 && n.metaDescription.length <= 160))
  rule('R22 o molde dos artigos publica FAQPage, BreadcrumbList e Article com as fontes como citation', () =>
    ["'@type': 'FAQPage'", "'@type': 'BreadcrumbList'", "'@type': 'Article'", 'citation: a.sources.map((s) => s.url)', 'alternates: { canonical: url }'].every((x) => S.artigo.includes(x)))
  // ── (6) alternativas só falam da Kineo ───────────────────────────────────────────────────────────────────
  rule('R23 as 6 alternativas dizem que descrevem só a Kineo e não afirmam preço do concorrente', () =>
    newIntent().filter((p: any) => p.family === 'alternative').every((p: any) => p.slug.endsWith('-alternative') && p.intro.includes('We describe only Kineo here')
      && p.competitor.differences.length === 3 && !/\$\d/.test(JSON.stringify(p))))
  rule('R24 nenhuma alternativa nova duplica um concorrente que já tinha página (/alternatives, /vs, catálogo)', () => {
    const nomes = newIntent().filter((p: any) => p.family === 'alternative').map((p: any) => p.competitor.name.toLowerCase())
    const velhosCatalogo = C.INTENT_PAGES.filter((p: any) => p.family === 'alternative' && !intentSlugs.includes(p.slug)).map((p: any) => p.competitor.name.toLowerCase())
    return nomes.length === 6 && nomes.every((n: string) => !velhosCatalogo.includes(n))
  })
  return R
}

const real = rules(REAL)
let ok = 0, falhas = 0
for (const [id, v] of real) { if (v) ok++; else { falhas++; console.log('FAIL ' + id) } }

// ── mutantes: cada um tem de derrubar a regra que o pega ─────────────────────────────────────────────────────
const MUTANTES: Array<[string, string, string, string, string]> = [
  ['R1', 'um nicho some da lista de caminhos', 'paths', "  'inventions',\n", ''],
  ['R3', 'o hub esquece o card', 'hub', 'for (const [slug, n] of Object.entries(IA0111_NICHES)) {', 'for (const [slug, n] of Object.entries({})) {'],
  ['R5', 'uma alternativa volta ao intro-modelo', 'intent', "answer: 'As an Animoto alternative,", "x: 'As an Animoto alternative,"],
  ['R7', 'o sitemap esquece os artigos', 'sitemap', 'for (const path of PAGINAS_IA_0111_MONEY_PATHS) {', 'for (const path of [] as string[]) {'],
  ['R9', 'o llms.txt esquece uma página', 'llms', '[Visla](${base}/ai-video-generator/for/visla-alternative), ', ''],
  ['R11', 'título duplicado com uma irmã', 'data', "metaTitle: 'AI Invention History Shorts Generator | Kineo',", "metaTitle: 'Free AI History Shorts Generator — Kineo',"],
  ['R14', 'preço digitado num nicho', 'data', "a: 'Yes — they are narrated explainers with captions.", "a: 'Yes — for $9 a month they are narrated explainers with captions."],
  ['R17', 'promessa proibida', 'data', 'Small inaccuracies can still happen; review the film before posting.', 'Accuracy is guaranteed.'],
  ['R18', 'fonte de terceiro sem ser oficial', 'data', "shortsRevenue: { label: 'YouTube Shorts monetization policies: revenue sharing (YouTube Help)', url: 'https://support.google.com/youtube/answer/12504220?hl=en'", "shortsRevenue: { label: 'blog', url: 'https://example-blog.com/shorts'"],
  ['R20', 'título longo demais para o Bing', 'data', "title: 'When Does YouTube Pay You? Payout Dates & Threshold (2026)',", "title: 'When Does YouTube Pay You? Payout Dates, Threshold, Taxes and Everything Else (2026)',"],
  ['R23', 'alternativa sem a frase de honestidade', 'intent', "We describe only Kineo here; Colossyan’s plans", "Colossyan’s plans"],
]
let mOk = 0, mFalha = 0
for (const [id, desc, file, from, to] of MUTANTES) {
  if (!REAL[file].includes(from)) { mFalha++; console.log(`MUTANTE INVÁLIDO ${id} (${desc}): trecho não encontrado`); continue }
  const S = { ...REAL, [file]: REAL[file].replace(from, to) }
  const r = rules(S).find(([rid]) => rid.split(' ')[0] === id)
  if (r && !r[1]) mOk++
  else { mFalha++; console.log(`MUTANTE SOBREVIVEU ${id}: ${desc}`) }
}

console.log(`${falhas || mFalha ? '🔴' : '🟢'} paginas-ia-0111: ${ok}/${real.length} regras · ${mOk}/${MUTANTES.length} mutantes derrubados`)
if (falhas || mFalha) process.exit(1)
