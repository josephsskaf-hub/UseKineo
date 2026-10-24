// KINEO-AMOSTRA-ANUNCIO-2410 — exact, fail-closed leaf restoration; no historical imports or provider calls.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const AMOSTRA_ANUNCIO_2410 = JSON.parse(readFileSync(new URL('./desfaz-amostra-anuncio-2410-fontes.json', import.meta.url), 'utf8'))
const hash = s => createHash('sha256').update(s).digest('hex')
export function semAmostraAnuncio2410(text, file) {
  const path = String(file ?? '').replace(/\\/g, '/'), known = AMOSTRA_ANUNCIO_2410.sources[path]
  if (!known || typeof text !== 'string') return text
  const normalized = text.replace(/\r\n/g, '\n'), actual = hash(normalized)
  if (hash(known.before) !== known.beforeHash) throw Error('desfaz-amostra-anuncio-2410: manifesto divergente ' + path)
  if (actual === known.beforeHash) return text
  if (actual !== known.afterHash) {
    if (!/KINEO-AMOSTRA-ANUNCIO-2410|escolhaSample|EscolhaSample|isEscolhaPersonalOrder|adsSampleOrder|ads_sample_order|adsSampleUiScenario2410/.test(text)) return text
    throw Error('desfaz-amostra-anuncio-2410: fonte divergente ' + path)
  }
  return text.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
