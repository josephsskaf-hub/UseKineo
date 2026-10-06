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
import { useRef } from 'react'

export default function NavEngineItem({
  href,
  name,
  desc,
  chip,
  preview,
  icon,
  translateName = false,
  translateChip = false,
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
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
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
      {icon ? <span className="nm-ic" aria-hidden="true"><KineoBoltText>{icon}</KineoBoltText></span> : null}
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
