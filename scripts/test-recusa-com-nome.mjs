// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-RECUSA-COM-NOME-2026-09-07
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO EXISTE PARA IMPEDIR, em uma frase: que a recusa de cartão
// volte a ser um beco sem saída.
//
// O defeito que ele tranca foi MEDIDO em 07/09 (base inteira, o instrumento
// nasceu em 03/09): das 3 linhas de `checkout_payment_failed` que existem, as
// 2 de RENOVAÇÃO têm dono e a única de COMPRA INICIAL veio com `user_id` NULL.
// A causa é estrutural, não azar: em `mode: 'subscription'` a Stripe cria o
// PaymentIntent a partir da FATURA, então `session.metadata` nunca chega ao
// intent; e o único plano B era `profiles.stripe_customer_id`, coluna escrita
// só quando um pagamento DÁ CERTO. Resultado: a casa só sabia nomear quem já
// tinha pagado — exatamente o oposto de quem a carta precisa alcançar.
//
// Duas famílias de verificação, e a diferença importa:
//   · COMPORTAMENTO (bloco A) — importa `lib/stripeCheckoutFailure.ts` DE
//     VERDADE (o módulo não usa alias `@/`, então roda em node puro) e chama a
//     função. Um mutante que troque o valor por uma constante morre aqui.
//   · TEXTO COM ÂNCORA (bloco B) — a escada de identidade mora no webhook, que
//     importa `@/lib/*` e não pode ser carregado fora do Next. Aqui a leitura é
//     do ARQUIVO REAL, e cada asserção é amarrada à VARIÁVEL QUE DECIDE
//     (`invoiceContext.ownerUserId`, `supabase` chegando ao resolvedor), nunca
//     a uma contagem de ocorrências — contar texto não prova condição.
//
// Rodar: node scripts/test-recusa-com-nome.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const falhas = []
let total = 0

function ok(nome, condicao, detalhe = '') {
  total += 1
  if (condicao) {
    console.log(`  ✓ ${nome}`)
  } else {
    console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
    falhas.push(nome)
  }
}

// ── BLOCO A — COMPORTAMENTO REAL DO CONSTRUTOR DE METADATA ────────────────
// `pathToFileURL` é obrigatório no Windows: um caminho `C:\...` cru é lido pelo
// loader ESM como se `c:` fosse protocolo, e o guardião morre antes da 1ª
// verificação — o mesmo jeito de um guardião ficar vermelho sem testar nada.
const mod = await import(
  pathToFileURL(path.join(raiz, 'lib', 'stripeCheckoutFailure.ts')).href
)
const { buildCanonicalStripeCheckoutFailure } = mod

const BASE = {
  paymentIntentId: 'pi_guardiao',
  hasInvoice: false,
  currency: 'usd',
  amountMinor: 2320,
  cardCountry: 'US',
  cardBrand: 'visa',
  cardFunding: 'prepaid',
  paymentMethodType: 'card',
  declineCode: 'transaction_not_allowed',
}

console.log('\nA. o construtor de metadata devolve a identidade (comportamento)')

// A recusa real de 07/09, do jeito que ela CHEGAVA antes deste ciclo: sem nada
// resolvido. O evento tem de dizer isso em voz alta, não omitir o campo.
const anonima = buildCanonicalStripeCheckoutFailure(BASE)
ok(
  'recusa sem identidade se declara anônima (`identity_source: none`)',
  anonima.identity_source === 'none',
  `veio ${JSON.stringify(anonima.identity_source)}`,
)
ok(
  'recusa sem identidade tem `owner_resolved: false` — e o campo EXISTE',
  anonima.owner_resolved === false && 'owner_resolved' in anonima,
)
ok(
  'sem sessão resolvida, `stripe_session_id` é null e não some do payload',
  'stripe_session_id' in anonima && anonima.stripe_session_id === null,
)

