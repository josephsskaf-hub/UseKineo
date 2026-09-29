// [TRAVA 8.2 — "vai" do 3x6] KINEO-SEEDANCE-15S-3X6-2026-09-29 — desfaz, em memória, a ÚNICA mudança que o 3x6 fez em
// lib/cinematic/klingShots.ts: o alinhador do plano assinado ganhou os passos do motor como parâmetro
// (alignSignedClipSecondsWith / alignSignedClipPlanWith; o Kling segue em 5|10 pelos nomes de sempre) e o cabeçalho ganhou
// duas linhas declarando o uso pelo Seedance 15 s. Os guardiões que exigiam klingShots.ts "byte a byte igual à base"
// (test-veo-planos, test-kling25-descricoes) comparam a base com o arquivo SEM essa mudança: qualquer outra alteração no
// arquivo continua vermelha, e cada troca abaixo precisa aparecer exatamente uma vez (senão devolve null = vermelho).
// Entrada e saída com LF.
const LF = String.fromCharCode(10)
const PARES = []
const troca = (antes, depois) => PARES.push([antes, depois])
troca(`// Só o Kling 2.5 passa por aqui: Seedance 1.5, Veo 3.1, Sora e a família hollywood não chamam nenhuma função deste arquivo.
`, `// Só o Kling 2.5 passa por aqui: Seedance 1.5, Veo 3.1, Sora e a família hollywood não chamam nenhuma função deste arquivo.
// Exceções declaradas: o Veo 3.1 reusa as peças puras em lib/cinematic/veoShots; o filme de 15 s do Seedance 1.5 usa
// alignSignedClipPlanWith (passos {6, 7, 8}) e KLING25_CLIP_LOSS_SECONDS — [TRAVA 8.2 — "vai" do 3x6], 29/09.
`)
troca(`export function alignSignedClipSeconds(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): number[] | null {
  const raw = response ? response.clip_seconds : undefined`, `export function alignSignedClipSeconds(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): number[] | null {
  return alignSignedClipSecondsWith(response, authorizedUrls, clipUrls, KLING25_SIGNED_STEPS)
}

/** Os segundos que um claim do Kling 2.5 pode assinar (os únicos que o schema da fal aceita). */
const KLING25_SIGNED_STEPS: ReadonlyArray<number> = [KLING25_SHOT_SECONDS, KLING25_LONG_SHOT_SECONDS]

/**
 * [TRAVA 8.2 — "vai" do 3x6] KINEO-SEEDANCE-15S-3X6-2026-09-29 — o mesmo alinhamento com os passos do motor como
 * parâmetro. O Kling 2.5 continua em alignSignedClipSeconds (passos 5|10, comportamento idêntico: \`includes\` com os dois
 * valores ≡ o \`!== 5 && !== 10\` de antes); o Seedance 1.5 a 15 s chama com {6, 7, 8} (lib/durationByEngine).
 */
export function alignSignedClipSecondsWith(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
  steps: ReadonlyArray<number>,
): number[] | null {
  const raw = response ? response.clip_seconds : undefined`)
troca(`    const s = raw[i]
    if (s !== KLING25_SHOT_SECONDS && s !== KLING25_LONG_SHOT_SECONDS) return null
    if (clipUrls[out.length] !== url) return null
    out.push(s)`, `    const s = raw[i]
    if (typeof s !== 'number' || !steps.includes(s)) return null
    if (clipUrls[out.length] !== url) return null
    out.push(s)`)
troca(`export function alignSignedClipPlan(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): { seconds: number[]; wordStarts: number[] | null; narrationWords: string[] } | null {
  const seconds = alignSignedClipSeconds(response, authorizedUrls, clipUrls)`, `export function alignSignedClipPlan(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
): { seconds: number[]; wordStarts: number[] | null; narrationWords: string[] } | null {
  return alignSignedClipPlanWith(response, authorizedUrls, clipUrls, KLING25_SIGNED_STEPS)
}

/** [TRAVA 8.2 — "vai" do 3x6] O plano assinado inteiro com os passos do motor como parâmetro (ver alignSignedClipSecondsWith). */
export function alignSignedClipPlanWith(
  response: Record<string, unknown> | null | undefined,
  authorizedUrls: ReadonlyArray<string | null>,
  clipUrls: ReadonlyArray<string>,
  steps: ReadonlyArray<number>,
): { seconds: number[]; wordStarts: number[] | null; narrationWords: string[] } | null {
  const seconds = alignSignedClipSecondsWith(response, authorizedUrls, clipUrls, steps)`)
export function desfaz3x6KlingShots(src) {
  let s = String(src ?? '').split(String.fromCharCode(13) + LF).join(LF)
  for (const [antes, depois] of PARES) {
    if (s.split(depois).length - 1 !== 1) return null
    s = s.split(depois).join(antes)
  }
  return s
}
