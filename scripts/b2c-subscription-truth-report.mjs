import {
  isInternalMeasurementEmail,
  readCanonicalStringArray,
  readCanonicalStringConstant,
} from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'
import {
  buildSubscriptionSessionOutcomeReport,
  subscriptionSessionReference,
} from './subscription-session-outcome-report.mjs'
import {
  classifyStart as classifyAttemptStart,
  classifySurface as classifyAttemptSurface,
} from './post-delivery-checkout-origin-report.mjs'

export const B2C_SUBSCRIPTION_TRUTH_VERSION = 'b2c_subscription_truth_v1'
export const B2C_SUBSCRIPTION_TRUTH_WINDOW_DAYS = 30
export const B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS = 30
export const B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS = 60_000
export const B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_RACE_MS = 5_000
export const B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE = 20
export const B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE = 5
export const B2C_SUBSCRIPTION_TRUTH_MIN_DAYS = 7
export const B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO = 0.2
export const B2C_TERMINAL_SURFACE_MIN_PEOPLE = 5
export const B2C_TERMINAL_SURFACE_MIN_SURFACES = 2
export const B2C_TERMINAL_SURFACE_MIN_DAYS = 7
export const RESULT_VALUE_COHORT_BOUNDARY = '2026-09-01T18:48:08.098670+00:00'
export const TRIAL_POST_VIDEO_VARIANT_BOUNDARY = '2026-08-29T18:21:09.000Z'

const POST_VIDEO_OFFER_VARIANTS = new Set(readCanonicalStringArray(
  new URL('../lib/growth/chatgptPostVideoOffer.ts', import.meta.url),
  'POST_VIDEO_OFFER_VARIANTS',
))
const TRIAL_POST_VIDEO_VARIANT_BOUNDARY_MS = Date.parse(TRIAL_POST_VIDEO_VARIANT_BOUNDARY)

const HISTORY_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/historyFirstVideoOfferHumanView.ts', import.meta.url),
  'HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION',
)
const RESUME_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/checkoutResumeHumanView.ts', import.meta.url),
  'CHECKOUT_RESUME_HUMAN_VIEW_VERSION',
)
const INLINE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/inlinePricingDecision.ts', import.meta.url),
  'INLINE_PRICING_DECISION_VERSION',
)
const RESULT_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/resultVideoValueSample.ts', import.meta.url),
  'RESULT_VIDEO_VALUE_SAMPLED_VERSION',
)
const WELCOME_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/welcomeOfferFrequency.ts', import.meta.url),
  'WELCOME_OFFER_FREQUENCY_VERSION',
)
const PLAN_FIT_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/planFit.ts', import.meta.url),
  'PLAN_FIT_OFFER_VERSION',
)
const BALANCE_BRIDGE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialBalanceBridge.ts', import.meta.url),
  'TRIAL_BALANCE_BRIDGE_VERSION',
)
const DOWNGRADE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialDowngradeHumanView.ts', import.meta.url),
  'TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION',
)
const QUICKSTART_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/chatgptQuickstart.ts', import.meta.url),
  'CHATGPT_QUICKSTART_VARIANT',
)
const PUBLIC_PROMO_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/publicPromoTruth.ts', import.meta.url),
  'PUBLIC_PROMO_TRUTH_VERSION',
)
const TRIAL_ACTIVE_SUBSCRIPTION_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialActiveSubscriptionCta.ts', import.meta.url),
  'TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION',
)

const EXPERIMENTS = Object.freeze({
  result_value_sample: Object.freeze({ role: 'value_mediator', gate: { firstDeliveryPeople: 20, sampledPeople: 5, notSampledPeople: 5, days: 7 } }),
  history_offer: Object.freeze({ role: 'offer', gate: { people: 10, days: 0, exactPaymentShortcut: true } }),
  checkout_resume: Object.freeze({ role: 'recovery_assist', gate: { people: 5, days: 7, exactPaymentShortcut: false } }),
  inline_pricing: Object.freeze({ role: 'offer', gate: { people: 20, days: 7, exactPaymentShortcut: true } }),
  welcome_offer: Object.freeze({ role: 'offer', gate: { people: 5, days: 7, exactPaymentShortcut: false } }),
  plan_fit: Object.freeze({ role: 'offer', gate: { people: 10, days: 0, exactPaymentShortcut: true } }),
  trial_post_video: Object.freeze({ role: 'offer', gate: { people: 10, days: 7, exactPaymentShortcut: true } }),
  trial_downgrade: Object.freeze({ role: 'offer', gate: { people: 20, days: 0, exactPaymentShortcut: true } }),
  trial_balance_result: Object.freeze({ role: 'activation_mediator', gate: null }),
  trial_balance_return: Object.freeze({ role: 'return_mediator', gate: null }),
  chatgpt_quickstart: Object.freeze({ role: 'acquisition_assist', gate: null }),
  trial_active_subscription: Object.freeze({ role: 'offer', gate: { people: 20, clickPathPeople: 5, days: 7, exactPaymentShortcut: true } }),
})

export const B2C_SUBSCRIPTION_TRUTH_EVENT_NAMES = Object.freeze([
  'result_video_value_sampled',
  'history_first_video_offer_viewed',
  'checkout_resume_choice_viewed',
  'inline_pricing_value_anchor_viewed',
  'welcome_offer_viewed',
  'plan_fit_checkout_cta_viewed',
  'trial_post_video_offer_viewed',
  'trial_downgrade_offer_viewed',
  'trial_balance_bridge_viewed',
  'trial_active_subscription_cta_viewed',
  'chatgpt_welcome_banner_shown',
  'welcome_offer_checkout_clicked',
  'checkout_cta_clicked',
  'checkout_attempted',
  'checkout_started',
  'payment_success',
  'checkout_session_expired',
])

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataNumber(row, key) {
  const value = row?.metadata?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value)
  return null
}

