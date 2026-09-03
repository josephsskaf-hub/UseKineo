export const WEB_SHARE_TARGET_CAMPAIGN = 'web_share_target_v1'
export const WEB_SHARE_TARGET_SOURCE = 'web_share_target'
export const WEB_SHARE_TARGET_MEDIUM = 'os_share'
export const WEB_SHARE_TARGET_PATH = '/share-to-kineo'
export const WEB_SHARE_TARGET_DESTINATION = '/free-script-generator'
export const WEB_SHARE_TARGET_STORAGE_KEY = 'kineo_web_share_target_v1'
export const WEB_SHARE_TARGET_MAX_AGE_MS = 5 * 60 * 1000
export const WEB_SHARE_TARGET_MAX_BODY_BYTES = 16 * 1024

export const WEB_SHARE_INPUT_KINDS = [
  'title_text',
  'title',
  'text',
  'url_only',
  'empty',
] as const

export type WebShareInputKind = (typeof WEB_SHARE_INPUT_KINDS)[number]

export const WEB_SHARE_HANDOFF_STATUSES = [
  'received',
  'url_only',
  'empty',
  'storage_unavailable',
  'invalid_request',
  'too_large',
] as const

export type WebShareHandoffStatus = (typeof WEB_SHARE_HANDOFF_STATUSES)[number]

export type WebSharePayload = {
  topic: string
  inputKind: WebShareInputKind
  capturedAt: number
}

const URL_TOKEN = /(?:https?:\/\/|www\.)\S+/giu
const CONTROL = /[\u0000-\u001f\u007f]/gu

function cleanPart(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKC')
    .replace(CONTROL, ' ')
    .replace(URL_TOKEN, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 200)
}

function validSharedUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function createWebSharePayload(
  input: { title?: unknown; text?: unknown; url?: unknown },
  capturedAt = Date.now(),
): WebSharePayload {
  const title = cleanPart(input.title)
  const text = cleanPart(input.text)
  const hasUrl = validSharedUrl(input.url)
  const distinctText = text && text.toLocaleLowerCase() !== title.toLocaleLowerCase() ? text : ''
  const topic = [title, distinctText].filter(Boolean).join(' — ').slice(0, 200)
  const inputKind: WebShareInputKind = title && distinctText
    ? 'title_text'
    : title
      ? 'title'
      : text
        ? 'text'
        : hasUrl
          ? 'url_only'
          : 'empty'
  return { topic, inputKind, capturedAt }
}

export function webShareTargetLandingHref(status: WebShareHandoffStatus = 'empty'): string {
  return `${WEB_SHARE_TARGET_DESTINATION}?${new URLSearchParams({
    utm_source: WEB_SHARE_TARGET_SOURCE,
    utm_medium: WEB_SHARE_TARGET_MEDIUM,
    utm_campaign: WEB_SHARE_TARGET_CAMPAIGN,
    share_status: status,
  }).toString()}`
}

export function webShareHandoffStatus(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): WebShareHandoffStatus | null {
  const value = searchParams?.share_status
  return typeof value === 'string' && WEB_SHARE_HANDOFF_STATUSES.includes(value as WebShareHandoffStatus)
    ? value as WebShareHandoffStatus
    : null
}

export function isExactWebShareTargetLanding(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
  const exact = (key: string, expected: string) => searchParams?.[key] === expected
  return Boolean(webShareHandoffStatus(searchParams)) &&
    exact('utm_source', WEB_SHARE_TARGET_SOURCE) &&
    exact('utm_medium', WEB_SHARE_TARGET_MEDIUM) &&
    exact('utm_campaign', WEB_SHARE_TARGET_CAMPAIGN)
}

export function parseWebSharePayload(raw: string | null, now = Date.now()): WebSharePayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<WebSharePayload>
    const inputKind = WEB_SHARE_INPUT_KINDS.includes(parsed.inputKind as WebShareInputKind)
      ? parsed.inputKind as WebShareInputKind
      : null
    if (!inputKind || typeof parsed.capturedAt !== 'number' || !Number.isFinite(parsed.capturedAt)) return null
    if (parsed.capturedAt > now || now - parsed.capturedAt > WEB_SHARE_TARGET_MAX_AGE_MS) return null
    const topic = cleanPart(parsed.topic)
    if (topic !== parsed.topic || (inputKind !== 'url_only' && inputKind !== 'empty' && !topic)) return null
    return { topic, inputKind, capturedAt: parsed.capturedAt }
  } catch {
    return null
  }
}

function scriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, '\\u003c')
    .replace(/>/gu, '\\u003e')
    .replace(/&/gu, '\\u0026')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029')
}

export function webShareBridgeHtml(
  payload: WebSharePayload,
  status: WebShareHandoffStatus = payload.topic
    ? 'received'
    : payload.inputKind === 'url_only'
      ? 'url_only'
      : 'empty',
): string {
  const serialized = scriptLiteral(JSON.stringify(payload))
  const key = scriptLiteral(WEB_SHARE_TARGET_STORAGE_KEY)
  const destination = scriptLiteral(webShareTargetLandingHref(status))
  const storageFallback = scriptLiteral(webShareTargetLandingHref('storage_unavailable'))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening Kineo</title></head><body><p>Opening Kineo…</p><script>let d=${destination};try{sessionStorage.setItem(${key},${serialized})}catch{d=${storageFallback}}location.replace(d)</script></body></html>`
}
