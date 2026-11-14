// Browser orchestration only. Creating this client and editing/selecting local
// files never sends a request. Call prepare/generate only from explicit Generate.
import { compressPhoto } from './photos'
import { seuVideoContentType } from './seuVideoFileType'
import {
  SEU_VIDEO_LIMITES, lerMetaDoVideo,
  segundosGerados, creditosDoSeuVideo, promptPadrao, validarPrompt, promptPorGenero,
} from './seuVideoRules'
import type { SeuVideoGender, SeuVideoPresentation } from './seuVideoRules'

export type SeuVideoPhase = 'local' | 'video-upload' | 'check' | 'photo-upload' | 'generate' | 'status'
export class SeuVideoClientError extends Error {
  readonly name = 'SeuVideoClientError'
  constructor(
    message: string,
    readonly code: string,
    readonly phase: SeuVideoPhase,
    readonly status?: number,
    readonly outcome: 'not-started' | 'unknown' = 'not-started',
    readonly shortfall?: number,
  ) { super(message) }
}

export type LocalSeuVideo = Readonly<{
  file: File
  contentType: 'video/mp4' | 'video/quicktime'
  seconds: number
  bytes: number
  width: number
  height: number
  estimatedCredits: number | null
}>
export type CheckedSeuVideo = Readonly<{
  video_path: string
  people: number
  seconds: number
  fps: number
  width: number
  height: number
  bytes: number
  generated_seconds: number
  aspect_ratio?: string
  credits: number
  prompt: string
  balance?: number
  shortfall?: number
  needs_plan?: boolean
  presentation?: SeuVideoPresentation
  genders?: readonly SeuVideoGender[]
}>
export type SeuVideoClip = Readonly<{
  id: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  video_url?: string | null
  credits_refunded?: number
  reason?: string
  message?: string
  refundConfirmed: boolean
}>
export type SeuVideoSubmission = Readonly<{ clip: SeuVideoClip; replay: boolean; key: string }>
export type PrepareSeuVideoInput = { file: File; people: number; positions?: readonly string[]; genders?: readonly SeuVideoGender[] }
export type GenerateSeuVideoInput = {
  checked: CheckedSeuVideo
  photos: readonly File[]
  prompt: string
  consent: boolean
  key: string
  /** Actual latest /check credits the person has explicitly confirmed. */
  confirmedCredits: number
  promptEdited?: boolean
  genders?: readonly SeuVideoGender[]
}
export type SeuVideoClientDeps = {
  fetch?: typeof fetch
  preparePhoto?: (file: File) => Promise<File>
  presentation?: SeuVideoPresentation
}
const API = '/api/recreate/seu-video'
const PHOTO_MAX_BYTES = 8 * 1024 * 1024 // same input limit as the existing Recreate photo uploader
const APPROVED_ONLY = 'This preview is available to approved accounts only. Your files are still here.'
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
export const isSeuVideoRefusal = (code: unknown): boolean => typeof code === 'string' && ['refused_face', 'engine_refused', 'provider_rejected', 'provider_failed', 'not_swapped', 'swap_unchanged'].includes(code)
function fail(message: string, code: string, phase: SeuVideoPhase = 'local'): never { throw new SeuVideoClientError(message, code, phase) }
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new SeuVideoClientError('The request was cancelled. Your local files are still here.', 'aborted', 'local') }

