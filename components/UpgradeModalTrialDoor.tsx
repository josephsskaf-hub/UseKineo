'use client'

// KINEO-UPGRADE-MODAL-TRIAL-DOOR-2026-09-07 ═══════════════════════════════
// A SUPERFÍCIE DE VENDA MAIS BATIDA DO PRODUTO ainda só vendia mês cheio.
//
// Medido em 07/09 ~21:45 BRT (contas externas, 30 dias, `events`):
// `upgrade_modal_opened` = **62 pessoas** — a 4ª maior superfície de dinheiro
// da casa, atrás do banner do trial (793), da ponte (90) e da caixa
// pós-entrega (75), e à frente do exit intent (28) e do modal de fim de trial
// (15). É o modal que abre sozinho quando a pessoa aperta Generate sem saldo:
// intenção de compra declarada pelo próprio gesto.
//
// Todas as saídas dele — as três linhas de plano — mandavam para a mensalidade
// cheia. A ordem do fundador de 07/09 16:40 diz o contrário: "onde houver
// preço na tela, a primeira opção passa a ser Try Creator 7 days for $1. Nunca
// esconder o plano." Esta peça é a primeira metade; as linhas de plano
// continuam exatamente onde estavam, intocadas, logo abaixo.
//
// ORDEM DA TELA, e ela não é decorativa: a caixa verde "your first one is
// free" (`firstFilmFree`) continua ACIMA desta. Quem nunca fez um filme vê
// primeiro a saída grátis; a porta paga é o degrau seguinte, nunca o primeiro.
//
// A REGRA DE DINHEIRO NÃO MORA AQUI: `decideTrialDoorOffer` é a fonte única —
// a mesma do banner do trial, da caixa de export limpo e do modal de fim de
// trial (memória `superficie-medida-por-copia-da-regra`).

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  CARD_TRIAL_DAYS,
  CARD_TRIAL_ENTRY_FEE_MINOR,
  CARD_TRIAL_GRANT_CREDITS,
  formatCheckoutMoney,
  getTierPrice,
  type CheckoutCurrency,
  type PriceRegion,
} from '@/lib/checkoutPricing'
import { decideTrialDoorOffer } from '@/lib/growth/cleanFilmTrialDoor'

export const UPGRADE_MODAL_TRIAL_DOOR_VERSION = 'trial_1usd_upgrade_modal' as const
export const UPGRADE_MODAL_TRIAL_DOOR_HREF =
  `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${UPGRADE_MODAL_TRIAL_DOOR_VERSION}` as const

export type UpgradeModalTrialDoorProps = {
  currency: CheckoutCurrency | null
  region: PriceRegion
  /**
   * `true` SOMENTE quando o servidor devolveu `has_paid === false`. O cobrador
   * recusa `?trial=1` para quem já pagou, e `!isSubscriber` NÃO serve como
   * prova: ele abre justamente quando a leitura falha
   * (memória `predicado-largo-negado-falha-aberta`).
   */
  notPaidProven: boolean
  /** Razão pela qual o modal abriu — só telemetria, nunca decide visibilidade. */
  reason: string
}

export default function UpgradeModalTrialDoor({
  currency,
  region,
  notPaidProven,
  reason,
}: UpgradeModalTrialDoorProps) {
  const checkout = useCheckoutLaunch('generate_upgrade_modal_trial_door')
  const impressionSentRef = useRef(false)

  const door = decideTrialDoorOffer({
    hasPaid: !notPaidProven,
    entryFeeLabel: currency !== null ? formatCheckoutMoney(currency, CARD_TRIAL_ENTRY_FEE_MINOR) : null,
    monthlyLabel: currency !== null ? formatCheckoutMoney(currency, getTierPrice('basic', currency, region)) : null,
    grantCredits: CARD_TRIAL_GRANT_CREDITS,
    trialDays: CARD_TRIAL_DAYS,
    // O modal não tem um filme em foco para destravar: ele abre ANTES do
    // render, quando o saldo não cobre o pedido.
    unlocksCurrentFilm: false,
  })

  // Uma impressão por abertura de modal, com o veredito junto: sem `visible` e
  // `reason` no mesmo evento, zero clique não distingue "ninguém quis" de
  // "nunca apareceu" (memória `duas-contas-certas-portao-escolhe-a-errada`).
  useEffect(() => {
    if (currency === null || impressionSentRef.current) return
    impressionSentRef.current = true
    void trackEvent('upgrade_modal_trial_door_shown', {
      version: UPGRADE_MODAL_TRIAL_DOOR_VERSION,
      visible: door.visible,
      door_reason: door.reason,
      trial_door: door.visible,
      card_trial: door.visible ? '1' : null,
      not_paid_proven: notPaidProven,
      display_currency: currency,
      price_region: region,
      entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
      modal_reason: reason,
    })
  }, [currency, door.reason, door.visible, notPaidProven, reason, region])

  if (!door.visible || !door.buttonLabel) return null

  return (
    <div
      data-upgrade-modal-trial-door={UPGRADE_MODAL_TRIAL_DOOR_VERSION}
      style={{
        background: 'rgba(41,151,255,.10)',
        border: '1px solid rgba(41,151,255,.45)',
        borderRadius: 10,
        padding: '13px 14px',
        marginBottom: 14,
      }}
    >
      <span
        style={{
          display: 'block',
          color: '#5cb3ff',
          fontSize: '0.64rem',
          fontWeight: 900,
          letterSpacing: '0.1em',
          marginBottom: 4,
        }}
      >
        CHEAPEST WAY IN
      </span>
      <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem', lineHeight: 1.35, marginBottom: 3 }}>
        {door.buttonLabel.replace(/\s*→\s*$/, '')}
      </strong>
      <span style={{ display: 'block', color: '#bcd9f7', fontSize: '0.78rem', lineHeight: 1.45, marginBottom: 10 }}>
        {door.priceNote}
      </span>
      <button
        type="button"
        disabled={checkout.pending !== null}
        onClick={() => {
          void trackEvent('upgrade_modal_trial_door_clicked', {
            version: UPGRADE_MODAL_TRIAL_DOOR_VERSION,
            tier: 'basic',
            trial_door: true,
            card_trial: '1',
            display_currency: currency,
            price_region: region,
            entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
            modal_reason: reason,
          })
          checkout.launch('basic', UPGRADE_MODAL_TRIAL_DOOR_HREF, {
            tier: 'basic',
            pricing_surface: 'generate_upgrade_modal_trial_door',
            intent_campaign: UPGRADE_MODAL_TRIAL_DOOR_VERSION,
            card_trial: '1',
            trial_door: true,
          })
        }}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: 8,
          border: '1px solid rgba(41,151,255,.7)',
          background: checkout.pending !== null ? 'rgba(41,151,255,.10)' : 'rgba(41,151,255,.18)',
          color: '#dbeafe',
          fontWeight: 800,
          fontSize: '0.88rem',
          cursor: checkout.pending !== null ? 'wait' : 'pointer',
        }}
      >
        {checkout.pending !== null ? 'Opening checkout…' : door.buttonLabel}
      </button>
      {checkout.error && (
        <p style={{ marginTop: 6, color: '#ff6b6b', fontSize: '0.78rem' }}>{checkout.error}</p>
      )}
    </div>
  )
}
