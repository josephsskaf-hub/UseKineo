// KINEO-HOME-CLIPES-NOVOS-2810 — guardião da faixa de Clipes da home com os 8 clipes novos de 27/10.
// Fundador 27/10: "colocar os clipes novos na parte inicial". Prova: (A) a faixa lista os 8 clipes, na ordem pedida, vindos de
// lib/homeGaleria.ts (nada duplicado), com prévia e pôster no disco; (B) o cachorro com celular (defeito) nunca entra; (C) o clique
// abre o /clips preenchido (?engine= &prompt=, visitante passa pelo cadastro); (D) o cartão, a grade e o CSS são os de antes —
// desfazendo esta camada a fonte volta BYTE A BYTE à base, e toda linha nova leva a marca; (E) a camada está ligada PRIMEIRO no
// guardião que confere a faixa byte a byte; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-home-clipes-novos-2810.mjs
import { semRostoCards2810 } from './test-support/desfaz-rosto-cards-2810.mjs' // KINEO-ROSTO-NO-CLIPE-2810 — as entregas de 28/10 (rosto no clipe, cards, elenco, galeria cheia, menu) saem em memória ANTES de todas as camadas
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  semHomeClipesNovos2810, HOME_CLIPES_NOVOS_2810_BASE, HOME_CLIPES_NOVOS_2810_MARCA, HOME_CLIPES_NOVOS_2810_ARQUIVOS, HOME_CLIPES_NOVOS_2810_NOVOS,
} from './test-support/desfaz-home-clipes-novos-2810.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const MARCA = 'KINEO-HOME-CLIPES-NOVOS-2810'
const STRIP = 'components/home/HomeClipsStrip.tsx'
const ORDEM = ['lion', 'cake-kitten', 'pebble-castle', 'knight-cat', 'werewolf', 'capybara', 'wizard-cat', 'kungfu-cat']
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(semRostoCards2810(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))
const base = (rel) => lf(execFileSync('git', ['-C', ROOT, 'show', `${HOME_CLIPES_NOVOS_2810_BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 26 }))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function galeria(src) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(out, { module: mod, exports: mod.exports, URLSearchParams })
  return mod.exports
}

/** Todas as provas sobre uma fonte da faixa; devolve a lista de erros (vazia = verde). */
function checa(strip, gal) {
  const e = []
  const ids = /export const HOME_NEW_CLIP_IDS: readonly string\[\] = \[([^\]]*)\]/.exec(strip)
  const lista = ids ? [...ids[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : null
  if (!lista) return ['HOME_NEW_CLIP_IDS ausente']
  if (JSON.stringify(lista) !== JSON.stringify(ORDEM)) e.push(`ordem ≠ pedida: ${lista.join(', ')}`)
  if (/dog[_-]?phone/i.test(strip)) e.push('dog_phone citado na faixa')
  if (!gal.GALERIA_EXCLUDED?.includes('dog_phone')) e.push('GALERIA_EXCLUDED perdeu o dog_phone')
  if (!/HOME_NEW_CLIP_IDS\.filter\(\(id\) => !GALERIA_EXCLUDED\.includes\(id\)\)\.flatMap\(\(id\) => GALERIA_NEW_CLIPS\.filter\(\(c\) => c\.id === id\)\)/.test(strip)) e.push('a lista não passa pelo filtro de excluídos / não vem da galeria')
  if (!/^import \{ GALERIA_EXCLUDED, GALERIA_NEW_CLIPS, viaSignup \} from '@\/lib\/homeGaleria'/m.test(strip)) e.push('dados não vêm de lib/homeGaleria')
  for (const id of lista) {
    const c = gal.GALERIA_NEW_CLIPS?.find((x) => x.id === id)
    if (!c) { e.push(`${id} não existe em GALERIA_NEW_CLIPS`); continue }
    if (c.engine !== 'hollywood') e.push(`${id}: motor ${c.engine} (selo esperado Kling 3)`)
    for (const p of [c.video, c.poster]) if (!fs.existsSync(path.join(ROOT, 'public', p))) e.push(`${id}: sem arquivo ${p}`)
    if (!c.prompt || c.prompt.length < 40) e.push(`${id}: sem prompt para preencher o /clips`)
  }
  // a faixa nova abre a grade; a antiga só volta se a lista nova sumir
  const grid = strip.indexOf('<div className="kcs-grid">')
  const novo = strip.indexOf('{HOME_NEW_CLIPS.map((c) => (')
  if (grid < 0 || novo < 0 || strip.slice(grid, novo).split('\n').length !== 2) e.push('os clipes novos não abrem a grade')
  for (const velho of ['trends.map((tr) => {', 'cards.map((c) => (', 'textClips.map((c) => (']) {
    if (!strip.includes(`{HOME_NEW_CLIPS.length === 0 && ${velho}`)) e.push(`bloco antigo desenhado junto: ${velho}`)
  }
  if (!strip.includes(`href={viaSignup('/clips?' + new URLSearchParams({ engine: c.engine, prompt: c.prompt }).toString(), signedIn)}`)) e.push('clique não abre o /clips preenchido')
  if (!strip.includes('className="kcs-card" data-clip-new={c.id}')) e.push('cartão novo não usa o cartão da faixa (kcs-card)')
  if (!strip.includes('<span className="kcs-copy"><i>{CLIP_ENGINES[c.engine].label}</i><b><UiLabel>{c.title}</UiLabel></b></span>')) e.push('selo/título fora do padrão do cartão')
  if (/\bcr\b|credits?/i.test(strip.split('\n').filter((l) => l.includes(MARCA)).join('\n'))) e.push('preço/crédito no cartão')
  // layout: o CSS e todo o resto voltam byte a byte
  const css = (s) => { const i = s.indexOf('const CSS = `'); return s.slice(i, s.indexOf('`\n', i + 14)) }
  const b = base(STRIP)
  if (css(strip) !== css(b)) e.push('CSS da faixa mudou')
  let volta
  try { volta = semHomeClipesNovos2810(strip, STRIP) } catch (err) { return [...e, `desfaz: ${err.message}`] }
  if (lf(volta) !== b) e.push('desfeito ≠ base')
  try { if (lf(semHomeClipesNovos2810(strip.replace(/\n/g, '\r\n'), STRIP)) !== b) e.push('desfeito com CRLF ≠ base') } catch (err) { e.push(`desfaz CRLF: ${err.message}`) }
  const bs = new Set(b.split('\n'))
  const soltas = strip.split('\n').filter((l) => !bs.has(l) && !l.includes(MARCA))
  if (soltas.length) e.push(`linha nova sem a marca: ${soltas[0].slice(0, 80)}`)
  return e
}

console.log('KINEO-HOME-CLIPES-NOVOS-2810 — faixa de Clipes da home')
const STRIP_SRC = rd(STRIP)
const GAL = galeria(rd('lib/homeGaleria.ts'))
const erros = checa(STRIP_SRC, GAL)
ok(erros.length === 0, `A-D faixa com os 8 clipes novos, na ordem, sem dog_phone, /clips preenchido, layout intacto${erros.length ? ' — ' + erros.join(' | ') : ''}`)

// E. camada e ligação
ok(HOME_CLIPES_NOVOS_2810_MARCA === MARCA && HOME_CLIPES_NOVOS_2810_ARQUIVOS.join() === STRIP, 'E1 a camada cobre só a faixa e usa a marca desta entrega')
ok(HOME_CLIPES_NOVOS_2810_NOVOS.every((n) => fs.existsSync(path.join(ROOT, n))), 'E2 arquivos novos presentes')
const remodela = rd('scripts/test-home-remodela-2010.mjs')
ok(/const rd = \(rel\) => lf\(affiliateRaw\(rel, semGaleriaHome2710\(semHomeClipesNovos2810\((?:semRostoCards2810\()?fs\.readFileSync/.test(remodela), 'E3 test-home-remodela-2010 desfaz esta camada PRIMEIRO ao ler a faixa')
ok(rd('lib/engineWall.ts') === base('lib/engineWall.ts') && rd('app/KineoLanding.tsx') === base('app/KineoLanding.tsx'), 'E4 curadoria dos cards (engineWall) e a home/menu (KineoLanding) intocados')

// M. mutantes
const mut = (nome, de, para, src = STRIP_SRC, gal = GAL) => {
  const s = src.replace(de, para)
  ok(s !== src && checa(s, gal).length > 0, `M ${nome}: vermelho`)
}
mut('ordem trocada', "['lion', 'cake-kitten'", "['cake-kitten', 'lion'")
mut('dog_phone na lista', "'kungfu-cat']", "'kungfu-cat', 'dog_phone']")
mut('sem o filtro de excluídos', '.filter((id) => !GALERIA_EXCLUDED.includes(id))', '')
mut('faixa antiga desenhada junto', '{HOME_NEW_CLIPS.length === 0 && cards.map', '{cards.map')
mut('CSS mexido', 'gap:18px}', 'gap:20px}')
mut('clique sem a ideia', 'prompt: c.prompt ', '')
mut('linha nova sem marca', '        <div className="kcs-grid">\n', '        <div className="kcs-grid">\n          {null}\n')
ok(checa(STRIP_SRC, { ...GAL, GALERIA_EXCLUDED: [] }).length > 0, 'M galeria sem o dog_phone excluído: vermelho')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
