// KINEO-CREDITO-EM-MINUTOS-2026-09-25 — decisão do fundador ("minutos"): a moeda continua o crédito universal, mas a
// TELA traduz crédito em tempo de vídeo por motor. Fonte única: o mesmo creditCostForDuration que cobra o render.
// Nada aqui muda preço; é só leitura da régua que já existe.
import { creditCostForDuration, DURATION_REFERENCE_SECONDS, type Quality } from '@/lib/credits/engineCost'

export interface EngineMinutes { quality: Quality; label: string; creditsPerMinute: number; minutes: number }

/** Motores mostrados na tradução, do mais barato ao mais caro (nomes públicos do site). */
export const MINUTE_ENGINES: ReadonlyArray<{ quality: Quality; label: string }> = [
  { quality: 'fast', label: 'Kineo 1' },
  { quality: 'cinematic_ai', label: 'Seedance 1.5' },
  { quality: 'cinematic_kling', label: 'Kling 2.5' },
  { quality: 'cinematic_veo', label: 'Veo 3.1' },
  { quality: 'cinematic_hollywood', label: 'Kling 3' },
]

/** Quantos minutos de vídeo pago um saldo de créditos rende em cada motor (arredondado para baixo, meio minuto). */
export function creditsToMinutes(credits: number, engines = MINUTE_ENGINES): EngineMinutes[] {
  const saldo = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0
  return engines.map(({ quality, label }) => {
    const creditsPerMinute = creditCostForDuration(quality, true, DURATION_REFERENCE_SECONDS)
    const minutes = creditsPerMinute > 0 ? Math.floor((saldo / creditsPerMinute) * 2) / 2 : 0
    return { quality, label, creditsPerMinute, minutes }
  })
}

/** "30 min of Kineo 1 · 6 min of Seedance 1.5 · 1 min of Kling 3" — só os motores que rendem ao menos meio minuto. */
export function minutesLine(
  credits: number,
  pick: Quality[] = ['fast', 'cinematic_ai', 'cinematic_hollywood'],
  format: (engine: EngineMinutes) => string = (e) => `${Number.isInteger(e.minutes) ? e.minutes : e.minutes.toFixed(1)} min of ${e.label}`,
): string {
  return creditsToMinutes(credits)
    .filter((e) => pick.includes(e.quality) && e.minutes >= 0.5)
    .map(format)
    .join(' · ')
}
