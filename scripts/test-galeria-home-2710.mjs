// KINEO-GALERIA-HOME-2710 — guardião do "Made with Kineo" (fundador 27/10: "uma seção no início onde a gente mostra todos os
// nossos clips, imagens, tudo junto" → item do menu do topo com este nome exato + galeria em /made-with-kineo).
//
// O QUE ELE PROVA (lendo os arquivos reais e executando a lib pura num vm):
//   P. a lib pura (lib/homeGaleria.ts): nome/destino/id de medição do item, evento home_galeria_clicked, dog_phone fora (lista e
//      mistura), mistura completa no ritmo 2 clipes · 1 imagem · 1 filme, filtros, destinos do "Make one like this" (visitante passa
//      pelo cadastro), ?prompt= aparado/limitado; nenhum título/selo com preço ou crédito;
//   F. fontes: cada chave da curadoria existe na fonte de verdade (efeito com prévia, tendência, filme do FOUNDER_SHOWCASE, foto
//      retrato da galeria da home); toda mídia local existe no disco; prévias novas leves (≤ 1,5 MB cada, pasta < 15 MB);
//   G. a grade (components/KineoHouseGallery.tsx): vídeo só pelo WallMedia (IntersectionObserver + preload="none"), pôster e
//      imagem com loading="lazy", clique dispara o evento com kind e id, cartão sem preço/crédito, filtros All · Clips · Images · Films;
//   N. menus: o item "Made with Kineo" no topo e no celular da home, no /examples, /trending, na moldura das páginas claras e na
//      própria página — sempre logo depois de "AI UGC Ads" e antes de "AI Cartoon Videos"; lateral (WORKSPACE_NAV + ícone) e "More"
//      do celular do app;
//   R. a página /made-with-kineo: a galeria da casa em cima, a vitrine com consentimento (KINEO-VITRINE-FILMES-2610) intacta embaixo
//      (leitura a cada visita, estado vazio honesto, aviso de permissão); components/MadeWithKineo.tsx sem mudança;
//   C. prefill: /clips lê ?prompt= só para PREENCHER (trend/effect vencem); /images (fonte congelada) fica intocado e abre no motor;
//   I. intocados: curadoria da home (lib/engineWall.ts, PromoCards) sem a marca;
//   M. mutantes: cada regra acima fica vermelha quando quebrada de propósito.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const MARCA = 'KINEO-GALERIA-HOME-2710'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`exceção: ${e.message}`] } }

function rodaLib(src) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(out, { module: mod, exports: mod.exports, URLSearchParams })
  return mod.exports
}

const S = {
  lib: rd('lib/homeGaleria.ts'),
  items: rd('lib/homeGaleriaItems.ts'),
  gal: rd('components/KineoHouseGallery.tsx'),
  wall: rd('components/WallMedia.tsx'),
  nav: rd('lib/navTelemetry.ts'),
  land: rd('app/KineoLanding.tsx'),
  examples: rd('app/examples/page.tsx'),
  trending: rd('app/trending/page.tsx'),
  clara: rd('components/seo/PaginaClara.tsx'),
  page: rd('app/made-with-kineo/page.tsx'),
  wsnav: rd('lib/ui/workspaceNavigation.ts'),
  side: rd('components/Sidebar.tsx'),
  mob: rd('components/MobileNav.tsx'),
  clips: rd('app/(dashboard)/clips/ClipsClient.tsx'),
  images: rd('app/(dashboard)/images/ImagesClient.tsx'),
  fx: rd('lib/clips/clipEffects.ts'),
  trends: rd('lib/clips/clipTrends.ts'),
  showcase: rd('lib/publicExamples.ts'),
  homeGallery: rd('components/home/HomeImageGallery.tsx'),
}
const PRECO = /\b(credits?|cr)\b|\$\s?\d|\d+\s?¢|\bfree\b|\bper (video|clip)\b/i

