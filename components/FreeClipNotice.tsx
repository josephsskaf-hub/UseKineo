'use client'

// KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — "Você tem 1 clipe grátis" no topo do /studio e do /clips (regra, ideia pronta e
// eventos em lib/clips/freeClipNotice.ts). Monta NO LUGAR da faixa da região (components/RegionPaidOnlyBanner.tsx), só para
// quem o layout do (dashboard) disse, no servidor, que TEM o presente e ainda não usou (regionFreeClipAvailable).
//
// Precedência (de propósito): o aviso não cobre nada (fluxo normal, sem position/z-index, como a faixa que ele substitui) e
// leva junto o botão dos planos — o CTA que vende não sai da tela. No /studio o botão principal é um link para o /clips com a
// ideia pronta; no /clips é um botão que preenche a ideia ali mesmo (o link para a própria página era o botão morto medido em
// 06/10: 16 cliques de 3 pessoas). Textos nas 16 línguas da interface (lib/clips/clipCopy.ts).
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { clipCopy } from '@/lib/clips/clipCopy'
import { REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'
import {
  FREE_CLIP_APPLY_EVENT,
  FREE_CLIP_IDEA,
  FREE_CLIP_NOTICE_EVENTS,
  FREE_CLIP_NOTICE_HREF,
  FREE_CLIP_NOTICE_VERSION,
  type FreeClipNoticeSurface,
} from '@/lib/clips/freeClipNotice'

// Texto nas cores do TEMA: o claro é o padrão desde a PORCELANA (30/09) e o branco fixo da faixa de 29/09 sumia nele (medido
// em 06/10 com o Edge sem cabeça: título e "See plans" quase invisíveis). O botão azul com texto preto lê nos dois temas.
const PRIMARY = { background: '#2997ff', color: '#000', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit' } as const
const SECONDARY = { color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' } as const

export default function FreeClipNotice({ surface }: { surface: FreeClipNoticeSurface }) {
  const language = useInterfaceLanguage()
  const shownRef = useRef(false)

  // O denominador: o aviso esteve na tela (1× por montagem; trocar de tela remonta pela `key` que a faixa passa).
  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent(FREE_CLIP_NOTICE_EVENTS.shown, { version: FREE_CLIP_NOTICE_VERSION, surface, language })
  }, [surface, language])

  const clicked = (target: 'clip' | 'plans') => {
    void trackEvent(FREE_CLIP_NOTICE_EVENTS.clicked, { version: FREE_CLIP_NOTICE_VERSION, surface, language, target })
  }

  return (
    <div
      data-free-clip-notice={FREE_CLIP_NOTICE_VERSION}
      data-surface={surface}
      role="status"
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))',
        border: '1px solid rgba(41,151,255,.4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 220, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{clipCopy(language, 'freeClipTitle')}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>
          {clipCopy(language, 'freeClipBody', { s: FREE_CLIP_IDEA.seconds })}
        </div>
      </div>
      {surface === 'clips' ? (
        <button
          type="button"
          data-testid="free-clip-notice-cta"
          onClick={() => {
            clicked('clip')
            window.dispatchEvent(new Event(FREE_CLIP_APPLY_EVENT))
          }}
          style={PRIMARY}
        >
          {clipCopy(language, 'freeClipCta')}
        </button>
      ) : (
        <Link href={FREE_CLIP_NOTICE_HREF} data-testid="free-clip-notice-cta" onClick={() => clicked('clip')} style={PRIMARY}>
          {clipCopy(language, 'freeClipCta')}
        </Link>
      )}
      {/* O CTA que vende: os planos, com o mesmo destino e o mesmo data-testid da faixa da região. */}
      <Link href={REGION_PAID_ONLY_PLANS_HREF} data-testid="region-paid-only-plans" onClick={() => clicked('plans')} style={SECONDARY}>
        {clipCopy(language, 'seePlans')}
      </Link>
    </div>
  )
}
