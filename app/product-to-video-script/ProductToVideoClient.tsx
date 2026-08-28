'use client'

import { useState } from 'react'
import Link from 'next/link'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import {
  buildProductToVideoActivationHref,
  normalizeProductAudience,
  normalizeProductFacts,
  parseProductScript,
  type ProductScriptLine,
} from '@/lib/growth/productToVideo'

const EXAMPLES = [
  {
    name: 'Desk lamp',
    facts: 'A rechargeable desk lamp with three color temperatures, touch controls and a fold-flat travel design.',
    audience: 'remote workers with small desks',
  },
  {
    name: 'Invoice app',
    facts: 'A mobile invoicing app that creates branded invoices, tracks when clients view them and sends payment reminders.',
    audience: 'freelancers who chase late payments',
  },
  {
    name: 'Coffee concentrate',
    facts: 'A shelf-stable cold brew concentrate. One bottle makes eight drinks and can be mixed hot or iced.',
    audience: 'busy coffee drinkers',
  },
  {
    name: 'Bookkeeping service',
    facts: 'A monthly bookkeeping service for independent consultants, with reconciliations and a simple month-end report.',
    audience: 'solo consultants who avoid spreadsheets',
  },
] as const

const CARD = {
  background: 'rgba(11,17,32,.86)',
  border: '1px solid rgba(255,255,255,.09)',
} as const

