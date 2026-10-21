// KINEO-PAGINAS-CONECTOR-2110 — mesma paleta, glifos, URL copiável e vitrine da /claude-connector.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ShowcaseGrid from '@/app/claude-connector/ShowcaseGrid'
import { CopyField } from '@/app/claude-connector/ConnectPanel'
import { ClientGlyph } from '@/app/claude-connector/ClientGlyphs'
import { MCP_PALETTE as C } from '@/app/claude-connector/palette'
import { CLAUDE_STUDIO_MCP_SERVER_URL } from '@/lib/claudeConnect'
import { connectorGuide, connectorGuideFaq, connectorGuideSteps, CONNECTOR_GUIDES_REVIEWED, type ConnectorClient, type ConnectorLanguage } from '@/lib/seo/connectorGuides'

const card: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '22px', boxShadow: C.shadow, minWidth: 0 }
const h2: CSSProperties = { color: C.text, fontSize: 'clamp(1.5rem, 4vw, 2.15rem)', fontWeight: 650, letterSpacing: '-0.024em', lineHeight: 1.16, margin: '0 0 14px' }
const paragraph: CSSProperties = { color: C.body, fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }
const link: CSSProperties = { color: C.accent, textUnderlineOffset: 4 }
const button: CSSProperties = { display: 'inline-block', background: C.accent, color: C.onAccent, borderRadius: 999, padding: '13px 24px', fontWeight: 750, textDecoration: 'none', minHeight: 44 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }

