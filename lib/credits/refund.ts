// AUTO-REFUND (TAAFT reviewer feedback) — when a render FAILS after credits
// were debited, give them back automatically instead of routing the user to
// support. All refunds go through the refund_render_credits SQL function
// (SECURITY DEFINER, service_role-only), which claims the credit_debits row
// with a conditional UPDATE (WHERE refunded_at IS NULL ... RETURNING) — the
// same race-safe pattern as referral qualify — so a render can NEVER be
// refunded twice, no matter how many polls/tabs/crons race.
//
// Ledger key conventions (credit_debits.render_id):
//   <creatomate-id>        — main pipeline (compose/status, debit on SUCCESS)
//   animate-<falRequestId> — Animate feature (upfront debit)
//   legacy-<creatomate-id> — legacy /api/render path (upfront debit)
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { COMPOSE_CLAIM_EVENT } from '@/lib/composeClaim'
import { CINEMATIC_CLAIM_EVENT, releaseCinematicClaim } from '@/lib/cinematic/claim'
// KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — ver o bloco do estorno em lib/reverseTrial.ts.
import { recordReverseTrialRefundForRender } from '@/lib/reverseTrial'

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[refund] service-role env missing — refunds disabled')
    return null
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Refund whatever was debited for this render (video OR avatar credits —
 * the ledger row's `kind` decides which balance gets the credits back).
 * Idempotent: returns the amount refunded, or 0 when there is no debit for
 * this render or it was already refunded. Never throws.
 */
export async function refundRenderCredits(renderId: string): Promise<number> {
  const id = (renderId ?? '').trim()
  if (!id) return 0
  const db = adminClient()
  if (!db) return 0
  try {
    const { data, error } = await db.rpc('refund_render_credits', { p_render: id })
    if (error) {
      console.error(`[refund] RPC error render=${id}:`, error.message)
      return 0
    }
    const amount = typeof data === 'number' ? data : 0
    if (amount > 0) {
      console.log(`[refund] auto-refunded ${amount} credits for render=${id}`)
      // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — o teto segue o dinheiro. O RPC só
      // devolve amount > 0 para o ÚNICO chamador que reivindicou a linha (UPDATE
      // condicional em refunded_at), então isto roda uma vez por estorno; e a
      // própria contabilidade é idempotente pela linha do ledger. Nunca lança e
      // NUNCA altera o valor devolvido: dinheiro de volta não pode falhar por
      // causa de contabilidade de trial.
      try {
        await recordReverseTrialRefundForRender(id)
      } catch (e) {
        console.error(`[refund] trial cap release non-fatal render=${id}:`, e instanceof Error ? e.message : String(e))
      }
    }
    return amount
  } catch (e) {
    console.error(`[refund] threw render=${id}:`, e instanceof Error ? e.message : String(e))
    return 0
  }
}

/**
 * Backstop sweep — roda de HORA EM HORA desde KINEO-CREDIT-STUCK-2026-08-08
 * (era 1×/dia; ver o cabeçalho de app/api/cron/refund-sweep/route.ts para o
 * porquê e o custo). Encontra `video` debits mais velhos que 2h que nunca
 * produziram uma linha em `videos` (a SUCCESS row always carries render_id —
 * the #357 hard guarantee) and refunds them.
 *
 * Excluded on purpose:
 *   animate-% — Animate clips never persist to `videos`, so "no videos row"
 *               is their NORMAL success state; sweeping them would refund
 *               successful clips. Their failures are refunded live by
 *               /api/avatar-status instead.
 *   legacy-%  — same reason: the legacy /api/render path never persists to
 *               `videos`. Its failures are refunded live by /api/render/[id].
 *   gesture-% — KINEO-GESTURE-2026-07-10: transparent gesture clips never
 *               persist to `videos` (the WebM IS the product, no compose).
 *               Their failures are refunded live by /api/gesture-clip-status.
 *   cinematic-% — cinematic birth jobs debit before authenticated Fal polling;
 *                 their final video uses a different Creatomate render id, so
 *                 the "no videos row keyed by render_id" test above would
 *                 refund every SUCCESSFUL cinematic render. They are swept by
 *                 sweepAbandonedCinematicDebits() below instead, which maps
 *                 the birth claim to its compose render id before deciding.
 *   avatar-% — avatar birth jobs also debit before authenticated Fal polling;
 *              their final compose uses another render id. Fal failures are
 *              refunded live by /api/avatar-status.
 */
export async function sweepStuckRenderDebits(): Promise<{
  scanned: number
  refunded: number
  creditsReturned: number
}> {
  const result = { scanned: 0, refunded: 0, creditsReturned: 0 }
  const db = adminClient()
  if (!db) return result

  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: debits, error } = await db
    .from('credit_debits')
    .select('render_id, amount')
    .eq('kind', 'video')
    .is('refunded_at', null)
    .lt('created_at', cutoff)
    .not('render_id', 'like', 'animate-%')
    .not('render_id', 'like', 'legacy-%')
    // KINEO-GESTURE-2026-07-10 — success = no videos row (normal); live
    // failure refunds happen in /api/gesture-clip-status.
    .not('render_id', 'like', 'gesture-%')
    .not('render_id', 'like', 'cinematic-%')
    .not('render_id', 'like', 'avatar-%')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[refund/sweep] debit query failed:', error.message)
    return result
  }
  const candidates = debits ?? []
  result.scanned = candidates.length
  if (candidates.length === 0) return result

  // A completed render ALWAYS has a videos row keyed by render_id (#357).
  const { data: vids, error: vidErr } = await db
    .from('videos')
    .select('render_id')
    .in('render_id', candidates.map((d) => d.render_id))
  if (vidErr) {
    // Fail CLOSED: if we can't confirm which renders completed, refund nothing.
    console.error('[refund/sweep] videos lookup failed — skipping sweep:', vidErr.message)
    return result
  }
  const completed = new Set((vids ?? []).map((v) => v.render_id as string))

  for (const d of candidates) {
    if (completed.has(d.render_id as string)) continue
    const amount = await refundRenderCredits(d.render_id as string)
    if (amount > 0) {
      result.refunded += 1
      result.creditsReturned += amount
    }
  }
  if (result.refunded > 0) {
    console.log(
      `[refund/sweep] refunded ${result.refunded} stuck render(s), ${result.creditsReturned} credits returned`
    )
  }
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-CREDIT-INTEGRITY-2026-08-05 — the cinematic hole.
//
// INCIDENTE (05/08, conta do fundador): dois renders cinematográficos (seedance
// 20cr + veo 90cr) foram DEBITADOS no submit, chegaram ao estágio `fal_polling`
// e nunca entregaram. Nenhuma linha em `videos`, nenhum refund, 110 créditos
// evaporados — e a tela ainda dizia "Credits are only charged on successful
// delivery".
//
// POR QUE ACONTECEU: os motores cinematográficos debitam ANTES de submeter ao
// fal (chave determinística `cinematic-<claimId>`), e o ÚNICO refund existente
// era AO VIVO — /api/generate-video-cinematic quando a submissão falha e
// /api/cinematic-clip-status quando TODOS os clipes falham. Os dois exigem que
// a aba do usuário continue fazendo polling. Aba fechada, rede caída, poll
// travado, fal parado em IN_PROGRESS para sempre = ninguém nunca chama o
// refund. E `sweepStuckRenderDebits()` excluía `cinematic-%` de propósito.
//
// O QUE ESTA VARREDURA FAZ: para cada débito `cinematic-%` não reembolsado e
// mais velho que o cutoff, decide "isto ENTREGOU?" pela mesma cadeia que o
// resto do sistema já usa como verdade:
//   credit_debits.render_id  →  events(cinematic_submission_claim,
//   metadata.resolution_reference = render_id)  →  session_id = generationId
//   →  events(compose_submission_claim, mesmo user + session_id)
//   →  metadata.render_id (id do Creatomate)  →  linha em `videos`
// Se existe linha em `videos`, ENTREGOU: não reembolsa, nunca.
// Se não existe claim de compose nenhum, o render provadamente nunca chegou a
// ser submetido para composição (o claim é escrito ANTES de qualquer POST ao
// provedor) → abandonado → reembolsa.
//
// FALHA FECHADA: qualquer erro de consulta pula a linha (roda de novo na hora
// seguinte — KINEO-CREDIT-STUCK-2026-08-08 tirou esta varredura do ritmo diário).
// Melhor devolver tarde do que devolver o que foi entregue.
//
// IDEMPOTÊNCIA: o dinheiro volta por refund_render_credits (UPDATE condicional
// WHERE refunded_at IS NULL ... RETURNING), então dois crons simultâneos, ou
// esta varredura correndo com o refund ao vivo, jamais reembolsam duas vezes —
// só uma das chamadas recebe amount > 0. O evento de auditoria e o release do
// claim só acontecem nessa chamada vencedora.
// ═══════════════════════════════════════════════════════════════════════════

