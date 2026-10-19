// KINEO-CLOSE-REAL-AJUSTE-1910 — DESFAZ, em memória, o AJUSTE pós-canário do "Close do produto real" (legendas no tempo da voz, fonte de anúncio, travessão,
// marca na narração, zoom do gancho, cartão próprio, ordem das fotos, medição in_hand e teto da amostra 10 → 30) para os guardiões que conferem rotas e
// telas BYTE A BYTE contra uma base antiga, ou executam o formato na régua da época. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Nos arquivos que a entrega toca, toda linha nova carrega a marca KINEO-CLOSE-REAL-AJUSTE-1910. Duas formas, e só elas:
//   · ACRÉSCIMO — linha nova com a marca: sai inteira;
//   · TROCA — a linha da base foi reescrita (listadas abaixo, reconhecidas INTEIRAS): volta a ser a da base.
// A marca NÃO contém "KINEO-CLOSE-REAL-1910": o desfaz do Close real (desfaz-close-real-1910.mjs) não vê estas linhas, e o encadeamento é sempre
// semCloseReal1910(semCloseRealAjuste1910(texto)) — esta camada (a mais nova) sai PRIMEIRO.
// O guardião scripts/test-close-real-ajuste-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (CLOSE_REAL_AJUSTE_1910_BASE).
export const MARCA_CLOSE_REAL_AJUSTE_1910 = 'KINEO-CLOSE-REAL-AJUSTE-1910'

/** A base da entrega (origin/main de 19/10, com o Close real no ar). */
export const CLOSE_REAL_AJUSTE_1910_BASE = '19f826173597a503ea5bc71db348c41fe39a9ece'

/** Arquivos que a entrega toca (só acréscimos marcados + as trocas listadas). */
export const CLOSE_REAL_AJUSTE_1910_ARQUIVOS = [
  "lib/ads/sample.ts",
  "lib/ads/v2Advance.ts",
  "lib/ads/v2Brief.ts",
  "lib/ads/v2CloseReal.ts",
  "lib/ads/v2CloseRealServer.ts",
  "lib/ads/v2CopyFit.ts",
  "lib/ads/v2PlanCore.ts",
  "scripts/test-close-real-1910.mjs",
  "scripts/test-support/desfaz-apresentador-v2-libera-1910.mjs",
  "scripts/test-support/desfaz-close-real-1910.mjs"
]

/** Arquivos novos da entrega. */
export const CLOSE_REAL_AJUSTE_1910_NOVOS = [
  'scripts/test-close-real-ajuste-1910.mjs',
  'scripts/test-support/desfaz-close-real-ajuste-1910.mjs',
]

