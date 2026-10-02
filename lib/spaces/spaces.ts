// KINEO-ESPACOS-2026-09-30 — "Espaços": foto de um espaço vazio (galpão, loja, apartamento) + o que a pessoa quer
// dentro dele → as MESMAS fotos com o espaço pronto (mesma câmera, mesma estrutura) → um vídeo antes → depois.
//
// Pedido do fundador (30/09): "tenho muito acesso a construtoras… esse galpão está vazio… com inteligência artificial
// colocar o Starbucks dentro, ou uma loja do Burger King… a pessoa faz as fotos do galpão, fala o que quer que seja
// dentro, e a gente traz um vídeo perfeito… sempre usar algum método de procura sobre o que a pessoa quer colocar".
//
// COMO (sem motor novo): upload moderado de sempre → PESQUISA de curadoria (OpenAI com busca na web: como é o espaço
// real daquela marca/estilo — cores, materiais, móveis, sinalização, luz) → Nano Banana Pro edit com a foto como
// referência e a régua "mantenha a arquitetura" → clipe a partir da foto pronta (/api/clips) → MONTAGEM própria no
// Creatomate: foto vazia ("Antes") que funde no espaço pronto ("Depois") — mesma câmera, então a fusão vira a revelação.
// Prova de 30/09 (fotos reais do Villa Versace, Moema): colunas, vidros e tubulação do teto ficaram no lugar.
//
// SELO (decisão do fundador no lançamento, 30/09: "a pessoa pudesse tirar… qualquer fala de IA do vídeo, não tem
// necessidade"): o vídeo não fala de IA. A nota "Imagem ilustrativa" (na língua de quem gera) é OPCIONAL, marcada pela
// pessoa na tela. A assinatura do fim continua sendo de QUEM APRESENTA — a tela não oferece "decorado por <outra
// pessoa>" (atribuir autoria a quem não participou não é detalhe de estilo).
//
// LIB PURA (nenhum import): o guardião scripts/test-espacos-2026-09-30.mjs carrega este arquivo cru no Node.

// ── interruptor ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** true = aberto para todo mundo (fundador 30/09: "vamos lançar… pode subir como já um produto novo"). false = só a casa. */
export const SPACES_PUBLIC = true
export function spacesVisibleFor(publicFlag: boolean, isInternal: boolean): boolean {
  return publicFlag === true || isInternal === true
}

// ── KINEO-NUVEM-A5-2026-10-02 — "vários destinos": 1 ponto vazio → 2 a 4 negócios rotulados num só vídeo ──────────────
// Pedido (02/10): a construtora mostra o MESMO ponto vazio virando café · farmácia · clínica, para o locatário escolher.
// Mesmo motor e mesmas etapas pagas de sempre: uma foto pronta por destino (Nano Banana Pro, 5 cr) e um clipe por destino
// (Kling 2.5, 5 cr) — o preço é a SOMA das etapas, nada de tabela nova. A montagem repete o "Antes" e troca o "Depois"
// pelo nome de cada negócio. Interruptor próprio (false = só a casa); abrir é decisão do fundador.
export const SPACES_MULTI_PUBLIC = false
export const SPACES_MULTI_MIN = 2
export const SPACES_MULTI_MAX = 4
export const SPACES_DESTINATION_LABEL_MAX = 24
/** Créditos do vídeo de vários destinos = (foto pronta + clipe) × destinos, com os preços que as etapas já cobram. */
export function spacesMultiCredits(destinations: number, stageCredits: number, clipCredits: number): number {
  if (!Number.isInteger(destinations) || destinations < SPACES_MULTI_MIN || destinations > SPACES_MULTI_MAX) throw new Error('spaces_multi_bad_count')
  return destinations * (stageCredits + clipCredits)
}

// ── tipos de espaço ─────────────────────────────────────────────────────────────────────────────────────────────────
export type SpaceKind = 'store' | 'food' | 'office' | 'home' | 'other'
export const SPACE_KINDS: readonly SpaceKind[] = ['store', 'food', 'office', 'home', 'other']
/** Nome do tipo no pedido à pesquisa (inglês; a tela usa lib/spaces/spacesCopy.ts). */
export const SPACE_KIND_PROMPT: Record<SpaceKind, string> = {
  store: 'store',
  food: 'café, bar or restaurant',
  office: 'office',
  home: 'apartment or house',
  other: 'space',
}
/** Como o espaço fica "vivo" na cena (gente só onde faz sentido; casa decorada fica sem gente). */
const KIND_LIFE: Record<SpaceKind, string> = {
  store: 'a few shoppers browsing, staff at the counter',
  food: 'a few customers at the tables, staff behind the counter',
  office: 'a few people working and talking',
  home: 'no people, styled and lived-in like a design magazine shoot',
  other: 'a few people using the space naturally',
}
const KIND_MOTION: Record<SpaceKind, string> = {
  store: 'Slow smooth dolly forward through the store, shoppers moving naturally',
  food: 'Slow smooth dolly forward through the space, customers chatting, staff working behind the counter',
  office: 'Slow smooth dolly forward through the office, people working naturally',
  home: 'Slow smooth dolly forward through the room, soft daylight shifting gently, curtains moving slightly',
  other: 'Slow smooth dolly forward through the space, people moving naturally',
}

