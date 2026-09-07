// KINEO-GPT-HANDOFF-2026-09-06 — guardião do "link de um clique" do GPT.
//
// Duas camadas, de propósito:
//   (A) EXECUÇÃO da lib pura (lib/gptHandoff.ts tem UM import, lib/aspect.ts,
//       que é pura; Node >= 22.6 despe os tipos) — as duas réguas, o teto, o
//       HTML, a contagem de palavras e o destino do clique são provados com
//       números, não com regex.
//   (B) TEXTO REAL das rotas, da página e da migration — cada asserção amarrada
//       à VARIÁVEL/CONDIÇÃO que decide (um mutante que troca o `if` por `true`
//       ou o `randomBytes` por `Math.random` tem que reprovar).
// Este arquivo NÃO importa nada com alias `@/` (72 testes do repo morrem no
// resolver antes da 1ª verificação). O que ele faz, desde 06/09, é resolver o
// alias PARA A LIB: `registerHooks` abaixo mapeia `@/x` → `<raiz>/x(.ts)` em
// processo, só o suficiente para lib/gptHandoff.ts importar lib/aspect.ts —
// a fonte única do enquadramento, que o handoff copiava à mão e copiava
// errado (faltava o 4:5). Nenhum formato é digitado neste arquivo: a lista
// vem de lib/aspect.ts por regex E por execução, e as duas têm de bater.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import { registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

// O alias do tsconfig (`paths: { "@/*": ["./*"] }`), resolvido em processo.
// Só prefixo `@/`; tudo o mais segue o resolvedor normal do Node.
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

/** `export const NAME = ['a', 'b'] as const` lido do TEXTO de um arquivo. */
const listFrom = (src, name) => {
  const m = src.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const`))
  return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : null
}
const strFrom = (src, name) => (src.match(new RegExp(`export const ${name}(?:: \\w+)? = '([^']*)'`)) || [])[1]
const sameSetTop = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x) => b.includes(x))

const LIB = 'lib/gptHandoff.ts'
const ASPECT_LIB = 'lib/aspect.ts'
const STORE = 'lib/gptHandoffStore.ts'
const POST_ROUTE = 'app/api/gpt/handoff/route.ts'
const GO_ROUTE = 'app/api/gpt/handoff/go/route.ts'
const PRICING_ROUTE = 'app/api/gpt/handoff/pricing/route.ts'
const PAGE = 'app/go/[token]/page.tsx'
const MIGRATION = 'supabase/migrations/20260906120000_gpt_handoffs.sql'

const lib = read(LIB)
const aspectLib = read(ASPECT_LIB)
const store = read(STORE)
const postRoute = read(POST_ROUTE)
const goRoute = read(GO_ROUTE)
const pricingRoute = read(PRICING_ROUTE)
const page = read(PAGE)
const migration = read(MIGRATION)

// O ENQUADRAMENTO — nunca digitado aqui. A lista e o padrão vêm do texto de
// lib/aspect.ts; o bloco (A) confere que a lib EXECUTADA devolve a mesma coisa.
const ASPECT_LIST = listFrom(aspectLib, 'ASPECTS') || []
const ASPECT_DEFAULT = strFrom(aspectLib, 'DEFAULT_ASPECT')

// ═══ (A) EXECUÇÃO DA LIB PURA ═══════════════════════════════════════════════
console.log('\n(A) lib/gptHandoff.ts executada')
{
  // KINEO-ASSISTANT-LINK-2026-09-06: o hash de idempotência trouxe `node:crypto`
  // (builtin — zero banco, zero rede). Continua puro; a lista de módulos do
  // PROJETO que a lib pode importar segue sendo UMA: @/lib/aspect.
  const libImports = [...lib.matchAll(/^import [^\n]* from '([^']+)'/gm)].map((m) => m[1])
  const projectImports = libImports.filter((s) => !s.startsWith('node:'))
  ok(projectImports.length === 1 && projectImports[0] === '@/lib/aspect' && libImports.every((s) => s === '@/lib/aspect' || s === 'node:crypto'), `(A0) a lib importa UM módulo do projeto, @/lib/aspect, e no máximo o builtin node:crypto (achados: ${libImports.join(', ') || 'nenhum'}) — o resto continua puro`)
  ok(!/^\s*import\s/m.test(aspectLib), '(A0) lib/aspect.ts é pura: zero import (é o que permite executar as duas aqui)')
}
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

  // (A12) O ENQUADRAMENTO, EXECUTADO. Até 06/09 a lib tinha a própria lista
  // (3 formatos, digitada) e buildStudioDestination() descartava o aspect:
  // 100% dos handoffs renderizavam 9:16. Agora: a lista executada é a de
  // lib/aspect.ts; a validação aceita cada um e recusa o resto citando a lista
  // real; e o destino emite `aspect` para TODO formato que não é o padrão e
  // para NENHUM outro (o link de quem pede Shorts continua byte a byte igual).
  ok(ASPECT_LIST.length >= 2 && ASPECT_LIST.includes(ASPECT_DEFAULT), `(A12) lib/aspect.ts lida: ASPECTS=[${ASPECT_LIST}] padrão=${ASPECT_DEFAULT}`)
  ok(sameSetTop([...L.ASPECTS], ASPECT_LIST) && L.DEFAULT_ASPECT === ASPECT_DEFAULT, `(A12) L.ASPECTS executada [${[...L.ASPECTS]}] === lista de lib/aspect.ts, e L.DEFAULT_ASPECT === ${ASPECT_DEFAULT}`)
  ok(ASPECT_LIST.every((a) => { const v = L.validateHandoffInput({ script: 'x', aspect: a }); return v.ok === true && v.value.aspect === a }), `(A12) validateHandoffInput aceita cada um dos ${ASPECT_LIST.length} formatos e o devolve intacto`)
  const bogusAspect = ASPECT_LIST.join('') + 'x'
  const rejected = L.validateHandoffInput({ script: 'x', aspect: bogusAspect })
  ok(rejected.ok === false && ASPECT_LIST.every((a) => rejected.error.includes(a)), `(A12) formato fora da lista → recusado, e a frase cita os ${ASPECT_LIST.length} formatos reais: "${rejected.error}"`)
  const destAspect = (a) => new URLSearchParams(L.buildStudioDestination({ script: 'x', duration_sec: 60, engine_hint: 'seedance', aspect: a }).split('?')[1]).get('aspect')
  for (const a of ASPECT_LIST) {
    if (a === ASPECT_DEFAULT) ok(destAspect(a) === null, `(A12) destino para ${a} (o padrão) NÃO leva a chave aspect — link de Shorts inalterado`)
    else ok(destAspect(a) === a, `(A12) destino para ${a} leva aspect=${destAspect(a)} — o Studio vai renderizar o que a pessoa pediu`)
  }
  ok(destAspect(bogusAspect) === null && destAspect(undefined) === null, '(A12) valor inválido/ausente na linha normaliza para o padrão e some da URL (nunca passa cru)')
  const withDefault = L.buildStudioDestination({ script: 'Hello', duration_sec: 60, engine_hint: 'seedance', aspect: ASPECT_DEFAULT })
  const withNothing = L.buildStudioDestination({ script: 'Hello', duration_sec: 60, engine_hint: 'seedance', aspect: '' })
  ok(withDefault === withNothing && !/aspect=/.test(withDefault), '(A12) destino com o padrão === destino sem formato, byte a byte')
}

