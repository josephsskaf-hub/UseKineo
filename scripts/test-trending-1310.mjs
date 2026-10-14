// KINEO-TRENDING-2026-10-13 — guardião da página "🔥 Trending now" (/trending), pedida pelo fundador em 13/10.
//
// O QUE ELE PROVA (lendo os arquivos reais e EXECUTANDO lib/trending/trendingNow.ts com os catálogos de verdade, num
// carregador TS mínimo que resolve @/ e caminhos relativos):
//   (1) a página existe com os 4 blocos, na ordem, e os blocos têm os tamanhos das fontes (15 estilos, 12 efeitos, 8 temas,
//       ≥ 4 motores);
//   (2) toda mídia de cartão existe em public/ e é leve (mp4 ≤ 2,5 MB, pôster ≤ 200 KB);
//   (3) todo selo de motor sai do CAMPO do dado (endpoint dos estilos, template/motor do efeito — conferido contra a nota da
//       prévia —, engine do filme da casa) e nenhum nome de motor está digitado solto na lib, na página ou no cartão;
//   (4) os "Make mine" abrem a ferramenta certa, preenchida, e cada tela LÊ o parâmetro (style no AdsV2Simple, effect no
//       ClipsClient, prompt/engine/duration/script_mode no Studio); visitante passa pelo cadastro e volta;
//   (5) o item "🔥 Trending" está em todos os pares do menu (topo e celular do site, /examples, /trending, WORKSPACE_NAV,
//       ícone da lateral, "More" do MobileNav);
//   (6) sitemap e llms.txt;
//   (7) nenhuma métrica falsa (viralScore/badge do catálogo não são lidos; nenhum "N views/likes" em cartão ou frase);
//   (8) honestidade: filme do tema só com o mesmo assunto, nada de motor fora da oferta; selo New = data do lote conferida
//       contra o marcador no arquivo-fonte; o today.json da pesquisa só escolhe/ordena e vence em 36 h;
//   (9) o cartão de vídeo: mudo, playsInline, preload="none", pôster, IntersectionObserver, reduced-motion, 9:16 fixo;
//  (10) as frases nas 16 línguas;
//   (M) mutantes: cada regra fica vermelha quando a quebramos de propósito (e cada mutante prova que aplicou).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) }
}

// ─── carregador TS mínimo (só módulos puros; @/ → raiz) ───────────────────────
function resolveFile(spec, fromDir) {
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(fromDir, spec)
  for (const cand of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand
  }
  throw new Error('módulo não encontrado: ' + spec)
}
function loader(overrides = {}) {
  const cache = new Map()
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const src = overrides[rel] ?? fs.readFileSync(file, 'utf8')
    const mod = { exports: {} }
    cache.set(file, mod)
    if (file.endsWith('.json')) { mod.exports = JSON.parse(src); return mod.exports }
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
    const req = (spec) => {
      if (!spec.startsWith('.') && !spec.startsWith('@/')) throw new Error('import fora da casa num módulo da página: ' + spec)
      return load(resolveFile(spec, path.dirname(file)))
    }
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, req, { env: {} })
    return mod.exports
  }
  return (rel) => load(path.join(ROOT, rel))
}
const NOW = new Date('2026-10-13T22:00:00Z')
function build(overrides = {}) {
  const L = loader(overrides)
  const T = L('lib/trending/trendingNow.ts')
  return {
    L, T,
    signed: T.trendingBlocks({ now: NOW, signedIn: true, today: null }),
    guest: T.trendingBlocks({ now: NOW, signedIn: false, today: null }),
  }
}

const LIB_REL = 'lib/trending/trendingNow.ts'
const PAGE_REL = 'app/trending/page.tsx'
const CARD_REL = 'app/trending/TrendingCard.tsx'
const CSS_REL = 'app/trending/trending.css'
const SRC = {
  lib: read(LIB_REL), page: read(PAGE_REL), card: read(CARD_REL), css: read(CSS_REL),
  land: read('app/KineoLanding.tsx'), examples: read('app/examples/page.tsx'), navcfg: read('lib/ui/workspaceNavigation.ts'),
  side: read('components/Sidebar.tsx'), mob: read('components/MobileNav.tsx'), sitemap: read('app/sitemap.ts'), llms: read('app/llms.txt/route.ts'),
  ads: read('app/(dashboard)/ads/v2/AdsV2Simple.tsx'), clips: read('app/(dashboard)/clips/ClipsClient.tsx'), studio: read('app/(dashboard)/studio/StudioClient.tsx'),
  styles: read('lib/ads/v2Styles.ts'), effects: read('lib/clips/clipEffects.ts'), topics: read('lib/viralTopics.ts'), dict: JSON.parse(read('lib/ui/refinementCopy.json')),
}
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

