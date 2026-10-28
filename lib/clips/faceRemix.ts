// KINEO-ROSTO-NO-CLIPE-2810 — "Put your face in it": [TRAVA 8.2 — vai do fundador 28/10 "A" (botão geral "coloque seu rosto
// neste clipe")].
//
// FERRAMENTA GERAL, não um efeito avulso. Todo clipe da casa que mostra uma pessoa (a curadoria em lib/homeGaleria.ts
// GALERIA_NEW_CLIPS, com `person: true`) ganha o botão "Put your face in it" na galeria "Made with Kineo" e na faixa de Clipes
// da home. A pessoa manda UMA foto (dela ou de alguém que concordou — caixa de consentimento obrigatória) e a Kineo gera a
// MESMA cena partindo daquela foto (image-to-video), com o rosto dela. O clipe de tendência da semana que vem entra no
// catálogo com `person: true` e ganha o botão sozinho — nenhum código novo.
//
// O SERVIDOR resolve tudo (o mesmo contrato dos efeitos, lib/clips/clipEffects.ts resolveClipEffectRequest): o navegador manda
// só `remix: <id do item>` + a foto + `consent: true`. Prompt, motor, duração e formato saem DAQUI; `prompt`, `engine`,
// `seconds` e `aspect` do corpo são ignorados. O pedido segue o MESMO submitClip de sempre (posse da foto, moderação de texto
// e imagem, saldo, débito, envio, estorno) e o preço é o do clipe de sempre (clipCreditCost, com foto) — nenhuma tabela nova.
//
// MÓDULO PURO (só imports relativos e @/ de módulos puros): a rota, a tela do /clips, a galeria, a faixa da home, o fluxo do
// clipe (lib/clips/clipFlow.ts) e o guardião (scripts/test-rosto-no-clipe-2810.mjs) leem o MESMO catálogo.
//
// KINEO-ROSTO-QUADRO-CHAVE-2810 — DUAS ETAPAS, como fazem os líderes (Higgsfield/Pika "face swap into scene"): o i2v do Kling usa a
// foto como 1º QUADRO, então o clipe abria na foto da pessoa (parque) e cortava a seco para a festa, e o rosto não sobrevivia à
// troca de cena (teste pago da4ae49c, 28/10, nota 4). Agora:
//   etapa 1 (quadro-chave) — fal-ai/nano-banana-pro/edit (o MESMO endpoint da foto de referência do /images e da cena do Studio
//            Ads) EDITA a foto para dentro da cena: a pessoa da foto, já de smoking, no palco, 9:16 — o 1º quadro JÁ É a cena;
//   etapa 2 (vídeo) — Kling 3 image-to-video parte do quadro-chave NOSSO (persistido no bucket; a URL da fal expira) com o
//            prompt de movimento da cena.
// A linha de `clips` conta a etapa pelo `model`: FACE_REMIX_KEYFRAME_MODEL = etapa 1; o i2v do motor = etapa 2 (nenhuma coluna
// nova). O quadro-chave mora em caminho DETERMINÍSTICO (faceRemixKeyframePath) — a linha segue guardando a foto original.
// Preço: FACE_REMIX_CREDITS = 10 (decisão do fundador 28/10) para as duas etapas; estorno = o débito inteiro, em qualquer falha.
import { GALERIA_EXCLUDED, GALERIA_NEW_CLIPS, viaSignup, type FaceTemplate } from '@/lib/homeGaleria' // KINEO-ROSTO-QUADRO-CHAVE-2810 — era '../homeGaleria' (os carregadores dos guardiões do clipe resolvem './' e '@/')
import { CLIP_ENGINES, type ClipEngineKey, type ClipRequestInput } from './clipCatalog'
import { clipFalUsd } from './clipPricing' // KINEO-ROSTO-QUADRO-CHAVE-2810 — o custo fal da etapa 2; o preço em créditos é decisão do fundador (FACE_REMIX_CREDITS)
import { NANO_BANANA_EDIT_SLUG } from '@/lib/imageReference' // KINEO-ROSTO-QUADRO-CHAVE-2810 — o mesmo endpoint da foto de referência do /images

export const FACE_REMIX_MARK = 'KINEO-ROSTO-NO-CLIPE-2810'

