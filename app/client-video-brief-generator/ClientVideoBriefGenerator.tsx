'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import { trackEvent } from '@/lib/analytics'
import {
  buildClientShortActivationHref,
  buildClientShortBrief,
  buildClientShortBriefShareHref,
  clientShortBriefAsText,
  CLIENT_SHORT_BRIEF_CAMPAIGN,
  CLIENT_SHORT_BRIEF_SHARE_CAMPAIGN,
  CLIENT_SHORT_GOALS,
  type ClientShortGoal,
} from '@/lib/growth/clientShortBrief'

const CARD = { background: 'rgba(14,15,20,.92)', border: '1px solid rgba(255,255,255,.1)' } as const
const FIELD = { width: '100%', boxSizing: 'border-box', minHeight: 49, borderRadius: 12, border: '1px solid rgba(255,255,255,.14)', background: '#07080b', color: '#f5f5f7', padding: '11px 13px', font: 'inherit', outlineColor: '#a78bfa' } as const
const EXAMPLE = {
  offer: 'monthly bookkeeping for independent consultants',
  audience: 'consultants who lose evenings reconciling invoices and expenses',
  proof: 'monthly reconciliations and a plain-language month-end report',
  cta: 'Book a 20-minute fit call',
  goal: 'leads' as ClientShortGoal,
}
const VIEW_MARKER = 'kineo:client-short-brief:viewed:v1'

