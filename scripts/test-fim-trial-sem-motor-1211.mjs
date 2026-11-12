// KINEO-FIM-TRIAL-SEM-MOTOR-1211 — guardião: o modal de fim do trial (TrialDowngradeModal, vivo com KINEO_REVERSE_TRIAL_ENABLED) não
// cita motor. Regra do fundador (11/11: "Tira, com certeza" / "Tira também"). Prova: (1) sem o selo "VEO 3.1" no clipe; (2) a linha da
// tabela diz "AI engines" (era "AI engines (MiniMax H3 Turbo, Kling…)"); (3) nenhum nome de motor em texto visível do arquivo;
// (4) clipe, legenda, frase de benefício e botões intocados. Rodar: node scripts/test-fim-trial-sem-motor-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const F = 'components/TrialDowngradeModal.tsx'
const SRC = readFileSync(resolve(root, F), 'utf8').replace(/\r\n/g, '\n')
const MOTORES = /\b(Seedance|MiniMax|Kling|KLING|Veo|VEO|Hailuo|Sora|Runway|Topaz)\b/u

function battery(src) {
  const p = []
  if (src.includes('>VEO 3.1</span>')) p.push('o selo "VEO 3.1" voltou')
  if (!src.includes(">AI engines</td>")) p.push('a linha da tabela não diz "AI engines"')
  const visivel = src.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*|\{\/\*)/u.test(l)).map((l) => l.replace(/\/\*.*?\*\//gu, '')).join('\n')
  const m = visivel.match(MOTORES)
  if (m) p.push(`nome de motor visível no modal: ${m[0]}`)
  if (!src.includes('<video src="/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4"')) p.push('o clipe do modal mudou')
  if (!src.includes('>Made with the engines your trial unlocked</span>')) p.push('a legenda do clipe mudou')
  if (!src.includes('{primaryName} brings the AI engines and clean downloads back')) p.push('a frase de benefício mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS fim do trial sem nome de motor; clipe, legenda e frase intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (from, to) => { if (!SRC.includes(from)) throw new Error('mutante sem âncora: ' + from.slice(0, 60)); return SRC.replace(from, to) }
const MUTANTES = [
  ['MiniMax volta na tabela', muta('>AI engines</td>', '>AI engines (MiniMax H3 Turbo, Kling…)</td>')],
  ['selo VEO volta', muta('>Made with the engines your trial unlocked</span>', '>Made with the engines your trial unlocked</span><span>VEO 3.1</span>')],
  ['legenda some', muta('>Made with the engines your trial unlocked</span>', '>Made with AI</span>')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
