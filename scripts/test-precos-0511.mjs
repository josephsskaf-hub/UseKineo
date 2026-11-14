// KINEO-CREDITOS-B-0511 · KINEO-CARTAO-DUAS-CONTAS-0511 · KINEO-PRECOS-0511 [fundador 05/11: "1 sim, 2 sim"; print da página de preços]
// Prova: 40 / 150 / 470 com os mesmos preços; os 50% só no Starter e no Creator; o cartão mostra as duas contas, derivadas; a barra fixa de baixo saiu.
// Rodar: node scripts/test-precos-0511.mjs
import fs from 'node:fs'
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const F = { preco: 'lib/checkoutPricing.ts', oferta: 'lib/billing/annualWelcomeOffer.ts', bf: 'lib/billing/blackFriday2026.ts', conta: 'lib/contaDeFilmes.ts', cartao: 'components/pricing/PlanValueStage.tsx', pagina: 'app/pricing/PricingClient.tsx' }
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function prova(s) {
  const e = []
  const tc = s.preco.slice(s.preco.indexOf('export const TIER_CREDITS'))
  if (!/starter: 40,\n\s*basic: 150,\n\s*pro: 470,/.test(tc)) e.push('A1 créditos 40 / 150 / 470')
  if (!/starter: \{ usd: 900 \},\n\s*basic: \{ usd: 1900 \},\n\s*pro: \{ usd: 5900 \},/.test(s.preco)) e.push('A2 preços 9 / 19 / 59 não mudam')
  const intro = s.preco.slice(s.preco.indexOf('export const INTRO_CREDITS'))
  if (!/basic: 150,/.test(intro.slice(0, intro.indexOf('\n}')))) e.push('A3 o 1º mês acompanha o grant')
  if (!s.oferta.includes("const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic']")) e.push('B1 oferta de 50% sem o Studio')
  if (!/BF2026_TIERS: readonly CheckoutTier\[\] = \['starter', 'basic'\]/.test(s.bf)) e.push('B2 Black Friday sem o Studio')
  if (!/const ofertaNoPlano = \(tier: string\): boolean => annualOfferLive && annualOfferCoversTier\(tier\)/.test(s.pagina)) e.push('B3 a página decide por plano')
  if (!/annualMinorFor = \(tier: PaidTier\): number =>\n\s*ofertaNoPlano\(tier\) \? ANNUAL_WELCOME_PRICES/.test(s.pagina)) e.push('B4 o preço do cartão segue o plano')
  if (!/save \$\{ofertaNoPlano\(p\.tier\) \?/.test(s.pagina)) e.push('B5 o "save %" segue o plano')
  if (!/\{annualOfferLive \? <>Up to \{ANNUAL_WELCOME_DISCOUNT_PERCENT\}%<\/> : <>Save \{ANNUAL_DISCOUNT_PERCENT\}%<\/>\}/.test(s.pagina)) e.push('B6 o selo só promete 50% com a oferta aberta')
  if (!/creditsPerReferenceVideo\('cinematic_ai'\)/.test(s.conta) || !/kling4PaidCredits\(60\)/.test(s.conta) || !/kling4PaidCredits\(15\)/.test(s.conta)) e.push('C1 as contas saem dos créditos por motor')
  if (/\b(35|45|150)\b/.test(s.conta.replace(/^\/\/.*$/gm, ''))) e.push('C2 número digitado na conta')
  // WATCH adds a compact branch without removing the legacy card. Each branch must still show the derived film count.
  const filmBlocks = (s.cartao.match(/data-kineo="plano-filmes"/g) ?? []).length
  if (!s.cartao.includes('const filmes = contaDeFilmes(props.credits)') || filmBlocks !== (s.cartao.includes('if (props.compact)') ? 2 : 1)) e.push('C3 o cartão mostra a conta em cada apresentação')
  if (!s.cartao.includes("plural(filmes.padrao60, 'standard film', 'standard films')") || !s.cartao.includes('Kling 4.0')) e.push('C4 as duas contas no cartão')
  if (/mobile-sticky-cta|showStickyCta|mobileSticky/.test(s.pagina)) e.push('D1 a barra fixa de baixo saiu')
  return e
}
const base = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, ler(f)]))
const r0 = prova(base)
ok(r0.length === 0, `confere (${r0.join(' | ') || 'ok'})`)

// A conta de verdade, com os números do fundador: 150 = 4 padrão ou 1 Kling 4.0 de 60 s ou 3 de 15 s; 470 = 13 ou 3.
const conta = (credits) => ({ padrao60: Math.floor(credits / 35), kling60: Math.floor(credits / 150), kling15: Math.floor(credits / 45) })
ok(JSON.stringify(conta(150)) === JSON.stringify({ padrao60: 4, kling60: 1, kling15: 3 }), 'Creator: 4 padrão, ou 1 Kling 4.0 de 60 s, ou 3 de 15 s')
ok(conta(470).padrao60 === 13 && conta(470).kling60 === 3, 'Studio: 13 padrão, ou 3 Kling 4.0 de 60 s')
ok(conta(40).padrao60 === 1 && conta(40).kling15 === 0, 'Starter: 1 padrão, sem linha do Kling 4.0')

const MUT = [
  ['Creator volta a 85', /A1/, { preco: base.preco.replace('  basic: 150,\n  pro: 470,', '  basic: 85,\n  pro: 470,') }],
  ['preço muda', /A2/, { preco: base.preco.replace('basic: { usd: 1900 }', 'basic: { usd: 2900 }') }],
  ['1º mês esquecido', /A3/, { preco: base.preco.replace('  basic: 150, // KINEO-CREDITOS-B-0511', '  basic: 85,') }],
  ['Studio volta aos 50%', /B1/, { oferta: base.oferta.replace("const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic']", "const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic', 'pro']") }],
  ['Black Friday com Studio', /B2/, { bf: base.bf.replace("= ['starter', 'basic']", "= ['starter', 'basic', 'pro']") }],
  ['cartão ignora o plano', /B4/, { pagina: base.pagina.replace('ofertaNoPlano(tier) ? ANNUAL_WELCOME_PRICES', 'annualOfferLive ? ANNUAL_WELCOME_PRICES') }],
  ['selo promete 50% sempre', /B6/, { pagina: base.pagina.replace('{annualOfferLive ? <>Up to {ANNUAL_WELCOME_DISCOUNT_PERCENT}%</> : <>Save {ANNUAL_DISCOUNT_PERCENT}%</>}', 'Up to {ANNUAL_WELCOME_DISCOUNT_PERCENT}%') }],
  ['número digitado', /C[12]/, { conta: base.conta.replace("creditsPerReferenceVideo('cinematic_ai')", '35') }],
  ['cartão sem a conta', /C3/, { cartao: base.cartao.replace('data-kineo="plano-filmes"', '') }],
  ['cartão legado sem a conta', /C3/, { cartao: (() => { const at = base.cartao.lastIndexOf('data-kineo="plano-filmes"'); return base.cartao.slice(0, at) + base.cartao.slice(at).replace('data-kineo="plano-filmes"', '') })() }],
  ['barra de volta', /D1/, { pagina: base.pagina + '\n<div className="mobile-sticky-cta" />' }],
]
for (const [nome, esp, m] of MUT) {
  const mudou = Object.entries(m).some(([k, v]) => v !== base[k])
  ok(mudou && prova({ ...base, ...m }).some((x) => esp.test(x)), `mutante "${nome}" fica vermelho`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