function metadataBoolean(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'boolean' ? value : null
}

function compareRows(left, right) {
  return timestamp(left) - timestamp(right) || String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function identityIndex(profiles) {
  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) unknown.add(profile.id)
    else if (isInternalMeasurementEmail(email)) internal.add(profile.id)
    else external.add(profile.id)
  }
  return { external, internal, unknown }
}

function firstCompletedVideoByUser(videos) {
  const first = new Map()
  for (const video of [...videos].sort(compareRows)) {
    if (!video?.user_id || video.status !== 'completed' || timestamp(video) === null) continue
    if (!first.has(video.user_id)) first.set(video.user_id, video)
  }
  return first
}

function exposureDefinition(row) {
  const version = metadataString(row, 'version')
  if (
    row.name === 'result_video_value_sampled' &&
    version === RESULT_VERSION &&
    metadataString(row, 'first_delivery_status') === 'confirmed'
  ) return 'result_value_sample'
  if (row.name === 'history_first_video_offer_viewed' && version === HISTORY_VERSION) return 'history_offer'
  if (row.name === 'checkout_resume_choice_viewed' && version === RESUME_VERSION) return 'checkout_resume'
  if (row.name === 'inline_pricing_value_anchor_viewed' && version === INLINE_VERSION) return 'inline_pricing'
  if (row.name === 'welcome_offer_viewed' && version === WELCOME_VERSION) return 'welcome_offer'
  if (
    row.name === 'plan_fit_checkout_cta_viewed' &&
    metadataString(row, 'offer_version') === PLAN_FIT_VERSION &&
    metadataString(row, 'event_unit') === 'first_completed_video'
  ) return 'plan_fit'
  if (
    row.name === 'trial_post_video_offer_viewed' &&
    metadataString(row, 'source') === 'result_trial_continue' &&
    timestamp(row) >= TRIAL_POST_VIDEO_VARIANT_BOUNDARY_MS &&
    POST_VIDEO_OFFER_VARIANTS.has(metadataString(row, 'offer_layout'))
  ) {
    return 'trial_post_video'
  }
  if (row.name === 'trial_downgrade_offer_viewed' && version === DOWNGRADE_VERSION) return 'trial_downgrade'
  if (row.name === 'trial_balance_bridge_viewed' && metadataString(row, 'bridge_version') === BALANCE_BRIDGE_VERSION) {
    if (metadataString(row, 'source') === 'result_trial_balance_bridge') return 'trial_balance_result'
    if (metadataString(row, 'source') === 'trial_active_banner_return') return 'trial_balance_return'
  }
  if (row.name === 'chatgpt_welcome_banner_shown' && metadataString(row, 'variant') === QUICKSTART_VERSION) {
    return 'chatgpt_quickstart'
  }
  if (
    row.name === 'trial_active_subscription_cta_viewed' &&
    metadataString(row, 'offer_version') === TRIAL_ACTIVE_SUBSCRIPTION_VERSION &&
    metadataString(row, 'offer_mode') === 'trial_active_subscription' &&
    metadataString(row, 'surface') === 'trial_active_banner' &&
    metadataString(row, 'delivery_evidence') === 'api_videos_completed_count_gte_1' &&
    metadataBoolean(row, 'return_ladder_rendered') !== null &&
    row?.metadata?.human_exposure_claimed === true
  ) return 'trial_active_subscription'
  return null
}

const SURFACE_EXPERIMENT = new Map([
  ['generate_step_1', 'inline_pricing'],
  ['history_starter_upgrade', 'history_offer'],
  ['generate_plan_fit', 'plan_fit'],
  ['generate_trial_post_video', 'trial_post_video'],
  ['trial_downgrade_modal', 'trial_downgrade'],
  ['trial_active_banner', 'trial_active_subscription'],
])

// Closed vocabulary from fixed `useCheckoutLaunch()` callers that can lead to
// a recurring subscription. Dynamic top-up surfaces are intentionally absent:
// pack purchases must never enter subscription truth. Unknown metadata is
// counted as a quality gap and is never echoed in report output.
const TERMINAL_SURFACE_ALLOWLIST = new Set([
  'checkout_cancelled',
  'checkout_resume_banner',
  'exit_intent_offer',
  'generate_exit_intent_upgrade',
  'generate_low_credits',
  'generate_offer290_banner',
  'generate_plan_fit',
  'generate_post_video_upsell',
  'generate_step_1',
  'generate_trial_post_video',
  'generate_upgrade_modal',
  'generate_upsell_section',
  'generate_urgency_modal',
  'generate_watermark_unlock',
  'history_starter_upgrade',
  'my_videos_unlock_clean_export',
  'post_video_paywall',
  'pricing_page',
  'pricing_saved_checkout',
  'trial_active_banner',
  'trial_downgrade_modal',
])

function isRecurring24hStart(row) {
  return row?.name === 'checkout_started' &&
    !metadataString(row, 'sku') &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    ['starter', 'basic', 'pro', 'autopilot'].includes(metadataString(row, 'tier')) &&
    ['monthly', 'annual'].includes(metadataString(row, 'billing')) &&
    !(metadataString(row, 'tier') === 'autopilot' && metadataString(row, 'billing') !== 'monthly') &&
    metadataString(row, 'checkout_session_window_version') === 'recurring_checkout_24h_v1' &&
    metadataNumber(row, 'checkout_session_window_hours') === 24
}

function hasPriorExposure(exposuresByUser, userId, experiment, at) {
  return (exposuresByUser.get(userId) ?? []).some((row) => row.experiment === experiment && row.at <= at)
}

