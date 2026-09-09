// KINEO-RESTAURACAO-2026-09-09 — APOSENTADO ENQUANTO A FONTE DISSER QUE ISTO ESTÁ DESLIGADO.
// Fundador (09/09 18h): "tira esse negócio de 1 dólar" / "voltar na minha melhor fase". Este guardião
// guarda a taxa de entrada de $1 chegando na Stripe. Se a fonte religar, o preâmbulo deixa de disparar e as verificações voltam.
import { readFileSync as __rf } from 'node:fs'
import { join as __j, dirname as __d } from 'node:path'
import { fileURLToPath as __f } from 'node:url'
{
  const __raiz = __j(__d(__f(import.meta.url)), '..')
  const __src = __rf(__j(__raiz, 'lib/checkoutPricing.ts'), 'utf8').replace(/\r\n/g, '\n')
  if (/export const CARD_TRIAL_LIVE = false/.test(__src)) {
    console.log('APOSENTADO (restauração 09/09/2026): a taxa de entrada de $1 chegando na Stripe está desligado na fonte (lib/checkoutPricing.ts). Volta a valer sozinho no dia em que religar.')
    process.exit(0)
  }
}
// ═══════════════════════════════════════════════════════════════════════════
// A TAXA DE ENTRADA DE $1 PRECISA CHEGAR NA STRIPE — 09/09/2026 (rotina PORTA)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE GUARDIÃO NASCEU (fato medido, não hipótese):
//
// Em 09/09 02:16:43 UTC a porta de $1 (`card_entry_door`, version `door_v2`)
// teve a PRIMEIRA impressão com pessoa real da sua história. Oito segundos
// depois, 02:16:51, teve o PRIMEIRO clique. A porta ganhou a disputa: a pessoa
// tinha acabado de dispensar o `trial_downgrade_modal` com "stay_free" e mesmo
// assim clicou no $1.
//
// E 800 ms depois, 02:16:52, veio `checkout_failed`:
//     stage=redirect · reason=payment_session_failed · card_trial="1"
//     tier=basic · intent_campaign=door_v2
// A pessoa foi despejada em /pricing?checkout_error=..., viu o welcome20,
// dispensou, olhou os packs de agência, bateu no exit intent e foi embora.
//
// Contagem da coorte inteira, história completa, no dia em que este arquivo
// nasceu: `card_trial` aparece em EXATAMENTE dois eventos de compra —
// `checkout_cta_clicked` (o clique) e `checkout_failed` (a parede). Zero
// `checkout_started`. Zero `payment_success`. **A taxa de entrada de $1 nunca
// abriu uma sessão de checkout — nem uma vez.**
//
// A CAUSA (falsificada, não deduzida). O bloco do trial pago anexa o item de
// $1 em `subscription_data.add_invoice_items`. Esse parâmetro NÃO EXISTE em
// `Stripe.Checkout.SessionCreateParams.SubscriptionData` — ele existe em
// Invoices e em Subscriptions, não na criação de uma Checkout Session. A
// Stripe responde `Received unknown parameter` e a rota devolve
// "Payment session failed: …", que `checkoutFailureReason()` corta no primeiro
// ":" e grava como `payment_session_failed`, jogando fora a frase da Stripe.
//
// POR QUE O `tsc` FICOU VERDE O TEMPO TODO. `sessionParams` É anotado como
// `Stripe.Checkout.SessionCreateParams`. Mas o item entra por SPREAD
// CONDICIONAL — `...(wantsTrial && !isAnnual ? { add_invoice_items: [...] } : {})`
// — e TypeScript não faz excess property check em spread. Provado nesta
// rotação com as duas formas lado a lado no mesmo arquivo:
//     forma direta ...... error TS2353: 'add_invoice_items' does not exist
//                         in type 'SubscriptionData'
//     forma por spread .. NENHUM erro
// É o caso do "campo validado e ecoado não é campo honrado": a anotação existe,
// o caminho por onde o campo entra é que escapa dela.
//
// O QUE ESTE GUARDIÃO EXIGE (e o que ele deliberadamente NÃO exige):
// Ele não tem opinião gravada sobre a API da Stripe. Ele LÊ os tipos do SDK
// instalado e re-deriva a verdade ali, toda vez. Se um dia a Stripe passar a
// aceitar `add_invoice_items` na Checkout Session e o SDK for atualizado, este
// guardião fica verde sozinho, sem ninguém editar nada. Ele também não manda
// COMO cobrar o dólar — só exige que, enquanto a porta anunciar uma taxa de
// entrada, o parâmetro que a carrega exista no SDK que vai ser chamado.
//
// ⚠ ELE NASCE VERMELHO, DE PROPÓSITO. O conserto mora em `app/api/stripe/*`,
//   caminho que a rotina da noite está proibida de tocar. O patch pronto está
//   na branch `salvo/porta-taxa-entrada-line-item` e o pedido, com a evidência,
//   em docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md. Vermelho aqui = o dólar ainda
//   não é cobrável. Verde = a porta finalmente tem para onde levar quem clica.

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

