// KINEO-ESTRELA-DO-FILME-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] — o lado de SERVIDOR da estrela.
//
// A régua (quem pode, preço, quais cenas, o texto do pedido, o payload) mora em lib/estrelaDoFilme.ts (pura, com guardião).
// Aqui só o que precisa de rede:
//   · assinar as fotos da conta (lib/imageStore signReferencePhotos — o MESMO assinador do /images, 15 min, pasta da conta);
//   · pedir o still de cada cena ao fal-ai/nano-banana-pro/edit — UM POST por cena (submitFalQueueOnce), só leitura depois;
//   · passar CADA still pela moderação de saída (surface 'estrela') antes de ele virar âncora de clipe.
// FALHA ABERTA PARA O FILME, FECHADA PARA O STILL: qualquer falha (fornecedor, prazo, moderação barrou OU fora do ar) devolve
// null para aquela cena, e a rota usa o still de hoje (FLUX) — a cena sai sem a estrela, o filme não morre. Um still
// ambíguo (POST que pode ter sido aceito) também vira null: ele é descartável e NUNCA é re-postado (a cena cai em outro
// modelo, o FLUX — a mesma disciplina do still clássico em lib/hollywood/anchors.ts generateCinematicSceneStill).
import { fal } from '@fal-ai/client'
import { submitFalQueueOnce } from '@/lib/falQueue'
import { signReferencePhotos } from '@/lib/imageStore'
import { REFERENCE_SIGNED_URL_SECONDS } from '@/lib/imageReference'
import { moderateContent } from '@/lib/safety/contentModeration'
import { ESTRELA_EDIT_SLUG, buildEstrelaEditInput } from '@/lib/estrelaDoFilme'

/** Custo de log (US$ por still da estrela na fal, a 1K) — só para o TOTAL do log; o crédito do cliente é a sobretaxa. */
export const ESTRELA_STILL_USD = 0.15

export type EstrelaStillMotivo = 'ok' | 'provider_failed' | 'provider_timeout' | 'moderation_blocked' | 'moderation_unavailable' | 'no_key'
export interface EstrelaStillResultado { url: string | null; motivo: EstrelaStillMotivo }

/** URLs assinadas (curtas) das fotos já validadas por decideEstrelaRequest. null = alguma foto sumiu do bucket. */
export async function assinarFotosDaEstrela(paths: string[]): Promise<string[] | null> {
  if (!Array.isArray(paths) || paths.length === 0) return null
  return signReferencePhotos(paths, REFERENCE_SIGNED_URL_SECONDS)
}

