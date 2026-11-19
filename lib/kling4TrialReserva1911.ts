// ═══ KINEO-RESERVA-GRATIS-1911 [CEO 19/11, Frente 1] — menos filmes grátis caindo do Kling 4 para a reserva H3 Turbo ═══
// Banco, 12 a 18/11: 9 de 58 filmes grátis foram à reserva. Narração sem medida 3, fala acima de 15 s 2, falha do fornecedor 2,
// tempo esgotado 2. Três consertos, cada um com o seu interruptor (false = o caminho de antes, byte a byte):
//  (a) K4_MEDIR_SEMPRE_1911 — as 3 "sem medida" (8ee1cd8d, e9cff0bd, 4ff35049) eram roteiro NÃO literal sem `speed:`: a montagem
//      reescreve esse texto por um modelo antes da voz (scaleVoiceoverScript), então não havia o que medir. Agora a rota mede o
//      texto como está, a 1,0, e, SE o filme for ao Kling 4, assina `speed: 1` no claim: a montagem fala exatamente o que foi
//      medido (sem reescrever nem re-sintetizar). Fala medida abaixo de 12 s fica no caminho de antes (a reserva reescreve e
//      enche os 15 s), com o motivo 'narration_short_unscaled_kling4'. Nada muda para roteiro literal, roteiro com `speed:` ou pago.
//  (b) K4_ENCAIXE_INSISTE_1911 — nas 2 "acima de 15 s" (5bc6d6b9, defd272c) o encurtamento desistiu na 1ª resposta ruim do modelo
//      ('encurtado_reprovado'). Agora resposta reprovada ou vazia gasta uma rodada (das 3, dentro dos 30 s) e o modelo é chamado de
//      novo com o MESMO texto; a régua (encaixeServe) e a voz medida continuam decidindo. O evento diz qual regra reprovou.
//  (c) K4_ESPERA_QUEM_RODA_1911 — no prazo de 8 min a reserva saía sem perguntar à fal (o Kling 4 grátis leva p50 4,6 min, p90 6,3,
//      máx 7,8 em 77 filmes). Agora, no prazo, UMA consulta de status (grátis): pronto → entrega o Kling 4; falhou → reserva por
//      falha; ainda RODANDO (IN_PROGRESS) → espera até mais 4 min; na fila ou passou disso → reserva por tempo, como antes.
//      Reenviar o Kling 4 (2ª compra) NÃO está aqui: ver docs/reserva-gratis-1911/NOVA-TENTATIVA-KLING4.md.
// Selo honesto: nada aqui escolhe motor por nome nem mexe no débito; o motor gravado continua sendo o que rodou.
import type { FalaK4 } from '@/lib/kling4TrialScript'

export const K4_MEDIR_SEMPRE_1911: boolean = false // DESLIGADO (CEO 19/11): +US$ 1,97 por filme (~US$ 5,9/semana); liga só com o sim do dono
// K4_ENCAIXE_INSISTE_1911 mora em lib/kling4TrialEncaixe.ts (o guardião antigo do encaixe carrega aquela lib sozinha).
export const K4_ESPERA_QUEM_RODA_1911: boolean = true
/** (a) Abaixo disso a fala NÃO reescrita deixaria o filme de 15 s mudo no fim: fica no caminho de antes (o mesmo piso do encaixe). */
export const K4_PISO_DA_FALA_SEM_ESCALA_SEGUNDOS = 12 // CEO 19/11: era 10; abaixo de 12 s o último plano fica com 3+ s sem voz (o silêncio vai inteiro para ele): reabre com número depois do A1
/** (c) Quanto a mais se espera um Kling 4 que a fal diz estar rodando, depois dos 8 min. */
export const K4_ESPERA_EXTRA_MS = 4 * 60_000
export const MOTIVO_FALA_CURTA_SEM_ESCALA = 'narration_short_unscaled_kling4' as const

/** (a) O filme grátis cuja fala a montagem reescreveria (não literal e sem `speed:` do roteiro) passa a ser medido a 1,0. */
export function velocidadeFixadaParaMedir(a: { ligado?: boolean; candidato: boolean; verbatim: boolean; speed: unknown }): boolean {
  if (!(a.ligado ?? K4_MEDIR_SEMPRE_1911) || !a.candidato || a.verbatim) return false
  return !(typeof a.speed === 'number' && Number.isFinite(a.speed) && a.speed > 0)
}

/** (a) Medida a 1,0 e curta demais para os 15 s: não vai ao Kling 4 (o caminho de antes reescreve e enche). */
export function falaCurtaSemEscala(fala: FalaK4, fixada: boolean): FalaK4 {
  if (!fixada || !fala.cabe || typeof fala.seconds !== 'number' || fala.seconds >= K4_PISO_DA_FALA_SEM_ESCALA_SEGUNDOS) return fala
  return { ...fala, cabe: false, reason: MOTIVO_FALA_CURTA_SEM_ESCALA }
}

/** (a) O `speed` assinado no claim: 1 só quando a medida foi a 1,0 E o filme foi ao Kling 4; senão o do roteiro (o de antes). */
export function velocidadeAssinadaNoClaim(a: { fixada: boolean; foiAoKling4: boolean; speed: unknown }): unknown {
  return a.fixada && a.foiAoKling4 ? 1 : a.speed
}

/** (c) No prazo de 8 min: o que fazer com o status que a fal acabou de dar. */
export type DecisaoNoPrazo = 'kling_done' | 'provider_failed' | 'esperar' | 'timeout'
export function decisaoNoPrazoDoKling4(a: { status: 'pending' | 'processing' | 'done' | 'failed'; temUrl: boolean; idadeMs: number; prazoMs: number }): DecisaoNoPrazo {
  if (a.status === 'done' && a.temUrl) return 'kling_done'
  if (a.status === 'failed') return 'provider_failed'
  if (a.status === 'processing' && a.idadeMs < a.prazoMs + K4_ESPERA_EXTRA_MS) return 'esperar'
  return 'timeout'
}