function clickMatchesExperiment(row, experiment) {
  if (experiment !== 'trial_active_subscription') return true
  return metadataString(row, 'offer_version') === TRIAL_ACTIVE_SUBSCRIPTION_VERSION &&
    metadataString(row, 'offer_mode') === 'trial_active_subscription' &&
    metadataBoolean(row, 'return_ladder_rendered') !== null
}

function trialActiveClickContext(rows) {
  const values = new Set(rows.map((row) => metadataBoolean(row, 'return_ladder_rendered')).filter((value) => value !== null))
  if (values.size !== 1) return { valid: false, returnLadderRendered: null }
  return { valid: true, returnLadderRendered: [...values][0] }
}

function exactStartRow(record, startsByStripeSession) {
  const rows = startsByStripeSession.get(record.stripeSessionId) ?? []
  if (rows.length === 0 || rows.some((row) => row.user_id !== record.ownerUserId)) return null
  const semantics = new Set(rows.map((row) => JSON.stringify({
    userId: row.user_id ?? null,
    browserSession: row.session_id ?? null,
    tier: metadataString(row, 'tier'),
    billing: metadataString(row, 'billing'),
    sku: metadataString(row, 'sku'),
    windowVersion: metadataString(row, 'checkout_session_window_version'),
    windowHours: metadataNumber(row, 'checkout_session_window_hours'),
  })))
  return semantics.size === 1 ? [...rows].sort(compareRows)[0] : null
}

function classifyOrigin(record, startsByStripeSession, clicks, welcomeClicks, exposuresByUser, firstVideos) {
  const start = exactStartRow(record, startsByStripeSession)
  if (!start) return { status: 'unknown', experiment: null, reason: 'no_unique_matching_start' }
  const startAt = timestamp(start)
  const browserSession = start.session_id
  if (!browserSession) return { status: 'unknown', experiment: null, reason: 'start_without_browser_session' }

  const standard = clicks.filter((click) => {
    const clickAt = timestamp(click)
    return click.session_id === browserSession &&
      (!click.user_id || click.user_id === record.ownerUserId) &&
      clickAt !== null &&
      clickAt >= startAt - B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS &&
      clickAt <= startAt + B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_RACE_MS
  })
  if (standard.some((row) => timestamp(row) > startAt)) {
    return { status: 'ambiguous', experiment: null, reason: 'click_persistence_race' }
  }
  const surfaces = new Set(standard.map((row) => metadataString(row, 'surface')).filter(Boolean))
  if (surfaces.size > 1) return { status: 'ambiguous', experiment: null, reason: 'multiple_checkout_surfaces' }
  if (surfaces.size === 1) {
    const surface = [...surfaces][0]
    if (surface === 'checkout_resume_banner') {
      return { status: 'unknown_resume_gap', experiment: null, reason: 'resume_has_no_server_side_origin_destination_link' }
    }
    const experiment = SURFACE_EXPERIMENT.get(surface) ?? null
    if (!experiment) return { status: 'other', experiment: null, reason: 'known_non_experiment_surface' }
    const matchingExperimentClicks = standard.filter((row) =>
      metadataString(row, 'surface') === surface && clickMatchesExperiment(row, experiment),
    )
    if (matchingExperimentClicks.length === 0) {
      return { status: 'ineligible', experiment: null, reason: 'checkout_click_contract_mismatch' }
    }
    const clickContext = experiment === 'trial_active_subscription'
      ? trialActiveClickContext(matchingExperimentClicks)
      : { valid: true, returnLadderRendered: null }
    if (!clickContext.valid) {
      return { status: 'ambiguous', experiment: null, reason: 'trial_active_return_ladder_context_conflict' }
    }
    if (!hasPriorExposure(exposuresByUser, record.ownerUserId, experiment, startAt)) {
      if (experiment === 'trial_active_subscription') {
        const firstVideoAt = timestamp(firstVideos.get(record.ownerUserId))
        const versionedPostDeliveryClick = firstVideoAt !== null && matchingExperimentClicks.some((row) => {
          const clickAt = timestamp(row)
          return clickAt !== null && firstVideoAt <= clickAt
        })
        if (versionedPostDeliveryClick) {
          return {
            status: 'exact',
            experiment,
            reason: 'same_browser_session_versioned_click_without_dwell',
            returnLadderRendered: clickContext.returnLadderRendered,
          }
        }
      }
      return { status: 'ineligible', experiment: null, reason: 'surface_without_prior_valid_exposure' }
    }
    return {
      status: 'exact',
      experiment,
      reason: 'same_browser_session_click_and_start',
      returnLadderRendered: clickContext.returnLadderRendered,
    }
  }

  const serverOrigin = metadataString(start, 'checkout_origin')
  if (serverOrigin === 'welcome20_modal') {
    const matchingWelcome = welcomeClicks.filter((click) => {
      const clickAt = timestamp(click)
      return click.user_id === record.ownerUserId &&
        click.session_id === browserSession &&
        clickAt !== null && clickAt <= startAt &&
        startAt - clickAt <= B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS &&
        metadataString(click, 'version') === WELCOME_VERSION
    })
    const promoApplied = metadataString(start, 'public_promo_truth_version') === PUBLIC_PROMO_VERSION &&
      metadataString(start, 'public_promo_kind') === 'welcome_first_month_20' &&
      metadataString(start, 'public_promo_state') === 'applied'
    if (!promoApplied) return { status: 'ineligible', experiment: null, reason: 'welcome_promise_not_proven_applied' }
    if (matchingWelcome.length === 0) return { status: 'unknown', experiment: null, reason: 'welcome_click_not_same_browser_session' }
    if (!hasPriorExposure(exposuresByUser, record.ownerUserId, 'welcome_offer', startAt)) {
      return { status: 'ineligible', experiment: null, reason: 'welcome_without_prior_valid_exposure' }
    }
    return { status: 'exact', experiment: 'welcome_offer', reason: 'welcome_click_start_and_promo_truth_match' }
  }
  return { status: 'unknown', experiment: null, reason: 'no_exact_checkout_origin' }
}

