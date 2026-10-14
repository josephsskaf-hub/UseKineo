// KINEO-REGUA-35-60-90-1410 [TRAVA 8.2 — vai do fundador 14/10] — o roteiro de 35/60/90 s pedido SEM motor nasce na régua da
// voz que vai falar, não na histórica (2,3 pal/s × 0,95).
//
// QUEM PEDE SEM MOTOR: o "Write the full script" do /generate (handleWriteFullScript manda só topic, language,
// targetSeconds e forceAuthoring). Ele dispara depois de um 422 de narração curta — da rota do cinematic (Seedance 1.5,
// Kling 2.5, Veo 3.1, e a estrada de voz própria no verbatim) ou da rota do Kineo 1. O 15 s já foi para a régua do 15 s
// (lib/growth/motor15s motorDoEscritor, KINEO-MOTOR-15S-1510); 35/60/90 continuava em 2,3 × 0,95 = 81/132/197 palavras.
//
// A VOZ REAL (código de 14/10, não o número do documento):
//   · Seedance 1.5 / Kling 2.5 / Veo 3.1 / Kineo 1: OpenAI tts-1-hd com a persona (lib/compose generateTTS; lib/narration/
//     personas), e o portão de 95 % da rota mede no passo DELA (speechRateFor com voice + personaSpeed): 2,30 (dark-mystery,
//     onyx 0,92; luxury-narrator, alloy 0,90) a 2,81 pal/s (energetic-facts, fable 1,10). O 3,1 do documento é a base sem voz
//     conhecida, não a voz que fala. A MiniMax Speech-2.8 HD só entra como voz reserva num apagão da OpenAI (lib/ttsFallback).
//   · Kling 3 / H3 / H3 Max / S25: tts-1-hd também (lib/hollywood/hostVoice), régua 2,3 × velocidade da voz (0,85–1,1).
//   · Medido (render_delivered_measured, 30 dias, palavras ÷ segundos do MP4 — o filme é ≥ a fala, então é PISO do passo):
//     Seedance 2,55–2,75 · Kling 2.5 2,24–2,33 · Veo 2,46 · Kineo 1 2,81–2,85.
//
// O MOTOR NÃO É CONHECIDO AQUI (o pedido não diz) — então a régua do motor PADRÃO do fluxo: o Seedance 1.5 (a rota do
// cinematic assume Seedance sem `engine`; é o motor da 1ª impressão, com o Kineo 1, e é o do único caso de 35/60/90 dos
// últimos 30 dias: 60 s, Seedance, 89 palavras entregues para um piso de 132). A voz dele é a persona da casa, escolhida
// pelo roteiro PRONTO — que ainda não existe. Por isso o piso é o da persona MAIS RÁPIDA (fastestClassicPersonaRate, a
// mesma do Kineo 1) com a cobertura do portão (0,95): com qualquer voz real da casa, clássica ou de voz própria, a fala
// cobre ≥ 95 % da duração. Com voz lenta o filme passa do alvo — "passar do alvo é bom; ficar abaixo é defeito" — e nada
// corta: o texto da autoria tem os marcadores, vai verbatim, e o compose não reescala verbatim (claim verbatim).
//   35 s → 94 palavras · 60 s → 161 · 90 s → 241 (en; o teto sugerido segue 1,2 × o piso, como em todo motor).
// Com motor, ou alvo curto: null — a rota segue exatamente como antes.
import { MIN_COVERAGE } from '@/lib/narrationFit'
import { fastestClassicPersonaRate, type WriterRate } from '@/lib/scriptWriterRate'

export const REGUA_35_60_90_VERSION = 'regua_35_60_90_1410' as const

/** A régua do escritor para o pedido SEM motor e alvo longo (35/60/90 s); null com motor ou no filme curto. */
export function reguaSemMotorLonga(engine: unknown, filmeCurto: boolean, language: string): WriterRate | null {
  const semMotor = engine === undefined || engine === null || (typeof engine === 'string' && engine.trim() === '')
  if (!semMotor || filmeCurto) return null
  const rapida = fastestClassicPersonaRate(language)
  return { wordsPerSecond: rapida.wordsPerSecond, family: 'classic', voice: rapida.voice, coverage: MIN_COVERAGE }
}
