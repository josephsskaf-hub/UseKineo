// ═══════════════════════════════════════════════════════════════════════════
// KINEO-GRACA-NAO-CUROU-2026-09-07 — "QUEM A GRAÇA DEIXOU PARA TRÁS?"
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE EXISTE. A graça de cobrança (c94b140a, 07/09 02:51 BRT) impede que
// uma renovação recusada derrube o plano enquanto a Stripe repete o cartão.
// Mas ela só age em evento NOVO. As duas vítimas que o cabeçalho dela nomeia
// (US$ 24,90 AU em 04/09 e US$ 9,90 NG em 03/09) foram revogadas ANTES de a
// graça existir e continuam `has_paid=true`, `plan='free'`, com a assinatura
// viva e ainda sendo cobrada. Medido em 07/09: 13 pagantes na vida inteira,
// 8 com plano ativo, 5 que pagaram e hoje estão `free` — e estas 2 são as
// únicas cujas assinaturas a Stripe AINDA cobra.
//
// O webhook agora se cura sozinho na PRÓXIMA recusa (ver o ramo da graça em
// app/api/stripe/webhook/route.ts). Esta rota é o remédio para quem não pode
// esperar a próxima recusa — e o painel para saber quantos há.
//
// O QUE FAZ. Lê a coorte `has_paid=true · plan='free' · stripe_subscription_id
// not null`, pergunta à Stripe o estado VIVO de cada assinatura e passa tudo
// pela MESMA decisão pura do webhook (lib/billing/dunningReconcile.ts). Nunca
// decide aqui dentro; se um dia a rota e o webhook discordarem, é porque
// alguém duplicou a regra.
//
// GUARD RAILS: só admin logado (mesmo guard das outras /admin) · DRY-RUN por
// padrão, só escreve com ?confirm=APPLY · o update é de DOIS campos (`plan`,
// `is_pro`) e NUNCA toca crédito — crédito só volta na fatura paga · uma
// falha da Stripe numa pessoa vira `skip 'stripe_indisponivel'` e as outras
// continuam · nunca ecoa valor de env nem segredo.
//
// GET /api/admin/reconcile-dunning            → relatório, nada escrito
// GET /api/admin/reconcile-dunning?confirm=APPLY → aplica e grava os eventos
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  decideDunningReconcile,
  type DunningReconcileDecision,
} from '@/lib/billing/dunningReconcile'

export const maxDuration = 120
export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso. Sem esta linha
// o relatório poderia congelar na primeira leitura — e um painel que diz
// "2 para restaurar" depois de restaurar seria pior que painel nenhum.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

type Linha = {
  email: string | null
  user_id: string
  plan_atual: string | null
  is_pro_atual: boolean
  subscription_ref: string
  stripe_status: string | null
  metadata_tier: string | null
  action: DunningReconcileDecision['action'] | 'skip'
  reason: DunningReconcileDecision['reason'] | 'stripe_indisponivel'
  tier: DunningReconcileDecision['tier']
  aplicado?: 'ok' | 'falhou'
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const admin = serviceClient()
  if (!admin) {
    return NextResponse.json({ error: 'service role not configured' }, { status: 500 })
  }

  const confirm = req.nextUrl.searchParams.get('confirm') === 'APPLY'

  // ── Coorte: pagou, está free, e o perfil ainda reconhece uma assinatura ──
  // Cabe numa página: são 13 pagantes na vida inteira. Se um dia passar de
  // 1000 a regra anti-truncamento (fetchAllRows) entra aqui.
  const { data: coorte, error: coorteErr } = await admin
    .from('profiles')
    .select('id, email, plan, is_pro, has_paid, stripe_subscription_id')
    .eq('has_paid', true)
    .eq('plan', 'free')
    .not('stripe_subscription_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000)
  if (coorteErr) {
    return NextResponse.json({ error: coorteErr.message }, { status: 500 })
  }

  const linhas: Linha[] = []
  for (const p of coorte ?? []) {
    const userId = String(p.id)
    const subscriptionRef = String(p.stripe_subscription_id)
    const base = {
      email: (p.email as string | null) ?? null,
      user_id: userId,
      plan_atual: (p.plan as string | null) ?? null,
      is_pro_atual: p.is_pro === true,
      subscription_ref: subscriptionRef,
    }

    // Uma pessoa cuja assinatura a Stripe não devolve não pode travar as
    // outras — e também não pode ser restaurada às cegas.
    let live: { id: string; status: string; metadataTier: string | null }
    try {
      const s = await stripe.subscriptions.retrieve(subscriptionRef)
      live = {
        id: s.id,
        status: s.status,
        metadataTier: typeof s.metadata?.tier === 'string' ? s.metadata.tier : null,
      }
    } catch (err) {
      console.error('[reconcile-dunning] stripe retrieve failed:', subscriptionRef, err instanceof Error ? err.message : String(err))
      linhas.push({
        ...base,
        stripe_status: null,
        metadata_tier: null,
        action: 'skip',
        reason: 'stripe_indisponivel',
        tier: null,
      })
      continue
    }

    const decision = decideDunningReconcile({
      hasPaid: p.has_paid === true,
      plan: base.plan_atual,
      isPro: base.is_pro_atual,
      profileSubscriptionId: subscriptionRef,
      liveSubscriptionId: live.id,
      liveStatus: live.status,
      metadataTier: live.metadataTier,
    })

    const linha: Linha = {
      ...base,
      stripe_status: live.status,
      metadata_tier: live.metadataTier,
      action: decision.action,
      reason: decision.reason,
      tier: decision.tier,
    }

    if (confirm && decision.action === 'restore' && decision.tier) {
      // Mesmo update de DOIS campos e mesmos eventos do ramo de auto-cura do
      // webhook. Crédito fica intacto: volta só na fatura paga.
      const { error: upErr } = await admin
        .from('profiles')
        .update({ plan: decision.tier, is_pro: true })
        .eq('id', userId)
      if (upErr) {
        console.error('[reconcile-dunning] restore failed:', userId, upErr.message)
        linha.aplicado = 'falhou'
        await writeServerEvent({
          name: 'subscription_access_repair_failed',
          userId,
          path: '/api/admin/reconcile-dunning',
          metadata: {
            version: 'stripe_dunning_repair_v1',
            source: 'admin_reconcile',
            subscription_ref: subscriptionRef,
            tier: decision.tier,
            error: upErr.message.slice(0, 200),
          },
        })
      } else {
        linha.aplicado = 'ok'
        await writeServerEvent({
          name: 'subscription_access_restored_after_wrong_revoke',
          userId,
          path: '/api/admin/reconcile-dunning',
          metadata: {
            version: 'stripe_dunning_repair_v1',
            source: 'admin_reconcile',
            tier: decision.tier,
            previous_plan: base.plan_atual,
            subscription_ref: subscriptionRef,
            stripe_status: live.status,
          },
        })
      }
    }

    linhas.push(linha)
  }

  const contagem = linhas.reduce<Record<string, number>>((acc, l) => {
    const k = `${l.action}:${l.reason}`
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json(
    {
      mode: confirm ? 'APPLIED' : 'DRY_RUN',
      cohort: "has_paid=true · plan='free' · stripe_subscription_id not null",
      total: linhas.length,
      para_restaurar: linhas.filter((l) => l.action === 'restore').length,
      contagem,
      pessoas: linhas,
      hint: confirm
        ? 'Aplicado. Crédito NÃO foi tocado: volta na próxima fatura paga (invoice.payment_succeeded).'
        : 'Append ?confirm=APPLY para restaurar plan+is_pro de quem está em action=restore. Crédito nunca é tocado aqui.',
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
