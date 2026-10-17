'use client'
// KINEO-FILME-RAPIDO-1710 — TROCA DO LINK na tela do Studio.
//
// O "pronto" do /api/compose/status chega com o link do Creatomate (vive dias) e o servidor copia o MP4 para o nosso
// bucket DEPOIS da resposta. Este gancho pergunta, de leve (?asset=1: só lê a linha do vídeo — nada de débito, e-mail
// ou fornecedor), e entrega o link do bucket assim que ele existe. Desistir é seguro: a linha do vídeo (My Videos,
// /history) já aponta para o bucket, e o cron de resgate copia o que a cópia de fundo não copiou.
import { useEffect } from 'react'

export const ESPERAS_DA_TROCA_MS = [5000, 8000, 12000, 20000, 30000] as const

/** Uma pergunta: o link do bucket, ou null (ainda não, ou falhou). */
export async function perguntarLinkDoBucket(renderId: string, buscar: typeof fetch = fetch): Promise<string | null> {
  try {
    const r = await buscar(`/api/compose/status/${encodeURIComponent(renderId)}?asset=1`, { cache: 'no-store' })
    const d = (await r.json().catch(() => null)) as { asset_ready?: unknown; final_video_url?: unknown } | null
    return r.ok && d?.asset_ready === true && typeof d.final_video_url === 'string' && d.final_video_url ? d.final_video_url : null
  } catch {
    return null
  }
}

export function useTrocaDoLinkDoBucket(a: { ativo: boolean; renderId: string | null; aoTrocar: (url: string) => void }): void {
  const { ativo, renderId } = a
  useEffect(() => {
    if (!ativo || !renderId) return
    let cancelado = false
    let tentativa = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const perguntar = async () => {
      if (cancelado) return
      const url = await perguntarLinkDoBucket(renderId)
      if (cancelado) return
      if (url) { a.aoTrocar(url); return }
      tentativa += 1
      if (tentativa < ESPERAS_DA_TROCA_MS.length) timer = setTimeout(perguntar, ESPERAS_DA_TROCA_MS[tentativa])
    }
    timer = setTimeout(perguntar, ESPERAS_DA_TROCA_MS[0])
    return () => { cancelado = true; if (timer) clearTimeout(timer) }
    // `aoTrocar` é lido na hora da troca; o laço só recomeça quando muda o render ou a fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, renderId])
}
