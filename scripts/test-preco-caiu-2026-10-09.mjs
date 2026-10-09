// KINEO-PRECO-CAIU-2026-10-09 — guardião da carta "o preço baixou" (app/api/admin/send-price-drop/route.ts +
// lib/growth/priceDrop.ts). Prova:
//   1. EXECUTADO: com o preço de hoje (lib/checkoutPricing.ts TIER_PRICES) há queda em Starter e Creator; com o preço da
//      V8-A de volta (ou maior), a lista fica vazia — a carta não existe sem queda de verdade;
//   2. EXECUTADO: a janela é a da V8-A (28/09 00:00 UTC → 09/10 03:38 UTC, o deploy do teste de preço), bordas certas;
//   3. a rota: só admin, dry-run por padrão (?confirm=SEND), recusa 409 price_not_lower ANTES de ler ou enviar, carimbo
//      literal = PRICE_DROP_STAMP e na lista da supressão de 24 h, respeita a supressão, descadastro no corpo e no
//      cabeçalho, tira conta da casa, pagante e quem já recebeu, nenhum preço digitado, link no /pricing mensal com utm;
//   4. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules } from './gpt24h-offline-support.mjs'

const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/growth/priceDrop.ts'
const ROUTE = 'app/api/admin/send-price-drop/route.ts'
const EVENTS = 'lib/lifecycle/emailEvents.ts'
const SRC = { [LIB]: read(LIB), [ROUTE]: read(ROUTE), [EVENTS]: read(EVENTS) }

function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let lib, prices
  try {
    const load = offlineModules({ replacements })
    lib = load(LIB)
    prices = load('lib/checkoutPricing.ts')
  } catch (e) {
    return ['módulos: ' + String(e && e.message)]
  }
  // 1. a trava executada
  const hoje = { starter: prices.TIER_PRICES.starter.usd, basic: prices.TIER_PRICES.basic.usd }
  const linhas = lib.priceDropLines(hoje)
  const esperadas = ['starter', 'basic'].filter((t) => hoje[t] < lib.PRICE_DROP_WAS_USD_CENTS[t])
  if (JSON.stringify(linhas.map((l) => l.tier)) !== JSON.stringify(esperadas)) p.push(`queda de hoje: ${JSON.stringify(linhas)} ≠ ${JSON.stringify(esperadas)}`)
  for (const l of linhas) if (l.nowCents !== hoje[l.tier] || l.wasCents !== lib.PRICE_DROP_WAS_USD_CENTS[l.tier]) p.push(`linha ${l.tier} com número que não é o do caixa`)
  if (lib.priceDropLines({ starter: 1290, basic: 2990 }).length !== 0) p.push('com o preço da V8-A de volta a carta ainda anunciaria queda')
  if (lib.priceDropLines({ starter: 1490, basic: 3490 }).length !== 0) p.push('com preço maior a carta anunciaria queda')
  if (lib.priceDropLines({ starter: NaN, basic: 0 }).length !== 0) p.push('preço inválido virou queda')
  if (lib.PRICE_DROP_WAS_USD_CENTS.starter !== 1290 || lib.PRICE_DROP_WAS_USD_CENTS.basic !== 2990) p.push('o "era" não é o preço da V8-A (US$ 12,90 / US$ 29,90)')
  // 2. a janela
  if (lib.PRICE_DROP_WINDOW.from !== '2026-09-28T00:00:00.000Z' || lib.PRICE_DROP_WINDOW.to !== '2026-10-09T03:38:00.000Z') p.push('janela fora da V8-A (28/09 → 09/10 03:38 UTC)')
  if (!lib.inPriceDropWindow('2026-09-28T00:00:00.000Z') || lib.inPriceDropWindow('2026-10-09T03:38:00.000Z') || lib.inPriceDropWindow('2026-09-27T23:59:59.000Z') || !lib.inPriceDropWindow('2026-10-09T03:37:59.000Z') || lib.inPriceDropWindow('lixo')) p.push('bordas da janela')

  // 3. a rota
  const r = src(ROUTE)
  const code = r.replace(/^\s*\/\/.*$/gm, '')
  const iAdmin = code.indexOf("if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })")
  const iTrava = code.indexOf("if (lines.length === 0) return NextResponse.json({ error: 'price_not_lower', nothing_sent: true }, { status: 409 })")
  const iLeitura = code.indexOf(".eq('name', 'checkout_started')")
  const iEnvio = code.indexOf("fetch('https://api.resend.com/emails'")
  if (iAdmin < 0) p.push('rota sem a porta de admin')
  if (iTrava < 0 || !(iAdmin < iTrava && iTrava < iLeitura && iLeitura < iEnvio)) p.push('a trava "price_not_lower" tem de vir depois do admin e antes de ler e de enviar')
  if (!code.includes("const lines = priceDropLines({ starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd })")) p.push('a trava não lê o preço do caixa')
  if (!code.includes("const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'")) p.push('dry-run por padrão: só ?confirm=SEND envia')
  const iDry = code.indexOf("if (!confirm) {")
  if (iDry < 0 || iDry > iEnvio) p.push('o dry-run tem de responder antes do laço de envio')
  const stamp = (/const STAMP = '([a-z0-9_]+)'/.exec(code) || [])[1]
  if (stamp !== lib.PRICE_DROP_STAMP) p.push(`carimbo da rota (${stamp}) ≠ PRICE_DROP_STAMP (${lib.PRICE_DROP_STAMP})`)
  if (!new RegExp(`^ {2}'${lib.PRICE_DROP_STAMP}',$`, 'm').test(src(EVENTS))) p.push('carimbo fora da lista da supressão de 24 h (lib/lifecycle/emailEvents.ts)')
  if (!code.includes("readAll(() => admin.from('events').select('user_id').eq('name', STAMP)") || !code.includes("name: STAMP")) p.push('1× por pessoa: lê e grava o carimbo')
  if (!code.includes('const supressao = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))') || !code.includes('candidatos.filter((c) => !supressao.isSuppressed(c.id))')) p.push('não respeita a supressão de 24 h')
  for (const must of ['unsubscribeHeaders(a.id)', 'emailFooterHtml(userId)', 'emailFooterText(userId)', '!a.opted_out', '!a.has_paid', '!PAID_PLANS.has(a.plan)', '!isInternalEmail(a.email)', '!pagou.has(a.id)', '!avisado.has(a.id)', "const PAID_EVENTS = ['payment_success', 'subscription_invoice_paid']"]) {
    if (!code.includes(must)) p.push(`rota sem: ${must}`)
  }
  if (/\$\s?\d/.test(code)) p.push('preço digitado na rota (tem de sair de formatCheckoutMoney)')
  if (!code.includes('/pricing?billing=monthly&utm_source=lifecycle&utm_medium=email&utm_campaign=${PRICE_DROP_CAMPAIGN}')) p.push('link: /pricing no mensal (os números da carta) com utm da campanha')
  if (!code.includes('Math.min(limitParam, 40)')) p.push('lote máximo de 40')
  return p
}

