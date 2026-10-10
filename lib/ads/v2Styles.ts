// KINEO-ESTILOS-PRODUTO-2026-10-09 — os ESTILOS de produto do anúncio v2 (Studio Ads).
//
// Decisão do fundador (09/10/2026): a pesquisa de mercado mostrou os efeitos de anúncio de produto que os vendedores mais
// usam; os testes reais na fal (sonda app/api/admin/effect-probe/route.ts) foram aprovados em 5 efeitos, TODOS do mesmo
// endpoint `fal-ai/pixverse/v5/effects` (entrada { effect, image_url, resolution:'720p', duration:'5' } → { video: { url } };
// ~US$ 0,20 por clipe de 5 s em 720p; sai vertical 720×1280 quando a foto é vertical — e a foto do anúncio já chega
// recortada em 9:16).
//
// O QUE O ESTILO FAZ: só o plano-HERÓI do produto (o 1º 'product_hero'; sem ele, o 1º 'product' de foto do cliente) sai
// pelo efeito em vez do motor normal, da MESMA foto. Sem foto de produto no pedido, o estilo é ignorado (o anúncio sai
// como hoje). O preço em créditos NÃO muda: o estilo está incluído (e o efeito custa menos que o Kling/Seedance que ele
// substitui). 'none' = o comportamento de antes, byte a byte.
//
// LIB PURA (só `import type`, apagado na transpilação): o guardião scripts/test-ads-estilos-2026-10-09.mjs importa este
// arquivo cru no Node. As listas de chaves têm ESPELHOS em lib/ads/v2Contract.ts (ADS_V2_CONTRACT_STYLES),
// lib/ads/v2ShotLists.ts (ADS_V2_PLAN_STYLES) e lib/ads/v2Engines.ts (ADS_V2_EFFECT_BY_STYLE, com o enum da fal) — os
// módulos do servidor não importam nada (os guardiões os carregam crus); o guardião confere que os quatro batem.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** Interruptor ÚNICO dos estilos. false = a tela esconde a escolha e o /plan ignora o campo (o anúncio sai como antes). */
export const ADS_V2_STYLES_PUBLIC = true

/** O endpoint dos 5 efeitos (o mesmo da sonda interna). Espelho: ADS_V2_PIXVERSE_EFFECTS_SLUG em lib/ads/v2Tiers.ts. */
export const ADS_V2_STYLE_ENDPOINT = 'fal-ai/pixverse/v5/effects'

// KINEO-ADS-UX-MARCA-2026-10-10 — fundador 10/10: "coloca 15 estilos dos mais usados". +10 efeitos do MESMO endpoint
// (pixverse_effect, 720p, 5 s), cada um com a prévia feita pelo próprio efeito no teste real da fal de 10/10. Os 5 primeiros
// ficam na mesma ordem (os moldes e a sugestão por setor não mudam).
export type AdsV2StyleKey =
  | 'package_explosion' | 'giant_product' | 'product_closeup' | 'ocean_ad' | 'mechanical_assembly'
  | 'naked_eye_3d_ad' | 'beach_ad' | 'lighting_ad' | 'supermarket_ad' | 'poster_ad'
  | 'graffiti_ad' | 'dreamlike_cloud' | 'parachute_delivery' | 'shoal_surround' | 'dishes_served'
/** O que a pessoa escolhe na tela: um estilo, ou 'none' (Auto, sem efeito — o anúncio de antes). */
export type AdsV2StyleChoice = AdsV2StyleKey | 'none'
/** Cópia do setor de lib/ads/v2ShotLists.ts (AdsV2Sector) — o guardião confere. */
export type AdsV2StyleSector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'

export interface AdsV2StyleSpec {
  key: AdsV2StyleKey
  /** O valor EXATO do enum `effect` da fal (maiúsculas e hífen contam). */
  effect: string
  /** Nome em inglês (páginas públicas em inglês e o modo completo). As 16 línguas estão em ADS_V2_STYLE_COPY. */
  label: string
  oneLine: string
  bestFor: string
  /** Prévia feita PELO PRÓPRIO efeito (regra da casa): 360×640, em laço, sem som. */
  preview: string
  poster: string
}

const asset = (key: AdsV2StyleKey) => ({ preview: `/ads-styles/${key}.mp4`, poster: `/ads-styles/${key}.jpg` })

export const ADS_V2_STYLES: readonly AdsV2StyleSpec[] = [
  { key: 'package_explosion', effect: 'Package Explosion', label: 'Package explosion', oneLine: 'The package bursts open and the product pours out.', bestFor: 'Food, drinks, beauty', ...asset('package_explosion') },
  { key: 'giant_product', effect: 'Giant Product', label: 'Giant product', oneLine: 'Your product, giant, over a city street.', bestFor: 'Any product', ...asset('giant_product') },
  { key: 'product_closeup', effect: 'Product close-up', label: 'Product close-up', oneLine: 'A premium macro shot that moves in on the details.', bestFor: 'Perfume, beauty, jewelry', ...asset('product_closeup') },
  { key: 'ocean_ad', effect: 'Ocean ad', label: 'Ocean ad', oneLine: 'Your product under the sea, with light and fish around it.', bestFor: 'Perfume, drinks', ...asset('ocean_ad') },
  { key: 'mechanical_assembly', effect: 'Mechanical Assembly', label: 'Mechanical assembly', oneLine: 'The product opens into an exploded view and closes again.', bestFor: 'Electronics', ...asset('mechanical_assembly') },
  // KINEO-ADS-UX-MARCA-2026-10-10 — os 10 novos (enum EXATO da fal; espelhos em v2Contract, v2ShotLists e v2Engines).
  { key: 'naked_eye_3d_ad', effect: '3D Naked-Eye AD', label: '3D billboard', oneLine: 'Your product pops out of a giant 3D screen.', bestFor: 'Any product, premium', ...asset('naked_eye_3d_ad') },
  { key: 'beach_ad', effect: 'Beach AD', label: 'Beach ad', oneLine: 'Your product on a sunny beach, with sea and sand.', bestFor: 'Perfume, drinks, summer products', ...asset('beach_ad') },
  { key: 'lighting_ad', effect: 'Lighting AD', label: 'Studio lighting', oneLine: 'Premium studio light sweeps across your product.', bestFor: 'Tech, premium products', ...asset('lighting_ad') },
  { key: 'supermarket_ad', effect: 'Supermarket AD', label: 'Supermarket shelf', oneLine: 'Your product shines on a supermarket shelf.', bestFor: 'Packaged food and drinks', ...asset('supermarket_ad') },
  { key: 'poster_ad', effect: 'Poster AD', label: 'Illustrated poster', oneLine: 'Your product turns into an illustrated poster.', bestFor: 'Beauty, fashion', ...asset('poster_ad') },
  { key: 'graffiti_ad', effect: 'Graffiti AD', label: 'Graffiti wall', oneLine: 'Your product painted on a street graffiti wall.', bestFor: 'Street brands, snacks, apparel', ...asset('graffiti_ad') },
  { key: 'dreamlike_cloud', effect: 'Dreamlike Cloud', label: 'Dreamy clouds', oneLine: 'Your product floats among soft, dreamy clouds.', bestFor: 'Perfume, cosmetics, premium', ...asset('dreamlike_cloud') },
  { key: 'parachute_delivery', effect: 'Parachute Delivery', label: 'Parachute delivery', oneLine: 'Your product lands from the sky on a parachute.', bestFor: 'Online shops, launches, snacks', ...asset('parachute_delivery') },
  { key: 'shoal_surround', effect: 'Shoal Surround', label: 'Fish shoal', oneLine: 'A shoal of fish swirls around your product.', bestFor: 'Perfume, drinks, ocean freshness', ...asset('shoal_surround') },
  { key: 'dishes_served', effect: 'Dishes Served', label: 'Dishes served', oneLine: 'Your food is served and people enjoy it.', bestFor: 'Food and snacks', ...asset('dishes_served') },
]

/**
 * KINEO-ADS-UX-MARCA-2026-10-10 — as categorias do carrossel de estilos (All · Food & drink · Beauty · Tech · Any product).
 * Um estilo pode estar em mais de uma. "All" não está aqui: mostra todos. Puro.
 */
export type AdsV2StyleCategory = 'food' | 'beauty' | 'tech' | 'any'
export const ADS_V2_STYLE_CATEGORY_IDS: readonly AdsV2StyleCategory[] = ['food', 'beauty', 'tech', 'any']
export const ADS_V2_STYLE_CATEGORIES: Readonly<Record<AdsV2StyleKey, readonly AdsV2StyleCategory[]>> = {
  package_explosion: ['food', 'beauty'],
  giant_product: ['any'],
  product_closeup: ['beauty', 'tech'],
  ocean_ad: ['beauty', 'food'],
  mechanical_assembly: ['tech'],
  naked_eye_3d_ad: ['any', 'tech'],
  beach_ad: ['beauty', 'food'],
  lighting_ad: ['tech', 'any'],
  supermarket_ad: ['food'],
  poster_ad: ['beauty', 'any'],
  graffiti_ad: ['any', 'food'],
  dreamlike_cloud: ['beauty'],
  parachute_delivery: ['any', 'food'],
  shoal_surround: ['beauty', 'food'],
  dishes_served: ['food'],
}
/** Os estilos de uma categoria, na ordem de ADS_V2_STYLES ('all' = todos). Puro. */
export function adsV2StylesIn(category: AdsV2StyleCategory | 'all'): AdsV2StyleKey[] {
  return ADS_V2_STYLES.filter((s) => category === 'all' || ADS_V2_STYLE_CATEGORIES[s.key].includes(category)).map((s) => s.key)
}

