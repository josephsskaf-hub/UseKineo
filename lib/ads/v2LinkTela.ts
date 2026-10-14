// KINEO-ADS-LINK-TELA-1510 — a TELA do leitor de link (follow-up do KINEO-ADS-LINK-LOJAS-1510, fundador 15/10: "Ads perfeito
// para agências, hoje"). A rota /api/ads/v2/link-import já devolvia platform/currency/brand/confidence/reasons e, no 422,
// detail/platform/message; o AdsV2Simple e o AdsV2Batch ignoravam tudo. Esta lib é PURA (só importa tipos) e decide:
//   · adsV2LinkNeedsCheck — confiança que não é 'high' = o cartão "Lemos sua página" pede confirmação ("Looks right" ou editar
//     um campo) ANTES do roteiro automático usar nome/preço/foto. 'high' = exatamente como antes;
//   · adsV2LinkPriceState — "a página não tem preço" (no_price) ≠ "não tivemos certeza do preço" (o leitor DESCARTOU de
//     propósito: variantes com preços diferentes, faixa, conflito, o "de" no lugar do "por");
//   · adsV2LinkCurrency — a moeda (ISO de 3 letras) ao lado do preço, só quando a página disse;
//   · adsV2LinkBlockedText — o 422 honesto: em inglês, a frase EXATA do servidor (body.message); nas outras 15 línguas, a mesma
//     frase traduzida a partir de platform/detail (os mesmos ramos de linkBlockMessage em lib/ads/linkReader.ts).
// Nada aqui chama rota, cobra ou decide preço.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export type AdsV2LinkConfidence = 'high' | 'medium' | 'low'
export type AdsV2LinkPriceState = 'found' | 'unsure' | 'none'

/** Confiança que não é 'high' (medium, low, ausente) = pede confirmação antes do roteiro. */
export function adsV2LinkNeedsCheck(confidence: unknown): boolean {
  return confidence !== 'high'
}

/** Os porquês do leitor em que ele TINHA um preço e o descartou por dúvida (lib/ads/linkReader.ts readProductPage). */
export const ADS_V2_LINK_PRICE_UNSURE_REASONS = ['price_varies', 'price_range', 'price_conflict', 'price_is_from'] as const

/** Preço que veio = 'found'; sem preço com um porquê de dúvida = 'unsure'; sem preço e sem dúvida (no_price) = 'none'. */
export function adsV2LinkPriceState(price: unknown, reasons: unknown): AdsV2LinkPriceState {
  if (typeof price === 'string' && price.trim()) return 'found'
  const list = Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === 'string') : []
  return list.some((r) => (ADS_V2_LINK_PRICE_UNSURE_REASONS as readonly string[]).includes(r)) ? 'unsure' : 'none'
}

/** A moeda que a página declarou (ISO 4217, 3 letras maiúsculas); qualquer outra coisa = null (não mostra). */
export function adsV2LinkCurrency(currency: unknown): string | null {
  const c = typeof currency === 'string' ? currency.trim().toUpperCase() : ''
  return /^[A-Z]{3}$/.test(c) ? c : null
}

export interface AdsV2LinkTelaCopy {
  /** Título do cartão quando a confiança não é 'high'. */
  title: string
  why: string
  ok: string
  done: string
  /** A linha do "falta" (bloqueia o roteiro automático e o manual até confirmar). */
  pending: string
  priceUnsure: string
  upload: string
  blockedBy: string
  loginBy: string
  login: string
  jsOnly: string
  blocked: string
}

const EN: AdsV2LinkTelaCopy = {
  title: 'Please confirm the product name, price and photo',
  why: 'Part of this page was hard to read. Check the highlighted fields — fix anything wrong, or tap “Looks right”.',
  ok: 'Looks right',
  done: 'Thanks — we’ll use these details.',
  pending: 'Confirm the product name, price and photo we read from the page.',
  priceUnsure: 'We weren’t sure about the price — type it if you want it in the ad.',
  upload: 'Upload the photo instead',
  blockedBy: '{site} blocks automatic reading. Upload the product photo instead.',
  loginBy: '{site} asks for a login before showing this page. Upload the product photo instead.',
  login: 'This page asks for a login, so we cannot read it. Upload the product photo instead.',
  jsOnly: 'This page only shows the product after running JavaScript, which we do not do. Upload the product photo instead.',
  blocked: 'This site blocks automatic reading. Upload the product photo instead.',
}

