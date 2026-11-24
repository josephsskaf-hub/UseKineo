// KINEO-REFERENCIA-UNICA-2411 [teste pago 23/11, docs/filme-nota-9/teste-motores-2311/RESULTADO.md] — no filme grátis de 15 s do Kling 4, as 2 ou 3
// imagens-chave desenhadas cada uma sozinha fazem a pessoa mudar no meio (nota visual 4,0). UMA referência do personagem principal, citada nos
// planos em que ele aparece, pelo kling/v4/reference-to-video (mesmo preço por segundo), levou a 7,3. Mapa: docs/filme-nota-9/OBRA-REFERENCIA-UNICA.md.
// Puro: escolhe a referência a partir do snapshot de qualidade já pronto; o pedido é montado em lib/kling4Trial.ts (buildKling4ReferenciaUnicaInput).
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { KLING4_REFERENCE_MODEL, kling4TrialClipTotal, type Kling4ReferenciaUnica } from '@/lib/kling4Trial'

export const REFERENCIA_UNICA_2411_VERSAO = 'KINEO-REFERENCIA-UNICA-2411'
export type ModoReferenciaUnica2411 = 'off' | 'internal' | 'public_humano' | 'public'
/** 'off' = o pedido à fal byte a byte o de hoje. 'internal' = só a lista EXATA da casa (contaDaCasaExata, e-mail do usuário autenticado).
 *  'public' só com revisor independente + prova paga + sim do dono.
 *  [CEO 24/11, depois da 4ª revisão LIMPA] 'internal': só a lista exata da casa, para ensaiar em filmes da casa; cliente = o pedido de hoje,
 *  byte a byte. 'public' só com prova paga em filmes da casa pelo caminho inteiro e o sim do dono. Voltar: 'off'.
 *  [CEO 24/11, KINEO-REFERENCIA-UNICA-HUMANO-2411] 'public_humano': a casa como em 'internal'; o cliente só com pessoa fotorreal e um protagonista
 *  (admitirReferenciaUnica2411). Voltar ao ensaio só da casa: 'internal'. */
export const REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public_humano'
/** Liga SEM a guarda de cliente: a lista exata da casa em 'internal' e 'public_humano'; todo mundo só em 'public'. */
export const referenciaUnicaLigada = (modo: ModoReferenciaUnica2411, email: string | null | undefined): boolean =>
  modo === 'public' || ((modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(email))

/** KINEO-REFERENCIA-UNICA-HUMANO-2411 [CEO 24/11] 'public_humano': o CLIENTE recebe a referência única só onde ela está provada (3 filmes da casa,
 *  pessoa fotorreal, notas cegas 10, 8 e 9). Em desenho, bicho e criatura a prova paga de 24/11 não ligou em nenhum (folha reprovada pelo crítico ou
 *  elenco sem folha): o cliente fica no pedido de hoje, byte a byte, e o claim grava só o código do motivo. */
export type MotivoClienteSemReferencia2411 = 'mais_de_um' | 'nao_humano' | 'mais_de_uma_folha' | 'estilizado' | 'sem_referencia'
  | 'sem_plano' | 'clipe_longo' /* [revisora 24/11, volta 3] admitido, mas o montador devolveu null: nenhum plano o mostra (15 s) / clipe de 16 a 30 s */
/** Por que o cliente NÃO recebe a referência (null = recebe, se o montador achar plano que o mostra): mais de um protagonista; o protagonista ou alguém
 *  do elenco com folha que não é 'humano'; [CEO 24/11, volta 3 da revisora] mais de UM personagem com referência (folha https, ou o protagonista):
 *  dois humanos com folha nunca passaram por render, só o provado abre; o filme estilizado (isStylizedLook ou desenho infantil, o que a rota já
 *  sabe); ou nenhuma referência. Coadjuvante sem folha https não conta (Le Prince, Slocum e Cooper tinham coadjuvante só citado). */
export function motivoClienteSemReferencia2411(snapshot: FilmQualitySnapshot | null | undefined, filme: { estilizado: boolean }): MotivoClienteSemReferencia2411 | null {
  if (!retratoNoFormato(snapshot)) return 'sem_referencia'
  const leads = snapshot.characters.filter((c) => c.protagonista === true).length
  if (leads > 1) return 'mais_de_um'
  if (leads === 0) return 'sem_referencia'
  const comFolha = snapshot.characters.filter((c) => c.protagonista === true || snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))
  if (comFolha.some((c) => c.tipo !== 'humano')) return 'nao_humano'
  if (comFolha.length > 1) return 'mais_de_uma_folha'
  if (filme.estilizado !== false) return 'estilizado' // na dúvida (campo ausente ou torto), estilizado
  return referenciaUnicaDoFilme(snapshot) ? null : 'sem_referencia'
}
export type AdmissaoReferenciaUnica2411 = { referencia: ReferenciaUnica2411; cliente?: true } | { motivo: MotivoClienteSemReferencia2411 } | null
/** A admissão inteira, num lugar: 'off' = null; a casa = a referência sem guarda (como em 'internal'); cliente em 'internal' = null (o de hoje, sem
 *  campo novo); cliente em 'public_humano' = a referência só se motivoClienteSemReferencia2411 der null, senão o motivo; 'public' = todos sem guarda. */
