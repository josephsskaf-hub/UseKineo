// ═══ KINEO-REWARDS-2026-08-25 — A DOR QUE SÓ NÓS RESOLVEMOS DE FÁBRICA ══════
//
// A jogada não-óbvia da noite: o TikTok Creator Rewards só monetiza vídeo com
// MAIS DE 1 MINUTO. Isso transformou "fazer Shorts" num problema novo para
// milhões de criadores — e a ferramenta média de IA entrega clipe de 5-10
// segundos. Nós já miramos 60s+ POR REGRA DA CASA (a regra fixa do fundador,
// 18/08: script de ~150-165 palavras, overshoot TIKTOK-61, corte final >60s).
//
// Ou seja: o requisito que quebra a concorrência é o nosso padrão de fábrica.
// Esta página existe para capturar essa intenção específica ("tiktok creator
// rewards video length", "how to make 1 minute videos for tiktok rewards"),
// que é intenção de QUEM QUER GANHAR DINHEIRO — o melhor comprador que existe.
import type { Metadata } from 'next'
import Link from 'next/link'
import { STARTER_MO, CREATOR_MO } from '@/lib/marketingPrice'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const VIDEO_URL =
  'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/97bc70d7-8304-4ed1-b178-ecceed207db2.mp4'

export const metadata: Metadata = {
  title: 'TikTok Creator Rewards needs videos over 1 minute — here is how to make them daily | Kineo',
  description:
    'The Creator Rewards program only monetizes videos longer than one minute. Most AI tools give you 5-second clips. Kineo is built to deliver 60-second-plus finished films from a single script — voiceover, captions and soundtrack included.',
  alternates: { canonical: `${BASE}/tiktok-creator-rewards-videos` },
  openGraph: {
    title: 'TikTok Creator Rewards: the 1-minute problem, solved',
    description: 'Kineo targets 60s+ by design — the exact length the Rewards program requires, delivered as a finished film.',
    url: `${BASE}/tiktok-creator-rewards-videos`,
    type: 'article',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How long does a TikTok video need to be for Creator Rewards?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Creator Rewards Program only monetizes videos longer than one minute. A 45-second video, however good, earns nothing from the program — which is why length has become a production problem for creators, not a creative choice.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I make one-minute AI videos every day?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A one-minute narrated video needs roughly 150 to 165 words of script — around 2.3 words per second of speech. Kineo takes that script (or writes it for you from one line), plans the scenes, renders them on real AI video engines and returns a finished vertical film over a minute long with voiceover, karaoke captions and soundtrack, usually in 3 to 7 minutes.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why do most AI video tools fail the 1-minute rule?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Because they generate clips, not films: a single generation is typically 5 to 10 seconds, so a one-minute video means stitching eight or more generations together yourself, keeping the character and the setting consistent and adding narration on top. Kineo does the stitching, the consistency and the narration as one pipeline.',
      },
    },
  ],
}

export default function RewardsPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 64px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>Kineo · Creator Rewards</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.14, margin: '10px 0 14px', letterSpacing: '-0.02em' }}>
        Rewards pays over one minute. <span style={{ color: '#5cb3ff' }}>Most AI tools stop at ten seconds.</span>
      </h1>

      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        That gap is the whole reason this page exists. The Creator Rewards Program only monetizes videos longer than
        a minute, and a single AI generation is typically 5–10 seconds. So the honest math is: one monetizable video
        means eight or more generations, stitched, kept consistent, narrated and captioned — every day, forever.
      </p>

      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        Kineo was built the other way around. <b>Our films target 60 seconds and up by default</b> — it is a house rule,
        not a setting: a script of ~150–165 words, scenes planned to fill it, and a deliberate overshoot so the final
        cut lands past the minute instead of just short of it.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', margin: '26px 0' }}>
        <video
          src={VIDEO_URL}
          controls
          playsInline
          preload="metadata"
          style={{ width: 280, maxWidth: '100%', aspectRatio: '9/16', borderRadius: 14, border: '1px solid #2a2a2d', background: '#000' }}
        />
        <div style={{ flex: '1 1 320px' }}>
          <p style={{ color: '#5cb3ff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            A real 65-second render
          </p>
          <p style={{ color: '#c7c7cc', fontSize: 14 }}>
            This film came from 150 words of text. It is 65 seconds long — past the Rewards threshold — with narration,
            karaoke captions and a soundtrack, delivered as a 1080×1920 master. No editor was opened at any point.
          </p>
          <ul style={{ color: '#a1a1a8', fontSize: 13.5, lineHeight: 1.8, paddingLeft: 18, marginTop: 10 }}>
            <li>Script too short for a minute? Kineo writes the missing lines and shows them to you first.</li>
            <li>Seven engines, including the #1-ranked model of the August 2026 arena.</li>
            <li>Same characters and settings across every scene — no jump cuts between strangers.</li>
          </ul>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>The daily rhythm that actually earns</h2>
      <p style={{ color: '#c7c7cc' }}>
        Rewards rewards consistency, and consistency dies on production time. One idea in the text box gives you a
        finished, minute-plus film in roughly 3–7 minutes — which makes a daily post a habit instead of a project.
        Plans start at {STARTER_MO}; {CREATOR_MO} is the one built for posting every day.
      </p>

      <div style={{ margin: '28px 0 0', padding: '20px 22px', borderRadius: 14, background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px' }}>Make your first minute-plus film free.</p>
        <Link
          href="/free?utm_source=seo&utm_medium=tiktok_rewards&utm_campaign=one_minute"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}
        >
          Start free — no card
        </Link>
        <p style={{ color: '#86868b', fontSize: 12, marginTop: 10 }}>25 credits on signup · every engine unlocked</p>
      </div>

      <p style={{ color: '#5a5a60', fontSize: 11.5, marginTop: 20 }}>
        Program rules and eligibility are set by TikTok and change over time — check the current Creator Rewards
        requirements in the app. Kineo is an independent tool and is not affiliated with TikTok.
      </p>
    </main>
  )
}
