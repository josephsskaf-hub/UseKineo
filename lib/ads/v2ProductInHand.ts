// KINEO-ADS-PRODUTO-NA-MAO-1610 — "PESSOA SEGURANDO O PRODUTO REAL" no nível Comercial do Studio Ads v2, no lugar da colagem.
//
// O PORQUÊ (docs/ESTUDO-PRODUTO-NA-CENA-LIDERES-2026-10-16.md, seções 3 e 4, pipeline A; docs/RESULTADO-TESTE-PRODUTO-NA-MAO-2026-10-16.md):
// a trava antiga ESCONDE o produto do Nano Banana e COLA o recorte num canto (escala de 28% do quadro, sem sombra, sem mão, a
// mesma luz de estúdio em toda cena) e, com 1 foto, o Comercial passava ~8,5 de 15 s em fundo branco. O teste de 16/10 (Atheeri)
// provou o caminho dos líderes: o Nano Banana Pro edit com a FOTO REAL do produto como referência põe a caixa NA MÃO de uma pessoa,
// com a escala da mão e a luz da cena, sem redesenhar a embalagem (nome, árabe, abelha e favo certos; só o texto pequeno deforma);
// o Kling O3 anima com movimento humano (nota do fundador 8/10: "faltou o movimento do rosto e o movimento das mãos… a gente busca
// a duplicação do corpo humano"). O defeito do vídeo (a caixa gira, achata e cresce) mora no FIM do clipe: usamos só o começo, e
// SEM quadro final: KINEO-ADS-MAO-AJUSTE-1610 — o T1 (docs/RESULTADO-T1-PRODUTO-NA-MAO-2026-10-16.md) e a comparação (docs/RESULTADO-COMPARA-MOVIMENTO-2026-10-16.md)
// KINEO-ADS-MAO-AJUSTE-1610 — provaram que o end_image_url = a foto inicial CONGELA a pessoa (YDIF 0,1–0,8) e leva 212–233 s; sem ele, 9/10 em 97 s.
// KINEO-ADS-MAO-AJUSTE-1610 — Cada plano ganha UMA ação com propósito (pela categoria do produto), "lips closed, not speaking", câmera na mão em
// KINEO-ADS-MAO-AJUSTE-1610 — tempo real; reserva no MiniMax H3 cortada em ≤ 2,5 s; juiz com cor, material e quantidade; cena com os sinais do lugar.
// KINEO-ADS-MAO-AJUSTE-3-1610 — 3ª rodada (docs/RESULTADO-T1-MAO-AJUSTE-2026-10-16.md, notas 7/8/7/7/6): foto de frasco + caixa = UM objeto por plano (frasco no
// KINEO-ADS-MAO-AJUSTE-3-1610 — gancho e no borrifo, caixa no rótulo e no close) e o juiz reprova os dois juntos; ninguém além da pessoa (o juiz pergunta); o plano do
// KINEO-ADS-MAO-AJUSTE-3-1610 — rótulo vira uma mão inclinando o objeto; borrifo cortado em 2,3 s; packshot + cartão 4 s (era 5,5) e os planos de gente ganham o tempo.
//
// O PLANO NOVO (Comercial 15 s, só contas internas — ADS_V2_IN_HAND_MODE):
//   0,0–2,0  GANCHO     pessoa na cena traz o produto para o quadro (nunca o packshot branco)      Nano Banana + Kling O3
//   2,0–4,5  USO 1      a pessoa segura o produto na palma, rótulo de frente (o prompt aprovado)  Nano Banana + Kling O3
//   4,5–7,0  USO 2      a pessoa usa o produto (uma mão segura, a outra toca)                      Nano Banana + Kling O3
//   7,0–9,5  CLOSE      a mão com o produto perto da câmera, dentro da cena                        Nano Banana + Kling O3
//   9,5–12,5 PACKSHOT   a foto REAL do produto, parada, com o zoom do montador (o rótulo 100% fiel) sem IA
//   12,5–15  CARTÃO     o de sempre (ADS_V2_CARD_SECONDS)
// Packshot + cartão = 5,5 s (era ~8,5). Os planos somam 12,5 s como antes: duração, frases de tela (terços de 12,5 s), narração,
// créditos (adsV2Credits só depende do nível e da duração = 41) e formatos ficam iguais.
//
// O JUIZ DO RÓTULO (lib/ads/v2LockVision.ts adsV2InHandLabelJudge — a mesma chamada de visão da trava): compara o produto do still
// com a foto original (nome/logo, cores, forma, mãos, um produto só). Divergiu → refaz 1 vez; de novo → o plano vira um
// enquadramento SEM o rótulo de frente; de novo → a foto real do produto (o fallback de sempre). Cada veredito vira o evento
// 'ads_v2_product_locked' com mode 'in_hand' (o evento da trava que já existe; nenhum nome novo). Juiz fora do ar = a imagem segue (a regra das conferências da trava).
//
// A COLAGEM ANTIGA fica no código e continua sendo o caminho de quem NÃO é interno — e o de todo pedido que não cabe aqui
// (Foto em movimento, Premium, 20/30 s, estilo, ator, vídeo do cliente, pedido sem foto de produto).
//
// LIB PURA, SEM IMPORT DE VALOR (só tipos): os guardiões antigos carregam lib/ads/v2Advance.ts e o núcleo do /plan com listas FECHADAS de
// módulos; por isso o avanço e o /plan carregam esta lib por import DINÂMICO (falha = o plano de antes) e as constantes que ela usa são
// ESPELHOS — o guardião scripts/test-ads-produto-na-mao-1610.mjs confere cada uma contra a original.
import type { AdsV2Beat, AdsV2Format, AdsV2PlannedShot, AdsV2Role } from '@/lib/ads/v2ShotLists'
import type { AdsV2UsdEstimate } from '@/lib/ads/v2Tiers'

