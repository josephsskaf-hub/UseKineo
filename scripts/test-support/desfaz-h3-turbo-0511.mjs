// KINEO-H3-TURBO-0511 — [TRAVA 8.2 — fundador 05/11: "vamos colocar esses dois motores para funcionar"]. Desfaz exato desta entrega nos arquivos do
// motor, para os guardiões históricos. Trecho ausente ou repetido = lança. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-h3-turbo-0511-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'H3_TURBO'
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semH3Turbo0511(source, file) {
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks || !source.includes(MARCA)) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-h3-turbo-0511: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-h3-turbo-0511: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
export function deltaH3Turbo0511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)] || !source.includes(MARCA)) return false
  return semH3Turbo0511(source, file).replace(/\r\n/g, '\n') === upstream.replace(/\r\n/g, '\n')
}
