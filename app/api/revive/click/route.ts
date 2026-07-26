// KINEO-REVIVE-2026-07-26 — o CTA da /revive passa por aqui antes do checkout.
//
// POR QUE UM REDIRECT E NÃO UM onClick:
//   1. A página /revive/[handle] é 100% Server Component, sem um byte de JS de
//      cliente. Um `onClick` obrigaria a criar um client component só para
//      disparar um fetch — e o clique se perderia em qualquer aparelho onde o JS
//      não executou, que é exatamente o público de email frio no celular.
//   2. lib/trackClick.ts (o sink do browser) é território do Agent B nesta
//      rodada. Escrevendo aqui, o outcome tracking do REVIVE não depende de
//      nenhuma alteração em arquivo compartilhado.
//   3. O clique fica SERVER-AUTHORITATIVE: ninguém consegue inflar o funil
//      chamando o sink público de eventos, porque `revive_mark_click` só tem
//      grant para service_role (migration 022 §5).
//
// A REGRA QUE NÃO PODE SER QUEBRADA: o redirect acontece SEMPRE. Se o banco
// estiver fora, se a migration 022 não estiver aplicada, se o handle for lixo —
// a pessoa ainda vai para o checkout. Perder a métrica é barato; barrar o único
// lead que clicou é o custo da campanha inteira.
import { NextRequest, NextResponse } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  REVIVE_PILOT_CHECKOUT_PATH,
  isLikelyBotUserAgent,
  isSpeculativeRequest,
  markReviveClick,
  normalizeReviveHandle,
} from '@/app/revive/_lib/reviveProspect'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Destino final. Relativo por padrão (/pricing?...), então resolvemos contra a
 * origem da própria requisição — assim funciona igual em preview da Vercel, em
 * localhost e em produção, sem env var de host.
 *
 * Só aceitamos destino ABSOLUTO se ele for http(s). Um
 * NEXT_PUBLIC_REVIVE_PILOT_CHECKOUT_PATH mal preenchido não pode virar um
 * open-redirect com `javascript:` a partir de uma URL que estamos mandando por
 * email em massa.
 */
function resolveDestination(req: NextRequest): string {
  const target = REVIVE_PILOT_CHECKOUT_PATH
  try {
    const url = new URL(target, req.nextUrl.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return new URL('/pricing', req.nextUrl.origin).toString()
    }
    return url.toString()
  } catch {
    return new URL('/pricing', req.nextUrl.origin).toString()
  }
}

export async function GET(req: NextRequest) {
  const destination = resolveDestination(req)
  const handle = normalizeReviveHandle(req.nextUrl.searchParams.get('handle'))

  // 302 e não 307/308: é um GET idempotente e queremos que o navegador NÃO
  // guarde isto em cache — um 308 cacheado faria o próximo clique pular a
  // contagem inteira.
  const res = NextResponse.redirect(destination, 302)
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  // O destino é uma página de compra nossa; não vaza o handle do prospect para
  // fora se um dia o destino virar um domínio de terceiro (Stripe hospedado).
  res.headers.set('Referrer-Policy', 'no-referrer')

  if (!handle) return res

  // Mesmo filtro da página, mesmo motivo (PUSH #97: 39 checkouts abertos por
  // robô). Aqui pesa ainda mais: view→click é a ÚNICA métrica que decide se a
  // campanha continua, e um scanner de email corporativo busca todo link da
  // mensagem. Sem isto, o numerador nasce inflado e a decisão de escalar para
  // 200 canais/semana é tomada em cima de robô.
  if (isSpeculativeRequest(req.headers) || isLikelyBotUserAgent(req.headers.get('user-agent'))) {
    return res
  }

  try {
    // Duas escritas, propósitos diferentes e complementares:
    //   • revive_mark_click  → colunas de outcome na própria linha do prospect
    //     (cta_first_clicked_at / cta_last_clicked_at / cta_click_count). É o
    //     que a planilha de outbound lê por prospect.
    //   • writeServerEvent   → linha em `events`, o mesmo pipeline de todo o
    //     resto do funil, para que revive apareça nas queries de funil já
    //     existentes sem SQL novo.
    // Sem dedupe: clicar duas vezes é sinal de interesse, não ruído.
    const counted = await markReviveClick(handle)

    await writeServerEvent({
      name: 'revive_cta_clicked',
      path: `/revive/${handle}`,
      sessionId: req.cookies.get('kineo_event_session_id')?.value ?? null,
      metadata: {
        handle,
        destination,
        // false = a linha do prospect não foi encontrada/atualizada: alguém
        // chamou /api/revive/click com um handle que não está na tabela.
        prospect_row_updated: counted,
      },
    })
  } catch (err) {
    // Nunca bloqueia o redirect. Ver o comentário no topo.
    console.error('[revive] click tracking failed:', err instanceof Error ? err.message : err)
  }

  return res
}
