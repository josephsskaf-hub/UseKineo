// KINEO-ADS-FIEL-2-1510 — o lado da TELA dos consertos do QA da trava (Studio Ads v2, modo simples, 15/10). LIB PURA (só `import type`):
// entra no AdsV2Simple ('use client') e roda crua no guardião scripts/test-ads-fiel-2-1510.mjs.
//
//   5. "Start over" volta ao padrão (Auto, Comercial, "Um produto") — nada herdado do anúncio anterior (o nível lembrado e o estilo sugerido
//      pelo setor só valem na 1ª abertura); link de PRODUTO nunca vira "Um lugar" (o título "Café Ultra Coffee 250g" caía em restaurante
//      pela palavra "café").
//   3b. O título do cartão final: o nome DIGITADO; senão o nome LIDO (página do link, marca escolhida, nome ensinado à voz); o substantivo
//      genérico ("Perfume") só quando não existe nome melhor.
//   6. O contador "N roteiros restantes hoje" (16 línguas) — só para quem tem teto (a casa não tem).
//   8. Nome que soa estrangeiro para a língua da voz = a tela PERGUNTA como falar ("Como a voz deve dizer 'Atheeri'?"); nada é gerado
//      sozinho.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export type AdsV2KindFiel2 = 'product' | 'place'

/** 5. O padrão de uma sessão nova depois do "Start over": estilo Auto ('none'), nível Comercial, tipo detectado (vazio = produto). */
export const ADS_V2_START_OVER_DEFAULTS = { tier: 'commercial', style: 'none', kind: 'product' } as const

/** Peso/volume no nome ("250g", "50 ml", "1 kg"): é produto embalado, nunca lugar. */
export const ADS_V2_PRODUCT_UNIT_RE = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s?(?:g|gr|kg|mg|ml|cl|l|lt|oz|lb|lbs|un|und)(?![\p{L}\p{N}])/iu

/**
 * 5. O tipo do anúncio na tela: a escolha da pessoa manda; com link de produto LIDO, ou peso/volume no nome, é produto; senão a
 * detecção de sempre (`detected`, de adsV2AdKind). Pura.
 */
export function adsV2KindFor(i: { choice: AdsV2KindFiel2 | null; detected: AdsV2KindFiel2; linkRead: string | null | undefined; sentence: string }): AdsV2KindFiel2 {
  if (i.choice === 'product' || i.choice === 'place') return i.choice
  if (typeof i.linkRead === 'string' && i.linkRead.trim()) return 'product'
  if (ADS_V2_PRODUCT_UNIT_RE.test(String(i.sentence ?? ''))) return 'product'
  return i.detected
}

/** Nomes de marca que são o padrão da casa, não um nome de verdade. */
const PLACEHOLDER_BRAND = /^(my brand|minha marca|mi marca|ma marque|meine marke|la mia marca|mijn merk|moja marka|markam|моя марка|мій бренд|علامتي|میرا برانڈ|मेरा ब्रांड|merek saya|thương hiệu của tôi|brand)$/iu

/**
 * 3b. O título do cartão final (pura): o digitado; senão, se o título de sempre (`fallback`) é só o substantivo genérico (`generic`), o
 * primeiro nome LIDO que existir — a página do link, a marca escolhida (o nome padrão "My brand" não conta), o nome ensinado à voz; senão
 * o `fallback` de sempre.
 */
export function adsV2EndCardTitle(i: { typed: string; fallback: string; generic: boolean; linkName?: string | null; brandName?: string | null; pronWord?: string | null }): string {
  const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 60) : '')
  const typed = clean(i.typed)
  if (typed) return typed
  const fallback = clean(i.fallback)
  if (!i.generic && fallback) return fallback
  const brand = clean(i.brandName)
  for (const c of [clean(i.linkName), PLACEHOLDER_BRAND.test(brand) ? '' : brand, clean(i.pronWord)]) if (c) return c
  return fallback
}

