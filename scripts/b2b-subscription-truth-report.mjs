import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'
import { AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT } from './agency-production-scope-contract.mjs'

export const B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION = 'b2b_subscription_truth_v7'
export const B2B_SUBSCRIPTION_WINDOW_DAYS = 30
export const B2B_SUBSCRIPTION_CONTEXT_DAYS = 60
export const B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE = 20
export const B2B_PROPOSAL_ASSIST_LOOKBACK_DAYS = 7
export const B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE = 10
export const B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS = 7
export const B2B_ANSWER_ROUTER_MEASUREMENT_START = '2026-09-03T00:00:00.000Z'
export const B2B_AGENCY_SCOPE_MEASUREMENT_START = '2026-09-03T00:00:00.000Z'
export const B2B_AGENCY_HEADER_MEASUREMENT_START = '2026-09-03T05:00:00.000Z'
export const B2B_AGENCY_HEADER_CLICK_LOOKBACK_HOURS = 24

const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])

export const B2B_ATTRIBUTABLE_PATHS = Object.freeze({
  agency_header_recurring: Object.freeze({
    intentCampaign: 'agency_header_studio_v1',
    eventVersion: 'agency_header_studio_v1',
    generatedEventVersion: null,
    stageAttribution: 'exact_intent_campaign',
    journeyEntryRequirement: 'prior_exact_path_click',
    entryStage: 'cta_clicked',
    entryLookbackHours: B2B_AGENCY_HEADER_CLICK_LOOKBACK_HOURS,
    measurementStartsAt: B2B_AGENCY_HEADER_MEASUREMENT_START,
    gatePolicy: 'viewed_people_and_observation',
    events: Object.freeze({
      viewed: 'agency_header_studio_clicked',
      generated: 'generate_completed',
    }),
    diagnosticEvents: Object.freeze({
      signIn: 'agency_header_signin_clicked',
    }),
  }),
  business_answer_router_recurring: Object.freeze({
    intentCampaign: 'b2b_answer_router_recurring_v1',
    eventVersion: null,
    stageAttribution: 'exact_pricing_source',
    journeyEntryRequirement: 'prior_exact_pricing_view',
    measurementStartsAt: B2B_ANSWER_ROUTER_MEASUREMENT_START,
    gatePolicy: 'viewed_people_and_observation',
    events: Object.freeze({
      viewed: 'pricing_view',
    }),
  }),
  agency_scope_recurring: Object.freeze({
    intentCampaign: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.recurringCampaign,
    eventVersion: null,
    stageAttribution: 'exact_pricing_source',
    journeyEntryRequirement: 'prior_exact_pricing_view',
    measurementStartsAt: B2B_AGENCY_SCOPE_MEASUREMENT_START,
    gatePolicy: 'viewed_people_and_observation',
    allowedTiers: Object.freeze(['starter', 'basic', 'pro']),
    allowedBilling: Object.freeze(['monthly', 'annual']),
    events: Object.freeze({
      viewed: 'pricing_view',
    }),
  }),
  agency_scope_autopilot: Object.freeze({
    intentCampaign: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.autopilotCampaign,
    eventVersion: null,
    stageAttribution: 'exact_pricing_source',
    journeyEntryRequirement: 'prior_exact_pricing_view',
    measurementStartsAt: B2B_AGENCY_SCOPE_MEASUREMENT_START,
    gatePolicy: 'viewed_people_and_observation',
    allowedTiers: Object.freeze(['autopilot']),
    allowedBilling: Object.freeze(['monthly']),
    events: Object.freeze({
      viewed: 'pricing_view',
    }),
  }),
  business_plan: Object.freeze({
    intentCampaign: 'weekly_business_video_plan',
    eventVersion: 'weekly_business_video_plan_share_v1',
    events: Object.freeze({
      viewed: 'business_content_plan_viewed',
      generated: 'business_content_plan_generated',
      copied: 'business_content_plan_copied',
      activation: 'business_content_plan_activation_clicked',
      packChoice: 'business_content_plan_packs_clicked',
    }),
  }),
  client_brief: Object.freeze({
    intentCampaign: 'client_short_brief_v1',
    eventVersion: 'client_short_brief_v1',
    events: Object.freeze({
      viewed: 'client_short_brief_viewed',
      generated: 'client_short_brief_generated',
      copied: 'client_short_brief_copied',
      activation: 'client_short_brief_activation_clicked',
      packChoice: 'client_short_brief_packs_clicked',
    }),
  }),
  local_business_brief: Object.freeze({
    intentCampaign: 'growth_local_business_brief_20260828',
    eventVersion: 'local_business_brief_observability_v1',
    events: Object.freeze({
      viewed: 'local_business_brief_viewed',
      generated: 'local_business_brief_generated',
      activation: 'local_business_brief_activation_clicked',
    }),
  }),
  product_to_short: Object.freeze({
    intentCampaign: 'product_to_short',
    eventVersion: null,
    stageAttribution: 'exact_intent_campaign',
    events: Object.freeze({
      generated: 'generate_completed',
    }),
  }),
  real_estate_video: Object.freeze({
    intentCampaign: 'growth_real_estate_video_maker_20260828',
    eventVersion: null,
    stageAttribution: 'exact_intent_campaign',
    events: Object.freeze({
      generated: 'generate_completed',
    }),
  }),
  autopilot_case_study: Object.freeze({
    intentCampaign: 'autopilot_case_study_v1',
    eventVersion: null,
    events: Object.freeze({}),
  }),
})

