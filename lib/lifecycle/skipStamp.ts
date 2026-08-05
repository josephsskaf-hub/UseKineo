// KINEO-SKIP-STAMP-2026-08-05 — a coluna que tinha dois significados passa a ter um.
//
// O DEFEITO, MEDIDO EM PRODUÇÃO (05/08/2026)
// ──────────────────────────────────────────
// `eziafakaego2026@gmail.com` bateu no teto do plano free às 19:00Z — o sinal de
// compra mais quente do funil. O `send-cap-hit` das 19:45Z não mandou nada: ele
// foi suprimido por um `activation_nudge_sent_at` das 19:40:47Z.
//
// Só que esse carimbo NÃO foi um e-mail enviado. Foi um e-mail NÃO enviado: o
// `send-activation-nudge` tem uma guarda "já gerou vídeo? então já está ativado"
// que faz `skipped++` **e carimba a coluna assim mesmo**, para nunca reconsiderar
// a linha. Mas `lib/lifecycle/suppression.ts` lê a mesma coluna como prova de que
// a pessoa recebeu alguma coisa nas últimas 24h.
//
// Resultado líquido: 24 horas de silêncio para o lead mais quente do dia, por
// causa de uma mensagem que nunca existiu.
//
// A CLASSE DO DEFEITO
// ───────────────────
// Uma coluna com DOIS significados ("enviei" × "pulei") lida por outro sistema
// como se tivesse UM só. O padrão "carimbar no pulo" é a convenção da casa e está
// espalhado por vários jobs, então isto não era um caso isolado — era uma
// bomba-relógio que só esperava um job novo entrar na lista da supressão.
// Foi exatamente o que aconteceu quando o `cap_hit_sent_at` entrou.
//
// A CORREÇÃO, SEM MIGRATION
// ─────────────────────────
// O pulo passa a carimbar um instante IMPOSSÍVEL de ser um envio (a época Unix)
// em vez de `now()`. Com isso as três propriedades que precisamos convivem na
// mesma coluna, sem coluna nova e sem migration:
//
//   1. `.is(col, null)` continua FALSO para a linha pulada  → nunca reconsiderada,
//      que é a única coisa que o carimbo-de-pulo sempre quis dizer;
//   2. a janela de 24h da supressão nunca alcança 1970       → o pulo deixa de
//      calar os outros jobs;
//   3. quem olhar a coluna no banco vê `1970-01-01` e entende na hora que aquilo
//      é um pulo, não um envio. O significado fica legível, não implícito.
//
// ⚠️ REGRA 1 PARA QUEM VIER DEPOIS: carimbo de pulo só pode existir sobre atributo
// IRREVERSÍVEL (conta de teste, e-mail ausente, "já gerou um vídeo"). Sobre
// atributo REVERSÍVEL — plano pago e opt-out acima de todos — pular NÃO carimba
// nada, senão o dia em que a pessoa voltar para o free ela já nasce queimada para
// sempre. Custo de não carimbar: o job reavalia a linha nas próximas execuções, e
// isso é ZERO escrita — todas as coortes têm janela de tempo que as fecha sozinha.
//
// 🚫 REGRA 2, E ELA É UMA PROIBIÇÃO: **`credits_back_sent_at` NUNCA pode receber
// este sentinela.** Aquela coluna é a única do conjunto lida como JANELA
// (cooldown de 3 dias em `send-credits-back`), não como flag de "já processado":
//
//     const lastSent = parseTime(p.credits_back_sent_at)
//     if (lastSent > 0 && now - lastSent < CREDITS_BACK_COOLDOWN_MS) continue
//
// `Date.parse('1970-01-01T00:00:00.000Z')` é exatamente **0**, então `lastSent > 0`
// dá false e o sentinela fica INVISÍVEL para o cooldown. Carimbar um pulo ali
// transformaria "nunca mais" em "toda execução, para sempre" — e em silêncio.
// Hoje aquele job já pula sem carimbar nada, que é o certo. Mantenha assim.
//
// A distinção que decide: **coluna lida como FLAG aceita o sentinela; coluna lida
// como JANELA, não.** Antes de carimbar um pulo numa coluna nova, veja como ela é
// LIDA, não como ela se chama.

/**
 * Instante gravado em `profiles.*_sent_at` quando o job PULA alguém em vez de
 * enviar. É a época Unix: uma data que nenhum envio real pode ter, porque o
 * produto não existia.
 */
export const LIFECYCLE_SKIP_STAMP = '1970-01-01T00:00:00.000Z'

/**
 * Piso de sanidade. Qualquer carimbo anterior a esta data é pulo, não envio —
 * não só o sentinela exato. Assim um carimbo torto (`0001-01-01`, epoch 0 em
 * segundos, etc.) também erra para o lado certo: não cala ninguém.
 */
export const REAL_SEND_FLOOR_MS = Date.parse('2020-01-01T00:00:00.000Z')

/**
 * `true` só quando o carimbo representa um e-mail que REALMENTE saiu.
 * É isto que a supressão de 24h precisa saber — e o que ela lia errado.
 */
export function isRealSendStamp(whenMs: number): boolean {
  return whenMs >= REAL_SEND_FLOOR_MS
}
