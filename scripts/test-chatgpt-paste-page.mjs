// KINEO-PASTE-PAGE-2026-09-07 — guardião da página /chatgpt (o terceiro canal
// do handoff, `paste_page`) e do prompt que a pessoa cola no assistente.
//
// O QUE ELE PROVA, e COMO (lido × executado, explícito em cada bloco):
//   (A) EXECUTA lib/gptHandoff.ts (Node >= 22.6 despe os tipos; o alias `@/`
//       é resolvido em processo pelo MESMO hook de scripts/test-gpt-handoff.mjs).
//       O prompt, a faixa de palavras, o canal e o destino do clique são
//       provados com valores, não com regex.
//   (B..F) LÊ o texto real (readFileSync) da lib, da rota, da página, do
//       painel, do store e da migration — cada asserção amarrada à
//       VARIÁVEL/CONDIÇÃO que decide, para um mutante reprovar.
//
// OS DEFEITOS QUE ELE IMPEDE:
//   1. um número de palavras DIGITADO no prompt divergir da régua (a régua é
//      3,1 pal/s no clássico; mudar a régua tem de mudar o prompt sozinho);
//   2. o prompt crescer além do que cabe numa leitura (1.500 chars);
//   3. as etiquetas dos DOIS canais antigos mudarem (quebra a medição do que
//      já está no ar) — regressão explícita;
//   4. a rota da página abrir CORS `*` (ela é chamada pelo navegador da própria
//      pessoa, mesma origem) ou gravar o evento com o nome do irmão;
//   5. a página perder o K1 (/pricing?utm_source=paste_page) ou o POST para a
//      rota certa;
//   6. o componente 'use client' importar a lib (node:crypto quebra o build da
//      Vercel com tsc verde — memória "tsc não vê a fronteira servidor/cliente").
//
// Este arquivo NÃO importa nada com alias `@/` diretamente (72 testes do repo
// morrem no resolver antes da 1ª verificação).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

// Sem comentários: o que importa é o CÓDIGO.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .map((l) => l.replace(/\s\/\/.*$/, ''))
    .join('\n')

const LIB = 'lib/gptHandoff.ts'
const STORE = 'lib/gptHandoffStore.ts'
const ROUTE = 'app/api/gpt/handoff/paste/route.ts'
const PAGE = 'app/chatgpt/page.tsx'
const PANEL = 'app/chatgpt/ChatgptPastePanel.tsx'
const MIGRATION = 'supabase/migrations/20260907000500_gpt_handoffs_assistant.sql'

const lib = read(LIB)
const libCode = stripComments(lib)
const store = stripComments(read(STORE))
const route = stripComments(read(ROUTE))
const page = stripComments(read(PAGE))
const panel = stripComments(read(PANEL))

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

