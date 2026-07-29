// KINEO-SPRINT-12H-2026-07-29 — "YOUR NEXT 3 SHORTS"
//
// THE NUMBER THIS EXISTS TO MOVE
// Counted directly in production on 2026-07-29 (project cqqukkvjjrguayiyjvhh):
//   721 profiles · 212 people finished at least one video · of those 212,
//   173 (82%) finished EXACTLY ONE and never came back. Only 9 people ever
//   made five.
//
// Activation is not the problem — 29% of signups finish a video, which is a
// healthy number. The problem is the second video, and the reason is visible in
// the UI: when a render finishes, the only forward action is "Generate Another
// Short", which calls handleReset() and hands the user an empty textarea.
//
// Kineo automates the part that was never hard. Deciding what tomorrow's video
// is about IS the hard part of running a faceless channel, and we were leaving
// the whole of it with the customer. This route closes that gap: given the
// Short someone just finished, it returns three concrete follow-ups in the same
// niche and format, each one tap from being generated. "Make another one"
// stops being a decision and becomes a choice between three.
//
// COST POSTURE
// gpt-4o-mini, max_tokens capped, one call per finished render. At the current
// rate of ~575 lifetime renders this is a rounding error against the ~$0.02-0.05
// it already costs to serve a Fast video (lib/credits/engineCost.ts:32-35).
// Charges NO credit: this is retention, and putting a price on "what should I
// make next" would reintroduce the exact friction the route removes.
//
// AUTH: requires a session. Unlike /api/demo-hooks this is not a lead magnet —
// it only ever runs for someone who just spent a credit, so the per-IP limiter
// that guards the public demo routes is unnecessary here.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export interface NextShortIdea {
  title: string
  prompt: string
  angle: string
}

const SYSTEM = `You program content calendars for faceless YouTube Shorts channels aimed at a US audience, 18-34, in US English.

The user just published a Short. Your job is to give them the next three, so the channel keeps a consistent identity instead of drifting topic to topic.

Rules for the three ideas:
- Same niche and same format as the Short they just made. A viewer who liked the first should want all three.
- Each must be a DIFFERENT angle, not a rewording. Use contrast: one goes deeper on a detail, one zooms out to the bigger pattern, one takes the opposite or darker side.
- Each must be concrete and checkable — a specific place, person, number, year or event. Never a vague theme.
- "title" — max 7 words, the channel-facing name of the episode. No clickbait punctuation, no emojis, no ALL CAPS.
- "prompt" — one sentence, 15-30 words, written as an instruction to a video generator, that states the subject AND the curiosity hook. This string goes straight into the generator, so it must stand alone without the other two.
- "angle" — max 5 words describing why this one is different (e.g. "the money behind it", "what came after", "the part nobody films").

Return ONLY valid JSON, no markdown fence:
{"ideas":[{"title":"...","prompt":"...","angle":"..."},{...},{...}]}`

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fail SOFT, always. This block is decoration on a success screen — the
      // user already has the video they paid a credit for. A 500 here would
      // turn "we couldn't suggest a follow-up" into "something broke", on the
      // single screen where the product most needs to feel finished.
      return NextResponse.json({ ideas: [] })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ideas: [] })

    let body: { topic?: string; title?: string; niche?: string; hook?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ideas: [] })
    }

    const topic = clean(body.topic, 600)
    const title = clean(body.title, 160)
    const niche = clean(body.niche, 80)
    const hook = clean(body.hook, 240)
    if (topic.length < 3 && title.length < 3) return NextResponse.json({ ideas: [] })

    const userMsg = [
      title && `Episode they just published: ${title}`,
      niche && `Channel niche: ${niche}`,
      hook && `Opening hook that was used: ${hook}`,
      topic && `Full topic/script they gave us: ${topic.slice(0, 600)}`,
    ]
      .filter(Boolean)
      .join('\n')

    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0.85,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      },
      { timeout: 20_000 },
    )

    const raw = completion.choices?.[0]?.message?.content ?? '{}'
    let parsed: { ideas?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ ideas: [] })
    }

    const ideas: NextShortIdea[] = (Array.isArray(parsed.ideas) ? parsed.ideas : [])
      .map((raw_: unknown) => {
        const o = (raw_ ?? {}) as Record<string, unknown>
        return {
          title: clean(o.title, 80),
          prompt: clean(o.prompt, 400),
          angle: clean(o.angle, 40),
        }
      })
      // A card with no prompt is a dead button: it would reset the generator to
      // an empty box, which is exactly the failure this route was built to end.
      .filter((i) => i.prompt.length > 10 && i.title.length > 2)
      .slice(0, 3)

    return NextResponse.json({ ideas })
  } catch {
    return NextResponse.json({ ideas: [] })
  }
}