let pass = 0
let fail = 0
const base = problems()
if (base.length === 0) { pass++; console.log('  ok  carta certa: trava executada, janela, rota (admin, dry-run, supressão, carimbo, nada digitado)') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }

const troca = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['a trava deixa passar preço igual', troca(LIB, 'nowCents > 0 && nowCents < wasCents', 'nowCents > 0 && nowCents <= wasCents')],
  ['a trava some da rota', troca(ROUTE, "    if (lines.length === 0) return NextResponse.json({ error: 'price_not_lower', nothing_sent: true }, { status: 409 })\n", '')],
  ['envia sem ?confirm=SEND', troca(ROUTE, "const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'", "const confirm = req.nextUrl.searchParams.get('confirm') !== 'NO'")],
  ['sem supressão de 24 h', troca(ROUTE, 'candidatos.filter((c) => !supressao.isSuppressed(c.id))', 'candidatos')],
  ['carimbo diferente do da lista', troca(ROUTE, "const STAMP = 'price_drop_1009_sent'", "const STAMP = 'price_drop_sent'")],
  ['carimbo fora da supressão', troca(EVENTS, "  'price_drop_1009_sent',\n", '')],
  ['preço digitado no assunto', troca(ROUTE, 'subject: `Kineo just got cheaper: Creator is now ${usd(TIER_PRICES.basic.usd)}`', 'subject: `Kineo just got cheaper: Creator is now $19.90`')],
  ['janela esticada para depois da queda', troca(LIB, "to: '2026-10-09T03:38:00.000Z'", "to: '2026-10-16T03:38:00.000Z'")],
  ['conta da casa recebe', troca(ROUTE, ' && !isInternalEmail(a.email)', '')],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m.length})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — a carta "o preço baixou" só existe com queda de verdade, só sai com o clique do fundador e respeita a supressão')
