// KINEO-ELENCO-ATE-O-FIM-0511 — [TRAVA 8.2 — fundador 05/11, vendo o filme do Roland: "são pessoas diferentes"]. Desfaz exato desta entrega nos
// 4 arquivos do motor, para os guardiões históricos que comparam com a base. Trecho ausente ou repetido = lança (edição desconhecida continua
// reprovando). Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-elenco-fim-0511-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'KINEO-ELENCO-ATE-O-FIM-0511'
export function semElencoFim0511(source, file) {
  const hunks = ESCOPO[String(file ?? '').replace(/\\/g, '/')]
  if (typeof source !== 'string' || !hunks || !source.includes(MARCA)) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-elenco-fim-0511: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-elenco-fim-0511: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
/** O arquivo de hoje é exatamente "base + esta entrega"? */
export function deltaElencoFim0511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[String(file ?? '').replace(/\\/g, '/')] || !source.includes(MARCA)) return false
  return semElencoFim0511(source, file).replace(/\r\n/g, '\n') === upstream.replace(/\r\n/g, '\n')
}
