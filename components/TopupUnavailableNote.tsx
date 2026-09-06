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
import { useEffect, useRef } from 'react'
import type { LimitPurchaseFit, LimitPurchasePlanTier } from '@/lib/growth/limitPurchaseFit'
import { TIER_CREDITS } from '@/lib/checkoutPricing'
import { trackEvent } from '@/lib/analytics'

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
    return 'One-time credit packs are a Creator and Studio feature. Pick a plan above to unlock them.'
  }
  const films = filmsCoveredByTier(tier, fit.requiredCredits)
  const name = TIER_NAMES[tier]
  return films <= 1
    ? `One-time credit packs are a Creator and Studio feature. ${name} above covers this film today.`
    : `One-time credit packs are a Creator and Studio feature. ${name} above covers this film and ${films - 1} more like it this month.`
}

export default function TopupUnavailableNote({ fit }: { fit: LimitPurchaseFit | null }) {
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
    </div>
  )
}