const PT: AdsV2LinkTelaCopy = {
  title: 'Confirme o nome, o preço e a foto do produto',
  why: 'Parte desta página foi difícil de ler. Confira os campos destacados — corrija o que estiver errado ou toque em “Está certo”.',
  ok: 'Está certo',
  done: 'Obrigado — vamos usar estes dados.',
  pending: 'Confirme o nome, o preço e a foto do produto que lemos da página.',
  priceUnsure: 'Não tivemos certeza do preço — digite se quiser no anúncio.',
  upload: 'Enviar a foto',
  blockedBy: '{site} bloqueia a leitura automática. Envie a foto do produto.',
  loginBy: '{site} pede login antes de mostrar esta página. Envie a foto do produto.',
  login: 'Esta página pede login, então não conseguimos lê-la. Envie a foto do produto.',
  jsOnly: 'Esta página só mostra o produto depois de rodar JavaScript, o que não fazemos. Envie a foto do produto.',
  blocked: 'Este site bloqueia a leitura automática. Envie a foto do produto.',
}

const ES: AdsV2LinkTelaCopy = {
  title: 'Confirma el nombre, el precio y la foto del producto',
  why: 'Parte de esta página fue difícil de leer. Revisa los campos resaltados: corrige lo que esté mal o toca «Está bien».',
  ok: 'Está bien',
  done: 'Gracias, usaremos estos datos.',
  pending: 'Confirma el nombre, el precio y la foto del producto que leímos de la página.',
  priceUnsure: 'No estábamos seguros del precio: escríbelo si lo quieres en el anuncio.',
  upload: 'Sube la foto',
  blockedBy: '{site} bloquea la lectura automática. Sube la foto del producto.',
  loginBy: '{site} pide iniciar sesión antes de mostrar esta página. Sube la foto del producto.',
  login: 'Esta página pide iniciar sesión, así que no podemos leerla. Sube la foto del producto.',
  jsOnly: 'Esta página solo muestra el producto después de ejecutar JavaScript, y nosotros no lo hacemos. Sube la foto del producto.',
  blocked: 'Este sitio bloquea la lectura automática. Sube la foto del producto.',
}

const FR: AdsV2LinkTelaCopy = {
  title: 'Confirmez le nom, le prix et la photo du produit',
  why: 'Une partie de cette page était difficile à lire. Vérifiez les champs en surbrillance : corrigez ce qui est faux ou touchez « C’est bon ».',
  ok: 'C’est bon',
  done: 'Merci, nous utiliserons ces informations.',
  pending: 'Confirmez le nom, le prix et la photo du produit lus sur la page.',
  priceUnsure: 'Nous n’étions pas sûrs du prix : saisissez-le si vous le voulez dans la pub.',
  upload: 'Importer la photo',
  blockedBy: '{site} bloque la lecture automatique. Importez plutôt la photo du produit.',
  loginBy: '{site} demande une connexion avant d’afficher cette page. Importez plutôt la photo du produit.',
  login: 'Cette page demande une connexion, nous ne pouvons donc pas la lire. Importez plutôt la photo du produit.',
  jsOnly: 'Cette page n’affiche le produit qu’après avoir exécuté du JavaScript, ce que nous ne faisons pas. Importez plutôt la photo du produit.',
  blocked: 'Ce site bloque la lecture automatique. Importez plutôt la photo du produit.',
}

const DE: AdsV2LinkTelaCopy = {
  title: 'Bitte bestätige Produktname, Preis und Foto',
  why: 'Ein Teil dieser Seite war schwer zu lesen. Prüfe die markierten Felder – korrigiere, was falsch ist, oder tippe auf „Passt so“.',
  ok: 'Passt so',
  done: 'Danke – wir verwenden diese Angaben.',
  pending: 'Bestätige Produktname, Preis und Foto, die wir von der Seite gelesen haben.',
  priceUnsure: 'Beim Preis waren wir unsicher – trag ihn ein, wenn er in die Anzeige soll.',
  upload: 'Stattdessen Foto hochladen',
  blockedBy: '{site} blockiert automatisches Lesen. Lade stattdessen das Produktfoto hoch.',
  loginBy: '{site} verlangt eine Anmeldung, bevor die Seite angezeigt wird. Lade stattdessen das Produktfoto hoch.',
  login: 'Diese Seite verlangt eine Anmeldung, daher können wir sie nicht lesen. Lade stattdessen das Produktfoto hoch.',
  jsOnly: 'Diese Seite zeigt das Produkt erst nach dem Ausführen von JavaScript, und das tun wir nicht. Lade stattdessen das Produktfoto hoch.',
  blocked: 'Diese Seite blockiert automatisches Lesen. Lade stattdessen das Produktfoto hoch.',
}

