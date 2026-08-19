'use client'

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — one shared launcher for every button that
// can send a buyer to Stripe.
//
// Motivo: a produção mostrou 7 sessões Stripe criadas em 2,8 s pelo MESMO
// usuário (events: 7× starter_pack_checkout_clicked entre 04:07:41 e 04:07:44)
// porque o botão não tinha estado de "pending", não tinha trava de clique e
// nunca mostrava erro. O usuário clicava de novo porque nada acontecia.
//
// Every checkout surface must use `useCheckoutLaunch()` so that:
//   1. one click = at most one navigation (ref latch, survives a remount);
//   2. the button always shows an immediate pending state;
//   3. a redirect that never happens surfaces an inline English error instead
//      of silence;
//   4. every checkout event carries the same session_id the server-side
//      `checkout_attempted` uses (trackEvent → kineo_event_session_id).
//
// NOTE: the event is `checkout_cta_clicked`, NOT `checkout_click` — the latter
// is already taken by lib/trackClick.ts, which writes to public.click_events.
//
// ─────────────────────────────────────────────────────────────────────────────
// KINEO-CHECKOUT-REDIRECT-2026-08-08 — POR QUE O WATCHDOG DEIXOU DE SER SÓ
// TELEMETRIA.
//
// Em 07/08 perdemos a venda mais cara da semana num redirect. O rastro do
// banco é inequívoco (user e934461f…, África do Sul, trial ativo, 11/40
// créditos já gastos — alguém que USOU o produto e decidiu pagar):
//
//   19:27:10.456  checkout_cta_clicked      (basic, generate_step_1)
//   19:27:10.614  checkout_attempted        (servidor recebeu em 158 ms)
//   19:27:12.017  checkout_started          cs_live_b16buI2… ← SESSÃO CRIADA
//   19:27:25.983  checkout_redirect_timeout waited_ms 15000
//
// O servidor fez tudo certo em 1,5 s e devolveu o 307 para checkout.stripe.com.
// O navegador RECEBEU esse 307 — sabemos porque o Set-Cookie que vem junto
// (kineo_checkout_session) foi gravado: 30 s depois o resume banner resolveu
// `destination_kind: open_session` a partir dele. O que nunca terminou foi o
// ÚLTIMO salto, navegador → checkout.stripe.com. `pagehide` nunca disparou, o
// documento nunca saiu de /generate, e o cliente ficou 15 s olhando um botão
// escrito "Loading…".
//
// E aí vem o erro de desenho que custou o dinheiro: aos 15 s o watchdog
// registrava um evento e escrevia "tente de novo". Um timeout que só vira
// telemetria é uma venda perdida em silêncio — a sessão do Stripe JÁ EXISTIA,
// paga e pronta, e a tela não tinha um único link para ela. O cliente foi
// embora e não voltou.
//
// O que muda aqui:
//   • aos 6 s (RESUME_PROBE_MS) perguntamos ao /api/stripe/checkout/resume qual
//     é a URL VIVA da sessão que acabou de ser criada. Esse endpoint é
//     read-only, valida a posse (session.metadata.supabase_user_id === user) e
//     NÃO cunha sessão nova — então sondar é de graça e nunca duplica cobrança;
//   • aos 15 s, além do evento, publicamos um fallback num store de módulo que
//     o <CheckoutStalledCta/> (montado UMA vez no layout) renderiza como uma
//     ÂNCORA DE VERDADE — <a href="https://checkout.stripe.com/…">. Sem JS de
//     navegação, sem promessa que pode não resolver, sem script de terceiro,
//     um salto só, e o clique é um gesto direto do usuário (o que também
//     resolve o bloqueio de navegação de Safari/iOS quando o gesto original já
//     "expirou" depois de um await).
//
// O store é de módulo, e não um prop, DE PROPÓSITO: existem 15 superfícies de
// checkout neste repo. Passar o fallback componente a componente garantiria que
// alguma ficasse de fora — e a que ficasse de fora seria exatamente a que
// perderia a próxima venda.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

// A full-page navigation to /api/stripe/checkout keeps this page alive while
// the server talks to Stripe (typically < 3 s). 15 s means something is wrong.
const REDIRECT_WATCHDOG_MS = 15_000

// Deliberately BEFORE the watchdog: quando os 15 s chegam, a URL de resgate já
// tem que estar na mão, senão o cliente ainda espera um fetch para ver o botão.
// 6 s é folgado para o servidor (que resolveu em 1,5 s no incidente) e curto o
// bastante para caber dentro da janela de paciência.
const RESUME_PROBE_MS = 6_000

// KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — UMA SONDA SÓ ERA UMA CORRIDA, E ELA
// PERDEU NA PRIMEIRA OPORTUNIDADE REAL.
//
// 08/08 22:11:50.807Z, usuário b61881d5: primeiro clique da história na caixa de
// oferta do trial. `checkout_started` (evento de SERVIDOR, já com o
// `cs_live_…`) só saiu às 22:11:54.802 — **4,0 s depois do clique**. O cookie
// `kineo_checkout_session`, que é o único insumo do /resume, é escrito pelo
// Set-Cookie que viaja no 307 — ou seja, ele só existe DEPOIS disso, e ainda
// tem que atravessar a mesma rede que naquele instante já estava falhando em
// completar a navegação. A sonda única disparou aos 6,0 s, com ~1 s de folga,
// e voltou sem resgate. Resultado medido: `checkout_redirect_timeout` com
// `fallback_kind: 'idempotent_retry'` e `checkout_fallback_shown` com
// `'server_retry'` — o botão de resgate ofereceu **a mesma rota que acabara de
// travar**. Não foi clicado.
//
// Sondar de novo é seguro por construção: o GET sem `go=1` é read-only —
// recarrega a sessão na Stripe e responde JSON. Ele NÃO cunha sessão (só o
// `?go=1` redireciona), então N tentativas não podem cobrar duas vezes.
//
// As três tentativas cabem inteiras antes do watchdog de 15 s. A primeira
// continua sendo `RESUME_PROBE_MS` — a mudança é acrescentar tentativas, não
// adiar a primeira. O cronograma PARA no primeiro sucesso, inclusive quando ele
// é não-direto; quem promove um resgate fraco a `stripe_direct` depois disso é a
// sonda de upgrade, não este cronograma.
const RESUME_PROBE_SCHEDULE_MS = [RESUME_PROBE_MS, 10_000, 13_500] as const

// Última tentativa, DEPOIS do card já estar na tela com um link degradado. A
// pessoa ainda está lendo; trocar `server_retry` por `stripe_direct` embaixo do
// cursor dela é a diferença entre um salto e uma repetição do erro.
const RESUME_UPGRADE_PROBE_MS = 5_000

export type CheckoutFailureStage = 'click' | 'redirect' | 'session' | 'resume'

export const CHECKOUT_RETRY_MESSAGE =
  'We could not open the secure checkout. Check your connection and try again — you have not been charged.'

// KINEO-CHECKOUT-REDIRECT-2026-08-08 — quando EXISTE link de resgate a mensagem
// não pode ser "tente de novo": a sessão já está criada e o próximo passo é
// clicar no botão, não repetir o fluxo.
// KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — a sonda tardia pode descobrir, com o
// card já na tela, que este comprador JÁ assina. Aí o card sai — mas alguma
// palavra tem que ficar no lugar dele.
export const CHECKOUT_ALREADY_SUBSCRIBED_MESSAGE =
  'You already have an active plan — nothing was charged. Open Account to manage your subscription.'

export const CHECKOUT_STALLED_MESSAGE =
  'Your secure checkout is ready, but your browser did not open it. Use the "Continue to payment" button — you have not been charged.'

// ─── Stalled-checkout store ─────────────────────────────────────────────────
// Um único fallback por vez, por construção: um comprador só pode estar preso
// em um checkout. O último a travar vence.

/**
 * KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — vocabulário ÚNICO do tipo de link.
 *
 * Havia três: o componente dizia `server_retry`, o watchdog dizia
 * `resume_endpoint` OU `idempotent_retry`, e o evento de upgrade dizia um
 * terceiro conjunto. `server_retry` nunca é igual a `resume_endpoint`, então
 * qualquer join entre impressão e clique dava ZERO — e a pergunta que este
 * trabalho existe para responder é exatamente "o link direto converte melhor?".
 * Pior: `direct: boolean` não distinguia `resume_endpoint` (2 saltos, mas para
 * uma sessão VIVA) de `idempotent_retry` (a mesma rota que acabou de travar), e
 * esses dois se comportam de forma OPOSTA no incidente.
 */
export type StalledCheckoutKind = 'stripe_direct' | 'resume_endpoint' | 'idempotent_retry'

export type StalledCheckout = {
  /** Real, navigable URL. Stripe-hosted when we could resolve the live session. */
  url: string
  /** True when `url` points straight at checkout.stripe.com (one hop, no server). */
  direct: boolean
  /** Vocabulário único, compartilhado por impressão, clique e upgrade. */
  kind: StalledCheckoutKind
  surface: string
  selection: string
  planLabel: string | null
  priceLabel: string | null
  metadata: Record<string, unknown>
}

