// KINEO-PASTE-PAGE-2026-09-07 — /chatgpt.
//
// POR QUE ESTA PÁGINA EXISTE: 57% dos cadastros chegam de chatgpt.com por
// CITAÇÃO — a pessoa pede um roteiro ao ChatGPT e precisa colar na Kineo. A
// casa construiu para isso um "handoff" (lib/gptHandoff.ts): o roteiro vira
// uma linha em `gpt_handoffs` e um link /go/<token> que abre o Studio já
// preenchido. Dois canais existiam: a Action do GPT da loja (POST
// /api/gpt/handoff) e o link GET /make de qualquer assistente.
//
// FATO NOVO (06/09 23:55): a OpenAI fechou a criação/publicação de GPTs para
// contas pessoais desde 16/08/2026 — só workspaces Business/Enterprise. O GPT
// da Kineo existe como rascunho e não pode ser publicado. Então a jogada muda:
// em vez de esperar a loja, esta página faz o mesmo trabalho SEM depender de
// ninguém. Dá à pessoa o PROMPT para colar no ChatGPT/Claude/Gemini, e uma
// caixa para colar de volta o roteiro que a IA escreveu — que vira o MESMO
// /go/<token>, pelo terceiro canal (`paste_page`).
//
// O que a página NUNCA promete: que o link gera vídeo sozinho. Ele PREPARA o
// Studio e espera o clique (regra da casa — um link jamais gasta crédito).
// Nenhum preço literal, nenhum número digitado: prompt, durações, teto e
// assistentes vêm de @/lib/gptHandoff; a frase do trial vem de
// @/lib/freeTierOffer via ft(OFFER, ...), byte a byte como as páginas irmãs.
// Layout/classes: o MOLDE é app/chatgpt-to-youtube-shorts/page.tsx (sem CSS
// novo). Server component; o único JS de cliente é ChatgptPastePanel (copiar,
// colar, enviar) — que NÃO importa a lib (node:crypto), recebe tudo por props.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import {
  ASSISTANT_PASTE_PROMPT,
  DEFAULT_DURATION,
  DURATIONS,
  HANDOFF_TTL_DAYS,
  PASTE_ASSISTANTS,
  SCRIPT_MAX_CHARS,
  type PasteAssistant,
} from '@/lib/gptHandoff'
import ChatgptPastePanel from './ChatgptPastePanel'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
/** K1 — a etiqueta do canal, a MESMA de CHANNEL_TAGS.paste_page.utmSource. */
const PRICING_HREF = '/pricing?utm_source=paste_page'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'ChatGPT Script to Video — Paste the Script, Get the Film | Kineo',
  description:
    'You already use ChatGPT, Claude or Gemini to write the script. Copy one prompt, paste the script the AI wrote, and Kineo Studio opens with it loaded — narration, footage and captions in one pass.',
  alternates: { canonical: `${BASE}/chatgpt` },
  openGraph: {
    title: 'ChatGPT script to video — paste it, Kineo films it',
    description:
      'One prompt for your AI, one box to paste the script back. Kineo Studio opens ready; nothing renders until you press Generate.',
    url: `${BASE}/chatgpt`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGPT script to video | Kineo',
    description: 'Copy the prompt, paste the script your AI wrote, and Kineo Studio opens with it loaded.',
  },
}

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

/** Rótulos humanos dos ids de PASTE_ASSISTANTS (a lista é da lib; o rótulo é UI). */
const ASSISTANT_LABELS: Readonly<Record<PasteAssistant, string>> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  other: 'Another AI',
}

/** Só links, nada mais: abrem em aba nova, sem opener. */
const ASSISTANT_LINKS: readonly { label: string; href: string }[] = [
  { label: 'Open ChatGPT', href: 'https://chatgpt.com/' },
  { label: 'Open Claude', href: 'https://claude.ai/' },
  { label: 'Open Gemini', href: 'https://gemini.google.com/' },
]

export default function ChatgptPastePage() {
  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
  const step: CSSProperties = {
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
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'var(--font-sans), Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
            <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
            <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>ChatGPT script to video</span>
          </span>
          {/* K1 — "See plans" visível, etiquetado com o canal. */}
          <Link href={PRICING_HREF} style={{ color: MUTED, fontSize: '0.9rem', textDecoration: 'none' }}>
            See plans →
          </Link>
        </nav>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          You write the script with ChatGPT. Kineo turns it into the film.
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 780 }}>
          Two steps, no account needed to start. Copy the prompt below into ChatGPT, Claude or Gemini and let it write
          the narration. Paste what it wrote into the box, and Kineo Studio opens with your script, length and engine
          already filled in. Nothing is generated until you press Generate there.
        </p>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · Free to start ·{' '}
          <Link href={PRICING_HREF} style={link}>See plans</Link>
        </p>

        {/* ── Passo 1 ── */}
        <div style={{ marginTop: 40 }}>
          <span style={step}>Step 1 — the prompt</span>
        </div>
        <h2 style={{ ...h2, margin: '14px 0 8px' }}>Copy this into your AI</h2>
        <p style={p}>
          It asks the AI for narration in the four-part structure Kineo reads (HOOK, MICRO REWARD, ESCALATION,
          PAYOFF), with the spoken word budget for each length and a rule against anything a voice cannot say. The AI
          will ask you one question — how long the video should be — then write the script.
        </p>
        <ChatgptPastePanel
          prompt={ASSISTANT_PASTE_PROMPT}
          durations={DURATIONS}
          defaultDuration={DEFAULT_DURATION}
          scriptMaxChars={SCRIPT_MAX_CHARS}
          assistants={PASTE_ASSISTANTS.map((id) => ({ id, label: ASSISTANT_LABELS[id] }))}
          cardStyle={CARD}
          accent={ACCENT}
          muted={MUTED}
        />
        <p style={{ ...small, margin: '12px 0 0' }}>
          {ASSISTANT_LINKS.map((a, i) => (
            <span key={a.href}>
              {i > 0 && <span style={{ color: MUTED }}> · </span>}
              <a href={a.href} target="_blank" rel="noopener noreferrer" style={link}>
                {a.label} ↗
              </a>
            </span>
          ))}
        </p>

        {/* ── Passo 2 (a caixa está dentro do painel acima; aqui fica o texto) ── */}
        <h2 style={h2}>What happens after you paste</h2>
        <p style={p}>
          Kineo checks the length against the word budget, saves the script under a private link, and opens the Studio
          with it loaded exactly as written (&ldquo;Use my script as is&rdquo;). If you do not have an account yet, you
          create one and come straight back to the script. The link stays open for {HANDOFF_TTL_DAYS} days.
        </p>
        <p style={small}>
          Scripts up to {SCRIPT_MAX_CHARS.toLocaleString('en-US')} characters. Kineo never stretches a short script —
          if the AI came in under the budget, ask it for one more beat before pasting. Prefer to skip the prompting?{' '}
          <Link href="/free-script-generator" style={link}>The free script generator</Link> returns the same shape from
          a topic, and <Link href="/chatgpt-to-youtube-shorts" style={link}>the workflow guide</Link> explains where
          ChatGPT stops and Kineo starts.
        </p>
      </div>
      <Footer />
    </main>
  )
}
