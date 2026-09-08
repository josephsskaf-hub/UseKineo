'use client'

// KINEO-TRIAL-FIRST-FILM-PAY-DOOR-2026-09-07 ═══════════════════════════════
// O DEFEITO QUE ESTE ARQUIVO FECHA (medido 07/09 ~21:10 BRT, contas externas,
// 30 dias, `events`):
//
//   trial_active_banner_shown ................ 793 pessoas  ← a MAIOR
//                                                             superfície da casa
//   ├─ first_delivery_eligible = true ........ 216 pessoas
//   └─ first_delivery_eligible = false ....... 15 pessoas
//
// `components/TrialActiveBanner.tsx` só monta o botão de assinatura dentro de
// `{!firstDelivery.eligible && …}`. Ou seja: das 231 impressões que carimbam o
// campo, **216 pessoas (93,5%) não recebem controle de dinheiro nenhum** — a
// caixa do primeiro filme ocupa o lugar inteiro e não há como comprar dali.
// Não é hipótese de que essa gente queria comprar: **20 das 216 chegaram a um
// `checkout_started` por conta própria**, procurando a porta em outra tela, e 1
// pagou. A demanda existe e a superfície na frente dela é muda.
//
// POR QUE UMA PEÇA NOVA, E NÃO UM BOTÃO A MAIS NA CAIXA VERDE: a caixa do
// primeiro filme é o caminho GRÁTIS e continua sendo a manchete — "o primeiro
// vídeo é o produto". Esta porta nasce FORA dela, abaixo, com peso visual de
// link, e nunca substitui nem esconde o botão grátis. Quem quer o filme sem
// pagar clica no verde, exatamente como antes; quem já decidiu comprar deixa
// de precisar sair da tela para achar onde.
//
// A REGRA DE DINHEIRO NÃO MORA AQUI. `decideTrialDoorOffer` é a fonte única —
// a mesma que a caixa de export limpo e o modal de fim de trial consomem — e é
// ela que decide visibilidade, rótulo e nota de preço. Este arquivo não
// redigita preço, não escreve cifrão e não copia a regra (memória
// `superficie-medida-por-copia-da-regra`).

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

export const TRIAL_FIRST_FILM_PAY_DOOR_VERSION = 'trial_1usd_first_film' as const
export const TRIAL_FIRST_FILM_PAY_DOOR_HREF =
  `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${TRIAL_FIRST_FILM_PAY_DOOR_VERSION}` as const

const SHOWN_PREFIX = 'kineo:trial_first_film_pay_door:shown'

export type TrialFirstFilmPayDoorProps = {
  /** Chave estável da conta — o denominador é uma impressão por pessoa por dia. */
  userKey: string
  /** Dia UTC carimbado pelo pai, para a chave de dedupe não virar à meia-noite. */
  dayKey: string
  currency: CheckoutCurrency | null
  region: PriceRegion
  /**
   * `true` SOMENTE quando o servidor devolveu `has_paid === false` — o
   * predicado ESTRITO, nunca o negado. O cobrador recusa `?trial=1` para quem
   * já pagou; anunciar a taxa de entrada a quem levaria a mensalidade cheia é
   * mentira medível (memórias `predicado-largo-negado-falha-aberta` e
   * `vitrine-oferece-o-que-o-cobrador-recusa`).
   */
  notPaidProven: boolean
  creditsBefore: number | null
  msLeft: number | null
}

