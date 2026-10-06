import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeGuestSessionsOnce } from '@/lib/auth/guestAccess'

// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — a recuperação de senha também prova o e-mail ════════════════════════════════
// A troca do código de recuperação acontece no navegador (/reset-password, PKCE do @supabase/ssr), então não passa por
// nenhuma rota de servidor. Quando a página fica pronta com a sessão da recuperação, ela chama esta rota, e numa conta
// nascida de compra sem login as OUTRAS sessões caem (uma vez por conta; lib/auth/guestAccess.ts).
// Só conta uma sessão de RECUPERAÇÃO (amr 'recovery' no JWT, o método que o Auth grava na troca do código do e-mail de
// "Forgot password"). A sessão do próprio login de uso único (id em app_metadata) e qualquer sessão de SENHA não fazem
// nada: quem entrou sem provar o e-mail pode pôr uma senha direto na API do Auth — se ela contasse, essa pessoa
// gastaria a derrubada única antes do dono de verdade.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function reply(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' } })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== req.nextUrl.origin) return reply({ revoked: false }, 403)
  const supabase = createClient()
  // getUser valida o token no Auth; só então o session_id do mesmo token é confiável.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return reply({ revoked: false }, 401)
  const { data: sessionData } = await supabase.auth.getSession()
  const result = await revokeGuestSessionsOnce({
    supabase,
    user: userData.user,
    session: sessionData?.session ?? null,
    method: 'password_recovery',
    path: '/api/auth/guest-sessions',
    acceptedMethods: ['recovery'],
  })
  return reply({ revoked: result.revoked })
}
