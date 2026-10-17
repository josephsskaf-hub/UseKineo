// KINEO-FILME-RAPIDO-1710 — UMA rodada de cada cron por vez.
//
// Com os crons de resgate a cada 1 min (eram 5), uma rodada lenta (3 composes em processo ≈ 2–3 min) se sobreporia à
// seguinte: duas rodadas olhando o MESMO filme ao mesmo tempo. O compose já é idempotente (claim determinístico por
// geração: o segundo recebe 409/replay e nunca monta de novo), mas o resto da rodada não é de graça — marcador de
// tentativa contado em dobro (o teto de 2 chegaria antes e mandaria o e-mail de resgate cedo), aviso de "pronto"
// disputado, estorno de clipe pedido duas vezes.
//
// A trava é uma linha em `events` com id DETERMINÍSTICO por cron (a chave primária é o juiz: o 2º insert recebe 23505)
// e prazo de validade gravado nela. Rodada que morre no meio (lambda morta) não prende o cron: vencido o prazo, a
// próxima apaga SÓ aquela linha (mesmo dono) e toma a vez. Erro de banco = não roda (falha fechada; o próximo minuto
// tenta de novo). Sem import de projeto: o guardião (scripts/test-filme-rapido-1710.mjs) executa este arquivo.
import { createHash, randomUUID } from 'node:crypto'

export const CRON_LEASE_EVENT = 'cron_lease'
export const CRON_LEASE_PATH = '/lib/cronLease'

type Resposta<T> = PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>
// Só o pedaço do supabase-js que a trava usa (o tipo de verdade é estrutural; o guardião passa um banco falso).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BancoDaTrava = { from(tabela: 'events'): any }

export type VezDoCron =
  | { ok: true; dono: string; liberar: () => Promise<void> }
  | { ok: false; motivo: 'ocupada' | 'erro_de_banco' }

/** id em formato UUID, o mesmo para todas as rodadas do mesmo cron. */
export function idDaVez(nome: string): string {
  const hex = createHash('sha256').update(`kineo:cron-lease:v1:${nome}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export async function tomarVezDoCron(db: BancoDaTrava, nome: string, ttlMs: number, agora: number = Date.now()): Promise<VezDoCron> {
  const id = idDaVez(nome)
  const dono = randomUUID()
  const liberar = async (): Promise<void> => {
    try {
      await (db.from('events').delete().eq('id', id).eq('metadata->>dono', dono) as Resposta<unknown>)
    } catch { /* a linha vence sozinha no prazo */ }
  }
  const linha = {
    id,
    name: CRON_LEASE_EVENT,
    path: CRON_LEASE_PATH,
    metadata: { cron: nome, dono, expira_em: new Date(agora + ttlMs).toISOString(), versao: 'filme_rapido_1710' },
  }
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const ins = await (db.from('events').insert(linha) as Resposta<unknown>)
    if (!ins.error) return { ok: true, dono, liberar }
    if (ins.error.code !== '23505') return { ok: false, motivo: 'erro_de_banco' }
    const atual = await (db.from('events').select('metadata').eq('id', id).maybeSingle() as Resposta<{ metadata?: Record<string, unknown> | null }>)
    if (atual.error) return { ok: false, motivo: 'erro_de_banco' }
    if (!atual.data) continue // liberada entre o insert e a leitura: tenta de novo
    const md = atual.data.metadata ?? {}
    const expira = Date.parse(String(md.expira_em ?? ''))
    if (Number.isFinite(expira) && expira > agora) return { ok: false, motivo: 'ocupada' }
    // Vencida (rodada morta): apaga só ESTA linha, do dono que a gravou, e tenta tomar de novo.
    const del = await (db.from('events').delete().eq('id', id).eq('metadata->>dono', String(md.dono ?? '')) as Resposta<unknown>)
    if (del.error) return { ok: false, motivo: 'erro_de_banco' }
  }
  return { ok: false, motivo: 'ocupada' }
}
