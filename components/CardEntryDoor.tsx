'use client'

// KINEO-PORTA-V2-2026-09-09 — A PORTA DEIXA DE SER AVISO E VIRA CENA.
//
// O QUE FOI MEDIDO (08/09, contas externas, desde 05:00 UTC — diário
// docs/ROTINA-NOITE-PORTA-2026-09-08.md):
//   · faixa `card_entry_banner_shown`: 7 pessoas, 13 impressões, 0 cliques.
//   · modal `upgrade_modal_trial_door_shown`: 3 pessoas, 5 impressões, 1 clique.
// A única pessoa que apertou algo no dia clicou DE DENTRO do modal
// (`checkout_cta_clicked.surface='generate_upgrade_modal'`) — e clicou o plano
// de $9 (`tier:'starter'`, `selection:'starter'`), com a porta de $1 visível na
// MESMA caixa (`door_reason:'ok'`, `entry_fee_minor:100`). Foi ao Stripe e não
// pagou; voltou e bateu na parede mais três vezes.
//
// A leitura: a porta de $1 não perdeu por copy. Perdeu porque estava competindo
// com uma grade de planos dentro da própria caixa. Uma caixa com quatro saídas
// não é uma porta.
//
// Por isso esta folha SUBSTITUI o UpgradeModal para a coorte da porta (conta que
// nunca pagou, saldo zero, sob CARD_ENTRY_ONLY) em vez de se somar a ele. Fora
// dessa coorte — assinante sem crédito, saldo parcial, footage — o UpgradeModal
// continua intacto, com os pacotes que aquela gente precisa.
//
// A faixa `CardEntryBanner` também continua: das 7 pessoas medidas, 3 nunca
// apertaram Generate. Para elas a faixa é a única superfície que existe.
//
// REGRA DE PREÇO: nenhum número desta tela é digitado. Taxa, dias, créditos e
// mensalidade saem de lib/checkoutPricing; a cobertura em filmes sai de
// TRIAL_ACCESS (lib/kineoFacts), que a calcula a partir do custo real do motor.
// O guardião scripts/test-porta-v2-2026-09-09.mjs reprova literal de preço aqui.

import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  CARD_TRIAL_DAYS,
  CARD_TRIAL_ENTRY_FEE_MINOR,
  CARD_TRIAL_GRANT_CREDITS,
  formatCheckoutMoney,
  getTierPrice,
  type CheckoutCurrency,
  type PriceRegion,
} from '@/lib/checkoutPricing'
import { CARD_ENTRY_CHECKOUT_PATH, CARD_ENTRY_COPY, CARD_ENTRY_INTENT_CAMPAIGN } from '@/lib/entryPolicy'
// KINEO-PORTA-V2-FRONTEIRA-2026-09-09 — a cobertura em filmes é a MESMA de
// TRIAL_ACCESS (lib/kineoFacts), mas `kineoFacts` NÃO pode ser importado por um
// componente client: sua árvore puxa `node:crypto` (lib/gptHandoff) e `crypto`
// (lib/trialFingerprint). O `tsc` fica verde e o build da Vercel quebra — o
// defeito já documentado em "tsc não vê a fronteira servidor/cliente".
// Por isso a folha usa o MESMO CONSTRUTOR e as MESMAS fontes que o kineoFacts
// usa para montar aquele fato — `buildTrialAccessFact`, `creditsPerReferenceVideo`
// e `engineLabelFor` —, não uma cópia da conta. Os três módulos são puros
// (verificado por varredura de importadores).
import { filterShotClips } from '@/lib/growth/cleanFilmTrialDoor'
import { buildTrialAccessFact } from '@/lib/growth/trialAccessFacts'
import { creditsPerReferenceVideo } from '@/lib/marketingPrice'
import { engineLabelFor } from '@/lib/engineLabel'

export const CARD_ENTRY_DOOR_VERSION = 'door_v2' as const

/** A campanha da folha nova. Só o intent_campaign muda — o produto é o mesmo. */
export const CARD_ENTRY_DOOR_CHECKOUT_PATH = CARD_ENTRY_CHECKOUT_PATH.replace(
  `intent_campaign=${CARD_ENTRY_INTENT_CAMPAIGN}`,
  `intent_campaign=${CARD_ENTRY_DOOR_VERSION}`,
)

