// KINEO-ADS-UX-MARCA-2026-10-10 — a tela do anúncio (/ads/v2, modo simples) mais bonita, mais esperta e mais fácil de mexer
// (fundador, 10/10: "como os líderes" — Higgsfield Marketing Studio, Creatify, PixVerse Ad Master) + o KIT DA MARCA salvo
// por conta (logo, cor, nome, preço e contato do cartão final, preenchidos na próxima visita).
//
// LIB PURA: só lê lib/ads/v2Tiers.ts e lib/ads/v2Screen.ts (também puras, sem import) e tipos. O guardião
// scripts/test-ads-ux-marca-2026-10-10.mjs carrega este arquivo cru no Node.
//
// O QUE ESTA LIB NUNCA FAZ: decidir preço. O custo mostrado na prévia ao vivo é adsV2Credits(nível, ADS_V2_SCREEN_SECONDS),
// a MESMA função que o /api/ads/v2/start debita; a amostra mostra 0 (o /start não cobra a amostra); "3 variações" mostra o
// preço do grupo que a tela já calcula (variationsPrice). Nenhum número de preço é digitado aqui.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { ADS_V2_TIER_IDS, ADS_V2_TIERS, adsV2Credits, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import { ADS_V2_SCREEN_SECONDS, clampFocal, cropRect } from '@/lib/ads/v2Screen'

// ─── nível padrão (o que o saldo paga) ─────────────────────────────────────────────────────────────────────────────────

/** O nível recomendado (o do meio: fotos + cenas novas com gente). */
export const ADS_V2_RECOMMENDED_TIER: AdsV2Tier = 'commercial'

/**
 * O nível que a tela já deixa marcado: o recomendado quando o saldo paga; senão o mais caro que o saldo paga, descendo;
 * nada pago = o mais barato (a prévia mostra quanto falta). Saldo desconhecido = nenhum (a pessoa escolhe, como antes).
 * Só marca: o débito continua só no botão "Make my ad", com o preço à vista. Pura.
 */
export function adsV2DefaultTier(balance: number | null | undefined): AdsV2Tier | null {
  if (typeof balance !== 'number' || !Number.isFinite(balance)) return null
  const start = ADS_V2_TIER_IDS.indexOf(ADS_V2_RECOMMENDED_TIER)
  for (let i = start; i >= 0; i--) {
    const t = ADS_V2_TIER_IDS[i]
    if (adsV2Credits(t, ADS_V2_SCREEN_SECONDS) <= balance) return t
  }
  return ADS_V2_TIER_IDS[0]
}

// ─── a linha de custo da prévia ao vivo ────────────────────────────────────────────────────────────────────────────────

export interface AdsV2CostLine {
  seconds: number
  /** Créditos que o botão vai cobrar (0 na amostra; o preço do grupo com "3 variações"). null = sem nível. */
  credits: number | null
  /** Quanto falta no saldo (0 = paga, ou saldo desconhecido). */
  short: number
}

/**
 * A conta da linha "15 s · Standard · N credits · you have M". `group` = preço das 3 variações quando ligadas (o valor que
 * a tela já mostra no botão). Pura: o guardião prova que credits = adsV2Credits(tier, 15) em todo nível.
 */
export function adsV2CostLine(input: { tier: AdsV2Tier | null; balance: number | null; sample?: boolean; group?: number | null }): AdsV2CostLine {
  const seconds = ADS_V2_SCREEN_SECONDS
  if (!input.tier) return { seconds, credits: null, short: 0 }
  const single = adsV2Credits(input.tier, seconds)
  const credits = input.sample === true ? 0 : typeof input.group === 'number' ? input.group : single
  const short = input.sample === true || input.balance === null || !Number.isFinite(input.balance) ? 0 : Math.max(0, credits - input.balance)
  return { seconds, credits, short }
}

/** O que cada nível inclui (números de ADS_V2_TIERS — nada digitado). */
export function adsV2TierIncludes(tier: AdsV2Tier): { shots: number; scenes: number; closeups: number } {
  const s = ADS_V2_TIERS[tier]
  return { shots: s.shots, scenes: s.generatedScenes, closeups: s.heroCloseups }
}

/** Entrega estimada (minutos), a mesma faixa que a tela de progresso vive na prática. */
export const ADS_V2_DELIVERY_MINUTES = { min: 10, max: 15 } as const

// ─── enquadramento: a janela 9:16 desenhada SOBRE a foto inteira ───────────────────────────────────────────────────────

/**
 * Arrastar a JANELA 9:16 por cima da foto inteira (o editor de enquadramento): a janela anda com o dedo. Mesmo contrato do
 * recorte de sempre (cropRect: a maior janela 9:16, deslizada pelo ponto focal fx/fy) — sem zoom, porque zoom mudaria o
 * contrato do recorte (cropToVertical) e o foco do vídeo no /plan. `display` = tamanho da foto na tela. Pura.
 */
export function adsV2MoveCropWindow(
  focal: { fx: number; fy: number },
  delta: { dx: number; dy: number },
  display: { w: number; h: number },
  image: { w: number; h: number },
): { fx: number; fy: number } {
  if (!(display.w > 0) || !(display.h > 0) || !(image.w > 0) || !(image.h > 0)) return { fx: clampFocal(focal.fx), fy: clampFocal(focal.fy) }
  const r = cropRect(image.w, image.h, focal.fx, focal.fy)
  const spareX = (image.w - r.sw) * (display.w / image.w)
  const spareY = (image.h - r.sh) * (display.h / image.h)
  return {
    fx: spareX > 0.5 ? clampFocal(focal.fx + delta.dx / spareX) : clampFocal(focal.fx),
    fy: spareY > 0.5 ? clampFocal(focal.fy + delta.dy / spareY) : clampFocal(focal.fy),
  }
}

/** A janela em porcentagem da foto (para desenhar o quadro claro por cima). Pura. */
export function adsV2CropWindowPct(image: { w: number; h: number }, fx: number, fy: number): { left: number; top: number; width: number; height: number } {
  const r = cropRect(image.w, image.h, fx, fy)
  const pct = (v: number, of: number) => Math.round((v / of) * 10000) / 100
  return { left: pct(r.sx, image.w), top: pct(r.sy, image.h), width: pct(r.sw, image.w), height: pct(r.sh, image.h) }
}

