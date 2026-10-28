// KINEO-AVULSO-GARANTIA-2810 — guardião da frase "refazemos ou devolvemos" no caminho do pagamento e do avulso de um
// filme no cartão do download. Sem rede, sem banco. Prova a fonte única da frase (en/pt/es), que cada superfície a
// mostra (/pricing, portão "Continue to secure checkout", cartão do download, custom_text da Stripe mensal e do passe
// avulso), que nada de preço/plano/reembolso mudou junto, e que o avulso do cartão é o MESMO SKU (?pack=starter&
// return=wm) que o compose/unlock aceita, com preço lido da fonte única (packPriceLabel / PACK_PRICE_MINOR).
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

function fileFor(rel) {
  for (const c of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = join(root, c)
    if (existsSync(abs) && statSync(abs).isFile()) return c
  }
  return null
}
function carrega(entry, { overrides = {}, stubs = {} } = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = overrides[rel] ?? rd(rel)
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (spec) => {
      if (spec in stubs) return stubs[spec]
      let target = null
      if (spec.startsWith('@/')) target = fileFor(spec.slice(2))
      else if (spec.startsWith('.')) target = fileFor(posix.normalize(posix.join(posix.dirname(rel), spec)))
      if (target) return load(target)
      return require(spec)
    }
    new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
    return mod.exports
  }
  return load(entry)
}

console.log('1) a frase: fonte única, três línguas, honesta')
const G = carrega('lib/growth/firstFilmGuarantee.ts')
const EN = "Not happy with your first film? We'll redo it or refund you — just reply to your receipt."
checa('inglês = a frase aprovada pelo fundador, palavra por palavra', G.FIRST_FILM_GUARANTEE.en === EN)
checa('pt e es existem e falam de refazer/devolver e do recibo', /refaz/.test(G.FIRST_FILM_GUARANTEE.pt) && /recibo/.test(G.FIRST_FILM_GUARANTEE.pt) && /rehacemos/.test(G.FIRST_FILM_GUARANTEE.es) && /recibo/.test(G.FIRST_FILM_GUARANTEE.es))
checa('seletor: pt/es/en, desconhecido cai no inglês', G.firstFilmGuarantee('pt') === G.FIRST_FILM_GUARANTEE.pt && G.firstFilmGuarantee('es-MX') === G.FIRST_FILM_GUARANTEE.es && G.firstFilmGuarantee('fr') === EN && G.firstFilmGuarantee(null) === EN)
checa('módulo puro (sem import — roda no edge do middleware)', !/^\s*import\s/m.test(rd('lib/growth/firstFilmGuarantee.ts')))
checa('nenhuma cópia promete prazo, porcentagem ou automático que o suporte não sabe cumprir', Object.values(G.FIRST_FILM_GUARANTEE).every((s) => !/\d|automatic|automátic|100%/i.test(s)))

console.log('2) /pricing: sob o botão de compra de cada cartão')
const stage = rd('components/pricing/PlanValueStage.tsx')
checa('importa a fonte única', stage.includes("import { FIRST_FILM_GUARANTEE } from '@/lib/growth/firstFilmGuarantee'"))
const iCta = stage.indexOf("{props.selected ? props.ctaLabel : `Select ${props.name}`}")
const iLine = stage.indexOf('data-testid="plan-first-film-guarantee">{FIRST_FILM_GUARANTEE.en}</p>')
checa('a linha vem depois do botão e da garantia de 7 dias, dentro do bloco de compra', iCta > 0 && iLine > iCta && iLine > stage.indexOf('data-testid="plan-guarantee"') && iLine < stage.indexOf('<div className="pv-sec">', iCta))
checa('a garantia de 7 dias continua lá, intocada', stage.includes('<p className="pv-guarantee" data-testid="plan-guarantee">{MONEY_BACK_GUARANTEE}</p>'))

console.log('3) portão "Continue to secure checkout" (compra sem conta)')
const gateSrc = rd('lib/growth/checkoutRobotGate.ts')
const gate = carrega('lib/growth/checkoutRobotGate.ts')
const html = gate.checkoutGateHtml('x')
checa('a página mostra a frase', html.includes(EN))
checa('a frase vem depois do botão de continuar', html.indexOf(EN) > html.indexOf('id="kineo-checkout-continue"'))
checa('lida da fonte única (sem texto digitado no portão)', gateSrc.includes("import { FIRST_FILM_GUARANTEE } from './firstFilmGuarantee'") && !gateSrc.includes("We'll redo it"))
checa('a página continua sem o caminho do checkout escrito', !/api\/stripe\/checkout/.test(html))

