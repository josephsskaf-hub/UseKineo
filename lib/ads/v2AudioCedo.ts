// KINEO-FILME-RAPIDO-1710 — STUDIO ADS: MÚSICA E VOZ NO INÍCIO (auditoria 17/10, G7/V6).
//
// Entre o último plano pronto e a montagem enviada passavam ~47 s, todos nossos: o Lyria (até 45 s) e depois a voz
// MiniMax, EM SÉRIE, dentro de prepareAndSubmit (lib/ads/v2Advance.ts) — embora os dois dependam só do pedido (setor,
// narração, língua), conhecidos desde o /start. Aqui eles saem logo no começo do pedido, em paralelo com os planos, e ficam
// gravados no pedido (music_url, voice_url/voice_seconds) — os MESMOS campos que a montagem já lê e que ela só preenche
// quando estão vazios. Nada no montador muda: com os campos cheios, ele pula as duas etapas; vazios (falhou, ainda não
// terminou), ele faz como sempre.
//
// O que é IGUAL ao da montagem (só o QUANDO muda): a trilha é o Lyria do clima do setor copiado para o nosso bucket
// (a reserva da biblioteca continua só na montagem); a voz é a síntese de sempre do pedido SEM apresentador
// (synthesizeTtsFallback sobre speakableForTts(adsV2NarrationForTts(narração, pronúncia), língua)), medida e no bucket
// voiceovers. Pedido COM apresentador (plano com presenter) fica de fora: o caminho do ator e da voz dele é outro e não é
// tocado aqui. Uma tentativa por pedido (trava em events por 2 h: nunca dois Lyria pagos para o mesmo anúncio).
import type { SupabaseClient } from '@supabase/supabase-js'
import { estimateMp3DurationSeconds, uploadVoiceoverToSupabase } from '@/lib/compose'
import { getLyriaMusicUrl } from '@/lib/lyriaMusic'
import type { MusicMood } from '@/lib/pixabayMusic'
import { synthesizeTtsFallback } from '@/lib/ttsFallback'
import { narrationLanguage } from '@/lib/textLanguage'
import { speakableForTts } from '@/lib/ads/speakable'
import { adsV2NarrationForTts, adsV2PronounceOf } from '@/lib/ads/v2Pronounce'
import { persistAudioCopy } from '@/lib/ads/v2Images'
import { adsV2PresenterPlanOf, type AdsV2OrderRow } from '@/lib/ads/v2Advance'
import { adsV2CloseRealNarrationVoice } from '@/lib/ads/v2Advance' // KINEO-CLOSE-REAL-V3-1910 — o Close real fala na voz por língua (PT-BR: Portuguese_ConfidentWoman) já no áudio cedo
import { adsV2CloseRealOf } from '@/lib/ads/v2CloseReal' // KINEO-CLOSE-REAL-V3-1910
import { writeServerEvent } from '@/lib/serverEvents'
import { tomarVezDoCron } from '@/lib/cronLease'

/** ≡ SECTOR_MOOD de lib/ads/v2Advance.ts (o guardião confere que as duas tabelas são iguais). */
export const ADS_V2_SECTOR_MOOD_CEDO: Readonly<Record<string, MusicMood>> = {
  restaurant: 'emotional', clinic: 'emotional', real_estate: 'nature', gym: 'hustle',
  salon: 'emotional', store: 'hustle', app_service: 'tech', other: 'emotional',
}
export const ADS_V2_AUDIO_CEDO_EVENT = 'ads_v2_audio_cedo'
const TRAVA_MS = 2 * 60 * 60 * 1000

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/** O que falta adiantar neste pedido (puro: o guardião executa). */
export function adsV2AudioCedoFalta(order: Pick<AdsV2OrderRow, 'status' | 'plan' | 'narration' | 'music_url' | 'voice_url' | 'voice_seconds'>): { musica: boolean; voz: boolean; narracao: string | null } {
  const nada = { musica: false, voz: false, narracao: null }
  if (order.status !== 'generating' || !order.plan) return nada
  if (adsV2PresenterPlanOf(order.plan) || (order.plan as { presenter?: unknown }).presenter) return nada // o ator: caminho dele, intocado
  // ≡ prepareAndSubmit: a narração só existe com o pedido marcado e o texto do plano.
  const narracao = order.narration && typeof order.plan.narration === 'string' && order.plan.narration.trim() ? order.plan.narration.trim() : null
  return { musica: !order.music_url, voz: !!narracao && !(order.voice_url && num(order.voice_seconds)), narracao }
}

