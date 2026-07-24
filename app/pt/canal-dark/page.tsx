// PT-cluster (acq5) — Guia "como criar um canal dark" + "canal dark dá dinheiro".
// Alvo: buscas BR de alta intenção sem página dedicada até agora. Guia real
// (800+ palavras, PT-BR nativo): o que é, quanto paga (RPM honesto BR vs EUA),
// requisitos de monetização, 6 nichos em alta e o fluxo de 3 passos com Kineo.
// Estática, canonical próprio, FAQ visível espelhada no JSON-LD. Não edita
// nenhum arquivo existente. Números de produto verificados em app/facts/page.tsx
// e lib/checkoutPricing.ts (Starter US$4,90 / R$24,90 no 1º mês).
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=pt-cluster&utm_medium=seo&utm_campaign=acq5'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Como criar um canal dark em 2026 (e quanto ele paga de verdade) — Kineo',
  description:
    'Guia honesto: o que é canal dark, quanto o YouTube paga por Shorts no Brasil (RPM real), requisitos de monetização, os 6 nichos que mais crescem e como criar o primeiro vídeo com IA em 2–4 minutos.',
  alternates: { canonical: 'https://www.usekineo.com/pt/canal-dark' },
  openGraph: {
    title: 'Como criar um canal dark (guia honesto, com números reais)',
    description:
      'Quanto paga um canal dark de Shorts no Brasil, requisitos de monetização do YouTube, nichos em alta e o fluxo de 3 passos para gerar o vídeo com IA.',
    url: 'https://www.usekineo.com/pt/canal-dark',
    type: 'article',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const NICHOS = [
  {
    t: 'Curiosidades e fatos',
    d: '"Por que ninguém pode entrar na Ilha da Queimada Grande" — retenção alta, roteiro simples e tema infinito. O nicho mais fácil de começar.',
  },
  {
    t: 'Finanças e dinheiro',
    d: 'Erros bilionários, hábitos de rico, histórias de empresas que quebraram. CPM acima da média porque anunciantes de finanças pagam mais.',
  },
  {
    t: 'Mistério e crime',
    d: 'Casos não resolvidos, lugares proibidos, desaparecimentos. Um dos formatos com maior tempo de tela em Shorts no Brasil.',
  },
  {
    t: 'História',
    d: '"O erro que mudou uma guerra", impérios que sumiram, personagens esquecidos. Público fiel e pouco sensível a modinha.',
  },
  {
    t: 'Motivação e estoicismo',
    d: 'Frases, mentalidade, disciplina. Produção baratíssima e fácil de escalar — mas concorrência alta, então o gancho decide tudo.',
  },
  {
    t: 'Ciência e "o que acontece se..."',
    d: '"O que acontece com seu corpo depois de 24h sem dormir" — curiosidade científica em linguagem simples viraliza consistentemente.',
  },
] as const

const faq = [
  {
    q: 'Canal dark dá dinheiro mesmo?',
    a: 'Dá, mas com números realistas: Shorts em português pagam por volta de R$0,10 a R$0,60 por mil visualizações. Um canal dark BR vive de volume (postar todo dia) e de receitas além do AdSense — afiliados, produtos próprios e vídeos longos, que pagam RPM muito maior. Canais dark em inglês, mirando audiência dos EUA, recebem várias vezes mais por mil views.',
  },
  {
    q: 'O que preciso para monetizar Shorts no YouTube?',
    a: 'Para entrar no Programa de Parcerias com Shorts você precisa de 1.000 inscritos e 10 milhões de visualizações de Shorts nos últimos 90 dias (ou 4.000 horas assistidas de vídeos longos em 12 meses). Vídeos gerados com o Kineo são seus, com direito total de monetização.',
  },
  {
    q: 'Preciso aparecer, gravar voz ou saber editar?',
    a: 'Não. Canal dark é justamente isso: conteúdo sem rosto. No Kineo você digita o tema e a IA escreve o roteiro, narra com voz de IA em português, monta as imagens e adiciona as legendas — sai um MP4 vertical 9:16 pronto em cerca de 2 a 4 minutos no modo Fast.',
  },
  {
    q: 'Quanto custa começar um canal dark com IA?',
    a: 'Você começa de graça: até 3 vídeos com marca d’água a cada 24 horas, sem cartão. O plano Starter custa US$4,90 no primeiro mês (no Brasil, a cobrança é em Real: R$24,90 no primeiro mês e depois R$49,90/mês), com créditos renovados todo ciclo.',
  },
]

export default function CanalDarkPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/pt" style={{ color: ACCENT, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>
          <Link href="/pt" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.8rem' }}>Kineo em português</Link>
        </div>

        {/* Hero */}
        <section style={{ marginTop: 36 }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 14px' }}>
            Guia 2026 · sem promessa milagrosa
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5.5vw, 2.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.14, margin: '16px 0 0', background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Como criar um canal dark — e quanto ele paga de verdade
          </h1>
          <p style={{ fontSize: '1.02rem', color: MUTED, lineHeight: 1.65, margin: '16px 0 0' }}>
            Sem papo de &ldquo;R$10 mil no primeiro mês&rdquo;. Aqui está o que um canal dark é, quanto o YouTube
            realmente paga por Shorts no Brasil, o que você precisa para monetizar, os nichos que mais crescem —
            e como sair da ideia para o primeiro vídeo pronto em minutos, com IA.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', marginTop: 20, background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1rem' }}>
            Criar meu primeiro Short grátis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '10px 0 0' }}>
            Até 3 vídeos grátis a cada 24h · sem cartão
          </p>
        </section>

        {/* O que é */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 10px' }}>O que é um canal dark</h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.97rem', margin: 0 }}>
            Canal dark (ou canal faceless) é um canal do YouTube em que <b>ninguém aparece</b>: o conteúdo é feito de
            narração sobre imagens, vídeos de banco, animações ou cenas geradas por IA. Os exemplos clássicos são canais
            de curiosidades, mistério, finanças, história e motivação. A graça do modelo é que ele separa o canal da sua
            cara e da sua rotina — você não precisa de câmera, iluminação, carisma na frente da lente nem de mostrar sua
            vida. Precisa de duas coisas: <b>bons temas</b> e <b>consistência de postagem</b>. É por isso que o gargalo de
            todo canal dark nunca é a ideia — é a produção: roteirizar, narrar, buscar imagem, editar e legendar cada
            vídeo. É exatamente esse gargalo que a IA removeu.
          </p>
        </section>

        {/* Quanto paga */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 10px' }}>Canal dark dá dinheiro? Os números honestos</h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.97rem', margin: '0 0 14px' }}>
            Dá — mas você precisa entender como o dinheiro entra, porque a maioria dos vídeos sobre o assunto mente nessa
            parte. O AdSense de Shorts paga por RPM (receita por mil visualizações), e o RPM de Shorts é muito menor que o
            de vídeo longo:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, color: '#f5f5f7', marginBottom: 6 }}>🇧🇷 Shorts em português (Brasil)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: ACCENT }}>~R$0,10 a R$0,60</div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>
                por mil visualizações. 1 milhão de views de Shorts rende algo entre R$100 e R$600 — não é salário, é começo de bola de neve.
              </p>
            </div>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, color: '#f5f5f7', marginBottom: 6 }}>🇺🇸 Shorts em inglês (EUA)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: ACCENT }}>várias vezes mais</div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>
                anunciantes americanos pagam RPMs muito maiores — e em dólar. Por isso tantos brasileiros rodam canais dark em inglês sem falar inglês.
              </p>
            </div>
          </div>
          <p style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.97rem', margin: '14px 0 0' }}>
            A conclusão prática: <b>ninguém enriquece só com AdSense de Shorts em português</b>. Quem vive de canal dark no
            Brasil combina três alavancas: volume (postar todo dia custa quase nada quando a IA produz), receitas fora do
            AdSense (afiliados, produto próprio, divulgação) e migração da audiência para vídeos longos, cujo RPM é
            de outra ordem de grandeza. E como o custo de produzir com IA é de centavos por vídeo, a matemática fecha
            muito antes do que fechava em 2022, quando cada Short custava horas de edição.
          </p>
        </section>

        {/* Monetização */}
        <section style={{ marginTop: 40, ...CARD, borderRadius: 20, padding: '20px 22px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 10px' }}>Requisitos de monetização do YouTube (Shorts)</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.95rem' }}>
            <li><b style={{ color: ACCENT }}>1.000 inscritos</b> no canal; e</li>
            <li><b style={{ color: ACCENT }}>10 milhões de visualizações de Shorts</b> válidas nos últimos 90 dias (o caminho alternativo é 4.000 horas assistidas de vídeos longos em 12 meses).</li>
          </ul>
          <p style={{ color: MUTED, lineHeight: 1.65, fontSize: '0.88rem', margin: '10px 0 0' }}>
            Parece muito, mas 10M de views em 90 dias é o resultado típico de alguns Shorts virando virais num canal que
            posta diariamente — e é por isso que consistência importa mais que perfeição. Detalhe importante: vídeos
            gerados no Kineo são 100% seus, com direito total de monetização no YouTube, TikTok e Instagram.
          </p>
        </section>

        {/* Nichos */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 6px' }}>Os 6 nichos dark que mais crescem no Brasil</h2>
          <p style={{ color: MUTED, fontSize: '0.92rem', margin: '0 0 16px', lineHeight: 1.6 }}>
            Escolha um e fique nele por pelo menos 30 vídeos — o algoritmo recompensa canais que o público consegue rotular.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {NICHOS.map((n, i) => (
              <div key={n.t} style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, color: '#f5f5f7' }}>{n.t}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>{n.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fluxo com Kineo */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 6px' }}>Da ideia ao vídeo pronto: o fluxo de 3 passos</h2>
          <p style={{ color: MUTED, fontSize: '0.92rem', margin: '0 0 16px', lineHeight: 1.6 }}>
            Antes: ChatGPT para roteiro + ElevenLabs para voz + banco de imagens + CapCut para editar. Agora: um passo só.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Digite a ideia', d: '"Por que os aviões evitam voar sobre o Tibete". Uma frase basta — em português.' },
              { n: '2', t: 'A IA monta tudo', d: 'Roteiro com gancho, narração com voz de IA em português, imagens cena a cena e legendas queimadas no vídeo.' },
              { n: '3', t: 'Baixe e poste', d: 'Um MP4 vertical 9:16 pronto em cerca de 2–4 minutos no modo Fast. Poste no Shorts, TikTok e Reels.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 20, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#f5f5f7' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <p style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.95rem', margin: '16px 0 0' }}>
            Quer entender a ferramenta a fundo — motores, créditos, preços e a comparação com editar na mão? Veja o{' '}
            <Link href="/pt/gerador-video-faceless" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
              gerador de vídeo faceless do Kineo
            </Link>
            .
          </p>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 18px' }}>Perguntas frequentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <h3 style={{ fontWeight: 600, margin: '0 0 6px', fontSize: '0.97rem', color: '#f5f5f7' }}>{f.q}</h3>
                <p style={{ margin: 0, color: MUTED, lineHeight: 1.65, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 20, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Comece seu canal dark hoje — de graça</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>
            Digite um tema e receba o Short pronto com narração e legendas. Até 3 vídeos grátis a cada 24h, sem cartão.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
            Criar meu primeiro Short grátis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '14px 0 0' }}>
            <Link href="/pt" style={{ color: ACCENT, textDecoration: 'none' }}>Kineo em português</Link>
            {' · '}
            <Link href="/pt/gerador-video-faceless" style={{ color: ACCENT, textDecoration: 'none' }}>Gerador de vídeo faceless</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