console.log('\n=== A taxa de entrada de $1 precisa chegar na Stripe ===\n')

// ───────────────────────────────────────────────────────────────────────────
// 1. A VERDADE DO SDK INSTALADO — re-derivada, nunca cravada.
// ───────────────────────────────────────────────────────────────────────────
const tiposCheckout = ler('node_modules/stripe/types/Checkout/SessionsResource.d.ts')

// A janela do `namespace SubscriptionData`: é ali, e só ali, que vale a
// pergunta. `add_invoice_items` EXISTE no SDK — em Invoices e Subscriptions —
// então procurar o nome no pacote inteiro responderia a pergunta errada.
const iSubData = tiposCheckout.indexOf('interface SubscriptionData {')
check('os tipos da Checkout Session declaram SubscriptionData', iSubData > 0)

const fimSubData = tiposCheckout.indexOf('\n      }', iSubData)
const blocoSubData = iSubData > 0 ? tiposCheckout.slice(iSubData, fimSubData) : ''

const sdkAceitaAddInvoiceItems = /\badd_invoice_items\??:/.test(blocoSubData)
const sdkAceitaTrialPeriodDays = /\btrial_period_days\??:/.test(blocoSubData)

// Âncora de sanidade: se esta linha cair, a leitura do bloco quebrou e as
// respostas abaixo não valem nada — um bloco vazio diria "não aceita" sobre
// TUDO, inclusive sobre o que a Stripe aceita desde sempre.
check(
  'a leitura do bloco funciona (trial_period_days É aceito no SubscriptionData)',
  sdkAceitaTrialPeriodDays,
  'o bloco lido não contém nem trial_period_days — a janela está errada',
)

// ───────────────────────────────────────────────────────────────────────────
// 2. A PORTA REALMENTE COBRA UMA TAXA DE ENTRADA? (senão nada disto importa)
// ───────────────────────────────────────────────────────────────────────────
const precos = ler('lib/checkoutPricing.ts')
const mTaxa = precos.match(/CARD_TRIAL_ENTRY_FEE_MINOR\s*=\s*(\d+)/)
check('lib/checkoutPricing exporta CARD_TRIAL_ENTRY_FEE_MINOR', Boolean(mTaxa))
const taxaMinor = mTaxa ? Number(mTaxa[1]) : 0
const casaCobraEntrada = taxaMinor > 0
check(
  'a casa cobra uma taxa de entrada (fonte única, não literal)',
  casaCobraEntrada,
  `CARD_TRIAL_ENTRY_FEE_MINOR = ${taxaMinor}`,
)

// ───────────────────────────────────────────────────────────────────────────
// 3. O CONTRATO — enquanto cobramos entrada, o parâmetro que a carrega
//    tem de existir no SDK que será chamado.
// ───────────────────────────────────────────────────────────────────────────
const rota = ler('app/api/stripe/checkout/route.ts')

const iTrial = rota.indexOf('const CARD_TRIAL_ENABLED')
check('a rota tem o bloco do trial com cartão', iTrial > 0)

