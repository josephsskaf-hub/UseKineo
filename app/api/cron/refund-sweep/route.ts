// KINEO-REFUND-CRON-2026-07-27 — o refund sweep sai da carona.
//
// POR QUE ESTA ROTA EXISTE
// ────────────────────────
// `sweepStuckRenderDebits()` e `sweepStaleAnimateClaims()` moravam DENTRO de
// app/api/cron/send-reminders/route.ts. O comentário de lá explicava o motivo:
// "Vercel Hobby silently rejects deploys when cron limits are exceeded" — ou
// seja, a única razão para o refund de crédito viajar de carona num cron de
// e-mail era economizar uma entrada de agendamento num plano que a conta não
// tem mais. **A conta é Pro** (confirmado pelo fundador em 27/07/2026), então o
// contorno venceu.
//
// O que isso conserta, concretamente: enquanto o refund dependia do cron de
// e-mail, qualquer coisa que derrubasse aquela rota — um 500 no topo, uma pausa,
// alguém removendo o agendamento porque "os e-mails estão desligados mesmo" —
// parava de devolver crédito a quem pagou por um render que nunca terminou, em
// silêncio, sem ninguém perceber. Duas responsabilidades sem relação nenhuma
// compartilhavam um ponto único de falha.
//
// ESTA ROTA NÃO ENVIA E-MAIL. Nenhuma das duas funções toca a Resend:
//   lib/credits/refund.ts        → só RPC refund_render_credits + consultas
//   lib/animate/service.ts:170   → só consultas + reconciliação de crédito
// Por isso ela roda independentemente de KINEO_LIFECYCLE_EMAILS_ENABLED: o
// portão de e-mail nunca deveria ter podido bloquear a devolução de dinheiro.

import { NextRequest, NextResponse } from 'next/server'
import { sweepStuckRenderDebits } from '@/lib/credits/refund'
import { sweepStaleAnimateClaims } from '@/lib/animate/service'

export const dynamic = 'force-dynamic'
// As duas varreduras fazem até 200 + 1000 leituras e um RPC por linha elegível.
// 300s é o mesmo teto que send-reminders já usava para carregar as duas.
export const maxDuration = 300

// Padrão correto de autenticação de cron deste repo — falha FECHADA quando a
// env some. Ver AGENTS.md §6.5 e app/api/cron/autopilot-generate/route.ts:78.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const renders = { scanned: 0, refunded: 0, creditsReturned: 0 }
  const animate = { scanned: 0, refunded: 0, released: 0 }
  const errors: string[] = []

  // As duas varreduras são independentes: uma falhar não pode impedir a outra
  // de devolver crédito.
  try {
    Object.assign(renders, await sweepStuckRenderDebits())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`stuck_render: ${msg}`)
    console.error('[cron/refund-sweep] stuck-render sweep failed:', msg)
  }

  try {
    Object.assign(animate, await sweepStaleAnimateClaims())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`stale_animate: ${msg}`)
    console.error('[cron/refund-sweep] stale-animate sweep failed:', msg)
  }

  console.log('[cron/refund-sweep]', JSON.stringify({ renders, animate, errors }))

  // 200 mesmo com erro parcial: as duas varreduras são idempotentes e rodam de
  // novo amanhã. Um 5xx aqui só produziria ruído de alerta sem ação possível.
  return NextResponse.json({ ok: errors.length === 0, renders, animate, errors })
}
