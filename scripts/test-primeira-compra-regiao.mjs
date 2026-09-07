// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-PRIMEIRA-COMPRA-POR-REGIAO-2026-09-07
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede: que a oferta de compra única apareça para quem
// não deveria vê-la, que ela prometa o que a Stripe não cobra, ou que ela seja
// medida contra um denominador que não dispara do mesmo jeito.
//
// Quatro perigos, cada um com história nesta casa:
//
//  1. VAZAR PARA O MUNDO INTEIRO. A limpeza de 14/07 tirou o pack do /pricing
//     porque o comprador via TRÊS ofertas antes dos cards. Esta peça só se
//     justifica por ser invisível fora de IN/NG/PK/BD/KE. Um país
//     `null`/`''`/desconhecido tem de FECHAR — durante a chamada de geo o país
//     é null, e um `?` virando "sim" mostraria a oferta a todo visitante do
//     planeta por alguns milissegundos de cada carregamento.
//  2. OFERECER O QUE O COBRADOR RECUSA. A copy afirma "one-time payment, no
//     subscription". Se `?pack=starter` virar assinatura, a peça passa a
//     oferecer a um cartão que recusa mandato exatamente outro mandato — e o
//     texto não acusaria. O bloco C lê o arquivo do checkout.
//  3. NÚMERO CRAVADO NA COPY. "$4.90" e "30" têm de sair da MESMA linha que a
//     Stripe cobra. Defeito já cometido duas vezes aqui (o `20` do Seedance, o
//     `25` do Starter).
//  4. MEDIR CONTRA O DENOMINADOR ERRADO. `pack_first_for_region_shown` só pode
//     ser comparado com `pricing_currency_resolved`, que dispara no MESMO
//     instante (a mesma chamada /api/geo) e para TODO visitante. Comparar com
//     montagem de página ou com checkout é laranja com maçã — foi assim que
//     "2 de 30" virou um número falso em 06/09.
//
// Rodar: node scripts/test-primeira-compra-regiao.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const falhas = []
let total = 0
const ok = (nome, cond, detalhe = '') => {
  total += 1
  if (cond) console.log(`  ✓ ${nome}`)
  else { console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); falhas.push(nome) }
}
const ler = (...p) => readFileSync(path.join(raiz, ...p), 'utf8').replace(/\r\n/g, '\n')

const comp = ler('components', 'RegionalFirstPack.tsx')
const pricing = ler('app', 'pricing', 'PricingClient.tsx')

// ── BLOCO A — QUEM VÊ A PEÇA (a condição, executada) ──────────────────────
console.log('\nA. quem vê a peça (decisão executada, não contada)')

const iRegioes = comp.indexOf('export const REGIOES_SEM_MANDATO')
const fimRegioes = comp.indexOf('\n', iRegioes)
const iFn = comp.indexOf('export function regiaoSemMandato(')
const fimFn = comp.indexOf('\n}\n', iFn)
ok('a lista de países e a decisão foram encontradas no arquivo real',
  iRegioes > 0 && iFn > 0 && fimFn > iFn)

const decide = new Function(
  comp.slice(iRegioes, fimRegioes).replace('export ', '').replace(' as const', '') + '\n' +
  comp.slice(iFn, fimFn + 3)
    .replace('export ', '')
    .replace(/: string \| null \| undefined/g, '')
    .replace(/: boolean/g, '')
    .replace(' as readonly string[]', '') + '\n' +
  'return regiaoSemMandato',
)()

for (const p of ['IN', 'NG', 'PK', 'BD', 'KE']) {
  ok(`${p} — 0 pagamentos em 30d com gente no checkout — VÊ a oferta`, decide(p) === true)
}
// Países que PAGAM não podem ver: mostrar compra de US$ 4,90 a quem já assina
// canibaliza receita recorrente.
for (const [p, nota] of [['US', '10 no checkout, 1 pagou'], ['BR', '5 e 1'], ['GB', '2 e 1'], ['DE', 'sem sinal']]) {
  ok(`${p} (${nota}) — NÃO vê a oferta`, decide(p) === false)
}
// O perigo nº 1, e ele acontece em TODO carregamento de página enquanto a
// chamada de geo está em voo.
ok('país ainda não resolvido (null) FECHA — não vaza durante o fetch de geo',
  decide(null) === false && decide(undefined) === false)
