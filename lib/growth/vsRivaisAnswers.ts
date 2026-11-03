// KINEO-VS-RIVAIS-0311 — o texto das páginas "alternativa a X" de Revid, Crayo, AutoShorts, Faceless.video, Fliki e Zebracat,
// no MESMO tipo (CitationAnswer) da página do InVideo que converteu. Resposta primeiro: a 1ª frase diz quem escolhe o quê.
//
// REGRA DA CASA: nada de preço digitado aqui. Preço/créditos da Kineo vêm de lib/marketingPrice (TIER_PRICES, TIER_CREDITS,
// creditsPerReferenceVideo) e lib/kling4PaidPricing (KLING4_PAID_CREDITS); o filme grátis, de FREE_FILM_LABEL e
// FREE_FILM_COUNTRY_CLAUSE; os motores, de lib/engineLaunch (só o que está público); fato de concorrente, de
// lib/seo/vsRivais0311.ts, onde cada um tem URL e data. O guardião scripts/test-vs-rivais-0311.mjs reprova "$<número>",
// "USD <número>" e "<número> credits" neste arquivo e as promessas proibidas.
import { AUTOPILOT_PUBLIC } from '@/lib/autopilotPublic'
import { buyCreatorCopy } from '@/lib/growth/buyCreatorOffer'
import {
  CITATION_CURRENCY_FAQ, CITATION_FREE_FILM_CREDITS, CITATION_PLANS, CITATION_REFERENCE_SECONDS, CITATION_SEEDANCE_CREDITS,
  CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, type CitationAnswer,
} from '@/lib/growth/citationAnswers'
import { buildBlankStudioSignupHref } from '@/lib/growth/publicCreationIntent'
import { VIDEO_ENGINE_LIST_COPY, engineOffered, enginePaused } from '@/lib/engineLaunch'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { FREE_FILM_COUNTRY_CLAUSE } from '@/lib/freeFilmPolicy'
import { FREE_FILM_LABEL, TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { KLING4_PAID_CREDITS } from '@/lib/kling4PaidPricing'
import { KLING4_PAID_LIVE } from '@/lib/kling4PaidPolicy'
import { creditsPerReferenceVideo } from '@/lib/marketingPrice'
import { VS_RIVAL_IDS, VS_RIVAL_PAGES, VS_RIVALS, type VsRivalId } from '@/lib/seo/vsRivais0311'

const creator = buyCreatorCopy('en')
const [starterPlan, creatorPlan] = CITATION_PLANS
const VEO_OFFERED = engineOffered('veo') && !enginePaused('veo')

/** Os motores que a Kineo oferece HOJE: a lista derivada dos interruptores, com o Kling 4.0 no lugar do Kling 3 no plano pago. */
export const KINEO_ENGINE_LIST = KLING4_PAID_LIVE ? VIDEO_ENGINE_LIST_COPY.replace('Kling 3', 'Kling 4.0') : VIDEO_ENGINE_LIST_COPY
const CHARACTER_ENGINE = KLING4_PAID_LIVE ? 'Kling 4.0' : 'Kling 3'
/** O filme grátis, sempre com a cláusula de país: é "in supported countries" enquanto a política for essa. */
export const KINEO_FREE_FILM_LINE = `the first one is a ${FREE_FILM_LABEL}${FREE_FILM_COUNTRY_CLAUSE}`

/** "Kineo Creator is <preço> for N credits a month (M films of 60 seconds on Seedance 1.5)". */
const CREATOR_LINE = `Kineo Creator is ${creator.priceLine} for ${creatorPlan.credits} credits a month (${creatorPlan.films} films of ${CITATION_REFERENCE_SECONDS} seconds on Seedance 1.5)`
const SEEDANCE_STEP = `The free first film is made with ${FREE_FILM_ENGINE_NAME}: ${CITATION_FREE_FILM_CREDITS} credits for ${TRIAL_FREE_FILM_SECONDS} seconds. The paid Seedance 1.5 reference uses ${CITATION_SEEDANCE_CREDITS} credits for ${CITATION_REFERENCE_SECONDS} seconds.`
const REVIEW_STEP = 'Kineo writes or keeps the narration, voices it, cuts the scenes, burns in captions and adds music; watch the MP4 before you publish it.'
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** O que a coluna da Kineo diz em cada linha da tabela (lido pelo componente; nenhum número digitado). */
export const KINEO_ROWS = {
  start: 'One idea, or narration you paste. No footage, article or presenter needed.',
  output: 'One finished film: narration, generated scenes, burned-in captions and music, delivered as an MP4.',
  visuals: `Scenes are generated, not matched from stock, on the engine you pick by name: ${KINEO_ENGINE_LIST}.`,
  publish: AUTOPILOT_PUBLIC
    ? 'On the plans compared here you download the MP4 and publish it yourself; scheduled publishing is a separate done-for-you plan.'
    : 'No scheduled auto-posting: you download the MP4 and publish it when you are happy with it.',
  price: `${starterPlan.name} ${starterPlan.price} (${starterPlan.credits} credits). ${creatorPlan.name}: ${creator.priceLine} (${creatorPlan.credits} credits). Billed monthly.`,
} as const

/** Quanto custa um filme de referência na Kineo, motor por motor (o número que o servidor cobra). */
export const KINEO_REFERENCE_COSTS = [
  `${creditsPerReferenceVideo('cinematic_ai')} credits on Seedance 1.5`,
  `${creditsPerReferenceVideo('cinematic_kling')} on Kling 2.5`,
  ...(VEO_OFFERED ? [`${creditsPerReferenceVideo('cinematic_veo')} on Veo 3.1`] : []),
  ...(KLING4_PAID_LIVE ? [`${KLING4_PAID_CREDITS[60]} on Kling 4.0`] : []),
].join(', ')
const REFERENCE_LINE = `A finished ${CITATION_REFERENCE_SECONDS}-second film uses ${KINEO_REFERENCE_COSTS}.`

const CHARACTER_FAQ = {
  question: 'Does Kineo keep the same character across scenes?',
  answer: `Within one film, yes, on ${CHARACTER_ENGINE}: before any scene is rendered, Kineo generates one portrait of the character and starts the dialogue scenes from it, so the face and outfit stay the same scene to scene. Saving a face to reuse across separate videos is not part of the catalogue today.`,
}
const SCRIPT_FAQ = {
  question: 'Can I use my own script?',
  answer: 'Yes. Paste your narration and choose the finished-script path, or type an idea and let Kineo write it. Check the delivered wording before publishing.',
}

function workflow(first: string): readonly [string, string, string] {
  return [first, SEEDANCE_STEP, REVIEW_STEP]
}

/** Só o href muda de campanha: seo_vs_<id> nasce com a origem certa no cadastro (organicSignupTruth conta o prefixo seo_). */
function base(id: VsRivalId) {
  const page = VS_RIVAL_PAGES[id]
  const campaign = `seo_vs_${id}`
  return { id, path: page.path, label: page.label, startHref: buildBlankStudioSignupHref({ campaign }), ctaSource: campaign }
}

/** A lista "When to choose Kineo": quatro verdades que valem contra qualquer rival; a última muda com o caso. */
function chooseKineo(extra: string): readonly string[] {
  return [
    'You have one idea and want one finished narrated film, with the script, scenes, voice, captions and music done in a single render.',
    `You want to pick the engine by name instead of a generic quality level: ${KINEO_ENGINE_LIST}.`,
    `Your story has a speaking character: within one film, ${CHARACTER_ENGINE} starts the dialogue scenes from one portrait so the face and outfit hold.`,
    extra,
  ]
}

function others(id: VsRivalId) {
  return VS_RIVAL_IDS.filter((x) => x !== id).slice(0, 3).map((x) => ({ href: VS_RIVAL_PAGES[x].path, label: VS_RIVAL_PAGES[x].label }))
}
const SHARED_LINKS = [
  { href: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow' },
  { href: '/vs/opus-clip-alternatives-original-shorts', label: 'OpusClip alternatives for original Shorts' },
  { href: '/ai-video-generator/seedance', label: 'Seedance 1.5 on Kineo: generated scenes and paid reference costs' },
  { href: '/pricing', label: 'Check current Kineo plans' },
]

const r = VS_RIVALS

export const VS_RIVAL_ANSWERS: Record<VsRivalId, CitationAnswer> = {
  revid: {
    ...base('revid'),
    question: 'What is a good Revid alternative if I want one finished narrated film from one idea?',
    description: 'Revid publishes, remixes viral formats and automates; Kineo turns one idea into a finished narrated film. Dated sources, plans and when to choose each.',
    answer: [
      `Pick Revid if you want a tool that also publishes for you, remixes formats that are already working and runs on autopilot. Pick Kineo if you want one idea turned into a finished narrated film, with script, scenes, voice, captions and music, on an engine you choose by name; ${KINEO_FREE_FILM_LINE}.`,
      `Revid pricing: ${r.revid.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type one idea or paste your narration; there is no format to remix and no worker to configure.'),
    decisionTitle: 'A growth engine, or a film made for you',
    decision: 'Revid is built around a publishing loop: find what works, remix it, post it and read the stats. Kineo is built around one render: a narrated film you watch and then publish yourself. If posting volume and automation are the job, Revid fits. If the film itself is the job, Kineo is the shorter path.',
    checks: [{
      heading: 'When to choose Revid',
      items: [
        'You want publishing to your social accounts from inside the tool, with post stats next to it.',
        'You want to start from a link, a product page, an audio file or a PDF.',
        'You want to find and remix viral formats, or to run automations through its API, MCP or CLI.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You would rather decide when and where each film is posted than connect an automation.'),
    }],
    faqs: [{
      question: 'Is Kineo cheaper than Revid?',
      answer: `It depends on what a credit buys. ${r.revid.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE} On Revid: ${r.revid.visuals.text} Compare the cost of the film you actually want, not the monthly number alone.`,
    }, {
      question: 'Can Kineo post to TikTok or YouTube for me like Revid?',
      answer: `${KINEO_ROWS.publish} If automatic posting is the point, Revid is built for it: ${lower(r.revid.publish.text)}`,
    }, {
      question: 'Can Kineo make a video from a link or a PDF?',
      answer: 'Not as a link or document import. Kineo starts from an idea or a script you paste. If repurposing a link, an audio file or a PDF is the job, Revid accepts those inputs.',
    }, CHARACTER_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('revid'), ...SHARED_LINKS],
  },
  crayo: {
    ...base('crayo'),
    question: 'What is a good Crayo alternative if I want an original narrated film instead of clips and text-story formats?',
    description: 'Crayo clips long videos and makes Reddit and fake-text formats; Kineo creates an original narrated film from one idea. Dated sources and plans.',
    answer: [
      `Pick Crayo if you clip long videos or make Reddit and fake-text formats and want an editor around them. Pick Kineo if you want an original narrated film from one idea, with generated scenes, voice, captions and music; ${KINEO_FREE_FILM_LINE}.`,
      `Crayo pricing: ${r.crayo.price.text} ${r.crayo.free.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type one idea or paste your narration; no source video, gameplay or text thread is needed.'),
    decisionTitle: 'Formats you assemble, or a film from nothing',
    decision: 'Crayo is a toolbox for creators who already work in clips: cut what exists, add subtitles and voiceovers, track the views. Kineo makes something that did not exist: generated scenes under a narration written for your idea. Plenty of creators use a clipper for what they recorded and a generator for what they did not.',
    checks: [{
      heading: 'When to choose Crayo',
      items: [
        'You already have long videos or links and want them cut into many clips.',
        'You make Reddit-story or fake-text videos, which are built-in workflows there.',
        'You want an editor plus tools such as subtitle removal, face swap and view tracking.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You have no footage to cut and want scenes generated for the story you are telling.'),
    }],
    faqs: [{
      question: 'Is Kineo cheaper than Crayo?',
      answer: `They sell different units. ${r.crayo.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE} A Crayo workflow credit covers a clip or format video; a Kineo credit buys generated scenes, so the two are not comparable one to one.`,
    }, {
      question: 'Can Kineo clip my long videos or make fake-text videos?',
      answer: 'No. Kineo generates a film from text and does not recut an uploaded recording, and it has no fake-text template. For those jobs, Crayo is the right tool.',
    }, {
      question: 'Does Kineo have a free option where Crayo does not?',
      answer: `Yes. Crayo says: ${lower(r.crayo.free.text)} On Kineo, ${KINEO_FREE_FILM_LINE}, with no card, and that film carries a watermark.`,
    }, CHARACTER_FAQ, SCRIPT_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('crayo'), ...SHARED_LINKS],
  },
  autoshorts: {
    ...base('autoshorts'),
    question: 'What is a good AutoShorts alternative if I want to choose each film instead of running an auto-posting series?',
    description: 'AutoShorts runs a faceless series that posts itself; Kineo makes one finished narrated film at a time on an engine you pick. Dated sources and plans.',
    answer: [
      `Pick AutoShorts if you want a faceless series that writes and posts itself on a schedule. Pick Kineo if you want to choose each film, make it on an engine you pick by name and publish it yourself; ${KINEO_FREE_FILM_LINE}.`,
      `AutoShorts pricing: ${r.autoshorts.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type the idea for this film, not a niche for a series; every film is its own decision.'),
    decisionTitle: 'A channel on autopilot, or one film at a time',
    decision: 'AutoShorts sells a posting cadence: pick a niche, and a new video goes out on schedule. Kineo sells the film: you decide the idea, the engine and when it goes out. If showing up every day without touching anything is the goal, a series tool fits. If you want to watch each film before anyone else does, Kineo fits.',
    checks: [{
      heading: 'When to choose AutoShorts',
      items: [
        'You want a channel that keeps posting without you opening the tool every day.',
        'You want a price set by posting frequency rather than by credits per film.',
        'A preset visual style is what you are after, and you are happy to edit the draft before it posts.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You want each film judged by you before it is published, not queued on a schedule.'),
    }],
    faqs: [{
      question: 'Can Kineo auto-post a series like AutoShorts?',
      answer: `${KINEO_ROWS.publish} If a self-posting series is the job, AutoShorts is built for it: ${lower(r.autoshorts.publish.text)}`,
    }, {
      question: 'Is Kineo cheaper than AutoShorts?',
      answer: `It depends on how many films you need. ${r.autoshorts.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE} AutoShorts prices by posting frequency; Kineo prices by the engine and length of each film.`,
    }, {
      question: 'Can I try AutoShorts for free?',
      answer: `According to its home page: ${lower(r.autoshorts.free.text)} On Kineo, ${KINEO_FREE_FILM_LINE}, with no card.`,
    }, CHARACTER_FAQ, SCRIPT_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('autoshorts'), ...SHARED_LINKS],
  },
  facelessvideo: {
    ...base('facelessvideo'),
    question: 'What is a good Faceless.video alternative if I want one finished film I choose myself, not a queue of drafts?',
    description: 'Faceless.video generates drafts for a series and auto-posts them; Kineo makes one finished narrated film at a time. Dated sources and plans.',
    answer: [
      `Pick Faceless.video if you want a series that generates drafts and posts them to your accounts on a schedule. Pick Kineo if you want to choose each idea and get one finished narrated film on an engine you pick by name; ${KINEO_FREE_FILM_LINE}.`,
      `Faceless.video pricing: ${r.facelessvideo.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type the idea for this film or paste your narration; there is no content source or queue to set up.'),
    decisionTitle: 'A posting queue, or a film you decide on',
    decision: 'Faceless.video is organised around a series: a source, a schedule and drafts you can review before they post. Kineo is organised around one render: you give it the idea and it hands back the finished film. If consistency across accounts is the job, a queue fits. If each film deserves its own decision, Kineo fits.',
    checks: [{
      heading: 'When to choose Faceless.video',
      items: [
        'You want drafts generated for you and posted automatically to your accounts.',
        'You run several social accounts from one subscription, which its higher plans allow.',
        'You want credits that roll over while you subscribe.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You publish when a film is ready rather than on a fixed schedule.'),
    }],
    faqs: [{
      question: 'Can Kineo post to my accounts automatically?',
      answer: `${KINEO_ROWS.publish} If automatic posting is the job, Faceless.video is built for it: ${lower(r.facelessvideo.publish.text)}`,
    }, {
      question: 'Is Kineo cheaper than Faceless.video?',
      answer: `It depends on the volume and the engine. ${r.facelessvideo.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE}`,
    }, {
      question: 'Which AI models does each one use?',
      answer: `On Kineo you pick by name: ${KINEO_ENGINE_LIST}. On Faceless.video: ${lower(r.facelessvideo.visuals.text)}`,
    }, CHARACTER_FAQ, SCRIPT_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('facelessvideo'), ...SHARED_LINKS],
  },
  fliki: {
    ...base('fliki'),
    question: 'What is a good Fliki alternative if I want a cinematic narrated film with generated scenes instead of stock media?',
    description: 'Fliki turns scripts, blogs and slides into videos with stock media and many voices; Kineo generates a narrated film from one idea. Dated sources and plans.',
    answer: [
      `Pick Fliki if you turn scripts, blog posts or slides into videos, need longer formats or a very large voice library, and stock media suits the job. Pick Kineo if you want a short narrated film with generated scenes from one idea, on an engine you choose by name; ${KINEO_FREE_FILM_LINE}.`,
      `Fliki pricing: ${r.fliki.price.text} ${r.fliki.free.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type one idea or paste your narration; there is no blog post, deck or stock search involved.'),
    decisionTitle: 'Stock-based explainers, or generated films',
    decision: 'Fliki covers a wide range of formats: explainers, audio, carousels and presentations, built largely on stock media and AI voices. Kineo does one thing: a narrated film whose scenes are generated for the story. For a training video or a blog turned into a voiceover, Fliki is the better fit. For a Short that should look filmed, Kineo is.',
    checks: [{
      heading: 'When to choose Fliki',
      items: [
        'You start from a blog post or a slide deck, or you want audio-only output, carousels or presentations.',
        'You need longer videos than a Short, or a very large voice library.',
        'Stock images and clips suit the job, or you want to upload your own footage.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You want the scenes generated for your story rather than matched from a stock library.'),
    }],
    faqs: [{
      question: 'Does Fliki have a free plan?',
      answer: `Yes. According to its pricing page: ${lower(r.fliki.free.text)} On Kineo, ${KINEO_FREE_FILM_LINE}, with no card.`,
    }, {
      question: 'Is Kineo cheaper than Fliki?',
      answer: `They meter different things. ${r.fliki.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE} Fliki meters credits per minute of video and Kineo per film by engine and length, so compare the same video on both.`,
    }, {
      question: 'Can Kineo turn a blog post or a slide deck into a video?',
      answer: 'Not as a document import. Kineo starts from an idea or a script you paste. If repurposing a blog or a deck is the job, Fliki is built for it.',
    }, CHARACTER_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('fliki'), ...SHARED_LINKS],
  },
  zebracat: {
    ...base('zebracat'),
    question: 'What is a good Zebracat alternative if I want every scene generated and the engine chosen by name?',
    description: 'Zebracat makes finished videos with stock and generated visuals and avatars; Kineo generates a narrated film on an engine you pick. Dated sources.',
    answer: [
      `Pick Zebracat if you want finished videos with a mix of stock and generated visuals, plus avatars, URL inputs and scheduled posting. Pick Kineo if you want a narrated film with generated scenes on an engine you choose by name, and no presenter on screen; ${KINEO_FREE_FILM_LINE}.`,
      `Zebracat pricing: ${r.zebracat.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: workflow('Type one idea or paste your narration; no URL, photo or stock search is needed.'),
    decisionTitle: 'Two finished-video tools, with different defaults',
    decision: 'Zebracat and Kineo both hand back a finished video with voiceover, music and captions, so this is closer than most comparisons. The difference is the default: Zebracat offers stock clips, generated scenes, avatars and posting in one suite, while Kineo generates the scenes of a faceless film on the engine you name. Choose by which of those you would actually use.',
    checks: [{
      heading: 'When to choose Zebracat',
      items: [
        'You want AI avatars, voice clones or brand kits as part of the same tool.',
        'You start from a website or blog URL, an audio file or a single photo.',
        'You want scheduling and posting to your social channels built in, or a stock library to draw on.',
      ],
    }, {
      heading: 'When to choose Kineo',
      items: chooseKineo('You want a faceless film rather than a presenter, and scenes generated rather than matched from stock.'),
    }],
    faqs: [{
      question: 'Is Kineo cheaper than Zebracat?',
      answer: `Compare the same film on both. ${r.zebracat.price.text} ${KINEO_ROWS.price} ${REFERENCE_LINE} Zebracat counts videos and generative credits; Kineo counts credits per film by engine and length.`,
    }, {
      question: 'Does Zebracat have a free plan?',
      answer: `Yes. According to its pricing page: ${lower(r.zebracat.free.text)} On Kineo, ${KINEO_FREE_FILM_LINE}, with no card.`,
    }, {
      question: 'Does Kineo have AI avatars like Zebracat?',
      answer: 'Not for films. Kineo films are faceless and narrated; only its self-service product ads can add an optional AI presenter, always labeled as AI. If a talking avatar is the point, Zebracat or an avatar platform fits better.',
    }, CHARACTER_FAQ, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [...others('zebracat'), ...SHARED_LINKS],
  },
}
