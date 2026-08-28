import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pagePath = path.join(root, 'app', '(dashboard)', 'viral-now', 'page.tsx')
const page = fs.readFileSync(pagePath, 'utf8')

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed += 1
    console.log(`✓ ${name}`)
    return
  }
  failed += 1
  console.error(`✗ ${name}`)
}

check('targets the exact #viralnow query in the title', page.includes("const TITLE = '#ViralNow: 8 YouTube Shorts Ideas to Post Today | Kineo'"))
check('keeps the title concise', '#ViralNow: 8 YouTube Shorts Ideas to Post Today | Kineo'.length <= 60)
check('describes the catalogue as curated', page.includes('curated library'))
check('describes the four-hour behavior as rotation', page.includes('rotated every 4 hours'))
check('does not call the metadata topics live trending data', !/const DESCRIPTION\s*=\s*\n?\s*['"][^'"]*trending/i.test(page))
check('preserves the no-card promise', page.includes('no card required'))
check('preserves the canonical URL', page.includes("const VIRAL_NOW_URL = 'https://www.usekineo.com/viral-now'"))
check('keeps the page indexable', page.includes('robots: { index: true, follow: true }'))
check('names the ItemList for the exact search intent', page.includes("name: '#ViralNow: 8 YouTube Shorts ideas to post today'"))
check('adds the plain-spelling schema alias', page.includes("alternateName: ['Viral Now', 'Viral Now YouTube Shorts ideas']"))
check('reuses the same description in structured data', page.includes('description: DESCRIPTION'))
check('does not add a render intent', !page.includes('create_intent'))
check('does not add pricing or offer literals', !/\$\d|credits?\b|checkout/i.test(page))
check('does not add a Supabase write', !/\.from\(['"][^'"]+['"]\)\s*\.insert|\.from\(['"][^'"]+['"]\)\s*\.update/.test(page))

console.log(`\n${passed}/${passed + failed} checks passed`)
if (failed > 0) process.exit(1)
