// KINEO-ADS-REFACAO-ATOR-1410 — "pessoa de IA SEGURANDO e MOSTRANDO o produto" (o formato UGC que mais vende no mercado).
//
// O QUE JÁ EXISTIA (lib/ads/v2Presenter.ts): o ator FALA. A foto dele sai do Nano Banana Pro edit com a foto do produto como
// única referência e a DESCRIÇÃO do apresentador em texto; o Kling AI Avatar anima a boca no ritmo da voz. O produto fica na
// mão, parado — o avatar só mexe a boca, a cabeça e os ombros. Ninguém MOSTRA o produto para a câmera.
//
// O QUE ISTO ACRESCENTA: UM plano de "demonstração" — o apresentador ESCOLHIDO segura o produto do cliente e o levanta para a
// câmera, virando de leve para o rótulo pegar a luz (o "B-roll de criador" por cima da fala). Sai pelo caminho de CENA CRIADA
// que o anúncio já tem (nenhum fornecedor, endpoint ou motor novo):
//   1. still: fal-ai/nano-banana-pro/edit com DUAS referências — o retrato do apresentador na biblioteca
//      (public/ads/presenters/<id>.webp, servido em https://www.usekineo.com) e a foto do PRODUTO do cliente. O schema
//      público da fal (OpenAPI de fal-ai/nano-banana-pro/edit, lido em 14/10) aceita image_urls como lista sem máximo
//      fixo; o exemplo oficial manda 2 imagens. buildSceneImageInput (lib/ads/v2Engines.ts) já monta isso.
//   2. vídeo: o Kling O3 image-to-video de sempre (routeShot('people', nível)), 3 s, com o movimento de demonstração abaixo.
// Na montagem COM o ator falando, o plano entra como um dos inserts por cima da fala (adsV2PresenterInsertOrder, logo depois
// do plano do estilo); se o ator desistir, o anúncio de sempre sai com ele no lugar da cena que cedeu a vaga.
//
// CRÉDITOS IGUAIS — TROCA, não soma (como o packshot): adsV2Credits depende só do nível e da duração. A vaga:
//   · Comercial/Premium: a 1ª CENA CRIADA (Nano Banana + Kling O3 = o MESMO custo de fal; e com o ator ligado essas cenas
//     nem entravam na montagem — gente de IA ao lado do ator confunde —, agora uma delas vira o próprio ator mostrando o
//     produto);
//   · Foto em movimento (sem cena criada): o 1º plano DEPOIS do gancho que é animação de IA de UMA foto do cliente (pessoas,
//     lugar ou produto), sem estilo nem packshot. Custo de fal: + 1 still do Nano Banana (~US$ 0,15); créditos iguais.
//   Nenhuma vaga = o plano de antes, objeto por objeto.
//
// SÓ COM APRESENTADOR ESCOLHIDO (presenterId da biblioteca, com retrato): o sorteio de sempre não tem retrato para referência.
// RÓTULO: o plano é uma pessoa de IA — a tela diz "Pessoa de IA" (16 línguas) ao lado do estado; nunca depoimento, nunca
// "cliente". O aviso de IA da entrega (lib/ads/v2AiLabel.ts) continua.
//
// INTERRUPTOR: ADS_V2_PRESENTER_HOLDS = false (regra da casa "efeito só entra testado"). O fundador liga depois de ver um
// render real. Desligado = o /plan nunca troca vaga nenhuma (o anúncio de antes, byte a byte).
//
// LIB PURA (nenhum import de valor): o guardião scripts/test-ads-refacao-ator-1410.mjs carrega este arquivo cru.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** Interruptor ÚNICO do plano "pessoa de IA segurando o produto". false = desligado (o plano de antes). */
export const ADS_V2_PRESENTER_HOLDS = false

/** Onde os retratos públicos da biblioteca são servidos (espelho de BRAND_URL, lib/brandIdentity.ts). */
export const ADS_V2_PRESENTER_HOLDS_ORIGIN = 'https://www.usekineo.com'

/** Espelho de ADS_V2_KEEP_PHRASE (lib/ads/v2ShotLists.ts): todo prompt de movimento termina nela. */
export const ADS_V2_PRESENTER_HOLDS_KEEP = 'Keep everything exactly as in the photo.'

