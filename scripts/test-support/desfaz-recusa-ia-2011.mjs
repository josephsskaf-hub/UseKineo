// KINEO-RECUSA-IA-2011 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — recibo EXATO desta entrega: a régua nova da recusa do
// modelo (lib/modelRefusal.ts) e as chamadas dela nos caminhos que escrevem roteiro ou prompt de vídeo (rota do cinematic: o prompt que é recusa,
// a fala das cenas do generateScenes com o estorno de sempre e a descrição do descritor; expandir, sugestão, refazer cena, anúncio, Studio Ads,
// desenho, podcast do bebê, demo). Um guardião histórico só ignora o arquivo se desfazer estes trechos devolver EXATAMENTE a base — edição
// desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app. Gerador: gerar-recibo-recusa-ia-2011.mjs.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const RECUSA_IA_2011 = JSON.parse(readFileSync(new URL('./desfaz-recusa-ia-2011-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semRecusaIa2011(source, file) {
  const entry = RECUSA_IA_2011.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-recusa-ia-2011: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-recusa-ia-2011: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "origin/main + esta entrega"? */
export function deltaRecusaIa2011Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string') return false
  const path = rel(file), text = lf(source), entry = RECUSA_IA_2011.scope[path]
  return !!entry && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semRecusaIa2011(text, path)) === lf(upstream)
}
