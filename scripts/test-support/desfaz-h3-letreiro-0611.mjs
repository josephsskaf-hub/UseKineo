// KINEO-H3-LETREIRO-0611 — [TRAVA 8.2 — fundador 06/11: "pode tomar a decisão sozinho"]
// Recibo exato: desfaz só os trechos desta entrega, para os guardiões históricos lerem o arquivo como era. Trecho ausente ou repetido reprova. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { semFichaDoPedido0911 } from './desfaz-ficha-do-pedido-0911.mjs' // KINEO-FICHA-DO-PEDIDO-0911 — a camada mais nova (09/11, laço do revisor) sai primeiro
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-h3-letreiro-0611-fontes.json', import.meta.url), 'utf8'))
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semH3Letreiro0611(source, file) {
  source = semFichaDoPedido0911(source, file) // KINEO-FICHA-DO-PEDIDO-0911 — a camada de cima sai antes
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  if (!t.includes('KINEO-H3-LETREIRO-0611')) return source
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-h3-letreiro-0611: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes('KINEO-H3-LETREIRO-0611')) throw new Error('desfaz-h3-letreiro-0611: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** O arquivo é exatamente origin/main + esta entrega? */
export function deltaH3Letreiro0611Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)]) return false
  const lf = (x) => String(x).replace(/\r\n/g, '\n')
  return lf(semH3Letreiro0611(source, file)) === lf(upstream)
}
