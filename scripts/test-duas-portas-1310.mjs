// KINEO-DUAS-PORTAS-2026-10-13 — guardião da vitrine com 2 portas (fundador 13/10, "tudo sim", ação B: "simplificar a
// vitrine para 2 portas, sem apagar nenhum produto").
//
// O QUE ELE PROVA (lendo os arquivos reais e EXECUTANDO a lib pura lib/ui/homeTwoDoors.ts num vm):
//   (1) a lib: eventos home_door_film_clicked / home_door_ads_clicked, destinos certos (filme → Studio no Seedance 1.5,
//       visitante passa pelo cadastro e volta; anúncio → /ads/new), metadados fechados (sem texto traduzido), zero import;
//   (2) a mídia: só prévias que JÁ existem, ≤ 1,5 MB, faststart, sem áudio, com pôster; os 3 filmes da porta são
//       Seedance 1.5 de verdade (lib/publicExamples.ts engine 'cinematic_ai') — selo honesto;
//   (3) o componente: os 2 cartões gravam o evento no clique, vídeo mudo+playsInline+pôster, reduced-motion respeitado,
//       e NENHUM preço digitado;
//   (4) a home: as portas abrem a página (logo depois do menu, ANTES do hero de filmes); a fileira de cards desceu para
//       "More tools" (depois do hero, os 4 cards: grade cheia); hero e engineWall intactos; e a home parou de
//       prometer "3 Fast videos every 24h" (o Kineo 1 saiu da entrada em 29/09);
//   (5) a oferta LÊ as fontes (TIER_PRICES.basic, WELCOME20, BUSINESS_*, TRIAL_FREE_FILM_SECONDS, ADS_SAMPLE_LIVE) e os
//       "15 s" dos títulos batem com as fontes (filme grátis de 15 s; anúncio de 15 s);
//   (6) o menu do topo: Make a film ▾ · Product ads · More tools ▾ · Pricing (+ Log in) — e NADA ficou inalcançável:
//       todo destino que o topo tinha segue no menu (≤ 2 cliques), Imagem é a 1ª coluna do More tools, motores intocados;
//   (7) o menu do celular (site) e os pares do app (Sidebar, MobileNav, lib/ui/workspaceNavigation) e o /examples;
//   (8) as frases novas nas 16 línguas com {marcas}, números e marcas preservados;
//   (M) mutantes: cada regra acima fica vermelha quando a quebramos de propósito.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
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
function roda(code) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => { throw Error('lib das portas não pode importar: ' + id) } })
  return box.exports
}

const LIB = read('lib/ui/homeTwoDoors.ts')
const COMP = read('components/home/HomeTwoDoors.tsx')
const LAND = read('app/KineoLanding.tsx')
const NAVCFG = read('lib/ui/workspaceNavigation.ts')
const SIDE = read('components/Sidebar.tsx')
const MOB = read('components/MobileNav.tsx')
const EXAMPLES = read('app/examples/page.tsx')
const PUBLIC_EX = read('lib/publicExamples.ts')
const DICT = JSON.parse(read('lib/ui/refinementCopy.json'))
const WALL = read('lib/engineWall.ts')

