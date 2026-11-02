// ═══ KINEO-SEM-INICIO-AUTOMATICO-0211 — depois de pagar, nada começa sozinho; o filme sai no clique ═══
// [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
//
// CASO (manobiayousaf, Creator, 01/11 — reclamou DUAS vezes de "geração sem consentimento"):
//   13:15     payment_success (Creator)
//   13:16:15  card_entry_resume_restored  duration 35
//   13:16:17  card_entry_resume_autostart duration 60
//   → um Seedance de 60 s começou sozinho e debitou 35 créditos. Ela não apertou nada e não pediu 60 s.
//
// DUAS CAUSAS, as duas fechadas aqui:
//   1. O resume do card_entry DISPARAVA o render sozinho assim que o saldo chegava (handleGenerateGuarded num efeito).
//      Agora a tela mostra o pedido restaurado (motor · duração · custo) e um botão "Start my film"; o render só sai no
//      clique. Evento novo: card_entry_resume_confirmed. O card_entry_resume_autostart deixa de existir.
//   2. 35 → 60: o fetchCredits do /generate aplica os DEFAULTS POR PLANO quando o saldo chega (assíncrono, ~2 s depois
//      da montagem). Com a entrada nova do Seedance (seedance15Ok && !kineo1NoPlano) o ramo `entradaNoPlano` chamava
//      duracaoDaUrlNaEntrada() — sem ?duration na URL do resume, ela devolve duracaoDeEntrada(saldo) = a MAIOR duração
//      que o saldo paga. Creator recém-pago (centenas de créditos) → 60. Esse setDuration(60) caía DEPOIS do
//      setDuration(35) da restauração e no MESMO lote do setCredits — e o efeito do autostart via credits≠null com 60.
//      Regra nova: escolha restaurada (card_entry / wall_v1) vence os defaults do plano, sempre — motor e duração.
//
// Regras do início automático do 1º filme (activation_autostart, create_intent das páginas públicas):
//   · custo > 0 crédito (inclusive crédito do trial, que é a moeda de ativação) → o arranjo fica pronto (texto, motor,
//     duração) e a tela pede o clique, no mesmo padrão. Evento: activation_autostart_confirmed.
//   · custo 0 (filme grátis da cota, sem débito) → segue automático, por desenho: não há crédito em jogo.
//
// Módulo PURO (zero import fora de lib/durationByEngine, que também é puro): executado por
// scripts/test-sem-inicio-automatico-0211.mts.
import { nomePublicoDoMotor } from '@/lib/durationByEngine'

export const SEM_INICIO_AUTOMATICO_VERSION = 'sem_inicio_automatico_0211' as const
export const CARD_ENTRY_RESUME_CONFIRMED_EVENT = 'card_entry_resume_confirmed' as const
export const ACTIVATION_AUTOSTART_CONFIRMED_EVENT = 'activation_autostart_confirmed' as const
export const ACTIVATION_AUTOSTART_HELD_EVENT = 'activation_autostart_held_for_click' as const
export const START_MY_FILM_CTA = 'Start my film' as const

/**
 * Os defaults por plano (fetchCredits) podem mexer em motor/duração? Nunca quando a tela restaurou um pedido da pessoa
 * (card_entry / wall_v1) nem quando a URL trouxe um motor explícito. Restaurado vence tudo: é a escolha dela.
 */
export function defaultsDoPlanoPodemMexer(f: { escolhaRestaurada: boolean; motorExplicitoNaUrl: boolean }): boolean {
  if (f.escolhaRestaurada) return false
  if (f.motorExplicitoNaUrl) return false
  return true
}

export type EstadoDoPedidoRestaurado = 'nenhum' | 'aguardando_saldo' | 'sem_saldo' | 'pronto_para_clique'

/**
 * O que a tela faz com um pedido restaurado depois do checkout. NÃO EXISTE saída "disparar": o render só sai no clique
 * em "Start my film". `outOfCredits` é a MESMA guarda do botão Generate (o chamador passa o resultado dela).
 */
export function estadoDoPedidoRestaurado(f: {
  restaurado: boolean
  confirmado: boolean
  temTexto: boolean
  processando: boolean
  credits: number | null
  outOfCredits: boolean
}): EstadoDoPedidoRestaurado {
  if (!f.restaurado || f.confirmado || !f.temTexto || f.processando) return 'nenhum'
  if (f.credits === null) return 'aguardando_saldo'
  if (f.outOfCredits) return 'sem_saldo'
  return 'pronto_para_clique'
}

/**
 * O início automático (activation_autostart) precisa de clique? Sim sempre que o filme debita crédito (custo > 0,
 * inclusive do trial). Custo desconhecido também pede clique (falha segura: o custo de errar é o crédito da pessoa).
 * Custo 0 (cota grátis) segue automático, por desenho.
 */
export function inicioAutomaticoPedeClique(f: { custoCreditos: number | null | undefined; confirmado: boolean }): boolean {
  if (f.confirmado) return false
  if (typeof f.custoCreditos !== 'number' || !Number.isFinite(f.custoCreditos)) return true
  return f.custoCreditos > 0
}

/** Nome público do motor como a tela o escolheu (mode + aiEngine). */
export function motorDoPedido(mode: string | null | undefined, engine: string | null | undefined): string {
  if (mode === 'fast' || mode === 'creator') return 'Kineo 1'
  return nomePublicoDoMotor(engine)
}

/** "Seedance 1.5 · 35 s · 15 credits" — o resumo que fica ao lado do botão. */
export function resumoDoPedido(f: { mode: string | null | undefined; engine: string | null | undefined; duration: number; cost: number | null | undefined }): string {
  const custo = typeof f.cost !== 'number' || !Number.isFinite(f.cost)
    ? null
    : f.cost === 0 ? 'Free' : `${f.cost} credit${f.cost === 1 ? '' : 's'}`
  return [motorDoPedido(f.mode, f.engine), `${f.duration} s`, custo].filter(Boolean).join(' · ')
}
