// KINEO-CENA-FORA-DO-PEDIDO-1111 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// Recibo exato: desfaz só o trecho desta entrega ("giant" adjetivo não vira o personagem "the giant": lib/cinematic/folhaDePersonagem.ts, SEM_NOME_RE),
// para os guardiões históricos lerem o arquivo como era. Trecho ausente ou repetido reprova. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-cena-fora-do-pedido-1111-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'KINEO-CENA-FORA-DO-PEDIDO-1111'
const rel = (f) => String(f ?? '').replace(/\\/g, '/')
export function semCenaForaDoPedido1111(source, file) {
  const hunks = ESCOPO[rel(file)]
  if (typeof source !== 'string' || !hunks) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  if (!t.includes(MARCA)) return source
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-cena-fora-do-pedido-1111: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-cena-fora-do-pedido-1111: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** O arquivo é exatamente origin/main + esta entrega? */
export function deltaCenaForaDoPedido1111Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[rel(file)]) return false
  const lf = (x) => String(x).replace(/\r\n/g, '\n')
  return lf(semCenaForaDoPedido1111(source, file)) === lf(upstream)
}
