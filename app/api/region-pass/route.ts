// KINEO-SAIDA-REGIAO-2026-10-07 (b) — o passe avulso na moeda local para quem nasce 'region_paid_only'.
//   GET /api/region-pass?surface=wall|pricing|after_film        → JSON com a oferta; elegível = evento de SERVIDOR
//       region_pass_offer_shown (com a moeda e o valor que a pessoa vê).
//   GET /api/region-pass?surface=…&go=1                          → o clique: grava region_pass_offer_clicked e redireciona
//       ao checkout de sempre do pack (?pack=starter&return=studio&intent_campaign=region_pass_<tela>_v1). A campanha viaja
//       até o payment_success (metadata.intent_campaign; metadata.pack = 'starter10', o SKU do passe).
// Toda a decisão é pura e mora em lib/regionPass.ts (decideRegionPassRequest); aqui só sessão, perfil e cabeçalhos.
// Fecha por padrão: interruptor desligado (REGION_PASS_OFFER_LIVE em lib/freeFilmPolicy.ts) ou conta fora da régua →
// { eligible: false } e, no clique, o checkout do pack SEM o evento da região — esta rota nunca impede uma compra.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { decideRegionPassRequest } from '@/lib/regionPass'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const PATH = '/api/region-pass'
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', user.id).maybeSingle()
    profile = (data as typeof profile) ?? null
  }
  const decision = decideRegionPassRequest({
    userId: user?.id ?? null,
    profile,
    surface: req.nextUrl.searchParams.get('surface'),
    go: req.nextUrl.searchParams.get('go') === '1',
    ipCountry: req.headers.get('x-vercel-ip-country'),
    acceptLanguage: req.headers.get('accept-language'),
  })
  // AWAIT: a Vercel congela a função quando a resposta sai — o evento antes do return é a única forma de ele existir.
  if (decision.event && user) {
    await writeServerEvent({ name: decision.event.name, userId: user.id, path: PATH, metadata: decision.event.metadata })
  }
  if (decision.kind === 'redirect') {
    return NextResponse.redirect(new URL(decision.location, req.nextUrl.origin), { headers: NO_STORE })
  }
  return NextResponse.json(decision.body, { status: decision.status, headers: NO_STORE })
}
