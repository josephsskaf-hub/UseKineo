#!/usr/bin/env node
// KINEO-ANUNCIO-MOTOR-2026-10-07 — guardião do RASTREIO do teste de anúncio no Google Search por nome de motor
// (docs/ANUNCIO-GOOGLE-MOTORES-2026-10-07.md). A pergunta do fundador é "custo por pagante": isso só se mede se a COMPRA
// souber que veio de um clique pago — inclusive a compra sem login (06/10), cuja conta nasce no webhook sem origem.
//
// O QUE ELE PROVA, lendo os arquivos REAIS (readFileSync + transpile; nada de import com alias '@/', que não roda aqui):
//   A. lib/growth/paidClickAttribution.ts, EXECUTADO: só sinal pago vira clique (visita orgânica nunca apaga um clique
//      pago); gclid > gbraid > wbraid; saneamento de formato fechado; idade máxima de 90 dias; folga de relógio; o cookie
//      (Path, Max-Age, SameSite, Secure só em https); as chaves paid_* exatas; a cópia do evento re-saneada.
//   B. components/SourceCapture.tsx (todo pouso) escreve o cookie só quando o módulo devolve uma linha.
//   C. app/api/stripe/checkout/route.ts põe o clique em TODO evento de checkout pelo writer único (recordCheckoutEvent),
//      lendo o cookie pela constante — e o checkout_started do CONVIDADO passa por esse mesmo writer.
//   D. app/api/stripe/webhook/route.ts lê o checkout_started SEMPRE (não só quando falta a sessão do navegador) e espalha
//      o clique no payment_success.
//   E. A conversão de compra do Google Ads segue de pé: tag AW no layout, rótulo de compra com UM dono, valor e moeda
//      reais, o observador ligado no /checkout/success — e o convidado volta por esse mesmo /checkout/success (é lá que o
//      pixel dispara), com o dono carimbado na sessão da Stripe para a verificação aceitar.
// A prova de ponta a ponta (rota + webhook executados com cookie de verdade) mora no cenário "clique pago do anúncio" de
// scripts/test-compra-sem-login-2026-10-06.mjs, que já tem o mundo falso da Stripe e do banco.
//
// CRLF: todo arquivo é normalizado na LEITURA (o checkout do Windows devolve CRLF; a worktree editada pode ter LF).

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const CR = new RegExp(String.fromCharCode(13), 'g')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(CR, '')

