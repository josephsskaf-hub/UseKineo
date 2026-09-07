import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  ASSISTANT_LINK_PATH,
  GO_PATH_PREFIX,
  HANDOFF_TTL_MS,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
  STUDIO_PROMPT_MAX_CHARS,
  estimateHandoff,
  handoffOutcome,
  handoffPayloadHash,
  parseAssistantLinkQuery,
  type HandoffChannel,
} from '@/lib/gptHandoff'
import {
  clientIp,
  countRecentHandoffs,
  findHandoffByPayloadHash,
  hashIp,
  insertHandoff,
  isLikelyBot,
} from '@/lib/gptHandoffStore'

// ═══ KINEO-ASSISTANT-LINK-2026-09-06 — o link que QUALQUER assistente escreve ═
//
// 209 dos 368 cadastros de 14 dias vêm do chatgpt.com. Hoje o ChatGPT escreve
// o roteiro e manda a pessoa COLAR em usekineo.com; metade cola a ordem em vez
// do roteiro. A Action da loja (POST /api/gpt/handoff) resolve isso — mas só
// para o GPT publicado. Um assistente qualquer (ChatGPT sem action, Claude,
// Perplexity, Gemini) não sabe fazer POST; sabe escrever um LINK.
//
// Este GET faz EXATAMENTE o que a Action faz: mesma validação
// (parseAssistantLinkQuery → validateHandoffInput), mesma linha em
// `gpt_handoffs`, mesma página /go/<token>, mesmo evento. Muda o verbo e o
// canal ('assistant_link'), para o funil medir os dois separados.
//
// POR QUE NÃO MANDAR O ASSISTENTE MONTAR /studio/create?prompt=… DIRETO: o
// público é DESLOGADO; a query atravessa /signup?redirect= que corta cada
// valor em 2.000 chars, e há dúvida registrada sobre sobreviver ao OAuth. O
// token curto elimina os dois riscos — /go/<token> já resolve o deslogado.
//
// O QUE ESTA ROTA NUNCA FAZ: não gera nada, não cobra nada, não cria conta.
// O Studio abre preenchido e ESPERA O CLIQUE da pessoa. Os parâmetros que
// disparam render sozinhos (os do Studio, não os daqui) não são aceitos nem
// documentados: um link de terceiro jamais pode gastar o crédito de quem
// clica. A lista fechada de parâmetros do destino é a de buildStudioDestination.
//
// Quem clica é um HUMANO: erro nunca vira JSON cru — vira 302 para a página
// que explica o caminho, com um slug curto de lista fechada (nunca o texto do
// erro na URL, nunca o roteiro em URL ou evento).
//
// A RÉGUA POR VOZ AVISA; O COBRADOR DECIDE (KINEO-GPT-VERDADE-2026-09-07).
// Igual à Action: o VEREDITO vem de `handoffOutcome` (as mesmas funções de
// lib/narrationFit.ts que o Studio usa antes de gastar), e o único caso
// recusado aqui é o único que o Studio recusaria depois: `too_short`. Nada é
// gravado nesse caso. Por ser um navegador, a recusa segue o MESMO mecanismo
// dos outros erros: 302 com o slug `script_too_short` — a frase por pedido de
// describeOutcome (segundos, palavras que faltam) NÃO viaja na URL; a página
// de pouso tem a frase estática do slug e o caminho de colar de novo.
export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 (#17): rota SÓ-GET nasce com o Data Cache do
// Next ligado e serviria a MESMA leitura do banco para todo mundo.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 15

const CHANNEL: HandoffChannel = 'assistant_link'
const LANDING = '/chatgpt-to-youtube-shorts'

/** Lista FECHADA de slugs que podem ir na URL de volta. */
const HANDOFF_ERROR_SLUGS = [
  'script_missing',
  'script_too_long',
  'script_too_short',
  'script_html',
  'bad_duration',
  'bad_aspect',
  'bad_engine',
  'bad_language',
  'bad_topic',
  'invalid',
  'rate_limited',
  'unavailable',
] as const
type HandoffErrorSlug = (typeof HANDOFF_ERROR_SLUGS)[number]

/** Classifica a frase de validateHandoffInput num slug — a frase NUNCA viaja. */
function errorSlug(message: string): HandoffErrorSlug {
  if (message.startsWith('script is required')) return 'script_missing'
  if (message.startsWith('script is too long')) return 'script_too_long'
  if (message.startsWith('script must be plain text')) return 'script_html'
  if (message.startsWith('durationSec')) return 'bad_duration'
  if (message.startsWith('aspect')) return 'bad_aspect'
  if (message.startsWith('engineHint')) return 'bad_engine'
  if (message.startsWith('language')) return 'bad_language'
  if (message.startsWith('topic')) return 'bad_topic'
  return 'invalid'
}

function landing(origin: string, slug?: HandoffErrorSlug): NextResponse {
  const url = slug ? `${origin}${LANDING}?handoff_error=${slug}` : `${origin}${LANDING}`
  return NextResponse.redirect(url, 302)
}

function go(origin: string, token: string): NextResponse {
  return NextResponse.redirect(`${origin}${GO_PATH_PREFIX}${token}`, 302)
}

/** O MESMO gerador do POST: 18 bytes do CSPRNG → 24 chars base64url. */
function newToken(): string {
  return randomBytes(18).toString('base64url')
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  try {
    // ── 1. A querystring → a MESMA validação da Action
    const validated = parseAssistantLinkQuery(req.nextUrl.searchParams)
    if (!validated.ok) return landing(origin, errorSlug(validated.error))
    const input = validated.value

    // ── 2. Quem chama (hash, nunca IP cru) e o teto — igual ao POST
    const ip = clientIp(req.headers)
    const ipHash = hashIp(ip)
    const counts = await countRecentHandoffs(ipHash)
    if (counts && ipHash && counts.ip >= RATE_LIMIT_PER_IP_PER_HOUR) {
      return landing(origin, 'rate_limited')
    }
    if (counts && counts.global >= RATE_LIMIT_GLOBAL_PER_HOUR) {
      return landing(origin, 'rate_limited')
    }

    // ── 3. Robô (prefetch de chat, link-preview, varredor): NÃO grava linha.
    // Uma linha por preview inflaria o funil "criado" sem humano por perto.
    const bot = isLikelyBot(req.headers.get('user-agent'))
    if (bot) return landing(origin)

    // ── 4. A régua (aviso), o veredito (do cobrador) e a chave de idempotência
    const est = estimateHandoff(input.script, input.durationSec, input.engineHint)
    const outcome = handoffOutcome(input.script, input.durationSec, input.engineHint)
    if (outcome.kind === 'too_short') {
      // Sem linha, sem link: o Studio recusaria este roteiro para esta
      // duração. Humano no navegador → o mesmo 302 dos outros erros.
      return landing(origin, 'script_too_short')
    }
    const payloadHash = handoffPayloadHash(input, CHANNEL)

    // ── 5. A linha que já existe — o mesmo link clicado 3× é UMA linha
    let token: string
    let reused = false
    const existing = await findHandoffByPayloadHash(payloadHash)
    if (existing) {
      token = existing.token
      reused = true
    } else {
      token = newToken()
      const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString()
      const inserted = await insertHandoff({
        token,
        script: input.script,
        duration_sec: input.durationSec,
        aspect: input.aspect,
        engine_hint: input.engineHint,
        language: input.language,
        topic: input.topic,
        words: est.words,
        seconds: est.seconds,
        fit: est.fit,
        expires_at: expiresAt,
        ip_hash: ipHash,
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 400) || null,
        channel: CHANNEL,
        payload_hash: payloadHash,
      })
      if (!inserted.ok) {
        // Corrida: dois cliques iguais ao mesmo tempo — o segundo perde no
        // índice único e relê a linha do primeiro.
        const again = inserted.duplicate ? await findHandoffByPayloadHash(payloadHash) : null
        if (!again) {
          console.error('[assistant-link] insert failed:', inserted.error)
          return landing(origin, 'unavailable')
        }
        token = again.token
        reused = true
      }
    }

    // ── 6. O degrau do funil — o MESMO evento do POST, com o canal
    let sessionId: string | null = null
    try {
      sessionId = cookies().get('kineo_event_session_id')?.value ?? null
    } catch {
      sessionId = null
    }
    await writeServerEvent({
      name: 'gpt_handoff_created',
      path: ASSISTANT_LINK_PATH,
      sessionId,
      metadata: {
        words: est.words,
        seconds: est.seconds,
        fit: est.fit,
        family: est.family,
        duration_sec: input.durationSec,
        engine_hint: input.engineHint,
        aspect: input.aspect,
        language: input.language,
        has_topic: Boolean(input.topic),
        script_chars: input.script.length,
        markers_found: est.markersFound,
        // KINEO-GPT-VERDADE: o veredito do cobrador, para medir quantos links
        // nascem para um filme mais curto que o pedido (sem coluna nova).
        outcome: outcome.kind,
        effective_seconds: outcome.effectiveSeconds,
        over_studio_limit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
        bot: false,
        channel: CHANNEL,
        // `reused: true` = a linha já existia; o SQL do funil conta criação
        // por linha (reused=false), não por clique.
        reused,
      },
    })

    return go(origin, token)
  } catch (e) {
    console.error('[assistant-link] unexpected failure:', e instanceof Error ? e.message : String(e))
    return landing(origin, 'unavailable')
  }
}