console.log('4) Stripe custom_text')
const vc = rd('lib/growth/checkoutValueContext.ts')
const policyMod = (() => {
  const engineCost = carrega('lib/credits/engineCost.ts')
  const bridge = carrega('lib/growth/trialBalanceBridge.ts')
  return carrega('lib/growth/checkoutValueContext.ts', { stubs: { '@/lib/credits/engineCost': engineCost, '@/lib/growth/trialBalanceBridge': bridge } })
})()
checa('espelho literal = fonte única', policyMod.CHECKOUT_FIRST_FILM_GUARANTEE_SENTENCE === EN)
const mensal = policyMod.buildCheckoutValueContext({ billing: 'monthly', credits: 60, intentCampaign: undefined, tier: 'starter' })
const anual = policyMod.buildCheckoutValueContext({ billing: 'annual', credits: 60, intentCampaign: undefined, tier: 'starter' })
checa('mensal: a frase fecha o texto do botão de pagar, depois da garantia de 7 dias', mensal.submitMessage.endsWith(`7-day money-back guarantee. ${EN}`))
checa('anual: sem a frase (a política do anual diz "depois de 14 dias, nenhum reembolso")', !anual.submitMessage.includes(EN))
checa('cabe no limite do custom_text da Stripe', mensal.submitMessage.length <= 500)
checa('o dígito dos 7 dias segue no literal que os guardiões leem', /'Cancel anytime from Account\. 7-day money-back guarantee\.'/.test(vc))
const route = rd('app/api/stripe/checkout/route.ts')
const iPack = route.indexOf('async function buildPackAndRedirect(')
const fimPack = route.slice(iPack + 10).search(/\n(?:async )?function /)
const pack = route.slice(iPack, fimPack > 0 ? iPack + 10 + fimPack : undefined)
checa('passe avulso: custom_text.submit com a frase da fonte única', pack.includes('custom_text: { submit: { message: FIRST_FILM_GUARANTEE.en } }') && route.includes("import { FIRST_FILM_GUARANTEE } from '@/lib/growth/firstFilmGuarantee'"))
checa('passe avulso: custom_text entra na chave de idempotência (parâmetro novo ⇒ chave nova)', /oneTimeIdempotencyKey\(\{[\s\S]{0,300}custom_text: sessionParams\.custom_text,/.test(pack))
checa('passe avulso: preço e crédito intocados (PACK_PRICES[currency], STARTER_PACK.credits)', pack.includes('const unitAmount = PACK_PRICES[currency]') && pack.includes("pack_credits: String(STARTER_PACK.credits)") && pack.includes("pack: 'starter10'"))

console.log('5) cartão do download: os dois botões e a frase')
const comp = rd('components/growth/DownloadUpsell.tsx')
checa('o cartão mostra a frase pela fonte única, na língua da tela', comp.includes("import { firstFilmGuarantee } from '@/lib/growth/firstFilmGuarantee'") && comp.includes('{firstFilmGuarantee(lang)}'))
checa('dois botões: plano e avulso', comp.includes('data-download-upsell-cta="plan"') && comp.includes('data-download-upsell-cta="one_time"'))
const lib = carrega('lib/growth/downloadUpsell.ts')
checa('avulso = o MESMO SKU do "Just this video" (pack=starter, return=wm)', lib.DOWNLOAD_UPSELL_ONE_TIME_CHECKOUT_PATH === '/api/stripe/checkout?pack=starter&return=wm')
const unlock = rd('app/api/compose/unlock/route.ts')
checa('compose/unlock aceita o pack (remonta o mesmo filme limpo)', unlock.includes("session.mode === 'payment' && session.metadata?.pack === 'starter10'"))
checa('a volta do pack com return=wm é a tela do filme com wm_unlock', route.includes("? `${appUrl}/generate?wm_unlock=1&session_id={CHECKOUT_SESSION_ID}`"))
const cp = rd('lib/checkoutPricing.ts')
const minor = Number(/export const PACK_PRICE_MINOR: Record<CheckoutCurrency, number> = \{ usd: (\d+) \}/.exec(cp)?.[1])
const credits = Number(/starter: (\d+),/.exec(cp.slice(cp.indexOf('export const PACK_CREDITS')))?.[1])
const label = `$${(minor / 100).toFixed(2)}`
const c = lib.downloadUpsellCopy({ priceLabel: '$9.90', monthlyCredits: 60, thisFilm: true, oneTimePriceLabel: label, oneTimeCredits: credits })
checa(`avulso mostra o preço real da fonte única (${label})`, c.oneTimeButton === `Just this film — no watermark · ${label} one-time`)
const proximo = lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: false, oneTimePriceLabel: label, oneTimeCredits: credits })
checa('sem insumos (estante): "your next film", nunca "this film"', proximo.oneTimeButton.includes('your next film') && !proximo.oneTimeButton.includes('this film'))

console.log('6) nada de preço/plano/reembolso mudou por esta peça')
checa('PACK_PRICE_MINOR segue 499 e PACK_CREDITS.starter 35', minor === 499 && credits === 35)
checa('MONEY_BACK_GUARANTEE intocada', cp.includes('export const MONEY_BACK_GUARANTEE = `Full refund if you email us within ${MONTHLY_REFUND_DAYS} days of your first monthly payment (${ANNUAL_REFUND_DAYS} days on annual plans).`'))

console.log('7) mutante: a frase some do portão e o guardião pega')
const mutGate = gateSrc.replace('${FIRST_FILM_GUARANTEE.en}', '')
checa('mutante aplicou', mutGate !== gateSrc)
const mutHtml = carrega('lib/growth/checkoutRobotGate.ts', { overrides: { 'lib/growth/checkoutRobotGate.ts': mutGate } }).checkoutGateHtml('x')
checa('mutante é pego', !mutHtml.includes(EN))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
