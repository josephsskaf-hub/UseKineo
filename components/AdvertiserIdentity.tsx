// KINEO-GOOGLE-FAXINA-1011 — a linha da identidade do anunciante (lib/legal/advertiser.ts) + o e-mail de suporte.
// Sem estado: serve a componente de servidor e de cliente.
import type { CSSProperties } from 'react'
import { ADVERTISER_IDENTITY_LINE, ADVERTISER_SUPPORT_EMAIL } from '@/lib/legal/advertiser'

export default function AdvertiserIdentity({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <p data-advertiser-identity="" className={className} style={style}>
      {ADVERTISER_IDENTITY_LINE} Contact:{' '}
      <a href={`mailto:${ADVERTISER_SUPPORT_EMAIL}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
        {ADVERTISER_SUPPORT_EMAIL}
      </a>
    </p>
  )
}
