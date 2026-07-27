// lib/youtube.ts — Push #317
// YouTube Data API v3 + YouTube Analytics API helpers.
// Handles OAuth token exchange, refresh, video upload, and analytics fetch.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ─── OAuth ────────────────────────────────────────────────────────────────────

const YOUTUBE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3'
const YOUTUBE_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2'

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ')

export interface YouTubeTokens {
  access_token: string
  refresh_token: string
  expires_at: number // unix ms
  scope: string
}

// ─── Redirect URI: UMA fonte de verdade ───────────────────────────────────────
// KINEO-YTCONNECT-2026-07-26 — POR QUE ISTO EXISTE.
//
// `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback` era montado por
// concatenação em DOIS lugares (buildYouTubeAuthUrl e exchangeCodeForTokens).
// Com a env ausente isso não explode: emite a STRING LITERAL
// "undefined/api/youtube/callback", que o Google recusa com
// `redirect_uri_mismatch` — o erro genérico que custou horas de diagnóstico e
// que, do lado do usuário, aparece como uma tela do Google sem nenhuma pista de
// que a culpa é de uma variável de ambiente NOSSA.
//
// Regras: origem única, https obrigatório em produção, e falha ALTA e NOMEADA
// (YouTubeOAuthConfigError + uma linha de log que diz exatamente qual env está
// errada e qual valor chegou). Um olhar no log tem que bastar.

/** Erro de CONFIGURAÇÃO (env), não de usuário. Nome próprio para grep no log. */
export class YouTubeOAuthConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'YouTubeOAuthConfigError'
  }
}

/** Erro de usuário: a conta Google escolhida não tem canal no YouTube. */
export class YouTubeNoChannelError extends Error {
  constructor(message = 'No YouTube channel found for this Google account') {
    super(message)
    this.name = 'YouTubeNoChannelError'
  }
}

// O domínio público atual. Só é usado quando NEXT_PUBLIC_APP_URL está VAZIA —
// nunca sobrescreve uma env presente, para não mascarar preview deploys.
const YOUTUBE_FALLBACK_ORIGIN = 'https://usekineo.com'

export const YOUTUBE_CALLBACK_PATH = '/api/youtube/callback'

/**
 * Origem absoluta e válida do app, ou erro nomeado. Aceita http SOMENTE em
 * localhost (dev): fora disso o Google exige https e um http:// aqui vira o
 * mesmo redirect_uri_mismatch silencioso que estamos matando.
 */
export function resolveAppOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const candidate = raw || YOUTUBE_FALLBACK_ORIGIN

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    const msg =
      `NEXT_PUBLIC_APP_URL is not an absolute URL (got ${JSON.stringify(raw)}). ` +
      `Expected something like "https://usekineo.com". Google OAuth cannot be built from this.`
    console.error(`[youtube][CONFIG] ${msg}`)
    throw new YouTubeOAuthConfigError(msg)
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !isLocalhost) {
    const msg =
      `NEXT_PUBLIC_APP_URL must be https (got ${JSON.stringify(parsed.origin)}). ` +
      `Google rejects non-https redirect URIs with redirect_uri_mismatch.`
    console.error(`[youtube][CONFIG] ${msg}`)
    throw new YouTubeOAuthConfigError(msg)
  }

  return parsed.origin
}

/**
 * O redirect_uri EXATO. Tem que bater byte a byte com o que está registrado no
 * console do Google (projeto shortsforgeai): usekineo.com, www.usekineo.com.
 * Usado tanto ao MONTAR o consent quanto ao TROCAR o code — se os dois lados
 * divergirem o Google recusa a troca, então os dois chamam esta função.
 */
export function youtubeRedirectUri(): string {
  return `${resolveAppOrigin()}${YOUTUBE_CALLBACK_PATH}`
}

// ─── Build the Google OAuth URL ───────────────────────────────────────────────

