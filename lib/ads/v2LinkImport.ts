// KINEO-ADS-1FOTO-LINK-2026-10-10 — "Or paste your product link" do MODO SIMPLES do /ads/v2 (fundador, 10/10: "tudo sim").
//
// POR QUÊ: a /business e os anúncios pagos da Microsoft prometem "Turn ONE product photo into a ready video ad" e "Paste a
// link, get an ad". O modo simples pedia 3 fotos e não tinha campo de link (só o modo completo tinha, e só lia TEXTO). Agora
// 1 foto basta (lib/ads/v2ShotLists.ts ADS_V2_MIN_PHOTOS) e o link traz até 3 fotos do produto + os dados da página.
//
// Este módulo é PURO (só import type; vai ao cliente): os números da importação, a checagem do tipo pelos BYTES, a frase
// sugerida a partir da página e as frases da tela nas 16 línguas da interface. A escolha das imagens candidatas mora no
// leitor puro (lib/ads/linkReader.ts productImageCandidates), a rede em lib/ads/v2Link.ts (adsV2LinkImport) e a rota em
// app/api/ads/v2/link-import/route.ts.
//
// REGRA QUE NÃO MUDA: link sem foto NUNCA cria pedido. A rota só lê a página e guarda as fotos no user_footage do dono;
// o rascunho/plano continua exigindo pelo menos 1 foto (ADS_V2_CONTRACT_MIN_PHOTOS no /plan, ADS_V2_SIMPLE_MIN_IN_AD na tela).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** Quantas fotos o link traz, no máximo (o resto a pessoa adiciona). */
export const ADS_V2_LINK_IMPORT_MAX_IMAGES = 3
/** Quantas candidatas a rota tenta baixar para chegar às 3 (imagem quebrada, pequena ou WebP fica de fora). */
export const ADS_V2_LINK_IMPORT_MAX_TRIES = 6
/** Teto por imagem baixada (bytes). Acima disto o download é abortado no meio e a imagem é pulada. */
export const ADS_V2_LINK_IMAGE_MAX_BYTES = 6 * 1024 * 1024
/** Abaixo disto é ícone/pixel/miniatura, não foto de produto. */
export const ADS_V2_LINK_IMAGE_MIN_BYTES = 2000
/** Tempo de cada pedido à rede (página ou imagem). */
export const ADS_V2_LINK_FETCH_TIMEOUT_MS = 8000
/**
 * Teto diário de leituras de link por conta. O evento é o MESMO do v1 (ads_link_read, app/api/ads/from-link): as duas
 * portas dividem um teto só. Conta paga: 20/dia (o do v1). Amostra grátis: 5/dia (a amostra é uma só; 5 links bastam).
 */
export const ADS_V2_LINK_EVENT = 'ads_link_read'
export const ADS_V2_LINK_DAILY_CAP = 20
export const ADS_V2_LINK_SAMPLE_DAILY_CAP = 5
export function adsV2LinkDailyCap(sample: boolean): number {
  return sample === true ? ADS_V2_LINK_SAMPLE_DAILY_CAP : ADS_V2_LINK_DAILY_CAP
}

/** JPG ou PNG pelos PRIMEIROS BYTES (nunca pelo cabeçalho do site). WebP/GIF/HTML = null. */
export function adsV2ImageExt(b: Uint8Array | null | undefined): 'jpg' | 'png' | null {
  // Sem instanceof: o corpo pode vir de outro "realm" (o fetch do Node), e lá Uint8Array é outra classe.
  if (!b || typeof b !== 'object' || typeof (b as { length?: unknown }).length !== 'number') return null
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  return null
}

/** Teto da frase sugerida (a frase do modo simples aceita 400; a sugestão fica curta para a pessoa ajustar). */
export const ADS_V2_LINK_PREFILL_MAX = 160

/**
 * A frase "o que você vende" sugerida pela página, quando a pessoa ainda não escreveu nada: o nome do produto (título da
 * página/JSON-LD) e a marca (og:site_name) quando o título não a cita; sem título, a marca; sem nada, o domínio. Só o que a
 * página DIZ. Corta em fronteira de palavra. Pura.
 */
