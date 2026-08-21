// Affiliate self-serve — "my dashboard" data.
// GET, auth required. Looks up the affiliate row owned by the signed-in user
// (service-role, since RLS on the affiliate_* tables is deny-all) and returns
// their share link, lifetime stats and commission earnings. Amounts are in
// CENTS straight from the DB — the client divides by 100 for display.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// O cliente admin é criado sem tipos gerados do banco, então o genérico do
// supabase-js colapsa para `never` em .update(). Uma interface mínima com o
// que este arquivo realmente usa evita o `any` solto e mantém o tsc útil.
interface AdminDb {
  from(table: string): {
    update(values: Record<string, unknown>): { eq(col: string, val: string): Promise<unknown> }
  }
}

// ═══ KINEO-CUPOM-AFILIADO-2026-08-21 — CUNHAGEM AUTOMÁTICA ══════════════
//
// O webhook agora sabe pagar comissão por cupom, mas isso só serve para quem
// TEM cupom — e `coupon_code` nunca foi preenchido em lugar nenhum do código.
// Eram 1.073 pessoas com código de indicação e ZERO com cupom: o trilho novo
// nasceria morto, servindo só os afiliados que o fundador configurasse à mão.
//
// Aqui o cupom nasce sozinho na primeira vez que o afiliado abre o painel —
// vale tanto para quem se cadastrar hoje quanto para os 1.073 de ontem.
//
// O DESCONTO — "SEU TRIAL É GRÁTIS", e não os 20% que eu ia usar de início.
//
// Escrevi 20% primeiro, copiando o CREATOR20, e a auditoria derrubou: NOSSA
// PORTA DE ENTRADA É O TRIAL DE $1. Um cupom `duration:'once'` incide na
// PRIMEIRA FATURA, e a primeira fatura de quem entra pelo trial é a taxa de
// $1 — não os $15. Ou seja, 20% teria dado ao viewer um desconto de VINTE
// CENTAVOS. Ninguém decora e fala um código na câmera para economizar $0,20.
// O código seria digitado por ninguém e o trilho inteiro morreria de novo,
// desta vez em silêncio.
//
// $1 de abatimento resolve os dois lados de uma vez:
//   · Para o viewer vira uma frase que se fala em vídeo e se entende na hora:
//     "usa meu código e sua primeira semana sai de graça".
//   · Para nós custa $1 por indicação, contra $3 que os 20% custariam. Mais
//     barato E mais atraente — não é troca, é ganho dos dois lados.
//   · A recorrência fica INTACTA: o desconto é `once`, então todo mês de $15
//     depois disso entra cheio.
//
// O que se perde: o $1 era um filtro de intenção (Modelo D — quem não paga $1
// nunca pagaria $15). Aqui esse filtro é substituído pelo AVAL DO CRIADOR, que
// é um sinal melhor. E a fricção que realmente importa continua de pé: o
// cartão segue obrigatório (`payment_method_collection: 'always'`).
//
// A CONTA DA COMISSÃO (medida em 21/08, não estimada):
//   O assinante real faz 3-4 filmes/mês e consome ~55 dos 140 créditos do
//   Creator (média de 16,4cr por filme pago, sobre 1.185 filmes em 90 dias).
//   Creator $15 · fal ~$4,24 · taxa ~$0,74 · comissão $6,00 → sobra ~$4/mês.
//   ⚠ TRIPWIRE: quem queimar os 140 créditos custa ~$10,78 de fal e vira
//   PREJUÍZO de ~$2,50/mês. Esse risco já existe sem afiliado; a comissão o
//   amplia. Se aparecer um caso desses, a alavanca é a TAXA (40% → 25-30%),
//   nunca o cupom.
//
// ⚠ FALTA UM TESTE AO VIVO: preciso confirmar na Stripe que um cupom de
// assinatura abate mesmo um item de `add_invoice_items` (é assim que o $1 é
// cobrado). A doc indica que sim; enquanto não vir com meus olhos, isto está
// marcado como NÃO VERIFICADO.
const AFFILIATE_COUPON_ID = 'KINEO_AFFILIATE_FREETRIAL'
const AFFILIATE_COUPON_AMOUNT_OFF = 100 // centavos = a taxa de entrada inteira

