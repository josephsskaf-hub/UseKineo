// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — ouvir a voz antes de gastar crédito (passo "Voz" do /ads/new).
// Frase curta (até ADS_VOICE_PREVIEW_MAX_CHARS) na voz escolhida, a MESMA família (OpenAI tts-1-hd) que narra o
// anúncio no /api/ads/render — a pessoa ouve exatamente a voz que vai sair. Grátis para ela; custo nosso ~US$0,003,
// com teto diário por conta contado no banco (evento ads_voice_preview_served, só servidor). Acesso e interruptor
// iguais às outras rotas /api/ads/*.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { ADS_VOICE_PREVIEW_DAILY_CAP, ADS_VOICE_PREVIEW_MAX_CHARS, ADS_VOICE_PREVIEW_SERVED_EVENT, isAdsVoice } from '@/lib/ads/renderContract'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 60

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('unauthenticated', 401)
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const gate = adsGate(reason)
    if (gate !== 'ok') return fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body_must_be_object', 400)
    const voice = body.voice
    if (!isAdsVoice(voice)) return fail('voice_invalid', 400)
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, ADS_VOICE_PREVIEW_MAX_CHARS) : ''
    if (text.length < 2 || /[<>]/.test(text)) return fail('text_invalid', 400)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const used = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', ADS_VOICE_PREVIEW_SERVED_EVENT).gte('created_at', since)
    if (!used.error && (used.count ?? 0) >= ADS_VOICE_PREVIEW_DAILY_CAP) return fail('daily_limit', 429)

    const { openai } = await import('@/lib/openai')
    const speech = await openai.audio.speech.create({ model: 'tts-1-hd', voice, input: text, speed: 1 }, { timeout: 25_000, maxRetries: 1 })
    const buf = Buffer.from(await speech.arrayBuffer())
    await writeServerEvent({ name: ADS_VOICE_PREVIEW_SERVED_EVENT, userId: user.id, path: '/api/ads/voice', metadata: { voice, chars: text.length } })
    return new NextResponse(buf, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[ads/voice] falhou:', e instanceof Error ? e.message : String(e))
    return fail('voice_failed', 502)
  }
}
