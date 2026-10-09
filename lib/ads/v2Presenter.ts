// KINEO-ATOR-ANUNCIO-2026-10-09 — "Person talking about it": um ATOR de IA segura o produto do cliente e fala a narração.
//
// Decisão do fundador (09/10/2026): 8 de 14 concorrentes vendem uma pessoa de IA falando do produto (Arcads, Creatify,
// HeyGen, InVideo). O teste real aprovado: 1 foto de IA de uma mulher segurando um sérum + a voz da narração → 32 s no
// fal-ai/kling-video/ai-avatar/v2/standard ({ image_url, audio_url, prompt } → { video: { url } }, ~US$ 0,056/s) — "boca
// acompanhando a fala". O motor já existia na casa (lib/avatar/veed.ts PRESENTER_MODEL).
//
// COMO ENTRA NO ANÚNCIO v2 (lib/ads/v2Advance.ts):
//   1. Foto do ator: uma linha EXTRA em ads_v2_shots (idx ADS_V2_PRESENTER_IDX, kind 'presenter', source
//      'generated_scene') que nasce pelo MESMO Nano Banana Pro edit das cenas criadas (fal-ai/nano-banana-pro/edit, 9:16,
//      2K), com a foto do PRODUTO do cliente como referência. A imagem é copiada para o nosso bucket (a URL da fal expira).
//   2. Voz: a MESMA narração do anúncio (MiniMax 2.8 HD, synthesizeTtsFallback), sintetizada assim que a linha do ator
//      existe (a montagem usaria a mesma voz de qualquer jeito — nunca é gasto à toa).
//   3. Plano falado: Kling AI Avatar v2 com a foto do ator + a voz (motor 'kling_avatar'). Duração = a da voz.
//   4. Montagem (lib/ads/adV2Montage.ts): o ator vira a trilha BASE do anúncio do começo ao fim da fala; as fotos do
//      cliente (e o plano do estilo, se houver) entram como inserts curtos por cima, com a voz do ator SEMPRE correndo
//      (nunca uma 2ª voz por cima: a TTS separada não entra). Música por baixo, mais baixa. Cartão final com o logo real.
//   5. NUNCA mata o pedido: ator que falha 2 vezes (ou sem acesso, sem voz, voz longa demais, prazo) = o anúncio normal
//      sai com os planos que já estavam planejados. O preço em créditos NÃO muda (o custo do ator é menor que o Cinema).
//
// Só aparece com a narração LIGADA e com pelo menos UMA foto marcada como produto (senão 400
// 'presenter_needs_voice_and_product'). A voz padrão da MiniMax 2.8 HD na casa (sem voice_setting) é feminina; por isso o
// ator é sempre uma MULHER adulta (varia idade/cabelo pela semente do pedido) — boca e voz do mesmo gênero.
//
// LIB PURA (só `import type`, apagado na transpilação): o guardião scripts/test-ads-ator-2026-10-09.mjs importa este
// arquivo cru no Node. ESPELHOS conferidos pelo guardião: ADS_V2_PRESENTER_SLUG = PRESENTER_MODEL e
// ADS_V2_PRESENTER_PERFORMANCE_PROMPT = PRESENTER_ENERGETIC_PERFORMANCE_PROMPT (lib/avatar/veed.ts), US$/s =
// PRESENTER_USD_PER_SECOND; v2Tiers.ts (ADS_V2_KLING_AVATAR_SLUG, ADS_V2_ENGINES.kling_avatar) repete o slug e o preço.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** Interruptor ÚNICO do ator. false = a tela esconde o cartão e o /plan ignora o campo (o anúncio sai como antes). */
export const ADS_V2_PRESENTER_PUBLIC = true

