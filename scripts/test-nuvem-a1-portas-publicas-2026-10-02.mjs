// KINEO-NUVEM-A1-2026-10-02 — as três portas públicas indexáveis (Spaces, Clips, anúncio com atriz de IA/mascote).
// Prova: (1) cada página existe FORA de (dashboard) (aquele layout força noindex) e é estática; (2) o caminho canônico é
// o do catálogo que alimenta sitemap/rodapé/llms/facts (lib/growth/productLandingPages.ts); (3) nenhum preço digitado:
// os números vêm de clipCreditCost / offeredSecondsFor / PRODUCAO_* / SHOWCASE_MEDIA; (4) a tabela do Clips só lista
// motor que o cliente pode apertar; (5) o botão da atriz nunca aponta para porta fechada; (6) mutantes.
// readFileSync + transpile (módulos puros executados).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src, stubs = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { if (p in stubs) return stubs[p]; throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const PAGES = { spaces: 'app/ai-virtual-staging-video/page.tsx', clips: 'app/ai-video-clip-generator/page.tsx', actorAds: 'app/ai-actor-ads/page.tsx' }
const SRC = Object.fromEntries(Object.entries(PAGES).map(([k, f]) => [k, read(f)]))
const CATALOG = load(read('lib/growth/productLandingPages.ts'))
const CAT = load(read('lib/clips/clipCatalog.ts'))
const PRICING = load(read('lib/clips/clipPricing.ts'), { './clipCatalog': CAT })
const PROD = load(read('lib/ads/producao.ts'))
const SITEMAP = read('app/sitemap.ts')

console.log('1 — fora de (dashboard), estáticas, canônico = catálogo')
for (const [key, file] of Object.entries(PAGES)) {
  const src = SRC[key]
  const want = CATALOG.productLandingPath(key)
  ok(!file.includes('(dashboard)') && file === `app${want}/page.tsx`, `${key}: ${file} mora no caminho do catálogo (${want})`)
  ok(/export const dynamic = 'force-static'/.test(src) && new RegExp(`const [A-Z_]+_DOOR_PATH = '${want.replace(/\//g, '\\/')}'`).test(src) && /alternates: \{ canonical: [A-Z_]+_DOOR_PATH \}/.test(src), `${key}: estática e canônica`)
  ok(!/^export const (?!dynamic|metadata)/m.test(src), `${key}: só exports que o Next aceita numa página`)
  ok(/<ProductDoor product=/.test(src), `${key}: usa a moldura pública`)
}
ok(/PRODUCT_LANDING_PAGES/.test(SITEMAP), 'o sitemap lê o catálogo das portas')

function spacesProblems(src) {
  const p = []
  if (!/const PHOTO_CREDITS = PRODUCAO_IMAGE_CREDITS/.test(src) || !/const CLIP_CREDITS = clipCreditCost\('kling', 5\)/.test(src)) p.push('preço do Espaços fora das fontes')
  if (!/SHOWCASE_MEDIA\.spaces/.test(src)) p.push('pares antes→depois fora da vitrine da casa')
  if (/\b\d+ credits\b/.test(src.replace(/\{[^}]*\}/g, ''))) p.push('crédito digitado no texto')
  if (!/illustration made with AI/.test(src)) p.push('sem o selo honesto')
  if (!/START_HREF = '\/signup\?redirect=%2Fspaces'/.test(src)) p.push('botão não leva ao /spaces passando pelo cadastro')
  return p
}
console.log('2 — Spaces')
const sp = spacesProblems(SRC.spaces)
ok(sp.length === 0, 'Spaces' + (sp.length ? ': ' + sp.join('; ') : ''))

function clipsProblems(src) {
  const p = []
  if (!/enginePaused\(key\) === null && \(key !== 's25' \|\| S25_PUBLIC\)/.test(src)) p.push('lista motor pausado ou não lançado')
  if (!/prices: seconds\.map\(\(s\) => \(\{ s, credits: clipCreditCost\(key, s\) \}\)\)/.test(src) || !/const seconds = offeredSecondsFor\(key\)/.test(src)) p.push('tabela fora de clipCreditCost × offeredSecondsFor')
  if (/\b\d+ (credits|cr)\b/.test(src.replace(/\{[^}]*\}/g, ''))) p.push('crédito digitado no texto')
  return p
}
console.log('3 — Clips')
const cp = clipsProblems(SRC.clips)
ok(cp.length === 0, 'Clips' + (cp.length ? ': ' + cp.join('; ') : ''))
// Executado: a tabela que a página monta hoje.
const open = CAT.CLIP_ENGINE_ORDER.filter((k) => !['omni', 's25'].includes(k))
const table = open.map((k) => ({ k, prices: CAT.offeredSecondsFor(k).map((s) => PRICING.clipCreditCost(k, s)) }))
ok(table.length >= 4 && table.every((r) => r.prices.length > 0 && r.prices.every((c) => Number.isInteger(c) && c >= PRICING.CLIP_MIN_CREDITS)), `tabela de hoje: ${table.map((r) => `${r.k} ${r.prices.join('/')}`).join(' · ')}`)

function actorProblems(src) {
  const p = []
  if (!/const open = PRODUCAO_PUBLIC/.test(src)) p.push('o botão não lê o interruptor da Produção')
  if (!/\{open \? \(\s*<a href=\{PRODUCAO_HREF\}/.test(src) || !/: \(\s*<a href=\{DFY_HREF\}/.test(src)) p.push('botão aponta para porta fechada')
  if (!/PRODUCAO_TALK_ENGINES\.map\(/.test(src) || !/PRODUCAO_MONTAGE_CHARGE_LIVE \? `\$\{PRODUCAO_MONTAGE_CREDITS\} credits` : 'Included'/.test(src)) p.push('preços fora da Produção')
  if (!/Don&apos;t present an AI actor as a real customer/.test(src)) p.push('sem o aviso de que o ator de IA não é cliente real')
  if (!/SHOWCASE_MEDIA\.ads/.test(src) || !/Not a customer result/.test(src)) p.push('vídeos fora da vitrine da casa ou sem o aviso')
  if (/\b\d+ credits\b/.test(src.replace(/\{[^}]*\}/g, '').replace(/`[^`]*`/g, ''))) p.push('crédito digitado no texto')
  return p
}
console.log('4 — atriz de IA / mascote')
const ap = actorProblems(SRC.actorAds)
ok(ap.length === 0, 'anúncio com atriz/mascote' + (ap.length ? ': ' + ap.join('; ') : ''))
ok(PROD.PRODUCAO_PUBLIC === false, 'hoje a Produção está fechada → o botão vai para Kineo Empresas')
for (const v of [1, 2, 3]) ok(fs.existsSync(path.join(ROOT, `public/previews/promo-ads-3var-${v}.mp4`)) && fs.existsSync(path.join(ROOT, `public/posters/spaces-demo-${v}-antes.webp`)), `mídia da casa ${v} existe em public/`)

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('Espaços com preço digitado', spacesProblems(SRC.spaces.replace("const CLIP_CREDITS = clipCreditCost('kling', 5)", 'const CLIP_CREDITS = 5')))
mut('Clips com Omni pausado', clipsProblems(SRC.clips.replace("enginePaused(key) === null && (key !== 's25' || S25_PUBLIC)", "key !== 's25'")))
mut('atriz sempre na Produção', actorProblems(SRC.actorAds.replace('const open = PRODUCAO_PUBLIC', 'const open = true')))
mut('atriz sem aviso', actorProblems(SRC.actorAds.replace("Don&apos;t present an AI actor as a real customer", 'Use it freely')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