// Um render cinematográfico realista (submissão + clipes no fal + compose)
// termina em minutos.
//
// KINEO-RENDER-FANTASMA-2026-08-14 — as 3h eram margem escolhida no escuro, e a
// margem tinha dono: quem pagava por ela era a pessoa com 20 dos 40 créditos do
// trial presos. Agora existe a medição. Sobre TODOS os débitos `cinematic-%`
// entregues em 30 dias (50 rendes, os três motores juntos, e este corte não
// filtra por valor — por isso a conta é feita no pior de todos, não só no de
// 20cr): 20cr → p95 7,4 min, máx 14,3 · 90cr → máx 8,9 · 150cr → máx 6,5.
// O pior caso da casa inteira é 14,3 min. 45 min continua sendo 3,1x isso, ou
// seja segue sem tocar em NADA que já tenha dado certo alguma vez — mas o cron
// roda de hora em hora (:30), então o estorno passa a cair entre 45 e 105 min
// em vez dos 185–230 min medidos nos 7 renders travados de 11–14/08.
// A regra de decisão não mudou: o sweep continua falhando FECHADO em qualquer
// ambiguidade (claim não `settled`, vídeo entregue, erro de leitura) — o que
// mudou é só quanto tempo o crédito da pessoa fica refém antes da pergunta.
const CINEMATIC_ABANDON_CUTOFF_MS = 45 * 60 * 1000

