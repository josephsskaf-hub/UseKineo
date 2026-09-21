// ═══ KINEO-PORTAS-16-LINGUAS-2026-09-20 — a página que mais converte cadastro existe em cada língua que o ChatGPT fala ═══
//
// Fundador (20/09 noite): "quem traz pagantes é o GPT, vamos focar no GPT". Medido (30 d): ChatGPT 1.001 sessões → 328
// cadastros → 5 pagantes (todos os pagantes desde 22/08); TAAFT 587 → 162 → 0; Google 29 cadastros → 0 na história.
// Por página (14 d, chegadas do ChatGPT): /free-ai-shorts-generator 37 → 19 cadastros (51%); /gerador-de-shorts-gratis
// 22 → 7. A porta existia só em en/pt/es; o ChatGPT responde nas 16 línguas em que a casa narra (KINEO-IDIOMAS-15, 17/09)
// e não tinha página nossa para citar em francês, alemão, hindi, árabe… Esta tabela alimenta /free-shorts-generator/[lang]
// (mesmo formulário, mesma prova viva, mesmo exit-intent da porta PT; só a língua e o alvo de busca mudam) e o hreflang de
// todas as portas. Preço vem de lib/marketingPrice (nunca digitado à mão).
import type { NarrationLanguage } from '@/lib/textLanguage'

export type FreeShortsLang = {
  code: Exclude<NarrationLanguage, 'en' | 'pt' | 'es'>
  /** BCP-47 para <html lang> e hreflang */
  locale: string
  /** direção do texto */
  dir?: 'rtl'
  title: string
  description: string
  badge: string
  h1: string
  lead: string
  examples: [string, string, string]
  form: { label: string; placeholder: string; submit: string; examplesLabel: string; note: string }
  handoff: { eyebrow: string; heading: string; description: string; label: string; placeholder: string; submit: string; note: string }
  proof: { eyebrow: string; line: string }
  faqTitle: string
  faq: Array<{ q: string; a: (price: string) => string }>
}

