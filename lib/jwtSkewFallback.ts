// KINEO-JWT-SKEW-2026-08-28 — leitura própria à prova de relógio torto.
//
// O INCIDENTE. Em 28/08, das 10:30 UTC em diante, o PostgREST do Supabase
// passou a recusar TODO token de usuário recém-emitido com
// `PGRST303: JWT issued at future` — o relógio do serviço de auth ficou
// adiantado em relação ao do PostgREST, e um token "nascido no futuro" é
// rejeitado. Consequência medida em produção:
//   · 3 cadastros novos vindos do ChatGPT bateram 24 vezes em
//     "Your video access could not be verified" no /api/compose e desistiram;
//   · o próprio fundador abriu o app e viu 0 créditos e ZERO vídeos — os 327
//     vídeos dele estavam intactos no banco; era a LEITURA que falhava e a
//     tela mostrava vazio em vez de erro.
// Sessões antigas continuavam funcionando (token antigo tem iat no passado),
// o que fez o defeito parecer intermitente e atrasou o diagnóstico.
//
// A DEFESA. Nessas rotas o usuário JÁ FOI autenticado por
// `supabase.auth.getUser()` — que valida no serviço de auth e NÃO passa pelo
// PostgREST, então continua funcionando durante o skew. Se a identidade é
// certa, a leitura do PRÓPRIO perfil pode ser refeita com a chave de serviço
// (cujo token foi emitido na criação do projeto — iat no passado, imune ao
// skew), FILTRADA pelo user.id verificado. Não há elevação de privilégio:
// lê-se exatamente o que a RLS deixaria ler, só que por um túnel cujo
// relógio não quebra.
//
// LIMITES DELIBERADOS:
//   · Só LEITURA do próprio dado (.eq no id verificado). Nunca usar este
//     helper para escrita nem para dados de terceiros.
//   · Só dispara no erro de skew (PGRST303 / mensagem de JWT). Qualquer outro
//     erro continua estourando como sempre — mascarar RLS quebrada com a
//     chave de serviço esconderia um vazamento de permissão.
//   · Loga toda ativação: se este fallback está rodando, o Supabase está
//     doente e alguém precisa apertar Restart project no dashboard.

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

/** O erro é o skew de relógio (ou irmão de validação de JWT)? */
export function isJwtSkewError(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false
  const code = (err.code ?? '').toUpperCase()
  const msg = (err.message ?? '').toLowerCase()
  return code === 'PGRST301' || code === 'PGRST303' ||
    msg.includes('jwt issued at future') || msg.includes('jwt expired') || msg.includes('invalid jwt')
}

/** Cliente de serviço para o fallback. null se o env não estiver configurado. */
export function skewFallbackClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

/**
 * Reexecuta uma leitura do próprio usuário pela chave de serviço quando a
 * falha original foi skew de JWT. `run` recebe o cliente de serviço e deve
 * repetir a MESMA query, filtrada pelo id já verificado.
 * Devolve null quando o fallback não se aplica (erro de outra natureza ou
 * env sem chave) — o chamador segue com o tratamento de erro normal.
 */
export async function retryOwnReadOnSkew<T>(
  originalError: { code?: string | null; message?: string | null } | null | undefined,
  route: string,
  // PromiseLike, não Promise: o query builder do supabase-js é um thenable
  // (PostgrestBuilder) e não tem .catch/.finally — exigir Promise quebraria
  // todo chamador que passa a query direto, como estes fazem.
  run: (admin: SupabaseClient) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  if (!isJwtSkewError(originalError)) return null
  const admin = skewFallbackClient()
  if (!admin) return null
  const { data, error } = await run(admin)
  if (error) {
    console.error(`[${route}] jwt-skew fallback also failed:`, error.message)
    return null
  }
  // Ruído proposital: cada linha destas no log é o sintoma de que o relógio
  // do Supabase segue torto. O dia em que ela parar de aparecer, o incidente
  // acabou.
  console.warn(`[${route}] PGRST303 jwt-skew: served own-profile read via service key (Supabase clock is off — restart the project)`)
  return data
}
