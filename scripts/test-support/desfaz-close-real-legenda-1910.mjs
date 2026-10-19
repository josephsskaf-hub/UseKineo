// KINEO-CLOSE-REAL-LEGENDA-1910 — DESFAZ, em memória, a LEGENDA MENOR do "Close do produto real" (fala em 3,6% da altura, até 4 palavras por linha e 2
// linhas, branca com o contorno da legenda dos filmes e SEM pílula; o título do gancho segue em 4,5% na pílula) para os guardiões que conferem arquivos
// BYTE A BYTE contra uma base antiga ou executam o formato na régua da época. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-CLOSE-REAL-LEGENDA-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-close-real-legenda-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes do Close real. Encadeamento: é a camada
// MAIS NOVA — sai PRIMEIRO (semCloseRealV3_1910 chama esta antes de tudo, e por ela semCloseRealAjuste1910 e semCloseReal1910).
// O guardião scripts/test-close-real-legenda-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (CLOSE_REAL_LEGENDA_1910_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_CLOSE_REAL_LEGENDA_1910 = 'KINEO-CLOSE-REAL-LEGENDA-1910'
import { semCloseRealLegendaPilula1910 } from './desfaz-close-real-legenda-pilula-1910.mjs' // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a pílula de volta veio depois: sai PRIMEIRO (encadeado; texto sem a marca dela passa igual)

/** A base da entrega (origin/main de 19/10: a rodada 3 do Close real + o Faceless 15 s no export limpo). */
export const CLOSE_REAL_LEGENDA_1910_BASE = 'aae496a30341f6fae981375d5543d31cff5a9eef'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_CLOSE_REAL_LEGENDA_1910 = {
  'lib/ads/v2CloseReal.ts': 35,
  'scripts/test-close-real-v3-1910.mjs': 1,
  'scripts/test-filmes-f1-virgula-1910.mjs': 1,
  'scripts/test-support/desfaz-close-real-v3-1910.mjs': 2,
}
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_CLOSE_REAL_LEGENDA_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-close-real-legenda-1910-trocas.json'), 'utf8'))
export const CLOSE_REAL_LEGENDA_1910_ARQUIVOS = Object.keys(ACRESCIMOS_CLOSE_REAL_LEGENDA_1910)
/** Arquivos novos da entrega. */
export const CLOSE_REAL_LEGENDA_1910_NOVOS = [
  'scripts/test-close-real-legenda-1910.mjs',
  'scripts/test-support/desfaz-close-real-legenda-1910.mjs',
  'scripts/test-support/desfaz-close-real-legenda-1910-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semCloseRealLegenda1910(texto, p) {
  texto = semCloseRealLegendaPilula1910(texto, p) // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a camada mais nova sai primeiro
  if (typeof texto !== 'string' || !texto.includes(MARCA_CLOSE_REAL_LEGENDA_1910) || !CLOSE_REAL_LEGENDA_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_CLOSE_REAL_LEGENDA_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_CLOSE_REAL_LEGENDA_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_CLOSE_REAL_LEGENDA_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-close-real-legenda-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazCloseRealLegenda1910(p, texto) {
  return semCloseRealLegenda1910(texto, p)
}