export const FREE_SHORTS_LANGS: FreeShortsLang[] = [
  {
    code: 'fr', locale: 'fr',
    title: 'Générateur de Shorts IA gratuit (sans se filmer) — Kineo',
    description: 'Tapez une idée et l’IA génère un Short vertical complet : script, voix off en français, sous-titres et vidéo prête à publier. Gratuit, sans carte.',
    badge: 'Générateur de Shorts IA',
    h1: 'Créez un Short sans vous filmer — gratuit',
    lead: 'Tapez une idée et Kineo génère le Short vertical complet : script, narration en français, scènes et sous-titres — prêt pour YouTube Shorts, TikTok ou Reels. Sans carte bancaire.',
    examples: ['L’île que personne n’a le droit de visiter', 'L’habitude qui rend les gens pauvres sans qu’ils le sachent', 'Pourquoi l’IA change le travail de tout le monde'],
    form: { label: 'De quoi parlera votre Short gratuit ?', placeholder: 'Ex. : l’île interdite qui apparaît sur la carte', submit: 'Créer mon Short gratuit', examplesLabel: 'Idées prêtes', note: 'Votre idée traverse l’inscription — la première vidéo Kineo 1 démarre sans carte.' },
    handoff: { eyebrow: 'Ou, si vous avez déjà le script', heading: 'Vous avez déjà un script ? Collez-le ici.', description: 'Votre script passe par l’inscription et arrive dans Kineo avec une cible de 35 secondes. Kineo utilise Seedance si le solde de l’essai le couvre ; sinon, Kineo 1.', label: 'Collez le script que vous avez déjà', placeholder: 'Collez jusqu’à 1 000 caractères. Vous pouvez garder des étiquettes comme Voix off :, Narration :, Visuel :, scènes et minutages.', submit: 'Transformer ce script en Short →', note: 'Avec au moins deux étiquettes de parole (Voix off :, Narration :), Kineo ne lit que ces blocs ; les indications de production reconnues restent hors de la voix.' },
    proof: { eyebrow: 'Vraiment fait avec Kineo', line: 'Chacun de ces Shorts a commencé par une ligne de texte.' },
    faqTitle: 'Questions fréquentes',
    faq: [
      { q: 'La vidéo sort-elle en français ?', a: () => 'Oui. Script, voix neurale et sous-titres sortent en français — la langue est déjà sélectionnée depuis cette page.' },
      { q: 'C’est vraiment gratuit ? Faut-il une carte ?', a: (price) => `Vous créez, regardez, téléchargez et publiez des vidéos Kineo 1 avec filigrane sans aucune carte. Les plans payants débloquent le MP4 propre, à partir de ${price} par mois (prix de référence en USD).` },
      { q: 'Faut-il apparaître ou savoir monter ?', a: () => 'Non. C’est le format faceless : l’IA écrit, narre, choisit les scènes et ajoute les sous-titres. Vous tapez le sujet et téléchargez la vidéo, en général en 3 à 7 minutes.' },
    ],
  },
  {
    code: 'de', locale: 'de',
    title: 'Kostenloser KI-Shorts-Generator (ohne Kamera) — Kineo',
    description: 'Tippe eine Idee ein und die KI erstellt einen kompletten vertikalen Short: Skript, deutsche Sprecherstimme, Untertitel und fertiges Video. Kostenlos, ohne Karte.',
    badge: 'KI-Shorts-Generator',
    h1: 'Erstelle einen Short, ohne dich zu zeigen — kostenlos',
    lead: 'Tippe eine Idee ein und Kineo erstellt den kompletten vertikalen Short: Skript, deutsche Erzählstimme, Szenen und Untertitel — fertig für YouTube Shorts, TikTok oder Reels. Ohne Kreditkarte.',
    examples: ['Die Insel, die niemand betreten darf', 'Die Gewohnheit, die Menschen unbemerkt arm macht', 'Warum KI die Arbeit aller verändert'],
    form: { label: 'Worum soll es in deinem kostenlosen Short gehen?', placeholder: 'z. B.: die verbotene Insel auf der Karte', submit: 'Meinen kostenlosen Short erstellen', examplesLabel: 'Fertige Ideen', note: 'Deine Idee bleibt durch die Anmeldung erhalten — das erste Kineo-1-Video startet ohne Karte.' },
    handoff: { eyebrow: 'Oder, falls du schon ein Skript hast', heading: 'Schon ein Skript? Hier einfügen.', description: 'Dein Skript geht durch die Anmeldung und kommt mit einem Ziel von 35 Sekunden in Kineo an. Kineo nutzt Seedance, wenn das Testguthaben reicht; sonst Kineo 1.', label: 'Füge das Skript ein, das du schon hast', placeholder: 'Bis zu 1.000 Zeichen. Marker wie Voiceover:, Erzählung:, Bild:, Szenen und Zeitangaben dürfen bleiben.', submit: 'Dieses Skript in einen Short verwandeln →', note: 'Mit mindestens zwei Sprechmarkern (Voiceover:, Erzählung:) liest Kineo nur diese Blöcke; erkannte Regieanweisungen bleiben aus der Stimme heraus.' },
    proof: { eyebrow: 'Wirklich mit Kineo gemacht', line: 'Jeder dieser Shorts begann mit einer Zeile Text.' },
    faqTitle: 'Häufige Fragen',
    faq: [
      { q: 'Kommt das Video auf Deutsch heraus?', a: () => 'Ja. Skript, neuronale Stimme und Untertitel sind auf Deutsch — die Sprache ist von dieser Seite aus schon vorausgewählt.' },
      { q: 'Wirklich kostenlos? Braucht es eine Karte?', a: (price) => `Du erstellst, schaust, lädst herunter und postest Kineo-1-Videos mit Wasserzeichen ganz ohne Karte. Bezahlte Pläne schalten das saubere MP4 frei, ab ${price} pro Monat (Referenzpreis in USD).` },
      { q: 'Muss ich vor die Kamera oder schneiden können?', a: () => 'Nein. Es ist das Faceless-Format: Die KI schreibt, spricht, wählt die Szenen und setzt die Untertitel. Du tippst das Thema und lädst das fertige Video herunter, meist in 3 bis 7 Minuten.' },
    ],
  },
  {
    code: 'it', locale: 'it',
    title: 'Generatore di Shorts con IA gratis (senza mostrarti) — Kineo',
    description: 'Scrivi un’idea e l’IA genera uno Short verticale completo: copione, voce narrante in italiano, sottotitoli e video pronto da pubblicare. Gratis, senza carta.',
    badge: 'Generatore di Shorts con IA',
    h1: 'Crea uno Short senza mostrarti — gratis',
    lead: 'Scrivi un’idea e Kineo genera lo Short verticale completo: copione, narrazione in italiano, scene e sottotitoli — pronto per YouTube Shorts, TikTok o Reels. Senza carta di credito.',
    examples: ['L’isola che nessuno può visitare', 'L’abitudine che rende le persone povere senza accorgersene', 'Perché l’IA sta cambiando il lavoro di tutti'],
    form: { label: 'Di cosa parlerà il tuo Short gratuito?', placeholder: 'Es.: l’isola proibita che appare sulla mappa', submit: 'Crea il mio Short gratis', examplesLabel: 'Idee pronte', note: 'La tua idea attraversa la registrazione — il primo video Kineo 1 parte senza carta.' },
    handoff: { eyebrow: 'Oppure, se hai già il copione', heading: 'Hai già un copione? Incollalo qui.', description: 'Il tuo copione passa dalla registrazione e arriva a Kineo con un obiettivo di 35 secondi. Kineo usa Seedance se il saldo della prova lo copre; altrimenti Kineo 1.', label: 'Incolla il copione che hai già', placeholder: 'Fino a 1.000 caratteri. Puoi tenere etichette come Voce:, Narrazione:, Visivo:, scene e minutaggi.', submit: 'Trasforma questo copione in uno Short →', note: 'Con almeno due etichette di parlato (Voce:, Narrazione:), Kineo legge solo quei blocchi; le indicazioni di regia riconosciute restano fuori dalla voce.' },
    proof: { eyebrow: 'Fatto davvero con Kineo', line: 'Ognuno di questi è iniziato con una riga di testo.' },
    faqTitle: 'Domande frequenti',
    faq: [
      { q: 'Il video esce in italiano?', a: () => 'Sì. Copione, voce neurale e sottotitoli escono in italiano — la lingua è già selezionata da questa pagina.' },
      { q: 'È davvero gratis? Serve la carta?', a: (price) => `Crei, guardi, scarichi e pubblichi video Kineo 1 con filigrana senza nessuna carta. I piani a pagamento sbloccano l’MP4 pulito, da ${price} al mese (prezzo di riferimento in USD).` },
      { q: 'Devo apparire o saper montare?', a: () => 'No. È il formato faceless: l’IA scrive, narra, sceglie le scene e aggiunge i sottotitoli. Tu scrivi il tema e scarichi il video pronto, di solito in 3–7 minuti.' },
    ],
  },
  {
    code: 'nl', locale: 'nl',
    title: 'Gratis AI Shorts-generator (zonder camera) — Kineo',
    description: 'Typ een idee en de AI maakt een complete verticale Short: script, Nederlandse voice-over, ondertitels en een video klaar om te posten. Gratis, zonder kaart.',
    badge: 'AI Shorts-generator',
    h1: 'Maak een Short zonder in beeld te komen — gratis',
    lead: 'Typ een idee en Kineo maakt de complete verticale Short: script, Nederlandse voice-over, scènes en ondertitels — klaar voor YouTube Shorts, TikTok of Reels. Zonder creditcard.',
    examples: ['Het eiland dat niemand mag bezoeken', 'De gewoonte die mensen ongemerkt arm maakt', 'Waarom AI ieders werk verandert'],
    form: { label: 'Waar gaat jouw gratis Short over?', placeholder: 'Bijv.: het verboden eiland op de kaart', submit: 'Mijn gratis Short maken', examplesLabel: 'Kant-en-klare ideeën', note: 'Je idee gaat mee door de registratie — de eerste Kineo 1-video start zonder kaart.' },
    handoff: { eyebrow: 'Of, als je het script al hebt', heading: 'Heb je al een script? Plak het hier.', description: 'Je script gaat door de registratie en komt bij Kineo aan met een doel van 35 seconden. Kineo gebruikt Seedance als het proefsaldo het dekt; anders Kineo 1.', label: 'Plak het script dat je al hebt', placeholder: 'Tot 1.000 tekens. Labels als Voice-over:, Vertelling:, Beeld:, scènes en tijdcodes mogen blijven staan.', submit: 'Dit script omzetten in een Short →', note: 'Met minstens twee spreeklabels (Voice-over:, Vertelling:) leest Kineo alleen die blokken; herkende regieaanwijzingen blijven buiten de stem.' },
    proof: { eyebrow: 'Echt gemaakt met Kineo', line: 'Elk van deze begon met één regel tekst.' },
    faqTitle: 'Veelgestelde vragen',
    faq: [
      { q: 'Komt de video in het Nederlands?', a: () => 'Ja. Script, neurale stem en ondertitels komen in het Nederlands — de taal is vanaf deze pagina al geselecteerd.' },
      { q: 'Is het echt gratis? Heb ik een kaart nodig?', a: (price) => `Je maakt, bekijkt, downloadt en post Kineo 1-video’s met watermerk zonder enige kaart. Betaalde plannen ontgrendelen de schone MP4, vanaf ${price} per maand (referentieprijs in USD).` },
      { q: 'Moet ik in beeld komen of kunnen monteren?', a: () => 'Nee. Het is het faceless-formaat: de AI schrijft, spreekt in, kiest de scènes en voegt ondertitels toe. Jij typt het onderwerp en downloadt de video, meestal binnen 3 tot 7 minuten.' },
    ],
  },
  {
    code: 'pl', locale: 'pl',
    title: 'Darmowy generator Shortsów AI (bez pokazywania twarzy) — Kineo',
    description: 'Wpisz pomysł, a AI wygeneruje kompletny pionowy Short: scenariusz, polski lektor, napisy i gotowe wideo do publikacji. Za darmo, bez karty.',
    badge: 'Generator Shortsów AI',
    h1: 'Stwórz Shorta bez pokazywania twarzy — za darmo',
    lead: 'Wpisz pomysł, a Kineo wygeneruje kompletny pionowy Short: scenariusz, polską narrację, sceny i napisy — gotowy na YouTube Shorts, TikToka lub Reels. Bez karty.',
    examples: ['Wyspa, której nikt nie może odwiedzić', 'Nawyk, który niepostrzeżenie czyni ludzi biednymi', 'Dlaczego AI zmienia pracę każdego z nas'],
    form: { label: 'O czym ma być Twój darmowy Short?', placeholder: 'Np.: zakazana wyspa widoczna na mapie', submit: 'Stwórz mój darmowy Short', examplesLabel: 'Gotowe pomysły', note: 'Twój pomysł przechodzi przez rejestrację — pierwsze wideo Kineo 1 rusza bez karty.' },
    handoff: { eyebrow: 'Albo, jeśli masz już scenariusz', heading: 'Masz już scenariusz? Wklej go tutaj.', description: 'Twój scenariusz przechodzi przez rejestrację i trafia do Kineo z celem 35 sekund. Kineo użyje Seedance, jeśli saldo próbne wystarczy; w przeciwnym razie Kineo 1.', label: 'Wklej scenariusz, który już masz', placeholder: 'Do 1000 znaków. Możesz zostawić etykiety takie jak Lektor:, Narracja:, Obraz:, sceny i kody czasowe.', submit: 'Zamień ten scenariusz w Shorta →', note: 'Przy co najmniej dwóch etykietach mowy (Lektor:, Narracja:) Kineo czyta tylko te bloki; rozpoznane wskazówki produkcyjne zostają poza głosem.' },
    proof: { eyebrow: 'Naprawdę zrobione w Kineo', line: 'Każdy z nich zaczął się od jednej linijki tekstu.' },
    faqTitle: 'Najczęstsze pytania',
    faq: [
      { q: 'Czy wideo wychodzi po polsku?', a: () => 'Tak. Scenariusz, głos neuronowy i napisy są po polsku — język jest już wybrany z tej strony.' },
      { q: 'Czy to naprawdę za darmo? Potrzebna karta?', a: (price) => `Tworzysz, oglądasz, pobierasz i publikujesz wideo Kineo 1 ze znakiem wodnym bez żadnej karty. Płatne plany odblokowują czysty MP4, od ${price} miesięcznie (cena referencyjna w USD).` },
      { q: 'Muszę pokazywać twarz albo umieć montować?', a: () => 'Nie. To format faceless: AI pisze, czyta, dobiera sceny i dodaje napisy. Ty wpisujesz temat i pobierasz gotowe wideo, zwykle w 3–7 minut.' },
    ],
  },
  {
    code: 'tr', locale: 'tr',
    title: 'Ücretsiz Yapay Zekâ Shorts Oluşturucu (kamera yok) — Kineo',
    description: 'Bir fikir yazın, yapay zekâ eksiksiz dikey bir Short üretsin: senaryo, Türkçe seslendirme, altyazı ve paylaşıma hazır video. Ücretsiz, kart gerekmez.',
    badge: 'Yapay Zekâ Shorts Oluşturucu',
    h1: 'Yüzünüzü göstermeden Short oluşturun — ücretsiz',
    lead: 'Bir fikir yazın, Kineo eksiksiz dikey Short’u üretsin: senaryo, Türkçe anlatım, sahneler ve altyazılar — YouTube Shorts, TikTok veya Reels için hazır. Kredi kartı gerekmez.',
    examples: ['Kimsenin ziyaret edemediği ada', 'İnsanları fark etmeden fakirleştiren alışkanlık', 'Yapay zekâ neden herkesin işini değiştiriyor'],
    form: { label: 'Ücretsiz Short’unuz ne hakkında olacak?', placeholder: 'Örn.: haritada görünen yasak ada', submit: 'Ücretsiz Short’umu oluştur', examplesLabel: 'Hazır fikirler', note: 'Fikriniz kayıt boyunca korunur — ilk Kineo 1 videosu kartsız başlar.' },
    handoff: { eyebrow: 'Ya da senaryonuz hazırsa', heading: 'Senaryonuz hazır mı? Buraya yapıştırın.', description: 'Senaryonuz kayıttan geçer ve 35 saniye hedefiyle Kineo’ya ulaşır. Deneme bakiyesi yetiyorsa Kineo Seedance kullanır; yetmiyorsa Kineo 1.', label: 'Elinizdeki senaryoyu yapıştırın', placeholder: 'En fazla 1.000 karakter. Seslendirme:, Anlatım:, Görsel:, sahneler ve zaman kodları gibi etiketleri bırakabilirsiniz.', submit: 'Bu senaryoyu Short’a dönüştür →', note: 'En az iki konuşma etiketiyle (Seslendirme:, Anlatım:) Kineo yalnızca o blokları okur; tanınan yönetmen notları sesin dışında kalır.' },
    proof: { eyebrow: 'Gerçekten Kineo ile yapıldı', line: 'Bunların her biri tek satır metinle başladı.' },
    faqTitle: 'Sık sorulan sorular',
    faq: [
      { q: 'Video Türkçe mi çıkıyor?', a: () => 'Evet. Senaryo, nöral ses ve altyazılar Türkçe çıkar — dil bu sayfadan zaten seçili gelir.' },
      { q: 'Gerçekten ücretsiz mi? Kart gerekir mi?', a: (price) => `Filigranlı Kineo 1 videolarını kartsız oluşturur, izler, indirir ve paylaşırsınız. Ücretli planlar temiz MP4’ü açar; aylık ${price}’dan başlar (USD referans fiyatı).` },
      { q: 'Kamera karşısına geçmem veya kurgu bilmem gerekir mi?', a: () => 'Hayır. Bu, yüzsüz (faceless) format: yapay zekâ yazar, seslendirir, sahneleri seçer ve altyazıları ekler. Siz konuyu yazar, hazır videoyu genelde 3–7 dakikada indirirsiniz.' },
    ],
  },
  {
    code: 'ru', locale: 'ru',
    title: 'Бесплатный ИИ-генератор Shorts (без съёмки) — Kineo',
    description: 'Введите идею — ИИ создаст готовый вертикальный Short: сценарий, русская озвучка, субтитры и видео для публикации. Бесплатно, без карты.',
    badge: 'ИИ-генератор Shorts',
    h1: 'Создайте Short, не появляясь в кадре — бесплатно',
    lead: 'Введите идею, и Kineo соберёт полный вертикальный Short: сценарий, русскую озвучку, сцены и субтитры — готово для YouTube Shorts, TikTok или Reels. Без банковской карты.',
    examples: ['Остров, на который никому нельзя', 'Привычка, которая незаметно делает людей бедными', 'Почему ИИ меняет работу каждого'],
    form: { label: 'О чём будет ваш бесплатный Short?', placeholder: 'Например: запретный остров, который есть на карте', submit: 'Создать мой бесплатный Short', examplesLabel: 'Готовые идеи', note: 'Ваша идея сохраняется при регистрации — первое видео Kineo 1 запускается без карты.' },
    handoff: { eyebrow: 'Или, если сценарий уже есть', heading: 'Уже есть сценарий? Вставьте его сюда.', description: 'Сценарий проходит через регистрацию и попадает в Kineo с целью 35 секунд. Kineo использует Seedance, если хватает пробного баланса; иначе — Kineo 1.', label: 'Вставьте готовый сценарий', placeholder: 'До 1 000 символов. Можно оставить метки вроде Голос:, Озвучка:, Кадр:, сцены и тайм-коды.', submit: 'Превратить этот сценарий в Short →', note: 'При двух и более речевых метках (Голос:, Озвучка:) Kineo читает только эти блоки; распознанные режиссёрские указания в озвучку не попадают.' },
    proof: { eyebrow: 'Сделано в Kineo по-настоящему', line: 'Каждый из этих роликов начался с одной строки текста.' },
    faqTitle: 'Частые вопросы',
    faq: [
      { q: 'Видео будет на русском?', a: () => 'Да. Сценарий, нейросетевой голос и субтитры — на русском; язык уже выбран при переходе с этой страницы.' },
      { q: 'Это правда бесплатно? Нужна карта?', a: (price) => `Вы создаёте, смотрите, скачиваете и публикуете видео Kineo 1 с водяным знаком без какой-либо карты. Платные планы открывают чистый MP4 — от ${price} в месяц (ориентир в USD).` },
      { q: 'Нужно появляться в кадре или уметь монтировать?', a: () => 'Нет. Это формат faceless: ИИ пишет, озвучивает, подбирает сцены и добавляет субтитры. Вы вводите тему и скачиваете готовое видео, обычно за 3–7 минут.' },
    ],
  },
  {
    code: 'uk', locale: 'uk',
    title: 'Безкоштовний ШІ-генератор Shorts (без зйомки) — Kineo',
    description: 'Введіть ідею — ШІ створить готовий вертикальний Short: сценарій, українська озвучка, субтитри та відео для публікації. Безкоштовно, без картки.',
    badge: 'ШІ-генератор Shorts',
    h1: 'Створіть Short, не з’являючись у кадрі — безкоштовно',
    lead: 'Введіть ідею, і Kineo збере повний вертикальний Short: сценарій, українську озвучку, сцени та субтитри — готово для YouTube Shorts, TikTok чи Reels. Без банківської картки.',
    examples: ['Острів, на який нікому не можна', 'Звичка, що непомітно робить людей бідними', 'Чому ШІ змінює роботу кожного'],
    form: { label: 'Про що буде ваш безкоштовний Short?', placeholder: 'Наприклад: заборонений острів, який є на мапі', submit: 'Створити мій безкоштовний Short', examplesLabel: 'Готові ідеї', note: 'Ваша ідея зберігається під час реєстрації — перше відео Kineo 1 запускається без картки.' },
    handoff: { eyebrow: 'Або, якщо сценарій уже є', heading: 'Уже є сценарій? Вставте його сюди.', description: 'Сценарій проходить через реєстрацію і потрапляє в Kineo з ціллю 35 секунд. Kineo використовує Seedance, якщо вистачає пробного балансу; інакше — Kineo 1.', label: 'Вставте готовий сценарій', placeholder: 'До 1 000 символів. Можна залишити мітки на кшталт Голос:, Озвучка:, Кадр:, сцени й таймкоди.', submit: 'Перетворити цей сценарій на Short →', note: 'За двох і більше мовних міток (Голос:, Озвучка:) Kineo читає лише ці блоки; розпізнані режисерські вказівки в озвучку не потрапляють.' },
    proof: { eyebrow: 'Справді зроблено в Kineo', line: 'Кожен із цих роликів почався з одного рядка тексту.' },
    faqTitle: 'Часті запитання',
    faq: [
      { q: 'Відео буде українською?', a: () => 'Так. Сценарій, нейромережевий голос і субтитри — українською; мову вже вибрано при переході з цієї сторінки.' },
      { q: 'Це справді безкоштовно? Потрібна картка?', a: (price) => `Ви створюєте, дивитеся, завантажуєте та публікуєте відео Kineo 1 з водяним знаком без жодної картки. Платні плани відкривають чистий MP4 — від ${price} на місяць (орієнтир у USD).` },
      { q: 'Потрібно з’являтися в кадрі чи вміти монтувати?', a: () => 'Ні. Це формат faceless: ШІ пише, озвучує, добирає сцени й додає субтитри. Ви вводите тему і завантажуєте готове відео, зазвичай за 3–7 хвилин.' },
    ],
  },
  {
    code: 'ar', locale: 'ar', dir: 'rtl',
    title: 'مولّد شورتس بالذكاء الاصطناعي مجانًا (بدون ظهور) — Kineo',
    description: 'اكتب فكرة ويُنشئ الذكاء الاصطناعي فيديو شورتس عموديًا كاملًا: نص، تعليق صوتي بالعربية، ترجمة وفيديو جاهز للنشر. مجانًا وبدون بطاقة.',
    badge: 'مولّد شورتس بالذكاء الاصطناعي',
    h1: 'أنشئ شورتس دون أن تظهر في الكاميرا — مجانًا',
    lead: 'اكتب فكرة ويُنشئ Kineo الشورتس العمودي كاملًا: النص، التعليق الصوتي بالعربية، المشاهد والترجمة — جاهز ليوتيوب شورتس وتيك توك وريلز. بدون بطاقة ائتمان.',
    examples: ['الجزيرة التي لا يُسمح لأحد بزيارتها', 'العادة التي تجعل الناس فقراء دون أن يشعروا', 'لماذا يغيّر الذكاء الاصطناعي عمل الجميع'],
    form: { label: 'عمّ سيكون الشورتس المجاني الخاص بك؟', placeholder: 'مثال: الجزيرة المحظورة التي تظهر على الخريطة', submit: 'أنشئ الشورتس المجاني', examplesLabel: 'أفكار جاهزة', note: 'تبقى فكرتك محفوظة عبر التسجيل — يبدأ أول فيديو Kineo 1 بدون بطاقة.' },
    handoff: { eyebrow: 'أو إن كان لديك النص جاهزًا', heading: 'لديك نص جاهز؟ الصقه هنا.', description: 'يمرّ نصك عبر التسجيل ويصل إلى Kineo بهدف 35 ثانية. يستخدم Kineo محرك Seedance إذا كفى رصيد التجربة؛ وإلا فمحرك Kineo 1.', label: 'الصق النص الذي لديك', placeholder: 'حتى 1000 حرف. يمكنك إبقاء علامات مثل تعليق صوتي: أو سرد: أو مشهد: وأكواد الوقت.', submit: 'حوّل هذا النص إلى شورتس ←', note: 'مع علامتي كلام على الأقل (تعليق صوتي:، سرد:) يقرأ Kineo تلك الكتل فقط؛ وتبقى التوجيهات الإخراجية المعروفة خارج الصوت.' },
    proof: { eyebrow: 'صُنع فعلًا بـ Kineo', line: 'كل واحد من هذه بدأ بسطر نص واحد.' },
    faqTitle: 'أسئلة شائعة',
    faq: [
      { q: 'هل يخرج الفيديو بالعربية؟', a: () => 'نعم. النص والصوت العصبي والترجمة تخرج بالعربية — واللغة محددة مسبقًا عند القدوم من هذه الصفحة.' },
      { q: 'هل هو مجاني فعلًا؟ هل أحتاج بطاقة؟', a: (price) => `تُنشئ وتشاهد وتنزّل وتنشر فيديوهات Kineo 1 بعلامة مائية دون أي بطاقة. الخطط المدفوعة تفتح ملف MP4 النظيف، ابتداءً من ${price} شهريًا (سعر مرجعي بالدولار).` },
      { q: 'هل أحتاج للظهور أو معرفة المونتاج؟', a: () => 'لا. إنه أسلوب faceless: يكتب الذكاء الاصطناعي ويعلّق صوتيًا ويختار المشاهد ويضيف الترجمة. تكتب الموضوع وتنزّل الفيديو الجاهز، عادةً خلال 3 إلى 7 دقائق.' },
    ],
  },
  {
    code: 'ur', locale: 'ur', dir: 'rtl',
    title: 'مفت AI شارٹس جنریٹر (بغیر کیمرے کے) — Kineo',
    description: 'ایک آئیڈیا لکھیں اور AI مکمل عمودی شارٹ بنائے: اسکرپٹ، اردو وائس اوور، سب ٹائٹلز اور پوسٹ کرنے کے لیے تیار ویڈیو۔ مفت، بغیر کارڈ کے۔',
    badge: 'AI شارٹس جنریٹر',
    h1: 'کیمرے کے سامنے آئے بغیر شارٹ بنائیں — مفت',
    lead: 'ایک آئیڈیا لکھیں اور Kineo مکمل عمودی شارٹ بنائے: اسکرپٹ، اردو بیانیہ، مناظر اور سب ٹائٹلز — یوٹیوب شارٹس، ٹک ٹاک یا ریلز کے لیے تیار۔ کریڈٹ کارڈ کی ضرورت نہیں۔',
    examples: ['وہ جزیرہ جہاں کوئی نہیں جا سکتا', 'وہ عادت جو لوگوں کو چپکے سے غریب کر دیتی ہے', 'AI ہر کسی کا کام کیوں بدل رہا ہے'],
    form: { label: 'آپ کا مفت شارٹ کس بارے میں ہوگا؟', placeholder: 'مثلاً: نقشے پر نظر آنے والا ممنوعہ جزیرہ', submit: 'میرا مفت شارٹ بنائیں', examplesLabel: 'تیار آئیڈیاز', note: 'آپ کا آئیڈیا رجسٹریشن کے دوران محفوظ رہتا ہے — پہلی Kineo 1 ویڈیو بغیر کارڈ کے شروع ہوتی ہے۔' },
    handoff: { eyebrow: 'یا اگر آپ کے پاس اسکرپٹ پہلے سے ہے', heading: 'اسکرپٹ پہلے سے ہے؟ یہاں پیسٹ کریں۔', description: 'آپ کا اسکرپٹ رجسٹریشن سے گزر کر 35 سیکنڈ کے ہدف کے ساتھ Kineo تک پہنچتا ہے۔ اگر آزمائشی بیلنس کافی ہو تو Kineo Seedance استعمال کرتا ہے؛ ورنہ Kineo 1۔', label: 'اپنا موجودہ اسکرپٹ پیسٹ کریں', placeholder: 'زیادہ سے زیادہ 1,000 حروف۔ وائس اوور:، بیانیہ:، منظر:، سین اور ٹائم کوڈ جیسے لیبل رکھ سکتے ہیں۔', submit: 'اس اسکرپٹ کو شارٹ میں بدلیں ←', note: 'کم از کم دو بولنے کے لیبلز (وائس اوور:، بیانیہ:) کے ساتھ Kineo صرف وہی حصے پڑھتا ہے؛ پہچانی گئی ہدایات آواز سے باہر رہتی ہیں۔' },
    proof: { eyebrow: 'واقعی Kineo سے بنایا گیا', line: 'ان میں سے ہر ایک متن کی ایک سطر سے شروع ہوا۔' },
    faqTitle: 'اکثر پوچھے گئے سوالات',
    faq: [
      { q: 'کیا ویڈیو اردو میں بنتی ہے؟', a: () => 'جی ہاں۔ اسکرپٹ، نیورل آواز اور سب ٹائٹلز اردو میں بنتے ہیں — اس صفحے سے آنے پر زبان پہلے سے منتخب ہوتی ہے۔' },
      { q: 'کیا یہ واقعی مفت ہے؟ کارڈ چاہیے؟', a: (price) => `آپ واٹر مارک والی Kineo 1 ویڈیوز بغیر کسی کارڈ کے بناتے، دیکھتے، ڈاؤن لوڈ اور پوسٹ کرتے ہیں۔ ادا شدہ پلان صاف MP4 کھولتے ہیں، ماہانہ ${price} سے (USD میں حوالہ قیمت)۔` },
      { q: 'کیا مجھے سامنے آنا یا ایڈیٹنگ آنی چاہیے؟', a: () => 'نہیں۔ یہ faceless طرز ہے: AI لکھتا، بولتا، مناظر چنتا اور سب ٹائٹلز لگاتا ہے۔ آپ موضوع لکھیں اور تیار ویڈیو ڈاؤن لوڈ کریں، عموماً 3 سے 7 منٹ میں۔' },
    ],
  },
  {
    code: 'hi', locale: 'hi',
    title: 'मुफ़्त AI शॉर्ट्स जनरेटर (कैमरे के बिना) — Kineo',
    description: 'एक आइडिया लिखें और AI पूरा वर्टिकल शॉर्ट बनाए: स्क्रिप्ट, हिंदी वॉइसओवर, सबटाइटल और पोस्ट करने के लिए तैयार वीडियो। मुफ़्त, बिना कार्ड।',
    badge: 'AI शॉर्ट्स जनरेटर',
    h1: 'कैमरे पर आए बिना शॉर्ट बनाएँ — मुफ़्त',
    lead: 'एक आइडिया लिखें और Kineo पूरा वर्टिकल शॉर्ट बनाए: स्क्रिप्ट, हिंदी में नैरेशन, सीन और सबटाइटल — YouTube Shorts, TikTok या Reels के लिए तैयार। क्रेडिट कार्ड की ज़रूरत नहीं।',
    examples: ['वह द्वीप जहाँ कोई नहीं जा सकता', 'वह आदत जो लोगों को बिना बताए गरीब बना देती है', 'AI हर किसी का काम क्यों बदल रहा है'],
    form: { label: 'आपका मुफ़्त शॉर्ट किस बारे में होगा?', placeholder: 'जैसे: नक्शे पर दिखने वाला प्रतिबंधित द्वीप', submit: 'मेरा मुफ़्त शॉर्ट बनाएँ', examplesLabel: 'तैयार आइडिया', note: 'आपका आइडिया साइन-अप के दौरान सुरक्षित रहता है — पहला Kineo 1 वीडियो बिना कार्ड शुरू होता है।' },
    handoff: { eyebrow: 'या, अगर आपके पास स्क्रिप्ट पहले से है', heading: 'स्क्रिप्ट पहले से है? यहाँ पेस्ट करें।', description: 'आपकी स्क्रिप्ट साइन-अप से होकर 35 सेकंड के लक्ष्य के साथ Kineo तक पहुँचती है। ट्रायल बैलेंस पर्याप्त हो तो Kineo Seedance इस्तेमाल करता है; वरना Kineo 1।', label: 'अपनी मौजूदा स्क्रिप्ट पेस्ट करें', placeholder: '1,000 अक्षरों तक। वॉइसओवर:, नैरेशन:, विज़ुअल:, सीन और टाइमकोड जैसे लेबल रख सकते हैं।', submit: 'इस स्क्रिप्ट को शॉर्ट में बदलें →', note: 'कम से कम दो बोलने वाले लेबल (वॉइसओवर:, नैरेशन:) होने पर Kineo सिर्फ़ वही हिस्से पढ़ता है; पहचाने गए प्रोडक्शन निर्देश आवाज़ से बाहर रहते हैं।' },
    proof: { eyebrow: 'सच में Kineo से बना', line: 'इनमें से हर एक टेक्स्ट की एक लाइन से शुरू हुआ।' },
    faqTitle: 'अक्सर पूछे जाने वाले सवाल',
    faq: [
      { q: 'क्या वीडियो हिंदी में बनता है?', a: () => 'हाँ। स्क्रिप्ट, न्यूरल आवाज़ और सबटाइटल हिंदी में बनते हैं — इस पेज से आने पर भाषा पहले से चुनी होती है।' },
      { q: 'क्या यह सच में मुफ़्त है? कार्ड चाहिए?', a: (price) => `आप वॉटरमार्क वाले Kineo 1 वीडियो बिना किसी कार्ड के बनाते, देखते, डाउनलोड और पोस्ट करते हैं। पेड प्लान साफ़ MP4 खोलते हैं, ${price} प्रति माह से (USD में संदर्भ कीमत)।` },
      { q: 'क्या मुझे सामने आना या एडिटिंग आनी चाहिए?', a: () => 'नहीं। यह faceless फ़ॉर्मेट है: AI लिखता, बोलता, सीन चुनता और सबटाइटल जोड़ता है। आप विषय लिखें और तैयार वीडियो डाउनलोड करें, आमतौर पर 3 से 7 मिनट में।' },
    ],
  },
  {
    code: 'id', locale: 'id',
    title: 'Generator Shorts AI Gratis (tanpa tampil di kamera) — Kineo',
    description: 'Ketik satu ide dan AI membuat Short vertikal lengkap: naskah, sulih suara bahasa Indonesia, subtitel, dan video siap posting. Gratis, tanpa kartu.',
    badge: 'Generator Shorts AI',
    h1: 'Buat Short tanpa tampil di kamera — gratis',
    lead: 'Ketik satu ide dan Kineo membuat Short vertikal lengkap: naskah, narasi bahasa Indonesia, adegan, dan subtitel — siap untuk YouTube Shorts, TikTok, atau Reels. Tanpa kartu kredit.',
    examples: ['Pulau yang tidak boleh dikunjungi siapa pun', 'Kebiasaan yang diam-diam membuat orang miskin', 'Mengapa AI mengubah pekerjaan semua orang'],
    form: { label: 'Short gratis Anda akan tentang apa?', placeholder: 'Mis.: pulau terlarang yang muncul di peta', submit: 'Buat Short gratis saya', examplesLabel: 'Ide siap pakai', note: 'Ide Anda tersimpan selama pendaftaran — video Kineo 1 pertama dimulai tanpa kartu.' },
    handoff: { eyebrow: 'Atau, kalau naskahnya sudah ada', heading: 'Sudah punya naskah? Tempel di sini.', description: 'Naskah Anda melewati pendaftaran dan tiba di Kineo dengan target 35 detik. Kineo memakai Seedance jika saldo uji coba cukup; jika tidak, Kineo 1.', label: 'Tempel naskah yang sudah Anda punya', placeholder: 'Maksimal 1.000 karakter. Label seperti Sulih suara:, Narasi:, Visual:, adegan, dan kode waktu boleh dipertahankan.', submit: 'Ubah naskah ini menjadi Short →', note: 'Dengan minimal dua label ucapan (Sulih suara:, Narasi:), Kineo hanya membaca blok tersebut; arahan produksi yang dikenali tetap di luar suara.' },
    proof: { eyebrow: 'Benar-benar dibuat dengan Kineo', line: 'Masing-masing dimulai dari satu baris teks.' },
    faqTitle: 'Pertanyaan umum',
    faq: [
      { q: 'Apakah videonya keluar dalam bahasa Indonesia?', a: () => 'Ya. Naskah, suara neural, dan subtitel keluar dalam bahasa Indonesia — bahasanya sudah terpilih dari halaman ini.' },
      { q: 'Benar-benar gratis? Perlu kartu?', a: (price) => `Anda membuat, menonton, mengunduh, dan memposting video Kineo 1 dengan watermark tanpa kartu apa pun. Paket berbayar membuka MP4 bersih, mulai ${price} per bulan (harga acuan dalam USD).` },
      { q: 'Harus tampil di kamera atau bisa mengedit?', a: () => 'Tidak. Ini format faceless: AI menulis, mengisi suara, memilih adegan, dan menambahkan subtitel. Anda mengetik topik dan mengunduh video jadi, biasanya dalam 3–7 menit.' },
    ],
  },
  {
    code: 'vi', locale: 'vi',
    title: 'Trình tạo Shorts AI miễn phí (không cần lộ mặt) — Kineo',
    description: 'Gõ một ý tưởng và AI tạo Short dọc hoàn chỉnh: kịch bản, lồng tiếng tiếng Việt, phụ đề và video sẵn sàng đăng. Miễn phí, không cần thẻ.',
    badge: 'Trình tạo Shorts AI',
    h1: 'Tạo Short mà không cần lộ mặt — miễn phí',
    lead: 'Gõ một ý tưởng và Kineo tạo Short dọc hoàn chỉnh: kịch bản, lời dẫn tiếng Việt, cảnh quay và phụ đề — sẵn sàng cho YouTube Shorts, TikTok hoặc Reels. Không cần thẻ tín dụng.',
    examples: ['Hòn đảo không ai được phép đến', 'Thói quen âm thầm khiến người ta nghèo đi', 'Vì sao AI đang thay đổi công việc của mọi người'],
    form: { label: 'Short miễn phí của bạn sẽ nói về điều gì?', placeholder: 'VD: hòn đảo cấm xuất hiện trên bản đồ', submit: 'Tạo Short miễn phí của tôi', examplesLabel: 'Ý tưởng có sẵn', note: 'Ý tưởng của bạn được giữ nguyên qua bước đăng ký — video Kineo 1 đầu tiên bắt đầu mà không cần thẻ.' },
    handoff: { eyebrow: 'Hoặc, nếu bạn đã có kịch bản', heading: 'Đã có kịch bản? Dán vào đây.', description: 'Kịch bản của bạn đi qua bước đăng ký và đến Kineo với mục tiêu 35 giây. Kineo dùng Seedance nếu số dư dùng thử đủ; nếu không, dùng Kineo 1.', label: 'Dán kịch bản bạn đã có', placeholder: 'Tối đa 1.000 ký tự. Có thể giữ các nhãn như Lồng tiếng:, Lời dẫn:, Hình ảnh:, cảnh và mã thời gian.', submit: 'Biến kịch bản này thành Short →', note: 'Với ít nhất hai nhãn lời thoại (Lồng tiếng:, Lời dẫn:), Kineo chỉ đọc các khối đó; chỉ dẫn sản xuất được nhận diện sẽ không vào giọng đọc.' },
    proof: { eyebrow: 'Thực sự được làm bằng Kineo', line: 'Mỗi video này bắt đầu từ một dòng văn bản.' },
    faqTitle: 'Câu hỏi thường gặp',
    faq: [
      { q: 'Video có ra bằng tiếng Việt không?', a: () => 'Có. Kịch bản, giọng đọc nơ-ron và phụ đề đều bằng tiếng Việt — ngôn ngữ đã được chọn sẵn khi đi từ trang này.' },
      { q: 'Có thật sự miễn phí không? Cần thẻ không?', a: (price) => `Bạn tạo, xem, tải và đăng video Kineo 1 có watermark mà không cần bất kỳ thẻ nào. Gói trả phí mở khóa MP4 sạch, từ ${price} mỗi tháng (giá tham chiếu bằng USD).` },
      { q: 'Tôi có cần lộ mặt hay biết dựng phim không?', a: () => 'Không. Đây là định dạng faceless: AI viết, đọc, chọn cảnh và thêm phụ đề. Bạn gõ chủ đề và tải video hoàn chỉnh, thường trong 3–7 phút.' },
    ],
  },
]

export const FREE_SHORTS_LANG_BY_CODE: Record<string, FreeShortsLang> = Object.fromEntries(FREE_SHORTS_LANGS.map((l) => [l.code, l]))

/** hreflang completo das 16 portas (en/pt/es têm slug próprio; as outras 13 vivem em /free-shorts-generator/<code>). */
export function freeShortsAlternates(base: string): Record<string, string> {
  const out: Record<string, string> = {
    en: `${base}/free-ai-shorts-generator`,
    'pt-BR': `${base}/gerador-de-shorts-gratis`,
    es: `${base}/generador-de-shorts-gratis`,
  }
  for (const l of FREE_SHORTS_LANGS) out[l.locale] = `${base}/free-shorts-generator/${l.code}`
  out['x-default'] = `${base}/free-ai-shorts-generator`
  return out
}
