// PT-cluster (acq5) — Página produto-guia "gerador de vídeo faceless" /
// "criar vídeo sem aparecer com IA". Como funciona, os 3 motores (Fast 1cr,
// AI Generated 20cr, Cinematic 50cr), tier grátis (3 vídeos com marca d'água a
// cada 24h, sem cartão), preços (Starter US$4,90 no 1º mês; no BR a cobrança é
// em Real — R$24,90/1º mês, conforme app/pt/page.tsx e lib/checkoutPricing.ts)
// e comparação honesta com editar manualmente no CapCut. Nota: app/pt/page.tsx
// NÃO menciona Mercado Pago, então esta página também não menciona (verificado).
// Estática, canonical próprio, cross-link com /pt e /pt/canal-dark.
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=pt-cluster&utm_medium=seo&utm_campaign=acq5'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Gerador de vídeo faceless com IA — crie Shorts sem aparecer — Kineo',
  description:
    'Crie vídeos sem aparecer: digite a ideia e a IA entrega o Short pronto com roteiro, narração em português, imagens e legendas em 2–4 minutos. Até 3 vídeos grátis a cada 24h, sem cartão.',
  alternates: { canonical: 'https://www.usekineo.com/pt/gerador-video-faceless' },
  openGraph: {
    title: 'Gerador de vídeo faceless com IA — sem aparecer, sem editar',
    description:
      'Uma ideia vira um vídeo vertical pronto: roteiro, voz de IA, imagens e legendas no automático. Grátis para começar, sem cartão.',
    url: 'https://www.usekineo.com/pt/gerador-video-faceless',
    type: 'website',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const ENGINES = [
  {
    name: 'Fast',
    creditos: '1 crédito por vídeo',
    d: 'Imagens e vídeos de banco curados pela IA. O modo mais rápido e barato — pronto em cerca de 2–4 minutos. Ideal para postar todo dia.',
    tag: 'Mais usado',
  },
  {
    name: 'AI Generated',
    creditos: '20 créditos por vídeo',
    d: 'Cada cena é gerada do zero por IA de texto-para-vídeo (Seedance). Visual único, que não existe em nenhum banco de imagens.',
    tag: 'Cenas geradas por IA',
  },
  {
    name: 'Cinematic',
    creditos: '50 créditos por vídeo',
    d: 'Motor premium (Kling) para qualidade cinematográfica. Para vídeos-âncora do canal, em que cada frame precisa impressionar.',
    tag: 'Qualidade máxima',
  },
] as const

const CAPCUT_ROWS = [
  { etapa: 'Roteiro com gancho', manual: 'Você pesquisa e escreve (30–60 min)', kineo: 'A IA escreve na hora' },
  { etapa: 'Narração', manual: 'Gravar a própria voz ou pagar locutor/ferramenta de voz', kineo: 'Voz de IA em português, incluída' },
  { etapa: 'Imagens e cenas', manual: 'Caçar clipes em bancos, baixar, organizar (1h+)', kineo: 'Selecionadas e encaixadas cena a cena' },
  { etapa: 'Edição e legendas', manual: 'Cortar, sincronizar e legendar no CapCut (1–2h)', kineo: 'Legendas geradas e queimadas no vídeo' },
  { etapa: 'Total por vídeo', manual: 'Algumas horas', kineo: '~2–4 minutos no modo Fast' },
] as const

export default function GeradorVideoFacelessPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/pt" style={{ color: ACCENT, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>
          <Link href="/pt" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.8rem' }}>Kineo em português</Link>
        </div>

        {/* Hero */}
        <section style={{ marginTop: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 14px' }}>
            100% sem aparecer
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5.5vw, 2.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.14, margin: '16px 0 0', background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Gerador de vídeo faceless: crie Shorts com IA sem aparecer
          </h1>
          <p style={{ fontSize: '1.02rem', color: MUTED, lineHeight: 1.65, margin: '16px auto 0', maxWidth: 640 }}>
            Você digita a ideia; o Kineo escreve o roteiro, narra com voz de IA em português, monta as imagens e
            adiciona as legendas. Sai um MP4 vertical 9:16 pronto para YouTube Shorts, TikTok e Reels — sem câmera,
            sem microfone, sem timeline de edição.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', marginTop: 22, background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}>
            Criar meu vídeo faceless grátis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '10px 0 0' }}>
            Até <b style={{ color: ACCENT }}>3 vídeos grátis</b> a cada 24h (com marca d&rsquo;água) · sem cartão
          </p>
        </section>

        {/* Como funciona */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 18px' }}>Como funciona</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Digite a ideia', d: 'Um tema ou o seu próprio roteiro — dá até para marcar "usar meu roteiro como está" e a IA narra palavra por palavra.' },
              { n: '2', t: 'A IA produz o vídeo', d: 'Roteiro com gancho, narração com voz de IA, imagens sincronizadas cena a cena e legendas queimadas.' },
              { n: '3', t: 'Baixe e poste', d: 'MP4 vertical 9:16 em cerca de 2–4 minutos no modo Fast. O vídeo é seu, com direito total de monetização.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 20, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#f5f5f7' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Motores */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 6px' }}>Os 3 motores de geração</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 0 18px' }}>
            Você escolhe por vídeo — o mesmo canal pode misturar os três.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {ENGINES.map((e) => (
              <div key={e.name} style={{ ...CARD, borderRadius: 20, padding: '20px 18px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>{e.tag}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f5f5f7' }}>{e.name}</div>
                <div style={{ color: ACCENT, fontWeight: 700, fontSize: '0.9rem', margin: '2px 0 8px' }}>{e.creditos}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Grátis + preços */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 18px' }}>Grátis para começar, barato para escalar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ ...CARD, borderRadius: 20, padding: '22px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#f5f5f7' }}>Grátis</div>
              <div style={{ color: ACCENT, fontWeight: 700, margin: '4px 0' }}>Até 3 vídeos a cada 24h</div>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0, lineHeight: 1.55 }}>
                Crie, assista, baixe e compartilhe vídeos no modo Fast com marca d&rsquo;água do Kineo. Sem cartão de crédito.
              </p>
            </div>
            <div style={{ ...CARD, borderRadius: 20, padding: '22px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#f5f5f7' }}>US$4,90</div>
              <div style={{ color: ACCENT, fontWeight: 700, margin: '4px 0' }}>Starter · primeiro mês</div>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0, lineHeight: 1.55 }}>
                Depois US$9,90/mês, com 25 créditos renovados por ciclo e exportação sem marca d&rsquo;água. No Brasil, a
                cobrança é em Real: R$24,90 no primeiro mês e depois R$49,90/mês. Cancele quando quiser.
              </p>
            </div>
          </div>
          <p style={{ textAlign: 'center', margin: '16px 0 0' }}>
            <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '12px 26px', borderRadius: 980, textDecoration: 'none', fontSize: '0.95rem' }}>
              Testar grátis agora →
            </a>
          </p>
        </section>

        {/* vs CapCut */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 6px' }}>Kineo x editar na mão no CapCut</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 0 18px', lineHeight: 1.6 }}>
            Sendo honesto: o CapCut é um ótimo editor — e grátis. A diferença é o que você paga em tempo.
          </p>
          <div style={{ ...CARD, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1.3fr', gap: 0, padding: '12px 16px', borderBottom: '1px solid #2a2a2d', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>
              <span>Etapa</span>
              <span>Manual (CapCut)</span>
              <span style={{ color: ACCENT }}>Kineo</span>
            </div>
            {CAPCUT_ROWS.map((r, i) => (
              <div key={r.etapa} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1.3fr', gap: 0, padding: '12px 16px', borderBottom: i < CAPCUT_ROWS.length - 1 ? '1px solid #232326' : 'none', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#f5f5f7', paddingRight: 10 }}>{r.etapa}</span>
                <span style={{ color: MUTED, paddingRight: 10 }}>{r.manual}</span>
                <span style={{ color: '#d2d2d7' }}>{r.kineo}</span>
              </div>
            ))}
          </div>
          <p style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.93rem', margin: '14px 0 0' }}>
            Se você gosta de editar e tem tempo sobrando, o fluxo manual funciona — muita gente construiu canal assim.
            Mas se o objetivo é <b>postar todo dia sem virar editor</b>, horas por vídeo não escalam; minutos escalam.
            Você ainda pode baixar o MP4 do Kineo e dar retoques finais no CapCut, se quiser.
          </p>
        </section>

        {/* Cross-link canal dark */}
        <section style={{ marginTop: 44, ...CARD, borderRadius: 20, padding: '20px 22px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 8px' }}>Vai usar isso para montar um canal dark?</h2>
          <p style={{ margin: 0, color: MUTED, lineHeight: 1.65, fontSize: '0.93rem' }}>
            Preparamos um guia honesto com os números que ninguém mostra: quanto os Shorts pagam no Brasil, os requisitos
            de monetização do YouTube e os 6 nichos que mais crescem. Leia{' '}
            <Link href="/pt/canal-dark" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
              como criar um canal dark (e quanto ele paga de verdade)
            </Link>
            .
          </p>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 20, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Crie seu primeiro vídeo sem aparecer — grátis</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>
            Uma ideia entra, um vídeo pronto sai: narração, imagens e legendas no automático. Sem cartão.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
            Criar meu vídeo faceless grátis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '14px 0 0' }}>
            <Link href="/pt" style={{ color: ACCENT, textDecoration: 'none' }}>Kineo em português</Link>
            {' · '}
            <Link href="/pt/canal-dark" style={{ color: ACCENT, textDecoration: 'none' }}>Guia: como criar um canal dark</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
