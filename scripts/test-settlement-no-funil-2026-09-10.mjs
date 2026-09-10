// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PAGAR-SETTLEMENT-NO-FUNIL-2026-09-10
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTE GUARDIÃO PROTEGE
//
// A casa cobra brasileiro em REAIS desde 09/09 ~23:30 UTC, mas o funil em
// `events` não sabia disso: medido em 10/09, as 4 sessões criadas depois do
// deploy da moeda local tinham `settlement_currency` em 0 de 4. O campo só
// existia na metadata da SESSÃO da Stripe, que nenhuma consulta do funil lê.
//
// Pior que a ausência: o nome `currency` significa coisas DIFERENTES em três
// eventos do mesmo funil — em `checkout_started` é o preço de LISTA (sempre
// 'usd'), em `checkout_session_expired` e `payment_success` é a moeda REAL da
// Stripe. A sessão cs_live_b1mHUNPE… gravou started.currency='usd' e fechou em
// payment_success.currency='brl'. Quem cruzar os dois lê uma troca de moeda
// que nunca houve.
//
// Este guardião trava as duas metades: o caminho de ASSINATURA passa a
// carimbar a liquidação no evento, e a parede do checkout passa a repetir a
// liquidação sob um nome que não colide, nos DOIS ramos (com dono e órfão).
//
// Estilo readFileSync de propósito: guardião com import de '@/' morre no
// import antes da primeira verificação.
import { readFileSync } from 'node:fs'

// CRLF: no checkout do Windows toda âncora de duas linhas quebra em silêncio e
// o guardião fica vermelho por causa do fim de linha, não do código. Normalizar
// na leitura é o que faz este arquivo dizer a verdade nas duas plataformas.
const semCR = (caminho) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
const checkout = semCR('app/api/stripe/checkout/route.ts')
const webhook = semCR('app/api/stripe/webhook/route.ts')

let ok = 0
let fail = 0
const check = (nome, condicao) => {
  if (condicao) {
    ok += 1
  } else {
    fail += 1
    console.error('  ✗ ' + nome)
  }
}

// ── 1. O caminho de ASSINATURA carimba a liquidação no evento ──────────────
// Amarrado às VARIÁVEIS que decidem, não a texto solto: `chargeCurrency` é o
// que vai para a Stripe e `settlement.reason` é o porquê. Um mutante que
// troque por literais ('brl', 'usd') derruba estas quatro.
check(
  'checkout: checkoutMetadata recebe settlement_currency = chargeCurrency',
  /settlement_currency:\s*chargeCurrency\s*,/.test(checkout)
)
check(
  'checkout: checkoutMetadata recebe settlement_reason = settlement.reason',
  /settlement_reason:\s*settlement\.reason\s*,/.test(checkout)
)
check(
  'checkout: settlement_amount_minor = chargeAmount (o valor REALMENTE cobrado)',
  /settlement_amount_minor:\s*chargeAmount\s*,/.test(checkout)
)
check(
  'checkout: list_price_usd_minor = unitAmount (o preço de lista, para auditoria)',
  /list_price_usd_minor:\s*unitAmount\s*,/.test(checkout)
)

// ── 2. A ORDEM importa, e ordem se prova por posição das âncoras ───────────
// O carimbo tem de acontecer DEPOIS de `chargeCurrency` existir e ANTES da
// emissão de `checkout_started` da assinatura. Um mutante que mova o bloco
// para depois da emissão deixa o evento cego de novo sem apagar uma linha.
const iChargeCurrency = checkout.indexOf('const chargeCurrency = settlement.currency')
const iCarimbo = checkout.indexOf('settlement_amount_minor: chargeAmount')
const iEmissaoAssinatura = checkout.indexOf("await recordCheckoutEvent(\n    'checkout_started',\n    user.id,")
check('checkout: âncora de chargeCurrency encontrada', iChargeCurrency > 0)
check('checkout: âncora do carimbo encontrada', iCarimbo > 0)
check('checkout: âncora da emissão de checkout_started da assinatura encontrada', iEmissaoAssinatura > 0)
check(
  'checkout: o carimbo vem DEPOIS de chargeCurrency ser resolvido',
  iChargeCurrency > 0 && iCarimbo > iChargeCurrency
)
check(
  'checkout: o carimbo vem ANTES da emissão de checkout_started',
  iEmissaoAssinatura > 0 && iCarimbo < iEmissaoAssinatura
)

// A emissão da assinatura tem de espalhar checkoutMetadata — é por aí que o
// carimbo viaja. Sem este spread, as quatro linhas acima ficam decorativas.
const blocoEmissao = iEmissaoAssinatura > 0 ? checkout.slice(iEmissaoAssinatura, iEmissaoAssinatura + 600) : ''
check(
  'checkout: a emissão de checkout_started espalha ...checkoutMetadata',
  /\.\.\.checkoutMetadata/.test(blocoEmissao)
)

