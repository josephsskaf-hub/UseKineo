'use client'

import { fitFrameToVideo } from '@/lib/frameFit'

// KINEO-QUADRO-QUE-SE-AJUSTA-2026-09-02 — /v/[id] é uma página de SERVIDOR, e
// server component não pode carregar handler de evento. Este arquivo existe só
// para dar ao player o `onLoadedMetadata` que ajusta o quadro. Vale a pena o
// arquivo extra porque esta é a página que o cliente MANDA para outra pessoa:
// é a nossa vitrine de graça. Um filme 16:9 espremido numa moldura vertical
// aqui não estraga só a experiência dele — estraga a primeira impressão de
// quem ainda nem conhece a Kineo.
export default function PublicVideoPlayer({
  src,
  poster,
}: {
  src: string
  poster?: string
}) {
  return (
    <video
      src={src}
      poster={poster}
      controls
      // ONDA4 #17 (14/08) — quem vem de link social espera reprodução
      // imediata: autoplay mudo em loop, controles na mão para o som.
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => fitFrameToVideo(e.currentTarget)}
      style={{
        width: '100%',
        // valor INICIAL (quadro de ~100% do acervo); o handler acima corrige
        // sozinho quando o arquivo é 16:9, 1:1 ou 4:5.
        aspectRatio: '9 / 16',
        borderRadius: 18,
        background: '#000',
        border: '1px solid rgba(41,151,255,0.25)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    />
  )
}