export const SPACE_DESCRIPTION_MIN = 3
export const SPACE_DESCRIPTION_MAX = 400
export const SPACE_NOTES_MAX = 600
export const SPACE_SIGNATURE_MAX = 60
export const SPACE_CONTACT_MAX = 60
export const SPACE_MAX_PHOTOS = 4

export function cleanLine(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

// ── pesquisa de curadoria (OpenAI Responses + web_search_preview) ────────────────────────────────────────────────────
export const SPACES_RESEARCH_MODEL = 'gpt-4.1-mini'
export const SPACES_RESEARCH_TIMEOUT_MS = 25_000
export const SPACES_RESEARCH_MAX_OUTPUT_TOKENS = 700
export const SPACES_RESEARCH_DAILY_CAP = 30
export const SPACES_BRIEF_MAX_ITEMS = 8
export const SPACES_BRIEF_ITEM_MAX = 160

export function buildSpaceResearchMessages(description: string, kind: SpaceKind): { instructions: string; input: string } {
  return {
    instructions:
      'You are an interior design researcher. Use web search to find how the requested space really looks today ' +
      '(if it names a brand: its current store/restaurant design; if it names a style or a designer: that style). ' +
      'Answer ONLY with 5 to 8 lines, each line one concrete visual fact an image generator can use: color palette ' +
      '(with color names), materials and finishes, furniture, counters and fixtures, signage and logo placement, ' +
      'lighting, plants and decor, ambience. Each line under 150 characters, English, no numbering, no prices, no ' +
      'addresses, no marketing claims, no sources inline. Never invent a detail you did not find; if you found ' +
      'little, write fewer lines.',
    input: `Space type: ${SPACE_KIND_PROMPT[kind]}. Requested: ${description}`,
  }
}

/** Texto do modelo → linhas de curadoria (limpas, sem numeração, sem link, sem duplicata). Pura; nunca lança. */
export function parseSpaceBrief(text: unknown): string[] {
  if (typeof text !== 'string') return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    let line = raw
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (line.length < 8) continue
    if (line.length > SPACES_BRIEF_ITEM_MAX) line = line.slice(0, SPACES_BRIEF_ITEM_MAX).replace(/\s+\S*$/, '')
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
    if (out.length >= SPACES_BRIEF_MAX_ITEMS) break
  }
  return out
}

// ── prompts ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A régua que fez a prova de 30/09 funcionar: a foto manda na geometria, o pedido manda no acabamento. */
export const SPACES_KEEP_RULE =
  'Photographed from the EXACT same camera position, height and lens as the reference photo. KEEP EXACTLY: the room ' +
  'geometry and perspective, every wall, column and beam in the same place, the windows, glass storefront and doors ' +
  'with the same view outside, the ceiling height and the floor plan. Do not add or remove walls, columns or windows.'

export function buildStagingPrompt(args: { description: string; kind: SpaceKind; brief: readonly string[]; notes?: string }): string {
  const description = cleanLine(args.description, SPACE_DESCRIPTION_MAX)
  const notes = cleanLine(args.notes ?? '', SPACE_NOTES_MAX)
  const brief = args.brief.map((b) => cleanLine(b, SPACES_BRIEF_ITEM_MAX)).filter(Boolean).slice(0, SPACES_BRIEF_MAX_ITEMS)
  return [
    'Photorealistic architectural interior photo, 9:16.',
    `Transform the empty space in the reference photo into a finished, fully built ${description}.`,
    SPACES_KEEP_RULE,
    brief.length ? `Design details to follow: ${brief.join('; ')}.` : '',
    notes ? `Client notes: ${notes}.` : '',
    `Finish the floor, walls and ceiling to match, with realistic lighting mixed with the daylight from the windows; ${KIND_LIFE[args.kind]}.`,
    'Ultra realistic, magazine quality, no watermark, no text except real signage and logos that belong in the space.',
  ].filter(Boolean).join(' ')
}

export function buildSpaceMotionPrompt(kind: SpaceKind): string {
  return `${KIND_MOTION[kind]}. Steady cinematic camera. The architecture stays exactly the same.`
}

