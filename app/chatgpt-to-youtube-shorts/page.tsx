// KINEO-CHATGPT-INTENT-2026-08-10 — /chatgpt-to-youtube-shorts.
//
// POR QUE ESTA PÁGINA EXISTE (dado medido, não palpite): docs/SPRINT-2026-08-10
// registra que `chatgpt` passou o `taaft` como MAIOR canal externo de entrada
// (09/08: 13 x 4). O cluster de SEO inteiro fala com quem busca "free ai shorts
// generator" — ninguém fala com quem chega já DE DENTRO do ChatGPT, com um
// roteiro na mão, perguntando "e agora, como isso vira vídeo?". Esta página
// responde exatamente essa pergunta e nomeia a ferramenta que a pessoa acabou
// de usar, o que é o formato que motor de resposta consegue citar.
//
// NÃO canibaliza: /text-to-video-shorts vende o produto para "colei um texto";
// /free-script-generator ENTREGA um roteiro; /youtube-shorts-from-topic parte de
// um tópico. Aqui a entidade é o ChatGPT e a pergunta é onde ele para.
//
// Regras respeitadas: nenhum preço literal (preço vive em lib/checkoutPricing.ts),
// nenhuma menção a desconto/cupom, e a promessa do free tier é o literal exato
// das páginas irmãs via ft(OFFER, ...). Server component, zero client JS além do
// OrganicCtaLink e TopicGeneratorForm que as irmãs já usam.
//
// Fontes citadas (mesmas de /how-to-start-a-faceless-youtube-channel):
//  - Limite de 3 minutos do Shorts: support.google.com/youtube/answer/10059070
//  - Política de conteúdo inautêntico: support.google.com/youtube/answer/1311392
//  - Escopo da divulgação de IA: support.google.com/youtube/answer/14328491
// Nenhuma estatística inventada. As faixas de palavras/segundo são descritas
// como premissas de planejamento, não medições.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'chatgpt_to_shorts'
const HANDOFF_ID = 'chatgpt-script-handoff'
const UPDATED = 'August 2026'

const SHORTS_SPEC = 'https://support.google.com/youtube/answer/10059070?hl=en'
const MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392?hl=en'
const AI_DISCLOSURE = 'https://support.google.com/youtube/answer/14328491?hl=en'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'ChatGPT to YouTube Shorts: Turn a ChatGPT Script Into a Video (2026)',
  description:
    'ChatGPT writes the script but cannot hand you a narrated, captioned 9:16 MP4. Here is exactly where it stops, the prompt that produces a script a video generator can actually use, the spoken word budget per Short, and the five-step pipeline from chat window to posted video.',
  alternates: { canonical: `${BASE}/chatgpt-to-youtube-shorts` },
  openGraph: {
    title: 'ChatGPT to YouTube Shorts — the full workflow (2026)',
    description:
      'Where ChatGPT stops, the prompt that gives you a usable narration script, the word budget per Short, and how to turn it into a finished faceless video.',
    url: `${BASE}/chatgpt-to-youtube-shorts`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGPT to YouTube Shorts (2026)',
    description:
      'ChatGPT writes the words. Something else has to voice, match footage, caption and export. The pipeline, step by step.',
  },
}

// Planning assumptions, labelled as such. A clear AI narration voice at a normal
// Shorts pace lands roughly in this band; treat it as a budget, not a measurement.
const WORDS_PER_SECOND_LOW = 2.3
const WORDS_PER_SECOND_HIGH = 2.8
const SHORTS_MAX_SECONDS = 180

const LENGTHS: { label: string; seconds: number }[] = [
  { label: '20-second Short', seconds: 20 },
  { label: '35-second Short', seconds: 35 },
  { label: '45-second Short', seconds: 45 },
  { label: '60-second Short', seconds: 60 },
]

function wordBudget(seconds: number): string {
  const low = Math.round(seconds * WORDS_PER_SECOND_LOW)
  const high = Math.round(seconds * WORDS_PER_SECOND_HIGH)
  return `${low}-${high} words`
}

type Handoff = { step: string; chatgpt: string; still: string }

