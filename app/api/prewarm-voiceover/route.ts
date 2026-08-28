// KINEO-PREAQUECER-VOZ-2026-08-28 — a narração sai do caminho crítico.
//
// O DESPERDÍCIO: no fluxo cinematográfico, as cenas levam 2-4 minutos no
// fornecedor de vídeo enquanto o servidor fica PARADO — e só depois, no
// /api/compose, é que a narração é sintetizada (TTS) e transcrita (Whisper),
// somando 15-30 segundos ao fim da espera, bem na hora em que a ansiedade do
// cliente está no pico ("as cenas ficaram prontas... e agora trava?").
//
// A JOGADA: o compose JÁ TEM um cache de voz por hash de conteúdo
// (Kineo-AudioCache-2026: chave = script+voz+velocidade+modelo+versão; num
// hit ele "skip TTS + Whisper"). Esta rota não inventa um segundo caminho de
// áudio — ela apenas AQUECE aquele cache durante a espera das cenas: o
// cliente a chama fire-and-forget ao entrar em fal_polling, a voz é
// sintetizada AGORA em paralelo com o fornecedor, e quando o compose rodar o
// lookup acerta e os 15-30s somem da espera percebida.
//
// POR QUE É UMA MELHORA LIMPA (exigência do fundador: "sem estragar o render
// e nem dar bug em outro lugar"):
//   · O compose NÃO MUDOU uma linha de comportamento: hit de cache já era um
//     caminho de produção testado; miss continua sintetizando como sempre.
//   · Se esta rota falhar, atrasar ou nem ser chamada → cache miss → o fluxo
//     de hoje roda idêntico. O pior caso do prewarm é o status quo.
//   · Só aquece o caso em que a chave é derivável com EXATIDÃO: `speed`
//     explícito (verbatim/cinematic), onde scaledScript === script. Sem
//     speed, o compose reescreve o script via GPT antes do hash — aquecer
//     seria chutar a chave, então recusamos educadamente.
//   · Sem débito, sem claim, sem escrita fora do bucket de cache (que é
//     idempotente por chave: rodar duas vezes grava o mesmo arquivo).
//   · Custo: o MESMO TTS+Whisper que aconteceria de qualquer jeito, só que
//     mais cedo. Anti-abuso: exige login e script ≤ 4.000 chars.
//
// A salt VOICEOVER_ENGINE_VERSION vem de lib/compose (fonte única com o
// compose) — ver o comentário na exportação.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  computeVoiceoverCacheKey,
  estimateMp3DurationSeconds,
  generateTTS,
  lookupCachedVoiceover,
  resolveTtsVoiceIdentity,
  storeCachedVoiceover,
  transcribeTTSWithTimestamps,
  VOICEOVER_ENGINE_VERSION,
} from '@/lib/compose'
import { ttsModelForTier } from '@/lib/narration/elevenlabs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Tudo aqui é best-effort: NUNCA devolver erro que assuste o cliente — o
  // chamador é fire-and-forget e o fallback é o fluxo normal do compose.
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ warmed: false, reason: 'auth' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const script = typeof body.script === 'string' ? body.script.trim() : ''
    const speedRaw = Number(body.speed)
    const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? Math.max(0.7, Math.min(1.3, speedRaw)) : null
    const vertical = typeof body.vertical === 'string' && body.vertical.trim() ? body.vertical.trim().toLowerCase() : undefined
    const language = body.language === 'pt' || body.language === 'es' ? body.language : 'en'
    const quality = typeof body.quality === 'string' ? body.quality : ''

    if (!script || script.length > 4000) return NextResponse.json({ warmed: false, reason: 'script' })
    // Sem speed explícito o compose reescala o texto via GPT antes do hash —
    // a chave não é derivável aqui. Recusar é o correto; chutar aqueceria lixo.
    if (speed == null) return NextResponse.json({ warmed: false, reason: 'no_explicit_speed' })

    // Mesmo mapeamento quality→tier do compose (linha ~1255). Manter em
    // sincronia é barato porque a lista é a de motores cinematográficos.
    const narrationTier: 'free' | 'premium' | 'cinematic' =
      quality.startsWith('cinematic_') ? 'cinematic' : quality === 'pro' ? 'premium' : 'free'

    const model = ttsModelForTier(narrationTier)
    const identity = resolveTtsVoiceIdentity(script, speed, vertical, narrationTier, language, model)
    const cacheKey = computeVoiceoverCacheKey({
      script,
      voice: identity.voice,
      speed: identity.speed,
      model: `${model}|engine=${VOICEOVER_ENGINE_VERSION}`,
    })

    const hit = await lookupCachedVoiceover(cacheKey)
    if (hit) return NextResponse.json({ warmed: true, cached: true })

    const audio = await generateTTS(script, speed, vertical, narrationTier, language)
    if (!audio || audio.length === 0) return NextResponse.json({ warmed: false, reason: 'tts_empty' })
    const duration = estimateMp3DurationSeconds(audio)
    if (!(duration > 0.5)) return NextResponse.json({ warmed: false, reason: 'duration' })
    const words = await transcribeTTSWithTimestamps(audio).catch(() => [])
    await storeCachedVoiceover(cacheKey, audio, words ?? [], duration)
    console.log(`[prewarm-voiceover] warmed key=${cacheKey.slice(0, 12)} dur=${duration.toFixed(1)}s words=${(words ?? []).length} user=${user.id.slice(0, 8)}`)
    return NextResponse.json({ warmed: true, cached: false })
  } catch (e) {
    console.warn('[prewarm-voiceover] non-fatal:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ warmed: false, reason: 'error' })
  }
}
