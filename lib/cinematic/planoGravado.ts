// KINEO-PISTA-COM-FALA-1211 — o plano de cenas que FOI ao motor, gravado no cinematic_dispatch_result.
// Por quê: o `submitted_prompts` do evento corta em 240 caracteres, e os 240 primeiros de todo prompt clássico são moldura
// ("Film visual medium: … Opening shot: show the described subject …") — o revisor nunca via a AÇÃO da cena (Div. 2, 12/11:
// "o plano não fica gravado"). O claim assinado já guarda o plano cheio (scene_prompts, kling4_trial.scene_plan,
// scene_fal_inputs), mas só quando o filme nasce; o dispatch_result é escrito em TODA resposta (recusa, estorno, ambíguo).
// Aqui: por cena, o prompt FINAL enviado (até 700 code points), a pista visual de onde nasceu e o modelo; no máximo 12 cenas.
// Nada do cliente além do que o evento já tinha (o prompt da cena já ia, cortado em 240). Lib PURA; nunca lança.
// Guardião: scripts/test-pista-com-fala-1211.mjs.

export const PLANO_GRAVADO_VERSAO = 'plano_gravado_1211_v1' as const
export const PLANO_GRAVADO_MAX_CENAS = 12
export const PLANO_GRAVADO_MAX_PROMPT = 700
export const PLANO_GRAVADO_MAX_PISTA = 160

export type CenaGravada = { i: number; engine: string | null; hint: string | null; prompt: string; prompt_chars: number }

const corta = (s: string, n: number) => { const cps = Array.from(s); return cps.length <= n ? s : cps.slice(0, n).join('') }

/** Uma cena para o evento. Entrada estranha (não-string, índice inválido) = null, nunca exceção. */
export function cenaGravada(a: { i: number; engine?: unknown; hint?: unknown; prompt?: unknown }): CenaGravada | null {
  try {
    if (!Number.isInteger(a.i) || a.i < 0 || typeof a.prompt !== 'string' || !a.prompt.trim()) return null
    return {
      i: a.i,
      engine: typeof a.engine === 'string' && a.engine ? corta(a.engine, 80) : null,
      hint: typeof a.hint === 'string' && a.hint.trim() ? corta(a.hint.trim(), PLANO_GRAVADO_MAX_PISTA) : null,
      prompt: corta(a.prompt, PLANO_GRAVADO_MAX_PROMPT),
      prompt_chars: Array.from(a.prompt).length,
    }
  } catch { return null }
}

/** Grava (ou troca) a cena i no vetor do despacho. Nunca lança: telemetria não derruba render. */
export function anotarCena(plano: (CenaGravada | null)[] | undefined, a: { i: number; engine?: unknown; hint?: unknown; prompt?: unknown }): void {
  try {
    if (!Array.isArray(plano)) return
    const c = cenaGravada(a)
    if (c && c.i < 64) plano[c.i] = c
  } catch { /* nunca derruba o render */ }
}

/** O campo do evento: as cenas gravadas em ordem, no máximo 12; vazio = null (evento antigo e novo leem igual). */
export function planoParaOEvento(plano: (CenaGravada | null)[] | undefined): { version: string; scenes: CenaGravada[]; total: number } | null {
  try {
    if (!Array.isArray(plano)) return null
    const cenas = plano.filter((c): c is CenaGravada => !!c && typeof c.prompt === 'string')
    if (!cenas.length) return null
    return { version: PLANO_GRAVADO_VERSAO, scenes: cenas.slice(0, PLANO_GRAVADO_MAX_CENAS), total: cenas.length }
  } catch { return null }
}
