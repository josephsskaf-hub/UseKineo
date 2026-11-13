import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { caminhoValido, donoDoCaminho, DOWNLOAD_ROUTE, DOWNLOAD_SERVED_EVENT, extensao, nomeDoArquivo, urlDeBaixar } from '@/lib/downloadNosso'

// KINEO-DOWNLOAD-NOSSO-1311 — baixar mídia pelo NOSSO domínio (ver lib/downloadNosso.ts). Só com sessão; só arquivo do bucket renders
// cujo caminho tem o id da conta; responde 302 para o Storage com `?download=<nome>` (Content-Disposition: attachment): o navegador
// baixa com o nome da Kineo, a página fica onde está e a barra de endereço nunca mostra o Supabase. Grava `media_download_served`
// (pedido de arquivo entregue ao navegador); `video_downloaded` continua sendo do baixador da tela (só com os bytes na mão).

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

function texto(status: number, msg: string) {
  return new NextResponse(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  const caminho = caminhoValido(req.nextUrl.searchParams.get('f'))
  if (!caminho) return texto(404, 'File not found.')

  let userId: string | null = null
  try {
    const { data: { user } } = await createClient().auth.getUser()
    userId = user?.id ?? null
  } catch {
    userId = null
  }
  if (!userId) return NextResponse.redirect(`${req.nextUrl.origin}/login?redirect=${encodeURIComponent('/library')}`, 302)
  if (!donoDoCaminho(caminho, userId)) return texto(404, 'File not found.')

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return texto(503, 'Download is unavailable right now. Try again in a minute.')
  const nome = nomeDoArquivo(req.nextUrl.searchParams.get('name'), caminho)

  try {
    const tela = req.nextUrl.searchParams.get('s')
    await writeServerEvent({
      name: DOWNLOAD_SERVED_EVENT,
      userId,
      path: DOWNLOAD_ROUTE,
      sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
      metadata: { surface: tela && /^[A-Za-z0-9_-]{1,40}$/.test(tela) ? tela : null, ext: extensao(caminho), filename: nome, file: caminho },
    })
  } catch {
    // o contador é enfeite; o arquivo não é.
  }

  const res = NextResponse.redirect(urlDeBaixar(base, caminho, nome), 302)
  res.headers.set('cache-control', 'private, no-store')
  res.headers.set('referrer-policy', 'no-referrer')
  return res
}
