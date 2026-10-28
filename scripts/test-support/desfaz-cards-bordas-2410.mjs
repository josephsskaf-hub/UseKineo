// [TRAVA 8.2 — vai do fundador 24/10 "ainda tem uma borda preta... para a gente não deixar mais nenhuma"] KINEO-CARDS-BORDAS-2410 —
// desfaz EXATO, em memória, das linhas desta camada: 5 de enquadramento em lib/ui/homeThreeCards.ts (tênis e Leo em cover; zoom nos 2 filmes do giro) e
// 1 filtro de inventário em scripts/test-idiomas-formatos-undo-2410.mjs.
// Troca linha inteira por linha inteira (tabela em desfaz-cards-bordas-2410-trocas.json). Sem a marca = intocado; linha divergente = LANÇA.
// Camada mais nova sobre o giro: semCardsGiro2410 chama isto PRIMEIRO. Fim de linha: o do próprio texto. Idempotente.
import { semRostoCards2810 } from './desfaz-rosto-cards-2810.mjs' // KINEO-ROSTO-NO-CLIPE-2810 — as entregas de 28/10 (rosto no clipe, cards, elenco, galeria cheia, menu) saem em memória ANTES de todas as camadas
import { readFileSync } from 'node:fs'
import { semTrendingInventario2510 } from './desfaz-trending-inventario-2510.mjs'
import { semCronOrigem2610 } from './desfaz-cron-origem-2610.mjs' // KINEO-CRON-ORIGEM-2610
import { semCardsNovos2610 } from './desfaz-cards-novos-2610.mjs' // KINEO-CARDS-NOVOS-2610 — camada mais nova dos cards
export const MARCA_CARDS_BORDAS_2410 = 'KINEO-CARDS-BORDAS-2410'
export const CARDS_BORDAS_2410 = JSON.parse(readFileSync(new URL('./desfaz-cards-bordas-2410-trocas.json', import.meta.url), 'utf8'))

export function semCardsBordas2410(texto, p) {
  texto = semRostoCards2810(texto, p) // KINEO-ROSTO-NO-CLIPE-2810 — as entregas de 28/10 (cards 1, 2 e 4 entre elas) saem antes de todas
  texto = semCronOrigem2610(texto, p) // KINEO-CRON-ORIGEM-2610 — o guardião das páginas reancorado sai antes
  texto = semCardsNovos2610(texto, p) // KINEO-CARDS-NOVOS-2610 — os vídeos novos dos 3 cards saem antes de tudo
  texto = semTrendingInventario2510(texto, p) // KINEO-TRENDING-INVENTARIO-2510 — newer exact inventory line comes off first.
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  if (typeof texto !== 'string' || !Object.hasOwn(CARDS_BORDAS_2410.arquivos, rel) || !texto.includes(MARCA_CARDS_BORDAS_2410)) return texto
  const crlf = texto.includes('\r\n')
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  for (const { depois, antes } of CARDS_BORDAS_2410.arquivos[rel]) {
    const i = linhas.indexOf(depois)
    if (i < 0 || linhas.indexOf(depois, i + 1) >= 0) throw new Error(`desfaz ${MARCA_CARDS_BORDAS_2410}: linha divergente`)
    linhas[i] = antes
  }
  const sem = linhas.join('\n')
  return crlf ? sem.replace(/\n/g, '\r\n') : sem
}
