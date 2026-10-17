// KINEO-FILME-RAPIDO-1710 — trabalho que roda DEPOIS da resposta (docs/AUDITORIA-VELOCIDADE-2026-10-17.md, G3/V3).
//
// O Next 14.2.5 não tem `after()` e o @vercel/functions não está instalado. A Vercel expõe o MESMO waitUntil que o
// @vercel/functions usa num símbolo global por requisição (`Symbol.for('@vercel/request-context')`): é dele que este
// arquivo lê. Sem o contexto (dev local, teste, runtime diferente) não há waitUntil e `depoisDaResposta` devolve false —
// o chamador então faz o trabalho ANTES de responder, exatamente como sempre fez. O pior caso é o de ontem.
//
// Sem import nenhum de propósito: o guardião (scripts/test-filme-rapido-1710.mjs) executa este arquivo de verdade.

const CONTEXTO_DA_VERCEL = Symbol.for('@vercel/request-context')

type ContextoDaRequisicao = { waitUntil?: (p: Promise<unknown>) => void }
type FonteDoContexto = { get?: () => ContextoDaRequisicao | undefined }

/** O waitUntil da requisição em curso, ou null quando o runtime não oferece. Nunca lança. */
export function waitUntilDaRequisicao(): ((p: Promise<unknown>) => void) | null {
  try {
    const fonte = (globalThis as unknown as Record<symbol, FonteDoContexto | undefined>)[CONTEXTO_DA_VERCEL]
    const ctx = typeof fonte?.get === 'function' ? fonte.get() : undefined
    const fn = ctx?.waitUntil
    if (typeof fn !== 'function') return null
    return (p: Promise<unknown>) => fn.call(ctx, p)
  } catch {
    return null
  }
}

/** true quando dá para deixar trabalho para depois da resposta nesta requisição. */
export function podeAdiarParaDepoisDaResposta(): boolean {
  return waitUntilDaRequisicao() !== null
}

/**
 * Agenda `tarefa` para depois da resposta. Devolve true se agendou; false se o runtime não deixa (o chamador faz inline).
 * O erro da tarefa nunca escapa (vira log com o rótulo): trabalho de fundo não derruba nada.
 */
export function depoisDaResposta(rotulo: string, tarefa: () => Promise<unknown>): boolean {
  const waitUntil = waitUntilDaRequisicao()
  if (!waitUntil) return false
  const promessa = (async () => {
    try {
      await tarefa()
    } catch (e) {
      console.warn(`[pos-resposta] ${rotulo} falhou:`, e instanceof Error ? e.message : String(e))
    }
  })()
  try {
    waitUntil(promessa)
  } catch {
    // O contexto sumiu entre a leitura e a entrega: a promessa já está correndo; segue como fogo-e-esquece.
  }
  return true
}

/** URL de entrega que vive no fornecedor (Creatomate/Backblaze) — expira; o nosso bucket não. */
export function ehUrlDoFornecedor(url: unknown): boolean {
  return typeof url === 'string' && /backblazeb2\.com|creatomate/i.test(url)
}
