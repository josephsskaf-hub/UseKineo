// AQUISICAO 5 (14/08) — [KINEO-PORTAS-INTL-2026-08-14]
// A porta que converte 41% em ingles, agora em PT-BR: "gerador de shorts
// gratis" e busca real no Brasil e o produto JA gera video em portugues
// (language=pt atravessa signup → /generate). Mesmo TopicGeneratorForm, mesma
// prova viva, mesmo exit-intent — so o idioma e o alvo de busca mudam.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { PaginaClaraCards, PaginaClaraTopo, PaginaClaraVitrine } from '@/components/seo/PaginaClara' // KINEO-PAGINAS-IA-CLARAS-2110 — o menu do topo, os 4 cards e a vitrine atual da home (no lugar dos 3 exemplos velhos)
import { PAGINA_CLARA_CLASSE, PAGINA_CLARA_FUNDO, VITRINE_LINHA_PT } from '@/lib/seo/paginasIaClaras2110' // KINEO-PAGINAS-IA-CLARAS-2110
import ExitIntentOffer from '@/components/ExitIntentOffer'
import Footer from '@/components/Footer'
import LocalizedScriptHandoff from '@/components/LocalizedScriptHandoff'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_USD_AMOUNT } from '@/lib/marketingPrice'
import { freeShortsAlternates } from '@/lib/seo/freeShortsGeneratorLangs'
// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — compra direta do Creator na primeira dobra (versão em português) e a verdade de hoje
// sobre o grátis: 1 filme de 15 s no Seedance 1.5, com marca d'água, sem cartão (o "vídeo Fast" saiu da entrada em 29/09).
import BuyCreatorCta from '@/components/BuyCreatorCta'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'

const FILME_GRATIS = `1 filme grátis de ${TRIAL_FREE_FILM_SECONDS} s no Seedance 1.5, com marca d’água, sem cartão`

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
    // KINEO-PORTAS-16-LINGUAS-2026-09-20 — hreflang das 16 portas (en/pt/es + 13 em /free-shorts-generator/<lang>).
    languages: freeShortsAlternates(BASE),
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
    a: 'Toda conta nova ganha ' + FILME_GRATIS + ' — você assiste, baixa e posta. Planos pagos liberam o MP4 limpo, a partir de US$ ' + STARTER_USD_AMOUNT + ' por mês como preço de referência em USD. Para clientes no Brasil, a cobrança normalmente é em reais; confira o valor no checkout.',
  },
  {
    q: 'Preciso aparecer ou saber editar?',
    a: 'Não. É o formato faceless: a IA escreve, narra, escolhe as cenas e adiciona as legendas. Você digita o tema e baixa o vídeo pronto, em cerca de 6 minutos.',
  },
]

export default function GeradorDeShortsPage() {
  const p: CSSProperties = { color: '#5A5F67', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 12px' }
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
    <main lang="pt-BR" className={PAGINA_CLARA_CLASSE} style={{ minHeight: '100vh', background: PAGINA_CLARA_FUNDO, color: '#0E1116', fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <PaginaClaraTopo />{/* KINEO-PAGINAS-IA-CLARAS-2110 */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 750, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0A5CFF', border: '1px solid rgba(10,92,255,0.35)', background: '#E8EFFF', borderRadius: 999, padding: '6px 12px' }}>
          Gerador de Shorts com IA
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', fontWeight: 650, lineHeight: 1.1, margin: '18px 0 0', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
          Crie um Short sem aparecer — grátis
        </h1>
        <PaginaClaraCards />{/* KINEO-PAGINAS-IA-CLARAS-2110 — os 4 cards da home logo abaixo do título */}
        <p style={{ fontSize: '1.08rem', color: '#5A5F67', lineHeight: 1.6, margin: '16px 0 0' }}>
          Digite uma ideia e o Kineo gera o Short vertical completo: roteiro, narração em português, cenas e legendas — pronto para postar no YouTube Shorts, TikTok ou Reels. Sem cartão.
        </p>

        <BuyCreatorCta
          page="gerador_pt"
          lang="pt"
          align="left"
          secondary={
            <a href={`#${FORM_ID}`} style={{ display: 'inline-block', border: '1px solid #D2D2CD', color: '#0E1116', fontWeight: 800, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}>
              Criar meu Short grátis ↓
            </a>
          }
        />

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
            note: `Sua ideia atravessa o cadastro e vira o seu ${FILME_GRATIS}.`,
          }}
        />

        <LocalizedScriptHandoff
          campaign="seo_chatgpt_to_shorts_pt"
          formId={SCRIPT_HANDOFF_ID}
          language="pt"
          eyebrow="Ou, se você já tem o roteiro"
          heading="Já tem um roteiro? Cole aqui."
          description={`Seu roteiro segue pelo cadastro e chega ao Kineo com alvo de 35 segundos. Numa conta nova, o grátis é ${FILME_GRATIS}; o filme de 35 s sai com um plano. Você não precisa colar de novo.`}
          label="Cole o roteiro que você já tem"
          placeholder="Cole até 1.000 caracteres. Pode manter rótulos como Voiceover:, Narração:, Visual:, Câmera:, cenas e marcações de tempo."
          submit="Transformar este roteiro em Short →"
          note="Com pelo menos dois rótulos de fala, como Voiceover:, Narração: ou Fala:, o Kineo lê somente esses blocos; direções de produção reconhecidas ficam fora da voz. A pontuação pode mudar para ajustar o ritmo, mas a sequência das palavras não."
        />

        {/* KINEO-PAGINAS-IA-CLARAS-2110 — os 3 exemplos velhos saíram; entra a vitrine atual (a mesma da /claude-connector). */}
        <PaginaClaraVitrine titulo="Feito de verdade com o Kineo" linha={VITRINE_LINHA_PT} align="left" />

        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', fontWeight: 650, margin: '0 0 14px', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
            Perguntas frequentes
          </h2>
          {FAQ.map((item) => (
            <div key={item.q} style={{ background: '#FFFFFF', border: '1px solid #E4E4E0', borderRadius: 18, padding: '16px 18px', marginBottom: 12 }}>
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
