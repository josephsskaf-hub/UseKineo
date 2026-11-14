import { createHash } from 'node:crypto'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
// Só do servidor: usa node:crypto e a chave de serviço; nenhum arquivo 'use client' importa este módulo (o guardião confere). Sem import 'server-only'
// de propósito: o lib/clips/clipServer.ts o importa e dezenas de guardiões carregam o clipServer num loader sem esse dublê.
import { GUIAS_BUCKET, GUIAS_LEGADO_BUCKET, GUIAS_LEGADO_PASTA, GUIAS_MANIFESTO, GUIAS_PASTA, guiaCaminho, guiaDoManifesto } from './guiasManifesto'

// KINEO-GUIA-PRIVADO-1411 — o guia do molde de movimento no bucket PRIVADO (ver ./guiasManifesto). Regras da CEO (14/11):
//   · a URL assinada NUNCA vai para evento, log ou resposta ao cliente que não seja o próprio redirecionamento do cartão; aqui ela só é devolvida a quem
//     chama (a entrada da fal e o 302 da rota de assets), e nenhuma função deste módulo a escreve em lugar nenhum;
//   · objeto que falta ou assinatura que falha = o pedido falha ANTES do débito (a rota confere com guiaPresente antes do submitClip).

export const GUIA_EVENTO_FALTANDO = 'recreate_guia_faltando'

/** O cliente de serviço (o mesmo de clipsAdmin), sem puxar o clipServer para a rota de assets. */
export function guiasAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** URL assinada do guia (1 h para a fal; curta para o cartão), ou null. Nunca lança, nunca registra a URL. */
export async function assinarGuia(admin: SupabaseClient, chave: string | undefined | null, segundos: number): Promise<string | null> {
  const caminho = guiaCaminho(chave)
  if (!caminho) return null
  try {
    const { data, error } = await admin.storage.from(GUIAS_BUCKET).createSignedUrl(caminho, segundos)
    return error || !data?.signedUrl ? null : data.signedUrl
  } catch {
    return null
  }
}

/** O guia está no privado com o tamanho do manifesto? (antes do débito). Nunca lança. */
export async function guiaPresente(admin: SupabaseClient, chave: string | undefined | null): Promise<boolean> {
  const g = guiaDoManifesto(chave)
  if (!g) return false
  try {
    const { data, error } = await admin.storage.from(GUIAS_BUCKET).list(GUIAS_PASTA, { search: g.arquivo, limit: 10 })
    if (error) return false
    const item = (data ?? []).find((x) => x.name === g.arquivo) as { name: string; metadata?: { size?: unknown } | null } | undefined
    return !!item && Number(item.metadata?.size) === g.bytes
  } catch {
    return false
  }
}

/** A conferência de hora em hora (varredura dos clipes): todo guia do manifesto presente no privado; o que falta é copiado da cópia pública antiga SÓ
 *  se o sha256 e o tamanho baterem; o que segue faltando vira o evento recreate_guia_faltando (contável). */
export async function conferirGuias(admin: SupabaseClient, evento: (nome: string, metadata: Record<string, unknown>) => Promise<void>): Promise<{ presentes: number; copiados: number; faltando: string[] }> {
  const out = { presentes: 0, copiados: 0, faltando: [] as string[] }
  for (const [chave, g] of Object.entries(GUIAS_MANIFESTO)) {
    if (await guiaPresente(admin, chave)) { out.presentes += 1; continue }
    let motivo = 'ausente'
    try {
      const legado = await admin.storage.from(GUIAS_LEGADO_BUCKET).download(`${GUIAS_LEGADO_PASTA}/${g.arquivo}`)
      if (legado.error || !legado.data) motivo = 'ausente_sem_copia'
      else {
        const bytes = Buffer.from(await legado.data.arrayBuffer())
        const hash = createHash('sha256').update(bytes).digest('hex')
        if (bytes.length !== g.bytes || hash !== g.sha256) motivo = 'copia_divergente'
        else {
          const up = await admin.storage.from(GUIAS_BUCKET).upload(`${GUIAS_PASTA}/${g.arquivo}`, bytes, { contentType: 'video/mp4', upsert: false })
          if (!up.error && (await guiaPresente(admin, chave))) { out.copiados += 1; continue }
          motivo = 'copia_falhou'
        }
      }
    } catch {
      motivo = 'erro'
    }
    out.faltando.push(chave)
    await evento(GUIA_EVENTO_FALTANDO, { guia: chave, arquivo: g.arquivo, motivo }).catch(() => {})
  }
  return out
}
