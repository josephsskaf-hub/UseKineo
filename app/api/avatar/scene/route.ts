// AI Avatar — "Scene" generation route.
// POST { imageUrl (our storage face URL), prompt (scene description) }.
// Flow: FLUX.1 Kontext edits the face photo into the described scene (same
// face, new outfit/background) → we re-host the result on our avatars bucket
// (the avatar pipeline only accepts our storage URLs) → return that URL, which
// the client then feeds to /api/generate-avatar as the source image to animate.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSceneImage, swapFaceOntoScene } from '@/lib/avatar/scene'
import { uploadAvatarPhoto } from '@/lib/avatar/storage'
import { SCENE_GEN_CREDIT_COST } from '@/lib/credits/engineCost'
import { refundRenderCredits } from '@/lib/credits/refund'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — todo débito passa pelo wrapper único
// (mesmo RPC; com a flag OFF é byte-idêntico ao rpc direto).
import { debitVideoCredits } from '@/lib/credits/debit'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'Image engine is not configured.' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Storage backend is not configured.' }, { status: 500 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    let body: { imageUrl?: string; prompt?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // Source must be OUR storage URL (uploaded via /api/avatar/upload) — never
    // an arbitrary external URL (no SSRF / hot-linking surface).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const storagePrefix = `${supabaseUrl}/storage/v1/object/public/avatars/`
    const imageUrl = (body.imageUrl ?? '').trim()
    const prompt = (body.prompt ?? '').trim()
    if (!imageUrl.startsWith(storagePrefix)) {
      return NextResponse.json({ error: 'Please upload your photo first.' }, { status: 400 })
    }
    if (prompt.length < 3) {
      return NextResponse.json({ error: 'Describe the scene first (at least a few words).' }, { status: 400 })
    }
    if (prompt.length > 600) {
      return NextResponse.json({ error: 'Scene description is too long — keep it under 600 characters.' }, { status: 400 })
    }

    // Lock the identity + steer toward a source that OmniHuman can animate well:
    // photoreal, front-facing, head + upper body clearly visible.
    const fullPrompt =
      `${prompt}. Keep the exact same person and the same face, unchanged facial features. ` +
      `Photorealistic, sharp, front-facing, head and upper body clearly visible, natural lighting.`

    // Charge for the scene BEFORE the paid fal calls (FLUX.1 Kontext edit +
    // best-effort face-swap). Same balance-gate + debit_video_credits pattern
    // as /api/gesture-clip, keyed on a deterministic billing reference so the
    // refunds below are idempotent. A login-only user with zero balance is
    // blocked here (no free scene generations).
    const billingReference = `scene-gen-${user.id}-${Date.now()}`
    const { data: sceneProfile } = await supabase
      .from('profiles')
      .select('video_credits')
      .eq('id', user.id)
      .single()
    const balance = sceneProfile?.video_credits ?? 0
    if (balance < SCENE_GEN_CREDIT_COST) {
      return NextResponse.json(
        {
          error: `Scene generation costs ${SCENE_GEN_CREDIT_COST} credits. You have ${balance}.`,
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
      cost: SCENE_GEN_CREDIT_COST,
    })
    if (debitErr || typeof debitedBalance !== 'number') {
      const insufficient = /balance|credit|insufficient/i.test(debitErr?.message ?? '')
      console.error('[avatar/scene] scene debit failed:', debitErr?.message ?? 'no balance returned')
      return NextResponse.json(
        {
          error: insufficient
            ? `Scene generation needs ${SCENE_GEN_CREDIT_COST} credits. Your balance changed before it could start.`
            : 'Your credit charge could not be confirmed. Nothing was submitted.',
          balance,
          ...(insufficient ? { upsell: 'credits', upgrade: '/pricing' } : {}),
        },
        { status: insufficient ? 402 : 503 },
      )
    }

    let falUrl: string
    try {
      falUrl = await generateSceneImage({ imageUrl, prompt: fullPrompt })
    } catch (err) {
      await refundRenderCredits(billingReference)
      console.error('[avatar/scene] generation failed (refunded):', err instanceof Error ? err.message : String(err))
      return NextResponse.json(
        { error: 'Could not build the scene. Try again or simplify the description. Your credits were refunded automatically.' },
        { status: 502 },
      )
    }

    // Face fidelity (16/06) — best-effort face-swap: lock the user's REAL face
    // onto the generated scene so it looks like THEM every time (no more
    // regenerating until the face matches). Falls back to the Kontext image if
    // the swap fails for any reason — never a regression.
    let finalUrl = falUrl
    try {
      const swapped = await swapFaceOntoScene({ sceneImageUrl: falUrl, faceImageUrl: imageUrl })
      if (swapped) finalUrl = swapped
    } catch { /* keep the Kontext image */ }

    // Re-host on our bucket so the avatar pipeline accepts it as a source.
    let storageUrl: string
    try {
      const res = await fetch(finalUrl)
      if (!res.ok) throw new Error(`fetch scene image failed: ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      storageUrl = await uploadAvatarPhoto(user.id, buf, 'image/jpeg')
    } catch (err) {
      // The paid scene was built but the user gets no usable URL — refund so we
      // never bill for a scene we could not deliver.
      await refundRenderCredits(billingReference)
      console.error('[avatar/scene] re-host failed (refunded):', err instanceof Error ? err.message : String(err))
      return NextResponse.json(
        { error: 'Scene was built but could not be saved. Your credits were refunded automatically — please try again.' },
        { status: 502 },
      )
    }

    console.log(`[avatar/scene] scene built user=${user.id.slice(0, 8)} -> ${storageUrl}`)
    return NextResponse.json({ url: storageUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[avatar/scene] unexpected error:', msg)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
