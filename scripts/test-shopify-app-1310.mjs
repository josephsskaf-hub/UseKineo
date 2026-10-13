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
  // KINEO-SHOPIFY-2026-10-13 (etapa 2)
  status: ['app', 'api', 'shopify', 'ads', 'status', 'route.ts'],
  account: ['app', 'api', 'shopify', 'account', 'route.ts'],
  attach: ['app', 'api', 'shopify', 'ads', 'attach', 'route.ts'],
  cron: ['app', 'api', 'cron', 'shopify-plans', 'route.ts'],
}
const src = Object.fromEntries(Object.entries(ROTAS).map(([k, p]) => [k, ler(...p)]))
const libCore = ler('lib', 'shopify', 'core.ts')
const libServer = ler('lib', 'shopify', 'server.ts')
const migracao = ler('supabase', 'migrations', '20261013200000_shopify_shops.sql')
const simples = ler('app', '(dashboard)', 'ads', 'v2', 'AdsV2Simple.tsx')
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — as libs novas e a migration da etapa 2.
const LIB2 = Object.fromEntries(['account', 'billing', 'adFlow', 'request'].map((n) => [n, ler('lib', 'shopify', `${n}.ts`)]))
LIB2.card = ler('lib', 'shopify', 'card.tsx')
const migracao2 = ler('supabase', 'migrations', '20261013210000_shopify_etapa2.sql')

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
const todosFontes = [libCore, libServer, ...Object.values(LIB2), ...Object.values(src)].join('\n')
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
ok('products: sessão verificada ANTES do banco e da Shopify', ordem(src.products, 'verifySessionToken(', "status: 401", 'shopifyAdmin()', 'validAccessToken(', 'adminGraphql'))
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — re-ancorado: as rotas que agem na conta da loja passam pela porta ÚNICA lib/shopify/request.ts
// (credenciais → sessão → banco → token da loja → conta), logo depois do interruptor; a ordem é conferida na porta.
ok('porta da loja: credenciais → sessão (401) → banco → token da loja (401 reauthorize) → conta', ordem(LIB2.request, 'readShopifyCreds()', 'verifySessionToken(', '401', 'shopifyAdmin()', 'validAccessToken(', "'reauthorize' }, 401", 'ensureShopAccount('))
ok('ads/status/account/attach: o interruptor e logo a porta da loja, antes de corpo, banco ou Shopify', ['ads', 'status', 'account', 'attach'].every((k) => ordem(src[k], 'if (!shopifyAppLive()) return shopifyNotFound()', 'await shopRequestContext(req)', 'if (!gateIn.ok) return gateIn.res') && semComentario(src[k]).indexOf('await shopRequestContext(req)') < Math.min(...['req.json(', 'adminGraphql<', 'adminGraphql(', '.from('].map((m) => (semComentario(src[k]).indexOf(m) < 0 ? Infinity : semComentario(src[k]).indexOf(m))))))
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


// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// KINEO-SHOPIFY-2026-10-13 (ETAPA 2) — conta por loja, função extraída equivalente, crédito do ciclo idempotente, teto do uso
// extra e interruptor desligado inerte. Executado com o crypto do node, a fonte real e um banco falso com as regras do SQL.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const { createHash } = await import('node:crypto')
const { createOfflineLoader } = await import(pathToFileURL(path.join(raiz, 'scripts', 'test-support', 'offline-ts-loader.mjs')).href)
const { desfazExtracao, textoOriginalV2 } = await import(pathToFileURL(path.join(raiz, 'scripts', 'test-support', 'shopify-extracao-v2-1310.mjs')).href)
process.chdir(raiz)
const sha = (s) => createHash('sha256').update(s).digest('hex')
const trocarUma = (s, de, para) => { if (s.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 60)); return s.split(de).join(para) }

// ── L — conta Kineo por loja (nunca duplica, nunca vincula sem a prova do e-mail) ────────────────────────────────────
console.log('\nL. conta Kineo por loja')
const dono = { email: 'dono@loja.com', emailVerified: true, accountOwner: true }
ok('sem conta com o e-mail + dono provado → CRIA confirmada', JSON.stringify(core.decideShopAccount({ shopEmail: 'Dono@Loja.com', opener: dono, existingUserId: null })) === JSON.stringify({ action: 'create', email: 'dono@loja.com', confirmed: true }))
ok('sem conta + quem abriu NÃO provou o e-mail → cria SEM confirmar', core.decideShopAccount({ shopEmail: 'dono@loja.com', opener: { ...dono, emailVerified: false }, existingUserId: null }).confirmed === false)
ok('conta existe + prova → VINCULA (não duplica)', JSON.stringify(core.decideShopAccount({ shopEmail: 'dono@loja.com', opener: dono, existingUserId: 'u1' })) === JSON.stringify({ action: 'link', userId: 'u1', email: 'dono@loja.com' }))
ok('conta existe + e-mail não verificado → RECUSA (loja com e-mail alheio não pega a conta de ninguém)', core.decideShopAccount({ shopEmail: 'dono@loja.com', opener: { ...dono, emailVerified: false }, existingUserId: 'u1' }).action === 'refuse')
ok('conta existe + quem abriu tem OUTRO e-mail → RECUSA', core.decideShopAccount({ shopEmail: 'dono@loja.com', opener: { ...dono, email: 'staff@loja.com' }, existingUserId: 'u1' }).reason === 'unverified_owner')
ok('loja sem e-mail → RECUSA', core.decideShopAccount({ shopEmail: '', opener: dono, existingUserId: null }).reason === 'no_shop_email')
ok('associated_user lido da resposta do token online', JSON.stringify(core.parseAssociatedUser({ access_token: 'x', associated_user: { email: 'A@B.co', email_verified: true, account_owner: false } })) === JSON.stringify({ email: 'a@b.co', emailVerified: true, accountOwner: false }) && core.parseAssociatedUser({}) === null)

