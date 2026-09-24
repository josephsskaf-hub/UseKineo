// GPT-5H B: preserve the indexed URL; replace stale launch/ranking/trial claims.
import type { Metadata } from 'next'
import SoraReplacementTable from '@/components/SoraReplacementTable'
import { SORA_API_SHUTDOWN, SORA_API_SOURCE } from '@/lib/growth/soraMigrationFacts'
import { enginePaused } from '@/lib/engineLaunch'
import { TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'

export const dynamic = 'force-static'
const BASE = 'https://www.usekineo.com'
export const metadata: Metadata = {
  title: 'Omni Flash vs Sora — API Shutdown and Current Alternatives | Kineo',
  description: 'Sora 2 API shutdown on September 24, 2026. Omni Flash is paused on Kineo. Compare available Seedance 1.5, Kling 3 and Veo 3.1 workflows and current credit costs.',
  alternates: { canonical: `${BASE}/omni-flash-vs-sora` },
  openGraph: { title: 'Omni Flash vs Sora — current availability, not launch claims', url: `${BASE}/omni-flash-vs-sora`, type: 'article' },
}
export default function OmniVsSoraPage() {
  const paused = enginePaused('omni')
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'Did the Sora 2 API shut down?', acceptedAnswer: { '@type': 'Answer', text: `${SORA_API_SHUTDOWN} in the OpenAI API, according to its official deprecations schedule.` } },
      { '@type': 'Question', name: 'Can I use Omni Flash on Kineo today?', acceptedAnswer: { '@type': 'Answer', text: paused ? 'No. Omni Flash is paused for maintenance. Choose an available engine in Studio instead.' : 'Omni Flash is available in Studio, subject to plan access and sufficient credits.' } },
    ],
  }
  return <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif', lineHeight: 1.65 }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    <p style={{ color: '#aaaab4', fontSize: 12 }}>Kineo · Updated September 24, 2026</p>
    <h1 style={{ fontSize: 34, lineHeight: 1.15 }}>Omni Flash vs Sora: what can you actually use now?</h1>
    <p>{SORA_API_SHUTDOWN} in the OpenAI API. This is the shutdown date for the Videos API and Sora 2 models in <a href={SORA_API_SOURCE} style={{ color: '#71b8ff' }}>OpenAI’s official deprecations schedule</a>, not a claim that the consumer app closed today.</p>
    <aside style={{ border: '1px solid #766039', background: '#282316', borderRadius: 12, padding: 20 }}>
      <strong>{paused ? 'Omni Flash is paused on Kineo.' : 'Omni Flash is available in Studio.'}</strong>
      <p style={{ marginBottom: 0 }}>{paused ? 'Do not choose Kineo expecting to generate with Omni today. Its earlier launch page is not evidence of current availability. Seedance 1.5, Kling 3 and Veo 3.1 offer other paths for new films.' : 'Check the current plan and credit estimate before generating. This comparison is not a ranking guarantee.'}</p>
    </aside>
    <SoraReplacementTable />
    <h2 style={{ fontSize: 22 }}>A finished video, not just a replacement API</h2>
    <p style={{ color: '#c7c7cc' }}>Kineo Studio combines script, scenes, narration, captions and music. Review your text and settings before generating. It does not migrate a Sora project or guarantee the same result from another model.</p>
    <p style={{ color: '#c7c7cc' }}>The no-card trial has {TRIAL_CREDITS_SHOWN} credits for Kineo 1. It is not free access to every generative engine; Seedance, Kling and Veo require a paid plan and sufficient credits.</p>
    <p><a href="/sora-alternative" style={{ color: '#71b8ff' }}>Read the Sora migration guide →</a> · <a href="/examples" style={{ color: '#71b8ff' }}>Browse published video examples →</a></p>
  </main>
}
