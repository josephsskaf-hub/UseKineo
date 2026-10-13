// KINEO-ADS-LOTE-1310 — as REGRAS PURAS do modo lote do Studio Ads (sem import nenhum: a tela, o servidor e o guardião
// scripts/test-ads-lote-1310.mjs leem o MESMO arquivo; o guardião o importa cru no Node).
//
// POR QUÊ (fundador 13/10, "manda fazer … lote agora" — fura o congelamento só para isto): Creatify e Arcads deixam o
// anunciante gerar muitos anúncios de uma vez; a Kineo fazia um por vez (com 3 variações). O Business (US$ 84/mês, 500 cr)
// promete ~12 anúncios de 15 s — quem paga isso quer pôr a vitrine inteira na fila de uma vez.
//
// O QUE O LOTE É (e o que ele NÃO é):
//   · N chamadas das MESMAS funções do anúncio único: adsV2PlanFor (lib/ads/v2PlanCore.ts) para cada roteiro e
//     adsV2StartFor (lib/ads/v2StartCore.ts) para cada início. Moderação, teto diário, conferência de saldo, débito, estorno
//     e envio à fal são as linhas de sempre. Nenhum débito, estorno ou chamada à fal mora no lote.
//   · FILA, não rajada: o banco tem o índice único parcial ads_v2_orders_one_active_per_user_slot — UM anúncio comum em
//     andamento por conta (é ele que segura a concorrência na fal e o cron de avanço). O lote respeita isso: grava a fila
//     (brief.batch.queued_at), começa a 1ª linha agora e cada próxima quando a anterior termina (a tela aberta faz o
//     "tick"; com a aba fechada, o cron /api/cron/ads-v2-advance drena a fila). Cada linha é cobrada só quando começa,
//     inteira ou nada (é o /start de sempre).
//   · PARA na 1ª recusa (saldo, teto, moderação, acesso…): a linha recusada e as de trás ficam "não começaram" com o
//     motivo; nada delas foi cobrado. "Ocupado" (outro anúncio em andamento) NÃO é recusa: a fila só espera.

/** Teto de linhas por lote (a tela também limita ao que o saldo cobre). */
export const ADS_V2_BATCH_MAX_ROWS = 10

/** Respostas do /start que querem dizer "ainda não dá, espere" — nunca param a fila nem cobram nada. */
export const ADS_V2_BATCH_BUSY_CODES: readonly string[] = ['another_active', 'not_startable']

/**
 * Recusas do PLANO que valem para a conta inteira (as linhas de trás dariam a mesma coisa): o lote para de planejar.
 * As outras (moderação de uma frase, foto inválida, "escreva o nome do negócio") ficam só naquela linha.
 */
export const ADS_V2_BATCH_PLAN_STOP_CODES: readonly string[] = ['daily_limit', 'no_access', 'closed', 'v2_closed', 'unavailable', 'not_ready', 'sample_level_only']

export type AdsV2BatchAction = 'plan' | 'start' | 'tick' | 'cancel'

export interface AdsV2BatchPlanRowBody {
  order_id: string
  /** O resto do corpo do /plan vai como veio: quem confere é sanitizePlanBody, DENTRO de adsV2PlanFor. */
  body: Record<string, unknown>
}

export type AdsV2BatchBody =
  | { action: 'plan'; rows: AdsV2BatchPlanRowBody[] }
  /** batch_id ausente = lote novo; presente = retomar/ampliar o MESMO lote (as linhas já marcadas mantêm a posição). */
  | { action: 'start'; batch_id: string | null; order_ids: string[]; expected_credits: number }
  | { action: 'tick'; batch_id: string }
  | { action: 'cancel'; batch_id: string }

