// KINEO-AUTOPILOT-2026-07-26 — ponte de sessão do cron para as rotas reais.
//
// ═══════════════════════════════════════════════════════════════════════════
// O PROBLEMA
// ═══════════════════════════════════════════════════════════════════════════
// /api/compose, /api/generate-video-fast, /api/compose/status e
// /api/youtube/upload autenticam com `supabase.auth.getUser()` lendo COOKIE.
// Não existe (e não foi criado) nenhum caminho de service-token nessas rotas.
// Um cron não tem cookie.
//
// As duas saídas eram:
//   (a) reimplementar o pipeline de render dentro do cron — ou seja, FORKAR as
//       ~1800 linhas de /api/compose (TTS, Whisper, captions, Creatomate,
//       ledger de crédito, watermark). Todo bug corrigido lá teria que ser
//       corrigido aqui de novo. É exatamente o que a instrução "Do not fork the
//       render logic" proíbe, e é como se perde paridade de billing.
//   (b) o cron agir COMO O PRÓPRIO DONO da agenda: emitir uma sessão real e
//       curta para aquele usuário e chamar as MESMAS rotas HTTP que o browser
//       dele chamaria.
//
// Escolhi (b). Consequência direta: o Autopilot herda de graça e para sempre o
// ledger de crédito, o teto de plano, o claim anti-duplo-submit, a marca d'água
// de free e a persistência em `videos` — sem uma segunda cópia de nada.
//
// ═══════════════════════════════════════════════════════════════════════════
// LIMITES DESTA ESCOLHA (leia antes de mexer)
// ═══════════════════════════════════════════════════════════════════════════
// • A sessão é emitida via service_role (generateLink + verifyOtp) APENAS para
//   o user_id dono da autopilot_schedule. O cron nunca escolhe usuário a partir
//   de input externo — só a partir de linhas da própria tabela.
// • generateLink('magiclink') INVALIDA um magic link pendente daquele email.
//   Se o usuário tiver pedido "entrar por link" no exato instante do cron, o
//   link dele pode falhar e ele precisa pedir outro.
// • O formato do cookie acompanha @supabase/ssr (prefixo "base64-" + chunks de
//   3180 chars, MAX_CHUNK_SIZE em @supabase/ssr/dist/main/utils/chunker.js).
//   É acoplamento a detalhe interno da lib: se @supabase/ssr subir de major,
//   VALIDE isto antes de subir.
// • Nada de segredo é hardcoded: tudo vem de process.env.

import { createClient as createSupabaseClient, type Session } from '@supabase/supabase-js'

// Espelha MAX_CHUNK_SIZE de @supabase/ssr.
const MAX_CHUNK_SIZE = 3180

function projectRef(supabaseUrl: string): string | null {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || null
  } catch {
    return null
  }
}

/**
 * Serializa a sessão no formato exato que @supabase/ssr lê do cookie store:
 * "base64-" + base64url(JSON), fatiado em `name.0`, `name.1`, ... quando o
 * valor URL-encodado passa de MAX_CHUNK_SIZE.
 */
function sessionCookieHeader(storageKey: string, session: Session): string {
  const raw = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')

  // O valor é base64url puro (só [A-Za-z0-9_-]) mais o prefixo, então
  // encodeURIComponent é identidade aqui e o corte por tamanho é seguro.
  if (encodeURIComponent(raw).length <= MAX_CHUNK_SIZE) {
    return `${storageKey}=${raw}`
  }
  const parts: string[] = []
  let rest = raw
  let i = 0
  while (rest.length > 0) {
    const head = rest.slice(0, MAX_CHUNK_SIZE)
    parts.push(`${storageKey}.${i}=${head}`)
    rest = rest.slice(head.length)
    i++
  }
  return parts.join('; ')
}

export interface UserSession {
  cookieHeader: string
  accessToken: string
  expiresAtMs: number
}

/**
 * Emite uma sessão real e curta para `userId`. Retorna null (nunca lança) se
 * o ambiente não estiver configurado ou o usuário não puder autenticar — quem
 * chama marca a run como failed com motivo legível.
 */
export async function mintUserSession(userId: string): Promise<UserSession | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) {
    console.error('[autopilot/session] Supabase env incompleto — não dá para agir como o usuário')
    return null
  }
  const ref = projectRef(url)
  if (!ref) {
    console.error('[autopilot/session] NEXT_PUBLIC_SUPABASE_URL inválida')
    return null
  }

  try {
    const admin = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (userError || !email) {
      console.error(`[autopilot/session] usuário ${userId.slice(0, 8)} sem email utilizável:`, userError?.message)
      return null
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    const hashedToken = (linkData?.properties as { hashed_token?: string } | undefined)?.hashed_token
    if (linkError || !hashedToken) {
      console.error(`[autopilot/session] generateLink falhou para ${userId.slice(0, 8)}:`, linkError?.message)
      return null
    }

    const anon = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: otpData, error: otpError } = await anon.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    })
    const session = otpData?.session
    if (otpError || !session) {
      console.error(`[autopilot/session] verifyOtp falhou para ${userId.slice(0, 8)}:`, otpError?.message)
      return null
    }
    // Trava de segurança: a sessão emitida TEM que ser do usuário pedido.
    if (session.user?.id !== userId) {
      console.error('[autopilot/session] sessão emitida para o usuário errado — abortando')
      return null
    }

    return {
      cookieHeader: sessionCookieHeader(`sb-${ref}-auth-token`, session),
      accessToken: session.access_token,
      expiresAtMs: (session.expires_at ?? 0) * 1000,
    }
  } catch (e) {
    console.error('[autopilot/session] mint threw:', e instanceof Error ? e.message : String(e))
    return null
  }
}

export interface ApiCallResult<T> {
  ok: boolean
  status: number
  body: T | null
  errorText: string | null
}

/** Chama uma rota interna COMO o usuário dono da agenda. */
export async function callAsUser<T = Record<string, unknown>>(args: {
  baseUrl: string
  path: string
  session: UserSession
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
}): Promise<ApiCallResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 120_000)
  try {
    const res = await fetch(`${args.baseUrl}${args.path}`, {
      method: args.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: args.session.cookieHeader,
        // O middleware consolida hosts legados com 308; o cron sempre chama a
        // origem canônica recebida na própria request, então não há redirect.
        'User-Agent': 'Kineo-Autopilot/1.0',
      },
      body: args.method === 'GET' ? undefined : JSON.stringify(args.body ?? {}),
      signal: controller.signal,
      redirect: 'manual',
    })

    const text = await res.text()
    let parsed: T | null = null
    try {
      parsed = text ? (JSON.parse(text) as T) : null
    } catch {
      parsed = null
    }
    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
      errorText: res.ok ? null : (text || `HTTP ${res.status}`).slice(0, 500),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 0, body: null, errorText: msg.slice(0, 500) }
  } finally {
    clearTimeout(timer)
  }
}
