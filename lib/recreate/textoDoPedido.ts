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
export const MAX_PALAVRAS_DESCRICAO = 12 // KINEO-RECREATE-ALVO-POR-QUADROS-1411 — era 8: a roupa de cima E de baixo (pedido 7) não cabia ("the man in the dark navy long-sleeve shirt and dark trousers" = 11)

/** Palavras que NÃO são roupa nem posição: identidade, origem, pele, idade, corpo, fama. Descrição com uma delas é descartada. */
const PROIBIDAS = /\b(skin|race|racial|ethnic\w*|asian|african|black[- ]skinned|white[- ]skinned|caucasian|latin[oa]|hispanic|arab\w*|indian|jewish|muslim|christian|celebrity|famous|actor|actress|singer|rapper|athlete|player\s+\d+|named|called|old|young|elderly|aged|teen\w*|child|kid|baby|girl|boy|fat|thin|skinny|slim|chubby|overweight|beautiful|pretty|handsome|ugly|sexy|tattoo\w*)\b/i

/** Gênero vindo da tela ou da visão: só "man" ou "woman"; qualquer outra coisa = sem gênero. */
export function generoValido(v: unknown): Genero | null {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return t === 'man' || t === 'male' ? 'man' : t === 'woman' || t === 'female' ? 'woman' : null
}

