'use client'

// KINEO-REMIX-PAGINAS-3110 — o 1º degrau do placar do laço viral: alguém abriu a página de um filme compartilhado.
// `share_page_viewed` (uma vez por filme por aba) → `remix_clicked` (o botão "Make your own version") →
// `remix_signup` (escrito pelo /auth/callback, com o filme de origem). Sem este degrau, o "3% clicaram" não tem
// denominador honesto: o evento antigo só contava a CTA quando ela entrava na tela.
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function SharePageBeacon({ videoId, engine, duration }: { videoId: string; engine: string | null; duration: number | null }) {
  useEffect(() => {
    const marker = `kineo_share_page_viewed:${videoId}`
    try {
      if (sessionStorage.getItem(marker) === '1') return
      sessionStorage.setItem(marker, '1')
    } catch { /* sem sessionStorage: conta mesmo assim */ }
    const params = new URLSearchParams(window.location.search)
    const clip = (v: string | null) => (v && /^[A-Za-z0-9._~-]{1,60}$/.test(v) ? v : null)
    void trackEvent('share_page_viewed', {
      source_video_id: videoId,
      utm_source: clip(params.get('utm_source')),
      utm_medium: clip(params.get('utm_medium')),
      has_referral: params.has('ref'),
      engine,
      duration,
      version: 'remix_paginas_3110',
    })
  }, [videoId, engine, duration])
  return null
}
