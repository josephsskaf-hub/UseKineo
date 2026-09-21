// ═══ KINEO-MOTORES-16-LINGUAS-2026-09-21 — as páginas de motor que o ChatGPT já cita, agora nas 16 línguas ═══
//
// Plano da semana (T1, docs/PLANO-SEMANA-50-ASSINANTES-2026-09-21.md). Medido 14 d: /ai-video-generator/kineo-1 é a
// página que mais recebe chegada do ChatGPT (98 → 36 cadastros); a pesquisa de 21/09 (48 perguntas genéricas em 16
// línguas) mostrou o CapCut dominando "melhor gerador grátis" — os nossos pagantes vêm de citações de MOTOR e de
// NICHO. Esta tabela alimenta /ai-video-generator/<motor>/<lang> para os 3 motores que vendem (Kineo 1, Seedance 1.5,
// Veo 3.1). Formulário, exemplos e prova reaproveitam lib/seo/freeShortsGeneratorLangs (mesma língua, mesmo tom);
// custo em créditos vem do catálogo (lib/growth/enginePageCatalog), nunca digitado.
import { FREE_SHORTS_LANG_BY_CODE, type FreeShortsLang } from '@/lib/seo/freeShortsGeneratorLangs'

export const LOCALIZED_ENGINE_SLUGS = ['kineo-1', 'seedance', 'veo'] as const
export type LocalizedEngineSlug = (typeof LOCALIZED_ENGINE_SLUGS)[number]

type Facts = { engine: string; credits: number; trial: number }
export type EngineLang = {
  code: FreeShortsLang['code']
  title: (f: Facts) => string
  description: (f: Facts) => string
  h1: (f: Facts) => string
  lead: (f: Facts) => string
  /** o parágrafo "o que é" por motor */
  about: Record<LocalizedEngineSlug, (f: Facts) => string>
  howTitle: string
  how: [string, string, string]
  costTitle: string
  /** covers = o trial grátis cobre um filme inteiro deste motor */
  cost: (f: Facts & { covers: boolean; starter: string }) => string
  proofTitle: (f: Facts) => string
  proofLine: string
  faq: (f: Facts & { covers: boolean; starter: string }) => Array<{ q: string; a: string }>
}

const K1 = 'Kineo 1'

