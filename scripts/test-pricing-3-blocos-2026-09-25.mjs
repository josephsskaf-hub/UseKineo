// KINEO-FLUXO-NOVO-2026-09-25 — guardião da peça D (/pricing com 3 blocos: planos + Anúncios + Créditos avulsos).
// Ordem do fundador (25/09): o /pricing mostra os três jeitos de pagar a Kineo, com números SÓ das fontes únicas e
// NENHUM preço mudado (congelado até 09/10). O que este guardião prova, rodando o código de verdade (transpile + vm +
// react-dom/server, sem rede, sem banco, sem import '@/' no próprio guardião):
//   1. montagem: os dois blocos ficam ABAIXO dos planos e ACIMA do Autopilot Lite; o seletor Mensal/Anual continua lá;
//   2. créditos: o botão e o modal só existem com o estado 'eligible', e esse estado concorda com o portão do checkout
//      (canPurchaseCreditTopup) plano a plano; deslogado, free, autopilot e leitura falha FECHAM;
//   3. anúncios: o passe vai para /ads, Express/Pro para /business-video-ads#packages; nunca checkout nem buy.stripe.com;
//      interruptor do passe desligado = coluna some;
//   4. preço: nenhum dígito de preço nos arquivos novos; todo valor pintado = formatCheckoutMoney(fonte única);
//   5. medição: pricing_block_shown / pricing_block_clicked, marca de sessão só depois do evento guardado.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')

let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

const LIB = 'lib/growth/pricingOfferBlocks.ts'
const ADS = 'components/pricing/PricingAdsBlock.tsx'
const CREDITS = 'components/pricing/PricingCreditsBlock.tsx'
const CLIENT = 'app/pricing/PricingClient.tsx'

// Carregador mínimo: resolve '@/' e relativos para .ts/.tsx do repositório, transpila e roda em vm. Sem `fetch` no
// contexto: se algum módulo chamar rede no import ou no render, o guardião quebra.
function carregador({ env = {}, stubs = {} } = {}) {
  const cache = new Map()
  function load(rel) {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }
    cache.set(rel, mod)
    const js = ts.transpileModule(rd(rel), {
      fileName: rel,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const req = (id) => {
      if (Object.hasOwn(stubs, id)) return stubs[id]
      if (id === 'react' || id === 'react/jsx-runtime') return require(id)
      if (id === 'react-dom') return { createPortal: (el) => el } // o modal vai por portal (revisão de 25/09: z-10 prendia o fixed)
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? id.slice(2) : posix.join(posix.dirname(rel), id)
        if (base.endsWith('.json')) return JSON.parse(rd(base))
        const file = ['.ts', '.tsx'].map((e) => base + e).find((f) => existsSync(join(RAIZ, f)))
        if (!file) throw new Error('Módulo ausente ' + id + ' em ' + rel)
        return load(file)
      }
      throw new Error('Dependência inesperada ' + id + ' em ' + rel)
    }
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env: { NODE_ENV: 'test', ...env } }, console }, { filename: rel })
    return mod.exports
  }
  return load
}

const eventos = []
const STUBS = {
  '@/lib/analytics': { trackEvent: async (name, meta) => { eventos.push({ name, meta }); return true } },
  '@/components/CreditsTopupModal': {
    __esModule: true,
    default: ({ surface }) => React.createElement('div', { 'data-stub': 'credits-topup-modal', 'data-surface': surface }),
  },
}
const load = carregador({ stubs: STUBS })
const blocks = load(LIB)
const offer = load('lib/ads/offer.ts')
const dfyOffer = load('lib/growth/dfyOffer.ts')
const slider = load('lib/credits/creditSlider.ts')
const topup = load('lib/growth/topupEligibility.ts')
const checkout = load('lib/checkoutPricing.ts')
const money = (minor) => checkout.formatCheckoutMoney('usd', minor)

