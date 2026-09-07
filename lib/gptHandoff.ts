// ═══ KINEO-GPT-HANDOFF-2026-09-06 — a regra pura do "link de um clique" ═══
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO: 57% dos cadastros chegam de chatgpt.com
// por CITAÇÃO — a pessoa pede um roteiro ao ChatGPT, recebe o texto + um link
// para usekineo.com, e precisa COLAR no Studio. Metade cola a ordem em vez do
// roteiro. Cada passo perde gente.
//
// A jogada: um GPT na loja da OpenAI escreve o roteiro no formato da casa e
// chama UMA ação nossa (POST /api/gpt/handoff). A ação guarda o roteiro numa
// linha de `gpt_handoffs`, devolve um link curto `/go/<token>`, e a pessoa
// clica UMA vez. O token é o portador durável do roteiro: sobrevive ao
// cadastro, ao OAuth, ao e-mail e à troca de aparelho — a query de URL não.
//
// Este arquivo é PURO de propósito: zero banco, zero rede. Três imports, e só:
// lib/aspect.ts (puro), lib/narrationFit.ts (puro — o COBRADOR, ver
// KINEO-GPT-VERDADE abaixo) e `node:crypto` (builtin, para o hash
// determinístico do payload — KINEO-ASSISTANT-LINK abaixo). Todo o vocabulário
// (motores, réguas, tetos, TTL) mora aqui, e scripts/test-gpt-handoff.mjs EXECUTA estas funções
// (Node 24 despe os tipos; o alias `@/` é resolvido por um hook do próprio
// guardião) além de ler o texto das rotas. Nunca cria conta, nunca debita
// crédito, nunca chama fornecedor — a rota que consome isto também não.
//
// ═══ KINEO-ASSISTANT-LINK-2026-09-06 — o mesmo caminho, por GET ═════════════
// 209 dos 368 cadastros de 14 dias vêm do chatgpt.com, e o POST acima só
// existe para quem publicou um GPT com Action. Um assistente QUALQUER (ChatGPT
// sem action, Claude, Perplexity, Gemini) não sabe fazer POST — mas sabe
// escrever um LINK. `GET /make?script=…` faz exatamente o que a Action faz:
// mesma validação, mesma linha em `gpt_handoffs`, mesma página /go/<token>,
// mesmos eventos. Muda só o verbo e o CANAL (`channel`), para o funil medir os
// dois separados sem redigitar nada.
//
// POR QUE O ENQUADRAMENTO NÃO É DIGITADO AQUI (06/09): este arquivo nasceu com
// a própria lista `['9:16','16:9','1:1']`, digitada à mão, e ela já nasceu
// DIVERGENTE de lib/aspect.ts (a fonte única, KINEO-MULTIFORMATO-2026-09-02):
// faltava o 4:5 do feed do Instagram. Pior: a ação validava, gravava e DEVOLVIA
// o `aspect`, e buildStudioDestination() o jogava fora — 100% dos handoffs
// renderizavam 9:16, inclusive quem pediu YouTube widescreen ao GPT. Regra da
// casa: "a regra vive em vários arquivos" — consertar um portador e deixar o
// outro é meia-verdade. Daqui em diante a lista vem de lib/aspect.ts e o
// guardião reprova qualquer cópia local.
import { ASPECTS, DEFAULT_ASPECT, aspectSpec, normalizeAspect, type Aspect } from '@/lib/aspect'
import {
  AUTOFIT_DOWN_FLOOR_SECONDS,
  AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD,
  autofitDown,
  narrationFit,
} from '@/lib/narrationFit'
import { createHash } from 'node:crypto'

/** Reexportados para quem já importava daqui (página /go, rotas): os nomes
 *  continuam, a fonte mudou. */
export { ASPECTS, DEFAULT_ASPECT, aspectSpec, normalizeAspect }
export type HandoffAspect = Aspect

/** Teto do roteiro aceito pela ação — o MESMO que o Studio cobra
 *  (ANALYZE_PROMPT_MAX_CHARS = 5.000). Nasceu 6.000, e 6.000 estava errado:
 *  o handoff aceitaria um roteiro que o /api/analyze-idea recusa, e o link
 *  chegaria "válido" para morrer na primeira tela do produto. Em 02/09 um
 *  trial vindo do ChatGPT bateu nessa parede SETE VEZES em 21 minutos e foi
 *  embora sem filme e sem pagar (ver lib/studioPromptLimit.ts).
 *
 *  O ganho de recusar aqui é que a parede muda de lugar: em vez de aparecer
 *  na tela de quem já clicou, ela aparece na CONVERSA com o GPT, onde custa
 *  uma reescrita de graça. Um 90s cabe em ~1.800 caracteres — 5.000 é folga,
 *  não aperto. */
