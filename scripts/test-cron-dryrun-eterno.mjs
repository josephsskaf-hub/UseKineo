// KINEO-CRON-DRYRUN-ETERNO-2026-09-01 — prova permanente.
// Em 01/09 descobrimos que send-failure-recovery rodou 30 DIAS a cada 6h em
// DRY_RUN (33 pessoas com erro na semana, zero e-mails) e send-momentum-nudge
// idem: a rota exige ?confirm=SEND e o vercel.json agendava sem. Este teste
// falha se qualquer cron cuja rota le `confirm` for agendado sem SEND —
// exceto os desligados de proposito (lista OFF_DE_PROPOSITO).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const OFF_DE_PROPOSITO = new Set(['/api/cron/send-oneoff-unlock'])
const crons = JSON.parse(readFileSync(join(R, 'vercel.json'), 'utf8')).crons ?? []
let bad = 0, ok = 0
for (const c of crons) {
  const route = c.path.split('?')[0]
  const f = join(R, 'app' + route + '/route.ts')
  if (!existsSync(f)) continue
  const src = readFileSync(f, 'utf8')
  const gated = src.includes("get('confirm')")
  if (!gated || OFF_DE_PROPOSITO.has(route)) { ok++; continue }
  if (c.path.includes('confirm=SEND')) { ok++; console.log('  ✓', c.path) }
  else { bad++; console.log('  ✗ DRY-RUN ETERNO:', c.path) }
}
console.log(`\n${ok} ok, ${bad} em dry-run eterno`)
process.exit(bad ? 1 : 0)
