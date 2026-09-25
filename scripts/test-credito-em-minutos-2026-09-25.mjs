// KINEO-CREDITO-EM-MINUTOS-2026-09-25 — guardião: a tradução crédito → minutos usa a MESMA régua que cobra
// (creditCostForDuration), arredonda para baixo (nunca promete mais tempo do que o saldo compra) e tem mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = (src, req) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, req); return m.exports
}
const COST = load(rd('lib/credits/engineCost.ts'), () => ({}))
const SRC = rd('lib/credits/creditMinutes.ts')
const run = (src) => load(src, (n) => { if (n === '@/lib/credits/engineCost') return COST; throw new Error('import ' + n) })
function provas(M) {
  const byQ = (c) => Object.fromEntries(M.creditsToMinutes(c).map((e) => [e.quality, e]))
  const c150 = byQ(150)
  return [
    ['Kineo 1 a 60 s custa o que o render cobra', c150.fast.creditsPerMinute === COST.creditCostForDuration('fast', true, 60)],
    ['150 cr = 30 min de Kineo 1', c150.fast.minutes === 30],
    ['150 cr = 6 min de Seedance', c150.cinematic_ai.minutes === 6],
    ['150 cr = 1 min de Kling 3', c150.cinematic_hollywood.minutes === 1],
    ['nunca arredonda para cima (60 cr de Seedance = 2 min, não 2,4)', byQ(60).cinematic_ai.minutes === 2],
    ['meio minuto aparece (13 cr de Seedance = 0,5)', byQ(13).cinematic_ai.minutes === 0.5],
    ['saldo sujo vira zero', byQ(-5).fast.minutes === 0 && byQ(NaN).fast.minutes === 0],
    ['linha curta legível', M.minutesLine(150) === '30 min of Kineo 1 · 6 min of Seedance 1.5 · 1 min of Kling 3'],
    ['linha omite motor que não rende meio minuto', M.minutesLine(60) === '12 min of Kineo 1 · 2 min of Seedance 1.5'],
  ]
}
for (const [n, c] of provas(run(SRC))) checa(n, c)
function mutante(nome, de, para) {
  if (SRC.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = SRC.replace(de, para); checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false; try { cai = provas(run(m)).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('arredonda para cima', 'Math.floor((saldo / creditsPerMinute) * 2) / 2', 'Math.ceil((saldo / creditsPerMinute) * 2) / 2')
mutante('régua fixa em vez da de cobrança', 'creditCostForDuration(quality, true, DURATION_REFERENCE_SECONDS)', '5')
console.log(`test-credito-em-minutos-2026-09-25: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
