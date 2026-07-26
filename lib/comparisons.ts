// KINEO-VS-2026-07-26 — data layer for the /vs comparison cluster.
//
// THE BET: most vendors only publish "us vs them" pages, which buyers discount
// on sight. The majority of the pages built on this file are NEUTRAL — two
// competitors compared with Kineo absent from the thesis and disclosed only at
// the end as a third option. Those rank for far more queries and earn links
// because they are not a sales pitch.
//
// FACT DISCIPLINE (non-negotiable):
//  - Every price, free-tier detail and limit below was read off the vendor's
//    OWN live page on the date in `verified`. `source` is that exact URL.
//  - Where a vendor renders its tier table client-side and it did not resolve
//    to readable prices, the field says so and links out instead of guessing.
//    A wrong competitor price is worse than no price.
//  - Nothing here is copied from a competitor's copy. Everything is a factual
//    restatement in our own words; short quoted fragments are marked with
//    quotation marks and attributed to the source URL.
//  - This file is the single source of truth for the whole cluster, so a fact
//    can never drift between two pages.

export const VERIFIED_ON = 'July 26, 2026'
export const BASE = 'https://www.usekineo.com'

export type ToolId =
  | 'opusclip'
  | 'submagic'
  | 'pictory'
  | 'heygen'
  | 'synthesia'
  | 'captions'
  | 'quso'
  | 'descript'
  | 'creatify'
  | 'klap'
  | 'kineo'

/** What the tool fundamentally is. Drives the honest "can this help you at all" answer. */
export type Kind =
  | 'From-scratch generator'
  | 'Long-video re-clipper'
  | 'Caption & polish layer'
  | 'Content repurposer'
  | 'AI avatar platform'
  | 'Timeline / text editor'
  | 'Ad generator'

export type Tool = {
  id: ToolId
  slug: string
  name: string
  kind: Kind
  /** One line: what it is for. */
  category: string
  /** The single most decisive question for a faceless-channel operator. */
  needsSource: string
  freeTier: string
  entryPrice: string
  fullPricing: string
  watermark: string
  ratios: string
  voice: string
  stock: string
  exportLimits: string
  /** Vendor's own page the facts above were read from. */
  source: string
  homepage: string
  verified: string
  /** Optional extra verified detail worth surfacing. */
  note?: string
}

export const TOOLS: Record<ToolId, Tool> = {
  opusclip: {
    id: 'opusclip',
    slug: 'opus-clip',
    name: 'OpusClip',
    kind: 'Long-video re-clipper',
    category: 'Finds the best moments in a long video you already recorded and cuts them into vertical clips.',
    needsSource: 'Yes — you upload a long video or paste a link. There is nothing to clip from an idea.',
    freeTier:
      'Free plan: $0, 60 credits per month, renders up to 1080p, auto-reframe and AI captions with emoji and keyword highlighting. Clips are watermarked, and after 3 days they are no longer exportable.',
    entryPrice: 'Starter $15/month (150 credits/month, monthly billing only)',
    fullPricing:
      'Free $0 (60 credits/mo) · Starter $15/mo (150 credits/mo, monthly billing only) · Pro $29/mo, or $14.50/mo billed annually at $174/year (3,600 credits released up front, 2 seats) · Business custom.',
    watermark: 'Watermarked on the free plan; watermark-free from Starter up.',
    ratios: 'Vertical clips auto-reframed from your horizontal or square source.',
    voice: 'Whatever voice is already in your footage. There is no text-to-speech narration of a written script.',
    stock: 'None. Every frame in the output came from the video you uploaded.',
    exportLimits:
      'Free: clips stop being exportable after 3 days. Starter: 30-day limit on MP4 exports. Pro: no limit on MP4 exports.',
    source: 'https://www.opus.pro/pricing',
    homepage: 'https://www.opus.pro/',
    verified: VERIFIED_ON,
  },
  submagic: {
    id: 'submagic',
    slug: 'submagic',
    name: 'Submagic',
    kind: 'Caption & polish layer',
    category: 'Takes a short video you already have and makes it look native to the feed — captions, b-roll, sound cleanup.',
    needsSource: 'Yes — you upload a finished video. It styles a clip, it does not create one.',
    freeTier:
      'Free plan: $0, 3 videos per month carrying a Submagic watermark, capped at 200MB and 1 minute 30 seconds per video, with starter templates and free stock media.',
    entryPrice: 'Starter $19/member/month, or $12/member/month billed yearly',
    fullPricing:
      'Free $0 (3 videos/mo) · Starter $19/member/mo, or $12/member/mo billed yearly (15 videos/mo up to 2 min each, 3 AI credits, 1080p/30fps, API 10 min/mo) · Pro $39/mo, or $23/mo yearly (40 videos/mo up to 5 min, 6 AI credits, Storyblocks media, AI hook titles, audio cleanup, silence removal, caption translation, 1080p and 2K) · Business + API $69/mo, or $41/mo yearly (100 videos/mo up to 30 min, 15 AI credits, 4K/60fps, API 100 min/mo) · Custom on request.',
    watermark: 'Watermarked on the free plan; removed from Starter up.',
    ratios: 'Short-form vertical, taken from the video you upload.',
    voice: 'Your source audio. No AI narration of a written script.',
    stock: 'Free b-roll and audio on paid plans; the Storyblocks library is added from Pro up.',
    exportLimits:
      '1080p/30fps from Starter, 1080p and 2K from Pro, 4K/60fps on Business. Quota is counted in videos per month, with a maximum duration per video that rises with the tier.',
    source: 'https://www.submagic.co/pricing',
    homepage: 'https://www.submagic.co/',
    verified: VERIFIED_ON,
  },
  pictory: {
    id: 'pictory',
    slug: 'pictory',
    name: 'Pictory',
    kind: 'Content repurposer',
    category: 'Turns writing you already have — a script, an article, a document — into a narrated video with stock visuals.',
    needsSource:
      'Yes, but text counts. A script, a URL or a document is enough; long-video input is added from the Professional tier up.',
    freeTier: 'A 14-day free trial. No permanently free plan is listed on the pricing page.',
    entryPrice: 'Starter $29/month, or $25/month billed annually',
    fullPricing:
      'Starter $29/mo, or $25/mo billed annually (200 video minutes/mo, 2,400/year; script, URL and document input) · Professional $59/mo, or $35/mo annually (600 min/mo, 7,200/year; adds long-video input) · Team $199/mo, or $119/mo annually (1,800 min/mo, 21,600/year; 3+ users) · Enterprise custom. All tiers list a 14-day free trial.',
    watermark: 'No watermark on paid plans.',
    ratios: 'Multiple aspect ratios, vertical included.',
    voice: 'AI voiceover is included and generated from your text.',
    stock: 'Built-in stock visuals matched to the text you supply.',
    exportLimits:
      'Metered in video minutes per month rather than per video — 200 minutes on Starter, 600 on Professional, 1,800 on Team.',
    source: 'https://pictory.ai/pricing',
    homepage: 'https://pictory.ai/',
    verified: VERIFIED_ON,
  },
  heygen: {
    id: 'heygen',
    slug: 'heygen',
    name: 'HeyGen',
    kind: 'AI avatar platform',
    category: 'Puts a synthetic presenter on screen reading your script, with heavy investment in avatars, voice cloning and languages.',
    needsSource: 'No. You write a script, pick an avatar and it renders a talking-head clip.',
    freeTier:
      'Free plan: $0, 3 videos per month up to 1 minute each, 1 custom digital twin, 30+ languages and 500+ stock avatars.',
    entryPrice: 'Creator $29/month, or $24/month billed annually',
    fullPricing:
      'Free $0 (3 videos/mo, 1 min each) · Creator $29/mo, or $24/mo billed annually (600 credits/mo, videos up to 30 min, 1080p export, voice cloning, 175+ languages) · Pro $49/mo (1,000 credits/mo, 4K export) · Business $149/mo plus $20/seat/mo (1,500 credits/mo, videos up to 60 min, 4K, 5 custom digital twins) · Enterprise custom (no video duration maximum, 10+ custom digital twins).',
    watermark: 'Watermark removal is included from the Creator tier up.',
    ratios: 'Multiple, including 9:16 vertical.',
    voice: 'A large built-in voice library plus voice cloning on paid plans; 175+ languages from Creator up.',
    stock: 'Not the point of the product — the avatar is the shot.',
    exportLimits:
      'Credit-metered. The pricing page lists Avatar IV/V at 20 credits per minute and Avatar III at 3 credits per minute. Unused credits roll over for paid subscribers.',
    source: 'https://www.heygen.com/pricing',
    homepage: 'https://www.heygen.com/',
    verified: VERIFIED_ON,
  },
  synthesia: {
    id: 'synthesia',
    slug: 'synthesia',
    name: 'Synthesia',
    kind: 'AI avatar platform',
    category: 'Enterprise-leaning avatar video: training, internal comms and localisation, with governance features to match.',
    needsSource: 'No. You write a script, pick an avatar and it renders a presenter video.',
    freeTier:
      'Basic free plan: $0, 1,200 credits/month, up to 10 minutes of video per month, 25 AI-generated video assets, 9 AI avatars, 160+ languages and voices, 1 editor seat. The Synthesia logo appears on the video.',
    entryPrice: 'Starter $29/month, or $18/month billed yearly',
    fullPricing:
      'Basic free $0 (10 min/mo, Synthesia logo) · Starter $29/mo, or $18/mo billed yearly (1,200 credits/mo or 14,500/year; 10 min/mo or 120 min/year; 125+ AI avatars, 3 personal avatars; 1 editor, 3 guests) · Creator $89/mo, or $64/mo billed yearly (3,600 credits/mo or 44,000/year; 30 min/mo or 360 min/year; 180+ avatars, 5 personal avatars; 1 editor, 5 guests) · Enterprise custom (unlimited video minutes, 240+ avatars, unlimited personal avatars, SAML/SSO, brand kits, SCORM export).',
    watermark: 'The Synthesia logo is on free-plan video; it is removable on paid plans.',
    ratios: 'Multiple, including vertical.',
    voice: '160+ languages and voices on every tier, free plan included.',
    stock: 'Not the point of the product — the avatar and the slide behind it are the shot.',
    exportLimits:
      'Metered in minutes of finished video per month as well as credits: 10 minutes/month on Basic and Starter, 30 minutes/month on Creator.',
    source: 'https://www.synthesia.io/pricing',
    homepage: 'https://www.synthesia.io/',
    verified: VERIFIED_ON,
  },
  captions: {
    id: 'captions',
    slug: 'captions',
    name: 'Captions',
    kind: 'Caption & polish layer',
    category: 'A mobile-first short-form editor built around captions, AI edit styles, AI actors and generative b-roll.',
    needsSource:
      'Mostly. You record or upload, then edit — though the generative features on paid tiers can produce footage, voiceover and images.',
    freeTier:
      'Free plan: basic editing (trimming, transitions, media assets) and 1 caption template, with no AI credits and no generative AI features at all.',
    entryPrice: 'Max $24.99/month',
    fullPricing:
      'Free $0 (no AI credits) · Max $24.99/mo (500 credits/mo, curated AI Edit styles, AI actors and digital twins, chat-based editor, 100+ caption templates, generative music, voiceover, images, video and b-roll) · Scale 1x $69.99/mo (1,400 credits) · Scale 2x $139.99/mo (2,800 credits) · Scale 4x $279.99/mo (5,600 credits) · Enterprise custom. The pricing page states that "Features and prices reflect iOS plans only".',
    watermark: 'Not stated on the pricing page — worth confirming before you commit.',
    ratios: 'Short-form vertical.',
    voice: 'Generative voiceover is available on paid tiers; the free plan has no generative AI.',
    stock: 'Media assets on free; generative b-roll and images from Max up.',
    exportLimits: 'Credit-metered per month, from 500 credits on Max to 5,600 on Scale 4x.',
    source: 'https://www.captions.ai/pricing',
    homepage: 'https://www.captions.ai/',
    verified: VERIFIED_ON,
    note: 'The pricing page carries the line "All prices displayed in USD. Features and prices reflect iOS plans only," so plans reached from a desktop browser may differ.',
  },
  quso: {
    id: 'quso',
    slug: 'quso',
    name: 'quso.ai',
    kind: 'Long-video re-clipper',
    category: 'Clips long videos into shorts and bundles a scheduling and publishing suite around them.',
    needsSource: 'Yes for the clipping half — the product is built around turning long videos into short-form clips.',
    freeTier:
      'Free plan: $0, 75 credits per month, 720p render quality, chapters and short videos, TikTok publishing, CutMagic, and 7-day data retention.',
    entryPrice: 'Lite $29/month, or $19/month billed annually',
    fullPricing:
      'Free $0 (75 credits/mo, 720p) · Lite $29/mo, or $19/mo annually (unlimited 1080p clips, advanced editor, publishing to 6 platforms, 10GB storage) · Essential $39/mo, or $26/mo annually (adds AI filler and silence removal, external content support, Content Planner, 25GB) · Growth $49/mo, or $33/mo annually (adds Brand Kit, the Viddy AI assistant, priority support, templates, 75GB).',
    watermark: 'Not stated on the pricing page.',
    ratios: 'Vertical short-form clips reframed from your source.',
    voice: 'Your source audio.',
    stock: 'None — the clips come from your own footage.',
    exportLimits: 'Free renders are capped at 720p with 7-day data retention; 1080p clips are unlimited from Lite up.',
    source: 'https://quso.ai/pricing',
    homepage: 'https://quso.ai/',
    verified: VERIFIED_ON,
    note: 'quso.ai is what vidyo.ai became. Requesting vidyo.ai/pricing returns a 302 redirect to quso.ai/pricing, confirmed on ' + VERIFIED_ON + '.',
  },
  descript: {
    id: 'descript',
    slug: 'descript',
    name: 'Descript',
    kind: 'Timeline / text editor',
    category: 'Edits video and podcasts by editing their transcript, with AI tools layered on a real editor.',
    needsSource: 'Yes — it edits recordings you bring to it.',
    freeTier:
      'Free plan: $0, 60 minutes of media per month, 100 one-time AI credits, and 720p watermarked exports.',
    entryPrice: 'Hobbyist $24/month, or $16/month billed annually',
    fullPricing:
      'Free $0 (60 min media/mo, 100 one-time AI credits, 720p watermarked) · Hobbyist $24/mo, or $16/mo annually (10 media hours/mo, 400 AI credits/mo, 1080p watermark-free) · Creator $35/mo, or $24/mo annually (30 media hours/mo, 800 AI credits/mo, 4K) · Business $65/mo, or $50/mo annually (40 media hours/mo, 1,500 AI credits/mo, 4K) · Enterprise custom (SSO, SCIM, audit logs). All paid plans list unlimited projects and transcription in 25 languages.',
    watermark: 'Watermarked 720p exports on the free plan; watermark-free from Hobbyist up.',
    ratios: 'Any — you control the canvas, vertical included.',
    voice: 'AI voice tools are available, but the product assumes you have recorded audio.',
    stock: 'A stock library exists; it is not the centre of the product.',
    exportLimits:
      'Metered in media hours ingested per month — 60 minutes free, 10 hours on Hobbyist, 30 on Creator, 40 on Business — plus a monthly AI credit allowance.',
    source: 'https://www.descript.com/pricing',
    homepage: 'https://www.descript.com/',
    verified: VERIFIED_ON,
  },
  creatify: {
    id: 'creatify',
    slug: 'creatify',
    name: 'Creatify',
    kind: 'Ad generator',
    category: 'Generates performance video ads with AI actors, and adds tooling for the people buying the media.',
    needsSource: 'No — it can build an ad from a product URL or a prompt.',
    freeTier:
      'Free plan: 10 credits per month, enough for up to 2 video ads or 20 image ads, with 300 AI actors, 10 premium models and 40 templates. Output carries a watermark.',
    entryPrice: 'Starter $39/month',
    fullPricing:
      'Free (10 credits/mo, watermarked) · Starter $39/mo (100 credits/mo, 300 AI actors, 200+ ad templates, 50+ premium models, watermark removal, videos up to 2 minutes) · Pro $99/mo (300 credits/mo, 1,500 AI actors plus 3 custom avatars, 500+ templates, 100+ premium models, videos up to 10 minutes, 5 seats, media buyer and ad tracker) · Enterprise custom (1,200 credits/year, 6+ seats, API discounts, white-label). Annual billing is advertised as saving up to 50%.',
    watermark: 'Watermarked on free; watermark removal is included from Starter up.',
    ratios: 'Ad-native ratios including 9:16 vertical.',
    voice: 'AI voiceover built into the ad templates.',
    stock: 'Template-driven, with AI actors doing most of the visual work.',
    exportLimits: 'Credit-metered, with a maximum video length that rises by tier — 2 minutes on Starter, 10 on Pro.',
    source: 'https://www.creatify.ai/pricing',
    homepage: 'https://www.creatify.ai/',
    verified: VERIFIED_ON,
  },
  klap: {
    id: 'klap',
    slug: 'klap',
    name: 'Klap',
    kind: 'Long-video re-clipper',
    category: 'Pastes in a YouTube link or an uploaded file and returns captioned, reframed short clips.',
    needsSource: 'Yes — "Simply paste a link to your Youtube video, or upload a video file", per klap.app.',
    freeTier:
      'klap.app states you can "try out Klap and create 1 video for free. No credit card required." No recurring free tier is described on the pages we could read.',
    entryPrice: 'klap.app states "Klap Pro for just $29/month". The rest of the tier list is not readable — see below.',
    fullPricing:
      'Not fully verifiable. The tier table at klap.app/pricing is rendered client-side and did not resolve to readable prices when we checked on ' +
      VERIFIED_ON +
      '. What is stated in plain text on their own site: "Klap Pro for just $29/month", a one-video free trial with no card, and a monthly/yearly toggle advertising "Save 50%" on annual billing. Check klap.app/pricing yourself for the current full list before you buy.',
    watermark: 'Not stated on the pages we could read.',
    ratios: 'Vertical short-form clips reframed from your source.',
    voice: 'Your source audio.',
    stock: 'None — the clips come from your own footage.',
    exportLimits: 'Not stated on the pages we could read.',
    source: 'https://klap.app/pricing',
    homepage: 'https://klap.app/',
    verified: VERIFIED_ON,
    note: 'klap.app offers the rough guide that "a one-minute long video produces about 5 video clips."',
  },
  kineo: {
    id: 'kineo',
    slug: 'kineo',
    name: 'Kineo',
    kind: 'From-scratch generator',
    category: 'Turns one typed topic into a finished faceless 9:16 Short — script, AI voiceover, matched footage, captions.',
    needsSource: 'No. A sentence is the whole input. There is no footage to upload and no timeline to learn.',
    freeTier: 'Up to 3 watermarked Fast videos every 24 hours, with no card.',
    entryPrice: 'Starter $4.90 for the first month, then $9.90/month',
    fullPricing:
      'Free (up to 3 watermarked Fast videos per 24h, no card) · Starter $9.90/mo, $4.90 for the first month, 25 credits ($99/year) · Creator $24.90/mo, 150 credits ($199/year) · Studio $37.90/mo, 200 credits ($379/year). 7-day money-back guarantee.',
    watermark: 'Watermarked on the free tier; every paid plan exports a clean, watermark-free MP4.',
    ratios: '9:16 vertical only. That is a deliberate limit, not an oversight.',
    voice: 'AI voiceover generated from the script it wrote, with premium voices on higher tiers.',
    stock: 'Stock footage matched scene by scene to the actual voiceover lines, plus generative engines on higher tiers.',
    exportLimits:
      'Credit-metered: a Fast video costs 1 credit, an AI Generated video 20, Cinematic 50, AI Presenter 70, a Hollywood film 150. Credits do not roll over between months.',
    source: BASE + '/pricing',
    homepage: BASE,
    verified: VERIFIED_ON,
  },
}

