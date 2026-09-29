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
import { REGION_PAID_ONLY_NOTICE, REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'

export const REGION_PAID_ONLY_BANNER_VERSION = 'region_paid_only_notice_v1' as const

export default function RegionPaidOnlyBanner() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(REGION_PAID_ONLY_NOTICE, language)
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('region_paid_only_notice_shown', { version: REGION_PAID_ONLY_BANNER_VERSION, language })
  }, [language])

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
      <Link
        href={REGION_PAID_ONLY_PLANS_HREF}
        data-testid="region-paid-only-plans"
        onClick={() => { void trackEvent('region_paid_only_notice_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
        style={{
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
        {copy.cta}
      </Link>
    </div>
  )
}
