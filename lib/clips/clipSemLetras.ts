// KINEO-CLIPE-SEM-LETRAS-0111 — revisor 01/11 (cumiasammanis27, Modo Clipe do Studio, Seedance 1.5, 5 s, 2D de terror): o estilo
// saiu bom, mas a tela do celular e o último quadro mostraram letras falsas ("G hcwy", "Siny Stoite"). Os motores de vídeo não
// escrevem: palavra que aparece na imagem sai inventada.
//
// KINEO-CLIPE-SEM-LETRAS-0111d — decisão depois de duas revisões adversariais: a casa NÃO extrai o texto pedido (cortava "the end"
// → "end", "Welcome to hell" → "Welcome", "Paris, France" → "Paris" e mandava o motor soletrar o pedaço) e NÃO adivinha que o
// cliente "já proibiu texto" (prosa com "no words" desligava a proteção da tela). REGRA ÚNICA:
//   · o pedido pede texto explicitamente (aspas, ou says/reads/written/writing/escrito/dizendo/que diz/with the words/text:
//     seguido de algo) → a casa não acrescenta NADA; o prompt segue como o cliente escreveu, igual à base;
//   · qualquer outro caso → proteção genérica: negative_prompt onde o schema do motor tem o campo; senão a frase curta no fim.
// Na dúvida o texto do cliente nunca é cortado: o pior caso é o mesmo prompt de antes desta entrega.
//
// MÓDULO PURO (sem import): o /clips (lib/clips/clipCatalog.ts) importa daqui; o Modo Clipe do Studio (lib/cinematic/shotSpec.ts)
// é executado isolado pelos guardiões, sem require, e leva uma CÓPIA EXATA do bloco abaixo — o guardião
// scripts/test-clipe-sem-letras-0111.mts compara as duas cópias.
//
// NEGATIVE_PROMPT (schema OpenAPI da fal lido em 01/11/2026, https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>):
//   aceitam  → kling-video/v3/pro/text-to-video, kling-video/v2.5-turbo/pro/{text,image}-to-video (padrão "blur, distort, and low
//              quality", mantido no começo), veo3.1/fast e veo3.1/fast/image-to-video (padrão nulo).
//   não têm  → bytedance/seedance/v1.5/pro (t2v e i2v), kling-video/o3/pro/image-to-video, minimax/h3 (t2v e i2v),
//              google/gemini-omni-flash/image-to-video, seedance-2.5/text-to-video — esses recebem só a frase no texto.

export const MOTORES_COM_NEGATIVE_PROMPT: readonly string[] = [
  'fal-ai/kling-video/v3/pro/text-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'fal-ai/veo3.1/fast',
  'fal-ai/veo3.1/fast/image-to-video',
]
/** O padrão do schema do Kling: quem manda negative_prompt substitui o padrão, então ele vai junto, no começo. */
export const KLING_NEGATIVE_PADRAO = 'blur, distort, and low quality'
export const NEGATIVO_SEM_LETRAS = 'text, letters, words, writing, readable text, gibberish text, random characters, captions, subtitles, title card, watermark, logo'

// ⚠ CÓPIA EXATA em lib/cinematic/shotSpec.ts (de "INÍCIO-CÓPIA" a "FIM-CÓPIA") — mexeu aqui, mexe lá; o guardião compara.
// INÍCIO-CÓPIA pedeTextoExplicito
/** A frase curta da casa, para motor sem negative_prompt. */
export const FRASE_SEM_LETRAS = 'Screens, signs and papers show no legible words.'
// aspas com letra/número dentro ("OPEN", “Feliz Natal”, «SE VENDE», 'EXIT' — apóstrofo de "Luffy's" não conta)
const PL_ASPAS = /["“«„][^"“”«»„\n]*[\p{L}\p{N}][^"“”«»„\n]*["”»“]|(?:^|[\s:(])'[^'\n]*[\p{L}\p{N}][^'\n]*'(?=[\s.,;:!?)]|$)/u
// deixa de escrita seguida de algo (palavra, número ou aspas): "says the end", "reading THE END", "escrito o fim", "text: hi"
const PL_DEIXA = /(?:\b(?:says|saying|reads|reading|written|writing|titled|entitled|labell?ed|escrit[oa]s?|dizendo|que diz|que dice|with the words?|com as palavras|com a palavra)|\b(?:text|texto)\s*:)\s*[\p{L}\p{N}"“«„']/iu
/** O cliente pediu texto explicitamente? Então a casa não acrescenta nada ao prompt dele. */
export function pedeTextoExplicito(prompt: string): boolean {
  const p = String(prompt ?? '')
  return PL_ASPAS.test(p) || PL_DEIXA.test(p)
}
// FIM-CÓPIA pedeTextoExplicito

/** A frase que fecha todo efeito do catálogo (lib/clips/clipEffects.ts NO_TEXT; o guardião confere a igualdade). O prompt é da
 *  casa, não do cliente, e já proíbe texto: vai byte a byte igual, sem frase nem negative_prompt (como na base). */
export const FECHO_DOS_EFEITOS = 'No text, no captions, no logos, no watermark.'
/** A casa não acrescenta nada: o cliente pediu texto, ou o prompt é de um efeito do catálogo. */
export function promptFicaComoVeio(prompt: string): boolean {
  const p = String(prompt ?? '')
  return pedeTextoExplicito(p) || p.trimEnd().endsWith(FECHO_DOS_EFEITOS)
}

/** negative_prompt para o endpoint da fal, ou null quando o schema dele não tem o campo (aí só vale a frase no texto) ou quando
 *  a casa não acrescenta nada (texto pedido / efeito do catálogo). */
export function negativePromptSemLetras(endpoint: string, prompt: string): string | null {
  if (!MOTORES_COM_NEGATIVE_PROMPT.includes(endpoint) || promptFicaComoVeio(prompt)) return null
  return endpoint.startsWith('fal-ai/kling-video/') ? `${KLING_NEGATIVE_PADRAO}, ${NEGATIVO_SEM_LETRAS}` : NEGATIVO_SEM_LETRAS
}