export const SCRIPT_MAX_CHARS = 5000
/** Teto do /api/analyze-idea (lib/analyzeLimits.ts). Espelhado aqui em vez de
 *  importado para manter este módulo sem import; o guardião confere o espelho. */
export const STUDIO_PROMPT_MAX_CHARS = 5000
export const TOPIC_MAX_CHARS = 200
export const DURATIONS = [35, 60, 90] as const
export const DEFAULT_DURATION: HandoffDuration = 60
export const DEFAULT_ENGINE: HandoffEngine = 'seedance'
export const DEFAULT_LANGUAGE = 'en'
/** TTL do link: 7 dias. Quem pediu roteiro ao ChatGPT e não clicou em uma
 *  semana não vai clicar; e a linha guarda texto de terceiro, não convém
 *  guardar para sempre. */
export const HANDOFF_TTL_DAYS = 7
export const HANDOFF_TTL_MS = HANDOFF_TTL_DAYS * 24 * 60 * 60 * 1000

// ─── Rate limit ─────────────────────────────────────────────────────────────
// A chamada vem do SERVIDOR da OpenAI, não do navegador da pessoa: o IP é um
// pool de saída compartilhado por TODOS os usuários de TODOS os GPTs. Um teto
// por IP portanto limita o GPT inteiro de uma vez, não uma pessoa — por isso
// ele é generoso (60/h ≈ 5x o total diário de cadastros vindos do ChatGPT em
// 09/2026, por HORA) e existe um teto GLOBAL por hora que protege o banco de
// um laço de script mesmo com IPs variados. Os dois são contados NO BANCO
// (linhas de gpt_handoffs na última hora), porque memória de lambda não é
// compartilhada entre instâncias e mentiria para baixo.
export const RATE_LIMIT_PER_IP_PER_HOUR = 60
export const RATE_LIMIT_GLOBAL_PER_HOUR = 600
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

// ─── Motores ────────────────────────────────────────────────────────────────
// Ids REAIS que o Studio aceita em `?engine=` (app/(dashboard)/studio/
// StudioClient.tsx ENGINES[].key e GenerateClient.tsx:1305). `sora` existe no
// GenerateClient mas não no Studio — fora. `s25` existe nos dois mas o Studio
// IGNORA `?engine=s25` enquanto S25_PUBLIC=false (lib/engineLaunch.ts) — fora
// até o interruptor virar.
export const HANDOFF_ENGINES = ['fast', 'seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni'] as const
export type HandoffEngine = (typeof HANDOFF_ENGINES)[number]
export type HandoffDuration = (typeof DURATIONS)[number]
export type HandoffFamily = 'classic' | 'hollywood'
export type HandoffFit = 'short' | 'ok' | 'long'

/** Nomes que o GPT (e o fundador) usam na conversa, mapeados para o id da URL. */
export const ENGINE_ALIASES: Readonly<Record<string, HandoffEngine>> = {
  kineo1: 'fast',
  kineo: 'fast',
  'kineo-1': 'fast',
  kling25: 'kling',
  'kling-2.5': 'kling',
  'kling2.5': 'kling',
  kling3: 'hollywood',
  'kling-3': 'hollywood',
  minimax: 'h3',
  'minimax-h3': 'h3',
  'omni-flash': 'omni',
  seedance15: 'seedance',
  'seedance-1.5': 'seedance',
}

export const ENGINE_LABELS: Readonly<Record<HandoffEngine, string>> = {
  fast: 'Kineo 1',
  seedance: 'Seedance 1.5',
  kling: 'Kling 2.5',
  veo: 'Veo 3.1',
  hollywood: 'Kling 3',
  h3: 'MiniMax H3',
  omni: 'Omni Flash',
}

