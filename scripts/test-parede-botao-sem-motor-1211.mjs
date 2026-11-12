// KINEO-PAREDE-BOTAO-SEM-MOTOR-1211 — guardião: o botão do filme grátis da parede e a conta "filmes iguais a este" não citam motor.
// Regra do fundador (11/11: "Tira, com certeza" / "Tira também"). Prova: (1) o botão diz "Make my included N-second film" nos dois ramos
// (era "Seedance film" / "Kineo 1 film"); (2) a conta à vista diz "N-second film · C credits each" (era "Seedance 1.5 · 35 s · …");
// (3) o motor continua decidindo a conta (engineLabel segue no objeto e ainda barra filme sem base honesta); (4) os ramos, o clique e
// o custo intocados. Cada mutante tem de derrubar a bateria. Rodar: node scripts/test-parede-botao-sem-motor-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'
const VAL = 'lib/valorNoCheckout.ts'
const SRC = { [GEN]: rd(GEN), [VAL]: rd(VAL) }

function battery(src) {
  const p = []
  const g = src[GEN]
  const i = g.indexOf('const freeLabel = firstFilmFree ?')
  if (i < 0) return ['o rótulo do filme grátis da parede sumiu']
  const bloco = g.slice(i, g.indexOf('\n    return <ConversionUpgrade', i))
  if (!bloco.includes("? `Make my included ${trialSeedance15.seconds}-second film`")) p.push('o ramo do 15 s não diz "N-second film"')
  if (!bloco.includes(": trialKineo1 ? `Make my included ${trialKineo1.seconds}-second film` : null")) p.push('o ramo do trial curto não diz "N-second film"')
  if (/Seedance|Kineo 1|MiniMax|Kling|Veo/u.test(bloco.replace(/\/\/[^\n]*/gu, '').replace(/trialSeedance15|trialKineo1/gu, ''))) p.push('o botão da parede ainda cita motor')
  if (!bloco.includes("const freeLabel = firstFilmFree ? 'Make my first film free' : trialSeedance15")) p.push('a ordem dos ramos mudou')
  if (!g.includes('freeAction={freeLabel && onFirstFilmFree ? { label: freeLabel, onClick: onFirstFilmFree } : null}')) p.push('o clique do filme grátis mudou')
  const v = src[VAL]
  const j = v.indexOf('export function filmsLikeThisMath(')
  const math = v.slice(j, v.indexOf('\n}', j))
  if (!math.includes('return `${value.seconds}-second film · ${value.creditsEach} credits each`')) p.push('a conta à vista não é "N-second film · C credits each"')
  if (math.includes('engineLabel')) p.push('a conta à vista voltou a citar o motor')
  if (!v.includes("const engineLabel = q === 'cinematic_hollywood' && KLING4_PAID_LIVE ? 'Kling 4.0' : engineLabelFor(q)") || !v.includes('if (!engineLabel) return null')) p.push('o motor deixou de decidir a conta (base honesta)')
  if (!v.includes('const creditsEach = creditCostForDuration(q as Quality, true, secs)')) p.push('o custo do filme mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS parede: botão do filme grátis e "filmes iguais a este" sem motor; ramos, clique e conta intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['Seedance volta no botão', muta(GEN, '? `Make my included ${trialSeedance15.seconds}-second film`', '? `Make my included ${trialSeedance15.seconds}-second Seedance film`')],
  ['Kineo 1 volta no botão', muta(GEN, ': trialKineo1 ? `Make my included ${trialKineo1.seconds}-second film`', ': trialKineo1 ? `Make my included ${trialKineo1.seconds}-second Kineo 1 film`')],
  ['motor volta na conta', muta(VAL, 'return `${value.seconds}-second film · ${value.creditsEach} credits each`', 'return `${value.engineLabel} · ${value.seconds} s · ${value.creditsEach} credits each`')],
  ['conta sem base honesta', muta(VAL, '  if (!engineLabel) return null\n', '')],
  ['clique mudou', muta(GEN, 'freeAction={freeLabel && onFirstFilmFree ? { label: freeLabel, onClick: onFirstFilmFree } : null}', 'freeAction={null}')],
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
