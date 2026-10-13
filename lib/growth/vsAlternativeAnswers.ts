// KINEO-VS-ALTERNATIVAS-1310 — o texto das 4 páginas /vs "alternativa a X", no MESMO tipo (CitationAnswer) da página do
// InVideo que converteu (2 cadastros → 1 Creator em 4,5 min). Um ângulo honesto por concorrente: o material com que a
// pessoa começa (artigo, apresentador, edição manual, vídeo longo) contra "uma ideia → filme pronto".
//
// REGRA DA CASA: nada de preço digitado aqui. Preço/créditos/filme grátis da Kineo vêm de citationAnswers.ts (que lê
// lib/marketingPrice + lib/freeTierOffer) e de buyCreatorOffer.ts (Creator + WELCOME20 só com o interruptor ligado);
// fato de concorrente vem de lib/seo/vsAlternatives1310.ts, onde cada um tem URL e data. O guardião
// scripts/test-vs-alternativas-1310.mjs reprova "$<número>"/"USD <número>" neste arquivo e as promessas proibidas.
import {
  CITATION_CURRENCY_FAQ, CITATION_FREE_FILM_CREDITS, CITATION_PLANS, CITATION_REFERENCE_SECONDS, CITATION_SEEDANCE_CREDITS,
  CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, type CitationAnswer,
} from '@/lib/growth/citationAnswers'
import { FREE_FILM_LABEL } from '@/lib/freeTierOffer'
import { buyCreatorCopy } from '@/lib/growth/buyCreatorOffer'
import { VS_ALTERNATIVE_PAGES, VS_COMPETITORS, type VsAlternativeId } from '@/lib/seo/vsAlternatives1310'

const creator = buyCreatorCopy('en')
/** "Kineo Creator is <1º mês> for the first month, then <cheio>/month for N credits…" — só o cheio com o WELCOME20 desligado. */
const CREATOR_LINE = `Kineo Creator is ${creator.priceLine} for ${CITATION_PLANS[1].credits} credits a month (${CITATION_PLANS[1].films} films of ${CITATION_REFERENCE_SECONDS} seconds on Seedance 1.5)`
const FIRST_FILM = `the first one is a ${FREE_FILM_LABEL}`
const SEEDANCE_STEP = `Seedance 1.5 generates the scenes: ${CITATION_FREE_FILM_CREDITS} credits for a 15-second film (the free one) or ${CITATION_SEEDANCE_CREDITS} for ${CITATION_REFERENCE_SECONDS} seconds.`
const REVIEW_STEP = 'Kineo writes or keeps the narration, voices it, cuts the scenes and burns in captions; watch the MP4 before you publish it.'
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

function base(id: VsAlternativeId) {
  const page = VS_ALTERNATIVE_PAGES[id]
  return { id, path: page.path, label: page.label }
}

