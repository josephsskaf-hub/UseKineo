// KINEO-AGENCY-BENCHMARK-2026-07-27 — fonte única do comparativo de agência.
//
// POR QUE ESTE ARQUIVO EXISTE
// Os dois números que sustentam o argumento inteiro de atacado — o que uma
// agência de edição humana cobra por Short — viviam em três lugares e em
// nenhum deles como dado:
//   · app/pricing/PricingClient.tsx:658-659 — "$30.94 per short" e "$80.00 per
//     short" digitados como STRING LITERAL em JSX, exatamente o padrão que o
//     AGENTS.md §2.3 proíbe depois de três vazamentos de preço errado.
//   · lib/pricing.ts:115 — os mesmos valores num comentário, que não falha.
//   · docs/PRODUCT_AND_OFFER.md §2 — de novo, em prosa.
// Quatro cópias de um número que ninguém consegue recalcular é como o preço
// derrapa. Aqui os PRIMITIVOS são declarados uma vez (mensalidade e quantidade
// de Shorts, que é o que está publicado no site do fornecedor) e tudo o mais é
// ARITMÉTICA. O valor por Short não pode divergir do preço mensal porque não é
// digitado em lugar nenhum.
//
// DISCIPLINA DE FATO (mesma regra de lib/comparisons.ts)
// Mensalidade e quantidade saem da página do próprio fornecedor. Não copiamos
// texto de concorrente: só reafirmamos o preço publicado. Se um fornecedor
// mudar de preço, muda-se UMA linha aqui e toda superfície acompanha.

/** Data em que os preços abaixo foram lidos na página do próprio fornecedor. */
export const AGENCY_VERIFIED_ON = 'July 26, 2026'

export type AgencyBenchmark = {
  id: 'vidchops' | 'tastyedits'
  name: string
  /** Mensalidade publicada, em centavos de USD. */
  monthlyUsdMinor: number
  /** Quantos Shorts essa mensalidade cobre. */
  shortsPerMonth: number
  /** Quem produz o vídeo — a diferença que justifica o preço deles. */
  producedBy: string
}

// Fonte destes dois: o bloco de ancoragem já publicado em
// app/pricing/PricingClient.tsx (VidChops $495/mo por 16 Shorts; Tasty Edits
// $2.400/mo por 30 Shorts), agora declarado como dado em vez de texto.
export const AGENCY_BENCHMARKS: readonly AgencyBenchmark[] = [
  {
    id: 'vidchops',
    name: 'VidChops',
    monthlyUsdMinor: 49500,
    shortsPerMonth: 16,
    producedBy: 'Human editor, assigned per account',
  },
  {
    id: 'tastyedits',
    name: 'Tasty Edits',
    monthlyUsdMinor: 240000,
    shortsPerMonth: 30,
    producedBy: 'Human editing team',
  },
] as const

/** Custo por Short, em centavos de USD. Derivado — nunca digitado. */
export function agencyPerShortUsdMinor(b: AgencyBenchmark): number {
  return b.monthlyUsdMinor / b.shortsPerMonth
}

/**
 * O que N vídeos custariam nesse fornecedor, em centavos de USD.
 *
 * É extrapolação linear da tarifa publicada, não uma cotação que o fornecedor
 * tenha dado. Qualquer superfície que mostre este número precisa dizer isso —
 * ver o rodapé da tabela em app/for-agencies/page.tsx.
 */
export function agencyCostForUsdMinor(b: AgencyBenchmark, videos: number): number {
  return agencyPerShortUsdMinor(b) * videos
}

/** Quantas vezes `theirUsdMinor` é maior que `oursUsdMinor`. */
export function timesMoreExpensive(theirUsdMinor: number, oursUsdMinor: number): number {
  return theirUsdMinor / oursUsdMinor
}
