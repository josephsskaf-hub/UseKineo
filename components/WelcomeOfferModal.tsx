'use client'

// ═══ KINEO-WELCOME20-2026-08-25 — O MODAL DE BOAS-VINDAS COM NOME ═══════════
// Ordem do fundador (25/08): "quero um modal pra todo mundo que entrar no
// site, com o nome da pessoa, 20% off no primeiro mês, fechando Creator ou
// Studio — o melhor modal que exista, com as nossas cores e fontes perfeitas."
//
// Desenho, e por quê:
//   · NOME REAL no headline: vem do auth do próprio browser (user_metadata do
//     Google OAuth) — zero rota nova, zero PII viajando. Anônimo ganha a
//     versão sem nome, igualmente válida (o cupom é público).
//   · PREÇOS DERIVADOS de TIER_PRICES × 20% — o modal repete o que o caixa
//     cobra (WELCOME20 auto-provisionado no checkout, padrão CREATOR50).
//     Nunca um dígito de preço à mão: é a causa-raiz de 3 bugs passados.
//   · DOIS CARTÕES (Creator/Studio), Studio destacado — o fundador pediu
//     "fechando um dos 2", então a escolha mora DENTRO do modal: um clique
//     leva direto ao Stripe com o promo aplicado, sem escala em /pricing.
//   · VITRINE DENTRO DO MODAL: o clipe dos robôs (Omni #1, render de hoje) —
//     regra #273: a pessoa vê O QUE está comprando no quadro em que decide.
//   · FREQUÊNCIA: 1× a cada 72h por browser (localStorage com timestamp);
//     assinante pagante NUNCA vê (checa /api/me/plan). Delay de 5s — a pessoa
//     primeiro vê a vitrine, depois recebe o convite; modal no load é assalto.
//   · Sem prazo inventado: nenhum "ends tonight" falso. O gatilho é o
//     desconto, não uma mentira com relógio.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { formatResultCount, videosPerMonth } from '@/lib/marketingPrice'

const SEEN_KEY = 'kineo_welcome20_seen'
const RESHOW_MS = 72 * 60 * 60 * 1000 // 72h

function seenRecently(): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return false
    const ts = Number(raw)
    return Number.isFinite(ts) && Date.now() - ts < RESHOW_MS
  } catch {
    return false
  }
}

