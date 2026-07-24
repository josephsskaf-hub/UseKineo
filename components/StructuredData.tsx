// StructuredData — schema.org JSON-LD for Google rich results / AI search.
// Server-safe (no hooks, no client APIs): renders <script type="application/ld+json"> tags.
//
// Guidelines followed (Google Search Central, checked 2026-07):
// - SoftwareApplication: name + offers are the load-bearing fields; aggregateRating
//   is deliberately OMITTED because we have no verifiable third-party ratings and
//   fabricated ratings are a manual-action risk.
// - FAQPage: questions/answers below are copied VERBATIM from the FAQ section
//   rendered in app/KineoLanding.tsx (#faq) — Google requires JSON-LD to mirror
//   visible page content. (FAQ rich results are deprecated for non-gov/health
//   sites, but the markup remains valid and is parsed by Google + AI engines.)
//
// KINEO-AEO-2026-07-24 (PUSH #86) — answer-engine pass:
//   1. offers upgraded from a bare AggregateOffer to AggregateOffer + three named
//      Offer entries. Answer engines quote plan NAMES and prices ("Kineo Starter
//      is $9.90/mo"); lowPrice/highPrice alone gives them nothing to name.
//   2. FAQPage schema finally shipped — the comment above promised it since this
//      file was written, but only two scripts were ever rendered. The homepage
//      has a visible FAQ, so the markup mirrors real content and stays compliant.
//   3. Organization/SoftwareApplication gain alternateName 'ShortsForgeAI' so
//      entity resolvers merge the pre-rename brand into one entity, not two.

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Kineo',
  // The product shipped as ShortsForgeAI before the rename and is still cited
  // that way in older articles and directory listings. Declaring the alias keeps
  // both names resolving to one entity.
  alternateName: 'ShortsForgeAI',
  url: 'https://www.usekineo.com',
  logo: 'https://www.usekineo.com/icon-512.png',
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kineo',
  alternateName: 'ShortsForgeAI',
  url: 'https://www.usekineo.com',
  applicationCategory: 'MultimediaApplication',
  applicationSubCategory: 'AI Video Generator',
  operatingSystem: 'Web',
  description:
    'Kineo is an AI YouTube Shorts generator for repeatable shows with the same face, voice and style, including script, voiceover, scenes and captions.',
  featureList: [
    'Topic-to-video: one typed idea becomes a finished 9:16 Short',
    'AI script writing with hook and payoff structure',
    'AI voiceover narration',
    'Automatic footage matching and AI-generated scenes',
    'Burned-in captions',
    'Watermark-free MP4 export on paid plans',
  ],
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '4.90',
    highPrice: '37.90',
    priceCurrency: 'USD',
    offerCount: 3,
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '9.90',
        priceCurrency: 'USD',
        description:
          'Starter — $4.90 for the first month, then $9.90/month. 25 credits per billing month, watermark-free MP4 exports.',
        url: 'https://www.usekineo.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Creator',
        price: '24.90',
        priceCurrency: 'USD',
        description:
          'Creator — $9.90 for the first month, then $24.90/month. 150 credits per billing month, including one Hollywood film.',
        url: 'https://www.usekineo.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Studio',
        price: '37.90',
        priceCurrency: 'USD',
        description:
          'Studio — $37.90/month. 200 credits per billing month for Cinematic and AI Generated renders.',
        url: 'https://www.usekineo.com/pricing',
      },
    ],
  },
}

// Mirrors app/KineoLanding.tsx #faq verbatim. If the visible FAQ changes,
// change this too — JSON-LD that does not match the page is a spam signal.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is the video really mine to post?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Never-paid free users can download, share and post the watermarked MP4. Paid plans unlock the clean, watermark-free MP4 for YouTube, TikTok or Reels.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need any editing skills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'None. You type one idea and the AI writes the script, records the voice, finds the footage and adds captions. Free downloads carry a watermark; paid plans unlock the clean MP4.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a watermark?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free access gives new users up to 3 watermarked Fast videos every 24 hours, with no card. You can download and share them. Paid plans export clean, watermark-free MP4s.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use my own script?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — paste your script and pick "Use my script as is" and the AI narrates it word for word.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if a generation fails?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your credits come back automatically the moment a render fails — no support ticket, no waiting. You only pay for videos you actually get.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Anytime, in one click. Plans are month to month and your credits refresh every month.',
      },
    },
  ],
}

// Escape "<" so a value could never close the script tag early (defense in
// depth — all values above are static strings we control).
function jsonLd(schema: object): { __html: string } {
  return { __html: JSON.stringify(schema).replace(/</g, '\\u003c') }
}

export default function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(organizationSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(softwareApplicationSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema)}
      />
    </>
  )
}
