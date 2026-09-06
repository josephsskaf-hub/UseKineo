// KINEO-PORTA-DE-VOLTA-2026-09-06 — guardião da carta de checkout expirado.
//
// O QUE ELE PROTEGE, e por que cada item já custou caro nesta casa:
//  1. A CARTA SÓ SAI COM A PORTA NA MÃO. A promessa central dela é o link da
//     Stripe que reabre a MESMA sessão. Sem link, a carta viraria mais um
//     "volte pra gente". A condição é testada na FUNÇÃO que decide
//     (`escolherPortaDeVolta`), não na contagem de palavras do arquivo —
//     memória `guardiao-contar-texto-nao-prova-condicao`.
//  2. A PORTA DO PLANO EXISTE SEMPRE (regra K1: nada de pedágio).
//  3. NINGUÉM RECEBE DUAS VEZES e ninguém entra em duas campanhas.
//  4. O GATILHO EXISTE no vercel.json com `confirm=SEND` — carta sem gatilho
//     é rascunho (lição da #11 deste ciclo, que achou a carta mais quente da
//     casa parada por dois dias por isso).
//  5. O LINK NÃO É GRAVADO em `events`: é uma porta de pagamento pessoal.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/admin/send-checkout-recovery/route.ts'
const src = readFileSync(join(R, ROTA), 'utf8')
const vercel = JSON.parse(readFileSync(join(R, 'vercel.json'), 'utf8'))

let ok = 0
let bad = 0
const falha = (msg) => { bad++; console.error('  ✗ ' + msg) }
const passa = (msg) => { ok++; console.log('  ✓ ' + msg) }
const checa = (cond, msg) => (cond ? passa(msg) : falha(msg))

// ── 1. A DECISÃO, exercitada de verdade ────────────────────────────────────
// Reimplementar aqui seria criar uma segunda régua. Em vez disso, extraímos a
// função do arquivo real e a executamos: se alguém trocar a checagem de
// validade por `true`, ou esquecer os milissegundos, estes casos caem.
const corpo = src.match(/export function escolherPortaDeVolta\([\s\S]*?\n\}/)
if (!corpo) {
  falha('escolherPortaDeVolta não encontrada em ' + ROTA)
} else {
  const js = corpo[0]
    .replace(/export function/, 'function')
    // tipos TS fora; o comportamento é o que interessa
    .replace(/:\s*\{[^}]*\}\s*\|\s*null\s*\|\s*undefined/, '')
    .replace(/,\s*\n\s*agoraMs:\s*number,/, ', agoraMs')
    .replace(/\)\s*:\s*string \| null \{/, ') {')
  // eslint-disable-next-line no-new-func
  const escolher = new Function(js + '; return escolherPortaDeVolta')()

  const AGORA = Date.UTC(2026, 8, 6, 8, 0, 0) // 06/09/2026 08:00 UTC
  const VIVO = Math.floor(Date.UTC(2026, 9, 5, 15, 15, 0) / 1000) // 05/10 — real, do banco
  const MORTO = Math.floor(Date.UTC(2026, 7, 30, 0, 0, 0) / 1000) // 30/08

  checa(escolher({ url: 'https://checkout.stripe.com/c/pay/x', expires_at: VIVO }, AGORA) === 'https://checkout.stripe.com/c/pay/x',
    'link vivo (expira 05/10, hoje 06/09) é entregue')
  checa(escolher({ url: 'https://checkout.stripe.com/c/pay/x', expires_at: MORTO }, AGORA) === null,
    'link já expirado (30/08) é recusado — a carta não sai')
  checa(escolher({ url: null, expires_at: VIVO }, AGORA) === null,
    'sessão sem url de recuperação é recusada')
  checa(escolher(null, AGORA) === null,
    'sessão sem objeto recovery é recusada (Stripe muda de forma, a carta não sai)')
  checa(escolher({ url: 'https://x', expires_at: undefined }, AGORA) === 'https://x',
    'link sem data de validade é aceito (a Stripe nem sempre manda expires_at)')
  // A armadilha dos milissegundos: se alguém comparar `expires_at` direto com
  // Date.now(), TODO link parece morto e a campanha inteira vira zero calado.
  checa(escolher({ url: 'https://x', expires_at: VIVO }, AGORA) !== null,
    'segundos vs milissegundos: link de 2026 não é lido como 1970')
}

