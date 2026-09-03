// ═══ KINEO-NARRACAO-ENCHE-2026-08-22 ═══════════════════════════════════════
//
// O DEFEITO QUE ESTE ARQUIVO EXISTE PARA MATAR, medido quadro a quadro hoje
// no render que o fundador reprovou (Solopreneur v2, Kling 3, 70s):
//
//   luminância: NUNCA cai abaixo de 44 em 70 segundos.
//   → NÃO HÁ APAGÃO DE IMAGEM. Nunca houve.
//
//   silêncio de áudio (<-35dB por mais de 1s):
//     0,2→2,8s · 9,9→12,3s · 60,1→63,6s · 67,2→70,0s  ≈ 11s sem voz
//
// O que o fundador chama de "apagão" é a NARRAÇÃO SUMINDO, não a tela
// apagando. Ele está certo sobre o sintoma e o nome enganou o diagnóstico por
// duas rodadas — inclusive a minha, em 20/08, quando "consertei" o rabo mudo
// do final (KINEO-TAIL) e o buraco do MEIO continuou lá.
//
// A CAUSA, e ela é aritmética pura. Cruzando roteiro × silêncio nos 6 demos:
//
//     vídeo                 narração   segundos SEM voz
//     Solopreneur v2         402 ch          28
//     Rob The AI Guy v2      436 ch          26
//     Roanoke                541 ch          17
//     Craigslist             603 ch          12
//     Jasmin                 623 ch          11
//     Kasparov               762 ch           0   ← o único correto
//
// Correlação perfeita e monotônica. Não é o motor, não é o avatar, não é o
// Creatomate: é ROTEIRO CURTO PARA A DURAÇÃO PEDIDA. Todos pediram 60s; só o
// de 762 caracteres tinha fala suficiente para encher 60s.
//
// POR QUE NENHUM CONSERTO DE MONTAGEM RESOLVE: o KINEO-TAIL apara o rabo mudo
// da última cena, mas é proibido de furar o piso de 61s (TikTok Creator
// Rewards, regra de negócio nº1). Ou seja, com 32s de fala e um piso de 61s,
// a montagem é OBRIGADA a produzir 29s de imagem sem voz. Não existe corte
// que crie narração que não foi escrita. O conserto tem que vir ANTES.
//
// A REGRA DA CASA JÁ DIZIA ISSO (CLAUDE.md: "script de ~150-165 palavras" para
// 60s) — e nada no código IMPUNHA. Regra que vive só em documento é regra que
// vale até a próxima pressa. Agora ela é uma função, chamada antes de gastar
// crédito.

/** Palavras por segundo da narração. 2,3 é a taxa que a casa já usa para
 *  dimensionar roteiro (CLAUDE.md) e é a que reproduz os números medidos: o
 *  Kasparov, com 139 palavras, encheu exatamente os 60s. */
export const WORDS_PER_SECOND = 2.3

/** Caracteres por palavra em inglês, incluindo o espaço. Usado só quando não
 *  dá para contar palavras de verdade. */
const CHARS_PER_WORD = 5.5

/**
 * Quantos segundos de fala uma narração produz.
 * Conta PALAVRAS de verdade (não caracteres): "a" e "extraordinarily" levam
 * tempos muito diferentes, e um roteiro com muitas palavras curtas seria
 * subestimado pela régua de caracteres.
 */
