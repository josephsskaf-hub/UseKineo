// KINEO-UPSELL-FILME15-2610 — public copy only. The server owns the film snapshot and payment.
import { buyCreatorPrice } from '@/lib/growth/buyCreatorOffer'
import { FILM_COMPLETE_TARGET_SECONDS } from '@/lib/growth/filmComplete'
import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'
import { parseInterfaceLanguage, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

type Template = { title: string; body: string; button: string; monthly: string; intro: string }
const COPY: Record<InterfaceLanguage, Template> = {
  en: { title: 'The full version of your film', body: 'Same script and topic, expanded to {s} s. No watermark. Starts automatically after payment.', button: 'Make the full version — {s} s, no watermark', monthly: 'Creator {full}/month. Cancel anytime.', intro: 'Creator {first} first month, then {full}/month. Cancel anytime.' },
  pt: { title: 'A versão completa do seu filme', body: 'Mesmo roteiro e tema, ampliados para {s} s. Sem marca. Começa automaticamente depois do pagamento.', button: 'Fazer a versão completa — {s} s, sem marca', monthly: 'Creator {full}/mês. Cancele quando quiser.', intro: 'Creator {first} no primeiro mês, depois {full}/mês. Cancele quando quiser.' },
  es: { title: 'La versión completa de tu película', body: 'El mismo guion y tema, ampliados a {s} s. Sin marca de agua. Empieza automáticamente después del pago.', button: 'Hacer la versión completa — {s} s, sin marca', monthly: 'Creator {full}/mes. Cancela cuando quieras.', intro: 'Creator {first} el primer mes, después {full}/mes. Cancela cuando quieras.' },
  fr: { title: 'La version complète de votre film', body: 'Même scénario et même sujet, développés en {s} s. Sans filigrane. Démarrage automatique après le paiement.', button: 'Créer la version complète — {s} s, sans filigrane', monthly: 'Creator {full}/mois. Résiliable à tout moment.', intro: 'Creator {first} le premier mois, puis {full}/mois. Résiliable à tout moment.' },
  de: { title: 'Die vollständige Version deines Films', body: 'Gleiches Drehbuch und Thema, erweitert auf {s} s. Ohne Wasserzeichen. Startet automatisch nach der Zahlung.', button: 'Vollständige Version erstellen — {s} s, ohne Wasserzeichen', monthly: 'Creator {full}/Monat. Jederzeit kündbar.', intro: 'Creator {first} im ersten Monat, danach {full}/Monat. Jederzeit kündbar.' },
  it: { title: 'La versione completa del tuo film', body: 'Stesso copione e argomento, ampliati a {s} s. Senza filigrana. Parte automaticamente dopo il pagamento.', button: 'Crea la versione completa — {s} s, senza filigrana', monthly: 'Creator {full}/mese. Disdici quando vuoi.', intro: 'Creator {first} il primo mese, poi {full}/mese. Disdici quando vuoi.' },
  nl: { title: 'De volledige versie van je film', body: 'Hetzelfde script en onderwerp, uitgebreid naar {s} s. Zonder watermerk. Start automatisch na betaling.', button: 'Maak de volledige versie — {s} s, zonder watermerk', monthly: 'Creator {full}/maand. Altijd opzegbaar.', intro: 'Creator {first} de eerste maand, daarna {full}/maand. Altijd opzegbaar.' },
  pl: { title: 'Pełna wersja Twojego filmu', body: 'Ten sam scenariusz i temat, rozwinięte do {s} s. Bez znaku wodnego. Startuje automatycznie po płatności.', button: 'Utwórz pełną wersję — {s} s, bez znaku wodnego', monthly: 'Creator {full}/mies. Możesz anulować w każdej chwili.', intro: 'Creator {first} za pierwszy miesiąc, potem {full}/mies. Możesz anulować w każdej chwili.' },
  tr: { title: 'Filminin tam sürümü', body: 'Aynı senaryo ve konu, {s} saniyeye genişletilir. Filigran yok. Ödemeden sonra otomatik başlar.', button: 'Tam sürümü oluştur — {s} sn, filigransız', monthly: 'Creator {full}/ay. İstediğin zaman iptal et.', intro: 'Creator ilk ay {first}, sonra {full}/ay. İstediğin zaman iptal et.' },
  ru: { title: 'Полная версия вашего фильма', body: 'Тот же сценарий и тема, расширенные до {s} с. Без водяного знака. Автоматический запуск после оплаты.', button: 'Создать полную версию — {s} с, без водяного знака', monthly: 'Creator {full}/мес. Отмена в любое время.', intro: 'Creator {first} за первый месяц, затем {full}/мес. Отмена в любое время.' },
  uk: { title: 'Повна версія вашого фільму', body: 'Той самий сценарій і тема, розширені до {s} с. Без водяного знака. Автоматичний запуск після оплати.', button: 'Створити повну версію — {s} с, без водяного знака', monthly: 'Creator {full}/міс. Скасування будь-коли.', intro: 'Creator {first} за перший місяць, потім {full}/міс. Скасування будь-коли.' },
  ar: { title: 'النسخة الكاملة من فيلمك', body: 'نفس النص والموضوع، مع التوسيع إلى {s} ثانية. بدون علامة مائية. يبدأ تلقائيًا بعد الدفع.', button: 'أنشئ النسخة الكاملة — {s} ثانية، بدون علامة مائية', monthly: 'Creator بسعر {full} شهريًا. يمكنك الإلغاء في أي وقت.', intro: 'Creator بسعر {first} للشهر الأول، ثم {full} شهريًا. يمكنك الإلغاء في أي وقت.' },
  ur: { title: 'آپ کی فلم کا مکمل ورژن', body: 'وہی اسکرپٹ اور موضوع، {s} سیکنڈ تک بڑھایا جائے گا۔ واٹر مارک کے بغیر۔ ادائیگی کے بعد خودکار طور پر شروع ہوگا۔', button: 'مکمل ورژن بنائیں — {s} سیکنڈ، واٹر مارک کے بغیر', monthly: 'Creator {full} ماہانہ۔ جب چاہیں منسوخ کریں۔', intro: 'Creator پہلے مہینے {first}، پھر {full} ماہانہ۔ جب چاہیں منسوخ کریں۔' },
  hi: { title: 'आपकी फ़िल्म का पूरा वर्ज़न', body: 'वही स्क्रिप्ट और विषय, {s} सेकंड तक बढ़ाए जाएँगे। बिना वॉटरमार्क। भुगतान के बाद अपने आप शुरू होगा।', button: 'पूरा वर्ज़न बनाएँ — {s} सेकंड, बिना वॉटरमार्क', monthly: 'Creator {full}/महीना। कभी भी रद्द करें।', intro: 'Creator पहले महीने {first}, फिर {full}/महीना। कभी भी रद्द करें।' },
  id: { title: 'Versi lengkap filmmu', body: 'Naskah dan topik yang sama, dikembangkan menjadi {s} dtk. Tanpa watermark. Mulai otomatis setelah pembayaran.', button: 'Buat versi lengkap — {s} dtk, tanpa watermark', monthly: 'Creator {full}/bulan. Batalkan kapan saja.', intro: 'Creator {first} bulan pertama, lalu {full}/bulan. Batalkan kapan saja.' },
  vi: { title: 'Phiên bản đầy đủ của phim bạn', body: 'Cùng kịch bản và chủ đề, mở rộng thành {s} giây. Không watermark. Tự động bắt đầu sau khi thanh toán.', button: 'Tạo bản đầy đủ — {s} giây, không watermark', monthly: 'Creator {full}/tháng. Hủy bất cứ lúc nào.', intro: 'Creator {first} tháng đầu, sau đó {full}/tháng. Hủy bất cứ lúc nào.' },
}

export function filmCompleteCopy(language: unknown = 'en', welcomeLive = WELCOME20_SITE_OFFER_LIVE) {
  const template = COPY[parseInterfaceLanguage(language)]
  const price = buyCreatorPrice(welcomeLive)
  const vars: Record<string, string | number> = { s: FILM_COMPLETE_TARGET_SECONDS, full: price.full, first: price.firstMonth ?? price.full }
  const fill = (value: string) => value.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match))
  return { title: fill(template.title), body: fill(template.body), button: fill(template.button), billing: fill(price.firstMonth ? template.intro : template.monthly) }
}

