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

// KINEO-CREDIT-STUCK-2026-08-08 — DE 1×/DIA PARA DE HORA EM HORA
// (vercel.json: `30 9 * * *` → `30 * * * *`).
//
// O PROBLEMA COM O DIÁRIO: um crédito preso às 09h31 só voltava às 09h30 do dia
// seguinte — quase 24h. Numa noite de pico de lançamento isso não é "atraso de
// contabilidade", é a pessoa abrindo o app, vendo o saldo errado, pedindo
// reembolso ou indo embora. E o trial de 40 créditos torna o dano proporcional:
// um Seedance preso (20 cr) é METADE do que a empresa comprou por $347.
//
// POR QUE DE HORA EM HORA E NÃO A CADA 5 MIN: os cutoffs internos das varreduras
// (2h para render comum, 45 min para cinematográfico desde 14/08 — antes 3h,
// encurtado contra a curva de entrega medida: 50 rendes entregues em 30 dias,
// p95 7,4 min e máximo 14,3 min, então 45 min ainda é 3,1x o pior caso já visto)
// já garantem que nada VIVO é tocado — varrer mais rápido que isso não devolve
// nada mais cedo, só gasta. A cadência de hora em hora passou a IMPORTAR mais
// com o corte menor: ela é que define o pior caso real do estorno, agora entre
// 45 e 105 min (era 185–230 min medidos nos 7 renders travados de 11–14/08).
// De hora em hora é o menor intervalo que ainda reduz o pior caso de 24h para
// ~1h acima do cutoff, e é a mesma cadência que send-activation-nudge,
// send-post-nudge e trial-downgrade já rodam sem problema.
//
// CUSTO: 24 execuções/dia em vez de 1. Cada uma faz no máximo 200 + 1000 + 200
// SELECTs e ZERO chamadas a provedor pago quando não há nada a devolver — que é
// o caso na esmagadora maioria das rodadas (hoje, 08/08, a base tem ZERO débitos
// presos). Nenhum e-mail é enviado por esta rota, então não consome cota do
// Resend. Nenhuma tabela nova: as três varreduras já existiam.
//
// IDEMPOTÊNCIA (o que torna a frequência segura): todo o dinheiro volta por
// refund_render_credits — UPDATE condicional `WHERE refunded_at IS NULL
// ... RETURNING` — então N rodadas simultâneas rendem no máximo UM estorno. As
// varreduras também falham FECHADAS: qualquer erro de consulta pula a linha e
// tenta na rodada seguinte (que agora vem em 1h, não em 24h).
//
// :30 foi escolhido por não colidir com nenhum outro cron horário existente
// (:05/:35 winback, :10/:40 video-ready, :15/:45 cap-hit, :40 activation,
// :50 post-nudge, :55 trial-downgrade, :00 autopilot).
import { NextRequest, NextResponse } from 'next/server'
import { sweepAbandonedCinematicDebits, sweepStuckRenderDebits } from '@/lib/credits/refund'
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
  // KINEO-CREDIT-INTEGRITY-2026-08-05 — os motores cinematográficos debitam no
  // SUBMIT e só tinham refund AO VIVO (dependente da aba do usuário continuar
  // aberta). Esta terceira varredura fecha o buraco.
  const cinematic = { scanned: 0, delivered: 0, refunded: 0, creditsReturned: 0 }
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

  try {
    Object.assign(cinematic, await sweepAbandonedCinematicDebits())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`abandoned_cinematic: ${msg}`)
    console.error('[cron/refund-sweep] abandoned-cinematic sweep failed:', msg)
  }

  console.log('[cron/refund-sweep]', JSON.stringify({ renders, animate, cinematic, errors }))

  // 200 mesmo com erro parcial: as três varreduras são idempotentes e rodam de
  // novo na hora seguinte. Um 5xx aqui só produziria ruído sem ação possível.
  return NextResponse.json({ ok: errors.length === 0, renders, animate, cinematic, errors })
}
