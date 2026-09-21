// KINEO-LINK-RASTREAVEL-2026-09-21 — guardião: /s/<rede> manda para a home com utm da rede; slug desconhecido cai na home limpa.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const src = readFileSync(join(root, 'app/s/[channel]/route.ts'), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const m = { exports: {} }
new Function('module', 'exports', 'require', js)(m, m.exports, (n) => (n === 'next/server' ? { NextResponse: { redirect: (u, s) => ({ u, s }) } } : {}))
const R = m.exports
checa('/s/tiktok → home com utm_source=tiktok, medium social, campanha bio (link de perfil é permanente)', R.socialLinkDestination('tiktok', 'https://x') === 'https://x/?utm_source=tiktok&utm_medium=social&utm_campaign=bio')
checa('?c=serie_submersa (link de descrição do vídeo) separa vídeo de bio', R.socialLinkDestination('youtube', 'https://x', 'serie_submersa') === 'https://x/?utm_source=youtube&utm_medium=social&utm_campaign=serie_submersa')
checa('c inválido (espaço, maiúscula, script) cai em bio', R.socialLinkDestination('tiktok', 'https://x', 'Serie Submersa') .includes('utm_campaign=bio') && R.socialLinkDestination('tiktok', 'https://x', '<script>').includes('utm_campaign=bio'))
checa('youtube e instagram idem', R.socialLinkDestination('YouTube', 'https://x').includes('utm_source=youtube') && R.socialLinkDestination('instagram', 'https://x').includes('utm_source=instagram'))
checa('slug desconhecido cai na home limpa (nunca 404 num link de perfil)', R.socialLinkDestination('qualquer', 'https://x') === 'https://x/')
checa('redirect 302 para o host canônico', src.includes("const origin = 'https://www.usekineo.com'") && src.includes('302'))
console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
