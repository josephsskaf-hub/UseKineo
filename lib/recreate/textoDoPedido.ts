// ═══ KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 [CEO 13/11 22:46, item A; dono: Recreate "com o seu vídeo" pronto para cliente] ═══════════════
// O texto do pedido que TROCA DE PRIMEIRA no Kling 4.0 edição. Fatos pela nossa chave, mesma foto de rosto real (quadro 13/11 22:04–22:26):
// texto NEUTRO não trocou em 3 de 3 ("the main person… their face"; "the person dancing… the person from @Image1"); texto com DESCRIÇÃO e
// GÊNERO trocou em 4 de 4 ("the dancer… the man from @Image1: his face and hair"; "the man in the dark blue shirt… the man from @Image1…").
// Então o /check monta: "Replace {descrição} in @Video1 with the {man|woman} from @Image1: {his|her} face and hair match @Image1. Keep …".
//   · descrição: uma chamada de visão barata (AI_TEXT_MODELS.vision) olha UM quadro do vídeo e devolve, para cada pessoa a trocar, até 8
//     palavras de ROUPA e POSIÇÃO. Nunca identidade, idade, etnia, pele, corpo ou nome: o texto passa por um filtro e, se sujar, cai.
//   · gênero de cada foto (man | woman): a escolha da tela (`genders`) GANHA. Sem ela, a SUGESTÃO da visão (dono 14/11: "o prompt já vem escrito"),
//     devolvida à tela em suggested_genders para pré-marcar; sem sugestão para toda foto, o texto NEUTRO de hoje com a descrição. Sempre editável.
// Módulo puro com io injetado (quadro e visão): o guardião scripts/test-recreate-texto-do-pedido-1311.mjs executa tudo sem rede.

export type Genero = 'man' | 'woman'
export type FonteDoTexto = 'tela' | 'visao' | 'tela_e_visao' | 'sugestao' | 'padrao' // KINEO-RECREATE-GENERO-SUGERIDO-1411 — + sugestao
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
// ═══ KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 [CEO 14/11, pedido 6] — os óculos no texto sugerido ═══════════════════════════════════════════════
// Medido pela CEO com uma variável só (mesmo arquivo, mesma foto): "…his face, hair and beard match @Image1." → o motor MANTEVE os óculos da
// pessoa do vídeo (clip 568db487); a mesma frase + ", and he wears no glasses" → saiu sem óculos (clip 9afc54fa). A visão do /check já olha a
// pessoa do vídeo e a foto: na MESMA chamada ela diz se cada uma usa óculos. Regra por pessoa: a da FOTO usa → ", wearing the glasses from
// @ImageN"; a do VÍDEO usa e a da FOTO não → ", and he/she wears no glasses"; qualquer incerteza → nada. Só no texto sugerido.
export type Oculos = 'usar' | 'tirar'
/** A decisão dos óculos de uma pessoa. `null` em qualquer dúvida (sem resposta clara da visão para o que a regra precisa). */
export function decidirOculos(noVideo: boolean | null | undefined, naFoto: boolean | null | undefined): Oculos | null {
  if (naFoto === true) return 'usar'
  if (noVideo === true && naFoto === false) return 'tirar'
  return null
}
const simNao = (v: unknown): boolean | null => (v === 'yes' || v === true ? true : v === 'no' || v === false ? false : null)
const clausulaDosOculos = (o: Oculos | null | undefined, foto: number, pronome: 'he' | 'she' | 'they') =>
  o === 'usar' ? `, wearing the glasses from @Image${foto}` : o === 'tirar' ? `, and ${pronome} ${pronome === 'they' ? 'wear' : 'wears'} no glasses` : ''