// ═══ (A) EXECUÇÃO DA LIB ═══════════════════════════════════════════════════
console.log('\n(A) lib/gptHandoff.ts executada — o prompt e o canal')
let L = null
try {
  L = await import(pathToFileURL(path.join(ROOT, LIB)).href)
} catch (e) {
  ok(false, `(A0) import da lib falhou (Node ${process.version}): ${e && e.message}`)
}
if (L) {
  const P = L.ASSISTANT_PASTE_PROMPT
  ok(typeof P === 'string' && P.length > 0, `(A1) ASSISTANT_PASTE_PROMPT existe (${P?.length} chars)`)
  ok(L.ASSISTANT_PASTE_PROMPT_MAX_CHARS === 1500, `(A1) ASSISTANT_PASTE_PROMPT_MAX_CHARS = 1500 (achado: ${L.ASSISTANT_PASTE_PROMPT_MAX_CHARS})`)
  ok(P.length <= L.ASSISTANT_PASTE_PROMPT_MAX_CHARS, `(A1) o prompt cabe no teto: ${P.length} <= ${L.ASSISTANT_PASTE_PROMPT_MAX_CHARS}`)
  ok(P.length <= 1500, '(A1) …e no número 1500 literal (o teto não pode ser afrouxado junto com o prompt)')
  for (const label of ['HOOK', 'MICRO REWARD', 'ESCALATION', 'PAYOFF']) {
    ok(P.includes(`${label}:`), `(A2) o prompt pede o rótulo "${label}:" da casa`)
  }
  ok(/HOOK:[\s\S]*MICRO REWARD:[\s\S]*ESCALATION:[\s\S]*PAYOFF:/.test(P), '(A2) os quatro rótulos aparecem NESTA ordem')
  ok(/ONLY the script/.test(P), '(A2) termina mandando devolver SÓ o roteiro')
  ok(/plain-text block/.test(P), '(A2) …em bloco de texto puro')
  ok(/no camera directions/.test(P) && /no hashtags/.test(P) && /no emoji/.test(P), '(A2) proíbe direção de câmera, hashtag e emoji')
  ok(/verifiable/.test(P) && /never invent/.test(P), '(A2) só fatos verificáveis; nunca inventar')
  ok(/English/.test(P), '(A2) escrito para o público EUA (English)')
  ok(/how long should the video be\?/.test(P), '(A2) pede a duração à pessoa')

  // (A3) A FAIXA DE PALAVRAS vem da régua, nunca digitada. Para cada duração,
  // a linha do prompt tem de ser `- ${d}s: ${min}-${max} words` com min =
  // Math.round(d * WORDS_PER_SECOND_CLASSIC) — calculado AQUI, não lido da lib.
  const WPS = L.WORDS_PER_SECOND_CLASSIC
  ok(WPS === 3.1, `(A3) régua clássica = 3,1 pal/s (achado: ${WPS})`)
  ok(Array.isArray(L.DURATIONS) && L.DURATIONS.length === 3, `(A3) DURATIONS = ${L.DURATIONS?.join('/')}`)
  for (const d of L.DURATIONS) {
    const min = Math.round(d * WPS)
    const budget = L.pasteWordBudget(d)
    ok(budget.min === min, `(A3) pasteWordBudget(${d}).min = ${budget.min} = Math.round(${d}×${WPS})`)
    ok(budget.max === Math.round(min * L.PASTE_BUDGET_OVERSHOOT) && budget.max > budget.min, `(A3) pasteWordBudget(${d}).max = ${budget.max} (piso × ${L.PASTE_BUDGET_OVERSHOOT}, acima do piso)`)
    ok(P.includes(`- ${d}s: ${min}-${budget.max} words`), `(A3) o prompt diz "- ${d}s: ${min}-${budget.max} words"`)
    ok(P.includes(`${d}s`), `(A3) o prompt oferece a duração ${d}s`)
  }
  // Nenhuma OUTRA faixa "N-M words" ou "Ns:" no texto além das derivadas.
  const ranges = [...P.matchAll(/(\d+)-(\d+) words/g)].map((m) => `${m[1]}-${m[2]}`)
  const derived = L.DURATIONS.map((d) => { const b = L.pasteWordBudget(d); return `${b.min}-${b.max}` })
  ok(ranges.length === L.DURATIONS.length && ranges.every((r) => derived.includes(r)), `(A3) TODA faixa "N-M words" do prompt é derivada da régua (achadas: ${ranges.join(', ')})`)
  const secs = [...P.matchAll(/(\d+)s\b/g)].map((m) => Number(m[1]))
  ok(secs.length > 0 && secs.every((s) => L.DURATIONS.includes(s)), `(A3) todo "Ns" do prompt é uma duração de DURATIONS (achados: ${[...new Set(secs)].join(', ')})`)
  ok(/Running a little over the budget is good/.test(P) && /Coming under it is a defect/.test(P), '(A3) "passar é bom, ficar abaixo é defeito" (CLAUDE.md 02/09)')

  // (A4) o canal novo e o destino do clique
  ok(Array.isArray(L.HANDOFF_CHANNELS) && L.HANDOFF_CHANNELS.includes('paste_page'), `(A4) 'paste_page' ∈ HANDOFF_CHANNELS (${L.HANDOFF_CHANNELS?.join(', ')})`)
  ok(L.isHandoffChannel('paste_page'), '(A4) isHandoffChannel(paste_page) = true')
  ok(L.CHANNEL_TAGS?.paste_page?.utmSource === 'paste_page' && L.CHANNEL_TAGS?.paste_page?.intentCampaign === 'kineo_paste_page', `(A4) CHANNEL_TAGS.paste_page = { paste_page, kineo_paste_page } (achado: ${JSON.stringify(L.CHANNEL_TAGS?.paste_page)})`)
  const utm = (dest) => new URLSearchParams(dest.split('?')[1] ?? '')
  const base = { script: 'Hello world', duration_sec: 60, engine_hint: 'seedance', aspect: '9:16' }
  const dest = utm(L.buildStudioDestination({ ...base, channel: 'paste_page' }))
  ok(dest.get('utm_source') === 'paste_page', `(A4) buildStudioDestination(channel=paste_page) → utm_source=paste_page (achado: ${dest.get('utm_source')})`)
  ok(dest.get('intent_campaign') === 'kineo_paste_page', `(A4) …e intent_campaign=kineo_paste_page (achado: ${dest.get('intent_campaign')})`)
  ok(dest.get('script_mode') === 'verbatim' && dest.get('duration') === '60' && dest.get('engine') === 'seedance', '(A4) o canal muda SÓ as etiquetas: prompt/verbatim/duration/engine iguais')
  ok([...dest.keys()].length === 6, `(A4) a lista de parâmetros continua FECHADA (6 chaves: ${[...dest.keys()].join(',')})`)

  // (A5) REGRESSÃO: os dois canais antigos, byte a byte.
  ok(L.HANDOFF_CHANNELS[0] === 'gpt_store' && L.HANDOFF_CHANNELS[1] === 'assistant_link', '(A5) gpt_store e assistant_link continuam nas posições 0 e 1')
  ok(L.DEFAULT_CHANNEL === 'gpt_store', '(A5) DEFAULT_CHANNEL continua gpt_store')
  ok(L.CHANNEL_TAGS.gpt_store.utmSource === 'chatgpt_gpt' && L.CHANNEL_TAGS.gpt_store.intentCampaign === 'kineo_gpt_store', `(A5) CHANNEL_TAGS.gpt_store = { chatgpt_gpt, kineo_gpt_store } (achado: ${JSON.stringify(L.CHANNEL_TAGS.gpt_store)})`)
  ok(L.CHANNEL_TAGS.assistant_link.utmSource === 'assistant_link' && L.CHANNEL_TAGS.assistant_link.intentCampaign === 'kineo_assistant_link', `(A5) CHANNEL_TAGS.assistant_link = { assistant_link, kineo_assistant_link } (achado: ${JSON.stringify(L.CHANNEL_TAGS.assistant_link)})`)
  ok(utm(L.buildStudioDestination(base)).get('utm_source') === 'chatgpt_gpt', '(A5) linha sem channel → utm_source=chatgpt_gpt (as linhas que já existem)')
  ok(utm(L.buildStudioDestination({ ...base, channel: 'assistant_link' })).get('utm_source') === 'assistant_link', '(A5) channel=assistant_link → utm_source=assistant_link')
  const tagValues = Object.values(L.CHANNEL_TAGS).map((t) => t.utmSource)
  ok(new Set(tagValues).size === tagValues.length, '(A5) nenhum canal reaproveita a utm_source de outro (senão a medição junta os dois)')

  // (A6) o assistente — lista fechada, normalização, desconhecido = null
  ok(Array.isArray(L.PASTE_ASSISTANTS) && ['chatgpt', 'claude', 'gemini', 'perplexity', 'other'].every((a) => L.PASTE_ASSISTANTS.includes(a)) && L.PASTE_ASSISTANTS.length === 5, `(A6) PASTE_ASSISTANTS = ${L.PASTE_ASSISTANTS?.join(', ')}`)
  ok(L.normalizePasteAssistant(' ChatGPT ') === 'chatgpt', '(A6) normalizePasteAssistant aceita maiúsculas e espaços')
  ok(L.normalizePasteAssistant('Claude') === 'claude' && L.normalizePasteAssistant('GEMINI') === 'gemini', '(A6) claude/gemini normalizam')
  ok(L.normalizePasteAssistant('copilot') === null && L.normalizePasteAssistant(42) === null && L.normalizePasteAssistant(null) === null && L.normalizePasteAssistant('') === null, '(A6) desconhecido, número, null e vazio → null')

  // (A7) a validação da rota é a MESMA da Action
  ok(L.validateHandoffInput({ script: 'HOOK: Five things.\nPAYOFF: Done.', durationSec: 60 }).ok === true, '(A7) validateHandoffInput aceita o corpo que a página manda')
}