function couponTextFor(code: string): string {
  // O código da indicação já é único no banco; reaproveitá-lo garante unicidade
  // do cupom sem inventar um segundo espaço de nomes para colidir.
  return `KINEO${String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 24)
}

// Auto-provisiona o desconto-base na Stripe, mesmo padrão que o checkout já usa
// para FIRST50 e CREATOR20 (retrieve → se não existe, create). Isso tira o
// fundador do caminho: nada de criar cupom no painel nem setar env var.
// A env AFFILIATE_STRIPE_COUPON_ID continua valendo como override, caso ele
// queira apontar para um desconto diferente sem mexer em código.
async function ensureAffiliateBaseCoupon(): Promise<string | null> {
  const override = process.env.AFFILIATE_STRIPE_COUPON_ID
  if (override) return override
  try {
    await stripe.coupons.retrieve(AFFILIATE_COUPON_ID)
    return AFFILIATE_COUPON_ID
  } catch {
    try {
      await stripe.coupons.create({
        id: AFFILIATE_COUPON_ID,
        amount_off: AFFILIATE_COUPON_AMOUNT_OFF,
        currency: 'usd',
        duration: 'once',
        // ⚠ Coupon.name da Stripe tem limite de 40 caracteres (o KINEO_INTRO
        // já quebrou por isso em 07/08 e derrubou uma venda). Este tem 29.
        name: 'Kineo creator code - free trial',
      })
      console.log('[affiliate coupon] desconto-base auto-provisionado')
      return AFFILIATE_COUPON_ID
    } catch (e) {
      // Corrida entre duas requisições: o outro lado criou. Confere antes de
      // desistir — desistir aqui esconderia o bloco de cupom sem motivo.
      try {
        await stripe.coupons.retrieve(AFFILIATE_COUPON_ID)
        return AFFILIATE_COUPON_ID
      } catch {
        console.error('[affiliate coupon] nao consegui provisionar o desconto-base:', e)
        return null
      }
    }
  }
}

async function mintCouponIfMissing(
  admin: AdminDb,
  affiliate: { id: string; code: string; status: string; coupon_code: string | null }
): Promise<string | null> {
  if (affiliate.coupon_code) return affiliate.coupon_code
  if (affiliate.status !== 'active') return null
  const baseCoupon = await ensureAffiliateBaseCoupon()
  if (!baseCoupon) return null

  const texto = couponTextFor(affiliate.code)
  try {
    // Idempotente: se já existir na Stripe (retry, deploy no meio, duas abas),
    // reaproveita em vez de estourar por código duplicado.
    const existentes = await stripe.promotionCodes.list({ code: texto, limit: 1 })
    if (existentes.data.length === 0) {
      await stripe.promotionCodes.create({
        coupon: baseCoupon,
        code: texto,
        metadata: { affiliate_id: affiliate.id, source: 'kineo_affiliate_auto' },
      })
    }
    await admin.from('affiliates').update({ coupon_code: texto }).eq('id', affiliate.id)
    return texto
  } catch (err) {
    // Falhou? Devolve null: o painel esconde o bloco e a gente tenta de novo no
    // próximo load. Nunca mostrar um cupom que o checkout vai recusar.
    console.error('[affiliate coupon] mint failed:', err)
    return null
  }
}

interface CommissionRow {
  created_at: string | null
  type: string | null
  amount_gross: number | null
  commission_amount: number | null
  currency: string | null
  status: string | null
}

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Find the affiliate owned by this user.
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('id, code, status, commission_rate, coupon_code')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ isAffiliate: false })
    }

    const affiliateId = affiliate.id

    // Cunha o cupom na primeira visita ao painel (ver bloco no topo do arquivo).
    const couponCode = await mintCouponIfMissing(admin as unknown as AdminDb, {
      id: affiliate.id,
      code: affiliate.code as string,
      status: affiliate.status as string,
      coupon_code: (affiliate.coupon_code as string | null) ?? null,
    })

    // Lifetime click + referral counts.
    const [{ count: clicks }, { count: signups }, { count: paid }] = await Promise.all([
      admin
        .from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),
      admin
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),
      admin
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId)
        .eq('status', 'paid'),
    ])

    // All commissions for this affiliate — used for earnings sums + recent list.
    const { data: commissions } = await admin
      .from('affiliate_commissions')
      .select('created_at, type, amount_gross, commission_amount, currency, status')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })

    const rows = (commissions ?? []) as CommissionRow[]

    const earnings = { pending: 0, approved: 0, paid: 0, total: 0 }
    for (const c of rows) {
      const amt = c.commission_amount ?? 0
      if (c.status === 'pending') earnings.pending += amt
      else if (c.status === 'approved') earnings.approved += amt
      else if (c.status === 'paid') earnings.paid += amt
      // total = everything not clawed back
      if (c.status !== 'clawed_back') earnings.total += amt
    }

    const recent = rows.slice(0, 20).map((c) => ({
      created_at: c.created_at,
      type: c.type,
      amount_gross: c.amount_gross ?? 0,
      commission_amount: c.commission_amount ?? 0,
      currency: c.currency ?? 'usd',
      status: c.status,
    }))

    return NextResponse.json({
      isAffiliate: true,
      affiliate: {
        code: affiliate.code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        coupon_code: couponCode,
      },
      link: 'https://www.usekineo.com/a/' + affiliate.code,
      stats: {
        clicks: clicks ?? 0,
        signups: signups ?? 0,
        paid: paid ?? 0,
      },
      earnings,
      recent,
    })
  } catch (err) {
    console.error('[affiliate/me] unexpected:', err)
    return NextResponse.json({ error: 'Failed to load affiliate' }, { status: 500 })
  }
}
