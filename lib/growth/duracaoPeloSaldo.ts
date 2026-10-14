// KINEO-STUDIO-DURACAO-SALDO-1510 — o Studio abre (e se mantém) na duração que o saldo PAGA, antes do clique.
// Fundador 15/10 ("tudo sim" nas jogadas de venda; consertos valem mesmo com o produto congelado).
//
// O DEFEITO (medido, 7 d): 9 de 22 contas no teste com 10 cr bateram em wall_before_script com Seedance de 35/60 s, e
// contas da região (14 cr) apertaram Gerar e ficaram sem filme — quando o MESMO saldo paga o filme de 15 s do Seedance 1.5.
// A régua de entrada do /studio (lib/growth/entradaSeedance15.ts duracaoDeEntrada) rodava UMA vez, na chegada do saldo; a
// duração que entrava DEPOIS (a ?duration= de um router.push — o atalho do ChatGPT manda duration=60/35 — ou a troca de
// motor) passava por cima e a pessoa só descobria no clique (parede ou prévia de cenas).
//
// O CONSERTO (só tela, nenhum preço muda): enquanto a pessoa NÃO escolheu a duração com a mão, a duração do seletor desce
// para a MAIOR do mesmo motor que o saldo paga — na chegada, quando o saldo chega, quando o motor muda e quando a URL troca
// a duração. Uma nota honesta diz o porquê ("Your free film is 15 s — longer films need a plan") e o caminho do plano
// continua na tela. Escolha explícita (clique no botão de duração ou no degrau do seletor) é respeitada: se ela pedir de novo
// a duração longa, a parede de sempre aparece. Nunca SOBE (subir cobraria mais); só desce quando a duração atual não cabe.
// Conta que paga (ou que ainda não sabemos se paga) fica exatamente como antes.
//
// MÓDULO PURO, SEM IMPORT: o guardião scripts/test-studio-duracao-saldo-1510.mjs o executa com o transpilador. O custo
// entra como argumento — a tela passa creditCostForDuration (a função que COBRA), na qualidade do motor.

export const DURACAO_PELO_SALDO_VERSION = 'studio_duracao_saldo_v1' as const
/** Evento do cliente quando o Studio desce a duração sozinho (de → para, saldo, motivo). */
export const DURACAO_PELO_SALDO_EVENT = 'studio_duration_fit_to_balance' as const

export type DuracaoPeloSaldoMotivo =
  | 'fit'
  | 'explicit'
  | 'paid_or_unknown'
  | 'balance_unknown'
  | 'balance_pays'
  | 'nothing_shorter_fits'

export interface DuracaoPeloSaldo {
  /** A duração que o seletor deve mostrar (igual à atual quando não muda). */
  duracao: number
  mudou: boolean
  motivo: DuracaoPeloSaldoMotivo
  /** A duração que estava no seletor. */
  de: number
  custoDe: number | null
  custoPara: number | null
}

/**
 * Desce a duração do seletor para a maior do MESMO motor que o saldo paga? Só quando TODAS valem: a pessoa não escolheu a
 * duração com a mão (escolhaExplicita false), a conta comprovadamente NÃO paga (paga === false; desconhecido fica), o saldo
 * é conhecido, o custo da duração atual passa do saldo, e alguma duração MENOR das opções do motor cabe. Nunca sobe.
 */
export function duracaoQueOSaldoPaga(f: {
  atual: number
  /** As durações que o seletor oferece PARA ESTE MOTOR (o 15 s do Seedance só quando o botão existe). */
  opcoes: readonly number[]
  saldo: number | null | undefined
  paga: boolean | null | undefined
  escolhaExplicita: boolean
  custo: (segundos: number) => number
}): DuracaoPeloSaldo {
  const de = f.atual
  const fica = (motivo: DuracaoPeloSaldoMotivo, custoDe: number | null = null): DuracaoPeloSaldo =>
    ({ duracao: de, mudou: false, motivo, de, custoDe, custoPara: null })
  if (f.escolhaExplicita) return fica('explicit')
  if (f.paga !== false) return fica('paid_or_unknown')
  if (typeof f.saldo !== 'number' || !Number.isFinite(f.saldo)) return fica('balance_unknown')
  const custoDe = f.custo(de)
  if (!Number.isFinite(custoDe) || custoDe <= 0 || custoDe <= f.saldo) return fica('balance_pays', Number.isFinite(custoDe) ? custoDe : null)
  const menores = [...new Set(f.opcoes)].filter((d) => Number.isFinite(d) && d > 0 && d < de).sort((a, b) => b - a)
  for (const d of menores) {
    const c = f.custo(d)
    if (Number.isFinite(c) && c > 0 && c <= f.saldo) return { duracao: d, mudou: true, motivo: 'fit', de, custoDe, custoPara: c }
  }
  return fica('nothing_shorter_fits', custoDe)
}

/** A nota honesta ao lado do seletor depois da descida. O filme curto do Seedance é "o filme grátis"; nos outros, a conta. */
export function notaDaDuracaoPeloSaldo(f: { engine: string; para: number; saldo: number; segundosDoFilmeGratis: number }): string {
  if (f.engine === 'seedance' && f.para === f.segundosDoFilmeGratis) return `Your free film is ${f.para} s — longer films need a plan.`
  return `Set to ${f.para} s — the longest your ${f.saldo} credits pay. Longer films need a plan.`
}
