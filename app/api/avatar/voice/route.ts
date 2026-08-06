// AI Avatar — voice cloning route.
// POST multipart/form-data: `file` (audio sample, >=10s recommended, <= 12MB).
// Uploads the sample to storage, clones the voice via MiniMax, and returns the
// custom_voice_id. The client holds that id and passes it to /api/generate-avatar
// so the narration is spoken in the cloned voice.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadAvatarAudio } from '@/lib/avatar/storage'
import { cloneVoice } from '@/lib/avatar/voice'
import { CLONE_VOICE_CREDIT_COST } from '@/lib/credits/engineCost'
import { refundRenderCredits } from '@/lib/credits/refund'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — todo débito passa pelo wrapper único
// (mesmo RPC; com a flag OFF é byte-idêntico ao rpc direto).
import { debitVideoCredits } from '@/lib/credits/debit'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const MAX_BYTES = 12 * 1024 * 1024
const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'Voice engine is not configured.' }, { status: 500 })
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
    }
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A voice sample (audio file) is required.' }, { status: 400 })
    }
    const mime = (file.type || '').toLowerCase()
    const ext = EXT_BY_MIME[mime]
    if (!ext) {
      return NextResponse.json({ error: 'Use an MP3, M4A, WAV, OGG or WebM audio file.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Audio is too large — keep it under 12 MB (~1-2 min).' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The audio file is empty.' }, { status: 400 })
    }

    let audioUrl: string
    try {
      audioUrl = await uploadAvatarAudio(user.id, buffer, ext, mime)
    } catch (err) {
      console.error('[avatar/voice] upload failed:', err instanceof Error ? err.message : String(err))
      return NextResponse.json({ error: 'Could not store the voice sample. Please try again.' }, { status: 502 })
    }

    // Charge for the clone BEFORE the paid MiniMax call (~$1.50). Same
    // balance-gate + debit_video_credits pattern as /api/gesture-clip, keyed on
    // a deterministic billing reference so the refund below is idempotent. A
    // login-only user with too few credits is blocked here (no free clones).
    const billingReference = `voice-clone-${user.id}-${Date.now()}`
    const { data: voiceProfile } = await supabase
      .from('profiles')
      .select('video_credits')
      .eq('id', user.id)
      .single()
    const balance = voiceProfile?.video_credits ?? 0
    if (balance < CLONE_VOICE_CREDIT_COST) {
      return NextResponse.json(
        {
          error: `Voice cloning costs ${CLONE_VOICE_CREDIT_COST} credits. You have ${balance}.`,
          balance,
          upsell: 'credits',
          upgrade: '/pricing',
        },
        { status: 402 },
      )
    }
    const { data: debitedBalance, error: debitErr } = await debitVideoCredits(supabase, {
      userId: user.id,
      renderId: billingReference,
      cost: CLONE_VOICE_CREDIT_COST,
    })
    if (debitErr || typeof debitedBalance !== 'number') {
      const insufficient = /balance|credit|insufficient/i.test(debitErr?.message ?? '')
      console.error('[avatar/voice] clone debit failed:', debitErr?.message ?? 'no balance returned')
      return NextResponse.json(
        {
          error: insufficient
            ? `Voice cloning needs ${CLONE_VOICE_CREDIT_COST} credits. Your balance changed before it could start.`
            : 'Your credit charge could not be confirmed. Nothing was submitted.',
          balance,
          ...(insufficient ? { upsell: 'credits', upgrade: '/pricing' } : {}),
        },
        { status: insufficient ? 402 : 503 },
      )
    }

    // Refund the fixed clone charge on ANY failure of the paid clone call so a
    // failed clone is never billed (idempotent — repeated calls can't double-refund).
    let cloneRes: { voiceId: string | null; error?: string }
    try {
      cloneRes = await cloneVoice(audioUrl)
    } catch (err) {
      await refundRenderCredits(billingReference)
      console.error('[avatar/voice] clone threw (refunded):', err instanceof Error ? err.message : String(err))
      return NextResponse.json(
        { error: 'Voice clone failed. Your credits were refunded automatically — please try again.' },
        { status: 502 },
      )
    }
    if (!cloneRes.voiceId) {
      await refundRenderCredits(billingReference)
      // Surface the RAW MiniMax/fal error so we can diagnose precisely (the
      // Vercel log dashboard truncates messages). Safe — it's the user's own
      // debug context, no secrets.
      return NextResponse.json(
        { error: `Voice clone failed — ${cloneRes.error ?? 'unknown error'}. Your credits were refunded automatically.` },
        { status: 502 },
      )
    }

    // KINEO-OWN-VOICE-2026-07-10 — persist the clone on the PROFILE (migration
    // 016): clone once in Avatar Studio → every Fast/AI generation can narrate
    // with the user's voice. Best-effort: a failed update never fails the clone.
    try {
      await supabase.from('profiles').update({ voice_clone_id: cloneRes.voiceId }).eq('id', user.id)
    } catch (e) {
      console.warn('[avatar/voice] voice_clone_id persist failed (non-blocking):', e instanceof Error ? e.message : String(e))
    }

    console.log(`[avatar/voice] cloned user=${user.id.slice(0, 8)} voice=${cloneRes.voiceId}`)
    return NextResponse.json({ voiceId: cloneRes.voiceId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[avatar/voice] unexpected error:', msg)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