/** The email has only the film id; its script is read from the owner's saved film on the server. */
export function filmCompleteCheckoutHref(videoId: string, surface: 'film_ready' | 'email'): string {
  return `/api/film-complete/checkout?${new URLSearchParams({ v: videoId, surface }).toString()}`
}

export function filmCompleteEmailHref(appUrl: string, videoId: string): string {
  return `${appUrl.replace(/\/$/, '')}${filmCompleteCheckoutHref(videoId, 'email')}`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}

/** Shared by the immediate delivery email and its existing delayed nudge. No sending or eligibility here. */
export function filmCompleteEmail(input: { appUrl: string; videoId: string; language?: string; dark?: boolean; welcomeLive?: boolean }) {
  // A delivery email does not know this person's discount deadline. Show the regular plan price;
  // checkout may still apply an eligible discount, using the existing server rules.
  const copy = filmCompleteCopy(input.language, input.welcomeLive ?? false)
  const href = filmCompleteEmailHref(input.appUrl, input.videoId)
  const text = `\n${copy.title}\n${copy.body}\n${copy.billing}\n${copy.button}: ${href}\n`
  const html = `<div data-kineo="film15-full-email" style="border:2px solid #2997ff;border-radius:12px;padding:16px;margin:18px 0 16px;">
  <p style="margin:0 0 8px;font-weight:700;font-size:16px;color:${input.dark ? '#ffffff' : '#111111'}">${escapeHtml(copy.title)}</p>
  <p style="margin:0 0 12px;font-size:14px;color:${input.dark ? '#cbd5e1' : '#475569'}">${escapeHtml(copy.body)}</p>
  <p style="margin:0 0 14px;font-size:13px;color:${input.dark ? '#cbd5e1' : '#475569'}">${escapeHtml(copy.billing)}</p>
  <a href="${escapeHtml(href)}" style="display:block;background:#2997ff;color:#ffffff;text-decoration:none;text-align:center;font-weight:700;font-size:14px;line-height:1.45;padding:12px 16px;border-radius:10px;">${escapeHtml(copy.button)}</a>
</div>`
  return { html, text }
}
