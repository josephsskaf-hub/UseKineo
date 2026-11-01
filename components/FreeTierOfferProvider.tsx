'use client'

// components/FreeTierOfferProvider.tsx — [KINEO-TRIAL-SWAP-2026-08-07]
//
// Ponte server→client da oferta do free tier. A flag KINEO_REVERSE_TRIAL_ENABLED
// só existe no servidor; um client component que a lesse direto veria SEMPRE
// undefined → versão OFF → copy velha com a flag ligada. Por isso o valor é
// resolvido UMA vez no app/layout.tsx (server, getFreeTierOffer()) e desce
// como prop serializável para este provider, que o distribui por contexto.
//
// FALLBACK = OFF de propósito: se algum dia um client component renderizar fora
// do RootLayout (não existe hoje — o provider envolve {children} na raiz), ele
// mostra a copy ATUAL, nunca inventa a nova. Falha para o lado que não mente
// sobre dinheiro. O console.warn abaixo existe para essa regressão não passar
// despercebida em dev.

import { createContext, useContext, type ReactNode } from 'react'
import BlackFridayBanner from '@/components/BlackFridayBanner' // KINEO-BLACK-FRIDAY-2026
import {
  buildFreeTierOffer,
  swapFreeTierCopy,
  type FreeTierCopy as FreeTierCopyStrings,
  type FreeTierOffer,
} from '@/lib/freeTierOffer'

const FreeTierOfferContext = createContext<FreeTierOffer | null>(null)

export function FreeTierOfferProvider({
  offer,
  children,
}: {
  offer: FreeTierOffer
  children: ReactNode
}) {
  // KINEO-BLACK-FRIDAY-2026 — a faixa do topo do site mora aqui (o provider envolve todo o <body> do layout raiz, e a faixa
  // vem antes de tudo): o app/layout.tsx não é tocado (as camadas desfaz-* conferem a linha do <body> byte a byte). Ela só
  // pinta de 24/11 a 01/12, com o servidor dizendo 'open'; nas rotas do app quem pinta é o DashboardShell (placement="app").
  return (
    <FreeTierOfferContext.Provider value={offer}><BlackFridayBanner />{children}</FreeTierOfferContext.Provider>
  )
}

export function useFreeTierOffer(): FreeTierOffer {
  const offer = useContext(FreeTierOfferContext)
  if (offer) return offer
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[freeTierOffer] useFreeTierOffer() outside FreeTierOfferProvider — falling back to the legacy offer')
  }
  return buildFreeTierOffer(false)
}

/**
 * Troca de copy drop-in para TEXTO JSX em client components: com a flag OFF
 * renderiza `legacy` byte a byte; com a flag ON renderiza `on` (ou a frase
 * canônica). Mesma semântica de swapFreeTierCopy, sem obrigar o componente
 * hospedeiro a chamar o hook.
 */
export function FreeTierCopy({
  legacy,
  on,
  onKey,
}: {
  legacy: string
  /** Copy da versão ON, explícita… */
  on?: string
  /** …ou por chave de lib/freeTierOffer.ts (ex.: "headline", "sentence"). */
  onKey?: keyof FreeTierCopyStrings
}) {
  const offer = useFreeTierOffer()
  return <>{swapFreeTierCopy(offer, legacy, on ?? (onKey ? offer.copy[onKey] : undefined))}</>
}