export default function ConnectorGuidePage({ client, lang }: { client: ConnectorClient; lang: ConnectorLanguage }) {
  const pt = lang === 'pt'
  const name = client === 'chatgpt' ? 'ChatGPT' : 'Claude'
  const guide = connectorGuide(client, lang)
  const otherLang = lang === 'pt' ? 'en' : 'pt'
  const other = connectorGuide(client, otherLang)
  const faq = connectorGuideFaq(client, lang)
  const steps = connectorGuideSteps(client, lang)
  const signup = `/signup?utm_source=${client}_connector_guide&utm_medium=seo&utm_campaign=paginas_conector_2110`
  const cta = pt ? 'Criar minha conta Kineo' : 'Create my Kineo account'
  const requests = pt ? [
    { title: 'Filme narrado', text: 'Com o Kineo Studio, crie um filme narrado sobre um farol misterioso. Antes de criar, consulte meu saldo e o custo para o motor e a duração escolhidos.' },
    { title: 'Anúncio', text: 'Com o Kineo Studio, prepare o briefing de um anúncio do meu produto e me dê o link para continuar no Studio Ads. Pergunte os detalhes que faltarem.' },
  ] : [
    { title: 'Narrated film', text: 'Using Kineo Studio, create a narrated film about a mysterious lighthouse. Before creating, check my balance and the cost for the chosen engine and duration.' },
    { title: 'Ad', text: 'Using Kineo Studio, prepare a brief for an ad for my product and give me the link to continue in Studio Ads. Ask for any missing details.' },
  ]
  const docs = client === 'chatgpt' ? 'https://developers.openai.com/api/docs/guides/custom-mcp-server' : 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp'

  return (
    <main lang={lang} style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-sans), Arial, sans-serif', '--text': C.text, '--muted': C.muted } as CSSProperties}>
      <div style={{ background: C.heroGlow }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 64px' }}>
          <nav aria-label={pt ? 'Caminho da página' : 'Breadcrumb'} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
            <Link href="/claude-connector" style={link}>Kineo Studio</Link>
            <Link href={other.path} hrefLang={otherLang} lang={otherLang} style={link}>{pt ? 'Read in English' : 'Ler em português'} →</Link>
          </nav>
          <header style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', padding: 16, background: C.card, border: `1px solid ${C.line}`, borderRadius: 18 }}><ClientGlyph kind={client} size={32} /></span>
            <p style={{ color: C.muted, fontWeight: 700 }}>Kineo Studio + {name}</p>
            <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 4.6rem)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '16px 0 22px', textWrap: 'balance' }}>{guide.title}</h1>
            <p style={{ ...paragraph, fontSize: '1.12rem' }}>{pt ? `Conecte sua conta Kineo ao ${name} e crie filmes narrados na conversa. Para anúncios, prepare o briefing e continue no Studio Ads. A Kineo produz o filme na sua conta; o assistente pode consultar o andamento e trazer o link quando estiver pronto.` : `Connect your Kineo account to ${name} and create narrated films in the conversation. For ads, prepare the brief and continue in Studio Ads. Kineo produces the film in your account; the assistant can check progress and bring back the link when it is ready.`}</p>
            <p style={{ ...paragraph, fontWeight: 700 }}>{pt ? 'Você paga com os créditos da sua conta Kineo.' : 'You pay with the credits in your Kineo account.'}</p>
            {client === 'chatgpt' && <p style={{ ...paragraph, color: C.muted }}>{pt ? 'Precisa de um plano pago do ChatGPT e acesso ao Modo desenvolvedor.' : 'Requires a paid ChatGPT plan and access to Developer mode.'}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 26 }}>
              <Link href={signup} style={button}>{cta} →</Link>
              <a href="#connect-studio" style={link}>{pt ? 'Já tenho conta: como conectar' : 'Already have an account? Connect'}</a>
            </div>
          </header>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 64px', display: 'grid', gap: 64 }}>
        <section id="connect-studio" aria-labelledby="setup-title" style={{ scrollMarginTop: 24 }}>
          <h2 id="setup-title" style={h2}>{pt ? `Como conectar ao ${name}` : `How to connect to ${name}`}</h2>
          <p style={paragraph}>{pt ? 'Use o conector Kineo Studio, com login OAuth na sua conta Kineo. Ele está disponível para qualquer conta Kineo; criar vídeos depende do plano e dos créditos da conta.' : 'Use the Kineo Studio connector with OAuth sign-in to your Kineo account. It is available to any Kineo account; creating videos depends on your account plan and credits.'}</p>
          <ol style={{ ...grid, listStyle: 'none', padding: 0, margin: '24px 0' }}>
            {steps.map(([title, text], index) => <li key={title} style={card}>
              <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, background: C.accent, color: C.onAccent, fontWeight: 800 }}>{index + 1}</span>
              <h3 style={{ fontSize: '1.08rem', margin: '16px 0 10px' }}>{title}</h3>
              <p style={{ ...paragraph, margin: 0 }}>{text}</p>
            </li>)}
          </ol>
          <div style={{ ...card, maxWidth: 740 }}>
            <p style={{ margin: 0, color: C.muted, fontWeight: 700 }}>{pt ? 'URL do servidor Kineo Studio' : 'Kineo Studio server URL'}</p>
            <CopyField value={CLAUDE_STUDIO_MCP_SERVER_URL} label={pt ? 'URL do conector Kineo Studio' : 'Kineo Studio connector URL'} locale={lang} />
          </div>
          <p style={{ ...paragraph, fontSize: '0.88rem', marginTop: 16 }}>{pt ? 'Os rótulos podem variar. Confira também a ' : 'Labels may vary. See the '}<a href={docs} style={link}>{pt ? `documentação oficial do ${name}` : `official ${name} documentation`}</a>.</p>
        </section>
        <section aria-labelledby="requests-title">
          <h2 id="requests-title" style={h2}>{pt ? 'O que dá para pedir' : 'What you can ask for'}</h2>
          <div style={grid}>
            {requests.map((request) => <article key={request.title} style={card}><h3 style={{ margin: '0 0 12px' }}>{request.title}</h3><p style={{ ...paragraph, margin: 0 }}>{request.text}</p>{request.title === (pt ? 'Anúncio' : 'Ad') && <p style={{ ...paragraph, margin: '14px 0 0', fontSize: '0.9rem' }}>{pt ? 'O conector devolve um link do Kineo Studio; ele não gera nem cobra o anúncio na conversa. Continue no Studio Ads.' : 'The connector returns a Kineo Studio link; it does not generate or charge for the ad in chat. Continue in Studio Ads.'}</p>}</article>)}
            <article style={card}><p style={{ margin: '0 0 12px', color: C.warn, fontWeight: 750 }}>{pt ? 'Em breve' : 'Coming soon'}</p><h3 style={{ margin: '0 0 12px' }}>{pt ? 'Desenho infantil 3D' : '3D kids cartoons'}</h3><p style={{ ...paragraph, margin: 0 }}>{pt ? 'Ainda não disponível pelo conector. Acompanhe a Kineo para saber quando será possível pedir esse formato na conversa.' : 'Not yet available through the connector. Follow Kineo for updates on when you can request this format in the conversation.'}</p></article>
          </div>
        </section>
        <section aria-labelledby="showcase-title">
          <h2 id="showcase-title" style={{ ...h2, textAlign: 'center' }}>{pt ? 'Vídeos feitos na Kineo' : 'Videos made in Kineo'}</h2>
          <p style={{ ...paragraph, textAlign: 'center', maxWidth: 720, margin: '0 auto 28px' }}>{pt ? 'Exemplos reais dos produtos da Kineo: anúncios UGC, anúncios de produto e filmes narrados. São amostras da Kineo, não gravações de pedidos feitos pelo conector.' : 'Real examples from Kineo products: UGC ads, product ads and narrated films. These are Kineo samples, not recordings of orders placed through the connector.'}</p>
          <ShowcaseGrid locale={lang} />
        </section>
        <section aria-labelledby="credits-title" style={card}>
          <h2 id="credits-title" style={h2}>{pt ? 'Como funciona o custo em créditos' : 'How credit costs work'}</h2>
          <p style={paragraph}>{pt ? 'Você paga com os créditos da sua conta Kineo. O custo depende do motor, da duração e do tipo de vídeo. Antes de criar, peça ao assistente para consultar seu saldo e o custo do pedido. A assinatura do ChatGPT ou do Claude não inclui créditos da Kineo.' : 'You pay with the credits in your Kineo account. Cost depends on the engine, duration and video type. Before creating, ask the assistant to check your balance and the cost of your request. Your ChatGPT or Claude subscription does not include Kineo credits.'}</p>
          <Link href="/pricing" style={link}>{pt ? 'Ver planos e créditos atuais' : 'See current plans and credits'} →</Link>
        </section>
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" style={h2}>{pt ? 'Perguntas frequentes' : 'Frequently asked questions'}</h2>
          <div style={{ display: 'grid', gap: 12 }}>{faq.map(({ q, a }) => <details key={q} style={card}><summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem' }}>{q}</summary><p style={{ ...paragraph, margin: '14px 0 0' }}>{a}</p></details>)}</div>
          <p style={{ ...paragraph, marginTop: 16 }}><Link href="/privacy" style={link}>{pt ? 'Política de privacidade' : 'Privacy policy'}</Link> · <Link href="/terms" style={link}>{pt ? 'Termos de uso' : 'Terms of use'}</Link></p>
        </section>
        <section style={{ ...card, textAlign: 'center', padding: '36px 22px' }}>
          <h2 style={h2}>{pt ? 'Sua ideia começa na conversa' : 'Your idea starts in the conversation'}</h2>
          <p style={paragraph}>{pt ? 'Crie sua conta Kineo, conecte o Kineo Studio e confira os créditos antes de pedir seu vídeo.' : 'Create your Kineo account, connect Kineo Studio and check your credits before requesting a video.'}</p>
          <Link href={signup} style={button}>{cta} →</Link>
          <p style={{ color: C.muted, marginTop: 24, fontSize: '0.85rem' }}>{pt ? 'Guia atualizado em' : 'Guide updated on'} <time dateTime={CONNECTOR_GUIDES_REVIEWED}>{CONNECTOR_GUIDES_REVIEWED}</time></p>
        </section>
      </div>
      <Footer showStats={false} />
    </main>
  )
}
