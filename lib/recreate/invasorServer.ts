// KINEO-INVASOR-DE-CAMPO-1511 — os arquivos PRIVADOS dos moldes de vários trechos (trechos, som e cartão) no bucket `quarantine` (./invasorMolde).
// Só do servidor. As URLs assinadas saem só para quem chama (a entrada da fal, a montagem, o 302 do cartão): nenhuma função daqui as escreve em evento
// ou log. Sem import 'server-only' de propósito (o clipServer importa este módulo e os guardiões o carregam num loader sem esse dublê).
// KINEO-REMODELAMENTO-MOLDES-1611 — por molde (o registro MOLDES_DE_TRECHOS): era só o Pitch invader.
import type { SupabaseClient } from '@supabase/supabase-js'
import { INVASOR_BUCKET, INVASOR_PASTA, invasorArquivoDaVitrine, invasorCaminho, type ArquivoDoMolde, type MoldeDeTrechos } from './invasorMolde'

/** 1 h: a fal e o Creatomate baixam dentro disso (a fila espera no máximo 15 min; a montagem leva segundos). */
export const INVASOR_ASSINATURA_S = 60 * 60

async function assinar(admin: SupabaseClient, a: ArquivoDoMolde | null | undefined, segundos: number): Promise<string | null> {
  if (!a) return null
  try {
    const { data, error } = await admin.storage.from(INVASOR_BUCKET).createSignedUrl(invasorCaminho(a), segundos)
    return error || !data?.signedUrl ? null : data.signedUrl
  } catch {
    return null
  }
}
export const assinarTrechoDoInvasor = (admin: SupabaseClient, molde: Pick<MoldeDeTrechos, 'trechos'>, i: number, segundos = INVASOR_ASSINATURA_S) => assinar(admin, molde.trechos[i], segundos)
export const assinarSomDoInvasor = (admin: SupabaseClient, molde: Pick<MoldeDeTrechos, 'som'>, segundos = INVASOR_ASSINATURA_S) => assinar(admin, molde.som, segundos)
export const assinarVitrineDoInvasor = (admin: SupabaseClient, nome: string, segundos = 60) => assinar(admin, invasorArquivoDaVitrine(nome), segundos)

/** Todos os arquivos do molde estão no privado com o tamanho do manifesto? Conferido ANTES do débito (falta = recusa limpa, nada cobrado). Nunca lança. */
export async function invasorArquivosPresentes(admin: SupabaseClient, molde: Pick<MoldeDeTrechos, 'id' | 'trechos' | 'som'>): Promise<boolean> {
  try {
    const { data, error } = await admin.storage.from(INVASOR_BUCKET).list(INVASOR_PASTA, { search: `recreate-${molde.id}-`, limit: 50 })
    if (error) return false
    const tamanho = new Map((data ?? []).map((x) => [x.name, Number((x as { metadata?: { size?: unknown } | null }).metadata?.size)]))
    return [...molde.trechos, molde.som].every((a) => tamanho.get(a.arquivo) === a.bytes)
  } catch {
    return false
  }
}
