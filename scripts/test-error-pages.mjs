// sprint-ui #2 — prova que as paginas de erro existem e tem o essencial.
import { readFileSync } from 'node:fs'
const checks = []
const err = readFileSync('app/error.tsx', 'utf8')
const glob = readFileSync('app/global-error.tsx', 'utf8')
checks.push(['error.tsx e client component', err.startsWith("'use client'")])
checks.push(['error.tsx chama reset()', err.includes('reset()')])
checks.push(['error.tsx mostra digest p/ suporte', err.includes('error.digest')])
checks.push(['error.tsx tranquiliza (credits safe)', err.includes('credits are safe')])
checks.push(['global-error.tsx e client component', glob.startsWith("'use client'")])
checks.push(['global-error.tsx renderiza html/body proprios', glob.includes('<html') && glob.includes('<body')])
checks.push(['global-error.tsx chama reset()', glob.includes('reset()')])
checks.push(['global-error.tsx nao usa next/link', !glob.includes("from 'next/link'")])
let fail = 0
for (const [name, ok] of checks) { console.log(ok ? '✓' : '✗', name); if (!ok) fail++ }
process.exit(fail ? 1 : 0)
