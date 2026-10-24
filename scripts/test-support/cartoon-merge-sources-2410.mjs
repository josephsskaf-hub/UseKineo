// KINEO-CARTOON-JUNTAR-2410 — exact integration hunks, before unchanged historical assertions.
// Product behavior is exercised against raw current files. This leaf projects only declared
// contextual integration hunks; unrelated edits survive and remain visible to the old hashes.
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('./cartoon-merge-sources-2410.json', import.meta.url), 'utf8'))
export const CARTOON_MERGE_MAIN_2410 = '1c078ed013302ac47c42f783305df688c4e97cfd'
export function cartoonMergeSource2410(text, file, target = 'main') {
  const relative = String(file ?? '').replace(/\\/g, '/')
  const hunks = manifest.targets[target]?.files[relative]
  if (typeof text !== 'string' || !hunks?.length) return text
  const crlf = text.includes('\r\n'), normalized = text.replace(/\r\n/g, '\n')
  // Historical sources and their mutants can re-enter the chain. A projection applies
  // only when every current contextual hunk occurs exactly once, never a partial undo.
  if (!hunks.every(h => h.after && normalized.split(h.after).length === 2)) return text
  let restored = normalized
  for (const hunk of hunks) restored = restored.replace(hunk.after, () => hunk.before)
  return crlf ? restored.replace(/\n/g, '\r\n') : restored
}