/** The spec table every comparison page renders, single-sourced from TOOLS. */
export const SPEC_ROWS: { label: string; get: (t: Tool) => string }[] = [
  { label: 'What it actually is', get: (t) => t.category },
  { label: 'Needs an existing video?', get: (t) => t.needsSource },
  { label: 'Free tier', get: (t) => t.freeTier },
  { label: 'Cheapest paid plan', get: (t) => t.entryPrice },
  { label: 'Full pricing', get: (t) => t.fullPricing },
  { label: 'Watermark', get: (t) => t.watermark },
  { label: 'Aspect ratio', get: (t) => t.ratios },
  { label: 'Voice / narration', get: (t) => t.voice },
  { label: 'Where the visuals come from', get: (t) => t.stock },
  { label: 'Export & usage limits', get: (t) => t.exportLimits },
]

export type Pair = {
  /** Canonical slug: the two tool slugs, alphabetical, joined by "-vs-". */
  slug: string
  a: ToolId
  b: ToolId
  title: string
  description: string
  /** Shown on the hub. Why this pair earns a page rather than being filler. */
  whyItExists: string
  /** The verdict, stated plainly, above everything else. */
  verdictLead: string
  verdict: { h: string; p: string }[]
  pickA: string[]
  pickB: string[]
  /** The differences that actually matter to someone running a faceless channel. */
  differences: { h: string; p: string }[]
  faq: { q: string; a: string }[]
  /** Short, disclosed Kineo note. On neutral pages this is a third option, not the thesis. */
  kineo: string
}

/**
 * TWELVE pages, not a generated grid. Google's 2026-05-15 scaled-content-abuse
 * policy applies "no matter how it's created", so every pair below had to clear
 * two tests: a real search exists for it, AND we had something non-obvious to
 * say. Pairs we could not clear on both were cut rather than padded out.
 * Eight are neutral (Kineo is not a participant); four are Kineo head-to-heads,
 * declared in the slug so nobody is ambushed.
 */
