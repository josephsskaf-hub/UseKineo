import { semKidsVenda2010 } from './desfaz-kids-venda-2010.mjs' // KINEO-KIDS-VENDA-2010 — a venda integrada em 21/10 é a camada mais nova
// KINEO-ADS-CENA-AJUSTE-2110 — camada posterior: restaura a snapshot exata anterior antes da camada Cena original.
// Fontes inteiras conhecidas, hash SHA-256 de LF, CRLF preservado. Fonte marcada divergente falha fechada.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  texto = semKidsVenda2010(texto, p) // KINEO-KIDS-VENDA-2010 — tira só a venda antes das camadas anteriores
  const rel = String(p ?? '').replace(/\\/g, '/')
  const known = table[rel]
  if (!known || typeof texto !== 'string' || !texto.includes(MARCA_ADS_CENA_AJUSTE_2110)) return texto
  const source = lf(texto)
  if (createHash('sha256').update(source).digest('hex') !== known.afterHash) throw new Error('desfaz-ads-cena-ajuste-2110: fonte divergente ' + rel)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
export function desfazAdsCenaAjuste2110(p, texto) { return semAdsCenaAjuste2110(texto, p) }
