// KINEO-MOEDA-LOCAL-2026-09-09 — guardião de "dólar na vitrine, real no caixa".
//
// O que foi medido em 09/09: o fundador testou o funil de afiliados com o próprio
// cartão e a Stripe recusou com "Moeda não aceita" (checkout_payment_failed:
// card_country BR, currency usd, reason_category unsupported). A conta Stripe é
// brasileira: cartão emitido no Brasil só paga em reais. Desde 19/08 a casa
// cobrava USD no mundo todo — nenhum brasileiro conseguia pagar.
//
// Decisão do fundador: preço em dólar em todo card; ao clicar, a sessão nasce na
// moeda do país (Brasil = tabela fixa em reais aprovada: R$ 49,90/99,90/199,90,
// anual 10×); americano nunca vê Pix (a Stripe mostra os meios pela moeda da
// sessão); recusa anterior de cartão BR reabre em BRL sozinha.
//
// Executa a lib PURA em sandbox e prova por texto que rota, webhook, /api/geo,
// /pricing e /checkout/cancelled a usam.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
// checkoutPricing stubado com os números vigentes (V5 restaurado): a lib só lê constantes e delega a régua USD.
const STUB = {
  AUTOPILOT_PRICES: { usd: 29900 },
  TIER_CREDITS: { starter: 60, basic: 150, pro: 300, autopilot: 400 },
  LEGACY_TIER_CREDITS_V6: { starter: 60, basic: 150, pro: 180, autopilot: 400 },
  renewalCreditsFor: (tier, amount) => ({ starter: 990, basic: 1990, pro: 3990, autopilot: 29900 }[tier] > (amount ?? Infinity) && amount > 0 ? STUB.LEGACY_TIER_CREDITS_V6[tier] : STUB.TIER_CREDITS[tier]),
}
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, Intl, require: (id) => { if (id === './checkoutPricing') return STUB; throw new Error('import inesperado: ' + id) } }); return exp }

console.log('== a lib, executada ==')
const libSrc = rd('lib/settlementCurrency.ts')
checa('a lib importa só de checkoutPricing, e checkoutPricing NÃO importa de volta (sem ciclo; guardiões de lista fechada intactos)', (libSrc.match(/^import /gm) || []).length === 1 && /from '\.\/checkoutPricing'/.test(libSrc) && !/settlementCurrency/.test(rd('lib/checkoutPricing.ts')))
const m = roda(libSrc)

// a tabela aprovada pelo fundador
checa('Starter R$ 49,90 · anual R$ 499,00', m.BRL_PLAN_PRICES_MINOR.starter.monthly === 4990 && m.BRL_PLAN_PRICES_MINOR.starter.annual === 49900)
checa('Creator R$ 99,90 · anual R$ 999,00', m.BRL_PLAN_PRICES_MINOR.basic.monthly === 9990 && m.BRL_PLAN_PRICES_MINOR.basic.annual === 99900)
checa('Studio R$ 199,90 · anual R$ 1.999,00', m.BRL_PLAN_PRICES_MINOR.pro.monthly === 19990 && m.BRL_PLAN_PRICES_MINOR.pro.annual === 199900)
checa('a tabela é exatamente o que a fórmula da casa dá sobre $9,90/$19,90/$39,90 (invariante vazio)', m.checkSettlementInvariants({ starter: 990, basic: 1990, pro: 3990 }).length === 0)
checa('o invariante ACUSA uma tabela torta', m.checkSettlementInvariants({ starter: 1490, basic: 1990, pro: 3990 }).length === 1)
checa('fórmula: termina em ,90 e nunca abaixo de R$ 1,90', m.usdToBrlMinor(490) === 2490 && m.usdToBrlMinor(1990) === 9990 && m.usdToBrlMinor(0) === 190 && m.usdToBrlMinor(1) === 190)
checa('plano: anual em BRL vem da TABELA (10× o mensal), não da fórmula sobre o anual em USD', m.planSettlementAmountMinor('starter', 'annual', 'brl', 9900) === 49900 && m.usdToBrlMinor(9900) !== 49900)
checa('plano em USD: devolve o próprio preço de lista', m.planSettlementAmountMinor('pro', 'monthly', 'usd', 3990) === 3990 && m.settlementAmountMinor(1990, 'usd') === 1990)

