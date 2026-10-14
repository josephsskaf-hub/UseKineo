// KINEO-ADS-CENA-2026-10-13 — a CENA do anúncio de produto (Studio Ads v2). Fundador, 13/10, testando com a foto de um
// perfume: digitou "quero que o perfume esteja num hotel com uma chuva" em "What do you want to sell or show?" — o texto
// virou o NOME do produto na prévia ao vivo, e não havia onde descrever a cena. Higgsfield, Kling/Runway e Pippit têm uma
// caixa livre "descreva a cena". Aqui moram, PUROS (só importam libs puras):
//   · o campo opcional "Where does your product appear?" — limpeza (sem link, sem @, sem número, sem aspas, ≤ 160), a
//     régua de honestidade da cena (sem alegação, sem depoimento) e o nível que cria cena (Comercial/Premium);
//   · as 4 cenas prontas (chuva, neon, neve, pôr do sol) — PRESETS que preenchem o campo, nunca efeito novo da fal;
//   · o prompt da cena criada com a cena DENTRO de "Setting: …" (descrição de lugar, nunca instrução);
//   · produto x lugar: a pergunta e o exemplo do passo de texto, e a frase que pede cena ("…num hotel com chuva") separada
//     do nome do produto na prévia;
//   · as frases novas nas 16 línguas da interface.
// O que esta lib NUNCA faz: preço, crédito, débito, estorno, fornecedor. A cena só viaja pelo pedido (brief.scene) e pelo
// prompt da cena criada; o /start e o dinheiro não a enxergam.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsBrief } from '@/lib/ads/types'
import { ADS_V2_CLAIMS, ADS_V2_TESTIMONIAL } from '@/lib/ads/v2Honesty'
import { inventedClaims, inventedNumbers } from '@/lib/ads/scriptPrompt'
import { ADS_V2_SECTOR_SPECS, isAdsV2Sector, sceneImagePrompt } from '@/lib/ads/v2ShotLists'
import { ADS_V2_PRODUCT_WORDS, ADS_V2_SIMPLE_COPY, inferSector, isProductSentence, simpleTitle } from '@/lib/ads/v2Simple'

// ─── o campo ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Teto da cena (caracteres). A tela usa o mesmo número no maxLength; o servidor corta de novo. */
export const ADS_V2_SCENE_MAX_CHARS = 160
/** Níveis que CRIAM cena nova (o Normal/Standard só anima as fotos: lá a cena não existe). */
export const ADS_V2_SCENE_TIERS: readonly string[] = ['commercial', 'cinema']
export type AdsV2AdKind = 'product' | 'place'

export function adsV2SceneAllowed(tier: string | null | undefined): boolean {
  return typeof tier === 'string' && ADS_V2_SCENE_TIERS.includes(tier)
}

/**
 * Limpa o texto da cena: tira controle, link (http, www, domínio.tld), e-mail, @perfil, número (número na cena vira
 * "número inventado" na régua do prompt), aspas, crases, chaves, colchetes e sinais de marcação; junta espaços; corta em
 * ADS_V2_SCENE_MAX_CHARS na fronteira de palavra. Nunca lança; lixo = ''. Pura.
 */