/** Kling AI Avatar v2 Standard (espelho de PRESENTER_MODEL, lib/avatar/veed.ts). */
export const ADS_V2_PRESENTER_SLUG = 'fal-ai/kling-video/ai-avatar/v2/standard'
/** US$ por segundo do vídeo falado (espelho de PRESENTER_USD_PER_SECOND, lib/avatar/veed.ts). */
export const ADS_V2_PRESENTER_USD_PER_SECOND = 0.0562
/** Direção de atuação aprovada em produção (espelho EXATO de PRESENTER_ENERGETIC_PERFORMANCE_PROMPT). */
export const ADS_V2_PRESENTER_PERFORMANCE_PROMPT =
  'the person speaks directly to the camera with upbeat presenter energy: lively but controlled visible-hand gestures, confident head and shoulder movement, expressive posture matching the rhythm of the speech, realistic natural motion, stable camera, preserve the exact face and appearance'

/** A linha do ator em ads_v2_shots: idx fora do alcance dos planos (o CHECK do banco aceita 0..31). */
export const ADS_V2_PRESENTER_IDX = 31
export const ADS_V2_PRESENTER_KIND = 'presenter' as const
export type AdsV2PresenterKind = typeof ADS_V2_PRESENTER_KIND
export const ADS_V2_PRESENTER_ENGINE = 'kling_avatar' as const
export const ADS_V2_PRESENTER_ROLE = 'presenter'
/** Tentativas do ator dentro do pedido (imagem ou vídeo): a 2ª falha = desiste e o anúncio normal sai. */
export const ADS_V2_PRESENTER_MAX_ATTEMPTS = 2
/** Ator ainda não pronto depois disto (desde o início do pedido) = desiste (o prazo do pedido é 90 min). */
export const ADS_V2_PRESENTER_GIVEUP_MS = 45 * 60 * 1000
/** Classes em que repetir não adianta: desiste na hora (o anúncio normal segue). */
export const ADS_V2_PRESENTER_GIVEUP_CLASSES: readonly string[] = ['balance_quota', 'auth_model_access', 'local_policy_gate']
/** A voz do ator pode passar do alvo até isto (espelho de ADS_V2_CARD_MAX_SECONDS − ADS_V2_CARD_SECONDS, v2Advance). */
export const ADS_V2_PRESENTER_EXTRA_SECONDS = 4
/** Teto de áudio que o ator aceita (o modelo aceita bem mais; o anúncio nunca chega perto). */
export const ADS_V2_PRESENTER_MODEL_MAX_SECONDS = 60
/** Prévia da tela (feita do teste aprovado pelo fundador: 6 s, 360×640, sem som). */
export const ADS_V2_PRESENTER_PREVIEW = '/ads-styles/presenter.mp4'
export const ADS_V2_PRESENTER_POSTER = '/ads-styles/presenter.jpg'

/** Quem segura o produto: sempre uma mulher adulta (a voz padrão é feminina), variando idade e cabelo pela semente. */
export const ADS_V2_PRESENTER_PEOPLE: readonly string[] = [
  'a friendly woman in her late twenties with long dark wavy hair',
  'a friendly woman in her thirties with short curly hair',
  'a cheerful woman in her forties with shoulder-length blonde hair',
  'a friendly woman in her early thirties with straight black hair in a low ponytail',
  'a warm woman in her thirties with long brown braids',
  'a smiling woman in her late twenties with a red-brown bob haircut',
]

/** Fundo neutro que combina com o setor (sempre desfocado: o produto e o rosto mandam). */
const SETTING: Readonly<Record<string, string>> = {
  restaurant: 'a cozy restaurant interior',
  clinic: 'a clean, bright clinic reception',
  real_estate: 'a bright modern living room',
  gym: 'a bright, modern gym',
  salon: 'a bright beauty salon',
  store: 'a bright, tidy shop',
  app_service: 'a bright, modern home office',
  other: 'a bright, simple home interior',
}