// A mesma recusa depois do conserto: a escada achou a sessão de checkout.
const comNome = buildCanonicalStripeCheckoutFailure({
  ...BASE,
  identitySource: 'checkout_session',
  ownerResolved: true,
  checkoutSessionId: 'cs_test_a1b2c3',
  subscriptionId: 'sub_test_a1b2c3',
  tier: 'pro',
  ipCountry: 'in',
  checkoutOrigin: 'pricing',
})
ok(
  '`identity_source` reflete a ENTRADA, não um valor fixo',
  comNome.identity_source === 'checkout_session' && anonima.identity_source === 'none',
  `${comNome.identity_source} vs ${anonima.identity_source}`,
)
ok(
  '`owner_resolved` reflete a ENTRADA (true aqui, false acima)',
  comNome.owner_resolved === true && anonima.owner_resolved === false,
)
ok(
  'o id da sessão de checkout viaja íntegro — é o caminho de volta à tentativa',
  comNome.stripe_session_id === 'cs_test_a1b2c3',
  String(comNome.stripe_session_id),
)
ok(
  'o id da assinatura viaja íntegro',
  comNome.stripe_subscription_id === 'sub_test_a1b2c3',
  String(comNome.stripe_subscription_id),
)
ok(
  '`tier` diz QUAL plano foi recusado',
  comNome.tier === 'pro',
  String(comNome.tier),
)
// O país é a razão de existir do ciclo de 07/09: sem ele não há como decidir
// se a Índia precisa de outro trilho de pagamento.
ok(
  '`ip_country` normaliza para ISO maiúsculo (in → IN)',
  comNome.ip_country === 'IN',
  String(comNome.ip_country),
)
ok(
  '`ip_country` e `card_country` são campos SEPARADOS e podem discordar',
  comNome.ip_country === 'IN' && comNome.card_country === 'US',
  `${comNome.ip_country}/${comNome.card_country}`,
)
ok(
  '`checkout_origin` diz de que tela veio a tentativa',
  comNome.checkout_origin === 'pricing',
  String(comNome.checkout_origin),
)

// Fonte de identidade inventada não pode virar fato: um `identity_source`
// desconhecido é rebaixado a `none`, senão qualquer string entraria no lugar
// de uma garantia.
ok(
  'fonte de identidade desconhecida é rebaixada a `none`',
  buildCanonicalStripeCheckoutFailure({ ...BASE, identitySource: 'chute' })
    .identity_source === 'none',
)
// Um id que não é de sessão (ex.: alguém passar a URL de recuperação, que é
// CREDENCIAL VIVA de pagamento) não pode ser gravado em repouso.
ok(
  'valor que não é id de sessão (`cs_`) é recusado, não gravado',
  buildCanonicalStripeCheckoutFailure({
    ...BASE,
    checkoutSessionId: 'https://checkout.stripe.com/c/pay/cs_live_segredo',
  }).stripe_session_id === null,
)
ok(
  'id de assinatura só é aceito com prefixo `sub_`',
  buildCanonicalStripeCheckoutFailure({ ...BASE, subscriptionId: 'cus_x' })
    .stripe_subscription_id === null,
)
// O que já funcionava não pode ter sido quebrado pela adição.
ok(
  'o motivo da recusa continua classificado (regressão do que já existia)',
  anonima.reason_category === 'card_restricted' && anonima.stage === 'initial',
  `${anonima.reason_category}/${anonima.stage}`,
)

// ── BLOCO B — A ESCADA DE IDENTIDADE NO WEBHOOK (arquivo real) ────────────
console.log('\nB. a escada de identidade está ligada no webhook (arquivo real)')

const webhook = readFileSync(
  path.join(raiz, 'app', 'api', 'stripe', 'webhook', 'route.ts'),
  'utf8',
)
// O arquivo vem com CRLF no checkout do Windows: normalizar ANTES de qualquer
// regex de duas linhas, senão o guardião fica vermelho por fim de linha.
const wh = webhook.replace(/\r\n/g, '\n')

// A prova mais importante do bloco: o dono do evento é o que a escada achou.
// Um mutante que volte a ler `failedIntent.metadata` direto morre aqui.
ok(
  'o `user_id` do evento vem de `invoiceContext.ownerUserId` (a escada), e de mais nada',
  /const failedUserId: string \| null = invoiceContext\.ownerUserId/.test(wh),
)
ok(
  'o resolvedor recebe o cliente do banco — sem ele os 2 últimos degraus são mudos',
  /resolvePaymentIntentInvoiceContext\(failedIntent, supabase\)/.test(wh),
)
ok(
  'o evento `checkout_payment_failed` é escrito COM esse user_id',
  /name: 'checkout_payment_failed',\n\s+userId: failedUserId,/.test(wh),
)

