'use client'
// KINEO-FILME-RAPIDO-1710 — TROCA DO LINK na tela do Studio.
//
// O "pronto" do /api/compose/status chega com o link do Creatomate (vive dias) e o servidor copia o MP4 para o nosso
// bucket DEPOIS da resposta. Este gancho pergunta, de leve (?asset=1: só lê a linha do vídeo — nada de débito, e-mail
// ou fornecedor), e entrega o link do bucket assim que ele existe. Desistir é seguro: a linha do vídeo (My Videos,
// /history) já aponta para o bucket, e o cron de resgate copia o que a cópia de fundo não copiou.
import { useEffect } from 'react'

export const ESPERAS_DA_TROCA_MS = [5000, 8000, 12000, 20000, 30000] as const
/** KINEO-REFAZER-CENA-2710 — o evento DOM da refação de cena (= SCENE_REDO_SWAP_EVENT de lib/cinematic/refazerCena.ts; o guardião
 *  test-refazer-cena-2710 confere que são o mesmo texto). Por extenso aqui porque test-filme-rapido-1710 carrega este arquivo com imports fechados. */
export const SCENE_REDO_SWAP_NAME = 'kineo:scene-redo-delivered' // KINEO-REFAZER-CENA-2710

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
  // KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — a refação grátis de UMA cena
  // (painel SceneRedoPanel, na tela do filme pronto) avisa por evento DOM quando a versão nova existe; a troca do player é a
  // MESMA de cima (o Studio guarda o ponto e o mudo e retoma). Só na fase 'done' e só link https; sem renderId, pois a
  // cópia para o bucket pode já ter terminado (renderId nulo) e a troca de cena acontece depois disso.
  useEffect(() => { // KINEO-REFAZER-CENA-2710
    if (!ativo || typeof window === 'undefined') return // KINEO-REFAZER-CENA-2710
    const ouvir = (e: Event) => { // KINEO-REFAZER-CENA-2710
      const d = (e as CustomEvent).detail as { url?: unknown } | null // KINEO-REFAZER-CENA-2710
      const url = d && typeof d === 'object' && typeof d.url === 'string' && d.url.startsWith('https://') ? d.url : null // KINEO-REFAZER-CENA-2710 — só link https (a mesma régua de detalheDaTroca)
      if (url) a.aoTrocar(url) // KINEO-REFAZER-CENA-2710
    } // KINEO-REFAZER-CENA-2710
    window.addEventListener(SCENE_REDO_SWAP_NAME, ouvir) // KINEO-REFAZER-CENA-2710
    return () => window.removeEventListener(SCENE_REDO_SWAP_NAME, ouvir) // KINEO-REFAZER-CENA-2710
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]) // KINEO-REFAZER-CENA-2710
}