export const PAIRS: Pair[] = [
  // ─── NEUTRAL ───────────────────────────────────────────────────────────────
  {
    slug: 'heygen-vs-synthesia',
    a: 'heygen',
    b: 'synthesia',
    title: 'HeyGen vs Synthesia (2026): Prices, Minutes and the Trap in Both',
    description:
      'HeyGen and Synthesia compared on verified 2026 pricing, free tiers, avatar counts and how each meters your usage — plus the honest answer for anyone trying to make faceless Shorts with either.',
    whyItExists:
      'The highest-volume comparison query in AI video, and almost every page answering it is an affiliate rewrite. The number that decides it — minutes per month, not price per month — is the one nobody prints.',
    verdictLead:
      'Buy Synthesia if a real organisation needs presenter video it can govern, translate and reuse. Buy HeyGen if one person wants a talking avatar clip cheaply, with voice cloning, this week. And if you came here to build faceless YouTube Shorts, the honest answer is that neither of these is the tool for that job.',
    verdict: [
      {
        h: 'The list price is not the price',
        p: 'Both entry tiers cost $29/month. That tells you almost nothing. Synthesia Starter includes up to 10 minutes of finished video per month; HeyGen Creator includes 600 credits, and HeyGen prices Avatar IV/V at 20 credits per minute and Avatar III at 3 credits per minute. Ten minutes a month at $29 is roughly $2.90 per finished minute at list. Work out how many minutes you actually need before you compare the headline numbers, because that is the axis the two products genuinely differ on.',
      },
      {
        h: 'Synthesia wins on governance, Synthesia loses on volume',
        p: 'SAML/SSO, brand kits, SCORM export and an editor-plus-guests seat model are Enterprise-shaped features, and they are why Synthesia keeps winning training and internal-comms budgets. The same shape is why an individual creator hits its minute ceiling fast: Creator at $89/month is still 30 minutes of video per month.',
      },
      {
        h: 'HeyGen wins on languages, cloning and headroom',
        p: 'Voice cloning and 175+ languages from the $29 Creator tier, videos up to 30 minutes, 4K from Pro at $49, and unused credits that roll over on paid plans. For a solo operator who wants a presenter and does not need an audit log, this is the more generous side of the table.',
      },
      {
        h: 'The free tiers are not comparable, and Synthesia’s is better',
        p: 'Synthesia Basic gives 1,200 credits and up to 10 minutes of video per month — the same minute allowance as its $29 Starter plan — with 9 avatars and 160+ languages, in exchange for a Synthesia logo on the output. HeyGen Free gives 3 videos per month capped at 1 minute each. If you are evaluating rather than shipping, Synthesia lets you test far more before paying.',
      },
    ],
    pickA: [
      'You want voice cloning and you do not want to pay enterprise money for it — it is in the $29 Creator tier.',
      'You need many languages: 175+ from Creator up, with translation workflows built around them.',
      'You want long single videos: up to 30 minutes on Creator, 60 on Business.',
      'You want 4K without a sales call — that is Pro at $49/month.',
      'Your usage is spiky, and credits rolling over month to month matters more than a fixed minute quota.',
    ],
    pickB: [
      'The video is for a company: training, onboarding, policy, internal comms.',
      'You need SAML/SSO, brand kits or SCORM export — those are on the Enterprise tier and they are the reason to be here.',
      'You want the most generous free tier to evaluate with: 10 minutes a month, 9 avatars, 160+ languages, at the cost of a logo.',
      'Several people need to review a video without each needing a paid editor seat — the plans are structured as 1 editor plus guests.',
      'Your volume is genuinely low and predictable, so a 10 or 30 minute monthly ceiling is not a constraint.',
    ],
    differences: [
      {
        h: 'Neither one makes a faceless Short',
        p: 'This is the part the affiliate pages skip, and it is the whole reason a lot of people land on this comparison. Both products render a person talking to camera. A faceless Short is the opposite format: narration over cut footage, no presenter, retention carried by the visuals changing every couple of seconds. You can export 9:16 from either, and you will still have a talking head in a vertical frame. If your channel format is a presenter, these are the right tools. If your channel format is faceless, you are shopping in the wrong category and the price comparison above does not matter.',
      },
      {
        h: 'Minutes per month is the binding constraint, not credits',
        p: 'Synthesia states its ceiling in minutes: 10 per month on Basic and Starter, 30 on Creator, unlimited only on Enterprise. HeyGen states credits and then a per-minute burn rate that depends on which avatar generation you use — so the same 600 credits buys you wildly different amounts of finished video depending on whether you pick Avatar III at 3 credits per minute or Avatar IV/V at 20. Post daily and either ceiling arrives quickly; the difference is that HeyGen lets you trade quality for volume and Synthesia does not.',
      },
      {
        h: 'The watermark question has different answers',
        p: 'Synthesia puts its logo on free-plan output and makes it removable on paid plans. HeyGen lists watermark removal as a Creator-tier-and-up feature. Practically: neither free tier gives you something you should be posting to a monetised channel, because platforms have historically been unkind to clips carrying another app’s branding.',
      },
      {
        h: 'Custom avatars are metered, and that is the real upsell',
        p: 'HeyGen Free includes 1 custom digital twin; Business at $149/month includes 5; Enterprise 10+. Synthesia Starter includes 3 personal avatars and Creator 5, with unlimited only on Enterprise. If your plan is one recognisable presenter, any tier works. If your plan is a roster of characters, this line is what you will actually be paying for.',
      },
    ],
    faq: [
      {
        q: 'Is HeyGen or Synthesia cheaper?',
        a: 'Both start at $29/month, and both discount for annual billing — Synthesia to $18/month billed yearly, HeyGen to $24/month billed annually, as listed on their own pricing pages on July 26, 2026. On sticker price Synthesia annual is cheaper. On what you get for it, HeyGen Creator includes 600 credits, videos up to 30 minutes, voice cloning and 175+ languages, while Synthesia Starter includes up to 10 minutes of video per month. Which is cheaper therefore depends entirely on how many finished minutes you need — work that out first.',
      },
      {
        q: 'Which has the better free plan, HeyGen or Synthesia?',
        a: 'Synthesia, by a clear margin, if you are evaluating. Its Basic plan gives 1,200 credits and up to 10 minutes of video per month with 9 AI avatars and 160+ languages, in exchange for a Synthesia logo on the output. HeyGen Free gives 3 videos per month capped at 1 minute each, though it does include 1 custom digital twin and 500+ stock avatars. Verified on both pricing pages on July 26, 2026.',
      },
      {
        q: 'Can I make faceless YouTube Shorts with HeyGen or Synthesia?',
        a: 'You can export vertical video from either, but you will get a synthetic person talking to camera, which is a presenter format rather than a faceless one. A faceless Short is narration over cut b-roll with no human on screen. If that is what you are building, an avatar platform is the wrong category regardless of which of these two you pick.',
      },
      {
        q: 'Does either one let me clone my own voice?',
        a: 'HeyGen lists voice cloning on its Creator tier at $29/month. Synthesia lists personal avatars — 3 on Starter, 5 on Creator, unlimited on Enterprise. They are not the same feature: a personal avatar is your likeness, a cloned voice is your voice. Check which of the two you actually need before choosing, and confirm the current terms on their pricing pages.',
      },
      {
        q: 'How many avatars does each one have?',
        a: 'As listed on July 26, 2026: HeyGen advertises 500+ stock avatars on its free plan. Synthesia lists 9 AI avatars on Basic, 125+ on Starter, 180+ on Creator and 240+ on Enterprise. Raw avatar count is a weak buying signal though — you will use one or two consistently, and the constraint you will actually hit is minutes per month.',
      },
      {
        q: 'Do unused credits roll over on either platform?',
        a: 'HeyGen states that unused credits roll over for paid subscribers, with annual subscribers accumulating credits until renewal. Synthesia states monthly and annual credit allowances but we did not find a rollover guarantee on its pricing page, so treat the monthly minute allowance as use-it-or-lose-it unless they confirm otherwise.',
      },
    ],
    kineo:
      'Disclosure: this page is published by Kineo, and Kineo is not one of the two tools above. It is a different category — you type a topic and it returns a finished faceless 9:16 Short with an AI voiceover over matched footage, no presenter and no source video. If the faceless format is what you were actually looking for when you searched for an avatar tool, that is the honest reason to click through. If you genuinely need a synthetic presenter, buy HeyGen or Synthesia; Kineo will not do that job as well as either of them.',
  },
  {
    slug: 'opus-clip-vs-submagic',
    a: 'opusclip',
    b: 'submagic',
    title: 'OpusClip vs Submagic (2026): They Are Not The Same Tool',
    description:
      'OpusClip and Submagic compared on verified 2026 pricing, free tiers and export limits — including the 3-day expiry and the 1m30s cap most reviews leave out, and why many operators pay for both.',
    whyItExists:
      'The highest-demand clipping comparison there is, and it is usually answered as if the two products compete. They mostly do not: one finds the clip, the other finishes it. Getting that wrong costs money in both directions.',
    verdictLead:
      'OpusClip decides which 40 seconds of your long video are worth posting. Submagic makes 40 seconds you already chose look like it belongs in the feed. If you have long recordings and no idea what to cut, buy OpusClip. If you already know your best moments and they look flat, buy Submagic. A lot of people who compare these two end up paying for both, and that is a rational outcome rather than a failure to choose.',
    verdict: [
      {
        h: 'OpusClip is a selection problem solver',
        p: 'Its job is finding the moments in a two-hour recording that can stand alone, then reframing them vertically and captioning them. If you publish podcasts, streams or long talking-head video, that search is the expensive part of your week and OpusClip is aimed squarely at it.',
      },
      {
        h: 'Submagic is a presentation problem solver',
        p: 'It assumes you already have the clip. What it adds is caption styling, b-roll, hook titles from Pro up, audio cleanup and silence removal. If your clips are fine but they look homemade next to what is winning in your niche, this is the gap it closes.',
      },
      {
        h: 'The cheapest honest combination is about $27–$34 a month',
        p: 'OpusClip Starter at $15/month plus Submagic Starter at $19/month is $34 monthly, or $27 if you take Submagic annual at $12/month. That gets you selection and polish together for less than a single mid-tier plan on most platforms in this category. Verified on both pricing pages on July 26, 2026.',
      },
      {
        h: 'Neither can help you if you have no footage',
        p: 'Both require an upload. Submagic’s free plan even caps you at 200MB and 1 minute 30 seconds per video. If your channel plan is to publish without filming anything, the entire comparison on this page is moot and you need a different category of tool.',
      },
    ],
    pickA: [
      'You record long — podcasts, streams, webinars, long talking-head — and the bottleneck is deciding what to cut.',
      'You want to try before paying: the free plan gives 60 credits a month at up to 1080p.',
      'You will commit annually — Pro drops from $29/month to $14.50/month billed annually at $174/year, with 3,600 credits released up front.',
      'Two people need access; Pro includes 2 seats.',
      'Auto-reframe from a horizontal source is the specific thing you need automated.',
    ],
    pickB: [
      'You already have the clips and they need to look native to the feed.',
      'Caption styling is a real differentiator in your niche and you want templates rather than a timeline.',
      'You want a genuinely usable free plan: 3 videos a month, watermarked, capped at 1m30s and 200MB.',
      'You need audio cleanup, silence removal or caption translation — those arrive at Pro, $39/month or $23/month yearly.',
      'You need 4K at 60fps, which is the Business + API tier at $69/month or $41/month yearly.',
    ],
    differences: [
      {
        h: 'The 3-day expiry on OpusClip’s free plan',
        p: 'This is the single most-missed line in the entire comparison. On the free plan, OpusClip states that after 3 days the clips are no longer exportable. That makes the free tier a trial rather than a workflow: generate a batch, forget about it for a long weekend, and the work is gone. Starter lifts this to a 30-day limit on MP4 exports, and only Pro removes the limit entirely. If you were planning to run a channel on the free plan, plan around this or plan on paying.',
      },
      {
        h: 'Submagic charges per member, and per video',
        p: 'Submagic prices are quoted per member per month, and the quota is a number of videos with a maximum duration each: 15 videos up to 2 minutes on Starter, 40 up to 5 minutes on Pro, 100 up to 30 minutes on Business. OpusClip meters credits instead. The practical difference is that a Submagic plan has a hard, countable ceiling you can plan a posting schedule against, while a credit balance drains at a rate that depends on what you feed it.',
      },
      {
        h: 'Only one of them charges you more for a team',
        p: 'OpusClip Pro includes 2 seats at $29/month. Submagic bills per member, so a second person is a second subscription. For a solo operator this is irrelevant; for a two-person channel it is a real annual number.',
      },
      {
        h: 'Neither writes a script or records a voice',
        p: 'Worth stating plainly because a lot of buyers assume otherwise. Both work from audio you already recorded. There is no text-to-speech narration of a written script in either product, and no way to go from an idea to a video without filming something first.',
      },
    ],
    faq: [
      {
        q: 'Do I need both OpusClip and Submagic?',
        a: 'Often, yes, and that is not a cop-out. They solve different halves of the same workflow: OpusClip identifies and cuts the clip out of your long video, Submagic styles the clip for the feed. Running OpusClip Starter at $15/month alongside Submagic Starter at $19/month — $12/month if billed yearly — is a common and reasonable stack. If money is tight, start with whichever half is currently costing you more time.',
      },
      {
        q: 'Is OpusClip or Submagic cheaper?',
        a: 'OpusClip Starter is $15/month against Submagic Starter at $19/member/month, so OpusClip is cheaper at entry. On annual billing it flips at the top: Submagic Starter falls to $12/member/month while OpusClip Starter is monthly-only, though OpusClip Pro falls to $14.50/month billed annually at $174/year. All figures read from their own pricing pages on July 26, 2026.',
      },
      {
        q: 'What happens to my OpusClip clips after 3 days on the free plan?',
        a: 'OpusClip states that on the free plan, clips are no longer exportable after 3 days. They are effectively use-it-or-lose-it. Starter raises this to a 30-day export window and Pro removes the limit. Check the current terms on opus.pro/pricing before relying on this.',
      },
      {
        q: 'Can Submagic make a video from scratch?',
        a: 'No. Submagic works on a video you upload — its free plan is capped at 200MB and 1 minute 30 seconds per file. It adds captions, b-roll, hook titles, audio cleanup and similar polish. If you have no footage at all, it has nothing to work with.',
      },
      {
        q: 'Which one is better for a podcast?',
        a: 'OpusClip, clearly, for the first step: a two-hour episode is exactly the case its clip-finding is built for. Then Submagic if you want the resulting clips styled beyond what OpusClip’s captions give you. Note the ceilings if you are high-volume — Submagic Starter allows 15 videos a month at up to 2 minutes each, which a weekly podcast will exhaust quickly.',
      },
      {
        q: 'Do both have free plans without a credit card?',
        a: 'Both list a free tier. OpusClip Free gives 60 credits a month at up to 1080p with watermarked clips that expire from export after 3 days. Submagic Free gives 3 watermarked videos a month capped at 200MB and 1m30s. Neither free output is what you would want on a monetised channel, because of the watermarks.',
      },
    ],
    kineo:
      'Disclosure: Kineo publishes this page and is not one of the two tools compared above. It belongs to a different category — from-scratch generation. Both OpusClip and Submagic need footage you already recorded; Kineo takes a typed topic and returns a finished faceless 9:16 Short with narration over matched footage. If you landed here because you want to post Shorts but have nothing to clip, that is the relevant difference. If you do have long recordings, OpusClip is the better tool for that and this page is not trying to talk you out of it.',
  },
  {
    slug: 'captions-vs-submagic',
    a: 'captions',
    b: 'submagic',
    title: 'Captions vs Submagic (2026): Phone App vs Browser Tool',
    description:
      'Captions and Submagic compared on verified 2026 pricing, free tiers and what each one actually meters — including the iOS-only pricing disclaimer and the free plan with no AI credits.',
    whyItExists:
      'These two genuinely compete for the same buyer, and the pages currently answering the query are directory stubs with no verified prices. Two specific facts decide it, and neither is in those stubs.',
    verdictLead:
      'Buy Submagic if you edit on a laptop, post on a schedule, and want a countable monthly quota you can plan against. Buy Captions if you shoot and finish on a phone and want the generative extras — AI actors, generated b-roll, generated voiceover — inside the same app. Before you buy Captions, read the line on their own pricing page saying the prices and features shown reflect iOS plans only.',
    verdict: [
      {
        h: 'Submagic is priced like a subscription; Captions is priced like a phone app',
        p: 'Submagic quotes per member per month with a quota in videos: 15, 40 or 100 a month depending on tier, each with a maximum duration. Captions quotes credit bundles that scale steeply — $24.99, $69.99, $139.99, $279.99 — and its pricing page notes those figures reflect iOS plans. Those are two different purchasing models and they suit different operators.',
      },
      {
        h: 'The Captions free plan has no AI in it',
        p: 'This deserves stating flatly because the product is marketed on its AI. The free tier lists basic editing — trimming, transitions, media assets — and one caption template, with no AI credits and no generative AI features. It is a demo of the editor, not of the thing you are considering paying for.',
      },
      {
        h: 'The Submagic free plan is small but it is real',
        p: 'Three watermarked videos a month, capped at 200MB and 1 minute 30 seconds each, with starter templates and free stock media. Tiny, but you can actually run the workflow you are evaluating end to end, which the Captions free plan does not let you do.',
      },
      {
        h: 'On generative features, Captions is doing more',
        p: 'From the $24.99 Max tier it lists AI actors and digital twins, a chat-based editor, and generative music, voiceover, images, video and b-roll. Submagic’s AI is aimed narrowly at making an existing clip better — hook titles, audio cleanup, silence removal, caption translation. If you want the tool to invent footage rather than fetch it, that is a point for Captions.',
      },
    ],
    pickA: [
      'Your whole workflow lives on an iPhone and you do not want to move files to a desktop.',
      'You want generative b-roll, generated voiceover or an AI actor inside the same app as the captions.',
      'A chat-based editor suits how you work better than a template picker.',
      'You want 100+ caption templates and curated AI edit styles rather than assembling a look yourself.',
      'Your usage is high enough that buying credits in bulk at Scale tiers works out better than a per-video quota.',
    ],
    pickB: [
      'You edit in a browser on a laptop and want that to be a first-class path, not a port.',
      'You want to know exactly how many videos your plan buys — 15, 40 or 100 a month — rather than watching a credit balance.',
      'You need 4K at 60fps, which is the $69/month Business + API tier, or $41/month yearly.',
      'You want a free tier you can genuinely test the full workflow on, watermark and all.',
      'You want annual billing to actually cut the price hard: Starter $19 → $12/member/month, Pro $39 → $23.',
    ],
    differences: [
      {
        h: 'The iOS-only pricing disclaimer',
        p: 'The Captions pricing page states, in its own words, "All prices displayed in USD. Features and prices reflect iOS plans only." That is an unusual thing to find on a pricing page and it means the tiers above may not be what you are offered from a desktop browser or on Android. It is not a criticism of the product — it is a reason to verify your own price before you commit, and a reason we are not going to tell you what the non-iOS price is, because we could not verify it.',
      },
      {
        h: 'Watermarks: one is documented, one is not',
        p: 'Submagic states plainly that free-plan videos carry a Submagic watermark and that paid plans from Starter up do not. The Captions pricing page does not state a watermark policy either way in what we could read. For a monetised channel this is not a minor detail — platforms have historically been unkind to clips carrying another app’s branding — so confirm it before you rely on the free tier.',
      },
      {
        h: 'Duration ceilings work differently',
        p: 'Submagic caps the length of each video by tier: 1m30s free, 2 minutes on Starter, 5 on Pro, 30 on Business. Captions meters credits, so length is a function of how fast you burn them rather than a hard per-video wall. If you are strictly making sub-60-second Shorts, Submagic Starter’s 2-minute cap is irrelevant and the 15-videos-a-month quota is the number that will bind.',
      },
      {
        h: 'Neither replaces a source video',
        p: 'Captions can generate elements — b-roll, voiceover, images — but both products are built around a clip you bring, whether recorded or assembled. If your plan is to publish faceless content without filming, neither of these is the front of your pipeline; they are the finishing step for something else.',
      },
    ],
    faq: [
      {
        q: 'Is Captions or Submagic cheaper?',
        a: 'Submagic is cheaper at entry: $19/member/month, falling to $12/member/month billed yearly, against Captions Max at $24.99/month. The gap widens on annual billing, which Submagic offers and which is not listed on the Captions pricing page we read. Both verified July 26, 2026 on their own pricing pages.',
      },
      {
        q: 'Is the Captions free plan any good?',
        a: 'It depends entirely on what you wanted from it. It gives basic editing — trimming, transitions, media assets — and one caption template. It explicitly includes no AI credits and no generative AI features, which means the parts of Captions people usually want to test are not in it. If you are evaluating the AI, you will need to pay for Max at $24.99/month to see it.',
      },
      {
        q: 'Which one is better for making YouTube Shorts?',
        a: 'For finishing a Short you already shot, either works and the choice is really desktop versus phone. Submagic is the more predictable purchase if you post on a fixed schedule, because the quota is in whole videos. Captions is the stronger pick if you want to generate elements you did not film. Neither will produce a Short from nothing but a topic.',
      },
      {
        q: 'Does Submagic work on a phone?',
        a: 'Submagic is a browser-based product with a video quota per member and API access on its Starter and Business tiers. Captions is explicit that its published pricing reflects iOS plans. If mobile-first is a hard requirement for you, check current platform support on both sites — that is the axis this decision turns on more than price.',
      },
      {
        q: 'Do either of them add b-roll automatically?',
        a: 'Both do, differently. Submagic lists free b-roll and audio on paid plans and adds Storyblocks content from Pro at $39/month. Captions lists generative b-roll, images and video from Max at $24.99/month — generated rather than sourced from a library. Sourced stock and generated footage fail in different ways, so it is worth testing both on your own niche.',
      },
      {
        q: 'Can I get 4K out of either?',
        a: 'Submagic lists 4K at 60fps on its Business + API tier, $69/month or $41/month billed yearly; lower tiers cap at 1080p or 2K. The Captions pricing page did not state export resolutions in what we could read, so check before buying if 4K is a requirement.',
      },
    ],
    kineo:
      'Disclosure: this comparison is published by Kineo, which is not one of the two tools above and is not a captioning tool. Kineo sits earlier in the pipeline: it writes, voices, sources footage for and renders a whole 9:16 Short from one typed topic, captions included. If you are choosing between Captions and Submagic you probably already have footage, in which case Kineo is not what you need and either of the two above will serve you better.',
  },
  {
    slug: 'descript-vs-opus-clip',
    a: 'descript',
    b: 'opusclip',
    title: 'Descript vs OpusClip (2026): Editor You Drive vs Automation You Supervise',
    description:
      'Descript and OpusClip compared on verified 2026 pricing and — more importantly — on how each one meters you: media hours ingested versus credits spent. The metering decides this, not the price.',
    whyItExists:
      'A real decision people make, usually framed as a feature bake-off. It is not one. The two products bill on completely different axes, and for a weekly long-form publisher that difference is worth more than every feature on either list.',
    verdictLead:
      'Pick Descript if you were going to re-cut whatever the AI chose anyway, and you want one tool that also handles the long-form edit. Pick OpusClip if you want twenty candidate clips by morning and you are content to throw most of them away. The honest tiebreaker is not features: Descript bills you for hours of media you put in, OpusClip bills you for credits you spend. Model your own volume against both before you look at anything else.',
    verdict: [
      {
        h: 'Descript is an editor with AI in it',
        p: 'You edit video by editing its transcript, which is a genuinely good idea and the reason people stay. It expects you to make decisions. The AI accelerates them; it does not replace them.',
      },
      {
        h: 'OpusClip is an automation with an editor bolted on',
        p: 'You give it a long video, it decides what is worth clipping, reframes it vertically and captions it. You review rather than author. When it is right, it saves the most tedious hour of the week; when it is wrong, you either accept a mediocre clip or go do the work elsewhere.',
      },
      {
        h: 'Metering: media hours versus credits',
        p: 'Descript counts the hours of media you bring in — 60 minutes a month free, 10 hours on Hobbyist at $24/month, 30 on Creator at $35, 40 on Business at $65 — plus a monthly AI credit allowance. OpusClip counts credits: 60 a month free, 150 on Starter at $15, 3,600 a year on Pro. Upload a three-hour podcast every week and Descript Hobbyist’s 10 media hours is gone in the first fortnight regardless of how little editing you do.',
      },
      {
        h: 'Both free plans are trials, not tiers',
        p: 'Descript Free gives 60 minutes of media a month, 100 one-time AI credits, and 720p watermarked exports. OpusClip Free gives 60 credits a month with watermarked clips that stop being exportable after 3 days. Neither produces something you should post to a monetised channel.',
      },
    ],
    pickA: [
      'You are editing the long-form video too, not only harvesting clips from it.',
      'Transcript-based editing genuinely suits how you think — for a lot of people it is a step change.',
      'You want transcription included: all paid plans list transcription in 25 languages.',
      'You need 4K without buying the top tier: that is Creator at $35/month, or $24/month annually.',
      'Your media volume is modest, so paying by hours ingested is cheap for you rather than expensive.',
    ],
    pickB: [
      'The task is specifically "find the good bits in this long recording", not "edit this recording".',
      'You want a lot of candidate clips fast and you will curate rather than author.',
      'Auto-reframe from horizontal to vertical is the specific automation you want.',
      'You want the cheapest real plan in this comparison: Starter at $15/month.',
      'Annual billing suits you: Pro drops to $14.50/month at $174/year with 3,600 credits released up front and 2 seats.',
    ],
    differences: [
      {
        h: 'The media-hours ceiling is easy to underestimate',
        p: 'It counts what you put in, not what you get out. A weekly two-hour podcast is roughly 8 to 9 hours of media a month before you have edited a frame, which fits inside Hobbyist’s 10 hours with almost nothing to spare — and adding a second camera angle doubles it. Anyone running multi-track recordings should price Creator’s 30 hours or Business’s 40 as the realistic starting tier, not Hobbyist.',
      },
      {
        h: 'OpusClip’s export windows are a real constraint on the cheap tiers',
        p: 'Free-plan clips stop being exportable after 3 days, and Starter carries a 30-day limit on MP4 exports. Only Pro removes the limit. If you batch-produce and post over the following quarter, you are on Pro whether the features made you want it or not.',
      },
      {
        h: 'One of them is a single-purpose tool and that is fine',
        p: 'OpusClip does one job. Descript is trying to be your editor. If you already have an editor you like, adding OpusClip is a small, cheap, additive decision; migrating to Descript is a workflow change. Weigh the switching cost, not just the subscription.',
      },
      {
        h: 'Neither is a from-scratch tool',
        p: 'Both need a recording. Descript can generate AI voice, but the product assumes you have recorded audio to work against. If your plan is to publish without filming, this comparison does not contain your answer.',
      },
    ],
    faq: [
      {
        q: 'Is Descript or OpusClip cheaper?',
        a: 'OpusClip at entry: Starter is $15/month against Descript Hobbyist at $24/month, or $16/month billed annually. But they are not comparable units — OpusClip Starter buys 150 credits a month, Descript Hobbyist buys 10 media hours plus 400 AI credits. Which is cheaper depends on how many hours of source video you have. Both verified on their own pricing pages, July 26, 2026.',
      },
      {
        q: 'Does Descript find clips automatically like OpusClip?',
        a: 'Descript includes AI tools and a monthly AI credit allowance, but its centre of gravity is transcript-based editing you drive. OpusClip is built specifically to identify clip-worthy moments in a long video and reframe them. If unattended clip discovery is the job, OpusClip is aimed at it directly.',
      },
      {
        q: 'What are Descript media hours and do they roll over?',
        a: 'Media hours count the volume of video and audio you bring into Descript each month: 60 minutes on Free, 10 hours on Hobbyist, 30 on Creator, 40 on Business. Rollover is not stated on the pricing page we read, so budget as if the allowance resets each month and check with Descript if it matters to you.',
      },
      {
        q: 'Do both watermark on the free plan?',
        a: 'Yes. Descript Free exports at 720p with a watermark; watermark-free 1080p starts at Hobbyist. OpusClip Free produces watermarked clips and they stop being exportable after 3 days; watermark-free starts at Starter.',
      },
      {
        q: 'Which is better for turning a podcast into Shorts?',
        a: 'OpusClip for the harvesting step — that is the job it is built for and it is cheaper. Descript if you also edit the full episode there, because then the clips are a by-product of work you were doing anyway and you are not paying twice. Check your monthly media hours against Descript’s tiers first; that is usually what decides it.',
      },
      {
        q: 'Can I use both together?',
        a: 'Yes, and some people do: Descript for the long-form edit and transcript, OpusClip for fast clip discovery. At $16/month for Descript Hobbyist billed annually plus $15/month for OpusClip Starter that is roughly $31 a month, which is less than several single mid-tier plans elsewhere in this category.',
      },
    ],
    kineo:
      'Disclosure: Kineo publishes this page and is not one of the two products above. It is not an editor and not a clipper — it generates a complete faceless 9:16 Short from a typed topic, with no source recording. That makes it irrelevant to you if you have long-form video to work with, which is the entire premise of both Descript and OpusClip. It is relevant only if you arrived here with nothing to edit.',
  },
  {
    slug: 'klap-vs-opus-clip',
    a: 'klap',
    b: 'opusclip',
    title: 'Klap vs OpusClip (2026): One Publishes Its Prices, One Does Not',
    description:
      'Klap and OpusClip do the same job. We verified OpusClip’s full tier list on their own site and could not read Klap’s — here is exactly what we could confirm for each, and why that matters.',
    whyItExists:
      'Genuine demand and genuine overlap: both take a long video and return clips. The useful and unusual thing we can add is a straight account of what is actually verifiable about each one’s pricing, rather than repeating a number from a review site.',
    verdictLead:
      'These two compete directly and honestly resemble each other. OpusClip publishes a complete, readable tier list with a free plan, a $15 Starter and a $29 Pro that falls to $14.50/month billed annually. Klap’s tier table did not resolve to readable prices when we checked; what their own site states in plain text is "Klap Pro for just $29/month" and a one-video free trial. Both are worth trying. Only one of them let us tell you what it costs.',
    verdict: [
      {
        h: 'The job is the same',
        p: 'Paste a link or upload a file, get back captioned, vertically reframed short clips. Klap offers the rough guide that "a one-minute long video produces about 5 video clips". OpusClip adds auto-reframe and keyword-highlighted captions. Neither can do anything without an existing recording.',
      },
      {
        h: 'What we could verify about OpusClip',
        p: 'A free plan with 60 credits a month at up to 1080p, watermarked, where clips stop being exportable after 3 days. Starter at $15/month with 150 credits and a 30-day export window, monthly billing only. Pro at $29/month, or $14.50/month billed annually at $174/year, with 3,600 credits released up front, no export limit and 2 seats. Business is custom.',
      },
      {
        h: 'What we could verify about Klap',
        p: 'Their homepage states "Klap Pro for just $29/month" and that "You can try out Klap and create 1 video for free. No credit card required." Their pricing page shows a monthly/yearly toggle advertising "Save 50%" on annual. The tier table itself is rendered client-side and did not resolve to readable prices for us on July 26, 2026, so we are not going to invent the rest.',
      },
      {
        h: 'How to actually decide',
        p: 'Run the same source video through both free entry points and compare the clips they pick. Clip selection quality is the entire product here and it is the one thing no comparison table can tell you, because it depends on your footage. Then price the winner from its own site.',
      },
    ],
    pickA: [
      'You tried both and Klap picked better moments from your specific footage — that is the only argument that really counts.',
      'You want to test with a single free video and no card before deciding anything.',
      'Pasting a YouTube link rather than uploading a file suits your workflow.',
      'You are comfortable confirming the current tier list on their pricing page yourself.',
    ],
    pickB: [
      'You want to know the full price list before you sign up — it is published and readable.',
      'You want a recurring free tier rather than a one-off trial: 60 credits a month.',
      'You want the cheapest paid entry point in this pair that we could confirm: $15/month.',
      'Annual billing matters to you: $14.50/month at $174/year, with all 3,600 credits released up front.',
      'You need a second seat, which Pro includes.',
    ],
    differences: [
      {
        h: 'Price transparency is a feature',
        p: 'This is not a swipe. A tier table that only renders with JavaScript is a common, ordinary implementation choice, and Klap does state a Pro price in plain text on its homepage. But when you are comparing two near-identical products, being able to read the full ladder — what the cheap tier gives up, what the expensive one adds — is genuinely useful information, and here only one side offered it.',
      },
      {
        h: 'Export windows are OpusClip’s hidden cost',
        p: 'The 3-day free-plan export expiry and the 30-day Starter export limit are the two lines that push people onto Pro. If you batch-produce a month of content and post it over a quarter, budget for Pro rather than Starter. We could not find an equivalent stated limit for Klap, which is not the same as there being none.',
      },
      {
        h: 'Neither has narration or a script',
        p: 'Both reuse the audio in your source. There is no text-to-speech, no written script, no way to start from an idea. If you have no long video, both are unusable and the price question is moot.',
      },
    ],
    faq: [
      {
        q: 'How much does Klap cost?',
        a: 'Klap’s own homepage states "Klap Pro for just $29/month". We could not read the rest of its tier table — it is rendered client-side and did not resolve to readable prices when we checked on July 26, 2026 — so we are not going to state prices for the other tiers. Check klap.app/pricing directly, where a monthly/yearly toggle advertises "Save 50%" on annual billing.',
      },
      {
        q: 'How much does OpusClip cost?',
        a: 'As listed on opus.pro/pricing on July 26, 2026: Free $0 with 60 credits a month, Starter $15/month with 150 credits and monthly billing only, Pro $29/month or $14.50/month billed annually at $174/year with 3,600 credits and 2 seats, and Business at custom pricing.',
      },
      {
        q: 'Can I try both for free?',
        a: 'Yes, differently. OpusClip has a recurring free plan of 60 credits a month, watermarked, with clips that stop being exportable after 3 days. Klap states you can create 1 video for free with no credit card. Run the same source video through both and compare which one picks better moments — that is the decision.',
      },
      {
        q: 'Do Klap or OpusClip work without a long video?',
        a: 'No, neither. Both are re-clippers: they need an existing recording, either uploaded or linked. If you want short-form content and have nothing filmed, no clipper of any brand can help you — that is a different category of tool entirely.',
      },
      {
        q: 'How many clips will I get from one video?',
        a: 'Klap offers the guide that "a one-minute long video produces about 5 video clips". OpusClip does not publish an equivalent ratio on its pricing page, and in practice the number depends on how much of your footage stands alone. Treat any published ratio as a rough marketing figure rather than a guarantee.',
      },
    ],
    kineo:
      'Disclosure: this page is published by Kineo, which is neither of the tools above and is not a clipper. Kineo generates a faceless 9:16 Short from a typed topic — script, voiceover, footage, captions — so it is only relevant to you if you do not have a long video to clip. If you do have one, buy a clipper; that is what they are for.',
  },
  {
    slug: 'opus-clip-vs-quso',
    a: 'opusclip',
    b: 'quso',
    title: 'OpusClip vs quso.ai (2026): The Clipper vs The Clipper With A Scheduler',
    description:
      'OpusClip and quso.ai — the product formerly called vidyo.ai — compared on verified 2026 pricing, free tiers and export limits, including the 720p ceiling on quso’s free plan.',
    whyItExists:
      'Half the pages answering this query still call the product vidyo.ai. The rename is real and verifiable, and the actual decision — buy clipping alone or clipping bundled with publishing — is a genuine one with a clear cost answer.',
    verdictLead:
      'First, the thing most pages get wrong: vidyo.ai is now quso.ai. Requesting vidyo.ai/pricing returns a 302 redirect to quso.ai/pricing. With that settled: buy OpusClip if you want the clipping to be excellent and you already have a scheduler you like. Buy quso.ai if you would rather have clipping, a content planner and publishing to six platforms on one invoice.',
    verdict: [
      {
        h: 'OpusClip is narrow and cheap at the bottom',
        p: 'Starter is $15/month for 150 credits. There is no publishing suite, no content planner and no storage allowance to think about — it clips, reframes and captions, and that is the deal.',
      },
      {
        h: 'quso.ai is a suite, priced like one',
        p: 'Lite starts at $29/month, or $19/month annually, and includes unlimited 1080p clips, an advanced editor, publishing to 6 platforms and 10GB of storage. Essential at $39 adds filler and silence removal, external content support and a Content Planner with 25GB. Growth at $49 adds a Brand Kit, the Viddy assistant and 75GB.',
      },
      {
        h: 'The free tiers fail in different, informative ways',
        p: 'OpusClip Free renders up to 1080p but the clips are watermarked and stop being exportable after 3 days. quso.ai Free gives 75 credits a month but caps renders at 720p, with 7-day data retention. One takes away your time, the other takes away your resolution. Neither is a production tier.',
      },
      {
        h: 'Do the bundle arithmetic before you buy',
        p: 'If you already pay for a scheduler, OpusClip Starter at $15/month is the cheaper half of a stack you already own. If you do not, quso Lite at $19/month annually buys clipping and publishing together, which is genuinely hard to beat on price.',
      },
    ],
    pickA: [
      'Clip quality is the only thing you are buying and you want to spend the least on it: $15/month.',
      'You already use a scheduler and do not want to pay for a second one.',
      'You want an annual price that goes low: Pro at $14.50/month, $174/year, with 3,600 credits up front.',
      'You need two seats — Pro includes them, and quso’s published tiers are quoted per plan with storage rather than seats.',
      'You want no limit on MP4 exports, which OpusClip Pro states explicitly.',
    ],
    pickB: [
      'You want one bill for clipping, planning and publishing to six platforms.',
      'Unlimited 1080p clips from the entry paid tier suits you better than a credit balance.',
      'You want a free tier you can keep using indefinitely, and 720p is acceptable while you evaluate.',
      'AI filler and silence removal matter to you — those arrive at Essential, $39/month or $26 annually.',
      'You want a Brand Kit and templates without an enterprise conversation: Growth, $49/month or $33 annually.',
    ],
    differences: [
      {
        h: 'The rename is not cosmetic for your research',
        p: 'Because the product changed name, a lot of the reviews you will find describe vidyo.ai’s old pricing and old feature set under a URL that now redirects. Treat anything dated before the rename as unverified. We confirmed the redirect from vidyo.ai/pricing to quso.ai/pricing on July 26, 2026, and every quso figure on this page came from quso.ai’s own live pricing page on that date.',
      },
      {
        h: 'Storage is a line item on one side and not the other',
        p: 'quso.ai quotes 10GB, 25GB and 75GB by tier, and free-plan data is retained 7 days. OpusClip does not quote storage; it quotes credits and export windows. If you keep a large working archive, that is a real difference in how the two will feel over a year.',
      },
      {
        h: 'Neither states a watermark policy on paid tiers as clearly as you would like',
        p: 'OpusClip is clear: watermarked on free, watermark-free from Starter. quso.ai’s pricing page did not state a watermark policy in what we could read. If a clean export is non-negotiable for you — and for a monetised channel it should be — confirm that with quso before subscribing.',
      },
      {
        h: 'Both are useless without a source video',
        p: 'Stated for completeness because it is the fact that disqualifies this whole category for a lot of searchers. Neither writes a script, neither narrates, neither invents footage. They cut up what you already made.',
      },
    ],
    faq: [
      {
        q: 'Is vidyo.ai the same as quso.ai?',
        a: 'Yes. vidyo.ai is now quso.ai — requesting vidyo.ai/pricing returns a 302 redirect to quso.ai/pricing, which we confirmed on July 26, 2026. If you are reading a review that only mentions vidyo.ai, check its date, because the pricing and feature set will have moved on.',
      },
      {
        q: 'Is OpusClip or quso.ai cheaper?',
        a: 'OpusClip at entry: Starter is $15/month against quso Lite at $29/month, or $19/month billed annually. But quso Lite bundles publishing to 6 platforms and unlimited 1080p clips, so if you would otherwise pay for a scheduler separately the totals can invert. Both sets of figures read from their own pricing pages on July 26, 2026.',
      },
      {
        q: 'What does the quso.ai free plan actually include?',
        a: '75 credits a month, renders capped at 720p, chapters and short videos, TikTok publishing, CutMagic, and 7-day data retention. The 720p ceiling is the detail to notice — it is fine for evaluating, and not what you want on a channel.',
      },
      {
        q: 'Does quso.ai publish my clips for me?',
        a: 'Its Lite tier and above list publishing to 6 platforms, and the free tier lists TikTok publishing. Essential adds a Content Planner. That scheduling layer is the main structural difference from OpusClip, which does not publish for you at all.',
      },
      {
        q: 'Which one has better clip selection?',
        a: 'We are not going to claim an answer we cannot support. Clip selection quality depends heavily on your own footage — a two-camera podcast and a screen-recorded tutorial produce completely different results. Both have free entry points; run the same source video through each and judge it on your own content.',
      },
    ],
    kineo:
      'Disclosure: Kineo publishes this comparison and is not one of the two tools above. It is not a clipper and has no scheduler — it takes a typed topic and returns a finished faceless 9:16 Short. Mentioned here only because a share of people searching for a clipper turn out not to have anything to clip. If you do, both tools above will serve you better than Kineo will.',
  },
  {
    slug: 'creatify-vs-heygen',
    a: 'creatify',
    b: 'heygen',
    title: 'Creatify vs HeyGen (2026): Ad Machine or Avatar Platform?',
    description:
      'Creatify and HeyGen both put an AI actor on screen, but one is built to sell a product and the other is built to say a script. Verified 2026 pricing, free tiers, credits and watermark policy.',
    whyItExists:
      'These two get compared because both show a synthetic person talking, and that is where the similarity ends. One is priced and shaped as an ad-buying tool, the other as a video platform. Getting that wrong costs $39/month for a product you will not use.',
    verdictLead:
      'Buy Creatify if you are running paid media and need many variants of a product ad, fast, with tracking attached. Buy HeyGen if you need a presenter to deliver a script you wrote — training, explainers, localised announcements — and the video is the deliverable rather than an ad creative.',
    verdict: [
      {
        h: 'The pricing shape tells you who each is for',
        p: 'Creatify starts at $39/month for 100 credits and adds a media buyer and an ad tracker at the $99 Pro tier. HeyGen starts at $29/month for 600 credits with voice cloning and 175+ languages. Creatify is priced like a tool that sits next to an ad account; HeyGen is priced like a tool that sits next to a content calendar.',
      },
      {
        h: 'Input differs more than output does',
        p: 'Creatify can build an ad from a product URL or a prompt — you point it at a thing you sell. HeyGen expects a script. If you do not have a product page to point at, half of what you are paying Creatify for is inert.',
      },
      {
        h: 'Both watermark the free tier, and both remove it at the first paid step',
        p: 'Creatify Free gives 10 credits a month, roughly 2 video ads or 20 image ads, watermarked, with 300 AI actors available. HeyGen Free gives 3 videos a month at up to a minute each. Neither free tier is a plan you can ship from; both are enough to judge whether the output looks like something you would put your name on.',
      },
      {
        h: 'Video length is a hard tier gate on Creatify',
        p: 'Creatify Starter caps videos at 2 minutes and Pro at 10. HeyGen Creator allows up to 30 minutes, Business up to 60. For ad creative, 2 minutes is generous. For anything else it is a wall.',
      },
    ],
    pickA: [
      'You are buying paid media and need variant volume more than you need any single perfect video.',
      'You have a product URL that a tool can read and turn into creative.',
      'The media buyer and ad tracker at the $99 Pro tier would replace something you already pay for.',
      'A large AI actor roster matters — 300 on the free and Starter tiers, 1,500 plus 3 custom avatars on Pro.',
      'Your videos are short by nature, so the 2-minute Starter cap is irrelevant.',
    ],
    pickB: [
      'You wrote a script and you need somebody to read it convincingly.',
      'You need voice cloning, and you want it at $29/month rather than as an enterprise add-on.',
      'You are localising: 175+ languages from Creator up.',
      'You need videos longer than a couple of minutes.',
      'You want 4K without a sales conversation — Pro at $49/month.',
    ],
    differences: [
      {
        h: 'One is measured in creatives, the other in minutes',
        p: 'Creatify counts credits against ad units and caps duration by tier. HeyGen counts credits against rendering minutes — its own pricing page lists Avatar IV/V at 20 credits per minute and Avatar III at 3 credits per minute, a nearly sevenfold difference depending on which avatar generation you pick. On HeyGen, the avatar you choose is a pricing decision, not just an aesthetic one.',
      },
      {
        h: 'Rollover',
        p: 'HeyGen states that unused credits roll over for paid subscribers. Creatify’s pricing page does not describe rollover in what we could read. If your output is lumpy — nothing for three weeks, then a burst — that difference compounds.',
      },
      {
        h: 'Neither is a faceless-Shorts tool, for the same reason',
        p: 'Both put a face on screen. That is the product. A faceless channel is defined by the absence of one, so using either means either paying for the marquee feature and switching it off, or accepting that your channel now has a synthetic presenter. That is a legitimate format, but it is a different channel from the one most people mean by "faceless".',
      },
      {
        h: 'Annual discounting is advertised differently',
        p: 'Creatify advertises annual billing as saving up to 50%; HeyGen quotes Creator at $24/month billed annually against $29 monthly, roughly 17%. Read both annual pages before committing to a year — the headline percentage and the effective per-month figure are not the same claim.',
      },
    ],
    faq: [
      {
        q: 'Is Creatify cheaper than HeyGen?',
        a: 'No, at entry. Creatify Starter is $39/month against HeyGen Creator at $29/month, or $24/month billed annually. Both figures were read from their own pricing pages on July 26, 2026. Whether that ranking holds for you depends entirely on what a credit buys on each, which is not comparable unit to unit.',
      },
      {
        q: 'Can I use Creatify for something other than ads?',
        a: 'Technically yes — it renders video with AI actors. But the templates, the URL-to-ad input, the media buyer and the ad tracker are all built around advertising, and you would be paying for them either way. If ads are not your use case, you are buying the wrong half of the product.',
      },
      {
        q: 'Does HeyGen have a permanently free plan?',
        a: 'Yes. $0 for 3 videos per month at up to 1 minute each, with 1 custom digital twin, 30+ languages and 500+ stock avatars, verified on its pricing page on July 26, 2026.',
      },
      {
        q: 'Which one removes the watermark first?',
        a: 'Both at the first paid tier. Creatify includes watermark removal from Starter at $39/month; HeyGen includes it from Creator at $29/month.',
      },
      {
        q: 'Can either make a faceless YouTube Short?',
        a: 'Both export 9:16, so mechanically yes. But you would be paying a premium for an avatar engine and then not using an avatar, which makes both of them expensive ways to do a job neither was designed for.',
      },
    ],
    kineo:
      'Disclosure: this page is published by Kineo, which is neither of the two tools above. Kineo is relevant only to the last question — it makes faceless 9:16 Shorts from a typed topic with no presenter at all, which is why it is a different answer rather than a cheaper version of the same one. If you want a face on screen, both tools above do that far better.',
  },
  {
    slug: 'pictory-vs-submagic',
    a: 'pictory',
    b: 'submagic',
    title: 'Pictory vs Submagic (2026): Make the Video or Finish It?',
    description:
      'Pictory turns text into a narrated video; Submagic makes a video you already have look native to the feed. Verified 2026 pricing, free tiers, quotas and the question that decides which you need.',
    whyItExists:
      'People searching this are usually asking the wrong question. These are sequential tools, not competing ones — the useful answer is which stage of the problem you are actually stuck at, and the pricing models make that concrete.',
    verdictLead:
      'Buy Pictory if you have words and no video. Buy Submagic if you have video and it looks unfinished. They solve consecutive problems, and a lot of people end up wanting both — which is worth knowing before you pick one and wonder why it did not solve the other half.',
    verdict: [
      {
        h: 'The dividing line is what you already have',
        p: 'Pictory takes a script, a URL or a document and produces a narrated video with stock visuals — text in, video out. Submagic takes a finished video and adds captions, b-roll and audio cleanup — video in, better video out. If you have nothing but an idea, Submagic has nothing to work on.',
      },
      {
        h: 'Neither has a genuinely free plan in the same sense',
        p: 'Submagic has a real free tier: $0 for 3 watermarked videos a month, capped at 200MB and 1 minute 30 seconds each. Pictory lists a 14-day free trial and no permanently free plan. That makes Submagic cheaper to evaluate indefinitely and Pictory a decision you have to make inside a fortnight.',
      },
      {
        h: 'They meter you completely differently',
        p: 'Pictory sells video minutes per month — 200 on Starter, 600 on Professional, 1,800 on Team. Submagic sells videos per month with a maximum length each — 15 videos up to 2 minutes on Starter, 40 up to 5 minutes on Pro, 100 up to 30 minutes on Business. Fifteen Shorts a month is a real ceiling if you are posting daily; 200 minutes is not.',
      },
      {
        h: 'On raw entry price Submagic is the cheaper start',
        p: 'Submagic Starter is $19/member/month, or $12/member/month billed yearly. Pictory Starter is $29/month, or $25/month billed annually. But note "per member" on Submagic — if two of you need access, that gap closes or reverses.',
      },
    ],
    pickA: [
      'You have written material — a blog post, a script, a document — and you want it narrated over visuals.',
      'You want the AI voiceover generated for you rather than recording it yourself.',
      'You publish in volume: 200 video minutes a month at Starter is a lot of Shorts.',
      'You need more than one aspect ratio out of the same source.',
      'You would use long-video input, which Pictory adds from the Professional tier up.',
    ],
    pickB: [
      'You already film, and what is missing is the caption styling that makes a clip look native.',
      'You want audio cleanup and silence removal — both land at the Pro tier.',
      'You want the cheapest credible starting point: $12/member/month billed yearly.',
      'You want to try before paying anything, indefinitely — 3 videos a month on the free plan.',
      'You need 4K or 60fps, which Submagic lists on Business and Pictory does not headline at all.',
    ],
    differences: [
      {
        h: 'Submagic prices per member; Pictory prices per plan',
        p: 'Submagic quotes Starter and, by the same structure, its higher tiers per member. Pictory quotes a plan price and puts seat counts in the tier — Team at $199/month, or $119/month annually, is where 3+ users live. For a solo operator Submagic is cheaper. For a three-person team the arithmetic is worth doing properly rather than eyeballing.',
      },
      {
        h: 'The free-plan ceilings bite in different places',
        p: 'Submagic free caps you at 1 minute 30 seconds and 200MB per video — fine for a Short, useless for anything longer. Pictory has no free plan to cap. If your evaluation needs to run past two weeks, that difference decides it.',
      },
      {
        h: 'Stock media is a tier gate on Submagic and a baseline on Pictory',
        p: 'Pictory’s whole premise is matching stock visuals to your text, on every paid tier. Submagic includes free stock media lower down and adds the Storyblocks library from Pro at $39/month, or $23/month yearly. If licensed b-roll is what you came for, that is a $39 answer on one side and a $29 answer on the other.',
      },
      {
        h: 'Using both is a legitimate answer',
        p: 'Pictory to build the video from text, Submagic to style the captions and clean the audio. That is roughly $48/month at monthly list, or $37 with both billed on their annual rates. We are saying so plainly because the alternative — buying one, discovering it does not do the other half, and buying the second anyway — is what usually happens.',
      },
    ],
    faq: [
      {
        q: 'Does Pictory have a free plan?',
        a: 'No permanently free plan is listed. Its pricing page shows a 14-day free trial on every tier, checked on July 26, 2026. Submagic does have a free plan: 3 watermarked videos a month.',
      },
      {
        q: 'Which is cheaper, Pictory or Submagic?',
        a: 'Submagic at entry — $19/member/month, or $12/member/month billed yearly, against Pictory Starter at $29/month, or $25/month billed annually. Both read from their own pricing pages on July 26, 2026. Note that Submagic’s figure is per member.',
      },
      {
        q: 'Can Submagic make a video from scratch?',
        a: 'No. It needs a video to work on. It adds captions, b-roll and audio cleanup to something you already have. If you have only a script, it cannot help you yet.',
      },
      {
        q: 'Can Pictory add captions like Submagic does?',
        a: 'Pictory produces captioned video, but caption styling is Submagic’s entire product — 100+ templates, hook titles, keyword highlighting. If the visual identity of your captions is the reason you are shopping, that is the side of the table it lives on.',
      },
      {
        q: 'How many Shorts a month do I get on each entry plan?',
        a: 'Submagic Starter: 15 videos a month, up to 2 minutes each. Pictory Starter: 200 video minutes a month, which at 35 seconds a Short is well over a hundred. If daily posting is the plan, that difference is the whole decision.',
      },
    ],
    kineo:
      'Disclosure: Kineo publishes this page and is not one of the two tools compared. It belongs to the Pictory side of the line — topic in, finished video out — but narrower: 9:16 only, one typed sentence as the whole input, no document import and no long-video handling. Mentioned because "I have no footage" is the situation that sends people to this comparison in the first place.',
  },
  // ─── KINEO HEAD-TO-HEADS (declared in the slug — nobody is ambushed) ────────
  {
    slug: 'heygen-vs-kineo',
    a: 'heygen',
    b: 'kineo',
    title: 'HeyGen vs Kineo (2026): A Face on Screen, or No Face at All',
    description:
      'HeyGen renders a synthetic presenter reading your script. Kineo renders a faceless 9:16 Short from a typed topic. Verified 2026 pricing on both, and an honest account of what each is worse at.',
    whyItExists:
      'The single clearest fork in AI video: presenter or no presenter. Anyone weighing these two is really deciding what their channel looks like, not which vendor is better, and that deserves a straight answer rather than a feature grid.',
    verdictLead:
      'Buy HeyGen if a person should be on screen — a spokesperson, a course, a localised announcement, a face your audience recognises. Buy Kineo if the format is faceless Shorts and the bottleneck is producing them at all. We publish this page, so read the HeyGen column as the case against us and check it on their site.',
    verdict: [
      {
        h: 'They are not substitutes and the price gap is not the reason',
        p: 'HeyGen Creator is $29/month, or $24 billed annually. Kineo Starter is $9.90/month, $4.90 for a first month. That gap is real but it is not the argument — you cannot get a talking avatar out of Kineo at any price, and you cannot get a faceless stock-footage Short out of HeyGen without fighting the product.',
      },
      {
        h: 'HeyGen is the better product on almost every axis except one',
        p: 'More languages, voice cloning, longer videos, 4K, multiple aspect ratios, a far larger company behind it. We are not going to pretend otherwise. The one axis where that reverses is a faceless vertical Short assembled from a sentence, which is the only thing Kineo does.',
      },
      {
        h: 'Kineo’s constraint is the point',
        p: '9:16 only. No timeline. No avatar. One typed topic in, a finished Short out — script, AI voiceover, footage matched scene by scene to the actual narration lines, captions. If you want any of the flexibility HeyGen sells, that constraint will read as a missing feature, and you would be right.',
      },
      {
        h: 'Free tiers reveal the intent of each',
        p: 'HeyGen Free: 3 videos a month, 1 minute each, 1 custom digital twin, 500+ stock avatars. Kineo free: up to 3 watermarked Fast videos every 24 hours, no card. One is sized for evaluating an avatar; the other for finding out whether a daily posting habit is survivable.',
      },
    ],
    pickA: [
      'A recognisable presenter is part of the brand, or the content needs a human to carry authority.',
      'You are localising into many languages — 175+ from Creator up, with voice cloning at the same tier.',
      'Videos run long: up to 30 minutes on Creator, 60 on Business.',
      'You need 4K, or aspect ratios other than 9:16.',
      'You want the larger, more established platform, and you are willing to pay list for it.',
    ],
    pickB: [
      'The format is faceless: stock footage, AI narration, captions, no presenter.',
      'You have a topic, not a script, and writing the script is the part you keep not doing.',
      'Your ceiling is budget: $9.90/month, or $4.90 for a first month, against $29.',
      'You publish 9:16 and nothing else, so a tool that does only 9:16 costs you nothing.',
      'You want to test whether you can actually keep a channel going before paying anything — 3 free videos a day, no card.',
    ],
    differences: [
      {
        h: 'What appears on screen',
        p: 'HeyGen: an avatar, framed as a person talking. Kineo: stock and generative footage matched to each voiceover line, with captions over it. This is a format decision about your channel, and it should be made before it is made for you by whichever tool you happened to sign up for.',
      },
      {
        h: 'How each meters you',
        p: 'HeyGen sells credits against rendering minutes, with Avatar IV/V at 20 credits per minute and Avatar III at 3 — so the avatar you pick changes the cost of a video sevenfold. Kineo sells credits against render type: a Fast video is 1 credit, AI Generated 20, Cinematic 50, AI Presenter 70, a Hollywood film 150. HeyGen rolls unused credits over for paid subscribers; Kineo credits do not roll over. That is a genuine point against Kineo if your output is lumpy.',
      },
      {
        h: 'What each refuses to do',
        p: 'Kineo will not give you a horizontal video, a timeline editor or a talking head. HeyGen will not assemble a faceless montage from a one-line topic. Both refusals are deliberate; neither is going to change because you wanted it to.',
      },
      {
        h: 'Where the script comes from',
        p: 'HeyGen assumes you arrive with one. Kineo writes it from the topic, then narrates what it wrote and matches footage to those exact lines. If you already have scripts you are happy with, that half of Kineo is redundant and HeyGen is the cleaner fit.',
      },
    ],
    faq: [
      {
        q: 'Can HeyGen make faceless videos?',
        a: 'It can export 9:16 without an avatar in frame, but avatars are what you are paying for — the pricing tiers are built around avatar counts, digital twins and per-minute avatar rendering costs. Using it faceless means buying the expensive part and switching it off.',
      },
      {
        q: 'Is Kineo cheaper than HeyGen?',
        a: 'Yes at list: Kineo Starter is $9.90/month, $4.90 for the first month, against HeyGen Creator at $29/month, or $24/month billed annually, verified on heygen.com/pricing on July 26, 2026. But they are not priced for the same job, so the comparison is only useful if either tool could actually do what you need.',
      },
      {
        q: 'Does Kineo have avatars at all?',
        a: 'There is an AI Presenter render type, priced at 70 credits. It is not the centre of the product and it is not comparable to HeyGen’s avatar library, digital twins or voice cloning. If a presenter is the reason you are shopping, buy HeyGen.',
      },
      {
        q: 'Which has a better free tier?',
        a: 'They are not comparable. HeyGen gives 3 one-minute videos a month with access to its avatar roster; Kineo gives up to 3 watermarked Fast videos every 24 hours. Kineo’s is more generous by volume, HeyGen’s by capability.',
      },
      {
        q: 'Do Kineo credits roll over?',
        a: 'No. They reset monthly. HeyGen states unused credits roll over for paid subscribers, which is a real advantage for irregular usage and one we are not going to bury.',
      },
    ],
    kineo:
      'This is a declared head-to-head — Kineo publishes it and Kineo is one of the two tools. We have tried to make the HeyGen case as strongly as we would if they wrote it, and every HeyGen figure here came from heygen.com/pricing on July 26, 2026. Verify it there before you decide; we would rather lose the sale than have you arrive on the wrong tool.',
  },
  {
    slug: 'kineo-vs-opus-clip',
    a: 'kineo',
    b: 'opusclip',
    title: 'Kineo vs OpusClip (2026): Do You Have a Video to Cut Up?',
    description:
      'OpusClip cuts long videos you already recorded into vertical clips. Kineo generates a faceless Short from a typed topic. Verified 2026 pricing, free tiers and export limits on both.',
    whyItExists:
      'OpusClip is the default recommendation for "AI Shorts", and for roughly half the people who follow it, it is unusable on day one because they have no long video. That is a one-question comparison and nobody asks the question first.',
    verdictLead:
      'Buy OpusClip if you already produce long-form — podcasts, streams, webinars, YouTube uploads — and the shorts are a distribution problem. Buy Kineo if there is no long video and there never will be. We publish this page; the deciding fact is about your library, not about us.',
    verdict: [
      {
        h: 'One question settles it',
        p: 'Do you have hours of recorded footage you have not clipped? If yes, OpusClip is the higher-leverage purchase by a wide margin — the raw material is already paid for. If no, OpusClip has literally nothing to operate on, and no plan tier changes that.',
      },
      {
        h: 'OpusClip is the stronger product for its job',
        p: 'Auto-reframe, AI captions with keyword highlighting, 60 free credits a month at 1080p, and a virality score on clips. For a podcaster with a back catalogue this is close to free money. We are not going to argue otherwise on our own comparison page.',
      },
      {
        h: 'The free tiers have opposite shapes',
        p: 'OpusClip free gives 60 credits a month at up to 1080p, but the clips are watermarked and stop being exportable after 3 days. Kineo free gives up to 3 watermarked Fast videos every 24 hours with no card. OpusClip’s is a better look at the product; Kineo’s is a better look at whether you can sustain a posting schedule.',
      },
      {
        h: 'On price at entry, Kineo is lower and that is not the main point',
        p: 'OpusClip Starter is $15/month, monthly billing only, for 150 credits. Pro is $29/month or $14.50/month billed annually at $174/year, with 3,600 credits released up front. Kineo Starter is $9.90/month, $4.90 for a first month. OpusClip Pro billed annually is close enough to Kineo Starter that price should not decide this — the source-footage question should.',
      },
    ],
    pickA: [
      'You have no long-form footage and no plan to record any.',
      'The bottleneck is writing and producing at all, not distributing something that exists.',
      'You publish 9:16 exclusively, so a 9:16-only tool costs you nothing.',
      'You want to try a daily posting rhythm before paying — 3 free videos every 24 hours, no card.',
      'You want a clean MP4 on the cheapest paid plan: every Kineo paid tier is watermark-free.',
    ],
    pickB: [
      'You already record long-form and it is sitting unclipped. This is the whole case.',
      'Your face and voice are the channel, and clips of you are what the audience wants.',
      'You want the free tier to show you real 1080p output before you pay — 60 credits a month.',
      'You would use the annual Pro rate: $14.50/month billed annually, with 3,600 credits released up front.',
      'You need the clip archive to stay exportable: OpusClip Pro removes the MP4 export time limit entirely.',
    ],
    differences: [
      {
        h: 'Where the footage comes from',
        p: 'Every frame OpusClip outputs came from a video you uploaded. Every frame Kineo outputs is stock or generative footage matched to a voiceover line it wrote. That is the structural difference and it determines everything else.',
      },
      {
        h: 'The export clock',
        p: 'A detail worth knowing before you rely on the free tier: OpusClip free clips stop being exportable after 3 days, and Starter puts a 30-day limit on MP4 exports. Only Pro removes it. Kineo does not time-limit exports on paid plans. If you batch-produce and publish weeks later, check this on their pricing page first.',
      },
      {
        h: 'Whose voice narrates',
        p: 'OpusClip uses whatever audio is in your source — it does not narrate a written script. Kineo generates AI voiceover from the script it wrote. If you want your own voice, OpusClip is the only one of the two that gives it to you.',
      },
      {
        h: 'Credits mean different things',
        p: 'OpusClip credits meter clip processing: 60 free a month, 150 on Starter, 3,600 up front on Pro. Kineo credits meter render type: Fast 1, AI Generated 20, Cinematic 50, AI Presenter 70, Hollywood 150, and they do not roll over. Do not read the credit numbers across the table as if they were the same unit.',
      },
    ],
    faq: [
      {
        q: 'Can OpusClip make a video from just a topic?',
        a: 'No. Its input is a long video you upload or link. If you have no source footage, there is nothing for it to clip and no tier that changes that.',
      },
      {
        q: 'Is OpusClip’s free plan good enough to run a channel on?',
        a: '60 credits a month at up to 1080p is a genuine trial, but clips are watermarked and stop being exportable after 3 days. Read from opus.pro/pricing on July 26, 2026. It is built for evaluating, not for publishing.',
      },
      {
        q: 'Which is cheaper?',
        a: 'Kineo Starter at $9.90/month, $4.90 for a first month, against OpusClip Starter at $15/month. OpusClip Pro billed annually works out to $14.50/month at $174/year. Both sets of figures from their own pricing pages on July 26, 2026.',
      },
      {
        q: 'Could I use both?',
        a: 'Yes, and it is a reasonable setup if you record long-form some weeks and not others — OpusClip for the weeks with footage, Kineo for the weeks without. We would rather say that than pretend it is either-or.',
      },
      {
        q: 'Does Kineo need me to write a script?',
        a: 'No. A topic sentence is the entire input. If you already have scripts you like, that part of the product is redundant for you.',
      },
    ],
    kineo:
      'This is a declared head-to-head — Kineo publishes it and is one of the two tools. Every OpusClip figure here was read off opus.pro/pricing on July 26, 2026; check it there, because their tiers change. If you have a back catalogue of long video, OpusClip is the better buy and we would rather you knew that now.',
  },
  {
    slug: 'kineo-vs-pictory',
    a: 'kineo',
    b: 'pictory',
    title: 'Kineo vs Pictory (2026): Text to Video, Two Different Widths',
    description:
      'Pictory turns articles, scripts and documents into narrated video across formats. Kineo turns one typed topic into a finished 9:16 Short. Verified 2026 pricing, quotas and trial terms.',
    whyItExists:
      'The closest genuine competitor to what Kineo does, which makes it the comparison we owe the most honesty on. The split is width versus depth: Pictory handles more input types and more formats, Kineo handles one input and one format end to end.',
    verdictLead:
      'Buy Pictory if you have written material to repurpose — blog posts, documents, long scripts — and you want control over the result across more than one aspect ratio. Buy Kineo if the input is a sentence and the output is a Short. We publish this page, so treat the Pictory column as their case and verify it at pictory.ai/pricing.',
    verdict: [
      {
        h: 'Pictory takes more kinds of input, and that is a real advantage',
        p: 'Script, URL or document on every tier, plus long-video input from the Professional tier up. Kineo takes a topic sentence and nothing else. If you have a library of written content you want on video, Pictory is built for exactly that and Kineo is not.',
      },
      {
        h: 'Kineo writes the thing Pictory expects you to bring',
        p: 'Pictory needs words. Kineo generates the script from a topic, then narrates it and matches footage line by line. For someone who has ideas but no drafts, that is the difference between publishing and not. For someone with a full content calendar already written, it is a feature they will not use.',
      },
      {
        h: 'Trial terms differ in a way that matters',
        p: 'Pictory lists a 14-day free trial and no permanently free plan. Kineo offers up to 3 watermarked Fast videos every 24 hours indefinitely, no card. If you want to test over a month rather than a fortnight, that is a practical difference, not a marketing one.',
      },
      {
        h: 'On volume, Pictory’s quota is larger and differently shaped',
        p: 'Pictory Starter is $29/month, or $25/month annually, for 200 video minutes a month. At 35 seconds a Short that is well over three hundred. Kineo Starter is $9.90/month for 25 credits, where a Fast video is 1 credit and a Cinematic one is 50. Cheaper per month, and metered by render quality rather than duration.',
      },
    ],
    pickA: [
      'Your input is a topic, not a document — and writing the script is the step that keeps not happening.',
      'You publish 9:16 vertical and nothing else.',
      'Budget is the binding constraint: $9.90/month, or $4.90 for a first month, against $29.',
      'You want an open-ended free tier rather than a 14-day clock.',
      'You want footage matched to the actual narration lines rather than to a paragraph of source text.',
    ],
    pickB: [
      'You have written material — articles, documents, scripts — waiting to become video.',
      'You need more than one aspect ratio from the same source.',
      'You need long-video input, which Pictory adds from the Professional tier up.',
      'You want a large monthly ceiling: 200 minutes on Starter, 600 on Professional, 1,800 on Team.',
      'You are buying for a team: Team is $199/month, or $119/month annually, for 3+ users. Kineo has no comparable seat tier.',
    ],
    differences: [
      {
        h: 'Metering: minutes versus render type',
        p: 'Pictory counts video minutes per month regardless of how the video was made. Kineo counts credits by render engine — Fast 1, AI Generated 20, Cinematic 50, AI Presenter 70, Hollywood 150 — and credits do not roll over. Pictory’s model is easier to predict; Kineo’s lets you spend nothing on drafts and a lot on the one you publish.',
      },
      {
        h: 'Aspect ratio',
        p: 'Pictory supports multiple ratios. Kineo is 9:16 only, deliberately. If you also publish horizontal, that alone rules Kineo out and there is no workaround.',
      },
      {
        h: 'Team support',
        p: 'Pictory has a Team tier with seats. Kineo does not publish one. If more than one person needs access, Pictory is the answer by default.',
      },
      {
        h: 'What each does with your text',
        p: 'Pictory reads the text you supply and matches stock visuals to it. Kineo writes the text first, then matches footage scene by scene to the voiceover lines it produced. Both end in narrated stock video; the order of operations is the actual product difference.',
      },
    ],
    faq: [
      {
        q: 'Does Pictory have a free plan?',
        a: 'No permanently free plan is listed. A 14-day free trial appears on every tier, verified at pictory.ai/pricing on July 26, 2026.',
      },
      {
        q: 'Which is cheaper?',
        a: 'Kineo Starter is $9.90/month, $4.90 for a first month, against Pictory Starter at $29/month, or $25/month billed annually. Pictory buys you a much larger monthly minute allowance and more input formats for that difference, so cheaper is not automatically better here.',
      },
      {
        q: 'Can Kineo turn a blog post into a video?',
        a: 'Not as a document import. Its input is a topic sentence. If repurposing existing written material is the job, Pictory is built for it and Kineo is not.',
      },
      {
        q: 'Can Pictory make vertical Shorts?',
        a: 'Yes — it supports multiple aspect ratios including vertical. Its 200-minute Starter allowance is more than enough for a daily Shorts schedule.',
      },
      {
        q: 'Which one writes the script?',
        a: 'Kineo. Pictory expects you to supply the words, whether as a script, a URL or a document, and builds the video around them.',
      },
    ],
    kineo:
      'Declared head-to-head: Kineo publishes this page and is one of the two tools. Pictory is the nearest thing to a direct competitor we have, and on input flexibility, aspect ratios and team seats it is straightforwardly the broader product. Every Pictory figure here was read at pictory.ai/pricing on July 26, 2026.',
  },
  {
    slug: 'kineo-vs-submagic',
    a: 'kineo',
    b: 'submagic',
    title: 'Kineo vs Submagic (2026): Make the Short, or Style It?',
    description:
      'Submagic makes a clip you already have look native to the feed. Kineo produces the clip from a typed topic. Verified 2026 pricing, free tiers, quotas and where the two overlap.',
    whyItExists:
      'Submagic is the most-recommended tool in short-form and most of that advice omits the prerequisite: you need a video first. Anyone comparing these two is deciding whether their problem is production or presentation.',
    verdictLead:
      'Buy Submagic if you already film and the clips just look unfinished. Buy Kineo if there is no clip yet. We publish this, so the honest framing is that these are consecutive steps and Submagic is excellent at the step it owns.',
    verdict: [
      {
        h: 'Submagic cannot start from nothing',
        p: 'It takes a finished video and adds captions, b-roll, audio cleanup and hook titles. There is no tier at which it produces a video from an idea. If you are staring at a blank page, that is the end of the comparison.',
      },
      {
        h: 'Submagic is the better caption product, by a distance',
        p: '100+ caption templates, keyword highlighting, hook titles, silence removal, audio cleanup, and the Storyblocks library from Pro. Kineo captions its own output competently and does not compete with any of that. If caption styling is why you are shopping, buy Submagic.',
      },
      {
        h: 'The volume ceilings are shaped differently',
        p: 'Submagic Starter is $19/member/month, or $12/member/month billed yearly, for 15 videos a month up to 2 minutes each. Pro is $39/month, or $23 yearly, for 40 videos. Kineo Starter is $9.90/month for 25 credits, with a Fast video costing 1. If you post daily, 15 videos a month on Submagic Starter is the constraint to check first.',
      },
      {
        h: 'Both free tiers watermark, with different caps',
        p: 'Submagic free: 3 videos a month, watermarked, 200MB and 1 minute 30 seconds maximum each. Kineo free: up to 3 watermarked Fast videos every 24 hours, no card. Kineo’s free tier is more generous by volume; Submagic’s shows you the thing it is actually best at.',
      },
    ],
    pickA: [
      'There is no video yet. This is the whole case for Kineo on this page.',
      'You do not film, do not want to, and the channel is faceless by design.',
      'You want script, voiceover, footage and captions from one typed sentence.',
      'You post daily and want the free tier to prove you can keep it up — 3 videos every 24 hours.',
      'Budget is tight: $9.90/month, or $4.90 for a first month.',
    ],
    pickB: [
      'You already film, and captions are the missing 20%.',
      'You want the best caption styling available and are willing to pay for it.',
      'You want audio cleanup and silence removal — both arrive at Pro.',
      'You need licensed b-roll: the Storyblocks library is included from Pro.',
      'You need 4K or 60fps output, which Submagic lists on its Business tier.',
    ],
    differences: [
      {
        h: 'The prerequisite',
        p: 'Submagic requires a source video. Kineo requires a sentence. Everything else on this page is downstream of that one fact, and it is the fact most comparison articles skip.',
      },
      {
        h: 'Per member versus per account',
        p: 'Submagic quotes Starter at $19/member/month, or $12/member/month billed yearly. If two people need access that doubles. Kineo quotes a flat plan price and does not publish a seat tier at all, which is a limitation for teams and a saving for solo operators.',
      },
      {
        h: 'Quality ceilings',
        p: 'Submagic exports 1080p/30fps from Starter, 1080p and 2K from Pro, and 4K/60fps on Business. Kineo exports 9:16 and nothing else, with render quality set by which engine you spend credits on. If 4K is a requirement, Submagic is the only one of the two that lists it.',
      },
      {
        h: 'They stack',
        p: 'Generating a Short in Kineo and then running it through Submagic for caption styling is a coherent workflow, and cheaper than most people assume — roughly $22/month at monthly list for Kineo Starter plus Submagic Starter. We would rather say that than pretend you have to choose.',
      },
    ],
    faq: [
      {
        q: 'Can Submagic create a video from a script?',
        a: 'No. It works on a video you upload. Its free plan caps uploads at 200MB and 1 minute 30 seconds, verified at submagic.co/pricing on July 26, 2026.',
      },
      {
        q: 'Which is cheaper?',
        a: 'Kineo Starter at $9.90/month, $4.90 for a first month, against Submagic Starter at $19/member/month, or $12/member/month billed yearly. Note the "per member" on Submagic’s side.',
      },
      {
        q: 'Does Kineo add captions automatically?',
        a: 'Yes, on its own output. It does not accept an uploaded video to caption, and it does not offer anything like Submagic’s 100+ caption templates.',
      },
      {
        q: 'How many videos a month do I get?',
        a: 'Submagic Starter: 15 videos a month, up to 2 minutes each. Kineo Starter: 25 credits, and a Fast video costs 1 credit — higher-quality render types cost considerably more, from 20 credits for AI Generated up to 150 for a Hollywood film.',
      },
      {
        q: 'Can I use both together?',
        a: 'Yes. Generate in Kineo, style in Submagic. That is the setup we would recommend to anyone who wants Submagic-grade captions on faceless content they did not film.',
      },
    ],
    kineo:
      'Declared head-to-head: Kineo publishes this page and is one of the two tools. Submagic is the better product at what it does and we have not tried to argue otherwise — the only claim here is that it needs a video first. Every Submagic figure was read at submagic.co/pricing on July 26, 2026.',
  },
]

