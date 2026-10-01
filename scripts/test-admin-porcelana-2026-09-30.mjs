// Offline only: real JSX, synthetic state, no effects, network or credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { renderPage } from './preview-ux-complete.mjs'
const read = p => fs.readFileSync(p, 'utf8')
const routes = ['', '/ceo', '/paying', '/overview', '/leads', '/funnel', '/affiliates', '/people', '/users', '/ads', '/supplier-health', '/coerencia', '/metrics', '/trial-roi', '/trial-cohort', '/trial-abuse']
for (const suffix of routes) {
  const pathname = '/admin' + suffix
  const html = renderPage('components/admin/AdminShell.tsx', false, { pathname }, { children: 'OFFLINE_CONTENT' })
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1, pathname)
  assert(html.includes('OFFLINE_CONTENT') && html.includes('href="#adm-content"'))
  assert(html.includes('href="/studio"'))
  for (const other of routes.filter(x => x !== '/ceo')) assert(html.includes(`href="/admin${other}"`))
}
const shell = read('components/admin/AdminShell.tsx')
assert.equal((shell.match(/<Link\b/g) || []).length, (shell.match(/prefetch=\{false\}/g) || []).length)
assert(!/fetch\(|useEffect\(|supabase|stripe/i.test(shell))
assert(read('app/admin/layout.tsx').includes('<AdminShell>{children}</AdminShell>'))
assert(read('app/(dashboard)/admin/layout.tsx').includes("from '@/app/admin/layout'"))
assert(read('app/(dashboard)/DashboardShell.tsx').includes("pathname.startsWith('/admin/')"))
for (const pathname of ['/admin', '/admin/affiliates']) {
  const html = renderPage('app/(dashboard)/DashboardShell.tsx', false, { pathname }, { children: 'ADMIN_CHILD', isLoggedIn: true })
  assert.equal(html, 'ADMIN_CHILD', 'Admin must not nest the customer workspace')
}
assert.notEqual(renderPage('app/(dashboard)/DashboardShell.tsx', false, { pathname: '/studio' }, { children: 'STUDIO_CHILD', isLoggedIn: true }), 'STUDIO_CHILD', 'Customer workspace remains intact')
const css = read('app/admin/admin-porcelain.css')
for (const rule of ['color-scheme: light', '--bg:#F7F7F5', '--accent:#0A5CFF', ':focus-visible', '@media(max-width:800px)', 'prefers-reduced-motion', 'minmax(0,1fr)']) assert(css.includes(rule), rule)
assert(!/display\s*:\s*none[^}]*\}/.test(css.replace('.adm-content .adm-legacy-nav { display:none }', '').replace('.adm-group>a>span { display:none }', '')))
console.log('PASS: 16 admin routes, single active item, content, studio exit, no prefetch; layouts, keyboard and mobile style guards.')