export function textoComGenero(a: { fotos: number; generos: ReadonlyArray<Genero | null>; descricoes?: ReadonlyArray<string | null>; posicoes?: ReadonlyArray<string>; oculos?: ReadonlyArray<Oculos | null> }): string | null {
  const n = Math.min(3, Math.max(1, a.fotos))
  const gs = Array.from({ length: n }, (_, i) => generoValido(a.generos[i]))
  if (gs.some((g) => g === null)) return null
  const trocas = Array.from({ length: n }, (_, i) => {
    const pos = String(a.posicoes?.[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const sujeito = descricaoLimpa(a.descricoes?.[i]) ?? (pos ? 'the person ' + pos : ORDEM[i])
    return 'Replace ' + sujeito + ' in @Video1 with the ' + gs[i] + ' from @Image' + (i + 1) + ': ' + (gs[i] === 'man' ? 'his' : 'her') + ' face and hair match @Image' + (i + 1) + clausulaDosOculos(a.oculos?.[i], i + 1, gs[i] === 'man' ? 'he' : 'she') + '.' // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — + a cláusula dos óculos (vazia sem certeza)
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
    `Reply ONLY with JSON: {"video_people":[{"person": 1-based index, "description": "max ${MAX_PALAVRAS_DESCRICAO} words, clothing and position only", "wears_glasses": "yes"|"no"|"unclear"}], ` +
    '"photos":[{"photo": 1-based index, "presents_as": "man"|"woman"|"unclear", "wears_glasses": "yes"|"no"|"unclear"}]}. ' +
    '"wears_glasses" is about eyeglasses or sunglasses on the face; answer "unclear" when the face is small, turned away or hidden.' // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — na MESMA chamada
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
export function lerRespostaDaVisao(data: unknown, pessoas: number, fotos: number): { descricoes: Array<string | null>; generos: Array<Genero | null>; oculosNoVideo: Array<boolean | null>; oculosNaFoto: Array<boolean | null> } | null {
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
    oculosNoVideo: Array.from({ length: pessoas }, (_, i) => simNao(achar(vp, 'person', i)?.wears_glasses)), // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411
    oculosNaFoto: Array.from({ length: fotos }, (_, i) => simNao(achar(ph, 'photo', i)?.wears_glasses)), // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411
  }
}

export interface IoDoTexto {
  /** UM quadro do vídeo do cliente (URL jpg), com o custo; null = sem quadro. */
  quadro: () => Promise<{ url: string; usd: number } | null>
  /** A chamada de visão (o JSON da OpenAI e o custo). null = falhou. */
  visao: (mensagens: ReturnType<typeof mensagensDaVisao>) => Promise<{ data: unknown; usd: number } | null>
}

export interface TextoDoPedido {
  prompt: string; fonte: FonteDoTexto; usd: number; visao: 'ok' | 'falhou' | 'pulou'; generos: Array<Genero | null>; descricoes: Array<string | null>
  /** KINEO-RECREATE-GENERO-SUGERIDO-1411 — man|woman por foto lido pela visão (null = não deu para ver): só SUGESTÃO para a tela pré-marcar. */
  sugestao: Array<Genero | null>
  /** De onde veio o gênero do texto: a escolha da tela, a sugestão da visão, ou nenhum (texto neutro). */
  generoDe: 'tela' | 'sugestao' | 'nenhum'
  /** KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — por pessoa: 'usar' (os óculos da foto), 'tirar' (a pessoa do vídeo usa, a da foto não) ou null (sem certeza: nada no texto). */
  oculos: Array<Oculos | null>
}

/**
 * O texto do /check. Gênero da tela ganha da visão; a visão só roda com o vídeo e pelo menos uma foto (ou gênero da tela) — sem foto e sem
 * gênero não há como sair do texto de hoje, então nada é gasto. Qualquer falha = o texto de hoje. Nunca lança.
 */
// KINEO-RECREATE-SEM-GENERO-DA-FOTO-1311 [CEO 13/11] — SUBSTITUÍDO em 14/11 pela decisão do dono (KINEO-RECREATE-GENERO-SUGERIDO-1411, abaixo): o gênero da foto volta como SUGESTÃO. Texto de 13/11: o gênero NUNCA sai da foto (regra do GPT em promptPorGenero:
// "never infer a person's gender from a photo"). A visão só descreve a pessoa do VÍDEO (roupa e posição) e não recebe as fotos. Com a escolha
// da tela (`genders`), o molde da tela com a descrição; sem ela, o texto NEUTRO de hoje (promptKling4) com a descrição no lugar de "the main
// person" — sem descrição, byte a byte o promptKling4.
export function textoNeutroComDescricao(fotos: number, descricoes: ReadonlyArray<string | null> = [], posicoes: ReadonlyArray<string> = [], oculos: ReadonlyArray<Oculos | null> = []): string { // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — + oculos (só com 1 pessoa: a frase neutra de 2–3 pessoas é uma só para todas)
  const n = Math.min(3, Math.max(1, fotos))
  const quem = Array.from({ length: n }, (_, i) => {
    const pos = String(posicoes[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const sujeito = descricaoLimpa(descricoes[i]) ?? (pos ? `the person ${pos}` : ORDEM[i])
    return `${sujeito} in @Video1 with the person from @Image${i + 1}`
  }).join(', and ')
  return `Replace ${quem}: their face and hair match ${n === 1 ? '@Image1' : 'their photo'}${n === 1 ? clausulaDosOculos(oculos[0], 1, 'they') : ''}. Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1. No logos, no watermark, no readable text.`
}

export async function montarTextoDoPedido(io: IoDoTexto, a: { pessoas: number; fotos?: string[]; generosDaTela: unknown[]; posicoes: string[] }): Promise<TextoDoPedido> {
  // KINEO-RECREATE-GENERO-SUGERIDO-1411 [dono 14/11, usando a tela: "Tem que escolher se quer trocar o homem ou a mulher, mas é mais uma coisa
  // para pensar. E no site do Higgsfield […] o prompt ele vem com já escrito"; CEO 14/11] — a visão volta a olhar as fotos, mas SÓ como SUGESTÃO
  // (man|woman por foto, nunca idade, etnia, pele ou nome): a tela pré-marca com ela e a pessoa troca se estiver errada. A escolha da tela ganha;
  // sem escolha, o texto já sai escrito com a sugestão (molde da tela + descrição); sem sugestão para toda foto, o neutro de hoje + descrição.
  const n = Math.min(3, Math.max(1, a.pessoas))
  const fotos = (a.fotos ?? []).slice(0, n)
  const daTela = Array.from({ length: n }, (_, i) => generoValido(a.generosDaTela[i]))
  const telaCompleta = daTela.every((g) => g !== null)
  let usd = 0
  let descricoes: Array<string | null> = []
  let sugestao: Array<Genero | null> = Array.from({ length: n }, () => null)
  let oculos: Array<Oculos | null> = Array.from({ length: n }, () => null) // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411
  let visao: TextoDoPedido['visao'] = 'falhou'
  try {
    const q = await io.quadro()
    if (q) {
      usd += q.usd
      const r = await io.visao(mensagensDaVisao(q.url, fotos, n))
      if (r) {
        usd += r.usd
        const lido = lerRespostaDaVisao(r.data, n, fotos.length)
        if (lido) { descricoes = lido.descricoes; sugestao = Array.from({ length: n }, (_, i) => lido.generos[i] ?? null); oculos = Array.from({ length: n }, (_, i) => (i < fotos.length ? decidirOculos(lido.oculosNoVideo[i], lido.oculosNaFoto[i]) : null)); visao = 'ok' }
      }
    }
  } catch {
    visao = 'falhou'
  }
  usd = Math.round(usd * 1e6) / 1e6
  const sugestaoCompleta = sugestao.every((g) => g !== null)
  if (!telaCompleta && !sugestaoCompleta && n > 1) oculos = oculos.map(() => null) // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — neutro de 2–3 pessoas: a frase é uma só, sem cláusula por pessoa
  const temDescricao = descricoes.some((d) => d) || oculos.some((o) => o) // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — os óculos também são algo que a visão acrescenta
  if (telaCompleta) {
    const prompt = textoComGenero({ fotos: n, generos: daTela, descricoes, posicoes: a.posicoes, oculos }) as string
    return { prompt, fonte: temDescricao ? 'tela_e_visao' : 'tela', usd, visao, generos: daTela, descricoes, sugestao, generoDe: 'tela', oculos }
  }
  if (sugestaoCompleta) {
    const prompt = textoComGenero({ fotos: n, generos: sugestao, descricoes, posicoes: a.posicoes, oculos }) as string
    return { prompt, fonte: 'sugestao', usd, visao, generos: sugestao, descricoes, sugestao, generoDe: 'sugestao', oculos }
  }
  return { prompt: textoNeutroComDescricao(n, descricoes, a.posicoes, oculos), fonte: temDescricao ? 'visao' : 'padrao', usd, visao, generos: daTela, descricoes, sugestao, generoDe: 'nenhum', oculos }
}