// ─── As DUAS réguas (CLAUDE.md 02/09: "padronizar as duas QUEBRA um lado") ──
// clássico  = narração tts-1-hd a 3,1 pal/s (lib/compose.ts TTS_WORDS_PER_SECOND)
// hollywood = personagem fala com a própria voz a 2,3 pal/s
export const WORDS_PER_SECOND_CLASSIC = 3.1
export const WORDS_PER_SECOND_HOLLYWOOD = 2.3
/** Abaixo de 95% do alvo = história interrompida = defeito ('short'). */
export const FIT_SHORT_RATIO = 0.95
/** Passar do alvo é BOM (35→39s, nota 9); só acima de 1,6x vira aviso ('long'). */
export const FIT_LONG_RATIO = 1.6

export function engineFamily(engine: HandoffEngine): HandoffFamily {
  return engine === 'hollywood' || engine === 'h3' || engine === 'omni' ? 'hollywood' : 'classic'
}

export function wordsPerSecondFor(engine: HandoffEngine): number {
  return engineFamily(engine) === 'hollywood' ? WORDS_PER_SECOND_HOLLYWOOD : WORDS_PER_SECOND_CLASSIC
}

export function isHandoffEngine(value: string): value is HandoffEngine {
  return (HANDOFF_ENGINES as readonly string[]).includes(value)
}

/** Aceita id real ou apelido; devolve null para qualquer outra coisa. */
export function normalizeEngineHint(raw: unknown): HandoffEngine | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!key) return null
  if (isHandoffEngine(key)) return key
  return ENGINE_ALIASES[key] ?? null
}

// ─── Contagem de palavras ───────────────────────────────────────────────────
// Os marcadores da casa (HOOK / MICRO REWARD / ESCALATION / PAYOFF, mais os
// irmãos que lib/scriptParser.ts já reconhece) NÃO são falados. A régua mede
// fala, então:
//   · linha que é SÓ o rótulo ("HOOK", "— PAYOFF —", "## ESCALATION", "SCENE 2")
//     é descartada inteira e conta como marcador encontrado;
//   · prefixo inline ("HOOK: Five things…") perde o rótulo, mantém a fala, e
//     também conta como marcador;
//   · direção entre colchetes ("[Pexels: storm]", "[Scene 3]") sai do texto;
//   · palavra = token com ao menos uma letra ou dígito (travessão solto e
//     pontuação não contam).
const MARKER_WORD =
  '(?:HOOK|GANCHO|INTRO|OUTRO|CTA|PAYOFF|PAGAMENTO|ESCALATION|ESCALADA|RHYTHM|RITMO|TITLE|MICRO\\s*(?:REWARD|RECOMPENSA)(?:\\s*\\d+)?|BEAT(?:\\s*\\d+)?|SCENE(?:\\s*\\d+)?|CENA(?:\\s*\\d+)?|FACT(?:\\s*\\d+)?|FATO(?:\\s*\\d+)?|PART(?:\\s*\\d+)?|STEP(?:\\s*\\d+)?)'
/** Linha inteira = rótulo, com cerca opcional de #, *, -, —, [ ] e dois-pontos. */
const MARKER_ONLY_LINE = new RegExp(`^\\s*[#*\\-–—\\[\\(]*\\s*${MARKER_WORD}\\s*[\\]\\)]*\\s*[:.\\-–—]*\\s*[#*\\-–—]*\\s*$`, 'i')
/** Rótulo no começo da linha seguido de dois-pontos/travessão e fala. */
const MARKER_INLINE_PREFIX = new RegExp(`^\\s*[#*\\-–—\\[]*\\s*${MARKER_WORD}\\s*[\\]]*\\s*(?:\\([^)]*\\))?\\s*[:\\-–—]\\s*`, 'i')
const BRACKET_DIRECTION = /\[[^\]]*\]/g

export type ScriptWordCount = {
  words: number
  markersFound: number
  /** Linhas de fala que sobraram depois de tirar rótulos e direções. */
  spokenLines: number
}

export function countScriptWords(script: string): ScriptWordCount {
  let words = 0
  let markersFound = 0
  let spokenLines = 0
  for (const rawLine of (script ?? '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue
    if (MARKER_ONLY_LINE.test(rawLine)) {
      markersFound++
      continue
    }
    let line = rawLine
    if (MARKER_INLINE_PREFIX.test(line)) {
      markersFound++
      line = line.replace(MARKER_INLINE_PREFIX, '')
    }
    line = line.replace(BRACKET_DIRECTION, ' ')
    const tokens = line.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t))
    if (tokens.length === 0) continue
    spokenLines++
    words += tokens.length
  }
  return { words, markersFound, spokenLines }
}

