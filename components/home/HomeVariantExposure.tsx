'use client'

// KINEO-HOME-CLIPS-FIRST-2026-10-05 — sinal "a home apareceu num navegador" para o A/B da home. Não decide nada: o
// servidor (app/api/home-variant) recalcula a variante a partir do user_id/kineo_vid e grava home_variant_exposed com
// dedupe por cookie httpOnly. Aqui só há um freio de aba (sessionStorage) para não repetir o POST em cada navegação.
// Render-nothing; falha de rede/armazenamento nunca afeta a página. Só é montado com o interruptor ligado e fora de prévia.
import { useEffect } from 'react'

export default function HomeVariantExposure({
  variant,
  surface,
  signedIn,
}: {
  variant: 'control' | 'clips_first'
  surface: 'home' | 'post_signup'
  /** Entra no freio da aba: quem loga na mesma aba manda o 2º sinal (o que liga o kineo_vid à conta). */
  signedIn: boolean
}) {
  useEffect(() => {
    try {
      const marker = `kineo_hve_sent:${new Date().toISOString().slice(0, 10)}:${variant}:${surface}:${signedIn ? 'u' : 'v'}`
      try {
        if (sessionStorage.getItem(marker) === '1') return
        sessionStorage.setItem(marker, '1')
      } catch {
        /* sem sessionStorage: o cookie de dedupe do servidor segura */
      }
      void fetch('/api/home-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ variant, surface }),
      }).catch(() => {})
    } catch {
      /* medição nunca quebra a home */
    }
  }, [variant, surface, signedIn])
  return null
}