export default function TrialFirstFilmPayDoor({
  userKey,
  dayKey,
  currency,
  region,
  notPaidProven,
  creditsBefore,
  msLeft,
}: TrialFirstFilmPayDoorProps) {
  const checkout = useCheckoutLaunch('trial_first_film_pay_door')
  const impressionSentRef = useRef(false)

  const door = decideTrialDoorOffer({
    hasPaid: !notPaidProven,
    entryFeeLabel: currency !== null ? formatCheckoutMoney(currency, CARD_TRIAL_ENTRY_FEE_MINOR) : null,
    monthlyLabel: currency !== null ? formatCheckoutMoney(currency, getTierPrice('basic', currency, region)) : null,
    grantCredits: CARD_TRIAL_GRANT_CREDITS,
    trialDays: CARD_TRIAL_DAYS,
    // Nenhum filme em foco aqui: a pessoa ainda não gastou um crédito. A porta
    // promete o trial pelo que ele é, nunca "este filme limpo".
    unlocksCurrentFilm: false,
  })

  // A impressão sai quando a decisão está RESOLVIDA (moeda conhecida), e leva o
  // veredito junto — `visible` e `reason` no mesmo evento. Sem os dois, um zero
  // de cliques não distingue "ninguém quis" de "a porta nunca apareceu"
  // (memória `duas-contas-certas-portao-escolhe-a-errada`).
  useEffect(() => {
    if (currency === null || impressionSentRef.current) return
    impressionSentRef.current = true
    const key = `${SHOWN_PREFIX}:${userKey}:${dayKey}`
    try {
      if (window.localStorage.getItem(key) === '1') return
      window.localStorage.setItem(key, '1')
    } catch {
      // localStorage bloqueado nunca cala o evento nem derruba a tela: sem a
      // chave a contagem pode repetir, e repetir é melhor que sumir.
    }
    void trackEvent('trial_first_film_pay_door_shown', {
      version: TRIAL_FIRST_FILM_PAY_DOOR_VERSION,
      visible: door.visible,
      reason: door.reason,
      trial_door: door.visible,
      card_trial: door.visible ? '1' : null,
      not_paid_proven: notPaidProven,
      display_currency: currency,
      price_region: region,
      entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
      credits_before: creditsBefore,
      ms_left: msLeft,
      first_delivery_eligible: true,
    })
  }, [currency, dayKey, door.reason, door.visible, creditsBefore, msLeft, notPaidProven, region, userKey])

  if (!door.visible || !door.buttonLabel) return null

  return (
    <div className="mt-2" data-trial-first-film-pay-door={TRIAL_FIRST_FILM_PAY_DOOR_VERSION}>
      <button
        type="button"
        disabled={checkout.pending !== null}
        onClick={() => {
          // Evento ANTES da navegação: depois do redirect da Stripe não existe
          // mais página para emitir nada.
          void trackEvent('trial_first_film_pay_door_clicked', {
            version: TRIAL_FIRST_FILM_PAY_DOOR_VERSION,
            tier: 'basic',
            trial_door: true,
            card_trial: '1',
            display_currency: currency,
            price_region: region,
            entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
            credits_before: creditsBefore,
            ms_left: msLeft,
            first_delivery_eligible: true,
          })
          checkout.launch('basic', TRIAL_FIRST_FILM_PAY_DOOR_HREF, {
            tier: 'basic',
            pricing_surface: 'trial_first_film_pay_door',
            intent_campaign: TRIAL_FIRST_FILM_PAY_DOOR_VERSION,
            card_trial: '1',
            trial_door: true,
          })
        }}
        // Peso visual de LINK, de propósito: a manchete desta tela é o filme
        // grátis, e empilhar um segundo botão sólido transformaria a caixa do
        // primeiro filme numa disputa. O alvo de toque, porém, segue os 44px
        // que este par de telas já pratica no botão de dispensar — o pedido de
        // venda não pode ser o único controle não-tocável (WCAG 2.5.8).
        className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-black"
        style={{
          color: checkout.pending !== null ? 'rgba(92,179,255,.55)' : '#5cb3ff',
          background: 'transparent',
          border: 0,
          textDecoration: 'underline',
          cursor: checkout.pending !== null ? 'wait' : 'pointer',
          textAlign: 'left',
        }}
      >
        {checkout.pending !== null ? 'Opening checkout…' : door.buttonLabel}
      </button>
      {door.priceNote && (
        <p className="mt-1 text-xs" style={{ color: 'var(--muted2)', lineHeight: 1.45 }}>
          {door.priceNote}
        </p>
      )}
      {checkout.error && (
        <p className="mt-1 text-xs" style={{ color: '#ff6b6b' }}>
          {checkout.error}
        </p>
      )}
    </div>
  )
}

