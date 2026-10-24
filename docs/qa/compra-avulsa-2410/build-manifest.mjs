// KINEO-COMPRA-AVULSA-2410 — manually capture only this task's reverse delta against its immutable base.
// Does not modify or recapture any historical manifest. Never called by CI/tests.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const BASE = '7950e41134dd03388e67c131501d3e2bce61a3eb'
const TARGET = 'scripts/test-support/desfaz-compra-avulsa-2410-fontes.json'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
const lf = text => text.replace(/\r\n/g, '\n')
const hash = text => createHash('sha256').update(text).digest('hex')
const lines = text => text.match(/[^\n]*\n|[^\n]+$/g) ?? []
const paths = new Set([...git('diff', '--name-only', '-z', BASE).split('\0'), ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'), TARGET])
paths.delete('')
const manifest = { base: BASE, sources: {}, newFiles: [], artifacts: [] }
for (const file of [...paths].sort()) {
  if (file.startsWith('docs/')) { manifest.artifacts.push(file); continue }
  if (spawnSync('git', ['cat-file', '-e', BASE + ':' + file], { windowsHide: true }).status !== 0) { manifest.newFiles.push(file); continue }
  const before = lf(git('show', BASE + ':' + file)), after = lf(readFileSync(file, 'utf8'))
  if (before === after) continue
  const oldLines = lines(before), newLines = lines(after), changes = []
  const diff = git('diff', '--no-ext-diff', '--no-color', '--unified=2', BASE, '--', file)
  for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    const a = Number(m[1]), ac = Number(m[2] ?? 1), b = Number(m[3]), bc = Number(m[4] ?? 1)
    const oldPart = oldLines.slice(a - 1, a - 1 + ac).join(''), newPart = newLines.slice(b - 1, b - 1 + bc).join('')
    if (!newPart || after.split(newPart).length !== 2) throw new Error('Nonunique reverse hunk: ' + file)
    changes.push({ before: oldPart, after: newPart })
  }
  let restored = after
  for (const change of [...changes].reverse()) restored = restored.replace(change.after, change.before)
  if (restored !== before) throw new Error('Reverse delta differs from immutable base: ' + file)
  manifest.sources[file] = { beforeHash: hash(before), afterHash: hash(after), changes }
}
writeFileSync(TARGET, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Captured exact delta: ${Object.keys(manifest.sources).length} existing sources, ${manifest.newFiles.length} new files, ${manifest.artifacts.length} artifacts; base ${BASE}`)
