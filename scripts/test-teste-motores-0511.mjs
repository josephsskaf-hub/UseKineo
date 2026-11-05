// KINEO-TESTE-MOTORES-0511 — guardião da rota interna de teste dos 3 motores candidatos.
// Rodar: node scripts/test-teste-motores-0511.mjs
import fs from 'node:fs'
const R = fs.readFileSync('app/api/admin/engine-test/route.ts', 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const GATE = "if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"
const soAdmin = (r) => ['POST', 'GET'].every((f) => { const i = r.indexOf(`export async function ${f}(`); return i > 0 && r.slice(i).split('\n')[1].trim() === GATE })
const semBanco = (r) => !/\.from\(|\.rpc\(|createServiceClient|credit/i.test(r.replace(/^\/\/.*$/gm, ''))
const so3 = (r) => { const b = r.slice(r.indexOf('const ENGINES'), r.indexOf('\n}\n', r.indexOf('const ENGINES'))); return [...b.matchAll(/^ {2}([a-z0-9_]+): \{ model: '([^']+)'/gm)].map((m) => m[1] + '=' + m[2]).join() === 'h3_max_turbo=minimax/h3-max-turbo/image-to-video,kling4_flash=kling/v4/flash/image-to-video,wan3=fal-ai/wan-3/image-to-video' }
const quadroFechado = (r) => r.includes("u.hostname === 'fal.media' || u.hostname.endsWith('.fal.media')") && r.includes("if (!imageAllowed(body?.image_url,")
ok(soAdmin(R), 'POST e GET recusam quem não é administrador antes de tudo')
ok(!soAdmin(R.replace(GATE, '// sem trava')), 'mutante: sem a trava fica vermelho')
ok(semBanco(R), 'não toca no banco nem em crédito')
ok(!semBanco(R + "\nsupabase.from('credit_debits')"), 'mutante: tocar no banco fica vermelho')
ok(so3(R), 'só os 3 modelos do teste, com o nome exato da fal')
ok(!so3(R.replace("wan3: { model: 'fal-ai/wan-3/image-to-video'", "wan3: { model: 'fal-ai/outro/image-to-video'")), 'mutante: outro modelo fica vermelho')
ok(quadroFechado(R), 'quadro só do nosso storage ou da fal')
ok(!quadroFechado(R.replace("u.hostname.endsWith('.fal.media')", 'true')), 'mutante: qualquer site fica vermelho')
ok(!/^export (function|const ENGINES)/m.test(R), 'rota não exporta nada além do que o Next aceita')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
