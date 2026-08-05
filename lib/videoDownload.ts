// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DOWNLOAD-TRUTH-2026-08-04 — o maior buraco do funil era CEGO
//
// MEDIDO em 04/08 (contas internas fora): 327 pessoas geraram um vídeo
// `completed`, 67 dispararam `video_downloaded`. **20%.** Entre as 109 que
// chegaram na tela pós-render (`next_shorts_shown`), só 40 baixaram — 36,7%.
// Dito de outro jeito: 260 pessoas fizeram um vídeo e foram embora sem o
// arquivo. Nenhuma delas vira cliente: a compra nasce depois de usar.
//
// O PROBLEMA NÃO ERA O NÚMERO, ERA A CEGUEIRA. As três telas de download
// (done screen, /history, /my-videos) tinham a MESMA implementação e o MESMO
// defeito:
//
//     try { fetch → blob → a.click() ; track('video_downloaded') }
//     catch { window.open(url) }        // ← silêncio absoluto
//
// `video_downloaded` só existia no caminho FELIZ. Todo download que caiu no
// fallback nunca foi contado, e todo CLIQUE que não virou download nunca
// existiu. Com isso os 80% que "não baixam" podiam ser três coisas
// completamente diferentes — e cada uma pede uma correção oposta:
//
//   (a) nunca clicaram          → problema de UI/valor  → CTA sticky (Medida 5)
//   (b) clicaram e o blob falhou→ problema de servidor  → CORS/tamanho/rede
//   (c) clicaram, caiu no       → problema de MOBILE    → o `window.open` roda
//       fallback e foi bloqueado                          DEPOIS de um `await`,
//                                                         fora do gesto do
//                                                         usuário: o Safari/
//                                                         Chrome mobile bloqueia
//                                                         o popup e a pessoa
//                                                         fica com NADA na mão,
//                                                         sem erro na tela.
//
// Construir a Medida 5 (CTA sticky) sem saber se o caso é (a) seria gastar uma
// sprint numa hipótese não testada — se a causa for (c), CTA nenhum resolve.
//
// ESTE MÓDULO FAZ DUAS COISAS, e é a ÚNICA implementação de download do produto
// (as três telas passam a chamar daqui — sem drift futuro):
//
//  1. INSTRUMENTA os três desfechos.
//     · `video_download_clicked` dispara ANTES de qualquer `await` — é o
//       denominador honesto que nunca existiu. Clique é clique mesmo que o
//       arquivo nunca chegue.
//     · `video_download_failed` carrega o motivo do blob ter falhado.
//     · `video_downloaded` ganha `method` (blob | popup | navigate) e `device`.
//       Os campos ANTIGOS (`export_type`, `video_id`, `filename`) continuam
//       exatamente como estavam — /api/admin/funnel, /api/admin/metrics,
//       send-comeback50 e o cron send-video-ready leem esse evento e NÃO podem
//       quebrar. Esta mudança é puramente aditiva no payload.
//
//  2. TORNA O FALLBACK VISÍVEL — sem inventar entrega.
//
//     ⚠️ DECISÃO DELIBERADA, e ela contraria o rascunho desta mesma sprint. A
//     primeira versão adicionava um 3º degrau (`location.href`) "que nenhum
//     navegador bloqueia". Duas razões mataram esse degrau na revisão:
//
//       · `location.href` NAVEGA A MESMA ABA. Se a URL do Supabase não vier com
//         `Content-Disposition: attachment`, o usuário é jogado num player de
//         vídeo e PERDE o app — na done screen isso destrói justamente o upsell
//         de marca d'água e o `VideoRatingAsk` que rodam depois. O fallback
//         antigo (`_blank`) ao menos preservava a página.
//       · Emitir `video_downloaded` ali seria FALSO POSITIVO: navegar para uma
//         URL não prova entrega nenhuma. E `video_downloaded` é lido por
//         `send-comeback50` e pelo cron `send-video-ready` para decidir quem
//         NÃO precisa de e-mail — inflar esse evento faria a empresa parar de
//         resgatar exatamente quem falhou.
//
//     A tese desta sprint é "medir antes de corrigir". Aplicá-la a si mesma
//     significa: o comportamento de entrega fica IDÊNTICO ao que já estava em
//     produção (blob → `window.open`), e o que muda é só a visibilidade. Se
//     `video_download_popup_blocked` aparecer com volume, a correção certa não
//     é sequestrar a aba — é mostrar na tela um link que o usuário toca (gesto
//     real do usuário nunca é bloqueado). Isso é UI, e vira trabalho de sprint
//     com o número na mão, não palpite às 21h.
//
//     Consequência importante: `video_downloaded` continua sendo emitido
//     SOMENTE quando temos os bytes na mão (degrau do blob) — semântica
//     inalterada, nenhum consumidor histórico muda de leitura.
//
//  3. NÃO CASCATEIA QUANDO NÃO ADIANTA. Se o `fetch` devolveu um STATUS HTTP
//     (403/404/410...), o CORS deixou passar e o servidor disse que o arquivo
//     não está lá — abrir a mesma URL numa aba nova só entrega uma página de
//     erro. Cascata só faz sentido no erro sem status (rede/CORS), onde a
//     navegação direta ainda pode funcionar.
//
// REGRA: telemetria nunca pode quebrar o download. Todo `track` é
// fire-and-forget e todo caminho está dentro de try/catch.
// ═══════════════════════════════════════════════════════════════════════════

