#!/usr/bin/env node
// KINEO-HOME-LIMPA-1410 — guardião da limpeza da home + galeria Nano Banana (fundador 14/10).
// Prova, no fonte E no render real da home (offline, sem rede/banco/geração):
//   (1) os 3 blocos velhos sumiram: banner Business (AgencyVolumeBridge entry="home"), "Start with the full toolkit"
//       (texto + botão + 3 cards) e "Videos for your business." (Restaurant/Product + nota);
//   (2) a galeria tem 10–15 imagens LOCAIS, cada uma ≤ 150 KB, WebP de verdade, com largura/altura declaradas iguais
//       às do arquivo (sem layout shift), lazy, todas levando a /images, com o selo honesto;
//   (3) as imagens vêm SÓ da pasta permitida public/home-images/ e cada uma tem procedência da casa (images.id de conta
//       interna, Nano Banana) registrada aqui — nenhuma imagem de cliente;
//   (4) o menu do topo não mudou (mesma sequência de itens);
//   (5) os ganchos do modal de login seguem intactos (KINEO-LOGIN-MODAL-1410).
// Mutantes embutidos (M1…M10) provam que cada trava fica vermelha quando o defeito volta.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderPage } from './preview-ux-complete.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let okc = 0, fail = 0
const checa = (label, cond) => { if (cond) { okc++; console.log('  ok   ' + label) } else { fail++; console.log('  FALHA ' + label) } }

const GALLERY_DIR_FS = 'public/home-images'
const GALLERY_DIR_URL = '/home-images/'
const MAX_BYTES = 150 * 1024

// Procedência (só contas da casa, model nanobanana, consulta read-only de 14/10 na tabela `images`): arquivo → images.id.
// Fica aqui (scripts/ não vai para o navegador) para não expor ids no bundle.
const PROVENANCE = {
  'puddle.webp': 'f2c19419-759e-4ab3-bdff-848a094764ba',
  'lighthouse.webp': '2dfe9ac8-2d30-4522-9c76-2bc9746c35fc',
  'clock-blue.webp': 'a1cf8237-1346-4f62-8f9f-1bf9fb3b4856',
  'coffee.webp': 'bd12eb15-4c0c-4f9b-9e37-12a754ead4f7',
  'perfume.webp': '21f6d198-fa61-40fb-8c99-9aeb2c4eb1e8',
  'sneaker-white.webp': '83bbefdc-37a6-405a-a543-abbe1ebb6cc3',
  'raincoat.webp': '52fb63b4-233c-4044-85e2-ac9c22912c0d',
  'boutique.webp': '81678690-3d40-4f2b-9cbf-a8a9ca38c151',
  'astronaut.webp': 'aefc95b4-dd12-4d3f-94b7-2dee6f0e769b',
  'apple.webp': '9001edeb-3cfd-49c7-84fd-10c783f78d89',
  'coworking.webp': 'b53936b3-5ef1-4fe0-9584-5fc452f07c50',
  'clock-brass.webp': '45271a5a-a385-4885-842b-bcb43d50877e',
  'cube.webp': 'ed4fb4a0-1937-400b-8027-d3045816c2b8',
  'toycar.webp': '93b1f69f-3327-4608-81f0-ca5fa2b07bea',
}

// Sequência do menu do topo (data-nav-item, desktop + celular) medida na origin/main de 14/10 antes desta mudança.
const NAV_ITEMS = ['video', 'video', 'examples', 'business', 'more:tools', 'image', 'more:clips', 'more:spaces', 'more:mcp', 'more:trending', 'pricing', 'login', 'video', 'business', 'more:trending', 'pricing', 'login', 'image', 'image', 'image', 'image', 'image', 'image', 'image', 'more:clips', 'more:spaces', 'more:mcp', 'examples']

// Frases dos 3 blocos removidos (como aparecem no render).
const GONE_TEXT = [
  'For businesses, agencies and freelancers', 'Making video ads for a product', 'See the Business plan', 'Self-service · monthly billing · cancel anytime',
  'Start with the full toolkit', 'Open the generator', 'utm_source=engine_bento', 'class="home-start"', 'class="home-create',
  'Videos for your business.', 'AI-generated visual concepts', 'business-reference-note', 'home-business-showcase',
  'data-growth-surface="home_b2b_bridge"',
]

