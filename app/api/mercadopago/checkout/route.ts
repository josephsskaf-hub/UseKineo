// Mercado Pago checkout — Brazilian one-time credit packs (Pix/boleto/BR card).
// GET /api/mercadopago/checkout?pack=br50 → creates a Checkout Pro preference
// and redirects the signed-in user to the Mercado Pago payment page.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMpPreference, mpConfigured, MP_PACKS } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  const appUrl = req.nextUrl.origin
  const redirectError = (msg: string) =>
    NextResponse.redirect(`${appUrl}/pricing?checkout_error=${encodeURIComponent(msg)}`)

  try {
    if (!mpConfigured()) {
      return redirectError('Pagamento via Pix ainda não está configurado. Tente o cartão.')
    }

    const packParam = (req.nextUrl.searchParams.get('pack') ?? 'br50') as keyof typeof MP_PACKS
    if (!MP_PACKS[packParam]) {
      return redirectError('Pacote inválido.')
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(`${appUrl}/signup?redirect=${encodeURIComponent('/pricing')}`)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const result = await createMpPreference({
      pack: packParam,
      userId: user.id,
      payerEmail: profile?.email ?? user.email ?? undefined,
      appUrl,
    })
    if ('error' in result) {
      console.error('[mercadopago/checkout]', result.error)
      return redirectError('Não foi possível abrir o pagamento. Tente novamente.')
    }
    return NextResponse.redirect(result.initPoint)
  } catch (err) {
    console.error('[mercadopago/checkout] unexpected:', err instanceof Error ? err.message : String(err))
    return redirectError('Algo deu errado. Tente novamente.')
  }
}
