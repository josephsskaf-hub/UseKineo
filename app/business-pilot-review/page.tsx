import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import BusinessPilotReviewClient from './BusinessPilotReviewClient'

const BASE = 'https://www.usekineo.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Free AI Video Pilot Decision Note for Teams | Kineo',
  description: 'Build a factual internal note to evaluate Kineo for a brand or client workflow. Free, no signup, no email and no card.',
  alternates: { canonical: BASE + '/business-pilot-review' },
  openGraph: {
    title: 'Should your team evaluate Kineo? Build the internal note.',
    description: 'A short, factual handoff for the person who approves an AI video pilot.',
    url: BASE + '/business-pilot-review',
    type: 'website',
  },
}

const CSS = `
.bpr-page{min-height:100vh;background:radial-gradient(circle at 85% 0,rgba(41,151,255,.17),transparent 34%),#05070b;color:#f5f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bpr-shell{width:min(920px,calc(100% - 36px));margin:0 auto;padding:26px 0 74px}.bpr-nav{display:flex;justify-content:space-between;align-items:center;gap:18px}.bpr-logo{color:#2997ff;font-size:1.08rem;font-weight:900;text-decoration:none}.bpr-tools{color:#cbd5e1;font-size:.86rem;font-weight:750;text-decoration:none}
.bpr-hero{margin:78px 0 36px;max-width:820px}.bpr-kicker,.bpr-step{color:#5cb3ff;font-size:.72rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.bpr-hero h1{margin:15px 0 0;font-size:clamp(2.45rem,7vw,5.1rem);line-height:.99;letter-spacing:-.058em}.bpr-hero>p:last-child{max-width:720px;margin:20px 0 0;color:#aeb8c6;font-size:1.08rem;line-height:1.65}
.bpr-client{display:grid;gap:18px}.bpr-builder,.bpr-note{border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(145deg,rgba(15,22,36,.98),rgba(7,10,16,.98));padding:28px}.bpr-builder h2,.bpr-note h2{margin:9px 0 0;font-size:clamp(1.5rem,3vw,2.15rem);letter-spacing:-.035em}.bpr-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:24px}.bpr-fields label{color:#aeb8c6;font-size:.76rem;font-weight:800}.bpr-fields select{width:100%;margin-top:7px;padding:13px 12px;border:1px solid #2b3547;border-radius:11px;background:#0d121d;color:#eef3fb;font:inherit;font-size:.88rem}.bpr-privacy{margin:14px 0;color:#7f8a9b;font-size:.78rem;line-height:1.5}.bpr-build,.bpr-actions button{border:0;border-radius:11px;background:#2997ff;color:#001326;padding:13px 17px;font-weight:900;cursor:pointer}.bpr-note pre{margin:22px 0 0;padding:22px;border:1px solid #263044;border-radius:16px;background:#0a0e16;color:#d8e0ec;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.82rem;line-height:1.62}.bpr-actions{display:flex;align-items:center;gap:12px;margin-top:17px}.bpr-actions a{border:1px solid #3a4b66;border-radius:11px;color:#dcebff;padding:12px 16px;font-weight:850;text-decoration:none}.bpr-status{display:block;min-height:20px;margin-top:10px;color:#b9c9df;font-size:.78rem}.bpr-manual{display:block;margin-top:12px;color:#aeb8c6;font-size:.78rem;font-weight:800}.bpr-manual textarea{box-sizing:border-box;width:100%;margin-top:7px;padding:13px;border:1px solid #2b3547;border-radius:11px;background:#090d14;color:#eef3fb;line-height:1.5}.bpr-disclaimer{margin:16px 0 0;color:#7f8a9b;font-size:.74rem;line-height:1.5}.bpr-decision,.bpr-response{margin-top:20px;padding-top:20px;border-top:1px solid #273044}.bpr-decision h3,.bpr-response h3{margin:8px 0 0;font-size:1.15rem}.bpr-decision-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px}.bpr-decision-options button{border:1px solid #34445e;border-radius:10px;background:#0c121d;color:#dce7f7;padding:11px;font-weight:800;cursor:pointer}.bpr-decision-options button[aria-pressed="true"]{border-color:#2997ff;background:#12294a}.bpr-references{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}.bpr-references a{color:#8fc8ff;font-size:.78rem}.bpr-note h2:focus{outline:3px solid #fff;outline-offset:5px}
.bpr-response h3:focus{outline:3px solid #fff;outline-offset:5px}
.bpr-logo:focus-visible,.bpr-tools:focus-visible,.bpr-build:focus-visible,.bpr-actions button:focus-visible,.bpr-actions a:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #fff;outline-offset:3px}
@media(max-width:720px){.bpr-shell{width:min(100% - 28px,920px);padding-bottom:48px}.bpr-hero{margin:55px 0 28px}.bpr-builder,.bpr-note{padding:21px}.bpr-fields,.bpr-decision-options{grid-template-columns:1fr}.bpr-actions{align-items:stretch;flex-direction:column}.bpr-actions button,.bpr-actions a{text-align:center}.bpr-note pre{padding:16px;font-size:.74rem}}
`

export default function BusinessPilotReviewPage() {
  return (
    <main className="bpr-page">
      <div className="bpr-shell">
        <nav className="bpr-nav" aria-label="Primary">
          <Link className="bpr-logo" href="/">Kineo</Link>
          <Link className="bpr-tools" href="/tools">Free tools →</Link>
        </nav>
        <header className="bpr-hero">
          <p className="bpr-kicker">Free · no signup · no email · no card</p>
          <h1>Give the internal reviewer a clear choice, not another sales page.</h1>
          <p>Frame a limited Kineo evaluation for your brand or client workflow. The note names what to test, who should review it and where the self-service product stops.</p>
        </header>
        <BusinessPilotReviewClient />
      </div>
      <Footer showStats={false} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </main>
  )
}
