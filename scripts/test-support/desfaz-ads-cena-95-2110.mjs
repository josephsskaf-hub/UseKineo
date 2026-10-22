// KINEO-ADS-CENA-95-2110 — camada mais nova primeiro; snapshot LF exata, CRLF e integridade fechada.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const MARCA_ADS_CENA_95_2110 = 'KINEO-ADS-CENA-95-2110'
export const ADS_CENA_95_2110_FORK_BASE = '72d23210c829278f81e39f7d7cdf42826137297c'
export const ADS_CENA_95_2110_BASE = 'be103e4930ee45111884b19230225474ca8fe60c' // KINEO-ADS-CENA-95-2110 — desfaz somente95, preservando a venda Kids já integrada.
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-95-2110-fontes.json'), 'utf8'))
export const ADS_CENA_95_2110_ARQUIVOS = Object.freeze(Object.keys(table))
export const ADS_CENA_95_2110_NOVOS = Object.freeze([
  ...['presenters95', 'script95', 'plan95', 'adapters95', 'pipeline95', 'voice95', 'costs95', 'audio95Runtime', 'captions95', 'montage95', 'frames95', 'runtime95', 'finish95', 'usage95'].map(n => `lib/ads/cena/${n}.ts`),
  ...['audio', 'montagem', 'pipeline', 'frames', 'runtime'].map(n => `scripts/test-ads-cena-95-${n}-2110.mjs`),
  'scripts/test-ads-cena-95-2110.mjs', 'scripts/test-ads-cena-calibracao-2110.mjs', 'scripts/ads-cena-calibracao-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-95-2110.mjs', 'scripts/test-support/desfaz-ads-cena-95-2110-fontes.json',
  'docs/ADS-CENA-95-2026-10-21.md', 'docs/ADS-CENA-95-NOTAS.md',
  'docs/previews/ads-cena-95-montagem-2110.html', 'docs/previews/ads-cena-95-montagem-2110.png',
])
const lf = s => s.replace(/\r\n/g, '\n')
export function semAdsCena952110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/'), known = table[rel]
  if (!known || typeof texto !== 'string' || !texto.includes(MARCA_ADS_CENA_95_2110)) return texto
  const source = lf(texto), hash = createHash('sha256').update(source).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-95-2110: fonte divergente ' + rel)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
export function desfazAdsCena952110(p, texto) { return semAdsCena952110(texto, p) }
