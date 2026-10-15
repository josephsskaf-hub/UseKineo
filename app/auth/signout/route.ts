// KINEO-SAIR-DA-CONTA-1510 — a saída de verdade acontece AQUI, no servidor, sem depender da trava do auth-js no
// navegador (que prendeu o fundador em 15/10 — causa inteira em lib/auth/sairDaConta.ts).
//   1. revoga a sessão no Supabase (POST /logout scope=local) com teto — refresh token morto, cookie ressuscitado
//      por qualquer pedido atrasado não vale mais nada;
//   2. apaga TODO cookie sb-* (os que vieram no pedido + os nomes conhecidos do projeto, pedaços .0-.4 e
//      code-verifier) em todas as variações de domínio, com Set-Cookie;
//   3. Cache-Control: no-store — nenhuma camada guarda esta resposta.
// O middleware NÃO renova a sessão nesta rota (middleware.ts), senão podia devolver um cookie novo junto com o apagão.
// Só POST: GET de saída permitiria a qualquer site deslogar a pessoa com uma <img>.
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  SAIR_DA_CONTA_DESTINO,
  SAIR_DA_CONTA_REVOGA_TIMEOUT_MS,
  ehCookieDeSessao,
  linhasParaApagarCookies,
  nomesDeSessaoConhecidos,
} from '@/lib/auth/sairDaConta'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

type Revogacao = 'ok' | 'erro' | 'teto' | 'sem_sessao'

async function revogarSessao(request: NextRequest): Promise<Revogacao> {
  const temSessao = request.cookies.getAll().some((c) => ehCookieDeSessao(c.name))
  if (!temSessao) return 'sem_sessao'
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          // Quem apaga os cookies é esta rota, linha a linha (abaixo). Nada que o cliente do Supabase queira
          // gravar aqui (ex.: um token renovado antes do logout) pode voltar para o navegador.
          setAll() {},
        },
      },
    )
    let timer: ReturnType<typeof setTimeout> | null = null
    const teto = new Promise<'teto'>((resolve) => {
      timer = setTimeout(() => resolve('teto'), SAIR_DA_CONTA_REVOGA_TIMEOUT_MS)
    })
    const r = await Promise.race([supabase.auth.signOut({ scope: 'local' }), teto])
    if (timer) clearTimeout(timer)
    if (r === 'teto') return 'teto'
    return r.error ? 'erro' : 'ok'
  } catch {
    return 'erro'
  }
}

export async function POST(request: NextRequest) {
  const revogacao = await revogarSessao(request)
  if (revogacao === 'erro' || revogacao === 'teto') {
    console.warn(`[auth/signout] revogação ${revogacao} — cookies apagados mesmo assim`)
  }

  const nomes = [
    ...request.cookies.getAll().map((c) => c.name).filter(ehCookieDeSessao),
    ...nomesDeSessaoConhecidos(process.env.NEXT_PUBLIC_SUPABASE_URL),
  ]
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim()
  const seguro = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'

  // Formulário/navegação (sem JS) → 303 para a home (SAIR_DA_CONTA_DESTINO). fetch do botão → JSON com o destino.
  const accept = request.headers.get('accept') || ''
  const ehNavegacao = request.headers.get('sec-fetch-mode') === 'navigate' || (accept.includes('text/html') && !accept.includes('application/json'))
  const res = ehNavegacao
    ? NextResponse.redirect(new URL(SAIR_DA_CONTA_DESTINO, request.url), 303)
    : NextResponse.json({ ok: true, redirect: SAIR_DA_CONTA_DESTINO, revoked: revogacao })

  for (const linha of linhasParaApagarCookies(nomes, host, seguro)) res.headers.append('Set-Cookie', linha)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  return res
}
