import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  GO_PATH_PREFIX,
  HANDOFF_UTM_SOURCE,
  STUDIO_CREATE_PATH,
  buildStudioDestination,
  isHandoffToken,
} from '@/lib/gptHandoff'
import { findHandoff, isLikelyBot, markHandoffClicked } from '@/lib/gptHandoffStore'

// ═══ KINEO-GPT-HANDOFF-2026-09-06 — o CLIQUE em "Make this video" ══════════
//
// Precedente copiado: app/api/episode-link/route.ts (05/09). O botão da página
// /go/<token> não aponta para o Studio; aponta para AQUI, porque duas coisas
// só o servidor faz:
//
//   1. CONTA O CLIQUE. `gpt_landing_clicked` + clicked_at/click_count na linha.
//      Sem esse degrau, "0 filmes vindos do GPT" não distingue "ninguém clicou"
//      de "clicou e morreu no cadastro".
//
//   2. ESCOLHE A PORTA. Com sessão viva: direto em /studio/create com o roteiro
//      na query (script_mode=verbatim, duração, motor, utm). Sem sessão: a tela
//      de conta com `redirect=/go/<token>` — o TOKEN é o portador do roteiro;
//      a query de OAuth se perde na volta, o token não. Quem já tem cookie de
//      sessão antiga vai para /login, quem nunca teve vai para /signup (o
//      mesmo critério do porteiro de /studio/create).
//
// Falha SEMPRE aberta: qualquer erro de banco, sessão ou parâmetro termina em
// redirecionamento — nunca 500. Não concede crédito, não gasta crédito, não
// chama fornecedor.
export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 (#17): rota SÓ-GET nasce com o Data Cache do
// Next ligado e serviria a MESMA resposta para todo mundo.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const FALLBACK = `/studio?utm_source=${HANDOFF_UTM_SOURCE}`

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin

  // ── 1. O token (única chave aceita; lista fechada = uma).
  const token = req.nextUrl.searchParams.get('token')
  if (!isHandoffToken(token)) {
    return NextResponse.redirect(`${origem}${FALLBACK}`, 302)
  }

  // ── 2. A linha. Sem linha ou vencida → a página explica ("link expirou").
  const found = await findHandoff(token).catch(() => ({ status: 'unavailable' as const }))
  if (found.status !== 'ok' || found.expired) {
    return NextResponse.redirect(`${origem}${GO_PATH_PREFIX}${token}`, 302)
  }
  const row = found.row

  // ── 3. Quem é (se houver sessão neste navegador). Falha = deslogado.
  let userId: string | null = null
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    userId = null
  }

  // ── 4. O degrau: o clique.
  const bot = isLikelyBot(req.headers.get('user-agent'))
  try {
    if (!bot) await markHandoffClicked(row, userId)
  } catch {
    // contador é enfeite; o caminho do cliente não é.
  }
  try {
    const sessionId = cookies().get('kineo_event_session_id')?.value ?? null
    await writeServerEvent({
      name: 'gpt_landing_clicked',
      userId,
      path: '/api/gpt/handoff/go',
      sessionId,
      metadata: {
        // O TOKEN E A CHAVE DO FUNIL. Sem ele os degraus "pouso visto" e
        // "clique" nao se ligam ao handoff que os originou, e o SQL do funil
        // marca ZERO ETERNO com qualquer volume de trafego real — falso zero,
        // que e pior que numero ausente porque parece medicao.
        token: row.token,
        signed_in: Boolean(userId),
        bot,
        engine_hint: row.engine_hint,
        duration_sec: row.duration_sec,
        fit: row.fit,
        words: row.words,
        language: row.language,
        click_count: (row.click_count ?? 0) + 1,
      },
    })
  } catch {
    // idem
  }

  // ── 5. A porta certa.
  let destino = STUDIO_CREATE_PATH
  try {
    destino = normalizeInternalRedirect(buildStudioDestination(row)) ?? STUDIO_CREATE_PATH
  } catch {
    destino = STUDIO_CREATE_PATH
  }
  let authPath = '/signup'
  try {
    const hasPriorSession = cookies()
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    authPath = hasPriorSession ? '/login' : '/signup'
  } catch {
    authPath = '/signup'
  }
  const url = userId
    ? `${origem}${destino}`
    : `${origem}${authPath}?redirect=${encodeURIComponent(`${GO_PATH_PREFIX}${token}`)}`
  return NextResponse.redirect(url, 302)
}
