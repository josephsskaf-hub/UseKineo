'use client'

// DIRETOR-KINEO-20260923 — "Improve for this video": sugestão opcional abaixo da entrada e antes do Generate,
// no desenho aprovado pelo fundador (DIRETOR-KINEO-PREVIEW.html, SHA256 85da8b12…). Regras que este componente
// cumpre (guardião scripts/test-diretor-kineo-2026-09-23.mjs):
//  · sugerir/aplicar NUNCA gera, cobra, navega nem toca o token do Generate — só chama /api/diretor/suggest;
//  · o original fica guardado: "Keep original" não muda nada, "Undo" devolve o texto exato;
//  · resposta que chega depois de a pessoa editar texto/configuração é descartada (não sobrescreve a edição);
//  · modo literal: sem a caixa de consentimento marcada (começa desmarcada), nenhuma palavra muda;
//  · erro deixa o texto como estava e o fluxo normal segue.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { UiLabel as SharedUiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  DIRETOR_CLIENT_EVENTS, type DiretorDuration, type DiretorSuggestion, diretorFit, diretorInputKey, diretorScope,
} from '@/lib/diretor/suggest'

type Props = {
  text: string
  mode: 'ai' | 'verbatim' | 'clip'
  engine: string
  engineName: string
  duration: DiretorDuration
  language: string
  aspect: string
  onApply: (text: string) => void
}
type Phase = 'idle' | 'loading' | 'ready' | 'editing' | 'applied' | 'error'

const ERRORS: Record<string, string> = {
  daily_limit: 'You have used today’s suggestions. Your text is unchanged — you can still generate.',
  no_suggestion: 'No useful change found for this text. Your text is unchanged.',
}

