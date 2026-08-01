// KINEO-DEMO-NEVER-DIES (31/07/2026, sprint 21h) — static fallback bank for the
// PUBLIC landing demo and the free hook generator.
//
// Why this exists: during the 31/07 OpenAI quota blackout the product was down
// ALL DAY while the TAAFT wave delivered a signup record (68/24h). Logged-in
// victims get the honest 503 + win-back email — but the anonymous landing
// visitor's demo ALSO runs on OpenAI, so their very first impression became a
// capacity error and they bounced without leaving a trace.
//
// Fix: when (and only when) OpenAI is quota-dead, the demo endpoints serve a
// curated script/hook set from this bank, matched to the visitor's topic by
// vertical keywords. The founder still gets paged (alert stays), the RENDER
// path stays honest — but the "feel the magic" moment on the landing never
// 503s again. Worst case the visitor gets a banger script slightly adjacent
// to their topic, which beats an error screen every time.
//
// These scripts follow the exact live demo format (HOOK / FACT 1 / FACT 2 /
// FACT 3 / PAYOFF) and the house style: US audience, concrete numbers,
// curiosity gap, payoff withheld until the end.

interface FallbackEntry {
  keywords: string[]
  script: string
  hooks: string[]
}

const BANK: FallbackEntry[] = [
  {
    // Billionaire mindset & money habits
    keywords: [
      'billionaire', 'millionaire', 'rich', 'wealth', 'money', 'musk', 'bezos',
      'buffett', 'gates', 'zuckerberg', 'ceo', 'founder', 'startup', 'business',
      'entrepreneur', 'habits', 'success',
    ],
    script: `HOOK: Warren Buffett still lives in a house he bought for $31,500.
FACT 1: He purchased it in Omaha in 1958 — it's worth less than 0.001% of his net worth today.
FACT 2: He spends under $4 on breakfast at McDonald's, choosing items by how the market did the day before.
FACT 3: 99% of his entire fortune was earned after his 50th birthday, almost all of it from compounding, not salary.
PAYOFF: The habit billionaires guard hardest isn't earning... it's refusing to upgrade their lifestyle while their money compounds.`,
    hooks: [
      'Warren Buffett eats a $4 breakfast every single morning',
      'This billionaire habit costs nothing and beats any salary',
      'The rich buy time — everyone else buys things',
      "99% of Buffett's fortune came after he turned 50",
      'Your lifestyle upgrade is why you stay broke',
    ],
  },
  {
    // Mysteries & weird history
    keywords: [
      'mystery', 'mysterious', 'history', 'ancient', 'secret', 'lost', 'unsolved',
      'disappear', 'egypt', 'rome', 'pyramid', 'war', 'empire', 'legend', 'creepy',
      'weird', 'strange',
    ],
    script: `HOOK: In 1518, an entire city started dancing — and couldn't stop.
FACT 1: It began in Strasbourg when one woman, Frau Troffea, danced alone in the street for six straight days.
FACT 2: Within a month around 400 people had joined, and city officials prescribed MORE dancing, hiring musicians.
FACT 3: Contemporary records say some dancers collapsed from exhaustion — modern historians still debate ergot poisoning versus mass hysteria.
PAYOFF: Five hundred years later, the Dancing Plague of 1518 remains officially... unexplained.`,
    hooks: [
      'In 1518 an entire city danced itself to death',
      'History teachers skip this because no one can explain it',
      'This medieval mystery is still officially unsolved',
      'One woman started dancing — 400 people could not stop',
      'The creepiest plague in history had no disease',
    ],
  },
  {
    // Countries & places
    keywords: [
      'country', 'countries', 'city', 'geography', 'mountain', 'ocean', 'island',
      'japan', 'china', 'usa', 'america', 'africa', 'europe', 'brazil', 'india',
      'russia', 'travel', 'place', 'border', 'capital', 'norway', 'switzerland',
    ],
    script: `HOOK: There's a country where the government pays you to live.
FACT 1: Some villages in Switzerland and Italy have offered newcomers up to $70,000 to move in and stay ten years.
FACT 2: Japan has over 8 million abandoned homes — some towns hand them out nearly free to anyone who'll renovate.
FACT 3: Alaska pays every resident an annual oil dividend — families of five have collected over $15,000 in a single year.
PAYOFF: The catch? Most of these places are emptying out because everyone left for cities... that now pay the highest rents on Earth.`,
    hooks: [
      'This country will pay you $70,000 just to move there',
      'Japan is giving away 8 million homes almost free',
      'Alaska pays you every year just for living there',
      'The strangest border on Earth cuts through a living room',
      'Five countries will pay you to move in 2026',
    ],
  },
  {
    // Finance lessons
    keywords: [
      'invest', 'investing', 'stock', 'stocks', 'compound', 'interest', 'saving',
      'savings', 'debt', 'credit', 'bank', 'finance', 'financial', 'retire',
      'retirement', 'inflation', 'crypto', 'bitcoin', 'salary', 'income', 'budget',
    ],
    script: `HOOK: A janitor died with $8 million — and no one saw it coming.
FACT 1: Ronald Read pumped gas and swept floors in Vermont his entire life, never earning more than a modest wage.
FACT 2: He bought dividend stocks and held them for decades — his portfolio had 95 companies when he died in 2014.
FACT 3: His secret wasn't picking winners: it was never selling, letting dividends reinvest for over 50 years.
PAYOFF: The market didn't make Ronald Read rich... time did. He just refused to interrupt it.`,
    hooks: [
      'A janitor secretly died with $8 million in stocks',
      'Compound interest is the only free lunch in finance',
      'The 50-year-old trick banks hope you never learn',
      'He never earned six figures — he died a millionaire',
      'Your savings account is quietly robbing you',
    ],
  },
  {
    // Learning / mental models / psychology
    keywords: [
      'learn', 'learning', 'brain', 'psychology', 'mental', 'model', 'memory',
      'focus', 'habit', 'productivity', 'science', 'study', 'mind', 'trick',
      'iq', 'smart', 'genius',
    ],
    script: `HOOK: Your brain deletes most of what you learn within 24 hours.
FACT 1: Hermann Ebbinghaus mapped the "forgetting curve" in 1885 — you lose roughly 70% of new information in one day.
FACT 2: One five-minute review the next day can nearly flatten that curve, a technique called spaced repetition.
FACT 3: Medical students use spaced-repetition apps to memorize over 20,000 facts for board exams.
PAYOFF: The difference between forgetting and mastery isn't talent... it's a five-minute review, timed exactly right.`,
    hooks: [
      'Your brain deletes 70% of today by tomorrow',
      'The 1885 memory trick med students still swear by',
      'Five minutes tomorrow beats five hours today',
      'Scientists found the exact moment you forget everything',
      'This is why you forget names in 8 seconds',
    ],
  },
]

