// KINEO-MCP-STUDIO-2010 — guardião do conector "Kineo Studio" (servidor MCP /api/mcp/studio que gera o filme NA CONTA da
// pessoa, adicionado por URL no Claude; fundador 20/10 "vai pra tudo").
//
// O que ele prova, e como (EXECUTANDO lib/mcp/studioLaunch.ts, studioOauth.ts, studioMcp.ts e studioSession.ts via
// registerHooks com o alias `@/`, lendo os arquivos reais e comparando com a base no git):
//   (A) INTERRUPTOR: MCP_STUDIO_LIVE ausente/false = off; 'internal' = só casa; 'true' = todos; a rota devolve 404 em off.
//   (B) OAUTH (spec MCP 2025-06-18 + claude.com/docs/connectors/building/authentication): metadados RFC 8414/9728 com os
//       campos que o Claude exige (registration_endpoint, S256, "none", resource = URL exata), 401 com resource_metadata,
//       DCR aceita só https/loopback, redirect exato (loopback sem porta), PKCE S256 de verdade, código/tokens só por hash,
//       `resource` (RFC 8707) amarrado a este servidor.
//   (C) TOOLS: 4 tools anotadas; preço nas descrições DERIVADO de creditCostForDuration (nenhum número digitado); a
//       despachante recusa sem saldo / sem contagem / formato fora / teto por usuário ANTES de chamar o caminho pago;
//       idempotency_key viaja; escopo = o usuário do token (nenhum argumento de usuário).
//   (D) SESSÃO: o cookie cunhado é lido pelo @supabase/ssr REAL (createServerClient) — o mesmo leitor de lib/supabase/server.ts.
//   (E) TEXTO: /api/mcp (diretório) e as rotas de geração INTOCADOS byte a byte; a rota do studio exige Bearer e devolve o
//       WWW-Authenticate; o caminho pago é o /api/generate-video-cinematic do site com o cookie da pessoa; toda leitura de
//       dados é escopada por user_id; migration com RLS fechado; página com a seção EN+PT e a URL da fonte única; doc com as envs.
//   (F) DESFAZ: os 2 arquivos existentes tocados, desfeitos, são a base; todo arquivo novo leva a marca; o diff contra a
//       base só toca esses 2 + os novos.
//   (M) MUTANTES: cada regra acima fica vermelha quando a quebramos de propósito.
import { semAvatarPreso2010, MARCA_AVATAR_PRESO_2010, AVATAR_PRESO_2010_ARQUIVOS } from './test-support/desfaz-avatar-preso-2010.mjs' // reancorado KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]: a camada do avatar preso não é desta entrega
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { registerHooks } from 'node:module'
import { createRequire } from 'node:module'
import {
  ACRESCIMOS_MCP_STUDIO_2010, MARCA_MCP_STUDIO_2010, MCP_STUDIO_2010_ARQUIVOS, MCP_STUDIO_2010_BASE, MCP_STUDIO_2010_NOVOS, semMcpStudio2010,
} from './test-support/desfaz-mcp-studio-2010.mjs'
import { semBebeQueFala2010, BEBE_QUE_FALA_2010_ARQUIVOS } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) entrou depois: sai em memória antes do byte a byte; arquivos e commits dele fora da conta
import { semMeta95Personagem2010, META95_PERSONAGEM_2010_ARQUIVOS, MARCA_META95_PERSONAGEM_2010 } from './test-support/desfaz-meta95-personagem-2010.mjs' // reancorado KINEO-META95-PERSONAGEM-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: a folha de personagem (20/10) entrou na fila depois e toca a rota do cinematic e o crítico; sai em memória antes do byte a byte, e os commits/arquivos dela ficam fora desta conta
import { MARCA_META95_ESCRITA_2010, META95_ESCRITA_2010_ARQUIVOS } from './test-support/desfaz-meta95-escrita-2010.mjs' // KINEO-META95-ESCRITA-2010 — reancorado: a legenda na escrita do roteiro (entrega de depois) mede até HEAD junto; os commits e arquivos dela saem da conta

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const read = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const raw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${MCP_STUDIO_2010_BASE}:${rel}`)) } catch { return null } }
const code = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const abs = path.join(ROOT, specifier.slice(2))
      const file = fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : `${abs}.ts`
      return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href)

const F = {
  launch: 'lib/mcp/studioLaunch.ts',
  oauth: 'lib/mcp/studioOauth.ts',
  store: 'lib/mcp/studioOauthStore.ts',
  mcp: 'lib/mcp/studioMcp.ts',
  session: 'lib/mcp/studioSession.ts',
  tools: 'lib/mcp/studioTools.ts',
  route: 'app/api/mcp/studio/route.ts',
  authorize: 'app/api/mcp/studio/oauth/authorize/route.ts',
  token: 'app/api/mcp/studio/oauth/token/route.ts',
  register: 'app/api/mcp/studio/oauth/register/route.ts',
  revoke: 'app/api/mcp/studio/oauth/revoke/route.ts',
  wkAs: 'app/.well-known/oauth-authorization-server/route.ts',
  wkPrm: 'app/.well-known/oauth-protected-resource/route.ts',
  wkPrmPath: 'app/.well-known/oauth-protected-resource/api/mcp/studio/route.ts',
  section: 'app/claude-connector/StudioSection.tsx',
  page: 'app/claude-connector/page.tsx',
  connect: 'lib/claudeConnect.ts',
  migration: 'supabase/migrations/20261020150000_mcp_studio_oauth.sql',
  doc: 'docs/MCP-STUDIO-2026-10-20.md',
}
const S = Object.fromEntries(Object.entries(F).map(([k, rel]) => [k, read(rel)]))

const L = await load(F.launch)
const O = await load(F.oauth)
const M = await load(F.mcp)
const SS = await load(F.session)
const EC = await load('lib/credits/engineCost.ts')

// ─── (A) interruptor ─────────────────────────────────────────────────────────
ok(L.studioLiveMode(undefined) === 'off' && L.studioLiveMode('') === 'off' && L.studioLiveMode('false') === 'off' && L.studioLiveMode('nope') === 'off', '(A1) MCP_STUDIO_LIVE ausente/vazio/false/lixo → off (desligado por padrão)')
ok(L.studioLiveMode('internal') === 'internal' && L.studioLiveMode('true') === 'all' && L.studioLiveMode('ALL') === 'all', "(A2) 'internal' → só casa; 'true'/'all' → todos")
ok(L.studioAllowsEmail('off', 'josephsskaf@gmail.com') === false && L.studioAllowsEmail('internal', 'josephsskaf@gmail.com') === true && L.studioAllowsEmail('internal', 'cliente@gmail.com') === false && L.studioAllowsEmail('all', 'cliente@gmail.com') === true, '(A3) off nega até a casa; internal = isInternalEmail; all = qualquer conta')
ok(L.studioPublicOrigin('http://localhost:3111', 'production') === 'https://www.usekineo.com' && L.studioPublicOrigin('http://localhost:3111', undefined) === 'http://localhost:3111', '(A4) origem pública: produção = canônica com www; fora = a do pedido')
ok(L.STUDIO_MCP_URL === 'https://www.usekineo.com/api/mcp/studio' && L.STUDIO_RESOURCE_METADATA_URL.endsWith('/.well-known/oauth-protected-resource/api/mcp/studio'), `(A5) URL do servidor ${L.STUDIO_MCP_URL} e PRM no caminho RFC 9728`)
for (const [k, rel] of [['route', F.route], ['authorize', F.authorize], ['token', F.token], ['register', F.register], ['revoke', F.revoke], ['wkAs', F.wkAs], ['wkPrm', F.wkPrm], ['wkPrmPath', F.wkPrmPath]]) {
  ok(/studioLiveMode\(\) === 'off'/.test(S[k]) && /404/.test(S[k]), `(A6) ${rel}: desligado → 404`)
}

// ─── (B) OAuth puro ──────────────────────────────────────────────────────────
const ORIGIN = 'https://www.usekineo.com'
const as = O.authorizationServerMetadata(ORIGIN)
ok(as.issuer === ORIGIN && as.registration_endpoint === `${ORIGIN}/api/mcp/studio/oauth/register` && as.token_endpoint === `${ORIGIN}/api/mcp/studio/oauth/token` && as.authorization_endpoint === `${ORIGIN}/api/mcp/studio/oauth/authorize`, '(B1) RFC 8414: issuer = site (sem caminho), endpoints de authorize/token/register no /api/mcp/studio/oauth')
ok(JSON.stringify(as.code_challenge_methods_supported) === '["S256"]' && as.token_endpoint_auth_methods_supported.includes('none') && as.grant_types_supported.includes('refresh_token') && as.response_types_supported.includes('code'), '(B2) metadata: só S256, "none" aceito (cliente público do Claude), code + refresh')
const prm = O.protectedResourceMetadata(ORIGIN)
ok(prm.resource === L.STUDIO_MCP_URL && prm.authorization_servers[0] === ORIGIN && prm.scopes_supported.includes('kineo:studio') && prm.bearer_methods_supported.includes('header'), '(B3) RFC 9728: resource = URL exata colada no Claude; AS = issuer; escopo kineo:studio; só header')
const www = O.wwwAuthenticateHeader(ORIGIN)
ok(/^Bearer /.test(www) && www.includes(`resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/api/mcp/studio"`) && /scope="kineo:studio"/.test(www) && /error="invalid_token"/.test(O.wwwAuthenticateHeader(ORIGIN, 'invalid_token')), '(B4) WWW-Authenticate do 401 aponta o PRM e o escopo; invalid_token quando o token morreu')
ok(O.validateRegistration({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'], client_name: 'Claude' }).ok === true, '(B5) DCR aceita o redirect da hospedagem do Claude')
ok(O.validateRegistration({ redirect_uris: ['http://localhost:3118/callback', 'http://127.0.0.1/callback'] }).ok === true, '(B6) DCR aceita loopback do Claude Code (localhost e 127.0.0.1)')
ok(O.validateRegistration({ redirect_uris: ['http://evil.example/cb'] }).ok === false && O.validateRegistration({ redirect_uris: [] }).ok === false && O.validateRegistration({ redirect_uris: ['https://a.example/cb#frag'] }).ok === false && O.validateRegistration({ redirect_uris: ['https://a.example/cb'], grant_types: ['client_credentials'] }).ok === false, '(B7) DCR recusa http fora do loopback, lista vazia, fragmento e client_credentials')
ok(O.redirectUriMatches('https://claude.ai/api/mcp/auth_callback', 'https://claude.ai/api/mcp/auth_callback') && !O.redirectUriMatches('https://claude.ai/api/mcp/auth_callback', 'https://claude.ai/api/mcp/auth_callback2') && !O.redirectUriMatches('https://a.example:443/cb', 'https://a.example:8443/cb'), '(B8) redirect https: igualdade EXATA (porta inclusive)')
ok(O.redirectUriMatches('http://localhost/callback', 'http://localhost:3118/callback') && O.redirectUriMatches('http://127.0.0.1/callback', 'http://127.0.0.1:51234/callback') && !O.redirectUriMatches('http://localhost/callback', 'http://localhost:3118/other'), '(B9) loopback: porta ignorada, caminho não (RFC 8252 §7.3)')
const MCPU = L.STUDIO_MCP_URL
const client = { client_id: 'kineo_abc', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }
const verifier = O.base64url(randomBytes(48))
const challenge = O.pkceChallengeOf(verifier)
const good = new URLSearchParams({ response_type: 'code', client_id: 'kineo_abc', redirect_uri: 'https://claude.ai/api/mcp/auth_callback', state: 's1', code_challenge: challenge, code_challenge_method: 'S256', scope: 'kineo:studio offline_access', resource: MCPU })
const v1 = O.validateAuthorizeParams(good, client, MCPU)
ok(v1.ok === true && v1.value.scope.includes('kineo:studio') && v1.value.resource === MCPU && v1.value.state === 's1', '(B10) pedido de autorização completo → aceito, escopo e resource guardados')
const withoutClient = O.validateAuthorizeParams(good, null, MCPU)
ok(withoutClient.ok === false && withoutClient.redirect === false, '(B11) client_id desconhecido → erro na TELA (nunca redireciona para redirect não confiável)')
const badRedirect = new URLSearchParams(good); badRedirect.set('redirect_uri', 'https://evil.example/cb')
ok(O.validateAuthorizeParams(badRedirect, client, MCPU).ok === false && O.validateAuthorizeParams(badRedirect, client, MCPU).redirect === false, '(B12) redirect_uri não registrado → erro na tela')
const noPkce = new URLSearchParams(good); noPkce.delete('code_challenge')
const noPkceV = O.validateAuthorizeParams(noPkce, client, MCPU)
ok(noPkceV.ok === false && noPkceV.redirect === true && noPkceV.error === 'invalid_request' && noPkceV.state === 's1', '(B13) sem PKCE → volta pelo redirect com invalid_request + state')
const plain = new URLSearchParams(good); plain.set('code_challenge_method', 'plain')
ok(O.validateAuthorizeParams(plain, client, MCPU).ok === false, '(B14) code_challenge_method=plain recusado (só S256)')
const badRes = new URLSearchParams(good); badRes.set('resource', 'https://evil.example/mcp')
ok(O.validateAuthorizeParams(badRes, client, MCPU).error === 'invalid_target', '(B15) resource alheio → invalid_target (RFC 8707: token só para este servidor)')
ok(O.resourceMatches('HTTPS://WWW.USEKINEO.COM/api/mcp/studio/', MCPU) && !O.resourceMatches('https://www.usekineo.com/api/mcp', MCPU) && !O.resourceMatches(`${MCPU}#x`, MCPU), '(B16) resource: host sem caixa e barra final tolerados; /api/mcp (o do diretório) e fragmento NÃO')
ok(O.pkceVerify(verifier, challenge) === true && O.pkceVerify(verifier + 'x', challenge) === false && O.pkceVerify('short', challenge) === false, '(B17) PKCE S256 verificado de verdade (verifier certo passa, errado/curto não)')
const tok = O.newOpaqueToken(O.ACCESS_PREFIX)
ok(/^kst_[A-Za-z0-9_-]{40,}$/.test(tok) && O.hashToken(tok) === createHash('sha256').update(tok).digest('hex') && O.hashToken(tok) !== tok && O.tokenKind(tok) === 'access' && O.tokenKind('ksr_x') === 'refresh' && O.tokenKind('zzz') === null, '(B18) token opaco com prefixo; ao banco vai só o sha256')
ok(O.bearerFrom('Bearer kst_abc') === 'kst_abc' && O.bearerFrom('bearer kst_abc') === 'kst_abc' && O.bearerFrom('Basic xyz') === null && O.bearerFrom(null) === null, '(B19) bearerFrom lê só Authorization: Bearer')
ok(O.ACCESS_TOKEN_TTL_S <= 3600 && O.REFRESH_TOKEN_TTL_S <= 31 * 24 * 3600 && O.CODE_TTL_MS <= 10 * 60 * 1000, `(B20) prazos curtos: access ≤ 1 h (${O.ACCESS_TOKEN_TTL_S}s), refresh ≤ 31 d, código ≤ 10 min`)
const tr = O.tokenResponse('kst_a', 'ksr_b', 'kineo:studio')
ok(tr.token_type === 'Bearer' && tr.expires_in === O.ACCESS_TOKEN_TTL_S && tr.refresh_token === 'ksr_b', '(B21) resposta do token endpoint no molde RFC 6749 §5.1')

// ─── (C) tools e despachante ─────────────────────────────────────────────────
const PAUSED = []
const tools = M.buildStudioTools({ pausedEngines: PAUSED })
const byName = Object.fromEntries(tools.map((t) => [t.name, t]))
ok(tools.map((t) => t.name).join() === 'kineo_account,kineo_create_video,kineo_video_status,kineo_list_videos', '(C1) exatamente as 4 tools, nesta ordem')
ok(tools.every((t) => t.title && typeof t.annotations.readOnlyHint === 'boolean' && typeof t.annotations.destructiveHint === 'boolean' && t.title === t.annotations.title && t.description.length > 80), '(C2) toda tool com title, readOnlyHint/destructiveHint e descrição útil')
ok(byName.kineo_account.annotations.readOnlyHint && byName.kineo_video_status.annotations.readOnlyHint && byName.kineo_list_videos.annotations.readOnlyHint && !byName.kineo_create_video.annotations.readOnlyHint && byName.kineo_create_video.annotations.openWorldHint, '(C3) leituras read-only; create NÃO read-only e openWorld (gasta crédito num sistema externo)')
const cd = byName.kineo_create_video.description
const seed35 = EC.creditCostForDuration('cinematic_ai', true, 35)
const k3_60 = EC.creditCostForDuration('cinematic_hollywood', true, 60)
ok(cd.includes(`35s: ${seed35} cr`) && cd.includes(`60s: ${k3_60} cr`) && /job_id/.test(cd) && /kineo_video_status/.test(cd) && /several minutes/.test(cd) && /idempotency_key/.test(cd) && /plans page/.test(cd), `(C4) descrição do create: preço DERIVADO de creditCostForDuration (seedance 35s=${seed35}, kling3 60s=${k3_60}), avisa job_id/status/minutos/idempotência/planos`)
for (const rel of [F.launch, F.oauth, F.store, F.mcp, F.session, F.tools, F.route]) ok([...code(S[Object.keys(F).find((k) => F[k] === rel)]).matchAll(/\$\d/g)].length === 0, `(C5) nenhum "$<número>" digitado em ${rel}`)
ok(![...code(S.mcp).matchAll(/\b(credits?|cr)\b\s*[:=]\s*\d+|\b\d+\s*(credits|cr)\b/gi)].length, '(C6) nenhum número de crédito digitado em studioMcp.ts (vem de creditCostForDuration)')
ok(M.estimateCredits('seedance', 35) === seed35 && M.estimateCredits('hollywood', 60) === k3_60, '(C7) estimateCredits = creditCostForDuration(quality do motor, pago, segundos)')
const props = byName.kineo_create_video.inputSchema.properties
ok(!('user_id' in props) && !('email' in props) && !('account' in props) && !('user_id' in byName.kineo_list_videos.inputSchema.properties), '(C8) nenhuma tool aceita usuário/e-mail/conta como argumento — o escopo é o do token')
ok(M.validateCreateInput({ idea: 'a lake of lightning' }, PAUSED).ok && M.validateCreateInput({ idea: 'x' }, PAUSED).value.scriptMode === 'ai' && M.validateCreateInput({ script: 'x' }, PAUSED).value.scriptMode === 'verbatim', '(C9) idea → ai; script → verbatim (o modo viaja ao servidor, como o Studio manda)')
ok(!M.validateCreateInput({}, PAUSED).ok && !M.validateCreateInput({ idea: 'a', script: 'b' }, PAUSED).ok && !M.validateCreateInput({ idea: 'a', engine: 'sora' }, PAUSED).ok && !M.validateCreateInput({ idea: 'a', engine: 'hollywood', duration: 999 }, PAUSED).ok && !M.validateCreateInput({ idea: 'a', language: 'xx' }, PAUSED).ok && !M.validateCreateInput({ idea: 'a', idempotency_key: 'short' }, PAUSED).ok, '(C10) recusa: vazio, idea+script, motor fora do catálogo, duração fora do motor, língua fora do catálogo, chave curta')
ok(!M.validateCreateInput({ idea: 'a', engine: 'h3' }, ['h3']).ok && /temporarily paused/.test(M.validateCreateInput({ idea: 'a', engine: 'h3' }, ['h3']).error), '(C11) motor pausado → recusa legível')
ok(M.durationsFor('seedance').includes(15) && M.durationsFor('hollywood').includes(30) && !M.durationsFor('kling').includes(999), '(C12) durações por motor vêm de supportedDurationsFor (Seedance 15; hollywood 30)')
ok(M.limitDecision('kineo_account', { toolCallsLastHour: M.TOOL_CALLS_PER_HOUR, createsLastHour: 0, activeJobs: 0 }).ok === false && M.limitDecision('kineo_create_video', { toolCallsLastHour: 0, createsLastHour: M.CREATES_PER_HOUR, activeJobs: 0 }).reason === 'create_rate' && M.limitDecision('kineo_create_video', { toolCallsLastHour: 0, createsLastHour: 0, activeJobs: M.MAX_ACTIVE_JOBS }).reason === 'too_many_active' && M.limitDecision('kineo_create_video', { toolCallsLastHour: 1, createsLastHour: 1, activeJobs: 1 }).ok === true, `(C13) tetos POR USUÁRIO: ${M.TOOL_CALLS_PER_HOUR} chamadas/h, ${M.CREATES_PER_HOUR} filmes/h, ${M.MAX_ACTIVE_JOBS} simultâneos`)

let created = []
const mkDeps = (over = {}) => ({
  user: { id: 'u-1', email: 'teste01@shortsforgeai.com' },
  pausedEngines: PAUSED,
  plansUrl: 'https://www.usekineo.com/pricing?utm_source=claude_studio_connector',
  counts: async () => ({ toolCallsLastHour: 0, createsLastHour: 0, activeJobs: 0 }),
  balance: async () => ({ credits: 500, plan: 'pro', canRender: true }),
  account: async () => ({ ok: true, data: { plan: 'pro', credits: 500 } }),
  createVideo: async (input, estimate) => { created.push({ input, estimate }); return { ok: true, data: { job_id: 'gen-1', status: 'processing', credits_charged: estimate } } },
  videoStatus: async (jobId) => ({ ok: true, data: { job_id: jobId, status: 'processing' } }),
  listVideos: async (limit) => ({ ok: true, data: { count: limit, videos: [] } }),
  ...over,
})
const call = (msg, deps = mkDeps()) => M.handleStudioMessage(msg, deps)
let r = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'claude-ai', version: '1' } } })
ok(r.response.result.serverInfo.name === 'kineo-studio' && r.response.result.protocolVersion === '2025-06-18' && r.trace.client === 'claude-ai/1' && /kineo_video_status/.test(r.response.result.instructions), '(C14) initialize: servidor kineo-studio, versão negociada, instruções mandam consultar o status')
r = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
ok(JSON.stringify(r.response.result.tools) === JSON.stringify(tools), '(C15) tools/list = buildStudioTools')
r = await call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'render_video', arguments: {} } })
ok(r.response.error?.code === -32602 && /Available: kineo_account/.test(r.response.error.message), '(C16) tool desconhecida → -32602 listando as que existem')
created = []
r = await call({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x', engine: 'hollywood', duration: 60 } } }, mkDeps({ balance: async () => ({ credits: 10, plan: 'starter', canRender: true }) }))
ok(r.response.result.isError === true && created.length === 0 && r.response.result.structuredContent.plans_url.includes('/pricing') && r.response.result.structuredContent.credits_needed === k3_60 && r.trace.refused === 'no_balance', `(C17) saldo 10 < ${k3_60} → link de planos, SEM chamar o caminho pago`)
r = await call({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, mkDeps({ balance: async () => ({ credits: 0, plan: 'free', canRender: false, reason: 'No credits.' }) }))
ok(r.response.result.isError === true && created.length === 0 && /Nothing was charged/.test(r.response.result.content[0].text), '(C18) conta sem plano/crédito → recusa com link, nada cobrado')
r = await call({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, mkDeps({ counts: async () => null }))
ok(r.response.result.isError === true && created.length === 0 && r.trace.refused === 'counts_unavailable', '(C19) contagem indisponível → create falha FECHADO (sem chamar), leituras seguem')
r = await call({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'kineo_account', arguments: {} } }, mkDeps({ counts: async () => null }))
ok(r.response.result.isError !== true && r.response.result.structuredContent.credits === 500, '(C19b) kineo_account responde mesmo sem contagem')
r = await call({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, mkDeps({ counts: async () => ({ toolCallsLastHour: 0, createsLastHour: 0, activeJobs: M.MAX_ACTIVE_JOBS }) }))
ok(r.response.result.isError === true && created.length === 0 && r.trace.refused === 'too_many_active', '(C20) teto de simultâneos → recusa antes de chamar')
r = await call({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x', format: 'ugc_ad' } } })
ok(r.response.result.isError === true && created.length === 0 && /open_in_studio/.test(JSON.stringify(r.response.result.structuredContent)) && r.trace.refused === 'format_not_available', '(C21) formato fora do conector (ugc_ad) → link do Studio, sem cobrar')
created = []
r = await call({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { script: 'HOOK: a', engine: 'seedance', duration: 35, language: 'pt', idempotency_key: 'claude-req-0001' } } })
ok(r.response.result.isError !== true && created.length === 1 && created[0].input.idempotencyKey === 'claude-req-0001' && created[0].input.scriptMode === 'verbatim' && created[0].input.language === 'pt' && created[0].estimate === seed35 && r.trace.credits === seed35 && r.trace.tool === 'kineo_create_video' && r.trace.ok === true, '(C22) sucesso: 1 chamada ao caminho pago com a chave de idempotência, modo verbatim, língua e estimativa; trace com créditos')
r = await call({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'kineo_video_status', arguments: { job_id: 'bad id!' } } })
ok(r.response.result.isError === true, '(C23) job_id fora do formato → erro legível')
r = await call({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'kineo_list_videos', arguments: { limit: 999 } } })
ok(r.response.result.isError === true && /1 to 20/.test(r.response.result.content[0].text), '(C24) limit acima do teto → erro legível')
r = await call({ jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, mkDeps({ createVideo: async () => { throw new Error('boom secret') } }))
ok(r.response.result.isError === true && !/boom secret/.test(JSON.stringify(r.response.result)), '(C25) exceção do caminho pago vira mensagem acionável sem vazar o erro interno')
r = await call({ jsonrpc: '2.0', method: 'notifications/initialized' })
ok(r.response === null, '(C26) notificação sem resposta (rota devolve 202)')

// ─── (D) sessão: o cookie cunhado é lido pelo @supabase/ssr REAL ─────────────
const { createServerClient } = require('@supabase/ssr')
const fakeSession = { access_token: 'a.' + 'x'.repeat(1400) + '.b', refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-1', aud: 'authenticated', role: 'authenticated', email: 'teste01@shortsforgeai.com', app_metadata: {}, user_metadata: { nome: 'x'.repeat(2500) }, created_at: '2026-01-01T00:00:00Z' } }
const cookieName = SS.supabaseCookieName('https://cqqukkvjjrguayiyjvhh.supabase.co')
ok(cookieName === 'sb-cqqukkvjjrguayiyjvhh-auth-token', `(D1) nome do cookie = ${cookieName} (o que @supabase/ssr procura)`)
const pairs = SS.sessionCookiePairs(cookieName, fakeSession)
ok(pairs.length > 1 && pairs.every((p) => p.value.length <= SS.SSR_COOKIE_CHUNK) && pairs[0].name === `${cookieName}.0`, `(D2) sessão grande vira ${pairs.length} pedaços ≤ ${SS.SSR_COOKIE_CHUNK} (molde do @supabase/ssr)`)
const small = SS.sessionCookiePairs(cookieName, { access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u' } })
ok(small.length === 1 && small[0].name === cookieName && small[0].value.startsWith('base64-'), '(D3) sessão pequena = 1 cookie "base64-…"')
async function readWithSsr(ps) {
  const client = createServerClient('https://cqqukkvjjrguayiyjvhh.supabase.co', 'anon', { cookies: { getAll: () => ps, setAll: () => {} } })
  const { data } = await client.auth.getSession()
  return data?.session?.access_token ?? null
}
ok((await readWithSsr(pairs)) === fakeSession.access_token, '(D4) createServerClient (o leitor de lib/supabase/server.ts) devolve a MESMA sessão a partir dos pedaços')
ok((await readWithSsr(small)) === 'a', '(D5) …e a partir do cookie único')

// ─── (E) texto das rotas e dos arquivos ──────────────────────────────────────
for (const rel of ['app/api/mcp/route.ts', 'lib/mcp/kineoMcp.ts', 'lib/mcp/connectorHandoff.ts', 'app/api/mcp/chatgpt/route.ts', 'lib/mcp/chatgptContract.ts']) {
  ok(base(rel) !== null && read(rel) === base(rel), `(E1) ${rel} INTOCADO byte a byte (o conector do diretório segue em revisão como estava)`)
}
for (const rel of ['app/api/generate-video-cinematic/route.ts', 'app/api/compose/route.ts', 'app/api/generate-video-fast/route.ts', 'app/api/cinematic-clip-status/route.ts']) {
  ok(base(rel) !== null && lf(semMeta95Personagem2010(semAvatarPreso2010(semBebeQueFala2010(raw(rel), rel), rel), rel)) === base(rel) /* reancorado KINEO-BEBE-QUE-FALA-2010 */, `(E2) ${rel} intocada por esta entrega (nenhuma rota de geração mudou — a trava 8.2 não foi tocada; a folha de personagem, entrega de depois, sai em memória)`) // reancorado KINEO-META95-PERSONAGEM-2010 · reancorado KINEO-AVATAR-PRESO-2010: o conserto do avatar preso no /api/compose (entrega de depois) sai em memória
}
ok(/bearerFrom\(req\.headers\.get\('authorization'\)\)/.test(S.route) && /'WWW-Authenticate': wwwAuthenticateHeader\(origin, error\)/.test(S.route) && /401,/.test(S.route), '(E3) rota: sem Bearer → 401 com WWW-Authenticate (é isto que dispara o login no Claude)')
ok(/row\.revoked_at \|\| Date\.parse\(row\.access_expires_at\) <= Date\.now\(\)/.test(S.route), '(E4) rota: token revogado ou vencido → 401 invalid_token')
ok(/studioAllowsEmail\(mode, email\)/.test(S.route) && /403/.test(S.route), "(E5) rota: modo 'internal' barra conta de fora com 403")
ok(!/req\.headers\.get\('origin'\)/i.test(S.route), '(E6) rota: sem checagem estrita de Origin (derruba o initialize do Claude)')
ok(/userId: row\.user_id/.test(S.route) && !/searchParams\.get\('user/.test(S.route) && !/body\.user_id|args\.user_id/.test(S.route), '(E7) rota: o usuário vem do token, nunca da query/corpo')
ok(/name: STUDIO_TOOL_EVENT|STUDIO_TOOL_EVENT, ctx\.userId/.test(S.route) && /STUDIO_INIT_EVENT/.test(S.route) && /credits: trace\.credits/.test(S.route) && /^export const STUDIO_TOOL_EVENT = 'mcp_studio_tool_called'$/m.test(S.tools) && /^export const STUDIO_INIT_EVENT = 'mcp_studio_initialized'$/m.test(S.tools), '(E8) medição: mcp_studio_initialized / mcp_studio_tool_called com tool, desfecho, créditos e usuário')
ok(/export async function DELETE/.test(S.route) && /revokeToken\(db, bearer\)/.test(S.route) && /revokeToken\(db, token\)/.test(S.revoke), '(E9) revogação: DELETE na rota (desconectar) + revocation_endpoint')
ok(/^export const STUDIO_GENERATE_PATH = '\/api\/generate-video-cinematic'$/m.test(S.tools) && /fetch\(`\$\{ctx\.origin\}\$\{STUDIO_GENERATE_PATH\}`/.test(S.tools) && /cookie: minted\.session\.cookie/.test(S.tools) && /await mintUserSession\(ctx\.userId, ctx\.email\)/.test(S.tools), '(E10) o caminho pago é o /api/generate-video-cinematic do site, chamado com o cookie da sessão da pessoa (mesma cobrança do Generate)')
ok(/generationId,\n\s+prompt: input\.prompt,\n\s+duration: input\.duration,\n\s+language: input\.language,/.test(S.tools) && /script_mode: input\.scriptMode,\n\s+engine: input\.engine,/.test(S.tools), '(E11) o corpo é o do GenerateClient (generationId, prompt, duration, language, aspect, script_mode, engine)')
ok(!/from\('(profiles|videos|events|mcp_studio_jobs)'\)[^\n]*\n(?![^\n]*\.eq\('(user_id|id)', ctx\.userId\))/.test(code(S.tools).replace(/\.from\('([a-z_]+)'\)\.select\(([^)]*)\)/g, ".from('$1')\n.select($2)")) || true, '(E12a) (ver E12)')
const scoped = [...code(S.tools).matchAll(/\.from\('(profiles|videos|events|mcp_studio_jobs)'\)[\s\S]{0,260}?(\.eq\('(?:user_id|id)', ctx\.userId\)|\.maybeSingle\(\)|\.limit\(|\.insert\()/g)]
const unscoped = scoped.filter((m) => !/\.eq\('(?:user_id|id)', ctx\.userId\)/.test(m[0]) && !/\.insert\(/.test(m[0]))
ok(scoped.length >= 8 && unscoped.length === 0, `(E12) toda leitura de profiles/videos/events/mcp_studio_jobs em studioTools.ts é escopada por ctx.userId (${scoped.length} consultas, ${unscoped.length} sem escopo)`)
ok(/user_id: ctx\.userId,/.test(S.tools) && /\.eq\('user_id', ctx\.userId\)\.eq\('generation_id', jobId\)/.test(S.tools), '(E13) job gravado com o user_id do token e lido por (user_id, generation_id) — job alheio não existe para a conta')
ok(/findJobByKey\(ctx, input\.idempotencyKey\)/.test(S.tools) && /reused: true/.test(S.tools) && /mcp_studio_jobs_user_idem_key/.test(S.migration), '(E14) idempotência: mesma chave → mesmo job (índice único por usuário no banco)')
ok(/await minted\.session\.dispose\(\)/.test(S.tools) && /admin\.auth\.admin\.signOut\(session\.access_token, 'local'\)/.test(S.session) && /generateLink\(\{ type: 'magiclink', email \}\)/.test(S.session) && /verifyOtp\(\{ token_hash: tokenHash, type: 'magiclink' \}\)/.test(S.session), '(E15) sessão cunhada sem senha (magiclink admin → verifyOtp) e encerrada depois da chamada')
ok(!/process\.env\.(SUPABASE_JWT|JWT_SECRET)/.test(S.session + S.tools + S.route + S.store) && !/sk_|eyJ[a-zA-Z0-9]{20,}/.test(S.session + S.tools + S.route + S.store + S.oauth), '(E16) nenhum segredo digitado; só envs que a casa já tem (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY) + MCP_STUDIO_LIVE/MCP_STUDIO_INTERNAL_ORIGIN')
const TRAVA = /@\/(lib\/(compose$|compose\.ts$|hollywood\/|lyriaMusic|narrationFit|cinematic\/(?!claim$))|app\/api\/(analyze-idea|generate-script|generate-video-))/
const imports = (s) => [...s.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1])
ok([S.mcp, S.tools, S.route, S.oauth, S.store, S.session].flatMap(imports).every((i) => !TRAVA.test(i)), '(E17) nenhum import do pipeline de geração: o conector chama a rota por HTTP, não reimplementa nada')
ok(/isAnthropicEgressIp/.test(S.route) && !/countRecentHandoffs|RATE_LIMIT_PER_IP/.test(S.route + S.tools) && /limitDecision/.test(S.mcp), '(E18) tetos por usuário (o IP do Claude é compartilhado) — só se mede via_anthropic')
for (const t of ['mcp_oauth_clients', 'mcp_oauth_codes', 'mcp_oauth_tokens', 'mcp_studio_jobs']) {
  ok(new RegExp(`alter table public\\.${t} enable row level security;`).test(S.migration) && new RegExp(`revoke all on public\\.${t} from anon, authenticated, public;`).test(S.migration) && new RegExp(`on public\\.${t} to service_role;`).test(S.migration) && !new RegExp(`create policy[^;]*${t}`).test(S.migration), `(E19) migration: ${t} com RLS ligado, sem policy, sem privilégio para anon/authenticated, só service_role`)
}
ok(/access_hash text not null unique/.test(S.migration) && /code_hash text primary key/.test(S.migration) && /hashToken\(access\)/.test(S.store) && /hashToken\(code\)/.test(S.store), '(E20) nenhum token em claro no banco: colunas são hashes e o store só grava hashToken(...)')
ok(/\.is\('used_at', null\)/.test(S.store) && /revokeTokensOfCode/.test(S.token) && /rotateRefresh\(db, row\)/.test(S.token) && /invalid_grant/.test(S.token), '(E21) código de uso único (reuso revoga), refresh rotacionado, invalid_grant no refresh morto')
ok(/application\/x-www-form-urlencoded/.test(S.token) && /new URLSearchParams\(raw\)/.test(S.token), '(E22) token endpoint lê form-urlencoded (o que o Claude manda)')
ok(/\/login\?redirect=\$\{encodeURIComponent\(here\)\}/.test(S.authorize) && /createClient\(\)/.test(S.authorize) && /hostOf\(params\.redirect_uri\)/.test(S.authorize) && /CONSENT_COOKIE/.test(S.authorize) && /nonce !== cookieNonce/.test(S.authorize), '(E23) authorize: login Kineo de sempre (volta sozinho), tela mostra o host do redirect, consentimento com anti-CSRF')
ok(/spend your credits/.test(S.authorize) && /action" value="allow"/.test(S.authorize) && /access_denied/.test(S.authorize), '(E24) tela de consentimento diz que o app gasta créditos; Allow/Cancel; cancel = access_denied')
// página + fonte única + doc
ok(/^import StudioSection from '\.\/StudioSection' \/\/ KINEO-MCP-STUDIO-2010$/m.test(S.page) && /^\s+<StudioSection \/> \{\/\* KINEO-MCP-STUDIO-2010 \*\/\}$/m.test(S.page), '(E25) page.tsx: só 2 linhas marcadas (import + <StudioSection />)')
ok(/^export const CLAUDE_STUDIO_MCP_SERVER_URL = 'https:\/\/www\.usekineo\.com\/api\/mcp\/studio' \/\/ KINEO-MCP-STUDIO-2010$/m.test(S.connect) && L.STUDIO_MCP_URL === 'https://www.usekineo.com/api/mcp/studio', '(E26) URL do conector na fonte única lib/claudeConnect.ts = STUDIO_MCP_URL')
ok(/CopyField value=\{CLAUDE_STUDIO_MCP_SERVER_URL\}/.test(S.section) && !/usekineo\.com\/api\/mcp/.test(code(S.section)) && /Add custom connector/.test(S.section) && /Customize → Connectors/.test(S.section), '(E27) seção: URL copiável da fonte única (nada digitado), passo a passo Customize → Connectors → Add custom connector')
ok(/Em português/.test(S.section) && /Adicionar conector personalizado/.test(S.section) && /Cole a URL do Kineo Studio/.test(S.section) && /Entre na sua conta Kineo/.test(S.section), '(E28) seção em português com os mesmos passos')
ok(/studioLiveMode\(\)/.test(S.section) && /Opening soon/.test(S.section) && /Rolling out/.test(S.section), '(E29) seção diz a verdade do interruptor (abre em breve / aos poucos / para todos)')
ok(/Credits are spent only when a render actually starts/.test(S.section) && /Remove the connector in Claude to revoke/.test(S.section), '(E30) seção: crédito só quando a produção começa; como revogar')
ok(/MCP_STUDIO_LIVE/.test(S.doc) && /MCP_STUDIO_INTERNAL_ORIGIN/.test(S.doc) && /Add custom connector/.test(S.doc) && /apply_migration|20261020150000_mcp_studio_oauth/.test(S.doc) && /160\.79\.104\.0\/21/.test(S.doc), '(E31) doc: envs que o fundador cria na Vercel, passo a passo de teste no Claude, migration, rede da Anthropic')

// ─── (F) desfaz ──────────────────────────────────────────────────────────────
for (const rel of MCP_STUDIO_2010_ARQUIVOS) {
  const b = base(rel)
  ok(b !== null && lf(semMcpStudio2010(raw(rel), rel)) === b && (!raw(rel).includes('\r\n') || semMcpStudio2010(raw(rel), rel).includes('\r\n')), `(F1) ${rel}: desfeita a entrega, é EXATAMENTE a base ${MCP_STUDIO_2010_BASE.slice(0, 9)} (${ACRESCIMOS_MCP_STUDIO_2010[rel]} acréscimo(s))`)
}
for (const rel of MCP_STUDIO_2010_NOVOS) {
  ok(fs.existsSync(path.join(ROOT, rel)) && base(rel) === null && read(rel).includes(MARCA_MCP_STUDIO_2010), `(F2) ${rel}: novo (não existia na base) e leva a marca`)
}
const changedExisting = git('diff', '--name-only', MCP_STUDIO_2010_BASE, 'HEAD').split('\n').filter(Boolean).filter((f) => base(f) !== null).filter((f) => !META95_PERSONAGEM_2010_ARQUIVOS.includes(f)).filter((f) => !BEBE_QUE_FALA_2010_ARQUIVOS.includes(f)) /* reancorado KINEO-BEBE-QUE-FALA-2010 */ // reancorado KINEO-META95-PERSONAGEM-2010: os arquivos da folha de personagem (entrega de depois, com desfaz próprio) ficam fora desta conta
changedExisting.splice(0, changedExisting.length, ...changedExisting.filter((f) => !META95_ESCRITA_2010_ARQUIVOS.includes(f))) // KINEO-META95-ESCRITA-2010 — reancorado: os arquivos da legenda na escrita do roteiro (entrega de depois) não são desta
changedExisting.splice(0, changedExisting.length, ...changedExisting.filter((f) => !AVATAR_PRESO_2010_ARQUIVOS.includes(f))) // KINEO-AVATAR-PRESO-2010 — reancorado: os arquivos do avatar preso (entrega de depois, com desfaz próprio) não são desta
ok(changedExisting.every((f) => MCP_STUDIO_2010_ARQUIVOS.includes(f)), `(F3) o diff contra a base só toca arquivos declarados (existentes alterados: ${changedExisting.join(', ') || 'nenhum ainda commitado'})`)
const commits = git('log', '--format=%s', `${MCP_STUDIO_2010_BASE}..HEAD`).split('\n').filter(Boolean).filter((s) => !s.includes(MARCA_META95_PERSONAGEM_2010)).filter((s) => !s.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010 */ // reancorado KINEO-META95-PERSONAGEM-2010: os commits da folha de personagem levam a marca deles
commits.splice(0, commits.length, ...commits.filter((s) => !s.includes(MARCA_META95_ESCRITA_2010))) // KINEO-META95-ESCRITA-2010 — reancorado: os commits da legenda na escrita do roteiro levam a marca deles
commits.splice(0, commits.length, ...commits.filter((s) => !s.includes(MARCA_AVATAR_PRESO_2010))) // KINEO-AVATAR-PRESO-2010 — reancorado: os commits (e os merges) do avatar preso levam a marca deles
ok(commits.every((s) => s.includes(MARCA_MCP_STUDIO_2010)), `(F4) todo commit da entrega leva a marca no assunto (${commits.length} commit(s))`)
ok(semMcpStudio2010('sem marca', 'lib/claudeConnect.ts') === 'sem marca' && semMcpStudio2010(raw(F.page), 'outro/arquivo.ts') === raw(F.page), '(F5) desfaz é idempotente fora do alvo')

// ─── (M) mutantes ────────────────────────────────────────────────────────────
ok(L.studioLiveMode('true') !== 'off', '(M0) sanidade do verificador do interruptor')
const asMut = { ...as, code_challenge_methods_supported: ['plain'] }
ok(JSON.stringify(asMut.code_challenge_methods_supported) !== '["S256"]', '(M1) metadata sem S256 → (B2) vermelho')
ok(O.validateAuthorizeParams(new URLSearchParams(good), { ...client, redirect_uris: ['https://evil.example/cb'] }, MCPU).ok === false, '(M2) cliente registrado com outro redirect → o pedido do Claude é recusado')
ok(O.pkceVerify(O.base64url(randomBytes(48)), challenge) === false, '(M3) verifier de outro pedido → PKCE reprova')
let mt = JSON.parse(JSON.stringify(tools)); mt[1].annotations.readOnlyHint = true
ok(mt[1].annotations.readOnlyHint === true && !tools[1].annotations.readOnlyHint, '(M4) create marcado read-only → (C3) vermelho')
ok(!cd.replace(`35s: ${seed35} cr`, `35s: ${seed35 + 1} cr`).includes(`35s: ${seed35} cr`), '(M5) preço digitado diferente da função → (C4) vermelho')
created = []
const depsSemSaldoCheck = mkDeps({ balance: async () => ({ credits: 0, plan: 'free', canRender: false }) })
r = await call({ jsonrpc: '2.0', id: 90, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, depsSemSaldoCheck)
ok(created.length === 0, '(M6) o caminho pago NUNCA é chamado sem saldo (reconferido com saldo 0)')
const mutRel = `lib/mcp/.mutante-${randomBytes(4).toString('hex')}.ts`
const mutSrc = S.mcp.replace("if (!bal.canRender || bal.credits < estimate) {", 'if (false) {')
ok(mutSrc !== S.mcp, '(M7a) mutante de disco aplicou (a guarda de saldo existe como o guardião espera)')
try {
  fs.writeFileSync(path.join(ROOT, mutRel), mutSrc)
  const MM = await load(mutRel)
  created = []
  const rr = await MM.handleStudioMessage({ jsonrpc: '2.0', id: 91, method: 'tools/call', params: { name: 'kineo_create_video', arguments: { idea: 'x' } } }, mkDeps({ balance: async () => ({ credits: 0, plan: 'free', canRender: false }) }))
  ok(created.length === 1 && rr.response.result.isError !== true, '(M7b) despachante SEM a guarda de saldo chama o caminho pago → o (C17/C18) ficaria vermelho')
} finally {
  fs.rmSync(path.join(ROOT, mutRel), { force: true })
}
ok(M.limitDecision('kineo_create_video', { toolCallsLastHour: 0, createsLastHour: M.CREATES_PER_HOUR - 1, activeJobs: M.MAX_ACTIVE_JOBS - 1 }).ok === true && M.limitDecision('kineo_create_video', { toolCallsLastHour: 0, createsLastHour: M.CREATES_PER_HOUR, activeJobs: 0 }).ok === false, '(M8) teto é inclusivo no limite exato (N-1 passa, N barra)')
ok((await readWithSsr([{ name: cookieName, value: 'base64-' + 'garbage' }]).catch(() => null)) === null, '(M9) cookie fora do molde → o leitor real NÃO vê sessão (o (D4) prova o molde certo)')
ok(!/studioLiveMode\(\) === 'off'/.test(S.route.replace("studioLiveMode()\n  if (mode === 'off') return { ok: false, response: notFound() }", '')) || true, '(M10) (ver M10b)')
ok(/if \(mode === 'off'\) return \{ ok: false, response: notFound\(\) \}/.test(S.route), '(M10b) a rota lê o modo UMA vez em authenticate e devolve 404 em off')
ok(raw('app/api/mcp/route.ts') !== raw('app/api/mcp/route.ts') + ' ', '(M11) o comparador byte a byte de (E1) distingue um byte')
const pageSemMarca = raw(F.page).split(/\r?\n/).filter((l) => !l.includes(MARCA_MCP_STUDIO_2010)).length
ok(raw(F.page).split(/\r?\n/).length - pageSemMarca === ACRESCIMOS_MCP_STUDIO_2010[F.page], '(M12) contagem de acréscimos da página bate (linha marcada a mais/a menos → F1 vermelho)')
let threw = false
try { semMcpStudio2010(raw(F.connect) + '\n// KINEO-MCP-STUDIO-2010 extra', F.connect) } catch { threw = true }
ok(threw, '(M13) acréscimo marcado a mais → o desfaz explode (não devolve base falsa)')
const unscopedMut = code(S.tools).replace(".from('videos').select(VIDEO_COLUMNS).eq('user_id', ctx.userId).order(", ".from('videos').select(VIDEO_COLUMNS).order(")
const scopedMut = [...unscopedMut.matchAll(/\.from\('(profiles|videos|events|mcp_studio_jobs)'\)[\s\S]{0,260}?(\.eq\('(?:user_id|id)', ctx\.userId\)|\.maybeSingle\(\)|\.limit\(|\.insert\()/g)].filter((m) => !/\.eq\('(?:user_id|id)', ctx\.userId\)/.test(m[0]) && !/\.insert\(/.test(m[0]))
ok(unscopedMut !== code(S.tools) && scopedMut.length > 0, '(M14) listagem de vídeos sem o .eq(user_id) → (E12) vermelho')
ok(!/alter table public\.mcp_oauth_tokens enable row level security;/.test(S.migration.replace('alter table public.mcp_oauth_tokens enable row level security;', '')), '(M15) migration sem o RLS de uma tabela → (E19) vermelho')
ok(!/^export const STUDIO_GENERATE_PATH = '\/api\/generate-video-cinematic'$/m.test(S.tools.replace("'/api/generate-video-cinematic'", "'/api/generate-video-fast'")), '(M16) caminho pago trocado → (E10) vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
