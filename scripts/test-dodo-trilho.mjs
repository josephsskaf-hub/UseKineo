// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-DODO-2026-09-07 — o trilho UPI/RuPay/Pix nasce desligado
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede, em uma frase: que o trilho novo conceda crédito
// sem assinatura, conceda duas vezes, ligue sem chave, ou digite preço/id à mão.
//
// Cinco perigos concretos:
//  1. WEBHOOK ACEITO SEM PROVA. Quem passa aqui recebe crédito. A verificação
//     é PURA e importada DE VERDADE (lib/dodo.ts não tem `@/`); as fixtures
//     são assinadas com o crypto do node, do jeito que a Dodo assina.
//  2. CLAIM ANTES DO GRANT, ERRO ENGOLIDO — o bug do PayPal achado em 28/08.
//     O bloco D amarra o DELETE do guard ao `catch` da concessão.
//  3. LIGAR SEM CHAVE. `isDodoEnabled` é a única pergunta; o bloco B executa
//     a função com envs falsas e o bloco C amarra o 503 do checkout a ela.
//  4. ID DE PRODUTO CRAVADO. Os ids de teste do handoff vão mudar no KYC; um
//     `pdt_` em app/ ou lib/ vende o produto errado no dia da virada.
//  5. PREÇO REDIGITADO. $4,90/30cr/$7/$15/$29 saem de lib/checkoutPricing.ts
//     ou o trilho mente na primeira mudança de preço.
//
// Rodar: node scripts/test-dodo-trilho.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHmac, randomBytes } from 'node:crypto'
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

const libDodo = ler('lib', 'dodo.ts')
const libCatalog = ler('lib', 'dodoCatalog.ts')
const libGrant = ler('lib', 'payments', 'grant.ts')
const rotaCheckout = ler('app', 'api', 'dodo', 'checkout', 'route.ts')
const rotaWebhook = ler('app', 'api', 'dodo', 'webhook', 'route.ts')
const rotaEvents = ler('app', 'api', 'events', 'route.ts')
const migracao = ler('supabase', 'migrations', '20260907150000_dodo_events.sql')

