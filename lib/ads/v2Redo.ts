// KINEO-ADS-MELHORIAS-1410 — "Refazer esta cena" no modo SIMPLES do Studio Ads v2 (o modo que todo mundo usa). A rota já existia
// (app/api/ads/v2/retake: pedido novo com id determinístico, débito idempotente 'adsv2redo-<id>', estorno se a refação falhar,
// um pedido ativo por conta pelo índice ads_v2_orders_one_active_per_user_slot), e o preço por plano também
// (adsV2RetakeCredits, lib/ads/v2Tiers.ts: 5 cr no Kling O3, 12 cr no herói Seedance — provisório até a virada pública).
// Só o modo completo mostrava a grade com o botão; o simples mandava a pessoa para lá ("Redo a shot (full mode)").
// Aqui: as frases nas 16 línguas. Quando o botão aparece é a MESMA regra do modo completo (canRedoShot, lib/ads/v2Screen.ts).
// LIB PURA: só import type.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2RedoCopy {
  title: string
  hint: string
  /** Botão: {c} = créditos. */
  button: string
  /** Confirmação: {n} = nº da cena, {c} = créditos. */
  ask: string
  yes: string
  starting: string
  cancel: string
  /** Aviso depois do clique: {n} = nº da cena. */
  note: string
}

const EN: AdsV2RedoCopy = {
  title: 'Not happy with a scene?',
  hint: 'Redo just that scene with a different camera move. The rest of your ad is kept, and the price shows before you confirm. Your real photo and screen shots stay as they are.',
  button: 'Redo this scene · {c} credits',
  ask: 'Redo scene {n} for {c} credits?',
  yes: 'Yes, redo it',
  starting: 'Starting…',
  cancel: 'Cancel',
  note: 'Redoing scene {n}. The first version of your ad stays in My Videos.',
}

