// KINEO-ABAS-PALCO-2026-10-01 — guardião do formato do Studio estendido às abas Imagens, Espaços e Ads.
// Fundador (01/10): "gostei tanto… queria estender para todas as outras abas — Imagens, Espaços e Ads — no mesmo formato".
// Prova: (1) a peça compartilhada (components/ProductStage.tsx) pinta a tela e a barra lateral pela cor do produto e
// devolve tudo ao normal ao sair; (2) cada aba usa a sua cor, tem o quadro de engenharia ANTES do palco dentro da grade e
// a reta da casa embaixo; (3) toda peça da casa existe em public/ e leva o selo do motor real; (4) a vitrine do Espaços não
// usa marca de terceiros (o café de 30/09 tinha logo de rede); (5) mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const STAGE = read('components/ProductStage.tsx')
const PAGES = {
  images: { file: 'app/(dashboard)/images/ImagesClient.tsx' },
  spaces: { file: 'app/(dashboard)/spaces/SpacesClient.tsx' },
  ads: { file: 'app/(dashboard)/ads/v2/AdsV2Client.tsx' },
}
for (const p of Object.values(PAGES)) p.src = read(p.file)

function stageProblems(src) {
  const p = []
  for (const k of ['images', 'spaces', 'ads']) if (!new RegExp(`\\n  ${k}: \\['#[0-9A-F]{6}', '#[0-9A-F]{6}'\\],`).test(src)) p.push(`produto ${k} sem cor`)
  if (!/root\.dataset\.studioStage = key\n\s+return \(\) => \{ delete root\.dataset\.studioStage \}/.test(src)) p.push('a cor não entra/sai com a tela')
  if (!/main:has\(\.kps-page\)\{background:[^}]*var\(--stage-a\)/.test(src)) p.push('a tela não ganha a cor do produto')
  if (!/html\[data-studio-stage\] aside:has\(>nav\[data-nav-surface=sidebar\]\)\{--sidebar-bg:[^;]*var\(--stage-a\)[^;]*#06080d;/.test(src)) p.push('barra lateral sem a cor do produto')
  if (!/\.kps-stage\{position:sticky;top:16px;align-self:start;min-width:0;height:clamp\(460px,calc\(100svh - 280px\),820px\);/.test(src)) p.push('palco sem a altura da tela')
  if (!/<span className="kps-badge"><UiLabel>Made with<\/UiLabel> \{v\.badge\}<\/span>/.test(src)) p.push('palco sem o selo do motor real')
  return p
}
function pageProblems(key, src) {
  const p = []
  if (!/from '@\/components\/ProductStage'/.test(src)) p.push('não usa a peça compartilhada')
  if (!src.includes(`useProductStage('${key}')`)) p.push(`não pinta a tela com a cor de ${key}`)
  if (!/className="[^"]*\bkps-page\b[^"]*"/.test(src) || !src.includes('<ProductStageStyles />')) p.push('raiz fora do formato')
  const grid = src.indexOf('<div className="kps-grid">')
  const panel = src.indexOf('<div className="kps-panel">', grid)
  const stage = src.indexOf('<ProductStage ', panel)
  const row = src.indexOf('<ProductRow ', stage)
  if (!(grid > 0 && panel > grid && stage > panel && row > stage)) p.push('ordem errada: grade → quadro de engenharia → palco → reta')
  return p
}

const sp = stageProblems(STAGE)
ok(sp.length === 0, `(1) peça compartilhada: cor do produto na tela, na barra lateral e no palco (${sp.join('; ') || 'ok'})`)
for (const [key, p] of Object.entries(PAGES)) {
  const pp = pageProblems(key, p.src)
  ok(pp.length === 0, `(2) ${key}: quadro de engenharia + palco + reta, cor própria (${pp.join('; ') || 'ok'})`)
}

// (3) peças da casa: arquivos existem e o selo é o motor real
const media = [STAGE, PAGES.images.src, PAGES.spaces.src].flatMap((s) => [...s.matchAll(/(?:video|poster|before|after): '\/((?:previews|posters)\/[^']+)'/g)].map((m) => m[1]))
const missing = media.filter((m) => !fs.existsSync(path.join(ROOT, 'public', m)))
ok(media.length >= 18 && missing.length === 0, `(3) mídia da casa presente (${media.length} arquivos, faltando: ${missing.join(', ') || 'nenhum'})`)
ok((PAGES.images.src.match(/badge: 'Nano Banana Pro', video: '\/previews\/promo-images-/g) || []).length === 3, '(3b) imagens da casa com o selo Nano Banana Pro')
ok((STAGE.match(/badge: 'Nano Banana Pro \+ Kling 2\.5', video: '\/previews\/promo-ads-3var-/g) || []).length === 3, '(3c) anúncios da casa com o selo Nano Banana Pro + Kling 2.5')

// (4) Espaços: vitrine sem marca de terceiros e sem o café de 30/09
const house = PAGES.spaces.src.slice(PAGES.spaces.src.indexOf('const HOUSE_SPACES'), PAGES.spaces.src.indexOf(']\n', PAGES.spaces.src.indexOf('const HOUSE_SPACES')))
ok(house.length > 100 && !/starbucks|burger|mcdonald|nike|adidas|espaco-cafe/i.test(house) && new Set(house.match(/spaces-demo-\d-(antes|depois)\.webp/g) || []).size === 6, '(4) vitrine do Espaços: 3 pares antes→depois próprios, sem marca de terceiros')

// (5) mutantes
ok(pageProblems('images', PAGES.images.src.replace("useProductStage('images')", '')).length > 0, '(M1) Imagens sem a cor → vermelho')
ok(pageProblems('spaces', PAGES.spaces.src.replace('<div className="kps-panel">', '<div className="x">')).length > 0, '(M2) Espaços sem o quadro de engenharia → vermelho')
ok(pageProblems('ads', PAGES.ads.src.replace(/<ProductRow [^\n]*\n/, '')).length > 0, '(M3) Ads sem a reta da casa → vermelho')
ok(stageProblems(STAGE.replace('return () => { delete root.dataset.studioStage }', 'return () => {}')).length > 0, '(M4) cor que não sai com a tela → vermelho')
ok(stageProblems(STAGE.replace("  spaces: ['#C2410C', '#E9B872'],\n", '')).length > 0, '(M5) produto sem cor → vermelho')

{
  const bad = PAGES.spaces.src.replace("{ title: 'Empty floor → coffee shop'", "{ title: 'Empty floor → Starbucks'")
  const h = bad.slice(bad.indexOf('const HOUSE_SPACES'), bad.indexOf(']\n', bad.indexOf('const HOUSE_SPACES')))
  ok(/starbucks/i.test(h), '(M6) vitrine com marca de terceiros → o filtro do (4) acende')
}
console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
