// KINEO-COTA-SEMANAL-CARTA-2026-09-17 — guardião da carta "seu vídeo grátis voltou, e agora é toda semana".
// Sem rede, sem banco. Prova por leitura do arquivo: a carta só pode sair se o free tier for 1 por 7 dias, não
// concede crédito, respeita opt-out/interno/descartável/frio, uma por conta, dry-run por padrão.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const r = rd('app/api/admin/send-weekly-quota/route.ts')
checa('só admin (403 sem sessão de admin)', r.includes("if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"))
checa('a carta só sai se o free tier for 1 por 7 dias (409 senão) — promessa lida da fonte única', r.includes("if (!offer.reverseTrial || windowDays !== 7 || offer.limit !== 1) {") && r.includes("the letter would lie") && r.includes("const days = Math.round(offer.windowMs / 86_400_000)"))
checa('dry-run por padrão; envio só com confirm=SEND', r.includes("const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'") && r.includes("if (!confirm) {") && r.includes("mode: 'DRY_RUN'"))
checa('coorte: trial encerrado, nunca pagou, opt-in, externo, não descartável', r.includes(".eq('trial_status', 'downgraded')") && r.includes("if (!email || p.email_opted_out || p.has_paid) continue") && r.includes("if (isInternalEmail(email) || isDisposableEmail(email)) continue"))
checa('frio ≥ 3 dias e uma carta por conta (carimbo)', r.includes("const COLD_DAYS = 3") && r.includes("export const STAMP = 'weekly_quota_sent'") && r.includes("!jaAvisado.has(z.id) && !quente.has(z.id)"))
checa('primeiro quem fez filme; &all=1 inclui o resto', r.includes("const includeNoFilm = req.nextUrl.searchParams.get('all') === '1'") && r.includes("(includeNoFilm || comVideo.has(z.id))"))
checa('lote limitado a 120', r.includes("const MAX_BATCH = 120") && r.includes("Math.min(limitParam, MAX_BATCH)"))
checa('NÃO concede crédito (só carimbo)', !r.includes("admin_credits_granted") && !r.includes("video_credits") )
checa('a carta separa as duas coisas: fala do plano grátis, e o Starter fica como opção com preço da casa', r.includes("the free plan now gives you") && r.includes("Starter is $9.90/month and you can cancel anytime"))
checa('link com campanha própria e cabeçalho de descadastro', r.includes("export const CAMPAIGN = 'weekly_quota_sep17'") && r.includes("headers: unsubscribeHeaders(a.id)"))
checa('reply-to na caixa profissional', r.includes("const REPLY_TO = 'joseph@usekineo.com'"))

const f = rd('lib/freeTierOffer.ts')
checa('a fonte única diz 7 dias', f.includes("export const FREE_FAST_WEEKLY_WINDOW_MS = 7 * DAY_MS") && f.includes("windowMs: FREE_FAST_WEEKLY_WINDOW_MS,"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
