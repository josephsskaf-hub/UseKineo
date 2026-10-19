// KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — DESFAZ, em memória, a entrega
// "Faceless 15 s · F1–F4" para os guardiões que conferem rotas BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é
// teste (o nome não começa com test-).
//
// A entrega toca UM arquivo protegido, app/api/compose/route.ts, e só ACRESCENTA linhas: toda linha nova carrega a marca
// KINEO-FILMES-F1-F4-1910 (o import inclusive, em linha própria). Nenhuma troca. lib/compose.ts, lib/hookFirstFrame.ts e
// lib/lyriaMusic.ts NÃO mudam (o guardião scripts/test-filmes-f1f4-1910.mjs prova os três byte a byte contra a base e prova
// que, desfeito isto, a rota é EXATAMENTE o pai do 1º commit da entrega).
export const MARCA_FILMES_F1F4_1910 = 'KINEO-FILMES-F1-F4-1910'

/** Arquivos protegidos que a entrega toca, com a contagem EXATA de linhas acrescentadas (marcadas). */
export const ACRESCIMOS_FILMES_F1F4_1910 = {
  'app/api/compose/route.ts': 4,
}
export const ARQUIVOS_FILMES_F1F4_1910 = Object.keys(ACRESCIMOS_FILMES_F1F4_1910)

/** Uma linha desta entrega? */
export function linhaDosFilmesF1F4_1910(l) {
  return typeof l === 'string' && l.includes(MARCA_FILMES_F1F4_1910)
}

/** O texto do arquivo sem a entrega (acréscimos fora). Sem linha marcada = devolve igual. Preserva CRLF. */
export function semFilmesF1F4_1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILMES_F1F4_1910)) return texto
  const crlf = texto.includes('\r\n')
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (linha.includes(MARCA_FILMES_F1F4_1910)) { tiradas++; continue }
    fora.push(linha)
  }
  const esperadas = ACRESCIMOS_FILMES_F1F4_1910[p]
  if (esperadas != null && tiradas !== esperadas) {
    throw new Error(`desfaz-filmes-f1f4-1910: ${p} tem ${tiradas} linha(s) marcada(s), esperava ${esperadas}`)
  }
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmesF1F4_1910(p, texto) {
  return semFilmesF1F4_1910(texto, p)
}