ok('país vazio ou só espaço FECHA', decide('') === false && decide('   ') === false)
ok('minúscula ainda é o mesmo país (`in` = IN)', decide('in') === true)
ok('país desconhecido FECHA em vez de abrir', decide('XX') === false && decide('INDIA') === false)

// ── BLOCO B — A PEÇA E A MONTAGEM ─────────────────────────────────────────
console.log('\nB. a peça, a copy e a montagem de uma linha')

ok('a decisão é MESMO usada para renderizar, não só declarada',
  /const mostrar = regiaoSemMandato\(pais\)/.test(comp) && /if \(!mostrar\) return null/.test(comp))
ok('o preço vem de `packPriceLabel()`, nunca escrito na copy',
  comp.includes('packPriceLabel()') &&
  !/\$4\.90/.test(comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
ok('a quantidade de créditos vem de `PACK_CREDITS.starter`',
  /\{PACK_CREDITS\.starter\}/.test(comp))
ok('o botão aponta para a compra ÚNICA (`?pack=starter`), não para um plano',
  /\/api\/stripe\/checkout\?pack=starter/.test(comp) && !/\?tier=/.test(comp))
ok('o link é etiquetado (senão a venda chega ao painel como tráfego direto)',
  /utm_medium=regional_pack/.test(comp) && /utm_campaign=first_pack_no_mandate/.test(comp))
ok('a impressão é contada UMA vez, e só quando a peça aparece',
  /if \(!mostrar \|\| jaContou\.current\) return/.test(comp))
ok('a impressão carrega o país (sem ele o número não separa Índia de Quênia)',
  /pack_first_for_region_shown',\s*\{\s*\n\s*country: pais,/.test(comp))
// Sem `surface` no evento, as duas telas viram um número só e ninguém sabe
// qual delas vendeu — que é a única pergunta que a segunda montagem levanta.
ok('a impressão diz de QUAL tela veio (`surface`), e não um literal fixo',
  /^\s*surface,$/m.test(comp) && !/surface: 'pricing'/.test(comp))
ok('o clique também diz de qual tela veio',
  (comp.match(/^\s*surface,$/gm) ?? []).length >= 2)
ok('o link etiqueta a tela de origem (senão as duas vendas viram uma)',
  /utm_source=\$\{surface\}/.test(comp))
ok('a impressão carrega o carimbo de versão da tela (o corte do deploy)',
  /surface_version: REGIONAL_FIRST_PACK_VERSION/.test(comp) &&
  /REGIONAL_FIRST_PACK_VERSION = 'regional_first_pack_v1'/.test(comp))
ok('o clique tem evento próprio', /pack_first_for_region_clicked/.test(comp))
ok('a peça não promete desconto, cupom nem crédito de graça',
  !/(discount|coupon|% off|free credits|sale)/i.test(
    comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
ok('a peça é cliente (`use client`) — ela resolve o próprio país',
  comp.trimStart().startsWith("'use client'"))

// A montagem: UMA linha, acima dos planos, e nada mais tocado.
ok('montada em /pricing com UMA linha', /^\s*<RegionalFirstPack \/>$/m.test(pricing))
ok('a montagem fica ACIMA do bloco de planos (avulso primeiro)',
  pricing.indexOf('<RegionalFirstPack />') < pricing.indexOf('<div id="plans"') &&
  pricing.indexOf('<RegionalFirstPack />') > 0)
ok('a peça é importada de components/', /import RegionalFirstPack from '@\/components\/RegionalFirstPack'/.test(pricing))
ok('o denominador honesto continua vivo na MESMA página e com o MESMO país',
  /pricing_currency_resolved/.test(pricing))

// ── BLOCO B2 — A SEGUNDA SUPERFÍCIE ───────────────────────────────────────
// /pricing alcança 46 das 86 pessoas dos cinco países; a tela pós-filme
// alcança 47 — e não são a mesma gente. Uma montagem só deixaria metade da
// coorte sem ver nada, que é o erro de medir o alcance DEPOIS de ligar.
console.log('\nB2. a segunda superfície (a tela pós-filme alcança 47 das 86)')

const gen = ler('app', '(dashboard)', 'generate', 'GenerateClient.tsx')
ok('montada também na tela pós-filme, com UMA linha',
  /\{phase === 'done' && <RegionalFirstPack surface="post_video" \/>\}/.test(gen))
ok('importada de components/ na tela pós-filme',
  /import RegionalFirstPack from '@\/components\/RegionalFirstPack'/.test(gen))
// DELIVER-FIRST: 107 pessoas já foram embora sem o arquivo por causa de um
// card acima do download. Esta peça fica depois de tudo que entrega.
ok('fica DEPOIS do NextActionCard (deliver-first intacto)',
  gen.indexOf('<RegionalFirstPack surface="post_video" />') >
    gen.indexOf('<NextActionCard surface="generate_done_screen" />'))
ok('a peça aceita as duas superfícies e nada mais',
  /export type SuperficieDoPack = 'pricing' \| 'post_video'/.test(comp))
// A copy não pode ser a mesma nas duas: quem acabou de receber um filme NÃO
// foi recusado por ninguém, e perguntar "seu cartão foi recusado?" inventa um
// problema que a pessoa não tem.
ok('a copy muda com a superfície (não pergunta de recusa a quem não tentou pagar)',
  /COPY\[surface\]\.chapeu/.test(comp) && /COPY\[surface\]\.contexto/.test(comp))
ok('a superfície pós-filme NÃO fala em cartão recusado',
  !/declined/i.test(comp.slice(comp.indexOf('post_video: {'), comp.indexOf('post_video: {') + 400)))
// A promessa que precisa ser verdadeira nas DUAS telas.
ok('as duas superfícies prometem a mesma coisa verificável: compra única',
  /no subscription/i.test(comp) && /one-time payment/i.test(comp))

// ── BLOCO C — A OFERTA É O QUE A PEÇA DIZ QUE É ───────────────────────────
console.log('\nC. a compra única é mesmo única (arquivos do checkout e do preço)')

const checkout = ler('app', 'api', 'stripe', 'checkout', 'route.ts')
const iPack = checkout.indexOf('async function buildPackAndRedirect')
const proximo = checkout.indexOf('async function buildStarter290AndRedirect')
const pack = checkout.slice(iPack, proximo > iPack ? proximo : iPack + 12000)
ok('o handler do pacote foi encontrado', pack.length > 1000, `${pack.length} chars`)
ok("`?pack=starter` é `mode: 'payment'` — cobrança ÚNICA, sem mandato",
  /mode: 'payment'/.test(pack))
ok('e NÃO cria assinatura (senão a copy "no subscription" vira mentira)',
  !/mode: 'subscription'/.test(pack))

const precos = ler('lib', 'checkoutPricing.ts')
ok('o pacote continua a US$ 4,90', /PACK_PRICE_MINOR[^=]*=\s*\{ usd: 490 \}/.test(precos))
ok('o pacote continua com 30 créditos', /starter: 30,/.test(precos))
// A margem: 30cr a $4,90 é +36,3% (documentado em lib/checkoutPricing.ts). O
// SKU de $2.90/25cr perde $0,78 por venda — ele NÃO pode entrar aqui por
// engano num refactor futuro.
ok('a peça NÃO oferece o SKU de $2.90, que dá prejuízo por venda',
  !/starter290/.test(comp))

console.log(
  `\n${total - falhas.length}/${total} verificações passaram.` +
    (falhas.length ? `\nFALHOU: ${falhas.join(' · ')}` : ''),
)
process.exit(falhas.length ? 1 : 0)