const IT: AdsV2LinkTelaCopy = {
  title: 'Conferma nome, prezzo e foto del prodotto',
  why: 'Una parte di questa pagina era difficile da leggere. Controlla i campi evidenziati: correggi ciò che non va o tocca «Va bene».',
  ok: 'Va bene',
  done: 'Grazie, useremo questi dati.',
  pending: 'Conferma nome, prezzo e foto del prodotto che abbiamo letto dalla pagina.',
  priceUnsure: 'Non eravamo sicuri del prezzo: scrivilo se lo vuoi nell’annuncio.',
  upload: 'Carica la foto',
  blockedBy: '{site} blocca la lettura automatica. Carica invece la foto del prodotto.',
  loginBy: '{site} chiede l’accesso prima di mostrare questa pagina. Carica invece la foto del prodotto.',
  login: 'Questa pagina chiede l’accesso, quindi non possiamo leggerla. Carica invece la foto del prodotto.',
  jsOnly: 'Questa pagina mostra il prodotto solo dopo aver eseguito JavaScript, cosa che non facciamo. Carica invece la foto del prodotto.',
  blocked: 'Questo sito blocca la lettura automatica. Carica invece la foto del prodotto.',
}

const NL: AdsV2LinkTelaCopy = {
  title: 'Bevestig de productnaam, prijs en foto',
  why: 'Een deel van deze pagina was moeilijk te lezen. Controleer de gemarkeerde velden — verbeter wat niet klopt of tik op ‘Klopt’.',
  ok: 'Klopt',
  done: 'Bedankt — we gebruiken deze gegevens.',
  pending: 'Bevestig de productnaam, prijs en foto die we van de pagina hebben gelezen.',
  priceUnsure: 'We wisten de prijs niet zeker — typ hem als je hem in de advertentie wilt.',
  upload: 'Upload liever de foto',
  blockedBy: '{site} blokkeert automatisch lezen. Upload liever de productfoto.',
  loginBy: '{site} vraagt om in te loggen voordat deze pagina wordt getoond. Upload liever de productfoto.',
  login: 'Deze pagina vraagt om in te loggen, dus we kunnen hem niet lezen. Upload liever de productfoto.',
  jsOnly: 'Deze pagina toont het product pas na het uitvoeren van JavaScript, en dat doen wij niet. Upload liever de productfoto.',
  blocked: 'Deze site blokkeert automatisch lezen. Upload liever de productfoto.',
}

const PL: AdsV2LinkTelaCopy = {
  title: 'Potwierdź nazwę, cenę i zdjęcie produktu',
  why: 'Część tej strony była trudna do odczytania. Sprawdź wyróżnione pola — popraw, co się nie zgadza, albo kliknij „Wszystko się zgadza”.',
  ok: 'Wszystko się zgadza',
  done: 'Dzięki — użyjemy tych danych.',
  pending: 'Potwierdź nazwę, cenę i zdjęcie produktu odczytane ze strony.',
  priceUnsure: 'Nie byliśmy pewni ceny — wpisz ją, jeśli ma być w reklamie.',
  upload: 'Prześlij zdjęcie',
  blockedBy: '{site} blokuje automatyczne odczytywanie. Prześlij zamiast tego zdjęcie produktu.',
  loginBy: '{site} wymaga logowania przed pokazaniem tej strony. Prześlij zamiast tego zdjęcie produktu.',
  login: 'Ta strona wymaga logowania, więc nie możemy jej odczytać. Prześlij zamiast tego zdjęcie produktu.',
  jsOnly: 'Ta strona pokazuje produkt dopiero po uruchomieniu JavaScriptu, czego nie robimy. Prześlij zamiast tego zdjęcie produktu.',
  blocked: 'Ta strona blokuje automatyczne odczytywanie. Prześlij zamiast tego zdjęcie produktu.',
}

