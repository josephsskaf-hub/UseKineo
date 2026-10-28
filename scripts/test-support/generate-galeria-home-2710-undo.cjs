// KINEO-GALERIA-HOME-2710 — gera o manifesto do DESFAZ desta entrega (hunks exatos, contexto 3) a partir do git:
//   node scripts/test-support/generate-galeria-home-2710-undo.cjs
// Base = origin/main em que a entrega nasceu; "depois" = o arquivo da árvore de trabalho (LF). Offline, sem env nem dado vivo.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const ROOT = path.resolve(__dirname, '..', '..')
const BASE = 'b5f25b397b6c5002173f2cb593debdeff3c7ba12'
const FILES = [
  'app/KineoLanding.tsx',
  'app/examples/page.tsx',
  'app/trending/page.tsx',
  'app/made-with-kineo/page.tsx',
  'components/seo/PaginaClara.tsx',
  'components/Sidebar.tsx',
  'components/MobileNav.tsx',
  'lib/ui/workspaceNavigation.ts',
  'app/(dashboard)/clips/ClipsClient.tsx',
  // guardiões históricos que esta entrega ligou à projeção (eles se leem uns aos outros nas próprias provas de desfaz)
  'scripts/test-bebe-que-fala-2010.mjs',
  'scripts/test-duas-portas-1310.mjs',
  'scripts/test-home-3-cards-1910.mjs',
  'scripts/test-home-limpa-1410.mjs',
  'scripts/test-home-remodela-2010.mjs',
  'scripts/test-login-modal-1410.mjs',
  'scripts/test-menu-ugc-2010.mjs',
  'scripts/test-paginas-ia-claras-2110.mjs',
  'scripts/test-ux-complete.mjs',
  'scripts/test-ux-mobile-navigation.mjs',
  'scripts/test-filme-rapido-1710.mjs',
]
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 })
const lf = (s) => s.replace(/\r\n/g, '\n')
const out = { base: BASE, marca: 'KINEO-GALERIA-HOME-2710', files: {} }
for (const file of FILES) {
  const before = lf(git('show', `${BASE}:${file}`))
  const after = lf(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  const tmpA = path.join(require('node:os').tmpdir(), 'galeria-a-' + process.pid), tmpB = tmpA + '-b'
  fs.writeFileSync(tmpA, before); fs.writeFileSync(tmpB, after)
  let diff = ''
  try { diff = execFileSync('git', ['diff', '--no-index', '--no-color', '--unified=3', tmpA, tmpB], { encoding: 'utf8', maxBuffer: 64 << 20 }) } catch (e) { diff = e.stdout }
  fs.rmSync(tmpA); fs.rmSync(tmpB)
  const hunks = []
  let h = null, last = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { h = { before: '', after: '' }; hunks.push(h); continue }
    if (!h) continue
    const p = line[0], t = line.slice(1)
    if (p === ' ' || p === '-') h.before += t + '\n'
    if (p === ' ' || p === '+') h.after += t + '\n'
    if (p === '\\' && last) { if (last === ' ' || last === '-') h.before = h.before.slice(0, -1); if (last === ' ' || last === '+') h.after = h.after.slice(0, -1) }
    last = p
  }
  let restored = after
  for (const x of hunks) {
    if (after.split(x.after).length !== 2) throw Error('hunk ambíguo em ' + file)
    restored = restored.replace(x.after, () => x.before)
  }
  if (restored !== before) throw Error('reconstrução inexata em ' + file)
  out.files[file] = hunks
}
fs.writeFileSync(path.join(__dirname, 'desfaz-galeria-home-2710-hunks.json'), JSON.stringify(out, null, 1) + '\n')
console.log('ok', Object.keys(out.files).length, 'arquivos')
