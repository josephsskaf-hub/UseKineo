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
//   3. "Unlimited AI renders while credits lasted". FALSO: a quantidade
//      depende do grant e do custo Seedance de 60s. O número agora é derivado
//      das duas fontes canônicas, nunca redigitado.
//
// ⚠️ PREÇO: sempre de `lib/checkoutPricing`, por moeda resolvida em /api/geo,
// NUNCA um literal e NUNCA `lib/pricing.priceLabel` (que é USD fixo). Nenhum
// desconto novo aparece aqui: o COMEBACK50 existe SÓ nos e-mails D5/D10 e
// jamais em superfície pública.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackClosedEvent, trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { creditsPerReferenceVideo } from '@/lib/marketingPrice'
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
import { FreeTierCopy } from '@/components/FreeTierOfferProvider'
import {
  comparisonDeferralValue,
  TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION,
  TRIAL_DOWNGRADE_PLAN_COMPARE_HREF,
} from '@/lib/growth/trialDowngradePlanChoice'
import {
  createTrialDowngradeHumanViewDwellController,
  createTrialDowngradeHumanViewRecorder,
  createTrialDowngradeHumanViewRetryController,
  shouldDwellOnTrialDowngradeHumanView,
  TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS,
  TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO,
  TRIAL_DOWNGRADE_HUMAN_VIEW_RETRY_DELAY_MS,
} from '@/lib/growth/trialDowngradeHumanView'

// Dispensa por CONTA e por navegador. NÃO é o gate de elegibilidade — esse é
// do servidor; isto só evita que o modal reapareça a cada navegação.
//
// ⚠️ KINEO-MODAL-NAO-SE-AUTODESTROI-2026-08-21 — v1 → v2, e a razão é um
// número: 207 contas rebaixadas em 7 dias, 188 e-mails enviados, 3 voltaram.
// Este modal é a ÚNICA superfície do produto que fala com essa pessoa dentro
// do app, e ele foi visto UMA vez em 41 trials.
//
// A causa não era o gate do servidor: era esta chave. Na v1, QUALQUER dispensa
// — inclusive um clique fora do card ou um Escape sem intenção — gravava '1' e
// a oferta MORRIA PARA SEMPRE naquele navegador. Clicar fora de um modal é o
// gesto mais barato que existe numa tela; a v1 cobrava por ele o preço mais
// caro que existe no funil: o cliente nunca mais ver a oferta.
//
// A v2 separa INTENÇÃO de ACIDENTE, que é a distinção que a v1 não fazia:
//   · backdrop / Escape  → adia por ADIA_MS (a pessoa não disse não, ela só
//     não estava olhando para isso agora)
//   · "Keep creating on the free plan" → permanente. Ela LEU e escolheu; pedir
//     de novo depois disso é assédio, não conversão.
// A chave muda de nome (v1 → v2) de propósito: quem já foi silenciado por um
// clique acidental volta a ser alcançável uma vez.
const DISMISSED_PREFIX = 'kineo_trial_downgrade_dismissed_v2'
/** Adiamento do acidente. 20h e não 24: senão quem entra sempre no mesmo
 *  horário do dia nunca mais alcança a janela. */
const ADIA_MS = 20 * 60 * 60 * 1000
/** Teto de reaparições por acidente. Sem ele, "adiar" vira perseguir. */
const MAX_ADIAMENTOS = 3
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

