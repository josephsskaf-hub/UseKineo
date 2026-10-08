#!/usr/bin/env node
// KINEO-SPACES-VISITANTE-2026-10-08 — guardião de duas portas que davam 404 para gente de fora:
//   A. /spaces sem login: era notFound(); agora vai para /signup?redirect=/spaces levando as UTMs e os identificadores de
//      clique da visita (o canal do fundador no Instagram manda gente para /spaces?utm_source=instagram&...).
//      lib/spaces/visitorRedirect.ts é EXECUTADO: redirect fixo, só parâmetros da lista passam, valor saneado.
//   B. A página chama o helper para quem NÃO tem usuário, e o 404 continua só para logado sem permissão.
//   C. /ai-faceless-video-generator (URL da ficha do SaaSHub, que virou "Discontinued" pelo 404) responde 301 (numa rota) para
//      /faceless-video-generator, que existe.
//   D. O /signup que recebe o visitante do Spaces fala de Spaces (não de "AI Short"), em português quando o navegador é
//      português: lib/growth/signupProductDestinationPreview.ts EXECUTADO com as dependências reais transpiladas.
// Lê os arquivos reais (readFileSync + transpile; nada de import com alias '@/'). CRLF normalizado na leitura.

import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const CR = new RegExp(String.fromCharCode(13), 'g')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(CR, '')

