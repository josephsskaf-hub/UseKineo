// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — DESFAZ, em memória, a PÍLULA DE VOLTA na legenda da fala do "Close do produto real" (canário do cc5c984cc, 19/10: o
// contorno de 3 px sem pílula sumia sobre foto clara; o tamanho 3,6% e as 4 palavras por linha ficam, a fala volta à pílula da rodada 3 com alpha 0,72, as linhas
// vão com "\n" e palavra fraca não fecha linha) para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga ou executam o formato na régua da
// época. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-CLOSE-REAL-LEGENDA-PILULA-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-close-real-legenda-pilula-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a da legenda menor (KINEO-CLOSE-REAL-LEGENDA-1910) nem a de nenhuma camada
// de antes. Encadeamento: é a camada MAIS NOVA — sai PRIMEIRO (semCloseRealLegenda1910 chama esta antes de tudo, e por ela a rodada 3, o ajuste e o Close real).
// O guardião scripts/test-close-real-legenda-pilula-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (CLOSE_REAL_LEGENDA_PILULA_1910_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_CLOSE_REAL_LEGENDA_PILULA_1910 = 'KINEO-CLOSE-REAL-LEGENDA-PILULA-1910'

/** A base da entrega (origin/main de 19/10: a legenda menor do Close real, cc5c984cc, no ar). */
export const CLOSE_REAL_LEGENDA_PILULA_1910_BASE = 'cc5c984cca785d0700361b05745835b34ed0a366'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_CLOSE_REAL_LEGENDA_PILULA_1910 = {
  'lib/ads/v2CloseReal.ts': 20,
  'scripts/test-close-real-legenda-1910.mjs': 1,
  'scripts/test-support/desfaz-close-real-legenda-1910.mjs': 2,
}
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_CLOSE_REAL_LEGENDA_PILULA_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-close-real-legenda-pilula-1910-trocas.json'), 'utf8'))
export const CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS = Object.keys(ACRESCIMOS_CLOSE_REAL_LEGENDA_PILULA_1910)
/** Arquivos novos da entrega. */
export const CLOSE_REAL_LEGENDA_PILULA_1910_NOVOS = [
  'scripts/test-close-real-legenda-pilula-1910.mjs',
  'scripts/test-support/desfaz-close-real-legenda-pilula-1910.mjs',
  'scripts/test-support/desfaz-close-real-legenda-pilula-1910-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semCloseRealLegendaPilula1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_CLOSE_REAL_LEGENDA_PILULA_1910) || !CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_CLOSE_REAL_LEGENDA_PILULA_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_CLOSE_REAL_LEGENDA_PILULA_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_CLOSE_REAL_LEGENDA_PILULA_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-close-real-legenda-pilula-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazCloseRealLegendaPilula1910(p, texto) {
  return semCloseRealLegendaPilula1910(texto, p)
}
