// ═══ KINEO-CREDITO-PRESO-2026-09-03 (sprint-assinaturas #5) ═════════════════
//
// A DECISÃO PURA sobre um crédito que está preso num render que ainda não se
// resolveu. Mora aqui, fora da rota, por um motivo só: é a regra que decide
// QUAL FRASE 10 pessoas leram — e nenhuma delas voltou. Regra que decide
// destino de cliente tem que ser testável com os dados reais que a produziram.
//
// O QUE FOI MEDIDO (produção, `compose_refused` reason='credits_held_by_render',
// contas externas, 17/08 → 02/09):
//   · 16 recusas · 10 pessoas · 0 viraram filme em 24h · 8 das 10 nunca viram
//     um único filme da Kineo na vida;
//   · 16 de 16 débitos que seguravam o crédito foram estornados DEPOIS — ou
//     seja, a promessa "they come back automatically within the hour" era
//     literalmente verdadeira, e completamente inútil;
//   · a idade do débito que segurava, no instante da recusa: 0, 0, 1, 1, 2, 2,
//     2, 3, 3, 4, 10, 20, 40, 74 minutos. ONZE das dezesseis abaixo de 5 min.
//   · uma pessoa (ferruxezimzade) levou a MESMA parede 5 vezes em 84 segundos;
//   · 15 das 16 no Seedance 1.5 — um dos dois motores de 100% das primeiras
//     impressões.
//
// A leitura: na esmagadora maioria a pessoa NÃO tem um render morto segurando
// crédito. Ela tem um filme NO FORNO e clicou de novo. E a resposta que ela
// recebeu foi um erro de saldo com cara de paywall.
export const HOLD_IN_FLIGHT_MAX_AGE_MS = 12 * 60 * 1000

export type HoldSnapshot = {
  /** Créditos presos por débito sem entrega comprovada. */
  held: number
  /** Idade do débito MAIS NOVO que segura crédito. `null` = indatável. */
  newestAgeMs: number | null
}

export type HoldVerdict = {
  /** O crédito preso é EXATAMENTE o que fecha a conta deste filme. */
  explainsGap: boolean
  /** O render que segura ainda pode estar no forno (novo demais para ter morrido). */
  inFlight: boolean
  /** Idade em minutos, para a frase. Nunca 0 — "0 minutes ago" não é português nem inglês. */
  minutes: number | null
}

/**
 * ⚠️ `explainsGap` é a condição de sempre e NÃO foi afrouxada: o crédito preso
 * só desculpa a recusa quando, de volta, ele fecharia a conta. Se nem com ele
 * daria, a pessoa está sem saldo de verdade e merece a frase antiga.
 *
 * ⚠️ Idade indatável (`newestAgeMs === null`) NUNCA vira "no forno". O sentido
 * da falha importa: chamar de in-flight um render que já morreu faria a pessoa
 * esperar por um filme que não vem. Sem data, cai no caminho antigo.
 */
export function classifyHold(input: {
  hold: HoldSnapshot
  balance: number
  cost: number
}): HoldVerdict {
  const { hold, balance, cost } = input
  const held = Number.isFinite(hold.held) ? hold.held : 0
  const explainsGap = held > 0 && Number.isFinite(balance) && Number.isFinite(cost) && balance + held >= cost
  const age = hold.newestAgeMs
  const datable = typeof age === 'number' && Number.isFinite(age) && age >= 0
  const inFlight = explainsGap && datable && (age as number) < HOLD_IN_FLIGHT_MAX_AGE_MS
  return {
    explainsGap,
    inFlight,
    minutes: datable ? Math.max(1, Math.round((age as number) / 60000)) : null,
  }
}

/** A frase do filme no forno. Sem preço, sem plano, sem prazo inventado. */
export function inFlightMessage(minutes: number | null, credits: number): string {
  const quando = minutes === null ? 'a moment' : minutes === 1 ? '1 minute' : `${minutes} minutes`
  const cr = `${credits} credit${credits === 1 ? '' : 's'}`
  return `Your film from ${quando} ago is still being made — it is holding ${cr} until it lands. You do not need to start it again: it shows up in your library on its own, and we email you the link if you close this tab.`
}
