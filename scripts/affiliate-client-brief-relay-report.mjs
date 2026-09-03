import { isInternalMeasurementEmail } from './measurement-helpers.mjs'

export const AFFILIATE_CLIENT_BRIEF_RELAY_EVENT = 'affiliate_client_brief_relay_copied'
export const AFFILIATE_CLIENT_BRIEF_RELAY_VERSION = 'affiliate_client_brief_relay_v1'
export const AFFILIATE_CLIENT_BRIEF_RELAY_WINDOW_DAYS = 30
export const AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS = 7
export const AFFILIATE_CLIENT_BRIEF_RELAY_MIN_MATURE_OWNERS = 5

const DAY_MS = 86_400_000
const CODE = /^[A-HJ-NP-Z2-9]{8}$/

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function lower(value) {
  return text(value)?.toLowerCase() ?? null
}

function at(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function exactCopy(row) {
  return row?.name === AFFILIATE_CLIENT_BRIEF_RELAY_EVENT &&
    text(row?.metadata?.version) === AFFILIATE_CLIENT_BRIEF_RELAY_VERSION &&
    text(row?.metadata?.surface) === 'client_video_brief_generator' &&
    text(row?.metadata?.distribution_mode) === 'affiliate_attributed'
}

function clientBriefCode(landingPath) {
  try {
    const url = new URL(String(landingPath ?? ''), 'https://www.usekineo.com')
    const match = /^\/a\/([A-HJ-NP-Z2-9]{8})\/?$/i.exec(url.pathname)
    if (!match || url.searchParams.toString() !== 'to=client_brief') return null
    return match[1].toUpperCase()
  } catch {
    return null
  }
}

function groupBy(rows, key) {
  const result = new Map()
  for (const row of rows) {
    const value = text(row?.[key])
    if (!value) continue
    const grouped = result.get(value) ?? []
    grouped.push(row)
    result.set(value, grouped)
  }
  return result
}

export function buildAffiliateClientBriefRelayReport({
  generatedAt,
  windowStart,
  copyEvents,
  profiles,
  affiliates,
  clickProofs,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![copyEvents, profiles, affiliates, clickProofs].every(Array.isArray)) {
    throw new Error('all report inputs must be arrays')
  }

  const profileRows = groupBy(profiles, 'id')
  const affiliateRows = groupBy(affiliates, 'user_id')
  const quality = new Map()
  const diagnostics = new Map()
  const addQuality = (name) => quality.set(name, (quality.get(name) ?? 0) + 1)
  const addDiagnostic = (name) => diagnostics.set(name, (diagnostics.get(name) ?? 0) + 1)
  const owners = new Map()
  const seedStartMs = windowStartMs - AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS * DAY_MS

  for (const copy of copyEvents.filter(exactCopy)) {
    const copyAt = at(copy)
    if (copyAt === null) {
      addQuality('copy_clock_missing')
      continue
    }
    if (copyAt < seedStartMs || copyAt > generatedAtMs) continue
    const ownerId = text(copy.user_id)
    if (!ownerId) {
      addQuality('copy_owner_missing')
      continue
    }
    const ownerProfiles = profileRows.get(ownerId) ?? []
    const ownerAffiliates = affiliateRows.get(ownerId) ?? []
    if (ownerProfiles.length !== 1) {
      addQuality(ownerProfiles.length === 0 ? 'owner_profile_missing' : 'owner_profile_conflict')
      continue
    }
    if (ownerAffiliates.length !== 1) {
      addQuality(ownerAffiliates.length === 0 ? 'owner_affiliate_missing' : 'owner_affiliate_conflict')
      continue
    }
    const profile = ownerProfiles[0]
    const affiliate = ownerAffiliates[0]
    const email = lower(profile.email)
    const affiliateEmail = lower(affiliate.email)
    const code = text(affiliate.code)?.toUpperCase() ?? null
    if (!email || !affiliateEmail || email !== affiliateEmail || isInternalMeasurementEmail(email)) {
      addQuality(isInternalMeasurementEmail(email) ? 'internal_owner_excluded' : 'owner_identity_invalid')
      continue
    }
    if (lower(affiliate.status) !== 'active' || !code || !CODE.test(code)) {
      addQuality('affiliate_state_invalid')
      continue
    }
    const existing = owners.get(ownerId) ?? {
      ownerId,
      affiliateId: text(affiliate.id),
      code,
      copies: [],
      cohortCopies: [],
      clickIds: new Set(),
    }
    if (!existing.affiliateId) {
      addQuality('affiliate_id_missing')
      continue
    }
    existing.copies.push(copyAt)
    if (copyAt >= windowStartMs) existing.cohortCopies.push(copyAt)
    owners.set(ownerId, existing)
  }

  const affiliateToOwner = new Map()
  for (const owner of owners.values()) {
    if (affiliateToOwner.has(owner.affiliateId)) {
      addQuality('affiliate_owner_conflict')
      continue
    }
    affiliateToOwner.set(owner.affiliateId, owner)
  }

  const seenClickIds = new Map()
  for (const click of clickProofs) {
    const code = clientBriefCode(click?.landing_path)
    if (!code) continue
    const clickId = text(click?.id)
    const clickAt = at(click)
    const affiliateId = text(click?.affiliate_id)
    if (!clickId || clickAt === null || !affiliateId) {
      addQuality('click_proof_incomplete')
      continue
    }
    const signature = affiliateId + '|' + clickAt + '|' + code
    if (seenClickIds.has(clickId)) {
      if (seenClickIds.get(clickId) !== signature) addQuality('click_id_conflict')
      continue
    }
    seenClickIds.set(clickId, signature)
    const owner = affiliateToOwner.get(affiliateId)
    if (!owner || owner.code !== code) {
      addQuality('click_without_eligible_owner_copy')
      continue
    }
    const eligibleCopy = owner.copies
      .filter((copyAt) => copyAt < clickAt && clickAt <= copyAt + AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS * DAY_MS)
      .sort((left, right) => right - left)[0]
    if (!eligibleCopy) {
      addQuality('click_without_prior_copy_in_window')
      continue
    }
    if (eligibleCopy < windowStartMs) {
      addDiagnostic('pre_window_copy_click_proof')
      continue
    }
    owner.clickIds.add(clickId)
  }

  const cohortOwners = [...owners.values()].filter((owner) => owner.cohortCopies.length > 0)
  const externalOwnersCopied = cohortOwners.length
  const matureOwners = cohortOwners.filter((owner) =>
    Math.min(...owner.cohortCopies) + AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS * DAY_MS <= generatedAtMs)
  const ownersWithClickProof = cohortOwners.filter((owner) => owner.clickIds.size > 0).length
  const eligibleClickProofs = cohortOwners
    .reduce((total, owner) => total + owner.clickIds.size, 0)
  const qualityBlockers = Object.fromEntries([...quality.entries()]
    .filter(([name]) => name !== 'internal_owner_excluded')
    .sort(([left], [right]) => left.localeCompare(right)))
  const qualityBlocked = Object.keys(qualityBlockers).length > 0
  const gate = qualityBlocked
    ? 'blocked_quality'
    : matureOwners.length < AFFILIATE_CLIENT_BRIEF_RELAY_MIN_MATURE_OWNERS
      ? 'collecting'
      : ownersWithClickProof > 0
        ? 'success_click_proof'
        : 'stop_no_click_proof'

  return {
    contract: {
      unit: 'external_affiliate_owner',
      numerator: 'server_recorded_non_preview_click_proof',
      paymentAttribution: 'unknown_for_this_relay',
      windowDays: AFFILIATE_CLIENT_BRIEF_RELAY_WINDOW_DAYS,
      observationDays: AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS,
      minimumMatureOwners: AFFILIATE_CLIENT_BRIEF_RELAY_MIN_MATURE_OWNERS,
    },
    gate,
    counts: {
      externalOwnersCopied,
      matureOwners: matureOwners.length,
      ownersWithClickProof,
      eligibleClickProofs,
    },
    excluded: {
      internalOwners: quality.get('internal_owner_excluded') ?? 0,
    },
    diagnostics: Object.fromEntries([...diagnostics.entries()].sort(([left], [right]) => left.localeCompare(right))),
    qualityBlockers,
  }
}
