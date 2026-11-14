// ═══ KINEO-RECREATE-MOVIMENTO-1411 — o JUIZ DA CENA [desenho aprovado pela CEO 14/11 07:00, ajuste 3: "É o que teria me poupado o primeiro teste"] ═══
// Antes de pagar o vídeo (US$ 0,56 em 8 s), a imagem do passo 1 é comparada com a foto do cliente: é a mesma pessoa? Uma chamada de visão (~US$ 0,005).
//   'other'      → o settleClip falha a linha com estorno e o motor de vídeo NUNCA é chamado.
//   'same'       → segue.
//   'unverified' → segue (a checagem que falha não pune o cliente; o revisor de vídeos ainda dá a nota depois).
// Roda UMA vez por linha: o settleClip só chama o juiz depois de ganhar a reserva do passo 2. Nunca lança.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { readVisionAnswer } from './swapCheck'

export const JUIZ_CENA_TIMEOUT_MS = 15_000
export type VeredictoDaCena = { result: 'same' | 'other' | 'unverified'; reason: string }

export const JUIZ_CENA_INSTRUCAO = [
  'Image A is a customer photo. Image B is a generated scene that must show the SAME person.',
  'Compare only identity: face shape, eyes, eyebrows, nose, mouth, hairline, hair colour and length, facial hair, apparent age and skin tone. Clothing, pose, light and background change on purpose.',
  'Answer with JSON only: {"face_visible_in_b": true|false, "same_person": true|false|null, "reason": "up to 12 words"}.',
  'same_person is false only when the person in B is clearly someone else; use null when you cannot tell.',
].join(' ')

export function mensagensDoJuizDaCena(fotoUrl: string, cenaUrl: string) {
  return [
    { role: 'system' as const, content: JUIZ_CENA_INSTRUCAO },
    { role: 'user' as const, content: [
      { type: 'text' as const, text: 'Image A (customer photo):' }, { type: 'image_url' as const, image_url: { url: fotoUrl, detail: 'high' as const } },
      { type: 'text' as const, text: 'Image B (generated scene):' }, { type: 'image_url' as const, image_url: { url: cenaUrl, detail: 'high' as const } },
    ] },
  ]
}

/** A decisão, separada da rede (o guardião a testa direto). "Outra pessoa" só com o rosto visível e a resposta false explícita. */
export function decidirCena(parsed: unknown): VeredictoDaCena {
  const r = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
  const motivo = typeof r.reason === 'string' ? r.reason.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  if (r.face_visible_in_b === true && r.same_person === false) return { result: 'other', reason: motivo || 'different person' }
  if (r.face_visible_in_b === true && r.same_person === true) return { result: 'same', reason: motivo || 'same person' }
  return { result: 'unverified', reason: r.face_visible_in_b === false ? 'face_not_visible' : 'uncertain' }
}

export interface JuizCenaOpts { apiKey?: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number }
export async function julgarCena(fotoUrl: string | null, cenaUrl: string, opts: JuizCenaOpts = {}): Promise<VeredictoDaCena> {
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY
  if (!key || !fotoUrl || !/^https:\/\//.test(fotoUrl) || !/^https:\/\//.test(cenaUrl)) return { result: 'unverified', reason: 'config' }
  const model = opts.model ?? process.env.RECREATE_SWAP_CHECK_MODEL ?? AI_TEXT_MODELS.writer
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 120, response_format: { type: 'json_object' }, messages: mensagensDoJuizDaCena(fotoUrl, cenaUrl) }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? JUIZ_CENA_TIMEOUT_MS),
    })
    if (!res.ok) return { result: 'unverified', reason: 'http_error' }
    const lido = readVisionAnswer(await res.json())
    return 'why' in lido ? { result: 'unverified', reason: lido.why } : decidirCena(lido.parsed)
  } catch (e) {
    return { result: 'unverified', reason: (e as { name?: string })?.name === 'TimeoutError' ? 'timeout' : 'http_error' }
  }
}
