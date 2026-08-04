// lib/postToEarn.ts — KINEO-POST-TO-EARN-2026-08-04
//
// AS REGRAS do Post to Earn, em um só lugar, SEM nenhuma dependência.
//
// Este arquivo é client-safe de propósito: ele não importa Supabase, não lê
// env e não toca em rede. O motor que concede o crédito é
// lib/postToEarnGrant.ts (server-only). A separação existe por um motivo
// prático e um contratual:
//
//   · prático — os três componentes que anunciam a regra ao usuário
//     (components/wall/WallSubmitLink.tsx e o bloco "Published it?" do
//     GenerateClient) são client components. Se importassem o motor,
//     arrastariam o SDK do Supabase para o bundle do browser.
//   · contratual — a promessa exibida na tela ("3 credits, up to 2 per week")
//     e a regra que o servidor executa passam a ler A MESMA constante. Um
//     número não pode mais divergir do outro por esquecimento, que é
//     exatamente como um programa de recompensa vira reclamação de suporte.
//
// ⚠️ Mexer nos números daqui é mexer em CUSTO REAL. Ver o cálculo de
// exposição máxima no rodapé.

/** Créditos por Short publicado e validado. 3 ≈ 1 dia de uso free (~$0.30). */
export const POST_TO_EARN_CREDITS = 3

/** Máximo de recompensas por usuário dentro da janela rolante. */
export const POST_TO_EARN_MAX_PER_WINDOW = 2

/** Tamanho da janela rolante, em dias. Rolante — não "por semana civil": um
 *  reset no domingo criaria a corrida de colar 2 no sábado e 2 no domingo. */
export const POST_TO_EARN_WINDOW_DAYS = 7

/** Teto VITALÍCIO por usuário, em créditos. Atingido, para de recompensar e
 *  loga. 30 créditos = 10 Shorts = ~5 semanas no ritmo máximo. */
export const POST_TO_EARN_LIFETIME_CREDIT_CAP = 30

/** Teto GLOBAL diário, em créditos, somando todos os usuários. É o disjuntor:
 *  se uma fazenda de contas achar um furo que os outros limites não pegaram,
 *  o prejuízo do dia inteiro para em ~$10 e aparece no log. */
export const POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP = 100

/** Veredito de uma tentativa de recompensa. Cada motivo tem UMA mensagem
 *  específica — "não deu" genérico é o que faz o usuário achar que foi roubado. */
export type PostToEarnReason =
  | 'granted'
  | 'not_public'
  | 'no_video_yet'
  | 'already_claimed'
  | 'weekly_cap'
  | 'lifetime_cap'
  | 'global_cap'
  | 'unavailable'

export type PostToEarnResult = {
  granted: boolean
  /** Créditos concedidos NESTA requisição. 0 quando não houve concessão. */
  credits: number
  reason: PostToEarnReason
  /** Quantas recompensas ainda cabem na janela do usuário. */
  remainingThisWeek: number
  /** Mensagem pronta para exibir. Nunca vaga, nunca acusatória. */
  message: string
}

/** A promessa, ANTES de colar. Mesma frase no /wall e no /generate. */
export const POST_TO_EARN_PITCH = `Publish your Short with our watermark, paste the link, get ${POST_TO_EARN_CREDITS} credits — up to ${POST_TO_EARN_MAX_PER_WINDOW} per week.`

/**
 * Mensagem para cada desfecho.
 *
 * Regra de redação: dizer o que aconteceu, por que, e o que fazer a seguir.
 * O caso `already_claimed` é o mais delicado — o dedupe é GLOBAL, então um
 * usuário honesto pode topar com ele ao recolar o próprio link. A frase
 * assume boa-fé e não insinua fraude.
 */
export function postToEarnMessage(reason: PostToEarnReason, credits: number): string {
  switch (reason) {
    case 'granted':
      return `+${credits} credits added. Thanks for repping Kineo.`
    case 'not_public':
      return "We couldn't open that video on YouTube. Make sure it's published and public, then paste the link again."
    case 'no_video_yet':
      return 'Make your first video with Kineo to unlock credit rewards. Your link is saved either way.'
    case 'already_claimed':
      return 'This Short was already credited. Each video pays once — paste a new one to earn again.'
    case 'weekly_cap':
      return `You've hit ${POST_TO_EARN_MAX_PER_WINDOW} rewarded links this week. Your Short is on the wall — come back in a few days for more credits.`
    case 'lifetime_cap':
      return `You've earned the maximum ${POST_TO_EARN_LIFETIME_CREDIT_CAP} credits from posting. Your Short still counts on the wall.`
    case 'global_cap':
      return "Rewards are paused for today — we hit our daily limit. Your link is saved and you can try again tomorrow."
    case 'unavailable':
      return "Your link is saved. We couldn't check the reward right now — try pasting it again later."
    default:
      return 'Your link is saved.'
  }
}

// ── EXPOSIÇÃO MÁXIMA DE CUSTO (a conta que autoriza este loop) ──────────────
//
// Por usuário, para sempre:   POST_TO_EARN_LIFETIME_CREDIT_CAP = 30 créditos
//                             ≈ 10 Shorts recompensados ≈ ~$3.00
// Por usuário, por semana:    2 × 3 = 6 créditos ≈ ~$0.60
// Global, por dia:            POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP = 100
//                             créditos ≈ ~$10.00, aconteça o que acontecer
// Global, por mês (pior caso do disjuntor): ~$300 — e nesse cenário o produto
// teria ganhado ~1.000 Shorts publicados carregando a marca d'água no mês.
