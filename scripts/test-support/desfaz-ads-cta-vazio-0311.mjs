// KINEO-ADS-CTA-VAZIO-0311b — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (cenaInput em lib/ads/cena/plan.ts: CTA opcional vazio/só espaços = sem CTA, igual a ausente).
// Recibo EXATO desta entrega: hash de antes (431d5622c), o de depois e os 2 trechos trocados em plan.ts. Um guardião histórico
// só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const ADS_CTA_VAZIO_0311 = JSON.parse(readFileSync(new URL('./desfaz-ads-cta-vazio-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semAdsCtaVazio0311(source, file) {
  const entry = ADS_CTA_VAZIO_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-ads-cta-vazio-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-ads-cta-vazio-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? (arquivo novo: hash exato e ausente na origin/main) */
export function deltaAdsCtaVazio0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = ADS_CTA_VAZIO_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semAdsCtaVazio0311(text, path)) === lf(upstream)
  const added = ADS_CTA_VAZIO_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