export function speechSeconds(script: string): number {
  const limpo = (script ?? '')
    // Marcadores estruturais (HOOK, MICRO REWARD, ESCALATION, PAYOFF) e
    // direções entre colchetes NÃO são falados — contá-los infla a estimativa
    // e o vídeo volta a sair mudo, que é exatamente o defeito que isto mata.
    .replace(/^\s*(HOOK|MICRO REWARD|ESCALATION|PAYOFF|TITLE)\s*:?\s*$/gim, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .trim()
  if (!limpo) return 0
  const palavras = limpo.split(/\s+/).filter(Boolean).length
  return palavras / WORDS_PER_SECOND
}

/** Estimativa por caracteres, para quando só se tem o comprimento. */
export function speechSecondsFromChars(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0
  return chars / CHARS_PER_WORD / WORDS_PER_SECOND
}

export interface NarrationFit {
  /** Segundos de fala que o roteiro produz. */
  speech: number
  /** Segundos de vídeo pedidos. */
  target: number
  /** Segundos que ficariam SEM voz. Negativo = sobra fala. */
  silence: number
  /** Fração da duração coberta por voz (1 = perfeito). */
  coverage: number
  /** true = o roteiro enche a duração dentro da tolerância. */
  ok: boolean
  /** Palavras que faltam para encher. 0 se já enche. */
  missingWords: number
}

/**
 * TOLERÂNCIA: 80% de cobertura (era 70% — ver a nota de 22/08 abaixo).
 *
 * Não é 100% de propósito — respiro entre frases e um fecho musical de 2-3s
 * são DIREÇÃO, não defeito, e o KINEO-TAIL já apara o excesso do final.
 *
 * ⚠️ O NÚMERO É DECISÃO DO FUNDADOR, TOMADA COM OS DOIS LADOS NA MESA.
 * Ele assistiu os 6 demos e deu veredito de cada um. Medido:
 *
 *     roteiro          fala   cobertura   ele disse           em 70%   em 80%
 *     Solopreneur       32s      53%      "está quebrado"     RECUSA   RECUSA
 *     Rob The AI Guy    34s      57%      (mesmo defeito)     RECUSA   RECUSA
 *     Roanoke           43s      71%      "estão bons"        passa    RECUSA
 *     Craigslist        48s      79%      "estão bons"        passa    RECUSA
 *     Jasmin            49s      82%      "estão bons"        passa    passa
 *     Kasparov          60s     100%      (o correto)         passa    passa
 *
 * Eu propus 70%, porque reproduz exatamente o julgamento dele e uma régua
 * mais dura que o cliente é uma régua que o cliente desliga. Apresentei o
 * custo de 80% em voz alta: recusa o Craigslist e o Roanoke, que ele tinha
 * aprovado.
 *
 * ELE ESCOLHEU 80% SABENDO DISSO, e o argumento dele é melhor que o meu:
 * "aprovado" ali significava "dá para postar", não "é o padrão da casa". A
 * régua deve mirar o que a Kineo quer ENTREGAR, não o mínimo que passa.
 *
 * ⚠️⚠️ 22/08, SEGUNDA REVISÃO — 80% → 95%, E O ARGUMENTO É DO FUNDADOR:
 * "quanto maior o tempo sem legenda, pior o vídeo fica; 22s é 25% do vídeo,
 * até 16s é ruim; precisa ser no máximo de 1 a 3 segundos sem voz".
 *
 * Ele está certo, e a auditoria dos 6 motores prova de um jeito que eu não
 * tinha notado ao propor 70%:
 *
 *     Kling 2.5 ... 100% de cobertura (0s sem voz)
 *     Veo ......... 100%             (0s)
 *     Seedance .... 98%              (1s)
 *     Kineo 1 ..... 98%              (1s)
 *     H3 .......... 75%              (16s)  ← fora da curva
 *     Kling 3 ..... 69%              (22s)  ← fora da curva
 *
 * O padrão que ele pediu NÃO é aspiração: é o que dois terços do produto já
 * entrega hoje. Uma régua em 70% ou 80% legalizaria justamente os dois casos
 * que ele reprovou. Eu estava calibrando pelo pior aceitável em vez de pelo
 * que o produto já sabe fazer — erro de referência, não de conta.
 *
 * 95% de 60s = no máximo 3s sem voz, exatamente o pedido.
 *
 * QUANTO ISSO EXIGE DO ROTEIRO (e por que não é proibitivo):
 *     30s → 66 palavras · 45s → 99 · 60s → 132 · 65s → 143
 * O gerador automático já pede 140-170, então o caminho em que a IA escreve
 * passa folgado. A régua só morde quem escreve o PRÓPRIO roteiro curto — e
 * ali recusar é melhor que entregar: com 120 palavras num vídeo de 60s a
 * pessoa receberia 8s mudos e culparia a Kineo, não o texto dela.
 *
 * PARA REVERTER: 0.8 volta ao intermediário, 0.7 ao calibrado no julgamento
 * inicial dos 6 demos.
 */
export const MIN_COVERAGE = 0.95

export function narrationFit(script: string, targetSeconds: number): NarrationFit {
  const speech = speechSeconds(script)
  const target = Number.isFinite(targetSeconds) && targetSeconds > 0 ? targetSeconds : 0
  if (target === 0) {
    return { speech, target: 0, silence: 0, coverage: 1, ok: true, missingWords: 0 }
  }
  const coverage = speech / target
  const silence = target - speech
  const ok = coverage >= MIN_COVERAGE
  const missingWords = ok ? 0 : Math.ceil((target * MIN_COVERAGE - speech) * WORDS_PER_SECOND)
  return { speech, target, silence, coverage, ok, missingWords }
}

/**
 * A mensagem para o USUÁRIO quando o roteiro dele não enche a duração.
 *
 * Escrita para ser acionável, não para acusar: diz o número que falta e as
 * duas saídas. E é dita ANTES de qualquer débito — o custo de um render
 * Hollywood é 150 créditos, e entregar 28 segundos mudos por esse preço é o
 * pior desfecho possível para os dois lados.
 *
 * ═══ sprint-v1v4 #11 (2026-08-31) — A SAÍDA OFERECIDA NÃO EXISTIA ═══════════
 *
 * Esta função sugeria `Math.floor(fala / 5) * 5`: um múltiplo de 5 qualquer.
 * O seletor do produto tem TRÊS botões — 35, 60 e 90. Medido em 14 dias, nas
 * 23 recusas reais de 17 pessoas externas, a frase mandou a pessoa escolher
 * 40s, 30s, 25s e 15s — nenhum desses números existe na tela dela. Em 14 das
 * 22 recusas distintas a alternativa oferecida era INSELECIONÁVEL, e em duas
 * delas (fala de 11s e de 2s, "use 15s") ela também não passaria na régua:
 * a instrução levava de volta à MESMA recusa. Onze dessas 17 pessoas nunca
 * entregaram um único vídeo.
 *
 * Agora a alternativa vem da MESMA lista que desenha os botões
 * (`SUPPORTED_DURATIONS`, passada pelo chamador para não criar import
 * circular com `expandPolicy`) e só é oferecida quando de fato cabe. Quando
 * nenhuma duração do seletor cabe, a frase CALA sobre duração em vez de
 * inventar um número: sobra o caminho honesto, que é escrever mais — e é
 * exatamente o que o botão "Finish it for me" da tela faz.
 */
export function narrationTooShortMessage(
  fit: NarrationFit,
  supportedDurations: readonly number[],
): string {
  const fala = Math.round(fit.speech)
  const alvo = Math.round(fit.target)

  // A maior duração DO SELETOR que esta fala realmente enche. `null` = nenhuma.
  // Mesma conta de `expandPolicy.largestFittingDuration`, repetida aqui (e
  // travada por teste) só para manter este módulo na base da pilha de imports.
  const teto = fit.speech / MIN_COVERAGE
  const cabem = supportedDurations
    .filter((d) => Number.isFinite(d) && d > 0 && d <= teto + 1e-9)
    .sort((a, b) => b - a)
  const sugerida: number | null = cabem.length > 0 ? cabem[0] : null

  // ⚠️ A ORDEM DAS DUAS SAÍDAS NÃO É ESTÉTICA — É DINHEIRO DO CLIENTE.
  // "Escrever mais" vem primeiro, e encurtar vem com AVISO, porque abaixo de
  // 60s o vídeo sai do TikTok Creator Rewards (regra de negócio nº1 da casa,
  // CLAUDE.md). Sugerir "use 50s" sem dizer isso resolveria a nossa validação
  // entregando ao cliente um vídeo que não monetiza — trocar o problema dele
  // por um pior, em silêncio.
  const perdeMonetizacao = sugerida !== null && alvo >= 60 && sugerida < 60
  const alternativa =
    sugerida === null
      ? ''
      : perdeMonetizacao
        ? ` Or set the length to ${sugerida} seconds — but note that videos under 60 seconds don't qualify for TikTok's Creator Rewards.`
        : ` Or set the length to ${sugerida} seconds.`

  return (
    `Your script is about ${fala} seconds of narration, but you asked for a ${alvo}-second video — ` +
    `that would leave roughly ${Math.round(fit.silence)} seconds of music with no story being told. ` +
    `Add about ${fit.missingWords} more words.${alternativa}`
  )
}

// ═══ KINEO-DEGRAU-2026-09-03 — O GATE VIRA DEGRAU, NÃO PORTA ═══════════════
//
// O DEFEITO, medido em 03/09 em produção (contas externas, evento
// `narration_guard_blocked`): em 30 dias a trava acima recusou 34 renders de
// ~30 pessoas; em 14 dias, 78 bloqueios de 32 pessoas — 16 delas NUNCA viram
// um vídeo da Kineo. ~9% do topo do funil destruído pelo nosso próprio código
// por "faltam 2 palavras". Terceira auditoria em que aparece.
//
// A distribuição REAL da cobertura (`speech_seconds / target_seconds`) nos
// 34 bloqueios de 30d:
//
//     94% (2) · 93% (1) · 86% (3) · 85% (1) · 84% (4) · 82% (1) · 80% (2)
//     78% (1) · 77% (1) · 76% (1) · 73% (1) · 71% (1) · 69% (1) · 67% (1)
//     66% (1) · 63% (1) · 60% (1)
//     ─────────────── degrau grande no dado ───────────────
//     57% (1) · 31% (1) · 12% (1) · 9% (2) · 6% (1) · 5% (3) · 3% (1)
//
// 24 dos 34 estão em cobertura ≥ 60%. Abaixo disso são roteiros de 2 a 11
// segundos de fala — lixo, e ali recusar continua certo.
//
// A JOGADA: quando a fala não enche o botão que a pessoa escolheu, em vez de
// recusar, o servidor DESCE O ALVO sozinho para a duração que a fala enche e
// renderiza. É o espelho exato do `script_duration_autofit` que o cliente já
// faz para o caso oposto (roteiro longo demais SOBE o botão antes de gastar).
//
// ⚠️ ISTO NÃO AMPUTA FILME NENHUM — regra do fundador (02/09): "passar do
// alvo é bom, ficar abaixo é defeito". A descida encolhe o BOTÃO para caber
// no roteiro que a pessoa escreveu; o roteiro fica intacto. Como o alvo é o
// múltiplo de 5 arredondado PARA BAIXO da fala, a fala descida fica ACIMA do
// novo alvo (33s de fala num alvo de 30s), nunca abaixo dele.
//
// ⚠️ FLOOR, NUNCA ROUND: `Math.round` sobe (33s de fala → 35s), 33/35 = 94%
// reprova na régua de 95% e recria o próprio defeito na segunda tentativa.
//
// ⚠️ A DESCIDA TEM DE ACONTECER ANTES DO CUSTO. `creditCostForDuration` é
// linear nos segundos: descer a duração depois do claim faria a pessoa pagar
// 35s e receber 30s — cobrança-surpresa. A rota chama esta função logo depois
// de ler `body.duration`, antes de calcular crédito, claim, planner e compose.
//
// PARA DESLIGAR A JOGADA INTEIRA: MIN_AUTOFIT_DOWN_COVERAGE = 1.01 (nenhuma
// cobertura alcança; tudo volta ao 422 educativo de hoje).

/**
 * Cobertura mínima (fala / alvo pedido) para a descida acontecer. 0.60 é o
 * degrau do dado acima: 24 bloqueios entre 60% e 94%, depois um vazio até 57%
 * e o resto é roteiro de segundos. Abaixo disto a recusa de hoje continua.
 */
export const MIN_AUTOFIT_DOWN_COVERAGE = 0.60

/** Alvo descido nunca fica abaixo disto: não se monta filme de 3 palavras. */
export const AUTOFIT_DOWN_FLOOR_SECONDS = 20

/**
 * Piso do caminho hollywood (Kling 3 / H3 / Omni / S25). O planner dessa
 * estrada trava o alvo em `Math.max(30, …)` (route.ts, `hollywoodTarget`):
 * descer para 20 ou 25 ali seria puxado de volta para 30 e a fala voltaria a
 * não encher. A rota passa este piso quando `hollywoodPath` é verdadeiro.
 */
export const AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD = 30

/** O alvo descido é sempre múltiplo disto (mesma grade do seletor: 35/60/90
 *  e os degraus entre eles). */
export const AUTOFIT_DOWN_STEP_SECONDS = 5

export type AutofitDownReason =
  | 'fits'                  // a fala já enche o alvo pedido: nada a fazer
  | 'no_narration'          // roteiro vazio: não há o que medir
  | 'coverage_below_floor'  // cobertura < MIN_AUTOFIT_DOWN_COVERAGE: recusa de hoje
  | 'below_floor_seconds'   // alvo descido < piso absoluto: recusa de hoje
  | 'refit_failed'          // aritmética disse sim, a régua disse não: recusa de hoje
  | 'applied'               // desceu

export interface AutofitDown {
  /** true = a rota deve trocar a duração pelo `effectiveSeconds`. */
  applied: boolean
  reason: AutofitDownReason
  /** O que a pessoa pediu (o botão). */
  requestedSeconds: number
  /** O que vale daqui em diante. Igual ao pedido quando `applied` é false. */
  effectiveSeconds: number
  /** Segundos de fala do roteiro (não arredondado). */
  speechSeconds: number
  /** Cobertura contra o alvo PEDIDO (o número do dado acima). */
  coverage: number
  /** Pediu ≥60s e desceu para <60s: saiu do TikTok Creator Rewards. A casa
   *  mede isto; não bloqueia por isto (hoje a pessoa não recebe filme nenhum). */
  lost60sFloor: boolean
}

export function autofitDown(
  script: string,
  requestedSeconds: number,
  opts: { floorSeconds?: number } = {},
): AutofitDown {
  const floor = Number.isFinite(opts.floorSeconds) && (opts.floorSeconds as number) > 0
    ? (opts.floorSeconds as number)
    : AUTOFIT_DOWN_FLOOR_SECONDS
  const requested = Number.isFinite(requestedSeconds) && requestedSeconds > 0 ? requestedSeconds : 0
  const fit = narrationFit(script, requested)
  const base = {
    requestedSeconds: requested,
    effectiveSeconds: requested,
    speechSeconds: fit.speech,
    coverage: fit.coverage,
    lost60sFloor: false,
  }
  if (fit.speech <= 0) return { ...base, applied: false, reason: 'no_narration' }
  // Caminho de hoje, intocado: quem enche o alvo não é tocado.
  if (fit.ok) return { ...base, applied: false, reason: 'fits' }
  if (fit.coverage < MIN_AUTOFIT_DOWN_COVERAGE) {
    return { ...base, applied: false, reason: 'coverage_below_floor' }
  }
  // FLOOR: a fala fica ACIMA do alvo descido, nunca abaixo.
  const candidate = Math.floor(fit.speech / AUTOFIT_DOWN_STEP_SECONDS) * AUTOFIT_DOWN_STEP_SECONDS
  if (candidate < floor) return { ...base, applied: false, reason: 'below_floor_seconds' }
  // Descer só desce: um candidato ≥ pedido é impossível quando `!fit.ok`
  // (fala < 95% do pedido ⇒ floor(fala) < pedido), mas a régua é verificada
  // de verdade, não de cabeça.
  if (candidate >= requested) return { ...base, applied: false, reason: 'refit_failed' }
  const refit = narrationFit(script, candidate)
  if (!refit.ok) return { ...base, applied: false, reason: 'refit_failed' }
  return {
    ...base,
    applied: true,
    reason: 'applied',
    effectiveSeconds: candidate,
    lost60sFloor: requested >= 60 && candidate < 60,
  }
}