/** Interruptor. false = só as contas da casa usam (a rota devolve 404 para o resto, sem ler nada nem cobrar). */
// Desligado em 28/10: teste pago em produção (Kling 3 image-to-video, foto + faceScene da Golden Ball) perdeu a identidade (o rosto
// na festa é outra pessoa) e abriu na própria foto (parque) com corte seco para a festa — o i2v usa a foto como 1º quadro. Volta a
// true só depois da etapa de quadro-chave (ramo separado). As contas da casa seguem com /clips?remix=<id> (faceRemixVisible).
export const FACE_REMIX_PUBLIC = false // era true (fundador 28/10: "A")

/** Abre o prompt de MOVIMENTO (etapa 2, Kling 3 a partir do quadro-chave): a identidade do 1º quadro não muda. */
// KINEO-ROSTO-QUADRO-CHAVE-2810 — receita validada em 3 testes reais (fundador + 2 amigos, 28/10, clipes 004bbd4b/21c0008c/7b18efcb, ~8/10):
// a identidade segurou o clipe inteiro, sem corte. Sem gênero fixo ("the person from the photo", nunca "the man").
export const FACE_REMIX_PREFIX = 'Animate this exact frame. The person from the photo keeps exactly the same face, hair and beard throughout and the face stays clearly visible. ' // KINEO-ROSTO-QUADRO-CHAVE-2810 — era "Keep the person's face…exactly as in the photo; the person from the photo is the main character. "
export const FACE_REMIX_MOTION_SUFFIX = 'Each person has exactly two arms and two hands. Continuous single shot, no cuts.' // KINEO-ROSTO-QUADRO-CHAVE-2810 — "two arms and two hands": uma mão extra apareceu no fim de um clipe de teste (28/10)
/** O sufixo da casa (o mesmo NO_TEXT dos efeitos): nada de texto, legenda, logo ou marca d'água no clipe. */
export const FACE_REMIX_SUFFIX = 'No text, no captions, no logos, no watermark.'

/** Eventos: `opened` sai do navegador (só o id), `submitted` só do servidor (pedido ACEITO e novo); KINEO-ROSTO-QUADRO-CHAVE-2810:
 *  `keyframe` quando a etapa 1 fecha e a etapa 2 é enviada (keyframe:'done', video:'submitted'), `ready` quando o vídeo chega
 *  (keyframe:'done', video:'delivered'). As falhas vão no clip_failed de sempre, com `keyframe` e `video` dizendo as DUAS etapas. */
export const FACE_REMIX_EVENTS = { opened: 'face_remix_opened', submitted: 'face_remix_submitted', keyframe: 'face_remix_keyframe', ready: 'face_remix_ready' } as const // KINEO-ROSTO-QUADRO-CHAVE-2810

// ═══ KINEO-ROSTO-QUADRO-CHAVE-2810 — as duas etapas ════════════════════════════════════════════════════════════════════════════
/** Créditos do remix inteiro (quadro-chave + vídeo). Decisão do fundador (28/10): 10. Era clipCreditCost(hollywood, 5, true) = 8. */
export const FACE_REMIX_CREDITS = 10 // KINEO-ROSTO-QUADRO-CHAVE-2810
/** Etapa 1: o edit do Nano Banana Pro (US$ 0,15 por imagem a 1K — lib/ads/cena/adapters.ts CENA_KEYFRAME_USD). */
export const FACE_REMIX_KEYFRAME_MODEL = NANO_BANANA_EDIT_SLUG // KINEO-ROSTO-QUADRO-CHAVE-2810
export const FACE_REMIX_KEYFRAME_USD = 0.15 // KINEO-ROSTO-QUADRO-CHAVE-2810
/** Motivo da falha da etapa 1 no clip_failed (a etapa 2 nunca roda; o estorno é dos 10). */
export const FACE_REMIX_KEYFRAME_FAILED = 'keyframe_failed' // KINEO-ROSTO-QUADRO-CHAVE-2810

export interface FaceRemixItem {
  id: string
  title: string
  engine: ClipEngineKey
  seconds: number
  video: string
  poster: string
  /** KINEO-ROSTO-QUADRO-CHAVE-2810 — o MODELO do catálogo (era `scene`, um texto só): still, movimento, plano, figurantes, pessoas. */
  template: FaceTemplate // KINEO-ROSTO-QUADRO-CHAVE-2810
}

/** Segundos do remix: os do clipe da casa (os de tendência são 5 s). */
const FACE_REMIX_SECONDS = 5

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — tira o ponto/espaço final de um texto do modelo (o código pontua ao colar). */
const trimEnd = (text: string): string => String(text ?? '').trim().replace(/[.\s]+$/, '') // KINEO-ROSTO-QUADRO-CHAVE-2810

