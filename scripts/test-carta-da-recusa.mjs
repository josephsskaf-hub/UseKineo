// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-CARTA-DA-RECUSA-2026-09-07
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede, em uma frase: que a carta do cartão recusado saia
// para a pessoa errada, prometa o que a casa não sabe cobrar, ou fique muda.
//
// Três perigos concretos, cada um medido ou já cometido nesta casa:
//
//  1. ESCREVER PARA QUEM JÁ É CLIENTE. Das 3 recusas que existem, 2 são
//     RENOVAÇÃO de gente que já paga. A Stripe já tem régua de cobrança para
//     elas; uma carta nossa por cima é ruído para um cliente pagante.
//  2. OFERECER O QUE O COBRADOR RECUSA (memória `vitrine-oferece-o-que-o-
//     cobrador-recusa`). A segunda porta desta carta é o pacote de US$ 4,90 —
//     e ela só é honesta porque `?pack=starter` é `mode: 'payment'`, cobrança
//     ÚNICA. Se algum dia virar assinatura, esta carta passa a oferecer para
//     um cartão que recusou mandato exatamente outro mandato. O bloco C trava
//     isso lendo o arquivo do checkout.
//  3. CRAVAR NÚMERO NA COPY. "$4.90" e "30 créditos" têm de sair da MESMA
//     linha que a Stripe cobra (`PACK_CREDITS` / `packPriceLabel`), senão a
//     carta mente no dia em que o preço mudar — defeito que este repositório
//     já pegou duas vezes (o `20` do Seedance e o `25` do Starter).
//
// A rota importa `@/lib/*` e não roda fora do Next, então o bloco A exercita a
// DECISÃO PURA (funções exportadas de propósito para isto) e os blocos B/C
// leem os arquivos REAIS, sempre amarrados à variável que decide.
//
// Rodar: node scripts/test-carta-da-recusa.mjs
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

const rota = ler('app', 'api', 'admin', 'send-card-declined', 'route.ts')

// ── BLOCO A — A DECISÃO DE QUEM RECEBE (condição, não texto) ───────────────
// As funções são puras e exportadas; aqui elas são reimplementadas a partir do
// ARQUIVO REAL via `Function`, para que um mutante que troque o corpo por
// `true` seja pego. Não há import possível: a rota puxa `@/lib/*`.
console.log('\nA. quem recebe a carta (decisão exercitada, não contada)')

function extrair(nome) {
  const i = rota.indexOf(`export function ${nome}(`)
  if (i < 0) return null
  // O corpo vai até a linha que fecha a função na coluna 0.
  const fim = rota.indexOf('\n}\n', i)
  return fim < 0 ? null : rota.slice(i, fim + 3).replace(/^export /, '')
}

const fonteMerece = extrair('recusaMereceCarta')
const fonteIdent = extrair('identidadeConfiavel')
const fonteMotivo = extrair('fraseDoMotivo')
ok('as três decisões são funções exportadas e puras (testáveis)',
  Boolean(fonteMerece && fonteIdent && fonteMotivo))

// TypeScript vira JS jogando fora as anotações — só o suficiente para executar.
const semTipos = (s) => s
  .replace(/: string \| null \| undefined/g, '')
  .replace(/: boolean/g, '')
  .replace(/: string/g, '')
const merece = new Function(`${semTipos(fonteMerece)}; return recusaMereceCarta`)()
const confiavel = new Function(`${semTipos(fonteIdent)}; return identidadeConfiavel`)()
const frase = new Function(`${semTipos(fonteMotivo)}; return fraseDoMotivo`)()

// O coração: renovação NÃO entra. 2 das 3 recusas da história são renovação.
ok('recusa de COMPRA INICIAL entra', merece('initial') === true)
ok('RENOVAÇÃO não entra — cliente que já paga tem a régua da Stripe',
  merece('renewal') === false)
ok('estágio DESCONHECIDO não entra (falha fechada: a fatura não pôde ser lida)',
  merece('unknown') === false)
ok('estágio ausente não entra', merece(null) === false && merece(undefined) === false)

