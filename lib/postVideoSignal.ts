// ═══════════════════════════════════════════════════════════════════════════
// KINEO-SINAL-POS-ENTREGA-2026-08-31 (sprint-v1v4 #19)
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Na tela de "vídeo pronto", medido em produção nos últimos 7 dias (externos):
//
//   video_ready_viewed ....... 67 pessoas
//   next_shorts_shown ........ 64 pessoas   <- a prateleira do próximo episódio
//   video_download_clicked ... 33 pessoas   <- A ÚNICA coisa que alguém clica
//   next_shorts_picked ........ 0 pessoas   <- ZERO, em 7 dias
//
// Metade da tela baixa o arquivo. NINGUÉM pega o próximo episódio. E as duas
// coisas nunca se falaram: o módulo de download e a prateleira vivem em
// componentes diferentes, sem estado em comum, e o único jeito de ligá-los
// seria passar props pelo `GenerateClient` — que é ZONA COMPARTILHADA com o
// Codex e está proibida para mim nesta sprint.
//
// A ponte, então, é o próprio navegador: um CustomEvent no `window`. Quem
// entrega o arquivo ANUNCIA; quem oferece o próximo episódio ESCUTA. Nenhum
// import cruzado, nenhuma prop nova, nenhuma linha em arquivo do Codex.
//
// REGRAS QUE ESTE MÓDULO SE IMPÕE
//  1. NUNCA lança. Ele é chamado no caminho do download; telemetria e sinal
//     não podem quebrar a entrega do arquivo (mesma regra do videoDownload).
//  2. NUNCA carrega dado da pessoa. O detalhe é `method` (constante nossa) e
//     `ms` (número). Nada de URL, nada de prompt, nada de e-mail.
//  3. Puro: zero import, zero I/O, seguro em SSR (`window` pode não existir).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nome do sinal. Prefixo `kineo:` para nunca colidir com evento de biblioteca
 * de terceiro no mesmo `window`.
 */
export const SINAL_VIDEO_ENTREGUE = 'kineo:video-delivered'

export interface VideoEntregueDetalhe {
  /** Só o degrau que PROVA entrega ('blob'). Ver videoDownload.ts. */
  method: string
  /** Milissegundos entre o clique e o arquivo na mão. 0 se desconhecido. */
  ms: number
}

/** Mantém o detalhe pequeno, previsível e sem texto de cliente. */
function detalheSeguro(d: Partial<VideoEntregueDetalhe> | undefined): VideoEntregueDetalhe {
  let method = 'unknown'
  try {
    if (typeof d?.method === 'string' && d.method.length > 0 && d.method.length <= 24) {
      method = d.method.replace(/[^a-z_]/gi, '').slice(0, 24) || 'unknown'
    }
  } catch {
    method = 'unknown'
  }
  let ms = 0
  try {
    const n = Number(d?.ms)
    ms = Number.isFinite(n) && n >= 0 && n < 3600000 ? Math.round(n) : 0
  } catch {
    ms = 0
  }
  return { method, ms }
}

/**
 * Anuncia que o arquivo chegou na mão da pessoa. Chamado APENAS no degrau que
 * comprova entrega — nunca no clique, nunca no fallback.
 *
 * A escolha do momento é deliberada e custou uma decisão: o `clicked` tem mais
 * gente (33 contra 31), mas o fallback de mobile mostra um LINK MANUAL logo
 * abaixo do botão quando o blob falha. Um convite que rolasse a tela naquele
 * instante roubaria da pessoa exatamente o link que ela precisa para ter o
 * vídeo. Entrega comprovada = ninguém mais precisa daquele link.
 */
export function anunciarVideoEntregue(detalhe?: Partial<VideoEntregueDetalhe>): void {
  try {
    if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return
    window.dispatchEvent(
      new CustomEvent<VideoEntregueDetalhe>(SINAL_VIDEO_ENTREGUE, {
        detail: detalheSeguro(detalhe),
      }),
    )
  } catch {
    /* silencioso de propósito: o sinal nunca pode derrubar o download */
  }
}

/**
 * Escuta o sinal. Devolve SEMPRE uma função de cancelamento — inclusive em SSR
 * ou quando o navegador não coopera — para o `useEffect` do assinante poder
 * chamá-la sem `if`.
 */
export function ouvirVideoEntregue(
  aoEntregar: (detalhe: VideoEntregueDetalhe) => void,
): () => void {
  try {
    if (typeof window === 'undefined') return () => {}
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<Partial<VideoEntregueDetalhe>>).detail
        aoEntregar(detalheSeguro(detail))
      } catch {
        /* um assinante quebrado não derruba os outros */
      }
    }
    window.addEventListener(SINAL_VIDEO_ENTREGUE, handler)
    return () => {
      try {
        window.removeEventListener(SINAL_VIDEO_ENTREGUE, handler)
      } catch {
        /* ignore */
      }
    }
  } catch {
    return () => {}
  }
}
