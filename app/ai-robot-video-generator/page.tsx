// KINEO-ROBOT-SEO-2026-08-25 — página de intenção quente nascida no DIA em
// que o Diretor Universal foi provado (#328/#329): "robot fight video
// generator" / "transformers style ai video" têm busca real e ZERO
// concorrente que entregue o FILME pronto — todo mundo gera clipe solto.
//
// A ARMA DESTA PÁGINA É A PROVA: o vídeo embedado é um render REAL do Omni
// Flash (id 36a04f7b, 25/08), e o ROTEIRO EXATO que o gerou está publicado ao
// lado — "this exact text made this film". Nenhum demo reel fabricado.
import type { Metadata } from 'next'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import {
  STUDIO_CREDITS,
  STUDIO_MONTH,
  creditsPerReferenceVideo,
  videosPerMonth,
} from '@/lib/marketingPrice'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const VIDEO_URL =
  'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/97bc70d7-8304-4ed1-b178-ecceed207db2.mp4'

const SCRIPT = `Midnight. The city grid flickers — then dies.

From the harbor, something rises. A machine the size of a building, plates of burning steel unfolding, eyes igniting white.

Across the skyline, a second giant answers. Concrete cracks under every step.

They collide in the financial district. The shockwave blows out ten thousand windows in a single breath — a storm of falling glass, glittering like rain.

Fists of steel meet armor plating. Sparks pour like waterfalls. A fuel line ruptures, and a river of fire rolls down the avenue.

One machine lifts a bridge section — three hundred tons of steel — and swings.

The impact registers on seismographs two hundred kilometers away.

By dawn, the fight is over. Two titans stand frozen in the smoke, the city burning quietly between them.

Machines built to protect us. This is what it costs when they disagree.`

export const metadata: Metadata = {
  title: 'AI Robot Video Generator — type the battle, get the whole film | Kineo',
  description:
    'Type a 150-word script and get a finished giant-robot battle film: scenes, voiceover, captions and soundtrack, rendered by Omni Flash — the #1-ranked video model (Aug 2026). Watch the real film and the exact text that made it.',
  alternates: { canonical: `${BASE}/ai-robot-video-generator` },
  openGraph: {
    title: 'AI Robot Video Generator — type the battle, get the whole film',
    description: 'A real giant-robot battle film generated from 150 words of text. The exact script is published next to the film.',
    url: `${BASE}/ai-robot-video-generator`,
    type: 'website',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can AI really generate a full robot fight video from text?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — the film on this page was generated from the 150-word script published next to it. Kineo plans the scenes, renders them on Omni Flash (Google’s #1-ranked video model, Aug 2026 arena), adds narration, karaoke captions and a soundtrack, and delivers a vertical 1080×1920 film. No editing step.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is this different from other AI video generators?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most tools generate one clip per prompt and leave the editing to you. Kineo directs the whole film: it reads your script, decides the genre (action, mystery, documentary), stages one clear action per shot, keeps the same machines and city across every scene, and returns a finished Short. A fight scene, a story, or a documentary all come out of the same text box.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does a robot battle film cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `On Omni Flash, a full 60-second multi-scene film costs ${creditsPerReferenceVideo('cinematic_omni')} credits — the Studio plan (${STUDIO_MONTH}, ${STUDIO_CREDITS} credits) fits ${videosPerMonth('pro', 'cinematic_omni')} flagship film a month plus change. Cheaper engines start at ${creditsPerReferenceVideo('cinematic_ai')} credits per 60-second film, and every new account gets ${TRIAL_GRANT_CREDITS_COPY} free credits with no card.`,
      },
    },
  ],
}

export default function RobotVideoPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>
        Kineo · AI Robot Video Generator
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 14px' }}>
        Type the battle. Get the whole film.
      </h1>
      <p style={{ color: '#c7c7cc', fontSize: 16, marginBottom: 26 }}>
        The film below was generated from <b>150 words of text</b> — the exact script is published next to it.
        No cameras, no CGI team, no editing. Kineo plans the scenes, renders them on{' '}
        <b>Omni Flash</b> (Google’s #1-ranked video model, Aug 2026 arena), and returns a finished vertical film
        with narration, captions and soundtrack.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <video
          src={VIDEO_URL}
          controls
          playsInline
          preload="metadata"
          style={{ width: 300, maxWidth: '100%', aspectRatio: '9/16', borderRadius: 14, border: '1px solid #2a2a2d', background: '#000' }}
        />
        <div style={{ flex: '1 1 320px' }}>
          <p style={{ color: '#5cb3ff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            The exact script that made this film
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5, color: '#a1a1a8', background: '#131316', border: '1px solid #2a2a2d', borderRadius: 12, padding: '16px 18px', margin: 0 }}>
            {SCRIPT}
          </pre>
        </div>
      </div>

      <div style={{ margin: '30px 0', padding: '20px 22px', borderRadius: 14, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px' }}>Your turn — type any battle, any story.</p>
        <a
          href="/free?utm_source=seo&utm_medium=robot_page&utm_campaign=universal"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}
        >
          Generate your first film free — no card
        </a>
        <p style={{ color: '#86868b', fontSize: 12, marginTop: 10 }}>{TRIAL_GRANT_CREDITS_COPY} free credits on signup · robots, mysteries, horror, history — the same text box directs them all</p>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>How it works</h2>
      <p style={{ color: '#c7c7cc' }}>
        Paste your script (or one line — the AI can write the rest). Kineo reads the text and decides the direction:
        an action script gets blockbuster cinematography and large-scale physics; a mystery gets a narrator; a
        documentary gets the 35mm look. Every scene is anchored so the same machines and the same city persist
        from the first shot to the last. The result is a 1080×1920 vertical film, usually 60–75 seconds, ready to post.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>Why the fights look real</h2>
      <p style={{ color: '#c7c7cc' }}>
        The engine behind this page is Omni Flash — ranked #1 in the August 2026 blind video arena precisely for
        physical realism: how metal collides, how glass falls, how fire spreads. Kineo stages one clear action per
        shot (a punch landing, a tower falling, a machine rising), which is the difference between a battle you can
        follow and a chaotic blur.
      </p>
    </main>
  )
}