/** Reordenar: o item `from` vai para a posição `to` (dentro da lista). Fora da faixa = a mesma lista. Pura. */
export function adsV2MoveTo<T>(list: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return list.slice()
  const next = list.slice()
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

// ─── o KIT DA MARCA ────────────────────────────────────────────────────────────────────────────────────────────────────

/** O que o kit guarda: só o que vai no cartão final. O logo é um id do user_footage DO DONO (a rota confere a posse). */
export interface AdsBrandKit {
  logo_footage_id: string | null
  color: string | null
  business: string | null
  price: string | null
  contact: string | null
}
/** Tetos: os mesmos dos campos da tela (cartão: 60; preço: 60; contato: 80). */
export const ADS_BRAND_KIT_MAX = { business: 60, price: 60, contact: 80 } as const
export const ADS_BRAND_KIT_EMPTY: AdsBrandKit = { logo_footage_id: null, color: null, business: null, price: null, contact: null }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/g

function cleanText(v: unknown, max: number): string | null | undefined {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return undefined
  const t = v.replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim()
  if (t.length > max) return undefined
  return t || null
}

/**
 * O corpo do PUT /api/ads/brand-kit: só as 5 chaves (outras = 400), cor #rrggbb, logo uuid ou nulo, textos limpos e
 * dentro do teto. NUNCA aceita user_id do corpo (o dono é sempre o da sessão). Pura.
 */
export function sanitizeBrandKit(raw: unknown): { ok: true; value: AdsBrandKit } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_body' }
  const b = raw as Record<string, unknown>
  const allowed = ['logo_footage_id', 'color', 'business', 'price', 'contact']
  if (Object.keys(b).some((k) => !allowed.includes(k))) return { ok: false, error: 'bad_field' }
  let logo: string | null = null
  if (b.logo_footage_id !== null && b.logo_footage_id !== undefined) {
    if (typeof b.logo_footage_id !== 'string' || !UUID_RE.test(b.logo_footage_id)) return { ok: false, error: 'bad_logo' }
    logo = b.logo_footage_id.toLowerCase()
  }
  let color: string | null = null
  if (b.color !== null && b.color !== undefined) {
    if (typeof b.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(b.color)) return { ok: false, error: 'bad_color' }
    color = b.color.toLowerCase()
  }
  const business = cleanText(b.business, ADS_BRAND_KIT_MAX.business)
  const price = cleanText(b.price, ADS_BRAND_KIT_MAX.price)
  const contact = cleanText(b.contact, ADS_BRAND_KIT_MAX.contact)
  if (business === undefined || price === undefined || contact === undefined) return { ok: false, error: 'bad_text' }
  return { ok: true, value: { logo_footage_id: logo, color, business, price, contact } }
}

export function brandKitIsEmpty(k: AdsBrandKit | null | undefined): boolean {
  return !k || (!k.logo_footage_id && !k.color && !k.business && !k.price && !k.contact)
}

/** O kit que a tela salva ao fazer o anúncio: o que está no cartão final agora (vazio = nulo). Pura. */
export function brandKitFromScreen(s: { business: string; price: string; contact: string; color: string; logoFootageId: string | null | undefined }): AdsBrandKit {
  const t = (v: string, max: number) => {
    const x = String(v ?? '').replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    return x || null
  }
  return {
    logo_footage_id: s.logoFootageId && UUID_RE.test(s.logoFootageId) ? s.logoFootageId.toLowerCase() : null,
    color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color.toLowerCase() : null,
    business: t(s.business, ADS_BRAND_KIT_MAX.business),
    price: t(s.price, ADS_BRAND_KIT_MAX.price),
    contact: t(s.contact, ADS_BRAND_KIT_MAX.contact),
  }
}

/**
 * O que o kit preenche na visita nova: SÓ campo que a pessoa ainda não mexeu (vazio, cor ainda a padrão, sem logo). O que
 * ela já digitou nunca é trocado. Devolve só as chaves a preencher. Pura.
 */
export function brandKitPrefill(
  kit: AdsBrandKit | null | undefined,
  now: { business: string; price: string; contact: string; color: string; defaultColor: string; hasLogo: boolean },
  logoUrl: string | null,
): { business?: string; price?: string; contact?: string; color?: string; logo?: { footageId: string; url: string } } {
  const out: { business?: string; price?: string; contact?: string; color?: string; logo?: { footageId: string; url: string } } = {}
  if (!kit) return out
  if (kit.business && !now.business.trim()) out.business = kit.business
  if (kit.price && !now.price.trim()) out.price = kit.price
  if (kit.contact && !now.contact.trim()) out.contact = kit.contact
  if (kit.color && now.color.toLowerCase() === now.defaultColor.toLowerCase()) out.color = kit.color
  if (kit.logo_footage_id && logoUrl && !now.hasLogo) out.logo = { footageId: kit.logo_footage_id, url: logoUrl }
  return out
}

// ─── as frases novas da tela, nas 16 línguas da interface (nenhuma cai no inglês) ──────────────────────────────────────

export interface AdsV2UxCopy {
  stepper: string
  steps: { product: string; message: string; look: string; review: string }
  stepDone: string
  drop: { title: string; browse: string; hint: string; over: string }
  first: string
  dragHandle: string
  moveDown: string
  adjust: string
  adjustDone: string
  cropHint: string
  preview: {
    title: string
    opening: string
    style: string
    end: string
    empty: string
    noStyle: string
    presenter: string
    voice: string
    delivery: string
    /** {s} {tier} {c} {n} */
    cost: string
    /** {s} {tier} {c} */
    costUnknown: string
    /** {s} {tier} */
    costFree: string
    chooseLevel: string
    /** {n} */
    short: string
    product: string
    look: string
    open: string
    close: string
  }
  tiers: { recommended: string; yourPhotos: string; shots: string; scenes: string; closeups: string }
  styles: { all: string; food: string; beauty: string; tech: string; any: string; recommended: string; prev: string; next: string }
  kit: { chip: string; edit: string; save: string; saveHint: string }
}

const EN: AdsV2UxCopy = {
  stepper: 'Your ad in 4 steps',
  steps: { product: 'Product', message: 'Message', look: 'Look', review: 'Review & make' },
  stepDone: 'done',
  drop: { title: 'Drag your photos or videos here', browse: 'Choose files', hint: 'The first photo is your product. Drag the cards to change the order.', over: 'Drop to add' },
  first: 'Product photo',
  dragHandle: 'Drag to reorder photo {n}',
  moveDown: 'Move down',
  adjust: 'Adjust framing',
  adjustDone: 'Done',
  cropHint: 'Drag the bright frame to choose what shows in the vertical video. Arrow keys work too.',
  preview: {
    title: 'Live preview',
    opening: 'Opening',
    style: 'Style',
    end: 'End card',
    empty: 'Add a photo to see your ad come together here.',
    noStyle: 'No effect: your photo moves with a slow camera',
    presenter: 'AI presenter on',
    voice: 'Voice: {lang}',
    delivery: 'Ready in about 10–15 minutes',
    cost: '{s} s · {tier} · {c} credits · you have {n}',
    costUnknown: '{s} s · {tier} · {c} credits',
    costFree: '{s} s · {tier} · free sample',
    chooseLevel: 'Choose a level to see the price',
    short: 'You need {n} more credits',
    product: 'Product',
    look: 'Look',
    open: 'See preview',
    close: 'Close preview',
  },
  tiers: { recommended: 'Recommended', yourPhotos: 'Only your photos, animated', shots: '{n} shots', scenes: '{n} new AI scenes with people', closeups: '{n} premium close-ups' },
  styles: { all: 'All', food: 'Food & drink', beauty: 'Beauty', tech: 'Tech', any: 'Any product', recommended: 'Recommended for your product', prev: 'Previous styles', next: 'More styles' },
  kit: { chip: 'Brand kit applied', edit: 'Edit', save: 'Save as my brand kit', saveHint: 'Logo, color, name, price and contact fill in by themselves next time.' },
}

