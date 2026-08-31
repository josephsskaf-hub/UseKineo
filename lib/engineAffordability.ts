// ═══ sprint-v1v4 #13 (2026-08-31) ════════════════════════════════════════════
// O CARDÁPIO DE MOTORES NÃO SABE QUANTO A PESSOA TEM NO BOLSO.
//
// O seletor de DURAÇÃO já aprendeu isso na #11/KINEO-CUSTO-VISIVEL: a opção que
// não cabe nasce apagada e vem com um botão de desvio ("Make it 35s"). O
// seletor de MOTOR não aprendeu. Ele desenha `150 cr` num chip azul idêntico
// para quem tem 500 créditos e para quem tem 25.
//
// O QUE A PRODUÇÃO DIZ (14 dias, só pessoas externas, `compose_refused` com
// `trial_credits_stalled` + `generation_stage_error` com
// `cinematic_gate_trial_stalled` — 21 recusas, 14 pessoas):
//
//   motor      precisava  saldo      cabia alguma coisa?
//   hollywood     150       62       sim — H3 a 60s (45)
//   kling          50       25       sim — Seedance a 35s (15)
//   kling          38       25       sim — Seedance a 35s (15)
//   h3             45       25       sim — Seedance a 60s (25, exato)
//   h3             27       25       sim — Seedance a 35s (15)
//   seedance    20..38     9..25     sim, em quase todas — a 35s custa 15
//
// EM NENHUMA DELAS A PESSOA ESTAVA SEM SALDO. Em todas existia uma combinação
// (motor × duração) que o saldo pagava — e a tela nunca a ofereceu. A pessoa
// escolheu a câmera cara, escreveu o roteiro inteiro, apertou Generate, e SÓ
// ENTÃO leu a recusa. É o clique mais caro do funil: acontece DEPOIS do
// trabalho, não antes.
//
// A conta de um trial de 25 créditos, hoje, no card "Cinematic AI":
//   35s → Seedance 15 ✓ · H3 27 ✗ · Kling 30 ✗ · Veo 59 ✗ · Kling 3 88 ✗
//   60s → Seedance 25 ✓ · H3 45 ✗ · Kling 50 ✗ · Veo 100 ✗ · Kling 3 150 ✗
// Ou seja: das 15 combinações desenhadas, ela alcança DUAS — e as 13 outras
// estão pintadas exatamente igual às duas.
//
// ⚠️ FRONTEIRA COM O CODEX: este arquivo não sabe o que é plano, preço, oferta,
// cupom ou upgrade. Ele só compara DOIS NÚMEROS que já estão na tela — o custo
// em créditos (que vem de lib/credits/engineCost, a MESMA função que o servidor
// usa para cobrar) e o saldo. Nenhuma string de dólar, nenhum SKU, nenhuma
// promessa. O cadeado de PLANO (`🔒 Studio`) continua sendo dele e tem
// precedência: quem está travado por plano nem chega aqui.
//
// ⚠️ A LIÇÃO DO `sceneTruth`: biblioteca que ninguém chama é biblioteca morta.
// O teste desta rodada (scripts/test-motor-que-cabe-2026-08-31.mjs) lê o
// GenerateClient.tsx e PROVA que as funções abaixo estão ligadas na tela.

/** Saldo desconhecido (`null`) nunca reprova nada — a tela não inventa recusa. */
export function cabeNoSaldo(custo: number, saldo: number | null): boolean {
  if (saldo === null || !Number.isFinite(saldo)) return true
  if (!Number.isFinite(custo) || custo <= 0) return true // grátis sempre cabe
  return custo <= saldo
}

/** Quantos créditos FALTAM. 0 quando cabe (ou quando não dá para saber). */
export function faltamCreditos(custo: number, saldo: number | null): number {
  if (cabeNoSaldo(custo, saldo)) return 0
  return Math.max(0, Math.ceil(custo - (saldo as number)))
}

export type Combinacao = {
  /** chave do motor como o seletor a conhece ('hollywood', 'h3', 'seedance'…) */
  motor: string
  duracao: number
  custo: number
}

export type PlanoDeResgate =
  /** A escolha atual já cabe — a tela não diz nada. */
  | { tipo: 'cabe' }
  /** Mesma câmera, filme mais curto. É o desvio PREFERIDO: preserva a escolha. */
  | { tipo: 'mesma_camera'; alvo: Combinacao }
  /** Mesma duração, a melhor câmera que o saldo alcança. */
  | { tipo: 'outra_camera'; alvo: Combinacao }
  /** Nada do cardápio cabe. Aí sim é conversa de saldo — e ela é do Codex. */
  | { tipo: 'nada_cabe' }

/**
 * A ORDEM IMPORTA E NÃO É ARBITRÁRIA.
 *
 * 1º tenta a MESMA câmera mais curta. A câmera é a aspiração ("eu quero um
 *    Kling 3"); a duração é a concessão barata. Trocar o motor de quem escolheu
 *    o motor é desfazer a escolha dela.
 * 2º só então oferece outra câmera na MESMA duração, sempre a MAIS CARA que
 *    ainda cabe — nunca a mais barata da lista. Oferecer o pior quando o saldo
 *    paga o intermediário é entregar menos do que a pessoa pode ter.
 * 3º `nada_cabe` é honesto: a tela não finge que existe saída quando não existe.
 */
export function planoDeResgate(args: {
  motorAtual: string
  duracaoAtual: number
  saldo: number | null
  duracoes: readonly number[]
  /** custo(motor, duração) — na tela, sempre `creditCostForDuration` */
  custoDe: (motor: string, duracao: number) => number
  /** os motores do cardápio que NÃO estão travados por plano */
  motoresDisponiveis: readonly string[]
}): PlanoDeResgate {
  const { motorAtual, duracaoAtual, saldo, duracoes, custoDe, motoresDisponiveis } = args
  const custoAtual = custoDe(motorAtual, duracaoAtual)
  if (cabeNoSaldo(custoAtual, saldo)) return { tipo: 'cabe' }

  // 1º — mesma câmera, a MAIOR duração que ainda cabe (não a menor: o filme
  // mais longo que o saldo paga é o melhor filme que ela consegue hoje).
  const maisCurtas = duracoes
    .filter((d) => d < duracaoAtual)
    .map((d) => ({ motor: motorAtual, duracao: d, custo: custoDe(motorAtual, d) }))
    .filter((c) => cabeNoSaldo(c.custo, saldo))
    .sort((a, b) => b.duracao - a.duracao)
  if (maisCurtas.length) return { tipo: 'mesma_camera', alvo: maisCurtas[0] }

  // 2º — mesma duração, a câmera MAIS CARA que cabe.
  const outras = motoresDisponiveis
    .filter((m) => m !== motorAtual)
    .map((m) => ({ motor: m, duracao: duracaoAtual, custo: custoDe(m, duracaoAtual) }))
    .filter((c) => cabeNoSaldo(c.custo, saldo) && c.custo > 0)
    .sort((a, b) => b.custo - a.custo)
  if (outras.length) return { tipo: 'outra_camera', alvo: outras[0] }

  return { tipo: 'nada_cabe' }
}
