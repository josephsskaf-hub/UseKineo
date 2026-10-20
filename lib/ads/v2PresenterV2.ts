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
// KINEO-APRESENTADOR-V2-LIBERA-1910 — 19/10: a nota final veio (9 na R3, pedido 84a5d07f) e a trava virou 'all' — todos os clientes, mesmo escopo (Comercial, 9:16, sem estilo).
//
// LIB PURA (só `import type`, apagado na transpilação): o guardião scripts/test-apresentador-v2-1710.mjs carrega este arquivo cru.
//
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — o 1º teste real (pedido b6823063, notas 8/6/6/6/8/7/6; docs/RESULTADO-T1-APRESENTADOR-V2-2026-10-17.md) pediu 6 ajustes,
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — todos neste caminho (a seção "AJUSTE 17/10" no fim deste arquivo): narração de 17 a 21 palavras (~10 s de voz, anúncio de
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — ~15 s) com a voz medida que passa do alvo acelerada até 1,08 ou cortada em frase inteira; atuação própria (calma, UGC, boca
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — relaxada na fala, gesto pequeno só da mão que JÁ está na foto); a foto com a mão livre inteira preferida entre as limpas;
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — e o motor Kling AI Avatar v2 PRO (1080p) numa constante. O que funcionou no teste (2 referências, 4 opções, frasco+caixa,
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — boca neutra na foto, ConfidentWoman, corte no fim da fala, close 2 s e cartão 2,5 s) fica igual.
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a 2ª rodada real (pedido 8becd82d, notas 8/8/7/9/8/7/9/7; docs/RESULTADO-T1-APRESENTADOR-V2-R2-2026-10-17.md) pediu 5 ajustes (a seção
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "AJUSTE 3" no fim deste arquivo): MÃOS PARADAS por padrão (gesto só com 2 mãos confirmadas: uma no produto, outra vazia, ambas inteiras,
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "yes" nunca "unsure"); 0,6 s de silêncio no fim do áudio que vai ao Kling (o clipe termina de boca fechada); foto LIMPA (interface de
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — câmera do celular = opção descartada); a frase de tela acima do produto; piscadas calmas. O resto do v2 fica igual.
import type { AdsV2PlannedShot } from '@/lib/ads/v2ShotLists'