// ── 1. Montagem no /pricing ───────────────────────────────────────────────────────────────────────────────────────
{
  const src = rd(CLIENT)
  const i = (s) => src.indexOf(s)
  const plans = i('id="plans"'), ads = i('<PricingAdsBlock />'), credits = i('<PricingCreditsBlock />'), lite = i('id="autopilot-lite"')
  ok(plans > 0 && ads > plans && credits > ads && lite > credits, '1a ordem: #plans < <PricingAdsBlock /> < <PricingCreditsBlock /> < #autopilot-lite')
  ok(src.split('<PricingAdsBlock />').length === 2 && src.split('<PricingCreditsBlock />').length === 2, '1b cada bloco montado exatamente uma vez')
  ok(/^import PricingAdsBlock from '@\/components\/pricing\/PricingAdsBlock'/m.test(src) && /^import PricingCreditsBlock from '@\/components\/pricing\/PricingCreditsBlock'/m.test(src), '1c imports dos dois componentes novos')
  ok(src.includes("setBilling('monthly')") && src.includes("setBilling('annual')") && src.includes('2 MONTHS FREE'), '1d seletor Mensal/Anual intacto')
  // Os blocos NÃO podem nascer dentro de um ramo do seletor (são compras únicas, valem para os dois lados).
  const antes = src.slice(Math.max(0, ads - 400), ads)
  ok(!/billing === '(monthly|annual)' &&[^}]*$/.test(antes.split(')}').pop()), '1e blocos fora de qualquer ramo `billing === ...`')
  ok(!src.includes('CreditsTopupModal') && !src.includes('pack=ads_pass'), '1f PricingClient não abre recarga nem passe por conta própria')
}

// ── 2. Arquivos novos: sem preço digitado, sem checkout direto ────────────────────────────────────────────────────
{
  const semComentario = (rel) => ts.transpileModule(rd(rel), {
    fileName: rel, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve, removeComments: true },
  }).outputText
  const PRECO = /\$\s?\d|US\$\s?\d|\b(990|1990|3990|3500|7500|29790)\b|0\.1[49]9/
  const PROIBIDO = /buy\.stripe\.com|checkout\.stripe\.com|\/api\/stripe\/checkout|pack=|dfyPaymentLink|paymentUrl/
  for (const rel of [LIB, ADS, CREDITS]) {
    const code = semComentario(rel)
    ok(!PRECO.test(code), '2a sem literal de preço: ' + rel)
    ok(!PROIBIDO.test(code), '2b sem link de checkout/Stripe: ' + rel)
  }
  ok(/fetch\('\/api\/credits'/.test(rd(CREDITS)), '2c o bloco de créditos lê /api/credits (o mesmo `plan` cru que o checkout lê)')
}

// ── 3. Portão dos créditos concorda com o checkout ────────────────────────────────────────────────────────────────
{
  const st = blocks.pricingCreditsStateFromRead
  ok(st({ status: 401, body: { error: 'Unauthorized' } }) === 'anon', '3a deslogado (401) = anon')
  ok(st({ status: 500, body: { readFailed: true } }) === 'read_error', '3b 500 = read_error')
  ok(st({ status: 200, body: { readFailed: true, plan: 'pro' } }) === 'read_error', '3c marca de leitura falha vence o plano')
  ok(st({ status: 200, body: { credits: 0, migrationNeeded: true } }) === 'read_error', '3d corpo sem plan = read_error')
  ok(st(null) === 'read_error' && st({ status: 200, body: null }) === 'read_error' && st({ status: 200, body: { plan: '  ' } }) === 'read_error', '3e nulo/vazio fecha')
  const planos = ['free', 'starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', ' PRO ', 'autopilot', 'autopilot_lite', 'creator', 'studio', 'anonymous']
  const divergentes = planos.filter((p) => (st({ status: 200, body: { plan: p } }) === 'eligible') !== topup.canPurchaseCreditTopup(p))
  ok(divergentes.length === 0, '3f estado eligible === canPurchaseCreditTopup do checkout, plano a plano' + (divergentes.length ? ': ' + divergentes.join(',') : ''))
  ok(st({ status: 200, body: { plan: 'free' } }) === 'ineligible' && st({ status: 200, body: { plan: 'autopilot' } }) === 'ineligible', '3g free e autopilot fecham')
  ok(st({ status: 200, body: { plan: 'starter' } }) === 'eligible' && st({ status: 200, body: { plan: 'basic_trial' } }) === 'eligible' && st({ status: 200, body: { plan: 'pro' } }) === 'eligible', '3h starter/basic_trial/pro abrem')
  const estados = ['loading', 'eligible', 'ineligible', 'anon', 'read_error']
  ok(estados.filter((s) => blocks.pricingCreditsCanBuy(s)).join() === 'eligible', '3i só eligible compra')
  const m = blocks.pricingCreditsBlockModel('anon')
  ok(m.min === slider.CREDIT_SLIDER_MIN && m.max === slider.CREDIT_SLIDER_MAX && m.fromPriceMinor === slider.sliderPriceUsdMinor(slider.CREDIT_SLIDER_MIN) && m.canBuy === false, '3j faixa e "a partir de" saem de creditSlider')
}

