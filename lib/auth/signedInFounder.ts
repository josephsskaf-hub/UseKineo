import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { isConfirmedFounder } from '@/lib/internalAccounts'

export async function signedInFounder(): Promise<boolean> {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    return isConfirmedFounder(user)
  } catch {
    return false
  }
}