function bancoFalso(state) {
  const calls = []
  const from = (name) => {
    state[name] ??= []
    const q = { op: 'select', filters: [], patch: null, row: null, head: false }
    const rows = () => state[name].filter((r) => q.filters.every((f) => f(r)))
    const exec = () => {
      calls.push({ name, op: q.op })
      if (q.op === 'insert') {
        const r = { id: `id-${state[name].length + 1}`, ...q.row }
        if (name === 'shopify_usage_charges' && state[name].some((x) => x.usage_key === r.usage_key)) return { data: null, error: { code: '23505' } }
        state[name].push(r)
        return { data: r, error: null }
      }
      if (q.op === 'update') { const rs = rows(); rs.forEach((r) => Object.assign(r, q.patch)); return { data: rs[0] ?? null, error: null } }
      if (q.op === 'delete') { const rs = rows(); state[name] = state[name].filter((r) => !rs.includes(r)); return { data: null, error: null } }
      const rs = rows()
      return q.head ? { data: null, count: rs.length, error: null } : { data: q.many ? rs : rs[0] ?? null, error: null }
    }
    const b = {
      select(_c, o) { if (o && o.head) q.head = true; return b },
      insert(r) { q.op = 'insert'; q.row = r; return b },
      update(p) { q.op = 'update'; q.patch = p; return b },
      delete() { q.op = 'delete'; return b },
      eq(k, v) { q.filters.push((r) => r[k] === v); return b },
      in(k, vs) { q.filters.push((r) => vs.includes(r[k])); return b },
      is(k, v) { q.filters.push((r) => (r[k] ?? null) === v); return b },
      limit() { q.many = true; return b },
      maybeSingle() { return Promise.resolve(exec()) },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
    }
    return b
  }
  // Espelho de public.shopify_grant_credits: recibo (loja + ciclo) e crédito juntos; recibo repetido = false e nada soma.
  const rpc = async (fn, a) => {
    calls.push({ name: fn, op: 'rpc' })
    if (fn !== 'shopify_grant_credits') return { data: null, error: { code: '42883' } }
    state.shopify_credit_grants ??= []
    if (state.shopify_credit_grants.some((g) => g.shop_domain === a.p_shop && g.cycle_key === a.p_cycle)) return { data: false, error: null }
    const p = (state.profiles ?? []).find((x) => x.id === a.p_user)
    if (!p) return { data: null, error: { code: 'P0001' } }
    state.shopify_credit_grants.push({ shop_domain: a.p_shop, cycle_key: a.p_cycle, credits: a.p_amount, reason: a.p_reason })
    p.video_credits += a.p_amount
    return { data: true, error: null }
  }
  return { from, rpc, calls, state }
}

