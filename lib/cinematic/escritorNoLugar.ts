// KINEO-ESCRITOR-MONUMENTO-2026-10-13 — a régua do escritor de cenas quando o pedido é um LUGAR REAL.
//
// Achado (13/10, dry-runs de produção a $0 no ce41365a, Seedance 1.5, 35 s, modo IA, régua da persona 2,45 pal/s →
// expected_words 86, faixa pedida ao escritor 22-24 palavras por cena):
//   "Drone tour of the Palace of Versailles"  → 102 · 99 · 107 palavras (+19 % · +15 % · +24 %; 106 no ensaio das 06:22)
//   controle "The mystery of the Flannan Isles…" → 92 · 88 (régua 2,3 → 81 esperadas; +14 % · +9 %)
// O vocabulário do monumento NÃO entra no prompt do escritor (generateScenes recebe só o pedido); ele só entra no CONTEXTO
// dos filtros anti-invenção, depois. O que muda é o que o gpt-4o escreve sobre um lugar famoso a partir de um pedido de
// 6 palavras sem história: uma ficha de fatos com nomes compostos ("Palace of Versailles" = 4 palavras, "Hall of Mirrors",
// "Treaty of Versailles", "King Louis XIV") e enfeite ("magnificent", "impressive", "exquisite", "remarkable", "stunning",
// "beautifully landscaped") — 25-28 palavras por cena contra o teto de 24. Até o monumento (a6d44a11) os filtros APAGAVAM
// esses nomes e anos (608449fe: "was the site of the of Versailles, ending I.") e a contagem caía para perto dos 86 —
// o excesso sempre existiu, a amputação escondia. Com os nomes preservados, o filme fica a 1 palavra do condensador do
// compose (+25 %: 108 de 86), que REESCREVE o corpo da narração DEPOIS de o footage ter sido escolhido.
//
// Conserto (só com lugar real; sem lugar = null e o chamador não muda nada): o escritor mira o ALVO, não o alvo + 10 %
// (a faixa vira [piso, piso] — o piso não muda, e a 2ª passada de expansão continua garantindo que ninguém fica abaixo),
// e ouve que nome próprio composto conta palavra por palavra e que o orçamento vai para fato do lugar, não para enfeite.
// Nenhum nome verdadeiro é apagado e nenhuma palavra é cortada depois — é o escritor que nasce do tamanho certo.
// Medido nos 12 planos dos 3 ensaios: o gpt-4o escreveu de −8 % a +21 % em relação ao teto pedido (média +7 %) → com
// teto 22 (88 por filme de 4 cenas) a fala esperada fica em ~94 palavras (+9 %); mesmo com TODAS as cenas no pior excesso
// medido, 106 (+23 %) — dentro de −8 %/+25 %. Escritor que obedece à risca dá 88 (≥ 86): nunca abaixo do alvo.

/** Enfeites que o gpt-4o usou nas falas de Versailles de 13/10 (citados ao escritor como exemplo do que não gastar). */
export const ENFEITES_DO_LUGAR = ['magnificent', 'stunning', 'impressive', 'exquisite', 'remarkable', 'opulent'] as const

export interface EscritorNoLugar {
  /** a faixa por cena que o escritor ouve: [piso, piso] */
  wordsPerScene: readonly [number, number]
  /** frase acrescentada à regra da fala (lib/runway generateScenes → placeRule) */
  placeRule: string
}

/**
 * A régua do escritor para um pedido sobre lugar real. `faixa` = wordsPerSceneFor(...) da rota; `lugar` = lugarPrincipal(pedido).
 * Sem lugar real, sem faixa ou com faixa inválida: null (o chamador não toca em nada — prompt byte a byte o de antes).
 */
export function faixaDoEscritorNoLugar(faixa: readonly [number, number] | null | undefined, lugar: { nome: string } | null | undefined): EscritorNoLugar | null {
  if (!lugar || !lugar.nome || !Array.isArray(faixa) || faixa.length !== 2) return null
  const piso = Math.floor(Number(faixa[0]))
  if (!Number.isFinite(piso) || piso < 1) return null
  const nome = String(lugar.nome).replace(/["\\]/g, '').trim()
  const placeRule = ` This idea is about a real place (${nome}): every word of a multi-word name — of the place, its rooms, gardens, people, treaties and wars — counts as a word, so aim for exactly ${piso} words and spend them on true facts of the place, never on decorative adjectives such as ${ENFEITES_DO_LUGAR.join(', ')}`
  return { wordsPerScene: [piso, piso] as const, placeRule }
}

/** Palavras faladas de uma lista de falas (a mesma contagem do ensaio de $0: split em espaço). */
export function palavrasDasFalas(falas: ReadonlyArray<string | null | undefined>): number {
  return falas.reduce<number>((a, f) => a + String(f ?? '').trim().split(/\s+/).filter(Boolean).length, 0)
}
