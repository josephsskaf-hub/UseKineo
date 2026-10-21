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
const cleanQ2110 = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim() // KINEO-ADS-QUALIDADE-2110
// ── 1. a pose e a escala ─────────────────────────────────────────────────────────────────────────────────────────── // KINEO-ADS-QUALIDADE-2110
export type AdsV2ProductShape = 'jar' | 'bottle' | 'box' | 'shoe' | 'bag' | 'device' | 'other' // KINEO-ADS-QUALIDADE-2110
const SHAPES: readonly [AdsV2ProductShape, RegExp][] = [ // KINEO-ADS-QUALIDADE-2110
  ['shoe', /\b(shoes?|sneakers?|trainers?|boots?|sandals?|heels|loafers?|t[êe]nis|sapatos?|botas?|sand[áa]lias?|zapatos?|zapatillas?)\b/i], // KINEO-ADS-QUALIDADE-2110
  ['bag', /\b(bags?|handbags?|purses?|backpacks?|totes?|clutch|wallets?|bolsas?|mochilas?|carteiras?|bolsos?|mochila)\b/i], // KINEO-ADS-QUALIDADE-2110
  ['device', /\b(smart ?watch(es)?|watch(es)?|phones?|smartphones?|earbuds|headphones?|speakers?|tablets?|cameras?|gadgets?|devices?|chargers?|rel[óo]gios?|celulares?|fones?|aud[íi]fonos?|relojes?|reloj)\b/i], // KINEO-ADS-QUALIDADE-2110
  ['jar', /\b(jars?|creams?|balms?|butters?|pots?|tubs?|pomades?|potes?|cremes?|creme|crema|b[áa]lsamos?|tarros?|manteigas?)\b/i], // KINEO-ADS-QUALIDADE-2110
  ['bottle', /\b(bottles?|perfumes?|fragrances?|colognes?|serums?|s[ée]runs?|lotions?|oils?|sprays?|shampoos?|conditioners?|wines?|frascos?|garrafas?|[óo]leos?|lo[çc][ãa]o|lociones?|botellas?)\b/i], // KINEO-ADS-QUALIDADE-2110
  ['box', /\b(box(es)?|packs?|packages?|kits?|teas?|coffees?|cereals?|chocolates?|caixas?|ch[áa]s?|caf[ée]s?|cajas?|pacotes?|paquetes?)\b/i], // KINEO-ADS-QUALIDADE-2110
] // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — o tipo de produto pelo texto (o produto digitado + o negócio). Pura. */
export function adsV2ProductShape(text: unknown): AdsV2ProductShape { // KINEO-ADS-QUALIDADE-2110
  const t = cleanQ2110(text) // KINEO-ADS-QUALIDADE-2110
  for (const [shape, re] of SHAPES) if (re.test(t)) return shape // KINEO-ADS-QUALIDADE-2110
  return 'other' // KINEO-ADS-QUALIDADE-2110
} // KINEO-ADS-QUALIDADE-2110
const HOLD: Readonly<Record<AdsV2ProductShape, string>> = { // KINEO-ADS-QUALIDADE-2110
  jar: 'a small jar that sits in the palm of one hand, the lid on top and the front label facing the camera', // KINEO-ADS-QUALIDADE-2110
  bottle: 'a bottle about the length of a hand, held upright with the label facing the camera', // KINEO-ADS-QUALIDADE-2110
  box: 'a box held upright in one hand at its real size, the front of the box facing the camera', // KINEO-ADS-QUALIDADE-2110
  shoe: 'one shoe held from below in one hand at its real size, the side of the shoe facing the camera', // KINEO-ADS-QUALIDADE-2110
  bag: 'the bag held by its handle in one hand at its real size, hanging in front of the body', // KINEO-ADS-QUALIDADE-2110
  device: 'the device resting in the palm of one hand at its real size, its screen or face turned to the camera', // KINEO-ADS-QUALIDADE-2110
  other: 'the product held in one hand at its true real-world size, its front turned to the camera', // KINEO-ADS-QUALIDADE-2110
} // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — a linha da pose (prompt da foto do apresentador): peito, virado para a câmera, mão segurando, longe do rosto, escala real. */
export function adsV2PresenterPoseLine(text: unknown, their: 'her' | 'his'): string { // KINEO-ADS-QUALIDADE-2110
  return `Pose: ${their} hand holds the product at chest height, a little in front of the body, with clear space between the product and ${their} face; ${HOLD[adsV2ProductShape(text)]}. The fingers visibly hold the product. The other arm rests relaxed at ${their} side, out of the frame.` // KINEO-ADS-QUALIDADE-2110
} // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — o que a visão responde sobre a pose de cada opção (campos novos da MESMA pergunta das mãos). */
export interface AdsV2PresenterPose { touchingFace: 'yes' | 'no' | 'unsure'; at: 'chest' | 'face' | 'low' | 'unsure'; held: 'yes' | 'no' | 'unsure'; scale: 'realistic' | 'too_big' | 'too_small' | 'unsure' } // KINEO-ADS-QUALIDADE-2110
export const ADS_V2_PRESENTER_POSE_QUESTION = ' "touching_face": does the product or any hand touch the face, cheek, chin, lips, neck or hair? "yes", "no" or "unsure". "product_height": where is the product held — "chest" (in front of the body between the shoulders and the waist), "face" (at the level of the face or next to it), "low" (below the waist) or "unsure". "held": is the product clearly held by a hand (not floating in the air)? "yes", "no" or "unsure". "scale": compared with the hand and the person, is the product at a realistic real-world size? "realistic", "too_big", "too_small" or "unsure".' // KINEO-ADS-QUALIDADE-2110
export const ADS_V2_PRESENTER_POSE_JSON = '"touching_face": "", "product_height": "", "held": "", "scale": ""' // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — a pose da resposta (pura). Sem os campos = tudo "unsure". */
export function adsV2ParsePresenterPose(o: unknown): AdsV2PresenterPose { // KINEO-ADS-QUALIDADE-2110
  const g = (k: string): unknown => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined) // KINEO-ADS-QUALIDADE-2110
  const tri = (v: unknown): 'yes' | 'no' | 'unsure' => (v === 'yes' || v === true ? 'yes' : v === 'no' || v === false ? 'no' : 'unsure') // KINEO-ADS-QUALIDADE-2110
  const at = g('product_height'), sc = g('scale') // KINEO-ADS-QUALIDADE-2110
  return { touchingFace: tri(g('touching_face')), at: at === 'chest' || at === 'face' || at === 'low' ? at : 'unsure', held: tri(g('held')), scale: sc === 'realistic' || sc === 'too_big' || sc === 'too_small' ? sc : 'unsure' } // KINEO-ADS-QUALIDADE-2110
} // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — o defeito da pose (pura): 0 = limpa; ≥ 100 = recusa (encostando no rosto, flutuando, mãos demais); 30-60 = pior que qualquer limpa. */
export function adsV2PresenterPoseScore(pose: AdsV2PresenterPose | null | undefined, handCount: number | null | undefined): number { // KINEO-ADS-QUALIDADE-2110
  if (!pose) return 20 // KINEO-ADS-QUALIDADE-2110
  let s = 0 // KINEO-ADS-QUALIDADE-2110
  if (pose.touchingFace === 'yes') s += 100 // KINEO-ADS-QUALIDADE-2110
  if (pose.held === 'no') s += 100 // KINEO-ADS-QUALIDADE-2110
  if (typeof handCount === 'number' && (handCount > 2 || handCount < 1)) s += 100 // KINEO-ADS-QUALIDADE-2110
  if (pose.scale === 'too_big' || pose.scale === 'too_small') s += 50 // KINEO-ADS-QUALIDADE-2110
  if (pose.at === 'face') s += 40 // KINEO-ADS-QUALIDADE-2110
  else if (pose.at === 'low') s += 15 // KINEO-ADS-QUALIDADE-2110
  for (const v of [pose.touchingFace, pose.held, pose.scale, pose.at]) if (v === 'unsure') s += 4 // KINEO-ADS-QUALIDADE-2110
  return s // KINEO-ADS-QUALIDADE-2110
} // KINEO-ADS-QUALIDADE-2110
/** KINEO-ADS-QUALIDADE-2110 — a atuação viva (frases afirmativas: o Kling AI Avatar não tem negative). Vai dentro de adsV2PresenterV2EyesFirst. */
export const ADS_V2_PRESENTER_LIVELY_PROMPT = 'the person talks to the camera with warm, lively UGC energy, like recommending a favorite product to a friend; bright, attentive eyes on the lens; expressive eyebrows, small nods and natural head tilts on the key words; relaxed shoulders with a slight natural movement of the upper body; a light natural smile at the start and at the end; while speaking the mouth stays relaxed and the lips follow every syllable naturally; the hand with the product keeps it at chest height with the label facing the camera and moves it gently toward the lens when the product is named; the product stays in front of the chest, away from the face; handheld selfie camera with a subtle natural movement; sharp focus; preserve the exact face, hands and appearance' // KINEO-ADS-QUALIDADE-2110

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
export const ADS_V2_PRESENTER_V2_ONLY_PRODUCT = 'One hand holds only the product itself: if the SECOND reference photo also shows a box or other packaging, leave the box out of the frame. Exactly one product item in the frame.' // KINEO-ADS-QUALIDADE-2110 — sem "close to the face"
/** A outra mão INTEIRA no quadro (a atuação gesticula com ela; no teste ela entrou borrada pela borda). KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — aberta e apoiada no peito: na R2 nenhuma das 4 fotos teve a mão livre. */
export const ADS_V2_PRESENTER_V2_FREE_HAND = 'The other arm rests relaxed at the side, out of the frame; only the hand holding the product is in the frame.' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 · KINEO-ADS-QUALIDADE-2110 — era: a mão aberta no peito (fundador 21/10: "a pessoa encostando" — mão no corpo não é natural)
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — foto LIMPA: na R2 a opção 0 veio com a interface da câmera do iPhone desenhada (PHOTO / VIDEO / botão). */
export const ADS_V2_PRESENTER_V2_CLEAN_PHOTO = 'A clean photo, no phone screen interface, no on-screen buttons, no text overlays.' // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** Rosto de frente (o avatar guiado por voz quer o rosto inteiro, olhando para a lente). */
export const ADS_V2_PRESENTER_V2_FACE = 'faces the camera straight on, with the whole face visible and in focus, looking into the lens.'
/** KINEO-ADS-BOLA-2110 — o produto INTEIRO dentro do quadro (pedido 618a6680: as 4 opções saíram com a bola cortada na borda direita). */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_WHOLE_PRODUCT = 'The whole product is visible inside the frame with a little space around it, never cut or touched by the edge of the frame.' // KINEO-ADS-BOLA-2110

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
export function adsV2PresenterV2Prompt(i: { look: string; pronoun: 'She' | 'He'; sector: string | null | undefined; setting?: string | null; freeHand: boolean; product?: string | null }): string { // KINEO-ADS-QUALIDADE-2110 — + product: o tipo do produto escolhe a escala real
  const their = i.pronoun === 'He' ? 'his' : 'her'
  const where = SETTING[typeof i.sector === 'string' ? i.sector : 'other'] ?? SETTING.other
  const place = adsV2PresenterV2SettingLine(i.setting)
  return [
    `Realistic vertical 9:16 smartphone selfie photo, UGC style: the person from the FIRST reference photo, ${i.look}, holds the product from the SECOND reference photo in one hand at chest height, label facing the camera, clearly visible.`, // KINEO-ADS-QUALIDADE-2110 — era: "near ${their} face" (o pote encostava no rosto)
    adsV2PresenterPoseLine(i.product ?? '', their === 'his' ? 'his' : 'her'), // KINEO-ADS-QUALIDADE-2110 — a pose natural e a escala real por tipo de produto
    `Keep the person EXACTLY as in the first reference photo: same face, hair, skin tone, age and clothes. ${i.pronoun} ${ADS_V2_PRESENTER_V2_FACE}`,
    ADS_V2_PRESENTER_V2_NEUTRAL_MOUTH,
    ADS_V2_PRESENTER_V2_ONLY_PRODUCT,
    'Keep the product EXACTLY as in the second reference photo: same shape, colors, label, text and proportions. Do not redesign, rename, resize or add anything to the product.',
    ADS_V2_PRESENTER_V2_WHOLE_PRODUCT, // KINEO-ADS-BOLA-2110
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
  /** KINEO-ADS-BOLA-2110 — o produto inteiro dentro do quadro? 'no' (ou o retângulo encostado na borda) = a opção perde para qualquer inteira; null = não leu. */ // KINEO-ADS-BOLA-2110
  productWhole?: AdsV2PresenterV2Tri | null // KINEO-ADS-BOLA-2110
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

/** KINEO-ADS-BOLA-2110 — a foto do produto que o apresentador v2 usa (referência do Nano Banana e close de 2 s): a INTEIRA (original_url) quando o pedido tem; senão o recorte de sempre. Pura. */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2ProductSource(actor: { productUrl?: unknown; productOriginalUrl?: unknown } | null | undefined): string | null { // KINEO-ADS-BOLA-2110
  const o = typeof actor?.productOriginalUrl === 'string' ? actor.productOriginalUrl.trim() : '' // KINEO-ADS-BOLA-2110
  if (HTTPS_RE.test(o)) return o // KINEO-ADS-BOLA-2110
  const u = typeof actor?.productUrl === 'string' ? actor.productUrl.trim() : '' // KINEO-ADS-BOLA-2110
  return HTTPS_RE.test(u) ? u : null // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
/** As 2 referências, nesta ordem: o retrato e a foto real do produto. */
export function adsV2PresenterV2Refs(v2: Pick<AdsV2PresenterV2Plan, 'portraitUrl'>, productUrl: string): string[] {
  return [v2.portraitUrl, productUrl]
}

/** Monta o v2 do pedido (puro). null = sem retrato (fica o ator de antes). */
export function planAdsV2PresenterV2(i: { entry: { id: string; gender: 'woman' | 'man'; look: string; pronoun: 'She' | 'He'; portrait: string | null } | null | undefined; sector: string | null | undefined; setting?: string | null; performancePrompt: string; product?: string | null }): AdsV2PresenterV2Plan | null { // KINEO-ADS-QUALIDADE-2110 — + product
  const e = i.entry
  const portraitUrl = adsV2PresenterV2PortraitUrl(e)
  if (!e || !portraitUrl) return null
  return { v: 1, entryId: e.id, gender: e.gender, portraitUrl, prompt: adsV2PresenterV2Prompt({ look: e.look, pronoun: e.pronoun, sector: i.sector, setting: i.setting ?? null, freeHand: adsV2PresenterV2FreeHand(i.performancePrompt), product: i.product ?? null }) } // KINEO-ADS-QUALIDADE-2110 — + o produto (a escala)
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
export function adsV2PresenterV2Words(maxWords: number, voice?: { language?: string | null; gender?: 'woman' | 'man' | null } | null): { min: number; max: number } { // KINEO-ADS-BOLA-2110 — + voice: a régua pelo ritmo MEDIDO da voz do anúncio (ausente = 19–21, como antes)
  const cap = typeof maxWords === 'number' && Number.isFinite(maxWords) && maxWords > 0 ? Math.floor(maxWords) : ADS_V2_PRESENTER_V2_MAX_WORDS
  const paced = voice ? adsV2PresenterV2PaceWords(voice.language, voice.gender) : null // KINEO-ADS-BOLA-2110
  const max = Math.min(cap, paced ? paced.max : ADS_V2_PRESENTER_V2_MAX_WORDS) // KINEO-ADS-BOLA-2110 — era: Math.min(cap, ADS_V2_PRESENTER_V2_MAX_WORDS)
  return { min: Math.min(paced ? paced.min : ADS_V2_PRESENTER_V2_MIN_WORDS, max), max } // KINEO-ADS-BOLA-2110 — era: Math.min(ADS_V2_PRESENTER_V2_MIN_WORDS, max)
}
// KINEO-UGC-AJUSTES-2010 — a FOLGA da régua: o pedido ao modelo continua "19 a 21", mas a resposta com até 23 palavras é ACEITA (o piso de 19 fica). Em 20/10 o /plan da
// KINEO-UGC-AJUSTES-2010 — Yasmin devolveu no_copy porque o modelo escreveu 22 (já depois da 1 correção que existe). Aceitar é o caminho de menor risco: nenhuma chamada a mais
// KINEO-UGC-AJUSTES-2010 — ao modelo (o prazo de 60 s do /plan não muda) e a voz que passa do alvo já é ajustada na montagem (acelera até 1,08 ou tira a frase do meio, nunca abaixo de 19).
/** KINEO-UGC-AJUSTES-2010 — o teto ACEITO na resposta do modelo (o pedido continua em ADS_V2_PRESENTER_V2_MAX_WORDS). */
export const ADS_V2_PRESENTER_V2_ACCEPT_MAX_WORDS = 23 // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — o teto aceito para uma régua com teto `max` (puro): `max` + a folga de 2, nunca acima de 23 nem abaixo de `max`. */
export function adsV2PresenterV2AcceptMax(max: number): number { // KINEO-UGC-AJUSTES-2010
  const m = typeof max === 'number' && Number.isFinite(max) && max > 0 ? Math.floor(max) : ADS_V2_PRESENTER_V2_MAX_WORDS // KINEO-UGC-AJUSTES-2010
  return m + (ADS_V2_PRESENTER_V2_ACCEPT_MAX_WORDS - ADS_V2_PRESENTER_V2_MAX_WORDS) // KINEO-UGC-AJUSTES-2010 · KINEO-ADS-BOLA-2110 — a folga de 2 vale para qualquer teto (a régua por voz passa de 21); até 21 é o mesmo número de antes
} // KINEO-UGC-AJUSTES-2010

// ── 1b. a voz medida que passa do alvo: acelera de leve ou tira uma frase INTEIRA ────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — a escolha: até 8% acima do alvo (≤ 11,34 s), acelerar (speed ≤ 1,08) mantém o texto inteiro e não se ouve como pressa.
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — Acima disso, acelerar mais soa como locutor de bula: tira a frase do MEIO mais longa (nunca a 1ª, o gancho, nem a última, o
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — nome/chamada; nunca meia frase) e, se ainda precisar, acelera o resto até 1,08. Sem frase do meio para tirar = acelera 1,08 e
// KINEO-APRESENTADOR-V2-AJUSTE-1710 — aceita passar um pouco do alvo (passar é bom; amputar a fala, nunca). Voz sem `speed` (a voz de hoje em EN/ES/homem) só corta.
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — o que foi feito, gravado no pedido (plan.presenter.v2.voiceFit) e no evento da montagem. */
export interface AdsV2PresenterV2VoiceFitRecord { action: 'speed' | 'cut' | 'extend'; speed: number; wordsBefore: number; wordsAfter: number; secondsBefore: number } // KINEO-ADS-BOLA-2110 — + 'extend' (a voz curta ganhou uma frase e/ou desacelerou)
export type AdsV2PresenterV2VoiceFit = { action: 'ok' } | { action: 'speed' | 'cut' | 'extend'; speed: number; text: string } // KINEO-ADS-BOLA-2110 — + 'extend'
const wordsOfV2 = (t: string): number => String(t ?? '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length // KINEO-APRESENTADOR-V2-AJUSTE-1710 · KINEO-ADS-BOLA-2110 — o travessão de "Conheça — bola" não conta como palavra
const up2 = (n: number): number => Math.ceil(n * 100 - 1e-6) / 100 // KINEO-APRESENTADOR-V2-AJUSTE-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a decisão (pura). `seconds` = a voz MEDIDA; `canSpeed` = a voz aceita voice_setting.speed (a MiniMax com voice id). */
export function adsV2PresenterV2VoiceFit(i: { seconds: number; text: string; canSpeed: boolean; target?: number; language?: string | null }): AdsV2PresenterV2VoiceFit { // KINEO-ADS-BOLA-2110 — + language (a frase a mais da voz curta)
  const target = typeof i?.target === 'number' && i.target > 0 ? i.target : ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS
  const s = Number(i?.seconds)
  const text = String(i?.text ?? '').replace(/\s+/g, ' ').trim()
  if (s > 0 && text && s < ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS - 1e-9) return adsV2PresenterV2VoiceExtend({ seconds: s, text, canSpeed: i.canSpeed === true, language: i.language ?? null }) // KINEO-ADS-BOLA-2110 — voz CURTA (anúncio < 14,5 s): uma frase a mais e/ou desacelera até 0,92 ANTES de montar
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
  return freeHand === true ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_LIVELY : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_LIVELY // KINEO-ADS-QUALIDADE-2110 — a atuação viva para toda foto (fundador 21/10: "não tem muita movimentação dela"); a pose nova tem 1 mão só
}
/** KINEO-ADS-QUALIDADE-2110 — a atuação viva que vai ao motor (olhos abertos primeiro, a lista do que evitar no fim). */
export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_LIVELY = adsV2PresenterV2EyesFirst(ADS_V2_PRESENTER_LIVELY_PROMPT) // KINEO-ADS-QUALIDADE-2110
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a atuação que vai ao motor (pura): a da linha se for uma das duas do v2; qualquer outra (a de 09/10) = a das mãos paradas. */
export function adsV2PresenterV2PerformanceOf(rowPrompt: string | null | undefined): string {
  return typeof rowPrompt === 'string' || rowPrompt == null ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_LIVELY : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL // KINEO-ADS-QUALIDADE-2110 — toda linha do v2 sai com a atuação viva · KINEO-APRESENTADOR-OLHOS-1910 — a linha planejada ANTES desta entrega (texto da R3) também sai com os olhos abertos; qualquer outra = a das mãos paradas
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
export const ADS_V2_PRESENTER_V2_HANDS_QUESTION = 'Image 1 is a photo of a person with a product. "product_whole": is the WHOLE product inside the frame? "no" when any part of the product is cut by or touches the edge of the image, "yes" when it is entirely visible with some space around it, "unsure" when you cannot tell. How many separate hands are visible? Count each human hand once. "hand_count": that number. "hands": one entry per hand; for each: is it holding the product? "holding_product": "yes" or "no". And "whole": "yes" when the entire hand is inside the frame and in view (fingers wrapped around the product still count), "no" when part of it is cut by the edge of the frame or hidden, "unsure" when you cannot tell. "phone_ui": is there any phone camera interface, on-screen buttons or overlaid text drawn in the image? "yes", "no" or "unsure" (the printed label on the product itself does not count).' + ADS_V2_PRESENTER_POSE_QUESTION + ' Answer with JSON: {"product_whole": "", "hand_count": 0, "hands": [{"holding_product": "", "whole": ""}], "phone_ui": "", ' + ADS_V2_PRESENTER_POSE_JSON + '}.' // KINEO-ADS-QUALIDADE-2110 — + a pose (encostando no rosto, altura, segurado, escala) na MESMA chamada · KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "how many separate hands are visible; for each: is it holding the product (yes/no)" + a interface de celular · KINEO-ADS-BOLA-2110 — + "product_whole" (produto cortado na borda = a opção perde)
export type AdsV2PresenterV2Tri = 'yes' | 'no' | 'unsure'
export interface AdsV2PresenterV2Hands { hands: { holds: AdsV2PresenterV2Tri; whole: AdsV2PresenterV2Tri }[]; count?: number | null; phoneUi?: AdsV2PresenterV2Tri; productWhole?: AdsV2PresenterV2Tri; pose?: AdsV2PresenterPose } // KINEO-ADS-QUALIDADE-2110 — + a pose · KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — + a contagem e a interface de celular · KINEO-ADS-BOLA-2110 — + o produto inteiro no quadro
const triV2 = (v: unknown): AdsV2PresenterV2Tri => (v === 'yes' || v === true ? 'yes' : v === 'no' || v === false ? 'no' : 'unsure') // KINEO-APRESENTADOR-V2-AJUSTE-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a resposta (pura): texto JSON ou objeto; sem lista "hands" = null (ilegível). */
export function adsV2PresenterV2ParseHands(raw: unknown): AdsV2PresenterV2Hands | null {
  let o: unknown = raw
  if (typeof raw === 'string') { try { o = JSON.parse(raw) } catch { return null } }
  const list = o && typeof o === 'object' ? (o as { hands?: unknown }).hands : null
  if (!Array.isArray(list)) return null
  const count = (o as { hand_count?: unknown }).hand_count // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  return { hands: list.filter((h) => h && typeof h === 'object').map((h) => ({ holds: triV2((h as { holding_product?: unknown; holds_product?: unknown }).holding_product ?? (h as { holds_product?: unknown }).holds_product), whole: triV2((h as { whole?: unknown }).whole) })), count: typeof count === 'number' && Number.isFinite(count) ? count : null, phoneUi: triV2((o as { phone_ui?: unknown }).phone_ui), productWhole: triV2((o as { product_whole?: unknown }).product_whole), pose: adsV2ParsePresenterPose(o) } // KINEO-ADS-QUALIDADE-2110 — + a pose · KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — holding_product (a pergunta nova) + hand_count + phone_ui · KINEO-ADS-BOLA-2110 — + product_whole
}
/** KINEO-APRESENTADOR-V2-AJUSTE-1710 — a mão LIVRE aparece inteira? (pura) 2+ mãos e uma que NÃO segura o produto (ou "não sei") está inteira. null = ilegível. */
export function adsV2PresenterV2FreeHandOf(inv: AdsV2PresenterV2Hands | null | undefined): boolean | null {
  if (!inv || !Array.isArray(inv.hands)) return null
  if (inv.hands.length !== 2 || (inv.count != null && inv.count !== 2)) return false // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — EXATAMENTE 2 mãos distintas (a lista e a contagem concordam)
  const holding = inv.hands.filter((h) => h.holds === 'yes' && h.whole === 'yes').length // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const free = inv.hands.filter((h) => h.holds === 'no' && h.whole === 'yes').length // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — "yes"/"no" firmes: "unsure" nunca confirma
  return holding === 1 && free === 1 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — uma no produto, outra vazia, as duas inteiras; a R2 contou a mão do frasco como livre
}
export type AdsV2PresenterV2HandWhy = 'clean_free_hand' | 'clean_no_free_hand' | 'all_cut' // KINEO-ADS-BOLA-2110 — + 'all_cut': toda opção limpa tinha o produto cortado (fica a menos ruim)
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
// KINEO-UGC-AJUSTES-2010 — revalidação de 20/10 (docs/REVALIDACAO-8-APRESENTADORES-2026-10-20.md): Jade 8 e Robert 8 passaram com os olhos abertos; os outros 6 seguem "em teste".
export const ADS_V2_PRESENTER_V2_APPROVED: readonly string[] = ['sofia', 'amara', 'rahul', 'kenji', 'jade', 'robert'] // KINEO-UGC-AJUSTES-2010 — era: os 4 aprovados de 19/10 (Sofia, Amara, Rahul, Kenji)
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
// ══ KINEO-ADS-BOLA-2110 — o anúncio "— bola de futebol" (pedido 618a6680, 21/10): 15 s saíram 12,3 s; a bola saiu cortada na borda ══════════════════════════
// ── 3. a régua pelo RITMO MEDIDO da voz ────────────────────────────────────────────────────────────────────────────────────────────────────── // KINEO-ADS-BOLA-2110
// Medido em produção (22 anúncios com apresentador de 17 a 21/10, voice_seconds do ads_v2_assembling × as palavras faladas do roteiro gravado): // KINEO-ADS-BOLA-2110
// Portuguese_ConfidentWoman 2,14 pal/s em 18 renders (1,67 a 2,48: a mesma voz varia ±15% de um texto para outro); EN (MiniMax padrão / ElevenLabs) // KINEO-ADS-BOLA-2110
// 1,89 pal/s em 5. O "2,6 pal/s" do diagnóstico veio de UM render (o da bola: 19 palavras em 7,67 s, no topo da faixa). O defeito real foi a régua // KINEO-ADS-BOLA-2110
// de 19 palavras (o modelo escreve no piso) + nenhum conserto para voz CURTA. Agora: a régua mira ~10,5 s no ritmo medido de cada voz e a voz medida // KINEO-ADS-BOLA-2110
// abaixo de 9,85 s (anúncio < 14,5 s) ganha uma frase e/ou desacelera ANTES da montagem (adsV2PresenterV2VoiceExtend). Os filmes não mudam. // KINEO-ADS-BOLA-2110
/** Ritmo medido (palavras faladas por segundo) por voice id da MiniMax. */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_PACE_BY_VOICE: Readonly<Record<string, number>> = { Portuguese_ConfidentWoman: 2.14 } // KINEO-ADS-BOLA-2110
/** Ritmo medido por língua para a voz de hoje ('current': MiniMax padrão / ElevenLabs do retrato). Fora da tabela = ADS_V2_PRESENTER_V2_WPS. */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_PACE_BY_LANGUAGE: Readonly<Record<string, number>> = { pt: 2.14, en: 1.89, es: 2.1 } // KINEO-ADS-BOLA-2110
/** O ritmo da voz que o anúncio vai usar (puro). */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2Pace(language: string | null | undefined, gender: 'woman' | 'man' | null | undefined): number { // KINEO-ADS-BOLA-2110
  const v = adsV2PresenterV2VoiceFor(language, gender) // KINEO-ADS-BOLA-2110
  const lang = String(language ?? '').toLowerCase().slice(0, 2) // KINEO-ADS-BOLA-2110
  const pace = v.engine === 'minimax' ? ADS_V2_PRESENTER_V2_PACE_BY_VOICE[v.voiceId] : ADS_V2_PRESENTER_V2_PACE_BY_LANGUAGE[lang] // KINEO-ADS-BOLA-2110
  return typeof pace === 'number' && pace > 0 ? pace : ADS_V2_PRESENTER_V2_WPS // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
/** A janela da fala (s) que a régua mira: 10,2 a 11,2 s (no centro, 10,5 + 0,15 + 2 + 2,5 ≈ 15 s de anúncio). */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_SPEECH_WINDOW_SECONDS: Readonly<{ min: number; max: number }> = { min: 10.2, max: 11.2 } // KINEO-ADS-BOLA-2110
/** A régua de palavras da voz (pura): PT ConfidentWoman 22–24; EN 19–21 (o mesmo de antes); ES 21–24. */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2PaceWords(language: string | null | undefined, gender: 'woman' | 'man' | null | undefined): { min: number; max: number } { // KINEO-ADS-BOLA-2110
  const pace = adsV2PresenterV2Pace(language, gender) // KINEO-ADS-BOLA-2110
  const min = Math.round(pace * ADS_V2_PRESENTER_V2_SPEECH_WINDOW_SECONDS.min) // KINEO-ADS-BOLA-2110
  return { min, max: Math.max(min, Math.round(pace * ADS_V2_PRESENTER_V2_SPEECH_WINDOW_SECONDS.max)) } // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
// ── 3b. a voz medida CURTA: uma frase a mais e/ou desacelera ───────────────────────────────────────────────────────────────────────────────── // KINEO-ADS-BOLA-2110
/** O piso da voz MEDIDA (s): 14,5 s de anúncio − (0,15 + close 2 + cartão 2,5). Abaixo disso o anúncio de 15 s sai curto (a bola: 7,67 s → 12,3 s). */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS = 9.85 // KINEO-ADS-BOLA-2110
/** Quanto a voz pode desacelerar (voice_setting.speed): 8% mais lenta ainda soa natural (o espelho do 1,08 de acelerar). */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_MIN_SPEED = 0.92 // KINEO-ADS-BOLA-2110
/** A pausa que um ponto final acrescenta na voz (s), na estimativa da frase a mais. */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_SENTENCE_PAUSE_SECONDS = 0.35 // KINEO-ADS-BOLA-2110
/** As frases a mais, por língua: chamada neutra (sem número, sem fama, sem gênero gramatical do produto, sem "loja"). Fora da tabela = só desacelera. */ // KINEO-ADS-BOLA-2110
export const ADS_V2_PRESENTER_V2_EXTEND_SENTENCES: Readonly<Record<string, readonly string[]>> = { // KINEO-ADS-BOLA-2110
  pt: ['Peça agora mesmo.', 'Aproveite e garanta já.'], // KINEO-ADS-BOLA-2110
  en: ['Order yours today.', 'Get it now.'], // KINEO-ADS-BOLA-2110
  es: ['Pídelo ahora mismo.', 'Aprovecha y consíguelo ya.'], // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
const down2 = (n: number): number => Math.floor(n * 100 + 1e-6) / 100 // KINEO-ADS-BOLA-2110
/** A decisão para a voz CURTA (pura): 1ª frase a mais; ainda curta = desacelera até 0,92; ainda curta = a 2ª frase. Nada a fazer = 'ok'. */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2VoiceExtend(i: { seconds: number; text: string; canSpeed: boolean; language?: string | null }): AdsV2PresenterV2VoiceFit { // KINEO-ADS-BOLA-2110
  const s = Number(i?.seconds) // KINEO-ADS-BOLA-2110
  const text = String(i?.text ?? '').replace(/\s+/g, ' ').trim() // KINEO-ADS-BOLA-2110
  if (!(s > 0) || !text || s >= ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS) return { action: 'ok' } // KINEO-ADS-BOLA-2110
  const perWord = s / Math.max(1, wordsOfV2(text)) // KINEO-ADS-BOLA-2110
  const pool = ADS_V2_PRESENTER_V2_EXTEND_SENTENCES[String(i?.language ?? '').toLowerCase().slice(0, 2)] ?? [] // KINEO-ADS-BOLA-2110
  let out = text // KINEO-ADS-BOLA-2110
  let est = s // KINEO-ADS-BOLA-2110
  const add = (sentence: string): void => { // KINEO-ADS-BOLA-2110
    if (out.toLowerCase().includes(sentence.toLowerCase())) return // KINEO-ADS-BOLA-2110
    out = `${/[.!?…]$/u.test(out) ? out : `${out}.`} ${sentence}` // KINEO-ADS-BOLA-2110
    est += wordsOfV2(sentence) * perWord + ADS_V2_PRESENTER_V2_SENTENCE_PAUSE_SECONDS // KINEO-ADS-BOLA-2110
  } // KINEO-ADS-BOLA-2110
  const speedFor = (): number => (i.canSpeed === true && est < ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS ? Math.max(ADS_V2_PRESENTER_V2_MIN_SPEED, down2(est / ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS)) : 1) // KINEO-ADS-BOLA-2110
  if (pool[0]) add(pool[0]) // KINEO-ADS-BOLA-2110
  let speed = speedFor() // KINEO-ADS-BOLA-2110
  if (est / speed < ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS && pool[1]) { add(pool[1]); speed = speedFor() } // KINEO-ADS-BOLA-2110
  if (out === text && speed === 1) return { action: 'ok' } // KINEO-ADS-BOLA-2110
  return { action: 'extend', speed, text: out } // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
// ── 2b. a escolha da foto: produto INTEIRO primeiro, depois 2 mãos ─────────────────────────────────────────────────────────────────────────── // KINEO-ADS-BOLA-2110
/** O produto encosta na borda do quadro? (pura) Retângulo em frações; a 1,5% da borda conta como encostado. null = não sei. */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2RectAtEdge(rect: AdsV2PresenterV2Rect | null | undefined): boolean | null { // KINEO-ADS-BOLA-2110
  if (!rect || ![rect.x0, rect.y0, rect.x1, rect.y1].every((n) => typeof n === 'number' && Number.isFinite(n))) return null // KINEO-ADS-BOLA-2110
  const e = 0.015 // KINEO-ADS-BOLA-2110
  return rect.x0 <= e || rect.y0 <= e || rect.x1 >= 1 - e || rect.y1 >= 1 - e // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
/** O produto inteiro no quadro, pela checagem das mãos (pura): 'yes' / 'no' / 'unsure'; null = a checagem não leu. */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2ProductWholeOf(inv: AdsV2PresenterV2Hands | null | undefined): AdsV2PresenterV2Tri | null { // KINEO-ADS-BOLA-2110
  if (!inv || !Array.isArray(inv.hands)) return null // KINEO-ADS-BOLA-2110
  return inv.productWhole === 'yes' || inv.productWhole === 'no' ? inv.productWhole : 'unsure' // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
/** // KINEO-ADS-BOLA-2110
 * A escolha (pura). Descartada (frasco + caixa, ou interface de celular) só entra se TODAS forem; entre as outras, nesta ordem: produto inteiro // KINEO-ADS-BOLA-2110
 * ('yes' e sem encostar na borda) > não sei > cortado ('no' ou retângulo na borda); depois as 2 mãos confirmadas (uma no produto, outra livre) > // KINEO-ADS-BOLA-2110
 * exatamente 2 mãos > o resto; empate = a de menor índice. Todas descartadas = a regra de antes (adsV2PresenterV2PickClean). // KINEO-ADS-BOLA-2110
 */ // KINEO-ADS-BOLA-2110
export function adsV2PresenterV2PickWhole(i: { both: readonly (boolean | null)[]; freeHands: readonly (boolean | null)[]; phoneUi: readonly (AdsV2PresenterV2Tri | null)[]; productWhole: readonly (AdsV2PresenterV2Tri | null)[]; handCounts: readonly (number | null)[]; rects?: readonly (AdsV2PresenterV2Rect | null)[]; poses?: readonly (AdsV2PresenterPose | null)[] }): { index: number; why: AdsV2PresenterV2PickWhy | AdsV2PresenterV2HandWhy } { // KINEO-ADS-BOLA-2110 · KINEO-ADS-QUALIDADE-2110 — + poses
  const both = Array.isArray(i?.both) ? i.both : [] // KINEO-ADS-BOLA-2110
  const at = <T,>(list: readonly T[] | undefined, k: number): T | null => (Array.isArray(list) && k < list.length ? list[k] ?? null : null) // KINEO-ADS-BOLA-2110
  const live = both.map((_, k) => k).filter((k) => both[k] !== true && at(i.phoneUi, k) !== 'yes') // KINEO-ADS-BOLA-2110
  if (live.length === 0) return adsV2PresenterV2PickClean(both, Array.isArray(i?.freeHands) ? i.freeHands : [], Array.isArray(i?.phoneUi) ? i.phoneUi : []) // KINEO-ADS-BOLA-2110
  const cut = (k: number): number => { const w = at(i.productWhole, k); const edge = adsV2PresenterV2RectAtEdge(at(i.rects, k)); return w === 'no' || edge === true ? 2 : w === 'yes' ? 0 : 1 } // KINEO-ADS-BOLA-2110
  const handScore = (k: number): number => (at(i.handCounts, k) === 1 ? 0 : at(i.handCounts, k) === 2 && at(i.freeHands, k) !== true ? 1 : at(i.freeHands, k) === true ? 2 : 3) // KINEO-ADS-BOLA-2110 · KINEO-ADS-QUALIDADE-2110 — a pose nova tem 1 mão (a outra fora do quadro); a mão livre no peito ficou por último
  const poseS = (k: number): number => adsV2PresenterPoseScore(at(i.poses, k), at(i.handCounts, k)) // KINEO-ADS-QUALIDADE-2110
  const poseB = (k: number): number => (poseS(k) >= 100 ? 2 : poseS(k) >= 30 ? 1 : 0) // KINEO-ADS-QUALIDADE-2110 — encostando no rosto / flutuando / mãos demais = recusa; escala errada ou no rosto = pior que qualquer limpa
  const best = live.slice().sort((a, b) => poseB(a) - poseB(b) || cut(a) - cut(b) || poseS(a) - poseS(b) || handScore(a) - handScore(b) || a - b)[0] // KINEO-ADS-BOLA-2110 · KINEO-ADS-QUALIDADE-2110 — a pose natural decide primeiro, depois o produto inteiro
  const why: AdsV2PresenterV2PickWhy | AdsV2PresenterV2HandWhy = cut(best) === 2 ? 'all_cut' : both[best] === null ? 'unchecked' : at(i.freeHands, best) === true ? 'clean_free_hand' : 'clean_no_free_hand' // KINEO-ADS-BOLA-2110
  return { index: best, why } // KINEO-ADS-BOLA-2110
} // KINEO-ADS-BOLA-2110
