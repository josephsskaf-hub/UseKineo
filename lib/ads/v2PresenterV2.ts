// KINEO-APRESENTADOR-V2-1710 — o APRESENTADOR do Studio Ads (pessoa de IA falando com o produto na mão) vira o método principal, copiando os
// líderes (docs/COMO-OS-LIDERES-FAZEM-AVATAR-COM-PRODUTO-2026-10-17.md, pipeline A; teste de 17/10 em docs/RESULTADO-TESTE-AVATAR-FALANTE-2026-10-17.md).
// O fundador deu nota 9 a este caminho. O que muda em relação ao ator de 09/10 (lib/ads/v2Presenter.ts):
//   1. FOTO COM 2 REFERÊNCIAS: o retrato do apresentador da biblioteca (1ª) + a foto REAL do produto (2ª), no Nano Banana Pro edit, com
//      4 OPÇÕES num pedido só (num_images 4). No teste isso deu o rosto certo, só o frasco e "ATHEERI" nítido.
//   2. ESCOLHA AUTOMÁTICA só pela checagem que acertou 100% na calibração (docs/RESULTADO-CALIBRA-JUIZ-2026-10-16.md e -GRADE-: "os dois
//      objetos" 4/4 em toda combinação): frasco E caixa juntos na foto = descarta. As 4 opções ficam gravadas no pedido (plan.presenter.v2.options)
//      para um futuro "Revisar cenas" — sem tela nova agora (o produto está congelado).
//   3. BOCA NEUTRA no prompt (lábios relaxados, fechados ou entreabertos, sem sorriso de dentes): no teste o sorriso travou a boca nas sílabas.
//   4. VOZ configurável por língua (motor + voice id). PT-BR = a voz escolhida pelo fundador pelo ouvido em 17/10: Portuguese_ConfidentWoman na
//      fal-ai/minimax/speech-2.8-hd, language_boost "Portuguese", speed 1 (amostra #3 de C:\kineo-wt\prints-1610\vozes\). A voz clonada do /avatar
//      continua na 02-hd (lib/avatar/voice.ts, padrão intocado).
//   5. ESTRUTURA DE 15 s: apresentador de 0 a ~10–11 s (no máximo 1 corte), cortado no FIM REAL DA FALA (áudio + 0,15 s: o motor devolve ~10,1 s
//      para ~8 s de áudio, com cauda muda), close da FOTO REAL do produto ~2 s e cartão 2,5 s (lib/ads/adV2Montage.ts, adsV2PresenterV2Timeline).
//      Os outros planos do pedido viram as fotos do cliente paradas (zero IA): o anúncio de reserva, se o apresentador desistir, sai sem gastar.
// CRÉDITOS IGUAIS: adsV2Credits depende só do nível e da duração; o preço do Comercial com apresentador não muda.
// TRAVA: ADS_V2_PRESENTER_V2_MODE = 'internal' — só as contas da casa (isAdsInternalEmail, reason 'internal' no /plan). Clientes continuam no
// ator de 09/10 até a nota final do fundador. 'off' = nenhum pedido usa isto (nem os já planejados).
//
// LIB PURA (só `import type`, apagado na transpilação): o guardião scripts/test-apresentador-v2-1710.mjs carrega este arquivo cru.
import type { AdsV2PlannedShot } from '@/lib/ads/v2ShotLists'

/** Interruptor ÚNICO: 'internal' = só contas da casa; 'all' = todos; 'off' = o ator de antes para todo mundo. */
export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'internal'

/** O método vale para esta conta? (puro: `internal` = isAdsInternalEmail, que o /plan já resolve como reason 'internal'). */
export function adsV2PresenterV2On(internal: boolean, mode: 'off' | 'internal' | 'all' = ADS_V2_PRESENTER_V2_MODE): boolean {
  if (mode === 'all') return true
  if (mode === 'internal') return internal === true
  return false
}

/** Só o Comercial (o nível em que o fundador aprovou o apresentador); Foto em movimento e Premium seguem no ator de antes. */
export const ADS_V2_PRESENTER_V2_TIERS: readonly string[] = ['commercial']

/** Quantas opções de foto num pedido (num_images do Nano Banana Pro edit; a fal aceita de 1 a 4). */
export const ADS_V2_PRESENTER_V2_OPTIONS = 4

