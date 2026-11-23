import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const TOKEN_LIFETIME = 6 * 60 * 60_000

type Impression = {
  actor: string
  id: string
  expires: number
  meta: Record<string, unknown>
}

function digest(body: string, secret: string) {
  return createHmac('sha256', secret).update('account-credit-impression:').update(body).digest()
}

/** Confirms the snapshot the offer route already read without trusting client-provided plan or balance. */
export function signCreditImpression(actor: string, meta: Impression['meta'], secret: string): string {
  const body = Buffer.from(JSON.stringify({ actor, id: randomUUID(), expires: Date.now() + TOKEN_LIFETIME, meta })).toString('base64url')
  return body + '.' + digest(body, secret).toString('base64url')
}

export function verifyCreditImpression(token: unknown, actor: string, secret: string): Impression | null {
  if (typeof token !== 'string' || !/^[\w-]{1,1400}\.[\w-]{43}$/.test(token)) return null
  const [body, signature] = token.split('.')
  const provided = Buffer.from(signature, 'base64url')
  const expected = digest(body, secret)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as Impression
    return claims.actor === actor && claims.expires > Date.now() ? claims : null
  } catch {
    return null
  }
}
