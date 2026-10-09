// KINEO-PRECO-CAIU-2026-10-09 — a carta "o preço baixou" para quem abriu o checkout com o preço da V8-A e não comprou.
//
// O CASO (medido 09/10 ~03h45 BRT): entre 28/09 (V8-A: Starter US$ 12,90 · Creator US$ 29,90) e o início do teste de
// preço (09/10 03:38 UTC: US$ 9,90 · US$ 19,90), 21 pessoas abriram o checkout; 18 nunca pagaram. A conclusão fechada da
// casa (CLAUDE.md, 19/08) é que o vazamento do checkout É PREÇO: quem volta duas vezes ao checkout quer comprar e trava no
// valor. O preço caiu — essas pessoas são as únicas que ainda não sabem.
//
// MÓDULO PURO: o guardião (scripts/test-preco-caiu-2026-10-09.mjs) executa isolado. A rota que envia é
// app/api/admin/send-price-drop/route.ts (dry-run por padrão; o fundador dispara com ?confirm=SEND).
//
// A TRAVA: a carta só existe enquanto o preço de hoje for MENOR que o da V8-A. Se o teste de 7 dias acabar e o preço
// voltar, priceDropLines() devolve [] e a rota recusa ("price_not_lower") — nunca uma carta dizendo que baixou o que subiu.

export const PRICE_DROP_CAMPAIGN = 'price_drop_1009'
export const PRICE_DROP_STAMP = 'price_drop_1009_sent'

/** A janela da V8-A: quem abriu o checkout aqui viu o preço antigo (docs/DECISAO-PRECOS-V8-2026-09-28.md → teste 09/10). */
export const PRICE_DROP_WINDOW = { from: '2026-09-28T00:00:00.000Z', to: '2026-10-09T03:38:00.000Z' } as const

/** O preço que essa janela viu (V8-A, 28/09): fato histórico, não preço de hoje. Studio não mudou (US$ 54,90). */
export const PRICE_DROP_WAS_USD_CENTS = { starter: 1290, basic: 2990 } as const

export type PriceDropTier = keyof typeof PRICE_DROP_WAS_USD_CENTS

export interface PriceDropLine {
  tier: PriceDropTier
  wasCents: number
  nowCents: number
}

/** As linhas "era X, agora Y" — só onde o preço de hoje é menor. Vazio = não há queda para anunciar. */
export function priceDropLines(nowUsdCents: Record<PriceDropTier, number>): PriceDropLine[] {
  const out: PriceDropLine[] = []
  for (const tier of ['starter', 'basic'] as const) {
    const wasCents = PRICE_DROP_WAS_USD_CENTS[tier]
    const nowCents = nowUsdCents[tier]
    if (Number.isInteger(nowCents) && nowCents > 0 && nowCents < wasCents) out.push({ tier, wasCents, nowCents })
  }
  return out
}

/** Dentro da janela da V8-A? (ISO de evento.) */
export function inPriceDropWindow(createdAt: string): boolean {
  const t = Date.parse(createdAt)
  return Number.isFinite(t) && t >= Date.parse(PRICE_DROP_WINDOW.from) && t < Date.parse(PRICE_DROP_WINDOW.to)
}
