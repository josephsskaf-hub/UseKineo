'use client'

// KINEO-TRIAL-ENTRY-VISIBILITY-2026-08-08 — A SUPERFÍCIE QUE FALTAVA: O TRIAL
// NUNCA FOI DITO A NINGUÉM.
//
// O QUE FOI MEDIDO (produção, 08/08 19:0xZ, 36 trials, contas internas fora):
// listei TODOS os nomes de evento que as 36 pessoas em trial geraram na vida.
// As únicas três superfícies que mencionam o trial em algum lugar são:
//
//   · `trial_credits_granted`        36 pessoas — evento de SERVIDOR, invisível.
//   · `trial_post_video_offer_viewed` 13 pessoas — existe desde HOJE 10:20Z, e
//                                     só aparece DEPOIS do vídeo pronto.
//   · `trial_lifecycle_email_sent`     9 pessoas — primeiro disparo da história
//                                     hoje 16:30Z.
//
// Não existe `trial_welcome_*`, não existe `trial_banner_*`, não existe
// contagem de prazo em lugar nenhum: um grep por `'trial_` em todo o `.tsx`
// devolve exatamente dois eventos de interface, os do modal de downgrade (que
// só roda DEPOIS de perder o acesso) e os da caixa pós-vídeo. E
// `viral_onboarding_viewed` — o onboarding que 35 das 36 pessoas atravessaram —
// não diz uma palavra sobre Creator, 40 créditos ou prazo.
//
// Ou seja: a pessoa se cadastra, recebe 40 créditos de Creator e um relógio de
// 3 dias EM SILÊNCIO, usa o produto achando que está no plano grátis, e a
// primeira vez que o app menciona o trial é quando pede o cartão.
//
// POR QUE ISSO EXPLICA 0 CONVERSÕES EM 36 TRIALS melhor que a copy da caixa:
// um reverse trial converte por AVERSÃO À PERDA. Não se teme perder o que nunca
// se soube que tinha. As duas pontas do funil estão medidas e nenhuma delas é
// "a oferta não foi vista": 13 das 16 pessoas elegíveis pós-deploy VIRAM a
// caixa (81% de cobertura) e clicaram 0 vezes em 25 impressões. A oferta chega;
// o que não chega é o motivo dela existir.
//
// E o consumo confirma pelo outro lado: 171 dos 1.440 créditos concedidos foram
// gastos — 11,9%. Ninguém está perto do teto de 40, então "você vai perder o
// Creator" não tem lastro na experiência de quem ouve. Quem não sentiu o
// presente não sente a perda.
//
// ⚠️ ESTA TELA NÃO É UM SEGUNDO PEDIDO DE VENDA. A caixa pós-vídeo é o pedido.
// Esta é o ANÚNCIO — ela existe para que, quando o pedido chegar, ele não seja a
// primeira notícia. Por isso o CTA é secundário e a manchete é o PRAZO.
//
// TRÊS DECISÕES DE NÃO FAZER:
//
//   1. NÃO é `position: fixed` e não tem `z-index`. O rodapé do app já tem
//      InstallAppBanner (70), EnablePushBanner (69), MobileNav (50), a
//      StickyUpgradeBar e o painel de download manual disputando espaço, e a
//      revisão do painel de download de 07/08 pagou justamente pelo defeito de
//      um resgate que ENTERRAVA o CTA de compra. Um anúncio não pode cobrir a
//      oferta. Em fluxo normal, no topo do `<main>`, ele não pode cobrir nada.
//      CUSTO ACEITO E REGISTRADO: quem rola a página não o vê mais até a
//      próxima navegação. É o preço de não empilhar mais uma camada.
//   2. NÃO repete o erro que a sprint das 13h consertou. A manchete é o PRAZO;
//      o contador de créditos só é impresso quando já argumenta A FAVOR de
//      comprar, e a regra do limiar é DELIBERADAMENTE a mesma da caixa
//      pós-vídeo (metade da concessão). Duas telas da mesma feature dando
//      veredictos opostos sobre a MESMA linha do banco é o defeito que
//      `lib/reverseTrial.ts` existe para impedir.
//   3. NÃO afirma o que acontece com o saldo no fim do trial. O cron de
//      downgrade já falhou uma vez em produção (smoke 07/08 03:00Z) e nenhum
//      trial venceu ainda — o primeiro vence 10/08 17:57Z. "Creator picks up
//      where the trial ends" é verdadeiro nos dois desfechos; "you will lose"
//      seria uma promessa apoiada num cron com incidente aberto.
//
// ELEGIBILIDADE: só o servidor decide (`/api/credits` → `trial.phase`), igual
// ao modal de downgrade. Falha de rede não vira upsell.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { creditCostFor } from '@/lib/credits/engineCost'
// Import de TIPO apenas (apagado no build). Vem da MESMA definição que o
// servidor serializa: renomear um campo lá quebra o build aqui, em vez de fazer
// o banner sumir em silêncio.
import type { TrialUiState } from '@/lib/reverseTrial'
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getIntroPrice,
  getTierPrice,
  hasIntroOffer,
  type CheckoutCurrency,
  type PriceRegion,
} from '@/lib/checkoutPricing'

