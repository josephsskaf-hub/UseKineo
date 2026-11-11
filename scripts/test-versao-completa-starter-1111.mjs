// KINEO-VERSAO-COMPLETA-STARTER-1111 — guardião da "versão completa do seu filme" no STARTER (decisão do fundador; interruptor
// próprio em lib/growth/filmComplete.ts). Prova: (1) o interruptor decide o plano do botão e volta ao Creator com 'off';
// (2) checkout, pagamento e início aceitam Starter E Creator (sessões já abertas não quebram); (3) a conta fecha: o filme
// prometido (35 s, cinematic_ai) cabe nos créditos do Starter, e a frase diz quanto usa, nas 16 línguas, com números das
// fontes; (4) o Creator aparece como 2ª opção; (5) a medida grava o plano mostrado; (6) o ramo do Kling 4 fica intocado.
// Rodar: node scripts/test-versao-completa-starter-1111.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

const FC = 'lib/growth/filmComplete.ts'
const COPY = 'lib/growth/filmCompleteCopy.ts'
const ROUTE = 'app/api/film-complete/checkout/route.ts'
const STRIPE = 'app/api/stripe/checkout/route.ts'
const SERVER = 'lib/filmComplete/server.ts'
const UI = 'components/FilmReadyFullVersionUpsell.tsx'
const PAGE = 'app/film-complete/page.tsx'
const FILES = [FC, COPY, ROUTE, STRIPE, SERVER, UI, PAGE]
const SRC = Object.fromEntries(FILES.map((p) => [p, rd(p)]))
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

function loader(overrides) {
  const cache = new Map()
  function get(p) {
    p = p.split(String.fromCharCode(92)).join('/')
    if (cache.has(p)) return cache.get(p)
    const exports = {}
    cache.set(p, exports)
    const code = ts.transpileModule(overrides[p] ?? rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, { exports, URL, URLSearchParams, console, process: { env: {} }, require: (id) => {
      if (id.startsWith('@/')) return get(id.slice(2) + '.ts')
      if (id.startsWith('.')) return get(relative(root, resolve(root, dirname(p), id)) + '.ts')
      throw new Error('import inesperado: ' + id)
    } }, { filename: p })
    return exports
  }
  return get
}