/** Semente estável do pedido → índice da pessoa (FNV-1a 32 bits). Mesmo pedido = mesma pessoa em toda tentativa. */
export function adsV2PresenterPerson(seedKey: string): number {
  let h = 0x811c9dc5
  const s = String(seedKey ?? '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % ADS_V2_PRESENTER_PEOPLE.length
}

/**
 * O prompt da foto do ator (Nano Banana Pro edit, a foto do produto como ÚNICA referência). Selfie de celular, olhando
 * para a câmera, segurando O produto do cliente perto do rosto/peito, luz natural, BOCA FECHADA (o avatar abre a boca no
 * ritmo da voz), fundo do setor desfocado, sem texto e sem logo inventado. Não passa pela régua anti-invenção do /plan
 * (checkV2Prompts): é texto fixo nosso, sem nada do cliente.
 */
export function adsV2ActorPrompt(sector: string | null | undefined, person: number): string {
  const who = ADS_V2_PRESENTER_PEOPLE[Number.isInteger(person) && person >= 0 ? person % ADS_V2_PRESENTER_PEOPLE.length : 0]
  const where = SETTING[typeof sector === 'string' ? sector : 'other'] ?? SETTING.other
  return [
    `Realistic vertical smartphone selfie photo of ${who}, looking straight into the camera with a friendly, natural expression, mouth closed.`,
    'She holds the product from the reference photo in one hand near her face and chest, label facing the camera, clearly visible.',
    'Keep the product EXACTLY as in the reference photo: same shape, colors, label, text and proportions. Do not redesign, rename, resize or add anything to the product.',
    'Head, shoulders and the hand with the product in frame, centered, face in the upper half of the frame, natural window light, real skin texture, UGC look.',
    `Background: ${where}, softly out of focus.`,
    'No text, no captions, no logos or watermarks added, no other products, only one person.',
  ].join(' ')
}

/** O que o plano guarda do ator (ads_v2_orders.plan.presenter). */
export interface AdsV2PresenterPlan {
  /** A foto do produto do cliente (user_footage do dono) que vai como referência da foto do ator. */
  productFootageId: string
  productUrl: string
  /** Índice em ADS_V2_PRESENTER_PEOPLE (semente do pedido). */
  person: number
  actorPrompt: string
}

const HTTPS_RE = /^https:\/\/\S+$/i

/**
 * O ator do pedido: a 1ª foto marcada como 'product'. null = sem foto de produto (a rota recusa antes, com 400).
 * `seedKey` = o id do pedido (a pessoa varia de pedido para pedido, e é a mesma em toda tentativa do mesmo pedido).
 */
export function planAdsV2Presenter(input: { sector: string | null | undefined; photos: readonly { footage_id: string; kind: string; url: string }[]; seedKey: string }): AdsV2PresenterPlan | null {
  const photo = (Array.isArray(input.photos) ? input.photos : []).find((p) => p && p.kind === 'product' && typeof p.url === 'string' && HTTPS_RE.test(p.url.trim()))
  if (!photo) return null
  const person = adsV2PresenterPerson(input.seedKey)
  return { productFootageId: photo.footage_id, productUrl: photo.url.trim(), person, actorPrompt: adsV2ActorPrompt(input.sector, person) }
}

export function isAdsV2PresenterPlan(raw: unknown): raw is AdsV2PresenterPlan {
  const p = raw as Partial<AdsV2PresenterPlan> | null
  return !!p && typeof p === 'object' && typeof p.productFootageId === 'string' && typeof p.productUrl === 'string' && HTTPS_RE.test(p.productUrl) &&
    typeof p.actorPrompt === 'string' && p.actorPrompt.trim().length > 10 && typeof p.person === 'number'
}

/** A voz cabe no ator? (alvo do anúncio + a mesma folga do cartão; e o teto do modelo). */
export function adsV2PresenterVoiceFits(voiceSeconds: number | null | undefined, orderSeconds: number): boolean {
  return typeof voiceSeconds === 'number' && Number.isFinite(voiceSeconds) && voiceSeconds > 0 &&
    voiceSeconds <= Math.min(orderSeconds + ADS_V2_PRESENTER_EXTRA_SECONDS, ADS_V2_PRESENTER_MODEL_MAX_SECONDS)
}

/** O ator desistiu (falhou e não tem mais tentativa, ou a falha é das que repetir não adianta)? O anúncio normal segue. */
export function adsV2PresenterGaveUp(row: { status: string; attempt: number; reason_class: string | null }): boolean {
  if (row.status !== 'failed' && row.status !== 'stuck') return false
  return row.attempt >= ADS_V2_PRESENTER_MAX_ATTEMPTS || (!!row.reason_class && ADS_V2_PRESENTER_GIVEUP_CLASSES.includes(row.reason_class))
}

/** A linha do ator (tentativa 1): nasce 'pending' sem imagem; a imagem sai pelo Nano Banana e o vídeo espera a voz. */
export function adsV2PresenterInitialRow(orderId: string, p: AdsV2PresenterPlan): Record<string, unknown> {
  return {
    order_id: orderId,
    idx: ADS_V2_PRESENTER_IDX,
    attempt: 1,
    role: ADS_V2_PRESENTER_ROLE,
    kind: ADS_V2_PRESENTER_KIND,
    source: 'generated_scene',
    source_footage_id: p.productFootageId,
    image_url: null,
    engine: ADS_V2_PRESENTER_ENGINE,
    prompt: ADS_V2_PRESENTER_PERFORMANCE_PROMPT,
    gen_seconds: null,
    cut_start: 0,
    cut_seconds: null,
    movement_variant: 0,
    status: 'pending',
  }
}

/**
 * Ordem dos inserts por cima do ator: o plano do ESTILO primeiro (o efeito é o "uau"), depois herói do produto, produto,
 * lugar, gente e o vídeo do cliente. Só material DO CLIENTE (foto animada ou vídeo dele): cena criada (gente de IA) não
 * entra — outra pessoa de IA ao lado do ator confunde — e foto de texto (tela/cardápio) também não. Devolve os idx.
 */
export function adsV2PresenterInsertOrder(shots: readonly { idx: number; kind: string; source: string; effect?: unknown }[]): number[] {
  const rank = (s: { kind: string; effect?: unknown }): number => {
    if (typeof s.effect === 'string' && s.effect) return 0
    switch (s.kind) {
      case 'product_hero': return 1
      case 'product': return 2
      case 'place': return 3
      case 'people': return 4
      case 'user_video': return 5
      default: return 99
    }
  }
  return shots
    .filter((s) => s.source === 'client_photo' && s.kind !== 'text' && rank(s) < 99)
    .slice()
    .sort((a, b) => rank(a) - rank(b) || a.idx - b.idx)
    .map((s) => s.idx)
}

// ─── as frases da tela (16 línguas da interface; nenhuma cai no inglês) ──────────────────────────────────────────────
export interface AdsV2PresenterCopy {
  /** título do cartão */
  title: string
  /** a linha curta do cartão */
  line: string
  /** selo do cartão */
  badge: string
  /** motivo do cartão desligado: narração desligada */
  needsVoice: string
  /** motivo do cartão desligado: nenhuma foto de produto */
  needsProduct: string
  /** onde o produto vem (modo simples: a 1ª foto) */
  simpleNote: string
  /** onde o produto vem (modo completo: a foto marcada como Produto) */
  fullNote: string
  /** no plano: o ator vai entrar */
  planLine: string
  /** no plano: pediu o ator, mas não deu (sem foto de produto ou sem voz) */
  notApplied: string
}

export const ADS_V2_PRESENTER_COPY: Record<InterfaceLanguage, AdsV2PresenterCopy> = {
  en: {
    title: 'Person talking about it',
    line: 'An AI person holds your product and says your script',
    badge: 'New',
    needsVoice: 'Turn the voice-over on to use this.',
    needsProduct: 'Mark one photo as Product to use this.',
    simpleNote: 'They hold your first photo: put your product photo first.',
    fullNote: 'They hold the photo you marked as Product.',
    planLine: 'An AI person holds your product and says the voice-over.',
    notApplied: 'No product photo or no voice-over, so this ad comes out without the person.',
  },
  pt: {
    title: 'Pessoa falando do produto',
    line: 'Uma pessoa de IA segura seu produto e fala o seu texto',
    badge: 'Novo',
    needsVoice: 'Ligue a narração para usar isto.',
    needsProduct: 'Marque uma foto como Produto para usar isto.',
    simpleNote: 'Ela segura a sua primeira foto: coloque a foto do produto primeiro.',
    fullNote: 'Ela segura a foto que você marcou como Produto.',
    planLine: 'Uma pessoa de IA segura seu produto e fala a narração.',
    notApplied: 'Sem foto de produto ou sem narração, então este anúncio sai sem a pessoa.',
  },
  es: {
    title: 'Persona hablando del producto',
    line: 'Una persona de IA sostiene tu producto y dice tu texto',
    badge: 'Nuevo',
    needsVoice: 'Activa la voz en off para usar esto.',
    needsProduct: 'Marca una foto como Producto para usar esto.',
    simpleNote: 'Sostiene tu primera foto: pon primero la foto del producto.',
    fullNote: 'Sostiene la foto que marcaste como Producto.',
    planLine: 'Una persona de IA sostiene tu producto y dice la voz en off.',
    notApplied: 'Sin foto de producto o sin voz en off, así que este anuncio sale sin la persona.',
  },
  fr: {
    title: 'Une personne qui en parle',
    line: 'Une personne IA tient votre produit et dit votre texte',
    badge: 'Nouveau',
    needsVoice: 'Activez la voix off pour utiliser ceci.',
    needsProduct: 'Marquez une photo comme Produit pour utiliser ceci.',
    simpleNote: 'Elle tient votre première photo : mettez la photo du produit en premier.',
    fullNote: 'Elle tient la photo marquée Produit.',
    planLine: 'Une personne IA tient votre produit et dit la voix off.',
    notApplied: 'Pas de photo de produit ou pas de voix off : cette pub sort sans la personne.',
  },
  de: {
    title: 'Person, die darüber spricht',
    line: 'Eine KI-Person hält dein Produkt und spricht deinen Text',
    badge: 'Neu',
    needsVoice: 'Schalte die Sprecherstimme ein, um das zu nutzen.',
    needsProduct: 'Markiere ein Foto als Produkt, um das zu nutzen.',
    simpleNote: 'Sie hält dein erstes Foto: Setz das Produktfoto an den Anfang.',
    fullNote: 'Sie hält das Foto, das du als Produkt markiert hast.',
    planLine: 'Eine KI-Person hält dein Produkt und spricht den Sprechertext.',
    notApplied: 'Kein Produktfoto oder keine Sprecherstimme, deshalb kommt diese Anzeige ohne die Person.',
  },
  it: {
    title: 'Una persona che ne parla',
    line: 'Una persona IA tiene il tuo prodotto e dice il tuo testo',
    badge: 'Nuovo',
    needsVoice: 'Attiva la voce fuori campo per usarlo.',
    needsProduct: 'Segna una foto come Prodotto per usarlo.',
    simpleNote: 'Tiene la tua prima foto: metti per prima la foto del prodotto.',
    fullNote: 'Tiene la foto che hai segnato come Prodotto.',
    planLine: 'Una persona IA tiene il tuo prodotto e dice la voce fuori campo.',
    notApplied: 'Niente foto del prodotto o niente voce, quindi questo annuncio esce senza la persona.',
  },
  nl: {
    title: 'Iemand die erover vertelt',
    line: 'Een AI-persoon houdt je product vast en zegt je tekst',
    badge: 'Nieuw',
    needsVoice: 'Zet de voice-over aan om dit te gebruiken.',
    needsProduct: 'Markeer een foto als Product om dit te gebruiken.',
    simpleNote: 'Ze houdt je eerste foto vast: zet de productfoto vooraan.',
    fullNote: 'Ze houdt de foto vast die je als Product hebt gemarkeerd.',
    planLine: 'Een AI-persoon houdt je product vast en spreekt de voice-over in.',
    notApplied: 'Geen productfoto of geen voice-over, dus deze advertentie komt zonder de persoon.',
  },
  pl: {
    title: 'Osoba, która o tym mówi',
    line: 'Osoba AI trzyma Twój produkt i mówi Twój tekst',
    badge: 'Nowość',
    needsVoice: 'Włącz lektora, żeby tego użyć.',
    needsProduct: 'Oznacz jedno zdjęcie jako Produkt, żeby tego użyć.',
    simpleNote: 'Trzyma Twoje pierwsze zdjęcie: daj zdjęcie produktu na początek.',
    fullNote: 'Trzyma zdjęcie oznaczone jako Produkt.',
    planLine: 'Osoba AI trzyma Twój produkt i czyta tekst lektora.',
    notApplied: 'Brak zdjęcia produktu lub lektora, więc ta reklama wyjdzie bez tej osoby.',
  },
  tr: {
    title: 'Ürünü anlatan kişi',
    line: 'Bir yapay zekâ kişisi ürününü tutar ve metnini söyler',
    badge: 'Yeni',
    needsVoice: 'Bunu kullanmak için seslendirmeyi aç.',
    needsProduct: 'Bunu kullanmak için bir fotoğrafı Ürün olarak işaretle.',
    simpleNote: 'İlk fotoğrafını tutar: ürün fotoğrafını en başa koy.',
    fullNote: 'Ürün olarak işaretlediğin fotoğrafı tutar.',
    planLine: 'Bir yapay zekâ kişisi ürününü tutar ve seslendirmeyi söyler.',
    notApplied: 'Ürün fotoğrafı ya da seslendirme yok, bu yüzden reklam kişi olmadan çıkıyor.',
  },
  ru: {
    title: 'Человек рассказывает о товаре',
    line: 'ИИ-человек держит ваш товар и произносит ваш текст',
    badge: 'Новое',
    needsVoice: 'Включите озвучку, чтобы это использовать.',
    needsProduct: 'Отметьте одно фото как «Товар», чтобы это использовать.',
    simpleNote: 'Он держит ваше первое фото: поставьте фото товара первым.',
    fullNote: 'Он держит фото, отмеченное как «Товар».',
    planLine: 'ИИ-человек держит ваш товар и произносит текст озвучки.',
    notApplied: 'Нет фото товара или озвучки, поэтому реклама выйдет без человека.',
  },
  uk: {
    title: 'Людина розповідає про товар',
    line: 'ШІ-людина тримає ваш товар і промовляє ваш текст',
    badge: 'Нове',
    needsVoice: 'Увімкніть озвучення, щоб це використати.',
    needsProduct: 'Позначте одне фото як «Товар», щоб це використати.',
    simpleNote: 'Вона тримає ваше перше фото: поставте фото товару першим.',
    fullNote: 'Вона тримає фото, позначене як «Товар».',
    planLine: 'ШІ-людина тримає ваш товар і промовляє текст озвучення.',
    notApplied: 'Немає фото товару або озвучення, тому реклама вийде без людини.',
  },
  ar: {
    title: 'شخص يتحدث عن المنتج',
    line: 'شخص بالذكاء الاصطناعي يمسك منتجك ويقول نصك',
    badge: 'جديد',
    needsVoice: 'شغّل التعليق الصوتي لاستخدام هذا.',
    needsProduct: 'حدّد صورة واحدة كمنتج لاستخدام هذا.',
    simpleNote: 'يمسك صورتك الأولى: ضع صورة المنتج أولًا.',
    fullNote: 'يمسك الصورة التي حددتها كمنتج.',
    planLine: 'شخص بالذكاء الاصطناعي يمسك منتجك ويقول التعليق الصوتي.',
    notApplied: 'لا توجد صورة منتج أو تعليق صوتي، لذلك يخرج الإعلان بدون الشخص.',
  },
  ur: {
    title: 'پروڈکٹ کے بارے میں بولتا شخص',
    line: 'ایک AI شخص آپ کا پروڈکٹ پکڑ کر آپ کا متن بولتا ہے',
    badge: 'نیا',
    needsVoice: 'اسے استعمال کرنے کے لیے وائس اوور آن کریں۔',
    needsProduct: 'اسے استعمال کرنے کے لیے ایک تصویر کو پروڈکٹ نشان زد کریں۔',
    simpleNote: 'وہ آپ کی پہلی تصویر پکڑتا ہے: پروڈکٹ کی تصویر سب سے پہلے رکھیں۔',
    fullNote: 'وہ وہ تصویر پکڑتا ہے جسے آپ نے پروڈکٹ نشان زد کیا۔',
    planLine: 'ایک AI شخص آپ کا پروڈکٹ پکڑ کر وائس اوور بولتا ہے۔',
    notApplied: 'پروڈکٹ کی تصویر یا وائس اوور نہیں، اس لیے یہ اشتہار شخص کے بغیر بنے گا۔',
  },
  hi: {
    title: 'प्रोडक्ट के बारे में बोलता व्यक्ति',
    line: 'एक AI व्यक्ति आपका प्रोडक्ट पकड़कर आपकी स्क्रिप्ट बोलता है',
    badge: 'नया',
    needsVoice: 'इसे इस्तेमाल करने के लिए वॉइस-ओवर चालू करें।',
    needsProduct: 'इसे इस्तेमाल करने के लिए एक फ़ोटो को प्रोडक्ट चुनें।',
    simpleNote: 'वह आपकी पहली फ़ोटो पकड़ता है: प्रोडक्ट की फ़ोटो सबसे पहले रखें।',
    fullNote: 'वह वही फ़ोटो पकड़ता है जिसे आपने प्रोडक्ट चुना है।',
    planLine: 'एक AI व्यक्ति आपका प्रोडक्ट पकड़कर वॉइस-ओवर बोलता है।',
    notApplied: 'प्रोडक्ट फ़ोटो या वॉइस-ओवर नहीं है, इसलिए यह विज्ञापन व्यक्ति के बिना बनेगा।',
  },
  id: {
    title: 'Orang yang membicarakannya',
    line: 'Orang AI memegang produkmu dan mengucapkan naskahmu',
    badge: 'Baru',
    needsVoice: 'Nyalakan suara narasi untuk memakai ini.',
    needsProduct: 'Tandai satu foto sebagai Produk untuk memakai ini.',
    simpleNote: 'Ia memegang foto pertamamu: taruh foto produk paling depan.',
    fullNote: 'Ia memegang foto yang kamu tandai sebagai Produk.',
    planLine: 'Orang AI memegang produkmu dan mengucapkan narasinya.',
    notApplied: 'Tidak ada foto produk atau narasi, jadi iklan ini keluar tanpa orangnya.',
  },
  vi: {
    title: 'Người nói về sản phẩm',
    line: 'Một người AI cầm sản phẩm của bạn và nói kịch bản của bạn',
    badge: 'Mới',
    needsVoice: 'Bật giọng đọc để dùng tính năng này.',
    needsProduct: 'Đánh dấu một ảnh là Sản phẩm để dùng tính năng này.',
    simpleNote: 'Người đó cầm ảnh đầu tiên của bạn: hãy đặt ảnh sản phẩm lên đầu.',
    fullNote: 'Người đó cầm ảnh bạn đánh dấu là Sản phẩm.',
    planLine: 'Một người AI cầm sản phẩm của bạn và nói phần giọng đọc.',
    notApplied: 'Không có ảnh sản phẩm hoặc giọng đọc nên quảng cáo này ra không có người.',
  },
}

/** Frases do ator na língua da interface (língua desconhecida = inglês). */
export function adsV2PresenterCopy(language: InterfaceLanguage | string | null | undefined): AdsV2PresenterCopy {
  return (typeof language === 'string' && (ADS_V2_PRESENTER_COPY as Record<string, AdsV2PresenterCopy>)[language]) || ADS_V2_PRESENTER_COPY.en
}
