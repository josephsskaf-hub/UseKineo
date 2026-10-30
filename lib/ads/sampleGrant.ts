// KINEO-ADS-LIBERA-3010 — fundador 30/10: "vamos liberar essas 31 pessoas que tentaram". 32 contas de regiões sem filme grátis
// (trial_status 'region_paid_only': Índia, Paquistão, Turquia, África…) chegaram em /ads e bateram no muro de assinante, porque o
// antifarm da amostra (lib/ads/sample.ts) também barra essa região. A liberação é NOMINAL: só quem está na tabela
// public.ads_sample_grants (escrita pela casa, nunca pelo navegador) passa; o resto da região segue como antes. As outras travas
// continuam valendo: e-mail verificado e não descartável, 1 amostra por conta e o teto do dia.

type Leitor = { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> } } } }

/** A conta foi liberada à mão para a amostra apesar da região? Erro de leitura = false (falha fechada, como o resto da amostra). */
export async function amostraLiberadaNominal(admin: unknown, userId: string): Promise<boolean> {
  try {
    const r = await (admin as Leitor).from('ads_sample_grants').select('user_id').eq('user_id', userId).maybeSingle()
    return !r.error && !!r.data
  } catch {
    return false
  }
}

/** Só a região é liberável pela lista; conta marcada como descartável/digital repetida ('blocked') nunca. */
export function trialStatusLiberavelPelaLista(status: unknown): boolean {
  return status === 'region_paid_only'
}
