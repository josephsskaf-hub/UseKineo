// KINEO-GEO-RODADA2-2026-10-08 — o bloco "filme real da casa + a ideia que o fez + CTA" das páginas /free-ai-shorts/<nicho>
// (sessão CEO 08/10, item 3 da rodada 2 de GEO: "cada um com um exemplo real, um roteiro/prompt pronto e o CTA; nada de
// página fina ou números inventados").
//   · o filme vem da vitrine do fundador (lib/seo/houseFilmIdeas.ts), com o selo do motor que o renderizou;
//   · a ideia é o texto real que fez o filme, com o rótulo honesto do caso (prompt exato, abertura do prompt, abertura do
//     roteiro ou tradução) — o CTA leva ESSA ideia para o Studio (a página passa o href, montado pelo mesmo
//     buildPromptedSignupHref dos outros links do nicho; nada renderiza sozinho);
//   · o grátis e o motor: a frase curta do filme grátis sai de lib/seo/seedanceAnswer.ts (os mesmos interruptores que
//     concedem); quando o exemplo foi feito num motor pago, o bloco diz isso;
//   · a posição do nicho no "State of AI Shorts" vem da edição vigente (lib/seo/stateOfAiShortsEdition.ts).
// Componente de SERVIDOR (sem hook): o texto sai no HTML estático.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import type { HouseFilm } from '@/lib/seo/houseFilmIdeas'
import { freeFilmShortLine, seedanceFreeFacts } from '@/lib/seo/seedanceAnswer'

const CARD: CSSProperties = { background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }

export default function NicheHouseFilm({ film, nicheLabel, ctaHref, source, stateRank }: {
  film: HouseFilm & { kind: string }
  nicheLabel: string
  ctaHref: string
  source: string
  stateRank: { rank: number; tierTitle: string; editionLabel: string } | null
}) {
  const freeLine = freeFilmShortLine(seedanceFreeFacts(null))
  const paidEngine = film.engine !== 'cinematic_ai'
  return (
    <section data-kineo="niche-house-film" style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 6px' }}>Made in Kineo: {film.kind}</h2>
      <p style={{ textAlign: 'center', color: '#86868b', fontSize: '0.88rem', margin: '0 auto 18px', maxWidth: 620, lineHeight: 1.6 }}>
        A Kineo-owned film, not a mockup — the badge is the engine that rendered it. Customer videos stay private.
      </p>
      <div style={{ ...CARD, borderRadius: 16, padding: 16, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'start' }}>
        <div style={{ position: 'relative', aspectRatio: '9 / 16', overflow: 'hidden', borderRadius: 12, background: '#000', maxWidth: 300, width: '100%', justifySelf: 'center' }}>
          <video src={film.previewPath} poster={film.posterPath} muted playsInline controls preload="none" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', left: 8, top: 8, zIndex: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', padding: '2px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', pointerEvents: 'none', textTransform: 'uppercase' }}>{film.engineName}</span>
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 10px' }}>{film.title}</h3>
          <p style={{ color: '#86868b', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{film.ideaLabel}</p>
          <blockquote style={{ margin: '0 0 16px', padding: '10px 14px', borderLeft: '3px solid #2997ff', background: 'rgba(41,151,255,0.06)', color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.6 }}>
            “{film.idea}”
          </blockquote>
          <OrganicCtaLink
            href={ctaHref}
            source={source}
            placement="house_film"
            style={{ display: 'inline-block', background: '#2997ff', color: '#000', fontWeight: 900, padding: '13px 22px', borderRadius: 12, textDecoration: 'none', fontSize: '0.98rem' }}
          >
            Make a {nicheLabel} Short from this idea →
          </OrganicCtaLink>
          <p style={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: 1.6, margin: '12px 0 0' }}>
            The idea opens in the Studio, where you can change it before you press Generate.{freeLine ? ` ${freeLine}` : ''}
            {paidEngine ? ` This example was rendered on ${film.engineName}, which needs a paid plan.` : ''}{' '}
            <Link href={film.enginePath} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{film.engineName}: price per video →</Link>
          </p>
          {stateRank ? (
            <p style={{ color: '#86868b', fontSize: '0.82rem', lineHeight: 1.6, margin: '10px 0 0' }}>
              This niche ranked #{stateRank.rank} ({stateRank.tierTitle} tier) among Kineo creators in the {stateRank.editionLabel}{' '}
              <Link href="/state-of-ai-shorts-2026" style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>State of AI Shorts</Link>.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