// a decisão
const dec = (i) => m.resolveSettlementCurrency(i)
checa('americano (IP US, en-US) → USD', dec({ ipCountry: 'US', acceptLanguage: 'en-US,en;q=0.9' }).currency === 'usd')
checa('brasileiro (IP BR) → BRL por país', (() => { const d = dec({ ipCountry: 'BR', acceptLanguage: 'en-US' }); return d.currency === 'brl' && d.reason === 'ip_country' })())
checa('brasileiro em viagem (IP US, navegador pt-BR) → BRL por idioma', (() => { const d = dec({ ipCountry: 'US', acceptLanguage: 'pt-BR,pt;q=0.9,en;q=0.8' }); return d.currency === 'brl' && d.reason === 'language' })())
checa('português de Portugal (pt-PT) NÃO vira BRL', dec({ ipCountry: 'PT', acceptLanguage: 'pt-PT,pt;q=0.9' }).currency === 'usd')
checa('recusa anterior de cartão BR em sessão USD → BRL, mesmo com IP e idioma americanos', (() => { const d = dec({ ipCountry: 'US', acceptLanguage: 'en-US', priorBrazilianCardFailure: true }); return d.currency === 'brl' && d.reason === 'prior_br_card_failure' })())
checa('forçado pela casa (?currency=usd) vence tudo', dec({ ipCountry: 'BR', acceptLanguage: 'pt-BR', priorBrazilianCardFailure: true, forced: 'usd' }).currency === 'usd')
checa('forçado com lixo (?currency=eur) é ignorado', dec({ ipCountry: 'BR', forced: 'eur' }).currency === 'brl' && dec({ ipCountry: 'US', forced: 'eur' }).currency === 'usd')
checa('Índia segue em USD nesta versão (o trilho local da Índia é o Dodo)', dec({ ipCountry: 'IN', acceptLanguage: 'hi-IN,en;q=0.8' }).currency === 'usd')
checa('sem cabeçalho nenhum → USD', dec({}).currency === 'usd')

// a linha honesta
checa('formato brasileiro: R$ 49,90', m.formatSettlementMoney('brl', 4990) === 'R$ 49,90')
checa('nota só existe para quem paga em reais', m.settlementNote(4990, 'brl', 'mo') === 'Charged in BRL: R$ 49,90/mo' && m.settlementNote(4990, 'usd', 'mo') === null)

