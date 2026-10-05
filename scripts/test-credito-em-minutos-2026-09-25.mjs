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
    // KINEO-SEEDANCE-35CR-2026-10-04 — Seedance a 35 cr/min (lido de creditCostForDuration abaixo): 150 cr = 4 min (era 6),
    // 60 cr = 1,5 min (1,71 arredondado PARA BAIXO; era 2), meio minuto = 18 cr (era 13). Mesma intenção, números novos.
    ['Seedance a 60 s custa o que o render cobra (35)', c150.cinematic_ai.creditsPerMinute === COST.creditCostForDuration('cinematic_ai', true, 60) && c150.cinematic_ai.creditsPerMinute === 35],
    ['150 cr = 4 min de Seedance', c150.cinematic_ai.minutes === 4],
    ['150 cr = 1 min de Kling 3', c150.cinematic_hollywood.minutes === 1],
    ['nunca arredonda para cima (60 cr de Seedance = 1,5 min, não 1,7)', byQ(60).cinematic_ai.minutes === 1.5],
    ['meio minuto aparece (18 cr de Seedance = 0,5)', byQ(18).cinematic_ai.minutes === 0.5],
    ['saldo sujo vira zero', byQ(-5).fast.minutes === 0 && byQ(NaN).fast.minutes === 0],
    // KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: o exemplo padrão trocou o Kineo 1 (fora do catálogo público)
    // pelo Kling 2.5; os minutos por motor (acima) e os créditos cobrados não mudaram.
    ['linha curta legível', M.minutesLine(150) === '4 min of Seedance 1.5 · 2.5 min of Kling 2.5 · 1 min of Kling 3'],
    ['linha omite motor que não rende meio minuto', M.minutesLine(60) === '1.5 min of Seedance 1.5 · 1 min of Kling 2.5'],
    ['linha padrão não cita o Kineo 1', !/Kineo 1/.test(M.minutesLine(150)) && !/Kineo 1/.test(M.minutesLine(1000))],
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
