import { fal } from '@fal-ai/client'
import { stripScriptMarkers } from '@/lib/scriptParser'
import { writeServerEvent } from '@/lib/serverEvents'
import { alertOpenAiExhausted, looksOpenAiQuotaDead, openAiAlertKind } from '@/lib/openaiAlert'
import { isOpenAiOutageError, primaryStatusOf, settleWithin, FALLBACK_SIDE_EFFECTS_MS } from '@/lib/llmFallback'

// ═══ KINEO-PLANO-B-OPENAI-2026-09-28 — plano B da VOZ do Kineo 1 / clássicos ═══════════════════════
//
// O plano B de texto (lib/llmFallback.ts) sozinho só MUDA o lugar da falha: a narração do caminho
// clássico (generateTTS em lib/compose.ts, tts-1-hd) também é OpenAI, e quando ela cai o
// /api/compose responde 502 "Voiceover generation failed" — num apagão de crédito como o de 26-27/09
// o filme que passasse do roteiro morreria aqui, depois de pagar o b-roll. Nos 14 dias antes do
// apagão houve 0 falhas de TTS (ninguém chegou ao compose); este é o degrau seguinte do mesmo apagão.
//
// A voz reserva é a MiniMax Speech-2.8 HD na fal, com o schema CONFERIDO em 01/09 pela rota /audio
// (app/api/audio/generate/route.ts): required = ["prompt"], `output_format: 'url'` OBRIGATÓRIO (o
// default é "hex" — a resposta viria um hexdump gigante em vez de URL) e `language_boost: 'auto'`.
// Nenhum parâmetro inventado: sem voice_setting, sem speed — por isso o passe corretivo de duração
// não consegue acelerar esta voz (ver o compose).
// Diferenças que o fundador precisa saber: a voz não é a da persona e o ritmo não é o 3,1 pal/s do
// tts-1-hd — o filme pode passar do alvo (aceito: "passar do alvo é bom"). Gasta o saldo pré-pago da
// fal: o 02-hd custava US$0,10 por 1.000 caracteres (rota /audio) e um filme de 60 s tem ~1.100; o
// preço do 2.8 HD não foi medido aqui — conferir no painel da fal depois do primeiro uso.
// Hollywood (Kling 3/H3/Omni/S25) narra por synthesizeHostSpeech em lib/hollywood/hostVoice.ts —
// arquivo da trava 8.2 — e NÃO ganha este plano B aqui. Por isso o plano B de TEXTO também fica desligado na rota
// cinematográfica (LLM_FALLBACK_BLOCKED_ROUTES em lib/llmFallback): planejador salvo + narração sem voz reserva =
// clipes pagos à fal e filme recusado no compose.

// Interruptor do plano B de VOZ (separado do de texto: trocar a voz é uma decisão de produto).
export const TTS_FALLBACK_ENABLED = true
export const TTS_FALLBACK_MODEL = 'fal-ai/minimax/speech-2.8-hd'
export const TTS_FALLBACK_EVENT = 'tts_fallback_used'
// Só falha RÁPIDA da OpenAI entra no plano B de voz. 429/5xx voltam em menos de 1 s; um timeout da TTS
// (55 s) + a MiniMax (até 90 s) + o Whisper (60 s) + a espera dos clipes do primeiro filme (60 s) passaria
// do maxDuration 300 do compose, e a Vercel mataria a função antes de o catch rodar (o defeito de 05/08).
// Timeout segue no 502 de sempre.
export const TTS_FALLBACK_MAX_ELAPSED_MS = 20_000
// fal.subscribe cancela e rejeita depois disso.
export const TTS_FALLBACK_TIMEOUT_MS = 90_000
// KINEO-PLANO-B-OPENAI-2026-09-28 (revisão adversarial) — o download do mp3 da fal também tem teto: o timeout do
// subscribe não cobre o fetch da URL, e um CDN travado seguraria o compose (depois do débito) até a Vercel matar a função.
export const TTS_FALLBACK_DOWNLOAD_MS = 20_000
// O mesmo corte do generateTTS (lib/compose.ts): o plano B nunca fala mais do que a primária falaria.
const TTS_FALLBACK_MAX_CHARS = 3800

