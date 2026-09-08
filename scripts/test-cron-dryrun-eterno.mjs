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

// ═══ 08/09: a palavra de escrita NÃO é sempre 'SEND' ════════════════════════
// Este teste cravava `confirm=SEND`. Isso reprovava a rota certa
// (`reconcile-dunning`, que escreve com `?confirm=APPLY`) e — pior — DEIXAVA
// PASSAR o defeito que ele existe para pegar: uma rota que exigisse
// `confirm=YES` agendada com `confirm=SEND` ficaria em dry-run para sempre e
// o teste diria ✓. Agora a palavra é LIDA DA PRÓPRIA ROTA, que é a condição
// de verdade: "o cron carrega o token que ESTA rota exige para escrever?"
function tokensDeEscrita(src) {
  const achados = [...src.matchAll(/get\(\s*'confirm'\s*\)\s*===\s*'([A-Z_]+)'/g)].map((m) => m[1])
  // Sem comparação explícita, mantém a regra histórica da casa.
  return achados.length ? [...new Set(achados)] : ['SEND']
}

let bad = 0, ok = 0
for (const c of crons) {
  const route = c.path.split('?')[0]
  const f = join(R, 'app' + route + '/route.ts')
  if (!existsSync(f)) continue
  const src = readFileSync(f, 'utf8')
  const gated = src.includes("get('confirm')")
  if (!gated || OFF_DE_PROPOSITO.has(route)) { ok++; continue }
  const tokens = tokensDeEscrita(src)
  if (tokens.some((t) => c.path.includes(`confirm=${t}`))) { ok++; console.log('  ✓', c.path) }
  else { bad++; console.log(`  ✗ DRY-RUN ETERNO (rota exige ${tokens.join('|')}):`, c.path) }
}
console.log(`\n${ok} ok, ${bad} em dry-run eterno`)
process.exit(bad ? 1 : 0)
