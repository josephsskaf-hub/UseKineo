// KINEO-RENOVACAO-RECUSADA-2026-09-18 — guardião da carta "sua renovação não passou". Sem rede, sem banco.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const r = rd('app/api/admin/send-renewal-declined/route.ts')
checa('só admin ou cron autorizado (fail-closed sem CRON_SECRET)', r.includes("if (!cronSecret) return false") && r.includes("if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"))
checa('coorte: só recusas de RENOVAÇÃO com dono, na janela de 21 dias', r.includes("if (!uid || md.is_renewal !== true) continue") && r.includes("const LOOKBACK_DAYS = 21"))
checa('só assinante pagante em plano pago; opt-out, interno e bloqueado ficam fora', r.includes("if (p.has_paid !== true || !PAID_PLANS.has(String(p.plan ?? '')))") && r.includes("if (p.email_opted_out === true)") && r.includes("BLOQUEADOS.some((b) => email.includes(b))"))
checa('quem pagou fatura DEPOIS da recusa se recuperou e não recebe', r.includes(".eq('name', 'subscription_invoice_paid')") && r.includes("if (pagaEm && pagaEm > rec.recusadoEm) { excluidos.recuperado++; continue }"))
checa('1 carta por pessoa a cada 30 dias (carimbo na lista canônica)', r.includes("const RESEND_AFTER_DAYS = 30") && r.includes("export const SENT_EVENT = 'renewal_declined_emailed_v1'") && rd('lib/lifecycle/emailEvents.ts').includes("'renewal_declined_emailed_v1',"))
checa('supressão de 24 h da casa, fail-closed', r.includes("const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))") && r.includes("candidatos.filter((c) => !sup.isSuppressed(c.id))"))
checa('dry-run por padrão; envio só com confirm=SEND; lote ≤ 30', r.includes("const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'") && r.includes("mode: 'DRY_RUN'") && r.includes("const MAX_BATCH = 30"))
checa('a carta leva ao /account (onde mora o botão do portal da Stripe), com campanha própria', r.includes("`${SITE}/account?utm_source=lifecycle&utm_medium=email&utm_campaign=${CAMPAIGN}`") && r.includes("export const CAMPAIGN = 'renewal_declined'"))
checa('a carta não oferece desconto nem muda plano; diz que o acesso continua por enquanto', !r.includes('discount') && !r.includes('% off') && r.includes('Your access is still on for now'))
checa('motivo do banco traduzido, com fallback honesto', r.includes("case 'insufficient_funds': return 'the card came back short at the moment of the charge'") && r.includes("default: return 'your bank turned the charge down'"))
checa('reply-to na caixa profissional e cabeçalho de descadastro', r.includes("const REPLY_TO = 'joseph@usekineo.com'") && r.includes("headers: unsubscribeHeaders(c.id)"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