export const ADS_V2_REDO_COPY: Record<InterfaceLanguage, AdsV2RedoCopy> = {
  en: EN,
  pt: { title: 'Não gostou de uma cena?', hint: 'Refaça só aquela cena, com outro movimento de câmera. O resto do anúncio fica, e o preço aparece antes de você confirmar. Sua foto real e as telas ficam como estão.', button: 'Refazer esta cena · {c} créditos', ask: 'Refazer a cena {n} por {c} créditos?', yes: 'Sim, refazer', starting: 'Começando…', cancel: 'Cancelar', note: 'Refazendo a cena {n}. A primeira versão do anúncio continua em Meus Vídeos.' },
  es: { title: '¿No te gustó una escena?', hint: 'Rehaz solo esa escena, con otro movimiento de cámara. El resto del anuncio se queda, y el precio aparece antes de confirmar. Tu foto real y las pantallas quedan como están.', button: 'Rehacer esta escena · {c} créditos', ask: '¿Rehacer la escena {n} por {c} créditos?', yes: 'Sí, rehacer', starting: 'Empezando…', cancel: 'Cancelar', note: 'Rehaciendo la escena {n}. La primera versión del anuncio sigue en Mis Videos.' },
  fr: { title: 'Une scène ne vous plaît pas ?', hint: 'Refaites seulement cette scène, avec un autre mouvement de caméra. Le reste de la pub est conservé et le prix s’affiche avant de confirmer. Votre vraie photo et les écrans restent tels quels.', button: 'Refaire cette scène · {c} crédits', ask: 'Refaire la scène {n} pour {c} crédits ?', yes: 'Oui, la refaire', starting: 'Démarrage…', cancel: 'Annuler', note: 'Scène {n} en cours de refonte. La première version de la pub reste dans Mes vidéos.' },
  de: { title: 'Eine Szene gefällt Ihnen nicht?', hint: 'Nur diese Szene neu machen, mit einer anderen Kamerabewegung. Der Rest der Anzeige bleibt, und der Preis wird vor dem Bestätigen angezeigt. Ihr echtes Foto und Bildschirme bleiben, wie sie sind.', button: 'Diese Szene neu machen · {c} Credits', ask: 'Szene {n} für {c} Credits neu machen?', yes: 'Ja, neu machen', starting: 'Startet…', cancel: 'Abbrechen', note: 'Szene {n} wird neu gemacht. Die erste Version der Anzeige bleibt in Meine Videos.' },
  it: { title: 'Una scena non ti piace?', hint: 'Rifai solo quella scena, con un altro movimento di camera. Il resto dell’annuncio resta e il prezzo appare prima di confermare. La tua foto reale e le schermate restano come sono.', button: 'Rifai questa scena · {c} crediti', ask: 'Rifare la scena {n} per {c} crediti?', yes: 'Sì, rifalla', starting: 'Avvio…', cancel: 'Annulla', note: 'Sto rifacendo la scena {n}. La prima versione dell’annuncio resta in I miei video.' },
  nl: { title: 'Niet blij met een scène?', hint: 'Maak alleen die scène opnieuw, met een andere camerabeweging. De rest van je advertentie blijft, en de prijs zie je voordat je bevestigt. Je echte foto en schermen blijven zoals ze zijn.', button: 'Deze scène opnieuw · {c} credits', ask: 'Scène {n} opnieuw maken voor {c} credits?', yes: 'Ja, opnieuw', starting: 'Bezig met starten…', cancel: 'Annuleren', note: 'Scène {n} wordt opnieuw gemaakt. De eerste versie van je advertentie blijft in Mijn video’s.' },
  pl: { title: 'Nie podoba Ci się scena?', hint: 'Zrób ponownie tylko tę scenę, z innym ruchem kamery. Reszta reklamy zostaje, a cenę zobaczysz przed potwierdzeniem. Twoje prawdziwe zdjęcie i ekrany zostają bez zmian.', button: 'Zrób tę scenę ponownie · {c} kredytów', ask: 'Zrobić ponownie scenę {n} za {c} kredytów?', yes: 'Tak, zrób ponownie', starting: 'Uruchamianie…', cancel: 'Anuluj', note: 'Scena {n} jest robiona ponownie. Pierwsza wersja reklamy zostaje w Moich filmach.' },
  tr: { title: 'Bir sahneyi beğenmediniz mi?', hint: 'Yalnızca o sahneyi başka bir kamera hareketiyle yeniden yapın. Reklamın geri kalanı korunur ve fiyat onaylamadan önce görünür. Gerçek fotoğrafınız ve ekran görüntüleri olduğu gibi kalır.', button: 'Bu sahneyi yeniden yap · {c} kredi', ask: 'Sahne {n} {c} krediye yeniden yapılsın mı?', yes: 'Evet, yeniden yap', starting: 'Başlıyor…', cancel: 'İptal', note: 'Sahne {n} yeniden yapılıyor. Reklamın ilk sürümü Videolarım’da kalır.' },
  ru: { title: 'Не понравилась сцена?', hint: 'Переделайте только эту сцену, с другим движением камеры. Остальная реклама сохраняется, а цена видна до подтверждения. Ваше настоящее фото и экраны остаются как есть.', button: 'Переделать сцену · {c} кредитов', ask: 'Переделать сцену {n} за {c} кредитов?', yes: 'Да, переделать', starting: 'Запуск…', cancel: 'Отмена', note: 'Сцена {n} переделывается. Первая версия рекламы остаётся в «Моих видео».' },
  uk: { title: 'Не сподобалася сцена?', hint: 'Переробіть лише цю сцену, з іншим рухом камери. Решта реклами зберігається, а ціну видно до підтвердження. Ваше справжнє фото й екрани лишаються як є.', button: 'Переробити сцену · {c} кредитів', ask: 'Переробити сцену {n} за {c} кредитів?', yes: 'Так, переробити', starting: 'Запуск…', cancel: 'Скасувати', note: 'Сцена {n} переробляється. Перша версія реклами лишається в «Моїх відео».' },
  ar: { title: 'لم يعجبك مشهد؟', hint: 'أعد هذا المشهد وحده بحركة كاميرا مختلفة. يبقى باقي الإعلان، ويظهر السعر قبل التأكيد. صورتك الحقيقية ولقطات الشاشة تبقى كما هي.', button: 'إعادة هذا المشهد · {c} رصيد', ask: 'إعادة المشهد {n} مقابل {c} رصيد؟', yes: 'نعم، أعده', starting: 'جارٍ البدء…', cancel: 'إلغاء', note: 'جارٍ إعادة المشهد {n}. تبقى النسخة الأولى من إعلانك في فيديوهاتي.' },
  ur: { title: 'کوئی منظر پسند نہیں آیا؟', hint: 'صرف وہی منظر کیمرے کی دوسری حرکت کے ساتھ دوبارہ بنائیں۔ باقی اشتہار رہتا ہے، اور تصدیق سے پہلے قیمت دکھائی دیتی ہے۔ آپ کی اصل تصویر اور اسکرین شاٹس ویسے ہی رہتے ہیں۔', button: 'یہ منظر دوبارہ بنائیں · {c} کریڈٹس', ask: 'منظر {n} کو {c} کریڈٹس میں دوبارہ بنائیں؟', yes: 'ہاں، دوبارہ بنائیں', starting: 'شروع ہو رہا ہے…', cancel: 'منسوخ', note: 'منظر {n} دوبارہ بن رہا ہے۔ اشتہار کا پہلا ورژن میری ویڈیوز میں رہتا ہے۔' },
  hi: { title: 'कोई सीन पसंद नहीं आया?', hint: 'सिर्फ़ वही सीन, कैमरे की दूसरी मूवमेंट के साथ, दोबारा बनाएँ। बाकी विज्ञापन रहता है, और पुष्टि से पहले कीमत दिखती है। आपकी असली फ़ोटो और स्क्रीन वाले सीन वैसे ही रहते हैं।', button: 'यह सीन दोबारा बनाएँ · {c} क्रेडिट', ask: 'सीन {n} को {c} क्रेडिट में दोबारा बनाएँ?', yes: 'हाँ, दोबारा बनाएँ', starting: 'शुरू हो रहा है…', cancel: 'रद्द करें', note: 'सीन {n} दोबारा बन रहा है। विज्ञापन का पहला वर्ज़न मेरे वीडियो में रहता है।' },
  id: { title: 'Kurang suka satu adegan?', hint: 'Buat ulang adegan itu saja, dengan gerakan kamera lain. Bagian lain iklan tetap, dan harga terlihat sebelum Anda konfirmasi. Foto asli dan tangkapan layar Anda tidak diubah.', button: 'Buat ulang adegan ini · {c} kredit', ask: 'Buat ulang adegan {n} seharga {c} kredit?', yes: 'Ya, buat ulang', starting: 'Memulai…', cancel: 'Batal', note: 'Adegan {n} sedang dibuat ulang. Versi pertama iklan tetap ada di Video Saya.' },
  vi: { title: 'Chưa ưng một cảnh?', hint: 'Làm lại riêng cảnh đó với chuyển động máy quay khác. Phần còn lại của quảng cáo được giữ, và giá hiện trước khi bạn xác nhận. Ảnh thật và ảnh màn hình của bạn không bị đổi.', button: 'Làm lại cảnh này · {c} tín dụng', ask: 'Làm lại cảnh {n} với {c} tín dụng?', yes: 'Có, làm lại', starting: 'Đang bắt đầu…', cancel: 'Hủy', note: 'Đang làm lại cảnh {n}. Phiên bản đầu của quảng cáo vẫn ở Video của tôi.' },
}