// O ponto inteiro da página: onde a ferramenta que a pessoa acabou de usar para.
const HANDOFF: readonly Handoff[] = [
  {
    step: 'Topic and angle',
    chatgpt: 'Strong. It will produce twenty angles on a topic in seconds.',
    still: 'Your judgement about which of the twenty is actually interesting to a stranger.',
  },
  {
    step: 'Script and hook',
    chatgpt: 'Strong, with the right prompt. Weak with a vague one.',
    still: 'Trimming to a spoken word budget and rewriting the first line so it opens a loop.',
  },
  {
    step: 'Voiceover',
    chatgpt: 'A chat window returns text. Voice mode talks to you; it does not export a narration track for a video.',
    still: 'A text-to-speech voice rendered to an audio file, timed against the script.',
  },
  {
    step: 'Visuals',
    chatgpt: 'It can generate images, and on paid tiers short silent clips. Both arrive one at a time.',
    still: 'Clips or stills chosen per line of narration, cropped to 9:16, and long enough to cover each line.',
  },
  {
    step: 'Captions',
    chatgpt: 'It can print the words. It cannot time them.',
    still: 'Word-level timing aligned to the audio and burned into the frame.',
  },
  {
    step: 'Assembly and export',
    chatgpt: 'Not something a chat assistant does.',
    still: 'A renderer that stitches audio, visuals and captions into one vertical MP4 you can upload.',
  },
  {
    step: 'Doing it again tomorrow',
    chatgpt: 'You re-prompt from scratch, and drift away from whatever worked.',
    still: 'A fixed structure you reuse, so the only variable left is the idea.',
  },
]

type Step = { title: string; detail: string }

const STEPS: readonly Step[] = [
  {
    title: 'Ask for narration, not an article',
    detail:
      'The default answer to "write me a YouTube Short about X" is prose: an intro, three paragraphs, a conclusion. Prose read aloud sounds like prose read aloud. Ask for spoken lines in a fixed structure and give the structure names, so you can reuse it tomorrow without re-explaining yourself. The prompt below does exactly that.',
  },
  {
    title: 'Cut to a spoken word budget',
    detail:
      'Length is decided in words, not in minutes. A clear narration voice covers roughly 2.3 to 2.8 words per second, so a 35-second Short is about 85 words and a 60-second one about 140 to 165. Whatever comes back longer than the budget is not "extra value", it is the part that plays after the viewer already left.',
  },
  {
    title: 'Strip everything a voice cannot say',
    detail:
      'Delete markdown asterisks, emoji, bracketed asides, abbreviations like e.g. and approx., and any figure written as $1.2B or 30%. A speech engine either reads them literally or guesses. Write numbers the way a person says them out loud, and the narration stops sounding like a document being scanned.',
  },
  {
    title: 'Hand the script to something that renders video',
    detail:
      'This is the actual handoff. Paste the finished narration into a generator that produces the voice, matches footage to each line, burns in captions and exports a 9:16 MP4. Kineo does that in one pass, usually in 3-7 minutes, and it accepts a script you wrote elsewhere rather than insisting on rewriting it.',
  },
  {
    title: 'Post, then read the first three seconds',
    detail:
      'The only number worth acting on early is the retention curve, and the part of it that matters is the opening drop. If viewers leave in the first three seconds, the hook failed and nothing downstream of it was ever seen. Change the hook, keep everything else fixed, and publish again.',
  },
]

// O prompt real, na estrutura que o pipeline da Kineo já parseia (HOOK / MICRO
// REWARD / ESCALATION / PAYOFF). Não é copy: é o formato que o produto lê.
const PROMPT = `You are writing narration for a 35-second YouTube Short about: [TOPIC].

Return ONLY the words that will be spoken, in this exact structure,
one label per line:

HOOK: one sentence under 12 words that opens a question in the viewer's head.
MICRO REWARD: one concrete, checkable fact that pays that question off immediately.
ESCALATION: two sentences that raise the stakes using a specific number, name, place or date.
RHYTHM: one short bridge sentence that changes the pace before the reveal.
PAYOFF: one closing sentence that closes the loop the hook opened.

Rules:
- 85 to 95 words in total, counting every label's text.
- No markdown, no emoji, no parentheses, no abbreviations.
- Write every number the way it is spoken out loud.
- Every line must be about something a camera could point at.
- Every factual claim must be one I can verify. If you are not sure, leave it out.`

