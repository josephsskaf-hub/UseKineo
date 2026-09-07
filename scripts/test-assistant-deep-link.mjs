// KINEO-ASSISTANT-LINK-2026-09-06 — guardião do link GET que QUALQUER assistente
// escreve (/make?script=…), o irmão por GET da Action do GPT da loja.
//
// O QUE ELE PROVA, e COMO (lido × executado, explícito em cada bloco):
//   (A) EXECUTA lib/gptHandoff.ts (Node >= 22.6 despe os tipos; o alias `@/`
//       é resolvido em processo pelo MESMO hook de scripts/test-gpt-handoff.mjs,
//       só para lib/gptHandoff.ts importar lib/aspect.ts). Assim
//       buildStudioDestination / parseAssistantLinkQuery / handoffPayloadHash
//       são provadas com valores, não com regex. Se o import falhar, o bloco
//       reprova em voz alta — nunca "passa por leitura" em silêncio.
//   (B..G) LÊ o texto real (readFileSync) das rotas, do store, dos fatos, do
//       llms.txt e da migration — cada asserção amarrada à VARIÁVEL/CONDIÇÃO
//       que decide, para um mutante reprovar.
//
// OS DEFEITOS QUE ELE IMPEDE:
//   1. um link de terceiro DISPARAR render sozinho e gastar o crédito de quem
//      clicou — por isso `create_intent`, `autoanalyze` e `studio=` não podem
//      existir na rota /make, no llms.txt nem nos fatos;
//   2. o canal da loja mudar de etiqueta (utm_source=chatgpt_gpt) e quebrar a
//      medição do que já está no ar — linha SEM channel tem de cair em gpt_store;
//   3. o mesmo link clicado 3× virar 3 linhas (funil created→viewed→clicked
//      mentindo) — por isso payload_hash + busca da linha VIVA antes do insert;
//   4. os valores públicos (motores, réguas, formatos, teto, prazo) serem
//      digitados de novo em kineoFacts/llms.txt em vez de importados da lib
//      que a rota VALIDA;
//   5. a frase pública afirmar o pacote de publicação (1e71b922: 0 de 42).
//
// Este arquivo NÃO importa nada com alias `@/` diretamente (72 testes do repo
// morrem no resolver antes da 1ª verificação).
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) {
    pass++
    return
  }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

const LIB = 'lib/gptHandoff.ts'
const STORE = 'lib/gptHandoffStore.ts'
const MAKE = 'app/make/route.ts'
const POST_ROUTE = 'app/api/gpt/handoff/route.ts'
const FACTS = 'lib/kineoFacts.ts'
const LLMS = 'app/llms.txt/route.ts'
const MIGRATION = 'supabase/migrations/20260906230000_gpt_handoffs_channel.sql'

const lib = read(LIB)
const store = read(STORE)
const post = read(POST_ROUTE)
const facts = read(FACTS)
const llms = read(LLMS)

// Sem comentários: o que importa é o CÓDIGO, e um comentário que cite a palavra
// proibida para explicá-la não pode contar como violação.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .map((l) => l.replace(/\s\/\/.*$/, ''))
    .join('\n')

// ═══ (A) EXECUÇÃO da lib pura ═══════════════════════════════════════════════
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