export type HandoffEstimate = {
  words: number
  /** Segundos estimados pela régua do motor, 1 casa decimal. */
  seconds: number
  fit: HandoffFit
  family: HandoffFamily
  wordsPerSecond: number
  markersFound: number
}

export function estimateHandoff(script: string, durationSec: HandoffDuration, engine: HandoffEngine): HandoffEstimate {
  const { words, markersFound } = countScriptWords(script)
  const wordsPerSecond = wordsPerSecondFor(engine)
  const seconds = Math.round((words / wordsPerSecond) * 10) / 10
  const fit: HandoffFit =
    seconds < FIT_SHORT_RATIO * durationSec ? 'short' : seconds > FIT_LONG_RATIO * durationSec ? 'long' : 'ok'
  return { words, seconds, fit, family: engineFamily(engine), wordsPerSecond, markersFound }
}

/** Texto em inglês para a página /go e para o GPT repetir à pessoa. */
export function describeFit(est: Pick<HandoffEstimate, 'fit' | 'seconds' | 'words'>, durationSec: number): string {
  const s = Math.round(est.seconds)
  if (est.fit === 'short') {
    return `About ${s}s of narration for a ${durationSec}s video — the story may end early. Adding a few lines helps; Kineo never stretches a short script.`
  }
  if (est.fit === 'long') {
    return `About ${s}s of narration for a ${durationSec}s video — expect a longer film than the ${durationSec}s target, or trim a little.`
  }
  return `About ${s}s of narration (${est.words} words) — a good fit for a ${durationSec}s video. Running a bit over the target is fine.`
}

// ═══ KINEO-GPT-VERDADE-2026-09-07 — o VEREDITO vem de quem cobra ═══════════
//
// O DEFEITO (medido 07/09): `estimateHandoff` acima REDIGITOU a régua. Ela
// mede com 3,1/2,3 pal/s e chama de 'short' tudo abaixo de 95% — mas quem
// decide o destino do roteiro é lib/narrationFit.ts (chamada por
// app/api/generate-video-cinematic/route.ts e pelo preflight do Studio):
// UMA taxa, 2,3 pal/s, cobertura mínima 0,95, e quando não enche, `autofitDown`
// DESCE o alvo (cobertura ≥ 0,60 e alvo descido ≥ piso) em vez de recusar.
//
// Aritmética, motor clássico, alvo 60s: a régua daqui exige 0,95·60·3,1 = 177
// palavras para dizer 'ok'; o cobrador exige 0,95·60·2,3 = 131. Um roteiro de
// 140-165 palavras — a regra da casa — era marcado 'short' e a página /go
// dizia "the story may end early", sendo que ele renderiza 60s redondos. E na
// direção perigosa: 40 palavras para 60s eram só 'short' aqui e viravam
// RECUSA no Studio depois do cadastro.
//
// A régua por voz (WORDS_PER_SECOND_CLASSIC / _HOLLYWOOD) FICA: ela dimensiona
// o ORÇAMENTO de palavras que o prompt pede ao assistente (pasteWordBudget) e
// o `fit` informativo — "padronizar os dois no mesmo número quebra um lado"
// (CLAUDE.md 02/09). O que muda é só o VEREDITO: ele passa a ser calculado
// pelas MESMAS funções do cobrador, nunca por uma cópia da conta.
//
// Regra da casa: "predicado do cobrador não se redigita". Se narrationFit
// mudar, isto muda junto, sem ninguém precisar lembrar.
export type HandoffOutcomeKind = 'at_target' | 'shorter_film' | 'too_short'
export interface HandoffOutcome {
  kind: HandoffOutcomeKind
  /** segundos de filme que a pessoa vai receber de fato */
  effectiveSeconds: number
  /** o que ela pediu */
  requestedSeconds: number
  /** palavras que faltam para encher o alvo pedido; 0 quando cabe */
  missingWords: number
  /** true quando pediu >=60s e o filme sai <60s (sai do TikTok Creator Rewards) */
  lost60sFloor: boolean
}

/** O piso da descida é o do CAMINHO que o motor percorre no servidor: o
 *  planner hollywood trava o alvo em Math.max(30, …) (route.ts), o clássico
 *  não. Mesma escolha que a rota faz com `hollywoodPath`. */