/** O rascunho que o /checkout/success devolve com ?resume=card_entry. */
export const STUDIO_DRAFT_KEY = 'kineo_studio_draft_v1'

/** A ideia da pessoa cabe na folha; o resto vira reticências. */
export const DOOR_PROMPT_MAX_CHARS = 140

export function trimIdeaForDoor(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, ' ')
  if (clean.length <= DOOR_PROMPT_MAX_CHARS) return clean
  return clean.slice(0, DOOR_PROMPT_MAX_CHARS - 1).trimEnd() + '…'
}

const ROBOT_VIDEO = '/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4'
const ROBOT_POSTER = '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg'

type Lang = 'en' | 'es' | 'hi'

// Três línguas, uma frase por papel. Os NÚMEROS entram por interpolação — a
// tradução nunca carrega preço (lição: preço literal em texto envelhece e mente).
const T: Record<Lang, {
  yourIdea: string
  /** Rótulo quando o filme JÁ foi montado e está preso atrás da porta. */
  yourIdeaShot: string
  promise: string
  /** A promessa muda quando o trabalho já existe: não é "vamos fazer", é "está feito". */
  promiseShot: string
  makeIt: string
  notNow: string
  opening: string
  cancel: string
  filmsFrom: (films: number, engine: string) => string
  creditsNow: (credits: number) => string
  /** O fato que só existe quando a casa já gastou o trabalho: N clipes prontos. */
  clipsReady: (clips: number) => string
  price: (fee: string, days: number, monthly: string) => string
}> = {
  en: {
    yourIdea: 'Your film, waiting to be made',
    yourIdeaShot: 'Your film is already shot',
    promise: 'Kineo directs it, narrates it and edits it for you.',
    promiseShot: 'Kineo already wrote it and shot it. One step left: the final render.',
    makeIt: 'Make this film',
    notNow: 'Not now',
    opening: 'Opening checkout…',
    cancel: 'Cancel anytime.',
    filmsFrom: (films, engine) => 'Enough for ' + films + ' full ' + engine + ' film' + (films === 1 ? '' : 's'),
    creditsNow: (credits) => credits + ' credits the moment you pay',
    clipsReady: (clips) => 'Script written and ' + clips + ' clip' + (clips === 1 ? '' : 's') + ' already shot for this film',
    price: (fee, days, monthly) => fee + ' for ' + days + ' days, then ' + monthly + '/month',
  },
  es: {
    yourIdea: 'Tu película, esperando a existir',
    yourIdeaShot: 'Tu película ya está rodada',
    promise: 'Kineo la dirige, la narra y la edita por ti.',
    promiseShot: 'Kineo ya la escribió y la rodó. Falta un paso: el render final.',
    makeIt: 'Crear esta película',
    notNow: 'Ahora no',
    opening: 'Abriendo el pago…',
    cancel: 'Cancela cuando quieras.',
    filmsFrom: (films, engine) => 'Alcanza para ' + films + ' película' + (films === 1 ? '' : 's') + ' completa' + (films === 1 ? '' : 's') + ' de ' + engine,
    creditsNow: (credits) => credits + ' créditos en el momento del pago',
    clipsReady: (clips) => 'Guion escrito y ' + clips + ' clip' + (clips === 1 ? '' : 's') + ' ya rodado' + (clips === 1 ? '' : 's') + ' para esta película',
    price: (fee, days, monthly) => fee + ' por ' + days + ' días, luego ' + monthly + '/mes',
  },
  hi: {
    yourIdea: 'आपकी फ़िल्म, बनने का इंतज़ार कर रही है',
    yourIdeaShot: 'आपकी फ़िल्म शूट हो चुकी है',
    promise: 'Kineo इसे निर्देशित करता है, आवाज़ देता है और एडिट करता है।',
    promiseShot: 'Kineo ने इसे लिख और शूट कर लिया है। बस अंतिम रेंडर बाकी है।',
    makeIt: 'यह फ़िल्म बनाएँ',
    notNow: 'अभी नहीं',
    opening: 'चेकआउट खुल रहा है…',
    cancel: 'कभी भी रद्द करें।',
    filmsFrom: (films, engine) => films + ' पूरी ' + engine + ' फ़िल्मों के लिए पर्याप्त',
    creditsNow: (credits) => 'भुगतान करते ही ' + credits + ' क्रेडिट',
    clipsReady: (clips) => 'स्क्रिप्ट लिखी जा चुकी है और इस फ़िल्म के लिए ' + clips + ' क्लिप शूट हो चुके हैं',
    price: (fee, days, monthly) => days + ' दिन के लिए ' + fee + ', फिर ' + monthly + '/माह',
  },
}

