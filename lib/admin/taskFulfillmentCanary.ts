// Manual, bounded reuse of stored evidence. No extraction/render/backfill.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { objectRecord } from '@/lib/regua95/evidence'
import {
  TASK_FULFILLMENT_CANARY_ENABLED, TASK_FULFILLMENT_MAX_CASES, TASK_FULFILLMENT_VERSION,
  runTaskFulfillmentCanaryBatch, type FulfillmentInput, type FulfillmentResult,
} from '@/lib/regua95/taskFulfillmentCanary'

export const TASK_CANARY_ROUTE = '/api/admin/coerencia/canario'
export const TASK_CANARY_CLAIM_EVENT = 'task_fulfillment_canary_claim'
export const TASK_CANARY_BUDGET_EVENT = 'task_fulfillment_canary_budget'
export const TASK_CANARY_RESULT_EVENT = 'task_fulfillment_canary'
export const TASK_CANARY_BODY_MAX_BYTES = 8192
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const str = (v: unknown) => typeof v === 'string' ? v.trim() : ''
const uuid = (v: unknown) => typeof v === 'string' && UUID.test(v)

export type StoredCanaryCase = {
  videoId: string; generationId: string; coherenceEventId: string; pixelEventId: string
  confirmed: { source: 'admin_manual'; seconds: number; mode: 'idea' | 'script'; language?: string }
}
export type CanaryRequest = { cases: StoredCanaryCase[] }
type ParsedRequest = { ok: true; value: CanaryRequest } | { ok: false; reason: string }

/** Client supplies exact keys and an explicitly ADMIN confirmation, never evidence or a model/key. */
export function parseStoredCanaryRequest(body: unknown): ParsedRequest {
  const b = objectRecord(body)
  if (Object.keys(b).some(k => k !== 'cases') || !Array.isArray(b.cases) || b.cases.length < 1 || b.cases.length > TASK_FULFILLMENT_MAX_CASES) return { ok: false, reason: 'one_to_three_exact_cases_required' }
  const cases: StoredCanaryCase[] = []
  for (const raw of b.cases) {
    const c = objectRecord(raw), f = objectRecord(c.confirmed)
    if (Object.keys(c).some(k => !['videoId', 'generationId', 'coherenceEventId', 'pixelEventId', 'confirmed'].includes(k)) || ![c.videoId, c.generationId, c.coherenceEventId, c.pixelEventId].every(uuid)) return { ok: false, reason: 'invalid_exact_uuid_keys' }
    if (c.coherenceEventId === c.pixelEventId || Object.keys(f).some(k => !['source', 'seconds', 'mode', 'language'].includes(k)) || f.source !== 'admin_manual' || ![15, 35, 45, 60, 90].includes(f.seconds as number) || !['idea', 'script'].includes(String(f.mode)) || (f.language !== undefined && (typeof f.language !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(f.language)))) return { ok: false, reason: 'explicit_admin_configuration_required' }
    cases.push({ videoId: String(c.videoId).toLowerCase(), generationId: String(c.generationId).toLowerCase(), coherenceEventId: String(c.coherenceEventId).toLowerCase(), pixelEventId: String(c.pixelEventId).toLowerCase(), confirmed: { source: 'admin_manual', seconds: f.seconds as number, mode: f.mode as 'idea' | 'script', ...(f.language ? { language: f.language as string } : {}) } })
  }
  if (new Set(cases.map(c => c.videoId)).size !== cases.length) return { ok: false, reason: 'duplicate_video_case' }
  return { ok: true, value: { cases } }
}

type StoredEvent = { id: string; name: string; user_id: string; session_id: string; metadata: Record<string, unknown> }
type PreparedCase = { key: string; input: FulfillmentInput; ownerId: string; selected: StoredCanaryCase; ideaSource: string }
type Prepared = { ok: true; value: PreparedCase } | { ok: false; reason: string }
const safeText = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
function safeFrameUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !/^(?:localhost|127\.|0\.|\[?::1\]?)/i.test(u.hostname) } catch { return false }
}