export function buildYouTubeAuthUrl(state: string): string {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const redirectUri = youtubeRedirectUri()
  if (!clientId) {
    const msg = 'YOUTUBE_CLIENT_ID not configured'
    console.error(`[youtube][CONFIG] ${msg}`)
    throw new YouTubeOAuthConfigError(msg)
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // force refresh_token on every auth
    state,
  })
  return `${YOUTUBE_AUTH_BASE}?${params.toString()}`
}

// ─── Exchange code for tokens ─────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokens> {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  // KINEO-YTCONNECT-2026-07-26 — mesma função que montou o consent. Duas
  // concatenações independentes podiam divergir e o Google recusa a troca.
  const redirectUri = youtubeRedirectUri()
  if (!clientId || !clientSecret) {
    const msg = 'YouTube OAuth credentials not configured (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET)'
    console.error(`[youtube][CONFIG] ${msg}`)
    throw new YouTubeOAuthConfigError(msg)
  }

  const res = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    scope: data.scope ?? YOUTUBE_SCOPES,
  }
}

// ─── Refresh access token ─────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<YouTubeTokens> {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('YouTube OAuth credentials not configured')

  const res = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }
  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Google only sends refresh_token on first auth
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    scope: data.scope ?? YOUTUBE_SCOPES,
  }
}

// ─── Get a valid access token (auto-refresh) ──────────────────────────────────

export async function getValidAccessToken(tokens: YouTubeTokens): Promise<{
  accessToken: string
  updatedTokens: YouTubeTokens | null // non-null if we refreshed
}> {
  const BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry
  if (Date.now() < tokens.expires_at - BUFFER_MS) {
    return { accessToken: tokens.access_token, updatedTokens: null }
  }
  const refreshed = await refreshAccessToken(tokens.refresh_token)
  return { accessToken: refreshed.access_token, updatedTokens: refreshed }
}

// ─── Store / retrieve tokens from Supabase ────────────────────────────────────

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createSupabaseClient(url, key)
}

export async function saveYouTubeTokens(userId: string, tokens: YouTubeTokens): Promise<void> {
  const sb = serviceSupabase()
  const { error } = await sb
    .from('profiles')
    .update({ youtube_tokens: tokens })
    .eq('id', userId)
  if (error) throw new Error(`Failed to save YouTube tokens: ${error.message}`)
}

export async function loadYouTubeTokens(userId: string): Promise<YouTubeTokens | null> {
  const sb = serviceSupabase()
  const { data, error } = await sb
    .from('profiles')
    .select('youtube_tokens')
    .eq('id', userId)
    .single()
  if (error || !data?.youtube_tokens) return null
  return data.youtube_tokens as YouTubeTokens
}

export async function disconnectYouTube(userId: string): Promise<void> {
  const sb = serviceSupabase()
  await sb.from('profiles').update({ youtube_tokens: null }).eq('id', userId)
}

// ─── Video upload ─────────────────────────────────────────────────────────────

export interface UploadOptions {
  videoUrl: string       // public URL of the mp4 to upload
  title: string
  description: string
  tags: string[]
  privacyStatus?: 'public' | 'private' | 'unlisted'
  madeForKids?: boolean
}

export interface UploadResult {
  videoId: string
  youtubeUrl: string
}

