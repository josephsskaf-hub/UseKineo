import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { CITATION_ANSWER_CSS } from '@/lib/ui/citationAnswerStyles'

const path = '/do-shorts-count-toward-4000-watch-hours'
const question = 'Do YouTube Shorts count toward 4,000 watch hours?'
const answer = 'No. Watch time from the Shorts Feed does not count toward the 4,000-hour route to YouTube Partner Program eligibility. A faceless channel follows the same rule.'
const canonical = `https://www.usekineo.com${path}`

export const metadata: Metadata = {
  title: question,
  description: answer,
  alternates: { canonical },
  openGraph: { title: question, description: answer, url: canonical, type: 'article' },
}

function CreatorsLink({ placement }: { placement: 'answer' | 'footer' }) {
  return (
    <OrganicCtaLink href="/for-creators" className="kc-cta" source={path}
      placement={placement} analyticsEvent="shorts_watch_hours_creators_clicked">
      Explore Kineo for creators
    </OrganicCtaLink>
  )
}

export default function ShortsWatchHoursPage() {
  return (
    <main className="kc-answer">
      <style dangerouslySetInnerHTML={{ __html: CITATION_ANSWER_CSS }} />
      <div className="kc-wrap">
        <nav className="kc-nav" aria-label="Main navigation">
          <Link className="kc-brand" href="/">Kineo</Link>
          <Link href="/how-much-do-youtube-shorts-pay">Shorts earnings guide</Link>
        </nav>
        <article>
          <header className="kc-hero">
            <h1>{question}</h1>
            <div className="kc-direct"><p>{answer}</p></div>
            <CreatorsLink placement="answer" />
            <p className="kc-source">
              <a href="https://support.google.com/youtube/answer/72851?hl=en">YouTube Help · Partner Program eligibility</a>
              {' · Checked '}<time dateTime="2026-11-17">November 17, 2026</time>
            </p>
          </header>
          <hr className="kc-divider" />
          <section className="kc-section">
            <h2>Choose a route, then measure it</h2>
            <p>For the full ad revenue threshold, YouTube lists 1,000 subscribers plus either 4,000 qualified public watch hours over 12 months, or 10 million qualified Shorts views over 90 days. After you reach the threshold and apply, YouTube reviews your channel. Approval is not guaranteed.</p>
          </section>
          <section className="kc-section">
            <h2>What to check in Studio</h2>
            <p>Open Earn and compare the eligibility counters with Analytics. Total watch time and the qualified watch-hours counter measure different things. Publishing more Shorts is not a way to fill the long-form watch-hours requirement.</p>
          </section>
          <section className="kc-section">
            <h2>For your faceless channel</h2>
            <p>Use Shorts to test original story ideas. If you choose the long-form route, create original long-form videos too. Kineo can prepare a narrated film from your idea or script; no tool guarantees audience growth or YPP acceptance.</p>
          </section>
          <CreatorsLink placement="footer" />
        </article>
      </div>
    </main>
  )
}
