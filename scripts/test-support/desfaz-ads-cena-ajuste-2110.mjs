// KINEO-ADS-CENA-AJUSTE-2110 — camada posterior: restaura a snapshot exata anterior antes da camada Cena original.
// Fontes inteiras conhecidas, hash SHA-256 de LF, CRLF preservado. Fonte marcada divergente falha fechada.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semPaginasIaClaras2110 } from './desfaz-paginas-ia-claras-2110.mjs' // reancorado KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] — as páginas claras (21/10, depois desta) saem PRIMEIRO: esta é a cabeça das cadeias
export const MARCA_ADS_CENA_AJUSTE_2110 = 'KINEO-ADS-CENA-AJUSTE-2110'
export const ADS_CENA_AJUSTE_2110_BASE = 'b77f8f79a2031b8af4fffca0b1b32d6eacc24f4a'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-ajuste-2110-fontes.json'), 'utf8'))
export const ADS_CENA_AJUSTE_2110_ARQUIVOS = Object.freeze(Object.keys(table))
export const ADS_CENA_AJUSTE_2110_NOVOS = Object.freeze([
  'scripts/test-support/desfaz-ads-cena-ajuste-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-ajuste-2110-fontes.json',
  'scripts/test-ads-cena-ajuste-2110.mjs',
  'scripts/test-ads-cena-voz-2110.mjs',
  'scripts/test-ads-cena-final-cena-2110.mjs',
  'docs/ADS-CENA-AJUSTE-2026-10-21.md',
  'docs/previews/ads-cena-ajuste-2110.html',
  'docs/previews/ads-cena-ajuste-2110.png',
])
const lf = s => s.replace(/\r\n/g, '\n')
export function semAdsCenaAjuste2110(texto, p) {
  texto = semPaginasIaClaras2110(texto, p) // reancorado KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] — a camada mais nova sai primeiro (texto sem a marca dela passa igual)
  const rel = String(p ?? '').replace(/\\/g, '/')
  const known = table[rel]
  if (!known || typeof texto !== 'string' || !texto.includes(MARCA_ADS_CENA_AJUSTE_2110)) return texto
  const source = lf(texto)
  if (createHash('sha256').update(source).digest('hex') !== known.afterHash) throw new Error('desfaz-ads-cena-ajuste-2110: fonte divergente ' + rel)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
export function desfazAdsCenaAjuste2110(p, texto) { return semAdsCenaAjuste2110(texto, p) }
