// KINEO-LIFECYCLE-EMAIL-EVENTS-2026-09-06 — a lista canônica dos carimbos de
// e-mail que vivem na tabela `events`.
//
// POR QUE ESTE ARQUIVO EXISTE
// ───────────────────────────
// A casa tem duas gerações de carimbo de envio e elas nunca se falaram:
//
//   · CARIMBO EM COLUNA (`profiles.*_sent_at`) — a geração antiga. É o que
//     `lib/lifecycle/suppression.ts` sempre leu.
//   · CARIMBO EM EVENTO (`events.name = '*_emailed_v1'`, `'*_sent'`) — a
//     geração nova, que TODA campanha de admin usa porque não exige migração.
//
// A supressão de 24h só conhecia a primeira. Medido em produção em 06/09,
// janela de 7 dias: **70 pares** de e-mails de ciclo de vida para a MESMA
// pessoa dentro de 30 minutos, **42 pessoas distintas**, intervalo mínimo
// **0,0 minuto** (mesmo instante). As combinações dominantes envolviam
// `stranded_ready_sent` e `video_ready_email_sent` — dois carimbos que só
// existem aqui, em `events`, e portanto eram invisíveis para a trava.
//
// Medido na janela de 24h do dia da correção: 215 pessoas tinham e-mail
// registrado por evento, 182 já eram visíveis pelas quatro fontes antigas, e
// **59 eram novas** — gente que a supressão tratava como "nunca recebeu nada".
//
// ⚠️ A REGRA QUE ESTA LISTA CARREGA (é a mesma de PROFILE_TIMESTAMP_COLUMNS):
// campanha nova que grava carimbo em `events` entra AQUI no mesmo commit em
// que nasce. Enquanto não entrar, ela é invisível para todas as outras e a
// pessoa recebe dois e-mails nossos com minutos de diferença.
//
// O QUE **NÃO** ENTRA AQUI: evento que registra intenção, tentativa, pulo ou
// clique. Só entra nome que significa "uma mensagem saiu para esta pessoa".
// `episode_link_clicked`, `season_shown`, `season_written` e afins são leitura
// do cliente, não envio — colocar um deles aqui calaria a casa por 24h porque
// alguém ABRIU um e-mail.
//
// Conferido contra a tabela `events` em produção em 06/09 (varredura por
// `name like '%emailed%' or name like '%_sent'`): nome inventado aqui não
// quebra nada — só não casa com linha nenhuma —, mas nome FALTANDO é um par
// de e-mails em 30 minutos.

/**
 * Nomes de `events.name` que significam "um e-mail de ciclo de vida saiu para
 * este usuário". Lido por `loadLifecycleSuppression` como quinta fonte.
 */
export const LIFECYCLE_EMAIL_EVENT_NAMES = [
  // ── campanhas de admin (carimbo `*_emailed_v1`) ──────────────────────────
  'season_letter_emailed_v1',
  'next_episode_wall_emailed_v1',
  'checkout_recovery_emailed_v1',
  'checkout_rescue_emailed_v1',
  'made_video_today_emailed_v1',
  'comeback50_emailed_v1',
  'india_price_emailed_v1',
  'hotlead_emailed_v1',
  'hotlead_emailed_v2',
  'day19_creator20_emailed_v1',
  'first50_quentes_emailed_v1',
  'checkout30_emailed_v1',
  'oneoff_unlock_emailed',
  'hot_upsell_sent',
  'winback25_sent',
  'comeback50_sent',
  'blackout_winback_sent',
  // ── crons de ciclo de vida (carimbo `*_sent`) ────────────────────────────
  // Vários destes TAMBÉM têm coluna datada em `profiles` e já eram visíveis
  // por lá. Repetir aqui é de propósito e é barato: a fonte de `events` é
  // append-only e sobrevive ao dia em que um job apaga o próprio carimbo para
  // se rearmar (foi exatamente assim que o `downgraded_loss` escapou em 04/09).
  'video_ready_email_sent',
  'video_ready_nudge_sent',
  'trial_lifecycle_email_sent',
  'post_nudge_sent',
  'momentum_nudge_sent',
  'failure_recovery_sent',
  'stranded_ready_sent',
  'stranded_fast_ready_sent',
  'stranded_rescue_sent',
  'video_rescue_sent',
  'cap_hit_sent',
  'credits_back_sent',
  'trial_eve_notice_sent',
  // Nao e cron nosso: sai de dentro do webhook da Stripe (trial_will_end), e
  // avisa que o cartao vai ser cobrado. E o e-mail mais sensivel da casa para
  // colidir com um nudge de venda no mesmo dia.
  'card_trial_ending_emailed',
] as const

export type LifecycleEmailEventName = (typeof LIFECYCLE_EMAIL_EVENT_NAMES)[number]
