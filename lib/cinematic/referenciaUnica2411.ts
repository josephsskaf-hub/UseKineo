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
  try { return escolherReferencia(snapshot) } catch { return null } // [revisor 24/11, volta 1] retrato torto = sem referência (o caminho de hoje), nunca erro
}
const objeto = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v)
/** Retrato fora do formato (lista ausente, item que não é objeto, imagem-chave sem characterNames) = sem referência. */
function retratoNoFormato(s: FilmQualitySnapshot | null | undefined): s is FilmQualitySnapshot {
  return objeto(s) && Array.isArray(s!.characters) && Array.isArray(s!.characterReferences) && Array.isArray(s!.approvedStills) &&
    s!.characters.every(objeto) && s!.characterReferences.every(objeto) && s!.approvedStills.every((x) => objeto(x) && Array.isArray(x.characterNames))
}
function escolherReferencia(snapshot: FilmQualitySnapshot | null | undefined): ReferenciaUnica2411 | null {
  if (!retratoNoFormato(snapshot)) return null
  const leads = snapshot.characters.filter((c) => c.protagonista === true)
  if (leads.length !== 1) return null
  const lead = leads[0]
  if (typeof lead.nome !== 'string' || !lead.nome.trim()) return null
  if (lead.tipo !== 'humano' && lead.tipo !== 'animal' && lead.tipo !== 'criatura') return null
  const ficha = snapshot.characterReferences.find((r) => r.nome === lead.nome)?.url
  const still = snapshot.approvedStills.find((s) => s.characterNames.length === 1 && s.characterNames[0] === lead.nome)?.url
  const imageUrl = https(ficha) ? ficha : https(still) ? still : null
  if (!imageUrl) return null
  const nomes = [lead.nome, lead.nucleo].filter((n, i, all): n is string => typeof n === 'string' && !!n.trim() && all.indexOf(n) === i)
  return { imageUrl, frase: lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO, nomes,
    origem: https(ficha) ? 'ficha' : 'imagem_chave', tipo: lead.tipo }
}

/** [revisor 24/11, volta 1] O que os JUÍZES leem: a frase de referência é instrução ao motor, não conteúdo da cena. Ela sai antes do juízo, para o
 *  juiz de antes, o A2 e o juiz do plano lerem o MESMO texto (juizLeuOMesmoTexto continua valendo; sem 2ª leitura paga a mais). O que vai à fal e
 *  ao claim continua o pedido real. Sem a referência única no envio = a MESMA entrada, intocada (desligado = byte a byte). */
export function entradaDoJuiz2411(
  timing: Parameters<typeof relatoReferenciaUnica>[0], wire: { model: string; input: Record<string, unknown> },
): Record<string, unknown> {
  const ref = timing?.referenciaUnica
  if (!ref || !relatoReferenciaUnica(timing, wire) || !Array.isArray(wire.input.multi_prompt)) return wire.input
  const frase = ' ' + ref.frase.trim()
  // [revisor 24/11, volta 2] só a frase que NÓS pusemos, pela posição (antes de "Mouth closed, no speaking." ou no fim); frase igual escrita pelo cliente fica
  const semANossa = (p: string): string => p.endsWith(frase + CAUDA_DA_BOCA_2411) ? p.slice(0, -(frase + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411
    : p.endsWith(frase) ? p.slice(0, -frase.length) : p
  return { ...wire.input, multi_prompt: (wire.input.multi_prompt as Array<Record<string, unknown>>).map((m) =>
    typeof m?.prompt === 'string' && semANossa(m.prompt) !== m.prompt ? { ...m, prompt: semANossa(m.prompt) } : m) }
}
const CAUDA_DA_BOCA_2411 = ' Mouth closed, no speaking.' // a mesma cauda que buildKling4ReferenciaUnicaInput protege (lib/kling4Trial.ts)

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
