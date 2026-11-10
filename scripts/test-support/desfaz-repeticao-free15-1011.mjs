// KINEO-REPETICAO-FREE15-1011 — [aval permanente do fundador 01/11 (laço do revisor)]
// Recibo exato: desfaz só os trechos desta entrega (eixo de câmera no vetor do filme grátis de 15 s: rota cinematic + cenaKling4),
// para os guardiões históricos lerem o arquivo como era. Trecho ausente ou repetido reprova. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-repeticao-free15-1011-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'KINEO-REPETICAO-FREE15-1011'
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semRepeticaoFree151011(source, file) {
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  if (!t.includes(MARCA)) return source
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-repeticao-free15-1011: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-repeticao-free15-1011: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** O arquivo é exatamente origin/main + esta entrega? */
export function deltaRepeticaoFree151011Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)]) return false
  const lf = (x) => String(x).replace(/\r\n/g, '\n')
  return lf(semRepeticaoFree151011(source, file)) === lf(upstream)
}
