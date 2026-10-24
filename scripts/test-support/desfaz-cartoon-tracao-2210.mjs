// KINEO-CARTOON-TRACAO-2210 — exact, in-memory historical adapter; the new guardian reads real source.
// Only exact diff hunks for declared existing files are undone. Missing/duplicate/mutated hunks throw.
// Changes outside those hunks survive. No network, environment reads, source writes or production calls.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CARTOON_TRACAO_BASE = '895d6c99638dc0af65e11ad761f4999141587fa7'
export const CARTOON_TRACAO_MARK = 'KINEO-CARTOON-TRACAO-2210'
export const CARTOON_TRACAO_HUNKS = Object.freeze(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-cartoon-tracao-2210-hunks.json'), 'utf8')))

export function semCartoonTracao2210(text, file) {
  const rel = String(file ?? '').replace(/\\/g, '/')
  const hunks = CARTOON_TRACAO_HUNKS[rel]
  if (typeof text !== 'string' || !hunks || !text.includes(CARTOON_TRACAO_MARK)) return text
  const crlf = text.includes('\r\n')
  let result = text.replace(/\r\n/g, '\n')
  for (const hunk of hunks) {
    const count = result.split(hunk.after).length - 1
    if (count !== 1) throw new Error(`desfaz-cartoon-tracao-2210: ${rel}: expected exactly 1 candidate match, found ${count}`)
    result = result.replace(hunk.after, hunk.before)
  }
  return crlf ? result.replace(/\n/g, '\r\n') : result
}