/** No window/nearest record. Every relationship is checked again after exact filters. */
export async function loadStoredCanaryCase(admin: SupabaseClient, selected: StoredCanaryCase): Promise<Prepared> {
  const vr = await admin.from('videos').select('id,user_id,status,render_id').eq('id', selected.videoId).maybeSingle()
  const video = objectRecord(vr.data)
  if (vr.error || video.id !== selected.videoId || !uuid(video.user_id) || video.status !== 'completed' || !str(video.render_id)) return { ok: false, reason: 'completed_video_owner_or_render_unverified' }
  const ownerId = String(video.user_id)
  const getEvent = async (id: string, name: string) => admin.from('events').select('id,name,user_id,session_id,metadata')
    .eq('id', id).eq('name', name).eq('user_id', ownerId).eq('session_id', selected.videoId)
    .eq('metadata->>video_id', selected.videoId).eq('metadata->>generation_id', selected.generationId).maybeSingle()
  const cr = await getEvent(selected.coherenceEventId, 'coherence_v2')
  const pr = await getEvent(selected.pixelEventId, 'pixel_score')
  const matches = (raw: unknown, id: string, name: string): raw is StoredEvent => {
    const e = objectRecord(raw), m = objectRecord(e.metadata)
    return e.id === id && e.name === name && e.user_id === ownerId && e.session_id === selected.videoId && m.video_id === selected.videoId && m.generation_id === selected.generationId && m.render_id === video.render_id && m.product === 'filme'
  }
  if (cr.error || pr.error || !matches(cr.data, selected.coherenceEventId, 'coherence_v2') || !matches(pr.data, selected.pixelEventId, 'pixel_score')) return { ok: false, reason: 'stored_evidence_keys_or_owner_mismatch' }
  const evidence = objectRecord(cr.data.metadata.evidence), pixel = pr.data.metadata
  const source = str(evidence.idea_source)
  const basis = source === 'pedido_direto' || source === 'script_written' ? 'original_request' : source === 'roteiro' ? 'supplied_script' : null
  if (!basis) return { ok: false, reason: 'original_request_provenance_unverified' }
  if (!safeText(evidence.idea, 4000) || !safeText(evidence.narration, 3000) || !Array.isArray(evidence.scenes) || !evidence.scenes.length || evidence.scenes.length > 20) return { ok: false, reason: 'stored_text_evidence_incomplete' }
  const scenes: FulfillmentInput['scenes'] = []
  for (const raw of evidence.scenes) {
    const s = objectRecord(raw)
    if (s.scene !== scenes.length + 1 || !safeText(s.spoken, 800) || !safeText(s.prompt, 3000)) return { ok: false, reason: 'stored_scene_evidence_incomplete' }
    scenes.push({ scene: s.scene as number, spoken: s.spoken as string, prompt: s.prompt as string })
  }
  const urls = pixel.frame_urls, rows = pixel.frames
  if (!Array.isArray(urls) || !Array.isArray(rows) || !urls.length || urls.length > 10 || urls.length !== rows.length || pixel.frame_count !== urls.length || new Set(urls).size !== urls.length) return { ok: false, reason: 'stored_frame_evidence_incomplete' }
  const frames: FulfillmentInput['frames'] = []
  for (let i = 0; i < urls.length; i++) {
    const row = objectRecord(rows[i])
    if (row.i !== i + 1 || typeof row.t !== 'number' || !Number.isFinite(row.t) || row.t < 0 || (i > 0 && row.t <= frames[i - 1].t) || !safeFrameUrl(urls[i])) return { ok: false, reason: 'stored_frame_indexes_times_or_urls_unverified' }
    frames.push({ i: i + 1, t: row.t, url: urls[i] as string })
  }
  return { ok: true, value: { key: selected.videoId, ownerId, selected, ideaSource: source, input: { request: evidence.idea as string, requestBasis: basis, narration: evidence.narration as string, confirmed: { seconds: selected.confirmed.seconds, mode: selected.confirmed.mode, ...(selected.confirmed.language ? { language: selected.confirmed.language } : {}) }, scenes, frames } } }
}

