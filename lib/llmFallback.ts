import OpenAI from 'openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { alertOpenAiExhausted, looksOpenAiQuotaDead, openAiAlertKind } from '@/lib/openaiAlert'
// FIX-REVISAO-2 (KINEO-PLANO-B-OPENAI-2026-09-28): o plano B gasta a carteira da fal; a recusa dela por saldo toca o alarme único.
import { alertFalExhausted, looksExhausted } from '@/lib/falAlert'

// ═══ KINEO-PLANO-B-OPENAI-2026-09-28 — quando a OpenAI cai, o texto sai pela fal ═══════════════════
//
// O CASO (26/09 16:22Z → 27/09 ~08:35Z): a conta da OpenAI ficou sem crédito ("429 You have no credits
// remaining"). No estágio de roteiro foram 59 tentativas bloqueadas de 9 pessoas externas — 47 no
// escritor de cenas do Kineo 1 (generateScenes, lib/runway.ts, via /api/generate-video-fast) e 12 no
// /api/generate-script —; 8 das 9 nunca tiveram um filme entregue e nenhuma voltou depois do conserto.
// Nos 60 dias anteriores TODO 429 da OpenAI foi falta de crédito (32 de 32) e houve 0 `openai_hang`:
// tentar de novo, ou trocar gpt-4o por gpt-4o-mini NA MESMA CONTA, teria salvo 0 das 59. O único
// segundo fornecedor já pago é a fal (FAL_KEY), que publica um roteador compatível com a API da OpenAI
// (OpenRouter): https://fal.run/openrouter/router/openai/v1, autenticação "Key <FAL_KEY>".
//
// O QUE ESTE ARQUIVO FAZ — ligado em lib/openai.ts, no Proxy, SÓ em `chat.completions.create`:
//   1. a chamada primária roda IGUAL (mesmo corpo, mesmas opções, mesmo cliente);
//   2. se ela falhar com 429, 5xx ou erro de conexão, em MENOS de 8 s, com o interruptor
//      LLM_FALLBACK_ENABLED ligado e FAL_KEY presente, tenta UMA vez pela fal com o MESMO modelo
//      ('openai/' + model), o mesmo corpo, o mesmo timeout e maxRetries 0;
//   3. se a fal também falhar, relança o erro ORIGINAL da OpenAI — o 503 de capacidade, o alarme e o
//      `reason` dos eventos continuam dizendo exatamente o que diziam;
//   4. se a fal salvar a chamada, o fundador AINDA é avisado (alertOpenAiExhausted, mesmo limitador de
//      30 min por tipo) e fica o evento `llm_fallback_used`. É por ele que se conta o plano B depois do
//      deploy: durante um apagão o `openai_quota_dead` cai a zero, e isso NÃO quer dizer que a OpenAI
//      voltou.
//   400/401/422 (pedido ruim, chave errada, recusa de conteúdo) NUNCA vão para o plano B: não são apagão.
//   Chamada com `stream: true` passa direto, sem plano B (hoje nenhum chamador usa stream).
//   A estrada hollywood (Kling 3/H3/Omni/S25, rota /api/generate-video-cinematic) fica SEM plano B de texto: a narração
//   dela não tem voz reserva, e salvar o planejador só pagaria clipes que morrem no compose (ver
//   LLM_FALLBACK_BLOCKED_ROUTES).
// Por que 8 s: o /api/generate-script tem maxDuration 60 e a chamada dele pode levar 35 s; plano B depois
// de um timeout estouraria a rota. Todo erro dos últimos 60 dias foi 429 rápido — o corte não perde nada.
// Por que o mesmo modelo: as réguas de palavras dos prompts foram calibradas no gpt-4o/gpt-4o-mini.
// NÃO VERIFICADO AINDA: os ids 'openai/gpt-4o' e 'openai/gpt-4o-mini' no roteador da fal e o
// response_format json_object. Conferir com GET /api/admin/llm-fallback-probe logo depois do deploy.
// CUSTO: o plano B gasta o saldo pré-pago da fal — a mesma carteira que paga os clipes. Um apagão longo
// da OpenAI esvazia as duas; por isso o alarme continua tocando mesmo quando o plano B salva.

