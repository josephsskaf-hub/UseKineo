// KINEO-SPRINT16H-B-CAPACIDADE-35S-2026-09-27 — guardião: o bloco das páginas de motor pago (components/PaidEngineBudget.tsx)
// ganha a linha 2 com a capacidade no filme MAIS CURTO do seletor (lib/expandPolicy SUPPORTED_DURATIONS), derivada do
// mesmo creditCostForDuration + TIER_CREDITS + getTierPrice. Nada digitado: nem "35", nem preço. A conta de 60 s do G3
// (tier, label, films, seconds, cost, price) tem de continuar idêntica à da base 910317ea. Offline: sem rede, sem
// OpenAI, sem render pago. Mutantes em memória provam que o guardião pega: "35" digitado, preço digitado, linha 2 com
// starterFilms = 0, Math.max no lugar de Math.min.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { root, React, renderToStaticMarkup, offlineModules, checks } from './gpt24h-offline-support.mjs'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
const { check, finish } = checks()
const proofPath = 'lib/growth/paidEngineProof.ts'
const jsxPath = 'components/PaidEngineBudget.tsx'
const pagePath = 'app/ai-video-generator/[engine]/page.tsx'
const jsxSrc = readFileSync(resolve(root, jsxPath), 'utf8')
const proofSrc = readFileSync(resolve(root, proofPath), 'utf8')
const semComentarioJsx = s => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const strip = html => html.replace(/ style="[^"]*"/g, '')
const render = (load, slug) => strip(renderToStaticMarkup(React.createElement(load(jsxPath).default, { slug })))
const paragrafos = html => html.match(/<p>.*?<\/p>/g) ?? []
const linha2 = html => { const ps = paragrafos(html); return ps.length === 3 ? ps[1] : null }
const filmes = n => `${n} ${n === 1 ? 'film' : 'films'}`
const linhaStarter = b => `<p><strong>Starter ${b.short.starterPrice} USD/month</strong> = <strong>${filmes(b.short.starterFilms)}</strong> of ${b.short.seconds} s with this engine</p>`
const linhaOu = b => `<p>or <strong>${filmes(b.short.starterFilms)}</strong> of ${b.short.seconds} s</p>`
const semNumeroDigitado = src => !/\b35\b/.test(semComentarioJsx(src)) && !/\$\d/.test(src)

// 1) fonte: a lib deriva de SUPPORTED_DURATIONS; o componente não digita 35 nem preço e tem o guarda do starterFilms.
check('lib importa SUPPORTED_DURATIONS de ../expandPolicy (fonte única do seletor)', proofSrc.includes("import { SUPPORTED_DURATIONS } from '../expandPolicy'") && proofSrc.includes('Math.min(...SUPPORTED_DURATIONS)'))
check('componente: zero "35" e zero "$" digitados (literal antigo = 0, continua 0)', semNumeroDigitado(jsxSrc))
check('componente: segundos, preço e quantidade da linha 2 vêm de budget.short', jsxSrc.includes('of {budget.short.seconds} s') && jsxSrc.includes('Starter {budget.short.starterPrice} USD/month') && jsxSrc.includes('{budget.short.starterFilms} {budget.short.starterFilms === 1'))
check('componente: linha 2 só com starterFilms >= 1', jsxSrc.includes('{budget.short.starterFilms >= 1 && ('))

// 2) derivação: short.* bate com min(SUPPORTED_DURATIONS), creditCostForDuration, TIER_CREDITS e getTierPrice.
const load = offlineModules()
const { paidEngineBudget, PAID_ENGINE_PROOF } = load(proofPath)
const { SUPPORTED_DURATIONS } = load('lib/expandPolicy.ts')
const { TIER_CREDITS, getTierPrice, formatCheckoutMoney } = load('lib/checkoutPricing.ts')
const { creditCostForDuration } = load('lib/credits/engineCost.ts')
const minS = Math.min(...SUPPORTED_DURATIONS)
const preco = tier => formatCheckoutMoney('usd', getTierPrice(tier, 'usd', 'standard'))
const base = offlineModules({ replacements: { [proofPath]: execFileSync('git', ['show', '910317ea:' + proofPath], { cwd: root, encoding: 'utf8' }) } })(proofPath)
const contaDe60 = b => JSON.stringify({ tier: b.tier, label: b.label, films: b.films, seconds: b.seconds, cost: b.cost, price: b.price })
for (const [slug, config] of Object.entries(PAID_ENGINE_PROOF)) {
  const b = paidEngineBudget(slug)
  const custoCurto = creditCostForDuration(config.quality, true, minS)
  check(`${slug}: conta de 60 s idêntica à base 910317ea (tier/label/films/seconds/cost/price)`, contaDe60(b) === contaDe60(base.paidEngineBudget(slug)))
  check(`${slug}: short.seconds === min(SUPPORTED_DURATIONS)`, b.short.seconds === minS)
  check(`${slug}: starterFilms/creatorFilms = floor(TIER_CREDITS / custo a ${minS} s)`, b.short.starterFilms === Math.floor(TIER_CREDITS.starter / custoCurto) && b.short.creatorFilms === Math.floor(TIER_CREDITS.basic / custoCurto))
  check(`${slug}: preços curtos via getTierPrice/formatCheckoutMoney`, b.short.starterPrice === preco('starter') && b.short.creatorPrice === preco('basic'))
  const html = render(load, slug)
  const esperada = b.short.starterFilms >= 1 ? (b.tier === 'basic' ? linhaStarter(b) : linhaOu(b)) : null
  check(`${slug}: linha 2 ${esperada ? (b.tier === 'basic' ? 'no formato Starter' : 'no formato "or"') : 'ausente (Starter não cobre nem o curto)'}`, linha2(html) === esperada)
  check(`${slug}: linha 1 do G3 intacta`, paragrafos(html)[0] === `<p><strong>${b.label} ${b.price} USD/month</strong> = <strong>${filmes(b.films)}</strong> of ${b.seconds} s with this engine</p>`)
}
const veo = paidEngineBudget('veo'), seedance = paidEngineBudget('seedance')
check('Veo: tier Creator a 60 s, mas Starter cobre >= 1 filme curto → linha Starter', veo.tier === 'basic' && veo.short.starterFilms >= 1 && linha2(render(load, 'veo')) === linhaStarter(veo))
check('Seedance: tier Starter → "or N films of <curto> s"', seedance.tier === 'starter' && linha2(render(load, 'seedance')) === linhaOu(seedance))

