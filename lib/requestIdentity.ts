// KINEO-QUEM-E-GENTE-2026-09-07 (fv-r10) — IDENTIDADE DE ORIGEM, PURA E SEM
// DEPENDÊNCIA DE BANCO.
//
// POR QUE ESTE ARQUIVO NASCEU. As três funções abaixo viviam dentro de
// `lib/gptHandoffStore.ts` e são exatamente o que o sink público de eventos
// precisa para separar visitante de varredor. Importar o store inteiro de lá
// arrastaria o cliente Supabase e a lógica da tabela de handoff para dentro de
// `app/api/events/route.ts` — e o guardião `scripts/test-sharing-safety.mjs`
// **reprovou isso na hora**, com a mensagem certa ("Unapproved import"): ele
// executa a rota de eventos numa caixa com lista fechada de dependências,
// justamente para o sink de analytics não virar porta de entrada de coisa
// pesada. O guardião estava certo e o conserto é este arquivo, não a lista.
//
// AS FUNÇÕES SÃO AS MESMAS, MOVIDAS SEM UMA VÍRGULA DE MUDANÇA. `gptHandoffStore`
// passa a reexportá-las, então todo chamador antigo continua funcionando e
// continua havendo UMA fonte da regra (memória `a-regra-vive-em-varios-arquivos`).
//
// A ÚNICA dependência é `crypto`, do próprio Node.

import { createHash } from 'crypto'

/** Primeiro IP de x-forwarded-for (o do cliente), fallback x-real-ip — o mesmo
 *  critério de lib/trialFingerprint.ts. Loopback/unknown = sem sinal.
 *
 *  ⚠️ Tolera `headers` ausente de propósito. Analytics NUNCA pode derrubar o
 *  caminho do usuário, e existe chamador (o próprio guardião de segurança) que
 *  monta uma requisição mínima sem cabeçalhos. Sem esta guarda, a ausência de
 *  `headers` viraria exceção e o evento deixaria de ser gravado em silêncio —
 *  o pior desfecho possível para uma medição. */
export function clientIp(headers: Headers | null | undefined): string | null {
  if (!headers || typeof headers.get !== 'function') return null
  const fwd = headers.get('x-forwarded-for')
  const first = fwd ? fwd.split(',')[0]?.trim() : ''
  const ip = first || (headers.get('x-real-ip') ?? '').trim()
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') return null
  return ip.slice(0, 64)
}

/** SHA-256(salt|ip). Nunca gravamos IP cru. Sem KINEO_TRIAL_FINGERPRINT_SALT
 *  no ambiente cai num pepper fixo — o hash continua não reversível na
 *  prática, só deixa de ser rotacionável; o rate limit precisa de ALGUM
 *  identificador para existir, então aqui, ao contrário do trial, não se
 *  desliga sem salt. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.KINEO_TRIAL_FINGERPRINT_SALT?.trim() || 'kineo-gpt-handoff-v1'
  try {
    return createHash('sha256').update(`${salt}|${ip}`).digest('hex')
  } catch {
    return null
  }
}

/** Varredor, pré-visualização de link e robô de segurança batem em URL sem
 *  humano por perto. Não bloqueamos — só etiquetamos (padrão episode-link). */
const ROBO = /(bot|crawler|spider|slurp|preview|scanner|monitor|curl|wget|python-requests|headless|proxy|fetcher|validator)/i
export function isLikelyBot(ua: string | null | undefined): boolean {
  if (!ua) return true
  return ROBO.test(ua)
}