export function admitirReferenciaUnica2411(modo: ModoReferenciaUnica2411, email: string | null | undefined, snapshot: FilmQualitySnapshot | null | undefined,
  filme: { estilizado: boolean }): AdmissaoReferenciaUnica2411 {
  if (referenciaUnicaLigada(modo, email)) { const r = referenciaUnicaDoFilme(snapshot); return r ? { referencia: r } : null }
  if (modo !== 'public_humano') return null
  const motivo = motivoClienteSemReferencia2411(snapshot, filme)
  if (motivo) return { motivo }
  const r = referenciaUnicaDoFilme(snapshot)
  return r ? { referencia: r, cliente: true } : { motivo: 'sem_referencia' }
}
/** Para medir quando NÃO ligou para cliente: só a versão e o código do motivo (nunca texto do cliente). Barrado na guarda = o motivo da guarda;
 *  [revisora 24/11, volta 3] admitido pela guarda (referenciaUnicaDoCliente) e o envio NÃO saiu pela referência = 'clipe_longo' (clipe de 16 a 30 s:
 *  o montador só aceita 15) ou 'sem_plano' (15 s e nenhum plano o mostra). Referência usada, casa ou sem o envio = null. */
export function relatoClienteSemReferencia2411(
  timing: { referenciaUnica?: unknown; referenciaUnicaRecusa?: MotivoClienteSemReferencia2411; referenciaUnicaDoCliente?: boolean; clipSeconds?: number; fixedCharacter?: unknown } | null | undefined,
  wire?: { model: string } | null,
): { versao: string; motivo: MotivoClienteSemReferencia2411 } | null {
  if (!timing) return null
  if (!timing.referenciaUnica) return typeof timing.referenciaUnicaRecusa === 'string' ? { versao: REFERENCIA_UNICA_HUMANO_2411_VERSAO, motivo: timing.referenciaUnicaRecusa } : null
  if (timing.referenciaUnicaDoCliente !== true || timing.fixedCharacter || !wire || wire.model === KLING4_REFERENCE_MODEL) return null
  return { versao: REFERENCIA_UNICA_HUMANO_2411_VERSAO, motivo: kling4TrialClipTotal(timing.clipSeconds) !== 15 ? 'clipe_longo' : 'sem_plano' }
}
export const REFERENCIA_UNICA_HUMANO_2411_VERSAO = 'KINEO-REFERENCIA-UNICA-HUMANO-2411'

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
  const descricao = descricaoDoAutor(lead.canonica) // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — a pessoa sem nome no plano só é ele quando repete esta descrição
  return { imageUrl, frase: lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO, nomes, ...(descricao ? { descricao } : {}),
    origem: https(ficha) ? 'ficha' : 'imagem_chave', tipo: lead.tipo }
}
/** KINEO-REFERENCIA-UNICA-PUBLIC-2411 — da canônica do elenco, só o que o AUTOR e o PEDIDO disseram dele (o trecho entre aspas de "exactly as the author
 *  wrote:" e o de "as the request describes:"); as âncoras, a origem e a linha de estilo são NOSSAS e repetem o resto do plano. Nada achado = undefined. */
export function descricaoDoAutor(canonica: unknown): string | undefined {
  const c = typeof canonica === 'string' ? canonica : ''
  const partes = [/exactly as the author wrote:\s*"([^"]+)"/u.exec(c)?.[1], /as the request describes:\s*([^;]+)/u.exec(c)?.[1]]
    .filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
  return partes.length ? partes.join('; ') : undefined
}

