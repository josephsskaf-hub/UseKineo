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
 * vê a prévia logado; true = todo visitante. LIGADO em 19/10 com o ok do fundador na prévia ("podemos deixar assim").
 */
export const HOME_3_CARDS_LIVE = true

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
export type HomeCycleCardId = HomeCardId | 'kids_cartoon'
export type HomeCardClip = { src: string; poster: string; objectPosition: string; mobileObjectPosition?: string; objectFit?: 'cover' | 'contain' }
export type HomeCardPlaylist = readonly [HomeCardClip, ...HomeCardClip[]]
const preview = (name: string, objectPosition = '50% 0%', mobileObjectPosition = objectPosition): HomeCardClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp`, objectPosition, mobileObjectPosition })

/**
 * KINEO-CARDS-GIRO-2410 — inspection of the actual local files on 24/10, no new render:
 * films: Flannan + approved night train / volcano previews (lib/homeVideoCuration.ts).
 * product_ads: the current lifestyle sneaker ad (contain preserves both face and shoe), isolated rotating sneaker,
 * and perfume image with camera movement. EN/PT retain their original first-preview paths.
 * ugc_ads: current GLOW cream presenter; kids: current Leo cartoon. Only one suitable existing preview each:
 * keep those approved clips until replacements are available; never relabel the non-speaking product trios as UGC.
 * Full-frame product close-ups in the original UGC/cartoon are retained; CSS must not crop faces further.
 */
// KINEO-CARDS-GIRO-2410 — edit only these lists to replace approved local previews; framing belongs to each clip.
export const HOME_CARD_PLAYLISTS: Record<HomeCycleCardId, { default: HomeCardPlaylist; pt?: HomeCardPlaylist }> = {
  films: { default: [
    preview('home-card-film-flannan', '50% 0%'),
    { src: '/previews/curation-sep16/ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb-v.mp4', poster: '/previews/curation-sep16/ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb-h.webp', objectPosition: '50% 0%', mobileObjectPosition: '50% 0%' },
    { src: '/previews/curation-sep16/6b9b363c-3185-4db7-a877-46b77e334f06-v.mp4', poster: '/previews/curation-sep16/6b9b363c-3185-4db7-a877-46b77e334f06-h.webp', objectPosition: '50% 0%', mobileObjectPosition: '50% 0%' },
  ] },
  product_ads: { default: [
    { ...preview('home-card-close-real-en', '50% 0%'), objectFit: 'contain' },
    preview('efeito-product_360', '50% 50%'),
    preview('promo-images-1', '50% 50%'),
  ], pt: [
    { ...preview('home-card-close-real-pt', '50% 0%'), objectFit: 'contain' },
    preview('efeito-product_360', '50% 50%'),
    preview('promo-images-1', '50% 50%'),
  ] },
  ugc_ads: { default: [preview('home-card-ugc-presenter', '50% 0%', '50% 0%')] },
  kids_cartoon: { default: [{ ...preview('home-card-kids-cartoon-leo', '50% 0%', '50% 0%'), objectFit: 'contain' }] },
}

/** Single-preview consumers (UGC pages) retain the original API, derived from the same lists. */
export const HOME_CARD_CLIPS: Record<HomeCardId, { default: HomeCardClip; pt?: HomeCardClip }> = {
  films: { default: HOME_CARD_PLAYLISTS.films.default[0] },
  product_ads: { default: HOME_CARD_PLAYLISTS.product_ads.default[0], pt: HOME_CARD_PLAYLISTS.product_ads.pt?.[0] },
  ugc_ads: { default: HOME_CARD_PLAYLISTS.ugc_ads.default[0] },
}

/** Ordered clips in the interface language; first clip is also the SSR/reduced-motion poster. */
export function homeCardClips(card: HomeCycleCardId, language: string | null | undefined): HomeCardPlaylist {
  const c = HOME_CARD_PLAYLISTS[card]
  return (language === 'pt' && c.pt) || c.default
}

/** First clip retained for callers of the original single-preview API. */
export function homeCardClip(card: HomeCardId, language: string | null | undefined): HomeCardClip {
  return homeCardClips(card, language)[0]
}
// KINEO-HOME-CARDS-BOTOES-2010 ─────────────────────────────────────────────────────────────────────────
/** KINEO-HOME-CARDS-BOTOES-2010 — um botão diferente por card de anúncio (fundador 20/10: "o botão do UGC e do Product ficou parecido"). [grátis produto, grátis UGC, produto, UGC] por língua. */
export const HOME_CARD_ADS_CTA: Record<string, readonly [string, string, string, string]> = { // KINEO-HOME-CARDS-BOTOES-2010
  en: ["Free product ad","Free UGC ad","Make a product ad","Make a UGC ad"], // KINEO-HOME-CARDS-BOTOES-2010
  pt: ["Anúncio de produto grátis","Anúncio UGC grátis","Criar anúncio de produto","Criar anúncio UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  es: ["Anuncio de producto gratis","Anuncio UGC gratis","Crear anuncio de producto","Crear anuncio UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  fr: ["Pub produit gratuite","Pub UGC gratuite","Créer une pub produit","Créer une pub UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  de: ["Gratis Produktanzeige","Gratis UGC-Anzeige","Produktanzeige erstellen","UGC-Anzeige erstellen"], // KINEO-HOME-CARDS-BOTOES-2010
  it: ["Annuncio prodotto gratis","Annuncio UGC gratis","Crea annuncio prodotto","Crea annuncio UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  nl: ["Gratis productadvertentie","Gratis UGC-advertentie","Maak een productadvertentie","Maak een UGC-advertentie"], // KINEO-HOME-CARDS-BOTOES-2010
  pl: ["Darmowa reklama produktu","Darmowa reklama UGC","Zrób reklamę produktu","Zrób reklamę UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  tr: ["Ücretsiz ürün reklamı","Ücretsiz UGC reklamı","Ürün reklamı yap","UGC reklamı yap"], // KINEO-HOME-CARDS-BOTOES-2010
  ru: ["Бесплатная реклама товара","Бесплатная UGC-реклама","Сделать рекламу товара","Сделать UGC-рекламу"], // KINEO-HOME-CARDS-BOTOES-2010
  uk: ["Безкоштовна реклама товару","Безкоштовна UGC-реклама","Зробити рекламу товару","Зробити UGC-рекламу"], // KINEO-HOME-CARDS-BOTOES-2010
  ar: ["إعلان منتج مجاني","إعلان UGC مجاني","اصنع إعلان منتج","اصنع إعلان UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  ur: ["مفت پروڈکٹ اشتہار","مفت UGC اشتہار","پروڈکٹ اشتہار بنائیں","UGC اشتہار بنائیں"], // KINEO-HOME-CARDS-BOTOES-2010
  hi: ["मुफ़्त प्रोडक्ट विज्ञापन","मुफ़्त UGC विज्ञापन","प्रोडक्ट विज्ञापन बनाएँ","UGC विज्ञापन बनाएँ"], // KINEO-HOME-CARDS-BOTOES-2010
  id: ["Iklan produk gratis","Iklan UGC gratis","Buat iklan produk","Buat iklan UGC"], // KINEO-HOME-CARDS-BOTOES-2010
  vi: ["Quảng cáo sản phẩm miễn phí","Quảng cáo UGC miễn phí","Tạo quảng cáo sản phẩm","Tạo quảng cáo UGC"], // KINEO-HOME-CARDS-BOTOES-2010
} // KINEO-HOME-CARDS-BOTOES-2010
// KINEO-HOME-CARDS-BOTOES-2010 ─────────────────────────────────────────────────────────────────────────
/** KINEO-HOME-CARDS-BOTOES-2010 — rótulo do botão do card de anúncio (com amostra grátis no ar = "grátis"). */
export function homeCardAdsCta(card: HomeCardId, language: string, sampleLive: boolean): string { // KINEO-HOME-CARDS-BOTOES-2010
  const t = HOME_CARD_ADS_CTA[language] ?? HOME_CARD_ADS_CTA.en // KINEO-HOME-CARDS-BOTOES-2010
  const ugc = card === 'ugc_ads' // KINEO-HOME-CARDS-BOTOES-2010
  return sampleLive ? (ugc ? t[1] : t[0]) : (ugc ? t[3] : t[2]) // KINEO-HOME-CARDS-BOTOES-2010
} // KINEO-HOME-CARDS-BOTOES-2010