function battery(src) {
  const p = []
  let fc, copy, price, cost, buy
  try {
    const get = loader(src)
    fc = get(FC); copy = get(COPY); price = get('lib/checkoutPricing.ts'); cost = get('lib/credits/engineCost.ts'); buy = get('lib/growth/buyCreatorOffer.ts')
  } catch (e) { return [`os módulos não carregam: ${e.message}`] }
  // (1) interruptor
  if (fc.KINEO_VERSAO_COMPLETA_STARTER_1111 !== 'on') p.push('interruptor não está ligado (o commit entrega a oferta no Starter)')
  if (fc.filmCompleteOfferTier() !== 'starter') p.push('ligado, o botão não abre o Starter')
  if (fc.filmCompleteOfferTier('off') !== 'basic') p.push("'off' não volta ao Creator")
  if (fc.filmCompleteRequestedTier('creator') !== 'basic') p.push('plan=creator não abre o Creator (a 2ª opção quebrou)')
  if (fc.filmCompleteRequestedTier(null) !== 'starter' || fc.filmCompleteRequestedTier('pro') !== 'starter') p.push('sem plan (ou plan estranho) não cai no plano do botão')
  if (fc.filmCompleteRequestedTier(null, 'off') !== 'basic') p.push("com 'off', o link sem plan não volta ao Creator")
  // (2) aceitação: os dois, sempre
  for (const t of ['starter', 'basic']) if (!fc.filmCompletePaidTier(t)) p.push(`o pagamento/checkout recusa ${t}`)
  for (const t of ['pro', 'autopilot', '', null, 'Starter']) if (fc.filmCompletePaidTier(t)) p.push(`o pagamento/checkout aceita ${String(t)} (só Starter e Creator mensal compram a oferta)`)
  for (const plan of ['starter', 'basic', 'creator', 'pro', 'studio']) if (!fc.FILM_COMPLETE_ENTITLED_PLANS.includes(plan)) p.push(`o plano ${plan} não libera o início do filme`)
  if (fc.FILM_COMPLETE_ENTITLED_PLANS.includes('free')) p.push('free libera o filme completo')
  if (!src[ROUTE].includes("const tier = filmCompleteRequestedTier(req.nextUrl.searchParams.get('plan'))") || !src[ROUTE].includes("const q = new URLSearchParams({ tier, billing: 'monthly', intent_campaign: FILM_COMPLETE_CAMPAIGN, film_complete: intent.id })")) p.push('o checkout da oferta não usa o plano do interruptor')
  if (/tier: 'basic', billing: 'monthly', intent_campaign: FILM_COMPLETE_CAMPAIGN/.test(src[ROUTE])) p.push('o checkout da oferta digita o Creator')
  if (!src[STRIPE].includes("!filmCompletePaidTier(tier) || billing !== 'monthly' || intro || wantsTrial || intentCampaign !== FILM_COMPLETE_CAMPAIGN")) p.push('o checkout da Stripe não aceita Starter e Creator para a oferta')
  if (!src[SERVER].includes("!FILM_COMPLETE_ENTITLED_PLANS.includes(text(profile.plan))")) p.push('o início do filme não usa a lista com o Starter')
  if (!src[SERVER].includes('!filmCompletePaidTier(session.metadata?.tier)')) p.push('o pagamento não aceita Starter e Creator')
  if (src[SERVER].includes("session.metadata?.tier !== 'basic'")) p.push('o pagamento ainda exige só o Creator')
  // (3) a conta fecha e a frase diz a verdade
  const seconds = fc.FILM_COMPLETE_TARGET_SECONDS
  const custo = cost.creditCostForDuration('cinematic_ai', true, seconds)
  const creditos = price.TIER_CREDITS.starter
  if (!(custo > 0 && custo <= creditos)) p.push(`o filme completo (${custo} cr) NÃO cabe no Starter (${creditos} cr): a oferta mentiria`)
  const nums = copy.filmCompleteStarterNumbers()
  if (nums.cost !== custo || nums.credits !== creditos || nums.starter !== price.formatCheckoutMoney('usd', price.TIER_PRICES.starter.usd)) p.push('os números da linha do Starter não vêm das fontes')
  const creatorFull = buy.buyCreatorPrice(false).full
  for (const lang of LANGS) {
    const c = copy.filmCompleteCopy(lang, false)
    if (c.tier !== 'starter') { p.push(`${lang}: o texto não é do Starter`); continue }
    if (!c.billing.includes(nums.starter) || !c.billing.includes(String(custo)) || !c.billing.includes(String(creditos))) p.push(`${lang}: a linha não diz preço, custo e créditos do Starter`)
    if (!c.billing.includes('Starter')) p.push(`${lang}: a linha não nomeia o Starter`)
    if (!c.more || !c.more.includes('Creator') || !c.more.includes(creatorFull)) p.push(`${lang}: falta a 2ª opção Creator com o preço dele`)
    if (/\{\w+\}/.test(JSON.stringify(c))) p.push(`${lang}: sobrou marcador no texto`)
    const off = copy.filmCompleteCopy(lang, false, 'off')
    if (off.more !== null || off.tier !== 'basic' || !off.billing.includes(creatorFull)) p.push(`${lang}: 'off' não volta ao texto do Creator`)
  }
  // (4) a 2ª opção no UI e no e-mail
  if (!src[UI].includes("filmCompleteCreatorHref(videoId, 'film_ready')") || !src[UI].includes('{copy.more ? (')) p.push('a oferta na tela não mostra a 2ª opção Creator')
  const mail = copy.filmCompleteEmail({ appUrl: 'https://www.usekineo.com', videoId: '00000000-0000-4000-8000-000000000000', language: 'en' })
  if (!/plan=creator/.test(mail.text) || !/plan=creator/.test(mail.html) || !mail.html.includes('Creator')) p.push('o e-mail não leva a 2ª opção Creator (texto e HTML)')
  if (!mail.text.includes(nums.starter)) p.push('o e-mail não diz o preço do Starter')
  const href = copy.filmCompleteCreatorHref('00000000-0000-4000-8000-000000000000', 'film_ready')
  if (new URL(href, 'https://x.test').searchParams.get('plan') !== 'creator') p.push('o link da 2ª opção não pede o Creator')
  if (!src[PAGE].includes("copy.resume.replace('{plan}', filmCompleteOfferTier() === 'starter' ? 'Starter' : 'Creator')")) p.push('o botão "continuar" da página não nomeia o plano que abre')
  // (5) medida
  const meta = fc.filmCompleteOfferMetadata()
  if (meta.offer_tier !== 'starter' || meta.offer_version !== 'versao_completa_starter_1111') p.push('a medida não grava o plano mostrado + versão')
  if ((src[UI].match(/\.\.\.filmCompleteOfferMetadata\(\)/g) ?? []).length < 3) p.push('impressão e cliques da tela não gravam o plano mostrado')
  if (!src[ROUTE].includes('offer_tier: tier, offer_version: FILM_COMPLETE_OFFER_VERSION')) p.push('o clique do servidor não grava o plano')
  // (6) Kling 4 intocado
  if (!src[SERVER].includes("const useKling4 = savedEngine ? savedEngine === FILM_COMPLETE_KLING4_ENGINE : !dispatchPrompt && io.kling4Free ? await io.kling4Free(db, intent.userId) : false")) p.push('o ramo do Kling 4 mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS versão completa no Starter pelo interruptor; Starter e Creator aceitos; a conta fecha nas 16 línguas; Creator como 2ª opção; medida com o plano; Kling 4 intocado' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['interruptor desligado', muta(FC, "export const KINEO_VERSAO_COMPLETA_STARTER_1111 = 'on' as 'on' | 'off'", "export const KINEO_VERSAO_COMPLETA_STARTER_1111 = 'off' as 'on' | 'off'")],
  ["'off' não volta", muta(FC, "return chave === 'on' ? 'starter' : 'basic'", "return 'starter'")],
  ['plan=creator ignorado', muta(FC, "return plan === 'creator' ? 'basic' : filmCompleteOfferTier(chave)", 'return filmCompleteOfferTier(chave)')],
  ['pagamento só Starter', muta(FC, "return tier === 'starter' || tier === 'basic'", "return tier === 'starter'")],
  ['pagamento aceita qualquer plano', muta(FC, "return tier === 'starter' || tier === 'basic'", 'return typeof tier === \'string\'')],
  ['Starter fora do início', muta(FC, "['starter', 'basic', 'creator', 'pro', 'studio']", "['basic', 'creator', 'pro', 'studio']")],
  ['checkout digita o Creator', muta(ROUTE, "const q = new URLSearchParams({ tier, billing: 'monthly'", "const q = new URLSearchParams({ tier: 'basic', billing: 'monthly'")],
  ['Stripe só Creator', muta(STRIPE, "!filmCompletePaidTier(tier) || billing !== 'monthly'", "tier !== 'basic' || billing !== 'monthly'")],
  ['settle só Creator', muta(SERVER, '!filmCompletePaidTier(session.metadata?.tier)', "session.metadata?.tier !== 'basic'")],
  ['custo digitado', muta(COPY, "cost: creditCostForDuration('cinematic_ai', true, FILM_COMPLETE_TARGET_SECONDS),", 'cost: 15,')],
  ['créditos digitados', muta(COPY, 'credits: TIER_CREDITS.starter,', 'credits: 60,')],
  ['filme não cabe mais', muta(FC,'export const FILM_COMPLETE_TARGET_SECONDS = 35', 'export const FILM_COMPLETE_TARGET_SECONDS = 180')],
  ['pt sem custo', muta(COPY, 'este filme usa {cost} dos {credits} créditos do mês', 'este filme usa os créditos do mês')],
  ['hi sem Creator', muta(COPY, "more: 'और फ़िल्में चाहिए? Creator {full}/माह'", "more: 'और फ़िल्में चाहिए?'")],
  ['tela sem 2ª opção', muta(UI, '{copy.more ? (', '{false ? (')],
  ['e-mail sem 2ª opção', muta(COPY, "${copy.more ? `${copy.more}: ${creatorHref}\\n` : ''}", "${''}")],
  ['impressão sem plano', muta(UI, "        ...filmCompleteOfferMetadata(), // KINEO-VERSAO-COMPLETA-STARTER-1111 — o plano MOSTRADO\n", '')],
  ['clique do servidor sem plano', muta(ROUTE, ", offer_tier: tier, offer_version: FILM_COMPLETE_OFFER_VERSION }", ' }')],
  ['Kling 4 mexido', muta(SERVER, '!dispatchPrompt && io.kling4Free ? await io.kling4Free(db, intent.userId) : false', 'false')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