/** RFC4122 UUIDv5: events.id PK is the atomic uniqueness boundary, not a SELECT-before-INSERT. */
export function canaryEventId(videoId: string, version: string, kind: 'claim' | 'result'): string {
  const namespace = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex')
  const bytes = createHash('sha1').update(namespace).update(`${TASK_CANARY_ROUTE}/${version}/${videoId.toLowerCase()}/${kind}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = bytes.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function storedCanaryAdapters(admin: SupabaseClient, cases: PreparedCase[], adminId: string) {
  const byKey = new Map(cases.map(c => [c.key, c]))
  const claimed = new Map<string, string>()
  const provenance = (c: PreparedCase) => ({ version: TASK_FULFILLMENT_VERSION, video_id: c.key, generation_id: c.selected.generationId, coherence_event_id: c.selected.coherenceEventId, pixel_event_id: c.selected.pixelEventId, idea_source: c.ideaSource, request_basis: c.input.requestBasis, confirmed_configuration: { ...c.selected.confirmed, confirmed_by_admin_id: adminId, historical_customer_acceptance_verified: false }, evidence_reused: true, frame_extraction_performed: false })
  return {
    claimCase: async (key: string, version: string): Promise<boolean> => {
      if (!TASK_FULFILLMENT_CANARY_ENABLED) return false
      const c = byKey.get(key)
      if (!c || version !== TASK_FULFILLMENT_VERSION) return false
      const id = canaryEventId(key, version, 'claim')
      const r = await admin.from('events').insert({ id, name: TASK_CANARY_CLAIM_EVENT, user_id: c.ownerId, session_id: key, path: TASK_CANARY_ROUTE, metadata: { ...provenance(c), status: 'reserved_once' } }).select('id').single()
      if (r.error?.code === '23505') return false
      if (r.error || objectRecord(r.data).id !== id) throw new Error('canary_reservation_unavailable')
      // Three global version-scoped slots, including across concurrent POSTs
      // with different videos. A failed attempt never frees a paid-call slot.
      for (let slot = 1; slot <= TASK_FULFILLMENT_MAX_CASES; slot++) {
        const slotId = canaryEventId(`budget-slot-${slot}`, version, 'claim')
        const budget = await admin.from('events').insert({ id: slotId, name: TASK_CANARY_BUDGET_EVENT, user_id: c.ownerId, session_id: key, path: TASK_CANARY_ROUTE, metadata: { ...provenance(c), claim_id: id, slot, status: 'reserved_once' } }).select('id').single()
        if (budget.error?.code === '23505') continue
        if (budget.error || objectRecord(budget.data).id !== slotId) throw new Error('canary_budget_reservation_unavailable')
        claimed.set(key, slotId)
        return true
      }
      return false
    },
    save: async (key: string, result: FulfillmentResult): Promise<void> => {
      if (!TASK_FULFILLMENT_CANARY_ENABLED) throw new Error('canary_disabled')
      const c = byKey.get(key)
      if (!c || !claimed.has(key) || result.version !== TASK_FULFILLMENT_VERSION) throw new Error('canary_result_key_mismatch')
      const r = await admin.from('events').insert({ id: canaryEventId(key, TASK_FULFILLMENT_VERSION, 'result'), name: TASK_CANARY_RESULT_EVENT, user_id: c.ownerId, session_id: key, path: TASK_CANARY_ROUTE, metadata: { ...provenance(c), budget_slot_id: claimed.get(key), result } })
      if (r.error) throw new Error('canary_result_save_failed')
      // Reservation remains even on a later failure; it is never released or overwritten for a retry.
    },
  }
}

/** First gate precedes even dependency getters. One invalid case rejects the entire paid batch. */
export async function runStoredTaskFulfillmentCanary(body: unknown, deps: { admin: SupabaseClient; adminId: string; getApiKey: () => string | undefined; fetchImpl?: typeof fetch }) {
  if (!TASK_FULFILLMENT_CANARY_ENABLED) return { status: 'disabled' as const, evaluated: 0 }
  const parsed = parseStoredCanaryRequest(body)
  if (!parsed.ok || !uuid(deps.adminId)) return { status: 'invalid' as const, reason: parsed.ok ? 'admin_identity_invalid' : parsed.reason, evaluated: 0 }
  const prepared: PreparedCase[] = []
  for (const selected of parsed.value.cases) {
    const c = await loadStoredCanaryCase(deps.admin, selected)
    if (!c.ok) return { status: 'unknown' as const, video_id: selected.videoId, reason: c.reason, evaluated: 0 }
    prepared.push(c.value)
  }
  const apiKey = deps.getApiKey()
  if (!apiKey) return { status: 'unavailable' as const, reason: 'evaluation_key_unavailable', evaluated: 0 }
  const output = await runTaskFulfillmentCanaryBatch(prepared.map(c => ({ key: c.key, input: c.input })), { apiKey, fetchImpl: deps.fetchImpl, ...storedCanaryAdapters(deps.admin, prepared, deps.adminId) })
  return { status: 'recorded' as const, evaluated: output.length, cases: output.map(o => ({ video_id: o.key, task_fulfilled: o.result?.task_fulfilled ?? 'unknown', calibration_status: 'not_calibrated' as const, historical_customer_acceptance_verified: false, result: o.result })) }
}