type Failure = { title: string; detail: string }

const FAILURES: readonly Failure[] = [
  {
    title: 'It buries the hook under context',
    detail:
      'Language models are trained to set the scene first. "In the world of personal finance, many people wonder..." is four seconds of nothing at the exact moment you have the most attention you will ever have. The fix is mechanical: delete the first sentence, then check whether the script is worse. Usually it is not.',
  },
  {
    title: 'It writes to essay length, not to a clock',
    detail:
      'A default answer runs 200 words or more, which is about 80 seconds of narration. Give it the word budget in the prompt and it hits it; leave the budget out and you will be cutting by hand every single time.',
  },
  {
    title: 'The text is unspeakable',
    detail:
      'Asterisks, bullet glyphs, em dashes used as commas, "$1.2B", "24/7", "vs." — all of it survives the copy and paste and reaches the voice engine, which reads it wrong. This is the single most common reason a first AI Short sounds broken.',
  },
  {
    title: 'Nothing in it is visual',
    detail:
      'Lines like "success requires discipline" give a footage matcher nothing to search for. Lines like "a trader watching four screens at 4am" give it everything. If you plan to let software pick the visuals, write sentences that name objects, places and actions.',
  },
  {
    title: 'The specifics are confident and wrong',
    detail:
      'Invented dates, misattributed quotes and numbers that are almost right are the failure mode that costs a channel its comments section. Ask for checkable claims, then check them. This is the part of the job that does not automate, on any tool.',
  },
  {
    title: 'Every script opens the same way',
    detail:
      'Prompt the same model the same way twenty times and you get twenty videos with one voice. Reuse the structure, vary the angle. YouTube treats mass-produced, templated uploads as a monetization problem, and viewers treat them as a reason to scroll.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Can ChatGPT make YouTube Shorts?',
    a: 'Not end to end. ChatGPT is excellent at the writing half — topics, angles, hooks, narration, titles and descriptions. It does not return a narration audio track, it does not time captions to that audio, and it does not assemble a vertical MP4 you can upload. On paid tiers it can generate short silent video clips one at a time, which is a different thing from producing a finished, narrated, captioned Short. In practice people use ChatGPT for the script and a video generator for everything after it.',
  },
  {
    q: 'What is the fastest way to turn a ChatGPT script into a video?',
    a: 'Paste the narration into a generator that produces the voiceover, matches visuals to each line, burns in captions and exports 9:16 in one pass. That collapses four tools — a text-to-speech site, a stock footage library, a caption tool and an editor — into a single step. With Kineo it is usually 3-7 minutes from pasted script to a downloadable MP4.',
  },
  {
    q: 'How long should a ChatGPT script be for a Short?',
    a: 'Budget it in words, not minutes. At roughly 2.3 to 2.8 spoken words per second, a 20-second Short is about 45 to 55 words, a 35-second one about 80 to 100, and a 60-second one about 140 to 165. YouTube allows Shorts up to three minutes, but the cap is almost never the useful constraint — an idea padded to fill it loses the viewer long before the end.',
  },
  {
    q: 'Why does my ChatGPT script sound wrong when it is read aloud?',
    a: 'Almost always because the text still contains things a voice cannot say: markdown formatting, emoji, parenthetical asides, abbreviations like e.g., and figures written as symbols such as $1.2B or 30%. Speech engines either read those literally or guess at them. Rewrite numbers the way you would say them, delete every formatting character, and the same script usually sounds fine on the next render.',
  },
  {
    q: 'Are Shorts written with ChatGPT allowed to be monetized?',
    a: 'YouTube does not withhold monetization because AI was involved. What it excludes is content that is inauthentic, mass-produced, repetitious, or reused from another source without substantive modification — tests that apply identically to work made without AI. A ChatGPT-drafted script that you edited, verified and gave a distinct angle is not the thing those policies target; twenty near-identical uploads from the same prompt template is. Check the current policy yourself before relying on any summary, including this one.',
  },
  {
    q: 'Do I have to disclose that ChatGPT wrote the script?',
    a: 'YouTube lists script drafting, caption generation and voiceover assistance as production help that does not require disclosure. Disclosure is required for realistic altered or synthetic content — making a real person appear to say or do something they did not, or depicting a realistic event that did not happen. Disclosure also does not affect monetization eligibility. This is a summary, not legal advice; the linked YouTube page is the authority and it changes.',
  },
]

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

