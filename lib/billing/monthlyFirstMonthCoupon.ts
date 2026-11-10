// KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas. É isso daí."] — o cupom dos 30% do 1º mês na Stripe.
// Ninguém cria à mão: o próprio checkout garante o cupom no 1º uso, pelo id fixo MONTHLY_FIRST_MONTH_COUPON_ID, no padrão de ensureAffiliateBaseCoupon
// (lib/affiliateCoupon.ts): lê; se não existe, cria; se outra requisição criou no meio, lê de novo. Idempotente.
// Um cupom com este id que não seja exatamente "30%, uma vez, sem valor fixo, sem restrição de produto" NÃO é usado (null = checkout a preço cheio).
// percent_off não tem moeda: o mesmo cupom vale para a sessão em dólar e para a sessão em reais.
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import {
  MONTHLY_FIRST_MONTH_COUPON_ID,
  MONTHLY_FIRST_MONTH_COUPON_NAME,
  MONTHLY_FIRST_MONTH_PERCENT_OFF,
  monthlyFirstMonthCouponAccepts,
} from '@/lib/billing/monthlyFirstMonthOffer'

export type MonthlyFirstMonthCouponStripe = Pick<Stripe, 'coupons'>

function faltando(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number } | null
  return e?.code === 'resource_missing' || e?.statusCode === 404
}

const garantidos = new WeakMap<MonthlyFirstMonthCouponStripe, Promise<string | null>>()

async function garantir(client: MonthlyFirstMonthCouponStripe): Promise<string | null> {
  try {
    const existente = await client.coupons.retrieve(MONTHLY_FIRST_MONTH_COUPON_ID)
    return monthlyFirstMonthCouponAccepts(existente as Parameters<typeof monthlyFirstMonthCouponAccepts>[0]) ? MONTHLY_FIRST_MONTH_COUPON_ID : null
  } catch (error) {
    if (!faltando(error)) return null
  }
  try {
    const criado = await client.coupons.create({
      id: MONTHLY_FIRST_MONTH_COUPON_ID,
      percent_off: MONTHLY_FIRST_MONTH_PERCENT_OFF,
      duration: 'once',
      name: MONTHLY_FIRST_MONTH_COUPON_NAME,
    })
    return monthlyFirstMonthCouponAccepts(criado as Parameters<typeof monthlyFirstMonthCouponAccepts>[0]) ? MONTHLY_FIRST_MONTH_COUPON_ID : null
  } catch {
    // Outra requisição criou o mesmo cupom no meio: lê de novo.
    try {
      const corrida = await client.coupons.retrieve(MONTHLY_FIRST_MONTH_COUPON_ID)
      return monthlyFirstMonthCouponAccepts(corrida as Parameters<typeof monthlyFirstMonthCouponAccepts>[0]) ? MONTHLY_FIRST_MONTH_COUPON_ID : null
    } catch {
      return null
    }
  }
}

/** O id do cupom pronto para `discounts`, ou null (a compra segue a preço cheio). Uma leitura por processo quando dá certo; falha não fica guardada. */
export async function ensureMonthlyFirstMonthCoupon(client: MonthlyFirstMonthCouponStripe = stripe): Promise<string | null> {
  const emCurso = garantidos.get(client)
  if (emCurso) return emCurso
  const pendente = garantir(client)
  garantidos.set(client, pendente)
  const id = await pendente
  if (!id) garantidos.delete(client)
  return id
}
