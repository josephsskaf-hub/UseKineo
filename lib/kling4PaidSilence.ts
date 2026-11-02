// KINEO-K4-PAGO-SILENCIO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — a régua do Kling 4 PAGO de 15 s.
// Defeito (02/11 20:54 UTC, c391673c): ideia em português → o escritor entregou 28 palavras (faixa do pago 27–31, KINEO-K4-PAGO-CABE-0211)
// e o portão KINEO-SILENCIO-NA-CENA recusou ANTES do despacho (422 plan_silence_inside_scenes: "cena 1 fica 1,8 s sem fala"). O portão
// julgava as cenas do PLANO (8 + 7 s) — mas o Kling 4 pago de 15 s NÃO tem cenas com fala própria: prepareKling4PaidFilm junta a fala
// inteira num clipe único de 15 s (scene_narrations: [tudo], scene_seconds: [15]).
// Aqui a régua julga o filme COMO ELE É DESPACHADO E MONTADO: UM clipe de 15 s com a fala inteira, na voz que a MONTAGEM vai usar
// (0211d: a voz é pinada no claim — host_voice — com a velocidade que encaixa a fala; régua e compose usam a mesma).
// 0211c (revisão): duas pontas, cada uma no lado seguro da incerteza da voz real (fator real ÷ nominal medido 0,87–0,93):
//   · SILÊNCIO (a fala não fica curta): passo nominal da voz × o fator RÁPIDO (0,93) — prever a voz mais rápida = mais silêncio
//     previsto. Clipe único: até 2,5 s de cauda (o "rabo congelado" antigo era ~8 s; ≤ 2,5 s é o fim ambiente do próprio clipe
//     Kling). Os outros motores seguem 1,5 s por cena.
//   · CABE (a fala não estoura a montagem DEPOIS de pagar a fal): passo nominal × o fator LENTO (0,87), contra o que o compose
//     aceita de fato (KINEO-FALA-CABE: fala + 0,4 s de respiro ≤ clipe × 1,1 de re-síntese) → recusa grátis ANTES do despacho.
import { K4_FATOR_REAL_PADRAO, K4_FATOR_REAL_POR_VOZ, K4_PAGO_SEGUNDOS } from '@/lib/kling4TrialScript'
import { resolveHollywoodVoice } from '@/lib/hollywood/hostVoice'
import type { NarrationLanguage } from '@/lib/textLanguage'
import type { OpenAIVoice } from '@/lib/narration/personas'

/** Fator real ÷ nominal mais RÁPIDO medido (alloy@0.9 = 0,93): o lado seguro da régua de silêncio. */
export const K4_PAGO_FATOR_REAL_RAPIDO = Math.max(...Object.values(K4_FATOR_REAL_POR_VOZ))
/** Fator real ÷ nominal mais LENTO medido (0,87): o lado seguro da régua de "cabe". */
export const K4_PAGO_FATOR_REAL_LENTO = K4_FATOR_REAL_PADRAO
/** Cauda muda tolerada no clipe único de 15 s (s). */
export const K4_PAGO_SILENCIO_MAX_S = 2.5
/** O que o compose aceita no clipe de 15 s (KINEO-FALA-CABE: respiro 0,4 s, re-síntese até × 1,1). */
export const K4_PAGO_FALA_MAX_S = Math.round((K4_PAGO_SEGUNDOS - 0.4) * 1.1 * 1000) / 1000

/** Passo nominal da voz (pal/s) — a MESMA conta do ritmoVoz da rota: 2,3 × velocidade da persona limitada a 0,85–1,1. */
export function ritmoNominalDaVoz(speed: number): number {
  return Math.round(2.3 * Math.max(0.85, Math.min(1.1, Number.isFinite(speed) ? speed : 1)) * 100) / 100
}

/** O filme usa a régua do clipe único? Só o Kling 4 pago de 15 s (um clipe, uma fala). */
export function usaReguaDoKling4Pago(a: { paidKling4: boolean; seconds: number }): boolean {
  return a.paidKling4 === true && a.seconds === K4_PAGO_SEGUNDOS
}

type CenaDoPlano = { type: string; voiceover?: string | null; dialogueLine?: string | null }

