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
//
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — o 1º teste real (pedido b6823063, notas 8/6/6/6/8/7/6; docs/RESULTADO-T1-APRESENTADOR-V2-2026-10-17.md) pediu 6 ajustes,
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — todos neste caminho (a seção "AJUSTE 17/10" no fim deste arquivo): narração de 17 a 21 palavras (~10 s de voz, anúncio de
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — ~15 s) com a voz medida que passa do alvo acelerada até 1,08 ou cortada em frase inteira; atuação própria (calma, UGC, boca
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — relaxada na fala, gesto pequeno só da mão que JÁ está na foto); a foto com a mão livre inteira preferida entre as limpas;
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — e o motor Kling AI Avatar v2 PRO (1080p) numa constante. O que funcionou no teste (2 referências, 4 opções, frasco+caixa,
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — boca neutra na foto, ConfidentWoman, corte no fim da fala, close 2 s e cartão 2,5 s) fica igual.
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
  /** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a mão LIVRE (a que não segura o produto) aparece inteira? null = a checagem não respondeu (pedido antigo: ausente). */
  freeHand?: boolean | null // KINEO-APRESENTADOR-V2-AJUSTE-1710
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
  chosenWhy?: AdsV2PresenterV2PickWhy | AdsV2PresenterV2HandWhy // KINEO-APRESENTADOR-V2-AJUSTE-1710 — + 'clean_free_hand' / 'clean_no_free_hand'
  /** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o que a voz medida pediu (acelerar ou cortar uma frase inteira) para caber no alvo de ~10,5 s. Ausente = coube. */
  voiceFit?: AdsV2PresenterV2VoiceFitRecord // KINEO-APRESENTADOR-V2-AJUSTE-1710
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

// ══ KINEO-APRESENTADOR-V2-AJUSTE-1710 — AJUSTE 17/10 (o 1º teste real: pedido b6823063) ══════════════════════════════════════════════════════
// ── 1. a régua da fala deste caminho: 17 a 21 palavras (~10 s de voz) e o anúncio fecha em ~15 s ─────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — no teste, o teto de 30 palavras do anúncio clássico deu 14,36 s de voz (ConfidentWoman: 2,1 pal/s) e um anúncio de
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — 18,67 s. Aqui: no máximo 21 palavras (21 / 2,1 = 10 s), no mínimo 17 (~8 s: a fala nunca termina cedo com o rosto calado).
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — Total = voz (até ~10,5 s) + 0,15 s + close 2 s + cartão 2,5 s ≈ 15 s (adsV2PresenterV2Timeline, lib/ads/adV2Montage.ts).
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o teto de palavras da narração do apresentador v2. */
export const ADS_V2_PRESENTER_V2_MAX_WORDS = 21
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o piso (a fala cobre o apresentador; menos que isso o rosto fica calado antes do close). */
export const ADS_V2_PRESENTER_V2_MIN_WORDS = 17
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a voz PT-BR do apresentador, medida no T1: 30 palavras em 14,36 s ≈ 2,1 pal/s. */
export const ADS_V2_PRESENTER_V2_WPS = 2.1
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o alvo da voz MEDIDA (s): 10,5 + 0,15 + 2 + 2,5 ≈ 15 s de anúncio. */
export const ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS = 10.5
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o anúncio do apresentador v2 mira 15 s. */
export const ADS_V2_PRESENTER_V2_TARGET_TOTAL_SECONDS = 15
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — aceleração máxima da voz (voice_setting.speed): até 8% não se ouve como pressa. */
export const ADS_V2_PRESENTER_V2_MAX_SPEED = 1.08
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — quantas frases o pedido de texto pede (cada ponto é uma pausa; 21 palavras cabem em 2–3 frases curtas). */
export const ADS_V2_PRESENTER_V2_SPEECH_SENTENCES = 'two or three short, calm spoken sentences'
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a régua do pedido de texto deste caminho (pura): o teto nunca passa do teto do anúncio nem de 21; o piso nunca passa do teto. */
export function adsV2PresenterV2Words(maxWords: number): { min: number; max: number } {
  const cap = typeof maxWords === 'number' && Number.isFinite(maxWords) && maxWords > 0 ? Math.floor(maxWords) : ADS_V2_PRESENTER_V2_MAX_WORDS
  const max = Math.min(cap, ADS_V2_PRESENTER_V2_MAX_WORDS)
  return { min: Math.min(ADS_V2_PRESENTER_V2_MIN_WORDS, max), max }
}