// Generic banger used when no vertical matches the topic.
const GENERIC: FallbackEntry = {
  keywords: [],
  script: `HOOK: The most searched question on Google has no answer.
FACT 1: Google processes about 8.5 billion searches a day — 15% of them have never been typed before.
FACT 2: The average person makes 3 to 4 searches daily, but the record holder is a bot that made 40 million.
FACT 3: Google's original name was "Backrub" — it ran on Lego-built server racks at Stanford in 1996.
PAYOFF: The question with no answer? "Why?"... the single most searched word on Earth.`,
  hooks: [
    'The most Googled question on Earth has no answer',
    "You won't believe what Google was almost named",
    '15% of today\'s Google searches have never existed before',
    'One bot made 40 million searches — and broke a record',
    'The single most searched word on Earth is "why"',
  ],
}

function pickEntry(topic: string): FallbackEntry {
  const t = topic.toLowerCase()
  let best: FallbackEntry | null = null
  let bestScore = 0
  for (const entry of BANK) {
    const score = entry.keywords.reduce((n, kw) => (t.includes(kw) ? n + 1 : n), 0)
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best ?? GENERIC
}

export function fallbackDemoScript(topic: string): string {
  return pickEntry(topic).script
}

export function fallbackDemoHooks(topic: string): string[] {
  return pickEntry(topic).hooks
}