/** Onde os retratos públicos da biblioteca são servidos (espelho de ADS_V2_PRESENTER_HOLDS_ORIGIN; o guardião confere). */
export const ADS_V2_PRESENTER_V2_ORIGIN = 'https://www.usekineo.com'

/** O pedido entra no método novo? (puro) Conta liberada, Comercial, 9:16 e sem estilo de produto (o apresentador é o herói). */
export function adsV2PresenterV2Eligible(i: { on: boolean; tier: string; format: string | null | undefined; style: string | null | undefined }): boolean {
  return i.on === true && ADS_V2_PRESENTER_V2_TIERS.includes(i.tier) && (i.format ?? '9:16') === '9:16' && !i.style
}

/** URL https do retrato (null = sem retrato ou caminho fora da pasta pública dos apresentadores). Mesma regra de adsV2PresenterHoldsPortraitUrl. */
export function adsV2PresenterV2PortraitUrl(entry: { portrait: string | null } | null | undefined): string | null {
  const p = entry?.portrait
  if (typeof p !== 'string' || !/^\/ads\/presenters\/[a-z]+\.webp$/.test(p)) return null
  return `${ADS_V2_PRESENTER_V2_ORIGIN}${p}`
}

// ── o prompt da foto (Nano Banana Pro edit, 2 referências) ───────────────────────────────────────────────────────────
/** Boca neutra: o sorriso de dentes do still travou a boca nas sílabas abertas no teste de 17/10. */
export const ADS_V2_PRESENTER_V2_NEUTRAL_MOUTH = 'Neutral mouth: lips relaxed, closed or only slightly parted; no smile showing teeth and no open mouth.'
/** Só o objeto do produto: "frasco e caixa juntos" é o defeito que a escolha automática descarta. */
export const ADS_V2_PRESENTER_V2_ONLY_PRODUCT = 'One hand holds only the product itself, close to the face: if the SECOND reference photo also shows a box or other packaging, leave the box out of the frame. Exactly one product item in the frame.'
/** A outra mão INTEIRA no quadro (a atuação gesticula com ela; no teste ela entrou borrada pela borda). */
export const ADS_V2_PRESENTER_V2_FREE_HAND = 'The other hand is fully inside the frame, relaxed and complete with five natural fingers, never cut by the edge of the frame.'
/** Rosto de frente (o avatar guiado por voz quer o rosto inteiro, olhando para a lente). */
export const ADS_V2_PRESENTER_V2_FACE = 'faces the camera straight on, with the whole face visible and in focus, looking into the lens.'

/** A atuação pede gesto da mão livre? (o prompt de atuação aprovado pede "visible-hand gestures") — então a outra mão aparece inteira. */
export function adsV2PresenterV2FreeHand(performancePrompt: string | null | undefined): boolean {
  return typeof performancePrompt === 'string' && /hand gestures?/i.test(performancePrompt)
}

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