/** Canonical slugs, in the order the hub renders them. */
export const CANONICAL_SLUGS: string[] = PAIRS.map((p) => p.slug)

/**
 * The reverse of a canonical pair slug: "opus-clip-vs-submagic" ->
 * "submagic-vs-opus-clip". Safe to split on the literal "-vs-" because no tool
 * slug contains that substring.
 */
export function reverseSlug(slug: string): string {
  const i = slug.indexOf('-vs-')
  if (i === -1) return slug
  return slug.slice(i + 4) + '-vs-' + slug.slice(0, i)
}

/** Reverse-order aliases. Each redirects to its canonical URL rather than 404ing or duplicating. */
export const ALIAS_SLUGS: string[] = CANONICAL_SLUGS.map(reverseSlug)

/** Every slug the /vs/[pair] route answers on: canonical first, then aliases. */
export const ALL_PAIR_SLUGS: string[] = [...CANONICAL_SLUGS, ...ALIAS_SLUGS]

export function isCanonical(slug: string): boolean {
  return CANONICAL_SLUGS.includes(slug)
}

/** Look up a pair by its canonical slug. Returns undefined for aliases and unknown slugs. */
export function getPair(slug: string): Pair | undefined {
  return PAIRS.find((p) => p.slug === slug)
}

/**
 * Resolve any slug this route answers on to its canonical form, or null if the
 * slug is not one of ours.
 */
export function canonicalFor(slug: string): string | null {
  if (isCanonical(slug)) return slug
  const r = reverseSlug(slug)
  return isCanonical(r) ? r : null
}