export function adsV2LinkPrefill(f: { title?: unknown; siteName?: unknown; host?: unknown }): string {
  const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
  const title = clean(f.title)
  const site = clean(f.siteName)
  const host = clean(f.host)
  let s = title && site && !title.toLowerCase().includes(site.toLowerCase()) ? `${title} — ${site}` : title || site || host
  if (s.length > ADS_V2_LINK_PREFILL_MAX) {
    const cut = s.slice(0, ADS_V2_LINK_PREFILL_MAX)
    const sp = cut.lastIndexOf(' ')
    s = (sp > 40 ? cut.slice(0, sp) : cut).replace(/[\s—–|,;:-]+$/u, '').trim()
  }
  return s
}

// ─── as frases da tela, nas 16 línguas da interface (nenhuma cai no inglês) ─────────────────────────────────────────
export interface AdsV2LinkImportCopy {
  /** a linha de cima da seção de arquivos (substitui "Send 3 to 7…") */
  lead: string
  /** o que falta para planejar sem nenhuma foto ({min}, {max}) */
  needPhoto: string
  /** rótulo do campo do link */
  linkLabel: string
  /** a linha embaixo do rótulo */
  linkHint: string
  linkPlaceholder: string
  linkButton: string
  linkReading: string
  /** fotos trazidas ({n}, {host}) */
  linkGot: string
  /** a página abriu mas não deu foto: a frase pedida pelo fundador */
  linkNoPhotos: string
  linkInvalid: string
  linkUnreachable: string
  linkLimit: string
  linkFailed: string
}