export const VS_ALTERNATIVE_ANSWERS: Record<VsAlternativeId, CitationAnswer> = {
  pictory: {
    ...base('pictory'),
    question: 'What is a good Pictory alternative when I want a narrated cinematic Short from one idea, not from an article?',
    description: 'Pictory turns existing material (scripts, article URLs, slides) into video; Kineo turns one idea into a finished narrated vertical film. Dated sources, monthly prices and a free first film.',
    answer: [
      `Pictory is built to turn material you already have (${lower(VS_COMPETITORS.pictory.start.text).replace(/\.$/, '')}) into a video. If you only have an idea, Kineo writes the narration and delivers a finished vertical film with voiceover, generated scenes and captions; ${FIRST_FILM}.`,
      `Pictory pricing: ${VS_COMPETITORS.pictory.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: [
      'Type one idea (a topic, a question, a story) or paste narration you already wrote; no article, slide deck or footage is needed.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Choose by what you start with',
    decision: 'If the words already exist as a long article, a web page or a slide deck, a repurposing tool such as Pictory is designed for that input. If you start from an idea and want the story written, narrated and filmed for you, Kineo is the shorter path. This page compares workflows and monthly entry prices, not a price per video.',
    faqs: [{
      question: 'Can Kineo turn a blog post or a URL into a video?',
      answer: 'Not as a URL or document import. Kineo starts from an idea or a script you paste. If repurposing a long article is the job, Pictory is built for it and Kineo is not.',
    }, {
      question: 'Does Kineo use stock footage like Pictory?',
      answer: 'The free film and the reference costs on this page use Seedance 1.5, which generates the scenes from the narration instead of matching stock clips. Generated scenes can still differ from what you pictured, so watch the film before publishing.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/vs/kineo-vs-pictory', label: 'Read the Kineo vs Pictory comparison' },
      { href: '/alternatives/pictory', label: 'See more Pictory alternatives' },
      { href: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow' },
    ],
  },
  synthesia: {
    ...base('synthesia'),
    question: 'What is a good Synthesia alternative if I want a faceless narrated video instead of a talking avatar?',
    description: 'Synthesia makes avatar-presented videos; Kineo makes faceless narrated films from one idea. Dated sources, monthly prices and a free first film.',
    answer: [
      `Synthesia makes ${lower(VS_COMPETITORS.synthesia.output.text).replace(/\.$/, '')}, starting from ${lower(VS_COMPETITORS.synthesia.start.text).replace(/\.$/, '')}. If you want no presenter on screen (a narrated story over cinematic scenes, with captions), Kineo makes that from one idea; ${FIRST_FILM}.`,
      `Synthesia pricing: ${VS_COMPETITORS.synthesia.price.text} ${CREATOR_LINE}. Kineo has no avatar presenter for films, so if a speaking face is the point, Synthesia is the better fit.`,
    ],
    workflow: [
      'Type one idea or paste your narration; nobody appears on camera and no avatar is chosen.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Pick by what should be on screen',
    decision: 'An avatar platform puts a presenter in front of the viewer; Kineo puts the story there, with a voiceover over generated scenes. For onboarding, HR or a walkthrough where a speaking face builds trust, an avatar tool fits. For Shorts, stories, explainers and faceless channels, a narrated film fits.',
    faqs: [{
      question: 'Does Kineo have AI avatars?',
      answer: 'Not for films. Kineo makes faceless narrated films; only its self-service product ads (Business plan) can add an optional AI person holding the product. If you need an avatar presenter, use an avatar platform such as Synthesia.',
    }, {
      question: 'Can I use my own script?',
      answer: 'Yes. Paste your narration and choose the finished-script path, or type an idea and let Kineo write it. Check the delivered wording before publishing.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/alternatives/synthesia', label: 'See more Synthesia alternatives' },
      { href: '/vs/heygen-vs-kineo', label: 'Kineo vs HeyGen, another avatar platform' },
      { href: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow' },
    ],
  },
  capcut: {
    ...base('capcut'),
    question: 'What is a good CapCut alternative if I do not want to edit, and just want to type an idea and get a finished Short?',
    description: 'CapCut is an editor for clips you bring; Kineo turns one idea into a finished narrated vertical film with no timeline. Dated sources, monthly prices and a free first film.',
    answer: [
      `CapCut is an editor. You start with ${lower(VS_COMPETITORS.capcut.start.text).replace(/\.$/, '')}, and you get ${lower(VS_COMPETITORS.capcut.output.text).replace(/\.$/, '')}. Kineo skips the editing: type one idea and it writes the narration, generates the scenes, adds captions and delivers a finished vertical film; ${FIRST_FILM}.`,
      `${CREATOR_LINE}. CapCut pricing: ${VS_COMPETITORS.capcut.price.text}`,
    ],
    workflow: [
      'Type one idea or paste your narration; there are no clips to import and no timeline to arrange.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Editing control or a finished film',
    decision: 'If you have footage and enjoy cutting it, an editor gives you frame-level control that Kineo does not offer. If you have no footage and no time to edit, Kineo delivers the finished film from a sentence. Many creators use both: generate in Kineo, then polish the MP4 in an editor.',
    faqs: [{
      question: 'Can I edit a Kineo film frame by frame?',
      answer: 'Kineo composes the video without exposing a full editing timeline. Download the MP4 and open it in an editor such as CapCut if you want to change individual cuts.',
    }, {
      question: 'Do I need my own footage?',
      answer: 'No. Kineo generates the scenes from the narration. An editor such as CapCut works on the clips and templates you bring into it.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/alternatives/capcut', label: 'See more CapCut alternatives' },
      { href: '/text-to-video-shorts', label: 'Try the text-input workflow' },
      { href: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow' },
    ],
  },
  opusclip: {
    ...base('opusclip'),
    question: 'What is a good OpusClip alternative if I have no long video to clip and want original Shorts from scratch?',
    description: 'OpusClip finds clips inside a video you already have; Kineo creates an original narrated vertical film from one idea. Dated sources, monthly prices and a free first film.',
    answer: [
      `OpusClip starts from ${lower(VS_COMPETITORS.opusclip.start.text).replace(/\.$/, '')}, and returns ${lower(VS_COMPETITORS.opusclip.output.text).replace(/\.$/, '')}. With no long video there is nothing to clip; Kineo creates an original vertical film from one idea, with narration, generated scenes and captions; ${FIRST_FILM}.`,
      `OpusClip pricing: ${VS_COMPETITORS.opusclip.price.text} ${CREATOR_LINE}.`,
    ],
    workflow: [
      'Type one idea or paste your narration; no podcast, stream or webinar recording is needed.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Clip what exists, or create what does not',
    decision: 'A clipper multiplies a podcast, stream or webinar you already recorded. Kineo creates a new film from text. If you record long-form some weeks and not others, using both is reasonable: OpusClip for the weeks with footage, Kineo for the weeks without.',
    faqs: [{
      question: 'Can Kineo cut my podcast into clips?',
      answer: 'No. Kineo generates from text and does not recut an uploaded recording. For that job, a clipper such as OpusClip is the right tool.',
    }, {
      question: 'Is a Kineo film new footage?',
      answer: 'Yes. Seedance 1.5 generates the scenes from the narration, so the visuals are new rather than cut from a recording. Watch the film before publishing.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/vs/kineo-vs-opus-clip', label: 'Read the Kineo vs OpusClip comparison' },
      { href: '/alternatives/opusclip', label: 'See more OpusClip alternatives' },
      { href: '/vs/invideo-alternatives-faceless-shorts', label: 'InVideo alternatives by workflow' },
    ],
  },
}