// ── BLOCO 0 — lib/dodo.ts é importável fora do Next ─────────────────────────
console.log('\n0. lib/dodo.ts é puro (sem `@/`, sem log de segredo)')
ok('lib/dodo.ts não importa alias `@/`', !/from\s+['"]@\//.test(libDodo))
ok('lib/dodo.ts não tem console.log', !/console\.log\(/.test(libDodo))
ok('lib/dodo.ts nunca interpola a chave em string de log', !/console\.(error|warn)\([^)]*apiKey/.test(libDodo))

const dodo = await import(pathToFileURL(path.join(raiz, 'lib', 'dodo.ts')).href)

// ── BLOCO A — assinatura (executada com fixtures reais) ─────────────────────
console.log('\nA. verificação de assinatura (Standard Webhooks, executada)')
const keyBytes = randomBytes(32)
const secret = `whsec_${keyBytes.toString('base64')}`
const wrongSecret = `whsec_${randomBytes(32).toString('base64')}`
const body = JSON.stringify({
  business_id: 'bus_test',
  type: 'payment.succeeded',
  timestamp: new Date().toISOString(),
  data: { payload_type: 'Payment', payment_id: 'pay_1', metadata: { supabase_user_id: 'u1', sku: 'first_pack' } },
})
const nowSec = Math.floor(Date.now() / 1000)
const id = 'msg_fixture_1'
const ts = String(nowSec)
const sign = (k, i, t, b) => createHmac('sha256', Buffer.from(k.replace(/^whsec_/, ''), 'base64')).update(`${i}.${t}.${b}`).digest('base64')
const headers = (sig, extra = {}) => ({ 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sig, ...extra })
const goodSig = sign(secret, id, ts, body)

ok('assinatura de lib/dodo.ts bate com HMAC do node', dodo.signDodoWebhook(secret, id, ts, body) === goodSig)
ok('ACEITA fixture corretamente assinada', dodo.verifyDodoWebhook(body, headers(`v1,${goodSig}`), secret, nowSec) === true)
ok('ACEITA quando a assinatura boa é a 2ª de uma lista', dodo.verifyDodoWebhook(body, headers(`v1,${sign(wrongSecret, id, ts, body)} v1,${goodSig}`), secret, nowSec) === true)
ok('ACEITA via objeto Headers (como a rota chama)', dodo.verifyDodoWebhook(body, new Headers(headers(`v1,${goodSig}`)), secret, nowSec) === true)
ok('REJEITA segredo errado', dodo.verifyDodoWebhook(body, headers(`v1,${goodSig}`), wrongSecret, nowSec) === false)
ok('REJEITA corpo adulterado', dodo.verifyDodoWebhook(body.replace('"u1"', '"u2"'), headers(`v1,${goodSig}`), secret, nowSec) === false)
ok('REJEITA timestamp adulterado', dodo.verifyDodoWebhook(body, headers(`v1,${goodSig}`, { 'webhook-timestamp': String(nowSec + 1) }), secret, nowSec) === false)
ok('REJEITA timestamp velho (> tolerância) mesmo bem assinado', (() => {
  const old = String(nowSec - dodo.DODO_WEBHOOK_TOLERANCE_SEC - 1)
  return dodo.verifyDodoWebhook(body, headers(`v1,${sign(secret, id, old, body)}`, { 'webhook-timestamp': old }), secret, nowSec) === false
})())
ok('REJEITA sem webhook-id', dodo.verifyDodoWebhook(body, { 'webhook-timestamp': ts, 'webhook-signature': `v1,${goodSig}` }, secret, nowSec) === false)
ok('REJEITA sem webhook-timestamp', dodo.verifyDodoWebhook(body, { 'webhook-id': id, 'webhook-signature': `v1,${goodSig}` }, secret, nowSec) === false)
ok('REJEITA sem webhook-signature', dodo.verifyDodoWebhook(body, { 'webhook-id': id, 'webhook-timestamp': ts }, secret, nowSec) === false)
ok('REJEITA assinatura do tamanho certo com bytes errados', (() => {
  const wrongBytes = Buffer.from(goodSig, 'base64')
  wrongBytes[0] ^= 0xff
  return dodo.verifyDodoWebhook(body, headers(`v1,${wrongBytes.toString('base64')}`), secret, nowSec) === false
})())
ok('REJEITA versão que não é v1', dodo.verifyDodoWebhook(body, headers(`v2,${goodSig}`), secret, nowSec) === false)
ok('REJEITA segredo vazio/nulo', dodo.verifyDodoWebhook(body, headers(`v1,${goodSig}`), '', nowSec) === false && dodo.verifyDodoWebhook(body, headers(`v1,${goodSig}`), null, nowSec) === false)
ok('comparação é timingSafeEqual (não ===)', /timingSafeEqual\(candidate,\s*expected\)/.test(libDodo) && !/sigB64\s*===\s*expected/.test(libDodo))

// ── BLOCO B — desligado sem chave (função executada com envs falsas) ────────
console.log('\nB. isDodoEnabled é a variável que decide (executada)')
ok('sem env nenhuma → desligado', dodo.isDodoEnabled({}) === false)
ok('só DODO_MODE=test sem chave → desligado', dodo.isDodoEnabled({ DODO_MODE: 'test' }) === false)
ok('chave de teste em modo test → ligado', dodo.isDodoEnabled({ DODO_API_KEY_TEST: 'x' }) === true)
ok('chave de teste em modo LIVE → desligado (modo lê a chave certa)', dodo.isDodoEnabled({ DODO_MODE: 'live', DODO_API_KEY_TEST: 'x' }) === false)
ok('chave live em modo live → ligado', dodo.isDodoEnabled({ DODO_MODE: 'live', DODO_API_KEY: 'x' }) === true)
ok('chave live SEM DODO_MODE → desligado (default é test)', dodo.isDodoEnabled({ DODO_API_KEY: 'x' }) === false)
ok('chave só com espaços → desligado', dodo.isDodoEnabled({ DODO_API_KEY_TEST: '   ' }) === false)
ok('default de modo é test', dodo.dodoMode({}) === 'test' && dodo.dodoMode({ DODO_MODE: 'banana' }) === 'test')
ok('base URL segue o modo', dodo.dodoBaseUrl({}) === 'https://test.dodopayments.com' && dodo.dodoBaseUrl({ DODO_MODE: 'live' }) === 'https://live.dodopayments.com')
ok('produto lê _TEST em test e o nome puro em live', dodo.dodoProductId('starter', { DODO_PRODUCT_STARTER_TEST: 'a', DODO_PRODUCT_STARTER: 'b' }) === 'a' && dodo.dodoProductId('starter', { DODO_MODE: 'live', DODO_PRODUCT_STARTER_TEST: 'a', DODO_PRODUCT_STARTER: 'b' }) === 'b')
ok('produto ausente → null, nunca string vazia', dodo.dodoProductId('first_pack', {}) === null)
ok('dodoMissingEnvFor nomeia as envs que faltam (nome, não valor)', JSON.stringify(dodo.dodoMissingEnvFor('first_pack', {})) === JSON.stringify(['DODO_API_KEY_TEST', 'DODO_PRODUCT_FIRST_PACK_TEST']))
ok('dodoMissingEnvFor vazio quando tudo existe', dodo.dodoMissingEnvFor('studio', { DODO_API_KEY_TEST: 'k', DODO_PRODUCT_STUDIO_TEST: 'p' }).length === 0)
ok('createDodoCheckout sem chave lança erro tipado 503 sem tocar a rede', await (async () => {
  let calls = 0
  try {
    await dodo.createDodoCheckout({ sku: 'starter', customer: { email: 'a@b.c' }, returnUrl: 'https://x/y', cancelUrl: 'https://x/z', metadata: {} }, {}, async () => { calls += 1; throw new Error('should not fetch') })
    return false
  } catch (e) {
    return e instanceof dodo.DodoCheckoutError && e.code === 'disabled' && e.status === 503 && calls === 0
  }
})())
ok('createDodoCheckout com chave mas sem produto lança product_missing 503', await (async () => {
  try {
    await dodo.createDodoCheckout({ sku: 'starter', customer: { email: 'a@b.c' }, returnUrl: 'https://x/y', cancelUrl: 'https://x/z', metadata: {} }, { DODO_API_KEY_TEST: 'k' }, async () => { throw new Error('no') })
    return false
  } catch (e) {
    return e instanceof dodo.DodoCheckoutError && e.code === 'product_missing' && e.status === 503
  }
})())
ok('createDodoCheckout monta o POST certo (Bearer, product_cart, USD, sem allowed_payment_method_types)', await (async () => {
  let seen = null
  const res = await dodo.createDodoCheckout(
    { sku: 'first_pack', customer: { email: 'a@b.c', name: 'A' }, returnUrl: 'https://x/y', cancelUrl: 'https://x/z', metadata: { supabase_user_id: 'u1' } },
    { DODO_API_KEY_TEST: 'k', DODO_PRODUCT_FIRST_PACK_TEST: 'prod_from_env' },
    async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ session_id: 'cks_1', checkout_url: 'https://checkout.dodopayments.com/s/1' }), { status: 200 }) },
  )
  const b = JSON.parse(seen.init.body)
  return seen.url === 'https://test.dodopayments.com/checkouts'
    && seen.init.headers.Authorization === 'Bearer k'
    && b.product_cart[0].product_id === 'prod_from_env'
    && b.billing_currency === 'USD'
    && !('allowed_payment_method_types' in b)
    && b.metadata.supabase_user_id === 'u1'
    && res.sessionId === 'cks_1' && res.checkoutUrl.startsWith('https://')
})())
ok('DODO_ENV_NAMES lista as 12 envs exatas do handoff', JSON.stringify(dodo.DODO_ENV_NAMES) === JSON.stringify([
  'DODO_MODE', 'DODO_API_KEY', 'DODO_API_KEY_TEST', 'DODO_WEBHOOK_SECRET',
  'DODO_PRODUCT_STARTER', 'DODO_PRODUCT_CREATOR', 'DODO_PRODUCT_STUDIO', 'DODO_PRODUCT_FIRST_PACK',
  'DODO_PRODUCT_STARTER_TEST', 'DODO_PRODUCT_CREATOR_TEST', 'DODO_PRODUCT_STUDIO_TEST', 'DODO_PRODUCT_FIRST_PACK_TEST',
]))

