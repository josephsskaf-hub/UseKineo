// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — o texto da refação grátis nas 16
// línguas da interface (as mesmas da biblioteca). Curto e honesto: "1 refação grátis por vídeo". Lib pura.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface FreeRedoCopy {
  button: string
  hint: string
  pick: string
  scene: string
  confirm: string
  cancel: string
  working: string
  done: string
  open: string
  previous: string
  retry: string
  failed: string
  cap: string
  unavailable: string
}

const EN: FreeRedoCopy = {
  button: 'Redo one scene (free, 1×)',
  hint: '1 free redo per video. Pick the scene you did not like: we film it again with the same voice and rebuild the film.',
  pick: 'Which scene should we redo?',
  scene: 'Scene {n}',
  confirm: 'Redo this scene for free',
  cancel: 'Cancel',
  working: 'Redoing the scene… about 3 to 5 minutes. You can leave this page.',
  done: 'New version ready',
  open: 'Watch the new version',
  previous: 'The previous version stays in your library.',
  retry: 'Try again (free)',
  failed: 'The redo did not work this time. Your free redo is still available.',
  cap: 'Free redos are full for today. Try again tomorrow.',
  unavailable: 'This video cannot get a scene redo.',
}

export const FREE_REDO_COPY: Record<InterfaceLanguage, FreeRedoCopy> = {
  en: EN,
  pt: { button: 'Refazer uma cena (grátis, 1×)', hint: '1 refação grátis por vídeo. Escolha a cena que não gostou: filmamos de novo com a mesma voz e remontamos o filme.', pick: 'Qual cena vamos refazer?', scene: 'Cena {n}', confirm: 'Refazer esta cena grátis', cancel: 'Cancelar', working: 'Refazendo a cena… cerca de 3 a 5 minutos. Pode sair desta página.', done: 'Versão nova pronta', open: 'Ver a versão nova', previous: 'A versão anterior continua na sua biblioteca.', retry: 'Tentar de novo (grátis)', failed: 'A refação não deu certo desta vez. Sua refação grátis continua disponível.', cap: 'As refações grátis de hoje acabaram. Tente amanhã.', unavailable: 'Este vídeo não pode ter uma cena refeita.' },
  es: { button: 'Rehacer una escena (gratis, 1×)', hint: '1 rehecho gratis por video. Elige la escena que no te gustó: la filmamos de nuevo con la misma voz y rearmamos el video.', pick: '¿Qué escena rehacemos?', scene: 'Escena {n}', confirm: 'Rehacer esta escena gratis', cancel: 'Cancelar', working: 'Rehaciendo la escena… unos 3 a 5 minutos. Puedes salir de esta página.', done: 'Nueva versión lista', open: 'Ver la nueva versión', previous: 'La versión anterior sigue en tu biblioteca.', retry: 'Intentar de nuevo (gratis)', failed: 'El rehecho no funcionó esta vez. Tu rehecho gratis sigue disponible.', cap: 'Los rehechos gratis de hoy se agotaron. Inténtalo mañana.', unavailable: 'Este video no puede rehacer una escena.' },
  fr: { button: 'Refaire une scène (gratuit, 1×)', hint: '1 reprise gratuite par vidéo. Choisissez la scène qui ne vous plaît pas : nous la refilmons avec la même voix et remontons le film.', pick: 'Quelle scène refaire ?', scene: 'Scène {n}', confirm: 'Refaire cette scène gratuitement', cancel: 'Annuler', working: 'Scène en cours de reprise… environ 3 à 5 minutes. Vous pouvez quitter cette page.', done: 'Nouvelle version prête', open: 'Voir la nouvelle version', previous: 'La version précédente reste dans votre bibliothèque.', retry: 'Réessayer (gratuit)', failed: 'La reprise n’a pas fonctionné cette fois. Votre reprise gratuite reste disponible.', cap: 'Les reprises gratuites du jour sont épuisées. Réessayez demain.', unavailable: 'Cette vidéo ne peut pas refaire de scène.' },
  de: { button: 'Eine Szene neu machen (gratis, 1×)', hint: '1 kostenlose Wiederholung pro Video. Wählen Sie die Szene, die Ihnen nicht gefällt: Wir drehen sie mit derselben Stimme neu und schneiden den Film neu.', pick: 'Welche Szene sollen wir neu machen?', scene: 'Szene {n}', confirm: 'Diese Szene gratis neu machen', cancel: 'Abbrechen', working: 'Szene wird neu gemacht… etwa 3 bis 5 Minuten. Sie können die Seite verlassen.', done: 'Neue Version fertig', open: 'Neue Version ansehen', previous: 'Die vorherige Version bleibt in Ihrer Bibliothek.', retry: 'Erneut versuchen (gratis)', failed: 'Die Wiederholung hat diesmal nicht geklappt. Ihre kostenlose Wiederholung bleibt verfügbar.', cap: 'Die kostenlosen Wiederholungen für heute sind aufgebraucht. Versuchen Sie es morgen.', unavailable: 'Für dieses Video ist keine Szenenwiederholung möglich.' },
  it: { button: 'Rifai una scena (gratis, 1×)', hint: '1 rifacimento gratis per video. Scegli la scena che non ti piace: la rigiriamo con la stessa voce e rimontiamo il video.', pick: 'Quale scena rifacciamo?', scene: 'Scena {n}', confirm: 'Rifai questa scena gratis', cancel: 'Annulla', working: 'Stiamo rifacendo la scena… circa 3-5 minuti. Puoi lasciare questa pagina.', done: 'Nuova versione pronta', open: 'Guarda la nuova versione', previous: 'La versione precedente resta nella tua libreria.', retry: 'Riprova (gratis)', failed: 'Il rifacimento non è riuscito questa volta. Il tuo rifacimento gratis è ancora disponibile.', cap: 'I rifacimenti gratis di oggi sono finiti. Riprova domani.', unavailable: 'Questo video non può rifare una scena.' },
  nl: { button: 'Eén scène opnieuw (gratis, 1×)', hint: '1 gratis herkansing per video. Kies de scène die je niet mooi vond: we filmen hem opnieuw met dezelfde stem en monteren de film opnieuw.', pick: 'Welke scène doen we opnieuw?', scene: 'Scène {n}', confirm: 'Deze scène gratis opnieuw', cancel: 'Annuleren', working: 'Scène wordt opnieuw gemaakt… ongeveer 3 tot 5 minuten. Je kunt deze pagina verlaten.', done: 'Nieuwe versie klaar', open: 'Bekijk de nieuwe versie', previous: 'De vorige versie blijft in je bibliotheek.', retry: 'Opnieuw proberen (gratis)', failed: 'Het lukte deze keer niet. Je gratis herkansing blijft beschikbaar.', cap: 'De gratis herkansingen van vandaag zijn op. Probeer het morgen.', unavailable: 'Voor deze video kan geen scène opnieuw.' },
  pl: { button: 'Popraw jedną scenę (za darmo, 1×)', hint: '1 darmowa poprawka na film. Wybierz scenę, która Ci się nie podoba: nakręcimy ją ponownie tym samym głosem i zmontujemy film.', pick: 'Którą scenę poprawić?', scene: 'Scena {n}', confirm: 'Popraw tę scenę za darmo', cancel: 'Anuluj', working: 'Poprawiamy scenę… około 3–5 minut. Możesz opuścić tę stronę.', done: 'Nowa wersja gotowa', open: 'Obejrzyj nową wersję', previous: 'Poprzednia wersja zostaje w Twojej bibliotece.', retry: 'Spróbuj ponownie (za darmo)', failed: 'Tym razem się nie udało. Twoja darmowa poprawka jest nadal dostępna.', cap: 'Darmowe poprawki na dziś się skończyły. Spróbuj jutro.', unavailable: 'W tym filmie nie można poprawić sceny.' },
  tr: { button: 'Bir sahneyi yeniden yap (ücretsiz, 1×)', hint: 'Video başına 1 ücretsiz yeniden yapım. Beğenmediğiniz sahneyi seçin: aynı sesle yeniden çekip filmi yeniden kurgularız.', pick: 'Hangi sahneyi yeniden yapalım?', scene: 'Sahne {n}', confirm: 'Bu sahneyi ücretsiz yeniden yap', cancel: 'İptal', working: 'Sahne yeniden yapılıyor… yaklaşık 3-5 dakika. Bu sayfadan ayrılabilirsiniz.', done: 'Yeni sürüm hazır', open: 'Yeni sürümü izle', previous: 'Önceki sürüm kitaplığınızda kalır.', retry: 'Tekrar dene (ücretsiz)', failed: 'Bu sefer olmadı. Ücretsiz yeniden yapım hakkınız duruyor.', cap: 'Bugünün ücretsiz yeniden yapımları doldu. Yarın tekrar deneyin.', unavailable: 'Bu videoda sahne yeniden yapılamaz.' },
  ru: { button: 'Переснять одну сцену (бесплатно, 1×)', hint: '1 бесплатная переделка на видео. Выберите сцену, которая не понравилась: мы переснимем её с тем же голосом и пересоберём фильм.', pick: 'Какую сцену переснять?', scene: 'Сцена {n}', confirm: 'Переснять эту сцену бесплатно', cancel: 'Отмена', working: 'Пересъёмка сцены… около 3–5 минут. Можно уйти со страницы.', done: 'Новая версия готова', open: 'Смотреть новую версию', previous: 'Прежняя версия остаётся в вашей библиотеке.', retry: 'Попробовать снова (бесплатно)', failed: 'В этот раз не получилось. Бесплатная переделка всё ещё доступна.', cap: 'Бесплатные переделки на сегодня закончились. Попробуйте завтра.', unavailable: 'Для этого видео пересъёмка сцены недоступна.' },
  uk: { button: 'Перезняти одну сцену (безкоштовно, 1×)', hint: '1 безкоштовна переробка на відео. Оберіть сцену, яка не сподобалася: ми перезнімемо її тим самим голосом і перезберемо фільм.', pick: 'Яку сцену перезняти?', scene: 'Сцена {n}', confirm: 'Перезняти цю сцену безкоштовно', cancel: 'Скасувати', working: 'Перезйомка сцени… близько 3–5 хвилин. Можна залишити сторінку.', done: 'Нова версія готова', open: 'Дивитися нову версію', previous: 'Попередня версія залишається у вашій бібліотеці.', retry: 'Спробувати знову (безкоштовно)', failed: 'Цього разу не вийшло. Безкоштовна переробка досі доступна.', cap: 'Безкоштовні переробки на сьогодні закінчилися. Спробуйте завтра.', unavailable: 'Для цього відео перезйомка сцени недоступна.' },
  ar: { button: 'إعادة مشهد واحد (مجانًا، مرة واحدة)', hint: 'إعادة مجانية واحدة لكل فيديو. اختر المشهد الذي لم يعجبك: نصوّره من جديد بنفس الصوت ونعيد تركيب الفيلم.', pick: 'أي مشهد نعيد؟', scene: 'المشهد {n}', confirm: 'أعد هذا المشهد مجانًا', cancel: 'إلغاء', working: 'جارٍ إعادة المشهد… من 3 إلى 5 دقائق تقريبًا. يمكنك مغادرة هذه الصفحة.', done: 'النسخة الجديدة جاهزة', open: 'شاهد النسخة الجديدة', previous: 'تبقى النسخة السابقة في مكتبتك.', retry: 'حاول مرة أخرى (مجانًا)', failed: 'لم تنجح الإعادة هذه المرة. إعادتك المجانية ما زالت متاحة.', cap: 'انتهت الإعادات المجانية لليوم. حاول غدًا.', unavailable: 'لا يمكن إعادة مشهد في هذا الفيديو.' },
  ur: { button: 'ایک منظر دوبارہ بنائیں (مفت، 1×)', hint: 'ہر ویڈیو پر 1 مفت دوبارہ کوشش۔ جو منظر پسند نہیں آیا وہ چنیں: ہم اسے اسی آواز کے ساتھ دوبارہ فلمائیں گے اور فلم دوبارہ جوڑیں گے۔', pick: 'کون سا منظر دوبارہ بنائیں؟', scene: 'منظر {n}', confirm: 'یہ منظر مفت دوبارہ بنائیں', cancel: 'منسوخ کریں', working: 'منظر دوبارہ بن رہا ہے… تقریباً 3 سے 5 منٹ۔ آپ یہ صفحہ چھوڑ سکتے ہیں۔', done: 'نیا ورژن تیار ہے', open: 'نیا ورژن دیکھیں', previous: 'پچھلا ورژن آپ کی لائبریری میں رہتا ہے۔', retry: 'دوبارہ کوشش کریں (مفت)', failed: 'اس بار کام نہیں بنا۔ آپ کی مفت دوبارہ کوشش ابھی باقی ہے۔', cap: 'آج کی مفت کوششیں ختم ہو گئیں۔ کل دوبارہ کوشش کریں۔', unavailable: 'اس ویڈیو میں منظر دوبارہ نہیں بن سکتا۔' },
  hi: { button: 'एक सीन दोबारा बनाएँ (मुफ़्त, 1×)', hint: 'हर वीडियो पर 1 मुफ़्त रीडू। जो सीन पसंद नहीं आया उसे चुनें: हम उसी आवाज़ के साथ उसे दोबारा फ़िल्माकर फ़िल्म फिर से जोड़ देंगे।', pick: 'कौन-सा सीन दोबारा बनाएँ?', scene: 'सीन {n}', confirm: 'यह सीन मुफ़्त में दोबारा बनाएँ', cancel: 'रद्द करें', working: 'सीन दोबारा बन रहा है… लगभग 3 से 5 मिनट। आप यह पेज छोड़ सकते हैं।', done: 'नया वर्ज़न तैयार है', open: 'नया वर्ज़न देखें', previous: 'पिछला वर्ज़न आपकी लाइब्रेरी में रहता है।', retry: 'फिर कोशिश करें (मुफ़्त)', failed: 'इस बार रीडू नहीं हो पाया। आपका मुफ़्त रीडू अभी बाकी है।', cap: 'आज के मुफ़्त रीडू ख़त्म हो गए। कल फिर कोशिश करें।', unavailable: 'इस वीडियो में सीन दोबारा नहीं बन सकता।' },
  id: { button: 'Ulang satu adegan (gratis, 1×)', hint: '1 pengulangan gratis per video. Pilih adegan yang kurang Anda suka: kami merekamnya lagi dengan suara yang sama dan menyusun ulang filmnya.', pick: 'Adegan mana yang diulang?', scene: 'Adegan {n}', confirm: 'Ulang adegan ini gratis', cancel: 'Batal', working: 'Mengulang adegan… sekitar 3 sampai 5 menit. Anda boleh meninggalkan halaman ini.', done: 'Versi baru siap', open: 'Tonton versi baru', previous: 'Versi sebelumnya tetap ada di pustaka Anda.', retry: 'Coba lagi (gratis)', failed: 'Pengulangan belum berhasil kali ini. Pengulangan gratis Anda masih tersedia.', cap: 'Pengulangan gratis hari ini sudah habis. Coba lagi besok.', unavailable: 'Video ini tidak bisa mengulang adegan.' },
  vi: { button: 'Làm lại một cảnh (miễn phí, 1×)', hint: 'Mỗi video được làm lại miễn phí 1 lần. Chọn cảnh bạn chưa ưng: chúng tôi quay lại với cùng giọng đọc và dựng lại phim.', pick: 'Làm lại cảnh nào?', scene: 'Cảnh {n}', confirm: 'Làm lại cảnh này miễn phí', cancel: 'Hủy', working: 'Đang làm lại cảnh… khoảng 3 đến 5 phút. Bạn có thể rời trang này.', done: 'Phiên bản mới đã sẵn sàng', open: 'Xem phiên bản mới', previous: 'Phiên bản trước vẫn nằm trong thư viện của bạn.', retry: 'Thử lại (miễn phí)', failed: 'Lần này chưa làm lại được. Lượt làm lại miễn phí của bạn vẫn còn.', cap: 'Lượt làm lại miễn phí hôm nay đã hết. Hãy thử lại vào ngày mai.', unavailable: 'Video này không thể làm lại cảnh.' },
}

export function freeRedoCopy(lang: InterfaceLanguage | string | null | undefined): FreeRedoCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return FREE_REDO_COPY[k] ?? EN
}

export function freeRedoFill(template: string, n: number): string {
  return template.split('{n}').join(String(n))
}
