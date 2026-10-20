// KINEO-KIDS-VENDA-2010 — POST /api/kids-venda/sample: o 1º EPISÓDIO GRÁTIS com marca-d'água (1 por conta). Não gera nada aqui:
// confere o antifarm do Studio Ads (e-mail descartável, trial barrado por digital/região, 1 por conta, quem já comprou não precisa,
// teto global do dia — lib/kidsVenda/server.ts kidsSampleEligibility) e grava um pedido 'sample' de 1 vídeo; o passe 3 do cron do
// Autopilot despacha na próxima hora (amostra tem prioridade) e a pessoa recebe por e-mail + biblioteca. A marca-d'água é a regra da
// casa (conta sem plano = isFreePlanCinematic no compose); por isso a amostra só é para quem está sem plano pago (a decisão também
// recusa quem já tem pedido pago). Interruptor: KIDS_SALES_LIVE=false → 404 para quem não é da casa.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { writeServerEvent } from '@/lib/serverEvents'
import { KIDS_EVENTS, KIDS_SALES_OPEN_FOR_PUBLIC, kidsSalesOpen, validateKidsSeriesRequest } from '@/lib/kidsVenda/kidsVenda'
import { createKidsOrder, kidsSampleEligibility, kidsServiceClient } from '@/lib/kidsVenda/server'

export const dynamic = 'force-dynamic'
const PATH = '/api/kids-venda/sample'

const REFUSAL: Record<string, string> = {
  closed: 'The free episode opens soon.',
  disposable: 'Please use a permanent e-mail address to get the free episode.',
  trial_blocked: 'The free episode is not available for this account.',
  already_used: 'Your free episode was already made (or is being made). Check your library.',
  has_order: 'You already have a kids cartoon plan — your episodes arrive from it.',
  daily_cap: 'Today’s free episodes are all taken. Come back tomorrow.',
  read_failed: 'We could not check your account right now. Please try again in a minute.',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const internal = isInternalEmail(user.email)
  if (!kidsSalesOpen(KIDS_SALES_OPEN_FOR_PUBLIC, internal)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const v = validateKidsSeriesRequest(raw)
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 })
  const db = kidsServiceClient()
  if (!db) return NextResponse.json({ error: REFUSAL.read_failed }, { status: 503 })
  const elig = await kidsSampleEligibility(db, { userId: user.id, live: KIDS_SALES_OPEN_FOR_PUBLIC, internal })
  if (!elig.ok) {
    await writeServerEvent({ name: KIDS_EVENTS.sampleRefused, userId: user.id, path: PATH, metadata: { reason: elig.reason, character: v.value.character, language: v.value.language } }).catch(() => false)
    return NextResponse.json({ error: REFUSAL[elig.reason] ?? REFUSAL.read_failed, reason: elig.reason }, { status: elig.reason === 'read_failed' ? 503 : 409 })
  }
  const created = await createKidsOrder(db, { userId: user.id, kind: 'sample', series: v.value, cycleFromMs: Date.now(), path: PATH })
  if (!created.ok) return NextResponse.json({ error: REFUSAL.read_failed }, { status: 503 })
  await writeServerEvent({ name: KIDS_EVENTS.sampleRequested, userId: user.id, path: PATH, metadata: { order_id: created.orderId, character: v.value.character, language: v.value.language, theme_len: v.value.theme.length } }).catch(() => false)
  return NextResponse.json({ ok: true, orderId: created.orderId })
}
