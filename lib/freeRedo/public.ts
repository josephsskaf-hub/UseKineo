// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — as constantes da refação grátis que a
// TELA também lê (sem node:crypto, para caber no pacote do navegador). lib/freeRedo/core.ts reexporta daqui: uma fonte só.

/** Qualidades (motores) cobertas: a família clássica (Seedance 1.5, Kling 2.5, Veo 3.1), que guarda o payload exato da fal por cena. */
export const FREE_REDO_FILM_QUALITIES: readonly string[] = ['cinematic_ai', 'cinematic_kling', 'cinematic_veo']
export const FREE_REDO_FILM_PATH = '/api/free-redo/film'

/** Só filmes montados a partir daqui têm o RenderScript guardado (o compose passou a gravar neste deploy). */
export const FREE_REDO_SINCE_ISO = '2026-10-19T00:00:00Z'

export function filmQualityCovered(quality: unknown): boolean {
  return typeof quality === 'string' && FREE_REDO_FILM_QUALITIES.includes(quality)
}

/** A tela só pergunta ao servidor pelos filmes que PODEM ter a refação (motor coberto e montados depois do deploy). */
export function filmMayHaveFreeRedo(quality: unknown, createdAt: unknown): boolean {
  if (!filmQualityCovered(quality)) return false
  const t = Date.parse(String(createdAt ?? ''))
  return !Number.isFinite(t) || t >= Date.parse(FREE_REDO_SINCE_ISO)
}