export default function WelcomeOfferModal({ delayMs = 5000 }: { delayMs?: number }) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [pending, setPending] = useState<'basic' | 'pro' | null>(null)

  useEffect(() => {
    if (seenRecently()) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        // Assinante pagante nunca vê oferta de 1º mês — já pagou o 1º mês.
        const planRes = await fetch('/api/me/plan', { cache: 'no-store' })
        if (planRes.ok) {
          const j = (await planRes.json()) as { plan?: string; isPro?: boolean }
          if (j.isPro || (j.plan && j.plan !== 'free')) return
        }
      } catch {
        // rede falhou — segue: o pior caso é um pagante ver um cupom que o
        // Stripe simplesmente aplica sobre um plano que ele não vai trocar.
      }
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string }
        const raw = (meta.full_name || meta.name || '').trim()
        if (raw) {
          const first = raw.split(/\s+/)[0]
          if (!cancelled && first) setFirstName(first.charAt(0).toUpperCase() + first.slice(1))
        }
      } catch {
        // sem nome — headline genérico
      }
      if (!cancelled) setOpen(true)
    }, delayMs)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [delayMs])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss() {
    setOpen(false)
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()))
    } catch {
      // pior caso: reaparece na próxima visita
    }
  }

  if (!open) return null

  const off = (minor: number) => Math.round(minor * 0.8)
  const plans: Array<{
    tier: 'basic' | 'pro'
    name: string
    credits: string
    perks: string[]
    highlight: boolean
  }> = [
    {
      tier: 'basic',
      name: 'Creator',
      credits: `${TIER_CREDITS.basic} credits / month`,
      perks: [`${formatResultCount(videosPerMonth('basic', 'cinematic_ai'), 'Seedance film')} or ${formatResultCount(videosPerMonth('basic', 'cinematic_h3'), 'MiniMax H3 film')}`, 'Every engine incl. MiniMax H3', 'Watermark-free exports you own'],
      highlight: false,
    },
    {
      tier: 'pro',
      name: 'Studio',
      credits: `${TIER_CREDITS.pro} credits / month`,
      perks: [`${formatResultCount(videosPerMonth('pro', 'cinematic_omni'), 'film')} on Omni Flash — the #1 model — plus change`, 'Kling 3 film scenes with native voice & lip sync', '2 free HD Enhance upscales / month'],
      highlight: true,
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome offer — 20% off your first month"
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: 'rgba(6,6,10,.82)', backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={dismiss}
    >
      {/* Anel de gradiente: wrapper 1px — o "acabamento de vitrine" da casa. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 1, borderRadius: 18, width: 560, maxWidth: '96vw',
          background: 'linear-gradient(135deg, rgba(41,151,255,.55), rgba(167,139,250,.35) 45%, rgba(41,151,255,.12))',
          boxShadow: '0 0 90px rgba(41,151,255,.14), 0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        <div style={{ background: '#101013', borderRadius: 17, padding: '26px 28px 24px', position: 'relative' }}>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 9,
              background: 'rgba(255,255,255,.05)', border: '1px solid #2a2a2d', color: '#86868b',
              cursor: 'pointer', fontSize: 13, lineHeight: 1,
            }}
          >
            ✕
          </button>

          <p style={{ color: '#2997ff', fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            ⚡ Welcome offer
          </p>

          <h2 style={{ color: '#f5f5f7', fontSize: 26, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {firstName ? `${firstName}, your first month is ` : 'Your first month is '}
            <span className="grad-text">20% off.</span>
          </h2>
          <p style={{ color: '#a1a1a8', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 14px' }}>
            Pick Creator or Studio below — the discount applies itself at checkout. Films like this one, from a text box:
          </p>

          {/* A prova: batalha de robôs, Omni Flash (#1 ranked), render real de hoje. */}
          <video
            src="/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4"
            muted loop autoPlay playsInline preload="metadata"
            style={{ width: '100%', borderRadius: 12, border: '1px solid #2a2a2d', maxHeight: 170, objectFit: 'cover', marginBottom: 16 }}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            {plans.map((p) => {
              const fullMinor = TIER_PRICES[p.tier].usd
              const full = formatCheckoutMoney('usd', fullMinor)
              const now = formatCheckoutMoney('usd', off(fullMinor))
              return (
                <a
                  key={p.tier}
                  href={`/api/stripe/checkout?tier=${p.tier}&billing=monthly&promo=WELCOME20&checkout_origin=welcome20_modal`}
                  onClick={() => setPending(p.tier)}
                  style={{
                    flex: 1, display: 'block', textDecoration: 'none',
                    borderRadius: 14, padding: '16px 16px 14px', position: 'relative',
                    background: p.highlight ? 'rgba(41,151,255,.10)' : 'rgba(255,255,255,.03)',
                    border: p.highlight ? '1px solid rgba(41,151,255,.55)' : '1px solid rgba(255,255,255,.10)',
                    opacity: pending && pending !== p.tier ? 0.55 : 1,
                    transition: 'transform .15s ease, border-color .15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  {p.highlight && (
                    <span style={{
                      position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap', fontSize: 10, fontWeight: 900, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: '#0a0a0b', background: '#2997ff',
                      borderRadius: 999, padding: '2px 10px',
                    }}>
                      ⭐ Best deal
                    </span>
                  )}
                  <span style={{ display: 'block', color: '#f5f5f7', fontSize: 15, fontWeight: 900 }}>{p.name}</span>
                  <span style={{ display: 'block', color: '#86868b', fontSize: 11.5, fontWeight: 700, margin: '1px 0 8px' }}>{p.credits}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 9 }}>
                    <span style={{ color: p.highlight ? '#5cb3ff' : '#f5f5f7', fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>
                      {pending === p.tier ? '…' : now}
                    </span>
                    <s style={{ color: '#5a5a60', fontSize: 13, fontWeight: 700 }}>{full}</s>
                    <span style={{ color: '#86868b', fontSize: 11 }}>first month</span>
                  </span>
                  <span style={{ display: 'block' }}>
                    {p.perks.map((perk) => (
                      <span key={perk} style={{ display: 'flex', gap: 6, color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.55 }}>
                        <span style={{ color: '#34d399' }}>✓</span>
                        <span>{perk}</span>
                      </span>
                    ))}
                  </span>
                  <span style={{
                    display: 'block', textAlign: 'center', marginTop: 12, padding: '9px 0',
                    borderRadius: 10, fontSize: 12.5, fontWeight: 900,
                    background: p.highlight ? '#2997ff' : 'rgba(255,255,255,.07)',
                    color: p.highlight ? '#fff' : '#f5f5f7',
                    border: p.highlight ? 'none' : '1px solid rgba(255,255,255,.12)',
                  }}>
                    {pending === p.tier ? 'Opening checkout…' : `Claim 20% off ${p.name} →`}
                  </span>
                </a>
              )
            })}
          </div>

          <p style={{ color: '#5a5a60', fontSize: 10.5, textAlign: 'center', margin: '13px 0 0' }}>
            Applies to your first month · cancel anytime · renews at the regular price
          </p>
        </div>
      </div>
    </div>
  )
}