// ── assinatura ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Assinatura do fim: sempre "<Apresentado por> <quem apresenta>" na língua (modelo com {name}) — nunca "decorado por". */
export function signatureLine(signature: string, template = 'Presented by {name}'): string {
  const s = cleanLine(signature, SPACE_SIGNATURE_MAX)
  return s ? template.split('{name}').join(s) : ''
}

/** Rótulos do vídeo (lib/spaces/spacesCopy.ts spacesVideoLabels, na língua de quem gera). */
export interface SpacesVideoLabels {
  before: string
  after: string
  /** Modelo com {name}. */
  presentedBy: string
  seal: string
}
export const SPACES_VIDEO_LABELS_EN: SpacesVideoLabels = { before: 'BEFORE', after: 'AFTER', presentedBy: 'Presented by {name}', seal: 'Illustrative image' }

// ── posse dos arquivos (a montagem só aceita mídia da própria conta no NOSSO storage) ─────────────────────────────────
export function isOwnedSpaceAssetUrl(url: unknown, userId: string, supabaseOrigin: string): boolean {
  if (typeof url !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) return false
  let u: URL
  let origin: string
  try { u = new URL(url); origin = new URL(supabaseOrigin).origin } catch { return false }
  if (u.origin !== origin || u.username || u.password || u.search || u.hash) return false
  let p: string
  try { p = decodeURIComponent(u.pathname) } catch { return false }
  if (p.includes('..')) return false
  const uid = userId.toLowerCase()
  const allowed = [
    `/storage/v1/object/public/avatars/${uid}/`,
    `/storage/v1/object/public/renders/images/${uid}/`,
    `/storage/v1/object/public/renders/clips/${uid}/`,
  ]
  return allowed.some((prefix) => p.toLowerCase().startsWith(prefix) && p.length > prefix.length)
}

// ── montagem (Creatomate) ───────────────────────────────────────────────────────────────────────────────────────────
export interface SpacePair {
  /** Foto do espaço vazio (o "Antes"). */
  beforeUrl: string
  /** Clipe do espaço pronto, gerado a partir da foto pronta (mesma câmera). */
  clipUrl: string
  /** KINEO-NUVEM-A5-2026-10-02 — vários destinos: o nome do negócio no lugar do "Depois" (ex.: "Café"). */
  label?: string
}
export const SPACES_BEFORE_SECONDS = 1.6
export const SPACES_REVEAL_SECONDS = 1.1
export const SPACES_CLIP_SECONDS = 5
export const SPACES_CARD_SECONDS = 2.6
/**
 * KINEO-NUVEM-A2-2026-10-02 — o logo da CONTA (lib/brandLogo, o mesmo do "Your logo" do Studio) entra no vídeo do Espaços
 * no canto esquerdo, do primeiro ao último quadro. Centro em 19% (caixa de 15% a 23%): o rótulo ANTES/DEPOIS ocupa
 * y 6–12% no centro da tela e o logo padrão (15%, caixa 11–19%) encostaria nele. Sem logo na conta = vídeo de sempre.
 */
export const SPACES_BRAND_LOGO_Y = '19%'
/** Mesmo retângulo que o compose usa (shape só desenha com path). */
export const SPACES_RECT_PATH = 'M 0 0 L 100 0 L 100 100 L 0 100 Z'

const r3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * Source do Creatomate. Só propriedades que o montador do anúncio v2 (lib/ads/adV2Montage.ts) já exercita em produção:
 * shape+path+fill_color, image/video com fit/x/y/width/height, animação 'scale', enter_transition 'fade', text com
 * background_color/padding/border_radius. Para cada par: "Antes" (foto vazia, zoom lento) → o clipe entra em FADE por
 * cima (mesma câmera = a revelação) com "Depois". Fim: cartão com a assinatura (só se houver). A nota "Imagem
 * ilustrativa" só entra se a pessoa marcou (showSeal), por cima de tudo, do começo ao fim.
 */