export function autofitFloorFor(engine: HandoffEngine): number {
  return engineFamily(engine) === 'hollywood' ? AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD : AUTOFIT_DOWN_FLOOR_SECONDS
}

export function handoffOutcome(script: string, durationSec: HandoffDuration, engine: HandoffEngine): HandoffOutcome {
  const fit = narrationFit(script, durationSec)
  if (fit.ok) {
    return { kind: 'at_target', effectiveSeconds: durationSec, requestedSeconds: durationSec, missingWords: 0, lost60sFloor: false }
  }
  const descida = autofitDown(script, durationSec, { floorSeconds: autofitFloorFor(engine) })
  if (descida.applied) {
    return {
      kind: 'shorter_film',
      effectiveSeconds: descida.effectiveSeconds,
      requestedSeconds: durationSec,
      missingWords: 0,
      lost60sFloor: descida.lost60sFloor,
    }
  }
  return {
    kind: 'too_short',
    effectiveSeconds: durationSec,
    requestedSeconds: durationSec,
    missingWords: fit.missingWords,
    lost60sFloor: false,
  }
}

/** A frase para a pessoa (página /go, resposta da Action). Diz o que VAI
 *  acontecer, não o que a régua achou. */
export function describeOutcome(o: HandoffOutcome): string {
  if (o.kind === 'at_target') return `Ready for a ${o.requestedSeconds}-second film.`
  if (o.kind === 'shorter_film') {
    const base =
      `This script fills about ${o.effectiveSeconds} seconds, so Kineo will make it a ${o.effectiveSeconds}-second film instead of ${o.requestedSeconds}. ` +
      `Nothing gets cut — the target shrinks to fit your script.`
    return o.lost60sFloor ? `${base} Films under 60 seconds don't qualify for TikTok's Creator Rewards.` : base
  }
  return `This script is too short for a ${o.requestedSeconds}-second film — Kineo would refuse it. Add about ${o.missingWords} more words, or ask for a shorter video.`
}

// ─── Validação da entrada da ação ───────────────────────────────────────────
/** `<` seguido de letra ou `/` = tag HTML. Roteiro é fala; tag nunca é fala. */
export const HTML_TAG_PATTERN = /<[a-zA-Z/]/
export const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/

export type HandoffInput = {
  script: string
  durationSec: HandoffDuration
  aspect: HandoffAspect
  engineHint: HandoffEngine
  language: string
  topic: string | null
}

export type HandoffValidation = { ok: true; value: HandoffInput } | { ok: false; error: string }

export function validateHandoffInput(body: unknown): HandoffValidation {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const scriptRaw = b.script
  if (typeof scriptRaw !== 'string' || !scriptRaw.trim()) {
    return { ok: false, error: 'script is required: send the narration text as a string.' }
  }
  const script = scriptRaw.replace(/\r\n/g, '\n').trim()
  if (script.length > SCRIPT_MAX_CHARS) {
    return { ok: false, error: `script is too long (${script.length} characters; ${SCRIPT_MAX_CHARS} max). Trim it and try again.` }
  }
  if (HTML_TAG_PATTERN.test(script)) {
    return { ok: false, error: 'script must be plain text — remove HTML tags.' }
  }

  let durationSec: HandoffDuration = DEFAULT_DURATION
  if (b.durationSec !== undefined && b.durationSec !== null) {
    const n = typeof b.durationSec === 'number' ? b.durationSec : Number(b.durationSec)
    if (!(DURATIONS as readonly number[]).includes(n)) {
      return { ok: false, error: `durationSec must be one of ${DURATIONS.join(', ')}.` }
    }
    durationSec = n as HandoffDuration
  }

  // Aqui NÃO se usa normalizeAspect(): ela engole valor inválido e devolve
  // 9:16 em silêncio, o que serve para URL e banco, mas não para a AÇÃO — o
  // GPT precisa do 400 para aprender a lista certa em vez de entregar um
  // Short para quem pediu widescreen. A lista é a de lib/aspect.ts (4 formatos).
  let aspect: HandoffAspect = DEFAULT_ASPECT
  if (b.aspect !== undefined && b.aspect !== null) {
    if (typeof b.aspect !== 'string' || !(ASPECTS as readonly string[]).includes(b.aspect)) {
      return { ok: false, error: `aspect must be one of ${ASPECTS.join(', ')}.` }
    }
    aspect = b.aspect as HandoffAspect
  }

  let engineHint: HandoffEngine = DEFAULT_ENGINE
  if (b.engineHint !== undefined && b.engineHint !== null && b.engineHint !== '') {
    const normalized = normalizeEngineHint(b.engineHint)
    if (!normalized) {
      return { ok: false, error: `engineHint must be one of ${HANDOFF_ENGINES.join(', ')}.` }
    }
    engineHint = normalized
  }

  let language = DEFAULT_LANGUAGE
  if (b.language !== undefined && b.language !== null && b.language !== '') {
    if (typeof b.language !== 'string' || !LANGUAGE_PATTERN.test(b.language)) {
      return { ok: false, error: 'language must be a short code like en, pt or pt-BR.' }
    }
    language = b.language
  }

  let topic: string | null = null
  if (b.topic !== undefined && b.topic !== null && b.topic !== '') {
    if (typeof b.topic !== 'string') return { ok: false, error: 'topic must be a string.' }
    const t = b.topic.trim()
    if (t.length > TOPIC_MAX_CHARS) return { ok: false, error: `topic is too long (${TOPIC_MAX_CHARS} characters max).` }
    if (HTML_TAG_PATTERN.test(t)) return { ok: false, error: 'topic must be plain text — remove HTML tags.' }
    topic = t || null
  }

  return { ok: true, value: { script, durationSec, aspect, engineHint, language, topic } }
}