export default function ProductToVideoClient() {
  const [facts, setFacts] = useState('')
  const [audience, setAudience] = useState('')
  const [lines, setLines] = useState<ProductScriptLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activationHref = buildProductToVideoActivationHref(lines)

  async function generate(nextFacts?: string, nextAudience?: string) {
    const cleanFacts = normalizeProductFacts(nextFacts ?? facts)
    const cleanAudience = normalizeProductAudience(nextAudience ?? audience)
    if (cleanFacts.length < 12) {
      setError('Add at least one real product fact first.')
      return
    }
    setFacts(cleanFacts)
    setAudience(cleanAudience)
    setLoading(true)
    setError('')
    setLines([])
    try {
      const response = await fetch('/api/demo-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cleanFacts, audience: cleanAudience, mode: 'product' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload?.error || 'Could not write the product Short. Try again.')
        return
      }
      const parsed = parseProductScript(payload?.script ?? '')
      if (parsed.length !== 5) {
        setError('The draft was incomplete. Try again.')
        return
      }
      setLines(parsed)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function useExample(example: (typeof EXAMPLES)[number]) {
    void generate(example.facts, example.audience)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 18px 70px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 850, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
          <Link href="/pricing" style={{ color: '#86868b', textDecoration: 'none', fontSize: '.8rem' }}>Pricing</Link>
        </div>

        <section style={{ marginTop: 46, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', color: '#34d399', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 999, padding: '6px 13px', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Free · no signup · fact-bounded
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.7rem)', lineHeight: 1.02, letterSpacing: '-.045em', fontWeight: 950, margin: '17px auto 0', maxWidth: 790 }}>
            Turn product facts into a faceless video ad script
          </h1>
          <p style={{ color: '#b7b7bd', fontSize: 'clamp(.98rem, 2.2vw, 1.1rem)', lineHeight: 1.65, margin: '17px auto 0', maxWidth: 690 }}>
            Paste what is true about the product and who it is for. Get a 35-second hook-to-CTA script without invented reviews, statistics or guarantees.
          </p>
        </section>

        <section id="product-script-tool" style={{ ...CARD, marginTop: 30, borderRadius: 18, padding: 'clamp(16px, 4vw, 24px)' }}>
          <label htmlFor="product-facts" style={{ display: 'block', color: '#e8e8ed', fontSize: '.82rem', fontWeight: 850, marginBottom: 9 }}>
            Product facts or product-page text
          </label>
          <textarea
            id="product-facts"
            value={facts}
            onChange={(event) => setFacts(event.target.value)}
            placeholder="What it is, what it does, important limitations, and any verified proof."
            rows={5}
            maxLength={700}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#050507', color: '#f5f5f7', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '13px 14px', fontSize: '1rem', lineHeight: 1.5, fontFamily: 'inherit', outlineColor: '#2997ff' }}
          />
          <label htmlFor="product-audience" style={{ display: 'block', color: '#e8e8ed', fontSize: '.82rem', fontWeight: 850, margin: '14px 0 9px' }}>
            Who is it for? <span style={{ color: '#6f6f76', fontWeight: 600 }}>(optional)</span>
          </label>
          <input
            id="product-audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="e.g. freelancers who chase late payments"
            maxLength={140}
            style={{ width: '100%', boxSizing: 'border-box', background: '#050507', color: '#f5f5f7', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '13px 14px', fontSize: '1rem', fontFamily: 'inherit', outlineColor: '#2997ff' }}
          />
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            style={{ width: '100%', minHeight: 50, marginTop: 12, border: 0, borderRadius: 12, background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: '1rem', cursor: loading ? 'default' : 'pointer', opacity: loading ? .68 : 1 }}
          >
            {loading ? 'Writing the product Short…' : 'Write the product Short →'}
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
            {EXAMPLES.map((example) => (
              <button
                key={example.name}
                type="button"
                disabled={loading}
                onClick={() => useExample(example)}
                style={{ borderRadius: 999, padding: '7px 11px', border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.045)', color: '#bdbdc4', fontSize: '.76rem', cursor: loading ? 'default' : 'pointer' }}
              >
                {example.name}
              </button>
            ))}
          </div>
          {error ? <p role="alert" style={{ color: '#fda4af', fontSize: '.88rem', margin: '13px 0 0' }}>{error}</p> : null}
        </section>

        {lines.length === 5 ? (
          <section aria-live="polite" style={{ ...CARD, marginTop: 18, borderRadius: 18, padding: 'clamp(18px, 4vw, 25px)' }}>
            <div style={{ color: '#34d399', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Your fact-bounded ad script
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
              <strong style={{ display: 'block', marginBottom: 6 }}>Keep these exact words for the video</strong>
              <p style={{ color: '#96969d', fontSize: '.86rem', lineHeight: 1.55, margin: '0 0 13px' }}>
                After signup, Kineo carries this 35-second script into the faceless workflow. You review it before spending a credit.
              </p>
              <Link href={activationHref} style={{ display: 'inline-flex', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, padding: '0 20px', color: '#fff', background: '#2997ff', fontWeight: 900, textDecoration: 'none' }}>
                Create this product Short →
              </Link>
            </div>
          </section>
        ) : null}

        <section style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 13 }}>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>What this tool refuses to invent</h2>
            <p style={{ color: '#96969d', fontSize: '.88rem', lineHeight: 1.62, margin: 0 }}>
              Missing proof stays a visible placeholder. There are no fabricated reviews, before-and-after claims, discounts, deadlines or guarantees.
            </p>
          </article>
          <article style={{ ...CARD, borderRadius: 16, padding: 19 }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>Need a product-content batch?</h2>
            <p style={{ color: '#96969d', fontSize: '.88rem', lineHeight: 1.62, margin: '0 0 12px' }}>
              Agencies and companies can turn a catalog or FAQ queue into one-time Fast Short volume packs.
            </p>
            <Link href={agencyPacksHref('product_tool')} style={{ color: '#34d399', fontSize: '.86rem', fontWeight: 850, textDecoration: 'none' }}>
              See one-time volume packs →
            </Link>
          </article>
        </section>

        <p style={{ color: '#6f6f76', fontSize: '.78rem', lineHeight: 1.55, margin: '24px auto 0', maxWidth: 690, textAlign: 'center' }}>
          This free result is a text draft, not a finished video. Verify every claim and replace each placeholder before publishing.
        </p>
      </div>
    </main>
  )
}