// ⚠ A FORMA DE CHAVE, NUNCA O NOME SOLTO. A primeira versão deste guardião
// usava /add_invoice_items/ e continuava vermelha mesmo com o conserto
// aplicado — porque o COMENTÁRIO que explica a mecânica do trial pago também
// escreve o nome do parâmetro. A mutação pegou isso na hora: troquei a chave
// por outra, e o guardião não mudou de cor. Só conta como envio o que aparece
// como CHAVE de objeto (`add_invoice_items:`), que é a única forma que a
// Stripe chega a ver.
const usaAddInvoiceItems = /\badd_invoice_items\s*:/.test(rota)

// O coração. Amarrado à variável que decide, não a uma contagem de texto:
// se o SDK não aceita o parâmetro, a rota não pode enviá-lo enquanto houver
// taxa a cobrar.
check(
  'a taxa de entrada NÃO é anexada por um parâmetro que o SDK não aceita',
  !(casaCobraEntrada && usaAddInvoiceItems && !sdkAceitaAddInvoiceItems),
  usaAddInvoiceItems && !sdkAceitaAddInvoiceItems
    ? 'a rota envia subscription_data.add_invoice_items e o SDK instalado NÃO declara esse campo em '
      + 'Checkout.SessionCreateParams.SubscriptionData — a Stripe devolve "Received unknown parameter" '
      + 'e a pessoa que clicou na porta cai em /pricing?checkout_error='
    : '',
)

// E o outro lado da mesma moeda: se cobramos entrada, ela tem de sair por
// ALGUM parâmetro vivo. `line_items` é o único caminho que a Checkout Session
// oferece para um item avulso ao lado do recorrente (price_data.product_data
// existe lá, e é onde o item de $1 pertence).
const iLineItems = tiposCheckout.indexOf('interface LineItem {')
const sdkAceitaLineItemPriceData = iLineItems > 0
  && /price_data\??:/.test(tiposCheckout.slice(iLineItems, iLineItems + 4000))
check('o SDK aceita line_items[].price_data (o caminho vivo do item avulso)', sdkAceitaLineItemPriceData)

// ───────────────────────────────────────────────────────────────────────────
// 4. A PORTA CONTINUA APONTANDO PARA O TRIAL (o clique não pode virar
//    assinatura cheia por acidente enquanto isto estiver quebrado).
// ───────────────────────────────────────────────────────────────────────────
const politica = ler('lib/entryPolicy.ts')
const mCaminho = politica.match(/CARD_ENTRY_CHECKOUT_PATH\s*=\s*[`'"]([^`'"]+)[`'"]/)
check('lib/entryPolicy exporta CARD_ENTRY_CHECKOUT_PATH', Boolean(mCaminho))
const caminho = mCaminho ? mCaminho[1] : ''
check('o caminho da porta pede o trial (trial=1)', /\btrial=1\b/.test(caminho), caminho)
check('o caminho da porta é mensal (billing=monthly)', /billing=monthly/.test(caminho), caminho)

// ───────────────────────────────────────────────────────────────────────────
// 5. A FRASE DA STRIPE NÃO PODE SER JOGADA FORA (foi por isto que esta noite
//    precisou de um probe de tipos para descobrir o que a Stripe já tinha dito).
// ───────────────────────────────────────────────────────────────────────────
const iRazao = rota.indexOf('function checkoutFailureReason')
const corpoRazao = iRazao > 0 ? rota.slice(iRazao, iRazao + 400) : ''
const cortaNoDoisPontos = /split\(\s*['"]:['"]\s*\)\s*\[\s*0\s*\]/.test(corpoRazao)
check(
  'documentado: checkoutFailureReason corta a mensagem no primeiro ":"',
  cortaNoDoisPontos,
  'se isto mudou, o comentário do topo deste arquivo precisa ser relido',
)

console.log(`\n${ok} ok · ${falhou} falhas\n`)
if (falhou > 0) {
  console.log('A porta de $1 leva a pessoa para uma parede. Detalhe e patch pronto:')
  console.log('  docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md · branch salvo/porta-taxa-entrada-line-item\n')
  process.exit(1)
}
