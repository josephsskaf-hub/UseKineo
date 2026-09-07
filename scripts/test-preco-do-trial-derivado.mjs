// ═══════════════════════════════════════════════════════════════════════════
// O PREÇO DA PORTA DE $1 NAS DUAS CARTAS — DERIVADO, NUNCA DIGITADO (va-r4)
// ═══════════════════════════════════════════════════════════════════════════
//
// O que este guardião existe para impedir, nesta ordem:
//
//  1. QUE O NÚMERO SUMA DE NOVO. A rotação va-r3 trocou "$1" por um eufemismo
//     ("the checkout shows it in your own currency") apoiada numa premissa que
//     já estava morta havia 18 dias. Sem tripwire, a mesma troca acontece de
//     novo na próxima leitura apressada.
//  2. QUE O NÚMERO SEJA DIGITADO À MÃO. Se alguém escrever "$1" ou "$15" na
//     string, ele para de acompanhar a tabela de preço e vira a "COPY QUE
//     MENTE" do item 4 da auditoria de 28/08.
//  3. QUE A PREMISSA VOLTE A MUDAR EM SILÊNCIO. No dia em que
//     `CheckoutCurrency` ganhar um segundo valor, o rótulo resolvido sem país
//     volta a ser mentira — e este arquivo fica VERMELHO nesse instante.
//
// Estilo readFileSync de propósito: guardião com alias `@/` não roda
// (memória `guardioes-com-alias-nao-rodam` — 72 testes morriam no import).
import { readFileSync } from 'node:fs'

let n = 0, fail = 0
const ok = (cond, label) => {
  n++
  if (!cond) { fail++; console.log(`  FALHOU: ${label}`) }
  else console.log(`  ok: ${label}`)
}

const route = readFileSync('app/api/cron/trial-lifecycle-emails/route.ts', 'utf8')
const fee = readFileSync('lib/lifecycle/trialEntryFee.ts', 'utf8')
const pricing = readFileSync('lib/checkoutPricing.ts', 'utf8')
const checkout = readFileSync('app/api/stripe/checkout/route.ts', 'utf8')

console.log('\n── 1. A PREMISSA: uma moeda só, e o cobrador não consulta país')
// ESTA é a verificação que faltava na va-r3. Ela não descreve o e-mail; ela
// descreve a CONDIÇÃO sob a qual o e-mail pode escrever um número em dólar.
ok(
  /export type CheckoutCurrency = 'usd'\s*$/m.test(pricing),
  "CheckoutCurrency e uniao de UM valor ('usd') — se ganhar outro, o rotulo sem pais vira mentira e este teste fica vermelho",
)
ok(
  /export function resolveCheckoutCurrency\(_country[^)]*\)[^{]*\{\s*return 'usd'\s*\}/.test(pricing),
  'resolveCheckoutCurrency IGNORA o pais e devolve usd — o argumento comeca com _ e o corpo e um return unico',
)
ok(
  /export function resolvePriceRegion\(_country[^)]*\)[^{]*\{\s*return 'standard'\s*\}/.test(pricing),
  'resolvePriceRegion tambem ignora o pais (regiao unica)',
)
ok(
  /export const CARD_TRIAL_ENTRY_FEE_MINOR = (\d+)/.test(pricing),
  'a taxa de entrada e uma constante exportada da tabela de preco',
)
const feeMinor = Number(pricing.match(/export const CARD_TRIAL_ENTRY_FEE_MINOR = (\d+)/)[1])
const chargedMinor = Number(checkout.match(/const TRIAL_ENTRY_FEE_CENTS = (\d+)/)[1])
ok(
  feeMinor === chargedMinor,
  `a constante da tabela (${feeMinor}) e o valor que a Stripe cobra (${chargedMinor}) sao o MESMO numero`,
)
ok(
  /unit_amount: TRIAL_ENTRY_FEE_CENTS/.test(checkout) && /add_invoice_items/.test(checkout),
  'o item avulso do trial cobra exatamente essa constante (add_invoice_items/unit_amount)',
)

console.log('\n── 2. O MÓDULO: deriva, e nao digita')
ok(
  fee.includes('CARD_TRIAL_ENTRY_FEE_MINOR') && fee.includes('formatCheckoutMoney'),
  'o rotulo sai de formatCheckoutMoney sobre a constante do cobrador',
)
ok(
  fee.includes("getTierPrice('basic'"),
  'a mensalidade do depois sai de getTierPrice(basic) — o mesmo TRIAL_TIER que o cobrador assina',
)
// Nenhum valor de dinheiro digitado no módulo. Os comentários citam números
// históricos ("$1", "751 eventos"), então a varredura olha só o CÓDIGO.
const feeCode = fee
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
ok(
  !/\$\d|\b\d{3,}\b/.test(feeCode),
  'nenhum valor de dinheiro digitado no codigo do modulo (so nos comentarios que explicam)',
)
ok(
  /full\.endsWith\('\.00'\) \? full\.slice\(0, -3\) : full/.test(fee),
  'o corte do centavo e CONDICIONADO ao sufixo .00 — nunca um slice cego (licao do menino da bolha, 27/08)',
)