// Interruptor único do plano B de TEXTO (env não se muda na Vercel por nós): false desliga tudo acima.
export const LLM_FALLBACK_ENABLED = true
// Só entra no plano B quem falhou RÁPIDO (ver "Por que 8 s" acima).
export const LLM_FALLBACK_MAX_ELAPSED_MS = 8_000
export const FAL_OPENAI_ROUTER_BASE_URL = 'https://fal.run/openrouter/router/openai/v1'
export const LLM_FALLBACK_EVENT = 'llm_fallback_used'
// Teto dos efeitos colaterais do sucesso (evento + e-mail): nunca seguram a resposta mais que isso. Vale para o texto
// e para a voz (lib/ttsFallback chama o mesmo settleWithin).
export const FALLBACK_SIDE_EFFECTS_MS = 2_500

// ═══ KINEO-PLANO-B-OPENAI-2026-09-28 (revisão adversarial) — a estrada hollywood fica SEM plano B de texto ═══════════
// O defeito que a revisão achou: num apagão, o planejador hollywood (planHollywoodScenes, lib/hollywood/router.ts, chat
// gpt-4o) SAIRIA pela fal, a rota pagaria os clipes à fal (Omni e7918140 ≈ US$ 11,86; H3 7127d8b4 ≈ US$ 5,70) e o
// filme morreria no compose: a narração hollywood é synthesizeHostSpeech (openai.audio.speech tts-1-hd, lib/hollywood/
// hostVoice.ts, trava 8.2), sem plano B — 3 tentativas com 429, 422 cinematic_narration_unverified, crédito estornado e
// o dinheiro dos clipes perdido, depois de o cliente esperar os clipes. Na origin/main o mesmo apagão derrubava o
// planejador ANTES do primeiro POST pago (releaseBirthClaim('hollywood_planner_rejected') → 502, custo zero, resposta
// na hora). Até a narração hollywood ter voz reserva, toda chamada de texto da rota cinematográfica fica como antes:
// a OpenAI ou o erro dela. (Nos 30 dias até 27/09 foram ~24 despachos hollywood e 0 no apagão de 26-27/09 — o defeito
// estava armado, não disparado.) O Kineo 1 e os clássicos (Seedance 1.5/Veo/Kling 2.5) narram por generateTTS, que
// tem a voz reserva de lib/ttsFallback, e seguem com o plano B no generate-script, analyze-idea e compose (o Kineo 1
// também no generate-video-fast).
// FIX-REVISAO-2 KINEO-PLANO-B-OPENAI-2026-09-28 — os clássicos DESPACHAM pela rota cinematográfica: o escritor de cenas
// deles (generateScenes no modo IA, a chamada de texto da rota) fica SEM plano B, exatamente como na origin/main; só a
// narração deles no compose tem a voz reserva. Por isso o log da trava pela ROTA diz "rota cinematográfica" (clássico
// ou hollywood), e só o da MARCA diz "planejador hollywood" — contar filmes hollywood retidos pelo log exige a marca.
// Duas travas, porque a pilha é melhor esforço:
//   (1) a rota lida da pilha = '/api/generate-video-cinematic'. Confiável enquanto o módulo da rota viver SÓ no bundle
//       dela: o webpack do servidor (Next 14, splitChunks minChunks 2) manda para .next/server/chunks/ todo módulo
//       importado por 2+ entradas, e aí a pilha perde o caminho — já é o caso de /api/generate-video-fast (importada
//       pelo cron finish-orphan-jobs) e de /api/compose (cron e ads). O guardião reprova se alguém importar a rota
//       cinematográfica;
//   (2) a marca do system do planejador hollywood (HOLLYWOOD_PLANNER_MARKER, que só existe no prompt de
//       lib/hollywood/router.ts) — não depende do bundle nem da pilha.
export const LLM_FALLBACK_BLOCKED_ROUTES: readonly string[] = ['/api/generate-video-cinematic']
export const HOLLYWOOD_PLANNER_MARKER = 'THE FOUR KEYS TO REALISM'

