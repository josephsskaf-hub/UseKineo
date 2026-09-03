'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackClosedEvent, type BrowserEventPersistence } from '@/lib/analytics'
import {
  BUSINESS_PILOT_DECISIONS,
  BUSINESS_PILOT_OPTIONS,
  DEFAULT_BUSINESS_PILOT_SELECTION,
  buildBusinessPilotResponse,
  buildBusinessPilotResponseAsset,
  buildBusinessPilotReviewAsset,
  buildBusinessPilotReviewMemo,
  buildBusinessPilotReviewPricingHref,
  businessPilotDecisionMetadata,
  businessPilotReviewMetadata,
  isBusinessPilotResponseReferral,
  isBusinessPilotReviewReferral,
  readBusinessPilotDecisionSearch,
  readBusinessPilotReviewSearch,
  requestBusinessPilotReviewShare,
  type BusinessPilotDecision,
  type BusinessPilotSelection,
} from '@/lib/growth/businessPilotReview'

type ShareState = 'idle' | 'sharing' | 'native' | 'clipboard' | 'manual'
type EntryMode = 'builder' | 'review' | 'response'
type BoundedPersistence = BrowserEventPersistence | 'timeout' | 'not_applicable'

async function settleTelemetry(
  promise: Promise<BrowserEventPersistence> | null,
  timeoutMs = 450,
): Promise<BoundedPersistence> {
  if (!promise) return 'not_applicable'
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => window.setTimeout(() => resolve('timeout'), timeoutMs)),
  ])
}

