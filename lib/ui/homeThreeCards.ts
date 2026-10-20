// KINEO-HOME-3-CARDS-1910 — os 3 CARDS de produto da primeira dobra da home (fundador 19/10: "pode ser as 3"; pesquisa em
// docs/PESQUISA-3-CARDS-PRODUTOS-2026-10-19.md, §3.3 nomes/frases/ordem).
//
// POR QUÊ: Filmes = 96% dos créditos pagos e 82% das 1ªs tentativas (vem primeiro); Anúncio de Produto (o Close do produto
// real) e Anúncio UGC (a pessoa de IA segurando o produto, o apresentador nota 9) são onde está o dinheiro do mercado
// (Higgsfield, Arcads, Creatify). Os cards de anúncio levam ao 1º ANÚNCIO GRÁTIS (lib/ads/sampleEntry.ts), nunca à parede.
//
// Produto novo entra DENTRO da home antiga (memória produto-novo-entra-dentro-da-home-antiga): esta faixa ocupa o lugar das
// 2 portas (components/home/HomeTwoDoors.tsx) só para quem o interruptor abre; desligado = a home de hoje, byte a byte.
// Cartão de vídeo sem preço (só motor/produto + nome): nenhum número de crédito ou dólar mora aqui nem no componente.
//
// MÓDULO PURO (zero import): o componente (components/home/HomeThreeCards.tsx), a KineoLanding e o guardião
// scripts/test-home-3-cards-1910.mjs executam as MESMAS funções.

/**
 * Interruptor ÚNICO. false = só as contas da casa (isInternalEmail, decidido na KineoLanding) veem os 3 cards — o fundador
 * vê a prévia logado; true = todo visitante. Virar só depois do "ok" do fundador na prévia.
 */
export const HOME_3_CARDS_LIVE = false

/** Quem vê os 3 cards no lugar das 2 portas (puro: `internal` = isInternalEmail do e-mail verificado da sessão). */
export function home3CardsOn(live: boolean, internal: boolean): boolean {
  return live === true || internal === true
}

export type HomeCardId = 'films' | 'product_ads' | 'ugc_ads'

/** Ordem fixa (fundador 19/10): Filmes · Anúncios de Produto · Anúncios UGC. */
export const HOME_CARD_ORDER: readonly HomeCardId[] = ['films', 'product_ads', 'ugc_ads']

/** A ENTRADA do Studio Ads que cada card de anúncio leva (lib/ads/sampleEntry.ts valida a mesma lista no servidor). */
export const HOME_CARD_ADS_ENTRY = { product_ads: 'product', ugc_ads: 'ugc' } as const

/** Campanha de atribuição que viaja no destino (o Studio lê intent_campaign; o /ads/v2 grava utm_source). */
export const HOME_CARD_CAMPAIGN = 'home_card' as const

/**
 * Destino de cada card. Filmes: o Studio no Seedance 1.5 (o motor do filme grátis); anúncios: o montador do Studio Ads
 * (/ads/v2) já no formato do card (?entry=product → Close do produto real; ?entry=ugc → Apresentador). Logado vai direto;
 * visitante passa pelo cadastro e volta para o MESMO destino (o montador exige conta).
 */
export function homeCardHref(card: HomeCardId, signedIn: boolean): string {
  const dest = card === 'films'
    ? `/studio?engine=seedance&intent_campaign=${HOME_CARD_CAMPAIGN}`
    : `/ads/v2?entry=${HOME_CARD_ADS_ENTRY[card]}&utm_source=${HOME_CARD_CAMPAIGN}`
  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`
}

/** O evento do clique (nome fixo — a leitura SQL usa este). */
export const HOME_CARD_EVENT = 'home_card_clicked' as const
/** Corte da leitura: sobe quando o contrato do clique mudar (a SQL filtra metadata->>'card_v', nunca o relógio). */
export const HOME_CARD_TELEMETRY_VERSION = 1

/** Metadados FECHADOS do clique: id do card (nunca o texto traduzido), posição 1-based, destino, quem e a versão. */
export function homeCardClickMetadata(card: HomeCardId, signedIn: boolean): {
  card: HomeCardId
  position: number
  href: string
  signed_in: boolean
  surface: 'home'
  card_v: number
} {
  return {
    card,
    position: HOME_CARD_ORDER.indexOf(card) + 1,
    href: homeCardHref(card, signedIn),
    signed_in: signedIn,
    surface: 'home',
    card_v: HOME_CARD_TELEMETRY_VERSION,
  }
}

/** As frases em inglês de cada card (traduzidas em lib/ui/refinementCopy.json, 16 línguas). Nome de produto + 1 frase. */
export const HOME_CARD_COPY: Record<HomeCardId, { title: string; line: string }> = {
  films: { title: 'AI Faceless Videos', line: 'Type an idea. Get a narrated Short in minutes.' },
  product_ads: { title: 'AI Product Ads', line: 'Your real product photos become a ready-to-run ad.' },
  ugc_ads: { title: 'AI UGC Ads', line: 'An AI person holds your product and tells why to buy.' },
}

/**
 * O selo por cima do vídeo: o motor/produto REAL do vídeo na tela (selo honesto), nunca preço.
 * Filmes: Seedance 1.5 (o filme 970d03e6, motor conferido em lib/ui/homeTwoDoors.ts e na vitrine pública).
 * Anúncios: o produto Studio Ads (o Close real não usa motor de vídeo; o apresentador é o Kling AI Avatar v2 Pro).
 */
export const HOME_CARD_BADGE: Record<HomeCardId, string> = {
  films: 'SEEDANCE 1.5',
  product_ads: 'STUDIO ADS',
  ugc_ads: 'STUDIO ADS · KLING AVATAR',
}

/** Um vídeo de card: prévia leve em public/previews/ (≤ 1,5 MB, sem áudio, faststart) + pôster .webp em public/posters/. */
export type HomeCardClip = { src: string; poster: string }
const preview = (name: string): HomeCardClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp` })

/**
 * Os vídeos reais da casa (nenhum render novo):
 *  · films: o farol de Flannan, Seedance 1.5 (a mesma prévia da porta do filme, trio D);
 *  · product_ads: o canário v3 do Close real (19/10, nota 8,5 nos dois) — pedido 885e8cb1 (EN) e f96ac6e7 (PT), perfume LUME,
 *    COM a língua da interface: português vê o PT, o resto vê o EN;
 *  · ugc_ads: o apresentador v2 R3 (17/10, pedido 84a5d07f, NOTA 9 do fundador), perfume Atheeri — o único com nota 9; a fala
 *    é em PT (no card toca mudo).
 */
export const HOME_CARD_CLIPS: Record<HomeCardId, { default: HomeCardClip; pt?: HomeCardClip }> = {
  films: { default: preview('door-970d03e6-9b87-403f-bef7-810db80ba8ce') },
  product_ads: { default: preview('home-card-close-real-en'), pt: preview('home-card-close-real-pt') },
  ugc_ads: { default: preview('home-card-ugc-presenter') },
}

/** O vídeo do card na língua da interface (sem versão na língua = o padrão). */
export function homeCardClip(card: HomeCardId, language: string | null | undefined): HomeCardClip {
  const c = HOME_CARD_CLIPS[card]
  return (language === 'pt' && c.pt) || c.default
}