const PT: AdsV2UxCopy = {
  stepper: 'Seu anúncio em 4 passos',
  steps: { product: 'Produto', message: 'Mensagem', look: 'Visual', review: 'Revisar e fazer' },
  stepDone: 'feito',
  drop: { title: 'Arraste suas fotos ou vídeos para cá', browse: 'Escolher arquivos', hint: 'A primeira foto é o seu produto. Arraste os cartões para mudar a ordem.', over: 'Solte para adicionar' },
  first: 'Foto do produto',
  dragHandle: 'Arraste para reordenar a foto {n}',
  moveDown: 'Descer',
  adjust: 'Ajustar enquadramento',
  adjustDone: 'Pronto',
  cropHint: 'Arraste o quadro claro para escolher o que aparece no vídeo vertical. As setas do teclado também funcionam.',
  preview: {
    title: 'Prévia ao vivo',
    opening: 'Abertura',
    style: 'Estilo',
    end: 'Cartão final',
    empty: 'Adicione uma foto para ver seu anúncio tomando forma aqui.',
    noStyle: 'Sem efeito: sua foto ganha um movimento lento de câmera',
    presenter: 'Apresentador de IA ligado',
    voice: 'Voz: {lang}',
    delivery: 'Pronto em cerca de 10–15 minutos',
    cost: '{s} s · {tier} · {c} créditos · você tem {n}',
    costUnknown: '{s} s · {tier} · {c} créditos',
    costFree: '{s} s · {tier} · amostra grátis',
    chooseLevel: 'Escolha um nível para ver o preço',
    short: 'Faltam {n} créditos',
    product: 'Produto',
    look: 'Visual',
    open: 'Ver prévia',
    close: 'Fechar prévia',
  },
  tiers: { recommended: 'Recomendado', yourPhotos: 'Só as suas fotos, com movimento', shots: '{n} cenas', scenes: '{n} cenas novas com pessoas, feitas pela IA', closeups: '{n} closes premium' },
  styles: { all: 'Todos', food: 'Comida e bebida', beauty: 'Beleza', tech: 'Tecnologia', any: 'Qualquer produto', recommended: 'Recomendado para o seu produto', prev: 'Estilos anteriores', next: 'Mais estilos' },
  kit: { chip: 'Kit da marca aplicado', edit: 'Editar', save: 'Salvar como meu kit da marca', saveHint: 'Logo, cor, nome, preço e contato aparecem preenchidos da próxima vez.' },
}

const ES: AdsV2UxCopy = {
  stepper: 'Tu anuncio en 4 pasos',
  steps: { product: 'Producto', message: 'Mensaje', look: 'Estilo visual', review: 'Revisar y crear' },
  stepDone: 'listo',
  drop: { title: 'Arrastra aquí tus fotos o videos', browse: 'Elegir archivos', hint: 'La primera foto es tu producto. Arrastra las tarjetas para cambiar el orden.', over: 'Suelta para agregar' },
  first: 'Foto del producto',
  dragHandle: 'Arrastra para reordenar la foto {n}',
  moveDown: 'Bajar',
  adjust: 'Ajustar encuadre',
  adjustDone: 'Listo',
  cropHint: 'Arrastra el marco claro para elegir qué aparece en el video vertical. Las flechas del teclado también sirven.',
  preview: {
    title: 'Vista previa en vivo',
    opening: 'Apertura',
    style: 'Estilo',
    end: 'Cierre',
    empty: 'Agrega una foto para ver cómo toma forma tu anuncio.',
    noStyle: 'Sin efecto: tu foto se mueve con una cámara lenta',
    presenter: 'Presentador de IA activado',
    voice: 'Voz: {lang}',
    delivery: 'Listo en unos 10–15 minutos',
    cost: '{s} s · {tier} · {c} créditos · tienes {n}',
    costUnknown: '{s} s · {tier} · {c} créditos',
    costFree: '{s} s · {tier} · muestra gratis',
    chooseLevel: 'Elige un nivel para ver el precio',
    short: 'Te faltan {n} créditos',
    product: 'Producto',
    look: 'Estilo visual',
    open: 'Ver vista previa',
    close: 'Cerrar vista previa',
  },
  tiers: { recommended: 'Recomendado', yourPhotos: 'Solo tus fotos, con movimiento', shots: '{n} tomas', scenes: '{n} escenas nuevas con personas, hechas por IA', closeups: '{n} primeros planos premium' },
  styles: { all: 'Todos', food: 'Comida y bebida', beauty: 'Belleza', tech: 'Tecnología', any: 'Cualquier producto', recommended: 'Recomendado para tu producto', prev: 'Estilos anteriores', next: 'Más estilos' },
  kit: { chip: 'Kit de marca aplicado', edit: 'Editar', save: 'Guardar como mi kit de marca', saveHint: 'Logo, color, nombre, precio y contacto se completan solos la próxima vez.' },
}

const FR: AdsV2UxCopy = {
  stepper: 'Votre pub en 4 étapes',
  steps: { product: 'Produit', message: 'Message', look: 'Style', review: 'Vérifier et créer' },
  stepDone: 'fait',
  drop: { title: 'Glissez vos photos ou vidéos ici', browse: 'Choisir des fichiers', hint: 'La première photo est votre produit. Glissez les cartes pour changer l’ordre.', over: 'Déposez pour ajouter' },
  first: 'Photo du produit',
  dragHandle: 'Glisser pour déplacer la photo {n}',
  moveDown: 'Descendre',
  adjust: 'Ajuster le cadrage',
  adjustDone: 'Terminé',
  cropHint: 'Glissez le cadre clair pour choisir ce qui apparaît dans la vidéo verticale. Les flèches du clavier marchent aussi.',
  preview: {
    title: 'Aperçu en direct',
    opening: 'Ouverture',
    style: 'Style',
    end: 'Écran final',
    empty: 'Ajoutez une photo pour voir votre pub prendre forme ici.',
    noStyle: 'Sans effet : votre photo bouge avec une caméra lente',
    presenter: 'Présentateur IA activé',
    voice: 'Voix : {lang}',
    delivery: 'Prête en 10 à 15 minutes environ',
    cost: '{s} s · {tier} · {c} crédits · vous avez {n}',
    costUnknown: '{s} s · {tier} · {c} crédits',
    costFree: '{s} s · {tier} · échantillon gratuit',
    chooseLevel: 'Choisissez un niveau pour voir le prix',
    short: 'Il vous manque {n} crédits',
    product: 'Produit',
    look: 'Style',
    open: 'Voir l’aperçu',
    close: 'Fermer l’aperçu',
  },
  tiers: { recommended: 'Recommandé', yourPhotos: 'Seulement vos photos, animées', shots: '{n} plans', scenes: '{n} nouvelles scènes IA avec des personnes', closeups: '{n} gros plans premium' },
  styles: { all: 'Tous', food: 'Food et boissons', beauty: 'Beauté', tech: 'Tech', any: 'Tout produit', recommended: 'Recommandé pour votre produit', prev: 'Styles précédents', next: 'Plus de styles' },
  kit: { chip: 'Kit de marque appliqué', edit: 'Modifier', save: 'Enregistrer comme mon kit de marque', saveHint: 'Logo, couleur, nom, prix et contact se rempliront tout seuls la prochaine fois.' },
}