export default function BusinessPilotReviewClient() {
  const [selection, setSelection] = useState<BusinessPilotSelection>(DEFAULT_BUSINESS_PILOT_SELECTION)
  const [built, setBuilt] = useState(false)
  const [entryMode, setEntryMode] = useState<EntryMode>('builder')
  const [decision, setDecision] = useState<BusinessPilotDecision | null>(null)
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [pricingOpening, setPricingOpening] = useState(false)
  const shareInFlight = useRef(false)
  const shareVersion = useRef(0)
  const viewTracked = useRef(false)
  const arrivalPersistence = useRef<Promise<BrowserEventPersistence> | null>(null)
  const decisionPersistence = useRef<Promise<BrowserEventPersistence> | null>(null)
  const manualShareRef = useRef<HTMLTextAreaElement>(null)
  const noteTitleRef = useRef<HTMLHeadingElement>(null)
  const responseTitleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (viewTracked.current) return
    viewTracked.current = true
    const search = new URLSearchParams(window.location.search)
    const fromUrl = readBusinessPilotReviewSearch(search)
    const responseDecision = readBusinessPilotDecisionSearch(search)
    const mode: EntryMode = isBusinessPilotResponseReferral(search)
      ? 'response'
      : isBusinessPilotReviewReferral(search)
        ? 'review'
        : 'builder'
    setSelection(fromUrl)
    setDecision(mode === 'response' ? responseDecision : null)
    setEntryMode(mode)
    setBuilt(mode !== 'builder')
    const metadata = { ...businessPilotReviewMetadata(fromUrl), entry: mode }
    void trackClosedEvent('business_pilot_review_viewed', metadata)
    if (mode === 'review') {
      arrivalPersistence.current = trackClosedEvent('business_pilot_review_received', metadata)
    } else if (mode === 'response' && responseDecision) {
      arrivalPersistence.current = trackClosedEvent('business_pilot_review_response_received', {
        ...businessPilotDecisionMetadata(fromUrl, responseDecision),
        entry: mode,
      })
    }
  }, [])

  useEffect(() => {
    if (shareState !== 'manual') return
    manualShareRef.current?.focus()
    manualShareRef.current?.select()
  }, [shareState])

  useEffect(() => {
    if (!built) return
    noteTitleRef.current?.focus()
  }, [built])

  useEffect(() => {
    if (!decision || entryMode !== 'review') return
    responseTitleRef.current?.focus()
  }, [decision, entryMode])

  function changeSelection<Key extends keyof BusinessPilotSelection>(key: Key, value: BusinessPilotSelection[Key]) {
    shareVersion.current += 1
    setSelection((current) => ({ ...current, [key]: value }))
    setDecision(null)
    setBuilt(false)
    setShareState('idle')
  }

  function buildNote() {
    shareVersion.current += 1
    setBuilt(true)
    setShareState('idle')
    void trackClosedEvent('business_pilot_review_built', businessPilotReviewMetadata(selection))
  }

  async function runShare(
    asset: ReturnType<typeof buildBusinessPilotReviewAsset>,
    eventName: 'business_pilot_review_handoff_prepared' | 'business_pilot_review_response_prepared',
    metadata: Record<string, unknown>,
  ) {
    if (shareInFlight.current) return
    shareInFlight.current = true
    const version = shareVersion.current
    setShareState('sharing')
    try {
      const outcome = await requestBusinessPilotReviewShare(asset, navigator)
      if (version !== shareVersion.current) return
      if (outcome === 'native' || outcome === 'clipboard') {
        void trackClosedEvent(eventName, { ...metadata, method: outcome })
        setShareState(outcome)
      } else {
        setShareState(outcome === 'cancelled' ? 'idle' : 'manual')
      }
    } finally {
      shareInFlight.current = false
    }
  }

  function shareNote() {
    return runShare(
      buildBusinessPilotReviewAsset(selection),
      'business_pilot_review_handoff_prepared',
      businessPilotReviewMetadata(selection),
    )
  }

  function chooseDecision(nextDecision: BusinessPilotDecision) {
    shareVersion.current += 1
    setDecision(nextDecision)
    setShareState('idle')
    decisionPersistence.current = trackClosedEvent(
      'business_pilot_review_decision_recorded',
      businessPilotDecisionMetadata(selection, nextDecision),
    )
  }

  function shareResponse(currentDecision: BusinessPilotDecision) {
    return runShare(
      buildBusinessPilotResponseAsset(selection, currentDecision),
      'business_pilot_review_response_prepared',
      businessPilotDecisionMetadata(selection, currentDecision),
    )
  }

  async function goToPricing(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (pricingOpening) return
    setPricingOpening(true)
    const arrivalState = await settleTelemetry(arrivalPersistence.current)
    const decisionState = entryMode === 'review'
      ? await settleTelemetry(decisionPersistence.current)
      : 'not_applicable'
    const clickPersistence = trackClosedEvent('business_pilot_review_pricing_clicked', {
      ...businessPilotReviewMetadata(selection),
      destination: 'pricing',
      entry: entryMode,
      decision: decision ?? 'none',
      arrival_persistence: arrivalState,
      decision_persistence: decisionState,
    })
    await settleTelemetry(clickPersistence)
    window.location.assign(buildBusinessPilotReviewPricingHref())
  }

  const memo = buildBusinessPilotReviewMemo(selection)
  const response = decision ? buildBusinessPilotResponse(selection, decision) : null
  const manualAsset = decision && entryMode === 'review'
    ? buildBusinessPilotResponseAsset(selection, decision)
    : buildBusinessPilotReviewAsset(selection)
  const pricingHref = buildBusinessPilotReviewPricingHref()
  const canReviewPlans = entryMode === 'builder' || decision === 'approve_limited_evaluation'

  return (
    <div className="bpr-client">
      {entryMode === 'builder' ? (
        <section className="bpr-builder" aria-labelledby="bpr-builder-title">
          <div className="bpr-step">1 · Frame the evaluation</div>
          <h2 id="bpr-builder-title">What does the internal reviewer need to decide?</h2>
          <div className="bpr-fields">
            <label>
              Use case
              <select value={selection.useCase} onChange={(event) => changeSelection('useCase', event.target.value as BusinessPilotSelection['useCase'])}>
                {BUSINESS_PILOT_OPTIONS.useCase.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Intended cadence
              <select value={selection.cadence} onChange={(event) => changeSelection('cadence', event.target.value as BusinessPilotSelection['cadence'])}>
                {BUSINESS_PILOT_OPTIONS.cadence.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Reviewer
              <select value={selection.reviewer} onChange={(event) => changeSelection('reviewer', event.target.value as BusinessPilotSelection['reviewer'])}>
                {BUSINESS_PILOT_OPTIONS.reviewer.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <p className="bpr-privacy">Besides fixed campaign labels, the shared link contains only these three choices. No name, company, brief or customer text is collected.</p>
          <button type="button" className="bpr-build" onClick={buildNote}>Build the decision note →</button>
        </section>
      ) : null}

      {built ? (
        <section className="bpr-note" aria-labelledby="bpr-note-title">
          <div className="bpr-step">{entryMode === 'builder' ? '2 · Review before sharing' : 'Evaluation received'}</div>
          <h2 id="bpr-note-title" ref={noteTitleRef} tabIndex={-1}>Internal pilot decision note</h2>
          <pre>{memo}</pre>

          {entryMode === 'builder' ? (
            <div className="bpr-actions">
              <button type="button" onClick={() => void shareNote()} disabled={shareState === 'sharing'}>
                {shareState === 'sharing' ? 'Preparing note…' : shareState === 'native' ? '✓ Sharing options opened' : shareState === 'clipboard' ? '✓ Note copied' : 'Prepare the handoff'}
              </button>
              <Link href={pricingHref} aria-disabled={pricingOpening} onClick={(event) => void goToPricing(event)}>
                {pricingOpening ? 'Opening plans…' : 'Review current plans →'}
              </Link>
            </div>
          ) : null}

          {entryMode === 'review' ? (
            <div className="bpr-decision" aria-labelledby="bpr-decision-title">
              <div className="bpr-step">Reviewer response</div>
              <h3 id="bpr-decision-title">What should the evaluation owner do next?</h3>
              <div className="bpr-decision-options">
                {BUSINESS_PILOT_DECISIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={decision === option.value}
                    onClick={() => chooseDecision(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {response ? (
                <div className="bpr-response">
                  <h3 ref={responseTitleRef} tabIndex={-1}>Response ready to return</h3>
                  <span className="bpr-status" role="status" aria-live="polite">The selected response is ready to review and send back.</span>
                  <pre>{response}</pre>
                  <div className="bpr-actions">
                    <button type="button" onClick={() => { if (decision) void shareResponse(decision) }} disabled={shareState === 'sharing'}>
                      {shareState === 'sharing' ? 'Preparing response…' : shareState === 'native' ? '✓ Sharing options opened' : shareState === 'clipboard' ? '✓ Response copied' : 'Prepare response for the owner'}
                    </button>
                    {canReviewPlans ? (
                      <Link href={pricingHref} aria-disabled={pricingOpening} onClick={(event) => void goToPricing(event)}>
                        {pricingOpening ? 'Opening plans…' : 'Review current plans →'}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {entryMode === 'response' && response ? (
            <div className="bpr-response">
              <div className="bpr-step">Response returned</div>
              <h3>The reviewer&apos;s selected next step</h3>
              <pre>{response}</pre>
              {canReviewPlans ? (
                <div className="bpr-actions">
                  <Link href={pricingHref} aria-disabled={pricingOpening} onClick={(event) => void goToPricing(event)}>
                    {pricingOpening ? 'Opening plans…' : 'Review current plans →'}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <span className="bpr-status" role="status" aria-live="polite" aria-atomic="true">
            {shareState === 'native' ? 'Sharing options opened. Delivery to another person is not assumed.' : shareState === 'clipboard' ? 'The handoff text was copied. Delivery to another person is not assumed.' : shareState === 'manual' ? "Sharing isn't available here. Select and copy the text below." : ''}
          </span>
          {shareState === 'manual' ? (
            <label className="bpr-manual">
              Select and copy the handoff
              <textarea ref={manualShareRef} readOnly value={manualAsset.clipboardText} onFocus={(event) => event.currentTarget.select()} rows={12} />
            </label>
          ) : null}

          <nav className="bpr-references" aria-label="Current Kineo terms and scope">
            <Link href="/trust">Trust center</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/agency-production-scope.txt">Public product scope</Link>
          </nav>
          <p className="bpr-disclaimer">Internal evaluation draft only. Not a contract, certification, legal approval or ROI forecast. This tool prepares a response; it does not route approvals.</p>
        </section>
      ) : null}
    </div>
  )
}
