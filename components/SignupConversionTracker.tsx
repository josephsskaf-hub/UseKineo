'use client'

// ═══ KINEO-POUSO-VITRINE-2026-08-25 — O LOGIN AGORA POUSA NA HOME ═══════════
// Ordem do fundador (25/08, print na mão): "gostaria que entrasse sempre na
// tela onde estão os quatro" — depois do login, a pessoa cai na VITRINE (os 4
// cards Veo/Kling 3/MiniMax/Omni), não no onboarding do /generate.
//
// Este componente existe por UM motivo: a conversão de cadastro do Google Ads
// (e do TikTok) disparava DENTRO do GenerateClient via ?signup=1. Mudar o
// pouso sem mover o disparo = comprar clique e não contar o cadastro. Isto é
// uma réplica fiel do bloco do GenerateClient (#188/#378): mesmo send_to,
// mesmo transaction_id (dedup por uid — se a pessoa navegar pro /generate e o
// bloco de lá disparar de novo, o Ads dedupa sozinho), mesmo strip de URL via
// history.replaceState (nunca router.replace — ver a lição do PUSH #96).
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackSignupSource } from '@/lib/analytics'

export default function SignupConversionTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('signup') !== '1') return
    } catch {
      return
    }
    void (async () => {
      try {
        let uid = ''
        try {
          const supabase = createClient()
          const { data } = await supabase.auth.getUser()
          uid = data.user?.id ?? ''
        } catch {
          /* ignore */
        }
        if (typeof (window as unknown as { gtag?: Function }).gtag === 'function') {
          ;(window as unknown as { gtag: Function }).gtag('event', 'conversion', {
            send_to: 'AW-18156258081/SXGYCK_VlrEcEKGGytFD',
            value: 1.0,
            currency: 'BRL',
            transaction_id: 'signup_' + (uid || `oauth_${Date.now()}`),
          })
        }
        const ttq = (window as unknown as { ttq?: { track: Function } }).ttq
        if (ttq && typeof ttq.track === 'function') {
          ttq.track('CompleteRegistration', { content_name: 'signup_oauth' })
        }
        trackSignupSource()
      } catch {
        /* non-blocking */
      } finally {
        try {
          const url = new URL(window.location.href)
          url.searchParams.delete('signup')
          window.history.replaceState({}, '', url.pathname + url.search + url.hash)
        } catch {
          /* ignore */
        }
      }
    })()
  }, [])
  return null
}
