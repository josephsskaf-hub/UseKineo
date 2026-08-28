'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import {
  buildCommentToVideoActivationHref,
  normalizeAudienceComment,
  parseCommentScript,
  type CommentScriptLine,
} from '@/lib/growth/commentToVideo'

const EXAMPLES = [
  'Do I really need to post every day to grow?',
  'Why does this service cost more than the cheap option?',
  'Will using AI video hurt my reach?',
  'How do I know which plan is actually right for me?',
] as const

const CARD = {
  background: 'rgba(11,17,32,.86)',
  border: '1px solid rgba(255,255,255,.09)',
} as const

export default function CommentToVideoClient({ initialComment = '' }: { initialComment?: string }) {
  const [comment, setComment] = useState(initialComment)
  const [lines, setLines] = useState<CommentScriptLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activationHref = buildCommentToVideoActivationHref(lines)

  useEffect(() => {
    setComment(initialComment)
    setLines([])
    setError('')
  }, [initialComment])

  async function generate(value?: string) {
    const audienceComment = normalizeAudienceComment(value ?? comment)
    if (audienceComment.length < 3) {
      setError('Paste a real comment or customer question first.')
      return
    }
    setComment(audienceComment)
    setLoading(true)
    setError('')
    setLines([])
    try {
      const response = await fetch('/api/demo-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: audienceComment, mode: 'comment' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload?.error || 'Could not write the response. Try again.')
        return
      }
      const parsed = parseCommentScript(payload?.script ?? '')
      if (parsed.length === 0) {
        setError('The response came back empty. Try again.')
        return
      }
      setLines(parsed)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 18px 70px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 850, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
          <Link href="/pricing" style={{ color: '#86868b', textDecoration: 'none', fontSize: '.8rem' }}>Pricing</Link>
        </div>

        <section style={{ marginTop: 46, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', color: '#34d399', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 999, padding: '6px 13px', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Free · no signup · text only
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.7rem)', lineHeight: 1.02, letterSpacing: '-.045em', fontWeight: 950, margin: '17px auto 0', maxWidth: 760 }}>
            Turn a real comment into your next Short
          </h1>
          <p style={{ color: '#b7b7bd', fontSize: 'clamp(.98rem, 2.2vw, 1.1rem)', lineHeight: 1.65, margin: '17px auto 0', maxWidth: 670 }}>
            Paste a viewer comment, customer FAQ or sales objection. Get a hook-to-payoff response script you can read, edit and carry into a finished video.
          </p>
        </section>

        <section id="comment-to-video-tool" style={{ ...CARD, marginTop: 30, borderRadius: 18, padding: 'clamp(16px, 4vw, 24px)' }}>
          <label htmlFor="audience-comment" style={{ display: 'block', color: '#e8e8ed', fontSize: '.82rem', fontWeight: 850, marginBottom: 9 }}>
            The exact comment or question
          </label>
          <textarea
            id="audience-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="e.g. Why should I trust an AI-made video?"
            rows={4}
            maxLength={280}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#050507', color: '#f5f5f7', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '13px 14px', fontSize: '1rem', lineHeight: 1.5, fontFamily: 'inherit', outlineColor: '#2997ff' }}
          />
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            style={{ width: '100%', minHeight: 50, marginTop: 11, border: 0, borderRadius: 12, background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: '1rem', cursor: loading ? 'default' : 'pointer', opacity: loading ? .68 : 1 }}
          >
            {loading ? 'Writing the response…' : 'Write the response Short →'}
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={loading}
                onClick={() => void generate(example)}
                style={{ borderRadius: 999, padding: '7px 11px', border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.045)', color: '#bdbdc4', fontSize: '.76rem', cursor: loading ? 'default' : 'pointer' }}
              >
                {example}
              </button>
            ))}
          </div>
          {error ? <p role="alert" style={{ color: '#fda4af', fontSize: '.88rem', margin: '13px 0 0' }}>{error}</p> : null}
        </section>

        {lines.length > 0 ? (
          <section aria-live="polite" style={{ ...CARD, marginTop: 18, borderRadius: 18, padding: 'clamp(18px, 4vw, 25px)' }}>
            <div style={{ color: '#34d399', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Your response script
            </div>
            <div style={{ display: 'grid', gap: 13 }}>
              {lines.map((line, index) => (
                <div key={`${line.label}-${index}`}>
                  {line.label ? <div style={{ color: '#2997ff', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.07em', marginBottom: 3 }}>{line.label}</div> : null}
                  <div style={{ color: '#f5f5f7', fontSize: '1rem', lineHeight: 1.52 }}>{line.text}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 21, padding: 18, borderRadius: 14, textAlign: 'center', background: 'rgba(41,151,255,.09)', border: '1px solid rgba(41,151,255,.3)' }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Keep this exact script for the video</strong>
              <p style={{ color: '#96969d', fontSize: '.86rem', lineHeight: 1.55, margin: '0 0 13px' }}>
                After signup, Kineo carries these lines into the creation flow for voiceover, visuals and captions. You review before generating.
              </p>
              <Link href={activationHref} style={{ display: 'inline-flex', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, padding: '0 20px', color: '#fff', background: '#2997ff', fontWeight: 900, textDecoration: 'none' }}>
                Create this response video →
              </Link>
            </div>
          </section>
        ) : null}

        <section style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 13 }}>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>Why comments make strong videos</h2>
            <p style={{ color: '#96969d', fontSize: '.88rem', lineHeight: 1.62, margin: 0 }}>
              A comment gives you the audience, tension and opening question at once. The tool turns that raw signal into a direct answer instead of inventing another generic topic.
            </p>
          </article>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>For a client or company?</h2>
            <p style={{ color: '#96969d', fontSize: '.88rem', lineHeight: 1.62, margin: '0 0 12px' }}>
              Turn recurring FAQs and objections into a monthly content queue. Kineo also offers one-time Fast Short volume packs for client work.
            </p>
            <Link href={agencyPacksHref('comment_tool')} style={{ color: '#34d399', fontSize: '.86rem', fontWeight: 850, textDecoration: 'none' }}>
              See one-time volume packs →
            </Link>
          </article>
        </section>

        <p style={{ color: '#6f6f76', fontSize: '.78rem', lineHeight: 1.55, margin: '24px auto 0', maxWidth: 670, textAlign: 'center' }}>
          The free result is a text draft, not a finished video. Check factual claims and replace any placeholder with your own business facts before publishing.
        </p>
      </div>
    </main>
  )
}
