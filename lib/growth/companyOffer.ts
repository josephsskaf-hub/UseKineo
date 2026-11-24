import type { CheckoutCurrency } from '@/lib/checkoutPricing'

export const COMPANY_OFFER = {
  brand: 'Kineo AI',
  monthlyDeliverables: 4,
  maxSeconds: 15,
  aspectRatio: '9:16',
  revisionRounds: 1,
  previewBusinessDays: 3,
  finalBusinessDays: 2,
  exampleKeys: ['relogio', 'caneca'],
  currency: 'usd' as CheckoutCurrency,
  approvedMonthlyPriceMinor: null as number | null,
} as const
