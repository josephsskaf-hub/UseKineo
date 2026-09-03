export const AGENCY_HEADER_STUDIO_VERSION = 'agency_header_studio_v1' as const
export const AGENCY_HEADER_STUDIO_EVENT = 'agency_header_studio_clicked' as const
export const AGENCY_HEADER_SIGNIN_EVENT = 'agency_header_signin_clicked' as const

export type AgencyHeaderAuthState = 'checking' | 'signed_in' | 'signed_out'

export const AGENCY_HEADER_STUDIO_HREF =
  `/studio?intent_campaign=${AGENCY_HEADER_STUDIO_VERSION}` as const

export const AGENCY_HEADER_RETURN_HREF =
  `/ai-shorts-for-agencies?intent_campaign=${AGENCY_HEADER_STUDIO_VERSION}` as const

export const AGENCY_HEADER_LOGIN_HREF =
  `/login?redirect=${encodeURIComponent(AGENCY_HEADER_RETURN_HREF)}` as const

export function agencyHeaderStudioMetadata() {
  return {
    version: AGENCY_HEADER_STUDIO_VERSION,
    intent_campaign: AGENCY_HEADER_STUDIO_VERSION,
    surface: 'ai_shorts_for_agencies',
    placement: 'header',
    destination: 'studio',
    auth_state: 'signed_in',
  } as const
}

export function agencyHeaderSignInMetadata() {
  return {
    version: AGENCY_HEADER_STUDIO_VERSION,
    intent_campaign: AGENCY_HEADER_STUDIO_VERSION,
    surface: 'ai_shorts_for_agencies',
    placement: 'header',
    destination: 'login',
    auth_state: 'signed_out',
  } as const
}
