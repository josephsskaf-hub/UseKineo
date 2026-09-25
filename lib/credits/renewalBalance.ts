// ═══ KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25 — decisão do fundador ("conserta a renovação", 25/09) ═══
// Até hoje a renovação fazia SET: o saldo virava o crédito do plano, apagando o que a pessoa COMPROU avulso (barra de
// 50-2.000, packs, passe do Studio Ads) e o que a casa deu (admin_credits_granted). A promessa "credits never expire",
// escrita em 6 lugares do site e dos e-mails, era falsa (achado da Research, 25/09; confirmado no webhook, linha
// "renewal credits are SET (not added)"). Ninguém foi atingido ainda (2 compras avulsas, 0 seguidas de renovação),
// mas a barra passou a vender até 2.000 créditos a assinantes em 23/09.
//
// REGRA: o que passa de UMA cota do plano no momento da renovação é crédito comprado/dado e SOBREVIVE; a cota do
// plano continua zerando (sem rollover de mês para mês, como o fundador decidiu em KINEO-STUDIO-400).
//   saldo_novo = cota + max(0, saldo_atual − cota)
//   · só plano, sobrou 150 de 150 → 150 (sem rollover)   · só plano, sobrou 40 → 150
//   · comprou 1.000 e não gastou (1.150) → 1.150          · comprou 1.000 e gastou 100 (1.050) → 1.050
// A régua é uma cota: tudo acima dela sobrevive. Quem comprou nunca perde o comprado; só a sobra da cota do mês zera.
// Os três pontos que renovam (webhook da Stripe, recarga mensal do anual, PayPal) leem daqui. Sem rede, sem banco.
export const RENEWAL_CARRY_VERSION = 'renovacao_preserva_comprado_v1_20260925'

export interface RenewalBalance {
  /** saldo depois da renovação */
  balance: number
  /** quanto sobreviveu da renovação (crédito comprado/dado acima de uma cota) */
  carried: number
  /** cota do plano concedida nesta renovação */
  grant: number
}

export function renewalBalance(currentBalance: unknown, grant: number): RenewalBalance {
  const cota = Number.isFinite(grant) ? Math.max(0, Math.floor(grant)) : 0
  const atual = Number.isFinite(Number(currentBalance)) ? Math.max(0, Math.floor(Number(currentBalance))) : 0
  const carried = Math.max(0, atual - cota)
  return { balance: cota + carried, carried, grant: cota }
}
