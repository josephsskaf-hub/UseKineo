// KINEO-AUTOPILOT-2026-07-26 — acesso a tokens YouTube POR CANAL.
//
// POR QUE ISSO EXISTE:
//   lib/youtube.ts guarda UM canal por usuário em profiles.youtube_tokens
//   (JSONB). O Autopilot vende "N canais no piloto automático", então o token
//   precisa ser endereçável por canal, não por usuário.
//
// COMPATIBILIDADE (regra dura):
//   lib/youtube.ts NÃO é tocado. loadYouTubeTokens(user.id) continua lendo
//   profiles.youtube_tokens exatamente como hoje, então todo caminho que já
//   está em produção (upload manual, status, analytics) segue funcionando sem
//   depender da tabela nova. Este módulo REUSA o OAuth de lá
//   (refreshAccessToken / fetchAllChannels) — nada de reimplementar OAuth.
//
// Escreve sempre via service_role: tokens são segredo e o cron não tem sessão
// de usuário. Mesma decisão de lib/credits/renderIntent.ts.

import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  refreshAccessToken,
  fetchAllChannels,
  YouTubeNoChannelError,
  YOUTUBE_SCOPES,
  type ChannelStats,
  type YouTubeTokens,
} from '@/lib/youtube'

export interface ChannelRow {
  id: string
  user_id: string
  provider: string
  external_channel_id: string | null
  title: string | null
  thumbnail_url: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string | null
  connected_at: string | null
  revoked_at: string | null
}

// Vista segura para o cliente: NUNCA inclui token.
export interface PublicChannel {
  id: string
  provider: string
  externalChannelId: string | null
  title: string | null
  thumbnailUrl: string | null
  connectedAt: string | null
}

const CHANNEL_COLUMNS =
  'id, user_id, provider, external_channel_id, title, thumbnail_url, access_token, refresh_token, token_expires_at, scopes, connected_at, revoked_at'

export function channelsAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[yt-channels] service-role env missing — channel store disabled')
    return null
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function toPublicChannel(row: ChannelRow): PublicChannel {
  return {
    id: row.id,
    provider: row.provider,
    externalChannelId: row.external_channel_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    connectedAt: row.connected_at,
  }
}

// timestamptz <-> unix ms. YouTubeTokens.expires_at é em MILISSEGUNDOS
// (lib/youtube.ts: Date.now() + expires_in * 1000) — converter como segundos
// mandaria todo canal para 1970 e forçaria refresh em toda chamada.
function toEpochMs(iso: string | null): number {
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

function toIso(epochMs: number): string | null {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return null
  return new Date(epochMs).toISOString()
}

export function channelRowToTokens(row: ChannelRow): YouTubeTokens | null {
  if (!row.access_token || !row.refresh_token) return null
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: toEpochMs(row.token_expires_at),
    scope: row.scopes ?? YOUTUBE_SCOPES,
  }
}

/** Canais ativos (não revogados) de um usuário, mais antigo primeiro. */
export async function listUserChannels(userId: string): Promise<ChannelRow[]> {
  const db = channelsAdmin()
  if (!db) return []
  const { data, error } = await db
    .from('channels')
    .select(CHANNEL_COLUMNS)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('connected_at', { ascending: true })
  if (error) {
    console.warn('[yt-channels] listUserChannels failed:', error.message)
    return []
  }
  return (data ?? []) as ChannelRow[]
}

export async function getChannel(channelId: string): Promise<ChannelRow | null> {
  const db = channelsAdmin()
  if (!db) return null
  const { data, error } = await db
    .from('channels')
    .select(CHANNEL_COLUMNS)
    .eq('id', channelId)
    .maybeSingle()
  if (error) {
    console.warn('[yt-channels] getChannel failed:', error.message)
    return null
  }
  return (data as ChannelRow | null) ?? null
}

/** Tokens crus de um canal. `null` = canal inexistente, revogado ou sem token. */
export async function loadChannelTokens(channelId: string): Promise<YouTubeTokens | null> {
  const row = await getChannel(channelId)
  if (!row || row.revoked_at) return null
  return channelRowToTokens(row)
}

