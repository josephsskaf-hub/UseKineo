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
  /const mostrarPack = regiaoSemMandato\(pais\)/.test(comp) &&
    /const mostrar = mostrarPack \|\| mostrarMetodoLocal/.test(comp) &&
    /if \(!mostrar\) return null/.test(comp))
// Os dois gates são independentes de propósito: o Brasil ganha o botão de Pix
// SEM ganhar a compra única (lá o cartão fecha — 5 no checkout, 1 pagamento),
// e a Índia recebe os dois. Um gate só faria uma das duas coisas errado.
ok('o bloco da compra única depende do SEU gate, não do gate do método local',
  /\{mostrarPack && \(/.test(comp))
ok('o preço vem de `packPriceLabel()`, nunca escrito na copy',
  comp.includes('packPriceLabel()') &&
  !/\$4\.90/.test(comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
ok('a quantidade de créditos vem de `PACK_CREDITS.starter`',
  /\{PACK_CREDITS\.starter\}/.test(comp))
// A proteção continua a mesma, agora amarrada ao href DA COMPRA ÚNICA: ele tem
// de ser `?pack=` e nunca `?tier=`. Um `?tier=` aqui daria a um cartão que
// recusou mandato exatamente outro mandato, e a copy "no subscription" viraria
// mentira. (O botão do método local aponta para `/api/dodo/checkout?tier=` de
// propósito — lá o trilho é outro e o mandato é local.)
const hrefDoPack = comp.slice(comp.indexOf('const href ='), comp.indexOf('const href =') + 220)
ok('o botão da compra única aponta para `?pack=starter`, não para um plano',
  /\/api\/stripe\/checkout\?pack=starter/.test(hrefDoPack) && !/\?tier=/.test(hrefDoPack))
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
ok('a peça aceita as TRÊS superfícies e nada mais',
  /export type SuperficieDoPack = 'pricing' \| 'post_video' \| 'studio_step1'\n/.test(comp))
// A copy não pode ser a mesma nas duas: quem acabou de receber um filme NÃO
// foi recusado por ninguém, e perguntar "seu cartão foi recusado?" inventa um
// problema que a pessoa não tem.
ok('a copy muda com a superfície (não pergunta de recusa a quem não tentou pagar)',
  /COPY\[surface\]\.chapeu/.test(comp) && /COPY\[surface\]\.contexto/.test(comp))
// Ver B4: esta fatia era por contagem de caracteres e só acertava porque
// post_video é a ÚLTIMA entrada do Record. Passa a cortar na fronteira.
ok('a superfície pós-filme NÃO fala em cartão recusado',
  (() => {
    const i = comp.indexOf('post_video: {')
    const fim = comp.indexOf('\n  },', i)
    return i > 0 && fim > i && !/declined/i.test(comp.slice(i, fim))
  })())
// A promessa que precisa ser verdadeira nas DUAS telas.
ok('as duas superfícies prometem a mesma coisa verificável: compra única',
  /no subscription/i.test(comp) && /one-time payment/i.test(comp))

// ── BLOCO B4 — A TERCEIRA SUPERFÍCIE, E É A MAIS LARGA DAS TRÊS ───────────
// Medido em 07/09 (30 dias, por PESSOA, coorte IN/NG/PK/BD/KE de 164):
//   /pricing 46 · pós-filme 45 · as duas juntas 70 · ESTE grid 78 · união 86.
// 16 pessoas passam pelo grid do Studio e NUNCA tocam nas outras duas telas.
//
// ⚠️ A ARMADILHA QUE QUASE ESCONDEU ESTE NÚMERO: `NOT IN (select user_id ..)`
// devolve NULL para TODA linha quando a subconsulta tem um único user_id nulo,
// e o "exclusivo" saiu 0 — contradizendo a própria união, que subia de 70 para
// 86. Com `NOT EXISTS` o 16 apareceu. Coorte nunca se mede com NOT IN.
console.log('\nB4. a terceira superfície (o grid do Studio alcança 78 das 86)')

const cards = ler('components', 'PricingCards.tsx')
ok('montada no grid do Studio, com UMA linha',
  /^\s*<RegionalFirstPack surface="studio_step1" \/>$/m.test(cards))
ok('importada de components/ no grid do Studio',
  /import RegionalFirstPack from '@\/components\/RegionalFirstPack'/.test(cards))
// Se ela nascesse ABAIXO do grid, quem já decidiu "não consigo assinar" teria
// de rolar de volta — e o rodapé dela diz "right below", que viraria mentira.
ok('a montagem fica ACIMA do grid de planos (avulso primeiro)',
  cards.indexOf('<RegionalFirstPack surface="studio_step1" />') > 0 &&
  cards.indexOf('<RegionalFirstPack surface="studio_step1" />') <
    cards.indexOf('grid mx-auto gap-4 grid-cols-1 md:grid-cols-3'))
// O denominador honesto: inline_pricing_currency_resolved dispara na MESMA
// chamada /api/geo, para TODO visitante desta tela. É o par que dispara igual.
ok('o denominador honesto dispara na MESMA tela e pela MESMA chamada de geo',
  /pricing_surface: 'generate_step_1',/.test(cards) &&
  /inline_pricing_currency_resolved/.test(cards))
// A pessoa neste grid ainda não recebeu filme e ninguém recusou o cartão dela.
//
// ⚠️ A FATIA CORTA NA FRONTEIRA DA ENTRADA, não em N caracteres. A primeira
// versão desta asserção lia 400 chars a partir de 'studio_step1: {' e caía
// dentro da entrada SEGUINTE do Record — que legitimamente diz "declined" — e
// falhou. A irmã dela (post_video) passava só por ser a ÚLTIMA entrada do
// COPY: bastaria alguém acrescentar uma quarta superfície depois dela para o
// mesmo falso vermelho aparecer lá. Janela por contagem não conhece fronteira.
const entradaCopy = (nome) => {
  const i = comp.indexOf(nome + ': {')
  if (i < 0) return ''
  const fim = comp.indexOf('\n  },', i)
  return fim > i ? comp.slice(i, fim) : ''
}
const copyStudio = entradaCopy('studio_step1')
ok('a entrada de copy do Studio foi encontrada e delimitada',
  copyStudio.length > 40 && !copyStudio.includes('pricing: {'), `${copyStudio.length} chars`)
ok('a copy do Studio NÃO inventa uma recusa que não houve',
  copyStudio.length > 0 && !/declined/i.test(copyStudio))
ok('nem fala em "keep making films" a quem ainda não fez nenhum',
  copyStudio.length > 0 && !/keep making/i.test(copyStudio))
// Antes o rodapé testava surface === 'pricing', então a terceira superfície
// herdaria "see the options above" estando ACIMA dos planos.
ok('o rodapé aponta para onde os planos realmente estão, por superfície',
  /surface === 'post_video' \? 'Prefer a monthly plan\? See the options above\.'/.test(comp))
ok('o grid do Studio NÃO ganhou uma segunda montagem por engano',
  (cards.match(/<RegionalFirstPack/g) ?? []).length === 1)

// ── BLOCO B3 — O MÉTODO LOCAL (UPI / Pix) ─────────────────────────────────
// "Aceitar UPI só para quem vem de IP da Índia" foi a ordem literal do
// fundador. As duas condições que a autorizam moram no SERVIDOR: existe chave
// do Dodo, e o país tem um método que a Stripe não faz. O navegador não pode
// responder nenhuma das duas — se ele pudesse, o botão apareceria para todo
// mundo e daria 503 na cara da pessoa.
console.log('\nB3. o método local (UPI / Pix) é decidido pelo servidor')

const geo = ler('app', 'api', 'geo', 'route.ts')
ok('o /api/geo só oferece método local quando a chave do Dodo EXISTE',
  /isDodoEnabled\(\) \? \(METODO_LOCAL_POR_PAIS\[country\] \?\? null\) : null/.test(geo))
ok('só Índia (UPI) e Brasil (Pix) entram — onde o Dodo faz o que a Stripe não faz',
  /IN: 'upi',/.test(ler('lib', 'dodo.ts')) && /BR: 'pix',/.test(ler('lib', 'dodo.ts')) &&
    !/(NG|PK|BD|KE): '/.test(ler('lib', 'dodo.ts')))
ok('a peça lê o método do servidor, não decide sozinha',
  /setMetodoLocal\(m && ROTULO_DO_METODO\[m\] \? m : null\)/.test(comp))
ok('valor inesperado da rede NÃO vira botão sem texto',
  /ROTULO_DO_METODO\[m\] \? m : null/.test(comp))
ok('o botão do método local aponta para o trilho do Dodo',
  /\/api\/dodo\/checkout\?tier=starter/.test(comp))
ok('o clique no método local tem evento próprio, com o método',
  /local_method_clicked/.test(comp) && /method: metodoLocal,/.test(comp))
// Índia vê os dois blocos; Brasil vê só o Pix. Sem estes dois campos as duas
// impressões seriam a mesma linha e ninguém saberia o que a pessoa viu.
ok('a impressão diz QUAL metade da peça apareceu',
  /pack_shown: mostrarPack,/.test(comp) && /local_method: metodoLocal,/.test(comp))

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
