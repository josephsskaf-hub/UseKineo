// KINEO-BACKLINK-ENGINE — /widget/embed: the iframe-friendly "Shorts Idea of
// the Day" card that creators embed on their site, blog or Notion page. Every
// embed is a followed link + referral traffic back to usekineo.com. Server
// component, zero client JS, deterministic pick (day-of-year % 30) so every
// visitor sees the same idea on the same day and the ISR cache (1h) can never
// show two different ideas in the same hour. Marketing page: /widget.
// Style matches app/facts/page.tsx: #000 page, #161618 card, #2a2a2d border,
// #2997ff accent. Do not add nav/footer here — it must stay clean inside a
// 360x200 iframe.

import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Shorts Idea of the Day — Kineo',
  description:
    'A fresh, ready-to-film YouTube Shorts idea every day. Free embeddable widget by Kineo, the AI Shorts generator.',
  robots: { index: false, follow: true },
}

// 30 hooks — finance, mystery, history, geography, motivation. Each one is a
// filmable opening line, not a vague topic. Rotates once per day, repeats
// monthly (day-of-year % 30), which is fine: nobody watches a widget 30 days
// in a row, and determinism beats novelty here.
const IDEAS: string[] = [
  'If you invested $100 in Apple the day the iPhone launched, here’s the exact number you’d have today — and the year it would have made you a millionaire.',
  'A plane vanished in 1937 and we’re still finding clues — the latest one was spotted on a sonar scan just a few years ago.',
  'Rome had a stock market crash in 33 AD — and the emperor’s bailout looks exactly like what the Fed did in 2008.',
  'There’s a country where the trains apologize for being 20 seconds early — and it explains their entire economy.',
  'The billionaire morning routine is a lie — here’s what 5 self-made billionaires actually do before 9 AM.',
  'Banks don’t want you to know the 50/30/20 rule has a fourth number — and it’s the one that makes people rich.',
  'In 1959, nine hikers fled their tent into -30°C darkness — barefoot. What made them run is still debated today.',
  'One man stopped World War 3 in 1983 by doing absolutely nothing — and he was punished for it.',
  'There’s a border in Europe you can cross 20 times in one dinner — the town is split house by house.',
  'Navy SEALs use a 4-second trick to kill panic instantly — you can learn it in one Short.',
  'Compound interest explained with a chessboard: double one grain of rice 64 times and you owe more rice than exists on Earth.',
  'A radio signal from space lasted 72 seconds in 1977 — we named it “Wow!” and it never came back.',
  'The shortest war in history lasted 38 minutes — and the losing side still had to pay for the ammunition.',
  'There’s a place on Earth where gravity is measurably weaker — you weigh less in Hudson Bay, and scientists know why.',
  'Kobe Bryant’s trainer revealed the 4 AM story everyone gets wrong — the real lesson isn’t about waking up early.',
  'The average millionaire has 7 income streams — here are the 3 you can start with a laptop this week.',
  'A ship was found sailing perfectly in 1872 — dinner on the table, crew gone forever. The Mary Celeste still has no answer.',
  'Napoleon was once attacked by thousands of rabbits — and lost. This actually happened in 1807.',
  'The deepest hole humans ever dug is sealed with a welded cap — the reason they stopped digging is stranger than any myth.',
  'Harvard tracked 724 men for 85 years to find what makes a good life — the answer wasn’t money or fame.',
  'Inflation is a hidden tax: here’s exactly how much $10,000 in cash quietly loses every single year it sits in your account.',
  'An entire village in France went mad in one week in 1951 — the CIA file about it was declassified decades later.',
  'Rich people buy assets, poor people buy liabilities — here’s the 60-second test that tells you which one anything is.',
  'The Sahara was green 6,000 years ago — lakes, hippos, cave paintings of swimmers — and it will flip green again.',
  'Cleopatra lived closer in time to the iPhone than to the pyramids being built — and that’s not even the wildest part.',
  'Your brain decides in 8 seconds whether to keep watching — here’s the psychology hack top creators use in every hook.',
  'A janitor at Frito-Lay invented a product that made billions — he ended up a vice president. Here’s the pitch that did it.',
  'There’s an island you can’t stand on tomorrow: cross the date line next to Diomede and you literally look into yesterday.',
  'Warren Buffett’s “2 list” rule: write 25 goals, circle 5, and what he says to do with the other 20 shocks everyone.',
  'The loudest sound in recorded history circled the Earth 4 times — people heard Krakatoa from 4,800 km away.',
]

function ideaOfTheDay(): { idea: string; index: number } {
  const now = new Date()
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dayOfYear = Math.floor((today - startOfYear) / 86400000)
  const index = dayOfYear % IDEAS.length
  return { idea: IDEAS[index], index }
}

const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function WidgetEmbedPage() {
  const { idea } = ideaOfTheDay()

  return (
    <main
      style={{
        background: '#000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 8,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          background: '#161618',
          border: '1px solid #2a2a2d',
          borderRadius: 14,
          padding: '16px 18px',
          maxWidth: 360,
          width: '100%',
          color: '#f5f5f7',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          💡 Shorts idea of the day
        </p>
        <p
          style={{
            fontSize: '0.92rem',
            lineHeight: 1.5,
            fontWeight: 600,
            margin: '0 0 12px',
          }}
        >
          {idea}
        </p>
        <a
          href="https://www.usekineo.com/?utm_source=widget&utm_medium=embed&utm_campaign=acq5"
          target="_blank"
          rel="noopener"
          style={{
            color: MUTED,
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Powered by <span style={{ color: ACCENT }}>Kineo →</span>
        </a>
      </div>
    </main>
  )
}
