// KINEO-LEVA-2410 — explicit, offline sealing command after reviewed integration fixes.
// Reads only named tracked task sources and git objects; never environment files.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const base = '1c078ed013302ac47c42f783305df688c4e97cfd', head = '68c65670'
const layers = {
  cards: { base, original: '3ec6c9d9', before: base, after: '3ec6c9d9' },
  sample: { base, original: '17afd045d', before: '618bed34', after: 'cfd30692' },
  presenters: { base, original: '3a4db3096', before: 'cfd30692', after: '418971fd' },
  purchase: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: '51b6431ce', before: '418971fd', after: '68c65670' },
  cartoon: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: 'c91476688', before: '3ec6c9d9', after: '618bed34' },
  languages: { base: '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405', original: '7950e41134dd03388e67c131501d3e2bce61a3eb' },
}
for (const layer of Object.values(layers)) if (layer.after) layer.files = git('diff', '--name-only', '--diff-filter=M', layer.before, layer.after).trim().split('\n').filter(Boolean)
const target = 'scripts/test-support/leva-integration-2410-fontes.json'
const inventory = [...new Set([...git('diff', '--name-only', base).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n'), target])].filter(Boolean).sort()
if (inventory.some(file => /(^|\/)\.env(?:\.|$)/.test(file))) throw Error('Environment path in inventory; refused')
const sources = {}
for (const file of inventory) {
  if (file === target) continue // No self-hash: the guardian checks its exact schema and immutable prefix refs.
  // Binary assets remain inventoried; original task guards inspect their actual bytes.
  if (!/\.(?:mjs|cjs|js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|txt|log)$/.test(file)) continue
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  sources[file] = { hash: crypto.createHash('sha256').update(source).digest('hex') }
}
fs.writeFileSync(target, JSON.stringify({ base, head, layers, inventory, sources }, null, 2) + '\n')
console.log(`Sealed KINEO-LEVA-2410: ${inventory.length} inventoried files; ${Object.keys(sources).length} exact text hashes; no environment or network access`)
