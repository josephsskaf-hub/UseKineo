'use client'

// ═══ KINEO-IDEIA-POUSA-NO-STUDIO-2026-10-03 — o que a casa de máquinas fazia na chegada do cadastro, agora no Studio ══
//
// Até hoje, quem se cadastrava com uma ideia pousava no /studio/create, e o GenerateClient fazia três coisas na
// chegada: (1) disparava a conversão de cadastro do Google Ads/TikTok com ?signup=1, (2) rodava o catch-all de origem
// (trackSignupSource → profiles.signup_country/utm — a coluna que decide até a coorte do filme grátis por país) e
// (3) gravava a chegada. Mover o pouso para /studio sem mover isso seria comprar clique e não contar o cadastro.
//
// (1) é o SignupConversionTracker de sempre (réplica fiel do bloco do GenerateClient, dedup por uid).
// (2) trackSignupSource() se deduplica sozinho por sessão.
// (3) `studio_idea_arrived_v1`: a PROVA por evento de que a ideia chegou PREENCHIDA no Studio (has_prompt) — o
//     StudioClient já põe ?prompt= na caixa (efeito KINEO-STUDIO-ENTRADA-2026-08-17); este componente não toca nela.
// Nada aqui inicia render, analisa texto ou gasta crédito.
import { useEffect } from 'react'
import SignupConversionTracker from '@/components/SignupConversionTracker'
import { trackEvent, trackSignupSource } from '@/lib/analytics'
import { IDEIA_POUSA_NO_STUDIO_VERSION } from '@/lib/growth/ideiaPousaNoStudio'

export default function StudioIdeaArrival() {
  useEffect(() => {
    let params: URLSearchParams
    try {
      params = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    const entry = params.get('signup') === '1' ? 'oauth_signup' : params.get('welcome') === '1' ? 'email_signup' : null
    if (!entry) return
    trackSignupSource()
    const prompt = (params.get('prompt') ?? '').trim()
    void trackEvent('studio_idea_arrived_v1', {
      version: IDEIA_POUSA_NO_STUDIO_VERSION,
      activation_entry: entry,
      has_prompt: prompt.length > 0,
      prompt_length: prompt.length,
      engine: params.get('engine'),
      intent_campaign: (params.get('intent_campaign') ?? '').slice(0, 100) || null,
    })
  }, [])
  return <SignupConversionTracker />
}