// Dispensa POR CONTA, POR NAVEGADOR e POR DIA.
//
// Por que o dia entra na chave, ao contrário do modal de downgrade (que dispensa
// para sempre): o modal é um comunicado de evento único — aconteceu, foi lido,
// morreu. Este banner é um RELÓGIO. Um relógio que a pessoa desliga no primeiro
// dia e nunca mais volta não é um relógio; e o dia em que o prazo importa é o
// ÚLTIMO, não o primeiro. Dispensar silencia o resto do dia de hoje — nunca
// amanhã.
const DISMISSED_PREFIX = 'kineo_trial_active_banner_dismissed_v1'
// Dedupe da impressão. MESMO namespace da dispensa (`:userKey:dia`), pelo motivo
// que a revisão do modal registrou: numerador e denominador têm que contar a
// mesma unidade, ou a razão entre eles não é taxa de nada. Aqui a unidade é
// "uma conta, um dia".
const SHOWN_PREFIX = 'kineo_trial_active_banner_shown_v1'

const SEEDANCE_COST = creditCostFor('cinematic_ai')

interface CreditsPayload {
  trial?: Partial<TrialUiState>
  hasPaid?: boolean
  isStarter?: boolean
  isCreator?: boolean
  isStudio?: boolean
}

/** Dia corrente em UTC. Fuso do navegador NÃO entra: a chave tem que ser
 *  estável para quem viaja ou muda o relógio do sistema, e `trial_ends_at` já é
 *  UTC. */
function utcDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

/**
 * Prazo em linguagem humana a partir de `msLeft`.
 *
 * Arredonda para CIMA em dias e para BAIXO em horas, e as duas escolhas são
 * deliberadas: "ends in 1 day" quando faltam 30 h seria mentira por defeito
 * (a pessoa tem mais tempo do que leu, e descobrir isso não custa nada), mas
 * "ends in 3 hours" quando faltam 3 h 50 min é a direção segura — nenhuma tela
 * pode prometer mais prazo do que existe. Abaixo de 1 h o número deixa de ser
 * dito: "ends within the hour" não envelhece entre o render e a leitura.
 */
