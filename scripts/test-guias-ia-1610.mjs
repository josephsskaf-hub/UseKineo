// KINEO-GUIAS-IA-1610 — guardião das guias /guides/<slug> (texto do GPT de 16/10/2026 conferido contra o código).
// Só readFileSync (sem alias @/, sem rede, sem banco). Cada regra tem um mutante que TEM de ficar vermelho, com prova
// de que o mutante foi aplicado (o texto trocado existe antes e não existe depois).
//
//   R1 nenhum "[CONFIRMAR]" (nem "CONFIRMAR") nos arquivos das guias;
//   R2 cada guia tem título ≤ 60 e descrição ≤ 155 caracteres, e a lista de guias = GUIAS_IA_SLUGS;
//   R3 canonical absoluto na metadata (GUIAS_IA_BASE + guiaIaPath) e FAQPage JSON-LD = FAQ visível;
//   R4 o sitemap importa GUIAS_IA_PATHS e publica cada uma com o lastmod da revisão;
//   R5 nada de número de cliente/avaliação/depoimento inventado nem promessa proibida (nem revisão/ROAS do Automate);
//   R6 nenhum preço/crédito NOSSO digitado no conteúdo (vem de marketingPrice/checkoutPricing/ads); cada linha de
//      concorrente tem URL oficial e a página diz a data da consulta;
//   R7 CTA com utm_source=guide e utm_campaign=<slug> (padrão de SEO da casa).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const F = {
  paths: 'lib/seo/guiasIa1610Paths.ts',
  content: 'lib/growth/guiasIa1610.ts',
  component: 'components/GuiaIaPage.tsx',
  page: 'app/guides/[slug]/page.tsx',
  sitemap: 'app/sitemap.ts',
}
const real = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')]))
const code = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '')

function slugsOf(paths) {
  const block = paths.match(/export const GUIAS_IA_SLUGS = \[([\s\S]*?)\] as const/)
  assert.ok(block, 'GUIAS_IA_SLUGS não encontrado')
  return [...code(block[1]).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1])
}