// ── 4. Render dos créditos por estado ─────────────────────────────────────────────────────────────────────────────
{
  const C = load(CREDITS)
  const fromLabel = money(slider.sliderPriceUsdMinor(slider.CREDIT_SLIDER_MIN))
  const html = (state, open) => renderToStaticMarkup(React.createElement(C.PricingCreditsBlockView, { state, open, onOpen() {}, onClose() {} }))
  const eleg = html('eligible', true)
  ok(eleg.includes('data-stub="credits-topup-modal"') && eleg.includes(`data-surface="${blocks.PRICING_TOPUP_SURFACE}"`) && blocks.PRICING_TOPUP_SURFACE === 'pricing_block', '4a eligible + aberto = o MESMO CreditsTopupModal com surface="pricing_block"')
  ok(eleg.includes('<button') && !eleg.includes('pricing-credits-locked'), '4b eligible mostra o botão e não o texto de bloqueio')
  ok(!html('eligible', false).includes('credits-topup-modal'), '4c modal só abre com open')
  for (const s of ['ineligible', 'anon', 'read_error']) {
    const h = html(s, true)
    ok(!h.includes('credits-topup-modal') && !h.includes('<button'), '4d ' + s + ': sem modal e sem botão mesmo com open=true')
    ok(h.includes('Top-ups are for') && h.includes(`href="${blocks.PRICING_PLANS_HREF}"`) && blocks.PRICING_PLANS_HREF === '#plans', '4e ' + s + ': texto honesto + link para #plans')
    ok(h.includes(fromLabel) && h.includes(String(slider.CREDIT_SLIDER_MIN)) && h.includes(slider.CREDIT_SLIDER_MAX.toLocaleString('en-US')), '4f ' + s + ': faixa e "from" das fontes únicas')
    ok(h.includes(blocks.PRICING_ONE_TIME_LABEL) && blocks.PRICING_ONE_TIME_LABEL === 'One-time · separate from your plan', '4g ' + s + ': etiqueta de compra única')
  }
  const carregando = html('loading', true)
  ok(!carregando.includes('<button') && !carregando.includes('credits-topup-modal') && !carregando.includes('Top-ups are for'), '4h loading: nem botão nem bloqueio')
  // Fiação do clique: o botão chama onOpen; o link de plano chama onChoosePlan.
  const acha = (node, pred, acc = []) => {
    if (Array.isArray(node)) { node.forEach((n) => acha(n, pred, acc)); return acc }
    if (!node || typeof node !== 'object') return acc
    if (pred(node)) acc.push(node)
    acha(node.props?.children, pred, acc)
    return acc
  }
  let abriu = 0, escolheu = 0
  const arvoreE = C.PricingCreditsBlockView({ state: 'eligible', open: false, onOpen: () => abriu++, onClose() {}, onChoosePlan: () => escolheu++ })
  acha(arvoreE, (n) => n.type === 'button').forEach((b) => b.props.onClick())
  const arvoreI = C.PricingCreditsBlockView({ state: 'ineligible', open: false, onOpen: () => abriu++, onClose() {}, onChoosePlan: () => escolheu++ })
  acha(arvoreI, (n) => n.type === 'a').forEach((a) => a.props.onClick())
  ok(abriu === 1 && escolheu === 1, '4i botão chama onOpen; "Choose a plan" chama onChoosePlan')
  // O componente real, renderizado no servidor, não busca nada e nasce sem botão (estado 'loading').
  let ssr = ''
  try { ssr = renderToStaticMarkup(React.createElement(C.default)) } catch (e) { ssr = 'ERRO ' + e.message }
  ok(ssr.includes(`id="${blocks.PRICING_CREDITS_BLOCK_ID}"`) && !ssr.includes('<button') && !ssr.startsWith('ERRO'), '4j SSR do componente real: sem rede, sem botão')
}

