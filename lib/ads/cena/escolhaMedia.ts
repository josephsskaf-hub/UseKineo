import { narrationWordCount } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-ADS-ESCOLHA-2310 — durable, injected media effects; no close generation, video spend or billing here.
import type { LyriaHandle } from '@/lib/lyriaMusic'
import type { MusicMood } from '@/lib/pixabayMusic'
import { cenaHttps, cenaVoiceModeOf } from './plan'
import type { CenaState } from './pipeline'
import { ajusteMusicMood } from './ajusteMedia'
import { addAjusteQuality } from './ajusteQuality'
import { escolhaOf, fitCenaEscolhaScript } from './escolhaPlan'
import { escolhaScenario } from './escolhaCatalog'
import { narrationWordCount } from '@/lib/textLanguage'

export interface EscolhaVoice { status: 'new' | 'submitting' | 'done' | 'failed'; attempt: 1 | 2; claimedAt?: number; text?: string; seconds?: number; reason?: string }
export interface EscolhaMedia {
  marker: 'KINEO-ADS-ESCOLHA-2310'; voice: EscolhaVoice;
  music: { status: 'new' | 'submitting' | 'pending' | 'done' | 'skipped'; claimedAt?: number; handle?: LyriaHandle; url?: string };
}
export type CenaEscolhaState = CenaState & { escolhaMedia?: EscolhaMedia }
export interface EscolhaMediaDeps<Audio> {
  now(): number; save(s: CenaEscolhaState): Promise<void>;
  synthesize(text: string): Promise<{ audio: Audio; seconds: number }>;
  upload(audio: Audio): Promise<string>;
  submitMusic(mood: MusicMood): Promise<LyriaHandle | null>;
  pollMusic(handle: LyriaHandle): Promise<string | null>;
}
/** KINEO-ADS-RENDER-FIX-2310 — música já aceita pela fal (pending) espera até 8 min: o vídeo do Kling leva ~8 min, então a montagem não atrasa. */
export const ESCOLHA_MUSIC_PENDING_MS = 8 * 60_000
export function escolhaMusicMood(s: Pick<CenaEscolhaState, 'plan'>): MusicMood {
  const choice = escolhaOf(s.plan), scene = `${choice?.scenarioId ?? ''} ${s.plan.setting}`.toLowerCase()
  const configured = choice && escolhaScenario(choice.scenarioId)
  if (configured) return configured.musicMood
  if (/sunset|evening|pôr do sol|por do sol|entardecer|night/iu.test(scene)) return 'emotional'
  if (/track|gym|running|athlet|workout|orla|beach|seafront|boardwalk|pista|academia/iu.test(scene)) return 'hustle'
  if (/tea|kitchen|window|park|garden|chá|cozinha|janela|parque/iu.test(scene)) return 'nature'
  return ajusteMusicMood(s.plan.category)
}
/** Complete measured narration only: a long first audio is never uploaded or cut, and a second attempt is durably bounded. */
export async function stepCenaEscolhaMedia<Audio>(s: CenaEscolhaState, d: EscolhaMediaDeps<Audio>): Promise<'pending' | 'ready' | 'failed'> {
  if (!escolhaOf(s.plan)) throw new Error('escolha_plan_required')
  const narrated = cenaVoiceModeOf(s.plan) === 'narrated'
  if (!s.escolhaMedia) {
    s.escolhaMedia = { marker: 'KINEO-ADS-ESCOLHA-2310', voice: { status: narrated ? 'new' : 'done', attempt: 1 }, music: { status: s.plan.ajusteLive?.music === true ? 'new' : 'skipped' } }
    await d.save(s)
  }
  const media = s.escolhaMedia, voice = media.voice
  if (media.marker !== 'KINEO-ADS-ESCOLHA-2310') throw new Error('escolha_media_invalid')
  if (!narrated && s.voiceUrl) throw new Error('cena_talking_voiceover_forbidden')
  if (voice.status === 'failed') return 'failed'
  if (narrated && voice.status !== 'done') {
    if (voice.status === 'submitting') { voice.status = 'failed'; voice.reason = 'escolha_voice_submit_unconfirmed'; await d.save(s); return 'failed' }
    voice.status = 'submitting'; voice.claimedAt = d.now(); voice.text = s.plan.script.narration; s.voiceClaimedAt = voice.claimedAt
    await d.save(s)
    const { audio, seconds } = await d.synthesize(voice.text)
    if (!(Number.isFinite(seconds) && seconds > 0)) { voice.status = 'failed'; voice.reason = 'escolha_voice_unusable'; await d.save(s); return 'failed' }
    voice.seconds = seconds
    if (seconds > 15) {
      if (voice.attempt === 2) { voice.status = 'failed'; voice.reason = 'escolha_voice_core_does_not_fit_15s'; await d.save(s); return 'failed' }
      const count = narrationWordCount(voice.text, s.plan.input.language), target = Math.min(24, Math.max(1, Math.floor(count * 13.5 / seconds))) // KINEO-IDIOMAS-FORMATOS-2410
      let fitted
      try { fitted = fitCenaEscolhaScript(s.plan.script, s.plan.input, s.plan.product, target) }
      catch { voice.status = 'failed'; voice.reason = 'escolha_voice_core_does_not_fit_15s'; await d.save(s); return 'failed' }
      if (fitted.narration === voice.text) { voice.status = 'failed'; voice.reason = 'escolha_voice_core_does_not_fit_15s'; await d.save(s); return 'failed' }
      s.plan.script = fitted; voice.attempt = 2; voice.status = 'new'; delete voice.claimedAt; delete s.voiceClaimedAt
      addAjusteQuality(s, { stage: 'voice', code: 'escolha_voice_shortened', message: `First complete narration measured ${seconds}s; a single second synthesis uses whole shorter sentences, preserving the complete CTA. No long audio was uploaded or trimmed.` })
      await d.save(s); return 'pending'
    }
    const url = await d.upload(audio)
    if (!cenaHttps(url)) throw new Error('escolha_voice_upload_failed')
    s.voiceUrl = url; voice.status = 'done'
    addAjusteQuality(s, { stage: 'voice', code: 'escolha_voice_ready', message: `Complete narration measures ${seconds}s; fixed15s output preserves its end and CTA. Caption word timing remains estimated.` })
    await d.save(s)
  }
  if (narrated && (!cenaHttps(s.voiceUrl) || !(Number.isFinite(voice.seconds) && voice.seconds! > 0 && voice.seconds! <= 15))) throw new Error('escolha_voice_unusable')
  // Music is optional and is not allowed to delay submission of the chosen video.
  if (s.phase !== 'ready') return 'ready'
  const music = media.music
  if (music.status === 'done' || music.status === 'skipped') return 'ready'
  if (music.status === 'submitting' || music.status !== 'pending' && music.claimedAt !== undefined && d.now() - music.claimedAt > 45_000 || music.status === 'pending' && music.claimedAt !== undefined && d.now() - music.claimedAt > ESCOLHA_MUSIC_PENDING_MS) { music.status = 'skipped'; await d.save(s) } // KINEO-ADS-RENDER-FIX-2310 — 45 s valia também para a música JÁ aceita (pending): o Lyria leva mais que isso e todo vídeo saía mudo depois da voz (order fbfa2001)
  if (music.status === 'new') {
    music.status = 'submitting'; music.claimedAt = d.now(); await d.save(s)
    let handle: LyriaHandle | null = null
    try { handle = await d.submitMusic(escolhaMusicMood(s)) } catch { /* ambiguous or rejected music never gets another submit */ }
    if (handle?.requestId && cenaHttps(handle.statusUrl) && cenaHttps(handle.responseUrl)) { music.handle = handle; music.status = 'pending' } else music.status = 'skipped'
    await d.save(s); return music.status === 'pending' ? 'pending' : 'ready'
  }
  if (music.status === 'pending') {
    let url: string | null = null
    try { if (music.handle) url = await d.pollMusic(music.handle) } catch { /* same durable handle next time */ }
    if (cenaHttps(url)) { music.url = url; music.status = 'done'; await d.save(s) }
    else return 'pending'
  }
  return 'ready'
}
