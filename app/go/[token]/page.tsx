import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  ASPECTS,
  ENGINE_LABELS,
  HANDOFF_TTL_DAYS,
  STUDIO_PROMPT_MAX_CHARS,
  describeFit,
  engineFamily,
  handoffHeadline,
  isHandoffEngine,
  isHandoffToken,
} from '@/lib/gptHandoff'
import { findHandoff, isLikelyBot, markHandoffViewed, type GptHandoffRow } from '@/lib/gptHandoffStore'

// ═══ KINEO-GPT-HANDOFF-2026-09-06 — a página que o link do GPT abre ═════════
//
// A pessoa pediu um roteiro ao ChatGPT, o GPT chamou nossa ação e recebeu
// `/go/<token>`. Aqui ela vê o roteiro INTEIRO, a duração, o motor sugerido e
// a estimativa da régua — e aperta UM botão. O botão passa pelo servidor
// (/api/gpt/handoff/go) para o clique ser contado e a porta (Studio / conta)
// ser decidida lá; nada aqui depende de JavaScript.
//
// Sem CSS novo: mesmo vocabulário inline de app/revive/[handle]/page.tsx e
// app/v/[id]/page.tsx (BLUE/MUTED/TEXT/SOFT, Shell, Wordmark).
//
// `force-dynamic` + `nodejs`: lê cookies() e headers() (sessão, robô, dedupe)
// e a linha do banco pelo service role. Uma URL com token não pode ser
// cacheada entre visitantes nem indexada.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Your script is ready · Kineo',
  description: 'A script written with ChatGPT, ready to become a video in Kineo Studio.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

const BLUE = '#2997ff'
const MUTED = '#86868b'
const TEXT = '#f5f5f7'
const SOFT = '#d2d2d7'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: TEXT,
        padding: '22px 16px 64px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
    </main>
  )
}

function Wordmark() {
  return (
    <Link href="/" style={{ color: BLUE, fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.01em', textDecoration: 'none' }}>
      Kineo
    </Link>
  )
}

const BUTTON: React.CSSProperties = {
  display: 'inline-block',
  background: BLUE,
  color: '#fff',
  fontWeight: 700,
  fontSize: '1.05rem',
  padding: '14px 26px',
  borderRadius: 12,
  textDecoration: 'none',
}

function Expired({ reason }: { reason: 'expired' | 'missing' | 'unavailable' }) {
  const line =
    reason === 'unavailable'
      ? 'This page is temporarily unavailable. It will be back in a minute — please refresh.'
      : reason === 'missing'
        ? 'This link does not match any script. Links from the Kineo GPT look like /go/… and are valid for ' + HANDOFF_TTL_DAYS + ' days.'
        : `This link has expired. Scripts handed off by the Kineo GPT stay open for ${HANDOFF_TTL_DAYS} days.`
  return (
    <Shell>
      <header style={{ marginBottom: 26 }}>
        <Wordmark />
      </header>
      <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
        {reason === 'unavailable' ? 'One moment.' : 'This link has expired.'}
      </h1>
      <p style={{ color: SOFT, fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 24px' }}>{line}</p>
      <p style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.6, margin: '0 0 24px' }}>
        You can still paste the script yourself: open the Studio, paste the text, choose &ldquo;Use my script as is&rdquo; and press Generate.
      </p>
      <Link href="/studio?utm_source=chatgpt_gpt&intent_campaign=kineo_gpt_store_expired" style={BUTTON}>
        Open the Studio
      </Link>
    </Shell>
  )
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ color: MUTED, fontSize: '0.9rem' }}>{children}</span>
}

