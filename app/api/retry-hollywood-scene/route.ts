// One failed scene, under the SAME unique compose mutex as the final render.
// Provider ambiguity retains ownership: no blind re-POST or automatic refund.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FalQueueSubmitError, submitFalQueueOnce } from '@/lib/falQueue'
import { loadVerifiedCinematicClaim, retargetCinematicRequestId, validCinematicGenerationId, type CinematicClaim } from '@/lib/cinematic/claim'
import { acquireSceneRetryMutex, markSceneRetryHold, readVerifiedSceneRetryHold, releaseSceneRetryMutex } from '@/lib/cinematic/sceneRetry'
import { HOLLYWOOD_MODELS, KLING3_I2V_MODEL, H3_MODELS, H3_I2V_MODEL, H3_RESOLUTION, OMNI_I2V_MODEL } from '@/lib/hollywood/router'
import { openai } from '@/lib/openai'

async function softenPromptForModeration(prompt: string): Promise<string> {
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 900,
      messages: [
        { role: 'system', content: 'A video-generation provider rejected the following SCENE PROMPT for content-policy reasons. Rewrite it so it passes moderation while staying AS CLOSE AS POSSIBLE to the original scene. Rules: keep the same subject, setting, era, mood, camera directions and cinematography lines VERBATIM where they are not the problem. Soften or replace only what typically trips moderation: graphic violence/injury (imply aftermath instead), weapons pointed at people (holstered/lowered), gore/blood (remove), destruction of people (make it property/landscape), real people/brands (make generic), anything sexual (remove). Never add new story elements. Output ONLY the rewritten prompt, no explanation.' },
        { role: 'user', content: prompt },
      ],
    })
    const out = (r.choices[0]?.message?.content ?? '').trim()
    return out.length >= 20 && out.length <= Math.min(prompt.length * 1.5, 6000) ? out : prompt
  } catch { return prompt }
}

const H3_SET = new Set<string>([...Object.values(H3_MODELS), H3_I2V_MODEL])
const ALLOWED = new Set<string>([...Object.values(HOLLYWOOD_MODELS), KLING3_I2V_MODEL, ...H3_SET, OMNI_I2V_MODEL])
type Slot = { index: number; oldRequestId: string | null; model: string }

function retryableSlot(claim: CinematicClaim, slot: Slot): boolean {
  if (claim.status !== 'settled' || slot.index >= claim.falRequestIds.length ||
    claim.falRequestIds[slot.index] !== slot.oldRequestId || claim.falModels[slot.index] !== slot.model ||
    claim.authorizedCompletedUrls[slot.index] || !claim.authorizedCompletedUrls.some(Boolean)) return false
  // The client aborts all-failed generations. At least one signed completed
  // clip also excludes this retry from the all-failed refund path.
  // An ambiguous submit can ALSO leave a null id. Only the signed explicit
  // absence-of-uncertainty flag permits this slot; legacy absence is unknown.
  if (slot.oldRequestId === null) return claim.response?.submission_uncertain === false
  const failed = claim.response?.terminal_failed_jobs
  return Array.isArray(failed) && failed.some(job => job && typeof job === 'object' &&
    job.requestId === slot.oldRequestId && job.model === slot.model)
}

function signedScene(claim: CinematicClaim, slot: Slot) {
  const response = claim.response
  const prompt = Array.isArray(response?.scene_prompts) ? response.scene_prompts[slot.index] : null
  const seconds = Array.isArray(response?.scene_seconds) ? response.scene_seconds[slot.index] : null
  const anchor = Array.isArray(response?.scene_anchor_urls) ? response.scene_anchor_urls[slot.index] : null
  if (typeof prompt !== 'string' || prompt.trim().length < 20 || prompt.length > 6000 ||
    typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 3 || seconds > 15) return null
  const requiresAnchor = [KLING3_I2V_MODEL, H3_I2V_MODEL, OMNI_I2V_MODEL].includes(slot.model)
  if (requiresAnchor && (typeof anchor !== 'string' || !anchor.startsWith('https://'))) return null
  return { prompt: prompt.trim(), seconds: Math.round(seconds), anchor: requiresAnchor ? anchor as string : null }
}

