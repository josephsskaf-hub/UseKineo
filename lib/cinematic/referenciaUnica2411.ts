// KINEO-REFERENCIA-UNICA-2411 [teste pago 23/11, docs/filme-nota-9/teste-motores-2311/RESULTADO.md] — no filme grátis de 15 s do Kling 4, as 2 ou 3
// imagens-chave desenhadas cada uma sozinha fazem a pessoa mudar no meio (nota visual 4,0). UMA referência do personagem principal, citada nos
// planos em que ele aparece, pelo kling/v4/reference-to-video (mesmo preço por segundo), levou a 7,3. Mapa: docs/filme-nota-9/OBRA-REFERENCIA-UNICA.md.
// Puro: escolhe a referência a partir do snapshot de qualidade já pronto; o pedido é montado em lib/kling4Trial.ts (buildKling4ReferenciaUnicaInput).
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { KLING4_REFERENCE_MODEL, type Kling4ReferenciaUnica } from '@/lib/kling4Trial'

export const REFERENCIA_UNICA_2411_VERSAO = 'KINEO-REFERENCIA-UNICA-2411'
export type ModoReferenciaUnica2411 = 'off' | 'internal' | 'public'
/** 'off' = o pedido à fal byte a byte o de hoje. 'internal' = só a lista EXATA da casa (contaDaCasaExata, e-mail do usuário autenticado).
 *  'public' só com revisor independente + prova paga + sim do dono. */
export const REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'off'
export const referenciaUnicaLigada = (modo: ModoReferenciaUnica2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))

export const FRASE_REFERENCIA_PESSOA = 'Keep the face and outfit of @Image1.'
export const FRASE_REFERENCIA_DESENHO = 'Keep the exact character design of @Image1.'
export type ReferenciaUnica2411 = Kling4ReferenciaUnica & { origem: 'ficha' | 'imagem_chave'; tipo: 'humano' | 'animal' | 'criatura' }

const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u)

/** O protagonista do elenco aceito (pessoa, bicho ou criatura) e a sua referência: a ficha do elenco; senão a 1ª imagem-chave aprovada
 *  que mostra só ele. Sem protagonista, mais de um, ou sem URL https = null (o caminho de hoje). */
export function referenciaUnicaDoFilme(snapshot: FilmQualitySnapshot | null | undefined): ReferenciaUnica2411 | null {
  const leads = snapshot?.characters?.filter((c) => c.protagonista) ?? []
  if (!snapshot || leads.length !== 1) return null
  const lead = leads[0]
  if (lead.tipo !== 'humano' && lead.tipo !== 'animal' && lead.tipo !== 'criatura') return null
  const ficha = snapshot.characterReferences.find((r) => r.nome === lead.nome)?.url
  const still = snapshot.approvedStills.find((s) => s.characterNames.length === 1 && s.characterNames[0] === lead.nome)?.url
  const imageUrl = https(ficha) ? ficha : https(still) ? still : null
  if (!imageUrl) return null
  const nomes = [lead.nome, lead.nucleo].filter((n, i, all): n is string => typeof n === 'string' && !!n.trim() && all.indexOf(n) === i)
  return { imageUrl, frase: lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO, nomes,
    origem: https(ficha) ? 'ficha' : 'imagem_chave', tipo: lead.tipo }
}

/** Para medir depois: o que foi à fal saiu pela referência única? (só nomes de campo, índices e a origem; nunca texto do cliente) */
export function relatoReferenciaUnica(
  timing: { fixedCharacter?: unknown; referenciaUnica?: Kling4ReferenciaUnica & Partial<Pick<ReferenciaUnica2411, 'origem' | 'tipo'>> } | null | undefined,
  wire: { model: string; input: Record<string, unknown> },
): { versao: string; origem: string | null; tipo: string | null; planos: number; planos_com_frase: number[] } | null {
  const ref = timing?.referenciaUnica
  if (!ref || timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL) return null
  const planos = Array.isArray(wire.input.multi_prompt) ? wire.input.multi_prompt as Array<{ prompt?: unknown }> : []
  return { versao: REFERENCIA_UNICA_2411_VERSAO, origem: ref.origem ?? null, tipo: ref.tipo ?? null, planos: planos.length,
    planos_com_frase: planos.flatMap((p, i) => typeof p?.prompt === 'string' && p.prompt.includes(ref.frase) ? [i + 1] : []) }
}