console.log('\n── 3. AS DUAS CARTAS: o numero chega ao assunto e ao corpo')
const d5 = route.slice(
  route.indexOf("if (c.kind === 'expired_offer_d5')"),
  route.indexOf("if (c.kind === 'expired_lastcall_d10')"),
)
const d10 = route.slice(route.indexOf("if (c.kind === 'expired_lastcall_d10')"))
ok(d5.length > 500 && d10.length > 500, 'blocos do D5 e do D10 localizados')

for (const [nome, bloco] of [['D5', d5], ['D10', d10]]) {
  ok(
    bloco.includes('${entryFee}'),
    `${nome}: o assunto interpola a taxa derivada (entryFee), nao uma frase sobre ela`,
  )
  ok(
    bloco.includes('${TRIAL_ENTRY_LINE}'),
    `${nome}: o corpo carrega a promessa inteira (entrada + mensalidade)`,
  )
  // A trava antiga, INTACTA e não afrouxada: nada de dinheiro digitado.
  ok(
    !/\$\d|USD|\b\d+\.\d\d\b/.test(bloco),
    `${nome}: sem preco literal digitado no bloco (regra do arquivo, mantida)`,
  )
  ok(
    !/your own currency|token entry fee/.test(bloco),
    `${nome}: o eufemismo da va-r3 nao voltou`,
  )
}
ok(
  !route.includes('one unit of money'),
  'a perifrase "one unit of money" saiu das duas cartas',
)

console.log('\n── 4. AMARRADO A VARIAVEL, NAO AO TEXTO')
// memória `guardiao-que-conta-texto-nao-prova-condicao`: um mutante que troque
// a fonte do número por um literal tem de morrer. Estas duas verificações são
// as que matam esse mutante.
ok(
  /const entryFee = trialEntryFeeLabel\(\{ compact: true \}\)/.test(route),
  'entryFee vem da funcao do modulo — trocar por um literal mata esta verificacao',
)
ok(
  /const TRIAL_ENTRY_LINE = `\$\{trialEntryFullPromise\(CARD_TRIAL_DAYS\)\}`/.test(route),
  'a linha da porta vem de trialEntryFullPromise, e os dias vem de CARD_TRIAL_DAYS (nao do numero 7 digitado)',
)
ok(
  route.includes("import { CARD_TRIAL_DAYS } from '@/lib/checkoutPricing'"),
  'os dias do trial saem da tabela de preco, nao de um 7 digitado na carta',
)

console.log('\n── 5. O QUE NAO PODE TER MUDADO (cupom e ramo sem filme)')
ok(
  (d5.match(/\$\{COMEBACK_CODE\}/g) || []).length >= 4,
  'o cupom continua vindo da constante COMEBACK_CODE',
)
ok(
  !/COMEBACK50/.test(d5) && !/COMEBACK50/.test(d10),
  'nenhum codigo de cupom literal nos dois blocos',
)
ok(
  (d5.match(/50% off Creator for 3 months/g) || []).length >= 3,
  'a oferta do cupom continua com a MESMA frase — nada novo prometido',
)
ok(
  d5.includes('if (c.videosMade >= 1)'),
  'o ramo com a porta continua sendo so o de quem TEM filme entregue',
)
ok(
  d5.includes("subject: 'Come back to Creator — 50% off for 3 months'"),
  'quem nunca fez um filme continua recebendo o assunto de hoje, intocado',
)

console.log('\n── 6. O CARIMBO SEPARA AS DUAS VERSOES DA CARTA')
// A va-r3 (eufemismo) e a va-r4 (numero) sao cartas DIFERENTES para quem le.
// Se as duas gravassem o mesmo `body`, a medicao nao saberia qual delas a
// pessoa recebeu — e a va-r3 chegou a ficar ~1h em producao, com uma rodada
// do cron possivel no meio (memoria `campo-novo-e-o-carimbo-do-deploy`: o
// corte se faz pelo campo novo, nunca pelo relogio).
for (const [nome, bloco] of [['D5', d5], ['D10', d10]]) {
  ok(
    bloco.includes("body: 'offer_with_film_1usd_priced'"),
    `${nome}: grava o carimbo da versao COM o numero`,
  )
}
ok(
  readFileSync('lib/lifecycle/trialFilmPlans.ts', 'utf8').includes("| 'offer_with_film_1usd_priced'"),
  'o tipo LossBody aceita o carimbo novo',
)

console.log(`\n${n - fail}/${n} verificacoes`)
if (fail > 0) process.exit(1)