// ── BLOCO C — a rota de checkout responde 503 amarrada a isDodoEnabled ──────
console.log('\nC. checkout: 503 pelo nome da env, nunca 500, amarrado à variável')
const enabledDecl = rotaCheckout.match(/const enabled = isDodoEnabled\(\)\n\s*const missingEnv = dodoMissingEnvFor\(sku\)\n\s*if \(!enabled \|\| missingEnv\.length > 0\) \{([\s\S]*?)\n  \}/)
ok('existe o bloco `if (!enabled || missingEnv.length > 0)` logo após `const enabled = isDodoEnabled()`', !!enabledDecl)
ok('esse bloco responde 503 (não 500) e devolve missing_env', !!enabledDecl && /status: 503/.test(enabledDecl[1]) && /missing_env: missingEnv/.test(enabledDecl[1]))
ok('esse bloco grava dodo_checkout_unavailable', !!enabledDecl && /'dodo_checkout_unavailable'/.test(enabledDecl[1]))
ok('o portão do trilho vem ANTES de auth.getUser (sem chave, não toca sessão)', rotaCheckout.indexOf('const enabled = isDodoEnabled()') < rotaCheckout.indexOf('supabase.auth.getUser()'))
ok('a rota nunca responde 500', !/status: 500/.test(rotaCheckout))
ok('modo test só para contas internas (chave de teste = dinheiro de brinquedo)', /mode === 'test' && !isInternalEmail\(user\.email\)/.test(rotaCheckout))
ok('exporta GET e POST', /export async function GET\(/.test(rotaCheckout) && /export async function POST\(/.test(rotaCheckout))
ok('país vem de x-vercel-ip-country como na Stripe', /req\.headers\.get\('x-vercel-ip-country'\) \?\? 'US'/.test(rotaCheckout))
ok('sucesso grava dodo_checkout_started com sku/tier/session_id/ip_country/mode', (() => {
  const m = rotaCheckout.match(/'dodo_checkout_started',[\s\S]*?\{([\s\S]*?)\n      \},/)
  return !!m && ['sku', 'tier', 'session_id', 'ip_country', 'mode'].every((k) => new RegExp(`\\b${k}\\b`).test(m[1]))
})())
ok('metadata mandado à Dodo é só string (pack_credits via String())', /pack_credits: String\(credits\)/.test(rotaCheckout) && /supabase_user_id: user\.id/.test(rotaCheckout) && /ip_country: country/.test(rotaCheckout))
ok('GET redireciona 307 para checkout_url', /NextResponse\.redirect\(session\.checkoutUrl, \{ status: 307 \}\)/.test(rotaCheckout))
ok('não restringe allowed_payment_method_types', !/allowed_payment_method_types/.test(rotaCheckout) && !/allowed_payment_method_types/.test(libDodo.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\* [^\n]*/g, '')))

// ── BLOCO D — webhook: fecha fechado, 401, guard solto na falha, 200 no resto ─
console.log('\nD. webhook: ordem que não se inverte')
const iSecret = rotaWebhook.indexOf("process.env.DODO_WEBHOOK_SECRET")
const iVerify = rotaWebhook.indexOf('verifyDodoWebhook(rawBody, req.headers, secret)')
const iGuard = rotaWebhook.indexOf("from('dodo_events').insert(")
const iSwitch = rotaWebhook.indexOf('switch (eventType)')
const iCatch = rotaWebhook.indexOf('} catch (error) {', iSwitch)
const iRelease = rotaWebhook.indexOf("from('dodo_events').delete().eq('id', webhookId)")
ok('lê o corpo CRU (req.text) antes de qualquer parse', rotaWebhook.indexOf('await req.text()') < rotaWebhook.indexOf('parseDodoEnvelope(rawBody)') && rotaWebhook.indexOf('await req.text()') < iVerify)
ok('sem DODO_WEBHOOK_SECRET → 503 (fail closed) antes da verificação', (() => {
  const m = rotaWebhook.match(/if \(!secret \|\| !secret\.trim\(\)\) \{([\s\S]*?)\n  \}/)
  return !!m && /status: 503/.test(m[1]) && iSecret < iVerify
})())
ok('assinatura inválida → 401 sem efeito colateral (antes do admin e do guard)', (() => {
  const m = rotaWebhook.match(/if \(!signatureOk\) \{([\s\S]*?)\n  \}/)
  return !!m && /status: 401/.test(m[1]) && iVerify < iGuard && iVerify < rotaWebhook.indexOf('const admin = adminClient()')
})())
ok('a decisão do 401 vem do retorno de verifyDodoWebhook', /const signatureOk = verifyDodoWebhook\(rawBody, req\.headers, secret\)/.test(rotaWebhook))
ok('guard de idempotência (dodo_events insert) ANTES do switch de concessão', iGuard > 0 && iSwitch > 0 && iGuard < iSwitch)
ok('duplicata (23505) → 200 sem conceder', /guardErr\.code === '23505'\) \{\n\s*return NextResponse\.json\(\{ received: true, duplicate: true \}\)/.test(rotaWebhook))
ok('guard indisponível → 500 (fornecedor reenvia), nunca concede sem livro', /guard insert error[\s\S]*?status: 500/.test(rotaWebhook))
ok('o DELETE do guard mora DENTRO do catch da concessão', iCatch > 0 && iRelease > iCatch && iRelease < rotaWebhook.indexOf('status: 500', iCatch))
ok('o DELETE só roda se o guard foi adquirido (guardAcquired)', /if \(guardAcquired\) \{\n\s*try \{\n\s*const \{ error: releaseError \} = await admin\.from\('dodo_events'\)\.delete\(\)/.test(rotaWebhook))
ok('depois de soltar o guard, responde 500 (retry), nunca 200', (() => {
  const tail = rotaWebhook.slice(iCatch)
  return /status: 500/.test(tail) && !/received: true/.test(tail)
})())
ok('erro do grant NÃO é engolido (não há catch vazio nem catch que retorna 200 no switch)', (() => {
  const body = rotaWebhook.slice(iSwitch, iCatch)
  return !/catch\s*\(/.test(body)
})())
ok('tipo desconhecido → 200 { ignored } no ramo default, sem status', (() => {
  const m = rotaWebhook.match(/default:\n([\s\S]*?)\n    \}\n  \} catch/)
  return !!m && /NextResponse\.json\(\{ received: true, ignored: eventType \}\)/.test(m[1]) && !/status:/.test(m[1])
})())
ok('payment.succeeded de pacote concede pelo CATÁLOGO, não pelo metadata', /grantOneTimePackCredits\(admin, \{ userId: resolved\.userId, credits: dodoSkuCredits\('first_pack'\) \}\)/.test(rotaWebhook) && !/pack_credits/.test(rotaWebhook.slice(iSwitch, iCatch)))
ok('subscription.active concede plano via grantSubscriptionPlan com o tier do catálogo', /const tier = DODO_SKU_TO_TIER\[sku\]/.test(rotaWebhook) && /grantSubscriptionPlan\(admin, \{ userId: resolved\.userId, tier, subscriptionId/.test(rotaWebhook))
ok('conta inexistente → dodo_webhook_orphan + 200 (não retenta para sempre)', (() => {
  const m = rotaWebhook.match(/if \('orphan' in resolved\) \{([\s\S]*?)\n        \}/)
  return !!m && /'dodo_webhook_orphan'/.test(m[1]) && /NextResponse\.json\(\{ received: true, orphan: resolved\.orphan \}\)/.test(m[1]) && /console\.error/.test(m[1])
})())
ok('payment_success carrega rail=dodo e source=dodo_webhook', /rail: 'dodo'/.test(rotaWebhook) && /source: 'dodo_webhook'/.test(rotaWebhook) && /name: 'payment_success'/.test(rotaWebhook))
ok('payment_success tem id determinístico por dodo_payment_id (dedupe entre retries)', /deterministicUuid\(`payment_success:dodo:\$\{paymentId\}`\)/.test(rotaWebhook) && /\.contains\('metadata', \{ dodo_payment_id: paymentId \}\)/.test(rotaWebhook))
ok('webhook nunca loga o corpo cru nem o segredo', !/console\.(log|error|warn)\([^)]*\brawBody\b/.test(rotaWebhook) && !/console\.(log|error|warn)\([^)]*\bsecret\b/.test(rotaWebhook))

// ── BLOCO E — nenhum id de produto cravado ──────────────────────────────────
console.log('\nE. nenhum `pdt_` em app/ ou lib/')
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|js|mjs|json)$/.test(entry)) out.push(full)
  }
  return out
}
const arquivos = [...walk(path.join(raiz, 'app')), ...walk(path.join(raiz, 'lib'))]
const comPdt = arquivos.filter((f) => /pdt_[A-Za-z0-9]{6,}/.test(readFileSync(f, 'utf8')))
ok(`nenhum dos ${arquivos.length} arquivos de app/ e lib/ contém um literal pdt_…`, comPdt.length === 0, comPdt.map((f) => path.relative(raiz, f)).join(', '))
ok('o id do produto na rota vem de dodoProductId (env)', /const productId = dodoProductId\(input\.sku, env\)/.test(libDodo) && /product_id: productId/.test(libDodo))