// ─── fonte da home ───────────────────────────────────────────────────────────
function sourceProblems(src) {
  const p = []
  if (/<AgencyVolumeBridge\b/.test(src) || src.includes("from '@/components/AgencyVolumeBridge'")) p.push('banner Business (AgencyVolumeBridge) voltou')
  if (src.includes('businessShowcase') || /<BusinessVisualReferences\b/.test(src) || src.includes("from '@/components/BusinessVisualReferences'")) p.push('seção de empresas voltou')
  if (src.includes('home-create') || src.includes('home-start') || src.includes('Start with the full toolkit')) p.push('bloco "full toolkit" voltou')
  const more = src.indexOf('<section className="home-more-tools" aria-label="More tools">')
  const moreEnd = more >= 0 ? src.indexOf('</section>', more) : -1
  const gal = src.indexOf('<HomeImageGallery />')
  if (!(more >= 0 && gal > more && gal < moreEnd)) p.push('galeria fora da seção More tools')
  if ((src.match(/<HomeImageGallery \/>/g) || []).length !== 1) p.push('galeria montada 0 ou 2+ vezes')
  if (!src.includes("import HomeImageGallery from '@/components/home/HomeImageGallery'")) p.push('import da galeria ausente')
  if (!src.includes("import HomeAuthModal from '@/components/auth/HomeAuthModal'") || !/<HomeAuthModal signedIn=\{isSignedIn\} \/>/.test(src)) p.push('modal de login desmontado')
  if ((src.match(/KINEO-LOGIN-MODAL-1410/g) || []).length < 2) p.push('marcas KINEO-LOGIN-MODAL-1410 sumiram')
  if ((src.match(/data-auth-modal="login"/g) || []).length < 2) p.push('Log in (desktop+celular) sem data-auth-modal')
  if ((src.match(/data-auth-modal="signup"/g) || []).length < 2) p.push('Start free (desktop+celular) sem data-auth-modal')
  return p
}

