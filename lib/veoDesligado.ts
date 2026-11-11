// KINEO-VEO-DESLIGA-1711 — a fal desliga os endereços do Veo 3.1 (fal-ai/veo3.1/*) em 17/11/2026.
// O Veo saiu da oferta em 05/11 (KINEO-MOTORES-SAEM-0511). Depois do desligamento, um POST para lá só
// devolve erro: filme travado, anúncio interno pela metade, refação grátis que nunca sai. Esta lib PURA
// (sem import) é a régua única: o envio à fila da fal (lib/falQueue.ts) recusa o endereço ANTES do POST.
// Guardião: scripts/test-veo-desligado-1711.mjs.

/** 17/11/2026 00:00 UTC — antes do expediente da fal em qualquer fuso (folga a favor de não chamar). */
export const VEO_FAL_DESLIGA_EM_MS = Date.UTC(2026, 10, 17, 0, 0, 0)

/** O endereço é do Veo na fal (texto, imagem ou referência; fast ou não)? */
export function ehEnderecoVeo(model: unknown): boolean {
  return typeof model === 'string' && model.trim().toLowerCase().startsWith('fal-ai/veo')
}

/** Chamar este endereço agora bateria num Veo já desligado? */
export function veoDesligado(model: unknown, nowMs: number): boolean {
  return ehEnderecoVeo(model) && (!Number.isFinite(nowMs) || nowMs >= VEO_FAL_DESLIGA_EM_MS)
}
