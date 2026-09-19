// ═══ KINEO-RESGATE-RAPIDO-2026-09-19 — o resgate de render órfão deixa de esperar 12 min cegos ═══
//
// CASO (Axel, 19/09 01:00-01:31 BRT, Veo 60 s, 100 cr): apertou Generate, saiu da aba 3 min depois. As 6 cenas
// ficaram prontas no fal por volta de 01:04; a montagem só foi pedida às 01:15 (o cron finish-stranded-renders
// roda a cada 15 min e só olha claims com ≥ 12 min de idade) e o vídeo, pronto na Creatomate às 01:16, só foi
// gravado na conta e avisado por e-mail às 01:30 (fase 2, no tique seguinte). Duas esperas de ~13 min para um
// filme que já existia — e o painel dizia "navegando".
//
// Os 12 min existiam para não montar EM DOBRO com uma aba viva (a aba monta sozinha segundos depois das cenas).
// Agora a proteção é a BATIDA DE VIDA: /api/cinematic-clip-status (o polling da aba) grava cinematic_client_poll
// (1 linha/min/geração, dedupe). Sem batida nos últimos CLIENT_ALIVE_MS, a aba morreu — o cron pode agir com
// STRANDED_MIN_AGE_MS de idade. Cron passa a rodar a cada 5 min. Fundador: "vai nos 2 e me avisa quando subir".

export const CINEMATIC_CLIENT_POLL_EVENT = 'cinematic_client_poll'
export const CLIENT_POLL_DEDUPE_MINUTES = 1
/** Idade mínima do claim para o resgate olhar (as cenas do Veo/Seedance levam 2-4 min). */
export const STRANDED_MIN_AGE_MS = 4 * 60 * 1000
/** Batida de vida mais nova que isto = aba viva → o cron não mexe. */
export const CLIENT_ALIVE_MS = 3 * 60 * 1000
export const STRANDED_RESCUE_VERSION = 'resgate_rapido_v1'

export function clientStillAlive(lastPollMs: number | null | undefined, nowMs: number): boolean {
  if (typeof lastPollMs !== 'number' || !Number.isFinite(lastPollMs) || lastPollMs <= 0) return false
  return nowMs - lastPollMs < CLIENT_ALIVE_MS
}