export default function ClientVideoBriefGenerator() {
  const [offer, setOffer] = useState('')
  const [audience, setAudience] = useState('')
  const [proof, setProof] = useState('')
  const [cta, setCta] = useState('')
  const [goal, setGoal] = useState<ClientShortGoal>('leads')
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [intakeLinkCopied, setIntakeLinkCopied] = useState(false)

  const brief = submitted ? buildClientShortBrief({ offer, audience, proof, cta, goal }) : null
  const briefText = brief ? clientShortBriefAsText(brief) : ''
  const activationHref = brief ? buildClientShortActivationHref(brief) : '/signup'

  useEffect(() => {
    try {
      if (sessionStorage.getItem(VIEW_MARKER) === '1') return
      sessionStorage.setItem(VIEW_MARKER, '1')
    } catch {
      // Storage may be unavailable in privacy mode. The tool still works.
    }
    void trackEvent('client_short_brief_viewed', { version: CLIENT_SHORT_BRIEF_CAMPAIGN, surface: 'client_video_brief_generator' })
  }, [])

  function generate() {
    const next = buildClientShortBrief({ offer, audience, proof, cta, goal })
    if (!next) {
      setSubmitted(true)
      return
    }
    setSubmitted(true)
    setCopied(false)
    void trackEvent('client_short_brief_generated', {
      version: CLIENT_SHORT_BRIEF_CAMPAIGN,
      surface: 'client_video_brief_generator',
      goal,
      proof_state: proof.trim() ? 'supplied' : 'placeholder',
      cta_state: cta.trim() ? 'supplied' : 'placeholder',
    })
  }

  async function copyBrief() {
    if (!briefText) return
    try {
      await navigator.clipboard.writeText(briefText)
      setCopied(true)
      void trackEvent('client_short_brief_copied', { version: CLIENT_SHORT_BRIEF_CAMPAIGN, surface: 'client_video_brief_generator' })
    } catch {
      setCopied(false)
    }
  }

  async function copyClientIntakeLink() {
    const shareUrl = new URL(buildClientShortBriefShareHref(), window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIntakeLinkCopied(true)
      void trackEvent('client_short_brief_intake_link_copied', {
        version: CLIENT_SHORT_BRIEF_SHARE_CAMPAIGN,
        surface: 'client_video_brief_generator',
      })
    } catch {
      setIntakeLinkCopied(false)
    }
  }

  function useExample() {
    setOffer(EXAMPLE.offer)
    setAudience(EXAMPLE.audience)
    setProof(EXAMPLE.proof)
    setCta(EXAMPLE.cta)
    setGoal(EXAMPLE.goal)
    setSubmitted(false)
    setCopied(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: 'min(940px, calc(100% - 36px))', margin: '0 auto', padding: '28px 0 76px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: '#2997ff', fontSize: '1.05rem', fontWeight: 900, textDecoration: 'none' }}>Kineo</Link>
          <Link href="/ai-shorts-for-agencies" style={{ color: '#c4b5fd', fontSize: '.82rem', fontWeight: 800, textDecoration: 'none' }}>Agency video packs</Link>
        </nav>

        <header style={{ maxWidth: 840, margin: '66px auto 0', textAlign: 'center' }}>
          <p style={{ display: 'inline-block', margin: 0, padding: '6px 12px', borderRadius: 999, color: '#c4b5fd', border: '1px solid rgba(167,139,250,.35)', background: 'rgba(167,139,250,.1)', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Free · no signup · client-ready
          </p>
          <h1 style={{ margin: '17px 0 0', fontSize: 'clamp(2.15rem, 7vw, 4.3rem)', lineHeight: .99, letterSpacing: '-.052em', fontWeight: 950 }}>
            Turn a vague client request into a Short video brief
          </h1>
          <p style={{ maxWidth: 700, margin: '20px auto 0', color: '#a9a9b2', fontSize: 'clamp(1rem, 2.2vw, 1.13rem)', lineHeight: 1.65 }}>
            Give the tool five facts. Get a 35-second faceless brief with hook direction, story beats, visual boundaries and an approval checklist—before production starts.
          </p>
        </header>

        <section id="client-brief-tool" style={{ ...CARD, marginTop: 32, padding: 'clamp(18px, 4vw, 28px)', borderRadius: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18, padding: '12px 14px', borderRadius: 13, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.2)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#e5e7eb', fontSize: '.84rem', fontWeight: 900 }}>Let the client answer first</div>
              <div style={{ marginTop: 3, color: '#9696a1', fontSize: '.76rem', lineHeight: 1.45 }}>Copy a blank intake link. Their answers stay in their browser and are never added to the URL.</div>
            </div>
            <button type="button" onClick={() => void copyClientIntakeLink()} style={{ minHeight: 40, flex: '0 0 auto', borderRadius: 10, border: '1px solid rgba(41,151,255,.35)', background: 'rgba(41,151,255,.12)', color: '#7cc0ff', padding: '0 13px', fontWeight: 900, cursor: 'pointer' }}>
              {intakeLinkCopied ? 'Intake link copied ✓' : 'Copy client intake link'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 15 }}>
            <label style={{ display: 'grid', gap: 7, color: '#d8d8df', fontSize: '.8rem', fontWeight: 850 }}>
              What is the client selling or explaining?
              <input value={offer} onChange={(event) => { setOffer(event.target.value); setSubmitted(false) }} maxLength={140} placeholder="e.g. monthly bookkeeping for consultants" style={FIELD} />
            </label>
            <label style={{ display: 'grid', gap: 7, color: '#d8d8df', fontSize: '.8rem', fontWeight: 850 }}>
              Who should care?
              <input value={audience} onChange={(event) => { setAudience(event.target.value); setSubmitted(false) }} maxLength={100} placeholder="e.g. consultants losing evenings to admin" style={FIELD} />
            </label>
            <label style={{ display: 'grid', gap: 7, color: '#d8d8df', fontSize: '.8rem', fontWeight: 850 }}>
              Video goal
              <select value={goal} onChange={(event) => { setGoal(event.target.value as ClientShortGoal); setSubmitted(false) }} style={FIELD}>
                {CLIENT_SHORT_GOALS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 7, color: '#d8d8df', fontSize: '.8rem', fontWeight: 850 }}>
              Real call to action <span style={{ color: '#777781', fontWeight: 650 }}>(optional)</span>
              <input value={cta} onChange={(event) => { setCta(event.target.value); setSubmitted(false) }} maxLength={100} placeholder="e.g. Book a 20-minute fit call" style={FIELD} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 7, marginTop: 15, color: '#d8d8df', fontSize: '.8rem', fontWeight: 850 }}>
            Verified proof, feature or limitation <span style={{ color: '#777781', fontWeight: 650 }}>(optional—missing proof stays a placeholder)</span>
            <textarea value={proof} onChange={(event) => { setProof(event.target.value); setSubmitted(false) }} maxLength={180} rows={3} placeholder="Use only something the client can verify." style={{ ...FIELD, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, marginTop: 15 }}>
            <button type="button" onClick={generate} style={{ minHeight: 51, border: 0, borderRadius: 13, background: '#a78bfa', color: '#120b24', fontWeight: 950, fontSize: '1rem', cursor: 'pointer' }}>
              Build the client brief →
            </button>
            <button type="button" onClick={useExample} style={{ minHeight: 51, borderRadius: 13, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.04)', color: '#c4c4cc', padding: '0 16px', fontWeight: 800, cursor: 'pointer' }}>
              Use example
            </button>
          </div>
          {submitted && !brief ? <p role="alert" style={{ color: '#fda4af', margin: '13px 0 0', fontSize: '.86rem' }}>Add a concrete offer and audience first.</p> : null}
        </section>

        {brief ? (
          <section aria-live="polite" style={{ ...CARD, marginTop: 18, padding: 'clamp(19px, 4vw, 28px)', borderRadius: 22 }}>
            <p style={{ margin: 0, color: '#34d399', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase' }}>Client-ready output</p>
            <h2 style={{ margin: '8px 0 0', fontSize: 'clamp(1.45rem, 4vw, 2.15rem)' }}>{brief.title}</h2>
            <div style={{ display: 'grid', gap: 16, marginTop: 21 }}>
              <BriefBlock label="Objective" text={brief.objective} />
              <BriefBlock label="Audience" text={brief.audience} />
              <BriefBlock label="Hook direction" text={brief.hookDirection} />
              <div><BriefLabel>Story beats</BriefLabel><ol style={{ margin: '7px 0 0', paddingLeft: 22, color: '#d5d5dc', lineHeight: 1.68 }}>{brief.storyBeats.map((beat) => <li key={beat}>{beat}</li>)}</ol></div>
              <BriefBlock label="Visual direction" text={brief.visualDirection} />
              <BriefBlock label="Proof boundary" text={brief.proofBoundary} />
              <BriefBlock label="Call to action" text={brief.callToAction} />
              <div><BriefLabel>Approval checklist</BriefLabel><ul style={{ margin: '7px 0 0', paddingLeft: 22, color: '#d5d5dc', lineHeight: 1.68 }}>{brief.approvalChecklist.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={() => void copyBrief()} style={{ minHeight: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#f5f5f7', fontWeight: 900, cursor: 'pointer' }}>
                {copied ? 'Brief copied ✓' : 'Copy brief for the client'}
              </button>
              <Link href={activationHref} onClick={() => void trackEvent('client_short_brief_activation_clicked', { version: CLIENT_SHORT_BRIEF_CAMPAIGN, surface: 'client_video_brief_generator' })} style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: '#2997ff', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>
                Create this Short in Kineo →
              </Link>
            </div>
          </section>
        ) : null}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 13, marginTop: 28 }}>
          <article style={{ ...CARD, padding: 19, borderRadius: 17 }}><h2 style={{ margin: 0, fontSize: '1.03rem' }}>Made for approval, not decoration</h2><p style={{ color: '#96969f', fontSize: '.87rem', lineHeight: 1.62, margin: '8px 0 0' }}>The brief exposes missing proof and the exact CTA before a render or revision costs anyone time.</p></article>
          <article style={{ ...CARD, padding: 19, borderRadius: 17 }}><h2 style={{ margin: 0, fontSize: '1.03rem' }}>Need 10–50 client videos?</h2><p style={{ color: '#96969f', fontSize: '.87rem', lineHeight: 1.62, margin: '8px 0 11px' }}>Kineo also offers one-time Fast Short packs for agencies, freelancers and companies—without a recurring contract.</p><Link href={agencyPacksHref('client_brief')} onClick={() => void trackEvent('client_short_brief_packs_clicked', { version: CLIENT_SHORT_BRIEF_CAMPAIGN, surface: 'client_video_brief_generator' })} style={{ color: '#34d399', fontSize: '.86rem', fontWeight: 850, textDecoration: 'none' }}>See client-video packs →</Link></article>
        </section>
      </div>
    </main>
  )
}

function BriefLabel({ children }: { children: ReactNode }) {
  return <div style={{ color: '#a78bfa', fontSize: '.69rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase' }}>{children}</div>
}

function BriefBlock({ label, text }: { label: string; text: string }) {
  return <div><BriefLabel>{label}</BriefLabel><p style={{ color: '#d5d5dc', lineHeight: 1.65, margin: '6px 0 0' }}>{text}</p></div>
}
