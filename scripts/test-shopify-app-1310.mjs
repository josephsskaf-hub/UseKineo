// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-SHOPIFY-2026-10-13 — o app da Shopify nasce desligado e só confia em assinatura
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede, em uma frase: que alguém instale, receba webhook ou leia produto se passando pela Shopify,
// que o app acorde sem o "vai" do fundador, ou que um token de loja vaze em log/evento/banco em claro.
//
//  A. HMAC do OAuth (hex da query ordenada) — executado com assinatura real; errada/adulterada/ausente = recusa.
//  B. HMAC do webhook (base64 do corpo CRU) — idem; a rota lê req.text() e confere ANTES de tudo, 401 se errada.
//  C. Token de sessão do App Bridge (JWT HS256) — assinatura, exp, nbf, aud, iss=dest, loja *.myshopify.com.
//  D. Loja pela regex ancorada nas duas pontas.
//  E. Interruptor SHOPIFY_APP_LIVE: ausente/false = 404 em TODA rota, antes de qualquer leitura.
//  F. Ordem das travas nas rotas (hmac antes da troca de token, state em tempo constante, sessão antes do banco).
//  G. Nenhum token em log ou evento; redactForLog executado.
//  H. Token cifrado (AES-256-GCM): ida e volta, adulterado = null, sem chave = não grava.
//  I. Migration: RLS, sem policy, sem coluna de token em claro.
//  J. Tela embutida: App Bridge primeiro, nada de innerHTML, frame-ancestors por loja.
//
// Rodar: node scripts/test-shopify-app-1310.mjs
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
// Código sem as linhas de comentário // (os cabeçalhos citam o que é proibido para explicar a regra).
const semComentario = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
const ordem = (src, ...marcos) => {
  let pos = -1
  for (const m of marcos) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}

const ROTAS = {
  auth: ['app', 'api', 'shopify', 'auth', 'route.ts'],
  callback: ['app', 'api', 'shopify', 'auth', 'callback', 'route.ts'],
  webhooks: ['app', 'api', 'shopify', 'webhooks', 'route.ts'],
  products: ['app', 'api', 'shopify', 'products', 'route.ts'],
  ads: ['app', 'api', 'shopify', 'ads', 'route.ts'],
  page: ['app', 'shopify', 'app', 'route.ts'],
  open: ['app', 'shopify', 'open', 'route.ts'],
}
const src = Object.fromEntries(Object.entries(ROTAS).map(([k, p]) => [k, ler(...p)]))
const libCore = ler('lib', 'shopify', 'core.ts')
const libServer = ler('lib', 'shopify', 'server.ts')
const migracao = ler('supabase', 'migrations', '20261013200000_shopify_shops.sql')
const simples = ler('app', '(dashboard)', 'ads', 'v2', 'AdsV2Simple.tsx')

