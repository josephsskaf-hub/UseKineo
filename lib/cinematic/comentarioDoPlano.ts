// ═══ KINEO-COMENTARIO-NAO-E-CENA-1411 v2 [CEO 14/11 10:22, bloqueio do revisor independente] ══════════════════════════════════════════════
// O planejador fecha o plano com uma oração de comentário: "Aerial shot of Howland Island, … empty ocean, with a stillness that hints at the
// mystery of Amelia Earhart's disappearance". O nome (ou o "her") dentro dela punha a Amelia na ilha. A v1 cortava a oração INTEIRA até o fim
// da frase e levava junto quem está no quadro: "A parade in honor of the returning soldiers, who march past the crowd" saía "sem gente".
// v2 (a opção que a CEO preferiu): a regra só existe para o plano que seria SEM GENTE se não fosse o comentário. Se o plano, fora dos
// comentários, já mostra alguém (o desfile, a banda, "An actor evoking Lincoln"), nada muda. Se não mostra, dentro do comentário saem SÓ os
// nomes do elenco e os pronomes; gente comum ("veterans", "soldiers", "the crowd") fica e segue contando. Só a decisão de quem está no quadro:
// o texto que vai ao motor não muda. Interruptor COMENTARIO_NAO_E_CENA_1411: 'off' = byte a byte o de antes.
export type ModoComentarioNaoECena = 'off' | 'all'
export const COMENTARIO_NAO_E_CENA_1411: ModoComentarioNaoECena = 'all'
export const comentarioNaoECenaLigado = (modo: ModoComentarioNaoECena = COMENTARIO_NAO_E_CENA_1411) => modo === 'all'
/** O gatilho do comentário e o resto da frase. "suggesting" e "representing" ficam fora: no corpus aparecem literais ("the fridge suggesting kale"). */
const COMENTARIO_RE = /(?<![\p{L}])(?:hint(?:s|ed|ing)?\s+at|symboli[sz](?:e|es|ed|ing)|evok(?:e|es|ed|ing)|reminiscent\s+of|in\s+hono(?:u)?r\s+of|a\s+tribute\s+to|allud(?:e|es|ed|ing)\s+to)(?![\p{L}])[^.!?]*/giu
const PRONOME_RE = /(?<![\p{L}])(?:he|him|his|himself|she|her|hers|herself|they|them|their|theirs)(?![\p{L}])/giu
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O plano sem os comentários (para saber se, fora deles, alguém está no quadro). */
export function foraDoComentario(visual: string): string {
  return String(visual ?? '').replace(COMENTARIO_RE, '')
}

/**
 * O plano que decide QUEM está no quadro. Fora dos comentários alguém aparece (`mostraAlguem`)? O plano igual. Não aparece? Dentro de cada
 * comentário saem os nomes do elenco (o nome inteiro e cada palavra dele com maiúscula) e os pronomes. Desligado ou sem comentário: igual.
 */
export function planoParaQuemEstaNoQuadro(visual: string, nomes: readonly string[], mostraAlguem: (texto: string) => boolean): string {
  const v = String(visual ?? '')
  if (!comentarioNaoECenaLigado()) return v
  const fora = foraDoComentario(v)
  if (fora === v || mostraAlguem(fora)) return v
  const partes = [...new Set(nomes.flatMap((n) => { const s = String(n ?? '').replace(/^the\s+/iu, '').trim(); return s ? [s, ...s.split(/\s+/u).filter((w) => /^\p{Lu}/u.test(w) && w.length > 2)] : [] }))].sort((a, b) => b.length - a.length)
  const nomeRe = partes.length ? new RegExp(`(?<![\\p{L}])(?:${partes.map(escapa).join('|')})(?:['’]s)?(?![\\p{L}])`, 'giu') : null
  return v.replace(COMENTARIO_RE, (c) => (nomeRe ? c.replace(nomeRe, '') : c).replace(PRONOME_RE, ''))
}
// ═══ fim KINEO-COMENTARIO-NAO-E-CENA-1411 v2 ═══
