import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ScriptTimerClient from './ScriptTimerClient'

const BASE = 'https://www.usekineo.com'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'YouTube Shorts Script Timer & Word Counter — Free | Kineo',
  description:
    'Paste a YouTube Shorts script to estimate spoken duration, see the exact word gap for 35 or 60 seconds, and ignore production directions. Free, browser-based and no signup.',
  alternates: { canonical: `${BASE}/youtube-shorts-script-timer` },
  openGraph: {
    title: 'Free YouTube Shorts Script Timer',
    description: 'See whether your actual narration fills 35 or 60 seconds before you generate a video.',
    url: `${BASE}/youtube-shorts-script-timer`,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo YouTube Shorts script timer' }],
  },
}

const FAQ = [
  {
    q: 'How many words fit in a 60-second YouTube Short?',
    a: 'At the Kineo planning rate of 2.3 spoken words per second, 60 seconds is about 138 words. The tool treats 132 words as the safe minimum because brief natural pauses still belong in the finished video.',
  },
  {
    q: 'Does the timer count HOOK, PAYOFF or visual directions?',
    a: 'No. It uses Kineo’s narration parser to remove structural headings, metadata and bracketed directions such as [Pexels: ocean]. The result is based on what the voice should actually say, not every word in the document.',
  },
  {
    q: 'Is this an exact audio measurement?',
    a: 'No. It is a planning estimate. The selected voice, punctuation, emphasis and delivery can change the final measured audio length.',
  },
  {
    q: 'How long can a YouTube Short be?',
    a: 'YouTube currently classifies square or vertical uploads of up to three minutes as Shorts. This calculator focuses on Kineo’s 35- and 60-second production slots.',
  },
] as const

const PAGE_CSS = `
  .timer-page{min-height:100vh;background:#000;color:#f5f5f7;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .timer-shell{width:min(1120px,calc(100% - 36px));margin:0 auto;padding:26px 0 76px}
  .timer-nav{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .timer-logo{color:#2997ff;font-size:1.08rem;font-weight:900;text-decoration:none}
  .timer-all{color:#aeb8c6;font-size:.84rem;font-weight:750;text-decoration:none}
  .timer-hero{max-width:880px;margin:72px auto 34px;text-align:center}
  .timer-eyebrow{margin:0;color:#5cb3ff;font-size:.7rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
  .timer-hero h1{margin:15px 0 0;font-size:clamp(2.2rem,7vw,4.8rem);line-height:.98;letter-spacing:-.057em}
  .timer-hero>p:not(.timer-eyebrow){max-width:730px;margin:19px auto 0;color:#aeb8c6;font-size:clamp(1rem,2vw,1.14rem);line-height:1.62}
  .timer-tool{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:16px;align-items:start}
  .timer-editor,.timer-result{border:1px solid rgba(255,255,255,.1);border-radius:22px;background:linear-gradient(145deg,rgba(14,20,34,.98),rgba(5,8,15,.98));padding:24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
  .timer-editor-head,.timer-target-row{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .timer-editor-head label{font-size:.88rem;font-weight:850}
  .timer-editor-head span{color:#6f7b8c;font-size:.72rem}
  .timer-editor textarea{width:100%;box-sizing:border-box;margin-top:10px;resize:vertical;min-height:286px;border:1px solid #303746;border-radius:13px;background:#05070b;color:#f5f5f7;padding:14px;font:inherit;font-size:16px;line-height:1.55;outline:none}
  .timer-editor textarea:focus{border-color:#2997ff;box-shadow:0 0 0 3px rgba(41,151,255,.13)}
  .timer-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px}
  .timer-actions button{border:0;background:transparent;color:#7cc0ff;padding:5px 0;font-size:.76rem;font-weight:800;cursor:pointer}
  .timer-privacy,.timer-caveat{margin:13px 0 0;color:#6f7b8c;font-size:.72rem;line-height:1.5}
  .timer-target-row h2{margin:7px 0 0;font-size:1.15rem}
  .timer-targets{display:flex;gap:7px}
  .timer-targets button{min-width:57px;border:1px solid #303746;border-radius:10px;background:#070a0f;color:#aeb8c6;padding:10px;font-weight:900;cursor:pointer}
  .timer-targets button.is-active{border-color:#2997ff;background:rgba(41,151,255,.12);color:#fff}
  .timer-empty{display:grid;place-items:center;min-height:280px;text-align:center;color:#737e8e}
  .timer-empty p{max-width:330px;margin:10px auto 0;line-height:1.55;font-size:.86rem}
  .timer-clock{font-variant-numeric:tabular-nums;font-size:clamp(2.6rem,6vw,4.5rem);line-height:1;font-weight:950;letter-spacing:-.06em;color:#fff}
  .timer-verdict{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;margin-top:24px;padding:19px;border:1px solid #26303d;border-radius:16px;background:#070a0f}
  .timer-verdict h3{margin:6px 0 0;font-size:1.15rem}
  .timer-verdict p:not(.timer-eyebrow){margin:7px 0 0;color:#94a3b8;font-size:.8rem;line-height:1.5}
  .timer-verdict-ready{border-color:rgba(52,211,153,.35);background:rgba(16,185,129,.06)}
  .timer-verdict-warning{border-color:rgba(245,158,11,.38);background:rgba(245,158,11,.06)}
  .timer-verdict-long{border-color:rgba(124,192,255,.35);background:rgba(41,151,255,.06)}
  .timer-progress{height:7px;margin-top:14px;border-radius:99px;background:#171d27;overflow:hidden}
  .timer-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2997ff,#34d399);transition:width .2s ease}
  .timer-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
  .timer-metrics article{padding:13px 10px;border:1px solid #252c37;border-radius:11px;background:#070a0f;text-align:center}
  .timer-metrics strong{display:block;font-size:1.08rem;font-variant-numeric:tabular-nums}
  .timer-metrics span{display:block;margin-top:4px;color:#737e8e;font-size:.63rem;line-height:1.25}
  .timer-spoken{margin-top:12px;border:1px solid #252c37;border-radius:12px;background:#070a0f;padding:12px 14px}
  .timer-spoken summary{cursor:pointer;color:#9ecfff;font-size:.76rem;font-weight:850}
  .timer-spoken p{margin:11px 0 0;color:#aeb8c6;font-size:.78rem;line-height:1.55;max-height:150px;overflow:auto}
  .timer-next{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:14px;padding:17px;border:1px solid rgba(41,151,255,.28);border-radius:14px;background:rgba(41,151,255,.07)}
  .timer-next h3{margin:5px 0 0;font-size:1rem}
  .timer-next p:not(.timer-eyebrow){margin:6px 0 0;color:#8f9aaa;font-size:.75rem;line-height:1.45}
  .timer-next>a{flex:none;max-width:175px;border-radius:10px;background:#2997ff;color:#000;padding:11px 13px;font-size:.76rem;font-weight:900;text-decoration:none;text-align:center}
  .timer-method,.timer-faq{margin-top:42px}
  .timer-method{display:grid;grid-template-columns:.85fr 1.15fr;gap:30px;padding:28px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:#070a0f}
  .timer-method h2,.timer-faq h2{margin:9px 0 0;font-size:clamp(1.45rem,3vw,2.15rem);letter-spacing:-.035em}
  .timer-method p:not(.timer-eyebrow){margin:0;color:#9aa5b4;line-height:1.65}
  .timer-faq article{border-top:1px solid #232934;padding:16px 0}
  .timer-faq article:first-of-type{margin-top:14px}
  .timer-faq h3{margin:0;font-size:.95rem}
  .timer-faq article p{margin:7px 0 0;color:#8f9aaa;font-size:.87rem;line-height:1.58}
  .timer-source{margin:13px 0 0;color:#6f7b8c;font-size:.72rem}.timer-source a{color:#7cc0ff}
  .timer-logo:focus-visible,.timer-all:focus-visible,button:focus-visible,.timer-next>a:focus-visible,summary:focus-visible{outline:3px solid #fff;outline-offset:3px}
  @media(max-width:820px){.timer-tool,.timer-method{grid-template-columns:1fr}.timer-metrics{grid-template-columns:1fr 1fr}}
  @media(max-width:560px){.timer-shell{width:min(100% - 28px,1120px);padding-bottom:50px}.timer-hero{margin:52px auto 28px;text-align:left}.timer-editor,.timer-result{padding:19px}.timer-target-row,.timer-next{align-items:flex-start;flex-direction:column}.timer-next>a{max-width:none;width:100%;box-sizing:border-box}.timer-verdict{grid-template-columns:1fr}.timer-editor textarea{min-height:250px}.timer-method{padding:21px}}
`

export default function YouTubeShortsScriptTimerPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kineo YouTube Shorts Script Timer',
    url: `${BASE}/youtube-shorts-script-timer`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A browser-based timer for estimating the spoken duration of a YouTube Shorts script.',
  }

  return (
    <main className="timer-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <div className="timer-shell">
        <nav className="timer-nav" aria-label="Primary">
          <Link href="/" className="timer-logo">Kineo</Link>
          <Link href="/tools" className="timer-all">All free tools →</Link>
        </nav>

        <header className="timer-hero">
          <p className="timer-eyebrow">Free script timer · no signup</p>
          <h1>Will your script actually fill the Short?</h1>
          <p>Paste the complete draft. This timer counts the narration viewers will hear — not HOOK labels, visual prompts or editing notes — and shows the exact word gap before you generate.</p>
        </header>

        <ScriptTimerClient />

        <section className="timer-method" aria-labelledby="timer-method-title">
          <div>
            <p className="timer-eyebrow">Why this timer is different</p>
            <h2 id="timer-method-title">It reads a production script like a voiceover engine.</h2>
          </div>
          <p>Most word counters divide every word on the page by a generic speaking speed. This one first removes structural labels, bracketed shot directions and production metadata with the same narration parser Kineo uses for verbatim scripts. The estimate is still a plan, not an audio measurement — but it is based on the words that are meant to be spoken.</p>
        </section>

        <section className="timer-faq" aria-labelledby="timer-faq-title">
          <h2 id="timer-faq-title">Script timing, answered plainly</h2>
          {FAQ.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
          <p className="timer-source">Platform duration source: <a href="https://support.google.com/youtube/answer/15424877?hl=en" rel="noreferrer">YouTube Help — three-minute Shorts</a>, checked August 28, 2026.</p>
        </section>
      </div>
      <Footer showStats={false} />
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
