// KINEO-LEGENDA-NEGACAO-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — a legenda não separa a negação do que ela nega.
// Caso (cliente pagante, render dc469323, H3 Max Turbo, 09/11): a frase "Being clever doesn't mean you should forget Allah." saiu em
// dois pedaços, "BEING CLEVER DOESN'T MEAN" e "YOU SHOULD FORGET ALLAH" — o segundo ficou 2,2 s sozinho na tela dizendo o CONTRÁRIO
// da frase. No mesmo filme: "BEING RICH DOESN'T MAKE" | "YOU BETTER THAN OTHERS" e "HIS WEALTH COULD NOT" | "SAVE HIM". O pedaço
// fechou pelo TETO de palavras (não por ponto, vírgula nem pausa) logo depois da negação, e o que ela nega desceu sem ela.
// A regra, pura e comum a todo corte de legenda por teto de palavras: quando um pedaço fecha pelo teto, tem uma negação dentro e a
// oração termina (ponto, vírgula, pausa ou fim da fala) em poucas palavras, a negação desce e abre o pedaço seguinte, que estica
// só o necessário para levar a oração até o fim — no máximo `maxPalavras` palavras e `maxLetras` letras (o que protege a pílula).
// Oração negada maior que isso fica como era (limite declarado). Pedaço sem negação nunca muda: a função devolve o MESMO array.
// Línguas: inglês, português, espanhol, francês, alemão e italiano, cada uma com a sua lista (o "no" do português é "em + o", não
// negação). Idioma ausente = inglês (o padrão do produto); idioma fora da lista = regra desligada, legenda byte a byte como antes.
// Não cobre: negação que vem DEPOIS do que ela nega (alemão "… nicht" no fim, turco, japonês, coreano), árabe, urdu, hindi, russo,
// chinês e as demais línguas do catálogo.
export const LEGENDA_NEGACAO_IDIOMAS = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const
/** Palavras a mais que o teto normal do pedaço (4 → 6): cabe "DOESN'T MEAN YOU SHOULD FORGET ALLAH". */
export const LEGENDA_NEGACAO_FOLGA = 2
/** Letras (com os espaços) do pedaço esticado: 2 a 3 linhas na caixa de 9:16, o mesmo envelope de 4 palavras longas. */
export const LEGENDA_NEGACAO_LETRAS = 40

const NEGADORES: Readonly<Record<string, ReadonlySet<string>>> = {
  en: new Set(['not', 'never', 'no', 'cannot', 'nor', 'neither', 'nobody', 'nothing', 'none', 'nowhere']),
  pt: new Set(['não', 'nao', 'nunca', 'jamais', 'nem', 'ninguém', 'ninguem', 'nenhum', 'nenhuma', 'nada']),
  es: new Set(['no', 'nunca', 'jamás', 'jamas', 'ni', 'nadie', 'ningún', 'ningun', 'ninguno', 'ninguna', 'nada', 'tampoco']),
  fr: new Set(['ne', 'pas', 'jamais', 'aucun', 'aucune', 'rien', 'ni', 'non']),
  de: new Set(['nicht', 'nichts', 'nie', 'niemals', 'niemand', 'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines', 'weder']),
  it: new Set(['non', 'no', 'mai', 'né', 'nessuno', 'nessuna', 'nessun', 'niente', 'nulla']),
}
const limpa = (palavra: unknown): string =>
  String(palavra ?? '').toLowerCase().replace(/[’ʼ`´]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

/** A palavra é uma negação na língua do filme? ("doesn't", "not", "never", "não", "nunca", "no" em espanhol, "ne"/"n'est" em francês…) */
export function ehNegacaoDaLegenda(palavra: unknown, idioma?: unknown): boolean {
  const lingua = typeof idioma === 'string' && idioma.trim() ? idioma.trim().toLowerCase().split(/[-_]/)[0] : 'en'
  const lista = NEGADORES[lingua]
  if (!lista) return false
  const p = limpa(palavra)
  if (!p) return false
  if (lista.has(p)) return true
  if (lingua === 'en') return /n't$/.test(p) // doesn't, don't, can't, won't, isn't…
  if (lingua === 'fr') return /^n'\p{L}/u.test(p) // n'est, n'a, n'oublie…
  return false
}

/**
 * Recebe os pedaços já cortados e devolve os pedaços com a negação junto do que ela nega. Pura; nunca perde, troca nem
 * reordena palavra. Só mexe num pedaço que fechou pelo teto (`fechoNatural` falso), que tem negação e cuja oração — da negação
 * até o primeiro fecho natural (ou o fim) — cabe em `maxPalavras` palavras e `maxLetras` letras. A palavra que sobraria sozinha
 * antes da negação, e a palavra-função colada nela ("and not…", "que no…"), descem junto quando cabem. Sem mudança: o MESMO array.
 */
export function juntarNegacaoComONegado<T>(
  grupos: T[][],
  o: {
    palavra: (item: T) => unknown
    /** O pedaço fechou em ponto, vírgula ou pausa (e não pelo teto)? O último pedaço da fala conta como fechado. */
    fechoNatural: (grupo: T[], indice: number) => boolean
    maxPalavras: number
    maxLetras?: number
    idioma?: unknown
    /** Palavra-função que viaja com a palavra seguinte (artigo, preposição, conjunção). */
    viajaComASeguinte?: (item: T) => boolean
  },
): T[][] {
  const maxLetras = o.maxLetras ?? LEGENDA_NEGACAO_LETRAS
  const cabe = (itens: T[]): boolean =>
    itens.length <= o.maxPalavras && itens.map((x) => String(o.palavra(x) ?? '').trim()).join(' ').length <= maxLetras
  const saida: T[][] = []
  let mudou = false
  for (let g = 0; g < grupos.length; g++) {
    const atual = grupos[g]
    saida.push(atual)
    if (g + 1 >= grupos.length || atual.length === 0 || o.fechoNatural(atual, g)) continue
    // o resto da oração: os pedaços seguintes até o primeiro fecho natural (ou o fim da fala)
    const resto: T[] = []
    let fim = g + 1
    let fecha = false
    while (fim < grupos.length && resto.length < o.maxPalavras) {
      resto.push(...grupos[fim])
      fecha = fim === grupos.length - 1 || o.fechoNatural(grupos[fim], fim)
      fim++
      if (fecha) break
    }
    if (!fecha) continue
    for (let p = 0; p < atual.length; p++) {
      if (!ehNegacaoDaLegenda(o.palavra(atual[p]), o.idioma) || !cabe([...atual.slice(p), ...resto])) continue
      let ini = p
      while (ini > 0 && (ini === 1 || o.viajaComASeguinte?.(atual[ini - 1]) === true) && cabe([...atual.slice(ini - 1), ...resto])) ini--
      saida.pop()
      if (ini > 0) saida.push(atual.slice(0, ini))
      saida.push([...atual.slice(ini), ...resto])
      g = fim - 1
      mudou = true
      break
    }
  }
  return mudou ? saida : grupos
}