// ─── P. a lib pura ───────────────────────────────────────────────────────────
function checaLib(s) {
  const e = []
  const L = tenta(() => rodaLib(s.lib))
  if (Array.isArray(L)) return L
  if (L.MADE_WITH_KINEO_LABEL !== 'Made with Kineo') e.push('rótulo do item ≠ "Made with Kineo"')
  if (L.MADE_WITH_KINEO_HREF !== '/made-with-kineo') e.push('destino do item')
  const re = /export const NAV_ITEM_RE = (\/.*\/)\s*$/m.exec(s.nav)
  const rx = re ? new Function(`return ${re[1]}`)() : null
  if (!rx || !rx.test(L.MADE_WITH_KINEO_NAV_ITEM) || !String(L.MADE_WITH_KINEO_NAV_ITEM).startsWith('more:')) e.push(`id de medição fora do contrato: ${L.MADE_WITH_KINEO_NAV_ITEM}`)
  if (L.GALERIA_CLICK_EVENT !== 'home_galeria_clicked') e.push('evento ≠ home_galeria_clicked')
  if (!L.GALERIA_EXCLUDED?.includes('dog_phone')) e.push('dog_phone não está na lista de fora')
  const ids = [...(L.GALERIA_NEW_CLIPS ?? []).map((c) => c.id), ...(L.GALERIA_TEXT_CLIPS ?? []).map((c) => c.id), ...(L.GALERIA_TREND_KEYS ?? []), ...(L.GALERIA_EFFECT_KEYS ?? []), ...(L.GALERIA_IMAGES ?? []).map((i) => i.file), ...(L.GALERIA_FILM_IDS ?? [])]
  if (ids.some((id) => /dog_?phone/i.test(id))) e.push('dog_phone na curadoria')
  if (/dog_?phone/i.test(JSON.stringify(L.GALERIA_NEW_CLIPS))) e.push('dog_phone nos clipes novos')
  if ((L.GALERIA_NEW_CLIPS ?? []).length !== 8) e.push(`clipes novos = ${(L.GALERIA_NEW_CLIPS ?? []).length} ≠ 8`)
  if (new Set(ids).size !== ids.length) e.push('chave repetida na curadoria')
  // mistura
  const it = (kind, n) => Array.from({ length: n }, (_, i) => ({ id: `${kind}${i}`, kind, title: 't', engine: 'e', video: null, poster: 'p', href: '/' }))
  const mix = L.galeriaMix({ clip: [...it('clip', 5), { id: 'dog_phone', kind: 'clip' }], image: it('image', 3), film: it('film', 2) })
  if (mix.length !== 10) e.push(`mistura perdeu/duplicou cartões: ${mix.length}`)
  if (mix.some((x) => x.id === 'dog_phone')) e.push('mistura deixou passar o dog_phone')
  if (mix.slice(0, 4).map((x) => x.kind).join(',') !== 'clip,clip,image,film') e.push(`ritmo do All: ${mix.slice(0, 4).map((x) => x.kind)}`)
  if (L.galeriaFiltered(mix, 'film').some((x) => x.kind !== 'film') || L.galeriaFiltered(mix, 'all').length !== mix.length) e.push('filtro')
  if (JSON.stringify((L.GALERIA_FILTERS ?? []).map((f) => f.label)) !== JSON.stringify(['All', 'Clips', 'Images', 'Films'])) e.push('chips ≠ All · Clips · Images · Films')
  if (!(L.GALERIA_PAGE_SIZE >= 12 && L.GALERIA_PAGE_SIZE <= 24)) e.push('primeira leva fora de 12–24')
  // destinos
  const out = L.galeriaClipPromptHref('hollywood', 'a lion', false)
  const target = new URLSearchParams(out.split('?')[1]).get('redirect') ?? ''
  if (!out.startsWith('/signup?') || !target.startsWith('/clips?') || new URLSearchParams(target.split('?')[1]).get('prompt') !== 'a lion' || new URLSearchParams(target.split('?')[1]).get('engine') !== 'hollywood') e.push(`destino do clipe (visitante): ${out}`)
  if (!L.galeriaClipTrendHref('pet_dance', true).startsWith('/clips?trend=pet_dance')) e.push('destino da tendência')
  if (!L.galeriaClipEffectHref('melt', true).startsWith('/clips?effect=melt')) e.push('destino do efeito')
  const img = L.galeriaImageHref(true)
  if (!img.startsWith('/images?') || new URLSearchParams(img.split('?')[1]).get('engine') !== 'nanobanana') e.push(`destino da imagem: ${img}`)
  if (!L.galeriaImageHref(false).startsWith('/signup?')) e.push('imagem: visitante pula o cadastro')
  const film = new URLSearchParams(L.galeriaFilmHref('The river that boils', 'hollywood').split('?')[1])
  if (film.get('prompt') !== 'The river that boils' || film.get('engine') !== 'hollywood' || film.get('script_mode') !== 'ai') e.push('destino do filme')
  if (new URLSearchParams(L.galeriaFilmHref('x y z', null).split('?')[1]).has('engine')) e.push('filme de motor fora da oferta leva engine')
  if (L.galeriaPromptFromUrl('  ab ') !== null || L.galeriaPromptFromUrl(null) !== null || L.galeriaPromptFromUrl(' a cat\u0007 ') !== 'a cat' || L.galeriaPromptFromUrl('x'.repeat(5000)).length !== 1000) e.push('?prompt= sem aparar/limitar')
  // sem preço nos textos de cartão
  const textos = [...(L.GALERIA_NEW_CLIPS ?? []), ...(L.GALERIA_TEXT_CLIPS ?? []), ...(L.GALERIA_IMAGES ?? [])].map((c) => c.title).concat([L.GALERIA_IMAGE_ENGINE_LABEL])
  for (const t of textos) if (PRECO.test(t)) e.push(`preço/crédito no cartão: "${t}"`)
  for (const c of [...(L.GALERIA_NEW_CLIPS ?? []), ...(L.GALERIA_TEXT_CLIPS ?? [])]) if (!/No text, no logos, no watermark\.$/.test(c.prompt)) e.push(`prompt sem a cauda da casa: ${c.id}`)
  return e
}