function sceneInput(model: string, scene: NonNullable<ReturnType<typeof signedScene>>, prompt: string): Record<string, unknown> {
  if (model === OMNI_I2V_MODEL) return { image_url: scene.anchor, prompt, aspect_ratio: '9:16', duration: Math.max(3, Math.min(10, scene.seconds)) }
  // H3 does not expose a generate_audio switch. Match its actual schema;
  // compose owns muting support audio when trusted narration is present.
  if (H3_SET.has(model)) return { ...(scene.anchor ? { image_url: scene.anchor } : { aspect_ratio: '9:16' }),
    prompt, duration: Math.max(5, Math.min(15, scene.seconds)), resolution: H3_RESOLUTION }
  if (model === KLING3_I2V_MODEL) return { image_url: scene.anchor, prompt, duration: String(scene.seconds), generate_audio: true }
  return {
    prompt: prompt.startsWith('Vertical 9:16') ? prompt : `Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. ${prompt}`,
    duration: String(scene.seconds), aspect_ratio: '9:16', generate_audio: true, cfg_scale: 0.6,
    negative_prompt: 'cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
  }
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!validCinematicGenerationId(body.generationId) || !Number.isInteger(body.sceneIndex) || (body.sceneIndex as number) < 0 ||
    typeof body.model !== 'string' || !ALLOWED.has(body.model) || !Object.prototype.hasOwnProperty.call(body, 'oldRequestId') ||
    !(body.oldRequestId === null || (typeof body.oldRequestId === 'string' && body.oldRequestId.length > 0 && body.oldRequestId.length <= 512))) {
    return NextResponse.json({ error: 'A signed generation and exact scene slot are required.', retryable: false }, { status: 400 })
  }
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminUrl || !secret || !process.env.FAL_KEY) return NextResponse.json({ error: 'Retry unavailable', retryable: false }, { status: 503 })
  const args = { db: createAdminClient(adminUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } }),
    secret, userId: user.id, generationId: body.generationId }
  const slot: Slot = { index: body.sceneIndex as number, oldRequestId: body.oldRequestId as string | null, model: body.model }
  const support = () => NextResponse.json({ error: 'Scene retry requires confirmation. Do not start another attempt.',
    generationId: args.generationId, sceneRetryPending: true, supportPending: true, reason: 'scene_retry_unresolved',
    retryable: false, refunded: false, refundConfirmed: false, claimReleased: false }, { status: 422 })
  const refused = () => NextResponse.json({ error: 'This scene is not authorized for retry.', retryable: false }, { status: 409 })
  const existingHold = await readVerifiedSceneRetryHold(args)
  if (existingHold) {
    const elapsed = Date.now() - Date.parse(existingHold.startedAt)
    if (existingHold.phase !== 'submitting' || elapsed < 0 || elapsed >= 120_000) return support()
    return NextResponse.json({ pending: true, generationId: args.generationId, retryable: false }, { status: 409 })
  }
  let loaded
  try { loaded = await loadVerifiedCinematicClaim(args) }
  catch { return NextResponse.json({ error: 'Generation verification unavailable', retryable: false }, { status: 503 }) }
  if (!loaded.ok || !loaded.claim || !retryableSlot(loaded.claim, slot)) return refused()
  const birth = loaded.claim, scene = signedScene(birth, slot)
  if (!scene) return refused()
  const acquired = await acquireSceneRetryMutex({ ...args, quality: birth.quality, cost: birth.creditCost,
    sceneIndex: slot.index, oldRequestId: slot.oldRequestId, model: slot.model })
  if (acquired.kind !== 'acquired') {
    const hold = await readVerifiedSceneRetryHold(args)
    if (hold && (hold.phase !== 'submitting' || Date.now() - Date.parse(hold.startedAt) >= 120_000)) return support()
    return NextResponse.json({ error: 'Generation is already being processed or could not be locked.',
      pending: true, generationId: args.generationId, retryable: false }, { status: acquired.kind === 'collision' ? 409 : 503 })
  }
  const mutex = acquired.mutex
  let falPosted = false, accepted = false, acceptedRequestId: string | null = null
  const revalidate = async () => {
    const current = await loadVerifiedCinematicClaim(args)
    return current.ok && current.claim && retryableSlot(current.claim, slot) &&
      current.claim.quality === birth.quality && current.claim.creditCost === birth.creditCost &&
      current.claim.fingerprint === birth.fingerprint && JSON.stringify(signedScene(current.claim, slot)) === JSON.stringify(scene)
  }
  try {
    // Close stale pre-lock reads before either paid service. Recheck after the
    // optional rewrite too: it yields long enough for a birth to change.
    if (!await revalidate()) return await releaseSceneRetryMutex(args, mutex) ? refused() : support()
    const prompt = body.sanitize === true ? await softenPromptForModeration(scene.prompt) : scene.prompt
    if (!await revalidate()) return await releaseSceneRetryMutex(args, mutex) ? refused() : support()
    const requestId = await submitFalQueueOnce(slot.model, sceneInput(slot.model, scene, prompt), () => { falPosted = true })
    accepted = true
    acceptedRequestId = requestId
    const retargeted = await retargetCinematicRequestId({ ...args, index: slot.index, oldRequestId: slot.oldRequestId, newRequestId: requestId, model: slot.model })
    if (!retargeted.ok) { await markSceneRetryHold(args, mutex, 'retarget_failed', requestId); return support() }
    if (!await releaseSceneRetryMutex(args, mutex)) { await markSceneRetryHold(args, mutex, 'release_unconfirmed', requestId); return support() }
    return NextResponse.json({ requestId, model: slot.model })
  } catch (error) {
    // Generic exceptions after the POST, 408, 5xx, transport failures and a
    // successful response without an id never prove that the paid job is absent.
    const explicitRejection = !accepted && error instanceof FalQueueSubmitError && !error.ambiguous
    if (!falPosted || explicitRejection) {
      if (await releaseSceneRetryMutex(args, mutex)) return NextResponse.json({ error: 'Scene retry was not submitted.', retryable: false }, { status: 502 })
    }
    await markSceneRetryHold(args, mutex, accepted ? 'retarget_failed' : 'ambiguous', acceptedRequestId)
    return support()
  }
}
