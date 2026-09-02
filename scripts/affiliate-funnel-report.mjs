import fs from 'node:fs'
import ts from 'typescript'

const INTERNAL_ACCOUNTS_SOURCE = new URL('../lib/internalAccounts.ts', import.meta.url)

function readCanonicalStringArray(exportName) {
  const source = fs.readFileSync(INTERNAL_ACCOUNTS_SOURCE, 'utf8')
  const sourceFile = ts.createSourceFile('internalAccounts.ts', source, ts.ScriptTarget.Latest, true)

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        throw new Error(`${exportName} must remain an array literal in lib/internalAccounts.ts`)
      }
      return declaration.initializer.elements.map((element) => {
        if (!ts.isStringLiteralLike(element)) {
          throw new Error(`${exportName} must contain string literals only`)
        }
        return element.text
      })
    }
  }

  throw new Error(`${exportName} was not found in lib/internalAccounts.ts`)
}

function likeToRegExp(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
}

const EXACT_INTERNAL_EMAILS = new Set(
  readCanonicalStringArray('INTERNAL_EXACT_EMAILS').map((email) => email.toLowerCase()),
)
const INTERNAL_EMAIL_PATTERNS = readCanonicalStringArray('INTERNAL_LIKE_PATTERNS').map(likeToRegExp)

export function isInternalAffiliateEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase()
  if (!email) return false
  return EXACT_INTERNAL_EMAILS.has(email) || INTERNAL_EMAIL_PATTERNS.some((pattern) => pattern.test(email))
}

export async function fetchAllPages(fetchPage, pageSize = 1000) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive integer')
  const rows = []
  for (let page = 0; page < 1000; page++) {
    const from = page * pageSize
    const batch = await fetchPage(from, from + pageSize - 1)
    if (!Array.isArray(batch)) throw new Error('page fetch must return an array')
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
  throw new Error('pagination exceeded the 1000-page safety limit')
}

function eventStage(rows, name, predicate = () => true) {
  const selected = rows.filter((row) => row.name === name && predicate(row))
  const identified = selected.filter((row) => Boolean(row.user_id))
  const anonymous = selected.filter((row) => !row.user_id && Boolean(row.session_id))
  return {
    rawEvents: selected.length,
    identifiedPeople: distinctNonEmpty(identified, 'user_id'),
    anonymousSessions: distinctNonEmpty(anonymous, 'session_id'),
    rowsWithoutActor: selected.filter((row) => !row.user_id && !row.session_id).length,
    completePeopleCountAvailable: anonymous.length === 0 && selected.every((row) => Boolean(row.user_id)),
  }
}

function statusCounts(rows) {
  return {
    total: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    suspended: rows.filter((row) => row.status === 'suspended').length,
  }
}

function commissionTotals(rows) {
  const totals = {}
  for (const row of rows) {
    const normalizedCurrency = String(row.currency ?? '').trim().toLowerCase()
    const currency = normalizedCurrency === 'usd' ? 'usd' : 'unknown'
    const bucket = totals[currency] ?? { pending: 0, approved: 0, paid: 0, total: 0 }
    const amount = Number(row.commission_amount || 0)
    const status = String(row.status || 'pending').toLowerCase()
    bucket.total += amount
    if (status === 'pending') bucket.pending += amount
    if (status === 'approved') bucket.approved += amount
    if (status === 'paid') bucket.paid += amount
    totals[currency] = bucket
  }
  return totals
}

function distinctNonEmpty(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size
}

