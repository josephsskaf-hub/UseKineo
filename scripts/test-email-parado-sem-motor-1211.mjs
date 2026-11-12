// KINEO-EMAIL-PARADO-SEM-MOTOR-1211 — guardião: o e-mail "assinante parado" (vivo: cron diário /api/admin/send-subscriber-idle) não cita
// motor na conta de filmes. Regra do fundador (11/11: "Tira, com certeza" / "Tira também"). Prova: (1) "That's N full AI films, or M
// short 15-second ones." e "That's M short 15-second films." sem "Seedance"; (2) a conta (filmsFor, a tabela real de custo) intocada;
// (3) a lista de novidades (Lyria 3, MiniMax 2.8 HD, Kling 4.0, MiniMax H3, Nano Banana Pro) FICA: promete recursos que o assinante
// recebe — listada para a CEO, não reescrita. Rodar: node scripts/test-email-parado-sem-motor-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const F = 'lib/lifecycle/subscriberIdle.ts'
const SRC = readFileSync(resolve(root, F), 'utf8').replace(/\r\n/g, '\n')

function battery(src) {
  const p = []
  const i = src.indexOf('const filmsLine = films.seedance >= 1')
  if (i < 0) return ['a linha da conta de filmes sumiu']
  const bloco = src.slice(i, src.indexOf('const idleLine', i))
  if (!bloco.includes("? `That's ${films.seedance} full AI film${films.seedance === 1 ? '' : 's'}, or ${films.short} short 15-second ones.`")) p.push('o ramo "full AI films" mudou ou voltou a citar motor')
  if (!bloco.includes(": `That's ${films.short} short 15-second film${films.short === 1 ? '' : 's'}.`")) p.push('o ramo "short 15-second films" mudou ou voltou a citar motor')
  if (/Seedance|MiniMax|Kling|Veo/u.test(bloco.replace(/\/\/[^\n]*/gu, '').replace(/films\.seedance/gu, ''))) p.push('a conta de filmes ainda cita motor')
  if (!src.includes('const films = filmsFor(t.credits)')) p.push('a conta de filmes deixou de vir de filmsFor')
  if (!src.includes('Kling 4.0 and MiniMax H3 render true film scenes, and Nano Banana Pro is in the image studio.')) p.push('a lista de novidades foi reescrita (era para só listar)')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS e-mail "assinante parado": conta de filmes sem motor; conta e novidades intocadas' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (from, to) => { if (!SRC.includes(from)) throw new Error('mutante sem âncora: ' + from.slice(0, 60)); return SRC.replace(from, to) }
const MUTANTES = [
  ['Seedance volta no ramo longo', muta("full AI film${films.seedance === 1 ? '' : 's'}, or", "full AI film${films.seedance === 1 ? '' : 's'} on Seedance, or")],
  ['Seedance volta no ramo curto', muta("short 15-second film${films.short === 1 ? '' : 's'}.`", "short 15-second Seedance film${films.short === 1 ? '' : 's'}.`")],
  ['conta chumbada', muta('const films = filmsFor(t.credits)', 'const films = { seedance: 1, short: 3 }')],
  ['novidades reescritas', muta('Kling 4.0 and MiniMax H3 render true film scenes, and Nano Banana Pro is in the image studio.', 'Premium engines render true film scenes.')],
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
