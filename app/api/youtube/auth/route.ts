// app/api/youtube/auth/route.ts — Push #317
// Initiates the Google OAuth flow for YouTube access.
// Redirects the browser to Google's consent screen.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildYouTubeAuthUrl } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  // state carries the user ID so the callback can look them up after redirect
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url')
  const authUrl = buildYouTubeAuthUrl(state)

  // KINEO-AUTOPILOT — para conectar um SEGUNDO canal o Google precisa oferecer
  // o seletor de conta; com `prompt=consent` sozinho ele reusa silenciosamente a
  // conta já logada e o usuário reconecta o mesmo canal para sempre.
  // `?add=1` acrescenta select_account. lib/youtube.ts não é tocado: só o
  // parâmetro da URL já pronta é reescrito, então o fluxo padrão fica idêntico.
  if (req.nextUrl.searchParams.get('add') === '1') {
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
