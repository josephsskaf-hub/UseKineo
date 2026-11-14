// KINEO-ROTULO-CONECTOR-H3-1411 [CEO 14/11, item (d)] — guardião do rótulo honesto do conector Kineo Studio (lib/mcp/studioMcp.ts e studioTools.ts).
// A chave 'seedance' renderiza no MiniMax H3 Turbo: o conector mostra esse nome em todo filme novo; filme feito antes de 05/11 21:46 BRT mantém o nome
// do motor que o fez (Seedance 1.5). O valor do parâmetro ('seedance') e os créditos não mudam. Mutantes no fim.
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const MCP = 'lib/mcp/studioMcp.ts', TOOLS = 'lib/mcp/studioTools.ts'

function bateria(over = {}) {
  const p = []
  const ok = (c, n) => { if (!c) p.push(n) }
  let S
  try { S = loader({ '@supabase/supabase-js': { createClient: () => ({}) }, 'server-only': {} }, over)('lib/mcp/studioMcp') } catch (e) { return ['carregar studioMcp: ' + e.message] }
  const H = loader({}, {})('lib/gptHandoff')
  ok(S.studioEngineLabel('seedance') === 'MiniMax H3 Turbo', '(1) filme novo em seedance mostra MiniMax H3 Turbo')
  ok(S.studioEngineLabel('seedance', '2026-11-14T18:00:00Z') === 'MiniMax H3 Turbo' && S.studioEngineLabel('seedance', '2026-11-06T00:46:55Z') === 'MiniMax H3 Turbo', '(2) filme de depois da abertura do H3 Turbo mostra MiniMax H3 Turbo')
  ok(S.studioEngineLabel('seedance', '2026-11-05T12:00:00Z') === 'Seedance 1.5' && S.studioEngineLabel('seedance', '2026-10-20T12:00:00Z') === 'Seedance 1.5', '(3) filme antigo mantém o nome do motor que o fez')
  ok(S.studioEngineLabel('seedance', 'lixo') === 'MiniMax H3 Turbo', '(4) data ilegível = rótulo de hoje')
  for (const e of ['kling', 'veo', 'hollywood', 'h3']) ok(S.studioEngineLabel(e) === H.ENGINE_LABELS[e] && S.studioEngineLabel(e, '2026-10-01T00:00:00Z') === H.ENGINE_LABELS[e], `(5) ${e} sem mudança`)
  ok(S.STUDIO_ENGINES.includes('seedance') && S.STUDIO_DEFAULT_ENGINE === 'seedance' && S.STUDIO_ENGINE_QUALITY.seedance === 'cinematic_ai', '(6) o valor do parâmetro segue seedance (cinematic_ai)')
  const custo = loader({}, {})('lib/credits/engineCost')
  for (const d of S.durationsFor('seedance')) ok(S.estimateCredits('seedance', d) === custo.creditCostForDuration('cinematic_ai', true, d), `(7) créditos de ${d} s sem mudança`)
  ok(H.ENGINE_LABELS.seedance === 'Seedance 1.5', '(8) ENGINE_LABELS (app do ChatGPT e página do GPT) não mudou neste lote')
  const tools = (over[TOOLS] ?? lf(TOOLS)).replace(/\/\/[^\n]*/g, '')
  ok(!/Seedance 1\.5/.test(tools), '(9) studioTools sem "Seedance 1.5" digitado')
  ok(tools.includes("A 15-second ${studioEngineLabel('seedance')} film is the cheapest way to try."), '(10) a nota do kineo_account lê o rótulo')
  ok(tools.includes('engine_label: studioEngineLabel(job.engine as never, job.created_at)'), '(11) o status passa a data do filme')
  return p
}

const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['rótulo volta a Seedance', { [MCP]: lf(MCP).replace("{ ...ENGINE_LABELS, seedance: 'MiniMax H3 Turbo' }", '{ ...ENGINE_LABELS }') }],
  ['filme antigo com o nome novo', { [MCP]: lf(MCP).replace('if (Number.isFinite(t) && t < STUDIO_H3_TURBO_DESDE) return ENGINE_LABELS.seedance', 'void t') }],
  ['corte no dia errado', { [MCP]: lf(MCP).replace("Date.parse('2026-11-06T00:46:55Z')", "Date.parse('2026-11-11T04:16:42Z')") }],
  ['nota digitada', { [TOOLS]: lf(TOOLS).replace("A 15-second ${studioEngineLabel('seedance')} film", 'A 15-second Seedance 1.5 film') }],
  ['status sem a data', { [TOOLS]: lf(TOOLS).replace('studioEngineLabel(job.engine as never, job.created_at)', 'studioEngineLabel(job.engine as never)') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(over).length) mortos++
  else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS rótulo do conector: seedance = MiniMax H3 Turbo nos filmes novos, Seedance 1.5 nos de antes de 05/11 21:46 BRT, parâmetro e créditos iguais, ENGINE_LABELS intocado (${mortos}/${mutantes.length} mutantes mortos)`)
