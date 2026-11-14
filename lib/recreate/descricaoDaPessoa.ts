// ═══ KINEO-RECREATE-MOVIMENTO-1411 — o LEITOR DA PESSOA [CEO 14/11 07:00, ajuste 2: "um só para os dois produtos"] ═══
// A visão lê, da foto do cliente, cabelo (cor um tom mais escuro do que parece, comprimento, forma, volume contido), barba e óculos, e devolve UMA
// frase positiva para o texto da imagem. Serve ao passo 1 do molde de movimento e ao texto do Recreate "com o seu vídeo" (o /check).
// Por quê: no teste da CEO (14/11 06:53), a foto só de rosto virou uma pessoa de cabelo curto e arrumado; com cabelo e barba DESCRITOS no texto
// ("thick, wavy dark-brown hair with volume on top, swept up and back off the forehead, slightly messy, and a short dark stubble beard") a imagem
// saiu com o cabelo, a barba e as sobrancelhas da foto.
// Regras: nunca lança; leitura que falha = null (quem chama segue SEM a descrição e grava o evento); a frase é montada AQUI a partir de campos curtos
// e filtrados (o texto livre do modelo nunca vai direto para o motor); nenhuma frase negativa, salvo "wearing no glasses" (a CEO liberou).
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { readVisionAnswer } from './swapCheck'

export const DESCRICAO_TIMEOUT_MS = 8_000
export const DESCRICAO_MODEL_DEFAULT: string = AI_TEXT_MODELS.writer
export type DescricaoFalhou = 'config' | 'timeout' | 'http_error' | 'refusal' | 'null_answer' | 'invalid_json' | 'no_person'
/** `texto` = a frase do movimento (com os óculos); `cabeloEBarba` = só cabelo e barba, sem "with" na frente e sem óculos (o "com o seu vídeo" já
 *  decide os óculos comparando o vídeo e a foto). */
export type DescricaoDaPessoa = { ok: true; texto: string; cabeloEBarba: string; usd: number } | { ok: false; why: DescricaoFalhou }

export const DESCRICAO_INSTRUCAO = [
  'You describe the hair and facial hair of the one person in the photo, so an image model can draw the same person.',
  'Answer with JSON only: {"person_visible": true|false, "hair_color": "...", "hair_length": "...", "hair_shape": "...", "hair_volume": "...", "hair_style": "...", "beard": "...", "glasses": true|false}.',
  'hair_color: name the colour one shade darker than it looks in the photo (photos make hair look lighter), e.g. "dark-brown", "black", "dark-blonde", "auburn", "grey".',
  'hair_length: e.g. "short", "medium-length", "shoulder-length", "long", "shaved".',
  'hair_shape: e.g. "straight", "wavy", "curly", "coily".',
  'hair_volume: modest words only, e.g. "some volume on top", "flat", "full"; keep it contained.',
  'hair_style: up to 10 words on how it is worn, e.g. "swept up and back off the forehead, slightly messy", "parted on the left".',
  'beard: up to 6 words, e.g. "a short dark stubble beard", "a full dark beard", "clean-shaven".',
  'Use plain lowercase words. Describe only what is visible.',
].join(' ')

/** Um campo curto e limpo: só letras, espaço, hífen e vírgula; até `max` palavras; nada de palavra negativa. Fora disso = vazio. */
export function campoLimpo(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  const t = v.toLowerCase().replace(/[^a-z ,\-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^,+|,+$/g, '').trim()
  if (!t || t.split(' ').length > max) return ''
  if (/\b(no|not|never|without|none|nothing)\b/.test(t)) return ''
  return t
}

/** Só cabelo e barba (sem óculos, sem "with" na frente), ou null sem o mínimo. */
export function cabeloEBarbaEmTexto(parsed: unknown): string | null {
  const t = descricaoEmTexto({ ...((parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>), glasses: null })
  return t ? t.replace(/^with /, '') : null
}

/** Os campos lidos viram UMA frase positiva (ou null quando não há o mínimo: a cor ou o comprimento do cabelo). */
export function descricaoEmTexto(parsed: unknown): string | null {
  const r = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
  if (r.person_visible === false) return null
  const cor = campoLimpo(r.hair_color, 3)
  const comprimento = campoLimpo(r.hair_length, 3)
  const forma = campoLimpo(r.hair_shape, 2)
  const volume = campoLimpo(r.hair_volume, 5)
  const estilo = campoLimpo(r.hair_style, 10)
  const barba = campoLimpo(r.beard, 6)
  if (!cor && !comprimento) return null
  const cabelo = [comprimento, forma, cor].filter(Boolean).join(' ').replace(/,/g, '')
  const partes = [`with ${cabelo} hair${volume && volume !== 'flat' ? ` with ${volume}` : ''}${estilo ? `, ${estilo}` : ''}`]
  if (barba) partes.push(/^(a|an)\b|shaven|shaved/.test(barba) ? barba : `a ${barba}`)
  if (r.glasses === true) partes.push('wearing glasses')
  else if (r.glasses === false) partes.push('wearing no glasses')
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} and ${partes[partes.length - 1]}` : partes[0]
}

export function mensagensDaDescricao(fotoUrl: string) {
  return [
    { role: 'system' as const, content: DESCRICAO_INSTRUCAO },
    { role: 'user' as const, content: [{ type: 'text' as const, text: 'The photo:' }, { type: 'image_url' as const, image_url: { url: fotoUrl, detail: 'high' as const } }] },
  ]
}

export interface DescricaoOpts { apiKey?: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number }
/** Lê a foto (uma chamada de visão, ~US$ 0,005). Nunca lança. */
export async function lerDescricaoDaPessoa(fotoUrl: string, opts: DescricaoOpts = {}): Promise<DescricaoDaPessoa> {
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY
  if (!key || !/^https:\/\//.test(fotoUrl)) return { ok: false, why: 'config' }
  const model = opts.model ?? process.env.RECREATE_PESSOA_MODEL ?? DESCRICAO_MODEL_DEFAULT
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 200, response_format: { type: 'json_object' }, messages: mensagensDaDescricao(fotoUrl) }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DESCRICAO_TIMEOUT_MS),
    })
    if (!res.ok) return { ok: false, why: 'http_error' }
    const data = (await res.json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const lido = readVisionAnswer(data)
    if ('why' in lido) return { ok: false, why: lido.why === 'refusal' || lido.why === 'null_answer' ? lido.why : 'invalid_json' }
    const texto = descricaoEmTexto(lido.parsed)
    const cabeloEBarba = cabeloEBarbaEmTexto(lido.parsed)
    if (!texto || !cabeloEBarba) return { ok: false, why: 'no_person' }
    const usd = ((data.usage?.prompt_tokens ?? 0) * 2.5 + (data.usage?.completion_tokens ?? 0) * 10) / 1_000_000
    return { ok: true, texto, cabeloEBarba, usd: Math.round(usd * 10000) / 10000 }
  } catch (e) {
    return { ok: false, why: (e as { name?: string })?.name === 'TimeoutError' || (e as { name?: string })?.name === 'AbortError' ? 'timeout' : 'http_error' }
  }
}