const DE: AdsV2UxCopy = {
  stepper: 'Deine Anzeige in 4 Schritten',
  steps: { product: 'Produkt', message: 'Botschaft', look: 'Look', review: 'Prüfen und erstellen' },
  stepDone: 'erledigt',
  drop: { title: 'Fotos oder Videos hierher ziehen', browse: 'Dateien wählen', hint: 'Das erste Foto ist dein Produkt. Ziehe die Karten, um die Reihenfolge zu ändern.', over: 'Loslassen zum Hinzufügen' },
  first: 'Produktfoto',
  dragHandle: 'Ziehen, um Foto {n} zu verschieben',
  moveDown: 'Nach unten',
  adjust: 'Ausschnitt anpassen',
  adjustDone: 'Fertig',
  cropHint: 'Ziehe den hellen Rahmen, um zu wählen, was im Hochformat-Video zu sehen ist. Pfeiltasten gehen auch.',
  preview: {
    title: 'Live-Vorschau',
    opening: 'Einstieg',
    style: 'Stil',
    end: 'Abschlusskarte',
    empty: 'Füge ein Foto hinzu und sieh hier, wie deine Anzeige entsteht.',
    noStyle: 'Kein Effekt: dein Foto bewegt sich mit langsamer Kamera',
    presenter: 'KI-Sprecher an',
    voice: 'Stimme: {lang}',
    delivery: 'Fertig in etwa 10–15 Minuten',
    cost: '{s} s · {tier} · {c} Credits · du hast {n}',
    costUnknown: '{s} s · {tier} · {c} Credits',
    costFree: '{s} s · {tier} · kostenlose Probe',
    chooseLevel: 'Wähle eine Stufe, um den Preis zu sehen',
    short: 'Dir fehlen {n} Credits',
    product: 'Produkt',
    look: 'Look',
    open: 'Vorschau ansehen',
    close: 'Vorschau schließen',
  },
  tiers: { recommended: 'Empfohlen', yourPhotos: 'Nur deine Fotos, animiert', shots: '{n} Einstellungen', scenes: '{n} neue KI-Szenen mit Menschen', closeups: '{n} Premium-Nahaufnahmen' },
  styles: { all: 'Alle', food: 'Essen & Trinken', beauty: 'Beauty', tech: 'Technik', any: 'Jedes Produkt', recommended: 'Empfohlen für dein Produkt', prev: 'Vorherige Stile', next: 'Mehr Stile' },
  kit: { chip: 'Markenkit angewendet', edit: 'Bearbeiten', save: 'Als mein Markenkit speichern', saveHint: 'Logo, Farbe, Name, Preis und Kontakt sind beim nächsten Mal schon ausgefüllt.' },
}

const IT: AdsV2UxCopy = {
  stepper: 'Il tuo annuncio in 4 passi',
  steps: { product: 'Prodotto', message: 'Messaggio', look: 'Stile', review: 'Rivedi e crea' },
  stepDone: 'fatto',
  drop: { title: 'Trascina qui le tue foto o i tuoi video', browse: 'Scegli file', hint: 'La prima foto è il tuo prodotto. Trascina le schede per cambiare l’ordine.', over: 'Rilascia per aggiungere' },
  first: 'Foto del prodotto',
  dragHandle: 'Trascina per spostare la foto {n}',
  moveDown: 'Sposta giù',
  adjust: 'Regola inquadratura',
  adjustDone: 'Fatto',
  cropHint: 'Trascina la cornice chiara per scegliere cosa si vede nel video verticale. Funzionano anche le frecce.',
  preview: {
    title: 'Anteprima dal vivo',
    opening: 'Apertura',
    style: 'Stile',
    end: 'Schermata finale',
    empty: 'Aggiungi una foto per vedere qui il tuo annuncio prendere forma.',
    noStyle: 'Nessun effetto: la tua foto si muove con una camera lenta',
    presenter: 'Presentatore IA attivo',
    voice: 'Voce: {lang}',
    delivery: 'Pronto in circa 10–15 minuti',
    cost: '{s} s · {tier} · {c} crediti · ne hai {n}',
    costUnknown: '{s} s · {tier} · {c} crediti',
    costFree: '{s} s · {tier} · prova gratuita',
    chooseLevel: 'Scegli un livello per vedere il prezzo',
    short: 'Ti mancano {n} crediti',
    product: 'Prodotto',
    look: 'Stile',
    open: 'Vedi anteprima',
    close: 'Chiudi anteprima',
  },
  tiers: { recommended: 'Consigliato', yourPhotos: 'Solo le tue foto, animate', shots: '{n} inquadrature', scenes: '{n} nuove scene IA con persone', closeups: '{n} primi piani premium' },
  styles: { all: 'Tutti', food: 'Cibo e bevande', beauty: 'Bellezza', tech: 'Tecnologia', any: 'Qualsiasi prodotto', recommended: 'Consigliato per il tuo prodotto', prev: 'Stili precedenti', next: 'Altri stili' },
  kit: { chip: 'Kit del brand applicato', edit: 'Modifica', save: 'Salva come mio kit del brand', saveHint: 'Logo, colore, nome, prezzo e contatto saranno già compilati la prossima volta.' },
}

