// KINEO-UPSELL-FILME15-2610 — opt-in for the complete version of this person's film.
export const FILM_COMPLETE_VERSION = 'upsell_filme15_2610_v1' as const
export const FILM_COMPLETE_CAMPAIGN = 'film15_full_version' as const
export const FILM_COMPLETE_TARGET_SECONDS = 35
export const FILM_COMPLETE_ENGINE = 'seedance' as const
export const FILM_COMPLETE_INTENT_EVENT = 'film15_full_intent' as const
export const FILM_COMPLETE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ═══ KINEO-VERSAO-COMPLETA-NUNCA-MUDA-1111 [CEO 11/11: defeito que quebrou cliente pagante] ═════════════════════════════
// O caso: nikolmishukov pagou US$ 15,92 em 29/10 pela versão completa. O roteirista respondeu 200, a régua do roteiro recusou
// (stillShort / sem marcadores / sem cenas / duração ≠ 35) e o pedido virou 'failed' NA PRIMEIRA recusa, sem rastro do motivo,
// sem nova tentativa e sem ninguém saber. Agora: (1) recusa de roteiro conta tentativa — até 3 escritas (a 1ª + 2 novas, com a
// instrução do tamanho), e só a 3ª recusa falha; (2) todo fim 'failed' e todo 402 de saldo grava evento de servidor com o motivo
// exato e avisa a casa (alertFounderOnce, a via dos pedidos pagos). As novas tentativas rodam pela fila que já existe (o robô
// de 48 h, retryPaidFilmCompleteIntents, e a página /film-complete): o pedido fica em 'starting' até a 3ª recusa.
export const FILM_COMPLETE_WRITER_ATTEMPTS = 3
export const FILM_COMPLETE_STUCK_EVENT = 'film_complete_stuck' as const
export const FILM_COMPLETE_WRITER_REJECTED_EVENT = 'film_complete_writer_rejected' as const
export type FilmCompleteWriterReason = 'still_short' | 'no_markers' | 'no_segments' | 'duration_mismatch' | 'writer_http_4xx'
export type FilmCompleteWriterVerdict =
  | { ok: true }
  | { ok: false; transient: true }
  | { ok: false; transient: false; reason: FilmCompleteWriterReason }

/** A régua do roteiro, na MESMA ordem de antes, agora com o motivo nomeado. 5xx/429 = passageiro (não conta tentativa). */
export function filmCompleteWriterVerdict(i: {
  httpOk: boolean; status: number; stillShort: unknown; hasMarkers: boolean; segments: number; targetSeconds: unknown; expectedSeconds: number
}): FilmCompleteWriterVerdict {
  if (!i.httpOk) return i.status >= 500 || i.status === 429 ? { ok: false, transient: true } : { ok: false, transient: false, reason: 'writer_http_4xx' }
  if (i.stillShort === true) return { ok: false, transient: false, reason: 'still_short' }
  if (!i.hasMarkers) return { ok: false, transient: false, reason: 'no_markers' }
  if (!(i.segments > 0)) return { ok: false, transient: false, reason: 'no_segments' }
  if (Number(i.targetSeconds) !== i.expectedSeconds) return { ok: false, transient: false, reason: 'duration_mismatch' }
  return { ok: true }
}

/** Depois de uma recusa: quantas escritas já houve e se o pedido segue ('starting') ou falha ('failed', só na 3ª). */
export function filmCompleteAfterRejection(previous: unknown): { attempts: number; state: 'starting' | 'failed' } {
  const before = typeof previous === 'number' && Number.isInteger(previous) && previous >= 0 ? previous : 0
  const attempts = before + 1
  return { attempts, state: attempts >= FILM_COMPLETE_WRITER_ATTEMPTS ? 'failed' : 'starting' }
}

/** A instrução do tamanho que vai junto da 2ª e da 3ª escrita (vazia na 1ª). Números do próprio roteirista, nunca digitados. */
export function filmCompleteWriterRetryNote(i: { attempt: number; reason: unknown; seconds: number; minWords?: unknown; words?: unknown }): string {
  if (!(i.attempt > 1)) return ''
  const min = typeof i.minWords === 'number' && i.minWords > 0 ? Math.round(i.minWords) : null
  const got = typeof i.words === 'number' && i.words >= 0 ? Math.round(i.words) : null
  const why = typeof i.reason === 'string' ? i.reason : 'rejected'
  return ` PREVIOUS DRAFT REJECTED (${why}${got !== null && min !== null ? `: ${got} of at least ${min} spoken words` : ''}). This is attempt ${i.attempt} of ${FILM_COMPLETE_WRITER_ATTEMPTS}. Write the COMPLETE ${i.seconds}-second script${min !== null ? ` with at least ${min} spoken words` : ''}, keeping the section markers (HOOK, MICRO REWARD, ESCALATION, PAYOFF) each on its own line.`
}

export type FilmCompleteState ='awaiting_payment' | 'waiting_entitlement' | 'starting' | 'processing' | 'completed' | 'failed' | 'unavailable'

export function filmCompletePaymentMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, string> {
  if (metadata?.film_complete_version !== FILM_COMPLETE_VERSION ||
      typeof metadata.film_complete_id !== 'string' || !FILM_COMPLETE_UUID.test(metadata.film_complete_id) ||
      typeof metadata.film_complete_source_video_id !== 'string' || !FILM_COMPLETE_UUID.test(metadata.film_complete_source_video_id)) return {}
  return {
    film_complete_id: metadata.film_complete_id,
    film_complete_source_video_id: metadata.film_complete_source_video_id,
    film_complete_version: FILM_COMPLETE_VERSION,
  }
}
