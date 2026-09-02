import { B2B_ATTRIBUTABLE_PATHS } from './b2b-subscription-truth-report.mjs'

const SESSION_CHUNK_SIZE = 40
const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function candidateSessionsForPaths(events, paths) {
  return [...new Set(events.flatMap((row) => {
    const exactView = paths.some((path) => row?.name === path.events.viewed &&
      metadataString(row, 'source') === path.intentCampaign)
    const exactCheckout = paths.some((path) => row?.name === 'checkout_started' &&
      metadataString(row, 'intent_campaign') === path.intentCampaign)
    const sessionId = typeof row?.session_id === 'string' ? row.session_id.trim() : ''
    return (exactView || exactCheckout) && SESSION_PATTERN.test(sessionId) ? [sessionId] : []
  }))].sort()
}

export function businessAnswerRouterCandidateSessions(events) {
  return candidateSessionsForPaths(events, [
    B2B_ATTRIBUTABLE_PATHS.business_answer_router_recurring,
  ])
}

export function exactPricingCandidateSessions(events) {
  return candidateSessionsForPaths(
    events,
    Object.values(B2B_ATTRIBUTABLE_PATHS).filter(
      (path) => path.journeyEntryRequirement === 'prior_exact_pricing_view',
    ),
  )
}

function chunks(values) {
  const result = []
  for (let index = 0; index < values.length; index += SESSION_CHUNK_SIZE) {
    result.push(values.slice(index, index + SESSION_CHUNK_SIZE))
  }
  return result
}

function mergeEvents(rows) {
  const byId = new Map()
  for (const row of rows) {
    const id = typeof row?.id === 'string' ? row.id : null
    if (!id) throw new Error('B2B truth loader received an event without an id')
    const prior = byId.get(id)
    if (prior && JSON.stringify(prior) !== JSON.stringify(row)) {
      throw new Error(`B2B truth loader received conflicting rows for event ${id}`)
    }
    byId.set(id, row)
  }
  return [...byId.values()]
}

/**
 * Loads the allowlisted funnel first, then every event attached to only the
 * candidate router browser sessions. The second read is the identity audit:
 * an unrelated event owned by another account must be visible before the
 * report can use anonymous→authenticated session continuity.
 */
export async function loadB2bSubscriptionTruthInputs({
  fetchPrimaryEvents,
  fetchProfiles,
  fetchSessionEvents,
}) {
  const [primaryEvents, profiles] = await Promise.all([
    fetchPrimaryEvents(),
    fetchProfiles(),
  ])
  const candidateSessions = exactPricingCandidateSessions(primaryEvents)
  const identityRows = candidateSessions.length === 0
    ? []
    : (await Promise.all(chunks(candidateSessions).map((sessionIds) =>
        fetchSessionEvents(sessionIds),
      ))).flat()
  return {
    events: mergeEvents([...primaryEvents, ...identityRows]),
    profiles,
    identityAudit: {
      candidateBrowserSessions: candidateSessions.length,
      fetchedSessionChunks: Math.ceil(candidateSessions.length / SESSION_CHUNK_SIZE),
      additionalEventRows: identityRows.filter((row) =>
        !primaryEvents.some((primary) => primary.id === row.id),
      ).length,
    },
  }
}