// ─── Destino do clique ──────────────────────────────────────────────────────
export const HANDOFF_UTM_SOURCE = 'chatgpt_gpt'
export const HANDOFF_INTENT_CAMPAIGN = 'kineo_gpt_store'
export const STUDIO_CREATE_PATH = '/studio/create'
export const GO_PATH_PREFIX = '/go/'

/** Token url-safe, >= 16 chars. Só aceitamos o que nós mesmos geramos. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export function isHandoffToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}

// ─── Canal (KINEO-ASSISTANT-LINK-2026-09-06) ────────────────────────────────
// Por onde a linha nasceu. `gpt_store` = a Action do GPT publicado (POST);
// `assistant_link` = qualquer assistente escrevendo o link GET /make. As
// etiquetas de medição (utm_source / intent_campaign) são por canal, e as do
// `gpt_store` são EXATAMENTE as constantes de sempre — mudar o valor delas
// quebraria a medição do que já está no ar.
// `paste_page` (KINEO-PASTE-PAGE-2026-09-07): a página /chatgpt do PRÓPRIO
// site. A OpenAI fechou a publicação de GPTs para contas pessoais (só
// workspaces Business/Enterprise desde 16/08/2026), então a loja deixou de ser
// um caminho que a Kineo controla. A página dá à pessoa o PROMPT para colar no
// ChatGPT/Claude/Gemini e uma caixa para colar de volta o roteiro que a IA
// escreveu — que vira a MESMA linha e o MESMO /go/<token>. Terceiro canal,
// terceira etiqueta; as duas antigas continuam byte a byte.
export const HANDOFF_CHANNELS = ['gpt_store', 'assistant_link', 'paste_page'] as const
export type HandoffChannel = (typeof HANDOFF_CHANNELS)[number]
/** Linha sem `channel` (as que já existem no banco) é da loja. */
export const DEFAULT_CHANNEL: HandoffChannel = 'gpt_store'

export function isHandoffChannel(value: unknown): value is HandoffChannel {
  return typeof value === 'string' && (HANDOFF_CHANNELS as readonly string[]).includes(value)
}

export const CHANNEL_TAGS: Readonly<Record<HandoffChannel, { utmSource: string; intentCampaign: string }>> = {
  gpt_store: { utmSource: HANDOFF_UTM_SOURCE, intentCampaign: HANDOFF_INTENT_CAMPAIGN },
  assistant_link: { utmSource: 'assistant_link', intentCampaign: 'kineo_assistant_link' },
  paste_page: { utmSource: 'paste_page', intentCampaign: 'kineo_paste_page' },
}

// ─── A página de colar (KINEO-PASTE-PAGE-2026-09-07) ────────────────────────
/** Qual assistente escreveu o roteiro colado. Lista FECHADA: é o número que
 *  diz se vale a pena escrever documentação para Claude/Gemini além do
 *  ChatGPT. Valor desconhecido vira null — nunca derruba o pedido. */
