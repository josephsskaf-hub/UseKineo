export const LOCAL_BUSINESS_BRIEF_OBSERVABILITY_VERSION =
  'local_business_brief_observability_v1' as const
export const LOCAL_BUSINESS_BRIEF_CAMPAIGN =
  'growth_local_business_brief_20260828' as const
export const LOCAL_BUSINESS_BRIEF_SURFACE = 'free_ai_shorts_localbusiness' as const
export const LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO = 0.5
export const LOCAL_BUSINESS_BRIEF_GATE_SESSIONS = 10
export const LOCAL_BUSINESS_BRIEF_VIEW_MARKER =
  `kineo:${LOCAL_BUSINESS_BRIEF_OBSERVABILITY_VERSION}:viewed`

export type LocalBusinessBriefDraftSource = 'manual' | 'sample'

export const LOCAL_BUSINESS_BRIEF_METADATA = {
  version: LOCAL_BUSINESS_BRIEF_OBSERVABILITY_VERSION,
  campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN,
  surface: LOCAL_BUSINESS_BRIEF_SURFACE,
  placement: 'business_ad_builder',
} as const

export function localBusinessBriefDraftMetadata(
  draftSource: LocalBusinessBriefDraftSource,
) {
  return {
    ...LOCAL_BUSINESS_BRIEF_METADATA,
    draft_source: draftSource,
  } as const
}