/** A fala que a rota entrega a prepareKling4PaidFilm (verbatim: a narração do roteiro; senão as falas do plano, em ordem). */
export function falaDoKling4Pago(a: { verbatim: boolean; narration?: string | null; scenes: readonly CenaDoPlano[] }): string {
  return a.verbatim
    ? String(a.narration ?? '')
    : a.scenes.map((s) => (s.type === 'dialogue' ? s.dialogueLine ?? s.voiceover ?? '' : s.voiceover ?? '')).join(' ')
}

// ═══ KINEO-K4-PAGO-SILENCIO-0211d [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — a voz PINADA com a velocidade que encaixa ═══
// 0211c mostrou que, na velocidade natural de cada persona, a faixa 27–31 só cabia inteira em 3 das 15 vozes (interseção vazia:
// fable@1.1 pede ≥ 30, alloy@0.9 aceita ≤ 28) — recusa grátis para a maioria dos clientes pagantes. Agora a voz do Kling 4 pago de
// 15 s é escolhida UMA vez (a persona que o compose escolheria: resolveHollywoodVoice(fala, língua, vertical), sem ficha) e pinada no
// claim (host_voice) com a velocidade que põe a fala em ~14 s de voz real: velocidade = palavras ÷ (14 × 2,3 × 0,90), limitada a
// 0,9–1,1 (natural). A régua do portão e o compose usam a MESMA voz e a MESMA velocidade (hollywoodVoiceFromClaim; sem re-escolha).
// Com a faixa 27–31 toda persona passa nas duas pontas; a recusa grátis fica só para fala que nem a velocidade limite encaixa.
/** Fala-alvo na voz real (s). */
export const K4_PAGO_FALA_ALVO_S = 14
/** Fator real ÷ nominal do meio da faixa medida (0,87–0,93): o alvo; as pontas seguem julgadas em 0,93 (silêncio) e 0,87 (estouro). */
export const K4_PAGO_FATOR_REAL_MEDIO = Math.round((K4_FATOR_REAL_PADRAO + Math.max(...Object.values(K4_FATOR_REAL_POR_VOZ))) / 2 * 1000) / 1000
/** Faixa natural da velocidade pinada. */
export const K4_PAGO_VELOCIDADE_MIN = 0.9
export const K4_PAGO_VELOCIDADE_MAX = 1.1

const centesimos = (n: number) => Math.round(n * 100) / 100

export interface VozPinadaDoKling4Pago {
  personaId: string; voice: OpenAIVoice
  /** A velocidade gravada no claim (host_voice.speed) — o compose multiplica pelo speed do cliente, se houver. */
  defaultSpeed: number
  /** A velocidade que a voz fala de fato (pinada × cliente): a que a régua julga. */
  efetiva: number
  /** A velocidade natural da persona (só rastro). */
  personaSpeed: number
}

/** A voz do Kling 4 pago de 15 s, escolhida uma vez e pinada com a velocidade que encaixa a fala no clipe. */
export function vozPinadaDoKling4Pago(a: { fala: string; language: string; vertical?: string; velocidadeDoCliente?: number | null }): VozPinadaDoKling4Pago {
  let persona: { personaId: string; voice: OpenAIVoice; defaultSpeed: number }
  try { persona = resolveHollywoodVoice(a.fala, a.language as NarrationLanguage, a.vertical) } catch { persona = { personaId: 'documentary', voice: 'echo', defaultSpeed: 0.96 } }
  const palavras = String(a.fala ?? '').trim().split(/\s+/).filter(Boolean).length
  const alvo = palavras / (K4_PAGO_FALA_ALVO_S * 2.3 * K4_PAGO_FATOR_REAL_MEDIO)
  const efetivaAlvo = centesimos(Math.max(K4_PAGO_VELOCIDADE_MIN, Math.min(K4_PAGO_VELOCIDADE_MAX, alvo)))
  const cliente = typeof a.velocidadeDoCliente === 'number' && Number.isFinite(a.velocidadeDoCliente) && a.velocidadeDoCliente > 0 ? Math.max(0.7, Math.min(1.3, a.velocidadeDoCliente)) : 1
  // o compose limita host_voice.speed a 0,7–1,3 (hollywoodVoiceFromClaim) e multiplica pelo speed do cliente
  const defaultSpeed = centesimos(Math.max(0.7, Math.min(1.3, efetivaAlvo / cliente)))
  return { personaId: persona.personaId, voice: persona.voice, defaultSpeed, efetiva: centesimos(defaultSpeed * cliente), personaSpeed: persona.defaultSpeed }
}

