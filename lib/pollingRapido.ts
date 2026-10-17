// KINEO-FILME-RAPIDO-1710 — POLLING MAIS CURTO, COM RECUO (auditoria 17/10, G6/V5).
//
// O cliente perguntava a cada 6 s (cenas do filme, primeiro poll em 4 s), 5 s (montagem), 8 s (Studio Ads) e 6 s sem
// pergunta imediata (Clipes): em média, meio intervalo perdido por fase. Agora a pergunta sai a cada 2,5–3 s nos
// primeiros 2 minutos de cada espera — onde mora o p50 de todas elas — e depois volta ao intervalo de antes, para uma
// espera longa (cauda) não multiplicar as chamadas à Vercel e à fal. Sem import: o guardião executa este arquivo.

/** Janela do polling rápido, contada do começo da espera. */
export const POLL_RAPIDO_JANELA_MS = 2 * 60 * 1000
/** Intervalo rápido do filme (cenas e montagem). */
export const POLL_RAPIDO_FILME_MS = 2500
/** Intervalo rápido do Studio Ads e dos Clipes. */
export const POLL_RAPIDO_ADS_MS = 3000

/** O intervalo da próxima pergunta: rápido até 2 min desde `desdeMs`; depois, o de antes (`depoisMs`). */
export function intervaloDePoll(desdeMs: number, agoraMs: number, rapidoMs: number, depoisMs: number): number {
  if (!Number.isFinite(desdeMs) || !Number.isFinite(agoraMs)) return depoisMs
  const passou = agoraMs - desdeMs
  return passou >= 0 && passou < POLL_RAPIDO_JANELA_MS ? rapidoMs : depoisMs
}
