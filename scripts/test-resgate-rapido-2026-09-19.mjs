// KINEO-RESGATE-RAPIDO + KINEO-PAINEL-MONTANDO (19/09, fundador: "precisa atualizar mais rápido" → "vai nos 2").
// Caso Axel: 100 cr cobrados 01:00, aba fechada 01:03, montagem 01:15, entrega 01:30 — dois tiques de 15 min.
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
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => { throw new Error('sem imports') })
  return m.exports
}

console.log('1) decisão pura: aba viva × aba morta')
const libSrc = rd('lib/strandedRescue.ts')
const L = roda(libSrc)
const now = Date.parse('2026-09-19T04:05:00Z')
checa('idade mínima 4 min (era 12) e vida 3 min', L.STRANDED_MIN_AGE_MS === 4 * 60 * 1000 && L.CLIENT_ALIVE_MS === 3 * 60 * 1000)
checa('batida há 1 min → aba viva, cron espera', L.clientStillAlive(now - 60 * 1000, now) === true)
checa('batida há 5 min → aba morta, cron age', L.clientStillAlive(now - 5 * 60 * 1000, now) === false)
checa('sem batida nenhuma → aba morta', L.clientStillAlive(null, now) === false && L.clientStillAlive(undefined, now) === false)
const mut = libSrc.replace('return nowMs - lastPollMs < CLIENT_ALIVE_MS', 'return false')
checa('mutante (ignorar a batida → montar em dobro) é pego', roda(mut).clientStillAlive(now - 1000, now) === false)

console.log('2) batida gravada pelo polling da aba')
const st = rd('app/api/cinematic-clip-status/route.ts')
checa('clip-status grava cinematic_client_poll com session_id = generationId e dedupe por minuto, sem bloquear', st.includes('void writeServerEvent({ name: CINEMATIC_CLIENT_POLL_EVENT') && st.includes('sessionId: generationId, dedupeMinutes: CLIENT_POLL_DEDUPE_MINUTES'))

console.log('3) cron usa a batida e a janela nova')
const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
checa('MIN_AGE_MS vem de STRANDED_MIN_AGE_MS (não mais 12 min cravados)', cron.includes('const MIN_AGE_MS = STRANDED_MIN_AGE_MS') && !cron.includes('const MIN_AGE_MS = 12 * 60 * 1000'))
checa('lê as batidas junto com os marcadores (com created_at)', cron.includes("CINEMATIC_CLIENT_POLL_EVENT])") && cron.includes(".select('name, session_id, metadata, created_at')"))
checa('aba viva → outcome client_alive e pula, antes de qualquer compose', cron.includes("if (clientStillAlive(lastPoll.get(genId), now)) { results.push({ generation: gen8, outcome: 'client_alive' }); continue }") && cron.indexOf("outcome: 'client_alive'") < cron.indexOf('const res = await composePost(composeReq)'))
const vj = rd('vercel.json')
checa('cron a cada 5 min', /"path": "\/api\/cron\/finish-stranded-renders",\s*\n\s*"schedule": "\*\/5 \* \* \* \*"/.test(vj))

checa('compose resgatado carrega o pedido (response.prompt) — o painel de coerência deixa de dizer "prompt vazio no banco"', cron.includes("typeof response.prompt === 'string' ? response.prompt : undefined"))

console.log('4) painel')
const live = rd('app/api/admin/live/route.ts')
checa('"montando" quando há claim cobrado sem filme pronto nem falha', live.includes("did.push('⏳ montando (crédito cobrado, filme a caminho)')"))
checa('linha de gasto: pedidos × prontos × montando', live.includes('const prontos = Math.min(v.n, delivered24.get(') && live.includes("`🎬 24h: ${v.n} ${v.n === 1 ? 'pedido' : 'pedidos'} no ${ENGINE_SHORT[q] ?? q} (${entrega})"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
