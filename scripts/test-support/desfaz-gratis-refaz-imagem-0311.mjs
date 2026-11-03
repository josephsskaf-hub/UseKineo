// KINEO-GRATIS-REFAZ-IMAGEM-0311 — [TRAVA 8.2 — fundador 03/11: "três sim" — refazer também a imagem da cena no 1º filme grátis]
// (época/pessoa inventada em cena i2v SEM folha: o still FLUX é refeito com a correção antes do clipe).
// Recibo EXATO desta entrega em lib/free15Gate.ts, lib/free15GateServer.ts, scripts/test-gratis-refaz-cena-0311.mjs e
// scripts/test-painel-motor-entregue-0211.mjs (+ os novos): para cada arquivo existente, o hash de antes (origin/main no commit-base),
// o de depois e os trechos trocados; para cada arquivo novo, o hash dele. Um guardião histórico só ignora o arquivo se desfazer estes
// trechos devolver EXATAMENTE o commit-base — edição desconhecida, parcial ou a mais continua reprovando. Nunca usar em lib/app.
// Encadear camadas: a mais nova sai PRIMEIRO (esta antes de desfaz-gratis-refaz-0311, que sai antes de desfaz-elenco-trava-0311).
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const GRATIS_REFAZ_IMAGEM_0311 = JSON.parse(readFileSync(new URL('./desfaz-gratis-refaz-imagem-0311-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const rel = (f) => String(f ?? '').replace(/\\/g, '/')

/** O texto de hoje sem esta entrega (exato) — ou o mesmo texto, se ele não é o "depois" desta entrega. */
export function semGratisRefazImagem0311(source, file) {
  const entry = GRATIS_REFAZ_IMAGEM_0311.scope[rel(file)]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source)
  if (sha(text) !== entry.afterSha256) return source
  let result = text
  for (const h of entry.hunks) {
    if (result.split(h.after).length !== 2) throw Error('desfaz-gratis-refaz-imagem-0311: trecho ausente/ambiguo ' + rel(file))
    result = result.replace(h.after, () => h.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-gratis-refaz-imagem-0311: resultado divergente ' + rel(file))
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

/** O arquivo de hoje é exatamente "commit-base + esta entrega"? (arquivo novo: hash exato e ausente no commit-base) */
export function deltaGratisRefazImagem0311Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = GRATIS_REFAZ_IMAGEM_0311.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256 && sha(lf(upstream)) === entry.beforeSha256 && lf(semGratisRefazImagem0311(text, path)) === lf(upstream)
  const added = GRATIS_REFAZ_IMAGEM_0311.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
