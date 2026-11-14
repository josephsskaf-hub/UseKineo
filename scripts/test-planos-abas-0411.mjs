// KINEO-PLANOS-ABAS-0411 [fundador 04/11: "planos pessoa física e pessoa jurídica... teams plans e business plans"] — guardião sem rede.
// As duas portas do /pricing, sem preço novo: nenhum valor digitado; o Business continua lendo lib/businessPlan; o link antigo /pricing#business abre a aba certa.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const comp = lf(fs.readFileSync('components/pricing/PricingAudience.tsx', 'utf8'))
const pag = lf(fs.readFileSync('app/pricing/PricingClient.tsx', 'utf8'))
const codigo = comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
checa('nenhum preço digitado na aba nova', !/[$€£]\s*\d|\bUS\$|\d+\s*\/\s*mo\b/.test(codigo))
const m = createOfflineLoader({ source: (_r, t) => t })('lib/pricingAudience.ts')
checa('/pricing#business abre empresas', m.audienciaDoEndereco('#business', '') === 'team')
checa('?for=business abre empresas', m.audienciaDoEndereco('', '?for=business') === 'team')
checa('?for=team abre empresas', m.audienciaDoEndereco('', '?for=team') === 'team')
checa('sem nada abre pessoas', m.audienciaDoEndereco('', '') === 'individual' && m.audienciaDoEndereco('#faq', '?billing=annual') === 'individual')
const iPess = pag.indexOf('data-testid="pricing-individual-panel"'), iGrade = pag.indexOf('aria-label="Plans"'), iFimPess = pag.indexOf('fim do painel de pessoas')
checa('a grade de planos fica no painel de pessoas', iPess > 0 && iPess < iGrade && iGrade < iFimPess)
// WATCH option A adds a separate, closed preview. The legacy team panel now
// references a local JSX fragment; order of its definition is not DOM order.
function panelContract(source) {
  const watch = /const watchPricing\s*=/.test(source)
  const team = source.match(/<div hidden=\{audience !== 'team'\} data-testid="pricing-team-panel">([\s\S]*?)<\/div>/)?.[1] ?? ''
  const binding = source.match(/const businessPlans\s*=([^\n]+)/)?.[1] ?? ''
  const content = team.includes('{businessPlans}') ? binding : team
  return {
    'team-content': Boolean(team && content.includes('<PricingBusinessBlock onBuy') && content.includes('<PricingTeamsBlock')),
    'default': source.includes("useState<PricingAudience>('individual')"),
    'legacy-visibility': source.includes(watch ? "hidden={!watchPricing && audience === 'team'}" : "hidden={audience === 'team'}") && source.includes("hidden={audience !== 'team'}"),
    'watch-isolation': !watch || source.includes('{!watchPricing && <div hidden={audience !== \'team\'} data-testid="pricing-team-panel">'),
    'checkout': content.includes("handleBuy('business')"),
  }
}
const panels = panelContract(pag)
checa('o Business e Teams ficam no painel de empresas, inline ou por fragmento local', panels['team-content'])
checa('o painel de pessoas é o padrão', panels.default)
checa('os dois painéis legados seguem no HTML com sua condição hidden', panels['legacy-visibility'])
checa('a prévia WATCH não duplica o painel legado de empresas', panels['watch-isolation'])
checa('a barra fixa de baixo saiu da página (KINEO-PRECOS-0511)', !pag.includes('mobile-sticky-cta'))
checa('o botão do Business continua no checkout de sempre', panels.checkout)
const bloco = lf(fs.readFileSync('components/pricing/PricingBusinessBlock.tsx', 'utf8'))
checa('o preço do Business continua vindo de lib/businessPlan', bloco.includes('BUSINESS_PRICE_LABEL') && bloco.includes("from '@/lib/businessPlan'"))
const mutations = [
  ['Business ausente do fragmento', 'team-content', '<PricingBusinessBlock onBuy', '<PricingTeamsBlock onBuy'],
  ['Teams ausente do fragmento', 'team-content', '<PricingTeamsBlock />', '<span />'],
  ['painel não usa o fragmento', 'team-content', '{businessPlans}</div>', '{null}</div>'],
  ['pessoas sempre escondidas', 'legacy-visibility', "hidden={!watchPricing && audience === 'team'}", 'hidden={true}'],
  ['empresas duplica na prévia', 'watch-isolation', '{!watchPricing && <div hidden={audience !== \'team\'}', '{true && <div hidden={audience !== \'team\'}'],
  ['empresas abre por padrão', 'default', "useState<PricingAudience>('individual')", "useState<PricingAudience>('team')"],
  ['Business compra outro plano', 'checkout', "handleBuy('business')", "handleBuy('starter')"],
]
for (const [name, guard, from, to] of mutations) {
  const changed = pag.replace(from, to)
  assert.notEqual(changed, pag, 'mutante precisa aplicar: ' + name)
  assert.throws(() => assert(panelContract(changed)[guard], '[' + guard + ']'), error => error instanceof assert.AssertionError && error.message.startsWith('[' + guard + ']'), 'mutante deve falhar no alvo: ' + name)
  checa('mutante rejeitado: ' + name, true)
}
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