import { trackEvent } from '@/lib/analytics'

export type DownloadSurface = 'done_screen' | 'history' | 'my_videos'

/**
 * Desfecho do download. Só `blob` conta como `video_downloaded` — é o único em
 * que os bytes passaram pela nossa mão.
 *   blob            → salvo com nome legível (ideal)
 *   fallback_opened → abriu numa aba nova; o usuário tem o arquivo na tela
 *   popup_blocked   → o navegador barrou; a pessoa ficou SEM NADA
 *   unavailable     → o servidor negou o arquivo (status HTTP definitivo)
 */
export type DownloadOutcome =
  | 'blob'
  | 'fallback_opened'
  | 'popup_blocked'
  | 'unavailable'

export interface DownloadVideoOptions {
  url: string
  /** Nome final do arquivo, já com .mp4. */
  filename: string
  /** 'watermarked' | 'clean' | 'current_asset' — NÃO renomear: o funil lê isto. */
  exportType: string
  /** Tela que originou o clique. */
  surface: DownloadSurface
  videoId?: string | null
  /** Metadados extras específicos da tela (opcional). */
  extra?: Record<string, unknown>
}

/**
 * 'mobile' | 'desktop'. Serve para separar a hipótese (c) das demais já na
 * primeira leitura, sem precisar de um segundo deploy para descobrir isso.
 */
function deviceClass(): 'mobile' | 'desktop' | 'unknown' {
  try {
    if (typeof navigator === 'undefined') return 'unknown'
    const ua = navigator.userAgent || ''
    if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return 'mobile'
    // iPadOS 13+ se apresenta como Mac; o toque desempata.
    if (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) {
      return 'mobile'
    }
    return 'desktop'
  } catch {
    return 'unknown'
  }
}

function fire(name: string, metadata: Record<string, unknown>): void {
  // fire-and-forget: telemetria NUNCA segura nem quebra o download.
  try {
    void trackEvent(name, metadata)
  } catch {
    /* silencioso de propósito */
  }
}

/**
 * Baixa o vídeo e conta a verdade sobre o que aconteceu.
 *
 * Devolve o desfecho. `null` só em ambiente sem `window` (SSR).
 */
export async function downloadVideoFile(
  opts: DownloadVideoOptions,
): Promise<DownloadOutcome | null> {
  const { url, filename, exportType, surface, videoId, extra } = opts
  const device = deviceClass()

  // Base compartilhada por TODOS os eventos desta função. `export_type` e
  // `video_id` mantêm os nomes históricos.
  const base: Record<string, unknown> = {
    surface,
    device,
    export_type: exportType,
    filename,
    ...(videoId ? { video_id: videoId } : {}),
    ...(extra ?? {}),
  }

  // ── Degrau 0: o denominador. Antes de qualquer await, sempre. ────────────
  fire('video_download_clicked', base)

  if (typeof window === 'undefined') return null

  const startedAt = Date.now()

  // ── Degrau 1: blob nomeado (o único que salva com nome legível) ──────────
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {
        /* ignore */
      }
    }, 4000)

    fire('video_downloaded', {
      ...base,
      method: 'blob',
      bytes: blob.size,
      ms: Date.now() - startedAt,
    })
    return 'blob'
  } catch (err) {
    // O motivo importa e decide se vale cascatear:
    //   `HTTP 4xx/5xx` → o CORS passou e o SERVIDOR negou o arquivo. Abrir a
    //                    mesma URL numa aba nova entrega uma página de erro.
    //   qualquer outro → rede ou CORS. A navegação direta ainda pode funcionar.
    const reason = err instanceof Error ? err.message.slice(0, 120) : 'unknown'
    const httpStatus = /^HTTP (\d{3})$/.exec(reason)?.[1] ?? null
    fire('video_download_failed', {
      ...base,
      reason,
      http_status: httpStatus,
      ms: Date.now() - startedAt,
    })
    if (httpStatus) return 'unavailable'
  }

  // ── Degrau 2: aba nova. Pode ser BARRADA (estamos fora do gesto). ────────
  // Comportamento IDÊNTICO ao que já estava em produção — o que muda é que
  // agora sabemos quando ele é barrado. Deliberadamente NÃO emite
  // `video_downloaded`: abrir uma aba não prova que o arquivo chegou, e esse
  // evento decide quem os e-mails de resgate deixam de procurar.
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) {
      fire('video_download_fallback_opened', { ...base, ms: Date.now() - startedAt })
      return 'fallback_opened'
    }
    // `win === null` = popup bloqueado. ESTE era o buraco silencioso: a pessoa
    // fica sem arquivo e sem mensagem de erro, e o banco não registrava nada.
    fire('video_download_popup_blocked', base)
  } catch {
    fire('video_download_popup_blocked', { ...base, threw: true })
  }

  return 'popup_blocked'
}
