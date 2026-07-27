// app/api/youtube/callback/route.ts — Push #317
// Handles the Google OAuth redirect, exchanges the code for tokens,
// persists them to Supabase, then redirects back to the Autopilot page.
//
// KINEO-YTCONNECT-2026-07-26 — POR QUE ESTE ARQUIVO FOI REESCRITO.
//
// 1. O DESTINO ERA UM BURACO. Todo desfecho redirecionava para
//    `/dashboard?youtube=...`. Mas app/(dashboard)/dashboard/page.tsx faz
//    `redirect('/generate')` incondicionalmente, e o redirect do Next NÃO
//    carrega a query string: cada `reason` calculado com cuidado aqui era
//    literalmente jogado fora antes de qualquer pixel. Nenhuma tela do produto
//    lia `?youtube=`. Resultado: a conexão de canal falhou por MESES
//    (`channels` = 0, `profiles.youtube_tokens` = 0) sem que o usuário OU o
//    operador vissem uma única mensagem. Agora vai para /autopilot?yt=<outcome>,
//    que é a única página que renderiza esses desfechos.
//
// 2. NÃO HAVIA TELEMETRIA. `youtube_connect`/`youtube_connected` tinham ZERO
//    ocorrências no repo, então era impossível saber se as pessoas clicavam em
//    Connect e falhavam ou nunca clicavam. Cada branch abaixo grava UM evento
//    pelo mecanismo que já existe (writeServerEvent → tabela `events`), com o
//    mesmo formato de `autopilot_run_failed`: nome estável + `reason` no
//    metadata, em vez de inventar um nome por motivo.
//
// 3. `upsertChannelFromTokens` ERA BEST-EFFORT E MUDO. Um upsert falho ficava
//    idêntico a um sucesso: o OAuth terminava, o usuário era informado de que
//    estava conectado e `channels` seguia vazia. Isso é candidato a segunda
//    causa-raiz de channels=0 INDEPENDENTE do redirect_uri_mismatch. Agora o
//    resultado é tipado e o desfecho reportado é o REAL.

import { NextRequest, NextResponse } from 'next/server'
import {
  disconnectYouTube,
  exchangeCodeForTokens,
  saveYouTubeTokens,
  YouTubeOAuthConfigError,
  type YouTubeTokens,
} from '@/lib/youtube'
import { upsertAllChannelsFromTokens } from '@/lib/youtubeChannels'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'

const EVENT_PATH = '/api/youtube/callback'

// Os valores que /autopilot sabe renderizar. Manter em sincronia com
// YT_OUTCOMES em app/(dashboard)/autopilot/AutopilotClient.tsx.
type Outcome =
  | 'connected'
  | 'access_denied'
  | 'missing_code'
  | 'invalid_state'
  | 'token_exchange_failed'
  | 'no_channel'
  | 'channel_save_failed'
  | 'config_error'
  | 'failed'

function eventSessionId(req: NextRequest): string | null {
  return req.cookies.get('kineo_event_session_id')?.value ?? null
}

/**
 * Um único ponto de saída: grava o evento e redireciona para a página que
 * REALMENTE existe e REALMENTE lê o parâmetro. Nada de `/dashboard`.
 */