export const B2B_ASSIST_SURFACES = Object.freeze({
  local_business_brief: Object.freeze({
    eventVersion: 'local_business_brief_observability_v1',
    events: Object.freeze({
      viewed: 'local_business_brief_viewed',
      sampleLoaded: 'local_business_brief_sample_loaded',
      generated: 'local_business_brief_generated',
      activation: 'local_business_brief_activation_clicked',
    }),
    attributionState: 'exact_intent_campaign_available_after_deploy_boundary',
  }),
  agency_margin_proposal: Object.freeze({
    eventVersions: Object.freeze({
      viewed: 'agency_margin_v1_2026_08_27',
      packSelected: 'agency_margin_v1_2026_08_27',
      proposalCopied: 'agency_margin_proposal_v1',
    }),
    events: Object.freeze({
      viewed: 'agency_margin_calculator_viewed',
      packSelected: 'agency_margin_pack_selected',
      proposalCopied: 'agency_margin_proposal_copied',
    }),
    attributionState: 'temporal_assist_not_attribution',
  }),
  autopilot_break_even: Object.freeze({
    eventVersion: 'autopilot_break_even_v1',
    events: Object.freeze({
      viewed: 'autopilot_break_even_viewed',
      calculated: 'autopilot_break_even_calculated',
      checkoutChoice: 'autopilot_break_even_checkout_clicked',
    }),
    attributionState: 'choice_not_linked_to_server_checkout_session',
  }),
})

export const B2B_SUBSCRIPTION_EVENT_NAMES = Object.freeze([
  ...new Set([
    ...Object.values(B2B_ATTRIBUTABLE_PATHS).flatMap((path) => Object.values(path.events)),
    ...Object.values(B2B_ATTRIBUTABLE_PATHS).flatMap((path) => Object.values(path.diagnosticEvents ?? {})),
    ...Object.values(B2B_ASSIST_SURFACES).flatMap((surface) => Object.values(surface.events)),
    'autopilot_break_even_human_viewed',
    'checkout_started',
    'payment_success',
  ]),
])

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
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

function actorClass(row, identity) {
  if (!row?.user_id) return 'anonymous'
  if (identity.external.has(row.user_id)) return 'external'
  if (identity.internal.has(row.user_id)) return 'internal'
  return 'unknown_identified'
}

function inWindow(row, windowStartMs, generatedAtMs) {
  const at = timestamp(row)
  return at !== null && at >= windowStartMs && at <= generatedAtMs
}

function summarizeRows(rows, identity) {
  return {
    eventRows: rows.length,
    identifiedExternalPeople: new Set(rows
      .filter((row) => actorClass(row, identity) === 'external')
      .map((row) => row.user_id)).size,
    anonymousSessions: new Set(rows
      .filter((row) => actorClass(row, identity) === 'anonymous' && row.session_id)
      .map((row) => row.session_id)).size,
    internalEventRows: rows.filter((row) => actorClass(row, identity) === 'internal').length,
    unknownIdentifiedEventRows: rows.filter((row) => actorClass(row, identity) === 'unknown_identified').length,
  }
}

function summarizeStage(rows, name, version, identity, predicate = () => true) {
  if (!name) return summarizeRows([], identity)
  return summarizeRows(rows.filter((row) =>
    row?.name === name && metadataString(row, 'version') === version && predicate(row),
  ), identity)
}