let stalledCheckout: StalledCheckout | null = null
const stalledListeners = new Set<() => void>()

function publishStalledCheckout(next: StalledCheckout | null): void {
  if (stalledCheckout === next) return
  stalledCheckout = next
  for (const listener of stalledListeners) {
    try {
      listener()
    } catch {
      // A broken subscriber must never take the recovery CTA down with it.
    }
  }
}

export function getStalledCheckout(): StalledCheckout | null {
  return stalledCheckout
}

export function subscribeStalledCheckout(listener: () => void): () => void {
  stalledListeners.add(listener)
  return () => {
    stalledListeners.delete(listener)
  }
}

export function clearStalledCheckout(): void {
  publishStalledCheckout(null)
}

/**
 * KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — troca a URL do card que JÁ está na
 * tela por uma melhor (tipicamente `server_retry` → `stripe_direct`), sem
 * derrubar e remontar o card.
 *
 * Só age quando (a) existe card publicado, (b) ele é da MESMA superfície e
 * seleção e (c) a URL nova é de fato diferente e não é um rebaixamento.
 *
 * ⚠️ Estas checagens NÃO são o que impede um resgate atrasado de um clique
 * anterior de sequestrar o card atual: dois cliques no MESMO tier e na MESMA
 * superfície produzem `surface`/`selection` idênticos. Quem garante isso é a
 * comparação de `probeGenRef` no chamador. Um refator que confie neste bloco e
 * remova a checagem de geração reintroduz o bug de plano errado.
 */
export function upgradeStalledCheckout(next: StalledCheckout): 'upgraded' | 'no_card' | 'other_click' | 'same_url' | 'would_downgrade' {
  const current = stalledCheckout
  // Devolve o MOTIVO, não um booleano: uma recusa muda aqui seria de novo um
  // caminho de fallback sem evento — três causas muito diferentes (o card já
  // sumiu / é de outro clique / seria um rebaixamento) colapsadas num silêncio.
  if (!current) return 'no_card'
  if (current.surface !== next.surface || current.selection !== next.selection) return 'other_click'
  if (current.url === next.url) return 'same_url'
  // Nunca REBAIXAR: se o card já tem o link direto da Stripe, uma sonda que
  // volte só com o `resumeUrl` não pode trocar um salto por dois.
  if (current.direct && !next.direct) return 'would_downgrade'
  publishStalledCheckout(next)
  return 'upgraded'
}

// Same house style as `generation_stage_error`: fire-and-forget, always inside
// try/catch, and the payload never carries an email, prompt, key or card data —
// only an error *name* and a short reason code.
export function trackCheckoutFailure(
  stage: CheckoutFailureStage,
  reason: string,
  metadata: Record<string, unknown> = {},
): void {
  try {
    void trackEvent('checkout_failure', {
      // KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — `...metadata` era o ÚLTIMO, e
      // isso não era teórico: `GenerateClient` passa `{ tier, intro, reason:
      // upgradeReason }`, então o motivo de UI ('credits'/'studio'/'trial_ended')
      // vinha sobrescrevendo o NOME DO ERRO na superfície de maior tráfego. O
      // evento que mede falha de checkout estava gravando outra coisa.
      ...metadata,
      stage,
      reason: String(reason || 'unknown').slice(0, 120),
    })
  } catch {
    // Telemetry must never break a purchase.
  }
}

type ResumeProbe = {
  available?: boolean
  reason?: string
  directUrl?: string | null
  resumeUrl?: string
  planName?: string
  currency?: string
  firstChargeAmount?: number
  // KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — o /resume SEMPRE devolveu `tier` e
  // `billing`, e este tipo não declarava NENHUM dos dois: o cliente nunca
  // conferiu qual produto, nem em que periodicidade, estava resgatando.
  // Ver `checkoutProductFromLaunchUrl` logo abaixo.
  tier?: string | null
  billing?: string | null
}

