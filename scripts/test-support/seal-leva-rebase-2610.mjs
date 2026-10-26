// KINEO-LEVA-REBASE-2610 — run explicitly after review in the complete candidate tree.
// Offline only; no environment file reads. Every inventoried binary/text source is sealed.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const base = '1c078ed013302ac47c42f783305df688c4e97cfd', main = '46fa10e58fced6430e0a2ba7bb445bb8905bd2e7', leva = '07435f57b7e18d4d37c325e57134776d452db382'
const target = 'scripts/test-support/leva-rebase-2610-fontes.json', legacy = 'scripts/test-support/leva-integration-2410-fontes.json'
const inventory = [...new Set([...git('diff', '--name-only', base).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n'), target])].filter(Boolean).sort()
if (inventory.some(file => /(^|\/)\.env(?:\.|$)/.test(file))) throw Error('Environment path in inventory; refused')
if (readFileSync(legacy, 'utf8').replace(/\r\n/g, '\n') !== git('show', leva + ':' + legacy)) throw Error('Original LEVA manifest changed; refused')
const sources = {}
for (const file of inventory) {
  if (file === target) continue
  const bytes = readFileSync(file)
  const value = /\.(?:mjs|cjs|js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|txt|log)$/.test(file) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes
  sources[file] = { hash: createHash('sha256').update(value).digest('hex') }
}
writeFileSync(target, JSON.stringify({ version: 1, base, main, leva, inventory, sources }, null, 2) + '\n')
console.log(`Sealed KINEO-LEVA-REBASE-2610: ${inventory.length} files; ${Object.keys(sources).length} full-source hashes; original LEVA manifest immutable`)
