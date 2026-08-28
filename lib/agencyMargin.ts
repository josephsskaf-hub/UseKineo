export const AGENCY_MARKETPLACE_FEE_OPTIONS = [0, 10, 15, 20] as const

export const DEFAULT_AGENCY_CLIENT_PRICE_MINOR = 2500
export const DEFAULT_AGENCY_MARKETPLACE_FEE_PCT = 20

export interface AgencyMarginInput {
  videos: number
  packCostMinor: number
  clientPriceMinor: number
  marketplaceFeePct: number
}

export interface AgencyMarginResult {
  clientRevenueMinor: number
  marketplaceFeeMinor: number
  netRevenueMinor: number
  cashAfterKineoMinor: number
  grossCashMarginPct: number | null
  breakEvenClientPriceMinor: number
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function calculateAgencyMargin(input: AgencyMarginInput): AgencyMarginResult {
  const videos = Math.max(1, Math.floor(finiteNonNegative(input.videos)))
  const packCostMinor = Math.round(finiteNonNegative(input.packCostMinor))
  const clientPriceMinor = Math.round(finiteNonNegative(input.clientPriceMinor))
  const marketplaceFeePct = Math.min(99, finiteNonNegative(input.marketplaceFeePct))
  const clientRevenueMinor = clientPriceMinor * videos
  const marketplaceFeeMinor = Math.round(clientRevenueMinor * marketplaceFeePct / 100)
  const netRevenueMinor = clientRevenueMinor - marketplaceFeeMinor
  const cashAfterKineoMinor = netRevenueMinor - packCostMinor
  const grossCashMarginPct = netRevenueMinor > 0
    ? Math.round((cashAfterKineoMinor / netRevenueMinor) * 1000) / 10
    : null
  const retainedShare = 1 - marketplaceFeePct / 100
  const breakEvenClientPriceMinor = retainedShare > 0
    ? Math.ceil(packCostMinor / videos / retainedShare)
    : 0

  return {
    clientRevenueMinor,
    marketplaceFeeMinor,
    netRevenueMinor,
    cashAfterKineoMinor,
    grossCashMarginPct,
    breakEvenClientPriceMinor,
  }
}
