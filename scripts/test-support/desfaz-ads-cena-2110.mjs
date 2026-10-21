// KINEO-ADS-CENA-2110 — desfaz exato em memória da camada de cena, legenda e UGC obrigatório; sem rede, env ou banco.
// A camada MAIS NOVA sai primeiro em semAdsQualidade2110; este módulo não importa nenhuma camada anterior.
// Só remove acréscimos marcados e restaura linhas INTEIRAS da tabela. Contagens erradas falham fechadas.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_ADS_CENA_2110 = 'KINEO-ADS-CENA-2110'
export const ADS_CENA_2110_BASE = '4cbd06b1'
const TABELA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-2110-trocas.json'), 'utf8'))
export const TROCAS_ADS_CENA_2110 = Object.fromEntries(Object.entries(TABELA).filter(([k]) => k !== '__acrescimos'))
export const ACRESCIMOS_ADS_CENA_2110 = TABELA.__acrescimos
export const ADS_CENA_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_ADS_CENA_2110))
export const ADS_CENA_2110_NOVOS = [
  'app/api/admin/ads-cena/route.ts',
  'docs/ADS-CENA-FAL-CONTRATOS-2026-10-21.md',
  'docs/ADS-CENA-2026-10-21.md',
  'docs/previews/ads-cena-quality-2110.html',
  'docs/previews/ads-cena-quality-2110.png',
  'docs/previews/ads-cena-montage-2110.html',
  'docs/previews/ads-cena-montage-2110.png',
  'lib/ads/cena/adapters.ts',
  'lib/ads/cena/catalog.ts',
  'lib/ads/cena/internal.ts',
  'lib/ads/cena/montage.ts',
  'lib/ads/cena/pipeline.ts',
  'lib/ads/cena/plan.ts',
  'lib/ads/cena/runtime.ts',
  'lib/ads/v2CenaQuality.ts',
  'scripts/test-ads-cena-2110.mjs',
  'scripts/test-ads-cena-quality-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-2110-trocas.json',
]

/** Sem a entrega atual: CRLF preservado, idempotente, arquivos fora da lista intocados. */
export function semAdsCena2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_ADS_CENA_2110) || !ADS_CENA_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_ADS_CENA_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0, trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_ADS_CENA_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  if (tiradas !== ACRESCIMOS_ADS_CENA_2110[rel]) throw new Error(`desfaz-ads-cena-2110: ${rel} tem ${tiradas} acréscimo(s), esperava ${ACRESCIMOS_ADS_CENA_2110[rel]}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-ads-cena-2110: ${rel} tem ${trocadas} de ${trocas.size} troca(s)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

export function desfazAdsCena2110(p, texto) { return semAdsCena2110(texto, p) }
