// ═══ KINEO-RECUSA-COM-NOME-2026-08-31 (sprint-v1v4 #18) ═══════════════════
//
// O DEFEITO, medido em produção agora (14 dias, só pessoas externas):
//
//   `analyze_not_ok`             — 26 eventos, 8 pessoas, 26 de 26 MUDOS.
//   `generate_script_not_ok`     — 10 eventos, 6 pessoas, 10 de 10 MUDOS.
//   `openai_capacity_stop_early` —  9 eventos,  9 MUDOS.
//   `openai_quota_dead`          — 18 eventos, 18 MUDOS.
//
// São os DOIS PRIMEIROS estágios de toda tentativa de vídeo — inclusive de
// toda SEGUNDA tentativa, o trecho que este sprint existe para desentupir. Em
// 30 dias, das 12 pessoas que apertaram Generate pela segunda vez, 8 bateram
// em `generation_stage_error` e NENHUMA terminou o vídeo. A autópsia dessas 8
// não existe porque estas duas rotas nunca escreveram uma linha sobre as
// próprias recusas.
//
// POR QUE MUDO: a única testemunha era o CLIENTE. O conserto de 15/08
// (KINEO-STAGE-ERROR-DETAIL) passou a mandar `detail` — mas SÓ no
// `compose_not_ok`. Confirmado no banco nesta rodada: desde 17/08 todo
// `compose_not_ok` chega com causa (a mudez histórica é ANTERIOR ao conserto e
// está encerrada), enquanto `analyze_not_ok` e `generate_script_not_ok`
// continuam 100% mudos até hoje.
//
// E a testemunha do cliente é frágil por natureza: ela só escreve se a ABA
// sobreviver ao POST. Quem fecha a aba, perde a rede ou é redirecionado
// desaparece sem deixar rastro — exatamente o argumento que criou o
// `logCreatomateRejection` em /api/compose.
//
// A CURA é a mesma que funcionou lá: a rota que RECUSA passa a registrar a
// própria recusa, do lado do servidor, com o motivo que só ela conhece.
//
// TRÊS REGRAS QUE VÊM DE LIÇÕES JÁ PAGAS NESTE REPOSITÓRIO:
//
//   1. `reason` DEPOIS do spread do call site, nunca antes (lição 4 da sprint
//      de 08/08: `...metadata` por último é colisão silenciosa, e `reason` já
//      foi sobrescrito uma vez aqui).
//   2. AWAIT, nunca `void`: a escrita nasce ao lado do `return`, e lambda que
//      responde pode ser congelada antes de a promessa resolver.
//   3. NUNCA lança e NUNCA atrasa a resposta: falha de telemetria não pode
//      virar falha de produto. Sem chave, sem usuário -> silêncio.
//
// E uma regra nova desta rodada: o detalhe gravado é SEMPRE a mensagem que o
// SERVIDOR escreveu (constantes nossas) ou o NOME do erro — nunca o texto que
// a pessoa digitou. Log de recusa não é lugar para conteúdo de cliente.
//
// A parte que decide o rótulo não usa rede nem React: é aritmética de string,
// testável em `scripts/test-recusa-com-nome-2026-08-31.mjs`.

/** Rotas que sabem se explicar. O prefixo do `reason` sai daqui. */
export type StageRoute = 'analyze-idea' | 'generate-script'

/** Estágio do funil, no MESMO vocabulário que o cliente já carimba. */
const STAGE_BY_ROUTE: Record<StageRoute, string> = {
  'analyze-idea': 'analyzing',
  'generate-script': 'scripting',
}

/** Teto do detalhe, igual ao que `trackGenerationFailure` já aplica. */
export const REFUSAL_DETAIL_MAX = 180

/**
 * O `reason` de servidor. Prefixo `srv_` de propósito: a linha do cliente
 * (`analyze_not_ok`) e esta são testemunhas DIFERENTES do mesmo instante, e
 * misturá-las num `group by reason` inflaria a contagem — o defeito que a #12
 * corrigiu. Quem conta falha continua contando a linha do cliente; esta existe
 * para DIZER O PORQUÊ e para pegar quem morre com a aba fechada.
 */
export function refusalReason(route: StageRoute, httpStatus: number): string {
  const familia =
    httpStatus === 401 ? 'unauthenticated'
    : httpStatus === 402 ? 'payment_required'
    : httpStatus === 429 ? 'rate_limited'
    : httpStatus === 503 ? 'upstream_unavailable'
    : httpStatus >= 500 ? 'server_error'
    : httpStatus === 400 ? 'bad_input'
    : httpStatus >= 400 ? 'refused'
    : 'unexpected'
  return `srv_${route.replace(/-/g, '_')}_${familia}`
}

/** O estágio que acompanha a rota. Nunca inventa vocabulário novo. */
export function refusalStage(route: StageRoute): string {
  return STAGE_BY_ROUTE[route]
}

/**
 * Detalhe seguro: colapsa espaço, corta em REFUSAL_DETAIL_MAX e devolve `null`
 * quando não sobra nada. `null` é melhor que string vazia — string vazia é
 * exatamente o que fazia linhas mudas parecerem "com causa" no painel.
 */
export function sanitizeRefusalDetail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const limpo = raw.replace(/\s+/g, ' ').trim()
  if (!limpo) return null
  return limpo.length > REFUSAL_DETAIL_MAX
    ? `${limpo.slice(0, REFUSAL_DETAIL_MAX - 1)}…`
    : limpo
}

/**
 * O corpo do evento, montado SEM tocar em rede — é o que o teste verifica.
 * `reason` por último no objeto de metadata, pela regra 1 acima.
 */
export function buildRefusalEvent(args: {
  route: StageRoute
  httpStatus: number
  detail?: unknown
  extra?: Record<string, unknown>
}): { name: string; path: string; metadata: Record<string, unknown> } {
  const reason = refusalReason(args.route, args.httpStatus)
  const detalhe = sanitizeRefusalDetail(args.detail)
  return {
    name: 'generation_stage_error',
    path: `/api/${args.route}`,
    metadata: {
      ...(args.extra ?? {}),
      stage: refusalStage(args.route),
      http_status: args.httpStatus,
      error_source: 'server',
      ...(detalhe ? { error: detalhe } : {}),
      reason,
    },
  }
}