// ── 2. O laço de envio só percorre quem TEM porta ──────────────────────────
checa(/for \(const c of comPorta\)/.test(src),
  'o laço de envio percorre `comPorta`, nunca a lista bruta de candidatos')
checa(/const link = await portaDeVolta\(c\.sessionId\)\s*\n\s*if \(!link\) \{ semPorta\+\+; continue \}/.test(src),
  'quem não tem porta é contado e PULADO antes de entrar em comPorta')
checa(/comPorta\.push\(\{ \.\.\.c, recoveryUrl: link \}\)/.test(src),
  'a url que vai na carta é a que veio da Stripe, não uma montada aqui')
checa(!/recoveryUrl.*=\s*['"`]http/.test(src),
  'nenhuma url de checkout é digitada à mão no arquivo')

// ── 3. Regra K1 — a porta do plano existe sempre ───────────────────────────
checa(/function planoUrl\(\)/.test(src) && /planoUrl\(\)/.test(src.split('function planoUrl()')[1] ?? ''),
  'planoUrl existe e é usada (K1: quem quer ver preço consegue)')
checa((src.match(/planoUrl\(\)/g) ?? []).length >= 3,
  'a porta do plano aparece nas duas versões da carta (texto e html)')

// ── 4. Ninguém recebe duas vezes, ninguém entra em duas campanhas ──────────
checa(/const SENT_EVENT = 'checkout_recovery_emailed_v1'/.test(src),
  'carimbo próprio: checkout_recovery_emailed_v1')
checa(/\.eq\('name', SENT_EVENT\)/.test(src) && /ja\.has\(id\)/.test(src),
  'quem já recebeu esta carta é excluído')
checa(/'checkout_rescue_emailed_v1'/.test(src) && /outras\.has\(id\)/.test(src),
  'quem entrou em outra campanha (inclusive o resgate de 19/08) é excluído')
checa(/loadLifecycleSuppression/.test(src) && /sup\.isSuppressed/.test(src),
  'supressão de 24h aplicada')
checa(/const BLOQUEADOS = \['den\.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'\]/.test(src)
  && /isBloqueado\(e\)/.test(src),
  'os 4 contatos proibidos do ciclo estão bloqueados de verdade')
checa(/email_opted_out === true/.test(src), 'opt-out respeitado')
checa(/unsubscribeHeaders\(c\.id\)/.test(src), 'cabeçalho de descadastro em todo envio')
checa(/Math\.min\(limiteParam, 30\)/.test(src), 'teto de 30 por lote')

// ── 5. Autorização: duas portas, fail-closed ───────────────────────────────
checa(/if \(!cronSecret\) return false/.test(src),
  'sem CRON_SECRET a porta automática fecha (nunca vira rota pública)')
checa(/ADMIN_EMAILS\.has/.test(src), 'sessão de admin continua valendo')

// ── 6. O link pessoal não é gravado ────────────────────────────────────────
checa(!/recoveryUrl,/.test(src.split('await admin.from(\'events\').insert(')[1] ?? ''),
  'a url de pagamento pessoal NÃO é gravada em events')

// ── 7. O gatilho existe ────────────────────────────────────────────────────
const cron = (vercel.crons ?? []).find((c) => c.path.startsWith('/api/admin/send-checkout-recovery'))
checa(Boolean(cron), 'vercel.json tem o gatilho da rota')
checa(Boolean(cron) && cron.path.includes('confirm=SEND'),
  'o gatilho manda confirm=SEND (senão roda em DRY_RUN para sempre — bug de 01/09)')
checa(Boolean(cron) && /limit=30/.test(cron.path), 'o gatilho respeita o teto de 30')

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
