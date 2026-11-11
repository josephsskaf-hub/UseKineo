// KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "Aprovado pode fazer" — 60 créditos por US$ 9, só para assinante que zerou ·
// "eu aprovo a escada de 9 dólares até 500 dólares… só para assinantes"]
// A oferta da recarga do assinante, decidida no SERVIDOR (lib/billing/recargaAssinante.ts):
//   · GET ?surface=…                      → { show:false } ou { show:true, qa, price, credits, go, button } + evento
//                                           recarga_assinante_shown. `button` = o botão de 60 (só quem não paga o filme
//                                           mais barato); a barra ("Need more?") vale para todo assinante que chegou ao aviso;
//   · GET ?go=1&surface=…&back=[&credits=N] → o clique: re-decide, grava recarga_assinante_clicked e leva ao checkout do SKU
//                                           (que decide de novo). Conferência da casa grava o clique marcado qa e VOLTA
//                                           para onde estava, sem cobrar.
// Interruptor 'off' = nenhuma leitura, nenhum evento: { show:false } (o clique volta para onde estava).
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { releaseVisible } from '@/lib/recreate/access'
import { recargaAssinanteMinFilmCredits } from '@/lib/checkoutPricing'
import { RECARGA_ASSINANTE_1111, normalizeSliderCredits, usdWholeLabel } from '@/lib/credits/creditSlider'
import {
  RECARGA_ASSINANTE_1111_RELEASE,
  RECARGA_ASSINANTE_API,
  RECARGA_ASSINANTE_CAMPAIGN,
  RECARGA_ASSINANTE_EVENTS,
  RECARGA_ASSINANTE_SKU,
  recargaAssinanteBack,
  recargaAssinanteEligible,
  recargaAssinanteMode,
  recargaAssinanteSubscriber,
  recargaAssinanteWithParam,
  type RecargaAssinanteOffer,
  type RecargaAssinanteProfile,
} from '@/lib/billing/recargaAssinante'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }
const HIDE = () => NextResponse.json({ show: false }, { headers: NO_STORE })

/** A superfície vem do aviso (só para medir): letras, números e _ até 48. */
function surfaceOf(raw: string | null): string {
  return typeof raw === 'string' && /^[a-z0-9_]{1,48}$/.test(raw) ? raw : 'unknown'
}

export async function GET(req: NextRequest) {
  const go = req.nextUrl.searchParams.get('go') === '1'
  const surface = surfaceOf(req.nextUrl.searchParams.get('surface'))
  const back = recargaAssinanteBack(req.nextUrl.searchParams.get('back'))
  const goBack = () => NextResponse.redirect(new URL(back, req.url), 303)
  if (RECARGA_ASSINANTE_1111_RELEASE === 'off') return go ? goBack() : HIDE()

  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return go ? goBack() : HIDE()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return go ? goBack() : HIDE()
  const db = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: row, error } = await db.from('profiles').select('plan, stripe_subscription_id, video_credits').eq('id', user.id).maybeSingle()
  const p = error ? null : (row as RecargaAssinanteProfile | null)
  const subscriber = recargaAssinanteSubscriber(p)
  const zeroed = recargaAssinanteEligible(p, recargaAssinanteMinFilmCredits())
  // A casa = a lista EXATA, sempre com 'internal' — nunca com o valor do interruptor.
  const house = releaseVisible(user.email, 'internal')
  const mode = recargaAssinanteMode({ release: RECARGA_ASSINANTE_1111_RELEASE, house, eligible: subscriber })
  if (mode === 'hide') return go ? goBack() : HIDE()
  const qa = mode === 'qa'
  // O botão de 60 só para quem não paga o filme mais barato; a conferência da casa vê o botão sempre (é para conferir a tela).
  const button = qa || zeroed
  const meta = { campaign: RECARGA_ASSINANTE_CAMPAIGN, surface, qa, button, plan: typeof p?.plan === 'string' ? p.plan : null, balance: typeof p?.video_credits === 'number' ? p.video_credits : null }

  if (go) {
    const rawCredits = req.nextUrl.searchParams.get('credits')
    const credits = rawCredits === null ? null : normalizeSliderCredits(rawCredits)
    // Sem quantidade = o botão (só para quem zerou); quantidade inválida = de volta, nunca outro pacote.
    if (rawCredits !== null && credits === null) return goBack()
    if (rawCredits === null && !button) return goBack()
    await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.clicked, userId: user.id, path: RECARGA_ASSINANTE_API, metadata: { ...meta, kind: credits === null ? 'button' : 'slider', credits: credits ?? RECARGA_ASSINANTE_1111.credits } })
    if (qa) return NextResponse.redirect(new URL(recargaAssinanteWithParam(back, 'recarga', 'qa'), req.url), 303)
    const checkout = `/api/stripe/checkout?pack=${RECARGA_ASSINANTE_SKU}&intent_campaign=${RECARGA_ASSINANTE_CAMPAIGN}${credits === null ? '' : `&credits=${credits}`}&back=${encodeURIComponent(back)}`
    return NextResponse.redirect(new URL(checkout, req.url), 303)
  }

  await writeServerEvent({ name: RECARGA_ASSINANTE_EVENTS.shown, userId: user.id, path: RECARGA_ASSINANTE_API, metadata: meta })
  const offer: RecargaAssinanteOffer = {
    show: true,
    qa,
    price: usdWholeLabel(RECARGA_ASSINANTE_1111.usdMinor),
    credits: RECARGA_ASSINANTE_1111.credits,
    go: `${RECARGA_ASSINANTE_API}?go=1&surface=${surface}`,
    button,
  }
  return NextResponse.json(offer, { headers: NO_STORE })
}