const SEEDANCE_COST = creditsPerReferenceVideo('cinematic_ai')

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
  const primaryOfferCtaRef = useRef<HTMLButtonElement | null>(null)
  const humanViewStopRef = useRef<(() => void) | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  // ── Elegibilidade: só o servidor decide ────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // Short-circuit antes de gastar a request: quem dispensou DE PROPÓSITO não
    // custa nada e nunca mais é incomodado. Quem só clicou fora volta depois de
    // ADIA_MS, até MAX_ADIAMENTOS vezes.
    //
    // Formato da chave: 'perm' | '<timestampMs>:<contador>'. Valor legado '1'
    // (da v1) não existe aqui porque o prefixo mudou de nome — mas qualquer
    // coisa que não parseie é tratada como PERMANENTE, e isso é deliberado:
    // no caminho de dúvida, a escolha segura é calar, não insistir.
    try {
      const bruto = window.localStorage.getItem(dismissKey)
      if (bruto === 'perm') return
      if (bruto) {
        const [quandoStr, contaStr] = bruto.split(':')
        const quando = Number(quandoStr)
        const conta = Number(contaStr)
        if (!Number.isFinite(quando) || !Number.isFinite(conta)) return
        if (conta >= MAX_ADIAMENTOS) return
        if (Date.now() - quando < ADIA_MS) return
      }
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
        setCurrency('usd') // KINEO-USD-ONLY-2026-08-19
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
      humanViewStopRef.current?.()
      // Reporta ANTES de qualquer efeito: ação sem desfecho registrado é
      // instrumento cego, e a regra de morte desta tela corre sobre a AÇÃO.
      // Acidente adia; intenção encerra. Ver KINEO-MODAL-NAO-SE-AUTODESTROI.
      const intencional = how === 'stay_free'
      let adiamento = 0
      try {
        if (intencional) {
          window.localStorage.setItem(dismissKey, 'perm')
        } else {
          const anterior = window.localStorage.getItem(dismissKey)
          const conta = anterior ? Number(anterior.split(':')[1]) : 0
          adiamento = (Number.isFinite(conta) ? conta : 0) + 1
          window.localStorage.setItem(dismissKey, `${Date.now()}:${adiamento}`)
        }
      } catch {
        // Sem localStorage o modal reaparece na próxima navegação. Chato, não grave.
      }
      // O evento sai DEPOIS de gravar mas com o número já resolvido: sem
      // `adiamento` no payload não dá para separar "dispensou de vez" de
      // "clicou fora pela 3ª vez", que é exatamente a distinção que esta
      // mudança criou e que precisa ser medida para valer alguma coisa.
      void trackEvent('trial_downgrade_modal_dismissed', {
        how,
        intentional: intencional,
        deferral: intencional ? null : adiamento,
      })
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

  // `trial_downgrade_modal_shown` only proves a React mount. This event waits
  // until the USD price is resolved and the primary offer CTA itself occupies
  // >= 60% of its area for one continuous second in a visible tab. The marker
  // only becomes terminal after /api/events confirms persistence.
  useEffect(() => {
    if (!open || currency === null) return
    const target = primaryOfferCtaRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const lockManager = navigator.locks
    if (!lockManager) return

    let storage: Storage | null = null
    try {
      storage = window.localStorage
    } catch {
      // Without an account-scoped marker we cannot promise once-per-account.
    }
    if (!storage) return

    const recorder = createTrialDowngradeHumanViewRecorder({
      userKey,
      storage,
      withExclusiveClaim: (claimName, task) => lockManager.request(claimName, task),
      transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
    })
    if (recorder.wasSettled()) return

    let isIntersecting = false
    let intersectionRatio = 0
    let observer: IntersectionObserver | null = null

    const qualifies = () => shouldDwellOnTrialDowngradeHumanView({
      open,
      decisionReady: currency !== null,
      ctaActionable: !target.disabled,
      isIntersecting,
      intersectionRatio,
      documentVisible: document.visibilityState === 'visible',
    })
    let dwell: ReturnType<typeof createTrialDowngradeHumanViewDwellController> | null = null
    const retry = createTrialDowngradeHumanViewRetryController({
      qualifies,
      onRetry: () => dwell?.rearm(),
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (timerId) => window.clearTimeout(timerId),
      retryDelayMs: TRIAL_DOWNGRADE_HUMAN_VIEW_RETRY_DELAY_MS,
    })
    const handleVisibility = () => {
      const documentVisible = document.visibilityState === 'visible'
      dwell?.update({ documentVisible })
      retry.update()
    }
    const stop = () => {
      dwell?.stop()
      retry.stop()
      if (humanViewStopRef.current === stop) humanViewStopRef.current = null
      observer?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    dwell = createTrialDowngradeHumanViewDwellController({
      dwellMs: TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS,
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (timerId) => window.clearTimeout(timerId),
      onDwell: () => {
        if (!qualifies()) return
        void recorder.recordOnce().then((result) => {
          if (!dwell?.canContinue()) return
          if (result === 'not_stored') {
            retry.request()
            return
          }
          stop()
        })
      },
    })

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      isIntersecting = Boolean(entry?.isIntersecting)
      intersectionRatio = entry?.intersectionRatio ?? 0
      dwell?.update({ ctaActionable: !target.disabled, isIntersecting, intersectionRatio })
      retry.update()
    }, { threshold: [TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO] })

    dwell.update({
      open,
      decisionReady: currency !== null,
      ctaActionable: !target.disabled,
      documentVisible: document.visibilityState === 'visible',
    })
    humanViewStopRef.current = stop
    observer.observe(target)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => stop()
  }, [open, userKey, currency])

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
  // Filmes de IA que a mensalidade do Creator compra. Mesma derivação do
  // `trialVideos` acima — uma só fonte para "quantos vídeos isto dá".
  const filmesPorMes = SEEDANCE_COST > 0 ? Math.floor(TIER_CREDITS.basic / SEEDANCE_COST) : 0

  function goToCreator() {
    humanViewStopRef.current?.()
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

  function comparePlans() {
    humanViewStopRef.current?.()
    // A person who opens the plan grid did not reject the offer. Give the
    // comparison room to work without reopening this modal on the next
    // dashboard navigation, but do not store the permanent `stay_free` choice.
    try {
      const current = window.localStorage.getItem(dismissKey)
      window.localStorage.setItem(
        dismissKey,
        comparisonDeferralValue(current, Date.now(), MAX_ADIAMENTOS),
      )
    } catch {
      // Storage availability never blocks a deliberate pricing navigation.
    }
    void trackEvent('trial_downgrade_compare_plans_clicked', {
      version: TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION,
      source: 'trial_downgrade_modal',
      destination: 'pricing_plans',
      primary_tier: 'basic',
    })
    setOpen(false)
    window.location.assign(TRIAL_DOWNGRADE_PLAN_COMPARE_HREF)
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss('backdrop')
      }}
      style={{
        position: 'fixed',
        inset: 0,
        // ⚠️ KINEO-MODAL-NAO-SE-AUTODESTROI-2026-08-21 — 999 → 10060, cobrando
        // a dívida que a versão anterior registrou e deixou de pé.
        // Em 999 este modal perdia para o CheckoutResumeBanner (10050, montado
        // no layout RAIZ) e para o SocialProofToast (9999). Quem isso atingia
        // não era um usuário qualquer: é PRECISAMENTE a pessoa rebaixada QUE JÁ
        // TENTOU PAGAR — a de maior intenção de compra do banco inteiro — vendo
        // um banner pintar por cima da única tela que lhe oferece o plano.
        // 10060 é o novo topo do app; se algo precisar subir acima disto no
        // futuro, é decisão consciente, não empate por ordem no DOM.
        zIndex: 10060,
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
      {/* ═══ KINEO-MODAL-VITRINE-2026-08-22 — casca nova aprovada em preview
          pelo fundador (880px, cantos 10, duas colunas: comparativo à
          esquerda, decisão à direita). Toda a lógica — gate do servidor,
          dispensa v2 acidente-vs-intenção, telemetria, moeda — intacta. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-downgrade-title"
        tabIndex={-1}
        className="grid md:grid-cols-[1fr_1.15fr]"
        style={{
          width: '100%',
          maxWidth: 880,
          margin: 'auto',
          background: '#131316',
          border: '1px solid #2a2a2d',
          borderRadius: 10,
          overflow: 'hidden',
          color: '#f5f5f7',
          outline: 'none',
        }}
      >
        {/* ── Coluna de prova: o que mudou na conta ─────────────────────── */}
        <div className="hidden md:flex flex-col gap-3" style={{ background: '#0d0d10', borderRight: '1px solid #2a2a2d', padding: 22 }}>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16 / 10', background: '#111', border: '1px solid #2a2a2d' }}>
            {/* Clipe da curadoria (mesma da home) — não o vídeo da pessoa: o
                modal não tem a URL dele sem mais uma chamada, e um clipe
                premium aqui mostra exatamente o que ela perde. */}
            <video src="/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4" autoPlay muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.72)', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}>VEO 3.1</span>
            <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.9)' }}>Made with the engines your trial unlocked</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f5f5f7' }}>What changed on your account:</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              <tr><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', color: '#6e6e73' }}>AI engines (Seedance, Kling…)</td><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', textAlign: 'right', fontWeight: 800, color: '#ff6b6b' }}>locked</td></tr>
              <tr><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', color: '#6e6e73' }}>Clean download</td><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', textAlign: 'right', fontWeight: 800, color: '#ff6b6b' }}>watermarked</td></tr>
              <tr><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', color: '#a8a8ad' }}>Your finished videos</td><td style={{ padding: '8px 4px', borderBottom: '1px solid #232326', textAlign: 'right', fontWeight: 800, color: '#4ade80' }}>still yours</td></tr>
              {/* Saldo REAL da mesma fonte do badge do topo — "0 credits" era
                  falso para quem tinha crédito de indicação (lição da v1). */}
              {creditsNow !== null && (
                <tr><td style={{ padding: '8px 4px', color: '#a8a8ad' }}>Credits left (Fast only)</td><td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 800 }}>{creditsNow}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* ── Coluna de decisão ──────────────────────────────────────────── */}
        <div style={{ padding: '26px 26px 22px' }}>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5cb3ff' }}>
          Your trial ended
        </p>
        <h2 id="trial-downgrade-title" style={{ margin: '10px 0 8px', fontSize: 26, lineHeight: 1.12, fontWeight: 900, letterSpacing: '-0.02em' }}>
          You made real films.<br />Don&apos;t stop now.
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: '#86868b' }}>
          {granted > 0
            ? `You used ${used} of the ${granted} trial credits. `
            : ''}
          Creator brings back everything the trial unlocked — every month, not just once.
          {' '}<FreeTierCopy legacy={`Free plan: ${FREE_FAST_PREVIEW_LIMIT} Fast previews every 24h.`} on="The free plan keeps 1 Fast video per month." />
        </p>

        {/* Grid de números — todos DERIVADOS (TIER_CREDITS × creditCostFor),
            nunca redigitados: a lição das três frases falsas da v1. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
          <div style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 8, padding: '12px 13px' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{TIER_CREDITS.basic} cr/mo</div>
            <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3, lineHeight: 1.45 }}>≈ {filmesPorMes} AI films every month</div>
          </div>
          <div style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 8, padding: '12px 13px' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {currency !== null && filmesPorMes > 0
                ? formatCheckoutMoney(currency, Math.round(getTierPrice('basic', currency, region) / filmesPorMes))
                : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3, lineHeight: 1.45 }}>per finished film (editors: $30+)</div>
          </div>
          <div style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 8, padding: '12px 13px' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>No mark</div>
            <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3, lineHeight: 1.45 }}>clean downloads, truly yours</div>
          </div>
          <div style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 8, padding: '12px 13px' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{trialVideos > 0 ? `${trialVideos}×` : 'AI'}</div>
            <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3, lineHeight: 1.45 }}>{trialVideos > 0 ? 'what your whole trial bought — now monthly' : 'engines back on, every month'}</div>
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
          {/* ⚠️ KINEO-ANCORA-POR-VIDEO-2026-08-21 — "$15/mês por 90 créditos"
              exige que a pessoa faça DUAS divisões de cabeça para saber o que
              está comprando, e ninguém faz conta na tela que pede cartão. Esta
              linha faz a conta por ela, na unidade em que ela pensa: FILME.
              O número é DERIVADO de TIER_CREDITS × creditCostFor — no dia em
              que o custo do motor mudar, a frase acompanha sozinha, que é
              exatamente o que não aconteceu com a copy do "first month" que
              sobreviveu meses ao fim do desconto. */}
          {currency !== null && filmesPorMes > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: '#8ec5ff' }}>
              ≈ {formatCheckoutMoney(currency, Math.round(getTierPrice('basic', currency, region) / filmesPorMes))} per AI film
              {' · '}
              {filmesPorMes} AI films a month
            </p>
          )}
        </div>

        {checkout.error && (
          <p role="alert" style={{ margin: '0 0 12px', fontSize: 13, color: '#ff8f8f' }}>
            {checkout.error}
          </p>
        )}

        <button
          ref={primaryOfferCtaRef}
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

        <button
          type="button"
          onClick={comparePlans}
          disabled={checkout.pending !== null}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            color: '#7cc0ff',
            fontSize: 13,
            fontWeight: 800,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Compare all plans →
        </button>
        <p style={{ margin: '-2px 0 0', fontSize: 11, lineHeight: 1.45, color: '#6e6e73', textAlign: 'center' }}>
          See monthly credits and included engines before you decide.
        </p>

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
        </div>{/* fim da coluna de decisão (KINEO-MODAL-VITRINE) */}
      </div>
    </div>
  )
}