/** O movimento de demonstração (Kling O3, 3 s): levantar o produto para a câmera e virar de leve; boca fechada. */
export const ADS_V2_PRESENTER_HOLDS_MOTION =
  'Handheld smartphone selfie framing; the person lifts the product a little toward the camera and turns it slightly so the label catches the light, then smiles with the mouth closed; the product keeps exactly its shape, colors and label; no other hands or objects enter the frame. ' +
  ADS_V2_PRESENTER_HOLDS_KEEP

/** Tipos de plano de foto do cliente que podem ceder a vaga (como o packshot): animação de IA de UMA foto, sem estilo. */
export const ADS_V2_PRESENTER_HOLDS_YIELD_KINDS: readonly string[] = ['people', 'place', 'product']

/** Fundo neutro por setor (o mesmo texto do ator, lib/ads/v2Presenter.ts SETTING; o guardião confere). */
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

/** O que o plano precisa do apresentador escolhido (a entrada da biblioteca, lib/ads/v2Presenter.ts). */
export interface AdsV2HoldsPresenter {
  id: string
  look: string
  pronoun: 'She' | 'He'
  portrait: string | null
}

/** O que o plano precisa do ator do pedido (AdsV2PresenterPlan). */
export interface AdsV2HoldsActor {
  productFootageId: string
  productUrl: string
  presenterId?: string
}

/** O plano como o /plan o monta (subconjunto de AdsV2PlannedShot). */
export interface AdsV2HoldsShot {
  idx: number
  kind: string
  source: string
  sourceFootageId: string | null
  imageUrl: string | null
  referenceFootageIds: string[]
  referenceUrls: string[]
  scenePrompt: string | null
  prompt: string | null
  movementVariant: number
  cutStart: number
  cutSeconds: number
  effect?: unknown
  packshot?: unknown
  presenterHolds?: true
}

/** URL https do retrato do apresentador (null = sem retrato, caminho fora da pasta pública dos apresentadores). */
export function adsV2PresenterHoldsPortraitUrl(entry: Pick<AdsV2HoldsPresenter, 'portrait'> | null | undefined): string | null {
  const p = entry?.portrait
  if (typeof p !== 'string' || !/^\/ads\/presenters\/[a-z]+\.webp$/.test(p)) return null
  return `${ADS_V2_PRESENTER_HOLDS_ORIGIN}${p}`
}

/**
 * O pedido do still (Nano Banana Pro edit): 1ª referência = o retrato do apresentador, 2ª = a foto do produto. Texto fixo
 * nosso (nada do cliente), como o prompt do ator — por isso não passa pela régua anti-invenção do /plan.
 */
export function adsV2PresenterHoldsScenePrompt(entry: Pick<AdsV2HoldsPresenter, 'look' | 'pronoun'>, sector: string | null | undefined): string {
  const where = SETTING[typeof sector === 'string' ? sector : 'other'] ?? SETTING.other
  const their = entry.pronoun === 'He' ? 'his' : 'her'
  return [
    `Photorealistic vertical 9:16 smartphone video frame, UGC style: the person from the FIRST reference photo, ${entry.look}, holds the product from the SECOND reference photo in one hand and shows it to the camera at chest height, label facing the camera, clearly visible.`,
    `Keep the person EXACTLY as in the first reference photo: same face, hair, skin tone, age and clothes. ${entry.pronoun} looks into the camera with a friendly, natural expression, mouth closed.`,
    'Keep the product EXACTLY as in the second reference photo: same shape, colors, label, text and proportions. Do not redesign, rename, resize or add anything to the product.',
    `Head, shoulders and ${their} hand with the product in frame, natural window light, real skin texture, every hand has five natural fingers.`,
    `Background: ${where}, softly out of focus.`,
    'No text, no captions, no logos or watermarks added, no other products, only one person.',
  ].join(' ')
}

