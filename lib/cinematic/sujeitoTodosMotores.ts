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
import { novaMedidaDaCadeia2411, type CadeiaDoSujeito2411 } from '@/lib/cinematic/sujeitoCadeia2411' // KINEO-SUJEITO-CADEIA-2411 — só medida

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

/** O passo da rota (rede): lê o sujeito do pedido e aplica. Nunca lança — erro inesperado = planos intactos, motivo no relato.
 *  KINEO-SUJEITO-CADEIA-2411: + cadeia_2411, o que cada degrau leu (só medida: as mesmas leituras, nenhuma a mais; planos e relato iguais). */
export async function sujeitoEmTodosOsMotores(args: {
  pedido: PedidoDoSujeito | null; falas: ReadonlyArray<string>; planos: ReadonlyArray<string>; pessoaPermitida: boolean; estrada: EstradaDoSujeito
}, opts: OpcoesSemanticas = {}): Promise<{ planos: string[]; relato: RelatoSujeitoTodos; cadeia_2411?: CadeiaDoSujeito2411 } | null> {
  const medida = novaMedidaDaCadeia2411(args.pessoaPermitida) // KINEO-SUJEITO-CADEIA-2411
  const r = await cadeiaDoSujeito(args, opts, medida.anota)
  return r ? { planos: r.planos, relato: r.relato, cadeia_2411: medida.fecha() } : r // KINEO-SUJEITO-CADEIA-2411 — fecha nunca lança (erro = { erro: true })
}
async function cadeiaDoSujeito(args: Parameters<typeof sujeitoEmTodosOsMotores>[0], opts: OpcoesSemanticas, anota: ReturnType<typeof novaMedidaDaCadeia2411>['anota']): Promise<{ planos: string[]; relato: RelatoSujeitoTodos } | null> {
  if (args.planos.length === 0) return null
  try {
    const doPedido = args.pedido?.pedido ? exigirSujeitoEmTodos({ ...args, pedido: args.pedido, leitura: anota('pedido', await lerSujeitoDoPedido(args.pedido.pedido, opts)) }) : null
    if (doPedido?.relato.sujeito) return doPedido
    // KINEO-SUJEITO-DA-FALA-0311 [TRAVA 8.2 — fundador 03/11: "universalizar"] — pedido genérico ("mistério sem solução") ou roteiro colado não dizem o sujeito, mas a 1ª frase da narração
    // KINEO-SUJEITO-DA-FALA-0311 — diz: "A plane vanished—unsolved for 70 years!" (mahrafariha, 03/11) não mostrou avião nenhum. A MESMA leitura calibrada sobre essa frase (uso literal, âncora no texto).
    const frase = primeiraFraseDaFala(args.falas[0])
    if (!frase) return doPedido
    const daFala = exigirSujeitoEmTodos({ ...args, pedido: { pedido: frase, fonte: 'ideia_solta', motivo: 'fala_de_abertura' }, leitura: anota('primeira_frase', await lerSujeitoDoPedido(frase, opts)) })
    if (daFala.relato.sujeito) return daFala
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — revisor 17/11 (filme 44d02f20, Kling 4 grátis, 1º filme, nota 5): a
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 — narração abriu com "A 70-year-old mystery... unsolved and chilling." e só a frase SEGUINTE disse "In 1950, a plane vanished.": a leitura
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 — parava na 1ª frase (kind none) e nenhum plano pediu o avião. A MESMA leitura calibrada, uma frase por vez, nas próximas frases inteiras
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 — da narração (no máximo FRASES_SEGUINTES_MAX, sem tentativa extra); a 1ª com sujeito vale. Nenhuma tem = o resultado de sempre.
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2-B, CEO 17/11: regra conservadora) — as frases seguintes só são lidas quando a 1ª frase NÃO tinha sujeito (kind none, motivo uso_none: o caso
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2-B) — do avião). Sujeito barrado por trava (nome ou título, maiúscula, pessoa real, sem núcleo…) ou leitura que falhou: nada de frase seguinte.
    if (!primeiraFraseSemSujeito(daFala.relato)) return doPedido ?? daFala
    // KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2, revisão independente 17/11) — a 1ª leitura que FALHAR (prazo, rede, JSON) encerra o laço: nada de somar espera em cima de falha.
    for (const seguinte of frasesSeguintesDaFala(args.falas, frase)) {
      const leitura = anota('frase_seguinte', await lerSujeitoDoPedido(seguinte, { ...opts, tentativasExtras: 0 }))
      if (!leitura.ok) break
      const r = exigirSujeitoEmTodos({ ...args, pedido: { pedido: seguinte, fonte: 'ideia_solta', motivo: MOTIVO_FALA_SEGUINTE }, leitura })
      if (r.relato.sujeito) return r
    }
    return doPedido ?? daFala
  } catch {
    return null
  }
}