export default async function GoPage({ params }: { params: { token: string } }) {
  const token = params.token
  if (!isHandoffToken(token)) return <Expired reason="missing" />

  const found = await findHandoff(token)
  if (found.status === 'unavailable') return <Expired reason="unavailable" />
  if (found.status === 'missing') return <Expired reason="missing" />
  if (found.expired) return <Expired reason="expired" />
  const row: GptHandoffRow = found.row

  // ── Quem está olhando (só para a frase do botão; a porta é decidida na rota).
  let signedIn = false
  try {
    const {
      data: { user },
    } = await createClient().auth.getUser()
    signedIn = Boolean(user?.id)
  } catch {
    signedIn = false
  }

  // ── Pageview no SERVIDOR. `dedupeMinutes`: esta rota é force-dynamic e
  // re-renderiza em toda navegação RSC — sem dedupe o evento contaria renders,
  // não chegadas (o denominador inflado 2,7x do PUSH #96). Robô é etiquetado,
  // não bloqueado, e não carimba viewed_at.
  const bot = isLikelyBot(headers().get('user-agent'))
  try {
    if (!bot) await markHandoffViewed(token)
    await writeServerEvent({
      name: 'gpt_landing_viewed',
      path: '/go/[token]',
      sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
      dedupeMinutes: 30,
      metadata: {
        // ver o comentario em app/api/gpt/handoff/go/route.ts: sem o token o
        // degrau do pouso nao se liga ao handoff e o funil mede zero para sempre.
        token: row.token,
        signed_in: signedIn,
        bot,
        engine_hint: row.engine_hint,
        duration_sec: row.duration_sec,
        fit: row.fit,
        words: row.words,
        language: row.language,
        already_viewed: Boolean(row.viewed_at),
      },
    })
  } catch {
    /* a página nunca quebra por causa do contador */
  }

  const engine = isHandoffEngine(row.engine_hint) ? row.engine_hint : 'seedance'
  const engineLabel = ENGINE_LABELS[engine]
  const family = engineFamily(engine)
  const aspect = (ASPECTS as readonly string[]).includes(row.aspect) ? row.aspect : '9:16'
  const headline = handoffHeadline(row)
  const fitLine = describeFit({ fit: row.fit, seconds: Number(row.seconds), words: row.words }, row.duration_sec)
  const overStudioLimit = row.script.length > STUDIO_PROMPT_MAX_CHARS
  const goHref = `/api/gpt/handoff/go?token=${encodeURIComponent(token)}`
  const pricingHref = `/api/gpt/handoff/pricing?token=${encodeURIComponent(token)}`

  return (
    <Shell>
      <header style={{ marginBottom: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark />
        {/* K1 — "See plans" contado no servidor (rota irmã). */}
        <a href={pricingHref} style={{ color: MUTED, fontSize: '0.92rem', textDecoration: 'none' }}>
          See plans →
        </a>
      </header>

      <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '0.01em' }}>
        Script from ChatGPT · ready for Kineo Studio
      </p>
      <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.3rem)', fontWeight: 800, lineHeight: 1.14, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
        {headline}
      </h1>

      <p style={{ margin: '0 0 8px', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        <Meta>{row.duration_sec}s video</Meta>
        <Meta>{engineLabel} engine{family === 'hollywood' ? ' · characters speak on screen' : ''}</Meta>
        <Meta>{aspect}</Meta>
        <Meta>{row.language}</Meta>
        <Meta>{row.words} words</Meta>
      </p>
      <p style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.55, margin: '0 0 22px' }}>{fitLine}</p>

      {overStudioLimit && (
        <p style={{ color: '#ffb340', fontSize: '0.95rem', lineHeight: 1.55, margin: '0 0 18px' }}>
          This script is {row.script.length.toLocaleString('en-US')} characters; the Studio accepts up to{' '}
          {STUDIO_PROMPT_MAX_CHARS.toLocaleString('en-US')}. You will be asked to trim it before generating.
        </p>
      )}

      <div style={{ margin: '0 0 26px' }}>
        <a href={goHref} style={BUTTON}>
          Make this video
        </a>
        <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.5, margin: '10px 0 0' }}>
          {signedIn
            ? 'Opens your Studio with this script loaded, exactly as written.'
            : 'Free to try — no card. Create your account and you come straight back to this script.'}
        </p>
      </div>

      <section style={{ borderTop: '1px solid #1d1d1f', paddingTop: 18 }}>
        <p style={{ color: MUTED, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Full script
        </p>
        <div style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {row.script}
        </div>
      </section>

      <p style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.5, marginTop: 28 }}>
        Kineo directs, narrates and edits the film from this text. Nothing is generated until you press Generate in the Studio.
        This link stays open for {HANDOFF_TTL_DAYS} days.
      </p>
    </Shell>
  )
}
