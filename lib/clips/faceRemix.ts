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
// MÓDULO PURO (só imports relativos): a rota, a tela do /clips, a galeria, a faixa da home e o guardião
// (scripts/test-rosto-no-clipe-2810.mjs) leem o MESMO catálogo.
import { GALERIA_EXCLUDED, GALERIA_NEW_CLIPS, viaSignup } from '../homeGaleria'
import { CLIP_ENGINES, type ClipEngineKey, type ClipRequestInput } from './clipCatalog'
import { clipCreditCost } from './clipPricing'

export const FACE_REMIX_MARK = 'KINEO-ROSTO-NO-CLIPE-2810'

/** Interruptor. false = só as contas da casa usam (a rota devolve 404 para o resto, sem ler nada nem cobrar). */
export const FACE_REMIX_PUBLIC = true // fundador 28/10: "A"

/** Abre o prompt de todo remix: a identidade vem da foto, sempre. */
export const FACE_REMIX_PREFIX = "Keep the person's face, skin tone, hair and identity exactly as in the photo; the person from the photo is the main character. "
/** O sufixo da casa (o mesmo NO_TEXT dos efeitos): nada de texto, legenda, logo ou marca d'água no clipe. */
export const FACE_REMIX_SUFFIX = 'No text, no captions, no logos, no watermark.'

/** Eventos: `opened` sai do navegador (só o id), `submitted` só do servidor (pedido ACEITO e novo). */
export const FACE_REMIX_EVENTS = { opened: 'face_remix_opened', submitted: 'face_remix_submitted' } as const

export interface FaceRemixItem {
  id: string
  title: string
  engine: ClipEngineKey
  seconds: number
  video: string
  poster: string
  /** A cena reescrita para a pessoa da foto (faceScene do catálogo, ou o prompt do clipe). */
  scene: string
}

/** Segundos do remix: os do clipe da casa (os de tendência são 5 s). */
const FACE_REMIX_SECONDS = 5

/** Tira o "No text…/No logos…" do fim do prompt de origem (o sufixo da casa entra uma vez só, no fim). */
function sceneWithoutSuffix(text: string): string {
  return text.replace(/\s*No (?:text|captions|logos)\b[\s\S]*$/i, '').trim()
}

/** Os itens que ganham o botão: os clipes de pessoa da curadoria, fora os excluídos. */
export function faceRemixItems(): FaceRemixItem[] {
  return GALERIA_NEW_CLIPS.filter((c) => c.person === true && !GALERIA_EXCLUDED.includes(c.id)).map((c) => ({
    id: c.id,
    title: c.title,
    engine: c.engine,
    seconds: FACE_REMIX_SECONDS,
    video: c.video,
    poster: c.poster,
    scene: sceneWithoutSuffix(c.faceScene ?? c.prompt),
  }))
}

export function faceRemixById(id: unknown): FaceRemixItem | null {
  if (typeof id !== 'string' || !id) return null
  return faceRemixItems().find((i) => i.id === id) ?? null
}

/** O item tem botão? (a galeria e a faixa perguntam aqui — nunca decidem sozinhas). */
export function hasFaceRemix(id: string): boolean {
  return faceRemixById(id) !== null
}

/** O prompt que vai para o motor — montado SÓ aqui, no servidor. */
export function faceRemixPrompt(item: FaceRemixItem): string {
  const scene = item.scene.replace(/[.\s]+$/, '')
  return `${FACE_REMIX_PREFIX}${scene}. ${FACE_REMIX_SUFFIX}`
}

/** Créditos = o preço do clipe de sempre, com foto (a MESMA chamada que o submitClip faz na hora do débito). */
export function faceRemixCredits(item: FaceRemixItem): number {
  return clipCreditCost(item.engine, item.seconds, true)
}

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

export type FaceRemixResolution =
  | { ok: true; item: FaceRemixItem; body: ClipRequestInput }
  | { ok: false; status: number; code: string; error: string }

/**
 * O servidor transforma `remix` (id) + foto + consentimento no pedido do clipe. A ordem é o contrato:
 *   1. interruptor — fora dele, 404 sem ler nada;
 *   2. id do catálogo (item de pessoa) — desconhecido ou item sem pessoa, 400;
 *   3. foto obrigatória (o remix é sempre image-to-video) — sem foto, 400;
 *   4. consentimento obrigatório (`consent === true`: a foto é da pessoa ou de alguém que concordou) — sem ele, 400;
 *   5. prompt, motor, duração e formato SAEM DO CATÁLOGO. Nada do navegador além da foto entra no pedido.
 * Posse da foto, moderação (texto + imagem, inclusive menores e pessoas reais), saldo, débito e estorno seguem no submitClip.
 */
export function resolveFaceRemixRequest(raw: unknown, ctx: { visible: boolean; imageUrl: unknown; consent: unknown }): FaceRemixResolution {
  if (ctx.visible !== true) return { ok: false, status: 404, code: 'not_found', error: 'Not found.' }
  const item = faceRemixById(raw)
  if (!item) return { ok: false, status: 400, code: 'remix', error: 'Choose one of the listed clips.' }
  const imageUrl = typeof ctx.imageUrl === 'string' ? ctx.imageUrl.trim() : ''
  if (!imageUrl) return { ok: false, status: 400, code: 'remix_photo', error: 'This starts from a photo of a face. Add a photo first.' }
  if (ctx.consent !== true) return { ok: false, status: 400, code: 'remix_consent', error: 'Confirm the photo is of you or of someone who agreed to it.' }
  return { ok: true, item, body: { engine: item.engine, seconds: item.seconds, aspect: null, prompt: faceRemixPrompt(item), imageUrl } }
}

/** Qual remix gerou esta linha de `clips`? (o prompt é fixo e só o servidor o escreve — sem coluna nova.) */
export function faceRemixForRow(row: { prompt: string; engine: string; seconds: number; mode: string }): FaceRemixItem | null {
  if (row.mode !== 'image') return null
  return faceRemixItems().find((i) => faceRemixPrompt(i) === row.prompt && i.engine === row.engine && i.seconds === row.seconds) ?? null
}

/** Metadata dos eventos do remix: só a forma do pedido (sem foto, texto ou e-mail). */
export function faceRemixEventMetadata(item: FaceRemixItem, clip: { id: string; credits: number }): Record<string, unknown> {
  return { id: item.id, engine: item.engine, seconds: item.seconds, credits: clip.credits, clip_id: clip.id, version: 'face_remix_20261028' }
}
