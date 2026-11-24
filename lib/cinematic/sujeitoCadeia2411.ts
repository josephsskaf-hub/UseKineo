// KINEO-SUJEITO-CADEIA-2411 — MEDIDA (nada do filme muda): o que a cadeia do sujeito obrigatório leu em CADA degrau.
//
// 24/11: 69 de 113 filmes grátis do Kling 4 de cliente (30 dias) saíram sem sujeito lido. O evento cinematic_required_subject só grava a leitura
// do degrau que a rota devolveu (quando nada vinga, a do pedido: `return doPedido ?? daFala` em sujeitoTodosMotores.ts), então não dá para dizer
// se o leitor disse "nada" em todos os degraus ou se respondeu e o validador descartou (visual_com_maiuscula: "rocks moving in Death Valley").
// Este bloco (cadeia_2411) anota, sem nenhuma chamada nova, as leituras que a cadeia JÁ fez: pedido original → 1ª frase → frases seguintes.
// Degrau que a cadeia não alcançou = tentou:false (nunca é lido só para medir). Só códigos, contagens e UMA palavra comum (o núcleo) — nada de
// frase do roteiro, pedido, nome, e-mail ou id. Qualquer exceção = { erro: true } e o resto do evento sai igual.
// Consulta: docs/queries/SUJEITO-CADEIA-2411.sql. Guardião: scripts/test-sujeito-cadeia-2411.mjs.
import { avaliarSujeito, type LeituraDoSujeito, type ResultadoSemantico } from '@/lib/cinematic/sujeitoObrigatorio'

export const SUJEITO_CADEIA_2411_VERSAO = 'sujeito_cadeia_2411_v1' as const
export type NomeDoDegrau2411 = 'pedido' | 'primeira_frase' | 'frase_seguinte_1' | 'frase_seguinte_2'
export const DEGRAUS_2411: ReadonlyArray<NomeDoDegrau2411> = ['pedido', 'primeira_frase', 'frase_seguinte_1', 'frase_seguinte_2']

export interface DegrauDaCadeia2411 {
  degrau: NomeDoDegrau2411
  tentou: boolean
  respondeu: boolean
  /** word_use do leitor (literal, name_or_title, figurative, verb, none). */
  uso: string | null
  /** kind do leitor (object, vehicle, creature, person_generic, none). */
  tipo: string | null
  /** A validação de sempre (avaliarSujeito) aceitou o sujeito deste degrau. */
  aceito: boolean
  /** O código do validador (visual_com_maiuscula, uso_none, pessoa_real, sem_nucleo, leitura_falhou:prazo…); null = aceito ou não tentou. */
  motivo_do_descarte: string | null
  palavras_do_visual: number
  tinha_maiuscula: boolean
  /** O código não sabe dizer se a maiúscula é lugar (não há catálogo de lugares no validador): sempre null. */
  tinha_nome_proprio_de_lugar: null
  /** O núcleo que o leitor apontou, se for UMA palavra comum minúscula; senão null. */
  substantivo_central: string | null
}
export interface CadeiaDoSujeito2411 {
  versao: typeof SUJEITO_CADEIA_2411_VERSAO
  degraus: DegrauDaCadeia2411[]
  /** 1-based na ordem de DEGRAUS_2411; null = nenhum degrau deu sujeito. */
  degrau_que_valeu: number | null
  erro: boolean
}

const NUCLEO_COMUM = /^\p{Ll}{3,}(?:-\p{Ll}+)?$/u
// O leitor devolve o núcleo já em minúscula ("Titanic" vira "titanic"): se o subject, o visual ou as palavras citadas o escrevem com maiúscula, é nome — null.
function nucleoComum(v: LeituraDoSujeito): string | null {
  const h = typeof v.head_noun === 'string' ? v.head_noun : ''
  if (!NUCLEO_COMUM.test(h)) return null
  const escrito = [v.subject ?? '', v.subject_visual_no_people ?? '', ...(v.mention_words ?? [])].join(' ') // o descarte apaga o subject: as palavras do pedido (mention_words) ficam
  const comMaiuscula = new RegExp('(?<![\\p{L}\\p{N}])' + h.charAt(0).toUpperCase() + h.slice(1) + '(?![\\p{L}\\p{N}])', 'u')
  return comMaiuscula.test(escrito) ? null : h
}
const naoTentou = (degrau: NomeDoDegrau2411): DegrauDaCadeia2411 => ({ degrau, tentou: false, respondeu: false, uso: null, tipo: null, aceito: false, motivo_do_descarte: null, palavras_do_visual: 0, tinha_maiuscula: false, tinha_nome_proprio_de_lugar: null, substantivo_central: null })

/** PURA: um degrau a partir da leitura que a cadeia já fez. Não muda a leitura. */
export function medirDegrau2411(degrau: NomeDoDegrau2411, leitura: ResultadoSemantico<LeituraDoSujeito> | null | undefined, pessoaPermitida: boolean): DegrauDaCadeia2411 {
  if (!leitura) return naoTentou(degrau)
  if (!leitura.ok) return { ...naoTentou(degrau), tentou: true, motivo_do_descarte: `leitura_falhou:${leitura.erro}` }
  const v = leitura.valor
  const a = avaliarSujeito({ leitura, pessoaPermitida })
  const palavras = String(v.subject_visual_no_people ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  return {
    degrau, tentou: true, respondeu: true, uso: v.word_use ?? null, tipo: v.kind ?? null, aceito: a.sujeito !== null, motivo_do_descarte: a.sujeito ? null : a.motivo,
    palavras_do_visual: palavras.length,
    tinha_maiuscula: palavras.some((w, i) => /^\p{Lu}/u.test(w) && !/\d/.test(w) && !(i === 0 && /^(?:A|An|The)$/.test(w))),
    tinha_nome_proprio_de_lugar: null,
    substantivo_central: nucleoComum(v),
  }
}

/** O caderno da cadeia: `anota` devolve a MESMA leitura (nunca a troca) e nunca lança; `fecha` monta o bloco. */
export function novaMedidaDaCadeia2411(pessoaPermitida: boolean) {
  const lidas: Array<{ degrau: NomeDoDegrau2411; leitura: ResultadoSemantico<LeituraDoSujeito> }> = []
  let erro = false
  let seguintes = 0
  const anota = (qual: 'pedido' | 'primeira_frase' | 'frase_seguinte', leitura: ResultadoSemantico<LeituraDoSujeito>): ResultadoSemantico<LeituraDoSujeito> => {
    try {
      const degrau: NomeDoDegrau2411 = qual === 'frase_seguinte' ? (++seguintes === 1 ? 'frase_seguinte_1' : 'frase_seguinte_2') : qual
      if (DEGRAUS_2411.includes(degrau)) lidas.push({ degrau, leitura })
    } catch { erro = true }
    return leitura
  }
  const fecha = (): CadeiaDoSujeito2411 => {
    try {
      if (erro) return { versao: SUJEITO_CADEIA_2411_VERSAO, degraus: [], degrau_que_valeu: null, erro: true }
      const degraus = DEGRAUS_2411.map((d) => medirDegrau2411(d, lidas.find((l) => l.degrau === d)?.leitura, pessoaPermitida))
      const k = degraus.findIndex((d) => d.aceito)
      return { versao: SUJEITO_CADEIA_2411_VERSAO, degraus, degrau_que_valeu: k >= 0 ? k + 1 : null, erro: false }
    } catch {
      return { versao: SUJEITO_CADEIA_2411_VERSAO, degraus: [], degrau_que_valeu: null, erro: true }
    }
  }
  return { anota, fecha }
}
