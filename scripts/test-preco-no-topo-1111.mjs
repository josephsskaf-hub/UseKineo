// KINEO-PRECO-NO-TOPO-1111 [CEO 11/11, tarefa 5 do fundador "design mais bonito"]: no /pricing do celular o preço fica ao lado do nome do plano
// (no topo do cartão), o Starter de US$ 9 é o 1º cartão (a ordem do computador) e o aviso de moeda desce para baixo dos cartões. Não muda
// qual aba abre, preço nem texto de oferta: o preço do topo é o MESMO das props do bloco de baixo. Offline: renderiza o PlanValueCard real.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const STAGE = 'components/pricing/PlanValueStage.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  const stage = loader({}, o)(STAGE.replace(/\.tsx$/, ''))
  const props = (tier, name, popular, extra = {}) => ({
    tier, name, popular, requested: false, credits: { starter: 40, basic: 150, pro: 470 }[tier], ctaLabel: `Get ${name}`, ctaDisabled: false,
    onBuy() {}, onSelect() {}, selected: popular, included: ['No watermark'], amount: '$9', per: '/month', ...extra,
  })
  // 1) O preço do topo é o mesmo do bloco de baixo, com o riscado e o "por" de cada aba.
  for (const [nome, extra] of [['mensal', {}], ['anual', { amount: '$6.33', was: '$9', per: '/month, $76 billed yearly' }], ['1º mês com desconto', { amount: '$6.30', was: '$9', per: 'first month, then $9/month' }]]) {
    const html = renderToStaticMarkup(React.createElement(stage.PlanValueCard, props('starter', 'Starter', false, extra)))
    const topo = html.match(/<span class="pv-toprice"[^>]*>([\s\S]*?)<\/span><\/span><\/div>/)
    ok(topo, `${nome}: o preço do topo existe, dentro da linha do nome`)
    const baixo = html.match(/<div class="pv-price">([\s\S]*?)<\/div>/)[1]
    const valor = s => text(s).replace(/\s/g, '')
    ok(valor(topo[1]) === valor(baixo.replace(/<span class="pv-per">[\s\S]*?<\/span>/, '')), `${nome}: o topo mostra o mesmo preço do bloco de baixo (${valor(topo[1])})`)
    ok(html.includes(`<p class="pv-toper">${extra.per ?? '/month'}</p>`), `${nome}: o "por" fica logo abaixo do preço do topo`)
    ok(html.indexOf('pv-toprice') < html.indexOf('pv-films'), `${nome}: o preço vem antes da lista`)
  }
  // 2) CSS: no computador nada muda; no celular o topo aparece, o de baixo some, e o Creator não sobe mais para o 1º lugar.
  const css = src(STAGE)
  const base = css.slice(0, css.indexOf('@media (max-width:900px)'))
  const cel = css.slice(css.indexOf('@media (max-width:900px)'))
  ok(/\.pv-toprice\{display:none;/.test(base) && /\.pv-toper\{display:none;/.test(base), 'computador: o preço do topo fica escondido (o cartão segue igual)')
  ok(/\.pv-toprice\{display:block\}/.test(cel) && /\.pv-toper\{display:block\}/.test(cel), 'celular: o preço aparece ao lado do nome')
  ok(/\.pv-buy \.pv-price\{display:none\}/.test(cel) && !/\.pv-buy \.pv-price\{display:none\}/.test(base), 'celular: o preço de baixo some (sem repetir); computador: fica')
  ok(!/\.pv-card\[data-popular=true\]\{order:-1\}/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'celular: o Creator não pula mais para antes do Starter')
  ok(!/\.pv-card\[data-tier=[^\]]*\]\{order:/.test(css), 'nenhuma outra troca de ordem')
  // 3) /pricing: com os cartões novos, o aviso de moeda vem DEPOIS dos cartões (e uma vez só).
  const p = src(PRICING)
  const ini = p.indexOf('<section className="pv-stage"')
  const fim = p.indexOf('</section>', ini)
  ok(ini > 0 && fim > ini, 'palco dos cartões encontrado')
  const nota = p.indexOf('data-testid="pricing-currency-note">{CHECKOUT_CURRENCY_DISCLOSURE}</p>')
  ok(nota > fim && nota - fim < 200, 'o aviso de moeda vem logo depois dos cartões')
  ok(/\{valueCards \? null : \(\n\s*<p className="-mt-5 mb-7 text-center text-\[12px\][^\n]*\n\s*\{CHECKOUT_CURRENCY_DISCLOSURE\}/.test(p), 'antes dos cartões novos o aviso não aparece (só no palco antigo)')
}

all()
const real = passed
const s = p => read(p)
const mutants = [
  ['preço do topo some', { [STAGE]: s(STAGE).replace(/<span className="pv-toprice" data-kineo="preco-no-topo">[^\n]*\n/, '') }],
  ['topo mostra outro número', { [STAGE]: s(STAGE).replace('<span className="pv-toprice-n">{preco ? <><span className="pv-cur">{preco.simbolo}</span>{preco.valor}</> : props.amount}</span>', '<span className="pv-toprice-n">{props.was ?? props.amount}</span>') }],
  ['topo perde o riscado', { [STAGE]: s(STAGE).replace('<span className="pv-toprice" data-kineo="preco-no-topo">{props.was ? <span className="pv-was">{props.was}</span> : null}', '<span className="pv-toprice" data-kineo="preco-no-topo">') }],
  ['Creator volta a pular para o 1º lugar', { [STAGE]: s(STAGE).replace('@media (max-width:900px){.pv-grid{grid-template-columns:1fr;gap:20px}', '@media (max-width:900px){.pv-grid{grid-template-columns:1fr;gap:20px}.pv-card[data-popular=true]{order:-1}') }],
  ['computador também perde o preço de baixo', { [STAGE]: s(STAGE).replace('.pv-toprice{display:none;margin-left:auto', '.pv-buy .pv-price{display:none}.pv-toprice{display:none;margin-left:auto') }],
  ['celular repete o preço', { [STAGE]: s(STAGE).replace('.pv-buy .pv-price{display:none}', '') }],
  ['aviso de moeda volta para cima', { [PRICING]: s(PRICING).replace('{valueCards ? null : (', '{true ? (').replace(/\r?\n\s*<p className="mt-5 mb-2 text-center text-\[12px\] font-semibold text-\[var\(--muted\)\]" data-testid="pricing-currency-note">\{CHECKOUT_CURRENCY_DISCLOSURE\}<\/p>[^\r\n]*/, '') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-preco-no-topo-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
