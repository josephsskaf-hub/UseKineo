// KINEO-UPI-PLANOS-2026-09-11 — guardião de "assinatura pela Índia via Dodo".
//
// Ordem do fundador (11/09): "é possível fazer assinaturas com o Dodo para a
// Índia? quero sim, seria muito importante". O trilho já existia inteiro no
// servidor (checkout aceita tier=starter|creator|studio, webhook trata
// subscription.active/renewed/cancelled, produtos live configurados) — faltava
// o BOTÃO: a única peça do Dodo na vitrine vendia só o pacote de US$ 4,90.
// Regra da casa: peça sem superfície não existe (0 exposições = 0 vendas).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const pr = rd('app/pricing/PricingClient.tsx')
console.log('== o botão nasce fechado e só acende com o trilho vivo ==')
checa("estado localMethod começa null (nunca 'upi' por padrão)", /const \[localMethod, setLocalMethod\] = useState<'upi' \| null>\(null\)/.test(pr))
checa("só 'upi' vindo do /api/geo acende; qualquer outra coisa (pix, null, lixo) apaga", /setLocalMethod\(local_method === 'upi' \? 'upi' : null\)/.test(pr))
checa('o /api/geo é lido com local_method no tipo da resposta', /local_method\?: string \| null \}>/.test(pr))

console.log('== o botão em cada card pago ==')
checa('renderiza só com upi, só mensal, e nunca para quem já assina', /\{localMethod === 'upi' && billing === 'monthly' && !planSwitch\.subscribed && \(/.test(pr))
checa('leva ao checkout do Dodo com o tier do card (a rota traduz basic→creator, pro→studio)', /href=\{`\/api\/dodo\/checkout\?tier=\$\{p\.tier\}&utm_source=pricing_plan&utm_medium=local_method&utm_campaign=upi`\}/.test(pr))
checa('tem testid por tier e evento de clique com superfície e método', /data-testid=\{`plan-upi-\$\{p\.tier\}`\}/.test(pr) && /trackEvent\('local_method_clicked', \{ surface: 'pricing_plan', method: 'upi', tier: p\.tier, billing: 'monthly' \}\)/.test(pr))
checa('rótulo honesto: mensal, UPI / RuPay', /Pay monthly with UPI \/ RuPay →/.test(pr))
checa('o CTA principal (Stripe) continua intacto logo acima', /onClick=\{\(\) => handleBuy\(p\.tier as PaidTier\)\}/.test(pr))

console.log('== o servidor sustenta o botão ==')
const ck = rd('app/api/dodo/checkout/route.ts')
checa('checkout do Dodo aceita os nomes da casa (basic→creator, pro→studio)', /if \(tierRaw === 'basic'\) return 'creator'/.test(ck) && /if \(tierRaw === 'pro'\) return 'studio'/.test(ck))
const wh = rd('app/api/dodo/webhook/route.ts')
checa('webhook concede plano em subscription.active/renewed e revoga em cancelled/expired', /case 'subscription\.active':\n\s+case 'subscription\.renewed':/.test(wh) && /case 'subscription\.cancelled':\n\s+case 'subscription\.expired':/.test(wh))
const dodo = rd('lib/dodo.ts')
checa('só IN (upi) e BR (pix) têm método local; o botão de plano filtra para upi', /IN.*upi|upi.*IN/.test(dodo))
const geo = rd('app/api/geo/route.ts')
checa('/api/geo só devolve local_method com o trilho AO VIVO (dodoMode live)', /const local_method = dodoMode\(\) === 'live' \? planned : null/.test(geo))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
