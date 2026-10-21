// KINEO-MCP-STUDIO-2010 — a seção "Kineo Studio" da página /claude-connector: o conector que faz o filme de verdade
// dentro da conta da pessoa, adicionado por URL (Customize → Connectors → Add custom connector). Vive num arquivo
// próprio para a página do diretório (page.tsx) ganhar só duas linhas marcadas; o resto do que já existia fica igual.
// Em inglês e em português, lado a lado. KINEO-MCP-STUDIO-AJUSTE-2010: + os passos do ChatGPT (Developer mode). A URL vem da fonte única lib/claudeConnect.ts (nada digitado aqui).
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

// KINEO-MCP-STUDIO-AJUSTE-2010 — os passos do ChatGPT, conferidos pelo fundador em 20/10 (job 6ce0763f). Exige plano pago do ChatGPT.
const STEPS_CHATGPT_EN = [
  ['Turn on Developer mode', 'In ChatGPT: Settings → Apps & Connectors (called Plugins in some versions) → Advanced settings → turn on Developer mode. Needs a paid ChatGPT plan (Plus or higher).'],
  ['Add a custom MCP server', 'Click Create (or “Add custom MCP server”). Name it “Kineo Studio”, paste the URL below, choose Authentication: OAuth and tick “I trust this application”.'],
  ['Sign in and allow', 'ChatGPT opens the Kineo login you already use. Click Allow on the Kineo screen and you are back in ChatGPT.'],
  ['Turn it on in a chat', 'In a new chat, enable Kineo Studio from the “+” / Developer mode menu, then ask for a film the same way.'],
] as const

const STEPS_CHATGPT_PT = [
  ['Ligue o modo desenvolvedor', 'No ChatGPT: Configurações → Apps e Conectores (em algumas versões, Plugins) → Configurações avançadas → ligue o Modo desenvolvedor. Precisa de plano pago do ChatGPT (Plus ou superior).'],
  ['Adicione um servidor MCP personalizado', 'Clique em Criar (ou “Adicionar servidor MCP personalizado”). Nome: “Kineo Studio”, cole a URL abaixo, escolha Autenticação: OAuth e marque “Confio neste aplicativo”.'],
  ['Entre e autorize', 'O ChatGPT abre o login da Kineo que você já usa. Clique em Permitir (Allow) na tela da Kineo e volte ao ChatGPT.'],
  ['Ligue numa conversa', 'Numa conversa nova, ative o Kineo Studio no menu “+” / Modo desenvolvedor e peça o filme do mesmo jeito.'],
] as const