// ─── (1) a página e os 4 blocos ───────────────────────────────────────────────
const IDS = ['ad-styles', 'clip-effects', 'film-topics', 'engines']
function blockProblems(B, ctx) {
  const probs = []
  if (B.signed.map((b) => b.id).join(',') !== IDS.join(',')) return [`blocos = ${B.signed.map((b) => b.id).join(',')}`]
  const by = Object.fromEntries(B.signed.map((b) => [b.id, b]))
  const nStyles = B.L('lib/ads/v2Styles.ts').ADS_V2_STYLES.length
  const nFx = B.L('lib/clips/clipEffectPages.ts').publicEffectPages().filter((e) => e.preview?.video && e.preview?.poster).length
  if (by['ad-styles'].cards.length !== nStyles || nStyles < 15) probs.push(`estilos: ${by['ad-styles'].cards.length} de ${nStyles}`)
  if (by['clip-effects'].cards.length !== nFx || nFx < 12) probs.push(`efeitos: ${by['clip-effects'].cards.length} de ${nFx}`)
  if (by['film-topics'].cards.length !== 8) probs.push(`temas: ${by['film-topics'].cards.length} (esperado 8, o bloco do Viral Now)`)
  if (by.engines.cards.length < 4) probs.push(`motores: ${by.engines.cards.length}`)
  for (const b of B.signed) {
    if (!b.title || !b.sub) probs.push(`${b.id} sem título/linha`)
    if (new Set(b.cards.map((c) => c.key)).size !== b.cards.length) probs.push(`${b.id} com cartão repetido`)
  }
  for (const fx of ['wings', 'dollar_rain', 'muscle_surge']) if (!by['clip-effects'].cards.some((c) => c.key === fx)) probs.push(`efeito novo ${fx} fora do bloco`)
  const page = semComentarios(ctx.page)
  for (const need of ['trendingBlocks({ now, signedIn, today })', '<TrendingCard key={card.key} block={block.id} card={card} />', 'data-trending-block={block.id}', "export const dynamic = 'force-dynamic'"]) if (!page.includes(need)) probs.push(`página sem ${need}`)
  return probs
}

// ─── (2) a mídia ──────────────────────────────────────────────────────────────
const MB = 1024 * 1024
function mediaProblems(B) {
  const probs = []
  for (const b of B.signed) for (const c of b.cards) {
    if (b.id !== 'film-topics' && (!c.video || !c.poster)) { probs.push(`${b.id}/${c.key} sem vídeo`); continue }
    if (!c.video) continue
    for (const [rel, max] of [[c.video, 2.5 * MB], [c.poster, 200 * 1024]]) {
      if (!rel || !rel.startsWith('/')) { probs.push(`${b.id}/${c.key}: caminho ${rel}`); continue }
      const p = path.join(ROOT, 'public', rel)
      if (!fs.existsSync(p)) { probs.push(`${rel} não existe`); continue }
      const size = fs.statSync(p).size
      if (size > max) probs.push(`${rel} pesado (${(size / MB).toFixed(2)} MB)`)
      if (size < 1024) probs.push(`${rel} vazio`)
    }
    if (!/\.mp4$/.test(c.video)) probs.push(`${c.video} não é mp4`)
  }
  return probs
}

