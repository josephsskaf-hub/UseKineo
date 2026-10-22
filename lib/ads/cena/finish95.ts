// KINEO-ADS-CENA-95-2110 — intenções de áudio persistidas antes do gasto; música é estritamente opcional.
import type { Cena95State } from './pipeline95'
import { reserveCena95 } from './pipeline95'
import { cena95NarratedVoiceRequest, type Cena95VoiceLanguage } from './voice95'
export interface Cena95FinishDeps {
  now(): number; save(s: Cena95State): Promise<void>;
  voice(request: ReturnType<typeof cena95NarratedVoiceRequest>): Promise<{ url: string; durationMs: number }>;
  music(): Promise<string | null | { pending: true }>;
  event(name: string, data: Record<string, unknown>): Promise<void>;
}
export async function prepareCena95Voice(s: Cena95State, d: Cena95FinishDeps): Promise<void> {
  if (s.plan.voice_mode === 'talking') { if (s.voiceUrl || s.voiceClaimedAt) throw new Error('cena95_talking_tts_forbidden'); return }
  if (s.phase !== 'videos' || s.voiceUrl) return
  if (s.voiceClaimedAt) throw new Error('cena95_voice_submit_unconfirmed')
  const p = s.plan.quality95.presenter
  const request = cena95NarratedVoiceRequest({ beforeCta: s.plan.script.beforeCta, cta: s.plan.script.cta, pauseSeconds: s.plan.script.pauseSeconds, language: s.plan.input.language as Cena95VoiceLanguage, gender: p.gender, age: p.age, formato: s.plan.input.formato })
  s.voiceClaimedAt = d.now()
  await reserveCena95(s, d, 'voice', 'narrated_voice', request.billingCharacters * 0.0001)
  await d.save(s)
  const result = await d.voice(request)
  if (!/^https:\/\//u.test(result.url) || !(Number.isInteger(result.durationMs) && result.durationMs > 0 && result.durationMs <= 15_000)) throw new Error('cena95_voice_does_not_fit')
  s.voiceUrl = result.url; s.voiceSeconds = result.durationMs / 1000; await d.save(s)
}
export async function prepareCena95Music(s: Cena95State, d: Cena95FinishDeps): Promise<void> {
  if (s.phase !== 'ready' || s.musicState) return
  if (s.musicClaimedAt && (!s.musicHandle || d.now() - s.musicClaimedAt > 3 * 60_000)) { s.musicState = 'skipped'; await d.save(s); return }
  s.musicClaimedAt ??= d.now()
  try {
    await reserveCena95(s, d, 'music', 'music', 0.08); await d.save(s)
    const url = await d.music()
    if (url && typeof url === 'object') { await d.save(s); return }
    if (url && /^https:\/\//u.test(url)) { s.musicUrl = url; s.musicState = 'done' } else s.musicState = 'skipped'
  } catch (e) {
    if (e instanceof Error && e.message === 'cena95_lease_lost') throw e
    s.musicUrl = undefined; s.musicState = 'skipped'
  }
  await d.save(s)
  // Falha da telemetria opcional também não pode transformar música ausente em falha de anúncio.
  try { await d.event('ads_cena95_music', { state: s.musicState }) } catch { /* best effort */ }
}