// Downloads the mp4 from videoUrl, then uploads to YouTube via resumable upload.
export async function uploadVideoToYouTube(
  accessToken: string,
  opts: UploadOptions,
): Promise<UploadResult> {
  const { videoUrl, title, description, tags, privacyStatus = 'public', madeForKids = false } = opts

  // Step 1 — Get the mp4.
  //
  // KINEO-YTCONNECT-2026-07-26 — `arrayBuffer()` puxava o MP4 INTEIRO para a
  // memória da função antes de começar o upload. Para um Short de ~50s isso é
  // irrelevante (~10 MB), e é por isso que o caminho bufferizado — o único
  // exercitado em produção até hoje — continua sendo o default: trocá-lo por
  // um streaming não testado no caminho quente seria arriscar a publicação de
  // TODO cliente para resolver um problema que ele não tem.
  //
  // O risco real é a cauda: um vídeo longo o bastante derruba a função por OOM
  // e o cliente é cobrado (o crédito é liquidado no passo 3 do pipeline, ANTES
  // da publicação) sem nada ir ao ar. Acima do teto abaixo, o corpo é repassado
  // como stream — o upload resumable do YouTube exige Content-Length exato, e
  // só sabemos esse número sem bufferizar quando a origem manda content-length.
  const STREAM_THRESHOLD_BYTES = 64 * 1024 * 1024

  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`)

  const declaredLength = Number(videoRes.headers.get('content-length') ?? '')
  const canStream =
    Number.isFinite(declaredLength) &&
    declaredLength > STREAM_THRESHOLD_BYTES &&
    videoRes.body !== null

  let videoBody: ArrayBuffer | ReadableStream<Uint8Array>
  let contentLength: number
  if (canStream) {
    videoBody = videoRes.body as ReadableStream<Uint8Array>
    contentLength = declaredLength
    console.log(`[youtube/upload] streaming ${contentLength} bytes (over ${STREAM_THRESHOLD_BYTES} threshold)`)
  } else {
    const buf = await videoRes.arrayBuffer()
    videoBody = buf
    contentLength = buf.byteLength
  }

  // Step 2 — Initiate resumable upload session
  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: tags.slice(0, 500),
      categoryId: '22', // People & Blogs — good for Shorts content
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: madeForKids,
    },
  }

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(contentLength),
      },
      body: JSON.stringify(metadata),
    },
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`YouTube upload init failed: ${initRes.status} ${err}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('YouTube upload: no Location header in response')

  // Step 3 — Upload the video bytes.
  // `duplex: 'half'` é OBRIGATÓRIO no undici (Node 18+) quando o body é um
  // ReadableStream; não existe no tipo RequestInit do TS, daí o cast. Com body
  // bufferizado a opção é ignorada, então o caminho antigo não muda.
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(contentLength),
    },
    body: videoBody as BodyInit,
    ...(canStream ? { duplex: 'half' } : {}),
  } as RequestInit)

  if (!uploadRes.ok && uploadRes.status !== 308) {
    const err = await uploadRes.text()
    throw new Error(`YouTube upload failed: ${uploadRes.status} ${err}`)
  }

  const result = await uploadRes.json()
  const videoId = result.id as string
  if (!videoId) throw new Error('YouTube upload: no video ID in response')

  return {
    videoId,
    youtubeUrl: `https://www.youtube.com/shorts/${videoId}`,
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ChannelStats {
  subscriberCount: number
  viewCount: number
  videoCount: number
  channelTitle: string
  channelId: string
  thumbnailUrl: string | null
}

export interface VideoAnalytic {
  videoId: string
  title: string
  views: number
  likes: number
  comments: number
  averageViewDuration: number // seconds
  impressionsCtr: number // click-through rate %
  publishedAt: string
  thumbnailUrl: string | null
}

interface RawChannelItem {
  id?: string
  snippet?: { title?: string; thumbnails?: { default?: { url?: string } } }
  statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string }
}

function toChannelStats(ch: RawChannelItem): ChannelStats {
  return {
    channelId: ch.id ?? '',
    channelTitle: ch.snippet?.title ?? 'My Channel',
    subscriberCount: Number(ch.statistics?.subscriberCount ?? 0),
    viewCount: Number(ch.statistics?.viewCount ?? 0),
    videoCount: Number(ch.statistics?.videoCount ?? 0),
    thumbnailUrl: ch.snippet?.thumbnails?.default?.url ?? null,
  }
}