export const ADS_V2_STYLE_KEYS: readonly AdsV2StyleKey[] = ADS_V2_STYLES.map((s) => s.key)

export function isAdsV2Style(raw: unknown): raw is AdsV2StyleKey {
  return typeof raw === 'string' && (ADS_V2_STYLE_KEYS as readonly string[]).includes(raw)
}
export function isAdsV2StyleChoice(raw: unknown): raw is AdsV2StyleChoice {
  return raw === 'none' || isAdsV2Style(raw)
}
export function adsV2Style(key: AdsV2StyleKey): AdsV2StyleSpec {
  const s = ADS_V2_STYLES.find((x) => x.key === key)
  if (!s) throw new Error(`ads_v2_unknown_style:${String(key)}`)
  return s
}

/**
 * Estilo sugerido pelo setor (a tela começa nele; a pessoa troca à vontade).
 * - restaurante → explosão da embalagem (comida e bebida) · salão e clínica → close-up premium (beleza)
 * - loja, academia e 'other' → produto gigante (serve para qualquer produto)
 * - imóvel → nenhum (não há produto para o efeito) · app → nenhum: as fotos do app são TELAS (tipo 'text'), e texto nunca
 *   passa por IA de vídeo; a montagem mecânica fica para quem escolhe (eletrônicos numa loja).
 * - setor desconhecido (null) → nenhum.
 */
export function adsV2SuggestedStyle(sector: AdsV2StyleSector | string | null | undefined): AdsV2StyleChoice {
  switch (sector) {
    case 'restaurant':
      return 'package_explosion'
    case 'salon':
    case 'clinic':
      return 'product_closeup'
    case 'store':
    case 'gym':
    case 'other':
      return 'giant_product'
    default:
      return 'none'
  }
}

/**
 * O plano que recebe o efeito: o 1º 'product_hero'; sem ele, o 1º 'product' de FOTO DO CLIENTE (nunca cena criada,
 * texto ou vídeo do cliente). null = não há plano de produto → o estilo é ignorado. Espelho EXATO de
 * adsV2PlanStyleTarget em lib/ads/v2ShotLists.ts (o guardião compara as duas em todos os moldes).
 */
export function adsV2StyleTargetIdx(shots: readonly { idx: number; kind: string; source: string }[]): number | null {
  const hero = shots.find((s) => s.kind === 'product_hero' && s.source === 'client_photo')
  if (hero) return hero.idx
  const product = shots.find((s) => s.kind === 'product' && s.source === 'client_photo')
  return product ? product.idx : null
}

// ─── as frases da escolha de estilo (16 línguas da interface; nenhuma cai no inglês) ──────────────────────────────────
export interface AdsV2StyleCopy {
  /** título da escolha */
  title: string
  /** linha de baixo do título */
  hint: string
  /** onde o efeito entra (modo completo: a foto marcada como produto) */
  target: string
  /** onde o efeito entra (modo simples: a 1ª foto vira a foto do produto) */
  targetSimple: string
  /** depois do plano: pediu estilo, mas não havia foto de produto */
  noProduct: string
  /** selo do estilo sugerido pelo setor */
  suggested: string
  /** o cartão "Auto" (sem efeito) */
  autoLabel: string
  autoBestFor: string
  /** KINEO-ADS-UX-MARCA-2026-10-10 — + oneLine (o que o efeito faz, numa frase) nas 16 línguas, para a prévia ao vivo. */
  styles: Record<AdsV2StyleKey, { label: string; bestFor: string; oneLine: string }>
}

type AdsV2BaseStyleKey = 'package_explosion' | 'giant_product' | 'product_closeup' | 'ocean_ad' | 'mechanical_assembly'
type AdsV2NewStyleKey = Exclude<AdsV2StyleKey, AdsV2BaseStyleKey>
type AdsV2BaseStyleCopy = Omit<AdsV2StyleCopy, 'styles'> & { styles: Record<AdsV2BaseStyleKey, { label: string; bestFor: string }> }

