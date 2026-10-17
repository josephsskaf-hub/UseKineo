// KINEO-ADMIN-RAPIDO-1710 — cache curto (em memória, por instância) para as leituras da Stripe do /admin.
//
// POR QUE: o Funil percorria checkout sessions + subscriptions + invoices (até ~100 páginas, em série) a CADA abertura e a
// cada 30 s; a Visão geral percorria até 1000 checkout sessions a cada 60 s. A Stripe é a fonte da verdade, mas a resposta
// dela não muda em minutos o bastante para pagar 5–15 s por tela. Medido 17/10 (docs/AUDITORIA-VELOCIDADE-2026-10-17.md, B).
//
// REGRAS:
//   · só guarda SUCESSO: se a carga lança, nada fica no cache e a próxima abertura tenta de novo (nunca congela um erro);
//   · chamadas simultâneas da mesma chave dividem a MESMA promessa (duas abas abertas = uma leitura);
//   · `unstable_cache` NÃO serve aqui: as rotas do admin têm fetchCache='force-no-store', e no Next 14.2 isso faz o
//     unstable_cache pular a leitura do cache (next/dist/server/web/spec-extension/unstable-cache.js). Por isso, Map.
//   · não é régua de nada: o MRR continua em ./mrr.ts (stripeMrrUsd tem o próprio cache de 5 min).

export const ADMIN_STRIPE_CACHE_TTL_MS = 10 * 60 * 1000

type Entry = { at: number; value: unknown }
const done = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

/** Devolve o valor da chave se tiver menos de `ttlMs`; senão carrega (uma vez só por chave) e guarda se der certo. */
export async function cachedAdminStripe<T>(key: string, load: () => Promise<T>, ttlMs: number = ADMIN_STRIPE_CACHE_TTL_MS): Promise<T> {
  const hit = done.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T
  const running = inflight.get(key)
  if (running) return running as Promise<T>
  const p = (async () => {
    try {
      const value = await load()
      done.set(key, { at: Date.now(), value })
      return value
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

/** Só para teste/diagnóstico: esvazia o cache. */
export function clearAdminStripeCache(): void {
  done.clear()
  inflight.clear()
}
