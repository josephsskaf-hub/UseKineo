'use client'

// KINEO-VERSAO-B-ENTRADA-1-DOLAR-2026-09-08 — a porta única, no topo do Studio.
//
// Quem cadastrou sob a versão B nasce com trial_status='card_required' e ZERO
// crédito (lib/entryPolicy.ts). Esta faixa é a primeira coisa que essa pessoa
// vê em toda tela autenticada: o que a casa oferece ($1 por 7 dias, 80cr, todo
// motor), o que acontece no dia 8 ($15/mês, cancela quando quiser) e o botão.
// Ela NÃO decide preço: os rótulos vêm de lib/checkoutPricing pela mesma fonte
// única das outras portas (decideTrialDoorOffer), e some sozinha quando a
// pessoa já pagou ou quando a política volta para a versão A.

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  CARD_TRIAL_DAYS,
  CARD_TRIAL_ENTRY_FEE_MINOR,
  CARD_TRIAL_GRANT_CREDITS,
  coercePriceRegion,
  formatCheckoutMoney,
  getTierPrice,
  type PriceRegion,
} from '@/lib/checkoutPricing'
import { decideTrialDoorOffer } from '@/lib/growth/cleanFilmTrialDoor'
import { CARD_ENTRY_CHECKOUT_PATH, CARD_ENTRY_COPY, CARD_ENTRY_ONLY, CARD_ENTRY_TRIAL_STATUS } from '@/lib/entryPolicy'

export const CARD_ENTRY_BANNER_VERSION = 'card_entry_banner_v1' as const

export default function CardEntryBanner({
  status,
  hasPaid,
  credits = null,
}: {
  status: string | null
  hasPaid: boolean
  /** saldo lido no servidor; null = desconhecido (não decide sozinho) */
  credits?: number | null
}) {
  // KINEO-SISTEMA-DE-COMPRA-2026-09-08 — conta que nasceu sem o carimbo (porta de
  // cadastro que não passa pelo callback) mas está sem crédito e nunca pagou
  // também é da porta. Falha fechada: sem status e sem saldo lido, não mostra.
  const semCarimboMasSemCredito = status === null && credits === 0
  const visible = CARD_ENTRY_ONLY && !hasPaid && (status === CARD_ENTRY_TRIAL_STATUS || semCarimboMasSemCredito)
  const [region, setRegion] = useState<PriceRegion>('standard')
  const checkout = useCheckoutLaunch('card_entry_banner')
  const impressionSentRef = useRef(false)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    void fetch('/api/geo', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (r) => (r.ok ? ((await r.json()) as { region?: string }) : {}))
      .then((data) => {
        if (!cancelled) setRegion(coercePriceRegion(data.region))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [visible])

  const door = decideTrialDoorOffer({
    hasPaid,
    entryFeeLabel: formatCheckoutMoney('usd', CARD_TRIAL_ENTRY_FEE_MINOR),
    monthlyLabel: formatCheckoutMoney('usd', getTierPrice('basic', 'usd', region)),
    grantCredits: CARD_TRIAL_GRANT_CREDITS,
    trialDays: CARD_TRIAL_DAYS,
    unlocksCurrentFilm: false,
  })

  useEffect(() => {
    if (!visible || impressionSentRef.current) return
    impressionSentRef.current = true
    void trackEvent('card_entry_banner_shown', {
      version: CARD_ENTRY_BANNER_VERSION,
      visible: door.visible,
      door_reason: door.reason,
      price_region: region,
      entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
    })
  }, [visible, door.visible, door.reason, region])

  if (!visible || !door.visible || !door.buttonLabel) return null

  return (
    <div
      data-card-entry-banner={CARD_ENTRY_BANNER_VERSION}
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(41,151,255,.16), rgba(41,151,255,.06))',
        border: '1px solid rgba(41,151,255,.45)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 240, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{CARD_ENTRY_COPY.headline}</div>
        {door.priceNote ? (
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'rgba(255,255,255,.72)' }}>{door.priceNote}</div>
        ) : null}
      </div>
      <button
        type="button"
        data-testid="card-entry-banner-cta"
        disabled={checkout.pending !== null}
        onClick={() => {
          const started = checkout.launch('basic', CARD_ENTRY_CHECKOUT_PATH, {
            tier: 'basic',
            pricing_surface: 'card_entry_banner',
            card_trial: true,
          })
          if (!started) return
          void trackEvent('card_entry_banner_clicked', { version: CARD_ENTRY_BANNER_VERSION, price_region: region })
        }}
        style={{
          background: '#2997ff',
          color: '#000',
          border: 0,
          borderRadius: 999,
          padding: '11px 18px',
          fontSize: 14,
          fontWeight: 800,
          cursor: checkout.pending !== null ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {checkout.pending !== null ? 'Opening checkout…' : door.buttonLabel}
      </button>
    </div>
  )
}
