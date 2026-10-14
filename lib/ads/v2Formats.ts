// KINEO-ADS-MELHORIAS-1410 — FORMATOS do anúncio v2: 9:16 (padrão, Reels/TikTok/Stories), 4:5 e 1:1 (feed do Instagram e do
// Facebook). Fundador 14/10, "tudo sim": a escolha mora em "Mais opções", com os MESMOS créditos.
//
// SÓ ONDE O PIPELINE INTEIRO ACEITA (schemas da fal conferidos no OpenAPI público em 14/10/2026):
//   · foto do cliente → o navegador recorta NO FORMATO (1080×1920 · 1080×1350 · 1080×1080), com o mesmo ponto focal;
//   · Kling O3 Pro i2v e MiniMax H3 i2v (reserva): não têm aspect_ratio e SEGUEM A FOTO → saem no formato;
//   · Nano Banana Pro edit (cenas criadas): aspect_ratio aceita '4:5' e '1:1' → mandado explícito;
//   · Seedance 2.0 Fast i2v (herói do Premium): aspect_ratio aceita '1:1' mas NÃO '4:5' → Premium só em 9:16 e 1:1;
//   · PixVerse v5 effects (estilos): o schema não tem aspect_ratio nem garante seguir a foto, e as 17 prévias aprovadas são
//     verticais → estilo só em 9:16 ("This style is vertical only");
//   · ator (Kling AI Avatar v2): sem aspect_ratio, retrato 9:16 da biblioteca → ator só em 9:16;
//   · montagem (Creatomate): largura/altura do quadro de lib/renderProfile.ts (renderOutputSpecFor) e o cartão final 9:16
//     reposicionado para caber no quadro (adsV2CardFrame, lib/ads/adV2Montage.ts); frases e vídeo do cliente já são relativos.
// Formato que o pipeline não aceita = 400 'format_unsupported' no /plan (nunca um anúncio esticado ou cortado no escuro).
// 9:16 = NADA muda: o corpo, o plano gravado e os inputs da fal ficam byte a byte os de antes (a chave `format` só aparece fora
// do 9:16).
// A LÓGICA (lista, recorte, bloqueios, pedido da cena) mora em lib/ads/v2ShotLists.ts — a lib pura que o núcleo do /plan, o avanço
// e a tela já importam. Aqui ficam só as FRASES nas 16 línguas.
// LIB PURA: só import type.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsV2Format, AdsV2FormatBlock } from '@/lib/ads/v2ShotLists'

// ── frases (16 línguas) ──────────────────────────────────────────────────────────────────────────────────────────────
export interface AdsV2FormatCopy {
  label: string
  /** Nome de cada formato e onde ele vai. */
  options: Record<AdsV2Format, { name: string; where: string }>
  sameCredits: string
  /** Por que o formato está fechado. */
  blocked: Record<AdsV2FormatBlock, string>
}

const EN: AdsV2FormatCopy = {
  label: 'Format',
  options: { '9:16': { name: 'Vertical 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Portrait 4:5', where: 'Instagram and Facebook feed' }, '1:1': { name: 'Square 1:1', where: 'Feed posts' } },
  sameCredits: 'Same credits in every format.',
  blocked: { style: 'This style is vertical only (9:16).', presenter: 'The AI presenter is vertical only (9:16).', premium_45: 'Premium comes in 9:16 or 1:1 (its hero close-up has no 4:5).' },
}

