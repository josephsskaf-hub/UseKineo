import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  EMAIL_FILME_CLICK_PATH,
  EMAIL_FILME_CLICKED_EVENT,
  EMAIL_FILME_VERSION,
  emailFilmeDestino,
  videoIdValido,
} from '@/lib/growth/emailFilmePronto'

// KINEO-EMAIL-FILME-NA-PAGINA-1111 — o botão do e-mail "filme pronto" passa por aqui: conta o clique (o degrau que não
// existia: o MP4 cru não deixava rastro) e segue para a página do filme (/history?v=<id>, o filme abre tocando).
// Mesmo desenho de /api/episode-link: com sessão, direto; sem sessão, /login com o destino INTEIRO no redirect
// (o middleware de /history guarda só o caminho e perderia o ?v= — por isso não passamos por ele deslogados).
// Só o id do filme entra; o destino é montado aqui e passa pelo mesmo guarda do login (nunca um host de fora).

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

/** Varredor de e-mail e prévia de link batem no link sem humano: não bloqueia, só etiqueta. */
const ROBO = /(bot|crawler|spider|slurp|preview|scanner|monitor|curl|wget|python-requests|headless|proxy|fetcher|validator)/i

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin
  const raw = req.nextUrl.searchParams.get('v')
  const videoId = videoIdValido(raw) ? raw : null
  // Sem id válido: a lista de filmes da pessoa, que mostra o mais novo primeiro.
  const destino = (videoId ? normalizeInternalRedirect(emailFilmeDestino(videoId)) : null) ?? '/history'

  let userId: string | null = null
  try {
    const { data: { user } } = await createClient().auth.getUser()
    userId = user?.id ?? null
  } catch {
    userId = null
  }

  try {
    const ua = req.headers.get('user-agent')
    await writeServerEvent({
      name: EMAIL_FILME_CLICKED_EVENT,
      userId,
      path: EMAIL_FILME_CLICK_PATH,
      sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
      metadata: {
        video_id: videoId,
        signed_in: Boolean(userId),
        bot: !ua || ROBO.test(ua),
        version: EMAIL_FILME_VERSION,
      },
    })
  } catch {
    // o contador é enfeite; o caminho até o filme não é.
  }

  const url = userId ? `${origem}${destino}` : `${origem}/login?redirect=${encodeURIComponent(destino)}`
  return NextResponse.redirect(url, 302)
}
