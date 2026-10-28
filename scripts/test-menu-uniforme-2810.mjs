// KINEO-MENU-UNIFORME-2810 — guardião do menu do topo uniforme (fundador 28/10: "os itens do menu têm de ser IGUAIS, só o nome").
// Prova: (A) home (app/kineoLandingTheme.ts): "Make a film" e "Product ads" (.nav-primary) sem a barra azul (::after some, também no
// tema claro) e com o MESMO peso dos outros itens (550); a seta do menu suspenso continua no componente; (B) cabeçalho claro
// (/made-with-kineo, /examples, /trending — app/examples/ExamplesGallery.module.css): todo link do topo, inclusive o da página atual,
// com a cor do cabeçalho (--public-nav-text) e o mesmo peso — sem o cinza #cbd0d6 e sem o azul do aria-current; (C) o menu do celular
// da home não tem item diferenciado; (D) desfeita a camada, os 2 arquivos voltam BYTE A BYTE ao commit anterior e toda linha nova
// leva a marca; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-menu-uniforme-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { semMenuUniforme2810, BASE, MARCA, ARQUIVOS } from './test-support/desfaz-menu-uniforme-2810.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const base = (rel) => lf(execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 26 }))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const THEME = 'app/kineoLandingTheme.ts'
const CSS = 'app/examples/ExamplesGallery.module.css'

/** A última regra que casa o seletor exato e a declaração pedida (a cascata: a última vence). */
const ultima = (src, sel, prop) => {
  let val = null
  for (const m of src.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!m[1].split(',').map((x) => x.replace(/\/\*[\s\S]*?\*\//g, '').trim()).includes(sel)) continue
    const d = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(m[2])
    if (d) val = d[1].trim()
  }
  return val
}

function checa(theme, css) {
  const e = []
  // (A) home
  if (!/^none$/.test(ultima(theme, '.klp .nav-links .nav-primary::after', 'content') ?? '')) e.push('home: barra azul do .nav-primary ainda aparece')
  if (!/^none$/.test(ultima(theme, 'html:not([data-theme=dark]) .klp .nav-links .nav-primary::after', 'content') ?? '')) e.push('home (tema claro): barra azul ainda aparece')
  const pesoPrim = ultima(theme, '.klp .nav-links .nav-primary', 'font-weight')
  if (pesoPrim !== '550') e.push(`home: peso do .nav-primary = ${pesoPrim} (os outros itens são 550)`)
  if (!rd('components/PublicNavDropdown.tsx').includes('<span className="nd-car" aria-hidden="true">▾</span>')) e.push('a seta do menu suspenso sumiu')
  // (B) cabeçalho claro
  for (const sel of ['.pageHeader .nav a', '.pageHeader .nav a[aria-current=page]', '.pageHeader .nav .navPrimary', '.pageHeader .nav a:hover']) {
    if (ultima(css, sel, 'color') !== 'var(--public-nav-text)') e.push(`cabeçalho claro: ${sel} sem a cor do cabeçalho`)
    if (ultima(css, sel, 'font-weight') !== '550') e.push(`cabeçalho claro: ${sel} com peso diferente`)
  }
  // a regra uniforme vem DEPOIS do cinza/azul antigos (mesma especificidade não perde para elas)
  const iUni = css.lastIndexOf('.pageHeader .nav a,.pageHeader .nav a:hover,.pageHeader .nav a[aria-current=page]')
  if (iUni < 0 || iUni < css.lastIndexOf('.pageHeader .nav{justify-content:center;color:#cbd0d6}')) e.push('cabeçalho claro: a regra uniforme não vence o cinza antigo')
  return e
}

console.log('KINEO-MENU-UNIFORME-2810 — menu do topo igual, só o nome')
const T = rd(THEME)
const C = rd(CSS)
const erros = checa(T, C)
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `A-B home e cabeçalho claro uniformes (${erros.length} erro[s])`)
// (C) menu do celular da home: nenhum item com classe própria
const landing = rd('app/KineoLanding.tsx')
const mob = landing.slice(landing.indexOf('id="mobile-nav-menu"'), landing.indexOf('</label>', landing.indexOf('id="mobile-nav-menu"')))
ok(mob.length > 0 && !/nav-primary|aria-current/.test(mob), 'C menu do celular da home sem item diferenciado')
// (D) camada exata
const difs = []
for (const rel of ARQUIVOS) {
  let volta
  try { volta = lf(semMenuUniforme2810(rd(rel), rel)) } catch (err) { difs.push(rel + ': ' + err.message); continue }
  const b = base(rel)
  if (volta !== b) difs.push(rel + ': desfeito ≠ base')
  const bs = new Set(b.split('\n'))
  const solta = rd(rel).split('\n').find((l) => !bs.has(l) && !l.includes(MARCA))
  if (solta) difs.push(rel + ': linha nova sem a marca: ' + solta.slice(0, 70))
}
ok(difs.length === 0, `D camada exata nos ${ARQUIVOS.length} arquivos, toda linha nova marcada${difs.length ? ' — ' + difs.join(' | ') : ''}`)
// (M) mutantes
const mut = (nome, k, de, para) => { const t = k === 'T' ? T.replace(de, para) : T; const c = k === 'C' ? C.replace(de, para) : C; ok((t !== T || c !== C) && checa(t, c).length > 0, `M ${nome}: vermelho`) }
mut('barra azul volta', 'T', '.klp .nav-links .nav-primary::after, html:not([data-theme=dark]) .klp .nav-links .nav-primary::after { content:none; display:none; }', '')
mut('peso extra volta', 'T', '.klp .nav-links .nav-primary { font-weight:550; }', '.klp .nav-links .nav-primary { font-weight:650; }')
mut('página atual em azul', 'C', ',.pageHeader .nav a[aria-current=page],', ',')
mut('itens cinza', 'C', '.pageHeader .nav a,.pageHeader .nav a:hover,', '.pageHeader .nav a:hover,')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
