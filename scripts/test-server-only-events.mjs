#!/usr/bin/env node
// Contrato local do sink /api/events. Não usa rede nem credenciais.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const routeSource = readFileSync(join(root, 'app/api/events/route.ts'), 'utf8')
const animateSource = readFileSync(join(root, 'app/(dashboard)/animate/AnimateClient.tsx'), 'utf8')
const peopleSource = readFileSync(join(root, 'app/api/admin/people/route.ts'), 'utf8')
const personMediaSource = readFileSync(join(root, 'app/api/admin/person-media/route.ts'), 'utf8')

const start = routeSource.indexOf('const SERVER_ONLY_EVENTS = new Set([')
if (start < 0) {
  console.error('SERVER_ONLY_EVENTS não encontrado')
  process.exit(1)
}
const open = routeSource.indexOf('[', start)
const close = routeSource.indexOf('])', open)
if (close < 0) {
  console.error('fim de SERVER_ONLY_EVENTS não encontrado')
  process.exit(1)
}

const literal = routeSource
  .slice(open, close + 1)
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n')

let list
try {
  list = Function(`"use strict"; return (${literal})`)()
} catch (error) {
  console.error('literal inválido:', error instanceof Error ? error.message : error)
  process.exit(1)
}

const serverOnly = new Set(list)
let failures = 0
let checks = 0
function check(label, condition) {
  checks += 1
  if (!condition) {
    failures += 1
    console.error(`x ${label}`)
  }
}

const required = [
  'compose_submission_claim',
  'avatar_submission_claim',
  'cinematic_submission_claim',
  'cinematic_dispatch_result',
  'payment_success',
  'checkout_started',
  'bulk_purchase_completed',
  'animate_submission_claim',
  'animate_job_submitted',
  'animate_job_settled',
  'supplier_alarm_fired',
  'supplier_alarm_reminder',
  'supplier_alarm_cleared',
  'supplier_burn_projection',
  'storage_capacity_threshold',
  'storage_capacity_projection',
  'cap_hit_sent',
  'admin_credits_granted',
  'blackout_winback_sent',
  'compose_refused',
  'hot_upsell_sent',
  'narration_guard_blocked',
  'oneoff_unlock_emailed',
  'trial_downgraded',
]
for (const name of required) check(`server-only cobre ${name}`, serverOnly.has(name))

for (const name of [
  'generation_stage_reached',
  'generation_stage_error',
  'animate_client_poll_observed',
]) {
  check(`${name} continua client-asserted`, !serverOnly.has(name))
}

check('sem duplicatas', list.length === serverOnly.size)
check('todos os nomes são strings não vazias', list.every((name) => typeof name === 'string' && name.length > 0))
check('cliente emite o nome analítico novo', animateSource.includes("trackEvent('animate_client_poll_observed'"))
check('cliente não emite a autoridade financeira', !animateSource.includes("trackEvent('animate_job_settled'"))
check('painel de pessoas preserva o evento novo', peopleSource.includes("'animate_client_poll_observed'"))
check('raio-X de mídia preserva o evento novo', personMediaSource.includes("'animate_client_poll_observed'"))

console.log(failures === 0 ? `${checks}/${checks} verificações OK` : `${failures}/${checks} verificações falharam`)
process.exit(failures === 0 ? 0 : 1)
