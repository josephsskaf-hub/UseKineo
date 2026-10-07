import { writeServerEvent } from '../serverEvents'

export const POSTGREST_PAGE_SIZE = 1000

// Primary keys of admin/lifecycle tables without `id` (also verified in pg_index).
const TABLE_KEYS: Record<string, readonly string[]> = {
  credit_debits: ['render_id'],
  render_jobs: ['render_id'],
  trial_debit_ledger: ['render_id'],
  trial_emails_log: ['user_id', 'email_kind'],
  avatar_jobs: ['request_id'],
}

export type ReadContext = {
  route: string
  table: string
  /** Unique key (or every column of a composite key), appended as tie-breaker. */
  key?: string | readonly string[]
}

type ReadError = { message: string; code?: string }
type ReadResult<T> = { data: T[] | null; error: ReadError | null }
type ReadQuery<T> = PromiseLike<ReadResult<T>> & {
  order(column: string, options: { ascending: boolean }): ReadQuery<T>
  range(from: number, to: number): ReadQuery<T>
}

/** Observe an intentionally unpaginated read. A full response is suspicious,
 * even if the real table happens to contain exactly 1000 rows. No row/PII in telemetry.
 */
export async function readUnpaginated<R extends ReadResult<unknown>>(
  query: PromiseLike<R>,
  context: ReadContext,
): Promise<R> {
  const result = await query
  if (result.data?.length === POSTGREST_PAGE_SIZE) {
    const metadata = { route: context.route, table: context.table, rows: POSTGREST_PAGE_SIZE }
    console.warn('[admin_read_truncated]', metadata)
    // Await the write: a serverless invocation can end as soon as its response is sent.
    await writeServerEvent({ name: 'admin_read_truncated', path: context.route, metadata })
  }
  return result
}

/** Read the complete filtered set. Build a FRESH select for every page.
 * Keep business ordering; append a unique key so ties cannot shuffle across pages.
 * Do not pass .limit(), .range(), .single(), mutations or embedded-table ordering.
 * Errors throw before any partial data can reach a metric or an email suppression set.
 * Offset pagination assumes a stable set while reading; it is not a DB snapshot.
 */
export async function readAll<T>(
  build: () => ReadQuery<T>,
  context: ReadContext,
): Promise<ReadResult<T>> {
  const rows: T[] = []
  const keys = typeof context.key === 'string' ? [context.key] : context.key ?? TABLE_KEYS[context.table] ?? ['id']
  if (keys.length === 0) throw new Error('readAll requires a unique ordering key')
  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    let query = build()
    for (const key of keys) query = query.order(key, { ascending: true })
    const { data, error } = await query.range(from, from + POSTGREST_PAGE_SIZE - 1)
    if (error || !Array.isArray(data)) {
      throw new Error(`[readAll] ${context.route} ${context.table} page ${from}: ${error?.message ?? 'missing data'}`)
    }
    rows.push(...data)
    if (data.length < POSTGREST_PAGE_SIZE) return { data: rows, error: null }
  }
}