// Os 5 degraus, cada um provado pelo ATRIBUIÇÃO que o define — não pela
// palavra solta, que também apareceria num comentário.
const degraus = [
  ["1. metadata do próprio intent", /let ownerUserId: string \| null = paymentIntent\.metadata\?\.supabase_user_id/],
  ["2. assinatura da fatura", /identitySource = 'invoice_subscription'/],
  ["3. sessão de checkout", /identitySource = 'checkout_session'/],
  ["4. customer_id no perfil", /identitySource = 'customer_id'/],
  ["5. e-mail do customer (o único que alcança quem nunca pagou)", /identitySource = 'customer_email'/],
]
for (const [nome, re] of degraus) {
  ok(`degrau ${nome} atribui a fonte de identidade`, re.test(wh))
}

ok(
  'o degrau do e-mail busca o perfil por e-mail de verdade (ilike), não só declara',
  /\.ilike\('email', email\)/.test(wh),
)
ok(
  'a assinatura da fatura é lida (`invoice.subscription`), não só o billing_reason',
  /subscriptionId = stripeObjectId\(\s*\(invoice as Stripe\.Invoice & \{ subscription\?: unknown \}\)\.subscription,\s*\)/.test(wh),
)
ok(
  'a sessão é buscada pela assinatura — é a única fonte de `ip_country`',
  /resolvePorSessaoDeCheckout\(\{ subscription: subscriptionId \}\)/.test(wh),
)
ok(
  'compra avulsa (sem fatura) busca a sessão pelo próprio PaymentIntent',
  /resolvePorSessaoDeCheckout\(\{ payment_intent: paymentIntent\.id \}\)/.test(wh),
)

// A identidade é ENRIQUECIMENTO: se a Stripe estiver lenta ou recusar uma
// leitura, o registro da recusa tem de sobreviver. Cada degrau precisa do seu
// próprio catch — um try único derrubaria os degraus seguintes junto.
const corpoResolvedor = wh.slice(
  wh.indexOf('async function resolvePaymentIntentInvoiceContext'),
  wh.indexOf('async function isProtectedProfile'),
)
ok(
  'o resolvedor existe e foi encontrado inteiro',
  corpoResolvedor.length > 2000,
  `${corpoResolvedor.length} chars`,
)
ok(
  'cada degrau da escada tem o próprio catch (identidade nunca derruba o registro)',
  (corpoResolvedor.match(/\} catch \{/g) ?? []).length >= 5,
  `${(corpoResolvedor.match(/\} catch \{/g) ?? []).length} catches`,
)
ok(
  'o resolvedor NÃO lança: nenhum `throw` dentro dele',
  !/\bthrow\b/.test(corpoResolvedor),
)

// A falha de escrita do evento continua pedindo retry — regra da casa para
// webhook, e o conserto de identidade não pode tê-la afrouxado.
ok(
  'evento não persistido continua devolvendo erro que a Stripe re-tenta',
  /if \(!failureRecorded\) \{\s*\n\s*throw new RetryableCheckoutAnalyticsError/.test(wh),
)

// O campo novo é o CARIMBO DO DEPLOY: quem for medir o conserto separa o antes
// do depois por `metadata ? 'identity_source'`, nunca pelo relógio.
ok(
  'os campos de identidade chegam ao construtor a partir do contexto resolvido',
  /identitySource: invoiceContext\.identitySource/.test(wh) &&
    /ownerResolved: Boolean\(invoiceContext\.ownerUserId\)/.test(wh) &&
    /ipCountry: invoiceContext\.ipCountry/.test(wh),
)

console.log(
  `\n${total - falhas.length}/${total} verificações passaram.` +
    (falhas.length ? `\nFALHOU: ${falhas.join(' · ')}` : ''),
)
process.exit(falhas.length ? 1 : 0)
