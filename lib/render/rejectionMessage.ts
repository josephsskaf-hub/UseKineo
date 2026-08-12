/**
 * KINEO-REJECTION-COPY-2026-08-12 — a frase que a pessoa lê no instante exato
 * em que o produto falha por culpa nossa.
 *
 * A anterior era `'Render service rejected the job. Please try again.'`,
 * escrita em TRÊS lugares (`compose`, o ramo Hollywood do mesmo arquivo, e
 * `compose/unlock`). Dois problemas, e o segundo é o caro:
 *
 * 1. "Render service rejected the job" descreve o incidente do ponto de vista
 *    do NOSSO log. Quem lê é alguém que acabou de escrever um tópico e não faz
 *    ideia do que é um "render service" — a leitura natural é "rejeitaram o
 *    meu vídeo", que é exatamente o oposto do que aconteceu.
 * 2. "Please try again" é, num apagão de fornecedor, o conselho errado repetido
 *    com autoridade. Medido no apagão de 09–10/08: 22 contas em trial tentaram
 *    até 8 vezes cada, nenhuma conseguiu, e 21 delas nunca mais voltaram — a
 *    tela pedia persistência contra uma parede, sem uma palavra sobre de quem
 *    era a culpa.
 *
 * O QUE A FRASE NOVA PODE AFIRMAR:
 *   · "on our side" — este texto só sai com HTTP 502, resposta que a nossa
 *     rota emite quando o provedor recusa. 5xx é nosso por definição (a mesma
 *     regra de `lib/lifecycle/ourFailure.ts`, e de propósito: a tela e o e-mail
 *     que pede desculpa por ela têm de dizer a MESMA coisa).
 *   · "not your topic" — a recusa acontece depois do roteiro pronto, na
 *     submissão do render. Nenhuma escolha do usuário a evita.
 *   · NÃO promete e-mail de recuperação. `send-blackout-winback` existe para
 *     isso e teve ZERO envios no apagão de 30 horas (o símbolo que ele procura
 *     só passou a ser escrito depois do fim). Prometer aqui um e-mail que a
 *     coorte anterior não recebeu seria uma dívida assinada na tela.
 *   · NÃO diz "we're on it": os dois call sites de `compose` disparam
 *     `alertCreatomateDown`, mas o de `compose/unlock` NÃO — e uma frase única
 *     em três lugares só pode afirmar o que vale nos três. (Que o `unlock`
 *     recusa em silêncio está registrado como dívida no doc da sprint.)
 *
 * O sufixo de estorno continua sendo montado pelo call site: só ele sabe se
 * houve devolução e de quanto.
 */
export const RENDER_REJECTED_MESSAGE =
  "That one failed on our side, not on your topic — our render provider turned the job down. Nothing you change in the script will fix it; give it a few minutes and try again."
