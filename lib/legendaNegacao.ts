// KINEO-LEGENDA-NEGACAO-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — a legenda não separa a negação do que ela nega.
// Caso (cliente pagante, render dc469323, H3 Max Turbo, 09/11): a frase "Being clever doesn't mean you should forget Allah." saiu em
// dois pedaços, "BEING CLEVER DOESN'T MEAN" e "YOU SHOULD FORGET ALLAH" — o segundo ficou 2,2 s sozinho na tela dizendo o CONTRÁRIO
// da frase. No mesmo filme: "BEING RICH DOESN'T MAKE" | "YOU BETTER THAN OTHERS" e "HIS WEALTH COULD NOT" | "SAVE HIM". O pedaço
// fechou pelo TETO de palavras (não por ponto, vírgula nem pausa) logo depois da negação, e o que ela nega desceu sem ela.
// A regra, pura e comum a todo corte de legenda por teto de palavras: quando um pedaço bate no teto com uma negação dentro, a
// negação passa a ABRIR um pedaço que estica até a oração fechar (ponto, vírgula, pausa ou fim da fala) ou até onde a pílula
// deixa — `cabe` (linhas da pílula) e `maxPalavras` —, levando junto o que ela nega; o que vier antes dela fecha como pedaço
// próprio (2 palavras ou mais; uma palavra sozinha fica com a negação). O que sobrar da oração volta ao corte normal.
// (2) — volta do revisor: a 1ª versão só agia quando a oração negada INTEIRA cabia em 6 palavras e 40 letras; fora disso ficava
// como era ("YOU SHOULD DISRESPECT MUHAMMAD", "YOU CAN STOP PAYING", "QUE VOCÊ DEVE ESQUECER" continuavam sozinhos). Agora o
// pedaço da negação estica sempre, e o limite é o da pílula (3 linhas), não 6 palavras.
// Línguas: inglês, português, espanhol, francês, alemão e italiano, cada uma com a sua lista (o "no" do português é "em + o", não
// negação). Idioma ausente = inglês (o padrão do produto); idioma fora da lista = regra desligada, legenda byte a byte como antes.
// Não cobre: o que a negação nega para ALÉM do pedaço dela (oração negada com mais palavras do que cabem na pílula), pedaço que
// fechou em pausa da fala no meio da oração, negação que vem DEPOIS do que ela nega (alemão "… nicht" no fim, turco, japonês,
// coreano), árabe, urdu, hindi, russo, chinês e as demais línguas do catálogo.
export const LEGENDA_NEGACAO_IDIOMAS = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const
/** Linhas que o pedaço da negação pode ocupar na pílula: o pior caso que o teto normal já permite é maior (4 palavras longas = 4 linhas). */
export const LEGENDA_NEGACAO_LINHAS = 3
/** Palavras do pedaço da negação, no máximo: o que cabe em 3 linhas no vertical; segura o pedaço nos formatos largos, em que a linha leva o dobro de letras. */
export const LEGENDA_NEGACAO_PALAVRAS = 10

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
export function ehNegacaoDaLegenda(palavra: unknown, idioma?: unknown, vizinhas?: { anterior?: unknown; seguinte?: unknown }): boolean {
  const lingua = typeof idioma === 'string' && idioma.trim() ? idioma.trim().toLowerCase().split(/[-_]/)[0] : 'en'
  const lista = NEGADORES[lingua]
  if (!lista) return false
  const p = limpa(palavra)
  if (!p) return false
  // KINEO-LEGENDA-NEGACAO-INTEGRA-1011 — falsos positivos da revisão adversária (10/11): "Ela nada bem" (verbo nadar depois do
  // sujeito) e "Chanel No 5" / "No. 5" (número) não são negação — a legenda dessas frases tem de sair como antes.
  if (p === 'nada' && /^(?:ela|ele|você|voce|eu|tu|ella|él|el|usted|yo|quem|quien)$/.test(limpa(vizinhas?.anterior))) return false
  if (p === 'no' && /^[#(]?\d/.test(String(vizinhas?.seguinte ?? '').trim())) return false
  if (lista.has(p)) return true
  if (lingua === 'en') return /n't(?:'ve)?$/.test(p) // doesn't, don't, can't, won't, isn't, couldn't've…
  if (lingua === 'fr') return /^n'\p{L}/u.test(p) // n'est, n'a, n'oublie…
  return false
}

/** Quantas linhas o texto ocupa numa caixa em que cabem `porLinha` letras por linha (a quebra é só entre palavras; palavra maior que a linha ocupa uma linha sozinha). */
export function linhasDaLegenda(palavras: readonly unknown[], porLinha: number): number {
  let linhas = 0
  let usado = 0
  for (const palavra of palavras) {
    const letras = Array.from(String(palavra ?? '').trim()).length
    if (!letras) continue
    if (linhas === 0 || usado + 1 + letras > porLinha) { linhas++; usado = letras } else usado += 1 + letras
  }
  return linhas
}

/**
 * O plano do pedaço da negação. `atual` é o pedaço que acabou de bater no teto (sem ponto, vírgula nem pausa) e `resto` são as
 * palavras que faltam para a oração fechar. Devolve quantas palavras de `atual` fecham ANTES da negação (`prefixo`) e de quantas
 * palavras fica o pedaço que ela abre (`tamanho`, contando as que já estão em `atual`) — ou null quando nada muda (sem negação,
 * ou sem ganho). Pura: não perde, não troca e não reordena palavra; só diz onde cortar.
 *  - o pedaço começa na primeira negação; a palavra-função colada antes dela ("and not…", "que no…") vem junto, e uma palavra que
 *    ficaria sozinha antes dela também (nunca nasce pedaço de 1 palavra antes da negação);
 *  - estica até a oração fechar, enquanto `cabe` e até `maxPalavras` palavras; se a oração não coube inteira, o pedaço não
 *    termina em palavra-função (ela abre o pedaço seguinte, como no corte normal).
 */
export function planoDaNegacao<T>(
  atual: readonly T[],
  resto: readonly T[],
  o: {
    palavra: (item: T) => unknown
    maxPalavras: number
    /** O pedaço com estes itens cabe na pílula? */
    cabe: (itens: T[]) => boolean
    idioma?: unknown
    /** Palavra-função que viaja com a palavra seguinte (artigo, preposição, conjunção). */
    viajaComASeguinte?: (item: T) => boolean
  },
): { prefixo: number; tamanho: number } | null {
  const p = atual.findIndex((item, i) => ehNegacaoDaLegenda(o.palavra(item), o.idioma, { anterior: i > 0 ? o.palavra(atual[i - 1]) : undefined, seguinte: i + 1 < atual.length ? o.palavra(atual[i + 1]) : resto.length ? o.palavra(resto[0]) : undefined })) // KINEO-LEGENDA-NEGACAO-INTEGRA-1011 — com as vizinhas
  if (p < 0 || resto.length === 0) return null
  const viaja = (item: T): boolean => o.viajaComASeguinte?.(item) === true
  let prefixo = p
  while (prefixo > 0 && viaja(atual[prefixo - 1])) prefixo--
  if (prefixo === 1) prefixo = 0
  const oracao = [...atual.slice(prefixo), ...resto]
  const jaTem = atual.length - prefixo
  let tamanho = jaTem
  while (tamanho < oracao.length && tamanho < o.maxPalavras && o.cabe(oracao.slice(0, tamanho + 1))) tamanho++
  if (tamanho < oracao.length) while (tamanho > jaTem && viaja(oracao[tamanho - 1])) tamanho--
  return tamanho > jaTem ? { prefixo, tamanho } : null
}
