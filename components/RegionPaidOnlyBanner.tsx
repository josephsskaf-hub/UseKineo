'use client'

// KINEO-E4-SAIDA-B-2026-09-29 — o aviso honesto para quem nasceu fora do filme grátis (saída B do fundador).
//
// A conta de país fora da lista nasce com trial_status='region_paid_only' e 0 crédito (lib/reverseTrial.ts). Sem
// isto ela só descobria no clique, com uma parede de saldo que parece defeito. Esta faixa diz a verdade no topo de toda
// tela autenticada — "o filme grátis ainda não está disponível no seu país; os planos funcionam normalmente" — com o
// botão dos planos. Texto em pt/en/es (lib/freeFilmPolicy.ts REGION_PAID_ONLY_NOTICE, pela língua escolhida da
// interface; as outras caem no inglês). Some sozinha quando a pessoa paga (regionPaidOnlyNoticeVisible, no servidor).
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { REGION_FREE_CLIP_HREF, REGION_FREE_CLIP_NOTICE, REGION_PAID_ONLY_NOTICE, REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'
import { PREVIA_CENAS_PUBLIC, PREVIA_COPY } from '@/lib/scenePreview' // KINEO-PREVIA-CENAS-2026-10-03

export const REGION_PAID_ONLY_BANNER_VERSION = 'region_paid_only_notice_v1' as const

// KINEO-CLIPE-GRATIS-REGIAO-2026-10-05 (fundador, item 1A) — com o clipe grátis disponível (5 cr dados no cadastro), a faixa
// vira "seu primeiro clipe é grátis" com o botão para o /clips; os planos descem para o botão secundário. Usou o clipe
// (saldo < 5) = volta a faixa de sempre.
export default function RegionPaidOnlyBanner({ freeClip = false }: { freeClip?: boolean }) {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE : REGION_PAID_ONLY_NOTICE, language)
  const plansCta = pickInterfaceCopy(REGION_PAID_ONLY_NOTICE, language).cta
  const previa = pickInterfaceCopy(PREVIA_COPY, language) // KINEO-PREVIA-CENAS-2026-10-03
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('region_paid_only_notice_shown', { version: REGION_PAID_ONLY_BANNER_VERSION, language, variant: freeClip ? 'free_clip' : 'plans' })
  }, [language, freeClip])

  return (
    <div
      data-region-paid-only={REGION_PAID_ONLY_BANNER_VERSION}
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
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{copy.title}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,.78)' }}>{copy.body}</div>
      </div>
      {/* KINEO-PREVIA-CENAS-2026-10-03 — antes dos planos, a prévia grátis das cenas (o produto funcionando por centavos). */}
      {freeClip ? (
        <Link
          href={REGION_FREE_CLIP_HREF}
          data-testid="region-free-clip"
          onClick={() => { void trackEvent('region_free_clip_cta_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
          style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {copy.cta}
        </Link>
      ) : null}
      {!freeClip && PREVIA_CENAS_PUBLIC ? (
        <Link
          href="/studio/previa"
          data-testid="region-paid-only-preview"
          onClick={() => { void trackEvent('region_paid_only_preview_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
          style={{ color: '#fff', border: '1px solid rgba(255,255,255,.55)', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {previa.bannerPreview}
        </Link>
      ) : null}
      <Link
        href={REGION_PAID_ONLY_PLANS_HREF}
        data-testid="region-paid-only-plans"
        onClick={() => { void trackEvent('region_paid_only_notice_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
        style={freeClip
          ? { color: '#fff', border: '1px solid rgba(255,255,255,.55)', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }
          : {
            background: '#2997ff',
            color: '#000',
            borderRadius: 999,
            padding: '11px 18px',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
      >
        {freeClip ? plansCta : copy.cta}
      </Link>
    </div>
  )
}