const NL: AdsV2UxCopy = {
  stepper: 'Je advertentie in 4 stappen',
  steps: { product: 'Product', message: 'Boodschap', look: 'Uitstraling', review: 'Controleren en maken' },
  stepDone: 'klaar',
  drop: { title: 'Sleep je foto’s of video’s hierheen', browse: 'Bestanden kiezen', hint: 'De eerste foto is je product. Sleep de kaarten om de volgorde te wijzigen.', over: 'Loslaten om toe te voegen' },
  first: 'Productfoto',
  dragHandle: 'Slepen om foto {n} te verplaatsen',
  moveDown: 'Omlaag',
  adjust: 'Uitsnede aanpassen',
  adjustDone: 'Klaar',
  cropHint: 'Sleep het lichte kader om te kiezen wat er in de staande video te zien is. Pijltjestoetsen werken ook.',
  preview: {
    title: 'Live voorbeeld',
    opening: 'Opening',
    style: 'Stijl',
    end: 'Eindkaart',
    empty: 'Voeg een foto toe en zie hier je advertentie ontstaan.',
    noStyle: 'Geen effect: je foto beweegt met een trage camera',
    presenter: 'AI-presentator aan',
    voice: 'Stem: {lang}',
    delivery: 'Klaar in ongeveer 10–15 minuten',
    cost: '{s} s · {tier} · {c} credits · je hebt {n}',
    costUnknown: '{s} s · {tier} · {c} credits',
    costFree: '{s} s · {tier} · gratis proef',
    chooseLevel: 'Kies een niveau om de prijs te zien',
    short: 'Je komt {n} credits tekort',
    product: 'Product',
    look: 'Uitstraling',
    open: 'Voorbeeld bekijken',
    close: 'Voorbeeld sluiten',
  },
  tiers: { recommended: 'Aanbevolen', yourPhotos: 'Alleen je eigen foto’s, geanimeerd', shots: '{n} shots', scenes: '{n} nieuwe AI-scènes met mensen', closeups: '{n} premium close-ups' },
  styles: { all: 'Alle', food: 'Eten & drinken', beauty: 'Beauty', tech: 'Tech', any: 'Elk product', recommended: 'Aanbevolen voor je product', prev: 'Vorige stijlen', next: 'Meer stijlen' },
  kit: { chip: 'Merkkit toegepast', edit: 'Bewerken', save: 'Opslaan als mijn merkkit', saveHint: 'Logo, kleur, naam, prijs en contact staan er de volgende keer al in.' },
}

const PL: AdsV2UxCopy = {
  stepper: 'Twoja reklama w 4 krokach',
  steps: { product: 'Produkt', message: 'Przekaz', look: 'Wygląd', review: 'Sprawdź i utwórz' },
  stepDone: 'gotowe',
  drop: { title: 'Przeciągnij tu zdjęcia lub filmy', browse: 'Wybierz pliki', hint: 'Pierwsze zdjęcie to twój produkt. Przeciągaj karty, aby zmienić kolejność.', over: 'Upuść, aby dodać' },
  first: 'Zdjęcie produktu',
  dragHandle: 'Przeciągnij, aby przenieść zdjęcie {n}',
  moveDown: 'W dół',
  adjust: 'Dopasuj kadr',
  adjustDone: 'Gotowe',
  cropHint: 'Przeciągnij jasną ramkę, aby wybrać, co widać w pionowym filmie. Strzałki też działają.',
  preview: {
    title: 'Podgląd na żywo',
    opening: 'Początek',
    style: 'Styl',
    end: 'Plansza końcowa',
    empty: 'Dodaj zdjęcie, aby zobaczyć tu, jak powstaje twoja reklama.',
    noStyle: 'Bez efektu: zdjęcie porusza się z wolną kamerą',
    presenter: 'Prezenter AI włączony',
    voice: 'Głos: {lang}',
    delivery: 'Gotowe w około 10–15 minut',
    cost: '{s} s · {tier} · {c} kredytów · masz {n}',
    costUnknown: '{s} s · {tier} · {c} kredytów',
    costFree: '{s} s · {tier} · darmowa próbka',
    chooseLevel: 'Wybierz poziom, aby zobaczyć cenę',
    short: 'Brakuje ci {n} kredytów',
    product: 'Produkt',
    look: 'Wygląd',
    open: 'Zobacz podgląd',
    close: 'Zamknij podgląd',
  },
  tiers: { recommended: 'Polecany', yourPhotos: 'Tylko twoje zdjęcia, w ruchu', shots: '{n} ujęć', scenes: '{n} nowe sceny AI z ludźmi', closeups: '{n} ujęcia premium z bliska' },
  styles: { all: 'Wszystkie', food: 'Jedzenie i napoje', beauty: 'Uroda', tech: 'Elektronika', any: 'Każdy produkt', recommended: 'Polecany dla twojego produktu', prev: 'Poprzednie style', next: 'Więcej stylów' },
  kit: { chip: 'Zestaw marki zastosowany', edit: 'Edytuj', save: 'Zapisz jako mój zestaw marki', saveHint: 'Logo, kolor, nazwa, cena i kontakt wypełnią się same następnym razem.' },
}

const TR: AdsV2UxCopy = {
  stepper: '4 adımda reklamın',
  steps: { product: 'Ürün', message: 'Mesaj', look: 'Görünüm', review: 'Gözden geçir ve oluştur' },
  stepDone: 'tamam',
  drop: { title: 'Fotoğraf veya videolarını buraya sürükle', browse: 'Dosya seç', hint: 'İlk fotoğraf ürünündür. Sırayı değiştirmek için kartları sürükle.', over: 'Eklemek için bırak' },
  first: 'Ürün fotoğrafı',
  dragHandle: '{n}. fotoğrafı taşımak için sürükle',
  moveDown: 'Aşağı taşı',
  adjust: 'Kadrajı ayarla',
  adjustDone: 'Tamam',
  cropHint: 'Dikey videoda neyin görüneceğini seçmek için açık renkli çerçeveyi sürükle. Ok tuşları da çalışır.',
  preview: {
    title: 'Canlı önizleme',
    opening: 'Açılış',
    style: 'Stil',
    end: 'Kapanış kartı',
    empty: 'Reklamının burada şekillendiğini görmek için bir fotoğraf ekle.',
    noStyle: 'Efekt yok: fotoğrafın yavaş bir kamerayla hareket eder',
    presenter: 'Yapay zekâ sunucu açık',
    voice: 'Ses: {lang}',
    delivery: 'Yaklaşık 10–15 dakikada hazır',
    cost: '{s} sn · {tier} · {c} kredi · sende {n} var',
    costUnknown: '{s} sn · {tier} · {c} kredi',
    costFree: '{s} sn · {tier} · ücretsiz deneme',
    chooseLevel: 'Fiyatı görmek için bir seviye seç',
    short: '{n} kredi eksik',
    product: 'Ürün',
    look: 'Görünüm',
    open: 'Önizlemeyi gör',
    close: 'Önizlemeyi kapat',
  },
  tiers: { recommended: 'Önerilen', yourPhotos: 'Sadece senin fotoğrafların, hareketli', shots: '{n} çekim', scenes: 'İnsanlarla {n} yeni yapay zekâ sahnesi', closeups: '{n} premium yakın çekim' },
  styles: { all: 'Tümü', food: 'Yiyecek ve içecek', beauty: 'Güzellik', tech: 'Teknoloji', any: 'Her ürün', recommended: 'Ürünün için önerilen', prev: 'Önceki stiller', next: 'Daha fazla stil' },
  kit: { chip: 'Marka kiti uygulandı', edit: 'Düzenle', save: 'Marka kitim olarak kaydet', saveHint: 'Logo, renk, ad, fiyat ve iletişim bir dahaki sefere kendiliğinden dolar.' },
}

