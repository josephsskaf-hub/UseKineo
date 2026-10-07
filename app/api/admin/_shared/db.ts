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
import { readAll } from '../../../../lib/supabase/readAll'

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

export interface InFilter {
  column: string
  values: string[]
}

/**
 * Read an entire table (selected columns) in 1000-row pages.
 *
 * KINEO-PAINEL-VERDADE-2026-08-27 — the pages are now ORDERED, and that is
 * not cosmetic. `.range(from, to)` becomes OFFSET/LIMIT in Postgres, and
 * OFFSET without ORDER BY has NO defined row order: the planner is free to
 * return the same row on page 0 and page 1, or to skip one entirely. With
 * 1,468 profiles (2 pages) every CEO number downstream — SIGNED UP, MRR,
 * activation, the leak — was riding on undefined behaviour that happened to
 * work. Ordering by each table's primary key makes the paging total and stable.
 */
export async function fetchAllRows<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  inFilter?: InFilter,
  route: string = '/admin',
): Promise<T[]> {
  if (inFilter && inFilter.values.length === 0) return []
  // Compatibility entry point: one implementation, no silent 60k cap or partial result.
  const { data } = await readAll(() => {
    const base = admin.from(table).select(columns)
    return inFilter ? base.in(inFilter.column, inFilter.values) : base
  }, { route, table })
  return data as unknown as T[]
}