// ═══ FIX-REVISAO-2 KINEO-PLANO-B-OPENAI-2026-09-28 — o que a 2ª revisão achou no plano B de texto ═══════════════════════
// (1) 200 QUE NÃO É CONCLUSÃO: o roteador (OpenRouter) devolve erro de geração com HTTP 200 e o erro no corpo
//     ({"error":{"message":"Provider returned error","code":502}}, ou choices[0].finish_reason 'error' com conteúdo vazio).
//     A 1ª versão contava isso como sucesso: o escritor de cenas do Kineo 1 quebrava em completion.choices[0] (TypeError →
//     500 genérico 'scene_generation_failed', não o 503 de capacidade com 'openai_quota_dead'), e o fundador recebia
//     "PLANO B ATIVO … O cliente não viu erro". Agora só conta como salvo o que é conclusão de verdade
//     (isRealChatCompletion); o resto é falha do plano B: log e o erro ORIGINAL da OpenAI, sem evento e sem e-mail de
//     plano B — o cliente segue o caminho de capacidade da origin/main.
// (2) SALDO DA FAL: o plano B gasta a mesma carteira pré-paga dos clipes. Quando ela acaba, o roteador recusa com 403
//     {"detail":"User is locked. Reason: Exhausted balance"} e todo filme do Kineo 1 morre NO ROTEIRO, antes de qualquer
//     clipe — nenhum dos alarmes de saldo (kineo1_clip, poll, retry, cinematic) chegava a rodar. Agora a recusa por saldo
//     toca o alarme único (lib/falAlert, fonte 'llm_fallback') e o erro ORIGINAL continua voltando. Dois detalhes:
//       · o SDK da OpenAI só lê {error:{message}}: com o {detail} da fal ele monta "403 status code (no body)" e a frase
//         do saldo sumia antes do looksExhausted — traduzErroDaFal passa o detail para o formato que o SDK lê;
//       · o alarme espera no máximo FAL_BALANCE_ALARM_WAIT_MS (reserva no banco + o teto de 3 s do envio): um Supabase
//         preso no apagão não segura a rota que já vai responder o erro.
export const FAL_BALANCE_ALARM_WAIT_MS = 4_000

type ChatCreateBody = Record<string, unknown> & { model?: unknown; stream?: unknown }
type ChatCreateOptions = { timeout?: unknown; signal?: unknown } & Record<string, unknown>
type FalRouterFetch = NonNullable<NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch']>

export type LlmFallbackPrimaryStatus = number | 'connection' | null

/** Apagão = 429, 5xx ou conexão caída/timeout. Nunca 400/401/403/404/422, nunca abort do próprio chamador. */
export function isOpenAiOutageError(e: unknown): boolean {
  // APIConnectionError é o pai do APIConnectionTimeoutError (ECONNRESET, DNS, "fetch failed", timeout).
  if (e instanceof OpenAI.APIConnectionError) return true
  if (!(e instanceof OpenAI.APIError)) return false
  const status = (e as { status?: unknown }).status
  return typeof status === 'number' && (status === 429 || status >= 500)
}

