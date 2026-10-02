// KINEO-NUVEM-A4-2026-10-02 — card "Kineo Business": o plano Studio para empresas, SEM preço novo, atrás de interruptor.
// Prova: (1) interruptor nasce false e só a casa vê o preview no /ads; (2) nenhum número digitado — preço do Studio,
// créditos, personagens, 3 variações e Espaços vêm das fontes; (3) checkout tier=pro&from=business; (4) aparece nas duas
// portas (/ads e /business-video-ads), nunca por <Link> (prefetch de checkout); (5) mutantes. readFileSync + transpile.
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
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const LIB = read('lib/growth/kineoBusiness.ts')
const ADS = read('app/ads/page.tsx')
const BVA = read('app/business-video-ads/page.tsx')
const PRICING = read('lib/checkoutPricing.ts')
const CHARS = read('lib/characterLimits.ts')
const K = load(LIB)

console.log('1 — interruptor')
ok(K.KINEO_BUSINESS_CARD_LIVE === false && /export const KINEO_BUSINESS_CARD_LIVE = false\n/.test(LIB), 'nasce desligado')
ok(!K.kineoBusinessVisible({}) && !K.kineoBusinessVisible({ preview: 'business' }) && K.kineoBusinessVisible({ internal: true, preview: 'business' }) && !K.kineoBusinessVisible({ internal: true }) && K.kineoBusinessVisible({ live: true }), 'de fora não vê; a casa vê com ?preview=business; ligado, todos')

console.log('2 — números das fontes')
const studioUsd = Number((PRICING.match(/pro:\s*\{\s*usd:\s*(\d+)/) ?? [])[1])
const studioCredits = Number((PRICING.match(/export const TIER_CREDITS[^{]*\{[^}]*pro:\s*(\d+)/) ?? [])[1])
const studioChars = Number((CHARS.match(/if \(p === 'pro' \|\| p === 'pro_trial'\) return (\d+)/) ?? [])[1])
ok(studioUsd === 5490 && studioCredits === 300 && studioChars === 10, `fontes de hoje: Studio ${studioUsd} centavos, ${studioCredits} cr, ${studioChars} personagens`)
const o = K.kineoBusinessOffer({ priceLabel: '$54.90', planName: 'Studio', credits: 300, characters: 10, variationsOpen: true, spacesOpen: true })
ok(o.includes.some((i) => /logo/i.test(i)) && o.includes.some((i) => /3 variations/.test(i)) && o.includes.some((i) => /^Spaces/.test(i)) && o.includes.includes('10 saved characters — the same face in every video') && o.includes.includes('300 credits every month'), 'inclui logo, 3 variações, Espaços, 10 personagens e 300 cr')
ok(/No new plan, no new price/.test(o.planLine) && o.ctaLabel === 'Get Kineo Business · $54.90/mo', 'diz que é o Studio, sem preço novo')
const closed = K.kineoBusinessOffer({ priceLabel: '$54.90', planName: 'Studio', credits: 300, characters: 10, variationsOpen: false, spacesOpen: false })
ok(!closed.includes.some((i) => /3 variations|^Spaces/.test(i)), 'produto fechado não entra na lista')
let threw = false
try { K.kineoBusinessOffer({ priceLabel: '', planName: 'Studio', credits: 0, characters: 10 }) } catch { threw = true }
ok(threw, 'fato faltando = erro, nunca card com número vazio')
ok(!/\d{2}[.,]\d{2}|\b300\b|\b10 saved/.test(LIB.replace(/^\/\/.*$/gm, '').replace(/\/\*\*[^\n]*\*\//g, '').replace(/`\$\{f\.(credits|characters)\}[^`]*`/g, '')), 'nenhum preço/crédito/personagem digitado no módulo')

console.log('3 — checkout')
const href = new URL(K.KINEO_BUSINESS_CHECKOUT_HREF, 'https://x')
ok(href.pathname === '/api/stripe/checkout' && href.searchParams.get('tier') === 'pro' && href.searchParams.get('from') === 'business' && href.searchParams.get('billing') === 'monthly' && /^[A-Za-z0-9._~-]{1,100}$/.test(href.searchParams.get('intent_campaign') ?? ''), 'GET tier=pro&billing=monthly&from=business&intent_campaign válido')

function pageProblems(ads, bva) {
  const p = []
  for (const [name, src] of [['ads', ads], ['business-video-ads', bva]]) {
    if (!/kineoBusinessOffer\(\{\s*priceLabel: formatCheckoutMoney\('usd', getTierPrice\('pro', 'usd', 'standard'\)\),\s*planName: planName\('pro'\),\s*credits: TIER_CREDITS\.pro,\s*characters: characterLimitFor\('pro', true\),\s*variationsOpen: ADS_VARIACOES_PUBLIC,\s*spacesOpen: SPACES_PUBLIC,/.test(src)) p.push(`${name}: fatos fora das fontes`)
    if (!/data-kineo="kineo-business-card"/.test(src)) p.push(`${name}: sem o card`)
  }
  if (!/kineoBusinessVisible\(\{ internal: viewer\.internal, preview: first\(searchParams\?\.preview\) \}\)/.test(ads)) p.push('ads: sem o portão (casa + preview)')
  if (!/const business = KINEO_BUSINESS_CARD_LIVE\n/.test(bva)) p.push('business-video-ads: sem o interruptor')
  if (/<OrganicCtaLink[^>]*business\.href|<Link[^>]*business\.href/.test(bva + ads)) p.push('checkout por <Link> (prefetch)')
  if (!/<AdsCtaLink href=\{business\.href\} cta="plan" tier="pro" from="business"/.test(ads)) p.push('ads: clique sem evento')
  return p
}
console.log('4 — as duas portas')
const pp = pageProblems(ADS, BVA)
ok(pp.length === 0, '/ads e /business-video-ads' + (pp.length ? ': ' + pp.join('; ') : ''))

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('preço digitado', pageProblems(ADS.replace("priceLabel: formatCheckoutMoney('usd', getTierPrice('pro', 'usd', 'standard')),", "priceLabel: '$49.90',"), BVA))
mut('sem interruptor no estático', pageProblems(ADS, BVA.replace('const business = KINEO_BUSINESS_CARD_LIVE\n', 'const business = true\n')))
mut('checkout por Link', pageProblems(ADS, BVA.replace('<a className={styles.buy} href={business.href}>', '<OrganicCtaLink className={styles.buy} href={business.href}>')))
mut('público sem casa', pageProblems(ADS.replace('kineoBusinessVisible({ internal: viewer.internal, preview: first(searchParams?.preview) })', 'true'), BVA))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
