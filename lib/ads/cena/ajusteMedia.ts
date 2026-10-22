// KINEO-ADS-CENA-RETOMADA-2110 — optional music and the customer's own moving close, without the 95 pipeline.
import type { MusicMood } from '@/lib/pixabayMusic'
import type { LyriaHandle } from '@/lib/lyriaMusic'
import type { CenaPlan } from './plan'
import type { CenaState } from './pipeline'
import { CENA_ROUTES, type CenaRoute } from './adapters'

export const CENA_AJUSTE_LIVE_VERSION = 'KINEO-ADS-CENA-RETOMADA-2110' as const
export interface CenaAjusteLive { version: typeof CENA_AJUSTE_LIVE_VERSION; music?: boolean }
export interface AjusteCloseRequest { endpoint: string; input: Record<string, unknown>; seconds: number; keepSeconds: 5; photoReference: string }
export interface AjusteClose extends AjusteCloseRequest {
  attempt: number; status: 'new' | 'submitting' | 'pending' | 'done' | 'failed'; claimedAt?: number;
  requestId?: string; falUrl?: string; copyStartedAt?: number; url?: string; measuredSeconds?: number; reason?: string;
}
export interface AjusteMusic { status: 'new' | 'submitting' | 'pending' | 'done' | 'skipped'; claimedAt?: number; handle?: LyriaHandle; url?: string }
export interface AjusteMedia { version: typeof CENA_AJUSTE_LIVE_VERSION; close: AjusteClose; music: AjusteMusic; voiceSeconds?: number }
export type AjusteState = CenaState & { ajusteMedia?: AjusteMedia }
export interface AjusteMediaDeps {
  now(): number; save(s: AjusteState): Promise<void>;
  submitClose(j: AjusteClose): Promise<{ kind: 'accepted'; requestId: string } | { kind: 'ambiguous' | 'rejected' }>;
  pollClose(j: AjusteClose): Promise<{ state: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }>;
  persistClose(j: AjusteClose): Promise<{ storedUrl: string; measuredSeconds: number } | null>;
  submitMusic(mood: MusicMood): Promise<LyriaHandle | null>;
  pollMusic(handle: LyriaHandle): Promise<string | null>;
  event?(name: string, data: Record<string, unknown>): Promise<void>;
}
const HTTPS = (v: unknown): v is string => typeof v === 'string' && /^https:\/\/\S+$/iu.test(v)
export function ajusteLiveOf(plan: CenaPlan): CenaAjusteLive | null {
  const value = (plan as CenaPlan & { ajusteLive?: CenaAjusteLive }).ajusteLive
  return value?.version === CENA_AJUSTE_LIVE_VERSION ? value : null
}
export function ajusteMusicMood(category: CenaPlan['category']): MusicMood {
  return category === 'wearable' || category === 'footwear' || category === 'supplement' ? 'hustle' : category === 'perfume' ? 'emotional' : category === 'bag' || category === 'other' ? 'tech' : 'nature'
}
/** Schema already used for the same i2v endpoints; no classifier, isolated-photo gate or altered photograph. */
export function ajusteCloseRequest(plan: CenaPlan, route: CenaRoute): AjusteCloseRequest {
  const photoReference = plan.input.foto
  if (!HTTPS(photoReference)) throw new Error('cena_ajuste_close_photo_required')
  if (!['kling3', 'seedance2', 'veo31'].includes(route)) throw new Error('cena_ajuste_close_route_required')
  const seconds = route === 'veo31' ? 6 : 5
  return {
    endpoint: route === 'kling3' ? CENA_ROUTES.kling3.endpoint : route === 'veo31' ? 'fal-ai/veo3.1/image-to-video' : 'bytedance/seedance-2.0/image-to-video',
    input: { ...(route === 'kling3' ? { start_image_url: photoReference } : { image_url: photoReference }),
      prompt: 'Animate this EXACT original customer photograph with a very slow subtle camera push-in. Preserve the entire product, original label, typography, material, proportions and original background. Preserve any hands, people or objects already present in the source exactly as photographed; do not add any new hand, person, limb, accessory or object, and do not erase existing source content. No morphing, new side, invented label, added text, graphics or scene change. The original product stays whole and stable. Silent video, no speech, dialogue or lip-sync.',
      duration: route === 'veo31' ? '6s' : '5', ...(route === 'kling3' ? {} : { resolution: '720p', aspect_ratio: '9:16' }), generate_audio: false },
    seconds, keepSeconds: 5, photoReference,
  }
}
const CLOSE_UNCONFIRMED_MS = 20 * 60_000, CLOSE_PENDING_MS = 25 * 60_000, CLOSE_COPY_MS = 30 * 60_000, MUSIC_WAIT_MS = 45_000
async function optionalEvent(d: AjusteMediaDeps, name: string, data: Record<string, unknown>): Promise<void> { try { await d.event?.(name, data) } catch { /* telemetry never owns delivery */ } }
async function closeFailure(s: AjusteState, d: AjusteMediaDeps, reason: string, confirmed: boolean): Promise<void> {
  const close = s.ajusteMedia!.close
  if (confirmed && close.attempt < 2) {
    s.ajusteMedia!.close = { ...ajusteCloseRequest(s.plan, s.route), attempt: close.attempt + 1, status: 'new' }
    await d.save(s); await optionalEvent(d, 'ads_cena_ajuste_close_retry', { attempt: close.attempt + 1, reason })
  } else { close.status = 'failed'; close.reason = reason; await d.save(s) }
}
async function advanceClose(s: AjusteState, d: AjusteMediaDeps): Promise<void> {
  const j = s.ajusteMedia!.close
  if (j.status === 'done' || j.status === 'failed') return
  if (j.status === 'submitting') {
    if (d.now() - (j.claimedAt ?? 0) > CLOSE_UNCONFIRMED_MS) await closeFailure(s, d, 'cena_ajuste_close_submit_unconfirmed', false)
    return
  }
  if (j.status === 'new') {
    j.status = 'submitting'; j.claimedAt = d.now(); await d.save(s)
    // Throw/transport uncertainty preserves the durable intent. It must never cause a second POST.
    let result: Awaited<ReturnType<AjusteMediaDeps['submitClose']>>
    try { result = await d.submitClose(j) } catch { return }
    if (result.kind === 'accepted' && result.requestId) { j.requestId = result.requestId; j.status = 'pending'; await d.save(s) }
    else if (result.kind === 'rejected') await closeFailure(s, d, 'cena_ajuste_close_rejected', true)
    return
  }
  if (!j.requestId) { await closeFailure(s, d, 'cena_ajuste_close_submit_unconfirmed', false); return }
  if (!j.falUrl) {
    let result: Awaited<ReturnType<AjusteMediaDeps['pollClose']>>
    try { result = await d.pollClose(j) } catch { return }
    if (result.state === 'failed') { await closeFailure(s, d, 'cena_ajuste_close_failed', true); return }
    if (result.state !== 'done' || !HTTPS(result.url)) {
      if (d.now() - (j.claimedAt ?? 0) > CLOSE_PENDING_MS) await closeFailure(s, d, 'cena_ajuste_close_result_unconfirmed', false)
      return
    }
    j.falUrl = result.url; j.copyStartedAt = d.now(); await d.save(s)
  }
  let stored: Awaited<ReturnType<AjusteMediaDeps['persistClose']>> = null
  try { stored = await d.persistClose(j) } catch { /* retry the copy, never the generation */ }
  if (!stored || !HTTPS(stored.storedUrl) || stored.storedUrl === j.falUrl || stored.storedUrl === j.photoReference || !Number.isFinite(stored.measuredSeconds)) {
    if (d.now() - (j.copyStartedAt ?? d.now()) > CLOSE_COPY_MS) await closeFailure(s, d, 'cena_ajuste_close_copy_failed', false)
    return
  }
  if (stored.measuredSeconds < j.keepSeconds) { await closeFailure(s, d, 'cena_ajuste_close_too_short', true); return }
  j.url = stored.storedUrl; j.measuredSeconds = stored.measuredSeconds; j.status = 'done'; await d.save(s)
}
async function advanceMusic(s: AjusteState, d: AjusteMediaDeps): Promise<void> {
  const music = s.ajusteMedia!.music
  if (music.status === 'done' || music.status === 'skipped') return
  if (music.status === 'submitting' || music.claimedAt !== undefined && d.now() - music.claimedAt > MUSIC_WAIT_MS) { music.status = 'skipped'; await d.save(s); return }
  if (music.status === 'new') {
    music.status = 'submitting'; music.claimedAt = d.now(); await d.save(s)
    let handle: LyriaHandle | null = null
    try { handle = await d.submitMusic(ajusteMusicMood(s.plan.category)) } catch { /* optional, and never submit again */ }
    if (handle?.requestId && HTTPS(handle.statusUrl) && HTTPS(handle.responseUrl)) { music.handle = handle; music.status = 'pending' } else music.status = 'skipped'
    await d.save(s); return
  }
  let url: string | null = null
  try { if (music.handle) url = await d.pollMusic(music.handle) } catch { /* reuse the same handle on the next pass */ }
  if (HTTPS(url)) { music.url = url; music.status = 'done'; await d.save(s) }
  else if (!music.handle || d.now() - (music.claimedAt ?? 0) > MUSIC_WAIT_MS) { music.status = 'skipped'; await d.save(s) }
}
/** One resumable step. No credits, database, SDK or network; every paid intention precedes its injected effect. */
export async function stepAjusteMedia(s: AjusteState, d: AjusteMediaDeps): Promise<'pending' | 'ready' | 'failed'> {
  const live = ajusteLiveOf(s.plan)
  if (!live) return 'ready'
  if (s.phase !== 'ready') return 'pending'
  if (!s.ajusteMedia) {
    s.ajusteMedia = { version: CENA_AJUSTE_LIVE_VERSION, close: { ...ajusteCloseRequest(s.plan, s.route), attempt: 1, status: 'new' }, music: { status: live.music === true ? 'new' : 'skipped' } }
    await d.save(s)
  }
  if (s.ajusteMedia.version !== CENA_AJUSTE_LIVE_VERSION || s.ajusteMedia.close.photoReference !== s.plan.input.foto) throw new Error('cena_ajuste_media_invalid')
  await advanceClose(s, d)
  if (s.ajusteMedia.close.status === 'failed') return 'failed'
  await advanceMusic(s, d)
  return s.ajusteMedia.close.status === 'done' && ['done', 'skipped'].includes(s.ajusteMedia.music.status) ? 'ready' : 'pending'
}
