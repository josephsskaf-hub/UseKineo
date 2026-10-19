// KINEO-FILMES-F1-VIRGULA-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — DESFAZ, em memória, a fiação do
// "Faceless 15 s" no export limpo (app/api/compose/unlock/route.ts) para os guardiões que conferem a rota BYTE A BYTE
// contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-FILMES-F1-VIRGULA-1910:
//   · ACRÉSCIMO — linha nova: sai inteira. A rota do unlock só tem acréscimos (import + 4 linhas), contagem EXATA.
//   · TROCA — a linha da base foi reescrita (só nos guardiões reancorados, onde este desfaz entra na cadeia): reconhecida
//     INTEIRA, volta a ser o texto da base. Tabela em desfaz-filmes-f1-virgula-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. Encadeamento: é a camada MAIS NOVA — sai PRIMEIRO.
// lib/compose.ts, lib/hookFirstFrame.ts, lib/lyriaMusic.ts e app/api/compose/route.ts NÃO mudam (o guardião
// scripts/test-filmes-f1-virgula-1910.mjs prova).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_FILMES_F1_VIRGULA_1910 = 'KINEO-FILMES-F1-VIRGULA-1910'

/** Arquivos protegidos que a entrega toca só por acréscimo, com a contagem EXATA de linhas marcadas. */
export const ACRESCIMOS_FILMES_F1_VIRGULA_1910 = {
  'app/api/compose/unlock/route.ts': 5,
  'scripts/test-gancho-1q-2026-10-03.mjs': 1,
  'scripts/test-parceiro-eyebible-2-1410.mjs': 1,
  'scripts/test-filmes-f1f4-1910.mjs': 1,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 1,
  'scripts/test-close-real-ajuste-1910.mjs': 1,
  'scripts/test-close-real-v3-1910.mjs': 1,
  'scripts/test-apresentador-v2-libera-1910.mjs': 1,
  'scripts/test-filme-rapido-1710.mjs': 1,
  'scripts/test-close-real-1910.mjs': 1,
}
/** [linha nova (inteira), linha da base] por arquivo — os guardiões reancorados. */
export const TROCAS_FILMES_F1_VIRGULA_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-filmes-f1-virgula-1910-trocas.json'), 'utf8'))
export const ARQUIVOS_FILMES_F1_VIRGULA_1910 = [...new Set([...Object.keys(ACRESCIMOS_FILMES_F1_VIRGULA_1910), ...Object.keys(TROCAS_FILMES_F1_VIRGULA_1910)])]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semFilmesF1Virgula1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILMES_F1_VIRGULA_1910) || !ARQUIVOS_FILMES_F1_VIRGULA_1910.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_FILMES_F1_VIRGULA_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_FILMES_F1_VIRGULA_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_FILMES_F1_VIRGULA_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-filmes-f1-virgula-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmesF1Virgula1910(p, texto) {
  return semFilmesF1Virgula1910(texto, p)
}