// Authored UI only. Suggestions, explanations returned by the model and user text
// stay in their original language. Local dictionaries keep this change isolated.
const COPY_KEYS = ['title', 'optional', 'lead', 'literal', 'thinking', 'fit', 'improve', 'consent', 'stale', 'again', 'dismiss', 'for', 'original', 'suggestion', 'editLabel', 'useEdit', 'use', 'edit', 'keep', 'note', 'applied', 'undo', 'daily', 'noChange', 'failed'] as const
type CopyKey = typeof COPY_KEYS[number]
type Copy = readonly [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string]
const COPY: Record<ReturnType<typeof useInterfaceLanguage>, Copy> = {
  en: ['Kineo Director', 'optional', 'A suggestion tuned to this engine and length. Nothing is generated or charged — you decide.', 'Your script is about {speech}s of narration for a {duration}s video. It is narrated word for word — nothing changes unless you allow it.', 'Thinking…', 'Fit my script to {duration}s', 'Improve for this video', 'Allow Kineo to rewrite my words to fit {duration}s. You will see both versions before anything changes.', 'Your text or settings changed, so this suggestion is out of date.', 'Suggest again', 'Dismiss', 'Suggestion for', 'Original', 'Suggestion', 'Edit suggestion', 'Use my edit', 'Use suggestion', 'Edit', 'Keep original', 'Using it only changes the text above. Nothing is generated until you press Generate.', 'Suggestion applied to your text. Review it, then Generate when you are ready.', 'Undo', 'You have used today’s suggestions. Your text is unchanged — you can still generate.', 'No useful change found for this text. Your text is unchanged.', 'The suggestion did not come through. Your text is unchanged.'],
  pt: ['Diretor Kineo', 'opcional', 'Uma sugestão para este motor e duração. Nada é gerado ou cobrado — você decide.', 'Seu roteiro tem cerca de {speech}s de narração para um vídeo de {duration}s. A narração é literal — nada muda sem sua autorização.', 'Preparando…', 'Adaptar meu roteiro para {duration}s', 'Melhorar para este vídeo', 'Permitir que a Kineo reescreva minhas palavras para caber em {duration}s. Você verá as duas versões antes de qualquer alteração.', 'Seu texto ou suas configurações mudaram. Esta sugestão ficou desatualizada.', 'Sugerir novamente', 'Dispensar', 'Sugestão para', 'Original', 'Sugestão', 'Editar sugestão', 'Usar minha edição', 'Usar sugestão', 'Editar', 'Manter original', 'Aplicar só altera o texto acima. Nada é gerado até você pressionar Gerar.', 'Sugestão aplicada ao texto. Revise e pressione Gerar quando estiver pronto.', 'Desfazer', 'Você usou as sugestões disponíveis hoje. Seu texto permanece intacto — ainda pode gerar.', 'Nenhuma alteração útil encontrada. Seu texto permanece intacto.', 'Não foi possível obter a sugestão. Seu texto permanece intacto.'],
  es: ['Director Kineo', 'opcional', 'Una sugerencia para este motor y duración. No se genera ni se cobra nada: tú decides.', 'Tu guion tiene unos {speech}s de narración para un vídeo de {duration}s. Se narra palabra por palabra: nada cambia sin tu permiso.', 'Preparando…', 'Adaptar mi guion a {duration}s', 'Mejorar para este vídeo', 'Permitir que Kineo reescriba mis palabras para ajustarlas a {duration}s. Verás ambas versiones antes de cualquier cambio.', 'Tu texto o configuración cambiaron. Esta sugerencia está desactualizada.', 'Sugerir de nuevo', 'Descartar', 'Sugerencia para', 'Original', 'Sugerencia', 'Editar sugerencia', 'Usar mi edición', 'Usar sugerencia', 'Editar', 'Mantener original', 'Aplicar solo cambia el texto de arriba. No se genera nada hasta pulsar Generar.', 'Sugerencia aplicada. Revísala y pulsa Generar cuando estés listo.', 'Deshacer', 'Has usado las sugerencias disponibles hoy. Tu texto no ha cambiado: aún puedes generar.', 'No se encontró un cambio útil. Tu texto no ha cambiado.', 'No se pudo obtener la sugerencia. Tu texto no ha cambiado.'],
  fr: ['Directeur Kineo', 'facultatif', 'Une suggestion adaptée à ce moteur et à cette durée. Rien n’est généré ni facturé : vous décidez.', 'Votre texte représente environ {speech}s de narration pour une vidéo de {duration}s. Il est lu mot pour mot : rien ne change sans votre accord.', 'Préparation…', 'Adapter mon texte à {duration}s', 'Améliorer pour cette vidéo', 'Autoriser Kineo à reformuler mes mots pour tenir en {duration}s. Vous verrez les deux versions avant toute modification.', 'Votre texte ou vos réglages ont changé. Cette suggestion est obsolète.', 'Suggérer à nouveau', 'Fermer', 'Suggestion pour', 'Original', 'Suggestion', 'Modifier la suggestion', 'Utiliser ma version', 'Utiliser la suggestion', 'Modifier', 'Garder l’original', 'Appliquer ne modifie que le texte ci-dessus. Rien n’est généré avant de cliquer sur Générer.', 'Suggestion appliquée. Relisez le texte, puis cliquez sur Générer lorsque vous êtes prêt.', 'Annuler la modification', 'Vous avez utilisé les suggestions disponibles aujourd’hui. Votre texte est intact : vous pouvez toujours générer.', 'Aucune modification utile trouvée. Votre texte est intact.', 'Impossible d’obtenir la suggestion. Votre texte est intact.'],
  de: ['Kineo-Regisseur', 'optional', 'Ein Vorschlag für dieses Modell und diese Länge. Es wird nichts generiert oder berechnet – du entscheidest.', 'Dein Skript enthält etwa {speech}s Erzähltext für ein Video von {duration}s. Es wird wortgetreu gesprochen – ohne deine Erlaubnis ändert sich nichts.', 'Wird vorbereitet…', 'Mein Skript auf {duration}s anpassen', 'Für dieses Video verbessern', 'Kineo darf meinen Text für {duration}s umformulieren. Vor jeder Änderung siehst du beide Versionen.', 'Text oder Einstellungen wurden geändert. Dieser Vorschlag ist veraltet.', 'Erneut vorschlagen', 'Verwerfen', 'Vorschlag für', 'Original', 'Vorschlag', 'Vorschlag bearbeiten', 'Meine Fassung verwenden', 'Vorschlag verwenden', 'Bearbeiten', 'Original behalten', 'Übernehmen ändert nur den Text oben. Erst mit Generieren wird ein Video erzeugt.', 'Vorschlag übernommen. Prüfe den Text und klicke auf Generieren, wenn du bereit bist.', 'Rückgängig', 'Die heutigen Vorschläge sind aufgebraucht. Dein Text ist unverändert – du kannst weiterhin generieren.', 'Keine hilfreiche Änderung gefunden. Dein Text ist unverändert.', 'Der Vorschlag konnte nicht geladen werden. Dein Text ist unverändert.'],
  it: ['Regista Kineo', 'facoltativo', 'Un suggerimento per questo motore e questa durata. Non viene generato né addebitato nulla: decidi tu.', 'Il copione contiene circa {speech}s di narrazione per un video di {duration}s. Viene narrato parola per parola: nulla cambia senza il tuo consenso.', 'Preparazione…', 'Adatta il copione a {duration}s', 'Migliora per questo video', 'Consenti a Kineo di riscrivere le mie parole per una durata di {duration}s. Vedrai entrambe le versioni prima di qualsiasi modifica.', 'Il testo o le impostazioni sono cambiati. Questo suggerimento non è più aggiornato.', 'Suggerisci di nuovo', 'Ignora', 'Suggerimento per', 'Originale', 'Suggerimento', 'Modifica suggerimento', 'Usa la mia modifica', 'Usa suggerimento', 'Modifica', 'Mantieni originale', 'Applicare modifica solo il testo sopra. Nulla viene generato prima di premere Genera.', 'Suggerimento applicato. Rivedi il testo e premi Genera quando sei pronto.', 'Annulla modifica', 'Hai usato i suggerimenti disponibili oggi. Il testo è invariato: puoi ancora generare.', 'Nessuna modifica utile trovata. Il testo è invariato.', 'Impossibile ottenere il suggerimento. Il testo è invariato.'],
  nl: ['Kineo-regisseur', 'optioneel', 'Een suggestie voor dit model en deze lengte. Er wordt niets gegenereerd of in rekening gebracht: jij beslist.', 'Je script bevat ongeveer {speech}s gesproken tekst voor een video van {duration}s. Het wordt woordelijk verteld: niets verandert zonder jouw toestemming.', 'Voorbereiden…', 'Mijn script aanpassen aan {duration}s', 'Verbeteren voor deze video', 'Kineo mag mijn woorden herschrijven voor {duration}s. Je ziet beide versies voordat er iets verandert.', 'Je tekst of instellingen zijn gewijzigd. Deze suggestie is verouderd.', 'Opnieuw voorstellen', 'Sluiten', 'Suggestie voor', 'Origineel', 'Suggestie', 'Suggestie bewerken', 'Mijn bewerking gebruiken', 'Suggestie gebruiken', 'Bewerken', 'Origineel behouden', 'Toepassen verandert alleen de tekst hierboven. Er wordt pas iets gegenereerd wanneer je op Genereren drukt.', 'Suggestie toegepast. Controleer de tekst en druk op Genereren wanneer je klaar bent.', 'Ongedaan maken', 'Je hebt de suggesties voor vandaag gebruikt. Je tekst is ongewijzigd: je kunt nog steeds genereren.', 'Geen nuttige wijziging gevonden. Je tekst is ongewijzigd.', 'De suggestie kon niet worden opgehaald. Je tekst is ongewijzigd.'],
  pl: ['Reżyser Kineo', 'opcjonalnie', 'Sugestia dla tego silnika i długości. Nic nie jest generowane ani naliczane — Ty decydujesz.', 'Scenariusz to około {speech}s narracji dla filmu trwającego {duration}s. Jest czytany słowo w słowo — nic nie zmieni się bez Twojej zgody.', 'Przygotowywanie…', 'Dopasuj scenariusz do {duration}s', 'Ulepsz dla tego filmu', 'Zezwól Kineo na przeredagowanie moich słów do {duration}s. Zobaczysz obie wersje przed jakąkolwiek zmianą.', 'Tekst lub ustawienia się zmieniły. Ta sugestia jest nieaktualna.', 'Zaproponuj ponownie', 'Odrzuć', 'Sugestia dla', 'Oryginał', 'Sugestia', 'Edytuj sugestię', 'Użyj mojej wersji', 'Użyj sugestii', 'Edytuj', 'Zachowaj oryginał', 'Zastosowanie zmienia tylko tekst powyżej. Generowanie nastąpi dopiero po naciśnięciu Generuj.', 'Sugestia zastosowana. Sprawdź tekst i naciśnij Generuj, gdy będziesz gotowy.', 'Cofnij', 'Dzisiejsze sugestie zostały wykorzystane. Tekst jest bez zmian — nadal możesz generować.', 'Nie znaleziono przydatnej zmiany. Tekst jest bez zmian.', 'Nie udało się uzyskać sugestii. Tekst jest bez zmian.'],
  tr: ['Kineo Yönetmeni', 'isteğe bağlı', 'Bu motor ve süre için bir öneri. Hiçbir şey üretilmez veya ücretlendirilmez — siz karar verirsiniz.', 'Metniniz, {duration}s video için yaklaşık {speech}s anlatım içeriyor. Kelimesi kelimesine okunur — izniniz olmadan hiçbir şey değişmez.', 'Hazırlanıyor…', 'Metnimi {duration}s süreye uyarla', 'Bu video için iyileştir', 'Kineo’nun sözlerimi {duration}s süreye uyacak şekilde yeniden yazmasına izin ver. Bir değişiklik yapılmadan önce iki sürümü de göreceksiniz.', 'Metniniz veya ayarlarınız değişti. Bu öneri artık güncel değil.', 'Yeniden öner', 'Kapat', 'Önerinin bağlamı', 'Orijinal', 'Öneri', 'Öneriyi düzenle', 'Düzenlememi kullan', 'Öneriyi kullan', 'Düzenle', 'Orijinali koru', 'Uygulamak yalnızca yukarıdaki metni değiştirir. Oluştur düğmesine basana kadar hiçbir şey üretilmez.', 'Öneri metne uygulandı. İnceleyin ve hazır olduğunuzda Oluştur düğmesine basın.', 'Geri al', 'Bugünkü önerileri kullandınız. Metniniz değişmedi — yine de video oluşturabilirsiniz.', 'Yararlı bir değişiklik bulunamadı. Metniniz değişmedi.', 'Öneri alınamadı. Metniniz değişmedi.'],
  ru: ['Режиссёр Kineo', 'необязательно', 'Предложение для этого движка и длительности. Ничего не генерируется и не списывается — решаете вы.', 'В сценарии примерно {speech}с озвучки для видео на {duration}с. Текст читается дословно — без вашего разрешения ничего не изменится.', 'Подготовка…', 'Адаптировать сценарий к {duration}с', 'Улучшить для этого видео', 'Разрешить Kineo переписать мои слова для длительности {duration}с. Перед изменением вы увидите обе версии.', 'Текст или настройки изменились. Это предложение устарело.', 'Предложить снова', 'Закрыть', 'Предложение для', 'Оригинал', 'Предложение', 'Редактировать предложение', 'Использовать мою правку', 'Использовать предложение', 'Редактировать', 'Сохранить оригинал', 'Применение меняет только текст выше. Генерация начнётся только после нажатия «Создать».', 'Предложение применено. Проверьте текст и нажмите «Создать», когда будете готовы.', 'Отменить изменение', 'Сегодняшние предложения использованы. Текст не изменён — видео по-прежнему можно создать.', 'Полезных изменений не найдено. Текст не изменён.', 'Не удалось получить предложение. Текст не изменён.'],
  uk: ['Режисер Kineo', 'необов’язково', 'Пропозиція для цього рушія та тривалості. Нічого не генерується й не списується — вирішуєте ви.', 'Сценарій містить приблизно {speech}с озвучення для відео на {duration}с. Текст читається дослівно — без вашого дозволу нічого не зміниться.', 'Підготовка…', 'Адаптувати сценарій до {duration}с', 'Покращити для цього відео', 'Дозволити Kineo переписати мої слова для тривалості {duration}с. Перед зміною ви побачите обидві версії.', 'Текст або налаштування змінилися. Ця пропозиція застаріла.', 'Запропонувати знову', 'Закрити', 'Пропозиція для', 'Оригінал', 'Пропозиція', 'Редагувати пропозицію', 'Використати мою правку', 'Використати пропозицію', 'Редагувати', 'Зберегти оригінал', 'Застосування змінює лише текст вище. Генерація почнеться лише після натискання «Створити».', 'Пропозицію застосовано. Перевірте текст і натисніть «Створити», коли будете готові.', 'Скасувати зміну', 'Сьогоднішні пропозиції використано. Текст не змінено — відео все ще можна створити.', 'Корисних змін не знайдено. Текст не змінено.', 'Не вдалося отримати пропозицію. Текст не змінено.'],
  ar: ['مخرج Kineo', 'اختياري', 'اقتراح مناسب لهذا المحرك والمدة. لا يتم إنشاء شيء أو خصم أي رصيد — أنت تقرر.', 'يتضمن نصك نحو {speech} ثانية من السرد لفيديو مدته {duration} ثانية. يُقرأ حرفيًا — لا يتغير شيء دون إذنك.', 'جارٍ التحضير…', 'تكييف نصي لمدة {duration} ثانية', 'تحسين لهذا الفيديو', 'السماح لـ Kineo بإعادة صياغة كلماتي لتناسب {duration} ثانية. سترى النسختين قبل إجراء أي تغيير.', 'تغير النص أو الإعدادات. هذا الاقتراح لم يعد محدثًا.', 'اقتراح مجددًا', 'إغلاق', 'اقتراح لـ', 'الأصل', 'الاقتراح', 'تعديل الاقتراح', 'استخدام تعديلي', 'استخدام الاقتراح', 'تعديل', 'الاحتفاظ بالأصل', 'التطبيق يغير النص أعلاه فقط. لا يتم إنشاء شيء حتى تضغط على إنشاء.', 'تم تطبيق الاقتراح. راجع النص ثم اضغط على إنشاء عندما تكون جاهزًا.', 'تراجع', 'استخدمت الاقتراحات المتاحة اليوم. لم يتغير نصك — لا يزال بإمكانك الإنشاء.', 'لم يُعثر على تغيير مفيد. لم يتغير نصك.', 'تعذر الحصول على الاقتراح. لم يتغير نصك.'],
  ur: ['Kineo ڈائریکٹر', 'اختیاری', 'اس انجن اور دورانیے کے لیے تجویز۔ نہ کچھ بنایا جاتا ہے نہ چارج ہوتا ہے — فیصلہ آپ کا ہے۔', 'آپ کے اسکرپٹ میں {duration} سیکنڈ کی ویڈیو کے لیے تقریباً {speech} سیکنڈ کا بیانیہ ہے۔ اسے لفظ بہ لفظ پڑھا جاتا ہے — آپ کی اجازت کے بغیر کچھ نہیں بدلتا۔', 'تیار ہو رہا ہے…', 'میرا اسکرپٹ {duration} سیکنڈ کے لیے ڈھالیں', 'اس ویڈیو کے لیے بہتر بنائیں', 'Kineo کو میرے الفاظ {duration} سیکنڈ کے مطابق دوبارہ لکھنے کی اجازت دیں۔ کسی تبدیلی سے پہلے آپ دونوں نسخے دیکھیں گے۔', 'آپ کا متن یا ترتیبات بدل گئی ہیں۔ یہ تجویز اب پرانی ہے۔', 'دوبارہ تجویز دیں', 'بند کریں', 'تجویز برائے', 'اصل', 'تجویز', 'تجویز میں ترمیم', 'میری ترمیم استعمال کریں', 'تجویز استعمال کریں', 'ترمیم', 'اصل برقرار رکھیں', 'لاگو کرنے سے صرف اوپر کا متن بدلتا ہے۔ بنائیں دبانے تک کچھ نہیں بنتا۔', 'تجویز متن پر لاگو ہو گئی۔ جائزہ لیں اور تیار ہونے پر بنائیں دبائیں۔', 'واپس کریں', 'آج کی دستیاب تجاویز استعمال ہو چکی ہیں۔ متن نہیں بدلا — آپ اب بھی ویڈیو بنا سکتے ہیں۔', 'کوئی مفید تبدیلی نہیں ملی۔ متن نہیں بدلا۔', 'تجویز حاصل نہیں ہو سکی۔ متن نہیں بدلا۔'],
  hi: ['Kineo निर्देशक', 'वैकल्पिक', 'इस इंजन और अवधि के लिए सुझाव। कुछ भी बनाया या चार्ज नहीं किया जाता — फैसला आपका है।', 'आपकी स्क्रिप्ट में {duration} सेकंड के वीडियो के लिए लगभग {speech} सेकंड का कथन है। इसे शब्दशः पढ़ा जाता है — आपकी अनुमति के बिना कुछ नहीं बदलता।', 'तैयार हो रहा है…', 'मेरी स्क्रिप्ट को {duration} सेकंड के लिए ढालें', 'इस वीडियो के लिए सुधारें', 'Kineo को मेरे शब्द {duration} सेकंड के अनुसार दोबारा लिखने दें। किसी भी बदलाव से पहले आप दोनों संस्करण देखेंगे।', 'आपका पाठ या सेटिंग बदल गई है। यह सुझाव अब पुराना है।', 'फिर सुझाव दें', 'बंद करें', 'इसके लिए सुझाव', 'मूल', 'सुझाव', 'सुझाव संपादित करें', 'मेरा संपादन इस्तेमाल करें', 'सुझाव इस्तेमाल करें', 'संपादित करें', 'मूल बनाए रखें', 'लागू करने से केवल ऊपर का पाठ बदलता है। बनाएँ दबाने तक कुछ नहीं बनता।', 'सुझाव लागू हो गया। पाठ जाँचें और तैयार होने पर बनाएँ दबाएँ।', 'पूर्ववत करें', 'आज के उपलब्ध सुझाव इस्तेमाल हो चुके हैं। पाठ नहीं बदला है — आप अभी भी वीडियो बना सकते हैं।', 'कोई उपयोगी बदलाव नहीं मिला। पाठ नहीं बदला है।', 'सुझाव नहीं मिल सका। पाठ नहीं बदला है।'],
  id: ['Sutradara Kineo', 'opsional', 'Saran untuk mesin dan durasi ini. Tidak ada yang dibuat atau dikenakan biaya — Anda yang memutuskan.', 'Naskah Anda berisi sekitar {speech} detik narasi untuk video {duration} detik. Dibacakan kata demi kata — tidak berubah tanpa izin Anda.', 'Menyiapkan…', 'Sesuaikan naskah ke {duration} detik', 'Perbaiki untuk video ini', 'Izinkan Kineo menulis ulang kata-kata saya agar sesuai dengan {duration} detik. Anda akan melihat kedua versi sebelum perubahan apa pun.', 'Teks atau pengaturan Anda berubah. Saran ini sudah kedaluwarsa.', 'Sarankan lagi', 'Tutup', 'Saran untuk', 'Asli', 'Saran', 'Edit saran', 'Gunakan edit saya', 'Gunakan saran', 'Edit', 'Pertahankan asli', 'Menerapkan hanya mengubah teks di atas. Tidak ada yang dibuat sampai Anda menekan Buat.', 'Saran diterapkan. Periksa teks, lalu tekan Buat saat siap.', 'Urungkan', 'Saran yang tersedia hari ini sudah digunakan. Teks Anda tidak berubah — Anda masih dapat membuat video.', 'Tidak ditemukan perubahan yang berguna. Teks Anda tidak berubah.', 'Saran tidak dapat diperoleh. Teks Anda tidak berubah.'],
  vi: ['Đạo diễn Kineo', 'tùy chọn', 'Gợi ý phù hợp với công cụ và thời lượng này. Không tạo video hay tính phí — bạn quyết định.', 'Kịch bản có khoảng {speech} giây lời kể cho video {duration} giây. Văn bản được đọc nguyên văn — không thay đổi nếu chưa được bạn cho phép.', 'Đang chuẩn bị…', 'Điều chỉnh kịch bản cho {duration} giây', 'Cải thiện cho video này', 'Cho phép Kineo viết lại lời của tôi để phù hợp với {duration} giây. Bạn sẽ thấy cả hai phiên bản trước khi có thay đổi.', 'Văn bản hoặc cài đặt đã thay đổi. Gợi ý này không còn phù hợp.', 'Gợi ý lại', 'Đóng', 'Gợi ý cho', 'Bản gốc', 'Gợi ý', 'Chỉnh sửa gợi ý', 'Dùng bản tôi sửa', 'Dùng gợi ý', 'Chỉnh sửa', 'Giữ bản gốc', 'Áp dụng chỉ thay đổi văn bản ở trên. Không tạo video cho đến khi bạn nhấn Tạo.', 'Đã áp dụng gợi ý. Kiểm tra văn bản rồi nhấn Tạo khi sẵn sàng.', 'Hoàn tác', 'Bạn đã dùng hết gợi ý hôm nay. Văn bản không thay đổi — bạn vẫn có thể tạo video.', 'Không tìm thấy thay đổi hữu ích. Văn bản không thay đổi.', 'Không lấy được gợi ý. Văn bản không thay đổi.'],
}