// ─── (1) a lib ───────────────────────────────────────────────────────────────
function libProblems(src) {
  const probs = []
  if (/^\s*import\s/m.test(src) || /\brequire\(/.test(src)) probs.push('lib com import (tem de ser pura)')
  let M
  try { M = roda(src) } catch (e) { return [`lib não roda: ${e.message}`] }
  if (M.HOME_DOOR_EVENTS?.film !== 'home_door_film_clicked') probs.push('evento do filme ≠ home_door_film_clicked')
  if (M.HOME_DOOR_EVENTS?.ads !== 'home_door_ads_clicked') probs.push('evento do anúncio ≠ home_door_ads_clicked')
  const studio = '/studio?engine=seedance&intent_campaign=home_door'
  if (M.homeDoorHref?.('film', true) !== studio) probs.push(`filme logado → ${M.homeDoorHref?.('film', true)}`)
  if (M.homeDoorHref?.('film', false) !== `/signup?redirect=${encodeURIComponent(studio)}`) probs.push(`filme visitante → ${M.homeDoorHref?.('film', false)}`)
  for (const signed of [true, false]) if (M.homeDoorHref?.('ads', signed) !== '/ads/new?utm_source=home_door') probs.push(`anúncio (${signed}) → ${M.homeDoorHref?.('ads', signed)}`)
  for (const [door, pos] of [['film', 1], ['ads', 2]]) {
    for (const signed of [true, false]) {
      const m = M.homeDoorClickMetadata?.(door, signed)
      const keys = m ? Object.keys(m).sort().join(',') : ''
      if (keys !== 'door,door_v,href,position,signed_in,surface') probs.push(`metadados de ${door} não fechados: ${keys}`)
      else if (m.door !== door || m.position !== pos || m.href !== M.homeDoorHref(door, signed) || m.signed_in !== signed || m.surface !== 'home' || m.door_v !== M.HOME_DOOR_TELEMETRY_VERSION) probs.push(`metadados de ${door} errados`)
    }
  }
  if (!(M.HOME_DOOR_TELEMETRY_VERSION >= 1)) probs.push('door_v ausente')
  return probs
}

// ─── (2) a mídia ─────────────────────────────────────────────────────────────
function mediaProblems(src) {
  const probs = []
  const M = roda(src)
  const film = M.HOME_DOOR_FILM_CLIPS || []
  const ads = M.HOME_DOOR_ADS_CLIPS || []
  if (film.length !== 3) probs.push(`porta do filme com ${film.length} filmes (esperado 3)`)
  if (ads.length !== 3) probs.push(`porta do anúncio com ${ads.length} vídeos (esperado 3)`)
  for (const clip of [...film, ...ads]) {
    for (const rel of [clip.src, clip.poster]) {
      const p = path.join(ROOT, 'public', rel)
      if (!fs.existsSync(p)) { probs.push(`${rel} não existe`); continue }
      const size = fs.statSync(p).size
      if (size > 1.5 * 1024 * 1024) probs.push(`${rel} pesado (${(size / 1048576).toFixed(2)} MB)`)
      if (size < 1024) probs.push(`${rel} vazio`)
    }
    const mp4 = path.join(ROOT, 'public', clip.src)
    if (fs.existsSync(mp4)) {
      const b = fs.readFileSync(mp4)
      const moov = b.indexOf('moov'); const mdat = b.indexOf('mdat')
      if (!(moov > 0 && mdat > 0 && moov < mdat)) probs.push(`${clip.src} sem faststart`)
      if (b.includes(Buffer.from('soun'))) probs.push(`${clip.src} com áudio`)
    }
  }
  // Selo honesto: o selo diz SEEDANCE 1.5, então os 3 filmes têm de ser Seedance 1.5 (cinematic_ai) na vitrine pública.
  if (M.HOME_DOOR_FILM_BADGE !== 'SEEDANCE 1.5') probs.push(`selo do filme = ${M.HOME_DOOR_FILM_BADGE}`)
  for (const clip of film) {
    const id = (clip.src.match(/ex-([0-9a-f-]{36})\.mp4$/) || [])[1]
    const line = id ? PUBLIC_EX.split('\n').find((l) => l.includes(`id: '${id}'`) && l.includes(`/previews/ex-${id}.mp4`)) : null
    if (!line) probs.push(`${clip.src} não é um filme da vitrine pública`)
    else if (!/engine: 'cinematic_ai'/.test(line)) probs.push(`${clip.src} não é Seedance 1.5 (selo mentiria)`)
  }
  return probs
}

// ─── (3) o componente ────────────────────────────────────────────────────────
function componentProblems(src) {
  const probs = []
  const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  if (!/^'use client'/.test(src)) probs.push("componente sem 'use client'")
  if (!src.includes("import { trackEvent } from '@/lib/analytics'")) probs.push('trackEvent não importado')
  if (!/void trackEvent\(HOME_DOOR_EVENTS\[door\], homeDoorClickMetadata\(door, signedIn\)\)/.test(code)) probs.push('clique não grava HOME_DOOR_EVENTS[door] com os metadados da lib')
  if (/home_door_(film|ads)_clicked/.test(code)) probs.push('nome do evento digitado no componente (tem de vir da lib)')
  for (const door of ['film', 'ads']) {
    const re = new RegExp(`<Link href=\\{homeDoorHref\\('${door}', signedIn\\)\\}[^>]*data-home-door="${door}"[^>]*onClick=\\{\\(\\) => track\\('${door}'\\)\\}>`)
    if (!re.test(code)) probs.push(`cartão ${door} sem destino da lib + clique medido`)
  }
  const videos = code.match(/<video[\s\S]*?\/>/g) || []
  if (videos.length < 2) probs.push('vídeos ausentes')
  for (const v of videos) {
    if (!/\bmuted\b/.test(v)) probs.push('vídeo sem muted')
    if (!/\bplaysInline\b/.test(v)) probs.push('vídeo sem playsInline')
    if (!/poster=\{clip\.poster\}/.test(v)) probs.push('vídeo sem pôster')
    if (!/preload="none"/.test(v) || /autoPlay/.test(v)) probs.push('vídeo com autoPlay/preload pesado')
  }
  if (!/onEnded=\{\(\) => setActive\(\(i \+ 1\) % count\)\}/.test(code)) probs.push('carrossel do anúncio sem troca no fim do vídeo')
  if (!/if \(visible && !reduce\)/.test(code)) probs.push('vídeo toca com reduced-motion')
  if (!/aspect-ratio:768\/440/.test(code)) probs.push('mídia sem altura fixa (layout shift)')
  // Nenhum número de oferta digitado: preço, créditos ou contagem vêm por props.
  if (/\$\s?\d|\b(84|19\.90|9\.90|500|12)\b/.test(code.replace(/HOME_TWO_DOORS_CSS = `[\s\S]*?`/, ''))) probs.push('preço/número de oferta digitado no componente')
  return probs
}

// ─── (4) a home ──────────────────────────────────────────────────────────────
const DOORS_TAG = '<HomeTwoDoors signedIn={isSignedIn} filmOffer={filmDoorOffer} adsOffer={adsDoorOffer} />'
const ROW_TAG = '<PromoCards cards={promoCardsFor({ clips: clipsVisible(initialEmail) })} />'
function homeProblems(src) {
  const probs = []
  const nav = src.indexOf('</div></nav>')
  const doors = src.indexOf(DOORS_TAG)
  const hero = src.indexOf('<header className="hero">')
  const heroEnd = src.indexOf('</header>', hero)
  const row = src.indexOf(ROW_TAG)
  if (doors < 0) probs.push('portas ausentes da home')
  else if (!(nav < doors && doors < hero)) probs.push('portas fora da primeira dobra (logo depois do menu, antes do hero)')
  if (src.split(DOORS_TAG).length !== 2) probs.push('portas repetidas')
  if (row < 0) probs.push('fileira "More tools" ausente (produto apagado da home)')
  else if (!(heroEnd > 0 && row > heroEnd)) probs.push('fileira de cards ainda acima dos filmes')
  if ((src.match(/<PromoCards /g) || []).length !== 1) probs.push('fileira de cards duplicada')
  if (/up to 3 (watermarked )?Fast videos/.test(src)) probs.push('home ainda promete "3 Fast videos every 24h" (não é mais a oferta)')
  if (!/<section className="home-more-tools" aria-label="More tools">/.test(src) || !/<h2><UiLabel>More tools<\/UiLabel><\/h2>/.test(src)) probs.push('fileira sem o rótulo "More tools"')
  if (!src.includes("import HomeTwoDoors, { type HomeDoorOffer } from '@/components/home/HomeTwoDoors'")) probs.push('import das portas ausente')
  // Curadoria intacta: o hero de filmes e a vitrine de motores seguem na página; o braço clips_first do A/B segue vivo.
  for (const keep of ['<HomeFeaturedFilms />', 'engineWall', '{clipsFirst && <HomeClipsStrip signedIn={isSignedIn} />}', '{!clipsFirst && businessShowcase}']) if (!src.includes(keep)) probs.push(`curadoria mexida: sumiu ${keep}`)
  return probs
}

// ─── (5) a oferta lida das fontes ────────────────────────────────────────────
function offerProblems(src) {
  const probs = []
  const block = (src.match(/  const filmDoorOffer: HomeDoorOffer = \{[\s\S]*?\n  const adsDoorOffer: HomeDoorOffer = \{[\s\S]*?\n  \}\n/) || [''])[0]
  if (!block) return ['bloco da oferta ausente']
  for (const need of ['usdPrice(TIER_PRICES.basic.usd)', 'WELCOME20_SITE_OFFER_LIVE', 'String(WELCOME20_PERCENT_OFF)', 'String(TRIAL_FREE_FILM_SECONDS)', 'TRIAL_SEEDANCE15_FILMS >= 1', 'GRANT_COUNTRY_CLAUSE', 'ADS_SAMPLE_LIVE', 'price: BUSINESS_PRICE_LABEL', 'String(BUSINESS_ADS_PER_MONTH)']) {
    if (!block.includes(need)) probs.push(`oferta não lê ${need}`)
  }
  if (/\b(84|19\.90|20|12|15)\b/.test(block.replace(/\/\/.*$/gm, ''))) probs.push('número da oferta digitado à mão')
  return probs
}
function truthProblems() {
  const probs = []
  if (!/export const TRIAL_FREE_FILM_SECONDS = 15\b/.test(read('lib/freeTierOffer.ts'))) probs.push('filme grátis deixou de ter 15 s (porta do filme diz "15-second"? confira a frase)')
  if (!/export const ADS_V2_SCREEN_SECONDS = 15\b/.test(read('lib/ads/v2Screen.ts'))) probs.push('anúncio deixou de ter 15 s (título da porta diz "15-second")')
  if (!/export const BUSINESS_AD_SECONDS = 15\b/.test(read('lib/businessPlan.ts'))) probs.push('Business deixou de prometer anúncio de 15 s')
  if (!/export const WELCOME20_PERCENT_OFF = 20 as const/.test(read('lib/growth/publicPromoTruth.ts'))) probs.push('WELCOME20 mudou de 20%')
  return probs
}

// ─── (6) o menu do topo ──────────────────────────────────────────────────────
function topNav(src) {
  const a = src.indexOf('<div className="nav-links" data-nav-surface="top" data-nav-area="public">')
  const b = src.indexOf('<div className="nav-right">', a)
  return a >= 0 && b > a ? src.slice(a, b) : ''
}
// Todos os destinos que o topo tinha antes das 2 portas (13/10) — nenhum pode sumir do menu.
const REACHABLE = [
  '/studio', '/examples', '/clips?upload=1', 'href="/clips"', '/ads/new', '/spaces', '/claude-connector', '/pricing',
  '/studio?engine=seedance&intent_campaign=nav_mega', '/studio?engine=kling&intent_campaign=nav_mega', '/studio?engine=veo&intent_campaign=nav_mega',
  '/studio?engine=hollywood&intent_campaign=nav_mega', '/studio?engine=h3&intent_campaign=nav_mega', '/images?engine=${engine.key}',
]
function navProblems(src) {
  const probs = []
  const nav = topNav(src)
  if (!nav) return ['menu do topo não encontrado']
  // Itens de 1º nível, na ordem: só as 2 portas, More tools e Pricing.
  const code = nav.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  const top = []
  let depth = 0
  for (const m of code.matchAll(/<PublicNavDropdown item="([^"]+)" label="([^"]+)">|<\/PublicNavDropdown>|<Link href="([^"]+)"[^>]*><UiLabel>([^<]+)<\/UiLabel><\/Link>/g)) {
    if (m[1]) { if (depth === 0) top.push(`▾${m[2]}`); depth++ }
    else if (m[0] === '</PublicNavDropdown>') depth--
    else if (depth === 0) top.push(m[4])
  }
  if (top.join(' · ') !== '▾Make a film · Product ads · ▾More tools · Pricing') probs.push(`topo = ${top.join(' · ')}`)
  if (!/<Link href="\/ads\/new" data-nav-item="business" className="nav-primary"><UiLabel>Product ads<\/UiLabel><\/Link>/.test(code)) probs.push('Product ads sem o peso de porta (nav-primary) ou fora do /ads/new')
  if (!/<Link href="\/studio\?intent_campaign=nav_door" data-nav-item="video"><span className="nm-tx"><b><UiLabel>Start a narrated film<\/UiLabel><\/b>/.test(code)) probs.push('Make a film não abre com "Start a narrated film" → /studio')
  for (const dest of REACHABLE) if (!code.includes(dest)) probs.push(`destino sumiu do menu: ${dest}`)
  // More tools: Imagem é a 1ª coluna (visível na 1ª abertura), com os motores de imagem.
  const more = (code.match(/<PublicNavDropdown item="more:tools" label="More tools">([\s\S]*?)<\/PublicNavDropdown>/) || [, ''])[1]
  const firstCol = (more.match(/<span className="nm-col"[^>]*>([\s\S]*?)<\/span>\n\s+<span className="nm-col">/) || [, ''])[1]
  if (!/<span className="nm-h"><UiLabel>Images<\/UiLabel><\/span>/.test(firstCol) || !firstCol.includes('IMG_ENGINES.map')) probs.push('Imagem não é a 1ª coluna do More tools')
  for (const dest of ['/clips?upload=1', 'href="/clips"', 'href="/spaces"', 'href="/claude-connector"']) if (!more.includes(dest)) probs.push(`More tools sem ${dest}`)
  if (/<PublicNavDropdown item="image"/.test(code)) probs.push('menu Images solto no topo (devia estar no More tools)')
  return probs
}
// Os motores do mega-menu NÃO são desta sessão (outra sessão mexe neles): as linhas seguem byte a byte.
const ENGINE_LINES = [
  '<NavEngineItem href="/studio?engine=seedance&intent_campaign=nav_mega" name="Seedance 1.5" desc="Fast, everyday narrated films" preview="/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4" thumb="/nav-thumbs/seedance.webp" />',
  '<NavEngineItem href="/studio?engine=kling&intent_campaign=nav_mega" name="Kling 2.5" desc="Smooth, realistic motion" preview="/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4" thumb="/nav-thumbs/kling.webp" />',
  '<NavEngineItem href="/studio?engine=hollywood&intent_campaign=nav_mega" name="Kling 3" desc="Premium look with native voice" preview="/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4" thumb="/nav-thumbs/kling3.webp" />',
  "{!enginePaused('h3') && <NavEngineItem href=\"/studio?engine=h3&intent_campaign=nav_mega\" name=\"MiniMax H3\" desc=\"Natural people and faces\" thumb=\"/nav-thumbs/h3.webp\" />}",
]

// ─── (7) celular do site e pares do app ──────────────────────────────────────
function mobilePublicProblems(src) {
  const probs = []
  const menu = (src.match(/<label htmlFor="nav-toggle" id="mobile-nav-menu"[\s\S]*?<\/label>/) || [''])[0]
  if (!menu) return ['menu do celular ausente']
  const order = ['<UiLabel>Make a film</UiLabel>', '<UiLabel>Product ads</UiLabel>', '<UiLabel>Pricing</UiLabel>', '<span className="nav-mobile-kicker"><UiLabel>More tools</UiLabel></span>', '<UiLabel>Images</UiLabel>', 'IMG_ENGINES.map', '<UiLabel>Clips</UiLabel>', '<UiLabel>Spaces</UiLabel>', '<UiLabel>MCP</UiLabel>', '<UiLabel>Examples</UiLabel>']
  let at = -1
  for (const piece of order) { const i = menu.indexOf(piece, at + 1); if (i < 0) { probs.push(`celular sem ${piece} na ordem`); break } at = i }
  if (!/<Link href="\/studio" data-nav-item="video"><UiLabel>Make a film<\/UiLabel><\/Link>/.test(menu)) probs.push('celular: Make a film não vai ao /studio')
  if (!/<Link href="\/ads\/new" data-nav-item="business"><UiLabel>Product ads<\/UiLabel><\/Link>/.test(menu)) probs.push('celular: Product ads não vai ao /ads/new')
  return probs
}
function appPairProblems(navCfg, side, mob, examples) {
  const probs = []
  const wn = (navCfg.match(/export const WORKSPACE_NAV = \[([\s\S]*?)\] as const/) || [, ''])[1]
  const items = [...wn.matchAll(/\{ href: '([^']+)', label: '([^']+)'/g)].map((m) => `${m[1]}=${m[2]}`)
  if (items.join(' ') !== '/studio=Make a film /ads/new=Product ads /library=Library /pricing=Pricing') probs.push(`WORKSPACE_NAV = ${items.join(' ')}`)
  const mt = (navCfg.match(/export const MORE_TOOLS_NAV = \[([\s\S]*?)\] as const/) || [, ''])[1]
  const tools = [...mt.matchAll(/\{ href: '([^']+)'/g)].map((m) => m[1])
  if (tools.join(' ') !== '/images /clips /spaces') probs.push(`MORE_TOOLS_NAV = ${tools.join(' ')} (Imagem primeiro, nada some)`)
  if (!/<UiLabel>More tools<\/UiLabel>/.test(side) || !side.includes("MORE_TOOLS_NAV.filter(item => item.href !== '/clips' || clipsVisible(userEmail)).map(item => <NavItem")) probs.push('Sidebar sem o grupo More tools (com o interruptor do Clips)')
  if (!side.includes('{WORKSPACE_NAV.map(item => <NavItem')) probs.push('Sidebar sem as portas')
  if (!mob.includes("...MORE_TOOLS_NAV.filter(item => item.href !== '/clips' || CLIPS_PUBLIC).map(") || mob.indexOf('...MORE_TOOLS_NAV') > mob.indexOf('...MORE_NAV.map')) probs.push('MobileNav: More não abre com Imagem/Clipes/Espaços')
  if (!/\{primaryLink\('\/studio'\)\}\n\s+\{primaryLink\('\/ads\/new'\)\}\n\s+\{primaryLink\('\/library'\)\}\n\s+\{primaryLink\('\/pricing'\)\}\n\s+\{disclosure\(groups\[0\]\)\}/.test(mob)) probs.push('MobileNav: barra ≠ portas + Library + Pricing + More')
  if (!/label: 'Make a film'/.test(mob) || !/label: 'Product ads'/.test(mob)) probs.push('MobileNav sem os rótulos das portas')
  if (!/data-nav-item="video"><UiLabel>Make a film<\/UiLabel><\/Link>\n\s+<Link href="\/ads\/new" className=\{styles\.navPrimary\} data-nav-item="business"><UiLabel>Product ads<\/UiLabel><\/Link>\n\s+<Link href="\/images" data-nav-item="image">/.test(examples)) probs.push('/examples sem as 2 portas (e Imagem logo depois)')
  return probs
}

// ─── (8) traduções ───────────────────────────────────────────────────────────
const NEW_COPY = [
  'Make a film', 'Product ads', 'More tools', 'Start a narrated film', 'One idea in, a finished film out', 'Choose what to make',
  'Narrated film', 'Make a narrated film from one idea', 'Type one idea. Kineo writes the script, narrates, adds music and edits a vertical film.',
  'Make my film', 'Product ad', 'Make a 15-second product ad from one photo',
  'Upload a product photo. Kineo turns it into an ad with voice, music and on-screen text.', 'Make my ad',
  'First {s}-second film free, watermarked', 'First {s}-second film free, watermarked (supported countries)', 'Start free, no card',
  'Creator ${price}/month, {pct}% off the first month', 'Creator ${price}/month', 'Your first ad is free', 'Business {price}/month ≈ {n} ads',
]
function copyProblems(dict) {
  const probs = []
  if (Object.keys(dict).length !== 16) probs.push(`${Object.keys(dict).length} línguas, não 16`)
  for (const [lang, d] of Object.entries(dict)) {
    for (const k of NEW_COPY) {
      const v = d[k]
      if (typeof v !== 'string' || !v.trim()) { probs.push(`${lang}: sem "${k}"`); continue }
      for (const mark of k.match(/\{[a-z]+\}|\d+/g) || []) if (!v.includes(mark)) probs.push(`${lang}: perdeu ${mark} em "${k}"`)
      for (const brand of ['Kineo', 'Creator', 'Business']) if (k.includes(brand) && !v.includes(brand)) probs.push(`${lang}: traduziu a marca ${brand}`)
    }
  }
  // Toda frase autoral nova do componente e do menu está no dicionário (senão o visitante em pt/es vê inglês).
  const used = [...COMP.matchAll(/<UiLabel>([^<{]+)<\/UiLabel>/g), ...COMP.matchAll(/copy\('([^']+)'\)/g)].map((m) => m[1])
  for (const k of used) if (!dict.pt[k] && !NEW_COPY.includes(k)) probs.push(`frase do componente sem tradução: ${k}`)
  return probs
}

// ─── o real ──────────────────────────────────────────────────────────────────
console.log('KINEO-DUAS-PORTAS-2026-10-13')
const lp = libProblems(LIB); ok(lp.length === 0, `(1) lib: eventos, destinos e metadados fechados (${lp.join('; ') || 'ok'})`)
const mp = mediaProblems(LIB); ok(mp.length === 0, `(2) mídia: prévias existentes, leves, faststart, mudas, selo honesto (${mp.join('; ') || 'ok'})`)
const cp = componentProblems(COMP); ok(cp.length === 0, `(3) componente: clique medido, vídeo seguro, sem preço digitado (${cp.join('; ') || 'ok'})`)
const hp = homeProblems(LAND); ok(hp.length === 0, `(4) home: portas na 1ª dobra, cards em More tools, curadoria intacta (${hp.join('; ') || 'ok'})`)
const op = [...offerProblems(LAND), ...truthProblems()]; ok(op.length === 0, `(5) oferta lida das fontes, 15 s conferidos (${op.join('; ') || 'ok'})`)
const np = navProblems(LAND); ok(np.length === 0, `(6) topo: 2 portas + More tools + Pricing, nada inalcançável (${np.join('; ') || 'ok'})`)
const missingEngines = ENGINE_LINES.filter((l) => !LAND.includes(l))
ok(missingEngines.length === 0, `(6b) linhas dos motores do mega-menu intocadas (${missingEngines.length} mexidas)`)
ok(!/HomeTwoDoors|homeTwoDoors|home_door/.test(WALL), '(6c) lib/engineWall.ts não sabe das portas')
const mpp = mobilePublicProblems(LAND); ok(mpp.length === 0, `(7a) celular do site: portas em cima, More tools embaixo (${mpp.join('; ') || 'ok'})`)
const ap = appPairProblems(NAVCFG, SIDE, MOB, EXAMPLES); ok(ap.length === 0, `(7b) pares do app e /examples (${ap.join('; ') || 'ok'})`)
const tp = copyProblems(DICT); ok(tp.length === 0, `(8) frases novas nas 16 línguas (${tp.slice(0, 4).join('; ') || 'ok'})`)

// ─── mutantes (cada um PRECISA aplicar e ficar vermelho) ──────────────────────
function mut(src, from, to, check, label) {
  const applied = src.includes(from)
  ok(applied && check(src.split(from).join(to)).length > 0, `${label}${applied ? '' : ' (MUTANTE NÃO APLICOU)'}`)
}
mut(LIB, "film: 'home_door_film_clicked'", "film: 'home_door_clicked'", libProblems, '(M1) evento do filme renomeado → vermelho')
mut(LIB, "if (door === 'ads') return `/ads/new?utm_source=${HOME_DOOR_CAMPAIGN}`", "if (door === 'ads') return '/ads'", libProblems, '(M2) porta do anúncio fora do /ads/new → vermelho')
mut(LIB, '    signed_in: signedIn,\n', "    signed_in: signedIn,\n    label: 'Make my film',\n", libProblems, '(M3) texto vazando nos metadados → vermelho')
mut(LIB, "preview('ex-cbd676d0-340a-4728-8a5f-439fd9dd64c5'),", "preview('ex-a66e975a-3f6c-4bf4-9510-cd15b895b58b'),", mediaProblems, '(M4) filme de outro motor sob o selo SEEDANCE 1.5 → vermelho')
mut(LIB, "preview('promo-ads-3var-3'),", "preview('promo-ads-3var-9'),", mediaProblems, '(M5) prévia inexistente → vermelho')
mut(COMP, 'onClick={() => track(\'ads\')}', '', componentProblems, '(M6) cartão do anúncio sem medição → vermelho')
mut(COMP, '<li>{line(adsOffer.plan)}</li>', '<li>Business $84/month</li>', componentProblems, '(M7) preço digitado no componente → vermelho')
mut(COMP, 'if (visible && !reduce)', 'if (visible)', componentProblems, '(M8) vídeo ignora reduced-motion → vermelho')
mut(LAND, `      ${DOORS_TAG}\n`, '', homeProblems, '(M9) portas removidas da home → vermelho')
mut(LAND, `      ${DOORS_TAG}\n      {clipsFirst && <HomeClipsStrip signedIn={isSignedIn} />}\n`, `      {clipsFirst && <HomeClipsStrip signedIn={isSignedIn} />}\n`, (s) => homeProblems(s.replace('      <section className="home-more-tools"', `      ${DOORS_TAG}\n      <section className="home-more-tools"`)), '(M10) portas descem para baixo dos filmes → vermelho')
mut(LAND, `        ${ROW_TAG}\n`, '', homeProblems, '(M11) fileira More tools apagada → vermelho')
mut(LAND, "`Every new account${GRANT_COUNTRY_CLAUSE} starts free with ${TRIAL_CREDITS_SHOWN} credits — ${TRIAL_FIRST_FILM_PHRASE}, no card.`", "'Create, download and share up to 3 watermarked Fast videos every 24h — no card.'", homeProblems, '(M11b) promessa antiga de 3 Fast/24h volta → vermelho')
mut(LAND, "price: usdPrice(TIER_PRICES.basic.usd), pct: String(WELCOME20_PERCENT_OFF)", "price: '19.90', pct: '20'", offerProblems, '(M12) preço do Creator digitado → vermelho')
mut(LAND, "n: String(BUSINESS_ADS_PER_MONTH)", "n: '12'", offerProblems, '(M13) "12 anúncios" digitado → vermelho')
mut(LAND, '<Link href="/spaces" data-nav-item="more:spaces"><span className="nm-tx">', '<Link href="/spaces-x" data-nav-item="more:spaces"><span className="nm-tx">', navProblems, '(M14) Spaces some do menu → vermelho')
mut(LAND, '<PublicNavDropdown item="more:tools" label="More tools">', '<Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>\n            <PublicNavDropdown item="more:tools" label="More tools">', navProblems, '(M15) item extra no topo → vermelho')
mut(LAND, '                <span className="nm-col" data-nav-item="image">\n                  <span className="nm-h"><UiLabel>Images</UiLabel></span>', '                <span className="nm-col" data-nav-item="image">\n                  <span className="nm-h"><UiLabel>Pictures</UiLabel></span>', navProblems, '(M16) Imagem deixa de abrir o More tools → vermelho')
mut(LAND, '<Link href="/studio" data-nav-item="video"><UiLabel>Make a film</UiLabel></Link>', '<Link href="/studio" data-nav-item="video"><UiLabel>Video</UiLabel></Link>', mobilePublicProblems, '(M17) celular perde a porta do filme → vermelho')
mut(NAVCFG, "  { href: '/spaces', label: 'Spaces', icon: 'spaces' },\n", '', (s) => appPairProblems(s, SIDE, MOB, EXAMPLES), '(M18) Espaços some da lateral → vermelho')
mut(MOB, "  const primary = NAV_ITEMS.filter((item) => ['/studio', '/ads/new', '/library', '/pricing'].includes(item.href))", "  const primary = NAV_ITEMS.filter((item) => ['/studio', '/library', '/pricing'].includes(item.href))", (s) => appPairProblems(NAVCFG, SIDE, s, EXAMPLES).concat(s.includes("['/studio', '/ads/new',") ? [] : ['porta 2 fora da barra']), '(M19) barra do celular sem a porta do anúncio → vermelho')
{
  const d = JSON.parse(JSON.stringify(DICT)); delete d.ar['Business {price}/month ≈ {n} ads']
  ok(copyProblems(d).length > 0, '(M20) frase sem tradução em ar → vermelho')
  const e = JSON.parse(JSON.stringify(DICT)); e.pt['Creator ${price}/month'] = 'Criador ${price}/mês'
  ok(copyProblems(e).length > 0, '(M21) marca Creator traduzida → vermelho')
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
