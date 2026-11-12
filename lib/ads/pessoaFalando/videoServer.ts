// KINEO-ADS-PESSOA-FALANDO-VIDEO-1211 — o io REAL do vídeo (lib/ads/pessoaFalando/video.ts): estado pelos eventos do próprio usuário, fila da fal
// pelos MESMOS ajudantes do anúncio v2 (submitShotOnce / pollFalJob), transcrição whisper-1 com tempo por palavra, cópia para o bucket renders.
// Só servidor. Nunca lança para fora: cada função devolve null/estado conservador e a lógica decide.
import { footageAdminClient } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'
import { pollFalJob, submitShotOnce } from '@/lib/ads/v2Shots'
import { ADS_PF_EVENTOS } from './plataforma'
import { VIDEO_ENDPOINT } from './prompts'
import type { EstadoVideo, TentativaVideo, VideoIo } from './video'

const BUCKET = 'renders'
const VIDEO_MAX = 120 * 1024 * 1024

export function videoIoReal(userId: string, path: string): VideoIo {
  const admin = footageAdminClient()
  return {
    debitar: async () => 'unavailable', // o vídeo NUNCA debita: já está nos 55 das fotos
    estornar: async (chave) => { const { refundRenderCredits } = await import('@/lib/credits/refund'); return refundRenderCredits(chave) },
    estado: async ({ pedidoId }) => {
      const nomes = [ADS_PF_EVENTOS.fotos, ADS_PF_EVENTOS.render, ADS_PF_EVENTOS.juiz, ADS_PF_EVENTOS.entregue, ADS_PF_EVENTOS.estornado]
      const { data, error } = await admin.from('events').select('name, metadata, created_at').eq('user_id', userId)
        .in('name', nomes).eq('metadata->>pedido_id', pedidoId).order('created_at', { ascending: true }).limit(50)
      if (error) throw new Error('state_unavailable')
      const e: EstadoVideo = { fotosEntregues: false, estornado: false, entregue: null, tentativas: [], juizes: {} }
      for (const r of data ?? []) {
        const m = (r.metadata ?? {}) as Record<string, unknown>
        if (r.name === ADS_PF_EVENTOS.fotos) e.fotosEntregues = true
        if (r.name === ADS_PF_EVENTOS.estornado) e.estornado = true
        if (r.name === ADS_PF_EVENTOS.entregue && typeof m.video === 'string') e.entregue = m.video
        if (r.name === ADS_PF_EVENTOS.juiz && typeof m.tentativa === 'number') e.juizes[m.tentativa] = m.aprovado === true
        if (r.name === ADS_PF_EVENTOS.render && typeof m.request_id === 'string' && typeof m.tentativa === 'number') {
          const t: TentativaVideo = { tentativa: m.tentativa, requestId: m.request_id, fala: String(m.fala ?? ''), input: (m.input ?? {}) as Record<string, unknown> }
          if (!e.tentativas.some((x) => x.tentativa === t.tentativa)) e.tentativas.push(t)
        }
      }
      e.tentativas.sort((a, b) => a.tentativa - b.tentativa)
      return e
    },
    submeter: async (endpoint, input) => {
      const o = await submitShotOnce(endpoint, input, { userId, orderId: 'adspf' })
      if (o.kind === 'accepted') return o.requestId
      if (o.kind === 'ambiguous') return o.late
      return null
    },
    consultar: async (requestId) => {
      const p = await pollFalJob(VIDEO_ENDPOINT, requestId, 'video', { userId, orderId: 'adspf' })
      return { state: p.state, url: p.url }
    },
    transcrever: async (url) => {
      const key = process.env.OPENAI_API_KEY
      if (!key) return null
      const video = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: 'no-store' })
      if (!video.ok) return null
      const form = new FormData()
      form.append('file', new Blob([await video.arrayBuffer()], { type: 'video/mp4' }), 'clip.mp4')
      form.append('model', 'whisper-1')
      form.append('response_format', 'verbose_json')
      form.append('timestamp_granularities[]', 'word')
      form.append('language', 'en')
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(90_000) })
      if (!res.ok) return null
      const d = (await res.json()) as { text?: string; duration?: number; words?: Array<{ start?: number }> }
      const inicio = typeof d.words?.[0]?.start === 'number' ? d.words[0].start : null
      return { texto: String(d.text ?? ''), inicio, duracao: Number(d.duration ?? 0) }
    },
    guardar: async ({ pedidoId, tentativa, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(90_000), cache: 'no-store' })
        if (!res.ok) return null
        const buf = new Uint8Array(await res.arrayBuffer())
        if (buf.byteLength === 0 || buf.byteLength > VIDEO_MAX) return null
        const caminho = `${userId}/adspf-${pedidoId}-video${tentativa}.mp4`
        const up = await admin.storage.from(BUCKET).upload(caminho, buf, { contentType: 'video/mp4', upsert: true })
        if (up.error) return null
        return admin.storage.from(BUCKET).getPublicUrl(caminho).data?.publicUrl ?? null
      } catch { return null }
    },
    evento: async (name, metadata) => { await writeServerEvent({ name, userId, path, metadata }) },
  }
}