function eventVersionFor(path, stage) {
  if (stage === 'generated' && Object.hasOwn(path, 'generatedEventVersion')) {
    return path.generatedEventVersion
  }
  return path.eventVersion
}

function matchesExactAgencyHeaderStudioClick(row, path) {
  if (path.journeyEntryRequirement !== 'prior_exact_path_click') return true
  return row?.name === path.events.viewed &&
    metadataString(row, 'version') === path.eventVersion &&
    metadataString(row, 'intent_campaign') === path.intentCampaign &&
    metadataString(row, 'surface') === 'ai_shorts_for_agencies' &&
    metadataString(row, 'placement') === 'header' &&
    metadataString(row, 'destination') === 'studio' &&
    metadataString(row, 'auth_state') === 'signed_in'
}

function matchesExactAgencyHeaderSignInClick(row, path) {
  if (path.journeyEntryRequirement !== 'prior_exact_path_click') return false
  return row?.name === path.diagnosticEvents?.signIn &&
    metadataString(row, 'version') === path.eventVersion &&
    metadataString(row, 'intent_campaign') === path.intentCampaign &&
    metadataString(row, 'surface') === 'ai_shorts_for_agencies' &&
    metadataString(row, 'placement') === 'header' &&
    metadataString(row, 'destination') === 'login' &&
    metadataString(row, 'auth_state') === 'signed_out'
}

function pathForCampaign(campaign) {
  return Object.entries(B2B_ATTRIBUTABLE_PATHS)
    .find(([, path]) => path.intentCampaign === campaign) ?? null
}

function validRecurringStart(row, path = null) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  if (row?.name !== 'checkout_started' || metadataString(row, 'sku')) return false
  if (!metadataString(row, 'stripe_session_id')) return false
  if (!RECURRING_TIERS.has(tier) || !RECURRING_BILLING.has(billing)) return false
  if (tier === 'autopilot' && billing !== 'monthly') return false
  if (path?.allowedTiers && !path.allowedTiers.includes(tier)) return false
  if (path?.allowedBilling && !path.allowedBilling.includes(billing)) return false
  return true
}

function resolveStarts(events, identity) {
  const grouped = new Map()
  let invalidRecurringRows = 0
  for (const row of events) {
    const campaign = metadataString(row, 'intent_campaign')
    const path = pathForCampaign(campaign)
    if (!path || row?.name !== 'checkout_started') continue
    const ownerClass = actorClass(row, identity)
    if (!validRecurringStart(row, path[1])) {
      if (ownerClass === 'external') invalidRecurringRows += 1
      continue
    }
    const stripeSessionId = metadataString(row, 'stripe_session_id')
    const rows = grouped.get(stripeSessionId) ?? []
    rows.push({ row, pathKey: path[0], ownerClass })
    grouped.set(stripeSessionId, rows)
  }

  const starts = []
  let conflictingStripeSessions = 0
  let duplicateRows = 0
  for (const [stripeSessionId, rows] of grouped.entries()) {
    duplicateRows += Math.max(0, rows.length - 1)
    const semantics = new Set(rows.map(({ row, pathKey, ownerClass }) => JSON.stringify({
      pathKey,
      ownerClass,
      userId: row.user_id,
      tier: metadataString(row, 'tier'),
      billing: metadataString(row, 'billing'),
    })))
    if (semantics.size !== 1) {
      conflictingStripeSessions += 1
      continue
    }
    const first = [...rows].sort((left, right) => timestamp(left.row) - timestamp(right.row))[0]
    if (first.ownerClass !== 'external') continue
    starts.push({ stripeSessionId, pathKey: first.pathKey, row: first.row })
  }
  return { starts, conflictingStripeSessions, duplicateRows, invalidRecurringRows }
}