let L = null
try {
  L = await import(pathToFileURL(path.join(ROOT, LIB)).href)
} catch (e) {
  check('(A0) lib/gptHandoff.ts EXECUTA neste Node', false, `${process.version}: ${e && e.message}`)
}
if (L) {
  const utm = (dest) => new URLSearchParams(dest.split('?')[1] ?? '')
  const base = { script: 'Hello world', duration_sec: 60, engine_hint: 'seedance', aspect: '9:16' }

  // (A1) linha SEM channel (as que já existem) = byte a byte o destino de antes
  const semCanal = utm(L.buildStudioDestination(base))
  check('(A1) linha sem channel → utm_source=chatgpt_gpt', semCanal.get('utm_source') === 'chatgpt_gpt', semCanal.get('utm_source'))
  check('(A1) linha sem channel → intent_campaign=kineo_gpt_store', semCanal.get('intent_campaign') === 'kineo_gpt_store')
  check(
    '(A1) o destino sem channel é IDÊNTICO ao destino com channel=gpt_store',
    L.buildStudioDestination(base) === L.buildStudioDestination({ ...base, channel: 'gpt_store' }),
  )
  check('(A1) channel desconhecido cai em gpt_store, nunca passa cru', utm(L.buildStudioDestination({ ...base, channel: 'bogus' })).get('utm_source') === 'chatgpt_gpt')
  check('(A1) channel null cai em gpt_store', utm(L.buildStudioDestination({ ...base, channel: null })).get('utm_source') === 'chatgpt_gpt')

  // (A2) o canal novo
  const comCanal = utm(L.buildStudioDestination({ ...base, channel: 'assistant_link' }))
  check('(A2) channel=assistant_link → utm_source=assistant_link', comCanal.get('utm_source') === 'assistant_link', comCanal.get('utm_source'))
  check('(A2) channel=assistant_link → intent_campaign=kineo_assistant_link', comCanal.get('intent_campaign') === 'kineo_assistant_link')
  check('(A2) o canal muda SÓ as duas etiquetas (prompt/duration/engine iguais)', ['prompt', 'script_mode', 'duration', 'engine'].every((k) => comCanal.get(k) === semCanal.get(k)))
  check('(A2) a lista de parâmetros continua FECHADA (6 chaves)', [...comCanal.keys()].length === 6, [...comCanal.keys()].join(','))

  // (A3) constantes do canal
  // KINEO-PASTE-PAGE-2026-09-07: o terceiro canal (paste_page, a página
  // /chatgpt) entrou; os dois primeiros continuam nas MESMAS posições.
  check('(A3) HANDOFF_CHANNELS = gpt_store, assistant_link, paste_page', Array.isArray(L.HANDOFF_CHANNELS) && L.HANDOFF_CHANNELS.length === 3 && L.HANDOFF_CHANNELS[0] === 'gpt_store' && L.HANDOFF_CHANNELS[1] === 'assistant_link' && L.HANDOFF_CHANNELS[2] === 'paste_page')
  check('(A3) DEFAULT_CHANNEL executado = gpt_store', L.DEFAULT_CHANNEL === 'gpt_store', String(L.DEFAULT_CHANNEL))
  check('(A3) isHandoffChannel aceita os dois e recusa o resto', L.isHandoffChannel('gpt_store') && L.isHandoffChannel('assistant_link') && !L.isHandoffChannel('chatgpt_gpt') && !L.isHandoffChannel(null))
  check('(A3) CHANNEL_TAGS.gpt_store == constantes de sempre', L.CHANNEL_TAGS.gpt_store.utmSource === L.HANDOFF_UTM_SOURCE && L.CHANNEL_TAGS.gpt_store.intentCampaign === L.HANDOFF_INTENT_CAMPAIGN)
  check('(A3) HANDOFF_UTM_SOURCE / HANDOFF_INTENT_CAMPAIGN NÃO mudaram', L.HANDOFF_UTM_SOURCE === 'chatgpt_gpt' && L.HANDOFF_INTENT_CAMPAIGN === 'kineo_gpt_store')
  check('(A3) ASSISTANT_LINK_PATH = /make', L.ASSISTANT_LINK_PATH === '/make', String(L.ASSISTANT_LINK_PATH))

  // (A4) parseAssistantLinkQuery → a MESMA validação
  const q = (s) => L.parseAssistantLinkQuery(new URLSearchParams(s))
  const okFull = q('script=Five+things+about+money&duration=90&engine=kling3&aspect=16:9&language=pt-BR&topic=Money')
  check('(A4) querystring completa valida', okFull.ok === true, okFull.ok ? '' : okFull.error)
  if (okFull.ok) {
    check('(A4) duration=90 → durationSec 90 (número)', okFull.value.durationSec === 90)
    check('(A4) engine=kling3 → apelido resolvido para hollywood (normalizeEngineHint da lib)', okFull.value.engineHint === 'hollywood')
    check('(A4) aspect/language/topic passam', okFull.value.aspect === '16:9' && okFull.value.language === 'pt-BR' && okFull.value.topic === 'Money')
    check('(A4) o objeto validado tem SÓ as 6 chaves de HandoffInput', Object.keys(okFull.value).sort().join(',') === 'aspect,durationSec,engineHint,language,script,topic')
  }
  const viaPrompt = q('prompt=Hello+there&durationSec=35&engineHint=veo')
  check('(A4) sinônimos: prompt=script, durationSec=duration, engineHint=engine', viaPrompt.ok === true && viaPrompt.value.script === 'Hello there' && viaPrompt.value.durationSec === 35 && viaPrompt.value.engineHint === 'veo')
  check('(A4) o nome canônico vence o sinônimo', q('script=A&prompt=B').ok && q('script=A&prompt=B').value.script === 'A')
  check('(A4) sem script → recusa (a mesma frase da Action)', q('duration=60').ok === false && /script is required/.test(q('duration=60').error))
  check('(A4) duration fora da régua → recusa', q('script=x&duration=45').ok === false && /durationSec must be one of/.test(q('script=x&duration=45').error))
  check('(A4) engine desconhecido → recusa', q('script=x&engine=sora').ok === false)
  check('(A4) HTML no script → recusa', q('script=%3Cb%3Ehi%3C%2Fb%3E').ok === false)
  const perigoso = q('script=Hi&create_intent=1&autoanalyze=1&studio=1&redirect=%2F%2Fevil')
  check('(A4) create_intent/autoanalyze/studio/redirect na query são IGNORADOS (não entram no valor)', perigoso.ok === true && !JSON.stringify(perigoso.value).includes('create_intent') && !('redirect' in perigoso.value))
  check('(A4) defaults: duration 60, engine seedance, aspect 9:16, language en', q('script=Hi').ok && q('script=Hi').value.durationSec === 60 && q('script=Hi').value.engineHint === 'seedance' && q('script=Hi').value.aspect === '9:16' && q('script=Hi').value.language === 'en')

  // (A5) handoffPayloadHash
  const input = okFull.ok ? okFull.value : L.validateHandoffInput({ script: 'x' }).value
  const h1 = L.handoffPayloadHash(input, 'assistant_link')
  const h2 = L.handoffPayloadHash({ ...input }, 'assistant_link')
  check('(A5) hash é sha256 hex (64 chars)', /^[0-9a-f]{64}$/.test(h1), h1)
  check('(A5) determinístico: mesma entrada = mesmo hash', h1 === h2)
  check('(A5) o canal entra no hash (mesma entrada, canal diferente = linha diferente)', h1 !== L.handoffPayloadHash(input, 'gpt_store'))
  check('(A5) mudar UM caractere do roteiro muda o hash', h1 !== L.handoffPayloadHash({ ...input, script: input.script + '.' }, 'assistant_link'))
  check('(A5) a ordem das chaves do objeto de entrada NÃO muda o hash', h1 === L.handoffPayloadHash(Object.fromEntries(Object.entries(input).reverse()), 'assistant_link'))
}

