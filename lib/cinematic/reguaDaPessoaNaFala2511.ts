// KINEO-FALA-DOS-PERSONAGENS-2511 [revisora 392f0a52 · CEO 25/11, T1 e T2] — a régua de PESSOA de quem FALA no modo "personagens falam". Desde a volta 2 das duas
// pessoas (revisora 52b12696: V3 "o adulto é DO personagem", V4 "as idades que faltavam") a régua mora num lugar só, lib/cinematic/referenciaUnica2411.ts, e a
// fala a lê de lá: o mesmo adulto provado, a mesma 2ª trava de menor e a mesma figura conhecida (mito e história da casa, pessoa real, obra, marca).
// Puro: sem rede, sem banco.
import { adultoProvado2511, pareceMenor2511, textoDizMenor2511, figuraNaReferencia2511 } from '@/lib/cinematic/referenciaUnica2411'

/** Quem fala é figura conhecida, pessoa real, personagem de obra ou de marca? (o nome, o núcleo e a canônica do personagem) */
export function falanteConhecido2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown } | null | undefined): boolean {
  return !!c && figuraNaReferencia2511(c, '')
}
/** Quem fala num filme FOTORREAL é adulto provado (o sinal é DELE) e nada do que é dele (nem a própria fala) diz menor? (falha fechada) */
export function falanteAdulto2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown } | null | undefined, falas: ReadonlyArray<string>): boolean {
  if (!c) return false
  return adultoProvado2511(c) && !pareceMenor2511(c) && !falas.some((t) => textoDizMenor2511(t))
}