function formatTimeLeft(msLeft: number): string | null {
  if (!Number.isFinite(msLeft) || msLeft <= 0) return null
  const hours = msLeft / 3_600_000
  if (hours < 1) return 'within the hour'
  if (hours < 24) {
    const h = Math.floor(hours)
    return `in ${h} hour${h === 1 ? '' : 's'}`
  }
  const days = Math.ceil(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

export default function TrialActiveBanner({ userKey }: { userKey: string }) {
  const [open, setOpen] = useState(false)
  const [granted, setGranted] = useState(0)
  const [used, setUsed] = useState(0)
  const [msLeft, setMsLeft] = useState<number | null>(null)
  const [currency, setCurrency] = useState<CheckoutCurrency | null>(null)
  const [region, setRegion] = useState<PriceRegion>('standard')
  const checkout = useCheckoutLaunch('trial_active_banner')
  // O dia é carimbado UMA vez, no mount, e reusado nas duas chaves e no evento.
  // Ler `Date.now()` de novo na dispensa deixaria a chave de dispensa num dia
  // diferente da chave de impressão numa navegação à meia-noite — a pessoa
  // dispensaria e o banner voltaria no mesmo instante.
  const dayRef = useRef(utcDayKey(Date.now()))
  const dismissKey = `${DISMISSED_PREFIX}:${userKey}:${dayRef.current}`
  const shownKey = `${SHOWN_PREFIX}:${userKey}:${dayRef.current}`

  // ── Elegibilidade: só o servidor decide ────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    try {
      if (window.localStorage.getItem(dismissKey) === '1') return
    } catch {
      // localStorage bloqueado nunca esconde o banner nem derruba a tela.
    }

    void fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) throw new Error('credits_lookup_failed')
        return (await r.json()) as CreditsPayload
      })
      .then((data) => {
        if (cancelled) return
        const trial = data.trial

        // Guarda 1 — fase. Só 'active'. 'ending' e 'downgraded' são do modal de
        // downgrade, e as duas telas juntas na mesma navegação diriam a mesma
        // pessoa que o trial está correndo E que acabou.
        if (trial?.phase !== 'active') return

        // Guarda 2 — quem já comprou não vê anúncio de trial. `hasPaid` sozinho
        // não basta: uma conta pode ter plano ativo sem `has_paid` (cortesia,
        // migração), e o erro caro aqui é vender de novo a quem já pagou.
        if (data.hasPaid === true || data.isStarter === true || data.isCreator === true || data.isStudio === true) return

        // Guarda 3 — só fala de concessão quem comprovadamente RECEBEU. Mesma
        // guarda de `showDowngradeModal`, pelo mesmo motivo: uma rota futura que
        // esqueça `trial_credits_granted` no SELECT perde o anúncio (silencioso,
        // do lado seguro) em vez de anunciar 0 créditos.
        const g = typeof trial.creditsGranted === 'number' ? trial.creditsGranted : 0
        if (g <= 0) return

        // Guarda 4 — sem prazo não há manchete. `msLeft` nulo com fase 'active'
        // é dado inconsistente; falhar fechado é mais barato que pintar um
        // relógio vazio no topo de toda tela autenticada.
        const left = typeof trial.msLeft === 'number' ? trial.msLeft : null
        if (left === null || left <= 0) return

        setGranted(g)
        setUsed(typeof trial.creditsUsedForDisplay === 'number' ? trial.creditsUsedForDisplay : 0)
        setMsLeft(left)
        setOpen(true)

        // Impressão: uma por conta por dia. Sai aqui, e não no render, porque
        // "o servidor autorizou e o componente montou" é o fato que interessa;
        // um `useEffect` de render dispararia de novo a cada navegação do dia.
        let alreadyCounted = false
        try {
          alreadyCounted = window.localStorage.getItem(shownKey) === '1'
          window.localStorage.setItem(shownKey, '1')
        } catch {
          // Sem localStorage a impressão pode duplicar; melhor duplicar do que perder.
        }
        if (!alreadyCounted) {
          void trackEvent('trial_active_banner_shown', {
            credits_granted: g,
            credits_used: typeof trial.creditsUsedForDisplay === 'number' ? trial.creditsUsedForDisplay : 0,
            ms_left: left,
            // O A/B de 3d vs 7d é julgado por conversão, mas a leitura de
            // "urgência funciona?" precisa saber QUAL prazo a pessoa leu.
            time_left_label: formatTimeLeft(left),
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
        // O checkout resolve a moeda de novo no servidor, pelo header de IP: um
        // fallback para USD aqui muda o RÓTULO, nunca a cobrança.
        if (!cancelled) setCurrency('usd')
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const dismiss = useCallback(() => {
    // Desfecho ANTES do efeito: ação sem registro é instrumento cego.
    void trackEvent('trial_active_banner_dismissed', { ms_left: msLeft })
    try {
      window.localStorage.setItem(dismissKey, '1')
    } catch {
      // Sem localStorage o banner volta na próxima navegação. Chato, não grave.
    }
    setOpen(false)
  }, [dismissKey, msLeft])

  if (!open || msLeft === null) return null

  const timeLeft = formatTimeLeft(msLeft)
  if (timeLeft === null) return null

  const introEligible = currency !== null && hasIntroOffer('basic', currency, region)
  const priceMinor =
    currency !== null
      ? introEligible
        ? getIntroPrice('basic', currency, region)
        : getTierPrice('basic', currency, region)
      : null
  // Preço SEMPRE de lib/checkoutPricing, por moeda. Zero literal nesta tela.
  const priceLabel = currency !== null && priceMinor !== null ? formatCheckoutMoney(currency, priceMinor) : null

  // Vídeos cinematográficos que a concessão realmente compra. DERIVADO, nunca
  // redigitado: no dia em que o custo do motor mudar, esta frase acompanha.
  const trialVideos = SEEDANCE_COST > 0 ? Math.floor(granted / SEEDANCE_COST) : 0

  // O contador só é impresso quando já argumenta A FAVOR de comprar — metade da
  // concessão ou mais. Limiar DELIBERADAMENTE igual ao da caixa pós-vídeo
  // (KINEO-TRIAL-OFFER-SCARCITY-2026-08-08): abaixo dele, dizer "you've used 1
  // of 40" é a própria oferta lembrando que ainda sobra muito.
  const counterRendered = granted > 0 && used * 2 >= granted

  return (
    <div
      role="region"
      aria-label="Creator trial status"
      className="mx-3 mt-3 rounded-xl px-4 py-3 md:mx-6"
      style={{
        background: 'linear-gradient(135deg, rgba(41,151,255,.12), rgba(41,151,255,.04))',
        border: '1px solid rgba(41,151,255,.32)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* A MANCHETE É O PRAZO. Ver decisão 2 no topo do arquivo. */}
          <p className="text-sm font-black" style={{ color: '#5cb3ff', lineHeight: 1.4 }}>
            You&apos;re on the Creator trial — ends {timeLeft}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted2)', lineHeight: 1.5 }}>
            {/* O que a concessão É, em unidades que a pessoa reconhece. "40
                créditos" não significa nada para quem nunca gastou um. */}
            {trialVideos > 0
              ? `${granted} credits included — about ${trialVideos} cinematic AI video${trialVideos === 1 ? '' : 's'}, no watermark, full length.`
              : `${granted} credits included — cinematic AI engine, no watermark, full length.`}
          </p>
          {counterRendered && (
            <p className="mt-1 text-xs font-bold" style={{ color: '#5cb3ff', lineHeight: 1.45 }}>
              {used} of {granted} trial credits used
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss trial banner"
          // 44x44: alvo de toque real. A revisão do painel de download de 07/08
          // pagou por um botão de fechar de 12x20 nesta mesma classe de tela.
          className="flex shrink-0 items-center justify-center rounded-lg"
          style={{ width: 44, height: 44, color: 'var(--muted2)', fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          // Evento ANTES da navegação: depois do redirect da Stripe não existe
          // mais página para emitir nada. `launch()` pode recusar (trava de
          // duplo clique) e o desfecho fica com o próprio hook.
          void trackEvent('trial_active_banner_cta', {
            tier: 'basic',
            ms_left: msLeft,
            time_left_label: timeLeft,
            display_currency: currency ?? 'resolving',
            price_region: region,
            displayed_price_minor: priceMinor,
            credits_granted: granted,
            credits_used: used,
            trial_counter_rendered: counterRendered,
          })
          // `intro=1` é o MESMO link de todas as outras superfícies de Creator
          // do app. Omiti-lo faria esta tela ser a única a cobrar mais caro
          // pelo mesmo plano. Quem valida elegibilidade é o servidor.
          checkout.launch('basic', '/api/stripe/checkout?tier=basic&intro=1', {
            tier: 'basic',
            pricing_surface: 'trial_active_banner',
          })
        }}
        disabled={checkout.pending !== null}
        className="mt-2 text-xs font-bold underline"
        style={{
          color: '#5cb3ff',
          cursor: checkout.pending !== null ? 'wait' : 'pointer',
          opacity: checkout.pending !== null ? 0.6 : 1,
        }}
      >
        {checkout.pending !== null
          ? 'Opening checkout…'
          : priceLabel
            ? `Keep Creator after the trial — ${priceLabel}`
            : 'Keep Creator after the trial'}
      </button>
      {checkout.error && (
        <p className="mt-1 text-xs" style={{ color: '#ff6b6b' }}>
          {checkout.error}
        </p>
      )}
    </div>
  )
}
