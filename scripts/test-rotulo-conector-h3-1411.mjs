// KINEO-ROTULO-CONECTOR-H3-1411 [CEO 14/11, item (d)] · KINEO-ROTULO-CHATGPT-H3-1411 [CEO 14/11: "o guardião novo cobre o app do ChatGPT e o conector com a
// mesma régua"] — guardião do rótulo honesto da chave 'seedance' (renderiza no MiniMax H3 Turbo) no conector Kineo Studio (lib/mcp/studioMcp.ts e
// studioTools.ts) e no app do ChatGPT (lib/mcp/kineoMcp.ts e chatgptContract.ts), pela régua única de lib/gptHandoff.ts (ENGINE_LABELS e rotuloDoMotorNaData).
// Filme feito antes de 05/11 21:46 BRT mantém o nome do motor que o fez (Seedance 1.5). O valor do parâmetro ('seedance'), os nomes das ferramentas e os
// créditos não mudam. Mutantes no fim.
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const HAND = 'lib/gptHandoff.ts', MCP = 'lib/mcp/studioMcp.ts', TOOLS = 'lib/mcp/studioTools.ts'
const NOMES_DAS_FERRAMENTAS_DO_CHATGPT = JSON.stringify(['kineo_facts', 'create_video_handoff'])

function bateria(over = {}) {
  const p = []
  const ok = (c, n) => { if (!c) p.push(n) }
  let r
  try { r = loader({ '@supabase/supabase-js': { createClient: () => ({}) }, 'server-only': {} }, over) } catch (e) { return ['loader: ' + e.message] }
  let S, H, K, C
  try { S = r('lib/mcp/studioMcp'); H = r('lib/gptHandoff'); K = r('lib/mcp/kineoMcp'); C = r('lib/mcp/chatgptContract') } catch (e) { return ['carregar: ' + e.message] }
  // a régua única
  ok(H.ENGINE_LABELS.seedance === 'MiniMax H3 Turbo', '(1) ENGINE_LABELS.seedance = MiniMax H3 Turbo')
  ok(H.rotuloDoMotorNaData('seedance', '2026-11-05T12:00:00Z') === 'Seedance 1.5' && H.rotuloDoMotorNaData('seedance', '2026-10-20T12:00:00Z') === 'Seedance 1.5', '(2) filme antigo mantém Seedance 1.5')
  ok(H.rotuloDoMotorNaData('seedance', '2026-11-06T00:46:55Z') === 'MiniMax H3 Turbo' && H.rotuloDoMotorNaData('seedance', '2026-11-14T18:00:00Z') === 'MiniMax H3 Turbo', '(3) filme de depois do corte mostra MiniMax H3 Turbo')
  ok(H.rotuloDoMotorNaData('seedance', 'lixo') === 'MiniMax H3 Turbo' && H.rotuloDoMotorNaData('seedance', null) === 'MiniMax H3 Turbo', '(4) data ausente ou ilegível = rótulo de hoje')
  ok(H.ENGINE_LABELS.kling === 'Kling 2.5' && H.ENGINE_LABELS.veo === 'Veo 3.1' && H.ENGINE_LABELS.h3 === 'MiniMax H3' && H.ENGINE_LABELS.fast === 'Kineo 1', '(5) os outros rótulos sem mudança')
  // o conector Kineo Studio
  ok(S.studioEngineLabel('seedance') === 'MiniMax H3 Turbo' && S.studioEngineLabel('seedance', '2026-11-05T12:00:00Z') === 'Seedance 1.5', '(6) conector: mesma régua')
  for (const e of ['kling', 'veo', 'hollywood', 'h3']) ok(S.studioEngineLabel(e) === H.ENGINE_LABELS[e] && S.studioEngineLabel(e, '2026-10-01T00:00:00Z') === H.ENGINE_LABELS[e], `(7) conector: ${e} sem mudança`)
  ok(S.STUDIO_ENGINES.includes('seedance') && S.STUDIO_DEFAULT_ENGINE === 'seedance' && S.STUDIO_ENGINE_QUALITY.seedance === 'cinematic_ai', '(8) conector: o valor do parâmetro segue seedance (cinematic_ai)')
  const custo = r('lib/credits/engineCost')
  for (const d of S.durationsFor('seedance')) ok(S.estimateCredits('seedance', d) === custo.creditCostForDuration('cinematic_ai', true, d), `(9) conector: créditos de ${d} s sem mudança`)
  const tools = (over[TOOLS] ?? lf(TOOLS)).replace(/\/\/[^\n]*/g, '')
  ok(!/Seedance 1\.5/.test(tools), '(10) studioTools sem "Seedance 1.5" digitado')
  ok(tools.includes("A 15-second ${studioEngineLabel('seedance')} film is the cheapest way to try."), '(11) a nota do kineo_account lê o rótulo')
  ok(tools.includes('engine_label: studioEngineLabel(job.engine as never, job.created_at)'), '(12) o status do conector passa a data do filme')
  // o app do ChatGPT
  const ferramentas = K.buildTools({ pausedEngines: [] })
  ok(JSON.stringify(ferramentas.map((t) => t.name)) === NOMES_DAS_FERRAMENTAS_DO_CHATGPT, '(13) app do ChatGPT: nomes das ferramentas iguais: ' + JSON.stringify(ferramentas.map((t) => t.name)))
  const txt = JSON.stringify(ferramentas)
  // KINEO-ROTULO-CHATGPT-H3-1411 (opção A, CEO 16/11) — a descrição da ferramenta é metadado congelado (contrato v1.0.0 com a OpenAI): segue "seedance = Seedance 1.5" até a próxima versão do app
  ok(txt.includes('seedance = Seedance 1.5') && !txt.includes('MiniMax H3 Turbo'), '(14) app do ChatGPT: a DESCRIÇÃO congelada da ferramenta não muda (contrato v1.0.0)')
  ok(H.ROTULOS_DO_CONTRATO_CONGELADO.seedance === 'Seedance 1.5' && Object.keys(H.ROTULOS_DO_CONTRATO_CONGELADO).every((k) => k === 'seedance' || H.ROTULOS_DO_CONTRATO_CONGELADO[k] === H.ENGINE_LABELS[k]), '(14b) o rótulo congelado difere do vivo SÓ na chave seedance')
  const cap = C.chatgptCapabilities([])
  const sd = cap.engines.find((e) => e.id === 'seedance')
  ok(sd && sd.name === 'MiniMax H3 Turbo' && sd.family === 'classic', '(15) app do ChatGPT: capacidades com id seedance e nome MiniMax H3 Turbo')
  ok(H.HANDOFF_ENGINES.includes('seedance') && H.DEFAULT_ENGINE === 'seedance', '(16) app do ChatGPT: o valor do parâmetro segue seedance')
  return p
}