export async function saveChannelTokens(channelId: string, tokens: YouTubeTokens): Promise<void> {
  const db = channelsAdmin()
  if (!db) return
  const { error } = await db
    .from('channels')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: toIso(tokens.expires_at),
      scopes: tokens.scope,
    })
    .eq('id', channelId)
  if (error) console.warn('[yt-channels] saveChannelTokens failed:', error.message)
}

/**
 * Renova o access_token de um canal REUSANDO refreshAccessToken de lib/youtube
 * (mesma troca OAuth do fluxo manual) e persiste o resultado.
 * Lança se o refresh falhar — quem chama decide se marca a run como failed.
 */
export async function refreshChannelToken(channel: ChannelRow): Promise<YouTubeTokens> {
  if (!channel.refresh_token) {
    throw new Error('channel has no refresh_token — reconnect required')
  }
  const refreshed = await refreshAccessToken(channel.refresh_token)
  await saveChannelTokens(channel.id, refreshed)
  return refreshed
}

/**
 * Access token válido para um canal, renovando 5 min antes do vencimento —
 * a mesma janela de getValidAccessToken em lib/youtube.ts.
 */
export async function getValidChannelAccessToken(channelId: string): Promise<string | null> {
  const row = await getChannel(channelId)
  if (!row || row.revoked_at) return null
  const tokens = channelRowToTokens(row)
  if (!tokens) return null

  const BUFFER_MS = 5 * 60 * 1000
  if (tokens.expires_at > 0 && Date.now() < tokens.expires_at - BUFFER_MS) {
    return tokens.access_token
  }
  try {
    const refreshed = await refreshChannelToken(row)
    return refreshed.access_token
  } catch (e) {
    console.error('[yt-channels] refresh failed for channel', channelId, e instanceof Error ? e.message : String(e))
    return null
  }
}

// KINEO-YTCONNECT-2026-07-26 — o desfecho REAL do registro do canal.
//
// A versão anterior devolvia `string | null` e engolia toda falha. Consequência
// medida em produção: com `channels` = 0 linhas e `profiles.youtube_tokens` = 0,
// um upsert que falhasse era INDISTINGUÍVEL de um sucesso — o callback já tinha
// gravado o token legado, redirecionava com "connected" e o cliente do produto
// de $299/mês era informado de que estava conectado enquanto a tabela que o
// Autopilot lê continuava vazia PARA SEMPRE. Quem chama precisa do motivo.
export type UpsertChannelResult =
  | { ok: true; channelId: string; externalChannelId: string | null; title: string | null }
  | { ok: false; reason: 'store_unavailable' | 'no_channel' | 'write_failed'; error: string }

/**
 * Registra/atualiza o canal logo depois do OAuth. Busca o id REAL do canal na
 * YouTube Data API (fetchAllChannels) para que a unique
 * (user_id, provider, external_channel_id) separe canais de verdade — sem isso
 * um segundo canal do mesmo usuário sobrescreveria o primeiro.
 *
 * Não lança: devolve um resultado tipado. Uma falha de stats TRANSITÓRIA ainda
 * grava a linha com external_channel_id NULL (o índice coalesced da migration
 * 021 mantém uma única linha legada por usuário) — o token é válido e o canal é
 * recuperável na próxima chamada. Já `no_channel` é definitivo e NÃO grava
 * nada: uma linha sem canal do outro lado nunca publicaria.
 */
/**
 * Grava UMA linha de canal. Extraído para que registrar 1 e registrar N usem
 * exatamente o mesmo caminho de escrita — foi a divergência entre "o que o
 * OAuth grava" e "o que o Autopilot lê" que manteve `channels` em 0 por meses.
 *
 * `stats` null = falha TRANSITÓRIA de lookup: grava com external_channel_id
 * NULL (o índice coalesced da migration 021 mantém uma única linha legada por
 * usuário) porque o token é válido e o canal é recuperável na próxima chamada.
 */
