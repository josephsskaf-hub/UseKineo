// ═══════════════════════════════════════════════════════════════════════════
// A FRASE QUE O CLIENTE JÁ LÊ TEM DE CHEGAR ATÉ NÓS — 09/09/2026 (PORTA r8)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE GUARDIÃO NASCEU (medido, não suposto):
//
// Na noite de 08→09/09 a taxa de entrada de $1 falhou em 100% das tentativas:
// 3 linhas de `checkout_failed` com `card_trial`, 2 pessoas distintas, uma
// delas vinda do anúncio pago do Reddit (`utm_source=reddit`, `cpc`), que
// tentou comprar QUATRO vezes em 105 segundos e foi embora sem pagar nada.
//
// Todas as 3 linhas dizem a mesma coisa: `reason: "payment_session_failed"`.
// Isso é tudo que a casa guardou. A rota chama `checkoutFailureReason(msg)`,
// que corta a mensagem no primeiro ':' — de propósito, para que o código de
// motivo nunca carregue id de cliente, e-mail ou dado de pagamento. O efeito
// colateral é que "Payment session failed: <o que a Stripe disse>" perde
// exatamente a metade que explica a falha.
//
// E o detalhe que dói: a rota devolve
//     302 /pricing?checkout_error=<A FRASE INTEIRA>
// Ou seja, a explicação foi RENDERIZADA NA TELA das duas pessoas. Elas leram.
// Nós não. Uma rotação inteira foi gasta sondando os tipos do SDK da Stripe
// para redescobrir uma coisa que a Stripe já tinha dito por escrito, em
// inglês, para os dois clientes.
//
// O QUE ESTE GUARDIÃO EXIGE (o contrato, não a implementação):
//
//   1. A classificação olha a frase INTEIRA. É a única diferença que importa
//      em relação ao servidor: "Payment session failed: A" e "Payment session
//      failed: B" são o MESMO código para ele e têm de ser códigos diferentes
//      aqui. Se um dia a classificação voltar a olhar só o prefixo, esta
//      biblioteca não serve para nada e a verificação 2 fica vermelha.
//   2. Nada que identifique pessoa ou pagamento entra no evento. A regra de
//      privacidade do servidor não é relaxada por estar do lado do cliente:
//      e-mail, id de objeto da Stripe, chave e corrida longa de dígitos saem
//      ANTES de virar evento.
//   3. A tela que EXIBE a frase é a que grava — e continua exibindo. Um
//      guardião que aceitasse esconder o erro do cliente para "limpar" a
//      tela estaria protegendo o número errado.
//   4. Quem falhou vindo da porta de $1 é avisado de que não foi cobrado e
//      tem caminho de volta para o próprio rascunho.
//
// COMO ELE VERIFICA. A biblioteca é pura e não importa nada, então o Node a
// importa direto (`.ts`, type-stripping nativo) e as verificações de
// comportamento são EXECUÇÃO REAL, não casamento de texto. Só as verificações
// sobre a tela leem arquivo, porque JSX não se executa aqui.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
let falhou = 0
const check = (nome, condicao, detalhe = '') => {
  if (condicao) {
    ok += 1
    console.log(`  ok   ${nome}`)
  } else {
    falhou += 1
    console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

console.log('\n=== A frase que o cliente já lê tem de chegar até nós ===\n')

const lib = await import('../lib/growth/checkoutErrorSignal.ts')
const {
  classifyCheckoutError,
  redactCheckoutError,
  readCheckoutErrorSignal,
  checkoutErrorSignalTelemetry,
  CHECKOUT_ERROR_DETAIL_MAX,
} = lib

// A frase real que a Stripe devolveu em 09/09 (reconstruída na r7 a partir dos
// tipos do SDK; o formato "Received unknown parameter: <caminho>" é o da API).
const FRASE_REAL =
  'Payment session failed: Received unknown parameter: subscription_data[add_invoice_items][0][price_data][currency]'

// ───────────────────────────────────────────────────────────────────────────
// 1. COMPORTAMENTO — a classificação olha a frase inteira
// ───────────────────────────────────────────────────────────────────────────
check(
  'a falha real de 09/09 é classificada, não cai em unclassified',
  classifyCheckoutError(FRASE_REAL) === 'unknown_parameter',
  `classificou como ${classifyCheckoutError(FRASE_REAL)}`,
)

// ESTA é a verificação central. As duas frases têm prefixo IDÊNTICO até o
// primeiro ':' — que é tudo que o servidor guarda. Se a classificação também
// olhasse só o prefixo, as duas dariam o mesmo código e a biblioteca inteira
// seria decoração.
const mesmoPrefixoA = 'Payment session failed: Received unknown parameter: foo'
const mesmoPrefixoB = 'Payment session failed: No such price: the monthly plan'
const classeA = classifyCheckoutError(mesmoPrefixoA)
const classeB = classifyCheckoutError(mesmoPrefixoB)
check(
  'duas falhas com o MESMO prefixo até o ":" recebem códigos diferentes',
  classeA === 'unknown_parameter' && classeB === 'no_such_price' && classeA !== classeB,
  `A=${classeA} B=${classeB} — se forem iguais, a classificação olha só o prefixo, como o servidor`,
)

check(
  'frase vazia não vira uma classe: vira ausência de sinal',
  classifyCheckoutError('') === null && classifyCheckoutError(null) === null,
)

check(
  'frase desconhecida é marcada como unclassified, nunca descartada',
  classifyCheckoutError('something the house has never seen before') === 'unclassified',
)

// ───────────────────────────────────────────────────────────────────────────
// 2. PRIVACIDADE — a regra do servidor continua valendo aqui
// ───────────────────────────────────────────────────────────────────────────
const sujo =
  'Payment session failed for customer cus_QxAB12cd34 (buyer@example.com) using card 4242424242424242 key sk_live_51AbCdEfGh'
const limpo = redactCheckoutError(sujo)

check('a redação remove e-mail', !/buyer@example\.com/.test(limpo) && limpo.includes('<email>'), limpo)
check('a redação remove id de objeto da Stripe', !/cus_QxAB12cd34/.test(limpo) && limpo.includes('<id>'), limpo)
check('a redação remove corrida longa de dígitos (cartão)', !/4242424242424242/.test(limpo), limpo)
check('a redação remove chave de API', !/sk_live_51AbCdEfGh/.test(limpo) && limpo.includes('<key>'), limpo)

// Redigir demais também é uma falha: o que sobra tem de explicar a falha.
check(
  'a redação PRESERVA o vocabulário técnico que explica a falha',
  redactCheckoutError(FRASE_REAL).includes('unknown parameter')
    && redactCheckoutError(FRASE_REAL).includes('add_invoice_items'),
  redactCheckoutError(FRASE_REAL),
)

const longa = `Payment session failed: ${'x'.repeat(600)}`
const sinalLongo = readCheckoutErrorSignal(`?checkout_error=${encodeURIComponent(longa)}`)
check(
  'o texto gravado respeita o teto',
  sinalLongo !== null && sinalLongo.reason_detail.length <= CHECKOUT_ERROR_DETAIL_MAX,
  `${sinalLongo?.reason_detail.length} > ${CHECKOUT_ERROR_DETAIL_MAX}`,
)
check(
  'error_len reporta o tamanho ORIGINAL, denunciando o truncamento',
  sinalLongo !== null && sinalLongo.error_len === longa.length,
  `error_len=${sinalLongo?.error_len} original=${longa.length}`,
)

// ───────────────────────────────────────────────────────────────────────────
// 3. A COORTE — a porta de $1 é separável na consulta
// ───────────────────────────────────────────────────────────────────────────
const daPorta = readCheckoutErrorSignal(
  `?checkout_error=${encodeURIComponent(FRASE_REAL)}&intent_campaign=door_v2`,
)
const daFaixa = readCheckoutErrorSignal(
  `?checkout_error=${encodeURIComponent(FRASE_REAL)}&intent_campaign=card_entry`,
)
const doAnuncio = readCheckoutErrorSignal(
  `?checkout_error=${encodeURIComponent(FRASE_REAL)}&intent_campaign=reddit_sep09`,
)
check(
  'as DUAS superfícies da taxa de entrada (porta e faixa) são reconhecidas',
  daPorta?.from_card_entry === true && daFaixa?.from_card_entry === true,
  `door_v2=${daPorta?.from_card_entry} card_entry=${daFaixa?.from_card_entry}`,
)
check(
  'uma campanha que NÃO é a taxa de entrada não é contada como tal',
  doAnuncio?.from_card_entry === false && doAnuncio?.intent_campaign === 'reddit_sep09',
)
check(
  'campanha fora do formato aceito não é copiada da URL para o evento',
  readCheckoutErrorSignal(
    `?checkout_error=${encodeURIComponent(FRASE_REAL)}&intent_campaign=${encodeURIComponent('<script>x</script>')}`,
  )?.intent_campaign === null,
)
check(
  'sem erro na URL o sinal é nulo (a página normal não grava nada)',
  readCheckoutErrorSignal('?tier=basic') === null && readCheckoutErrorSignal('') === null,
)

const telemetria = checkoutErrorSignalTelemetry(daPorta)
check(
  'a telemetria carrega o campo que faltava (reason_detail) e a classe',
  telemetria.reason_detail === daPorta.reason_detail
    && telemetria.error_class === 'unknown_parameter'
    && telemetria.from_card_entry === true,
)

// ───────────────────────────────────────────────────────────────────────────
// 4. A TELA — quem exibe a frase é quem grava, e continua exibindo
// ───────────────────────────────────────────────────────────────────────────
const pricing = ler('app/pricing/PricingClient.tsx')

check(
  'a página de preços usa a fonte única do sinal',
  /import\s*\{[^}]*readCheckoutErrorSignal[^}]*\}\s*from\s*'@\/lib\/growth\/checkoutErrorSignal'/s.test(pricing),
)
check(
  "a página grava 'checkout_error_shown'",
  /trackEvent\(\s*\n?\s*'checkout_error_shown'/.test(pricing),
)
check(
  'o evento é montado pela fonte única, não à mão',
  /'checkout_error_shown',\s*\n?\s*checkoutErrorSignalTelemetry\(/.test(pricing),
)
check(
  'a frase do provedor CONTINUA na tela do cliente',
  /\{checkoutError\}/.test(pricing),
)
check(
  'quem falhou lê que não foi cobrado',
  /No payment was created and your card was not charged\./.test(pricing),
)
check(
  'o caminho de volta ao rascunho é condicionado a quem veio da taxa de entrada',
  /checkoutErrorSignal\?\.from_card_entry\s*\?/.test(pricing)
    && /href="\/studio\/create\?resume=card_entry"/.test(pricing),
)
check(
  'a volta ao rascunho é medida',
  /trackEvent\('checkout_error_recovery_clicked'/.test(pricing),
)
// Não regredir: o ramo mais antigo (setup failure) tem o seu próprio card.
check(
  'o card do checkout_setup_failure continua montado',
  /checkoutError && checkoutSetupFailure \?/.test(pricing)
    && /handleCheckoutSetupRetry/.test(pricing),
)

console.log(`\n${ok} ok · ${falhou} falha(s)\n`)
process.exit(falhou === 0 ? 0 : 1)
