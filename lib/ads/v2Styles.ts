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

export type AdsV2StyleKey = 'package_explosion' | 'giant_product' | 'product_closeup' | 'ocean_ad' | 'mechanical_assembly'
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
]

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
  styles: Record<AdsV2StyleKey, { label: string; bestFor: string }>
}

export const ADS_V2_STYLE_COPY: Record<InterfaceLanguage, AdsV2StyleCopy> = {
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

/** Frases da escolha de estilo na língua da interface (língua desconhecida = inglês). */
export function adsV2StyleCopy(language: InterfaceLanguage | string | null | undefined): AdsV2StyleCopy {
  return (typeof language === 'string' && (ADS_V2_STYLE_COPY as Record<string, AdsV2StyleCopy>)[language]) || ADS_V2_STYLE_COPY.en
}
