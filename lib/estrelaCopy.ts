// KINEO-ESTRELA-DO-FILME-2026-09-29 — os textos NOVOS do bloco "Estrela do filme" do /studio nas 16 línguas da interface
// (lib/ui/interfaceLanguage.ts). Mesmo desenho do lib/clips/clipCopy.ts: a língua vem do contexto do site
// (useInterfaceLanguage), o dicionário mora aqui para não disputar lib/ui/refinementCopy.json com as sessões paralelas.
// As frases que o /images já traduz (autorização, "Add photo", "Remove photo", limites) seguem pelo <UiLabel> de sempre.
// Módulo puro: o guardião confere que as 15 línguas têm TODAS as chaves e os mesmos marcadores {n} {s}.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export const ESTRELA_COPY_EN = {
  title: 'Star of the film (optional)',
  help: 'Add 1–3 clear photos of one person’s face. That person becomes the hero of every scene where the protagonist appears.',
  price: '+{n} cr for the star at {s} s · 2 cr per 6 s of film',
  row: 'Star of the film',
  off: 'Star of the film works on Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 and Omni Flash.',
  uploadFailed: 'Photo upload failed. Please try again.',
} as const

export type EstrelaCopyKey = keyof typeof ESTRELA_COPY_EN
type Dict = Record<EstrelaCopyKey, string>