export const PASTE_ASSISTANTS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'other'] as const
export type PasteAssistant = (typeof PASTE_ASSISTANTS)[number]

export function normalizePasteAssistant(raw: unknown): PasteAssistant | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase()
  return (PASTE_ASSISTANTS as readonly string[]).includes(key) ? (key as PasteAssistant) : null
}

/** Teto do prompt que a pessoa cola no assistente. Prompt maior que isto não
 *  cabe numa leitura e o guardião (scripts/test-chatgpt-paste-page.mjs)
 *  reprova. */
export const ASSISTANT_PASTE_PROMPT_MAX_CHARS = 1500
/** Folga acima do alvo na faixa de palavras do prompt: passar do alvo é BOM
 *  (35→39s, nota 9), ficar abaixo é defeito. O piso da faixa é o alvo exato. */
export const PASTE_BUDGET_OVERSHOOT = 1.08

/** A faixa de palavras de uma duração, DERIVADA da régua clássica (o prompt
 *  escreve para o motor padrão, que é clássico). Nenhum número digitado: mudar
 *  a régua muda o prompt sozinho. */
export function pasteWordBudget(durationSec: HandoffDuration): { min: number; max: number } {
  const min = Math.round(durationSec * WORDS_PER_SECOND_CLASSIC)
  return { min, max: Math.round(min * PASTE_BUDGET_OVERSHOOT) }
}

const PASTE_BUDGET_LINES = DURATIONS.map((d) => {
  const { min, max } = pasteWordBudget(d)
  return `- ${d}s: ${min}-${max} words`
}).join('\n')

/** O prompt que a pessoa cola no ChatGPT/Claude/Gemini. Em inglês (público
 *  EUA). Os números vêm de DURATIONS e da régua; o texto pede SÓ o roteiro de
 *  volta, em bloco de texto puro, no formato que lib/scriptParser.ts já lê. */
export const ASSISTANT_PASTE_PROMPT: string = `Write a narration script for a short faceless video. Use exactly these four labels, each on its own line, in this order:

HOOK:
MICRO REWARD:
ESCALATION:
PAYOFF:

HOOK: one or two sentences with a concrete, surprising claim. No "Did you know", no "In this video".
MICRO REWARD: pay the hook off fast with one satisfying detail.
ESCALATION: a few beats that raise the stakes: what happened next, what it cost, the number that changes everything.
PAYOFF: the resolution or twist, then one closing line that lands. No call to action.

Before writing, ask me one question: how long should the video be? ${DURATIONS.map((d) => `${d}s`).join(', ')}. Then write to the word budget for that length, counting only the spoken words:
${PASTE_BUDGET_LINES}
Running a little over the budget is good. Coming under it is a defect: the story gets cut short. If you are under, add a real beat; do not pad.

Rules: write in English. Use only facts you are confident are verifiable (dates, places, names, quantities); if you are not sure of a number, rewrite the sentence without it; never invent quotes or statistics. Everything you write is spoken aloud: no camera directions, no visual descriptions, no [brackets], no hashtags, no emoji, no markdown, no title. Plain sentences, one idea per sentence.

Reply with ONLY the script, as one plain-text block, nothing before or after it.`

/** O GET que qualquer assistente sabe escrever: `/make?script=…&duration=60`. */
export const ASSISTANT_LINK_PATH = '/make'

/** KINEO-ASSISTANT-DISCOVERY-2026-09-06 — onde o formato do link está descrito
 *  em texto (app/llms.txt/route.ts). Fonte ÚNICA do caminho: o `<link
 *  rel="alternate">` do root layout e o Allow/ponteiro de app/robots.ts leem
 *  daqui, para que o /llms.txt nunca seja anunciado num endereço e servido em
 *  outro. */
export const LLMS_TXT_PATH = '/llms.txt'