// ── 3. O nome honesto: `currency` continua sendo o preço de LISTA ──────────
// A correção NÃO pode ter sido "trocar currency por chargeCurrency" — as ~15
// telas de preço e o guardião da moeda dependem de `currency` seguir em USD.
check(
  'checkout: checkoutMetadata ainda carrega `currency` (preço de lista) sem virar chargeCurrency',
  /let checkoutMetadata: Record<string, unknown> = \{\n\s*tier,\n\s*billing,\n\s*currency,/.test(checkout)
)

// ── 4. Os caminhos de PACK não regrediram ─────────────────────────────────
// Eles já carimbavam desde o deploy da moeda. Esta entrega conserta a metade
// que faltava, não substitui a que já funcionava.
const packsComSettlement = (checkout.match(/skuContext\.settlement_currency = chargeCurrency/g) || []).length
check(
  'checkout: os 5 caminhos de pack seguem carimbando skuContext.settlement_currency',
  packsComSettlement === 5
)

// ── 5. A parede do checkout: ramo COM DONO ────────────────────────────────
const iExpiredComDono = webhook.indexOf("name: 'checkout_session_expired',\n            userId: abandonedUserId,")
check('webhook: ramo com dono de checkout_session_expired encontrado', iExpiredComDono > 0)
const blocoComDono = iExpiredComDono > 0 ? webhook.slice(iExpiredComDono, iExpiredComDono + 4000) : ''
check(
  'webhook (com dono): settlement_currency vem da metadata da sessão da Stripe',
  /settlement_currency:\s*expiredSession\.metadata\?\.settlement_currency\s*\?\?\s*null/.test(blocoComDono)
)
check(
  'webhook (com dono): settlement_reason vem da metadata da sessão da Stripe',
  /settlement_reason:\s*expiredSession\.metadata\?\.settlement_reason\s*\?\?\s*null/.test(blocoComDono)
)
check(
  'webhook (com dono): list_price_usd_minor preservado para auditoria de receita',
  /list_price_usd_minor:\s*expiredSession\.metadata\?\.list_price_usd_minor\s*\?\?\s*null/.test(blocoComDono)
)
check(
  'webhook (com dono): `currency` da Stripe continua lado a lado, não foi substituído',
  /currency:\s*expiredSession\.currency\s*\?\?\s*null/.test(blocoComDono)
)

// ── 6. A parede do checkout: ramo ÓRFÃO ───────────────────────────────────
// Conta apagada derruba o INSERT com dono. Se a liquidação não vier aqui, ela
// não vem de lugar nenhum — e é justamente o caso em que o perfil não pode
// mais informar o país depois.
const iExpiredOrfao = webhook.indexOf("name: 'checkout_session_expired',\n              userId: null,")
check('webhook: ramo órfão de checkout_session_expired encontrado', iExpiredOrfao > 0)
const blocoOrfao = iExpiredOrfao > 0 ? webhook.slice(iExpiredOrfao, iExpiredOrfao + 2000) : ''
check(
  'webhook (órfão): settlement_currency sobrevive à conta apagada',
  /settlement_currency:\s*expiredSession\.metadata\?\.settlement_currency\s*\?\?\s*null/.test(blocoOrfao)
)
check(
  'webhook (órfão): settlement_reason sobrevive à conta apagada',
  /settlement_reason:\s*expiredSession\.metadata\?\.settlement_reason\s*\?\?\s*null/.test(blocoOrfao)
)
check(
  'webhook (órfão): orphaned_user segue marcado (o ramo não virou cópia do outro)',
  /orphaned_user:\s*true/.test(blocoOrfao)
)
check(
  'webhook: os dois ramos são blocos distintos',
  iExpiredComDono > 0 && iExpiredOrfao > iExpiredComDono
)

// ── 7. A fonte da liquidação segue de pé ──────────────────────────────────
// Sem estes campos na metadata da SESSÃO, o webhook lê null nos dois ramos e
// a instrumentação inteira fica verde medindo nada.
check(
  'checkout: a sessão da Stripe segue recebendo settlement_currency na metadata',
  /settlement_currency:\s*chargeCurrency\s*,\n\s*settlement_reason:\s*settlement\.reason\s*,\n\s*list_price_usd_minor:\s*String\(unitAmount\)/.test(checkout)
)

console.log(
  (fail === 0 ? '✅' : '❌') +
    ' test-settlement-no-funil-2026-09-10: ' +
    ok +
    ' ok, ' +
    fail +
    ' falhas'
)
process.exit(fail === 0 ? 0 : 1)
