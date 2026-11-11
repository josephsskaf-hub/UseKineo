// KINEO-LEGENDA-SEM-ASPAS-1111 — a legenda do filme 24564d97 (11/11, Kling 4 grátis, espanhol) mostrou as aspas do roteiro:
// "«¿PERO CÓMO NO HABÍA", "COLOR Y TOP.»". Trava (Node puro, o compose REAL carregado offline, sem rede): (a) com o roteiro real
// desse filme, nenhum elemento de legenda (linha inteira, karaokê e o caminho canônico do grátis de 15 s) traz « » “ ” „ ";
// (b) as palavras, o ¿ ¡ e a pontuação ficam; o apóstrofo (don't, l'eau, it’s) fica; (c) a fala não é tocada (só a legenda);
// (d) mutantes no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const read = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const ROTEIRO = '«¿Pero cómo no había descubierto esto antes?» «Es un Gel Pen 3 en 1: base, color y top.» «Mira qué bonitas quedan las uñas.» «¡Compras uno y te llevas tres por 24,90 €! Ya tengo mis favoritos.»'
const ASPAS = /[«»“”„"]/u

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let C, F, A
  try {
    const load = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (rel, src) => over[rel] ?? src })
    C = load('lib/compose.ts'); F = load('lib/free15CanonicalCaptions.ts'); A = load('lib/legendaSemAspas.ts')
  } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const textos = (els) => els.filter((e) => e && e.type === 'text').map((e) => String(e.text ?? ''))
  // linha inteira
  const linha = textos(C.buildCaptionElements({ text: '«¿Pero cómo no había', time: 0, duration: 1.2 }))
  no(!linha.length || linha.some((t) => ASPAS.test(t)) || !linha.some((t) => t.includes('¿PERO CÓMO NO HABÍA')), `(a) linha: ${JSON.stringify(linha)}`)
  // karaokê
  const words = ['color', 'y', 'top.»'].map((word, i) => ({ word, start: i * 0.4, end: i * 0.4 + 0.4 }))
  const kara = textos(C.buildCaptionElements({ text: 'color y top.»', time: 0, duration: 1.2, karaokeWords: words }))
  no(!kara.length || kara.some((t) => ASPAS.test(t)) || !kara.some((t) => t.includes('TOP.')), `(a) karaokê: ${JSON.stringify(kara)}`)
  // o caminho canônico do grátis de 15 s, com o roteiro real
  const canon = textos(F.buildFree15CanonicalCaptions({ script: ROTEIRO, audioSeconds: 14, source: { elements: [] } }))
  no(canon.length < 3 || canon.some((t) => ASPAS.test(t)), `(a) canônica: ${JSON.stringify(canon.slice(0, 4))}`)
  no(!canon.join(' ').includes('24,90 €') || !canon.join(' ').includes('¡COMPRAS'), '(b) a canônica perdeu o preço ou o ¡')
  // unidade
  const casos = [['«¿Pero cómo?»', '¿Pero cómo?'], ['“Hello,” she said', 'Hello, she said'], ['„Guten Tag“', 'Guten Tag'], ['"top."', 'top.'],
    ["don't stop", "don't stop"], ["«the boys' game»", "the boys' game"], ["l'eau", "l'eau"], ['it’s fine', 'it’s fine'], ['sem aspas', 'sem aspas'], ['(«nota»)', '(nota)']]
  for (const [ent, sai] of casos) no(A.semAspasNaLegenda(ent) !== sai, `(b) ${JSON.stringify(ent)} → ${JSON.stringify(A.semAspasNaLegenda(ent))} (esperado ${JSON.stringify(sai)})`)
  // a fala não passa por aqui: o roteiro de narração continua com as aspas (quem tira é só a legenda)
  no(!read('lib/compose.ts').includes("text = semAspasNaLegenda(text)") && !over['lib/compose.ts'], '(c) o compose não chama a legenda sem aspas')
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (legenda sem « » “ ” „ ", palavras e apóstrofo intactos)')
const cp = read('lib/compose.ts'), la = read('lib/legendaSemAspas.ts')
const MUT = [
  ['M1 a linha volta com aspas', { 'lib/compose.ts': cp.replace('  text = semAspasNaLegenda(text)\n', '') }],
  ['M2 o karaokê volta com aspas', { 'lib/compose.ts': cp.replace("  if (Array.isArray(karaokeWords)) karaokeWords = karaokeWords.map((w) => ({ ...w, word: semAspasNaLegenda(w.word) })).filter((w) => w.word !== '')\n", '') }],
  ['M3 a aspa que fecha fica', { 'lib/legendaSemAspas.ts': la.replace(".replace(FECHA, '')", '') }],
  ['M4 o apóstrofo também sai', { 'lib/legendaSemAspas.ts': la.replace('[«»“”„"]+(?=$', "[«»“”„\"'’]+(?=$") }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
