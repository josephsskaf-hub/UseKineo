import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  HANDOFF_TTL_MS,
  GO_PATH_PREFIX,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
  STUDIO_PROMPT_MAX_CHARS,
  describeFit,
  estimateHandoff,
  validateHandoffInput,
} from '@/lib/gptHandoff'
import {
  clientIp,
  countRecentHandoffs,
  handoffPublicOrigin,
  hashIp,
  insertHandoff,
} from '@/lib/gptHandoffStore'

// ═══ KINEO-GPT-HANDOFF-2026-09-06 — a AÇÃO que o GPT da loja chama ══════════
//
// POST público, sem chave: a chamada vem do servidor da OpenAI em nome de uma
// pessoa que ainda não tem conta. Recebe o roteiro que o GPT escreveu no
// formato da casa, valida SEM executar nada pago, guarda numa linha de
// `gpt_handoffs` e devolve `/go/<token>` — o link que abre o Studio já
// preenchido com UM clique.
//
// O que esta rota NÃO faz, e é a regra inteira: não cria conta, não debita
// crédito, não chama fornecedor, não toca em nenhum pipeline de vídeo. É uma
// caixa postal com prazo de 7 dias.
//
// A RÉGUA NÃO REJEITA, AVISA. São DUAS réguas (clássico 3,1 pal/s, hollywood
// 2,3 pal/s — lib/gptHandoff.ts) e o veredito `fit` volta no JSON para o GPT
// mostrar à pessoa. "Passar do alvo é bom; ficar abaixo é defeito" (CLAUDE.md
// 02/09) — por isso o piso é 95% e o teto 160%.
//
// Rate limit contado no BANCO (memória de lambda mente entre instâncias), com
// falha ABERTA: contador que não responde não barra o funil. O que barra é a
// inserção falhar — sem linha não há link, e aí a resposta é 503 legível.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

// A chamada real vem servidor→servidor (sem CORS), mas o construtor de Actions
// da OpenAI e qualquer teste no navegador fazem preflight. Sem chave, sem
// cookie: `*` é honesto.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } })
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** 18 bytes aleatórios do CSPRNG → 24 chars base64url. Gerador pseudo-
 *  aleatório comum não serve: o token é a única chave de leitura de um texto
 *  escrito por terceiro. */
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

    // ── 4. A linha
    const token = newToken()
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
    })
    if (!inserted.ok) {
      console.error('[gpt-handoff] insert failed:', inserted.error)
      return json({ error: 'Kineo could not save the script right now. Try again in a minute.' }, 503)
    }

    // ── 5. O degrau do funil
    await writeServerEvent({
      name: 'gpt_handoff_created',
      path: '/api/gpt/handoff',
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
        over_studio_limit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
        bot: false,
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
      fitMessage: describeFit(est, input.durationSec),
      durationSec: input.durationSec,
      engineHint: input.engineHint,
      aspect: input.aspect,
      language: input.language,
      // O Studio recusa prompt acima de 5.000 chars; o GPT deve avisar.
      overStudioLimit: input.script.length > STUDIO_PROMPT_MAX_CHARS,
      studioLimitChars: STUDIO_PROMPT_MAX_CHARS,
    })
  } catch (e) {
    console.error('[gpt-handoff] unexpected failure:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Kineo could not process the script right now. Try again in a minute.' }, 503)
  }
}
