// KINEO-H3-TURBO-0511 — [TRAVA 8.2 — fundador 05/11: "vamos colocar esses dois motores para funcionar"]. Desfaz exato desta entrega, para os guardiões
// históricos. KINEO-H3-TURBO-ABRE-0511 — a abertura ("pode abrir para os clientes") entra no mesmo recibo (gerar-recibo-h3-turbo-0511.mjs).
// Texto sem nenhum trecho desta entrega = devolve como veio. Parte dos trechos ausente ou repetida = lança. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-h3-turbo-0511-fontes.json', import.meta.url), 'utf8'))
const MARCA = /H3_TURBO|KINEO-H3-TURBO-ABRE-0511/
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semH3Turbo0511(source, file) {
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  if (!hunks.some((h) => t.includes(h.depois))) return source
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-h3-turbo-0511: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (MARCA.test(t)) throw new Error('desfaz-h3-turbo-0511: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
export function deltaH3Turbo0511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)]) return false
  const lf = (t) => t.replace(/\r\n/g, '\n'), semEla = lf(semH3Turbo0511(source, file))
  if (semEla === lf(upstream)) return true
  // a origin/main ainda na primeira entrega (e470054e9): só vale se ela for exatamente aquele commit e o desfazer devolver a base dele
  const git = (ref) => lf(execFileSync('git', ['show', `${ref}:${rel(file)}`], { cwd: join(import.meta.dirname, '..', '..'), encoding: 'utf8', maxBuffer: 64 << 20 }))
  try { return lf(upstream) === git('e470054e9') && semEla === git('497575632') } catch { return false }
}
