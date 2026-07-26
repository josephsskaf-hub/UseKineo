// KINEO-AUTOPILOT-2026-07-26 — geração e publicação, SEM fork.
//
// Cada passo aqui é uma chamada HTTP para a MESMA rota que o browser do
// usuário chamaria, autenticada como ele (lib/autopilot/session.ts):
//
//   1. POST /api/generate-video-fast  → roteiro + clipes de stock
//   2. POST /api/compose              → nasce o render (grava render_jobs =
//                                       intenção de cobrança server-side)
//   3. GET  /api/compose/status/:id   → LIQUIDA o crédito, persiste em `videos`
//   4. POST /api/youtube/upload       → publica no canal
//
// Nenhuma linha de lógica de render, de preço ou de watermark é duplicada.
// Se /api/compose mudar de preço amanhã, o Autopilot muda junto sozinho.

import { AUTOPILOT_DURATION_SECONDS } from '@/lib/autopilot/config'
import { callAsUser, type UserSession } from '@/lib/autopilot/session'
import type { Quality } from '@/lib/credits/engineCost'

interface FastResponse {
  generationId?: string
  clip_urls?: string[]
  voiceover_script?: string
  scene_captions?: string[]
  duration?: number
  verbatim?: boolean
  speed?: number
  error?: string
}

interface ComposeResponse {
  render_id?: string
  error?: string
  pending?: boolean
}

interface StatusResponse {
  phase?: 'done' | 'failed' | 'composing' | 'processing'
  final_video_url?: string
  video_id?: string | null
  progress?: number
  creditsDeducted?: number
  error?: string
}

interface UploadResponse {
  videoId?: string
  youtubeUrl?: string
  error?: string
}

export type StartRenderResult =
  | { ok: true; renderId: string; generationId: string }
  | { ok: false; stage: 'generate' | 'compose'; error: string; retryable: boolean }

/** Passos 1 e 2: roteiro + clipes, depois o submit do render. */
export async function startRender(args: {
  baseUrl: string
  session: UserSession
  prompt: string
  topic: string
  engine: Quality
  language: string
}): Promise<StartRenderResult> {
  const fast = await callAsUser<FastResponse>({
    baseUrl: args.baseUrl,
    path: '/api/generate-video-fast',
    session: args.session,
    method: 'POST',
    body: { prompt: args.prompt, duration: AUTOPILOT_DURATION_SECONDS },
    timeoutMs: 130_000,
  })
  if (!fast.ok || !fast.body) {
    return {
      ok: false,
      stage: 'generate',
      error: fast.body?.error ?? fast.errorText ?? `HTTP ${fast.status}`,
      retryable: fast.status === 0 || fast.status >= 500,
    }
  }

  const generationId = (fast.body.generationId ?? '').trim()
  const clipUrls = Array.isArray(fast.body.clip_urls) ? fast.body.clip_urls : []
  const voiceoverScript = (fast.body.voiceover_script ?? '').trim()
  if (!generationId || clipUrls.length === 0 || !voiceoverScript) {
    return {
      ok: false,
      stage: 'generate',
      error: 'fast pipeline returned an incomplete payload (no clips or no script)',
      retryable: true,
    }
  }

  const compose = await callAsUser<ComposeResponse>({
    baseUrl: args.baseUrl,
    path: '/api/compose',
    session: args.session,
    method: 'POST',
    body: {
      generationId,
      clip_urls: clipUrls,
      voiceover_script: voiceoverScript,
      scene_captions: fast.body.scene_captions ?? [],
      duration: fast.body.duration ?? AUTOPILOT_DURATION_SECONDS,
      topic: args.topic,
      quality: args.engine,
      language: args.language,
      ...(fast.body.verbatim && typeof fast.body.speed === 'number'
        ? { speed: fast.body.speed }
        : {}),
    },
    timeoutMs: 290_000,
  })

  const renderId = (compose.body?.render_id ?? '').trim()
  if (!compose.ok || !renderId) {
    return {
      ok: false,
      stage: 'compose',
      error: compose.body?.error ?? compose.errorText ?? `HTTP ${compose.status}`,
      // 409/503 de compose são "aceito, reconciliando" — o próximo passe tenta
      // de novo em vez de queimar o dia.
      retryable: compose.status === 0 || compose.status === 409 || compose.status >= 500,
    }
  }
  return { ok: true, renderId, generationId }
}