export function primaryStatusOf(e: unknown): LlmFallbackPrimaryStatus {
  if (e instanceof OpenAI.APIConnectionError) return 'connection'
  const status = (e as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : null
}

/** O mesmo modelo no roteador da fal: gpt-4o → openai/gpt-4o, gpt-4o-mini → openai/gpt-4o-mini. */
export function fallbackModelFor(model: unknown): string | null {
  const m = typeof model === 'string' ? model.trim() : ''
  if (!m) return null
  return m.startsWith('openai/') ? m : `openai/${m}`
}

/** O corpo é do planejador hollywood? Procura HOLLYWOOD_PLANNER_MARKER no texto das mensagens (string ou partes). */
export function isHollywoodPlannerBody(body: unknown): boolean {
  const messages = (body as { messages?: unknown } | null)?.messages
  if (!Array.isArray(messages)) return false
  const temMarca = (text: unknown): boolean => typeof text === 'string' && text.includes(HOLLYWOOD_PLANNER_MARKER)
  return messages.some((m) => {
    const content = (m as { content?: unknown } | null)?.content
    if (Array.isArray(content)) return content.some((p) => temMarca((p as { text?: unknown } | null)?.text))
    return temMarca(content)
  })
}

export type LlmFallbackDecision =
  | { use: true }
  | { use: false; why: 'switch_off' | 'streaming' | 'not_outage' | 'too_slow' | 'no_fal_key' | 'no_model' | 'hollywood_road' }

export function decideLlmFallback(args: {
  err: unknown
  elapsedMs: number
  enabled: boolean
  hasFalKey: boolean
  streaming: boolean
  model: unknown
  /** rota lida da pilha (routeHintFromStack); null quando o bundle não mostra */
  route: string | null
  /** isHollywoodPlannerBody(body) */
  hollywoodPlanner: boolean
}): LlmFallbackDecision {
  if (!args.enabled) return { use: false, why: 'switch_off' }
  if (args.streaming) return { use: false, why: 'streaming' }
  if (!isOpenAiOutageError(args.err)) return { use: false, why: 'not_outage' }
  if (!(args.elapsedMs < LLM_FALLBACK_MAX_ELAPSED_MS)) return { use: false, why: 'too_slow' }
  if (!args.hasFalKey) return { use: false, why: 'no_fal_key' }
  if (!fallbackModelFor(args.model)) return { use: false, why: 'no_model' }
  // Por último: 'hollywood_road' só aparece quando o plano B entraria — o log dele diz que foi retido de propósito.
  if (args.hollywoodPlanner || (args.route !== null && LLM_FALLBACK_BLOCKED_ROUTES.includes(args.route))) {
    return { use: false, why: 'hollywood_road' }
  }
  return { use: true }
}

/**
 * Rota que chamou, lida da pilha capturada na ENTRADA da chamada (antes de qualquer await). O wrapper
 * não recebe a rota — os chamadores vivem em arquivos travados —, e o bundle da Vercel guarda o caminho
 * (…/.next/server/app/api/generate-script/route.js). Melhor esforço: null quando não achar.
 */
export function routeHintFromStack(stack: string | null | undefined): string | null {
  if (!stack) return null
  const m = /[\\/]app[\\/]api[\\/](.+?)[\\/]route\.(?:js|mjs|ts|tsx)\b/.exec(stack)
  return m ? `/api/${m[1].replace(/\\/g, '/')}`.slice(0, 120) : null
}

/**
 * A pilha da ENTRADA da chamada com fôlego de 50 quadros (a Node guarda 10 por padrão, e os quadros assíncronos contam):
 * o quadro da rota pode vir depois de vários da lib. O limite volta ao valor anterior no mesmo tique.
 */
function pilhaDaEntrada(): string | undefined {
  const limite = Error.stackTraceLimit
  try {
    Error.stackTraceLimit = 50
    return new Error().stack
  } finally {
    Error.stackTraceLimit = limite
  }
}

/**
 * FIX-REVISAO-2 — resposta de ERRO da fal ({detail: …}, sem `error`) reescrita no formato que o SDK da OpenAI lê
 * ({error:{message: detail}}), com o MESMO status e os mesmos cabeçalhos. Sem isto o 403 de saldo chega ao looksExhausted
 * como "403 status code (no body)". Resposta de sucesso, corpo que não é JSON ou que já tem `error` passam intactos.
 */
export function traduzErroDaFal(base: FalRouterFetch): FalRouterFetch {
  type Resposta = Awaited<ReturnType<FalRouterFetch>>
  const traduzido = async (...args: Parameters<FalRouterFetch>): Promise<Resposta> => {
    const res = await base(...args)
    if (res.ok) return res
    try {
      const parsed = JSON.parse(await res.clone().text()) as { detail?: unknown; error?: unknown } | null
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.error !== undefined) return res
      const detail = parsed.detail
      const message = typeof detail === 'string' ? detail : detail !== undefined && detail !== null ? JSON.stringify(detail) : ''
      if (!message) return res
      const headers: Array<[string, string]> = []
      res.headers.forEach((valor: string, nome: string) => {
        if (!/^(content-length|content-encoding|transfer-encoding)$/i.test(nome)) headers.push([nome, valor])
      })
      const Classe = res.constructor as unknown as new (body: string, init: { status: number; statusText: string; headers: Array<[string, string]> }) => Resposta
      return new Classe(JSON.stringify({ error: { message: message.slice(0, 500), type: 'fal_error' } }), { status: res.status, statusText: res.statusText, headers })
    } catch {
      return res
    }
  }
  return traduzido as unknown as FalRouterFetch
}

