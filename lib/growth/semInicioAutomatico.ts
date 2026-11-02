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
//      Agora a volta do checkout (card_entry e wall_v1) mostra o pedido restaurado (motor · duração · custo) e um botão
//      "Start my film"; o render só sai no clique. O cartão fecha, o rascunho sai, a URL perde o ?resume= e
//      card_entry_resume_confirmed é gravado só quando o despacho é ACEITO (despachoAceito); recusa = cartão e rascunho
//      ficam. O card_entry_resume_autostart deixa de existir.
//   2. 35 → 60: o fetchCredits do /generate aplica os DEFAULTS POR PLANO quando o saldo chega (assíncrono, ~2 s depois
//      da montagem). Com a entrada nova do Seedance (seedance15Ok && !kineo1NoPlano) o ramo `entradaNoPlano` chamava
//      duracaoDaUrlNaEntrada() — sem ?duration na URL do resume, ela devolve duracaoDeEntrada(saldo) = a MAIOR duração
//      que o saldo paga. Creator recém-pago (centenas de créditos) → 60. Esse setDuration(60) caía DEPOIS do
//      setDuration(35) da restauração e no MESMO lote do setCredits — e o efeito do autostart via credits≠null com 60.
//      Regra nova: escolha restaurada (card_entry / wall_v1) vence os defaults do plano, sempre — motor e duração.
//
// FORA DO ESCOPO (decisão de 02/11, 2ª leva): o início automático do 1º filme do trial (activation_autostart, o
// create_intent das páginas públicas, do um-clique do Studio e dos e-mails do trial) fica EXATAMENTE como na origin/main.
//
// Módulo PURO (só importa lib/engineLabel, que também é puro): executado por scripts/test-sem-inicio-automatico-0211.mts.
import { engineLabelFor } from '@/lib/engineLabel'

export const SEM_INICIO_AUTOMATICO_VERSION = 'sem_inicio_automatico_0211' as const
export const CARD_ENTRY_RESUME_CONFIRMED_EVENT = 'card_entry_resume_confirmed' as const
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
 * 'aguardando_saldo' é só cópia: o botão continua clicável (a guarda de sempre e o servidor decidem).
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
 * O despacho foi ACEITO? Fases em que o servidor já aceitou o trabalho (polling no fornecedor, clipes prontos, montagem,
 * entrega). 'generating' ainda pode voltar recusado (402/409/422) — não conta. Só aqui o pedido restaurado é consumido.
 */
export const FASES_DE_DESPACHO_ACEITO = ['fal_polling', 'avatar_polling', 'clips_ready', 'composing', 'done'] as const
export function despachoAceito(phase: string | null | undefined): boolean {
  return (FASES_DE_DESPACHO_ACEITO as readonly string[]).includes(String(phase ?? ''))
}

// O quality_mode que cada escolha da tela despacha — a mesma tabela do selectedCost do GenerateClient.
const QUALITY_DO_MOTOR: Record<string, string> = {
  seedance: 'cinematic_ai', kling: 'cinematic_kling', veo: 'cinematic_veo', sora: 'cinematic_sora',
  hollywood: 'cinematic_hollywood', h3: 'cinematic_h3', h3max: 'cinematic_h3max', omni: 'cinematic_omni', s25: 'cinematic_s25',
}

/**
 * Nome público do motor como a tela vai despachar — SELO HONESTO: sai do mapa único lib/engineLabel.ts; a estrada
 * hollywood vira "Kling 4.0" quando o Kling 4 pago está no ar (a mesma condição do custo e do kling4_expected_engine).
 */
export function motorDoPedido(mode: string | null | undefined, engine: string | null | undefined, kling4PaidLive = false): string | null {
  if (mode === 'fast' || mode === 'creator') return engineLabelFor('fast')
  if (mode !== 'cinematic_ai') return engineLabelFor(mode ?? null)
  const e = String(engine ?? 'seedance')
  if (e === 'hollywood') return engineLabelFor(null, kling4PaidLive ? 'kling4' : 'kling3')
  return engineLabelFor(QUALITY_DO_MOTOR[e] ?? null)
}

/** "Seedance 1.5 · 35 s · 15 credits" — o resumo que fica ao lado do botão. */
export function resumoDoPedido(f: { mode: string | null | undefined; engine: string | null | undefined; duration: number; cost: number | null | undefined; kling4PaidLive?: boolean }): string {
  const custo = typeof f.cost !== 'number' || !Number.isFinite(f.cost)
    ? null
    : f.cost === 0 ? 'Free' : `${f.cost} credit${f.cost === 1 ? '' : 's'}`
  return [motorDoPedido(f.mode, f.engine, f.kling4PaidLive === true), `${f.duration} s`, custo].filter(Boolean).join(' · ')
}
