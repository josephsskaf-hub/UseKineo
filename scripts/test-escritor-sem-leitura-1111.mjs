// KINEO-ESCRITOR-SEM-LEITURA-1111 — o escritor das cenas não pede aparelho mostrando valor nem gráfico por cima.
// Trava (Node puro, sem rede/banco): (a) a regra REAL (sceneStyle.NO_TEXT_OBJECT_DIRECTION, transpilada) proíbe leitura/valor
// em aparelho e overlay/infográfico/lista; (b) a cópia literal de speechImageAlign.ts é IDÊNTICA (o supervisor fala×imagem lê a
// mesma regra); (c) a regra continua chegando ao escritor do filme clássico (rota) e ao do Kineo 1 (runway). Mutantes no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const SRC = { style: read('lib/cinematic/sceneStyle.ts'), align: read('lib/cinematic/speechImageAlign.ts'), route: read('app/api/generate-video-cinematic/route.ts'), runway: read('lib/runway.ts') }
const constante = (src) => {
  const m = src.match(/(?:export )?const NO_TEXT_OBJECT_DIRECTION =\s*\n((?:\s*(?:'[^']*'|\/\/[^\n]*)\s*\+?\s*\n?)+)/)
  if (!m) return null
  return [...m[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([^']*)'/g)].map((x) => x[1]).join('')
}

function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  const a = constante(S.style), b = constante(S.align)
  if (!a || !b) return ['regra: NO_TEXT_OBJECT_DIRECTION ilegível em uma das cópias']
  no(a !== b, 'regra: a cópia de speechImageAlign.ts diverge de sceneStyle.ts (o supervisor leria outra regra)')
  no(!/Never ask a device to show a value/.test(a), 'regra: não proíbe aparelho mostrando valor')
  for (const w of ['reading', 'number', 'temperature', 'thermometer', 'gauge', 'calendar', 'weather station']) no(!a.includes(w), `regra: "${w}" saiu da lista`)
  no(!/out of focus, or show the real thing it measures/.test(a), 'regra: perdeu a saída positiva (o aparelho sem valor ou a coisa medida)')
  no(!/Never add overlay graphics, infographics, data overlays, lists or on-screen labels/.test(a), 'regra: não proíbe gráfico por cima')
  no(!/^Never make a text-bearing object the subject of a shot/.test(a) || !/never an object that mentions, reads, displays or commemorates it\./.test(a), 'regra: a parte antiga mudou')
  no(!S.route.includes('- ${NO_TEXT_OBJECT_DIRECTION}'), 'rota: o escritor do filme clássico não recebe a regra')
  no(!S.runway.includes('- ${NO_TEXT_OBJECT_DIRECTION}'), 'runway: o escritor do Kineo 1 não recebe a regra')
  return p
}

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo')
const MUT = [
  ['M1 só uma cópia ganhou a frase', 'align', (s) => s.replace("  'Never ask a device to show a value:", "  'Never ask a gadget to show a value:")],
  ['M2 overlay volta a ser permitido', 'style', (s) => s.replace('Never add overlay graphics, infographics, data overlays, lists or on-screen labels.', 'Keep it tasteful.').replace('Never add overlay graphics, infographics, data overlays, lists or on-screen labels.', 'Keep it tasteful.')],
  ['M3 tira o termômetro da lista', 'style', (s) => s.replace('on a thermometer, gauge,', 'on a gauge,')],
  ['M4 o escritor da rota perde a regra', 'route', (s) => s.replace('- ${NO_TEXT_OBJECT_DIRECTION}', '- (sem regra)')],
]
for (const [nome, k, f] of MUT) {
  const s2 = f(SRC[k])
  if (s2 === SRC[k]) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems({ ...SRC, [k]: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