/** Adianta trilha e voz deste pedido. Nunca lança. Devolve o que fez (para o log). */
export async function adsV2AudioCedo(admin: SupabaseClient, order: AdsV2OrderRow): Promise<{ musica: 'pronta' | 'falhou' | 'pulada'; voz: 'pronta' | 'falhou' | 'pulada'; trava?: string }> {
  const falta = adsV2AudioCedoFalta(order)
  if (!falta.musica && !falta.voz) return { musica: 'pulada', voz: 'pulada' }
  try {
    const vez = await tomarVezDoCron(admin, `ads-audio-cedo:${order.id}`, TRAVA_MS)
    if (!vez.ok) return { musica: 'pulada', voz: 'pulada', trava: vez.motivo }
    const t0 = Date.now()
    const mood = ADS_V2_SECTOR_MOOD_CEDO[order.sector ?? 'other'] ?? 'emotional'
    const language = narrationLanguage(order.language) ?? 'en'
    const tempos: Record<string, number> = {}
    const musica = falta.musica ? (async () => {
      const lyria = await getLyriaMusicUrl(null, mood)
      const url = lyria ? await persistAudioCopy({ userId: order.user_id, name: `adsv2-${order.id}-music`, sourceUrl: lyria }) : null
      tempos.musica_ms = Date.now() - t0
      if (!url) return 'falhou' as const
      await admin.from('ads_v2_orders').update({ music_url: url }).eq('id', order.id).is('music_url', null)
      return 'pronta' as const
    })().catch(() => 'falhou' as const) : Promise.resolve('pulada' as const)
    const voz = falta.voz && falta.narracao ? (async () => {
      const spoken = speakableForTts(adsV2NarrationForTts(falta.narracao!, adsV2PronounceOf(order.brief)), language) // KINEO-CLOSE-REAL-V3-1910 — o MESMO texto de sempre
      const buf = adsV2CloseRealOf(order.plan) ? await adsV2CloseRealNarrationVoice(order, spoken) : await synthesizeTtsFallback(spoken, { userId: order.user_id, generationId: order.generation_id }) // KINEO-CLOSE-REAL-V3-1910 — canário v2: o PT saía na voz padrão (a voz cedo era gravada aqui e a montagem a aproveitava); sem Close real = a chamada de sempre
      const voiceSeconds = Math.round(estimateMp3DurationSeconds(buf) * 1000) / 1000
      if (!(voiceSeconds > 0)) return 'falhou' as const
      const voiceUrl = await uploadVoiceoverToSupabase(order.user_id, buf)
      tempos.voz_ms = Date.now() - t0
      await admin.from('ads_v2_orders').update({ voice_url: voiceUrl, voice_seconds: voiceSeconds }).eq('id', order.id).is('voice_url', null)
      return 'pronta' as const
    })().catch(() => 'falhou' as const) : Promise.resolve('pulada' as const)
    const [m, v] = await Promise.all([musica, voz])
    await writeServerEvent({ name: ADS_V2_AUDIO_CEDO_EVENT, userId: order.user_id, path: '/lib/ads/v2AudioCedo', metadata: { order_id: order.id, musica: m, voz: v, ...tempos, total_ms: Date.now() - t0, version: 'filme_rapido_1710' } }).catch(() => false)
    return { musica: m, voz: v }
  } catch (e) {
    console.warn(`[ads-v2] áudio cedo falhou order=${order.id}:`, e instanceof Error ? e.message : String(e))
    return { musica: 'falhou', voz: 'falhou' }
  }
}
