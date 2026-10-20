// KINEO-MCP-STUDIO-2010 — a seção "Kineo Studio" da página /claude-connector: o conector que faz o filme de verdade
// dentro da conta da pessoa, adicionado por URL (Customize → Connectors → Add custom connector). Vive num arquivo
// próprio para a página do diretório (page.tsx) ganhar só duas linhas marcadas; o resto do que já existia fica igual.
// Em inglês e em português, lado a lado. A URL vem da fonte única lib/claudeConnect.ts (nada digitado aqui).
// O chip de disponibilidade lê MCP_STUDIO_LIVE no build (a página é estática): a Vercel refaz o build ao trocar a env.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { CLAUDE_ADD_CONNECTOR_URL, CLAUDE_STUDIO_CONNECT_ANCHOR, CLAUDE_STUDIO_MCP_SERVER_URL } from '@/lib/claudeConnect'
import { studioLiveMode } from '@/lib/mcp/studioLaunch'
import { CopyField } from './ConnectPanel'
import { MCP_PALETTE as C } from './palette'

const CARD: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 20px' }

const STATUS_COPY = {
  off: { en: 'Opening soon', pt: 'Abre em breve' },
  internal: { en: 'Rolling out — Kineo team accounts first', pt: 'Abrindo aos poucos — contas da equipe primeiro' },
  all: { en: 'Available to every Kineo account', pt: 'Disponível para toda conta Kineo' },
} as const

const STEPS_EN = [
  ['Open Claude connector settings', 'In Claude (web or desktop): Customize → Connectors → “Add custom connector”.'],
  ['Paste the Kineo Studio URL', 'Name it “Kineo Studio”, paste the URL below and continue. Claude detects the sign-in on its own.'],
  ['Sign in to your Kineo account', 'Claude opens the Kineo login you already use. Allow the connection and you are back in Claude.'],
  ['Ask for a film', 'Say what you want, pick the engine and the length. Claude orders the film, your account pays the credits, and Claude hands you the link when it is ready.'],
] as const

const STEPS_PT = [
  ['Abra os conectores do Claude', 'No Claude (web ou desktop): Personalizar → Conectores → “Adicionar conector personalizado”.'],
  ['Cole a URL do Kineo Studio', 'Dê o nome “Kineo Studio”, cole a URL abaixo e continue. O Claude detecta o login sozinho.'],
  ['Entre na sua conta Kineo', 'O Claude abre o login da Kineo que você já usa. Autorize a conexão e volte ao Claude.'],
  ['Peça um filme', 'Diga o que quer, escolha o motor e a duração. O Claude faz o pedido, a sua conta paga os créditos e o Claude te entrega o link quando ficar pronto.'],
] as const

export default function StudioSection() {
  const mode = studioLiveMode()
  const h2: CSSProperties = { fontSize: 'clamp(1.4rem, 3.6vw, 2rem)', fontWeight: 900, letterSpacing: '-0.01em', margin: '72px 0 12px', color: C.text }
  const p: CSSProperties = { fontSize: '1rem', color: C.body, lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: C.muted, lineHeight: 1.6, margin: '0 0 14px' }
  const chip: CSSProperties = { display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 999, padding: '4px 10px', marginLeft: 10, verticalAlign: 'middle', color: mode === 'all' ? C.ok : C.warn, border: `1px solid ${mode === 'all' ? C.okLine : C.line}` }
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12, margin: '14px 0 18px', padding: 0, listStyle: 'none' }
  const stepTitle: CSSProperties = { margin: '0 0 4px', fontWeight: 800, fontSize: '0.98rem' }
  const num: CSSProperties = { display: 'inline-flex', width: 24, height: 24, borderRadius: 999, background: C.accent, color: C.onAccent, fontWeight: 900, fontSize: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 }
  const status = STATUS_COPY[mode]

  const steps = (list: typeof STEPS_EN | typeof STEPS_PT) => (
    <ol style={grid}>
      {list.map(([title, line], i) => (
        <li key={title} style={CARD}>
          <p style={stepTitle}><span style={num}>{i + 1}</span>{title}</p>
          <p style={{ ...small, margin: 0 }}>{line}</p>
        </li>
      ))}
    </ol>
  )

  return (
    <section id={CLAUDE_STUDIO_CONNECT_ANCHOR} style={{ scrollMarginTop: 24 }}>
      <h2 style={h2}>
        Kineo Studio: your Kineo account inside Claude
        <span style={chip}>{status.en}</span>
      </h2>
      <p style={{ ...p, maxWidth: 820 }}>
        The Kineo MCP server above writes scripts and hands them to Studio. <strong>Kineo Studio</strong> is a second,
        separate connector for people who already have a Kineo account: you add it by URL, sign in once, and from then on
        Claude places the order and Kineo makes the film in your account — the same engines, prices and rules as pressing
        Generate in Studio. Credits are spent only when a render actually starts; with no plan or balance, Claude gets a
        link to the plans instead.
      </p>
      {steps(STEPS_EN)}
      <div style={{ maxWidth: 560 }}>
        <p style={{ ...small, margin: '0 0 4px', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kineo Studio connector URL</p>
        <CopyField value={CLAUDE_STUDIO_MCP_SERVER_URL} label="Kineo Studio connector URL" />
        <p style={{ ...small, margin: '10px 0 0' }}>
          <a href={CLAUDE_ADD_CONNECTOR_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>Open the “Add custom connector” dialog ↗</a>
          {' '}· Tools: kineo_account, kineo_create_video, kineo_video_status, kineo_list_videos. Each render is one film; a
          15-second Seedance 1.5 film is the cheapest way to try. Remove the connector in Claude to revoke access at any time.
          Current prices: <Link href="/pricing?utm_source=claude_studio_connector" style={{ color: C.accent, textDecoration: 'none' }}>plans</Link>.
        </p>
      </div>

      <h3 style={{ ...h2, fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', margin: '40px 0 10px' }}>
        Em português: Kineo Studio, crie vídeos dentro do Claude
        <span style={chip}>{status.pt}</span>
      </h3>
      <p style={{ ...p, maxWidth: 820 }}>
        O servidor Kineo MCP acima escreve roteiros e os manda para o Studio. O <strong>Kineo Studio</strong> é um segundo
        conector, separado, para quem já tem conta na Kineo: você adiciona pela URL, entra uma vez, e dali em diante o
        Claude faz o pedido e a Kineo produz o filme na sua conta — mesmos motores, preços e regras de apertar Gerar no
        Studio. Os créditos só saem quando a produção realmente começa; sem plano ou saldo, o Claude recebe um link para
        os planos em vez de cobrar.
      </p>
      {steps(STEPS_PT)}
      <div style={{ maxWidth: 560 }}>
        <p style={{ ...small, margin: '0 0 4px', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>URL do conector Kineo Studio</p>
        <CopyField value={CLAUDE_STUDIO_MCP_SERVER_URL} label="URL do conector Kineo Studio" />
        <p style={{ ...small, margin: '10px 0 0' }}>
          Para revogar o acesso, remova o conector no Claude. Dúvidas: <a href="mailto:support@usekineo.com" style={{ color: C.accent, textDecoration: 'none' }}>support@usekineo.com</a>.
        </p>
      </div>
    </section>
  )
}