const RU: AdsV2UxCopy = {
  stepper: 'Ваша реклама за 4 шага',
  steps: { product: 'Продукт', message: 'Сообщение', look: 'Стиль', review: 'Проверить и создать' },
  stepDone: 'готово',
  drop: { title: 'Перетащите сюда фото или видео', browse: 'Выбрать файлы', hint: 'Первое фото — ваш продукт. Перетаскивайте карточки, чтобы изменить порядок.', over: 'Отпустите, чтобы добавить' },
  first: 'Фото продукта',
  dragHandle: 'Перетащите, чтобы переместить фото {n}',
  moveDown: 'Ниже',
  adjust: 'Настроить кадр',
  adjustDone: 'Готово',
  cropHint: 'Перетащите светлую рамку, чтобы выбрать, что будет в вертикальном видео. Стрелки тоже работают.',
  preview: {
    title: 'Живой предпросмотр',
    opening: 'Начало',
    style: 'Стиль',
    end: 'Финальный кадр',
    empty: 'Добавьте фото, чтобы увидеть, как собирается ваша реклама.',
    noStyle: 'Без эффекта: фото оживает с медленной камерой',
    presenter: 'ИИ-ведущий включён',
    voice: 'Голос: {lang}',
    delivery: 'Готово примерно за 10–15 минут',
    cost: '{s} с · {tier} · {c} кредитов · у вас {n}',
    costUnknown: '{s} с · {tier} · {c} кредитов',
    costFree: '{s} с · {tier} · бесплатный пример',
    chooseLevel: 'Выберите уровень, чтобы увидеть цену',
    short: 'Не хватает {n} кредитов',
    product: 'Продукт',
    look: 'Стиль',
    open: 'Открыть предпросмотр',
    close: 'Закрыть предпросмотр',
  },
  tiers: { recommended: 'Рекомендуем', yourPhotos: 'Только ваши фото, в движении', shots: '{n} кадров', scenes: '{n} новые ИИ-сцены с людьми', closeups: '{n} премиальных крупных плана' },
  styles: { all: 'Все', food: 'Еда и напитки', beauty: 'Красота', tech: 'Техника', any: 'Любой продукт', recommended: 'Рекомендуем для вашего продукта', prev: 'Предыдущие стили', next: 'Ещё стили' },
  kit: { chip: 'Набор бренда применён', edit: 'Изменить', save: 'Сохранить как мой набор бренда', saveHint: 'Логотип, цвет, название, цена и контакт заполнятся сами в следующий раз.' },
}

const UK: AdsV2UxCopy = {
  stepper: 'Ваша реклама за 4 кроки',
  steps: { product: 'Продукт', message: 'Повідомлення', look: 'Стиль', review: 'Перевірити й створити' },
  stepDone: 'готово',
  drop: { title: 'Перетягніть сюди фото або відео', browse: 'Вибрати файли', hint: 'Перше фото — ваш продукт. Перетягуйте картки, щоб змінити порядок.', over: 'Відпустіть, щоб додати' },
  first: 'Фото продукту',
  dragHandle: 'Перетягніть, щоб перемістити фото {n}',
  moveDown: 'Нижче',
  adjust: 'Налаштувати кадр',
  adjustDone: 'Готово',
  cropHint: 'Перетягніть світлу рамку, щоб вибрати, що буде у вертикальному відео. Стрілки теж працюють.',
  preview: {
    title: 'Живий попередній перегляд',
    opening: 'Початок',
    style: 'Стиль',
    end: 'Фінальний кадр',
    empty: 'Додайте фото, щоб побачити, як складається ваша реклама.',
    noStyle: 'Без ефекту: фото оживає з повільною камерою',
    presenter: 'ШІ-ведучий увімкнений',
    voice: 'Голос: {lang}',
    delivery: 'Готово приблизно за 10–15 хвилин',
    cost: '{s} с · {tier} · {c} кредитів · у вас {n}',
    costUnknown: '{s} с · {tier} · {c} кредитів',
    costFree: '{s} с · {tier} · безкоштовний зразок',
    chooseLevel: 'Виберіть рівень, щоб побачити ціну',
    short: 'Бракує {n} кредитів',
    product: 'Продукт',
    look: 'Стиль',
    open: 'Відкрити перегляд',
    close: 'Закрити перегляд',
  },
  tiers: { recommended: 'Рекомендуємо', yourPhotos: 'Лише ваші фото, в русі', shots: '{n} кадрів', scenes: '{n} нові ШІ-сцени з людьми', closeups: '{n} преміальні великі плани' },
  styles: { all: 'Усі', food: 'Їжа та напої', beauty: 'Краса', tech: 'Техніка', any: 'Будь-який продукт', recommended: 'Рекомендуємо для вашого продукту', prev: 'Попередні стилі', next: 'Ще стилі' },
  kit: { chip: 'Набір бренду застосовано', edit: 'Змінити', save: 'Зберегти як мій набір бренду', saveHint: 'Логотип, колір, назва, ціна й контакт заповняться самі наступного разу.' },
}

const AR: AdsV2UxCopy = {
  stepper: 'إعلانك في 4 خطوات',
  steps: { product: 'المنتج', message: 'الرسالة', look: 'المظهر', review: 'المراجعة والإنشاء' },
  stepDone: 'تم',
  drop: { title: 'اسحب صورك أو مقاطعك إلى هنا', browse: 'اختر الملفات', hint: 'الصورة الأولى هي منتجك. اسحب البطاقات لتغيير الترتيب.', over: 'أفلت للإضافة' },
  first: 'صورة المنتج',
  dragHandle: 'اسحب لنقل الصورة {n}',
  moveDown: 'إلى الأسفل',
  adjust: 'ضبط الإطار',
  adjustDone: 'تم',
  cropHint: 'اسحب الإطار الفاتح لتختار ما يظهر في الفيديو العمودي. تعمل أسهم لوحة المفاتيح أيضًا.',
  preview: {
    title: 'معاينة مباشرة',
    opening: 'البداية',
    style: 'النمط',
    end: 'البطاقة الختامية',
    empty: 'أضف صورة لترى إعلانك يتشكّل هنا.',
    noStyle: 'بدون تأثير: صورتك تتحرك بكاميرا بطيئة',
    presenter: 'مقدّم الذكاء الاصطناعي مفعّل',
    voice: 'الصوت: {lang}',
    delivery: 'جاهز خلال 10–15 دقيقة تقريبًا',
    cost: '{s} ث · {tier} · {c} رصيد · لديك {n}',
    costUnknown: '{s} ث · {tier} · {c} رصيد',
    costFree: '{s} ث · {tier} · عيّنة مجانية',
    chooseLevel: 'اختر مستوى لترى السعر',
    short: 'ينقصك {n} رصيد',
    product: 'المنتج',
    look: 'المظهر',
    open: 'عرض المعاينة',
    close: 'إغلاق المعاينة',
  },
  tiers: { recommended: 'موصى به', yourPhotos: 'صورك فقط، بحركة', shots: '{n} لقطات', scenes: '{n} مشاهد جديدة بالذكاء الاصطناعي مع أشخاص', closeups: '{n} لقطات مقرّبة فاخرة' },
  styles: { all: 'الكل', food: 'طعام ومشروبات', beauty: 'تجميل', tech: 'تقنية', any: 'أي منتج', recommended: 'موصى به لمنتجك', prev: 'الأنماط السابقة', next: 'أنماط أخرى' },
  kit: { chip: 'تم تطبيق هوية العلامة', edit: 'تعديل', save: 'حفظ كهوية علامتي', saveHint: 'الشعار واللون والاسم والسعر ووسيلة التواصل تُملأ تلقائيًا في المرة القادمة.' },
}

