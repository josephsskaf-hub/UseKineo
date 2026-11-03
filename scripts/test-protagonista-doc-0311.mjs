// KINEO-PROTAGONISTA-DOC-0311 [TRAVA 8.2 — fundador 03/11 "universalizar"] — guardião.
// Caso real: hansak.th (03/11 10:43, 1º filme, Seedance 15 s grátis, documentary_faceless, nota 6,5): "One man stopped World War 3…
// he ignored a false nuclear missile warning…" — o descritor escreveu "a man" em cada cena e saíram 3 homens diferentes.
// Prova EXECUTANDO o código real (offline): "One man" vira protagonista; a ficha fixa dele entra nas cenas de UMA pessoa mesmo já
// desenhadas como "a man/officer"; multidão fica intacta; cena sem gente segue sem gente; mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/elencoEpoca.ts'
const carrega = (mutar = null) => createOfflineLoader({ globals: {}, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })(ARQ)

const FALAS = ['One man stopped World War 3... by doing nothing.', 'On September 26, 1983, he ignored a false nuclear missile warning.', 'By refusing to launch a retaliation, he prevented a possible World War 3... yet was punished and kept quiet for years.']
const PROMPTS = ['A man in a grey hoodie stands in a dim corridor, looking at the camera', 'A Soviet officer sits at a control console glowing with red warning lights', 'A man among a crowd of soldiers watches a giant radar screen in a bunker']
const MARCA = 'in this shot: the man, '

function provas(m) {
  const erros = []
  const r = m.aplicarElencoEEpoca({ prompts: PROMPTS, falas: FALAS, contextoOriginal: FALAS.join(' '), contextoFiltro: FALAS.join(' '), modo: 'documentary_faceless', tagFaceless: false })
  if (!r.prompts[0].includes(MARCA) || !r.prompts[1].includes(MARCA)) erros.push('a ficha do protagonista não entrou nas cenas de uma pessoa')
  const f0 = r.prompts[0].slice(r.prompts[0].indexOf(MARCA), r.prompts[0].indexOf(' — ')), f1 = r.prompts[1].slice(r.prompts[1].indexOf(MARCA), r.prompts[1].indexOf(' — '))
  if (f0 !== f1) erros.push('as duas cenas não têm a MESMA ficha')
  if (r.prompts[2].includes(MARCA)) erros.push('a multidão ganhou o protagonista')
  if (!/1980s/.test(f0)) erros.push('a ficha não veste a época (1983)')
  const v = m.aplicarElencoEEpoca({ prompts: ['An empty launch control room at night', 'A radar screen blinking'], falas: ['One man was missing from the room.', 'Then the screen blinked.'], contextoOriginal: 'One man was missing from the room. Then the screen blinked.', contextoFiltro: 'One man was missing from the room. Then the screen blinked.', modo: 'documentary_faceless', tagFaceless: false })
  if (v.prompts[1].includes(MARCA)) erros.push('cena sem gente ganhou gente')
  const pres = m.aplicarElencoEEpoca({ prompts: PROMPTS, falas: FALAS, contextoOriginal: FALAS.join(' '), contextoFiltro: FALAS.join(' '), modo: 'presenter', tagFaceless: false })
  if (pres.prompts.some((p) => p.includes(MARCA))) erros.push('modo apresentador mudou')
  return erros
}
const base = provas(carrega())
checa(`todas as provas verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const src = lf(fs.readFileSync(ARQ, 'utf8'))
const MUTANTES = [
  ['"One man" volta a não contar', (s) => s.replace('(?:a|an|the|one)\\s+(', '(?:a|an|the)\\s+(')],
  ['ficha só onde não há "a man"', (s) => s.replace('if (!p.nomeado) for (const i of fichaNasCenasComGente) presente[i] = false', '')],
  ['multidão entra', (s) => s.replace(' && !MULTIDAO_NO_PROMPT_RE.test(p) ? i : -1', ' ? i : -1')],
]
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
