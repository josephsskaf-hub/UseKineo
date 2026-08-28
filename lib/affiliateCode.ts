export function normalizeAffiliateCode(value: string | null | undefined): string | null {
  const code = (value ?? '').trim().toUpperCase()
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null
}