/** O campo host_voice do claim (o formato que hollywoodVoiceFromClaim lê no compose). */
export function hostVoiceDoKling4Pago(v: VozPinadaDoKling4Pago): { persona_id: string; voice: OpenAIVoice; speed: number } {
  return { persona_id: v.personaId, voice: v.voice, speed: v.defaultSpeed }
}

export interface ReguaDoKling4Pago {
  ok: boolean; perScene: number[]; total: number; worst: number; worstScene: number; wordsToAdd: number; totalMax: number
  /** A fala prevista na voz LENTA passa do que o compose aceita: recusa grátis antes do despacho. */
  estouro: boolean; falaLentaSegundos: number; palavras: number; palavrasMax: number; palavrasMin: number
}

/** Mínimo e máximo de palavras do clipe único numa velocidade de voz (as duas pontas da régua). */
export function faixaDaVozNoKling4Pago(speed: number): { min: number; max: number; ritmo: number } {
  const ritmo = ritmoNominalDaVoz(speed)
  let min = 1
  while (min < 200 && Math.round((K4_PAGO_SEGUNDOS - min / (ritmo * K4_PAGO_FATOR_REAL_RAPIDO)) * 10) / 10 > K4_PAGO_SILENCIO_MAX_S) min++
  const max = Math.floor(K4_PAGO_FALA_MAX_S * ritmo * K4_PAGO_FATOR_REAL_LENTO + 1e-9)
  return { min, max, ritmo }
}

/** A régua do Kling 4 pago de 15 s sobre a fala inteira, na velocidade da voz da montagem. */
export function reguaDoKling4Pago(a: { fala: string; speed: number }): ReguaDoKling4Pago {
  const palavras = String(a.fala ?? '').trim().split(/\s+/).filter(Boolean).length
  const { min, max, ritmo } = faixaDaVozNoKling4Pago(a.speed)
  const silencio = Math.max(0, Math.round((K4_PAGO_SEGUNDOS - palavras / (ritmo * K4_PAGO_FATOR_REAL_RAPIDO)) * 10) / 10)
  const falaLentaSegundos = Math.round(palavras / (ritmo * K4_PAGO_FATOR_REAL_LENTO) * 100) / 100
  const estouro = palavras > max
  const silencioOk = silencio <= K4_PAGO_SILENCIO_MAX_S
  return {
    ok: silencioOk && !estouro, perScene: [silencio], total: silencio, worst: silencio, worstScene: 1,
    wordsToAdd: silencioOk ? 0 : Math.max(1, min - palavras), totalMax: K4_PAGO_SILENCIO_MAX_S,
    estouro, falaLentaSegundos, palavras, palavrasMax: max, palavrasMin: min,
  }
}

/**
 * Segundos do filme que a régua de duração (plan_duration_below_request) julga. No Kling 4 pago de 15 s o plano NÃO é o filme:
 * prepareKling4PaidFilm reescala a linha do tempo do plano para o clipe único de 15 s (kling4PaidFallbackPrompts idem), então o
 * filme despachado tem sempre K4_PAGO_SEGUNDOS — o que decide se a fala enche o clipe é a régua acima. 02/11 21:14 UTC
 * (f37872b5, en, 26 palavras): fitCinematicPlanFloor estica cada cena só até ⌈palavras ÷ 2,3⌉ + 1 (passo nominal) e o plano de
 * 2 cenas parou em 14 s → 422 plan_duration_below_request antes do despacho. Fora do Kling 4 pago de 15 s: a soma do plano.
 */
export function segundosDoFilmeNaReguaDeDuracao(a: { paidKling4: boolean; seconds: number; plannedSeconds: number }): number {
  return usaReguaDoKling4Pago(a) ? K4_PAGO_SEGUNDOS : a.plannedSeconds
}