async function persistChannelRow(
  db: SupabaseClient,
  args: { userId: string; tokens: YouTubeTokens; stats: ChannelStats | null },
): Promise<UpsertChannelResult> {
  const externalId = args.stats?.channelId || null
  const title = args.stats?.channelTitle ?? null
  const thumbnailUrl = args.stats?.thumbnailUrl ?? null

  const payload = {
    user_id: args.userId,
    provider: 'youtube',
    external_channel_id: externalId,
    title,
    thumbnail_url: thumbnailUrl,
    access_token: args.tokens.access_token,
    refresh_token: args.tokens.refresh_token,
    token_expires_at: toIso(args.tokens.expires_at),
    scopes: args.tokens.scope,
    connected_at: new Date().toISOString(),
    revoked_at: null,
  }

  try {
    // Reconectar um canal já conhecido é UPDATE, não uma linha nova: senão o
    // usuário acumula duplicatas e o Autopilot posta duas vezes no mesmo canal.
    let existingId: string | null = null
    const lookup = externalId
      ? await db.from('channels').select('id').eq('user_id', args.userId)
          .eq('provider', 'youtube').eq('external_channel_id', externalId).maybeSingle()
      : await db.from('channels').select('id').eq('user_id', args.userId)
          .eq('provider', 'youtube').is('external_channel_id', null).maybeSingle()
    if (!lookup.error && lookup.data) existingId = (lookup.data as { id: string }).id

    if (existingId) {
      const { error } = await db.from('channels').update(payload).eq('id', existingId)
      if (error) {
        console.error('[yt-channels] channel update failed:', error.message)
        return { ok: false, reason: 'write_failed', error: error.message }
      }
      return { ok: true, channelId: existingId, externalChannelId: externalId, title }
    }

    const { data, error } = await db.from('channels').insert(payload).select('id').maybeSingle()
    if (error) {
      console.error('[yt-channels] channel insert failed:', error.message)
      return { ok: false, reason: 'write_failed', error: error.message }
    }
    const insertedId = (data as { id: string } | null)?.id ?? null
    if (!insertedId) {
      // Insert sem erro e sem linha = RLS/PostgREST devolveu vazio. Isso é
      // exatamente a falha que antes virava "conectado" com a tabela vazia.
      const error2 = 'insert returned no row (check service-role key and RLS on public.channels)'
      console.error('[yt-channels] channel insert returned no row')
      return { ok: false, reason: 'write_failed', error: error2 }
    }
    return { ok: true, channelId: insertedId, externalChannelId: externalId, title }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[yt-channels] upsert threw:', msg)
    return { ok: false, reason: 'write_failed', error: msg }
  }
}

// KINEO-YTCHANNEL-PICK-2026-07-27 — resultado do registro de TODOS os canais.
export interface StoredChannel {
  channelId: string
  externalChannelId: string | null
  title: string | null
  subscriberCount: number
}

export type UpsertAllChannelsResult =
  | {
      ok: true
      /** Toda linha gravada, em ordem de inscritos (desc). */
      channels: StoredChannel[]
      /** Quantos canais o TOKEN alcançou (pode ser > channels.length se algum falhou). */
      reachedCount: number
    }
  | { ok: false; reason: 'store_unavailable' | 'no_channel' | 'write_failed'; error: string }

/**
 * KINEO-YTCHANNEL-PICK-2026-07-27 — registra TODOS os canais que o token
 * alcança, não só `items[0]`.
 *
 * O que isto conserta: `fetchChannelStats` lia o primeiro item e descartava o
 * resto, então uma conta com dois canais tinha um deles escolhido em silêncio.
 * Reproduzido em produção em 27/07/2026 com a conta do fundador.
 *
 * Uma falha de escrita em UM canal não derruba os outros: registrar 2 de 3 é
 * melhor que 0 de 3, e o usuário ainda escolhe entre os que entraram. Só devolve
 * `write_failed` quando NENHUM canal foi gravado — aí não há o que escolher e o
 * callback precisa dizer isso em vez de anunciar "conectado".
 */
