// KINEO-FILME-RAPIDO-1710 — o lado de servidor da VOZ E MÚSICA NO CLIQUE (lógica e registro em lib/audioNoClique.ts).
//
// Chamado pelo /api/generate-video-cinematic DEPOIS que o despacho foi aceito (resposta 2xx), com a mesma resposta que o
// claim assinado guarda — é dela que o /api/compose (aba ou cron) tira roteiro, voz, velocidade e cenas. Cada valor aqui
// é derivado do mesmo jeito que o compose deriva (comentários "≡ compose"), para a chave do cache e o prompt da trilha
// baterem; se algo não bater, a montagem simplesmente não acha e gera como sempre (o pior caso é o de ontem).
// Sem waitUntil (dev, runtime sem contexto) nada é reservado nem gerado: o comportamento de antes, inclusive o
// pré-aquecimento de voz que a aba dispara.
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
import { stripScriptMarkers, salvageScriptNarration } from '@/lib/scriptParser'
import { narrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'
import { vozAssinadaDoClaim } from '@/lib/vozDoFilmeCurto'
import { resolveMusicDirection } from '@/lib/musicDirection'
import { esperarLyria, lyriaPromptFor, submeterLyria } from '@/lib/lyriaMusic'
import { hollywoodVoiceFromClaim, resolveHollywoodVoice, synthesizeHostSpeech } from '@/lib/hollywood/hostVoice'
import { collectSceneNarrations, type SceneSpeechEngine } from '@/lib/cinematic/speechContract'
import { depoisDaResposta, podeAdiarParaDepoisDaResposta } from '@/lib/posResposta'
import { chaveDaCenaAquecida, executarAquecimento, idDoAquecimento, reservarAquecimento, type PedidoDeAquecimento } from '@/lib/audioNoClique'
import { transcreverNaEscritaDoRoteiro } from '@/lib/whisperNaEscrita' // [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-ESCRITA-2010 — Whisper com o idioma que a escrita do roteiro diz (linha própria)

const HOLLYWOOD_FAMILY = new Set(['cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_omni', 'cinematic_s25'])

type Tier = 'free' | 'premium' | 'cinematic'
// ≡ compose: narrationTier por qualidade.
function tierDa(quality: string): Tier {
  return quality.startsWith('cinematic_') ? 'cinematic' : quality === 'pro' ? 'premium' : 'free'
}
// ≡ compose: Math.max(0.7, Math.min(1.3, s)) quando s > 0.
function velocidadeExplicita(raw: unknown): number | null {
  const s = Number(raw)
  return Number.isFinite(s) && s > 0 ? Math.max(0.7, Math.min(1.3, s)) : null
}

/**
 * A voz clássica (trilho único) — a MESMA chave que o compose calcula e o mesmo trabalho que /api/prewarm-voiceover faz:
 * cache acerta = nada a fazer; senão TTS + Whisper + cache. `produzir` devolve true quando a voz ficou no cache.
 */
export function vozClassicaAquecivel(a: {
  script: string
  speed: number
  vertical: string | undefined
  language: NarrationLanguage
  quality: string
  log?: string
}): { chave: string; produzir: () => Promise<boolean> } | null {
  if (!a.script) return null
  const tier = tierDa(a.quality)
  const model = ttsModelForTier(tier)
  const identity = resolveTtsVoiceIdentity(a.script, a.speed, a.vertical, tier, a.language, model)
  const chave = computeVoiceoverCacheKey({ script: a.script, voice: identity.voice, speed: identity.speed, model: `${model}|engine=${VOICEOVER_ENGINE_VERSION}` })
  const produzir = async (): Promise<boolean> => {
    if (await lookupCachedVoiceover(chave)) return true
    const audio = await generateTTS(a.script, a.speed, a.vertical, tier, a.language)
    if (!audio || audio.length === 0) return false
    const duration = estimateMp3DurationSeconds(audio)
    if (!(duration > 0.5)) return false
    const words = await transcreverNaEscritaDoRoteiro(audio, a.script).catch(() => []) // KINEO-META95-ESCRITA-2010 — a voz do clique entra no cache já na escrita do roteiro
    const stored = await storeCachedVoiceover(chave, audio, words ?? [], duration)
    console.log(`[audio-no-clique] voz ${a.log ?? ''} key=${chave.slice(0, 12)} dur=${duration.toFixed(1)}s words=${(words ?? []).length} stored=${!!stored}`)
    return !!stored
  }
  return { chave, produzir }
}

/**
 * Reserva e agenda o aquecimento do filme. true = reservado e agendado para depois da resposta. Nunca lança — falha
 * aqui é só "sem aquecimento", e a montagem gera como sempre.
 */
export async function agendarAudioNoClique(a: {
  generationId: string
  userId: string
  quality: string
  response: Record<string, unknown>
  bodyVertical: unknown
  bodyLanguage: unknown
}): Promise<boolean> {
  try {
    if (!podeAdiarParaDepoisDaResposta()) return false
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return false
    const db = createAdminClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const r = a.response
    // ≡ compose: rawVoiceover = body.voiceover_script; voiceoverScript = strip → salvage.
    const rawVoiceover = typeof r.voiceover_script === 'string' ? r.voiceover_script : ''
    const voiceoverScript = stripScriptMarkers(rawVoiceover) || (rawVoiceover.trim() ? salvageScriptNarration(rawVoiceover) : '')
    if (!voiceoverScript) return false
    // ≡ compose: o claim assinado (narration_voice) vence o corpo antes de vertical/speed nascerem; senão o corpo do
    // cliente, que manda vertical = o mesmo `vertical` deste despacho e speed = response.speed.
    let verticalRaw: unknown = a.bodyVertical
    let speedRaw: unknown = r.speed
    const assinada = vozAssinadaDoClaim(r)
    if (assinada) { verticalRaw = assinada.vertical; speedRaw = assinada.speed }
    const vertical = typeof verticalRaw === 'string' && verticalRaw.trim() ? verticalRaw.trim().toLowerCase() : undefined
    const explicitSpeed = velocidadeExplicita(speedRaw)
    const language = narrationLanguage(a.bodyLanguage) ?? 'en' // ≡ compose
    const topic = typeof r.prompt === 'string' ? r.prompt : '' // o cliente manda topic = o pedido despachado

    // Trilha: ≡ compose selectMusicForScript({ script, rawScript: `${raw}\n${topic}`, vertical }).
    const direction = resolveMusicDirection({ script: voiceoverScript, rawScript: `${rawVoiceover}\n${topic}`, vertical })
    const promptMusica = direction.enabled ? lyriaPromptFor(direction.mood, direction) : null

    const hollywood = HOLLYWOOD_FAMILY.has(a.quality)
    let voz: PedidoDeAquecimento['voz'] = null
    const cenas: PedidoDeAquecimento['cenas'] = []
    if (!hollywood) {
      // ≡ compose: o texto só é falado como está com speed explícito ou roteiro verbatim no claim; fora disso o compose
      // reescreve o texto antes do TTS e a chave não é derivável daqui.
      if (explicitSpeed != null || r.verbatim === true) {
        voz = vozClassicaAquecivel({ script: voiceoverScript, speed: explicitSpeed ?? 1.0, vertical, language, quality: a.quality, log: `gen=${a.generationId.slice(0, 8)}` })
      }
    } else {
      // ≡ compose (estrada hollywood): engines normalizados, narrações por cena, voz fixada pelo claim (host_voice) ou
      // pelo roteiro inteiro, velocidade = a da voz × a explícita.
      const engines = Array.isArray(r.scene_engines) ? r.scene_engines : []
      const narrations = Array.isArray(r.scene_narrations) ? r.scene_narrations : []
      const clips = engines.map((e) => ({ engine: (e === 'dialogue' || e === 'cinematic' || e === 'support' || e === 'host' ? e : 'support') as SceneSpeechEngine }))
      let pendentes: Array<{ sceneIdx: number; text: string }> = []
      try { pendentes = collectSceneNarrations(clips, narrations) } catch { pendentes = [] }
      if (pendentes.length > 0) {
        const pinned = hollywoodVoiceFromClaim(r.host_voice) ?? resolveHollywoodVoice(voiceoverScript, language, vertical)
        const velocidade = pinned.defaultSpeed * (explicitSpeed ?? 1.0)
        for (const p of pendentes) {
          const chave = chaveDaCenaAquecida({ generationId: a.generationId, texto: p.text, voz: pinned.voice, velocidade })
          cenas.push(async () => {
            if (await lookupCachedVoiceover(chave)) return true
            const buf = await synthesizeHostSpeech({ text: p.text, voice: pinned.voice, speed: velocidade })
            const dur = buf && buf.length > 0 ? estimateMp3DurationSeconds(buf) : 0
            if (!(dur > 0.3)) return false
            const words = await transcreverNaEscritaDoRoteiro(buf, p.text).catch(() => []) // KINEO-META95-ESCRITA-2010
            return !!(await storeCachedVoiceover(chave, buf, words ?? [], dur))
          })
        }
      }
    }

    const pedido: PedidoDeAquecimento = { generationId: a.generationId, userId: a.userId, promptMusica, voz, cenas, esperaDaTrilhaMs: 150_000 }
    const reserva = await reservarAquecimento(db, pedido, Date.now())
    if (!reserva.ok) return false
    const agendou = depoisDaResposta('audio-no-clique', async () => {
      const fim = await executarAquecimento({ db, agora: () => Date.now(), submeterLyria, esperarLyria }, pedido, reserva.registro)
      console.log(`[audio-no-clique] gen=${a.generationId.slice(0, 8)} musica=${fim.musica?.status ?? '-'} voz=${fim.voz?.status ?? '-'} cenas=${fim.cenas ? `${fim.cenas.prontas ?? 0}/${fim.cenas.total}` : '-'}`)
    })
    if (!agendou) {
      // O contexto sumiu entre a checagem e o agendamento: marca tudo como falho para ninguém esperar à toa.
      await db.from('events').update({ metadata: { ...reserva.registro, musica: reserva.registro.musica ? { ...reserva.registro.musica, status: 'falhou' } : null, voz: reserva.registro.voz ? { ...reserva.registro.voz, status: 'falhou' } : null, cenas: reserva.registro.cenas ? { ...reserva.registro.cenas, status: 'falhou' } : null } }).eq('id', idDoAquecimento(a.generationId))
      return false
    }
    return true
  } catch (e) {
    console.warn('[audio-no-clique] não agendado:', e instanceof Error ? e.message : String(e))
    return false
  }
}
