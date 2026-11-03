// KINEO-SUJEITO-TODOS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]
// — o SUJEITO OBRIGATÓRIO do pedido em TODOS os motores, não só no Kling 4 grátis.
//
// O defeito nº 1 da fila do revisor (CENA_FORA_DO_PEDIDO, 15 ocorrências, 10 no 1º filme, notas 3-6): o tema central do pedido não
// aparece em quadro nenhum — "o avião C-54 que sumiu" sem avião, "criança com caneta 3D" sem a criança, a arca de Noé sem arca. O
// KINEO-K4-SUJEITO-0111 (lib/cinematic/sujeitoObrigatorio.ts, calibrado: 0 grave em 151 casos × 2) só rodava no multi_prompt do Kling 4
// grátis; Seedance, Veo, Kling 2.5 (estrada clássica) e Kling 3, H3, H3 Max, Omni, S25 (estrada hollywood) ficavam sem.
//
// Este módulo NÃO reescreve a decisão calibrada: a MESMA leitura semântica (lerSujeitoDoPedido) e a MESMA escolha (exigirSujeitoNoKling4:
// sujeito do pedido original, presença pelo núcleo, cena cuja fala o cita, senão a última) — só troca a INSERÇÃO. A do Kling 4 cabe no
// orçamento de 464 code points do multi_prompt e corta o corpo; o plano das outras estradas é a semente de um prompt maior, então a
// frase entra na FRENTE, inteira, sem cortar nada ("Main subject clearly visible in frame: <sujeito>."). Corrige, nunca bloqueia; a fala
// nunca é tocada; sem pedido confiável (roteiro "as is", ideia longa, pistas) a chamada nem sai. Falha segura: qualquer erro = planos intactos.
import { exigirSujeitoNoKling4, lerSujeitoDoPedido, type OpcoesSemanticas, type PedidoDoSujeito, type RelatoSujeitoK4 } from '@/lib/cinematic/sujeitoObrigatorio'

export const SUJEITO_TODOS_VERSAO = 'sujeito_todos_0311_v1' as const
export const SUJEITO_TODOS_EVENTO = 'cinematic_required_subject' as const
const CLAUSULA = 'Main subject clearly visible in frame:'

export type EstradaDoSujeito = 'classica' | 'hollywood'
export interface RelatoSujeitoTodos extends Omit<RelatoSujeitoK4, 'versao' | 'keyframe_removido'> { versao: typeof SUJEITO_TODOS_VERSAO; estrada: EstradaDoSujeito }

/** A frase do sujeito na frente do plano (idempotente; nada é cortado). */
export function comSujeitoNoPlano(plano: string, frase: string): string {
  const p = String(plano ?? '').trim()
  if (!frase || p.includes(CLAUSULA)) return p
  return `${CLAUSULA} ${String(frase).trim().replace(/[.\s]+$/, '')}. ${p}`.trim()
}

function relatoTodos(r: RelatoSujeitoK4, estrada: EstradaDoSujeito): RelatoSujeitoTodos {
  const { versao: _v, keyframe_removido: _k, ...resto } = r
  return { ...resto, versao: SUJEITO_TODOS_VERSAO, estrada }
}

/** PURA: aplica a decisão calibrada do Kling 4 com a inserção sem corte. */
export function exigirSujeitoEmTodos(args: {
  pedido: PedidoDoSujeito; leitura: Parameters<typeof exigirSujeitoNoKling4>[0]['leitura']; falas: ReadonlyArray<string>; planos: ReadonlyArray<string>; pessoaPermitida: boolean; estrada: EstradaDoSujeito
}): { planos: string[]; relato: RelatoSujeitoTodos } {
  const planos = args.planos.map((p) => String(p ?? ''))
  const r = exigirSujeitoNoKling4({ pedido: args.pedido, leitura: args.leitura, falas: args.falas, prompts: planos, pessoaPermitida: args.pessoaPermitida })
  const relato = relatoTodos(r.relato, args.estrada)
  if (relato.corrigido && relato.cena !== null && relato.sujeito) planos[relato.cena - 1] = comSujeitoNoPlano(planos[relato.cena - 1], relato.sujeito)
  return { planos, relato }
}

/** O passo da rota (rede): lê o sujeito do pedido e aplica. Nunca lança — erro inesperado = planos intactos, motivo no relato. */
export async function sujeitoEmTodosOsMotores(args: {
  pedido: PedidoDoSujeito | null; falas: ReadonlyArray<string>; planos: ReadonlyArray<string>; pessoaPermitida: boolean; estrada: EstradaDoSujeito
}, opts: OpcoesSemanticas = {}): Promise<{ planos: string[]; relato: RelatoSujeitoTodos } | null> {
  if (!args.pedido || !args.pedido.pedido || args.planos.length === 0) return null
  try {
    const leitura = await lerSujeitoDoPedido(args.pedido.pedido, opts)
    return exigirSujeitoEmTodos({ ...args, pedido: args.pedido, leitura })
  } catch {
    return null
  }
}
