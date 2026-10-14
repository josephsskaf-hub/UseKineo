// KINEO-ADS-DEMO-UNIVERSO-1410 — "COMO PRONUNCIAR A MARCA" (Studio Ads, modo simples, em "Mais opções").
//
// Demo de 14/10 para uma agência: a voz (MiniMax speech-2.8-hd) leu "Atheeri" como "a terra e". O nome escrito é o da marca e
// não muda; o que muda é o que a VOZ recebe. A pessoa escreve, opcionalmente, o nome como está escrito e como se fala
// ("Atheeri" → "a-TÉ-ri"). O pedido guarda isso em brief.pronounce; na hora da voz (lib/ads/v2Advance.ts) a narração que vai
// à TTS troca o nome pela grafia fonética — o roteiro salvo (plan.narration), as frases na tela (plan.overlays) e o cartão
// final continuam com a grafia real (o anúncio do Ads não tem legenda palavra por palavra: a fala só existe na voz).
// Mesmo preço (nada aqui conta crédito). Sem o campo = a narração de sempre, byte a byte.
// LIB PURA (só `import type`).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2Pronounce {
  /** O nome como está escrito (o que aparece na narração). */
  word: string
  /** Como a voz deve falar. */
  say: string
}

export const ADS_V2_PRONOUNCE_MAX_CHARS = 40
export const ADS_V2_PRONOUNCE_MAX_WORDS = 6

const oneLine = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

/**
 * O par (nome escrito, fala) limpo, ou null. Nome: 1–40 caracteres de letra/número/espaço/' - . &. Fala: 1–40 caracteres, até 6
 * palavras, SÓ letras (qualquer escrita), espaço, hífen e apóstrofo — nada de link, número ou instrução para a voz.
 * Fala igual ao nome (sem diferença de maiúsculas) = nada a trocar (null).
 */
export function sanitizeAdsV2Pronounce(raw: unknown): AdsV2Pronounce | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const word = oneLine(r.word)
  const say = oneLine(r.say)
  if (!word || !say || word.length > ADS_V2_PRONOUNCE_MAX_CHARS || say.length > ADS_V2_PRONOUNCE_MAX_CHARS) return null
  if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '’&.-]*$/u.test(word)) return null
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u.test(say)) return null
  if (say.split(' ').length > ADS_V2_PRONOUNCE_MAX_WORDS) return null
  if (say.toLocaleLowerCase() === word.toLocaleLowerCase()) return null
  return { word, say }
}

/** A pronúncia gravada no brief do pedido (conferida de novo), ou null. */
export function adsV2PronounceOf(brief: unknown): AdsV2Pronounce | null {
  return brief && typeof brief === 'object' ? sanitizeAdsV2Pronounce((brief as Record<string, unknown>).pronounce) : null
}

/**
 * A narração que vai à VOZ: cada ocorrência do nome escrito (maiúsculas não importam; palavra inteira — fronteira Unicode, não \b)
 * vira a fala. Sem pronúncia = o texto IGUAL ao de entrada. Nunca usada para tela, legenda ou cartão.
 */
export function adsV2NarrationForTts(narration: string, pronounce: AdsV2Pronounce | null | undefined): string {
  if (!pronounce) return narration
  const p = sanitizeAdsV2Pronounce(pronounce)
  if (!p) return narration
  const pattern = p.word.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
  return narration.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu'), () => p.say)
}

/** O nome que a tela propõe quando a pessoa não escreveu: o título do cartão até o travessão ("Atheeri – Lattafa" → "Atheeri"). */
export function adsV2PronounceDefaultWord(cardTitle: string | null | undefined): string {
  return oneLine(cardTitle).split(/\s+[—–-]\s+/)[0].trim().slice(0, ADS_V2_PRONOUNCE_MAX_CHARS)
}

export interface AdsV2PronounceCopy {
  /** título do campo */
  label: string
  /** a linha de baixo: a voz fala assim, a tela mantém a grafia */
  hint: string
  /** "Nome da marca" (como está escrito) */
  word: string
  /** "Falar como" */
  say: string
  /** exemplo de fala */
  sayPlaceholder: string
}

