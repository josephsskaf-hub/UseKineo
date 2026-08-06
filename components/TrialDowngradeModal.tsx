'use client'

// KINEO-TRIAL-PAYWALL-2026-08-06 — REVERSE TRIAL, FASE 2, ITEM 2b:
// O MODAL COMPARATIVO DE DOWNGRADE + CTA "Continue on Creator".
//
// Quem vê: exclusivamente quem o SERVIDOR marcou com
// `trial.showDowngradeModal === true` em /api/credits — isto é,
// `trial_status === 'downgraded'` E não-pagante (lib/reverseTrial.ts,
// trialUiState). Este componente NÃO reimplementa essa regra e não olha datas:
// duas cópias da mesma regra de dinheiro envelhecem em uma só, e o erro dessa
// família é mostrar "veja o que você perdeu" para quem acabou de PAGAR
// (`trial_downgraded_at` é carimbado também em quem CONVERTEU).
//
// ⚠️ A COPY SÓ AFIRMA O QUE O CÓDIGO FAZ HOJE. Três frases foram DERRUBADAS
// pela revisão adversarial desta sprint antes de existirem em produção, e as
// três eram verificáveis e falsas:
//
//   1. "export sem marca d'água" na coluna do trial. FALSO: só
//      `app/api/generate-video-cinematic/route.ts` consulta `isTrialActive()`.
//      `app/api/compose/route.ts` — que decide marca d'água, export limpo e a
//      cota de 3 Fast/24h — NÃO conhece o trial. Quem está em trial nunca teve
//      export limpo, então não pode "perdê-lo". Registrado como gate da sprint
//      (mexer em compose/marca d'água é decisão do fundador).
//   2. "0 credits" na coluna do free. FALSO para uma coorte real: o cron revoga
//      `min(saldo, concedido − usado)` DE PROPÓSITO, então crédito de indicação
//      e crédito anterior ao trial SOBREVIVEM ao downgrade. O saldo aqui vem do
//      mesmo /api/credits que alimenta o badge do topo — dois números da mesma
//      fonte nunca se contradizem na mesma tela.
//   3. "Unlimited AI renders while credits lasted". FALSO por um fator de 2:
//      40 créditos ÷ 20 por render Seedance = 2 vídeos. O número agora é
//      derivado de `creditCostFor('cinematic_ai')`, nunca redigitado.
//
// ⚠️ PREÇO: sempre de `lib/checkoutPricing`, por moeda resolvida em /api/geo,
// NUNCA um literal e NUNCA `lib/pricing.priceLabel` (que é USD fixo). Nenhum
// desconto novo aparece aqui: o COMEBACK50 existe SÓ nos e-mails D5/D10 e
// jamais em superfície pública.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { creditCostFor } from '@/lib/credits/engineCost'
import { FREE_FAST_PREVIEW_LIMIT } from '@/lib/freeFastQuota'
// Import de TIPO apenas (apagado no build — nenhum código de servidor viaja).
// O tipo vem da MESMA definição que o servidor serializa: renomear um campo lá
// passa a quebrar o build aqui, em vez de fazer o modal sumir em silêncio numa
// tela que pede dinheiro.
import type { TrialUiState } from '@/lib/reverseTrial'
import {
  CURRENCY_DISPLAY,
  INTRO_CREDITS,
  TIER_CREDITS,
  coercePriceRegion,
  formatCheckoutMoney,
  getIntroPrice,
  getTierPrice,
  hasIntroOffer,
  type CheckoutCurrency,
  type PriceRegion,
} from '@/lib/checkoutPricing'

// Dispensa por CONTA e por navegador. NÃO é o gate de elegibilidade — esse é
// do servidor; isto só evita que o modal reapareça a cada navegação.
const DISMISSED_PREFIX = 'kineo_trial_downgrade_dismissed_v1'
// Dedupe do evento de exibição. Duas decisões que a segunda passada da revisão
// corrigiu, e as duas são sobre MEDIR CERTO:
//   · o namespace é o MESMO da dispensa (`:userKey`). A primeira versão desta
//     chave era global por navegador — consertava o vazamento entre contas na
//     dispensa e o recriava uma chave ao lado: num computador compartilhado, a
//     impressão da segunda pessoa nunca seria contada.
//   · é `localStorage`, não `sessionStorage`. O desfecho (dispensa) vive para
//     sempre; se a impressão vivesse só por sessão, o numerador e o denominador
//     teriam cardinalidades diferentes e a razão entre eles não seria taxa de
//     nada. Impressão e desfecho contam a mesma unidade: uma por conta.
const SHOWN_PREFIX = 'kineo_trial_downgrade_shown_v1'

