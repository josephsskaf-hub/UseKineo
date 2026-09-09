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
import { countShotClips, decideTrialDoorOffer } from '@/lib/growth/cleanFilmTrialDoor'
import { videosForCredits } from '@/lib/marketingPrice'

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
  /**
   * KINEO-PORTA-MODAL-FILME-RODADO-2026-09-09 — os clipes que a casa JÁ rodou
   * para o filme que acabou de ser recusado. Vazio/ausente é o caso normal
   * (modal aberto sem geração em curso) e aí a caixa é byte a byte a de antes.
   */
  readyClips?: readonly string[] | null
}

export default function UpgradeModalTrialDoor({
  currency,
  region,
  notPaidProven,
  reason,
  readyClips,
}: UpgradeModalTrialDoorProps) {
  const checkout = useCheckoutLaunch('generate_upgrade_modal_trial_door')
  // KINEO-PORTA-1DOLAR-FALA-EM-FILMES-2026-09-09 — a MESMA conta que escreve
  // "N AI films / month" nas linhas de plano logo abaixo (`videosForCredits`,
  // lib/marketingPrice), sobre os créditos que o cobrador concede de fato no
  // trial de cartão. Nenhum número novo entra na tela: é a conta que a casa já
  // fazia, aplicada à oferta que não a fazia. Fica na peça, e não no pai, pelo
  // mesmo motivo que na faixa: quem monta a caixa não precisa saber a conta.
  const filmsNow = videosForCredits(CARD_TRIAL_GRANT_CREDITS, 'cinematic_ai')
  // KINEO-PORTA-MODAL-FILME-RODADO-2026-09-09 — ver o bloco grande abaixo do
  // `decideTrialDoorOffer`: na Versão B esta caixa abre DEPOIS do trabalho
  // pronto, não antes.
  const shotClips = countShotClips(readyClips)
  const filmIsShot = shotClips > 0
  const impressionSentRef = useRef(false)

  const door = decideTrialDoorOffer({
    hasPaid: !notPaidProven,
    entryFeeLabel: currency !== null ? formatCheckoutMoney(currency, CARD_TRIAL_ENTRY_FEE_MINOR) : null,
    monthlyLabel: currency !== null ? formatCheckoutMoney(currency, getTierPrice('basic', currency, region)) : null,
    grantCredits: CARD_TRIAL_GRANT_CREDITS,
    trialDays: CARD_TRIAL_DAYS,
    // CONTINUA `false`, e agora pelo motivo CERTO. O comentário antigo dizia
    // "ele abre ANTES do render" — isso era verdade na Versão A e virou falso
    // em 08/09 (memória `comentario-que-justifica-envelhece`). Medido evento a
    // evento em `samu.mikkonen` (08/09 11:18:00 UTC): `fast_compose_recoverable`
    // com 15 clipes às 11:17:59, `compose_refused {limit:0}` às 11:18:00, e
    // este modal aberto no MESMO segundo. Na Versão B a cota é zero por
    // construção, então a casa escreve o roteiro e roda os clipes ANTES de
    // consultar a cota: quando esta caixa abre, o trabalho já existe.
    //
    // Mesmo assim `unlocksCurrentFilm` fica `false`, porque essa chave liga a
    // manchete "Get this film clean" — a promessa de tirar a marca d'água de um
    // arquivo QUE A PESSOA JÁ TEM NA MÃO. Aqui não há arquivo: há material
    // rodado e nenhum render. Dizer "this film clean" seria trocar uma mentira
    // por outra. O fato novo entra como nota própria (`filmIsShot`), abaixo.
    unlocksCurrentFilm: false,
    filmsNow,
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
      // Sem estes dois no MESMO evento, "a porta em filmes converteu?" não tem
      // denominador: impressão com nota e impressão sem nota viram a mesma
      // linha (memória `evento-de-impressao-nao-prova-o-conteudo`).
      films_now: typeof filmsNow === 'number' ? filmsNow : null,
      capacity_note_shown: door.capacityNote !== null,
      // Os MESMOS dois nomes que a `CardEntryDoor` emite (87926146). As duas
      // portas competem pelo mesmo instante e são mutuamente exclusivas —
      // medido hoje: quem viu uma não viu a outra. Com os campos iguais, a
      // pergunta "qual folha converte quando o filme já está rodado?" tem
      // denominador; com nomes diferentes, viram duas séries incomparáveis.
      ready_clips: shotClips,
      film_already_shot: filmIsShot,
    })
  }, [currency, door.capacityNote, door.reason, door.visible, filmIsShot, filmsNow, notPaidProven, reason, region, shotClips])

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
      {/* KINEO-PORTA-1DOLAR-FALA-EM-FILMES-2026-09-09 — A CAPACIDADE VEM ANTES
          DO NOME DA OFERTA. As linhas de plano, 10px abaixo, abrem com a
          contagem de filmes do mês; esta caixa abria pelo nome da oferta e
          escondia o que ela entrega numa linha cinza de 0.78rem. Quem procura
          o degrau mais barato compara o que CONSEGUE FAZER — e foi assim que a
          única compradora da coorte, em 08/09, escolheu 2 filmes por sete
          dólares tendo 3 filmes por um na mesma tela. A nota some sozinha
          quando a conta não fecha. */}
      {door.capacityNote ? (
        <strong
          data-trial-door-capacity={door.capacityNote}
          style={{ display: 'block', color: '#fff', fontSize: '1.06rem', lineHeight: 1.3, marginBottom: 2 }}
        >
          {door.capacityNote}
        </strong>
      ) : null}
      <strong style={{ display: 'block', color: door.capacityNote ? '#bcd9f7' : '#fff', fontSize: door.capacityNote ? '0.86rem' : '0.95rem', fontWeight: door.capacityNote ? 700 : 800, lineHeight: 1.35, marginBottom: 3 }}>
        {door.buttonLabel.replace(/\s*→\s*$/, '')}
      </strong>
      <span style={{ display: 'block', color: '#bcd9f7', fontSize: '0.78rem', lineHeight: 1.45, marginBottom: filmIsShot ? 8 : 10 }}>
        {door.priceNote}
      </span>
      {/* KINEO-PORTA-MODAL-FILME-RODADO-2026-09-09 — O QUE JÁ ESTÁ FEITO, dito
          antes do botão. Esta caixa abre 1 segundo depois de a casa terminar o
          roteiro e os clipes (ver o bloco no `unlocksCurrentFilm`), e mesmo
          assim só falava do que a pessoa GANHARIA. O trabalho pronto é o
          argumento mais forte que existe aqui, e estava invisível.
          Nada de preço nesta linha: é um fato contado, não uma oferta. */}
      {filmIsShot ? (
        <span
          data-trial-door-shot={shotClips}
          style={{ display: 'block', color: '#9fe6b4', fontSize: '0.78rem', lineHeight: 1.45, marginBottom: 10, fontWeight: 700 }}
        >
          {`✓ Script written and ${shotClips} clip${shotClips === 1 ? '' : 's'} already shot for this film`}
        </span>
      ) : null}
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
            // Sem o ramo no CLIQUE, a impressão sabe qual folha apareceu e o
            // clique não — e a taxa por ramo fica sem numerador.
            ready_clips: shotClips,
            film_already_shot: filmIsShot,
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
