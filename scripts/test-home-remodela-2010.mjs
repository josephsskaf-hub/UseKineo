// KINEO-HOME-REMODELA-2010 — guardião da home e do menu do topo remodelados (fundador 20/10).
//   "os clips, eu quero dobrar o número de clips" · "no More Tools, eu quero extinguir esses cards… só quero colocar os exemplos deles…
//   em algum outro lugar" · "Imagens feitas pelo Kineo… mais 10 fotos… que lembrem de ads" · menu: "esses vão ser os quatro principais,
//   e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai cancelar".
//
// O QUE ELE PROVA (lendo os arquivos reais, executando a lib pura num vm e comparando com a base no git):
//   L. a lib: ordem do topo (4 principais + "Claude & ChatGPT" + Trending + Pricing), destinos, ids de medição que cabem no contrato;
//   T. topo da home: nessa ordem, sem "More tools" (nenhum PublicNavDropdown além do "Make a film"); celular: mesma ordem, sem o rótulo
//      "More tools" nem os itens dele; /examples e /trending: o mesmo topo (Images saiu de lá);
//   R. rodapé: Images, Clips, Spaces, Examples e o conector seguem a 1 clique (nada ficou inalcançável);
//   C. faixa de Clipes: 8 cartões (5 efeitos com prévia + 3 clipes de texto do antigo card Clips), arquivos no disco, aparece nos 2 braços
//      (showClips, não clipsFirst) logo depois dos cards do topo e antes dos filmes;
//   P. a fileira PromoCards não é mais desenhada na home (componente e lib seguem no repositório);
//   G. galeria "Images made by Kineo": as 13 fotos de antes + 10 fotos de anúncio (640×1146, WebP ≤ 150 KB) + a foto do card Nano Banana;
//      30 blocos (fecha em 6, 3 e 2 colunas); título traduzido nas 16 línguas;
//   I. intocados: HomeThreeCards/homeThreeCards (sessão dos 4 cards), engineWall, homeVideoCuration;
//   D. desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado como camada mais nova (semMenuUgc2010 chama este primeiro);
//   M. mutantes: cada regra acima fica vermelha quando a quebramos de propósito (aplicação provada antes de medir).
import fs from 'node:fs'
import { semBebeQueFala2010, BEBE_QUE_FALA_2010_ARQUIVOS, BEBE_QUE_FALA_2010_NOVOS } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o desenho infantil/bebê-podcast (20/10) foi mesclado depois: sai em memória; arquivos e commits dele fora da conta
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  semHomeRemodela2010, MARCA_HOME_REMODELA_2010, HOME_REMODELA_2010_BASE, HOME_REMODELA_2010_ARQUIVOS, HOME_REMODELA_2010_NOVOS,
  HOME_REMODELA_2010_CHAVES, HOME_REMODELA_2010_JSON,
} from './test-support/desfaz-home-remodela-2010.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const MARCA = 'KINEO-HOME-REMODELA-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${HOME_REMODELA_2010_BASE}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`exceção: ${e.message}`] } }

const F = {
  lib: 'lib/ui/homeRemodela2010.ts',
  land: 'app/KineoLanding.tsx',
  examples: 'app/examples/page.tsx',
  trending: 'app/trending/page.tsx',
  footer: 'components/Footer.tsx',
  clips: 'components/home/HomeClipsStrip.tsx',
  gallery: 'components/home/HomeImageGallery.tsx',
  dict: 'lib/ui/refinementCopy.json',
  nav: 'lib/navTelemetry.ts',
}
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const TOPO = ['Make a film', 'Product ads', 'AI UGC Ads', 'AI Cartoon Videos', 'Claude & ChatGPT', '🔥 Trending', 'Pricing']

function rodaLib(src) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(out, { module: mod, exports: mod.exports })
  return mod.exports
}

