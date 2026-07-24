// KINEO-FAST-V4-2026-07-10 — AI HOOK for the FIRST video of every account.
//
// The first video is where a new user decides whether Kineo is magic or just
// stock clips. This module generates ONE Seedance clip (5s, 720p, ~$0.10-0.15)
// for the opening scene of a user's FIRST Fast video only — the "wow" first
// frame of the AI engine, injected into the free product exactly once, at the
// moment of maximum conversion leverage. Every generated hook is also vaulted,
// so over time popular topics get their AI hooks reused for FREE.
//
// Fail-safe by design:
//   - Toggle: FAST_AI_HOOK=false disables entirely.
//   - Submit + poll are capped (default 60s): on timeout/error the caller just
//     keeps its stock hook. The video is NEVER blocked or degraded by this.
//   - Only fires when FAL_KEY exists and the caller confirmed first-video.

import { fal } from '@fal-ai/client'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { vaultClipAsync } from './clipVault'

const SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const POLL_INTERVAL_MS = 2500

// Persistence target — the SAME public bucket the clip vault serves from
// (lib/clipVault.ts VAULT_BUCKET). Clips served from here are always fetchable
// by Creatomate and pass /api/compose's storage/fal guards.
const HOOK_BUCKET = 'broll'
const MAX_HOOK_BYTES = 40 * 1024 * 1024
const FAL_URL_RE = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i

export interface AiHookHandle {
  requestId: string
  prompt: string
}

/** Build a faceless, era-safe cinematic prompt from the hook scene's text. */
export function buildHookPrompt(sceneDescription: string, topic: string): string {
  const base = `${sceneDescription || topic}`
    .replace(/\b(man|woman|person|people|guy|girl|influencer|model)\b/gi, 'distant silhouetted figure')
    .slice(0, 300)
  return (
    `${base}, cinematic establishing shot, photorealistic, dramatic lighting, ` +
    `dark moody atmosphere, high detail, no text, no captions, no logos, ` +
    `no recognizable human faces`
  )
}

/** Submit the hook generation. Returns null when disabled/unconfigured. Never throws. */
export async function submitAiHook(prompt: string): Promise<AiHookHandle | null> {
  try {
    if (process.env.FAST_AI_HOOK === 'false') return null
    const falKey = process.env.FAL_KEY
    if (!falKey) return null
    fal.config({ credentials: falKey })
    const { request_id } = await fal.queue.submit(SEEDANCE_MODEL, {
      input: {
        prompt,
        aspect_ratio: '9:16',
        resolution: '720p', // fastest + cheapest; a 9:16 phone hook hides the difference
        duration: '5',
        generate_audio: false,
      },
    })
    if (!request_id) return null
    console.log(`[ai-hook] submitted request=${request_id} prompt="${prompt.slice(0, 70)}"`)
    return { requestId: request_id, prompt }
  } catch (err) {
    console.warn('[ai-hook] submit failed (non-blocking):', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Poll until the hook clip is ready or the budget runs out. Returns the video
 * URL or null. Never throws. On success the clip is vaulted (fire-and-forget)
 * so future videos on this topic get it free.
 */
export async function awaitAiHook(
  handle: AiHookHandle,
  budgetMs = 60_000,
  vaultQuery?: string,
): Promise<string | null> {
  const deadline = Date.now() + budgetMs
  try {
    while (Date.now() < deadline) {
      const status = await fal.queue.status(SEEDANCE_MODEL, {
        requestId: handle.requestId,
        logs: false,
      })
      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result(SEEDANCE_MODEL, { requestId: handle.requestId })
        const url = (result?.data as { video?: { url?: string } } | undefined)?.video?.url ?? null
        if (url) {
          console.log(`[ai-hook] READY in budget — url=${url.slice(0, 60)}`)
          void vaultClipAsync({
            sourceUrl: url,
            provider: 'pixabay', // vault schema provider is informational; tags mark it
            query: vaultQuery ?? handle.prompt.slice(0, 120),
            tags: `ai-hook, seedance, cinematic, ${(vaultQuery ?? '').toLowerCase()}`,
            score: 30, // AI hooks outrank any stock clip in vault searches
            durationSec: 5,
          })
        }
        return url
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }
    console.log(`[ai-hook] budget exhausted (${budgetMs}ms) — keeping stock hook (clip may still vault via future request)`)
    return null
  } catch (err) {
    console.warn('[ai-hook] await failed (non-blocking):', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Copy the ready hook clip into OUR public Supabase storage and return the
 * durable public URL. awaitAiHook resolves to a raw fal.media URL, which
 * expires AND is stripped/rejected by /api/generate-video-fast + /api/compose;
 * only a URL served from our own storage survives to the render. The vault's
 * fire-and-forget copy can't be handed back synchronously, so this is a
 * dedicated, bounded, returning persist step.
 *
 * Never throws. Returns null on any failure (caller keeps its stock hook).
 * A non-fal input URL is passed through unchanged (already durable).
 */
export async function persistHookClip(
  falUrl: string,
  budgetMs = 15_000,
): Promise<string | null> {
  try {
    if (!falUrl) return null
    // Already durable (not a fal CDN URL) — nothing to persist.
    if (!FAL_URL_RE.test(falUrl)) return falUrl

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.warn('[ai-hook] persist skipped — Supabase service creds missing')
      return null
    }
    const admin = createSupabaseAdmin(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const res = await fetch(falUrl, { signal: AbortSignal.timeout(budgetMs) })
    if (!res.ok) {
      console.warn(`[ai-hook] persist download failed status=${res.status}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_HOOK_BYTES) {
      console.warn(`[ai-hook] persist skip oversize clip (${Math.round(buf.byteLength / 1e6)}MB)`)
      return null
    }

    const path = `ai-hook/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
    const { error: upErr } = await admin.storage
      .from(HOOK_BUCKET)
      .upload(path, buf, { contentType: 'video/mp4', upsert: false })
    if (upErr) {
      console.warn('[ai-hook] persist upload failed:', upErr.message)
      return null
    }
    const { data: pub } = admin.storage.from(HOOK_BUCKET).getPublicUrl(path)
    const storageUrl = pub?.publicUrl ?? null
    if (storageUrl) {
      console.log(`[ai-hook] PERSISTED durable hook clip → ${storageUrl.slice(0, 70)}`)
    }
    return storageUrl
  } catch (err) {
    console.warn('[ai-hook] persist failed (non-blocking):', err instanceof Error ? err.message : String(err))
    return null
  }
}