const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['rótulo volta a Seedance', { [HAND]: lf(HAND).replace("  seedance: 'MiniMax H3 Turbo', // KINEO-ROTULO-CHATGPT-H3-1411", "  seedance: 'Seedance 1.5',") }],
  ['filme antigo com o nome novo', { [HAND]: lf(HAND).replace('if (Number.isFinite(t) && t < H3_TURBO_ROTULO_DESDE) return SEEDANCE_ROTULO_ANTIGO', 'void t') }],
  ['corte no dia errado', { [HAND]: lf(HAND).replace("Date.parse('2026-11-06T00:46:55Z')", "Date.parse('2026-11-11T04:16:42Z')") }],
  ['descrição congelada muda', { ['lib/mcp/kineoMcp.ts']: lf('lib/mcp/kineoMcp.ts').replace('${ROTULOS_DO_CONTRATO_CONGELADO[e as keyof typeof ROTULOS_DO_CONTRATO_CONGELADO]}', '${ENGINE_LABELS[e as keyof typeof ENGINE_LABELS]}') }], // KINEO-ROTULO-CHATGPT-H3-1411 (opção A, CEO 16/11)
  ['conector com régua própria', { [MCP]: lf(MCP).replace('  return rotuloDoMotorNaData(engine, criadoEm)\n', "  return engine === 'seedance' ? 'Seedance 1.5' : rotuloDoMotorNaData(engine, criadoEm)\n") }],
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
console.log(`PASS rótulo da chave seedance (conector Kineo Studio + app do ChatGPT, régua única): MiniMax H3 Turbo nos filmes novos, Seedance 1.5 nos de antes de 05/11 21:46 BRT, parâmetro, ferramentas e créditos iguais (${mortos}/${mutantes.length} mutantes mortos)`)