/** Os itens que ganham o botão: os clipes de pessoa da curadoria COM modelo (`face`), fora os excluídos. */
export function faceRemixItems(): FaceRemixItem[] {
  return GALERIA_NEW_CLIPS.filter((c) => c.person === true && !!c.face && !GALERIA_EXCLUDED.includes(c.id)).map((c) => ({ // KINEO-ROSTO-QUADRO-CHAVE-2810 — + !!c.face
    id: c.id,
    title: c.title,
    engine: c.engine,
    seconds: FACE_REMIX_SECONDS,
    video: c.video,
    poster: c.poster,
    template: c.face as FaceTemplate, // KINEO-ROSTO-QUADRO-CHAVE-2810
  }))
}

export function faceRemixById(id: unknown): FaceRemixItem | null {
  if (typeof id !== 'string' || !id) return null
  return faceRemixItems().find((i) => i.id === id) ?? null
}

/** O item tem botão? (a galeria e a faixa perguntam aqui — nunca decidem sozinhas). Interruptor desligado = nenhum botão público. */
export function hasFaceRemix(id: string, publicFlag: boolean = FACE_REMIX_PUBLIC): boolean {
  return publicFlag === true && faceRemixById(id) !== null
}

/** O prompt de MOVIMENTO (etapa 2) que vai para o motor de vídeo — montado SÓ aqui, no servidor. É também o `prompt` da linha. */
export function faceRemixPrompt(item: FaceRemixItem): string {
  return `${FACE_REMIX_PREFIX}${trimEnd(item.template.motionPrompt)}. ${FACE_REMIX_MOTION_SUFFIX} ${FACE_REMIX_SUFFIX}` // KINEO-ROSTO-QUADRO-CHAVE-2810 — motionPrompt do modelo + "continuous single shot, no cuts"
}

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — o prompt do QUADRO-CHAVE (etapa 1): edita a foto para dentro da cena. Só o rosto vem da foto;
 *  fundo, enquadramento e barras pretas da foto são descartados (selfie de celular chega com letterbox). Validado em produção em
 *  28/10 ~17h UTC (foto do fundador, 162 KB JPEG, identidade "excelente"): o mesmo desenho — "the person from the reference
 *  photo — exactly the same face, same eyes, same hair, same beard — now wears…". */
