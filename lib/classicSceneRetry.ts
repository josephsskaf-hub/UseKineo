// ═══ KINEO-CENA-CLASSICA-2026-09-28 — a retomada de cena CLÁSSICA (Seedance 1.5, Kling 2.5, Veo 3.1) nunca prende o filme ═══
// Revisão adversarial de 27/09, rodando o POST real da retomada contra um claim clássico assinado (Seedance i2v, 1 de 2
// cenas pronta): a fal respondeu 503 e a rota deixou o mutex do compose PRESO na fase 'ambiguous' (422
// scene_retry_unresolved). Daí em diante o compose respondia 422 "Contact support" a cada tentativa, o cron de resgate lia
// a linha como "a pessoa compôs sozinha" (user_finished_themselves) e o refund-sweep a lia como ambígua (compose sem
// render_id) — filme nunca entregue e os 25 cr nunca devolvidos. Erro de transporte, retarget que falha, liberação que
// falha e lambda morta no meio davam o mesmo. Na origin/main esse filme saía com N-1 cenas.
// A regra de "segurar até alguém confirmar" é da família hollywood (cena de fala não tem substituta). Na clássica a cena
// perdida é SOBREVIVÍVEL: a retomada solta o mutex e o compose monta com as prontas; se nem a liberação confirmar, o
// compose (e o cron, por ele) desfaz o hold clássico. Frequência medida: 0 envios ambíguos em 1.669 POSTs de nascimento
// em 30 dias (cinematic_dispatch_result) — mas a retomada dispara justamente quando a fal está mal, e estes são os motores
// de 100% das primeiras impressões.
// Lib PURA (sem import): a rota de retomada, o compose e o cron de resgate leem daqui a mesma régua.

// Os 6 ids clássicos — ESPELHO de app/api/cinematic-clip-status/route.ts (mexeu lá, mexe aqui; o guardião
// scripts/test-cena-classica-retentativa-2026-09-28.mjs compara os dois).
export const SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
export const SEEDANCE_I2V_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
export const KLING_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
export const KLING_I2V_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
export const VEO_MODEL = 'fal-ai/veo3.1/fast'
export const VEO_I2V_MODEL = 'fal-ai/veo3.1/fast/image-to-video'
export const CLASSIC_I2V: ReadonlySet<string> = new Set<string>([SEEDANCE_I2V_MODEL, KLING_I2V_MODEL, VEO_I2V_MODEL])
export const CLASSIC: ReadonlySet<string> = new Set<string>([SEEDANCE_MODEL, KLING_MODEL, VEO_MODEL, ...CLASSIC_I2V])

// A janela em que um marcador 'submitting' ainda pode ter dono vivo — o MESMO número do compose, do /api/compose/active
// e da própria retomada. A retomada tem maxDuration 60 e prazos internos (OpenAI 20 s, POST clássico 25 s): um
// 'submitting' clássico com mais de 120 s é de lambda morta.
export const SCENE_RETRY_SUBMIT_WINDOW_MS = 120_000

/** O marcador scene_retry é de um motor clássico? O modelo vai DENTRO do marcador assinado (HMAC de lib/cinematic/sceneRetry). */
export function classicSceneRetryMarker(marker: unknown): boolean {
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return false
  const model = (marker as Record<string, unknown>).model
  return typeof model === 'string' && CLASSIC.has(model)
}

/** Hold clássico que pode ser desfeito: fase final (a retomada já saiu da rota) ou 'submitting' fora da janela (lambda
 * morta). Hollywood nunca: lá o hold continua esperando confirmação humana. */
export function classicSceneRetryHoldResolvable(marker: unknown, phase: string, elapsedMs: number): boolean {
  if (!classicSceneRetryMarker(marker)) return false
  return phase !== 'submitting' || !Number.isFinite(elapsedMs) || Math.abs(elapsedMs) >= SCENE_RETRY_SUBMIT_WINDOW_MS
}

/** Linha de compose_submission_claim que é só o mutex de uma retomada CLÁSSICA (nenhum render final nasceu sob ela). */
export function classicSceneRetryHoldRow(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
  const md = metadata as Record<string, unknown>
  const renderId = typeof md.render_id === 'string' ? md.render_id.trim() : ''
  return !renderId && md.status === 'pending' && classicSceneRetryMarker(md.scene_retry)
}
