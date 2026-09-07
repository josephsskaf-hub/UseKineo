import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  HANDOFF_TTL_MS,
  GO_PATH_PREFIX,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
  STUDIO_PROMPT_MAX_CHARS,
  describeFit,
  estimateHandoff,
  handoffPayloadHash,
  normalizePasteAssistant,
  validateHandoffInput,
  type HandoffChannel,
} from '@/lib/gptHandoff'
import {
  clientIp,
  countRecentHandoffs,
  findHandoffByPayloadHash,
  handoffPublicOrigin,
  hashIp,
  insertHandoff,
} from '@/lib/gptHandoffStore'

/** Este é o canal da PÁGINA DE COLAR (/chatgpt). Os irmãos: a Action da loja
 *  (app/api/gpt/handoff/route.ts, 'gpt_store') e o GET de qualquer assistente
 *  (app/make/route.ts, 'assistant_link') — mesma linha, mesma página /go. */
const CHANNEL: HandoffChannel = 'paste_page'
const PASTE_PATH = '/api/gpt/handoff/paste'

// ═══ KINEO-PASTE-PAGE-2026-09-07 — o POST que a página /chatgpt chama ═══════
//
// A OpenAI fechou a publicação de GPTs para contas pessoais (16/08/2026): o
// GPT da loja existe como rascunho e não pode ser publicado. Em vez de esperar
// a loja, a Kineo põe no próprio site a página que faz o mesmo trabalho sem
// depender de ninguém: a pessoa copia o prompt, cola no ChatGPT/Claude/Gemini,
// cola o roteiro de volta aqui — e recebe o MESMO /go/<token> da Action.
//
// Linha a linha o irmão app/api/gpt/handoff/route.ts, com três diferenças:
//   · SEM CORS `*`: quem chama é o navegador da própria pessoa, mesma origem.
//     Não há OPTIONS e não há Access-Control-Allow-Origin.
//   · aceita `assistant` (opcional, lista fechada em lib/gptHandoff.ts).
//     Valor desconhecido NÃO derruba o pedido — vira null e a linha nasce.
//   · evento `paste_handoff_created` (não `gpt_handoff_created`), com a
//     sessão do navegador (cookie kineo_event_session_id) para o funil
//     page_viewed → prompt_copied → handoff_created fechar por pessoa.
//
// O que esta rota NÃO faz, e é a regra inteira: não cria conta, não debita
// crédito, não chama fornecedor, não toca em nenhum pipeline de vídeo. O
// Studio abre preenchido e ESPERA O CLIQUE.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** O MESMO gerador do POST da loja: 18 bytes do CSPRNG → 24 chars base64url. */
function newToken(): string {
  return randomBytes(18).toString('base64url')
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Corpo
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Send a JSON body with at least a "script" field.' }, 400)
    }
    const validated = validateHandoffInput(body)
    if (!validated.ok) return json({ error: validated.error }, 400)
    const input = validated.value
    // Qual IA escreveu o roteiro. Desconhecido/ausente = null, nunca 400.
    const assistant = normalizePasteAssistant((body as Record<string, unknown> | null)?.assistant)

    // ── 2. Quem chama (hash, nunca IP cru) e o teto
    const ip = clientIp(req.headers)
    const ipHash = hashIp(ip)
    const counts = await countRecentHandoffs(ipHash)
    if (counts && ipHash && counts.ip >= RATE_LIMIT_PER_IP_PER_HOUR) {
      return json({ error: 'Too many scripts from this connection in the last hour. Try again in a few minutes.' }, 429)
    }
    if (counts && counts.global >= RATE_LIMIT_GLOBAL_PER_HOUR) {
      return json({ error: 'Kineo is receiving a lot of scripts right now. Try again in a few minutes.' }, 429)
    }

    // ── 3. A régua (aviso, não veredito)
    const est = estimateHandoff(input.script, input.durationSec, input.engineHint)

    // ── 4. A linha — ou a linha que JÁ EXISTE para este payload (o mesmo
    // roteiro colado duas vezes reaproveita o token vivo; o índice único
    // parcial em payload_hash faria o segundo insert falhar com 23505).
    const payloadHash = handoffPayloadHash(input, CHANNEL)
    let token: string
    let expiresAt: string
    let reused = false
    const existing = await findHandoffByPayloadHash(payloadHash)
    if (existing) {
      token = existing.token
      expiresAt = existing.expires_at
      reused = true
    } else {
      token = newToken()
      expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString()
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
        assistant,
      })
      if (!inserted.ok) {
        // Corrida: dois envios iguais ao mesmo tempo — o segundo perde no
        // índice único e relê a linha do primeiro.
        const again = inserted.duplicate ? await findHandoffByPayloadHash(payloadHash) : null
        if (!again) {
          console.error('[paste-handoff] insert failed:', inserted.error)
          return json({ error: 'Kineo could not save the script right now. Try again in a minute.' }, 503)
        }
        token = again.token
        expiresAt = again.expires_at
        reused = true
      }
    }

    // ── 5. O degrau do funil — com a sessão do navegador (a chamada vem da
    // própria pessoa, ao contrário da Action, que vem do servidor da OpenAI).
    let sessionId: string | null = null
    try {
      sessionId = cookies().get('kineo_event_session_id')?.value ?? null
    } catch {
      sessionId = null
    }
    await writeServerEvent({
      name: 'paste_handoff_created',
      path: PASTE_PATH,
      sessionId,
      metadata: {
        assistant,
        words: est.words,
        seconds: est.seconds,
        fit: est.fit,
        family: est.family,
        duration_sec: input.durationSec,
        engine_hint: input.engineHint,
        aspect: input.aspect,
        language: input.language,
        script_chars: input.script.length,
        markers_found: est.markersFound,
        over_studio_limit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
        channel: CHANNEL,
        // `reused: true` = a linha já existia; o SQL do funil conta criação
        // por linha (reused=false), não por envio.
        reused,
      },
    })

    const origin = handoffPublicOrigin(req.nextUrl.origin)
    return json({
      url: `${origin}${GO_PATH_PREFIX}${token}`,
      token,
      expiresAt,
      words: est.words,
      seconds: est.seconds,
      fit: est.fit,
      message: describeFit(est, input.durationSec),
    })
  } catch (e) {
    console.error('[paste-handoff] unexpected failure:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Kineo could not process the script right now. Try again in a minute.' }, 503)
  }
}
