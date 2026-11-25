import type { CheckoutCurrency } from '@/lib/checkoutPricing'

export const COMPANY_OFFER = {
  brand: 'Kineo AI',
  monthlyDeliverables: 4,
  pilotClientLimit: 3,
  maxSeconds: 15,
  aspectRatio: '9:16',
  revisionRounds: 1,
  previewBusinessDays: 3,
  finalBusinessDays: 2,
  exampleKeys: ['relogio', 'caneca'],
  currency: 'usd' as CheckoutCurrency,
  approvedMonthlyPriceMinor: 29_900, // Decisão do dono/CEO, 25/11/2026 12:03: pacote A.
} as const