/** [revisor 24/11, volta 1] O que os JUÍZES leem: a frase de referência é instrução ao motor, não conteúdo da cena. Ela sai antes do juízo, para o
 *  juiz de antes, o A2 e o juiz do plano lerem o MESMO texto (juizLeuOMesmoTexto continua valendo; sem 2ª leitura paga a mais). O que vai à fal e
 *  ao claim continua o pedido real. Sem a referência única no envio = a MESMA entrada, intocada (desligado = byte a byte). */
export type EnvioKling4 = { model: string; input: Record<string, unknown>; planosComFrase?: readonly boolean[]; fichaRetirada?: readonly (string | null)[] /* KINEO-REFERENCIA-UNICA-PUBLIC-2411 */ }
export function entradaDoJuiz2411(timing: Parameters<typeof relatoReferenciaUnica>[0], wire: EnvioKling4): Record<string, unknown> {
  const ref = timing?.referenciaUnica
  if (!ref || !relatoReferenciaUnica(timing, wire) || !Array.isArray(wire.input.multi_prompt)) return wire.input
  // [revisor 24/11, volta 3] UMA fonte de verdade: a frase só sai dos planos em que o MONTADOR a pôs (wire.planosComFrase, a decisão de
  // buildKling4ReferenciaUnicaInput). Plano sem a nossa frase fica como foi à fal, mesmo que o cliente tenha escrito uma frase igual. Sem a decisão = nada sai.
  const marcados = Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []
  const frase = ' ' + ref.frase.trim()
  // dentro do plano marcado, só a ocorrência que nós pusemos: pela posição (antes de "Mouth closed, no speaking." ou no fim), nunca outra igual do cliente
  const semANossa = (p: string): string => p.endsWith(frase + CAUDA_DA_BOCA_2411) ? p.slice(0, -(frase + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411
    : p.endsWith(frase) ? p.slice(0, -frase.length) : p
  // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — plano sem o personagem de onde o montador tirou a ficha dele: o juiz lê o texto que o montador recebeu (o mesmo
  // do juiz de antes; a retirada, como a frase, é decisão do montador para o motor). Só pelo registro do montador, nunca pela busca no texto.
  const retirada = Array.isArray(wire.fichaRetirada) ? wire.fichaRetirada : []
  return { ...wire.input, multi_prompt: (wire.input.multi_prompt as Array<Record<string, unknown>>).map((m, i) =>
    typeof retirada[i] === 'string' && marcados[i] !== true ? { ...m, prompt: retirada[i] }
    : marcados[i] === true && typeof m?.prompt === 'string' && semANossa(m.prompt) !== m.prompt ? { ...m, prompt: semANossa(m.prompt) } : m) }
}
const CAUDA_DA_BOCA_2411 = ' Mouth closed, no speaking.' // a mesma cauda que buildKling4ReferenciaUnicaInput protege (lib/kling4Trial.ts)

/** Para medir depois: o que foi à fal saiu pela referência única? (só nomes de campo, índices e a origem; nunca texto do cliente) */
export function relatoReferenciaUnica(
  timing: { fixedCharacter?: unknown; referenciaUnica?: Kling4ReferenciaUnica & Partial<Pick<ReferenciaUnica2411, 'origem' | 'tipo'>> } | null | undefined,
  wire: EnvioKling4,
): { versao: string; origem: string | null; tipo: string | null; planos: number; planos_com_frase: number[]; planos_sem_ficha: number[]; planos_metade: number[] } | null {
  const ref = timing?.referenciaUnica
  if (!ref || timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL) return null
  const planos = Array.isArray(wire.input.multi_prompt) ? wire.input.multi_prompt as Array<{ prompt?: unknown }> : []
  return { versao: REFERENCIA_UNICA_2411_VERSAO, origem: ref.origem ?? null, tipo: ref.tipo ?? null, planos: planos.length,
    planos_com_frase: (Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []).flatMap((m, i) => m === true ? [i + 1] : []),
    planos_sem_ficha: (Array.isArray(wire.fichaRetirada) ? wire.fichaRetirada : []).flatMap((t, i) => typeof t === 'string' ? [i + 1] : []),
    planos_metade: (Array.isArray(ref.metades) && ref.metades.length === planos.length ? ref.metades : []).flatMap((m, i) => m === true ? [i + 1] : []) } // [volta 3] a decisão do montador, não a busca do texto (frase do cliente não conta) · KINEO-REFERENCIA-UNICA-PUBLIC-2411: + os planos sem o personagem de onde a ficha dele saiu
}
