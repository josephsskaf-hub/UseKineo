// KINEO-TETO-K4-GRATIS-1111 [CEO 11/11: "SIM: siga com (a) + (c)"] — o teto de tentativas do Kling 4 grátis.
//
// O CASO REAL (08/11, 15h–21h UTC, fal sem saldo): 2 pessoas reais (RO e FR, 1 conta por aparelho) somaram 51 tentativas e
// 20 reservas de US$ 2,355 (o teto do dia encheu: 58,88 de 60). Uns 8 envios foram cliques delas; uns 43 foram do NOSSO robô
// da fila (cron resume-parked-renders), que refazia o pedido a cada 5–10 min com um id novo 'parked-…' — e cada volta pedia
// uma reserva nova. A rota não via repetição porque toda falha estornava o débito e não deixava vídeo: a conta voltava a ser
// "primeiro filme". Gasto real ≈ US$ 0 (a fal recusou tudo por balance_quota); o dano foi o teto do dia comido por duas contas.
//
// AS DUAS REGRAS (só decidem se o filme grátis vai ao Kling 4; quem não vai recebe o MESMO filme grátis no motor barato — hoje
// o H3 Max Turbo, KINEO-SEEDANCE-SAI-1111 — sem recusa, sem aviso):
//   (a) retomada do robô (modo serviço da rota, ou pedido 'parked-…') NUNCA reserva Kling 4 — para toda conta;
//   (c) no máximo KLING4_GRATIS_TETO_ENVIOS envio de Kling 4 por conta E por digital de aparelho a cada 24 h, contando QUALQUER
//       envio que chegou a reservar (inclusive o que falhou por culpa nossa: a pessoa não perde o filme, ganha o motor barato).
//       Conta paga e conta da casa ficam FORA do teto (a casa testa à vontade; paga nunca é candidata ao grátis).
//   Leitura que falhou = motor barato (nunca autoriza um envio pago sem prova), motivo 'sem_leitura'.
//
// MÓDULO PURO (sem import): a rota (via lib/kling4GratisTetoServer.ts) e o guardião (scripts/test-teto-k4-gratis-1111.mjs)
// leem as MESMAS regras.

/** Interruptor. 'on' = as duas regras valem · 'off' = nada muda, nenhuma leitura a mais. Nasce 'on' (ordem da CEO). */
export const KLING4_GRATIS_TETO_1111: 'on' | 'off' = 'on'
export const KLING4_GRATIS_TETO_VERSION = 'kling4_teto_v1_1111' as const
/** Evento de SERVIDOR (está em SERVER_ONLY_EVENTS de app/api/events/route.ts): um por desvio, com o motivo. */
export const KLING4_GRATIS_TETO_EVENT = 'kling4_trial_capped' as const
export const KLING4_GRATIS_TETO_HORAS = 24
/** Envios de Kling 4 grátis permitidos por conta e por aparelho dentro da janela. */
export const KLING4_GRATIS_TETO_ENVIOS = 1
/** O id que o robô da fila dá à retomada (lib/filaQuedaFal.ts PARKED_RESUME_PREFIX — espelho literal, módulo sem import). */
export const KLING4_GRATIS_TETO_PREFIXO_ROBO = 'parked-'
/** O motor barato que recebe o filme desviado (só rótulo do evento; quem decide o motor é a rota). */
export const KLING4_GRATIS_TETO_DESTINO = 'h3_max_turbo' as const

export type Kling4TetoMotivo = 'retomada_do_robo' | 'teto_conta_24h' | 'teto_aparelho_24h' | 'sem_leitura'

export interface Kling4TetoProva {
  /** a chamada veio do robô da fila (modo serviço) ou o pedido é uma retomada 'parked-…' */
  robo: boolean
  /** conta da casa (lista exata) */
  casa: boolean
  /** conta paga (has_paid/plano pago) */
  pago: boolean
  /** envios de Kling 4 grátis DESTA conta na janela (reservas de US$ 2,355); null = leitura falhou */
  enviosConta: number | null
  /** envios de Kling 4 grátis de OUTRAS contas na mesma digital de aparelho na janela; null = leitura falhou */
  enviosAparelho: number | null
}

/** É uma retomada do robô? Modo serviço da rota OU id 'parked-…'. */
export function kling4TetoEhRobo(a: { modoServico: boolean; generationId: unknown }): boolean {
  return a.modoServico === true || (typeof a.generationId === 'string' && a.generationId.startsWith(KLING4_GRATIS_TETO_PREFIXO_ROBO))
}

/** null = pode ir ao Kling 4 · motivo = o filme grátis sai no motor barato. A ordem importa: o robô vem antes de tudo. */
export function kling4GratisTetoMotivo(p: Kling4TetoProva): Kling4TetoMotivo | null {
  if (p.robo === true) return 'retomada_do_robo'
  if (p.casa === true || p.pago === true) return null
  if (typeof p.enviosConta !== 'number' || !Number.isFinite(p.enviosConta)) return 'sem_leitura'
  if (p.enviosConta >= KLING4_GRATIS_TETO_ENVIOS) return 'teto_conta_24h'
  if (typeof p.enviosAparelho !== 'number' || !Number.isFinite(p.enviosAparelho)) return 'sem_leitura'
  if (p.enviosAparelho >= KLING4_GRATIS_TETO_ENVIOS) return 'teto_aparelho_24h'
  return null
}

/** Início da janela (ISO), a partir de agora. */
export function kling4TetoDesde(nowMs: number): string {
  return new Date(Math.max(nowMs - KLING4_GRATIS_TETO_HORAS * 3_600_000, 0)).toISOString()
}
