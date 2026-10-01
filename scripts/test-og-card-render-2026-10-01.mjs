// KINEO-OG-CLARO-2026-10-01 — gera /og-card.png AQUI, com o mesmo motor do site (next/og → @vercel/og), antes de publicar.
// Guardião (roda na suíte) e ferramenta: node scripts/test-og-card-render-2026-10-01.mjs [saida.png]. Sai com código 1 se o PNG vier vazio (o defeito de 01/10: o
// cartão com o raio em <img src="data:image/svg+xml;utf8,..."> saiu com 0 bytes em produção).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { tmpdir } from 'node:os'

const out = process.argv[2] || tmpdir() + '/kineo-og-card-check.png'
const src = readFileSync(new URL('../app/og-card.png/route.tsx', import.meta.url), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText
const require = createRequire(import.meta.url)
const TMP = pathToFileURL(tmpdir() + '/kineo-og-local/')
// O index.node.js monta caminho com path.join(import.meta.url, ...) — quebra no Windows. Cópia temporária com caminhos absolutos.
const ogPath = require.resolve('next/dist/compiled/@vercel/og/index.node.js')
const ogDir = ogPath.replace(/[\\/][^\\/]+$/, '').replace(/\\/g, '/')
const ogSrc = readFileSync(ogPath, 'utf8').replace(/fileURLToPath\(join\(import\.meta\.url, "\.\.\/([^"]+)"\)\)/g, (_, f) => JSON.stringify(ogDir + '/' + f))
mkdirSync(TMP, { recursive: true })
const ogFile = new URL('og.mjs', TMP)
writeFileSync(ogFile, ogSrc)
const og = ogFile.href
const jsx = pathToFileURL(require.resolve('react/jsx-runtime')).href
const mod = js.replace(/from ['"]next\/og['"]/, `from '${og}'`).replace(/from ['"]react\/jsx-runtime['"]/, `from '${jsx}'`)
mkdirSync(TMP, { recursive: true })
const file = new URL('route.mjs', TMP)
writeFileSync(file, mod)
const { GET } = await import(file.href)
const res = await GET()
const buf = Buffer.from(await res.arrayBuffer())
writeFileSync(out, buf)
console.log(`og-card: ${buf.length} bytes → ${out}`)
process.exit(buf.length > 1000 ? 0 : 1)