function setSize(rows, selector) {
  return new Set(rows.map(selector).filter(Boolean)).size
}

function histogram(rows, selector) {
  const counts = new Map()
  for (const row of rows) {
    const key = selector(row)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function isRecurringAttempt(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  return row?.name === 'checkout_attempted' &&
    !metadataString(row, 'sku') &&
    ['starter', 'basic', 'pro', 'autopilot'].includes(tier) &&
    ['monthly', 'annual'].includes(billing) &&
    !(tier === 'autopilot' && billing !== 'monthly')
}

function terminalRevenueByCurrency(rows) {
  const totals = new Map()
  for (const row of rows) {
    if (
      row.outcome !== 'paid' ||
      row.record.status !== 'paid' ||
      !row.record.paidInWindow ||
      !row.record.currency ||
      !Number.isSafeInteger(row.record.amountMinor) ||
      row.record.amountMinor <= 0
    ) continue
    totals.set(row.record.currency, (totals.get(row.record.currency) ?? 0) + row.record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function buildTerminalSurfaceTruth({
  generatedAt,
  windowStart,
  generatedAtMs,
  windowStartMs,
  ordered,
  profiles,
  identity,
  externalStarts,
  startsByStripeSession,
}) {
  const strictStarts = ordered.filter((row) =>
    isRecurring24hStart(row) &&
    timestamp(row) >= windowStartMs &&
    identity.external.has(row.user_id))
  const strictSessionIds = new Set(strictStarts
    .map((row) => metadataString(row, 'stripe_session_id'))
    .filter(Boolean))
  const strictV1StartContractConflictStripeSessions = [...strictSessionIds].filter((stripeSessionId) => {
    const rows = startsByStripeSession.get(stripeSessionId) ?? []
    if (rows.length === 0 || rows.some((row) => !isRecurring24hStart(row))) return true
    const semantics = new Set(rows.map((row) => JSON.stringify({
      userId: row.user_id ?? null,
      browserSession: row.session_id ?? null,
      tier: metadataString(row, 'tier'),
      billing: metadataString(row, 'billing'),
      sku: metadataString(row, 'sku'),
      windowVersion: metadataString(row, 'checkout_session_window_version'),
      windowHours: metadataNumber(row, 'checkout_session_window_hours'),
    })))
    return semantics.size !== 1
  }).length
  const attempts = ordered.filter(isRecurringAttempt)
  const exactUserClicks = ordered.filter((row) => row.name === 'checkout_cta_clicked' && row.user_id)
  // The terminal-surface gate belongs only to recurring_checkout_24h_v1.
  // Legacy payments and unrelated Sessions remain visible in financialTruth,
  // but cannot block (or improve) this contract's attribution quality.
  const outcomeEvents = ordered.filter((row) => {
    const stripeSessionId = metadataString(row, 'stripe_session_id')
    return stripeSessionId !== null && strictSessionIds.has(stripeSessionId)
  })
  const outcomeReport = buildSubscriptionSessionOutcomeReport({
    generatedAt,
    windowStart,
    events: outcomeEvents,
    profiles,
  })
  const outcomeConflictSessions = outcomeReport.sessions.filter((row) => row.outcome === 'conflict').length
  const outcomeQualityBlocked = outcomeConflictSessions > 0 ||
    strictV1StartContractConflictStripeSessions > 0 ||
    outcomeReport.quality.subscriptionStartStripeSessionConflicts > 0 ||
    outcomeReport.quality.ledgerConflictStripeSessions > 0 ||
    outcomeReport.quality.unlinkedSubscriptionPaymentSessions > 0
  const outcomesByReference = new Map()
  for (const row of outcomeReport.sessions) {
    const rows = outcomesByReference.get(row.sessionReference) ?? []
    rows.push(row)
    outcomesByReference.set(row.sessionReference, rows)
  }

  const candidates = externalStarts.flatMap((record) => {
    const rawStartRows = startsByStripeSession.get(record.stripeSessionId) ?? []
    if (!rawStartRows.some(isRecurring24hStart)) return []
    const start = exactStartRow(record, startsByStripeSession)
    if (!start || !isRecurring24hStart(start)) {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'ambiguous', reason: 'start_contract_conflict' }]
    }
    const matchingAttempts = attempts.flatMap((attempt) => {
      if (attempt.user_id !== record.ownerUserId) return []
      const resolvedStart = classifyAttemptStart(attempt, strictStarts)
      return resolvedStart.status === 'exact' && resolvedStart.stripeSessionId === record.stripeSessionId
        ? [{ attempt, resolvedStart }]
        : []
    })
    if (matchingAttempts.length === 0) {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'missing', reason: 'no_exact_attempt_to_start_chain' }]
    }
    if (matchingAttempts.length > 1) {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'ambiguous', reason: 'multiple_attempts_for_session' }]
    }
    const surface = classifyAttemptSurface(
      matchingAttempts[0].attempt,
      exactUserClicks.filter((row) => row.user_id === record.ownerUserId),
      {
        expectedTier: metadataString(matchingAttempts[0].attempt, 'tier'),
        expectedBilling: metadataString(matchingAttempts[0].attempt, 'billing'),
      },
    )
    if (surface.status !== 'exact') {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: surface.status, reason: surface.reason }]
    }
    if (!TERMINAL_SURFACE_ALLOWLIST.has(surface.surface)) {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'unknown', reason: 'surface_outside_allowlist' }]
    }
    if (Date.parse(record.startedAt) - surface.evidenceClickAtMs > B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS) {
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'ambiguous', reason: 'click_to_start_window_exceeded' }]
    }
    const outcomes = outcomesByReference.get(subscriptionSessionReference(record.stripeSessionId)) ?? []
    if (outcomes.length !== 1) {
      const reason = outcomes.length === 0 ? 'missing_exact_session_outcome' : 'session_reference_collision'
      return [{ record, userId: record.ownerUserId, startedAt: record.startedAt, originStatus: 'ambiguous', reason }]
    }
    const outcome = outcomes[0]
    return [{
      record,
      userId: record.ownerUserId,
      startedAt: record.startedAt,
      stripeSessionId: record.stripeSessionId,
      originStatus: 'exact',
      reason: 'exact_click_attempt_start_chain',
      surface: surface.surface,
      evidenceClickIds: surface.evidenceClickIds ?? [],
      outcome: outcome.outcome,
    }]
  })

  const clickOwners = new Map()
  for (const [index, row] of candidates.entries()) {
    if (row.originStatus !== 'exact') continue
    for (const clickId of row.evidenceClickIds) {
      const owners = clickOwners.get(clickId) ?? []
      owners.push(index)
      clickOwners.set(clickId, owners)
    }
  }
  for (const owners of clickOwners.values()) {
    const sessions = new Set(owners.map((index) => candidates[index].stripeSessionId))
    if (sessions.size < 2) continue
    for (const index of owners) {
      candidates[index].originStatus = 'ambiguous'
      candidates[index].reason = 'one_click_linked_to_multiple_sessions'
      candidates[index].surface = null
    }
  }

  const exact = candidates.filter((row) => row.originStatus === 'exact')
  const byPersonSurface = new Map()
  for (const row of exact) {
    const key = `${row.userId}\u0000${row.surface}`
    const rows = byPersonSurface.get(key) ?? []
    rows.push(row)
    byPersonSurface.set(key, rows)
  }
  const canonical = []
  let laterSessionsExcluded = 0
  let canonicalTiePeople = 0
  for (const rows of byPersonSurface.values()) {
    rows.sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt) ||
      left.stripeSessionId.localeCompare(right.stripeSessionId))
    const firstAt = Date.parse(rows[0].startedAt)
    if (rows.filter((row) => Date.parse(row.startedAt) === firstAt).length > 1) {
      canonicalTiePeople += 1
      for (const row of rows) {
        row.originStatus = 'ambiguous'
        row.reason = 'same_person_surface_first_session_tie'
      }
      continue
    }
    canonical.push(rows[0])
    laterSessionsExcluded += Math.max(0, rows.length - 1)
  }

  const surfaceNames = [...new Set(canonical.map((row) => row.surface))].sort()
  const surfaces = surfaceNames.map((surface) => {
    const rows = canonical.filter((row) => row.surface === surface)
    const terminal = rows.filter((row) => row.outcome === 'paid' || row.outcome === 'expired_unpaid')
    const firstAt = rows.length ? Math.min(...rows.map((row) => Date.parse(row.startedAt))) : null
    const days = firstAt === null ? null : Math.max(0, (generatedAtMs - firstAt) / 86_400_000)
    return {
      surface,
      canonicalStartedPeople: new Set(rows.map((row) => row.userId)).size,
      canonicalStartedStripeSessions: rows.length,
      terminalExactPeople: new Set(terminal.map((row) => row.userId)).size,
      terminalExactStripeSessions: terminal.length,
      paidPeople: new Set(terminal.filter((row) => row.outcome === 'paid').map((row) => row.userId)).size,
      paidStripeSessions: terminal.filter((row) => row.outcome === 'paid').length,
      expiredUnpaidPeople: new Set(terminal.filter((row) => row.outcome === 'expired_unpaid').map((row) => row.userId)).size,
      expiredUnpaidStripeSessions: terminal.filter((row) => row.outcome === 'expired_unpaid').length,
      nonTerminalOutcomeCounts: histogram(rows.filter((row) => !terminal.includes(row)), (row) => row.outcome),
      exactRevenueMinorByCurrency: terminalRevenueByCurrency(terminal),
      observedDays: days,
      gateEligible: terminal.length >= B2C_TERMINAL_SURFACE_MIN_PEOPLE && days >= B2C_TERMINAL_SURFACE_MIN_DAYS,
    }
  })
  const peopleToSurfaces = new Map()
  for (const row of canonical) {
    const names = peopleToSurfaces.get(row.userId) ?? new Set()
    names.add(row.surface)
    peopleToSurfaces.set(row.userId, names)
  }
  const unresolved = candidates.filter((row) => row.originStatus !== 'exact')
  const candidatePeople = new Set(candidates.map((row) => row.userId))
  const unresolvedPeople = new Set(unresolved.map((row) => row.userId))
  const unresolvedPeopleRatio = candidatePeople.size > 0 ? unresolvedPeople.size / candidatePeople.size : null
  const unresolvedStripeSessionRatio = candidates.length > 0 ? unresolved.length / candidates.length : null
  const eligibleSurfaceCount = surfaces.filter((row) => row.gateEligible).length
  const qualityMet = unresolvedPeopleRatio !== null &&
    unresolvedPeopleRatio <= B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO &&
    !outcomeQualityBlocked

  return {
    contract: 'recurring_checkout_24h_v1',
    contractHours: 24,
    candidateExternalPeople: candidatePeople.size,
    candidateStripeSessions: candidates.length,
    canonicalExactSurfacePeople: new Set(canonical.map((row) => row.userId)).size,
    canonicalExactSurfaceStripeSessions: canonical.length,
    overlapPeopleAcrossSurfaces: [...peopleToSurfaces.values()].filter((names) => names.size > 1).length,
    surfaces,
    attributionQuality: {
      unresolvedPeople: unresolvedPeople.size,
      unresolvedStripeSessions: unresolved.length,
      unresolvedPeopleRatio,
      unresolvedStripeSessionRatio,
      unresolvedReasonCounts: histogram(unresolved, (row) => row.reason),
      laterSamePersonSurfaceSessionsExcluded: laterSessionsExcluded,
      samePersonSurfaceFirstSessionTiePeople: canonicalTiePeople,
      exactOutcomeConflictStripeSessions: outcomeConflictSessions,
      strictV1StartContractConflictStripeSessions,
      subscriptionStartStripeSessionConflicts: outcomeReport.quality.subscriptionStartStripeSessionConflicts,
      ledgerConflictStripeSessions: outcomeReport.quality.ledgerConflictStripeSessions,
      unlinkedSubscriptionPaymentSessions: outcomeReport.quality.unlinkedSubscriptionPaymentSessions,
      maximumUnresolvedRatio: B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO,
      qualityMet,
    },
    gate: {
      minimumTerminalPeoplePerSurface: B2C_TERMINAL_SURFACE_MIN_PEOPLE,
      minimumComparableSurfaces: B2C_TERMINAL_SURFACE_MIN_SURFACES,
      minimumObservationDaysPerSurface: B2C_TERMINAL_SURFACE_MIN_DAYS,
      eligibleSurfaceCount,
      state: eligibleSurfaceCount >= B2C_TERMINAL_SURFACE_MIN_SURFACES && qualityMet
        ? 'ready_for_diagnosis'
        : 'collecting',
      neverDeclaresCausalityOrWinner: true,
    },
    note: 'Conditional diagnostic among people who clicked and reached Stripe. Paid and expired_unpaid require the exact same Stripe Session; open and missing-terminal states never enter the terminal denominator. One canonical Session per person and surface prevents retries from inflating results. Surface overlap is reported, not hidden. No surface is declared causal or a winner.',
  }
}