// ── 5. Anúncios: destinos, interruptor, preços ────────────────────────────────────────────────────────────────────
{
  const m = blocks.pricingAdsBlockModel()
  const live = dfyOffer.liveDfyTiers()
  ok(!!m.pass === offer.adsPassLive() && m.dfy.length === live.length && m.visible === (!!m.pass || live.length > 0), '5a modelo segue adsPassLive() e liveDfyTiers()')
  ok(m.pass && m.pass.href === '/ads?from=pricing' && m.pass.priceMinor === offer.ADS_PASS_USD_MINOR && m.pass.credits === offer.ADS_PASS_CREDITS && m.pass.accessDays === offer.ADS_PASS_ACCESS_DAYS, '5b passe: /ads?from=pricing + números de lib/ads/offer')
  ok(m.dfy.every((t) => t.href === '/business-video-ads?from=pricing#packages' && t.priceMinor === dfyOffer.DFY_TIERS[t.tier].priceMinor && t.hours === dfyOffer.DFY_TIERS[t.tier].hours && !('url' in t)), '5c Express/Pro: /business-video-ads#packages, preço do degrau, sem url de pagamento')
  const semPasse = blocks.pricingAdsBlockModel({ passLive: false })
  ok(semPasse.pass === null && semPasse.dfy.length === live.length, '5d passe desligado = coluna some, degraus ficam')
  ok(blocks.pricingAdsBlockModel({ passLive: false, dfyTiers: [] }).visible === false, '5e nada ligado = bloco some')
  const envOff = carregador({ stubs: STUBS, env: { NEXT_PUBLIC_ADS_PASS_LIVE: '0' } })(LIB).pricingAdsBlockModel()
  ok(envOff.pass === null, '5f interruptor real (NEXT_PUBLIC_ADS_PASS_LIVE=0) tira o passe do /pricing')

  const A = load(ADS)
  const html = (model) => renderToStaticMarkup(React.createElement(A.PricingAdsBlockView, { model }))
  const h = html(m)
  const hrefs = [...h.matchAll(/href="([^"]*)"/g)].map((x) => x[1].replace(/&amp;/g, '&'))
  const permitidos = new Set(['/ads?from=pricing', '/business-video-ads?from=pricing#packages'])
  ok(hrefs.length === (m.pass ? 1 : 0) + m.dfy.length && hrefs.every((x) => permitidos.has(x)), '5g todo href pintado é /ads ou /business-video-ads#packages: ' + hrefs.join(' '))
  ok(!/stripe|checkout|pack=/.test(h), '5h HTML do bloco sem stripe/checkout/pack=')
  ok(h.includes(blocks.PRICING_ONE_TIME_LABEL) && h.includes('Monthly / Annual'), '5i etiqueta de compra única + aviso do seletor')
  ok((!m.pass || h.includes(money(offer.ADS_PASS_USD_MINOR))) && m.dfy.every((t) => h.includes(money(t.priceMinor))), '5j preços pintados = formatCheckoutMoney(fonte única)')
  const hSem = html(semPasse)
  ok(!hSem.includes('/ads?from=pricing') && !hSem.includes('pricing-ads-pass') && (live.length === 0 || hSem.includes('pricing-ads-dfy')), '5k render sem passe: sem coluna do passe')
  ok(html({ visible: false, pass: null, dfy: [], state: 'pass_off_dfy_0' }) === '', '5l render sem nada ligado = vazio')
  // Clique: cada link entrega o CTA certo.
  const acha = (node, acc = []) => {
    if (Array.isArray(node)) { node.forEach((n) => acha(n, acc)); return acc }
    if (!node || typeof node !== 'object') return acc
    if (node.type === 'a') acc.push(node)
    acha(node.props?.children, acc)
    return acc
  }
  const ctas = []
  acha(A.PricingAdsBlockView({ model: m, onCtaClick: (c) => ctas.push(c) })).forEach((a) => a.props.onClick())
  ok(ctas.join() === [...(m.pass ? ['ads_pass'] : []), ...m.dfy.map((t) => 'dfy_' + t.tier)].join(), '5m cliques: ' + ctas.join())
  let ssr = ''
  try { ssr = renderToStaticMarkup(React.createElement(A.default)) } catch (e) { ssr = 'ERRO ' + e.message }
  ok(ssr === h, '5n SSR do componente real = view com o modelo padrão, sem rede')
}