const BASE_STYLE_COPY: Record<InterfaceLanguage, AdsV2BaseStyleCopy> = {
  en: {
    title: 'Style',
    hint: 'An effect for your product shot. Included in the price.',
    target: 'It goes on the photo you marked as Product. No product photo, no effect.',
    targetSimple: 'It goes on your first photo: put your product photo first.',
    noProduct: 'This ad has no product photo, so it comes out without the effect.',
    suggested: 'Suggested',
    autoLabel: 'Auto',
    autoBestFor: 'No effect: your photos move as usual',
    styles: {
      package_explosion: { label: 'Package explosion', bestFor: 'Food, drinks, beauty' },
      giant_product: { label: 'Giant product', bestFor: 'Any product' },
      product_closeup: { label: 'Product close-up', bestFor: 'Perfume, beauty, jewelry' },
      ocean_ad: { label: 'Ocean ad', bestFor: 'Perfume, drinks' },
      mechanical_assembly: { label: 'Mechanical assembly', bestFor: 'Electronics' },
    },
  },
  pt: {
    title: 'Estilo',
    hint: 'Um efeito para a cena do seu produto. Já incluído no preço.',
    target: 'Ele entra na foto que você marcou como Produto. Sem foto de produto, sem efeito.',
    targetSimple: 'Ele entra na sua primeira foto: coloque a foto do produto primeiro.',
    noProduct: 'Este anúncio não tem foto de produto, então sai sem o efeito.',
    suggested: 'Sugerido',
    autoLabel: 'Automático',
    autoBestFor: 'Sem efeito: suas fotos ganham movimento como sempre',
    styles: {
      package_explosion: { label: 'Explosão da embalagem', bestFor: 'Comida, bebida, beleza' },
      giant_product: { label: 'Produto gigante', bestFor: 'Qualquer produto' },
      product_closeup: { label: 'Close do produto', bestFor: 'Perfume, beleza, joias' },
      ocean_ad: { label: 'Fundo do mar', bestFor: 'Perfume, bebidas' },
      mechanical_assembly: { label: 'Montagem mecânica', bestFor: 'Eletrônicos' },
    },
  },
  es: {
    title: 'Estilo',
    hint: 'Un efecto para la toma de tu producto. Incluido en el precio.',
    target: 'Va en la foto que marcaste como Producto. Sin foto de producto, sin efecto.',
    targetSimple: 'Va en tu primera foto: pon primero la foto del producto.',
    noProduct: 'Este anuncio no tiene foto de producto, así que sale sin el efecto.',
    suggested: 'Sugerido',
    autoLabel: 'Automático',
    autoBestFor: 'Sin efecto: tus fotos se mueven como siempre',
    styles: {
      package_explosion: { label: 'Explosión del empaque', bestFor: 'Comida, bebidas, belleza' },
      giant_product: { label: 'Producto gigante', bestFor: 'Cualquier producto' },
      product_closeup: { label: 'Primer plano', bestFor: 'Perfume, belleza, joyas' },
      ocean_ad: { label: 'Fondo del mar', bestFor: 'Perfume, bebidas' },
      mechanical_assembly: { label: 'Montaje mecánico', bestFor: 'Electrónica' },
    },
  },
  fr: {
    title: 'Style',
    hint: 'Un effet pour le plan de votre produit. Inclus dans le prix.',
    target: 'Il s’applique à la photo marquée Produit. Sans photo de produit, pas d’effet.',
    targetSimple: 'Il s’applique à votre première photo : mettez la photo du produit en premier.',
    noProduct: 'Cette pub n’a pas de photo de produit : elle sort sans l’effet.',
    suggested: 'Suggéré',
    autoLabel: 'Auto',
    autoBestFor: 'Sans effet : vos photos s’animent comme d’habitude',
    styles: {
      package_explosion: { label: 'Emballage qui explose', bestFor: 'Food, boissons, beauté' },
      giant_product: { label: 'Produit géant', bestFor: 'Tout produit' },
      product_closeup: { label: 'Gros plan produit', bestFor: 'Parfum, beauté, bijoux' },
      ocean_ad: { label: 'Fond marin', bestFor: 'Parfum, boissons' },
      mechanical_assembly: { label: 'Assemblage mécanique', bestFor: 'Électronique' },
    },
  },
  de: {
    title: 'Stil',
    hint: 'Ein Effekt für die Szene mit deinem Produkt. Im Preis enthalten.',
    target: 'Er kommt auf das Foto, das du als Produkt markiert hast. Ohne Produktfoto kein Effekt.',
    targetSimple: 'Er kommt auf dein erstes Foto: Setz das Produktfoto an den Anfang.',
    noProduct: 'Diese Anzeige hat kein Produktfoto, deshalb kommt sie ohne Effekt.',
    suggested: 'Empfohlen',
    autoLabel: 'Auto',
    autoBestFor: 'Kein Effekt: deine Fotos bewegen sich wie gewohnt',
    styles: {
      package_explosion: { label: 'Explodierende Verpackung', bestFor: 'Essen, Getränke, Beauty' },
      giant_product: { label: 'Riesenprodukt', bestFor: 'Jedes Produkt' },
      product_closeup: { label: 'Produkt-Nahaufnahme', bestFor: 'Parfüm, Beauty, Schmuck' },
      ocean_ad: { label: 'Unterwasser', bestFor: 'Parfüm, Getränke' },
      mechanical_assembly: { label: 'Mechanische Montage', bestFor: 'Elektronik' },
    },
  },
  it: {
    title: 'Stile',
    hint: 'Un effetto per la scena del tuo prodotto. Incluso nel prezzo.',
    target: 'Va sulla foto che hai segnato come Prodotto. Senza foto del prodotto, niente effetto.',
    targetSimple: 'Va sulla tua prima foto: metti per prima la foto del prodotto.',
    noProduct: 'Questo annuncio non ha una foto del prodotto, quindi esce senza effetto.',
    suggested: 'Consigliato',
    autoLabel: 'Auto',
    autoBestFor: 'Nessun effetto: le tue foto si muovono come sempre',
    styles: {
      package_explosion: { label: 'Confezione che esplode', bestFor: 'Cibo, bevande, beauty' },
      giant_product: { label: 'Prodotto gigante', bestFor: 'Qualsiasi prodotto' },
      product_closeup: { label: 'Primo piano', bestFor: 'Profumo, beauty, gioielli' },
      ocean_ad: { label: 'Fondale marino', bestFor: 'Profumo, bevande' },
      mechanical_assembly: { label: 'Montaggio meccanico', bestFor: 'Elettronica' },
    },
  },
  nl: {
    title: 'Stijl',
    hint: 'Een effect voor het shot van je product. Zit bij de prijs in.',
    target: 'Het komt op de foto die je als Product hebt gemarkeerd. Geen productfoto, geen effect.',
    targetSimple: 'Het komt op je eerste foto: zet de productfoto vooraan.',
    noProduct: 'Deze advertentie heeft geen productfoto, dus hij komt zonder effect.',
    suggested: 'Aanbevolen',
    autoLabel: 'Auto',
    autoBestFor: 'Geen effect: je foto’s bewegen zoals altijd',
    styles: {
      package_explosion: { label: 'Exploderende verpakking', bestFor: 'Eten, drinken, beauty' },
      giant_product: { label: 'Reuzenproduct', bestFor: 'Elk product' },
      product_closeup: { label: 'Product-close-up', bestFor: 'Parfum, beauty, sieraden' },
      ocean_ad: { label: 'Onderwater', bestFor: 'Parfum, drankjes' },
      mechanical_assembly: { label: 'Mechanische montage', bestFor: 'Elektronica' },
    },
  },
  pl: {
    title: 'Styl',
    hint: 'Efekt dla ujęcia Twojego produktu. W cenie.',
    target: 'Trafia na zdjęcie oznaczone jako Produkt. Bez zdjęcia produktu nie ma efektu.',
    targetSimple: 'Trafia na Twoje pierwsze zdjęcie: daj zdjęcie produktu na początek.',
    noProduct: 'Ta reklama nie ma zdjęcia produktu, więc wychodzi bez efektu.',
    suggested: 'Polecany',
    autoLabel: 'Auto',
    autoBestFor: 'Bez efektu: zdjęcia ruszają się jak zwykle',
    styles: {
      package_explosion: { label: 'Wybuch opakowania', bestFor: 'Jedzenie, napoje, uroda' },
      giant_product: { label: 'Gigantyczny produkt', bestFor: 'Każdy produkt' },
      product_closeup: { label: 'Zbliżenie produktu', bestFor: 'Perfumy, uroda, biżuteria' },
      ocean_ad: { label: 'Podwodny świat', bestFor: 'Perfumy, napoje' },
      mechanical_assembly: { label: 'Montaż mechaniczny', bestFor: 'Elektronika' },
    },
  },
  tr: {
    title: 'Stil',
    hint: 'Ürün sahnen için bir efekt. Fiyata dahil.',
    target: 'Ürün olarak işaretlediğin fotoğrafa uygulanır. Ürün fotoğrafı yoksa efekt de yok.',
    targetSimple: 'İlk fotoğrafına uygulanır: ürün fotoğrafını en başa koy.',
    noProduct: 'Bu reklamda ürün fotoğrafı yok, bu yüzden efektsiz çıkıyor.',
    suggested: 'Önerilen',
    autoLabel: 'Otomatik',
    autoBestFor: 'Efekt yok: fotoğrafların her zamanki gibi hareket eder',
    styles: {
      package_explosion: { label: 'Patlayan ambalaj', bestFor: 'Yiyecek, içecek, güzellik' },
      giant_product: { label: 'Dev ürün', bestFor: 'Her ürün' },
      product_closeup: { label: 'Ürün yakın çekimi', bestFor: 'Parfüm, güzellik, takı' },
      ocean_ad: { label: 'Deniz altı', bestFor: 'Parfüm, içecek' },
      mechanical_assembly: { label: 'Mekanik montaj', bestFor: 'Elektronik' },
    },
  },
  ru: {
    title: 'Стиль',
    hint: 'Эффект для кадра с вашим товаром. Уже входит в цену.',
    target: 'Он ложится на фото, отмеченное как «Товар». Нет фото товара — нет эффекта.',
    targetSimple: 'Он ложится на первое фото: поставьте фото товара первым.',
    noProduct: 'В этой рекламе нет фото товара, поэтому она выйдет без эффекта.',
    suggested: 'Рекомендуем',
    autoLabel: 'Авто',
    autoBestFor: 'Без эффекта: фото оживают как обычно',
    styles: {
      package_explosion: { label: 'Взрыв упаковки', bestFor: 'Еда, напитки, красота' },
      giant_product: { label: 'Гигантский товар', bestFor: 'Любой товар' },
      product_closeup: { label: 'Крупный план', bestFor: 'Парфюм, красота, украшения' },
      ocean_ad: { label: 'Под водой', bestFor: 'Парфюм, напитки' },
      mechanical_assembly: { label: 'Механическая сборка', bestFor: 'Электроника' },
    },
  },
  uk: {
    title: 'Стиль',
    hint: 'Ефект для кадру з вашим товаром. Уже входить у ціну.',
    target: 'Він накладається на фото, позначене як «Товар». Немає фото товару — немає ефекту.',
    targetSimple: 'Він накладається на перше фото: поставте фото товару першим.',
    noProduct: 'У цій рекламі немає фото товару, тому вона вийде без ефекту.',
    suggested: 'Радимо',
    autoLabel: 'Авто',
    autoBestFor: 'Без ефекту: фото оживають як завжди',
    styles: {
      package_explosion: { label: 'Вибух упаковки', bestFor: 'Їжа, напої, краса' },
      giant_product: { label: 'Гігантський товар', bestFor: 'Будь-який товар' },
      product_closeup: { label: 'Великий план', bestFor: 'Парфуми, краса, прикраси' },
      ocean_ad: { label: 'Під водою', bestFor: 'Парфуми, напої' },
      mechanical_assembly: { label: 'Механічне складання', bestFor: 'Електроніка' },
    },
  },
  ar: {
    title: 'الأسلوب',
    hint: 'تأثير لمشهد منتجك. مشمول في السعر.',
    target: 'يُطبَّق على الصورة التي حددتها كمنتج. بلا صورة منتج، لا تأثير.',
    targetSimple: 'يُطبَّق على صورتك الأولى: ضع صورة المنتج أولًا.',
    noProduct: 'لا توجد صورة منتج في هذا الإعلان، لذلك يخرج بدون التأثير.',
    suggested: 'مقترح',
    autoLabel: 'تلقائي',
    autoBestFor: 'بلا تأثير: صورك تتحرك كالمعتاد',
    styles: {
      package_explosion: { label: 'انفجار العبوة', bestFor: 'طعام، مشروبات، تجميل' },
      giant_product: { label: 'منتج عملاق', bestFor: 'أي منتج' },
      product_closeup: { label: 'لقطة مقرّبة', bestFor: 'عطور، تجميل، مجوهرات' },
      ocean_ad: { label: 'تحت البحر', bestFor: 'عطور، مشروبات' },
      mechanical_assembly: { label: 'تركيب ميكانيكي', bestFor: 'إلكترونيات' },
    },
  },
  ur: {
    title: 'انداز',
    hint: 'آپ کے پروڈکٹ والے منظر کے لیے ایک ایفیکٹ۔ قیمت میں شامل۔',
    target: 'یہ اس تصویر پر لگتا ہے جسے آپ نے پروڈکٹ کے طور پر نشان زد کیا۔ پروڈکٹ کی تصویر نہیں تو ایفیکٹ نہیں۔',
    targetSimple: 'یہ آپ کی پہلی تصویر پر لگتا ہے: پروڈکٹ کی تصویر سب سے پہلے رکھیں۔',
    noProduct: 'اس اشتہار میں پروڈکٹ کی تصویر نہیں، اس لیے یہ ایفیکٹ کے بغیر بنے گا۔',
    suggested: 'تجویز کردہ',
    autoLabel: 'خودکار',
    autoBestFor: 'کوئی ایفیکٹ نہیں: آپ کی تصویریں معمول کے مطابق حرکت کریں گی',
    styles: {
      package_explosion: { label: 'پیکنگ کا دھماکا', bestFor: 'کھانا، مشروبات، بیوٹی' },
      giant_product: { label: 'دیوقامت پروڈکٹ', bestFor: 'ہر پروڈکٹ' },
      product_closeup: { label: 'پروڈکٹ کا کلوز اپ', bestFor: 'پرفیوم، بیوٹی، زیورات' },
      ocean_ad: { label: 'سمندر کی تہہ', bestFor: 'پرفیوم، مشروبات' },
      mechanical_assembly: { label: 'مشینی جوڑ', bestFor: 'الیکٹرانکس' },
    },
  },
  hi: {
    title: 'स्टाइल',
    hint: 'आपके प्रोडक्ट वाले सीन के लिए एक इफ़ेक्ट। कीमत में शामिल।',
    target: 'यह उस फ़ोटो पर लगता है जिसे आपने प्रोडक्ट चुना है। प्रोडक्ट फ़ोटो नहीं, तो इफ़ेक्ट नहीं।',
    targetSimple: 'यह आपकी पहली फ़ोटो पर लगता है: प्रोडक्ट की फ़ोटो सबसे पहले रखें।',
    noProduct: 'इस विज्ञापन में प्रोडक्ट की फ़ोटो नहीं है, इसलिए यह बिना इफ़ेक्ट के बनेगा।',
    suggested: 'सुझाया गया',
    autoLabel: 'ऑटो',
    autoBestFor: 'कोई इफ़ेक्ट नहीं: आपकी फ़ोटो हमेशा की तरह चलेंगी',
    styles: {
      package_explosion: { label: 'पैकेट धमाका', bestFor: 'खाना, ड्रिंक, ब्यूटी' },
      giant_product: { label: 'विशाल प्रोडक्ट', bestFor: 'कोई भी प्रोडक्ट' },
      product_closeup: { label: 'प्रोडक्ट क्लोज़-अप', bestFor: 'परफ़्यूम, ब्यूटी, ज्वेलरी' },
      ocean_ad: { label: 'समंदर के अंदर', bestFor: 'परफ़्यूम, ड्रिंक' },
      mechanical_assembly: { label: 'मैकेनिकल असेंबली', bestFor: 'इलेक्ट्रॉनिक्स' },
    },
  },
  id: {
    title: 'Gaya',
    hint: 'Efek untuk adegan produkmu. Sudah termasuk harga.',
    target: 'Efeknya dipasang di foto yang kamu tandai sebagai Produk. Tanpa foto produk, tanpa efek.',
    targetSimple: 'Efeknya dipasang di foto pertamamu: taruh foto produk paling depan.',
    noProduct: 'Iklan ini tidak punya foto produk, jadi keluar tanpa efek.',
    suggested: 'Disarankan',
    autoLabel: 'Otomatis',
    autoBestFor: 'Tanpa efek: fotomu bergerak seperti biasa',
    styles: {
      package_explosion: { label: 'Kemasan meledak', bestFor: 'Makanan, minuman, kecantikan' },
      giant_product: { label: 'Produk raksasa', bestFor: 'Produk apa saja' },
      product_closeup: { label: 'Close-up produk', bestFor: 'Parfum, kecantikan, perhiasan' },
      ocean_ad: { label: 'Bawah laut', bestFor: 'Parfum, minuman' },
      mechanical_assembly: { label: 'Rakitan mekanis', bestFor: 'Elektronik' },
    },
  },
  vi: {
    title: 'Phong cách',
    hint: 'Một hiệu ứng cho cảnh sản phẩm của bạn. Đã gồm trong giá.',
    target: 'Hiệu ứng áp vào ảnh bạn đánh dấu là Sản phẩm. Không có ảnh sản phẩm thì không có hiệu ứng.',
    targetSimple: 'Hiệu ứng áp vào ảnh đầu tiên: hãy đặt ảnh sản phẩm lên đầu.',
    noProduct: 'Quảng cáo này không có ảnh sản phẩm nên sẽ ra không có hiệu ứng.',
    suggested: 'Gợi ý',
    autoLabel: 'Tự động',
    autoBestFor: 'Không hiệu ứng: ảnh của bạn chuyển động như thường',
    styles: {
      package_explosion: { label: 'Bao bì bùng nổ', bestFor: 'Đồ ăn, đồ uống, làm đẹp' },
      giant_product: { label: 'Sản phẩm khổng lồ', bestFor: 'Mọi sản phẩm' },
      product_closeup: { label: 'Cận cảnh sản phẩm', bestFor: 'Nước hoa, làm đẹp, trang sức' },
      ocean_ad: { label: 'Dưới đáy biển', bestFor: 'Nước hoa, đồ uống' },
      mechanical_assembly: { label: 'Lắp ráp cơ khí', bestFor: 'Điện tử' },
    },
  },
}

