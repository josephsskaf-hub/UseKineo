const CANONICAL_ORIGIN = 'https://www.usekineo.com'
const DAY_MS = 86_400_000
const ROTATION_ANCHOR_UTC_DAY = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS)

export const DAILY_SHORT_IDEAS_FEED_VERSION = 'daily_shorts_ideas_v1'
export const DAILY_SHORT_IDEAS_FEED_PATH = '/shorts-ideas.xml'
export const DAILY_SHORT_IDEAS_LANDING_PATH = '/free-script-generator'
export const DAILY_SHORT_IDEAS_FEED_ITEM_COUNT = 7
export const DAILY_SHORT_IDEAS_GATE = Object.freeze({
  observationDays: 7,
  minimumLandingSessions: 20,
  minimumExternalPeople: 20,
  minimumTerminalCheckoutPeople: 5,
})

export const DAILY_SHORT_IDEAS_MEASUREMENT_NOTE =
  'Feed downloads and landing_session_started are sessions, not people. A person enters the commercial cohort only after the exact feed source and campaign resolve to one external profile. Revenue requires payment_success for the same canonical Stripe Session as checkout_started.'

// One source for the existing widget and the passive RSS feed. Keep each entry
// filmable: a concrete opening line is useful; a vague category is not.
export const DAILY_SHORT_IDEAS = Object.freeze([
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
] as const)

export type DailyShortIdea = {
  date: string
  idea: string
  index: number
  publishedAt: Date
}

function startOfUtcDay(value: Date): Date {
  if (Number.isNaN(value.getTime())) throw new Error('valid date is required')
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function dailyShortIdeaForDate(value: Date = new Date()): DailyShortIdea {
  const publishedAt = startOfUtcDay(value)
  // Anchor preserves every 2026 widget result byte-for-byte while keeping the
  // rotation continuous across Dec 31 -> Jan 1 in later years.
  const daysSinceAnchor = Math.floor(publishedAt.getTime() / DAY_MS) - ROTATION_ANCHOR_UTC_DAY
  const index = ((daysSinceAnchor + 1) % DAILY_SHORT_IDEAS.length + DAILY_SHORT_IDEAS.length) % DAILY_SHORT_IDEAS.length
  return { date: isoDate(publishedAt), idea: DAILY_SHORT_IDEAS[index], index, publishedAt }
}

export function recentDailyShortIdeas(
  value: Date = new Date(),
  count: number = DAILY_SHORT_IDEAS_FEED_ITEM_COUNT,
): DailyShortIdea[] {
  if (!Number.isInteger(count) || count < 1 || count > DAILY_SHORT_IDEAS.length) {
    throw new Error('count must be an integer within the idea inventory')
  }
  const today = startOfUtcDay(value)
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(today)
    day.setUTCDate(today.getUTCDate() - offset)
    return dailyShortIdeaForDate(day)
  })
}

export function buildDailyShortIdeaLandingUrl(item: DailyShortIdea): string {
  const url = new URL(DAILY_SHORT_IDEAS_LANDING_PATH, CANONICAL_ORIGIN)
  url.searchParams.set('topic', item.idea)
  url.searchParams.set('utm_source', 'kineo_daily_feed')
  url.searchParams.set('utm_medium', 'rss')
  url.searchParams.set('utm_campaign', DAILY_SHORT_IDEAS_FEED_VERSION)
  url.searchParams.set('utm_content', item.date)
  return url.toString()
}

export function escapeRssXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildDailyShortIdeasRss(
  value: Date = new Date(),
  count: number = DAILY_SHORT_IDEAS_FEED_ITEM_COUNT,
): string {
  const items = recentDailyShortIdeas(value, count)
  const selfUrl = new URL(DAILY_SHORT_IDEAS_FEED_PATH, CANONICAL_ORIGIN).toString()
  const itemXml = items.map((item) => {
    const landingUrl = buildDailyShortIdeaLandingUrl(item)
    return `    <item>
      <title>${escapeRssXml(`Shorts idea for ${item.date}`)}</title>
      <description>${escapeRssXml(`Research prompt — verify every factual claim before publishing: ${item.idea}`)}</description>
      <link>${escapeRssXml(landingUrl)}</link>
      <guid isPermaLink="false">${escapeRssXml(`${DAILY_SHORT_IDEAS_FEED_VERSION}:${item.date}`)}</guid>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kineo Shorts Idea of the Day</title>
    <link>${CANONICAL_ORIGIN}/youtube-shorts-from-topic</link>
    <description>One concrete YouTube Shorts research prompt every day. Verify every factual claim before publishing.</description>
    <language>en-us</language>
    <lastBuildDate>${items[0].publishedAt.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeRssXml(selfUrl)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`
}
