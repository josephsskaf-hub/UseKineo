// [TRAVA 8.2 — vai do fundador 24/10 "ainda tem uma borda preta... para a gente não deixar mais nenhuma"] KINEO-CARDS-BORDAS-2410 —
// desfaz EXATO, em memória, das 5 linhas de enquadramento em lib/ui/homeThreeCards.ts (tênis e Leo em cover; zoom nos 2 filmes do giro).
// Troca linha inteira por linha inteira (tabela em desfaz-cards-bordas-2410-trocas.json). Sem a marca = intocado; linha divergente = LANÇA.
// Camada mais nova sobre o giro: semCardsGiro2410 chama isto PRIMEIRO. Fim de linha: o do próprio texto. Idempotente.
import { readFileSync } from 'node:fs'
export const MARCA_CARDS_BORDAS_2410 = 'KINEO-CARDS-BORDAS-2410'
export const CARDS_BORDAS_2410 = JSON.parse(readFileSync(new URL('./desfaz-cards-bordas-2410-trocas.json', import.meta.url), 'utf8'))

export function semCardsBordas2410(texto, p) {
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  if (typeof texto !== 'string' || rel !== CARDS_BORDAS_2410.arquivo || !texto.includes(MARCA_CARDS_BORDAS_2410)) return texto
  const crlf = texto.includes('\r\n')
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  for (const { depois, antes } of CARDS_BORDAS_2410.pares) {
    const i = linhas.indexOf(depois)
    if (i < 0 || linhas.indexOf(depois, i + 1) >= 0) throw new Error(`desfaz ${MARCA_CARDS_BORDAS_2410}: linha divergente`)
    linhas[i] = antes
  }
  const sem = linhas.join('\n')
  return crlf ? sem.replace(/\n/g, '\r\n') : sem
}
