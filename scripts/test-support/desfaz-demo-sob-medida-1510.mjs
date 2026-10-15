// KINEO-DEMO-SOB-MEDIDA-1510 — DESFAZ, em memória, a máquina de demo sob medida nos arquivos que JÁ existiam e que guardiões antigos
// conferem BYTE A BYTE contra uma base (ex.: scripts/test-ads-lista-1510.mjs H1 confere lib/ads/v2PostDeliveryServer.ts). Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// As trocas [como estava, como ficou] estão em desfaz-demo-sob-medida-1510-trocas.json, geradas do diff do commit (base d8aad50c5,
// a origin/main de 15/10) e conferidas na geração: aplicar o desfaz devolve a base byte a byte. Cada bloco tem de aparecer
// EXATAMENTE uma vez (senão lança: conserto pela metade ou mudança alheia no trecho não passa) e a marca não pode sobrar.
// Arquivo sem a marca = volta igual (a demo ainda não está nesta árvore). Fim de linha: o do próprio texto (LF ou CRLF).
// ENCADEAR: a demo é a camada mais nova destes arquivos — aplicar por FORA das outras (ou colada no readFileSync; os arquivos
// não se cruzam com os desfaz da trava do produto).
// O guardião scripts/test-demo-sob-medida-1510.mjs prova o byte a byte contra o pai do 1º commit com a marca.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_DEMO_SOB_MEDIDA_1510 = 'KINEO-DEMO-SOB-MEDIDA-1510'
const TROCAS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-demo-sob-medida-1510-trocas.json'), 'utf8'))
export const ARQUIVOS_DEMO_SOB_MEDIDA_1510 = Object.freeze(Object.keys(TROCAS))

/** Devolve `src` sem a demo sob medida (só para os arquivos da lista; os outros voltam intocados). */
export function semDemoSobMedida1510(rel, src) {
  const key = String(rel ?? '').replace(/\\/g, '/')
  if (!Object.hasOwn(TROCAS, key) || typeof src !== 'string' || !src.includes(MARCA_DEMO_SOB_MEDIDA_1510)) return src
  const crlf = src.includes('\r\n')
  let s = crlf ? src.replace(/\r\n/g, '\n') : src
  for (const [antes, depois] of TROCAS[key]) {
    const n = s.split(depois).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_DEMO_SOB_MEDIDA_1510} em ${key}: bloco achado ${n}× — ${depois.slice(0, 70)}`)
    s = s.split(depois).join(antes)
  }
  if (s.includes(MARCA_DEMO_SOB_MEDIDA_1510)) throw new Error(`desfaz ${MARCA_DEMO_SOB_MEDIDA_1510} em ${key}: sobrou linha marcada`)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