const TR: AdsV2LinkTelaCopy = {
  title: 'Lütfen ürün adını, fiyatı ve fotoğrafı onayla',
  why: 'Bu sayfanın bir kısmını okumak zordu. İşaretli alanları kontrol et — yanlış olanı düzelt ya da “Doğru görünüyor”a dokun.',
  ok: 'Doğru görünüyor',
  done: 'Teşekkürler — bu bilgileri kullanacağız.',
  pending: 'Sayfadan okuduğumuz ürün adını, fiyatı ve fotoğrafı onayla.',
  priceUnsure: 'Fiyattan emin olamadık — reklamda olsun istersen yaz.',
  upload: 'Bunun yerine fotoğraf yükle',
  blockedBy: '{site} otomatik okumayı engelliyor. Bunun yerine ürün fotoğrafını yükle.',
  loginBy: '{site} bu sayfayı göstermeden önce giriş istiyor. Bunun yerine ürün fotoğrafını yükle.',
  login: 'Bu sayfa giriş istiyor, bu yüzden okuyamıyoruz. Bunun yerine ürün fotoğrafını yükle.',
  jsOnly: 'Bu sayfa ürünü yalnızca JavaScript çalıştırıldıktan sonra gösteriyor; biz bunu yapmıyoruz. Bunun yerine ürün fotoğrafını yükle.',
  blocked: 'Bu site otomatik okumayı engelliyor. Bunun yerine ürün fotoğrafını yükle.',
}

const RU: AdsV2LinkTelaCopy = {
  title: 'Подтвердите название, цену и фото товара',
  why: 'Часть этой страницы было трудно прочитать. Проверьте выделенные поля — исправьте неверное или нажмите «Всё верно».',
  ok: 'Всё верно',
  done: 'Спасибо — используем эти данные.',
  pending: 'Подтвердите название, цену и фото товара, которые мы прочитали со страницы.',
  priceUnsure: 'Мы не уверены в цене — введите её, если она нужна в рекламе.',
  upload: 'Загрузить фото',
  blockedBy: '{site} блокирует автоматическое чтение. Загрузите фото товара.',
  loginBy: '{site} требует входа перед показом этой страницы. Загрузите фото товара.',
  login: 'Эта страница требует входа, поэтому мы не можем её прочитать. Загрузите фото товара.',
  jsOnly: 'Эта страница показывает товар только после запуска JavaScript, а мы его не запускаем. Загрузите фото товара.',
  blocked: 'Этот сайт блокирует автоматическое чтение. Загрузите фото товара.',
}

const UK: AdsV2LinkTelaCopy = {
  title: 'Підтвердьте назву, ціну й фото товару',
  why: 'Частину цієї сторінки було важко прочитати. Перевірте виділені поля — виправте неправильне або натисніть «Усе правильно».',
  ok: 'Усе правильно',
  done: 'Дякуємо — використаємо ці дані.',
  pending: 'Підтвердьте назву, ціну й фото товару, які ми прочитали зі сторінки.',
  priceUnsure: 'Ми не впевнені щодо ціни — введіть її, якщо вона потрібна в рекламі.',
  upload: 'Завантажити фото',
  blockedBy: '{site} блокує автоматичне читання. Завантажте фото товару.',
  loginBy: '{site} вимагає входу перед показом цієї сторінки. Завантажте фото товару.',
  login: 'Ця сторінка вимагає входу, тому ми не можемо її прочитати. Завантажте фото товару.',
  jsOnly: 'Ця сторінка показує товар лише після запуску JavaScript, а ми його не запускаємо. Завантажте фото товару.',
  blocked: 'Цей сайт блокує автоматичне читання. Завантажте фото товару.',
}

const AR: AdsV2LinkTelaCopy = {
  title: 'يُرجى تأكيد اسم المنتج والسعر والصورة',
  why: 'كان جزء من هذه الصفحة صعب القراءة. راجع الحقول المميزة — صحّح ما هو خاطئ أو اضغط «يبدو صحيحًا».',
  ok: 'يبدو صحيحًا',
  done: 'شكرًا — سنستخدم هذه البيانات.',
  pending: 'أكّد اسم المنتج والسعر والصورة التي قرأناها من الصفحة.',
  priceUnsure: 'لم نكن متأكدين من السعر — اكتبه إن أردته في الإعلان.',
  upload: 'ارفع الصورة بدلًا من ذلك',
  blockedBy: '{site} يمنع القراءة التلقائية. ارفع صورة المنتج بدلًا من ذلك.',
  loginBy: '{site} يطلب تسجيل الدخول قبل عرض هذه الصفحة. ارفع صورة المنتج بدلًا من ذلك.',
  login: 'هذه الصفحة تطلب تسجيل الدخول، لذا لا يمكننا قراءتها. ارفع صورة المنتج بدلًا من ذلك.',
  jsOnly: 'هذه الصفحة لا تعرض المنتج إلا بعد تشغيل JavaScript، ونحن لا نفعل ذلك. ارفع صورة المنتج بدلًا من ذلك.',
  blocked: 'هذا الموقع يمنع القراءة التلقائية. ارفع صورة المنتج بدلًا من ذلك.',
}

