// sprint-ui #11 — prova dos titulos de aba. Duas garantias:
// 1) toda page.tsx de tela do produto (nao-redirect) exporta metadata.title;
// 2) nenhuma delas e client component ('use client' + export metadata = build
//    quebrado no Next; o typecheck NAO pega isso).
import { readFileSync } from 'node:fs'

const pages = {
  'app/(dashboard)/studio/create/page.tsx': 'Create a Video — Kineo',
  'app/(dashboard)/studio/page.tsx': 'Studio — Kineo',
  'app/(dashboard)/history/page.tsx': 'My Videos — Kineo',
  'app/(dashboard)/my-videos/page.tsx': 'My Videos — Kineo',
  'app/(dashboard)/account/page.tsx': 'Account — Kineo',
  'app/(dashboard)/channel/page.tsx': 'Channel Builder — Kineo',
  'app/(dashboard)/create/page.tsx': 'Create — Kineo',
  'app/(dashboard)/templates/page.tsx': 'Templates — Kineo',
  'app/(dashboard)/video/page.tsx': 'Video Studio — Kineo',
  'app/(dashboard)/autopilot/page.tsx': 'Autopilot — Kineo',
  'app/(dashboard)/library/page.tsx': 'Library — Kineo',
  'app/(dashboard)/images/page.tsx': 'Images — Kineo',
  'app/(dashboard)/audio/page.tsx': 'Audio — Kineo',
}

let fail = 0
const check = (ok, msg) => { console.log((ok ? '✓' : '✗') + ' ' + msg); if (!ok) fail++ }

for (const [path, title] of Object.entries(pages)) {
  const src = readFileSync(path, 'utf8')
  check(src.includes(`title: '${title}'`), `${path} → "${title}"`)
  check(!/^\s*['"]use client['"]/m.test(src.slice(0, 200)), `${path} e server component (metadata valido)`)
}

// Redirects puros nao precisam (e nao devem ganhar) title proprio.
for (const p of ['app/(dashboard)/dashboard/page.tsx', 'app/(dashboard)/generate/page.tsx']) {
  const src = readFileSync(p, 'utf8')
  check(src.includes('redirect('), `${p} segue sendo porteiro/redirect (sem title, correto)`)
}

console.log(fail === 0 ? '\nPASS — 28 verificacoes' : `\nFAIL — ${fail} problema(s)`) 
process.exit(fail === 0 ? 0 : 1)
