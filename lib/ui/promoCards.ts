// KINEO-PROMO-CARDS-2026-09-30 — fileira de cards grandes logo abaixo do menu da home (fundador 30/09: "quero esses
// cards no Kineo também, com essas edições legais"; referência: a fileira do topo do higgsfield.ai, SEM copiar marca,
// cor ou texto deles). Lib pura, sem import: o guardião scripts/test-promo-cards-2026-09-30.mjs lê este arquivo.
//
// Selo honesto (mesma régua do commit 57c9ee90 e de scripts/test-works-with-claude-2026-09-30.mjs): a Kineo FUNCIONA
// no Claude como conector personalizado (/claude-connector). A listagem no diretório de conectores do Claude está EM
// REVISÃO — nada de official/partner/approved/certified/"by Anthropic", nem logo da Anthropic, em nenhum card.
// Quando a listagem for APROVADA E PUBLICADA, reancorar o guardião com motivo.
//
// Ordem na fileira (fundador 30/09): Kineo for Claude · Ads: 3 variations · Clips · Nano Banana Pro (4 cards, 3 vídeos cada).
// Para um card novo: acrescente um item aqui (a fileira rola na horizontal, com snap no celular) e, se tiver vídeo,
// uma prévia leve em public/previews/ (≤ 1,5 MB, sem áudio, faststart) com pôster .webp em public/posters/.

/**
 * Destino ÚNICO do card "KINEO FOR CLAUDE" (fundador 30/09). Hoje: a nossa página de instalação do conector
 * (o servidor está no ar em https://www.usekineo.com/api/mcp). Quando a Anthropic APROVAR e PUBLICAR a listagem no
 * diretório de conectores, troque ESTA linha pela página do diretório — e só então reancore o guardião
 * scripts/test-promo-cards-2026-09-30.mjs, que hoje reprova qualquer URL de diretório aqui.
 */
export const CLAUDE_CARD_HREF = '/claude-connector'

/** Um vídeo do carrossel do card: prévia leve em public/previews/ (≤ 1,5 MB, sem áudio, faststart) + pôster .webp. */
export type PromoClip = { src: string; poster: string }

/**
 * Fundador 30/09: "quatro cards na primeira fileira… 3 vídeos rodando igual a gente tinha anteriormente" — cada card
 * troca de vídeo quando o anterior TERMINA (onEnded, nunca timer fixo — mesma regra do AuthReel), com fade.
 */
export type PromoCardArt = {
  kind: 'reel'
  clips: readonly PromoClip[]
  /** Tipografia em faixas por cima dos vídeos (card do Claude). */
  bands?: readonly string[]
  /** Etiqueta pequena no canto inferior direito (sem tradução: nome técnico). */
  tag?: string
  badge?: string
  chips?: readonly string[]
  chipUnit?: string
  /** true = o chip i acende junto com o vídeo i (A/B/C do Ads); false = os chips piscam em sequência própria. */
  chipsFollowClip?: boolean
}

export type PromoCard = {
  id: string
  href: string
  /** Caixa alta, nome de produto: não passa pela tradução. */
  title: string
  /** Frase de interface: traduzida em lib/ui/refinementCopy.json (16 línguas). */
  subtitle: string
  art: PromoCardArt
  /** Só aparece quando o interruptor do produto está aberto para quem vê. */
  gate?: 'clips'
}

const clip = (name: string): PromoClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp` })

export const PROMO_CARDS: readonly PromoCard[] = [
  {
    id: 'claude',
    href: CLAUDE_CARD_HREF,
    title: 'KINEO FOR CLAUDE',
    // Selo honesto (sessão Loja Claude, 30/09): o conector NÃO gera mídia dentro do Claude (regra do diretório) — ele
    // escreve o roteiro e manda para o Kineo Studio, onde o vídeo é renderizado. Nada de "make videos in Claude".
    subtitle: 'Write your video in Claude, render it in Kineo Studio',
    // Os 3 vídeos são as amostras feitas NA Kineo que a própria /claude-connector mostra (Seedance 1.5, Kling 3,
    // Veo 3.1) — nenhum logo da Anthropic. 'IN', não '×': o '×' sugere parceria entre marcas (selo honesto).
    art: {
      kind: 'reel',
      clips: [clip('promo-claude-1'), clip('promo-claude-2'), clip('promo-claude-3')],
      bands: ['KINEO IN', 'CLAUDE'],
      tag: 'Connector · MCP',
    },
  },
  {
    // Os 3 anúncios da mesma modelo fictícia (A piscina, B cozinha, C terraço), feitos pela própria Kineo, um por vez,
    // com o chip da letra acendendo junto. Link = a porta de Ads que a home já usa (/ads).
    id: 'ads',
    href: '/ads',
    title: 'ADS: 3 VARIATIONS',
    subtitle: 'One product in, three ads out, ready to A/B test',
    art: {
      kind: 'reel',
      clips: [clip('promo-ads-a'), clip('promo-ads-b'), clip('promo-ads-c')],
      chips: ['A', 'B', 'C'],
      chipsFollowClip: true,
    },
  },
  {
    id: 'clips',
    href: '/clips',
    title: 'CLIPS',
    subtitle: 'One scene, 5 to 15 seconds — from text or a photo',
    // Clipes reais da casa, Seedance 1.5, 5 s (conta do fundador): tempestade no mar (29/09), rio de geleira e
    // surfista (30/09). Natureza, sem fogo (curadoria do fundador).
    art: {
      kind: 'reel',
      clips: [clip('promo-clips-storm'), clip('promo-clips-glacier'), clip('promo-clips-surf')],
      badge: 'NEW',
      chips: ['5', '7', '10', '15'],
      chipUnit: 's',
    },
    gate: 'clips',
  },
  {
    // 4º card (fundador 30/09). Imagens reais do Nano Banana Pro (conta do fundador, 30/09): perfume, astronauta,
    // farol. São fotos: o movimento é só uma aproximação lenta da prévia, não animação do produto.
    id: 'images',
    href: '/images',
    title: 'NANO BANANA PRO',
    subtitle: 'Pro images from a sentence — or keep a face from your own photo',
    art: {
      kind: 'reel',
      clips: [clip('promo-images-1'), clip('promo-images-2'), clip('promo-images-3')],
      tag: 'Images',
    },
  },
]

/** Os cards que esta pessoa vê. O interruptor do Clips é o mesmo do mega-menu (lib/clips/clipLaunch clipsVisible). */
export function promoCardsFor(open: { clips: boolean }): PromoCard[] {
  return PROMO_CARDS.filter((card) => card.gate !== 'clips' || open.clips)
}

// Decisão do fundador (30/09, "concordo com as 2 faixas"): FAIXA 1 = esta fileira; FAIXA 2 = os 4 cards de motor,
// intocados. Clique por card vira evento de navegador para ler em 7 dias. A leitura corta por metadata->>'promo_v'
// (sobe quando o contrato mudar), nunca pelo relógio do deploy.
export const PROMO_CLICK_EVENT = 'promo_card_clicked' as const
export const PROMO_TELEMETRY_VERSION = 2 // 2 = fileira de 4 cards com carrossel (30/09); 1 = 3 cards

/** Metadados FECHADOS do clique: id do card (nunca o texto traduzido), posição 1-based, destino e versão. */
export function promoClickMetadata(card: PromoCard, index: number): { card: string; position: number; href: string; surface: 'home'; promo_v: number } {
  return { card: card.id, position: index + 1, href: card.href, surface: 'home', promo_v: PROMO_TELEMETRY_VERSION }
}