export default function StudioSection() {
  const mode = studioLiveMode()
  const h2: CSSProperties = { fontSize: 'clamp(1.5rem, 3.6vw, 2.2rem)', fontWeight: 650, letterSpacing: '-0.024em', lineHeight: 1.12, margin: '80px 0 12px', color: C.text }
  const p: CSSProperties = { fontSize: '1rem', color: C.body, lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: C.muted, lineHeight: 1.6, margin: '0 0 14px' }
  const chip: CSSProperties = { display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 999, padding: '4px 10px', marginLeft: 10, verticalAlign: 'middle', color: mode === 'all' ? C.ok : C.warn, border: `1px solid ${mode === 'all' ? C.okLine : C.line}` }
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12, margin: '14px 0 18px', padding: 0, listStyle: 'none' }
  const stepTitle: CSSProperties = { margin: '0 0 4px', fontWeight: 800, fontSize: '0.98rem' }
  const num: CSSProperties = { display: 'inline-flex', width: 24, height: 24, borderRadius: 999, background: C.accent, color: C.onAccent, fontWeight: 900, fontSize: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 }
  const status = STATUS_COPY[mode]

  const steps = (list: typeof STEPS_EN | typeof STEPS_PT | typeof STEPS_CHATGPT_EN | typeof STEPS_CHATGPT_PT) => ( // KINEO-MCP-STUDIO-AJUSTE-2010: + ChatGPT
    <ol style={grid}>
      {list.map(([title, line], i) => (
        <li key={title} style={CARD}>
          <p style={stepTitle}><span style={num}>{i + 1}</span>{title}</p>
          <p style={{ ...small, margin: 0 }}>{line}</p>
        </li>
      ))}
    </ol>
  )

  const sub: CSSProperties = { margin: '22px 0 4px', fontSize: '1.05rem', fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }
  const live: CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ok, background: C.okSoft, borderRadius: 999, padding: '3px 8px' }
  const urlBox = (label: string) => (
    <div style={{ maxWidth: 560 }}>
      <p style={{ ...small, margin: '0 0 4px', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <CopyField value={CLAUDE_STUDIO_MCP_SERVER_URL} label={label} />
    </div>
  )

  return (
    <section id={CLAUDE_STUDIO_CONNECT_ANCHOR} style={{ scrollMarginTop: 24 }}>
      <h2 style={h2}>
        Kineo Studio: your Kineo account inside Claude and ChatGPT
        <span style={chip}>{status.en}</span>
      </h2>
      <p style={{ ...p, maxWidth: 820 }}>
        Kineo MCP (the server above) writes scripts and hands them to Studio — it never renders or charges. <strong>Kineo Studio</strong> is
        the second, separate connector for people who already have a Kineo account: you add it by URL, sign in once, and from then on
        Claude or ChatGPT places the order and Kineo makes the film in your account, spending your account&apos;s credits — the same
        engines, prices and rules as pressing Generate in Studio. Credits are spent only when a render actually starts; with no plan or
        balance, the assistant gets a link to the plans instead.
      </p>
      {urlBox('Kineo Studio connector URL')}
      <p style={sub}>In Claude {mode === 'all' && <span style={live}>Live</span>}</p>
      {steps(STEPS_EN)}
      <p style={sub}>In ChatGPT {mode === 'all' && <span style={live}>Live</span>}</p>
      {steps(STEPS_CHATGPT_EN)}
      <p style={{ ...small, margin: '4px 0 0', maxWidth: 820 }}>
        <a href={CLAUDE_ADD_CONNECTOR_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>Open Claude&apos;s “Add custom connector” dialog ↗</a>
        {' '}· Tools: kineo_account, kineo_create_video, kineo_video_status, kineo_list_videos. Each render is one film; a
        15-second Seedance 1.5 film is the cheapest way to try. To revoke access at any time, remove the connector in the app you
        connected (Claude or ChatGPT). Current prices: <Link href="/pricing?utm_source=claude_studio_connector" style={{ color: C.accent, textDecoration: 'none' }}>plans</Link>.
      </p>

      <h3 style={{ ...h2, fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', margin: '48px 0 10px' }}>
        Em português: Kineo Studio, crie vídeos no Claude e no ChatGPT
        <span style={chip}>{status.pt}</span>
      </h3>
      <p style={{ ...p, maxWidth: 820 }}>
        O Kineo MCP (o servidor acima) escreve roteiros e os manda para o Studio — ele não produz vídeo nem cobra. O <strong>Kineo Studio</strong> é
        o segundo conector, separado, para quem já tem conta na Kineo: você adiciona pela URL, entra uma vez, e dali em diante o Claude
        ou o ChatGPT faz o pedido e a Kineo produz o filme na sua conta, gastando os créditos dela — mesmos motores, preços e regras de
        apertar Gerar no Studio. Os créditos só saem quando a produção realmente começa; sem plano ou saldo, o assistente recebe um
        link para os planos em vez de cobrar.
      </p>
      {urlBox('URL do conector Kineo Studio')}
      <p style={sub}>No Claude {mode === 'all' && <span style={live}>No ar</span>}</p>
      {steps(STEPS_PT)}
      <p style={sub}>No ChatGPT {mode === 'all' && <span style={live}>No ar</span>}</p>
      {steps(STEPS_CHATGPT_PT)}
      <p style={{ ...small, margin: '4px 0 0' }}>
        Para revogar o acesso, remova o conector no app em que você conectou (Claude ou ChatGPT). Dúvidas: <a href="mailto:support@usekineo.com" style={{ color: C.accent, textDecoration: 'none' }}>support@usekineo.com</a>.
      </p>
    </section>
  )
}
