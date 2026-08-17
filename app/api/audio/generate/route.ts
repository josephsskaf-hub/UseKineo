// KINEO-AUDIO-2026-08-17 — [STAGE] Kineo Audio: texto→voz multi-motor.
// Pedido do fundador (print do menu Audio do Higgsfield): "quero esses
// motores de audio". Schemas conferidos HOJE no llms.txt de cada endpoint:
//   · Eleven v3 (fal-ai/elevenlabs/tts/eleven-v3) $0.10/1k chars — tags de
//     emocao inline; param {text, voice, stability}
//   · MiniMax Speech-02 HD (fal-ai/minimax/speech-02-hd) $0.10/1k —
//     ATENCAO: default devolve HEX; obrigatorio output_format:'url'
//   · Dia (fal-ai/dia-tts) $0.04/1k — dialogo multi-speaker [S1]/[S2] com
//     (laughs) etc; param {text}
//   · Kokoro (fal-ai/kokoro/american-english) $0.02/1k — param e `prompt`
//     (nao `text`!), voices af_*/am_*
// Creditos: ceil(chars/1000) * perK (eleven/minimax 2, dia/kokoro 1) —
// margem 67-87% no retail de ~$0.15/cr. Debito idempotente + refund.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'
import { randomUUID } from 'crypto'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'
import { persistAudio } from '@/lib/audioStore'

export const maxDuration = 60

type AudioModelKey = 'eleven' | 'minimax' | 'dia' | 'kokoro'

const ELEVEN_VOICES = ['Rachel', 'Aria', 'Brian', 'Charlotte', 'Daniel', 'Jessica'] as const
const KOKORO_VOICES = ['af_heart', 'af_bella', 'af_nova', 'am_adam', 'am_michael', 'am_onyx'] as const

const MODELS: Record<AudioModelKey, {
  slug: string
  perK: number
  input: (text: string, voice: string | null) => Record<string, unknown>
  validVoice: (v: string) => boolean
}> = {
  eleven: {
    slug: 'fal-ai/elevenlabs/tts/eleven-v3',
    perK: 2,
    input: (text, voice) => ({ text, voice: voice ?? 'Rachel', stability: 0.5 }),
    validVoice: (v) => (ELEVEN_VOICES as readonly string[]).includes(v),
  },
  minimax: {
    slug: 'fal-ai/minimax/speech-02-hd',
    perK: 2,
    input: (text) => ({ text, output_format: 'url', language_boost: 'auto' }),
    validVoice: () => false,
  },
  dia: {
    slug: 'fal-ai/dia-tts',
    perK: 1,
    input: (text) => ({ text }),
    validVoice: () => false,
  },
  kokoro: {
    slug: 'fal-ai/kokoro/american-english',
    perK: 1,
    input: (text, voice) => ({ prompt: text, voice: voice ?? 'af_heart' }),
    validVoice: (v) => (KOKORO_VOICES as readonly string[]).includes(v),
  },
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { text?: string; model?: string; voice?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const text = String(body.text ?? '').trim()
  if (text.length < 3 || text.length > 2000) {
    return NextResponse.json({ error: 'Enter your script (3–2000 characters).' }, { status: 400 })
  }
  const modelKey: AudioModelKey = ['eleven', 'dia', 'kokoro'].includes(String(body.model)) ? (body.model as AudioModelKey) : 'minimax'
  const model = MODELS[modelKey]
  const voice = typeof body.voice === 'string' && model.validVoice(body.voice) ? body.voice : null
  const cost = Math.max(1, Math.ceil(text.length / 1000)) * model.perK

  const renderId = `audio-${randomUUID()}`
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost })
  if (debit.error || debit.data === null) {
    return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
  }

  try {
    const result = (await fal.subscribe(model.slug, { input: model.input(text, voice) })) as {
      data?: { audio?: { url?: string }; duration_ms?: number }
      audio?: { url?: string }
      duration_ms?: number
    }
    const url = result?.data?.audio?.url ?? result?.audio?.url ?? null
    if (!url) throw new Error('no audio url in provider response')
    const durationMs = result?.data?.duration_ms ?? result?.duration_ms ?? null
    const stored = await persistAudio({ userId: user.id, text, model: modelKey, voice, sourceUrl: url, durationMs })
    console.log(`[audio] user=${user.id.slice(0, 8)} model=${modelKey} chars=${text.length} cost=${cost} ok persisted=${!!stored.id}`)
    return NextResponse.json({ url: stored.url, id: stored.id, model: modelKey, cost })
  } catch (e) {
    console.error('[audio] provider failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json(
      { error: 'Audio generation failed. Your credits were refunded — try again.' },
      { status: 502 },
    )
  }
}