function generatedWitness(start, events, path, identity, entryResolution = null) {
  if (!path.events.generated) return 'campaign_only'
  const startAt = timestamp(start)
  const candidates = events.filter((row) => {
    const at = timestamp(row)
    if (!(at !== null && at <= startAt &&
      row?.name === path.events.generated &&
      metadataString(row, 'version') === eventVersionFor(path, 'generated') &&
      (path.stageAttribution !== 'exact_intent_campaign' ||
        metadataString(row, 'intent_campaign') === path.intentCampaign) &&
      ['external', 'anonymous'].includes(actorClass(row, identity)))) return false
    if (path.journeyEntryRequirement !== 'prior_exact_path_click') return true
    return Number.isFinite(entryResolution?.clickAt) &&
      at > entryResolution.clickAt &&
      at < startAt &&
      actorClass(row, identity) === 'external' &&
      row.user_id === start.user_id &&
      row.session_id &&
      row.session_id === start.session_id
  })
  if (candidates.some((row) => row.user_id && row.user_id === start.user_id)) return 'same_external_person'
  if (start.session_id && candidates.some((row) => row.session_id === start.session_id)) return 'same_browser_session'
  return 'campaign_only'
}

function moneyByCurrency(journeys) {
  const totals = new Map()
  for (const journey of journeys) {
    if (!journey.paid || !journey.currency || !Number.isSafeInteger(journey.amountMinor)) continue
    totals.set(journey.currency, (totals.get(journey.currency) ?? 0) + journey.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function countBy(rows, value) {
  const counts = new Map()
  for (const row of rows) {
    const key = value(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function resolveEntryView(start, events, path, identity, generatedAtMs = Number.POSITIVE_INFINITY) {
  if (!path.journeyEntryRequirement) return { witness: null, clickAt: null }
  const startAt = timestamp(start)
  if (path.journeyEntryRequirement === 'prior_exact_path_click') {
    const lookbackMs = path.entryLookbackHours * 60 * 60 * 1000
    const sessionOwners = new Set(events
      .filter((row) => {
        const at = timestamp(row)
        return at !== null && at <= startAt &&
          start.session_id && row.session_id === start.session_id &&
          typeof row.user_id === 'string' && row.user_id
      })
      .map((row) => row.user_id))
    if (sessionOwners.size !== 1 || !sessionOwners.has(start.user_id)) {
      return { witness: 'identity_conflict', clickAt: null }
    }
    const candidates = events.filter((row) => {
      const at = timestamp(row)
      return at !== null && at < startAt && startAt - at <= lookbackMs &&
        at >= Date.parse(path.measurementStartsAt) &&
        matchesExactAgencyHeaderStudioClick(row, path) &&
        actorClass(row, identity) === 'external' &&
        row.user_id === start.user_id &&
        row.session_id &&
        row.session_id === start.session_id
    })
    if (candidates.length === 0) return { witness: null, clickAt: null }
    const click = [...candidates]
      .sort((left, right) => timestamp(right) - timestamp(left))[0]
    const clickAt = timestamp(click)
    if (clickAt === null) return { witness: null, clickAt: null }
    if (generatedAtMs < clickAt + lookbackMs) return { witness: 'entry_immature', clickAt }
    return {
      witness: 'prior_exact_path_click_same_external_person_and_browser_session',
      clickAt,
    }
  }
  const candidates = events.filter((row) => {
    const at = timestamp(row)
    const measurementStartAt = path.measurementStartsAt ? Date.parse(path.measurementStartsAt) : null
    if (!(at !== null && at < startAt &&
      (measurementStartAt === null || at >= measurementStartAt) &&
      row?.name === path.events.viewed &&
      metadataString(row, 'version') === path.eventVersion)) return false
    if (path.journeyEntryRequirement === 'prior_exact_pricing_view') {
      return metadataString(row, 'source') === path.intentCampaign
    }
    return false
  })
  const sameSession = start.session_id
    ? candidates.filter((row) => row.session_id === start.session_id)
    : []
  const sessionOwners = new Set(events
    .filter((row) => start.session_id && row.session_id === start.session_id && typeof row.user_id === 'string' && row.user_id)
    .map((row) => row.user_id))
  const hasConflictingIdentity = sessionOwners.size !== 1 || !sessionOwners.has(start.user_id)
  if (hasConflictingIdentity) return { witness: 'identity_conflict', clickAt: null }
  if (candidates.some((row) => actorClass(row, identity) === 'external' && row.user_id === start.user_id)) {
    return { witness: 'prior_exact_pricing_view_same_external_person', clickAt: null }
  }
  if (!start.session_id) return { witness: null, clickAt: null }
  if (!sameSession.some((row) => actorClass(row, identity) === 'anonymous')) {
    return { witness: null, clickAt: null }
  }
  return { witness: 'prior_exact_pricing_view_same_browser_session', clickAt: null }
}

function buildAgencyProposalAssist({ sourceEvents, windowStartMs, generatedAtMs, identity, ledger }) {
  const agency = B2B_ASSIST_SURFACES.agency_margin_proposal
  const lookbackMs = B2B_PROPOSAL_ASSIST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const proposalCopies = sourceEvents.filter((row) =>
    row?.name === agency.events.proposalCopied &&
    metadataString(row, 'version') === agency.eventVersions.proposalCopied &&
    ['external', 'anonymous'].includes(actorClass(row, identity)),
  )

  const startsByStripeSession = new Map()
  for (const row of sourceEvents) {
    if (!validRecurringStart(row)) continue
    const stripeSessionId = metadataString(row, 'stripe_session_id')
    const rows = startsByStripeSession.get(stripeSessionId) ?? []
    rows.push(row)
    startsByStripeSession.set(stripeSessionId, rows)
  }

  const journeys = []
  for (const record of ledger.records) {
    const startedAtMs = Date.parse(String(record.startedAt ?? ''))
    if (!Number.isFinite(startedAtMs) || startedAtMs < windowStartMs || startedAtMs > generatedAtMs) continue
    if (record.ownerClass !== 'external' || !record.ownerUserId) continue
    if (!['unpaid', 'paid'].includes(record.status)) continue

    const startRows = startsByStripeSession.get(record.stripeSessionId) ?? []
    if (startRows.length === 0) continue
    const eligibleCopies = proposalCopies.filter((copy) => {
      const copiedAtMs = timestamp(copy)
      if (copiedAtMs === null || copiedAtMs >= startedAtMs || startedAtMs - copiedAtMs > lookbackMs) return false
      const ownerClass = actorClass(copy, identity)
      return ownerClass === 'external' && copy.user_id === record.ownerUserId
    })
    if (eligibleCopies.length === 0) continue

    const paid = record.status === 'paid' && record.paidInWindow === true
    journeys.push({
      stripeSessionId: record.stripeSessionId,
      userId: record.ownerUserId,
      startedAt: record.startedAt,
      matchingBasis: 'same_external_person',
      paid,
      paymentState: record.status,
      amountMinor: paid ? record.amountMinor : null,
      currency: paid ? record.currency : null,
    })
  }

  const paidJourneys = journeys.filter((journey) => journey.paid)
  return {
    label: 'temporal_assist_not_attribution',
    lookbackDays: B2B_PROPOSAL_ASSIST_LOOKBACK_DAYS,
    identifiedExternalPeople: new Set(journeys.map((journey) => journey.userId)).size,
    stripeSessions: journeys.length,
    byMatchingBasis: countBy(journeys, (journey) => journey.matchingBasis),
    exactPaidPeople: new Set(paidJourneys.map((journey) => journey.userId)).size,
    exactPaidStripeSessions: paidJourneys.length,
    exactRevenueMinorByCurrency: moneyByCurrency(paidJourneys),
  }
}

export function buildB2bSubscriptionTruthReport({ generatedAt, windowStart, events, profiles }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const identity = identityIndex(profiles)
  const sourceEvents = events
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort((left, right) => timestamp(left) - timestamp(right) || String(left?.id ?? '').localeCompare(String(right?.id ?? '')))
  const windowEvents = sourceEvents.filter((row) => inWindow(row, windowStartMs, generatedAtMs))
  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events: sourceEvents, profiles })
  const ledgerBySession = new Map(ledger.records.map((record) => [record.stripeSessionId, record]))
  const starts = resolveStarts(sourceEvents, identity)
  const entryResolutions = new Map(starts.starts.map((start) => [
    start.stripeSessionId,
    resolveEntryView(start.row, sourceEvents, B2B_ATTRIBUTABLE_PATHS[start.pathKey], identity, generatedAtMs),
  ]))
  const acceptedEntryWitness = (value) =>
    Boolean(value) &&
    value !== 'identity_conflict' &&
    value !== 'entry_ambiguity' &&
    value !== 'entry_immature'
  const startsWithoutRequiredEntryView = starts.starts.filter((start) => {
    const path = B2B_ATTRIBUTABLE_PATHS[start.pathKey]
    const resolution = entryResolutions.get(start.stripeSessionId)
    return path.journeyEntryRequirement && !acceptedEntryWitness(resolution?.witness)
  })
  const startsWithConflictingEntryViewIdentity = starts.starts.filter((start) => {
    return entryResolutions.get(start.stripeSessionId)?.witness === 'identity_conflict'
  })
  const startsWithAmbiguousEntryClick = starts.starts.filter((start) => {
    return entryResolutions.get(start.stripeSessionId)?.witness === 'entry_ambiguity'
  })
  const startsWithImmatureEntryClick = starts.starts.filter((start) => {
    return entryResolutions.get(start.stripeSessionId)?.witness === 'entry_immature'
  })

  const journeys = starts.starts.map((start) => {
    const path = B2B_ATTRIBUTABLE_PATHS[start.pathKey]
    const entryResolution = entryResolutions.get(start.stripeSessionId) ?? { witness: null, clickAt: null }
    if (path.journeyEntryRequirement && !acceptedEntryWitness(entryResolution.witness)) return null
    const record = ledgerBySession.get(start.stripeSessionId) ?? null
    const startAt = timestamp(start.row)
    const exactOwner = record?.ownerClass === 'external' && record.ownerUserId === start.row.user_id
    const paid = exactOwner && record?.status === 'paid' && record.paidInWindow === true
    if (startAt < windowStartMs && !paid) return null
    return {
      pathKey: start.pathKey,
      stripeSessionId: start.stripeSessionId,
      userId: start.row.user_id,
      tier: metadataString(start.row, 'tier'),
      billing: metadataString(start.row, 'billing'),
      startedAt: new Date(startAt).toISOString(),
      entryViewWitness: entryResolution.witness,
      artifactWitness: generatedWitness(start.row, sourceEvents, path, identity, entryResolution),
      paid,
      paymentState: !record ? 'missing_ledger_record' : !exactOwner ? 'owner_or_product_conflict' : record.status,
      amountMinor: paid ? record.amountMinor : null,
      currency: paid ? record.currency : null,
    }
  }).filter(Boolean)

  const paths = Object.fromEntries(Object.entries(B2B_ATTRIBUTABLE_PATHS).map(([pathKey, path]) => {
    const pathJourneys = journeys.filter((journey) => journey.pathKey === pathKey)
    const paid = pathJourneys.filter((journey) => journey.paid)
    const stagePredicate = path.stageAttribution === 'exact_intent_campaign'
      ? (row) => metadataString(row, 'intent_campaign') === path.intentCampaign
      : path.stageAttribution === 'exact_pricing_source'
        ? (row) => metadataString(row, 'source') === path.intentCampaign
        : () => true
    const pathStagePredicate = (row) => {
      if (!stagePredicate(row)) return false
      if (row?.name === path.events.viewed && !matchesExactAgencyHeaderStudioClick(row, path)) return false
      if (!path.measurementStartsAt) return true
      const at = timestamp(row)
      return at !== null && at >= Date.parse(path.measurementStartsAt)
    }
    const viewed = summarizeStage(windowEvents, path.events.viewed, eventVersionFor(path, 'viewed'), identity, pathStagePredicate)
    const generated = summarizeStage(windowEvents, path.events.generated, eventVersionFor(path, 'generated'), identity, pathStagePredicate)
    const postVideoJourneys = pathJourneys.filter((journey) => journey.artifactWitness !== 'campaign_only')
    const preVideoJourneys = pathJourneys.filter((journey) => journey.artifactWitness === 'campaign_only')
    const postVideoPaid = postVideoJourneys.filter((journey) => journey.paid)
    const preVideoPaid = preVideoJourneys.filter((journey) => journey.paid)
    const observationDays = path.measurementStartsAt
      ? Math.max(0, Math.floor((generatedAtMs - Date.parse(path.measurementStartsAt)) / 86_400_000))
      : null
    const sampleReady = path.gatePolicy === 'viewed_people_and_observation'
      ? viewed.identifiedExternalPeople >= B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE &&
        observationDays >= B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS
      : generated.identifiedExternalPeople >= B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE
    const ready = paid.length > 0 || pathJourneys.length > 0 || sampleReady
    return [pathKey, {
      intentCampaign: path.intentCampaign,
      stages: {
        viewed,
        generated,
        signInDiagnostic: summarizeStage(
          windowEvents,
          path.diagnosticEvents?.signIn,
          path.eventVersion,
          identity,
          (row) => matchesExactAgencyHeaderSignInClick(row, path) && pathStagePredicate(row),
        ),
        copied: summarizeStage(windowEvents, path.events.copied, path.eventVersion, identity, stagePredicate),
        activationChoice: summarizeStage(windowEvents, path.events.activation, path.eventVersion, identity, stagePredicate),
        oneTimePackChoice: summarizeStage(windowEvents, path.events.packChoice, path.eventVersion, identity, stagePredicate),
      },
      subscription: {
        identifiedExternalPeople: new Set(pathJourneys.map((journey) => journey.userId)).size,
        stripeSessions: pathJourneys.length,
        byBilling: countBy(pathJourneys, (journey) => journey.billing),
        byTier: countBy(pathJourneys, (journey) => journey.tier),
        withArtifactWitness: pathJourneys.filter((journey) => journey.artifactWitness !== 'campaign_only').length,
        campaignOnlyWithoutArtifactWitness: pathJourneys.filter((journey) => journey.artifactWitness === 'campaign_only').length,
        exactPaidPeople: new Set(paid.map((journey) => journey.userId)).size,
        exactPaidStripeSessions: paid.length,
        exactRevenueMinorByCurrency: moneyByCurrency(paid),
        postVideo: {
          identifiedExternalPeople: new Set(postVideoJourneys.map((journey) => journey.userId)).size,
          stripeSessions: postVideoJourneys.length,
          exactPaidPeople: new Set(postVideoPaid.map((journey) => journey.userId)).size,
          exactPaidStripeSessions: postVideoPaid.length,
          exactRevenueMinorByCurrency: moneyByCurrency(postVideoPaid),
        },
        preVideoDiagnostic: {
          identifiedExternalPeople: new Set(preVideoJourneys.map((journey) => journey.userId)).size,
          stripeSessions: preVideoJourneys.length,
          exactPaidPeople: new Set(preVideoPaid.map((journey) => journey.userId)).size,
          exactPaidStripeSessions: preVideoPaid.length,
          exactRevenueMinorByCurrency: moneyByCurrency(preVideoPaid),
        },
      },
      gate: path.gatePolicy === 'viewed_people_and_observation'
        ? {
            state: ready ? 'ready_for_path_diagnosis' : 'collecting',
            measurementStartsAt: path.measurementStartsAt,
            observedFullDays: observationDays,
            minimumObservedFullDays: B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS,
            ...(path.entryStage === 'cta_clicked'
              ? { minimumClickedExternalPeople: B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE }
              : { minimumViewedExternalPeople: B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE }),
            entryStage: path.entryStage ?? 'viewed',
            firstExactSubscriptionStartOrPaymentOverridesSampleGate: true,
          }
        : {
            state: ready ? 'ready_for_path_diagnosis' : 'collecting',
            minimumGeneratedExternalPeople: B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE,
            firstExactSubscriptionStartOrPaymentOverridesSampleGate: true,
          },
    }]
  }))

  const local = B2B_ASSIST_SURFACES.local_business_brief
  const agency = B2B_ASSIST_SURFACES.agency_margin_proposal
  const autopilot = B2B_ASSIST_SURFACES.autopilot_break_even
  const agencyProposalCopied = summarizeStage(
    windowEvents,
    agency.events.proposalCopied,
    agency.eventVersions.proposalCopied,
    identity,
  )
  const agencyProposalAssist = buildAgencyProposalAssist({
    sourceEvents,
    windowStartMs,
    generatedAtMs,
    identity,
    ledger,
  })
  const assistSurfaces = {
    local_business_brief: {
      attributionState: local.attributionState,
      viewed: summarizeStage(windowEvents, local.events.viewed, local.eventVersion, identity),
      manualGenerated: summarizeStage(windowEvents, local.events.generated, local.eventVersion, identity, (row) => metadataString(row, 'draft_source') === 'manual'),
      sampleGenerated: summarizeStage(windowEvents, local.events.generated, local.eventVersion, identity, (row) => metadataString(row, 'draft_source') === 'sample'),
      activation: summarizeStage(windowEvents, local.events.activation, local.eventVersion, identity),
    },
    agency_margin_proposal: {
      attributionState: agency.attributionState,
      viewed: summarizeStage(windowEvents, agency.events.viewed, agency.eventVersions.viewed, identity),
      packSelected: summarizeStage(windowEvents, agency.events.packSelected, agency.eventVersions.packSelected, identity),
      proposalCopied: agencyProposalCopied,
      invalidProposalVersion: summarizeRows(windowEvents.filter((row) =>
        row?.name === agency.events.proposalCopied &&
        metadataString(row, 'version') !== agency.eventVersions.proposalCopied,
      ), identity),
      assistedRecurringSubscription: agencyProposalAssist,
      gate: {
        state: agencyProposalCopied.identifiedExternalPeople >= 5 || agencyProposalAssist.stripeSessions > 0
          ? 'ready_for_assist_review'
          : 'collecting',
        minimumIdentifiedExternalPeopleWhoCopiedProposal: 5,
        anonymousSessionsNeverSatisfyPeopleGate: true,
        firstExactRecurringStripeSessionOverridesSampleGate: true,
      },
    },
    autopilot_break_even: {
      attributionState: autopilot.attributionState,
      viewed: summarizeStage(windowEvents, autopilot.events.viewed, autopilot.eventVersion, identity),
      humanViewed: summarizeStage(windowEvents, 'autopilot_break_even_human_viewed', 'autopilot_decision_funnel_v1', identity),
      calculated: summarizeStage(windowEvents, autopilot.events.calculated, autopilot.eventVersion, identity),
      monthlyChoice: summarizeStage(windowEvents, autopilot.events.checkoutChoice, autopilot.eventVersion, identity, (row) => metadataString(row, 'choice') === 'monthly'),
      pilotChoiceExcludedFromSubscriptions: summarizeStage(windowEvents, autopilot.events.checkoutChoice, autopilot.eventVersion, identity, (row) => metadataString(row, 'choice') === 'pilot'),
    },
  }

  const paidJourneys = journeys.filter((journey) => journey.paid)
  const readyPaths = Object.entries(paths).filter(([, path]) => path.gate.state === 'ready_for_path_diagnosis').map(([key]) => key)
  return {
    schemaVersion: B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION,
    generatedAt,
    windowStart,
    paths,
    assistSurfaces,
    journeys,
    totals: {
      identifiedExternalSubscriptionPeople: new Set(journeys.map((journey) => journey.userId)).size,
      subscriptionStripeSessions: journeys.length,
      byBilling: countBy(journeys, (journey) => journey.billing),
      exactPaidPeople: new Set(paidJourneys.map((journey) => journey.userId)).size,
      exactPaidStripeSessions: paidJourneys.length,
      exactRevenueMinorByCurrency: moneyByCurrency(paidJourneys),
    },
    quality: {
      invalidRecurringRowsOnB2bCampaigns: starts.invalidRecurringRows,
      subscriptionStartStripeSessionConflicts: starts.conflictingStripeSessions,
      duplicateSubscriptionStartRows: starts.duplicateRows,
      subscriptionStartsWithoutRequiredEntryView: startsWithoutRequiredEntryView.length,
      subscriptionStartsWithConflictingEntryViewIdentity: startsWithConflictingEntryViewIdentity.length,
      subscriptionStartsWithAmbiguousEntryClick: startsWithAmbiguousEntryClick.length,
      subscriptionStartsWithImmatureEntryClick: startsWithImmatureEntryClick.length,
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      unlinkedSubscriptionPaymentSessions: ledger.summary.unlinkedSubscriptionPaymentSessions,
      packSessionsExcludedFromSubscribers: ledger.summary.packSessions,
    },
    gate: {
      state: readyPaths.length ? 'path_specific_diagnosis_available' : 'collecting',
      readyPaths,
    },
    note: 'People, anonymous sessions, Stripe Sessions and event rows are separate units. A B2B path receives subscription credit only when server-side checkout_started carries an exact allowlisted intent_campaign and the immutable subscription ledger resolves the same Stripe Session, owner, recurring product, amount, currency and timeline. Every exact-pricing path additionally requires an earlier pricing_view with its exact source: either the same identified external person or the same browser session while the view was anonymous and the later Checkout has the external owner. A browser-session identity conflict fails closed. An anonymous view remains an anonymous session and is never counted as a person. A later, wrong-source or different-session view never becomes attribution. Product-to-Short and real-estate stages additionally require the exact intent_campaign on generate_completed; a completion after Checkout never becomes a pre-Checkout witness. Post-video and pre-video subscriptions are reported separately. Annual and monthly subscriptions remain separate; scope recurring excludes Autopilot, and scope Autopilot accepts only monthly Autopilot. A copied agency proposal may be reported only as a seven-day temporal assist to a later exact recurring Checkout by the same identified external person; anonymous copies remain session diagnostics and never become people, Checkouts or revenue. The assist is never causal attribution. One-time packs and the Autopilot pilot never count as subscribers.',
  }
}
