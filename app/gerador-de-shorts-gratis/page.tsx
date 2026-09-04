// AQUISICAO 5 (14/08) — [KINEO-PORTAS-INTL-2026-08-14]
// A porta que converte 41% em ingles, agora em PT-BR: "gerador de shorts
// gratis" e busca real no Brasil e o produto JA gera video em portugues
// (language=pt atravessa signup → /generate). Mesmo TopicGeneratorForm, mesma
// prova viva, mesmo exit-intent — so o idioma e o alvo de busca mudam.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from '@/app/examples/ExampleLiveMedia'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import Footer from '@/components/Footer'
import LocalizedScriptHandoff from '@/components/LocalizedScriptHandoff'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_USD_AMOUNT } from '@/lib/marketingPrice'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'seo_gerador_pt'
const FORM_ID = 'gerador'
const SCRIPT_HANDOFF_ID = 'roteiro-chatgpt'

export const metadata: Metadata = {
  title: 'Gerador de Shorts com IA Grátis (sem aparecer) — Kineo',
  description:
    'Digite uma ideia e a IA gera um Short vertical completo: roteiro, narração em português, legendas e vídeo pronto para postar. Grátis, sem cartão.',
  alternates: {
    canonical: `${BASE}/gerador-de-shorts-gratis`,
    languages: {
      en: `${BASE}/free-ai-shorts-generator`,
      'pt-BR': `${BASE}/gerador-de-shorts-gratis`,
      es: `${BASE}/generador-de-shorts-gratis`,
    },
  },
  openGraph: {
    title: 'Gerador de Shorts com IA Grátis — Kineo',
    description: 'Uma ideia vira um Short pronto: roteiro, voz em português, legendas e MP4. Sem cartão.',
    url: `${BASE}/gerador-de-shorts-gratis`,
    type: 'website',
    images: [{ url: '/videos/example-turkmenistan.jpg', width: 360, height: 640 }],
  },
}

const FAQ = [
  {
    q: 'O vídeo sai em português?',
    a: 'Sim. Roteiro, narração com voz neural e legendas saem em português do Brasil — é só escolher o idioma, que já vai selecionado a partir desta página.',
  },
  {
    q: 'É grátis mesmo? Precisa de cartão?',
    a: 'Você cria, assiste, baixa e posta vídeos Fast com marca d’água sem cartão nenhum. Planos pagos liberam o MP4 limpo, a partir de US$ ' + STARTER_USD_AMOUNT + ' por mês, o mesmo preço no mundo todo.',
  },
  {
    q: 'Preciso aparecer ou saber editar?',
    a: 'Não. É o formato faceless: a IA escreve, narra, escolhe as cenas e adiciona as legendas. Você digita o tema e baixa o vídeo pronto, normalmente em 3 a 7 minutos.',
  },
]

export default function GeradorDeShortsPage() {
  const p: CSSProperties = { color: '#86868b', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 12px' }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <main lang="pt-BR" style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          Gerador de Shorts com IA
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
          Crie um Short sem aparecer — grátis
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#86868b', lineHeight: 1.6, margin: '16px 0 0' }}>
          Digite uma ideia e o Kineo gera o Short vertical completo: roteiro, narração em português, cenas e legendas — pronto para postar no YouTube Shorts, TikTok ou Reels. Sem cartão.
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          formId={FORM_ID}
          language="pt"
          examples={[
            'A ilha que ninguém pode visitar',
            'O hábito que deixa as pessoas pobres sem perceber',
            'Por que a IA está mudando o trabalho de todo mundo',
          ]}
          copy={{
            label: 'Sobre o que vai ser o seu Short grátis?',
            placeholder: 'Ex.: a ilha proibida que aparece no mapa',
            submit: 'Criar meu Short grátis',
            examplesLabel: 'Ideias prontas',
            note: 'Sua ideia atravessa o cadastro — o primeiro vídeo Fast começa sem cartão.',
          }}
        />

        <LocalizedScriptHandoff
          campaign="seo_chatgpt_to_shorts_pt"
          formId={SCRIPT_HANDOFF_ID}
          language="pt"
          eyebrow="Ou, se você já tem o roteiro"
          heading="Já tem um roteiro? Cole aqui."
          description="Seu roteiro segue pelo cadastro e chega ao Kineo com alvo de 35 segundos. O Kineo usa Seedance se o saldo do teste ativo cobrir; senão, usa Fast. Você não precisa colar de novo."
          label="Cole o roteiro que você já tem"
          placeholder="Cole até 1.000 caracteres. Pode manter rótulos como Voiceover:, Narração:, Visual:, Câmera:, cenas e marcações de tempo."
          submit="Transformar este roteiro em Short →"
          note="Com pelo menos dois rótulos de fala, como Voiceover:, Narração: ou Fala:, o Kineo lê somente esses blocos; direções de produção reconhecidas ficam fora da voz. A pontuação pode mudar para ajustar o ritmo, mas a sequência das palavras não."
        />

        {/* Prova viva: 3 exports reais tocando (mesmo motor da home). */}
        <section style={{ marginTop: 34 }}>
          <p style={{ margin: '0 0 4px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Feito de verdade com o Kineo
          </p>
          <p style={{ ...p, marginBottom: 14 }}>Cada um destes começou com uma linha de texto.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PUBLIC_EXAMPLES.slice(0, 3).map((ex) => (
              <a key={ex.slug} href={`/examples/${ex.slug}`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid #2a2a2d', display: 'block' }}>
                <ExampleLiveMedia videoPath={ex.videoPath} posterPath={posterWebpPath(ex.posterPath)} />
                <span style={{ position: 'absolute', left: 10, bottom: 10, right: 10, zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.7)' }}>{ex.shortTitle}</span>
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', fontWeight: 800, margin: '0 0 14px', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
            Perguntas frequentes
          </h2>
          {FAQ.map((item) => (
            <div key={item.q} style={{ background: '#131316', border: '1px solid #2a2a2d', borderRadius: 18, padding: '16px 18px', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px' }}>{item.q}</h3>
              <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{item.a}</p>
            </div>
          ))}
        </section>
      </div>
      <ExitIntentOffer variant="free" />
      <Footer />
    </main>
  )
}