// ═══ (B) lib — por LEITURA (amarrado ao código, não ao comentário) ═════════
const libCode = stripComments(lib)
check('(B1) CHANNEL_TAGS existe e é Record<HandoffChannel, …>', /export const CHANNEL_TAGS: Readonly<Record<HandoffChannel, \{ utmSource: string; intentCampaign: string \}>> = \{/.test(libCode))
check("(B1) DEFAULT_CHANNEL: HandoffChannel = 'gpt_store' (linha sem canal é da loja)", /export const DEFAULT_CHANNEL: HandoffChannel = 'gpt_store'/.test(libCode))
check('(B1) gpt_store usa as CONSTANTES (HANDOFF_UTM_SOURCE / HANDOFF_INTENT_CAMPAIGN), não literais', /gpt_store: \{ utmSource: HANDOFF_UTM_SOURCE, intentCampaign: HANDOFF_INTENT_CAMPAIGN \}/.test(libCode))
check("(B1) HANDOFF_UTM_SOURCE = 'chatgpt_gpt' intacto", /export const HANDOFF_UTM_SOURCE = 'chatgpt_gpt'/.test(libCode))
check("(B1) HANDOFF_INTENT_CAMPAIGN = 'kineo_gpt_store' intacto", /export const HANDOFF_INTENT_CAMPAIGN = 'kineo_gpt_store'/.test(libCode))
check('(B2) buildStudioDestination escolhe as etiquetas por CHANNEL_TAGS[canal válido ?? DEFAULT_CHANNEL]', /const tags = CHANNEL_TAGS\[isHandoffChannel\(row\.channel\) \? row\.channel : DEFAULT_CHANNEL\]/.test(libCode))
check('(B2) as etiquetas emitidas vêm de `tags`, não de constante fixa', /q\.set\('utm_source', tags\.utmSource\)\s*\n\s*q\.set\('intent_campaign', tags\.intentCampaign\)/.test(libCode))
check('(B3) parseAssistantLinkQuery CHAMA validateHandoffInput (nenhuma regra duplicada)', /export function parseAssistantLinkQuery\(sp: URLSearchParams\): HandoffValidation \{[\s\S]*?return validateHandoffInput\(body\)\s*\n\}/.test(libCode))
check('(B3) parseAssistantLinkQuery não contém regra própria (sem SCRIPT_MAX_CHARS/DURATIONS/HTML_TAG_PATTERN dentro dela)', (() => {
  const m = libCode.match(/export function parseAssistantLinkQuery[\s\S]*?\n\}/)
  return Boolean(m) && !/SCRIPT_MAX_CHARS|DURATIONS|HTML_TAG_PATTERN|ASPECTS|HANDOFF_ENGINES/.test(m[0])
})())
check('(B4) handoffPayloadHash usa createHash(sha256) de node:crypto', /import \{ createHash \} from 'node:crypto'/.test(libCode) && /export function handoffPayloadHash\(input: HandoffInput, channel: HandoffChannel\): string \{[\s\S]*?createHash\('sha256'\)/.test(libCode))
check('(B4) o hash serializa as chaves em ORDEM FIXA (array de pares, não o objeto)', /JSON\.stringify\(\[\s*\['channel', channel\],\s*\['script', input\.script\]/.test(libCode))
check("(B5) ASSISTANT_LINK_PATH = '/make' na lib (única fonte)", /export const ASSISTANT_LINK_PATH = '\/make'/.test(libCode))
// KINEO-GPT-VERDADE-2026-09-07: @/lib/narrationFit entrou (o cobrador; puro, zero import).
check('(B5) a lib importa só @/lib/aspect, @/lib/narrationFit e node:crypto (continua sem banco/rede)', [...lib.matchAll(/^import (?:\{[^}]*\}|[^\n{]*) from '([^']+)'/gm)].map((m) => m[1]).every((s) => s === '@/lib/aspect' || s === '@/lib/narrationFit' || s === 'node:crypto'))

// ═══ (C) app/make/route.ts ══════════════════════════════════════════════════
const makePath = path.join(ROOT, MAKE)
check('(C0) app/make/route.ts existe', fs.existsSync(makePath))
check('(C0) app/make NÃO colide com app/go/[token] (os dois existem)', fs.existsSync(path.join(ROOT, 'app/go/[token]/page.tsx')))
const make = fs.existsSync(makePath) ? read(MAKE) : ''
const makeCode = stripComments(make)
for (const perigo of ['create_intent', 'autoanalyze', 'studio=']) {
  check(`(C1) a rota /make NÃO contém \`${perigo}\` (nem em comentário — um link de terceiro nunca dispara render)`, !make.includes(perigo))
}
check('(C2) é Route Handler GET (não página)', /export async function GET\(req: NextRequest\)/.test(makeCode) && !/export default/.test(makeCode))
check("(C2) dynamic='force-dynamic' + runtime='nodejs' (segue o POST)", /export const dynamic = 'force-dynamic'/.test(makeCode) && /export const runtime = 'nodejs'/.test(makeCode))
check("(C2) fetchCache='force-no-store' (rota SÓ-GET lê o banco — KINEO-DATA-CACHE)", /export const fetchCache = 'force-no-store'/.test(makeCode))
check('(C3) valida com parseAssistantLinkQuery(req.nextUrl.searchParams)', /const validated = parseAssistantLinkQuery\(req\.nextUrl\.searchParams\)/.test(makeCode))
check('(C3) inválido → landing com slug de errorSlug(), nunca o texto', /if \(!validated\.ok\) return landing\(origin, errorSlug\(validated\.error\)\)/.test(makeCode))
check('(C3) o texto do erro NUNCA vai para a URL (validated.error só entra em errorSlug)', (make.match(/validated\.error/g) ?? []).length === 1)
check('(C3) errorSlug devolve só slugs da lista fechada', (() => {
  const list = makeCode.match(/const HANDOFF_ERROR_SLUGS = \[([\s\S]*?)\] as const/)
  const fn = makeCode.match(/function errorSlug\(message: string\): HandoffErrorSlug \{([\s\S]*?)\n\}/)
  if (!list || !fn) return false
  const allowed = new Set([...list[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]))
  const returned = [...fn[1].matchAll(/return '([a-z_]+)'/g)].map((m) => m[1])
  return returned.length >= 8 && returned.every((s) => allowed.has(s))
})())
check("(C3) landing = 302 para /chatgpt-to-youtube-shorts?handoff_error=<slug>", /const LANDING = '\/chatgpt-to-youtube-shorts'/.test(makeCode) && /`\$\{origin\}\$\{LANDING\}\?handoff_error=\$\{slug\}`/.test(makeCode) && /return NextResponse\.redirect\(url, 302\)/.test(makeCode))
check('(C3) a rota NUNCA devolve JSON (humano clicou num link)', !/NextResponse\.json/.test(makeCode))
check('(C4) rate limit = as MESMAS condições do POST (por IP e global)', /if \(counts && ipHash && counts\.ip >= RATE_LIMIT_PER_IP_PER_HOUR\) \{\s*\n\s*return landing\(origin, 'rate_limited'\)/.test(makeCode) && /if \(counts && counts\.global >= RATE_LIMIT_GLOBAL_PER_HOUR\) \{\s*\n\s*return landing\(origin, 'rate_limited'\)/.test(makeCode))
check('(C4) contador vem de countRecentHandoffs(hashIp(clientIp(headers))) — igual ao POST', /const ip = clientIp\(req\.headers\)\s*\n\s*const ipHash = hashIp\(ip\)\s*\n\s*const counts = await countRecentHandoffs\(ipHash\)/.test(makeCode))
check('(C5) robô NÃO grava linha: `if (bot) return landing(origin)` ANTES de findHandoffByPayloadHash/insertHandoff', (() => {
  const iBot = makeCode.indexOf('if (bot) return landing(origin)')
  const iFind = makeCode.indexOf('await findHandoffByPayloadHash(')
  const iIns = makeCode.indexOf('await insertHandoff(')
  return iBot > 0 && iFind > iBot && iIns > iBot && /const bot = isLikelyBot\(req\.headers\.get\('user-agent'\)\)/.test(makeCode)
})())
check('(C6) idempotência: findHandoffByPayloadHash(payloadHash) ANTES do insert, e se achou → reused=true sem inserir', /const existing = await findHandoffByPayloadHash\(payloadHash\)\s*\n\s*if \(existing\) \{\s*\n\s*token = existing\.token\s*\n\s*reused = true\s*\n\s*\} else \{/.test(makeCode))
check('(C6) o hash é handoffPayloadHash(input, CHANNEL)', /const payloadHash = handoffPayloadHash\(input, CHANNEL\)/.test(makeCode))
check("(C6) CHANNEL: HandoffChannel = 'assistant_link'", /const CHANNEL: HandoffChannel = 'assistant_link'/.test(makeCode))
check('(C6) o insert grava channel: CHANNEL e payload_hash: payloadHash', /await insertHandoff\(\{[\s\S]*?channel: CHANNEL,\s*\n\s*payload_hash: payloadHash,\s*\n\s*\}\)/.test(makeCode))
check('(C6) corrida no índice único → relê a linha (inserted.duplicate) em vez de falhar', /const again = inserted\.duplicate \? await findHandoffByPayloadHash\(payloadHash\) : null/.test(makeCode))
check('(C7) token novo = randomBytes(18).base64url (o MESMO do POST)', /return randomBytes\(18\)\.toString\('base64url'\)/.test(makeCode) && /\btoken = newToken\(\)/.test(makeCode) && !/Math\.random/.test(makeCode))
check('(C7) TTL = HANDOFF_TTL_MS (o MESMO do POST)', /new Date\(Date\.now\(\) \+ HANDOFF_TTL_MS\)\.toISOString\(\)/.test(makeCode) && /expires_at: expiresAt/.test(makeCode))
check('(C8) evento gpt_handoff_created (o MESMO nome do POST) com channel: CHANNEL e reused', /name: 'gpt_handoff_created'/.test(makeCode) && /channel: CHANNEL,/.test(makeCode) && /\n\s*reused,\s*\n/.test(makeCode))
check('(C8) o evento carrega o mesmo metadata do POST (words/seconds/fit/family/…/bot: false)', ['words: est.words', 'seconds: est.seconds', 'fit: est.fit', 'family: est.family', 'duration_sec: input.durationSec', 'engine_hint: input.engineHint', 'aspect: input.aspect', 'language: input.language', 'has_topic: Boolean(input.topic)', 'script_chars: input.script.length', 'markers_found: est.markersFound', 'bot: false'].every((s) => makeCode.includes(s)))
check('(C8) o ROTEIRO nunca vai para o evento (metadata sem chave `script:`)', (() => {
  const m = makeCode.match(/metadata: \{([\s\S]*?)\n\s*\},/)
  return Boolean(m) && !/\bscript:/.test(m[1]) && !/input\.script[^.]/.test(m[1])
})())
check('(C8) o ROTEIRO nunca vai para uma URL de redirecionamento', !/redirect\([^)]*input\.script/.test(makeCode) && !/\$\{input\.script\}/.test(makeCode))
check('(C9) sucesso = 302 para /go/<token> (GO_PATH_PREFIX)', /return NextResponse\.redirect\(`\$\{origin\}\$\{GO_PATH_PREFIX\}\$\{token\}`, 302\)/.test(makeCode) && /return go\(origin, token\)/.test(makeCode))
check("(C9) qualquer exceção → landing 'unavailable', nunca 500", /\} catch \(e\) \{[\s\S]*?return landing\(origin, 'unavailable'\)\s*\n\s*\}\s*\n\}/.test(makeCode))

// ═══ (D) store ══════════════════════════════════════════════════════════════
const storeCode = stripComments(store)
check('(D1) ROW_COLUMNS inclui channel e payload_hash', /const ROW_COLUMNS =\s*\n?\s*'[^']*\bclick_count, channel, payload_hash'/.test(storeCode))
check('(D1) GptHandoffRow declara channel e payload_hash', /channel\?: string \| null/.test(storeCode) && /payload_hash\?: string \| null/.test(storeCode))
check('(D1) NewHandoff exige channel: string e payload_hash: string | null', /export type NewHandoff = \{[\s\S]*?channel: string\s*\n\s*payload_hash: string \| null\s*\n\}/.test(storeCode))
check('(D2) findHandoffByPayloadHash busca por payload_hash', /export async function findHandoffByPayloadHash\(hash: string\)[\s\S]*?\.eq\('payload_hash', hash\)/.test(storeCode))
check('(D2) …e SÓ linha viva: .gt(\'expires_at\', agora)', /\.eq\('payload_hash', hash\)\s*\n\s*\.gt\('expires_at', new Date\(\)\.toISOString\(\)\)/.test(storeCode))
check('(D2) …devolve null em erro/sem service client (nunca lança)', (() => {
  const m = storeCode.match(/export async function findHandoffByPayloadHash[\s\S]*?\n\}/)
  return Boolean(m) && /if \(!db\) return null/.test(m[0]) && /if \(error \|\| !data\) return null/.test(m[0]) && /\} catch \{\s*\n\s*return null/.test(m[0])
})())
check("(D3) insertHandoff sinaliza duplicate quando o banco devolve 23505", /export const UNIQUE_VIOLATION = '23505'/.test(storeCode) && /duplicate: error\.code === UNIQUE_VIOLATION/.test(storeCode))

// ═══ (E) POST /api/gpt/handoff — o mínimo ═══════════════════════════════════
const postCode = stripComments(post)
check("(E1) POST grava channel: CHANNEL com CHANNEL = 'gpt_store'", /const CHANNEL: HandoffChannel = 'gpt_store'/.test(postCode) && /await insertHandoff\(\{[\s\S]*?channel: CHANNEL,\s*\n\s*payload_hash: payloadHash,/.test(postCode))
check('(E1) POST reaproveita a linha viva do mesmo hash (senão o índice único faria o 2º pedido virar 503)', /const existing = await findHandoffByPayloadHash\(payloadHash\)/.test(postCode) && /const again = inserted\.duplicate \? await findHandoffByPayloadHash\(payloadHash\) : null/.test(postCode))
check('(E1) o formato da resposta do POST NÃO mudou', ['url: `${origin}${GO_PATH_PREFIX}${token}`', 'token,', 'expiresAt,', 'fitMessage: describeFit(est, input.durationSec)', 'overStudioLimit:', 'studioLimitChars: STUDIO_PROMPT_MAX_CHARS'].every((s) => postCode.includes(s)))
check('(E1) a validação do POST NÃO mudou (validateHandoffInput(body) → 400)', /const validated = validateHandoffInput\(body\)\s*\n\s*if \(!validated\.ok\) return json\(\{ error: validated\.error \}, 400\)/.test(postCode))

// ═══ (F) kineoFacts — nada redigitado ═══════════════════════════════════════
const factsCode = stripComments(facts)
const importFromLib = facts.match(/import \{([^}]*)\} from '\.\/gptHandoff'/s)
check("(F1) kineoFacts importa de './gptHandoff'", Boolean(importFromLib))
const imported = importFromLib ? importFromLib[1].split(',').map((s) => s.trim()).filter(Boolean) : []
for (const name of ['ASSISTANT_LINK_PATH', 'DURATIONS', 'HANDOFF_ENGINES', 'ASPECTS', 'SCRIPT_MAX_CHARS', 'HANDOFF_TTL_DAYS', 'DEFAULT_DURATION', 'DEFAULT_ENGINE', 'DEFAULT_ASPECT', 'DEFAULT_LANGUAGE', 'TOPIC_MAX_CHARS']) {
  check(`(F1) importa ${name} da lib`, imported.includes(name))
}
const bloco = facts.match(/ASSISTANT_DEEP_LINK_FACT \(início\)[\s\S]*?ASSISTANT_DEEP_LINK_FACT \(fim\)/)
check('(F2) o bloco do fato é delimitado (início/fim)', Boolean(bloco))
const blocoCode = bloco ? stripComments(bloco[0]) : ''
check('(F2) url = `${BASE}${ASSISTANT_LINK_PATH}` (caminho importado)', /url: `\$\{BASE\}\$\{ASSISTANT_LINK_PATH\}`/.test(blocoCode))
check('(F2) example usa ASSISTANT_LINK_PATH + DEFAULT_DURATION + DEFAULT_ENGINE', /example: `\$\{BASE\}\$\{ASSISTANT_LINK_PATH\}\?script=<urlencoded script>&duration=\$\{DEFAULT_DURATION\}&engine=\$\{DEFAULT_ENGINE\}`/.test(blocoCode))
check('(F2) duration.values = DURATIONS', /duration: \{ required: false, values: DURATIONS, default: DEFAULT_DURATION/.test(blocoCode))
check('(F2) engine.values = HANDOFF_ENGINES', /engine: \{ required: false, values: HANDOFF_ENGINES, default: DEFAULT_ENGINE/.test(blocoCode))
check('(F2) aspect.values = ASPECTS', /aspect: \{ required: false, values: ASPECTS, default: DEFAULT_ASPECT \}/.test(blocoCode))
check('(F2) script.maxChars = SCRIPT_MAX_CHARS · topic.maxChars = TOPIC_MAX_CHARS', /maxChars: SCRIPT_MAX_CHARS/.test(blocoCode) && /maxChars: TOPIC_MAX_CHARS/.test(blocoCode))
check('(F2) linkValidDays = HANDOFF_TTL_DAYS', /linkValidDays: HANDOFF_TTL_DAYS,/.test(blocoCode))
// Nenhum literal das listas dentro do bloco: id de motor, formato, régua,
// teto, prazo, caminho. (Os únicos literais de string permitidos são os
// sinônimos de parâmetro e a prosa.)
const literaisProibidos = [
  /'\/make'/,
  /'(?:fast|seedance|kling|veo|hollywood|h3|omni)'/,
  /'(?:9:16|16:9|1:1|4:5)'/,
  /\[\s*35\s*,\s*60\s*,\s*90\s*\]/,
  /\b(?:maxChars|linkValidDays|default):\s*\d+/,
  /\bvalues:\s*\[/,
]
for (const re of literaisProibidos) {
  check(`(F3) o bloco do fato NÃO redigita ${re}`, !re.test(blocoCode), (blocoCode.match(re) ?? [])[0])
}
check('(F4) KineoFactsPayload declara assistantDeepLink: AssistantDeepLinkFact', /\n\s*assistantDeepLink: AssistantDeepLinkFact\b/.test(factsCode))
check('(F4) getKineoFacts() devolve assistantDeepLink: ASSISTANT_DEEP_LINK_FACT (aditivo)', /\n\s*assistantDeepLink: ASSISTANT_DEEP_LINK_FACT,/.test(factsCode))
check('(F4) startHere e afterTheFilm continuam no payload (aditivo, nada removido)', /\n\s*startHere: START_HERE_FACT,/.test(factsCode) && /\n\s*afterTheFilm: AFTER_THE_FILM_FACT,/.test(factsCode))
for (const perigo of ['create_intent', 'autoanalyze', 'studio=']) {
  check(`(F5) o bloco do fato não documenta \`${perigo}\``, !bloco || !bloco[0].includes(perigo))
}
check('(F5) o fato diz que NÃO gera sozinho, NÃO cobra e NÃO cria conta', /does not generate anything on its own/.test(blocoCode) && /no credit is spent until the person clicks/.test(blocoCode) && /No account is created by the link/.test(blocoCode))
check('(F5) o fato diz que quem não tem conta volta ao mesmo link', /signs up and is returned to the same link/.test(blocoCode))

// ═══ (G) /llms.txt — a seção, gerada do fato ════════════════════════════════
check('(G1) /llms.txt importa ASSISTANT_DEEP_LINK_FACT', /\n\s*ASSISTANT_DEEP_LINK_FACT,\s*\n/.test(llms))
const secao = llms.match(/## If you are an assistant that just wrote the script[\s\S]*?(?=\n## )/)
check('(G1) /llms.txt tem a seção do link para assistentes', Boolean(secao))
const iSecao = llms.indexOf('## If you are an assistant that just wrote the script')
const iStartHere = llms.indexOf('## Start here if you already have a ChatGPT script')
check('(G1) a seção vem ANTES de "Start here if you already have a ChatGPT script"', iSecao > 0 && iStartHere > iSecao)
const gerador = llms.match(/const assistantDeepLinkLines = \[([\s\S]*?)\]\.join\('\\n'\)/)
check('(G2) as linhas são geradas de ASSISTANT_DEEP_LINK_FACT (const dl)', /const dl = ASSISTANT_DEEP_LINK_FACT/.test(llms) && Boolean(gerador))
const geradorTxt = gerador ? gerador[1] : ''
check('(G2) a seção interpola o gerador', Boolean(secao) && secao[0].includes('${assistantDeepLinkLines}'))
for (const campo of ['dl.example', 'dl.params.script.maxChars', 'dl.params.duration.values', 'dl.params.engine.values', 'dl.params.aspect.values', 'dl.linkValidDays', 'dl.behavior', 'dl.boundaries']) {
  check(`(G2) o gerador usa ${campo}`, geradorTxt.includes(campo))
}
// O caminho /make chega ao texto por CADEIA: seção → dl.example → fato
// (`${ASSISTANT_LINK_PATH}`) → lib ('/make', EXECUTADA em A3). E não é
// digitado em lugar nenhum fora da lib.
// Código, não comentário: um comentário pode CITAR a rota para explicá-la; o
// que não pode é o caminho aparecer como valor fora da lib.
const llmsCode = stripComments(llms)
check('(G3) `/make` NÃO é digitado no CÓDIGO do llms.txt nem de kineoFacts (vem da lib pela cadeia)', !llmsCode.includes('/make') && !factsCode.includes('/make'))
check('(G3) a cadeia fecha: gerador→dl.example, fato→ASSISTANT_LINK_PATH, lib→/make', geradorTxt.includes('dl.example') && /example: `\$\{BASE\}\$\{ASSISTANT_LINK_PATH\}/.test(blocoCode) && /export const ASSISTANT_LINK_PATH = '\/make'/.test(libCode))
// Nenhum valor digitado no gerador: só interpolação de dl.*
check('(G3) o gerador NÃO digita motor/régua/formato/teto/prazo', !/\b(?:fast|seedance|kling|veo|hollywood|h3|omni)\b/.test(geradorTxt) && !/\b(?:35|60|90|5000|7|200)\b/.test(geradorTxt) && !/(?:9:16|16:9|1:1|4:5)/.test(geradorTxt))
const secaoTxt = ((secao ? secao[0] : '') + '\n' + geradorTxt).toLowerCase()
for (const proibido of ['publishpack', 'publishing pack', 'pinned comment', 'tiktok caption']) {
  check(`(G4) a seção do llms.txt NÃO afirma o pacote ("${proibido}")`, !secaoTxt.includes(proibido))
  check(`(G4) o bloco do fato NÃO afirma o pacote ("${proibido}")`, !(bloco ? bloco[0] : '').toLowerCase().includes(proibido))
}
for (const perigo of ['create_intent', 'autoanalyze', 'studio=']) {
  check(`(G5) /llms.txt inteiro NÃO documenta \`${perigo}\``, !llms.includes(perigo))
}
check('(G5) a seção diz que o link ESPERA o clique e não gera/cobra/cria conta (via dl.behavior + dl.boundaries)', geradorTxt.includes('dl.behavior') && geradorTxt.includes('...dl.boundaries.map'))

// ═══ (H) migration — só o arquivo; quem aplica é o fundador ════════════════
const migPath = path.join(ROOT, MIGRATION)
check('(H1) a migration existe na pasta do repo', fs.existsSync(migPath))
const mig = fs.existsSync(migPath) ? read(MIGRATION) : ''
check("(H1) channel text not null default 'gpt_store'", /add column if not exists channel text not null default 'gpt_store'/.test(mig))
check('(H1) payload_hash text', /add column if not exists payload_hash text/.test(mig))
check('(H1) índice ÚNICO PARCIAL em payload_hash (linhas antigas com null não colidem)', /create unique index if not exists gpt_handoffs_payload_hash_key\s*\n?\s*on public\.gpt_handoffs \(payload_hash\) where payload_hash is not null/.test(mig))

// ═══ resultado ═════════════════════════════════════════════════════════════
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES):\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
assert.equal(fails.length, 0)
console.log(`✅ ${pass} verificações — /make faz por GET o que a Action faz por POST (mesma validação, mesma linha, mesmo evento, canal medido à parte); linha sem canal continua chatgpt_gpt; o mesmo link clicado 3× é UMA linha; nenhum valor público digitado fora de lib/gptHandoff.ts.`)
