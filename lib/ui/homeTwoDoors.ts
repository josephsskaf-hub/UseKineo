// KINEO-DUAS-PORTAS-2026-10-13 — a vitrine com 2 portas (fundador 13/10, "tudo sim", ação B: "simplificar a vitrine
// para 2 portas, sem apagar nenhum produto").
//
// POR QUÊ: dos 12 pagantes, 11 compraram FILME NARRADO (Seedance/Creator); empresa compra ANÚNCIO DE PRODUTO (Business).
// O resto (clipes/efeitos, imagem, áudio, Spaces, MCP...) continua no ar e alcançável em ≤ 2 cliques pelo "More tools",
// mas sai do destaque. As duas portas abrem a primeira dobra da home e o menu do topo.
//
// MÓDULO PURO (zero import): o componente (components/home/HomeTwoDoors.tsx) e o guardião
// scripts/test-duas-portas-1310.mjs executam as MESMAS funções. Os NÚMEROS da oferta (preço, segundos, anúncios/mês)
// NÃO moram aqui: a KineoLanding lê das fontes (lib/checkoutPricing, lib/businessPlan, lib/freeTierOffer,
// lib/growth/publicPromoTruth) e entrega prontos. Aqui só ficam ids, destinos e o contrato da medição.

export type HomeDoorId = 'film' | 'ads'

/** Os 2 eventos de clique (pedido do fundador: "para eu ver qual porta vende"). Nome fixo — a leitura SQL usa estes. */
export const HOME_DOOR_EVENTS = {
  film: 'home_door_film_clicked',
  ads: 'home_door_ads_clicked',
} as const satisfies Record<HomeDoorId, string>

/** Corte da leitura: sobe quando o contrato do clique mudar (a SQL filtra metadata->>'door_v', nunca o relógio). */
export const HOME_DOOR_TELEMETRY_VERSION = 1

/** Campanha de atribuição que viaja no destino (o Studio e o /ads já leem intent_campaign / utm_source). */
export const HOME_DOOR_CAMPAIGN = 'home_door' as const

/**
 * Destino de cada porta. Filme: o Studio no Seedance 1.5 (o motor do filme grátis e de 100% dos primeiros filmes
 * pagos); visitante passa pelo cadastro e volta para o mesmo Studio (mesmo desenho de clipsFirstFilmHref).
 * Anúncio: /ads/new, a mesma porta do menu — logado cai no montador; visitante cai na página pública /ads.
 */
export function homeDoorHref(door: HomeDoorId, signedIn: boolean): string {
  if (door === 'ads') return `/ads/new?utm_source=${HOME_DOOR_CAMPAIGN}`
  const studio = `/studio?engine=seedance&intent_campaign=${HOME_DOOR_CAMPAIGN}`
  return signedIn ? studio : `/signup?redirect=${encodeURIComponent(studio)}`
}

/** Metadados FECHADOS do clique: qual porta, posição 1-based, destino, quem (logado ou não) e a versão do contrato. */
export function homeDoorClickMetadata(door: HomeDoorId, signedIn: boolean): {
  door: HomeDoorId
  position: number
  href: string
  signed_in: boolean
  surface: 'home'
  door_v: number
} {
  return {
    door,
    position: door === 'film' ? 1 : 2,
    href: homeDoorHref(door, signedIn),
    signed_in: signedIn,
    surface: 'home',
    door_v: HOME_DOOR_TELEMETRY_VERSION,
  }
}

/** Um vídeo da porta: prévia leve já existente em public/previews/ (sem áudio) + pôster .webp em public/posters/. */
export type HomeDoorClip = { src: string; poster: string }
const preview = (name: string): HomeDoorClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp` })

/**
 * Mídia da porta do FILME: 3 filmes narrados verticais REAIS do Seedance 1.5 (o motor do filme grátis), lado a lado como
 * telas de celular — Voynich, Ilha de Páscoa e Mary Celeste, da vitrine pública (lib/publicExamples.ts). Selo honesto: os três são
 * engine 'cinematic_ai' (Seedance 1.5), por isso o selo diz SEEDANCE 1.5. Nenhum é filme do hero logo abaixo (sem repetir).
 */
export const HOME_DOOR_FILM_CLIPS: readonly HomeDoorClip[] = [
  preview('ex-7ffd064e-cb37-4a97-a207-70a202bc72b6'),
  preview('ex-a09706da-a79f-4029-b213-69f43d6a2775'),
  preview('ex-cbd676d0-340a-4728-8a5f-439fd9dd64c5'),
]
export const HOME_DOOR_FILM_BADGE = 'SEEDANCE 1.5'

/**
 * Mídia da porta do ANÚNCIO: o mesmo carrossel do card "ADS: 3 VARIATIONS" (KINEO-CARD-ADS-3VAR-2026-09-30), feito na
 * própria Kineo — garrafa, fone e tênis. Troca quando o vídeo TERMINA (onEnded), nunca por timer.
 */
export const HOME_DOOR_ADS_CLIPS: readonly HomeDoorClip[] = [
  preview('promo-ads-3var-1'),
  preview('promo-ads-3var-2'),
  preview('promo-ads-3var-3'),
]