/**
 * KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — DEFEITO DE DINHEIRO ENCONTRADO NA
 * REVISÃO ADVERSARIAL, E ELE JÁ ESTAVA EM PRODUÇÃO ANTES DESTE COMMIT.
 *
 * `useCheckoutLaunch` não serve só a assinaturas: metade dos call sites compra
 * PACOTE AVULSO (`?pack=starter`, `?pack=autopilot_pilot`, `?pack=starter290`,
 * `?pack=<topup>`). Mas o /api/stripe/checkout/resume recusa qualquer sessão
 * que não seja assinatura (`session.mode !== 'subscription'` → null) e o cookie
 * `kineo_checkout_session` só é escrito no ramo de assinatura — ele sobrevive
 * 30 dias e ainda existe o fallback por `checkout_abandoned`.
 *
 * Logo: uma compra AVULSA que trave podia receber, como "resgate", o link de
 * uma ASSINATURA abandonada semanas antes. O comprador clicava em um top-up de
 * uma vez e o card oferecia um plano recorrente, com outro preço na tela. O
 * cenário é comum justamente na coorte "abandonou o plano e depois comprou algo
 * pequeno".
 *
 * ⚠️ PRODUTO NÃO É PREÇO — e a SEGUNDA revisão adversarial pegou esta metade
 * faltando na correção da primeira. Conferir só o `tier` deixa passar a
 * divergência de PERIODICIDADE: uma sessão ANUAL abandonada
 * (`ANNUAL_PRICES.starter.usd = 9900`) tem o mesmo `tier: 'starter'` de um
 * clique MENSAL com intro (990, ou 490 com intro). Resgatar uma na outra levaria
 * o comprador a uma primeira cobrança de 10× a 20× a que o botão dele acabou de
 * prometer. `billing` também sempre veio do servidor e também nunca era lido —
 * o mesmo defeito um nível abaixo.
 *
 * Regra a partir daqui: só existe resgate quando o clique é de ASSINATURA e o
 * servidor devolve o MESMO tier E a MESMA periodicidade do clique.
 *
 * `tier`/`billing` nulos com `eligible: true` significam "o servidor é a
 * autoridade sobre qual produto é este".
 */
/**
 * União fechada de propósito: sem ela, `outcome` é `string` e um typo num valor
 * futuro passa pelo `tsc` e aparece só como um balde órfão no painel.
 */
type ProbeOutcome =
  | 'rescue_direct'
  | 'rescue_resume'
  | 'rescue_stale_ignored'
  | 'rejected_product'
  | 'unavailable'
  | 'http_error'
  | 'network_error'
  | 'aborted'
  | 'skipped_have_rescue'
  | 'skipped_blocked'

type LaunchProduct = { eligible: boolean; tier: string | null; billing: string | null }

const NOT_RESCUABLE: LaunchProduct = { eligible: false, tier: null, billing: null }

function checkoutProductFromLaunchUrl(url: string): LaunchProduct {
  try {
    const path = url.split('?')[0] ?? ''
    // O banner de recuperação lança a PRÓPRIA sessão a retomar. Ela é
    // assinatura por construção (o /resume recusa `mode !== 'subscription'`) e
    // o produto é, por definição, o mesmo. Exigir `?tier=` aqui desligaria o
    // resgate justamente na superfície do comprador que JÁ abandonou uma vez —
    // seria trocar um defeito por outro, que é o que a 1ª correção fez.
    if (path.endsWith('/api/stripe/checkout/resume')) {
      return { eligible: true, tier: null, billing: null }
    }
    const queryStart = url.indexOf('?')
    if (queryStart < 0) return NOT_RESCUABLE
    const params = new URLSearchParams(url.slice(queryStart + 1))
    // `pack` é compra de uma vez: nunca resgatável por este endpoint.
    if (params.get('pack')) return NOT_RESCUABLE
    const tier = params.get('tier')?.trim().toLowerCase()
    if (!tier) return NOT_RESCUABLE
    // O servidor trata qualquer coisa != 'annual' como mensal; espelhar essa
    // decisão em vez de inventar uma terceira.
    const billing = params.get('billing')?.trim().toLowerCase() === 'annual' ? 'annual' : 'monthly'
    return { eligible: true, tier, billing }
  } catch {
    return NOT_RESCUABLE
  }
}

