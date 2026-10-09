// KINEO-S25-ABRE-2026-10-06 — QUEM USA o Seedance 2.5 (aposta A do fundador, 06/10: "motor pago extra" — quem procura
// "Seedance 2.5" acha a página e, para usar, precisa assinar).
//
// SÓ SERVIDOR. Importa app/api/admin/_shared/mrr.ts, que puxa a Stripe (lib/stripe): nunca importar de componente
// 'use client'. A tela recebe a decisão pronta na flag `s25Liberado` do /api/me/credits.
//
// A régua NÃO é redigitada aqui — é a do painel de pagantes da casa:
//   · isPayingPlan (app/api/admin/_shared/mrr.ts) = "paga mensalidade AGORA": starter/basic/creator/pro/studio/autopilot…
//     SEM *_trial. Por isso a cortesia (creator_trial/studio_trial, lib/courtesy.ts) e o trial de $1 ficam de fora, como o
//     fundador pediu ("*_trial de cortesia conta como não pagante");
//   · NÃO é isPayingProfile (lib/reverseTrial.ts): aquele conta *_trial e has_paid como pagante. has_paid vira true com
//     QUALQUER pacote avulso (o passe de US$4,99, o pacote de anúncios) — a mesma armadilha que a revisão do Studio Ads
//     achou em 24/09 (lib/ads/access.ts). Pacote avulso compra crédito, não assinatura;
//   · NÃO é treatAsPaid (getEffectiveEntitlement): aquele soma o trial reverso de cadastro, que é exatamente quem o 2.5
//     não atende.
// Conta da casa: só a lista EXATA do validador de $0 (isDryRunAccount, 3 e-mails do fundador), pelo e-mail do getUser —
// nunca o isInternalEmail largo ('test%', '%mailinator%' casam com estranhos que podem se cadastrar).
// Leitura do perfil que falhou chega aqui como plano nulo → não pagante: falha FECHADA.
//
// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — "pode abrir tudo para ele fazer o que ele quiser dentro" (fundador, 09/10): o PARCEIRO
// ATIVO (cortesia ativa + afiliado ativo) usa o 2.5 dentro dos créditos da cortesia. A regra continua PURA: quem lê o banco é
// lib/partnerAccess.ts, no servidor, e passa `partner: true`. A flag só vale em nível de cortesia (creator_trial/studio_trial):
// não abre conta grátis, plano ilegível nem o trial de $1. Sem a flag (undefined/false) = exatamente a régua de antes;
// isPayingPlan, MRR e "pagantes" não mudam (a cortesia segue não pagante).
import { isPayingPlan, isTrialPlan } from '@/app/api/admin/_shared/mrr'
import { isDryRunAccount } from '@/lib/cinematic/classicDryRun'
import { S25_PUBLIC, s25Visible } from '@/lib/engineLaunch'
import { isCourtesyLevel } from '@/lib/courtesy' // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — módulo puro

export type S25Access =
  | { allowed: true; reason: 'house' | 'paying_plan' | 'partner' }
  | { allowed: false; reason: 'trial_plan' | 'not_paying' }

/** O portão do 2.5 (modo público): a casa e quem paga um plano entram; *_trial e conta sem plano pago ficam de fora —
 *  menos o parceiro ativo em cortesia (KINEO-PARCEIRO-ABRE-TUDO-2026-10-09). */
export function s25AccessFor(conta: { email: string | null | undefined; plan: string | null | undefined; partner?: boolean }): S25Access {
  if (isDryRunAccount(conta.email)) return { allowed: true, reason: 'house' }
  if (isPayingPlan(conta.plan)) return { allowed: true, reason: 'paying_plan' }
  if (conta.partner === true && isCourtesyLevel((conta.plan ?? '').toString().trim().toLowerCase())) return { allowed: true, reason: 'partner' } // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09
  if (isTrialPlan(conta.plan)) return { allowed: false, reason: 'trial_plan' }
  return { allowed: false, reason: 'not_paying' }
}

/**
 * A flag da tela (/api/me/credits, catálogo do /clips): a MESMA composição que a rota do filme aplica.
 * S25_PUBLIC=true → o portão pago acima; S25_PUBLIC=false (canário) → a régua antiga, só a casa (s25Visible).
 * KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — `partner` = o parceiro ativo lido no servidor (lib/partnerAccess.ts).
 */
export function s25LiberadoNaTela(email: string | null | undefined, plan: string | null | undefined, partner?: boolean): boolean {
  return S25_PUBLIC ? s25AccessFor({ email, plan, partner }).allowed : s25Visible(email)
}