export function adsV2RedoCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2RedoCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return ADS_V2_REDO_COPY[k] ?? EN
}

/** Preenche {n}/{c} (pura). */
export function adsV2RedoFill(template: string, vars: { n?: number; c?: number }): string {
  return String(template).split('{n}').join(String(vars.n ?? '')).split('{c}').join(String(vars.c ?? ''))
}

// ── KINEO-ADS-REFACAO-ATOR-1410 — a 1ª refação de cada anúncio entregue é GRÁTIS (lib/ads/v2FreeRedo.ts). As frases do
// botão e da confirmação nesse caso, nas 16 línguas (as de cima, com {c} créditos, continuam para as refações seguintes).
export interface AdsV2RedoFreeCopy {
  /** Botão da 1ª refação ("Refazer esta cena · grátis"). */
  button: string
  /** Confirmação: {n} = nº da cena. */
  ask: string
}

export const ADS_V2_REDO_FREE_COPY: Record<InterfaceLanguage, AdsV2RedoFreeCopy> = {
  en: { button: 'Redo this scene · free', ask: 'Redo scene {n} for free? Your first redo on this ad is on us.' },
  pt: { button: 'Refazer esta cena · grátis', ask: 'Refazer a cena {n} de graça? A primeira refação deste anúncio é por nossa conta.' },
  es: { button: 'Rehacer esta escena · gratis', ask: '¿Rehacer la escena {n} gratis? La primera vez que rehaces este anuncio corre por nuestra cuenta.' },
  fr: { button: 'Refaire cette scène · gratuit', ask: 'Refaire la scène {n} gratuitement ? La première refonte de cette pub est offerte.' },
  de: { button: 'Diese Szene neu machen · kostenlos', ask: 'Szene {n} kostenlos neu machen? Das erste Neumachen dieser Anzeige geht auf uns.' },
  it: { button: 'Rifai questa scena · gratis', ask: 'Rifare la scena {n} gratis? Il primo rifacimento di questo annuncio è offerto da noi.' },
  nl: { button: 'Deze scène opnieuw · gratis', ask: 'Scène {n} gratis opnieuw maken? De eerste keer opnieuw maken in deze advertentie is van ons.' },
  pl: { button: 'Zrób tę scenę ponownie · za darmo', ask: 'Zrobić ponownie scenę {n} za darmo? Pierwsza poprawka tej reklamy jest na nasz koszt.' },
  tr: { button: 'Bu sahneyi yeniden yap · ücretsiz', ask: 'Sahne {n} ücretsiz yeniden yapılsın mı? Bu reklamdaki ilk yeniden yapım bizden.' },
  ru: { button: 'Переделать сцену · бесплатно', ask: 'Переделать сцену {n} бесплатно? Первая переделка этой рекламы — за наш счёт.' },
  uk: { button: 'Переробити сцену · безкоштовно', ask: 'Переробити сцену {n} безкоштовно? Перша переробка цієї реклами — за наш рахунок.' },
  ar: { button: 'إعادة هذا المشهد · مجانًا', ask: 'إعادة المشهد {n} مجانًا؟ أول إعادة في هذا الإعلان على حسابنا.' },
  ur: { button: 'یہ منظر دوبارہ بنائیں · مفت', ask: 'منظر {n} مفت دوبارہ بنائیں؟ اس اشتہار کی پہلی دوبارہ تیاری ہماری طرف سے ہے۔' },
  hi: { button: 'यह सीन दोबारा बनाएँ · मुफ़्त', ask: 'सीन {n} मुफ़्त में दोबारा बनाएँ? इस विज्ञापन का पहला रीडू हमारी तरफ़ से है।' },
  id: { button: 'Buat ulang adegan ini · gratis', ask: 'Buat ulang adegan {n} gratis? Pembuatan ulang pertama di iklan ini kami tanggung.' },
  vi: { button: 'Làm lại cảnh này · miễn phí', ask: 'Làm lại cảnh {n} miễn phí? Lần làm lại đầu tiên của quảng cáo này do chúng tôi tặng.' },
}

/** As frases da refação grátis na língua da tela (língua desconhecida = inglês). */
export function adsV2RedoFreeCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2RedoFreeCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return ADS_V2_REDO_FREE_COPY[k] ?? ADS_V2_REDO_FREE_COPY.en
}
