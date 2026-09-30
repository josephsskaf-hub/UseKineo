// KINEO-PROMO-CARDS-2026-09-30 — fileira de cards grandes logo abaixo do menu da home (fundador 30/09: "quero esses
// cards no Kineo também, com essas edições legais"; referência: a fileira do topo do higgsfield.ai, SEM copiar marca,
// cor ou texto deles). Lib pura, sem import: o guardião scripts/test-promo-cards-2026-09-30.mjs lê este arquivo.
//
// Selo honesto (mesma régua do commit 57c9ee90 e de scripts/test-works-with-claude-2026-09-30.mjs): a Kineo FUNCIONA
// no Claude como conector personalizado (/claude-connector). A listagem no diretório de conectores do Claude está EM
// REVISÃO — nada de official/partner/approved/certified/"by Anthropic", nem logo da Anthropic, em nenhum card.
// Quando a listagem for APROVADA E PUBLICADA, reancorar o guardião com motivo.
//
// Ordem na fileira (fundador 30/09): Kineo for Claude · Ads: 3 variations · Clips.
// Para um card novo: acrescente um item aqui (a fileira rola na horizontal, com snap no celular) e, se tiver vídeo,
// uma prévia leve em public/previews/ (≤ 1,5 MB, sem áudio, faststart) com pôster .webp em public/posters/.

/**
 * Destino ÚNICO do card "KINEO FOR CLAUDE" (fundador 30/09). Hoje: a nossa página de instalação do conector
 * (o servidor está no ar em https://www.usekineo.com/api/mcp). Quando a Anthropic APROVAR e PUBLICAR a listagem no
 * diretório de conectores, troque ESTA linha pela página do diretório — e só então reancore o guardião
 * scripts/test-promo-cards-2026-09-30.mjs, que hoje reprova qualquer URL de diretório aqui.
 */
export const CLAUDE_CARD_HREF = '/claude-connector'

export type PromoCardArt =
  /** Pôster animado em CSS/HTML (sem vídeo): faixas de tipografia inclinadas. */
  | { kind: 'poster'; bands: readonly string[] }
  /** Vídeo curto em loop, mudo, com pôster; rótulos animados por cima. */
  | { kind: 'video'; src: string; poster: string; badge?: string; chips?: readonly string[]; chipUnit?: string }

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

export const PROMO_CARDS: readonly PromoCard[] = [
  {
    id: 'claude',
    href: CLAUDE_CARD_HREF,
    title: 'KINEO FOR CLAUDE',
    // Selo honesto (sessão Loja Claude, 30/09): o conector NÃO gera mídia dentro do Claude (regra do diretório) — ele
    // escreve o roteiro e manda para o Kineo Studio, onde o vídeo é renderizado. Nada de "make videos in Claude".
    subtitle: 'Write your video in Claude, render it in Kineo Studio',
    art: { kind: 'poster', bands: ['KINEO ×', 'CLAUDE', 'SCRIPT → STUDIO'] },
  },
  {
    // Acréscimo do fundador (30/09): 3º card, entre o Claude e o Clips. Vídeo feito pela própria Kineo (mesma modelo
    // fictícia em 3 anúncios: piscina, cozinha, terraço), 1280×870, 5 s, sem áudio. O título já vem no vídeo; nada
    // por cima. Link = a porta de Ads que a home já usa (/ads): o /ads/v2 manda visitante sem login para /login e
    // quem não tem acesso para /ads?from=v2 — a porta pública é o degrau certo para quem chega pela home.
    id: 'ads',
    href: '/ads',
    title: 'ADS: 3 VARIATIONS',
    subtitle: 'One product in, three ads out, ready to A/B test',
    art: { kind: 'video', src: '/previews/promo-ads-3-variacoes.mp4', poster: '/posters/promo-ads-3-variacoes.webp' },
  },
  {
    id: 'clips',
    href: '/clips',
    title: 'CLIPS',
    subtitle: 'One scene, 5 to 15 seconds — from text or a photo',
    // Clipe real da casa: tempestade com raios sobre o mar, Seedance 1.5, 5 s (conta do fundador, 29/09),
    // recortado 720×490 para o formato do card.
    art: {
      kind: 'video',
      src: '/previews/promo-clips-storm.mp4',
      poster: '/posters/promo-clips-storm.webp',
      badge: 'NEW',
      chips: ['5', '7', '10', '15'],
      chipUnit: 's',
    },
    gate: 'clips',
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
export const PROMO_TELEMETRY_VERSION = 1

/** Metadados FECHADOS do clique: id do card (nunca o texto traduzido), posição 1-based, destino e versão. */
export function promoClickMetadata(card: PromoCard, index: number): { card: string; position: number; href: string; surface: 'home'; promo_v: number } {
  return { card: card.id, position: index + 1, href: card.href, surface: 'home', promo_v: PROMO_TELEMETRY_VERSION }
}
