// ═══ KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 [CEO 13/11 22:46, item A; dono: Recreate "com o seu vídeo" pronto para cliente] ═══════════════
// O texto do pedido que TROCA DE PRIMEIRA no Kling 4.0 edição. Fatos pela nossa chave, mesma foto de rosto real (quadro 13/11 22:04–22:26):
// texto NEUTRO não trocou em 3 de 3 ("the main person… their face"; "the person dancing… the person from @Image1"); texto com DESCRIÇÃO e
// GÊNERO trocou em 4 de 4 ("the dancer… the man from @Image1: his face and hair"; "the man in the dark blue shirt… the man from @Image1…").
// Então o /check monta: "Replace {descrição} in @Video1 with the {man|woman} from @Image1: {his|her} face and hair match @Image1. Keep …".
//   · descrição: uma chamada de visão barata (AI_TEXT_MODELS.vision) olha UM quadro do vídeo e devolve, para cada pessoa a trocar, até 8
//     palavras de ROUPA e POSIÇÃO. Nunca identidade, idade, etnia, pele, corpo ou nome: o texto passa por um filtro e, se sujar, cai.
//   · gênero de cada foto (man | woman): o campo da tela (o GPT vai perguntar homem/mulher) GANHA da visão; sem os dois, cai.
//   · sem gênero para TODA foto = o texto de hoje (promptKling4), como antes. O cliente continua podendo editar.
// Módulo puro com io injetado (quadro e visão): o guardião scripts/test-recreate-texto-do-pedido-1311.mjs executa tudo sem rede.
import { promptKling4 } from './seuVideo'

export type Genero = 'man' | 'woman'
export type FonteDoTexto = 'tela' | 'visao' | 'tela_e_visao' | 'padrao'
export const TEXTO_DO_PEDIDO_EVENTO = 'recreate_seu_video_prompt' as const
export const TEXTO_DO_PEDIDO_VERSAO = 'texto_do_pedido_1311_v1' as const
export const VISAO_TIMEOUT_MS = 12_000
export const MAX_PALAVRAS_DESCRICAO = 8

/** Palavras que NÃO são roupa nem posição: identidade, origem, pele, idade, corpo, fama. Descrição com uma delas é descartada. */
const PROIBIDAS = /\b(skin|race|racial|ethnic\w*|asian|african|black[- ]skinned|white[- ]skinned|caucasian|latin[oa]|hispanic|arab\w*|indian|jewish|muslim|christian|celebrity|famous|actor|actress|singer|rapper|athlete|player\s+\d+|named|called|old|young|elderly|aged|teen\w*|child|kid|baby|girl|boy|fat|thin|skinny|slim|chubby|overweight|beautiful|pretty|handsome|ugly|sexy|tattoo\w*)\b/i

/** Gênero vindo da tela ou da visão: só "man" ou "woman"; qualquer outra coisa = sem gênero. */
export function generoValido(v: unknown): Genero | null {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return t === 'man' || t === 'male' ? 'man' : t === 'woman' || t === 'female' ? 'woman' : null
}

