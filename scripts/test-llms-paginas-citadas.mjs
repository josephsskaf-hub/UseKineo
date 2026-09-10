// KINEO-LLMS-PAGINAS-CITADAS-2026-09-07 — guardião do mapa /llms.txt.
//
// O QUE ELE PROVA: cada página de alto alcance acrescentada ao /llms.txt em
// 07/09 (as que um motor de resposta JÁ citava e as que a busca mais traz)
// (a) tem arquivo em app/, (b) está no app/sitemap.ts, (c) está linkada no
// app/llms.txt/route.ts DENTRO de `## Key pages` e (d) a linha diz qual
// pergunta a página responde ("Cite this page for"). Rota morta no llms.txt é
// pior que omissão — por isso (a) e (b) vêm antes de (c).
//
// O QUE ELE NÃO PROMETE: aumento de citação. As citações aconteceram sem o
// arquivo; o que se conserta é o mapa, não a causa.
//
// Lê os arquivos com readFileSync (nunca import com alias `@/` — 72 testes de
// scripts/ morrem no resolver antes da primeira verificação). CRLF normalizado
// na leitura: o checkout do Windows já derrubou regex de duas linhas aqui.

import { existsSync, readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
// Corpo sem comentários: uma rota citada num comentário não é um link.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')

const LLMS_PATH = 'app/llms.txt/route.ts'
const llmsRaw = read(LLMS_PATH)
const llms = stripComments(llmsRaw)
const sitemap = stripComments(read('app/sitemap.ts'))
const nichePage = stripComments(read('app/free-ai-shorts/[niche]/page.tsx'))
const enginePage = stripComments(read('lib/growth/enginePageCatalog.ts'))
const engineIntentRaw = read('lib/growth/engineLandingIntent.ts')
const engineIntent = stripComments(engineIntentRaw)
const policy = stripComments(read('lib/publicSurfacePolicy.ts'))

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) { pass++; return }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── a seção ────────────────────────────────────────────────────────────────
const keyPages = llms.match(/## Key pages\n[\s\S]*?(?=\n## )/)
check('a seção "## Key pages" do llms.txt é legível', Boolean(keyPages))
const keyPagesBody = keyPages ? keyPages[0] : ''
const afterTheFilm = llms.match(/## What happens after a video is finished[\s\S]*?(?=\n## )/)
check('a seção "after a video is finished" é legível', Boolean(afterTheFilm))
const afterBody = afterTheFilm ? afterTheFilm[0] : ''

// Uma linha de link do llms.txt cujo destino é exatamente `${BASE}<route>`.
const linkLineFor = (routeExpr) => {
  const re = new RegExp(`^- \\[[^\\]]+\\]\\(\\$\\{BASE\\}${esc(routeExpr)}\\):`, 'm')
  const m = keyPagesBody.match(re)
  if (!m) return null
  const start = keyPagesBody.indexOf(m[0])
  const end = keyPagesBody.indexOf('\n', start)
  return keyPagesBody.slice(start, end === -1 ? undefined : end)
}

const lineChecks = (route, line) => {
  check(`${route}: linkado em "## Key pages" do llms.txt`, Boolean(line))
  if (!line) return
  check(`${route}: a linha diz qual pergunta responde ("Cite this page for")`, /Cite this page for "/.test(line))
  const price = line.match(/\$\s?\d[\d.,]*/)
  check(`${route}: nenhum preço em dólar digitado na linha`, !price, price ? `achado "${price[0]}"` : undefined)
  const credits = line.match(/\b\d+\s*credits?\b/i)
  check(`${route}: nenhum "N credits" digitado na linha`, !credits, credits ? `achado "${credits[0]}"` : undefined)
  check(`${route}: NÃO está na seção "after a video is finished" (guardião irmão proíbe linha solta ali)`, !afterBody.includes(route))
}

// ── 1. páginas estáticas ───────────────────────────────────────────────────
const STATIC_ROUTES = [
  '/free-ai-shorts-generator',
  '/state-of-ai-shorts-2026',
  '/text-to-video-shorts',
  '/best-ai-shorts-generators',
  '/how-much-do-youtube-shorts-pay',
  '/can-you-monetize-ai-videos',
  '/tiktok-vs-youtube-shorts-monetization',
  // KINEO-PASTE-PAGE-2026-09-07 — /chatgpt entrou em produção respondendo 200
  // e ficou fora do sitemap E do llms.txt. Entra na MESMA lista das outras para
  // herdar as cinco verificações de uma vez (arquivo em app/, entrada no
  // sitemap, linha em "## Key pages", "Cite this page for", zero preço/crédito
  // digitado). É a terceira reincidência do erro "peça sem superfície"; a lista
  // é o lugar onde a reincidência passa a custar um teste vermelho.
  '/chatgpt',
]
for (const route of STATIC_ROUTES) {
  check(`${route}: existe app${route}/page.tsx`, existsSync(`app${route}/page.tsx`))
  check(
    `${route}: está no array routes[] do sitemap`,
    new RegExp(`\\{\\s*path:\\s*'${esc(route)}'\\s*,\\s*priority:\\s*[\\d.]+`).test(sitemap),
  )
  lineChecks(route, linkLineFor(route))
}

// ── 2. página de nicho (rota dinâmica /free-ai-shorts/[niche]) ─────────────
{
  const route = '/free-ai-shorts/horror'
  check(`${route}: existe app/free-ai-shorts/[niche]/page.tsx`, existsSync('app/free-ai-shorts/[niche]/page.tsx'))
  check(`${route}: "horror" é chave de NICHES na página de nicho`, /\n\s*horror:\s*\{/.test(nichePage))
  check(`${route}: NICHE_SLUGS nasce das chaves de NICHES`, /export const NICHE_SLUGS = Object\.keys\(NICHES\)/.test(nichePage))
  check(
    `${route}: o sitemap percorre NICHE_SLUGS para /free-ai-shorts/\${slug}`,
    /NICHE_SLUGS\.map\(\(slug\)\s*=>\s*\(\{\s*url:\s*`\$\{BASE\}\/free-ai-shorts\/\$\{slug\}`/.test(sitemap),
  )
  lineChecks(route, linkLineFor(route))
}

// ── 3. páginas de motor (rota dinâmica /ai-video-generator/[engine]) ───────
// O path NÃO é digitado no llms.txt: vem de engineLandingPublicPath(param), a
// mesma derivação de ENGINE_FACTS[].url. A prova é encadeada: import puro →
// mapa param→path → chave em ENGINES → laço do sitemap.
check(
  'llms.txt importa engineLandingPublicPath de @/lib/growth/engineLandingIntent',
  /import\s*\{\s*engineLandingPublicPath\s*\}\s*from\s*'@\/lib\/growth\/engineLandingIntent'/.test(llms),
)
check(
  'lib/growth/engineLandingIntent.ts é módulo puro (sem import — a rota é force-static)',
  !/^import\s/m.test(engineIntent),
)
check(
  'o sitemap percorre ENGINE_SLUGS para /ai-video-generator/${slug}',
  /for \(const slug of ENGINE_SLUGS\)\s*\{\s*routes\.push\(\{\s*path:\s*`\/ai-video-generator\/\$\{slug\}`/.test(sitemap),
)
check('ENGINE_SLUGS nasce das chaves de ENGINES', /export const ENGINE_SLUGS = Object\.keys\(ENGINES\)/.test(enginePage))

const ENGINE_ROUTES = [
  { param: 'fast', slug: 'kineo-1', label: 'Kineo 1' },
  { param: 'seedance', slug: 'seedance', label: 'Seedance 1.5' },
]
for (const e of ENGINE_ROUTES) {
  const route = `/ai-video-generator/${e.slug}`
  const mapped = engineIntent.match(new RegExp(`\\n\\s*${e.param}:\\s*'([^']+)'`, 'g')) || []
  check(
    `${route}: ENGINE_LANDING_PUBLIC_PATHS mapeia '${e.param}' para '${route}'`,
    mapped.some((m) => m.includes(`'${route}'`)),
    mapped.length ? `achado ${mapped.map((m) => m.trim()).join(' | ')}` : 'chave ausente',
  )
  check(
    `${route}: '${e.slug}' é chave de ENGINES na página de motor`,
    new RegExp(`\\n\\s*'?${esc(e.slug)}'?:\\s*\\{`).test(enginePage),
  )
  const line = linkLineFor(`\${engineLandingPublicPath('${e.param}')}`)
  lineChecks(route, line)
  if (line) check(`${route}: a linha nomeia o motor "${e.label}"`, line.includes(e.label))
  check(`${route}: o path literal NÃO está digitado no llms.txt`, !llms.includes(route))
}

// ── 4. recusa deliberada: /scripts só existe com a flag ligada ─────────────
const flagOn = /CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = true\b/.test(policy)
if (!flagOn) {
  check(
    '/scripts: com CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED desligado, o llms.txt NÃO linka a página (hoje é 404)',
    !/\$\{BASE\}\/scripts\b/.test(llms),
  )
} else {
  pass++ // a flag virou: a recusa deixa de valer, e a decisão de listar é humana.
}

// ── 5. a seção "after a video is finished" continua intacta ────────────────
// O guardião irmão (test-after-the-film-facts.mjs) proíbe prosa digitada ali;
// este só confirma que nenhuma rota nova foi parar dentro dela.
check(
  'nenhuma rota nova entrou na seção "after a video is finished"',
  ![...STATIC_ROUTES, '/free-ai-shorts/horror', 'engineLandingPublicPath'].some((r) => afterBody.includes(r)),
)

// ── resultado ──────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES) em ${LLMS_PATH}:\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
console.log(`✅ test-llms-paginas-citadas: ${pass} verificações passaram.`)
