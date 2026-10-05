'use client'

// KINEO-TOPUP-OFERTA-2026-09-06 (sprint-assinaturas #29)
// ─────────────────────────────────────────────────────────────────────────────
// O QUE ESTA CAIXA SUBSTITUI: desde 17/08 (KINEO-TOPUP100-2026-08-17, "mostra a
// escadinha pra TODOS") o pop-up de crédito curto do /studio/create pintava os
// QUATRO pacotes de recarga para qualquer conta. O /api/stripe/checkout nunca
// concordou: `canPurchaseCreditTopup` só aceita basic/pro, e todo mundo fora
// disso levava 403 `topup_requires_creator_plus` e caía no /pricing com um erro
// vermelho. Medido em 60 dias: 18 pessoas viram a escadinha e NENHUMA delas
// podia comprar — 17 free e 1 Starter.
//
// O caso que fechou a conta (06/09, conta do TAAFT, Paquistão): cadastro
// 12:15:17, pediu um filme de 90s às 12:18, o modal abriu às 12:19:07, ela
// clicou em `topup100` às 12:19:08 — QUATRO MINUTOS depois de chegar, com os
// 25 créditos do trial intactos — e levou o 403. Em seguida encolheu o próprio
// pedido de 90s para 35s, fez UM filme, baixou e foi embora.
//
// Esta caixa não vende nada novo: ela devolve o espaço dos botões mortos para a
// única saída que a conta REALMENTE tem — as linhas de plano logo acima, que já
// funcionam — e diz, em filmes, o que aquele plano compra. Todo número vem de
// `LimitPurchaseFit` / TIER_CREDITS; nada é digitado aqui.
//
// ⚠ #30 — A #29 SUBIU SEM RASTRO. A troca dos quatro botões mortos por esta
// caixa só existe dentro da tela de quem está logado e não escrevia UMA linha
// no banco: às 15:38 de hoje a entrega das 15:21 não tinha como se provar. As
// três linhas de telemetria abaixo fecham isso — `topup_unavailable_note_shown`
// é a única prova de que a correção está no ar e de quem a está vendo.
//
// KINEO-PAREDE-V1-2026-09-23 — COPY POSITIVA, SEM RECUSA. A frase abria com
// "One-time credit packs are a Creator and Studio feature": a primeira coisa
// que a pessoa lia, no instante em que bateu na parede dos 10 créditos, era o
// nome de um recurso que ela NÃO tem. Medido em 23/09: a parede (`reason=
// trial_spent`, 57 de 83 aberturas em 30 d) fecha Starter 3/13 e Creator
// 1/21 — e a caixa falava de Creator/Studio para quem o Starter já cobre o
// filme. Agora ela aponta para o plano de cima que cobre ESTE filme (o mesmo
// `fittingPlanIds[0]` de antes) e deixa a recarga como consequência de ter
// um plano, não como porta fechada. Nada de número novo: TIER_CREDITS,
// filmsCoveredByTier, a guarda do divisor e o evento continuam iguais.
//
// ═══ KINEO-PASSE-AVULSO-2026-10-05 — O PASSE DE UM FILME, AO LADO DO PLANO ═══
// Medido em 05/10: 16 contas free/trial bateram nesta parede em 48 h e nenhuma
// tinha como comprar UM filme — a caixa só dizia que recarga é coisa de plano.
// Decisão do fundador (Pacote 2): o passe avulso (PACK_PRICE_MINOR por
// PACK_CREDITS.starter = exatamente um filme Seedance 1.5 de 60 s, sem
// assinatura) aparece AQUI, abaixo da sugestão de plano — o plano continua
// sendo o CTA principal. Só para conta que NÃO assina (o pai decide e passa
// `filmPass`; ausente = nada muda). O checkout é o caminho que já existe
// (?pack=starter, devolvido ao Studio pelo pai). Impressão: `film_pass_offer_shown`,
// uma vez por montagem; o clique usa os eventos de checkout de sempre.
// Nenhum preço digitado: tudo sai de lib/checkoutPricing.
import { useEffect, useRef } from 'react'
import type { LimitPurchaseFit, LimitPurchasePlanTier } from '@/lib/growth/limitPurchaseFit'
import { PACK_ADVERTISED_SECONDS, PACK_CREDITS, PACK_PRICE_MINOR, TIER_CREDITS, packPriceLabel } from '@/lib/checkoutPricing'
import { trackEvent } from '@/lib/analytics'

export const FILM_PASS_OFFER_VERSION = 'film_pass_offer_v1' as const

/** O que o passe faz por ESTE pedido: cobre o filme (saldo + passe ≥ custo) ou só um filme de 60 s de Seedance. */
export function filmPassCoversRequest(fit: LimitPurchaseFit | null): boolean {
  if (!fit) return false
  const balance = Number.isFinite(fit.balance) ? Math.max(0, fit.balance) : 0
  return balance + PACK_CREDITS.starter >= fit.requiredCredits
}

