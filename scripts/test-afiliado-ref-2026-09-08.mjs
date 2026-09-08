// KINEO-AFILIADO-REF-2026-09-08 — guardião: os dois formatos de link de afiliado atribuem.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const mw = rd('middleware.ts')
const a = rd('app/a/[code]/route.ts')
checa('middleware redireciona ?ref=CODE para /a/CODE', /dest\.pathname = '\/a\/' \+ ref/.test(mw) && /NextResponse\.redirect\(dest, 307\)/.test(mw))
checa('só código de afiliado (8 caracteres A-Z0-9) — ?ref=producthunt passa intacto', /\/\^\[A-Z0-9\]\{8\}\$\/\.test\(ref\)/.test(mw))
checa('só GET, nunca /a/ nem /api/', /request\.method === 'GET'/.test(mw) && /!request\.nextUrl\.pathname\.startsWith\('\/a\/'\)/.test(mw) && /!request\.nextUrl\.pathname\.startsWith\('\/api\/'\)/.test(mw))
const i = mw.indexOf("searchParams.get('ref')")
const j = mw.indexOf('return await updateSession(request)')
checa('o redirect vem antes da sessão (não depende de login)', i > 0 && j > i)
checa('/a/CODE grava clique e cookies de 90 dias', /COOKIE_MAX_AGE = 90 \* 24 \* 60 \* 60/.test(a) && /from\('affiliate_clicks'\)/.test(a) && /res\.cookies\.set\(COOKIE_HINT/.test(a))
checa('/a/CODE ignora robô de preview', /isAffiliatePreviewBot\(userAgent\)/.test(a))
checa('o callback do cadastro fecha a atribuição pelo cookie', /finalizeAffiliateSignupAttribution\(\{[\s\S]{0,200}sf_aff/.test(rd('app/auth/callback/route.ts')))
checa('rascunhos de diretório usam /a/CODE', !/usekineo\.com\/\?ref=/.test(rd('docs/RASCUNHOS-DIRETORIOS-2026-09-07.md')))
checa('kit dos criadores existe e usa /a/CODE', /usekineo\.com\/a\/CODE/.test(rd('docs/KIT-AFILIADOS-2026-09-08.md')))

// a regex do middleware executada
const re = /^[A-Z0-9]{8}$/
checa('regex: código real casa; producthunt, vazio e 7 chars não', re.test('8WVZSBUX') && !re.test('producthunt') && !re.test('') && !re.test('ABCDEFG'))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — ?ref=CODE e /a/CODE atribuem; PH intacto')