function formatProbeMoney(amount: number, currency: string): string | null {
  if (!Number.isFinite(amount) || amount < 0 || !/^[a-z]{3}$/i.test(currency)) return null
  try {
    return new Intl.NumberFormat('en-US', { // KINEO-USD-ONLY-2026-08-19
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`
  }
}

export type CheckoutLaunch = {
  /** Selection key currently navigating to Stripe (tier or SKU), else null. */
  pending: string | null
  /** Inline, user-facing English error. Render it next to the buttons. */
  error: string | null
  setError: (message: string | null) => void
  /** Returns true when this call actually started the navigation. */
  launch: (key: string, url: string, metadata?: Record<string, unknown>) => boolean
  release: () => void
}

export function useCheckoutLaunch(surface: string): CheckoutLaunch {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Ref, not state: React has not painted the disabled button yet when a second
  // click arrives, and a remount would reset state but callers keep the hook.
  const lockedRef = useRef(false)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — eram uma sonda e um timer; agora
  // são até quatro (3 antes do watchdog + 1 de upgrade), então a limpeza tem
  // que varrer a lista inteira. Um timer esquecido aqui vira um card de
  // pagamento aparecendo em cima de um checkout que já deu certo.
  const probeTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  // Conjunto, não slot único: até 4 sondas podem se sobrepor numa rede lenta —
  // que é exatamente o cenário que este código cobre. Com um slot só, a sonda 2
  // órfãos a 1 e `clearWatchdog` deixava um fetch vivo depois de o comprador ter
  // saído da página.
  const probeAbortsRef = useRef<Set<AbortController>>(new Set())
  // Produto de ASSINATURA deste clique (tier + periodicidade), ou não-elegível
  // quando o clique é de pacote avulso. Ver `checkoutProductFromLaunchUrl`.
  const launchProductRef = useRef<LaunchProduct>(NOT_RESCUABLE)
  // Geração do clique. Uma sonda em voo de um clique ANTERIOR pode responder
  // depois de o comprador ter clicado em outro tier — e o resgate dela apontaria
  // para o plano errado. Comparar a geração no momento da resposta é mais barato
  // e mais seguro que tentar abortar em todos os caminhos.
  const probeGenRef = useRef(0)
  const launchStartedAtRef = useRef(0)
  // Resultado da sondagem, guardado em ref porque o watchdog é um setTimeout:
  // ele lê o valor no instante em que dispara, não no instante em que foi
  // agendado.
  const rescueRef = useRef<{ url: string; direct: boolean; planLabel: string | null; priceLabel: string | null } | null>(null)
  // 'blocked' = o resume disse que este comprador NÃO deve receber link nenhum
  // (já assinante). Oferecer um botão de pagar a quem já pagou é pior que não
  // oferecer nada.
  const rescueBlockedRef = useRef(false)

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
    if (probeTimersRef.current.length) {
      for (const timer of probeTimersRef.current) clearTimeout(timer)
      probeTimersRef.current = []
    }
    if (probeAbortsRef.current.size) {
      for (const controller of probeAbortsRef.current) {
        try {
          controller.abort()
        } catch {
          /* abortar nunca pode derrubar a limpeza das outras */
        }
      }
      probeAbortsRef.current.clear()
    }
    // Invalida qualquer resposta ainda em voo: `abort()` cobre o fetch que já
    // saiu, a geração cobre o `.then` que já estava agendado.
    probeGenRef.current += 1
  }, [])

  const release = useCallback(() => {
    lockedRef.current = false
    setPending(null)
    clearWatchdog()
  }, [clearWatchdog])

  useEffect(() => {
    // Back/forward cache: leaving Stripe restores this page WITH its refs, so
    // without this every plan button would stay disabled forever.
    // KINEO-CHECKOUT-REDIRECT-2026-08-08 — voltar do Stripe também tem que
    // apagar o CTA de resgate: um botão "continue para o pagamento" em cima de
    // um checkout que JÁ funcionou (ou que o comprador cancelou de propósito) é
    // ruído que destrói a confiança na tela inteira.
    const onPageShow = () => {
      clearStalledCheckout()
      release()
    }
    // The navigation actually happened — stop the "nothing happened" watchdog.
    const onPageHide = () => clearWatchdog()
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
      clearWatchdog()
    }
  }, [release, clearWatchdog])

  /**
   * KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — uma tentativa de sonda, com
   * telemetria própria.
   *
   * A versão anterior tinha TRÊS `return` mudos (resposta não-ok, `available:
   * false`, e o `catch`). Quando a sonda falhou de verdade pela primeira vez
   * (08/08 22:11Z) não deu para saber se o endpoint respondeu 401, se o cookie
   * ainda não existia (`none`), se a sessão já tinha morrido (`stale`) ou se o
   * fetch nem completou — o /resume distingue OITO motivos e nós gravávamos
   * zero. Regra da casa: todo caminho de fallback nasce com evento próprio.
   *
   * Devolve `true` só quando um resgate utilizável foi guardado em `rescueRef`.
   */
  const probeResume = useCallback(
    async (
      gen: number,
      attempt: number,
      phase: 'pre_timeout' | 'upgrade',
      selection: string,
      metadata: Record<string, unknown>,
    ): Promise<boolean> => {
      if (gen !== probeGenRef.current) return false
      if (rescueBlockedRef.current) return false

      const product = launchProductRef.current
      const startedAt = launchStartedAtRef.current
      const elapsedMs = startedAt ? Date.now() - startedAt : null
      const controller = new AbortController()
      probeAbortsRef.current.add(controller)

      let outcome: ProbeOutcome = 'network_error'
      let reason: string | null = null
      let got = false

      try {
        const response = await fetch('/api/stripe/checkout/resume', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) {
          outcome = 'http_error'
          reason = String(response.status)
        } else {
          const result = (await response.json()) as ResumeProbe
          if (gen !== probeGenRef.current) return false
          if (result?.available !== true) {
            outcome = 'unavailable'
            reason = typeof result?.reason === 'string' ? result.reason : null
            // Só 'already_subscribed' é motivo para NÃO oferecer link nenhum.
            // 'none' / 'stale' / 'dismissed' apenas significam que não há sessão
            // recuperável AINDA — e 'none' é exatamente o que uma sonda cedo
            // demais vê, que é o defeito que esta rodada existe para cobrir.
            if (reason === 'already_subscribed') rescueBlockedRef.current = true
          } else {
            const rescueUrl = typeof result.directUrl === 'string' && result.directUrl
              ? result.directUrl
              : typeof result.resumeUrl === 'string' && result.resumeUrl
                ? result.resumeUrl
                : null
            const resolvedTier = typeof result.tier === 'string' ? result.tier.trim().toLowerCase() : null
            const resolvedBilling = typeof result.billing === 'string' ? result.billing.trim().toLowerCase() : null
            if (!rescueUrl) {
              outcome = 'unavailable'
              reason = 'no_url'
            } else if (!product.eligible) {
              // Clique de PACOTE AVULSO. O /resume só conhece assinatura, então
              // aceitar este resgate trocaria o produto na cara do comprador.
              outcome = 'rejected_product'
              reason = 'not_subscription_click'
            } else if (product.tier && resolvedTier !== product.tier) {
              // Assinatura abandonada de OUTRO plano: produto errado.
              outcome = 'rejected_product'
              reason = `tier_mismatch:${resolvedTier ?? 'unknown'}`
            } else if (product.billing && resolvedBilling !== product.billing) {
              // Mesmo plano, periodicidade diferente: o PREÇO é outro, e pode
              // ser 10×–20× maior (anual $99 contra mensal $9,90 / intro $4,90).
              outcome = 'rejected_product'
              reason = `billing_mismatch:${resolvedBilling ?? 'unknown'}`
            } else {
              const direct = rescueUrl === result.directUrl
              // Duas sondas podem estar em voo ao mesmo tempo — é justamente na
              // rede lenta (o caso que este código existe para cobrir) que a
              // tentativa 1 responde DEPOIS da 2. Sem esta guarda, uma resposta
              // atrasada que só traz `resumeUrl` sobrescreveria um `directUrl`
              // já conquistado, e o card voltaria a ter dois saltos.
              if (rescueRef.current?.direct && !direct) {
                // NÃO é um `return`: um caminho mudo aqui reproduziria
                // exatamente o defeito que esta rodada veio consertar.
                outcome = 'rescue_stale_ignored'
                reason = 'kept_direct'
              } else {
                rescueRef.current = {
                  url: rescueUrl,
                  direct,
                  planLabel: typeof result.planName === 'string' ? result.planName : null,
                  priceLabel:
                    typeof result.firstChargeAmount === 'number' && typeof result.currency === 'string'
                      ? formatProbeMoney(result.firstChargeAmount, result.currency)
                      : null,
                }
                outcome = direct ? 'rescue_direct' : 'rescue_resume'
                got = true
              }
            }
          }
        }
      } catch (err) {
        outcome = (err as { name?: string } | null)?.name === 'AbortError' ? 'aborted' : 'network_error'
      } finally {
        probeAbortsRef.current.delete(controller)
      }

      // Sonda abortada é cancelamento nosso (o comprador saiu ou clicou de
      // novo), não sintoma — registrá-la só inflaria o denominador.
      //
      // A conferência de geração vale para TODOS os desfechos, não só para o de
      // sucesso: com ela só no caminho feliz, uma sonda órfã que voltasse 401 ou
      // falhasse de rede AINDA entraria no histograma — e o dataset que este
      // commit existe para criar nasceria enviesado para falha, com o
      // `selection` do clique ANTERIOR.
      if (outcome !== 'aborted' && gen === probeGenRef.current) {
        try {
          void trackEvent('checkout_resume_probe', {
            // `metadata` vem PRIMEIRO de propósito: ele carrega chaves do call
            // site e uma delas é literalmente `reason` (GenerateClient passa o
            // motivo do modal de upgrade). Espalhado por último, ele
            // sobrescreveria o diagnóstico da sonda com uma string de UI, na
            // superfície de maior tráfego.
            ...metadata,
            surface,
            selection,
            attempt,
            phase,
            outcome,
            reason,
            elapsed_ms: elapsedMs,
            launch_tier: product.tier,
            launch_billing: product.billing,
          })
        } catch {
          /* a recuperação nunca pode quebrar por causa de telemetria */
        }
      }

      return got
    },
    [surface],
  )

  const launch = useCallback(
    (key: string, url: string, metadata: Record<string, unknown> = {}): boolean => {
      if (lockedRef.current) {
        // Recording the suppressed click is how we prove the guard is working
        // instead of guessing from Stripe session counts.
        try {
          void trackEvent('checkout_cta_suppressed', { surface, selection: key, ...metadata })
        } catch {
          /* never block */
        }
        return false
      }
      lockedRef.current = true
      setPending(key)
      setError(null)
      // Um novo clique invalida qualquer resgate anterior: a URL antiga pode
      // apontar para outro tier.
      rescueRef.current = null
      rescueBlockedRef.current = false
      clearStalledCheckout()
      try {
        void trackEvent('checkout_cta_clicked', { surface, selection: key, ...metadata })
      } catch {
        /* never block */
      }

      clearWatchdog()

      // ── Sondas de resgate (read-only, não cunham sessão) ────────────────────
      // `clearWatchdog()` acabou de incrementar a geração; capturar DEPOIS dele
      // é o que amarra estas sondas a ESTE clique.
      const gen = probeGenRef.current
      launchStartedAtRef.current = Date.now()
      // Só cliques de ASSINATURA são resgatáveis por este endpoint. Para pacote
      // avulso não sondamos nada: o fallback continua sendo a URL do clique, que
      // é do produto certo e idempotente por 5 min no servidor.
      const product = checkoutProductFromLaunchUrl(url)
      launchProductRef.current = product
      const skipProbe = (attempt: number, outcome: ProbeOutcome, reason: string) => {
        try {
          void trackEvent('checkout_resume_probe', {
            ...metadata,
            surface,
            selection: key,
            attempt,
            phase: 'pre_timeout',
            outcome,
            reason,
            elapsed_ms: Date.now() - launchStartedAtRef.current,
            launch_tier: product.tier,
            launch_billing: product.billing,
          })
        } catch {
          /* never block */
        }
      }
      probeTimersRef.current = !product.eligible
        ? []
        : RESUME_PROBE_SCHEDULE_MS.map((delay, index) =>
            setTimeout(() => {
              if (gen !== probeGenRef.current) return
              // As duas saídas abaixo registram: `attempt` sem denominador faz
              // "tentativa 2 pulada" virar indistinguível de "tentativa 2 nunca
              // agendada", e foi por isto que a 1ª correção passou.
              if (rescueBlockedRef.current) {
                skipProbe(index + 1, 'skipped_blocked', 'already_subscribed')
                return
              }
              if (rescueRef.current) {
                skipProbe(
                  index + 1,
                  'skipped_have_rescue',
                  rescueRef.current.direct ? 'have_direct' : 'have_resume',
                )
                return
              }
              void probeResume(gen, index + 1, 'pre_timeout', key, metadata)
            }, delay),
          )

      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null
        lockedRef.current = false
        setPending(null)

        // KINEO-CHECKOUT-REDIRECT-2026-08-08 — AQUI ESTAVA A VENDA PERDIDA.
        // Antes: só `setError(...)` + um evento. Agora a tela ganha um link
        // real. `rescueRef` tem a URL viva da sessão quando a sonda respondeu;
        // senão caímos na própria URL do clique, que o servidor colapsa na
        // MESMA sessão Stripe por 5 minutos (checkoutIdempotencyKeyFor /
        // oneTimeIdempotencyKey), então o botão não pode cobrar duas vezes.
        const rescue = rescueRef.current
        const fallbackUrl = rescue?.url ?? (rescueBlockedRef.current ? null : url)
        // Três estados, não dois: link direto da Stripe · rota de resume para
        // uma sessão VIVA · repetição idempotente da rota que travou. O último é
        // o caso degradado que o incidente de 08/08 produziu.
        const fallbackKind: StalledCheckoutKind = rescue
          ? (rescue.direct ? 'stripe_direct' : 'resume_endpoint')
          : 'idempotent_retry'
        if (fallbackUrl) {
          publishStalledCheckout({
            url: fallbackUrl,
            direct: rescue?.direct ?? false,
            kind: fallbackKind,
            surface,
            selection: key,
            planLabel: rescue?.planLabel ?? null,
            priceLabel: rescue?.priceLabel ?? null,
            metadata,
          })
          setError(CHECKOUT_STALLED_MESSAGE)

          // KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — o card subiu com o link
          // DEGRADADO (a própria rota que acabou de travar). Uma última sonda,
          // agora com a folga que faltava, pode trocá-lo pelo link direto da
          // Stripe enquanto o comprador ainda lê o card. Sem isto, o único caso
          // real medido até hoje oferece a repetição do erro e nada mais.
          if (product.eligible && !rescue?.direct) {
            probeTimersRef.current.push(
              setTimeout(() => {
                if (gen !== probeGenRef.current) return
                void probeResume(
                  gen,
                  RESUME_PROBE_SCHEDULE_MS.length + 1,
                  'upgrade',
                  key,
                  metadata,
                )
                  .then((got) => {
                    if (gen !== probeGenRef.current) return

                    // Esta sonda roda com o card JÁ na tela. Se ela descobrir
                    // agora que o comprador já assina, deixar o botão "Continue
                    // to payment" ali seria pedir dinheiro a quem já paga — o
                    // exato princípio que `rescueBlockedRef` existe para
                    // defender, e que só o caminho pré-card respeitava.
                    if (rescueBlockedRef.current) {
                      clearStalledCheckout()
                      // NÃO `setError(null)`: apagar o card e a mensagem juntos
                      // deixaria o comprador 20 s depois com a tela limpa, o
                      // botão já re-habilitado e nenhuma explicação — e ele
                      // clicaria de novo, sendo que já assina.
                      setError(CHECKOUT_ALREADY_SUBSCRIBED_MESSAGE)
                      try {
                        void trackEvent('checkout_fallback_revoked', {
                          ...metadata,
                          surface,
                          selection: key,
                          reason: 'already_subscribed',
                        })
                      } catch {
                        /* never block */
                      }
                      return
                    }

                    if (!got) return
                    const upgraded = rescueRef.current
                    if (!upgraded) return
                    const upgradedKind: StalledCheckoutKind = upgraded.direct ? 'stripe_direct' : 'resume_endpoint'
                    const result = upgradeStalledCheckout({
                      url: upgraded.url,
                      direct: upgraded.direct,
                      kind: upgradedKind,
                      surface,
                      selection: key,
                      planLabel: upgraded.planLabel,
                      priceLabel: upgraded.priceLabel,
                      metadata,
                    })
                    try {
                      void trackEvent(
                        result === 'upgraded' ? 'checkout_fallback_upgraded' : 'checkout_fallback_upgrade_skipped',
                        {
                          ...metadata,
                          surface,
                          selection: key,
                          fallback_kind: upgradedKind,
                          reason: result,
                        },
                      )
                    } catch {
                      /* never block */
                    }
                  })
                  .catch(() => {
                    // `probeResume` não rejeita hoje (tudo está em try/catch),
                    // mas uma promise sem catch no caminho do dinheiro é uma
                    // unhandled rejection esperando uma edição futura.
                  })
              }, RESUME_UPGRADE_PROBE_MS),
            )
          }
        } else {
          setError(CHECKOUT_RETRY_MESSAGE)
        }

        try {
          void trackEvent('checkout_redirect_timeout', {
            // `...metadata` primeiro: os campos de diagnóstico abaixo são a
            // razão de este evento existir e não podem ser sobrescritos por uma
            // chave de mesmo nome vinda do call site.
            ...metadata,
            surface,
            selection: key,
            waited_ms: REDIRECT_WATCHDOG_MS,
            // Sem isto não dá para responder a única pergunta que importa
            // depois de shipar: o botão de resgate apareceu, e era o link
            // direto do Stripe ou o retry idempotente?
            fallback_offered: Boolean(fallbackUrl),
            fallback_kind: rescue ? (rescue.direct ? 'stripe_direct' : 'resume_endpoint') : fallbackUrl ? 'idempotent_retry' : 'none',
            probe_eligible: product.eligible,
          })
        } catch {
          /* never block */
        }
      }, REDIRECT_WATCHDOG_MS)

      try {
        window.location.href = url
        return true
      } catch (err) {
        release()
        setError(CHECKOUT_RETRY_MESSAGE)
        trackCheckoutFailure(
          'redirect',
          err instanceof Error ? err.name : 'navigation_threw',
          { surface, selection: key, ...metadata },
        )
        return false
      }
    },
    [surface, clearWatchdog, release, probeResume],
  )

  return { pending, error, setError, launch, release }
}

/**
 * KINEO-CHECKOUT-REDIRECT-2026-08-08 — subscription helper for the single
 * <CheckoutStalledCta/> mounted in the root layout.
 */
export function useStalledCheckout(): StalledCheckout | null {
  const [snapshot, setSnapshot] = useState<StalledCheckout | null>(null)

  useEffect(() => {
    setSnapshot(getStalledCheckout())
    return subscribeStalledCheckout(() => setSnapshot(getStalledCheckout()))
  }, [])

  return snapshot
}