// ── BLOCO F — preço e crédito vêm de lib/checkoutPricing.ts ─────────────────
console.log('\nF. preço/crédito não são redigitados')
ok('lib/dodoCatalog importa PACK_CREDITS/TIER_CREDITS/TIER_PRICES/PACK_PRICE_MINOR de @/lib/checkoutPricing', /import \{[\s\S]*?PACK_CREDITS,[\s\S]*?PACK_PRICE_MINOR,[\s\S]*?TIER_CREDITS,[\s\S]*?TIER_PRICES,[\s\S]*?\} from '@\/lib\/checkoutPricing'/.test(libCatalog))
ok('first_pack → PACK_CREDITS.starter e PACK_PRICE_MINOR.usd (o MESMO ?pack=starter da Stripe)', /return PACK_CREDITS\.starter/.test(libCatalog) && /return PACK_PRICE_MINOR\.usd/.test(libCatalog))
ok('assinaturas → TIER_CREDITS / TIER_PRICES pelo mapa sku→tier', /TIER_CREDITS\[DODO_SKU_TO_TIER\[sku\]\]/.test(libCatalog) && /TIER_PRICES\[DODO_SKU_TO_TIER\[sku\]\]\.usd/.test(libCatalog))
ok('mapa sku→tier: starter→starter, creator→basic, studio→pro', /starter: 'starter',\n\s*creator: 'basic',\n\s*studio: 'pro',/.test(libCatalog))
const semComentario = (s) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const literaisDePreco = /\b(490|700|1500|2900|30|40|90|180)\b/
ok('nenhum número de preço/crédito digitado em dodoCatalog, grant, checkout ou webhook', [libCatalog, libGrant, rotaCheckout, rotaWebhook].every((s) => !literaisDePreco.test(semComentario(s).replace(/\{8,64\}/g, ''))))
ok('lib/payments/grant.ts concede plano com TIER_CREDITS[tier]', /const credits = TIER_CREDITS\[input\.tier\]/.test(libGrant))
ok('grant.ts falha ALTO (RetryableGrantError), nunca engole', (libGrant.match(/throw new RetryableGrantError\(/g) || []).length >= 6 && !/catch\s*\(/.test(libGrant))
ok('grant de pacote escreve video_credits somado + has_paid:true (espelho da Stripe)', /\.update\(\{ video_credits: after, has_paid: true \}\)/.test(libGrant))
ok('grant de assinatura escreve is_pro/plan/video_credits/cinematic_tokens/has_paid (espelho da Stripe)', /is_pro: true,\n\s*plan: input\.tier,\n\s*video_credits: after,\n\s*cinematic_tokens: cinematicTokens,\n\s*has_paid: true,/.test(libGrant))
ok('grant de assinatura é idempotente por subscription id (resumed)', /row\[input\.subscriptionColumn\] === input\.subscriptionId/.test(libGrant) && /const after = resumed \? before : before \+ credits/.test(libGrant))

// ── BLOCO G — sink público não cunha os eventos do trilho ───────────────────
console.log('\nG. eventos do trilho são server-only')
const setServerOnly = rotaEvents.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\n\]\)/)
ok('SERVER_ONLY_EVENTS existe', !!setServerOnly)
for (const nome of ['dodo_checkout_unavailable', 'dodo_checkout_started', 'dodo_checkout_failed', 'dodo_webhook_orphan', 'dodo_payment_failed', 'dodo_subscription_revoked', 'payment_success']) {
  ok(`  '${nome}' está no SERVER_ONLY_EVENTS`, !!setServerOnly && new RegExp(`'${nome}'`).test(setServerOnly[1]))
}

// ── BLOCO H — migration: guard com RLS e sem grant público ──────────────────
console.log('\nH. migration do livro de idempotência')
ok('cria public.dodo_events com id text primary key', /create table if not exists public\.dodo_events \(\n\s*id text primary key/.test(migracao))
ok('RLS ligado', /alter table public\.dodo_events enable row level security;/.test(migracao))
ok('revoga privilégios de public/anon/authenticated', /revoke all privileges on table public\.dodo_events from public;/.test(migracao) && /from anon;/.test(migracao) && /from authenticated;/.test(migracao))
ok('nenhuma policy pública (create policy ausente)', !/create policy/i.test(migracao))
ok('adiciona profiles.dodo_subscription_id que o webhook grava', /add column if not exists dodo_subscription_id text/.test(migracao) && /'dodo_subscription_id' as const/.test(rotaWebhook))

// ── Fecho ───────────────────────────────────────────────────────────────────
console.log(`\n${total - falhas.length}/${total} verificações passaram`)
if (falhas.length) {
  console.log('FALHAS:'); for (const f of falhas) console.log(`  - ${f}`)
  process.exit(1)
}