/** A 1ª frase da narração (8 a 140 caracteres), sem aspas e sem rótulo de seção; vazia = nada a ler. */
export function primeiraFraseDaFala(fala: string | null | undefined): string {
  const t = String(fala ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/^[\s"“”'‘’]+/, '').replace(/\s+/g, ' ').trim()
  const m = /^.{8,140}?[.!?…؟。](?=\s|$|["”’])/u.exec(t)
  const frase = (m ? m[0] : t.slice(0, 140)).replace(/["“”]/g, '').trim()
  return frase.length >= 8 ? frase : ''
}

export const FRASES_SEGUINTES_MAX = 2
/** KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 — as frases inteiras da narração DEPOIS da 1ª (8 a 140 caracteres), na ordem, no máximo FRASES_SEGUINTES_MAX. Pedaço que começa em minúscula é resto da frase anterior ("mystery... unsolved and chilling.") e não conta. */
export function frasesSeguintesDaFala(falas: ReadonlyArray<string | null | undefined>, primeira: string): string[] {
  const t = falas.map((f) => String(f ?? '')).join(' ').replace(/\[[^\]]*\]/g, ' ').replace(/["“”]/g, '').replace(/^[\s'‘’]+/, '').replace(/\s+/g, ' ').trim()
  // volta 2 — a frase de abertura sai INTEIRA (índice 0), tenha o tamanho que tiver: o rabo de uma 1ª frase longa (cortada em 140 na leitura) nunca vira frase; pedaço já lido na 1ª leitura também não
  return frasesInteiras(t).slice(1).map((f) => f.trim()).filter((f) => f.length >= 8 && f.length <= 140 && !/^\p{Ll}/u.test(f) && !(primeira && primeira.includes(f))).slice(0, FRASES_SEGUINTES_MAX)
}
// KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2) — abreviação ("Dr.", "Mr.", "Mrs.", "Ms.", "St.", "Jr.") e inicial ("F.") não fecham frase: o pedaço se junta ao seguinte.
const ABREVIACAO_NO_FIM = /(?:^|[\s(])(?:Dr|Mr|Mrs|Ms|St|Jr|\p{Lu})\.$/u
function frasesInteiras(t: string): string[] {
  const out: string[] = []
  for (const pedaco of t.split(/(?<=[.!?…؟。])\s+/u)) {
    if (out.length && ABREVIACAO_NO_FIM.test(out[out.length - 1])) out[out.length - 1] += ` ${pedaco}`
    else out.push(pedaco)
  }
  return out
}

/** KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2-B) — a 1ª frase foi lida e não tem sujeito concreto (kind none, uso_none). Qualquer outro motivo é trava ou falha. */
export function primeiraFraseSemSujeito(relato: Pick<RelatoSujeitoTodos, 'motivo_sem_sujeito' | 'leitura'>): boolean {
  return relato.motivo_sem_sujeito === 'uso_none' && relato.leitura?.ok === true && relato.leitura.kind === 'none'
}

export const MOTIVO_FALA_SEGUINTE = 'fala_seguinte' as const
/**
 * KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 (volta 2, revisão independente 17/11) — o sujeito que alimenta a camada da ficha (sujeitoDoPedido1311 → refazerPlanoDaFicha).
 * O sujeito lido de uma frase SEGUINTE da narração é local (vale para a cena cuja fala o cita): não vira "o sujeito do pedido" dos planos que perdem a ordem do
 * protagonista — nas baleias de Galápagos (58f63487) "satellite tags" iria para esses planos. Pedido e 1ª frase: como sempre.
 */
export function sujeitoQueAlimentaAFicha(relato: Pick<RelatoSujeitoTodos, 'sujeito' | 'tipo' | 'motivo_do_pedido'> | null | undefined): { sujeito: string; tipo: string | null } | null {
  if (!relato?.sujeito || relato.motivo_do_pedido === MOTIVO_FALA_SEGUINTE) return null
  return { sujeito: relato.sujeito, tipo: relato.tipo ?? null }
}
