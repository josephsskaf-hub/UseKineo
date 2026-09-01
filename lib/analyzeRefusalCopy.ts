// ═══ KINEO-PRIMEIRA-PORTA-2026-09-01 (sprint-v1v4 #23) ═════════════════════
//
// O DEFEITO, medido em produção nesta rodada (14 dias, só pessoas externas):
//
//   `analyze_not_ok` com http 400 — a recusa é DETERMINÍSTICA (o mesmo texto
//   vai ser recusado para sempre) e a pessoa lê "Could not analyze topic.
//   Please try again." Sequência real de 31/08 02:02→02:04, uma pessoa só:
//   02:02:03 · 02:03:08 · 02:03:33 · 02:03:53 — quatro tentativas idênticas em
//   110 segundos, quatro 400 em ~300 ms cada, e some. Outra pessoa fez o mesmo
//   às 01:17–01:18, vinda de `utm_source=chatgpt.com`. Este é o PRIMEIRO
//   clique da conta: ninguém aqui chegou nem ao vídeo 1.
//
// O 400 chega em ~300 ms — rápido demais para ser GPT. É validação de porta:
//   · corpo que não é JSON;
//   · `prompt` ausente/vazio (a única que um auto-start pode disparar sozinho,
//     e o `analyze_idea_clicked` desses casos vem com `source: 'topic'`, ou
//     seja: a pessoa NÃO deixou o campo em branco — o campo chegou vazio aqui);
//   · só a tag `[camera: …]` sobrou depois da limpeza;
//   · texto acima do teto de caracteres.
//
// O que este arquivo muda: as três primeiras deixam de responder frases de
// desenvolvedor ("Prompt is required.", "Invalid request body.") e passam a
// responder A ÚNICA AÇÃO QUE PODE DAR CERTO. E nenhuma delas diz "try again":
// mandar repetir uma recusa determinística é instrução que não pode funcionar
// — foi exatamente o que 4 tentativas em 110 s provaram.
//
// O teto de caracteres NÃO é tocado aqui: ele tem fonte única em
// `lib/analyzeLimits.ts` e a frase dele cita o número. Este módulo só empresta
// o código de rótulo para a telemetria.
//
// REGRAS QUE VÊM DE LIÇÕES JÁ PAGAS NESTE REPOSITÓRIO:
//   1. Nenhuma frase promete o que o produto não cumpre sozinho — sem "our
//      team", sem crédito, sem desconto, sem reembolso (CLAUDE.md, 24/08).
//   2. Nada que sai daqui carrega o texto da pessoa: só CÓDIGO e TAMANHO.
//      Log de recusa não é lugar para conteúdo de cliente (regra da #18).
//   3. Módulo puro: zero import, zero rede, zero React — testável em
//      `scripts/test-recusa-analyze-copy-2026-09-01.mjs` sem Next e sem banco.

/** Os quatro únicos jeitos de a porta do /api/analyze-idea dizer não a um 400. */
export type AnalyzeRefusalCode =
  | 'body_malformed'
  | 'prompt_missing'
  | 'prompt_only_camera_tag'
  | 'prompt_too_long'

/**
 * A frase que a pessoa lê. Contrato:
 *  · diz A AÇÃO, no imperativo, na primeira oração;
 *  · nunca contém "try again" (a recusa é determinística);
 *  · nunca promete atendimento, crédito, desconto ou reembolso;
 *  · inglês, porque é a língua do produto.
 *
 * `prompt_too_long` NÃO é servida aqui de propósito: a frase dele mora junto
 * do número em `lib/analyzeLimits.ts`. Pedir a frase dele aqui devolve `null`
 * para que ninguém crie uma segunda cópia do teto.
 */
export function analyzeRefusalCopy(code: AnalyzeRefusalCode): string | null {
  switch (code) {
    case 'body_malformed':
      // A pessoa não tem como consertar o corpo do POST; o que ela pode fazer
      // é recarregar. Dizemos também que nada foi cobrado, porque o medo de
      // ter perdido crédito é o que faz a pessoa apertar de novo.
      return 'Your idea did not arrive in one piece. Reload the page and paste it once more — no credits were used.'
    case 'prompt_missing':
      // A frase antiga ("Prompt is required.") acusa a pessoa de ter deixado o
      // campo vazio. Nos casos medidos ela tinha digitado: o campo chegou
      // vazio DAQUI para trás. Então a instrução é retype, e a frase avisa,
      // com todas as letras, que repetir o mesmo clique devolve isto de novo.
      return 'The idea box reached us empty. Click into it, type your idea again and press Generate — pressing Generate as-is will return this same message.'
    case 'prompt_only_camera_tag':
      return 'Only the camera setting came through, without the idea. Add the idea text and press Generate.'
    case 'prompt_too_long':
      return null
    default:
      return null
  }
}

/** Corpo cru do POST, do jeito que a rota o vê. */
export interface AnalyzeBodyShape {
  prompt?: unknown
  duration?: unknown
  language?: unknown
  scriptMode?: unknown
  [k: string]: unknown
}

/**
 * Metadados de recusa. SÓ código e números — nunca o texto.
 * `body_keys` existe para separar "o cliente mandou `{}`" de "o cliente mandou
 * `{prompt: ''}`": são bugs diferentes, e hoje o banco não distingue os dois.
 */
export interface AnalyzeRefusalTelemetry {
  refusal_code: AnalyzeRefusalCode
  prompt_chars: number
  body_keys: string
  deterministic: true
}

/** Contagem de caracteres à prova de tipo errado. Nunca lança. */
export function promptChars(value: unknown): number {
  return typeof value === 'string' ? value.length : 0
}

/**
 * Lista ORDENADA das chaves do corpo, para caber num campo curto de evento.
 * Só nomes de chave — jamais valores.
 */
export function bodyKeys(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '(none)'
  const keys = Object.keys(body as Record<string, unknown>).sort()
  return keys.length ? keys.join(',').slice(0, 120) : '(empty)'
}

/** Monta o pacote de telemetria de uma recusa de porta. */
export function analyzeRefusalTelemetry(
  code: AnalyzeRefusalCode,
  body: unknown,
  promptValue: unknown,
): AnalyzeRefusalTelemetry {
  return {
    refusal_code: code,
    prompt_chars: promptChars(promptValue),
    body_keys: bodyKeys(body),
    deterministic: true,
  }
}
