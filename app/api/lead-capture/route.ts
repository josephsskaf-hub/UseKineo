import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import {
  B2B_LEAD_INTENT,
  B2B_LEAD_SOURCE,
  b2bVolumeStorageKey,
  normalizeLeadEmail,
  parseB2BLeadInput,
} from '@/lib/growth/b2bLead'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = atual).
const OFFER = getFreeTierOffer()

// #456 — saves an exit-intent lead to `leads`.
// #461 — Measure 2 (lead nurture): on a NEW lead, instantly emails the lead
// magnet (the 10 viral ideas) + a truthful free-Fast CTA via Resend.
// Turns a captured email into an activated signup. Best-effort: a send failure
// never breaks the capture.
export const dynamic = 'force-dynamic'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = 'https://www.usekineo.com'

const VIRAL_IDEAS = [
  'The island so dangerous it is illegal to visit (Snake Island)',
  'The deepest hole humans ever dug — and why they sealed it',
  'The colony that vanished overnight, leaving one word (Roanoke)',
  'How tiny Monaco became the richest place on Earth',
  'The Roman city frozen in time by a volcano (Pompeii)',
  'The radio signal from deep space that repeats every 16 days',
  'The city built in the desert with no rivers (Dubai)',
  'The 5 richest people and their strangest daily habits',
  'The abandoned Soviet city you can still walk through (Chernobyl)',
  'The mountain so tall planes fly around it, not over it',
]

async function sendLeadMagnet(email: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[lead-capture] RESEND_API_KEY not set — skipping magnet email')
    return
  }
  const url = `${APP_URL}/signup?utm_source=lead_magnet&utm_medium=email&utm_campaign=viral_ideas_activation`
  const list = VIRAL_IDEAS.map((idea, i) => `${i + 1}. ${idea}`).join('\n')
  const text = `Hey,

Here are your 10 viral Short ideas — pick any one and you can have a video in 3–7 minutes:

${list}

Want to turn one into a real Short right now? Type it into Kineo and the AI writes the script, voiceover, captions and finds the footage. ${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24 hours — no card needed.', OFFER.copy.headline)}

Make a Fast video: ${url}

— Kineo Team
usekineo.com`

  const ideasHtml = VIRAL_IDEAS.map(
    (idea, i) =>
      `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5;"><b>${i + 1}.</b> ${idea}</p>`,
  ).join('')
  const html = `
<div style="font-family:Arial,sans-serif;color:#111;">
  <p style="font-size:15px;">Hey,</p>
  <p style="font-size:15px;">Here are your <b>10 viral Short ideas</b> — pick any one and you can have a video in 3–7 minutes:</p>
  ${ideasHtml}
  <p style="font-size:15px;margin-top:16px;">Want to turn one into a real Short right now? Type it into Kineo — the AI writes the script, voiceover, captions and finds the footage. <b>${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24 hours, no card needed.', OFFER.copy.headline)}</b></p>
  <p style="margin:20px 0;">
    <a href="${url}" style="background:#2997ff;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px;font-family:Arial,sans-serif;font-size:15px;display:inline-block;">Make a Fast video →</a>
  </p>
  <p style="font-size:13px;color:#555;">— Kineo Team<br/>usekineo.com</p>
</div>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        reply_to: 'hello@usekineo.com',
        subject: 'Your 10 viral Short ideas 🎬',
        text,
        html,
      }),
    })
  } catch (err) {
    console.error('[lead-capture] magnet email failed:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const declaredLength = Number(req.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > 4096) {
      return NextResponse.json({ error: 'request too large' }, { status: 413 })
    }
    const rawBody = await req.text()
    if (rawBody.length > 4096) {
      return NextResponse.json({ error: 'request too large' }, { status: 413 })
    }
    const body = (() => {
      try {
        return JSON.parse(rawBody) as Record<string, unknown>
      } catch {
        return {}
      }
    })()

    // A hidden field catches basic form bots without revealing whether an
    // address was stored. The unique lower(email) index remains the final
    // duplicate guard in production.
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ ok: true })
    }

    const isB2BBrief = body.intent === B2B_LEAD_INTENT
    const b2bInput = isB2BBrief ? parseB2BLeadInput(body) : null
    const email = b2bInput?.email ?? normalizeLeadEmail(body.email)
    if (!email || (isB2BBrief && !b2bInput)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[lead-capture] Supabase service env missing')
      return isB2BBrief
        ? NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 })
        : NextResponse.json({ ok: true, saved: false })
    }

    const admin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const country = req.headers.get('x-vercel-ip-country') ?? null
    // Business intent is fixed by the server. A caller cannot smuggle an
    // arbitrary source or free-form brief into the lead inbox.
    const source = isB2BBrief
      ? B2B_LEAD_SOURCE
      : typeof body.source === 'string'
        ? body.source.slice(0, 60)
        : 'unknown'
    const magnet = isB2BBrief && b2bInput
      ? b2bVolumeStorageKey(b2bInput.volume)
      : typeof body.magnet === 'string'
        ? body.magnet.slice(0, 60)
        : null

    const { error } = await admin
      .from('leads')
      .insert({ email, source, magnet, signup_country: country })

    const duplicate = error?.code === '23505' || Boolean(error && /duplicate|unique/i.test(error.message))
    const isNewLead = !error
    if (error && !duplicate) {
      console.error('[lead-capture] insert error:', error.message)
    }

    // An address may have requested the B2C lead magnet earlier. Business
    // intent must not disappear behind the unique e-mail index, so the newer,
    // explicit B2B request becomes the inbox classification.
    if (isB2BBrief && duplicate) {
      const { error: updateError } = await admin
        .from('leads')
        .update({ source, magnet })
        .eq('email', email)
      if (updateError) {
        console.error('[lead-capture] business lead update error:', updateError.message)
        return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 })
      }
    }

    if (isB2BBrief && error && !duplicate) {
      return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 })
    }

    // #461 — only email on a brand-new lead (never re-spam a returning one).
    if (isNewLead && !isB2BBrief) {
      await sendLeadMagnet(email)
    }

    return NextResponse.json({ ok: true, saved: isNewLead || (isB2BBrief && duplicate) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[lead-capture] error:', msg)
    return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 })
  }
}