/** O fetch que o SDK usaria sozinho (o shim dele) — campo privado `fetch` do APIClient do SDK 4.x; null se mudar. */
function fetchPadraoDoSdk(client: OpenAI): FalRouterFetch | null {
  const f = (client as unknown as { fetch?: unknown }).fetch
  return typeof f === 'function' ? (f as FalRouterFetch) : null
}

let falRouterMemo: { key: string; client: OpenAI } | null = null

/**
 * Cliente OpenAI apontado para o roteador da fal. A fal autentica com "Key <FAL_KEY>", não "Bearer": o
 * defaultHeaders do SDK é espalhado DEPOIS do authHeaders (node_modules/openai/index.js, defaultHeaders),
 * então este Authorization vence. organization/project nulos para não vazar ids da OpenAI para a fal.
 * `fetchImpl` só existe para o guardião executar o SDK real sem rede.
 */
export function falRouterClient(falKey: string, fetchImpl?: FalRouterFetch): OpenAI {
  if (!fetchImpl && falRouterMemo && falRouterMemo.key === falKey) return falRouterMemo.client
  const opcoes = {
    apiKey: falKey,
    baseURL: FAL_OPENAI_ROUTER_BASE_URL,
    defaultHeaders: { Authorization: `Key ${falKey}` },
    organization: null,
    project: null,
    maxRetries: 0,
    timeout: 20_000,
  }
  // FIX-REVISAO-2 — o mesmo fetch de sempre (o do SDK, ou o do guardião), embrulhado por traduzErroDaFal.
  const semTraducao = new OpenAI({ ...opcoes, ...(fetchImpl ? { fetch: fetchImpl } : {}) })
  const base = fetchImpl ?? fetchPadraoDoSdk(semTraducao)
  const client = base ? new OpenAI({ ...opcoes, fetch: traduzErroDaFal(base) }) : semTraducao
  if (!fetchImpl) falRouterMemo = { key: falKey, client }
  return client
}

/**
 * FIX-REVISAO-2 — a resposta da fal é uma conclusão de chat de VERDADE? Sem `error` no topo, choices[0] com message,
 * finish_reason diferente de 'error' e conteúdo de texto não vazio — ou tool_calls/function_call quando o chamador pediu
 * ferramentas. Um conteúdo vazio também não salva nada: todo chamador de hoje lê o texto (JSON do roteiro/cenas).
 */
export function isRealChatCompletion(result: unknown, body: unknown): boolean {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false
  const r = result as { error?: unknown; choices?: unknown }
  if (r.error !== undefined && r.error !== null) return false
  if (!Array.isArray(r.choices) || r.choices.length === 0) return false
  const primeira = r.choices[0] as { finish_reason?: unknown; message?: unknown; error?: unknown } | null
  if (!primeira || typeof primeira !== 'object') return false
  if (primeira.finish_reason === 'error' || (primeira.error !== undefined && primeira.error !== null)) return false
  const message = primeira.message as { content?: unknown; tool_calls?: unknown; function_call?: unknown } | null | undefined
  if (!message || typeof message !== 'object') return false
  if (typeof message.content === 'string' && message.content.trim().length > 0) return true
  const b = body as { tools?: unknown; functions?: unknown } | null | undefined
  const pediuFerramenta = (Array.isArray(b?.tools) && b.tools.length > 0) || (Array.isArray(b?.functions) && b.functions.length > 0)
  if (!pediuFerramenta) return false
  return (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) || (!!message.function_call && typeof message.function_call === 'object')
}