// ─── L. a lib ────────────────────────────────────────────────────────────────
function checaLib(src, navSrc) {
  const e = []
  const L = tenta(() => rodaLib(src))
  if (Array.isArray(L)) return L
  if (JSON.stringify([...L.TOP_MENU_ORDER]) !== JSON.stringify(TOPO)) e.push(`ordem do topo: ${JSON.stringify(L.TOP_MENU_ORDER)}`)
  if (L.MENU_CARTOON_HREF !== '/ai-kids-cartoon-videos') e.push('destino do 4º principal')
  if (L.MENU_CONNECTOR_HREF !== '/claude-connector') e.push('destino do conector')
  if (L.MENU_CONNECTOR_LABEL !== 'Claude & ChatGPT') e.push('rótulo do conector')
  if (L.HOME_GALLERY_TITLE !== 'Images made by Kineo') e.push('título da galeria')
  if (L.HOME_CLIPS_COUNT !== 8) e.push('contagem de clipes ≠ 8')
  const re = /export const NAV_ITEM_RE = (\/.*\/)\s*$/m.exec(navSrc)
  const rx = re ? new Function(`return ${re[1]}`)() : null
  for (const id of [L.MENU_CARTOON_NAV_ITEM, L.MENU_CONNECTOR_NAV_ITEM]) if (!rx || !rx.test(id) || !String(id).startsWith('more:')) e.push(`id de medição fora do contrato: ${id}`)
  if (/official|partner|approved|certified|by Anthropic/i.test(L.MENU_CONNECTOR_LABEL)) e.push('selo desonesto no conector')
  return e
}

// ─── T. menus ────────────────────────────────────────────────────────────────
const ROTULO = {
  'Make a film': [/<PublicNavDropdown item="video" label="Make a film">/, /<Link href="\/studio" data-nav-item="video"><UiLabel>Make a film<\/UiLabel><\/Link>/, /<Link href="\/studio" className=\{styles\.navPrimary\} data-nav-item="video"><UiLabel>Make a film<\/UiLabel><\/Link>/],
  'Product ads': [/<Link href="\/ads\/new"[^>]*data-nav-item="business"[^>]*><UiLabel>Product ads<\/UiLabel><\/Link>/],
  'AI UGC Ads': [/<NavUgcAdsLink data-nav-item="more:ugc" \/>/],
  'AI Cartoon Videos': [/<Link href=\{MENU_CARTOON_HREF\} data-nav-item=\{MENU_CARTOON_NAV_ITEM\}><UiLabel>\{MENU_CARTOON_LABEL\}<\/UiLabel><\/Link>/],
  'Claude & ChatGPT': [/<Link href=\{MENU_CONNECTOR_HREF\} data-nav-item=\{MENU_CONNECTOR_NAV_ITEM\}[^>]*>\{MENU_CONNECTOR_LABEL\}<\/Link>/],
  '🔥 Trending': [/<Link href="\/trending" data-nav-item="more:trending"[^>]*><UiLabel>🔥 Trending<\/UiLabel><\/Link>/],
  Pricing: [/<Link href="\/pricing" data-nav-item="pricing"><UiLabel>Pricing<\/UiLabel><\/Link>/],
}
function ordemNoBloco(bloco) {
  const pos = TOPO.map((r) => { let m = -1; for (const re of ROTULO[r]) { const x = bloco.search(re); if (x >= 0 && (m < 0 || x < m)) m = x } return m })
  return pos
}
function checaMenu(bloco, nome) {
  const e = []
  const pos = ordemNoBloco(bloco)
  TOPO.forEach((r, i) => { if (pos[i] < 0) e.push(`${nome}: falta "${r}"`) })
  for (let i = 1; i < pos.length; i++) if (pos[i] >= 0 && pos[i - 1] >= 0 && pos[i] < pos[i - 1]) e.push(`${nome}: "${TOPO[i]}" antes de "${TOPO[i - 1]}"`)
  if (/More tools/.test(bloco.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''))) e.push(`${nome}: "More tools" ainda no menu`)
  if (/item="more:tools"/.test(bloco)) e.push(`${nome}: dropdown more:tools`)
  if (/href="\/images"[^>]*data-nav-item="image"/.test(bloco)) e.push(`${nome}: Images ainda no topo`)
  if (/href="\/spaces"|href="\/clips/.test(bloco)) e.push(`${nome}: Spaces/Clips ainda no topo`)
  return e
}
function blocos(land) {
  const topo = land.slice(land.indexOf('<div className="nav-links" data-nav-surface="top"'), land.indexOf('<div className="nav-right">'))
  const cel = land.slice(land.indexOf('id="mobile-nav-menu"'), land.indexOf('</label>', land.indexOf('id="mobile-nav-menu"')))
  return { topo, cel }
}
function checaHomeMenus(land) {
  const { topo, cel } = blocos(land)
  if (!topo || !cel) return ['blocos do menu não achados']
  const e = [...checaMenu(topo, 'topo'), ...checaMenu(cel, 'celular')]
  if ((topo.match(/<PublicNavDropdown /g) ?? []).length !== 1) e.push('topo: mais de um dropdown (só o "Make a film" fica)')
  if (/IMG_ENGINES\.map/.test(land)) e.push('motores de imagem ainda no menu')
  if (!/import \{[^}]*MENU_CARTOON_HREF[^}]*\} from '@\/lib\/ui\/homeRemodela2010'/.test(land)) e.push('KineoLanding não importa a lib')
  return e
}
function checaPar(src, nome) {
  const nav = src.slice(src.indexOf('<nav className={styles.nav}'), src.indexOf('</nav>', src.indexOf('<nav className={styles.nav}')))
  const e = checaMenu(nav, nome)
  if (/href="\/images"/.test(nav)) e.push(`${nome}: /images ainda no topo`)
  return e
}