export type RenderStatus =
  | { state: 'done'; videoUrl: string; videoId: string | null; creditsDeducted: number }
  | { state: 'pending'; progress: number }
  | { state: 'failed'; error: string }

/**
 * Passo 3. IMPORTANTE: é esta chamada que liquida o crédito e grava a linha em
 * `videos`. Ela precisa acontecer mesmo que a publicação no YouTube falhe
 * depois — por isso o passe de publicação sempre consulta o status primeiro.
 */
export async function checkRender(args: {
  baseUrl: string
  session: UserSession
  renderId: string
  engine: Quality
  topic: string
}): Promise<RenderStatus> {
  const params = new URLSearchParams({
    quality: args.engine,
    duration: String(AUTOPILOT_DURATION_SECONDS),
    topic: args.topic.slice(0, 1000),
  })
  const res = await callAsUser<StatusResponse>({
    baseUrl: args.baseUrl,
    path: `/api/compose/status/${encodeURIComponent(args.renderId)}?${params.toString()}`,
    session: args.session,
    method: 'GET',
    timeoutMs: 90_000,
  })

  const phase = res.body?.phase
  if (phase === 'done' && res.body?.final_video_url) {
    return {
      state: 'done',
      videoUrl: res.body.final_video_url,
      videoId: res.body.video_id ?? null,
      creditsDeducted: typeof res.body.creditsDeducted === 'number' ? res.body.creditsDeducted : 0,
    }
  }
  if (phase === 'failed') {
    return { state: 'failed', error: (res.body?.error ?? 'render failed').slice(0, 500) }
  }
  // 503 com reconcile, 'composing', 'processing' ou erro de rede: ainda em voo.
  if (!res.ok && res.status !== 0 && res.status < 500 && res.status !== 409 && !phase) {
    return { state: 'failed', error: (res.body?.error ?? res.errorText ?? `HTTP ${res.status}`).slice(0, 500) }
  }
  return { state: 'pending', progress: typeof res.body?.progress === 'number' ? res.body.progress : 0 }
}

export type PublishResult =
  | { ok: true; youtubeVideoId: string; youtubeUrl: string }
  | { ok: false; error: string; retryable: boolean }

/** Passo 4. Usa a rota de upload existente, agora com escopo de canal. */
export async function publishToYouTube(args: {
  baseUrl: string
  session: UserSession
  channelId: string | null
  videoUrl: string
  title: string
  description: string
  tags: string[]
  privacyStatus: 'public' | 'private' | 'unlisted'
}): Promise<PublishResult> {
  const res = await callAsUser<UploadResponse>({
    baseUrl: args.baseUrl,
    path: '/api/youtube/upload',
    session: args.session,
    method: 'POST',
    body: {
      videoUrl: args.videoUrl,
      title: args.title.slice(0, 100),
      description: args.description.slice(0, 4800),
      tags: args.tags.slice(0, 15),
      privacyStatus: args.privacyStatus,
      ...(args.channelId ? { channelId: args.channelId } : {}),
    },
    timeoutMs: 290_000,
  })

  const videoId = (res.body?.videoId ?? '').trim()
  if (!res.ok || !videoId) {
    return {
      ok: false,
      error: (res.body?.error ?? res.errorText ?? `HTTP ${res.status}`).slice(0, 500),
      retryable: res.status === 0 || res.status >= 500,
    }
  }
  return {
    ok: true,
    youtubeVideoId: videoId,
    youtubeUrl: res.body?.youtubeUrl ?? `https://www.youtube.com/shorts/${videoId}`,
  }
}

/** Título/descrição/tags a partir do tema. Tudo em inglês (site é EN-only). */
export function buildPublishMetadata(topic: string, niche: string | null): {
  title: string
  description: string
  tags: string[]
} {
  const clean = topic.replace(/\s+/g, ' ').trim()
  const title = clean.length > 96 ? `${clean.slice(0, 93)}...` : clean
  const nicheTag = (niche ?? '').replace(/[^a-zA-Z0-9]/g, '')
  const tags = ['shorts', 'facts', ...(nicheTag ? [nicheTag] : [])]
  const description = [
    clean,
    '',
    '#Shorts ' + tags.filter((t) => t !== 'shorts').map((t) => `#${t}`).join(' '),
  ].join('\n')
  return { title: title || 'Daily Short', description, tags }
}
