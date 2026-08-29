export type PublishKitPlatform = 'youtube' | 'tiktok' | 'both'
export type PublishKitTone = 'curiosity' | 'clear' | 'story' | 'business'

export type ShortsPublishKit = {
  titles: string[]
  description: string
  hashtags: string[]
  combined: string
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is',
  'it', 'of', 'on', 'or', 'the', 'this', 'to', 'what', 'when', 'where', 'why', 'with',
])

const TITLE_PATTERNS: Record<PublishKitTone, Array<(topic: string) => string>> = {
  curiosity: [
    (topic) => `${topic}: The Detail Everyone Misses`,
    (topic) => `Why ${topic} Is Not What It Seems`,
    (topic) => `The Part of ${topic} Nobody Explains`,
    (topic) => `What Really Happens With ${topic}?`,
    (topic) => `Before You Scroll Past ${topic}, Watch This`,
    (topic) => `${topic} Gets Stranger the Closer You Look`,
    (topic) => `The Question About ${topic} Nobody Answers`,
    (topic) => `You Know ${topic}. But Not This Part.`,
    (topic) => `One Detail Changes Everything About ${topic}`,
    (topic) => `Can ${topic} Really Work Like This?`,
  ],
  clear: [
    (topic) => `${topic}, Explained in 60 Seconds`,
    (topic) => `A Simple Guide to ${topic}`,
    (topic) => `${topic}: What You Actually Need to Know`,
    (topic) => `The Fastest Way to Understand ${topic}`,
    (topic) => `${topic} Without the Jargon`,
    (topic) => `The Most Important Thing About ${topic}`,
    (topic) => `${topic}: The Short Version`,
    (topic) => `How ${topic} Really Works`,
    (topic) => `${topic}, Step by Step`,
    (topic) => `Start Here If You Want to Understand ${topic}`,
  ],
  story: [
    (topic) => `The Story Behind ${topic}`,
    (topic) => `How ${topic} Changed Everything`,
    (topic) => `${topic}: The Moment Nobody Expected`,
    (topic) => `What Happened Next With ${topic}`,
    (topic) => `The Untold Side of ${topic}`,
    (topic) => `${topic}: A 60-Second Story`,
    (topic) => `The Day ${topic} Became Impossible to Ignore`,
    (topic) => `It Started With ${topic}. Then Everything Changed.`,
    (topic) => `The Twist in the Story of ${topic}`,
    (topic) => `Why People Still Talk About ${topic}`,
  ],
  business: [
    (topic) => `${topic}: What It Means for Your Business`,
    (topic) => `The Business Case for ${topic}`,
    (topic) => `What Customers Get Wrong About ${topic}`,
    (topic) => `${topic}: The Costly Mistake to Avoid`,
    (topic) => `Before You Invest in ${topic}, Watch This`,
    (topic) => `How ${topic} Creates Real Value`,
    (topic) => `${topic}: The Opportunity in Plain English`,
    (topic) => `The Smarter Way to Think About ${topic}`,
    (topic) => `What ${topic} Changes for Small Businesses`,
    (topic) => `${topic}: One Decision That Matters`,
  ],
}

const NICHE_TAGS: Array<{ words: string[]; tags: string[] }> = [
  { words: ['money', 'finance', 'invest', 'wealth', 'business'], tags: ['MoneyTips', 'BusinessTok'] },
  { words: ['mystery', 'crime', 'secret', 'strange', 'unsolved'], tags: ['MysteryTok', 'Unsolved'] },
  { words: ['history', 'ancient', 'war', 'empire'], tags: ['HistoryTok', 'HistoryFacts'] },
  { words: ['ai', 'artificial intelligence', 'technology', 'tech'], tags: ['AITools', 'TechTok'] },
  { words: ['fitness', 'workout', 'health', 'gym'], tags: ['FitnessTips', 'HealthTok'] },
  { words: ['real estate', 'realtor', 'property', 'home'], tags: ['RealEstateTips', 'PropertyTok'] },
  { words: ['food', 'recipe', 'cooking', 'restaurant'], tags: ['FoodTok', 'CookingTips'] },
  { words: ['travel', 'country', 'city', 'island'], tags: ['TravelTok', 'TravelFacts'] },
]

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function sentenceLabel(value: string): string {
  const topic = clean(value, 140).replace(/[.!?]+$/g, '')
  return topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : ''
}

function titleLabel(value: string): string {
  return value
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && STOP_WORDS.has(lower)) return lower
      if (/^[A-Z0-9]{2,}$/.test(word)) return word
      return word ? word.charAt(0).toUpperCase() + word.slice(1) : word
    })
    .join(' ')
}

function fitTitle(value: string): string {
  if (value.length <= 72) return value
  const clipped = value.slice(0, 69)
  const boundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, boundary > 45 ? boundary : 69).trim()}…`
}

function hashtagWord(value: string): string {
  const ascii = value.normalize('NFKD').replace(/\p{M}/gu, '')
  return ascii
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function topicHashtags(topic: string): string[] {
  const words = topic
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? []
  const useful = words.filter((word) => word.length > 2 && !STOP_WORDS.has(word)).slice(0, 4)
  const tags = useful.map(hashtagWord).filter(Boolean)
  const combined = hashtagWord(useful.join(' '))
  if (combined.length >= 5 && combined.length <= 28) tags.unshift(combined)
  return [...new Set(tags)]
}

function relevantNicheTags(topic: string): string[] {
  const normalized = topic.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  return NICHE_TAGS.filter((niche) => niche.words.some((word) => normalized.includes(word)))
    .flatMap((niche) => niche.tags)
}

function platformTags(platform: PublishKitPlatform): string[] {
  if (platform === 'youtube') return ['YouTubeShorts', 'Shorts']
  if (platform === 'tiktok') return ['TikTok', 'LearnOnTikTok']
  return ['YouTubeShorts', 'TikTok', 'ShortFormVideo']
}

export function buildShortsPublishKit(input: {
  topic: string
  takeaway?: string
  platform: PublishKitPlatform
  tone: PublishKitTone
}): ShortsPublishKit {
  const topic = sentenceLabel(input.topic)
  const titleTopic = titleLabel(topic)
  const takeaway = clean(input.takeaway ?? '', 220)
  if (topic.length < 3) return { titles: [], description: '', hashtags: [], combined: '' }

  const titles = [...new Set(TITLE_PATTERNS[input.tone].map((pattern) => fitTitle(pattern(titleTopic))))]
  const followVerb = input.platform === 'youtube' ? 'Subscribe' : 'Follow'
  const description = takeaway
    ? `${topic} — ${takeaway}\n\n${followVerb} for more concise stories like this, and tell me which detail you would add.`
    : `${topic}, explained without the filler. Watch to the end for the detail that changes the whole story.\n\n${followVerb} for more concise stories like this, and tell me what topic I should cover next.`

  const hashtags = [...new Set([
    ...topicHashtags(topic),
    ...relevantNicheTags(topic),
    ...platformTags(input.platform),
    'ContentCreator',
  ])].slice(0, 10).map((tag) => `#${tag}`)

  return {
    titles,
    description,
    hashtags,
    combined: `${titles[0]}\n\n${description}\n\n${hashtags.join(' ')}`,
  }
}
