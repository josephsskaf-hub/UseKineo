// KINEO-GEO-RODADA2-2026-10-08 — a camada citável EXTRA da página do Seedance 1.5 (sessão CEO 08/10, item 1 da rodada 2 de GEO):
//   · "Is Seedance 1.5 free?" — quem ganha o quê de graça (os mesmos interruptores que concedem) e o CTA para o filme grátis
//     de 15 s, que abre o Studio com o Seedance pré-selecionado (?engine=seedance&duration=15, parâmetros que o Studio já lê);
//   · "Seedance 1.5 vs Seedance 2.5" — a tabela com os preços das DUAS camadas citáveis (ENGINE_GEO) e o link para o 2.5;
//   · "Films made on Seedance 1.5 in Kineo" — filmes REAIS da vitrine do fundador renderizados no Seedance 1.5, cada um com o
//     atalho "começar da mesma ideia" (a ideia real do filme vai pré-preenchida no Studio; nada renderiza sozinho).
// Componente de SERVIDOR (sem 'use client', sem hook): o texto sai no HTML estático — é o que o OAI-SearchBot e o Bing leem.
// Mora DENTRO do cartão de preço (components/EngineCitationAnswer.tsx EnginePriceCard), só no slug do Seedance: a página do
// motor é travada byte a byte por guardiões, que descontam o cartão inteiro (camada citável provada à parte). O conteúdo
// desta camada é provado, com mutantes, por scripts/test-geo-rodada2-2026-10-08.mjs.
// Sem <video> (a página dos motores pagos tem exatamente duas prévias — scripts/test-paid-engine-proof) e sem tempo de render
// (a ficha técnica da página já diz o tempo; um segundo número a contradiria). Capa = <img> leve, com carregamento tardio.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import type { EngineCitation } from '@/lib/seo/engineCitation'
import { seedanceGalleryFilms } from '@/lib/seo/houseFilmIdeas'
import { SEEDANCE_CAMPAIGN, seedanceFreeAnswer, seedanceFreeFacts, seedanceStudioSignupHref, seedanceVs25 } from '@/lib/seo/seedanceAnswer'
// KINEO-GEO-RODADA3-2026-10-08 — "Make one like this" embaixo de cada filme da casa (rodada 3, item 4): abre o Studio com a ideia
// real do filme, no motor que o renderizou, sem disparar render; mede pelo placement e pelo utm_content house_film_remix.
import { HOUSE_FILM_REMIX_LABEL, HOUSE_FILM_REMIX_PLACEMENT, houseFilmRemixHref } from '@/lib/seo/geoRodada3'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d' }
const MUTED = '#86868b'
const H2: CSSProperties = { fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 6px' }

export default function SeedanceAnswerSections({ geo, s25, exclude = [] }: { geo: EngineCitation; s25: EngineCitation | null; exclude?: readonly string[] }) {
  const facts = seedanceFreeFacts(geo.rows.clip)
  const free = seedanceFreeAnswer(geo, facts)
  const vs = seedanceVs25(geo, s25, facts)
  const films = seedanceGalleryFilms().filter((f) => !exclude.includes(f.id))
  const th: CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 700, color: MUTED }
  const td: CSSProperties = { padding: '11px 12px', verticalAlign: 'top', lineHeight: 1.45, color: '#d2d2d7' }
  return (
    <div data-kineo="seedance-answers" style={{ marginTop: 44 }}>
      <div data-kineo="seedance-free" style={{ ...CARD, borderRadius: 16, padding: '22px 20px' }}>
        <h2 style={H2}>{free.heading}</h2>
        <p style={{ textAlign: 'center', color: '#f5f5f7', fontSize: '1rem', lineHeight: 1.6, margin: '0 auto 14px', maxWidth: 640 }}>{free.lead}</p>
        <ul style={{ margin: '0 auto', maxWidth: 640, paddingLeft: 18, color: '#d2d2d7', fontSize: '0.92rem', lineHeight: 1.65 }}>
          {free.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <OrganicCtaLink
            href={free.ctaHref}
            source={SEEDANCE_CAMPAIGN}
            placement="free_answer"
            style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '13px 26px', borderRadius: 980, textDecoration: 'none', fontSize: '1rem' }}
          >
            {free.ctaLabel}
          </OrganicCtaLink>
          <p style={{ color: MUTED, fontSize: '0.8rem', margin: '10px 0 0' }}>{free.ctaNote}</p>
        </div>
      </div>

      {vs ? (
        <div data-kineo="seedance-vs-25" style={{ marginTop: 40 }}>
          <h2 style={H2}>{vs.heading}</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 auto 16px', maxWidth: 660, lineHeight: 1.6 }}>{vs.intro}</p>
          <div style={{ ...CARD, borderRadius: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={th}>On Kineo</th>
                  <th style={th}>Seedance 1.5</th>
                  <th style={th}>Seedance 2.5</th>
                </tr>
              </thead>
              <tbody>
                {vs.rows.map((r) => (
                  <tr key={r.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ ...td, fontWeight: 800, color: '#f5f5f7', minWidth: 170 }}>{r.label}</td>
                    <td style={td}>{r.v15}</td>
                    <td style={td}>{r.v25}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: '#d2d2d7', fontSize: '0.92rem', lineHeight: 1.6, margin: '14px 0 0' }}>
            {vs.verdict}{' '}
            <Link href={vs.link.href} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{vs.link.label}</Link>
          </p>
          <p style={{ color: '#6e6e73', fontSize: '0.78rem', margin: '8px 0 0', lineHeight: 1.55 }}>{vs.footnote}</p>
        </div>
      ) : null}

      {films.length > 0 ? (
        <div data-kineo="seedance-films" style={{ marginTop: 40 }}>
          <h2 style={H2}>Films made on Seedance 1.5 in Kineo — start from the same idea</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 auto 18px', maxWidth: 640, lineHeight: 1.6 }}>
            Kineo-owned films rendered on Seedance 1.5, the engine your free film uses. Each link opens the Studio with that
            film’s real idea filled in and Seedance 1.5 selected. Customer videos stay private.
          </p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {films.map((f) => (
              <div key={f.id} style={{ ...CARD, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capa estática leve (webp da vitrine), sem otimizador */}
                <img src={f.posterPath} alt={`${f.title} — a film rendered on Seedance 1.5 in Kineo`} loading="lazy" decoding="async" width={240} height={427} style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '9 / 16', objectFit: 'cover', background: '#000' }} />
                <p style={{ margin: 0, padding: '9px 10px 4px', fontSize: '11.5px', fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>{f.title}</p>
                <OrganicCtaLink
                  href={seedanceStudioSignupHref({ prompt: f.idea })}
                  source={SEEDANCE_CAMPAIGN}
                  placement="film_idea"
                  style={{ margin: 'auto 10px 10px', color: '#2997ff', fontWeight: 800, fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Start from this idea →
                </OrganicCtaLink>
                <OrganicCtaLink
                  href={houseFilmRemixHref(f, SEEDANCE_CAMPAIGN)}
                  source={SEEDANCE_CAMPAIGN}
                  placement={HOUSE_FILM_REMIX_PLACEMENT}
                  style={{ margin: '0 10px 10px', display: 'block', textAlign: 'center', background: '#f5f5f7', color: '#000', fontWeight: 900, fontSize: '0.8rem', padding: '8px 10px', borderRadius: 980, textDecoration: 'none' }}
                >
                  {HOUSE_FILM_REMIX_LABEL}
                </OrganicCtaLink>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