// 3) integração: a página real do motor mostra o MESMO bloco do componente (nada foi tocado em page.tsx).
const pagina = engineFixture()
for (const slug of ['seedance', 'veo', 'kling-3']) {
  const html = strip(renderToStaticMarkup(await pagina(pagePath).default({ params: { engine: slug } })))
  const bloco = html.match(/<div data-kineo="paid-engine-budget"[^>]*>[\s\S]*?<\/div>/)?.[0]
  check(`${slug}: página real renderiza o bloco com a linha 2 decidida pelo componente`, bloco === render(pagina, slug))
}

// 4) starterFilms = 0 forçado (Starter sem crédito): nenhuma linha 2, e a conta de 60 s cai no Creator como antes.
const pricing = load('lib/checkoutPricing.ts')
const starterZero = { 'lib/checkoutPricing.ts': { ...pricing, TIER_CREDITS: { ...pricing.TIER_CREDITS, starter: 0 } } }
const semStarter = offlineModules({ mocks: starterZero })
check('Starter sem crédito → short.starterFilms = 0 e sem linha 2', semStarter(proofPath).paidEngineBudget('seedance').short.starterFilms === 0 && linha2(render(semStarter, 'seedance')) === null)

// 5) mutantes em memória — o guardião tem de ficar vermelho em cada um.
const mutantes = {
  '"35" digitado no componente': jsxSrc.replace('of {budget.short.seconds} s', 'of 35 s'),
  'preço do Starter digitado no componente': jsxSrc.replace('Starter {budget.short.starterPrice} USD/month', 'Starter $9.90 USD/month'),
  'linha 2 mostrada com starterFilms = 0': jsxSrc.replace('{budget.short.starterFilms >= 1 && (', '{budget.short.starterFilms >= 0 && ('),
}
for (const [nome, src] of Object.entries(mutantes)) check(`mutante aplicado: ${nome}`, src !== jsxSrc)
// trava de fonte pega os dois literais digitados
check('mutante pego pela trava de fonte: "35" digitado', !semNumeroDigitado(mutantes['"35" digitado no componente']))
check('mutante pego pela trava de fonte: preço digitado', !semNumeroDigitado(mutantes['preço do Starter digitado no componente']))
// derivação pega os mesmos dois: com o seletor/preço mockados, o componente honesto muda e o mutante não
const seletor20 = { 'lib/expandPolicy.ts': { ...load('lib/expandPolicy.ts'), SUPPORTED_DURATIONS: [20, 60, 90] } }
const honesto20 = render(offlineModules({ mocks: seletor20 }), 'veo')
const mutante20 = render(offlineModules({ mocks: seletor20, replacements: { [jsxPath]: mutantes['"35" digitado no componente'] } }), 'veo')
check('mutante pego por derivação: seletor mockado a 20 s → honesto diz 20 s, "35" digitado não', linha2(honesto20)?.includes(' of 20 s') === true && linha2(mutante20)?.includes(' of 20 s') === false)
const preco1234 = { 'lib/checkoutPricing.ts': { ...pricing, getTierPrice: (tier, cur, region) => tier === 'starter' ? 1234 : pricing.getTierPrice(tier, cur, region) } }
const honestoPreco = render(offlineModules({ mocks: preco1234 }), 'veo')
const mutantePreco = render(offlineModules({ mocks: preco1234, replacements: { [jsxPath]: mutantes['preço do Starter digitado no componente'] } }), 'veo')
check('mutante pego por derivação: getTierPrice mockado → honesto mostra o preço mockado, digitado não', linha2(honestoPreco)?.includes(`Starter ${formatCheckoutMoney('usd', 1234)} USD/month`) === true && linha2(mutantePreco)?.includes(`Starter ${formatCheckoutMoney('usd', 1234)} USD/month`) === false)
const mutanteZero = render(offlineModules({ mocks: starterZero, replacements: { [jsxPath]: mutantes['linha 2 mostrada com starterFilms = 0'] } }), 'seedance')
check('mutante pego: starterFilms = 0 e a linha 2 aparece (com "0 films")', linha2(mutanteZero) !== null && linha2(mutanteZero).includes('0 films'))
const mutanteMax = offlineModules({ replacements: { [proofPath]: proofSrc.replace('Math.min(...SUPPORTED_DURATIONS)', 'Math.max(...SUPPORTED_DURATIONS)') } })(proofPath)
check('mutante pego: Math.max no lugar de Math.min → short.seconds deixa de ser o mínimo', mutanteMax.paidEngineBudget('veo').short.seconds !== minS)
finish()