/** Interruptor ÚNICO: 'internal' = só contas da casa; 'all' = todos; 'off' = o ator de antes para todo mundo. */
// KINEO-APRESENTADOR-V2-LIBERA-1910 — LIBERADO para todos: nota 9 do fundador na R3 (pedido 84a5d07f, docs/RESULTADO-T1-APRESENTADOR-V2-R3-2026-10-17.md). O escopo
// KINEO-APRESENTADOR-V2-LIBERA-1910 — NÃO muda: só o Comercial, 9:16, sem estilo de produto (adsV2PresenterV2Eligible); o resto segue no ator de antes. 'off' desliga tudo.
export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'all' // KINEO-APRESENTADOR-V2-LIBERA-1910 — era 'internal'

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
/** A outra mão INTEIRA no quadro (a atuação gesticula com ela; no teste ela entrou borrada pela borda). KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — aberta e apoiada no peito: na R2 nenhuma das 4 fotos teve a mão livre. */
export const ADS_V2_PRESENTER_V2_FREE_HAND = 'The other hand rests open on the chest, clearly visible and fully inside the frame, relaxed and complete with five natural fingers, never cut by the edge of the frame.' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — foto LIMPA: na R2 a opção 0 veio com a interface da câmera do iPhone desenhada (PHOTO / VIDEO / botão). */
export const ADS_V2_PRESENTER_V2_CLEAN_PHOTO = 'A clean photo, no phone screen interface, no on-screen buttons, no text overlays.' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
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
    ADS_V2_PRESENTER_V2_CLEAN_PHOTO, // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
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
  /** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — interface de câmera, botões ou texto desenhados na foto? 'yes' = descartada; 'unsure' = só no log; null = não leu. */
  phoneUi?: AdsV2PresenterV2Tri | null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
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
  /** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o retângulo do produto na foto escolhida (frações do quadro; a frase de tela vai acima dele). Ausente = o terço de cima. */
  productRect?: AdsV2PresenterV2Rect | null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
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
export const ADS_V2_PRESENTER_V2_MIN_WORDS = 19 // KINEO-APRESENTADOR-OLHOS-1910 — era 17: na validação de 19/10 os 11 roteiros nasceram COLADOS no piso (17–19 palavras) e a voz deu 7,1–9,5 s (anúncio de 11–14 s; alvo 15). 19 a 21 ainda é a régua de 17–21
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
  if (i.canSpeed !== true && s <= target * ADS_V2_PRESENTER_V2_MAX_SPEED + 1e-9) return { action: 'ok' } // KINEO-APRESENTADOR-OLHOS-1910 — a voz sem speed (EN/ES/homem) até 8% acima do alvo FICA (Rahul d036c357: 10,76 s para 10,5 perdeu a frase do meio e saiu com 12 palavras, 6,3 s). Passar é bom; amputar, nunca
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
    if (best >= 0 && parts.reduce((a, p, k) => a + (keep[k] && k !== best ? wordsOfV2(p) : 0), 0) < ADS_V2_PRESENTER_V2_MIN_WORDS) best = -1 // KINEO-APRESENTADOR-OLHOS-1910 — o corte nunca deixa a fala abaixo do piso de palavras (história interrompida é defeito)
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
// KINEO-APRESENTADOR-OLHOS-1910 — VALIDAÇÃO DOS 12 (19/10, docs/VALIDACAO-12-APRESENTADORES-2026-10-19.md): 8 de 11 reprovados por UM defeito — OLHOS FECHADOS falando ("saboreando o
// KINEO-APRESENTADOR-OLHOS-1910 — perfume"), 0,5–1,8 s, muitas vezes no gancho, às vezes com sorriso de dentes. A R3 só dizia "natural blinking at a relaxed pace". Agora a 1ª instrução da
// KINEO-APRESENTADOR-OLHOS-1910 — atuação é olhar para a lente de olhos abertos (piscada só rápida), e a lista do que evitar vai no FIM do prompt: o Kling AI Avatar v2 Pro continua SEM campo
// KINEO-APRESENTADOR-OLHOS-1910 — de negative (schema da fal conferido de novo em 20/10: image_url, audio_url, prompt, enable_safety_checker). Risco conhecido: "no X" pode desenhar X — por isso
// KINEO-APRESENTADOR-OLHOS-1910 — a frase afirmativa vem PRIMEIRO e a lista é curta. Revalidar os 8 com a mesma régua. NÃO reintroduzir o "warm" (358ea4e21: piorou olhos e dentes).
/** KINEO-APRESENTADOR-OLHOS-1910 — a 1ª instrução da atuação (as duas variantes). */
export const ADS_V2_PRESENTER_V2_EYES_OPEN = 'eyes open and looking into the lens the whole time; only quick, brief blinks' // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — o que evitar: vai no fim do prompt (o motor não tem negative) e no negative de reserva (ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT). */
export const ADS_V2_PRESENTER_V2_EYES_AVOID = 'closed eyes, eyes shut, squinting, savoring, head tilted back, toothy grin' // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — a atuação que vai ao motor (pura): olhos abertos no INÍCIO + o texto da R3 intacto + "avoid: …" no fim. */
export function adsV2PresenterV2EyesFirst(r3: string): string { return `${ADS_V2_PRESENTER_V2_EYES_OPEN}; ${r3}; avoid: ${ADS_V2_PRESENTER_V2_EYES_AVOID}` } // KINEO-APRESENTADOR-OLHOS-1910
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_R3 = 'the person talks to the camera in a calm, natural UGC style, like chatting with a friend; a light closed-lip smile only at the very start and at the very end; while speaking the mouth stays relaxed and the lips follow every syllable naturally; small, low gestures with the free hand that is already visible in the photo, kept near the chest; the hands in the frame stay exactly the ones in the photo; the other hand holds the product steady with the label facing the camera; gentle natural head movement, natural blinking at a relaxed pace, steady camera, sharp focus, preserve the exact face and appearance' // KINEO-APRESENTADOR-OLHOS-1910 — a atuação da R3 (nota 9, pedido 84a5d07f), INTACTA: vai ao motor dentro de adsV2PresenterV2EyesFirst (abaixo)
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a foto escolhida NÃO tem a mão livre (ou não deu para ver): só rosto, olhar e cabeça; as mãos ficam como na foto. */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL_R3 = 'the person talks to the camera in a calm, natural UGC style, like chatting with a friend; a light closed-lip smile only at the very start and at the very end; while speaking the mouth stays relaxed and the lips follow every syllable naturally; only the one hand holding the product is in the frame and it stays still; the other arm rests out of frame; the hand with the product holds it steady with the label facing the camera; the expression comes from the eyes, the face and a gentle natural head movement; natural blinking at a relaxed pace; steady camera, sharp focus, preserve the exact face and appearance' // KINEO-APRESENTADOR-OLHOS-1910 — a das mãos paradas da R3, INTACTA
/** KINEO-APRESENTADOR-OLHOS-1910 — a atuação do v2 com a mão livre (olhos abertos primeiro). */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT = adsV2PresenterV2EyesFirst(ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_R3) // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — a atuação do v2 com as mãos paradas (olhos abertos primeiro). */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL = adsV2PresenterV2EyesFirst(ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL_R3) // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a atuação pela foto escolhida (pura): mão livre inteira = gesto pequeno; senão (ou não sei) = mãos paradas. */
export function adsV2PresenterV2Performance(freeHand: boolean | null | undefined): string {
  return freeHand === true ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a atuação que vai ao motor (pura): a da linha se for uma das duas do v2; qualquer outra (a de 09/10) = a das mãos paradas. */
export function adsV2PresenterV2PerformanceOf(rowPrompt: string | null | undefined): string {
  return rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT || rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_R3 ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL // KINEO-APRESENTADOR-OLHOS-1910 — a linha planejada ANTES desta entrega (texto da R3) também sai com os olhos abertos; qualquer outra = a das mãos paradas
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o que um negative prompt levaria (pedido do fundador), se o motor aceitar um. */
export const ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT = `big smile while talking, teeth, hand entering frame, hand close to camera, blur, ${ADS_V2_PRESENTER_V2_EYES_AVOID}` // KINEO-APRESENTADOR-OLHOS-1910 — + olhos fechados/apertados, "saboreando", cabeça para trás, sorriso de dentes
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
export const ADS_V2_PRESENTER_V2_HANDS_QUESTION = 'Image 1 is a photo of a person with a product. How many separate hands are visible? Count each human hand once. "hand_count": that number. "hands": one entry per hand; for each: is it holding the product? "holding_product": "yes" or "no". And "whole": "yes" when the entire hand is inside the frame and in view (fingers wrapped around the product still count), "no" when part of it is cut by the edge of the frame or hidden, "unsure" when you cannot tell. "phone_ui": is there any phone camera interface, on-screen buttons or overlaid text drawn in the image? "yes", "no" or "unsure" (the printed label on the product itself does not count). Answer with JSON: {"hand_count": 0, "hands": [{"holding_product": "", "whole": ""}], "phone_ui": ""}.' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "how many separate hands are visible; for each: is it holding the product (yes/no)" + a interface de celular
export type AdsV2PresenterV2Tri = 'yes' | 'no' | 'unsure'
export interface AdsV2PresenterV2Hands { hands: { holds: AdsV2PresenterV2Tri; whole: AdsV2PresenterV2Tri }[]; count?: number | null; phoneUi?: AdsV2PresenterV2Tri } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — + a contagem e a interface de celular
const triV2 = (v: unknown): AdsV2PresenterV2Tri => (v === 'yes' || v === true ? 'yes' : v === 'no' || v === false ? 'no' : 'unsure') // KINEO-APRESENTADOR-V2-AJUSTE-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a resposta (pura): texto JSON ou objeto; sem lista "hands" = null (ilegível). */
export function adsV2PresenterV2ParseHands(raw: unknown): AdsV2PresenterV2Hands | null {
  let o: unknown = raw
  if (typeof raw === 'string') { try { o = JSON.parse(raw) } catch { return null } }
  const list = o && typeof o === 'object' ? (o as { hands?: unknown }).hands : null
  if (!Array.isArray(list)) return null
  const count = (o as { hand_count?: unknown }).hand_count // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return { hands: list.filter((h) => h && typeof h === 'object').map((h) => ({ holds: triV2((h as { holding_product?: unknown; holds_product?: unknown }).holding_product ?? (h as { holds_product?: unknown }).holds_product), whole: triV2((h as { whole?: unknown }).whole) })), count: typeof count === 'number' && Number.isFinite(count) ? count : null, phoneUi: triV2((o as { phone_ui?: unknown }).phone_ui) } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — holding_product (a pergunta nova) + hand_count + phone_ui
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a mão LIVRE aparece inteira? (pura) 2+ mãos e uma que NÃO segura o produto (ou "não sei") está inteira. null = ilegível. */
export function adsV2PresenterV2FreeHandOf(inv: AdsV2PresenterV2Hands | null | undefined): boolean | null {
  if (!inv || !Array.isArray(inv.hands)) return null
  if (inv.hands.length !== 2 || (inv.count != null && inv.count !== 2)) return false // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — EXATAMENTE 2 mãos distintas (a lista e a contagem concordam)
  const holding = inv.hands.filter((h) => h.holds === 'yes' && h.whole === 'yes').length // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const free = inv.hands.filter((h) => h.holds === 'no' && h.whole === 'yes').length // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "yes"/"no" firmes: "unsure" nunca confirma
  return holding === 1 && free === 1 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — uma no produto, outra vazia, as duas inteiras; a R2 contou a mão do frasco como livre
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
  const avatarUsd = r3(ADS_V2_PRESENTER_V2_USD_PER_SECOND * (ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS + ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS)) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — + os 0,6 s de silêncio que o motor cobra
  const avatarDeltaUsd = r3(avatarUsd - ADS_V2_PRESENTER_V2_STANDARD_USD_PER_SECOND * secs)
  const handChecksUsd = ADS_V2_PRESENTER_V2_OPTIONS * ADS_V2_PRESENTER_V2_HAND_CHECK_USD
  return { extraImagesUsd: old.extraImagesUsd, checksUsd: r3(old.checksUsd + handChecksUsd), avatarUsd, avatarDeltaUsd, totalUsd: r3(old.totalUsd + avatarDeltaUsd + handChecksUsd), engine: ADS_V2_PRESENTER_V2_ENGINE_SLUG }
}

// ══ KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — AJUSTE 3 (a 2ª rodada real: pedido 8becd82d) ═══════════════════════════════════════════════════════
// ── 1. MÃOS PARADAS por padrão; a interface de celular descarta a opção ────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — na R2 o checador marcou a mão livre em 3 de 4 fotos sem nenhuma ter a mão livre (contou a mão do frasco) e o Kling
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — INVENTOU a mão (entra borrada por baixo em 2,5 s). Agora o gesto só vale com EXATAMENTE 2 mãos, uma segurando o produto e
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — outra vazia, as duas inteiras, tudo "yes"/"no" firme (adsV2PresenterV2FreeHandOf); qualquer outra resposta = a atuação das
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — mãos paradas. A MESMA chamada pergunta pela interface de câmera desenhada: "yes" descarta a opção; "unsure" só no log.
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — um retângulo em frações do quadro (0 a 1). */
export interface AdsV2PresenterV2Rect { x0: number; y0: number; x1: number; y1: number } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a interface de celular desenhada na foto (pura): 'yes' / 'no' / 'unsure'; null = a checagem não leu. */
export function adsV2PresenterV2PhoneUiOf(inv: AdsV2PresenterV2Hands | null | undefined): AdsV2PresenterV2Tri | null { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (!inv || !Array.isArray(inv.hands)) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return inv.phoneUi === 'yes' || inv.phoneUi === 'no' ? inv.phoneUi : 'unsure' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/**
 * KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a escolha (pura): a opção com a interface de celular ('yes') conta como DESCARTADA, igual a "frasco e caixa"; depois a
 * KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — regra de antes (adsV2PresenterV2PickHand: a 1ª limpa com 2 mãos confirmadas, senão a 1ª limpa). Todas descartadas = a 1ª
 * KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — SEM a interface, se houver (o apresentador nunca mata o pedido). 'unsure' não descarta.
 */
export function adsV2PresenterV2PickClean(bothObjects: readonly (boolean | null)[], freeHands: readonly (boolean | null)[], phoneUi: readonly (AdsV2PresenterV2Tri | null)[]): { index: number; why: AdsV2PresenterV2PickWhy | AdsV2PresenterV2HandWhy } { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const both = Array.isArray(bothObjects) ? bothObjects : [] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const ui = Array.isArray(phoneUi) ? phoneUi : [] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const merged = both.map((b, k) => (ui[k] === 'yes' ? true : b)) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — interface desenhada = descartada
  const pick = adsV2PresenterV2PickHand(merged, freeHands) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (pick.why !== 'all_discarded' || pick.index < 0) return pick // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const noUi = both.findIndex((_, k) => ui[k] !== 'yes') // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return noUi >= 0 ? { index: noUi, why: 'all_discarded' } : pick // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710

// ── 2. o fim de boca fechada: 0,6 s de silêncio no fim do áudio que vai ao Kling ─────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — na R2 o Kling devolveu 9,87 s para 9,94 s de voz: sem cauda calada, o corte (fala + 0,15 s) caiu no limite do clipe, de
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — boca aberta. Com 0,6 s de silêncio no fim do áudio do MOTOR o clipe ganha um fim calado; a voz do pedido (voice_url e
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — voice_seconds, o corte da montagem) continua a fala real. Sem ffmpeg no servidor: quadros MP3 de silêncio (cabeçalho do
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — 1º quadro, sem CRC nem padding, side info e dados zerados = nenhum coeficiente = silêncio) depois do último quadro de
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — áudio (o ID3 do começo e qualquer tag do fim ficam onde estão); o cabeçalho Xing/Info (e o CRC do LAME/Lavf) e o VBRI
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — passam a contar os quadros novos. Custo: ~0,6 s × US$ 0,115 = ~US$ 0,07 por anúncio.
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o silêncio no fim do áudio do motor (s). */
export const ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS = 0.6 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
const MP3_BR_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — espelho de lib/compose.ts
const MP3_BR_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
const MP3_SR_V1 = [44100, 48000, 32000, 0] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
interface Mp3Head { h: number; version: number; mpeg1: boolean; sr: number; size: number; samples: number; mono: boolean; crc: boolean } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
function mp3HeadAt(b: Uint8Array, o: number): Mp3Head | null { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — só Layer III (a voz da casa)
  if (o < 0 || o + 4 > b.length || b[o] !== 0xff || (b[o + 1] & 0xe0) !== 0xe0) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const h = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const version = (h >>> 19) & 3, layer = (h >>> 17) & 3, bi = (h >>> 12) & 15, si = (h >>> 10) & 3 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (version === 1 || layer !== 1 || bi === 0 || bi === 15 || si === 3) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const mpeg1 = version === 3 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const sr = mpeg1 ? MP3_SR_V1[si] : version === 2 ? MP3_SR_V1[si] / 2 : MP3_SR_V1[si] / 4 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const size = Math.floor(((mpeg1 ? 144 : 72) * (mpeg1 ? MP3_BR_V1 : MP3_BR_V2)[bi] * 1000) / sr) + ((h >>> 9) & 1) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return size >= 4 ? { h, version, mpeg1, sr, size, samples: mpeg1 ? 1152 : 576, mono: ((h >>> 6) & 3) === 3, crc: ((h >>> 16) & 1) === 0 } : null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
const crc16Arc = (b: Uint8Array): number => { let c = 0; for (const x of b) { c ^= x; for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1 } return c } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o CRC-16 da tag LAME
const rd32 = (b: Uint8Array, o: number): number => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
const wr32 = (b: Uint8Array, o: number, v: number): void => { b[o] = (v >>> 24) & 255; b[o + 1] = (v >>> 16) & 255; b[o + 2] = (v >>> 8) & 255; b[o + 3] = v & 255 } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
const tagAt = (b: Uint8Array, o: number, t: string): boolean => o >= 0 && o + 4 <= b.length && [0, 1, 2, 3].every((k) => b[o + k] === t.charCodeAt(k)) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o cabeçalho Xing/Info e o VBRI do 1º quadro passam a contar os quadros e os bytes novos (no lugar, na cópia). */
function mp3FixVbrHeader(out: Uint8Array, first: number, head: Mp3Head, frames: number, bytes: number): void { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const side = head.mpeg1 ? (head.mono ? 17 : 32) : head.mono ? 9 : 17 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const x = first + 4 + (head.crc ? 2 : 0) + side // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (tagAt(out, x, 'Xing') || tagAt(out, x, 'Info')) { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    const flags = rd32(out, x + 4) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    const crcBefore = out.slice(first, first + head.size) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o quadro ANTES da mudança (para descobrir a forma do CRC)
    let p = x + 8 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    if (flags & 1) { wr32(out, p, rd32(out, p) + frames); p += 4 } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    if (flags & 2) { wr32(out, p, rd32(out, p) + bytes); p += 4 } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    if (flags & 4) p += 100 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o TOC fica (a busca ainda cai perto)
    if (flags & 8) p += 4 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    const at = p + 34 - first // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a tag LAME/Lavf tem 36 bytes; o CRC dela são os 2 últimos
    const enc = String.fromCharCode(out[p] ?? 0, out[p + 1] ?? 0, out[p + 2] ?? 0, out[p + 3] ?? 0) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    if (at + 2 <= head.size && /^(LAME|Lavf|Lavc|L3\.9)/.test(enc)) { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
      // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — as duas formas vistas: LAME (os bytes antes do CRC) e Lavf (os 190 primeiros bytes com o campo zerado — a voz MiniMax).
      // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — Só recalcula a forma que batia ANTES; nenhuma batia = o campo fica como veio.
      const old = (crcBefore[at] << 8) | crcBefore[at + 1] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
      const zero = (f: Uint8Array): Uint8Array => { const z = f.slice(0, Math.max(190, at + 2)); z[at] = 0; z[at + 1] = 0; return z } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
      const zb = zero(crcBefore), za = zero(out.slice(first, first + head.size)) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
      const c = crc16Arc(zb.slice(0, at)) === old ? crc16Arc(za.slice(0, at)) : head.size >= 190 && crc16Arc(zb.slice(0, 190)) === old ? crc16Arc(za.slice(0, 190)) : null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
      if (c !== null) { out[first + at] = (c >>> 8) & 255; out[first + at + 1] = c & 255 } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
    } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const v = first + 4 + 32 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o VBRI (Fraunhofer) mora sempre 32 bytes depois do cabeçalho
  if (tagAt(out, v, 'VBRI') && v + 18 <= out.length) { wr32(out, v + 10, rd32(out, v + 10) + bytes); wr32(out, v + 14, rd32(out, v + 14) + frames) } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/**
 * KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o MP3 com `seconds` de silêncio no fim (pura; nunca muta a entrada). null = não é um MP3 Layer III legível (o avanço
 * KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — manda a voz de sempre). `addedSeconds` = o silêncio real (quadros inteiros: 0,612 s a 32 kHz).
 */
export function adsV2PresenterV2PadMp3(bytes: Uint8Array, seconds: number = ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS): { bytes: Uint8Array; addedSeconds: number; frames: number } | null { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const b = bytes instanceof Uint8Array ? bytes : null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (!b || b.length < 4 || !(typeof seconds === 'number' && seconds > 0 && seconds <= 5)) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  let o = 0 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (b.length > 10 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) o = 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f)) + (b[5] & 0x10 ? 10 : 0) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ID3v2 (+ rodapé)
  let first = -1 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  let head: Mp3Head | null = null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  for (let k = o; k < Math.min(b.length - 3, o + 4096); k++) { const hd = mp3HeadAt(b, k); const nx = hd ? mp3HeadAt(b, k + hd.size) : null; if (hd && (k + hd.size === b.length || (nx && nx.sr === hd.sr))) { first = k; head = hd; break } } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — 2 quadros seguidos (sync falso não vale)
  if (!head || first < 0) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  let end = first // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  for (let hd = mp3HeadAt(b, end); hd && hd.sr === head.sr && hd.version === head.version && end + hd.size <= b.length; hd = mp3HeadAt(b, end)) end += hd.size // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o fim do último quadro (tags do fim ficam depois)
  const silentH = ((head.h | 0x00010000) & ~0x00000200) >>> 0 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — sem CRC, sem padding; o resto do cabeçalho igual
  const hb = new Uint8Array([silentH >>> 24, (silentH >>> 16) & 255, (silentH >>> 8) & 255, silentH & 255]) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const sh = mp3HeadAt(hb, 0) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (!sh) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const frames = Math.ceil((seconds * head.sr) / head.samples - 1e-9) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const out = new Uint8Array(b.length + frames * sh.size) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  out.set(b.subarray(0, end), 0) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  for (let k = 0; k < frames; k++) out.set(hb, end + k * sh.size) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o resto do quadro já é zero
  out.set(b.subarray(end), end + frames * sh.size) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  mp3FixVbrHeader(out, first, head, frames, frames * sh.size) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return { bytes: out, addedSeconds: Math.round(((frames * head.samples) / head.sr) * 1000) / 1000, frames } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710

// ── 4. a frase de tela ACIMA do produto e das mãos ──────────────────────────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — na R2 "Um perfume encantador" ficou sobre os dedos. O retângulo do produto na foto escolhida vem do MESMO inventário da
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — checagem "frasco e caixa" (box_2d de 0 a 1000, sem chamada nova); a montagem põe a frase acima dele
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — (adsV2PresenterV2OverlayGeometry, lib/ads/adV2Montage.ts). Sem retângulo = o terço de cima.
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o retângulo do produto (pura): o maior produto visível ("yes", nunca a caixa) em frações. null = sem caixa legível. */
export function adsV2PresenterV2ProductRect(inv: { products?: readonly { type?: unknown; visible?: unknown; box?: unknown }[] } | null | undefined): AdsV2PresenterV2Rect | null { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (!inv || !Array.isArray(inv.products)) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const ok = (v: unknown): v is [number, number, number, number] => Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000) && v[2] > v[0] && v[3] > v[1] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const list = inv.products.filter((p) => p && p.visible === 'yes' && p.type !== 'box' && ok(p.box)).map((p) => p.box as [number, number, number, number]) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  if (list.length === 0) return null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const b = list.sort((p, q) => (q[2] - q[0]) * (q[3] - q[1]) - (p[2] - p[0]) * (p[3] - p[1]))[0] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — [ymin, xmin, ymax, xmax]
  return { x0: b[1] / 1000, y0: b[0] / 1000, x1: b[3] / 1000, y1: b[2] / 1000 } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
// ══ KINEO-APRESENTADOR-OLHOS-1910 — a TELA DE ESCOLHA só com os aprovados + a amostra de voz = a voz do anúncio ══════════════════════════════════════════════
// ── 1. KINEO-APRESENTADOR-OLHOS-1910 — os aprovados da validação de 19/10 (até revalidar os outros 8) ──────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-OLHOS-1910 — Sofia 9 (R3), Amara 8, Rahul 8, Kenji 8. Os outros 8 (Robert, Yasmin, Jade, Hannah, Marcus, Clara, Chloe, Lucía) fecharam os olhos falando: ficam FORA da
// KINEO-APRESENTADOR-OLHOS-1910 — tela para clientes; as contas internas veem os 12, com os 8 marcados "em teste". O servidor confere de novo (adsV2PresenterV2GatePick): id oculto vindo de tela
// KINEO-APRESENTADOR-OLHOS-1910 — antiga ou da API vira um aprovado do MESMO gênero, e o sorteio do v2 só cai em aprovada (Sofia ou Amara). Para ampliar: pôr o id na lista. false = os 12 para todos.
/** KINEO-APRESENTADOR-OLHOS-1910 — quem aparece para clientes na tela de escolha (ids da biblioteca, lib/ads/v2Presenter.ts). */
export const ADS_V2_PRESENTER_V2_APPROVED: readonly string[] = ['sofia', 'amara', 'rahul', 'kenji'] // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — Interruptor ÚNICO: true = clientes só veem (e só recebem) os aprovados; false = os 12 para todos, como antes. */
export const ADS_V2_PRESENTER_V2_APPROVED_ONLY: boolean = true // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — o apresentador aparece na tela? (puro) `all` = conta interna (vê todos). */
export function adsV2PresenterV2Visible(id: string | null | undefined, all: boolean, only: boolean = ADS_V2_PRESENTER_V2_APPROVED_ONLY): boolean { // KINEO-APRESENTADOR-OLHOS-1910
  if (typeof id !== 'string' || !id) return false // KINEO-APRESENTADOR-OLHOS-1910
  return only !== true || all === true || ADS_V2_PRESENTER_V2_APPROVED.includes(id) // KINEO-APRESENTADOR-OLHOS-1910
} // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — "em teste" (puro): fora dos aprovados com o interruptor ligado (só as contas internas chegam a ver). */
export function adsV2PresenterV2Testing(id: string | null | undefined, only: boolean = ADS_V2_PRESENTER_V2_APPROVED_ONLY): boolean { // KINEO-APRESENTADOR-OLHOS-1910
  return only === true && typeof id === 'string' && !!id && !ADS_V2_PRESENTER_V2_APPROVED.includes(id) // KINEO-APRESENTADOR-OLHOS-1910
} // KINEO-APRESENTADOR-OLHOS-1910
// KINEO-APRESENTADOR-OLHOS-1910 — a trava do SERVIDOR (pura). Conta interna ou interruptor desligado = igual. Cliente que escolheu um oculto = o aprovado do mesmo gênero (posição do
// KINEO-APRESENTADOR-OLHOS-1910 — escolhido na biblioteca, em rodízio); sem escolha (o sorteio: `person` é o índice da biblioteca) e a pessoa sorteada oculta = uma aprovada (mulher: a voz
// KINEO-APRESENTADOR-OLHOS-1910 — de sempre do sorteio é feminina). `swapped` = trocou (vai para o evento).
export function adsV2PresenterV2GatePick(i: { presenterId: string | null | undefined; person: number; internal: boolean; library: readonly { id: string; gender: 'woman' | 'man' }[] }, only: boolean = ADS_V2_PRESENTER_V2_APPROVED_ONLY): { presenterId: string | null; person: number; swapped: boolean } { // KINEO-APRESENTADOR-OLHOS-1910
  const lib = Array.isArray(i?.library) ? i.library : [] // KINEO-APRESENTADOR-OLHOS-1910
  const id = typeof i?.presenterId === 'string' && i.presenterId ? i.presenterId : null // KINEO-APRESENTADOR-OLHOS-1910
  const person = Number.isInteger(i?.person) && i.person >= 0 ? i.person : 0 // KINEO-APRESENTADOR-OLHOS-1910
  const same = { presenterId: id, person, swapped: false } // KINEO-APRESENTADOR-OLHOS-1910
  if (only !== true || i?.internal === true) return same // KINEO-APRESENTADOR-OLHOS-1910
  const pick = (gender: 'woman' | 'man', k: number) => { const ok = lib.filter((e) => e.gender === gender && ADS_V2_PRESENTER_V2_APPROVED.includes(e.id)); return ok.length ? ok[k % ok.length] : null } // KINEO-APRESENTADOR-OLHOS-1910
  if (id) { // KINEO-APRESENTADOR-OLHOS-1910
    if (ADS_V2_PRESENTER_V2_APPROVED.includes(id)) return same // KINEO-APRESENTADOR-OLHOS-1910
    const k = lib.findIndex((e) => e.id === id) // KINEO-APRESENTADOR-OLHOS-1910
    const to = pick(k >= 0 ? lib[k].gender : 'woman', Math.max(0, k)) // KINEO-APRESENTADOR-OLHOS-1910
    return to ? { presenterId: to.id, person: lib.indexOf(to), swapped: true } : same // KINEO-APRESENTADOR-OLHOS-1910
  } // KINEO-APRESENTADOR-OLHOS-1910
  const drawn = lib[person] // KINEO-APRESENTADOR-OLHOS-1910
  if (drawn && ADS_V2_PRESENTER_V2_APPROVED.includes(drawn.id)) return same // KINEO-APRESENTADOR-OLHOS-1910
  const to = pick('woman', person) // KINEO-APRESENTADOR-OLHOS-1910
  return to ? { presenterId: null, person: lib.indexOf(to), swapped: true } : same // KINEO-APRESENTADOR-OLHOS-1910
} // KINEO-APRESENTADOR-OLHOS-1910
// ── 2. KINEO-APRESENTADOR-OLHOS-1910 — a amostra que a tela toca = a voz que o anúncio vai usar ────────────────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-OLHOS-1910 — a voz do anúncio v2 sai por língua + gênero (adsV2PresenterV2VoiceFor): onde a tabela tem uma voz com voice id (hoje só PT-BR mulher = Portuguese_ConfidentWoman),
// KINEO-APRESENTADOR-OLHOS-1910 — o anúncio NÃO usa a voz cadastrada no retrato — e a amostra da tela (a voz do retrato) mentia. Caminho de menor risco: a TELA passa a tocar a amostra da voz
// KINEO-APRESENTADOR-OLHOS-1910 — da tabela (a do anúncio não muda: é a que o fundador escolheu pelo ouvido e a R3 aprovou com 9). Voz da tabela sem amostra = nenhuma amostra ("em breve"),
// KINEO-APRESENTADOR-OLHOS-1910 — nunca a voz errada. 'current' (EN/ES, homens em PT) = a voz do retrato, que é a mesma do anúncio (adsV2NarrationVoice cai na voz do apresentador).
/** KINEO-APRESENTADOR-OLHOS-1910 — amostra por voice id (arquivo público). Portuguese_ConfidentWoman = a amostra nº 3 que o fundador ouviu e escolheu em 17/10 (C:\kineo-wt\prints-1610\vozes). */
export const ADS_V2_PRESENTER_V2_VOICE_SAMPLES: Readonly<Record<string, string>> = { Portuguese_ConfidentWoman: '/ads/presenters/voice-pt-confidentwoman.mp3' } // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — a amostra da tela (pura): com a língua do anúncio e o v2 valendo, a da voz do ANÚNCIO; sem língua (fora do v2) = a do retrato, como antes. */
export function adsV2PresenterV2SampleFor(entry: { gender: 'woman' | 'man'; voiceSample: string | null } | null | undefined, language: string | null | undefined): string | null { // KINEO-APRESENTADOR-OLHOS-1910
  if (!entry) return null // KINEO-APRESENTADOR-OLHOS-1910
  if (typeof language === 'string' && language) { const v = adsV2PresenterV2VoiceFor(language, entry.gender); if (v.engine === 'minimax') return ADS_V2_PRESENTER_V2_VOICE_SAMPLES[v.voiceId] ?? null } // KINEO-APRESENTADOR-OLHOS-1910
  return entry.voiceSample ?? null // KINEO-APRESENTADOR-OLHOS-1910
} // KINEO-APRESENTADOR-OLHOS-1910
/** KINEO-APRESENTADOR-OLHOS-1910 — o voice_id que a voz do anúncio usa (puro, para o evento): a da tabela ('minimax:<voice id>'), senão a do retrato ('eleven:<voz>'), senão a MiniMax padrão. */
export function adsV2PresenterV2VoiceIdOf(language: string | null | undefined, gender: 'woman' | 'man' | null | undefined, entryVoice: { engine: string; voice?: string } | null | undefined): string { // KINEO-APRESENTADOR-OLHOS-1910
  const v = adsV2PresenterV2VoiceFor(language, gender) // KINEO-APRESENTADOR-OLHOS-1910
  if (v.engine === 'minimax') return `minimax:${v.voiceId}` // KINEO-APRESENTADOR-OLHOS-1910
  return entryVoice && entryVoice.engine === 'eleven' && typeof entryVoice.voice === 'string' && entryVoice.voice ? `eleven:${entryVoice.voice}` : 'minimax:default' // KINEO-APRESENTADOR-OLHOS-1910
} // KINEO-APRESENTADOR-OLHOS-1910
