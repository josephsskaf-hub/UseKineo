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
