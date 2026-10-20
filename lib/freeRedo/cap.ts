// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — o TETO GLOBAL de refações grátis
// por dia (Filmes + Ads + UGC), que é o teto de custo da promessa "refazemos 1× de graça".
//
// Cada refação grátis ocupa UMA vaga do dia: uma linha em `events` com id DETERMINÍSTICO capSlotId(dia, k), k < teto.
// Como só existem `teto` ids possíveis por dia, nunca existem mais que `teto` vagas ocupadas — nem com 10 instâncias
// clicando juntas (a PK recusa o 2º insert do mesmo id: 23505, e a instância tenta a próxima vaga livre). Linha com o nome
// do evento escrita por outro caminho (o /api/events aceita qualquer nome do navegador, mas não escolhe o id) não ocupa
// vaga: a contagem é pelos ids, não pelo nome. Leitura que falha = recusa (fecha para o lado do custo).
import type { SupabaseClient } from '@supabase/supabase-js'
import { CAP_SLOT_EVENT, FREE_REDO_DAILY_CAP, capSlotIds, utcDay } from '@/lib/freeRedo/core'

export type VagaDoDia =
  | { ok: true; slotId: string; k: number; day: string }
  | { ok: false; motivo: 'teto' | 'indisponivel'; day: string }

const LOTE = 50
const TENTATIVAS = 8

export async function reservarVagaDoDia(db: SupabaseClient, a: {
  userId: string
  product: 'film' | 'ads' | 'ugc'
  ref: string
  path: string
  nowMs: number
  cap?: number
}): Promise<VagaDoDia> {
  const day = utcDay(a.nowMs)
  const ids = capSlotIds(day, a.cap ?? FREE_REDO_DAILY_CAP)
  const usados = new Set<string>()
  try {
    for (let i = 0; i < ids.length; i += LOTE) {
      const { data, error } = await db.from('events').select('id').in('id', ids.slice(i, i + LOTE))
      if (error) return { ok: false, motivo: 'indisponivel', day }
      for (const row of (data ?? []) as Array<{ id?: unknown }>) if (typeof row.id === 'string') usados.add(row.id)
    }
  } catch {
    return { ok: false, motivo: 'indisponivel', day }
  }
  let tentativas = 0
  for (let k = 0; k < ids.length && tentativas < TENTATIVAS; k++) {
    if (usados.has(ids[k])) continue
    tentativas++
    try {
      const { error } = await db.from('events').insert({
        id: ids[k], user_id: a.userId, name: CAP_SLOT_EVENT, path: a.path, session_id: day,
        metadata: { product: a.product, ref: a.ref, slot: k, day },
      })
      if (!error) return { ok: true, slotId: ids[k], k, day }
      if ((error as { code?: string }).code !== '23505') return { ok: false, motivo: 'indisponivel', day }
    } catch {
      return { ok: false, motivo: 'indisponivel', day }
    }
  }
  return { ok: false, motivo: tentativas >= TENTATIVAS ? 'indisponivel' : 'teto', day }
}
