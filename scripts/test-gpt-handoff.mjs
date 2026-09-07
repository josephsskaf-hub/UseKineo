// KINEO-GPT-HANDOFF-2026-09-06 — guardião do "link de um clique" do GPT.
//
// Duas camadas, de propósito:
//   (A) EXECUÇÃO da lib pura (lib/gptHandoff.ts não tem import; Node >= 22.6
//       despe os tipos) — as duas réguas, o teto, o HTML e a contagem de
//       palavras são provados com números, não com regex.
//   (B) TEXTO REAL das rotas, da página e da migration — cada asserção amarrada
//       à VARIÁVEL/CONDIÇÃO que decide (um mutante que troca o `if` por `true`
//       ou o `randomBytes` por `Math.random` tem que reprovar).
// Sem import com alias `@/` (72 testes do repo morrem no resolver antes da 1ª
// verificação).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

const LIB = 'lib/gptHandoff.ts'
const STORE = 'lib/gptHandoffStore.ts'
const POST_ROUTE = 'app/api/gpt/handoff/route.ts'
const GO_ROUTE = 'app/api/gpt/handoff/go/route.ts'
const PRICING_ROUTE = 'app/api/gpt/handoff/pricing/route.ts'
const PAGE = 'app/go/[token]/page.tsx'
const MIGRATION = 'supabase/migrations/20260906120000_gpt_handoffs.sql'

const lib = read(LIB)
const store = read(STORE)
const postRoute = read(POST_ROUTE)
const goRoute = read(GO_ROUTE)
const pricingRoute = read(PRICING_ROUTE)
const page = read(PAGE)
const migration = read(MIGRATION)