const UR: AdsV2LinkTelaCopy = {
  title: 'براہِ کرم پروڈکٹ کا نام، قیمت اور تصویر کی تصدیق کریں',
  why: 'اس صفحے کا کچھ حصہ پڑھنا مشکل تھا۔ نمایاں خانے دیکھیں — جو غلط ہو درست کریں یا "ٹھیک ہے" دبائیں۔',
  ok: 'ٹھیک ہے',
  done: 'شکریہ — ہم یہی معلومات استعمال کریں گے۔',
  pending: 'صفحے سے پڑھا گیا پروڈکٹ کا نام، قیمت اور تصویر کی تصدیق کریں۔',
  priceUnsure: 'ہمیں قیمت کا یقین نہیں تھا — اگر اشتہار میں چاہیے تو لکھ دیں۔',
  upload: 'اس کے بجائے تصویر اپ لوڈ کریں',
  blockedBy: '{site} خودکار پڑھائی روکتا ہے۔ اس کے بجائے پروڈکٹ کی تصویر اپ لوڈ کریں۔',
  loginBy: '{site} یہ صفحہ دکھانے سے پہلے لاگ اِن مانگتا ہے۔ اس کے بجائے پروڈکٹ کی تصویر اپ لوڈ کریں۔',
  login: 'یہ صفحہ لاگ اِن مانگتا ہے، اس لیے ہم اسے نہیں پڑھ سکتے۔ اس کے بجائے پروڈکٹ کی تصویر اپ لوڈ کریں۔',
  jsOnly: 'یہ صفحہ پروڈکٹ صرف JavaScript چلانے کے بعد دکھاتا ہے، جو ہم نہیں کرتے۔ اس کے بجائے پروڈکٹ کی تصویر اپ لوڈ کریں۔',
  blocked: 'یہ سائٹ خودکار پڑھائی روکتی ہے۔ اس کے بجائے پروڈکٹ کی تصویر اپ لوڈ کریں۔',
}

const HI: AdsV2LinkTelaCopy = {
  title: 'कृपया प्रोडक्ट का नाम, कीमत और फ़ोटो कन्फ़र्म करें',
  why: 'इस पेज का कुछ हिस्सा पढ़ना मुश्किल था। हाइलाइट किए गए फ़ील्ड देखें — जो गलत हो उसे ठीक करें या "सही है" दबाएँ।',
  ok: 'सही है',
  done: 'धन्यवाद — हम यही जानकारी इस्तेमाल करेंगे।',
  pending: 'पेज से पढ़ा गया प्रोडक्ट का नाम, कीमत और फ़ोटो कन्फ़र्म करें।',
  priceUnsure: 'हमें कीमत पक्की नहीं लगी — विज्ञापन में चाहिए तो लिख दें।',
  upload: 'इसके बजाय फ़ोटो अपलोड करें',
  blockedBy: '{site} अपने-आप पढ़ने को रोकता है। इसके बजाय प्रोडक्ट की फ़ोटो अपलोड करें।',
  loginBy: '{site} यह पेज दिखाने से पहले लॉगिन माँगता है। इसके बजाय प्रोडक्ट की फ़ोटो अपलोड करें।',
  login: 'यह पेज लॉगिन माँगता है, इसलिए हम इसे नहीं पढ़ सकते। इसके बजाय प्रोडक्ट की फ़ोटो अपलोड करें।',
  jsOnly: 'यह पेज प्रोडक्ट तभी दिखाता है जब JavaScript चलाया जाए, जो हम नहीं करते। इसके बजाय प्रोडक्ट की फ़ोटो अपलोड करें।',
  blocked: 'यह साइट अपने-आप पढ़ने को रोकती है। इसके बजाय प्रोडक्ट की फ़ोटो अपलोड करें।',
}

