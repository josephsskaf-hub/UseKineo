import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import PublishKitClient from './PublishKitClient'

const BASE = 'https://www.usekineo.com'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Free YouTube Shorts Title & Hashtag Generator — No Signup | Kineo',
  description:
    'Enter one topic and get 10 YouTube Shorts titles, a ready-to-edit description and focused hashtags. Free, no signup, no upload and no API call.',
  alternates: { canonical: `${BASE}/youtube-shorts-title-generator` },
  openGraph: {
    title: 'Free YouTube Shorts Title & Hashtag Generator',
    description: 'Turn one topic into 10 titles, a description and focused hashtags. It runs in your browser with no signup.',
    url: `${BASE}/youtube-shorts-title-generator`,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo YouTube Shorts publishing kit' }],
  },
}

const FAQ = [
  {
    q: 'Is the YouTube Shorts title generator free?',
    a: 'Yes. It runs in your browser and does not require an account, email, card, upload or API call.',
  },
  {
    q: 'Does it guarantee that a Short will go viral?',
    a: 'No. A title can clarify the promise and earn attention, but distribution still depends on the video, viewer response and platform systems. Use only titles supported by the content.',
  },
  {
    q: 'How many hashtags should I use?',
    a: 'The tool returns up to 10 focused tags: topic terms, relevant niche tags and platform tags. More tags are not automatically better, so delete anything that does not precisely describe the Short.',
  },
  {
    q: 'Can I use the result on TikTok too?',
    a: 'Yes. Choose TikTok or Both before generating; the publishing kit changes the platform tags and follow language while keeping the topic-specific title ideas.',
  },
] as const