// Identidade: o degrau de inferência não envia sozinho.
ok('nome vindo de metadata da Stripe é confiável', confiavel('intent_metadata') === true)
ok('nome vindo da assinatura da fatura é confiável', confiavel('invoice_subscription') === true)
ok('nome vindo da sessão de checkout é confiável', confiavel('checkout_session') === true)
ok('nome vindo de `customer_id` é confiável', confiavel('customer_id') === true)
ok('o reparo manual conferido à mão é confiável', confiavel('backfill_correlation') === true)
ok('nome INFERIDO por e-mail NÃO envia sozinho — pode ser outra pessoa',
  confiavel('customer_email') === false)
ok('recusa anônima não recebe carta nenhuma',
  confiavel('none') === false && confiavel(null) === false)

// A frase do motivo tem de mudar com o motivo, e nunca acusar a pessoa.
ok('`card_restricted` vira frase sobre o BANCO, não sobre a pessoa',
  /bank does not allow/.test(frase('card_restricted')))
ok('a frase muda com o motivo (não é texto fixo)',
  frase('card_restricted') !== frase('insufficient_funds') &&
  frase('insufficient_funds') !== frase('expired_card'))
ok('motivo desconhecido cai num padrão que ainda é verdadeiro',
  /bank turned it down/.test(frase(null)) && /bank turned it down/.test(frase('coisa_nova')))

// ── BLOCO B — A CARTA E A REDE (arquivo real da rota) ──────────────────────
console.log('\nB. a carta obedece as réguas da casa (arquivo real)')

ok('a decisão de coorte é MESMO usada no laço, não só declarada',
  /if \(!recusaMereceCarta\(stage\)\)/.test(rota))
ok('a decisão de identidade é MESMO usada no laço',
  /if \(!identidadeConfiavel\(fonte\)\)/.test(rota))
