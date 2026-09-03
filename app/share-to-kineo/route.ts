import { NextRequest, NextResponse } from 'next/server'
import {
  createWebSharePayload,
  WEB_SHARE_TARGET_MAX_BODY_BYTES,
  webShareBridgeHtml,
  type WebShareHandoffStatus,
} from '@/lib/growth/webShareTarget'

export const dynamic = 'force-dynamic'

const BRIDGE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
} as const

type BoundedForm = { form: URLSearchParams | null; status?: WebShareHandoffStatus }

async function readBoundedForm(req: NextRequest): Promise<BoundedForm> {
  const contentType = req.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/x-www-form-urlencoded') return { form: null, status: 'invalid_request' }
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > WEB_SHARE_TARGET_MAX_BODY_BYTES) return { form: null, status: 'too_large' }
  if (!req.body) return { form: new URLSearchParams() }
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > WEB_SHARE_TARGET_MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined)
      return { form: null, status: 'too_large' }
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { form: new URLSearchParams(new TextDecoder().decode(body)) }
}

export async function POST(req: NextRequest) {
  const parsed = await readBoundedForm(req).catch(() => ({ form: null, status: 'invalid_request' as const }))
  const form = parsed.form
  const payload = createWebSharePayload({
    title: form?.get('title') ?? null,
    text: form?.get('text') ?? null,
    url: form?.get('url') ?? null,
  })
  return new NextResponse(webShareBridgeHtml(payload, parsed.status), { status: 200, headers: BRIDGE_HEADERS })
}

export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/free-script-generator', req.url), 307)
}