// ═══ (A) EXECUÇÃO DA LIB PURA ═══════════════════════════════════════════════
console.log('\n(A) lib/gptHandoff.ts executada')
ok(!/^\s*import\s/m.test(lib), '(A0) a lib é pura: zero import (é o que permite executá-la aqui)')
let L = null
try {
  L = await import(pathToFileURL(path.join(ROOT, LIB)).href)
} catch (e) {
  ok(false, `(A0) import da lib falhou (Node ${process.version}): ${e && e.message}`)
}
if (L) {
  // As DUAS réguas — números da casa (CLAUDE.md 02/09), nunca unificados.
  ok(L.WORDS_PER_SECOND_CLASSIC === 3.1, '(A1) régua clássica = 3,1 pal/s')
  ok(L.WORDS_PER_SECOND_HOLLYWOOD === 2.3, '(A1) régua hollywood = 2,3 pal/s')
  ok(L.WORDS_PER_SECOND_CLASSIC !== L.WORDS_PER_SECOND_HOLLYWOOD, '(A1) as réguas são DIFERENTES (unificar quebra um lado)')
  for (const e of ['fast', 'seedance', 'kling', 'veo']) ok(L.wordsPerSecondFor(e) === 3.1, `(A1) ${e} usa a régua clássica`)
  for (const e of ['hollywood', 'h3', 'omni']) ok(L.wordsPerSecondFor(e) === 2.3, `(A1) ${e} usa a régua hollywood`)

  // 186 palavras: 60s no clássico (186/3.1=60.0), 80.9s no hollywood.
  const words186 = Array.from({ length: 186 }, (_, i) => `w${i}`).join(' ')
  const cl = L.estimateHandoff(words186, 60, 'seedance')
  const hw = L.estimateHandoff(words186, 60, 'hollywood')
  ok(cl.words === 186 && cl.seconds === 60 && cl.fit === 'ok', `(A2) 186 palavras/seedance → ${cl.seconds}s fit=${cl.fit}`)
  ok(hw.words === 186 && hw.seconds === 80.9 && hw.fit === 'ok', `(A2) 186 palavras/hollywood → ${hw.seconds}s fit=${hw.fit} (mesmo texto, outra régua)`)
  ok(hw.family === 'hollywood' && cl.family === 'classic', '(A2) família volta no veredito')

  // Fronteiras do fit: < 0.95x = short; > 1.6x = long; passar do alvo é bom.
  const mk = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
  ok(L.FIT_SHORT_RATIO === 0.95 && L.FIT_LONG_RATIO === 1.6, '(A3) piso 95% · teto 160%')
  ok(L.estimateHandoff(mk(176), 60, 'seedance').fit === 'short', '(A3) 176 pal/seedance/60s = 56.8s < 57 → short (ficar ABAIXO é defeito)')
  ok(L.estimateHandoff(mk(177), 60, 'seedance').fit === 'ok', '(A3) 177 pal/seedance/60s = 57.1s ≥ 57 → ok')
  ok(L.estimateHandoff(mk(297), 60, 'seedance').fit === 'ok', '(A3) 297 pal/seedance/60s = 95.8s ≤ 96 → ok (PASSAR do alvo é bom)')
  ok(L.estimateHandoff(mk(298), 60, 'seedance').fit === 'long', '(A3) 298 pal/seedance/60s = 96.1s > 96 → long')
  ok(L.estimateHandoff(mk(76), 35, 'hollywood').fit === 'short' && L.estimateHandoff(mk(77), 35, 'hollywood').fit === 'ok', '(A3) hollywood 35s: 76 pal short, 77 pal ok (33.0 vs 33.5 ≥ 33.25)')
  ok(L.estimateHandoff(mk(200), 90, 'seedance').fit === 'short', '(A3) 200 pal/90s clássico = 64.5s → short')

  // Contagem: marcadores da casa não são falados.
  const script = [
    'HOOK',
    'Five things nobody tells you about money.',
    '— MICRO REWARD —',
    'MICRO REWARD 2: The first one is simple.',
    '## ESCALATION',
    '[Pexels: storm over city] It gets worse every year.',
    'PAYOFF:',
    'And that is why you never saw it coming.',
    '',
  ].join('\n')
  const c = L.countScriptWords(script)
  ok(c.words === 7 + 5 + 5 + 9, `(A4) palavras faladas = ${c.words} (rótulos e [direções] fora)`)
  ok(c.markersFound === 5, `(A4) marcadores encontrados = ${c.markersFound} (HOOK, — MICRO REWARD —, inline MICRO REWARD 2:, ## ESCALATION, PAYOFF:)`)
  ok(L.countScriptWords('— — —\n...').words === 0, '(A4) travessão e pontuação soltos não são palavra')
  ok(L.countScriptWords('Olá, você tem 3 razões').words === 5, '(A4) acento e número contam')

  // Teto de 5000 (o MESMO do Studio) e HTML.
  ok(L.SCRIPT_MAX_CHARS === 5000, '(A5) SCRIPT_MAX_CHARS = 5000')
  ok(L.validateHandoffInput({ script: 'a'.repeat(5000) }).ok === true, '(A5) 5000 chars passa')
  const over = L.validateHandoffInput({ script: 'a'.repeat(5001) })
  ok(over.ok === false && /too long/.test(over.error), '(A5) 5001 chars → rejeitado com frase legível')
  ok(L.validateHandoffInput({}).ok === false && L.validateHandoffInput({ script: '   ' }).ok === false, '(A5) script ausente/vazio → rejeitado')
  ok(L.validateHandoffInput({ script: 'Hi <b>bold</b>' }).ok === false, '(A6) <b> → rejeitado')
  ok(L.validateHandoffInput({ script: 'end</p>' }).ok === false, '(A6) </p> → rejeitado')
  ok(L.validateHandoffInput({ script: '3 < 5 and 7 > 2' }).ok === true, '(A6) "3 < 5" não é tag → aceito')
  ok(L.validateHandoffInput({ script: 'x', topic: '<script>' }).ok === false, '(A6) topic com tag → rejeitado')

  // Listas fechadas.
  const v = L.validateHandoffInput({ script: 'x' })
  ok(v.ok && v.value.durationSec === 60 && v.value.aspect === '9:16' && v.value.engineHint === 'seedance' && v.value.language === 'en' && v.value.topic === null, '(A7) padrões: 60s · 9:16 · seedance · en · sem tópico')
  ok(L.validateHandoffInput({ script: 'x', durationSec: 45 }).ok === false, '(A7) durationSec=45 → rejeitado (35|60|90)')
  ok(L.validateHandoffInput({ script: 'x', durationSec: '90' }).ok && L.validateHandoffInput({ script: 'x', durationSec: '90' }).value.durationSec === 90, '(A7) durationSec "90" (string) → 90')
  ok(L.validateHandoffInput({ script: 'x', aspect: '4:3' }).ok === false, '(A7) aspect 4:3 → rejeitado')
  ok(L.validateHandoffInput({ script: 'x', engineHint: 'sora' }).ok === false, '(A7) engineHint sora → rejeitado (não existe no Studio)')
  ok(L.validateHandoffInput({ script: 'x', engineHint: 's25' }).ok === false, '(A7) engineHint s25 → rejeitado (Studio ignora ?engine=s25 com S25_PUBLIC=false)')
  ok(L.validateHandoffInput({ script: 'x', engineHint: 'Kling 3' }).ok && L.validateHandoffInput({ script: 'x', engineHint: 'Kling 3' }).value.engineHint === 'hollywood', '(A7) apelido "Kling 3" → hollywood')
  ok(L.validateHandoffInput({ script: 'x', engineHint: 'kineo1' }).value?.engineHint === 'fast', '(A7) apelido kineo1 → fast')
  ok(L.validateHandoffInput({ script: 'x', language: 'pt-BR' }).ok && L.validateHandoffInput({ script: 'x', language: 'portuguese' }).ok === false, '(A7) language pt-BR ok · "portuguese" rejeitado')
  ok(L.validateHandoffInput({ script: 'x', topic: 't'.repeat(201) }).ok === false, '(A7) topic 201 chars → rejeitado')

  // Ids de motor = os que o Studio REALMENTE aceita (cross-check com o arquivo).
  const studio = read('app/(dashboard)/studio/StudioClient.tsx')
  const studioKeys = [...studio.matchAll(/\{ key: '([a-z0-9]+)',[^\n]*credits: `\$\{creditCostFor\(/g)].map((m) => m[1])
  ok(studioKeys.length >= 7, `(A8) StudioClient ENGINES lidos: ${studioKeys.join(', ')}`)
  ok(L.HANDOFF_ENGINES.every((e) => studioKeys.includes(e)), '(A8) todo id aceito pelo handoff existe no Studio')
  ok(!L.HANDOFF_ENGINES.includes('s25') && studioKeys.includes('s25'), '(A8) s25 existe no Studio mas fica fora do handoff (interruptor S25_PUBLIC)')
  ok(/e !== 's25'/.test(studio), '(A8) o Studio de fato ignora ?engine=s25 (condição real no arquivo)')
  ok(!L.HANDOFF_ENGINES.includes('sora'), '(A8) sora fora')

  // Token / TTL / destino.
  ok(L.HANDOFF_TTL_DAYS === 7 && L.HANDOFF_TTL_MS === 7 * 24 * 60 * 60 * 1000, '(A9) TTL = 7 dias')
  const tok = randomBytes(18).toString('base64url')
  ok(tok.length === 24 && L.isHandoffToken(tok), `(A9) randomBytes(18).base64url = ${tok.length} chars, casa com TOKEN_PATTERN`)
  ok(!L.isHandoffToken('short') && !L.isHandoffToken('a'.repeat(16) + '/..'), '(A9) token curto ou com caractere fora do url-safe → recusado')
  ok(L.isHandoffToken('a'.repeat(16)) && !L.isHandoffToken('a'.repeat(15)), '(A9) mínimo 16 chars')
  const dest = L.buildStudioDestination({ script: 'Hello world & more', duration_sec: 90, engine_hint: 'veo' })
  ok(dest.startsWith('/studio/create?') && /prompt=Hello\+world\+%26\+more/.test(dest) && /script_mode=verbatim/.test(dest) && /duration=90/.test(dest) && /engine=veo/.test(dest) && /utm_source=chatgpt_gpt/.test(dest) && /intent_campaign=kineo_gpt_store/.test(dest), '(A10) destino: /studio/create + prompt + verbatim + duration + engine + utm + campanha')
  ok(/engine=seedance/.test(L.buildStudioDestination({ script: 'x', duration_sec: 60, engine_hint: 'bogus' })), '(A10) engine_hint inválido na linha cai em seedance, nunca passa cru')
  ok(L.handoffHeadline({ topic: null, script: 'HOOK\nFive things nobody tells you about money and power today' }) === 'Five things nobody tells you about money and power…', '(A10) manchete = primeiras 9 palavras faladas quando não há tópico')
  ok(/ANALYZE_PROMPT_MAX_CHARS = 5000/.test(read('lib/analyzeLimits.ts')) && L.STUDIO_PROMPT_MAX_CHARS === 5000, '(A11) STUDIO_PROMPT_MAX_CHARS espelha ANALYZE_PROMPT_MAX_CHARS (5000)')
  // A TRAVA: o handoff NUNCA pode aceitar roteiro que o Studio recusa. Se
  // alguem subir SCRIPT_MAX_CHARS acima do teto do /api/analyze-idea, o link
  // volta a nascer valido para morrer na primeira tela do produto.
  ok(L.SCRIPT_MAX_CHARS <= L.STUDIO_PROMPT_MAX_CHARS, '(A11) INVARIANTE: SCRIPT_MAX_CHARS <= STUDIO_PROMPT_MAX_CHARS')
}

// ═══ (B) TEXTO REAL — rota POST ═════════════════════════════════════════════
console.log('\n(B) app/api/gpt/handoff/route.ts')
ok(/export async function POST\(/.test(postRoute) && /export function OPTIONS\(/.test(postRoute), '(B1) exporta POST e OPTIONS')
ok(/'Access-Control-Allow-Origin': '\*'/.test(postRoute), '(B1) CORS: Access-Control-Allow-Origin: *')
ok(/new NextResponse\(null, \{ status: 204, headers: CORS_HEADERS \}\)/.test(postRoute), '(B1) OPTIONS responde 204 com os headers CORS')
ok(/NextResponse\.json\(body, \{ status, headers: \{ \.\.\.CORS_HEADERS/.test(postRoute), '(B1) toda resposta JSON (200 e 4xx) carrega CORS')
ok(/import \{ randomBytes \} from 'crypto'/.test(postRoute) && /return randomBytes\(18\)\.toString\('base64url'\)/.test(postRoute), '(B2) token = randomBytes(18).base64url')
ok(!/Math\.random/.test(postRoute) && !/Math\.random/.test(lib) && !/Math\.random/.test(store), '(B2) Math.random ausente na rota, na lib e no store')
ok(/const token = newToken\(\)/.test(postRoute), '(B2) o token gravado vem de newToken()')
ok(/new Date\(Date\.now\(\) \+ HANDOFF_TTL_MS\)\.toISOString\(\)/.test(postRoute) && /expires_at: expiresAt/.test(postRoute), '(B3) expires_at = agora + HANDOFF_TTL_MS')
ok(/const validated = validateHandoffInput\(body\)\s*\n\s*if \(!validated\.ok\) return json\(\{ error: validated\.error \}, 400\)/.test(postRoute), '(B4) entrada inválida → 400 com {error} legível')
ok(/catch \{\s*\n\s*return json\(\{ error: 'Send a JSON body/.test(postRoute), '(B4) JSON quebrado → 400, não 500')
// Rate limit amarrado às constantes e ao status.
ok(/if \(counts && ipHash && counts\.ip >= RATE_LIMIT_PER_IP_PER_HOUR\) \{\s*\n\s*return json\([^\n]*429\)/.test(postRoute), '(B5) por IP: counts.ip >= RATE_LIMIT_PER_IP_PER_HOUR → 429')
ok(/if \(counts && counts\.global >= RATE_LIMIT_GLOBAL_PER_HOUR\) \{\s*\n\s*return json\([^\n]*429\)/.test(postRoute), '(B5) global: counts.global >= RATE_LIMIT_GLOBAL_PER_HOUR → 429')
ok(/export const RATE_LIMIT_PER_IP_PER_HOUR = 60/.test(lib) && /export const RATE_LIMIT_GLOBAL_PER_HOUR = 600/.test(lib) && /RATE_LIMIT_WINDOW_MS = 60 \* 60 \* 1000/.test(lib), '(B5) tetos: 60/h por IP · 600/h global · janela 1h')
ok(/const since = new Date\(Date\.now\(\) - RATE_LIMIT_WINDOW_MS\)\.toISOString\(\)/.test(store) && /\.gte\('created_at', since\)\.eq\('ip_hash', ipHash\)/.test(store), '(B5) contagem no BANCO: created_at >= agora-1h e ip_hash = hash')
ok(/if \(g\.error\) return null/.test(store) && /const counts = await countRecentHandoffs\(ipHash\)/.test(postRoute), '(B5) contador quebrado devolve null → o `counts &&` deixa passar (falha aberta)')
ok(/createHash\('sha256'\)\.update\(`\$\{salt\}\|\$\{ip\}`\)/.test(store) && /ip_hash: ipHash/.test(postRoute) && !/ip_address|raw_ip|ip: ip\b/.test(postRoute), '(B5) grava sha256(salt|ip), nunca IP cru')
ok(/name: 'gpt_handoff_created'/.test(postRoute), '(B6) evento gpt_handoff_created')
for (const k of ['words: est.words', 'seconds: est.seconds', 'fit: est.fit', 'duration_sec: input.durationSec', 'engine_hint: input.engineHint', 'language: input.language', 'has_topic: Boolean(input.topic)', 'script_chars: input.script.length', 'markers_found: est.markersFound']) {
  ok(postRoute.includes(k), `(B6) metadata carrega ${k.split(':')[0]}`)
}
ok(/const est = estimateHandoff\(input\.script, input\.durationSec, input\.engineHint\)/.test(postRoute), '(B7) a régua roda com o MOTOR escolhido (duas réguas, não uma)')
ok(/url: `\$\{origin\}\$\{GO_PATH_PREFIX\}\$\{token\}`/.test(postRoute) && /export const GO_PATH_PREFIX = '\/go\/'/.test(lib), '(B7) devolve url = <origin>/go/<token>')
for (const k of ['token,', 'expiresAt,', 'words: est.words', 'seconds: est.seconds', 'fit: est.fit', 'durationSec: input.durationSec', 'engineHint: input.engineHint']) ok(postRoute.includes(k), `(B7) 200 carrega ${k.replace(',', '')}`)
ok(/if \(!inserted\.ok\) \{[\s\S]*?return json\([^\n]*503\)/.test(postRoute), '(B8) insert falhou → 503 legível (sem linha não há link)')
ok(/\} catch \(e\) \{[\s\S]*?return json\(\{ error: 'Kineo could not process[^\n]*503\)\s*\n\s*\}\s*\n\}/.test(postRoute), '(B8) qualquer exceção → 503 JSON com CORS, nunca 500 mudo')
// Nunca paga.
const importsOf = (src) => [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
const PAID = /generate-video|\/compose|falQueue|fal\b|credit|debit|grant|hollywood\/|cinematic\/|broll\/|lyriaMusic|openai|stripe/i
const allImports = [postRoute, goRoute, pricingRoute, store, page].flatMap(importsOf)
ok(allImports.length >= 12 && allImports.every((i) => !PAID.test(i)), `(B9) nenhum import de pipeline/fornecedor/crédito nas 5 superfícies (${allImports.length} imports lidos)`)
ok(!/auth\.admin|signUp|createUser/.test(postRoute + store), '(B9) nunca cria conta')

// ═══ (B) TEXTO REAL — rota GO (o clique) ════════════════════════════════════
console.log('\n(B) app/api/gpt/handoff/go/route.ts')
ok(/export const dynamic = 'force-dynamic'/.test(goRoute) && /export const fetchCache = 'force-no-store'/.test(goRoute) && /export const runtime = 'nodejs'/.test(goRoute), '(C1) force-dynamic + force-no-store + nodejs')
ok(/name: 'gpt_landing_clicked'/.test(goRoute), '(C2) evento gpt_landing_clicked')
ok(/if \(!bot\) await markHandoffClicked\(row, userId\)/.test(goRoute) && /click_count: \(row\.click_count \?\? 0\) \+ 1/.test(store) && /clicked_at: new Date\(\)\.toISOString\(\)/.test(store), '(C2) clique humano incrementa click_count e carimba clicked_at')
ok(/signed_in: Boolean\(userId\)/.test(goRoute) && /bot,/.test(goRoute), '(C2) metadata: signed_in + etiqueta de robô')
ok(/const ROBO = \/\(bot\|crawler\|spider/.test(store) && /if \(!ua\) return true/.test(store), '(C2) etiqueta de robô (mesma lista do episode-link; sem UA = robô)')
// A decisão sessão/sem-sessão, amarrada ao userId e aos dois destinos.
ok(/const url = userId\s*\n\s*\? `\$\{origem\}\$\{destino\}`\s*\n\s*: `\$\{origem\}\$\{authPath\}\?redirect=\$\{encodeURIComponent\(`\$\{GO_PATH_PREFIX\}\$\{token\}`\)\}`/.test(goRoute), '(C3) userId ? Studio preenchido : conta com redirect=/go/<token>')
ok(/userId = user\?\.id \?\? null/.test(goRoute), '(C3) userId vem de supabase.auth.getUser()')
ok(/authPath = hasPriorSession \? '\/login' : '\/signup'/.test(goRoute) && /c\.name\.startsWith\('sb-'\) && c\.name\.includes\('auth-token'\)/.test(goRoute), '(C3) sem sessão: cookie antigo → /login, novo → /signup (critério do porteiro de /studio/create)')
ok(/destino = normalizeInternalRedirect\(buildStudioDestination\(row\)\) \?\? STUDIO_CREATE_PATH/.test(goRoute), '(C3) destino passa por normalizeInternalRedirect; recusa → /studio/create pelado')
ok(/if \(!isHandoffToken\(token\)\) \{\s*\n\s*return NextResponse\.redirect\(`\$\{origem\}\$\{FALLBACK\}`, 302\)/.test(goRoute), '(C4) token inválido → redirect, não 4xx')
ok(/if \(found\.status !== 'ok' \|\| found\.expired\) \{\s*\n\s*return NextResponse\.redirect\(`\$\{origem\}\$\{GO_PATH_PREFIX\}\$\{token\}`, 302\)/.test(goRoute), '(C4) sem linha ou vencido → volta para /go/<token> (a página explica)')
ok(/await findHandoff\(token\)\.catch\(\(\) => \(\{ status: 'unavailable' as const \}\)\)/.test(goRoute), '(C4) leitura do banco com catch → nunca lança')
ok(!/status: 500|new Response\(.*500/.test(goRoute) && (goRoute.match(/return NextResponse\.redirect\(/g) || []).length >= 3 && (goRoute.match(/\} catch \{/g) || []).length >= 4, '(C4) falha SEMPRE aberta: 0 respostas 500, ≥3 redirects, ≥4 catch')
ok(/searchParams\.get\('token'\)/.test(goRoute) && !/searchParams\.get\('(prompt|redirect|engine|next|url)'\)/.test(goRoute), '(C4) lista fechada: só `token` é lido da query')

// ═══ (B) TEXTO REAL — página /go/[token] ════════════════════════════════════
console.log('\n(B) app/go/[token]/page.tsx')
ok(/export const dynamic = 'force-dynamic'/.test(page) && /export const runtime = 'nodejs'/.test(page), '(D1) force-dynamic + nodejs')
ok(/robots: \{ index: false/.test(page), '(D1) noindex (URL com token)')
ok(/name: 'gpt_landing_viewed'/.test(page) && /dedupeMinutes: 30/.test(page) && /sessionId: cookies\(\)\.get\('kineo_event_session_id'\)/.test(page), '(D2) gpt_landing_viewed com dedupeMinutes e session_id (force-dynamic re-renderiza)')
ok(/if \(!bot\) await markHandoffViewed\(token\)/.test(page) && /\.is\('viewed_at', null\)/.test(store), '(D2) viewed_at só na 1ª visita humana')
ok(/const goHref = `\/api\/gpt\/handoff\/go\?token=\$\{encodeURIComponent\(token\)\}`/.test(page) && /<a href=\{goHref\}[\s\S]*?Make this video/.test(page), '(D3) "Make this video" é LINK para /api/gpt/handoff/go?token= (o clique passa pelo servidor)')
ok(!/href=\{?["'`]\/studio\/create/.test(page), '(D3) a página NÃO linka o Studio direto (senão o clique não conta)')
ok(/\{row\.script\}/.test(page) && /whiteSpace: 'pre-wrap'/.test(page), '(D4) roteiro COMPLETO como texto (React escapa; pre-wrap)')
ok(/\{headline\}/.test(page) && /handoffHeadline\(row\)/.test(page) && /\{row\.duration_sec\}s video/.test(page) && /\{engineLabel\} engine/.test(page) && /\{fitLine\}/.test(page) && /describeFit\(/.test(page), '(D4) mostra tópico/manchete, duração, motor e a estimativa em inglês')
ok(/if \(found\.expired\) return <Expired reason="expired" \/>/.test(page) && /if \(found\.status === 'missing'\) return <Expired reason="missing" \/>/.test(page), '(D5) vencido/inexistente → página honesta')
ok(/if \(found\.status === 'unavailable'\) return <Expired reason="unavailable" \/>/.test(page), '(D5) banco fora → "temporarily unavailable", nunca 404 nem 500')
ok(/<Link href="\/studio\?utm_source=chatgpt_gpt[^"]*" style=\{BUTTON\}>\s*\n\s*Open the Studio/.test(page), '(D5) botão para /studio na página de expirado')
ok(/if \(!isHandoffToken\(token\)\) return <Expired reason="missing" \/>/.test(page), '(D5) token fora do padrão não toca o banco')
ok(/const pricingHref = `\/api\/gpt\/handoff\/pricing\?token=/.test(page) && /<a href=\{pricingHref\}[\s\S]*?See plans/.test(page), '(D6/K1) "See plans" visível, via rota contadora')
ok(/overStudioLimit && \(/.test(page) && /row\.script\.length > STUDIO_PROMPT_MAX_CHARS/.test(page), '(D7) aviso quando o roteiro passa do teto do Studio (5.000)')
ok(!/<style|className=/.test(page) && (page.match(/style=\{\{/g) || []).length >= 8, '(D8) sem CSS novo: só inline style no padrão de app/revive')

// ═══ (B) TEXTO REAL — rota PRICING (K1) ═════════════════════════════════════
console.log('\n(B) app/api/gpt/handoff/pricing/route.ts')
ok(/name: 'gpt_landing_pricing_clicked'/.test(pricingRoute), '(E1) evento gpt_landing_pricing_clicked')
ok(/return NextResponse\.redirect\(`\$\{origem\}\$\{PRICING\}`, 302\)/.test(pricingRoute) && /const PRICING = `\/pricing\?utm_source=\$\{HANDOFF_UTM_SOURCE\}/.test(pricingRoute) && /HANDOFF_UTM_SOURCE = 'chatgpt_gpt'/.test(lib), '(E1) 302 para /pricing?utm_source=chatgpt_gpt')
ok(/try \{[\s\S]*?writeServerEvent[\s\S]*?\} catch \{[\s\S]*?\}\s*\n\s*return NextResponse\.redirect/.test(pricingRoute), '(E1) falha aberta: o redirect fica FORA do try')
ok(/export const fetchCache = 'force-no-store'/.test(pricingRoute), '(E1) rota SÓ-GET com o interruptor do Data Cache')

// Os 4 nomes de evento, cada um na superfície certa e em nenhuma outra.
console.log('\n(F) os quatro eventos')
const EVENTS = { gpt_handoff_created: postRoute, gpt_landing_viewed: page, gpt_landing_clicked: goRoute, gpt_landing_pricing_clicked: pricingRoute }
for (const [name, file] of Object.entries(EVENTS)) {
  const others = Object.entries(EVENTS).filter(([n]) => n !== name).map(([, f]) => f)
  ok(file.includes(`name: '${name}'`) && others.every((f) => !f.includes(`name: '${name}'`)), `(F) ${name} emitido em exatamente uma superfície`)
}

// ═══ (G) MIGRATION ══════════════════════════════════════════════════════════
console.log('\n(G) migration')
ok(/create table if not exists public\.gpt_handoffs/.test(migration), '(G1) cria public.gpt_handoffs')
for (const col of ['id uuid primary key default gen_random_uuid()', 'token text unique not null', 'script text not null', 'duration_sec int not null', 'aspect text not null', 'engine_hint text not null', 'language text not null', 'topic text', 'words int not null', 'seconds numeric not null', 'fit text not null', 'created_at timestamptz default now()', 'expires_at timestamptz not null', 'viewed_at timestamptz', 'clicked_at timestamptz', 'click_count int default 0', 'ip_hash text', 'user_agent text']) {
  ok(migration.includes(col), `(G1) coluna: ${col.split(' ')[0]}`)
}
ok(/alter table public\.gpt_handoffs enable row level security/.test(migration), '(G2) RLS ligado')
ok(!/create policy/i.test(migration), '(G2) NENHUMA policy (leitura pública impossível)')
ok(/revoke all privileges on table public\.gpt_handoffs from anon/.test(migration) && /from authenticated/.test(migration) && /from public;/.test(migration), '(G2) grants do navegador revogados (anon/authenticated/PUBLIC)')
ok(/grant select, insert, update on table public\.gpt_handoffs to service_role/.test(migration) && !/grant .*to (anon|authenticated|public)/i.test(migration), '(G2) só service_role escreve/lê')
ok(/on public\.gpt_handoffs \(ip_hash, created_at\)/.test(migration), '(G3) índice do rate limit (ip_hash, created_at)')
ok(/^20260906\d{6}_gpt_handoffs\.sql$/.test(path.basename(MIGRATION)), '(G4) nome no padrão YYYYMMDDHHMMSS_nome.sql da pasta')
// O código e o SQL falam da mesma tabela e das mesmas colunas.
ok(/GPT_HANDOFFS_TABLE = 'gpt_handoffs'/.test(store), '(G5) o store aponta para gpt_handoffs')
for (const col of ['token', 'script', 'duration_sec', 'aspect', 'engine_hint', 'language', 'topic', 'words', 'seconds', 'fit', 'expires_at', 'ip_hash', 'user_agent']) ok(new RegExp(`\\b${col}\\b`).test(store) && migration.includes(col), `(G5) coluna ${col} existe no store e no SQL`)

// ═══ (H) A JUNÇÃO POR PESSOA ════════════════════════════════════════════════
// O handoff nasce anônimo. Sem estas quatro coisas o funil só se junta por
// DATA — junção fraca, que esta casa já pagou caro. Os mutantes que estas
// verificações reprovam: (1) tirar o user_id da chamada do clique; (2) trocar
// o `.is('user_id', null)` por sobrescrita, que faz a atribuição mudar de dono
// a cada clique de terceiro num link colado em grupo; (3) apagar a coluna.
{
  const go = read('app/api/gpt/handoff/go/route.ts')
  const store = read('lib/gptHandoffStore.ts')
  const migration = read('supabase/migrations/20260906120000_gpt_handoffs.sql')

  ok(/markHandoffClicked\(row,\s*userId\)/.test(go), '(H1) a rota do clique PASSA o userId — sem isto a coluna nunca é preenchida')
  ok(/user_id uuid/.test(migration), '(H2) a coluna user_id existe no SQL')
  ok(/\.update\(\{ user_id: userId \}\)[\s\S]{0,200}?\.is\('user_id', null\)/.test(store), '(H3) a gravação é condicional: A PRIMEIRA PESSOA GANHA (nunca sobrescreve)')
  // Amarrado à VARIÁVEL que decide, não a texto de comentário: se alguém
  // trocar o guard por um `if (true)`, a escrita passa a acontecer sem sessão.
  ok(/if \(userId\) \{/.test(store), '(H4) só grava quando HÁ sessão (guard na variável userId)')
  // O clique anônimo continua medível pela aba: sem session_id, quem clica
  // deslogado e nunca volta ao /go some do funil inteiro.
  ok(/kineo_event_session_id/.test(go) && /sessionId,/.test(go), '(H5) o clique deslogado carrega session_id (segundo caminho de junção)')
  // E o evento continua contando TODO clique, não só o da dona.
  ok(/gpt_landing_clicked/.test(go) && /userId,/.test(go), '(H6) o evento do clique carrega user_id — coluna é 1:1, evento é N:1')
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)