function metadataOf(row: { metadata?: unknown } | null): Record<string, unknown> {
  return row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {}
}

function textField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function sweepAbandonedCinematicDebits(): Promise<{
  scanned: number
  delivered: number
  refunded: number
  creditsReturned: number
  // KINEO-RENDER-FANTASMA-2026-08-14 — claim de compose sem render_id: nem
  // entregue nem abandono provado. Contado à parte justamente para que ficar
  // preso aqui seja VISÍVEL na resposta do cron, e não vire um silêncio novo.
  ambiguous: number
}> {
  const result = { scanned: 0, delivered: 0, refunded: 0, creditsReturned: 0, ambiguous: 0 }
  const db = adminClient()
  if (!db) return result
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return result

  const cutoff = new Date(Date.now() - CINEMATIC_ABANDON_CUTOFF_MS).toISOString()
  const { data: debits, error } = await db
    .from('credit_debits')
    .select('render_id, user_id, amount')
    .eq('kind', 'video')
    .is('refunded_at', null)
    .like('render_id', 'cinematic-%')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[refund/cinematic-sweep] debit query failed:', error.message)
    return result
  }
  const candidates = debits ?? []
  result.scanned = candidates.length
  if (candidates.length === 0) return result

  for (const debit of candidates) {
    const billingReference = textField(debit.render_id)
    const userId = textField(debit.user_id)
    if (!billingReference || !userId) continue

    // 1) The signed birth claim that owns this ledger key.
    const { data: birthRow, error: birthError } = await db
      .from('events')
      .select('user_id, session_id, metadata')
      .eq('name', CINEMATIC_CLAIM_EVENT)
      .eq('user_id', userId)
      .eq('metadata->>resolution_reference', billingReference)
      .maybeSingle()
    if (birthError) {
      console.warn(`[refund/cinematic-sweep] birth claim lookup failed ref=${billingReference}:`, birthError.message)
      continue
    }
    if (!birthRow) continue // no verifiable owner → fail closed

    const birthMeta = metadataOf(birthRow)
    // Only a `settled` claim carries a live upfront debit. `released` already
    // resolved (refunded live); `pending`/`done` are handled by the birth route.
    if (textField(birthMeta.status) !== 'settled') continue
    const generationId = textField(birthRow.session_id)
    if (!generationId) continue

    // 2) Did this generation ever reach compose? The compose claim is written
    //    BEFORE any provider POST, so its absence proves non-delivery.
    const { data: composeRow, error: composeError } = await db
      .from('events')
      .select('metadata')
      .eq('name', COMPOSE_CLAIM_EVENT)
      .eq('user_id', userId)
      .eq('session_id', generationId)
      .limit(1)
      .maybeSingle()
    if (composeError) {
      console.warn(`[refund/cinematic-sweep] compose claim lookup failed gen=${generationId}:`, composeError.message)
      continue
    }

    // 3) A compose render id with a persisted `videos` row = DELIVERED. Hands off.
    const composeRenderId = textField(metadataOf(composeRow).render_id)
    if (composeRenderId) {
      const { data: video, error: videoError } = await db
        .from('videos')
        .select('render_id')
        .eq('user_id', userId)
        .eq('render_id', composeRenderId)
        .limit(1)
        .maybeSingle()
      if (videoError) {
        console.warn(`[refund/cinematic-sweep] videos lookup failed render=${composeRenderId}:`, videoError.message)
        continue // fail CLOSED — never refund a render we could not verify
      }
      if (video) {
        result.delivered += 1
        continue
      }
    } else if (composeRow) {
      // KINEO-RENDER-FANTASMA-2026-08-14 — buraco achado pela revisão adversarial
      // ao encurtar o corte de 3h para 45 min. O passo 2 diz que a AUSÊNCIA do
      // claim de compose prova não-entrega; o que estava escrito no código era
      // outra coisa. A linha do compose nasce com status 'pending' e SEM
      // render_id (é gravada ANTES do POST na Creatomate, justamente para provar
      // "chegou no compose") e só recebe o render_id no UPDATE de conclusão. Se
      // a invocação morre no meio, sobra uma linha pending sem render_id — e o
      // `if (composeRenderId)` acima pulava o teste de entrega inteiro, jogando
      // esse caso no mesmo balde de "nunca chegou no compose". São duas coisas
      // diferentes: uma é abandono provado, a outra é AMBIGUIDADE, e a regra
      // desta varredura é falhar FECHADO em ambiguidade, como ela já faz nos
      // três erros de leitura acima. Com o corte a 45 min esse caso passa a ser
      // alcançável muito mais cedo, então a guarda deixa de ser teórica.
      // O crédito não fica preso: o próximo ciclo reavalia de hora em hora, e
      // quando o claim resolver de um jeito ou de outro o caso sai daqui.
      console.warn(
        `[refund/cinematic-sweep] compose claim sem render_id (ambiguo, nao estornado) gen=${generationId} ref=${billingReference}`,
      )
      result.ambiguous += 1
      continue
    }

    // 4) Never delivered. Give the money back, then record the audit trail.
    const amount = await refundRenderCredits(billingReference)
    if (amount <= 0) continue
    result.refunded += 1
    result.creditsReturned += amount

    const { error: auditError } = await db.from('events').insert({
      user_id: userId,
      name: 'credits_refunded',
      path: '/api/cron/refund-sweep',
      session_id: generationId,
      metadata: {
        render_id: billingReference,
        amount,
        reason: 'cinematic_abandoned_no_delivery',
        quality: textField(birthMeta.quality) || null,
        engine: textField(birthMeta.engine) || null,
        refunded_at: new Date().toISOString(),
      },
    })
    if (auditError) {
      console.error(`[refund/cinematic-sweep] audit event failed ref=${billingReference}:`, auditError.message)
    }

    // Land the claim in its terminal `released` state so the birth route and
    // compose/status agree the debit is gone (and a replay cannot re-settle it).
    const released = await releaseCinematicClaim({
      db,
      secret,
      userId,
      generationId,
      reason: 'provider_abandoned_refunded',
      reference: billingReference,
    })
    if (!released.ok) {
      console.error(`[refund/cinematic-sweep] claim release failed gen=${generationId}:`, released.error)
    }
    console.log(`[refund/cinematic-sweep] refunded ${amount} credits ref=${billingReference}`)
  }

  if (result.refunded > 0) {
    console.log(
      `[refund/cinematic-sweep] refunded ${result.refunded} abandoned cinematic render(s), ` +
      `${result.creditsReturned} credits returned (${result.delivered} delivered, untouched)`
    )
  }
  return result
}