/** Os blocos de cada guia no conteúdo: de `'<slug>': {` até o próximo `slug:` de outra guia. */
function guidesOf(content) {
  const body = content.slice(content.indexOf('export const GUIAS_IA:'), content.indexOf('export const GUIAS_IA_LIST'))
  const starts = [...body.matchAll(/\n  '([a-z0-9-]+)': \{\n/g)]
  return starts.map((m, i) => ({ key: m[1], text: body.slice(m.index, starts[i + 1]?.index ?? body.length) }))
}
const strField = (text, field) => {
  const m = text.match(new RegExp(`\\n    ${field}: '((?:[^'\\\\]|\\\\.)*)',`))
  return m ? m[1].replace(/\\'/g, "'") : null
}

const BANNED = [
  [/\b\d[\d,.]*\s*\+?\s*(happy\s+)?(customers|users|creators|brands|businesses|clients|reviews|ratings|stars)\b/i, 'contagem de cliente/avaliação'],
  [/★|\b[1-5](\.\d)?\s*\/\s*5\b|\brated\s+[1-5]/i, 'nota inventada'],
  [/trusted by|loved by|customers? (say|love)|testimonial/i, 'prova social/depoimento'],
  [/\bunlimited\b|priority queue|forever storage|guaranteed? (results|sales|views|roas)/i, 'promessa proibida'],
  [/\bbetter than\b|\bbeats\b|\b#1\b/i, 'vencedor universal'],
  [/\brevisions?\b|\bROAS\b|return on ad spend (is )?guaranteed/i, 'Automate: revisão além das edições aprovadas ou ROAS (fundador 16/10)'],
]

function check(files) {
  const fails = []
  const fail = (rule, msg) => fails.push(`${rule}: ${msg}`)
  const slugs = slugsOf(files.paths)
  const guides = guidesOf(files.content)

  // R1
  for (const [k, t] of Object.entries(files)) if (k !== 'sitemap' && /CONFIRMAR/.test(t)) fail('R1', `${F[k]} contém CONFIRMAR`)

  // R2
  if (slugs.length === 0) fail('R2', 'nenhuma guia')
  if (JSON.stringify(guides.map((g) => g.key).sort()) !== JSON.stringify([...slugs].sort())) fail('R2', `guias do conteúdo ≠ GUIAS_IA_SLUGS (${guides.map((g) => g.key)})`)
  for (const g of guides) {
    const title = strField(g.text, 'title'); const description = strField(g.text, 'description')
    if (!title || title.length > 60) fail('R2', `${g.key}: título ausente ou > 60 (${title?.length})`)
    if (!description || description.length > 155) fail('R2', `${g.key}: descrição ausente ou > 155 (${description?.length})`)
    if (!new RegExp(`slug: '${g.key}'`).test(g.text)) fail('R2', `${g.key}: slug interno diferente da chave`)
    if (!/notBest: \[/.test(g.text)) fail('R2', `${g.key}: sem "When Kineo is not the best choice"`)
  }

  // R3
  const comp = code(files.component)
  if (!/const url = `\$\{GUIAS_IA_BASE\}\$\{guiaIaPath\(guide\.slug\)\}`/.test(comp) || !/alternates: \{ canonical: url \}/.test(comp)) fail('R3', 'canonical absoluto ausente')
  if (!/'@type': 'FAQPage'/.test(comp) || !/guide\.faqs\.map\(\(\{ q, a \}\) => \(\{ '@type': 'Question'/.test(comp) || !/guide\.faqs\.map\(\(f\) => <details/.test(comp)) fail('R3', 'FAQPage JSON-LD não espelha a FAQ visível')
  if (!/GUIAS_IA_BASE = 'https:\/\/www\.usekineo\.com'/.test(files.paths)) fail('R3', 'base canônica diferente de https://www.usekineo.com')
  if (!/export const dynamicParams = false/.test(files.page) || !/GUIAS_IA_SLUGS\.map\(\(slug\) => \(\{ slug \}\)\)/.test(files.page)) fail('R3', 'rota não é estática só com as guias')

  // R4
  const sm = code(files.sitemap)
  if (!/import \{[^}]*GUIAS_IA_PATHS[^}]*\} from '@\/lib\/seo\/guiasIa1610Paths'/.test(sm)) fail('R4', 'sitemap não importa GUIAS_IA_PATHS')
  if (!/\.\.\.GUIAS_IA_PATHS\.map\(\(path\) => \(\{\s*url: `\$\{BASE\}\$\{path\}`,\s*lastModified: GUIAS_IA_REVIEWED_ISO,/.test(sm)) fail('R4', 'sitemap não publica as guias com o lastmod da revisão')

  // R5
  const visible = code(files.content)
  for (const [re, what] of BANNED) { const m = visible.match(re); if (m) fail('R5', `${what}: "${m[0]}"`) }

  // R6
  for (const re of [/\$\s?\d+\.90\b/, /\b(60|150|300|500) credits\b/, /\b(34|41|51)[–-](34|41|51)\b/, /\b9 credits\b/, /\b(7|14) days\b/, /\b16 languages\b/i]) {
    const m = visible.match(re); if (m) fail('R6', `número nosso digitado: "${m[0]}"`)
  }
  for (const imp of ["from '@/lib/marketingPrice'", "from '@/lib/checkoutPricing'", "from '@/lib/textLanguage'", "from '@/lib/ads/v2Tiers'"]) if (!files.content.includes(imp)) fail('R6', `conteúdo não lê ${imp}`)
  const rowsBlock = files.content.slice(files.content.indexOf('const R = {'), files.content.indexOf('} as const\nconst kineoRow'))
  const rowLines = rowsBlock.split('\n').filter((l) => /tool: '/.test(l))
  if (rowLines.length === 0) fail('R6', 'sem linhas de concorrente')
  for (const l of rowLines) if (!/source: SRC\.[a-z]+ \}/.test(l)) fail('R6', `linha de concorrente sem fonte: ${l.trim().slice(0, 60)}`)
  for (const [, url] of files.content.matchAll(/^\s+[a-z]+: '(https?:\/\/[^']+)',$/gm)) if (!/^https:\/\/(www\.)?[a-z0-9.-]+\.(com|ai|io)\/pricing\/?$/.test(url)) fail('R6', `fonte fora de página oficial de preço: ${url}`)
  if (!/GUIAS_IA_PRICES_CHECKED_LABEL = 'Public prices checked October 16, 2026, in USD'/.test(files.paths) || !/\{GUIAS_IA_PRICES_CHECKED_LABEL\}/.test(comp)) fail('R6', 'data da consulta de preços ausente na página')

  // R7
  if (!/utmSource: 'guide'/.test(files.content) || !/campaign: guide\.slug/.test(files.content)) fail('R7', 'CTA de filme sem utm_source=guide / campanha = slug')
  if (!/utm_source: 'guide', utm_medium: 'organic', utm_campaign: guide\.slug/.test(files.content)) fail('R7', 'CTA do Studio Ads sem utm_source=guide / utm_campaign = slug')
  if (!/if \(guide\.cta === 'automate'\) return AUTOMATE\.contact/.test(files.content) || !/contact: 'mailto:joseph@usekineo\.com\?subject=/.test(files.content)) fail('R7', 'CTA do Automate não é a conversa por e-mail comercial')
  if (!/href=\{href\} source=\{source\} placement="hero"/.test(comp) || !/placement="closing"/.test(comp)) fail('R7', 'CTA da guia não usa o href calculado')
  return fails
}

// ── Real: verde ──────────────────────────────────────────────────────────────────────────────────────────────────
const realFails = check(real)
assert.deepEqual(realFails, [], `guardião vermelho no código real:\n${realFails.join('\n')}`)
const nGuides = slugsOf(real.paths).length
console.log(`ok — ${nGuides} guias: sem CONFIRMAR, título ≤60, descrição ≤155, canonical, FAQPage, sitemap, sem número inventado, preços nossos importados, CTA com utm`)

// ── Mutantes: cada um TEM de ficar vermelho na regra certa ───────────────────────────────────────────────────────
const firstTitle = strField(guidesOf(real.content)[0].text, 'title')
const firstDesc = strField(guidesOf(real.content)[0].text, 'description')
const MUTANTS = [
  ['R1', 'content', "Do not present invented reviews or experiences as real.", 'Kineo reviews: [CONFIRMAR].'],
  ['R2', 'content', `title: '${firstTitle}'`, `title: '${firstTitle} — and a much longer tail that breaks it'`],
  ['R2', 'content', `description: '${firstDesc}'`, `description: '${firstDesc} Extra words that push the meta description past the limit.'`],
  ['R2', 'paths', "  'multilingual-video-narration', // GPT 18\n", "  'multilingual-video-narration', // GPT 18\n  'ghost-guide',\n"],
  ['R3', 'component', 'alternates: { canonical: url }', 'alternates: {}'],
  ['R3', 'component', "guide.faqs.map(({ q, a }) => ({ '@type': 'Question'", "guide.faqs.slice(1).map(({ q, a }) => ({ '@type': 'Question'"],
  ['R4', 'sitemap', '...GUIAS_IA_PATHS.map((path) => ({', '...[].map((path) => ({'],
  ['R5', 'content', "Do not present invented reviews or experiences as real.", 'Trusted by 2,000 brands, rated 4.9/5.'],
  ['R5', 'content', 'A new voice-over counts as a new ad.`', 'Unlimited revisions included.`'],
  ['R6', 'content', 'price: `${STARTER_MONTH}, monthly`', "price: '$9.90/month, monthly'"],
  ['R6', 'content', "price: '$15/month, monthly', source: SRC.runway }", "price: '$15/month, monthly' }"],
  ['R7', 'content', "utmSource: 'guide'", "utmSource: 'seo'"],
  ['R7', 'content', "utm_source: 'guide', utm_medium: 'organic', utm_campaign: guide.slug", "utm_source: 'guide', utm_medium: 'organic', utm_campaign: 'guides'"],
]
for (const [rule, file, from, to] of MUTANTS) {
  assert.ok(real[file].includes(from), `mutante ${rule} não aplicável: "${from}" não existe em ${F[file]}`)
  const mutated = { ...real, [file]: real[file].replace(from, to) }
  assert.ok(mutated[file].includes(to) && mutated[file] !== real[file], `mutante ${rule} não foi aplicado`)
  const fails = check(mutated)
  assert.ok(fails.some((f) => f.startsWith(`${rule}:`)), `mutante ${rule} ("${to.slice(0, 50)}") ficou VERDE — o guardião não pega o defeito. Falhas: ${fails.join(' | ')}`)
}
console.log(`ok — ${MUTANTS.length} mutantes aplicados, todos vermelhos na regra certa`)
