'use client'

import { trackClosedEvent } from '@/lib/analytics'

type Props = {
  sourcePage: '/how-much-do-youtube-shorts-pay' | '/youtube-shorts-rpm-by-niche'
}

// KINEO-GOOGLE-PORTA-1711 — this door only navigates. No creation contract,
// free-film promise or acquisition UTM: the article remains the origin.
export default function GoogleCreatorDoor({ sourcePage }: Props) {
  return (
    <aside
      data-google-creator-door
      aria-label="Films for faceless channel creators"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 20px',
        padding: '16px 18px',
        margin: '0 0 28px',
        border: '1px solid #264f73',
        borderRadius: 14,
        background: '#111b25',
      }}
    >
      <p style={{ flex: '1 1 260px', margin: 0, color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.55 }}>
        Run a faceless channel? Turn your next idea into a narrated film with captions.
      </p>
      <a
        href="/for-creators"
        onClick={() => {
          void trackClosedEvent('google_creator_door_clicked', {
            source_page: sourcePage,
            destination: '/for-creators',
            placement: 'article_intro',
            version: 'google_porta_1711',
          }, sourcePage)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          maxWidth: '100%',
          padding: '11px 16px',
          borderRadius: 9,
          background: '#2997ff',
          color: '#071522',
          fontSize: '0.9rem',
          fontWeight: 750,
          lineHeight: 1.4,
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        Explore films for your channel <span aria-hidden="true" style={{ marginLeft: 8 }}>→</span>
      </a>
    </aside>
  )
}
