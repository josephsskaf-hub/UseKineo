// KINEO-VITRINE-FILMES-2610 — exact task-only projection, in memory.
// Existing files preserve unrelated bytes. New files are removed only when
// their complete frozen content matches; modifications cause a hard refusal.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const VITRINE_2610_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-vitrine-filmes-2610-hunks.json', import.meta.url), 'utf8'))
export const VITRINE_2610_BASE = VITRINE_2610_MANIFEST.base
// Exact integration adapters; frozen original product/testScope remain unchanged.
export const VITRINE_2610_GUARDIAN_ADAPTERS = {
  "base": "237b14fb186655e448e9d2e5e80b5b904a8e9863",
  "product": "2b13479b8d131afaee439a4719a1428916d5aa7e",
  "scope": {
    "scripts/test-admin-leve-undo-2310.mjs": {
      "kind": "edit",
      "beforeSha256": "1a1581ec553a67d39442bbc2f2cc4be5c7f7455420397ba29d26c8cb1ab88655",
      "afterSha256": "9f00fb0222a85d9c3761e503f4045f59951041308e91e86bb0c3ffcdc0349c9e",
      "hunks": [
        {
          "before": "import { execFileSync } from 'node:child_process'\nimport { semAdsCenaTexto2310 } from './test-support/desfaz-ads-cena-texto-2310.mjs' // KINEO-ADS-CENA-TEXTO-2310\nimport { semAdminLeve2310, ADMIN_LEVE_2310_BASE, ADMIN_LEVE_2310_HUNKS, ADMIN_LEVE_2310_NEW_PRODUCT_FILES } from './test-support/desfaz-admin-leve-2310.mjs'\n\nconst ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))\nconst MARK = 'KINEO-ADMIN-LEVE-2310'\nconst read = (file) => semAdsCenaTexto2310(fs.readFileSync(path.join(ROOT, file), 'utf8'), file) // KINEO-ADS-CENA-TEXTO-2310 — historical mutantes still receive every original Admin hunk.\nconst lf = (s) => s.replace(/\\r\\n/g, '\\n')\nconst git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })\nlet passed = 0\n",
          "after": "import { execFileSync } from 'node:child_process'\nimport { semAdsCenaTexto2310 } from './test-support/desfaz-ads-cena-texto-2310.mjs' // KINEO-ADS-CENA-TEXTO-2310\nimport { semAdminLeve2310, ADMIN_LEVE_2310_BASE, ADMIN_LEVE_2310_HUNKS, ADMIN_LEVE_2310_NEW_PRODUCT_FILES } from './test-support/desfaz-admin-leve-2310.mjs'\nimport { semVitrine2610 } from './test-support/desfaz-vitrine-filmes-2610.mjs' // KINEO-VITRINE-FILMES-2610 — project the exact later adapter layer before the unchanged Admin source and tamper proofs.\n\nconst ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))\nconst MARK = 'KINEO-ADMIN-LEVE-2310'\nconst read = (file) => semAdsCenaTexto2310(semVitrine2610(fs.readFileSync(path.join(ROOT, file), 'utf8'), file), file) // KINEO-ADS-CENA-TEXTO-2310 — historical mutantes still receive every original Admin hunk.\nconst lf = (s) => s.replace(/\\r\\n/g, '\\n')\nconst git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })\nlet passed = 0\n"
        }
      ],
      "hunksSha256": "105d6bd08a0b53ef293c936d67fc3fd4dccdba98df8849c5f0c1678debad144c"
    },
    "scripts/test-idiomas-formatos-undo-2410.mjs": {
      "kind": "edit",
      "beforeSha256": "a9e6713a7f89ff42288fa49849c24c10eb4a90020b1423b2c7d1f164cfbff3ac",
      "afterSha256": "244a094670398719c03619b7a055ad424d61eb120dc8f98540b740736ba268be",
      "hunks": [
        {
          "before": "import { semVideoFiel2610 } from './test-support/desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: before immutable afterHash comparison.\nimport { semCardsGiro2410, CARDS_GIRO_2410_MANIFEST as cardsGiro } from './test-support/desfaz-cards-giro-2410.mjs' // KINEO-CARDS-GIRO-2410 — preserve the original exact hashes and inventory below.\nimport { semIdiomasFormatos2410 as undo, IDIOMAS_FORMATOS_2410_BASE as BASE, IDIOMAS_FORMATOS_2410_MANIFEST as manifest } from './test-support/desfaz-idiomas-formatos-2410.mjs'\n\nconst INTEGRATION_BASE = '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405'\nconst PREVIOUS = 'b01cfe2cb2d9f244df0ee22baa649daa8d6103fe'\n",
          "after": "import { semVideoFiel2610 } from './test-support/desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: before immutable afterHash comparison.\nimport { semCardsGiro2410, CARDS_GIRO_2410_MANIFEST as cardsGiro } from './test-support/desfaz-cards-giro-2410.mjs' // KINEO-CARDS-GIRO-2410 — preserve the original exact hashes and inventory below.\nimport { semIdiomasFormatos2410 as undo, IDIOMAS_FORMATOS_2410_BASE as BASE, IDIOMAS_FORMATOS_2410_MANIFEST as manifest } from './test-support/desfaz-idiomas-formatos-2410.mjs'\nimport { semVitrine2610 } from './test-support/desfaz-vitrine-filmes-2610.mjs' // KINEO-VITRINE-FILMES-2610 — remove only the frozen later product/test delta before the unchanged complete-source hashes.\n\nconst INTEGRATION_BASE = '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405'\nconst PREVIOUS = 'b01cfe2cb2d9f244df0ee22baa649daa8d6103fe'\n"
        },
        {
          "before": "assert.deepEqual(Object.entries(manifest.sources).filter(([, item]) => Object.hasOwn(item, 'sourceBase')).map(([file]) => file), [UPSTREAM_READER], 'only the new upstream reader has its own source base')\nfor (const [file, item] of Object.entries(manifest.sources)) {\n  const sourceBase = item.sourceBase ?? BASE\n  const raw = semCardsGiro2410(semVideoFiel2610(readFileSync(file, 'utf8'), file), file), current = lf(raw), originalBase = git('show', sourceBase + ':' + file) // KINEO-CARDS-GIRO-2410\n  const integratedBase = git('show', INTEGRATION_BASE + ':' + file)\n  assert.equal(item.before, originalBase, 'before bytes come from their immutable source base: ' + file)\n  assert.equal(item.beforeHash, hash(originalBase), 'immutable before hash: ' + file)\n",
          "after": "assert.deepEqual(Object.entries(manifest.sources).filter(([, item]) => Object.hasOwn(item, 'sourceBase')).map(([file]) => file), [UPSTREAM_READER], 'only the new upstream reader has its own source base')\nfor (const [file, item] of Object.entries(manifest.sources)) {\n  const sourceBase = item.sourceBase ?? BASE\n  const raw = semCardsGiro2410(semVideoFiel2610(semVitrine2610(readFileSync(file, 'utf8'), file), file), file), current = lf(raw), originalBase = git('show', sourceBase + ':' + file) // KINEO-CARDS-GIRO-2410\n  const integratedBase = git('show', INTEGRATION_BASE + ':' + file)\n  assert.equal(item.before, originalBase, 'before bytes come from their immutable source base: ' + file)\n  assert.equal(item.beforeHash, hash(originalBase), 'immutable before hash: ' + file)\n"
        }
      ],
      "hunksSha256": "2d5a3768e6054a85364f7466452d558edc285744e7b94f17a78fd533207b018d"
    }
  }
}

