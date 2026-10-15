'use client'

// KINEO-PAYWALL-FILME-PRIMEIRO-1510 — o perfil da PRÓPRIA conta (RLS: só o dono lê a linha), lido só quando a caixa de planos
// precisa saber se a conta nasceu 'region_paid_only' (0 filmes e nenhum filme grátis do teste). É a mesma leitura que o
// ConversionPricingEntry já faz no /pricing. undefined = lendo; null = sem sessão ou erro (a caixa de hoje).
// Módulo próprio de propósito: o guardião scripts/test-paywall-filme-primeiro-1510.mjs troca só esta leitura (rede) por uma
// resposta fixa e renderiza a caixa real.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type OwnRegionProfile = { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null }

export function useOwnRegionProfile(enabled: boolean): OwnRegionProfile | null | undefined {
  const [profile, setProfile] = useState<OwnRegionProfile | null | undefined>(enabled ? undefined : null)
  useEffect(() => {
    if (!enabled) { setProfile(null); return }
    let alive = true
    setProfile(undefined)
    const client = createClient()
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) { if (alive) setProfile(null); return }
      const { data: row, error } = await client.from('profiles').select('trial_status,has_paid,plan,video_credits').eq('id', data.user.id).single()
      if (alive) setProfile(error ? null : (row as OwnRegionProfile | null))
    }).catch(() => { if (alive) setProfile(null) })
    return () => { alive = false }
  }, [enabled])
  return profile
}
