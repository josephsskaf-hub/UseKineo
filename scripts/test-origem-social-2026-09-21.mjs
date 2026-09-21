// KINEO-ORIGEM-SOCIAL-2026-09-21 — guardião: referrer/utm de TikTok, Instagram, YouTube, X, Facebook, Reddit vira UMA origem por rede.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const src = readFileSync(join(root, 'lib/acquisitionSource.ts'), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(s) {
  const js = ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}))
  return m.exports
}
const A = roda(src)
const casos = [
  ['https://vm.tiktok.com/ZM8abc/', 'tiktok'], ['https://www.tiktok.com/@curiosityvaultlab', 'tiktok'],
  ['https://l.instagram.com/?u=https%3A%2F%2Fusekineo.com', 'instagram'], ['https://www.instagram.com/', 'instagram'],
  ['https://m.youtube.com/watch?v=x', 'youtube'], ['https://youtu.be/x', 'youtube'], ['https://www.youtube.com/', 'youtube'],
  ['https://t.co/abc', 'x'], ['https://x.com/i/status/1', 'x'],
  ['https://l.facebook.com/l.php?u=x', 'facebook'], ['https://out.reddit.com/t3_x', 'reddit'],
]
for (const [ref, esperado] of casos) checa(`referrer ${ref} → ${esperado}`, A.acquisitionSource({ referrer: ref }) === esperado)
checa('utm_source=tiktok (o /s/tiktok) → tiktok; utm_source=youtube → youtube', A.acquisitionSource({ utmSource: 'tiktok' }) === 'tiktok' && A.acquisitionSource({ utmSource: 'youtube' }) === 'youtube')
checa('utm com host completo (m.youtube.com) também colapsa na rede', A.acquisitionSource({ utmSource: 'https://m.youtube.com/' }) === 'youtube')
checa('utm vence o referrer (quem clicou o /s/tiktok dentro do Instagram é tiktok)', A.acquisitionSource({ utmSource: 'tiktok', referrer: 'https://l.instagram.com/' }) === 'tiktok')
checa('ChatGPT, TAAFT e Google continuam iguais', A.acquisitionSource({ referrer: 'https://chatgpt.com/' }) === 'chatgpt' && A.acquisitionSource({ utmSource: 'taaft' }) === 'taaft' && A.acquisitionSource({ referrer: 'https://www.google.com/' }) === 'google')
checa('sem nada → direct (o navegador embutido sem referrer continua honesto)', A.acquisitionSource({}) === 'direct')
const mut = roda(src.replace("  const social = socialSourceFromHost(host)\n  if (social) return social\n", ''))
checa('mutante (rede fora do sourceFromHost) é pego', mut.acquisitionSource({ referrer: 'https://vm.tiktok.com/x' }) !== 'tiktok')
console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