// ═══ (B) TEXTO REAL — rota POST ═════════════════════════════════════════════
console.log('\n(B) app/api/gpt/handoff/route.ts')
ok(/export async function POST\(/.test(postRoute) && /export function OPTIONS\(/.test(postRoute), '(B1) exporta POST e OPTIONS')
ok(/'Access-Control-Allow-Origin': '\*'/.test(postRoute), '(B1) CORS: Access-Control-Allow-Origin: *')
ok(/new NextResponse\(null, \{ status: 204, headers: CORS_HEADERS \}\)/.test(postRoute), '(B1) OPTIONS responde 204 com os headers CORS')
ok(/NextResponse\.json\(body, \{ status, headers: \{ \.\.\.CORS_HEADERS/.test(postRoute), '(B1) toda resposta JSON (200 e 4xx) carrega CORS')
ok(/import \{ randomBytes \} from 'crypto'/.test(postRoute) && /return randomBytes\(18\)\.toString\('base64url'\)/.test(postRoute), '(B2) token = randomBytes(18).base64url')
ok(!/Math\.random/.test(postRoute) && !/Math\.random/.test(lib) && !/Math\.random/.test(store), '(B2) Math.random ausente na rota, na lib e no store')
// KINEO-ASSISTANT-LINK-2026-09-06: o token virou `let` (o POST reaproveita a
// linha viva do mesmo payload_hash); o que importa é que o token NOVO vem de
// newToken() e de nada mais.
ok(/\btoken = newToken\(\)/.test(postRoute), '(B2) o token gravado vem de newToken()')
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

// ═══ (I) O TOKEN NO EVENTO — a chave que liga o degrau ao handoff ═════════
// Falso zero é pior que número ausente, porque parece medição. Sem `token` na
// metadata, o SQL do funil junta por metadata->>'token' (sempre nulo) e marca
// ZERO PARA SEMPRE, com qualquer volume de tráfego real. Foi pego em produção
// no primeiro handoff de verdade, conferindo as chaves que o evento gravou.
{
  const goR = read('app/api/gpt/handoff/go/route.ts')
  const pgR = read('app/go/[token]/page.tsx')
  const temToken = (src) => /metadata: \{[\s\S]{0,600}?token: row\.token/.test(src)
  ok(temToken(goR), '(I1) gpt_landing_clicked carrega o token do handoff')
  ok(temToken(pgR), '(I2) gpt_landing_viewed carrega o token do handoff')
}

// ═══ (J) O SCHEMA DA AÇÃO — public/gpt/openapi.json ═══════════════════════
// É a SEGUNDA fonte de instruções que o modelo obedece (a primeira é docs/
// GPT-KINEO-VIDEO-MAKER.md). Em 06/09 o schema dizia maxLength 6000 para um
// servidor que recusa em 5001, `seconds` integer para um servidor que devolve
// 24.2, prometia "first film is free" sem condição para um 90s que custa 38cr
// contra 25 de trial, e não documentava fitMessage/overStudioLimit/503.
// Nada aqui é digitado: todo número vem de lib/gptHandoff.ts, do route.ts e
// de lib/credits/engineCost.ts por regex. Mudou a constante, o teste quebra
// até o schema acompanhar.
console.log('\n(J) public/gpt/openapi.json amarrado ao servidor')
{
  const OPENAPI = 'public/gpt/openapi.json'
  let schema = null
  try {
    schema = JSON.parse(read(OPENAPI))
    ok(true, '(J0) openapi.json é JSON parseável')
  } catch (e) {
    ok(false, `(J0) openapi.json NÃO parseia: ${e && e.message}`)
  }
  if (schema) {
    // ── constantes lidas dos arquivos reais
    const num = (src, name) => {
      const m = src.match(new RegExp(`export const ${name} = (\\d+)`))
      return m ? Number(m[1]) : NaN
    }
    const list = (name) => {
      const m = lib.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const`))
      return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : null
    }
    const SCRIPT_MAX = num(lib, 'SCRIPT_MAX_CHARS')
    const STUDIO_MAX = num(lib, 'STUDIO_PROMPT_MAX_CHARS')
    const TOPIC_MAX = num(lib, 'TOPIC_MAX_CHARS')
    const TTL_DAYS = num(lib, 'HANDOFF_TTL_DAYS')
    const DUR = (list('DURATIONS') || []).map(Number)
    // O enquadramento vem de lib/aspect.ts (a lib do handoff só reexporta).
    const ASP = ASPECT_LIST
    const ENG = list('HANDOFF_ENGINES') || []
    const LANG_SRC = (lib.match(/export const LANGUAGE_PATTERN = \/(.+)\/\s*$/m) || [])[1]
    const engineCost = read('lib/credits/engineCost.ts')
    const costOf = (quality) => {
      const m = engineCost.match(new RegExp(`case '${quality}':[\\s\\S]*?return (\\d+)`))
      return m ? Number(m[1]) : NaN
    }
    const SEEDANCE_60 = costOf('cinematic_ai')
    const HOLLYWOOD_60 = costOf('cinematic_hollywood')
    const REF_SEC = num(engineCost, 'DURATION_REFERENCE_SECONDS')
    const TRIAL_CAP = num(read('lib/reverseTrial.ts'), 'TRIAL_CREDIT_CAP')
    ok(
      [SCRIPT_MAX, STUDIO_MAX, TOPIC_MAX, TTL_DAYS, SEEDANCE_60, HOLLYWOOD_60, REF_SEC, TRIAL_CAP].every(Number.isFinite) && DUR.length >= 3 && ASP.length >= 3 && ENG.length >= 7 && Boolean(LANG_SRC),
      `(J0) constantes lidas dos arquivos: SCRIPT_MAX=${SCRIPT_MAX} STUDIO_MAX=${STUDIO_MAX} TOPIC_MAX=${TOPIC_MAX} TTL=${TTL_DAYS}d DUR=[${DUR}] ASP=[${ASP}] ENG=${ENG.length} seedance@60=${SEEDANCE_60} hollywood@60=${HOLLYWOOD_60} trial=${TRIAL_CAP}`,
    )

    const op = schema.paths?.['/api/gpt/handoff']?.post
    const req = schema.components?.schemas?.HandoffRequest?.properties ?? {}
    const resSchema = schema.components?.schemas?.HandoffResponse ?? {}
    const res = resSchema.properties ?? {}
    const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x) => b.includes(x))
    const strings = []
    ;(function walk(v) {
      if (typeof v === 'string') strings.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    })(schema)

    // (J1) o teto do script é o do cobrador.
    ok(req.script?.maxLength === SCRIPT_MAX, `(J1) script.maxLength = ${req.script?.maxLength} === SCRIPT_MAX_CHARS da lib (${SCRIPT_MAX})`)

    // (J2) nenhum texto do schema ensina um teto de caracteres diferente.
    const charMentions = []
    for (const s of strings) {
      for (const m of s.matchAll(/(\d[\d,]{3,5})\s*(?:characters?|chars)\b/gi)) charMentions.push(Number(m[1].replace(/,/g, '')))
      for (const m of s.matchAll(/\b(?:characters?|chars)\b[^.;]{0,60}?(\d[\d,]{3,5})\b/gi)) charMentions.push(Number(m[1].replace(/,/g, '')))
    }
    const distinct = [...new Set(charMentions)]
    ok(charMentions.length >= 2 && distinct.every((n) => n === SCRIPT_MAX), `(J2) todo teto de caracteres citado nas descrições (${distinct.join(', ') || 'nenhum'}) === SCRIPT_MAX_CHARS (${charMentions.length} menções)`)
    ok(/\d[\d,]{3,5}/.test(res.studioLimitChars?.description ?? '') && Number((res.studioLimitChars.description.match(/(\d[\d,]{3,5})/) || [])[1]?.replace(/,/g, '')) === STUDIO_MAX, `(J2) studioLimitChars cita ${STUDIO_MAX} (STUDIO_PROMPT_MAX_CHARS)`)

    // (J3) listas fechadas = as da lib, no pedido E na resposta.
    ok(sameSet(req.durationSec?.enum, DUR), `(J3) durationSec.enum [${req.durationSec?.enum}] === DURATIONS [${DUR}]`)
    ok(sameSet(req.aspect?.enum, ASP), `(J3) aspect.enum [${req.aspect?.enum}] === ASPECTS [${ASP}]`)
    ok(sameSet(req.engineHint?.enum, ENG), `(J3) engineHint.enum [${req.engineHint?.enum}] === HANDOFF_ENGINES [${ENG}]`)
    ok(sameSet(res.durationSec?.enum, DUR) && sameSet(res.aspect?.enum, ASP) && sameSet(res.engineHint?.enum, ENG), '(J3) os mesmos enums na HandoffResponse')
    ok(req.language?.pattern === LANG_SRC, `(J3) language.pattern "${req.language?.pattern}" === LANGUAGE_PATTERN da lib /${LANG_SRC}/`)

    // (J4) tópico.
    ok(req.topic?.maxLength === TOPIC_MAX, `(J4) topic.maxLength = ${req.topic?.maxLength} === TOPIC_MAX_CHARS (${TOPIC_MAX})`)

    // (J5) tudo que a resposta REAL devolve está documentado. A lista é a
    // resposta literal de produção de 06/09 (curl HTTP 200), e o bloco
    // `return json({...})` do route.ts tem de bater com ela também.
    const GROUND_TRUTH = ['url', 'token', 'expiresAt', 'words', 'seconds', 'fit', 'fitMessage', 'durationSec', 'engineHint', 'aspect', 'language', 'overStudioLimit', 'studioLimitChars']
    for (const k of GROUND_TRUTH) ok(Boolean(res[k]?.type), `(J5) resposta real devolve \`${k}\` → documentado em HandoffResponse.properties`)
    // O bloco de SUCESSO é o último `return json({` antes do catch — o que
    // carrega `url:`. É o único MULTI-LINHA; os `return json({ error … }, NNN)`
    // (400/429/503, inclusive o do catch) cabem numa linha e ficam fora.
    const successStart = postRoute.lastIndexOf('return json({\n')
    const successBlock = successStart >= 0 ? postRoute.slice(successStart, postRoute.indexOf('})', successStart)) : ''
    const routeKeys = [...successBlock.matchAll(/^\s*([A-Za-z]+)\s*[,:]/gm)].map((m) => m[1])
    ok(/^\s*url: /m.test(successBlock), '(J5) o bloco de sucesso lido do route.ts é o que devolve `url`')
    ok(routeKeys.length >= 13 && sameSet(routeKeys, GROUND_TRUTH), `(J5) o \`return json({...})\` do route.ts devolve exatamente esses ${routeKeys.length} campos (${routeKeys.join(', ')})`)
    ok(sameSet(Object.keys(res), GROUND_TRUTH), '(J5) HandoffResponse.properties não documenta campo que o servidor não devolve')
    ok(sameSet(resSchema.required, GROUND_TRUTH), '(J5) HandoffResponse.required = todos os campos (o servidor sempre devolve todos)')

    // (J6) seconds é decimal.
    ok(res.seconds?.type === 'number', `(J6) seconds.type = "${res.seconds?.type}" (servidor devolve 24.2, não integer)`)
    ok(/decimal/i.test(res.seconds?.description ?? ''), '(J6) a descrição de seconds avisa que pode ter casa decimal')
    ok(typeof res.fitMessage?.description === 'string' && /verbatim/i.test(res.fitMessage.description), '(J6) fitMessage: instrução de usar a frase VERBATIM')
    ok(/fitMessage/.test(op?.responses?.['200']?.description ?? '') && /verbatim/i.test(op?.responses?.['200']?.description ?? ''), '(J6) a descrição do 200 manda citar fitMessage verbatim')
    ok(res.overStudioLimit?.type === 'boolean' && res.studioLimitChars?.type === 'integer' && /overStudioLimit/.test(op?.responses?.['200']?.description ?? ''), '(J6) overStudioLimit boolean + studioLimitChars integer, e o 200 manda avisar')

    // (J7) todo status que o route.ts devolve tem entrada em responses — e só eles.
    const routeStatuses = [...new Set([200, ...[...postRoute.matchAll(/return json\([^\n]*?, (\d{3})\)/g)].map((m) => Number(m[1]))])].sort()
    const schemaStatuses = Object.keys(op?.responses ?? {}).map(Number).sort()
    ok(routeStatuses.includes(400) && routeStatuses.includes(429) && routeStatuses.includes(503), `(J7) route.ts devolve ${routeStatuses.join('/')}`)
    for (const s of routeStatuses) ok(Boolean(op?.responses?.[String(s)]?.description), `(J7) status ${s} do servidor está em responses`)
    ok(sameSet(schemaStatuses, routeStatuses), `(J7) responses [${schemaStatuses}] === status do servidor [${routeStatuses}] (nem a mais, nem a menos)`)
    const d503 = op?.responses?.['503']?.description ?? ''
    ok(/try again in a minute/i.test(d503) && /never fabricate a link|never invent a link|do not invent a link/i.test(d503), '(J7) 503: "tente de novo em um minuto" + nunca fabricar link')
    const d429 = op?.responses?.['429']?.description ?? ''
    ok(/Too many requests right now, try again in a minute/.test(d429) && /do not invent a link|never fabricate a link/i.test(d429), '(J7) 429: frase fixa + nunca inventar link')
    for (const s of [400, 429, 503]) ok(op?.responses?.[String(s)]?.content?.['application/json']?.schema?.$ref === '#/components/schemas/ErrorResponse', `(J7) ${s} → ErrorResponse`)

    // (J8) A REGRA DO GRÁTIS, derivada do custo real: o trial de TRIAL_CAP
    // créditos paga um Seedance de d segundos sse ceil(base·d/60) <= cap.
    // Toda FRASE do schema que prometa filme grátis tem de citar cada duração
    // que NÃO cabe (hoje só o 90) — a promessa incondicional é proibida.
    const seedanceCost = (d) => Math.max(1, Math.ceil(SEEDANCE_60 * (d / REF_SEC)))
    const freeDur = DUR.filter((d) => seedanceCost(d) <= TRIAL_CAP)
    const paidDur = DUR.filter((d) => seedanceCost(d) > TRIAL_CAP)
    ok(freeDur.length >= 1 && paidDur.length >= 1, `(J8) pelo custo real, cabem no trial: [${freeDur}] (${freeDur.map(seedanceCost)}cr) · não cabem: [${paidDur}] (${paidDur.map(seedanceCost)}cr vs ${TRIAL_CAP})`)
    const CLAIM = /\bfilm\s+(?:is\s+)?free\b|\bfree\s+film\b|\bfirst\s+film\s+is\s+free\b/i
    const sentences = strings.flatMap((s) => s.split(/(?<=[.!?])\s+/))
    const claims = sentences.filter((s) => CLAIM.test(s))
    // "90" ou "90s" — o `s` cola no dígito, então \b sozinho não casa "90s".
    const mentions = (s, d) => new RegExp(`\\b${d}s?\\b`).test(s)
    // Proibição ("Never claim a free film for 90s…") não é promessa: entra na
    // trava do 90 (qualquer frase de grátis cita o que NÃO cabe), mas não é
    // cobrada a citar 35 e 60.
    const affirmative = claims.filter((s) => !/\bnever\b/i.test(s))
    const unconditional = claims.filter((s) => !paidDur.every((d) => mentions(s, d)))
    ok(affirmative.length >= 1, `(J8) o schema ainda conta a história do grátis (${affirmative.length} promessas, ${claims.length - affirmative.length} proibições)`)
    ok(unconditional.length === 0, unconditional.length ? `(J8) PROMESSA INCONDICIONAL de filme grátis sem citar ${paidDur.join('/')}: "${unconditional[0].slice(0, 110)}…"` : `(J8) toda frase de "film is free" cita a duração que NÃO cabe (${paidDur.join('/')})`)
    ok(affirmative.every((s) => freeDur.every((d) => mentions(s, d))), `(J8) toda promessa de "film is free" cita as durações que cabem (${freeDur.join(' e ')})`)
    ok(!/first film is free \(25-credit trial, no card\)\.\s*Never invent/.test(op?.description ?? ''), '(J8) a redação antiga incondicional da operação não voltou')
    const trialMentions = strings.flatMap((s) => [...s.matchAll(/(\d+)-credit trial/g)].map((m) => Number(m[1])))
    ok(trialMentions.length >= 1 && trialMentions.every((n) => n === TRIAL_CAP), `(J8) todo "N-credit trial" do schema (${[...new Set(trialMentions)]}) === TRIAL_CREDIT_CAP (${TRIAL_CAP})`)
    const hwMentions = strings.flatMap((s) => [...s.matchAll(/(\d+) credits at 60s/g)].map((m) => Number(m[1])))
    ok(hwMentions.length >= 1 && hwMentions.every((n) => n === HOLLYWOOD_60), `(J8) custo do Kling 3 citado (${[...new Set(hwMentions)]}) === engineCost cinematic_hollywood (${HOLLYWOOD_60})`)
    const dayMentions = strings.flatMap((s) => [...s.matchAll(/(\d+) days/g)].map((m) => Number(m[1])))
    ok(dayMentions.length >= 2 && dayMentions.every((n) => n === TTL_DAYS), `(J8) todo "N days" do schema (${[...new Set(dayMentions)]}) === HANDOFF_TTL_DAYS (${TTL_DAYS})`)

    // (J9) forma que o importador de Actions exige.
    ok(schema.openapi === '3.1.0', `(J9) openapi ${schema.openapi}`)
    ok(Array.isArray(schema.servers) && schema.servers.length === 1 && schema.servers[0].url === 'https://www.usekineo.com', '(J9) servers[0].url === https://www.usekineo.com')
    const opIds = Object.values(schema.paths ?? {}).flatMap((p) => Object.values(p)).map((o) => o && o.operationId).filter(Boolean)
    ok(opIds.length === 1 && opIds[0] === 'createKineoHandoff', `(J9) exatamente 1 operação com operationId (${opIds.join(', ')})`)
    ok(!schema.components?.securitySchemes && !schema.security && !op?.security, '(J9) sem autenticação (a ação é pública)')
    const refs = strings.filter((s, i) => s.startsWith('#/') || /^https?:\/\/.*\.json/.test(s))
    ok(refs.every((r) => r.startsWith('#/components/schemas/')), '(J9) todo $ref é interno (#/components/schemas/...)')
    ok(typeof schema.info?.description === 'string' && schema.info.description.length <= 600, `(J9) info.description curta (${schema.info?.description?.length} chars)`)
    ok(req.script?.type === 'string' && req.script.minLength === 1 && schema.components.schemas.HandoffRequest.required?.includes('script') && schema.components.schemas.HandoffRequest.additionalProperties === false, '(J9) HandoffRequest: script obrigatório, string, minLength 1, additionalProperties false')
  }
}

// ═══ (K) O DOCUMENTO DO GPT — docs/GPT-KINEO-VIDEO-MAKER.md ═══════════════
// É a PRIMEIRA fonte de instruções do modelo: a seção C é o texto que o
// fundador cola no campo Instructions do editor. Em 06/09 ela repetia as duas
// mentiras do schema (teto 6.000; "first film is free" sem a ressalva do 90s).
// O (J) amarra o schema ao servidor; este bloco amarra o DOCUMENTO ao servidor
// e ao schema. Nada digitado: teto, durações, motores, TTL, trial, custos e
// preços vêm dos arquivos reais por regex. A unidade de cobrança é o
// PARÁGRAFO (linhas contíguas; bullet/numeração/título abre outro), porque a
// condição do grátis pode estar na frase seguinte à promessa.
console.log('\n(K) docs/GPT-KINEO-VIDEO-MAKER.md amarrado ao servidor e ao schema')
{
  const DOC = 'docs/GPT-KINEO-VIDEO-MAKER.md'
  const md = read(DOC)
  // Uma cópia com quebras de linha viradas em espaço: o .md quebra frases a
  // ~80 colunas ("teto de **5.000\n  caracteres**"), e regex por linha perde.
  const flat = md.replace(/\s*\n\s*/g, ' ')
  const num = (src, name) => {
    const m = src.match(new RegExp(`export const ${name}(?:: \\w+)? = (\\d+)`))
    return m ? Number(m[1]) : NaN
  }
  const str =(src, name) => (src.match(new RegExp(`export const ${name}(?:: \\w+)? = '([^']*)'`)) || [])[1]
  const list = (name) => {
    const m = lib.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const`))
    return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : null
  }
  const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x) => b.includes(x))
  const uniq = (a) => [...new Set(a)]
  const SCRIPT_MAX = num(lib, 'SCRIPT_MAX_CHARS')
  const TTL_DAYS = num(lib, 'HANDOFF_TTL_DAYS')
  const DUR = (list('DURATIONS') || []).map(Number)
  const ENG = list('HANDOFF_ENGINES') || []
  const DEF_DUR = num(lib, 'DEFAULT_DURATION')
  const DEF_ENG = str(lib, 'DEFAULT_ENGINE')
  const DEF_ASP = ASPECT_DEFAULT
  const DEF_LANG = str(lib, 'DEFAULT_LANGUAGE')
  const GO_PREFIX = str(lib, 'GO_PATH_PREFIX')
  const labelsSrc = (lib.match(/export const ENGINE_LABELS[^{]*\{([^}]*)\}/) || [])[1] || ''
  const LABELS = Object.fromEntries([...labelsSrc.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]))
  const engineCost = read('lib/credits/engineCost.ts')
  const costOf = (quality) => {
    const m = engineCost.match(new RegExp(`case '${quality}':[\\s\\S]*?return (\\d+)`))
    return m ? Number(m[1]) : NaN
  }
  const REF_SEC = num(engineCost, 'DURATION_REFERENCE_SECONDS')
  const SEEDANCE_60 = costOf('cinematic_ai')
  const seedanceCost = (d) => Math.max(1, Math.ceil(SEEDANCE_60 * (d / REF_SEC)))
  const TRIAL_CAP = num(read('lib/reverseTrial.ts'), 'TRIAL_CREDIT_CAP')
  const freeDur = DUR.filter((d) => seedanceCost(d) <= TRIAL_CAP)
  const paidDur = DUR.filter((d) => seedanceCost(d) > TRIAL_CAP)
  ok(
    [SCRIPT_MAX, TTL_DAYS, DEF_DUR, REF_SEC, SEEDANCE_60, TRIAL_CAP].every(Number.isFinite) && DUR.length >= 3 && ENG.length >= 7 && Object.keys(LABELS).length === ENG.length && Boolean(DEF_ENG && DEF_ASP && DEF_LANG && GO_PREFIX) && freeDur.length >= 1 && paidDur.length >= 1,
    `(K0) constantes lidas: SCRIPT_MAX=${SCRIPT_MAX} TTL=${TTL_DAYS}d DUR=[${DUR}] ENG=[${ENG}] defaults=${DEF_DUR}/${DEF_ENG}/${DEF_ASP}/${DEF_LANG} trial=${TRIAL_CAP} · cabem no trial [${freeDur}] · não cabem [${paidDur}]`,
  )

  // ── seções (ancoradas nos títulos "## X.") e parágrafos
  const section = (letter) => {
    const m = md.match(new RegExp(`^## ${letter}\\. [^\\n]*\\n([\\s\\S]*?)(?=^## [A-Z]\\. |(?![\\s\\S]))`, 'm'))
    return m ? m[1] : ''
  }
  const secB = section('B')
  const secC = section('C')
  const secG = section('G')
  ok(secB.length > 100 && secC.length > 1000 && secG.length > 500, `(K0) seções B (${secB.length}) · C (${secC.length}) · G (${secG.length}) localizadas pelos títulos`)
  const instructions = (secC.match(/```\n([\s\S]*?)\n```/) || [])[1] || ''
  ok(/^You are Short Video Maker by Kineo/.test(instructions) && /set language accordingly\.$/.test(instructions), `(K0) bloco Instructions da seção C isolado (${instructions.length} chars; começa "You are…", termina "…accordingly.")`)
  // Cada parágrafo sai com o OFFSET real da sua primeira linha no texto de
  // origem — é isso que ancora a exceção da seção B na seção B (um blurb
  // copiado para outra seção tem outro offset e é cobrado).
  const paragraphs = (src) => {
    const out = []
    let cur = []
    let curIdx = -1
    let offset = 0
    const flush = () => { if (cur.length) out.push({ p: cur.join(' ').replace(/\s+/g, ' ').trim(), idx: curIdx }); cur = [] }
    for (const line of src.split('\n')) {
      if (!line.trim()) { flush(); offset += line.length + 1; continue }
      if (/^\s*(?:[-*]\s|\d+\.\s|#)/.test(line) || /^```/.test(line)) flush()
      if (!cur.length) curIdx = offset
      cur.push(line)
      offset += line.length + 1
    }
    flush()
    return out.filter((x) => x.p)
  }
  const mentions = (s, d) => new RegExp(`\\b${d}s?\\b`).test(s)

  // (K1) TETO DE CARACTERES. Todo número de 4-6 dígitos perto de "caracter/
  // character/chars" é o teto, e o teto é SCRIPT_MAX_CHARS. "5.000" e "5,000"
  // valem pelo VALOR. Número precedido de ≈/~ é estimativa de tamanho de
  // roteiro, não teto: tem de ficar ABAIXO do teto (uma estimativa acima do
  // teto seria outra contradição).
  const charHits = [...flat.matchAll(/(≈|~)?\s*\*{0,2}(\d[\d.,]{3,6})\*{0,2}\s+(?:caracteres?|characters?|chars)\b/gi)].map((m) => ({ approx: Boolean(m[1]), raw: m[2], value: Number(m[2].replace(/[.,]/g, '')) }))
  const ceilings = charHits.filter((h) => !h.approx)
  const estimates = charHits.filter((h) => h.approx)
  ok(ceilings.length >= 1 && ceilings.every((h) => h.value === SCRIPT_MAX), `(K1) todo teto de caracteres do .md (${uniq(ceilings.map((h) => h.raw)).join(', ') || 'nenhum'}) === SCRIPT_MAX_CHARS (${SCRIPT_MAX})`)
  ok(estimates.every((h) => h.value < SCRIPT_MAX), `(K1) estimativas "≈ N caracteres" (${uniq(estimates.map((h) => h.raw)).join(', ') || 'nenhuma'}) ficam abaixo do teto`)
  ok(/SCRIPT_MAX_CHARS/.test(secG), '(K1) a seção G aponta o nome da constante (SCRIPT_MAX_CHARS), não só o número')

  // (K2) A REGRA DO GRÁTIS. Toda promessa de filme grátis — em inglês ou em
  // português — vive num parágrafo que cita as durações que CABEM no trial
  // (35 e 60) E a que NÃO cabe (90). Exceção NOMEADA: as duas descrições de
  // loja da seção B, blurbs do caminho padrão (60s seedance, que É grátis).
  // Só essas duas frases, só dentro da seção B.
  const CLAIM = /\bfilm\s+(?:is\s+)?free\b|\bfree\s+film\b|\bfirst\s+film\s+is\s+free\b|\bgr[áa]tis\b|\bfilme[^.]{0,30}de gra[çc]a\b/i
  const STORE_BLURBS = ['First film free.', 'Your first film is free: 25 trial credits, no card.']
  const blurbsInB = STORE_BLURBS.filter((b) => secB.includes(b))
  ok(blurbsInB.length === STORE_BLURBS.length, `(K2) as ${STORE_BLURBS.length} frases da exceção existem na seção B, literalmente (${blurbsInB.length} achadas)`)
  ok(STORE_BLURBS.every((b) => !secC.includes(b) && !secG.includes(b)), '(K2) a exceção não vaza: os blurbs da seção B não aparecem em C nem em G')
  const secBStart = md.indexOf('## B. ')
  const secBEnd = md.indexOf('## C. ')
  const isStoreBlurb = (p, idx) => idx >= secBStart && idx < secBEnd && STORE_BLURBS.some((b) => p.includes(b))
  const claimParas = paragraphs(md).filter(({ p }) => CLAIM.test(p))
  const excepted = claimParas.filter(({ p, idx }) => isStoreBlurb(p, idx))
  const cobrados = claimParas.filter(({ p, idx }) => !isStoreBlurb(p, idx))
  ok(claimParas.length >= 5 && excepted.length === STORE_BLURBS.length, `(K2) ${claimParas.length} parágrafos prometem filme grátis; ${excepted.length} são os blurbs da seção B; ${cobrados.length} cobrados`)
  const semPaid = cobrados.filter(({ p }) => !paidDur.every((d) => mentions(p, d)))
  ok(semPaid.length === 0, semPaid.length ? `(K2) PROMESSA de grátis sem citar a duração que NÃO cabe (${paidDur}): "${semPaid[0].p.slice(0, 120)}…"` : `(K2) todo parágrafo cobrado cita a exceção (${paidDur.join('/')})`)
  const semFree = cobrados.filter(({ p }) => !freeDur.every((d) => mentions(p, d)))
  ok(semFree.length === 0, semFree.length ? `(K2) PROMESSA de grátis sem citar a condição (${freeDur.join(' e ')}): "${semFree[0].p.slice(0, 120)}…"` : `(K2) todo parágrafo cobrado cita a condição (${freeDur.join(' e ')})`)
  ok(cobrados.some(({ idx }) => idx >= md.indexOf('## C. ') && idx < md.indexOf('## D. ')) && cobrados.some(({ idx }) => idx >= md.indexOf('## G. ')), '(K2) há promessa cobrada (e aprovada) na seção C e na seção G')

  // (K3) AS TRÊS FONTES CONCORDAM. A regra existe na seção C (a frase que o
  // modelo lê como instrução), na seção G (o registro para o fundador) e na
  // description do 200 do openapi.json (o que o modelo lê a cada chamada).
  const cLine = instructions.split('\n').find((l) => /first film is free/i.test(l) && /say this only for/i.test(l)) || ''
  ok(Boolean(cLine) && freeDur.every((d) => mentions(cLine, d)) && paidDur.every((d) => mentions(cLine, d)), `(K3) seção C: a linha "first film is free… say this only for ${freeDur.join('s and ')}s" existe e cita ${paidDur.join('/')} como exceção`)
  const gPara = (paragraphs(secG).find(({ p }) => /first film is free/i.test(p)) || {}).p || ''
  ok(Boolean(gPara) && freeDur.every((d) => mentions(gPara, d)) && paidDur.every((d) => mentions(gPara, d)) && /openapi\.json/.test(gPara) && /seção C/.test(gPara), '(K3) seção G: o parágrafo do grátis cita 35/60/90 e aponta para a seção C e para o openapi.json')
  let schema200 = ''
  try { schema200 = JSON.parse(read('public/gpt/openapi.json')).paths['/api/gpt/handoff'].post.responses['200'].description } catch {}
  ok(/first film is free/i.test(schema200) && freeDur.every((d) => mentions(schema200, d)) && paidDur.every((d) => mentions(schema200, d)), '(K3) openapi.json: a description do 200 conta a mesma história (grátis só em 35/60; 90 é exceção)')
  const trialPhrase = (s) => (s.match(/(\d+)-credit trial, no card/) || [])[1]
  ok(trialPhrase(cLine) && trialPhrase(schema200) && trialPhrase(cLine) === trialPhrase(schema200), `(K3) C e o 200 usam a mesma frase "N-credit trial, no card" (N=${trialPhrase(cLine)})`)

  // (K4) MOTORES E DURAÇÕES. A lista "Engine choice" da seção C envia
  // exatamente os ids de HANDOFF_ENGINES, com os nomes públicos de
  // ENGINE_LABELS; as duas linhas de orçamento dividem os ids nas duas
  // famílias da lib; as opções de duração são DURATIONS.
  const engineBlock = (instructions.match(/Engine choice[\s\S]*?Never send any other value\./) || [])[0] || ''
  const engPairs = [...engineBlock.matchAll(/"([a-z0-9]+)" \(([^)]+)\)/g)].map((m) => [m[1], m[2]])
  ok(engineBlock.length > 100 && sameSet(engPairs.map((p) => p[0]), ENG), `(K4) "Engine choice" da seção C envia [${engPairs.map((p) => p[0])}] === HANDOFF_ENGINES [${ENG}]`)
  ok(engPairs.length === ENG.length && engPairs.every(([id, label]) => LABELS[id] === label), `(K4) cada id vem com o nome público de ENGINE_LABELS (${engPairs.map(([i, l]) => `${i}=${l}`).join(', ')})`)
  ok(/Never send any other value\./.test(engineBlock) && /\(the default\)|the default for everything/.test(engineBlock.split('\n').find((l) => l.includes(`"${DEF_ENG}"`)) || ''), `(K4) "${DEF_ENG}" é o padrão da lista e a lista é fechada`)
  const stdIds = [...((instructions.match(/Standard engines[^\n]*/) || [''])[0].matchAll(/"([a-z0-9]+)"/g))].map((m) => m[1])
  const premIds = [...((instructions.match(/Premium engines[^\n]*/) || [''])[0].matchAll(/"([a-z0-9]+)"/g))].map((m) => m[1])
  ok(sameSet([...stdIds, ...premIds], ENG) && stdIds.length && premIds.length, `(K4) orçamento de palavras cobre todos os motores: standard [${stdIds}] + premium [${premIds}]`)
  if (L) {
    ok(stdIds.every((e) => L.wordsPerSecondFor(e) === L.WORDS_PER_SECOND_CLASSIC) && premIds.every((e) => L.wordsPerSecondFor(e) === L.WORDS_PER_SECOND_HOLLYWOOD), '(K4) a divisão standard/premium do .md é a divisão clássico/hollywood da lib (wordsPerSecondFor)')
    // As faixas de palavras, EXECUTADAS contra o estimador: o piso da faixa
    // não pode dar fit=short (ficar abaixo é defeito) e o teto não pode dar
    // fit=long. Uma faixa que o servidor chamaria de "curta" é mentira.
    const mk = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
    const rows = (header) => {
      const block = (instructions.match(new RegExp(`${header}[^\\n]*\\n([\\s\\S]*?)\\n\\n`)) || [])[1] || ''
      return [...block.matchAll(/^- (\d+)s: (\d+)-(\d+) words/gm)].map((m) => ({ d: Number(m[1]), lo: Number(m[2]), hi: Number(m[3]) }))
    }
    for (const [header, ids] of [['Standard engines', stdIds], ['Premium engines', premIds]]) {
      const r = rows(header)
      ok(sameSet(r.map((x) => x.d), DUR), `(K4) ${header}: linhas de orçamento para [${r.map((x) => x.d)}] === DURATIONS`)
      const bad = r.flatMap((x) => ids.flatMap((e) => {
        const lo = L.estimateHandoff(mk(x.lo), x.d, e).fit
        const hi = L.estimateHandoff(mk(x.hi), x.d, e).fit
        return lo === 'short' || hi === 'long' ? [`${e}@${x.d}s ${x.lo}-${x.hi} → ${lo}/${hi}`] : []
      }))
      ok(r.length === DUR.length && bad.length === 0, bad.length ? `(K4) faixa de palavras que o servidor reprovaria: ${bad.join('; ')}` : `(K4) ${header}: piso nunca dá "short", teto nunca dá "long" (estimateHandoff real)`)
    }
  }
  const step1 = (instructions.match(/Duration: [^\n]*/) || [''])[0]
  const step1Durs = [...step1.matchAll(/(\d+)s \(/g)].map((m) => Number(m[1]))
  ok(sameSet(step1Durs, DUR) && new RegExp(`Default ${DEF_DUR}\\.`).test(step1), `(K4) Step 1 oferece [${step1Durs}] === DURATIONS, padrão ${DEF_DUR}`)
  const step5Durs = ((instructions.match(/durationSec: ([\d, or]+),/) || [''])[1].match(/\d+/g) || []).map(Number)
  ok(sameSet(step5Durs, DUR), `(K4) Step 5 "durationSec: ${step5Durs.join(', ')}" === DURATIONS`)
  const longDesc = (secB.match(/write a ([\d, or]+)-second short/) || [''])[1].match(/\d+/g) || []
  ok(sameSet(longDesc.map(Number), DUR), `(K4) descrição longa da loja oferece [${longDesc}] === DURATIONS`)
  const starterDurs = [...(section('D').matchAll(/\b(\d+)s\b/g))].map((m) => Number(m[1]))
  ok(starterDurs.length >= 1 && starterDurs.every((d) => DUR.includes(d)), `(K4) conversation starters pedem só durações válidas (${uniq(starterDurs)})`)
  ok(new RegExp(`aspect: "${DEF_ASP}" unless`).test(instructions) && new RegExp(`\\("${DEF_LANG}" by default\\)`).test(instructions), `(K4) padrões de aspect (${DEF_ASP}) e language (${DEF_LANG}) são os da lib`)

  // (K5) TTL. Todo "N days"/"N dias" que a pessoa LÊ é HANDOFF_TTL_DAYS.
  //
  // A varredura é sobre `instructions` (o bloco literal que o GPT recebe) e
  // `secG` (o registro), NÃO sobre o documento inteiro: o resto do .md é a
  // nossa argumentação interna, onde "362 cadastros de 14 dias" é uma JANELA
  // DE MEDIÇÃO e não uma promessa de validade. Varrendo `flat`, essa frase
  // reprovava o guardião — vermelho que não era defeito de produto (o
  // documento diz 7 nos dois lugares que importam). O guardião passa a medir
  // a condição que ele nomeia: o que é dito a quem clica.
  const dayHits = [...`${instructions}\n${secG}`.matchAll(/\*{0,2}(\d+)\*{0,2}[\s-]+(?:days?|dias?)\b/gi)].map((m) => Number(m[1]))
  ok(dayHits.length >= 2 && dayHits.every((n) => n === TTL_DAYS), `(K5) todo "N days/dias" do .md (${uniq(dayHits)}) === HANDOFF_TTL_DAYS (${TTL_DAYS}) — ${dayHits.length} menções`)
  ok(new RegExp(`valid for ${TTL_DAYS} days`).test(instructions) && new RegExp(`expira em \\*\\*${TTL_DAYS} dias\\*\\*`).test(secG), `(K5) a validade aparece na instrução (C) e no registro (G) com o mesmo número`)

  // (K6) PREÇOS. Cada "Plano $N" do .md === TIER_PRICES/AUTOPILOT_PRICES de
  // lib/checkoutPricing.ts (em centavos), com o nome público lido de
  // lib/pricing.ts (tier → name), nunca digitado aqui.
  const checkout = read('lib/checkoutPricing.ts')
  const pricingLib = read('lib/pricing.ts')
  const tierBlock = (checkout.match(/export const TIER_PRICES[^=]*= \{([\s\S]*?)\n\}/) || [])[1] || ''
  const minor = Object.fromEntries([...tierBlock.matchAll(/(\w+): \{ usd: (\d+) \}/g)].map((m) => [m[1], Number(m[2])]))
  minor.autopilot = Number((checkout.match(/export const AUTOPILOT_PRICES[^=]*= \{\s*usd: (\d+)/) || [])[1])
  const nameOf = Object.fromEntries([...pricingLib.matchAll(/(\w+): \{\s*tier: '\1',\s*name: '([^']+)'/g)].map((m) => [m[1], m[2]]))
  const tiers = Object.keys(minor)
  ok(tiers.length === 4 && tiers.every((t) => Number.isFinite(minor[t]) && nameOf[t]), `(K6) lib lida: ${tiers.map((t) => `${t}=${nameOf[t]} ${minor[t]}¢`).join(' · ')}`)
  const priceHits = [...flat.matchAll(/\b(Starter|Creator|Studio|Autopilot)\s+\$(\d+(?:\.\d+)?)/g)].map((m) => ({ name: m[1], usd: Number(m[2]) }))
  const expectedUsd = Object.fromEntries(tiers.map((t) => [nameOf[t], minor[t] / 100]))
  const wrong = priceHits.filter((h) => h.usd !== expectedUsd[h.name])
  ok(priceHits.length >= 8 && wrong.length === 0, wrong.length ? `(K6) PREÇO DIVERGENTE no .md: ${wrong.map((h) => `${h.name} $${h.usd} (lib: $${expectedUsd[h.name]})`).join(', ')}` : `(K6) ${priceHits.length} preços citados no .md batem com a lib (${Object.entries(expectedUsd).map(([n, v]) => `${n} $${v}`).join(' · ')})`)
  ok(Object.keys(expectedUsd).every((n) => priceHits.some((h) => h.name === n)), '(K6) os 4 planos aparecem no .md')
  const pricingLine = instructions.split('\n').find((l) => /^- Starter \$/.test(l)) || ''
  ok(Object.entries(expectedUsd).every(([n, v]) => pricingLine.includes(`${n} $${v}/month`)), `(K6) a linha de preços do Step "Pricing and plans" traz os 4 com "/month": "${pricingLine.slice(0, 90)}"`)

  // (K7) TRIAL. Todo "25" citado como crédito de trial === TRIAL_CREDIT_CAP.
  const trialHits = [...flat.matchAll(/(\d+)-credit trial|(\d+) trial credits|trial de (\d+) cr[ée]ditos|Free trial: (\d+) credits|trial of (\d+) credits/gi)].map((m) => Number(m.slice(1).find(Boolean)))
  ok(trialHits.length >= 5 && trialHits.every((n) => n === TRIAL_CAP), `(K7) todo crédito de trial citado no .md (${uniq(trialHits)}) === TRIAL_CREDIT_CAP (${TRIAL_CAP}) — ${trialHits.length} menções`)
  ok(new RegExp(`Free trial: ${TRIAL_CAP} credits, no card required\\. Enough for one ${REF_SEC}-second`).test(instructions), `(K7) o Step "Pricing" diz o trial certo e o que ele compra (um filme de ${REF_SEC}s)`)

  // (K8) CUSTOS. Os créditos por motor a 60s (cabeçalho "Fatos conferidos")
  // e os custos do Seedance por duração (15/25/38 em G) vêm de engineCost.ts.
  const QUALITY_OF = { Seedance: 'cinematic_ai', 'MiniMax H3': 'cinematic_h3', 'Kling 2.5': 'cinematic_kling', Veo: 'cinematic_veo', 'Kling 3': 'cinematic_hollywood', Omni: 'cinematic_omni' }
  const costPara = (flat.match(/Custos de referência a 60s[^—]*?\. O trial/) || [''])[0]
  const costHits = [...costPara.matchAll(/(Seedance|MiniMax H3|Kling 2\.5|Veo|Kling 3|Omni) (\d+)/g)].map((m) => ({ label: m[1], cr: Number(m[2]) }))
  const costWrong = costHits.filter((h) => costOf(QUALITY_OF[h.label]) !== h.cr)
  ok(costHits.length === Object.keys(QUALITY_OF).length && costWrong.length === 0, costWrong.length ? `(K8) CUSTO DIVERGENTE: ${costWrong.map((h) => `${h.label} ${h.cr} (lib ${costOf(QUALITY_OF[h.label])})`).join(', ')}` : `(K8) os ${costHits.length} custos a 60s do .md batem com engineCost.ts`)
  const perDur = [...flat.matchAll(/(\d+)cr a (\d+)s/g)].map((m) => ({ cr: Number(m[1]), d: Number(m[2]) }))
  const perDurWrong = perDur.filter((h) => seedanceCost(h.d) !== h.cr)
  ok(perDur.length >= 2 && perDurWrong.length === 0, perDurWrong.length ? `(K8) custo do Seedance por duração errado: ${perDurWrong.map((h) => `${h.d}s=${h.cr} (real ${seedanceCost(h.d)})`).join(', ')}` : `(K8) "${perDur.map((h) => `${h.cr}cr a ${h.d}s`).join(', ')}" === creditCostForDuration real`)
  const ninetyHits = [...flat.matchAll(/(\d+)s custa (\d+)cr/g)].map((m) => ({ d: Number(m[1]), cr: Number(m[2]) }))
  ok(ninetyHits.length >= 1 && ninetyHits.every((h) => seedanceCost(h.d) === h.cr && h.cr > TRIAL_CAP), `(K8) "${ninetyHits.map((h) => `${h.d}s custa ${h.cr}cr`).join(', ')}" bate com o custo real e estoura o trial (${TRIAL_CAP})`)
  const premCr = [...flat.matchAll(/`hollywood`\/`omni` \((\d+)cr\)/g)].map((m) => Number(m[1]))
  ok(premCr.length >= 1 && premCr.every((n) => n === costOf('cinematic_hollywood') && n === costOf('cinematic_omni')), `(K8) "hollywood/omni (${uniq(premCr)}cr)" === engineCost de hollywood e omni`)

  // (K9) O QUE O DOCUMENTO PROMETE SOBRE O CONTRATO EXISTE NO CONTRATO.
  let schema = null
  try { schema = JSON.parse(read('public/gpt/openapi.json')) } catch {}
  const op = schema?.paths?.['/api/gpt/handoff']?.post
  ok(Boolean(op) && op.operationId === 'createKineoHandoff' && (instructions.match(/createKineoHandoff/g) || []).length >= 2, '(K9) operationId createKineoHandoff é o que as instruções mandam chamar')
  ok(schema?.servers?.[0]?.url && md.includes(`${schema.servers[0].url}/gpt/openapi.json`) && fs.existsSync(path.join(ROOT, 'public/gpt/openapi.json')), `(K9) a URL de import (${schema?.servers?.[0]?.url}/gpt/openapi.json) é o servers[0].url + o arquivo que existe em public/`)
  const fixed429 = 'Too many requests right now, try again in a minute'
  ok(instructions.includes(`429: say "${fixed429}."`) && (op?.responses?.['429']?.description ?? '').includes(fixed429) && secG.replace(/\s*\n\s*/g, ' ').includes(fixed429),'(K9) a frase fixa do 429 é idêntica em C, em G e no schema')
  const fallback = 'https://www.usekineo.com/studio'
  ok((instructions.match(new RegExp(fallback.replace(/[./]/g, '\\$&'), 'g')) || []).length >= 2 && (op?.responses?.['503']?.description ?? '').includes(fallback) && (op?.responses?.['400']?.description ?? '').length > 0, '(K9) o fallback "cole no /studio" é o mesmo em C e no 503 do schema')
  ok(md.includes(`${schema?.servers?.[0]?.url}${GO_PREFIX}`) && instructions.includes('<the url from the response, verbatim>'), `(K9) o link esperado começa com ${GO_PREFIX} (GO_PATH_PREFIX) e a instrução manda mostrar a url verbatim`)
  ok(instructions.split('\n').filter((l) => /^- (400|429|Any other error):/.test(l)).length === 3 && sameSet(Object.keys(op?.responses ?? {}).filter((s) => s !== '200'), ['400', '429', '503']), '(K9) as instruções tratam 400, 429 e "qualquer outro" — e o schema só tem 400/429/503 além do 200')
}

// ═══ (L) O ENQUADRAMENTO — uma fonte, cinco portadores ═══════════════════
// O defeito de 06/09: a ação aceitava, gravava e DEVOLVIA `aspect`, e
// buildStudioDestination() não o punha na URL — 100% dos handoffs saíam 9:16.
// E a lista do handoff, digitada à mão, tinha perdido o 4:5 de lib/aspect.ts.
// Regra da casa ("a regra vive em vários arquivos"): consertar um portador e
// deixar o outro é meia-verdade. Os portadores: a lib (reexporta), a URL do
// clique (emite), o schema (dois enums + três descriptions), as instruções do
// GPT (pergunta/infere), a migration (comentário) e a página /go (mostra).
// NENHUM formato é digitado aqui: ASPECT_LIST/ASPECT_DEFAULT vêm de
// lib/aspect.ts, e o mutante que tira um formato de qualquer portador reprova.
console.log('\n(L) enquadramento: lib/aspect.ts é a fonte; nenhum formato digitado aqui')
{
  const sameSet = sameSetTop
  // ── (L1) a lib do handoff não tem cópia própria.
  ok(!/ASPECTS\s*=\s*\[/.test(lib) && !/DEFAULT_ASPECT\s*(?::\s*\w+)?\s*=\s*'/.test(lib), '(L1) lib/gptHandoff.ts NÃO digita ASPECTS nem DEFAULT_ASPECT')
  ok(/^import \{[^}]*\bASPECTS\b[^}]*\bDEFAULT_ASPECT\b[^}]*\bnormalizeAspect\b[^}]*\} from '@\/lib\/aspect'/m.test(lib) && /^export \{[^}]*\bASPECTS\b[^}]*\bDEFAULT_ASPECT\b[^}]*\bnormalizeAspect\b[^}]*\}/m.test(lib), '(L1) importa ASPECTS/DEFAULT_ASPECT/normalizeAspect de @/lib/aspect e reexporta os nomes antigos (quem importava daqui continua funcionando)')
  const libCode = lib.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  ok(ASPECT_LIST.every((a) => !libCode.includes(`'${a}'`)), `(L1) nenhum dos ${ASPECT_LIST.length} formatos aparece como literal no CÓDIGO da lib (só em comentário) — uma cópia digitada reprova aqui`)
  // ── (L2) a emissão condicional, no texto, amarrada ao padrão da fonte.
  ok(/const aspect = normalizeAspect\(row\.aspect\)\s*\n\s*if \(aspect !== DEFAULT_ASPECT\) q\.set\('aspect', aspect\)/.test(lib), "(L2) buildStudioDestination: `if (aspect !== DEFAULT_ASPECT) q.set('aspect', aspect)` — emite só fora do padrão")
  ok(/aspect: string\s*\n\s*\}\): string \{/.test(lib), '(L2) a assinatura de buildStudioDestination exige `aspect` na linha (a rota do clique passa a linha inteira)')
  // O Studio LÊ o parâmetro — a capacidade existe do outro lado (só leitura
  // do arquivo; o GenerateClient não é editado por este trabalho).
  const gen = read('app/(dashboard)/generate/GenerateClient.tsx')
  ok(/normalizeAspect\(searchParams\.get\('aspect'\)\)/.test(gen), "(L2) o Studio lê ?aspect= — GenerateClient: normalizeAspect(searchParams.get('aspect'))")
  ok((gen.match(new RegExp(`aspectRequested !== '${ASPECT_DEFAULT}' \\? \\{ aspect`, 'g')) || []).length >= 3, `(L2) o GenerateClient usa o MESMO padrão (só viaja quando != ${ASPECT_DEFAULT}) em ≥3 pontos — o handoff copia a casa, não inventa`)
  // ── (L3) o schema: dois enums, três descriptions, versão.
  let schema = null
  try { schema = JSON.parse(read('public/gpt/openapi.json')) } catch {}
  const reqA = schema?.components?.schemas?.HandoffRequest?.properties?.aspect ?? {}
  const resA = schema?.components?.schemas?.HandoffResponse?.properties?.aspect ?? {}
  const d400 = schema?.paths?.['/api/gpt/handoff']?.post?.responses?.['400']?.description ?? ''
  ok(sameSet(reqA.enum, ASPECT_LIST), `(L3) HandoffRequest.aspect.enum [${reqA.enum}] === lib/aspect.ts [${ASPECT_LIST}]`)
  ok(sameSet(resA.enum, ASPECT_LIST), `(L3) HandoffResponse.aspect.enum [${resA.enum}] === lib/aspect.ts [${ASPECT_LIST}]`)
  ok(reqA.default === ASPECT_DEFAULT, `(L3) HandoffRequest.aspect.default === ${ASPECT_DEFAULT}`)
  ok(ASPECT_LIST.every((a) => (reqA.description ?? '').includes(a)) && /\bask\b/i.test(reqA.description ?? '') && /price/i.test(reqA.description ?? ''), '(L3) a description do pedido ensina cada formato pela plataforma, manda PERGUNTAR onde vai postar quando não está claro, e diz que o preço não muda')
  ok(/TikTok/.test(reqA.description ?? '') && /YouTube/.test(reqA.description ?? '') && /Instagram/.test(reqA.description ?? ''), '(L3) a escolha é ensinada por PLATAFORMA (TikTok, YouTube, Instagram), não por "evite"')
  ok(ASPECT_LIST.every((a) => (resA.description ?? '').includes(a)), '(L3) a description da resposta cita cada formato (o modelo confirma à pessoa o que vai renderizar)')
  ok(ASPECT_LIST.every((a) => d400.includes(a)), `(L3) o 400 diz quais valores de aspect existem (${ASPECT_LIST.join(', ')})`)
  const ver = String(schema?.info?.version ?? '')
  const [vMaj, vMin] = ver.split('.').map(Number)
  ok(/^\d+\.\d+\.\d+$/.test(ver) && (vMaj > 1 || (vMaj === 1 && vMin >= 2)), `(L3) info.version ${ver || '?'} é semver e ≥ 1.2.0 — o enum mudou de forma; o editor do GPT só relê o schema com reimport`)
  // ── (L4) as instruções do GPT: infere pela plataforma, pergunta se não sabe.
  const md = read('docs/GPT-KINEO-VIDEO-MAKER.md')
  const sectionOf = (letter) => (md.match(new RegExp(`^## ${letter}\\. [^\\n]*\\n([\\s\\S]*?)(?=^## [A-Z]\\. |(?![\\s\\S]))`, 'm')) || [])[1] || ''
  const instr = (sectionOf('C').match(/```\n([\s\S]*?)\n```/) || [])[1] || ''
  ok(ASPECT_LIST.every((a) => instr.includes(a)), `(L4) as instruções (seção C) citam cada um dos ${ASPECT_LIST.length} formatos`)
  const frameBlock = (instr.match(/Frame \(aspect ratio\)[\s\S]*?never changes the price\./) || [''])[0]
  ok(frameBlock.length > 200 && ASPECT_LIST.every((a) => new RegExp(`→ ${a}`).test(frameBlock)), '(L4) Step 1: cada formato tem a plataforma que o pede ("plataforma → formato")')
  ok(/add ONE short question/.test(frameBlock) && /Where will you post it/.test(frameBlock), '(L4) Step 1: o GPT PERGUNTA onde a pessoa vai postar quando não está claro')
  ok(!/Never ask about it/.test(instr), '(L4) a instrução antiga "Never ask about it" (que travava todo mundo em 9:16) morreu')
  const step5Aspect = instr.split('\n').find((l) => /^- aspect: /.test(l)) || ''
  ok(step5Aspect.startsWith(`- aspect: "${ASPECT_DEFAULT}" unless`) && ASPECT_LIST.every((a) => step5Aspect.includes(`"${a}"`)), `(L4) Step 5 envia "${ASPECT_DEFAULT}" por padrão e nomeia os outros formatos com a plataforma`)
  ok(/frame/.test(instr.split('\n').find((l) => /already filled in/.test(l) && /valid for/.test(l)) || ''), '(L4) Step 6: a mensagem final diz que o frame também vai preenchido')
  ok(ASPECT_LIST.every((a) => sectionOf('G').includes(`\`${a}\``)) && /lib\/aspect\.ts/.test(sectionOf('G')), '(L4) seção G registra os formatos e aponta lib/aspect.ts como fonte')
  // ── (L5) a migration: sem CHECK (a lib valida), comentário com a lista real.
  const aspectCol = (migration.match(/^\s*aspect text not null.*$/m) || [''])[0]
  ok(aspectCol.length > 0 && ASPECT_LIST.every((a) => aspectCol.includes(`'${a}'`)), `(L5) o comentário da coluna aspect cita os ${ASPECT_LIST.length} formatos reais: "${aspectCol.trim().slice(0, 100)}"`)
  ok(!/check\s*\(\s*aspect/i.test(migration), '(L5) sem CHECK na coluna — formato novo não exige migration; quem valida é a lib')
  // ── (L6) a página /go mostra o enquadramento SEMPRE, com nome e destino.
  ok(/import \{[^}]*\baspectSpec\b[^}]*\} from '@\/lib\/gptHandoff'/.test(page) && /const frame = aspectSpec\(row\.aspect\)/.test(page), '(L6) a página usa aspectSpec(row.aspect) — o mesmo normalizador que o destino do clique')
  const frameLine = page.split('\n').find((l) => /\{frame\.label\}/.test(l)) || ''
  ok(/<Meta>\{frame\.aspect\} · \{frame\.label\} · \{frame\.where\}<\/Meta>/.test(frameLine), '(L6) a linha do formato mostra ratio · rótulo humano · onde posta (aspectSpec().label e .where)')
  ok(!/&&|\?/.test(frameLine), '(L6) a linha do formato é INCONDICIONAL — aparece também em 9:16 (quem pousa precisa saber o que vem)')
  ok(ASPECT_LIST.every((a) => new RegExp(`'${a}': \\{[\\s\\S]*?label: '[^']+',\\s*where: '[^']+'`).test(aspectLib)), '(L6) lib/aspect.ts tem label e where para cada formato — o que a página mostra existe')
  ok(/metadata: \{[\s\S]{0,900}?aspect: row\.aspect/.test(page), '(L6) gpt_landing_viewed carrega o aspect — adoção do não-padrão mede-se no pouso, não por data')
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)