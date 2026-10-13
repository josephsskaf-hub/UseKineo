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
 * KINEO-PORTA-FILME-TRIOS-2026-10-13 — o fundador assistiu às opções (Área de Trabalho/ads/vitrine-filme-2026-10-13) e pediu
 * "esses 2 intercalando": o trio D (mar e tempestade, Seedance 1.5) e o trio B (o melhor de cada motor). O card alterna os
 * dois trios lado a lado — troca quando o vídeo TERMINA (onEnded), nunca por timer — e o SELO É CALCULADO dos motores dos 3
 * filmes do trio visível (homeDoorTrioBadge): o selo nunca promete um motor que não está na tela.
 * Motores conferidos no banco em 13/10 (events.metadata.engine de cada render; 83db8b63 também na vitrine pública).
 * Todos de contas internas do fundador; 970d03e6 e d16781b8 são da conta hotmail dele (sem a marca usekineo.com/free).
 */
export type HomeDoorEngine = 'cinematic_ai' | 'cinematic_hollywood' | 'cinematic_veo' | 'cinematic_s25'
export const HOME_DOOR_ENGINE_LABEL: Record<HomeDoorEngine, string> = {
  cinematic_ai: 'SEEDANCE 1.5',
  cinematic_hollywood: 'KLING 3',
  cinematic_veo: 'VEO 3.1',
  cinematic_s25: 'SEEDANCE 2.5',
}
export type HomeDoorFilmClip = HomeDoorClip & { id: string; engine: HomeDoorEngine }
const door = (id: string, engine: HomeDoorEngine): HomeDoorFilmClip => ({ id, engine, src: `/previews/door-${id}.mp4`, poster: `/posters/door-${id}.webp` })
/** O selo do trio: os motores reais, sem repetir, na ordem das telas ("KLING 3 · VEO 3.1 · SEEDANCE 2.5"). */
export function homeDoorTrioBadge(clips: readonly { engine: HomeDoorEngine }[]): string {
  return Array.from(new Set(clips.map((c) => HOME_DOOR_ENGINE_LABEL[c.engine]))).join(' · ')
}
export const HOME_DOOR_FILM_TRIOS: readonly (readonly HomeDoorFilmClip[])[] = [
  // D — mar e tempestade: o farol de Flannan, o penhasco do megatsunami de Lituya, o veleiro na arrebentação.
  [door('970d03e6-9b87-403f-bef7-810db80ba8ce', 'cinematic_ai'), door('83db8b63-b654-491e-a0aa-86ce1bc1f3d7', 'cinematic_ai'), door('dabfdca7-33a1-4de3-b2b4-050333b8a21c', 'cinematic_ai')],
  // B — o melhor de cada motor: o robô submarino (Kling 3), o Titanic (Veo 3.1), Londres no nevoeiro de 1952 (Seedance 2.5).
  [door('07252598-1392-4226-b5d5-d02bd892d69b', 'cinematic_hollywood'), door('d16781b8-0557-4c7e-b339-3bf048ff700c', 'cinematic_veo'), door('909f9d36-45f2-42ed-8ffd-8062e933cc9c', 'cinematic_s25')],
]

/**
 * Mídia da porta do ANÚNCIO: o mesmo carrossel do card "ADS: 3 VARIATIONS" (KINEO-CARD-ADS-3VAR-2026-09-30), feito na
 * própria Kineo — garrafa, fone e tênis. Troca quando o vídeo TERMINA (onEnded), nunca por timer.
 */
export const HOME_DOOR_ADS_CLIPS: readonly HomeDoorClip[] = [
  preview('promo-ads-3var-1'),
  preview('promo-ads-3var-2'),
  preview('promo-ads-3var-3'),
]