// ── 6. Medição ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  ok(blocks.PRICING_BLOCK_SHOWN_EVENT === 'pricing_block_shown' && blocks.PRICING_BLOCK_CLICKED_EVENT === 'pricing_block_clicked', '6a nomes dos eventos')
  const route = rd('app/api/events/route.ts')
  const deny = route.slice(route.indexOf('const SERVER_ONLY_EVENTS'), route.indexOf('])', route.indexOf('const SERVER_ONLY_EVENTS')))
  ok(deny.length > 0 && !deny.includes('pricing_block'), '6b eventos do navegador fora do SERVER_ONLY_EVENTS')
  const meta = blocks.pricingBlockEventMetadata('credits', 'anon', 'credits_choose_plan')
  ok(meta.block === 'credits' && meta.state === 'anon' && meta.cta === 'credits_choose_plan' && meta.version === blocks.PRICING_BLOCKS_VERSION, '6c metadata {block, state, cta, version}')
  ok(blocks.pricingBlockMarker('pricing_block_shown', 'ads') !== blocks.pricingBlockMarker('pricing_block_shown', 'credits'), '6d marca por bloco')

  const memoria = new Map()
  const storage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) }
  let envios = 0, resposta = false
  let rec = blocks.createPricingBlockRecorder({ send: async () => { envios++; return resposta }, storage: () => storage })
  const run = async () => {
    const marca = 'm1'
    const r1 = await rec.recordOnce(marca, 'pricing_block_shown', {})
    ok(r1 === false && !memoria.has(marca) && envios === 1, '6e envio recusado NÃO grava a marca (pode tentar de novo)')
    resposta = true
    const [a, b] = await Promise.all([rec.recordOnce(marca, 'pricing_block_shown', {}), rec.recordOnce(marca, 'pricing_block_shown', {})])
    ok(envios === 2 && a === true && b === false && memoria.get(marca) === '1', '6f em voo: dois cliques simultâneos = um envio; marca só depois de guardado')
    ok((await rec.recordOnce(marca, 'pricing_block_shown', {})) === false && envios === 2, '6g já gravado = não envia de novo')
    rec = blocks.createPricingBlockRecorder({ send: async () => { envios++; return true }, storage: () => storage })
    ok(rec.wasRecorded(marca) === true, '6h marca de sessão sobrevive a um recorder novo (outra montagem)')
    const quebrado = blocks.createPricingBlockRecorder({ send: async () => true, storage: () => { throw new Error('privado') } })
    ok((await quebrado.recordOnce('m2', 'x', {})) === true && quebrado.wasRecorded('m2') === true, '6i sessionStorage negado: trava em memória segue')
    const explode = blocks.createPricingBlockRecorder({ send: async () => { throw new Error('rede') }, storage: () => storage })
    ok((await explode.recordOnce('m3', 'x', {})) === false && !memoria.has('m3'), '6j envio que explode = sem marca')
  }
  await run()
}

// ── 7. Tripwire do congelamento de preço (até 09/10) ──────────────────────────────────────────────────────────────
{
  ok(offer.ADS_PASS_USD_MINOR === 1990 && offer.ADS_PASS_CREDITS === 60, '7a passe 1990 c / 60 cr')
  ok(dfyOffer.DFY_TIERS.express.priceMinor === 3500 && dfyOffer.DFY_TIERS.pro.priceMinor === 7500 && dfyOffer.DFY_TIERS.express.hours === 48 && dfyOffer.DFY_TIERS.pro.hours === 72, '7b Express 3500/48 h · Pro 7500/72 h')
  ok(slider.CREDIT_SLIDER_MIN === 50 && slider.CREDIT_SLIDER_MAX === 2000 && slider.sliderPriceUsdMinor(50) === 990 && slider.sliderPriceUsdMinor(2000) === 29790, '7c barra 50..2000, 50 = 990, 2000 = 29790')
  ok(checkout.TIER_PRICES.starter.usd === 990 && checkout.TIER_PRICES.basic.usd === 1990 && checkout.TIER_PRICES.pro.usd === 3990, '7d planos 990/1990/3990')
}

console.log(`\n  verificações: ${passou + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('OK — /pricing com 3 blocos: planos intactos, anúncios para /ads e /business-video-ads, recarga só para quem o checkout aceita')