export function buildAffiliateFunnelReport({
  generatedAt,
  days,
  cutoff,
  affiliates,
  clicks,
  referrals,
  commissions,
  events,
  profiles,
}) {
  const internalUserIds = new Set(
    profiles.filter((profile) => isInternalAffiliateEmail(profile.email)).map((profile) => profile.id),
  )
  const externalProfiles = profiles.filter((profile) => !internalUserIds.has(profile.id))
  const externalEvents = events.filter((row) => !row.user_id || !internalUserIds.has(row.user_id))

  const externalAffiliates = affiliates.filter((row) =>
    !isInternalAffiliateEmail(row.email) && (!row.user_id || !internalUserIds.has(row.user_id)),
  )
  const externalAffiliateIds = new Set(externalAffiliates.map((row) => row.id))
  const externalClicks = clicks.filter((row) => externalAffiliateIds.has(row.affiliate_id))

  const allExternalReferrals = referrals.filter((row) =>
    externalAffiliateIds.has(row.affiliate_id) &&
    !isInternalAffiliateEmail(row.email) &&
    (!row.referred_user_id || !internalUserIds.has(row.referred_user_id)),
  )
  const externalReferralIds = new Set(allExternalReferrals.map((row) => row.id))
  const attributableCommissions = commissions.filter((row) =>
    externalAffiliateIds.has(row.affiliate_id) && row.referral_id && externalReferralIds.has(row.referral_id),
  )
  const unattributedCommissionRows = commissions.filter((row) =>
    externalAffiliateIds.has(row.affiliate_id) && (!row.referral_id || !externalReferralIds.has(row.referral_id)),
  )

  const cutoffMs = Date.parse(cutoff)
  const externalReferrals = allExternalReferrals.filter((row) =>
    Number.isFinite(Date.parse(row.first_touch_at)) && Date.parse(row.first_touch_at) >= cutoffMs,
  )
  const attributedSignups = externalProfiles.filter((profile) =>
    profile.signup_utm_campaign === 'push33_partner_program' &&
    Number.isFinite(Date.parse(profile.created_at)) &&
    Date.parse(profile.created_at) >= cutoffMs,
  ).length

  const hashedNetworkKeys = distinctNonEmpty(externalClicks, 'ip_hash')
  const clickRowsWithoutNetworkKey = externalClicks.filter((row) => !row.ip_hash).length

  return {
    schemaVersion: 'affiliate_funnel_report_v2',
    generatedAt,
    window: { days, cutoff },
    exclusions: {
      internalAffiliateRows: affiliates.length - externalAffiliates.length,
      internalProfileRows: internalUserIds.size,
    },
    publicPartnerFunnel: {
      landingSessions: eventStage(externalEvents, 'landing_session_started', (row) => row.path === '/partners'),
      ctaClicks: eventStage(externalEvents, 'organic_cta_clicked', (row) => row.metadata?.source === 'partners'),
      applications: eventStage(externalEvents, 'affiliate_application_submitted'),
      attributedSignups,
    },
    customAffiliateSystem: {
      affiliates: statusCounts(externalAffiliates),
      acquisitionClicks: {
        firstTouchRows: externalClicks.length,
        hashedNetworkKeys,
        rowsWithoutNetworkKey: clickRowsWithoutNetworkKey,
        completePeopleCountAvailable: false,
      },
      referrals: {
        rows: externalReferrals.length,
        people: distinctNonEmpty(externalReferrals, 'referred_user_id'),
        paidPeople: distinctNonEmpty(
          externalReferrals.filter((row) => row.status === 'paid'),
          'referred_user_id',
        ),
      },
      commissions: {
        externallyAttributedRows: attributableCommissions.length,
        unattributedRows: unattributedCommissionRows.length,
        centsByCurrency: commissionTotals(attributableCommissions),
      },
    },
    units: {
      identifiedPeople: 'distinct non-internal user_id',
      anonymousSessions: 'distinct session_id without user_id; never added to people',
      acquisitionClicks: 'database rows and pseudonymous network keys; neither is a people count',
      commissionCurrency: 'USD is recognized; missing or unexpected currency codes stay unknown',
    },
    note: 'Custom Kineo affiliate tables only. Anonymous sessions may be internal or external and are never added to identified people. Rewardful is external and is not counted here.',
  }
}
