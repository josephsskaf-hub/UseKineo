// KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — DESFAZ, em memória, a entrega
// "Faceless 15 s · F1–F4" para os guardiões que conferem rotas e guardiões BYTE A BYTE contra uma base antiga. Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-FILMES-F1-F4-1910:
//   · ACRÉSCIMO — linha nova (a rota do compose só tem acréscimos: import + 5 linhas; e o import que cada guardião
//     reancorado ganhou): sai inteira. app/api/compose/route.ts tem a CONTAGEM exata.
//   · TROCA — a linha da base foi reescrita (só nos guardiões reancorados, onde o desfaz desta entrega precisou entrar
//     na cadeia): reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-filmes-f1f4-1910-trocas.json,
//     gerada do diff da entrega ([linha nova, linha da base] por arquivo).
// lib/compose.ts, lib/hookFirstFrame.ts e lib/lyriaMusic.ts NÃO mudam (scripts/test-filmes-f1f4-1910.mjs prova os três
// byte a byte contra a base e prova que, desfeito isto, a rota é EXATAMENTE o pai do 1º commit da entrega).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_FILMES_F1F4_1910 = 'KINEO-FILMES-F1-F4-1910'

/** Arquivos protegidos que a entrega toca só por acréscimo, com a contagem EXATA de linhas marcadas. */
export const ACRESCIMOS_FILMES_F1F4_1910 = {
  'app/api/compose/route.ts': 6,
}
/** [linha nova (inteira), linha da base] por arquivo — os guardiões reancorados. */
export const TROCAS_FILMES_F1F4_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-filmes-f1f4-1910-trocas.json'), 'utf8'))
export const ARQUIVOS_FILMES_F1F4_1910 = [...new Set([...Object.keys(ACRESCIMOS_FILMES_F1F4_1910), ...Object.keys(TROCAS_FILMES_F1F4_1910)])]

/** Uma linha desta entrega? */
export function linhaDosFilmesF1F4_1910(l) {
  return typeof l === 'string' && l.includes(MARCA_FILMES_F1F4_1910)
}

/** As linhas da BASE que a entrega reescreveu em `p` (para os guardiões que contam linhas removidas). */
export function linhasTrocadasFilmesF1F4_1910(p) {
  return (TROCAS_FILMES_F1F4_1910[p] ?? []).map(([, base]) => base)
}

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Sem linha marcada = devolve igual. Preserva CRLF. */
export function semFilmesF1F4_1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILMES_F1F4_1910)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_FILMES_F1F4_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_FILMES_F1F4_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++ // acréscimo puro: sai
  }
  const esperadas = ACRESCIMOS_FILMES_F1F4_1910[p]
  if (esperadas != null && tiradas !== esperadas) {
    throw new Error(`desfaz-filmes-f1f4-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  }
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmesF1F4_1910(p, texto) {
  return semFilmesF1F4_1910(texto, p)
}