async function rodaConta({ profiles = [], opener = dono, shopEmail = 'dono@loja.com', owner = null } = {}) {
  const state = { shopify_shops: [{ shop_domain: 'loja-teste.myshopify.com', owner_user_id: owner, shop_gid: null, partner_development: null, plan_handle: null, plan_status: 'none', plan_checked_at: null, scopes: 'read_products' }], profiles }
  const db = bancoFalso(state)
  const criados = []
  db.auth = { admin: {
    createUser: async (a) => { if (state.profiles.some((p) => p.email === a.email)) return { data: { user: null }, error: { message: 'exists' } }; const id = `novo-${criados.length + 1}`; criados.push(a); state.profiles.push({ id, email: a.email, video_credits: 0 }); return { data: { user: { id } }, error: null } },
    getUserById: async (id) => ({ data: { user: { email: state.profiles.find((p) => p.id === id)?.email ?? null } } }),
  } }
  const events = []
  const load = createOfflineLoader({ mocks: {
    '@/lib/shopify/server': { SHOPIFY_SHOPS_TABLE: 'shopify_shops', adminGraphql: async () => ({ shop: { id: 'gid://shopify/Shop/77', email: shopEmail, name: 'Loja', myshopifyDomain: 'loja-teste.myshopify.com', plan: { partnerDevelopment: false } } }), postTokenRaw: async () => (opener ? { associated_user: { email: opener.email, email_verified: opener.emailVerified, account_owner: true } } : {}) },
    '@/lib/ads/serverAccess': { loadAdsAccess: async () => ({ reason: 'none' }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
  } })
  const A = load('lib/shopify/account.ts')
  const r1 = await A.ensureShopAccount(db, creds, 'loja-teste.myshopify.com', 'jwt', 'shpat_x')
  const r2 = await A.ensureShopAccount(db, creds, 'loja-teste.myshopify.com', 'jwt', 'shpat_x')
  return { r1, r2, criados, state, events }
}
{
  const a = await rodaConta()
  ok('EXECUTADO: loja nova → 1 conta criada, vinculada; 2ª abertura usa a MESMA (nenhuma conta a mais)', a.r1.ok && a.r2.ok && a.r1.userId === a.r2.userId && a.criados.length === 1 && a.state.shopify_shops[0].owner_user_id === a.r1.userId && a.state.shopify_shops[0].shop_gid === 'gid://shopify/Shop/77')
  const b = await rodaConta({ profiles: [{ id: 'antigo', email: 'dono@loja.com', video_credits: 9 }] })
  ok('EXECUTADO: e-mail já tem conta + dono provado → VINCULA a existente, createUser nunca chamado', b.r1.ok && b.r1.userId === 'antigo' && b.criados.length === 0 && b.state.profiles.length === 1)
  const c = await rodaConta({ profiles: [{ id: 'antigo', email: 'dono@loja.com', video_credits: 9 }], opener: { ...dono, emailVerified: false } })
  ok('EXECUTADO: e-mail já tem conta e a Shopify não prova o dono → 403 unverified_owner, nada vinculado, nada criado', !c.r1.ok && c.r1.error === 'unverified_owner' && c.state.shopify_shops[0].owner_user_id === null && c.criados.length === 0)
  const d = await rodaConta({ owner: 'ja-vinculada' })
  ok('EXECUTADO: loja já vinculada → a mesma conta, sem ler Shopify nem criar', d.r1.ok && d.r1.userId === 'ja-vinculada' && d.criados.length === 0)
}
ok('vínculo CONDICIONAL (owner_user_id is null) e releitura do vencedor', ordem(LIB2.account, ".is('owner_user_id', null)", 'const winner = now.row.owner_user_id'))
ok('e-mail ambíguo (2 perfis) nunca escolhe um', /if \(rows\.length > 1\) return \{ ok: false, error: 'account_failed' \}/.test(LIB2.account))
ok('o plano da Shopify NUNCA escreve profiles.plan', !/profiles[\s\S]{0,80}\.update\(/.test(LIB2.account + LIB2.billing) && !/plan:\s*['"]?(starter|business)/.test(LIB2.account))
ok('acesso: o da conta; só "none" vira "subscriber" com plano pago ATIVO fora de loja de teste', ordem(LIB2.account, "own.reason !== 'none' || !shopPaidPlanActive(link)", "reason: 'subscriber'") && /link\.plan_status === 'active'/.test(LIB2.account) && /partner_development !== true \|\| testShopAllowed/.test(LIB2.account))

// ── M — a função extraída é EQUIVALENTE às rotas de antes ───────────────────────────────────────────────────────────
console.log('\nM. /plan e /start extraídos sem mudar uma linha (equivalência)')
const PLAN_BASE_SHA = '95c7c1ec1db4a6bd4ca0c7979e0d672fd89aa9ad3cc5fd043a661f9df824bac1' // app/api/ads/v2/plan/route.ts em c6c414e7
const START_BASE_SHA = 'd80097067c7a40121329c4336c046d177cdd16f678b361c96412b10ab937c49b' // app/api/ads/v2/start/route.ts em c6c414e7
ok('rota + núcleo remontam o /plan de antes BYTE A BYTE', sha(textoOriginalV2('plan', raiz)) === PLAN_BASE_SHA)
ok('rota + núcleo remontam o /start de antes BYTE A BYTE (dinheiro: saldo, trava, débito, amostra, estorno)', sha(textoOriginalV2('start', raiz)) === START_BASE_SHA)
{
  const core2 = ler('lib', 'ads', 'v2StartCore.ts')
  const rota2 = ler('app', 'api', 'ads', 'v2', 'start', 'route.ts')
  const m1 = trocarUma(core2, "      if (!(balance >= cost)) return v2Fail('out_of_credits', 402, { needed: cost, balance })\n", '')
  const m2 = trocarUma(core2, 'credits_charged: sampleRun ? 0 : cost', 'credits_charged: 0')
  const m3 = trocarUma(rota2, '    const access = await loadAdsAccess(user.id, user.email, { workspace: true })', '    const access = await loadAdsAccess(user.id, user.email)')
  const verm = (f) => { try { return sha(f()) !== START_BASE_SHA } catch { return true } }
  ok('mutante: núcleo sem a checagem de saldo → impressão digital muda (vermelho)', verm(() => desfazExtracao('start', rota2, m1)))
  ok('mutante: núcleo cobrando 0 → vermelho', verm(() => desfazExtracao('start', rota2, m2)))
  ok('mutante: rota sem o workspace → vermelho', verm(() => desfazExtracao('start', m3, core2)))
}
for (const k of ['plan', 'start']) {
  const r = ler('app', 'api', 'ads', 'v2', k, 'route.ts')
  const fn = k === 'plan' ? 'adsV2PlanFor' : 'adsV2StartFor'
  ok(`/api/ads/v2/${k}: cookie (getUser) → acesso do workspace → ${fn}(user, access, corpo)`, ordem(r, 'await supabase.auth.getUser()', "if (!user) return v2Fail('unauthenticated', 401)", 'await loadAdsAccess(user.id, user.email, { workspace: true })', `return await ${fn}(user, access, () => req.json().catch(() => null), started)`))
}
ok('app da Shopify: o pedido passa pelos MESMOS núcleos (adsV2PlanFor e adsV2StartFor)', /await adsV2PlanFor\(user, access, async \(\) => planBody, started\)/.test(src.ads) && /await adsV2StartFor\(user, access, async \(\) => \(\{ order_id: order\.id \}\), started\)/.test(src.ads))
const dinheiroShop = semComentario([src.ads, LIB2.adFlow, LIB2.request, LIB2.account].join('\n'))
ok('nenhum caminho paralelo de dinheiro: rota, adFlow, porta e conta não debitam, não estornam, não chamam rpc nem a fal', !/chargeAdsV2|debitVideoCredits|refundRenderCredits|failAdsV2Order|\.rpc\(|fal\.run|queue\.fal|video_credits:\s/.test(dinheiroShop))
ok('billing só soma crédito pela função transacional (shopify_grant_credits), nunca escreve video_credits', (LIB2.billing.match(/\.rpc\(/g) || []).length === 1 && /rpc\('shopify_grant_credits'/.test(LIB2.billing) && !/video_credits/.test(semComentario(LIB2.billing)))
ok('o rascunho usa o MESMO contrato do POST /api/ads/v2/orders (sanitizeCreateOrderBody)', /sanitizeCreateOrderBody\(\{/.test(LIB2.adFlow) && /mode: 'simple'/.test(LIB2.adFlow))
ok('limite da frase = ADS_V2_SENTENCE_MAX_CHARS do contrato', new RegExp(`ADS_V2_SENTENCE_MAX_CHARS = ${core.SHOPIFY_AD_SENTENCE_MAX}\\b`).test(ler('lib', 'ads', 'v2Contract.ts')))
ok('fotos: só cdn.shopify.com e pela MESMA porta do link-import (adsV2FetchImage/safeGet)', ordem(LIB2.adFlow, 'if (!isShopifyCdnImage(u))', 'adsV2FetchImage(u, room)') && /export async function adsV2FetchImage[\s\S]{0,600}safeGet\(u,/.test(ler('lib', 'ads', 'v2Link.ts')) && core.isShopifyCdnImage('https://cdn.shopify.com/s/files/1/x.jpg') && !core.isShopifyCdnImage('https://cdn.shopify.com.evil.io/x.jpg') && !core.isShopifyCdnImage('https://evil-cdn.shopify.com/x.jpg') && !core.isShopifyCdnImage('https://x.cdn.shopify.com/x.jpg') && !core.isShopifyCdnImage('http://cdn.shopify.com/x.jpg') && !core.isShopifyCdnImage('https://user:p@cdn.shopify.com/x.jpg') && !core.isShopifyCdnImage('https://169.254.169.254/latest'))
ok('fotos e cartão: moderação de imagem e quarentena como no link-import', ordem(LIB2.adFlow, '.upload(path, bytes', "moderateContent({ surface: 'footage', stage: 'upload'", 'quarantineObject(', ".from('user_footage').insert("))
ok('free (amostra): só o nível da amostra, ANTES de baixar foto', ordem(src.ads, "if (gate !== 'ok' && !sample) return shopJson({ error: 'plan_required' }, 402)", "if (gate !== 'ok' && body.tier !== ADS_SAMPLE_TIER)", 'importProductPhotos('))
{
  const b = (x) => core.sanitizeShopAdBody(x)
  ok('corpo do /api/shopify/ads: id de produto da Shopify, nível conhecido, estilo só pela forma, start só com uuid', b({ product_id: 'gid://shopify/Product/1', tier: 'commercial', style: 'ocean_ad' }).ok && !b({ product_id: '1' }).ok && !b({ product_id: 'gid://shopify/Product/1', tier: 'ultra' }).ok && !b({ product_id: 'gid://shopify/Product/1', style: '<x>' }).ok && b({ action: 'start', order_id: '0a000000-0000-4000-8000-000000000001' }).ok && !b({ action: 'start', order_id: 'x' }).ok)
  ok('frase do produto: título + marca + descrição, sem HTML, até 400', core.productAdSentence({ title: 'Lume', vendor: 'Casa', description: '<p>Eau de parfum</p>' }) === 'Lume by Casa. Eau de parfum' && core.productAdSentence({ title: 'X', description: 'a '.repeat(400) }).length <= 400 && core.productAdSentence({ title: '' }) === null)
}

// ── N — crédito do ciclo: só plano pago ativo, uma vez por ciclo ────────────────────────────────────────────────────
console.log('\nN. crédito do ciclo (idempotente por loja + ciclo)')
const agora = new Date('2026-11-05T12:00:00Z')
const sub = (o = {}) => ({ billingPeriod: 'MONTHLY', cancelAtEndOfCycle: false, trialEndsAt: null, cycleStart: '2026-11-01T00:00:00Z', cycleEnd: '2026-12-01T00:00:00Z', itemHandles: ['shop-starter'], ...o })
const dec = (o = {}, x = {}) => core.decideCycleGrant({ shop: 'loja-teste.myshopify.com', sub: sub(o), devStore: false, testShopAllowed: false, now: agora, ...x })
ok('Starter ativo → 170 cr; Business → 500 cr (os números do fundador)', dec().credits === 170 && dec({ itemHandles: ['shop-business'] }).credits === 500 && core.SHOPIFY_PLANS.starter.usdMonth === 29 && core.SHOPIFY_PLANS.business.usdMonth === 84 && core.SHOPIFY_EXTRA_AD.usd === 7)
ok('sem assinatura = free, sem crédito', core.decideCycleGrant({ shop: 's', sub: null, devStore: false, testShopAllowed: false, now: agora }).reason === 'free')
ok('handle desconhecido nunca vira pago', dec({ itemHandles: ['vip'] }).reason === 'unknown_plan' && core.shopifyPlanFromHandle('vip') === null)
ok('período de teste da Shopify → sem crédito ainda', dec({ trialEndsAt: '2026-11-10T00:00:00Z' }).reason === 'trial')
ok('loja de desenvolvimento (plano a US$ 0) → sem crédito, salvo a lista do fundador', dec({}, { devStore: true }).reason === 'dev_store' && dec({}, { devStore: true, testShopAllowed: true }).grant === true && core.testShopAllowed('a.myshopify.com', { SHOPIFY_TEST_SHOPS: 'b.myshopify.com, A.myshopify.com' }) && !core.testShopAllowed('c.myshopify.com', { SHOPIFY_TEST_SHOPS: 'b.myshopify.com' }))
ok('mesmo ciclo = mesma chave (tela, retorno e cron juntos); ciclo novo = chave nova', dec().cycleKey === dec().cycleKey && dec().cycleKey !== dec({ cycleStart: '2026-12-01T00:00:00Z' }, { now: new Date('2026-12-02T00:00:00Z') }).cycleKey)
{
  const an = (d) => core.decideCycleGrant({ shop: 's', sub: sub({ billingPeriod: 'ANNUAL', cycleStart: '2026-01-15T00:00:00Z' }), devStore: false, testShopAllowed: false, now: new Date(d) }).cycleKey
  ok('anual: o crédito cai mês a mês (chave muda a cada mês corrido, não 12 de uma vez)', an('2026-01-20T00:00:00Z').endsWith(':m0') && an('2026-02-14T00:00:00Z').endsWith(':m0') && an('2026-02-15T00:00:00Z').endsWith(':m1') && an('2026-12-20T00:00:00Z').endsWith(':m11'))
}
ok('plan_handle da URL nunca concede: o plano vem da Partner API (activeSubscription)', !/searchParams\.get\('plan_handle'\)/.test(src.account) && /searchParams\.has\('plan_handle'\)/.test(src.account) && /activeSubscription\(appId: \$appId, shopId: \$shopId\)/.test(LIB2.billing))
ok('migration: recibo com PK (loja, ciclo) e crédito na MESMA função (on conflict do nothing → false, sem somar)', /primary key \(shop_domain, cycle_key\)/.test(migracao2) && ordem(migracao2, 'create or replace function public.shopify_grant_credits', 'on conflict (shop_domain, cycle_key) do nothing', 'get diagnostics v_inserted = row_count', 'if v_inserted = 0 then', 'return false', 'update public.profiles set video_credits = coalesce(video_credits, 0) + p_amount', "raise exception 'shopify_grant_credits: perfil ausente'"))
ok('migration: RLS, sem policy, função só para service_role', /alter table public\.shopify_credit_grants enable row level security/.test(migracao2) && /alter table public\.shopify_usage_charges enable row level security/.test(migracao2) && !/create policy/i.test(migracao2) && /revoke all on function public\.shopify_grant_credits[^;]*from public, anon, authenticated/.test(migracao2) && /grant execute on function public\.shopify_grant_credits[^;]*to service_role/.test(migracao2))

function redeShopify({ subJson, eventStatus = 202 } = {}) {
  const log = []
  const fetch = async (url, init = {}) => {
    const u = String(url)
    log.push(u)
    const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
    if (u.startsWith('https://partners.shopify.com/')) return resp(200, { data: { activeSubscription: subJson } })
    if (u === 'https://api.shopify.com/auth/access_token') return resp(200, { access_token: 'tok', expires_in: 3599 })
    if (/^https:\/\/api\.shopify\.com\/app\/[0-9-]+\/events$/.test(u)) return resp(typeof eventStatus === 'function' ? eventStatus(JSON.parse(init.body)) : eventStatus, { success: true })
    throw new Error('rede inesperada: ' + u)
  }
  return { fetch, log }
}
const ENV2 = { SHOPIFY_API_KEY: 'k', SHOPIFY_API_SECRET: 's', SHOPIFY_PARTNER_ORG_ID: '123', SHOPIFY_PARTNER_API_TOKEN: 'prtapi_x', SHOPIFY_APP_GID: 'gid://partners/App/9' }
function billingCom({ state, rede, env = ENV2, events = [] }) {
  return createOfflineLoader({ env, globals: { fetch: rede.fetch, AbortSignal: { timeout: () => undefined } }, mocks: {
    '@/lib/shopify/server': { SHOPIFY_SHOPS_TABLE: 'shopify_shops' },
    '@/lib/shopify/account': { loadShopLink: async (_a, shop) => ({ row: state.shopify_shops.find((s) => s.shop_domain === shop) ?? null, error: false }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
  } })('lib/shopify/billing.ts')
}
const lojaPaga = (o = {}) => ({ shopify_shops: [{ shop_domain: 'loja-teste.myshopify.com', owner_user_id: 'u1', shop_gid: 'gid://shopify/Shop/77', partner_development: false, plan_handle: null, plan_status: 'none', plan_checked_at: null, scopes: 'read_products', ...o }], profiles: [{ id: 'u1', email: 'dono@loja.com', video_credits: 5 }], shopify_credit_grants: [], shopify_usage_charges: [] })
const subJson = { billingPeriod: 'MONTHLY', cancelAtEndOfCycle: false, trialEndsAt: null, currentBillingCycle: { startTime: '2026-11-01T00:00:00Z', endTime: '2026-12-01T00:00:00Z' }, items: [{ handle: 'shop-business' }] }
{
  const state = lojaPaga()
  const db = bancoFalso(state)
  const B = billingCom({ state, rede: redeShopify({ subJson }) })
  const r1 = await B.syncShopPlan(db, 'loja-teste.myshopify.com', agora)
  const r2 = await B.syncShopPlan(db, 'loja-teste.myshopify.com', agora)
  const r3 = await B.syncShopPlan(db, 'loja-teste.myshopify.com', new Date('2026-11-20T00:00:00Z'))
  ok('EXECUTADO: Business ativo → +500 uma vez; a 2ª e a 3ª leitura no MESMO ciclo não somam nada', r1.granted === true && r2.granted === false && r3.granted === false && state.profiles[0].video_credits === 505 && state.shopify_credit_grants.length === 1 && state.shopify_shops[0].plan_handle === 'business' && state.shopify_shops[0].plan_status === 'active')
  const B2 = billingCom({ state, rede: redeShopify({ subJson: { ...subJson, currentBillingCycle: { startTime: '2026-12-01T00:00:00Z', endTime: '2027-01-01T00:00:00Z' } } }) })
  const r4 = await B2.syncShopPlan(db, 'loja-teste.myshopify.com', new Date('2026-12-02T00:00:00Z'))
  ok('EXECUTADO: ciclo novo → +500 de novo (uma vez)', r4.granted === true && state.profiles[0].video_credits === 1005 && state.shopify_credit_grants.length === 2)
  const B3 = billingCom({ state, rede: redeShopify({ subJson: null }) })
  const r5 = await B3.syncShopPlan(db, 'loja-teste.myshopify.com', new Date('2026-12-03T00:00:00Z'))
  ok('EXECUTADO: assinatura cancelada (null) → plano free, nada concedido', r5.granted === false && state.shopify_shops[0].plan_handle === 'free' && state.shopify_shops[0].plan_status === 'none' && state.profiles[0].video_credits === 1005)
}
{
  const state = lojaPaga({ partner_development: true })
  const B = billingCom({ state, rede: redeShopify({ subJson }) })
  const r = await B.syncShopPlan(bancoFalso(state), 'loja-teste.myshopify.com', agora)
  ok('EXECUTADO: loja de desenvolvimento fora da lista → plano lido, NENHUM crédito', r.granted === false && r.reason === 'dev_store' && state.profiles[0].video_credits === 5)
}
{
  const state = lojaPaga()
  const B = billingCom({ state, rede: redeShopify({ subJson }), env: { SHOPIFY_API_KEY: 'k', SHOPIFY_API_SECRET: 's' } })
  const r = await B.syncShopPlan(bancoFalso(state), 'loja-teste.myshopify.com', agora)
  ok('EXECUTADO: sem as envs da Partner API → not_configured, nada lido nem concedido (falha fechada)', r.state === 'not_configured' && state.profiles[0].video_credits === 5)
}

// ── O — anúncio extra (US$ 7): teto NOSSO por dia e por mês ─────────────────────────────────────────────────────────
console.log('\nO. teto do uso extra')
ok('decideExtraAd: plano free nunca; Cinema (51 cr) nunca; teto do dia 3 e do mês 20', core.decideExtraAd({ plan: 'free', cost: 34, usedToday: 0, usedMonth: 0 }).reason === 'free_plan' && core.decideExtraAd({ plan: 'starter', cost: 51, usedToday: 0, usedMonth: 0 }).reason === 'too_expensive' && core.decideExtraAd({ plan: 'starter', cost: 41, usedToday: 3, usedMonth: 3 }).reason === 'daily_cap' && core.decideExtraAd({ plan: 'business', cost: 41, usedToday: 0, usedMonth: 20 }).reason === 'monthly_cap' && core.decideExtraAd({ plan: 'business', cost: 41, usedToday: 2, usedMonth: 19 }).ok)
ok('evento do medidor: handle extra_ad, chave ≤ 64, value 1', (() => { const e = core.appEventBody({ shopGid: 'gid://shopify/Shop/1', idempotencyKey: 'extra-' + 'a'.repeat(80), now: agora }); return e.event_handle === 'extra_ad' && e.idempotency_key.length === 64 && e.attributes.value === 1 && e.shop_id === 'gid://shopify/Shop/1' })())
{
  const state = lojaPaga({ plan_handle: 'starter', plan_status: 'active' })
  const db = bancoFalso(state)
  const rede = redeShopify({ subJson })
  const B = billingCom({ state, rede })
  const link = state.shopify_shops[0]
  const pedido = (n) => `0a000000-0000-4000-8000-00000000000${n}`
  const rs = []
  for (let n = 1; n <= 4; n++) rs.push(await B.chargeExtraAd(db, { link, plan: 'starter', userId: 'u1', orderId: pedido(n), credits: 41, now: agora }))
  const eventos = rede.log.filter((u) => u.endsWith('/events')).length
  ok('EXECUTADO: 3 extras no dia passam (3 eventos, +41 cada); o 4º = daily_cap, sem evento e sem crédito', rs.slice(0, 3).every((r) => r.ok) && rs[3].error === 'daily_cap' && eventos === 3 && state.profiles[0].video_credits === 5 + 3 * 41 && state.shopify_usage_charges.length === 3)
  const rep = await B.chargeExtraAd(db, { link, plan: 'starter', userId: 'u1', orderId: pedido(1), credits: 41, now: agora })
  ok('EXECUTADO: o MESMO pedido de novo → nenhum evento novo, nenhum crédito a mais (idempotente)', rep.ok && rede.log.filter((u) => u.endsWith('/events')).length === 3 && state.profiles[0].video_credits === 5 + 3 * 41)
}
{
  const state = lojaPaga({ plan_handle: 'business', plan_status: 'active' })
  for (let i = 0; i < 20; i++) state.shopify_usage_charges.push({ shop_domain: 'loja-teste.myshopify.com', usage_key: `old-${i}`, status: 'sent', day: '2026-11-0' + ((i % 4) + 1), month: '2026-11' })
  const rede = redeShopify({ subJson })
  const B = billingCom({ state, rede })
  const r = await B.chargeExtraAd(bancoFalso(state), { link: state.shopify_shops[0], plan: 'business', userId: 'u1', orderId: '0a000000-0000-4000-8000-000000000009', credits: 41, now: agora })
  ok('EXECUTADO: 20 extras no mês → o 21º = monthly_cap, reserva desfeita, sem evento', r.error === 'monthly_cap' && !rede.log.some((u) => u.endsWith('/events')) && state.shopify_usage_charges.length === 20)
}
{
  const state = lojaPaga({ plan_handle: 'starter', plan_status: 'active' })
  const rede = redeShopify({ subJson, eventStatus: 400 })
  const B = billingCom({ state, rede })
  const r = await B.chargeExtraAd(bancoFalso(state), { link: state.shopify_shops[0], plan: 'starter', userId: 'u1', orderId: '0a000000-0000-4000-8000-000000000008', credits: 41, now: agora })
  ok('EXECUTADO: Shopify recusa o evento → billing_failed, linha "failed" (não conta no teto), NENHUM crédito', r.error === 'billing_failed' && state.shopify_usage_charges[0].status === 'failed' && state.profiles[0].video_credits === 5)
}
ok('extra só com o pedido EXPLÍCITO da tela e antes do /start de sempre', ordem(src.ads, 'if (!body.extra) return shopJson({ error: \'out_of_credits\'', 'chargeExtraAd(', 'adsV2StartFor('))

// ── P — interruptor desligado = inerte ──────────────────────────────────────────────────────────────────────────────
console.log('\nP. interruptor desligado: as rotas novas não fazem nada')
{
  const chamadas = []
  const espiao = (nome) => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? false : (...a) => { chamadas.push(`${nome}.${String(k)}`); throw new Error('chamado') }) })
  const rotasNovas = { ads: 'app/api/shopify/ads/route.ts', status: 'app/api/shopify/ads/status/route.ts', account: 'app/api/shopify/account/route.ts', attach: 'app/api/shopify/ads/attach/route.ts', cron: 'app/api/cron/shopify-plans/route.ts' }
  const respostas = []
  for (const [nome, rel] of Object.entries(rotasNovas)) {
    const imports = [...ler(...rel.split('/')).matchAll(/from '(@\/[^']+|next\/server)'/g)].map((m) => m[1]).filter((s) => s !== '@/lib/shopify/core')
    const mocks = Object.fromEntries(imports.map((s) => [s, espiao(s)]))
    const mod = createOfflineLoader({ env: {}, globals: { Response }, mocks })(rel)
    const h = mod.POST ?? mod.GET
    const res = await h({ headers: { get: () => 'Bearer x.y.z' }, json: async () => { chamadas.push('req.json'); return {} }, nextUrl: { searchParams: new URLSearchParams() } })
    respostas.push(res.status)
  }
  ok('EXECUTADO: SHOPIFY_APP_LIVE ausente → 404 nas 5 rotas novas, sem tocar banco, Shopify, corpo ou cron', respostas.every((s) => s === 404) && chamadas.length === 0, `${respostas.join(',')} ${chamadas.join(',')}`)
}
ok('a migration da etapa 2 segue NÃO aplicada no código (o app não liga sozinho) e o cron fica fora do vercel.json até o "vai"', /NÃO APLICADA/.test(migracao2) && !/shopify-plans/.test(vercelJson))
ok('a tela embutida não abre mais o site numa aba nova (2.2.2): o anúncio nasce e toca ali', !/window\.open\(r\.data\.url, '_blank'\)/.test(src.page) && /'\/api\/shopify\/ads\/status\?order_id='/.test(src.page) && /<video id="k-video"/.test(src.page) && /Download MP4/.test(src.page))
{
  const corpoScript = (src.page.match(/<script>\n([\s\S]*?)\n<\/script>/) || ['', ''])[1].replace('${JSON.stringify(authUrl)}', '"/api/shopify/auth?shop=x"')
  let compila = false
  try { new Function(corpoScript.replace(/\\\\/g, '\\')); compila = corpoScript.length > 1000 } catch (e) { compila = false }
  ok('o JavaScript da tela embutida compila (sem crase nem ${ solto no HTML)', compila)
}


// ── Q — acréscimos do fundador (13/10, "tudo sim") ──────────────────────────────────────────────────────────────────
console.log('\nQ. posicionamento, "Add to product page", avaliação sem incentivo e "Made with AI"')
const pitch = core.SHOPIFY_PLAN_PITCH
ok('promessa de cada plano: Starter = 1 anúncio novo por semana; Business = 12 por mês; Free = 1 amostra', pitch.starter === 'A new ad for your product every week' && pitch.business === '12 ads a month' && pitch.free === '1 free sample ad' && Math.floor(core.SHOPIFY_PLANS.starter.credits / 41) === 4 && Math.floor(core.SHOPIFY_PLANS.business.credits / 41) === 12)
// Comentários fora (// e as linhas * do JSDoc): eles CITAM a palavra proibida para explicar a regra.
const textoLoja = [src.page, libCore, src.account].join('\n').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
ok('nada de "unlimited" nem de depoimento/UGC na tela e nos textos do app (regra da FTC)', !/unlimited|testimonial|\bUGC\b/i.test(textoLoja))
ok('lembrete semanal: plano pago + saldo para um Commercial + nada começado há 7 dias', core.weeklyAdReady({ plan: 'starter', credits: 41, lastStartedAt: null, now: agora }) && !core.weeklyAdReady({ plan: 'free', credits: 500, lastStartedAt: null, now: agora }) && !core.weeklyAdReady({ plan: 'business', credits: 40, lastStartedAt: null, now: agora }) && !core.weeklyAdReady({ plan: 'starter', credits: 100, lastStartedAt: '2026-11-01T12:00:00Z', now: agora }) && core.weeklyAdReady({ plan: 'starter', credits: 100, lastStartedAt: '2026-10-29T12:00:00Z', now: agora }))
ok('lembrete só DENTRO do app (nenhum e-mail novo)', /id="k-weekly"/.test(src.page) && !/sendEmail|resend|create_draft/i.test(src.account + LIB2.billing))
ok('avaliação: sem SHOPIFY_APP_STORE_URL o cartão não existe; só apps.shopify.com em https', core.appStoreReviewUrl({}) === null && core.appStoreReviewUrl({ SHOPIFY_APP_STORE_URL: 'https://apps.shopify.com/kineo-ads' }) === 'https://apps.shopify.com/kineo-ads' && core.appStoreReviewUrl({ SHOPIFY_APP_STORE_URL: 'https://evil.com/kineo' }) === null && core.appStoreReviewUrl({ SHOPIFY_APP_STORE_URL: 'https://evilshopify.com/kineo' }) === null && core.appStoreReviewUrl({ SHOPIFY_APP_STORE_URL: 'https://admin.shopify.com/kineo' }) === null && core.appStoreReviewUrl({ SHOPIFY_APP_STORE_URL: 'http://apps.shopify.com/kineo' }) === null)
ok('avaliação: o cartão aparece logo depois do 1º anúncio entregue, uma vez', core.showReviewCard({ reviewUrl: 'https://apps.shopify.com/k', deliveredAds: 1 }) && !core.showReviewCard({ reviewUrl: 'https://apps.shopify.com/k', deliveredAds: 0 }) && !core.showReviewCard({ reviewUrl: 'https://apps.shopify.com/k', deliveredAds: 2 }) && !core.showReviewCard({ reviewUrl: null, deliveredAds: 1 }))
{
  const card = (src.page.match(/<div id="k-review"[^\n]*<\/div>/) || [''])[0]
  ok('avaliação: cartão discreto, escondido por padrão, SEM incentivo (crédito, desconto, grátis, prêmio)', /hidden>Enjoying Kineo Ads\? <a id="k-reviewlink"[^>]*>Leave a review<\/a><\/div>/.test(card) && !/credit|discount|free|reward|bonus|gift|\$/i.test(card) && /account\.review_card && account\.review_url/.test(src.page))
}
ok('"Made with AI" visível no anúncio pronto, junto do vídeo', ordem(src.page, '<div id="k-done" hidden>', 'Made with AI', '<video id="k-video"'))
ok('"Add to product page": permissão conferida AO VIVO antes de qualquer upload; sem ela, 403 scope_missing', ordem(src.attach, 'if (!attachMediaEnabled()) return', 'currentAppInstallation', "scopesCover(granted, SHOPIFY_ATTACH_SCOPES)", "'scope_missing'", 'stagedUploadsCreate', 'productUpdate'))
ok('"Add to product page": a tela só pede os escopos opcionais no CLIQUE, depois do scope_missing', ordem(src.page, "$('k-attach').addEventListener('click'", "r.data.error === 'scope_missing'", "shopify.scopes.request(['write_products', 'write_files'])") && (src.page.match(/shopify\.scopes\.request\(/g) || []).length === 1)
ok('escopo padrão segue read_products; os de escrita só como OPCIONAIS no toml', /scopes = "read_products"/.test(ler('shopify', 'shopify.app.toml')) && /optional_scopes = \["write_products", "write_files"\]/.test(ler('shopify', 'shopify.app.toml')) && core.SHOPIFY_DEFAULT_SCOPES === 'read_products')
ok('"Add to product page" ligado por padrão; SHOPIFY_ATTACH_MEDIA=false desliga (chave de emergência)', core.attachMediaEnabled({}) === true && core.attachMediaEnabled({ SHOPIFY_ATTACH_MEDIA: 'false' }) === false && core.attachMediaEnabled({ SHOPIFY_ATTACH_MEDIA: '0' }) === false)
ok('"Add to product page": só o MP4 de um pedido ENTREGUE da conta e só do nosso storage', ordem(src.attach, "order.status !== 'delivered'", ".eq('user_id', ctx.userId)", "url.startsWith(ours)"))

console.log(`\n${total - falhas.length}/${total} verificações`)
if (falhas.length) {
  console.log(`\nFALHOU (${falhas.length}):\n - ${falhas.join('\n - ')}`)
  process.exit(1)
}
console.log('OK — KINEO-SHOPIFY-2026-10-13')