const UR: AdsV2UxCopy = {
  stepper: 'آپ کا اشتہار 4 مراحل میں',
  steps: { product: 'پروڈکٹ', message: 'پیغام', look: 'انداز', review: 'جائزہ اور تیاری' },
  stepDone: 'مکمل',
  drop: { title: 'اپنی تصاویر یا ویڈیوز یہاں گھسیٹیں', browse: 'فائلیں منتخب کریں', hint: 'پہلی تصویر آپ کی پروڈکٹ ہے۔ ترتیب بدلنے کے لیے کارڈ گھسیٹیں۔', over: 'شامل کرنے کے لیے چھوڑیں' },
  first: 'پروڈکٹ کی تصویر',
  dragHandle: 'تصویر {n} کی جگہ بدلنے کے لیے گھسیٹیں',
  moveDown: 'نیچے کریں',
  adjust: 'فریم درست کریں',
  adjustDone: 'ہو گیا',
  cropHint: 'عمودی ویڈیو میں کیا دکھے، یہ چننے کے لیے روشن فریم گھسیٹیں۔ کی بورڈ کے تیر بھی کام کرتے ہیں۔',
  preview: {
    title: 'لائیو پیش نظارہ',
    opening: 'آغاز',
    style: 'اسٹائل',
    end: 'آخری کارڈ',
    empty: 'اپنا اشتہار بنتا دیکھنے کے لیے ایک تصویر شامل کریں۔',
    noStyle: 'کوئی ایفیکٹ نہیں: آپ کی تصویر سست کیمرے سے حرکت کرتی ہے',
    presenter: 'AI پیش کار آن',
    voice: 'آواز: {lang}',
    delivery: 'تقریباً 10–15 منٹ میں تیار',
    cost: '{s} سیکنڈ · {tier} · {c} کریڈٹ · آپ کے پاس {n}',
    costUnknown: '{s} سیکنڈ · {tier} · {c} کریڈٹ',
    costFree: '{s} سیکنڈ · {tier} · مفت نمونہ',
    chooseLevel: 'قیمت دیکھنے کے لیے لیول منتخب کریں',
    short: 'آپ کو {n} مزید کریڈٹ چاہییں',
    product: 'پروڈکٹ',
    look: 'انداز',
    open: 'پیش نظارہ دیکھیں',
    close: 'پیش نظارہ بند کریں',
  },
  tiers: { recommended: 'تجویز کردہ', yourPhotos: 'صرف آپ کی تصاویر، حرکت کے ساتھ', shots: '{n} شاٹس', scenes: 'لوگوں کے ساتھ {n} نئے AI مناظر', closeups: '{n} پریمیم کلوز اپ' },
  styles: { all: 'سب', food: 'کھانا اور مشروبات', beauty: 'بیوٹی', tech: 'ٹیک', any: 'کوئی بھی پروڈکٹ', recommended: 'آپ کی پروڈکٹ کے لیے تجویز کردہ', prev: 'پچھلے اسٹائل', next: 'مزید اسٹائل' },
  kit: { chip: 'برانڈ کٹ لاگو', edit: 'ترمیم', save: 'میری برانڈ کٹ کے طور پر محفوظ کریں', saveHint: 'لوگو، رنگ، نام، قیمت اور رابطہ اگلی بار خود بھر جائیں گے۔' },
}

const HI: AdsV2UxCopy = {
  stepper: 'आपका विज्ञापन 4 चरणों में',
  steps: { product: 'प्रोडक्ट', message: 'संदेश', look: 'लुक', review: 'जाँचें और बनाएँ' },
  stepDone: 'पूरा',
  drop: { title: 'अपनी फ़ोटो या वीडियो यहाँ खींचें', browse: 'फ़ाइलें चुनें', hint: 'पहली फ़ोटो आपका प्रोडक्ट है। क्रम बदलने के लिए कार्ड खींचें।', over: 'जोड़ने के लिए छोड़ें' },
  first: 'प्रोडक्ट फ़ोटो',
  dragHandle: 'फ़ोटो {n} की जगह बदलने के लिए खींचें',
  moveDown: 'नीचे करें',
  adjust: 'फ़्रेम ठीक करें',
  adjustDone: 'हो गया',
  cropHint: 'वर्टिकल वीडियो में क्या दिखेगा, यह चुनने के लिए हल्का फ़्रेम खींचें। कीबोर्ड के तीर भी काम करते हैं।',
  preview: {
    title: 'लाइव प्रीव्यू',
    opening: 'शुरुआत',
    style: 'स्टाइल',
    end: 'आख़िरी कार्ड',
    empty: 'अपना विज्ञापन बनते देखने के लिए एक फ़ोटो जोड़ें।',
    noStyle: 'कोई इफ़ेक्ट नहीं: आपकी फ़ोटो धीमे कैमरे से चलती है',
    presenter: 'AI प्रेज़ेंटर चालू',
    voice: 'आवाज़: {lang}',
    delivery: 'लगभग 10–15 मिनट में तैयार',
    cost: '{s} से · {tier} · {c} क्रेडिट · आपके पास {n}',
    costUnknown: '{s} से · {tier} · {c} क्रेडिट',
    costFree: '{s} से · {tier} · मुफ़्त सैंपल',
    chooseLevel: 'क़ीमत देखने के लिए लेवल चुनें',
    short: 'आपको {n} और क्रेडिट चाहिए',
    product: 'प्रोडक्ट',
    look: 'लुक',
    open: 'प्रीव्यू देखें',
    close: 'प्रीव्यू बंद करें',
  },
  tiers: { recommended: 'सुझाया गया', yourPhotos: 'सिर्फ़ आपकी फ़ोटो, चलती हुई', shots: '{n} शॉट', scenes: 'लोगों के साथ {n} नए AI सीन', closeups: '{n} प्रीमियम क्लोज़-अप' },
  styles: { all: 'सभी', food: 'खाना और ड्रिंक', beauty: 'ब्यूटी', tech: 'टेक', any: 'कोई भी प्रोडक्ट', recommended: 'आपके प्रोडक्ट के लिए सुझाया गया', prev: 'पिछले स्टाइल', next: 'और स्टाइल' },
  kit: { chip: 'ब्रांड किट लगी है', edit: 'बदलें', save: 'मेरी ब्रांड किट के रूप में सेव करें', saveHint: 'लोगो, रंग, नाम, क़ीमत और संपर्क अगली बार अपने आप भर जाएँगे।' },
}