// ─── R. rodapé ───────────────────────────────────────────────────────────────
function checaRodape(src) {
  const e = []
  for (const h of ['/images', '/clips', '/spaces', '/examples']) if (!new RegExp(`\\{ href: '${h.replace('/', '\\/')}', label: '[^']+' \\}`).test(src)) e.push(`rodapé sem ${h}`)
  if (!/href: '\/claude-connector/.test(src)) e.push('rodapé sem o conector')
  return e
}

// ─── C. faixa de clipes ──────────────────────────────────────────────────────
function checaClipes(src, land) {
  const e = []
  const k = /export const HOME_CLIP_KEYS: readonly ClipEffectKey\[\] = \[([^\]]*)\]/.exec(src)
  const keys = k ? [...k[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : []
  const textos = [...src.matchAll(/\{ id: '(\w+)', title: '([^']+)', video: '([^']+)', poster: '([^']+)'/g)]
  if (keys.length + textos.length !== 8) e.push(`clipes = ${keys.length} efeitos + ${textos.length} textos ≠ 8`)
  if (JSON.stringify(keys.slice(0, 4)) !== JSON.stringify(['color_burst', 'product_360', 'secret_cake', 'melt'])) e.push('os 4 escolhidos pelo fundador mudaram de lugar')
  const fx = rd('lib/clips/clipEffects.ts')
  for (const key of keys) {
    const m = new RegExp(`key: '${key}'[\\s\\S]*?preview: (null|\\{ video: '([^']+)')`).exec(fx)
    if (!m || m[1] === 'null' || !fs.existsSync(path.join(ROOT, 'public', m[2]))) e.push(`efeito sem prévia no disco: ${key}`)
  }
  for (const t of textos) for (const f of [t[3], t[4]]) if (!fs.existsSync(path.join(ROOT, 'public', f))) e.push(`clipe de texto sem arquivo: ${f}`)
  if (!/\{HOME_TEXT_CLIPS\.map\(\(c\) => \(/.test(src)) e.push('os clipes de texto não são desenhados')
  if (!/grid-auto-rows:var\(--film-height\)/.test(src)) e.push('grade de 2 fileiras sumiu')
  if (!/\{showClips && <HomeClipsStrip signedIn=\{isSignedIn\} \/>\}/.test(land)) e.push('a faixa não aparece nos 2 braços (showClips)')
  if (/\{clipsFirst && <HomeClipsStrip/.test(land)) e.push('a faixa ainda só no braço clips_first')
  const iCards = land.indexOf('<HomeTwoDoors signedIn'), iStrip = land.indexOf('<HomeClipsStrip signedIn'), iFilms = land.indexOf('<HomeFeaturedFilms />')
  if (!(iCards >= 0 && iStrip > iCards && iFilms > iStrip)) e.push('a faixa não fica entre os cards do topo e os filmes')
  return e
}

// ─── P. PromoCards fora da home ─────────────────────────────────────────────
function checaPromo(land) {
  const e = []
  if (/<PromoCards\b/.test(land)) e.push('PromoCards ainda desenhado na home')
  if (/^import PromoCards /m.test(land)) e.push('import do PromoCards ainda vivo na home')
  if (!fs.existsSync(path.join(ROOT, 'components/PromoCards.tsx')) || !fs.existsSync(path.join(ROOT, 'lib/ui/promoCards.ts'))) e.push('o componente/lib do PromoCards sumiram (só sai da home)')
  if (!/<h2><UiLabel>\{HOME_GALLERY_TITLE\}<\/UiLabel><\/h2>/.test(land)) e.push('a seção não se chama "Images made by Kineo"')
  if (!/<HomeImageGallery \/>/.test(land)) e.push('galeria fora da home')
  return e
}

// ─── G. galeria ──────────────────────────────────────────────────────────────
function dimWebp(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const c = buf.toString('ascii', 12, 16)
  if (c === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
  if (c === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (c === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
  return null
}
function checaGaleria(src, dict) {
  const e = []
  const itens = [...src.matchAll(/\{ file: '([^']+)', w: (\d+), h: (\d+), alt: '([^']+)' \}/g)].map((m) => ({ file: m[1], w: +m[2], h: +m[3], alt: m[4] }))
  const antes = ['puddle', 'clock-blue', 'lighthouse', 'sneaker-white', 'raincoat', 'coffee', 'apple', 'boutique', 'astronaut', 'cube', 'coworking', 'clock-brass', 'toycar'].map((n) => `${n}.webp`)
  for (const f of antes) if (!itens.some((i) => i.file === f)) e.push(`foto de antes sumiu: ${f}`)
  const ads = itens.filter((i) => /^ad-\d\d\.webp$/.test(i.file))
  if (ads.length !== 10) e.push(`fotos de anúncio = ${ads.length} ≠ 10`)
  if (!itens.some((i) => i.file === 'perfume-splash.webp')) e.push('a foto do card Nano Banana não entrou na galeria')
  if (new Set(itens.map((i) => i.file)).size !== itens.length) e.push('foto repetida')
  for (const i of itens) {
    const p = path.join(ROOT, 'public/home-images', i.file)
    if (!fs.existsSync(p)) { e.push(`sem arquivo: ${i.file}`); continue }
    const buf = fs.readFileSync(p)
    if (buf.length > 150 * 1024) e.push(`${i.file} pesa ${buf.length} B (> 150 KB)`)
    const d = dimWebp(buf)
    if (!d || d.w !== i.w || d.h !== i.h) e.push(`${i.file}: medida declarada ${i.w}×${i.h} ≠ real ${d ? `${d.w}×${d.h}` : '?'}`)
  }
  for (const a of ads) if (a.w !== 640 || a.h !== 1146) e.push(`${a.file} fora do retrato 640×1146`)
  const big = /HOME_GALLERY_BIG: ReadonlySet<string> = new Set\(\[([^\]]*)\]\)/.exec(src)
  const bigs = big ? [...big[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
  const blocos = itens.reduce((n, i) => n + (i.w > i.h ? 2 : bigs.includes(i.file) ? 4 : 1), 0)
  if (blocos % 6 || blocos % 3 || blocos % 2) e.push(`grade com buraco: ${blocos} blocos`)
  let j
  try { j = JSON.parse(dict) } catch { return [...e, 'dicionário inválido'] }
  for (const l of LANGS) for (const k of HOME_REMODELA_2010_CHAVES) { const v = j[l]?.[k]; if (typeof v !== 'string' || !v.trim() || (l !== 'en' && v === k && k !== 'AI Cartoon Videos')) e.push(`${l}: "${k}" sem tradução`) }
  if (j.pt?.['Images made by Kineo'] !== 'Imagens feitas pelo Kineo') e.push('PT do título ≠ palavras do fundador')
  return e
}

// ─── I. intocados ────────────────────────────────────────────────────────────
function checaIntocados() {
  const e = []
  for (const f of ['components/home/HomeThreeCards.tsx', 'lib/ui/homeThreeCards.ts', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts']) {
    if (fs.existsSync(path.join(ROOT, f)) && rd(f).includes(MARCA)) e.push(`${f} tocado por esta entrega`)
  }
  return e
}

// ─── D. desfaz ───────────────────────────────────────────────────────────────
function checaDesfaz() {
  const e = []
  for (const rel of [...HOME_REMODELA_2010_ARQUIVOS, HOME_REMODELA_2010_JSON]) {
    const b = base(rel)
    if (b == null) { e.push(`${rel} não existe na base`); continue }
    const atual = rd(rel)
    const volta = tenta(() => semHomeRemodela2010(atual, rel))
    if (Array.isArray(volta)) { e.push(`${rel}: ${volta[0]}`); continue }
    if (lf(volta) !== b) e.push(`${rel}: desfeito ≠ base`)
    if (lf(semHomeRemodela2010(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) !== b) e.push(`${rel}: desfeito com CRLF ≠ base`)
  }
  for (const n of HOME_REMODELA_2010_NOVOS) if (!fs.existsSync(path.join(ROOT, n))) e.push(`novo ausente: ${n}`)
  const cabeca = semBebeQueFala2010(rd('scripts/test-support/desfaz-menu-ugc-2010.mjs'), 'scripts/test-support/desfaz-menu-ugc-2010.mjs') // reancorado KINEO-BEBE-QUE-FALA-2010
  const i = cabeca.indexOf('export function semMenuUgc2010(')
  const corpo = cabeca.slice(i, cabeca.indexOf('\n}', i))
  const l1 = corpo.split('\n')[1] ?? ''
  if (!/^  texto = semHomeRemodela2010\(texto, p\)/.test(l1)) e.push('semMenuUgc2010 não chama esta camada PRIMEIRO')
  if (MARCA_HOME_REMODELA_2010 !== MARCA || /KINEO-MENU-UGC-2010|KINEO-AVATAR-PRESO-2010/.test(MARCA)) e.push('marca errada')
  return e
}

const S = {
  lib: rd(F.lib), land: rd(F.land), examples: rd(F.examples), trending: rd(F.trending), footer: rd(F.footer),
  clips: rd(F.clips), gallery: rd(F.gallery), dict: rd(F.dict), nav: rd(F.nav),
}
const PROVAS = {
  L: (s) => checaLib(s.lib, s.nav),
  T: (s) => [...checaHomeMenus(s.land), ...checaPar(s.examples, '/examples'), ...checaPar(s.trending, '/trending')],
  R: (s) => checaRodape(s.footer),
  C: (s) => checaClipes(s.clips, s.land),
  P: (s) => checaPromo(s.land),
  G: (s) => checaGaleria(s.gallery, s.dict),
}
console.log('KINEO-HOME-REMODELA-2010 — provas')
for (const [k, fn] of Object.entries(PROVAS)) { const e = tenta(() => fn(S)); ok(e.length === 0, `${k}: ${e.length ? e.join(' | ') : 'ok'}`) }
{ const e = checaIntocados(); ok(e.length === 0, `I: ${e.join(' | ') || 'HomeThreeCards, homeThreeCards, engineWall e homeVideoCuration sem a marca'}`) }
{ const e = tenta(checaDesfaz); ok(e.length === 0, `D: ${e.join(' | ') || 'cada arquivo desfeito = base; camada mais nova da cadeia'}`) }

// ─── M. mutantes ─────────────────────────────────────────────────────────────
console.log('mutantes (cada um tem de ficar vermelho)')
function mutante(nome, prova, campo, de, para) {
  const orig = S[campo]
  const novo = typeof de === 'string' ? orig.split(de).join(para) : orig.replace(de, para)
  if (novo === orig) { ok(false, `M ${nome}: mutação não aplicou`); return }
  const e = tenta(() => PROVAS[prova]({ ...S, [campo]: novo }))
  ok(e.length > 0, `M ${nome}: vermelho (${(e[0] ?? '').slice(0, 90)})`)
}
mutante('ordem da lib', 'L', 'lib', "MENU_CARTOON_LABEL, MENU_CONNECTOR_LABEL,", "MENU_CONNECTOR_LABEL, MENU_CARTOON_LABEL,")
mutante('conector com selo', 'L', 'lib', "'Claude & ChatGPT'", "'Official Claude & ChatGPT partner'")
mutante('"More tools" de volta no topo', 'T', 'land', '<Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>\n            <Link href="/pricing"', '<PublicNavDropdown item="more:tools" label="More tools"><span /></PublicNavDropdown>\n            <Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>\n            <Link href="/pricing"')
mutante('conector antes do 4º principal (topo)', 'T', 'land', /(\s*<Link href=\{MENU_CARTOON_HREF\}[^\n]*\n)(\s*<Link href=\{MENU_CONNECTOR_HREF\}[^\n]*\n)/, '$2$1')
mutante('rótulo "More tools" de volta no celular', 'T', 'land', '<Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>\n              {initialUser', '<Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>\n              <span className="nav-mobile-kicker"><UiLabel>More tools</UiLabel></span>\n              {initialUser')
mutante('Images de volta no /examples', 'T', 'examples', '<Link href={MENU_CARTOON_HREF}', '<Link href="/images" data-nav-item="image"><UiLabel>Images</UiLabel></Link><Link href={MENU_CARTOON_HREF}')
mutante('rodapé sem Spaces', 'R', 'footer', "{ href: '/spaces',", "{ href: '/spaces-x',")
mutante('clipes de volta a 4', 'C', 'clips', "'melt', 'zoom_out_earth']", "'melt']")
mutante('faixa só no clips_first', 'C', 'land', '{showClips && <HomeClipsStrip', '{clipsFirst && <HomeClipsStrip')
mutante('clipe de texto sem arquivo', 'C', 'clips', "/previews/promo-clips-surf.mp4", "/previews/promo-clips-nao-existe.mp4")
mutante('PromoCards de volta', 'P', 'land', '<HomeImageGallery />', '<PromoCards cards={[]} /><HomeImageGallery />')
mutante('título "More tools" de volta', 'P', 'land', '<h2><UiLabel>{HOME_GALLERY_TITLE}</UiLabel></h2>', '<h2><UiLabel>More tools</UiLabel></h2>')
mutante('9 fotos de anúncio', 'G', 'gallery', /\n  \{ file: 'ad-10\.webp'[^\n]*/, '')
mutante('medida falsa', 'G', 'gallery', "{ file: 'ad-03.webp', w: 640, h: 1146", "{ file: 'ad-03.webp', w: 640, h: 1140")
mutante('grade com buraco (sem a foto do Nano Banana)', 'G', 'gallery', /\n  \{ file: 'perfume-splash\.webp'[^\n]*/, '')
mutante('título sem PT', 'G', 'dict', '"Images made by Kineo": "Imagens feitas pelo Kineo"', '"Images made by Kineo": "Images made by Kineo"')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
