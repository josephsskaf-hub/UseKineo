'use client'

// ONDA4 #4 (14/08) — a pagina que E o loop viral nao tinha botao de
// compartilhar: quem recebia o link no WhatsApp nao tinha como repassa-lo, e o
// loop morria no primeiro salto. navigator.share no celular, copy-link no
// desktop — sempre preservando os params de atribuicao da URL atual.
//
// KINEO-LACOS-SHARE-2026-10-02 — o repasse era cego: nenhum evento dizia se alguem apertava "Send to a friend", nem
// por qual caminho. Agora cada clique grava `public_video_share_clicked` com o id do filme e o MÉTODO que de fato
// aconteceu (native_share concluído, clipboard, ou falha), via trackEvent. O botão não põe a URL nem o título no
// metadado (o id do filme basta para juntar com o resto do funil do /v/); as UTMs de chegada entram como em todo
// trackEvent.
import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

const PUBLIC_VIDEO_SHARE_CLICKED_EVENT = 'public_video_share_clicked'

type ShareMethod = 'native_share' | 'clipboard' | 'unavailable'

export default function ShareVideoButton({ title, videoId }: { title: string; videoId: string }) {
  const [copied, setCopied] = useState(false)

  function record(method: ShareMethod, nativeCancelled: boolean) {
    void trackEvent(PUBLIC_VIDEO_SHARE_CLICKED_EVENT, {
      video_id: videoId,
      method,
      native_available: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
      native_cancelled: nativeCancelled,
      surface: 'public_video_page',
    })
  }

  async function handleShare() {
    const url = window.location.href
    let nativeCancelled = false
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        record('native_share', false)
        return
      } catch {
        /* usuario cancelou — cai no copy */
        nativeCancelled = true
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      record('clipboard', nativeCancelled)
    } catch {
      /* clipboard bloqueado — nada util a fazer, mas o clique conta */
      record('unavailable', nativeCancelled)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      style={{
        display: 'inline-block',
        marginLeft: 10,
        background: 'transparent',
        color: '#2997ff',
        fontWeight: 800,
        padding: '13px 20px',
        borderRadius: 12,
        border: '1px solid rgba(41,151,255,0.45)',
        fontSize: '0.95rem',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Link copied' : 'Send to a friend'}
    </button>
  )
}