/** "One 60-second film, no subscription — 35 credits." Derivado. */
export function filmPassCopy(fit: LimitPurchaseFit | null): { title: string; sub: string } {
  const title = `Just one film? ${packPriceLabel()}, no subscription`
  const base = `${PACK_CREDITS.starter} credits — one ${PACK_ADVERTISED_SECONDS.starter}-second Seedance 1.5 film. Paid once.`
  return { title, sub: filmPassCoversRequest(fit) ? `Covers this film. ${base}` : base }
}

const TIER_NAMES: Record<LimitPurchasePlanTier, string> = {
  starter: 'Starter',
  basic: 'Creator',
  pro: 'Studio',
}

/**
 * Quantos filmes DESTE tamanho o plano compra por mês. Piso 1 e divisor
 * saneado: um `requiredCredits` 0/NaN daria "Infinity films" — o mesmo defeito
 * que o KINEO-POPUP-AUDIT-2026-08-25 já pegou uma vez neste pop-up.
 */
export function filmsCoveredByTier(
  tier: LimitPurchasePlanTier,
  requiredCredits: number,
): number {
  const cost = Number.isFinite(requiredCredits) ? Math.floor(requiredCredits) : 0
  if (cost < 1) return 1
  return Math.max(1, Math.floor(TIER_CREDITS[tier] / cost))
}

/**
 * A frase honesta. `fit` ausente (o modal abriu sem pedido de crédito) cai na
 * versão curta: por que a escadinha não está ali, sem prometer número nenhum.
 */
export function topupUnavailableCopy(fit: LimitPurchaseFit | null): string {
  const tier = fit?.fittingPlanIds[0] ?? null
  if (!fit || !tier) {
    return 'Pick the plan above that covers this film. One-time top-ups unlock once you are on a plan.'
  }
  const films = filmsCoveredByTier(tier, fit.requiredCredits)
  const name = TIER_NAMES[tier]
  return films <= 1
    ? `${name} above covers this film today. One-time top-ups unlock once you are on a plan.`
    : `${name} above covers this film and ${films - 1} more like it this month. One-time top-ups unlock once you are on a plan.`
}

export default function TopupUnavailableNote({
  fit,
  filmPass = null,
}: {
  fit: LimitPurchaseFit | null
  /** KINEO-PASSE-AVULSO-2026-10-05 — só para conta sem assinatura. `onBuy` é do pai (rascunho, checkout, eventos). */
  filmPass?: { onBuy: () => void; disabled?: boolean; reason?: string | null } | null
}) {
  // Uma vez por montagem, fire-and-forget: telemetria nunca pode derrubar o
  // pop-up de crédito curto de quem está a tentar comprar.
  const trackedRef = useRef(false)
  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    try {
      void trackEvent('topup_unavailable_note_shown', {
        tier: fit?.fittingPlanIds[0] ?? null,
        required_credits: fit?.requiredCredits ?? null,
      })
    } catch {
      /* ignore */
    }
  }, [fit])

  // KINEO-PASSE-AVULSO-2026-10-05 — impressão REAL do passe: só quando ele é pintado, uma vez por montagem.
  const filmPassTrackedRef = useRef(false)
  useEffect(() => {
    if (!filmPass || filmPassTrackedRef.current) return
    filmPassTrackedRef.current = true
    try {
      void trackEvent('film_pass_offer_shown', {
        version: FILM_PASS_OFFER_VERSION,
        surface: 'generate_upgrade_modal',
        pack: 'starter',
        pack_price_minor: PACK_PRICE_MINOR.usd,
        pack_credits: PACK_CREDITS.starter,
        required_credits: fit?.requiredCredits ?? null,
        balance: fit?.balance ?? null,
        covers_request: filmPassCoversRequest(fit),
        reason: filmPass.reason ?? null,
      })
    } catch {
      /* ignore */
    }
  }, [filmPass, fit])
  const passCopy = filmPass ? filmPassCopy(fit) : null

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.10)',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#86868b',
          textAlign: 'center',
          lineHeight: 1.45,
        }}
      >
        {topupUnavailableCopy(fit)}
      </span>
      {filmPass && passCopy ? (
        <button
          type="button"
          data-kineo="film-pass"
          data-version={FILM_PASS_OFFER_VERSION}
          disabled={filmPass.disabled === true}
          onClick={() => filmPass.onBuy()}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.22)',
            color: '#E2E8F0',
            textAlign: 'center',
            cursor: filmPass.disabled ? 'not-allowed' : 'pointer',
            opacity: filmPass.disabled ? 0.6 : 1,
          }}
        >
          <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800 }}>{passCopy.title} →</span>
          <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#a1a1a8', marginTop: 2 }}>
            {passCopy.sub}
          </span>
        </button>
      ) : null}
    </div>
  )
}
