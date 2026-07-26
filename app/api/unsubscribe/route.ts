// KINEO-UNSUBSCRIBE-2026-07-26 — endpoint de descadastro.
//
// Aceita os DOIS caminhos que existem no mundo real:
//
//   POST  → one-click do RFC 8058. Gmail/Outlook mostram o botão nativo
//           "Unsubscribe" porque o email carrega List-Unsubscribe-Post, e ao
//           clicar fazem POST nesta URL com corpo `List-Unsubscribe=One-Click`.
//           Resposta esperada pelo RFC: 2xx com corpo vazio. Nada de redirect,
//           nada de JSON — o cliente de email não renderiza nada.
//
//   GET   → o clique humano no link do rodapé. Descadastra e manda a pessoa
//           para /unsubscribe?done=1, que confirma na tela.
//
// O formulário da própria página /unsubscribe também faz POST aqui, mas com o
// campo `web=1`. Nesse caso respondemos 303 para a tela de confirmação em vez
// do corpo vazio — assim a página não precisa de JavaScript de cliente.
//
// PRIVACIDADE: a resposta é IDÊNTICA exista ou não o perfil. Este endpoint é
// público e não autenticado; se um id inexistente respondesse diferente de um
// id real, ele viraria um oráculo de "esse usuário está cadastrado no Kineo?".
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/emailSuppression'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type OptOutOutcome = 'ok' | 'bad_token' | 'not_configured'

/**
 * Marca o opt-out. Só distingue token inválido de sucesso — se o perfil não
 * existe, o update afeta 0 linhas e devolvemos 'ok' do mesmo jeito (ver nota
 * de privacidade no topo).
 */
async function applyOptOut(userId: string, token: string): Promise<OptOutOutcome> {
  const id = (userId ?? '').trim()
  if (!id || !verifyUnsubscribeToken(id, token)) return 'bad_token'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[unsubscribe] Supabase service env missing — opt-out NOT persisted')
    return 'not_configured'
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin
    .from('profiles')
    .update({ email_opted_out: true, email_opted_out_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    // Não é 'ok': se o banco recusou, a pessoa continua na lista. Logar alto —
    // um opt-out perdido é o mesmo problema legal de não ter unsubscribe.
    console.error('[unsubscribe] update failed:', error.message)
    return 'not_configured'
  }

  console.log(`[unsubscribe] opted out ${id}`)
  return 'ok'
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') ?? ''
  const token = req.nextUrl.searchParams.get('t') ?? ''

  // O formulário da nossa própria página se identifica com web=1 para receber
  // um redirect em vez do corpo vazio que o RFC 8058 pede.
  let fromWebForm = req.nextUrl.searchParams.get('web') === '1'
  try {
    const body = await req.text()
    if (body && /(^|&)web=1(&|$)/.test(body)) fromWebForm = true
  } catch {
    // corpo ausente/ilegível — segue como one-click
  }

  const outcome = await applyOptOut(userId, token)

  if (fromWebForm) {
    const dest = new URL(outcome === 'ok' ? '/unsubscribe?done=1' : '/unsubscribe?error=1', req.nextUrl.origin)
    return NextResponse.redirect(dest, 303)
  }

  // RFC 8058: 200 e corpo vazio.
  if (outcome === 'ok') return new NextResponse(null, { status: 200 })
  if (outcome === 'bad_token') return new NextResponse(null, { status: 400 })
  return new NextResponse(null, { status: 500 })
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') ?? ''
  const token = req.nextUrl.searchParams.get('t') ?? ''

  const outcome = await applyOptOut(userId, token)

  const dest = new URL(outcome === 'ok' ? '/unsubscribe?done=1' : '/unsubscribe?error=1', req.nextUrl.origin)
  return NextResponse.redirect(dest, 303)
}
