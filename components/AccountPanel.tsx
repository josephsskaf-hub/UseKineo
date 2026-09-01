'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-ACCOUNT-PANEL-2026-08-19 — o painel de conta virou de verdade.
// ═══════════════════════════════════════════════════════════════════════════
// Pedido do fundador: "um menu onde a pessoa consiga sair, consiga ver quais
// são os vídeos dela, qual é o plano dela, quando ela paga — todas essas
// coisas que as configurações desses sites têm", 30% maior, bonito.
//
// O QUE O PAINEL ANTIGO ERA: 950×430, uma caixa grande de Library à esquerda e
// três links empilhados à direita (Profile · Billing · Usage) + Sign out. Ou
// seja: um MENU DE NAVEGAÇÃO disfarçado de painel. Ele não respondia nenhuma
// das perguntas que a pessoa abre o menu para responder — quanto crédito me
// resta, que plano eu tenho, quando sou cobrado de novo. Para saber qualquer
// uma delas era preciso sair dali e carregar outra página.
//
// O QUE ELE É AGORA: 1240×620 (+30% em cada eixo), e cada bloco RESPONDE em
// vez de encaminhar:
//   · identidade + plano no cabeçalho, com o preço real do plano
//   · CRÉDITOS como número grande, com barra contra o grant do plano e o
//     botão de comprar mais AO LADO — ver a nota sobre top-up abaixo
//   · RENOVAÇÃO com a data real vinda da Stripe (/api/me/subscription)
//   · BIBLIOTECA com vídeos/imagens/áudio e o uso de armazenamento
//   · atalhos e Sign out, que é o que sobrou de menu
//
// ⚠️ POR QUE O TOP-UP GANHOU DESTAQUE AQUI (fundador: "as pessoas que usam
// muito acabam precisando de mais crédito mesmo continuando no Creator e no
// Studio"). Ele está certo, e a V6 tornou isso mais provável, não menos: o
// grant do Creator caiu de 140 para 90 créditos. Antes, quem acabava o crédito
// só tinha um caminho oferecido — TROCAR DE PLANO — e trocar de plano é uma
// decisão grande para um problema pequeno ("preciso de mais três vídeos esta
// semana"). O resultado natural disso é a pessoa parar de produzir e esperar o
// mês virar, que é a pior coisa que pode acontecer com um assinante ativo.
// O pack avulso resolve sem mexer na assinatura, e por isso ele mora ao lado
// do saldo, não escondido atrás de um upsell de plano.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import type { MySubscription } from '@/app/api/me/subscription/route'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'

export interface AccountPanelProps {
  email: string
  displayName: string
  plan: string | null
  credits: number | null
  storage: {
    videos: number
    images: number
    audios: number
    total: number
    limit: number | null
    retention: string
  } | null
  onClose: () => void
  onBuyCredits: () => void
  onSignOut: () => void
  /** Fecha a sidebar no mobile junto com o painel. */
  onNavigate?: () => void
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', starter: 'Starter', basic: 'Creator', pro: 'Studio',
  autopilot: 'Autopilot', autopilot_pilot: 'Autopilot pilot',
}
/** Grant mensal do plano — denominador da barra de créditos. */
const PLAN_GRANT: Record<string, number> = {
  starter: TIER_CREDITS.starter, basic: TIER_CREDITS.basic,
  pro: TIER_CREDITS.pro, autopilot: TIER_CREDITS.autopilot,
}
const PLAN_PRICE: Record<string, number> = {
  starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd,
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.028)',
  border: '1px solid rgba(255,255,255,0.075)',
  borderRadius: 18,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}
const EYEBROW: React.CSSProperties = {
  fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.11em', color: '#86868b',
}

