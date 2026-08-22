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
 * O que isso significa na prática: com 60s, no máximo 12s sem voz. Um roteiro
 * de ~110 palavras vira o piso para pedir um vídeo de um minuto.
 *
 * O RISCO ACEITO, dito em voz alta: mais gente vai bater na recusa antes de
 * renderizar. É atrito de propósito — atrito antes do débito custa 200ms;
 * atrito depois custa 150 créditos e um vídeo que a pessoa não posta.
 *
 * PARA REVERTER: 0.7 devolve o comportamento calibrado no julgamento original.
 */
export const MIN_COVERAGE = 0.8

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
 */
export function narrationTooShortMessage(fit: NarrationFit): string {
  const fala = Math.round(fit.speech)
  const alvo = Math.round(fit.target)
  const sugerida = Math.max(15, Math.round(fit.speech / 5) * 5)
  return (
    `Your script is about ${fala} seconds of narration, but you asked for a ${alvo}-second video — ` +
    `that would leave roughly ${Math.round(fit.silence)} seconds with no voice. ` +
    `Add about ${fit.missingWords} more words, or set the length to ${sugerida} seconds.`
  )
}