/** A vaga (pura): a 1ª cena criada; senão o 1º plano de foto do cliente DEPOIS do gancho que pode ceder; senão null. */
export function adsV2PresenterHoldsTarget(shots: readonly AdsV2HoldsShot[]): number | null {
  if (!Array.isArray(shots) || shots.length < 2) return null
  const scene = shots.find((s) => s.source === 'generated_scene' && !s.effect && !s.packshot && !s.presenterHolds)
  if (scene) return scene.idx
  const photo = shots.slice(1).find((s) => s.source === 'client_photo' && ADS_V2_PRESENTER_HOLDS_YIELD_KINDS.includes(s.kind) && !s.effect && !s.packshot)
  return photo ? photo.idx : null
}

/**
 * Troca UMA vaga pelo plano "pessoa de IA segurando o produto" (pura; devolve outro array, nunca muta). Desligado, sem ator,
 * sem apresentador ESCOLHIDO, sem retrato ou sem vaga = o MESMO array (o plano de antes, objeto por objeto).
 */
export function adsV2PresenterHoldsShots<S extends AdsV2HoldsShot>(
  shots: S[],
  opts: { on: boolean; actor: AdsV2HoldsActor | null | undefined; entry: AdsV2HoldsPresenter | null | undefined; sector: string | null | undefined },
): S[] {
  if (opts?.on !== true) return shots
  const actor = opts.actor
  const entry = opts.entry
  if (!actor || !entry || actor.presenterId !== entry.id) return shots
  if (typeof actor.productUrl !== 'string' || !/^https:\/\//i.test(actor.productUrl)) return shots
  const portrait = adsV2PresenterHoldsPortraitUrl(entry)
  if (!portrait) return shots
  const at = adsV2PresenterHoldsTarget(shots)
  if (at === null) return shots
  return shots.map((s) => s.idx !== at ? s : {
    ...s,
    kind: 'people',
    source: 'generated_scene',
    sourceFootageId: null,
    imageUrl: null,
    referenceFootageIds: [actor.productFootageId],
    referenceUrls: [portrait, actor.productUrl],
    scenePrompt: adsV2PresenterHoldsScenePrompt(entry, opts.sector),
    prompt: ADS_V2_PRESENTER_HOLDS_MOTION,
    movementVariant: 0,
    cutStart: adsV2PresenterHoldsCutStart(s.cutSeconds),
    presenterHolds: true as const,
  })
}

/**
 * Início do trecho no clipe de 3 s do Kling O3 — a MESMA conta de adsV2CutStart(cut, 'people') (lib/ads/v2ShotLists.ts;
 * o guardião compara): pula o quadro parado, cabendo com o dissolve (0,25) e a margem (0,1), teto 0,65.
 */
export function adsV2PresenterHoldsCutStart(cut: number): number {
  const room = 3 - cut - 0.25 - 0.1
  return Math.round(Math.max(0, Math.min(0.65, room)) * 1000) / 1000
}

/** O plano gravado tem a "pessoa de IA segurando o produto" neste índice? (pura; montagem e tela). */
export function adsV2IsPresenterHolds(plan: { shots?: readonly { idx: number; presenterHolds?: unknown }[] } | null | undefined, idx: number): boolean {
  return !!plan && Array.isArray(plan.shots) && plan.shots.some((s) => s && s.idx === idx && s.presenterHolds === true)
}

// ─── o rótulo da grade (16 línguas): o plano é uma pessoa de IA, e a tela diz isso ────────────────────────────────────
export const ADS_V2_AI_PERSON_LABEL: Record<InterfaceLanguage, string> = {
  en: 'AI person',
  pt: 'Pessoa de IA',
  es: 'Persona de IA',
  fr: 'Personne IA',
  de: 'KI-Person',
  it: 'Persona IA',
  nl: 'AI-persoon',
  pl: 'Osoba AI',
  tr: 'Yapay zekâ kişisi',
  ru: 'ИИ-человек',
  uk: 'ШІ-людина',
  ar: 'شخص بالذكاء الاصطناعي',
  ur: 'AI شخص',
  hi: 'AI व्यक्ति',
  id: 'Orang AI',
  vi: 'Người AI',
}

/** O rótulo na língua da tela (língua desconhecida = inglês). */
export function adsV2AiPersonLabel(language: InterfaceLanguage | string | null | undefined): string {
  return (typeof language === 'string' && (ADS_V2_AI_PERSON_LABEL as Record<string, string>)[language]) || ADS_V2_AI_PERSON_LABEL.en
}
