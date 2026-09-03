// KINEO-ACCOUNT-PANEL-2026-08-19 — "quando eu pago de novo?" é a pergunta que
// todo painel de conta responde e o nosso não respondia.
//
// O fundador pediu um menu onde a pessoa veja o plano dela, quando paga, os
// vídeos, e saia — o básico que qualquer SaaS tem. Plano e créditos já vinham
// de /api/credits; a DATA DE RENOVAÇÃO não existia em lugar nenhum, e é
// justamente a informação que mais reduz ansiedade de assinante (e a que mais
// gera ticket de suporte quando falta: "quando vou ser cobrado?").
//
// A verdade sobre renovação mora na Stripe, não no nosso banco: `profiles` só
// guarda o id da assinatura. Buscar direto lá evita o defeito que a gente
// passou o dia consertando — uma segunda cópia da verdade que envelhece.
// Custo: uma chamada à Stripe, só quando o painel abre, só para quem tem
// assinatura. Falha em silêncio (devolve null) porque um painel sem a data é
// muito melhor que um painel que não carrega.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export interface MySubscription {
  /** ISO da próxima cobrança, ou null se não houver assinatura ativa. */
  renewsAt: string | null
  /** true quando a pessoa cancelou e o plano vai só até o fim do período. */
  cancelsAtPeriodEnd: boolean
  /** 'stripe' | 'paypal' | 'paddle' | null — de onde vem a cobrança. */
  provider: 'stripe' | 'paypal' | 'paddle' | null
  /** Valor da próxima fatura em centavos USD, quando a Stripe souber dizer. */
  amountMinor: number | null
  status: string | null
}

const EMPTY: MySubscription = {
  renewsAt: null,
  cancelsAtPeriodEnd: false,
  provider: null,
  amountMinor: null,
  status: null,
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(EMPTY)

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, paypal_subscription_id, paddle_subscription_id')
      .eq('id', user.id)
      .single()

    const stripeSubId = (profile?.stripe_subscription_id as string | null) ?? null
    if (!stripeSubId) {
      // Assinaturas de PayPal/Paddle existem mas não expõem período por aqui.
      // Dizer QUAL é o provedor já resolve metade da pergunta ("por onde eu
      // cancelo?") sem inventar uma data que a gente não tem.
      const provider = profile?.paypal_subscription_id
        ? 'paypal'
        : profile?.paddle_subscription_id
          ? 'paddle'
          : null
      return NextResponse.json({ ...EMPTY, provider })
    }

    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return NextResponse.json({ ...EMPTY, provider: 'stripe' })

    const sub = await stripe.subscriptions.retrieve(stripeSubId)

    // `current_period_end` saiu do tipo público em versões recentes da API mas
    // continua vindo no payload — leitura indexada mantém sem `any` solto, o
    // mesmo padrão que o webhook já usa para `invoice`.
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? null
    const item = sub.items?.data?.[0]
    const amountMinor = typeof item?.price?.unit_amount === 'number' ? item.price.unit_amount : null

    const payload: MySubscription = {
      renewsAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancelsAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      provider: 'stripe',
      amountMinor,
      status: sub.status ?? null,
    }
    return NextResponse.json(payload)
  } catch (e) {
    // Nunca derruba o painel por causa da Stripe.
    console.warn('[me/subscription] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json(EMPTY)
  }
}