// ── 8. nome estrangeiro para a voz ──────────────────────────────────────────────────────────────────────────────────────
/** Padrões raros em cada língua da voz (letras e grupos que a voz daquela língua costuma ler errado). Simples de propósito. */
const UNUSUAL: Readonly<Record<string, RegExp>> = {
  pt: /(ee|oo|aa|ii|uu|th|sh|w|k|y|tt|ff|pp|dd|gg|bb|zz|q(?!u)|[bcdfgkptvwy]$)/iu,
  es: /(ee|oo|aa|ii|uu|th|sh|w|k|tt|ff|pp|dd|gg|bb|ss|zz|q(?!u)|[bcfgkpt]$)/iu,
  it: /(ee|aa|ii|uu|th|sh|w|k|y|q(?!u)|[bdfgkptvwy]$)/iu,
  fr: /(ee|aa|ii|uu|th|sh|w|k|q(?!u))/iu,
  en: /([ãõâêîôûàèìòùçñäöüßøå]|q(?!u)|aa|ii|uu|lh|nh|ij)/iu,
  de: /([ãõâêîôûàèìòùçñøå]|q(?!u)|th|ee(?=[^r]|$)|ii|uu)/iu,
  nl: /([ãõâêîôûàèìòùçñäöüßøå]|q(?!u)|th|sh|w(?=$)|y)/iu,
}
/** Línguas da voz com outra escrita: nome em letras latinas é sempre estrangeiro para ela. */
const NON_LATIN_VOICES = new Set(['ru', 'uk', 'ar', 'ur', 'hi', 'ja', 'zh', 'ko', 'el', 'he', 'th', 'fa', 'bn'])
/** Palavras internacionais que toda voz lê bem (não vale perguntar). */
const COMMON_WORDS = new Set(['coffee', 'cafe', 'café', 'shop', 'store', 'beauty', 'home', 'food', 'pizza', 'burger', 'studio', 'spa', 'pet', 'gym', 'club', 'pro', 'plus', 'max', 'mini', 'ultra', 'top', 'smart', 'gold', 'premium', 'perfume', 'parfum', 'shampoo', 'fitness', 'bar', 'by', 'and', 'the', 'eau', 'de', 'la', 'le', 'del', 'do', 'da', 'des'])

/**
 * 8. A 1ª palavra do nome que soa ESTRANGEIRA para a língua da voz (null = nenhuma): letra/grupo raro naquela língua, fora da lista de
 * palavras que toda voz lê bem; numa voz de outra escrita (russo, árabe, hindi…), qualquer palavra em letras latinas. Pura.
 */