ok('o padrão é DRY RUN: só envia com confirm=SEND explícito',
  /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(rota) &&
  /if \(!confirm\) \{\n\s+return NextResponse\.json\(\{\n\s+mode: 'DRY_RUN'/.test(rota))
ok('sem sessão de admin nem segredo de cron, a rota devolve 403',
  /return NextResponse\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)/.test(rota))
ok('a autorização por cron falha FECHADA sem a env',
  /if \(!cronSecret\) return false/.test(rota))
ok('supressão de 24h da casa é consultada e filtra de verdade',
  /loadLifecycleSuppression\(admin, candidatos\.map/.test(rota) &&
  /\.filter\(\(c\) => !sup\.isSuppressed\(c\.id\)\)/.test(rota))
ok('quem já pagou não recebe', /if \(pagou\.has\(id\)\)/.test(rota))
ok('quem entrou em outra campanha não recebe', /if \(outras\.has\(id\)\)/.test(rota))
ok('carimbo vitalício: quem já recebeu esta carta não recebe de novo',
  /if \(ja\.has\(id\)\)/.test(rota))
ok('opt-out e e-mail descartável saem antes de tudo',
  /p\.email_opted_out === true/.test(rota) && /isJunk\(e\)/.test(rota))
ok('os 4 bloqueados do ciclo estão na lista',
  ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']
    .every((b) => rota.includes(`'${b}'`)))
ok('cabeçalho de descadastro vai em todo envio',
  /headers: unsubscribeHeaders\(c\.id\)/.test(rota))
ok('os três dedupes passam pelo tripwire de truncamento em 1000',
  (rota.match(/dedupeTripwire\(/g) ?? []).length >= 3)
ok('teto de 30 por lote e pacing de 600ms',
  /Math\.min\(limiteParam, 30\)/.test(rota) && /setTimeout\(r, 600\)/.test(rota))
ok('o envio deixa carimbo em `events` com o nome canônico',
  /name: SENT_EVENT/.test(rota) && /const SENT_EVENT = 'card_declined_emailed_v1'/.test(rota))

// Copy: número nenhum cravado.
ok('o preço do pacote vem de `packPriceLabel()`, nunca escrito na copy',
  rota.includes('packPriceLabel()') && !/\$4\.90/.test(rota.replace(/^\/\/.*$/gm, '')))
ok('a quantidade de créditos vem de `PACK_CREDITS.starter`',
  /\$\{PACK_CREDITS\.starter\}/.test(rota))
ok('os dois links da carta são etiquetados (senão a venda chega como tráfego direto)',
  /utm_campaign=\$\{campanha\}/.test(rota) &&
  /'card_declined_pack'/.test(rota) && /'card_declined_retry'/.test(rota))
ok('a carta não promete desconto, cupom nem crédito de graça',
  !/(discount|coupon|% off|free credits)/i.test(rota.replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')))

// ── BLOCO C — A OFERTA EXISTE E É O QUE A CARTA DIZ QUE É ──────────────────
// A carta afirma "single charge, not a recurring one". Se o `?pack=starter`
// virar assinatura, a carta passa a oferecer a um cartão que recusou mandato
// exatamente outro mandato — e nada no texto acusaria isso.
console.log('\nC. a segunda porta é mesmo cobrança única (arquivo do checkout)')

const checkout = ler('app', 'api', 'stripe', 'checkout', 'route.ts')
const pack = checkout.slice(
  checkout.indexOf('async function buildPackAndRedirect'),
  checkout.indexOf('async function buildOffer290AndRedirect') > 0
    ? checkout.indexOf('async function buildOffer290AndRedirect')
    : checkout.indexOf('async function buildPackAndRedirect') + 12000,
)
ok('o handler do pacote foi encontrado', pack.length > 1000, `${pack.length} chars`)
ok('`?pack=starter` cria sessão `mode: \'payment\'` — cobrança ÚNICA, sem mandato',
  /mode: 'payment'/.test(pack))
ok('e NÃO cria assinatura', !/mode: 'subscription'/.test(pack))

const precos = ler('lib', 'checkoutPricing.ts')
ok('o pacote continua a US$ 4,90 (a carta manda o valor que a Stripe cobra)',
  /PACK_PRICE_MINOR[^=]*=\s*\{ usd: 490 \}/.test(precos))
ok('o pacote continua com 30 créditos', /starter: 30,/.test(precos))

// ── BLOCO D — O CARIMBO ESTÁ REGISTRADO ONDE A REGRA VIVE ─────────────────
// A regra "uma carta por pessoa por dia" não mora num arquivo só. Carimbo novo
// que não entra nos três lugares deixa a pessoa levar dois e-mails nossos com
// minutos de diferença — foi assim que 42 pessoas levaram par em 06/09.
console.log('\nD. o carimbo novo está registrado nos três lugares')
for (const [nome, arquivo] of [
  ['registro canônico de supressão', ['lib', 'lifecycle', 'emailEvents.ts']],
  ['campanha vizinha (checkout expirado)', ['app', 'api', 'admin', 'send-checkout-recovery', 'route.ts']],
  ['campanha vizinha (carta da temporada)', ['app', 'api', 'admin', 'send-season-letter', 'route.ts']],
]) {
  ok(`${nome} conhece \`card_declined_emailed_v1\``,
    ler(...arquivo).includes("'card_declined_emailed_v1'"))
}

// ── BLOCO E — A CARTA DISPARA SOZINHA (vercel.json) ───────────────────────
// Em 01/09 dois crons desta casa DORMIRAM 30 DIAS porque o vercel.json os
// chamava sem `?confirm=SEND` — a rota rodava, decidia "dry run" e devolvia
// 200. Nada no log dizia que ninguém tinha recebido nada. Uma carta que só sai
// quando alguém lembra de clicar é uma carta que não existe.
console.log('\nE. a carta dispara sozinha, e com o gatilho armado')
const vercel = JSON.parse(ler('vercel.json'))
const cron = (vercel.crons ?? []).find((c) => String(c.path).includes('send-card-declined'))
ok('a carta tem uma entrada de cron', Boolean(cron), 'nenhuma encontrada')
ok('e o cron chama com `confirm=SEND` — sem isso ela roda em dry-run para sempre',
  Boolean(cron) && String(cron.path).includes('confirm=SEND'),
  cron ? String(cron.path) : '-')
ok('e com teto de lote explícito', Boolean(cron) && /limit=\d+/.test(String(cron.path)))
ok('a agenda é diária, não de minuto em minuto',
  Boolean(cron) && /^\d+ \d+(,\d+)* \* \* \*$/.test(String(cron.schedule)),
  cron ? String(cron.schedule) : '-')

console.log(
  `\n${total - falhas.length}/${total} verificações passaram.` +
    (falhas.length ? `\nFALHOU: ${falhas.join(' · ')}` : ''),
)
process.exit(falhas.length ? 1 : 0)
