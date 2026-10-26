// Offline manifest generator; reads immutable Git objects, never env or live data.
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const path = require('node:path')
const BASE = '62213b008292f110117d1abbe20c157efdb55902'
const manifestPath = path.join(__dirname, 'desfaz-vitrine-filmes-2610-hunks.json')
const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const PRODUCT = process.argv[2] || previous.product
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
const hash = text => createHash('sha256').update(text).digest('hex')
const lf = text => text.replace(/\r\n/g, '\n')
// Keep the reviewed product scope: later evidence/test commits are not product.
const scopePaths = [...new Set([...Object.keys(previous.scope), ...process.argv.slice(3).filter(value => value !== '--refresh-test-scope')])]
const status = git('diff', '--name-status', BASE, PRODUCT, '--', ...scopePaths).trim().split('\n').map(line => line.split('\t'))
const scope = {}
for (const [kind, file] of status) {
  const after = lf(git('show', `${PRODUCT}:${file}`))
  if (kind === 'A') {
    scope[file] = { kind: 'new', after, afterSha256: hash(after) }
    continue
  }
  if (kind !== 'M') throw Error('Unsupported source delta ' + kind + ' ' + file)
  const before = lf(git('show', `${BASE}:${file}`))
  const diff = git('diff', '--no-color', '--unified=3', BASE, PRODUCT, '--', file)
  const hunks = []
  let hunk = null, last = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { hunk = { before: '', after: '' }; hunks.push(hunk); continue }
    if (!hunk) continue
    const prefix = line[0], text = line.slice(1)
    if (prefix === ' ' || prefix === '-') hunk.before += text + '\n'
    if (prefix === ' ' || prefix === '+') hunk.after += text + '\n'
    if (prefix === '\\' && last) {
      if (last === ' ' || last === '-') hunk.before = hunk.before.slice(0, -1)
      if (last === ' ' || last === '+') hunk.after = hunk.after.slice(0, -1)
    }
    last = prefix
  }
  for (const hunk of hunks) {
    if (!hunk.before || !hunk.after) throw Error('Empty-context hunk ' + file)
    if (after.split(hunk.after).length !== 2 || before.split(hunk.before).length !== 2) throw Error('Ambiguous hunk ' + file)
  }
  let restored = after
  for (const hunk of hunks) restored = restored.replace(hunk.after, hunk.before)
  if (restored !== before) throw Error('Nonexact reconstruction ' + file)
  scope[file] = { kind: 'modified', beforeSha256: hash(before), afterSha256: hash(after), hunks, hunksSha256: hash(JSON.stringify(hunks)) }
}
// Historical scripts have their own exact table. They are not product scope,
// and neither the projector nor this manifest is included in its own delta.
const refreshTestScope = process.argv.includes('--refresh-test-scope') || !previous.testScope
const testScope = refreshTestScope ? {} : previous.testScope
if (refreshTestScope) for (const file of ['scripts/test-trafego-undo-2310.mjs', 'scripts/test-motores-geo-2026-10-06.mjs']) {
  const before = lf(git('show', `${BASE}:${file}`)), after = lf(fs.readFileSync(file, 'utf8'))
  const diff = git('diff', '--no-color', '--unified=3', BASE, '--', file)
  const hunks = []
  let hunk = null, last = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { hunk = { before: '', after: '' }; hunks.push(hunk); continue }
    if (!hunk) continue
    const prefix = line[0], text = line.slice(1)
    if (prefix === ' ' || prefix === '-') hunk.before += text + '\n'
    if (prefix === ' ' || prefix === '+') hunk.after += text + '\n'
    if (prefix === '\\' && last) {
      if (last === ' ' || last === '-') hunk.before = hunk.before.slice(0, -1)
      if (last === ' ' || last === '+') hunk.after = hunk.after.slice(0, -1)
    }
    last = prefix
  }
  let restored = after
  for (const hunk of hunks) {
    if (!hunk.before || !hunk.after || before.split(hunk.before).length !== 2 || after.split(hunk.after).length !== 2) throw Error('Ambiguous historical hunk ' + file)
    restored = restored.replace(hunk.after, hunk.before)
  }
  if (restored !== before) throw Error('Nonexact historical script reconstruction ' + file)
  testScope[file] = { kind: 'modified', beforeSha256: hash(before), afterSha256: hash(after), hunks, hunksSha256: hash(JSON.stringify(hunks)) }
}
const manifest = { task: 'KINEO-VITRINE-FILMES-2610', base: BASE, product: git('rev-parse', PRODUCT).trim(), scope, testScopeBase: BASE, testScope }
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log('Frozen exact undo for ' + status.length + ' product files and ' + Object.keys(testScope).length + ' historical scripts.')
