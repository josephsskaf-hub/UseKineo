// KINEO-FICHA-DO-PEDIDO-0911 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// (o que o cliente escreveu sobre o personagem no PEDIDO ORIGINAL chega à ficha quando o roteiro automático resumiu o texto: 4 linhas em
// app/api/generate-video-cinematic/route.ts e o leitor novo lib/cinematic/fichaDoPedido.ts).
// Recibo EXATO desta entrega: o hash de antes (a origin/main em que nasceu), o de depois e os trechos trocados. Um guardião histórico só
// ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida, parcial ou a mais continua reprovando.
// Trecho ausente ou repetido lança. Nunca usar em lib/app.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FICHA_DO_PEDIDO_0911 = JSON.parse(readFileSync(new URL('./desfaz-ficha-do-pedido-0911-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'KINEO-FICHA-DO-PEDIDO-0911'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (os trechos do recibo, um a um) — ou o mesmo texto, se ele não traz esta entrega. */
export function semFichaDoPedido0911(source, file) {
  const entry = FICHA_DO_PEDIDO_0911.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  let t = lf(source)
  if (!t.includes(MARCA)) return source
  for (const h of entry.hunks) {
    if (t.split(h.after).length !== 2) throw new Error('desfaz-ficha-do-pedido-0911: trecho ausente ou repetido em ' + rel(file))
    t = t.replace(h.after, () => h.before)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-ficha-do-pedido-0911: sobrou edição desta entrega em ' + rel(file))
  return source.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t
}

/** O arquivo de hoje é exatamente "base + esta entrega"? (arquivo novo: o hash do recibo; arquivo alterado: desfazer devolve a base) */
export function deltaFichaDoPedido0911Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = FICHA_DO_PEDIDO_0911.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semFichaDoPedido0911(text, path)) === lf(upstream)
  const added = FICHA_DO_PEDIDO_0911.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