// KINEO-ROSTO-QUADRO-CHAVE-2810 — o que o 2º quadro-chave do fundador ensinou (28/10, lado a lado em scratchpad/rosto2810): (1) plano
// aberto deixa o rosto minúsculo e a identidade escapa → PLANO MÉDIO (da cintura para cima, rosto grande); (2) duas referências ajudam
// — o RECORTE do rosto primeiro, a foto inteira depois; (3) dizer "não embelezar, não mudar formato do rosto nem idade" ajuda; (4) a
// identidade VAZA para os figurantes (os dois amigos saíram com o rosto dele) → os outros têm rostos claramente diferentes, atrás,
// menores e fora de foco; (5) o Nano Banana ainda envelhece/agrisalha um pouco — o prompt pede a mesma idade aparente.
export const FACE_REMIX_FRAMING = 'MEDIUM SHOT from the waist up, the main character large in the frame, face big, sharp and clearly visible, looking at the camera' // KINEO-ROSTO-QUADRO-CHAVE-2810
export const FACE_REMIX_FRAMING_GROUP = 'KNEES-UP SHOT, the people from the photos side by side filling the frame, every face large, sharp and clearly visible, looking at the camera' // KINEO-ROSTO-QUADRO-CHAVE-2810 — framing 'knees-up' (grupos)
export function faceRemixFraming(framing: FaceTemplate['framing']): string { return framing === 'knees-up' ? FACE_REMIX_FRAMING_GROUP : FACE_REMIX_FRAMING } // KINEO-ROSTO-QUADRO-CHAVE-2810
// A frase de identidade GENÉRICA (o cliente não tem a linha de traços pessoais do fundador) — validada nos 3 testes; sem gênero.
export const FACE_REMIX_IDENTITY = 'Keep their real face exactly: same face shape, eyes, eyebrows, nose, lips, hairline, beard and skin texture; same age; do not beautify or change any feature' // KINEO-ROSTO-QUADRO-CHAVE-2810
export const FACE_REMIX_NO_CLONES = 'Every other person in the image is a visibly DIFFERENT person with a clearly different face, hair, age and build — never a copy of the main character — smaller, behind and slightly out of focus. Each person has exactly two arms and two hands' // KINEO-ROSTO-QUADRO-CHAVE-2810
export function faceRemixKeyframePrompt(item: FaceRemixItem, withFaceCrop = false): string { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const t = item.template // KINEO-ROSTO-QUADRO-CHAVE-2810
  const refs = withFaceCrop ? 'Reference image 1 is a close crop of the main character\'s face; reference image 2 is the same person\'s full photo.' : 'The reference photo shows the main character.' // KINEO-ROSTO-QUADRO-CHAVE-2810
  const extras = trimEnd(t.extras) ? `Also in the scene: ${trimEnd(t.extras)}. ` : '' // KINEO-ROSTO-QUADRO-CHAVE-2810 — figurantes como pessoas visivelmente diferentes ('' = sem figurantes)
  return `Vertical 9:16 phone photo, the first frame of a short video. ${faceRemixFraming(t.framing)}. ${refs} The main character is the person from the reference photo. ${FACE_REMIX_IDENTITY}. Scene: ${trimEnd(t.keyframeScene)}. ${extras}${FACE_REMIX_NO_CLONES}. Ignore the reference photos' background, framing, clothing and any black bars; the whole image is the new scene. Realistic, natural light of the scene. ${FACE_REMIX_SUFFIX}` // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — o corpo do fal-ai/nano-banana-pro/edit da etapa 1 (schema lido em 28/10: prompt, image_urls,
 *  aspect_ratio enum com '9:16', num_images 1..4, resolution '1K'|'2K'|'4K', output_format jpeg|png|webp). 1K, como a Estrela
 *  do filme e a foto de referência do /images; PNG sem perda para o 1º quadro do Kling. O recorte do rosto (quando o navegador
 *  conseguiu fazê-lo) vai PRIMEIRO em image_urls, a foto inteira depois. */