async function pedirStill(input: Record<string, unknown>, pollWindowMs: number): Promise<{ url: string | null; motivo: EstrelaStillMotivo }> {
  let requestId: string
  try {
    requestId = await submitFalQueueOnce(ESTRELA_EDIT_SLUG, input)
  } catch (err) {
    console.warn('[estrela] submit falhou (cena volta ao still de hoje):', err instanceof Error ? err.message : String(err))
    return { url: null, motivo: 'provider_failed' }
  }
  const prazo = Date.now() + pollWindowMs
  let authFails = 0
  while (Date.now() < prazo) {
    try {
      const st = (await fal.queue.status(ESTRELA_EDIT_SLUG, { requestId })) as { status?: string }
      if (st.status === 'COMPLETED') {
        const r = (await fal.queue.result(ESTRELA_EDIT_SLUG, { requestId })) as { data?: { images?: Array<{ url?: string }> }; images?: Array<{ url?: string }> }
        const url = r?.data?.images?.[0]?.url ?? r?.images?.[0]?.url ?? null
        return url ? { url, motivo: 'ok' } : { url: null, motivo: 'provider_failed' }
      }
      if (st.status === 'FAILED') return { url: null, motivo: 'provider_failed' }
      authFails = 0
    } catch (err) {
      // status/result são leituras: repetir não cria job novo. 401/403 três vezes = fatal (mesma regra das âncoras).
      const msg = err instanceof Error ? err.message : String(err)
      const code = (err as { status?: number })?.status
      if (code === 401 || code === 403 || /forbidden|unauthorized/i.test(msg)) {
        authFails += 1
        if (authFails >= 3) return { url: null, motivo: 'provider_failed' }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return { url: null, motivo: 'provider_timeout' }
}

/** Um still da estrela: pedido ao edit + moderação de saída. Nunca lança. */
export async function gerarStillDaEstrela(args: {
  prompt: string
  imageUrls: string[]
  aspect: unknown
  userId: string
  engine: string
  pollWindowMs: number
}): Promise<EstrelaStillResultado> {
  const key = process.env.FAL_KEY
  if (!key) return { url: null, motivo: 'no_key' }
  try {
    fal.config({ credentials: key })
    const input = buildEstrelaEditInput(args.prompt, args.imageUrls, args.aspect)
    const pedido = await pedirStill(input, args.pollWindowMs)
    if (!pedido.url) return pedido
    // A imagem pronta passa pela régua ANTES de virar o primeiro quadro de um clipe pago. Barrada ou sem veredito = a cena
    // volta ao still de hoje (content_moderation_blocked/unavailable já é gravado pela porta).
    const check = await moderateContent({ surface: 'estrela', stage: 'output', userId: args.userId, text: args.prompt, imageUrls: [pedido.url], meta: { engine: args.engine } })
    if (!check.ok) return { url: null, motivo: check.reason === 'blocked' ? 'moderation_blocked' : 'moderation_unavailable' }
    return { url: pedido.url, motivo: 'ok' }
  } catch (err) {
    console.warn('[estrela] still falhou (cena volta ao still de hoje):', err instanceof Error ? err.message : String(err))
    return { url: null, motivo: 'provider_failed' }
  }
}

/**
 * Os stills da estrela de um filme, com N trabalhadores e prazo total. Índice alinhado às cenas: `urls[i]` é o still da
 * cena i, ou null (sem protagonista, falhou, barrado, ou o prazo acabou antes de ela começar). Nunca lança.
 */
export async function gerarStillsDaEstrela(args: {
  itens: Array<{ indice: number; prompt: string }>
  total: number
  imageUrls: string[]
  aspect: unknown
  userId: string
  engine: string
  pool?: number
  budgetMs?: number
  pollWindowMs?: number
}): Promise<{ urls: (string | null)[]; motivos: Partial<Record<EstrelaStillMotivo, number>>; feitos: number }> {
  const urls: (string | null)[] = new Array(Math.max(0, args.total)).fill(null)
  const motivos: Partial<Record<EstrelaStillMotivo, number>> = {}
  const fila = [...args.itens]
  const prazoTotal = Date.now() + (args.budgetMs ?? 90_000)
  let feitos = 0
  const trabalhador = async () => {
    while (fila.length > 0 && Date.now() < prazoTotal) {
      const item = fila.shift()!
      const restante = Math.max(5_000, Math.min(args.pollWindowMs ?? 40_000, prazoTotal - Date.now()))
      const r = await gerarStillDaEstrela({ prompt: item.prompt, imageUrls: args.imageUrls, aspect: args.aspect, userId: args.userId, engine: args.engine, pollWindowMs: restante })
      motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1
      if (r.url && item.indice >= 0 && item.indice < urls.length) { urls[item.indice] = r.url; feitos++ }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.max(1, Math.min(args.pool ?? 4, args.itens.length || 1)) }, () => trabalhador()))
  } catch (err) {
    console.warn('[estrela] lote falhou (cenas voltam ao still de hoje):', err instanceof Error ? err.message : String(err))
  }
  if (fila.length > 0) motivos.provider_timeout = (motivos.provider_timeout ?? 0) + fila.length
  return { urls, motivos, feitos }
}