/** Transpila e executa um módulo PURO: qualquer import derruba o guardião (o módulo tem de continuar puro). */
function loadPure(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} importou ${id} — o módulo tem de ser puro`) },
    module,
    module.exports,
  )
  return module.exports
}

let passed = 0
const failures = []
function check(ok, label) {
  if (ok) passed += 1
  else failures.push(label)
}
function same(actual, expected, label) {
  try {
    assert.deepStrictEqual(actual, expected)
    passed += 1
  } catch {
    failures.push(`${label} — recebido ${JSON.stringify(actual)}`)
  }
}

// ═══ A. O módulo puro, executado ═══════════════════════════════════════════════════════════════════════════════════════
const P = loadPure('lib/growth/paidClickAttribution.ts')
const NOW = Date.UTC(2026, 9, 7, 20, 0, 0)
const DAY = 24 * 60 * 60 * 1000
const GCLID = 'Cj0KCQjwTESTE_abc-123'
const AD = `?utm_source=google&utm_medium=cpc&utm_campaign=motor-seedance-2-5&utm_term=seedance%202.5%20app&utm_content=123&gclid=${GCLID}`
const adClick = {
  source: 'google', medium: 'cpc', campaign: 'motor-seedance-2-5', term: 'seedance 2.5 app',
  idType: 'gclid', id: GCLID, atMs: NOW,
}

same(P.PAID_CLICK_COOKIE, 'kineo_paid_click', 'A1. nome do cookie')
same(P.PAID_CLICK_MAX_AGE_SECONDS, 90 * 24 * 60 * 60, 'A2. o cookie vive 90 dias')
same([...P.PAID_CLICK_ID_TYPES], ['gclid', 'gbraid', 'wbraid'], 'A3. identificadores e precedência')
same(P.paidClickFromSearch(AD, NOW), adClick, 'A4. o clique do anúncio sai inteiro (utm + palavra-chave + gclid + hora)')
same(
  P.paidClickFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=motor-veo&gbraid=0AAAAAoTESTgbraid', NOW),
  { source: 'google', medium: 'cpc', campaign: 'motor-veo', term: null, idType: 'gbraid', id: '0AAAAAoTESTgbraid', atMs: NOW },
  'A5. clique do iOS (gbraid) é guardado',
)
same(P.paidClickFromSearch('?wbraid=CkTESTwbraid123', NOW)?.idType, 'wbraid', 'A6. wbraid sozinho já é clique pago')
same(P.paidClickFromSearch(`?gbraid=0AAAAAoTESTgbraid&gclid=${GCLID}`, NOW)?.idType, 'gclid', 'A7. gclid vence gbraid')
same(
  P.paidClickFromSearch('?utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_sep09', NOW),
  { source: 'reddit', medium: 'cpc', campaign: 'reddit_sep09', term: null, idType: null, id: null, atMs: NOW },
  'A8. utm_medium pago sem identificador também é clique (Reddit/Meta com UTM manual)',
)
same(P.paidClickFromSearch('?utm_source=google&utm_medium=CPC&utm_campaign=motor-kling-3', NOW)?.medium, 'cpc', 'A9. utm_medium em maiúscula vale')
for (const organic of ['', '?utm_source=chatgpt', '?utm_source=google&utm_medium=organic', '?utm_medium=email&utm_campaign=trial_d0', '?ref=abc', '?gclid=abc']) {
  same(P.paidClickFromSearch(organic, NOW), null, `A10. sem sinal pago não há clique: "${organic}"`)
  same(P.paidClickCookieWrite(organic, NOW, true), null, `A11. visita sem sinal pago não escreve cookie (não apaga o clique guardado): "${organic}"`)
}
const dirty = P.paidClickFromSearch(`?utm_source=google&utm_medium=cpc&utm_campaign=%3Cscript%3Ealert(1)%3C%2Fscript%3E&utm_term=${'x'.repeat(101)}&gclid=${GCLID}`, NOW)
same([dirty?.campaign, dirty?.term, dirty?.id], [null, null, GCLID], 'A12. campanha com HTML e palavra-chave longa demais caem; o clique fica')
same(P.paidClickFromSearch('?gclid=Cj0K%22onload%3Dx%20y', NOW), null, 'A13. gclid fora do formato não vira clique')
same(P.paidClickFromSearch('?utm_medium=cpc&gclid=Cj0K%22onload%3Dx%20y', NOW)?.id, null, 'A14. gclid adulterado nunca é gravado (o clique pago fica sem id)')
same(P.paidClickFromSearch(AD, Date.UTC(2023, 11, 31)), null, 'A15. relógio impossível (antes de 2024) não grava')

const serialized = P.serializePaidClick(adClick)
same(P.parsePaidClick(serialized, NOW + DAY), adClick, 'A16. cookie decodificado (como o Next entrega) volta inteiro')
same(P.parsePaidClick(encodeURIComponent(serialized), NOW + DAY), adClick, 'A17. cookie cru (codificado) volta inteiro')
same(P.parsePaidClick(serialized, NOW + 90 * DAY), adClick, 'A18. com 90 dias ainda vale')
same(P.parsePaidClick(serialized, NOW + 90 * DAY + 1000), null, 'A19. passou de 90 dias, vence')
const future = P.serializePaidClick({ ...adClick, atMs: NOW + 10 * 60 * 1000 })
same(P.parsePaidClick(future, NOW)?.id, GCLID, 'A20. relógio do navegador 10 min adiantado ainda vale')
same(P.parsePaidClick(P.serializePaidClick({ ...adClick, atMs: NOW + 11 * 60 * 1000 }), NOW), null, 'A21. clique "do futuro" além da folga é recusado')
const base = JSON.parse(serialized)
const tampered = [
  ['versão desconhecida', { ...base, v: 2 }],
  ['tipo de id inventado', { ...base, k: 'fbclid' }],
  ['id com espaço', { ...base, i: 'abc def ghi' }],
  ['campanha com <', { ...base, c: 'motor<x' }],
  ['hora quebrada', { ...base, a: 1.5 }],
  ['tipo sem id', { ...base, i: null }],
  ['id sem tipo', { ...base, k: null }],
  ['sem sinal pago', { ...base, k: null, i: null, m: 'organic' }],
  ['medium não-texto', { ...base, m: 42 }],
]
for (const [label, obj] of tampered) same(P.parsePaidClick(JSON.stringify(obj), NOW), null, `A22. cookie adulterado recusado: ${label}`)
for (const raw of ['', 'não é json', '[]', 'null', '{"v":1}', `{"v":1,"a":${Math.floor(NOW / 1000)},"pad":"${'x'.repeat(2100)}"}`, '%E0%A4%A']) {
  same(P.parsePaidClick(raw, NOW), null, `A23. lixo no cookie não quebra e não vira clique: ${raw.slice(0, 24)}`)
}

const write = P.paidClickCookieWrite(AD, NOW, true)
check(typeof write === 'string' && write.startsWith('kineo_paid_click='), 'A24. a linha do cookie usa o nome da constante')
check(typeof write === 'string' && write.endsWith('; Path=/; Max-Age=7776000; SameSite=Lax; Secure'), `A25. Path=/, 90 dias, SameSite=Lax e Secure em https (${write})`)
const insecure = P.paidClickCookieWrite(AD, NOW, false)
check(typeof insecure === 'string' && !insecure.includes('Secure'), 'A26. sem Secure fora de https (localhost)')
const writtenValue = typeof write === 'string' ? write.slice('kineo_paid_click='.length, write.indexOf(';')) : ''
same(P.parsePaidClick(writtenValue, NOW), adClick, 'A27. o que o pouso escreve é o que o servidor lê')
check(!/[;,\s]/.test(writtenValue), 'A28. o valor do cookie não tem ; , nem espaço (vai codificado)')

const eventMeta = P.paidClickEventMetadata(adClick)
same(eventMeta, {
  paid_click_version: 'paid_click_v1',
  paid_utm_source: 'google',
  paid_utm_medium: 'cpc',
  paid_utm_campaign: 'motor-seedance-2-5',
  paid_utm_term: 'seedance 2.5 app',
  paid_click_id_type: 'gclid',
  paid_click_id: GCLID,
  paid_click_at: new Date(NOW).toISOString(),
}, 'A29. as chaves paid_* do evento, exatas')
same(Object.keys(eventMeta), [...P.PAID_CLICK_METADATA_KEYS], 'A30. a lista exportada é a lista gravada')
same(P.paidClickEventMetadata(null), {}, 'A31. sem anúncio, nenhuma chave nova')
const checkoutStarted = { tier: 'basic', stripe_session_id: 'cs_test_abc', guest_checkout: true, ...eventMeta }
same(P.paidClickMetadataFromEvent(checkoutStarted), eventMeta, 'A32. o webhook copia só as chaves paid_* do checkout_started')
same(P.paidClickMetadataFromEvent({ ...checkoutStarted, paid_click_at: new Date(NOW - 200 * DAY).toISOString() }).paid_click_id, GCLID, 'A33. a cópia não aplica idade (o clique valia quando o checkout abriu)')
for (const [label, meta] of [
  ['sem chaves', { tier: 'basic' }],
  ['versão errada', { ...checkoutStarted, paid_click_version: 'paid_click_v0' }],
  ['id adulterado', { ...checkoutStarted, paid_click_id: 'x y' }],
  ['data quebrada', { ...checkoutStarted, paid_click_at: 'ontem' }],
  ['nulo', null],
  ['lista', [eventMeta]],
]) same(P.paidClickMetadataFromEvent(meta), {}, `A34. cópia recusa: ${label}`)

// ═══ B. O pouso escreve o cookie ═══════════════════════════════════════════════════════════════════════════════════════
const capture = read('components/SourceCapture.tsx')
check(/^import \{ paidClickCookieWrite \} from '@\/lib\/growth\/paidClickAttribution'/m.test(capture), 'B1. SourceCapture importa paidClickCookieWrite do módulo')
const effect = capture.slice(capture.indexOf('useEffect(() => {'), capture.indexOf('}, [])'))
check(/^\s*const paidClickWrite = paidClickCookieWrite\(window\.location\.search, Date\.now\(\), window\.location\.protocol === 'https:'\)$/m.test(effect), 'B2. todo pouso calcula a linha a partir da URL real, da hora e do https')
check(/^\s*if \(paidClickWrite\) document\.cookie = paidClickWrite$/m.test(effect), 'B3. só escreve quando há clique pago (organic = nada)')
check(!capture.includes("'kineo_paid_click'"), 'B4. nenhum nome de cookie digitado no pouso (só a constante)')
check(read('app/layout.tsx').includes('<SourceCapture />'), 'B5. o SourceCapture continua montado no layout raiz (todo pouso)')

// ═══ C. A rota de checkout carimba o clique em todo evento ═════════════════════════════════════════════════════════════
const route = read('app/api/stripe/checkout/route.ts')
check(/^import \{ cookies \} from 'next\/headers'/m.test(route), 'C1. a rota lê cookies do pedido')
check(/^import \{ PAID_CLICK_COOKIE, paidClickEventMetadata, parsePaidClick \} from '@\/lib\/growth\/paidClickAttribution'/m.test(route), 'C2. a rota usa o módulo (constante + leitura + chaves)')
const helperAt = route.indexOf('function paidClickMetadataFromRequest()')
const helper = helperAt >= 0 ? route.slice(helperAt, route.indexOf('\n}\n', helperAt)) : ''
check(/^\s*return paidClickEventMetadata\(parsePaidClick\(cookies\(\)\.get\(PAID_CLICK_COOKIE\)\?\.value, Date\.now\(\)\)\)$/m.test(helper), 'C3. o clique sai do cookie pela constante, saneado e com idade conferida')
check(/try \{[\s\S]*\} catch \{\s*return \{\}\s*\}/.test(helper), 'C4. falha na leitura = {} (o evento sai como antes)')
const writerAt = route.indexOf('async function recordCheckoutEvent(')
const writerEnd = route.indexOf("await admin.from('events').insert(eventRow)", writerAt)
const writer = writerAt >= 0 && writerEnd > writerAt ? route.slice(writerAt, writerEnd) : ''
check(writer.length > 0, 'C5. o writer único dos eventos de checkout existe e grava eventRow')
check(/^\s*metadata: \{ \.\.\.metadata, \.\.\.paidClickMetadataFromRequest\(\) \},$/m.test(writer), 'C6. TODO evento de checkout ganha o clique pago (o eventRow espalha o helper)')
check(!/^\s*metadata,$/m.test(writer), 'C7. o eventRow não grava mais a metadata crua (sem o clique)')
check(/^\s*await recordCheckoutEvent\('checkout_started', null, startedMetadata, ctx\.browserSessionId \?\? undefined\)$/m.test(route), 'C8. o checkout_started do CONVIDADO passa pelo mesmo writer')
check(/^\s*await recordCheckoutEvent\(GUEST_CHECKOUT_EVENTS\.started, null, startedMetadata, ctx\.browserSessionId \?\? undefined\)$/m.test(route), 'C9. o checkout_guest_started também')
check(!route.includes("'kineo_paid_click'"), 'C10. nenhum nome de cookie digitado na rota (só a constante)')
const paramsBlocks = []
for (let at = route.indexOf('const sessionParams: Stripe.Checkout.SessionCreateParams = {'); at >= 0; at = route.indexOf('const sessionParams: Stripe.Checkout.SessionCreateParams = {', at + 1)) {
  const end = route.indexOf('\n  }\n', at)
  paramsBlocks.push(end > at ? route.slice(at, end) : '')
}
check(paramsBlocks.length >= 7 && paramsBlocks.every((block) => block.length > 200), `C11. os ${paramsBlocks.length} blocos de parâmetros da Stripe foram achados`)
check(paramsBlocks.every((block) => !/paidClick|paid_click|PAID_CLICK/.test(block)), 'C12. o clique pago não entra em nenhum parâmetro de sessão da Stripe (preço e idempotência intactos)')
check(!/paidClick|paid_click|PAID_CLICK/.test(read('lib/stripe/guestCheckout.ts')), 'C13. nem na sessão do convidado (lib/stripe/guestCheckout.ts)')
check(route.split('paidClickMetadataFromRequest(').length - 1 === 2, 'C14. o helper tem um único chamador: o writer dos eventos')

// ═══ D. O webhook copia para o payment_success ═════════════════════════════════════════════════════════════════════════
const webhook = read('app/api/stripe/webhook/route.ts')
check(/^import \{ paidClickMetadataFromEvent, type PaidClickMetadata \} from '@\/lib\/growth\/paidClickAttribution'/m.test(webhook), 'D1. o webhook usa o módulo')
const rpsAt = webhook.indexOf('async function recordPaymentSuccess(')
const rps = rpsAt >= 0 ? webhook.slice(rpsAt, webhook.indexOf('\n}\n', rpsAt)) : ''
const declAt = rps.indexOf('let paidClickMetadata: PaidClickMetadata = {}')
const selectAt = rps.indexOf(".select('session_id, metadata')")
check(declAt > 0 && selectAt > declAt, 'D2. o checkout_started é lido com a metadata (onde mora o clique)')
check(declAt > 0 && selectAt > declAt && !/\bif \(/.test(rps.slice(declAt, selectAt)), 'D3. a leitura roda SEMPRE (não só quando falta a sessão do navegador)')
check(/^\s*paidClickMetadata = paidClickMetadataFromEvent\(checkoutRows\?\.\[0\]\?\.metadata\)$/m.test(rps), 'D4. o clique é relido com as mesmas regras')
check(/^\s*if \(!browserSessionId && typeof recoveredSessionId === 'string' && \/\^\[A-Za-z0-9_-\]\{8,64\}\$\/\.test\(recoveredSessionId\)\) \{$/m.test(rps), 'D5. a sessão da Stripe continua vencendo a recuperada')
const rowAt = rps.indexOf("name: 'payment_success',")
const insertAt = rps.indexOf("const { error } = await supabase.from('events').insert(row)")
const rowBody = rowAt > 0 && insertAt > rowAt ? rps.slice(rowAt, insertAt) : ''
check(/^\s*\.\.\.paidClickMetadata,$/m.test(rowBody), 'D6. o payment_success espalha o clique pago na metadata')
check(/^\s*\.\.\.\(isGuestCheckoutSession\(session\) \? \{ guest_checkout: true,/m.test(rowBody), 'D7. a compra de convidado segue marcada (guest_checkout) no mesmo evento')
check(/if \(isGuestCheckoutSession\(session\) && !session\.metadata\?\.supabase_user_id\) return/.test(rps), 'D8. o payment_success do convidado continua esperando o dono (Path B)')

// ═══ E. A conversão de compra do Google Ads ════════════════════════════════════════════════════════════════════════════
const layout = read('app/layout.tsx')
check(layout.includes('src="https://www.googletagmanager.com/gtag/js?id=AW-18156258081"') && layout.includes("gtag('config', 'AW-18156258081');"), 'E1. a tag do Google Ads (AW-18156258081) está no layout raiz: todo pouso')
const runtimeFiles = ['app', 'components', 'lib'].flatMap((dir) =>
  readdirSync(join(root, dir), { recursive: true })
    .filter((entry) => /\.(?:ts|tsx)$/.test(String(entry)))
    .map((entry) => join(dir, String(entry)).replaceAll('\\', '/')),
)
const purchaseLabel = 'AW-18156258081/NL4bCKXEwa4cEKGGytFD'
same(runtimeFiles.filter((file) => read(file).includes(purchaseLabel)), ['lib/growth/checkoutPurchasePixels.ts'], 'E2. o rótulo da conversão de compra tem um único dono')
const pixels = read('lib/growth/checkoutPurchasePixels.ts')
check(/send_to: 'AW-18156258081\/NL4bCKXEwa4cEKGGytFD',\s*value: purchase\.value, currency: purchase\.currency, transaction_id: purchase\.sessionId,/.test(pixels), 'E3. a compra reporta valor e moeda reais da Stripe, com a sessão como transaction_id (dedupe)')
check(/return observeCheckoutPurchase\(\{\s*sessionId,/.test(read('app/checkout/success/page.tsx')), 'E4. o /checkout/success liga o observador da compra verificada')
const G = loadPure('lib/growth/guestCheckout.ts')
const guestSuccess = G.buildGuestCheckoutSuccessUrl({ appUrl: 'https://www.usekineo.com', tier: 'basic', currency: 'usd', amount: 2990 })
check(guestSuccess.startsWith('https://www.usekineo.com/checkout/guest?') && guestSuccess.endsWith('&session_id={CHECKOUT_SESSION_ID}'), 'E5. o convidado volta da Stripe para /checkout/guest com a sessão')
same(
  G.guestSuccessDestination(new URLSearchParams('currency=usd&amount=2990&session_id=cs_live_abcdefghijk12')),
  '/checkout/success?success=true&currency=usd&amount=2990&session_id=cs_live_abcdefghijk12',
  'E6. depois do login, o convidado cai no MESMO /checkout/success (onde o pixel de compra dispara)',
)
check(/^\s*await deps\.updateCheckoutSessionMetadata\(sessionId, \{ supabase_user_id: userId \}\)$/m.test(read('lib/stripe/guestCheckout.ts')), 'E7. o webhook carimba o dono na sessão da Stripe (a verificação do pixel aceita o convidado)')
check(/session\.metadata\?\.supabase_user_id !== userId/.test(read('lib/growth/verifiedCheckoutPurchase.ts')), 'E8. o pixel só dispara para o dono verificado da sessão')

const total = passed + failures.length
if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  console.error(`\n${failures.length} de ${total} verificações do rastreio do anúncio por motor FALHARAM`)
  process.exit(1)
}
console.log(`\n${passed}/${total} verificações do rastreio do anúncio por motor ok`)
