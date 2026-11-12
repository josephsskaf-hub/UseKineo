// KINEO-LETRA-12-1111 [CEO 11/11, pedido do fundador "design mais bonito"]: nenhum texto da home abaixo de 12 px, e a frase do
// cartão grande legível sobre foto clara. Offline: lê o CSS e os estilos de todos os arquivos que desenham a home (inclusive o rodapé
// e as faixas por cima), acha todo tamanho de letra e exige ≥ 12 px; confere o degradê atrás do texto dos cartões grandes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const HOME = [
  'app/KineoLanding.tsx', 'components/home/ClipsFirstHome.tsx', 'components/home/HomeClipsStrip.tsx', 'components/home/HomeImageGallery.tsx',
  'components/home/HomeMosaic.tsx', 'components/home/HomeNewEffects.tsx', 'components/home/HomeThreeCards.tsx', 'components/home/HomeTwoDoors.tsx',
  'components/home/HomePortasCelular.tsx', 'lib/ui/homeKidsCard.ts', 'lib/ui/homePresentation.ts', 'components/Footer.tsx',
]
const CARDS = 'components/home/HomeThreeCards.tsx'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }

/** Todo tamanho de letra em px de um arquivo: CSS (font-size:Npx) e estilo do React (fontSize: N | 'Npx'). */
function tamanhos(src) {
  const out = []
  for (const m of src.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) out.push([Number(m[1]), m.index])
  for (const m of src.matchAll(/fontSize:\s*'(\d+(?:\.\d+)?)px'/g)) out.push([Number(m[1]), m.index])
  for (const m of src.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}\n])/g)) out.push([Number(m[1]), m.index])
  return out
}

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  let total = 0
  for (const f of HOME) {
    const s = src(f)
    const t = tamanhos(s)
    total += t.length
    const pequenos = t.filter(([v]) => v < 12).map(([v, i]) => `${v}px na linha ${s.slice(0, i).split('\n').length}`)
    ok(pequenos.length === 0, `${f}: texto abaixo de 12 px → ${pequenos.join(', ')}`)
  }
  ok(total > 100, `o guardião leu os tamanhos de verdade (${total})`)
  // As etiquetas de altura fixa cresceram junto (letra de 12 px não pode estourar a pílula).
  const land = src('app/KineoLanding.tsx')
  ok(land.includes('.klp .nav-links a .badge{height:18px;font-size:12px;'), 'selo do menu: 18 px de altura para a letra de 12')
  ok(/\.klp \.badge\{[^}]*height:22px;font-size:12px;/.test(land), 'selo da home: 22 px de altura para a letra de 12')
  // A frase do cartão grande sobre foto clara: degradê forte no terço de baixo, texto branco com sombra firme.
  const c = src(CARDS)
  const shade = c.match(/\.k3c-shade\{[^}]*linear-gradient\(([^}]*)\)\}/)
  ok(shade, 'degradê dos cartões grandes encontrado')
  const paradas = [...shade[1].matchAll(/rgba\(5,7,11,(\.\d+|0|1)\)\s*(\d+)%/g)].map(m => [Number(m[1]), Number(m[2])])
  const fundo = paradas.find(([, pos]) => pos === 100)
  ok(fundo && fundo[0] >= 0.65, `o pé do cartão escurece o bastante para ler (${fundo && fundo[0]})`)
  ok(paradas.some(([a, pos]) => pos >= 66 && pos <= 78 && a >= 0.35), 'o degradê já pega a altura da frase (≈70% do cartão)')
  ok(paradas.some(([a, pos]) => pos >= 40 && pos <= 55 && a === 0), 'o meio do vídeo segue limpo (sem a "sombra" que o fundador recusou em 21/10)')
  const sub = c.match(/\.k3c-sub\{[^}]*\}/)[0]
  ok(/color:#fff/.test(sub) && /text-shadow:0 1px 2px rgba\(0,0,0,\.7\)/.test(sub), 'frase do cartão em branco com sombra firme')
}

all()
const real = passed
const s = p => read(p)
const mutants = [
  ['etiqueta "Recreate" volta a 10 px no celular', { 'components/home/HomeMosaic.tsx': s('components/home/HomeMosaic.tsx').replace('padding:3px 8px 3px 6px;font-size:12px', 'padding:3px 8px 3px 6px;font-size:10px') }],
  ['plano volta a 11 px', { 'app/KineoLanding.tsx': s('app/KineoLanding.tsx').replace('.klp .plan .pt{font-size:12px', '.klp .plan .pt{font-size:11px') }],
  ['rodapé volta a fontSize: 11', { 'components/Footer.tsx': s('components/Footer.tsx').replace("<span style={{ display: 'block', fontSize: 12 }}>", "<span style={{ display: 'block', fontSize: 11 }}>") }],
  ['meio-pixel escondido (11.5px)', { 'app/KineoLanding.tsx': s('app/KineoLanding.tsx').replace('.klp .pl-badge{font-weight:600;font-size:12px', '.klp .pl-badge{font-weight:600;font-size:11.5px') }],
  ['degradê volta ao fraco', { [CARDS]: s(CARDS).replace('rgba(5,7,11,0) 50%,rgba(5,7,11,.42) 72%,rgba(5,7,11,.7) 100%', 'rgba(5,7,11,0) 62%,rgba(5,7,11,.28) 80%,rgba(5,7,11,.5) 100%') }],
  ['degradê vira sombra no cartão inteiro', { [CARDS]: s(CARDS).replace('rgba(5,7,11,0) 50%,rgba(5,7,11,.42) 72%', 'rgba(5,7,11,.3) 50%,rgba(5,7,11,.42) 72%') }],
  ['pílula do menu não cresce', { 'app/KineoLanding.tsx': s('app/KineoLanding.tsx').replace('.klp .nav-links a .badge{height:18px', '.klp .nav-links a .badge{height:15px') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-letra-12-home-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
