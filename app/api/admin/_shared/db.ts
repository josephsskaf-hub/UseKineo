// KINEO-ADMIN-CEO-2026-08-03 — shared admin data-access helpers.
//
// Two jobs:
//   1. ONE definition of the admin allowlist + the service-role client, so a
//      new admin screen cannot accidentally ship without the gate.
//   2. fetchAllRows(): PostgREST caps a plain select at db.max_rows (1000 on
//      this project). profiles is already at 910 and events at ~29k, so any
//      un-paged select is a silent truncation waiting to happen — exactly the
//      class of bug that made /admin/users hide every account past #500.

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

/** Admin allowlist — identical to every /api/admin/* route. */
export const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.has((email ?? '').trim().toLowerCase())
}

/**
 * Service-role client. Server-only: the key never leaves the server and is
 * never handed to a client component.
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const CHUNK = 1000
const HARD_CAP = 60_000

export interface InFilter {
  column: string
  values: string[]
}

/** Read an entire table (selected columns) in 1000-row pages. */
export async function fetchAllRows<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  inFilter?: InFilter,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < HARD_CAP; from += CHUNK) {
    const base = admin.from(table).select(columns)
    const query = inFilter ? base.in(inFilter.column, inFilter.values) : base
    const { data, error } = await query.range(from, from + CHUNK - 1)
    if (error) {
      console.warn(`[admin/_shared] ${table} page @${from} failed:`, error.message)
      break
    }
    const batch = (data ?? []) as unknown as T[]
    out.push(...batch)
    if (batch.length < CHUNK) break
  }
  return out
}
