// KINEO-RESERVA-H3-0611 — [TRAVA 8.2 — fundador 06/11: "quero sim o H3... pode trocar"]
// Recibo exato: desfaz só os trechos desta entrega, para os guardiões históricos lerem o arquivo como era. Trecho ausente ou repetido reprova. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { semH3Letreiro0611 } from './desfaz-h3-letreiro-0611.mjs' // KINEO-H3-LETREIRO-0611
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-reserva-h3-0611-fontes.json', import.meta.url), 'utf8'))
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semReservaH30611(source, file) {
  source = semH3Letreiro0611(source, file) // KINEO-H3-LETREIRO-0611 — a camada de cima sai antes
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  if (!t.includes('KINEO-RESERVA-H3-0611')) return source
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-reserva-h3-0611: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes('KINEO-RESERVA-H3-0611')) throw new Error('desfaz-reserva-h3-0611: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** O arquivo é exatamente origin/main + esta entrega? */
export function deltaReservaH30611Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)]) return false
  const lf = (x) => String(x).replace(/\r\n/g, '\n')
  return lf(semReservaH30611(source, file)) === lf(upstream)
}
