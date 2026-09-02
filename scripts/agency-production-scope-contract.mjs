import { readCanonicalStringConstant } from './measurement-helpers.mjs'

const SCOPE_SOURCE = new URL('../lib/growth/agencyProductionScope.ts', import.meta.url)
const LEAD_SOURCE = new URL('../lib/growth/b2bLead.ts', import.meta.url)

export const AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT = Object.freeze({
  version: readCanonicalStringConstant(SCOPE_SOURCE, 'AGENCY_PRODUCTION_SCOPE_VERSION'),
  entry: readCanonicalStringConstant(SCOPE_SOURCE, 'AGENCY_PRODUCTION_SCOPE_ENTRY'),
  recurringCampaign: readCanonicalStringConstant(
    SCOPE_SOURCE,
    'AGENCY_PRODUCTION_SCOPE_RECURRING_CAMPAIGN',
  ),
  autopilotCampaign: readCanonicalStringConstant(
    SCOPE_SOURCE,
    'AGENCY_PRODUCTION_SCOPE_AUTOPILOT_CAMPAIGN',
  ),
  fitReview: Object.freeze({
    version: readCanonicalStringConstant(LEAD_SOURCE, 'B2B_BRIEF_EVENT_VERSION'),
    surface: readCanonicalStringConstant(LEAD_SOURCE, 'B2B_BRIEF_SURFACE'),
    entryCampaign: readCanonicalStringConstant(
      SCOPE_SOURCE,
      'AGENCY_PRODUCTION_SCOPE_FIT_REVIEW_CAMPAIGN',
    ),
    entrySource: readCanonicalStringConstant(
      SCOPE_SOURCE,
      'AGENCY_PRODUCTION_SCOPE_SOURCE',
    ),
    entryMedium: readCanonicalStringConstant(
      SCOPE_SOURCE,
      'AGENCY_PRODUCTION_SCOPE_MEDIUM',
    ),
  }),
})
