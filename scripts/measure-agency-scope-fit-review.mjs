#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT } from './agency-production-scope-contract.mjs'
import { collectB2bFitReviewSubscription } from './measure-b2b-fit-review-subscription.mjs'

export function collectAgencyScopeFitReview({
  db,
  generatedAt = new Date(),
  collector = collectB2bFitReviewSubscription,
}) {
  return collector({
    db,
    generatedAt,
    contract: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview,
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  }
  const db = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const report = await collectAgencyScopeFitReview({ db })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