export type AdsV2BatchSanitized = { ok: true; value: AdsV2BatchBody } | { ok: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

/** O corpo do POST /api/ads/v2/batch. Linhas: 1 a ADS_V2_BATCH_MAX_ROWS, cada uma com o order_id (uuid, sem repetir). */
export function sanitizeBatchBody(raw: unknown): AdsV2BatchSanitized {
  const b = obj(raw)
  if (!b) return { ok: false, error: 'bad_body' }
  const action = b.action
  if (action === 'plan') {
    if (!Array.isArray(b.rows) || b.rows.length < 1) return { ok: false, error: 'no_rows' }
    if (b.rows.length > ADS_V2_BATCH_MAX_ROWS) return { ok: false, error: 'too_many_rows' }
    const seen = new Set<string>()
    const rows: AdsV2BatchPlanRowBody[] = []
    for (const r of b.rows) {
      const row = obj(r)
      if (!row || !isUuid(row.order_id)) return { ok: false, error: 'bad_order_id' }
      const id = row.order_id.toLowerCase()
      if (seen.has(id)) return { ok: false, error: 'duplicate_order' }
      seen.add(id)
      rows.push({ order_id: id, body: { ...row, order_id: id } })
    }
    return { ok: true, value: { action: 'plan', rows } }
  }
  if (action === 'tick' || action === 'cancel') {
    if (!isUuid(b.batch_id)) return { ok: false, error: 'bad_batch_id' }
    return { ok: true, value: { action, batch_id: b.batch_id.toLowerCase() } }
  }
  if (action === 'start') {
    let batchId: string | null = null
    if (b.batch_id !== undefined && b.batch_id !== null) {
      if (!isUuid(b.batch_id)) return { ok: false, error: 'bad_batch_id' }
      batchId = b.batch_id.toLowerCase()
    }
    if (!Array.isArray(b.order_ids) || b.order_ids.length < 1) return { ok: false, error: 'no_rows' }
    if (b.order_ids.length > ADS_V2_BATCH_MAX_ROWS) return { ok: false, error: 'too_many_rows' }
    if (!b.order_ids.every(isUuid)) return { ok: false, error: 'bad_order_id' }
    const orderIds = [...new Set((b.order_ids as string[]).map((x) => x.toLowerCase()))]
    if (orderIds.length !== b.order_ids.length) return { ok: false, error: 'duplicate_order' }
    const c = b.expected_credits
    if (typeof c !== 'number' || !Number.isInteger(c) || c < 1) return { ok: false, error: 'bad_expected_credits' }
    return { ok: true, value: { action: 'start', batch_id: batchId, order_ids: orderIds, expected_credits: c } }
  }
  return { ok: false, error: 'bad_action' }
}

/** A marca do lote gravada no brief do pedido (brief.batch). */
export interface AdsV2BatchTag {
  id: string
  /** Posição na fila (0 = a primeira). */
  row: number
  /** Quem montou o lote (o cron age em nome dele, com o acesso de hoje dele). */
  by: string
  /** A pessoa clicou "Generate": a linha está na fila. Ausente/null = só planejada. */
  queued_at?: string | null
  /** A fila parou NESTA linha ou antes dela (o motivo da 1ª recusa). Ausente/null = segue. */
  stopped?: { code: string; at: string; row: number } | null
}

/** Lê brief.batch (qualquer coisa fora do formato = null: o pedido não é de lote). */
export function batchTagOf(brief: unknown): AdsV2BatchTag | null {
  const b = obj(brief)
  const t = b ? obj(b.batch) : null
  if (!t || !isUuid(t.id) || typeof t.row !== 'number' || !Number.isInteger(t.row) || t.row < 0 || typeof t.by !== 'string') return null
  const s = obj(t.stopped)
  return {
    id: t.id.toLowerCase(),
    row: t.row,
    by: t.by,
    queued_at: typeof t.queued_at === 'string' ? t.queued_at : null,
    stopped: s && typeof s.code === 'string' ? { code: s.code, at: typeof s.at === 'string' ? s.at : '', row: typeof s.row === 'number' ? s.row : -1 } : null,
  }
}

export interface AdsV2BatchQueueRow {
  id: string
  status: string
  tag: AdsV2BatchTag
}

/** A parada que vale: a gravada numa linha que ainda não começou (marca velha em pedido que já andou não trava o lote). */
export function batchStopOf<T extends AdsV2BatchQueueRow>(rows: readonly T[]): AdsV2BatchTag['stopped'] {
  return rows.find((r) => r.tag.stopped && r.status === 'planned')?.tag.stopped ?? null
}

/** A próxima linha a começar: a de menor posição que está na fila e ainda 'planned'. Parada/sem fila = null. */
export function nextQueuedRow<T extends AdsV2BatchQueueRow>(rows: readonly T[]): T | null {
  if (batchStopOf(rows)) return null
  const waiting = rows.filter((r) => r.tag.queued_at && r.status === 'planned').sort((a, b) => a.tag.row - b.tag.row)
  return waiting[0] ?? null
}

/** O que fazer com a resposta do /start: começou, esperar (ocupado) ou PARAR a fila (recusa). */
export function batchStartOutcome(status: number, code: string | null): 'started' | 'busy' | 'refused' {
  if (status >= 200 && status < 300) return 'started'
  if (code && ADS_V2_BATCH_BUSY_CODES.includes(code)) return 'busy'
  return 'refused'
}

/** Quantas linhas cabem: até ADS_V2_BATCH_MAX_ROWS e até o saldo cobrir a soma (saldo desconhecido = só o teto). */
export function batchRowsAllowed(costs: readonly number[], balance: number | null): number {
  let n = 0
  let sum = 0
  for (const c of costs) {
    if (n >= ADS_V2_BATCH_MAX_ROWS) break
    if (balance !== null && sum + c > balance) break
    sum += c
    n += 1
  }
  return n
}
