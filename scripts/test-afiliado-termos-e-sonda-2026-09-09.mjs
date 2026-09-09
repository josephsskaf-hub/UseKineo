// KINEO-AFILIADO-TERMOS-2026-09-09 — AF-09/AF-10/AF-11: a sonda existe, os termos
// aprovados pelo fundador moram numa fonte só, e as duas superfícies do afiliado
// (/partners e painel) leem dela em vez de digitar.
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

const src = rd('lib/affiliateCommission.ts')
checa('lib pura (sem import)', !/^import /m.test(src))
const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const exp = {}; vm.runInNewContext(js, { exports: exp })
checa('decisões do fundador na fonte: mínimo 20, dia 15, carência 30, bônus 3, teto 20', exp.AFFILIATE_PAYOUT_MIN_USD === 20 && exp.AFFILIATE_PAYOUT_DAY_OF_MONTH === 15 && exp.AFFILIATE_HOLD_DAYS === 30 && exp.AFFILIATE_ACTIVATION_BONUS_USD === 3 && exp.AFFILIATE_ACTIVATION_BONUS_CAP === 20)
checa('frase de repasse derivada (30 days, 15th, $20 minimum, roll over)', /30 days after/.test(exp.AFFILIATE_PAYOUT_TERMS) && /by the 15th/.test(exp.AFFILIATE_PAYOUT_TERMS) && /\$20 minimum/.test(exp.AFFILIATE_PAYOUT_TERMS) && /roll over/.test(exp.AFFILIATE_PAYOUT_TERMS))
checa('frase do bônus derivada ($3, first 20, paid together, never separate)', /\$3 after/.test(exp.AFFILIATE_BONUS_TERMS) && /first 20 affiliates/.test(exp.AFFILIATE_BONUS_TERMS) && /paid together with your first commission, never as a separate payout/.test(exp.AFFILIATE_BONUS_TERMS))
checa('comissão continua 30%', exp.AFFILIATE_COMMISSION_RATE === 0.3)

const partners = rd('app/partners/page.tsx')
checa('/partners: "When do I get paid?" usa AFFILIATE_PAYOUT_TERMS e pede o PayPal', /When do I get paid\?', a: `[^`]*\$\{AFFILIATE_PAYOUT_TERMS\}[^`]*PayPal/.test(partners))
checa('/partners: FAQ do bônus usa AFFILIATE_BONUS_TERMS', /Is there a bonus for my first customer\?', a: AFFILIATE_BONUS_TERMS/.test(partners))
checa('/partners: nenhum "$50", "Net-30" ou "US$ 3" digitado', !/\$50\b|Net-30|US\$ ?3\b/.test(partners))
const painel = rd('app/(dashboard)/affiliate/page.tsx')
checa('painel do afiliado mostra os termos ao lado dos números, da fonte', /data-testid="affiliate-payout-terms"/.test(painel) && /\{AFFILIATE_PAYOUT_TERMS\} \{AFFILIATE_BONUS_TERMS\}/.test(painel) && /from '@\/lib\/affiliateCommission'/.test(painel))

const sonda = rd('docs/queries/SONDA-AFILIADO-2026-09-09.sql')
checa('sonda existe e cobre as 5 etapas (clique, referral, pagamento, comissão, painel)', /affiliate_clicks/.test(sonda) && /affiliate_referrals/.test(sonda) && /payment_success/.test(sonda) && /affiliate_commissions/.test(sonda) && /'painel'/.test(sonda) && /5ENEDG6F/.test(sonda))
checa('sonda é só leitura', !/\b(update|insert|delete|alter|drop)\b/i.test(sonda.replace(/--[^\n]*/g, '')))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — termos de afiliado numa fonte, nas duas telas, e a sonda do funil pronta')
