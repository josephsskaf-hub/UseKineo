// KINEO-PRECO-CIFRAO-0611 — fundador 06/11: "o cifrão está esquisito". O preço grande não usa número de largura fixa
// (abria vão no "1") e o símbolo sai menor e no alto, nos cartões; o preço de empresa só fica menos pesado.
import { readFileSync } from 'node:fs'
const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const cartao = ler('components/pricing/PlanValueStage.tsx')
const empresa = ler('components/pricing/PricingBusinessBlock.tsx')
let falhas = 0
const ok = (nome, v) => { console.log(`  ${v ? 'ok ' : 'FALHA'}  ${nome}`); if (!v) falhas++ }
const regra = (src, sel) => (src.match(new RegExp(`(?:^|\n)${sel.replace(/[.]/g, '\.')}\{[^}]*\}`)) ?? [''])[0]

ok('preço grande sem largura fixa', regra(cartao, '.pv-amount') !== '' && !regra(cartao, '.pv-amount').includes('tabular-nums'))
ok('número de filmes sem largura fixa', regra(cartao, '.pv-films-n') !== '' && !regra(cartao, '.pv-films-n').includes('tabular-nums'))
ok('contagens do cartão sem largura fixa', regra(cartao, '.pv-n') !== '' && !regra(cartao, '.pv-n').includes('tabular-nums'))
ok('tabela por motor segue alinhada', regra(cartao, '.pv-table td b').includes('tabular-nums'))
ok('cifrão menor e no alto', /\.pv-cur\{[^}]*top:-\.62em[^}]*font-size:\.56em/.test(cartao))
ok('cartão usa o símbolo separado', cartao.includes('className="pv-cur"'))
ok('preço de empresa sem peso excessivo', /\.kb-biz-price\{[^}]*font-weight:700;letter-spacing:-\.03em/.test(empresa))

const src = /export function partesDoPreco[\s\S]*?\n}/.exec(cartao)?.[0] ?? ''
const re = new RegExp(/exec\(amount/.test(src) ? /\/(\^.*\$)\/\.exec/.exec(src)[1] : '$^')
const partes = (s) => { const m = re.exec(s.trim()); return m ? [m[1], m[2]] : null }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
ok('$19', igual(partes('$19'), ['$', '19']))
ok('R$ 94,90', igual(partes('R$ 94,90'), ['R$', '94,90']))
ok('US$1,299', igual(partes('US$1,299'), ['US$', '1,299']))
ok('₹499', igual(partes('₹499'), ['₹', '499']))
ok('traço fica inteiro', partes('—') === null)
ok('símbolo no fim fica inteiro', partes('9 €') === null)
if (falhas) { console.error(`${falhas} FALHA(S)`); process.exit(1) }
console.log('TUDO OK')
