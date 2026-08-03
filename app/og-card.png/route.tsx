import { ImageResponse } from 'next/og'

// KINEO-OG-CARD-V2-2026-08-03 — ROTA NOVA (/og-card.png). A rota antiga
// (/og-image.png) ficou presa em TRÊS caches empilhados (CDN Vercel 24h +
// scraper do X + WhatsApp), e o ?v=2 não furou todos. URL nunca vista =
// cache zero em todas as camadas. A rota antiga fica no ar para posts já
// publicados.
// KINEO-OG-FIX-2026-07-13 — layout.tsx aponta og:image + twitter:image pra
// https://www.usekineo.com/og-image.png, mas o arquivo nunca existiu em /public
// → TODO share da home (WhatsApp, X, Slack, Product Hunt) saía SEM card.
// Esta rota serve um PNG 1200x630 brandado exatamente nessa URL, então todas
// as referências existentes passam a funcionar sem tocar em metadata.
// (public/ não entra no PUSH_KINEO.bat — por isso rota em app/, não estático.)
export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      // KINEO-OG-SAFEZONE-2026-08-03 — o layout anterior usava space-between
      // com padding de 64px: a linha de rodapé ("usekineo.com · 3 watermarked
      // Fast videos / 24h · paid = clean MP4") ficava COLADA na borda inferior.
      // O X (e WhatsApp/Slack) cortam as bordas do card, arredondam cantos e
      // sobrepõem "From usekineo.com" na base — o fundador postou no X em
      // 03/08 e o card saiu com o texto decapitado ("torta", palavras dele).
      // Regra nova: NADA de texto a menos de ~90px de qualquer borda; conteúdo
      // centralizado verticalmente; o domínio saiu da arte (o X já o exibe
      // sozinho abaixo do card — era redundante e era exatamente o que o corte
      // comia).
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #000 55%, #06121f 100%)',
          padding: '90px 100px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 44 }}>
          <div
            style={{
              display: 'flex',
              width: 58,
              height: 58,
              borderRadius: 14,
              background: '#2563eb',
              color: '#fff',
              fontSize: 36,
              fontWeight: 800,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            K
          </div>
          <div style={{ display: 'flex', color: '#2997ff', fontSize: 46, fontWeight: 800 }}>
            Kineo
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#F1F5F9',
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          Type an idea. Get a finished Short.
        </div>
        <div style={{ display: 'flex', color: '#94a3b8', fontSize: 32, fontWeight: 600, marginTop: 22 }}>
          AI script · voiceover · captions · footage — in minutes. Free to try, no card.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  )
}
