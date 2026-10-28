// KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — guardião da galeria "Made with Kineo" cheia (fundador 28/10, olhando o
// /made-with-kineo no ar). Prova: (A) tudo aparece de cara — nenhum "See more" que revela cartão escondido; os links (/clips,
// /images, /examples) ficam só no fim, como fileira; (B) a última fileira nunca fica pela metade: para qualquer quantidade de cartões
// e qualquer largura (2→6 colunas), os enchimentos visíveis (repetidos do COMEÇO do filtro atual) fecham a fileira — conferido com um
// mini avaliador do CSS gerado; a régua de colunas é a MESMA do CSS da grade; (C) peso: vídeo só nasce na tela (WallMedia) e pôster
// com loading="lazy"; enchimento fora do leitor de tela e do Tab; (D) nenhum filme com "usekineo.com/free" gravado na vitrine — os 5
// que o fundador viu e os outros 11 conferidos quadro a quadro em 28/10; tipo sem cartão não vira filtro vazio; (E) desfeita esta
// camada, os 3 arquivos voltam BYTE A BYTE ao commit anterior e toda linha nova leva a marca; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-galeria-cheia-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { semGaleriaCheia2810, BASE, MARCA, ARQUIVOS } from './test-support/desfaz-galeria-cheia-2810.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const base = (rel) => lf(execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 26 }))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const F = { gal: 'lib/homeGaleria.ts', items: 'lib/homeGaleriaItems.ts', comp: 'components/KineoHouseGallery.tsx' }

function galeria(src) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(out, { module: mod, exports: mod.exports, URLSearchParams })
  return mod.exports
}

/** Mini avaliador de CSS: quantos enchimentos ficam visíveis na largura `w` (regras na ordem, especificidade = nº de classes). */
function visiveis(css, enche, w) {
  const regras = []
  const re = /@media\(min-width:(\d+)px\)\{((?:[^{}]*\{[^{}]*\})*)\}|([^{}@]+)\{([^{}]*)\}/g
  for (const m of css.matchAll(re)) {
    if (m[1]) { for (const r of m[2].matchAll(/([^{}]+)\{([^{}]*)\}/g)) regras.push({ min: +m[1], sel: r[1], decl: r[2] }) }
    else regras.push({ min: 0, sel: m[3], decl: m[4] })
  }
  return enche.filter((e) => {
    const cls = new Set(['mwk-cell', 'mwk-fill', ...e.cols.map((c) => `mwk-f${c}`)])
    let melhor = { esp: -1, ordem: -1, display: 'block' }
    regras.forEach((r, ordem) => {
      if (w < r.min) return
      const d = /display:(\w+)/.exec(r.decl)?.[1]
      if (!d) return
      for (const sel of r.sel.split(',')) {
        const classes = sel.trim().split('.').filter(Boolean)
        if (!classes.every((c) => cls.has(c))) continue
        if (classes.length > melhor.esp || (classes.length === melhor.esp && ordem >= melhor.ordem)) melhor = { esp: classes.length, ordem, display: d }
      }
    })
    return melhor.display !== 'none'
  }).length
}

