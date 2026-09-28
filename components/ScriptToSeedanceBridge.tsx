'use client'

// KINEO-PONTE-ACIMA-DA-DOBRA-2026-09-23 — a ponte "tenho um roteiro do ChatGPT → Seedance".
//
// POR QUÊ (medido 23/09, 60 dias): o ChatGPT manda ~200 sessões/semana e 87% pousam em 4 páginas de motor
// GRÁTIS que converteram ZERO pagantes — /ai-video-generator/kineo-1 (228 sessões → 103 contas → 0),
// /free-ai-shorts-generator (132 → 70 → 0), /text-to-video-shorts (130 → 54 → 0) e
// /state-of-ai-shorts-2026 (238 → 26 → 0). No mesmo período /ai-video-generator/seedance converteu 8,6% das
// contas (68 → 35 → 3). A ponte de 22/09 (7242894d) vivia ABAIXO da dobra e só no kineo-1, e o `?from=` num
// <Link> do Next não gerava evento nenhum (0 de 73 pousos rastreáveis).
//
// O QUE MUDA: um bloco só, reaproveitado nas 4 páginas, logo abaixo do H1/lead e antes do formulário.
// Fundador 23/09: "vai" nas 3 jogadas; jogada 3 = bloco acima da dobra nas 4 páginas citadas, sem trocar
// título/H1 (para não perder a citação). Impressão (`engine_bridge_shown`, uma vez por montagem) e primeiro
// gesto (`engine_bridge_clicked`) nascem no mesmo commit — a ponte que não se mede não existe.
//
// NENHUM NÚMERO DIGITADO: o preço vem de TIER_PRICES via formatCheckoutMoney, os filmes de TIER_CREDITS ÷
// creditCostForDuration('cinematic_ai', pago, 35 s). lib/credits/engineCost não importa nada, e
// lib/checkoutPricing já é importado no cliente (components/TopupUnavailableNote).
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'

export const SCRIPT_BRIDGE_VERSION = 'bridge_v1'
const BRIDGE_FILM_SECONDS = 35

/** Filmes de 35 s do Seedance que o Starter compra por mês. Piso 1: nunca "0 films" nem "Infinity". */
export function starterSeedanceFilms(): number {
  const cost = creditCostForDuration('cinematic_ai', true, BRIDGE_FILM_SECONDS)
  if (!Number.isFinite(cost) || cost < 1) return 1
  return Math.max(1, Math.floor(TIER_CREDITS.starter / cost))
}

/** Destino da ponte: a página do Seedance, com a origem em `?from=` para cruzar com o pouso. */
export function scriptBridgeHref(from: string): string {
  return `/ai-video-generator/seedance?from=${encodeURIComponent(from)}_bridge`
}

type BridgeProof = { id: string; title: string; src: string; poster: string }

export default function ScriptToSeedanceBridge({ from, compact = false, proof }: { from: string; compact?: boolean; proof?: BridgeProof }) {
  const starter = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
  const films = starterSeedanceFilms()
  const href = scriptBridgeHref(from)
  const version = proof ? 'bridge_paid_proof_v2' : SCRIPT_BRIDGE_VERSION
  const shortCost = creditCostForDuration('cinematic_ai', true, BRIDGE_FILM_SECONDS)
  const minuteCost = creditCostForDuration('cinematic_ai', true, 60)
  const playedRef = useRef(false)

  // Uma impressão por montagem, fire-and-forget: telemetria nunca derruba a página citada.
  const shownRef = useRef(false)
  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    try {
      void trackEvent('engine_bridge_shown', { from, to: 'seedance', version })
    } catch {
      /* ignore */
    }
  }, [from, version])

  const onClick = () => {
    try {
      void trackEvent('engine_bridge_clicked', { from, to: 'seedance', version })
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      aria-label="Render your script on Seedance 1.5"
      data-bridge={version}
      style={{
        margin: compact ? '22px 0 0' : '28px 0 0',
        padding: compact ? '16px 18px' : '20px 22px',
        borderRadius: 16,
        border: '1px solid rgba(41,151,255,0.4)',
        background: 'linear-gradient(135deg, rgba(41,151,255,0.12), rgba(191,90,242,0.08))',
        textAlign: 'left',
      }}
    >
      {proof ? <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <figure style={{ margin: 0, width: 120, flexShrink: 0 }}>
          <video src={proof.src} poster={proof.poster} controls playsInline preload="none"
            aria-label={`Seedance 1.5 preview: ${proof.title}`}
            style={{ display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 10, background: '#000' }}
            onPlay={() => {
              if (playedRef.current) return
              playedRef.current = true
              try { void trackEvent('example_video_play', { version, example_slug: proof.id, placement: `${from}_bridge` }) } catch { /* telemetry is optional */ }
            }} />
          <figcaption style={{ color: '#a1a1a6', fontSize: 11, lineHeight: 1.4, marginTop: 6 }}>Existing Seedance preview · {proof.title}</figcaption>
        </figure>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <p style={{ margin: '0 0 6px', color: '#2997ff', fontSize: 12, fontWeight: 800 }}>GENERATED SCENES · SEEDANCE 1.5</p>
          <h2 style={{ fontSize: '1.2rem', lineHeight: 1.3, margin: '0 0 8px', color: '#f5f5f7' }}>Make your next story with generated scenes.</h2>
          <p style={{ margin: '0 0 8px', color: '#f5f5f7', lineHeight: 1.6 }}><strong>Starter {starter} USD/month</strong> · {TIER_CREDITS.starter} credits per billing month.</p>
          <p style={{ margin: '0 0 8px', color: '#a1a1a6', fontSize: '.92rem', lineHeight: 1.6 }}>A {BRIDGE_FILM_SECONDS}-second film costs {shortCost} credits; a 60-second film costs {minuteCost}. The plan covers {films} films of {BRIDGE_FILM_SECONDS} s if you spend its whole balance on this engine and duration. Other creations share that balance.</p>
          <p style={{ margin: '0 0 14px', color: '#a1a1a6', fontSize: '.85rem', lineHeight: 1.5 }}>The {TRIAL_CREDITS_SHOWN}-credit trial {TRIAL_CREDITS_SHOWN >= shortCost ? 'covers the 35-second reference; trial films are watermarked' : 'does not cover this Seedance film'}. A paid plan unlocks clean downloads. Review the prepared script and settings before generating.</p>
          <Link href={href} onClick={onClick} style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, padding: '12px 20px', borderRadius: 980, textDecoration: 'none', fontSize: '.95rem' }}>See Seedance films & plans →</Link>
        </div>
      </div> : <>
      <p style={{ margin: '0 0 6px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Have a script from ChatGPT?
      </p>
      <h2 style={{ fontSize: compact ? '1.08rem' : '1.2rem', fontWeight: 900, lineHeight: 1.3, margin: '0 0 8px', color: '#f5f5f7' }}>
        Paste it into Seedance 1.5 — the engine people publish with.
      </h2>
      <p style={{ margin: '0 0 14px', color: '#a1a1a6', fontSize: '0.92rem', lineHeight: 1.6 }}>
        From {starter}/month = {films} films of {BRIDGE_FILM_SECONDS} s. Kineo 1 is the free rehearsal: stock footage, watermark after the trial.
      </p>
      <Link
        href={href}
        onClick={onClick}
        style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, padding: '12px 24px', borderRadius: 980, textDecoration: 'none', fontSize: '0.95rem' }}
      >
        Render my script on Seedance →
      </Link>
      </>}
    </section>
  )
}