/** A URL do Studio já preenchido. Lista FECHADA de parâmetros — o valor vem de
 *  uma linha do banco escrita por terceiro; chave arbitrária é como se abre
 *  redirecionamento aberto.
 *
 *  `aspect` (06/09): o Studio lê `?aspect=` (GenerateClient.tsx:1252,
 *  normalizeAspect) e o valor viaja até o compose/fal — a capacidade sempre
 *  existiu ponta a ponta; era esta função que a jogava fora. A chave só é
 *  emitida quando o formato normalizado NÃO é o padrão: é o mesmo padrão
 *  `...(aspectRequested !== '9:16' ? { aspect } : {})` do GenerateClient, e
 *  a regra de segurança de lib/aspect.ts (9:16 é o default, nada muda para
 *  quem não pediu outro formato). Assim o link de quem pede Shorts continua
 *  byte a byte igual ao de antes. Valor inválido na linha normaliza para o
 *  padrão e some da URL — nunca passa cru.
 *
 *  `channel` (06/09, KINEO-ASSISTANT-LINK): decide SÓ as duas etiquetas de
 *  medição, via CHANNEL_TAGS. Linha sem canal (ou com canal desconhecido) cai
 *  em DEFAULT_CHANNEL = 'gpt_store' — byte a byte o destino de antes. */
export function buildStudioDestination(row: {
  script: string
  duration_sec: number
  engine_hint: string
  channel?: string | null
  aspect: string
}): string {
  const q = new URLSearchParams()
  q.set('prompt', row.script)
  q.set('script_mode', 'verbatim')
  q.set('duration', String(row.duration_sec))
  q.set('engine', isHandoffEngine(row.engine_hint) ? row.engine_hint : DEFAULT_ENGINE)
  const aspect = normalizeAspect(row.aspect)
  if (aspect !== DEFAULT_ASPECT) q.set('aspect', aspect)
  const tags = CHANNEL_TAGS[isHandoffChannel(row.channel) ? row.channel : DEFAULT_CHANNEL]
  q.set('utm_source', tags.utmSource)
  q.set('intent_campaign', tags.intentCampaign)
  return `${STUDIO_CREATE_PATH}?${q.toString()}`
}

// ─── O link GET → a MESMA validação da Action ───────────────────────────────
/** Traduz a querystring de `/make` para o objeto que `validateHandoffInput`
 *  já valida, e então CHAMA `validateHandoffInput` — nenhuma regra é
 *  duplicada aqui. Sinônimos aceitos: `prompt` = `script`, `durationSec` =
 *  `duration`, `engineHint` = `engine`. Chave desconhecida é ignorada — e é
 *  por isso que `create_intent`/`autoanalyze`/`studio` NUNCA entram: o único
 *  destino é o de `buildStudioDestination`, com a lista fechada dele. */
export function parseAssistantLinkQuery(sp: URLSearchParams): HandoffValidation {
  const pick = (...names: string[]): string | undefined => {
    for (const n of names) {
      const v = sp.get(n)
      if (v !== null && v !== '') return v
    }
    return undefined
  }
  const body: Record<string, unknown> = {
    script: pick('script', 'prompt'),
    durationSec: pick('duration', 'durationSec'),
    aspect: pick('aspect'),
    engineHint: pick('engine', 'engineHint'),
    language: pick('language'),
    topic: pick('topic'),
  }
  return validateHandoffInput(body)
}

/** sha256 de um JSON com as chaves em ORDEM FIXA — mesma entrada, mesmo hash.
 *  É a chave de idempotência da linha: o mesmo link clicado 3× (ou o mesmo
 *  roteiro reenviado pela Action) é UMA linha, senão o funil
 *  created→viewed→clicked mente. O canal entra no hash: a mesma entrada por
 *  dois canais são duas linhas, porque são duas medições. */
export function handoffPayloadHash(input: HandoffInput, channel: HandoffChannel): string {
  const canonical = JSON.stringify([
    ['channel', channel],
    ['script', input.script],
    ['durationSec', input.durationSec],
    ['aspect', input.aspect],
    ['engineHint', input.engineHint],
    ['language', input.language],
    ['topic', input.topic],
  ])
  return createHash('sha256').update(canonical).digest('hex')
}

/** Primeiras palavras do roteiro quando o GPT não mandou tópico. */
export function handoffHeadline(row: { topic: string | null; script: string }): string {
  if (row.topic && row.topic.trim()) return row.topic.trim()
  const spoken = (row.script ?? '')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !MARKER_ONLY_LINE.test(l))
    .map((l) => l.replace(MARKER_INLINE_PREFIX, '').replace(BRACKET_DIRECTION, ' ').trim())
    .find((l) => l.length > 0)
  if (!spoken) return 'Your script'
  const words = spoken.split(/\s+/).slice(0, 9).join(' ')
  return words.length < spoken.length ? `${words}…` : words
}