// ═══ (B) A LIB LIDA — sem número digitado, sem import novo ═════════════════
console.log('\n(B) lib/gptHandoff.ts lida')
{
  // KINEO-GPT-VERDADE-2026-09-07: @/lib/narrationFit entrou (o cobrador; puro, zero import).
  const libImports = [...lib.matchAll(/^import (?:\{[^}]*\}|[^\n{]*) from '([^']+)'/gm)].map((m) => m[1])
  ok(libImports.every((s) => s === '@/lib/aspect' || s === '@/lib/narrationFit' || s === 'node:crypto'), `(B1) a lib continua importando só @/lib/aspect, @/lib/narrationFit e node:crypto (achados: ${libImports.join(', ')})`)
  ok(/export const HANDOFF_CHANNELS = \['gpt_store', 'assistant_link', 'paste_page'\] as const/.test(libCode), "(B2) HANDOFF_CHANNELS = ['gpt_store', 'assistant_link', 'paste_page'] as const")
  ok(/paste_page: \{ utmSource: 'paste_page', intentCampaign: 'kineo_paste_page' \}/.test(libCode), '(B2) CHANNEL_TAGS.paste_page escrito uma vez, na lib')
  ok(/export const ASSISTANT_PASTE_PROMPT_MAX_CHARS = 1500/.test(libCode), '(B3) ASSISTANT_PASTE_PROMPT_MAX_CHARS = 1500 declarado')
  ok(/export const ASSISTANT_PASTE_PROMPT: string = `/.test(libCode), '(B3) o prompt é um TEMPLATE LITERAL (os números entram por interpolação)')
  ok(/const min = Math\.round\(durationSec \* WORDS_PER_SECOND_CLASSIC\)/.test(libCode), '(B3) pasteWordBudget deriva o piso de Math.round(durationSec * WORDS_PER_SECOND_CLASSIC)')
  ok(/const PASTE_BUDGET_LINES = DURATIONS\.map\(/.test(libCode) && /\$\{PASTE_BUDGET_LINES\}/.test(libCode), '(B3) as linhas de faixa nascem de DURATIONS.map e entram no prompt por ${PASTE_BUDGET_LINES}')
  const promptSrc = (libCode.match(/export const ASSISTANT_PASTE_PROMPT: string = `([\s\S]*?)`/) || ['', ''])[1]
  ok(promptSrc.length > 0 && !/\d+-\d+ words/.test(promptSrc), '(B3) NENHUMA faixa "N-M words" digitada no fonte do prompt')
  ok(promptSrc.length > 0 && !/\b(35|60|90)s\b/.test(promptSrc), '(B3) NENHUMA duração "35s/60s/90s" digitada no fonte do prompt (vem de DURATIONS)')
  ok(/export const PASTE_ASSISTANTS = \['chatgpt', 'claude', 'gemini', 'perplexity', 'other'\] as const/.test(libCode), '(B4) PASTE_ASSISTANTS as const')
  ok(/export function normalizePasteAssistant\(raw: unknown\): PasteAssistant \| null/.test(libCode), '(B4) normalizePasteAssistant(raw: unknown): PasteAssistant | null')
}

// ═══ (C) A ROTA — canal, evento, sem CORS, assistente ═══════════════════════
console.log('\n(C) app/api/gpt/handoff/paste/route.ts')
{
  ok(/const CHANNEL: HandoffChannel = 'paste_page'/.test(route), "(C1) CHANNEL: HandoffChannel = 'paste_page'")
  ok(/name: 'paste_handoff_created'/.test(route), "(C2) evento name: 'paste_handoff_created'")
  ok(!/gpt_handoff_created/.test(route), '(C2) NÃO usa o nome do irmão (gpt_handoff_created) — canal medido à parte')
  ok(!/Access-Control-Allow-Origin/.test(route), '(C3) sem Access-Control-Allow-Origin (mesma origem, navegador da própria pessoa)')
  ok(!/\*'/.test(route.replace(/\/\*[\s\S]*?\*\//g, '')) && !/export (async )?function OPTIONS/.test(route), '(C3) sem OPTIONS e sem `*` — nenhum preflight aberto')
  ok(/export async function POST\(req: NextRequest\)/.test(route), '(C4) exporta POST')
  ok(!/export (async )?function GET/.test(route), '(C4) NÃO exporta GET (não é link — é envio da caixa)')
  ok(/const validated = validateHandoffInput\(body\)\s*\n\s*if \(!validated\.ok\) return json\(\{ error: validated\.error \}, 400\)/.test(route), '(C5) a MESMA validação da Action, 400 com a frase da lib (a página mostra a frase)')
  ok(/const assistant = normalizePasteAssistant\(/.test(route), '(C6) assistant normalizado por normalizePasteAssistant')
  ok(/await insertHandoff\(\{[\s\S]*?channel: CHANNEL,\s*\n\s*payload_hash: payloadHash,\s*\n\s*assistant,\s*\n\s*\}\)/.test(route), '(C6) o insert grava channel: CHANNEL, payload_hash e assistant')
  const meta = (route.match(/name: 'paste_handoff_created',[\s\S]*?metadata: \{([\s\S]*?)\n\s*\},\s*\n\s*\}\)/) || ['', ''])[1]
  for (const k of ['assistant', 'words', 'seconds', 'fit', 'duration_sec', 'engine_hint', 'reused', 'channel']) {
    ok(new RegExp(`(^|\\n)\\s*${k}[,:]`).test(meta), `(C7) o evento carrega \`${k}\``)
  }
  ok(/channel: CHANNEL,/.test(meta), '(C7) channel: CHANNEL (nunca string solta)')
  ok(/const payloadHash = handoffPayloadHash\(input, CHANNEL\)/.test(route) && /await findHandoffByPayloadHash\(payloadHash\)/.test(route), '(C8) idempotência: hash com o canal + busca da linha viva antes do insert')
  ok(/return randomBytes\(18\)\.toString\('base64url'\)/.test(route), '(C8) token = randomBytes(18).base64url (o MESMO gerador)')
  ok(/counts\.ip >= RATE_LIMIT_PER_IP_PER_HOUR/.test(route) && /counts\.global >= RATE_LIMIT_GLOBAL_PER_HOUR/.test(route), '(C9) rate limit por IP e global, contado no banco')
  ok(/url: `\$\{origin\}\$\{GO_PATH_PREFIX\}\$\{token\}`/.test(route) && /message: describeFit\(est, input\.durationSec\)/.test(route), '(C10) devolve { url: /go/<token>, …, message }')
  for (const k of ['token', 'expiresAt', 'words: est.words', 'seconds: est.seconds', 'fit: est.fit']) ok(route.includes(k), `(C10) resposta tem ${k.split(':')[0]}`)
  const PAID = /compose|hollywood|cinematic|broll|fal|openai|stripe|credits/i
  const imports = [...route.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  ok(imports.length >= 5 && imports.every((i) => !PAID.test(i)), `(C11) nenhum import de pipeline/fornecedor/crédito (${imports.length} imports)`)
  ok(/export const dynamic = 'force-dynamic'/.test(route) && /export const runtime = 'nodejs'/.test(route), "(C12) force-dynamic + nodejs")
}

