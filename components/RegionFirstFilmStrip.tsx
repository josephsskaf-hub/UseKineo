'use client'

// KINEO-PAIS-SEM-GRATIS-2026-10-13 — a OFERTA CLARA NA HORA para quem nasceu 'region_paid_only' e está SEM o filme grátis
// (fundador 13/10, ação D: "tudo sim").
//
// O DEFEITO MEDIDO (Supabase, só SELECT, 30 dias): 108 contas 'region_paid_only' nunca fizeram filme; 80 delas nasceram antes
// do filme grátis de região (08/10) e a faixa do topo só dizia "Keep creating · See plans" (assinaturas no /pricing). O preço
// do passe avulso — a oferta paga mais barata que existe, US$ 4,99 por 1 filme Seedance 1.5 de 60 s, pagamento único — só
// aparecia na parede (5 pessoas) e no /pricing (12). 30 bateram na parede, 12 abriram checkout de PLANO, 0 pagaram.
//
// ESTA FAIXA ocupa o lugar da faixa de sempre (o /studio incluído; no /clips com o clipe grátis, o aviso do clipe continua):
// "Esta conta não inclui um filme grátis — seu primeiro filme por <preço na moeda da cobrança>", um exemplo real feito no
// mesmo motor, e o botão direto ao checkout do passe. Quem decide é o SERVIDOR (app/api/region-pass?surface=first_film:
// régua, preço e contagem de vídeos; grava region_paid_offer_shown e, no clique, region_paid_offer_clicked e a campanha
// region_paid_first_film até o payment_success). Nenhum preço digitado aqui. Servidor disse não (ou erro) → `null`, e a
// faixa de sempre volta (RegionPaidOnlyBanner).
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { WALL_V1_PACK_BALANCE_KEY } from '@/lib/growth/wallV1'
import { REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'
import { FREE_CLIP_NOTICE_HREF } from '@/lib/clips/freeClipNotice'
import { ENGINE_PAGE_LEAD } from '@/lib/publicExamples'
import { REGION_PASS_COPY, REGION_PASS_VERSION, type RegionPassOffer } from '@/lib/regionPass'

export const REGION_FIRST_FILM_STRIP_VERSION = 'region_first_film_strip_v1' as const

/** O exemplo real: o filme da casa que o fundador pôs na frente da página do Seedance (o MESMO motor do passe). */
const EXAMPLE = ENGINE_PAGE_LEAD.find((f) => f.engine === 'cinematic_ai') ?? null

function isOffer(d: unknown): d is RegionPassOffer {
  const o = d as Partial<RegionPassOffer> | null
  return Boolean(o && o.eligible === true && o.surface === 'first_film' && typeof o.href === 'string' && o.price && typeof o.price.label === 'string' && typeof o.price.currency === 'string')
}

/**
 * Pergunta ao servidor UMA vez por montagem (enquanto `enabled`). undefined = esperando; null = fora da régua ou erro;
 * a oferta = a faixa entra. Desligado → null na hora, sem pergunta (nenhum evento).
 */
export function useRegionFirstFilmOffer(enabled: boolean): RegionPassOffer | null | undefined {
  const [offer, setOffer] = useState<RegionPassOffer | null | undefined>(enabled ? undefined : null)
  useEffect(() => {
    if (!enabled) { setOffer(null); return }
    let alive = true
    setOffer(undefined)
    fetch('/api/region-pass?surface=first_film', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => { if (alive) setOffer(isOffer(d) ? d : null) })
      .catch(() => { if (alive) setOffer(null) })
    return () => { alive = false }
  }, [enabled])
  return offer
}

const PRIMARY = { background: '#2997ff', color: '#000', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer' } as const
const SECONDARY = { color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' } as const

export default function RegionFirstFilmStrip({
  offer,
  freeClip = false,
  freeFilmUsed = false,
}: {
  offer: RegionPassOffer
  /** A conta ainda tem o clipe grátis de 5 s: vira um botão secundário (o presente nunca some da tela). */
  freeClip?: boolean
  /** O filme grátis de região acabou de ser usado NESTA aba (o servidor ainda pode contar 0 vídeos: o render está andando). */
  freeFilmUsed?: boolean
}) {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(REGION_PASS_COPY, language)
  const checkout = useCheckoutLaunch('region_paid_first_film')
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const price = offer.price.label
  const first = offer.firstFilm === true && !freeFilmUsed
  const lead = freeFilmUsed ? copy.freeFilmUsed : first ? copy.noFreeFilm : ''
  const pending = checkout.pending !== null

  return (
    <div
      data-region-first-film={REGION_FIRST_FILM_STRIP_VERSION}
      data-region-pass={REGION_PASS_VERSION}
      data-currency={offer.price.currency}
      role="region"
      aria-label={first ? copy.firstTitle(price) : copy.title(price)}
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))',
        border: '1px solid rgba(41,151,255,.4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {EXAMPLE ? (
        <button
          type="button"
          aria-label={`${copy.exampleLabel}: ${EXAMPLE.title}`}
          title={`${copy.exampleLabel}: ${EXAMPLE.title}`}
          onClick={() => {
            const v = videoRef.current
            if (!v) return
            if (v.paused) { void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) } else { v.pause(); setPlaying(false) }
          }}
          style={{ position: 'relative', flex: '0 0 auto', width: 62, height: 110, padding: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#000', cursor: 'pointer' }}
        >
          {/* preload="none": o pôster basta até o clique (conexões lentas são a maioria desta coorte). */}
          <video
            ref={videoRef}
            src={EXAMPLE.previewPath}
            poster={EXAMPLE.posterPath}
            muted
            loop
            playsInline
            preload="none"
            onEnded={() => setPlaying(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {!playing ? (
            <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>▶</span>
          ) : null}
        </button>
      ) : null}
      <div style={{ minWidth: 200, flex: '1 1 300px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.04em', color: '#2997ff' }}>{copy.kicker}</div>
        <div style={{ marginTop: 2, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{first ? copy.firstTitle(price) : copy.title(price)}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>
          {lead ? `${lead} ` : ''}{copy.body(offer.price.seconds, offer.price.credits)}
          {offer.price.currency !== 'usd' ? ` ${copy.chargedIn(offer.price.currency.toUpperCase())}` : ''}
        </div>
        {EXAMPLE ? <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted, var(--text2))' }}>{copy.exampleLabel}</div> : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          data-testid="region-first-film-buy"
          disabled={pending}
          style={{ ...PRIMARY, opacity: pending ? 0.6 : 1 }}
          onClick={() => {
            try {
              if (typeof offer.balance === 'number') sessionStorage.setItem(WALL_V1_PACK_BALANCE_KEY, String(offer.balance))
            } catch { /* storage bloqueado: a volta mede sem régua */ }
            checkout.launch('region_paid_first_film', offer.href, {
              surface: offer.surface,
              currency: offer.price.currency,
              amount_minor: offer.price.amountMinor,
              first_film: first,
              version: REGION_FIRST_FILM_STRIP_VERSION,
            })
          }}
        >
          {pending ? '…' : first ? copy.firstCta(price) : copy.cta(price)}
        </button>
        {freeClip ? (
          <Link href={FREE_CLIP_NOTICE_HREF} data-testid="region-first-film-free-clip" style={SECONDARY}>
            {copy.freeClip}
          </Link>
        ) : null}
        <Link href={REGION_PAID_ONLY_PLANS_HREF} data-testid="region-paid-only-plans" style={SECONDARY}>
          {copy.plans}
        </Link>
      </div>
      {checkout.error ? <p role="alert" style={{ flexBasis: '100%', margin: 0, fontSize: 12, color: 'var(--danger, #d43b3b)' }}>{checkout.error}</p> : null}
    </div>
  )
}