/** O erro que veio DENTRO de um 200 ({error:{message, code}} no topo ou na 1ª escolha), no formato que looksExhausted lê. */
function erroNoCorpo(result: unknown): { status: number | null; message: string } | null {
  const r = result as { error?: unknown; choices?: unknown } | null
  const primeira = Array.isArray(r?.choices) ? (r?.choices[0] as { error?: unknown } | null | undefined) : undefined
  const e = r?.error ?? primeira?.error
  if (e === undefined || e === null) return null
  if (typeof e === 'string') return { status: null, message: e }
  if (typeof e !== 'object') return null
  const { code, message } = e as { code?: unknown; message?: unknown }
  return { status: typeof code === 'number' ? code : null, message: typeof message === 'string' ? message : '' }
}

/** A forma da resposta rejeitada, para o log — nunca o conteúdo (pode ecoar o roteiro do cliente). */
function formaDaResposta(result: unknown): string {
  const noCorpo = erroNoCorpo(result)
  if (noCorpo) return `erro no corpo ${noCorpo.status ?? '?'}: ${noCorpo.message.slice(0, 120)}`
  const choices = (result as { choices?: unknown } | null)?.choices
  if (!Array.isArray(choices)) return 'sem choices'
  const primeira = choices[0] as { finish_reason?: unknown; message?: { content?: unknown } } | undefined
  const content = primeira?.message?.content
  return `choices ${choices.length}, finish_reason ${String(primeira?.finish_reason)}, conteúdo ${typeof content === 'string' ? `${content.length} caracteres` : typeof content}`
}

/**
 * FIX-REVISAO-2 — a fal recusou o plano B por SALDO? Toca o alarme único de saldo (lib/falAlert, fonte 'llm_fallback'),
 * com teto de espera. Nunca lança e nunca troca o erro que o cliente recebe (o ORIGINAL da OpenAI).
 */
async function avisaSaldoDaFal(falErr: unknown, ctx: { model: string; fallbackModel: string; route: string | null }): Promise<void> {
  try {
    if (!looksExhausted(falErr as Parameters<typeof looksExhausted>[0])) return
    console.error(`[llm-fallback] a fal recusou o plano B por SALDO (${ctx.fallbackModel}) — alarme único de saldo da fal`)
    await settleWithin(FAL_BALANCE_ALARM_WAIT_MS, [
      alertFalExhausted({
        source: 'llm_fallback',
        engine: ctx.fallbackModel,
        context: `plano B de texto (${ctx.route ?? 'rota ?'}): a OpenAI recusou ${ctx.model} e o roteador da fal recusou por saldo — o cliente recebeu o erro de capacidade da OpenAI`,
      }),
    ])
  } catch {
    // o alarme é anotação: nunca troca o erro que o cliente recebe
  }
}

export type LlmFallbackUse = {
  err: unknown
  model: string
  fallback_model: string
  primary_status: LlmFallbackPrimaryStatus
  primary_ms: number
  ms: number
  route: string | null
}

function semSegredo(text: string, falKey: string | null | undefined): string {
  const s = text.slice(0, 240)
  return falKey ? s.split(falKey).join('[fal-key]') : s
}