// ─── F. fontes e disco ───────────────────────────────────────────────────────
function checaFontes(s) {
  const e = []
  const L = tenta(() => rodaLib(s.lib))
  if (Array.isArray(L)) return L
  const existe = (p) => fs.existsSync(path.join(ROOT, 'public', p))
  for (const c of [...L.GALERIA_NEW_CLIPS, ...L.GALERIA_TEXT_CLIPS]) for (const f of [c.video, c.poster]) if (!existe(f)) e.push(`arquivo ausente: ${f}`)
  for (const c of L.GALERIA_NEW_CLIPS) {
    if (!c.video.startsWith('/previews/galeria/') || !c.poster.startsWith('/posters/galeria/')) e.push(`clipe novo fora da pasta galeria: ${c.id}`)
    if (/supabase\.co/.test(c.video)) e.push(`clipe novo pesado direto do storage: ${c.id}`)
    const sz = existe(c.video) ? fs.statSync(path.join(ROOT, 'public', c.video)).size : 0
    if (sz > 1.5 * 1024 * 1024) e.push(`prévia pesada: ${c.id} ${(sz / 1048576).toFixed(1)} MB`)
  }
  let total = 0
  for (const d of ['public/previews/galeria', 'public/posters/galeria']) if (fs.existsSync(path.join(ROOT, d))) for (const f of fs.readdirSync(path.join(ROOT, d))) total += fs.statSync(path.join(ROOT, d, f)).size
  if (total >= 15 * 1024 * 1024) e.push(`pastas novas com ${(total / 1048576).toFixed(1)} MB (≥ 15)`)
  for (const k of L.GALERIA_EFFECT_KEYS) if (!new RegExp(`key: '${k}'[\\s\\S]*?preview: \\{ video: '([^']+)', poster: '([^']+)'`).test(s.fx)) e.push(`efeito sem prévia na fonte: ${k}`)
  for (const k of L.GALERIA_TREND_KEYS) if (!s.trends.includes(`key: '${k}'`)) e.push(`tendência inexistente: ${k}`)
  for (const id of L.GALERIA_FILM_IDS) if (!new RegExp(`id: '${id}'`).test(s.showcase.slice(s.showcase.indexOf('export const FOUNDER_SHOWCASE'), s.showcase.indexOf('export const ENGINE_PAGE_LEAD')))) e.push(`filme fora do FOUNDER_SHOWCASE: ${id}`)
  for (const { file } of L.GALERIA_IMAGES) {
    const m = new RegExp(`\\{ file: '${file.replace('.', '\\.')}', w: (\\d+), h: (\\d+)`).exec(s.homeGallery)
    if (!m) e.push(`foto fora da galeria da home: ${file}`)
    else if (Number(m[2]) <= Number(m[1])) e.push(`foto horizontal no cartão 9:16: ${file}`)
    if (!fs.existsSync(path.join(ROOT, 'public/home-images', file))) e.push(`foto ausente no disco: ${file}`)
  }
  if (!/GALERIA_EXCLUDED|galeriaMix/.test(s.items) || !/export function galeriaItems/.test(s.items)) e.push('resolvedor não passa pela mistura (que tira os excluídos)')
  if (!/engineLabelFor\(f\.engine\)/.test(s.items) || !/clipEffectEngineLabel\(e\)/.test(s.items) || !/CLIP_ENGINES\[c\.engine\]\.label/.test(s.items)) e.push('selo de motor digitado em vez de lido da fonte')
  return e
}