const PAGE_CSS = `
  .publish-page{min-height:100vh;background:#000;color:#f5f5f7;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .publish-shell{width:min(920px,calc(100% - 36px));margin:0 auto;padding:26px 0 76px}
  .publish-nav{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .publish-logo{color:#2997ff;font-size:1.08rem;font-weight:900;text-decoration:none}
  .publish-all{color:#aeb8c6;font-size:.84rem;font-weight:750;text-decoration:none}
  .publish-hero{max-width:790px;margin:72px auto 30px;text-align:center}
  .publish-eyebrow{margin:0;color:#5cb3ff;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
  .publish-hero h1{margin:15px 0 0;font-size:clamp(2.15rem,7vw,4.65rem);line-height:1;letter-spacing:-.055em}
  .publish-hero>p:not(.publish-eyebrow){max-width:680px;margin:18px auto 0;color:#aeb8c6;font-size:clamp(1rem,2vw,1.14rem);line-height:1.62}
  .publish-form,.publish-results{border:1px solid rgba(255,255,255,.1);border-radius:22px;background:linear-gradient(145deg,rgba(14,20,34,.98),rgba(5,8,15,.98));padding:25px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
  .publish-form label{display:block;color:#f5f5f7;font-size:.82rem;font-weight:850;margin:0 0 8px}
  .publish-form label span{color:#737e8e;font-weight:650}
  .publish-form textarea,.publish-form input,.publish-form select,.publish-output-card textarea{width:100%;box-sizing:border-box;border:1px solid #303746;border-radius:12px;background:#05070b;color:#f5f5f7;padding:13px 14px;font:inherit;font-size:16px;line-height:1.45;outline:none}
  .publish-form textarea:focus,.publish-form input:focus,.publish-form select:focus,.publish-output-card textarea:focus{border-color:#2997ff;box-shadow:0 0 0 3px rgba(41,151,255,.13)}
  .publish-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}
  .publish-form>button[type="submit"]{width:100%;margin-top:16px;border:0;border-radius:12px;background:#2997ff;color:#000;padding:14px 18px;font-size:1rem;font-weight:900;cursor:pointer}
  .publish-examples{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
  .publish-examples button{border:1px solid #2d3440;border-radius:999px;background:rgba(255,255,255,.035);color:#aeb8c6;padding:7px 11px;font-size:.75rem;cursor:pointer}
  .publish-privacy{margin:13px 0 0;color:#6f7b8c;font-size:.75rem;text-align:center}
  .publish-results{margin-top:18px}
  .publish-result-head,.publish-section-title,.publish-next{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .publish-result-head h2{margin:6px 0 0;font-size:clamp(1.5rem,4vw,2.25rem);letter-spacing:-.035em}
  .publish-result-head>button,.publish-output-card>button{border:1px solid #34506f;border-radius:10px;background:rgba(41,151,255,.1);color:#7cc0ff;padding:10px 13px;font-weight:850;cursor:pointer}
  .publish-section{margin-top:26px}
  .publish-section-title h3{margin:0;font-size:1rem}
  .publish-section-title span{color:#6f7b8c;font-size:.72rem}
  .publish-title-list{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}
  .publish-title-list button{display:flex;align-items:flex-start;gap:10px;text-align:left;border:1px solid #29313d;border-radius:12px;background:#070a0f;color:#cbd5e1;padding:12px;line-height:1.4;cursor:pointer}
  .publish-title-list button span{flex:none;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;background:#111a28;color:#5cb3ff;font-size:.7rem;font-weight:900}
  .publish-title-list button.is-selected{border-color:#2997ff;background:rgba(41,151,255,.09);color:#fff}
  .publish-output-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
  .publish-output-card{border:1px solid #29313d;border-radius:15px;background:#070a0f;padding:16px}
  .publish-output-card textarea{margin-top:11px;resize:none;color:#cbd5e1}
  .publish-output-card>button{width:100%;margin-top:9px}
  .publish-honesty{margin:18px 0 0;padding:12px 14px;border-left:3px solid #f59e0b;background:rgba(245,158,11,.07);color:#b9c2ce;font-size:.8rem;line-height:1.55}
  .publish-next{margin-top:18px;padding:20px;border-radius:15px;border:1px solid rgba(41,151,255,.27);background:rgba(41,151,255,.07)}
  .publish-next h3{margin:6px 0 0;font-size:1.15rem}
  .publish-next p:not(.publish-eyebrow){max-width:600px;margin:7px 0 0;color:#94a3b8;font-size:.82rem;line-height:1.5}
  .publish-next-actions{flex:none;display:grid;gap:9px;width:min(270px,100%)}
  .publish-create-cta{border-radius:11px;background:#2997ff;color:#000;padding:12px 15px;font-size:.82rem;font-weight:900;text-decoration:none;text-align:center}
  .publish-business-path{display:grid;gap:5px;border:1px solid rgba(52,211,153,.3);border-radius:11px;background:rgba(52,211,153,.06);padding:10px 12px}
  .publish-business-path span{color:#91a0b2;font-size:.7rem;line-height:1.35}
  .publish-business-path a{color:#6ee7b7;font-size:.78rem;font-weight:850;line-height:1.35;text-decoration:none}
  .publish-faq{margin-top:38px}
  .publish-faq h2{font-size:1.45rem;margin:0 0 13px}
  .publish-faq article{border-top:1px solid #232934;padding:15px 0}
  .publish-faq h3{margin:0;font-size:.95rem}
  .publish-faq p{margin:6px 0 0;color:#8f9aaa;font-size:.87rem;line-height:1.58}
  .publish-logo:focus-visible,.publish-all:focus-visible,button:focus-visible,.publish-next a:focus-visible{outline:3px solid #fff;outline-offset:3px}
  @media(max-width:700px){.publish-shell{width:min(100% - 28px,920px);padding-bottom:50px}.publish-hero{margin:52px auto 26px;text-align:left}.publish-form,.publish-results{padding:20px}.publish-row,.publish-title-list,.publish-output-grid{grid-template-columns:1fr}.publish-result-head,.publish-next{align-items:flex-start;flex-direction:column}.publish-result-head>button,.publish-next-actions{width:100%;box-sizing:border-box}.publish-privacy{text-align:left}}
`

export default function YouTubeShortsTitleGeneratorPage() {
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
    name: 'Kineo YouTube Shorts Publishing Kit',
    url: `${BASE}/youtube-shorts-title-generator`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A browser-only generator for YouTube Shorts titles, descriptions and hashtags.',
  }

  return (
    <main className="publish-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <div className="publish-shell">
        <nav className="publish-nav" aria-label="Primary">
          <Link href="/" className="publish-logo">Kineo</Link>
          <Link href="/tools" className="publish-all">All free tools →</Link>
        </nav>

        <header className="publish-hero">
          <p className="publish-eyebrow">Free publishing tool · no signup</p>
          <h1>YouTube Shorts titles, description and hashtags — from one topic.</h1>
          <p>Pick an angle before you post. Get 10 concise title options, one editable description and up to 10 focused hashtags without uploading a video or opening an account.</p>
        </header>

        <PublishKitClient />

        <section className="publish-faq" aria-labelledby="publish-faq-title">
          <h2 id="publish-faq-title">Questions, answered honestly</h2>
          {FAQ.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </section>
      </div>
      <Footer />
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
