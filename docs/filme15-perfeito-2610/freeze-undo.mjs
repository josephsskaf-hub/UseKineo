// Freeze reviewed task deltas. Run after final implementation/report edits; review the output.
// Reads only changed repository sources; no environment files, credentials or network.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BASE = 'b0d4e093ace5b6efb7069b70a58f97ce5e9d9e9d'
const MANIFEST = 'scripts/test-support/desfaz-filme15-perfeito-2610-fontes.json'
const lf = s => s.replace(/\r\n/g, '\n')
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const git = (...args) => lf(execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 }))
const files = [...new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')])]
  .filter(file => file && file !== MANIFEST && !file.endsWith('.tsbuildinfo') && !file.startsWith('node_modules/')).sort()
function freeze(file, before, after) {
  const diff = git('diff', '--no-ext-diff', '--unified=8', BASE, '--', file)
  const hunks = []; let current = null, previous = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@ ')) { current = { before: '', after: '' }; hunks.push(current); continue }
    if (!current) continue
    const kind = line[0]
    if (kind === ' ' || kind === '-') current.before += line.slice(1) + '\n'
    if (kind === ' ' || kind === '+') current.after += line.slice(1) + '\n'
    if (line.startsWith('\\ No newline')) {
      if (previous === ' ' || previous === '-') current.before = current.before.slice(0, -1)
      if (previous === ' ' || previous === '+') current.after = current.after.slice(0, -1)
    }
    previous = kind
  }
  if (!hunks.length || hunks.some(h => !h.before || !h.after || before.split(h.before).length !== 2 || after.split(h.after).length !== 2)) return [{ before, after }]
  return hunks
}
const manifest = { task: 'KINEO-FILME15-PERFEITO-2610', base: BASE, manifestPath: MANIFEST, scope: {}, addedSources: {} }
for (const file of files) {
  if (file.split(/[\\/]/).some(part => part.startsWith('.env'))) throw Error('Refusing environment file')
  const after = lf(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  if (git('ls-tree', '--name-only', BASE, '--', file).trim() !== file) { manifest.addedSources[file] = hash(after); continue }
  const before = git('show', BASE + ':' + file)
  const hunks = freeze(file, before, after)
  manifest.scope[file] = { beforeSha256: hash(before), afterSha256: hash(after), hunksSha256: hash(JSON.stringify(hunks)), hunks }
}
fs.writeFileSync(path.join(ROOT, MANIFEST), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ base: BASE, changedSources: Object.keys(manifest.scope).length, newSources: Object.keys(manifest.addedSources).length, output: MANIFEST }))