// ── 1b. a voz medida que passa do alvo: acelera de leve ou tira uma frase INTEIRA ────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — a escolha: até 8% acima do alvo (≤ 11,34 s), acelerar (speed ≤ 1,08) mantém o texto inteiro e não se ouve como pressa.
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — Acima disso, acelerar mais soa como locutor de bula: tira a frase do MEIO mais longa (nunca a 1ª, o gancho, nem a última, o
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — nome/chamada; nunca meia frase) e, se ainda precisar, acelera o resto até 1,08. Sem frase do meio para tirar = acelera 1,08 e
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — aceita passar um pouco do alvo (passar é bom; amputar a fala, nunca). Voz sem `speed` (a voz de hoje em EN/ES/homem) só corta.
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o que foi feito, gravado no pedido (plan.presenter.v2.voiceFit) e no evento da montagem. */
export interface AdsV2PresenterV2VoiceFitRecord { action: 'speed' | 'cut'; speed: number; wordsBefore: number; wordsAfter: number; secondsBefore: number }
export type AdsV2PresenterV2VoiceFit = { action: 'ok' } | { action: 'speed' | 'cut'; speed: number; text: string }
const wordsOfV2 = (t: string): number => String(t ?? '').split(/\s+/).filter(Boolean).length // KINEO-APRESENTADOR-V2-AJUSTE-1710
const up2 = (n: number): number => Math.ceil(n * 100 - 1e-6) / 100 // KINEO-APRESENTADOR-V2-AJUSTE-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a decisão (pura). `seconds` = a voz MEDIDA; `canSpeed` = a voz aceita voice_setting.speed (a MiniMax com voice id). */
export function adsV2PresenterV2VoiceFit(i: { seconds: number; text: string; canSpeed: boolean; target?: number }): AdsV2PresenterV2VoiceFit {
  const target = typeof i?.target === 'number' && i.target > 0 ? i.target : ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS
  const s = Number(i?.seconds)
  const text = String(i?.text ?? '').replace(/\s+/g, ' ').trim()
  if (!(s > 0) || !text || s <= target + 1e-9) return { action: 'ok' }
  const need = s / target
  if (i.canSpeed === true && need <= ADS_V2_PRESENTER_V2_MAX_SPEED + 1e-9) return { action: 'speed', speed: Math.min(ADS_V2_PRESENTER_V2_MAX_SPEED, up2(need)), text }
  const parts = text.split(/(?<=[.!?…])\s+/u).filter(Boolean)
  const perWord = s / Math.max(1, wordsOfV2(text))
  const limit = target * (i.canSpeed === true ? ADS_V2_PRESENTER_V2_MAX_SPEED : 1)
  const keep = parts.map(() => true)
  const est = (): number => parts.reduce((a, p, k) => a + (keep[k] ? wordsOfV2(p) : 0), 0) * perWord
  while (est() > limit + 1e-9) {
    let best = -1
    for (let k = 1; k < parts.length - 1; k++) if (keep[k] && (best < 0 || wordsOfV2(parts[k]) > wordsOfV2(parts[best]))) best = k
    if (best < 0) break
    keep[best] = false
  }
  const cut = parts.filter((_, k) => keep[k]).join(' ')
  if (cut === text) return i.canSpeed === true ? { action: 'speed', speed: ADS_V2_PRESENTER_V2_MAX_SPEED, text } : { action: 'ok' }
  const speed = i.canSpeed === true ? Math.min(ADS_V2_PRESENTER_V2_MAX_SPEED, Math.max(1, up2(est() / target))) : 1
  return { action: 'cut', speed, text: cut }
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o registro da decisão (puro). */
export function adsV2PresenterV2VoiceFitRecord(fit: AdsV2PresenterV2VoiceFit, before: { seconds: number; text: string }): AdsV2PresenterV2VoiceFitRecord | null {
  if (!fit || fit.action === 'ok') return null
  return { action: fit.action, speed: fit.speed, wordsBefore: wordsOfV2(before.text), wordsAfter: wordsOfV2(fit.text), secondsBefore: Math.round(Number(before.seconds) * 1000) / 1000 }
}

// ── 2. a atuação própria do v2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — o v2 usava a atuação do ator de 09/10 ("upbeat presenter energy… visible-hand gestures"): a boca travou num sorriso de
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — dentes em ~2,5 s da fala e o motor INVENTOU uma mão gigante vindo da câmera (a foto escolhida não tinha a mão livre). Agora:
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — calma de UGC, sorriso leve só no começo e no fim, boca relaxada seguindo as sílabas, gesto pequeno e baixo SÓ da mão que já
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — está na foto, as mãos do quadro iguais às da foto, câmera estável. Escrito em frases AFIRMATIVAS: o motor não tem negative
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — prompt e "no X" no prompt desenha X (lição do juiz do still).
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a foto escolhida TEM a mão livre inteira: ela gesticula pouco e baixo. */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT = 'the person talks to the camera in a calm, natural UGC style, like chatting with a friend; a light closed-lip smile only at the very start and at the very end; while speaking the mouth stays relaxed and the lips follow every syllable naturally; small, low gestures with the free hand that is already visible in the photo, kept near the chest; the hands in the frame stay exactly the ones in the photo; the other hand holds the product steady with the label facing the camera; gentle natural head movement, steady camera, sharp focus, preserve the exact face and appearance'
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a foto escolhida NÃO tem a mão livre (ou não deu para ver): só rosto, olhar e cabeça; as mãos ficam como na foto. */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL = 'the person talks to the camera in a calm, natural UGC style, like chatting with a friend; a light closed-lip smile only at the very start and at the very end; while speaking the mouth stays relaxed and the lips follow every syllable naturally; the hands in the frame stay exactly the ones in the photo, calm and in place; the hand with the product holds it steady with the label facing the camera; the expression comes from the eyes, the face and a gentle natural head movement; steady camera, sharp focus, preserve the exact face and appearance'
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a atuação pela foto escolhida (pura): mão livre inteira = gesto pequeno; senão (ou não sei) = mãos paradas. */
export function adsV2PresenterV2Performance(freeHand: boolean | null | undefined): string {
  return freeHand === true ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a atuação que vai ao motor (pura): a da linha se for uma das duas do v2; qualquer outra (a de 09/10) = a das mãos paradas. */
export function adsV2PresenterV2PerformanceOf(rowPrompt: string | null | undefined): string {
  return rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT || rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL ? rowPrompt : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o que um negative prompt levaria (pedido do fundador), se o motor aceitar um. */
export const ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT = 'big smile while talking, teeth, hand entering frame, hand close to camera, blur'
/**
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — o Kling AI Avatar v2 (standard e pro) NÃO aceita negative prompt: o schema da fal (conferido em 17/10) tem só image_url,
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — audio_url, prompt e enable_safety_checker. false = o campo não vai (o motor ignoraria). O dia em que aceitar: true e pronto.
 */
export const ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED: boolean = false
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o corpo do motor com o negative prompt SÓ se o motor aceitar (puro; hoje devolve o mesmo objeto). */
export function adsV2PresenterV2AvatarInput<T extends Record<string, unknown>>(input: T, supported: boolean = ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED): T {
  return supported === true ? ({ ...input, negative_prompt: ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT } as T) : input
}

// ── 3. a escolha da foto: entre as limpas, a que tem a MÃO LIVRE inteira ─────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — no teste só a opção 2 tinha a mão livre (no peito, 5 dedos) e a escolha pegou a 0 (a 1ª limpa). Uma checagem barata de
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — inventário no estilo da both_objects: pergunta de PRESENÇA (liste as mãos; cada uma segura o produto? está inteira?), o
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — código decide. Nenhuma limpa com a mão livre = a 1ª limpa, como antes. "frasco e caixa" continua mandando primeiro.
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a pergunta das mãos (1 imagem; o corpo e a chamada moram em lib/ads/v2LockVision.ts, adsV2PresenterV2HandsOf). */
export const ADS_V2_PRESENTER_V2_HANDS_QUESTION = 'Image 1 is a photo of a person with a product. List every human hand you can see in it. "hands": one entry per hand, each with "holds_product" ("yes" when this hand holds the product, "no" when it does not, "unsure" when you cannot tell) and "whole" ("yes" when the whole hand — the palm and all five fingers — is inside the frame and in view, "no" when part of it is outside the frame or hidden, "unsure" when you cannot tell). Answer with JSON: {"hands": [{"holds_product": "", "whole": ""}]}.'
export type AdsV2PresenterV2Tri = 'yes' | 'no' | 'unsure'
export interface AdsV2PresenterV2Hands { hands: { holds: AdsV2PresenterV2Tri; whole: AdsV2PresenterV2Tri }[] }
const triV2 = (v: unknown): AdsV2PresenterV2Tri => (v === 'yes' || v === true ? 'yes' : v === 'no' || v === false ? 'no' : 'unsure') // KINEO-APRESENTADOR-V2-AJUSTE-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a resposta (pura): texto JSON ou objeto; sem lista "hands" = null (ilegível). */
export function adsV2PresenterV2ParseHands(raw: unknown): AdsV2PresenterV2Hands | null {
  let o: unknown = raw
  if (typeof raw === 'string') { try { o = JSON.parse(raw) } catch { return null } }
  const list = o && typeof o === 'object' ? (o as { hands?: unknown }).hands : null
  if (!Array.isArray(list)) return null
  return { hands: list.filter((h) => h && typeof h === 'object').map((h) => ({ holds: triV2((h as { holds_product?: unknown }).holds_product), whole: triV2((h as { whole?: unknown }).whole) })) }
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a mão LIVRE aparece inteira? (pura) 2+ mãos e uma que NÃO segura o produto (ou "não sei") está inteira. null = ilegível. */
export function adsV2PresenterV2FreeHandOf(inv: AdsV2PresenterV2Hands | null | undefined): boolean | null {
  if (!inv || !Array.isArray(inv.hands)) return null
  if (inv.hands.length < 2) return false
  return inv.hands.some((h) => h.holds !== 'yes' && h.whole === 'yes')
}
export type AdsV2PresenterV2HandWhy = 'clean_free_hand' | 'clean_no_free_hand'
/**
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — a escolha (pura): "frasco e caixa" decide primeiro (adsV2PresenterV2Pick, intocada); havendo limpa, a 1ª limpa COM a mão
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — livre inteira ('clean_free_hand'); nenhuma = a 1ª limpa ('clean_no_free_hand'). Sem limpa = a regra de antes.
 */
export function adsV2PresenterV2PickHand(bothObjects: readonly (boolean | null)[], freeHands: readonly (boolean | null)[]): { index: number; why: AdsV2PresenterV2PickWhy | AdsV2PresenterV2HandWhy } {
  const base = adsV2PresenterV2Pick(bothObjects)
  if (base.why !== 'clean') return base
  const list = Array.isArray(bothObjects) ? bothObjects : []
  const hands = Array.isArray(freeHands) ? freeHands : []
  const withHand = list.findIndex((b, k) => b === false && hands[k] === true)
  return withHand >= 0 ? { index: withHand, why: 'clean_free_hand' } : { index: base.index, why: 'clean_no_free_hand' }
}

// ── 5. o motor do v2: Kling AI Avatar v2 PRO (1080p) ─────────────────────────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — o standard sai em 720p e "ATHEERI" em latim só ficava legível em parte dos quadros. O pro sai em 1080p (o mesmo input:
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — image_url, audio_url, prompt). A consulta/resultado/cancelamento da fila da fal usa só o app (fal-ai/kling-video), então o
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — poll de sempre lê o pedido pro sem mudança. Só o apresentador v2 usa; o ator de 09/10 e o /avatar continuam no standard.
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — espelho de PRESENTER_PRO_MODEL (lib/avatar/veed.ts; o guardião confere). */
export const ADS_V2_PRESENTER_V2_ENGINE_SLUG = 'fal-ai/kling-video/ai-avatar/v2/pro'
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — espelho de PRESENTER_PRO_USD_PER_SECOND (lib/avatar/veed.ts). */
export const ADS_V2_PRESENTER_V2_USD_PER_SECOND = 0.115
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o standard que o estimateAdUsd de sempre já conta pela duração do anúncio (espelho de ADS_V2_ENGINES.kling_avatar.usdPerSecond). */
export const ADS_V2_PRESENTER_V2_STANDARD_USD_PER_SECOND = 0.0562
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — uma checagem das mãos (a mesma tarifa da checagem "frasco e caixa"). */
export const ADS_V2_PRESENTER_V2_HAND_CHECK_USD = 0.01
/**
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — o custo do anúncio v2 (puro): o estimateAdUsd de sempre (1 foto + o avatar STANDARD pela duração do anúncio) trocando o
 * KINEO-APRESENTADOR-V2-AJUSTE-1710 — avatar pelo PRO no alvo da voz (10,5 s), + as 3 fotos a mais + 4 checagens "frasco e caixa" + 4 checagens das mãos.
 */
export function adsV2PresenterV2UsdPro(base: { totalUsd: number }, seconds: number = 15): { extraImagesUsd: number; checksUsd: number; avatarUsd: number; avatarDeltaUsd: number; totalUsd: number; engine: string } {
  const r3 = (n: number) => Math.round(n * 1000) / 1000
  const old = adsV2PresenterV2Usd(base)
  const secs = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 15
  const avatarUsd = r3(ADS_V2_PRESENTER_V2_USD_PER_SECOND * ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS)
  const avatarDeltaUsd = r3(avatarUsd - ADS_V2_PRESENTER_V2_STANDARD_USD_PER_SECOND * secs)
  const handChecksUsd = ADS_V2_PRESENTER_V2_OPTIONS * ADS_V2_PRESENTER_V2_HAND_CHECK_USD
  return { extraImagesUsd: old.extraImagesUsd, checksUsd: r3(old.checksUsd + handChecksUsd), avatarUsd, avatarDeltaUsd, totalUsd: r3(old.totalUsd + avatarDeltaUsd + handChecksUsd), engine: ADS_V2_PRESENTER_V2_ENGINE_SLUG }
}
