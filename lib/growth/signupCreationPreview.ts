import {
  buildAuthenticatedCreationRedirect,
  readCreationHandoff,
  type CreationDuration,
  type CreationLanguage,
  type CreationScriptMode,
} from '@/lib/creationHandoff'
import { normalizeInternalRedirect } from '@/lib/authRedirect'

type QueryReader = Pick<URLSearchParams, 'get'>

export type SignupCreationPreview = {
  kind: 'idea' | 'script'
  eyebrow: string
  heading: string
  description: string
  excerpt: string[]
}

const STRUCTURE_MARKER = /^(?:HOOK|MICRO REWARD(?:\s+\d+)?|FACT(?:\s+\d+)?|ESCALATION|RHYTHM|PAYOFF)\s*:/i
const MAX_LINES = 3
const MAX_LINE_CHARS = 120
const MAX_TOTAL_CHARS = 280

function previewLines(prompt: string): string[] {
  const sourceLines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const candidates = sourceLines.length > 1
    ? sourceLines
    : prompt.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean)

  const excerpt: string[] = []
  let used = 0
  for (const candidate of candidates) {
    if (excerpt.length >= MAX_LINES || used >= MAX_TOTAL_CHARS) break
    const remaining = MAX_TOTAL_CHARS - used
    const cap = Math.min(MAX_LINE_CHARS, remaining)
    if (cap <= 0) break
    const clipped = candidate.length > cap
      ? `${candidate.slice(0, Math.max(1, cap - 1)).trimEnd()}…`
      : candidate
    excerpt.push(clipped)
    used += clipped.length
  }
  return excerpt
}

/**
 * Turns the already allow-listed creation handoff into a small, escaped-by-
 * React reminder on the auth wall. It never reads cookies, storage or a user;
 * callers must suppress it whenever an unrelated explicit redirect owns the
 * journey.
 */
export function buildSignupCreationPreview(params: QueryReader): SignupCreationPreview | null {
  const handoff = readCreationHandoff(params)
  if (!handoff.prompt) return null

  const markerCount = handoff.prompt
    .split(/\r?\n/)
    .filter((line) => STRUCTURE_MARKER.test(line.trim())).length
  const kind: SignupCreationPreview['kind'] = handoff.scriptMode === 'verbatim' || markerCount >= 2
    ? 'script'
    : 'idea'

  return kind === 'script'
    ? {
        kind,
        eyebrow: 'Saved before signup',
        heading: 'Your script is waiting',
        description: 'Continue with Google or email. Kineo opens this draft after sign-in, so you do not have to paste it again.',
        excerpt: previewLines(handoff.prompt),
      }
    : {
        kind,
        eyebrow: 'Saved before signup',
        heading: 'Your idea is waiting',
        description: 'Continue with Google or email. Kineo opens this topic after sign-in, so you can pick up where you left off.',
        excerpt: previewLines(handoff.prompt),
      }
}

/**
 * Recover only the public example-remix proof that the auth gate nested inside
 * its allow-listed /studio/create redirect. Other product, checkout and
 * arbitrary redirects must stay on their existing generic signup contract.
 */
export function buildExampleRemixSignupPreview(
  rawRedirect: string | null | undefined
): SignupCreationPreview | null {
  const normalized = normalizeInternalRedirect(rawRedirect)
  if (!normalized) return null

  const destination = new URL(normalized, 'https://kineo.local')
  const params = destination.searchParams
  if (
    destination.pathname !== '/studio/create' ||
    params.get('create_intent') !== 'example_remix'
  ) {
    return null
  }

  return buildSignupCreationPreview(params)
}

/**
 * Recover the structured script already delivered by /free-script-generator.
 * `handoff_kind` is a visual marker only: an executable create_intent is
 * explicitly rejected, and the normal creation contract remains unchanged.
 */
