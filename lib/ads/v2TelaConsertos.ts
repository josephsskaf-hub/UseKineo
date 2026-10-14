// KINEO-ADS-CONSERTOS-TELA-1410 — as frases novas da tela do anúncio (modo simples) achadas no QA de 14/10 (foto de perfume +
// "perfume num hotel com chuva"), nas 16 línguas da interface (nenhuma cai no inglês):
//   · o cartão final sem chamada: sem contato e sem link, o cartão saía só com o nome ("Perfume" no marrom) — o aviso no
//     cartão de revisão com o atalho para o campo de contato;
//   · a voz: quando nem o detector de sempre nem o da frase curta têm certeza da língua, a linha ao lado do seletor "Voz em"
//     diz em que língua a narração vai sair.
// LIB PURA (só `import type`).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2TelaConsertosCopy {
  /** o cartão final está sem chamada para ação */
  noCta: string
  /** o botão que abre "Mais" e leva ao campo de contato */
  noCtaAdd: string
  /** "a narração sai em {lang}" — com o seletor logo ao lado */
  voiceCheck: string
}

export const ADS_V2_TELA_CONSERTOS_COPY: Record<InterfaceLanguage, AdsV2TelaConsertosCopy> = {
  en: { noCta: 'Your end card has no call to action — add your site or WhatsApp.', noCtaAdd: 'Add contact', voiceCheck: 'The voice will speak {lang}. Change it here if your ad is in another language.' },
  pt: { noCta: 'Seu cartão final está sem chamada para ação — coloque seu site ou WhatsApp.', noCtaAdd: 'Adicionar contato', voiceCheck: 'A voz vai falar em {lang}. Troque aqui se o seu anúncio for em outra língua.' },
  es: { noCta: 'Tu tarjeta final no tiene llamada a la acción: añade tu sitio web o WhatsApp.', noCtaAdd: 'Añadir contacto', voiceCheck: 'La voz hablará en {lang}. Cámbialo aquí si tu anuncio está en otro idioma.' },
  fr: { noCta: "Votre carte finale n'a pas d'appel à l'action — ajoutez votre site ou WhatsApp.", noCtaAdd: 'Ajouter un contact', voiceCheck: "La voix parlera en {lang}. Changez-la ici si votre pub est dans une autre langue." },
  de: { noCta: 'Deine Endkarte hat keinen Call-to-Action – füge deine Website oder WhatsApp hinzu.', noCtaAdd: 'Kontakt hinzufügen', voiceCheck: 'Die Stimme spricht {lang}. Ändere es hier, wenn deine Anzeige in einer anderen Sprache ist.' },
  it: { noCta: 'La tua scheda finale non ha una call to action: aggiungi il tuo sito o WhatsApp.', noCtaAdd: 'Aggiungi contatto', voiceCheck: 'La voce parlerà in {lang}. Cambiala qui se il tuo annuncio è in un’altra lingua.' },
  nl: { noCta: 'Je eindkaart heeft geen call-to-action — voeg je website of WhatsApp toe.', noCtaAdd: 'Contact toevoegen', voiceCheck: 'De stem spreekt {lang}. Wijzig het hier als je advertentie in een andere taal is.' },
  pl: { noCta: 'Twoja karta końcowa nie ma wezwania do działania — dodaj stronę lub WhatsApp.', noCtaAdd: 'Dodaj kontakt', voiceCheck: 'Głos będzie mówił w języku: {lang}. Zmień to tutaj, jeśli reklama jest w innym języku.' },
  tr: { noCta: 'Kapanış kartında harekete geçirici mesaj yok — sitenizi veya WhatsApp numaranızı ekleyin.', noCtaAdd: 'İletişim ekle', voiceCheck: 'Ses {lang} konuşacak. Reklamınız başka bir dildeyse buradan değiştirin.' },
  ru: { noCta: 'В финальной карточке нет призыва к действию — добавьте сайт или WhatsApp.', noCtaAdd: 'Добавить контакт', voiceCheck: 'Голос будет говорить на языке: {lang}. Измените здесь, если реклама на другом языке.' },
  uk: { noCta: 'У фінальній картці немає заклику до дії — додайте сайт або WhatsApp.', noCtaAdd: 'Додати контакт', voiceCheck: 'Голос говоритиме мовою: {lang}. Змініть тут, якщо реклама іншою мовою.' },
  ar: { noCta: 'بطاقتك الختامية بلا دعوة لاتخاذ إجراء — أضف موقعك أو واتساب.', noCtaAdd: 'إضافة جهة اتصال', voiceCheck: 'سيتحدث الصوت بلغة: {lang}. غيّرها هنا إذا كان إعلانك بلغة أخرى.' },
  ur: { noCta: 'آپ کے آخری کارڈ پر کوئی کال ٹو ایکشن نہیں — اپنی ویب سائٹ یا واٹس ایپ شامل کریں۔', noCtaAdd: 'رابطہ شامل کریں', voiceCheck: 'آواز {lang} میں بولے گی۔ اگر آپ کا اشتہار کسی اور زبان میں ہے تو یہاں بدلیں۔' },
  hi: { noCta: 'आपके आख़िरी कार्ड पर कोई कॉल टू ऐक्शन नहीं है — अपनी वेबसाइट या WhatsApp जोड़ें।', noCtaAdd: 'संपर्क जोड़ें', voiceCheck: 'आवाज़ {lang} में बोलेगी। अगर आपका विज्ञापन किसी और भाषा में है तो यहाँ बदलें।' },
  id: { noCta: 'Kartu penutup Anda belum punya ajakan bertindak — tambahkan situs atau WhatsApp Anda.', noCtaAdd: 'Tambah kontak', voiceCheck: 'Suara akan berbicara dalam {lang}. Ubah di sini jika iklan Anda dalam bahasa lain.' },
  vi: { noCta: 'Thẻ kết thúc của bạn chưa có lời kêu gọi hành động — hãy thêm trang web hoặc WhatsApp.', noCtaAdd: 'Thêm liên hệ', voiceCheck: 'Giọng đọc sẽ nói {lang}. Đổi tại đây nếu quảng cáo của bạn bằng ngôn ngữ khác.' },
}

/** As frases na língua da interface (língua desconhecida = inglês). */
export function adsV2TelaConsertosCopy(language: InterfaceLanguage | string | null | undefined): AdsV2TelaConsertosCopy {
  return (typeof language === 'string' && (ADS_V2_TELA_CONSERTOS_COPY as Record<string, AdsV2TelaConsertosCopy>)[language]) || ADS_V2_TELA_CONSERTOS_COPY.en
}