/** A descrição que entra no texto: "the …", até 8 palavras, só roupa e posição. null = descartada (o texto usa a posição de hoje). */
export function descricaoLimpa(v: unknown): string | null {
  let t = typeof v === 'string' ? v.replace(/[^\p{L}\p{N} ,'-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : ''
  if (!t || /\d/.test(t) || PROIBIDAS.test(t)) return null
  if (!/^the\s/.test(t)) t = 'the ' + t
  const palavras = t.split(' ')
  if (palavras.length < 2 || palavras.length > MAX_PALAVRAS_DESCRICAO) return null
  return t
}

// O MOLDE é o da tela do GPT (lib/recreate/seuVideoRules promptPorGenero, escolha homem/mulher por foto): a ÚNICA diferença é o sujeito — a
// descrição da visão (roupa e posição) no lugar de "the main person". Sem descrição, o texto é byte a byte o promptPorGenero (o guardião prova).
const TAIL = 'Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1.'
const ORDEM = ['the main person', 'the second person', 'the third person']

/**
 * O texto do pedido. Precisa de gênero para TODA foto; sem isso devolve null (quem chama usa o texto de hoje).
 * Descrição ausente para uma pessoa = a posição da tela (positions) ou a ordem da tela ("the main person").
 */
export function textoComGenero(a: { fotos: number; generos: ReadonlyArray<Genero | null>; descricoes?: ReadonlyArray<string | null>; posicoes?: ReadonlyArray<string> }): string | null {
  const n = Math.min(3, Math.max(1, a.fotos))
  const gs = Array.from({ length: n }, (_, i) => generoValido(a.generos[i]))
  if (gs.some((g) => g === null)) return null
  const trocas = Array.from({ length: n }, (_, i) => {
    const pos = String(a.posicoes?.[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const sujeito = descricaoLimpa(a.descricoes?.[i]) ?? (pos ? 'the person ' + pos : ORDEM[i])
    return 'Replace ' + sujeito + ' in @Video1 with the ' + gs[i] + ' from @Image' + (i + 1) + ': ' + (gs[i] === 'man' ? 'his' : 'her') + ' face and hair match @Image' + (i + 1) + '.'
  }).join(' ')
  return trocas + ' ' + TAIL
}

/** As mensagens da visão: UM quadro do vídeo + as fotos. Pede roupa/posição e homem/mulher; proíbe identificar. */
export function mensagensDaVisao(quadro: string, fotos: string[], pessoas: number) {
  const n = Math.min(3, Math.max(1, pessoas))
  const system =
    'You describe a video frame and reference photos for a video-editing instruction. Never identify anyone, never name anyone, never guess ' +
    'who anyone is, and never mention age, ethnicity, skin, body shape or attractiveness. Describe people ONLY by visible clothing and position ' +
    '(for example: "the dancer in the dark blue shirt", "the person on the left in a red dress"). ' +
    `Reply ONLY with JSON: {"video_people":[{"person": 1-based index, "description": "max ${MAX_PALAVRAS_DESCRICAO} words, clothing and position only"}], ` +
    '"photos":[{"photo": 1-based index, "presents_as": "man"|"woman"|"unclear"}]}.'
  const text = [
    n === 1 ? 'Image 1 is a frame of the video: describe the MAIN person (the largest and most central).' : `Image 1 is a frame of the video: describe the ${n} main people, person 1 the LEFTMOST.`,
    fotos.length ? `Then ${fotos.map((_, i) => `image ${i + 2} is reference photo ${i + 1}`).join(', ')}: say if the person in each photo presents as a man or a woman.` : '',
  ].filter(Boolean).join('\n')
  type Img = { type: 'image_url'; image_url: { url: string; detail: 'low' } }
  const img = (url: string): Img => ({ type: 'image_url', image_url: { url, detail: 'low' } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: [{ type: 'text' as const, text }, img(quadro), ...fotos.map(img)] },
  ]
}

/** A resposta da visão → descrições e gêneros (o que não serve vira null). Nunca lança. */
export function lerRespostaDaVisao(data: unknown, pessoas: number, fotos: number): { descricoes: Array<string | null>; generos: Array<Genero | null> } | null {
  const msg = (data as { choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }> })?.choices?.[0]?.message
  if (!msg || (typeof msg.refusal === 'string' && msg.refusal.trim())) return null
  let p: unknown
  try { p = JSON.parse(typeof msg.content === 'string' ? msg.content : '') } catch { return null }
  if (!p || typeof p !== 'object') return null
  const vp = Array.isArray((p as { video_people?: unknown }).video_people) ? (p as { video_people: unknown[] }).video_people : []
  const ph = Array.isArray((p as { photos?: unknown }).photos) ? (p as { photos: unknown[] }).photos : []
  const achar = (arr: unknown[], k: string, i: number) => arr.find((x) => x && typeof x === 'object' && (x as Record<string, unknown>)[k] === i + 1) as Record<string, unknown> | undefined
  return {
    descricoes: Array.from({ length: pessoas }, (_, i) => descricaoLimpa(achar(vp, 'person', i)?.description)),
    generos: Array.from({ length: fotos }, (_, i) => generoValido(achar(ph, 'photo', i)?.presents_as)),
  }
}

export interface IoDoTexto {
  /** UM quadro do vídeo do cliente (URL jpg), com o custo; null = sem quadro. */
  quadro: () => Promise<{ url: string; usd: number } | null>
  /** A chamada de visão (o JSON da OpenAI e o custo). null = falhou. */
  visao: (mensagens: ReturnType<typeof mensagensDaVisao>) => Promise<{ data: unknown; usd: number } | null>
}

export interface TextoDoPedido { prompt: string; fonte: FonteDoTexto; usd: number; visao: 'ok' | 'falhou' | 'pulou'; generos: Array<Genero | null>; descricoes: Array<string | null> }

/**
 * O texto do /check. Gênero da tela ganha da visão; a visão só roda com o vídeo e pelo menos uma foto (ou gênero da tela) — sem foto e sem
 * gênero não há como sair do texto de hoje, então nada é gasto. Qualquer falha = o texto de hoje. Nunca lança.
 */
export async function montarTextoDoPedido(io: IoDoTexto, a: { pessoas: number; fotos: string[]; generosDaTela: unknown[]; posicoes: string[] }): Promise<TextoDoPedido> {
  const n = Math.min(3, Math.max(1, a.fotos.length || a.pessoas))
  const daTela = Array.from({ length: n }, (_, i) => generoValido(a.generosDaTela[i]))
  const padrao = (visao: TextoDoPedido['visao'], usd: number, generos = daTela, descricoes: Array<string | null> = []): TextoDoPedido =>
    ({ prompt: promptKling4(n, a.posicoes), fonte: 'padrao', usd, visao, generos, descricoes })
  const telaCompleta = daTela.every((g) => g !== null)
  if (!a.fotos.length && !telaCompleta) return padrao('pulou', 0)
  let usd = 0
  let descricoes: Array<string | null> = []
  let daVisao: Array<Genero | null> = []
  let visao: TextoDoPedido['visao'] = 'falhou'
  try {
    const q = await io.quadro()
    if (q) {
      usd += q.usd
      const r = await io.visao(mensagensDaVisao(q.url, a.fotos.slice(0, n), n))
      if (r) {
        usd += r.usd
        const lido = lerRespostaDaVisao(r.data, n, a.fotos.length ? n : 0)
        if (lido) { descricoes = lido.descricoes; daVisao = lido.generos; visao = 'ok' }
      }
    }
  } catch {
    visao = 'falhou'
  }
  const generos = Array.from({ length: n }, (_, i) => daTela[i] ?? daVisao[i] ?? null)
  const prompt = textoComGenero({ fotos: n, generos, descricoes, posicoes: a.posicoes })
  if (!prompt) return padrao(visao, usd, generos, descricoes)
  const usouTela = daTela.some((g) => g !== null), usouVisao = visao === 'ok' && (descricoes.some((d) => d) || daTela.some((g, i) => g === null && daVisao[i] !== null))
  const fonte: FonteDoTexto = usouTela && usouVisao ? 'tela_e_visao' : usouTela ? 'tela' : 'visao'
  return { prompt, fonte, usd: Math.round(usd * 1e6) / 1e6, visao, generos, descricoes }
}