/** As frases do campo nas 16 línguas da interface (nenhuma cai no inglês). */
export const ADS_V2_PRONOUNCE_COPY: Record<InterfaceLanguage, AdsV2PronounceCopy> = {
  en: { label: 'How to pronounce the brand', hint: 'Optional. The voice says it this way; the text on screen keeps the real spelling.', word: 'Brand name', say: 'Say it like', sayPlaceholder: 'e.g. ah-TEH-ree' },
  pt: { label: 'Como pronunciar a marca', hint: 'Opcional. A voz fala assim; o texto na tela mantém a grafia real.', word: 'Nome da marca', say: 'Falar como', sayPlaceholder: 'ex.: a-TÉ-ri' },
  es: { label: 'Cómo pronunciar la marca', hint: 'Opcional. La voz lo dice así; el texto en pantalla mantiene la ortografía real.', word: 'Nombre de la marca', say: 'Decir como', sayPlaceholder: 'ej.: a-TÉ-ri' },
  fr: { label: 'Comment prononcer la marque', hint: 'Facultatif. La voix le dit ainsi ; le texte à l’écran garde la vraie orthographe.', word: 'Nom de la marque', say: 'À prononcer', sayPlaceholder: 'ex. : a-TÉ-ri' },
  de: { label: 'Wie man die Marke ausspricht', hint: 'Optional. Die Stimme spricht es so aus; der Text im Bild behält die echte Schreibweise.', word: 'Markenname', say: 'Aussprechen als', sayPlaceholder: 'z. B. a-TEH-ri' },
  it: { label: 'Come si pronuncia il marchio', hint: 'Facoltativo. La voce lo dice così; il testo sullo schermo mantiene la grafia reale.', word: 'Nome del marchio', say: 'Pronuncia come', sayPlaceholder: 'es. a-TÈ-ri' },
  nl: { label: 'Hoe je het merk uitspreekt', hint: 'Optioneel. De stem zegt het zo; de tekst in beeld houdt de echte spelling.', word: 'Merknaam', say: 'Uitspreken als', sayPlaceholder: 'bijv. a-TEE-rie' },
  pl: { label: 'Jak wymawiać markę', hint: 'Opcjonalne. Lektor powie to tak; tekst na ekranie zachowa prawdziwą pisownię.', word: 'Nazwa marki', say: 'Wymawiaj jak', sayPlaceholder: 'np. a-TE-ri' },
  tr: { label: 'Marka nasıl okunur', hint: 'İsteğe bağlı. Ses böyle okur; ekrandaki yazı gerçek yazılışı korur.', word: 'Marka adı', say: 'Şöyle oku', sayPlaceholder: 'örn. a-TE-ri' },
  ru: { label: 'Как произносить бренд', hint: 'Необязательно. Голос произнесёт так; текст на экране сохранит настоящее написание.', word: 'Название бренда', say: 'Произносить как', sayPlaceholder: 'напр. а-ТЕ-ри' },
  uk: { label: 'Як вимовляти бренд', hint: 'Необов’язково. Голос вимовить так; текст на екрані збереже справжнє написання.', word: 'Назва бренду', say: 'Вимовляти як', sayPlaceholder: 'напр. а-ТЕ-рі' },
  ar: { label: 'كيف تُنطق العلامة التجارية', hint: 'اختياري. يقرؤها الصوت هكذا، ويبقى النص على الشاشة بالكتابة الحقيقية.', word: 'اسم العلامة', say: 'انطقها هكذا', sayPlaceholder: 'مثال: a-TEH-ree' },
  ur: { label: 'برانڈ کا تلفظ کیسے کریں', hint: 'اختیاری۔ آواز اسے اسی طرح بولے گی؛ اسکرین پر لکھا نام اصل ہجے میں رہے گا۔', word: 'برانڈ کا نام', say: 'ایسے بولیں', sayPlaceholder: 'مثلاً: a-TEH-ree' },
  hi: { label: 'ब्रांड का उच्चारण कैसे करें', hint: 'वैकल्पिक। आवाज़ इसे ऐसे बोलेगी; स्क्रीन पर लिखा नाम असली स्पेलिंग में रहेगा।', word: 'ब्रांड का नाम', say: 'ऐसे बोलें', sayPlaceholder: 'जैसे: a-TEH-ree' },
  id: { label: 'Cara mengucapkan merek', hint: 'Opsional. Suara mengucapkannya begini; teks di layar tetap memakai ejaan asli.', word: 'Nama merek', say: 'Ucapkan seperti', sayPlaceholder: 'mis. a-TÉ-ri' },
  vi: { label: 'Cách phát âm thương hiệu', hint: 'Không bắt buộc. Giọng đọc sẽ nói như thế này; chữ trên màn hình giữ đúng chính tả.', word: 'Tên thương hiệu', say: 'Đọc là', sayPlaceholder: 'vd: a-TÊ-ri' },
}

export function adsV2PronounceCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2PronounceCopy {
  return ADS_V2_PRONOUNCE_COPY[(lang ?? 'en') as InterfaceLanguage] ?? ADS_V2_PRONOUNCE_COPY.en
}