export const ADS_V2_FORMAT_COPY: Record<InterfaceLanguage, AdsV2FormatCopy> = {
  en: EN,
  pt: { label: 'Formato', options: { '9:16': { name: 'Vertical 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Retrato 4:5', where: 'Feed do Instagram e do Facebook' }, '1:1': { name: 'Quadrado 1:1', where: 'Posts no feed' } }, sameCredits: 'Mesmos créditos em todos os formatos.', blocked: { style: 'Este estilo é só vertical (9:16).', presenter: 'O apresentador de IA é só vertical (9:16).', premium_45: 'O Premium sai em 9:16 ou 1:1 (o close-herói não tem 4:5).' } },
  es: { label: 'Formato', options: { '9:16': { name: 'Vertical 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Retrato 4:5', where: 'Feed de Instagram y Facebook' }, '1:1': { name: 'Cuadrado 1:1', where: 'Publicaciones en el feed' } }, sameCredits: 'Mismos créditos en todos los formatos.', blocked: { style: 'Este estilo es solo vertical (9:16).', presenter: 'El presentador de IA es solo vertical (9:16).', premium_45: 'Premium sale en 9:16 o 1:1 (el primer plano héroe no tiene 4:5).' } },
  fr: { label: 'Format', options: { '9:16': { name: 'Vertical 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Portrait 4:5', where: 'Fil Instagram et Facebook' }, '1:1': { name: 'Carré 1:1', where: 'Publications du fil' } }, sameCredits: 'Mêmes crédits dans tous les formats.', blocked: { style: 'Ce style est uniquement vertical (9:16).', presenter: 'Le présentateur IA est uniquement vertical (9:16).', premium_45: 'Premium existe en 9:16 ou 1:1 (son gros plan héros n’a pas de 4:5).' } },
  de: { label: 'Format', options: { '9:16': { name: 'Hochformat 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Porträt 4:5', where: 'Instagram- und Facebook-Feed' }, '1:1': { name: 'Quadrat 1:1', where: 'Feed-Beiträge' } }, sameCredits: 'Gleiche Credits in jedem Format.', blocked: { style: 'Diesen Stil gibt es nur im Hochformat (9:16).', presenter: 'Den KI-Sprecher gibt es nur im Hochformat (9:16).', premium_45: 'Premium gibt es in 9:16 oder 1:1 (die Helden-Nahaufnahme hat kein 4:5).' } },
  it: { label: 'Formato', options: { '9:16': { name: 'Verticale 9:16', where: 'Reels, TikTok, Storie' }, '4:5': { name: 'Ritratto 4:5', where: 'Feed di Instagram e Facebook' }, '1:1': { name: 'Quadrato 1:1', where: 'Post nel feed' } }, sameCredits: 'Stessi crediti in ogni formato.', blocked: { style: 'Questo stile è solo verticale (9:16).', presenter: 'Il presentatore IA è solo verticale (9:16).', premium_45: 'Premium esce in 9:16 o 1:1 (il primo piano eroe non ha il 4:5).' } },
  nl: { label: 'Formaat', options: { '9:16': { name: 'Verticaal 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Portret 4:5', where: 'Instagram- en Facebook-feed' }, '1:1': { name: 'Vierkant 1:1', where: 'Feedposts' } }, sameCredits: 'Dezelfde credits in elk formaat.', blocked: { style: 'Deze stijl is alleen verticaal (9:16).', presenter: 'De AI-presentator is alleen verticaal (9:16).', premium_45: 'Premium komt in 9:16 of 1:1 (de hero-close-up heeft geen 4:5).' } },
  pl: { label: 'Format', options: { '9:16': { name: 'Pionowy 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Portret 4:5', where: 'Feed Instagrama i Facebooka' }, '1:1': { name: 'Kwadrat 1:1', where: 'Posty w feedzie' } }, sameCredits: 'Te same kredyty w każdym formacie.', blocked: { style: 'Ten styl jest tylko pionowy (9:16).', presenter: 'Prezenter AI jest tylko pionowy (9:16).', premium_45: 'Premium jest w 9:16 lub 1:1 (zbliżenie bohatera nie ma 4:5).' } },
  tr: { label: 'Format', options: { '9:16': { name: 'Dikey 9:16', where: 'Reels, TikTok, Hikâyeler' }, '4:5': { name: 'Portre 4:5', where: 'Instagram ve Facebook akışı' }, '1:1': { name: 'Kare 1:1', where: 'Akış gönderileri' } }, sameCredits: 'Her formatta aynı kredi.', blocked: { style: 'Bu stil yalnızca dikey (9:16).', presenter: 'Yapay zekâ sunucusu yalnızca dikey (9:16).', premium_45: 'Premium 9:16 veya 1:1 olur (kahraman yakın çekimin 4:5’i yok).' } },
  ru: { label: 'Формат', options: { '9:16': { name: 'Вертикальный 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Портрет 4:5', where: 'Лента Instagram и Facebook' }, '1:1': { name: 'Квадрат 1:1', where: 'Посты в ленте' } }, sameCredits: 'Одинаковые кредиты в любом формате.', blocked: { style: 'Этот стиль только вертикальный (9:16).', presenter: 'ИИ-ведущий только вертикальный (9:16).', premium_45: 'Premium выходит в 9:16 или 1:1 (у главного крупного плана нет 4:5).' } },
  uk: { label: 'Формат', options: { '9:16': { name: 'Вертикальний 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Портрет 4:5', where: 'Стрічка Instagram і Facebook' }, '1:1': { name: 'Квадрат 1:1', where: 'Дописи у стрічці' } }, sameCredits: 'Однакові кредити в будь-якому форматі.', blocked: { style: 'Цей стиль лише вертикальний (9:16).', presenter: 'ШІ-ведучий лише вертикальний (9:16).', premium_45: 'Premium виходить у 9:16 або 1:1 (у головного великого плану немає 4:5).' } },
  ar: { label: 'المقاس', options: { '9:16': { name: 'عمودي 9:16', where: 'ريلز وتيك توك والقصص' }, '4:5': { name: 'طولي 4:5', where: 'خلاصة إنستغرام وفيسبوك' }, '1:1': { name: 'مربع 1:1', where: 'منشورات الخلاصة' } }, sameCredits: 'الرصيد نفسه في كل المقاسات.', blocked: { style: 'هذا النمط عمودي فقط (9:16).', presenter: 'المقدّم بالذكاء الاصطناعي عمودي فقط (9:16).', premium_45: 'يصدر Premium بمقاس 9:16 أو 1:1 (اللقطة القريبة البطلة لا تدعم 4:5).' } },
  ur: { label: 'فارمیٹ', options: { '9:16': { name: 'عمودی 9:16', where: 'ریلز، ٹک ٹاک، اسٹوریز' }, '4:5': { name: 'پورٹریٹ 4:5', where: 'انسٹاگرام اور فیس بک فیڈ' }, '1:1': { name: 'مربع 1:1', where: 'فیڈ پوسٹس' } }, sameCredits: 'ہر فارمیٹ میں اتنے ہی کریڈٹس۔', blocked: { style: 'یہ اسٹائل صرف عمودی (9:16) ہے۔', presenter: 'AI پریزینٹر صرف عمودی (9:16) ہے۔', premium_45: 'Premium صرف 9:16 یا 1:1 میں آتا ہے (ہیرو کلوز اپ میں 4:5 نہیں)۔' } },
  hi: { label: 'फ़ॉर्मैट', options: { '9:16': { name: 'वर्टिकल 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'पोर्ट्रेट 4:5', where: 'Instagram और Facebook फ़ीड' }, '1:1': { name: 'स्क्वेयर 1:1', where: 'फ़ीड पोस्ट' } }, sameCredits: 'हर फ़ॉर्मैट में उतने ही क्रेडिट।', blocked: { style: 'यह स्टाइल सिर्फ़ वर्टिकल (9:16) है।', presenter: 'AI प्रेज़ेंटर सिर्फ़ वर्टिकल (9:16) है।', premium_45: 'Premium 9:16 या 1:1 में आता है (हीरो क्लोज़-अप में 4:5 नहीं है)।' } },
  id: { label: 'Format', options: { '9:16': { name: 'Vertikal 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Potret 4:5', where: 'Feed Instagram dan Facebook' }, '1:1': { name: 'Persegi 1:1', where: 'Postingan feed' } }, sameCredits: 'Kredit sama di semua format.', blocked: { style: 'Gaya ini hanya vertikal (9:16).', presenter: 'Presenter AI hanya vertikal (9:16).', premium_45: 'Premium tersedia di 9:16 atau 1:1 (close-up utamanya tidak punya 4:5).' } },
  vi: { label: 'Định dạng', options: { '9:16': { name: 'Dọc 9:16', where: 'Reels, TikTok, Stories' }, '4:5': { name: 'Chân dung 4:5', where: 'Bảng tin Instagram và Facebook' }, '1:1': { name: 'Vuông 1:1', where: 'Bài đăng bảng tin' } }, sameCredits: 'Cùng số tín dụng ở mọi định dạng.', blocked: { style: 'Phong cách này chỉ có dạng dọc (9:16).', presenter: 'Người dẫn AI chỉ có dạng dọc (9:16).', premium_45: 'Premium có 9:16 hoặc 1:1 (cận cảnh chính không có 4:5).' } },
}

export function adsV2FormatCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2FormatCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return ADS_V2_FORMAT_COPY[k] ?? EN
}
