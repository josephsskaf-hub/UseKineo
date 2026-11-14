// KINEO-RECREATE-SEU-VIDEO-1311 — o lado do servidor do Recreate "com o seu vídeo" (lib/recreate/seuVideo.ts tem as regras puras).
// O vídeo do cliente mora no bucket público `renders`, em recreate-uploads/<usuário>/<uuid>.mp4|mov: a fal lê pela URL pública (a rota
// /api/recreate/assets pede login e devolve 404 à fal). O servidor relê o cabeçalho do arquivo a CADA pedido (conferir e gerar): o número
// que a tela mostra nunca é o que se cobra.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { releaseVisible } from './access'
import { recreateSession } from './server'
import { submitDepsFor, type ClipAccount } from '@/lib/clips/clipServer'
import { extractCheckFrames, intervaloPara } from './swapCheck' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { VISAO_TIMEOUT_MS, type IoDoTexto } from './textoDoPedido' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { AI_TEXT_MODELS } from '@/lib/aiModels' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { usdFromUsage } from '@/lib/regua95/coherenceV2' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { PIXEL_MODEL_RATES } from '@/lib/regua95/pixelScore' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { semMarcasDaCasa } from './seuVideo' // KINEO-RECREATE-SOM-PROVA-1311
import { comEndUserDaFal } from './falEndUser' // KINEO-SEEDANCE-END-USER-1311
import {
  SEU_VIDEO_RELEASE, SEU_VIDEO_MOTOR, custoFalKling4, caminhoDoCliente, // KINEO-RECREATE-KLING4-1311 — + SEU_VIDEO_MOTOR, custoFalKling4
   creditosDoSeuVideo, custoFalDoSeuVideo, lerMetaDoVideo, proporcaoDoVideo, segundosGerados, validarVideo,
  type MetaDoVideo, type RecusaDoVideo,
} from './seuVideo'

export const SEU_VIDEO_BUCKET = 'renders'

/** Sessão do "seu vídeo": a do Recreate E o interruptor próprio (hoje só as contas da casa). Fora disso, 404. */
export async function seuVideoSession() {
  const s = await recreateSession()
  return { ...s, user: s.user && releaseVisible(s.user.email, SEU_VIDEO_RELEASE) ? s.user : null }
}

export interface VideoDoCliente {
  ok: true
  url: string
  bytes: number
  meta: MetaDoVideo
  gerados: number
  creditos: number | null
  falUsd: number
  proporcao: string
}

/** Lê (por pedaços, com Range) e valida o vídeo do cliente no bucket. Nunca lança. */
export async function lerVideoDoCliente(admin: SupabaseClient, userId: string, path: unknown): Promise<VideoDoCliente | RecusaDoVideo | { ok: false; code: 'missing'; error: string }> {
  const p = caminhoDoCliente(path, userId)
  if (!p) return { ok: false, code: 'missing', error: 'Upload your video again. Nothing was charged.' }
  const { data } = admin.storage.from(SEU_VIDEO_BUCKET).getPublicUrl(p)
  const url = data?.publicUrl ?? ''
  if (!url) return { ok: false, code: 'missing', error: 'Upload your video again. Nothing was charged.' }
  let bytes = 0
  try {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (!head.ok) return { ok: false, code: 'missing', error: 'Upload your video again. Nothing was charged.' }
    bytes = Number(head.headers.get('content-length') ?? 0)
  } catch {
    return { ok: false, code: 'missing', error: 'Upload your video again. Nothing was charged.' }
  }
  const ler = async (ini: number, fim: number) => {
    const r = await fetch(url, { headers: { Range: `bytes=${ini}-${fim}` }, cache: 'no-store' })
    if (r.status !== 206 && r.status !== 200) throw new Error(`range ${r.status}`)
    const b = new Uint8Array(await r.arrayBuffer())
    return r.status === 200 ? b.subarray(ini, fim + 1) : b
  }
  const meta = bytes > 0 ? await lerMetaDoVideo(ler, bytes) : null
  const tipo = p.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'
  const v = validarVideo(meta, bytes, tipo, SEU_VIDEO_MOTOR) // KINEO-RECREATE-KLING4-1311 — era: validarVideo(meta, bytes, tipo)
  if (!v.ok) return v
  const gerados = segundosGerados(meta!.segundos)
  return { ok: true, url, bytes, meta: meta!, gerados, creditos: creditosDoSeuVideo(gerados), falUsd: SEU_VIDEO_MOTOR === 'kling4' ? custoFalKling4(meta!.segundos) : custoFalDoSeuVideo(meta!.segundos, gerados), /* KINEO-RECREATE-KLING4-1311 */ proporcao: proporcaoDoVideo(meta!.largura, meta!.altura) }
}

/** O submitClip de sempre (saldo, débito, envio, estorno), com o acesso do motor dado pelo interruptor do "seu vídeo" (a sessão já conferiu). */
export function seuVideoSubmitDeps(admin: SupabaseClient, userSupabase: SupabaseClient, account: ClipAccount) {
  const deps = submitDepsFor({ admin, userSupabase, account })
  const envio = comEndUserDaFal(deps.submit, account.userId)
  return { ...deps, engineAccess: () => ({ ok: true as const }), submit: (model: string, input: Record<string, unknown>) => envio(model, semMarcasDaCasa(input)) } // KINEO-SEEDANCE-END-USER-1311 — + submit com end_user_id · KINEO-RECREATE-SOM-PROVA-1311 — as marcas da casa (kineo_*) não vão à fal
}

// ═══ KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 [CEO 13/11 22:46, item A] — o io REAL do texto do pedido (lib/recreate/textoDoPedido.ts) ═══
// Quadro: o MESMO extrator da trava "não trocou" (fal workflow-utilities/extract-nth-frame, ~US$ 0,001), a 35% da duração no fps real.
// Visão: o modelo de imagem da casa (AI_TEXT_MODELS.vision), detail low, JSON, teto de 12 s. Custo de cada parte devolvido para o evento.
export function ioDoTextoReal(videoUrl: string, meta: MetaDoVideo): IoDoTexto {
  return {
    quadro: async () => {
      const r = await extractCheckFrames(videoUrl, {}, intervaloPara(meta.segundos * 0.35, meta.fps))
      return r.frames ? { url: r.frames[0], usd: r.usd } : null
    },
    visao: async (mensagens) => {
      const key = process.env.OPENAI_API_KEY
      if (!key) return null
      const model = AI_TEXT_MODELS.vision
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), VISAO_TIMEOUT_MS)
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0, max_tokens: 250, response_format: { type: 'json_object' }, messages: mensagens }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number } }
        return { data, usd: usdFromUsage(data.usage, PIXEL_MODEL_RATES[model] ?? undefined) }
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