export const ADS_V2_LINK_IMPORT_COPY: Record<InterfaceLanguage, AdsV2LinkImportCopy> = {
  en: {
    lead: 'Send 1 to 7 photos or videos — your product photo first. Up to 2 videos go into the ad as video.',
    needPhoto: 'Add at least {min} photo ({min} to {max} in the ad).',
    linkLabel: 'Or paste your product link',
    linkHint: 'We take up to 3 photos and the product details from the page. Only use a page you have the right to use.',
    linkPlaceholder: 'https://your-shop.com/product',
    linkButton: 'Get photos',
    linkReading: 'Reading the page…',
    linkGot: 'Photos added from {host}: {n}. Check the framing of each one.',
    linkNoPhotos: "We couldn't get photos from that page — add at least one photo.",
    linkInvalid: 'Paste a public link, like https://your-shop.com/product.',
    linkUnreachable: 'We could not open that page (it may block automatic reading). Add your photos instead.',
    linkLimit: 'You have read many links today. Add your photos instead, or try again tomorrow.',
    linkFailed: 'We could not read that page right now. Add your photos instead.',
  },
  pt: {
    lead: 'Envie de 1 a 7 fotos ou vídeos — a foto do produto primeiro. Até 2 vídeos entram no anúncio como vídeo.',
    needPhoto: 'Adicione pelo menos {min} foto ({min} a {max} no anúncio).',
    linkLabel: 'Ou cole o link do seu produto',
    linkHint: 'Pegamos até 3 fotos e os dados do produto na página. Use só uma página que você tem direito de usar.',
    linkPlaceholder: 'https://sua-loja.com/produto',
    linkButton: 'Pegar fotos',
    linkReading: 'Lendo a página…',
    linkGot: 'Fotos adicionadas de {host}: {n}. Confira o enquadramento de cada uma.',
    linkNoPhotos: 'Não conseguimos pegar fotos dessa página — adicione pelo menos uma foto.',
    linkInvalid: 'Cole um link público, como https://sua-loja.com/produto.',
    linkUnreachable: 'Não conseguimos abrir essa página (ela pode bloquear leitura automática). Adicione suas fotos.',
    linkLimit: 'Você já leu muitos links hoje. Adicione suas fotos ou tente de novo amanhã.',
    linkFailed: 'Não conseguimos ler essa página agora. Adicione suas fotos.',
  },
  es: {
    lead: 'Envía de 1 a 7 fotos o videos — la foto del producto primero. Hasta 2 videos entran en el anuncio como video.',
    needPhoto: 'Agrega al menos {min} foto ({min} a {max} en el anuncio).',
    linkLabel: 'O pega el enlace de tu producto',
    linkHint: 'Tomamos hasta 3 fotos y los datos del producto de la página. Usa solo una página que tengas derecho a usar.',
    linkPlaceholder: 'https://tu-tienda.com/producto',
    linkButton: 'Traer fotos',
    linkReading: 'Leyendo la página…',
    linkGot: 'Fotos agregadas de {host}: {n}. Revisa el encuadre de cada una.',
    linkNoPhotos: 'No pudimos obtener fotos de esa página — agrega al menos una foto.',
    linkInvalid: 'Pega un enlace público, como https://tu-tienda.com/producto.',
    linkUnreachable: 'No pudimos abrir esa página (puede bloquear la lectura automática). Agrega tus fotos.',
    linkLimit: 'Hoy ya leíste muchos enlaces. Agrega tus fotos o inténtalo mañana.',
    linkFailed: 'No pudimos leer esa página ahora. Agrega tus fotos.',
  },
  fr: {
    lead: 'Envoyez de 1 à 7 photos ou vidéos — la photo du produit en premier. Jusqu’à 2 vidéos entrent dans la pub en tant que vidéo.',
    needPhoto: 'Ajoutez au moins {min} photo ({min} à {max} dans la pub).',
    linkLabel: 'Ou collez le lien de votre produit',
    linkHint: 'Nous prenons jusqu’à 3 photos et les infos du produit sur la page. N’utilisez qu’une page que vous avez le droit d’utiliser.',
    linkPlaceholder: 'https://votre-boutique.com/produit',
    linkButton: 'Récupérer les photos',
    linkReading: 'Lecture de la page…',
    linkGot: 'Photos ajoutées depuis {host} : {n}. Vérifiez le cadrage de chacune.',
    linkNoPhotos: 'Impossible de récupérer des photos sur cette page — ajoutez au moins une photo.',
    linkInvalid: 'Collez un lien public, comme https://votre-boutique.com/produit.',
    linkUnreachable: 'Impossible d’ouvrir cette page (elle bloque peut-être la lecture automatique). Ajoutez vos photos.',
    linkLimit: 'Vous avez lu beaucoup de liens aujourd’hui. Ajoutez vos photos ou réessayez demain.',
    linkFailed: 'Impossible de lire cette page pour le moment. Ajoutez vos photos.',
  },
  de: {
    lead: 'Sende 1 bis 7 Fotos oder Videos — das Produktfoto zuerst. Bis zu 2 Videos kommen als Video in die Anzeige.',
    needPhoto: 'Füge mindestens {min} Foto hinzu ({min} bis {max} in der Anzeige).',
    linkLabel: 'Oder füge den Link zu deinem Produkt ein',
    linkHint: 'Wir übernehmen bis zu 3 Fotos und die Produktangaben von der Seite. Nutze nur eine Seite, die du verwenden darfst.',
    linkPlaceholder: 'https://dein-shop.de/produkt',
    linkButton: 'Fotos holen',
    linkReading: 'Seite wird gelesen…',
    linkGot: 'Fotos von {host} hinzugefügt: {n}. Prüfe bei jedem den Bildausschnitt.',
    linkNoPhotos: 'Wir konnten von dieser Seite keine Fotos holen — füge mindestens ein Foto hinzu.',
    linkInvalid: 'Füge einen öffentlichen Link ein, z. B. https://dein-shop.de/produkt.',
    linkUnreachable: 'Wir konnten diese Seite nicht öffnen (sie blockiert vielleicht automatisches Lesen). Füge deine Fotos hinzu.',
    linkLimit: 'Du hast heute schon viele Links gelesen. Füge deine Fotos hinzu oder versuche es morgen.',
    linkFailed: 'Wir konnten diese Seite gerade nicht lesen. Füge deine Fotos hinzu.',
  },
  it: {
    lead: 'Invia da 1 a 7 foto o video — prima la foto del prodotto. Fino a 2 video entrano nell’annuncio come video.',
    needPhoto: 'Aggiungi almeno {min} foto (da {min} a {max} nell’annuncio).',
    linkLabel: 'Oppure incolla il link del tuo prodotto',
    linkHint: 'Prendiamo fino a 3 foto e i dati del prodotto dalla pagina. Usa solo una pagina che hai il diritto di usare.',
    linkPlaceholder: 'https://il-tuo-negozio.it/prodotto',
    linkButton: 'Prendi le foto',
    linkReading: 'Lettura della pagina…',
    linkGot: 'Foto aggiunte da {host}: {n}. Controlla l’inquadratura di ognuna.',
    linkNoPhotos: 'Non siamo riusciti a prendere foto da quella pagina — aggiungi almeno una foto.',
    linkInvalid: 'Incolla un link pubblico, come https://il-tuo-negozio.it/prodotto.',
    linkUnreachable: 'Non siamo riusciti ad aprire quella pagina (potrebbe bloccare la lettura automatica). Aggiungi le tue foto.',
    linkLimit: 'Oggi hai già letto molti link. Aggiungi le tue foto o riprova domani.',
    linkFailed: 'Non siamo riusciti a leggere quella pagina ora. Aggiungi le tue foto.',
  },
  nl: {
    lead: 'Stuur 1 tot 7 foto’s of video’s — de productfoto eerst. Maximaal 2 video’s gaan als video in de advertentie.',
    needPhoto: 'Voeg minstens {min} foto toe ({min} tot {max} in de advertentie).',
    linkLabel: 'Of plak de link naar je product',
    linkHint: 'We nemen tot 3 foto’s en de productgegevens van de pagina over. Gebruik alleen een pagina die je mag gebruiken.',
    linkPlaceholder: 'https://jouw-winkel.nl/product',
    linkButton: 'Foto’s ophalen',
    linkReading: 'Pagina wordt gelezen…',
    linkGot: 'Foto’s toegevoegd van {host}: {n}. Controleer bij elke foto de uitsnede.',
    linkNoPhotos: 'We konden geen foto’s van die pagina halen — voeg minstens één foto toe.',
    linkInvalid: 'Plak een openbare link, zoals https://jouw-winkel.nl/product.',
    linkUnreachable: 'We konden die pagina niet openen (misschien blokkeert ze automatisch lezen). Voeg je foto’s toe.',
    linkLimit: 'Je hebt vandaag al veel links gelezen. Voeg je foto’s toe of probeer het morgen.',
    linkFailed: 'We konden die pagina nu niet lezen. Voeg je foto’s toe.',
  },
  pl: {
    lead: 'Wyślij od 1 do 7 zdjęć lub filmów — najpierw zdjęcie produktu. Do 2 filmów trafia do reklamy jako film.',
    needPhoto: 'Dodaj co najmniej {min} zdjęcie (od {min} do {max} w reklamie).',
    linkLabel: 'Albo wklej link do swojego produktu',
    linkHint: 'Pobierzemy ze strony do 3 zdjęć i dane produktu. Używaj tylko strony, do której masz prawa.',
    linkPlaceholder: 'https://twoj-sklep.pl/produkt',
    linkButton: 'Pobierz zdjęcia',
    linkReading: 'Czytamy stronę…',
    linkGot: 'Dodano zdjęcia z {host}: {n}. Sprawdź kadr każdego z nich.',
    linkNoPhotos: 'Nie udało się pobrać zdjęć z tej strony — dodaj co najmniej jedno zdjęcie.',
    linkInvalid: 'Wklej publiczny link, np. https://twoj-sklep.pl/produkt.',
    linkUnreachable: 'Nie udało się otworzyć tej strony (może blokować automatyczne czytanie). Dodaj swoje zdjęcia.',
    linkLimit: 'Dziś przeczytano już wiele linków. Dodaj swoje zdjęcia albo spróbuj jutro.',
    linkFailed: 'Nie udało się teraz przeczytać tej strony. Dodaj swoje zdjęcia.',
  },
  tr: {
    lead: '1 ile 7 arası fotoğraf veya video gönder — önce ürün fotoğrafı. En fazla 2 video reklama video olarak girer.',
    needPhoto: 'En az {min} fotoğraf ekle (reklamda {min} ile {max} arası).',
    linkLabel: 'Ya da ürün bağlantını yapıştır',
    linkHint: 'Sayfadan en fazla 3 fotoğraf ve ürün bilgilerini alırız. Yalnızca kullanma hakkın olan bir sayfa kullan.',
    linkPlaceholder: 'https://magazan.com/urun',
    linkButton: 'Fotoğrafları al',
    linkReading: 'Sayfa okunuyor…',
    linkGot: '{host} adresinden eklenen fotoğraflar: {n}. Her birinin kadrajını kontrol et.',
    linkNoPhotos: 'O sayfadan fotoğraf alamadık — en az bir fotoğraf ekle.',
    linkInvalid: 'https://magazan.com/urun gibi herkese açık bir bağlantı yapıştır.',
    linkUnreachable: 'O sayfayı açamadık (otomatik okumayı engelliyor olabilir). Fotoğraflarını ekle.',
    linkLimit: 'Bugün çok sayıda bağlantı okudun. Fotoğraflarını ekle ya da yarın tekrar dene.',
    linkFailed: 'O sayfayı şu anda okuyamadık. Fotoğraflarını ekle.',
  },
  ru: {
    lead: 'Отправьте от 1 до 7 фото или видео — сначала фото товара. До 2 видео войдут в рекламу как видео.',
    needPhoto: 'Добавьте хотя бы {min} фото (от {min} до {max} в рекламе).',
    linkLabel: 'Или вставьте ссылку на товар',
    linkHint: 'Мы возьмём со страницы до 3 фото и данные о товаре. Используйте только страницу, на которую у вас есть права.',
    linkPlaceholder: 'https://vash-magazin.ru/tovar',
    linkButton: 'Взять фото',
    linkReading: 'Читаем страницу…',
    linkGot: 'Добавлено фото с {host}: {n}. Проверьте кадр каждого.',
    linkNoPhotos: 'Не удалось взять фото с этой страницы — добавьте хотя бы одно фото.',
    linkInvalid: 'Вставьте публичную ссылку, например https://vash-magazin.ru/tovar.',
    linkUnreachable: 'Не удалось открыть эту страницу (возможно, она блокирует автоматическое чтение). Добавьте свои фото.',
    linkLimit: 'Сегодня вы уже прочитали много ссылок. Добавьте свои фото или попробуйте завтра.',
    linkFailed: 'Сейчас не удалось прочитать эту страницу. Добавьте свои фото.',
  },
  uk: {
    lead: 'Надішліть від 1 до 7 фото або відео — спершу фото товару. До 2 відео увійдуть у рекламу як відео.',
    needPhoto: 'Додайте щонайменше {min} фото (від {min} до {max} у рекламі).',
    linkLabel: 'Або вставте посилання на товар',
    linkHint: 'Ми візьмемо зі сторінки до 3 фото та дані про товар. Використовуйте лише сторінку, на яку маєте права.',
    linkPlaceholder: 'https://vash-magazyn.ua/tovar',
    linkButton: 'Взяти фото',
    linkReading: 'Читаємо сторінку…',
    linkGot: 'Додано фото з {host}: {n}. Перевірте кадр кожного.',
    linkNoPhotos: 'Не вдалося взяти фото з цієї сторінки — додайте щонайменше одне фото.',
    linkInvalid: 'Вставте публічне посилання, наприклад https://vash-magazyn.ua/tovar.',
    linkUnreachable: 'Не вдалося відкрити цю сторінку (можливо, вона блокує автоматичне читання). Додайте свої фото.',
    linkLimit: 'Сьогодні ви вже прочитали багато посилань. Додайте свої фото або спробуйте завтра.',
    linkFailed: 'Зараз не вдалося прочитати цю сторінку. Додайте свої фото.',
  },
  ar: {
    lead: 'أرسل من 1 إلى 7 صور أو فيديوهات — صورة المنتج أولًا. يدخل حتى فيديوهين في الإعلان كفيديو.',
    needPhoto: 'أضف {min} صورة على الأقل (من {min} إلى {max} في الإعلان).',
    linkLabel: 'أو الصق رابط منتجك',
    linkHint: 'نأخذ من الصفحة حتى 3 صور وبيانات المنتج. استخدم فقط صفحة يحق لك استخدامها.',
    linkPlaceholder: 'https://your-shop.com/product',
    linkButton: 'جلب الصور',
    linkReading: 'جارٍ قراءة الصفحة…',
    linkGot: 'الصور المضافة من {host}: {n}. راجع تأطير كل صورة.',
    linkNoPhotos: 'لم نتمكن من جلب صور من تلك الصفحة — أضف صورة واحدة على الأقل.',
    linkInvalid: 'الصق رابطًا عامًا، مثل https://your-shop.com/product.',
    linkUnreachable: 'لم نتمكن من فتح تلك الصفحة (قد تمنع القراءة التلقائية). أضف صورك.',
    linkLimit: 'قرأت روابط كثيرة اليوم. أضف صورك أو حاول غدًا.',
    linkFailed: 'تعذّرت قراءة تلك الصفحة الآن. أضف صورك.',
  },
  ur: {
    lead: '1 سے 7 تصاویر یا ویڈیوز بھیجیں — پہلے پروڈکٹ کی تصویر۔ زیادہ سے زیادہ 2 ویڈیوز اشتہار میں ویڈیو کے طور پر جاتی ہیں۔',
    needPhoto: 'کم از کم {min} تصویر شامل کریں (اشتہار میں {min} سے {max})۔',
    linkLabel: 'یا اپنی پروڈکٹ کا لنک پیسٹ کریں',
    linkHint: 'ہم صفحے سے زیادہ سے زیادہ 3 تصاویر اور پروڈکٹ کی تفصیلات لیتے ہیں۔ صرف وہ صفحہ استعمال کریں جسے استعمال کرنے کا آپ کو حق ہو۔',
    linkPlaceholder: 'https://your-shop.com/product',
    linkButton: 'تصاویر لیں',
    linkReading: 'صفحہ پڑھا جا رہا ہے…',
    linkGot: '{host} سے شامل کی گئی تصاویر: {n}۔ ہر ایک کی فریمنگ چیک کریں۔',
    linkNoPhotos: 'ہم اس صفحے سے تصاویر نہیں لے سکے — کم از کم ایک تصویر شامل کریں۔',
    linkInvalid: 'کوئی عوامی لنک پیسٹ کریں، جیسے https://your-shop.com/product۔',
    linkUnreachable: 'ہم وہ صفحہ نہیں کھول سکے (شاید وہ خودکار پڑھائی روکتا ہے)۔ اپنی تصاویر شامل کریں۔',
    linkLimit: 'آج آپ بہت سے لنک پڑھ چکے ہیں۔ اپنی تصاویر شامل کریں یا کل دوبارہ کوشش کریں۔',
    linkFailed: 'ہم ابھی وہ صفحہ نہیں پڑھ سکے۔ اپنی تصاویر شامل کریں۔',
  },
  hi: {
    lead: '1 से 7 फ़ोटो या वीडियो भेजें — पहले प्रोडक्ट की फ़ोटो। ज़्यादा से ज़्यादा 2 वीडियो विज्ञापन में वीडियो की तरह जाते हैं।',
    needPhoto: 'कम से कम {min} फ़ोटो जोड़ें (विज्ञापन में {min} से {max})।',
    linkLabel: 'या अपने प्रोडक्ट का लिंक पेस्ट करें',
    linkHint: 'हम पेज से ज़्यादा से ज़्यादा 3 फ़ोटो और प्रोडक्ट की जानकारी लेते हैं। सिर्फ़ वही पेज इस्तेमाल करें जिसका आपको अधिकार है।',
    linkPlaceholder: 'https://your-shop.com/product',
    linkButton: 'फ़ोटो लाएँ',
    linkReading: 'पेज पढ़ा जा रहा है…',
    linkGot: '{host} से जोड़ी गई फ़ोटो: {n}। हर एक की फ़्रेमिंग जाँचें।',
    linkNoPhotos: 'हम उस पेज से फ़ोटो नहीं ले पाए — कम से कम एक फ़ोटो जोड़ें।',
    linkInvalid: 'कोई सार्वजनिक लिंक पेस्ट करें, जैसे https://your-shop.com/product।',
    linkUnreachable: 'हम वह पेज नहीं खोल पाए (शायद वह अपने-आप पढ़ने को रोकता है)। अपनी फ़ोटो जोड़ें।',
    linkLimit: 'आज आप बहुत से लिंक पढ़ चुके हैं। अपनी फ़ोटो जोड़ें या कल फिर कोशिश करें।',
    linkFailed: 'हम अभी वह पेज नहीं पढ़ पाए। अपनी फ़ोटो जोड़ें।',
  },
  id: {
    lead: 'Kirim 1 sampai 7 foto atau video — foto produk lebih dulu. Maksimal 2 video masuk ke iklan sebagai video.',
    needPhoto: 'Tambahkan minimal {min} foto ({min} sampai {max} di iklan).',
    linkLabel: 'Atau tempel tautan produkmu',
    linkHint: 'Kami mengambil hingga 3 foto dan detail produk dari halaman itu. Pakai hanya halaman yang boleh kamu gunakan.',
    linkPlaceholder: 'https://tokomu.com/produk',
    linkButton: 'Ambil foto',
    linkReading: 'Membaca halaman…',
    linkGot: 'Foto yang ditambahkan dari {host}: {n}. Periksa bingkai setiap foto.',
    linkNoPhotos: 'Kami tidak bisa mengambil foto dari halaman itu — tambahkan minimal satu foto.',
    linkInvalid: 'Tempel tautan publik, seperti https://tokomu.com/produk.',
    linkUnreachable: 'Kami tidak bisa membuka halaman itu (mungkin memblokir pembacaan otomatis). Tambahkan fotomu.',
    linkLimit: 'Hari ini kamu sudah membaca banyak tautan. Tambahkan fotomu atau coba lagi besok.',
    linkFailed: 'Kami belum bisa membaca halaman itu sekarang. Tambahkan fotomu.',
  },
  vi: {
    lead: 'Gửi từ 1 đến 7 ảnh hoặc video — ảnh sản phẩm trước. Tối đa 2 video được đưa vào quảng cáo dưới dạng video.',
    needPhoto: 'Thêm ít nhất {min} ảnh (từ {min} đến {max} trong quảng cáo).',
    linkLabel: 'Hoặc dán liên kết sản phẩm của bạn',
    linkHint: 'Chúng tôi lấy tối đa 3 ảnh và thông tin sản phẩm từ trang đó. Chỉ dùng trang mà bạn có quyền sử dụng.',
    linkPlaceholder: 'https://cua-hang.vn/san-pham',
    linkButton: 'Lấy ảnh',
    linkReading: 'Đang đọc trang…',
    linkGot: 'Ảnh đã thêm từ {host}: {n}. Kiểm tra khung hình của từng ảnh.',
    linkNoPhotos: 'Chúng tôi không lấy được ảnh từ trang đó — hãy thêm ít nhất một ảnh.',
    linkInvalid: 'Dán một liên kết công khai, ví dụ https://cua-hang.vn/san-pham.',
    linkUnreachable: 'Chúng tôi không mở được trang đó (có thể trang chặn việc đọc tự động). Hãy thêm ảnh của bạn.',
    linkLimit: 'Hôm nay bạn đã đọc nhiều liên kết. Hãy thêm ảnh hoặc thử lại vào ngày mai.',
    linkFailed: 'Hiện chúng tôi chưa đọc được trang đó. Hãy thêm ảnh của bạn.',
  },
}

/** Frases na língua da interface (língua desconhecida = inglês). */
export function adsV2LinkImportCopy(language: InterfaceLanguage | string | null | undefined): AdsV2LinkImportCopy {
  return (typeof language === 'string' && (ADS_V2_LINK_IMPORT_COPY as Record<string, AdsV2LinkImportCopy>)[language]) || ADS_V2_LINK_IMPORT_COPY.en
}

/** O código de erro da rota → a frase da tela (moderação e o resto caem em linkFailed; a tela mostra a do servidor se houver). */
export function adsV2LinkImportError(code: string | null | undefined, copy: AdsV2LinkImportCopy): string {
  if (code === 'link_invalid' || code === 'bad_body') return copy.linkInvalid
  if (code === 'link_unreachable') return copy.linkUnreachable
  if (code === 'daily_limit') return copy.linkLimit
  return copy.linkFailed
}