export const ESTRELA_COPY: Record<Exclude<InterfaceLanguage, 'en'>, Dict> = {
  pt: {
    title: 'Estrela do filme (opcional)',
    help: 'Adicione 1 a 3 fotos nítidas do rosto de uma pessoa. Ela vira a protagonista de toda cena em que o herói aparece.',
    price: '+{n} cr pela estrela em {s} s · 2 cr a cada 6 s de filme',
    row: 'Estrela do filme',
    off: 'A estrela do filme funciona no Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 e Omni Flash.',
    uploadFailed: 'Falha ao enviar a foto. Tente de novo.',
  },
  es: {
    title: 'Estrella de la película (opcional)',
    help: 'Añade de 1 a 3 fotos nítidas de la cara de una persona. Esa persona será el protagonista de cada escena en la que aparece el héroe.',
    price: '+{n} cr por la estrella en {s} s · 2 cr cada 6 s de película',
    row: 'Estrella de la película',
    off: 'La estrella de la película funciona en Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 y Omni Flash.',
    uploadFailed: 'No se pudo subir la foto. Inténtalo de nuevo.',
  },
  fr: {
    title: 'Star du film (facultatif)',
    help: 'Ajoutez 1 à 3 photos nettes du visage d’une personne. Elle devient le héros de chaque scène où apparaît le protagoniste.',
    price: '+{n} cr pour la star à {s} s · 2 cr par tranche de 6 s de film',
    row: 'Star du film',
    off: 'La star du film fonctionne sur Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 et Omni Flash.',
    uploadFailed: 'L’envoi de la photo a échoué. Réessayez.',
  },
  de: {
    title: 'Star des Films (optional)',
    help: 'Füge 1–3 scharfe Fotos vom Gesicht einer Person hinzu. Diese Person wird zur Hauptfigur in jeder Szene, in der der Held vorkommt.',
    price: '+{n} cr für den Star bei {s} s · 2 cr pro 6 s Film',
    row: 'Star des Films',
    off: 'Der Star des Films funktioniert mit Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 und Omni Flash.',
    uploadFailed: 'Foto-Upload fehlgeschlagen. Bitte versuche es erneut.',
  },
  it: {
    title: 'Star del film (facoltativo)',
    help: 'Aggiungi da 1 a 3 foto nitide del volto di una persona. Diventerà il protagonista di ogni scena in cui compare l’eroe.',
    price: '+{n} cr per la star a {s} s · 2 cr ogni 6 s di film',
    row: 'Star del film',
    off: 'La star del film funziona su Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 e Omni Flash.',
    uploadFailed: 'Caricamento della foto non riuscito. Riprova.',
  },
  nl: {
    title: 'Ster van de film (optioneel)',
    help: 'Voeg 1–3 scherpe foto’s van het gezicht van één persoon toe. Die persoon wordt de hoofdrol in elke scène waarin de held verschijnt.',
    price: '+{n} cr voor de ster bij {s} s · 2 cr per 6 s film',
    row: 'Ster van de film',
    off: 'De ster van de film werkt met Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 en Omni Flash.',
    uploadFailed: 'Foto uploaden mislukt. Probeer het opnieuw.',
  },
  pl: {
    title: 'Gwiazda filmu (opcjonalnie)',
    help: 'Dodaj 1–3 wyraźne zdjęcia twarzy jednej osoby. Ta osoba zostanie bohaterem każdej sceny, w której pojawia się protagonista.',
    price: '+{n} cr za gwiazdę przy {s} s · 2 cr za każde 6 s filmu',
    row: 'Gwiazda filmu',
    off: 'Gwiazda filmu działa w Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 i Omni Flash.',
    uploadFailed: 'Nie udało się przesłać zdjęcia. Spróbuj ponownie.',
  },
  tr: {
    title: 'Filmin yıldızı (isteğe bağlı)',
    help: 'Bir kişinin yüzünün 1–3 net fotoğrafını ekleyin. Bu kişi, kahramanın göründüğü her sahnenin başrolü olur.',
    price: '{s} sn için yıldız +{n} cr · filmin her 6 sn’si için 2 cr',
    row: 'Filmin yıldızı',
    off: 'Filmin yıldızı Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 ve Omni Flash ile çalışır.',
    uploadFailed: 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.',
  },
  ru: {
    title: 'Звезда фильма (необязательно)',
    help: 'Добавьте 1–3 чётких фото лица одного человека. Он станет главным героем каждой сцены, где появляется протагонист.',
    price: '+{n} cr за звезду при {s} с · 2 cr за каждые 6 с фильма',
    row: 'Звезда фильма',
    off: 'Звезда фильма работает в Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 и Omni Flash.',
    uploadFailed: 'Не удалось загрузить фото. Попробуйте ещё раз.',
  },
  uk: {
    title: 'Зірка фільму (необов’язково)',
    help: 'Додайте 1–3 чіткі фото обличчя однієї людини. Вона стане головним героєм кожної сцени, де з’являється протагоніст.',
    price: '+{n} cr за зірку при {s} с · 2 cr за кожні 6 с фільму',
    row: 'Зірка фільму',
    off: 'Зірка фільму працює в Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 і Omni Flash.',
    uploadFailed: 'Не вдалося завантажити фото. Спробуйте ще раз.',
  },
  ar: {
    title: 'نجم الفيلم (اختياري)',
    help: 'أضف من 1 إلى 3 صور واضحة لوجه شخص واحد. يصبح هذا الشخص بطل كل مشهد يظهر فيه البطل.',
    price: '+{n} cr للنجم في {s} ث · 2 cr لكل 6 ث من الفيلم',
    row: 'نجم الفيلم',
    off: 'يعمل نجم الفيلم على Seedance 1.5 وKling 2.5 وVeo 3.1 وKling 3 وMiniMax H3 وOmni Flash.',
    uploadFailed: 'تعذّر رفع الصورة. حاول مرة أخرى.',
  },
  ur: {
    title: 'فلم کا اسٹار (اختیاری)',
    help: 'ایک شخص کے چہرے کی 1 سے 3 واضح تصاویر شامل کریں۔ وہ شخص ہر اس منظر کا ہیرو بنے گا جس میں مرکزی کردار نظر آتا ہے۔',
    price: '{s} سیکنڈ پر اسٹار کے لیے +{n} cr · فلم کے ہر 6 سیکنڈ کے 2 cr',
    row: 'فلم کا اسٹار',
    off: 'فلم کا اسٹار Seedance 1.5، Kling 2.5، Veo 3.1، Kling 3، MiniMax H3 اور Omni Flash پر کام کرتا ہے۔',
    uploadFailed: 'تصویر اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
  },
  hi: {
    title: 'फ़िल्म का स्टार (वैकल्पिक)',
    help: 'एक व्यक्ति के चेहरे की 1–3 साफ़ फ़ोटो जोड़ें। वही व्यक्ति हर उस दृश्य का हीरो बनेगा जिसमें नायक दिखता है।',
    price: '{s} सेकंड पर स्टार के लिए +{n} cr · फ़िल्म के हर 6 सेकंड के 2 cr',
    row: 'फ़िल्म का स्टार',
    off: 'फ़िल्म का स्टार Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 और Omni Flash पर काम करता है।',
    uploadFailed: 'फ़ोटो अपलोड नहीं हो सकी। फिर से कोशिश करें।',
  },
  id: {
    title: 'Bintang film (opsional)',
    help: 'Tambahkan 1–3 foto wajah yang jelas dari satu orang. Orang itu menjadi pemeran utama di setiap adegan tempat sang tokoh muncul.',
    price: '+{n} cr untuk bintang pada {s} dtk · 2 cr per 6 dtk film',
    row: 'Bintang film',
    off: 'Bintang film tersedia di Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3, dan Omni Flash.',
    uploadFailed: 'Gagal mengunggah foto. Coba lagi.',
  },
  vi: {
    title: 'Ngôi sao của phim (không bắt buộc)',
    help: 'Thêm 1–3 ảnh rõ nét khuôn mặt của một người. Người đó sẽ là nhân vật chính trong mọi cảnh có nhân vật chính xuất hiện.',
    price: '+{n} cr cho ngôi sao ở {s} giây · 2 cr cho mỗi 6 giây phim',
    row: 'Ngôi sao của phim',
    off: 'Ngôi sao của phim dùng được với Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 và Omni Flash.',
    uploadFailed: 'Tải ảnh lên không thành công. Vui lòng thử lại.',
  },
}

/** Texto da chave na língua, com {n} {s} preenchidos. Chave sem tradução cai no inglês, nunca em branco. */
export function estrelaCopy(language: InterfaceLanguage, key: EstrelaCopyKey, vars: Record<string, string | number> = {}): string {
  const base = language === 'en' ? ESTRELA_COPY_EN[key] : (ESTRELA_COPY[language]?.[key] ?? ESTRELA_COPY_EN[key])
  return base.replace(/\{(n|s)\}/g, (_, k: string) => (vars[k] === undefined ? `{${k}}` : String(vars[k])))
}
