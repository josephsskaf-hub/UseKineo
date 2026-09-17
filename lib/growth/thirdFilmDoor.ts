// ═══ KINEO-PORTA-TERCEIRO-FILME-2026-09-17 — a jogada do segundo filme ═══════
//
// O NÚMERO (30 dias, lido em 17/09): 116 pessoas fizeram o 2º filme; 110 não
// pagavam; 92 saíram dele com menos de 5 créditos (87 com zero). Dessas 92, o
// caminho que existia era: "Make this one too" → modal genérico ("You're out
// of credits", 3 planos) → /pricing → nada. 20 abriram o modal, 19 chegaram ao
// checkout, 0 pagaram. A tela de preços recebe uma pessoa que acabou de VER o
// filme dela e lhe mostra uma tabela.
//
// A DECISÃO DO FUNDADOR (17/09, madrugada): "vamos fazer a jogada do segundo
// filme". A oferta acontece na tela do filme pronto, ao lado do filme que ela
// acabou de fazer e do título do próximo episódio que a casa já escreveu, com
// UM número (o que o Starter compra, em episódios como este), a garantia, e um
// botão que abre a Stripe direto — sem página de preços no meio.
//
// ESTA FUNÇÃO decide quem vê a porta. Pura: sem rede, sem React, testável a
// $0. As guardas, na ordem em que fecham a porta:
//   · o filme está entregue (phase done + URL);
//   · o histórico é confiável e diz que este é PELO MENOS o 2º filme
//     (`completedCount` conta o filme atual quando `historyReliable`);
//   · o servidor disse `has_paid === false` com todas as letras
//     (`notPaidProven` — memória: predicado largo negado falha aberta);
//   · o saldo é conhecido e NÃO paga o próximo episódio com a mesma
//     configuração (custo herdado > saldo). Custo 0 = Kineo 1 grátis, e aí
//     não há o que vender: a porta fica fechada;
//   · nenhuma das superfícies do trial ocupa o slot (dono nulo) — elas têm
//     precedência medida (lib/growth/postDeliverySlot.ts) e não se disputa;
//   · o episódio seguinte já está escrito (título na mão).
//
// O QUE ELA NÃO FAZ: não muda preço, não muda plano, não gera nada. Só decide
// se a caixa aparece e quantos episódios "como este" o Starter compra.

export const THIRD_FILM_DOOR_VERSION = 'third_film_door_v1' as const
export const THIRD_FILM_DOOR_TIER = 'starter' as const
export const THIRD_FILM_DOOR_MIN_COMPLETED = 2

export type ThirdFilmDoorReason =
  | 'eligible'
  | 'not_delivered'
  | 'history_unreliable'
  | 'before_second_film'
  | 'paid_or_unproven'
  | 'credits_unknown'
  | 'free_next_episode'
  | 'affordable'
  | 'slot_taken'
  | 'episode_not_written'

export interface ThirdFilmDoorInput {
  /** phase === 'done' && Boolean(finalVideoUrl) */
  delivered: boolean
  /** /api/videos: completedCount (inclui o filme atual) e historyReliable */
  completedCount: number | null
  historyReliable: boolean
  /** Servidor disse has_paid === false. false por padrão fecha a porta. */
  notPaidProven: boolean
  credits: number | null
  /** Custo do próximo episódio com a configuração herdada (motor + duração). */
  nextEpisodeCost: number
  /** Dono do slot pós-entrega (trial). Qualquer dono ≠ null fecha a porta. */
  slotOwner: string | null
  /** /api/next-episode já devolveu título + roteiro. */
  nextEpisodeReady: boolean
  /** TIER_CREDITS.starter — vem da fonte única, nunca digitado aqui. */
  starterCredits: number
}

export interface ThirdFilmDoorDecision {
  visible: boolean
  reason: ThirdFilmDoorReason
  /** Quantos episódios COMO ESTE o Starter compra por mês (0 quando fechada). */
  episodesOnStarter: number
  version: typeof THIRD_FILM_DOOR_VERSION
  tier: typeof THIRD_FILM_DOOR_TIER
}

function closed(reason: ThirdFilmDoorReason): ThirdFilmDoorDecision {
  return { visible: false, reason, episodesOnStarter: 0, version: THIRD_FILM_DOOR_VERSION, tier: THIRD_FILM_DOOR_TIER }
}

export function decideThirdFilmDoor(input: ThirdFilmDoorInput): ThirdFilmDoorDecision {
  if (!input.delivered) return closed('not_delivered')
  if (!input.historyReliable || !Number.isInteger(input.completedCount)) return closed('history_unreliable')
  if ((input.completedCount ?? 0) < THIRD_FILM_DOOR_MIN_COMPLETED) return closed('before_second_film')
  if (input.notPaidProven !== true) return closed('paid_or_unproven')
  if (typeof input.credits !== 'number' || !Number.isFinite(input.credits)) return closed('credits_unknown')
  if (!(input.nextEpisodeCost > 0)) return closed('free_next_episode')
  if (input.credits >= input.nextEpisodeCost) return closed('affordable')
  if (input.slotOwner !== null) return closed('slot_taken')
  if (!input.nextEpisodeReady) return closed('episode_not_written')
  const episodesOnStarter = Math.floor(input.starterCredits / input.nextEpisodeCost)
  if (episodesOnStarter < 1) return closed('affordable')
  return {
    visible: true,
    reason: 'eligible',
    episodesOnStarter,
    version: THIRD_FILM_DOOR_VERSION,
    tier: THIRD_FILM_DOOR_TIER,
  }
}

/** "12 more episodes like this one" / "1 more episode like this one". */
export function thirdFilmDoorCapacityLine(episodesOnStarter: number): string {
  return `${episodesOnStarter} more episode${episodesOnStarter === 1 ? '' : 's'} like this one every month`
}
