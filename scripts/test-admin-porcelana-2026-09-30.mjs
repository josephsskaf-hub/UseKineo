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
for (const rule of ['color-scheme: light', '--bg:#E2E3E5', '--card:#F0F0F1', '--accent:#285B9C', ':focus-visible', '@media(max-width:800px)', 'prefers-reduced-motion', 'minmax(0,1fr)']) assert(css.includes(rule), rule)
assert(!/display\s*:\s*none[^}]*\}/.test(css.replace('.adm-content .adm-legacy-nav { display:none }', '').replace('.adm-group>a>span { display:none }', '')))
// Approved neutral palette: check real tokens, not a separate mock palette.
const token = name => css.match(new RegExp(`--${name}:#([a-fA-F0-9]{6})[;]`))?.[1]
const lum = hex => {
  const [r,g,b] = hex.match(/../g).map(c => parseInt(c,16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4)
  return .2126*r + .7152*g + .0722*b
}
for (const [fg,bg] of [['text','card'],['muted','card'],['muted2','bg'],['accent','accent-soft']]) {
  assert(token(fg) && token(bg), 'Missing palette token')
  assert((lum(token(bg))+.05)/(lum(token(fg))+.05) >= 4.5, `${fg}/${bg} contrast`)
}
assert(css.includes('--sidebar-bg:#E7E8EA'))
assert.equal((css.match(/background:var\(--sidebar-bg\)/g)||[]).length, 2, 'Sidebar and header share gray')
function verifySurfaces(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = `${dir}/${entry.name}`
    if (entry.isDirectory()) verifySurfaces(file)
    else if (file.endsWith('.tsx')) assert(!/background(?:Color)?\s*:\s*'#(?:FFFFFF|fff|F1F1EE)'/.test(read(file)), `${file}: fixed surface bypasses palette`)
  }
}
verifySurfaces('app/admin'); verifySurfaces('app/(dashboard)/admin')
console.log('PASS: 16 admin routes, single active item, content, studio exit, no prefetch; layouts, keyboard and mobile style guards.')