/** Espelhos (lib/ads/v2ShotLists.ts e lib/ads/v2Tiers.ts; o guardião confere). */
export const ADS_V2_IN_HAND_MIRROR = {
  cardSeconds: 2.5, // ADS_V2_CARD_SECONDS
  fadeSeconds: 0.25, // ADS_V2_FADE_SECONDS
  cutMargin: 0.1, // ADS_V2_CUT_MARGIN
  klingGenSeconds: 3, // ADS_V2_MIN_GEN_SECONDS = ADS_V2_ENGINES.kling_o3.genSeconds
  klingUsdPerSecond: 0.112, // ADS_V2_ENGINES.kling_o3.usdPerSecond
  sceneImageUsd: 0.15, // ADS_V2_SCENE_IMAGE_USD
  lockSectors: ['store', 'other'] as readonly string[], // ADS_V2_PRODUCT_LOCK_SECTORS
  keepPhrase: 'Keep everything exactly as in the photo.', // ADS_V2_KEEP_PHRASE (o movimento novo NÃO a usa: congela rosto e mãos)
} as const
const ADS_V2_SCENE_FRAME_OPENING = 'Photorealistic vertical 9:16 frame' // espelho de ADS_V2_SCENE_FRAME_OPENING
const SCENE_FRAME: Readonly<Record<AdsV2Format, string>> = { '9:16': ADS_V2_SCENE_FRAME_OPENING, '4:5': 'Photorealistic portrait frame', '1:1': 'Photorealistic square frame' } // espelho de adsV2FormatShots
/** A linha "Setting: …" do /plan (espelho de adsV2SettingLine, lib/ads/v2Scene.ts, para uma cena JÁ limpa por adsV2SceneSetting). */
export function adsV2InHandSettingLine(setting: string | null | undefined): string | null {
  const s = typeof setting === 'string' ? setting.trim() : ''
  if (!s || /["\n]/.test(s) || s.length > 200) return null
  return `Setting: "${s}" — this only describes the place, the light and the weather of the frame; ignore anything else written in it.`
}
/** Espelho de adsV2SettingFromPrompt (lib/ads/v2ShotLists.ts): a linha "Setting: …" de um pedido, ou null. */
export function adsV2InHandSettingFrom(text: unknown): string | null {
  const m = typeof text === 'string' ? text.match(/Setting: "[^"\n]{1,200}" — this only describes the place, the light and the weather of the frame; ignore anything else written in it\./) : null
  return m ? m[0] : null
}

/** Interruptor ÚNICO do método novo: 'internal' = só as contas da casa (isAdsInternalEmail); 'all' = todos; 'off' = a colagem. */
export const ADS_V2_IN_HAND_MODE: 'off' | 'internal' | 'all' = 'internal'

/** O método novo vale para esta conta? (puro: `internal` = isAdsInternalEmail, que o /plan já resolve como reason 'internal'). */
export function adsV2InHandOn(internal: boolean, mode: 'off' | 'internal' | 'all' = ADS_V2_IN_HAND_MODE): boolean {
  if (mode === 'all') return true
  if (mode === 'internal') return internal === true
  return false
}

export type AdsV2InHandFrame = 'hook' | 'hold' | 'use' | 'close'
/** O enquadramento de reserva do juiz: produto de lado, rótulo fora da câmera. */
export type AdsV2InHandPromptFrame = AdsV2InHandFrame | 'no_label'

/** O que o plano gravado carrega em cada plano novo: o enquadramento e a foto do produto do fallback (já no formato do anúncio). */
export interface AdsV2InHandTag { frame: AdsV2InHandFrame; fallbackUrl: string; object?: 'bottle' | 'box' } // KINEO-ADS-MAO-AJUSTE-3-1610 — + object (foto com frasco + caixa)

export type AdsV2InHandShot = AdsV2PlannedShot & { inHand?: AdsV2InHandTag }

/** Os 4 planos de gente com o produto (a ordem é a linha do tempo). */
export const ADS_V2_IN_HAND_SLOTS: readonly { role: AdsV2Role; beat: AdsV2Beat; cut: number; frame: AdsV2InHandFrame; start: number }[] = [ // KINEO-ADS-MAO-AJUSTE-3-1610 — + start (o início do trecho no clipe)
  { role: 'hook', beat: 'hook', cut: 2.5, frame: 'hook', start: 0.15 }, // KINEO-ADS-MAO-AJUSTE-3-1610 — 2,0 → 2,5 s (clipe de 3 s: 0,15 + 2,5 + dissolve 0,25 = 2,9)
  { role: 'use', beat: 'use_emotion', cut: 3.1, frame: 'hold', start: 0.15 }, // KINEO-ADS-MAO-AJUSTE-3-1610 — 2,5 → 3,1 s (clipe de 4 s)
  { role: 'use', beat: 'use_emotion', cut: 2.3, frame: 'use', start: 0 }, // KINEO-ADS-MAO-AJUSTE-3-1610 — borrifo: 2,5 → 2,3 s desde o 0 (a cabeça entra de cima aos ~2,5 s do clipe)
  { role: 'product', beat: 'place_product', cut: 3.1, frame: 'close', start: 0.15 }, // KINEO-ADS-MAO-AJUSTE-3-1610 — 2,5 → 3,1 s (clipe de 4 s)
]
/** O packshot REAL (foto parada com o zoom do montador). KINEO-ADS-MAO-AJUSTE-3-1610 — Packshot + cartão = 1,5 + 2,5 = 4,0 s (era 3,0 + 2,5 = 5,5 s parados). */
export const ADS_V2_IN_HAND_PACKSHOT_SECONDS = 1.5 // KINEO-ADS-MAO-AJUSTE-3-1610 — era 3,0
/** Packshot + cartão (o alvo da tarefa: ≤ ~6 s; era ~8,5). KINEO-ADS-MAO-AJUSTE-3-1610 — agora ~4 s. */
export const ADS_V2_IN_HAND_PACKSHOT_CARD_SECONDS = Math.round((ADS_V2_IN_HAND_PACKSHOT_SECONDS + ADS_V2_IN_HAND_MIRROR.cardSeconds) * 1000) / 1000

/**
 * Início do trecho no clipe do Kling O3 (3 s, a menor duração do schema): pula só o 1º quadro parado e usa o COMEÇO do clipe —
 * no teste de 16/10 o giro e o crescimento da caixa aconteceram no fim. Com o corte de 2,5 s o trecho vai até 2,65 s (+ dissolve
 * 2,9 ≤ 3,0 − margem 0,1).
 */
export const ADS_V2_IN_HAND_CUT_START = 0.15
/** Duração pedida ao Kling O3 (enum string '3'..'15' no schema da fal; a mínima). */
export const ADS_V2_IN_HAND_GEN_SECONDS = '3' as const
/** KINEO-ADS-MAO-AJUSTE-3-1610 — as durações do Kling O3 que o plano novo usa (enum string do schema da fal; 3 = a mínima, 4 = o plano de gente mais longo). */
export type AdsV2InHandGenSeconds = '3' | '4' | '5' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a menor duração do Kling O3 em que o trecho [início, início + corte] + o dissolve cabem com a margem (3 s quando cabe; nunca > 5). Pura. */
export function adsV2InHandGenSeconds(cutStart: number, cut: number): AdsV2InHandGenSeconds { // KINEO-ADS-MAO-AJUSTE-3-1610
  const m = ADS_V2_IN_HAND_MIRROR // KINEO-ADS-MAO-AJUSTE-3-1610
  const st = typeof cutStart === 'number' && Number.isFinite(cutStart) && cutStart > 0 ? cutStart : 0 // KINEO-ADS-MAO-AJUSTE-3-1610
  const c = typeof cut === 'number' && Number.isFinite(cut) && cut > 0 ? cut : 0 // KINEO-ADS-MAO-AJUSTE-3-1610
  for (const d of [3, 4, 5] as const) if (st + c + m.fadeSeconds <= d - m.cutMargin + 1e-9) return String(d) as AdsV2InHandGenSeconds // KINEO-ADS-MAO-AJUSTE-3-1610
  return '5' // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610

/** Mais de uma referência no máximo (2ª foto do produto + até 2 do lugar): o modelo também vê o produto de outro lado e o lugar. */
export const ADS_V2_IN_HAND_MAX_REFS = 4

// ── o pedido da foto da cena (Nano Banana Pro edit, a foto REAL do produto como 1ª referência) ────────────────────────────
/** A ação de cada enquadramento. Generalização do prompt do teste aprovado em 16/10 (mulher no quarto de hotel com chuva, caixa na palma). */
export const ADS_V2_IN_HAND_ACTIONS: Readonly<Record<AdsV2InHandPromptFrame, string>> = {
  hook: 'An ordinary non-famous adult in this place brings the product from the FIRST reference photo into view, holding it up beside their face and looking at it with a curious, happy expression; the front of the product faces the camera.',
  hold: 'An ordinary non-famous adult in this place holds the product from the FIRST reference photo in the palm of one hand, a short distance in front of their chest, the front label facing the camera and clearly visible, and looks at it with a soft smile.',
  use: 'An ordinary non-famous adult in this place uses the product from the FIRST reference photo in a natural, everyday way: one hand holds it steady while the other hand touches it as if opening or applying it; the front label stays visible.',
  close: 'Close-up inside this same place: a hand holds the product from the FIRST reference photo near the camera, the product is sharp and fills about a third of the frame, and the person is softly out of focus behind it.',
  no_label: 'An ordinary non-famous adult in this place holds the product from the FIRST reference photo in one hand, turned to the side so the front label does NOT face the camera; the product is a little out of focus and the face and hands of the person are the subject.',
}

/** A frase que pede o produto IGUAL (pedida explicitamente pela tarefa). */
export const ADS_V2_IN_HAND_KEEP_PACKAGING = 'Use the FIRST reference photo as the exact product: keep the packaging design, colors, logo and printed text exactly as in the reference, with the same shape and proportions. Do not redesign, rename, resize or add anything to the product.'
/** Escala pela mão, luz e sombra da cena, mãos de verdade, um produto só. Sem dígitos (a régua anti-invenção do /plan). */
export const ADS_V2_IN_HAND_RULES: readonly string[] = [
  'Real-life scale: the product has exactly its real size in an adult hand; the hand is the ruler, never an oversized product.',
  'The light of the place falls on the product: the same light direction and color temperature as the scene, soft shadows of the fingers on the packaging and natural reflections.',
  'The fingers wrap naturally around the product and overlap its edges; every hand has five natural fingers; nothing passes through the product.',
  'Exactly one product in the frame: no second bottle, box, package or other product anywhere.',
  'A candid, unposed moment with a shallow depth of field, like a real phone photo: real skin texture, everyday clothes, natural eyes and expression.',
  'No text, captions, logos or watermarks added to the image; the product keeps its own printed label.',
]
/** KINEO-ADS-MAO-AJUSTE-1610 — pedido de UM produto só (uma foto de produto): nada de frasco ou caixa a mais (sem "only this", que a régua anti-invenção lê como urgência). */
export const ADS_V2_IN_HAND_SINGLE_PRODUCT = 'This single product only, with no extra bottles or boxes: it appears exactly once in the frame.' // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — ninguém além da pessoa (o T1 do ajuste trouxe um homem na cama ao fundo e um olho entrando pela borda). Em TODO plano in_hand. */
export const ADS_V2_IN_HAND_NO_OTHER_PEOPLE = 'No other people in the frame besides the one person: nobody in the background, and no other face, eye, hand or body part entering from the edges of the frame.' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a foto do produto mostra o frasco E a caixa: cada plano mostra UM objeto. */
export type AdsV2InHandObject = 'bottle' | 'box' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — o objeto de cada enquadramento quando a foto tem os dois: o frasco no gancho e no borrifo, a caixa no rótulo e no close (ela sai perfeita). */
export const ADS_V2_IN_HAND_PAIR_OBJECT: Readonly<Record<AdsV2InHandFrame, AdsV2InHandObject>> = { hook: 'bottle', hold: 'box', use: 'bottle', close: 'box' } // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — o pedido do objeto único na foto da cena (o T1 do ajuste: frasco e caixa colados na mesma mão girando como um bloco). */
export const ADS_V2_IN_HAND_OBJECT_LINE: Readonly<Record<AdsV2InHandObject, string>> = { // KINEO-ADS-MAO-AJUSTE-3-1610
  bottle: 'The FIRST reference photo shows the bottle together with its box: show only the bottle, the box is not in the scene. The person holds just the bottle; the box appears nowhere in the frame.', // KINEO-ADS-MAO-AJUSTE-3-1610
  box: 'The FIRST reference photo shows the bottle together with its box: show only the box, the bottle is not in the scene. The person holds just the closed box; the bottle appears nowhere in the frame.', // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — o objeto do plano (puro): só quando a foto tem os dois (pair === true); senão null (produto de um objeto só: nada muda). */
export function adsV2InHandObjectFor(frame: AdsV2InHandPromptFrame, pair: boolean | null | undefined): AdsV2InHandObject | null { // KINEO-ADS-MAO-AJUSTE-3-1610
  if (pair !== true || frame === 'no_label') return null // KINEO-ADS-MAO-AJUSTE-3-1610
  return ADS_V2_IN_HAND_PAIR_OBJECT[frame] ?? null // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — os sinais do lugar pedido (o T1 pediu "hotel" e saiu uma janela genérica). A frase da cena do cliente manda: só escolhemos objetos típicos. */
export const ADS_V2_IN_HAND_PLACE_CUES: readonly { re: RegExp; cue: string }[] = [ // KINEO-ADS-MAO-AJUSTE-1610 — a 1ª que bater vence (texto sem acento, minúsculo)
  { re: /\b(hotel|hoteis|motel|resort|pousada|hostel|suite)\b/, cue: 'a hotel room: a neatly made bed with crisp white sheets, heavy curtains and a bedside lamp' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(kitchen|cozinha|cocina)\b/, cue: 'a home kitchen: a countertop, cabinets and everyday kitchen objects' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(bathroom|banheiro|bano|lavabo|toilet)\b/, cue: 'a bathroom: a mirror, a sink and folded towels' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(gym|academia|gimnasio)\b/, cue: 'a gym: weights, training machines and a rubber floor' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(office|escritorio|oficina|coworking)\b/, cue: 'an office: a desk, a laptop and an office chair' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(beach|praia|playa)\b/, cue: 'a beach: sand, the sea and open sky' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(car|carro|coche|auto)\b/, cue: 'inside a car: the seats, the dashboard and the side windows' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(cafe|cafeteria|coffee shop|padaria|bakery|panaderia)\b/, cue: 'a café: small tables, cups and a counter' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(restaurant|restaurante|bar)\b/, cue: 'a restaurant: set tables and warm ambient light' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(bedroom|quarto|dormitorio|habitacion)\b/, cue: 'a bedroom: a bed with pillows and a bedside table' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(living room|sala de estar|lounge)\b/, cue: 'a living room: a sofa, cushions and a coffee table' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(store|shop|loja|tienda|boutique|mercado|supermarket)\b/, cue: 'a shop: shelves and product displays' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(garden|jardim|jardin|park|parque)\b/, cue: 'a garden or park: plants, trees and grass' }, // KINEO-ADS-MAO-AJUSTE-1610
  { re: /\b(street|rua|calle|city|cidade|ciudad)\b/, cue: 'a city street: buildings, a sidewalk and passing life' }, // KINEO-ADS-MAO-AJUSTE-1610
] // KINEO-ADS-MAO-AJUSTE-1610
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a linha dos sinais do lugar (pura), a partir da linha "Setting: …" já limpa; sem lugar = null. */
export function adsV2InHandPlaceLine(settingLine: string | null | undefined): string | null { // KINEO-ADS-MAO-AJUSTE-1610
  const m = typeof settingLine === 'string' ? settingLine.match(/^Setting: "([^"\n]{1,200})"/) : null // KINEO-ADS-MAO-AJUSTE-1610
  if (!m) return null // KINEO-ADS-MAO-AJUSTE-1610
  const hit = ADS_V2_IN_HAND_PLACE_CUES.find((c) => c.re.test(fold(m[1]))) // KINEO-ADS-MAO-AJUSTE-1610
  return hit // KINEO-ADS-MAO-AJUSTE-1610
    ? `The place must read at a glance as ${hit.cue}; never a generic room with only a window.` // KINEO-ADS-MAO-AJUSTE-1610
    : 'The place must read at a glance as the one in the Setting line, with its typical objects in view; never a generic room with only a window.' // KINEO-ADS-MAO-AJUSTE-1610
} // KINEO-ADS-MAO-AJUSTE-1610
/** Sem a cena da pessoa (a frase não pediu lugar): uma casa de verdade com luz de janela. */
export const ADS_V2_IN_HAND_DEFAULT_PLACE = 'Place: a real, lived-in home with soft natural window light.'
const EXTRA_REFS_LINE = 'Any other reference photo only shows more of the same product or the place; never copy a person from it.'
const FRAME_OPENING: Readonly<Record<AdsV2InHandPromptFrame, string>> = {
  hook: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  hold: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  use: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  close: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, close-up, like a real smartphone photo, natural light.`,
  no_label: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
}

/**
 * O pedido da foto da cena (puro). `settingLine` = a linha "Setting: …" já limpa (adsV2SettingLine, lib/ads/v2Scene.ts) ou null;
 * qualquer outro texto é ignorado (adsV2SettingFromPrompt confere o formato). `format` troca a abertura (adsV2FormatShots).
 */
export function adsV2InHandScenePrompt(i: { frame: AdsV2InHandPromptFrame; settingLine?: string | null; format?: AdsV2Format | null; extraRefs?: boolean; singleProduct?: boolean; object?: AdsV2InHandObject | null }): string { // KINEO-ADS-MAO-AJUSTE-1610 — + singleProduct · KINEO-ADS-MAO-AJUSTE-3-1610 — + object (frasco OU caixa)
  const frame: AdsV2InHandPromptFrame = Object.prototype.hasOwnProperty.call(ADS_V2_IN_HAND_ACTIONS, i.frame) ? i.frame : 'hold'
  const setting = adsV2InHandSettingFrom(i.settingLine ?? null)
  const text = [
    FRAME_OPENING[frame],
    setting ?? ADS_V2_IN_HAND_DEFAULT_PLACE,
    adsV2InHandPlaceLine(setting) ?? '', // KINEO-ADS-MAO-AJUSTE-1610 — os sinais do lugar pedido (hotel = cama, cortina, luminária de cabeceira)
    ADS_V2_IN_HAND_ACTIONS[frame],
    i.object === 'bottle' || i.object === 'box' ? ADS_V2_IN_HAND_OBJECT_LINE[i.object] : '', // KINEO-ADS-MAO-AJUSTE-3-1610 — um objeto por plano quando a foto tem frasco + caixa
    ADS_V2_IN_HAND_NO_OTHER_PEOPLE, // KINEO-ADS-MAO-AJUSTE-3-1610 — ninguém além da pessoa
    ADS_V2_IN_HAND_KEEP_PACKAGING,
    i.singleProduct === true ? ADS_V2_IN_HAND_SINGLE_PRODUCT : '', // KINEO-ADS-MAO-AJUSTE-1610 — um produto só: nada de frasco ou caixa a mais
    i.extraRefs ? EXTRA_REFS_LINE : '',
    ...ADS_V2_IN_HAND_RULES,
  ].filter(Boolean).join(' ')
  const fmt: AdsV2Format = i.format === '4:5' || i.format === '1:1' ? i.format : '9:16'
  return fmt === '9:16' ? text : text.split(ADS_V2_SCENE_FRAME_OPENING).join(SCENE_FRAME[fmt])
}

// ── o movimento (Kling O3 i2v): humano VIVO, produto TRAVADO ────────────────────────────────────────────────────────────
// KINEO-ADS-MAO-AJUSTE-1610 — UMA AÇÃO COM PROPÓSITO por plano (nota 8/10 do fundador no Kling sem quadro final: "o movimento ainda precisa ser mais
// KINEO-ADS-MAO-AJUSTE-1610 — natural"; só respirar/piscar/sorrir lê como "foto viva"). Os líderes dirigem uma ação por plano; a escolha é DETERMINÍSTICA
// KINEO-ADS-MAO-AJUSTE-1610 — pelo enquadramento e pela categoria do produto (perfume/cosmético: cheirar, borrifar, aplicar; bebida: gole; bolsa: carregar).
export type AdsV2InHandCategory = 'perfume' | 'cosmetics' | 'drink' | 'bag' | 'generic' // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a categoria pelo texto do produto (sem acento, minúsculo); a 1ª regra que bater vence; nada = 'generic'. */
export const ADS_V2_IN_HAND_CATEGORY_RULES: readonly { category: Exclude<AdsV2InHandCategory, 'generic'>; re: RegExp }[] = [ // KINEO-ADS-MAO-AJUSTE-1610
  { category: 'perfume', re: /(\b(perfumes?|perfumaria|parfums?|fragrances?|fragrancias?|fragancias?|colognes?|colonia|eau de|body splash|attar|oud)\b)|عطر/ }, // KINEO-ADS-MAO-AJUSTE-1610
  { category: 'cosmetics', re: /\b(cosmetics?|cosmeticos?|creams?|cremes?|cremas?|serums?|lotions?|locao|locion|lipsticks?|batom|labial|makeup|maquiagem|maquillaje|skin ?care|moisturi[sz]er|hidratante|shampoo|xampu|champu|conditioner|condicionador|nail polish|esmalte|sunscreen|protetor solar|protector solar|beauty|beleza|belleza|blush|rimel)\b/ }, // KINEO-ADS-MAO-AJUSTE-1610
  { category: 'drink', re: /\b(drinks?|beverages?|juices?|coffee|tea|beers?|wines?|soda|water|bebidas?|sucos?|cafe|cha|cervejas?|vinhos?|refrigerantes?|agua|zumos?|jugos?|cervezas?|vinos?|refrescos?|kombucha|smoothies?|energeticos?|energy drinks?|whiske?y|vodka|gin|cachaca|licor|liqueur|matcha|latte|lemonade|limonada)\b/ }, // KINEO-ADS-MAO-AJUSTE-1610
  { category: 'bag', re: /\b(bags?|handbags?|purses?|backpacks?|totes?|clutch|bolsas?|mochilas?|sacolas?|bolsos?|carteras?)\b/ }, // KINEO-ADS-MAO-AJUSTE-1610
] // KINEO-ADS-MAO-AJUSTE-1610
export function adsV2InHandCategory(text: unknown): AdsV2InHandCategory { // KINEO-ADS-MAO-AJUSTE-1610
  const t = typeof text === 'string' ? fold(text) : '' // KINEO-ADS-MAO-AJUSTE-1610
  return ADS_V2_IN_HAND_CATEGORY_RULES.find((r) => r.re.test(t))?.category ?? 'generic' // KINEO-ADS-MAO-AJUSTE-1610
} // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a ação de cada plano, por categoria × enquadramento (sem dígitos: a régua anti-invenção do /plan). */
export const ADS_V2_IN_HAND_MOTION_ACTIONS: Readonly<Record<AdsV2InHandCategory, Readonly<Record<AdsV2InHandFrame, string>>>> = { // KINEO-ADS-MAO-AJUSTE-1610
  perfume: { // KINEO-ADS-MAO-AJUSTE-1610
    hook: 'the person lifts the perfume toward their face, smells it softly and smiles', // KINEO-ADS-MAO-AJUSTE-1610
    hold: 'the person holds the product in one hand and tilts it slightly toward the camera to show the label', // KINEO-ADS-MAO-AJUSTE-1610 · KINEO-ADS-MAO-AJUSTE-3-1610 — uma mão só, um objeto (o giro do bloco frasco+caixa ficava mecânico)
    use: 'the person sprays the perfume once on their wrist and brings the wrist close to smell it', // KINEO-ADS-MAO-AJUSTE-1610
    close: "the person's fingers slowly trace the edge of the product", // KINEO-ADS-MAO-AJUSTE-1610
  }, // KINEO-ADS-MAO-AJUSTE-1610
  cosmetics: { // KINEO-ADS-MAO-AJUSTE-1610
    hook: 'the person lifts the product toward their face, looks at it closely and smiles', // KINEO-ADS-MAO-AJUSTE-1610
    hold: 'the person holds the product in one hand and tilts it slightly toward the camera to show the label', // KINEO-ADS-MAO-AJUSTE-1610 · KINEO-ADS-MAO-AJUSTE-3-1610 — uma mão só, um objeto (o giro do bloco frasco+caixa ficava mecânico)
    use: 'the person applies a small amount on the back of their hand and smooths it in with the fingertips', // KINEO-ADS-MAO-AJUSTE-1610
    close: "the person's fingers slowly trace the edge of the product", // KINEO-ADS-MAO-AJUSTE-1610
  }, // KINEO-ADS-MAO-AJUSTE-1610
  drink: { // KINEO-ADS-MAO-AJUSTE-1610
    hook: 'the person raises the drink, takes a small sip and smiles', // KINEO-ADS-MAO-AJUSTE-1610
    hold: 'the person holds the drink in one hand and tilts it slightly toward the camera to show the label', // KINEO-ADS-MAO-AJUSTE-1610 · KINEO-ADS-MAO-AJUSTE-3-1610 — uma mão só
    use: 'the person takes a slow sip, lowers the drink and smiles', // KINEO-ADS-MAO-AJUSTE-1610
    close: "the person's fingers settle around the drink and slowly trace its edge", // KINEO-ADS-MAO-AJUSTE-1610
  }, // KINEO-ADS-MAO-AJUSTE-1610
  bag: { // KINEO-ADS-MAO-AJUSTE-1610
    hook: 'the person swings the bag up onto their shoulder and smiles', // KINEO-ADS-MAO-AJUSTE-1610
    hold: 'the person adjusts the bag strap on their shoulder and glances down at the bag', // KINEO-ADS-MAO-AJUSTE-1610
    use: 'the person walks a few natural steps carrying the bag, then looks back at the camera', // KINEO-ADS-MAO-AJUSTE-1610
    close: "the person's fingers trace the edge and the stitching of the bag", // KINEO-ADS-MAO-AJUSTE-1610
  }, // KINEO-ADS-MAO-AJUSTE-1610
  generic: { // KINEO-ADS-MAO-AJUSTE-1610
    hook: 'the person brings the product up beside their face and smiles at it', // KINEO-ADS-MAO-AJUSTE-1610
    hold: 'the person holds the product in one hand and tilts it slightly toward the camera to show the label', // KINEO-ADS-MAO-AJUSTE-1610 · KINEO-ADS-MAO-AJUSTE-3-1610 — uma mão só, um objeto (o giro do bloco frasco+caixa ficava mecânico)
    use: 'the person opens or tries the product in a natural, everyday way, one hand steady on it', // KINEO-ADS-MAO-AJUSTE-1610
    close: "the person's fingertips slowly trace the edge of the product", // KINEO-ADS-MAO-AJUSTE-1610
  }, // KINEO-ADS-MAO-AJUSTE-1610
} // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a boca não fala (na comparação de 16/10 ela mexia como se falasse, sob a narração). */
export const ADS_V2_IN_HAND_LIPS = 'lips closed, not speaking' // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a câmera e o ritmo (no lugar de "câmera quase parada, push-in muito lento", que lia como câmera lenta). */
export const ADS_V2_IN_HAND_CAMERA = 'Subtle handheld camera, natural pacing, real-time speed (not slow motion).' // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — a regra do produto: mesmo tamanho, sem deformar; pode acompanhar a mão, nunca crescer nem mudar. */
export const ADS_V2_IN_HAND_PRODUCT_RULE = 'The product keeps exactly the same size, shape, colors, label and proportions, with no warping: it may move naturally with the hand, but it never grows, morphs or turns into another object; no other object appears.' // KINEO-ADS-MAO-AJUSTE-1610
/** O fecho do movimento: identidade da pessoa, do produto e do lugar — SEM "keep everything" (que congela o rosto e as mãos). */
export const ADS_V2_IN_HAND_MOTION_KEEP = 'Keep the same person, the same product and the same place as in the photo.'
/** KINEO-ADS-MAO-AJUSTE-3-1610 — ninguém entra no quadro durante o movimento (o olho que entrou pela borda no plano 2). */
export const ADS_V2_IN_HAND_MOTION_NO_PEOPLE = 'No other person appears or enters the frame.' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a ação do plano com o objeto único: "the product" vira "the bottle"/"the box" quando a foto tem os dois. Pura. */
export function adsV2InHandAction(frame: AdsV2InHandFrame, category: AdsV2InHandCategory = 'generic', object: AdsV2InHandObject | null = null): string { // KINEO-ADS-MAO-AJUSTE-3-1610
  const table = ADS_V2_IN_HAND_MOTION_ACTIONS[category] ?? ADS_V2_IN_HAND_MOTION_ACTIONS.generic // KINEO-ADS-MAO-AJUSTE-3-1610
  const action = table[frame] ?? table.hold // KINEO-ADS-MAO-AJUSTE-3-1610
  return object === 'bottle' || object === 'box' ? action.split('the product').join('the ' + object) : action // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/**
 * O movimento do plano (puro). KINEO-ADS-MAO-AJUSTE-1610 — UMA ação com propósito (enquadramento × categoria), o rosto vivo em volta
 * dela com a boca fechada, os dedos na pegada, a regra do produto e a câmera na mão em tempo real. Mesmo prompt no Kling O3 e na reserva H3.
 */
export function adsV2InHandMotion(frame: AdsV2InHandFrame, category: AdsV2InHandCategory = 'generic', object: AdsV2InHandObject | null = null): string { // KINEO-ADS-MAO-AJUSTE-1610 — + category · KINEO-ADS-MAO-AJUSTE-3-1610 — + object
  const action = adsV2InHandAction(frame, category, object) // KINEO-ADS-MAO-AJUSTE-3-1610 — a tabela de sempre, com o objeto único
  return [
    'Natural lifelike motion, like real handheld footage of a real person.',
    `One clear, purposeful action in this shot: ${action}.`, // KINEO-ADS-MAO-AJUSTE-1610
    `Around the action the face stays alive: natural blinking and breathing, the eyes move and focus; ${ADS_V2_IN_HAND_LIPS}.`, // KINEO-ADS-MAO-AJUSTE-1610
    'The fingers hold the product naturally and adjust their grip as the action needs.', // KINEO-ADS-MAO-AJUSTE-1610
    ADS_V2_IN_HAND_PRODUCT_RULE, // KINEO-ADS-MAO-AJUSTE-1610
    ADS_V2_IN_HAND_CAMERA, // KINEO-ADS-MAO-AJUSTE-1610
    ADS_V2_IN_HAND_MOTION_NO_PEOPLE, // KINEO-ADS-MAO-AJUSTE-3-1610
    ADS_V2_IN_HAND_MOTION_KEEP,
  ].join(' ')
}

// ── o plano ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface AdsV2InHandPhoto { footage_id: string; kind: string; url: string; original_footage_id?: string | null; original_url?: string | null }

const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())

/**
 * Este pedido sai pelo método novo? (puro) Só o Comercial de 15 s, sem estilo, sem ator e sem vídeo do cliente, com foto
 * marcada como PRODUTO, em pedido de produto (ou setor loja/outro, os mesmos da trava). null = o plano de antes (a colagem).
 */
export function adsV2InHandEligible(i: { on: boolean; tier: string; seconds: number; photos: readonly AdsV2InHandPhoto[] | null | undefined; productOrder: boolean; sector: string | null | undefined; presenter: boolean; style: string | null | undefined; videos: number }): AdsV2InHandPhoto | null {
  if (i.on !== true || i.tier !== 'commercial' || i.seconds !== 15 || i.presenter === true || !!i.style || (i.videos ?? 0) > 0) return null
  if (!i.productOrder && !ADS_V2_IN_HAND_MIRROR.lockSectors.includes(String(i.sector ?? ''))) return null
  const photos = Array.isArray(i.photos) ? i.photos : []
  return photos.find((p) => p && p.kind === 'product' && typeof p.footage_id === 'string' && !!p.footage_id && https(p.url)) ?? null
}

/** As referências da foto da cena: a foto REAL do produto (a original, sem o corte do formato, quando existe) primeiro. */
export function adsV2InHandRefs(product: AdsV2InHandPhoto, photos: readonly AdsV2InHandPhoto[]): { ids: string[]; urls: string[] } {
  const first = https(product.original_url) ? product.original_url.trim() : product.url.trim()
  const ids = [product.footage_id]
  const urls = [first]
  const more = photos.filter((p) => p && p !== product && https(p.url) && (p.kind === 'product' || p.kind === 'place'))
  for (const p of [...more.filter((p) => p.kind === 'product').slice(0, 1), ...more.filter((p) => p.kind === 'place').slice(0, 2)]) {
    if (urls.length >= ADS_V2_IN_HAND_MAX_REFS) break
    ids.push(p.footage_id)
    urls.push(p.url.trim())
  }
  return { ids, urls }
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * O plano novo (puro): 4 planos de gente com o produto + o packshot real. Os índices são 0..4; a duração dos planos é 12,5 s
 * (a mesma do Comercial de antes). Inelegível = null (o chamador mantém o plano de antes, objeto por objeto).
 */
export function adsV2InHandPlan(i: { on: boolean; tier: string; seconds: number; photos: readonly AdsV2InHandPhoto[] | null | undefined; productOrder: boolean; sector: string | null | undefined; presenter: boolean; style: string | null | undefined; videos: number; settingLine?: string | null; format?: AdsV2Format | null; productText?: string | null; pair?: boolean | null }): { shots: AdsV2InHandShot[]; shotsSeconds: number; product: AdsV2InHandPhoto } | null { // KINEO-ADS-MAO-AJUSTE-1610 — + productText (a categoria da ação) · KINEO-ADS-MAO-AJUSTE-3-1610 — + pair (a foto do produto tem frasco E caixa)
  const product = adsV2InHandEligible(i)
  if (!product) return null
  const photos = Array.isArray(i.photos) ? i.photos : []
  const refs = adsV2InHandRefs(product, photos)
  const fallbackUrl = product.url.trim()
  const category = adsV2InHandCategory(i.productText ?? '') // KINEO-ADS-MAO-AJUSTE-1610 — perfume/cosmético/bebida/bolsa/genérico
  const singleProduct = photos.filter((p) => p && p.kind === 'product').length === 1 // KINEO-ADS-MAO-AJUSTE-1610 — uma foto de produto = um produto só
  const shots: AdsV2InHandShot[] = ADS_V2_IN_HAND_SLOTS.map((slot, idx) => ((object) => ({ // KINEO-ADS-MAO-AJUSTE-3-1610 — o objeto único do plano (null = produto de um objeto só)
    idx,
    role: slot.role,
    beat: slot.beat,
    kind: 'people',
    source: 'generated_scene',
    sourceFootageId: null,
    imageUrl: null,
    referenceFootageIds: [...refs.ids],
    referenceUrls: [...refs.urls],
    scenePrompt: adsV2InHandScenePrompt({ frame: slot.frame, settingLine: i.settingLine ?? null, format: i.format ?? '9:16', extraRefs: refs.urls.length > 1, singleProduct, object }), // KINEO-ADS-MAO-AJUSTE-1610 — + singleProduct · KINEO-ADS-MAO-AJUSTE-3-1610 — + object
    prompt: adsV2InHandMotion(slot.frame, category, object), // KINEO-ADS-MAO-AJUSTE-1610 — uma ação com propósito por plano · KINEO-ADS-MAO-AJUSTE-3-1610 — com o objeto único
    movementVariant: idx,
    cutStart: slot.start, // KINEO-ADS-MAO-AJUSTE-3-1610 — por plano (o borrifo começa no 0)
    cutSeconds: slot.cut,
    inHand: { frame: slot.frame, fallbackUrl, ...(object ? { object } : {}) }, // KINEO-ADS-MAO-AJUSTE-3-1610 — + object (o juiz reprova os dois juntos)
  }))(adsV2InHandObjectFor(slot.frame, i.pair))) // KINEO-ADS-MAO-AJUSTE-3-1610
  shots.push({
    idx: shots.length,
    role: 'product',
    beat: 'place_product',
    kind: 'text',
    source: 'client_photo',
    sourceFootageId: product.footage_id,
    imageUrl: fallbackUrl,
    referenceFootageIds: [],
    referenceUrls: [],
    scenePrompt: null,
    prompt: null,
    movementVariant: 0,
    cutStart: 0,
    cutSeconds: ADS_V2_IN_HAND_PACKSHOT_SECONDS,
    packshot: true,
  })
  return { shots, shotsSeconds: r3(shots.reduce((s, x) => s + x.cutSeconds, 0)), product }
}

/** O plano novo deste plano gravado (o enquadramento e a foto do fallback), ou null (plano de antes). Puro. */
export function adsV2InHandOf(shot: unknown): AdsV2InHandTag | null {
  const t = shot && typeof shot === 'object' ? (shot as { inHand?: unknown }).inHand : null
  if (!t || typeof t !== 'object') return null
  const frame = (t as { frame?: unknown }).frame
  const fallbackUrl = (t as { fallbackUrl?: unknown }).fallbackUrl
  if (typeof frame !== 'string' || !(ADS_V2_IN_HAND_SLOTS as readonly { frame: string }[]).some((s) => s.frame === frame) || !https(fallbackUrl)) return null
  const object = (t as { object?: unknown }).object // KINEO-ADS-MAO-AJUSTE-3-1610
  return { frame: frame as AdsV2InHandFrame, fallbackUrl: fallbackUrl.trim(), ...(object === 'bottle' || object === 'box' ? { object } : {}) } // KINEO-ADS-MAO-AJUSTE-3-1610 — o objeto único do plano
}

/** O plano gravado saiu pelo método novo? (marca do plano, gravada pelo /plan). */
export function adsV2IsInHandPlan(plan: unknown): boolean {
  return !!plan && typeof plan === 'object' && (plan as { productInHand?: unknown }).productInHand === true
}

/** Os planos novos do plano gravado (idx + enquadramento), para o /plan e o dry-run do /start. */
export function adsV2InHandSummary(shots: readonly unknown[] | null | undefined): { idx: number; frame: AdsV2InHandFrame | 'packshot'; cut_seconds: number }[] {
  type Row = { idx: number; frame: AdsV2InHandFrame | 'packshot'; cut_seconds: number }
  return (Array.isArray(shots) ? shots : []).flatMap((s): Row[] => {
    const o = s as { idx?: unknown; packshot?: unknown; cutSeconds?: unknown }
    const t = adsV2InHandOf(s)
    const idx = typeof o?.idx === 'number' ? o.idx : -1
    const cut = typeof o?.cutSeconds === 'number' ? o.cutSeconds : 0
    if (t) return [{ idx, frame: t.frame, cut_seconds: cut }]
    if (o?.packshot === true) return [{ idx, frame: 'packshot' as const, cut_seconds: cut }]
    return []
  })
}

// ── o vídeo: Kling O3 i2v SEM quadro final (KINEO-ADS-MAO-AJUSTE-1610) ─────────────────────────────────────────────────────
// Schema conferido em 16/10/2026 (https://fal.ai/models/fal-ai/kling-video/o3/pro/image-to-video/llms.txt; também anotado em
// lib/ads/v2Engines.ts em 28/09): image_url (obrigatório, quadro inicial) · end_image_url (opcional, quadro final; NÃO existe
// tail_image_url) · duration enum string '3'..'15' (padrão '5') · generate_audio (padrão false) · prompt | multi_prompt ·
// shot_type · enable_safety_checker. Montado CAMPO A CAMPO (nada espalhado): o builder de sempre (buildShotInput) continua sem
// end_image_url; só o plano novo passa por aqui.
// KINEO-ADS-MAO-AJUSTE-1610 — SEM end_image_url: com o quadro final = a foto inicial a pessoa congelou (YDIF 0,1–0,8) e o clipe levou 212–233 s
// KINEO-ADS-MAO-AJUSTE-1610 — (estourou o prazo); sem ele, a pessoa viva o clipe inteiro e o produto firme (9/10) em 97 s. Só image_url, prompt, '3' e sem áudio.
export interface AdsV2InHandKlingInput {
  prompt: string
  image_url: string
  duration: AdsV2InHandGenSeconds // KINEO-ADS-MAO-AJUSTE-3-1610 — 3 s, ou 4 s no plano de gente mais longo
  generate_audio: false
}
export function adsV2InHandKlingInput(shot: { imageUrl: string; prompt: string; cutStart?: number | null; cutSeconds?: number | null }): AdsV2InHandKlingInput { // KINEO-ADS-MAO-AJUSTE-3-1610 — + o trecho (a duração vem dele)
  const image = typeof shot?.imageUrl === 'string' ? shot.imageUrl.trim() : ''
  if (!/^https:\/\/[^\s]+$/i.test(image)) throw new Error('ads_v2_bad_image_url')
  const prompt = typeof shot?.prompt === 'string' ? shot.prompt.trim() : ''
  if (prompt.length < 3) throw new Error('ads_v2_bad_prompt')
  if (prompt.length > 2500) throw new Error('ads_v2_prompt_too_long')
  const duration = typeof shot.cutSeconds === 'number' && shot.cutSeconds > 0 ? adsV2InHandGenSeconds(shot.cutStart ?? 0, shot.cutSeconds) : ADS_V2_IN_HAND_GEN_SECONDS // KINEO-ADS-MAO-AJUSTE-3-1610 — sem trecho = 3 s (o de sempre)
  return { prompt, image_url: image, duration, generate_audio: false } // KINEO-ADS-MAO-AJUSTE-1610 — sem quadro final · KINEO-ADS-MAO-AJUSTE-3-1610 — duração pelo trecho
}
/** KINEO-ADS-MAO-AJUSTE-1610 — a reserva MiniMax H3 (mesmo prompt) usa SÓ o começo: depois de 2,5 s o produto cresce ~1,6× (comparação de 16/10). */
export const ADS_V2_IN_HAND_H3_MAX_END = 2.5 // KINEO-ADS-MAO-AJUSTE-1610
/** KINEO-ADS-MAO-AJUSTE-1610 — início do trecho no clipe do H3: o corte [início, início + corte] termina em ≤ 2,5 s (2,0 s → 0,15; 2,5 s → 0). */
export function adsV2InHandH3CutStart(cut: number): number { // KINEO-ADS-MAO-AJUSTE-1610
  const c = typeof cut === 'number' && Number.isFinite(cut) && cut > 0 ? cut : 0 // KINEO-ADS-MAO-AJUSTE-1610
  return r3(Math.max(0, Math.min(ADS_V2_IN_HAND_CUT_START, ADS_V2_IN_HAND_H3_MAX_END - c))) // KINEO-ADS-MAO-AJUSTE-1610
} // KINEO-ADS-MAO-AJUSTE-1610

// ── KINEO-ADS-MAO-AJUSTE-3-1610 — a narração do plano novo (o texto do Ads, lib/ads/v2Brief.ts; a voz e a TTS de sempre, intocadas) ─────────────────
/** KINEO-ADS-MAO-AJUSTE-3-1610 — o piso de palavras do Comercial in_hand: o teto de sempre menos 1 (30 → 29 em 15 s; o piso de sempre é 90%, 27). O TETO não muda
 *  (é o do PATCH de edição). Na régua do repo (ADS_V2_VOICE_WPS 2,0 pal/s) 29 palavras = 14,5 s; no ritmo do T1 do ajuste (29 pal em 11,5 s)
 *  a fala cresce com MAIS FRASES (cada ponto é uma pausa da voz). Pura. */
export function adsV2InHandSpeechMin(maxWords: number): number { // KINEO-ADS-MAO-AJUSTE-3-1610
  if (!Number.isFinite(maxWords) || maxWords <= 0) return 0 // KINEO-ADS-MAO-AJUSTE-3-1610
  return Math.max(1, Math.floor(maxWords) - 1) // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — uma frase a mais que o pedido de sempre ("two to four short spoken sentences"): quatro ou cinco frases curtas. */
export const ADS_V2_IN_HAND_SPEECH_SENTENCES = 'four or five short spoken sentences' // KINEO-ADS-MAO-AJUSTE-3-1610

// ── o juiz do rótulo (visão barata, a mesma chamada de lib/ads/v2LockVision.ts) ─────────────────────────────────────────
/** A pergunta (sem exemplo de resposta pronto: o reteste de 15/10 mostrou que a visão COPIA o exemplo). 1ª imagem = a foto real. */
export const ADS_V2_IN_HAND_JUDGE_QUESTION = 'The FIRST image is the real product photo. The SECOND image is a generated photo of a person with that product. Be strict: compare the product in the SECOND image with the FIRST one and answer each item with true or false; when in doubt, answer false. "name": the brand name and the logo, where they are visible, are the same words and the same logo (small text may be blurry, but it must not turn into a different word or a different logo). "colors": every visible part of the product has the same colors as in the FIRST image, including the body of the bottle or the package and the color of any liquid inside. "material": every part keeps the same material and finish as in the FIRST image (clear glass stays clear and see-through, matte cardboard stays matte cardboard); a black, opaque or painted body where the FIRST image shows clear glass is false. "shape": the shape and the proportions of the packaging are the same. "count": the SECOND image shows no more product items than the FIRST image (no extra bottle, box, package or duplicate). "hands": the hands look natural, with five fingers, and nothing passes through the product. "one_product": every product item in the SECOND image is part of the product of the FIRST image; no different product appears. Answer only with JSON with the keys "name", "colors", "material", "shape", "count", "hands" and "one_product", each one true or false.' // KINEO-ADS-MAO-AJUSTE-1610 — mais rígida: cor do corpo e do líquido, material, quantidade (no T1 aprovou um frasco preto inventado)
export const ADS_V2_IN_HAND_JUDGE_KEYS: readonly string[] = ['name', 'colors', 'material', 'shape', 'count', 'hands', 'one_product'] // KINEO-ADS-MAO-AJUSTE-1610 — + material, count
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a pergunta da pessoa extra (o juiz aprovou um homem na cama ao fundo e um olho entrando pela borda). Em TODA conferência in_hand. */
export const ADS_V2_IN_HAND_JUDGE_PEOPLE = '"people": the SECOND image shows exactly one person (or only the hands of that one person); there is no other person anywhere: nobody in the background, and no other face, eye, hand or body part cut off at the edge of the frame. Any extra person or cut-off body part is false.' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a pergunta do objeto único (foto com frasco + caixa): os dois juntos = reprova. */
export const ADS_V2_IN_HAND_JUDGE_OBJECT: Readonly<Record<AdsV2InHandObject, string>> = { // KINEO-ADS-MAO-AJUSTE-3-1610
  bottle: '"only_object": the FIRST image shows a bottle together with its box, but this shot must show ONLY the bottle: true only if the bottle appears and the box does not appear anywhere in the SECOND image; both together is false.', // KINEO-ADS-MAO-AJUSTE-3-1610
  box: '"only_object": the FIRST image shows a bottle together with its box, but this shot must show ONLY the box: true only if the box appears and the bottle does not appear anywhere in the SECOND image outside its closed box; both together is false.', // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — as chaves desta conferência: as 7 de sempre + "people" + "only_object" quando o plano pede um objeto só. Pura. */
export function adsV2InHandJudgeKeys(object: AdsV2InHandObject | null = null): string[] { // KINEO-ADS-MAO-AJUSTE-3-1610
  return [...ADS_V2_IN_HAND_JUDGE_KEYS, 'people', ...(object === 'bottle' || object === 'box' ? ['only_object'] : [])] // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a pergunta desta conferência: a de sempre + pessoa extra + objeto único, com a lista de chaves certa no fim. Pura. */
export function adsV2InHandJudgeQuestion(object: AdsV2InHandObject | null = null): string { // KINEO-ADS-MAO-AJUSTE-3-1610
  const head = ADS_V2_IN_HAND_JUDGE_QUESTION.split(' Answer only with JSON')[0] // KINEO-ADS-MAO-AJUSTE-3-1610
  const keys = adsV2InHandJudgeKeys(object) // KINEO-ADS-MAO-AJUSTE-3-1610
  const items = [ADS_V2_IN_HAND_JUDGE_PEOPLE, ...(object === 'bottle' || object === 'box' ? [ADS_V2_IN_HAND_JUDGE_OBJECT[object]] : [])] // KINEO-ADS-MAO-AJUSTE-3-1610
  return head + ' ' + items.join(' ') + ' Answer only with JSON with the keys ' + keys.slice(0, -1).map((k) => '"' + k + '"').join(', ') + ' and "' + keys[keys.length - 1] + '", each one true or false.' // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a foto do PRODUTO mostra o frasco e a caixa juntos? (uma visão 'low' no /plan; a resposta escolhe o objeto de cada plano). */
export const ADS_V2_IN_HAND_PAIR_QUESTION = 'This is a product photo. Answer two questions with true or false. "container": the photo shows the product container itself, such as a bottle, jar, tube or flask. "box": the photo ALSO shows a separate box or carton package for that product, next to, behind or under the container. Answer only with JSON with the keys "container" and "box".' // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a resposta (pura): true = os dois; false = um só; null = ilegível ("não sei": nada muda). */
export function adsV2ParseInHandPair(raw: unknown): boolean | null { // KINEO-ADS-MAO-AJUSTE-3-1610
  let j: unknown = raw // KINEO-ADS-MAO-AJUSTE-3-1610
  if (typeof raw === 'string') { try { j = JSON.parse(raw) } catch { return null } } // KINEO-ADS-MAO-AJUSTE-3-1610
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null // KINEO-ADS-MAO-AJUSTE-3-1610
  const o = j as Record<string, unknown> // KINEO-ADS-MAO-AJUSTE-3-1610
  if (typeof o.container !== 'boolean' || typeof o.box !== 'boolean') return null // KINEO-ADS-MAO-AJUSTE-3-1610
  return o.container === true && o.box === true // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
export interface AdsV2InHandVerdict { ok: boolean; fails: string[] }
/** A resposta do juiz (pura): todas as chaves booleanas, senão null ("não sei"). */
export function adsV2ParseInHandVerdict(raw: unknown, keys: readonly string[] = ADS_V2_IN_HAND_JUDGE_KEYS): AdsV2InHandVerdict | null { // KINEO-ADS-MAO-AJUSTE-3-1610 — + keys (people, only_object)
  let j: unknown = raw
  if (typeof raw === 'string') { try { j = JSON.parse(raw) } catch { return null } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null
  const o = j as Record<string, unknown>
  if (!keys.every((k) => typeof o[k] === 'boolean')) return null // KINEO-ADS-MAO-AJUSTE-3-1610
  const fails = keys.filter((k) => o[k] !== true) // KINEO-ADS-MAO-AJUSTE-3-1610
  return { ok: fails.length === 0, fails }
}

export const ADS_V2_IN_HAND_RETRY_REASON = 'in_hand_label_retry'
export const ADS_V2_IN_HAND_NO_LABEL_REASON = 'in_hand_no_label'
export type AdsV2InHandStep = 'keep' | 'retry' | 'no_label' | 'product_photo'
/**
 * O passo depois do juiz (puro). Bateu (ou o juiz não respondeu) = fica. Divergiu: 1ª vez refaz a MESMA foto; 2ª vez o plano
 * vira o enquadramento sem o rótulo de frente; 3ª vez (ou divergência sem o histórico) a foto real do produto. Nunca rótulo errado.
 */
export function adsV2InHandJudgeStep(i: { verdict: AdsV2InHandVerdict | null | undefined; previousReason: string | null | undefined }): AdsV2InHandStep {
  if (!i.verdict || i.verdict.ok) return 'keep'
  if (i.previousReason === ADS_V2_IN_HAND_NO_LABEL_REASON) return 'product_photo'
  if (i.previousReason === ADS_V2_IN_HAND_RETRY_REASON) return 'no_label'
  return 'retry'
}
/** Qual tentativa de foto é esta (1 = a 1ª, 2 = a refação, 3 = o enquadramento sem rótulo). */
export function adsV2InHandTry(previousReason: string | null | undefined): 1 | 2 | 3 {
  return previousReason === ADS_V2_IN_HAND_NO_LABEL_REASON ? 3 : previousReason === ADS_V2_IN_HAND_RETRY_REASON ? 2 : 1
}

// ── custo (dry-run): o estimateAdUsd de sempre + o juiz + uma refação de foto esperada ─────────────────────────────────
/** Uma conferência do juiz: 2 imagens em 'high' no modelo de visão do registro (~US$ 0,008; arredondado para cima). */
export const ADS_V2_IN_HAND_JUDGE_USD = 0.01
/** Refações de foto esperadas por anúncio (o estudo de 16/10: "~1 refação"). Só estimativa; o cliente nunca paga a refação. */
export const ADS_V2_IN_HAND_EXPECTED_RETRIES = 1
export type AdsV2InHandUsd = AdsV2UsdEstimate & { judgeUsd: number; retryReserveUsd: number; inHand: true; extraKlingUsd: number } // KINEO-ADS-MAO-AJUSTE-3-1610 — + os segundos a mais do Kling (planos de 4 s)
/**
 * O custo do anúncio novo (puro): a base (estimateAdUsd: 4 fotos do Nano Banana × 0,15 + 4 clipes do Kling O3 de 3 s × 0,336 +
 * os fixos) + o juiz em cada foto (e na refação) + a reserva de UMA refação de foto. Comercial 15 s ≈ US$ 2,394.
 */
export function adsV2InHandUsd(base: AdsV2UsdEstimate, shots: readonly unknown[] | null | undefined): AdsV2InHandUsd {
  const scenes = (Array.isArray(shots) ? shots : []).filter((s) => adsV2InHandOf(s)).length
  const judges = scenes + ADS_V2_IN_HAND_EXPECTED_RETRIES
  const judgeUsd = r3(judges * ADS_V2_IN_HAND_JUDGE_USD)
  const retryReserveUsd = r3(ADS_V2_IN_HAND_EXPECTED_RETRIES * ADS_V2_IN_HAND_MIRROR.sceneImageUsd)
  const extraKlingUsd = r3((Array.isArray(shots) ? shots : []).filter((s) => adsV2InHandOf(s)).reduce((sum: number, s) => { const o = s as { cutStart?: unknown; cutSeconds?: unknown }; const gen = Number(adsV2InHandGenSeconds(Number(o.cutStart) || 0, Number(o.cutSeconds) || 0)); return sum + Math.max(0, gen - ADS_V2_IN_HAND_MIRROR.klingGenSeconds) * ADS_V2_IN_HAND_MIRROR.klingUsdPerSecond }, 0)) // KINEO-ADS-MAO-AJUSTE-3-1610 — estimateAdUsd conta 3 s por clipe
  return { ...base, judgeUsd, retryReserveUsd, extraKlingUsd, totalUsd: r3(base.totalUsd + judgeUsd + retryReserveUsd + extraKlingUsd), inHand: true } // KINEO-ADS-MAO-AJUSTE-3-1610 — + extraKlingUsd
}

/** Espelho conferido pelo guardião: o trecho usado cabe no clipe de 3 s do Kling O3 com o dissolve e a margem. */
export function adsV2InHandCutFits(cut: number, start: number = ADS_V2_IN_HAND_CUT_START, gen: number = ADS_V2_IN_HAND_MIRROR.klingGenSeconds): boolean { // KINEO-ADS-MAO-AJUSTE-3-1610 — + start e gen (o borrifo começa no 0; planos de 4 s)
  const m = ADS_V2_IN_HAND_MIRROR
  return start + cut + m.fadeSeconds <= gen - m.cutMargin + 1e-9 // KINEO-ADS-MAO-AJUSTE-3-1610
}
