// KINEO-HOTLEAD-SEM-VEO-1211 — guardião: o e-mail "hotlead" (vivo: cron diário no vercel.json) não promete motor que saiu da oferta.
// Origem: dizia "Creator … clean exports, Kling and Veo included" e o Veo saiu da oferta em 05/11 (KINEO-MOTORES-SAEM-0511). CEO 11/11:
// "…clean exports, premium engines included". Prova: (1) a frase nova está lá; (2) nenhum nome de motor no arquivo fora de comentário;
// (3) a rota segue agendada no vercel.json; (4) preço e créditos da frase vêm das mesmas constantes. Rodar: node scripts/test-hotlead-sem-veo-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const ROUTE = 'app/api/admin/send-hotlead-blast/route.ts'
const VERCEL = 'vercel.json'
const SRC = { [ROUTE]: rd(ROUTE), [VERCEL]: rd(VERCEL) }
const MOTORES = /\b(Veo|Kling|Seedance|MiniMax|Hailuo|Sora|Runway|Omni Flash|Nano Banana|Lyria|Topaz)\b/u

function battery(src) {
  const p = []
  const r = src[ROUTE]
  if (!r.includes('The Creator plan is <b>${CREATOR_PRICE}/month</b> (${TIER_CREDITS.basic} credits, clean exports, premium engines included)')) p.push('a frase do Creator não diz "premium engines included" (ou preço/créditos saíram das constantes)')
  const visivel = r.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/u.test(l)).join('\n')
  const m = visivel.match(MOTORES)
  if (m) p.push(`nome de motor no e-mail hotlead: ${m[0]}`)
  let crons = []
  try { crons = (JSON.parse(src[VERCEL]).crons ?? []).map((c) => c.path) } catch { p.push('vercel.json ilegível') }
  if (!crons.some((c) => c.split('?')[0] === '/api/admin/send-hotlead-blast')) p.push('a rota do hotlead saiu do agendamento do vercel.json')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS hotlead: "premium engines included", nenhum nome de motor, rota agendada' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['Veo volta', muta(ROUTE, 'clean exports, premium engines included)', 'clean exports, Kling and Veo included)')],
  ['outro motor', muta(ROUTE, 'clean exports, premium engines included)', 'clean exports, Seedance included)')],
  ['rota desagendada', muta(VERCEL, '/api/admin/send-hotlead-blast', '/api/admin/send-hotlead-blast-off')],
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