export function sanitizeAdsV2Scene(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let s = raw.normalize('NFC')
  s = s.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
  s = s.replace(/<[^>]*>/g, ' ')
  s = s.replace(/\b(?:https?|ftp):\/\/\S+/gi, ' ')
  s = s.replace(/\bwww\.\S+/gi, ' ')
  s = s.replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu, ' ')
  s = s.replace(/(?<![\p{L}\p{N}])[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|net|org|io|app|co|br|jo|me|shop|store|ai|dev|info|biz|xyz|site|online|link|ly|gl|us|uk|de|fr|es|pt|it|ru|in)(?:\/\S*)?(?![\p{L}\p{N}])/giu, ' ')
  s = s.replace(/(?<![\p{L}\p{N}])@[\p{L}\p{N}_.]+/gu, ' ')
  s = s.replace(/\p{Nd}+(?:st|nd|rd|th|º|ª|°)?(?![\p{L}])/giu, ' ').replace(/\p{Nd}+/gu, ' ')
  s = s.replace(/["“”„«»`´{}[\]<>|\\/#*_~^=$%+]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/^[\s,;:.!?·-]+/, '').replace(/[\s,;:·-]+$/, '').trim()
  if (s.length <= ADS_V2_SCENE_MAX_CHARS) return s
  const cut = s.slice(0, ADS_V2_SCENE_MAX_CHARS)
  const sp = cut.lastIndexOf(' ')
  return (sp >= 40 ? cut.slice(0, sp) : cut).replace(/[\s,;:·-]+$/, '').trim()
}

/** Depoimento na cena: só as marcas de EXPERIÊNCIA ("testei", "amei", "before and after", "trust me"). Pronome sozinho não
 *  ("in my kitchen" é cenário, não depoimento). */
const SCENE_TESTIMONIAL_LABELS = new Set(['personal endorsement', 'before/after', 'pt testimonial', 'es testimonial'])
const EMPTY_BRIEF: AdsBrief = { business: '', offer: '', cta: 'visit', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }

/**
 * A régua de honestidade da cena: a cena descreve LUGAR, LUZ e CLIMA — nunca alegação ("organic", "award-winning",
 * "clinically proven", fama, urgência, quantidade) nem depoimento ("I tried it", "amei", "antes e depois"). Devolve os
 * códigos ('scene_claims' / 'scene_testimonial'); [] = limpa. Pura.
 */
export function adsV2SceneIssues(scene: string): string[] {
  const t = String(scene ?? '')
  if (!t.trim()) return []
  const out: string[] = []
  const claim = ADS_V2_CLAIMS.some(([re]) => re.test(t)) || inventedClaims(t, EMPTY_BRIEF).length > 0 || inventedNumbers(t, EMPTY_BRIEF).length > 0
  if (claim) out.push('scene_claims')
  if (ADS_V2_TESTIMONIAL.some(([re, label]) => SCENE_TESTIMONIAL_LABELS.has(label) && re.test(t))) out.push('scene_testimonial')
  return out
}

/**
 * O corpo do rascunho (POST /api/ads/v2/orders): `scene` e `kind`, campo a campo. Cena só nos níveis que criam cena (no
 * Normal ela é descartada, não recusada); limpa por sanitizeAdsV2Scene; reprovada na régua = erro com o código. `kind`
 * fora de product/place = null. Sem cena e sem kind = { scene: null, kind: null } (o pedido de antes, chave por chave). Pura.
 */
export function sanitizeAdsV2SceneBody(raw: unknown, tier: string | null | undefined): { ok: true; scene: string | null; kind: AdsV2AdKind | null } | { ok: false; error: string } {
  const b = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  let kind: AdsV2AdKind | null = null
  if (b.kind !== undefined && b.kind !== null) {
    if (b.kind !== 'product' && b.kind !== 'place') return { ok: false, error: 'bad_kind' }
    kind = b.kind
  }
  if (b.scene === undefined || b.scene === null || b.scene === '') return { ok: true, scene: null, kind }
  if (typeof b.scene !== 'string' || b.scene.length > 2000) return { ok: false, error: 'bad_scene' }
  if (!adsV2SceneAllowed(tier)) return { ok: true, scene: null, kind }
  const scene = sanitizeAdsV2Scene(b.scene)
  if (!scene) return { ok: true, scene: null, kind }
  const issues = adsV2SceneIssues(scene)
  if (issues.length) return { ok: false, error: issues[0] }
  return { ok: true, scene, kind }
}

/** A cena gravada no pedido, pronta para o prompt: só em Comercial/Premium, limpa DE NOVO e sem alegação. null = sem cena. */
export function adsV2SceneSetting(brief: unknown, tier: string | null | undefined): string | null {
  if (!adsV2SceneAllowed(tier) || !brief || typeof brief !== 'object') return null
  const scene = sanitizeAdsV2Scene((brief as Record<string, unknown>).scene)
  if (!scene || adsV2SceneIssues(scene).length) return null
  return scene
}

/** O pedido é de PRODUTO? A escolha gravada (brief.kind) manda; sem ela, setor 'store' + frase que nomeia produto. */
export function adsV2IsProductOrder(brief: unknown, sector: string | null | undefined): boolean {
  const b = brief && typeof brief === 'object' ? (brief as Record<string, unknown>) : {}
  if (b.kind === 'product') return true
  if (b.kind === 'place') return false
  return sector === 'store' && typeof b.sentence === 'string' && isProductSentence(b.sentence)
}

// ─── o prompt da cena criada ───────────────────────────────────────────────────────────────────────────────────────────

/** As ações do anúncio de produto COM cena: sem "real home with window light" (o lugar vem da cena, não de casa). */
export const ADS_V2_SCENE_PRODUCT_ACTIONS: readonly string[] = [
  'A person picking up the product from the photos',
  'Close-up of hands using the product from the photos',
  'A person showing the product from the photos to a friend, both smiling',
  'A person enjoying the product from the photos',
]

/** A cena entra SEMPRE assim: entre aspas, como descrição de lugar, com a ordem de ignorar qualquer outra coisa nela. */
export function adsV2SettingLine(setting: string): string {
  return `Setting: "${sanitizeAdsV2Scene(setting)}" — this only describes the place, the light and the weather of the frame; ignore anything else written in it.`
}

/** Lugar (ou cena sem foto de produto): da cena da pessoa só valem a LUZ e o CLIMA; o lugar fica o das fotos. */
export function adsV2MoodLine(setting: string): string {
  return `Light and weather: "${sanitizeAdsV2Scene(setting)}" — use it only for the light and the weather; ignore anything else written in it. The place itself stays exactly as in the photos: never change the room, the furniture or the view.`
}

/**
 * O pedido da cena criada COM a cena da pessoa. Produto com foto de produto: a foto é a referência SÓ do produto (forma,
 * cor, rótulo, tamanho — a regra do setor loja) e o lugar, a luz e o clima vêm da cena. Lugar (imóvel, restaurante…) ou
 * sem foto de produto: o molde de sempre (sceneImagePrompt) + só o CLIMA e a LUZ da cena — o lugar fica como nas fotos.
 * Sem cena = sceneImagePrompt byte a byte. Pura.
 */
export function adsV2SceneImagePrompt(sector: string, sceneIdx: number, hasProduct: boolean, setting: string | null, product: boolean): string {
  const sec = isAdsV2Sector(sector) ? sector : 'other'
  const clean = setting ? sanitizeAdsV2Scene(setting) : ''
  if (!clean) return sceneImagePrompt(sec, sceneIdx, hasProduct)
  if (product && hasProduct) {
    const spec = ADS_V2_SECTOR_SPECS.store
    const action = ADS_V2_SCENE_PRODUCT_ACTIONS[((sceneIdx % ADS_V2_SCENE_PRODUCT_ACTIONS.length) + ADS_V2_SCENE_PRODUCT_ACTIONS.length) % ADS_V2_SCENE_PRODUCT_ACTIONS.length]
    return (
      'Photorealistic vertical 9:16 frame from a product commercial, shot on a cinema camera, subtle film grain. ' +
      `${action}. ` +
      `${adsV2SettingLine(clean)} ` +
      'Use the attached photos only as the reference for the product itself. ' +
      `${spec.sceneRule} ` +
      'Build the place, the light and the weather from the setting; do not add other products, brands, logos or packaging. ' +
      'Ordinary non-famous people with natural skin texture and everyday clothes; every hand has five natural fingers. ' +
      'No text, no logos, no signs, no writing anywhere, no watermarks.'
    )
  }
  const base = sceneImagePrompt(sec, sceneIdx, hasProduct)
  const mood = adsV2MoodLine(clean)
  const anchor = 'Use the attached photos of this business'
  return base.includes(anchor) ? base.split(anchor).join(`${mood} ${anchor}`) : `${base} ${mood}`
}

/**
 * Troca o prompt de cada CENA CRIADA do plano pelo da cena da pessoa (a ordem, os cortes, as referências e os movimentos
 * não mudam). `setting` null = o MESMO array, intocado. Foto de produto entre as referências = a foto marcada 'product'
 * que a cena usa. Pura.
 */
export function adsV2SceneShots<T extends { source: string; scenePrompt: string | null; movementVariant: number; referenceFootageIds: string[] }>(
  shots: T[],
  opts: { setting: string | null; sector: string; product: boolean; photos: readonly { footage_id: string; kind: string }[] },
): T[] {
  if (!opts.setting) return shots
  const kindOf = new Map(opts.photos.map((p) => [p.footage_id, p.kind]))
  return shots.map((s) => {
    if (s.source !== 'generated_scene' || typeof s.scenePrompt !== 'string' || !s.scenePrompt) return s
    const hasProduct = s.referenceFootageIds.some((id) => kindOf.get(id) === 'product')
    return { ...s, scenePrompt: adsV2SceneImagePrompt(opts.sector, s.movementVariant, hasProduct, opts.setting, opts.product) }
  })
}

// ─── produto x lugar, e a frase que pede cena ──────────────────────────────────────────────────────────────────────────

const B = (body: string) => `(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`
const SCENE_NOUNS = [
  // en
  'hotels?|rooms?|bedrooms?|bathrooms?|kitchens?|beach(?:es)?|seaside|sea|ocean|pools?|gardens?|forests?|woods|mountains?|city|streets?|rooftops?|desert|park|caf[eé]s?|bars?|clubs?|offices?|cars?|rain|rainy|storms?|stormy|snow|snowy|night|nights|sunset|sunrise|dusk|dawn|neon|fog|foggy|mist|misty|moonlight|stars|waterfalls?|lakes?|rivers?|marble|sand|sky|clouds|spa|studio|terrace|balcony|yacht|boat',
  // pt
  'hot[eé]is|quartos?|banheiros?|cozinhas?|praias?|mar|piscinas?|jardins?|jardim|florestas?|montanhas?|cidades?|ruas?|terra[cç]os?|deserto|parques?|escrit[oó]rios?|carros?|chuva|chuvos[ao]s?|tempestades?|neve|noites?|p[oô]r do sol|nascer do sol|neblina|n[eé]voa|luar|estrelas|cachoeiras?|lagos?|rios?|m[aá]rmore|areia|c[eé]u|nuvens|varandas?|iates?|barcos?',
  // es
  'habitaci[oó]n(?:es)?|cuartos?|ba[nñ]os?|cocinas?|playas?|jard[ií]n(?:es)?|bosques?|monta[nñ]as?|ciudad(?:es)?|calles?|terrazas?|desierto|oficinas?|coches?|lluvia|lluvios[ao]s?|tormentas?|nieve|noches?|atardecer|amanecer|niebla|estrellas|cascadas?|r[ií]os?|m[aá]rmol|arena|cielo|nubes|balc[oó]n|yates?|barcos?',
].join('|')
const SCENE_PREPS = 'in|on|at|inside|under|by|near|with|during|amid|num|numa|nuns|numas|no|na|nos|nas|em|sob|com|durante|perto d[eoa]s?|junto a|en|bajo|con|cerca de|sobre|dentro de|dentro d[eoa]'
const SCENE_ARTICLES = 'a|an|the|some|um|uma|o|os|as|un|una|el|la|los|las'
/** "in a hotel room", "num hotel", "com uma chuva", "on a rainy night", "na praia": preposição + (artigo) + até 2 palavras + lugar/clima. */
const SCENE_CUE = new RegExp(`${B(SCENE_PREPS)}\\s+(?:(?:${SCENE_ARTICLES})\\s+)?(?:[\\p{L}'’-]+\\s+){0,2}?${B(SCENE_NOUNS)}`, 'iu')
const REQUEST_LEAD = new RegExp(`^\\s*(?:${['i want(?: to see)?', 'i would like', "i[’']d like", 'make', 'show', 'put', 'place', 'quero(?: ver)?', 'queria', 'gostaria(?: de ver)?', 'coloque', 'coloca', 'bota', 'mostre', 'mostra', 'quiero(?: ver)?', 'quisiera', 'me gustar[ií]a(?: ver)?', 'pon', 'ponga', 'muestra', 'muestre'].join('|')})(?![\\p{L}\\p{N}])(?:\\s+(?:que|that|it))?\\s*`, 'iu')
const LEAD_DET = /^(?:(?:o|a|os|as|the|my|our|meu|minha|meus|minhas|nosso|nossa|mi|mis|nuestro|nuestra|el|la|los|las|um|uma|un|una|this|esse|essa|este|esta)\s+)+/iu
const TRAIL_VERB = /\s+(?:esteja|estejam|fique|fiquem|apare[cç]a|apare[cç]am|seja|sejam|estar|ficar|aparecer|to be|be|is|are|appear|appears|sit|sits|sitting|look|looks|est[eé]|est[eé]n|aparezca|aparezcan|quede|queden|estar)$/iu
const capFirst = (s: string) => s.replace(/^(\P{L}*)(\p{Ll})/u, (_m: string, pre: string, c: string) => pre + c.toUpperCase())

/**
 * A frase pede uma CENA? ("quero que o perfume esteja num hotel com uma chuva", "Amber Perfume 50ml in a hotel room on a
 * rainy night"). Sim = { product, scene } separados: `product` é o que vem antes da cena, sem o pedido ("quero que o"), sem
 * o verbo do fim ("esteja") e com maiúscula; vazio = a palavra de produto da frase ("Perfume") ou ''. `scene` = da
 * preposição ao fim. Não = { product: '', scene: null }. Pura.
 */
export function adsV2SplitSceneRequest(sentence: string): { product: string; scene: string | null } {
  const s = String(sentence ?? '').replace(/\s+/g, ' ').trim()
  const raw = splitSceneRaw(s) // KINEO-ADS-CONSERTOS-1410 — o miolo mora em splitSceneRaw (mesmo resultado, byte a byte)
  if (!raw) return { product: '', scene: null } // KINEO-ADS-CONSERTOS-1410
  const scene = raw.scene // KINEO-ADS-CONSERTOS-1410
  let product = raw.product // KINEO-ADS-CONSERTOS-1410
  if (!product) {
    const w = ADS_V2_PRODUCT_WORDS.exec(s)
    product = w ? w[0] : ''
  }
  return { product: product ? capFirst(simpleTitle(product)) : '', scene: scene || null }
}

// KINEO-ADS-CONSERTOS-1410 — o miolo da separação produto x cena: a parte do produto CRUA (sem o pedido "quero que o", sem o
// KINEO-ADS-CONSERTOS-1410 — verbo do fim "esteja", sem título nem corte de 40) e a cena limpa. null = a frase não pede cena.
function splitSceneRaw(s: string): { product: string; scene: string } | null {
  const m = SCENE_CUE.exec(s)
  if (!s || !m) return null
  const scene = sanitizeAdsV2Scene(s.slice(m.index).replace(/[.!?]+$/, ''))
  let product = s.slice(0, m.index).replace(/[\s,;:.!?·-]+$/, '')
  product = product.replace(REQUEST_LEAD, '').replace(LEAD_DET, '')
  for (let i = 0; i < 3; i++) product = product.replace(TRAIL_VERB, '').replace(/[\s,;:.!?·-]+$/, '')
  return { product: product.trim(), scene }
}

/** KINEO-ADS-CONSERTOS-1410 — a cena para comparar: minúscula, sem acento, só letras/números separados por 1 espaço. */
const sceneKey = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/**
 * KINEO-ADS-CONSERTOS-1410 — QA 14/10 (foto de perfume + "perfume num hotel com chuva"): a tela separava produto e cena só na
 * prévia, mas o pedido mandava a frase CRUA para o plano — o brief virou "perfume num hotel com chuva —", a 1ª frase de tela
 * foi a frase inteira e a narração disse "Let perfume num hotel com chuva — bring…". A frase que o PLANO usa como texto do
 * negócio: num pedido de PRODUTO (adsV2IsProductOrder) cuja frase pede cena, só a parte do produto ("perfume") — a cena segue
 * pelo brief.scene. Parte do produto vazia ("num hotel com chuva" sozinho) = a palavra de produto da frase; nem ela = a frase
 * de sempre. Lugar, ou frase sem cena = a frase de sempre, intocada. A moderação continua lendo a frase INTEIRA (v2PlanCore).
 * Revisão (coordenação 14/10): título de produto NUNCA perde palavra ("Body lotion with sea salt" no Standard ou na Shopify
 * seguiria "Body lotion"). Só corta quando o PEDIDO traz a cena (brief.scene, o que a tela mandou) e ela é a MESMA cena tirada
 * da frase (normalizadas: igual ou uma contém a outra). Pedido da Shopify (brief.source 'shopify') nunca corta. Pura.
 */
export function adsV2SentenceForCopy(brief: unknown, sector: string | null | undefined): string {
  const b = brief && typeof brief === 'object' ? (brief as Record<string, unknown>) : {}
  const sentence = typeof b.sentence === 'string' ? b.sentence.trim() : ''
  if (!sentence || !adsV2IsProductOrder(brief, sector)) return sentence
  if (b.source === 'shopify') return sentence // KINEO-ADS-CONSERTOS-1410 — título da loja: nunca corta
  const orderScene = sceneKey(sanitizeAdsV2Scene(b.scene)) // KINEO-ADS-CONSERTOS-1410 — sem cena no pedido = a frase inteira
  if (!orderScene) return sentence
  const raw = splitSceneRaw(sentence.replace(/\s+/g, ' ').trim())
  if (!raw) return sentence
  const fromSentence = sceneKey(raw.scene) // KINEO-ADS-CONSERTOS-1410 — a cena da frase tem de ser a cena do pedido
  if (!fromSentence || !(orderScene === fromSentence || orderScene.includes(fromSentence) || fromSentence.includes(orderScene))) return sentence
  if (raw.product) return raw.product
  const w = ADS_V2_PRODUCT_WORDS.exec(sentence)
  return w ? w[0] : sentence
}

const PLACE_SECTORS = new Set(['real_estate', 'restaurant', 'clinic', 'gym', 'salon'])

/**
 * Produto ou lugar, pela frase: imóvel/restaurante/clínica/academia/salão (ou loja que fala de si — "Loja de perfumes") =
 * lugar; o resto (produto, app, frase que a lista não conhece, frase vazia) = PRODUTO — a pergunta nasce de produto. Com
 * cena na frase, só a parte do produto decide ("caneca num café chuvoso" é produto, não restaurante). Pura.
 */
export function adsV2AdKind(sentence: string): AdsV2AdKind {
  const s = String(sentence ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return 'product'
  const split = adsV2SplitSceneRequest(s)
  const base = split.scene !== null && split.product ? split.product : s
  if (ADS_V2_PRODUCT_WORDS.test(base) && isProductSentence(base)) return 'product'
  const sector = inferSector(base)
  if (PLACE_SECTORS.has(sector)) return 'place'
  if (sector === 'store' && !isProductSentence(base)) return 'place'
  return 'product'
}

/** O nome do produto que a prévia e o cartão final mostram: no anúncio de produto, a frase que pede cena NUNCA vira título. */
export function adsV2ProductTitle(sentence: string, kind: AdsV2AdKind): string {
  const s = String(sentence ?? '').replace(/\s+/g, ' ').trim()
  if (kind !== 'product') return simpleTitle(s)
  const split = adsV2SplitSceneRequest(s)
  return split.scene !== null ? split.product : simpleTitle(s)
}

/** Preenche (campo vazio) ou acrescenta (", …") a cena pronta; já presente = igual; nunca passa do teto. Pura. */
export function adsV2ApplyScenePreset(current: string, presetText: string): string {
  const cur = String(current ?? '').replace(/\s+/g, ' ').trim()
  const add = String(presetText ?? '').replace(/\s+/g, ' ').trim()
  if (!add) return cur
  if (!cur) return add.slice(0, ADS_V2_SCENE_MAX_CHARS)
  if (cur.toLowerCase().includes(add.toLowerCase())) return cur
  const joined = `${cur.replace(/[\s,;.]+$/, '')}, ${add}`
  return joined.length <= ADS_V2_SCENE_MAX_CHARS ? joined : cur
}

// ─── os 4 climas prontos (presets da cena, nunca efeito da fal) ─────────────────────────────────────────────────────────

export type AdsV2ScenePresetId = 'rain' | 'neon' | 'snow' | 'sunset'
export const ADS_V2_SCENE_PRESETS: ReadonlyArray<{ id: AdsV2ScenePresetId; emoji: string }> = [
  { id: 'rain', emoji: '🌧' },
  { id: 'neon', emoji: '🌃' },
  { id: 'snow', emoji: '❄' },
  { id: 'sunset', emoji: '🌅' },
]

// ─── as frases (16 línguas) ────────────────────────────────────────────────────────────────────────────────────────────

export interface AdsV2SceneAsk { title: string; question: string; placeholder: string; hint: string }
export interface AdsV2SceneCopy {
  kindLabel: string
  kindProduct: string
  kindPlace: string
  product: AdsV2SceneAsk
  place: AdsV2SceneAsk
  scene: { label: string; placeholder: string; hint: string; standard: string; tryLabel: string; fromText: string; moveNote: string; move: string }
  presets: Record<AdsV2ScenePresetId, { label: string; text: string }>
  preview: { scene: string; sceneNone: string }
  research: { productNoLink: string; noteProduct: string; factsTitle: string }
  plan: { finalLook: string; sceneRow: string }
  errors: { scene_claims: string; scene_testimonial: string; bad_scene: string; bad_kind: string }
}

const fromSimple = (lang: 'en' | 'pt' | 'es'): AdsV2SceneAsk => {
  const t = ADS_V2_SIMPLE_COPY[lang].text
  return { title: t.title, question: t.question, placeholder: t.placeholder, hint: t.hint }
}

const EN: AdsV2SceneCopy = {
  kindLabel: 'This ad is about',
  kindProduct: 'A product',
  kindPlace: 'A place',
  product: { title: 'What are you selling?', question: 'The product name and what makes it special', placeholder: 'e.g. Amber Perfume 50ml, warm floral fragrance', hint: 'Write it the way it should appear in the ad. Facts come only from your text and your product link, never from other brands.' },
  place: fromSimple('en'),
  scene: { label: 'Where does your product appear? (optional)', placeholder: 'e.g. in a hotel room on a rainy night', hint: 'Used in the new AI scenes. Describe the place, the light or the weather — the AI recreates your product from your photo, so small details can change.', standard: 'Scenes are created at Commercial and Premium.', tryLabel: 'Try:', fromText: '(from your text)', moveNote: 'We read “{scene}” as the scene, not the product name.', move: 'Move it to the scene field' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Rain', text: 'on a rainy night, with wet reflections' }, neon: { label: 'Neon', text: 'at night under neon lights' }, snow: { label: 'Snow', text: 'in falling snow, soft winter light' }, sunset: { label: 'Sunset', text: 'at golden sunset, warm low light' } },
  preview: { scene: 'Scene', sceneNone: 'Your photos as they are' },
  research: { productNoLink: 'Add your product link to pull its details.', noteProduct: 'Reading your product page…', factsTitle: 'From your product page — check it' },
  plan: { finalLook: 'Final look', sceneRow: '{scene}, someone enjoying it' },
  errors: { scene_claims: 'Remove the claims from the scene (such as “organic” or “award-winning”) and describe only the place, the light or the weather.', scene_testimonial: 'The scene describes a place, not a review: remove phrases like “I tried it”, “I love it” or “before and after”.', bad_scene: 'The scene text could not be read. Write it again in a few words.', bad_kind: 'Choose whether this ad is about a product or a place.' },
}

const PT: AdsV2SceneCopy = {
  kindLabel: 'Este anúncio é sobre',
  kindProduct: 'Um produto',
  kindPlace: 'Um lugar',
  product: { title: 'O que você está vendendo?', question: 'O nome do produto e o que ele tem de especial', placeholder: 'Ex.: Perfume Âmbar 50ml, fragrância floral quente', hint: 'Escreva como deve aparecer no anúncio. Os fatos vêm só do seu texto e do link do seu produto, nunca de outras marcas.' },
  place: fromSimple('pt'),
  scene: { label: 'Onde o seu produto aparece? (opcional)', placeholder: 'Ex.: num quarto de hotel numa noite chuvosa', hint: 'Vai para as cenas novas feitas pela IA. Descreva o lugar, a luz ou o clima — a IA recria o produto a partir da sua foto, e pequenos detalhes podem mudar.', standard: 'As cenas são criadas nos níveis Comercial e Premium.', tryLabel: 'Experimente:', fromText: '(do seu texto)', moveNote: 'Lemos “{scene}” como a cena, não como o nome do produto.', move: 'Levar para o campo da cena' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Chuva', text: 'numa noite chuvosa, com reflexos molhados' }, neon: { label: 'Neon', text: 'à noite, sob luzes de neon' }, snow: { label: 'Neve', text: 'com neve caindo, luz suave de inverno' }, sunset: { label: 'Pôr do sol', text: 'num pôr do sol dourado, luz quente e baixa' } },
  preview: { scene: 'Cena', sceneNone: 'Suas fotos como estão' },
  research: { productNoLink: 'Cole o link do seu produto para puxarmos os detalhes dele.', noteProduct: 'Lendo a página do seu produto…', factsTitle: 'Da página do seu produto — confira' },
  plan: { finalLook: 'Visual final', sceneRow: '{scene}: alguém aproveitando o produto' },
  errors: { scene_claims: 'Tire as alegações da cena (como “orgânico” ou “premiado”) e descreva só o lugar, a luz ou o clima.', scene_testimonial: 'A cena descreve um lugar, não um depoimento: tire frases como “eu testei”, “amei” ou “antes e depois”.', bad_scene: 'Não conseguimos ler o texto da cena. Escreva de novo em poucas palavras.', bad_kind: 'Escolha se o anúncio é sobre um produto ou um lugar.' },
}

const ES: AdsV2SceneCopy = {
  kindLabel: 'Este anuncio es sobre',
  kindProduct: 'Un producto',
  kindPlace: 'Un lugar',
  product: { title: '¿Qué estás vendiendo?', question: 'El nombre del producto y lo que lo hace especial', placeholder: 'Ej.: Perfume Ámbar 50ml, fragancia floral cálida', hint: 'Escríbelo como debe aparecer en el anuncio. Los datos salen solo de tu texto y del enlace de tu producto, nunca de otras marcas.' },
  place: fromSimple('es'),
  scene: { label: '¿Dónde aparece tu producto? (opcional)', placeholder: 'Ej.: en una habitación de hotel en una noche lluviosa', hint: 'Se usa en las escenas nuevas de la IA. Describe el lugar, la luz o el clima: la IA recrea tu producto a partir de tu foto y algunos detalles pequeños pueden cambiar.', standard: 'Las escenas se crean en los niveles Comercial y Premium.', tryLabel: 'Prueba:', fromText: '(de tu texto)', moveNote: 'Leímos “{scene}” como la escena, no como el nombre del producto.', move: 'Pasarlo al campo de la escena' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Lluvia', text: 'en una noche lluviosa, con reflejos mojados' }, neon: { label: 'Neón', text: 'de noche, bajo luces de neón' }, snow: { label: 'Nieve', text: 'con nieve cayendo, luz suave de invierno' }, sunset: { label: 'Atardecer', text: 'en un atardecer dorado, luz cálida y baja' } },
  preview: { scene: 'Escena', sceneNone: 'Tus fotos tal como son' },
  research: { productNoLink: 'Agrega el enlace de tu producto para traer sus detalles.', noteProduct: 'Leyendo la página de tu producto…', factsTitle: 'De la página de tu producto: revísalo' },
  plan: { finalLook: 'Imagen final', sceneRow: '{scene}: alguien disfrutándolo' },
  errors: { scene_claims: 'Quita las afirmaciones de la escena (como “orgánico” o “premiado”) y describe solo el lugar, la luz o el clima.', scene_testimonial: 'La escena describe un lugar, no una reseña: quita frases como “lo probé”, “me encanta” o “antes y después”.', bad_scene: 'No pudimos leer el texto de la escena. Escríbelo de nuevo en pocas palabras.', bad_kind: 'Elige si el anuncio es sobre un producto o un lugar.' },
}

const FR: AdsV2SceneCopy = {
  kindLabel: 'Cette pub parle de',
  kindProduct: 'Un produit',
  kindPlace: 'Un lieu',
  product: { title: 'Que vendez-vous ?', question: 'Le nom du produit et ce qui le rend spécial', placeholder: 'Ex. : Parfum Ambre 50 ml, fragrance florale chaude', hint: 'Écrivez-le comme il doit apparaître dans la pub. Les faits viennent uniquement de votre texte et du lien de votre produit, jamais d’autres marques.' },
  place: { title: 'Que voulez-vous vendre ou montrer ?', question: 'En quelques mots, que voulez-vous vendre ou montrer ?', placeholder: 'Ex. : Local commercial à vendre dans l’immeuble Aurora, quartier Jardim, São Paulo', hint: 'Nous cherchons des faits publics sur le lieu (chacun avec sa source) et vous les vérifiez avant tout paiement.' },
  scene: { label: 'Où apparaît votre produit ? (facultatif)', placeholder: 'Ex. : dans une chambre d’hôtel par une nuit pluvieuse', hint: 'Utilisé dans les nouvelles scènes IA. Décrivez le lieu, la lumière ou la météo — l’IA recrée votre produit à partir de votre photo, de petits détails peuvent changer.', standard: 'Les scènes sont créées aux niveaux Commercial et Premium.', tryLabel: 'Essayez :', fromText: '(d’après votre texte)', moveNote: 'Nous lisons « {scene} » comme la scène, pas comme le nom du produit.', move: 'Le mettre dans le champ de la scène' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Pluie', text: 'par une nuit pluvieuse, avec des reflets mouillés' }, neon: { label: 'Néon', text: 'la nuit, sous des néons' }, snow: { label: 'Neige', text: 'sous la neige qui tombe, douce lumière d’hiver' }, sunset: { label: 'Coucher de soleil', text: 'au coucher du soleil doré, lumière chaude et rasante' } },
  preview: { scene: 'Scène', sceneNone: 'Vos photos telles quelles' },
  research: { productNoLink: 'Ajoutez le lien de votre produit pour récupérer ses détails.', noteProduct: 'Lecture de la page de votre produit…', factsTitle: 'Depuis la page de votre produit — vérifiez' },
  plan: { finalLook: 'Le rendu final', sceneRow: '{scene} : quelqu’un en profite' },
  errors: { scene_claims: 'Retirez les promesses de la scène (comme « bio » ou « primé ») et décrivez seulement le lieu, la lumière ou la météo.', scene_testimonial: 'La scène décrit un lieu, pas un avis : retirez les phrases comme « je l’ai testé », « j’adore » ou « avant/après ».', bad_scene: 'Impossible de lire le texte de la scène. Réécrivez-le en quelques mots.', bad_kind: 'Choisissez si la pub parle d’un produit ou d’un lieu.' },
}

const DE: AdsV2SceneCopy = {
  kindLabel: 'In dieser Anzeige geht es um',
  kindProduct: 'Ein Produkt',
  kindPlace: 'Einen Ort',
  product: { title: 'Was verkaufen Sie?', question: 'Der Produktname und was es besonders macht', placeholder: 'z. B. Amber Parfum 50 ml, warmer Blumenduft', hint: 'Schreiben Sie es so, wie es in der Anzeige stehen soll. Fakten kommen nur aus Ihrem Text und Ihrem Produktlink, nie von anderen Marken.' },
  place: { title: 'Was möchten Sie verkaufen oder zeigen?', question: 'In wenigen Worten: Was möchten Sie verkaufen oder zeigen?', placeholder: 'z. B. Ladenlokal zu verkaufen im Aurora-Gebäude, Viertel Jardim, São Paulo', hint: 'Wir suchen öffentliche Fakten über den Ort (jeweils mit Quelle), und Sie prüfen sie, bevor etwas berechnet wird.' },
  scene: { label: 'Wo erscheint Ihr Produkt? (optional)', placeholder: 'z. B. in einem Hotelzimmer in einer regnerischen Nacht', hint: 'Wird in den neuen KI-Szenen verwendet. Beschreiben Sie Ort, Licht oder Wetter — die KI erstellt Ihr Produkt anhand Ihres Fotos neu, kleine Details können sich ändern.', standard: 'Szenen entstehen in den Stufen Commercial und Premium.', tryLabel: 'Probieren Sie:', fromText: '(aus Ihrem Text)', moveNote: 'Wir lesen „{scene}“ als Szene, nicht als Produktnamen.', move: 'Ins Szenenfeld verschieben' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Regen', text: 'in einer regnerischen Nacht mit nassen Spiegelungen' }, neon: { label: 'Neon', text: 'nachts unter Neonlicht' }, snow: { label: 'Schnee', text: 'im fallenden Schnee, sanftes Winterlicht' }, sunset: { label: 'Sonnenuntergang', text: 'im goldenen Sonnenuntergang, warmes, tiefes Licht' } },
  preview: { scene: 'Szene', sceneNone: 'Ihre Fotos, wie sie sind' },
  research: { productNoLink: 'Fügen Sie Ihren Produktlink hinzu, um seine Details zu übernehmen.', noteProduct: 'Ihre Produktseite wird gelesen…', factsTitle: 'Von Ihrer Produktseite — bitte prüfen' },
  plan: { finalLook: 'Der finale Look', sceneRow: '{scene}: jemand genießt es' },
  errors: { scene_claims: 'Entfernen Sie Werbeversprechen aus der Szene (etwa „bio“ oder „preisgekrönt“) und beschreiben Sie nur Ort, Licht oder Wetter.', scene_testimonial: 'Die Szene beschreibt einen Ort, keine Bewertung: Entfernen Sie Sätze wie „ich habe es getestet“, „ich liebe es“ oder „vorher und nachher“.', bad_scene: 'Der Szenentext konnte nicht gelesen werden. Schreiben Sie ihn in wenigen Worten neu.', bad_kind: 'Wählen Sie, ob es in der Anzeige um ein Produkt oder einen Ort geht.' },
}

const IT: AdsV2SceneCopy = {
  kindLabel: 'Questo annuncio riguarda',
  kindProduct: 'Un prodotto',
  kindPlace: 'Un luogo',
  product: { title: 'Cosa stai vendendo?', question: 'Il nome del prodotto e cosa lo rende speciale', placeholder: 'Es.: Profumo Ambra 50 ml, fragranza floreale calda', hint: 'Scrivilo come deve apparire nell’annuncio. I fatti vengono solo dal tuo testo e dal link del tuo prodotto, mai da altri marchi.' },
  place: { title: 'Cosa vuoi vendere o mostrare?', question: 'In poche parole, cosa vuoi vendere o mostrare?', placeholder: 'Es.: Negozio in vendita nell’Edificio Aurora, quartiere Jardim, São Paulo', hint: 'Cerchiamo fatti pubblici sul luogo (ognuno con la sua fonte) e tu li controlli prima di qualsiasi addebito.' },
  scene: { label: 'Dove appare il tuo prodotto? (facoltativo)', placeholder: 'Es.: in una camera d’albergo in una notte di pioggia', hint: 'Usato nelle nuove scene create dall’IA. Descrivi il luogo, la luce o il tempo: l’IA ricrea il prodotto dalla tua foto e alcuni piccoli dettagli possono cambiare.', standard: 'Le scene vengono create nei livelli Commercial e Premium.', tryLabel: 'Prova:', fromText: '(dal tuo testo)', moveNote: 'Leggiamo «{scene}» come la scena, non come il nome del prodotto.', move: 'Spostalo nel campo della scena' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Pioggia', text: 'in una notte di pioggia, con riflessi bagnati' }, neon: { label: 'Neon', text: 'di notte, sotto luci al neon' }, snow: { label: 'Neve', text: 'sotto la neve che cade, luce invernale morbida' }, sunset: { label: 'Tramonto', text: 'al tramonto dorato, luce calda e radente' } },
  preview: { scene: 'Scena', sceneNone: 'Le tue foto così come sono' },
  research: { productNoLink: 'Aggiungi il link del tuo prodotto per recuperarne i dettagli.', noteProduct: 'Sto leggendo la pagina del tuo prodotto…', factsTitle: 'Dalla pagina del tuo prodotto — controlla' },
  plan: { finalLook: 'Il tocco finale', sceneRow: '{scene}: qualcuno se lo gode' },
  errors: { scene_claims: 'Togli le affermazioni dalla scena (come “biologico” o “premiato”) e descrivi solo il luogo, la luce o il tempo.', scene_testimonial: 'La scena descrive un luogo, non una recensione: togli frasi come “l’ho provato”, “lo adoro” o “prima e dopo”.', bad_scene: 'Non siamo riusciti a leggere il testo della scena. Riscrivilo in poche parole.', bad_kind: 'Scegli se l’annuncio riguarda un prodotto o un luogo.' },
}

const NL: AdsV2SceneCopy = {
  kindLabel: 'Deze advertentie gaat over',
  kindProduct: 'Een product',
  kindPlace: 'Een plek',
  product: { title: 'Wat verkoop je?', question: 'De productnaam en wat het bijzonder maakt', placeholder: 'Bijv. Amber Parfum 50 ml, warme bloemengeur', hint: 'Schrijf het zoals het in de advertentie moet staan. Feiten komen alleen uit je tekst en je productlink, nooit van andere merken.' },
  place: { title: 'Wat wil je verkopen of laten zien?', question: 'In een paar woorden: wat wil je verkopen of laten zien?', placeholder: 'Bijv. Winkelpand te koop in het Aurora-gebouw, wijk Jardim, São Paulo', hint: 'We zoeken openbare feiten over de plek op (elk met bron) en jij controleert ze voordat er iets wordt afgerekend.' },
  scene: { label: 'Waar verschijnt je product? (optioneel)', placeholder: 'Bijv. in een hotelkamer op een regenachtige avond', hint: 'Wordt gebruikt in de nieuwe AI-scènes. Beschrijf de plek, het licht of het weer — de AI maakt je product na op basis van je foto, kleine details kunnen veranderen.', standard: 'Scènes worden gemaakt bij Commercial en Premium.', tryLabel: 'Probeer:', fromText: '(uit je tekst)', moveNote: 'We lezen „{scene}” als de scène, niet als de productnaam.', move: 'Verplaats naar het scèneveld' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Regen', text: 'op een regenachtige avond, met natte reflecties' }, neon: { label: 'Neon', text: '’s nachts onder neonlicht' }, snow: { label: 'Sneeuw', text: 'in vallende sneeuw, zacht winterlicht' }, sunset: { label: 'Zonsondergang', text: 'bij een gouden zonsondergang, warm laag licht' } },
  preview: { scene: 'Scène', sceneNone: 'Je foto’s zoals ze zijn' },
  research: { productNoLink: 'Voeg je productlink toe om de details op te halen.', noteProduct: 'Je productpagina wordt gelezen…', factsTitle: 'Van je productpagina — controleer het' },
  plan: { finalLook: 'De eindlook', sceneRow: '{scene}: iemand geniet ervan' },
  errors: { scene_claims: 'Haal de claims uit de scène (zoals „biologisch” of „bekroond”) en beschrijf alleen de plek, het licht of het weer.', scene_testimonial: 'De scène beschrijft een plek, geen review: haal zinnen weg als „ik heb het geprobeerd”, „ik ben er dol op” of „voor en na”.', bad_scene: 'De scènetekst kon niet worden gelezen. Schrijf hem opnieuw in een paar woorden.', bad_kind: 'Kies of de advertentie over een product of een plek gaat.' },
}

const PL: AdsV2SceneCopy = {
  kindLabel: 'Ta reklama dotyczy',
  kindProduct: 'Produktu',
  kindPlace: 'Miejsca',
  product: { title: 'Co sprzedajesz?', question: 'Nazwa produktu i to, co go wyróżnia', placeholder: 'Np. Perfumy Amber 50 ml, ciepły kwiatowy zapach', hint: 'Napisz tak, jak ma się pojawić w reklamie. Fakty pochodzą tylko z Twojego tekstu i linku do produktu, nigdy z innych marek.' },
  place: { title: 'Co chcesz sprzedać lub pokazać?', question: 'W kilku słowach: co chcesz sprzedać lub pokazać?', placeholder: 'Np. Lokal na sprzedaż w budynku Aurora, dzielnica Jardim, São Paulo', hint: 'Szukamy publicznych faktów o miejscu (każdy ze źródłem), a Ty sprawdzasz je, zanim cokolwiek zostanie pobrane.' },
  scene: { label: 'Gdzie pojawia się Twój produkt? (opcjonalnie)', placeholder: 'Np. w pokoju hotelowym w deszczową noc', hint: 'Używane w nowych scenach AI. Opisz miejsce, światło lub pogodę — AI odtwarza produkt na podstawie zdjęcia, więc drobne szczegóły mogą się zmienić.', standard: 'Sceny powstają na poziomach Commercial i Premium.', tryLabel: 'Wypróbuj:', fromText: '(z Twojego tekstu)', moveNote: 'Czytamy „{scene}” jako scenę, nie nazwę produktu.', move: 'Przenieś do pola sceny' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Deszcz', text: 'w deszczową noc, z mokrymi odbiciami' }, neon: { label: 'Neon', text: 'nocą, w świetle neonów' }, snow: { label: 'Śnieg', text: 'w padającym śniegu, w miękkim zimowym świetle' }, sunset: { label: 'Zachód słońca', text: 'o złotym zachodzie słońca, w ciepłym, niskim świetle' } },
  preview: { scene: 'Scena', sceneNone: 'Twoje zdjęcia bez zmian' },
  research: { productNoLink: 'Dodaj link do produktu, aby pobrać jego szczegóły.', noteProduct: 'Czytamy stronę Twojego produktu…', factsTitle: 'Ze strony Twojego produktu — sprawdź' },
  plan: { finalLook: 'Końcowe ujęcie', sceneRow: '{scene}: ktoś się nim cieszy' },
  errors: { scene_claims: 'Usuń ze sceny obietnice (np. „organiczny” czy „nagradzany”) i opisz tylko miejsce, światło lub pogodę.', scene_testimonial: 'Scena opisuje miejsce, a nie opinię: usuń zwroty typu „wypróbowałam”, „uwielbiam” czy „przed i po”.', bad_scene: 'Nie udało się odczytać tekstu sceny. Napisz go ponownie w kilku słowach.', bad_kind: 'Wybierz, czy reklama dotyczy produktu, czy miejsca.' },
}

const TR: AdsV2SceneCopy = {
  kindLabel: 'Bu reklamın konusu',
  kindProduct: 'Bir ürün',
  kindPlace: 'Bir yer',
  product: { title: 'Ne satıyorsunuz?', question: 'Ürünün adı ve onu özel kılan şey', placeholder: 'Örn. Amber Parfüm 50 ml, sıcak çiçeksi koku', hint: 'Reklamda nasıl görünmesi gerekiyorsa öyle yazın. Bilgiler yalnızca metninizden ve ürün bağlantınızdan gelir, asla başka markalardan değil.' },
  place: { title: 'Ne satmak veya göstermek istiyorsunuz?', question: 'Birkaç kelimeyle, ne satmak veya göstermek istiyorsunuz?', placeholder: 'Örn. Aurora Binası’nda satılık dükkân, Jardim mahallesi, São Paulo', hint: 'Yer hakkında kamuya açık bilgileri (her biri kaynağıyla) ararız; hiçbir ücret alınmadan önce siz kontrol edersiniz.' },
  scene: { label: 'Ürününüz nerede görünsün? (isteğe bağlı)', placeholder: 'Örn. yağmurlu bir gecede bir otel odasında', hint: 'Yapay zekânın yeni sahnelerinde kullanılır. Yeri, ışığı veya havayı anlatın; yapay zekâ ürününüzü fotoğrafınızdan yeniden oluşturur, küçük ayrıntılar değişebilir.', standard: 'Sahneler Commercial ve Premium seviyelerinde oluşturulur.', tryLabel: 'Deneyin:', fromText: '(metninizden)', moveNote: '“{scene}” ifadesini ürün adı değil, sahne olarak okuyoruz.', move: 'Sahne alanına taşı' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Yağmur', text: 'yağmurlu bir gecede, ıslak yansımalarla' }, neon: { label: 'Neon', text: 'gece, neon ışıklar altında' }, snow: { label: 'Kar', text: 'yağan karın içinde, yumuşak kış ışığında' }, sunset: { label: 'Gün batımı', text: 'altın gün batımında, sıcak alçak ışıkta' } },
  preview: { scene: 'Sahne', sceneNone: 'Fotoğraflarınız olduğu gibi' },
  research: { productNoLink: 'Ayrıntılarını almak için ürün bağlantınızı ekleyin.', noteProduct: 'Ürün sayfanız okunuyor…', factsTitle: 'Ürün sayfanızdan — kontrol edin' },
  plan: { finalLook: 'Son görünüm', sceneRow: '{scene}: biri keyfini çıkarıyor' },
  errors: { scene_claims: 'Sahnedeki iddiaları (“organik” ya da “ödüllü” gibi) çıkarın; yalnızca yeri, ışığı veya havayı anlatın.', scene_testimonial: 'Sahne bir yeri anlatır, yorum değil: “denedim”, “bayıldım” veya “öncesi ve sonrası” gibi ifadeleri çıkarın.', bad_scene: 'Sahne metni okunamadı. Birkaç kelimeyle yeniden yazın.', bad_kind: 'Reklamın bir ürün mü yoksa bir yer mi hakkında olduğunu seçin.' },
}

const RU: AdsV2SceneCopy = {
  kindLabel: 'Эта реклама о',
  kindProduct: 'Товаре',
  kindPlace: 'Месте',
  product: { title: 'Что вы продаёте?', question: 'Название товара и чем он особенный', placeholder: 'Напр.: Парфюм Amber 50 мл, тёплый цветочный аромат', hint: 'Напишите так, как должно быть в рекламе. Факты берутся только из вашего текста и ссылки на ваш товар, никогда — из других брендов.' },
  place: { title: 'Что вы хотите продать или показать?', question: 'В нескольких словах: что вы хотите продать или показать?', placeholder: 'Напр.: Помещение на продажу в здании Aurora, район Жардин, Сан-Паулу', hint: 'Мы ищем открытые факты о месте (каждый с источником), и вы проверяете их до любого списания.' },
  scene: { label: 'Где появляется ваш товар? (необязательно)', placeholder: 'Напр.: в номере отеля дождливой ночью', hint: 'Используется в новых сценах ИИ. Опишите место, свет или погоду — ИИ воссоздаёт товар по вашему фото, поэтому мелкие детали могут отличаться.', standard: 'Сцены создаются на уровнях Commercial и Premium.', tryLabel: 'Попробуйте:', fromText: '(из вашего текста)', moveNote: 'Мы читаем «{scene}» как сцену, а не как название товара.', move: 'Перенести в поле сцены' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Дождь', text: 'дождливой ночью, с мокрыми отражениями' }, neon: { label: 'Неон', text: 'ночью, в свете неона' }, snow: { label: 'Снег', text: 'под падающим снегом, в мягком зимнем свете' }, sunset: { label: 'Закат', text: 'на золотом закате, в тёплом низком свете' } },
  preview: { scene: 'Сцена', sceneNone: 'Ваши фото как есть' },
  research: { productNoLink: 'Добавьте ссылку на товар, чтобы подтянуть его детали.', noteProduct: 'Читаем страницу вашего товара…', factsTitle: 'Со страницы вашего товара — проверьте' },
  plan: { finalLook: 'Финальный кадр', sceneRow: '{scene}: кто-то наслаждается им' },
  errors: { scene_claims: 'Уберите из сцены рекламные утверждения (например, «органический» или «отмеченный наградами») и опишите только место, свет или погоду.', scene_testimonial: 'Сцена описывает место, а не отзыв: уберите фразы вроде «я попробовала», «обожаю» или «до и после».', bad_scene: 'Не удалось прочитать текст сцены. Напишите его заново в нескольких словах.', bad_kind: 'Выберите, о товаре эта реклама или о месте.' },
}

const UK: AdsV2SceneCopy = {
  kindLabel: 'Ця реклама про',
  kindProduct: 'Товар',
  kindPlace: 'Місце',
  product: { title: 'Що ви продаєте?', question: 'Назва товару і чим він особливий', placeholder: 'Напр.: Парфум Amber 50 мл, теплий квітковий аромат', hint: 'Напишіть так, як має бути в рекламі. Факти беруться лише з вашого тексту й посилання на ваш товар, ніколи — з інших брендів.' },
  place: { title: 'Що ви хочете продати чи показати?', question: 'Кількома словами: що ви хочете продати чи показати?', placeholder: 'Напр.: Приміщення на продаж у будівлі Aurora, район Жардін, Сан-Паулу', hint: 'Ми шукаємо відкриті факти про місце (кожен із джерелом), і ви перевіряєте їх до будь-якого списання.' },
  scene: { label: 'Де з’являється ваш товар? (необов’язково)', placeholder: 'Напр.: у готельному номері дощової ночі', hint: 'Використовується в нових сценах ШІ. Опишіть місце, світло чи погоду — ШІ відтворює товар за вашим фото, тож дрібні деталі можуть відрізнятися.', standard: 'Сцени створюються на рівнях Commercial і Premium.', tryLabel: 'Спробуйте:', fromText: '(з вашого тексту)', moveNote: 'Ми читаємо «{scene}» як сцену, а не як назву товару.', move: 'Перенести в поле сцени' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Дощ', text: 'дощової ночі, з мокрими відблисками' }, neon: { label: 'Неон', text: 'вночі, у світлі неону' }, snow: { label: 'Сніг', text: 'під снігопадом, у м’якому зимовому світлі' }, sunset: { label: 'Захід сонця', text: 'на золотому заході сонця, у теплому низькому світлі' } },
  preview: { scene: 'Сцена', sceneNone: 'Ваші фото як є' },
  research: { productNoLink: 'Додайте посилання на товар, щоб підтягнути його деталі.', noteProduct: 'Читаємо сторінку вашого товару…', factsTitle: 'Зі сторінки вашого товару — перевірте' },
  plan: { finalLook: 'Фінальний кадр', sceneRow: '{scene}: хтось насолоджується ним' },
  errors: { scene_claims: 'Приберіть зі сцени рекламні твердження (як-от «органічний» чи «нагороджений») і опишіть лише місце, світло або погоду.', scene_testimonial: 'Сцена описує місце, а не відгук: приберіть фрази на кшталт «я спробувала», «обожнюю» чи «до і після».', bad_scene: 'Не вдалося прочитати текст сцени. Напишіть його знову кількома словами.', bad_kind: 'Виберіть, про товар ця реклама чи про місце.' },
}

const AR: AdsV2SceneCopy = {
  kindLabel: 'هذا الإعلان عن',
  kindProduct: 'منتج',
  kindPlace: 'مكان',
  product: { title: 'ماذا تبيع؟', question: 'اسم المنتج وما يميّزه', placeholder: 'مثال: عطر عنبر 50 مل، رائحة زهرية دافئة', hint: 'اكتبه كما يجب أن يظهر في الإعلان. المعلومات تأتي فقط من نصك ورابط منتجك، وليس من علامات تجارية أخرى.' },
  place: { title: 'ماذا تريد أن تبيع أو تعرض؟', question: 'في كلمات قليلة، ماذا تريد أن تبيع أو تعرض؟', placeholder: 'مثال: محل للبيع في مبنى أورورا، حي جارديم، ساو باولو', hint: 'نبحث عن معلومات عامة عن المكان (كل منها بمصدره) وتراجعها قبل أي خصم.' },
  scene: { label: 'أين يظهر منتجك؟ (اختياري)', placeholder: 'مثال: في غرفة فندق في ليلة ممطرة', hint: 'يُستخدم في المشاهد الجديدة المصنوعة بالذكاء الاصطناعي. صف المكان أو الضوء أو الطقس. يعيد الذكاء الاصطناعي رسم منتجك انطلاقًا من صورتك، وقد تتغير بعض التفاصيل الصغيرة.', standard: 'تُنشأ المشاهد في مستويي Commercial وPremium.', tryLabel: 'جرّب:', fromText: '(من نصك)', moveNote: 'نقرأ «{scene}» على أنه المشهد، لا اسم المنتج.', move: 'انقله إلى خانة المشهد' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'مطر', text: 'في ليلة ممطرة مع انعكاسات مبللة' }, neon: { label: 'نيون', text: 'ليلًا تحت أضواء النيون' }, snow: { label: 'ثلج', text: 'تحت ثلج يتساقط وضوء شتوي ناعم' }, sunset: { label: 'غروب', text: 'عند غروب ذهبي بضوء دافئ منخفض' } },
  preview: { scene: 'المشهد', sceneNone: 'صورك كما هي' },
  research: { productNoLink: 'أضف رابط منتجك لجلب تفاصيله.', noteProduct: 'نقرأ صفحة منتجك…', factsTitle: 'من صفحة منتجك — راجعه' },
  plan: { finalLook: 'اللقطة الأخيرة', sceneRow: '{scene}: شخص يستمتع به' },
  errors: { scene_claims: 'احذف الادعاءات من المشهد (مثل «عضوي» أو «حائز على جوائز») وصف المكان أو الضوء أو الطقس فقط.', scene_testimonial: 'المشهد يصف مكانًا لا مراجعة: احذف عبارات مثل «جرّبته» أو «أحببته» أو «قبل وبعد».', bad_scene: 'تعذّرت قراءة نص المشهد. اكتبه من جديد في كلمات قليلة.', bad_kind: 'اختر إن كان الإعلان عن منتج أم عن مكان.' },
}

const UR: AdsV2SceneCopy = {
  kindLabel: 'یہ اشتہار کس بارے میں ہے',
  kindProduct: 'پروڈکٹ',
  kindPlace: 'جگہ',
  product: { title: 'آپ کیا بیچ رہے ہیں؟', question: 'پروڈکٹ کا نام اور اس کی خاص بات', placeholder: 'مثلاً: امبر پرفیوم 50 ملی لیٹر، گرم پھولوں والی خوشبو', hint: 'اسے ویسے لکھیں جیسے اشتہار میں آنا چاہیے۔ معلومات صرف آپ کے متن اور آپ کے پروڈکٹ لنک سے آتی ہیں، کبھی دوسرے برانڈز سے نہیں۔' },
  place: { title: 'آپ کیا بیچنا یا دکھانا چاہتے ہیں؟', question: 'چند الفاظ میں، آپ کیا بیچنا یا دکھانا چاہتے ہیں؟', placeholder: 'مثلاً: اورورا بلڈنگ میں دکان برائے فروخت، جارڈم محلہ، ساؤ پاؤلو', hint: 'ہم جگہ کے بارے میں عوامی معلومات (ہر ایک اپنے ماخذ کے ساتھ) ڈھونڈتے ہیں اور آپ کسی بھی چارج سے پہلے انہیں چیک کرتے ہیں۔' },
  scene: { label: 'آپ کا پروڈکٹ کہاں نظر آئے؟ (اختیاری)', placeholder: 'مثلاً: بارش والی رات میں ہوٹل کے کمرے میں', hint: 'یہ AI کے نئے مناظر میں استعمال ہوتا ہے۔ جگہ، روشنی یا موسم بیان کریں — AI آپ کی تصویر سے پروڈکٹ کو دوبارہ بناتا ہے، اس لیے چھوٹی تفصیلات بدل سکتی ہیں۔', standard: 'مناظر Commercial اور Premium لیولز پر بنتے ہیں۔', tryLabel: 'آزمائیں:', fromText: '(آپ کے متن سے)', moveNote: 'ہم “{scene}” کو منظر سمجھ رہے ہیں، پروڈکٹ کا نام نہیں۔', move: 'منظر والے خانے میں لے جائیں' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'بارش', text: 'بارش والی رات میں، گیلے عکس کے ساتھ' }, neon: { label: 'نیون', text: 'رات کو نیون روشنیوں کے نیچے' }, snow: { label: 'برف', text: 'گرتی برف میں، سردیوں کی نرم روشنی' }, sunset: { label: 'غروب', text: 'سنہری غروبِ آفتاب میں، گرم مدھم روشنی' } },
  preview: { scene: 'منظر', sceneNone: 'آپ کی تصاویر جیسی ہیں' },
  research: { productNoLink: 'تفصیلات لانے کے لیے اپنے پروڈکٹ کا لنک شامل کریں۔', noteProduct: 'آپ کے پروڈکٹ کا صفحہ پڑھ رہے ہیں…', factsTitle: 'آپ کے پروڈکٹ صفحے سے — چیک کریں' },
  plan: { finalLook: 'آخری جھلک', sceneRow: '{scene}: کوئی اس سے لطف اٹھا رہا ہے' },
  errors: { scene_claims: 'منظر سے دعوے (جیسے “آرگینک” یا “ایوارڈ یافتہ”) ہٹا دیں اور صرف جگہ، روشنی یا موسم بیان کریں۔', scene_testimonial: 'منظر جگہ بیان کرتا ہے، ریویو نہیں: “میں نے آزمایا”، “مجھے بہت پسند ہے” یا “پہلے اور بعد” جیسے جملے ہٹا دیں۔', bad_scene: 'منظر کا متن پڑھا نہیں جا سکا۔ چند الفاظ میں دوبارہ لکھیں۔', bad_kind: 'منتخب کریں کہ اشتہار پروڈکٹ کے بارے میں ہے یا جگہ کے بارے میں۔' },
}

const HI: AdsV2SceneCopy = {
  kindLabel: 'यह विज्ञापन किस बारे में है',
  kindProduct: 'प्रोडक्ट',
  kindPlace: 'जगह',
  product: { title: 'आप क्या बेच रहे हैं?', question: 'प्रोडक्ट का नाम और उसकी खासियत', placeholder: 'जैसे: एम्बर परफ्यूम 50ml, गर्म फूलों वाली खुशबू', hint: 'इसे वैसे लिखें जैसे विज्ञापन में दिखना चाहिए। जानकारी सिर्फ़ आपके टेक्स्ट और आपके प्रोडक्ट लिंक से आती है, कभी दूसरे ब्रांड से नहीं।' },
  place: { title: 'आप क्या बेचना या दिखाना चाहते हैं?', question: 'कुछ शब्दों में, आप क्या बेचना या दिखाना चाहते हैं?', placeholder: 'जैसे: ऑरोरा बिल्डिंग में बिक्री के लिए दुकान, जार्डिम इलाका, साओ पाउलो', hint: 'हम जगह के बारे में सार्वजनिक जानकारी (हर एक अपने स्रोत के साथ) खोजते हैं और कोई भी शुल्क लगने से पहले आप उसे जाँचते हैं।' },
  scene: { label: 'आपका प्रोडक्ट कहाँ दिखे? (वैकल्पिक)', placeholder: 'जैसे: बारिश वाली रात में होटल के कमरे में', hint: 'यह AI के नए दृश्यों में इस्तेमाल होता है। जगह, रोशनी या मौसम बताइए — AI आपकी फ़ोटो से प्रोडक्ट को दोबारा बनाता है, इसलिए छोटी-मोटी बारीकियाँ बदल सकती हैं।', standard: 'दृश्य Commercial और Premium लेवल पर बनते हैं।', tryLabel: 'आज़माएँ:', fromText: '(आपके टेक्स्ट से)', moveNote: 'हम “{scene}” को दृश्य मान रहे हैं, प्रोडक्ट का नाम नहीं।', move: 'इसे दृश्य वाले खाने में ले जाएँ' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'बारिश', text: 'बारिश वाली रात में, गीले प्रतिबिंबों के साथ' }, neon: { label: 'नियॉन', text: 'रात में, नियॉन रोशनी के नीचे' }, snow: { label: 'बर्फ़', text: 'गिरती बर्फ़ में, सर्दियों की नरम रोशनी' }, sunset: { label: 'सूर्यास्त', text: 'सुनहरे सूर्यास्त में, गर्म और नीची रोशनी' } },
  preview: { scene: 'दृश्य', sceneNone: 'आपकी फ़ोटो जैसी हैं' },
  research: { productNoLink: 'विवरण लाने के लिए अपने प्रोडक्ट का लिंक जोड़ें।', noteProduct: 'आपके प्रोडक्ट का पेज पढ़ रहे हैं…', factsTitle: 'आपके प्रोडक्ट पेज से — जाँच लें' },
  plan: { finalLook: 'आख़िरी झलक', sceneRow: '{scene}: कोई इसका आनंद ले रहा है' },
  errors: { scene_claims: 'दृश्य से दावे (जैसे “ऑर्गेनिक” या “अवॉर्ड विजेता”) हटाएँ और सिर्फ़ जगह, रोशनी या मौसम बताएँ।', scene_testimonial: 'दृश्य एक जगह बताता है, रिव्यू नहीं: “मैंने आज़माया”, “मुझे बहुत पसंद है” या “पहले और बाद” जैसे वाक्य हटाएँ।', bad_scene: 'दृश्य का टेक्स्ट पढ़ा नहीं जा सका। कुछ शब्दों में दोबारा लिखें।', bad_kind: 'चुनें कि विज्ञापन किसी प्रोडक्ट के बारे में है या किसी जगह के बारे में।' },
}

const ID: AdsV2SceneCopy = {
  kindLabel: 'Iklan ini tentang',
  kindProduct: 'Produk',
  kindPlace: 'Tempat',
  product: { title: 'Apa yang Anda jual?', question: 'Nama produk dan apa yang membuatnya istimewa', placeholder: 'Mis.: Parfum Amber 50ml, aroma bunga yang hangat', hint: 'Tulis seperti yang harus muncul di iklan. Fakta hanya diambil dari teks Anda dan tautan produk Anda, tidak pernah dari merek lain.' },
  place: { title: 'Apa yang ingin Anda jual atau tunjukkan?', question: 'Dalam beberapa kata, apa yang ingin Anda jual atau tunjukkan?', placeholder: 'Mis.: Toko dijual di Gedung Aurora, kawasan Jardim, São Paulo', hint: 'Kami mencari fakta publik tentang tempat itu (masing-masing dengan sumbernya) dan Anda memeriksanya sebelum ada biaya.' },
  scene: { label: 'Di mana produk Anda muncul? (opsional)', placeholder: 'Mis.: di kamar hotel pada malam hujan', hint: 'Dipakai di adegan AI yang baru. Jelaskan tempat, cahaya, atau cuacanya — AI membuat ulang produk Anda dari foto, jadi detail kecil bisa berubah.', standard: 'Adegan dibuat di level Commercial dan Premium.', tryLabel: 'Coba:', fromText: '(dari teks Anda)', moveNote: 'Kami membaca “{scene}” sebagai adegan, bukan nama produk.', move: 'Pindahkan ke kolom adegan' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Hujan', text: 'di malam hujan, dengan pantulan basah' }, neon: { label: 'Neon', text: 'di malam hari di bawah lampu neon' }, snow: { label: 'Salju', text: 'di tengah salju turun, cahaya musim dingin yang lembut' }, sunset: { label: 'Senja', text: 'saat matahari terbenam keemasan, cahaya hangat dan rendah' } },
  preview: { scene: 'Adegan', sceneNone: 'Foto Anda apa adanya' },
  research: { productNoLink: 'Tambahkan tautan produk Anda untuk mengambil detailnya.', noteProduct: 'Membaca halaman produk Anda…', factsTitle: 'Dari halaman produk Anda — periksa' },
  plan: { finalLook: 'Tampilan akhir', sceneRow: '{scene}: seseorang menikmatinya' },
  errors: { scene_claims: 'Hapus klaim dari adegan (seperti “organik” atau “pemenang penghargaan”) dan jelaskan hanya tempat, cahaya, atau cuacanya.', scene_testimonial: 'Adegan menggambarkan tempat, bukan ulasan: hapus kalimat seperti “saya sudah coba”, “saya suka banget”, atau “sebelum dan sesudah”.', bad_scene: 'Teks adegan tidak bisa dibaca. Tulis lagi dalam beberapa kata.', bad_kind: 'Pilih apakah iklan ini tentang produk atau tempat.' },
}

const VI: AdsV2SceneCopy = {
  kindLabel: 'Quảng cáo này về',
  kindProduct: 'Sản phẩm',
  kindPlace: 'Địa điểm',
  product: { title: 'Bạn đang bán gì?', question: 'Tên sản phẩm và điểm đặc biệt của nó', placeholder: 'VD: Nước hoa Amber 50ml, hương hoa ấm áp', hint: 'Viết đúng như cần xuất hiện trong quảng cáo. Thông tin chỉ lấy từ chữ của bạn và đường link sản phẩm của bạn, không bao giờ từ thương hiệu khác.' },
  place: { title: 'Bạn muốn bán hoặc giới thiệu gì?', question: 'Trong vài từ, bạn muốn bán hoặc giới thiệu gì?', placeholder: 'VD: Cửa hàng cần bán tại Tòa nhà Aurora, khu Jardim, São Paulo', hint: 'Chúng tôi tìm thông tin công khai về địa điểm (mỗi thông tin kèm nguồn) và bạn kiểm tra trước khi bị tính phí.' },
  scene: { label: 'Sản phẩm của bạn xuất hiện ở đâu? (không bắt buộc)', placeholder: 'VD: trong phòng khách sạn vào một đêm mưa', hint: 'Dùng cho các cảnh AI mới. Hãy mô tả địa điểm, ánh sáng hoặc thời tiết — AI tái tạo sản phẩm từ ảnh của bạn, nên một vài chi tiết nhỏ có thể thay đổi.', standard: 'Cảnh được tạo ở mức Commercial và Premium.', tryLabel: 'Thử:', fromText: '(từ chữ của bạn)', moveNote: 'Chúng tôi hiểu “{scene}” là bối cảnh, không phải tên sản phẩm.', move: 'Chuyển sang ô bối cảnh' }, // KINEO-ADS-CONSERTOS-1410 — a IA recria o produto; promessa de "exatamente como na foto" removida
  presets: { rain: { label: 'Mưa', text: 'trong đêm mưa, với ánh phản chiếu ướt' }, neon: { label: 'Neon', text: 'về đêm dưới ánh đèn neon' }, snow: { label: 'Tuyết', text: 'giữa tuyết rơi, ánh sáng mùa đông dịu nhẹ' }, sunset: { label: 'Hoàng hôn', text: 'lúc hoàng hôn vàng, ánh sáng ấm và thấp' } },
  preview: { scene: 'Bối cảnh', sceneNone: 'Ảnh của bạn giữ nguyên' },
  research: { productNoLink: 'Thêm đường link sản phẩm để lấy thông tin chi tiết.', noteProduct: 'Đang đọc trang sản phẩm của bạn…', factsTitle: 'Từ trang sản phẩm của bạn — hãy kiểm tra' },
  plan: { finalLook: 'Cảnh kết', sceneRow: '{scene}: ai đó đang tận hưởng nó' },
  errors: { scene_claims: 'Bỏ các lời quảng cáo khỏi bối cảnh (như “hữu cơ” hay “đoạt giải”) và chỉ mô tả địa điểm, ánh sáng hoặc thời tiết.', scene_testimonial: 'Bối cảnh mô tả một nơi, không phải lời nhận xét: hãy bỏ những câu như “tôi đã dùng thử”, “tôi rất thích” hay “trước và sau”.', bad_scene: 'Không đọc được nội dung bối cảnh. Hãy viết lại trong vài từ.', bad_kind: 'Chọn quảng cáo này về sản phẩm hay địa điểm.' },
}

export const ADS_V2_SCENE_COPY: Record<InterfaceLanguage, AdsV2SceneCopy> = {
  en: EN, pt: PT, es: ES, fr: FR, de: DE, it: IT, nl: NL, pl: PL, tr: TR, ru: RU, uk: UK, ar: AR, ur: UR, hi: HI, id: ID, vi: VI,
}

/** As frases da cena na língua da interface (língua desconhecida = inglês). */
export function adsV2SceneCopy(language: InterfaceLanguage | string | null | undefined): AdsV2SceneCopy {
  return (typeof language === 'string' && (ADS_V2_SCENE_COPY as Record<string, AdsV2SceneCopy>)[language]) || ADS_V2_SCENE_COPY.en
}

/** Erro do rascunho ligado à cena, na língua da tela; null = não é da cena (quem chama usa o erro de sempre). */
export function adsV2SceneErrorText(code: string | null | undefined, language: InterfaceLanguage | string | null | undefined): string | null {
  const c = String(code ?? '')
  const e = adsV2SceneCopy(language).errors as Record<string, string>
  return Object.hasOwn(e, c) ? e[c] : null
}

/** A linha da cena criada no plano mostrado antes de pagar: "{Cena}, someone enjoying it" (1ª letra maiúscula). */
export function adsV2SceneRow(copy: AdsV2SceneCopy, scene: string): string {
  return copy.plan.sceneRow.split('{scene}').join(capFirst(String(scene ?? '').trim()))
}