const SEEDANCE_COST = creditCostFor('cinematic_ai')

interface CreditsPayload {
  trial?: Partial<TrialUiState>
  hasPaid?: boolean
  entitlementsResolved?: boolean
  credits?: number
}

export default function TrialDowngradeModal({ userKey }: { userKey: string }) {
  const [open, setOpen] = useState(false)
  const [granted, setGranted] = useState(0)
  const [used, setUsed] = useState(0)
  const [creditsNow, setCreditsNow] = useState<number | null>(null)
  // Conhecidas ANTES do fetch (vêm do servidor como prop), que é o que permite
  // o short-circuit por localStorage e evita uma chamada a /api/credits por
  // navegação para quem já dispensou.
  const dismissKey = `${DISMISSED_PREFIX}:${userKey}`
  const shownKey = `${SHOWN_PREFIX}:${userKey}`
  // null enquanto /api/geo não respondeu: mostrar USD para um visitante do
  // Brasil e trocar o número depois é pior do que segurar o preço por um
  // instante (mesmo motivo do PricingCards).
  const [currency, setCurrency] = useState<CheckoutCurrency | null>(null)
  const [region, setRegion] = useState<PriceRegion>('standard')
  const checkout = useCheckoutLaunch('trial_downgrade_modal')
  const cardRef = useRef<HTMLDivElement | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  // ── Elegibilidade: só o servidor decide ────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // Short-circuit antes de gastar a request: quem já dispensou não custa nada.
    try {
      if (window.localStorage.getItem(dismissKey) === '1') return
    } catch {
      // localStorage bloqueado nunca esconde o modal nem derruba a tela.
    }

    void fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) throw new Error('credits_unavailable')
        return (await r.json()) as CreditsPayload
      })
      .then((data) => {
        if (cancelled) return
        const trial = data?.trial
        if (trial?.showDowngradeModal !== true) return

        // Segunda guarda, redundante com o servidor DE PROPÓSITO. A primeira
        // versão era `if (data?.hasPaid === true) return` e a revisão mostrou
        // que ela falhava ABERTO; a segunda virou `!== false`, e a SEGUNDA
        // passada mostrou que isso era um no-op: `hasPaid` sai como `false`
        // LITERAL mesmo quando a query secundária de /api/credits degrada por
        // blip de RLS/rede (ela loga e segue, sem erro HTTP). O campo que
        // responde de verdade é `entitlementsResolved`, e a própria rota diz
        // isso no comentário dela: "entitlement-sensitive clients may only
        // trust the paid/free verdict when this secondary query completed
        // successfully". Agora a guarda é fail-closed de fato — veredito não
        // resolvido não vira pedido de assinatura. Custa uma impressão; o outro
        // erro custa cobrar de quem já pagou.
        if (data?.entitlementsResolved !== true) return
        if (data?.hasPaid !== false) return

        setGranted(typeof trial.creditsGranted === 'number' ? trial.creditsGranted : 0)
        setUsed(typeof trial.creditsUsedForDisplay === 'number' ? trial.creditsUsedForDisplay : 0)
        setCreditsNow(typeof data.credits === 'number' ? data.credits : null)
        setOpen(true)

        // Uma exibição contada por CONTA, a mesma unidade do desfecho.
        let alreadyCounted = false
        try {
          alreadyCounted = window.localStorage.getItem(shownKey) === '1'
          window.localStorage.setItem(shownKey, '1')
        } catch {
          // Sem localStorage o evento pode duplicar; melhor duplicar do que perder.
        }
        if (!alreadyCounted) {
          void trackEvent('trial_downgrade_modal_shown', {
            credits_granted: trial.creditsGranted ?? null,
            credits_used: trial.creditsUsedForDisplay ?? null,
            credits_remaining: typeof data.credits === 'number' ? data.credits : null,
            trial_cap: trial.cap ?? null,
          })
        }
      })
      .catch(() => {
        // Falha de rede não vira upsell: sem verdade do servidor, nada aparece.
      })

    return () => {
      cancelled = true
    }
  }, [dismissKey, shownKey])

  // ── Moeda ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetch('/api/geo', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) throw new Error('geo_lookup_failed')
        return (await r.json()) as { currency?: string; region?: string }
      })
      .then((data) => {
        if (cancelled) return
        setCurrency(data.currency === 'brl' || data.currency === 'inr' ? data.currency : 'usd')
        setRegion(coercePriceRegion(data.region))
      })
      .catch(() => {
        // O checkout resolve a moeda de novo no servidor, pelo header de IP:
        // um fallback para USD aqui muda o RÓTULO, nunca a cobrança.
        if (!cancelled) setCurrency('usd')
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const dismiss = useCallback(
    (how: 'backdrop' | 'escape' | 'stay_free') => {
      // Reporta ANTES de qualquer efeito: ação sem desfecho registrado é
      // instrumento cego, e a regra de morte desta tela corre sobre a AÇÃO.
      void trackEvent('trial_downgrade_modal_dismissed', { how })
      try {
        window.localStorage.setItem(dismissKey, '1')
      } catch {
        // Sem localStorage o modal reaparece na próxima navegação. Chato, não grave.
      }
      setOpen(false)
      try {
        returnFocusTo.current?.focus({ preventScroll: true })
      } catch {
        /* foco é cortesia, nunca pode derrubar a tela */
      }
    },
    [dismissKey],
  )

  // Captura do foco anterior em efeito com deps `[open]` APENAS: junto com
  // `dismiss` nas deps, o StrictMode roda o efeito duas vezes e na segunda o
  // `document.activeElement` já é o PRÓPRIO card — o dismiss devolveria o foco
  // a um nó que acabou de desmontar.
  useEffect(() => {
    if (!open) return
    returnFocusTo.current = (document.activeElement as HTMLElement) ?? null
    // preventScroll: o backdrop é `overflowY:auto` e focar sem isto pode
    // provocar um salto de rolagem no momento em que o modal abre.
    cardRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss('escape')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open) return null

  const introEligible = currency !== null && hasIntroOffer('basic', currency, region)
  const fullPrice = currency !== null ? formatCheckoutMoney(currency, getTierPrice('basic', currency, region)) : null
  const introPrice =
    currency !== null && introEligible
      ? formatCheckoutMoney(currency, getIntroPrice('basic', currency, region))
      : null
  const firstMonthCredits = introEligible ? INTRO_CREDITS.basic : TIER_CREDITS.basic
  // Vídeos AI que a concessão do trial realmente comprava. Derivado, nunca
  // redigitado: no dia em que o custo do motor mudar, esta frase acompanha.
  const trialVideos = SEEDANCE_COST > 0 ? Math.floor(granted / SEEDANCE_COST) : 0

  function goToCreator() {
    // O evento sai ANTES da navegação — depois do redirect do Stripe não existe
    // mais página para emitir nada.
    void trackEvent('trial_downgrade_modal_cta', {
      tier: 'basic',
      display_currency: currency ?? 'resolving',
      price_region: region,
      displayed_price_minor: currency ? getTierPrice('basic', currency, region) : null,
      displayed_intro_price_minor: currency && introEligible ? getIntroPrice('basic', currency, region) : null,
      credits_granted: granted,
      credits_used: used,
    })
    // `intro=1` é o mesmo link de TODAS as outras superfícies de Creator do
    // app. Omiti-lo faria esta tela ser a única a cobrar mais caro que as
    // outras pelo mesmo plano. Quem valida elegibilidade é o servidor.
    checkout.launch('basic', '/api/stripe/checkout?tier=basic&intro=1', {
      tier: 'basic',
      pricing_surface: 'trial_downgrade_modal',
    })
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss('backdrop')
      }}
      style={{
        position: 'fixed',
        inset: 0,
        // 999 e não 1000: o modal de upgrade do /generate usa 1000 e empate se
        // resolve por ordem no DOM, o que ninguém escolheu. Na prática o empate
        // é improvável (este backdrop cobre a tela inteira e intercepta o
        // clique que abriria o outro), mas 999 remove a ambiguidade de graça.
        // ⚠️ NÃO é o maior z-index do app e não pretende ser: CheckoutResumeBanner
        // (10050, montado no layout RAIZ) e SocialProofToast (9999) pintam por
        // cima — um usuário rebaixado com checkout abandonado vê o banner sobre
        // este modal. Registrado no relatório da sprint; não é regressão desta
        // mudança, mas é o próximo defeito visual desta tela.
        zIndex: 999,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        // flex-start + margin auto, NÃO alignItems:center: com `center` e
        // `overflowY:auto`, um viewport baixo (celular deitado) empurra o topo
        // do card para fora da área rolável e o título fica inalcançável.
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-downgrade-title"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 460,
          margin: 'auto',
          background: '#161618',
          border: '1px solid #2a2a2d',
          borderRadius: 18,
          padding: '26px 22px',
          color: '#f5f5f7',
          outline: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b' }}>
          Your trial ended
        </p>
        <h2 id="trial-downgrade-title" style={{ margin: '8px 0 6px', fontSize: 23, lineHeight: 1.2, fontWeight: 800 }}>
          You&apos;re back on the free plan
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, color: '#86868b' }}>
          {granted > 0
            ? `You used ${used} of the ${granted} credits that came with your trial.`
            : 'Your trial credits have expired.'}{' '}
          Here&apos;s what changed.
        </p>

        {/* Comparativo. Só afirmações verificáveis no código de hoje.
            minmax(0,1fr) para o grid não estourar em 320px. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
          <div style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 12, padding: '13px 12px' }}>
            <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e6e73' }}>
              During your trial
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 1.65, color: '#86868b' }}>
              <li>AI video engine unlocked</li>
              {granted > 0 && <li>{granted} credits included</li>}
              {trialVideos > 0 && <li>{trialVideos} AI videos included</li>}
            </ul>
          </div>
          <div style={{ background: '#1d1d1f', border: '1px solid #3a3a3d', borderRadius: 12, padding: '13px 12px' }}>
            <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5f5f7' }}>
              Free plan — now
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 1.65, color: '#86868b' }}>
              <li>AI video engine locked</li>
              {/* Saldo REAL, da mesma fonte do badge do topo (o cron revoga
                  `min(saldo, concedido − usado)`, então crédito de indicação e
                  crédito anterior ao trial SOBREVIVEM — "0 credits" era falso).
                  O "(Fast only)" não é enfeite: sem ele a linha implica que o
                  saldo compra o motor que a linha de cima diz estar trancado, e
                  ele não compra — AI exige conta paga, custe o que custar o
                  saldo. Omitido quando o número não é conhecido. */}
              {creditsNow !== null && <li>{creditsNow} credits left (Fast only)</li>}
              <li>{FREE_FAST_PREVIEW_LIMIT} Fast previews every 24h</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(90deg, rgba(41,151,255,0.16), rgba(41,151,255,0.05))',
            border: '1px solid rgba(41,151,255,0.45)',
            borderRadius: 12,
            padding: '14px 14px 16px',
            marginBottom: 14,
          }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800 }}>Continue on Creator</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#86868b' }}>
            {currency === null || fullPrice === null ? (
              // AFIRMAÇÃO SOBRE PREÇO NUNCA SAI INCONDICIONALMENTE: enquanto a
              // moeda não resolveu, não há número na tela.
              <span aria-hidden="true">&nbsp;</span>
            ) : introEligible && introPrice ? (
              <>
                <strong style={{ color: '#f5f5f7' }}>{introPrice}</strong> your first month, then {fullPrice}/month
                {' · '}
                {firstMonthCredits} credits now, {TIER_CREDITS.basic}/month after
                {' · '}
                {CURRENCY_DISPLAY[currency].label}
              </>
            ) : (
              <>
                <strong style={{ color: '#f5f5f7' }}>{fullPrice}</strong>/month
                {' · '}
                {TIER_CREDITS.basic} credits every month
                {' · '}
                {CURRENCY_DISPLAY[currency].label}
              </>
            )}
          </p>
        </div>

        {checkout.error && (
          <p role="alert" style={{ margin: '0 0 12px', fontSize: 13, color: '#ff8f8f' }}>
            {checkout.error}
          </p>
        )}

        <button
          type="button"
          onClick={goToCreator}
          disabled={checkout.pending !== null}
          style={{
            width: '100%',
            padding: '13px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#2997ff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
            opacity: checkout.pending !== null ? 0.6 : 1,
          }}
        >
          {checkout.pending !== null ? 'Opening checkout…' : 'Continue on Creator'}
        </button>

        {/* PEDIR SEM DEVOLVER É O DEFEITO: a tela que recusa algo devolve o
            caminho para o que a pessoa AINDA TEM. Sem este botão as únicas
            saídas seriam Escape e o clique no backdrop — que no celular, com o
            card ocupando quase toda a tela, é uma faixa de poucos pixels. */}
        <button
          type="button"
          onClick={() => dismiss('stay_free')}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '11px 16px',
            borderRadius: 12,
            border: '1px solid #2a2a2d',
            background: 'transparent',
            color: '#86868b',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Keep creating on the free plan
        </button>
        <p style={{ margin: '12px 0 0', fontSize: 11, lineHeight: 1.5, color: '#6e6e73', textAlign: 'center' }}>
          Cancel anytime. Your videos stay yours.
        </p>
      </div>
    </div>
  )
}