function loadPure(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} importou ${id} — o módulo tem de ser puro`) },
    module,
    module.exports,
  )
  return module.exports
}

let passed = 0
const failures = []
function check(ok, label) {
  if (ok) passed += 1
  else failures.push(label)
}

// ── A. o helper, executado ────────────────────────────────────────────────────────────────────────────────────────
const mod = loadPure('lib/spaces/visitorRedirect.ts')
const href = mod.spacesSignupHref
check(typeof href === 'function', 'A0 spacesSignupHref existe e é função')

const parse = (h) => new URL(h, 'https://www.usekineo.com')
const insta = parse(href({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'canal_joseph' }))
check(insta.pathname === '/signup', 'A1 vai para /signup')
check(insta.searchParams.get('redirect') === '/spaces', 'A2 volta para /spaces depois do cadastro (redirect=/spaces)')
check(
  insta.searchParams.get('utm_source') === 'instagram'
    && insta.searchParams.get('utm_medium') === 'social'
    && insta.searchParams.get('utm_campaign') === 'canal_joseph',
  'A3 as UTMs do Instagram viajam até o /signup',
)

const bare = parse(href(undefined))
check(bare.pathname === '/signup' && bare.searchParams.get('redirect') === '/spaces' && [...bare.searchParams.keys()].length === 1,
  'A4 sem parâmetro nenhum: só o redirect')

const clicks = parse(href({ gclid: 'Cj0KCQjw_abc-123', msclkid: '0123456789abcdef0123456789abcdef', ref: 'PUVP53ZS' }))
check(clicks.searchParams.get('gclid') === 'Cj0KCQjw_abc-123', 'A5 gclid viaja')
check(clicks.searchParams.get('msclkid') === '0123456789abcdef0123456789abcdef', 'A6 msclkid viaja')
check(clicks.searchParams.get('ref') === 'PUVP53ZS', 'A7 código de afiliado (ref) viaja')

const hostile = parse(href({
  redirect: 'https://evil.example/x',
  next: '/admin',
  utm_source: 'https://evil.example',
  utm_campaign: 'a"b',
  utm_content: 'x'.repeat(201),
}))
check(hostile.searchParams.get('redirect') === '/spaces', 'A8 ninguém troca o destino do redirect pela URL')
check(!hostile.searchParams.has('next'), 'A9 parâmetro fora da lista não passa')
check(!hostile.searchParams.has('utm_source'), 'A10 UTM com URL dentro é descartada')
check(!hostile.searchParams.has('utm_campaign'), 'A11 UTM com aspas é descartada')
check(!hostile.searchParams.has('utm_content'), 'A12 UTM com mais de 200 caracteres é descartada')

const arr = parse(href({ utm_source: ['instagram', 'tiktok'] }))
check(arr.searchParams.get('utm_source') === 'instagram', 'A13 parâmetro repetido: vale o primeiro')

// ── B. a página usa o helper só para quem não tem usuário ────────────────────────────────────────────────────────────
const page = read('app/(dashboard)/spaces/page.tsx')
check(/import \{ notFound, redirect \} from 'next\/navigation'/.test(page), 'B1 a página importa redirect')
check(/import \{ spacesSignupHref \} from '@\/lib\/spaces\/visitorRedirect'/.test(page), 'B2 a página usa o helper puro')
check(/^\s*if \(!user\) redirect\(spacesSignupHref\(searchParams\)\)\s*$/m.test(page), 'B3 sem usuário → cadastro com a visita')
check(/^\s*if \(!spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)\) notFound\(\)\s*$/m.test(page),
  'B4 logado sem permissão continua no 404')
check(!/!user \|\|/.test(page), 'B5 o 404 não pega mais o visitante sem login')
check(!/export (const|function) (?!metadata|dynamic|default)/.test(page.replace(/export default/g, '')),
  'B6 a página não exporta nada além do que o Next aceita')

// ── C. o 301 da URL da ficha do SaaSHub (numa rota: o next.config.js é congelado pelo guardião crítico do CI) ────────
const routeRel = 'app/ai-faceless-video-generator/route.ts'
const route = existsSync(join(root, routeRel)) ? read(routeRel) : ''
check(/^const DESTINATION = '\/faceless-video-generator'$/m.test(route), 'C1 a rota aponta para /faceless-video-generator')
check(/return NextResponse\.redirect\(url, 301\)/.test(route), 'C2 o redirect é 301 (permanente), não 302/307')
check(/url\.search = req\.nextUrl\.search/.test(route), 'C3 a query (UTM da ficha) atravessa o 301')
check(/^export function GET\(req: NextRequest\) \{\n  return permanentRedirect\(req\)\n\}$/m.test(route)
  && /^export function HEAD\(req: NextRequest\) \{\n  return permanentRedirect\(req\)\n\}$/m.test(route),
  'C4 GET e HEAD respondem o 301 (robô de diretório costuma checar com HEAD)')
check(existsSync(join(root, 'app/faceless-video-generator/page.tsx')), 'C5 o destino do 301 existe como página')
check(!existsSync(join(root, 'app/ai-faceless-video-generator/page.tsx')), 'C6 a origem não tem página (só o redirect)')
check(!/ai-faceless-video-generator/.test(read('next.config.js')), 'C7 o next.config.js congelado não foi tocado')

// ── D. o /signup do visitante do Spaces fala de Spaces (e em português para navegador português) ─────────────────────
function executeWith(rel, deps) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { if (Object.hasOwn(deps, id)) return deps[id]; throw new Error(`${rel} importou ${id} inesperado`) },
    module,
    module.exports,
  )
  return module.exports
}
const destino = executeWith('lib/growth/signupProductDestinationPreview.ts', {
  '@/lib/authRedirect': executeWith('lib/authRedirect.ts', {}),
  '@/lib/growth/productSurfaceIntent': executeWith('lib/growth/productSurfaceIntent.ts', {}),
  '@/lib/growth/engineLandingIntent': executeWith('lib/growth/engineLandingIntent.ts', {}),
})
const build = destino.buildSignupProductDestinationPreview
const redirectDoVisitante = parse(href({ utm_source: 'instagram', utm_campaign: 'canal_joseph' })).searchParams.get('redirect')
const en = build(redirectDoVisitante)
const pt = build(redirectDoVisitante, { portuguese: true })
check(en?.surface === 'spaces' && en.heading === 'Spaces is next' && en.destinationLabel === 'Kineo Spaces',
  'D1 o redirect que o /spaces gera é reconhecido no cadastro como destino Spaces (inglês)')
check(en?.subtitle === undefined, 'D2 em inglês fica a frase genérica de destino salvo (sem subtítulo próprio)')
check(pt?.surface === 'spaces' && pt.heading === 'O Spaces abre em seguida' && pt.eyebrow === 'Destino salvo'
  && pt.subtitle === 'Crie sua conta grátis e continue de onde parou.', 'D3 navegador português: título, selo e subtítulo em português')
check(/Nada é gerado antes de você enviar\.$/.test(pt?.description ?? '') && /Nothing is generated until you submit\.$/.test(en?.description ?? ''),
  'D4 a promessa é só a verdade: nada é gerado antes do envio')
check(build('/spaces?foo=1') === null && build('/spaces?redirect=/admin') === null, 'D5 contrato fechado: /spaces com chave estranha não vira promessa')
const img = build('/images', { portuguese: true })
check(img?.surface === 'images' && img.heading === 'Your AI Image Studio is next' && img.subtitle === undefined,
  'D6 os outros destinos não mudam (o português é só do Spaces)')
const signupPage = read('app/(auth)/signup/page.tsx')
check(/^\s*const portuguese = typeof navigator !== 'undefined' && \/\^pt\\b\/i\.test\(navigator\.language \|\| ''\)$/m.test(signupPage),
  'D7 o idioma vem do navegador, lido só no cliente')
check(signupPage.includes("buildSignupProductDestinationPreview(params.get('redirect'), { portuguese })"), 'D8 a página passa o idioma ao montar o destino')
check(signupPage.includes("? savedProductDestination.subtitle ?? 'Create a free account and continue to the product you chose.'"),
  'D9 o subtítulo do destino entra no lugar da frase genérica quando existe')
check(/const \[authSearch, setAuthSearch\] = useState\(''\)/.test(signupPage),
  'D10 o destino só é montado depois da montagem (authSearch nasce vazio): sem diferença de hidratação')

if (failures.length) {
  console.error(`FALHOU ${failures.length} de ${passed + failures.length}:`)
  for (const f of failures) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`ok ${passed}/${passed} — spaces visitante + 301 do SaaSHub`)
