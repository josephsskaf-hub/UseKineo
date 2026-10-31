// ═══ KINEO-PUBLICAR-GANHAR-3110 — "Publish & earn": quem publica o filme ganha crédito quando alguém faz a própria versão ═══
//
// Por quê (lido em 31/10): em 30 dias, 0 filmes publicados pela tela de pronto (1 clique em publicar no mês inteiro). O
// "Make your own version" da /v/<id> (KINEO-REMIX-PAGINAS-3110) não tem plateia sem página publicada. Fundador 31/10:
// "vai publicar".
//
// A regra, honesta e igual na tela e no servidor:
//   · a página pública só nasce com o CLIQUE da pessoa (POST /api/video/visibility, source 'publish_earn');
//   · quando uma conta que chegou por esse filme (remix_signup, gravado só pelo servidor) TERMINA o primeiro filme, o
//     dono do filme de origem ganha REMIX_REWARD_CREDITS — uma vez por conta indicada, no máximo
//     REMIX_REWARD_MONTHLY_CAP por dono por mês do calendário (UTC), nunca para si mesmo, nunca para conta interna.
// Este arquivo é puro (vai para a tela e para o servidor). Quem paga é lib/publicarGanhar3110Server.ts, pelo cron
// /api/cron/remix-reward (dry-run sem ?confirm=SEND).

export const PUBLICAR_GANHAR_3110_VERSION = 'publicar_ganhar_3110'
export const REMIX_REWARD_CREDITS = 10
export const REMIX_REWARD_MONTHLY_CAP = 100
export const REMIX_REWARD_EVENT = 'remix_reward_granted'
export const REMIX_REWARD_PATH = '/api/cron/remix-reward'
/** published_via / source do clique na tela de pronto (aceito por /api/video/visibility). */
export const PUBLISH_EARN_SOURCE = 'publish_earn'

export const PUBLISH_EARN_COPY = {
  eyebrow: 'Publish & earn credits',
  headline: 'Publish your film',
  body: `Get ${REMIX_REWARD_CREDITS} credits each time someone makes their own version from it (up to ${REMIX_REWARD_MONTHLY_CAP} credits a month).`,
  fine: 'Nothing is public until you press the button. Credits arrive when the new person finishes their first film.',
  button: 'Publish my film',
  publishing: 'Publishing…',
  error: 'Could not publish. Nothing was made public — try again in a moment.',
  live: 'Your film is live',
  liveBody: `Share this link. When someone makes their own version and finishes their first film, you get ${REMIX_REWARD_CREDITS} credits.`,
} as const

/** Primeiro instante do mês do calendário (UTC) de `now`, em ISO. */
export function monthStartUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString()
}

/** E-mail na forma "mesma caixa": minúsculas, sem +etiqueta e, no Gmail, sem pontos. Vazio = sem e-mail. */
export function mailboxKey(email: string | null | undefined): string {
  const e = String(email ?? '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at <= 0 || at === e.length - 1) return ''
  let local = e.slice(0, at).split('+')[0]
  let domain = e.slice(at + 1)
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return local ? `${local}@${domain}` : ''
}

export type RemixRewardInput = {
  referredUserId: string | null | undefined
  ownerUserId: string | null | undefined
  ownerEmail?: string | null
  referredEmail?: string | null
  /** Filmes da conta indicada com status 'completed'. */
  referredCompletedFilms: number
  /** Já existe remix_reward_granted para esta conta indicada. */
  alreadyRewarded: boolean
  /** Créditos de remix já pagos a este dono no mês corrente. */
  ownerCreditsThisMonth: number
  /** Conta interna (fundador/teste) de qualquer um dos lados. */
  ownerInternal: boolean
  referredInternal: boolean
}

export type RemixRewardDecision =
  | { grant: true; credits: number }
  | { grant: false; reason: 'invalid' | 'self' | 'internal' | 'no_completed_film' | 'already_rewarded' | 'monthly_cap' }

export function decideRemixReward(i: RemixRewardInput): RemixRewardDecision {
  const referred = String(i.referredUserId ?? '').trim()
  const owner = String(i.ownerUserId ?? '').trim()
  if (!referred || !owner) return { grant: false, reason: 'invalid' }
  if (referred === owner) return { grant: false, reason: 'self' }
  const a = mailboxKey(i.ownerEmail), b = mailboxKey(i.referredEmail)
  if (a && b && a === b) return { grant: false, reason: 'self' }
  if (i.ownerInternal || i.referredInternal) return { grant: false, reason: 'internal' }
  if (i.alreadyRewarded) return { grant: false, reason: 'already_rewarded' }
  if (!(Number(i.referredCompletedFilms) >= 1)) return { grant: false, reason: 'no_completed_film' }
  const used = Math.max(0, Number(i.ownerCreditsThisMonth) || 0)
  if (used + REMIX_REWARD_CREDITS > REMIX_REWARD_MONTHLY_CAP) return { grant: false, reason: 'monthly_cap' }
  return { grant: true, credits: REMIX_REWARD_CREDITS }
}