const hash = value => createHash('sha256').update(value).digest('hex')
const flat = value => value.replace(/\r\n/g, '\n')
const positions = (text, needle) => {
  const matches = []
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) matches.push(at)
  return matches
}

export function semVitrine2610(source, file) {
  const relative = typeof file === 'string' ? file.replace(/\\/g, '/') : file
  const entry = VITRINE_2610_MANIFEST.scope[relative] ?? VITRINE_2610_MANIFEST.testScope?.[relative] ?? VITRINE_2610_GUARDIAN_ADAPTERS.scope[relative]
  if (!entry || source === null) return source
  if (typeof source !== 'string') throw Error('VITRINE-2610: source must be string or null: ' + relative)
  const text = flat(source)
  if (entry.kind === 'new') {
    if (hash(entry.after) !== entry.afterSha256) throw Error('VITRINE-2610: divergent manifest: ' + relative)
    if (hash(text) !== entry.afterSha256) throw Error('VITRINE-2610: modified new file; refusing deletion: ' + relative)
    return null
  }
  if (hash(JSON.stringify(entry.hunks)) !== entry.hunksSha256) throw Error('VITRINE-2610: divergent manifest: ' + relative)
  if (hash(text) === entry.beforeSha256) return source
  const candidates = entry.hunks.map(hunk => positions(text, hunk.after))
  // A base file with unrelated edits is already undone. Partial, corrupted or
  // duplicated task hunks are rejected, never erased by a broad text regex.
  if (candidates.every(matches => matches.length === 0)
      && entry.hunks.every(hunk => positions(text, hunk.before).length === 1)) return source
  const rawOffset = position => {
    let raw = 0
    for (let at = 0; at < position; at++) raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1
    return raw
  }
  const replacements = entry.hunks.map((hunk, index) => {
    const matches = candidates[index]
    if (matches.length !== 1) throw Error(`VITRINE-2610: ${relative} hunk ${index}: expected exactly 1 candidate match, found ${matches.length}`)
    const start = rawOffset(matches[0]), end = rawOffset(matches[0] + hunk.after.length)
    const replacement = source.slice(start, end).includes('\r\n') ? hunk.before.replace(/\n/g, '\r\n') : hunk.before
    return { start, end, replacement }
  }).sort((a, b) => b.start - a.start)
  for (let index = 1; index < replacements.length; index++) if (replacements[index].end > replacements[index - 1].start) throw Error('VITRINE-2610: overlapping hunks')
  let result = source
  for (const item of replacements) result = result.slice(0, item.start) + item.replacement + result.slice(item.end)
  return result
}
