// KINEO-ADMIN-GRANT-2026-08-24 — #297. Dar crédito a um cliente, na hora.
//
// POR QUE ISTO EXISTE, e a história vale a pena porque custou um cliente:
// em 19/08 o fundador ofereceu 100 créditos a quem deixasse uma review. Rick
// (gapozweb@gmail.com, Starter desde 01/08) deixou a ÚNICA review pública que
// a Kineo tem, avisou, esperou, cobrou de novo — e nada. Em 22/08 escreveu um
// e-mail chamado "Feeling forgotten" que termina em "life is a circle".
//
// A causa não foi desleixo: NÃO HAVIA COMO DAR O CRÉDITO. Nenhum botão,
// nenhuma tela, nenhuma rota. A promessa dependia de alguém abrir o banco à
// mão, e "à mão depois" é onde promessa morre. Prometer o que o produto não
// sabe executar é uma dívida que sempre vence no pior momento.
//
// Então o botão passa a existir, com três regras que vieram direto do caso:
//  1. TODA concessão vira evento (`admin_credits_granted`) com quem, quanto e
//     POR QUÊ. Crédito que aparece sem rastro é crédito que ninguém consegue
//     auditar depois — e o painel #295 acabou de mostrar o custo de medir
//     crédito sem medir o outro lado.
//  2. O motivo é OBRIGATÓRIO. Não é burocracia: em três meses ninguém lembra
//     por que fulano ganhou 200 créditos, e é essa amnésia que transforma
//     cortesia em suspeita de fraude na hora da conciliação.
//  3. Teto de 1.000 por chamada. Um dedo escorregando num zero a mais custa
//     dinheiro real de fornecedor (um Kling 3 = 150cr ≈ $11 de fal).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Teto por chamada — ver regra 3 acima. */
const MAX_PER_GRANT = 1000

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      amount?: number
      reason?: string
    }
    const email = (body.email ?? '').trim().toLowerCase()
    const amount = Math.floor(Number(body.amount))
    const reason = (body.reason ?? '').trim()

    if (!email) return NextResponse.json({ error: 'Informe o e-mail.' }, { status: 400 })
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'Informe uma quantidade diferente de zero.' }, { status: 400 })
    }
    if (Math.abs(amount) > MAX_PER_GRANT) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PER_GRANT} créditos por vez (proteção contra zero a mais).` },
        { status: 400 },
      )
    }
    if (reason.length < 3) {
      return NextResponse.json({ error: 'Escreva o motivo — ele fica no histórico.' }, { status: 400 })
    }

    const { data: profile, error: findErr } = await admin
      .from('profiles')
      .select('id, email, video_credits, plan')
      .eq('email', email)
      .maybeSingle()

    if (findErr) throw findErr
    if (!profile) {
      return NextResponse.json({ error: `Ninguém com o e-mail ${email}.` }, { status: 404 })
    }

    const before = typeof profile.video_credits === 'number' ? profile.video_credits : 0
    // Saldo nunca fica negativo: uma correção para baixo pode zerar, não endividar.
    const after = Math.max(0, before + amount)

    const { error: updErr } = await admin
      .from('profiles')
      .update({ video_credits: after })
      .eq('id', profile.id)
    if (updErr) throw updErr

    // Regra 1: rastro. Best-effort — se o log falhar, o crédito JÁ foi dado e
    // esconder isso do admin seria pior do que um evento perdido.
    await admin.from('events').insert({
      user_id: profile.id,
      name: 'admin_credits_granted',
      metadata: {
        amount,
        before,
        after,
        reason,
        granted_by: user.email ?? 'admin',
      },
    }).then(
      () => undefined,
      (e: unknown) => console.error('[grant-credits] log falhou:', e),
    )

    return NextResponse.json({
      ok: true,
      email: profile.email,
      before,
      after,
      granted: after - before,
    })
  } catch (e) {
    console.error('[admin/grant-credits] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Falhou ao conceder crédito.' }, { status: 500 })
  }
}
