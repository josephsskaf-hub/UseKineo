// KINEO-SAUDE-RECUSA-PROPRIA-2026-09-22 — guardião: recusa NOSSA (portão de negócio) não é fornecedor caído.
// O caso real (22/09 15:07): 16 tentativas, 10 entregues, 5 barradas pelo guardião de narração do Kineo 1
// (narration_too_short, cada uma gravada 2×) → o alarme disse "PAROU DE ENTREGAR VÍDEO" com 31% de falha e
// "mesmo motivo ≥ 10×". Este guardião reproduz a janela com o módulo REAL e exige silêncio; e reproduz a mesma
// janela com motivo de fornecedor (fal_503) e exige alarme.
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
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { throw new Error('import inesperado ' + n) })
  return m.exports
}
const src = rd('lib/supplier/generationHealth.ts')
const H = roda(src)
const now = new Date('2026-09-22T18:07:00Z')
const iso = (minAgo) => new Date(now.getTime() - minAgo * 60_000).toISOString()
// 16 tentativas de 7 pessoas nas últimas 6h: 10 entregues, 5 com desfecho "failed" (o caso real), 1 sem desfecho
function janela(reason) {
  const rows = []
  const pessoas = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']
  let i = 0
  for (let k = 0; k < 10; k++) { const m = 300 - k * 25; rows.push({ name: 'video_generation_started', created_at: iso(m), user_id: pessoas[k % 7], metadata: null }, { name: 'video_generation_completed', created_at: iso(m - 5), user_id: pessoas[k % 7], metadata: null }); i++ }
  for (let k = 0; k < 5; k++) {
    const u = pessoas[k % 4]; const m = 200 - k * 30
    rows.push({ name: 'video_generation_started', created_at: iso(m), user_id: u, metadata: null })
    // duas linhas de erro de etapa por bloqueio, como no banco de 22/09
    rows.push({ name: 'generation_stage_error', created_at: iso(m - 0.2), user_id: u, metadata: { reason } })
    rows.push({ name: 'generation_stage_error', created_at: iso(m - 0.2), user_id: u, metadata: { reason } })
    rows.push({ name: 'video_generation_failed', created_at: iso(m - 0.5), user_id: u, metadata: null })
  }
  rows.push({ name: 'video_generation_started', created_at: iso(3), user_id: 'u7', metadata: null })
  return rows
}
const db = (rows) => ({ from: () => ({ select: () => ({ in: () => ({ gte: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }) }) }) })

console.log('1) o caso real: portão de narração não é fornecedor')
const real = await H.readGenerationHealth(db(janela('narration_too_short')), now)
const slow = real.windows.find((w) => w.key === 'slow')
checa('lista de recusas nossas contém narration_too_short (e a regex pega narration_guard)', H.isOurOwnRefusal('narration_too_short') && H.isOurOwnRefusal('narration_guard_blocked') && !H.isOurOwnRefusal('fal_503'))
checa('janela 6h: 10 entregues, 5 RECUSAS nossas, 0 falhas de fornecedor', slow.completed === 10 && slow.refused === 5 && slow.failed === 0)
checa('taxa de falha 0% (recusa não entra no numerador) e tentativas continuam 16', slow.failureRatePct === 0 && slow.attempts === 16)
checa('motivo repetido nosso não vira "mesmo motivo ≥ 10×"', slow.topReason === null && slow.topReasonCount === 0)
checa('NENHUMA regra acende; saúde = saudável', slow.triggered.length === 0 && real.unhealthy === false && /saudável/.test(real.headline))

console.log('2) o mesmo desenho com motivo de FORNECEDOR tem de acender')
const ruim = await H.readGenerationHealth(db(janela('fal_503')), now)
const s2 = ruim.windows.find((w) => w.key === 'slow')
checa('fal_503: 5 falhas reais, 0 recusas, taxa 31%', s2.failed === 5 && s2.refused === 0 && Math.round(s2.failureRatePct) === 31)
checa('fal_503: regra de motivo repetido acende (10 linhas do mesmo motivo)', s2.triggered.includes('repeated_reason') && s2.topReason === 'fal_503' && ruim.unhealthy === true)

console.log('3) o cruzamento é por PESSOA e por TEMPO (≤ 3 min)')
const rows = janela('narration_too_short')
// move a recusa da pessoa u1 para 30 min antes do failed dela → deixa de casar → volta a contar como falha
const desloc = rows.map((r) => (r.name === 'generation_stage_error' && r.user_id === 'u1' ? { ...r, created_at: iso(230) } : r))
const s3 = (await H.readGenerationHealth(db(desloc), now)).windows.find((w) => w.key === 'slow')
checa('recusa fora da janela de 3 min não desculpa o failed (u1 tem 2 bloqueios; os 2 deslocados voltam a contar como falha)', s3.refused === 3 && s3.failed === 2)

console.log('4) o e-mail mostra as recusas separadas e o guardião de mutante')
const watch = rd('app/api/cron/supplier-watch/route.ts')
checa('supplier-watch imprime "recusas nossas" com w.refused', watch.includes('recusas nossas ........ ${w.refused}'))
const mut = roda(src.replace("if (matchesOwnRefusal(row.user_id, t)) refused++\n      else failed++", 'failed++'))
const sm = (await mut.readGenerationHealth(db(janela('narration_too_short')), now)).windows.find((w) => w.key === 'slow')
checa('mutante (cruzamento removido) é pego: volta a contar 5 falhas', sm.failed === 5)

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
