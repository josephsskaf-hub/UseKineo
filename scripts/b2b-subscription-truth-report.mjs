import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION = 'b2b_subscription_truth_v3'
export const B2B_SUBSCRIPTION_WINDOW_DAYS = 30
export const B2B_SUBSCRIPTION_CONTEXT_DAYS = 60
export const B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE = 20

const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])

export const B2B_ATTRIBUTABLE_PATHS = Object.freeze({
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
    eventVersion: 'agency_margin_v1_2026_08_27',
    events: Object.freeze({
      viewed: 'agency_margin_calculator_viewed',
      packSelected: 'agency_margin_pack_selected',
      proposalCopied: 'agency_margin_proposal_copied',
    }),
    attributionState: 'multi_actor_proposal_assist_only',
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

function pathForCampaign(campaign) {
  return Object.entries(B2B_ATTRIBUTABLE_PATHS)
    .find(([, path]) => path.intentCampaign === campaign) ?? null
}

function validRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  if (row?.name !== 'checkout_started' || metadataString(row, 'sku')) return false
  if (!metadataString(row, 'stripe_session_id')) return false
  if (!RECURRING_TIERS.has(tier) || !RECURRING_BILLING.has(billing)) return false
  return tier !== 'autopilot' || billing === 'monthly'
}

function resolveStarts(events, identity) {
  const grouped = new Map()
  let invalidRecurringRows = 0
  for (const row of events) {
    const campaign = metadataString(row, 'intent_campaign')
    const path = pathForCampaign(campaign)
    if (!path || row?.name !== 'checkout_started') continue
    const ownerClass = actorClass(row, identity)
    if (!validRecurringStart(row)) {
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

function generatedWitness(start, events, path, identity) {
  if (!path.events.generated) return 'campaign_only'
  const startAt = timestamp(start)
  const candidates = events.filter((row) => {
    const at = timestamp(row)
    return at !== null && at <= startAt &&
      row?.name === path.events.generated &&
      metadataString(row, 'version') === path.eventVersion &&
      (path.stageAttribution !== 'exact_intent_campaign' ||
        metadataString(row, 'intent_campaign') === path.intentCampaign) &&
      ['external', 'anonymous'].includes(actorClass(row, identity))
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

  const journeys = starts.starts.map((start) => {
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
      artifactWitness: generatedWitness(start.row, sourceEvents, B2B_ATTRIBUTABLE_PATHS[start.pathKey], identity),
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
      : () => true
    const generated = summarizeStage(windowEvents, path.events.generated, path.eventVersion, identity, stagePredicate)
    const postVideoJourneys = pathJourneys.filter((journey) => journey.artifactWitness !== 'campaign_only')
    const preVideoJourneys = pathJourneys.filter((journey) => journey.artifactWitness === 'campaign_only')
    const postVideoPaid = postVideoJourneys.filter((journey) => journey.paid)
    const preVideoPaid = preVideoJourneys.filter((journey) => journey.paid)
    const ready = paid.length > 0 || pathJourneys.length > 0 ||
      generated.identifiedExternalPeople >= B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE
    return [pathKey, {
      intentCampaign: path.intentCampaign,
      stages: {
        viewed: summarizeStage(windowEvents, path.events.viewed, path.eventVersion, identity, stagePredicate),
        generated,
        copied: summarizeStage(windowEvents, path.events.copied, path.eventVersion, identity, stagePredicate),
        activationChoice: summarizeStage(windowEvents, path.events.activation, path.eventVersion, identity, stagePredicate),
        oneTimePackChoice: summarizeStage(windowEvents, path.events.packChoice, path.eventVersion, identity, stagePredicate),
      },
      subscription: {
        identifiedExternalPeople: new Set(pathJourneys.map((journey) => journey.userId)).size,
        stripeSessions: pathJourneys.length,
        byBilling: countBy(pathJourneys, (journey) => journey.billing),
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
      gate: {
        state: ready ? 'ready_for_path_diagnosis' : 'collecting',
        minimumGeneratedExternalPeople: B2B_SUBSCRIPTION_MIN_GENERATED_PEOPLE,
        firstExactSubscriptionStartOrPaymentOverridesSampleGate: true,
      },
    }]
  }))

  const local = B2B_ASSIST_SURFACES.local_business_brief
  const agency = B2B_ASSIST_SURFACES.agency_margin_proposal
  const autopilot = B2B_ASSIST_SURFACES.autopilot_break_even
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
      viewed: summarizeStage(windowEvents, agency.events.viewed, agency.eventVersion, identity),
      packSelected: summarizeStage(windowEvents, agency.events.packSelected, agency.eventVersion, identity),
      proposalCopied: summarizeStage(windowEvents, agency.events.proposalCopied, agency.eventVersion, identity),
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
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      unlinkedSubscriptionPaymentSessions: ledger.summary.unlinkedSubscriptionPaymentSessions,
      packSessionsExcludedFromSubscribers: ledger.summary.packSessions,
    },
    gate: {
      state: readyPaths.length ? 'path_specific_diagnosis_available' : 'collecting',
      readyPaths,
    },
    note: 'People, anonymous sessions, Stripe Sessions and event rows are separate units. A B2B path receives subscription credit only when server-side checkout_started carries an exact allowlisted intent_campaign and the immutable subscription ledger resolves the same Stripe Session, owner, recurring product, amount, currency and timeline. Product-to-Short and real-estate stages additionally require the exact intent_campaign on generate_completed; a completion after Checkout never becomes a pre-Checkout witness. Post-video and pre-video subscriptions are reported separately. Annual and monthly subscriptions remain separate; Autopilot is monthly-only. Generated artifacts and copied proposals are assists, never causal sales. One-time packs and the Autopilot pilot never count as subscribers.',
  }
}
