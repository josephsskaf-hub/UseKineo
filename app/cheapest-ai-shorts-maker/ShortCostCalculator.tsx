'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  CURRENCY_DISPLAY,
  formatCheckoutMoney,
  getTierPrice,
  type CheckoutCurrency,
} from '@/lib/checkoutPricing'
import {
  calculatePlanFit,
  engineName,
  planName,
  type PlanFitQuality,
} from '@/lib/growth/planFit'
import { readPublicPlanFitHandoff } from '@/lib/growth/publicPlanFitHandoff'

type PublicEngine = {
  quality: PlanFitQuality
  detail: string
}

const PUBLIC_ENGINES: readonly PublicEngine[] = [
  { quality: 'fast', detail: 'Matched stock footage + AI voiceover' },
  { quality: 'cinematic_ai', detail: 'Seedance 1.5 generated scenes' },
  { quality: 'cinematic_h3', detail: 'MiniMax H3 with character consistency' },
  { quality: 'cinematic_kling', detail: 'Kling 2.5 cinematic scenes' },
  { quality: 'cinematic_veo', detail: 'Google Veo 3.1 cinematic scenes' },
  { quality: 'cinematic_hollywood', detail: 'Kling 3 with native lip sync' },
  { quality: 'cinematic_omni', detail: 'Omni Flash, top blind-arena score' },
]

const PUBLIC_DURATIONS = [35, 60, 90] as const

function clampVideos(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(60, Math.round(value)))
}

function currentInternalSource(): string {
  if (typeof window === 'undefined') return 'direct'
  const raw = new URLSearchParams(window.location.search).get('internal_source')
  return (raw || 'direct').slice(0, 160)
}

