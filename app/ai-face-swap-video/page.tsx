// KINEO-PAGINAS-CITAVEIS-1011 [fundador 10/11: "retorno de pessoas que pagam, mas não queria investir dinheiro"] — a porta pública do
// Recreate para quem pergunta ao ChatGPT "AI that puts my face in a video", "face swap video AI", "put myself in a video".
// /recreate (o produto) exige login e é noindex; esta página é indexável e manda para o cadastro com volta ao /recreate e a campanha
// seo_product_recreate (signup_utm_campaign), para medir pagante por página. Todo número sai de lib/seo/paginasCitaveis1011.ts.
// Sem nome do fornecedor da troca. Sem "free" (o dado de 10/11: página de "grátis" trouxe 510 cadastros e 0 pagantes).
// /api/recreate/assets segue só para quem está logado. KINEO-VITRINE-PAGINAS-1011: os vídeos-base dos formatos APROVADOS aparecem pela
// prévia pública que a home e o /made-with-kineo já servem (public/previews/galeria) — nenhuma rota nova, nenhum formato em teste.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { BlocoCitavel1011 } from '@/components/seo/BlocoCitavel1011'
import { BASE, CAMPANHA_RECREATE, FACE_SWAP_PATH, recreateBloco, recreateFormatosCitaveis, recreateSignupHref } from '@/lib/seo/paginasCitaveis1011'
import { ShowcaseStrip } from '@/app/claude-connector/ShowcaseGrid' // KINEO-VITRINE-PAGINAS-1011
import { vitrineDaPagina } from '@/lib/seo/vitrinePaginas1011' // KINEO-VITRINE-PAGINAS-1011

const vitrine = vitrineDaPagina('/ai-face-swap-video') // KINEO-VITRINE-PAGINAS-1011

export const dynamic = 'force-static'

const formatos = recreateFormatosCitaveis()
const aberto = formatos.length > 0
const title = 'Put your face in a video with AI: face swap video | Kineo'
const description = recreateBloco().answer

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${BASE}${FACE_SWAP_PATH}` },
  openGraph: { title, description, url: `${BASE}${FACE_SWAP_PATH}`, type: 'website' },
  // Sem formato aberto ao cliente a página só diria "fechado": fora do índice até reabrir.
  ...(aberto ? {} : { robots: { index: false, follow: true } }),
}

export default function FaceSwapVideoPage() {
  const bloco = recreateBloco()
  const href = recreateSignupHref()
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: bloco.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  const howToLd = {
    '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to put your face in a video with Kineo Recreate',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Pick a video', text: `Choose a video from the Kineo catalog: ${formatos.map((f) => f.titulo).join(', ')}.` },
      { '@type': 'HowToStep', position: 2, name: 'Upload your photo', text: 'Upload one clear, front-facing photo for each person and confirm you have permission to use it.' },
      { '@type': 'HowToStep', position: 3, name: 'Get the video', text: 'Kineo returns the same video with only the face replaced. If the face is not swapped, the credits go back automatically.' },
    ],
  }
  const crumbsLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Face swap video', item: `${BASE}${FACE_SWAP_PATH}` },
    ],
  }
  return (
    <div style={{ background: '#050506', minHeight: '100vh', color: '#f5f5f7' }}>
      {/* KINEO-FACE-SWAP-CABECALHO-1111 [dono 11/11: "verificar as que tiverem ruim você conserta de uma vez"] — a página abria sem logo, sem menu
          e sem botão na 1ª dobra (parecia quebrada). Cabeçalho das páginas de conteúdo (marca + Made with Kineo + Pricing) e o botão logo
          abaixo do título: visitante → cadastro → /recreate (o MESMO href da página, recreateSignupHref). */}
      <nav aria-label="Main navigation" style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20, minHeight: 68, fontSize: 14 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.03em', textDecoration: 'none', color: '#f5f5f7', marginRight: 'auto' }}>Kineo</Link>
        <Link href="/made-with-kineo" style={{ color: '#9aa3b2', textDecoration: 'none', fontWeight: 600 }}>Made with Kineo</Link>
        <Link href="/pricing" style={{ color: '#9aa3b2', textDecoration: 'none', fontWeight: 600 }}>Pricing</Link>
      </nav>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 64px', overflowWrap: 'anywhere' }}>
        <p style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9aa3b2', margin: '0 0 10px' }}>Kineo Recreate</p>
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)', lineHeight: 1.15, letterSpacing: '-.02em', margin: '0 0 8px' }}>Put your face in a video with AI</h1>
        {aberto ? <p style={{ margin: '12px 0 24px' }}>{/* KINEO-FACE-SWAP-CABECALHO-1111 — o botão na 1ª dobra */}
          <Link href={href} style={{ display: 'inline-block', background: '#3D7BFF', color: '#fff', fontWeight: 700, padding: '13px 22px', borderRadius: 12, textDecoration: 'none' }}>Put my face in a video →</Link>
        </p> : null}
        <BlocoCitavel1011 bloco={bloco} id="recreate" />
        {/* KINEO-VITRINE-PAGINAS-1011 — os vídeos-base dos formatos aprovados, pela MESMA prévia pública que a home já serve (a rota
            /api/recreate/assets continua só para quem está logado). Só aparece com troca aberta: é o vídeo do catálogo, não um resultado. */}
        {aberto && vitrine ? <ShowcaseStrip titulo={vitrine.titulo} linha={vitrine.linha} clipes={vitrine.clipes.filter((c) => formatos.some((f) => f.id === c.id))} href={href} source={CAMPANHA_RECREATE} tone="dark" /> : null}
        {aberto ? <p style={{ margin: '8px 0 40px' }}>
          <Link href={href} style={{ display: 'inline-block', background: '#3D7BFF', color: '#fff', fontWeight: 700, padding: '13px 22px', borderRadius: 12, textDecoration: 'none' }}>Put my face in a video →</Link>
        </p> : null}
        {bloco.faq.length > 0 ? <section aria-labelledby="recreate-faq">
          <h2 id="recreate-faq" style={{ fontSize: 24, letterSpacing: '-.01em', margin: '0 0 12px' }}>Questions</h2>
          {bloco.faq.map(({ q, a }) => <div key={q} style={{ padding: '14px 0', borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <h3 style={{ fontSize: 17, margin: '0 0 6px' }}>{q}</h3>
            <p style={{ margin: 0, lineHeight: 1.6, color: '#c3c8d1' }}>{a}</p>
          </div>)}
        </section> : null}
        <p style={{ marginTop: 32, color: '#9aa3b2', fontSize: 14 }}>
          Also on Kineo: <Link href="/ai-ugc-ads" style={{ color: '#7FA6FF' }}>AI product ads from your photos</Link> · <Link href="/pricing" style={{ color: '#7FA6FF' }}>Pricing</Link>
        </p>
        {bloco.faq.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} /> : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }} />
      </main>
      <Footer />
    </div>
  )
}
