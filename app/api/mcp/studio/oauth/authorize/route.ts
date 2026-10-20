import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { STUDIO_MCP_PATH, STUDIO_OAUTH_BASE_PATH, studioAllowsEmail, studioLiveMode, studioPublicOrigin } from '@/lib/mcp/studioLaunch'
import { oauthRedirectUrl, validateAuthorizeParams, type AuthorizeParams } from '@/lib/mcp/studioOauth'
import { getClient, issueCode, studioAdmin } from '@/lib/mcp/studioOauthStore'
import { STUDIO_AUTH_EVENT, recordStudioEvent } from '@/lib/mcp/studioTools'

// ═══ KINEO-MCP-STUDIO-2010 — a tela de autorização do conector "Kineo Studio" ════════════════════════════════
//
// O Claude manda a pessoa para cá (authorization_endpoint). Fluxo:
//   1. GET valida client_id / redirect_uri / PKCE / scope / resource. Erro antes de confiar no redirect = tela (400);
//      depois = volta pelo redirect com `error` (RFC 6749 §4.1.2.1).
//   2. Sem sessão Kineo → /login?redirect=<esta URL inteira> (a tela de login de sempre; volta sozinha para cá).
//   3. Com sessão → tela de consentimento: quem pede (client_name), para onde volta (o HOST do redirect, como a spec
//      manda mostrar) e o que o conector pode fazer (criar vídeos e gastar créditos DESTA conta).
//   4. POST (form) "Allow" → código de 10 min, uso único, amarrado ao PKCE → redirect com code+state. "Cancel" →
//      redirect com error=access_denied. Anti-CSRF: nonce em cookie (SameSite=Lax, HttpOnly) + campo oculto iguais.
// Interruptor: desligado = 404; 'internal' = só contas da casa veem a tela de consentimento.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 10

const CONSENT_COOKIE = 'kineo_mcp_consent'
const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function page(title: string, body: string, status = 200, extraHeaders: Record<string, string> = {}): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Kineo</title>
<style>body{margin:0;background:#0b0b0f;color:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}main{max-width:520px;margin:0 auto;padding:48px 20px}h1{font-size:1.6rem;margin:0 0 12px}p{line-height:1.6;color:#c9c9d1}.card{background:#15151c;border:1px solid #2a2a35;border-radius:16px;padding:22px}.k{color:#8e8e99;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 4px}.v{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}ul{padding-left:18px;color:#c9c9d1;line-height:1.7}.row{display:flex;gap:12px;margin-top:24px}button{flex:1;border:0;border-radius:999px;padding:14px 18px;font-weight:800;font-size:1rem;cursor:pointer}.allow{background:#2997ff;color:#fff}.deny{background:#2a2a35;color:#f5f5f7}.warn{color:#ffb547}</style></head><body><main>${body}</main></body></html>`
  return new NextResponse(html, { status, headers: { ...HTML_HEADERS, ...extraHeaders } })
}

function errorPage(error: string, description: string): NextResponse {
  return page('Connection error', `<div class="card"><h1>Could not connect Kineo Studio</h1><p>${esc(description)}</p><p class="k">Error</p><p class="v">${esc(error)}</p><p>Go back to Claude and add the connector again.</p></div>`, 400)
}

function redirectWithError(v: { redirectUri: string; state: string | null; error: string; description: string }): NextResponse {
  return NextResponse.redirect(oauthRedirectUrl(v.redirectUri, { error: v.error, error_description: v.description, state: v.state }), 302)
}

type Prepared = { ok: true; params: AuthorizeParams; clientName: string | null; mcpUrl: string } | { ok: false; response: NextResponse }

