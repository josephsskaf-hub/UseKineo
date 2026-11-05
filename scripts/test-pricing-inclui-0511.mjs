// KINEO-PRICING-INCLUI-0511 — guardião sem rede: o bloco só promete o que a Kineo cumpre.
import fs from 'node:fs'
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const COMP = 'components/pricing/PricingIncludes0511.tsx'
function prova(comp = ler(COMP), pag = ler('app/pricing/PricingClient.tsx')) {
  const e = []
  const texto = comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  if (/priority|24\s*(?:h|hours?)|24\/7|forever|unlimited|dedicated|premium voice|1080|4K/i.test(texto)) e.push('promessa que o produto não prova')
  if (!/MONTHLY_REFUND_DAYS/.test(texto) || !/ANNUAL_REFUND_DAYS/.test(texto) || /\b(?:7|14) days\b/.test(texto)) e.push('prazo de reembolso escrito à mão')
  if (!texto.includes('mailto:support@usekineo.com')) e.push('sem o canal real de suporte')
  if ((pag.match(/<PricingIncludes0511 \/>/g) ?? []).length !== 1) e.push('o bloco não está na página')
  if (!/Every paid plan includes/.test(texto)) e.push('o título precisa dizer plano pago: a conta grátis tem marca d’água')
  return e
}
const r = prova()
checa(`o bloco confere (${r.join('; ') || 'ok'})`, r.length === 0)
const terms = ler('app/terms/page.tsx')
checa('os termos seguem dando uso comercial', /commercial/i.test(terms))
const c = ler(COMP)
for (const [nome, mut, esperado] of [
  ['promete 24 horas', c.replace('Questions? Email us at', 'Support 24 hours at'), /não prova/],
  ['fila prioritária', c.replace('No watermark on your videos', 'Priority queue'), /não prova/],
  ['reembolso à mão', c.replace('${MONTHLY_REFUND_DAYS} days', '7 days'), /à mão/],
  ['sem e-mail', c.replace('mailto:support@usekineo.com', '#'), /canal real/],
  ['título para todos', c.replace('Every paid plan includes', 'Every plan includes'), /plano pago/],
]) checa(`mutante "${nome}" fica vermelho`, prova(mut).some((m) => esperado.test(m)))
console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