// ─── componente da galeria ───────────────────────────────────────────────────
function galleryList(comp) {
  const body = comp.match(/export const HOME_GALLERY_IMAGES[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? ''
  return [...body.matchAll(/\{ file: '([^']+)', w: (\d+), h: (\d+), alt: '([^']*)' \}/g)].map((m) => ({ file: m[1], w: +m[2], h: +m[3], alt: m[4] }))
}
function componentProblems(comp) {
  const p = []
  if (!comp.includes(`export const HOME_GALLERY_DIR = '${GALLERY_DIR_URL}'`)) p.push('pasta da galeria não é /home-images/')
  if (!comp.includes('src={`${HOME_GALLERY_DIR}${img.file}`}')) p.push('src da imagem não sai da pasta permitida')
  if (/https?:\/\//.test(comp.replace(/\/\/.*$/gm, ''))) p.push('URL externa no componente')
  if (/^'use client'/m.test(comp)) p.push('galeria virou client component (sem necessidade)')
  return p
}

// WebP: lê a largura/altura do cabeçalho (VP8 com perdas, VP8L sem perdas ou VP8X estendido).
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
  if (kind === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 }
  return null
}
function fileProblems(list, readFile, listDir, sizeOf) {
  const p = []
  if (list.length < 10 || list.length > 15) p.push(`galeria com ${list.length} imagens (precisa 10–15)`)
  if (new Set(list.map((i) => i.file)).size !== list.length) p.push('imagem repetida na galeria')
  for (const img of list) {
    if (!/^[a-z0-9-]+\.webp$/.test(img.file)) { p.push(`${img.file}: nome/extensão fora do padrão`); continue }
    if (!PROVENANCE[img.file]) p.push(`${img.file}: sem procedência da casa registrada`)
    const bytes = sizeOf(img.file)
    if (bytes == null) { p.push(`${img.file}: arquivo ausente em ${GALLERY_DIR_FS}`); continue }
    if (bytes > MAX_BYTES) p.push(`${img.file}: ${bytes} B > 150 KB`)
    const dim = webpSize(readFile(img.file))
    if (!dim) p.push(`${img.file}: não é WebP`)
    else if (dim.w !== img.w || dim.h !== img.h) p.push(`${img.file}: declarado ${img.w}x${img.h}, arquivo ${dim.w}x${dim.h} (layout shift)`)
    if (img.w > 900 || img.w < 600) p.push(`${img.file}: largura ${img.w} fora de 600–900`)
    if (!img.alt || img.alt.length < 8) p.push(`${img.file}: sem alt descritivo`)
  }
  const onDisk = listDir()
  for (const f of onDisk) if (!list.some((i) => i.file === f)) p.push(`${f}: arquivo na pasta sem uso na galeria`)
  for (const f of Object.keys(PROVENANCE)) if (!list.some((i) => i.file === f)) p.push(`${f}: procedência sem imagem na galeria`)
  return p
}

// ─── render real ─────────────────────────────────────────────────────────────
// O render offline da home (scripts/preview-ux-complete.mjs) troca componentes filhos por stub; por isso a galeria é
// renderizada de verdade à parte (galleryRenderProblems) e o LUGAR dela na home é provado no fonte (sourceProblems).
function homeRenderProblems(html, signedIn) {
  const p = []
  for (const t of GONE_TEXT) if (html.includes(t)) p.push(`render ainda mostra "${t}"`)
  const more = html.indexOf('class="home-more-tools"')
  if (more < 0 || more > html.indexOf('class="home-proof"')) p.push('More tools sumiu ou desceu para depois da prova')
  const nav = html.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0] ?? ''
  const items = [...nav.matchAll(/data-nav-item="([^"]+)"/g)].map((m) => m[1])
  if (!signedIn && JSON.stringify(items) !== JSON.stringify(NAV_ITEMS)) p.push(`menu do topo mudou: ${JSON.stringify(items)}`)
  if (!signedIn) {
    if ((nav.match(/data-auth-modal="login"/g) || []).length < 2) p.push('menu sem Log in com data-auth-modal')
    if ((nav.match(/data-auth-modal="signup"/g) || []).length < 2) p.push('menu sem Start free com data-auth-modal')
  }
  return p
}
function galleryRenderProblems(block) {
  const p = []
  if (!block.includes('data-home-section="image-gallery"')) { p.push('galeria não renderiza'); return p }
  if (!block.includes('Made with Kineo Images · Nano Banana')) p.push('selo honesto da galeria ausente')
  const imgs = [...block.matchAll(/<img [^>]*>/g)].map((m) => m[0])
  if (imgs.length < 10 || imgs.length > 15) p.push(`render com ${imgs.length} imagens na galeria`)
  for (const tag of imgs) {
    const src = tag.match(/src="([^"]+)"/)?.[1] ?? ''
    if (!src.startsWith(GALLERY_DIR_URL) || src.includes('..') || !src.endsWith('.webp')) p.push(`imagem fora da pasta permitida: ${src}`)
    if (!/loading="lazy"/.test(tag)) p.push(`${src}: sem lazy`)
    if (!/width="\d+"/.test(tag) || !/height="\d+"/.test(tag)) p.push(`${src}: sem width/height`)
  }
  const links = [...block.matchAll(/<a [^>]*class="khg-item[^"]*"[^>]*>/g)].map((m) => m[0])
  if (links.length !== imgs.length || links.some((a) => !/href="\/images"/.test(a))) p.push('nem toda imagem leva a /images')
  if (/\b(client|customer|cliente)s?\b/i.test(block.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '))) p.push('galeria fala em cliente (alegação falsa)')
  return p
}

// ─── execução sobre a árvore real ────────────────────────────────────────────
console.log('KINEO-HOME-LIMPA-1410')
const LAND = rd('app/KineoLanding.tsx')
const COMP = rd('components/home/HomeImageGallery.tsx')
const LIST = galleryList(COMP)
const fsRead = (f) => readFileSync(join(RAIZ, GALLERY_DIR_FS, f))
const fsList = () => (existsSync(join(RAIZ, GALLERY_DIR_FS)) ? readdirSync(join(RAIZ, GALLERY_DIR_FS)) : [])
const fsSize = (f) => (existsSync(join(RAIZ, GALLERY_DIR_FS, f)) ? statSync(join(RAIZ, GALLERY_DIR_FS, f)).size : null)

let sp = sourceProblems(LAND); checa(`(1) fonte: 3 blocos fora, galeria dentro de More tools, modal de login intacto (${sp.join('; ') || 'ok'})`, sp.length === 0)
let cp = componentProblems(COMP); checa(`(3) componente: só a pasta /home-images/, sem URL externa (${cp.join('; ') || 'ok'})`, cp.length === 0)
let fp = fileProblems(LIST, fsRead, fsList, fsSize); checa(`(2)(3) arquivos: ${LIST.length} imagens locais, WebP ≤ 150 KB, dimensões batem, procedência da casa (${fp.join('; ') || 'ok'})`, fp.length === 0)

const HTML = {}
for (const signedIn of [false, true]) for (const clipsFirst of [false, true]) {
  const html = renderPage('app/KineoLanding.tsx', false, {}, { initialUser: signedIn ? { id: 'fixture' } : null, clipsFirst })
  HTML[`${signedIn}/${clipsFirst}`] = html
  const rp = homeRenderProblems(html, signedIn)
  checa(`(1)(4)(5) render da home signedIn=${signedIn} clipsFirst=${clipsFirst}: blocos fora, More tools antes da prova, menu igual, login em modal (${rp.join('; ') || 'ok'})`, rp.length === 0)
}
const GHTML = renderPage('components/home/HomeImageGallery.tsx', false, {}, {})
const gp = galleryRenderProblems(GHTML)
checa(`(2)(3) render da galeria: 10–15 <img> da pasta permitida, lazy, com width/height, todas para /images, selo honesto (${gp.join('; ') || 'ok'})`, gp.length === 0)

// ─── mutantes (cada um mostra o motivo do vermelho) ──────────────────────────
const H = HTML['false/false']
const mut = (label, problems) => checa(`(M) ${label} → vermelho [${problems.join('; ')}]`, problems.length > 0)
mut('M1 banner Business volta à home', sourceProblems(LAND.replace('<HomeAuthModal signedIn', '<AgencyVolumeBridge entry="home" />\n<HomeAuthModal signedIn')))
mut('M2 bloco "full toolkit" volta', sourceProblems(LAND.replace('<HomeImageGallery />', '<HomeImageGallery /><section className="home-create"><h2>Start with the full toolkit</h2></section>')))
mut('M3 seção de empresas volta (fonte)', sourceProblems(LAND.replace('<HomeImageGallery />', '<HomeImageGallery />{businessShowcase}')))
mut('M3b seção de empresas volta (render)', homeRenderProblems(H + '<section class="home-business-showcase"><h2>Videos for your business.</h2></section>', false))
mut('M4 imagem de fora da pasta permitida', galleryRenderProblems(GHTML.replace('src="/home-images/apple.webp"', 'src="https://example.com/x.webp"')))
mut('M5 galeria com 9 imagens', fileProblems(LIST.slice(0, 9), fsRead, () => LIST.slice(0, 9).map((i) => i.file), fsSize))
mut('M6 arquivo acima de 150 KB', fileProblems(LIST, fsRead, fsList, (f) => (f === 'apple.webp' ? 200 * 1024 : fsSize(f))))
mut('M7 item do menu do topo some', homeRenderProblems(H.replace('data-nav-item="pricing"', 'data-nav-item="x"'), false))
mut('M8 Log in perde o modal', homeRenderProblems(H.split('data-auth-modal="login"').join(''), false))
mut('M9 foto da galeria leva a outro lugar', galleryRenderProblems(GHTML.split('href="/images"').join('href="/pricing"')))
mut('M10 imagem sem procedência da casa', fileProblems([...LIST.slice(0, 13), { file: 'cliente.webp', w: 640, h: 1146, alt: 'customer upload photo' }], fsRead, fsList, fsSize))
mut('M11 galeria passa a alegar cliente', galleryRenderProblems(GHTML.replace('Made with Kineo Images', 'Our clients made this · Made with Kineo Images')))
mut('M12 galeria sai de More tools (fonte)', sourceProblems(LAND.replace('        <HomeImageGallery />', '').replace('<HomeAuthModal signedIn', '<HomeImageGallery />\n<HomeAuthModal signedIn')))
mut('M13 modal de login desmontado (fonte)', sourceProblems(LAND.replace('<HomeAuthModal signedIn={isSignedIn} />', '')))

console.log(`\n${okc} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
