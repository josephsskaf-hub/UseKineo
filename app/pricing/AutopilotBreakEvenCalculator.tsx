'use client'

import { useEffect, useRef, useState } from 'react'
import { trackClosedEvent, trackEvent } from '@/lib/analytics'
import {
  AUTOPILOT_PILOT_PRICES,
  AUTOPILOT_PRICES,
  formatCheckoutMoney,
  type CheckoutCurrency,
} from '@/lib/checkoutPricing'
import {
  AUTOPILOT_BREAK_EVEN_VERSION,
  autopilotCustomerCountBucket,
  autopilotProfitBand,
  calculateAutopilotBreakEven,
  type AutopilotBreakEvenResult,
} from '@/lib/growth/autopilotBreakEven'
import {
  AUTOPILOT_DECISION_DWELL_MS,
  AUTOPILOT_DECISION_RETRY_MS,
  AUTOPILOT_DECISION_VISIBLE_RATIO,
  createAutopilotDecisionDwellController,
  createAutopilotDecisionRecorder,
  createAutopilotDecisionStageLifecycle,
  type AutopilotDecisionStage,
} from '@/lib/growth/autopilotDecisionFunnel'

const autopilotDecisionRecorder = createAutopilotDecisionRecorder({
  transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
})

function browserSessionStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function browserSchedule(callback: () => void, delayMs: number): () => void {
  const timer = window.setTimeout(callback, delayMs)
  return () => window.clearTimeout(timer)
}

function customerLabel(count: number): string {
  return `${count} new customer${count === 1 ? '' : 's'}`
}

