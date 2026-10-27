'use client'

import { KineoBoltText } from '@/components/KineoBolt'

// KINEO-NAV-MEGA-PREVIEW-2026-08-17 — item de motor do mega-menu Video com
// MINI-PREVIEW no hover (aprovacao do fundador: "o Higgsfield mostra um
// clipezinho — e nos JA temos os previews de 8s prontos").
// Mecanica: o <video> vive dentro do proprio <Link> (painel .nvp flutuando a
// direita do menu, posicionado pelo CSS em KineoLanding); preload="none" =
// zero download ate o primeiro hover; entrar da play do inicio, sair pausa.
// Fail-open: sem `preview`, e um link normal (Kineo 1 ainda nao tem clipe).
import Link from 'next/link'
import { UiLabel } from '@/components/InterfaceLanguage'
import { useEffect, useRef } from 'react' // KINEO-MENU-VIDEO-RODANDO-2610 — useEffect
import { navThumbAlt1510 } from '@/lib/ui/posterAlt' // KINEO-BING-SEO-1510 — alt descritivo na miniatura do menu
// KINEO-MENU-VIDEO-RODANDO-2610 — fundador 26/10: "onde estão os motores, no menu, eu quero vídeos rodando, não fotos paradas…
// KINEO-MENU-VIDEO-RODANDO-2610 — dá sinal de que os nossos vídeos são bons". Miniatura com mp4 irmão (public/nav-thumbs/<motor>.mp4,
// KINEO-MENU-VIDEO-RODANDO-2610 — 96 px, 4 s, ~10 KB, cortado do MESMO clipe real do motor que deu a foto) roda sozinha em loop; a foto vira o pôster.
const NAV_THUMB_VIDEOS = new Set(['seedance', 'kling', 'veo', 'kling3', 'h3', 's25']) // KINEO-MENU-VIDEO-RODANDO-2610
const NAV_THUMB_VIDEO_STYLE = { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' } // KINEO-MENU-VIDEO-RODANDO-2610
function navThumbVideo(thumb?: string): string | null { // KINEO-MENU-VIDEO-RODANDO-2610
  const m = /^\/nav-thumbs\/([a-z0-9]+)\.webp$/.exec(thumb ?? '') // KINEO-MENU-VIDEO-RODANDO-2610
  return m && NAV_THUMB_VIDEOS.has(m[1]) ? `/nav-thumbs/${m[1]}.mp4` : null // KINEO-MENU-VIDEO-RODANDO-2610
} // KINEO-MENU-VIDEO-RODANDO-2610

export default function NavEngineItem({
  href,
  name,
  desc,
  chip,
  preview,
  icon,
  translateName = false,
  translateChip = false,
  thumb,
}: {
  href: string
  name: string
  desc: string
  /** Selo de tier (ex.: "STUDIO") — ensina a hierarquia sem uma palavra. */
  chip?: string
  /** /previews/{id}.mp4 — clipe leve de 8s do proprio motor. */
  preview?: string
  /** KINEO-MENU-ICONES-2026-08-17 (fundador, ref. Higgsfield): caixinha
      arredondada a esquerda com monograma/glifo do motor. */
  icon?: React.ReactNode
  /** KINEO-HOME-CLIPES-EM-CIMA-2026-10-05 — nome descritivo (ex.: "Photo to clip") passa pela tradução da interface;
      nome de motor é marca e nunca é traduzido (padrão). */
  translateName?: boolean
  /** KINEO-S25-ABRE-2026-10-06 — selo descritivo (ex.: "NEW · paid plans") passa pela tradução da interface; os selos de
      tier de uma palavra (TOP, STUDIO) seguem como estão (padrão). */
  translateChip?: boolean
  /** KINEO-MENU-MINIATURAS-2026-10-09 — miniatura quadrada de um render REAL do motor (public/nav-thumbs, quadro do clipe da vitrine). */
  thumb?: string
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const thumbVideo = navThumbVideo(thumb) // KINEO-MENU-VIDEO-RODANDO-2610
  const thumbRef = useRef<HTMLVideoElement | null>(null) // KINEO-MENU-VIDEO-RODANDO-2610
  // KINEO-MENU-VIDEO-RODANDO-2610 — o menu nasce fechado (<details>): o navegador não dá autoplay em vídeo escondido. Toca ao ficar visível, pausa ao esconder.
  useEffect(() => { // KINEO-MENU-VIDEO-RODANDO-2610
    const v = thumbRef.current; if (!v || typeof IntersectionObserver === 'undefined') return // KINEO-MENU-VIDEO-RODANDO-2610
    const io = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() } }) // KINEO-MENU-VIDEO-RODANDO-2610
    io.observe(v) // KINEO-MENU-VIDEO-RODANDO-2610
    return () => io.disconnect() // KINEO-MENU-VIDEO-RODANDO-2610
  }, [thumbVideo]) // KINEO-MENU-VIDEO-RODANDO-2610
  return (
    <Link
      href={href}
      onMouseEnter={() => {
        const v = ref.current
        if (v) {
          v.currentTime = 0
          v.play().catch(() => {})
        }
      }}
      onMouseLeave={() => ref.current?.pause()}
    >
      {thumb ? <span className="nm-th" aria-hidden="true">{thumbVideo ? <video ref={thumbRef} src={thumbVideo} poster={thumb} width={40} height={40} autoPlay muted loop playsInline preload="metadata" style={NAV_THUMB_VIDEO_STYLE} /> : <img src={thumb} alt={navThumbAlt1510(name)} width={40} height={40} loading="lazy" decoding="async" />}</span> : icon ? <span className="nm-ic" aria-hidden="true"><KineoBoltText>{icon}</KineoBoltText></span> : null}
      <span className="nm-tx">
        <b>
          {translateName ? <UiLabel>{name}</UiLabel> : name}
          {chip ? <em className="nm-chip">{translateChip ? <UiLabel>{chip}</UiLabel> : chip}</em> : null}
        </b>
        <i><UiLabel>{desc}</UiLabel></i>
      </span>
      {preview ? (
        <span className="nvp" aria-hidden="true">
          <video ref={ref} src={preview} muted loop playsInline preload="none" />
        </span>
      ) : null}
    </Link>
  )
}