// KINEO-ADS-UX-MARCA-2026-10-10 — o que cada um dos 5 estilos de antes faz, numa frase (16 línguas).
const BASE_ONE_LINES: Record<InterfaceLanguage, Record<AdsV2BaseStyleKey, string>> = {
  en: { package_explosion: 'The package bursts open and the product pours out.', giant_product: 'Your product, giant, over a city street.', product_closeup: 'A premium macro shot that moves in on the details.', ocean_ad: 'Your product under the sea, with light and fish around it.', mechanical_assembly: 'The product opens into an exploded view and closes again.' },
  pt: { package_explosion: 'A embalagem estoura e o produto sai de dentro.', giant_product: 'Seu produto, gigante, sobre uma rua da cidade.', product_closeup: 'Um close premium que chega nos detalhes.', ocean_ad: 'Seu produto no fundo do mar, com luz e peixes em volta.', mechanical_assembly: 'O produto se abre em peças e se fecha de novo.' },
  es: { package_explosion: 'El empaque estalla y el producto sale de adentro.', giant_product: 'Tu producto, gigante, sobre una calle de la ciudad.', product_closeup: 'Un primer plano premium que llega a los detalles.', ocean_ad: 'Tu producto bajo el mar, con luz y peces alrededor.', mechanical_assembly: 'El producto se abre en piezas y se vuelve a cerrar.' },
  fr: { package_explosion: 'L’emballage éclate et le produit en sort.', giant_product: 'Votre produit, géant, au-dessus d’une rue.', product_closeup: 'Un gros plan premium qui révèle les détails.', ocean_ad: 'Votre produit sous la mer, entouré de lumière et de poissons.', mechanical_assembly: 'Le produit s’ouvre en pièces puis se referme.' },
  de: { package_explosion: 'Die Verpackung platzt auf und das Produkt kommt heraus.', giant_product: 'Dein Produkt, riesig, über einer Stadtstraße.', product_closeup: 'Eine edle Nahaufnahme, die die Details zeigt.', ocean_ad: 'Dein Produkt unter Wasser, mit Licht und Fischen.', mechanical_assembly: 'Das Produkt zerlegt sich in Teile und setzt sich wieder zusammen.' },
  it: { package_explosion: 'La confezione esplode e il prodotto esce fuori.', giant_product: 'Il tuo prodotto, gigante, sopra una strada di città.', product_closeup: 'Un primo piano premium che entra nei dettagli.', ocean_ad: 'Il tuo prodotto sott’acqua, con luce e pesci intorno.', mechanical_assembly: 'Il prodotto si apre in pezzi e si richiude.' },
  nl: { package_explosion: 'De verpakking barst open en het product komt eruit.', giant_product: 'Je product, reusachtig, boven een stadsstraat.', product_closeup: 'Een premium close-up die de details laat zien.', ocean_ad: 'Je product onder water, met licht en vissen eromheen.', mechanical_assembly: 'Het product valt uiteen in onderdelen en sluit weer.' },
  pl: { package_explosion: 'Opakowanie pęka, a produkt wysypuje się ze środka.', giant_product: 'Twój produkt, ogromny, nad miejską ulicą.', product_closeup: 'Ujęcie premium z bliska, które pokazuje detale.', ocean_ad: 'Twój produkt pod wodą, ze światłem i rybami wokół.', mechanical_assembly: 'Produkt rozkłada się na części i składa z powrotem.' },
  tr: { package_explosion: 'Ambalaj patlar ve ürün içinden çıkar.', giant_product: 'Ürünün dev boyutta, bir şehir sokağının üstünde.', product_closeup: 'Ayrıntılara yaklaşan premium bir yakın çekim.', ocean_ad: 'Ürünün denizin altında, etrafında ışık ve balıklarla.', mechanical_assembly: 'Ürün parçalarına ayrılır ve yeniden birleşir.' },
  ru: { package_explosion: 'Упаковка лопается, и продукт высыпается наружу.', giant_product: 'Ваш продукт, гигантский, над улицей города.', product_closeup: 'Премиальный крупный план с деталями.', ocean_ad: 'Ваш продукт под водой, со светом и рыбами вокруг.', mechanical_assembly: 'Продукт раскладывается на детали и собирается снова.' },
  uk: { package_explosion: 'Упаковка лопається, і продукт висипається назовні.', giant_product: 'Ваш продукт, велетенський, над вулицею міста.', product_closeup: 'Преміальний великий план із деталями.', ocean_ad: 'Ваш продукт під водою, зі світлом і рибами довкола.', mechanical_assembly: 'Продукт розкладається на деталі й збирається знову.' },
  ar: { package_explosion: 'تنفجر العبوة ويخرج المنتج منها.', giant_product: 'منتجك عملاق فوق شارع في المدينة.', product_closeup: 'لقطة مقرّبة فاخرة تُظهر التفاصيل.', ocean_ad: 'منتجك تحت البحر، مع الضوء والأسماك حوله.', mechanical_assembly: 'يتفكك المنتج إلى أجزاء ثم يعود كما كان.' },
  ur: { package_explosion: 'پیکنگ پھٹتی ہے اور پروڈکٹ باہر آتی ہے۔', giant_product: 'آپ کی پروڈکٹ، بہت بڑی، شہر کی سڑک کے اوپر۔', product_closeup: 'پریمیم کلوز اپ جو تفصیلات دکھاتا ہے۔', ocean_ad: 'آپ کی پروڈکٹ سمندر کے نیچے، روشنی اور مچھلیوں کے ساتھ۔', mechanical_assembly: 'پروڈکٹ پرزوں میں کھلتی ہے اور پھر جڑ جاتی ہے۔' },
  hi: { package_explosion: 'पैकेट फटता है और प्रोडक्ट बाहर आता है।', giant_product: 'आपका प्रोडक्ट, विशाल, शहर की सड़क के ऊपर।', product_closeup: 'प्रीमियम क्लोज़-अप जो बारीकियाँ दिखाता है।', ocean_ad: 'आपका प्रोडक्ट समुद्र के नीचे, रोशनी और मछलियों के साथ।', mechanical_assembly: 'प्रोडक्ट पुर्ज़ों में खुलता है और फिर जुड़ जाता है।' },
  id: { package_explosion: 'Kemasan meledak dan produk keluar dari dalamnya.', giant_product: 'Produkmu, raksasa, di atas jalan kota.', product_closeup: 'Close-up premium yang menyorot detail.', ocean_ad: 'Produkmu di bawah laut, dengan cahaya dan ikan di sekitarnya.', mechanical_assembly: 'Produk terbuka menjadi bagian-bagian lalu menutup lagi.' },
  vi: { package_explosion: 'Bao bì nổ tung và sản phẩm tràn ra.', giant_product: 'Sản phẩm của bạn, khổng lồ, trên một con phố.', product_closeup: 'Cận cảnh cao cấp đi vào từng chi tiết.', ocean_ad: 'Sản phẩm của bạn dưới đáy biển, với ánh sáng và cá xung quanh.', mechanical_assembly: 'Sản phẩm tách thành từng phần rồi khép lại.' },
}

