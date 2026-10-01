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

// KINEO-OG-CLARO-2026-10-01 — fundador: "aparece o tema preto, muda pro branco quando manda o link". O cartão da prévia (WhatsApp,
// X, Slack) passa a usar a paleta CLARA da home (.klp: #F7F7F5, texto #0E1116, azul #0A5CFF) e o raio azul atual (public/favicon.svg)
// no lugar do "K" antigo. O layout aponta para /og-card.png?v=claro-1001: URL nunca vista = sem a prévia preta guardada em cache.
const BOLT = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64"><path fill="#0A5CFF" transform="translate(5.676671 -5.410644) scale(0.039116)" d="M513.672,502.93L370.117,905.274L275.391,905.274L378.418,616.211L14.16,616.211L14.16,592.285L159.18,189.453L253.906,189.453L149.414,479.004L513.672,479.004Z"/></svg>')

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
          background: 'radial-gradient(ellipse 900px 520px at 0% 0%, #E6EEFF, rgba(230,238,255,0) 72%), #F7F7F5',
          padding: '90px 100px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 44 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BOLT} width={64} height={64} alt="" />
          <div style={{ display: 'flex', color: '#0E1116', fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>
            Kineo
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#0E1116',
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          Type an idea. Get a finished Short.
        </div>
        <div style={{ display: 'flex', color: '#5A5F67', fontSize: 32, fontWeight: 600, marginTop: 22 }}>
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