export function faceRemixKeyframeInput(item: FaceRemixItem, photoUrl: string, faceUrl: string | null = null): Record<string, unknown> { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const image_urls = faceUrl && faceUrl !== photoUrl ? [faceUrl, photoUrl] : [photoUrl] // KINEO-ROSTO-QUADRO-CHAVE-2810
  return { prompt: faceRemixKeyframePrompt(item, image_urls.length === 2), image_urls, aspect_ratio: '9:16', num_images: 1, resolution: '1K', output_format: 'png' } // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — ETAPA 1b (troca de rosto por cima do quadro-chave, antes do Kling): PESQUISADO em 28/10 na fal e
 *  NÃO ligado. Achados (ids reais, lidos nas páginas/OpenAPI da fal): `easel-ai/advanced-face-swap` (US$ 0,05) está DEPRECIADO ("no
 *  longer supported"); `fal-ai/face-swap` (base_image_url + swap_image_url) ainda responde no OpenAPI, mas a página do modelo é uma
 *  casca sem documentação nem preço e ele não aparece na busca do catálogo — não é confiável para produto; `fal-ai/codeformer`
 *  (US$ 0,0021/MP) é RESTAURAÇÃO de rosto (nitidez), não troca — não devolve a identidade; `fal-ai/hy-wu-edit` (US$ 0,10/MP; "swap
 *  faces" com imagens de referência) é o único resultado da busca "face swap" da fal — candidato a A/B futuro, custo ≈ US$ 0,15 a 1K,
 *  o que levaria o remix a ≈ US$ 0,86 (margem ≈ 35% nos 10 cr). null = desligado; o settleClip não tem etapa 1b. */
export const FACE_REMIX_FACE_SWAP_MODEL: string | null = null // KINEO-ROSTO-QUADRO-CHAVE-2810

/** Créditos do remix: os 10 do fundador, iguais no botão, no GET, no débito e no estorno (o estorno devolve o débito inteiro). */
export function faceRemixCredits(_item: FaceRemixItem): number { // KINEO-ROSTO-QUADRO-CHAVE-2810 — era clipCreditCost(item.engine, item.seconds, true)
  return FACE_REMIX_CREDITS // KINEO-ROSTO-QUADRO-CHAVE-2810
}

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — custo fal das duas etapas (US$): quadro-chave 0,15 + vídeo i2v do motor (Kling 3 5 s = 0,56 → 0,71;
 *  margem ≈ 47% sobre US$ 0,1327/crédito do Creator mensal). Vai em clips.fal_usd. */
export function faceRemixFalUsd(item: FaceRemixItem): number { // KINEO-ROSTO-QUADRO-CHAVE-2810
  return Math.round((FACE_REMIX_KEYFRAME_USD + clipFalUsd(item.engine, item.seconds, true)) * 10000) / 10000 // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — o modelo da etapa 2: o image-to-video do motor do item (Kling 3 → o3/pro/image-to-video). */
export function faceRemixVideoModel(item: FaceRemixItem): string { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const model = CLIP_ENGINES[item.engine].i2vModel // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!model) throw new Error(`face remix: ${item.engine} has no image-to-video model`) // KINEO-ROSTO-QUADRO-CHAVE-2810
  return model // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — onde o quadro-chave mora no bucket `renders` (determinístico: dois atores gravam o MESMO arquivo;
 *  a linha não precisa de coluna nova — o caminho sai do id do clipe). */
export function faceRemixKeyframePath(userId: string, clipId: string): string { // KINEO-ROSTO-QUADRO-CHAVE-2810
  return `clips/${userId}/${clipId}-keyframe.png` // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — em que etapa está esta linha de `clips`? null = não é remix. */
export function faceRemixStageForRow(row: { prompt: string; engine: string; seconds: number; mode: string; model: string }): 'keyframe' | 'video' | null { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const item = faceRemixForRow(row) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!item) return null // KINEO-ROSTO-QUADRO-CHAVE-2810
  return row.model === FACE_REMIX_KEYFRAME_MODEL ? 'keyframe' : 'video' // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — o submitClip confere o `remix` do pedido contra o catálogo (espelho de clipTemplateForRequest dos
 *  efeitos): ausente = clipe de sempre; id desconhecido ou pedido que não bate com o item (motor, duração, prompt do servidor,
 *  modo foto) = recusa ANTES de qualquer custo. Só o servidor põe `remix` no pedido (resolveFaceRemixRequest). */
export function faceRemixForRequest( // KINEO-ROSTO-QUADRO-CHAVE-2810
  raw: unknown, // KINEO-ROSTO-QUADRO-CHAVE-2810
  req: { engine: string; mode: string; seconds: number; prompt: string; imageUrl: string | null }, // KINEO-ROSTO-QUADRO-CHAVE-2810
): { ok: true; item: FaceRemixItem | null } | { ok: false } { // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (raw === undefined) return { ok: true, item: null } // KINEO-ROSTO-QUADRO-CHAVE-2810
  const item = faceRemixById(raw) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!item) return { ok: false } // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (req.mode !== 'i2v' || !req.imageUrl || req.engine !== item.engine || req.seconds !== item.seconds || req.prompt !== faceRemixPrompt(item)) return { ok: false } // KINEO-ROSTO-QUADRO-CHAVE-2810
  return { ok: true, item } // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** Destino do botão: /clips?remix=<id>; visitante passa pelo cadastro e volta (o mesmo formato do resto da galeria). */
export function faceRemixHref(id: string, signedIn: boolean): string {
  return viaSignup('/clips?' + new URLSearchParams({ remix: id }).toString(), signedIn)
}

/** O que a tela do /clips recebe do GET /api/clips — sem o prompt (o navegador não precisa dele nem o manda de volta). */
export interface PublicFaceRemix {
  id: string
  title: string
  engine: ClipEngineKey
  engine_label: string
  seconds: number
  credits: number
  video: string
  poster: string
}

/** Cartões de remix que esta conta pode apertar (a rota recusa o resto com a mesma régua de motor). */
export function publicFaceRemixes(engineOk: (engine: ClipEngineKey) => boolean): PublicFaceRemix[] {
  return faceRemixItems().filter((i) => engineOk(i.engine)).map((i) => ({
    id: i.id,
    title: i.title,
    engine: i.engine,
    engine_label: CLIP_ENGINES[i.engine].label,
    seconds: i.seconds,
    credits: faceRemixCredits(i),
    video: i.video,
    poster: i.poster,
  }))
}

/** O remix aparece para esta conta? Público com o interruptor; antes, só a casa. */
export function faceRemixVisible(isInternal: boolean, publicFlag: boolean = FACE_REMIX_PUBLIC): boolean {
  return publicFlag === true || isInternal === true
}

/** O corpo do POST pede um remix? (campo ausente/vazio = o clipe de sempre). */
export function wantsFaceRemix(raw: unknown): boolean {
  return raw !== undefined && raw !== null && raw !== ''
}

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — o pedido resolvido leva `remix` (id) para o submitClip conferir no catálogo e trocar a etapa 1, e
 *  `faceImageUrl` (o recorte do rosto que o navegador subiu como 2ª foto; opcional — posse conferida no submitClip como a foto). */
export type FaceRemixClipRequest = ClipRequestInput & { remix: string; faceImageUrl: string | null } // KINEO-ROSTO-QUADRO-CHAVE-2810

export type FaceRemixResolution =
  | { ok: true; item: FaceRemixItem; body: FaceRemixClipRequest } // KINEO-ROSTO-QUADRO-CHAVE-2810 — era ClipRequestInput
  | { ok: false; status: number; code: string; error: string }

/**
 * O servidor transforma `remix` (id) + foto + consentimento no pedido do clipe. A ordem é o contrato:
 *   1. interruptor — fora dele, 404 sem ler nada;
 *   2. id do catálogo (item de pessoa) — desconhecido ou item sem pessoa, 400;
 *   3. foto obrigatória (o remix é sempre image-to-video) — sem foto, 400;
 *   4. consentimento obrigatório (`consent === true`: a foto é da pessoa ou de alguém que concordou) — sem ele, 400;
 *   5. prompt, motor, duração e formato SAEM DO CATÁLOGO. Nada do navegador além da foto entra no pedido.
 * Posse da foto, moderação (texto + imagem, inclusive menores e pessoas reais), saldo, débito e estorno seguem no submitClip.
 * KINEO-ROSTO-QUADRO-CHAVE-2810: o pedido leva `remix: item.id` — o submitClip confere (faceRemixForRequest), cobra os 10 e manda a
 * etapa 1 (quadro-chave) no lugar do i2v; a etapa 2 nasce no settleClip quando o quadro-chave fica pronto.
 */
export function resolveFaceRemixRequest(raw: unknown, ctx: { visible: boolean; imageUrl: unknown; consent: unknown; faceImageUrl?: unknown }): FaceRemixResolution { // KINEO-ROSTO-QUADRO-CHAVE-2810 — + faceImageUrl
  if (ctx.visible !== true) return { ok: false, status: 404, code: 'not_found', error: 'Not found.' }
  const item = faceRemixById(raw)
  if (!item) return { ok: false, status: 400, code: 'remix', error: 'Choose one of the listed clips.' }
  const imageUrl = typeof ctx.imageUrl === 'string' ? ctx.imageUrl.trim() : ''
  if (!imageUrl) return { ok: false, status: 400, code: 'remix_photo', error: 'This starts from a photo of a face. Add a photo first.' }
  if (ctx.consent !== true) return { ok: false, status: 400, code: 'remix_consent', error: 'Confirm the photo is of you or of someone who agreed to it.' }
  const faceImageUrl = typeof ctx.faceImageUrl === 'string' && ctx.faceImageUrl.trim() ? ctx.faceImageUrl.trim() : null // KINEO-ROSTO-QUADRO-CHAVE-2810
  return { ok: true, item, body: { engine: item.engine, seconds: item.seconds, aspect: null, prompt: faceRemixPrompt(item), imageUrl, remix: item.id, faceImageUrl } } // KINEO-ROSTO-QUADRO-CHAVE-2810 — + remix, faceImageUrl
}

/** Qual remix gerou esta linha de `clips`? (o prompt é fixo e só o servidor o escreve — sem coluna nova.) */
export function faceRemixForRow(row: { prompt: string; engine: string; seconds: number; mode: string }): FaceRemixItem | null {
  if (row.mode !== 'image') return null
  return faceRemixItems().find((i) => faceRemixPrompt(i) === row.prompt && i.engine === row.engine && i.seconds === row.seconds) ?? null
}

/** Metadata dos eventos do remix: só a forma do pedido (sem foto, texto ou e-mail). */
export function faceRemixEventMetadata(item: FaceRemixItem, clip: { id: string; credits: number }): Record<string, unknown> {
  return { id: item.id, engine: item.engine, seconds: item.seconds, credits: clip.credits, clip_id: clip.id, version: 'face_remix_keyframe_20261028' } // KINEO-ROSTO-QUADRO-CHAVE-2810 — era face_remix_20261028 (1 etapa)
}