export default function ShortCostCalculator() {
  const [quality, setQuality] = useState<PlanFitQuality>('fast')
  const [seconds, setSeconds] = useState<(typeof PUBLIC_DURATIONS)[number]>(60)
  const [videos, setVideos] = useState(12)
  const [currency, setCurrency] = useState<CheckoutCurrency | null>(null)
  const [carriedFromEarnings, setCarriedFromEarnings] = useState(false)
  const result = useMemo(
    () => calculatePlanFit({ quality, seconds, monthlyFilms: videos, currency }),
    [quality, seconds, videos, currency],
  )

  useEffect(() => {
    let cancelled = false
    const handoff = readPublicPlanFitHandoff(window.location.search)
    const initialQuality = handoff?.quality ?? 'fast'
    const initialSeconds = handoff?.seconds ?? 60
    const initialVideos = handoff?.monthlyVideos ?? 12
    if (handoff) {
      setQuality(handoff.quality)
      setSeconds(handoff.seconds)
      setVideos(handoff.monthlyVideos)
      setCarriedFromEarnings(true)
    }
    void fetch('/api/geo', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('geo_lookup_failed')
        const data = await response.json() as { currency?: string }
        const resolved: CheckoutCurrency =
          'usd' // KINEO-USD-ONLY-2026-08-19
        if (cancelled) return
        setCurrency(resolved)
        void trackEvent('short_cost_calculator_viewed', {
          display_currency: resolved,
          default_engine: initialQuality,
          default_seconds: initialSeconds,
          default_videos: initialVideos,
          plan_source: handoff?.source ?? 'direct',
          internal_source: currentInternalSource(),
          intent_campaign: 'push77_short_cost_calculator',
        })
      })
      .catch(() => {
        if (!cancelled) setCurrency('usd')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function recordChange(
    nextQuality: PlanFitQuality,
    nextVideos: number,
    nextSeconds: number = seconds,
    selectionSource: 'engine' | 'duration' | 'volume' | 'lower_plan_capacity' | 'same_engine_capacity' | 'fast_alternative' = 'volume',
  ) {
    const next = calculatePlanFit({
      quality: nextQuality,
      seconds: nextSeconds,
      monthlyFilms: nextVideos,
      currency,
    })
    void trackEvent('short_cost_calculator_changed', {
      engine: nextQuality,
      seconds: nextSeconds,
      videos: next.monthlyFilms,
      film_credits: next.filmCredits,
      required_credits: next.monthlyCredits,
      minimum_plan: next.plan?.tier ?? 'above_studio',
      selection_source: selectionSource,
      display_currency: currency ?? 'resolving',
      internal_source: currentInternalSource(),
      intent_campaign: 'push77_short_cost_calculator',
    })
  }

  function chooseEngine(next: PlanFitQuality) {
    setQuality(next)
    recordChange(next, videos, seconds, 'engine')
  }

  function chooseDuration(next: (typeof PUBLIC_DURATIONS)[number]) {
    setSeconds(next)
    recordChange(quality, videos, next, 'duration')
  }

  function commitVideos(raw: number) {
    const next = clampVideos(raw)
    setVideos(next)
    recordChange(quality, next, seconds, 'volume')
  }

  const recommendationMonthly = result.plan && currency
    ? getTierPrice(result.plan.tier, currency)
    : null

  return (
    <section
      aria-labelledby="short-cost-calculator-title"
      style={{
        marginTop: 36,
        padding: 'clamp(20px, 5vw, 30px)',
        background: '#101012',
        border: '1px solid #2a2a2d',
        borderRadius: 20,
      }}
    >
      <p style={{ margin: 0, color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Free cost calculator
      </p>
      <h2 id="short-cost-calculator-title" style={{ margin: '8px 0 0', fontSize: 'clamp(1.45rem, 4vw, 2rem)', lineHeight: 1.2 }}>
        What would your Shorts actually cost?
      </h2>
      <p style={{ margin: '10px 0 0', color: '#86868b', lineHeight: 1.6 }}>
        Pick the exact engine, duration and monthly output. This uses the same credit contract and plan grants as Checkout.
      </p>

      {carriedFromEarnings && (
        <div
          role="status"
          data-public-plan-fit-handoff
          style={{ marginTop: 18, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(41,151,255,.34)', background: 'rgba(41,151,255,.09)', color: '#d2d2d7', fontSize: 13, lineHeight: 1.55 }}
        >
          <b style={{ color: '#f5f5f7' }}>Publishing target carried over:</b>{' '}
          {videos} videos/month from your earnings estimate. Now choose the visual engine and duration that fit how you want them to look.
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ color: '#d2d2d7', fontSize: 13, fontWeight: 800, marginBottom: 9 }}>1. Visual engine</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          {PUBLIC_ENGINES.map((option) => {
            const selected = option.quality === quality
            const oneFilm = calculatePlanFit({ quality: option.quality, seconds, monthlyFilms: 1, currency })
            return (
              <button
                key={option.quality}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseEngine(option.quality)}
                style={{
                  textAlign: 'left',
                  padding: '14px 15px',
                  borderRadius: 13,
                  border: selected ? '2px solid #2997ff' : '1px solid #3a3a3d',
                  background: selected ? 'rgba(41,151,255,.10)' : '#161618',
                  color: '#f5f5f7',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'block', fontWeight: 800 }}>{engineName(option.quality)}</span>
                <span style={{ display: 'block', marginTop: 4, color: '#86868b', fontSize: 12, lineHeight: 1.4 }}>{option.detail}</span>
                <span style={{ display: 'block', marginTop: 7, color: '#2997ff', fontSize: 12, fontWeight: 800 }}>{oneFilm.filmCredits} credit{oneFilm.filmCredits === 1 ? '' : 's'} / {seconds}s video</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ color: '#d2d2d7', fontSize: 13, fontWeight: 800, marginBottom: 9 }}>2. Duration</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PUBLIC_DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              aria-pressed={seconds === duration}
              onClick={() => chooseDuration(duration)}
              style={{
                minWidth: 82,
                padding: '10px 14px',
                borderRadius: 999,
                border: seconds === duration ? '2px solid #2997ff' : '1px solid #3a3a3d',
                background: seconds === duration ? 'rgba(41,151,255,.10)' : '#161618',
                color: '#f5f5f7',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {duration}s
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <label htmlFor="shorts-per-month" style={{ display: 'block', color: '#d2d2d7', fontSize: 13, fontWeight: 800, marginBottom: 9 }}>
          3. Videos per month
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            id="shorts-per-month"
            type="range"
            min={1}
            max={60}
            value={videos}
            onChange={(event) => setVideos(clampVideos(Number(event.target.value)))}
            onPointerUp={() => recordChange(quality, videos, seconds, 'volume')}
            onKeyUp={() => recordChange(quality, videos, seconds, 'volume')}
            style={{ flex: 1, accentColor: '#2997ff' }}
          />
          <input
            aria-label="Shorts per month"
            type="number"
            min={1}
            max={60}
            value={videos}
            onChange={(event) => setVideos(clampVideos(Number(event.target.value)))}
            onBlur={(event) => commitVideos(Number(event.target.value))}
            style={{ width: 76, padding: '10px 9px', borderRadius: 10, border: '1px solid #3a3a3d', background: '#161618', color: '#f5f5f7', fontWeight: 800, fontSize: 16 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 24, padding: 18, borderRadius: 16, background: '#161618', border: result.plan ? '1px solid rgba(41,151,255,.45)' : '1px solid #3a3a3d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#86868b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Credits required</div>
            <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900 }}>{result.monthlyCredits}</div>
            <div style={{ marginTop: 4, color: '#86868b', fontSize: 12 }}>
              {videos} × {seconds}s {engineName(quality)} video{videos === 1 ? '' : 's'} · {result.filmCredits} credits each
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ color: '#86868b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Lowest monthly plan that covers it</div>
            {!currency ? (
              <div style={{ marginTop: 6, color: '#d2d2d7', fontWeight: 800 }}>Checking USD price…</div>
            ) : result.plan && recommendationMonthly != null ? (
              <div style={{ marginTop: 5 }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{planName(result.plan.tier)} · {formatCheckoutMoney(currency, recommendationMonthly)}/mo</div>
                <div style={{ marginTop: 5, color: '#86868b', fontSize: 13 }}>
                  {formatCheckoutMoney(currency, recommendationMonthly / videos)} per planned Short at renewal · {CURRENCY_DISPLAY[currency].label}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 6, color: '#f5f5f7', fontWeight: 800 }}>
                No self-serve plan covers this exact target. Studio includes {result.maximumPlan.credits} credits — enough for {result.maximumSameEngineFilms} of these videos per month.
              </div>
            )}
          </div>
        </div>
        {result.lowerCostAlternative && currency && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #2a2a2d', color: '#d2d2d7', fontSize: 13, lineHeight: 1.55 }}>
            Prefer the lower plan? Keep {engineName(quality)} at {seconds}s and make{' '}
            <b>{result.lowerCostAlternative.monthlyFilms}/month</b>. That fits{' '}
            <b style={{ color: '#2997ff' }}>{planName(result.lowerCostAlternative.plan.tier)} at {formatCheckoutMoney(currency, getTierPrice(result.lowerCostAlternative.plan.tier, currency))}/mo</b>.{' '}
            <button
              type="button"
              onClick={() => {
                const next = result.lowerCostAlternative!.monthlyFilms
                setVideos(next)
                recordChange(quality, next, seconds, 'lower_plan_capacity')
              }}
              style={{ background: 'transparent', border: 0, padding: 0, color: '#2997ff', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
            >
              Use that cadence
            </button>
          </div>
        )}
        {!result.plan && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #2a2a2d' }}>
            {result.maximumSameEngineFilms > 0 && (
              <button
                type="button"
                onClick={() => {
                  setVideos(result.maximumSameEngineFilms)
                  recordChange(quality, result.maximumSameEngineFilms, seconds, 'same_engine_capacity')
                }}
                style={{ padding: '10px 15px', borderRadius: 999, border: '1px solid #2997ff', background: 'rgba(41,151,255,.10)', color: '#f5f5f7', fontWeight: 800, cursor: 'pointer' }}
              >
                Plan for {result.maximumSameEngineFilms}/month on {engineName(quality)}
              </button>
            )}
            {result.fastAlternative && (
              <button
                type="button"
                onClick={() => {
                  setQuality('fast')
                  recordChange('fast', videos, seconds, 'fast_alternative')
                }}
                style={{ padding: '10px 15px', borderRadius: 999, border: '1px solid #48484a', background: '#161618', color: '#f5f5f7', fontWeight: 800, cursor: 'pointer' }}
              >
                Keep {videos}/month with Kineo 1
              </button>
            )}
          </div>
        )}
        <p style={{ color: '#86868b', fontSize: 12, lineHeight: 1.5, margin: '14px 0 0' }}>
          Estimate assumes every planned video uses the selected engine and duration. Credits refresh monthly and unused plan credits do not roll over. Checkout confirms currency and eligibility again.
        </p>
      </div>

      {/*
        KINEO-PAGINA-INVISIVEL-2026-08-14 — esta página é a de MAIOR intenção de
        compra do site orgânico ("cheapest ai shorts maker" é consulta de quem
        está escolhendo onde pagar) e o placar da operação a lia como 0%: 51
        sessões, 0 clique. As duas coisas por trás desse zero:

        (1) O placar não estava cego, estava lendo OUTRO evento. Esta ferramenta
            grava `short_cost_calculator_cta_clicked` e o placar da casa conta
            `organic_cta_clicked` — o mesmo defeito que as 11h acharam em
            /examples, na página onde ele custa mais caro. Os números reais dos
            30 dias: 51 de 51 sessões VÊEM a calculadora, 8 MEXEM nela (30
            interações) e 3 clicam para sair. Não é uma página morta, é a mais
            engajada do orgânico — e a operação decidia sobre ela achando que
            era zero. Agora os dois eventos saem juntos: o específico continua
            para quem estuda a ferramenta, e o `organic_cta_clicked` põe a
            página no placar que já existe, sem inventar métrica nova.

        (2) Nesse mesmo placar aparece o que de fato deu zero: os dois
            OrganicCtaLink estáticos desta página (`push22_cheapest`, hero e
            fecho) têm 0 clique em 51 sessões, medidos, contra 3 da ferramenta.
            Então a lei das 11h ("ferramenta converte, texto não") não tinha
            exceção aqui — faltava a ferramenta ser contada.

        O DESTINO DOS BOTÕES NÃO MUDA, E ISSO É UMA DECISÃO, NÃO UMA OMISSÃO.
        Eu tinha reescrito o botão principal: `#try-costed-workflow` é uma ÂNCORA
        NA PRÓPRIA PÁGINA, e "quem acabou de calcular o custo recebe uma ROLAGEM"
        parecia o mesmo circuito fechado que as 10h acharam. Fui olhar as 3
        sessões que clicaram, uma por uma, antes de trocar — e elas dizem o
        contrário: DUAS das três seguiram a âncora até o TopicGeneratorForm,
        enviaram um tópico e terminaram com VÍDEO GERADO (`video_generation_completed`,
        01/08 07:07Z e 12:02Z). A âncora não é circuito fechado: é a porta que
        mais converte nesta casa, 2 vídeos em 3 cliques.

        E o motivo de trocá-la ser ativamente destrutivo: DUAS dessas três
        sessões já estavam LOGADAS e chegaram aqui de /pricing por link interno
        (`cost_calculator_internal_clicked`), não pela busca. Mandar essa gente
        para /signup seria mandar quem já tem conta para uma tela de criar conta,
        matando o único caminho medido que produz vídeo. Esta página não é só
        uma landing de SEO — ela é, de fato, a resposta à objeção de preço de
        quem já hesitou no checkout, e é assim que precisa ser tratada.

        Nenhum preço, moeda ou rota de checkout tocados — os valores seguem
        vindo de checkoutPricing via /api/geo, como já vinham.
      */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
        <Link
          href="#try-costed-workflow"
          onClick={() => {
            void trackEvent('short_cost_calculator_cta_clicked', {
              destination: 'topic_form',
              engine: quality,
              seconds,
              videos,
              required_credits: result.monthlyCredits,
              recommended_plan: result.plan?.tier ?? 'above_studio',
              display_currency: currency ?? 'resolving',
              internal_source: currentInternalSource(),
              intent_campaign: 'push77_short_cost_calculator',
            })
            void trackEvent('organic_cta_clicked', {
              source: 'push77_short_cost_calculator',
              placement: 'result',
              destination: '/cheapest-ai-shorts-maker#try-costed-workflow',
            })
          }}
          style={{ padding: '13px 22px', borderRadius: 980, background: '#f5f5f7', color: '#000', textDecoration: 'none', fontWeight: 900 }}
        >
          Test one Short free →
        </Link>
        <Link
          href="/pricing?intent_campaign=push77_short_cost_calculator"
          onClick={() => {
            void trackEvent('short_cost_calculator_cta_clicked', {
              destination: 'pricing',
              engine: quality,
              seconds,
              videos,
              required_credits: result.monthlyCredits,
              recommended_plan: result.plan?.tier ?? 'above_studio',
              display_currency: currency ?? 'resolving',
              internal_source: currentInternalSource(),
              intent_campaign: 'push77_short_cost_calculator',
            })
            void trackEvent('organic_cta_clicked', {
              source: 'push77_short_cost_calculator',
              placement: 'result_pricing',
              destination: '/pricing',
            })
          }}
          style={{ padding: '13px 20px', borderRadius: 980, border: '1px solid #48484a', color: '#f5f5f7', textDecoration: 'none', fontWeight: 800 }}
        >
          Compare plans
        </Link>
      </div>
    </section>
  )
}
