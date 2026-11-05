// KINEO-CREDITOS-B-0511 — desfaz exato dos créditos 40 / 150 / 470 em lib/checkoutPricing.ts, para os guardiões históricos. Nunca usar em lib/app.
const PARES = [
  ["  // KINEO-CREDITOS-B-0511 [fundador 05/11, \"1 sim\"; contas em docs/PROPOSTA-CREDITOS-B-E-MOTORES-2026-11-05.md] — 40 / 150 / 470, com os mesmos US$ 9 / 19 / 59. Era 40 / 85 / 280 (KINEO-PRECO-MERCADO-0411). Quem já assina pelo preço de hoje recebe o grant novo na próxima recarga.\n", "  // KINEO-PRECO-MERCADO-0411 — 40 / 85 / 280.\n"],
  ["  basic: 150,\n  pro: 470,\n", "  basic: 85,\n  pro: 280,\n"],
  ["  starter: 40,\n  basic: 150, // KINEO-CREDITOS-B-0511\n}", "  starter: 40,\n  basic: 85,\n}"],
]
export function semCreditosB0511(text, file) {
  if (typeof text !== 'string' || String(file ?? '').replace(/\\/g, '/') !== 'lib/checkoutPricing.ts' || !text.includes('KINEO-CREDITOS-B-0511')) return text
  const crlf = text.includes('\r\n')
  let s = text.replace(/\r\n/g, '\n')
  for (const [a, b] of PARES) { if (s.split(a).length !== 2) throw new Error('desfaz-creditos-b-0511: trecho ausente'); s = s.replace(a, () => b) }
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