type L3 = { label: string; bestFor: string; oneLine: string }
// KINEO-ADS-UX-MARCA-2026-10-10 — os 10 estilos novos nas 16 línguas (nome, para que serve, o que faz).
const NEW_STYLE_COPY: Record<InterfaceLanguage, Record<AdsV2NewStyleKey, L3>> = {
  en: {
    naked_eye_3d_ad: { label: '3D billboard', bestFor: 'Any product, premium', oneLine: 'Your product pops out of a giant 3D screen.' },
    beach_ad: { label: 'Beach ad', bestFor: 'Perfume, drinks, summer products', oneLine: 'Your product on a sunny beach, with sea and sand.' },
    lighting_ad: { label: 'Studio lighting', bestFor: 'Tech, premium products', oneLine: 'Premium studio light sweeps across your product.' },
    supermarket_ad: { label: 'Supermarket shelf', bestFor: 'Packaged food and drinks', oneLine: 'Your product shines on a supermarket shelf.' },
    poster_ad: { label: 'Illustrated poster', bestFor: 'Beauty, fashion', oneLine: 'Your product turns into an illustrated poster.' },
    graffiti_ad: { label: 'Graffiti wall', bestFor: 'Street brands, snacks, apparel', oneLine: 'Your product painted on a street graffiti wall.' },
    dreamlike_cloud: { label: 'Dreamy clouds', bestFor: 'Perfume, cosmetics, premium', oneLine: 'Your product floats among soft, dreamy clouds.' },
    parachute_delivery: { label: 'Parachute delivery', bestFor: 'Online shops, launches, snacks', oneLine: 'Your product lands from the sky on a parachute.' },
    shoal_surround: { label: 'Fish shoal', bestFor: 'Perfume, drinks, ocean freshness', oneLine: 'A shoal of fish swirls around your product.' },
    dishes_served: { label: 'Dishes served', bestFor: 'Food and snacks', oneLine: 'Your food is served and people enjoy it.' },
  },
  pt: {
    naked_eye_3d_ad: { label: 'Painel 3D', bestFor: 'Qualquer produto, premium', oneLine: 'Seu produto salta de um telão 3D gigante.' },
    beach_ad: { label: 'Na praia', bestFor: 'Perfume, bebidas, produtos de verão', oneLine: 'Seu produto numa praia ensolarada, com mar e areia.' },
    lighting_ad: { label: 'Luz de estúdio', bestFor: 'Tecnologia, produtos premium', oneLine: 'Uma luz de estúdio premium passa pelo seu produto.' },
    supermarket_ad: { label: 'Prateleira de mercado', bestFor: 'Comida e bebida embalada', oneLine: 'Seu produto brilha na prateleira do supermercado.' },
    poster_ad: { label: 'Pôster ilustrado', bestFor: 'Beleza, moda', oneLine: 'Seu produto vira um pôster ilustrado.' },
    graffiti_ad: { label: 'Muro grafitado', bestFor: 'Marcas de rua, snacks, roupas', oneLine: 'Seu produto pintado num muro de grafite.' },
    dreamlike_cloud: { label: 'Nuvens de sonho', bestFor: 'Perfume, cosméticos, premium', oneLine: 'Seu produto flutua entre nuvens suaves.' },
    parachute_delivery: { label: 'Entrega de paraquedas', bestFor: 'Lojas online, lançamentos, snacks', oneLine: 'Seu produto desce do céu de paraquedas.' },
    shoal_surround: { label: 'Cardume', bestFor: 'Perfume, bebidas, frescor do mar', oneLine: 'Um cardume de peixes gira em volta do seu produto.' },
    dishes_served: { label: 'Prato servido', bestFor: 'Comida e lanches', oneLine: 'Sua comida é servida e as pessoas aproveitam.' },
  },
  es: {
    naked_eye_3d_ad: { label: 'Pantalla 3D', bestFor: 'Cualquier producto, premium', oneLine: 'Tu producto sale de una pantalla 3D gigante.' },
    beach_ad: { label: 'En la playa', bestFor: 'Perfume, bebidas, productos de verano', oneLine: 'Tu producto en una playa soleada, con mar y arena.' },
    lighting_ad: { label: 'Luz de estudio', bestFor: 'Tecnología, productos premium', oneLine: 'Una luz de estudio premium recorre tu producto.' },
    supermarket_ad: { label: 'Estante de súper', bestFor: 'Comida y bebida envasada', oneLine: 'Tu producto brilla en el estante del supermercado.' },
    poster_ad: { label: 'Póster ilustrado', bestFor: 'Belleza, moda', oneLine: 'Tu producto se convierte en un póster ilustrado.' },
    graffiti_ad: { label: 'Muro de grafiti', bestFor: 'Marcas urbanas, snacks, ropa', oneLine: 'Tu producto pintado en un muro de grafiti.' },
    dreamlike_cloud: { label: 'Nubes de ensueño', bestFor: 'Perfume, cosméticos, premium', oneLine: 'Tu producto flota entre nubes suaves.' },
    parachute_delivery: { label: 'Entrega en paracaídas', bestFor: 'Tiendas online, lanzamientos, snacks', oneLine: 'Tu producto baja del cielo en paracaídas.' },
    shoal_surround: { label: 'Cardumen', bestFor: 'Perfume, bebidas, frescura del mar', oneLine: 'Un cardumen de peces gira alrededor de tu producto.' },
    dishes_served: { label: 'Plato servido', bestFor: 'Comida y snacks', oneLine: 'Tu comida se sirve y la gente la disfruta.' },
  },
  fr: {
    naked_eye_3d_ad: { label: 'Écran 3D', bestFor: 'Tout produit, premium', oneLine: 'Votre produit jaillit d’un écran 3D géant.' },
    beach_ad: { label: 'À la plage', bestFor: 'Parfum, boissons, produits d’été', oneLine: 'Votre produit sur une plage ensoleillée, mer et sable.' },
    lighting_ad: { label: 'Lumière de studio', bestFor: 'Tech, produits premium', oneLine: 'Une lumière de studio premium balaie votre produit.' },
    supermarket_ad: { label: 'Rayon de supermarché', bestFor: 'Aliments et boissons emballés', oneLine: 'Votre produit brille dans un rayon de supermarché.' },
    poster_ad: { label: 'Affiche illustrée', bestFor: 'Beauté, mode', oneLine: 'Votre produit devient une affiche illustrée.' },
    graffiti_ad: { label: 'Mur de graffiti', bestFor: 'Marques urbaines, snacks, vêtements', oneLine: 'Votre produit peint sur un mur de graffiti.' },
    dreamlike_cloud: { label: 'Nuages de rêve', bestFor: 'Parfum, cosmétiques, premium', oneLine: 'Votre produit flotte parmi des nuages doux.' },
    parachute_delivery: { label: 'Livraison en parachute', bestFor: 'E-commerce, lancements, snacks', oneLine: 'Votre produit descend du ciel en parachute.' },
    shoal_surround: { label: 'Banc de poissons', bestFor: 'Parfum, boissons, fraîcheur marine', oneLine: 'Un banc de poissons tourne autour de votre produit.' },
    dishes_served: { label: 'Plat servi', bestFor: 'Plats et snacks', oneLine: 'Votre plat est servi et les gens se régalent.' },
  },
  de: {
    naked_eye_3d_ad: { label: '3D-Billboard', bestFor: 'Jedes Produkt, premium', oneLine: 'Dein Produkt springt aus einem riesigen 3D-Bildschirm.' },
    beach_ad: { label: 'Am Strand', bestFor: 'Parfüm, Getränke, Sommerprodukte', oneLine: 'Dein Produkt an einem sonnigen Strand mit Meer und Sand.' },
    lighting_ad: { label: 'Studiolicht', bestFor: 'Technik, Premiumprodukte', oneLine: 'Edles Studiolicht gleitet über dein Produkt.' },
    supermarket_ad: { label: 'Supermarktregal', bestFor: 'Verpackte Lebensmittel und Getränke', oneLine: 'Dein Produkt glänzt im Supermarktregal.' },
    poster_ad: { label: 'Illustriertes Poster', bestFor: 'Beauty, Mode', oneLine: 'Dein Produkt wird zu einem illustrierten Poster.' },
    graffiti_ad: { label: 'Graffiti-Wand', bestFor: 'Streetwear-Marken, Snacks, Kleidung', oneLine: 'Dein Produkt auf eine Graffiti-Wand gesprüht.' },
    dreamlike_cloud: { label: 'Traumwolken', bestFor: 'Parfüm, Kosmetik, premium', oneLine: 'Dein Produkt schwebt zwischen weichen Wolken.' },
    parachute_delivery: { label: 'Fallschirm-Lieferung', bestFor: 'Onlineshops, Launches, Snacks', oneLine: 'Dein Produkt landet am Fallschirm vom Himmel.' },
    shoal_surround: { label: 'Fischschwarm', bestFor: 'Parfüm, Getränke, Meeresfrische', oneLine: 'Ein Fischschwarm kreist um dein Produkt.' },
    dishes_served: { label: 'Gericht serviert', bestFor: 'Essen und Snacks', oneLine: 'Dein Essen wird serviert und genossen.' },
  },
  it: {
    naked_eye_3d_ad: { label: 'Maxischermo 3D', bestFor: 'Qualsiasi prodotto, premium', oneLine: 'Il tuo prodotto esce da un enorme schermo 3D.' },
    beach_ad: { label: 'In spiaggia', bestFor: 'Profumi, bevande, prodotti estivi', oneLine: 'Il tuo prodotto su una spiaggia assolata, mare e sabbia.' },
    lighting_ad: { label: 'Luce da studio', bestFor: 'Tecnologia, prodotti premium', oneLine: 'Una luce da studio premium scorre sul tuo prodotto.' },
    supermarket_ad: { label: 'Scaffale del supermercato', bestFor: 'Cibi e bevande confezionati', oneLine: 'Il tuo prodotto brilla sullo scaffale del supermercato.' },
    poster_ad: { label: 'Poster illustrato', bestFor: 'Beauty, moda', oneLine: 'Il tuo prodotto diventa un poster illustrato.' },
    graffiti_ad: { label: 'Muro di graffiti', bestFor: 'Brand street, snack, abbigliamento', oneLine: 'Il tuo prodotto dipinto su un muro di graffiti.' },
    dreamlike_cloud: { label: 'Nuvole da sogno', bestFor: 'Profumi, cosmetici, premium', oneLine: 'Il tuo prodotto fluttua tra nuvole morbide.' },
    parachute_delivery: { label: 'Consegna col paracadute', bestFor: 'Negozi online, lanci, snack', oneLine: 'Il tuo prodotto scende dal cielo col paracadute.' },
    shoal_surround: { label: 'Banco di pesci', bestFor: 'Profumi, bevande, freschezza marina', oneLine: 'Un banco di pesci gira intorno al tuo prodotto.' },
    dishes_served: { label: 'Piatto servito', bestFor: 'Cibo e snack', oneLine: 'Il tuo piatto viene servito e gustato.' },
  },
  nl: {
    naked_eye_3d_ad: { label: '3D-billboard', bestFor: 'Elk product, premium', oneLine: 'Je product springt uit een enorm 3D-scherm.' },
    beach_ad: { label: 'Op het strand', bestFor: 'Parfum, drankjes, zomerproducten', oneLine: 'Je product op een zonnig strand, met zee en zand.' },
    lighting_ad: { label: 'Studiolicht', bestFor: 'Tech, premium producten', oneLine: 'Premium studiolicht glijdt over je product.' },
    supermarket_ad: { label: 'Supermarktschap', bestFor: 'Verpakt eten en drinken', oneLine: 'Je product straalt in het supermarktschap.' },
    poster_ad: { label: 'Geïllustreerde poster', bestFor: 'Beauty, mode', oneLine: 'Je product wordt een geïllustreerde poster.' },
    graffiti_ad: { label: 'Graffitimuur', bestFor: 'Streetmerken, snacks, kleding', oneLine: 'Je product geschilderd op een graffitimuur.' },
    dreamlike_cloud: { label: 'Droomwolken', bestFor: 'Parfum, cosmetica, premium', oneLine: 'Je product zweeft tussen zachte wolken.' },
    parachute_delivery: { label: 'Parachutelevering', bestFor: 'Webshops, lanceringen, snacks', oneLine: 'Je product landt uit de lucht aan een parachute.' },
    shoal_surround: { label: 'Visschool', bestFor: 'Parfum, drankjes, zeefrisheid', oneLine: 'Een school vissen draait om je product.' },
    dishes_served: { label: 'Gerecht geserveerd', bestFor: 'Eten en snacks', oneLine: 'Je eten wordt geserveerd en mensen genieten.' },
  },
  pl: {
    naked_eye_3d_ad: { label: 'Billboard 3D', bestFor: 'Każdy produkt, premium', oneLine: 'Twój produkt wyskakuje z ogromnego ekranu 3D.' },
    beach_ad: { label: 'Na plaży', bestFor: 'Perfumy, napoje, produkty letnie', oneLine: 'Twój produkt na słonecznej plaży, z morzem i piaskiem.' },
    lighting_ad: { label: 'Światło studyjne', bestFor: 'Elektronika, produkty premium', oneLine: 'Studyjne światło premium przesuwa się po produkcie.' },
    supermarket_ad: { label: 'Półka w sklepie', bestFor: 'Pakowane jedzenie i napoje', oneLine: 'Twój produkt błyszczy na półce supermarketu.' },
    poster_ad: { label: 'Ilustrowany plakat', bestFor: 'Uroda, moda', oneLine: 'Twój produkt staje się ilustrowanym plakatem.' },
    graffiti_ad: { label: 'Ściana graffiti', bestFor: 'Marki uliczne, przekąski, odzież', oneLine: 'Twój produkt namalowany na ścianie graffiti.' },
    dreamlike_cloud: { label: 'Chmury marzeń', bestFor: 'Perfumy, kosmetyki, premium', oneLine: 'Twój produkt unosi się wśród miękkich chmur.' },
    parachute_delivery: { label: 'Dostawa na spadochronie', bestFor: 'Sklepy online, premiery, przekąski', oneLine: 'Twój produkt ląduje z nieba na spadochronie.' },
    shoal_surround: { label: 'Ławica ryb', bestFor: 'Perfumy, napoje, morska świeżość', oneLine: 'Ławica ryb krąży wokół twojego produktu.' },
    dishes_served: { label: 'Podane danie', bestFor: 'Jedzenie i przekąski', oneLine: 'Twoje danie jest podane, a ludzie się nim cieszą.' },
  },
  tr: {
    naked_eye_3d_ad: { label: '3D reklam panosu', bestFor: 'Her ürün, premium', oneLine: 'Ürünün dev bir 3D ekrandan dışarı fırlar.' },
    beach_ad: { label: 'Plajda', bestFor: 'Parfüm, içecek, yaz ürünleri', oneLine: 'Ürünün deniz ve kumla güneşli bir plajda.' },
    lighting_ad: { label: 'Stüdyo ışığı', bestFor: 'Teknoloji, premium ürünler', oneLine: 'Premium stüdyo ışığı ürününün üzerinden geçer.' },
    supermarket_ad: { label: 'Market rafı', bestFor: 'Paketli yiyecek ve içecek', oneLine: 'Ürünün market rafında parlar.' },
    poster_ad: { label: 'Çizim poster', bestFor: 'Güzellik, moda', oneLine: 'Ürünün çizim bir postere dönüşür.' },
    graffiti_ad: { label: 'Grafiti duvarı', bestFor: 'Sokak markaları, atıştırmalık, giyim', oneLine: 'Ürünün bir grafiti duvarına çizilir.' },
    dreamlike_cloud: { label: 'Rüya bulutları', bestFor: 'Parfüm, kozmetik, premium', oneLine: 'Ürünün yumuşak bulutların arasında süzülür.' },
    parachute_delivery: { label: 'Paraşütle teslimat', bestFor: 'Online mağazalar, lansmanlar, atıştırmalık', oneLine: 'Ürünün gökyüzünden paraşütle iner.' },
    shoal_surround: { label: 'Balık sürüsü', bestFor: 'Parfüm, içecek, deniz ferahlığı', oneLine: 'Bir balık sürüsü ürününün etrafında döner.' },
    dishes_served: { label: 'Servis edilen yemek', bestFor: 'Yemek ve atıştırmalık', oneLine: 'Yemeğin servis edilir ve insanlar keyifle yer.' },
  },
  ru: {
    naked_eye_3d_ad: { label: '3D-билборд', bestFor: 'Любой продукт, премиум', oneLine: 'Ваш продукт выпрыгивает из огромного 3D-экрана.' },
    beach_ad: { label: 'На пляже', bestFor: 'Парфюм, напитки, летние товары', oneLine: 'Ваш продукт на солнечном пляже, с морем и песком.' },
    lighting_ad: { label: 'Студийный свет', bestFor: 'Техника, премиальные товары', oneLine: 'Премиальный студийный свет скользит по продукту.' },
    supermarket_ad: { label: 'Полка супермаркета', bestFor: 'Упакованные еда и напитки', oneLine: 'Ваш продукт сияет на полке супермаркета.' },
    poster_ad: { label: 'Рисованный постер', bestFor: 'Красота, мода', oneLine: 'Ваш продукт превращается в рисованный постер.' },
    graffiti_ad: { label: 'Стена с граффити', bestFor: 'Уличные бренды, снеки, одежда', oneLine: 'Ваш продукт нарисован на стене с граффити.' },
    dreamlike_cloud: { label: 'Облака мечты', bestFor: 'Парфюм, косметика, премиум', oneLine: 'Ваш продукт парит среди мягких облаков.' },
    parachute_delivery: { label: 'Доставка на парашюте', bestFor: 'Онлайн-магазины, запуски, снеки', oneLine: 'Ваш продукт спускается с неба на парашюте.' },
    shoal_surround: { label: 'Косяк рыб', bestFor: 'Парфюм, напитки, морская свежесть', oneLine: 'Косяк рыб кружит вокруг вашего продукта.' },
    dishes_served: { label: 'Блюдо подано', bestFor: 'Еда и снеки', oneLine: 'Ваше блюдо подают, и люди наслаждаются.' },
  },
  uk: {
    naked_eye_3d_ad: { label: '3D-білборд', bestFor: 'Будь-який продукт, преміум', oneLine: 'Ваш продукт вистрибує з величезного 3D-екрана.' },
    beach_ad: { label: 'На пляжі', bestFor: 'Парфуми, напої, літні товари', oneLine: 'Ваш продукт на сонячному пляжі, з морем і піском.' },
    lighting_ad: { label: 'Студійне світло', bestFor: 'Техніка, преміальні товари', oneLine: 'Преміальне студійне світло ковзає по продукту.' },
    supermarket_ad: { label: 'Полиця супермаркету', bestFor: 'Упаковані їжа й напої', oneLine: 'Ваш продукт сяє на полиці супермаркету.' },
    poster_ad: { label: 'Мальований постер', bestFor: 'Краса, мода', oneLine: 'Ваш продукт перетворюється на мальований постер.' },
    graffiti_ad: { label: 'Стіна з графіті', bestFor: 'Вуличні бренди, снеки, одяг', oneLine: 'Ваш продукт намальований на стіні з графіті.' },
    dreamlike_cloud: { label: 'Хмари мрії', bestFor: 'Парфуми, косметика, преміум', oneLine: 'Ваш продукт ширяє серед м’яких хмар.' },
    parachute_delivery: { label: 'Доставка на парашуті', bestFor: 'Онлайн-магазини, запуски, снеки', oneLine: 'Ваш продукт спускається з неба на парашуті.' },
    shoal_surround: { label: 'Косяк риб', bestFor: 'Парфуми, напої, морська свіжість', oneLine: 'Косяк риб кружляє довкола вашого продукту.' },
    dishes_served: { label: 'Страву подано', bestFor: 'Їжа та снеки', oneLine: 'Вашу страву подають, і люди насолоджуються.' },
  },
  ar: {
    naked_eye_3d_ad: { label: 'لوحة ثلاثية الأبعاد', bestFor: 'أي منتج، فاخر', oneLine: 'منتجك يقفز من شاشة ثلاثية الأبعاد عملاقة.' },
    beach_ad: { label: 'على الشاطئ', bestFor: 'عطور، مشروبات، منتجات الصيف', oneLine: 'منتجك على شاطئ مشمس مع البحر والرمل.' },
    lighting_ad: { label: 'إضاءة استوديو', bestFor: 'تقنية، منتجات فاخرة', oneLine: 'ضوء استوديو فاخر يمرّ على منتجك.' },
    supermarket_ad: { label: 'رف السوبرماركت', bestFor: 'أطعمة ومشروبات معبأة', oneLine: 'منتجك يلمع على رف السوبرماركت.' },
    poster_ad: { label: 'ملصق مرسوم', bestFor: 'تجميل، أزياء', oneLine: 'منتجك يتحول إلى ملصق مرسوم.' },
    graffiti_ad: { label: 'جدار غرافيتي', bestFor: 'علامات الشارع، وجبات خفيفة، ملابس', oneLine: 'منتجك مرسوم على جدار غرافيتي.' },
    dreamlike_cloud: { label: 'غيوم حالمة', bestFor: 'عطور، مستحضرات تجميل، فاخر', oneLine: 'منتجك يطفو بين غيوم ناعمة.' },
    parachute_delivery: { label: 'توصيل بالمظلة', bestFor: 'متاجر إلكترونية، إطلاقات، وجبات خفيفة', oneLine: 'منتجك يهبط من السماء بمظلة.' },
    shoal_surround: { label: 'سرب أسماك', bestFor: 'عطور، مشروبات، انتعاش البحر', oneLine: 'سرب من الأسماك يدور حول منتجك.' },
    dishes_served: { label: 'طبق يُقدَّم', bestFor: 'طعام ووجبات خفيفة', oneLine: 'يُقدَّم طعامك ويستمتع به الناس.' },
  },
  ur: {
    naked_eye_3d_ad: { label: '3D بل بورڈ', bestFor: 'کوئی بھی پروڈکٹ، پریمیم', oneLine: 'آپ کی پروڈکٹ بڑی 3D اسکرین سے باہر نکلتی ہے۔' },
    beach_ad: { label: 'ساحل پر', bestFor: 'پرفیوم، مشروبات، گرمیوں کی چیزیں', oneLine: 'آپ کی پروڈکٹ دھوپ والے ساحل پر، سمندر اور ریت کے ساتھ۔' },
    lighting_ad: { label: 'اسٹوڈیو لائٹ', bestFor: 'ٹیک، پریمیم پروڈکٹس', oneLine: 'پریمیم اسٹوڈیو روشنی آپ کی پروڈکٹ پر سے گزرتی ہے۔' },
    supermarket_ad: { label: 'سپر مارکیٹ شیلف', bestFor: 'پیک شدہ کھانا اور مشروبات', oneLine: 'آپ کی پروڈکٹ سپر مارکیٹ کے شیلف پر چمکتی ہے۔' },
    poster_ad: { label: 'تصویری پوسٹر', bestFor: 'بیوٹی، فیشن', oneLine: 'آپ کی پروڈکٹ ایک تصویری پوسٹر بن جاتی ہے۔' },
    graffiti_ad: { label: 'گرافٹی دیوار', bestFor: 'اسٹریٹ برانڈز، اسنیکس، کپڑے', oneLine: 'آپ کی پروڈکٹ گرافٹی دیوار پر پینٹ کی گئی۔' },
    dreamlike_cloud: { label: 'خوابناک بادل', bestFor: 'پرفیوم، کاسمیٹکس، پریمیم', oneLine: 'آپ کی پروڈکٹ نرم بادلوں میں تیرتی ہے۔' },
    parachute_delivery: { label: 'پیراشوٹ ڈیلیوری', bestFor: 'آن لائن دکانیں، لانچ، اسنیکس', oneLine: 'آپ کی پروڈکٹ پیراشوٹ سے آسمان سے اترتی ہے۔' },
    shoal_surround: { label: 'مچھلیوں کا غول', bestFor: 'پرفیوم، مشروبات، سمندری تازگی', oneLine: 'مچھلیوں کا غول آپ کی پروڈکٹ کے گرد گھومتا ہے۔' },
    dishes_served: { label: 'کھانا پیش', bestFor: 'کھانا اور اسنیکس', oneLine: 'آپ کا کھانا پیش ہوتا ہے اور لوگ مزے لیتے ہیں۔' },
  },
  hi: {
    naked_eye_3d_ad: { label: '3D बिलबोर्ड', bestFor: 'कोई भी प्रोडक्ट, प्रीमियम', oneLine: 'आपका प्रोडक्ट विशाल 3D स्क्रीन से बाहर आता है।' },
    beach_ad: { label: 'बीच पर', bestFor: 'परफ़्यूम, ड्रिंक, गर्मियों के प्रोडक्ट', oneLine: 'आपका प्रोडक्ट धूप वाले बीच पर, समुद्र और रेत के साथ।' },
    lighting_ad: { label: 'स्टूडियो लाइट', bestFor: 'टेक, प्रीमियम प्रोडक्ट', oneLine: 'प्रीमियम स्टूडियो रोशनी आपके प्रोडक्ट पर से गुज़रती है।' },
    supermarket_ad: { label: 'सुपरमार्केट शेल्फ़', bestFor: 'पैक्ड खाना और ड्रिंक', oneLine: 'आपका प्रोडक्ट सुपरमार्केट की शेल्फ़ पर चमकता है।' },
    poster_ad: { label: 'चित्रित पोस्टर', bestFor: 'ब्यूटी, फ़ैशन', oneLine: 'आपका प्रोडक्ट एक चित्रित पोस्टर बन जाता है।' },
    graffiti_ad: { label: 'ग्रैफ़िटी दीवार', bestFor: 'स्ट्रीट ब्रांड, स्नैक्स, कपड़े', oneLine: 'आपका प्रोडक्ट ग्रैफ़िटी दीवार पर पेंट किया गया।' },
    dreamlike_cloud: { label: 'सपनों जैसे बादल', bestFor: 'परफ़्यूम, कॉस्मेटिक्स, प्रीमियम', oneLine: 'आपका प्रोडक्ट मुलायम बादलों में तैरता है।' },
    parachute_delivery: { label: 'पैराशूट डिलीवरी', bestFor: 'ऑनलाइन दुकानें, लॉन्च, स्नैक्स', oneLine: 'आपका प्रोडक्ट पैराशूट से आसमान से उतरता है।' },
    shoal_surround: { label: 'मछलियों का झुंड', bestFor: 'परफ़्यूम, ड्रिंक, समुद्री ताज़गी', oneLine: 'मछलियों का झुंड आपके प्रोडक्ट के चारों ओर घूमता है।' },
    dishes_served: { label: 'परोसा गया खाना', bestFor: 'खाना और स्नैक्स', oneLine: 'आपका खाना परोसा जाता है और लोग मज़ा लेते हैं।' },
  },
  id: {
    naked_eye_3d_ad: { label: 'Billboard 3D', bestFor: 'Produk apa pun, premium', oneLine: 'Produkmu muncul dari layar 3D raksasa.' },
    beach_ad: { label: 'Di pantai', bestFor: 'Parfum, minuman, produk musim panas', oneLine: 'Produkmu di pantai yang cerah, dengan laut dan pasir.' },
    lighting_ad: { label: 'Cahaya studio', bestFor: 'Teknologi, produk premium', oneLine: 'Cahaya studio premium menyapu produkmu.' },
    supermarket_ad: { label: 'Rak supermarket', bestFor: 'Makanan dan minuman kemasan', oneLine: 'Produkmu bersinar di rak supermarket.' },
    poster_ad: { label: 'Poster ilustrasi', bestFor: 'Kecantikan, fesyen', oneLine: 'Produkmu berubah menjadi poster ilustrasi.' },
    graffiti_ad: { label: 'Dinding grafiti', bestFor: 'Merek jalanan, camilan, pakaian', oneLine: 'Produkmu dilukis di dinding grafiti.' },
    dreamlike_cloud: { label: 'Awan impian', bestFor: 'Parfum, kosmetik, premium', oneLine: 'Produkmu melayang di antara awan lembut.' },
    parachute_delivery: { label: 'Kiriman parasut', bestFor: 'Toko online, peluncuran, camilan', oneLine: 'Produkmu turun dari langit dengan parasut.' },
    shoal_surround: { label: 'Kawanan ikan', bestFor: 'Parfum, minuman, kesegaran laut', oneLine: 'Kawanan ikan berputar di sekitar produkmu.' },
    dishes_served: { label: 'Hidangan disajikan', bestFor: 'Makanan dan camilan', oneLine: 'Makananmu disajikan dan dinikmati orang.' },
  },
  vi: {
    naked_eye_3d_ad: { label: 'Bảng quảng cáo 3D', bestFor: 'Mọi sản phẩm, cao cấp', oneLine: 'Sản phẩm của bạn bật ra từ màn hình 3D khổng lồ.' },
    beach_ad: { label: 'Trên bãi biển', bestFor: 'Nước hoa, đồ uống, sản phẩm mùa hè', oneLine: 'Sản phẩm của bạn trên bãi biển nắng, có biển và cát.' },
    lighting_ad: { label: 'Ánh sáng studio', bestFor: 'Công nghệ, sản phẩm cao cấp', oneLine: 'Ánh sáng studio cao cấp lướt qua sản phẩm.' },
    supermarket_ad: { label: 'Kệ siêu thị', bestFor: 'Đồ ăn và đồ uống đóng gói', oneLine: 'Sản phẩm của bạn nổi bật trên kệ siêu thị.' },
    poster_ad: { label: 'Áp phích minh họa', bestFor: 'Làm đẹp, thời trang', oneLine: 'Sản phẩm của bạn thành một áp phích minh họa.' },
    graffiti_ad: { label: 'Tường graffiti', bestFor: 'Thương hiệu đường phố, đồ ăn vặt, quần áo', oneLine: 'Sản phẩm của bạn được vẽ trên tường graffiti.' },
    dreamlike_cloud: { label: 'Mây mơ mộng', bestFor: 'Nước hoa, mỹ phẩm, cao cấp', oneLine: 'Sản phẩm của bạn lơ lửng giữa những đám mây.' },
    parachute_delivery: { label: 'Giao bằng dù', bestFor: 'Shop online, ra mắt, đồ ăn vặt', oneLine: 'Sản phẩm của bạn đáp xuống từ trời bằng dù.' },
    shoal_surround: { label: 'Đàn cá', bestFor: 'Nước hoa, đồ uống, sự tươi mát của biển', oneLine: 'Một đàn cá bơi quanh sản phẩm của bạn.' },
    dishes_served: { label: 'Món ăn được dọn', bestFor: 'Đồ ăn và đồ ăn vặt', oneLine: 'Món ăn được dọn ra và mọi người thưởng thức.' },
  },
}

