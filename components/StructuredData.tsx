import { getFreeTierOffer, swapFreeTierCopy as ft , TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

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
//
// KINEO-AEO-PRICE-TRUTH-2026-08-19 — ACHADO GRAVE, e a razão desta revisão.
//
// Nos últimos 7 dias, 205 dos 245 cadastros vieram de recomendação de máquina
// (60 do ChatGPT, 145 do TAAFT). Ou seja: hoje quem descreve a Kineo para o
// mundo é um modelo de linguagem lendo ESTE arquivo. E este arquivo estava
// mentindo. Os preços aqui congelaram na tabela V3 e nunca acompanharam a V5
// aprovada em 17/08 — anunciavam Creator $24.90/150cr e Studio $37.90/200cr
// (hoje $19.90/140 e $39.90/320), Starter com 25 créditos (hoje 60), e pior:
// prometiam "$4.90 for the first month" e "$9.90 for the first month", uma
// oferta que MORREU na V5 e que o CLAUDE.md proíbe explicitamente de reaparecer
// em copy. Alguém perguntando ao ChatGPT "quanto custa a Kineo?" recebia um
// preço errado e um desconto inexistente — e depois batia no checkout real.
// Preço errado na resposta da máquina não é SEO ruim, é promessa quebrada no
// momento exato da decisão de compra.
//
// A correção estrutural (não só o conserto do número): os offers agora são
// DERIVADOS de lib/checkoutPricing.ts, a mesma fonte que o Stripe usa. Não há
// mais número digitado à mão neste arquivo, então o schema não tem como voltar
// a divergir do checkout — no dia em que o preço mudar, muda aqui junto.
//
// O featureList também estava dois produtos atrás: não citava nenhum motor pelo
// nome (é justamente assim que o usuário pergunta — "gerador com Veo 3.1"), nem
// Images, Audio, Enhance ou a regra dos 60s+ para o TikTok Rewards. Um modelo
// não pode recomendar a gente por uma capacidade que não sabe que temos.

/** Centavos → "19.90". Único ponto de formatação de preço deste arquivo. */
const usd = (cents: number) => (cents / 100).toFixed(2)

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
    'Seven AI video engines in one account: Veo 3.1, Kling 3, MiniMax H3, Kling 2.5, Seedance 1.5, Kineo 1 and Avatar',
    'AI script writing with hook and payoff structure',
    'Use your own script word for word, narrated verbatim',
    'AI voiceover narration with word-by-word captions',
    'Soundtrack chosen to match the mood of the subject',
    'Videos of 60 seconds or more, for TikTok Creator Rewards eligibility',
    'AI image studio (6 engines) and text-to-speech studio (4 engines) included',
    'One-click HD enhance powered by Topaz film restoration',
    'Watermark-free MP4 export on paid plans',
  ],
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: usd(TIER_PRICES.starter.usd),
    highPrice: usd(TIER_PRICES.pro.usd),
    priceCurrency: 'USD',
    offerCount: 3,
    offers: [
      {
        name: 'Starter',
        cents: TIER_PRICES.starter.usd,
        credits: TIER_CREDITS.starter,
        extra: 'Watermark-free MP4 exports.',
      },
      {
        name: 'Creator',
        cents: TIER_PRICES.basic.usd,
        credits: TIER_CREDITS.basic,
        extra: 'Enough for roughly seven cinematic films a month, or many more Fast renders.',
      },
      {
        name: 'Studio',
        cents: TIER_PRICES.pro.usd,
        credits: TIER_CREDITS.pro,
        extra: 'Highest volume, plus two free HD enhances every month.',
      },
    ].map((p) => ({
      '@type': 'Offer',
      name: p.name,
      price: usd(p.cents),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: `${p.name} — $${usd(p.cents)}/month. ${p.credits} credits per billing month. ${p.extra}`,
      url: 'https://www.usekineo.com/pricing',
    })),
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
        // KINEO-PRELAUNCH-PATH-2026-08-08 — o comentario no topo deste bloco
        // manda espelhar o #faq da KineoLanding VERBATIM, e a resposta visivel
        // acabou de virar ft(). Sem esta troca o JSON-LD serviria ao Google a
        // frase antiga enquanto a pagina mostra a nova — exatamente o "spam
        // signal" que o comentario adverte. Mesmos dois argumentos, na mesma
        // ordem: com a flag OFF os dois textos voltam byte a byte ao de hoje.
        text: `${ft(OFFER, 'Yes. Never-paid free users can download, share and post the watermarked MP4.', 'Trial films carry a small watermark — you can download, share and post the MP4. After the trial, the free Fast video carries a watermark.')} Paid plans unlock the clean, watermark-free MP4 for YouTube, TikTok or Reels.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need any editing skills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `None. You type one idea and the AI writes the script, records the voice, finds the footage and adds captions. ${ft(OFFER, 'Free downloads carry a watermark; paid plans unlock the clean MP4.', 'Trial downloads carry a watermark, and so does the free Fast video after the trial, and paid plans always export clean.')}`,
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a watermark?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${ft(OFFER, 'Free access gives new users up to 3 watermarked Fast videos every 24 hours, with no card. You can download and share them.', `New accounts get ${TRIAL_GRANT_CREDITS_COPY} credits with every engine unlocked, watermarked; after it ends, free access gives 1 watermarked Fast video per month that you can download and share.`)} Paid plans export clean, watermark-free MP4s.`,
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
    {
      '@type': 'Question',
      name: 'Can I run a whole channel with the same host?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — that is the point. Keep the same voice, style and captions across every episode so your channel looks consistent, without filming a single frame.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I monetize the videos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Every video is yours to keep, post and monetize — including the YouTube Partner Program, TikTok and Reels. No extra license needed.',
      },
    },
    {
      // [KINEO-COMMERCIAL-LICENSE-2026-08-12] — espelha VERBATIM o novo Q&A
      // visível no #faq de app/KineoLanding.tsx (e o mesmo texto no FAQ de
      // /pricing, onde este schema também é servido pelo layout). Nenhuma
      // frase vai além do que /terms concede: §2 uso comercial, §3 e §5
      // propriedade do output, §5 a proibição de revender o Serviço.
      '@type': 'Question',
      name: 'Can I use the videos commercially, or for client work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Our terms let you use Kineo for lawful personal or commercial purposes and confirm that you keep ownership of the videos you generate, so you can post them, monetize them and deliver them to a client as part of your own paid service. No extra license, no per-video royalty. Two limits come from the same terms: you cannot resell or redistribute Kineo itself, and the stock clips inside a render are licensed for use in your finished video, not for re-upload as standalone stock footage. Paid plans export the clean, watermark-free MP4.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does one video take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Fast Mode usually finishes in 3–7 minutes. AI-generated and cinematic videos take a little longer because every scene is generated before the final MP4 is composed.',
      },
    },
    // KINEO-AEO-PRICE-TRUTH-2026-08-19 — as três perguntas abaixo são novas e
    // existem por um motivo específico: são escritas na FORMA EXATA em que a
    // pessoa digita no ChatGPT ("quanto custa", "quais motores", "qual é o
    // melhor"). As nove perguntas acima são FAQ institucional — respondem
    // objeções de quem JÁ está na página. Essas três respondem a pergunta de
    // quem ainda não sabe que existimos, que é onde os 205 de 245 cadastros
    // desta semana nasceram. Espelhadas verbatim em app/KineoLanding.tsx #faq.
    {
      '@type': 'Question',
      name: 'How much does Kineo cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Kineo has three monthly plans: Starter at $${usd(TIER_PRICES.starter.usd)} for ${TIER_CREDITS.starter} credits, Creator at $${usd(TIER_PRICES.basic.usd)} for ${TIER_CREDITS.basic} credits and Studio at $${usd(TIER_PRICES.pro.usd)} for ${TIER_CREDITS.pro} credits. Credits are spent per video and how many a video costs depends on the engine you pick, so a Fast render and a cinematic film come out of the same balance at very different rates. It is the same price everywhere in the world — we show it in your local currency, but nobody pays more or less for where they live. New accounts get free credits to make a first video before paying anything.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Which AI video engines can I use in Kineo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Seven, behind one interface and one balance: Veo 3.1, Kling 3, MiniMax H3, Kling 2.5, Seedance 1.5, Kineo 1 and Avatar. You choose the engine per video, so a cheap explainer and a cinematic flagship can come out of the same account on the same day. Every clip on the Kineo homepage is a real render from the engine named on the card — the badge always tells the truth about which model made it.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best AI video generator for faceless YouTube channels?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on whether you want stock footage assembled or footage generated. Tools like InVideo and AutoShorts cut stock clips to your script, which is cheaper and fine for talking-point videos. Kineo generates the footage with models such as Veo 3.1 and Kling 3, keeps your narration word for word instead of rewriting it, and targets 60 seconds or more so the video qualifies for TikTok Creator Rewards. If your channel lives on visuals nobody else has, generation wins; if it lives on volume, stock is cheaper.',
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
