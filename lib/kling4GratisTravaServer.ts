// KINEO-TRAVA-K4-GRATIS-1111 — o lado de servidor da trava do Kling 4 grátis (regras em lib/kling4GratisTrava.ts). Lê, com a
// chave de serviço: a digital de aparelho desta conta (trial_signup_fingerprints, gravada pelo servidor no cadastro), as
// ativações de OUTRAS contas na mesma digital antes dela (30 dias) e as caixas que já receberam um Kling 4 grátis
// (kling4_trial_films → profiles.email, normalizadas). A cada desvio grava UM evento de servidor com os motivos. Nunca lança.
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { isInternalEmail } from '@/lib/internalAccounts'
import {
  KLING4_GRATIS_DESVIO_EVENT,
  KLING4_GRATIS_DIGITAL_JANELA_DIAS,
  KLING4_GRATIS_TRAVA_1111,
  KLING4_GRATIS_TRAVA_VERSION,
  caixaNormalizada,
  kling4GratisMotivos,
  type Kling4GratisProva,
} from '@/lib/kling4GratisTrava'

const FATIA = 200

async function lerProva(db: SupabaseClient, userId: string, email: string | null, now: number): Promise<Kling4GratisProva> {
  let outrasNaDigitalAntes: number | null = null
  let caixasQueJaReceberam: string[] | null = null
  try {
    const mine = await db.from('trial_signup_fingerprints').select('fingerprint_hash, created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(1)
    if (!mine.error) {
      const row = Array.isArray(mine.data) ? (mine.data[0] as { fingerprint_hash?: string | null; created_at?: string | null } | undefined) : undefined
      if (!row?.fingerprint_hash || !row.created_at) outrasNaDigitalAntes = 0 // sem digital gravada = sem sinal (a postura da casa: na dúvida, conceder)
      else {
        const desde = new Date(Math.max(now - KLING4_GRATIS_DIGITAL_JANELA_DIAS * 86_400_000, 0)).toISOString()
        const outras = await db.from('trial_signup_fingerprints').select('user_id', { count: 'exact', head: true })
          .eq('fingerprint_hash', row.fingerprint_hash).eq('outcome', 'activated').neq('user_id', userId)
          .gte('created_at', desde).lt('created_at', row.created_at)
        outrasNaDigitalAntes = outras.error || typeof outras.count !== 'number' ? null : outras.count
      }
    }
  } catch { outrasNaDigitalAntes = null }
  try {
    const films = await db.from('kling4_trial_films').select('user_id').eq('engine_used', 'kling4').neq('user_id', userId).limit(5000)
    if (!films.error && Array.isArray(films.data)) {
      const ids = [...new Set((films.data as Array<{ user_id?: string | null }>).map((r) => r.user_id).filter((x): x is string => typeof x === 'string'))]
      const caixas: string[] = []
      let ok = true
      for (let i = 0; i < ids.length && ok; i += FATIA) {
        const prof = await db.from('profiles').select('email').in('id', ids.slice(i, i + FATIA))
        if (prof.error || !Array.isArray(prof.data)) { ok = false; break }
        for (const r of prof.data as Array<{ email?: string | null }>) { const c = caixaNormalizada(r.email); if (c) caixas.push(c) }
      }
      caixasQueJaReceberam = ok ? caixas : null
    }
  } catch { caixasQueJaReceberam = null }
  return { email, outrasNaDigitalAntes, caixasQueJaReceberam }
}

/** A conta candidata ao Kling 4 grátis PASSA na trava? false = o filme grátis sai no motor barato (sem recusa). A casa passa
 *  sempre; 'off' passa sempre (nenhuma leitura). */
export async function kling4GratisPassaNaTrava(db: SupabaseClient, a: { userId: string; email: string | null | undefined; now?: number }): Promise<boolean> {
  if (KLING4_GRATIS_TRAVA_1111 === 'off') return true
  const email = typeof a.email === 'string' ? a.email : null
  if (isInternalEmail(email)) return true
  const prova = await lerProva(db, a.userId, email, a.now ?? Date.now())
  const motivos = kling4GratisMotivos(prova)
  if (motivos.length === 0) return true
  await writeServerEvent({
    name: KLING4_GRATIS_DESVIO_EVENT,
    userId: a.userId,
    path: '/api/generate-video-cinematic',
    metadata: { motivos, digital_outras: prova.outrasNaDigitalAntes, version: KLING4_GRATIS_TRAVA_VERSION },
  })
  return false
}
