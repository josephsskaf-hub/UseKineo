// KINEO-PAGINAS-UGC-2010 — DESFAZ, em memória, os links das páginas do AI UGC Ads e do Kit Black Friday nos arquivos que JÁ existiam e
// que guardiões antigos conferem BYTE A BYTE contra uma base (a porta /ads, o bloco Business do /pricing e os 3 cards da home).
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-PAGINAS-UGC-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base.
// Só age nos arquivos declarados; qualquer outro texto passa igual. Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA dessas telas — semKitBfVenda2010 (a cabeça da cadeia do Studio Ads: Close real → … → 3 cards → olhos →
// kit) chama esta PRIMEIRO, antes da própria guarda de arquivo. O guardião scripts/test-paginas-ugc-2010.mjs (G13) prova que, desfeito isto, cada arquivo é EXATAMENTE a base.

import { semUgcAjustes2010 } from './desfaz-ugc-ajustes-2010.mjs' // KINEO-UGC-AJUSTES-2010 — os ajustes do UGC (20/10) vieram depois: saem PRIMEIRO (encadeado; texto sem a marca passa igual)
export const MARCA_PAGINAS_UGC_2010 = 'KINEO-PAGINAS-UGC-2010'

/** A base: origin/main 44d8d206f de 20/10 (KINEO-HOME-CARDS-BOTOES-2010 + KINEO-FILMES-F1F3-PUBLICO-2010 + KINEO-KIT-BF-VENDA-2010), mesclada nesta branch (era 87251eba9). */
export const PAGINAS_UGC_2010_BASE = '44d8d206fe601e263447ba5fe6f336ebbe31514e'

/** Arquivos tocados, com a contagem EXATA de acréscimos marcados. */
export const ACRESCIMOS_PAGINAS_UGC_2010 = {
  'app/ads/page.tsx': 3,
  'components/pricing/PricingBusinessBlock.tsx': 3,
  'components/home/HomeThreeCards.tsx': 3,
  'scripts/test-support/desfaz-kit-bf-venda-2010.mjs': 2,
}
export const PAGINAS_UGC_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_PAGINAS_UGC_2010))

/** [linha nova, linha da base] — reconhecidas INTEIRAS. */
export const TROCAS_PAGINAS_UGC_2010 = {
  'components/home/HomeThreeCards.tsx': [
    [
      `        <div className="k3c-head"><p className="k3c-kicker"><UiLabel>Choose what to make</UiLabel></p><Link className="k3c-more" href={language === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH} data-home-ugc-guide="1"><UiLabel>How AI UGC ads work</UiLabel> →</Link></div>{/* KINEO-PAGINAS-UGC-2010 */}`,
      `        <div className="k3c-head"><p className="k3c-kicker"><UiLabel>Choose what to make</UiLabel></p></div>`,
    ],
  ],
}

export function semPaginasUgc2010(texto, p) {
  texto = semUgcAjustes2010(texto, p) // KINEO-UGC-AJUSTES-2010 — a camada mais nova sai primeiro (semKitBfVenda2010 chama esta cabeça antes de tudo)
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_PAGINAS_UGC_2010) || !PAGINAS_UGC_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map(TROCAS_PAGINAS_UGC_2010[rel] ?? [])
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_PAGINAS_UGC_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  if (tiradas !== ACRESCIMOS_PAGINAS_UGC_2010[rel]) throw new Error(`desfaz-paginas-ugc-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${ACRESCIMOS_PAGINAS_UGC_2010[rel]}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazPaginasUgc2010(p, texto) {
  return semPaginasUgc2010(texto, p)
}
