// KINEO-ATOR-FTC-2026-10-13 — o aviso de RÓTULO DE IA na entrega do anúncio (tela de resultado do /ads, simples e completo,
// e o quadro das variações, onde fica o botão de baixar).
//
// POR QUÊ (fundador 13/10, "tudo sim"): o anúncio pode ter uma pessoa de IA realista (o ator, lib/ads/v2Presenter.ts) e
// cenas criadas. TikTok, Meta e YouTube exigem que quem posta marque conteúdo realista feito com IA — a obrigação é de quem
// publica, então o aviso aparece exatamente onde a pessoa pega o vídeo. NÃO é marca d'água: a montagem (adV2Montage) não
// muda. Texto curto, nas 16 línguas da interface; língua desconhecida = inglês.
//
// LIB PURA (só `import type`): o guardião scripts/test-ator-sem-depoimento-1310.mjs importa este arquivo cru no Node.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export const ADS_V2_AI_LABEL_NOTICE: Record<InterfaceLanguage, string> = {
  en: "Made with AI — when you post it, turn on the platform's AI label (TikTok/Meta/YouTube require it for realistic AI people).",
  pt: 'Feito com IA — ao postar, ligue o rótulo de IA da plataforma (TikTok/Meta/YouTube exigem isso para pessoas realistas feitas com IA).',
  es: 'Hecho con IA — al publicarlo, activa la etiqueta de IA de la plataforma (TikTok/Meta/YouTube la exigen para personas realistas hechas con IA).',
  fr: "Fait avec l'IA — en le publiant, activez l'étiquette IA de la plateforme (TikTok/Meta/YouTube l'exigent pour les personnes réalistes créées par IA).",
  de: 'Mit KI erstellt — aktiviere beim Posten das KI-Label der Plattform (TikTok/Meta/YouTube verlangen es für realistische KI-Personen).',
  it: "Creato con l'IA — quando lo pubblichi, attiva l'etichetta IA della piattaforma (TikTok/Meta/YouTube la richiedono per persone realistiche create con l'IA).",
  nl: 'Gemaakt met AI — zet bij het posten het AI-label van het platform aan (TikTok/Meta/YouTube vereisen dat voor realistische AI-personen).',
  pl: 'Stworzone z AI — publikując, włącz etykietę AI na platformie (TikTok/Meta/YouTube wymagają jej dla realistycznych osób stworzonych przez AI).',
  tr: 'Yapay zekâ ile yapıldı — paylaşırken platformun yapay zekâ etiketini aç (TikTok/Meta/YouTube gerçekçi yapay zekâ kişileri için bunu zorunlu tutar).',
  ru: 'Сделано с помощью ИИ — при публикации включите метку ИИ на платформе (TikTok/Meta/YouTube требуют её для реалистичных ИИ-людей).',
  uk: 'Створено за допомогою ШІ — під час публікації увімкніть мітку ШІ на платформі (TikTok/Meta/YouTube вимагають її для реалістичних ШІ-людей).',
  ar: 'صُنع بالذكاء الاصطناعي — عند النشر، فعّل وسم الذكاء الاصطناعي في المنصة (TikTok/Meta/YouTube تشترطه للأشخاص الواقعيين المصنوعين بالذكاء الاصطناعي).',
  ur: 'AI سے بنایا گیا — پوسٹ کرتے وقت پلیٹ فارم کا AI لیبل آن کریں (TikTok/Meta/YouTube حقیقت نما AI لوگوں کے لیے اسے لازمی قرار دیتے ہیں)۔',
  hi: 'AI से बनाया गया — पोस्ट करते समय प्लेटफ़ॉर्म का AI लेबल चालू करें (TikTok/Meta/YouTube असली दिखने वाले AI लोगों के लिए इसे ज़रूरी मानते हैं)।',
  id: 'Dibuat dengan AI — saat memposting, nyalakan label AI di platform (TikTok/Meta/YouTube mewajibkannya untuk orang AI yang tampak nyata).',
  vi: 'Được tạo bằng AI — khi đăng, hãy bật nhãn AI của nền tảng (TikTok/Meta/YouTube yêu cầu điều này với người AI trông như thật).',
}

/** O aviso na língua da interface (língua desconhecida = inglês). */
export function adsV2AiLabelNotice(language: InterfaceLanguage | string | null | undefined): string {
  return (typeof language === 'string' && (ADS_V2_AI_LABEL_NOTICE as Record<string, string>)[language]) || ADS_V2_AI_LABEL_NOTICE.en
}
