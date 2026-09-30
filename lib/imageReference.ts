// KINEO-IMAGENS-FOTO-REFERENCIA-2026-09-29 — foto de referência no Nano Banana Pro (regra PURA, sem import).
//
// PEDIDO DO FUNDADOR (29/09): subir a foto de um amigo, escrever "meu amigo lutando na guerra de Troia como Aquiles" e a
// imagem sair COM O ROSTO dele. O fal já tem o endpoint `fal-ai/nano-banana-pro/edit` (prompt + image_urls, mesmo preço
// do texto→imagem a 1K). Este módulo é a régua única de quem decide: a rota de upload (app/api/images/reference) e a de
// gerar (app/api/images/generate) importam daqui; o guardião scripts/test-images-foto-referencia-2026-09-29.mjs
// transpila este arquivo e executa as funções de verdade.
//
// AS REGRAS:
//  1. Referência só no Nano Banana Pro. Os outros motores seguem no endpoint de hoje, sem referência.
//  2. A referência NUNCA é uma URL: é o CAMINHO no nosso bucket, e só da pasta da PRÓPRIA conta
//     (images/<uid>/refs/<uuid>.<ext>). O servidor assina a URL de curta duração; o navegador não escolhe endereço.
//  3. Consentimento é do servidor: com foto e sem reference_consent === true, recusa ANTES de moderar e de cobrar.
//  4. Até 3 fotos, sem repetição.
//  5. Custo: o mesmo do Nano Banana Pro de hoje (a rota lê MODELS.nanobanana.cost — não existe preço próprio aqui).

export const REFERENCE_MODEL_KEY = 'nanobanana'
export const NANO_BANANA_EDIT_SLUG = 'fal-ai/nano-banana-pro/edit'
export const REFERENCE_MAX_PHOTOS = 3
/** Teto do arquivo que a pessoa escolhe. O navegador reduz para ≤ 2048 px em JPEG antes de enviar (a Vercel corta corpo
 * acima de ~4,5 MB), então o que chega aqui costuma ter < 1,5 MB; o servidor ainda recusa acima do teto. */
export const REFERENCE_MAX_BYTES = 10 * 1024 * 1024
/** Validade da URL assinada que vai à moderação e à fal (fila do fal leva segundos a poucos minutos). */
export const REFERENCE_SIGNED_URL_SECONDS = 15 * 60
export const IDENTITY_INSTRUCTION = 'Keep the exact face and identity of the person in the reference photo(s).'

export type ReferenceMime = 'image/jpeg' | 'image/png' | 'image/webp'
export type ReferenceSize = 'square_hd' | 'portrait_16_9' | 'landscape_16_9'

const EXT_BY_MIME: Record<ReferenceMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function safeUid(userId: string): string {
  return String(userId ?? '').replace(/[^a-zA-Z0-9-]/g, '')
}

/** Tipo real pelos primeiros bytes: JPEG FF D8 FF · PNG 89 50 4E 47 · WEBP "RIFF....WEBP". Outra coisa = null. */
export function sniffReferenceMime(b: Uint8Array): ReferenceMime | null {
  if (!b || b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** Caminho novo para uma referência desta conta (o id vem de quem chama: randomUUID no servidor). */
export function referencePathFor(userId: string, id: string, mime: ReferenceMime): string {
  return `images/${safeUid(userId)}/refs/${id}.${EXT_BY_MIME[mime]}`
}

/** Só o que referencePathFor grava para ESTA conta. Qualquer outra coisa (URL, outra conta, ../, outra pasta) = falso. */
export function isOwnReferencePath(path: unknown, userId: string): boolean {
  const uid = safeUid(userId)
  if (!uid || typeof path !== 'string') return false
  return new RegExp(`^images/${uid}/refs/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp)$`).test(path)
}

export type ReferenceDecision =
  | { ok: true; paths: string[] }
  | { ok: false; status: number; error: string; code: string }

/**
 * Lê o pedido de /api/images/generate. Sem referência → { ok, paths: [] } (endpoint de hoje). Com referência: só no
 * Nano Banana Pro, com consentimento, até 3, sem repetir, todas da pasta da própria conta.
 */
export function decideReferenceRequest(
  body: { reference_paths?: unknown; reference_consent?: unknown },
  modelKey: string,
  userId: string,
): ReferenceDecision {
  const raw = body?.reference_paths
  if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) return { ok: true, paths: [] }
  if (!Array.isArray(raw)) return { ok: false, status: 400, error: 'Invalid reference photos.', code: 'reference_invalid' }
  if (modelKey !== REFERENCE_MODEL_KEY) {
    return { ok: false, status: 400, error: 'Reference photos work with Nano Banana Pro only.', code: 'reference_model' }
  }
  if (body.reference_consent !== true) {
    return { ok: false, status: 400, error: 'Please confirm you have permission from the person in the photo.', code: 'reference_consent' }
  }
  if (raw.length > REFERENCE_MAX_PHOTOS) {
    return { ok: false, status: 400, error: `Up to ${REFERENCE_MAX_PHOTOS} reference photos.`, code: 'reference_too_many' }
  }
  if (new Set(raw).size !== raw.length) return { ok: false, status: 400, error: 'Invalid reference photos.', code: 'reference_invalid' }
  if (!raw.every((p) => isOwnReferencePath(p, userId))) {
    return { ok: false, status: 400, error: 'Invalid reference photo — upload it again.', code: 'reference_owner' }
  }
  return { ok: true, paths: raw as string[] }
}

export function aspectRatioFor(size: ReferenceSize): '1:1' | '16:9' | '9:16' {
  return size === 'square_hd' ? '1:1' : size === 'landscape_16_9' ? '16:9' : '9:16'
}

/** Corpo do `fal-ai/nano-banana-pro/edit`: prompt da pessoa + instrução fixa de identidade, as fotos, o formato. */
export function buildNanoBananaEditInput(prompt: string, size: ReferenceSize, imageUrls: string[]): Record<string, unknown> {
  return {
    prompt: `${prompt.trim()}\n\n${IDENTITY_INSTRUCTION}`,
    image_urls: imageUrls,
    aspect_ratio: aspectRatioFor(size),
    num_images: 1,
    resolution: '1K',
  }
}