function Bar({ pct, warn }: { pct: number; warn?: boolean }) {
  return (
    <span aria-hidden="true" style={{ display: 'block', height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <span style={{
        display: 'block', height: '100%', borderRadius: 99,
        width: `${Math.max(2, Math.min(100, pct))}%`,
        background: warn ? 'linear-gradient(90deg,#f59e0b,#fb923c)' : 'linear-gradient(90deg,#2997ff,#5cb3ff)',
        transition: 'width .35s ease',
      }} />
    </span>
  )
}

export default function AccountPanel({
  email, displayName, plan, credits, storage,
  onClose, onBuyCredits, onSignOut, onNavigate,
}: AccountPanelProps) {
  const [sub, setSub] = useState<MySubscription | null>(null)

  // Só busca quando o painel abre — é uma chamada à Stripe, não vale gastar
  // em toda navegação.
  useEffect(() => {
    let cancelled = false
    void fetch('/api/me/subscription', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<MySubscription>) : Promise.reject()))
      .then((d) => { if (!cancelled) setSub(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const planKey = (plan ?? 'free').toLowerCase()
  const planName = PLAN_LABEL[planKey] ?? 'Free'
  const isPaid = planKey in PLAN_GRANT
  const topupEligible = canPurchaseCreditTopup(planKey)
  const grant = PLAN_GRANT[planKey] ?? null
  const priceMinor = PLAN_PRICE[planKey] ?? null
  const cr = credits ?? 0
  // A barra só existe quando existe denominador honesto. Conta grátis não tem
  // grant mensal, e desenhar uma barra cheia ali seria inventar um limite.
  const creditPct = grant ? (cr / grant) * 100 : null
  const lowCredits = grant !== null && cr <= Math.max(5, grant * 0.15)

  const renews = sub?.renewsAt ? new Date(sub.renewsAt) : null
  const renewLabel = renews
    ? renews.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const daysLeft = renews ? Math.max(0, Math.ceil((renews.getTime() - Date.now()) / 86400000)) : null

  const go = () => { onClose(); onNavigate?.() }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(2px)' }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        style={{
          position: 'fixed', bottom: 74, left: 14, zIndex: 61,
          // +30% sobre os 950×430 que o fundador tinha medido, e altura livre
          // para não cortar conteúdo em tela baixa.
          width: 'min(1240px, calc(100vw - 28px))',
          maxHeight: 'min(620px, calc(100vh - 96px))',
          background: 'linear-gradient(180deg,#17171a 0%,#131315 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24,
          boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(41,151,255,0.07)',
          padding: 20,
          display: 'flex', flexDirection: 'column', gap: 14,
          overflowY: 'auto',
        }}
      >
        {/* ── Cabeçalho: quem é, que plano, quanto custa ─────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 4px 0' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#2997ff,#0a6fd8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem', fontWeight: 900, color: '#fff',
          }}>
            {(displayName || email || 'U')[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text,#f5f5f7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || email.split('@')[0]}
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase',
                color: isPaid ? '#2997ff' : '#86868b',
                background: isPaid ? 'rgba(41,151,255,0.13)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isPaid ? 'rgba(41,151,255,0.34)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, padding: '3px 8px', flexShrink: 0,
              }}>
                {planName}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#86868b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#86868b', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Linha 1: créditos (com top-up) · plano/renovação ───────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', gap: 14 }}>
          {/* CRÉDITOS — a pergunta nº1 de quem abre este menu */}
          <div style={{ ...CARD, borderColor: lowCredits ? 'rgba(245,158,11,0.35)' : 'rgba(41,151,255,0.22)', background: lowCredits ? 'rgba(245,158,11,0.05)' : 'rgba(41,151,255,0.055)' }}>
            <span style={EYEBROW}>Credits</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 10 }}>
              <span style={{ fontSize: '2.9rem', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: lowCredits ? '#fbbf24' : '#f5f5f7' }}>
                {credits ?? '…'}
              </span>
              {grant && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#86868b', paddingBottom: 5 }}>
                  of {grant} this month
                </span>
              )}
            </div>
            {creditPct !== null && (
              <div style={{ marginTop: 14 }}><Bar pct={creditPct} warn={lowCredits} /></div>
            )}
            <p style={{ fontSize: '0.76rem', color: '#a1a1a6', lineHeight: 1.5, margin: '12px 0 0' }}>
              {lowCredits
                ? topupEligible
                  ? 'Running low. A one-time pack tops you up without touching your plan.'
                  : 'Running low. Choose a plan to keep creating.'
                : topupEligible
                  ? 'Need more before your renewal? Top up without changing plans.'
                  : 'Credits are how videos, images and voiceovers are billed.'}
            </p>
            <div style={{ display: 'flex', gap: 9, marginTop: 'auto', paddingTop: 14 }}>
              {topupEligible ? (
                <button
                  onClick={() => { onClose(); onBuyCredits() }}
                  style={{
                    flex: 1, padding: '11px 14px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontSize: '0.83rem', fontWeight: 800, color: '#fff',
                    background: 'linear-gradient(135deg,#2997ff,#0a6fd8)',
                    boxShadow: '0 6px 18px rgba(41,151,255,0.3)',
                  }}
                >
                  Buy more credits
                </button>
              ) : (
                <Link
                  href="/pricing" onClick={go} data-topup-eligibility="ineligible"
                  style={{
                    flex: 1, padding: '11px 14px', borderRadius: 11, textDecoration: 'none', textAlign: 'center',
                    fontSize: '0.83rem', fontWeight: 800, color: '#fff',
                    background: 'linear-gradient(135deg,#2997ff,#0a6fd8)', border: 'none',
                    boxShadow: '0 6px 18px rgba(41,151,255,0.3)',
                  }}
                >
                  See plans
                </Link>
              )}
            </div>
          </div>

          {/* PLANO E RENOVAÇÃO — "quando eu pago de novo" */}
          <div style={CARD}>
            <span style={EYEBROW}>Plan &amp; billing</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.02em' }}>{planName}</span>
              {priceMinor !== null && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#86868b' }}>
                  {formatCheckoutMoney('usd', priceMinor)}/mo
                </span>
              )}
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {/* Só afirma sobre renovação quando a Stripe respondeu. Um painel
                  que chuta data de cobrança é pior que um painel silencioso. */}
              {renewLabel && !sub?.cancelsAtPeriodEnd && (
                <span style={{ fontSize: '0.82rem', color: '#a1a1a6' }}>
                  Renews <b style={{ color: '#f5f5f7' }}>{renewLabel}</b>
                  {daysLeft !== null && daysLeft <= 10 && <span style={{ color: '#86868b' }}> · in {daysLeft}d</span>}
                </span>
              )}
              {renewLabel && sub?.cancelsAtPeriodEnd && (
                <span style={{ fontSize: '0.82rem', color: '#fbbf24' }}>
                  Cancels on <b>{renewLabel}</b> — access continues until then
                </span>
              )}
              {!renewLabel && isPaid && (
                <span style={{ fontSize: '0.82rem', color: '#86868b' }}>Active subscription</span>
              )}
              {!isPaid && (
                <span style={{ fontSize: '0.82rem', color: '#86868b' }}>No subscription — you are on the free tier</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto', paddingTop: 14 }}>
              <Link href="/account?tab=billing" onClick={go} style={linkBtn}>Manage billing &amp; invoices</Link>
              {isPaid && planKey !== 'pro' && (
                <Link href="/pricing" onClick={go} style={{ ...linkBtn, color: '#7cc0ff', borderColor: 'rgba(41,151,255,0.3)', background: 'rgba(41,151,255,0.08)' }}>
                  Upgrade plan
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Linha 2: biblioteca · atalhos ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', gap: 14 }}>
          <Link href="/library" onClick={go} style={{ ...CARD, textDecoration: 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={EYEBROW}>Your library</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7cc0ff' }}>open →</span>
            </span>
            <span style={{ display: 'flex', gap: 44, marginTop: 16 }}>
              {([['Videos', storage?.videos], ['Images', storage?.images], ['Audio', storage?.audios]] as const).map(([lbl, n]) => (
                <span key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#f5f5f7', lineHeight: 1 }}>
                    {typeof n === 'number' ? n : '…'}
                  </span>
                  <span style={EYEBROW}>{lbl}</span>
                </span>
              ))}
            </span>
            {storage && (
              <span style={{ display: 'block', marginTop: 'auto', paddingTop: 16 }}>
                <Bar
                  pct={storage.limit ? (storage.total / storage.limit) * 100 : 100}
                  warn={Boolean(storage.limit && storage.total / storage.limit > 0.85)}
                />
                <span style={{ display: 'block', marginTop: 8, fontSize: '0.75rem', color: '#86868b' }}>
                  {storage.limit
                    ? `${storage.total} of ${storage.limit} projects · ${storage.retention}`
                    : `${storage.total} projects · unlimited · ${storage.retention}`}
                </span>
              </span>
            )}
          </Link>

          <div style={{ ...CARD, gap: 7 }}>
            <span style={{ ...EYEBROW, marginBottom: 4 }}>Settings</span>
            {[
              { href: '/account?tab=profile', label: 'Profile', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c1.5-3.4 4.5-5.3 8-5.3s6.5 1.9 8 5.3' },
              { href: '/history', label: 'My videos', d: 'M4 5.5h16v13H4zM10 9.5l5 2.5-5 2.5z' },
              { href: '/account?tab=usage', label: 'Usage & activity', d: 'M4 19.5V12M10 19.5V5.5M16 19.5V9M21 19.5H3.5' },
            ].map((it) => (
              <Link key={it.href} href={it.href} onClick={go} style={rowBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={it.d} />
                </svg>
                <span>{it.label}</span>
              </Link>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: 'auto 4px 4px' }} />
            <button
              onClick={() => { onClose(); onSignOut() }}
              style={{ ...rowBtn, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(239,68,68,0.10)'; el.style.color = '#f87171' }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.03)'; el.style.color = 'var(--text2,#c7c7cc)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" />
                <path d="m15 16.5 4.5-4.5L15 7.5M19.5 12H9" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const linkBtn: React.CSSProperties = {
  display: 'block', textAlign: 'center', padding: '10px 12px', borderRadius: 11,
  fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
  color: 'var(--text2,#c7c7cc)', background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11,
  padding: '12px 13px', borderRadius: 11,
  fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
  color: 'var(--text2,#c7c7cc)', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
}