function peopleCount(people: number): void {
  if (!Number.isInteger(people) || people < 1 || people > SEU_VIDEO_LIMITES.maxFotos) fail('Add 1 to 3 photos.', 'photos')
}
export function estimateSeuVideoCredits(seconds: number): number | null {
  if (!finite(seconds) || seconds < SEU_VIDEO_LIMITES.minSegundos || seconds > SEU_VIDEO_LIMITES.maxSegundos) return null
  return creditosDoSeuVideo(segundosGerados(seconds))
}
export function defaultSeuVideoPrompt(people: number, positions: readonly string[] = []): string {
  peopleCount(people)
  return promptPadrao(people, positions)
}
export function genderSeuVideoPrompt(genders: readonly SeuVideoGender[], positions: readonly string[] = []): string {
  return promptPorGenero(genders, positions)
}
function chosenGenders(genders: readonly SeuVideoGender[] | undefined, people: number): readonly SeuVideoGender[] | undefined {
  if (genders === undefined) return undefined // old callers remain compatible
  if (!Array.isArray(genders) || genders.length !== people || genders.some(g => g !== 'man' && g !== 'woman')) fail('Choose Man or Woman for each photo.', 'genders')
  return Object.freeze([...genders])
}
function presentationFrom(value: unknown): SeuVideoPresentation | undefined {
  const v = record(value)
  if (typeof v.resolution !== 'string' || !v.resolution || typeof v.waitLabel !== 'string' || !v.waitLabel || !['silent', 'original'].includes(String(v.audio))) return undefined
  if (![v.minSeconds, v.maxSeconds, v.minSide, v.maxBytes, v.minFps, v.maxFps].every(finite) || Number(v.minSeconds) <= 0 || Number(v.maxSeconds) < Number(v.minSeconds) || Number(v.minSide) < 0 || Number(v.maxBytes) <= 0 || Number(v.minFps) <= 0 || Number(v.maxFps) < Number(v.minFps)) return undefined
  return Object.freeze({ resolution: v.resolution, audio: v.audio as SeuVideoPresentation['audio'], waitLabel: v.waitLabel, minSeconds: Number(v.minSeconds), maxSeconds: Number(v.maxSeconds), minSide: Number(v.minSide), maxBytes: Number(v.maxBytes), minFps: Number(v.minFps), maxFps: Number(v.maxFps) })
}
export function validateSeuVideoPhotos(photos: readonly File[]): void {
  peopleCount(photos.length)
  for (const file of photos) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) fail('Choose JPG, PNG or WebP photos.', 'photo_format')
    if (!finite(file.size) || file.size <= 0 || file.size > PHOTO_MAX_BYTES) fail('Choose photos up to 8 MB each.', 'photo_size')
  }
}
/** Local bytes only; the server remains the authority for fps and final quote. */
export async function validateSeuVideoFile(file: File, presentation?: SeuVideoPresentation): Promise<LocalSeuVideo> {
  const limits = presentationFrom(presentation)
  if (presentation && !limits) fail('Could not read the current video requirements. Reload this page.', 'presentation')
  if (!file || !finite(file.size) || file.size <= 0 || file.size > Math.min(SEU_VIDEO_LIMITES.maxBytes, limits?.maxBytes ?? SEU_VIDEO_LIMITES.maxBytes)) fail('Choose a video up to 100 MB.', 'size')
  const contentType = seuVideoContentType(file)
  if (!contentType) fail('Choose an MP4 or MOV video. WebM is not supported.', 'format')
  const meta = await lerMetaDoVideo(async (start, end) => new Uint8Array(await file.slice(start, end + 1).arrayBuffer()), file.size)
  if (!meta || !finite(meta.segundos) || !finite(meta.largura) || !finite(meta.altura) || meta.largura <= 0 || meta.altura <= 0) fail('Could not read this video. Choose an MP4 or MOV video.', 'format')
  const minSeconds = limits?.minSeconds ?? SEU_VIDEO_LIMITES.minSegundos, maxSeconds = Math.min(SEU_VIDEO_LIMITES.maxSegundos, limits?.maxSeconds ?? SEU_VIDEO_LIMITES.maxSegundos)
  if (meta.segundos < minSeconds || meta.segundos > maxSeconds) fail(`Choose a video between ${minSeconds} and ${maxSeconds} seconds long.`, 'duration')
  if (limits && Math.min(meta.largura, meta.altura) < limits.minSide) fail(`Choose a video with at least ${limits.minSide} pixels on each side.`, 'resolution')
  return Object.freeze({ file, contentType, seconds: meta.segundos, bytes: file.size, width: meta.largura, height: meta.altura, estimatedCredits: estimateSeuVideoCredits(meta.segundos) })
}