function checa(src) {
  const e = []
  let g
  try { g = galeria(src.gal) } catch (err) { return ['homeGaleria não carrega: ' + err.message] }
  const comp = src.comp
  // (A) tudo de cara
  if (/GALERIA_PAGE_SIZE|setShown|data-galeria-more|list\.slice\(/.test(comp)) e.push('a grade ainda pagina ("See more"/slice)')
  if (/<button[^>]*>\s*<UiLabel>See more<\/UiLabel>/.test(comp)) e.push('botão "See more" de volta')
  const more = comp.slice(comp.indexOf('<div className="mwk-more">'))
  if (!['/clips', '/images', '/examples'].every((h) => more.includes(`<Link href="${h}"`)) || /left > 0|\? \(/.test(more.slice(0, 400))) e.push('links do fim não ficam sempre visíveis como fileira')
  if (!/\[\.\.\.list\.map\(\(it\) => \(\{ it, fill: null as number\[\] \| null \}\)\), \.\.\.enche\.map\(\(e\) => \(\{ it: list\[e\.idx\], fill: e\.cols \}\)\)\]/.test(comp)) e.push('a grade não desenha TODA a lista + os enchimentos')
  // (B) fileira cheia em toda largura
  const cols = g.GALERIA_COLUNAS ?? []
  const css = typeof g.galeriaPreenchimentoCss === 'function' ? g.galeriaPreenchimentoCss() : ''
  let ruim = null
  for (let n = 0; n <= 60 && !ruim; n++) {
    const enche = g.galeriaPreenchimento(n)
    if (enche.some((x, i) => x.idx !== i % Math.max(1, n))) ruim = `n=${n}: enchimento não repete do começo`
    for (const { min, cols: c } of cols) {
      const vis = visiveis(css, enche, min + 1)
      if (n > 0 && (n + vis) % c !== 0) { ruim = `n=${n}, ${c} colunas: ${vis} enchimento(s) visível(is), fileira incompleta`; break }
      if (n > 0 && vis >= c) { ruim = `n=${n}, ${c} colunas: fileira inteira só de repetidos`; break }
    }
  }
  if (ruim) e.push(ruim)
  if (g.galeriaPreenchimento(0).length !== 0) e.push('lista vazia ganha enchimento')
  // a régua de colunas é a do CSS da grade
  const gridCss = [...comp.matchAll(/^@media\(min-width:(\d+)px\)\{.*?\.mwk-grid\{grid-template-columns:repeat\((\d+)/gm)].map((m) => ({ min: +m[1], cols: +m[2] }))
  const base2 = /\.mwk-grid\{display:grid;grid-template-columns:repeat\((\d+)/.exec(comp)
  if (JSON.stringify([{ min: 0, cols: base2 ? +base2[1] : -1 }, ...gridCss]) !== JSON.stringify(cols)) e.push('GALERIA_COLUNAS ≠ colunas do CSS da grade')
  if (!comp.includes('__html: CSS + galeriaPreenchimentoCss()')) e.push('CSS dos enchimentos não chega à página')
  // (C) peso e acessibilidade
  if (!comp.includes('<WallMedia src={it.video} />') || !comp.includes('<img src={it.poster} alt="" width={540} height={960} loading="lazy"')) e.push('vídeo/pôster perderam o carregamento preguiçoso')
  if (!comp.includes('aria-hidden={fill ? true : undefined}') || (comp.match(/tabIndex=\{fill \? -1 : undefined\}/g) ?? []).length < 1) e.push('enchimento visível ao leitor de tela / ao Tab')
  // (D) filmes com marca
  const COM_MARCA = ['4b12925e-16e6-4b56-af5a-7047f9ae7a28', 'f3de57b0-3486-4400-ba72-c9390774d426', 'c1f80b50-1de6-4140-9ce4-b4cfbeb185c3', 'b8c50f61-2843-41f3-a803-ac5a4bb509f5', '16742e11-a2fc-4e0a-a49a-2862e0ee36b0']
  for (const id of COM_MARCA) if (!g.GALERIA_FILMES_COM_MARCA?.includes(id)) e.push(`filme com usekineo.com/free fora da exclusão: ${id.slice(0, 8)}`)
  if (!(g.GALERIA_FILM_IDS ?? []).every((id) => g.GALERIA_FILMES_COM_MARCA.includes(id))) e.push('filme da lista sem conferência de marca (conferir o quadro e incluir/limpar)')
  if (!/return GALERIA_FILM_IDS\.filter\(\(id\) => !GALERIA_FILMES_COM_MARCA\.includes\(id\)\)\.flatMap/.test(src.items)) e.push('cartões de filme não passam pela exclusão da marca')
  if (!/const filtros = GALERIA_FILTERS\.filter\(\(f\) => f\.key === 'all' \|\| items\.some\(\(i\) => i\.kind === f\.key\)\)/.test(comp) || !comp.includes('{filtros.map((f) => (')) e.push('tipo sem cartão vira filtro vazio')
  return e
}

console.log('KINEO-GALERIA-CHEIA-2810 — Made with Kineo cheio e sem marca')
const SRC = { gal: rd(F.gal), items: rd(F.items), comp: rd(F.comp) }
const erros = checa(SRC)
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `A-D galeria cheia, sem paginação, sem filme marcado (${erros.length} erro[s])`)

// (E) camada exata e marca em toda linha nova
const difs = []
for (const rel of ARQUIVOS) {
  let volta
  try { volta = lf(semGaleriaCheia2810(rd(rel), rel)) } catch (err) { difs.push(rel + ': ' + err.message); continue }
  const b = base(rel)
  if (volta !== b) difs.push(rel + ': desfeito ≠ base')
  const bs = new Set(b.split('\n'))
  const solta = rd(rel).split('\n').find((l) => !bs.has(l) && !l.includes(MARCA))
  if (solta) difs.push(rel + ': linha nova sem a marca: ' + solta.slice(0, 70))
}
ok(difs.length === 0, `E camada exata nos ${ARQUIVOS.length} arquivos, toda linha nova marcada${difs.length ? ' — ' + difs.join(' | ') : ''}`)

// (M) mutantes
const mut = (nome, k, de, para) => { const s = SRC[k].replace(de, para); ok(s !== SRC[k] && checa({ ...SRC, [k]: s }).length > 0, `M ${nome}: vermelho`) }
mut('enchimento sem o % final (fileira cheia ganha mais uma)', 'gal', 'const falta = (c: number) => (c - (n % c)) % c', 'const falta = (c: number) => (c - (n % c))')
mut('enchimento repete do fim', 'gal', 'idx: i % n,', 'idx: n - 1 - (i % n),')
mut('CSS sem esconder as outras colunas', 'gal', ".join(',') + `{display:none}", ".join(',') + `{opacity:1}")
mut('filme marcado volta', 'items', 'GALERIA_FILM_IDS.filter((id) => !GALERIA_FILMES_COM_MARCA.includes(id)).flatMap', 'GALERIA_FILM_IDS.flatMap')
mut('Maracaibo sai da exclusão', 'gal', "  '4b12925e-16e6-4b56-af5a-7047f9ae7a28', ", '  ')
mut('grade volta a paginar', 'comp', '{[...list.map((it) =>', '{[...list.slice(0, 20).map((it) =>')
mut('enchimento no leitor de tela', 'comp', 'aria-hidden={fill ? true : undefined}', 'aria-hidden={undefined}')
mut('pôster sem preguiça', 'comp', 'height={960} loading="lazy"', 'height={960} loading="eager"')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