function revenueByCurrency(records) {
  const totals = new Map()
  for (const record of records) {
    if (!record.currency || !Number.isSafeInteger(record.amountMinor)) continue
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function observedDays(firstAt, generatedAtMs) {
  return firstAt === null ? null : Math.max(0, (generatedAtMs - firstAt) / 86_400_000)
}

export function buildB2cSubscriptionTruthReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  const resultBoundaryMs = Date.parse(RESULT_VALUE_COHORT_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const identity = identityIndex(profiles)
  const firstVideos = firstCompletedVideoByUser(videos)
  const ordered = events
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const windowRows = ordered.filter((row) => timestamp(row) >= windowStartMs)
  const externalRows = windowRows.filter((row) => identity.external.has(row.user_id))
  const exposures = externalRows.flatMap((row) => {
    const experiment = exposureDefinition(row)
    if (!experiment) return []
    const at = timestamp(row)
    const firstVideoAt = timestamp(firstVideos.get(row.user_id))
    const stage = firstVideoAt === null ? 'without_delivery' : firstVideoAt <= at ? 'post_delivery' : 'pre_delivery'
    if (experiment === 'trial_post_video' && stage !== 'post_delivery') return []
    if (experiment === 'trial_active_subscription' && stage !== 'post_delivery') return []
    return [{
      experiment,
      userId: row.user_id,
      at,
      stage,
      returnLadderRendered: experiment === 'trial_active_subscription'
        ? metadataBoolean(row, 'return_ladder_rendered')
        : null,
    }]
  })
  const exposuresByUser = new Map()
  for (const exposure of exposures) {
    const current = exposuresByUser.get(exposure.userId) ?? []
    current.push(exposure)
    exposuresByUser.set(exposure.userId, current)
  }

  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events: ordered, profiles })
  const startsByStripeSession = new Map()
  for (const row of ordered.filter((candidate) => candidate.name === 'checkout_started')) {
    const sessionId = metadataString(row, 'stripe_session_id')
    if (!sessionId) continue
    const current = startsByStripeSession.get(sessionId) ?? []
    current.push(row)
    startsByStripeSession.set(sessionId, current)
  }
  const clicks = ordered.filter((row) => row.name === 'checkout_cta_clicked')
  const welcomeClicks = ordered.filter((row) => row.name === 'welcome_offer_checkout_clicked')
  const externalStarts = ledger.records.filter((record) =>
    ['unpaid', 'paid'].includes(record.status) &&
    record.ownerClass === 'external' &&
    record.startedAt &&
    Date.parse(record.startedAt) >= windowStartMs,
  ).map((record) => ({
    ...record,
    origin: classifyOrigin(record, startsByStripeSession, clicks, welcomeClicks, exposuresByUser, firstVideos),
  }))
  const terminalSurfaceTruth = buildTerminalSurfaceTruth({
    generatedAt,
    windowStart,
    generatedAtMs,
    windowStartMs,
    ordered,
    profiles,
    identity,
    externalStarts,
    startsByStripeSession,
  })
  const externalPaid = externalStarts.filter((record) => record.status === 'paid' && record.paidInWindow)
  const exactOriginStarts = externalStarts.filter((record) => record.origin.status === 'exact')
  const exactOriginPaid = externalPaid.filter((record) => record.origin.status === 'exact')

  const assistRows = externalPaid.map((record) => {
    const paidAt = Date.parse(record.paidAt)
    const prior = [...new Set((exposuresByUser.get(record.ownerUserId) ?? [])
      .filter((row) => row.at <= paidAt)
      .map((row) => row.experiment))].sort()
    return { userId: record.ownerUserId, stripeSessionId: record.stripeSessionId, experiments: prior }
  })

  const firstDeliveryPeople = [...firstVideos.entries()].filter(([userId, row]) =>
    identity.external.has(userId) && timestamp(row) >= resultBoundaryMs && timestamp(row) <= generatedAtMs,
  )
  const firstDeliveryIds = new Set(firstDeliveryPeople.map(([userId]) => userId))
  const sampledPeople = new Set(
    exposures.filter((row) => row.experiment === 'result_value_sample' && row.at >= resultBoundaryMs).map((row) => row.userId),
  )
  const notSampledPeople = [...firstDeliveryIds].filter((userId) => !sampledPeople.has(userId)).length

  const experimentRows = Object.entries(EXPERIMENTS).map(([name, config]) => {
    const selected = exposures.filter((row) => row.experiment === name)
    const people = new Set(selected.map((row) => row.userId))
    const firstAt = selected.length ? Math.min(...selected.map((row) => row.at)) : null
    const days = name === 'result_value_sample'
      ? Math.max(0, (generatedAtMs - resultBoundaryMs) / 86_400_000)
      : observedDays(firstAt, generatedAtMs)
    const attributedStarts = exactOriginStarts.filter((row) => row.origin.experiment === name)
    const attributedPaid = exactOriginPaid.filter((row) => row.origin.experiment === name)
    const assistedPaid = assistRows.filter((row) => row.experiments.includes(name))
    const qualifiedClicks = clicks.filter((row) => {
      const at = timestamp(row)
      if (
        at === null ||
        at < windowStartMs ||
        !identity.external.has(row.user_id) ||
        SURFACE_EXPERIMENT.get(metadataString(row, 'surface')) !== name ||
        !clickMatchesExperiment(row, name)
      ) return false
      if (name !== 'trial_active_subscription') {
        return hasPriorExposure(exposuresByUser, row.user_id, name, at)
      }
      const firstVideoAt = timestamp(firstVideos.get(row.user_id))
      return firstVideoAt !== null && firstVideoAt <= at
    })
    const ctaClickPeople = setSize(qualifiedClicks, (row) => row.user_id)
    const maturityCutoff = config.gate?.days
      ? generatedAtMs - config.gate.days * 86_400_000
      : null
    const firstExposureByUser = new Map()
    for (const row of selected) {
      const current = firstExposureByUser.get(row.userId)
      if (current === undefined || row.at < current) firstExposureByUser.set(row.userId, row.at)
    }
    const matureExposurePeople = maturityCutoff === null
      ? people.size
      : [...firstExposureByUser.values()].filter((at) => at <= maturityCutoff).length
    const matureCtaClickPeople = maturityCutoff === null
      ? ctaClickPeople
      : setSize(qualifiedClicks.filter((row) => timestamp(row) <= maturityCutoff), (row) => row.user_id)
    const returnLadderRenderedContext = name === 'trial_active_subscription' ? {
      rendered: {
        exposurePeople: setSize(selected.filter((row) => row.returnLadderRendered === true), (row) => row.userId),
        ctaClickPeople: setSize(qualifiedClicks.filter((row) => metadataBoolean(row, 'return_ladder_rendered') === true), (row) => row.user_id),
        exactOriginStartedPeople: setSize(attributedStarts.filter((row) => row.origin.returnLadderRendered === true), (row) => row.ownerUserId),
        exactOriginStartedStripeSessions: attributedStarts.filter((row) => row.origin.returnLadderRendered === true).length,
        exactOriginPaidPeople: setSize(attributedPaid.filter((row) => row.origin.returnLadderRendered === true), (row) => row.ownerUserId),
        exactOriginPaidStripeSessions: attributedPaid.filter((row) => row.origin.returnLadderRendered === true).length,
      },
      notRendered: {
        exposurePeople: setSize(selected.filter((row) => row.returnLadderRendered === false), (row) => row.userId),
        ctaClickPeople: setSize(qualifiedClicks.filter((row) => metadataBoolean(row, 'return_ladder_rendered') === false), (row) => row.user_id),
        exactOriginStartedPeople: setSize(attributedStarts.filter((row) => row.origin.returnLadderRendered === false), (row) => row.ownerUserId),
        exactOriginStartedStripeSessions: attributedStarts.filter((row) => row.origin.returnLadderRendered === false).length,
        exactOriginPaidPeople: setSize(attributedPaid.filter((row) => row.origin.returnLadderRendered === false), (row) => row.ownerUserId),
        exactOriginPaidStripeSessions: attributedPaid.filter((row) => row.origin.returnLadderRendered === false).length,
      },
    } : null
    let gateState = config.gate ? 'collecting' : 'diagnostic_only'
    if (name === 'result_value_sample') {
      if (assistedPaid.length > 0) gateState = 'ready_for_reconciliation'
      else if (
        firstDeliveryPeople.length >= config.gate.firstDeliveryPeople &&
        sampledPeople.size >= config.gate.sampledPeople &&
        notSampledPeople >= config.gate.notSampledPeople &&
        days >= config.gate.days
      ) gateState = 'ready_for_decision'
    } else if (name === 'trial_active_subscription' && config.gate) {
      if (attributedPaid.length > 0) gateState = 'ready_for_reconciliation'
      else if (matureExposurePeople >= config.gate.people) gateState = 'ready_for_decision'
    } else if (config.gate && (
      (config.gate.exactPaymentShortcut && attributedPaid.length > 0) ||
      (
        people.size >= config.gate.people &&
        days !== null &&
        days >= config.gate.days
      )
    )) gateState = 'ready_for_reconciliation'
    return {
      experiment: name,
      role: config.role,
      exposurePeople: people.size,
      firstExposurePostDeliveryPeople: setSize(
        [...people].map((userId) => selected.filter((row) => row.userId === userId).sort((a, b) => a.at - b.at)[0]),
        (row) => row?.stage === 'post_delivery' ? row.userId : null,
      ),
      everPostDeliveryPeople: setSize(selected.filter((row) => row.stage === 'post_delivery'), (row) => row.userId),
      firstValidExposureAt: firstAt === null ? null : new Date(firstAt).toISOString(),
      observedDays: days,
      matureExposurePeople,
      ctaClickPeople,
      matureCtaClickPeople,
      returnLadderRenderedContext,
      exactOriginStartedPeople: setSize(attributedStarts, (row) => row.ownerUserId),
      exactOriginPaidPeople: setSize(attributedPaid, (row) => row.ownerUserId),
      exactOriginPaidStripeSessions: attributedPaid.length,
      exactOriginRevenueMinorByCurrency: revenueByCurrency(attributedPaid),
      assistedPaidPeople: setSize(assistedPaid, (row) => row.userId),
      assistedPaidStripeSessions: assistedPaid.length,
      gate: config.gate ? {
        ...config.gate,
        state: gateState,
        ...(config.gate.clickPathPeople ? {
          clickPathState: matureCtaClickPeople >= config.gate.clickPathPeople
            ? 'ready_for_estimate'
            : 'collecting',
        } : {}),
      } : { state: gateState },
    }
  })

  const unresolvedStarts = externalStarts.filter((record) => record.origin.status !== 'exact')
  const unresolvedRatio = externalStarts.length > 0 ? unresolvedStarts.length / externalStarts.length : null
  const postDeliveryPeople = new Set(
    exposures.filter((row) => row.stage === 'post_delivery').map((row) => row.userId),
  ).size
  const firstExposureAt = exposures.length ? Math.min(...exposures.map((row) => row.at)) : null
  const days = observedDays(firstExposureAt, generatedAtMs)
  const sampleMet = postDeliveryPeople >= B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE &&
    new Set(externalStarts.map((row) => row.ownerUserId)).size >= B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE
  const qualityMet = unresolvedRatio !== null && unresolvedRatio <= B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO
  const durationMet = days !== null && days >= B2C_SUBSCRIPTION_TRUTH_MIN_DAYS

  return {
    schemaVersion: B2C_SUBSCRIPTION_TRUTH_VERSION,
    generatedAt,
    window: { start: windowStart, observedDays: days, sourceLookbackRequiredDays: B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS },
    exclusions: {
      internalProfileRows: identity.internal.size,
      profileRowsMissingEmail: identity.unknown.size,
    },
    financialTruth: {
      ...ledger.summary,
      rule: 'One exact subscription Stripe Session contributes revenue once. All intermediary exposures are assists unless one exact checkout origin is proven.',
    },
    firstVideoTruth: {
      firstDeliveryPeopleSinceResultBoundary: firstDeliveryPeople.length,
      sampledPeople: sampledPeople.size,
      notSampledPeople,
      postDeliveryExposurePeople: postDeliveryPeople,
    },
    checkoutOriginTruth: {
      exactExternalSubscriptionStartedPeople: new Set(externalStarts.map((row) => row.ownerUserId)).size,
      exactExternalSubscriptionStartedStripeSessions: externalStarts.length,
      exactOriginStartedPeople: setSize(exactOriginStarts, (row) => row.ownerUserId),
      exactOriginStartedStripeSessions: exactOriginStarts.length,
      exactOriginPaidPeople: setSize(exactOriginPaid, (row) => row.ownerUserId),
      exactOriginPaidStripeSessions: exactOriginPaid.length,
      unresolvedStartedPeople: setSize(unresolvedStarts, (row) => row.ownerUserId),
      unresolvedStartedStripeSessions: unresolvedStarts.length,
      unresolvedStartedRatio: unresolvedRatio,
      unresolvedReasonCounts: histogram(unresolvedStarts, (row) => row.origin.reason),
      unknownResumeGapStripeSessions: unresolvedStarts.filter((row) => row.origin.status === 'unknown_resume_gap').length,
    },
    terminalSurfaceTruth,
    assistanceTruth: {
      paidPeopleWithAnyPriorExposure: setSize(assistRows.filter((row) => row.experiments.length > 0), (row) => row.userId),
      paidStripeSessionsWithAnyPriorExposure: assistRows.filter((row) => row.experiments.length > 0).length,
      paidPeopleWithMultiplePriorExposures: setSize(assistRows.filter((row) => row.experiments.length > 1), (row) => row.userId),
      paidStripeSessionsWithMultiplePriorExposures: assistRows.filter((row) => row.experiments.length > 1).length,
      rule: 'Assists are non-exclusive and non-causal. They never add revenue or subscribers to an experiment.',
    },
    experiments: experimentRows,
    gate: {
      minimumPostDeliveryExposurePeople: B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE,
      minimumExactStartedPeople: B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE,
      minimumObservationDays: B2C_SUBSCRIPTION_TRUTH_MIN_DAYS,
      maximumUnresolvedStartedRatio: B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO,
      sampleMet,
      durationMet,
      attributionQualityMet: qualityMet,
      state: sampleMet && durationMet && qualityMet ? 'ready_for_cross_experiment_decision' : 'collecting',
    },
    limitations: [
      'Checkout resume lacks a server-side origin-to-destination Session link and remains unknown_resume_gap.',
      'Trial post-video exposure is eligible only at or after ' + TRIAL_POST_VIDEO_VARIANT_BOUNDARY + ' with one canonical offer_layout variant.',
      'Observed first-event clocks for most surfaces are window-dependent; result-value and trial post-video have fixed code boundaries.',
      'This report does not repair legacy admin cards; it provides the finance contract they must adopt.',
    ],
  }
}
