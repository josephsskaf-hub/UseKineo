// KINEO-CLOSE-REAL-V3-1910 — DESFAZ, em memória, a RODADA 3 do "Close do produto real" (voz por língua também no áudio cedo, legenda = frase inteira, fecho
// completo, legenda fora do produto, título quebrado no separador, chamada como botão) para os guardiões que conferem arquivos BYTE A BYTE contra uma base
// antiga ou executam o formato na régua da época. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Nos arquivos que a entrega toca, toda linha nova carrega a marca KINEO-CLOSE-REAL-V3-1910. Duas formas, e só elas:
//   · ACRÉSCIMO — linha nova com a marca: sai inteira;
//   · TROCA — a linha da base foi reescrita (listadas abaixo, reconhecidas INTEIRAS): volta a ser a da base.
// A marca NÃO contém "KINEO-CLOSE-REAL-1910" nem "KINEO-CLOSE-REAL-AJUSTE-1910": os desfaz das camadas de antes não veem estas linhas, e o encadeamento é
// sempre semCloseReal1910(semCloseRealAjuste1910(semCloseRealV3_1910(texto))) — esta camada (a mais nova) sai PRIMEIRO (semCloseRealAjuste1910 já chama esta).
// O guardião scripts/test-close-real-v3-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (CLOSE_REAL_V3_1910_BASE).
export const MARCA_CLOSE_REAL_V3_1910 = 'KINEO-CLOSE-REAL-V3-1910'

/** A base da entrega (origin/main de 19/10: o ajuste do Close real no ar, ddb44e546). */
export const CLOSE_REAL_V3_1910_BASE = "ddb44e54672ba99ef48d74f27451a54819438af2"

/** Arquivos que a entrega toca (só acréscimos marcados + as trocas listadas). */
export const CLOSE_REAL_V3_1910_ARQUIVOS = [
  "lib/ads/v2Advance.ts",
  "lib/ads/v2AudioCedo.ts",
  "lib/ads/v2CloseReal.ts",
  "lib/ads/v2CloseRealServer.ts",
  "lib/ads/v2CopyFit.ts",
  "scripts/test-close-real-ajuste-1910.mjs",
  "scripts/test-support/desfaz-close-real-ajuste-1910.mjs"
]

/** Arquivos novos da entrega. */
export const CLOSE_REAL_V3_1910_NOVOS = [
  "scripts/test-close-real-v3-1910.mjs",
  "scripts/test-support/desfaz-close-real-v3-1910.mjs"
]

