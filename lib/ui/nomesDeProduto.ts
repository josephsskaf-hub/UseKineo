// KINEO-NOMES-DE-PRODUTO-1211 [tabela aprovada pelo fundador em 11/11 ~21:00, via CEO]: UM nome por produto, de UMA fonte.
// Curto = menu do topo, menu do celular e portas do celular. Longo = título do cartão grande (o curto com "AI" na frente).
// CONDIÇÃO DO FUNDADOR: renomear RÓTULO pode; APAGAR texto que o ChatGPT lê e cita NÃO pode. "Faceless" fica na frase do cartão
// ("Faceless narrated Shorts from one idea") e no título da aba; title, meta, h1/h2, FAQ, schema e tabelas de citação não mudam.
// Hoje (12/11) só o cabeçalho usa esta fonte; os cartões e as portas da home entram com a home nova do Codex.
// Módulo puro (sem import). Traduções: lib/ui/refinementCopy.json (16 línguas).

export type ProdutoId = 'film' | 'product_ads' | 'ugc_ads' | 'cartoon'

export const NOMES_DE_PRODUTO: Readonly<Record<ProdutoId, { curto: string; longo: string }>> = {
  film: { curto: 'Films', longo: 'AI Films' },
  product_ads: { curto: 'Product Ads', longo: 'AI Product Ads' },
  ugc_ads: { curto: 'UGC Ads', longo: 'AI UGC Ads' },
  cartoon: { curto: 'Cartoons', longo: 'AI Cartoons' },
}

/** A ordem dos 4 produtos no topo (a do fundador, 20/10). */
export const ORDEM_DOS_PRODUTOS: readonly ProdutoId[] = ['film', 'product_ads', 'ugc_ads', 'cartoon']