console.log('== a rota de checkout usa a decisão ==')
const rt = rd('app/api/stripe/checkout/route.ts')
checa('importa da fonte única', /import \{ planSettlementAmountMinor, resolveSettlementCurrency, settlementAmountMinor \} from '@\/lib\/settlementCurrency'/.test(rt))
checa('plano: decide DEPOIS de conhecer a pessoa (a recusa anterior é por user_id)', rt.indexOf('priorBrazilianCardFailure: await priorBrazilianCardFailure(user.id)') > rt.indexOf("const { data: { user }, error: authError } = await supabase.auth.getUser()"))
checa('plano: preço de lista (USD) continua sendo `unitAmount`; a cobrança é `chargeAmount` pela tabela', /const chargeAmount = tier === 'autopilot'\n\s+\? settlementAmountMinor\(unitAmount, chargeCurrency\)\n\s+: planSettlementAmountMinor\(tier, isAnnual \? 'annual' : 'monthly', chargeCurrency, unitAmount\)/.test(rt))
checa('plano: a linha da Stripe nasce na moeda de liquidação', /price_data: \{\n\s+currency: chargeCurrency,\n\s+product_data: \{\n\s+name: isAnnual \? `\$\{plan\.name\} \(Annual\)` : plan\.name,/.test(rt) && /unit_amount: chargeAmount,\n\s+recurring: \{ interval \},/.test(rt))
checa('plano: nenhuma linha de plano ficou em `currency,` cru dentro de price_data', !/price_data: \{\n\s+currency,\n/.test(rt))
checa('plano: success_url leva a moeda e o valor COBRADOS (telemetria e valor de conversão honestos)', /success_url: buildSubscriptionCheckoutSuccessUrl\(\{\n\s+appUrl,\n\s+tier,\n\s+currency: chargeCurrency,\n\s+amount: chargeAmount,\n\s+\}\)/.test(rt))
checa('plano: cancel_url carrega settle=<moeda> para a tela de retorno', /cancel_url: `\$\{appUrl\}\/checkout\/cancelled\?tier=\$\{tier\}&billing=\$\{billing\}&currency=\$\{currency\}&settle=\$\{chargeCurrency\}/.test(rt))
checa('plano: metadata da sessão grava moeda, motivo e preço de lista em USD', /settlement_currency: chargeCurrency,\n\s+settlement_reason: settlement\.reason,\n\s+list_price_usd_minor: String\(unitAmount\),/.test(rt))
checa('plano: a chave de idempotência mudou de versão e inclui a liquidação (sessão USD antiga não é reaproveitada)', /version: 8,[\s\S]{0,400}settlement_currency: chargeCurrency,\n\s+charge_amount: chargeAmount,/.test(rt))
checa('plano: reparo de "cannot combine currencies" cria o cliente novo pela moeda COBRADA', /\.update\(`\$\{user\.id\}:\$\{chargeCurrency\}:\$\{priorCustomerId\}`\)/.test(rt) && /currency_repair: chargeCurrency/.test(rt))
checa('plano: link privado do pack de $5 fica em USD (o cupom é em dólar)', /forced: privatePackPromo \? 'usd' : req\.nextUrl\.searchParams\.get\('currency'\)/.test(rt))
checa('Price id do Autopilot (USD) só entra quando a sessão é USD', /tier === 'autopilot' && chargeCurrency === 'usd' \? autopilotPriceIdOverride\(currency\) : null/.test(rt))
{
  const n = (rt.match(/const chargeAmount = settlementAmountMinor\(unitAmount, chargeCurrency\)/g) || []).length
  checa('SKUs avulsos (pack, $2,90, top-up, piloto, atacado): 5 builders decidem a moeda', n === 5)
  const nCur = (rt.match(/^\s+currency: chargeCurrency,$/gm) || []).length
  const nAmt = (rt.match(/^\s+unit_amount: chargeAmount,$/gm) || []).length
  checa('SKUs avulsos: price_data E chave de idempotência usam a moeda/valor cobrados (5×2 + plano)', nCur >= 11 && nAmt >= 11)
  checa('nenhum `unit_amount: unitAmount,` cru sobrou fora da assinatura de idempotência do plano', (rt.match(/^\s+unit_amount: unitAmount,$/gm) || []).length === 1)
}
checa('rede de segurança: lê checkout_payment_failed por user_id + card_country BR + moeda usd, via service role, e falha fechada', /async function priorBrazilianCardFailure\(userId: string\): Promise<boolean>/.test(rt) && /\.eq\('name', 'checkout_payment_failed'\)\n\s+\.eq\('user_id', userId\)\n\s+\.eq\('metadata->>card_country', 'BR'\)\n\s+\.eq\('metadata->>currency', 'usd'\)/.test(rt) && /\} catch \{\n\s+return false\n\s+\}/.test(rt.slice(rt.indexOf('async function priorBrazilianCardFailure'), rt.indexOf('async function priorBrazilianCardFailure') + 1200)))
checa('a rota NÃO fixa payment_method_types (a Stripe escolhe pela moeda: Pix só em BRL)', !/^[ \t]*payment_method_types:/m.test(rt))

console.log('== webhook e régua ==')
const wh = rd('app/api/stripe/webhook/route.ts')
const cp = rd('lib/checkoutPricing.ts')
checa('renovação passa a moeda da fatura pela régua com moeda', /const renewalCredits = renewalCreditsForInvoice\(renewalTier, invoice\.amount_paid, invoice\.currency\)/.test(wh) && /import \{ renewalCreditsForInvoice \} from '@\/lib\/settlementCurrency'/.test(wh))
checa('régua executada: fatura em reais no preço vigente (R$ 199,90) → grant vigente 300', m.renewalCreditsForInvoice('pro', 19990, 'brl') === 300)
checa('régua executada: fatura em reais abaixo da tabela (R$ 149,90) → legado 180', m.renewalCreditsForInvoice('pro', 14990, 'brl') === 180)
checa('régua executada: R$ 49,90 no Starter NÃO é comparado com 990 de dólar', m.renewalCreditsForInvoice('starter', 4990, 'brl') === 60)
checa('régua executada: fatura em dólar delega à fonte única (5900 no Studio = 300; 2900 = legado 180)', m.renewalCreditsForInvoice('pro', 5900, 'usd') === 300 && m.renewalCreditsForInvoice('pro', 2900, 'USD') === 180 && m.renewalCreditsForInvoice('pro', 2900, null) === 180)
checa('o tipo de exibição continua USD-only (nenhuma tela reabriu multi-moeda)', /export type CheckoutCurrency = 'usd'$/m.test(cp))

console.log('== telas ==')
const geo = rd('app/api/geo/route.ts')
checa('/api/geo devolve settlement_currency (IP + idioma; só exibição)', /settlement_currency: settlement\.currency/.test(geo) && /resolveSettlementCurrency\(\{ ipCountry: country, acceptLanguage: req\.headers\.get\('accept-language'\) \}\)/.test(geo))
const pr = rd('app/pricing/PricingClient.tsx')
checa('/pricing: o preço grande segue em dólar (p.price / annualPrices) — nada mudou no número', /\? annualPrices\[p\.tier as PaidTier\]\.perMonth\n\s+: p\.price\}/.test(pr))
checa('/pricing: a linha "Charged in BRL" só aparece quando o /api/geo diz brl', /\{settlementCurrency === 'brl' \? \(\n\s+<div className="mt-1 text-\[11\.5px\] font-medium text-\[#86868b\]" data-testid="settlement-note">/.test(pr))
checa('/pricing: a linha usa a TABELA (planSettlementAmountMinor) — mensal e anual', /planSettlementAmountMinor\(\n\s+p\.tier as PaidTier,\n\s+billing === 'annual' \? 'annual' : 'monthly',\n\s+'brl',/.test(pr))
checa('/pricing: estado nasce em usd (americano nunca vê a linha, nem por um frame)', /useState<SettlementCurrency>\('usd'\)/.test(pr))
const cc = rd('app/checkout/cancelled/page.tsx')
checa('/checkout/cancelled: com settle=brl diz o valor exato em reais', /const settleBrl = searchParams\.get\('settle'\) === 'brl'/.test(cc) && /Your card is charged in Brazilian reais: \$\{settleBrlLabel\}/.test(cc))
checa('/checkout/cancelled: sem settle, o texto é o de sempre', /: renewalCopyBase\n/.test(cc))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
