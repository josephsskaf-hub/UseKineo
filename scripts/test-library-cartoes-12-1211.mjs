// KINEO-LIBRARY-CARTOES-12-1211 [CEO 12/11, medido no ar numa conta com 624 filmes: "1080p" 7,84 px · "✨ HD" 7,7 · "16h ago" 8,12 ·
// "Next episode →" e o motor 8,68 · "HD · 10 cr" 9,24 · "Full title" 10 · "Download MP4" 10,64 · "Original file" 11]: nenhum texto dos
// cartões da Library abaixo de 12 px (abas Videos, Ads, Clips, Images e Audio). A raiz do site é 14 px, então rem × 14 = px.
// Offline: lê TODO tamanho declarado nos arquivos que desenham os cartões — inclusive os selos e botões que só aparecem com certa
// condição (HD pronto, 4K, publicado, próximo episódio, falha) — e exige ≥ 12 px. A prova no navegador (cartão de cada tipo, 1440 e 375)
// está na entrega: div1-cartoes-*.png e o script cartoes-medir.js.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const RAIZ = 14
const CARTOES = ['app/(dashboard)/history/HistoryClient.tsx', 'app/(dashboard)/library/LibraryClient.tsx', 'components/video/FreeRedoFilmButton.tsx', 'components/DeliveryControls.tsx', 'components/FilmPreviewDialog.module.css']
const APPEARANCE = 'app/appearance.css'
const REGRAS_DO_CARTAO = /^\.(delivery-|library-organization)/ // as regras de appearance.css que vestem o cartão (o resto do arquivo é de outras telas)
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }

/** Todo tamanho de letra declarado, em px: CSS (px/rem), React (número, 'Npx', 'Nrem', 'Nem' de 1 nível), Tailwind (text-[Npx], text-xs). */
function tamanhos(s) {
  const out = []
  const add = (v, i, txt) => out.push({ px: Math.round(v * 100) / 100, linha: s.slice(0, i).split('\n').length, txt })
  for (const m of s.matchAll(/font-size:\s*(\d*\.?\d+)(px|rem)/g)) add(Number(m[1]) * (m[2] === 'rem' ? RAIZ : 1), m.index, m[0])
  for (const m of s.matchAll(/fontSize:\s*'(\d*\.?\d+)(px|rem|em)'/g)) add(Number(m[1]) * (m[2] === 'px' ? 1 : RAIZ), m.index, m[0])
  for (const m of s.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}\n])/g)) add(Number(m[1]), m.index, m[0])
  for (const m of s.matchAll(/\btext-\[(\d*\.?\d+)(px|rem)\]/g)) add(Number(m[1]) * (m[2] === 'rem' ? RAIZ : 1), m.index, m[0])
  for (const m of s.matchAll(/className[=:]\s*[{"'`][^\n]*?\btext-xs\b/g)) add(0.75 * RAIZ, m.index, 'text-xs')
  return out
}

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  let total = 0
  for (const f of CARTOES) {
    const t = tamanhos(src(f))
    total += t.length
    const peq = t.filter(x => x.px < 12).map(x => `${x.px}px (${x.txt}) na linha ${x.linha}`)
    ok(peq.length === 0, `${f}: texto do cartão abaixo de 12 px → ${peq.join(' | ')}`)
  }
  const regras = src(APPEARANCE).split('\n').filter(l => REGRAS_DO_CARTAO.test(l)).join('\n')
  ok(regras.split('\n').length >= 10, 'regras do cartão em appearance.css achadas')
  const peqCss = tamanhos(regras).filter(x => x.px < 12).map(x => `${x.px}px: ${regras.split('\n')[x.linha - 1].slice(0, 60)}`)
  ok(peqCss.length === 0, `appearance.css (cartão): abaixo de 12 px → ${peqCss.join(' | ')}`)
  ok(total > 80, `o guardião leu os tamanhos de verdade (${total})`)
  // As peças que o CEO mediu no ar, uma a uma, no arquivo que as desenha.
  const h = src('app/(dashboard)/history/HistoryClient.tsx')
  for (const [nome, marca] of [['HD · 10 cr', "'HD · 10 cr'"], ['Next episode →', "'Next episode →'"], ['✨ HD', '✨ HD'], ['Download MP4', 'Download MP4']]) ok(h.includes(marca), `peça medida no ar presente no arquivo: ${nome}`)
}

all()
const real = passed
const r = p => read(p)
const H = 'app/(dashboard)/history/HistoryClient.tsx'
const mutants = [
  ['selo 1080p volta a 0.56rem (7,84 px)', H, r(H).replace(/fontSize: '12px'/, "fontSize: '0.56rem'")],
  ['text-xs volta no cartão (10,5 px)', H, r(H).replace('text-[12px]', 'text-xs')],
  ['"Full title" volta a 10 px', APPEARANCE, r(APPEARANCE).replace('.delivery-title small{display:block;font-size:12px', '.delivery-title small{display:block;font-size:10px')],
  ['"Original file" volta a 11 px', APPEARANCE, r(APPEARANCE).replace('border-radius:7px;font-size:12px', 'border-radius:7px;font-size:11px')],
  ['metadados do preview voltam a 11 px', 'components/FilmPreviewDialog.module.css', r('components/FilmPreviewDialog.module.css').replace('.metadata{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:12px', '.metadata{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:11px')],
  ['botão "refazer grátis" volta a 0.64rem', 'components/video/FreeRedoFilmButton.tsx', r('components/video/FreeRedoFilmButton.tsx').replace("fontSize: '12px'", "fontSize: '0.64rem'")],
]
let bitten = 0
for (const [name, f, v] of mutants) {
  if (v === r(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all({ [f]: v }) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-library-cartoes-12-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
