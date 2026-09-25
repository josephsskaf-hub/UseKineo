'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — ouvinte único do nav_item_clicked.
//
// Montado UMA vez no layout raiz, logo depois do <SourceCapture />: assim cobre o
// topo público, o menu móvel da landing, a Sidebar e o MobileNav (o layout do
// dashboard está aninhado dentro do raiz) sem tocar em nenhum arquivo de menu, que
// são da pista do Codex. Toda a regra (atributos, validação, trava de 400 ms,
// contagem de montagens) mora em lib/navTelemetry.ts, que o guardião executa.
// Renderiza nada; o `keepalive` do trackEvent entrega o POST mesmo com a página
// saindo pelo link clicado.

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { NAV_EVENT, attachNavClickTelemetry } from '@/lib/navTelemetry'

export default function NavClickTelemetry() {
  useEffect(
    () =>
      attachNavClickTelemetry((metadata) => {
        void trackEvent(NAV_EVENT, metadata)
      }),
    [],
  )
  return null
}
