import type { CreationIntent } from '@/lib/creationHandoff'

export type ActivationRenderEngine = 'fast' | 'seedance'
type ActivationMode = 'fast' | 'cinematic_ai' | string

/**
 * Resolves the engine behind an explicit public creation handoff.
 *
 * `trial_best` is deliberately conditional: it may spend the full trial only
 * when the server-confirmed trial entitlement is active and the balance can
 * cover the canonical Seedance cost. Every uncertain or ineligible state
 * falls back to Fast, so this growth rail cannot manufacture a 402.
 */
export function resolveActivationRenderEngine(input: {
  createIntent: CreationIntent
  trialActive: boolean
  credits: number | null
  seedanceCreditCost: number
}): ActivationRenderEngine {
  if (
    input.createIntent === 'trial_best' &&
    input.trialActive === true &&
    typeof input.credits === 'number' &&
    Number.isFinite(input.credits) &&
    input.credits >= input.seedanceCreditCost
  ) {
    return 'seedance'
  }
  return 'fast'
}

/** One readiness predicate governs both the pre-analysis and pre-dispatch gates. */
export function activationRenderEngineIsReady(input: {
  engine: ActivationRenderEngine | null
  mode: ActivationMode
  aiEngine: string
}): boolean {
  if (input.engine === 'seedance') {
    return input.mode === 'cinematic_ai' && input.aiEngine === 'seedance'
  }
  return input.engine === 'fast' && input.mode === 'fast'
}

// ═══ KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b) — o auto-start escolhe MOTOR E DURAÇÃO juntos ═══════════════════════
// B1 do cético: o resolvedor antigo devolvia só o motor, e o disparo saía na duração do contrato (35 s por padrão, 15 cr)
// — com 10 cr de trial o Seedance levava 402. B5: `trial_best` exigia trial ativo, então quem ACABOU de pagar
// (checkout/success) caía no Kineo 1. M8: o 'none' precisa de saída explícita (o chamador faz consumeAndSkip).
// Regra, com a entrada nova ligada para a conta (`entrada15` = flag seedance15; lib/growth/entradaSeedance15.ts):
//   · trial ativo OU conta paga, saldo conhecido: Seedance na duração pedida se o saldo paga; senão o Seedance curto
//     (15 s) se o saldo paga ESSE; roteiro colado longo demais para 15 s vira modo IA a 15 s ('teaser', B2);
//   · nada cabe: Kineo 1 só para quem tem a flag kineo1 === true (legado); senão 'none' (nunca 'fast' para conta nova);
//   · 'fast' e 'trial_best' resolvem igual: o link público antigo com create_intent=fast cai no Seedance de 15 s.
// Com a entrada nova desligada, o resultado é o de antes (resolveActivationRenderEngine), só que o custo comparado é o
// da duração que VAI ser disparada (antes: o de 60 s fixo, que não era o do disparo).
// Módulo sem import de valor: o custo e o "roteiro cabe" chegam prontos do chamador (mesmas funções que cobram).

export type ActivationScriptMode = 'ai' | 'verbatim'

export type ActivationDecision =
  | {
      engine: ActivationRenderEngine
      duration: number
      scriptMode: ActivationScriptMode
      /** true = roteiro colado grande demais para o filme curto: modo IA a 15 s, como teaser do roteiro. */
      teaser: boolean
      reason: 'legacy' | 'seedance_requested' | 'seedance_short' | 'kineo1_legacy'
    }
  | {
      engine: 'none'
      duration: null
      scriptMode: null
      teaser: false
      reason: 'balance_unknown' | 'no_affordable_engine' | 'not_entitled'
    }

export function resolveActivationRender(input: {
  createIntent: CreationIntent
  trialActive: boolean
  hasPaid: boolean
  credits: number | null
  requestedDuration: number
  scriptMode: ActivationScriptMode
  /** Custo do Seedance 1.5 em N segundos — creditCostForDuration('cinematic_ai', true, N) no chamador. */
  seedanceCostAt: (seconds: number) => number
  /** A entrada nova existe para esta conta (flag seedance15). */
  entrada15: boolean
  /** Duração curta do Seedance (SEEDANCE_SHORT_SECONDS no chamador). */
  shortSeconds: number
  /** O roteiro cabe no filme curto (roteiroCabeNoFilmeCurto no chamador). */
  promptFitsShort: boolean
  /** Flag kineo1 (true = legado; false = não; null/undefined = não sei → nunca auto-dispara Kineo 1). */
  kineo1: boolean | null | undefined
}): ActivationDecision {
  if (!input.entrada15) {
    const engine = resolveActivationRenderEngine({
      createIntent: input.createIntent,
      trialActive: input.trialActive,
      credits: input.credits,
      seedanceCreditCost: input.seedanceCostAt(input.requestedDuration),
    })
    return { engine, duration: input.requestedDuration, scriptMode: input.scriptMode, teaser: false, reason: 'legacy' }
  }
  if (input.createIntent !== 'fast' && input.createIntent !== 'trial_best') {
    return { engine: 'none', duration: null, scriptMode: null, teaser: false, reason: 'not_entitled' }
  }
  const saldo = input.credits
  if (typeof saldo !== 'number' || !Number.isFinite(saldo)) {
    return { engine: 'none', duration: null, scriptMode: null, teaser: false, reason: 'balance_unknown' }
  }
  if (input.trialActive === true || input.hasPaid === true) {
    const pedido = input.seedanceCostAt(input.requestedDuration)
    if (Number.isFinite(pedido) && pedido > 0 && saldo >= pedido) {
      return { engine: 'seedance', duration: input.requestedDuration, scriptMode: input.scriptMode, teaser: false, reason: 'seedance_requested' }
    }
    const curto = input.seedanceCostAt(input.shortSeconds)
    if (input.requestedDuration > input.shortSeconds && Number.isFinite(curto) && curto > 0 && saldo >= curto) {
      const teaser = input.scriptMode === 'verbatim' && !input.promptFitsShort
      return { engine: 'seedance', duration: input.shortSeconds, scriptMode: teaser ? 'ai' : input.scriptMode, teaser, reason: 'seedance_short' }
    }
  }
  if (input.kineo1 === true) {
    return { engine: 'fast', duration: input.requestedDuration, scriptMode: input.scriptMode, teaser: false, reason: 'kineo1_legacy' }
  }
  return {
    engine: 'none',
    duration: null,
    scriptMode: null,
    teaser: false,
    reason: input.trialActive === true || input.hasPaid === true ? 'no_affordable_engine' : 'not_entitled',
  }
}
