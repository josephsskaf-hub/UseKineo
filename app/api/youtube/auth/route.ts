// app/api/youtube/auth/route.ts — Push #317
// Initiates the Google OAuth flow for YouTube access.
// Redirects the browser to Google's consent screen.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildYouTubeAuthUrl, YouTubeOAuthConfigError } from '@/lib/youtube'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'

const EVENT_PATH = '/api/youtube/auth'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const sessionId = req.cookies.get('kineo_event_session_id')?.value ?? null
  const isAdd = req.nextUrl.searchParams.get('add') === '1'

  // state carries the user ID so the callback can look them up after redirect
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url')

  // KINEO-YTCONNECT-2026-07-26 — buildYouTubeAuthUrl era chamado NU. Ele lança
  // quando YOUTUBE_CLIENT_ID falta ou NEXT_PUBLIC_APP_URL não é uma https
  // absoluta, e o usuário recebia um 500 do Next sem uma palavra de explicação
  // — indistinguível, do lado dele, de "o site está quebrado". Agora a falha de
  // CONFIGURAÇÃO vira um desfecho nomeado na página do produto e uma linha de
  // log com prefixo próprio ([youtube][CONFIG], emitido dentro de lib/youtube).
  let authUrl: string
  try {
    authUrl = buildYouTubeAuthUrl(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(
      `[youtube/auth] FATAL: cannot build the Google consent URL — ${msg}. ` +
      'Check YOUTUBE_CLIENT_ID and NEXT_PUBLIC_APP_URL in the deployment env. ' +
      'No user can connect a channel until this is fixed.',
    )
    await writeServerEvent({
      name: 'youtube_connect_failed',
      userId: user.id,
      path: EVENT_PATH,
      sessionId,
      metadata: {
        outcome: 'config_error',
        reason: 'config_error',
        stage: 'auth_url',
        add: isAdd,
        error: msg.slice(0, 300),
        error_name: e instanceof YouTubeOAuthConfigError ? e.name : 'Error',
      },
    })
    const target = new URL('/autopilot', req.nextUrl.origin)
    target.searchParams.set('yt', 'config_error')
    return NextResponse.redirect(target.toString())
  }

  // Uma redirect para o Google que nunca volta é o buraco mais caro do funil.
  // Este evento é o denominador: `youtube_connect_started` menos
  // (`youtube_connected` + `youtube_connect_failed`) = gente que sumiu no meio
  // do consentimento do Google, que é EXATAMENTE o que não dava para medir.
  await writeServerEvent({
    name: 'youtube_connect_started',
    userId: user.id,
    path: EVENT_PATH,
    sessionId,
    metadata: { add: isAdd },
  })

  // KINEO-AUTOPILOT — para conectar um SEGUNDO canal o Google precisa oferecer
  // o seletor de conta; com `prompt=consent` sozinho ele reusa silenciosamente a
  // conta já logada e o usuário reconecta o mesmo canal para sempre.
  // `?add=1` acrescenta select_account. lib/youtube.ts não é tocado: só o
  // parâmetro da URL já pronta é reescrito, então o fluxo padrão fica idêntico.
  if (isAdd) {
    try {
      const url = new URL(authUrl)
      url.searchParams.set('prompt', 'select_account consent')
      return NextResponse.redirect(url.toString())
    } catch {
      // URL inválida (env mal configurada): segue com o fluxo original.
    }
  }

  return NextResponse.redirect(authUrl)
}
