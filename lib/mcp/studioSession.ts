// ═══ KINEO-MCP-STUDIO-2010 — a sessão Kineo da pessoa, cunhada no servidor, para chamar o site COMO ELA ═════════
//
// O /api/generate-video-cinematic (e todo o pipeline atrás dele) só conhece UMA identidade: a sessão Supabase que
// chega no cookie `sb-<ref>-auth-token` (lib/supabase/server.ts → @supabase/ssr). Para que o pedido do Claude passe
// pelo MESMO caminho do clique em Generate — mesmo plano, mesmo saldo, mesma moderação, mesma régua, mesma cobrança —
// o conector não reimplementa nada: ele cunha uma sessão real da pessoa e chama a rota com esse cookie.
//
// Como se cunha sem senha: admin.generateLink({ type: 'magiclink' }) devolve o hashed_token SEM mandar e-mail; o
// cliente anônimo troca esse hash por uma sessão (verifyOtp). A sessão vive só durante a chamada: `dispose()` a
// encerra (admin.signOut com escopo local) assim que a rota responde. Nada disto toca o token OAuth do Claude — o
// servidor MCP nunca repassa o token do cliente a ninguém (spec: token passthrough é proibido).
//
// A parte PURA (nome do cookie, serialização em pedaços igual à do @supabase/ssr 0.5) é testável sem rede.
import { createClient as createSupabaseClient, type Session } from '@supabase/supabase-js'

/** @supabase/ssr: `sb-<primeiro rótulo do host>-auth-token`. */
export function supabaseCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

/** Mesmo molde do @supabase/ssr 0.5.x: "base64-" + base64url(JSON); acima de 3180 chars vai em `nome.0`, `nome.1`… */
export const SSR_COOKIE_CHUNK = 3180
export function sessionCookiePairs(name: string, session: Record<string, unknown>): { name: string; value: string }[] {
  const encoded = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (encoded.length <= SSR_COOKIE_CHUNK) return [{ name, value: encoded }]
  const out: { name: string; value: string }[] = []
  for (let i = 0, n = 0; i < encoded.length; i += SSR_COOKIE_CHUNK, n++) out.push({ name: `${name}.${n}`, value: encoded.slice(i, i + SSR_COOKIE_CHUNK) })
  return out
}
export function sessionCookieHeader(name: string, session: Record<string, unknown>): string {
  return sessionCookiePairs(name, session).map((p) => `${p.name}=${p.value}`).join('; ')
}

export type MintedSession = { cookie: string; accessToken: string; dispose: () => Promise<void> }

export async function mintUserSession(userId: string, email: string): Promise<{ ok: true; session: MintedSession } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) return { ok: false, error: 'supabase_env_missing' }
  const admin = createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = link.data?.properties?.hashed_token
  if (link.error || !tokenHash) return { ok: false, error: `generate_link_failed:${link.error?.message ?? 'no_token'}` }
  if (link.data?.user?.id && link.data.user.id !== userId) return { ok: false, error: 'generate_link_user_mismatch' }
  const anon = createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const verified = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  const session: Session | null = verified.data?.session ?? null
  if (verified.error || !session || session.user?.id !== userId) return { ok: false, error: `verify_otp_failed:${verified.error?.message ?? 'no_session'}` }
  const cookie = sessionCookieHeader(supabaseCookieName(url), session as unknown as Record<string, unknown>)
  return {
    ok: true,
    session: {
      cookie,
      accessToken: session.access_token,
      dispose: async () => {
        try {
          await admin.auth.admin.signOut(session.access_token, 'local')
        } catch {
          /* melhor esforço: a sessão expira sozinha */
        }
      },
    },
  }
}
