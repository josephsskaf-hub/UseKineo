// KINEO-H3-LETREIRO-0611 — [TRAVA 8.2 — fundador 06/11: "ver tudo que a gente pode fazer para melhorar... pode tomar a decisão sozinho"]
// O letreiro inventado nasce na ANIMAÇÃO, no terço de baixo, com a imagem-base limpa (baleias 06/11: "45 Svistins", "hope, hope."). O prompt
// pedia "the lower third clear for captions", e o motor sem campo de proibição lê "captions" como pedido. Teste com a mesma imagem, 6 clipes
// de cada: prompt antigo 1 legenda falsa, prompt novo 0. É o último passo antes do envio: o plano, o juiz e os stills continuam com o texto de sempre.

const FRASE_DAS_LEGENDAS = /subject (?:clearly )?framed(?: in the upper two-thirds)? with the lower third clear for captions/gi
const FRASE_NOVA = 'subject in the upper part of the frame, natural scenery continuing down to the bottom edge'
const LISTA_SEM_TEXTO = /,?\s*no watermark, no logo(?:, no readable text, letters, numbers, labels or signage anywhere in the frame)?/gi
const SO_SEM_TEXTO = /,?\s*no readable text, letters, numbers, labels or signage anywhere in the frame/gi
const FOTO = /\bphotorealistic\b/i
const FECHO_FOTO = 'Real photographed footage only.'

const MOTORES_SEM_NEGATIVO = /^(?:minimax\/|fal-ai\/bytedance\/seedance\/|fal-ai\/seedance-2\.5|google\/gemini-omni)/
const MOTORES_COM_NEGATIVO = /^(?:fal-ai\/kling-video\/|fal-ai\/veo3)/

/** O prompt que vai ao motor de vídeo. Sem a frase das legendas, nada muda; com negative_prompt, a lista de proibições fica. */
export function semConviteDeLetreiro(model: string, prompt: string): string {
  const semNegativo = MOTORES_SEM_NEGATIVO.test(model)
  if (!semNegativo && !MOTORES_COM_NEGATIVO.test(model)) return prompt
  FRASE_DAS_LEGENDAS.lastIndex = 0
  if (!FRASE_DAS_LEGENDAS.test(prompt)) return prompt
  FRASE_DAS_LEGENDAS.lastIndex = 0
  let p = prompt.replace(FRASE_DAS_LEGENDAS, FRASE_NOVA).replace('immediately in the first frame, clearly readable;', 'immediately in the first frame, clearly visible;')
  if (!semNegativo) return p
  p = p.replace(LISTA_SEM_TEXTO, '').replace(SO_SEM_TEXTO, '').replace(/\s+([,.])/g, '$1').replace(/,\s*\./g, '.').trim()
  if (FOTO.test(p) && !p.includes(FECHO_FOTO)) p = `${p.replace(/[,\s]+$/, '').replace(/([^.])$/, '$1.')} ${FECHO_FOTO}`
  return p
}

/** A entrada inteira, para o envio à fal. Outro corpo sai igual, sem cópia. */
export function entradaSemConviteDeLetreiro<T extends Record<string, unknown>>(model: string, input: T): T {
  if (typeof input.prompt !== 'string') return input
  const prompt = semConviteDeLetreiro(model, input.prompt)
  return prompt === input.prompt ? input : { ...input, prompt }
}
