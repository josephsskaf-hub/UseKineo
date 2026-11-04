// KINEO-PLANOS-ABAS-0411 [fundador 04/11: "planos pessoa física e pessoa jurídica... teams plans e business plans"] — guardião sem rede.
// As duas portas do /pricing, sem preço novo: nenhum valor digitado; o Business continua lendo lib/businessPlan; o link antigo /pricing#business abre a aba certa.
import fs from 'node:fs'
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
const iEmp = pag.indexOf('data-testid="pricing-team-panel"'), iBiz = pag.indexOf('<PricingBusinessBlock onBuy'), iFimEmp = pag.indexOf('fim do painel de empresas')
checa('a grade de planos fica no painel de pessoas', iPess > 0 && iPess < iGrade && iGrade < iFimPess)
checa('o Business fica no painel de empresas', iFimPess < iEmp && iEmp < iBiz && iBiz < iFimEmp)
checa('o painel de pessoas é o padrão', pag.includes("useState<PricingAudience>('individual')"))
checa('os dois painéis seguem no HTML (hidden, não some da página)', pag.includes("hidden={audience === 'team'}") && pag.includes("hidden={audience !== 'team'}"))
checa('a barra fixa dos planos de pessoa some na aba de empresas', pag.includes("display: audience === 'team' ? 'none' : 'flex'"))
checa('o botão do Business continua no checkout de sempre', pag.includes("handleBuy('business')"))
const bloco = lf(fs.readFileSync('components/pricing/PricingBusinessBlock.tsx', 'utf8'))
checa('o preço do Business continua vindo de lib/businessPlan', bloco.includes('BUSINESS_PRICE_LABEL') && bloco.includes("from '@/lib/businessPlan'"))
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