export function buildFreeScriptSignupPreview(
  rawRedirect: string | null | undefined
): SignupCreationPreview | null {
  const normalized = normalizeInternalRedirect(rawRedirect)
  if (!normalized) return null

  const destination = new URL(normalized, 'https://kineo.local')
  const params = destination.searchParams
  if (
    destination.pathname !== '/studio/create' ||
    params.get('handoff_kind') !== 'free_script' ||
    params.get('autoanalyze') !== '1' ||
    params.get('create_intent') !== null
  ) {
    return null
  }

  const preview = buildSignupCreationPreview(params)
  return preview?.kind === 'script' ? preview : null
}

const AUTHENTICATED_CREATION_KEYS = new Set([
  'welcome',
  'prompt',
  'create_intent',
  'intent_campaign',
  'language',
  'script_mode',
  'duration',
])

/**
 * Recognize only the canonical destination emitted by
 * buildAuthenticatedCreationRedirect. This lets topic/script launchers show
 * their saved work at auth without treating an arbitrary /studio/create URL
 * as proof that Kineo will resume it.
 */
export function buildAuthenticatedCreationSignupPreview(
  rawRedirect: string | null | undefined,
): SignupCreationPreview | null {
  const normalized = normalizeInternalRedirect(rawRedirect)
  if (!normalized) return null

  const destination = new URL(normalized, 'https://kineo.local')
  const params = destination.searchParams
  const keys = [...params.keys()]
  if (
    destination.pathname !== '/studio/create' ||
    new Set(keys).size !== keys.length ||
    keys.some((key) => !AUTHENTICATED_CREATION_KEYS.has(key)) ||
    params.get('welcome') !== '1'
  ) {
    return null
  }

  const campaign = (params.get('intent_campaign') ?? '').trim()
  if (!/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(campaign)) return null

  const handoff = readCreationHandoff(params)
  if (!handoff.prompt || !handoff.createIntent) return null

  const language = params.get('language') as CreationLanguage | null
  const scriptMode = params.get('script_mode') as CreationScriptMode | null
  const rawDuration = params.get('duration')
  const duration = rawDuration ? Number(rawDuration) as CreationDuration : undefined
  if (language && !['en', 'pt', 'es'].includes(language)) return null
  if (scriptMode && !['ai', 'verbatim'].includes(scriptMode)) return null
  if (rawDuration && ![35, 45, 60, 90].includes(duration ?? 0)) return null

  const canonical = buildAuthenticatedCreationRedirect({
    prompt: handoff.prompt,
    campaign,
    createIntent: handoff.createIntent,
    ...(language ? { language } : {}),
    ...(scriptMode ? { scriptMode } : {}),
    ...(duration ? { duration } : {}),
  })
  if (canonical !== normalized) return null

  return buildSignupCreationPreview(params)
}

/** Resolve the exact preview the auth page may promise for its outer query. */
export function buildSignupCreationPreviewFromAuthParams(
  params: QueryReader
): SignupCreationPreview | null {
  if (params.get('reason') === 'checkout') return null

  const explicitRedirect = normalizeInternalRedirect(params.get('redirect'))
  if (explicitRedirect) {
    return buildExampleRemixSignupPreview(explicitRedirect)
      ?? buildFreeScriptSignupPreview(explicitRedirect)
      ?? buildAuthenticatedCreationSignupPreview(explicitRedirect)
  }
  return buildSignupCreationPreview(params)
}

/**
 * Login only transports an explicit post-auth redirect. Keep its proof stricter
 * than signup's direct-query fallback so a loose `?prompt=` can never promise
 * work that getRedirect() would discard.
 */
export function buildLoginCreationPreviewFromAuthParams(
  params: QueryReader
): SignupCreationPreview | null {
  if (params.get('reason') === 'checkout') return null

  const rawRedirect = params.get('redirect')
  const preview = buildExampleRemixSignupPreview(rawRedirect)
    ?? buildFreeScriptSignupPreview(rawRedirect)
    ?? buildAuthenticatedCreationSignupPreview(rawRedirect)
  return preview ? { ...preview, eyebrow: 'Saved before sign-in' } : null
}