export function adsV2ForeignName(name: string | null | undefined, voiceLang: string | null | undefined): string | null {
  const lang = String(voiceLang ?? '').toLowerCase().slice(0, 2)
  const words = String(name ?? '').split(/[\s|/–—\-.,:;()&+]+/u).map((w) => w.trim()).filter(Boolean)
  for (const w of words) {
    if (w.length < 3 || /\d/.test(w)) continue
    const low = w.toLocaleLowerCase()
    if (COMMON_WORDS.has(low)) continue
    if (NON_LATIN_VOICES.has(lang)) { if (/^[\p{Script=Latin}'’]+$/u.test(w)) return w; continue }
    const re = UNUSUAL[lang]
    if (re && /^[\p{Script=Latin}'’]+$/u.test(w) && re.test(low)) return w
  }
  return null
}

export interface AdsV2Fiel2Copy {
  /** "Como a voz deve dizer '{name}'?" */
  pronounceAsk: string
  /** a linha de baixo */
  pronounceHint: string
  /** "{n} roteiros restantes hoje" */
  plansLeft: string
  /** "Último roteiro de hoje" (n = 1) */
  plansLeftOne: string
}

/** As frases nas 16 línguas da interface (nenhuma cai no inglês). */
export const ADS_V2_FIEL2_COPY: Record<InterfaceLanguage, AdsV2Fiel2Copy> = {
  en: { pronounceAsk: 'How should the voice say “{name}”?', pronounceHint: 'Optional. Write it the way it sounds — the screen keeps the real spelling.', plansLeft: '{n} scripts left today', plansLeftOne: '1 script left today' },
  pt: { pronounceAsk: 'Como a voz deve dizer “{name}”?', pronounceHint: 'Opcional. Escreva como se fala — a tela mantém a grafia real.', plansLeft: '{n} roteiros restantes hoje', plansLeftOne: '1 roteiro restante hoje' },
  es: { pronounceAsk: '¿Cómo debe decir la voz “{name}”?', pronounceHint: 'Opcional. Escríbelo como suena; la pantalla mantiene la ortografía real.', plansLeft: 'Te quedan {n} guiones hoy', plansLeftOne: 'Te queda 1 guion hoy' },
  fr: { pronounceAsk: 'Comment la voix doit-elle dire « {name} » ?', pronounceHint: 'Facultatif. Écrivez-le comme il se prononce ; l’écran garde la vraie orthographe.', plansLeft: 'Encore {n} scripts aujourd’hui', plansLeftOne: 'Encore 1 script aujourd’hui' },
  de: { pronounceAsk: 'Wie soll die Stimme „{name}“ aussprechen?', pronounceHint: 'Optional. Schreib es so, wie man es spricht – im Bild bleibt die echte Schreibweise.', plansLeft: 'Heute noch {n} Skripte', plansLeftOne: 'Heute noch 1 Skript' },
  it: { pronounceAsk: 'Come deve dire la voce “{name}”?', pronounceHint: 'Facoltativo. Scrivilo come si pronuncia: sullo schermo resta la grafia reale.', plansLeft: 'Ancora {n} copioni oggi', plansLeftOne: 'Ancora 1 copione oggi' },
  nl: { pronounceAsk: 'Hoe moet de stem “{name}” zeggen?', pronounceHint: 'Optioneel. Schrijf het zoals je het uitspreekt; in beeld blijft de echte spelling.', plansLeft: 'Nog {n} scripts vandaag', plansLeftOne: 'Nog 1 script vandaag' },
  pl: { pronounceAsk: 'Jak lektor ma wymówić „{name}”?', pronounceHint: 'Opcjonalne. Napisz tak, jak się wymawia — na ekranie zostaje prawdziwa pisownia.', plansLeft: 'Dziś zostało {n} scenariuszy', plansLeftOne: 'Dziś został 1 scenariusz' },
  tr: { pronounceAsk: 'Ses “{name}” adını nasıl söylesin?', pronounceHint: 'İsteğe bağlı. Okunduğu gibi yaz; ekranda gerçek yazılış kalır.', plansLeft: 'Bugün {n} senaryo hakkın kaldı', plansLeftOne: 'Bugün 1 senaryo hakkın kaldı' },
  ru: { pronounceAsk: 'Как голосу произносить «{name}»?', pronounceHint: 'Необязательно. Напишите, как это звучит, — на экране останется настоящее написание.', plansLeft: 'Сегодня осталось сценариев: {n}', plansLeftOne: 'Сегодня остался 1 сценарий' },
  uk: { pronounceAsk: 'Як голосу вимовляти «{name}»?', pronounceHint: 'Необов’язково. Напишіть, як це звучить, — на екрані лишиться справжнє написання.', plansLeft: 'Сьогодні лишилося сценаріїв: {n}', plansLeftOne: 'Сьогодні лишився 1 сценарій' },
  ar: { pronounceAsk: 'كيف يجب أن ينطق الصوت «{name}»؟', pronounceHint: 'اختياري. اكتبه كما يُنطق، ويبقى النص على الشاشة بالكتابة الحقيقية.', plansLeft: 'تبقّى لك {n} نصوص اليوم', plansLeftOne: 'تبقّى لك نص واحد اليوم' },
  ur: { pronounceAsk: 'آواز «{name}» کو کیسے بولے؟', pronounceHint: 'اختیاری۔ جیسے بولا جاتا ہے ویسے لکھیں — اسکرین پر اصل ہجے رہیں گے۔', plansLeft: 'آج {n} اسکرپٹ باقی ہیں', plansLeftOne: 'آج 1 اسکرپٹ باقی ہے' },
  hi: { pronounceAsk: 'आवाज़ “{name}” को कैसे बोले?', pronounceHint: 'वैकल्पिक। जैसे बोला जाता है वैसे लिखें — स्क्रीन पर असली वर्तनी रहेगी।', plansLeft: 'आज {n} स्क्रिप्ट बाकी हैं', plansLeftOne: 'आज 1 स्क्रिप्ट बाकी है' },
  id: { pronounceAsk: 'Bagaimana suara harus mengucapkan “{name}”?', pronounceHint: 'Opsional. Tulis sesuai bunyinya — layar tetap memakai ejaan asli.', plansLeft: 'Sisa {n} naskah hari ini', plansLeftOne: 'Sisa 1 naskah hari ini' },
  vi: { pronounceAsk: 'Giọng đọc nên nói “{name}” thế nào?', pronounceHint: 'Không bắt buộc. Viết theo cách đọc — trên màn hình vẫn giữ đúng chính tả.', plansLeft: 'Hôm nay còn {n} kịch bản', plansLeftOne: 'Hôm nay còn 1 kịch bản' },
}

export function adsV2Fiel2Copy(lang: InterfaceLanguage | string | null | undefined): AdsV2Fiel2Copy {
  return ADS_V2_FIEL2_COPY[(lang ?? 'en') as InterfaceLanguage] ?? ADS_V2_FIEL2_COPY.en
}

/** 6. A frase do contador (null = não mostra: sem teto, ou ainda longe do fim). Pura. */
export function adsV2PlansLeftText(copy: AdsV2Fiel2Copy, left: number | null | undefined, warnAt: number): string | null {
  if (typeof left !== 'number' || !Number.isFinite(left) || left < 0 || left > warnAt) return null
  return left === 1 ? copy.plansLeftOne : copy.plansLeft.split('{n}').join(String(left))
}