// ═══ (D) O STORE — a coluna nova no tipo do insert ══════════════════════════
console.log('\n(D) lib/gptHandoffStore.ts')
// `assistant?` fica ANTES de channel/payload_hash: o guardião irmão
// (test-assistant-deep-link D1) exige que o tipo TERMINE em channel + payload_hash.
ok(/export type NewHandoff = \{[\s\S]*?assistant\?: string \| null\s*\n\s*channel: string\s*\n\s*payload_hash: string \| null\s*\n\}/.test(store), '(D1) NewHandoff aceita assistant?: string | null (antes de channel/payload_hash, que fecham o tipo)')

// ═══ (E) A PÁGINA E O PAINEL ════════════════════════════════════════════════
console.log('\n(E) app/chatgpt/page.tsx + ChatgptPastePanel.tsx')
{
  ok(/\/pricing\?utm_source=paste_page/.test(page), '(E1) K1: link /pricing?utm_source=paste_page na página')
  ok(/<Link href=\{PRICING_HREF\}[^>]*>\s*\n?\s*See plans/.test(page), '(E1) …com o texto "See plans" visível')
  ok(/export const PASTE_ENDPOINT = '\/api\/gpt\/handoff\/paste'/.test(panel) && /fetch\(PASTE_ENDPOINT, \{\s*\n\s*method: 'POST'/.test(panel), "(E2) o painel faz POST para /api/gpt/handoff/paste")
  ok(/window\.location\.href = data\.url/.test(panel), '(E2) sucesso → window.location.href = url (o /go/<token>)')
  ok(/setError\(\s*\n?\s*typeof data\?\.error === 'string'/.test(panel) && /\{error\}/.test(panel), '(E2) erro do servidor vira TEXTO na tela (a frase da rota), nunca alerta mudo')
  ok(!/\balert\(/.test(panel), '(E2) sem alert()')
  ok(/<button type="submit" disabled=\{sending\}/.test(panel), '(E2) botão desabilitado enquanto envia')
  ok(/maxLength=\{scriptMaxChars\}/.test(panel) && /scriptMaxChars=\{SCRIPT_MAX_CHARS\}/.test(page), '(E3) textarea maxLength = SCRIPT_MAX_CHARS (por props, da lib)')
  ok(/durations=\{DURATIONS\}/.test(page) && /defaultDuration=\{DEFAULT_DURATION\}/.test(page), '(E3) durações e padrão vêm da lib por props')
  ok(/prompt=\{ASSISTANT_PASTE_PROMPT\}/.test(page) && /\{prompt\}\s*\n\s*<\/pre>/.test(panel), '(E3) o <pre> mostra ASSISTANT_PASTE_PROMPT, passado por props')
  ok(/assistants=\{PASTE_ASSISTANTS\.map\(/.test(page), '(E3) o select de assistente nasce de PASTE_ASSISTANTS')
  ok(/^'use client'/.test(read(PANEL)), "(E4) o painel é 'use client'")
  ok(!/from '@\/lib\/gptHandoff'/.test(panel), '(E4) o painel NÃO importa @/lib/gptHandoff (node:crypto quebraria o build da Vercel)')
  const panelImports = [...panel.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  ok(panelImports.every((i) => i === 'react' || i === '@/lib/analytics'), `(E4) o painel importa só react e @/lib/analytics (achados: ${panelImports.join(', ')})`)
  ok(!/^'use client'/.test(read(PAGE)) && /from '@\/lib\/gptHandoff'/.test(page), '(E4) a página é server component e importa a lib')
  ok(/import \{ trackEvent \} from '@\/lib\/analytics'/.test(panel), '(E5) evento pelo MESMO trackEvent das páginas públicas')
  ok(/export const PAGE_VIEWED_EVENT = 'chatgpt_page_viewed'/.test(panel) && /void trackEvent\(PAGE_VIEWED_EVENT/.test(panel), "(E5) chatgpt_page_viewed emitido")
  ok(/if \(viewedOnce\.current\) return\s*\n\s*viewedOnce\.current = true/.test(panel), '(E5) …uma vez (ref guarda o modo estrito)')
  ok(/export const PROMPT_COPIED_EVENT = 'chatgpt_prompt_copied'/.test(panel) && /void trackEvent\(PROMPT_COPIED_EVENT/.test(panel), "(E5) chatgpt_prompt_copied emitido no botão Copy prompt")
  ok(/navigator\.clipboard\.writeText\(prompt\)/.test(panel), '(E5) copia o prompt (clipboard API, com fallback de seleção)')
  ok(/'Copy prompt'/.test(panel), '(E5) botão "Copy prompt"')
  for (const host of ['https://chatgpt.com/', 'https://claude.ai/', 'https://gemini.google.com/']) ok(page.includes(host), `(E6) link para ${host}`)
  ok(/target="_blank" rel="noopener noreferrer"/.test(page), '(E6) links externos com target=_blank rel=noopener noreferrer')
  ok(/swapFreeTierCopy as ft/.test(page) && /ft\(OFFER, 'Up to 3 watermarked Fast videos \/ 24h', OFFER\.copy\.chip\)/.test(page), '(E7) a frase do trial vem de @/lib/freeTierOffer via ft(OFFER, …), byte a byte como as irmãs')
  ok(!/\b25 credits\b|\$\d|\b\d+ free credits\b/.test(page + panel), '(E7) nenhum crédito/preço digitado na página nem no painel')
  ok(!/priority queue|1080p|premium voice/i.test(page + panel), '(E7) sem promessa de fila, 1080p ou vozes premium')
  ok(/Nothing is generated until you press Generate/.test(page) && /Nothing renders until you press Generate/.test(panel), '(E8) a página e o painel dizem que NADA renderiza sem o clique no Studio')
  ok(/alternates: \{ canonical: `\$\{BASE\}\/chatgpt` \}/.test(page) && /title: 'ChatGPT Script to Video/.test(page), '(E9) metadata: title + canonical /chatgpt')
  ok(/export const dynamic = 'force-static'/.test(page), '(E9) force-static como a página-molde')
}

// ═══ (F) A MIGRATION ════════════════════════════════════════════════════════
console.log('\n(F) migration')
{
  const migPath = path.join(ROOT, MIGRATION)
  ok(fs.existsSync(migPath), `(F1) ${MIGRATION} existe`)
  const mig = fs.existsSync(migPath) ? read(MIGRATION) : ''
  ok(/alter table public\.gpt_handoffs add column if not exists assistant text;/.test(mig), '(F1) add column if not exists assistant text — idempotente')
  ok(!/create policy/i.test(mig) && !/grant /i.test(mig), '(F1) sem policy/grant nova (a tabela continua deny-all)')
  ok(/PASTE_ASSISTANTS/.test(mig), '(F1) o cabeçalho aponta a lista fechada da lib')
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