export default function AutopilotBreakEvenCalculator({
  currency,
  pending,
  onStartMonthly,
  onStartPilot,
}: {
  currency: CheckoutCurrency
  pending: string | null
  onStartMonthly: () => void
  onStartPilot: () => void
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const startedLifecycleRef = useRef<ReturnType<typeof createAutopilotDecisionStageLifecycle> | null>(null)
  const [grossProfitUsd, setGrossProfitUsd] = useState('')
  const [result, setResult] = useState<AutopilotBreakEvenResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const target = sectionRef.current
    if (!target) return
    const storage = browserSessionStorage()
    const record = (stage: AutopilotDecisionStage) => (
      autopilotDecisionRecorder.recordOnce(stage, storage)
    )
    const renderedLifecycle = createAutopilotDecisionStageLifecycle({
      stage: 'rendered',
      record,
      isActive: () => target.isConnected,
      schedule: browserSchedule,
      retryDelayMs: AUTOPILOT_DECISION_RETRY_MS,
    })
    renderedLifecycle.start()
    const startedLifecycle = createAutopilotDecisionStageLifecycle({
      stage: 'started',
      record,
      isActive: () => target.isConnected,
      schedule: browserSchedule,
      retryDelayMs: AUTOPILOT_DECISION_RETRY_MS,
    })
    startedLifecycleRef.current = startedLifecycle

    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        renderedLifecycle.stop()
        startedLifecycle.stop()
        if (startedLifecycleRef.current === startedLifecycle) startedLifecycleRef.current = null
      }
    }

    let currentEntry: IntersectionObserverEntry | null = null
    const humanViewController = createAutopilotDecisionDwellController({
      record,
      schedule: browserSchedule,
      dwellMs: AUTOPILOT_DECISION_DWELL_MS,
      retryDelayMs: AUTOPILOT_DECISION_RETRY_MS,
    })
    const currentSample = () => ({
      isIntersecting: Boolean(currentEntry?.isIntersecting),
      intersectionRatio: currentEntry?.intersectionRatio ?? 0,
      documentVisible: document.visibilityState === 'visible',
      targetConnected: target.isConnected,
    })

    const observer = new IntersectionObserver((entries) => {
      currentEntry = entries.find((entry) => entry.target === target) ?? null
      humanViewController.update(currentSample())
    }, { threshold: [AUTOPILOT_DECISION_VISIBLE_RATIO] })
    const handleVisibility = () => humanViewController.update(currentSample())

    observer.observe(target)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      renderedLifecycle.stop()
      startedLifecycle.stop()
      if (startedLifecycleRef.current === startedLifecycle) startedLifecycleRef.current = null
      humanViewController.stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  function calculate() {
    const parsed = Number.parseFloat(grossProfitUsd)
    const grossProfitMinor = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
    const next = calculateAutopilotBreakEven({
      grossProfitMinor,
      pilotPriceMinor: AUTOPILOT_PILOT_PRICES[currency],
      monthlyPriceMinor: AUTOPILOT_PRICES[currency],
    })

    if (!next) {
      setResult(null)
      setError('Enter a gross profit amount greater than zero.')
      return
    }

    setResult(next)
    setError(null)
    void trackEvent('autopilot_break_even_calculated', {
      version: AUTOPILOT_BREAK_EVEN_VERSION,
      surface: 'pricing_autopilot',
      profit_band: autopilotProfitBand(next.grossProfitMinor),
      pilot_customers_bucket: autopilotCustomerCountBucket(next.pilotCustomers),
      monthly_customers_bucket: autopilotCustomerCountBucket(next.monthlyCustomers),
    })
  }

  function start(choice: 'pilot' | 'monthly') {
    if (!result) return
    void trackEvent('autopilot_break_even_checkout_clicked', {
      version: AUTOPILOT_BREAK_EVEN_VERSION,
      surface: 'pricing_autopilot',
      choice,
      profit_band: autopilotProfitBand(result.grossProfitMinor),
      pilot_customers_bucket: autopilotCustomerCountBucket(result.pilotCustomers),
      monthly_customers_bucket: autopilotCustomerCountBucket(result.monthlyCustomers),
    })
    if (choice === 'pilot') onStartPilot()
    else onStartMonthly()
  }

  return (
    <section
      aria-labelledby="autopilot-break-even-heading"
      ref={sectionRef}
      className="mt-7 rounded-xl border p-5 sm:p-6"
      style={{ borderColor: 'rgba(52,211,153,.32)', background: 'rgba(52,211,153,.055)' }}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_260px] md:items-end">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#34d399]">
            Customer break-even check
          </div>
          <h3 id="autopilot-break-even-heading" className="mt-1.5 text-[1.2rem] font-black tracking-tight text-[#f5f5f7]">
            How many new customers cover Autopilot?
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[#a3a3aa]">
            Enter the gross profit you keep from one new customer — revenue minus the direct cost of serving them. We&apos;ll do the arithmetic for the one-week pilot and the monthly service.
          </p>
        </div>

        <div>
          <label htmlFor="autopilot-gross-profit" className="block text-[11px] font-extrabold uppercase tracking-[.09em] text-[#d4d4d8]">
            Gross profit per customer · USD
          </label>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#71717a]">$</span>
              <input
                id="autopilot-gross-profit"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="1"
                value={grossProfitUsd}
                onChange={(event) => {
                  const value = event.target.value
                  setGrossProfitUsd(value)
                  setResult(null)
                  setError(null)
                  if (value.trim()) startedLifecycleRef.current?.start()
                }}
                placeholder="150"
                className="min-h-11 w-full rounded-lg border border-white/15 bg-black/35 py-2 pl-7 pr-3 text-[14px] font-bold text-white outline-none focus:border-[#34d399]"
              />
            </div>
            <button
              type="button"
              onClick={calculate}
              className="min-h-11 rounded-lg bg-[#34d399] px-4 text-[13px] font-black text-[#042016] transition hover:bg-[#4ade80]"
            >
              Calculate
            </button>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="mt-3 text-[12px] font-bold text-[#fda4af]">{error}</p> : null}

      {result ? (
        <div aria-live="polite" className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-[#2997ff]/30 bg-[#2997ff]/[.07] p-4">
            <div className="text-[10px] font-black uppercase tracking-[.1em] text-[#62b3ff]">7-day pilot</div>
            <strong className="mt-1 block text-[1.35rem] font-black text-white">{customerLabel(result.pilotCustomers)}</strong>
            <p className="mt-1 text-[12px] leading-relaxed text-[#a3a3aa]">
              At the profit you entered, that many attributed customers cover {formatCheckoutMoney(currency, AUTOPILOT_PILOT_PRICES[currency])} once.
            </p>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => start('pilot')}
              className="mt-3 w-full rounded-lg border border-[#2997ff] px-3 py-2.5 text-[12.5px] font-black text-[#62b3ff] transition hover:bg-[#2997ff] hover:text-white disabled:opacity-60"
            >
              {pending !== null ? 'Opening secure checkout…' : 'Start the one-week pilot →'}
            </button>
          </article>

          <article className="rounded-xl border border-[#34d399]/30 bg-[#34d399]/[.07] p-4">
            <div className="text-[10px] font-black uppercase tracking-[.1em] text-[#34d399]">Monthly Autopilot</div>
            <strong className="mt-1 block text-[1.35rem] font-black text-white">{customerLabel(result.monthlyCustomers)}</strong>
            <p className="mt-1 text-[12px] leading-relaxed text-[#a3a3aa]">
              At the profit you entered, that many attributed customers cover {formatCheckoutMoney(currency, AUTOPILOT_PRICES[currency])} for one month.
            </p>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => start('monthly')}
              className="mt-3 w-full rounded-lg bg-[#34d399] px-3 py-2.5 text-[12.5px] font-black text-[#042016] transition hover:bg-[#4ade80] disabled:opacity-60"
            >
              {pending !== null ? 'Opening secure checkout…' : 'Start monthly Autopilot →'}
            </button>
          </article>

          <p className="md:col-span-2 m-0 text-[11.5px] leading-relaxed text-[#85858c]">
            This is arithmetic, not a forecast or a promise of customers, leads, views or revenue. It excludes taxes, ad spend, refunds and operating costs. Count only a customer you can actually attribute to the videos.
          </p>
        </div>
      ) : null}
    </section>
  )
}