/**
 * KINEO-ADS-UX-MARCA-2026-10-10 — a tabela final das 16 línguas: as frases de antes (BASE_STYLE_COPY, intactas) + a frase
 * de cada um dos 5 estilos de antes + os 10 estilos novos. Uma língua só = uma linha de cada fonte; nada cai no inglês.
 */
export const ADS_V2_STYLE_COPY: Record<InterfaceLanguage, AdsV2StyleCopy> = Object.fromEntries(
  (Object.keys(BASE_STYLE_COPY) as InterfaceLanguage[]).map((l) => {
    const base = BASE_STYLE_COPY[l]
    const styles = {} as Record<AdsV2StyleKey, L3>
    for (const k of Object.keys(base.styles) as AdsV2BaseStyleKey[]) styles[k] = { ...base.styles[k], oneLine: BASE_ONE_LINES[l][k] }
    for (const k of Object.keys(NEW_STYLE_COPY[l]) as AdsV2NewStyleKey[]) styles[k] = NEW_STYLE_COPY[l][k]
    return [l, { ...base, styles }]
  }),
) as Record<InterfaceLanguage, AdsV2StyleCopy>

/** Frases da escolha de estilo na língua da interface (língua desconhecida = inglês). */
export function adsV2StyleCopy(language: InterfaceLanguage | string | null | undefined): AdsV2StyleCopy {
  return (typeof language === 'string' && (ADS_V2_STYLE_COPY as Record<string, AdsV2StyleCopy>)[language]) || ADS_V2_STYLE_COPY.en
}
