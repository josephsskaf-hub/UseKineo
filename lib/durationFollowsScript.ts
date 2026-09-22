// ═══ KINEO-DURACAO-SEGUE-O-ROTEIRO-2026-09-19 — roteiro da pessoa manda na duração, não o seletor ═══
//
// CASO (Axel, 18/09 23:23 e 00:37 BRT, primeiro filme depois de pagar Creator): colou o próprio roteiro (34 s de
// fala) com o seletor no padrão de 60 s, motor Veo. O portão de narração recusou DUAS vezes com "add about 57 more
// words" (sem cobrar), a tela tentou engordar o texto com IA, não deu, baixou para 35 s sozinha e ficou esperando
// um segundo clique — que não veio. Cliente pagante, roteiro bom para 35 s, zero filme.
//
// A regra do fundador (18/09, "roteiro colado: duração segue as palavras"; 19/09: "Vai, conserta isso") vale
// também aqui: quando o roteiro é da própria pessoa (verbatim) e uma duração do seletor cabe na fala, o servidor
// DESCE para essa duração e renderiza — em vez de recusar e pedir palavras. O `autofitDownAt` antigo só descia com
// `allow_shorter_duration` (que nenhum cliente manda) e ainda exigia cobertura mínima (34/60 = 57% ficava abaixo),
// por isso nunca salvou ninguém. Recusar continua certo só quando NENHUMA duração oferecida cabe (fala < 14 s).

export const DURATION_FOLLOWED_SCRIPT_EVENT = 'duration_followed_script'
export const DURATION_FOLLOWS_SCRIPT_VERSION = 'duration_follows_script_v1'

export type DurationFollowsScript = { from: number; to: number; speechSeconds: number; version: typeof DURATION_FOLLOWS_SCRIPT_VERSION }

export function decideDurationFollowsScript(args: {
  /** o portão já mediu e a fala NÃO enche o alvo pedido */
  fitOk: boolean
  /** roteiro da própria pessoa (verbatim / colado) — só ele manda na duração */
  ownScript: boolean
  requestedSeconds: unknown
  speechSeconds: unknown
  /** a maior duração do seletor que a fala enche (largestFittingDuration), ou null */
  largestFitting: number | null | undefined
  /** piso do motor: hollywood 30 s, clássico 15 s */
  floorSeconds: number
}): DurationFollowsScript | null {
  if (args.fitOk) return null
  if (!args.ownScript) return null
  const from = Number(args.requestedSeconds)
  const speech = Number(args.speechSeconds)
  const to = Number(args.largestFitting)
  if (!Number.isFinite(from) || from <= 0) return null
  if (!Number.isFinite(speech) || speech <= 0) return null
  if (!Number.isFinite(to) || to <= 0) return null
  if (to >= from) return null // descer, nunca subir
  if (to < args.floorSeconds) return null // abaixo do piso do motor é recusa honesta
  return { from, to, speechSeconds: Math.round(speech), version: DURATION_FOLLOWS_SCRIPT_VERSION }
}

// ═══ KINEO1-VERBATIM-ESTICA-2026-09-22 — o espelho: o roteiro próprio também SOBE a duração ═══
// Fundador (22/09): "Estica então" — em "Use my script as is" o filme segue o roteiro (até 90 s), nunca é reescrito.
// Regra: com a fala maior que o seletor, a duração passa a ser a MAIOR do seletor que a fala enche (a mesma régua
// `largestFittingDuration` do portão: cobertura ≥ 95 %); o compose já acaba o filme quando o texto acaba. Acima do
// teto (90 s × tolerância) é recusa honesta: cortar o texto ou deixar a IA estruturar.
export const DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS = 90
export const DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE = 1.15
export type DurationFollowsScriptUp =
  | { kind: 'up'; from: number; to: number; speechSeconds: number; version: typeof DURATION_FOLLOWS_SCRIPT_VERSION }
  | { kind: 'too_long'; speechSeconds: number; maxSeconds: number; version: typeof DURATION_FOLLOWS_SCRIPT_VERSION }

export function decideDurationFollowsScriptUp(args: {
  ownScript: boolean
  requestedSeconds: unknown
  speechSeconds: unknown
  /** a maior duração do seletor que a fala enche (largestFittingDuration), ou null */
  largestFitting: number | null | undefined
  ceilingSeconds?: number
}): DurationFollowsScriptUp | null {
  if (!args.ownScript) return null
  const from = Number(args.requestedSeconds)
  const speech = Number(args.speechSeconds)
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(speech) || speech <= 0) return null
  const ceiling = args.ceilingSeconds ?? DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS
  if (speech > ceiling * DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE) {
    return { kind: 'too_long', speechSeconds: Math.round(speech), maxSeconds: ceiling, version: DURATION_FOLLOWS_SCRIPT_VERSION }
  }
  const to = Number(args.largestFitting)
  if (!Number.isFinite(to) || to <= from) return null // subir, só quando a fala enche uma duração MAIOR
  return { kind: 'up', from, to, speechSeconds: Math.round(speech), version: DURATION_FOLLOWS_SCRIPT_VERSION }
}