export function buildSpacesMontageSource(args: {
  pairs: readonly SpacePair[]
  signature: string
  contact: string
  fontFamily: string
  labels?: SpacesVideoLabels
  showSeal?: boolean
  width?: number
  height?: number
}): Record<string, unknown> {
  const L = args.labels ?? SPACES_VIDEO_LABELS_EN
  const width = args.width ?? 1080
  const height = args.height ?? 1920
  const pairs = args.pairs
  if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > SPACE_MAX_PHOTOS) throw new Error('spaces_montage_bad_pairs')
  const isHttps = (u: unknown) => typeof u === 'string' && /^https:\/\/\S+$/i.test(u)
  pairs.forEach((p, i) => { if (!isHttps(p?.beforeUrl) || !isHttps(p?.clipUrl)) throw new Error(`spaces_montage_bad_url:${i}`) })
  const font = cleanLine(args.fontFamily, 60) || 'Montserrat'
  const signature = signatureLine(args.signature, L.presentedBy)
  const contact = cleanLine(args.contact, SPACE_CONTACT_MAX)

  const elements: Record<string, unknown>[] = []
  const pairSeconds = SPACES_BEFORE_SECONDS + SPACES_CLIP_SECONDS
  const shotsSeconds = r3(pairs.length * pairSeconds)
  const total = r3(shotsSeconds + SPACES_CARD_SECONDS)
  const full = { x: '50%', y: '50%', width: '100%', height: '100%' }
  const label = (text: string, time: number, duration: number) => ({
    type: 'text', track: 4, time: r3(time), duration: r3(duration), text,
    x: '50%', y: '9%', x_anchor: '50%', y_anchor: '50%', width: '60%', height: '6%',
    font_family: font, font_size: 44, font_weight: '800', fill_color: '#ffffff',
    background_color: 'rgba(0,0,0,0.55)', background_x_padding: '6%', background_y_padding: '12%', border_radius: 14,
    enter_transition: { type: 'fade', duration: 0.25 },
  })

  elements.push({ type: 'shape', track: 1, time: 0, duration: total, ...full, path: SPACES_RECT_PATH, fill_color: '#000000' })
  pairs.forEach((p, i) => {
    const t0 = r3(i * pairSeconds)
    const tClip = r3(t0 + SPACES_BEFORE_SECONDS)
    elements.push({
      type: 'image', track: 2, time: t0, duration: r3(SPACES_BEFORE_SECONDS + SPACES_REVEAL_SECONDS),
      source: p.beforeUrl.trim(), fit: 'cover', ...full,
      animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: '104%', easing: 'linear' }],
      ...(i > 0 ? { enter_transition: { type: 'fade', duration: 0.4 } } : {}),
    })
    elements.push({
      type: 'video', track: 3, time: tClip, duration: SPACES_CLIP_SECONDS,
      source: p.clipUrl.trim(), fit: 'cover', ...full, loop: false, trim_start: 0, volume: '0%',
      enter_transition: { type: 'fade', duration: SPACES_REVEAL_SECONDS },
    })
    elements.push(label(cleanLine(L.before, 24), t0 + 0.15, SPACES_BEFORE_SECONDS - 0.15))
    // KINEO-NUVEM-A5-2026-10-02 — com destino rotulado, o nome do negócio entra no lugar do "Depois".
    const afterText = cleanLine(p.label ?? '', SPACES_DESTINATION_LABEL_MAX) || cleanLine(L.after, 24)
    elements.push(label(afterText, tClip + SPACES_REVEAL_SECONDS, SPACES_CLIP_SECONDS - SPACES_REVEAL_SECONDS))
  })

  // Cartão final: fundo escuro + assinatura + contato (sem logo de terceiros). Sem assinatura nem contato, o vídeo
  // termina no último "Depois" — nada de cartão vazio.
  const cardLines = [signature, contact].filter(Boolean)
  const withCard = cardLines.length > 0
  const end = withCard ? total : shotsSeconds
  if (withCard) elements.push({ type: 'shape', track: 3, time: shotsSeconds, duration: SPACES_CARD_SECONDS, ...full, path: SPACES_RECT_PATH, fill_color: '#0B0E13', enter_transition: { type: 'fade', duration: 0.5 } })
  cardLines.forEach((text, i) => {
    elements.push({
      type: 'text', track: 4, time: r3(shotsSeconds + 0.3), duration: r3(SPACES_CARD_SECONDS - 0.3), text,
      x: '50%', y: `${46 + i * 8}%`, x_anchor: '50%', y_anchor: '50%', width: '84%', height: '7%',
      font_family: font, font_size: i === 0 ? 56 : 42, font_weight: i === 0 ? '800' : '600', fill_color: '#ffffff',
      enter_transition: { type: 'fade', duration: 0.3 },
    })
  })
  // Nota "Imagem ilustrativa" do primeiro ao último quadro (acima de tudo) — só quando a pessoa marcou.
  if (args.showSeal === true) elements.push({
    type: 'text', track: 5, time: 0, duration: end, text: cleanLine(L.seal, 60),
    x: '50%', y: '95.5%', x_anchor: '50%', y_anchor: '50%', width: '92%', height: '3%',
    font_family: font, font_size: 26, font_weight: '600', fill_color: 'rgba(255,255,255,0.92)',
    background_color: 'rgba(0,0,0,0.45)', background_x_padding: '3%', background_y_padding: '20%', border_radius: 8,
  })

  elements[0] = { ...elements[0], duration: end }
  return { output_format: 'mp4', width, height, frame_rate: 30, duration: end, snapshot_time: SPACES_BEFORE_SECONDS + 2, elements }
}
