// KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — "VOCÊ TEM 1 CLIPE GRÁTIS" no topo do /studio e do /clips (o fundador pediu a
// recomendação da sessão CEO; a recomendação foi "sim").
//
// O PRESENTE: quem nasce 'region_paid_only' (país fora do filme grátis) ganha no cadastro os créditos de 1 clipe de 5 s
// (lib/reverseTrial.ts, compare-and-set; as 61 contas antigas receberam o retroativo em 06/10 02:23 UTC — evento
// region_free_clip_granted, source backfill_2026-10-05). CONSUMO: o débito do clipe em /api/clips (lib/clips/clipFlow.ts
// submitClip → debitVideoCredits); clipe que falha é estornado e o presente volta. "Tem e ainda não usou" é
// lib/freeFilmPolicy.ts regionFreeClipAvailable (região, sem pagar, plano grátis, saldo ≥ 5) — a MESMA regra que o layout do
// (dashboard) já calcula NO SERVIDOR e entrega à faixa da região. Nenhuma régua nova.
//
// O DEFEITO MEDIDO (06/10, 20:21 UTC): a faixa da região já aparecia em toda tela (components/RegionPaidOnlyBanner.tsx), mas
// o botão dela leva ao /clips — e, no próprio /clips, leva ao /clips: 16 cliques de 3 pessoas num botão que não faz nada, e a
// tela abre com a caixa de texto vazia. 69 presentes, 6 cliques, 2 clipes.
//
// O CONSERTO: no /studio e no /clips a faixa vira este aviso — "Você tem 1 clipe grátis", o que ele faz e UM clique para a
// ideia pronta. No /studio o clique leva a /clips?free_clip=1; no /clips ele preenche ali mesmo (motor, 5 s, 9:16, a ideia
// escrita) e leva o olho ao botão de gerar. NADA dispara sozinho: a pessoa aperta Gerar (5 cr = o presente). O botão dos
// planos (o CTA que vende) continua dentro do aviso, no mesmo lugar da faixa — uma faixa só, nunca duas.
//
// MÓDULO PURO (nenhum import): a faixa, a tela do /clips, a rota e o guardião scripts/test-clipes-tres-2026-10-06.mjs leem
// as mesmas constantes.

export const FREE_CLIP_NOTICE_VERSION = 'free_clip_notice_v1'

export type FreeClipNoticeSurface = 'studio' | 'clips'

/** As telas onde o aviso ocupa o lugar da faixa da região. Nas outras, a faixa de sempre. */
export const FREE_CLIP_NOTICE_SURFACES: Readonly<Record<string, FreeClipNoticeSurface>> = { '/studio': 'studio', '/clips': 'clips' }

/**
 * Em que tela o aviso aparece — ou null. `freeClipAvailable` é o regionFreeClipAvailable que o layout calculou no servidor:
 * sem o presente (ou já usado), nunca há aviso, em tela nenhuma.
 */
export function freeClipNoticeSurface(pathname: string | null | undefined, freeClipAvailable: boolean): FreeClipNoticeSurface | null {
  if (freeClipAvailable !== true || typeof pathname !== 'string') return null
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return Object.prototype.hasOwnProperty.call(FREE_CLIP_NOTICE_SURFACES, path) ? FREE_CLIP_NOTICE_SURFACES[path] : null
}

/**
 * O presente continua de pé depois de uma mudança de saldo NESTA aba? O layout decide no servidor e não roda de novo numa
 * navegação dentro do app; o `creditsChanged` (clipe pedido, estorno, pagamento) relê /api/credits e esta regra decide:
 * usou o presente (saldo abaixo de 1 clipe) ou pagou → acabou; estorno devolveu o saldo → volta. Só desliga (ou religa) o que
 * o SERVIDOR ligou — nunca liga para quem não tem. Leitura sem número (erro) não decide nada.
 */
export function freeClipStillAvailable(
  serverSaid: boolean,
  current: boolean,
  read: { credits?: unknown; hasPaid?: unknown } | null | undefined,
  giftCredits: number,
): boolean {
  if (serverSaid !== true) return false
  if (!read || typeof read.credits !== 'number' || !Number.isFinite(read.credits)) return current
  return read.hasPaid !== true && read.credits >= giftCredits
}

/**
 * Eventos no padrão da casa. `shown` e `clicked` saem do navegador (trackEvent leva o session_id): o denominador é o aviso que
 * esteve na tela, 1× por montagem e por tela. `requested` é do SERVIDOR (/api/clips, está em SERVER_ONLY_EVENTS): o pedido
 * que nasceu da ideia pronta e foi ACEITO, com o clip_id — liga aviso → clique → pedido → clip_delivered.
 */
export const FREE_CLIP_NOTICE_EVENTS = {
  shown: 'free_clip_notice_shown',
  clicked: 'free_clip_notice_clicked',
  requested: 'free_clip_notice_clip_requested',
} as const

/** Do /studio para o /clips com a ideia pronta. */
export const FREE_CLIP_NOTICE_PARAM = 'free_clip'
export const FREE_CLIP_NOTICE_HREF = `/clips?${FREE_CLIP_NOTICE_PARAM}=1`

/** No /clips o aviso não navega (o link para a própria página era o botão morto): avisa a tela e ela preenche ali mesmo. */
export const FREE_CLIP_APPLY_EVENT = 'kineo:free-clip-idea'

/**
 * A ideia pronta: texto → clipe (sem foto para subir), no motor de entrada, 5 s, vertical. Custa exatamente o presente
 * (clipCreditCost('seedance', 5) = 5 = REGION_FREE_CLIP_CREDITS — o guardião confere). O prompt é a cena de exemplo que a
 * própria tela já mostra na caixa (CLIP_COPY_EN.placeholder), com o raio: natureza, mar, tempestade — a linha da vitrine do
 * fundador. Inglês de propósito: é o texto que o motor lê.
 */
export const FREE_CLIP_IDEA = {
  engine: 'seedance',
  seconds: 5,
  aspect: '9:16',
  prompt: 'A drone shot over a stormy sea at dusk, waves crashing on black rocks, lightning flashing on the horizon',
} as const