function clipFrom(value: unknown, phase: 'generate' | 'status'): SeuVideoClip {
  const v = record(value)
  if (typeof v.id !== 'string' || !v.id || !['pending', 'processing', 'done', 'failed'].includes(String(v.status))) throw new SeuVideoClientError('Could not read the video state. Retry the status check.', 'response', phase, undefined, phase === 'generate' ? 'unknown' : 'not-started')
  const refunded = finite(v.credits_refunded) && v.credits_refunded >= 0 ? v.credits_refunded : undefined
  const video = v.status === 'done' && typeof v.video_url === 'string' && /^https?:\/\//i.test(v.video_url) ? v.video_url : null
  const refundConfirmed = phase === 'status' && v.status === 'failed' && refunded !== undefined && refunded > 0
  const message = typeof v.message === 'string' && v.message.trim() ? v.message : undefined
  return Object.freeze({ id: v.id, status: v.status as SeuVideoClip['status'], ...(phase === 'status' ? { video_url: video, ...(refunded === undefined ? {} : { credits_refunded: refunded }), ...(typeof v.reason === 'string' ? { reason: v.reason } : {}), ...(message ? { message } : {}) } : {}), refundConfirmed })
}

export function createSeuVideoClient(deps: SeuVideoClientDeps = {}) {
  // No global fetch is invoked or captured until an explicit method is called.
  const request = (url: string, init: RequestInit) => (deps.fetch ?? globalThis.fetch)(url, init)
  const preparePhoto: (file: File) => Promise<File> = deps.preparePhoto ?? (file => compressPhoto(file))
  const uploadedPhotos = new WeakMap<File, Promise<string>>()
  const checkedVideos = new WeakSet<CheckedSeuVideo>()
  const fileIds = new WeakMap<File, number>()
  let nextFileId = 0
  const jobs = new Map<string, { fingerprint: string; inFlight?: Promise<SeuVideoSubmission>; result?: SeuVideoSubmission }>()

  async function jsonRequest(url: string, phase: SeuVideoPhase, init: RequestInit): Promise<Record<string, unknown>> {
    let res: Response
    try { res = await request(url, { cache: 'no-store', credentials: 'same-origin', ...init }) }
    catch (error) {
      const cancelled = init.signal?.aborted || (error instanceof Error && error.name === 'AbortError')
      throw new SeuVideoClientError(cancelled ? 'The request was cancelled. Keep this page open.' : phase === 'generate' ? 'Could not confirm this request. Keep this page open and retry with the same request key.' : 'Network error. Keep your files here and retry this step.', cancelled ? 'aborted' : 'network', phase, undefined, phase === 'generate' ? 'unknown' : 'not-started')
    }
    let data: Record<string, unknown>
    try { data = record(await res.json()) } catch { data = {} }
    if (!res.ok) {
      const code = typeof data.code === 'string' ? data.code : res.status === 401 ? 'auth' : res.status === 404 ? 'unavailable' : 'http'
      let message = typeof data.error === 'string' ? data.error : 'This step could not finish. Please retry.'
      if (res.status === 401) message = 'Sign in to continue. Your files are still here.'
      if (res.status === 404) message = APPROVED_ONLY
      if (code === 'idempotency_conflict') message = 'This request key is already in use. Check My videos before starting another request.'
      const hasServerCode = typeof data.code === 'string' && data.code.trim().length > 0
      throw new SeuVideoClientError(message, code, phase, res.status, phase === 'generate' && res.status >= 500 && !hasServerCode ? 'unknown' : 'not-started', finite(data.shortfall) ? data.shortfall : undefined)
    }
    if (Object.keys(data).length === 0) throw new SeuVideoClientError('Could not read the response. Keep this page open and retry the same request.', 'response', phase, res.status, phase === 'generate' ? 'unknown' : 'not-started')
    return data
  }

  async function prepareSeuVideo(input: PrepareSeuVideoInput, signal?: AbortSignal): Promise<CheckedSeuVideo> {
    abort(signal); peopleCount(input.people)
    const genders = chosenGenders(input.genders, input.people)
    const local = await validateSeuVideoFile(input.file, deps.presentation)
    abort(signal)
    const ticket = await jsonRequest(API + '/upload', 'video-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bytes: local.bytes, content_type: local.contentType }), signal })
    if (typeof ticket.video_path !== 'string' || !ticket.video_path || typeof ticket.upload_url !== 'string' || !/^https?:\/\//i.test(ticket.upload_url)) fail('Could not prepare the video upload. Please retry.', 'response', 'video-upload')
    abort(signal)
    let uploaded: Response
    try { uploaded = await request(ticket.upload_url, { method: 'PUT', headers: { 'Content-Type': local.contentType }, body: input.file, credentials: 'omit', signal }) }
    catch { throw new SeuVideoClientError('Video upload did not finish. Keep the file here and retry.', signal?.aborted ? 'aborted' : 'network', 'video-upload') }
    if (!uploaded.ok) throw new SeuVideoClientError('Video upload did not finish. Keep the file here and retry.', 'upload', 'video-upload', uploaded.status)
    abort(signal)
    const data = await jsonRequest(API + '/check', 'check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_path: ticket.video_path, people: input.people, ...(input.positions ? { positions: input.positions } : {}), ...(genders ? { genders } : {}) }), signal })
    if (data.ok !== true || !finite(data.seconds) || !finite(data.fps) || !finite(data.width) || !finite(data.height) || !finite(data.bytes) || !finite(data.generated_seconds) || !finite(data.credits) || data.credits < 0 || typeof data.prompt !== 'string' || !data.prompt.trim()) fail('Could not verify the video and its cost. Check the video again.', 'response', 'check')
    const presentation = presentationFrom(data.presentation) ?? presentationFrom(deps.presentation)
    if (data.presentation !== undefined && !presentationFrom(data.presentation)) fail('Could not read the checked video requirements. Check the video again.', 'response', 'check')
    const checked: CheckedSeuVideo = Object.freeze({ video_path: ticket.video_path, people: input.people, seconds: data.seconds, fps: data.fps, width: data.width, height: data.height, bytes: data.bytes, generated_seconds: data.generated_seconds, credits: data.credits, prompt: data.prompt, ...(presentation ? { presentation } : {}), ...(genders ? { genders } : {}), ...(typeof data.aspect_ratio === 'string' ? { aspect_ratio: data.aspect_ratio } : {}), ...(finite(data.balance) ? { balance: data.balance } : {}), ...(finite(data.shortfall) ? { shortfall: data.shortfall } : {}), ...(typeof data.needs_plan === 'boolean' ? { needs_plan: data.needs_plan } : {}) })
    checkedVideos.add(checked)
    return checked
  }

  async function uploadPhoto(file: File, signal?: AbortSignal): Promise<string> {
    const cached = uploadedPhotos.get(file)
    if (cached) return cached
    const operation = (async () => {
      abort(signal)
      const photo = await preparePhoto(file)
      if (!/^image\/(jpeg|png)$/i.test(photo.type) || photo.size <= 0 || photo.size > PHOTO_MAX_BYTES) fail('Could not prepare this photo. Choose a JPG or PNG photo up to 8 MB.', 'photo_format', 'photo-upload')
      abort(signal)
      const form = new FormData(); form.set('file', photo); form.set('purpose', 'animate'); form.set('rights', 'true')
      const data = await jsonRequest('/api/avatar/upload', 'photo-upload', { method: 'POST', body: form, signal })
      if (typeof data.url !== 'string' || !/^https?:\/\//i.test(data.url)) fail('Could not read the uploaded photo. Please retry.', 'response', 'photo-upload')
      return data.url
    })()
    uploadedPhotos.set(file, operation)
    try { return await operation } catch (error) {
      uploadedPhotos.delete(file)
      if (error instanceof SeuVideoClientError) throw error
      throw new SeuVideoClientError('Could not prepare this photo. Keep it here and try again.', 'photo_prepare', 'photo-upload')
    }
  }

  async function generateSeuVideo(input: GenerateSeuVideoInput, signal?: AbortSignal): Promise<SeuVideoSubmission> {
    abort(signal)
    const checked = input.checked
    if (!checked || !checkedVideos.has(checked)) fail('Check your video before generating.', 'check_required')
    if (!finite(input.confirmedCredits) || input.confirmedCredits !== checked.credits) fail('The checked cost has changed. Review the credits and confirm Generate again.', 'cost_changed')
    if (checked.needs_plan) throw new SeuVideoClientError('This video needs a paid plan. Check the video again after choosing a plan.', 'plan', 'local', 402)
    if (checked.shortfall !== undefined && checked.shortfall > 0) throw new SeuVideoClientError(`You need ${checked.shortfall} more credits.`, 'credits', 'local', 402, 'not-started', checked.shortfall)
    validateSeuVideoPhotos(input.photos)
    if (input.photos.length !== checked.people) fail('The number of photos changed. Check the video and prompt again.', 'people_changed')
    const genders = chosenGenders(input.genders ?? checked.genders, input.photos.length)
    if (checked.genders && JSON.stringify(genders) !== JSON.stringify(checked.genders)) fail('The photo choices changed. Check the video and prompt again.', 'genders_changed')
    if (!input.consent) fail('Confirm permission to use this video and these photos.', 'consent')
    const prompt = validarPrompt(input.prompt, input.photos.length)
    if (!prompt.ok) fail(prompt.error.replace(/ Nothing was charged\./g, ''), 'prompt')
    // Same accepted key format as clipFlow; the caller owns its lifetime.
    if (typeof input.key !== 'string' || !/^[A-Za-z0-9._:-]{8,100}$/.test(input.key)) fail('Keep a valid request key before generating.', 'idempotency')
    const selectedPhotos = [...input.photos], key = input.key, promptEdited = input.promptEdited === true || !!genders || prompt.prompt !== checked.prompt
    const photoIds = selectedPhotos.map(file => { if (!fileIds.has(file)) fileIds.set(file, ++nextFileId); return fileIds.get(file) })
    const fingerprint = JSON.stringify([checked.video_path, checked.people, prompt.prompt, photoIds, true, promptEdited, genders])
    const existing = jobs.get(key)
    if (existing && existing.fingerprint !== fingerprint) fail('This request key belongs to different inputs. Keep the earlier request or start a new one explicitly.', 'idempotency_conflict')
    if (existing?.result) return existing.result
    if (existing?.inFlight) return existing.inFlight
    const job: { fingerprint: string; inFlight?: Promise<SeuVideoSubmission>; result?: SeuVideoSubmission } = existing ?? { fingerprint }
    jobs.set(key, job)
    const operation = (async () => {
      const photos: string[] = []
      for (const file of selectedPhotos) photos.push(await uploadPhoto(file, signal))
      abort(signal)
      const data = await jsonRequest(API, 'generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ video_path: checked.video_path, photos, prompt: prompt.prompt, consent: true, prompt_edited: promptEdited }), signal })
      const result = Object.freeze({ clip: clipFrom(data.clip, 'generate'), replay: data.replay === true, key })
      job.result = result
      return result
    })()
    job.inFlight = operation
    try { return await operation } finally { delete job.inFlight }
  }

  async function getSeuVideoStatus(id: string, signal?: AbortSignal): Promise<SeuVideoClip> {
    abort(signal)
    if (typeof id !== 'string' || !id.trim() || id.length > 100) fail('Choose a valid video to check.', 'clip_id', 'status')
    const data = await jsonRequest('/api/recreate/status?id=' + encodeURIComponent(id), 'status', { method: 'GET', signal })
    const clip = clipFrom(data.clip, 'status')
    if (clip.id !== id) fail('The status response did not match this video. Retry the status check.', 'response', 'status')
    return clip
  }
  return { prepareSeuVideo, generateSeuVideo, getSeuVideoStatus }
}
