import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeServerEvent } from '@/lib/serverEvents'
import { HANDOFF_INTENT_CAMPAIGN, HANDOFF_UTM_SOURCE, isHandoffToken } from '@/lib/gptHandoff'
import { isLikelyBot } from '@/lib/gptHandoffStore'

// ═══ KINEO-GPT-HANDOFF-2026-09-06 (K1) — "See plans" contado no servidor ════
//
// Um link client-side com beacon subconta (JS bloqueado, aba fechada antes do
// flush). A rota contadora é o jeito mais simples que MEDE de verdade: um
// evento, um 302. Falha sempre aberta: qualquer erro termina em /pricing.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const PRICING = `/pricing?utm_source=${HANDOFF_UTM_SOURCE}&intent_campaign=${HANDOFF_INTENT_CAMPAIGN}`

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin
  try {
    const rawToken = req.nextUrl.searchParams.get('token')
    const token = isHandoffToken(rawToken) ? rawToken : null
    const sessionId = cookies().get('kineo_event_session_id')?.value ?? null
    await writeServerEvent({
      name: 'gpt_landing_pricing_clicked',
      path: '/api/gpt/handoff/pricing',
      sessionId,
      metadata: {
        has_token: Boolean(token),
        bot: isLikelyBot(req.headers.get('user-agent')),
      },
    })
  } catch {
    // contador é enfeite; a página de preços não é.
  }
  return NextResponse.redirect(`${origem}${PRICING}`, 302)
}