/** Sucesso do plano B: alarme ao fundador (mesmo limitador de sempre) + evento `llm_fallback_used`. */
export async function registerLlmFallbackUse(use: LlmFallbackUse): Promise<void> {
  const kind: 'quota' | 'hang' | 'rate_limit' = looksOpenAiQuotaDead(use.err) ? openAiAlertKind(use.err) : 'hang'
  // FIX-REVISAO-2 — "Recarregar a OpenAI" só quando a recusa foi de crédito: num 5xx/timeout/rate limit o e-mail do
  // alarme já diz que recarregar NÃO resolve, e o contexto não pode mandar o contrário.
  const context =
    `PLANO B ATIVO (${use.route ?? 'rota ?'}): a OpenAI recusou ${use.model} (${String(use.primary_status)}) e a ` +
    `chamada saiu pela fal (${use.fallback_model}, ${use.ms} ms). O cliente não viu erro, mas cada chamada agora ` +
    `gasta o saldo da fal — o mesmo que paga os clipes. ` +
    (kind === 'quota' ? 'Recarregar a OpenAI.' : 'Não é falta de crédito: acompanhar https://status.openai.com/.')
  await settleWithin(FALLBACK_SIDE_EFFECTS_MS, [
    alertOpenAiExhausted(context, kind),
    writeServerEvent({
      name: LLM_FALLBACK_EVENT,
      path: use.route,
      metadata: {
        model: use.model,
        fallback_model: use.fallback_model,
        primary_status: use.primary_status,
        primary_ms: use.primary_ms,
        ms: use.ms,
        route: use.route,
        alert_kind: kind,
      },
    }),
  ])
}

/**
 * Espera os efeitos colaterais de um plano B (evento + e-mail ao fundador) por no máximo `ms` e nunca lança: um Resend
 * ou um Supabase travado durante o apagão não pode segurar a rota (o fetch do Resend não tem timeout próprio, e o do
 * undici espera 300 s pelos cabeçalhos — o mesmo maxDuration do compose; a classe do defeito de 05/08).
 */