const NEXT_STEPS: { href: string; title: string; blurb: string }[] = [
  {
    href: '/text-to-video-shorts',
    title: 'Paste the script, get the video',
    blurb: 'The destination of step four: text in, narrated 9:16 MP4 out, captions burned in.',
  },
  {
    href: '/free-script-generator',
    title: 'Skip the prompting',
    blurb: 'A hook-first Short script from one topic, free and without signing up.',
  },
  {
    href: '/free-hook-generator',
    title: 'Fix the first three seconds',
    blurb: 'Hook variations for a script that is fine everywhere except its opening line.',
  },
  {
    href: '/free-ai-shorts',
    title: 'Twenty-eight faceless formats',
    blurb: 'Ready-made viral angles per niche when the blank prompt box is the problem.',
  },
]

export default function ChatGptToYouTubeShortsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to turn a ChatGPT script into a YouTube Short',
    description:
      'Five steps from a chat window to a posted vertical video: prompt for narration instead of prose, cut to a spoken word budget, strip anything a voice cannot say, render voice, footage and captions in one pass, then iterate on the opening three seconds.',
    step: STEPS.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.detail,
      url: `${BASE}/chatgpt-to-youtube-shorts#step-${index}`,
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'ChatGPT to YouTube Shorts',
        item: `${BASE}/chatgpt-to-youtube-shorts`,
      },
    ],
  }

  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
  const th: CSSProperties = {
    textAlign: 'left',
    padding: '13px 15px',
    color: MUTED,
    fontWeight: 600,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
  const td: CSSProperties = { padding: '13px 15px', color: '#d2d2d7', fontSize: '0.92rem', lineHeight: 1.55, verticalAlign: 'top' }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>ChatGPT to YouTube Shorts</span>
        </nav>

        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: ACCENT,
            border: '1px solid rgba(41,151,255,0.4)',
            background: 'rgba(41,151,255,0.12)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          Workflow guide — updated {UPDATED}
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          ChatGPT to YouTube Shorts
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 780 }}>
          You asked ChatGPT for a Short and it gave you words. That is the half it is good at. A Short is narration
          plus timed captions plus footage that matches what is being said, exported as a vertical MP4 — and none of
          those four come out of a chat window. This page marks exactly where ChatGPT stops, gives you a prompt that
          produces a script a video generator can actually use, and covers the handoff that turns it into a posted video.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <OrganicCtaLink
            href={`#${HANDOFF_ID}`}
            source={CAMPAIGN}
            placement="hero"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={HANDOFF_ID}
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}
          >
            Paste my ChatGPT script ↓
          </OrganicCtaLink>
          <Link
            href="/free-script-generator"
            style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}
          >
            Get a script first
          </Link>
        </div>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · No card
        </p>

        <section aria-labelledby={`${HANDOFF_ID}-title`} style={{ margin: '34px 0 0' }}>
          <h2 id={`${HANDOFF_ID}-title`} style={{ ...h2, margin: '0 0 8px' }}>
            Already have the script? Paste it here.
          </h2>
          <p style={p}>
            Your script stays attached through signup and arrives in Kineo ready for the best engine your active trial
            can cover; otherwise it falls back safely to Fast. You do not need to copy it a second time.
          </p>
          <TopicGeneratorForm
            campaign={CAMPAIGN}
            source={CAMPAIGN}
            placement="chatgpt_script_handoff"
            utmSource="seo"
            utmMedium="organic"
            scriptMode="verbatim"
            duration={35}
            creationIntent="trial_best"
            preserveHandoffForSignedIn
            examples={[]}
            formId={HANDOFF_ID}
            copy={{
              label: 'Paste the script ChatGPT wrote',
              placeholder: 'Paste up to 1,000 characters with labels intact — Voiceover:, Visual:, Camera: and timecodes included',
              submit: 'Turn this script into a Short →',
              examplesLabel: 'Script examples',
              note: 'If your script contains at least two Voiceover: or Narration: labels, Kineo reads only those speech blocks; recognized Visual:, Camera:, scene headers and timecodes stay out of narration. Your words, 35-second target, campaign and best eligible trial intent stay attached through signup. Kineo may adjust punctuation for voice pacing, but it will not rewrite your wording.',
            }}
          />
        </section>

        <h2 style={h2}>Where ChatGPT stops</h2>
        <p style={p}>
          Seven jobs stand between an idea and an uploaded Short. ChatGPT owns the first two outright and cannot do
          four of them at all. Reading the table row by row is the fastest way to see which tool you are actually
          missing.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={th}>Job</th>
                <th style={th}>What ChatGPT does</th>
                <th style={{ ...th, color: ACCENT }}>What you still need</th>
              </tr>
            </thead>
            <tbody>
              {HANDOFF.map((row) => (
                <tr key={row.step} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ ...td, fontWeight: 700, color: '#f5f5f7', whiteSpace: 'nowrap' }}>{row.step}</td>
                  <td style={td}>{row.chatgpt}</td>
                  <td style={{ ...td, color: '#f5f5f7' }}>{row.still}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          The four rows ChatGPT cannot cover are the reason a &ldquo;ChatGPT Shorts workflow&rdquo; usually turns into
          four separate tools. Collapsing them back into one is the whole argument for a{' '}
          <Link href="/faceless-video-generator" style={link}>faceless video generator</Link>.
        </p>

        <h2 style={h2}>The prompt that produces a usable script</h2>
        <p style={p}>
          Vague prompts return essays. This one returns narration with labelled sections, a word budget and a rule
          against anything a speech engine mispronounces. The section names are not decoration: reusing the same four
          labels every time is what makes your output consistent enough to compare video against video.
        </p>
        <pre
          style={{
            ...CARD,
            padding: '18px 20px',
            margin: '0 0 12px',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.86rem',
            lineHeight: 1.6,
            color: '#d2d2d7',
          }}
        >
          {PROMPT}
        </pre>
        <p style={small}>
          Replace <strong style={{ color: '#d2d2d7' }}>[TOPIC]</strong> and change the two numbers if you want a
          different length — the budget table below has the arithmetic. If you would rather not prompt at all, the{' '}
          <Link href="/free-script-generator" style={link}>free script generator</Link> returns the same shape from a
          topic, and <Link href="/free-hook-generator" style={link}>the hook generator</Link> rewrites only the opening
          line when the rest of the script is already fine.
        </p>

        <h2 style={h2}>The word budget, not the minute count</h2>
        <p style={p}>
          Length is the first thing people get wrong, because they think in seconds and the model writes in words. A
          clear narration voice at Shorts pace covers roughly {WORDS_PER_SECOND_LOW} to {WORDS_PER_SECOND_HIGH} words
          per second. Those are planning assumptions, not measurements — voices and pacing differ — but they are close
          enough to write to, and writing to a budget beats cutting after the fact.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
            <thead>
              <tr>
                <th style={th}>Target length</th>
                <th style={{ ...th, textAlign: 'right', color: ACCENT }}>Script length to ask for</th>
              </tr>
            </thead>
            <tbody>
              {LENGTHS.map((l) => (
                <tr key={l.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ ...td, fontWeight: 700, color: '#f5f5f7' }}>{l.label}</td>
                  <td style={{ ...td, textAlign: 'right', color: ACCENT, fontWeight: 700 }}>{wordBudget(l.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          YouTube{' '}
          <a href={SHORTS_SPEC} target="_blank" rel="noopener noreferrer" style={link}>
            caps Shorts at {SHORTS_MAX_SECONDS} seconds
          </a>
          , which is far more room than most single ideas deserve. The ceiling is rarely the constraint that matters.
        </p>

        <h2 style={h2}>Five steps from chat window to posted Short</h2>
        {STEPS.map((step, index) => (
          <section key={step.title} id={`step-${index}`} style={{ ...CARD, padding: '20px 22px', margin: '0 0 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              Step {index + 1}
            </div>
            <h3 style={{ fontSize: 'clamp(1.05rem, 3vw, 1.3rem)', fontWeight: 800, margin: '8px 0 8px' }}>{step.title}</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{step.detail}</p>
          </section>
        ))}

        <h2 style={h2}>Six ways a ChatGPT script fails as a Short</h2>
        <p style={p}>
          Every one of these is fixable in the prompt or in thirty seconds of editing, and every one of them is more
          common than a bad idea. If your first AI Short felt off and you could not say why, it is almost certainly on
          this list.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAILURES.map((f) => (
            <section key={f.title} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 750, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.93rem', margin: 0 }}>{f.detail}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>Where Kineo fits</h2>
        <p style={p}>
          Kineo is the second half of this workflow. Paste the narration you already have — or type the topic and let
          it write one — and it produces the AI voiceover, picks footage line by line from what is actually being said,
          burns in captions and exports a ready-to-post 9:16 MP4, usually in 3-7 minutes. It does not need you to
          abandon the script you liked: it keeps the words ChatGPT wrote. Kineo may adjust punctuation to pace the
          voice, but any result that changes the word sequence is rejected in code.
        </p>
        <p style={p}>
          What stays yours is the part that decides whether the channel works — the topic, the angle, the hook and the
          fact-checking. {ft(OFFER, 'A new account can create, watch, download and share up to 3 watermarked Fast videos every 24 hours with no card.', OFFER.copy.sentence)} That is enough to find out whether the script you just
          wrote survives contact with a real video before you commit to anything.
        </p>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 24px', borderColor: ACCENT }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px' }}>
            {ft(OFFER, 'Turn your ChatGPT script into a video', OFFER.copy.ctaHeading)}
          </h3>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Voice, matched footage, burned-in captions and a vertical MP4 in one pass. Paid plans unlock clean exports
            without a watermark and the premium engines.
          </p>
          <OrganicCtaLink
            href={`#${HANDOFF_ID}`}
            source={CAMPAIGN}
            placement="mid"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={HANDOFF_ID}
            style={{ display: 'inline-block', background: ACCENT, color: '#000', fontWeight: 800, padding: '12px 24px', borderRadius: 980, textDecoration: 'none', fontSize: '0.95rem' }}
          >
            Paste my script ↓
          </OrganicCtaLink>
        </section>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{item.a}</p>
            </section>
          ))}
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          The policy answers above summarise YouTube&rsquo;s{' '}
          <a href={MONETIZATION_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
            monetization policies
          </a>{' '}
          and its{' '}
          <a href={AI_DISCLOSURE} target="_blank" rel="noopener noreferrer" style={link}>
            altered or synthetic content disclosure rules
          </a>
          . They are the authority, they change, and this is not legal advice. The longer version lives on{' '}
          <Link href="/can-you-monetize-ai-videos" style={link}>can you monetize AI videos</Link>.
        </p>

        <h2 style={h2}>Where to go next</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {NEXT_STEPS.map((item) => (
            <Link key={item.href} href={item.href} style={{ ...CARD, padding: '16px 18px', textDecoration: 'none', display: 'block' }}>
              <div style={{ fontWeight: 750, color: '#f5f5f7', fontSize: '0.98rem' }}>{item.title}</div>
              <div style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.55, marginTop: 6 }}>{item.blurb}</div>
              <div style={{ color: ACCENT, fontSize: '0.85rem', fontWeight: 800, marginTop: 9 }}>Open →</div>
            </Link>
          ))}
        </div>

        <h2 style={h2}>Keep going</h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 32px' }}>
          <li>
            <Link href="/youtube-shorts-from-topic" style={link}>YouTube Shorts from a topic</Link> — the version of
            this workflow where you skip the chat window entirely.
          </li>
          <li>
            <Link href="/how-to-start-a-faceless-youtube-channel" style={link}>How to start a faceless channel</Link> —
            what to do with the scripts once you can produce them daily.
          </li>
          <li>
            <Link href="/ai-shorts-without-filming" style={link}>Shorts without filming</Link> — the no-camera side of
            the same pipeline.
          </li>
          <li>
            <Link href="/faceless-channel-ideas" style={link}>Faceless channel ideas</Link> — formats compared by
            weekly workload, for when the topic is the bottleneck.
          </li>
        </ul>

        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)',
            border: '1px solid rgba(41,151,255,0.25)',
            borderRadius: 18,
            padding: '34px 22px',
          }}
        >
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>You already have the script.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours — no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={`#${HANDOFF_ID}`}
            source={CAMPAIGN}
            placement="final"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={HANDOFF_ID}
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Paste and render it ↓
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