// ─── (3) selos do dado ────────────────────────────────────────────────────────
const ENGINE_WORDS = /\b(Seedance|Kling|Veo|MiniMax|Omni|PixVerse|Sora|Hailuo|Runway)\b/
function labelProblems(B, ctx) {
  const probs = []
  const S = B.L('lib/ads/v2Styles.ts')
  const FX = B.L('lib/clips/clipEffects.ts')
  const EX = B.L('lib/publicExamples.ts')
  const EL = B.L('lib/engineLabel.ts')
  const by = Object.fromEntries(B.signed.map((b) => [b.id, b]))
  // Estilos: o selo é o do endpoint REAL dos estilos (fal-ai/<marca>/v<versão>/…).
  const m = /^fal-ai\/([a-z-]+)\/v(\d+(?:\.\d+)?)\//.exec(S.ADS_V2_STYLE_ENDPOINT) || []
  const brand = { pixverse: 'PixVerse', 'kling-video': 'Kling' }[m[1]]
  const want = brand && m[2] ? `${brand} ${m[2]}` : null
  if (!want) probs.push(`endpoint dos estilos irreconhecível: ${S.ADS_V2_STYLE_ENDPOINT}`)
  for (const c of by['ad-styles'].cards) if (c.engine !== want) probs.push(`estilo ${c.key}: selo ${c.engine} ≠ ${want} (endpoint)`)
  // Efeitos: o selo é o modelo real (template.label ou o motor do catálogo) E bate com a nota da prévia "(Motor)".
  for (const c of by['clip-effects'].cards) {
    const fx = FX.clipEffectByKey(c.key)
    const real = fx?.template ? fx.template.label : null
    const note = (/\(([^)]+)\)\s*$/.exec(fx?.preview?.note || '') || [])[1]
    if (!fx || c.engine !== FX.clipEffectEngineLabel(fx)) probs.push(`efeito ${c.key}: selo ${c.engine} não é o do catálogo`)
    if (real && c.engine !== real) probs.push(`efeito-modelo ${c.key}: selo ${c.engine} ≠ ${real}`)
    if (note && c.engine !== note) probs.push(`efeito ${c.key}: selo ${c.engine} ≠ nota da prévia (${note})`)
  }
  // Filmes: o selo é engineLabelFor(engine) do filme curado, e o engine bate com a vitrine pública quando ele está lá.
  const showcase = [...EX.ENGINE_PAGE_LEAD, ...EX.FOUNDER_SHOWCASE]
  for (const c of [...by['film-topics'].cards.filter((x) => x.video), ...by.engines.cards]) {
    const film = showcase.find((f) => f.previewPath === c.video)
    if (!film) { probs.push(`${c.key}: vídeo fora das listas curadas (${c.video})`); continue }
    if (c.engine !== EL.engineLabelFor(film.engine)) probs.push(`${c.key}: selo ${c.engine} ≠ ${EL.engineLabelFor(film.engine)}`)
    const pub = EX.PUBLIC_ENGINE_EXAMPLES.find((p) => p.id === film.id)
    if (pub && pub.engine !== film.engine) probs.push(`${film.id}: motor da vitrine pública ${pub.engine} ≠ ${film.engine}`)
  }
  for (const c of by['film-topics'].cards.filter((x) => !x.video)) if (c.engine !== null) probs.push(`tema ${c.key} sem vídeo com selo ${c.engine}`)
  // Nenhum nome de motor digitado: na lib, só o dicionário de marcas do endpoint; na página e no cartão, nenhum.
  const libLines = semComentarios(ctx.lib).split('\n').filter((l) => ENGINE_WORDS.test(l))
  if (libLines.length !== 1 || !/const BRANDS: Record<string, string> = \{ pixverse: 'PixVerse', 'kling-video': 'Kling' \}/.test(libLines[0] || '')) probs.push(`nome de motor digitado na lib: ${libLines.map((l) => l.trim()).join(' | ')}`)
  for (const [n, s] of [['página', ctx.page], ['cartão', ctx.card]]) if (ENGINE_WORDS.test(semComentarios(s))) probs.push(`nome de motor digitado no ${n}`)
  return probs
}

// ─── (4) os "Make mine" ───────────────────────────────────────────────────────
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
function hrefProblems(B, ctx) {
  const probs = []
  const S = B.L('lib/ads/v2Styles.ts')
  const R = B.L('lib/navigation/reviewVideoRetry.ts')
  const T = B.L('lib/viralTopics.ts')
  const sb = Object.fromEntries(B.signed.map((b) => [b.id, b]))
  const gb = Object.fromEntries(B.guest.map((b) => [b.id, b]))
  const u = (h) => new URL(h, 'https://www.usekineo.com')
  for (const c of sb['ad-styles'].cards) {
    const x = u(c.href)
    if (x.pathname !== '/ads/v2' || x.searchParams.get('style') !== c.key || !S.isAdsV2Style(c.key)) probs.push(`estilo ${c.key} → ${c.href}`)
  }
  for (const c of sb['clip-effects'].cards) {
    const x = u(c.href)
    if (x.pathname !== '/clips' || x.searchParams.get('effect') !== c.key) probs.push(`efeito ${c.key} → ${c.href}`)
  }
  for (const id of ['ad-styles', 'clip-effects']) sb[id].cards.forEach((c, i) => {
    const g = u(gb[id].cards[i].href)
    if (g.pathname !== '/signup' || g.searchParams.get('redirect') !== c.href) probs.push(`visitante ${id}/${c.key} não passa pelo cadastro e volta (${gb[id].cards[i].href})`)
  })
  const studioKeys = new Set(Object.values(R.STUDIO_ENGINE_FOR_QUALITY))
  for (const c of sb['film-topics'].cards) {
    const x = u(c.href)
    const topic = T.getViralTopicById(c.key)
    const p = x.searchParams.get('prompt') || ''
    if (x.pathname !== '/studio' || !topic) { probs.push(`tema ${c.key} → ${x.pathname}`); continue }
    if (!p || /\[Pexels:/i.test(p) || /^YouTube Short format/i.test(p)) probs.push(`tema ${c.key}: roteiro sujo no prompt`)
    const hookLine = (/^HOOK: \[Pexels:[^\]]*\] (.{20,60})/m.exec(topic.prompt) || [])[1]
    if (!hookLine || !p.includes('HOOK: ' + hookLine)) probs.push(`tema ${c.key}: o prompt não é o roteiro do tema`)
    if (x.searchParams.get('engine') !== 'seedance' || !['35', '60', '90'].includes(x.searchParams.get('duration')) || x.searchParams.get('script_mode') !== 'ai' || !(x.searchParams.get('intent_campaign') || '').startsWith('trending_')) probs.push(`tema ${c.key}: parâmetros do Studio ${x.search.slice(0, 80)}`)
    if (c.href.length > 6000) probs.push(`tema ${c.key}: link longo demais (${c.href.length})`)
  }
  for (const c of sb.engines.cards) {
    const x = u(c.href)
    const e = x.searchParams.get('engine')
    if (x.pathname !== '/studio' || !studioKeys.has(e) || e === 'omni') probs.push(`motor ${c.key} → ${c.href}`)
  }
  // As telas LEEM o que o link manda (e o destino existe).
  for (const r of ['app/(dashboard)/ads/v2/page.tsx', 'app/(dashboard)/clips/page.tsx', 'app/(dashboard)/studio/page.tsx', 'app/(auth)/signup/page.tsx']) if (!exists(r)) probs.push(`rota ${r} sumiu`)
  const ads = semComentarios(ctx.ads)
  if (!/wanted = new URLSearchParams\(window\.location\.search\)\.get\('style'\)/.test(ads) || !/if \(isAdsV2Style\(wanted\)\) setStyleChoice\(wanted\)/.test(ads)) probs.push('AdsV2Simple não lê ?style= (só chave do catálogo)')
  if (!/\.get\('effect'\)/.test(ctx.clips) || !/effects\.some\(\(fx\) => fx\.key === wanted\)/.test(ctx.clips)) probs.push('ClipsClient não lê ?effect=')
  for (const k of ['prompt', 'engine', 'script_mode', 'intent_campaign']) if (!ctx.studio.includes(`sp.get('${k}')`)) probs.push(`Studio não lê ?${k}=`)
  if (!ctx.studio.includes("Number(sp.get('duration'))")) probs.push('Studio não lê ?duration=')
  return probs
}

