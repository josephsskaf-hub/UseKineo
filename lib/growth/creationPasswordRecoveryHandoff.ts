import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  buildExampleRemixSignupPreview,
  buildFreeScriptSignupPreview,
  type SignupCreationPreview,
} from '@/lib/growth/signupCreationPreview'

export const CREATION_PASSWORD_RECOVERY_VERSION = 'creation_password_recovery_handoff_v1' as const
export const CREATION_PASSWORD_RECOVERY_REASON = 'saved_creation' as const

const MAX_DESTINATION_CHARS = 16_384

export type CreationPasswordRecoveryContext = {
  version: typeof CREATION_PASSWORD_RECOVERY_VERSION
  destination: string
  kind: 'example_remix' | 'free_script'
  preview: SignupCreationPreview
}

/**
 * Accept only the two creation destinations whose visible saved-work proof is
 * already allow-listed. A generic /studio/create URL is intentionally not
 * enough, even when it contains a prompt.
 */
export function readCreationPasswordRecoveryContext(
  rawDestination: string | null | undefined,
): CreationPasswordRecoveryContext | null {
  const destination = normalizeInternalRedirect(rawDestination)
  if (!destination || destination.length > MAX_DESTINATION_CHARS) return null

  const examplePreview = buildExampleRemixSignupPreview(destination)
  if (examplePreview) {
    return {
      version: CREATION_PASSWORD_RECOVERY_VERSION,
      destination,
      kind: 'example_remix',
      preview: examplePreview,
    }
  }

  const scriptPreview = buildFreeScriptSignupPreview(destination)
  if (!scriptPreview) return null
  return {
    version: CREATION_PASSWORD_RECOVERY_VERSION,
    destination,
    kind: 'free_script',
    preview: scriptPreview,
  }
}

/** Read a password-recovery hop, never a generic auth or checkout query. */
export function readCreationPasswordRecoveryFromSearch(
  rawSearch: string | null | undefined,
): CreationPasswordRecoveryContext | null {
  const params = new URLSearchParams(rawSearch ?? '')
  if (params.get('reason') !== CREATION_PASSWORD_RECOVERY_REASON) return null
  return readCreationPasswordRecoveryContext(params.get('redirect'))
}

/** Build an app-relative recovery hop without serializing an external URL. */
export function buildCreationPasswordRecoveryHref(
  pathname: '/forgot-password' | '/reset-password' | '/login',
  context: CreationPasswordRecoveryContext | null,
): string {
  if (!context) return pathname
  const params = new URLSearchParams({
    reason: CREATION_PASSWORD_RECOVERY_REASON,
    redirect: context.destination,
  })
  return `${pathname}?${params.toString()}`
}
