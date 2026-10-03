// KINEO-PARTNERS-PACOTE-2026-10-03 (D3) — guardião da copy da /partners que mentia. "Every new account starts free with
// 10 credits and every engine unlocked" era falso: conta grátis não roda Kling/Veo/Studio e os créditos de cadastro
// pagam só o filme Seedance 1.5 curto com marca d'água. O guardião AVALIA a resposta real do FAQ (o template literal do
// fonte, com as constantes reais das libs carregadas de verdade) e exige: números derivados, motor Studio pedindo
// plano, pacote de demonstração do parceiro dito com a verdade do interruptor, e nenhuma menção à cota semanal (não
// anunciada — lib/freeWeeklyFilm.ts, item 4 da E4). Também: o comentário da taxa não diz mais 0.4.
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

// Carregador mínimo de módulos TS da casa (alias @/ e relativos), com troca de fonte para os mutantes.
function makeLoader(overrides = {}) {
  const cache = new Map()
  const resolve = (from, id) => {
    const base = id.startsWith('@/') ? path.join(ROOT, id.slice(2)) : path.resolve(path.dirname(from), id)
    for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) if (fs.existsSync(c)) return c
    throw Error('não resolvi ' + id)
  }
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports
    const rel = path.relative(ROOT, file)
    const src = overrides[rel] ?? read(rel)
    const mod = { exports: {} }
    cache.set(file, mod)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, (id) => {
      if (id.startsWith('@/') || id.startsWith('.')) return load(resolve(file, id))
      throw Error('import externo inesperado ' + id)
    }, { env: {} })
    return mod.exports
  }
  return (rel) => load(path.join(ROOT, rel))
}

function faqAnswer(pageSrc, overrides) {
  const line = pageSrc.split('\n').find((l) => l.includes("q: 'Can I test Kineo first?'"))
  if (!line) return null
  const m = line.match(/a: (`[\s\S]*`) \},\s*$/)
  if (!m) return null
  const req = makeLoader(overrides)
  const offer = req('lib/freeTierOffer.ts')
  const pack = req('lib/partnerPack.ts')
  const policy = req('lib/freeFilmPolicy.ts')
  const scope = { ...offer, ...pack, ...policy }
  return new Function(...Object.keys(scope), `return ${m[1]}`)(...Object.values(scope))
}

function problems(pageSrc, overrides = {}) {
  const p = []
  let a
  try { a = faqAnswer(pageSrc, overrides) } catch (e) { return ['FAQ não avalia: ' + e.message] }
  if (!a) return ['resposta "Can I test Kineo first?" sumiu']
  const req = makeLoader(overrides)
  const offer = req('lib/freeTierOffer.ts')
  const pack = req('lib/partnerPack.ts')
  if (/every engine unlocked|all engines/i.test(a)) p.push('copy volta a prometer "every engine unlocked"')
  if (!a.includes(`${offer.TRIAL_CREDITS_SHOWN} credits`)) p.push('créditos de cadastro não batem com lib/freeTierOffer')
  if (!a.includes(`${offer.TRIAL_FREE_FILM_SECONDS}-second Seedance 1.5`) || !/watermarked/.test(a)) p.push('não diz o que os créditos pagam (Seedance 1.5 curto, com marca)')
  if (!/Kling, Veo and the other Studio engines need a paid plan/.test(a)) p.push('não diz que Kling/Veo pedem plano')
  if (!a.includes(`${pack.PARTNER_PACK_STAGE1_CREDITS} credits`) || !a.includes(`${pack.PARTNER_PACK_DAYS} days`) || !a.includes(`plus ${pack.PARTNER_PACK_STAGE2_CREDITS} more`)) p.push('pacote de demonstração sem os números de lib/partnerPack')
  if (pack.PARTNER_PACK_LIVE ? !/added when you join/.test(a) : (/added when you join/.test(a) || !/Email us after you join/.test(a))) p.push('copy do pacote não segue o interruptor PARTNER_PACK_LIVE')
  if (/week|weekly|semana/i.test(a)) p.push('copy anuncia a cota semanal (não anunciada)')
  if (/commission_rate: 0\.4/.test(pageSrc)) p.push('comentário da taxa ainda diz 0.4')
  return p
}

const PAGE = read('app/partners/page.tsx')
const real = problems(PAGE)
ok(real.length === 0, '/partners diz a verdade sobre o teste grátis e o pacote do parceiro' + (real.length ? ' — ' + real.join(' | ') : ''))

const OLD = "    { q: 'Can I test Kineo first?', a: `Yes. Every new account${FREE_FILM_COUNTRY_CLAUSE} starts free with 10 credits and every engine unlocked, no card. If you need extra demo access for a specific audience or tutorial, email us and we will sort it out with you.` },"
const pageLines = PAGE.split('\n')
const idx = pageLines.findIndex((l) => l.includes("q: 'Can I test Kineo first?'"))
const withLine = (line) => pageLines.map((l, i) => (i === idx ? line : l)).join('\n')
const mutants = [
  ['copy antiga ("every engine unlocked")', () => problems(withLine(OLD))],
  ['copy promete entrega automática com o interruptor desligado', () => problems(PAGE.replace("${PARTNER_PACK_LIVE ? 'The first part is added when you join.' : 'Email us after you join to get it.'}", 'The first part is added when you join.'))],
  ['créditos digitados à mão', () => problems(PAGE.replace('starts free with ${TRIAL_CREDITS_SHOWN} credits', 'starts free with 30 credits'))],
  ['comentário volta a 0.4', () => problems(PAGE.replace('commission_rate: AFFILIATE_COMMISSION_RATE (0.3,', 'commission_rate: 0.4 (0.3,'))],
]
for (const [name, run] of mutants) {
  let caught = false
  try { caught = run().length > 0 } catch { caught = true }
  ok(caught, 'mutante derrubado: ' + name)
}
console.log(`\n${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