// ─── (5) o menu ───────────────────────────────────────────────────────────────
const ITEM = '<Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>'
function navProblems(ctx) {
  const probs = []
  const a = ctx.land.indexOf('<div className="nav-links" data-nav-surface="top" data-nav-area="public">')
  const b = ctx.land.indexOf('<div className="nav-right">', a)
  const top = a >= 0 && b > a ? ctx.land.slice(a, b) : ''
  if (!top.includes(ITEM)) probs.push('topo do site sem o 🔥 Trending')
  else if (!(top.indexOf(ITEM) < top.indexOf('<Link href="/pricing" data-nav-item="pricing">'))) probs.push('topo: Trending fora do lugar (antes de Pricing)')
  const menu = (ctx.land.match(/<label htmlFor="nav-toggle" id="mobile-nav-menu"[\s\S]*?<\/label>/) || [''])[0]
  if (!menu.includes(ITEM)) probs.push('menu do celular do site sem o 🔥 Trending')
  const exNav = (ctx.examples.match(/<nav className=\{styles\.nav\}[\s\S]*?<\/nav>/) || [''])[0]
  if (!exNav.includes(ITEM)) probs.push('/examples sem o 🔥 Trending')
  const trNav = (ctx.page.match(/<nav className=\{styles\.nav\}[\s\S]*?<\/nav>/) || [''])[0]
  if (!trNav.includes('<Link href="/trending" data-nav-item="more:trending" aria-current="page"><UiLabel>🔥 Trending</UiLabel></Link>')) probs.push('/trending sem o item marcado (aria-current)')
  for (const d of ['/studio', '/ads/new', '/pricing']) if (!trNav.includes(`href="${d}"`)) probs.push(`/trending: menu sem ${d}`)
  const wn = (ctx.navcfg.match(/export const WORKSPACE_NAV = \[([\s\S]*?)\] as const/) || [, ''])[1]
  if (!/\{ href: '\/trending', label: '🔥 Trending', icon: 'trending' \}/.test(wn)) probs.push('WORKSPACE_NAV sem o 🔥 Trending')
  if (!/\n  trending: \(\n\s+<svg/.test(ctx.side)) probs.push('Sidebar sem o ícone trending (NAV_ICONS)')
  if (!ctx.side.includes('{WORKSPACE_NAV.map(item => <NavItem')) probs.push('Sidebar não desenha WORKSPACE_NAV')
  if (!/const TRENDING_LINK = WORKSPACE_NAV\.find\(item => item\.href === '\/trending'\)/.test(ctx.mob) || !/const MORE_LINKS = \[\n\s+\.\.\.\(TRENDING_LINK \?/.test(ctx.mob)) probs.push('MobileNav: o "More" não abre com o 🔥 Trending')
  // A barra do celular não encolhe: segue com 4 portas + More.
  if (!/\{primaryLink\('\/studio'\)\}\n\s+\{primaryLink\('\/ads\/new'\)\}\n\s+\{primaryLink\('\/library'\)\}\n\s+\{primaryLink\('\/pricing'\)\}\n\s+\{disclosure\(groups\[0\]\)\}/.test(ctx.mob)) probs.push('MobileNav: barra mudou de tamanho')
  return probs
}

// ─── (6) sitemap e llms ───────────────────────────────────────────────────────
function seoProblems(ctx) {
  const probs = []
  if (!/\{ path: '\/trending', priority: 0\.8, freq: 'daily' \}/.test(ctx.sitemap)) probs.push('sitemap sem /trending')
  if (!/- \[Trending now\]\(\$\{BASE\}\/trending\): /.test(ctx.llms)) probs.push('llms.txt sem /trending')
  return probs
}

// ─── (7) nenhuma métrica falsa ────────────────────────────────────────────────
const METRIC = /\b\d[\d,.]*\s*[kKmM]?\+?\s*(views|likes|plays|uses|users|people|creators|shares|downloads)\b|★|\b\d(\.\d)?\s*\/\s*5\b|\b\d+%\s*(match|viral)/i
function metricProblems(B, ctx) {
  const probs = []
  const code = semComentarios(ctx.lib) + semComentarios(ctx.page) + semComentarios(ctx.card)
  for (const bad of ['viralScore', '.badge ===', 't.badge', 'topic.badge', 'Math.random']) if (bad === '.badge ===' ? /\bt\.badge\b|topic\.badge/.test(code) : code.includes(bad)) probs.push(`código lê ${bad}`)
  for (const b of B.signed) for (const c of b.cards) for (const f of [c.title, c.sub, c.engine || '']) if (METRIC.test(f)) probs.push(`${b.id}/${c.key}: métrica "${f.slice(0, 60)}"`)
  for (const k of B.T.TRENDING_COPY) if (METRIC.test(k)) probs.push(`frase com métrica: ${k}`)
  return probs
}

// ─── (8) honestidade: filme do tema, motores na oferta, datas, today.json ─────
function honestyProblems(B, ctx) {
  const probs = []
  const T = B.T
  const V = B.L('lib/viralTopics.ts')
  const EX = B.L('lib/publicExamples.ts')
  const LA = B.L('lib/engineLaunch.ts')
  const R = B.L('lib/navigation/reviewVideoRetry.ts')
  const showcase = [...EX.ENGINE_PAGE_LEAD, ...EX.FOUNDER_SHOWCASE]
  for (const pair of T.TOPIC_HOUSE_FILMS) {
    const topic = V.VIRAL_TOPICS_POOL.find((t) => t.id === pair.topic)
    const film = showcase.find((f) => f.id === pair.film)
    if (!topic || !film) { probs.push(`par ${pair.topic}→${pair.film} fora das fontes`); continue }
    const s = pair.subject.toLowerCase()
    if (!(topic.title + ' ' + topic.prompt).toLowerCase().includes(s) || !film.title.toLowerCase().includes(s)) probs.push(`par ${pair.topic}→"${film.title}" sem o assunto "${pair.subject}" nos dois`)
    if (!LA.engineOffered(R.STUDIO_ENGINE_FOR_QUALITY[film.engine])) probs.push(`par ${pair.topic}: filme de motor fora da oferta (${film.engine})`)
  }
  for (const b of B.signed) if (b.id !== 'ad-styles' && b.id !== 'clip-effects') for (const c of b.cards) {
    const film = c.video ? showcase.find((f) => f.previewPath === c.video) : null
    if (film && (!LA.engineOffered(R.STUDIO_ENGINE_FOR_QUALITY[film.engine]) || LA.enginePaused(R.STUDIO_ENGINE_FOR_QUALITY[film.engine]))) probs.push(`${b.id}/${c.key}: motor fora da oferta/pausado na vitrine`)
  }
  // Datas do selo New = o marcador do lote no arquivo-fonte.
  const baseKeys = ((ctx.styles.match(/type AdsV2BaseStyleKey = ([^\n]+)/) || [, ''])[1].match(/'([a-z_0-9]+)'/g) || []).map((s) => s.slice(1, -1))
  // KINEO-ESTILOS-DIA1-2026-10-13 — reancorado: o lote do dia 1 (tipo AdsV2Dia1StyleKey, marcador no arquivo-fonte) é de 13/10.
  const dia1Keys = ((ctx.styles.match(/type AdsV2Dia1StyleKey = ([^\n]+)/) || [, ''])[1].match(/'([a-z_0-9]+)'/g) || []).map((s) => s.slice(1, -1))
  const S = B.L('lib/ads/v2Styles.ts')
  for (const s of S.ADS_V2_STYLES) {
    const want = baseKeys.includes(s.key) ? '2026-10-09' : dia1Keys.includes(s.key) ? '2026-10-13' : '2026-10-10'
    if (T.ADS_STYLE_RELEASED[s.key] !== want) probs.push(`estilo ${s.key}: data ${T.ADS_STYLE_RELEASED[s.key]} ≠ ${want}`)
  }
  if (baseKeys.length !== 5 || !ctx.styles.includes('KINEO-ADS-UX-MARCA-2026-10-10 — os 10 novos')) probs.push('marcadores dos lotes de estilo não encontrados')
  // reancorado KINEO-TIRA-STARLIGHT-1410 — o lote do dia 1 tem 3 chaves (starlight_gift tirado em 14/10).
  // reancorado KINEO-ADS-RETESTE-1510 — 2 chaves (dolly_zoom tirado em 15/10).
  if (dia1Keys.length !== 2 || !/type AdsV2Dia1StyleKey = [^\n]+\/\/ KINEO-ESTILOS-DIA1-2026-10-13/.test(ctx.styles)) probs.push('marcador do lote de estilos do dia 1 não encontrado')
  const union = (ctx.effects.match(/export type ClipEffectKey =([\s\S]*?)\n\n/) || [, ''])[1]
  for (const e of B.L('lib/clips/clipEffectPages.ts').publicEffectPages()) {
    const line = union.split('\n').find((l) => l.includes(`'${e.key}'`)) || ''
    const want = /KINEO-EFEITOS-NOVOS-2026-10-13/.test(line) ? '2026-10-13' : '2026-10-05'
    if (T.CLIP_EFFECT_RELEASED[e.key] !== want) probs.push(`efeito ${e.key}: data ${T.CLIP_EFFECT_RELEASED[e.key]} ≠ ${want} (marcador)`)
  }
  // New: só nos últimos 7 dias; o mais novo primeiro.
  const by = Object.fromEntries(B.signed.map((b) => [b.id, b]))
  const fx = by['clip-effects'].cards
  if (fx.slice(0, 3).map((c) => c.key).join(',') !== 'wings,dollar_rain,muscle_surge') probs.push(`efeitos não abrem pelos mais novos: ${fx.slice(0, 3).map((c) => c.key)}`)
  for (const c of fx) if ((c.badge === 'new') !== ['wings', 'dollar_rain', 'muscle_surge'].includes(c.key)) probs.push(`efeito ${c.key}: selo ${c.badge} em 13/10`)
  if (!T.isNewRelease('2026-10-07', NOW) || T.isNewRelease('2026-10-06', NOW) || T.isNewRelease(undefined, NOW) || T.isNewRelease('2026-10-20', NOW)) probs.push('janela do New ≠ 7 dias')
  // today.json: escolhe e ordena; chave desconhecida some; vencido/quebrado = null.
  const good = T.parseTrendingToday(JSON.stringify({ date: '2026-10-13', ad_styles: ['beach_ad', 'nao_existe'], clip_effects: ['melt'], topics: ['crime-01'], views: 999 }), NOW)
  if (!good || good.adStyles.join() !== 'beach_ad,nao_existe' || good.clipEffects.join() !== 'melt') probs.push('today.json válido não lido')
  else {
    const blocks = T.trendingBlocks({ now: NOW, signedIn: true, today: good })
    const b = Object.fromEntries(blocks.map((x) => [x.id, x]))
    if (b['ad-styles'].cards[0].key !== 'beach_ad' || b['ad-styles'].cards[0].badge !== 'pick') probs.push('escolha da pesquisa não vem primeiro com "Today’s pick"')
    if (b['ad-styles'].cards.some((c) => c.key === 'nao_existe') || b['ad-styles'].cards.length !== S.ADS_V2_STYLES.length) probs.push('pesquisa criou cartão que não existe')
    if (b['clip-effects'].cards[0].key !== 'melt' || b['film-topics'].cards[0].key !== 'crime-01' || b['film-topics'].cards.length !== 8) probs.push('pesquisa não ordena efeitos/temas')
    if (JSON.stringify(blocks).includes('999')) probs.push('número da pesquisa vazou para a página')
  }
  if (T.parseTrendingToday(JSON.stringify({ date: '2026-10-10', ad_styles: ['beach_ad'] }), NOW) !== null) probs.push('today.json vencido aceito')
  if (T.parseTrendingToday('{quebrado', NOW) !== null || T.parseTrendingToday(JSON.stringify({ ad_styles: ['beach_ad'] }), NOW) !== null || T.parseTrendingToday(null, NOW) !== null) probs.push('today.json inválido aceito')
  const page = semComentarios(ctx.page)
  if (!/return parseTrendingToday\(fs\.readFileSync\(path\.join\(process\.cwd\(\), TRENDING_TODAY_FILE\), 'utf8'\), now\)\n\s+\} catch \{\n\s+return null/.test(page) || T.TRENDING_TODAY_FILE !== 'public/trending/today.json') probs.push('página não lê o today.json opcional com queda segura')
  return probs
}

// ─── (9) o cartão de vídeo ────────────────────────────────────────────────────
function cardProblems(ctx) {
  const probs = []
  const code = semComentarios(ctx.card)
  if (!/^'use client'/.test(ctx.card)) probs.push("cartão sem 'use client'")
  const videos = code.match(/<video[\s\S]*?\/>/g) || []
  if (videos.length !== 1) probs.push(`${videos.length} <video>`)
  for (const v of videos) {
    for (const need of [/\bmuted\b/, /\bloop\b/, /\bplaysInline\b/, /preload="none"/, /poster=\{poster\}/, /src=\{visible \? video : undefined\}/]) if (!need.test(v)) probs.push(`vídeo sem ${need}`)
    if (/autoPlay/.test(v)) probs.push('vídeo com autoPlay')
  }
  if (!code.includes('new IntersectionObserver(')) probs.push('sem IntersectionObserver')
  if (!code.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches") || !/if \(visible && !reduce && !saveData\) void el\.play\(\)/.test(code)) probs.push('toca com reduced-motion/economia de dados')
  if (!/\.tr-media\{[^}]*aspect-ratio:9\/16/.test(ctx.css)) probs.push('mídia sem 9:16 fixo (layout shift)')
  if (!/<span dir="ltr">\{card\.engine\}<\/span>/.test(code)) probs.push('selo do motor não é o card.engine')
  if (!/<Link className="tr-cta" href=\{card\.href\}/.test(code)) probs.push('"Make mine" não usa card.href')
  return probs
}

// ─── (10) traduções ───────────────────────────────────────────────────────────
function copyProblems(dict, T) {
  const probs = []
  if (Object.keys(dict).length !== 16) probs.push(`${Object.keys(dict).length} línguas`)
  const used = [...T.TRENDING_COPY]
  for (const [lang, d] of Object.entries(dict)) for (const k of used) {
    const v = d[k]
    if (typeof v !== 'string' || !v.trim()) { probs.push(`${lang}: sem "${k}"`); continue }
    for (const mark of [...(k.match(/\d+|🔥/gu) || []), ...['Kineo', 'Studio'].filter((b) => k.includes(b))]) if (!v.includes(mark)) probs.push(`${lang}: perdeu ${mark} em "${k}"`)
  }
  // Toda frase autoral da página e do cartão está na lista (e portanto no dicionário).
  const authored = [...SRC.page.matchAll(/<UiLabel>([^<{]+)<\/UiLabel>/g), ...SRC.card.matchAll(/<UiLabel>([^<{]+)<\/UiLabel>/g)].map((m) => m[1])
  for (const k of authored) if (!dict.pt[k] && !['Make a film', 'Product ads', 'Images', 'Pricing', 'Examples'].includes(k)) probs.push(`frase sem tradução: ${k}`)
  for (const b of T.trendingBlocks({ now: NOW, signedIn: true, today: null })) for (const k of [b.title, b.sub]) if (!used.includes(k)) probs.push(`título de bloco fora da lista: ${k}`)
  return probs
}

// ─── o real ───────────────────────────────────────────────────────────────────
console.log('KINEO-TRENDING-2026-10-13')
const REAL = build()
const run = (fn, ...a) => { try { return fn(...a) } catch (e) { return [`erro: ${e.message}`] } }
const report = (label, probs) => ok(probs.length === 0, `${label} (${probs.slice(0, 4).join('; ') || 'ok'})`)
report('(1) página com os 4 blocos, tamanhos das fontes', run(blockProblems, REAL, SRC))
report('(2) mídia existente e leve', run(mediaProblems, REAL))
report('(3) selos de motor do dado, nada digitado', run(labelProblems, REAL, SRC))
report('(4) "Make mine" válidos e lidos pelas telas', run(hrefProblems, REAL, SRC))
report('(5) 🔥 Trending em todos os pares do menu', run(navProblems, SRC))
report('(6) sitemap e llms.txt', run(seoProblems, SRC))
report('(7) nenhuma métrica falsa', run(metricProblems, REAL, SRC))
report('(8) honestidade: filme do tema, oferta, datas do New, today.json', run(honestyProblems, REAL, SRC))
report('(9) cartão de vídeo seguro, sem layout shift', run(cardProblems, SRC))
report('(10) frases nas 16 línguas', run(copyProblems, SRC.dict, REAL.T))
{
  const by = Object.fromEntries(REAL.signed.map((b) => [b.id, b]))
  console.log(`        blocos: ${REAL.signed.map((b) => `${b.id}=${b.cards.length}`).join(' · ')} · temas com filme: ${by['film-topics'].cards.filter((c) => c.video).length}`)
}

// ─── mutantes (cada um PRECISA aplicar e ficar vermelho) ──────────────────────
function mutLib(rel, from, to, check, label) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
  const applied = src.includes(from)
  let red = false
  if (applied) {
    const ctx = { ...SRC }
    const mutated = src.split(from).join(to)
    const key = { [LIB_REL]: 'lib', [PAGE_REL]: 'page', [CARD_REL]: 'card', 'lib/ads/v2Styles.ts': 'styles', 'app/(dashboard)/ads/v2/AdsV2Simple.tsx': 'ads' }[rel]
    if (key) ctx[key] = mutated
    try { red = check(build({ [rel]: mutated }), ctx).length > 0 } catch { red = true }
  }
  ok(applied && red, `${label}${applied ? '' : ' (MUTANTE NÃO APLICOU)'}`)
}
function mutSrc(key, from, to, check, label) {
  const applied = SRC[key].includes(from)
  const ctx = { ...SRC, [key]: SRC[key].split(from).join(to) }
  ok(applied && check(ctx).length > 0, `${label}${applied ? '' : ' (MUTANTE NÃO APLICOU)'}`)
}
mutLib(LIB_REL, "    { id: 'engines', title: 'Engines in action', sub: 'The best house film from each engine.', cards: engineCards() },\n", '', blockProblems, '(M1) bloco dos motores some → vermelho')
mutLib('lib/ads/v2Styles.ts', 'preview: `/ads-styles/${key}.mp4`', 'preview: `/ads-styles/${key}-x.mp4`', (B) => mediaProblems(B), '(M2) prévia de estilo que não existe → vermelho')
mutLib(LIB_REL, '    engine: ADS_STYLE_ENGINE_LABEL,\n', "    engine: 'Kling 2.5',\n", labelProblems, '(M3) selo de estilo digitado → vermelho')
mutLib(LIB_REL, '    engine: clipEffectEngineLabel(e),\n', '    engine: e.engine,\n', labelProblems, '(M4) selo do efeito pelo trilho (kling) em vez do modelo real → vermelho')
mutLib(LIB_REL, ".map((line) => line.replace(/\\[Pexels:[^\\]]*\\]\\s*/g, '').trimEnd())", '.map((line) => line.trimEnd())', hrefProblems, '(M5) roteiro do tema com [Pexels: …] no Studio → vermelho')
mutLib(LIB_REL, "new URLSearchParams({ style: key, utm_source: 'trending' })", "new URLSearchParams({ ad_style: key, utm_source: 'trending' })", hrefProblems, '(M6) estilo num parâmetro que o montador não lê → vermelho')
mutLib('app/(dashboard)/ads/v2/AdsV2Simple.tsx', '    if (isAdsV2Style(wanted)) setStyleChoice(wanted)', '    if (wanted) setStyleChoice(wanted as AdsV2StyleChoice)', hrefProblems, '(M7) montador aceita ?style= fora do catálogo → vermelho')
mutLib(LIB_REL, "const viaSignup = (target: string, signedIn: boolean) => (signedIn ? target : '/signup?' + new URLSearchParams({ redirect: target }).toString())", 'const viaSignup = (target: string, signedIn: boolean) => (signedIn ? target : target)', hrefProblems, '(M8) visitante cai na parede de login sem volta → vermelho')
mutSrc('land', `            ${ITEM}\n            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>`, '            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>', navProblems, '(M9) 🔥 Trending sai do topo do site → vermelho')
mutSrc('mob', '  ...(TRENDING_LINK ? [{ href: TRENDING_LINK.href, label: TRENDING_LINK.label, signedIn: false }] : []),\n', '', navProblems, '(M10) 🔥 Trending sai do "More" do celular → vermelho')
mutSrc('navcfg', "  { href: '/trending', label: '🔥 Trending', icon: 'trending' },\n", '', navProblems, '(M11) 🔥 Trending sai da lateral (WORKSPACE_NAV) → vermelho')
mutSrc('sitemap', "    { path: '/trending', priority: 0.8, freq: 'daily' },", '', seoProblems, '(M12) /trending sai do sitemap → vermelho')
mutLib(LIB_REL, '      sub: t.hook,\n', '      sub: `${t.viralScore}K views · ${t.hook}`,\n', metricProblems, '(M13) "94K views" do viralScore no cartão → vermelho')
mutLib(LIB_REL, "  { topic: 'mys-02', film: 'f3de57b0-3486-4400-ba72-c9390774d426', subject: 'Dyatlov' },", "  { topic: 'mys-02', film: '33249fbf-57b6-47cf-8486-88bfb2a02db1', subject: 'Dyatlov' },", honestyProblems, '(M14) tema com filme de outro assunto (e do Omni) → vermelho')
mutLib(LIB_REL, "  bring_to_life: '2026-10-05',", "  bring_to_life: '2026-10-13',", honestyProblems, '(M15) selo New num efeito antigo → vermelho')
mutLib(LIB_REL, 'export const TRENDING_TODAY_MAX_AGE_HOURS = 36', 'export const TRENDING_TODAY_MAX_AGE_HOURS = 3600', honestyProblems, '(M16) pesquisa vencida vale como "de hoje" → vermelho')
mutLib(LIB_REL, "    if (!studioKey || !label || !href || !engineOffered(studioKey) || enginePaused(studioKey)) continue", '    if (!studioKey || !label || !href) continue', (B, c) => [...honestyProblems(B, c), ...hrefProblems(B, c)], '(M17) motor fora da oferta (Omni) volta à vitrine → vermelho')
mutSrc('card', ' muted loop playsInline preload="none" />', ' loop playsInline preload="auto" />', cardProblems, '(M18) vídeo com som/preload pesado → vermelho')
mutSrc('card', 'if (visible && !reduce && !saveData) void el.play()', 'if (visible) void el.play()', cardProblems, '(M19) vídeo ignora reduced-motion → vermelho')
{
  const d = JSON.parse(JSON.stringify(SRC.dict)); delete d.ar['Make mine']
  ok(copyProblems(d, REAL.T).length > 0, '(M20) frase sem tradução em ar → vermelho')
  const e = JSON.parse(JSON.stringify(SRC.dict)); e.pt['One photo, one tap, a 5-second clip.'] = 'Uma foto, um toque, um clipe rápido.'
  ok(copyProblems(e, REAL.T).length > 0, '(M21) tradução perde o "5" → vermelho')
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
