// KINEO-CLIPE-SEM-LETRAS-0111 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: recibo EXATO do que esta camada
// mudou em lib/cinematic/shotSpec.ts (a régua pedeTextoExplicito + buildClipPrompt do Modo Clipe do Studio). Um guardião histórico
// só ignora o shotSpec.ts dos commits desta camada se desfazer estes trechos devolver EXATAMENTE a base — edição desconhecida,
// parcial ou a mais continua reprovando. Regerar com: node scripts/test-support/gerar-recibo-clipe-sem-letras-0111.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

export const SEM_LETRAS_0111 = JSON.parse(readFileSync(new URL('./desfaz-clipe-sem-letras-0111-fontes.json', import.meta.url), 'utf8'))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')

/** O arquivo de hoje é exatamente "base + esta camada"? */
export function semLetras0111Exato(root, file) {
  const entry = SEM_LETRAS_0111.scope[file]
  if (!entry) return false
  let text
  try { text = lf(readFileSync(join(root, file), 'utf8')) } catch { return false }
  if (sha(text) !== entry.afterSha256) return false
  for (const h of entry.hunks) {
    if (text.split(h.after).length !== 2) return false
    text = text.replace(h.after, () => h.before)
  }
  return sha(text) === entry.beforeSha256
}
