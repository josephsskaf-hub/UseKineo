// sprint-assinaturas #23 — 02/09/2026 — a ESCADA do e-mail de momentum.
//
// O e-mail `send-momentum-nudge` existe para levar a pessoa do vídeo 1 ao 4
// (1 vídeo → 0,33% assinam; 4-6 → 11,76%). Duas coisas no código contradiziam
// a própria tese dele:
//
// (1) O carimbo `momentum_nudge_sent` era 1× POR PESSOA PARA SEMPRE. Quem
//     recebia o e-mail no vídeo 1, fazia o 2º — o e-mail FUNCIONOU — e parava
//     no 2, nunca mais ouvia falar da casa até o trial acabar. A campanha
//     escrita para carregar até o 4º largava a pessoa no 1º degrau que ela
//     subia. Agora o carimbo é POR DEGRAU (metadata.videos, que o insert já
//     gravava): um e-mail no 1, outro no 2, outro no 3 — só se a pessoa SUBIU
//     (a contagem mudou), com folga mínima entre e-mails. Quem não sobe não
//     recebe de novo: parado no mesmo degrau = mesmo carimbo = silêncio.
//
// (2) A janela 20h-96h "desde o último vídeo" pressupõe cron rodando todo
//     dia. O cron nasceu DESARMADO (20/08 → 01/09, `?confirm=SEND` ausente) e
//     o 1º disparo real é 02/09 13:30 UTC. Medido 02/09 06:30 BRT (externos,
//     30d): 25 pessoas com 1-3 vídeos, ≥5cr, não pagantes, nunca carimbadas,
//     cujo último vídeo tem MAIS de 96h — passaram pela janela enquanto a
//     rota devolvia DRY_RUN e nunca vão receber nada. `resolveIdleWindow`
//     aceita um teto maior (`max_idle_h`, capado em 30 dias) para UMA rodada
//     de resgate por link de 1 clique do fundador; o cron diário continua com
//     96h porque o e-mail fala de "memória fresca".
//
// Módulo puro: sem rede, sem banco. A rota decide quem consulta; aqui só a
// regra. Falha fechada: dúvida = não manda.

export const MOMENTUM_MIN_IDLE_H = 20
export const MOMENTUM_MAX_IDLE_H = 96
/** Teto absoluto do resgate: 30 dias — a leitura de `videos` da rota já é 30d. */
export const MOMENTUM_RESCUE_MAX_IDLE_H = 30 * 24
/** Folga mínima entre dois e-mails de momentum para a MESMA pessoa (degraus
 *  diferentes). 7 dias: quem fez o 2º vídeo 3 dias depois do 1º e-mail espera
 *  a semana fechar — o e-mail não pode virar goteira. */
export const MOMENTUM_MIN_GAP_DAYS = 7
/** Degraus que o e-mail cobre: 1, 2 e 3 vídeos. No 4º a tese diz que a pessoa
 *  já virou; a partir daí é assunto de outra campanha. */
export const MOMENTUM_MAX_STEP = 3

export interface MomentumStamp {
  created_at: string
  /** `metadata.videos` gravado no insert — o degrau em que o e-mail saiu. */
  videos: number | null
}

export type MomentumSkip = 'same_step' | 'legacy_stamp' | 'too_soon' | null

/**
 * Por que NÃO mandar de novo para esta pessoa, ou null se pode mandar.
 * - `same_step`: já recebeu neste degrau (não subiu desde então).
 * - `legacy_stamp`: carimbo sem `videos` (não dá para saber o degrau) — falha
 *   fechada, trata como "já recebeu".
 * - `too_soon`: recebeu qualquer momentum há menos de MIN_GAP_DAYS.
 */
export function momentumSkipReason(
  stamps: MomentumStamp[],
  currentCount: number,
  nowMs: number,
  minGapDays = MOMENTUM_MIN_GAP_DAYS,
): MomentumSkip {
  if (!Number.isFinite(currentCount) || currentCount < 1 || currentCount > MOMENTUM_MAX_STEP) return 'same_step'
  let latest = 0
  for (const s of stamps) {
    const v = s.videos
    if (v == null || !Number.isFinite(v)) return 'legacy_stamp'
    if (v === currentCount) return 'same_step'
    // Carimbo em degrau ACIMA do atual = contagem regrediu (vídeo apagado ou
    // janela de 30d expirou): não é subida, não manda.
    if (v > currentCount) return 'same_step'
    const t = Date.parse(s.created_at)
    if (Number.isFinite(t) && t > latest) latest = t
  }
  if (latest > 0 && nowMs - latest < minGapDays * 24 * 3600_000) return 'too_soon'
  return null
}

/** "three" | "two" | "one" — quantos faltam para o 4º. Fora de 1..3 devolve null
 *  (a rota nunca deve chegar aqui com outro valor). */
export function videosAwayWord(count: number): 'three' | 'two' | 'one' | null {
  if (count === 1) return 'three'
  if (count === 2) return 'two'
  if (count === 3) return 'one'
  return null
}

export interface IdleWindow {
  minIdleH: number
  maxIdleH: number
  /** true quando o teto veio de `max_idle_h` (rodada de resgate). */
  rescue: boolean
}

/**
 * Janela de ociosidade da rodada. `rawMaxIdleH` é o `max_idle_h` da URL
 * (string ou null). Só ALARGA (nunca encurta abaixo de 96h) e nunca passa de
 * 30 dias. Valor inválido = janela padrão.
 */
export function resolveIdleWindow(rawMaxIdleH: string | null | undefined): IdleWindow {
  const base: IdleWindow = { minIdleH: MOMENTUM_MIN_IDLE_H, maxIdleH: MOMENTUM_MAX_IDLE_H, rescue: false }
  if (rawMaxIdleH == null || rawMaxIdleH === '') return base
  const n = Number(rawMaxIdleH)
  if (!Number.isFinite(n) || n <= MOMENTUM_MAX_IDLE_H) return base
  return { minIdleH: MOMENTUM_MIN_IDLE_H, maxIdleH: Math.min(Math.floor(n), MOMENTUM_RESCUE_MAX_IDLE_H), rescue: true }
}
