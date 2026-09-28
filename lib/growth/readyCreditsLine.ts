// KINEO-SALDO-DO-MOTOR-USADO-2026-09-28 — a frase de saldo da tela "Your video
// is ready" (/studio/create), a que vem depois de "You have N credits left — ".
//
// O defeito (10 anúncios Kineo 1 de 28/09, conta Pro): a tela dividia o saldo
// pelo custo do Seedance 1.5 de 60 s, qualquer que fosse o motor que a pessoa
// ACABOU de usar (`videosForCredits(credits, 'cinematic_ai')`, uma função de
// copy de marketing com a duração presa em 60 s). Com 37 créditos a tela disse
// "about 1 more 60-second AI video" — o saldo pagava 12 Kineo 1 de 35 s. Com 22
// ou menos disse "not enough", parede falsa para quem ainda pagava 7.
//
// Regra agora: a conta sai do motor e da duração do filme que acabou de sair,
// com creditCostForDuration — a MESMA função que o servidor usa para cobrar —
// e o nome do motor sai de engineLabelFor. Nenhum número é digitado aqui.
//
// Conta grátis (sem plano pago, sem has_paid, sem trial ativo): crédito NÃO
// compra filme. O servidor recusa todo motor de IA para ela (reason
// trial_ended / plan_ai_engine) e o Kineo 1 grátis sai da COTA, a custo 0.
// Então a frase não conta filme nenhum: diz que o saldo vale num plano pago e
// repete a cota de OFFER.copy (semanal com a flag ligada, 24 h desligada) —
// nunca um literal "per month" / "3 per 24h" que envelhece quando a cota muda.
//
// Módulo puro: só importa engineCost e engineLabel, os dois sem import.
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { engineLabelFor } from '@/lib/engineLabel'

export interface ReadyCreditsLineInput {
  /** Saldo atual, já sem o filme que acabou de sair. */
  credits: number
  /** quality_mode do filme que acabou de sair (o mesmo do generate_completed). */
  quality: Quality
  /** Duração do filme em segundos (35/60/90) — a que o custo precifica. */
  seconds: number
  /** Espelho de isPaidAccount da tela: has_paid, trial ativo ou plano pago. */
  isPaidAccount: boolean
  /** Copy do plano grátis, lida de OFFER (useFreeTierOffer), nunca digitada. */
  freeOffer: { cardEntry: boolean; residual: string; chip: string }
  /** Cota grátis comprovadamente esgotada (freeFastQuotaSpent da tela). */
  freeQuotaSpent: boolean
}

const plural = (n: number, word: string): string => `${word}${n === 1 ? '' : 's'}`

// Motores cujo preço é creditCostForDuration(q, pago, s) e que têm nome
// público. Fora disso (avatar, tiers legados) a conta usa o Kineo 1, o motor
// mais barato — a frase nomeia o motor, então continua verdadeira.
function countableQuality(q: Quality): Quality {
  return (q === 'fast' || q.startsWith('cinematic_')) && engineLabelFor(q) ? q : 'fast'
}

/** O texto que vem depois de "You have N credits left — ". */
export function readyCreditsLine(input: ReadyCreditsLineInput): string {
  const { credits, seconds } = input
  if (input.isPaidAccount) {
    const q = countableQuality(input.quality)
    const label = engineLabelFor(q)
    const cost = creditCostForDuration(q, input.isPaidAccount, seconds)
    if (label && cost > 0) {
      if (credits >= cost) {
        const n = Math.floor(credits / cost)
        return `enough for about ${n} more ${seconds}s ${label} ${plural(n, 'video')} (${cost} ${plural(cost, 'credit')} each).`
      }
      const wall = `not enough for another ${seconds}s ${label} video (it takes ${cost}).`
      if (q === 'fast') return wall
      // A saída honesta quando o motor usado não cabe mais: o Kineo 1 na
      // mesma duração, se o saldo pagar (a frase antiga já apontava o Fast).
      const fastLabel = engineLabelFor('fast')
      const fastCost = creditCostForDuration('fast', input.isPaidAccount, seconds)
      if (!fastLabel || fastCost <= 0 || credits < fastCost) return wall
      const m = Math.floor(credits / fastCost)
      return `${wall} A ${seconds}s ${fastLabel} video takes ${fastCost} — enough for about ${m}.`
    }
  }
  if (input.freeOffer.cardEntry) return input.freeOffer.chip
  const usable = credits > 0 ? 'they work on any paid plan; ' : ''
  return input.freeQuotaSpent
    ? `${usable}your free quota (${input.freeOffer.residual}) is used for now.`
    : `${usable}the free plan includes ${input.freeOffer.residual}.`
}