async function finish(
  req: NextRequest,
  outcome: Outcome,
  args: {
    userId?: string | null
    channelTitle?: string | null
    detail?: string | null
    /** KINEO-YTCHANNEL-PICK-2026-07-27 — quantos canais este token alcançou. */
    channelCount?: number | null
  } = {},
): Promise<NextResponse> {
  const target = new URL('/autopilot', req.nextUrl.origin)
  target.searchParams.set('yt', outcome)
  if (outcome === 'connected' && args.channelTitle) {
    target.searchParams.set('ch', args.channelTitle.slice(0, 80))
  }
  // A página precisa saber se houve ESCOLHA ou se o Google entregou um canal só.
  // As duas situações pedem telas diferentes: seletor vs "é este aqui, não é?".
  if (outcome === 'connected' && typeof args.channelCount === 'number') {
    target.searchParams.set('n', String(args.channelCount))
  }

  await writeServerEvent({
    name: outcome === 'connected' ? 'youtube_connected' : 'youtube_connect_failed',
    userId: args.userId ?? null,
    path: EVENT_PATH,
    sessionId: eventSessionId(req),
    metadata: {
      outcome,
      // `reason` espelha o nome usado por autopilot_run_failed, para as duas
      // famílias de evento serem agregáveis com a mesma query.
      reason: outcome,
      ...(args.detail ? { error: args.detail.slice(0, 300) } : {}),
      ...(args.channelTitle ? { channel_title: args.channelTitle.slice(0, 80) } : {}),
      // Quantos canais o token alcançou. É a única forma de descobrir, com
      // dados e não com achismo, se o caso "mais de um canal" é raro ou comum —
      // o que decide quanto vale investir no seletor.
      ...(typeof args.channelCount === 'number' ? { channel_count: args.channelCount } : {}),
    },
  })

  return NextResponse.redirect(target.toString())
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('[youtube/callback] OAuth error from Google:', error)
    // `access_denied` é o usuário fechando/recusando o consentimento — não é
    // uma falha nossa e não pode aparecer como "erro do sistema".
    return finish(req, error === 'access_denied' ? 'access_denied' : 'failed', { detail: error })
  }

  if (!code || !state) {
    console.error(`[youtube/callback] missing params code=${!!code} state=${!!state}`)
    return finish(req, code ? 'invalid_state' : 'missing_code')
  }

  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    if (!userId) throw new Error('no userId in state')
  } catch (e) {
    console.error('[youtube/callback] invalid state param:', e)
    return finish(req, 'invalid_state', { detail: e instanceof Error ? e.message : String(e) })
  }

  // ── Troca do code ─────────────────────────────────────────────────────────
  let tokens: YouTubeTokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/callback] token exchange failed:', msg)
    const outcome: Outcome =
      err instanceof YouTubeOAuthConfigError ? 'config_error' : 'token_exchange_failed'
    return finish(req, outcome, { userId, detail: msg })
  }

  try {
    await saveYouTubeTokens(userId, tokens)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/callback] saving legacy tokens failed:', msg)
    return finish(req, 'channel_save_failed', { userId, detail: msg })
  }

  // ── Registro dos canais (a tabela que o Autopilot lê de verdade) ──────────
  // KINEO-YTCHANNEL-PICK-2026-07-27 — era upsertChannelFromTokens, que gravava
  // items[0] e descartava o resto. Agora TODO canal que o token alcança vira
  // linha, e quem escolhe é o usuário na tela do Autopilot.
  const upsert = await upsertAllChannelsFromTokens({ userId, tokens })

  if (!upsert.ok) {
    if (upsert.reason === 'no_channel') {
      // A conta escolhida não tem canal. Deixar profiles.youtube_tokens
      // preenchido faria /api/youtube/status responder `connected: true` para
      // uma conta que NUNCA vai conseguir publicar — mentira com consequência.
      try {
        await disconnectYouTube(userId)
      } catch (e) {
        console.error('[youtube/callback] rollback of legacy tokens failed:',
          e instanceof Error ? e.message : String(e))
      }
      console.error(`[youtube/callback] no youtube channel for user ${userId.slice(0, 8)}`)
      return finish(req, 'no_channel', { userId })
    }
    console.error(
      `[youtube/callback] channel not stored (${upsert.reason}) for user ${userId.slice(0, 8)}: ${upsert.error}`,
    )
    return finish(req, 'channel_save_failed', { userId, detail: upsert.error })
  }

  const stored = upsert.channels
  console.log(
    `[youtube/callback] connected user=${userId.slice(0, 8)} channels=${stored.length}/${upsert.reachedCount} ` +
    stored.map((c) => `${c.title ?? '?'}(${c.externalChannelId ?? 'no-id'},${c.subscriberCount} subs)`).join(' | '),
  )
  // `ch` só é mostrado quando NÃO há escolha a fazer. Com mais de um canal a
  // página abre o seletor, e anunciar "X está conectado" ali seria repetir o
  // erro original com outra roupa: dizer ao usuário que a escolha já foi feita.
  return finish(req, 'connected', {
    userId,
    channelTitle: stored.length === 1 ? stored[0].title : null,
    channelCount: stored.length,
  })
}
