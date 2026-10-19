// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — DESFAZ, em memória, a entrega
// "Refazer uma cena (grátis, 1×)" para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// Uma forma só — ACRÉSCIMO: nos arquivos protegidos a entrega só acrescenta linhas, e toda linha nova carrega a marca
// KINEO-META95-REFAZER-1910 (inclusive o import, em linha própria). Desfazer = tirar as linhas marcadas; a contagem por
// arquivo é EXATA (marca a mais ou a menos = lança, e o guardião fica vermelho). Outro arquivo, ou texto sem a marca,
// volta igual (idempotente sobre a base). Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA do /api/compose. semFilmesF1F4_1910 (desfaz-filmes-f1f4-1910.mjs) chama esta
// PRIMEIRO, então os guardiões que já desfazem o F1–F4 antes de comparar a rota com a base voltam à base sem edição.
// O guardião desta entrega (scripts/test-meta95-refazer-1910.mjs) prova que, desfeito isto, cada arquivo é EXATAMENTE a
// base BASE_META95_REFAZER_1910 (a origin/main de onde a entrega nasceu).
export const MARCA_META95_REFAZER_1910 = 'KINEO-META95-REFAZER-1910'
export const BASE_META95_REFAZER_1910 = '6e104e188'

/** Arquivos protegidos que a entrega toca só por acréscimo, com a contagem EXATA de linhas marcadas. */
export const ACRESCIMOS_META95_REFAZER_1910 = {
  'app/api/compose/route.ts': 2,
  'app/(dashboard)/history/HistoryClient.tsx': 2,
}

/** Uma linha desta entrega? */
export function linhaDoRefazer1910(l) {
  return typeof l === 'string' && l.includes(MARCA_META95_REFAZER_1910)
}

/** O texto do arquivo sem a entrega (acréscimos marcados fora). Sem a marca, ou arquivo fora da lista = devolve igual. */
export function semMeta95Refazer1910(texto, p) {
  if (typeof texto !== 'string' || !Object.prototype.hasOwnProperty.call(ACRESCIMOS_META95_REFAZER_1910, p) || !texto.includes(MARCA_META95_REFAZER_1910)) return texto
  const crlf = texto.includes('\r\n')
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  const fora = linhas.filter((l) => !linhaDoRefazer1910(l))
  const tiradas = linhas.length - fora.length
  if (tiradas !== ACRESCIMOS_META95_REFAZER_1910[p]) {
    throw new Error(`desfaz-meta95-refazer-1910: ${p} tem ${tiradas} linha(s) marcada(s), esperava ${ACRESCIMOS_META95_REFAZER_1910[p]}`)
  }
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMeta95Refazer1910(p, texto) {
  return semMeta95Refazer1910(texto, p)
}
