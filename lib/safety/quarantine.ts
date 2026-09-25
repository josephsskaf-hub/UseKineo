// KINEO-QUARENTENA-2026-09-25 — tirar um arquivo do ar SEM apagar: move para o bucket PRIVADO "quarantine".
//
// POR QUÊ: todos os buckets da casa são públicos (avatars, broll, music, renders, stock-videos, user-footage, voiceovers);
// mover para outra pasta do mesmo bucket só troca a URL — o arquivo segue legível por quem tiver o endereço. A sessão
// Research criou em 25/09 o bucket "quarantine" com public=false (só a chave de serviço lê). Prova de incidente fica lá;
// apagar é decisão do fundador (e do advogado).
// Servidor apenas: recebe o cliente com a chave de serviço de quem chama.

import type { SupabaseClient } from '@supabase/supabase-js'

export const QUARANTINE_BUCKET = 'quarantine'

/** Caminho dentro do bucket de quarentena: <etiqueta>/<bucket de origem>/<caminho original> — nada se sobrepõe. */
export function quarantinePath(label: string, fromBucket: string, fromPath: string): string {
  const safeLabel = label.replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'sem-etiqueta'
  return `${safeLabel}/${fromBucket}/${fromPath.replace(/^\/+/, '')}`
}

export async function quarantineObject(
  admin: SupabaseClient,
  args: { bucket: string; path: string; label: string },
): Promise<{ ok: boolean; to: string; error?: string }> {
  const to = quarantinePath(args.label, args.bucket, args.path)
  const { error } = await admin.storage.from(args.bucket).move(args.path, to, { destinationBucket: QUARANTINE_BUCKET })
  return error ? { ok: false, to, error: error.message } : { ok: true, to }
}