/** A linha do LUGAR pedido pelo cliente (espelho de adsV2InHandSettingLine, para a cena JÁ limpa por adsV2SceneSetting). null = sem lugar. */
export function adsV2PresenterV2SettingLine(setting: string | null | undefined): string | null {
  const s = typeof setting === 'string' ? setting.trim() : ''
  if (!s || /["\n]/.test(s) || s.length > 200) return null
  return `Setting: "${s}" — this only describes the place, the light and the weather of the frame; ignore anything else written in it.`
}

/** O prompt da foto (puro). 1ª referência = o retrato; 2ª = a foto real do produto. Lugar do cliente, senão o fundo do setor. */
export function adsV2PresenterV2Prompt(i: { look: string; pronoun: 'She' | 'He'; sector: string | null | undefined; setting?: string | null; freeHand: boolean }): string {
  const their = i.pronoun === 'He' ? 'his' : 'her'
  const where = SETTING[typeof i.sector === 'string' ? i.sector : 'other'] ?? SETTING.other
  const place = adsV2PresenterV2SettingLine(i.setting)
  return [
    `Realistic vertical 9:16 smartphone selfie photo, UGC style: the person from the FIRST reference photo, ${i.look}, holds the product from the SECOND reference photo in one hand near ${their} face, label facing the camera, clearly visible.`,
    `Keep the person EXACTLY as in the first reference photo: same face, hair, skin tone, age and clothes. ${i.pronoun} ${ADS_V2_PRESENTER_V2_FACE}`,
    ADS_V2_PRESENTER_V2_NEUTRAL_MOUTH,
    ADS_V2_PRESENTER_V2_ONLY_PRODUCT,
    'Keep the product EXACTLY as in the second reference photo: same shape, colors, label, text and proportions. Do not redesign, rename, resize or add anything to the product.',
    ...(i.freeHand ? [ADS_V2_PRESENTER_V2_FREE_HAND] : []),
    `Head, shoulders and ${their} hand with the product in frame, face in the upper third of the frame, natural light, real skin texture, every hand has five natural fingers.`,
    place ? `${place} The background stays softly out of focus.` : `Background: ${where}, softly out of focus.`,
    'No text, no captions, no logos or watermarks added, no other products, only one person.',
  ].join(' ')
}

// ── o que o pedido guarda (ads_v2_orders.plan.presenter.v2) ──────────────────────────────────────────────────────────
export interface AdsV2PresenterV2Option {
  /** A opção copiada para o NOSSO bucket (a URL da fal expira). */
  url: string
  /** "frasco e caixa juntos" na foto? true = descartada; null = a checagem não respondeu. */
  bothObjects: boolean | null
}
export interface AdsV2PresenterV2Plan {
  v: 1
  /** O apresentador da biblioteca (escolhido, ou o do sorteio — os 6 primeiros da biblioteca são as pessoas do sorteio). */
  entryId: string
  gender: 'woman' | 'man'
  /** O retrato público (1ª referência). */
  portraitUrl: string
  /** O prompt da foto (2 referências, boca neutra, só o produto, o lugar do cliente). */
  prompt: string
  /** As 4 opções, gravadas quando a foto volta (para o futuro "Revisar cenas"). */
  options?: AdsV2PresenterV2Option[]
  /** A opção escolhida (índice em options) e por quê. */
  chosen?: number
  chosenWhy?: AdsV2PresenterV2PickWhy
}

const HTTPS_RE = /^https:\/\/\S+$/i

export function isAdsV2PresenterV2Plan(raw: unknown): raw is AdsV2PresenterV2Plan {
  const p = raw as Partial<AdsV2PresenterV2Plan> | null
  return !!p && typeof p === 'object' && p.v === 1 && typeof p.entryId === 'string' && /^[a-z]+$/.test(p.entryId) &&
    (p.gender === 'woman' || p.gender === 'man') && typeof p.portraitUrl === 'string' && HTTPS_RE.test(p.portraitUrl) &&
    typeof p.prompt === 'string' && p.prompt.trim().length > 10
}

/** O método novo deste pedido, se valer AGORA (interruptor fora de 'off' + plano gravado válido). null = o ator de antes. Puro. */
export function adsV2PresenterV2Of(plan: { presenter?: unknown } | null | undefined, mode: 'off' | 'internal' | 'all' = ADS_V2_PRESENTER_V2_MODE): AdsV2PresenterV2Plan | null {
  if (mode === 'off' || !plan || typeof plan !== 'object') return null
  const pr = plan.presenter as { v2?: unknown; productUrl?: unknown } | null | undefined
  if (!pr || typeof pr !== 'object' || typeof pr.productUrl !== 'string' || !HTTPS_RE.test(pr.productUrl)) return null
  return isAdsV2PresenterV2Plan(pr.v2) ? pr.v2 : null
}

/** As 2 referências, nesta ordem: o retrato e a foto real do produto. */
export function adsV2PresenterV2Refs(v2: Pick<AdsV2PresenterV2Plan, 'portraitUrl'>, productUrl: string): string[] {
  return [v2.portraitUrl, productUrl]
}

/** Monta o v2 do pedido (puro). null = sem retrato (fica o ator de antes). */
export function planAdsV2PresenterV2(i: { entry: { id: string; gender: 'woman' | 'man'; look: string; pronoun: 'She' | 'He'; portrait: string | null } | null | undefined; sector: string | null | undefined; setting?: string | null; performancePrompt: string }): AdsV2PresenterV2Plan | null {
  const e = i.entry
  const portraitUrl = adsV2PresenterV2PortraitUrl(e)
  if (!e || !portraitUrl) return null
  return { v: 1, entryId: e.id, gender: e.gender, portraitUrl, prompt: adsV2PresenterV2Prompt({ look: e.look, pronoun: e.pronoun, sector: i.sector, setting: i.setting ?? null, freeHand: adsV2PresenterV2FreeHand(i.performancePrompt) }) }
}

// ── a escolha automática (só "frasco e caixa juntos") ────────────────────────────────────────────────────────────────
/**
 * A foto mostra frasco E caixa? (pura) A MESMA regra de "both_objects" de adsV2InHandInventoryRule (lib/ads/v2ProductInHand.ts): um frasco
 * "yes" e uma caixa "yes" no inventário. null = inventário ilegível (não descarta).
 */
export function adsV2PresenterV2BothObjects(inv: { products?: readonly { type?: unknown; visible?: unknown }[] } | null | undefined): boolean | null {
  if (!inv || !Array.isArray(inv.products)) return null
  const yes = inv.products.filter((p) => p && p.visible === 'yes')
  return yes.some((p) => p.type === 'bottle') && yes.some((p) => p.type === 'box')
}

export type AdsV2PresenterV2PickWhy = 'clean' | 'unchecked' | 'all_discarded'
/**
 * A melhor opção (pura): a 1ª SEM os dois objetos; senão a 1ª que a checagem não leu; todas descartadas = a 1ª mesmo (o apresentador nunca
 * mata o pedido; o evento registra). Lista vazia = -1.
 */
export function adsV2PresenterV2Pick(bothObjects: readonly (boolean | null)[]): { index: number; why: AdsV2PresenterV2PickWhy } {
  const list = Array.isArray(bothObjects) ? bothObjects : []
  if (list.length === 0) return { index: -1, why: 'all_discarded' }
  const clean = list.findIndex((b) => b === false)
  if (clean >= 0) return { index: clean, why: 'clean' }
  const unchecked = list.findIndex((b) => b === null)
  if (unchecked >= 0) return { index: unchecked, why: 'unchecked' }
  return { index: 0, why: 'all_discarded' }
}

/** Sufixo do arquivo de cada opção no bucket (adsv2-<pedido>-p31-a<n>-scene-o<k>.<ext>). */
export function adsV2PresenterV2OptionSuffix(k: number): string {
  return `-o${Math.max(0, Math.floor(k))}`
}

// ── a voz do apresentador, por língua (motor + voice id) ─────────────────────────────────────────────────────────────
/** O modelo de voz do apresentador (o mesmo que o /audio e a TTS da casa usam). A voz CLONADA do /avatar fica na 02-hd. */
export const ADS_V2_PRESENTER_V2_TTS_MODEL = 'fal-ai/minimax/speech-2.8-hd'
export type AdsV2PresenterV2Voice =
  | { engine: 'current' }
  | { engine: 'minimax'; model: string; voiceId: string; languageBoost: string; speed: number }
/** A voz de hoje do apresentador (MiniMax padrão sem voice_setting nas mulheres; a ElevenLabs dele nos homens). */
export const ADS_V2_PRESENTER_V2_CURRENT_VOICE: AdsV2PresenterV2Voice = { engine: 'current' }
/** PT-BR — escolhida pelo fundador pelo ouvido em 17/10 (amostra #3): Portuguese_ConfidentWoman, speech-2.8-hd, Portuguese, speed 1. */
export const ADS_V2_PRESENTER_V2_PT_BR_VOICE: AdsV2PresenterV2Voice = { engine: 'minimax', model: ADS_V2_PRESENTER_V2_TTS_MODEL, voiceId: 'Portuguese_ConfidentWoman', languageBoost: 'Portuguese', speed: 1 }
/**
 * ONDE TROCAR A VOZ: uma linha por língua (código de lib/textLanguage.ts), uma voz por gênero (boca e voz do mesmo gênero). Língua fora da
 * tabela = a voz de hoje. Voz feminina de PT não vai para apresentador homem (fica a ElevenLabs dele até o fundador escolher uma voz masculina).
 */
export const ADS_V2_PRESENTER_V2_VOICES: Readonly<Record<string, { woman: AdsV2PresenterV2Voice; man: AdsV2PresenterV2Voice }>> = {
  pt: { woman: ADS_V2_PRESENTER_V2_PT_BR_VOICE, man: ADS_V2_PRESENTER_V2_CURRENT_VOICE },
  en: { woman: ADS_V2_PRESENTER_V2_CURRENT_VOICE, man: ADS_V2_PRESENTER_V2_CURRENT_VOICE },
  es: { woman: ADS_V2_PRESENTER_V2_CURRENT_VOICE, man: ADS_V2_PRESENTER_V2_CURRENT_VOICE },
}
/** A voz do apresentador nesta língua e gênero (pura). */
export function adsV2PresenterV2VoiceFor(language: string | null | undefined, gender: 'woman' | 'man' | null | undefined): AdsV2PresenterV2Voice {
  const row = typeof language === 'string' && Object.prototype.hasOwnProperty.call(ADS_V2_PRESENTER_V2_VOICES, language) ? ADS_V2_PRESENTER_V2_VOICES[language] : null
  if (!row) return ADS_V2_PRESENTER_V2_CURRENT_VOICE
  return gender === 'man' ? row.man : row.woman
}

// ── os planos do pedido: as fotos do cliente paradas (zero IA) ───────────────────────────────────────────────────────
/**
 * Com o método novo, a montagem usa só o apresentador, o close da foto real e o cartão: gerar os planos de IA seria dinheiro jogado fora. Cada
 * plano de IA vira uma FOTO DO CLIENTE parada com o zoom do montador (kind 'text', sem motor, sem custo), em rodízio pelas fotos que não são de
 * texto; a do produto entra como packshot. É o anúncio de RESERVA se o apresentador desistir. Vídeo do cliente e `text` ficam como estão. Sem
 * foto usável = o MESMO array. Pura (nunca muta).
 */
export function adsV2PresenterV2Shots(shots: AdsV2PlannedShot[], photos: readonly { footage_id: string; kind: string; url: string }[]): AdsV2PlannedShot[] {
  const usable = (Array.isArray(photos) ? photos : []).filter((p) => p && typeof p.footage_id === 'string' && p.footage_id && p.kind !== 'text' && typeof p.url === 'string' && HTTPS_RE.test(p.url))
  if (usable.length === 0 || !Array.isArray(shots)) return shots
  let k = 0
  return shots.map((s) => {
    if (s.kind === 'user_video' || s.kind === 'text') return s
    const p = usable[k++ % usable.length]
    const out = { ...s, kind: 'text', source: 'client_photo', sourceFootageId: p.footage_id, imageUrl: p.url, referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: null, movementVariant: 0, cutStart: 0 } as AdsV2PlannedShot & { inHand?: unknown }
    delete out.effect // o estilo, a pessoa segurando e o produto na mão são planos de IA: saem junto
    delete out.presenterHolds
    delete out.inHand
    delete out.packshot
    if (p.kind === 'product') out.packshot = true
    return out
  })
}

// ── custo (US$ estimado) ─────────────────────────────────────────────────────────────────────────────────────────────
/** Uma foto do Nano Banana Pro edit 2K (espelho de ADS_V2_SCENE_IMAGE_USD). */
export const ADS_V2_PRESENTER_V2_IMAGE_USD = 0.15
/** Uma checagem de "frasco e caixa" (inventário em 'high', modelo de visão do registro; espelho de ADS_V2_IN_HAND_JUDGE_USD). */
export const ADS_V2_PRESENTER_V2_CHECK_USD = 0.01
/** O custo do anúncio novo (puro): o estimateAdUsd de sempre (já com 1 foto do ator e o vídeo falado) + as 3 opções a mais + 4 checagens. */
export function adsV2PresenterV2Usd(base: { totalUsd: number }): { extraImagesUsd: number; checksUsd: number; totalUsd: number } {
  const r3 = (n: number) => Math.round(n * 1000) / 1000
  const extraImagesUsd = r3((ADS_V2_PRESENTER_V2_OPTIONS - 1) * ADS_V2_PRESENTER_V2_IMAGE_USD)
  const checksUsd = r3(ADS_V2_PRESENTER_V2_OPTIONS * ADS_V2_PRESENTER_V2_CHECK_USD)
  return { extraImagesUsd, checksUsd, totalUsd: r3((Number(base?.totalUsd) || 0) + extraImagesUsd + checksUsd) }
}
