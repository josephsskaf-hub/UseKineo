// KINEO-K4-PAGO-SILENCIO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — a régua de silêncio do Kling 4 PAGO de 15 s.
// Defeito (02/11 20:54 UTC, c391673c): ideia em português → o escritor entregou 28 palavras (faixa do pago 27–31, KINEO-K4-PAGO-CABE-0211)
// e o portão KINEO-SILENCIO-NA-CENA recusou ANTES do despacho (422 plan_silence_inside_scenes: "cena 1 fica 1,8 s sem fala"). O portão
// julgava as cenas do PLANO (8 + 7 s) no passo nominal da voz pinada (ritmoVoz = 2,3 × 0,96 = 2,21 pal/s para echo@0.96, a voz de
// pt/es documentário) — mas o Kling 4 pago de 15 s NÃO tem cenas com fala própria: prepareKling4PaidFilm junta a fala inteira num
// clipe único de 15 s (scene_narrations: [tudo], scene_seconds: [15]). E a faixa do escritor foi medida na voz REAL (2,3 × língua ×
// K4_FATOR_REAL_PADRAO 0,87 = 2,0 pal/s; echo@0.96 medida: 0,89 → 1,97 pal/s). O inglês passou (27 palavras, dc79fc17) só porque a
// voz dele era alloy@0.9 (ritmoVoz 2,07). Resultado: pt/es na faixa 27–31 recusavam por sorte da divisão do plano.
// Aqui a régua julga o filme COMO ELE É DESPACHADO: UM clipe de 15 s com a fala inteira, no MESMO passo real da faixa. Os limites da
// régua (1,5 s por cena, 8 s no total) não mudam. Só o Kling 4 pago de 15 s; 30/60 s e os outros motores seguem a régua de sempre.
import { RITMO_HOLLYWOOD, fatorDoRitmoDoIdioma } from '@/lib/durationByEngine'
import { K4_FATOR_REAL_PADRAO, K4_PAGO_SEGUNDOS } from '@/lib/kling4TrialScript'
import type { SilenceScene } from '@/lib/cinematic/timelineContract'

/** Passo REAL previsto da voz no Kling 4 pago (pal/s) — a mesma conta do teto de faixaDoKling4PagoNoEscritor. */
export function passoRealDoKling4Pago(language: string | null | undefined): number {
  const lang = typeof language === 'string' && language.trim() ? language.trim().toLowerCase() : 'en'
  return RITMO_HOLLYWOOD * fatorDoRitmoDoIdioma(lang) * K4_FATOR_REAL_PADRAO
}

/** O filme usa a régua do clipe único? Só o Kling 4 pago de 15 s (um clipe, uma fala). */
export function usaReguaDoKling4Pago(a: { paidKling4: boolean; seconds: number }): boolean {
  return a.paidKling4 === true && a.seconds === K4_PAGO_SEGUNDOS
}

type CenaDoPlano = { type: string; voiceover?: string | null; dialogueLine?: string | null }

/**
 * O filme como o Kling 4 pago de 15 s o despacha: UMA cena de 15 s com a fala inteira — a mesma fala que a rota entrega a
 * prepareKling4PaidFilm (verbatim: a narração do roteiro; senão as falas do plano, em ordem).
 */
export function filmeDoKling4PagoParaARegua(a: { verbatim: boolean; narration?: string | null; scenes: readonly CenaDoPlano[] }): SilenceScene[] {
  const fala = a.verbatim
    ? String(a.narration ?? '')
    : a.scenes.map((s) => (s.type === 'dialogue' ? s.dialogueLine ?? s.voiceover ?? '' : s.voiceover ?? '')).join(' ')
  return [{ type: 'cinematic', seconds: K4_PAGO_SEGUNDOS, voiceover: fala }]
}

/**
 * Segundos do filme que a régua de duração (plan_duration_below_request) julga. No Kling 4 pago de 15 s o plano NÃO é o filme:
 * prepareKling4PaidFilm reescala a linha do tempo do plano para o clipe único de 15 s (kling4PaidFallbackPrompts idem), então o
 * filme despachado tem sempre K4_PAGO_SEGUNDOS — o que decide se a fala enche o clipe é a régua de silêncio acima. 02/11 21:14 UTC
 * (f37872b5, en, 26 palavras): fitCinematicPlanFloor estica cada cena só até ⌈palavras ÷ 2,3⌉ + 1 (passo nominal) e o plano de
 * 2 cenas parou em 14 s → 422 plan_duration_below_request antes do despacho. Fora do Kling 4 pago de 15 s: a soma do plano.
 */
export function segundosDoFilmeNaReguaDeDuracao(a: { paidKling4: boolean; seconds: number; plannedSeconds: number }): number {
  return usaReguaDoKling4Pago(a) ? K4_PAGO_SEGUNDOS : a.plannedSeconds
}