// KINEO-RECREATE-ALVO-POR-QUADROS-1411 [CEO 14/11, pedido 7: clip d379ec6e, "the person in red shirt on ground"] — a POSE de um instante nunca descreve o alvo: o motor procura
// no vídeo inteiro. "on the ground", "lying", "sitting"… saem da descrição; sobra a roupa (o que não muda).
// KINEO-RECREATE-TEXTO-REVISAO-3-1411 [revisor 3ª rodada, (c)] — + "standing", "walking", "dancing"… e o LUGAR de um instante ("on a bench", "by the car").
const POSE = /\b(?:(?:lying|sitting|seated|kneeling|standing|running|falling|fallen|rolling)\s+)?(?:on|across)\s+(?:the\s+)?(?:ground|floor|grass|field|pitch)\b|\b(?:(?:lying|sitting|seated|kneeling|standing|leaning)\s+)?(?:on|at|by|near|next to|in front of|against)\s+(?:a|an|the)\s+(?:bench|chair|sofa|couch|bed|table|desk|car|wall|fence|stairs|steps|stage|street|sidewalk|beach|pool|door|window)\b|\b(?:lying|sitting|seated|kneeling|crouching|standing|walking|running|dancing|posing|waving|falling|fallen|jumping|laughing|smiling|leaning)(?:\s+(?:down|up))?\b/gi
/** A descrição que entra no texto: "the …", até 8 palavras, só roupa e posição. null = descartada (o texto usa a posição de hoje). */
export function descricaoLimpa(v: unknown): string | null {
  let t = typeof v === 'string' ? v.replace(POSE, ' ').replace(/[^\p{L}\p{N} ,'-]/gu, ' ').replace(/\s+/g, ' ').replace(/[ ,]+$/, '').trim().toLowerCase() : '' // KINEO-RECREATE-ALVO-POR-QUADROS-1411 — + sem pose
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

// KINEO-RECREATE-MOVIMENTO-1411 [CEO 14/11 07:00, ajuste 2; quadro "rosto de longe" 05:22] — o cabelo e a barba lidos da FOTO (lib/recreate/descricaoDaPessoa.ts)
// entram depois de "face and hair match @ImageN": em plano de longe o Kling mantinha o cabelo da pessoa do vídeo. Só com o interruptor
// SEU_VIDEO_CABELO_NO_TEXTO (desligado até o ensaio de 10 fotos da casa: texto gerado × o que se vê). Sem cabelo lido = o texto de antes, byte a byte.
export const clausulaDoCabelo = (c: string | null | undefined) => (c && /^[a-z ,\-]{3,200}$/.test(c) ? `, with ${c}` : '')
export function textoComGenero(a: { fotos: number; generos: ReadonlyArray<Genero | null>; descricoes?: ReadonlyArray<string | null>; posicoes?: ReadonlyArray<string>; oculos?: ReadonlyArray<Oculos | null>; cabelos?: ReadonlyArray<string | null> }): string | null { // KINEO-RECREATE-MOVIMENTO-1411 — + cabelos
  const n = Math.min(3, Math.max(1, a.fotos))
  const gs = Array.from({ length: n }, (_, i) => generoValido(a.generos[i]))
  if (gs.some((g) => g === null)) return null
  const trocas = Array.from({ length: n }, (_, i) => {
    const pos = String(a.posicoes?.[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const sujeito = descricaoLimpa(a.descricoes?.[i]) ?? (pos ? 'the person ' + pos : ORDEM[i])
    return 'Replace ' + sujeito + ' in @Video1 with the ' + gs[i] + ' from @Image' + (i + 1) + ': ' + (gs[i] === 'man' ? 'his' : 'her') + ' face and hair match @Image' + (i + 1) + clausulaDoCabelo(a.cabelos?.[i]) + clausulaDosOculos(a.oculos?.[i], i + 1, gs[i] === 'man' ? 'he' : 'she') + '.' // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — + a cláusula dos óculos (vazia sem certeza)
  }).join(' ')
  return trocas + ' ' + TAIL
}

/** As mensagens da visão: os quadros do vídeo (1 = o texto de antes, byte a byte; 2 a 3 = KINEO-RECREATE-ALVO-POR-QUADROS-1411) + as fotos. Pede roupa/posição e homem/mulher; proíbe identificar. */
export function mensagensDaVisao(quadro: string | readonly string[], fotos: string[], pessoas: number) {
  const n = Math.min(3, Math.max(1, pessoas))
  const quadros = (typeof quadro === 'string' ? [quadro] : quadro).filter((q) => typeof q === 'string' && q.length > 0).slice(0, 3)
  if (quadros.length > 1) return mensagensDosQuadros(quadros, fotos, n)
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
    { role: 'user' as const, content: [{ type: 'text' as const, text }, img(quadros[0] ?? ''), ...fotos.map(img)] },
  ]
}

// ═══ KINEO-RECREATE-ALVO-POR-QUADROS-1411 [CEO 14/11, pedido 7] — o alvo pelo vídeo, não por um instante ═══════════════════════════════════════════════════════
// Caso: clip d379ec6e (molde "invasor de campo", 8 s). A visão viu UM quadro (35%), em que o homem de azul-marinho e o jogador de vermelho estavam
// no chão, e descreveu o jogador ("the person in red shirt on ground"). O motor não trocou ninguém (swap_unchanged, US$ 1,51 nossos).
// Agora, na MESMA chamada: 3 quadros (~10%, 50% e 90%); o alvo é quem aparece em MAIS quadros e, no empate, o maior e mais central no conjunto;
// a descrição usa o que não muda (roupa de cima e de baixo, cor), nunca a pose. Dois ou mais candidatos plausíveis: a lista (até 3) e o
// escolhido, para a tela deixar trocar; sem escolha = o texto neutro de antes, nunca um chute.
export const MAX_CANDIDATOS = 3
function mensagensDosQuadros(quadros: readonly string[], fotos: string[], n: number) {
  const k = quadros.length
  const system =
    'You describe frames of ONE video and reference photos for a video-editing instruction. Never identify anyone, never name anyone, never guess ' +
    'who anyone is, and never mention age, ethnicity, skin, body shape or attractiveness. Describe people ONLY by the clothing that stays the same ' +
    'in the whole video: the top and the bottom and their colours (for example: "the man in the dark navy long-sleeve shirt and dark trousers", ' +
    '"the woman in the red dress"). NEVER describe a pose or an action of one moment (no "on the ground", "lying", "sitting", "running", "falling"). ' +
    `Reply ONLY with JSON: {"video_people":[{"person": 1-based index, "description": "max ${MAX_PALAVRAS_DESCRICAO} words, clothing only", "wears_glasses": "yes"|"no"|"unclear"}], ` +
    (n === 1 ? `"candidates":[{"description": "max ${MAX_PALAVRAS_DESCRICAO} words, clothing only"}], "chosen": index in candidates (1-based) or 0, ` : '') +
    '"photos":[{"photo": 1-based index, "presents_as": "man"|"woman"|"unclear", "wears_glasses": "yes"|"no"|"unclear"}]}. ' +
    '"wears_glasses" is about eyeglasses or sunglasses on the face; answer "unclear" when the face is small, turned away or hidden.'
  const quando = k === 3 ? 'about 10%, 50% and 90%' : 'two moments'
  const text = [
    `Images 1 to ${k} are frames of the SAME video, at ${quando} of its length, in order.`,
    n === 1
      ? 'The TARGET is the person who appears in the MOST of these frames; on a tie, the one who is the largest and most central across the frames. Describe the target as person 1. ' +
        `If two or more people are equally plausible targets, list them in "candidates" (up to ${MAX_CANDIDATOS}, the target first) and set "chosen" to 1; if you cannot pick one, set "chosen" to 0. With one clear target, "candidates" has only that person.`
      : `Describe the ${n} main people of the video (the ones present in the most frames), person 1 the LEFTMOST.`,
    fotos.length ? `Then ${fotos.map((_, i) => `image ${i + 1 + k} is reference photo ${i + 1}`).join(', ')}: say if the person in each photo presents as a man or a woman.` : '',
  ].filter(Boolean).join('\n')
  type Img = { type: 'image_url'; image_url: { url: string; detail: 'low' } }
  const img = (url: string): Img => ({ type: 'image_url', image_url: { url, detail: 'low' } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: [{ type: 'text' as const, text }, ...quadros.map(img), ...fotos.map(img)] },
  ]
}
/** Os candidatos a alvo e o escolhido (1-based; 0 = sem escolha; null = a resposta não trouxe). Nunca lança. */
export function lerCandidatos(data: unknown): { candidatos: string[]; escolhido: number | null } {
  const msg = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message
  let p: unknown
  try { p = JSON.parse(typeof msg?.content === 'string' ? msg.content : '') } catch { return { candidatos: [], escolhido: null } }
  if (!p || typeof p !== 'object') return { candidatos: [], escolhido: null }
  const lista = Array.isArray((p as { candidates?: unknown }).candidates) ? (p as { candidates: unknown[] }).candidates : []
  const candidatos: string[] = []
  for (const c of lista) {
    const d = descricaoLimpa(c && typeof c === 'object' ? (c as { description?: unknown }).description : c)
    if (d && !candidatos.includes(d) && candidatos.length < MAX_CANDIDATOS) candidatos.push(d)
  }
  const bruto = (p as { chosen?: unknown }).chosen
  const e = typeof bruto === 'number' ? bruto : typeof bruto === 'string' && /^\s*\d\s*$/.test(bruto) ? Number(bruto) : NaN
  return { candidatos, escolhido: Number.isInteger(e) ? e : null }
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
  /** KINEO-RECREATE-ALVO-POR-QUADROS-1411 — 3 quadros (~10%, 50%, 90%) na MESMA chamada de visão; quando existe, ganha do `quadro`. */
  quadros?: () => Promise<{ urls: string[]; usd: number } | null>
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
  /** KINEO-RECREATE-ALVO-POR-QUADROS-1411 — com 1 pessoa e 2 ou mais alvos plausíveis: as descrições (até 3) para a tela deixar trocar; senão []. */
  candidatos: string[]
  /** O índice (0-based) do candidato que está no texto; null = nenhum (o texto saiu neutro). */
  escolhido: number | null
  /** Quantos quadros a visão viu. */
  quadros: number
}

/**
 * O texto do /check. Gênero da tela ganha da visão; a visão só roda com o vídeo e pelo menos uma foto (ou gênero da tela) — sem foto e sem
 * gênero não há como sair do texto de hoje, então nada é gasto. Qualquer falha = o texto de hoje. Nunca lança.
 */
// KINEO-RECREATE-SEM-GENERO-DA-FOTO-1311 [CEO 13/11] — SUBSTITUÍDO em 14/11 pela decisão do dono (KINEO-RECREATE-GENERO-SUGERIDO-1411, abaixo): o gênero da foto volta como SUGESTÃO. Texto de 13/11: o gênero NUNCA sai da foto (regra do GPT em promptPorGenero:
// "never infer a person's gender from a photo"). A visão só descreve a pessoa do VÍDEO (roupa e posição) e não recebe as fotos. Com a escolha
// da tela (`genders`), o molde da tela com a descrição; sem ela, o texto NEUTRO de hoje (promptKling4) com a descrição no lugar de "the main
// person" — sem descrição, byte a byte o promptKling4.
export function textoNeutroComDescricao(fotos: number, descricoes: ReadonlyArray<string | null> = [], posicoes: ReadonlyArray<string> = [], oculos: ReadonlyArray<Oculos | null> = [], cabelos: ReadonlyArray<string | null> = []): string { // KINEO-RECREATE-MOVIMENTO-1411 — + cabelos (só com 1 pessoa) // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — + oculos (só com 1 pessoa: a frase neutra de 2–3 pessoas é uma só para todas)
  const n = Math.min(3, Math.max(1, fotos))
  const quem = Array.from({ length: n }, (_, i) => {
    const pos = String(posicoes[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const sujeito = descricaoLimpa(descricoes[i]) ?? (pos ? `the person ${pos}` : ORDEM[i])
    return `${sujeito} in @Video1 with the person from @Image${i + 1}`
  }).join(', and ')
  return `Replace ${quem}: their face and hair match ${n === 1 ? '@Image1' : 'their photo'}${n === 1 ? clausulaDoCabelo(cabelos[0]) + clausulaDosOculos(oculos[0], 1, 'they') : ''}. Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1. No logos, no watermark, no readable text.`
}

export async function montarTextoDoPedido(io: IoDoTexto, a: { pessoas: number; fotos?: string[]; generosDaTela: unknown[]; posicoes: string[]; cabelos?: Array<string | null> }): Promise<TextoDoPedido> { // KINEO-RECREATE-MOVIMENTO-1411 — + cabelos (lidos da foto; só com o interruptor)
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
  let candidatos: string[] = [] // KINEO-RECREATE-ALVO-POR-QUADROS-1411
  let escolhido: number | null = null
  let vistos = 0
  try {
    // KINEO-RECREATE-ALVO-POR-QUADROS-1411 — 3 quadros quando o io sabe dar; senão o quadro único de antes (o texto e as mensagens, byte a byte).
    const q = io.quadros ? await io.quadros() : await io.quadro().then((u) => (u ? { urls: [u.url], usd: u.usd } : null))
    if (q && q.urls.length) {
      usd += q.usd
      vistos = Math.min(3, q.urls.length)
      const r = await io.visao(mensagensDaVisao(q.urls.length > 1 ? q.urls : q.urls[0], fotos, n))
      if (r) {
        usd += r.usd
        const lido = lerRespostaDaVisao(r.data, n, fotos.length)
        if (lido) { descricoes = lido.descricoes; sugestao = Array.from({ length: n }, (_, i) => lido.generos[i] ?? null); oculos = Array.from({ length: n }, (_, i) => (i < fotos.length ? decidirOculos(lido.oculosNoVideo[i], lido.oculosNaFoto[i]) : null)); visao = 'ok' }
        // KINEO-RECREATE-ALVO-POR-QUADROS-1411 — 1 pessoa e 2 ou mais candidatos: o texto usa o ESCOLHIDO; sem escolha, o texto neutro (sem descrição, sem óculos), nunca um chute.
        if (lido && n === 1 && vistos > 1) {
          const c = lerCandidatos(r.data)
          if (c.candidatos.length >= 2) {
            candidatos = c.candidatos
            const i = c.escolhido !== null && c.escolhido >= 1 && c.escolhido <= c.candidatos.length ? c.escolhido - 1 : null
            escolhido = i
            descricoes = [i === null ? null : c.candidatos[i]]
            if (i !== 0) oculos = [null] // KINEO-RECREATE-TEXTO-REVISAO-3-1411 [revisor 3ª rodada, (b)] — os óculos lidos são da pessoa 1 (o 1º candidato): escolhido outro, ou nenhum, nada de óculos
          } else if (c.candidatos.length === 1 && !descricoes[0]) descricoes = [c.candidatos[0]]
        }
      }
    }
  } catch {
    visao = 'falhou'
  }
  usd = Math.round(usd * 1e6) / 1e6
  const sugestaoCompleta = sugestao.every((g) => g !== null)
  if (!telaCompleta && !sugestaoCompleta && n > 1) oculos = oculos.map(() => null) // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — neutro de 2–3 pessoas: a frase é uma só, sem cláusula por pessoa
  const cabelos = (a.cabelos ?? []).slice(0, n) // KINEO-RECREATE-MOVIMENTO-1411
  const temDescricao = descricoes.some((d) => d) || oculos.some((o) => o) || cabelos.some((c) => clausulaDoCabelo(c) !== '') // KINEO-RECREATE-MOVIMENTO-1411 — + o cabelo lido // KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — os óculos também são algo que a visão acrescenta
  if (telaCompleta) {
    const prompt = textoComGenero({ fotos: n, generos: daTela, descricoes, posicoes: a.posicoes, oculos, cabelos }) as string
    return { prompt, fonte: temDescricao ? 'tela_e_visao' : 'tela', usd, visao, generos: daTela, descricoes, sugestao, generoDe: 'tela', oculos, candidatos, escolhido, quadros: vistos }
  }
  if (sugestaoCompleta) {
    const prompt = textoComGenero({ fotos: n, generos: sugestao, descricoes, posicoes: a.posicoes, oculos, cabelos }) as string
    return { prompt, fonte: 'sugestao', usd, visao, generos: sugestao, descricoes, sugestao, generoDe: 'sugestao', oculos, candidatos, escolhido, quadros: vistos }
  }
  return { prompt: textoNeutroComDescricao(n, descricoes, a.posicoes, oculos, cabelos), fonte: temDescricao ? 'visao' : 'padrao', usd, visao, generos: daTela, descricoes, sugestao, generoDe: 'nenhum', oculos, candidatos, escolhido, quadros: vistos }
}