export async function upsertAllChannelsFromTokens(args: {
  userId: string
  tokens: YouTubeTokens
}): Promise<UpsertAllChannelsResult> {
  const db = channelsAdmin()
  if (!db) {
    const error = 'service-role env missing — channel store disabled'
    console.error('[yt-channels] upsert aborted:', error)
    return { ok: false, reason: 'store_unavailable', error }
  }

  let reached: ChannelStats[]
  try {
    reached = await fetchAllChannels(args.tokens.access_token)
  } catch (e) {
    // A conta Google existe mas não tem canal: gravar aqui produziria um
    // "canal conectado" que nunca aceita upload. É um beco sem saída que só o
    // usuário resolve (escolhendo outra conta), então ele TEM que saber.
    if (e instanceof YouTubeNoChannelError || (e as { name?: string })?.name === 'YouTubeNoChannelError') {
      console.error('[yt-channels] google account has no YouTube channel — refusing to store')
      return { ok: false, reason: 'no_channel', error: 'Google account has no YouTube channel' }
    }
    // Falha TRANSITÓRIA de lookup (rede, cota). O token é bom: grava a linha
    // legada sem external id para não perder a conexão, exatamente como antes.
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[yt-channels] channel list failed, storing without external id:', msg)
    const single = await persistChannelRow(db, { userId: args.userId, tokens: args.tokens, stats: null })
    if (!single.ok) return single
    return {
      ok: true,
      reachedCount: 0,
      channels: [{
        channelId: single.channelId,
        externalChannelId: single.externalChannelId,
        title: single.title,
        subscriberCount: 0,
      }],
    }
  }

  const written: StoredChannel[] = []
  const failures: string[] = []
  for (const stats of reached) {
    const row = await persistChannelRow(db, { userId: args.userId, tokens: args.tokens, stats })
    if (row.ok) {
      written.push({
        channelId: row.channelId,
        externalChannelId: row.externalChannelId,
        title: row.title,
        subscriberCount: stats.subscriberCount,
      })
    } else {
      failures.push(`${stats.channelTitle}: ${row.error}`)
    }
  }

  if (written.length === 0) {
    const error = failures.join(' | ') || 'no channel row written'
    console.error('[yt-channels] no channel stored out of', reached.length, '—', error)
    return { ok: false, reason: 'write_failed', error }
  }
  if (failures.length > 0) {
    console.warn(`[yt-channels] stored ${written.length}/${reached.length} channels; failed: ${failures.join(' | ')}`)
  }
  return { ok: true, channels: written, reachedCount: reached.length }
}

/**
 * Registra o canal primário. Contrato antigo preservado para qualquer chamador
 * existente; o callback do OAuth usa upsertAllChannelsFromTokens.
 */
export async function upsertChannelFromTokens(args: {
  userId: string
  tokens: YouTubeTokens
}): Promise<UpsertChannelResult> {
  const all = await upsertAllChannelsFromTokens(args)
  if (!all.ok) return all
  const first = all.channels[0]
  return {
    ok: true,
    channelId: first.channelId,
    externalChannelId: first.externalChannelId,
    title: first.title,
  }
}

/** Canal "primário" = o mais antigo ativo. É o que loadYouTubeTokens representa. */
export async function primaryChannel(userId: string): Promise<ChannelRow | null> {
  const rows = await listUserChannels(userId)
  return rows[0] ?? null
}

/**
 * Revoga um canal (ou todos do usuário). Soft-delete: mantém a linha para o
 * histórico de runs continuar legível, mas apaga os tokens — um token revogado
 * que continua no banco é um segredo vivo sem dono.
 */
export async function revokeChannels(args: {
  userId: string
  channelId?: string | null
}): Promise<number> {
  const db = channelsAdmin()
  if (!db) return 0
  let query = db
    .from('channels')
    .update({
      revoked_at: new Date().toISOString(),
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    })
    .eq('user_id', args.userId)
    .is('revoked_at', null)
  if (args.channelId) query = query.eq('id', args.channelId)

  const { data, error } = await query.select('id')
  if (error) {
    console.warn('[yt-channels] revoke failed:', error.message)
    return 0
  }
  return (data ?? []).length
}