const ID: AdsV2LinkTelaCopy = {
  title: 'Mohon konfirmasi nama produk, harga, dan foto',
  why: 'Sebagian halaman ini sulit dibaca. Periksa kolom yang disorot — perbaiki yang salah atau ketuk “Sudah benar”.',
  ok: 'Sudah benar',
  done: 'Terima kasih — kami akan memakai data ini.',
  pending: 'Konfirmasi nama produk, harga, dan foto yang kami baca dari halaman.',
  priceUnsure: 'Kami tidak yakin dengan harganya — ketik jika ingin ada di iklan.',
  upload: 'Unggah foto saja',
  blockedBy: '{site} memblokir pembacaan otomatis. Unggah foto produknya saja.',
  loginBy: '{site} meminta login sebelum menampilkan halaman ini. Unggah foto produknya saja.',
  login: 'Halaman ini meminta login, jadi kami tidak bisa membacanya. Unggah foto produknya saja.',
  jsOnly: 'Halaman ini baru menampilkan produk setelah menjalankan JavaScript, dan kami tidak melakukannya. Unggah foto produknya saja.',
  blocked: 'Situs ini memblokir pembacaan otomatis. Unggah foto produknya saja.',
}

const VI: AdsV2LinkTelaCopy = {
  title: 'Vui lòng xác nhận tên sản phẩm, giá và ảnh',
  why: 'Một phần trang này khó đọc. Kiểm tra các ô được đánh dấu — sửa chỗ sai hoặc chạm “Đúng rồi”.',
  ok: 'Đúng rồi',
  done: 'Cảm ơn — chúng tôi sẽ dùng các thông tin này.',
  pending: 'Xác nhận tên sản phẩm, giá và ảnh chúng tôi đọc từ trang.',
  priceUnsure: 'Chúng tôi không chắc về giá — hãy nhập nếu bạn muốn có trong quảng cáo.',
  upload: 'Tải ảnh lên thay thế',
  blockedBy: '{site} chặn việc đọc tự động. Hãy tải ảnh sản phẩm lên thay thế.',
  loginBy: '{site} yêu cầu đăng nhập trước khi hiển thị trang này. Hãy tải ảnh sản phẩm lên thay thế.',
  login: 'Trang này yêu cầu đăng nhập nên chúng tôi không đọc được. Hãy tải ảnh sản phẩm lên thay thế.',
  jsOnly: 'Trang này chỉ hiển thị sản phẩm sau khi chạy JavaScript, việc mà chúng tôi không làm. Hãy tải ảnh sản phẩm lên thay thế.',
  blocked: 'Trang này chặn việc đọc tự động. Hãy tải ảnh sản phẩm lên thay thế.',
}

export const ADS_V2_LINK_TELA_COPY: Record<InterfaceLanguage, AdsV2LinkTelaCopy> = {
  en: EN, pt: PT, es: ES, fr: FR, de: DE, it: IT, nl: NL, pl: PL, tr: TR, ru: RU, uk: UK, ar: AR, ur: UR, hi: HI, id: ID, vi: VI,
}

/** Frases na língua da interface (língua desconhecida = inglês). */
export function adsV2LinkTelaCopy(language: InterfaceLanguage | string | null | undefined): AdsV2LinkTelaCopy {
  return (language && Object.prototype.hasOwnProperty.call(ADS_V2_LINK_TELA_COPY, language) ? ADS_V2_LINK_TELA_COPY[language as InterfaceLanguage] : null) ?? EN
}

/** O nome que a frase usa para as plataformas que o servidor nomeia (os mesmos de linkBlockMessage). */
const SITE_NAME: Readonly<Record<string, string>> = { amazon: 'Amazon', etsy: 'Etsy', mercadolivre: 'Mercado Livre' }

/**
 * O aviso honesto do 422 'link_unreachable' que traz `message` (página de robô/captcha, login ou só-JavaScript). Sem `message` =
 * null (a tela segue com as frases de antes). Inglês = a frase EXATA do servidor; as outras línguas = a mesma frase, traduzida
 * pelos mesmos ramos de linkBlockMessage (Amazon/Etsy bloqueiam; Mercado Livre pede login; login; só-JS; bloqueio genérico).
 */
export function adsV2LinkBlockedText(body: Record<string, unknown> | null | undefined, copy: AdsV2LinkTelaCopy, language: string | null | undefined): string | null {
  const message = body && typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return null
  if (!language || language === 'en' || !Object.prototype.hasOwnProperty.call(ADS_V2_LINK_TELA_COPY, language)) return message
  const platform = typeof body?.platform === 'string' ? body.platform : ''
  const detail = typeof body?.detail === 'string' ? body.detail : ''
  const fillSite = (s: string) => s.split('{site}').join(SITE_NAME[platform] ?? '')
  if (platform === 'amazon' || platform === 'etsy') return fillSite(copy.blockedBy)
  if (platform === 'mercadolivre') return fillSite(copy.loginBy)
  if (detail === 'login') return copy.login
  if (detail === 'js_only') return copy.jsOnly
  return copy.blocked
}