async function prepare(search: URLSearchParams, requestOrigin: string): Promise<Prepared> {
  if (studioLiveMode() === 'off') return { ok: false, response: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  const db = studioAdmin()
  if (!db) return { ok: false, response: errorPage('server_error', 'Kineo Studio is not configured on this server.') }
  const mcpUrl = `${studioPublicOrigin(requestOrigin)}${STUDIO_MCP_PATH}`
  const client = await getClient(db, (search.get('client_id') ?? '').trim())
  const v = validateAuthorizeParams(search, client, mcpUrl)
  if (!v.ok) return { ok: false, response: v.redirect ? redirectWithError(v) : errorPage(v.error, v.description) }
  return { ok: true, params: v.value, clientName: client?.client_name ?? null, mcpUrl }
}

async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? { id: user.id, email: user.email ?? null } : null
  } catch {
    return null
  }
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host
  } catch {
    return uri
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const prepared = await prepare(req.nextUrl.searchParams, req.nextUrl.origin)
  if (!prepared.ok) return prepared.response
  const { params, clientName } = prepared
  const user = await currentUser()
  if (!user) {
    const here = `${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(here)}`, req.nextUrl.origin), 302)
  }
  if (!studioAllowsEmail(studioLiveMode(), user.email)) {
    return page('Not open yet', `<div class="card"><h1>Kineo Studio inside Claude is not open to this account yet</h1><p>You are signed in as <strong>${esc(user.email ?? user.id)}</strong>. This connector is being opened gradually; the <a href="/claude-connector" style="color:#2997ff">Kineo MCP page</a> says when it reaches everyone.</p></div>`, 403)
  }
  const nonce = randomBytes(18).toString('base64url')
  const hidden = Object.entries({ client_id: params.client_id, redirect_uri: params.redirect_uri, state: params.state ?? '', code_challenge: params.code_challenge, code_challenge_method: 'S256', scope: params.scope, resource: params.resource ?? '', response_type: 'code', nonce })
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join('')
  const who = clientName ? esc(clientName) : 'An AI assistant'
  const body = `<div class="card"><h1>Allow ${who} to use your Kineo account?</h1>
<p>Signed in as <strong>${esc(user.email ?? user.id)}</strong>. Allowing lets this app:</p>
<ul><li>read your plan, credit balance and recent videos;</li><li><strong>create videos in your account and spend your credits</strong> — the same price and rules as pressing Generate in Kineo Studio.</li></ul>
<p class="k">You will be sent back to</p><p class="v">${esc(hostOf(params.redirect_uri))}</p>
${/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(params.redirect_uri) ? '<p class="warn">This is a local address on your own computer (Claude Code or another local client). Only allow it if you started this connection yourself.</p>' : ''}
<p class="k">Access lasts</p><p>1 hour per token, renewed automatically for up to 30 days. Revoke any time by removing the connector in Claude.</p>
<form method="post" action="${STUDIO_OAUTH_BASE_PATH}/authorize">${hidden}<div class="row"><button class="deny" name="action" value="deny" type="submit">Cancel</button><button class="allow" name="action" value="allow" type="submit">Allow</button></div></form></div>`
  const res = page('Connect Kineo Studio', body)
  res.cookies.set(CONSENT_COOKIE, nonce, { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: `${STUDIO_OAUTH_BASE_PATH}/authorize`, maxAge: 600 })
  return res
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) return errorPage('invalid_request', 'Request is too large.')
  const form = new URLSearchParams(raw)
  const prepared = await prepare(form, req.nextUrl.origin)
  if (!prepared.ok) return prepared.response
  const { params, clientName } = prepared
  const user = await currentUser()
  if (!user) return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(`${STUDIO_OAUTH_BASE_PATH}/authorize?${form.toString()}`)}`, req.nextUrl.origin), 302)
  if (!studioAllowsEmail(studioLiveMode(), user.email)) return errorPage('access_denied', 'Kineo Studio inside Claude is not open to this account yet.')
  const nonce = form.get('nonce') ?? ''
  const cookieNonce = req.cookies.get(CONSENT_COOKIE)?.value ?? ''
  if (!nonce || nonce !== cookieNonce) return errorPage('invalid_request', 'This consent form expired. Go back to Claude and connect again.')
  if (form.get('action') !== 'allow') {
    await recordStudioEvent(STUDIO_AUTH_EVENT, user.id, { outcome: 'denied', client_name: clientName })
    return redirectWithError({ redirectUri: params.redirect_uri, state: params.state, error: 'access_denied', description: 'The person cancelled the connection.' })
  }
  const db = studioAdmin()
  if (!db) return errorPage('server_error', 'Kineo Studio is not configured on this server.')
  const code = await issueCode(db, { client_id: params.client_id, user_id: user.id, redirect_uri: params.redirect_uri, code_challenge: params.code_challenge, scope: params.scope, resource: params.resource })
  if (!code) return errorPage('server_error', 'Could not create the authorization code. Try again.')
  await recordStudioEvent(STUDIO_AUTH_EVENT, user.id, { outcome: 'allowed', client_name: clientName, loopback: /^http:\/\//.test(params.redirect_uri) })
  const res = NextResponse.redirect(oauthRedirectUrl(params.redirect_uri, { code, state: params.state }), 302)
  res.cookies.set(CONSENT_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: `${STUDIO_OAUTH_BASE_PATH}/authorize`, maxAge: 0 })
  return res
}
