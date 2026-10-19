// KINEO-FILMES-F1F3-AJUSTE-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — DESFAZ, em memória, o ajuste
// das fases F1 (órfãs da legenda) e F3 (música única) do "Faceless 15 s" para os guardiões que conferem guardiões BYTE A
// BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Uma forma só — toda linha tocada carrega a marca KINEO-FILMES-F1F3-AJUSTE-1910:
//   · TROCA — a linha da base foi reescrita (só no guardião reancorado scripts/test-filmes-f1f4-1910.mjs, cujas provas
//     da música em 3 pedaços deixaram de valer): reconhecida INTEIRA, volta a ser o texto da base. Tabela em
//     desfaz-filmes-f1f3-ajuste-1910-trocas.json ([linha nova, linha da base] por arquivo).
// Encadeamento: esta é a camada MAIS NOVA — sai PRIMEIRO; depois dela, o desfaz da entrega F1–F4 (desfaz-filmes-f1f4-1910).
// lib/compose.ts, lib/hookFirstFrame.ts, lib/lyriaMusic.ts e app/api/compose/route.ts NÃO mudam (o guardião
// scripts/test-filmes-f1f3-ajuste-1910.mjs prova os quatro byte a byte contra o pai do 1º commit do ajuste).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_FILMES_F1F3_AJUSTE_1910 = 'KINEO-FILMES-F1F3-AJUSTE-1910'

/** [linha nova (inteira), linha da base] por arquivo — o guardião reancorado. */
export const TROCAS_FILMES_F1F3_AJUSTE_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-filmes-f1f3-ajuste-1910-trocas.json'), 'utf8'))
export const ARQUIVOS_FILMES_F1F3_AJUSTE_1910 = Object.keys(TROCAS_FILMES_F1F3_AJUSTE_1910)

/** O texto do arquivo sem o ajuste (trocas desfeitas). Sem linha marcada = devolve igual. Linha marcada fora da tabela = erro (nunca some fala de ninguém em silêncio). Preserva CRLF. */
export function semFilmesF1F3Ajuste1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILMES_F1F3_AJUSTE_1910)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_FILMES_F1F3_AJUSTE_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_FILMES_F1F3_AJUSTE_1910)) { fora.push(linha); continue }
    if (!trocas.has(linha)) throw new Error(`desfaz-filmes-f1f3-ajuste-1910: ${p} tem linha marcada fora da tabela: ${linha.slice(0, 80)}`)
    fora.push(trocas.get(linha))
  }
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmesF1F3Ajuste1910(p, texto) {
  return semFilmesF1F3Ajuste1910(texto, p)
}
