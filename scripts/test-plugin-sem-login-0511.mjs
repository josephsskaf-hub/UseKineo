// KINEO-PLUGIN-SEM-LOGIN-0511 — guardião: no host do plugin o anúncio de OAuth não existe; no site principal o conector segue igual.
// Rodar: node scripts/test-plugin-sem-login-0511.mjs
import fs from 'node:fs'
const lf = (t) => t.replace(/\r\n/g, '\n')
const R = lf(fs.readFileSync('app/.well-known/oauth-authorization-server/route.ts', 'utf8'))
const M = JSON.parse(fs.readFileSync('docs/chatgpt-plugin/package/mcp.json', 'utf8')).mcpServers['kineo-scripts']
const P = JSON.parse(fs.readFileSync('docs/chatgpt-plugin/package/plugin.json', 'utf8'))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const prova = (r) => { const i = r.indexOf("=== 'plugin.usekineo.com') return NextResponse.json({ error: 'not_found' }, { status: 404"), j = r.indexOf('return NextResponse.json(authorizationServerMetadata('); return i > 0 && j > i }
ok(prova(R), 'o host do plugin devolve 404 antes do anúncio de OAuth')
ok(!prova(R.replace("=== 'plugin.usekineo.com'", "=== 'x.usekineo.com'")), 'mutante: outro host fica vermelho')
ok(M.url === 'https://plugin.usekineo.com/api/mcp/chatgpt', 'o pacote aponta para o host do plugin')
ok(M.extensions?.['com.openai']?.auth?.type === 'none', 'o pacote declara que não há login')
ok(P.version === '1.0.0', 'versão nova do pacote')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
