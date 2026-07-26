// KINEO-UNSUBSCRIBE-2026-07-26 — infraestrutura de descadastro.
//
// POR QUE ISSO EXISTE: até 26/07 nenhum email do Kineo tinha link de
// unsubscribe nem header List-Unsubscribe. Isso é violação de CAN-SPAM
// §7704(a)(3) (mecanismo de opt-out claro e funcional) e §7704(a)(5)
// (identificação do remetente), e é o que está queimando a reputação de
// usekineo.com. Enquanto não existir, nenhum disparo pode sair.
//
// DESIGN: o token é um HMAC do user id. Sem tabela extra, sem estado, sem
// expiração — um link de unsubscribe que "expira" é pior que inútil, porque a
// pessoa clica meses depois (é exatamente quando ela clica) e não sai.
//
// REGRA DE OURO DESTE ARQUIVO: NUNCA lançar exceção e NUNCA devolver string
// vazia. Um email sem link de descadastro é um problema legal; um token
// assinado com um segredo fraco é só um token fraco. Por isso o segredo tem
// cadeia de fallback e a última posição é um literal — o pior caso continua
// produzindo um link que funciona.
import { createHmac, timingSafeEqual } from 'node:crypto'

// Fallback final. Só é usado se NENHUMA das três env vars existir (dev local
// sem .env, preview sem secrets). Não protege contra nada, mas mantém o link
// de unsubscribe vivo, que é o objetivo.
const LAST_RESORT_SECRET = 'kineo-unsubscribe-v1'

const DEFAULT_BASE_URL = 'https://www.usekineo.com'

// joseph@usekineo.com é a caixa CONFIRMADAMENTE real no domínio (ver comentário
// em send-feature-announce e send-dfy-offer: hello@ pode não receber). O mailto
// do List-Unsubscribe precisa entregar de verdade, senão o header é decorativo.
const DEFAULT_UNSUBSCRIBE_MAILTO = 'joseph@usekineo.com'

/**
 * Cadeia de segredos, em ordem de preferência. UNSUBSCRIBE_SECRET é o ideal
 * (dedicado); CRON_SECRET já existe em produção; SUPABASE_SERVICE_ROLE_KEY
 * sempre existe em qualquer ambiente que consiga sequer consultar o banco.
 */
function suppressionSecret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    LAST_RESORT_SECRET
  )
}

function appBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL).trim()
  // Sem barra final, senão o path vira `//unsubscribe`.
  return raw.replace(/\/+$/, '') || DEFAULT_BASE_URL
}

function unsubscribeMailto(): string {
  return (process.env.UNSUBSCRIBE_MAILTO || DEFAULT_UNSUBSCRIBE_MAILTO).trim()
}

/**
 * HMAC-SHA256 do userId, truncado para 22 chars base64url.
 *
 * 22 chars base64url ≈ 132 bits — muito além do necessário para impedir que
 * alguém descadastre terceiros por força bruta, e curto o bastante para o link
 * não quebrar em cliente de email.
 *
 * O prefixo 'unsub:v1:' domain-separa o token: mesmo que CRON_SECRET seja
 * reusado para assinar outra coisa, um valor não vale como o outro.
 */
export function unsubscribeToken(userId: string): string {
  const id = (userId ?? '').trim()
  return createHmac('sha256', suppressionSecret())
    .update(`unsub:v1:${id}`)
    .digest('base64url')
    .slice(0, 22)
}

/**
 * Comparação em tempo constante. timingSafeEqual joga se os buffers tiverem
 * tamanhos diferentes, então o tamanho é conferido antes (isso vaza só o
 * comprimento do token, que é público e fixo).
 */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const provided = (token ?? '').trim()
  if (!provided) return false
  const expected = unsubscribeToken(userId)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Link humano (clique no rodapé do email) — aponta para a PÁGINA, não para a
 * API.
 *
 * Isso é deliberado e o repo já pagou por essa lição em outro lugar (ver
 * KINEO-CHECKOUT-TRIAGE-2026-07-25 em send-abandon-recovery): scanners
 * corporativos (Outlook Safe Links, Proofpoint, Mimecast) fazem GET em TODO
 * link do email antes de o humano ver. Se o link do rodapé executasse o
 * opt-out no GET, esses scanners descadastrariam a base inteira sozinhos.
 * A página só mostra um botão; o efeito colateral acontece no POST.
 */
export function unsubscribeUrl(userId: string): string {
  const id = (userId ?? '').trim()
  return `${appBaseUrl()}/unsubscribe?u=${encodeURIComponent(id)}&t=${encodeURIComponent(unsubscribeToken(id))}`
}

/**
 * URL da API, usada no header List-Unsubscribe.
 *
 * Precisa ser a rota de API e não a página porque o one-click do RFC 8058 faz
 * POST, e page.tsx do App Router não atende POST (405). Aqui o GET-por-scanner
 * não é risco: headers não são varridos por Safe Links, só o corpo do email.
 */
export function unsubscribeApiUrl(userId: string): string {
  const id = (userId ?? '').trim()
  return `${appBaseUrl()}/api/unsubscribe?u=${encodeURIComponent(id)}&t=${encodeURIComponent(unsubscribeToken(id))}`
}

/**
 * Rodapé pronto para colar no fim do corpo HTML de qualquer email.
 *
 * Cobre as duas exigências do CAN-SPAM que faltavam: mecanismo de opt-out
 * visível (§7704(a)(3)) e identificação inequívoca do remetente (§7704(a)(5)).
 * Também diz POR QUE a pessoa está recebendo — isso derruba taxa de "marcar
 * como spam", que é o que realmente destrói reputação de domínio.
 *
 * `theme`: os emails do repo têm dois visuais. A maioria é corpo claro
 * (#1e293b sobre branco); send-reminders é um documento completo com fundo
 * preto. O rodapé acompanha para não ficar ilegível.
 */
export function emailFooterHtml(userId: string, theme: 'light' | 'dark' = 'light'): string {
  const url = unsubscribeUrl(userId)
  const isDark = theme === 'dark'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textColor = isDark ? '#64748b' : '#94a3b8'
  const linkColor = isDark ? '#64748b' : '#94a3b8'

  return `
<div style="max-width:560px;margin:32px auto 0;padding-top:16px;border-top:1px solid ${border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${textColor};text-align:center">
  <p style="margin:0 0 6px;color:${textColor}">You're receiving this because you created a Kineo account.</p>
  <p style="margin:0;color:${textColor}">Kineo &middot; usekineo.com &middot; <a href="${url}" style="color:${linkColor};text-decoration:underline">Unsubscribe</a></p>
</div>`
}

/** Versão texto puro do rodapé, para o campo `text` do payload da Resend. */
export function emailFooterText(userId: string): string {
  return `\n\n—\nYou're receiving this because you created a Kineo account.\nKineo · usekineo.com\nUnsubscribe: ${unsubscribeUrl(userId)}`
}

/**
 * Headers de descadastro para o campo `headers` do POST em
 * https://api.resend.com/emails.
 *
 * List-Unsubscribe-Post + URL https = one-click do RFC 8058: Gmail e Outlook
 * mostram o botão "Unsubscribe" nativo ao lado do remetente e fazem POST
 * direto na URL, sem o usuário sair da caixa de entrada. É isso que converte
 * "marcou como spam" (que mata reputação) em "descadastrou" (que não mata).
 */
export function unsubscribeHeaders(userId: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeApiUrl(userId)}>, <mailto:${unsubscribeMailto()}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
