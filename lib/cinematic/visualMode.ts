// ═══ DIRETOR DE FORMATO — 2026-08-27 ══════════════════════════════════════
//
// POR QUE O APRESENTADOR APARECIA SEM NINGUEM PEDIR
//
// Duas causas, as duas no codigo, nenhuma acidental:
//
// 1. `facelessRequested = /\[faceless\]/i.test(promptRaw)` — o modo SEM
//    apresentador so ligava se a pessoa escrevesse literalmente `[faceless]`
//    no roteiro. Uma tag escondida que nenhum cliente conhece. Na pratica:
//    apresentador SEMPRE, para todo mundo.
//
// 2. lib/hollywood/router.ts, no prompt de sistema do planner:
//    "hostFits=true for documentary/story-telling content where a narrator
//     persona works (mysteries, history, facts, finance, product explainers)"
//    E no parse: `const hostFits = data.hostFits !== false` — o default e
//    TRUE. Documentario, misterio, historia e financas — que sao a maioria
//    absoluta do que a casa produz — vinham com apresentador POR ORDEM NOSSA.
//
// O caso real: o roteiro NOAA sobre os naufragios Norlindo e Joseph M. Cudahy
// e misterio + noticia + historia. Caiu nas tres categorias e ganhou um host
// falando na lente, mais rostos humanos em cenas de apoio, sem que o roteiro
// pedisse nada disso.
//
// A NOVA POLITICA (decisao do fundador, 27/08)
//
//   documentary_faceless  — misterio, historia, ciencia, noticia, natureza.
//                           PADRAO. Zero apresentador, zero rosto em primeiro
//                           plano. O roteiro e a voz; a imagem e o mundo.
//   character_story       — ha um personagem cuja historia esta sendo contada.
//                           Pessoas aparecem, mas nao falam para a lente.
//   presenter             — apresentador falando na camera. SOMENTE por
//                           intencao explicita de quem escreveu.
//
// Determinismo: a inferencia e lexical e testavel. Nada de GPT decidindo
// formato — foi exatamente isso que produziu o host indesejado.
//
// Puro: sem rede, sem banco, sem relogio.

export type VisualMode = 'documentary_faceless' | 'character_story' | 'presenter'

export interface DecisaoFormato {
  modo: VisualMode
  /** Por que este modo. Vai para telemetria e para o log do fundador. */
  motivo: string
  /** A pessoa pediu apresentador explicitamente? */
  apresentadorPedido: boolean
}

function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * INTENCAO EXPLICITA DE APRESENTADOR. So estas frases ligam o modo
 * `presenter`. Nao inferimos apresentador de genero, de tom nem de humor —
 * inferir foi o erro que estamos corrigindo.
 */
export const PEDIDOS_DE_APRESENTADOR = [
  'presenter', 'a host ', 'host talking', 'talking head', 'on camera',
  'speaking to camera', 'to the camera', 'anchor', 'newscaster', 'reporter on screen',
  'apresentador', 'falando para a camera', 'na frente da camera', 'ancora',
  'eu falando', 'me falando', 'narrador na tela', 'youtuber style',
]

/** A tag antiga continua valendo: quem ja usa nao pode ser quebrado. */
export const TAG_FACELESS = /\[faceless\]/i

/**
 * SINAIS DE HISTORIA COM PERSONAGEM. Aqui pessoas podem aparecer — mas
 * mudas, nunca falando para a lente.
 */
export const SINAIS_DE_PERSONAGEM = [
  'his story', 'her story', 'he was born', 'she was born', 'grew up',
  'a young man', 'a young woman', 'the boy', 'the girl', 'his life', 'her life',
  'sua historia', 'ele nasceu', 'ela nasceu', 'cresceu',
]

/**
 * Decide o formato pelo CONTEUDO, nao por tag escondida.
 *
 * @param roteiro texto do usuario (com ou sem a tag [faceless])
 * @param tagFacelessPresente resultado do teste da tag, feito pela rota
 */
export function decidirFormato(roteiro: string, tagFacelessPresente: boolean): DecisaoFormato {
  const r = normalizar(roteiro)

  // 1. A tag antiga vence tudo — contrato com quem ja usa.
  if (tagFacelessPresente) {
    return {
      modo: 'documentary_faceless',
      motivo: 'tag [faceless] no roteiro',
      apresentadorPedido: false,
    }
  }

  // 2. Intencao EXPLICITA de apresentador.
  const pedido = PEDIDOS_DE_APRESENTADOR.find((p) => r.includes(normalizar(p)))
  if (pedido) {
    return {
      modo: 'presenter',
      motivo: `o roteiro pede apresentador explicitamente ("${pedido.trim()}")`,
      apresentadorPedido: true,
    }
  }

  // 3. Historia com personagem — pessoas sim, falando para a lente nao.
  const personagem = SINAIS_DE_PERSONAGEM.find((s) => r.includes(normalizar(s)))
  if (personagem) {
    return {
      modo: 'character_story',
      motivo: `o roteiro conta a historia de alguem ("${personagem.trim()}")`,
      apresentadorPedido: false,
    }
  }

  // 4. PADRAO. Era aqui que o host entrava sem ser chamado.
  return {
    modo: 'documentary_faceless',
    motivo: 'padrao: sem pedido explicito de apresentador, o roteiro e a voz e a imagem e o mundo',
    apresentadorPedido: false,
  }
}

/** O planner so pode gerar cena de dialogo neste modo. */
export function permiteApresentador(modo: VisualMode): boolean {
  return modo === 'presenter'
}

/** O que fica PROIBIDO em cada cena, por modo. Alimenta o Contrato Cena Verdadeira. */
export function proibidosPorModo(modo: VisualMode): string[] {
  if (modo === 'presenter') return []
  const base = [
    'looking directly into the camera', 'speaks', 'exclaims',
    'talking head', 'host', 'presenter', 'anchor',
  ]
  // Em documentario faceless, rosto humano em primeiro plano tambem sai.
  return modo === 'documentary_faceless'
    ? [...base, 'close-up of a face', 'portrait of a person', 'facial detail']
    : base
}
