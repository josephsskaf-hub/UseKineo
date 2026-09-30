// KINEO-CLIPES-2026-09-29 — /clips: um clipe de 5–15 s, uma cena, sem narração, em qualquer motor que a conta pode usar.
// Interruptor de lançamento (lib/clips/clipLaunch.ts): antes do "vai" do fundador sobre o preço, só a casa abre a página.
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clipsVisible } from '@/lib/clips/clipLaunch'
import ClipsClient from './ClipsClient'

export const metadata = { title: 'Clips — Kineo' }
export const dynamic = 'force-dynamic'

export default async function ClipsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!clipsVisible(user?.email ?? null)) notFound()
  return <ClipsClient />
}