// UiLabel's shared dictionaries do not contain this feature yet. Keep its
// English path and use the authored local copy for other languages; feeding a
// translated string back into the global lookup would incorrectly mark it en.
function UiLabel({ children }: { children: string }) {
  const language = useInterfaceLanguage()
  return language === 'en' ? <SharedUiLabel>{children}</SharedUiLabel>
    : <span lang={language} style={{ all: 'unset' }}>{children}</span>
}

export default function DiretorKineo({ text, mode, engine, engineName, duration, language, aspect, onApply }: Props) {
  const uiLanguage = useInterfaceLanguage()
  const copy = (id: CopyKey, values: Record<string, string | number> = {}) =>
    COPY[uiLanguage][COPY_KEYS.indexOf(id)].replace(/\{(\w+)\}/g, (token, name: string) => String(values[name] ?? token))
  const [phase, setPhase] = useState<Phase>('idle')
  const [consent, setConsent] = useState(false)
  const [suggestion, setSuggestion] = useState<DiretorSuggestion | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [requestKey, setRequestKey] = useState('')
  const original = useRef('')
  const appliedText = useRef('')
  const liveKey = useRef('')
  const staleSent = useRef(false)

  const literal = mode === 'verbatim'
  const key = mode === 'clip' ? '' : diretorInputKey({ text, mode, engine, duration, language, aspect, rewriteConsent: consent })
  liveKey.current = key
  const meta = { mode, engine, duration, language, aspect, consent }

  // Depois de aplicar, qualquer edição da pessoa encerra o "Undo" (desfazer apagaria a edição dela).
  useEffect(() => {
    if (phase === 'applied' && text !== appliedText.current) setPhase('idle')
  }, [text, phase])

  if (mode === 'clip' || !text.trim()) return null

  const scope = diretorScope({ mode: literal ? 'verbatim' : 'ai', engine, rewriteConsent: consent })
  const fit = literal ? diretorFit(text, engine, duration) : null
  const stale = (phase === 'ready' || phase === 'editing') && requestKey !== key
  if (stale && !staleSent.current) { staleSent.current = true; void trackEvent(DIRETOR_CLIENT_EVENTS.stale, { ...meta, when: 'shown' }) }

  async function ask() {
    if (phase === 'loading') return
    const sentKey = key
    original.current = text
    staleSent.current = false
    setRequestKey(sentKey)
    setError('')
    setPhase('loading')
    void trackEvent(DIRETOR_CLIENT_EVENTS.requested, meta)
    try {
      const res = await fetch('/api/diretor/suggest', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, mode, engine, duration, language, aspect, rewriteConsent: consent }),
      })
      const data = (await res.json().catch(() => ({}))) as { suggestion?: DiretorSuggestion; error?: string }
      if (liveKey.current !== sentKey) {
        // A pessoa mudou algo enquanto esperava: a resposta é de outro contexto e não entra.
        void trackEvent(DIRETOR_CLIENT_EVENTS.stale, { ...meta, when: 'late_response' })
        setPhase('idle')
        return
      }
      if (!res.ok || !data.suggestion) {
        setError(ERRORS[data.error ?? ''] ?? 'The suggestion did not come through. Your text is unchanged.')
        setPhase('error')
        void trackEvent(DIRETOR_CLIENT_EVENTS.failed, { ...meta, status: res.status, error: data.error ?? null })
        return
      }
      setSuggestion(data.suggestion)
      setDraft(data.suggestion.text)
      setPhase('ready')
      void trackEvent(DIRETOR_CLIENT_EVENTS.shown, { ...meta, text_changed: data.suggestion.textChanged, changes: data.suggestion.changes.length })
    } catch {
      if (liveKey.current !== sentKey) { setPhase('idle'); return }
      setError('The suggestion did not come through. Your text is unchanged.')
      setPhase('error')
      void trackEvent(DIRETOR_CLIENT_EVENTS.failed, { ...meta, status: 0, error: 'network' })
    }
  }

  function apply(next: string) {
    const edited = next !== suggestion?.text
    appliedText.current = next
    onApply(next)
    setPhase('applied')
    void trackEvent(DIRETOR_CLIENT_EVENTS.applied, { ...meta, edited })
  }
  function undo() {
    onApply(original.current)
    setPhase('idle')
    void trackEvent(DIRETOR_CLIENT_EVENTS.undone, meta)
  }
  function keep() {
    setPhase('idle')
    void trackEvent(DIRETOR_CLIENT_EVENTS.kept, meta)
  }

  const context = `${engineName} · ${duration}s · ${language.toUpperCase()} · ${aspect}`
  // Literal que já cabe e sem orientação visual ligada: o Diretor não tem o que mexer — fica calado.
  if (literal && fit?.fits && !scope.mayAddVisual && phase === 'idle') return null

  return (
    <div className="diretor-kineo" data-kineo="diretor" data-phase={stale ? 'stale' : phase} lang={uiLanguage} dir={uiLanguage === 'ar' || uiLanguage === 'ur' ? 'rtl' : 'ltr'} aria-live="polite" aria-busy={phase === 'loading'}>
      <div className="dk-heading"><span aria-hidden="true">✦</span> <UiLabel>{copy('title')}</UiLabel> <span className="dk-optional"><UiLabel>{copy('optional')}</UiLabel></span></div>
      <div className="dk-context"><bdi>{context}</bdi></div>
      {phase === 'idle' || phase === 'loading' || phase === 'error' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div className="dk-lead">
                <UiLabel>
                {literal && fit
                  ? copy('literal', { speech: fit.speechSeconds, duration })
                  : copy('lead')}
                </UiLabel>
              </div>
            </div>
            <button type="button" className="pill on" disabled={phase === 'loading' || (literal && !scope.mayRewriteText)} onClick={() => { void ask() }}>
              <UiLabel>{phase === 'loading' ? copy('thinking') : literal ? copy('fit', { duration }) : copy('improve')}</UiLabel>
            </button>
          </div>
          {literal && (
            <label className="dk-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={phase === 'loading'} />
              <span><UiLabel>{copy('consent', { duration })}</UiLabel></span>
            </label>
          )}
          {phase === 'error' && <div role="alert" className="dk-error"><UiLabel>{copy(error === ERRORS.daily_limit ? 'daily' : error === ERRORS.no_suggestion ? 'noChange' : 'failed')}</UiLabel></div>}
        </>
      ) : null}

      {(phase === 'ready' || phase === 'editing') && suggestion && (
        stale ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span className="dk-notice"><UiLabel>{copy('stale')}</UiLabel></span>
            <div className="dk-actions">
              <button type="button" className="pill on" onClick={() => { void ask() }}><UiLabel>{copy('again')}</UiLabel></button>
              <button type="button" className="pill" onClick={keep}><UiLabel>{copy('dismiss')}</UiLabel></button>
            </div>
          </div>
        ) : (
          <>
            <div className="dk-caption"><UiLabel>{copy('for')}</UiLabel> <bdi>{context}</bdi></div>
            <div className="dk-compare">
              <div className="dk-version">
                <div className="dk-version-title"><UiLabel>{copy('original')}</UiLabel></div>
                <div className="dk-text" dir="auto">{original.current}</div>
              </div>
              <div className="dk-version dk-suggested">
                <div className="dk-version-title"><UiLabel>{copy('suggestion')}</UiLabel></div>
                {phase === 'editing'
                  ? <textarea aria-label={copy('editLabel')} dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} />
                  : <div className="dk-text" dir="auto">{suggestion.text}</div>}
              </div>
            </div>
            {suggestion.changes.length > 0 && (
              <ul className="dk-changes">
                {suggestion.changes.map((c, i) => <li key={i} dir="auto">{c}</li>)}
              </ul>
            )}
            <div className="dk-actions">
              <button type="button" className="pill on" onClick={() => apply(phase === 'editing' ? draft : suggestion.text)}>
                <UiLabel>{phase === 'editing' ? copy('useEdit') : copy('use')}</UiLabel>
              </button>
              {phase === 'ready' && <button type="button" className="pill" onClick={() => setPhase('editing')}><UiLabel>{copy('edit')}</UiLabel></button>}
              <button type="button" className="pill" onClick={keep}><UiLabel>{copy('keep')}</UiLabel></button>
            </div>
            <div className="dk-footnote"><UiLabel>{copy('note')}</UiLabel></div>
          </>
        )
      )}

      {phase === 'applied' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="dk-notice"><UiLabel>{copy('applied')}</UiLabel></span>
          <button type="button" className="pill" onClick={undo}><UiLabel>{copy('undo')}</UiLabel></button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
.diretor-kineo{margin-top:20px;padding:20px;border:1px solid #35567a;border-radius:16px;background:#101b29;color:#eef3fa;min-width:0;overflow-wrap:anywhere;text-align:start}
.diretor-kineo *{box-sizing:border-box}.diretor-kineo .dk-heading{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:18px;font-weight:600;line-height:1.4}
.diretor-kineo .dk-optional{font-size:11px;font-weight:500;border:1px solid #36516d;border-radius:20px;padding:4px 8px;color:#b5cbe3}
.diretor-kineo .dk-context{display:table;max-width:100%;margin:12px 0;padding:5px 8px;border-radius:6px;background:#1a2c41;color:#c2d8f2;font-size:11px;line-height:1.5}
.diretor-kineo .dk-lead{font-size:13px;line-height:1.6;color:#afc1d6;margin:0 0 10px}.diretor-kineo .dk-caption{font-size:12px;line-height:1.6;color:#b6c8dd}
.diretor-kineo .dk-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}.diretor-kineo .dk-version{min-width:0;background:#0b121d;border:1px solid #2b3c50;border-radius:10px;padding:14px}.diretor-kineo .dk-suggested{border-color:#358ce2;background:#102238}
.diretor-kineo .dk-version-title{font-size:13px;font-weight:600;line-height:1.5;margin-bottom:10px}.diretor-kineo .dk-text{font-size:13px;line-height:1.7;white-space:pre-wrap;max-height:230px;overflow:auto;color:#d1deeb}
.diretor-kineo .dk-changes{margin:16px 0;padding-inline-start:22px;border-inline-start:2px solid #2997ff;color:#b6c8dd;font-size:12px;line-height:1.65}
.diretor-kineo .dk-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.diretor-kineo button.pill{font-family:inherit;font-weight:600;font-size:12px;line-height:1.5;min-height:44px;max-width:100%;padding:11px 14px;white-space:normal;text-align:center;border:1px solid #375473;border-radius:10px;color:#d9e7f8;background:#17273a;cursor:pointer}
.diretor-kineo button.pill.on{background:#2997ff;border-color:#2997ff;color:#041428}.diretor-kineo button:disabled{opacity:.45;cursor:not-allowed}.diretor-kineo button:focus-visible,.diretor-kineo textarea:focus-visible,.diretor-kineo input:focus-visible{outline:3px solid #a1d3ff;outline-offset:3px}
.diretor-kineo textarea{display:block;width:100%;min-width:0;min-height:170px!important;background:#0a1522;border:1px solid #527ca8;border-radius:8px;padding:10px;font-family:inherit;font-size:16px;line-height:1.6;color:#edf6ff;resize:vertical}
.diretor-kineo .dk-consent{display:flex;gap:8px;align-items:flex-start;margin-top:14px;border-top:1px solid #31445b;padding-top:14px;font-size:12px;line-height:1.7;cursor:pointer}.diretor-kineo .dk-consent input{flex-shrink:0;width:18px;height:18px;margin-top:2px;accent-color:#2997ff}
.diretor-kineo .dk-footnote{font-size:12px;line-height:1.6;color:#aebfd2;margin-top:10px}.diretor-kineo .dk-notice{font-size:13px;line-height:1.6;color:#d6eaff}.diretor-kineo .dk-error{margin-top:14px;padding:12px;border-radius:10px;background:#2a1921;color:#ffbecb;font-size:13px;line-height:1.6}
@media(max-width:600px){.diretor-kineo{padding:15px}.diretor-kineo .dk-compare{grid-template-columns:minmax(0,1fr)}.diretor-kineo .dk-actions button{flex:1 1 auto}.diretor-kineo .dk-heading{font-size:17px}}
` }} />
    </div>
  )
}