/** As linhas da base reescritas: [linha nova (inteira), linha da base]. */
export const TROCAS_CLOSE_REAL_V3_1910 = {
  "lib/ads/v2Advance.ts": [
    [
      "      closeRealSource = buildAdV2CloseRealSource({ width: crFrame.width, height: crFrame.height, heroUrl: hero?.url ?? null, heroFallbackUrl: closeRealPlan.product?.url ?? closeRealPlan.photos[0], photos: closeRealPlan.photos, phrases: (plan.overlays ?? []).map((o) => (o && typeof o.text === 'string' ? o.text : '')), fontFamily: captionFontFor(language), cardUrl: order.card_url, cardSeconds: ADS_V2_CARD_SECONDS, musicUrl, musicTrimStart: adsV2MusicTrimStart(musicUrl), voiceUrl, voiceSeconds, watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null, narration, closeCard: hero?.cardUrl && adsV2CloseRealCardName(order.brief?.business) ? { url: hero.cardUrl, name: adsV2CloseRealCardName(order.brief?.business), cta: adsV2CloseRealCta(language), ink: hero.ink } : null, photoBoxes: crBoxes }) // KINEO-CLOSE-REAL-V3-1910 — + a cor do botão (ink, o tom da embalagem) e a caixa do produto em cada foto (photoBoxes: a legenda nunca cobre o produto)",
      "      closeRealSource = buildAdV2CloseRealSource({ width: crFrame.width, height: crFrame.height, heroUrl: hero?.url ?? null, heroFallbackUrl: closeRealPlan.product?.url ?? closeRealPlan.photos[0], photos: closeRealPlan.photos, phrases: (plan.overlays ?? []).map((o) => (o && typeof o.text === 'string' ? o.text : '')), fontFamily: captionFontFor(language), cardUrl: order.card_url, cardSeconds: ADS_V2_CARD_SECONDS, musicUrl, musicTrimStart: adsV2MusicTrimStart(musicUrl), voiceUrl, voiceSeconds, watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null, narration, closeCard: hero?.cardUrl && adsV2CloseRealCardName(order.brief?.business) ? { url: hero.cardUrl, name: adsV2CloseRealCardName(order.brief?.business), cta: adsV2CloseRealCta(language) } : null }) // KINEO-CLOSE-REAL-1910 // KINEO-CLOSE-REAL-AJUSTE-1910 — + a narração (legendas no tempo da voz) e o cartão próprio (fundo na cor da embalagem + nome + chamada)"
    ]
  ],
  "lib/ads/v2AudioCedo.ts": [
    [
      "      const spoken = speakableForTts(adsV2NarrationForTts(falta.narracao!, adsV2PronounceOf(order.brief)), language) // KINEO-CLOSE-REAL-V3-1910 — o MESMO texto de sempre",
      "      const buf = await synthesizeTtsFallback(speakableForTts(adsV2NarrationForTts(falta.narracao!, adsV2PronounceOf(order.brief)), language), { userId: order.user_id, generationId: order.generation_id })"
    ]
  ],
  "lib/ads/v2CloseReal.ts": [
    [
      "  closeCard?: { url: string; name: string; cta: string; ink?: string | null } | null // KINEO-CLOSE-REAL-V3-1910 — + ink: a cor do texto do botão (o tom escuro da embalagem; ausente = quase preto)",
      "  closeCard?: { url: string; name: string; cta: string } | null // KINEO-CLOSE-REAL-AJUSTE-1910"
    ],
    [
      "  if (cc && ccCta) elements.push(adsV2CloseRealCtaButton({ text: ccCta, ink: cc.ink ?? null, nameText: ccName, track: ADS_V2_CLOSE_REAL_CARD_TRACKS.cta, time: t.cardStart, duration: cardSeconds, fontFamily, width, height, fade: F })) // KINEO-CLOSE-REAL-V3-1910 — a chamada vira BOTÃO (4% da altura, folga e canto arredondado de verdade, texto no tom da embalagem), abaixo do nome com respiro",
      "  if (cc && ccCta) elements.push({ type: 'text', track: ADS_V2_CLOSE_REAL_CARD_TRACKS.cta, time: t.cardStart, duration: cardSeconds, text: ccCta, x: '50%', y: `${ADS_V2_CLOSE_REAL_CARD_CTA_Y * 100}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round(ADS_V2_CLOSE_REAL_CARD_CTA_FONT * height), font_weight: '800', line_height: '110%', fill_color: '#111111', background_color: 'rgba(255,255,255,0.92)', background_x_padding: '4%', background_y_padding: '2%', border_radius: 40, enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910 — a chamada curta na língua do pedido"
    ],
    [
      "  // KINEO-CLOSE-REAL-V3-1910 — 4. As legendas: 1 FRASE inteira cada (encurtada no fim de uma oração se passar de 2 linhas; nunca um pedaço que começa no meio), no tempo da voz, sem buraco; e nunca SOBRE o produto (a caixa do recorte de cada foto, com o zoom do plano).",
      "  // KINEO-CLOSE-REAL-AJUSTE-1910 — 4. As legendas: 1 por plano, cada uma entrando quando a voz a diz (adsV2CloseRealCaptions); a do gancho no quadro 0; sem buraco até o cartão."
    ],
    [
      "  const captions = adsV2CloseRealCaptionsV3({ narration: hasVoice ? input.narration ?? null : null, voiceSeconds: hasVoice ? (input.voiceSeconds as number) : null, headline: (input.phrases ?? [])[0] ?? null, overlays: input.phrases ?? [], timeline: t, frameW: width, frameH: height }) // KINEO-CLOSE-REAL-V3-1910",
      "  const captions = adsV2CloseRealCaptions({ narration: hasVoice ? input.narration ?? null : null, voiceSeconds: hasVoice ? (input.voiceSeconds as number) : null, headline: (input.phrases ?? [])[0] ?? null, overlays: input.phrases ?? [], timeline: t }) // KINEO-CLOSE-REAL-AJUSTE-1910"
    ],
    [
      "  const capWindows = adsV2CloseRealPlanWindows({ timeline: t, shotPhotos, photoBoxes: input.photoBoxes ?? null, hookCutout: isHttps(input.heroUrl), frameW: width, frameH: height }) // KINEO-CLOSE-REAL-V3-1910 — onde o produto mora em cada plano (gancho e fotos)",
      "  captions.forEach((c) => { // KINEO-CLOSE-REAL-AJUSTE-1910"
    ],
    [
      "  const capMinTop = typeof input.watermark === 'string' && input.watermark.trim() ? ADS_V2_CLOSE_REAL_CAPTION_TOP : ADS_V2_SAFE_TOP // KINEO-CLOSE-REAL-V3-1910 — a marca-d'água da amostra mora entre 14% e 17,5%",
      "    const geo = adsV2CloseRealCaptionGeometry(c.text, width, height) // KINEO-CLOSE-REAL-AJUSTE-1910"
    ],
    [
      "  captions.forEach((c) => { // KINEO-CLOSE-REAL-V3-1910",
      "    elements.push({ type: 'text', track: T.text, time: r3(c.start), duration: r3(c.end - c.start), text: c.text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.6)', stroke_width: Math.max(2, Math.round(geo.font_size / 28)), background_color: 'rgba(0,0,0,0.6)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 14 }) // KINEO-CLOSE-REAL-AJUSTE-1910 — tamanho de anúncio; troca seca, no tempo da fala"
    ],
    [
      "    for (const seg of adsV2CloseRealCaptionSegments(c, capWindows, (span) => adsV2CloseRealCaptionPlace(c.text, width, height, span, capMinTop).y)) { // KINEO-CLOSE-REAL-V3-1910 — a legenda que atravessa um corte muda de lugar NO corte se o produto do plano seguinte mora em outro lugar",
      "  }) // KINEO-CLOSE-REAL-AJUSTE-1910"
    ]
  ],
  "lib/ads/v2CloseRealServer.ts": [
    [
      "export async function adsV2CloseRealHero(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number }; cardUrl: string | null; ink: string } | null> { // KINEO-CLOSE-REAL-V3-1910 — + ink (o tom escuro da embalagem: o texto do botão do cartão) · + cardUrl (o fundo do cartão final; null = o cartão do pedido)",
      "export async function adsV2CloseRealHero(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number }; cardUrl: string | null } | null> { // KINEO-CLOSE-REAL-AJUSTE-1910 — + cardUrl (o fundo do cartão final; null = o cartão do pedido)"
    ],
    [
      "    return { url, rect: hero.rect, cardUrl, ink: adsV2CloseRealHex(hero.palette.bottom) } // KINEO-CLOSE-REAL-V3-1910 — + ink (a base do gradiente: o tom da embalagem escurecido)",
      "    return { url, rect: hero.rect, cardUrl } // KINEO-CLOSE-REAL-AJUSTE-1910 — era: return url ? { url, rect: hero.rect } : null"
    ]
  ],
  "lib/ads/v2CopyFit.ts": [
    [
      "  if (nameMax > 0) cands.push(...(ADS_V2_CLOSE_REAL_FULL_CLOSES[lang] ?? []).map((c) => ({ s: c.t, cta: c.cta, named: false }))) // KINEO-CLOSE-REAL-V3-1910 — com o nome no teto, um fecho COMPLETO com verbo e sem a marca (\"Experimente hoje.\" / \"Você vai amar.\"); era o pedaço \"Para você.\" pendurado no fim (canário v2)",
      "  if (nameMax > 0) cands.push(...(ADS_V2_NAME_CLOSES[lang] ?? []).filter((c) => !c.cta && c.t.startsWith('{name}, ')).map((c) => { const r = c.t.slice('{name}, '.length); return { s: r.charAt(0).toLocaleUpperCase(lang) + r.slice(1), cta: false, named: false } })) // KINEO-CLOSE-REAL-AJUSTE-1910 — com o nome no teto, a frase neutra SEM o nome (\"Para você.\", \"Do seu jeito.\") mantém a alternância chamada ↔ neutra e o piso de fala"
    ]
  ],
  "scripts/test-close-real-ajuste-1910.mjs": [
    [
      "const rd = (p) => lf(semCloseRealV3_1910(readFileSync(join(ROOT, p), 'utf8'), p)) // KINEO-CLOSE-REAL-V3-1910 — reancorado: este guardião lê o texto SEM a rodada 3 (provada em scripts/test-close-real-v3-1910.mjs)",
      "const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))"
    ],
    [
      "const carregar = (over = {}, mocks = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : semCloseRealV3_1910(text, rel)) }) // KINEO-CLOSE-REAL-V3-1910 — reancorado: executa o formato na régua do ajuste (antes da rodada 3)",
      "const carregar = (over = {}, mocks = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })"
    ]
  ]
}

export function linhaDoCloseRealV3_1910(l) {
  return typeof l === 'string' && l.includes(MARCA_CLOSE_REAL_V3_1910)
}

/** As linhas da BASE que a entrega reescreveu (para os guardiões que contam linhas removidas). */
export function linhasTrocadasCloseRealV3_1910(p) {
  return (TROCAS_CLOSE_REAL_V3_1910[p] ?? []).map(([, base]) => base)
}

const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Sem linha marcada = devolve igual (CRLF preservado). */
export function semCloseRealV3_1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_CLOSE_REAL_V3_1910)) return texto
  const crlf = texto.includes(CR + LF)
  const trocas = new Map((TROCAS_CLOSE_REAL_V3_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  for (const linha of texto.split(CR + LF).join(LF).split(LF)) {
    if (!linha.includes(MARCA_CLOSE_REAL_V3_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    // acréscimo puro: sai
  }
  const out = fora.join(LF)
  return crlf ? out.split(LF).join(CR + LF) : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazCloseRealV3_1910(p, texto) {
  return semCloseRealV3_1910(texto, p)
}
