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
// KINEO-VS-NOVOS-1610 — Google Flow e Dreamina no MESMO molde; fatos (com fonte e data) em lib/seo/vsNovos1610.ts.
import { VS_NOVOS_CAPCUT_EXTRA, VS_NOVOS_COMPETITORS, VS_NOVOS_PAGES, type VsNovoId } from '@/lib/seo/vsNovos1610'
import { S25_PUBLIC, engineOffered, enginePaused } from '@/lib/engineLaunch'

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

// KINEO-VS-NOVOS-1610 — links internos: páginas de motor (só as que estão na oferta; o 2.5 só com S25_PUBLIC) e a página
// de anúncio para lojas. Só o href: as páginas são de outras sessões.
const VEO_OFFERED = engineOffered('veo') && !enginePaused('veo')
const ENGINE_LINKS: { href: string; label: string }[] = [
  { href: '/ai-video-generator/seedance', label: 'Seedance 1.5 on Kineo: the engine of the free film' },
  ...(VEO_OFFERED ? [{ href: '/ai-video-generator/veo', label: 'Veo 3.1 on Kineo: Google’s model inside a finished film' }] : []),
  ...(S25_PUBLIC ? [{ href: '/ai-video-generator/seedance-2-5', label: 'Seedance 2.5 on Kineo (paid plans)' }] : []),
]
const NOVOS_SHARED_LINKS = [
  ...ENGINE_LINKS,
  { href: '/ads/for/online-stores', label: 'Selling a product? Make a video ad for an online store' },
]
const NOVOS_KINEO_FINISHED = 'Kineo writes or keeps your narration, voices it, generates the scenes, burns in captions and adds music, so you get one finished vertical film'

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
    description: 'CapCut is an editor for clips you bring; Kineo turns one idea into a finished narrated vertical film, no timeline. Dated sources and a free first film.', // KINEO-VS-NOVOS-1610 — encurtada para o teto de 155
    answer: [
      `CapCut is an editor. You start with ${lower(VS_COMPETITORS.capcut.start.text).replace(/\.$/, '')}, and you get ${lower(VS_COMPETITORS.capcut.output.text).replace(/\.$/, '')}. Kineo skips the editing: type one idea and it writes the narration, generates the scenes, adds captions and delivers a finished vertical film; ${FIRST_FILM}.`,
      `${CREATOR_LINE}. CapCut pricing: ${VS_COMPETITORS.capcut.price.text}`,
      // KINEO-VS-NOVOS-1610 — 3ª linha do resumo citável: o que a CapCut faz melhor, dito pela fonte dela (lida em 15/10).
      `CapCut also has ${lower(VS_NOVOS_CAPCUT_EXTRA.aiVideo.text).replace(/\.$/, '')}. It remains the stronger choice when you want to edit by hand; Kineo is for when the finished film is the job.`,
    ],
    workflow: [
      'Type one idea or paste your narration; there are no clips to import and no timeline to arrange.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Editing control or a finished film',
    decision: 'If you have footage and enjoy cutting it, an editor gives you frame-level control that Kineo does not offer. If you have no footage and no time to edit, Kineo delivers the finished film from a sentence. Many creators use both: generate in Kineo, then polish the MP4 in an editor.',
    // KINEO-VS-NOVOS-1610 — "when to pick them instead", no campo checks que o molde já renderiza.
    checks: [{
      heading: 'When to pick CapCut instead',
      items: [
        `You want a full editor: ${lower(VS_NOVOS_CAPCUT_EXTRA.editor.text.replace(/^A full editor around it: /, '')).replace(/\.$/, '')}.`,
        'You already have footage and want to cut it frame by frame on a timeline.',
        `You want a ${lower(VS_COMPETITORS.capcut.free.text).replace(/\.$/, '')}, without generating anything.`,
      ],
    }],
    faqs: [{
      question: 'Does CapCut also generate AI video?',
      answer: `Yes. According to its pricing page, CapCut has ${lower(VS_NOVOS_CAPCUT_EXTRA.aiVideo.text).replace(/\.$/, '')}. The difference is the finished product: Kineo writes and voices the narration, cuts the scenes, burns in captions and adds music, so the result is a complete film rather than footage to edit.`,
    }, {
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
      ...NOVOS_SHARED_LINKS, // KINEO-VS-NOVOS-1610
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

// ─── KINEO-VS-NOVOS-1610 — Google Flow e Dreamina (15/10/2026) ───────────────────────────────────────────────────────
// Mesmo tipo (CitationAnswer), mesmo componente, mesma campanha citacoes_01_<id>. Resumo citável de 3 linhas (o que ele
// faz · acesso e preço com fonte · quando escolher cada um), "when to pick them instead" no campo checks, FAQ = JSON-LD
// (o molde já emite o FAQPage a partir de faqs). Nenhum número digitado: tudo de VS_NOVOS_COMPETITORS ou das fontes únicas.
function novoBase(id: VsNovoId) {
  const page = VS_NOVOS_PAGES[id]
  return { id, path: page.path, label: page.label }
}
const flow = VS_NOVOS_COMPETITORS.flow
const dreamina = VS_NOVOS_COMPETITORS.dreamina
const noDot = (text: string) => text.replace(/\.$/, '')

export const VS_NOVOS_ANSWERS: Record<VsNovoId, CitationAnswer> = {
  flow: {
    ...novoBase('flow'),
    question: 'What is a good Google Flow alternative when I want a finished narrated Short, not clips to assemble?',
    description: 'Google Flow generates Veo clips shot by shot; Kineo turns one idea into a finished narrated vertical film. Dated sources, honest limits, free first film.',
    answer: [
      `Google Flow is Google’s studio for Veo: ${lower(noDot(flow.start.text))}, and you direct and assemble the shots yourself. ${NOVOS_KINEO_FINISHED} from one idea; ${FIRST_FILM}.`,
      `Google Flow access: ${flow.free.text} ${flow.price.text} ${CREATOR_LINE}.`,
      `Pick Flow for shot-by-shot control and Google’s free daily allowance; pick Kineo when the job is a complete narrated Short${VEO_OFFERED ? ', and Veo 3.1 is one of the engines you can choose inside Kineo' : ''}.`,
    ],
    workflow: [
      'Type one idea or paste your narration; there are no shots to prompt one by one and nothing to stitch together.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'Shots to direct, or a film delivered',
    decision: 'Flow gives a filmmaker control over every shot: you write each prompt, extend clips and build the sequence. Kineo makes the editorial decisions for you (narration, scene order, captions, music) and hands back one vertical film. If you enjoy directing shot by shot, Flow fits; if you need a finished Short today, Kineo is the shorter path. This page compares workflows, not a price per video.',
    checks: [{
      heading: 'When to pick Google Flow instead',
      items: [
        'You want to try it for free every day: Google gives accounts without a subscription a daily Flow credit allowance (see the table below).',
        'You want to direct each shot yourself, extend clips and assemble the sequence.',
        'You already pay for a Google AI plan, which includes Flow credits.',
      ],
    }],
    faqs: [{
      question: 'Is Google Flow free?',
      answer: `Partly. According to Google’s help page, ${lower(flow.free.text)} More credits come with Google AI plans: ${lower(flow.price.text)}`,
    }, {
      question: 'Does Kineo use Veo like Google Flow?',
      answer: VEO_OFFERED
        ? 'Yes, as one engine among several. Inside Kineo you choose the engine by name before rendering, and Veo 3.1 is one of them; Kineo adds its own narration, captions and music around the generated scenes. The free first film uses Seedance 1.5.'
        : 'Not at the moment. The free first film uses Seedance 1.5; Kineo adds its own narration, captions and music around the generated scenes.',
    }, {
      question: 'Can I edit each shot in Kineo the way I do in Flow?',
      answer: 'No. Kineo composes the film without a shot-by-shot editor. If shot-level control is the point, Flow is built for it; download the Kineo MP4 if you want to recut it in an editor.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/vs/capcut-alternatives-no-editing-shorts', label: 'CapCut alternatives when you do not want to edit' },
      { href: '/vs/dreamina-alternatives-narrated-shorts', label: 'Dreamina alternatives for narrated Shorts' },
      ...NOVOS_SHARED_LINKS,
    ],
  },
  dreamina: {
    ...novoBase('dreamina'),
    question: 'What is a good Dreamina alternative when I want a finished narrated Short instead of separate clips?',
    description: 'Dreamina generates clips and images on Seedance and other models; Kineo turns one idea into a finished narrated vertical film. Dated sources, free film.',
    answer: [
      `Dreamina (dreamina.capcut.com) starts from ${lower(noDot(dreamina.start.text))}, and returns ${lower(noDot(dreamina.output.text))}. ${NOVOS_KINEO_FINISHED} from one idea; ${FIRST_FILM}.`,
      `Dreamina pricing: ${dreamina.price.text} ${dreamina.free.text} ${CREATOR_LINE}.`,
      `Pick Dreamina for a wide model menu and image tools in one place; pick Kineo when you want the narration, scenes, captions and music assembled into one Short${S25_PUBLIC ? ', with Seedance 2.5 available on Kineo’s paid plans' : ''}.`,
    ],
    workflow: [
      'Type one idea or paste your narration; no clip-by-clip generation and no separate editing step.',
      SEEDANCE_STEP,
      REVIEW_STEP,
    ],
    decisionTitle: 'A model playground, or a film pipeline',
    decision: 'Dreamina is a creative playground: many video and image models, clips you generate one at a time, avatars and image tools. Kineo is a pipeline with one output: a narrated vertical film with captions and music. If you want to explore models and build the edit yourself, Dreamina fits; if you want the Short finished from a sentence, Kineo does that job.',
    checks: [{
      heading: 'When to pick Dreamina instead',
      items: [
        'You want many video and image models in one account, including image generation and avatars.',
        'You want single clips to use in your own edit, not a finished narrated film.',
        'You want the official Seedance access that Dreamina’s paid plans advertise.',
      ],
    }],
    faqs: [{
      question: 'Does Dreamina have a free plan?',
      answer: `${dreamina.free.text} Check the current credits on Dreamina’s own pricing page, which shows prices in your local currency.`,
    }, {
      question: 'Kineo and Dreamina both use Seedance. What is the difference?',
      answer: `The model can be the same family; the job is different. Dreamina returns the clip you prompted. Kineo writes and voices the narration, generates the scenes on the engine you chose by name, burns in captions and adds music. The free first film uses Seedance 1.5${S25_PUBLIC ? '; Seedance 2.5 is available on paid plans' : ''}.`,
    }, {
      question: 'Does Kineo make AI avatar videos like Dreamina?',
      answer: 'Not for films. Kineo films are faceless and narrated. Only the self-service product ads can add an optional AI presenter, always labeled as AI. If a talking avatar is the point, Dreamina or an avatar platform fits better.',
    }, CITATION_TRIAL_FAQ, CITATION_WATERMARK_FAQ, CITATION_CURRENCY_FAQ],
    links: [
      { href: '/vs/google-flow-alternatives-finished-shorts', label: 'Google Flow alternatives for finished Shorts' },
      { href: '/vs/capcut-alternatives-no-editing-shorts', label: 'CapCut alternatives when you do not want to edit' },
      ...NOVOS_SHARED_LINKS,
    ],
  },
}