export async function settleWithin(ms: number, tasks: Array<Promise<unknown>>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    await Promise.race([
      Promise.allSettled(tasks),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Embrulha um `chat.completions.create`. A primária é chamada com os MESMOS argumentos; o plano B só
 * entra nas condições de decideLlmFallback; a falha do plano B relança o erro ORIGINAL.
 */
export function withLlmFallback<F extends (...args: never[]) => unknown>(primary: F, cfg: { defaultTimeoutMs: number }): F {
  const call = primary as unknown as (body: ChatCreateBody, options?: ChatCreateOptions) => unknown
  const run = async (body: ChatCreateBody, options?: ChatCreateOptions): Promise<unknown> => {
    const started = Date.now()
    // A pilha é capturada AQUI, na entrada, enquanto o chamador ainda está nela.
    const route = routeHintFromStack(pilhaDaEntrada())
    try {
      return await call(body, options)
    } catch (err) {
      const primaryMs = Date.now() - started
      const falKey = process.env.FAL_KEY
      const hollywoodPlanner = isHollywoodPlannerBody(body)
      const decision = decideLlmFallback({
        err,
        elapsedMs: primaryMs,
        enabled: LLM_FALLBACK_ENABLED,
        hasFalKey: !!falKey,
        streaming: false,
        model: body?.model,
        route,
        hollywoodPlanner,
      })
      if (!decision.use) {
        if (decision.why === 'hollywood_road') {
          // FIX-REVISAO-2 — "estrada hollywood" só com a MARCA do planejador; pela rota é "rota cinematográfica" (os
          // clássicos Seedance 1.5/Veo/Kling 2.5 também despacham por ela).
          console.warn(
            hollywoodPlanner
              ? `[llm-fallback] SEM plano B na estrada hollywood (${route ?? 'rota ?'}, planejador hollywood): ` +
                  `a narração hollywood só tem a voz da OpenAI — o ${String(primaryStatusOf(err))} original volta ANTES de qualquer clipe pago`
              : `[llm-fallback] SEM plano B na rota cinematográfica (${route ?? 'rota ?'}): texto de um clássico (Seedance 1.5/Veo/Kling 2.5) ` +
                  `ou de um motor hollywood — o ${String(primaryStatusOf(err))} original volta, como na origin/main`,
          )
        }
        throw err
      }
      if (!falKey) throw err
      const model = String(body.model)
      const fallbackModel = fallbackModelFor(model) as string
      const fallbackOptions: { timeout: number; maxRetries: number; signal?: AbortSignal } = {
        timeout: typeof options?.timeout === 'number' ? options.timeout : cfg.defaultTimeoutMs,
        maxRetries: 0,
      }
      if (options?.signal) fallbackOptions.signal = options.signal as AbortSignal
      const t1 = Date.now()
      let result: unknown
      try {
        result = await falRouterClient(falKey).chat.completions.create(
          { ...body, model: fallbackModel } as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
          fallbackOptions,
        )
      } catch (fallbackErr) {
        const detail = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        console.error(
          `[llm-fallback] plano B também falhou (${model} → ${fallbackModel}, fal ${String(primaryStatusOf(fallbackErr))}: ` +
            `${semSegredo(detail, falKey)}) — relançando o erro ORIGINAL da OpenAI (${String(primaryStatusOf(err))})`,
        )
        await avisaSaldoDaFal(fallbackErr, { model, fallbackModel, route }) // FIX-REVISAO-2 — saldo da fal: alarme único
        throw err
      }
      // FIX-REVISAO-2 — HTTP 200 não basta: só conclusão de chat de verdade salva a chamada (ver (1) no topo).
      if (!isRealChatCompletion(result, body)) {
        console.error(
          `[llm-fallback] plano B devolveu 200 SEM conclusão de chat (${model} → ${fallbackModel}, ${semSegredo(formaDaResposta(result), falKey)}) ` +
            `— relançando o erro ORIGINAL da OpenAI (${String(primaryStatusOf(err))})`,
        )
        const noCorpo = erroNoCorpo(result)
        if (noCorpo) await avisaSaldoDaFal(noCorpo, { model, fallbackModel, route })
        throw err
      }
      const use: LlmFallbackUse = {
        err,
        model,
        fallback_model: fallbackModel,
        primary_status: primaryStatusOf(err),
        primary_ms: primaryMs,
        ms: Date.now() - t1,
        route,
      }
      console.warn(
        `[llm-fallback] PLANO B: OpenAI ${String(use.primary_status)} em ${route ?? 'rota ?'} → ${fallbackModel} pela fal em ${use.ms} ms`,
      )
      try {
        await registerLlmFallbackUse(use)
      } catch {
        // efeito colateral nunca derruba uma chamada que já foi salva
      }
      return result
    }
  }
  const wrapped = (body: ChatCreateBody, options?: ChatCreateOptions): unknown => {
    // streaming passa direto (o Stream do SDK não tem equivalente seguro aqui): a primária, intocada.
    if (body && body.stream === true) return call(body, options)
    return run(body, options)
  }
  return wrapped as unknown as F
}

const chatMemo = new WeakMap<object, unknown>()

/**
 * O `chat` do cliente com `completions.create` embrulhado; todo o resto (retrieve, list, messages…)
 * passa intacto. Memorizado por cliente: o Proxy de lib/openai devolve sempre o mesmo objeto.
 */
export function chatWithLlmFallback(client: OpenAI, defaultTimeoutMs: number): OpenAI['chat'] {
  const hit = chatMemo.get(client)
  if (hit) return hit as OpenAI['chat']
  const chat = client.chat
  const completions = chat.completions
  const create = withLlmFallback(completions.create.bind(completions), { defaultTimeoutMs })
  const completionsView = new Proxy(completions, {
    get(target, prop) {
      if (prop === 'create') return create
      const value = Reflect.get(target, prop, target) as unknown
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value
    },
  })
  const chatView = new Proxy(chat, {
    get(target, prop) {
      if (prop === 'completions') return completionsView
      const value = Reflect.get(target, prop, target) as unknown
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value
    },
  })
  chatMemo.set(client, chatView)
  return chatView
}
