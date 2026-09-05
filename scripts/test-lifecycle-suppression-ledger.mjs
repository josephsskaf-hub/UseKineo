// sprint-retencao #9 (global #25) — a supressao cruzada de 24h passa a ler o
// ledger de envio (`email_send_log`), que e append-only, alem dos tres
// CARIMBOS que um job pode apagar quando se rearma.
//
// O QUE ESTE TESTE PROTEGE, em uma frase: que a memoria de "ja mandei e-mail
// para esta pessoa" nao dependa mais de uma linha que `lib/reverseTrial.ts`
// APAGA de proposito na ressurreicao do trial.
//
// Le os arquivos REAIS. Reimplementa a decisao da janela para exercitar o
// comportamento com os casos de producao de 28/08, 31/08 e 04/09.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

const supr = readFileSync(path.join(root, 'lib/lifecycle/suppression.ts'), 'utf8')
const revive = readFileSync(path.join(root, 'lib/reverseTrial.ts'), 'utf8')
const blast = readFileSync(path.join(root, 'app/api/admin/send-hotlead-blast/route.ts'), 'utf8')
const quota = readFileSync(path.join(root, 'lib/email/quota.ts'), 'utf8')
const trialCron = readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')

// ── 1) A PREMISSA DO CONSERTO, lida da fonte e nao da minha memoria ─────────
// Se qualquer uma destas tres afirmacoes deixar de ser verdade, o comentario
// do conserto vira ficcao e este teste tem de gritar.
ok(/from\('trial_emails_log'\)\s*\n\s*\.delete\(\)/.test(revive), 'premissa: a ressurreicao APAGA a linha de trial_emails_log')
ok(/\.eq\('email_kind', 'downgraded_loss'\)/.test(revive), 'premissa: o delete e do kind downgraded_loss (o par medido em producao)')
ok(blast.includes('loadLifecycleSuppression'), 'premissa: o hotlead-blast RESPEITA a supressao na entrada')
ok(!/\.update\(\{[^}]*_sent_at/.test(blast), 'premissa: o hotlead-blast nao grava carimbo datado — o ledger e o unico rastro dele')
ok(trialCron.includes('loadLifecycleSuppression(admin, fresh.map((c) => c.id))'), 'premissa: o cron de trial aplica a supressao de 24h (o defeito nao era supressao desligada)')

// ── 2) A FONTE NOVA existe, com os dois filtros que nao podem inverter ──────
ok(supr.includes("from('email_send_log')"), 'fonte nova: email_send_log consultado')
ok(/from\('email_send_log'\)[\s\S]{0,200}\.select\('user_id, sent_at'\)/.test(supr), 'fonte nova: le so user_id e sent_at (nada de PII a mais)')
ok(/from\('email_send_log'\)[\s\S]{0,300}\.eq\('ok', true\)/.test(supr), 'fonte nova: FILTRO ok=true — recusa do Resend nao cala o proximo e-mail')
ok(/from\('email_send_log'\)[\s\S]{0,300}\.not\('yielded', 'is', true\)/.test(supr), 'fonte nova: FILTRO yielded — cessao de cota NAO e envio')
ok(/from\('email_send_log'\)[\s\S]{0,300}\.gte\('sent_at', new Date\(cutoff\)\.toISOString\(\)\)/.test(supr), 'fonte nova: corte na origem pela janela efetiva (nao pela constante de 24h)')
ok(supr.includes("return closed(`email_send_log:"), 'fonte nova: erro de leitura FECHA a trava (mesma regra das outras tres)')
ok(/ledgerRows[\s\S]{0,200}bump\(row\.user_id, parseTime\(row\.sent_at\)\)/.test(supr), 'fonte nova: alimenta o MESMO mapa lastEmailAt (uma so decisao de janela)')

// A fonte nova mora DENTRO do laco de chunks — senao estoura a URL do
// PostgREST no primeiro job que carrega 5000 perfis (send-video-rescue).
const chunkIdx = supr.indexOf('for (const part of chunk(ids, CHUNK_SIZE))')
const ledgerIdx = supr.indexOf("from('email_send_log')")
const catchIdx = supr.indexOf('} catch (err) {')
ok(chunkIdx > 0 && ledgerIdx > chunkIdx && ledgerIdx < catchIdx, 'fonte nova: dentro do laco de chunks, dentro do try')

// ── 3) O QUE NAO PODE TER MUDADO ───────────────────────────────────────────
ok(supr.includes('export const LIFECYCLE_SUPPRESSION_HOURS = 24'), 'janela padrao continua 24h')
ok(supr.includes('export const HOT_LEAD_SUPPRESSION_HOURS = 4'), 'janela curta do checkout_recovery continua 4h')
ok(supr.includes("PROFILE_TIMESTAMP_COLUMNS"), 'as tres fontes antigas continuam')
ok(supr.includes("from('checkout_abandoned')") && supr.includes("from('trial_emails_log')"), 'checkout_abandoned e trial_emails_log continuam sendo lidos')
ok(!/from\('email_send_log'\)[\s\S]{0,400}(insert|update|delete|upsert)\(/.test(supr), 'LEITURA, NUNCA ESCRITA: nenhuma escrita no ledger a partir daqui')
ok((supr.match(/return closed\(/g) || []).length >= 4, 'falha fechada preservada em todas as fontes')

// ── 4) A DECISAO DE JANELA, reimplementada, contra os casos REAIS ──────────
// Reimplementacao literal do fim da funcao: suprimido <=> ultimo envio > cutoff.
const decide = (nowIso, windowHours, sends) => {
  const cutoff = Date.parse(nowIso) - windowHours * 3600_000
  let last = 0
  for (const s of sends) {
    if (s.ok === false) continue          // recusa do Resend
    if (s.yielded === true) continue      // cessao de cota
    const t = Date.parse(s.sent_at)
    if (t > last) last = t
  }
  return last > cutoff
}

// Caso de 04/09 00:25Z — o mais recente, e o que motivou a rodada.
// A pessoa recebeu downgraded_loss as 03/09 22:25Z; a ressurreicao apagou o
// carimbo; 2h depois o d0_welcome saiu. Com o ledger, ela e vista.
const caso0409 = [{ sent_at: '2026-09-03T22:25:18Z', ok: true, yielded: false }]
ok(decide('2026-09-04T00:25:17Z', 24, caso0409) === true, 'caso 04/09: com o ledger, quem recebeu ha 2h e SUPRIMIDO (o par contraditorio nao sai)')
ok(decide('2026-09-04T00:25:17Z', 24, []) === false, 'caso 04/09: sem o ledger (carimbo apagado) a pessoa parecia nunca ter recebido nada — o defeito reproduzido')

// Caso do blast de 31/08 — 15 minutos entre um hotlead e um e-mail de trial.
const caso3108 = [{ sent_at: '2026-08-31T10:00:00Z', ok: true, yielded: false }]
ok(decide('2026-08-31T10:15:00Z', 24, caso3108) === true, 'caso 31/08: blast de 15 min antes agora e visivel')

// O checkout_recovery NAO pode ser afetado: ele pede janela de 4h e os pares
// medidos em producao sao de 4,91h a 22,9h.
ok(decide('2026-09-04T05:00:00Z', 4, [{ sent_at: '2026-09-04T00:05:00Z', ok: true, yielded: false }]) === false, 'checkout_recovery: par de 4,91h continua SAINDO (janela de 4h preservada)')
ok(decide('2026-09-04T02:00:00Z', 4, [{ sent_at: '2026-09-04T00:05:00Z', ok: true, yielded: false }]) === true, 'checkout_recovery: dentro das 4h continua suprimido')

// Os dois filtros, exercitados pelo comportamento e nao so pelo texto.
ok(decide('2026-09-04T00:25:00Z', 24, [{ sent_at: '2026-09-03T22:25:00Z', ok: false, yielded: false }]) === false, 'recusa do Resend (ok=false) NAO cala o proximo e-mail')
ok(decide('2026-09-04T00:25:00Z', 24, [{ sent_at: '2026-09-03T22:25:00Z', ok: true, yielded: true }]) === false, 'cessao de cota (yielded) NAO cala o proximo e-mail')
ok(decide('2026-09-04T00:25:00Z', 24, [{ sent_at: '2026-09-02T20:00:00Z', ok: true, yielded: false }]) === false, 'envio fora da janela nao suprime')

// ── 5) O acordo com o gate de cota (lib/email/quota.ts) continua de pe ──────
// Este modulo decide REPETICAO; o quota.ts decide ORCAMENTO. Um nao pode
// virar o outro: se a supressao passasse a olhar prioridade, `revenue`
// deixaria de ser "nunca barrado por nos".
ok(quota.includes("revenue: 1"), 'quota: revenue continua sem limiar de cessao')
ok(!supr.includes("'revenue'") && !supr.includes('EmailPriority'), 'supressao NAO le prioridade — repeticao e orcamento seguem separados')

console.log(`\n${n - fail}/${n} ok`)
if (fail) process.exit(1)
