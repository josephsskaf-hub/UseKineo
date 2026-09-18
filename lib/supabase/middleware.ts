import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveAuthRedirect } from '@/lib/authRedirect'

// ═══ KINEO-MIDDLEWARE-AUTH-TIMEOUT-2026-09-18 — o site não cai quando a autenticação do Supabase engasga ═══
//
// INCIDENTE (18/09, 12:00-12:35 BRT): Supabase Auth degradado (status oficial: "API Gateway: Degraded Performance",
// incidente de JWT aberto desde 14/08). Este middleware roda em TODA página e esperava `auth.getUser()` sem limite;
// a Vercel mata o edge em 25 s → 504 MIDDLEWARE_INVOCATION_TIMEOUT para o cliente (3 h: /studio/create 16×, /generate
// 6×, painel 176×; crons de entrega também). O banco estava saudável — só a autenticação demorava.
//
// REGRA: a leitura da sessão tem AUTH_TIMEOUT_MS. Estourou ou falhou → a página segue como VISITANTE (user = null),
// sem tocar em cookie nenhum (a sessão da pessoa continua no navegador e volta na próxima leitura). O custo é pequeno
// e nomeado: nesses segundos, rota protegida (/history, /library) manda para o login. O ganho: nenhuma página pública,
// nenhuma tela de estúdio e nenhum cron cai por lentidão de Auth. Cada ocorrência vira `console.warn` com o marcador
// abaixo — é o número a ler nos logs da Vercel depois de todo incidente. Fundador (18/09): "Vai".
export const AUTH_TIMEOUT_MS = 4000
export const AUTH_TIMEOUT_MARK = '[middleware] auth timeout — served as anonymous'

async function getUserWithTimeout<T>(read: () => Promise<{ data: { user: T | null } }>, pathname: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), AUTH_TIMEOUT_MS) })
  try {
    const result = await Promise.race([read().then((r) => r.data.user), timeout])
    if (result === 'timeout') {
      console.warn(`${AUTH_TIMEOUT_MARK} path=${pathname} after=${AUTH_TIMEOUT_MS}ms`)
      return null
    }
    return result
  } catch (e) {
    console.warn(`${AUTH_TIMEOUT_MARK} path=${pathname} error=${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}`)
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  // KINEO-MIDDLEWARE-AUTH-TIMEOUT-2026-09-18 — com limite; estourou → visitante, sem apagar cookie.
  const user = await getUserWithTimeout(() => supabase.auth.getUser(), pathname)

  // ─── NO cloaking — same content for everyone, including Googlebot ───────────
  // The old "coming soon" gate (NEXT_PUBLIC_COMING_SOON) was removed on
  // 2026-06-18. It used to redirect logged-out visitors — which includes search
  // crawlers — to a /coming-soon splash while logged-in users saw the full app.
  // That divergence could be read as cloaking by Google Ads, so it is gone:
  // every visitor (anonymous, logged-in, or Googlebot) now receives the exact
  // same public site. Do NOT reintroduce any auth/user-agent-based content
  // switching on public marketing routes.

  // /pricing is public — anyone can browse plans.
  // Auth is enforced at the action level (checkout requires sign-in).
  const protectedPaths = ['/history', '/library']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // KINEO-AUDIT-REDIRECT-2026-08-18: destino preservado (login le ?redirect=)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    // KINEO-CHECKOUT-RESUME-2026-07-07 — honor ?redirect for already-logged-in
    // users instead of hardcoding /dashboard. Before this, a buyer bounced off
    // checkout (expired API session) → /login?redirect=... → middleware saw a
    // session → /dashboard, silently eating the purchase. Same-origin only.
    const rawRedirect = request.nextUrl.searchParams.get('redirect')
    const safe = resolveAuthRedirect(rawRedirect, '/dashboard')
    const dest = request.nextUrl.clone()
    const qIdx = safe.indexOf('?')
    dest.pathname = qIdx === -1 ? safe : safe.slice(0, qIdx)
    dest.search = qIdx === -1 ? '' : safe.slice(qIdx)
    return NextResponse.redirect(dest)
  }

  return supabaseResponse
}