/**
 * KINEO-YTCHANNEL-PICK-2026-07-27 — TODOS os canais que este token alcança.
 *
 * POR QUE ISTO EXISTE (bug reproduzido em produção em 27/07/2026):
 * `channels?mine=true` devolve `items` como ARRAY, e o código lia `items[0]` e
 * jogava o resto fora. O fundador tem dois canais no mesmo Google — "Joseph
 * Skaf" (0 inscritos) e "Curiosityvaultlab" (12.600). Ele quis conectar o
 * segundo; o sistema conectou o primeiro e não disse qual tinha escolhido. Num
 * produto que publica Short PÚBLICO diário no canal do cliente, isso é a pior
 * falha possível, e atinge qualquer conta com mais de um canal.
 *
 * ⚠️ LIMITE REAL DA API, que o desenho de cima TEM de respeitar: um token de
 * usuário comum quase sempre alcança UM canal só — quem escolhe é a tela de
 * consentimento do Google, não a gente, e não existe parâmetro de "publicar no
 * canal X" no videos.insert (onBehalfOfContentOwner é só para parceiro de CMS).
 * Então enumerar resolve o caso de N canais, mas o caso comum continua sendo
 * "o Google já decidiu". Por isso a UI precisa das DUAS coisas: escolher quando
 * há escolha, e dizer com todas as letras qual canal foi conectado quando não há
 * — com um caminho de "não é este" que reabre o seletor de contas do Google
 * (/api/youtube/auth?add=1, que manda prompt=select_account).
 *
 * Ordena por inscritos (desc) só para a lista ficar legível; a escolha é sempre
 * do usuário, nunca deste sort.
 */
export async function fetchAllChannels(accessToken: string): Promise<ChannelStats[]> {
  const res = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Channel fetch failed: ${res.status}`)
  const data = await res.json()
  const items = (data.items ?? []) as RawChannelItem[]
  // KINEO-YTCONNECT-2026-07-26 — erro NOMEADO. Uma conta Google sem canal é um
  // desfecho de USUÁRIO (escolheu a conta errada no seletor), não uma falha de
  // rede: quem chama precisa distinguir os dois para dizer ao cliente o que
  // fazer em vez de mostrar "algo deu errado".
  if (items.length === 0) throw new YouTubeNoChannelError()
  return items
    .filter((ch) => !!ch.id)
    .map(toChannelStats)
    .sort((a, b) => b.subscriberCount - a.subscriberCount)
}

/**
 * O primeiro canal alcançado pelo token. Mantido byte a byte no contrato antigo
 * (mesmo retorno, mesmo YouTubeNoChannelError) porque analytics e o status
 * legado dependem dele. Quem REGISTRA canal deve usar fetchAllChannels.
 */
export async function fetchChannelStats(accessToken: string): Promise<ChannelStats> {
  const all = await fetchAllChannels(accessToken)
  if (all.length === 0) throw new YouTubeNoChannelError()
  return all[0]
}

export async function fetchRecentVideoAnalytics(
  accessToken: string,
  maxResults = 10,
): Promise<VideoAnalytic[]> {
  // Get recent uploads
  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&forMine=true&type=video&order=date&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!searchRes.ok) throw new Error(`Video search failed: ${searchRes.status}`)
  const searchData = await searchRes.json()
  const items = searchData.items ?? []
  if (items.length === 0) return []

  const videoIds = items.map((v: { id: { videoId: string } }) => v.id.videoId).join(',')

  // Get statistics for all videos in one call
  const statsRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoIds}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!statsRes.ok) throw new Error(`Video stats fetch failed: ${statsRes.status}`)
  const statsData = await statsRes.json()

  return (statsData.items ?? []).map((v: {
    id: string
    snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string } } }
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
  }) => ({
    videoId: v.id,
    title: v.snippet?.title ?? 'Untitled',
    views: Number(v.statistics?.viewCount ?? 0),
    likes: Number(v.statistics?.likeCount ?? 0),
    comments: Number(v.statistics?.commentCount ?? 0),
    averageViewDuration: 0, // requires Analytics API — fetched separately if needed
    impressionsCtr: 0,
    publishedAt: v.snippet?.publishedAt ?? '',
    thumbnailUrl: v.snippet?.thumbnails?.medium?.url ?? null,
  }))
}
