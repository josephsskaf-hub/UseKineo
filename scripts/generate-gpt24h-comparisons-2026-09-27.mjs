// Offline source extraction: competitor prices/features copied from the approved document, never guessed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { root, escapeHtml } from './gpt24h-offline-support.mjs'
const documentPath = 'docs/growth/CONCORRENTES-ADS-2026-09-26.md'
const source = readFileSync(resolve(root, documentPath), 'utf8')
const sourceRows = source.split(/\r?\n/).filter(line => /^\| (Creatify|Topview|Zeely) \|/.test(line))
const accessWindow = source.match(/acesso em ([^)]+)/)?.[1]
const year = source.match(/\(\d{2}\/\d{2}\/(\d{4})\)/)?.[1]
if (!accessWindow || !year || sourceRows.length !== 3) throw new Error('Approved document shape changed: review the source')
const competitors = sourceRows.map(line => {
  const [name, linkToAd, avatar, variations, formats, brandKit, publishing, analytics, translation, price] = line.split('|').slice(1,-1).map(cell => cell.trim())
  const id = name.toLowerCase()
  const domains = [...source.matchAll(new RegExp(`${id}\\.ai/[^\\s·]+`, 'g'))].map(match => match[0])
  if (!domains.length) throw new Error(`Missing official source for ${name}`)
  return { id, name, slug: `${id}-alternative`, officialUrl: `https://${domains[0]}`, sourceRow: line, linkToAd, avatar, variations, formats, brandKit, publishing, analytics, translation, price }
})
writeFileSync(resolve(root, 'lib/growth/adsCompetitorSnapshot.json'), JSON.stringify({ sourceDocument: documentPath, accessWindow, year, competitors }, null, 2) + '\n')
const sharpRoot = process.argv[process.argv.indexOf('--sharp-root') + 1]
const require = createRequire(resolve(root, 'package.json'))
const sharp = process.argv.includes('--sharp-root') ? createRequire(resolve(sharpRoot, '_entry.cjs'))('sharp') : require('sharp')
mkdirSync(resolve(root,'public/og'), {recursive:true})
for(const c of competitors) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fafaf8"/><g font-family="Arial,Helvetica,sans-serif" fill="#23303b"><text x="80" y="130" font-size="48" font-weight="bold">Kineo</text><text x="80" y="250" font-size="24" fill="#52616e">STUDIO ADS · A DIFFERENT WORKFLOW</text><text x="80" y="355" font-size="64" font-weight="bold">${escapeHtml(c.name)} alternative</text><text x="80" y="445" font-size="28" fill="#52616e">Your materials. A narrated ad. Clear limits.</text><text x="80" y="555" font-size="20" fill="#52616e">Dated comparison · official-source snapshot</text></g></svg>`
  await sharp(Buffer.from(svg)).png().toFile(resolve(root,`public/og/vs-${c.id}.png`))
}
console.log('Generated source-derived competitor snapshot and OG posters')