export const ENGINE_LANGS: Record<FreeShortsLang['code'], EngineLang> = {
  fr: {
    code: 'fr',
    title: (f) => `${f.engine} — générateur de vidéos IA pour YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} dans Kineo : un Short vertical complet, narré et sous-titré, ${f.credits} crédits par vidéo de 60 s. Essai gratuit de ${f.trial} crédits, sans carte.`,
    h1: (f) => `${f.engine} : créez un Short complet à partir d’une idée`,
    lead: (f) => `Tapez une idée ou collez votre script. Kineo écrit les scènes, fait tourner ${f.engine}, enregistre la voix en français, ajoute les sous-titres et vous rend un Short 9:16 prêt à publier.`,
    about: {
      'kineo-1': () => `${K1} est le moteur le plus rapide et le moins cher de Kineo : des plans réels choisis pour chaque phrase de votre narration, une voix neurale et des sous-titres mot à mot. C’est le moteur de votre première vidéo, et celui du volume quotidien.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) ne cherche pas des plans en banque : il génère chaque scène à partir de votre script. Vous tapez une idée, Kineo dirige Seedance scène par scène, narre, sous-titre et assemble le Short.`,
      veo: () => `Veo 3.1 est le modèle vidéo phare de Google. Dans Kineo, ce n’est pas un générateur de clips à monter ensuite : une idée entre, un Short complet sort — script, voix, scènes Veo et sous-titres.`,
    },
    howTitle: 'Comment ça marche',
    how: ['Tapez une idée ou collez un script (jusqu’à 1 000 caractères).', 'Kineo écrit les scènes, choisit ou génère les plans, enregistre la voix et les sous-titres.', 'Téléchargez le Short 9:16 et publiez-le sur YouTube Shorts, TikTok ou Reels.'],
    costTitle: 'Combien ça coûte',
    cost: (f) => `${f.credits} crédits par vidéo de 60 secondes. Tout nouveau compte reçoit ${f.trial} crédits gratuits, sans carte — ${f.covers ? 'de quoi faire une vidéo complète avec ce moteur (avec filigrane)' : `pas assez pour une vidéo complète avec ce moteur : votre premier film ${f.engine} vient avec le plan Starter (${f.starter})`}.`,
    proofTitle: (f) => `De vrais Shorts rendus par ${f.engine}`,
    proofLine: 'Pas une bande démo : des vidéos terminées de vrais comptes Kineo, et le badge indique le moteur qui les a réellement rendues.',
    faq: (f) => [
      { q: `La vidéo sort-elle en français avec ${f.engine} ?`, a: 'Oui. Script, voix neurale et sous-titres sortent en français — la langue est présélectionnée depuis cette page.' },
      { q: `Combien coûte une vidéo ${f.engine} ?`, a: `${f.credits} crédits par vidéo de 60 s. L’essai gratuit donne ${f.trial} crédits sans carte${f.covers ? ', ce qui couvre une vidéo complète avec filigrane' : `, ce qui ne couvre pas une vidéo ${f.engine} : le premier film vient avec Starter (${f.starter})`}. Les plans payants débloquent le MP4 sans filigrane.` },
      { q: 'Faut-il savoir monter ou apparaître à l’écran ?', a: 'Non. Format faceless : l’IA écrit, narre, choisit ou génère les scènes et sous-titre. Vous tapez le sujet et téléchargez la vidéo, en général en 3 à 7 minutes.' },
    ],
  },
  de: {
    code: 'de',
    title: (f) => `${f.engine} — KI-Videogenerator für YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} in Kineo: ein kompletter vertikaler Short mit deutscher Sprecherstimme und Untertiteln, ${f.credits} Credits pro 60-Sekunden-Video. Kostenloser Test mit ${f.trial} Credits, ohne Karte.`,
    h1: (f) => `${f.engine}: aus einer Idee ein fertiger Short`,
    lead: (f) => `Tippe eine Idee ein oder füge dein Skript ein. Kineo schreibt die Szenen, lässt ${f.engine} rendern, nimmt die deutsche Stimme auf, setzt Untertitel und liefert einen 9:16-Short zum Posten.`,
    about: {
      'kineo-1': () => `${K1} ist der schnellste und günstigste Motor von Kineo: echte Aufnahmen zu jedem Satz deiner Erzählung, eine neuronale Stimme und Wort-für-Wort-Untertitel. Der Motor für dein erstes Video — und für den täglichen Ausstoß.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) sucht kein Stock-Material: es generiert jede Szene aus deinem Skript. Du tippst eine Idee, Kineo führt Seedance Szene für Szene, spricht, untertitelt und schneidet den Short.`,
      veo: () => `Veo 3.1 ist Googles Flaggschiff-Videomodell. In Kineo ist es kein Clip-Generator, den du danach schneiden musst: eine Idee rein, ein fertiger Short raus — Skript, Stimme, Veo-Szenen und Untertitel.`,
    },
    howTitle: 'So funktioniert es',
    how: ['Idee eintippen oder Skript einfügen (bis 1.000 Zeichen).', 'Kineo schreibt die Szenen, wählt oder generiert die Aufnahmen, nimmt Stimme und Untertitel auf.', '9:16-Short herunterladen und auf YouTube Shorts, TikTok oder Reels posten.'],
    costTitle: 'Was es kostet',
    cost: (f) => `${f.credits} Credits pro 60-Sekunden-Video. Jedes neue Konto bekommt ${f.trial} Credits gratis, ohne Karte — ${f.covers ? 'genug für ein komplettes Video mit diesem Motor (mit Wasserzeichen)' : `nicht genug für ein komplettes Video mit diesem Motor: dein erster ${f.engine}-Film kommt mit dem Starter-Plan (${f.starter})`}.`,
    proofTitle: (f) => `Echte Shorts, gerendert von ${f.engine}`,
    proofLine: 'Kein Demo-Reel: fertige Videos echter Kineo-Konten, und das Abzeichen nennt den Motor, der sie wirklich gerendert hat.',
    faq: (f) => [
      { q: `Kommt das Video mit ${f.engine} auf Deutsch heraus?`, a: 'Ja. Skript, neuronale Stimme und Untertitel sind auf Deutsch — die Sprache ist von dieser Seite aus vorausgewählt.' },
      { q: `Was kostet ein ${f.engine}-Video?`, a: `${f.credits} Credits pro 60-Sekunden-Video. Der Gratis-Test gibt ${f.trial} Credits ohne Karte${f.covers ? ' — das reicht für ein komplettes Video mit Wasserzeichen' : ` — das reicht nicht für ein ${f.engine}-Video: der erste Film kommt mit Starter (${f.starter})`}. Bezahlte Pläne schalten das MP4 ohne Wasserzeichen frei.` },
      { q: 'Muss ich schneiden können oder vor die Kamera?', a: 'Nein. Faceless-Format: die KI schreibt, spricht, wählt oder generiert Szenen und untertitelt. Du tippst das Thema und lädst das Video herunter, meist in 3–7 Minuten.' },
    ],
  },
  it: {
    code: 'it',
    title: (f) => `${f.engine} — generatore di video IA per YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} in Kineo: uno Short verticale completo, narrato in italiano e sottotitolato, ${f.credits} crediti per video da 60 s. Prova gratuita di ${f.trial} crediti, senza carta.`,
    h1: (f) => `${f.engine}: da un’idea a uno Short finito`,
    lead: (f) => `Scrivi un’idea o incolla il tuo copione. Kineo scrive le scene, fa girare ${f.engine}, registra la voce in italiano, aggiunge i sottotitoli e ti restituisce uno Short 9:16 pronto da pubblicare.`,
    about: {
      'kineo-1': () => `${K1} è il motore più veloce ed economico di Kineo: riprese reali scelte per ogni frase della narrazione, voce neurale e sottotitoli parola per parola. È il motore del tuo primo video e del volume quotidiano.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) non cerca riprese d’archivio: genera ogni scena dal tuo copione. Scrivi un’idea, Kineo dirige Seedance scena per scena, narra, sottotitola e monta lo Short.`,
      veo: () => `Veo 3.1 è il modello video di punta di Google. In Kineo non è un generatore di clip da montare dopo: entra un’idea, esce uno Short completo — copione, voce, scene Veo e sottotitoli.`,
    },
    howTitle: 'Come funziona',
    how: ['Scrivi un’idea o incolla un copione (fino a 1.000 caratteri).', 'Kineo scrive le scene, sceglie o genera le riprese, registra voce e sottotitoli.', 'Scarica lo Short 9:16 e pubblicalo su YouTube Shorts, TikTok o Reels.'],
    costTitle: 'Quanto costa',
    cost: (f) => `${f.credits} crediti per video da 60 secondi. Ogni nuovo account riceve ${f.trial} crediti gratis, senza carta — ${f.covers ? 'abbastanza per un video completo con questo motore (con filigrana)' : `non abbastanza per un video completo con questo motore: il primo film ${f.engine} arriva con il piano Starter (${f.starter})`}.`,
    proofTitle: (f) => `Short veri renderizzati da ${f.engine}`,
    proofLine: 'Non un demo reel: video finiti di account Kineo reali, e il badge indica il motore che li ha davvero renderizzati.',
    faq: (f) => [
      { q: `Il video con ${f.engine} esce in italiano?`, a: 'Sì. Copione, voce neurale e sottotitoli escono in italiano — la lingua è preselezionata da questa pagina.' },
      { q: `Quanto costa un video ${f.engine}?`, a: `${f.credits} crediti per video da 60 s. La prova gratuita dà ${f.trial} crediti senza carta${f.covers ? ', che coprono un video completo con filigrana' : `, che non coprono un video ${f.engine}: il primo film arriva con Starter (${f.starter})`}. I piani a pagamento sbloccano l’MP4 senza filigrana.` },
      { q: 'Devo saper montare o apparire?', a: 'No. Formato faceless: l’IA scrive, narra, sceglie o genera le scene e sottotitola. Tu scrivi il tema e scarichi il video, di solito in 3–7 minuti.' },
    ],
  },
  nl: {
    code: 'nl',
    title: (f) => `${f.engine} — AI-videogenerator voor YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} in Kineo: een complete verticale Short met Nederlandse voice-over en ondertitels, ${f.credits} credits per video van 60 s. Gratis proef met ${f.trial} credits, zonder kaart.`,
    h1: (f) => `${f.engine}: van één idee naar een afgemaakte Short`,
    lead: (f) => `Typ een idee of plak je script. Kineo schrijft de scènes, laat ${f.engine} renderen, neemt de Nederlandse stem op, voegt ondertitels toe en levert een 9:16-Short die klaar is om te posten.`,
    about: {
      'kineo-1': () => `${K1} is de snelste en goedkoopste engine van Kineo: echte beelden bij elke zin van je vertelling, een neurale stem en woord-voor-woord ondertitels. De engine van je eerste video — en van je dagelijkse volume.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) zoekt geen stockbeelden: het genereert elke scène uit je script. Jij typt een idee, Kineo regisseert Seedance scène voor scène, spreekt in, ondertitelt en monteert de Short.`,
      veo: () => `Veo 3.1 is Googles vlaggenschip-videomodel. In Kineo is het geen clipgenerator die je daarna moet monteren: één idee erin, een complete Short eruit — script, stem, Veo-scènes en ondertitels.`,
    },
    howTitle: 'Zo werkt het',
    how: ['Typ een idee of plak een script (tot 1.000 tekens).', 'Kineo schrijft de scènes, kiest of genereert de beelden, neemt stem en ondertitels op.', 'Download de 9:16-Short en post hem op YouTube Shorts, TikTok of Reels.'],
    costTitle: 'Wat het kost',
    cost: (f) => `${f.credits} credits per video van 60 seconden. Elk nieuw account krijgt ${f.trial} gratis credits, zonder kaart — ${f.covers ? 'genoeg voor een complete video met deze engine (met watermerk)' : `niet genoeg voor een complete video met deze engine: je eerste ${f.engine}-film komt met het Starter-plan (${f.starter})`}.`,
    proofTitle: (f) => `Echte Shorts gerenderd door ${f.engine}`,
    proofLine: 'Geen demoreel: afgemaakte video’s van echte Kineo-accounts, en de badge noemt de engine die ze echt heeft gerenderd.',
    faq: (f) => [
      { q: `Komt de video met ${f.engine} in het Nederlands?`, a: 'Ja. Script, neurale stem en ondertitels komen in het Nederlands — de taal is vanaf deze pagina al geselecteerd.' },
      { q: `Wat kost een ${f.engine}-video?`, a: `${f.credits} credits per video van 60 s. De gratis proef geeft ${f.trial} credits zonder kaart${f.covers ? ', genoeg voor een complete video met watermerk' : `, niet genoeg voor een ${f.engine}-video: de eerste film komt met Starter (${f.starter})`}. Betaalde plannen ontgrendelen de MP4 zonder watermerk.` },
      { q: 'Moet ik kunnen monteren of in beeld komen?', a: 'Nee. Faceless-formaat: de AI schrijft, spreekt in, kiest of genereert scènes en ondertitelt. Jij typt het onderwerp en downloadt de video, meestal binnen 3–7 minuten.' },
    ],
  },
  pl: {
    code: 'pl',
    title: (f) => `${f.engine} — generator wideo AI do YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} w Kineo: kompletny pionowy Short z polskim lektorem i napisami, ${f.credits} kredytów za wideo 60 s. Darmowy okres próbny: ${f.trial} kredytów, bez karty.`,
    h1: (f) => `${f.engine}: z jednego pomysłu gotowy Short`,
    lead: (f) => `Wpisz pomysł albo wklej scenariusz. Kineo pisze sceny, uruchamia ${f.engine}, nagrywa polski głos, dodaje napisy i oddaje Shorta 9:16 gotowego do publikacji.`,
    about: {
      'kineo-1': () => `${K1} to najszybszy i najtańszy silnik Kineo: prawdziwe ujęcia dobrane do każdego zdania narracji, głos neuronowy i napisy słowo po słowie. Silnik pierwszego wideo — i codziennej produkcji.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) nie szuka ujęć w banku: generuje każdą scenę z Twojego scenariusza. Wpisujesz pomysł, Kineo prowadzi Seedance scena po scenie, czyta, dodaje napisy i montuje Shorta.`,
      veo: () => `Veo 3.1 to flagowy model wideo Google. W Kineo to nie generator klipów do późniejszego montażu: wchodzi pomysł, wychodzi kompletny Short — scenariusz, głos, sceny Veo i napisy.`,
    },
    howTitle: 'Jak to działa',
    how: ['Wpisz pomysł lub wklej scenariusz (do 1000 znaków).', 'Kineo pisze sceny, dobiera lub generuje ujęcia, nagrywa głos i napisy.', 'Pobierz Shorta 9:16 i opublikuj na YouTube Shorts, TikToku lub Reels.'],
    costTitle: 'Ile to kosztuje',
    cost: (f) => `${f.credits} kredytów za wideo 60 s. Każde nowe konto dostaje ${f.trial} darmowych kredytów, bez karty — ${f.covers ? 'wystarczy na całe wideo tym silnikiem (ze znakiem wodnym)' : `za mało na całe wideo tym silnikiem: pierwszy film ${f.engine} przychodzi z planem Starter (${f.starter})`}.`,
    proofTitle: (f) => `Prawdziwe Shorty wyrenderowane przez ${f.engine}`,
    proofLine: 'To nie demo: gotowe wideo z prawdziwych kont Kineo, a plakietka nazywa silnik, który naprawdę je wyrenderował.',
    faq: (f) => [
      { q: `Czy wideo z ${f.engine} wychodzi po polsku?`, a: 'Tak. Scenariusz, głos neuronowy i napisy są po polsku — język jest wybrany z tej strony.' },
      { q: `Ile kosztuje wideo ${f.engine}?`, a: `${f.credits} kredytów za wideo 60 s. Darmowy okres próbny daje ${f.trial} kredytów bez karty${f.covers ? ' — to wystarcza na całe wideo ze znakiem wodnym' : ` — to za mało na wideo ${f.engine}: pierwszy film przychodzi ze Starterem (${f.starter})`}. Płatne plany odblokowują MP4 bez znaku wodnego.` },
      { q: 'Muszę umieć montować albo pokazywać twarz?', a: 'Nie. Format faceless: AI pisze, czyta, dobiera lub generuje sceny i dodaje napisy. Ty wpisujesz temat i pobierasz wideo, zwykle w 3–7 minut.' },
    ],
  },
  tr: {
    code: 'tr',
    title: (f) => `${f.engine} — YouTube Shorts için yapay zekâ video oluşturucu | Kineo`,
    description: (f) => `Kineo’da ${f.engine}: Türkçe seslendirme ve altyazılı eksiksiz dikey Short, 60 sn video başına ${f.credits} kredi. ${f.trial} kredilik ücretsiz deneme, kart gerekmez.`,
    h1: (f) => `${f.engine}: tek fikirden bitmiş Short’a`,
    lead: (f) => `Bir fikir yazın ya da senaryonuzu yapıştırın. Kineo sahneleri yazar, ${f.engine} ile üretir, Türkçe sesi kaydeder, altyazı ekler ve paylaşıma hazır 9:16 Short’u teslim eder.`,
    about: {
      'kineo-1': () => `${K1}, Kineo’nun en hızlı ve en ucuz motoru: anlatımınızın her cümlesi için seçilmiş gerçek çekimler, nöral ses ve kelime kelime altyazı. İlk videonuzun — ve günlük üretimin — motoru.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) stok çekim aramaz: her sahneyi senaryonuzdan üretir. Siz fikri yazarsınız, Kineo Seedance’i sahne sahne yönetir, seslendirir, altyazılar ve Short’u birleştirir.`,
      veo: () => `Veo 3.1, Google’ın amiral gemisi video modeli. Kineo’da sonradan kurgulanacak bir klip üreticisi değil: bir fikir girer, eksiksiz bir Short çıkar — senaryo, ses, Veo sahneleri ve altyazı.`,
    },
    howTitle: 'Nasıl çalışır',
    how: ['Bir fikir yazın ya da senaryo yapıştırın (en fazla 1.000 karakter).', 'Kineo sahneleri yazar, çekimleri seçer ya da üretir, sesi ve altyazıyı kaydeder.', '9:16 Short’u indirip YouTube Shorts, TikTok ya da Reels’te paylaşın.'],
    costTitle: 'Ne kadar',
    cost: (f) => `60 saniyelik video başına ${f.credits} kredi. Her yeni hesap kartsız ${f.trial} ücretsiz kredi alır — ${f.covers ? 'bu motorla eksiksiz bir videoya yeter (filigranlı)' : `bu motorla eksiksiz bir videoya yetmez: ilk ${f.engine} filminiz Starter planıyla gelir (${f.starter})`}.`,
    proofTitle: (f) => `${f.engine} ile üretilmiş gerçek Short’lar`,
    proofLine: 'Demo değil: gerçek Kineo hesaplarının bitmiş videoları; rozet, onları gerçekten üreten motoru gösterir.',
    faq: (f) => [
      { q: `${f.engine} ile video Türkçe mi çıkıyor?`, a: 'Evet. Senaryo, nöral ses ve altyazılar Türkçe çıkar — dil bu sayfadan seçili gelir.' },
      { q: `Bir ${f.engine} videosu kaça?`, a: `60 sn video başına ${f.credits} kredi. Ücretsiz deneme kartsız ${f.trial} kredi verir${f.covers ? '; filigranlı eksiksiz bir videoya yeter' : `; bir ${f.engine} videosuna yetmez: ilk film Starter ile gelir (${f.starter})`}. Ücretli planlar filigransız MP4’ü açar.` },
      { q: 'Kurgu bilmem ya da kamera karşısına geçmem gerekir mi?', a: 'Hayır. Yüzsüz format: yapay zekâ yazar, seslendirir, sahneleri seçer ya da üretir ve altyazı ekler. Konuyu yazar, videoyu genelde 3–7 dakikada indirirsiniz.' },
    ],
  },
  ru: {
    code: 'ru',
    title: (f) => `${f.engine} — ИИ-генератор видео для YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} в Kineo: готовый вертикальный Short с русской озвучкой и субтитрами, ${f.credits} кредитов за видео 60 с. Бесплатный пробный период: ${f.trial} кредитов, без карты.`,
    h1: (f) => `${f.engine}: из одной идеи — готовый Short`,
    lead: (f) => `Введите идею или вставьте сценарий. Kineo пишет сцены, запускает ${f.engine}, записывает русскую озвучку, добавляет субтитры и отдаёт Short 9:16, готовый к публикации.`,
    about: {
      'kineo-1': () => `${K1} — самый быстрый и дешёвый движок Kineo: реальные кадры под каждую фразу озвучки, нейросетевой голос и субтитры слово в слово. Движок первого видео и ежедневного потока.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) не ищет стоковые кадры: генерирует каждую сцену по вашему сценарию. Вы вводите идею, Kineo ведёт Seedance сцену за сценой, озвучивает, субтитрует и собирает Short.`,
      veo: () => `Veo 3.1 — флагманская видеомодель Google. В Kineo это не генератор клипов, которые потом надо монтировать: на входе идея, на выходе готовый Short — сценарий, голос, сцены Veo и субтитры.`,
    },
    howTitle: 'Как это работает',
    how: ['Введите идею или вставьте сценарий (до 1 000 символов).', 'Kineo пишет сцены, подбирает или генерирует кадры, записывает голос и субтитры.', 'Скачайте Short 9:16 и опубликуйте в YouTube Shorts, TikTok или Reels.'],
    costTitle: 'Сколько стоит',
    cost: (f) => `${f.credits} кредитов за видео 60 секунд. Каждый новый аккаунт получает ${f.trial} бесплатных кредитов без карты — ${f.covers ? 'этого хватает на полное видео этим движком (с водяным знаком)' : `этого не хватает на полное видео этим движком: первый фильм ${f.engine} приходит с планом Starter (${f.starter})`}.`,
    proofTitle: (f) => `Настоящие Shorts, отрендеренные ${f.engine}`,
    proofLine: 'Не демо-ролик: готовые видео реальных аккаунтов Kineo, а значок называет движок, который их действительно отрендерил.',
    faq: (f) => [
      { q: `Видео с ${f.engine} будет на русском?`, a: 'Да. Сценарий, нейросетевой голос и субтитры — на русском; язык выбран при переходе с этой страницы.' },
      { q: `Сколько стоит видео ${f.engine}?`, a: `${f.credits} кредитов за видео 60 с. Пробный период даёт ${f.trial} кредитов без карты${f.covers ? ' — хватает на полное видео с водяным знаком' : ` — на видео ${f.engine} не хватает: первый фильм приходит со Starter (${f.starter})`}. Платные планы открывают MP4 без водяного знака.` },
      { q: 'Нужно уметь монтировать или появляться в кадре?', a: 'Нет. Формат faceless: ИИ пишет, озвучивает, подбирает или генерирует сцены и добавляет субтитры. Вы вводите тему и скачиваете видео, обычно за 3–7 минут.' },
    ],
  },
  uk: {
    code: 'uk',
    title: (f) => `${f.engine} — ШІ-генератор відео для YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} у Kineo: готовий вертикальний Short з українською озвучкою та субтитрами, ${f.credits} кредитів за відео 60 с. Безкоштовний пробний період: ${f.trial} кредитів, без картки.`,
    h1: (f) => `${f.engine}: з однієї ідеї — готовий Short`,
    lead: (f) => `Введіть ідею або вставте сценарій. Kineo пише сцени, запускає ${f.engine}, записує українську озвучку, додає субтитри й віддає Short 9:16, готовий до публікації.`,
    about: {
      'kineo-1': () => `${K1} — найшвидший і найдешевший рушій Kineo: справжні кадри під кожну фразу озвучки, нейромережевий голос і субтитри слово в слово. Рушій першого відео — і щоденного потоку.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) не шукає стокові кадри: генерує кожну сцену за вашим сценарієм. Ви вводите ідею, Kineo веде Seedance сцену за сценою, озвучує, субтитрує й збирає Short.`,
      veo: () => `Veo 3.1 — флагманська відеомодель Google. У Kineo це не генератор кліпів, які потім треба монтувати: на вході ідея, на виході готовий Short — сценарій, голос, сцени Veo і субтитри.`,
    },
    howTitle: 'Як це працює',
    how: ['Введіть ідею або вставте сценарій (до 1 000 символів).', 'Kineo пише сцени, добирає або генерує кадри, записує голос і субтитри.', 'Завантажте Short 9:16 і опублікуйте в YouTube Shorts, TikTok чи Reels.'],
    costTitle: 'Скільки коштує',
    cost: (f) => `${f.credits} кредитів за відео 60 секунд. Кожен новий акаунт отримує ${f.trial} безкоштовних кредитів без картки — ${f.covers ? 'цього вистачає на повне відео цим рушієм (з водяним знаком)' : `цього не вистачає на повне відео цим рушієм: перший фільм ${f.engine} приходить із планом Starter (${f.starter})`}.`,
    proofTitle: (f) => `Справжні Shorts, відрендерені ${f.engine}`,
    proofLine: 'Не демо: готові відео реальних акаунтів Kineo, а значок називає рушій, який їх справді відрендерив.',
    faq: (f) => [
      { q: `Відео з ${f.engine} буде українською?`, a: 'Так. Сценарій, нейромережевий голос і субтитри — українською; мову вибрано при переході з цієї сторінки.' },
      { q: `Скільки коштує відео ${f.engine}?`, a: `${f.credits} кредитів за відео 60 с. Пробний період дає ${f.trial} кредитів без картки${f.covers ? ' — вистачає на повне відео з водяним знаком' : ` — на відео ${f.engine} не вистачає: перший фільм приходить зі Starter (${f.starter})`}. Платні плани відкривають MP4 без водяного знака.` },
      { q: 'Потрібно вміти монтувати чи з’являтися в кадрі?', a: 'Ні. Формат faceless: ШІ пише, озвучує, добирає або генерує сцени й додає субтитри. Ви вводите тему і завантажуєте відео, зазвичай за 3–7 хвилин.' },
    ],
  },
  ar: {
    code: 'ar',
    title: (f) => `${f.engine} — مولّد فيديو بالذكاء الاصطناعي ليوتيوب شورتس | Kineo`,
    description: (f) => `${f.engine} في Kineo: شورتس عمودي كامل بتعليق صوتي عربي وترجمة، ${f.credits} رصيدًا لكل فيديو 60 ثانية. تجربة مجانية بـ ${f.trial} أرصدة، بدون بطاقة.`,
    h1: (f) => `${f.engine}: من فكرة واحدة إلى شورتس جاهز`,
    lead: (f) => `اكتب فكرة أو الصق نصك. يكتب Kineo المشاهد، ويشغّل ${f.engine}، ويسجّل الصوت بالعربية، ويضيف الترجمة، ويسلّمك شورتس 9:16 جاهزًا للنشر.`,
    about: {
      'kineo-1': () => `${K1} هو أسرع محركات Kineo وأرخصها: لقطات حقيقية مختارة لكل جملة في السرد، صوت عصبي، وترجمة كلمة بكلمة. إنه محرك فيديوك الأول — ومحرك الإنتاج اليومي.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) لا يبحث عن لقطات مخزّنة: يولّد كل مشهد من نصك. تكتب الفكرة، ويقود Kineo محرك Seedance مشهدًا مشهدًا، ويعلّق صوتيًا ويترجم ويجمّع الشورتس.`,
      veo: () => `Veo 3.1 هو نموذج الفيديو الرائد من Google. في Kineo ليس مولّد مقاطع تحتاج إلى مونتاج لاحق: تدخل فكرة، ويخرج شورتس كامل — نص وصوت ومشاهد Veo وترجمة.`,
    },
    howTitle: 'كيف يعمل',
    how: ['اكتب فكرة أو الصق نصًا (حتى 1000 حرف).', 'يكتب Kineo المشاهد، ويختار اللقطات أو يولّدها، ويسجّل الصوت والترجمة.', 'نزّل الشورتس 9:16 وانشره على يوتيوب شورتس أو تيك توك أو ريلز.'],
    costTitle: 'كم يكلّف',
    cost: (f) => `${f.credits} رصيدًا لكل فيديو 60 ثانية. يحصل كل حساب جديد على ${f.trial} أرصدة مجانية بدون بطاقة — ${f.covers ? 'تكفي لفيديو كامل بهذا المحرك (بعلامة مائية)' : `لا تكفي لفيديو كامل بهذا المحرك: أول فيلم ${f.engine} يأتي مع خطة Starter (${f.starter})`}.`,
    proofTitle: (f) => `شورتس حقيقية أُنتجت بـ ${f.engine}`,
    proofLine: 'ليس عرضًا ترويجيًا: فيديوهات مكتملة من حسابات Kineo حقيقية، والشارة تسمّي المحرك الذي أنتجها فعلًا.',
    faq: (f) => [
      { q: `هل يخرج الفيديو بالعربية مع ${f.engine}؟`, a: 'نعم. النص والصوت العصبي والترجمة تخرج بالعربية — واللغة محددة مسبقًا عند القدوم من هذه الصفحة.' },
      { q: `كم يكلّف فيديو ${f.engine}؟`, a: `${f.credits} رصيدًا لكل فيديو 60 ثانية. تمنح التجربة المجانية ${f.trial} أرصدة بدون بطاقة${f.covers ? '، وهي تكفي لفيديو كامل بعلامة مائية' : `، وهي لا تكفي لفيديو ${f.engine}: أول فيلم يأتي مع Starter (${f.starter})`}. الخطط المدفوعة تفتح ملف MP4 بلا علامة مائية.` },
      { q: 'هل أحتاج إلى معرفة المونتاج أو الظهور أمام الكاميرا؟', a: 'لا. أسلوب faceless: يكتب الذكاء الاصطناعي ويعلّق صوتيًا ويختار المشاهد أو يولّدها ويضيف الترجمة. تكتب الموضوع وتنزّل الفيديو، عادةً خلال 3 إلى 7 دقائق.' },
    ],
  },
  ur: {
    code: 'ur',
    title: (f) => `${f.engine} — یوٹیوب شارٹس کے لیے AI ویڈیو جنریٹر | Kineo`,
    description: (f) => `Kineo میں ${f.engine}: اردو وائس اوور اور سب ٹائٹلز کے ساتھ مکمل عمودی شارٹ، 60 سیکنڈ کی ویڈیو کے ${f.credits} کریڈٹ۔ ${f.trial} کریڈٹ کی مفت آزمائش، بغیر کارڈ۔`,
    h1: (f) => `${f.engine}: ایک آئیڈیا سے تیار شارٹ تک`,
    lead: (f) => `ایک آئیڈیا لکھیں یا اپنا اسکرپٹ پیسٹ کریں۔ Kineo مناظر لکھتا ہے، ${f.engine} چلاتا ہے، اردو آواز ریکارڈ کرتا ہے، سب ٹائٹلز لگاتا ہے اور پوسٹ کرنے کے لیے تیار 9:16 شارٹ دیتا ہے۔`,
    about: {
      'kineo-1': () => `${K1} Kineo کا تیز ترین اور سستا ترین انجن ہے: بیانیے کے ہر جملے کے لیے حقیقی مناظر، نیورل آواز اور لفظ بہ لفظ سب ٹائٹلز۔ آپ کی پہلی ویڈیو — اور روزانہ کے حجم — کا انجن۔`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) اسٹاک مناظر نہیں ڈھونڈتا: ہر منظر آپ کے اسکرپٹ سے بناتا ہے۔ آپ آئیڈیا لکھتے ہیں، Kineo منظر بہ منظر Seedance کو ہدایت دیتا ہے، آواز، سب ٹائٹلز اور شارٹ جوڑتا ہے۔`,
      veo: () => `Veo 3.1 گوگل کا فلیگ شپ ویڈیو ماڈل ہے۔ Kineo میں یہ کلپ جنریٹر نہیں جسے بعد میں ایڈٹ کرنا پڑے: ایک آئیڈیا اندر، مکمل شارٹ باہر — اسکرپٹ، آواز، Veo کے مناظر اور سب ٹائٹلز۔`,
    },
    howTitle: 'یہ کیسے کام کرتا ہے',
    how: ['آئیڈیا لکھیں یا اسکرپٹ پیسٹ کریں (زیادہ سے زیادہ 1,000 حروف)۔', 'Kineo مناظر لکھتا، فوٹیج چنتا یا بناتا، آواز اور سب ٹائٹلز ریکارڈ کرتا ہے۔', '9:16 شارٹ ڈاؤن لوڈ کریں اور یوٹیوب شارٹس، ٹک ٹاک یا ریلز پر پوسٹ کریں۔'],
    costTitle: 'قیمت کیا ہے',
    cost: (f) => `60 سیکنڈ کی ویڈیو کے ${f.credits} کریڈٹ۔ ہر نئے اکاؤنٹ کو بغیر کارڈ ${f.trial} مفت کریڈٹ ملتے ہیں — ${f.covers ? 'اس انجن سے مکمل ویڈیو کے لیے کافی (واٹر مارک کے ساتھ)' : `اس انجن سے مکمل ویڈیو کے لیے ناکافی: آپ کی پہلی ${f.engine} فلم Starter پلان کے ساتھ آتی ہے (${f.starter})`}۔`,
    proofTitle: (f) => `${f.engine} سے بنی حقیقی شارٹس`,
    proofLine: 'ڈیمو نہیں: حقیقی Kineo اکاؤنٹس کی مکمل ویڈیوز، اور بیج اس انجن کا نام بتاتا ہے جس نے واقعی انہیں بنایا۔',
    faq: (f) => [
      { q: `کیا ${f.engine} سے ویڈیو اردو میں بنتی ہے؟`, a: 'جی ہاں۔ اسکرپٹ، نیورل آواز اور سب ٹائٹلز اردو میں — زبان اس صفحے سے پہلے سے منتخب ہوتی ہے۔' },
      { q: `${f.engine} ویڈیو کی قیمت کیا ہے؟`, a: `60 سیکنڈ کی ویڈیو کے ${f.credits} کریڈٹ۔ مفت آزمائش بغیر کارڈ ${f.trial} کریڈٹ دیتی ہے${f.covers ? '، جو واٹر مارک والی مکمل ویڈیو کے لیے کافی ہے' : `، جو ${f.engine} ویڈیو کے لیے کافی نہیں: پہلی فلم Starter کے ساتھ آتی ہے (${f.starter})`}۔ ادا شدہ پلان بغیر واٹر مارک MP4 کھولتے ہیں۔` },
      { q: 'کیا مجھے ایڈیٹنگ آنی چاہیے یا کیمرے پر آنا ہوگا؟', a: 'نہیں۔ faceless طرز: AI لکھتا، بولتا، مناظر چنتا یا بناتا اور سب ٹائٹلز لگاتا ہے۔ آپ موضوع لکھیں اور ویڈیو ڈاؤن لوڈ کریں، عموماً 3 سے 7 منٹ میں۔' },
    ],
  },
  hi: {
    code: 'hi',
    title: (f) => `${f.engine} — YouTube Shorts के लिए AI वीडियो जनरेटर | Kineo`,
    description: (f) => `Kineo में ${f.engine}: हिंदी वॉइसओवर और सबटाइटल के साथ पूरा वर्टिकल शॉर्ट, 60 सेकंड के वीडियो के ${f.credits} क्रेडिट। ${f.trial} क्रेडिट का मुफ़्त ट्रायल, बिना कार्ड।`,
    h1: (f) => `${f.engine}: एक आइडिया से तैयार शॉर्ट तक`,
    lead: (f) => `एक आइडिया लिखें या अपनी स्क्रिप्ट पेस्ट करें। Kineo सीन लिखता है, ${f.engine} चलाता है, हिंदी आवाज़ रिकॉर्ड करता है, सबटाइटल जोड़ता है और पोस्ट के लिए तैयार 9:16 शॉर्ट देता है।`,
    about: {
      'kineo-1': () => `${K1} Kineo का सबसे तेज़ और सबसे सस्ता इंजन है: नैरेशन के हर वाक्य के लिए चुने गए असली शॉट्स, न्यूरल आवाज़ और शब्द-दर-शब्द सबटाइटल। यह आपके पहले वीडियो — और रोज़ के वॉल्यूम — का इंजन है।`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) स्टॉक फ़ुटेज नहीं ढूँढता: हर सीन आपकी स्क्रिप्ट से जनरेट करता है। आप आइडिया लिखते हैं, Kineo सीन-दर-सीन Seedance को निर्देश देता है, नैरेट करता है, सबटाइटल लगाता है और शॉर्ट जोड़ता है।`,
      veo: () => `Veo 3.1 Google का फ़्लैगशिप वीडियो मॉडल है। Kineo में यह क्लिप जनरेटर नहीं जिसे बाद में एडिट करना पड़े: एक आइडिया अंदर, पूरा शॉर्ट बाहर — स्क्रिप्ट, आवाज़, Veo के सीन और सबटाइटल।`,
    },
    howTitle: 'यह कैसे काम करता है',
    how: ['आइडिया लिखें या स्क्रिप्ट पेस्ट करें (1,000 अक्षरों तक)।', 'Kineo सीन लिखता है, फ़ुटेज चुनता या जनरेट करता है, आवाज़ और सबटाइटल रिकॉर्ड करता है।', '9:16 शॉर्ट डाउनलोड करें और YouTube Shorts, TikTok या Reels पर पोस्ट करें।'],
    costTitle: 'कितना खर्च',
    cost: (f) => `60 सेकंड के वीडियो के ${f.credits} क्रेडिट। हर नए अकाउंट को बिना कार्ड ${f.trial} मुफ़्त क्रेडिट मिलते हैं — ${f.covers ? 'इस इंजन से एक पूरा वीडियो बनाने के लिए काफ़ी (वॉटरमार्क के साथ)' : `इस इंजन से पूरे वीडियो के लिए काफ़ी नहीं: आपकी पहली ${f.engine} फ़िल्म Starter प्लान के साथ आती है (${f.starter})`}।`,
    proofTitle: (f) => `${f.engine} से बने असली शॉर्ट्स`,
    proofLine: 'डेमो नहीं: असली Kineo अकाउंट्स के पूरे वीडियो, और बैज उस इंजन का नाम बताता है जिसने सच में उन्हें बनाया।',
    faq: (f) => [
      { q: `क्या ${f.engine} से वीडियो हिंदी में बनता है?`, a: 'हाँ। स्क्रिप्ट, न्यूरल आवाज़ और सबटाइटल हिंदी में — इस पेज से आने पर भाषा पहले से चुनी होती है।' },
      { q: `${f.engine} वीडियो की कीमत क्या है?`, a: `60 सेकंड के वीडियो के ${f.credits} क्रेडिट। मुफ़्त ट्रायल बिना कार्ड ${f.trial} क्रेडिट देता है${f.covers ? ', जो वॉटरमार्क वाले एक पूरे वीडियो के लिए काफ़ी है' : `, जो ${f.engine} वीडियो के लिए काफ़ी नहीं: पहली फ़िल्म Starter के साथ आती है (${f.starter})`}। पेड प्लान बिना वॉटरमार्क MP4 खोलते हैं।` },
      { q: 'क्या मुझे एडिटिंग आनी चाहिए या कैमरे पर आना होगा?', a: 'नहीं। faceless फ़ॉर्मेट: AI लिखता, बोलता, सीन चुनता या बनाता और सबटाइटल जोड़ता है। आप विषय लिखें और वीडियो डाउनलोड करें, आमतौर पर 3 से 7 मिनट में।' },
    ],
  },
  id: {
    code: 'id',
    title: (f) => `${f.engine} — generator video AI untuk YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} di Kineo: Short vertikal lengkap dengan sulih suara bahasa Indonesia dan subtitel, ${f.credits} kredit per video 60 detik. Uji coba gratis ${f.trial} kredit, tanpa kartu.`,
    h1: (f) => `${f.engine}: dari satu ide menjadi Short jadi`,
    lead: (f) => `Ketik ide atau tempel naskah Anda. Kineo menulis adegan, menjalankan ${f.engine}, merekam suara bahasa Indonesia, menambahkan subtitel, dan menyerahkan Short 9:16 siap posting.`,
    about: {
      'kineo-1': () => `${K1} adalah mesin tercepat dan termurah Kineo: rekaman nyata yang dipilih untuk setiap kalimat narasi, suara neural, dan subtitel kata per kata. Mesin untuk video pertama Anda — dan volume harian.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) tidak mencari stok rekaman: ia menghasilkan setiap adegan dari naskah Anda. Anda mengetik ide, Kineo mengarahkan Seedance adegan demi adegan, mengisi suara, memberi subtitel, dan merakit Short.`,
      veo: () => `Veo 3.1 adalah model video unggulan Google. Di Kineo, ini bukan generator klip yang harus Anda edit lagi: satu ide masuk, satu Short lengkap keluar — naskah, suara, adegan Veo, dan subtitel.`,
    },
    howTitle: 'Cara kerjanya',
    how: ['Ketik ide atau tempel naskah (maksimal 1.000 karakter).', 'Kineo menulis adegan, memilih atau menghasilkan rekaman, merekam suara dan subtitel.', 'Unduh Short 9:16 dan posting di YouTube Shorts, TikTok, atau Reels.'],
    costTitle: 'Berapa biayanya',
    cost: (f) => `${f.credits} kredit per video 60 detik. Setiap akun baru mendapat ${f.trial} kredit gratis, tanpa kartu — ${f.covers ? 'cukup untuk satu video lengkap dengan mesin ini (dengan watermark)' : `tidak cukup untuk satu video lengkap dengan mesin ini: film ${f.engine} pertama Anda datang bersama paket Starter (${f.starter})`}.`,
    proofTitle: (f) => `Short asli yang dirender oleh ${f.engine}`,
    proofLine: 'Bukan demo: video jadi dari akun Kineo sungguhan, dan lencananya menyebut mesin yang benar-benar merendernya.',
    faq: (f) => [
      { q: `Apakah video dengan ${f.engine} keluar dalam bahasa Indonesia?`, a: 'Ya. Naskah, suara neural, dan subtitel dalam bahasa Indonesia — bahasanya sudah terpilih dari halaman ini.' },
      { q: `Berapa biaya satu video ${f.engine}?`, a: `${f.credits} kredit per video 60 detik. Uji coba gratis memberi ${f.trial} kredit tanpa kartu${f.covers ? ', cukup untuk satu video lengkap dengan watermark' : `, tidak cukup untuk video ${f.engine}: film pertama datang bersama Starter (${f.starter})`}. Paket berbayar membuka MP4 tanpa watermark.` },
      { q: 'Harus bisa mengedit atau tampil di kamera?', a: 'Tidak. Format faceless: AI menulis, mengisi suara, memilih atau menghasilkan adegan, dan menambahkan subtitel. Anda mengetik topik dan mengunduh video, biasanya 3–7 menit.' },
    ],
  },
  vi: {
    code: 'vi',
    title: (f) => `${f.engine} — trình tạo video AI cho YouTube Shorts | Kineo`,
    description: (f) => `${f.engine} trong Kineo: Short dọc hoàn chỉnh với lồng tiếng tiếng Việt và phụ đề, ${f.credits} tín dụng cho mỗi video 60 giây. Dùng thử miễn phí ${f.trial} tín dụng, không cần thẻ.`,
    h1: (f) => `${f.engine}: từ một ý tưởng thành Short hoàn chỉnh`,
    lead: (f) => `Gõ một ý tưởng hoặc dán kịch bản. Kineo viết cảnh, chạy ${f.engine}, thu giọng tiếng Việt, thêm phụ đề và trả về Short 9:16 sẵn sàng đăng.`,
    about: {
      'kineo-1': () => `${K1} là động cơ nhanh nhất và rẻ nhất của Kineo: cảnh quay thật được chọn cho từng câu lời dẫn, giọng nơ-ron và phụ đề từng chữ. Động cơ cho video đầu tiên của bạn — và cho khối lượng hằng ngày.`,
      seedance: () => `Seedance 1.5 Pro (ByteDance) không tìm cảnh quay kho: nó tạo từng cảnh từ kịch bản của bạn. Bạn gõ ý tưởng, Kineo điều khiển Seedance từng cảnh, đọc lời, thêm phụ đề và ráp Short.`,
      veo: () => `Veo 3.1 là mô hình video đầu bảng của Google. Trong Kineo, đây không phải trình tạo clip để bạn dựng lại sau: một ý tưởng vào, một Short hoàn chỉnh ra — kịch bản, giọng, cảnh Veo và phụ đề.`,
    },
    howTitle: 'Cách hoạt động',
    how: ['Gõ ý tưởng hoặc dán kịch bản (tối đa 1.000 ký tự).', 'Kineo viết cảnh, chọn hoặc tạo cảnh quay, thu giọng và phụ đề.', 'Tải Short 9:16 và đăng lên YouTube Shorts, TikTok hoặc Reels.'],
    costTitle: 'Chi phí',
    cost: (f) => `${f.credits} tín dụng cho mỗi video 60 giây. Mỗi tài khoản mới nhận ${f.trial} tín dụng miễn phí, không cần thẻ — ${f.covers ? 'đủ cho một video hoàn chỉnh bằng động cơ này (có watermark)' : `không đủ cho một video hoàn chỉnh bằng động cơ này: phim ${f.engine} đầu tiên của bạn đi kèm gói Starter (${f.starter})`}.`,
    proofTitle: (f) => `Short thật do ${f.engine} kết xuất`,
    proofLine: 'Không phải demo: video hoàn chỉnh từ tài khoản Kineo thật, và huy hiệu ghi đúng động cơ đã kết xuất chúng.',
    faq: (f) => [
      { q: `Video với ${f.engine} có ra tiếng Việt không?`, a: 'Có. Kịch bản, giọng nơ-ron và phụ đề đều tiếng Việt — ngôn ngữ đã được chọn sẵn từ trang này.' },
      { q: `Một video ${f.engine} giá bao nhiêu?`, a: `${f.credits} tín dụng cho mỗi video 60 giây. Dùng thử miễn phí cho ${f.trial} tín dụng không cần thẻ${f.covers ? ', đủ cho một video hoàn chỉnh có watermark' : `, không đủ cho video ${f.engine}: phim đầu tiên đi kèm Starter (${f.starter})`}. Gói trả phí mở khóa MP4 không watermark.` },
      { q: 'Tôi có cần biết dựng phim hay lộ mặt không?', a: 'Không. Định dạng faceless: AI viết, đọc, chọn hoặc tạo cảnh và thêm phụ đề. Bạn gõ chủ đề và tải video, thường trong 3–7 phút.' },
    ],
  },
}

export const ENGINE_LANG_CODES = Object.keys(ENGINE_LANGS) as Array<FreeShortsLang['code']>

/** hreflang das 14 versões de uma página de motor (en + 13). */
export function engineAlternates(base: string, slug: LocalizedEngineSlug): Record<string, string> {
  const out: Record<string, string> = { en: `${base}/ai-video-generator/${slug}` }
  for (const code of ENGINE_LANG_CODES) out[FREE_SHORTS_LANG_BY_CODE[code].locale] = `${base}/ai-video-generator/${slug}/${code}`
  out['x-default'] = out.en
  return out
}