/** O erro da TTS da OpenAI é apagão (429/5xx/conexão), veio RÁPIDO, e o plano B está ligado com FAL_KEY? */
export function ttsFallbackApplies(err: unknown, elapsedMs: number): boolean {
  if (!TTS_FALLBACK_ENABLED) return false
  if (!(elapsedMs < TTS_FALLBACK_MAX_ELAPSED_MS)) return false
  if (!process.env.FAL_KEY) return false
  return isOpenAiOutageError(err) || looksOpenAiQuotaDead(err)
}

/** O corpo EXATO da rota /audio para a MiniMax 2.8 HD (nunca inventar parâmetro). */
export function ttsFallbackInput(text: string): { prompt: string; output_format: 'url'; language_boost: 'auto' } {
  return { prompt: text, output_format: 'url', language_boost: 'auto' }
}

/** Sintetiza a narração pela MiniMax na fal e devolve o mp3 em Buffer (o que o compose espera). */
export async function synthesizeTtsFallback(script: string): Promise<Buffer> {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY is not set')
  // A mesma limpeza do generateTTS: o narrador nunca lê "[Pexels: …]", "HOOK" ou linha de "speed:".
  const cleaned = stripScriptMarkers(script)
  const text = (cleaned.length > TTS_FALLBACK_MAX_CHARS ? cleaned.slice(0, TTS_FALLBACK_MAX_CHARS) : cleaned).trim()
  if (!text) throw new Error('fallback TTS: narration is empty after marker strip')
  fal.config({ credentials: falKey })
  const result = (await fal.subscribe(TTS_FALLBACK_MODEL, {
    input: ttsFallbackInput(text),
    timeout: TTS_FALLBACK_TIMEOUT_MS,
  })) as { data?: { audio?: { url?: string } }; audio?: { url?: string } }
  const url = result?.data?.audio?.url ?? result?.audio?.url ?? null
  if (!url) throw new Error('fallback TTS returned no audio url')
  const res = await fetch(url, { signal: AbortSignal.timeout(TTS_FALLBACK_DOWNLOAD_MS) })
  if (!res.ok) throw new Error(`fallback TTS audio fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) throw new Error('fallback TTS audio is empty')
  return buf
}

/**
 * Evento `tts_fallback_used` + alarme ao fundador (mesmo limitador de 30 min por tipo), com o MESMO teto do plano B de
 * texto (settleWithin, 2,5 s): o compose aguarda isto depois do débito, e um Resend/Supabase travado no apagão não pode
 * segurar a narração que já saiu (revisão adversarial 28/09 — a 1ª versão aguardava sem teto).
 */
export async function registerTtsFallbackUse(args: {
  err: unknown
  stage: 'primary' | 'corrective'
  primaryMs: number
  ms: number
  bytes: number
  chars: number
  userId: string | null
  generationId: string | null
  quality: string | null
}): Promise<void> {
  const primaryStatus = primaryStatusOf(args.err)
  const kind: 'quota' | 'hang' | 'rate_limit' = looksOpenAiQuotaDead(args.err) ? openAiAlertKind(args.err) : 'hang'
  await settleWithin(FALLBACK_SIDE_EFFECTS_MS, [
    writeServerEvent({
      name: TTS_FALLBACK_EVENT,
      userId: args.userId,
      sessionId: args.generationId,
      path: '/api/compose',
      metadata: {
        stage: args.stage,
        model: TTS_FALLBACK_MODEL,
        primary_status: primaryStatus,
        primary_ms: args.primaryMs,
        ms: args.ms,
        bytes: args.bytes,
        chars: args.chars,
        quality: args.quality,
        generation_id: args.generationId,
        alert_kind: kind,
      },
    }),
    alertOpenAiExhausted(
      `PLANO B DE VOZ ATIVO (/api/compose, ${args.stage}): a TTS da OpenAI recusou (${String(primaryStatus)}) e a ` +
        `narração saiu pela ${TTS_FALLBACK_MODEL} na fal (${args.ms} ms). O filme segue, com outra voz e outro ritmo; ` +
        `cada narração agora gasta o saldo da fal. Recarregar a OpenAI.`,
      kind,
    ),
  ])
}
