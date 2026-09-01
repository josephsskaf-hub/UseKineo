export const AUTOPILOT_BREAK_EVEN_VERSION = 'autopilot_break_even_v1' as const

export type AutopilotProfitBand =
  | 'under_50'
  | '50_149'
  | '150_499'
  | '500_999'
  | '1000_plus'

export type AutopilotCustomerCountBucket = 'one' | 'two' | 'three_to_five' | 'six_to_ten' | 'eleven_plus'

export type AutopilotBreakEvenResult = {
  grossProfitMinor: number
  pilotCustomers: number
  monthlyCustomers: number
}

const MAX_GROSS_PROFIT_MINOR = 100_000_000

function validMinor(value: number): number | null {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_GROSS_PROFIT_MINOR) return null
  return value
}

export function calculateAutopilotBreakEven(input: {
  grossProfitMinor: number
  pilotPriceMinor: number
  monthlyPriceMinor: number
}): AutopilotBreakEvenResult | null {
  const grossProfitMinor = validMinor(input.grossProfitMinor)
  const pilotPriceMinor = validMinor(input.pilotPriceMinor)
  const monthlyPriceMinor = validMinor(input.monthlyPriceMinor)
  if (!grossProfitMinor || !pilotPriceMinor || !monthlyPriceMinor) return null

  return {
    grossProfitMinor,
    pilotCustomers: Math.ceil(pilotPriceMinor / grossProfitMinor),
    monthlyCustomers: Math.ceil(monthlyPriceMinor / grossProfitMinor),
  }
}

export function autopilotProfitBand(grossProfitMinor: number): AutopilotProfitBand {
  const value = validMinor(grossProfitMinor) ?? 0
  if (value < 5_000) return 'under_50'
  if (value < 15_000) return '50_149'
  if (value < 50_000) return '150_499'
  if (value < 100_000) return '500_999'
  return '1000_plus'
}

export function autopilotCustomerCountBucket(count: number): AutopilotCustomerCountBucket {
  if (count <= 1) return 'one'
  if (count === 2) return 'two'
  if (count <= 5) return 'three_to_five'
  if (count <= 10) return 'six_to_ten'
  return 'eleven_plus'
}
