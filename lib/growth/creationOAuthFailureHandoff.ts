import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  buildExampleRemixSignupPreview,
  buildFreeScriptSignupPreview,
} from '@/lib/growth/signupCreationPreview'

export const CREATION_OAUTH_FAILURE_HANDOFF_VERSION = 'creation_oauth_failure_handoff_v1' as const

export type SavedCreationKind = 'example_remix' | 'free_script'

export type CreationOAuthFailureTelemetry = {
  creation_oauth_failure_handoff_version: typeof CREATION_OAUTH_FAILURE_HANDOFF_VERSION
  has_saved_creation: boolean
  saved_creation_kind: SavedCreationKind | null
}

export type CreationOAuthFailureHandoff = {
  loginPath: string | null
  telemetry: CreationOAuthFailureTelemetry
}

/**
 * Preserve only the two creation contracts already allowed to show proof on
 * the login wall. Generic, malformed and external destinations fail closed.
 * The destination is used for navigation only and never enters telemetry.
 */
export function buildCreationOAuthFailureHandoff(
  rawNext: string | null | undefined,
): CreationOAuthFailureHandoff {
  const normalized = normalizeInternalRedirect(rawNext)
  const savedCreationKind: SavedCreationKind | null = normalized
    ? buildExampleRemixSignupPreview(normalized)
      ? 'example_remix'
      : buildFreeScriptSignupPreview(normalized)
        ? 'free_script'
        : null
    : null
  const telemetry: CreationOAuthFailureTelemetry = {
    creation_oauth_failure_handoff_version: CREATION_OAUTH_FAILURE_HANDOFF_VERSION,
    has_saved_creation: Boolean(savedCreationKind),
    saved_creation_kind: savedCreationKind,
  }

  if (!normalized || !savedCreationKind) {
    return { loginPath: null, telemetry }
  }

  const params = new URLSearchParams({
    error: 'oauth_failed',
    redirect: normalized,
  })

  return {
    loginPath: `/login?${params.toString()}`,
    telemetry,
  }
}