// ─── G. a grade ──────────────────────────────────────────────────────────────
function checaGrade(s) {
  const e = []
  const g = s.gal
  if (!/<WallMedia src=\{it\.video\} \/>/.test(g)) e.push('vídeo não passa pelo WallMedia')
  if (/<video\b/.test(g.slice(g.indexOf('return (')))) e.push('<video> solto na grade (fora do WallMedia)')
  if (!/<img [^>]*loading="lazy"/.test(g.slice(g.indexOf("return (")))) e.push('pôster/imagem sem loading="lazy"')
  if (!/preload="none"/.test(s.wall) || !/IntersectionObserver/.test(s.wall)) e.push('WallMedia sem preload="none"/IntersectionObserver')
  if (!/trackEvent\(GALERIA_CLICK_EVENT, \{ kind: it\.kind, id: it\.id/.test(g)) e.push('clique sem o evento home_galeria_clicked {kind, id}')
  const jsx = g.slice(g.indexOf('return ('))
  if (/credit|creditCostFor|engineCost|\bcr\b|\$\{?\s*price|TIER_PRICES|\$\d/i.test(jsx)) e.push('preço/crédito no JSX do cartão')
  if (/import[^\n]*(engineCost|checkoutPricing|marketingPrice)/.test(g)) e.push('grade importa preço')
  if (!/GALERIA_FILTERS\.map/.test(g) || !/aria-pressed=\{filter === f\.key\}/.test(g)) e.push('chips de filtro')
  if (!/Make one like this/.test(g)) e.push('sem "Make one like this"')
  if (!/See more/.test(g) || !/href="\/clips"/.test(g) || !/href="\/images"/.test(g) || !/href="\/examples"/.test(g)) e.push('"See more" / links para /clips, /images, /examples')
  if (!/aspect-ratio:9\/16/.test(g)) e.push('cartão sem proporção fixa (layout shift)')
  return e
}

// ─── N. menus ────────────────────────────────────────────────────────────────
const ITEM = /<Link href=\{MADE_WITH_KINEO_HREF\} data-nav-item=\{MADE_WITH_KINEO_NAV_ITEM\}[^>]*>\{MADE_WITH_KINEO_LABEL\}<\/Link>/
function posicao(bloco, nome) {
  const iU = bloco.search(/<NavUgcAdsLink data-nav-item="more:ugc" \/>/), iM = bloco.search(ITEM), iC = bloco.search(/<Link href=\{MENU_CARTOON_HREF\}/)
  if (iM < 0) return [`${nome}: sem "Made with Kineo"`]
  if (bloco.split(ITEM).length !== 2) return [`${nome}: "Made with Kineo" repetido`]
  if (!(iU >= 0 && iM > iU && iC > iM)) return [`${nome}: "Made with Kineo" fora do lugar (depois de AI UGC Ads, antes de AI Cartoon Videos)`]
  return []
}
function checaMenus(s) {
  const e = []
  const topo = s.land.slice(s.land.indexOf('<div className="nav-links" data-nav-surface="top"'), s.land.indexOf('<div className="nav-right">'))
  const cel = s.land.slice(s.land.indexOf('id="mobile-nav-menu"'), s.land.indexOf('</label>', s.land.indexOf('id="mobile-nav-menu"')))
  e.push(...posicao(topo, 'home topo'), ...posicao(cel, 'home celular'))
  const nav = (src) => src.slice(src.indexOf('<nav className={styles.nav}'), src.indexOf('</nav>', src.indexOf('<nav className={styles.nav}')))
  e.push(...posicao(nav(s.examples), '/examples'), ...posicao(nav(s.trending), '/trending'), ...posicao(nav(s.page), '/made-with-kineo'))
  const claraTopo = s.clara.slice(s.clara.indexOf('className="kpn-links"'), s.clara.indexOf('className="kpn-right"'))
  const claraCel = s.clara.slice(s.clara.indexOf('id="kpn-menu"'), s.clara.indexOf('</label>', s.clara.indexOf('id="kpn-menu"')))
  e.push(...posicao(claraTopo, 'páginas claras topo'), ...posicao(claraCel, 'páginas claras celular'))
  for (const [nome, src] of [['home', s.land], ['/examples', s.examples], ['/trending', s.trending], ['páginas claras', s.clara], ['/made-with-kineo', s.page]]) {
    if (!/import \{ MADE_WITH_KINEO_HREF, MADE_WITH_KINEO_LABEL, MADE_WITH_KINEO_NAV_ITEM \} from '@\/lib\/homeGaleria'/.test(src)) e.push(`${nome}: não importa o item da lib`)
  }
  if (!/aria-current="page">\{MADE_WITH_KINEO_LABEL\}/.test(s.page)) e.push('/made-with-kineo: item não marcado como página atual')
  const wn = (s.wsnav.match(/export const WORKSPACE_NAV = \[([\s\S]*?)\] as const/) || [, ''])[1]
  const hrefs = [...wn.matchAll(/\{ href: '([^']+)', label: '([^']+)', icon: '([^']+)'/g)].map((m) => m[1])
  if (hrefs.indexOf('/made-with-kineo') !== hrefs.indexOf('/ads/new') + 1) e.push(`lateral: "Made with Kineo" não vem logo depois de Product ads (${hrefs.join(' ')})`)
  if (!/\{ href: '\/made-with-kineo', label: 'Made with Kineo', icon: 'made' \}/.test(wn)) e.push('lateral: rótulo/ícone')
  if (!/\n  made: \(/.test(s.side)) e.push('Sidebar sem o ícone "made"')
  if (!/const MADE_WITH_KINEO_LINK = WORKSPACE_NAV\.find\(item => item\.href === '\/made-with-kineo'\)/.test(s.mob) || !/\.\.\.\(MADE_WITH_KINEO_LINK \?/.test(s.mob)) e.push('MobileNav: "More" sem o item')
  return e
}

// ─── R. a página ─────────────────────────────────────────────────────────────
function checaPagina(s) {
  const e = []
  const p = s.page
  if (!/<KineoHouseGallery items=\{galeriaItems\(signedIn\)\}/.test(p)) e.push('a galeria da casa não está na página')
  if (!p.includes("dynamic = 'force-dynamic'") || !p.includes("fetchCache = 'force-no-store'")) e.push('página perdeu a leitura a cada visita (privacidade da vitrine)')
  if (!/getShowcaseFilms\(page\)/.test(p) || !/copy\.empty/.test(p) || !/copy\.consent/.test(p)) e.push('vitrine com consentimento (filmes dos donos) sumiu ou sem estado vazio/aviso')
  if (p.indexOf('<KineoHouseGallery') > p.indexOf('getShowcaseFilms') && p.indexOf('<KineoHouseGallery') > p.indexOf('id="shared"')) e.push('galeria da casa não fica em cima')
  if (!/showcaseMetadata\('en'\)/.test(p)) e.push('canonical/hreflang da vitrine perdidos')
  try {
    const base = lf(execFileSync('git', ['-C', ROOT, 'show', 'origin/main:components/MadeWithKineo.tsx'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
    if (base && base !== rd('components/MadeWithKineo.tsx')) e.push('components/MadeWithKineo.tsx mudou (pt/es/filme têm de ficar como estão)')
  } catch { /* sem origin: ignora */ }
  return e
}

// ─── C. prefill ──────────────────────────────────────────────────────────────
function checaPrefill(s) {
  const e = []
  if (!/if \(sp\.get\('trend'\) \|\| sp\.get\('effect'\)\) return/.test(s.clips) || !/const p = galeriaPromptFromUrl\(sp\.get\('prompt'\)\)/.test(s.clips) || !/if \(p\) setPrompt\(p\)/.test(s.clips)) e.push('/clips não preenche ?prompt= (ou passa por cima de trend/effect)')
  // /images: fonte congelada pelo guardião test-ux-complete (integração aprovada a698625a) — esta entrega NÃO a toca.
  if (s.images.includes(MARCA)) e.push('/images tocado (ImagesClient é fonte congelada pelo test-ux-complete)')
  for (const [n, src] of [['/clips', s.clips]]) {
    const bloco = src.slice(src.indexOf('galeriaPromptFromUrl(', src.indexOf('useEffect')), src.indexOf('galeriaPromptFromUrl(', src.indexOf('useEffect')) + 400)
    if (/generate\(|fetch\(|handleGenerate|submit/i.test(bloco)) e.push(`${n}: ?prompt= dispara geração`)
  }
  return e
}

// ─── I. intocados ────────────────────────────────────────────────────────────
function checaIntocados() {
  const e = []
  for (const f of ['lib/engineWall.ts', 'components/PromoCards.tsx', 'lib/ui/promoCards.ts', 'components/home/HomeClipsStrip.tsx', 'components/home/HomeImageGallery.tsx']) if (rd(f).includes(MARCA)) e.push(`${f} tocado`)
  return e
}

const PROVAS = { P: checaLib, F: checaFontes, G: checaGrade, N: checaMenus, R: checaPagina, C: checaPrefill }
console.log(`${MARCA} — provas`)
for (const [k, fn] of Object.entries(PROVAS)) { const e = tenta(() => fn(S)); ok(e.length === 0, `${k}: ${e.length ? e.join(' | ') : 'ok'}`) }
{ const e = checaIntocados(); ok(e.length === 0, `I: ${e.join(' | ') || 'engineWall, PromoCards, faixa de clipes e galeria da home sem a marca'}`) }

// ─── M. mutantes ─────────────────────────────────────────────────────────────
console.log('mutantes (cada um tem de ficar vermelho)')
function mutante(nome, prova, campo, de, para) {
  const orig = S[campo]
  const novo = typeof de === 'string' ? orig.split(de).join(para) : orig.replace(de, para)
  if (novo === orig) { ok(false, `M ${nome}: mutação não aplicou`); return }
  const e = tenta(() => PROVAS[prova]({ ...S, [campo]: novo }))
  ok(e.length > 0, `M ${nome}: vermelho (${(e[0] ?? '').slice(0, 90)})`)
}
mutante('dog_phone entra nos clipes novos', 'P', 'lib', "{ id: 'lion',", "{ id: 'dog_phone', title: 'Dog with a phone', engine: 'hollywood', video: '/previews/galeria/lion.mp4', poster: '/posters/galeria/lion.webp', prompt: 'x. No text, no logos, no watermark.' },\n  { id: 'lion',")
mutante('dog_phone sai da lista de fora', 'P', 'lib', "['dog_phone']", '[]')
mutante('preço no título', 'P', 'lib', "title: 'Knight cat'", "title: 'Knight cat · 150 credits'")
mutante('evento renomeado', 'P', 'lib', "'home_galeria_clicked'", "'galeria_click'")
mutante('rótulo do item', 'P', 'lib', "MADE_WITH_KINEO_LABEL = 'Made with Kineo'", "MADE_WITH_KINEO_LABEL = 'Gallery'")
mutante('visitante pula o cadastro', 'P', 'lib', "return signedIn ? target : '/signup?' + qs({ redirect: target })", 'return target')
mutante('ritmo do All', 'P', 'lib', "['clip', 'clip', 'image', 'film']", "['film', 'clip', 'clip', 'image']")
mutante('prévia direto do storage', 'F', 'lib', "video: '/previews/galeria/lion.mp4'", "video: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/clips/x/f9c85460.mp4'")
mutante('efeito inexistente', 'F', 'lib', "'color_burst', 'secret_cake'", "'color_burst', 'efeito_fantasma'")
mutante('foto horizontal', 'F', 'lib', "{ file: 'cube.webp'", "{ file: 'lighthouse.webp'")
mutante('selo digitado', 'F', 'items', 'engine: CLIP_ENGINES[c.engine].label', "engine: 'Kling 3'")
mutante('vídeo solto sem preload none', 'G', 'gal', '{it.video ? <WallMedia src={it.video} /> : null}', '{it.video ? <video src={it.video} autoPlay preload="auto" /> : null}')
mutante('pôster sem lazy', 'G', 'gal', 'loading="lazy" decoding="async"', 'decoding="async"')
mutante('clique sem evento', 'G', 'gal', 'void trackEvent(GALERIA_CLICK_EVENT, { kind: it.kind, id: it.id, surface, filter })', 'void 0')
mutante('crédito no cartão', 'G', 'gal', '<i>{it.engine}</i>', '<i>{it.engine} · 5 credits</i>')
mutante('item some do topo da home', 'N', 'land', /\n\s*<Link href=\{MADE_WITH_KINEO_HREF\}[^\n]*KINEO-GALERIA-HOME-2710 \*\/\}(?!.*celular)/, '')
mutante('item antes do UGC no /trending', 'N', 'trending', /(\s*<NavUgcAdsLink[^\n]*\n)(\s*<Link href=\{MADE_WITH_KINEO_HREF\}[^\n]*\n)/, '$2$1')
mutante('item some do celular das páginas claras', 'N', 'clara', /\n\s*<Link href=\{MADE_WITH_KINEO_HREF\}[^\n]*par do topo no celular \*\/\}/, '')
mutante('lateral sem o item', 'N', 'wsnav', "  { href: '/made-with-kineo', label: 'Made with Kineo', icon: 'made' }, // KINEO-GALERIA-HOME-2710\n", '')
mutante('vitrine com consentimento some', 'R', 'page', 'getShowcaseFilms(page)', 'Promise.resolve({ films: [], hasNext: false })')
mutante('página perde force-no-store', 'R', 'page', "fetchCache = 'force-no-store'", "fetchCache = 'auto'")
mutante('/clips passa por cima do trend', 'C', 'clips', "if (sp.get('trend') || sp.get('effect')) return // KINEO-GALERIA-HOME-2710\n", '')
mutante('/images tocado', 'C', 'images', "import { IMG_ENGINES, type ImgModelKey } from '@/lib/imageModels'", "import { IMG_ENGINES, type ImgModelKey } from '@/lib/imageModels' // KINEO-GALERIA-HOME-2710")

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