/** As linhas da base reescritas: [linha nova (inteira), linha da base]. */
export const TROCAS_CLOSE_REAL_AJUSTE_1910 = {
  "lib/ads/sample.ts": [
    [
      "export const ADS_SAMPLE_DAILY_CAP = 30 // KINEO-CLOSE-REAL-AJUSTE-1910 — fundador 19/10 aprovou 10 → 30: a amostra agora é o Close real (~US$ 0,26 cada, não os ~US$ 2,20 do Comercial com IA)",
      "export const ADS_SAMPLE_DAILY_CAP = 10"
    ]
  ],
  "lib/ads/v2Advance.ts": [
    [
      "      closeRealSource = buildAdV2CloseRealSource({ width: crFrame.width, height: crFrame.height, heroUrl: hero?.url ?? null, heroFallbackUrl: closeRealPlan.product?.url ?? closeRealPlan.photos[0], photos: closeRealPlan.photos, phrases: (plan.overlays ?? []).map((o) => (o && typeof o.text === 'string' ? o.text : '')), fontFamily: captionFontFor(language), cardUrl: order.card_url, cardSeconds: ADS_V2_CARD_SECONDS, musicUrl, musicTrimStart: adsV2MusicTrimStart(musicUrl), voiceUrl, voiceSeconds, watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null, narration, closeCard: hero?.cardUrl && adsV2CloseRealCardName(order.brief?.business) ? { url: hero.cardUrl, name: adsV2CloseRealCardName(order.brief?.business), cta: adsV2CloseRealCta(language) } : null }) // KINEO-CLOSE-REAL-1910 // KINEO-CLOSE-REAL-AJUSTE-1910 — + a narração (legendas no tempo da voz) e o cartão próprio (fundo na cor da embalagem + nome + chamada)",
      "      closeRealSource = buildAdV2CloseRealSource({ width: crFrame.width, height: crFrame.height, heroUrl: hero?.url ?? null, heroFallbackUrl: closeRealPlan.product?.url ?? closeRealPlan.photos[0], photos: closeRealPlan.photos, phrases: (plan.overlays ?? []).map((o) => (o && typeof o.text === 'string' ? o.text : '')), fontFamily: captionFontFor(language), cardUrl: order.card_url, cardSeconds: ADS_V2_CARD_SECONDS, musicUrl, musicTrimStart: adsV2MusicTrimStart(musicUrl), voiceUrl, voiceSeconds, watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null }) // KINEO-CLOSE-REAL-1910"
    ]
  ],
  "lib/ads/v2CloseReal.ts": [
    [
      "import { ADS_V2_FRAME_RATE, ADS_V2_MONTAGE_FADE, ADS_V2_OVERLAY_LINE_HEIGHT, ADS_V2_OVERLAY_PILL_PAD, ADS_V2_OVERLAY_WIDTH, ADS_V2_RECT_PATH, ADS_V2_SAFE_BOTTOM, ADS_V2_SAFE_TOP, ADS_V2_VOICE_START, ADS_V2_MUSIC_VOLUME_NO_VOICE, ADS_V2_MUSIC_VOLUME_WITH_VOICE, ADS_V2_MUSIC_RISE_AFTER_VOICE, adsV2OverlayFontSize, adsV2OverlayLines, adsV2PackshotElements, ADS_V2_OVERLAY_CHAR_EM } from '@/lib/ads/adV2Montage' // KINEO-CLOSE-REAL-AJUSTE-1910 — + ADS_V2_OVERLAY_CHAR_EM (a quebra das legendas maiores)",
      "import { ADS_V2_FRAME_RATE, ADS_V2_MONTAGE_FADE, ADS_V2_OVERLAY_LINE_HEIGHT, ADS_V2_OVERLAY_PILL_PAD, ADS_V2_OVERLAY_WIDTH, ADS_V2_RECT_PATH, ADS_V2_SAFE_BOTTOM, ADS_V2_SAFE_TOP, ADS_V2_VOICE_START, ADS_V2_MUSIC_VOLUME_NO_VOICE, ADS_V2_MUSIC_VOLUME_WITH_VOICE, ADS_V2_MUSIC_RISE_AFTER_VOICE, adsV2OverlayFontSize, adsV2OverlayLines, adsV2PackshotElements } from '@/lib/ads/adV2Montage'"
    ],
    [
      "export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '112%' // KINEO-CLOSE-REAL-AJUSTE-1910 — canário de1c0d72: 100→106% em 3 s parecia foto parada (YDIF 0,09); 112% com ease se vê",
      "export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '106%'"
    ],
    [
      "    elements.push({ type: 'image', track: T.shotA, time: 0, duration: hookDur, source: input.heroUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_CLOSE_REAL_HOOK_ZOOM_END, x_anchor: '50%', y_anchor: `${ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 * 100}%`, easing: ADS_V2_CLOSE_REAL_HOOK_ZOOM_EASING }] }) // KINEO-CLOSE-REAL-AJUSTE-1910 — 100→112% com ease, a partir do topo do produto (só escala: os pixels do produto são os do recorte)",
      "    elements.push({ type: 'image', track: T.shotA, time: 0, duration: hookDur, source: input.heroUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_CLOSE_REAL_HOOK_ZOOM_END, x_anchor: '50%', y_anchor: '50%', easing: 'ease-out' }] })"
    ],
    [
      "    const src = shotPhotos[k % shotPhotos.length] // KINEO-CLOSE-REAL-AJUSTE-1910 — era: photos[k % photos.length]",
      "    const src = photos[k % photos.length]"
    ],
    [
      "  elements.push({ type: 'image', track: T.card, time: t.cardStart, duration: cardSeconds, source: (cc ? cc.url : input.cardUrl).trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: source: input.cardUrl.trim()",
      "  elements.push({ type: 'image', track: T.card, time: t.cardStart, duration: cardSeconds, source: input.cardUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', enter_transition: { type: 'fade', duration: F } })"
    ],
    [
      "  const ccName = cc ? adsV2CloseRealPhrases([cc.name])[0] ?? '' : '' // KINEO-CLOSE-REAL-AJUSTE-1910",
      "  // 4. As frases: uma por plano, no terço de cima da zona segura; a do gancho já no quadro 0."
    ],
    [
      "  const ccCta = cc && typeof cc.cta === 'string' ? cc.cta.replace(/\\s+/g, ' ').trim() : '' // KINEO-CLOSE-REAL-AJUSTE-1910",
      "  const phrases = adsV2CloseRealPhrases(input.phrases ?? []).slice(0, t.shots.length + 1)"
    ],
    [
      "  if (cc && ccName) { // KINEO-CLOSE-REAL-AJUSTE-1910",
      "  const slots = adsV2CloseRealPhraseSlots(phrases.length, t.shots.length)"
    ],
    [
      "    let namePx = Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT * height) // KINEO-CLOSE-REAL-AJUSTE-1910 — a maior fonte em que o nome cabe em 2 linhas",
      "  phrases.forEach((text, i) => {"
    ],
    [
      "    while (namePx > Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT_MIN * height) && adsV2OverlayLines(ccName, namePx, width).length > 2) namePx -= 2 // KINEO-CLOSE-REAL-AJUSTE-1910",
      "    const slot = slots[i]"
    ],
    [
      "    elements.push({ type: 'text', track: ADS_V2_CLOSE_REAL_CARD_TRACKS.name, time: t.cardStart, duration: cardSeconds, text: ccName, x: '50%', y: `${ADS_V2_CLOSE_REAL_CARD_NAME_Y * 100}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: `${ADS_V2_CLOSE_REAL_CARD_NAME_WIDTH * 100}%`, font_family: fontFamily, font_size: namePx, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.35)', stroke_width: 2, enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910",
      "    if (slot === undefined) return"
    ],
    [
      "  } // KINEO-CLOSE-REAL-AJUSTE-1910 — fim do nome do cartão",
      "    const start = slot === 0 ? 0 : r3(t.starts[slot - 1] + 0.1)"
    ],
    [
      "  if (cc && ccCta) elements.push({ type: 'text', track: ADS_V2_CLOSE_REAL_CARD_TRACKS.cta, time: t.cardStart, duration: cardSeconds, text: ccCta, x: '50%', y: `${ADS_V2_CLOSE_REAL_CARD_CTA_Y * 100}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round(ADS_V2_CLOSE_REAL_CARD_CTA_FONT * height), font_weight: '800', line_height: '110%', fill_color: '#111111', background_color: 'rgba(255,255,255,0.92)', background_x_padding: '4%', background_y_padding: '2%', border_radius: 40, enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910 — a chamada curta na língua do pedido",
      "    const end = slot === 0 ? t.hook : r3(t.starts[slot - 1] + t.shots[slot - 1])"
    ],
    [
      "  // KINEO-CLOSE-REAL-AJUSTE-1910 — 4. As legendas: 1 por plano, cada uma entrando quando a voz a diz (adsV2CloseRealCaptions); a do gancho no quadro 0; sem buraco até o cartão.",
      "    if (!(end > start)) return"
    ],
    [
      "    const geo = adsV2CloseRealCaptionGeometry(c.text, width, height) // KINEO-CLOSE-REAL-AJUSTE-1910",
      "    const geo = adsV2CloseRealOverlayGeometry(text, width, height)"
    ],
    [
      "    elements.push({ type: 'text', track: T.text, time: r3(c.start), duration: r3(c.end - c.start), text: c.text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.6)', stroke_width: Math.max(2, Math.round(geo.font_size / 28)), background_color: 'rgba(0,0,0,0.6)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 14 }) // KINEO-CLOSE-REAL-AJUSTE-1910 — tamanho de anúncio; troca seca, no tempo da fala",
      "    elements.push({ type: 'text', track: T.text, time: start, duration: r3(end - start), text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2, background_color: 'rgba(0,0,0,0.55)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10, ...(slot === 0 ? {} : { enter_transition: { type: 'fade', duration: 0.2 } }) })"
    ],
    [
      "  }) // KINEO-CLOSE-REAL-AJUSTE-1910",
      "  })"
    ],
    [
      "  // KINEO-CLOSE-REAL-AJUSTE-1910 — 5. A marca-d'água (só a amostra grátis): o anúncio inteiro, pequena, presa pelo topo em 14% (acima das legendas, nunca sobre o produto).",
      "  // 5. A marca-d'água (só a amostra grátis): o anúncio inteiro, pequena, centrada entre as frases e o produto."
    ],
    [
      "    elements.push({ type: 'text', track: T.watermark, time: 0, duration: t.total, text: wm, x: '50%', y: `${r3(ADS_V2_CLOSE_REAL_WATERMARK_TOP * 100)}%`, x_anchor: '50%', y_anchor: '0%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round((ADS_V2_CLOSE_REAL_WATERMARK_FONT_AT_1080 * width) / 1080), font_weight: '800', line_height: '110%', fill_color: '#ffffff', background_color: 'rgba(0,0,0,0.35)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10 }) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: base em ADS_V2_CLOSE_REAL_WATERMARK_BOTTOM (0,31), que as legendas maiores cobririam",
      "    elements.push({ type: 'text', track: T.watermark, time: 0, duration: t.total, text: wm, x: '50%', y: `${r3(ADS_V2_CLOSE_REAL_WATERMARK_BOTTOM * 100)}%`, x_anchor: '50%', y_anchor: '100%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round((ADS_V2_CLOSE_REAL_WATERMARK_FONT_AT_1080 * width) / 1080), font_weight: '800', line_height: '110%', fill_color: '#ffffff', background_color: 'rgba(0,0,0,0.35)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10 })"
    ]
  ],
  "lib/ads/v2CloseRealServer.ts": [
    [
      "export function adsV2CloseRealProductRect(frameW: number, frameH: number, cutW: number, cutH: number, box: { x0: number; x1: number; y0: number; y1: number } = ADS_V2_CLOSE_REAL_PRODUCT_BOX): { x: number; y: number; w: number; h: number } { // KINEO-CLOSE-REAL-AJUSTE-1910 — + box (o cartão usa a caixa pequena)",
      "export function adsV2CloseRealProductRect(frameW: number, frameH: number, cutW: number, cutH: number): { x: number; y: number; w: number; h: number } {"
    ],
    [
      "  const B = box // KINEO-CLOSE-REAL-AJUSTE-1910 — era: ADS_V2_CLOSE_REAL_PRODUCT_BOX",
      "  const B = ADS_V2_CLOSE_REAL_PRODUCT_BOX"
    ],
    [
      "export function adsV2CloseRealHeroRgba(cut: AdsV2Rgba, frameW: number = ADS_V2_CLOSE_REAL_HERO_W, frameH: number = ADS_V2_CLOSE_REAL_HERO_H, box: { x0: number; x1: number; y0: number; y1: number } = ADS_V2_CLOSE_REAL_PRODUCT_BOX): { img: AdsV2Rgba; rect: { x: number; y: number; w: number; h: number }; palette: ReturnType<typeof adsV2CloseRealPalette> } { // KINEO-CLOSE-REAL-AJUSTE-1910 — + box (o cartão final: o mesmo fundo, o produto pequeno)",
      "export function adsV2CloseRealHeroRgba(cut: AdsV2Rgba, frameW: number = ADS_V2_CLOSE_REAL_HERO_W, frameH: number = ADS_V2_CLOSE_REAL_HERO_H): { img: AdsV2Rgba; rect: { x: number; y: number; w: number; h: number }; palette: ReturnType<typeof adsV2CloseRealPalette> } {"
    ],
    [
      "  const rect = adsV2CloseRealProductRect(W, H, cut.width, cut.height, box) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: sem box",
      "  const rect = adsV2CloseRealProductRect(W, H, cut.width, cut.height)"
    ],
    [
      "export async function adsV2CloseRealHero(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number }; cardUrl: string | null } | null> { // KINEO-CLOSE-REAL-AJUSTE-1910 — + cardUrl (o fundo do cartão final; null = o cartão do pedido)",
      "export async function adsV2CloseRealHero(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number } } | null> {"
    ],
    [
      "    return { url, rect: hero.rect, cardUrl } // KINEO-CLOSE-REAL-AJUSTE-1910 — era: return url ? { url, rect: hero.rect } : null",
      "    return url ? { url, rect: hero.rect } : null"
    ]
  ],
  "lib/ads/v2CopyFit.ts": [
    [
      "    const hard = cands.filter((c) => !used.has(closeKey(c.s)) && !textKey.includes(closeKey(c.s)) && !(lastCta && c.cta) && w + countWords(c.s) <= cap && !(nameCapped && c.named)) // KINEO-CLOSE-REAL-AJUSTE-1910 — + !(nameCapped && c.named)",
      "    const hard = cands.filter((c) => !used.has(closeKey(c.s)) && !textKey.includes(closeKey(c.s)) && !(lastCta && c.cta) && w + countWords(c.s) <= cap)"
    ]
  ],
  "scripts/test-close-real-1910.mjs": [
    [
      "const rd = (p) => lf(semCloseRealAjuste1910(readFileSync(join(ROOT, p), 'utf8'), p)) // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: este guardião lê o texto SEM o ajuste (provado em scripts/test-close-real-ajuste-1910.mjs)",
      "const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))"
    ],
    [
      "const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : semCloseRealAjuste1910(text, rel)) }) // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: executa o formato na régua de antes do ajuste",
      "const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })"
    ]
  ]
}

export function linhaDoCloseRealAjuste1910(l) {
  return typeof l === 'string' && l.includes(MARCA_CLOSE_REAL_AJUSTE_1910)
}

/** As linhas da BASE que a entrega reescreveu (para os guardiões que contam linhas removidas). */
export function linhasTrocadasCloseRealAjuste1910(p) {
  return (TROCAS_CLOSE_REAL_AJUSTE_1910[p] ?? []).map(([, base]) => base)
}

const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Sem linha marcada = devolve igual (CRLF preservado). */
export function semCloseRealAjuste1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_CLOSE_REAL_AJUSTE_1910)) return texto
  const crlf = texto.includes(CR + LF)
  const trocas = new Map((TROCAS_CLOSE_REAL_AJUSTE_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  for (const linha of texto.split(CR + LF).join(LF).split(LF)) {
    if (!linha.includes(MARCA_CLOSE_REAL_AJUSTE_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    // acréscimo puro: sai
  }
  const out = fora.join(LF)
  return crlf ? out.split(LF).join(CR + LF) : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazCloseRealAjuste1910(p, texto) {
  return semCloseRealAjuste1910(texto, p)
}