// ── 0 — o núcleo é importável fora do Next ─────────────────────────────────
console.log('\n0. lib/shopify/core.ts é puro')
ok('core.ts não importa alias `@/`', !/from\s+['"]@\//.test(libCore))
ok('core.ts não escreve em console', !/console\.\w+\(/.test(libCore))
ok('marca KINEO-SHOPIFY-2026-10-13 em todos os arquivos', [libCore, libServer, migracao, simples, ...Object.values(src)].every((s) => s.includes('KINEO-SHOPIFY-2026-10-13')))
const core = await import(pathToFileURL(path.join(raiz, 'lib', 'shopify', 'core.ts')).href)

const SECRET = `shpss_${randomBytes(16).toString('hex')}`
const WRONG = `shpss_${randomBytes(16).toString('hex')}`
const API_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'
const creds = { apiKey: API_KEY, apiSecret: SECRET, scopes: 'read_products' }

// ── A — HMAC do OAuth ───────────────────────────────────────────────────────
console.log('\nA. HMAC da query do OAuth (executado)')
const q = new URLSearchParams({ shop: 'loja-teste.myshopify.com', code: 'abc123', state: 'n0nce', timestamp: '1760000000', host: 'YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvbG9qYQ' })
const msgEsperada = 'code=abc123&host=YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvbG9qYQ&shop=loja-teste.myshopify.com&state=n0nce&timestamp=1760000000'
ok('mensagem = parâmetros em ordem alfabética, sem hmac', core.oauthHmacMessage(new URLSearchParams([...q, ['hmac', 'x']])) === msgEsperada)
const hmacCerto = createHmac('sha256', SECRET).update(msgEsperada).digest('hex')
const comHmac = (h, extra = {}) => { const p = new URLSearchParams(q); for (const [k, v] of Object.entries(extra)) p.set(k, v); if (h !== null) p.set('hmac', h); return p }
ok('assinatura certa = aceita', core.verifyOAuthQueryHmac(comHmac(hmacCerto), SECRET) === true)
ok('assinatura com OUTRO segredo = recusa', core.verifyOAuthQueryHmac(comHmac(createHmac('sha256', WRONG).update(msgEsperada).digest('hex')), SECRET) === false)
ok('parâmetro adulterado (shop trocada) = recusa', core.verifyOAuthQueryHmac(comHmac(hmacCerto, { shop: 'outra.myshopify.com' }), SECRET) === false)
ok('sem hmac = recusa', core.verifyOAuthQueryHmac(comHmac(null), SECRET) === false)
ok('hmac que não é hex de 64 = recusa', core.verifyOAuthQueryHmac(comHmac('zz'), SECRET) === false)
ok('segredo vazio = recusa (nunca HMAC com chave vazia)', core.verifyOAuthQueryHmac(comHmac(createHmac('sha256', '').update(msgEsperada).digest('hex')), '') === false)

// ── B — HMAC do webhook ─────────────────────────────────────────────────────
console.log('\nB. HMAC do corpo do webhook (executado)')
const corpo = JSON.stringify({ shop_id: 1, shop_domain: 'loja-teste.myshopify.com', customer: { id: 7, email: 'x@y.z' } })
const hWeb = createHmac('sha256', SECRET).update(corpo).digest('base64')
ok('assinatura certa = aceita', core.verifyWebhookHmac(corpo, hWeb, SECRET) === true)
ok('outro segredo = recusa', core.verifyWebhookHmac(corpo, createHmac('sha256', WRONG).update(corpo).digest('base64'), SECRET) === false)
ok('corpo adulterado = recusa', core.verifyWebhookHmac(corpo.replace('7', '8'), hWeb, SECRET) === false)
ok('corpo re-serializado com espaço = recusa (só o CRU vale)', core.verifyWebhookHmac(JSON.stringify(JSON.parse(corpo), null, 1), hWeb, SECRET) === false)
ok('cabeçalho ausente = recusa', core.verifyWebhookHmac(corpo, null, SECRET) === false && core.verifyWebhookHmac(corpo, '', SECRET) === false)

// ── C — token de sessão ─────────────────────────────────────────────────────
console.log('\nC. token de sessão do App Bridge (JWT HS256, executado)')
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = 1_760_000_000
const jwt = (payload, { secret = SECRET, header = { alg: 'HS256', typ: 'JWT' } } = {}) => {
  const h = b64u(header)
  const p = b64u(payload)
  return `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`
}
const base = { iss: 'https://loja-teste.myshopify.com/admin', dest: 'https://loja-teste.myshopify.com', aud: API_KEY, sub: '42', exp: now + 60, nbf: now - 5, iat: now - 5, jti: 'j', sid: 's' }
const v = (t) => core.verifySessionToken(t, creds, now)
const r0 = v(jwt(base))
ok('token certo = aceito, loja lida do dest', r0.ok === true && r0.shop === 'loja-teste.myshopify.com')
ok('assinado com outro segredo = signature', v(jwt(base, { secret: WRONG })).reason === 'signature')
ok('alg none = recusa', v(jwt(base, { header: { alg: 'none' } })).ok === false)
ok('expirado = expired', v(jwt({ ...base, exp: now - 60 })).reason === 'expired')
ok('nbf no futuro = not_yet_valid', v(jwt({ ...base, nbf: now + 120 })).reason === 'not_yet_valid')
ok('aud de outro app = audience', v(jwt({ ...base, aud: 'outro-app' })).reason === 'audience')
ok('iss de outra loja que o dest = issuer', v(jwt({ ...base, iss: 'https://outra.myshopify.com/admin' })).reason === 'issuer')
ok('dest fora de *.myshopify.com = shop', v(jwt({ ...base, iss: 'https://evil.example.com/admin', dest: 'https://evil.example.com' })).reason === 'shop')
ok('lixo = malformed', v('nao.e.jwt').ok === false && v(null).ok === false)
ok('bearerFrom só aceita "Bearer <jwt>"', core.bearerFrom(`Bearer ${jwt(base)}`) !== null && core.bearerFrom('Basic abc') === null && core.bearerFrom(null) === null)

// ── D — loja ────────────────────────────────────────────────────────────────
console.log('\nD. domínio da loja (regex ancorada)')
ok('loja normal aceita', core.isValidShopDomain('minha-loja.myshopify.com'))
ok('sufixo de atacante recusado', !core.isValidShopDomain('minha-loja.myshopify.com.atacante.com'))
ok('prefixo/caminho recusado', !core.isValidShopDomain('https://minha-loja.myshopify.com') && !core.isValidShopDomain('evil.com/minha-loja.myshopify.com'))
ok('normalizeShop baixa a caixa e recusa lixo', core.normalizeShop(' Minha-Loja.myshopify.com ') === 'minha-loja.myshopify.com' && core.normalizeShop('x') === null)

// ── E — interruptor ─────────────────────────────────────────────────────────
console.log('\nE. interruptor SHOPIFY_APP_LIVE (desligado = 404)')
ok('ausente = desligado', core.shopifyAppLive({}) === false)
ok('"false"/"0"/"" = desligado', ['false', '0', '', 'off', 'nope'].every((x) => core.shopifyAppLive({ SHOPIFY_APP_LIVE: x }) === false))
ok('"true" = ligado', core.shopifyAppLive({ SHOPIFY_APP_LIVE: 'true' }) === true)
ok('shopifyNotFound = 404', core.shopifyNotFound().status === 404)
ok('credenciais ausentes = null', core.readShopifyCreds({}) === null && core.readShopifyCreds({ SHOPIFY_API_KEY: 'k' }) === null)
ok('escopo padrão = read_products (mínimo)', core.readShopifyCreds({ SHOPIFY_API_KEY: 'k', SHOPIFY_API_SECRET: 's' }).scopes === 'read_products')
for (const [nome, s] of Object.entries(src)) {
  const handlers = [...s.matchAll(/export async function (GET|POST)\([^)]*\) \{\n([^\n]*)/g)]
  ok(`${nome}: todo handler começa com o interruptor → 404`, handlers.length > 0 && handlers.every((m) => m[2].trim() === 'if (!shopifyAppLive()) return shopifyNotFound()'), `${handlers.length} handler(s)`)
}
const todosFontes = [libCore, libServer, ...Object.values(src)].join('\n')
ok('nenhum arquivo do app liga o interruptor por padrão', !/SHOPIFY_APP_LIVE\s*(\?\?|\|\|)\s*['"](true|1|yes|on)['"]/.test(todosFontes) && !/env\.SHOPIFY_APP_LIVE\s*=[^=]/.test(todosFontes))
let vercelJson = ''
try { vercelJson = ler('vercel.json') } catch { vercelJson = '' }
ok('vercel.json não liga o app', !/SHOPIFY_APP_LIVE/.test(vercelJson))
ok('nenhum arquivo do app lê .env (só process.env)', !/\.env(\.local)?['"]/.test(todosFontes) && !/readFileSync/.test(todosFontes))

// ── F — ordem das travas ────────────────────────────────────────────────────
console.log('\nF. ordem das travas nas rotas')
ok('webhook: corpo CRU (req.text) → HMAC → loja → banco', ordem(src.webhooks, 'shopifyAppLive()', 'await req.text()', 'verifyWebhookHmac(raw', "status: 401", 'normalizeShop(', 'shopifyAdmin()'))
ok('webhook: nunca req.json()', !/req\.json\(/.test(semComentario(src.webhooks)))
ok('webhook: os 3 de privacidade + app/uninstalled', ['customers/data_request', 'customers/redact', 'shop/redact', 'app/uninstalled'].every((t) => libCore.includes(`'${t}'`)))
ok('webhook: falha devolve o recibo e 500 (reenvio processa)', ordem(src.webhooks, 'if (!done) await forgetWebhookDelivery', "status: 500"))
ok('callback: HMAC obrigatório → loja → state (tempo constante) → code → troca → escopos → cifra', ordem(src.callback, 'verifyOAuthQueryHmac(q, creds.apiSecret)', 'normalizeShop(', 'safeEqual(state, cookie)', "q.get('code')", 'exchangeCode(', 'scopesCover(', 'saveShopTokens('))
ok('callback: HMAC NÃO é opcional (sem "q.has(\'hmac\') &&")', !/q\.has\('hmac'\)\s*&&/.test(src.callback))
ok('início: hmac presente tem de bater; nonce no cookie httpOnly', ordem(src.auth, "q.has('hmac') && !verifyOAuthQueryHmac", 'newNonce()', 'httpOnly: true'))
ok('products/ads: sessão verificada ANTES do banco e da Shopify', ['products', 'ads'].every((k) => ordem(src[k], 'verifySessionToken(', "status: 401", 'shopifyAdmin()', 'validAccessToken(', 'adminGraphql')))
ok('ads: não cria pedido, não cobra, não chama a fal', !/ads_v2_orders|chargeAdsV2|video_credits|fal\.run|queue\.fal/.test(src.ads))
ok('saveShopTokens: sem chave de cifra = não grava', ordem(libServer, 'const key = readTokenKey()', 'if (!key) return false', '.upsert('))
ok('tokens pedidos com expiring=1 (app público novo)', /codeGrantBody[\s\S]{0,200}expiring: '1'/.test(libCore) && /tokenExchangeBody[\s\S]{0,500}expiring: '1'/.test(libCore))

// ── G — nada de token em log ────────────────────────────────────────────────
console.log('\nG. nenhum token em log ou evento')
const consoles = todosFontes.split('\n').filter((l) => /console\.\w+\(/.test(l))
ok('todo console.* do app passa por redactForLog', consoles.length > 0 && consoles.every((l) => l.includes('redactForLog(')), consoles.filter((l) => !l.includes('redactForLog(')).join(' | '))
const eventos = todosFontes.split('\n').filter((l) => l.includes('writeServerEvent('))
ok('nenhum evento leva token/segredo/code', eventos.length > 0 && eventos.every((l) => !/accessToken|sessionToken|refreshToken|apiSecret|access_token|refresh_token|\bcode\b|SECRET/i.test(l)))
const red = core.redactForLog({ access_token: 'shpat_abc', refresh_token: 'shprt_x', client_secret: 's', code: 'c', hmac: 'h', shop: 'a.myshopify.com', msg: 'falhou com shpat_123abc e Bearer eyJa.eyJb.sig', status: 401 })
ok('redactForLog esconde chaves de segredo', ['access_token', 'refresh_token', 'client_secret', 'code', 'hmac'].every((k) => red[k] === '[redacted]'))
ok('redactForLog esconde token dentro de texto', !String(red.msg).includes('shpat_123abc') && !String(red.msg).includes('eyJa.eyJb.sig'))
ok('redactForLog mantém o que não é segredo', red.shop === 'a.myshopify.com' && red.status === 401)
ok('nenhuma resposta JSON devolve token', !/NextResponse\.json\([^)]*(accessToken|access_token|refresh)/.test(todosFontes))

// ── H — cifra ───────────────────────────────────────────────────────────────
console.log('\nH. token cifrado (AES-256-GCM)')
const key = randomBytes(32)
const selado = core.encryptToken('shpat_segredo123', key)
ok('cifrado não contém o token', !selado.includes('shpat_segredo123') && selado.startsWith('v1.'))
ok('ida e volta', core.decryptToken(selado, key) === 'shpat_segredo123')
const partes = selado.split('.')
const adulterado = [...partes.slice(0, 3), Buffer.from(Buffer.from(partes[3], 'base64url').map((b, i) => (i === 0 ? b ^ 1 : b))).toString('base64url')].join('.')
ok('cifra adulterada = null', core.decryptToken(adulterado, key) === null)
ok('outra chave = null', core.decryptToken(selado, randomBytes(32)) === null)
ok('readTokenKey: ausente/curta = null; 32 bytes = ok', core.readTokenKey({}) === null && core.readTokenKey({ SHOPIFY_TOKEN_ENC_KEY: 'abc' }) === null && core.readTokenKey({ SHOPIFY_TOKEN_ENC_KEY: key.toString('base64') })?.length === 32)

// ── I — migration ───────────────────────────────────────────────────────────
console.log('\nI. migration shopify_shops (não aplicada)')
ok('RLS ligado nas duas tabelas', /alter table public\.shopify_shops enable row level security/.test(migracao) && /alter table public\.shopify_webhook_receipts enable row level security/.test(migracao))
ok('nenhuma policy (só a chave de serviço)', !/create policy/i.test(migracao))
ok('anon/authenticated sem privilégio', /revoke all on public\.shopify_shops from anon, authenticated, public/.test(migracao))
ok('token só em coluna _enc', /access_token_enc text/.test(migracao) && !/\baccess_token text/.test(migracao) && !/\brefresh_token text/.test(migracao))
ok('domínio da loja com a mesma regex', migracao.includes("'^[a-z0-9][a-z0-9-]*\\.myshopify\\.com$'"))

// ── J — tela embutida ───────────────────────────────────────────────────────
console.log('\nJ. tela embutida /shopify/app')
const scripts = [...src.page.matchAll(/<script[^>]*>/g)].map((m) => m[0])
ok('App Bridge é o PRIMEIRO script (exigência 2.2.3)', scripts[0]?.includes('cdn.shopify.com/shopifycloud/app-bridge.js'))
ok('meta shopify-api-key presente', src.page.includes('<meta name="shopify-api-key"'))
ok('dado da loja nunca entra por innerHTML', !/innerHTML/.test(semComentario(src.page)) && /textContent/.test(src.page))
ok('frame-ancestors por loja', /frame-ancestors https:\/\/\$\{shop\} https:\/\/admin\.shopify\.com/.test(libCore) && src.page.includes('frameAncestors(shop)'))
ok('a tela chama a API com o token de sessão', src.page.includes('shopify.idToken()') && src.page.includes("Authorization: 'Bearer ' + token"))
ok('o HTML não leva segredo', !/apiSecret|SHOPIFY_API_SECRET/.test(src.page.slice(0, src.page.indexOf('export async function GET'))))

// ── K — Studio Ads lê o link só com from=shopify ───────────────────────────
console.log('\nK. /ads/v2 com o link do produto')
ok('prefill só com from=shopify, https, uma vez, pelo importLink', /qs\.get\('from'\) === 'shopify'/.test(simples) && /shopifyLinkDone\.current = true/.test(simples) && /void importLink\(raw\)/.test(simples))
ok('porta /shopify/open preserva o link no login', ordem(src.open, 'productLinkForAd(', "dest.pathname = '/login'", 'adHandoffPath(link)', "dest.pathname = '/ads/v2'"))
ok('productLinkForAd só aceita https público', core.productLinkForAd('https://loja.com/products/x') === 'https://loja.com/products/x' && core.productLinkForAd('http://loja.com/x') === null && core.productLinkForAd('javascript:alert(1)') === null && core.productLinkForAd(null) === null)

console.log(`\n${total - falhas.length}/${total} verificações`)
if (falhas.length) {
  console.log(`\nFALHOU (${falhas.length}):\n - ${falhas.join('\n - ')}`)
  process.exit(1)
}
console.log('OK — KINEO-SHOPIFY-2026-10-13')
