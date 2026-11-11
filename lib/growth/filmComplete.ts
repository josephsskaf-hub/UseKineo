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

// ═══ KINEO-VERSAO-COMPLETA-STARTER-1111 [CEO 11/11, decisão do FUNDADOR — só publica com o sim dele] ═══════════════════
// A "versão completa do seu filme" aponta para o STARTER (US$ 9/mês), não para o Creator (US$ 19/mês). O filme que ela
// promete — 35 s no motor 'seedance' (cinematic_ai) — custa creditCostForDuration('cinematic_ai', true, 35) = 21 créditos;
// o Starter dá 40 (TIER_CREDITS.starter). O Creator vira a 2ª opção ao lado ("want more films?").
// Medido 11/11 (30 dias): 23 das 79 desistências do checkout vieram desta oferta, todas vendo US$ 19/mês; 45 viram, 10
// clicaram, 1 pagou (e cancelou). Preço nenhum muda; não é avulso.
// Volta: KINEO_VERSAO_COMPLETA_STARTER_1111 = 'off' → o botão volta ao Creator e a 2ª opção some. Os DOIS planos seguem
// aceitos no checkout, no pagamento e no início do filme, para nenhuma sessão já aberta (Starter ou Creator) quebrar.
export const KINEO_VERSAO_COMPLETA_STARTER_1111 = 'on' as 'on' | 'off'
export const FILM_COMPLETE_OFFER_VERSION = 'versao_completa_starter_1111'
export type FilmCompleteOfferTier = 'starter' | 'basic'

/** O plano que o botão principal da oferta abre. 'on' = Starter; 'off' = Creator (o de 26/10 a 11/11). */
export function filmCompleteOfferTier(chave: 'on' | 'off' = KINEO_VERSAO_COMPLETA_STARTER_1111): FilmCompleteOfferTier {
  return chave === 'on' ? 'starter' : 'basic'
}

/** O plano pedido no link: `plan=creator` = a 2ª opção (Creator); qualquer outra coisa = o plano do botão principal. */
export function filmCompleteRequestedTier(plan: unknown, chave: 'on' | 'off' = KINEO_VERSAO_COMPLETA_STARTER_1111): FilmCompleteOfferTier {
  return plan === 'creator' ? 'basic' : filmCompleteOfferTier(chave)
}

/** Planos cujo checkout mensal compra a versão completa (checkout + pagamento). Os dois, sempre — independe do interruptor. */
export function filmCompletePaidTier(tier: unknown): tier is FilmCompleteOfferTier {
  return tier === 'starter' || tier === 'basic'
}

/** Planos que liberam o filme completo depois de pagar (o início lê profiles.plan). Starter entra; a lista antiga continua. */
export const FILM_COMPLETE_ENTITLED_PLANS: readonly string[] = ['starter', 'basic', 'creator', 'pro', 'studio']

/** O que as impressões e o clique gravam: o plano MOSTRADO e a versão — o corte antes/depois, nunca o relógio. */
export function filmCompleteOfferMetadata(chave: 'on' | 'off' = KINEO_VERSAO_COMPLETA_STARTER_1111): { offer_tier: FilmCompleteOfferTier; offer_version: string } {
  return { offer_tier: filmCompleteOfferTier(chave), offer_version: FILM_COMPLETE_OFFER_VERSION }
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
