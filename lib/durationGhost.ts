// ═══ sprint-v1v4 #20 (2026-08-31) — O ALVO FANTASMA DE 45 SEGUNDOS ═══════════
//
// O QUE FOI MEDIDO (14 dias, so pessoas externas, tabela `events`):
// 15 recusas `narration_too_short`, TODAS em `/studio/create`, TODAS http 422.
// Em ONZE delas o alvo era **45 segundos** — e o seletor de duracao do produto
// tem tres botoes: **35, 60 e 90**. O 45 saiu da lista em 20/08.
//
//   speech=42s target=45s   <- faltavam TRES segundos
//   speech=38s target=45s   x3
//   speech=37s target=45s
//   speech=36s target=45s
//   speech=35s target=45s
//   speech=34s target=45s
//   speech=32s target=45s
//   speech=31s target=45s
//
// TODOS esses roteiros ENCHEM 35 SEGUNDOS sem escrever mais uma palavra.
// A pessoa foi recusada por nao alcancar um numero que **ela nunca escolheu**.
//
// POR ONDE O FANTASMA ENTRA (a #11 fechou a porta certa, mas sobraram duas):
// a #11 corrigiu o `DEFAULT_DURATION` do cliente. Continuam abertas:
//   1. `GenerateClient.tsx:6997` aceita `?duration=45` na allowlist da URL;
//   2. `app/scripts/[vertical]/page.tsx:85` faz o handoff com `duration: 45`,
//      e a propria pagina escreve que abre "the closest supported preset
//      (45 seconds)" — 45 nao e preset nenhum desde 20/08.
// Nenhuma das duas e territorio desta rodada (a 1a e zona compartilhada com o
// Codex, a 2a e a pista de SEO dele). Entao a trava vem para o SERVIDOR, que e
// meu e e o ultimo ponto antes da recusa.
//
// A REGRA, e por que ela NAO e "afrouxar o guard":
// O guard de narracao existe para impedir video com silencio pago (Contrato
// C2, piso de 95%). Ele continua inteiro. O que muda e uma pergunta que o
// servidor nunca fez antes de recusar:
//
//     "o alvo contra o qual eu estou medindo e um alvo que o produto OFERECE?"
//
// Se NAO e — se e um numero que nenhum botao da tela consegue selecionar —
// entao o alvo nao foi escolha da pessoa, foi residuo de URL. Medir o roteiro
// dela contra um residuo e recusar em cima disso e o defeito. Nesse caso o
// servidor troca o alvo pela maior duracao REAL que a narracao enche e segue.
//
// (!) ISTO NAO MEXE EM PRECO, CREDITO NEM PLANO. Verificado antes de escrever:
// `lib/credits/engineCost.ts` nao contem a palavra `duration` — o custo e por
// MOTOR, nunca por segundo. Trocar 45 por 35 nao tira nem devolve um credito.
//
// (!) E UM RESGATE, NUNCA UMA REESCRITA. A troca so acontece no caminho que ia
// terminar em 422. Quem manda 45 com roteiro que ENCHE 45 continua recebendo
// exatamente o video de 45 segundos que pediu: `deveResgatar` devolve null
// sempre que o fit passou. Zero regressao para quem ja era atendido.

/** Duracao fantasma: chegou ao servidor mas nenhum botao da tela a seleciona. */
export function ehAlvoFantasma(
  alvo: unknown,
  oferecidas: readonly number[],
): boolean {
  const n = Number(alvo)
  if (!Number.isFinite(n) || n <= 0) return false
  if (!oferecidas || oferecidas.length === 0) return false
  return !oferecidas.includes(n)
}

export type Resgate = {
  /** Duracao que passa a valer — sempre uma das oferecidas pelo seletor. */
  alvo: number
  /** Duracao fantasma que foi descartada (vai para a telemetria). */
  fantasma: number
  /** Segundos de fala que motivaram a escolha. */
  fala: number
}

/**
 * Decide se uma recusa por narracao curta e, na verdade, um alvo fantasma.
 *
 * Devolve `null` — ou seja, MANTEM a recusa — em todos os casos honestos:
 *  . o roteiro encheu o alvo (`fitOk`);
 *  . o alvo e uma duracao que o produto realmente oferece (a pessoa escolheu);
 *  . nenhuma duracao oferecida cabe na fala (roteiro curto de verdade);
 *  . a duracao de resgate seria MAIOR que o fantasma (resgatar para cima seria
 *    tornar a parede mais alta, nao menor);
 *  . numeros impossiveis (NaN, negativo, infinito).
 */
export function deveResgatar(args: {
  fitOk: boolean
  alvoPedido: unknown
  falaSegundos: unknown
  oferecidas: readonly number[]
  maiorQueCabe: number | null | undefined
}): Resgate | null {
  const { fitOk, oferecidas } = args
  if (fitOk) return null
  if (!oferecidas || oferecidas.length === 0) return null

  const fantasma = Number(args.alvoPedido)
  if (!Number.isFinite(fantasma) || fantasma <= 0) return null
  if (!ehAlvoFantasma(fantasma, oferecidas)) return null

  const fala = Number(args.falaSegundos)
  if (!Number.isFinite(fala) || fala <= 0) return null

  const alvo = Number(args.maiorQueCabe)
  if (!Number.isFinite(alvo) || alvo <= 0) return null
  if (!oferecidas.includes(alvo)) return null
  // Resgatar para cima deixaria a parede MAIS alta. Nunca.
  if (alvo >= fantasma) return null

  return { alvo, fantasma, fala: Math.round(fala) }
}