export default function CardEntryDoor({
  prompt,
  readyClips,
  currency = 'usd',
  region = 'standard',
  path,
  reason,
  onDismiss,
}: {
  /** A ideia que a pessoa escreveu neste instante. Vazia = a folha não cita nada. */
  prompt: string
  /**
   * KINEO-PORTA-FILME-JA-FEITO-2026-09-09 — os clipes que a casa JÁ rodou para
   * ESTE filme, quando a recusa veio depois de `clips_ready`. Vazio/ausente =
   * a folha continua byte a byte a de antes.
   *
   * POR QUE ISSO EXISTE: medido em produção hoje (diário SPRINT-CHATGPT), 3 de
   * 3 pessoas da Versão B que chegaram até aqui tiveram roteiro escrito e
   * clipes escolhidos ANTES do 402 — o trabalho está feito e preso atrás da
   * porta. Dizer "your film, waiting to be made" para quem já tem 13 clipes
   * rodados é falso por omissão, e a folha vendia uma promessa quando podia
   * estar vendendo uma coisa que já existe.
   */
  readyClips?: readonly string[] | null
  currency?: CheckoutCurrency | null
  region?: PriceRegion
  /** Caminho da tela, para o placar saber de onde a folha subiu. */
  path?: string
  /** O motivo do bloqueio que abriu a folha (credits, trial_ended, …). */
  reason?: string
  onDismiss: () => void
}) {
  const language = useInterfaceLanguage()
  const t = T[(language === 'es' || language === 'hi' ? language : 'en') as Lang]
  const checkout = useCheckoutLaunch('card_entry_door')
  const impressionSentRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  const idea = useMemo(() => trimIdeaForDoor(prompt ?? ''), [prompt])
  // Só URL http(s) conta: blob/data de uma tentativa morta não é clipe rodado,
  // e o número desta linha vira texto na cara da pessoa.
  // KINEO-PORTA-MODAL-FILME-RODADO-2026-09-09 — o predicado saiu daqui para
  // `lib/growth/cleanFilmTrialDoor` quando o modal de upgrade, a superfície
  // irmã que abre no MESMO instante, passou a precisar da mesma conta. Duas
  // cópias e as duas folhas contariam "clipes rodados" de jeitos que podem
  // divergir sem ninguém ver.
  const shotClips = useMemo(() => filterShotClips(readyClips), [readyClips])
  const filmIsShot = shotClips.length > 0
  // O preview do clipe é enfeite: se a URL do fornecedor expirou ou o navegador
  // recusou, a folha volta ao vídeo da casa. O TEXTO não depende disso — os
  // clipes existem no servidor mesmo quando o <video> não os toca.
  const [clipPreviewFailed, setClipPreviewFailed] = useState(false)
  const showOwnClip = filmIsShot && !clipPreviewFailed
  const money: CheckoutCurrency = currency ?? 'usd'
  const feeLabel = formatCheckoutMoney(money, CARD_TRIAL_ENTRY_FEE_MINOR)
  const monthlyLabel = formatCheckoutMoney(money, getTierPrice('basic', money, region))

  // A cobertura em FILMES vem CALCULADA (grant ÷ custo real do motor), nunca
  // prometida à mão: se o preço do Kineo 1 mudar, esta linha muda sozinha.
  // Se por qualquer motivo a conta não fechar, a linha some — melhor calar do
  // que prometer um número que a casa não entrega.
  const coverage = useMemo(() => {
    try {
      const engine = engineLabelFor('fast')
      if (!engine) return null
      const fact = buildTrialAccessFact({
        enabled: true,
        credits: CARD_TRIAL_GRANT_CREDITS,
        engines: [{ name: engine, credits: creditsPerReferenceVideo('fast') }],
      })
      const first = fact?.engineCoverage?.[0]
      return first && first.wholeReferenceVideosCovered > 0 ? first : null
    } catch {
      return null
    }
  }, [])

  const promptLen = (prompt ?? '').trim().length
  const herePath = path ?? (typeof window === 'undefined' ? null : window.location.pathname)

  useEffect(() => {
    setMounted(true)
    if (impressionSentRef.current) return
    impressionSentRef.current = true
    void trackEvent('card_entry_door_shown', {
      version: CARD_ENTRY_DOOR_VERSION,
      path: herePath,
      prompt_len: promptLen,
      surface: 'generate',
      reason: reason ?? null,
      language,
      entry_fee_minor: CARD_TRIAL_ENTRY_FEE_MINOR,
      price_region: region,
      display_currency: money,
      // KINEO-PORTA-FILME-JA-FEITO-2026-09-09 — sem este campo as duas folhas
      // (promessa e filme-pronto) chegam idênticas ao banco e nenhuma medição
      // posterior consegue separá-las.
      ready_clips: shotClips.length,
      film_already_shot: filmIsShot,
    })
    // Impressão é uma por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss() {
    void trackEvent('card_entry_door_dismissed', {
      version: CARD_ENTRY_DOOR_VERSION,
      path: herePath,
      prompt_len: promptLen,
      surface: 'generate',
      ready_clips: shotClips.length,
      film_already_shot: filmIsShot,
    })
    onDismiss()
  }

  // Esc fecha, como qualquer folha modal. Sem isto a porta vira armadilha.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goToCheckout() {
    // O RASCUNHO PRIMEIRO, O STRIPE DEPOIS. Quem volta do checkout com
    // ?resume=card_entry acha a própria ideia e o filme dispara sozinho — o
    // caminho de volta já existe (GenerateClient), esta folha só garante que
    // há o que restaurar quando a pessoa saiu daqui sem digitar mais nada.
    try {
      const clean = (prompt ?? '').trim()
      if (clean) {
        const raw = sessionStorage.getItem(STUDIO_DRAFT_KEY)
        if (!raw) sessionStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify({ prompt: clean, at: Date.now() }))
      }
    } catch { /* private mode: o checkout continua valendo */ }
    const started = checkout.launch('basic', CARD_ENTRY_DOOR_CHECKOUT_PATH, {
      tier: 'basic',
      pricing_surface: 'card_entry_door',
      card_trial: true,
      version: CARD_ENTRY_DOOR_VERSION,
    })
    if (!started) return
    void trackEvent('card_entry_door_clicked', {
      version: CARD_ENTRY_DOOR_VERSION,
      path: herePath,
      prompt_len: promptLen,
      surface: 'generate',
      reason: reason ?? null,
      price_region: region,
      display_currency: money,
      ready_clips: shotClips.length,
      film_already_shot: filmIsShot,
    })
  }

  return (
    <div
      data-card-entry-door={CARD_ENTRY_DOOR_VERSION}
      role="dialog"
      aria-modal="true"
      aria-label={CARD_ENTRY_COPY.ctaShort}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(4,6,10,.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
        overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity .18s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: 'auto',
          borderRadius: 18,
          border: '1px solid rgba(41,151,255,.35)',
          background: 'linear-gradient(180deg, #0e1420 0%, #080b12 100%)',
          padding: 20,
          boxShadow: '0 30px 90px rgba(0,0,0,.6)',
        }}
      >
        {/* 1 — A IDEIA DELA. A folha fala do filme dela, não de planos. */}
        {idea ? (
          <>
            <div data-door-idea-label style={{ fontSize: 12, letterSpacing: .4, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
              {filmIsShot ? t.yourIdeaShot : t.yourIdea}
            </div>
            <blockquote
              data-door-idea
              style={{
                margin: '8px 0 14px',
                padding: '10px 14px',
                borderLeft: '3px solid #2997ff',
                fontSize: 16,
                lineHeight: 1.45,
                color: '#fff',
                fontStyle: 'italic',
              }}
            >
              {'“' + idea + '”'}
            </blockquote>
          </>
        ) : null}

        {/* 2 — O PRODUTO EM MOVIMENTO no segundo da decisão. Quando a casa já
            rodou os clipes DESTE filme, quem aparece aqui é o primeiro deles —
            a pessoa vê o próprio material, não uma demonstração. */}
        <video
          key={showOwnClip ? shotClips[0] : ROBOT_VIDEO}
          data-door-clip={showOwnClip ? 'own' : 'house'}
          src={showOwnClip ? shotClips[0] : ROBOT_VIDEO}
          poster={showOwnClip ? undefined : ROBOT_POSTER}
          onError={() => { if (showOwnClip) setClipPreviewFailed(true) }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          style={{
            width: '100%',
            maxHeight: '40vh',
            objectFit: 'cover',
            borderRadius: 12,
            display: 'block',
            background: '#000',
          }}
        />

        {/* ═══ 3 — O QUE O PRODUTO FAZ, na língua da pessoa ═══════════════════
            Aqui vivia `CARD_ENTRY_COPY.headline`. Olhando a folha renderizada a
            375px (scripts/preview-porta-v2-2026-09-09.mjs) apareceram dois
            defeitos que nenhuma asserção pegava:
              · o parágrafo saía EM INGLÊS nas três línguas — é uma constante de
                copy, não passa pelo dicionário de interface;
              · ocupava 103px (4 linhas) REPETINDO o preço da linha logo abaixo,
                e empurrava o único botão para fora da dobra do celular.
            Trocado por uma promessa curta e traduzida, SEM preço. Nenhum fato
            se perdeu: taxa, dias, créditos e mensalidade continuam na tela,
            vindos de lib/checkoutPricing — e agora nas três línguas. */}
        <h2 data-door-promise style={{ margin: '16px 0 0', fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: '#fff' }}>
          {filmIsShot ? t.promiseShot : t.promise}
        </h2>

        {/* 4 — O PREÇO, montado em runtime a partir de lib/checkoutPricing. */}
        <p data-door-price style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 700, color: '#2997ff' }}>
          {t.price(feeLabel, CARD_TRIAL_DAYS, monthlyLabel)}
        </p>

        {/* 5 — O QUE ELA GANHA, calculado dos fatos. */}
        <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {filmIsShot ? (
            <li data-door-clips-ready style={{ fontSize: 13.5, color: '#8fd0ff', fontWeight: 700 }}>
              {'✓ ' + t.clipsReady(shotClips.length)}
            </li>
          ) : null}
          <li style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)' }}>{'✓ ' + t.creditsNow(CARD_TRIAL_GRANT_CREDITS)}</li>
          {coverage ? (
            <li style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)' }}>
              {'✓ ' + t.filmsFrom(coverage.wholeReferenceVideosCovered, coverage.engine)}
            </li>
          ) : null}
          <li style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)' }}>{'✓ ' + t.cancel}</li>
        </ul>

        {/* 6 — UM BOTÃO. Nenhuma segunda oferta nesta tela. */}
        <button
          type="button"
          data-testid="card-entry-door-cta"
          disabled={checkout.pending !== null}
          onClick={goToCheckout}
          style={{
            marginTop: 18,
            width: '100%',
            minHeight: 48,
            background: '#2997ff',
            color: '#000',
            border: 0,
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 800,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
          }}
        >
          {checkout.pending !== null ? t.opening : t.makeIt}
        </button>

        {checkout.error ? (
          <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: '#ff9b9b' }}>
            {checkout.error}
          </p>
        ) : null}

        {/* 7 — A SAÍDA discreta. Uma porta que não fecha é armadilha. */}
        <button
          type="button"
          data-testid="card-entry-door-dismiss"
          onClick={dismiss}
          style={{
            marginTop: 10,
            width: '100%',
            minHeight: 40,
            background: 'transparent',
            color: 'rgba(255,255,255,.55)',
            border: 0,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          {t.notNow}
        </button>
      </div>
    </div>
  )
}
