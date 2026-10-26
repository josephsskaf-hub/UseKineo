import { parseInterfaceLanguage, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

type AffiliateCopy = { firstMonth: string; via: string; fallback: string; scope: string }

/** Same sixteen languages as the existing interface; partner-authored names stay untouched. */
export const AFFILIATE_OFFER_COPY: Record<InterfaceLanguage, AffiliateCopy> = {
  en: { firstMonth: '50% off your first month', via: 'via', fallback: 'via your partner link', scope: 'Creator and Studio monthly plans. Full monthly price from month two. Cannot be combined with another discount.' },
  pt: { firstMonth: '50% de desconto no primeiro mês', via: 'via', fallback: 'pelo seu link de parceiro', scope: 'Planos mensais Creator e Studio. Preço mensal integral a partir do segundo mês. Não acumulável com outro desconto.' },
  es: { firstMonth: '50% de descuento en tu primer mes', via: 'a través de', fallback: 'a través de tu enlace de socio', scope: 'Planes mensuales Creator y Studio. Precio mensual completo a partir del segundo mes. No se puede combinar con otro descuento.' },
  hi: { firstMonth: 'पहले महीने पर 50% की छूट', via: 'के ज़रिए:', fallback: 'आपके पार्टनर लिंक के ज़रिए', scope: 'Creator और Studio के मासिक प्लान। दूसरे महीने से पूरा मासिक मूल्य। किसी अन्य छूट के साथ लागू नहीं।' },
  fr: { firstMonth: '50 % de réduction sur votre premier mois', via: 'via', fallback: 'via votre lien partenaire', scope: 'Abonnements mensuels Creator et Studio. Tarif mensuel normal à partir du deuxième mois. Non cumulable avec une autre réduction.' },
  de: { firstMonth: '50 % Rabatt auf deinen ersten Monat', via: 'über', fallback: 'über deinen Partnerlink', scope: 'Monatliche Creator- und Studio-Abos. Ab dem zweiten Monat gilt der volle Monatspreis. Nicht mit anderen Rabatten kombinierbar.' },
  it: { firstMonth: '50% di sconto sul primo mese', via: 'tramite', fallback: 'tramite il tuo link partner', scope: 'Piani mensili Creator e Studio. Prezzo mensile intero dal secondo mese. Non cumulabile con altri sconti.' },
  nl: { firstMonth: '50% korting op je eerste maand', via: 'via', fallback: 'via je partnerlink', scope: 'Maandabonnementen Creator en Studio. Vanaf de tweede maand geldt de volledige maandprijs. Niet te combineren met andere kortingen.' },
  pl: { firstMonth: '50% zniżki na pierwszy miesiąc', via: 'przez', fallback: 'przez Twój link partnerski', scope: 'Miesięczne plany Creator i Studio. Od drugiego miesiąca pełna cena miesięczna. Nie łączy się z innymi zniżkami.' },
  tr: { firstMonth: 'İlk ayınızda %50 indirim', via: 'aracılığıyla:', fallback: 'iş ortağı bağlantınız aracılığıyla', scope: 'Creator ve Studio aylık planları. İkinci aydan itibaren tam aylık ücret. Başka bir indirimle birleştirilemez.' },
  ru: { firstMonth: 'Скидка 50% на первый месяц', via: 'через', fallback: 'по вашей партнёрской ссылке', scope: 'Месячные планы Creator и Studio. Со второго месяца полная месячная стоимость. Не суммируется с другими скидками.' },
  uk: { firstMonth: 'Знижка 50% на перший місяць', via: 'через', fallback: 'за вашим партнерським посиланням', scope: 'Місячні плани Creator і Studio. З другого місяця повна місячна вартість. Не поєднується з іншими знижками.' },
  ar: { firstMonth: 'خصم 50% على شهرك الأول', via: 'عبر', fallback: 'عبر رابط شريكك', scope: 'خطتا Creator وStudio الشهريتان. السعر الشهري الكامل من الشهر الثاني. لا يمكن الجمع مع خصم آخر.' },
  ur: { firstMonth: 'پہلے مہینے پر 50% رعایت', via: 'کے ذریعے:', fallback: 'آپ کے پارٹنر لنک کے ذریعے', scope: 'Creator اور Studio کے ماہانہ پلان۔ دوسرے مہینے سے مکمل ماہانہ قیمت۔ کسی دوسری رعایت کے ساتھ قابلِ اطلاق نہیں۔' },
  id: { firstMonth: 'Diskon 50% untuk bulan pertama', via: 'melalui', fallback: 'melalui tautan mitra Anda', scope: 'Paket bulanan Creator dan Studio. Harga bulanan penuh mulai bulan kedua. Tidak dapat digabungkan dengan diskon lain.' },
  vi: { firstMonth: 'Giảm 50% cho tháng đầu tiên', via: 'qua', fallback: 'qua liên kết đối tác của bạn', scope: 'Gói Creator và Studio hằng tháng. Giá đầy đủ từ tháng thứ hai. Không áp dụng cùng ưu đãi khác.' },
}

function languageCode(language: string): InterfaceLanguage {
  return parseInterfaceLanguage(language.trim().toLowerCase().split(/[-_,;]/)[0])
}

export function affiliateOfferCopy(language: string, partnerName: string | null): string {
  const copy = AFFILIATE_OFFER_COPY[languageCode(language)]
  return `${copy.firstMonth} — ${partnerName ? `${copy.via} ${partnerName}` : copy.fallback}`
}

export function affiliateOfferScopeCopy(language: string): string {
  return AFFILIATE_OFFER_COPY[languageCode(language)].scope
}