const ID: AdsV2UxCopy = {
  stepper: 'Iklanmu dalam 4 langkah',
  steps: { product: 'Produk', message: 'Pesan', look: 'Tampilan', review: 'Periksa dan buat' },
  stepDone: 'selesai',
  drop: { title: 'Seret foto atau videomu ke sini', browse: 'Pilih file', hint: 'Foto pertama adalah produkmu. Seret kartu untuk mengubah urutan.', over: 'Lepas untuk menambahkan' },
  first: 'Foto produk',
  dragHandle: 'Seret untuk memindahkan foto {n}',
  moveDown: 'Turunkan',
  adjust: 'Atur bingkai',
  adjustDone: 'Selesai',
  cropHint: 'Seret bingkai terang untuk memilih yang tampil di video vertikal. Tombol panah juga bisa.',
  preview: {
    title: 'Pratinjau langsung',
    opening: 'Pembuka',
    style: 'Gaya',
    end: 'Kartu penutup',
    empty: 'Tambahkan foto untuk melihat iklanmu terbentuk di sini.',
    noStyle: 'Tanpa efek: fotomu bergerak dengan kamera pelan',
    presenter: 'Presenter AI aktif',
    voice: 'Suara: {lang}',
    delivery: 'Siap dalam sekitar 10–15 menit',
    cost: '{s} dtk · {tier} · {c} kredit · kamu punya {n}',
    costUnknown: '{s} dtk · {tier} · {c} kredit',
    costFree: '{s} dtk · {tier} · sampel gratis',
    chooseLevel: 'Pilih level untuk melihat harga',
    short: 'Kurang {n} kredit',
    product: 'Produk',
    look: 'Tampilan',
    open: 'Lihat pratinjau',
    close: 'Tutup pratinjau',
  },
  tiers: { recommended: 'Disarankan', yourPhotos: 'Hanya fotomu, dengan gerakan', shots: '{n} adegan', scenes: '{n} adegan AI baru dengan orang', closeups: '{n} close-up premium' },
  styles: { all: 'Semua', food: 'Makanan & minuman', beauty: 'Kecantikan', tech: 'Teknologi', any: 'Produk apa pun', recommended: 'Disarankan untuk produkmu', prev: 'Gaya sebelumnya', next: 'Gaya lainnya' },
  kit: { chip: 'Kit merek diterapkan', edit: 'Ubah', save: 'Simpan sebagai kit merekku', saveHint: 'Logo, warna, nama, harga, dan kontak terisi sendiri lain kali.' },
}

const VI: AdsV2UxCopy = {
  stepper: 'Quảng cáo của bạn trong 4 bước',
  steps: { product: 'Sản phẩm', message: 'Thông điệp', look: 'Phong cách', review: 'Xem lại và tạo' },
  stepDone: 'xong',
  drop: { title: 'Kéo ảnh hoặc video vào đây', browse: 'Chọn tệp', hint: 'Ảnh đầu tiên là sản phẩm của bạn. Kéo các thẻ để đổi thứ tự.', over: 'Thả để thêm' },
  first: 'Ảnh sản phẩm',
  dragHandle: 'Kéo để di chuyển ảnh {n}',
  moveDown: 'Xuống',
  adjust: 'Chỉnh khung hình',
  adjustDone: 'Xong',
  cropHint: 'Kéo khung sáng để chọn phần hiện trong video dọc. Phím mũi tên cũng dùng được.',
  preview: {
    title: 'Xem trước trực tiếp',
    opening: 'Mở đầu',
    style: 'Phong cách',
    end: 'Thẻ kết',
    empty: 'Thêm một ảnh để xem quảng cáo của bạn thành hình ở đây.',
    noStyle: 'Không hiệu ứng: ảnh của bạn chuyển động với máy quay chậm',
    presenter: 'Người dẫn AI đang bật',
    voice: 'Giọng: {lang}',
    delivery: 'Xong trong khoảng 10–15 phút',
    cost: '{s} giây · {tier} · {c} tín dụng · bạn có {n}',
    costUnknown: '{s} giây · {tier} · {c} tín dụng',
    costFree: '{s} giây · {tier} · mẫu miễn phí',
    chooseLevel: 'Chọn một mức để xem giá',
    short: 'Bạn thiếu {n} tín dụng',
    product: 'Sản phẩm',
    look: 'Phong cách',
    open: 'Xem trước',
    close: 'Đóng xem trước',
  },
  tiers: { recommended: 'Đề xuất', yourPhotos: 'Chỉ ảnh của bạn, có chuyển động', shots: '{n} cảnh', scenes: '{n} cảnh AI mới có người', closeups: '{n} cận cảnh cao cấp' },
  styles: { all: 'Tất cả', food: 'Đồ ăn & đồ uống', beauty: 'Làm đẹp', tech: 'Công nghệ', any: 'Mọi sản phẩm', recommended: 'Đề xuất cho sản phẩm của bạn', prev: 'Phong cách trước', next: 'Thêm phong cách' },
  kit: { chip: 'Đã áp dụng bộ nhận diện', edit: 'Sửa', save: 'Lưu làm bộ nhận diện của tôi', saveHint: 'Logo, màu, tên, giá và liên hệ sẽ tự điền vào lần sau.' },
}

export const ADS_V2_UX_COPY: Record<InterfaceLanguage, AdsV2UxCopy> = {
  en: EN, pt: PT, es: ES, fr: FR, de: DE, it: IT, nl: NL, pl: PL, tr: TR, ru: RU, uk: UK, ar: AR, ur: UR, hi: HI, id: ID, vi: VI,
}

/** As frases novas na língua da interface (língua desconhecida = inglês). */
export function adsV2UxCopy(language: InterfaceLanguage | string | null | undefined): AdsV2UxCopy {
  return (typeof language === 'string' && (ADS_V2_UX_COPY as Record<string, AdsV2UxCopy>)[language]) || ADS_V2_UX_COPY.en
}
